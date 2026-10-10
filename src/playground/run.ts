/**
 * Compiling and running a program in the playground (src/playground/worker.ts
 * runs it in a Web Worker; the tests run it in Node.js): the diagnostics of
 * the compiler, what the program prints, its errors placed on the lines of
 * the source, and when it is done. The page (playground/src/app.js) shows
 * the events it sends; it stops a program that runs too long by ending the
 * worker.
 *
 * Input comes from the page's input field: `хондан()` and `хонданиРақам()`
 * read its lines in order, as from a file redirected to `somon run`.
 */
import { compile } from '../browser';
import { message } from '../diagnostics/catalog';
import { formatDiagnostic, formatFailure } from '../diagnostics/format';
import type { Diagnostic, DiagnosticLanguage } from '../diagnostics/types';
import { originalPosition, type CodeMapping } from '../codegen';
import { explainError, locateError, type ExplainedError } from '../runtime/errors';
import { createInput, INPUT_GLOBAL } from '../runtime/input';
import { runtimeDiagnostic, type SourcePlace } from '../runtime/report';
import { createPlaygroundConsole } from './console';

/** What the page asks to run. */
export interface RunRequest {
  source: string;
  /** The text of the input field. */
  input: string;
  language: DiagnosticLanguage;
  /** Warnings for beginners (src/learner/warnings.ts). */
  learningMode?: boolean;
}

/** A problem as the page shows it: its text, and the line to mark. */
export interface ShownProblem {
  severity: 'error' | 'warning';
  line?: number;
  text: string;
}

/** What the page is told. */
export type RunEvent =
  /** The program compiled and starts; `diagnostics` are its warnings. */
  | { type: 'compiled'; code: string; diagnostics: ShownProblem[] }
  | { type: 'notCompiled'; diagnostics: ShownProblem[]; summary: string }
  | { type: 'output'; stream: 'log' | 'warn' | 'error'; text: string }
  /** The program printed more than `lines` lines; the rest is not sent. */
  | { type: 'outputLimit'; lines: number }
  | { type: 'runtimeError'; text: string; line?: number }
  | { type: 'done' };

/** The program as a script the host runs: the file its stack frames name, and how to run it. */
export interface ProgramScript {
  file: string;
  run(): void;
}

/** The host's own timers, taken before the program can replace them. */
export interface Timers {
  setTimeout(_callback: () => void, _ms?: number): unknown;
  clearTimeout(_id: unknown): void;
  setInterval(_callback: () => void, _ms?: number): unknown;
  clearInterval(_id: unknown): void;
}

export interface RunHost {
  post(_event: RunEvent): void;
  /** Makes a script of the program's code. */
  script(_code: string): ProgramScript;
  /** The program's global scope: its console, input, timers and `module` are put there. */
  scope: Record<string, unknown>;
  timers: Timers;
}

/** A running program: errors the host catches (unhandled rejections) end it. */
export interface RunningProgram {
  fail(_error: unknown): void;
}

/** How many lines of output the page is sent. */
export const OUTPUT_LINES = 1000;

/**
 * The code runs inside a function, so that its declarations do not replace
 * the worker's globals. On its first line, so that the lines stay the same.
 */
const PREFIX = '(function () {';
const SUFFIX = '\n}).call(module.exports);\n';

/** A module the program imports: the playground has only the one file. */
export class PlaygroundModuleError extends Error {
  readonly specifier: string;

  constructor(specifier: string) {
    super(`The playground cannot import '${specifier}'`);
    this.name = 'PlaygroundModuleError';
    this.specifier = specifier;
  }
}

export function runProgram(request: RunRequest, host: RunHost): RunningProgram {
  const { source, language } = request;
  const result = compile(source, { language, mappings: true, learningMode: request.learningMode });
  // Given with `language`
  const diagnostics = result.diagnostics!;
  const errors = diagnostics.filter(d => d.severity === 'error');
  if (errors.length > 0) {
    host.post({
      type: 'notCompiled',
      diagnostics: diagnostics.map(d => shown(d, language, source)),
      summary: formatFailure(errors.length, language),
    });
    return { fail: () => undefined };
  }
  host.post({
    type: 'compiled',
    code: result.code,
    diagnostics: diagnostics.map(d => shown(d, language, source)),
  });
  // None when TypeScript, which a page may have loaded, lowered the code
  return new Run(request, host, result.mappings ?? []).start(result.code);
}

function shown(diagnostic: Diagnostic, language: DiagnosticLanguage, source: string): ShownProblem {
  return {
    severity: diagnostic.severity,
    line: diagnostic.line,
    text: formatDiagnostic(diagnostic, { language, source }),
  };
}

class Run implements RunningProgram {
  private finished = false;
  private lines = 0;
  /** Prompts of the input functions, printed with what comes next, as in a terminal. */
  private prompt = '';
  /** Timers the program set and that have not run or been cleared. */
  private readonly active = new Set<unknown>();
  private file = '';
  private readonly request: RunRequest;
  private readonly host: RunHost;
  private readonly mappings: CodeMapping[];

  constructor(request: RunRequest, host: RunHost, mappings: CodeMapping[]) {
    this.request = request;
    this.host = host;
    this.mappings = mappings;
  }

  start(code: string): this {
    this.prepareScope();
    try {
      const script = this.host.script(PREFIX + code + SUFFIX);
      this.file = script.file;
      script.run();
    } catch (error) {
      this.fail(error);
      return this;
    }
    this.checkDone();
    return this;
  }

  fail(error: unknown): void {
    if (this.finished) return;
    this.flushPrompt();
    this.finished = true;
    const { language, source } = this.request;
    const diagnostic = runtimeDiagnostic(explain(error), language, this.placeOf(error), source);
    this.host.post({
      type: 'runtimeError',
      text: formatDiagnostic(diagnostic, { language, source, runtime: true }),
      line: diagnostic.line,
    });
    this.host.post({ type: 'done' });
  }

  /** Where in the source an error happened: the first frame of the program, mapped back. */
  private placeOf(error: unknown): SourcePlace | undefined {
    const stack = (error as { stack?: unknown } | null)?.stack;
    if (typeof stack !== 'string' || this.file === '') return undefined;
    const location = locateError(stack, this.file);
    if (!location) return undefined;
    const column = location.line === 1 ? location.column - PREFIX.length : location.column;
    const original = originalPosition(this.mappings, location.line, column - 1);
    if (!original) return undefined;
    return {
      line: original.line,
      column: original.column + 1,
      functionName: location.functionName,
    };
  }

  private prepareScope(): void {
    const { scope, timers } = this.host;
    scope.console = createPlaygroundConsole((stream, text) => this.print(stream, text));
    const input = inputFrom(this.request.input, text => {
      this.prompt += text;
    });
    scope[INPUT_GLOBAL] = createInput(input, this.request.language);
    const module = { exports: {} };
    scope.module = module;
    scope.exports = module.exports;
    scope.require = (specifier: string) => {
      throw new PlaygroundModuleError(specifier);
    };
    scope.setTimeout = (callback: unknown, ms?: number, ...args: unknown[]) => {
      const id = timers.setTimeout(() => {
        this.active.delete(id);
        this.guard(callback, args);
        this.checkDone();
      }, ms);
      this.active.add(id);
      return id;
    };
    scope.setInterval = (callback: unknown, ms?: number, ...args: unknown[]) => {
      const id = timers.setInterval(() => this.guard(callback, args), ms);
      this.active.add(id);
      return id;
    };
    scope.clearTimeout = (id: unknown) => this.clear(id, timers.clearTimeout);
    scope.clearInterval = (id: unknown) => this.clear(id, timers.clearInterval);
  }

  private clear(id: unknown, clear: (_id: unknown) => void): void {
    if (this.active.delete(id)) clear(id);
    this.checkDone();
  }

  /** Runs a callback of the program; what it throws ends the program. */
  private guard(callback: unknown, args: unknown[]): void {
    if (this.finished || typeof callback !== 'function') return;
    try {
      callback(...args);
    } catch (error) {
      this.fail(error);
    }
  }

  /** The program is done when it set no timer that is still to run, after its promises settle. */
  private checkDone(): void {
    if (this.finished) return;
    this.host.timers.setTimeout(() => {
      if (this.finished || this.active.size > 0) return;
      this.flushPrompt();
      this.finished = true;
      this.host.post({ type: 'done' });
    }, 0);
  }

  private flushPrompt(): void {
    if (this.prompt !== '') this.print('log', '');
  }

  private print(stream: 'log' | 'warn' | 'error', printed: string): void {
    if (this.finished || this.lines >= OUTPUT_LINES) return;
    const text = this.prompt + printed;
    this.prompt = '';
    const lines = text.split('\n');
    const room = OUTPUT_LINES - this.lines;
    this.lines += lines.length;
    this.host.post({ type: 'output', stream, text: lines.slice(0, room).join('\n') });
    if (this.lines >= OUTPUT_LINES) this.host.post({ type: 'outputLimit', lines: OUTPUT_LINES });
  }
}

/** What an error of the program is about; an import is the playground's limit. */
function explain(error: unknown): ExplainedError {
  if (error instanceof PlaygroundModuleError) {
    // As the program names it: the code generator adds `.js`
    const name = error.specifier.replace(/\.js$/, '');
    return { message: message('RUNTIME_NO_MODULES', { name }) };
  }
  return explainError(error);
}

/** The input field as the input of the program: all of it at once, then its end. */
function inputFrom(text: string, write: (_text: string) => void) {
  let read = false;
  return {
    read: (): string | null => {
      if (read) return null;
      read = true;
      return text;
    },
    write,
    interactive: false,
  };
}

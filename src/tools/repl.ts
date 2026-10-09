/*
 * SomonScript REPL (`somon repl`)
 * Copyright (c) 2025 LindenTech IT Consulting
 *
 * Licensed under the MIT License. See the LICENSE file for details.
 */

/**
 * An interactive SomonScript session. Every input is compiled to JavaScript
 * and run in one `vm` context, so `тағ`/`собит` variables, functions and
 * classes declared in earlier inputs stay visible. The value of an input that
 * ends with an expression is printed with `util.inspect`, and `интизор` works
 * at the top level. Inputs continue over several lines while brackets, blocks,
 * template literals or block comments are open.
 *
 * Top-level `тағ`, `собит` and `синф` declarations become `var` bindings of
 * the session, so an input may declare a name again (as in a browser
 * console); `собит` is not enforced between inputs.
 */

import * as fs from 'node:fs';
import { createRequire } from 'node:module';
import * as os from 'node:os';
import * as path from 'node:path';
import * as readline from 'node:readline';
import { Console } from 'node:console';
import type { Readable, Writable } from 'node:stream';
import * as util from 'node:util';
import * as vm from 'node:vm';
import ts from 'typescript';

import type { ExpressionStatement, Program } from '../ast';
import { compile } from '../compiler';
import { Lexer } from '../lexer';
import { Parser } from '../parser';
import { TokenType } from '../tokens';

/** Texts the REPL prints; the CLI passes them in the interface language. */
export interface ReplMessages {
  /** Printed when the session starts. */
  banner: string;
  /** Output of `.ёрӣ` / `.help`. */
  help: string;
  /** Printed after `.пок` / `.clear`. */
  cleared: string;
  /** `.js` before anything was compiled. */
  noCompiledCode: string;
  /** Ctrl+C on an empty line. */
  exitHint: string;
  /** Label before an error. */
  error: string;
}

export const DEFAULT_REPL_MESSAGES: ReplMessages = {
  banner: 'SomonScript REPL. Type .help (.ёрӣ) for help, .exit (.баромад) to quit.',
  help: [
    '.ёрӣ, .help        Show this help',
    '.баромад, .exit    Leave the REPL',
    '.пок, .clear       Forget all declarations and the current input',
    '.js                Show the JavaScript compiled from the last input',
    '',
    'An input continues on the next line while a bracket, block or template is open.',
    'Declarations stay visible in later inputs; `интизор` works at the top level.',
  ].join('\n'),
  cleared: 'Context cleared.',
  noCompiledCode: 'Nothing has been compiled yet.',
  exitHint: '(To exit, press Ctrl+C again or type .exit)',
  error: 'Error:',
};

export interface ReplOptions {
  input: Readable;
  output: Writable;
  /** Line editing with cursor keys and history; defaults to `output.isTTY`. */
  terminal?: boolean;
  /** File for the input history; `undefined` keeps no history. */
  historyFile?: string;
  /** Colors in printed values; defaults to `terminal`. */
  colors?: boolean;
  messages?: Partial<ReplMessages>;
  /** Directory that `require` and relative imports start from; defaults to the current one. */
  cwd?: string;
  prompt?: string;
  continuationPrompt?: string;
}

/** What evaluating one input produced. */
export interface EvaluationResult {
  /** Errors (compile or runtime); empty when the input ran. */
  errors: string[];
  /** Whether the input ended with an expression whose value should be shown. */
  hasValue: boolean;
  value?: unknown;
}

const HISTORY_SIZE = 1000;

/**
 * History file of the CLI: `SOMON_REPL_HISTORY` names it, an empty
 * `SOMON_REPL_HISTORY` turns history off, and the default is
 * `~/.somon_repl_history`.
 */
export function historyFileFromEnv(
  env: Readonly<Record<string, string | undefined>>,
  home: string = os.homedir()
): string | undefined {
  const configured = env.SOMON_REPL_HISTORY;
  if (configured === undefined) return path.join(home, '.somon_repl_history');
  return configured.trim() === '' ? undefined : configured;
}

/**
 * Whether `source` is an unfinished input that continues on the next line:
 * an open bracket, template literal or block comment, or a statement cut off
 * at the end (`тағ х =`).
 */
export function isIncomplete(source: string): boolean {
  let tokens;
  try {
    tokens = new Lexer(source).tokenize();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return /Unterminated (template literal|block comment)/.test(message);
  }
  let depth = 0;
  for (const token of tokens) {
    if ([TokenType.LEFT_PAREN, TokenType.LEFT_BRACKET, TokenType.LEFT_BRACE].includes(token.type)) {
      depth++;
    } else if (
      [TokenType.RIGHT_PAREN, TokenType.RIGHT_BRACKET, TokenType.RIGHT_BRACE].includes(token.type)
    ) {
      depth--;
    }
  }
  if (depth > 0) return true;
  if (depth < 0) return false;
  const parser = new Parser(tokens);
  parser.parse();
  // An error at the end of the input means the statement goes on
  const end = tokens[tokens.length - 1];
  const atEnd = `at line ${end.line}, column ${end.column}`;
  return parser.getErrors().some(error => error.includes('end of input') || error.includes(atEnd));
}

function errorText(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const { name, message } = error as { name?: unknown; message?: unknown };
    return typeof name === 'string' && name !== 'Error' ? `${name}: ${message}` : String(message);
  }
  return util.inspect(error);
}

/** Whether a JavaScript statement awaits at the top level (outside any function). */
function hasTopLevelAwait(node: ts.Node): boolean {
  if (ts.isFunctionLike(node) || ts.isClassLike(node)) return false;
  if (ts.isAwaitExpression(node)) return true;
  if (ts.isForOfStatement(node) && node.awaitModifier) return true;
  return ts.forEachChild(node, hasTopLevelAwait) ?? false;
}

/** Names bound by a declaration name (identifier or destructuring pattern). */
function boundNames(name: ts.BindingName): string[] {
  if (ts.isIdentifier(name)) return [name.text];
  return name.elements.flatMap(element =>
    ts.isOmittedExpression(element) ? [] : boundNames(element.name)
  );
}

/**
 * Turns the compiled JavaScript of one input into a script whose top-level
 * declarations are `var` bindings of the session. With top-level `await` the
 * statements run in an async function whose result is the value of the last
 * expression, and the declared names are hoisted out of it.
 */
export function prepareScript(code: string, returnLast: boolean): { code: string; async: boolean } {
  const file = ts.createSourceFile(
    'input.js',
    code,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS
  );
  const statements = file.statements;
  const isAsync = statements.some(hasTopLevelAwait);
  const hoisted: string[] = [];
  const before: string[] = [];
  const body = statements.map((statement, index) => {
    const text = statement.getText(file);
    const last = index === statements.length - 1;
    if (ts.isVariableStatement(statement)) {
      return declarationAsVar(statement, file, isAsync, hoisted);
    }
    if (ts.isClassDeclaration(statement) && statement.name) {
      const name = statement.name.text;
      if (!isAsync) return `var ${name} = ${text};`;
      hoisted.push(name);
      return `${name} = ${text};`;
    }
    if (isAsync && ts.isFunctionDeclaration(statement)) {
      before.push(text);
      return '';
    }
    if (isAsync && last && returnLast && ts.isExpressionStatement(statement)) {
      return `return (${statement.expression.getText(file)});`;
    }
    return text;
  });
  if (!isAsync) return { code: body.join('\n'), async: false };
  const declarations = hoisted.length > 0 ? `var ${hoisted.join(', ')};\n` : '';
  return {
    code: `${declarations}${before.join('\n')}\n(async () => {\n${body.join('\n')}\n})()`,
    async: true,
  };
}

function declarationAsVar(
  statement: ts.VariableStatement,
  file: ts.SourceFile,
  isAsync: boolean,
  hoisted: string[]
): string {
  const list = statement.declarationList;
  if (!isAsync) {
    const keyword = list.getFirstToken(file);
    const text = statement.getText(file);
    const offset = (keyword?.getStart(file) ?? statement.getStart(file)) - statement.getStart(file);
    const length = keyword?.getWidth(file) ?? 0;
    return `${text.slice(0, offset)}var${text.slice(offset + length)}`;
  }
  const assignments = list.declarations.map(declaration => {
    hoisted.push(...boundNames(declaration.name));
    if (!declaration.initializer) return '';
    const target = declaration.name.getText(file);
    const value = declaration.initializer.getText(file);
    return ts.isObjectBindingPattern(declaration.name)
      ? `(${target} = ${value});`
      : `${target} = ${value};`;
  });
  return assignments.join('\n');
}

/** The SomonScript REPL; `start()` runs a session on the given streams. */
export class Repl {
  private readonly messages: ReplMessages;
  private readonly output: Writable;
  private readonly options: ReplOptions;
  private readonly colors: boolean;
  private readonly cwd: string;
  private context!: vm.Context;
  private buffer: string[] = [];
  private lastJs: string | undefined;
  private rl: readline.Interface | undefined;
  /** `.exit`, or Ctrl+C twice: stop reading input. */
  private exiting = false;
  /** Ctrl+C was pressed on an empty line; a second one exits. */
  private interrupted = false;

  constructor(options: ReplOptions) {
    this.options = options;
    this.messages = { ...DEFAULT_REPL_MESSAGES, ...options.messages };
    this.output = options.output;
    this.colors = options.colors ?? this.terminal;
    this.cwd = options.cwd ?? process.cwd();
    this.reset();
  }

  private get terminal(): boolean {
    return this.options.terminal ?? Boolean((this.options.output as { isTTY?: boolean }).isTTY);
  }

  /** Forgets every declaration: the next input runs in a fresh context. */
  reset(): void {
    const sessionConsole = new Console({ stdout: this.output, stderr: this.output });
    const module = { exports: {} };
    this.context = vm.createContext({
      console: sessionConsole,
      require: createRequire(path.join(this.cwd, '[repl]')),
      module,
      exports: module.exports,
      process,
      Buffer,
      URL,
      URLSearchParams,
      TextEncoder,
      TextDecoder,
      AbortController,
      structuredClone,
      queueMicrotask,
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval,
      setImmediate,
      clearImmediate,
      fetch: global.fetch,
      performance: global.performance,
    });
    this.buffer = [];
    this.lastJs = undefined;
  }

  /** The JavaScript compiled from the last input, if any. */
  get lastCompiledCode(): string | undefined {
    return this.lastJs;
  }

  /** Compiles and runs one complete input. */
  async evaluate(source: string): Promise<EvaluationResult> {
    const compiled = compile(source, { typeCheck: false });
    if (compiled.errors.length > 0) return { errors: compiled.errors, hasValue: false };
    this.lastJs = compiled.code;
    const ending = lastStatementKind(source);
    try {
      const script = prepareScript(compiled.code, ending !== 'other');
      let value = new vm.Script(script.code, { filename: 'repl' }).runInContext(this.context);
      if (script.async) value = await value;
      // `чоп.сабт(х)` prints nothing more; a call that returns something shows it
      const hasValue = ending === 'expression' || (ending === 'call' && value !== undefined);
      return { errors: [], hasValue, value };
    } catch (error) {
      return { errors: [errorText(error)], hasValue: false };
    }
  }

  /** Runs the session until the input ends or `.exit`; resolves when it is over. */
  start(): Promise<void> {
    const history = this.readHistory();
    const rl = readline.createInterface({
      input: this.options.input,
      output: this.output,
      terminal: this.terminal,
      prompt: this.options.prompt ?? 'сомон> ',
      historySize: HISTORY_SIZE,
      history,
      removeHistoryDuplicates: true,
    } as readline.ReadLineOptions);
    this.rl = rl;
    rl.on('history', (lines: string[]) => this.writeHistory(lines));
    this.write(`${this.messages.banner}\n`);
    rl.prompt();

    const queue: string[] = [];
    let busy = false;
    let closed = false;
    return new Promise(resolve => {
      const pump = async (): Promise<void> => {
        if (busy) return;
        busy = true;
        while (queue.length > 0 && !this.exiting) {
          try {
            await this.handleLine(queue.shift() as string);
          } catch (error) {
            this.write(`${this.messages.error} ${errorText(error)}\n`);
          }
          if (!this.exiting && (!closed || queue.length > 0)) this.prompt();
        }
        busy = false;
        if (closed || this.exiting) {
          rl.close();
          resolve();
        }
      };
      rl.on('line', line => {
        queue.push(line);
        void pump();
      });
      rl.on('SIGINT', () => this.interrupt());
      rl.on('close', () => {
        closed = true;
        void pump();
      });
    });
  }

  private prompt(): void {
    const rl = this.rl as readline.Interface;
    rl.setPrompt(
      this.buffer.length > 0
        ? (this.options.continuationPrompt ?? '... ')
        : (this.options.prompt ?? 'сомон> ')
    );
    rl.prompt();
  }

  private interrupt(): void {
    if (this.buffer.length > 0 || !this.interrupted) {
      this.buffer = [];
      this.interrupted = true;
      this.write(`\n${this.messages.exitHint}\n`);
      this.prompt();
      return;
    }
    this.exiting = true;
    this.rl?.close();
  }

  /** Handles one line: a command, part of an input, or the end of one. */
  async handleLine(line: string): Promise<void> {
    this.interrupted = false;
    if (this.buffer.length === 0 && this.runCommand(line.trim())) return;
    this.buffer.push(line);
    const source = this.buffer.join('\n');
    if (source.trim() === '') {
      this.buffer = [];
      return;
    }
    if (isIncomplete(source)) return;
    this.buffer = [];
    const result = await this.evaluate(source);
    for (const error of result.errors) this.write(`${this.messages.error} ${error}\n`);
    if (result.errors.length === 0 && result.hasValue) {
      this.write(`${util.inspect(result.value, { colors: this.colors, depth: 4 })}\n`);
    }
  }

  /** `.ёрӣ`, `.баромад`, `.пок`, `.js` and their English names; false for other input. */
  private runCommand(command: string): boolean {
    switch (command) {
      case '.ёрӣ':
      case '.help':
        this.write(`${this.messages.help}\n`);
        return true;
      case '.баромад':
      case '.exit':
        this.exiting = true;
        return true;
      case '.пок':
      case '.clear':
        this.reset();
        this.write(`${this.messages.cleared}\n`);
        return true;
      case '.js':
        this.write(`${this.lastJs?.trimEnd() ?? this.messages.noCompiledCode}\n`);
        return true;
      default:
        return false;
    }
  }

  private write(text: string): void {
    this.output.write(text);
  }

  private readHistory(): string[] {
    const file = this.options.historyFile;
    if (!file || !this.terminal) return [];
    try {
      return fs
        .readFileSync(file, 'utf8')
        .split('\n')
        .filter(line => line.trim() !== '')
        .slice(0, HISTORY_SIZE);
    } catch {
      return [];
    }
  }

  private writeHistory(lines: string[]): void {
    const file = this.options.historyFile;
    if (!file) return;
    try {
      fs.writeFileSync(file, `${lines.join('\n')}\n`, { mode: 0o600 });
    } catch {
      // History is a convenience; an unwritable file must not end the session
    }
  }
}

/** Whether `source` ends with an expression (whose value the REPL prints), a call, or neither. */
function lastStatementKind(source: string): 'expression' | 'call' | 'other' {
  const program: Program = new Parser(new Lexer(source).tokenize()).parse();
  const last = program.body[program.body.length - 1];
  if (!last || last.type !== 'ExpressionStatement') return 'other';
  return (last as ExpressionStatement).expression.type === 'CallExpression' ? 'call' : 'expression';
}

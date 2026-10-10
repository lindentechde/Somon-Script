/**
 * The SomonScript compiler for browsers: `compile(source, options)` and
 * `execute(code, console)` without Node.js built-ins (no file system, no
 * module system, no Babel). scripts/build-browser.js bundles this module and
 * the compiler stages it imports into one file.
 *
 * TypeScript is not bundled. The generated code (ES2022) runs as is for the
 * es2022 target (the default) and newer; TypeScript's `transpileModule` is
 * needed only to lower it: for decorators, `дастрасӣ` accessors and
 * `истифода`, which no runtime runs yet, and for older targets. Pass the
 * TypeScript API as `options.typescript`, or load `typescript.js` so that
 * `globalThis.ts` exists, before compiling such programs. Lowering uses the
 * TypeScript options of the Node compiler (src/targets.ts), which this module
 * cannot import: it loads TypeScript itself.
 */

import type { Program } from './ast';
import { CodeGenerator, type CodeMapping, type LoweringNeeds } from './codegen';
import { localizedMessages, Problems } from './diagnostics/problems';
import type { Diagnostic, DiagnosticLanguage } from './diagnostics/types';
import { checkForLearners } from './learner/warnings';
import { Lexer } from './lexer';
import { Parser } from './parser';
import { TypeChecker } from './type-checker';

/** The part of TypeScript's API the browser compiler uses to lower code. */
export interface TypeScriptApi {
  ScriptTarget: Record<string, number | string>;
  ModuleKind: { ESNext: number };
  NewLineKind: { LineFeed: number };
  transpileModule(
    _input: string,
    _options: { fileName?: string; compilerOptions: Record<string, unknown> }
  ): { outputText: string };
}

export interface BrowserCompileOptions {
  /** JavaScript version of the output: 'es5', 'es2015', …, 'es2022' (default), …, 'esnext'. */
  target?: string;
  /** Type-check the program (default true). */
  typeCheck?: boolean;
  /** Type errors are fatal: no code is emitted when there are any. */
  strict?: boolean;
  /** TypeScript's legacy decorators, which may decorate parameters. */
  experimentalDecorators?: boolean;
  /** Language of messages, for compilers that localize them ('en' by default). */
  locale?: 'en' | 'ru' | 'tj';
  /** TypeScript, for lowering; `globalThis.ts` is used when omitted. */
  typescript?: TypeScriptApi;
  /**
   * Report every diagnostic in this language, for learners, as `compile` of
   * the Node.js compiler does (`CompileOptions.language`): `errors` and
   * `warnings` show the line of code with a caret, `diagnostics` holds them as data.
   */
  language?: DiagnosticLanguage;
  /**
   * Also return where the statements of the source are in the code
   * (`mappings`), to place the errors of the running program.
   */
  mappings?: boolean;
  /** The warnings of the learning mode (`CompileOptions.learningMode`). */
  learningMode?: boolean;
}

export interface BrowserCompileResult {
  /** Generated JavaScript (CommonJS for modules), or '' when emission was suppressed. */
  code: string;
  errors: string[];
  warnings: string[];
  /**
   * The program needs TypeScript to be lowered and none was available: load
   * it (`globalThis.ts`) and compile again.
   */
  needsTypeScript?: boolean;
  /** With `language`: the errors and warnings as data, in that language (errors first). */
  diagnostics?: Diagnostic[];
  /**
   * With `mappings`: the positions of statements in the code (lines from 1,
   * columns from 0), unless TypeScript lowered it.
   */
  mappings?: CodeMapping[];
}

/** The targets of src/targets.ts, oldest first. */
const TARGETS = [
  'es5',
  'es2015',
  'es2016',
  'es2017',
  'es2018',
  'es2019',
  'es2020',
  'es2021',
  'es2022',
  'es2023',
  'es2024',
  'es2025',
  'esnext',
];

/** The code generator emits ES2022: from this target on nothing needs lowering but new syntax. */
const NATIVE_FROM = TARGETS.indexOf('es2022');

export function compile(source: string, options: BrowserCompileOptions = {}): BrowserCompileResult {
  const problems = new Problems();
  const result = compileProgram(source, options, problems);
  if (options.language === undefined) return result;
  const diagnostics = problems.diagnostics(source, options.language);
  return { ...result, ...localizedMessages(diagnostics, source, options.language) };
}

function compileProgram(
  source: string,
  options: BrowserCompileOptions,
  problems: Problems
): BrowserCompileResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const fail = (): BrowserCompileResult => ({ code: '', errors, warnings });

  let program: Program;
  try {
    const parser = new Parser(new Lexer(source).tokenize());
    program = parser.parse();
    for (const error of parser.getErrors()) {
      errors.push(`Parse error: ${error}`);
      problems.add({ kind: 'syntax', text: error });
    }
  } catch (error) {
    // The lexer reports a problem with an Error; the parser collects its own
    errors.push((error as Error).message);
    problems.add({ kind: 'syntax', text: (error as Error).message });
    return fail();
  }
  if (errors.length > 0) return fail();

  if (options.typeCheck !== false) {
    const checked = options.learningMode
      ? checkForLearners(program, source, Boolean(options.strict))
      : new TypeChecker(source, { strict: Boolean(options.strict) }).check(program);
    errors.push(
      ...checked.errors.map(
        error =>
          `Type error [${error.code}] at line ${error.line}, column ${error.column}: ${error.message}\n> ${error.snippet}`
      )
    );
    warnings.push(
      ...checked.warnings.map(
        warning =>
          `Type warning [${warning.code}] at line ${warning.line}, column ${warning.column}: ${warning.message}\n> ${warning.snippet}`
      )
    );
    [...checked.errors, ...checked.warnings].forEach(error =>
      problems.add({ kind: 'type', error })
    );
    if (options.strict && checked.errors.length > 0) return fail();
  }

  const generator = new CodeGenerator({ experimentalDecorators: options.experimentalDecorators });
  const generated = options.mappings
    ? generator.generateWithMappings(program)
    : { code: generator.generate(program), mappings: undefined };
  const codegenErrors = generator.getErrors();
  if (codegenErrors.length > 0) {
    for (const error of codegenErrors) {
      errors.push(`Code generation error: ${error}`);
      problems.add({ kind: 'codegen', text: error });
    }
    return fail();
  }
  const result = lower(generated.code, generator.getLoweringNeeds(), options, {
    errors,
    warnings,
    problems,
  });
  // Lowered code has other positions
  if (generated.mappings && result.code === generated.code) result.mappings = generated.mappings;
  return result;
}

/** What the stages report: the messages and, for other languages, the problems. */
interface Collected {
  errors: string[];
  warnings: string[];
  problems: Problems;
}

/** A `"use strict"` directive on the first line (after a `#!` line). */
const USE_STRICT = /^(#![^\n]*\n)?"use strict";\n/;

/** Lowers the generated code with TypeScript when the target or the syntax needs it. */
function lower(
  code: string,
  needs: LoweringNeeds,
  options: BrowserCompileOptions,
  { errors, warnings, problems }: Collected
): BrowserCompileResult {
  const target = (options.target ?? 'es2022').toLowerCase();
  const index = TARGETS.indexOf(target);
  if (index === -1) {
    const text = `Unknown target '${target}'. Targets: ${TARGETS.join(', ')}`;
    errors.push(text);
    problems.add({ kind: 'option', text });
    return { code: '', errors, warnings };
  }
  // Decorators, `accessor` and `using`: no runtime runs them yet
  const neverNative =
    needs.decorators || needs.parameterDecorators || needs.autoAccessors || needs.usingDeclarations;
  if (!neverNative && index >= NATIVE_FROM) return { code, errors, warnings };

  const ts = options.typescript ?? globalTypeScript();
  if (!ts) return missingTypeScript(neverNative, target, { errors, warnings, problems });
  // As src/targets.ts does: TypeScript keeps decorators for ESNext, so lower them as for es2025
  const lowerTo = neverNative && target === 'esnext' ? 'es2025' : target;
  const output = ts.transpileModule(code, {
    // A `.js` name: the input is JavaScript
    fileName: 'module.js',
    compilerOptions: {
      target: scriptTargetOf(ts, lowerTo),
      module: ts.ModuleKind.ESNext,
      allowJs: true,
      // TypeScript 6 deprecates both; they work without an error with `ignoreDeprecations`
      ...(lowerTo === 'es5' && { downlevelIteration: true, ignoreDeprecations: '6.0' }),
      useDefineForClassFields: index >= NATIVE_FROM,
      newLine: ts.NewLineKind.LineFeed,
      ...(options.experimentalDecorators && { experimentalDecorators: true }),
    },
  });
  return { code: keepMode(code, output.outputText), errors, warnings };
}

/** The result when the code needs lowering and no TypeScript is loaded. */
function missingTypeScript(
  neverNative: boolean,
  target: string,
  { errors, warnings, problems }: Collected
): BrowserCompileResult {
  const text = neverNative
    ? 'This program uses decorators, accessors or `истифода`, which TypeScript lowers: load TypeScript (typescript.js) and compile again'
    : `The '${target}' target needs TypeScript to lower the code: load TypeScript (typescript.js) and compile again`;
  errors.push(text);
  problems.add({
    kind: 'detail',
    id: neverNative ? 'BROWSER_NEEDS_TYPESCRIPT' : 'TARGET_UNSUPPORTED',
    text,
  });
  return { code: '', errors, warnings, needsTypeScript: true };
}

/**
 * TypeScript 6 starts every script with `"use strict"`; lowered code keeps the
 * mode of the generated code (as `keepSloppyMode` in src/targets.ts does).
 */
function keepMode(code: string, lowered: string): string {
  return USE_STRICT.test(code) ? lowered : lowered.replace(USE_STRICT, '$1');
}

/**
 * `ts.ScriptTarget` of a target: 'es2017' → ES2017. The page may load another
 * TypeScript than the one the compiler is built with: a target newer than it
 * knows (es2025 before TypeScript 6) uses the newest older one. Never
 * 'esnext', which needs no lowering but of what no runtime runs (lowered as
 * for es2025).
 */
function scriptTargetOf(ts: TypeScriptApi, target: string): number {
  for (let index = TARGETS.indexOf(target); index > 0; index--) {
    const value = ts.ScriptTarget[TARGETS[index].toUpperCase()];
    if (typeof value === 'number') return value;
  }
  return ts.ScriptTarget.ES5 as number;
}

function globalTypeScript(): TypeScriptApi | undefined {
  // `global` is the global object in Node.js; the browser bundle defines it as `globalThis`
  const candidate = (global as { ts?: TypeScriptApi }).ts;
  return candidate && typeof candidate.transpileModule === 'function' ? candidate : undefined;
}

/** What compiled programs may log to. */
export interface ConsoleLike {
  log(..._args: unknown[]): void;
  error(..._args: unknown[]): void;
  warn(..._args: unknown[]): void;
  info(..._args: unknown[]): void;
  debug(..._args: unknown[]): void;
}

/**
 * Runs compiled code with the given console. The code runs as a CommonJS
 * module (`module.exports` is returned); `require` of other modules is not
 * available in the browser. Exceptions propagate to the caller.
 */
export function execute(code: string, consoleLike: ConsoleLike): unknown {
  const module = { exports: {} as unknown };
  const require = (id: string): never => {
    throw new Error(`Cannot load the module '${id}': modules are not available in the browser`);
  };
  // Running the compiled program is what this function is for
  const run = new Function('console', 'require', 'module', 'exports', code); // NOSONAR
  run(consoleLike, require, module, module.exports); // NOSONAR: runs the user's own program (S1523)
  return module.exports;
}

/** The compiler version, filled in by the browser build. */
export const version = '__SOMON_VERSION__';

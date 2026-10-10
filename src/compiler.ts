import { transformSync, type PluginItem } from '@babel/core';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { RawSourceMap, SourceMapGenerator } from 'source-map';

import { CodeGenerator, type CodeMapping } from './codegen';
import {
  codegenDiagnostic,
  detailDiagnostic,
  formatDiagnostic,
  syntaxDiagnostic,
  typeDiagnostic,
  type Diagnostic,
  type DiagnosticLanguage,
} from './diagnostics';
import { Lexer } from './lexer';
import { Parser } from './parser';
import {
  composeSourceMaps,
  DEFAULT_TARGET,
  isTarget,
  lowerToTarget,
  TARGETS,
  validateLib,
  type Target,
  type TargetDiagnostic,
} from './targets';
import { TypeChecker, type TypeCheckError } from './type-checker';

/**
 * Configuration flags that control how SomonScript source is transformed into JavaScript.
 */
export interface CompileOptions {
  /**
   * Emit a source map (`CompileResult.sourceMap`) that maps the generated
   * JavaScript back to the SomonScript input, statement by statement.
   */
  sourceMap?: boolean;
  /**
   * Name of the SomonScript input, used as the source map's `sources` entry
   * (and, with `.som` replaced by `.js`, its `file`). Defaults to `source.som`.
   */
  sourceFileName?: string;
  /**
   * Reduce output size by removing whitespace and simplifying expressions where possible.
   */
  minify?: boolean;
  /**
   * ECMAScript version the generated code must run on (`es5` … `es2025`,
   * `esnext`). Defaults to `es2022`. Newer syntax is lowered with TypeScript;
   * what the target cannot express (BigInt literals, some regular expression
   * flags) is a compile error.
   */
  target?: Target;
  /**
   * TypeScript lib names (`["es2022", "dom"]`) describing the APIs available
   * at run time, used by the TypeScript checker. Defaults to the target's
   * ECMAScript lib and the DOM. Validated against the libs TypeScript ships.
   */
  lib?: string[];
  /**
   * Class fields are defined (`Object.defineProperty` semantics) rather than
   * assigned in the constructor. Defaults to TypeScript's default for the
   * target: on from `es2022`.
   */
  useDefineForClassFields?: boolean;
  /**
   * Lower newer syntax for `target` (default). With `false` the code is only
   * checked against the target and keeps its syntax: the bundler lowers the
   * whole bundle once instead of every module.
   */
  downlevel?: boolean;
  /**
   * Toggle semantic analysis. Disable only when experimenting with partially valid programs.
   */
  typeCheck?: boolean;
  /**
   * Treat type errors as fatal: no code is emitted when any are found. Without
   * it, type errors are still reported in `errors` but code is emitted too.
   */
  strict?: boolean;
  /**
   * @deprecated Has no effect: compilation is synchronous and cannot be
   * interrupted. Enforce time limits around the call (e.g. in a worker).
   */
  timeout?: number;
  /**
   * TypeScript's legacy decorators (`experimentalDecorators`), which also
   * decorate parameters. Without it decorators are the standard (TC39) ones.
   * Either way TypeScript lowers them, since no JavaScript runtime runs them.
   */
  experimentalDecorators?: boolean;
  /**
   * Module format of the output: CommonJS `require`/`module.exports` (the
   * default) or ES modules `import`/`export`, which also allow top-level
   * `интизор` and `ворид.meta`.
   */
  module?: 'commonjs' | 'esm';
  /**
   * Allow top-level `интизор` in CommonJS output, for hosts that run the code
   * inside an async function (as the REPL does).
   */
  topLevelAwait?: boolean;
  /**
   * Type checker: SomonScript's own (`somon`, the default) or the TypeScript
   * compiler (`typescript`), which checks the program with TypeScript's full
   * semantics, including imported `.som` modules and `.d.ts` typings.
   */
  checker?: 'somon' | 'typescript';
  /** Language of the TypeScript checker's diagnostics: English (default), Russian or Tajik. */
  locale?: 'en' | 'ru' | 'tj';
  /**
   * Report every diagnostic in this language, written for learners: `errors`
   * and `warnings` hold the message with the line of code and a caret under
   * the place (`Хато дар сатри 4: …`), and `diagnostics` the same as data
   * (code, message, line, column, hint). Implies `locale`. Without it the
   * messages are the compiler's English ones, as they always were.
   */
  language?: DiagnosticLanguage;
  /** Also produce a TypeScript declaration file (`CompileResult.declaration`). */
  declaration?: boolean;
  /**
   * Path of the source file. The TypeScript checker (and `declaration`)
   * resolve imports and node_modules typings from it; defaults to
   * `source.som` in the current directory.
   */
  filePath?: string;
}

/**
 * Result of compiling SomonScript source into JavaScript.
 *
 * `errors` and `code` are not exclusive: parse errors and code generation
 * errors always suppress code (`code` is `''`), and so do type errors in
 * `strict` mode, but without `strict` type errors are reported alongside the
 * emitted code. Check `errors.length` rather than `code` to detect failure.
 */
export interface CompileResult {
  /** Generated JavaScript code, or an empty string when emission was suppressed. */
  code: string;
  /** Source map as a JSON string when `sourceMap` is enabled and code was emitted. */
  sourceMap?: string;
  /** Errors: parse, code generation and type errors (see above for which suppress code). */
  errors: string[];
  /** Diagnostics that highlight potential problems but do not stop emission. */
  warnings: string[];
  /** TypeScript declarations (`.d.ts` text) when `declaration` is enabled and code was emitted. */
  declaration?: string;
  /** With `language`: the errors and warnings as data, in that language (errors first). */
  diagnostics?: Diagnostic[];
}

/**
 * Compile SomonScript source code to JavaScript.
 *
 * @param source Raw SomonScript program text.
 * @param options Optional compiler configuration. See {@link CompileOptions} for details.
 * @returns Structured {@link CompileResult} output containing emitted JavaScript, source maps,
 * diagnostics, and warnings.
 */
export function compile(source: string, options: CompileOptions = {}): CompileResult {
  // Note: the previous `setTimeout`-based timeout was a no-op for a synchronous
  // parse loop. The thrown error fired in a future tick, became an uncaught
  // exception, and did not interrupt CPU-bound work. If pathological inputs
  // become a problem, enforce timeouts via a worker thread at the CLI layer.
  if (options.language === undefined) return compileInternal(source, options, new Problems());
  const problems = new Problems();
  const result = compileInternal(
    source,
    { ...options, locale: options.locale ?? options.language },
    problems
  );
  return localize(result, problems.diagnostics(source, options.language), source, options.language);
}

/**
 * What went wrong, as each stage reports it, for the diagnostics in another
 * language: the stage's own message (or the checker's error) per entry of
 * `errors` and `warnings`.
 */
class Problems {
  private readonly entries: Array<
    | { kind: 'syntax' | 'codegen' | 'option' | 'internal'; text: string }
    | { kind: 'target'; text: string; line: number; column: number }
    | { kind: 'type'; error: TypeCheckError }
  > = [];

  add(entry: Problems['entries'][number]): void {
    this.entries.push(entry);
  }

  diagnostics(source: string, language: DiagnosticLanguage): Diagnostic[] {
    const all = this.entries.map((entry): Diagnostic => {
      switch (entry.kind) {
        case 'syntax':
          return syntaxDiagnostic(entry.text, source, language);
        case 'codegen':
          return codegenDiagnostic(entry.text, source, language);
        case 'type':
          return typeDiagnostic(entry.error, source, language);
        case 'target':
          return detailDiagnostic('TARGET_UNSUPPORTED', entry.text, language, entry);
        case 'option':
          return detailDiagnostic('OPTION_INVALID', entry.text, language);
        default:
          return detailDiagnostic('CODEGEN_INVALID', entry.text, language);
      }
    });
    // After a syntax error the parser goes on from a guess; what it reports next on that
    // line is mostly the same mistake again (`чоп(1; 2)`: a `)` and a `;`)
    const shown = all.filter(
      (d, index) =>
        this.entries[index].kind !== 'syntax' ||
        !all
          .slice(0, index)
          .some((e, before) => this.entries[before].kind === 'syntax' && e.line === d.line)
    );
    return [
      ...shown.filter(d => d.severity === 'error'),
      ...shown.filter(d => d.severity === 'warning'),
    ];
  }
}

/** The result with its messages in `language`, for learners. */
function localize(
  result: CompileResult,
  diagnostics: Diagnostic[],
  source: string,
  language: DiagnosticLanguage
): CompileResult {
  const format = (d: Diagnostic) => formatDiagnostic(d, { language, source });
  return {
    ...result,
    errors: diagnostics.filter(d => d.severity === 'error').map(format),
    warnings: diagnostics.filter(d => d.severity === 'warning').map(format),
    diagnostics,
  };
}

function compileInternal(
  source: string,
  options: CompileOptions,
  problems: Problems
): CompileResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    if (routeTargetOptionErrors(options, errors)) {
      errors.forEach(text => problems.add({ kind: 'option', text }));
      return { code: '', errors, warnings };
    }

    const parsed = parseSource(source);
    if ('lexerError' in parsed) {
      errors.push(parsed.lexerError);
      problems.add({ kind: 'syntax', text: parsed.lexerError });
      return { code: '', errors, warnings };
    }
    const { ast, parserErrors } = parsed;

    if (
      routeParserErrors(
        parserErrors.map(err => `Parse error: ${err}`),
        errors
      )
    ) {
      parserErrors.forEach(text => problems.add({ kind: 'syntax', text }));
      return { code: '', errors, warnings };
    }

    const typeScript = runTypeScriptStage(ast, source, options);
    const stop = runTypeCheckStage(
      ast,
      source,
      options,
      { errors, warnings, problems },
      typeScript?.errors
    );
    if (stop) return { code: '', errors, warnings };

    const result = emitCode(ast, options, { errors, warnings, problems }, source);
    if (typeScript?.declaration !== undefined && result.code !== '') {
      result.declaration = typeScript.declaration;
    }
    return result;
  } catch (error) {
    const text = error instanceof Error ? error.message : String(error);
    errors.push(text);
    problems.add({ kind: 'internal', text });
    return { code: '', errors, warnings };
  }
}

/**
 * `target` and `lib` come from untyped sources too (JavaScript callers,
 * configuration files): reject unknown values instead of guessing. Returns
 * true when compilation must stop.
 */
function routeTargetOptionErrors(options: CompileOptions, errors: string[]): boolean {
  const before = errors.length;
  if (options.target !== undefined && !isTarget(options.target)) {
    errors.push(
      `Unknown target '${String(options.target)}'. Expected one of: ${TARGETS.join(', ')}`
    );
  }
  if (options.lib !== undefined) {
    errors.push(...validateLib(options.lib).map(message => `Invalid lib: ${message}`));
  }
  return errors.length > before;
}

/**
 * Parser errors are fatal in every mode: the parser skips the statement it
 * could not parse, so emitting code would silently drop part of the program.
 *
 * Returns true when compilation must stop (at least one parser error).
 */
function routeParserErrors(parserErrors: string[], errors: string[]): boolean {
  errors.push(...parserErrors);
  return parserErrors.length > 0;
}

/**
 * Runs the type-check stage unless explicitly disabled. Returns true when
 * strict-mode type errors should abort emission. With `checker: 'typescript'`
 * it reports `typeScriptErrors`, the TypeScript stage's findings.
 */
function runTypeCheckStage(
  ast: ReturnType<Parser['parse']>,
  source: string,
  options: CompileOptions,
  { errors, warnings, problems }: Collected,
  typeScriptErrors: TypeCheckError[] | undefined
): boolean {
  if (options.typeCheck === false) return false;
  // With `checker: 'typescript'` and type checking on, the TypeScript stage has run
  const result =
    options.checker === 'typescript'
      ? { errors: typeScriptErrors!, warnings: [] }
      : new TypeChecker(source, { strict: Boolean(options.strict) }).check(ast);
  errors.push(...result.errors.map(formatTypeError));
  warnings.push(...result.warnings.map(formatTypeWarning));
  [...result.errors, ...result.warnings].forEach(error => problems.add({ kind: 'type', error }));
  return Boolean(options.strict) && result.errors.length > 0;
}

/** What the stages report: the compiler's messages and, for other languages, the problems. */
interface Collected {
  errors: string[];
  warnings: string[];
  problems: Problems;
}

/**
 * The TypeScript compiler's part: type errors (with `checker: 'typescript'`)
 * and declarations (`declaration`). Loaded only when needed.
 */
function runTypeScriptStage(
  ast: ReturnType<Parser['parse']>,
  source: string,
  options: CompileOptions
): { errors: TypeCheckError[]; declaration?: string } | undefined {
  const typeCheck = options.typeCheck !== false && options.checker === 'typescript';
  if (!typeCheck && !options.declaration) return undefined;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { checkWithTypeScript } = require('./tsc-checker') as typeof import('./tsc-checker');
  const [result] = checkWithTypeScript(
    [{ fileName: options.filePath ?? 'source.som', source, ast }],
    {
      strict: options.strict,
      target: options.target,
      lib: options.lib,
      useDefineForClassFields: options.useDefineForClassFields,
      experimentalDecorators: options.experimentalDecorators,
      locale: options.locale,
      declaration: options.declaration,
      typeCheck,
    }
  );
  return result;
}

/** A type error in the format the compiler reports it. */
export function formatTypeError(err: TypeCheckError): string {
  return `Type error [${err.code}] at line ${err.line}, column ${err.column}: ${err.message}\n> ${err.snippet}`;
}

function formatTypeWarning(warn: TypeCheckError): string {
  return `Type warning [${warn.code}] at line ${warn.line}, column ${warn.column}: ${warn.message}\n> ${warn.snippet}`;
}

function emitCode(
  ast: ReturnType<Parser['parse']>,
  options: CompileOptions,
  { errors, warnings, problems }: Collected,
  source: string
): CompileResult {
  const generator = new CodeGenerator({
    experimentalDecorators: options.experimentalDecorators,
    module: options.module,
    topLevelAwait: options.topLevelAwait,
    isDirectoryImport:
      options.filePath === undefined ? undefined : directoryImports(options.filePath),
  });
  const generated = generator.generateWithMappings(ast);
  const codegenErrors = generator.getErrors();
  if (codegenErrors.length > 0) {
    errors.push(...codegenErrors.map(err => `Code generation error: ${err}`));
    codegenErrors.forEach(text => problems.add({ kind: 'codegen', text }));
    return { code: '', errors, warnings };
  }

  const sourceFileName = options.sourceFileName ?? 'source.som';
  let map = options.sourceMap
    ? buildSourceMap(generated.mappings, sourceFileName, source)
    : undefined;
  const lowered = lowerToTarget(generated.code, {
    target: options.target ?? DEFAULT_TARGET,
    useDefineForClassFields: options.useDefineForClassFields,
    experimentalDecorators: options.experimentalDecorators,
    sourceMap: options.sourceMap,
    downlevel: options.downlevel,
  });
  if (lowered.diagnostics.length > 0) {
    for (const target of targetErrors(lowered.diagnostics, generated.mappings, source)) {
      errors.push(target.text);
      problems.add({ kind: 'target', ...target.diagnostic });
    }
    return { code: '', errors, warnings };
  }
  let code = lowered.code;
  if (map && lowered.map) {
    map = composeSourceMaps(lowered.map, map);
  }

  if (options.minify) {
    ({ code, map } = minifyCode(code, map, options.sourceMap));
  }

  return {
    code,
    sourceMap: options.sourceMap && map ? JSON.stringify(map) : undefined,
    errors,
    warnings,
  };
}

/**
 * Whether a relative specifier of the file at `filePath` names a directory
 * with an `index.som` (and no `.som` or `.js` file of that name), as the
 * module system resolves `./м`.
 */
function directoryImports(filePath: string): (_specifier: string) => boolean {
  const directory = path.dirname(path.resolve(filePath));
  return specifier => {
    const base = path.resolve(directory, specifier);
    // The modules the compiled file imports (S8707)
    return (
      !fs.existsSync(`${base}.som`) && // NOSONAR
      !fs.existsSync(`${base}.js`) && // NOSONAR
      fs.existsSync(path.join(base, 'index.som')) // NOSONAR
    );
  };
}

/** The syntax tree and the parser's errors, or the lexer's error when it could not read the source. */
function parseSource(
  source: string
): { ast: ReturnType<Parser['parse']>; parserErrors: string[] } | { lexerError: string } {
  let tokens;
  try {
    tokens = new Lexer(source).tokenize();
  } catch (error) {
    // The lexer reports what it cannot read with an Error
    return { lexerError: (error as Error).message };
  }
  const parser = new Parser(tokens);
  const ast = parser.parse();
  return { ast, parserErrors: parser.getErrors() };
}

/**
 * Errors for what the target cannot express, at the position of the statement
 * around it in the SomonScript source (the code generator maps statements).
 */
function targetErrors(
  diagnostics: TargetDiagnostic[],
  mappings: CodeMapping[],
  source: string
): Array<{ text: string; diagnostic: { text: string; line: number; column: number } }> {
  const sourceLines = source.split(/\r?\n/);
  const errors = new Map<string, { text: string; line: number; column: number }>();
  for (const diagnostic of diagnostics) {
    let original = { line: diagnostic.line, column: 0 };
    for (const mapping of mappings) {
      const { line, column } = mapping.generated;
      if (line > diagnostic.line || (line === diagnostic.line && column > diagnostic.column)) break;
      original = mapping.original;
    }
    // Every target error is inside a statement, which has a mapping
    const snippet = sourceLines[original.line - 1].trim();
    const position = { line: original.line, column: original.column + 1 };
    const text = `Target error at line ${position.line}, column ${position.column}: ${diagnostic.message}\n> ${snippet}`;
    // Two literals in one statement end up at the same position
    errors.set(text, { text: diagnostic.message, ...position });
  }
  return [...errors].map(([text, diagnostic]) => ({ text, diagnostic }));
}

function outputFileName(sourceFileName: string): string {
  const baseName = sourceFileName.split(/[\\/]/).pop() || 'source.som';
  return baseName.replace(/\.som$/, '') + '.js';
}

/** Source map from the code generator's statement positions to the `.som` input. */
function buildSourceMap(
  mappings: CodeMapping[],
  sourceFileName: string,
  source: string
): RawSourceMap {
  const generator = new SourceMapGenerator({ file: outputFileName(sourceFileName) });
  generator.setSourceContent(sourceFileName, source);
  for (const mapping of mappings) {
    generator.addMapping({ ...mapping, source: sourceFileName });
  }
  return generator.toJSON();
}

let minifyPreset: PluginItem | undefined;

/** `babel-preset-minify` is a regular dependency; load it once, on first use. */
function loadMinifyPreset(): PluginItem {
  if (!minifyPreset) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      minifyPreset = require('babel-preset-minify') as PluginItem;
    } catch (error) {
      // `require` fails with an Error
      throw new Error(
        `Minification failed: the 'babel-preset-minify' dependency could not be loaded (${(error as Error).message}). Reinstall the package dependencies.`
      );
    }
  }
  return minifyPreset;
}

function minifyCode(
  code: string,
  map: RawSourceMap | undefined,
  sourceMap?: boolean
): { code: string; map: RawSourceMap | undefined } {
  const babel = transformSync(code, {
    // The options here are the whole configuration: no babel.config.json or .babelrc
    configFile: false,
    babelrc: false,
    sourceMaps: sourceMap,
    // Babel composes its own map with this one, so the result maps to the .som input
    inputSourceMap: map,
    presets: [loadMinifyPreset()],
    comments: false,
    compact: true,
  });

  return {
    code: babel?.code && babel.code.length > 0 ? babel.code : code,
    map: sourceMap && babel?.map ? (babel.map as unknown as RawSourceMap) : map,
  };
}

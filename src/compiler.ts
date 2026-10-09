import { transformSync, type PluginItem } from '@babel/core';
import { RawSourceMap, SourceMapGenerator } from 'source-map';

import { CodeGenerator, type CodeMapping } from './codegen';
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
import { TypeChecker } from './type-checker';

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
   * ECMAScript version the generated code must run on (`es5` … `es2024`,
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
  return compileInternal(source, options);
}

function compileInternal(source: string, options: CompileOptions): CompileResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    if (routeTargetOptionErrors(options, errors)) {
      return { code: '', errors, warnings };
    }

    const { ast, parserErrors } = parseSource(source);

    if (routeParserErrors(parserErrors, errors)) {
      return { code: '', errors, warnings };
    }

    if (runTypeCheckStage(ast, source, options, errors, warnings)) {
      return { code: '', errors, warnings };
    }

    return emitCode(ast, options, errors, warnings, source);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
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
 * strict-mode type errors should abort emission.
 */
function runTypeCheckStage(
  ast: ReturnType<Parser['parse']>,
  source: string,
  options: CompileOptions,
  errors: string[],
  warnings: string[]
): boolean {
  if (options.typeCheck === false) return false;
  const result = runTypeCheck(source, ast, Boolean(options.strict));
  errors.push(...result.errors);
  warnings.push(...result.warnings);
  return Boolean(options.strict) && result.errors.length > 0;
}

function emitCode(
  ast: ReturnType<Parser['parse']>,
  options: CompileOptions,
  errors: string[],
  warnings: string[],
  source: string
): CompileResult {
  const generator = new CodeGenerator({ experimentalDecorators: options.experimentalDecorators });
  const generated = generator.generateWithMappings(ast);
  const codegenErrors = generator.getErrors();
  if (codegenErrors.length > 0) {
    errors.push(...codegenErrors.map(err => `Code generation error: ${err}`));
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
    errors.push(...targetErrors(lowered.diagnostics, generated.mappings, source));
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

function parseSource(source: string) {
  const lexer = new Lexer(source);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  const ast = parser.parse();
  const parserErrors = parser
    .getErrors()
    .map(err => (err.startsWith('Parse error') ? err : `Parse error: ${err}`));
  return { ast, parserErrors };
}

function runTypeCheck(source: string, ast: ReturnType<Parser['parse']>, strict: boolean) {
  const checker = new TypeChecker(source, { strict });
  const result = checker.check(ast);
  return {
    errors: result.errors.map(
      err =>
        `Type error [${err.code}] at line ${err.line}, column ${err.column}: ${err.message}\n> ${err.snippet}`
    ),
    warnings: result.warnings.map(
      warn =>
        `Type warning [${warn.code}] at line ${warn.line}, column ${warn.column}: ${warn.message}\n> ${warn.snippet}`
    ),
  };
}

/**
 * Errors for what the target cannot express, at the position of the statement
 * around it in the SomonScript source (the code generator maps statements).
 */
function targetErrors(
  diagnostics: TargetDiagnostic[],
  mappings: CodeMapping[],
  source: string
): string[] {
  const sourceLines = source.split(/\r?\n/);
  const messages = diagnostics.map(diagnostic => {
    let original = { line: diagnostic.line, column: 0 };
    for (const mapping of mappings) {
      const { line, column } = mapping.generated;
      if (line > diagnostic.line || (line === diagnostic.line && column > diagnostic.column)) break;
      original = mapping.original;
    }
    const snippet = (sourceLines[original.line - 1] ?? '').trim();
    return `Target error at line ${original.line}, column ${original.column + 1}: ${diagnostic.message}\n> ${snippet}`;
  });
  // Two literals in one statement end up at the same position
  return [...new Set(messages)];
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
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Minification failed: the 'babel-preset-minify' dependency could not be loaded (${reason}). Reinstall the package dependencies.`
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
    sourceMaps: sourceMap,
    // Babel composes its own map with this one, so the result maps to the .som input
    inputSourceMap: map ? { ...map, file: map.file || '' } : undefined,
    presets: [loadMinifyPreset()],
    comments: false,
    compact: true,
  });

  return {
    code: babel?.code && babel.code.length > 0 ? babel.code : code,
    map: sourceMap && babel?.map ? (babel.map as unknown as RawSourceMap) : map,
  };
}

import { transformSync, type PluginItem } from '@babel/core';
import { RawSourceMap, SourceMapGenerator } from 'source-map';
import ts from 'typescript';

import { CodeGenerator, type CodeMapping } from './codegen';
import { Lexer } from './lexer';
import { Parser } from './parser';
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
   * JavaScript target version for the generated code. Defaults to `es2020` for modern runtimes.
   */
  target?: 'es5' | 'es2015' | 'es2020' | 'esnext';
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
  const generator = new CodeGenerator();
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
  const transpileResult = transpile(generated.code, options);
  let code = transpileResult.code;
  if (map && transpileResult.map) {
    map = chainSourceMaps(transpileResult.map, map, source);
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

function transpile(code: string, options: CompileOptions) {
  const targetMap: Record<NonNullable<CompileOptions['target']>, ts.ScriptTarget> = {
    es5: ts.ScriptTarget.ES5,
    es2015: ts.ScriptTarget.ES2015,
    es2020: ts.ScriptTarget.ES2020,
    esnext: ts.ScriptTarget.ESNext,
  };
  const target = options.target ?? 'es2020';
  if (target === 'es2020') {
    return { code };
  }
  const transpile = ts.transpileModule(code, {
    compilerOptions: {
      target: targetMap[target],
      module: ts.ModuleKind.ESNext,
      sourceMap: options.sourceMap,
    },
  });
  const map =
    options.sourceMap && transpile.sourceMapText
      ? (JSON.parse(transpile.sourceMapText) as unknown as RawSourceMap)
      : undefined;
  // TypeScript points at a `module.js.map` file that is never written
  const outputText = transpile.outputText.replace(/\n?\/\/# sourceMappingURL=\S*\s*$/, '\n');
  return { code: outputText, map };
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

/**
 * Compose `outer` (transpiled JS → generated JS) with `inner` (generated JS →
 * `.som`). Done by hand because `source-map`'s consumer is asynchronous and
 * `compile` is not. Each outer segment takes the nearest inner mapping at or
 * before its position on the same line.
 */
function chainSourceMaps(outer: RawSourceMap, inner: RawSourceMap, source: string): RawSourceMap {
  const innerLines = decodeMappings(inner.mappings);
  const sourceFileName = inner.sources[0];
  const generator = new SourceMapGenerator({ file: inner.file });
  generator.setSourceContent(sourceFileName, source);

  decodeMappings(outer.mappings).forEach((segments, outerLine) => {
    for (const [column, , line, originalColumn] of segments) {
      if (line === undefined) continue;
      const candidates = innerLines[line] ?? [];
      let match: number[] | undefined;
      for (const candidate of candidates) {
        if (candidate[0] > originalColumn) break;
        match = candidate;
      }
      match ??= candidates[0];
      if (!match || match.length < 4) continue;
      generator.addMapping({
        generated: { line: outerLine + 1, column },
        original: { line: match[2] + 1, column: match[3] },
        source: sourceFileName,
      });
    }
  });
  return generator.toJSON();
}

const BASE64_DIGITS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * Decode a source map `mappings` string into absolute segments per generated
 * line: [column, sourceIndex, originalLine (0-based), originalColumn, name].
 */
function decodeMappings(mappings: string): number[][][] {
  const state = [0, 0, 0, 0, 0];
  return mappings.split(';').map(lineText => {
    state[0] = 0;
    return lineText
      .split(',')
      .filter(segment => segment.length > 0)
      .map(segment => decodeVlq(segment).map((delta, index) => (state[index] += delta)));
  });
}

function decodeVlq(segment: string): number[] {
  const values: number[] = [];
  let value = 0;
  let shift = 0;
  for (const char of segment) {
    const digit = BASE64_DIGITS.indexOf(char);
    value += (digit & 31) << shift;
    if (digit & 32) {
      shift += 5;
    } else {
      values.push(value & 1 ? -(value >>> 1) : value >>> 1);
      value = 0;
      shift = 0;
    }
  }
  return values;
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

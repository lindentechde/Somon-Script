import { transformSync, type PluginItem } from '@babel/core';
import { RawSourceMap, SourceMapGenerator } from 'source-map';
import ts from 'typescript';

import { CodeGenerator } from './codegen';
import { Lexer } from './lexer';
import { Parser } from './parser';
import { TypeChecker } from './type-checker';

/**
 * Configuration flags that control how SomonScript source is transformed into JavaScript.
 */
export interface CompileOptions {
  /**
   * Emit source maps that map the generated JavaScript back to the SomonScript input.
   * Enabled automatically when the pipeline needs stack traces or debugger support.
   */
  sourceMap?: boolean;
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
   * Abort compilation when any type errors are encountered instead of emitting code.
   */
  strict?: boolean;
}

/**
 * Result of compiling SomonScript source into JavaScript.
 */
export interface CompileResult {
  /** Generated JavaScript code, or an empty string if compilation failed. */
  code: string;
  /** Optional source map bundled as a JSON string when `sourceMap` is enabled. */
  sourceMap?: string;
  /** Collection of fatal issues that prevented emission. */
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
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const ast = parseSource(source);

    if (options.typeCheck !== false) {
      const result = runTypeCheck(source, ast);
      errors.push(...result.errors);
      warnings.push(...result.warnings);

      if (options.strict && result.errors.length > 0) {
        return { code: '', errors, warnings };
      }
    }

    let code = new CodeGenerator().generate(ast);
    const transpileResult = transpile(code, options);
    code = transpileResult.code;
    let map = transpileResult.map;

    if (options.sourceMap && !map) {
      map = generateIdentityMap(code);
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
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
    return { code: '', errors, warnings };
  }
}

function parseSource(source: string) {
  const lexer = new Lexer(source);
  const tokens = lexer.tokenize();
  return new Parser(tokens).parse();
}

function runTypeCheck(source: string, ast: ReturnType<Parser['parse']>) {
  const checker = new TypeChecker(source);
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
  return { code: transpile.outputText, map };
}

function generateIdentityMap(code: string): RawSourceMap {
  const generator = new SourceMapGenerator({ file: 'compiled.js' });
  const lines = code.split('\n');
  for (let i = 0; i < lines.length; i++) {
    generator.addMapping({
      generated: { line: i + 1, column: 0 },
      original: { line: i + 1, column: 0 },
      source: 'source.som',
    });
  }
  return JSON.parse(generator.toString()) as unknown as RawSourceMap;
}

function minifyCode(
  code: string,
  map: RawSourceMap | undefined,
  sourceMap?: boolean
): { code: string; map: RawSourceMap | undefined } {
  // Lazy-load minify preset to avoid hard dependency at runtime
  let presetModule: unknown = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    presetModule = require('babel-preset-minify');
  } catch {
    throw new Error(
      "Minification requires the optional dependency 'babel-preset-minify'. Install it to enable --minify."
    );
  }
  // Safely coerce the dynamically required preset into a PluginItem if possible.
  // babel-preset-minify exports either a function or an object acceptable as a preset.
  const presetItems: PluginItem[] = [];
  if (presetModule && (typeof presetModule === 'function' || typeof presetModule === 'object')) {
    presetItems.push(presetModule as PluginItem);
  }
  const babel = transformSync(code, {
    sourceMaps: sourceMap,
    // Cast RawSourceMap to Babel's InputSourceMap - they have compatible structures
    inputSourceMap: map ? { ...map, file: map.file || '' } : undefined,
    presets: presetItems,
    comments: false,
    compact: true,
  });

  return {
    code: babel?.code && babel.code.length > 0 ? babel.code : code,
    map: sourceMap && babel?.map ? (babel.map as unknown as RawSourceMap) : map,
  };
}

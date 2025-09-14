import { transformSync } from '@babel/core';
import minifyPreset from 'babel-preset-minify';
import { RawSourceMap, SourceMapGenerator } from 'source-map';
import ts from 'typescript';

import { CodeGenerator } from './codegen';
import { Lexer } from './lexer';
import { Parser } from './parser';
import { TypeChecker } from './type-checker';

/**
 * Options for compilation process
 */
export interface CompileOptions {
  sourceMap?: boolean;
  minify?: boolean;
  target?: 'es5' | 'es2015' | 'es2020' | 'esnext';
  typeCheck?: boolean;
  strict?: boolean;
}

/**
 * Result of compilation process
 */
export interface CompileResult {
  code: string;
  sourceMap?: string;
  errors: string[];
  warnings: string[];
}

/**
 * Compile SomonScript source code to JavaScript
 * @param source - The SomonScript source code
 * @param options - Compilation options
 * @returns Compilation result with generated code, errors, and warnings
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
      ? (JSON.parse(transpile.sourceMapText) as RawSourceMap)
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
  return JSON.parse(generator.toString()) as RawSourceMap;
}

function minifyCode(
  code: string,
  map: RawSourceMap | undefined,
  sourceMap?: boolean
): { code: string; map: RawSourceMap | undefined } {
  const babel = transformSync(code, {
    sourceMaps: sourceMap,
    inputSourceMap: map,
    presets: [minifyPreset],
    comments: false,
    compact: true,
  });

  return {
    code: babel?.code && babel.code.length > 0 ? babel.code : code,
    map: sourceMap && babel?.map ? (babel.map as RawSourceMap) : map,
  };
}

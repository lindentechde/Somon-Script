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
    // Tokenize
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    // Parse
    const parser = new Parser(tokens);
    const ast = parser.parse();

    // Type check (if enabled)
    if (options.typeCheck !== false) {
      // Default to true
      const typeChecker = new TypeChecker(source);
      const typeCheckResult = typeChecker.check(ast);

      // Add type errors and warnings
      errors.push(
        ...typeCheckResult.errors.map(
          err =>
            `Type error [${err.code}] at line ${err.line}, column ${err.column}: ${err.message}\n> ${err.snippet}`
        )
      );
      warnings.push(
        ...typeCheckResult.warnings.map(
          warn =>
            `Type warning [${warn.code}] at line ${warn.line}, column ${warn.column}: ${warn.message}\n> ${warn.snippet}`
        )
      );

      // Stop compilation if there are type errors in strict mode
      if (options.strict && typeCheckResult.errors.length > 0) {
        return {
          code: '',
          errors,
          warnings,
        };
      }
    }

    // Generate code
    const generator = new CodeGenerator();
    let code = generator.generate(ast);

    // Transpile to target using TypeScript when necessary
    const targetMap: Record<NonNullable<CompileOptions['target']>, ts.ScriptTarget> = {
      es5: ts.ScriptTarget.ES5,
      es2015: ts.ScriptTarget.ES2015,
      es2020: ts.ScriptTarget.ES2020,
      esnext: ts.ScriptTarget.ESNext,
    };

    const target = options.target ?? 'es2020';
    let map: RawSourceMap | undefined;

    if (target !== 'es2020') {
      const transpile = ts.transpileModule(code, {
        compilerOptions: {
          target: targetMap[target],
          module: ts.ModuleKind.ESNext,
          sourceMap: options.sourceMap,
        },
      });

      code = transpile.outputText;
      map =
        options.sourceMap && transpile.sourceMapText
          ? (JSON.parse(transpile.sourceMapText) as RawSourceMap)
          : undefined;
    } else if (options.sourceMap) {
      // Generate identity source map when no transpilation is needed
      const generator = new SourceMapGenerator({ file: 'compiled.js' });
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        generator.addMapping({
          generated: { line: i + 1, column: 0 },
          original: { line: i + 1, column: 0 },
          source: 'source.som',
        });
      }
      map = JSON.parse(generator.toString()) as RawSourceMap;
    }

    // Minify with Babel if requested
    if (options.minify) {
      const babel = transformSync(code, {
        sourceMaps: options.sourceMap,
        inputSourceMap: map,
        presets: [minifyPreset],
        comments: false,
        compact: true,
      });

      if (babel?.code) {
        code = babel.code;
      }
      if (options.sourceMap && babel?.map) {
        map = babel.map as RawSourceMap;
      }
    }

    return {
      code,
      sourceMap: options.sourceMap && map ? JSON.stringify(map) : undefined,
      errors,
      warnings,
    };
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
    return {
      code: '',
      errors,
      warnings,
    };
  }
}

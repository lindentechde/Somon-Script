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
      const typeChecker = new TypeChecker();
      const typeCheckResult = typeChecker.check(ast);

      // Add type errors and warnings
      errors.push(
        ...typeCheckResult.errors.map(
          err => `Type error at line ${err.line}, column ${err.column}: ${err.message}`
        )
      );
      warnings.push(
        ...typeCheckResult.warnings.map(
          warn => `Type warning at line ${warn.line}, column ${warn.column}: ${warn.message}`
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
    const code = generator.generate(ast);

    return {
      code,
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

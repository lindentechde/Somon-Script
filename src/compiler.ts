import { Lexer } from './lexer';
import { Parser } from './parser';
import { CodeGenerator } from './codegen';

export interface CompileOptions {
  sourceMap?: boolean;
  minify?: boolean;
  target?: 'es5' | 'es2015' | 'es2020' | 'esnext';
}

export interface CompileResult {
  code: string;
  sourceMap?: string;
  errors: string[];
  warnings: string[];
}

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
    
    // Generate code
    const generator = new CodeGenerator();
    const code = generator.generate(ast);
    
    return {
      code,
      errors,
      warnings
    };
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
    return {
      code: '',
      errors,
      warnings
    };
  }
}
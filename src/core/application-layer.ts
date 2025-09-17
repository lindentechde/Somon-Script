/**
 * Application Layer - Use Cases and Workflow Orchestration
 *
 * This layer implements the application's use cases using clean architecture principles.
 * It orchestrates domain services and coordinates between different layers.
 */

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-unused-vars */
/* eslint-disable complexity */

import { TokenType, Token } from '../types';
import { ModularLexer, LexerResult, LexicalError } from './modular-lexer-compatible';

// ===== USE CASE INTERFACES =====

export interface ICompilationUseCase {
  compileSource(source: string, options?: CompilationOptions): Promise<CompilationResult>;
}

export interface ILexicalAnalysisUseCase {
  analyze(source: string, options?: LexicalOptions): LexicalAnalysisResult;
}

export interface IValidationUseCase {
  validateSyntax(source: string): ValidationResult;
  validateTypes(ast: unknown): ValidationResult;
}

// ===== DATA STRUCTURES =====

export interface CompilationOptions {
  target?: 'javascript' | 'typescript';
  outputPath?: string;
  sourceMaps?: boolean;
  strict?: boolean;
  optimize?: boolean;
}

export interface LexicalOptions {
  includeWhitespace?: boolean;
  includeComments?: boolean;
  preserveNewlines?: boolean;
}

export interface CompilationResult {
  success: boolean;
  output?: string;
  errors: CompilationError[];
  warnings: CompilationWarning[];
  metrics: CompilationMetrics;
}

export interface LexicalAnalysisResult {
  tokens: Token[];
  errors: LexicalError[];
  metrics: LexicalMetrics;
  success: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface CompilationError {
  message: string;
  line: number;
  column: number;
  severity: 'error' | 'warning';
  code: string;
  category: 'lexical' | 'syntactic' | 'semantic' | 'type' | 'runtime';
}

export interface CompilationWarning {
  message: string;
  line: number;
  column: number;
  code: string;
  category: 'performance' | 'style' | 'compatibility' | 'deprecated';
}

export interface ValidationError {
  message: string;
  location: { line: number; column: number };
  category: 'syntax' | 'type' | 'logic';
}

export interface ValidationWarning {
  message: string;
  location: { line: number; column: number };
  category: 'style' | 'performance' | 'best-practice';
}

export interface CompilationMetrics {
  lexicalTime: number;
  parseTime: number;
  typeCheckTime: number;
  codeGenTime: number;
  totalTime: number;
  tokenCount: number;
  nodeCount: number;
  outputSize: number;
}

export interface LexicalMetrics {
  tokenCount: number;
  identifierCount: number;
  keywordCount: number;
  operatorCount: number;
  literalCount: number;
  processingTime: number;
  sourceSize: number;
}

// ===== DOMAIN SERVICES =====

export class ErrorAggregationService {
  static aggregateErrors(
    lexicalErrors: LexicalError[],
    syntaxErrors: unknown[] = [],
    typeErrors: unknown[] = []
  ): CompilationError[] {
    const errors: CompilationError[] = [];

    // Convert lexical errors
    lexicalErrors.forEach(error => {
      errors.push({
        message: error.message,
        line: error.line,
        column: error.column,
        severity: 'error',
        code: 'LEX001',
        category: 'lexical',
      });
    });

    // Add other error types here as more components are implemented

    return errors;
  }
}

export class MetricsCollectionService {
  static createLexicalMetrics(
    tokens: Token[],
    errors: LexicalError[],
    processingTime: number,
    sourceSize: number
  ): LexicalMetrics {
    const tokenCounts = this.categorizeTokens(tokens);

    return {
      tokenCount: tokens.filter(t => t.type !== TokenType.EOF).length,
      identifierCount: tokenCounts.identifiers,
      keywordCount: tokenCounts.keywords,
      operatorCount: tokenCounts.operators,
      literalCount: tokenCounts.literals,
      processingTime,
      sourceSize,
    };
  }

  private static categorizeTokens(tokens: Token[]): {
    identifiers: number;
    keywords: number;
    operators: number;
    literals: number;
  } {
    let identifiers = 0;
    let keywords = 0;
    let operators = 0;
    let literals = 0;

    tokens.forEach(token => {
      if (token.type === TokenType.IDENTIFIER) {
        identifiers++;
      } else if (this.isKeyword(token.type)) {
        keywords++;
      } else if (this.isOperator(token.type)) {
        operators++;
      } else if (this.isLiteral(token.type)) {
        literals++;
      }
    });

    return { identifiers, keywords, operators, literals };
  }

  private static isKeyword(type: TokenType): boolean {
    const keywords = [
      TokenType.ТАҒЙИРЁБАНДА,
      TokenType.СОБИТ,
      TokenType.ФУНКСИЯ,
      TokenType.АГАР,
      TokenType.ВАГАРНА,
      TokenType.БАРОИ,
      TokenType.ТО,
      TokenType.БОЗГАШТ,
      TokenType.СИНФ,
      TokenType.ИНТЕРФЕЙС,
    ];
    return keywords.includes(type);
  }

  private static isOperator(type: TokenType): boolean {
    const operators = [
      TokenType.PLUS,
      TokenType.MINUS,
      TokenType.MULTIPLY,
      TokenType.DIVIDE,
      TokenType.ASSIGN,
      TokenType.EQUAL,
      TokenType.LESS_THAN,
      TokenType.GREATER_THAN,
    ];
    return operators.includes(type);
  }

  private static isLiteral(type: TokenType): boolean {
    return [TokenType.NUMBER, TokenType.STRING, TokenType.BOOLEAN].includes(type);
  }
}

// ===== USE CASE IMPLEMENTATIONS =====

export class LexicalAnalysisUseCase implements ILexicalAnalysisUseCase {
  constructor(private readonly lexer: ModularLexer = new ModularLexer()) {}

  analyze(source: string, options: LexicalOptions = {}): LexicalAnalysisResult {
    const startTime = performance.now();

    try {
      const result = this.lexer.tokenize(source);
      const endTime = performance.now();
      const processingTime = endTime - startTime;

      const metrics = MetricsCollectionService.createLexicalMetrics(
        result.tokens,
        result.errors,
        processingTime,
        source.length
      );

      return {
        tokens: result.tokens,
        errors: result.errors,
        metrics,
        success: result.errors.length === 0,
      };
    } catch (error) {
      const endTime = performance.now();
      const processingTime = endTime - startTime;

      return {
        tokens: [],
        errors: [new LexicalError(`Unexpected error during lexical analysis: ${error}`, 0, 0, '')],
        metrics: {
          tokenCount: 0,
          identifierCount: 0,
          keywordCount: 0,
          operatorCount: 0,
          literalCount: 0,
          processingTime,
          sourceSize: source.length,
        },
        success: false,
      };
    }
  }
}

export class ValidationUseCase implements IValidationUseCase {
  validateSyntax(source: string): ValidationResult {
    // For now, this just checks if lexical analysis succeeds
    const lexicalUseCase = new LexicalAnalysisUseCase();
    const result = lexicalUseCase.analyze(source);

    const errors: ValidationError[] = result.errors.map(error => ({
      message: error.message,
      location: { line: error.line, column: error.column },
      category: 'syntax' as const,
    }));

    return {
      isValid: errors.length === 0,
      errors,
      warnings: [],
    };
  }

  validateTypes(ast: unknown): ValidationResult {
    // Placeholder for type validation
    return {
      isValid: true,
      errors: [],
      warnings: [],
    };
  }
}

export class CompilationUseCase implements ICompilationUseCase {
  constructor(
    private readonly lexicalAnalysis: ILexicalAnalysisUseCase = new LexicalAnalysisUseCase(),
    private readonly validation: IValidationUseCase = new ValidationUseCase()
  ) {}

  async compileSource(
    source: string,
    options: CompilationOptions = {}
  ): Promise<CompilationResult> {
    const startTime = performance.now();
    const errors: CompilationError[] = [];
    const warnings: CompilationWarning[] = [];

    try {
      // Step 1: Lexical Analysis
      console.log('🔤 Starting lexical analysis...');
      const lexicalStart = performance.now();
      const lexicalResult = this.lexicalAnalysis.analyze(source);
      const lexicalTime = performance.now() - lexicalStart;

      if (!lexicalResult.success) {
        errors.push(...ErrorAggregationService.aggregateErrors(lexicalResult.errors));
        return this.createFailureResult(errors, warnings, startTime, {
          lexicalTime,
          parseTime: 0,
          typeCheckTime: 0,
          codeGenTime: 0,
          tokenCount: lexicalResult.tokens.length,
          nodeCount: 0,
          outputSize: 0,
        });
      }

      console.log(`✅ Lexical analysis completed: ${lexicalResult.tokens.length} tokens`);

      // Step 2: Syntax Validation
      console.log('🔍 Validating syntax...');
      const validationResult = this.validation.validateSyntax(source);

      if (!validationResult.isValid) {
        errors.push(
          ...validationResult.errors.map(error => ({
            message: error.message,
            line: error.location.line,
            column: error.location.column,
            severity: 'error' as const,
            code: 'SYN001',
            category: 'syntactic' as const,
          }))
        );
      }

      // Step 3: Basic Code Generation (placeholder)
      console.log('🔧 Generating JavaScript code...');
      const codeGenStart = performance.now();
      const output = this.generateJavaScript(lexicalResult.tokens, options);
      const codeGenTime = performance.now() - codeGenStart;

      const totalTime = performance.now() - startTime;

      const metrics: CompilationMetrics = {
        lexicalTime,
        parseTime: 0, // Not implemented yet
        typeCheckTime: 0, // Not implemented yet
        codeGenTime,
        totalTime,
        tokenCount: lexicalResult.tokens.length,
        nodeCount: 0, // No AST yet
        outputSize: output.length,
      };

      console.log(`🎉 Compilation completed in ${totalTime.toFixed(2)}ms`);

      return {
        success: errors.length === 0,
        output,
        errors,
        warnings,
        metrics,
      };
    } catch (error) {
      const totalTime = performance.now() - startTime;

      errors.push({
        message: `Compilation failed: ${error}`,
        line: 0,
        column: 0,
        severity: 'error',
        code: 'COMP001',
        category: 'runtime',
      });

      return this.createFailureResult(errors, warnings, startTime, {
        lexicalTime: 0,
        parseTime: 0,
        typeCheckTime: 0,
        codeGenTime: 0,
        tokenCount: 0,
        nodeCount: 0,
        outputSize: 0,
      });
    }
  }

  private createFailureResult(
    errors: CompilationError[],
    warnings: CompilationWarning[],
    startTime: number,
    partialMetrics: Partial<CompilationMetrics>
  ): CompilationResult {
    const totalTime = performance.now() - startTime;

    return {
      success: false,
      errors,
      warnings,
      metrics: {
        lexicalTime: 0,
        parseTime: 0,
        typeCheckTime: 0,
        codeGenTime: 0,
        totalTime,
        tokenCount: 0,
        nodeCount: 0,
        outputSize: 0,
        ...partialMetrics,
      },
    };
  }

  private generateJavaScript(tokens: Token[], options: CompilationOptions): string {
    // Very basic token-to-JavaScript conversion for demonstration
    let output = '';
    let i = 0;

    while (i < tokens.length && tokens[i].type !== TokenType.EOF) {
      const token = tokens[i];

      switch (token.type) {
        case TokenType.ТАҒЙИРЁБАНДА:
          output += 'let ';
          break;
        case TokenType.СОБИТ:
          output += 'const ';
          break;
        case TokenType.ФУНКСИЯ:
          output += 'function ';
          break;
        case TokenType.АГАР:
          output += 'if ';
          break;
        case TokenType.ВАГАРНА:
          output += 'else ';
          break;
        case TokenType.БОЗГАШТ:
          output += 'return ';
          break;
        case TokenType.ДУРУСТ:
          output += 'true';
          break;
        case TokenType.НОДУРУСТ:
          output += 'false';
          break;
        case TokenType.ХОЛӢ:
          output += 'null';
          break;
        case TokenType.БЕҚИМАТ:
          output += 'undefined';
          break;
        default:
          output += token.value;
          break;
      }

      // Add space after most tokens except punctuation
      if (
        ![
          TokenType.SEMICOLON,
          TokenType.COMMA,
          TokenType.DOT,
          TokenType.LEFT_PAREN,
          TokenType.LEFT_BRACE,
          TokenType.LEFT_BRACKET,
        ].includes(token.type) &&
        i < tokens.length - 1 &&
        ![
          TokenType.RIGHT_PAREN,
          TokenType.RIGHT_BRACE,
          TokenType.RIGHT_BRACKET,
          TokenType.SEMICOLON,
          TokenType.COMMA,
          TokenType.DOT,
        ].includes(tokens[i + 1].type)
      ) {
        output += ' ';
      }

      i++;
    }

    return output;
  }
}

// ===== FACADE FOR EASY USAGE =====

export class SomoniCompiler {
  private readonly compilationUseCase: ICompilationUseCase;
  private readonly lexicalAnalysisUseCase: ILexicalAnalysisUseCase;
  private readonly validationUseCase: IValidationUseCase;

  constructor() {
    this.lexicalAnalysisUseCase = new LexicalAnalysisUseCase();
    this.validationUseCase = new ValidationUseCase();
    this.compilationUseCase = new CompilationUseCase(
      this.lexicalAnalysisUseCase,
      this.validationUseCase
    );
  }

  async compile(source: string, options?: CompilationOptions): Promise<CompilationResult> {
    return this.compilationUseCase.compileSource(source, options);
  }

  analyzeLexically(source: string, options?: LexicalOptions): LexicalAnalysisResult {
    return this.lexicalAnalysisUseCase.analyze(source, options);
  }

  validate(source: string): ValidationResult {
    return this.validationUseCase.validateSyntax(source);
  }
}

// ===== DEMO FUNCTION =====

export async function demonstrateApplicationLayer(): Promise<void> {
  console.log('🏗️  Application Layer Architecture Demo');
  console.log('==========================================\n');

  const code = `
тағйирёбанда исм = "Ҷаҳон";
функсия салом(номи) {
    бозгашт "Салом, " + номи + "!";
}

рақам натиҷа = 42;
мантиқӣ дуруст_аст = дуруст;
`;

  const compiler = new SomoniCompiler();

  console.log('📝 Source Code:');
  console.log(code);
  console.log();

  // Demonstrate lexical analysis
  console.log('🔤 Lexical Analysis:');
  const lexicalResult = compiler.analyzeLexically(code);
  console.log(`- Tokens: ${lexicalResult.metrics.tokenCount}`);
  console.log(`- Processing time: ${lexicalResult.metrics.processingTime.toFixed(2)}ms`);
  console.log(`- Success: ${lexicalResult.success}`);
  console.log();

  // Demonstrate validation
  console.log('🔍 Validation:');
  const validationResult = compiler.validate(code);
  console.log(`- Valid: ${validationResult.isValid}`);
  console.log(`- Errors: ${validationResult.errors.length}`);
  console.log();

  // Demonstrate full compilation
  console.log('🔧 Full Compilation:');
  const compilationResult = await compiler.compile(code, {
    target: 'javascript',
    optimize: false,
  });

  console.log(`- Success: ${compilationResult.success}`);
  console.log(`- Total time: ${compilationResult.metrics.totalTime.toFixed(2)}ms`);
  console.log(`- Output size: ${compilationResult.metrics.outputSize} characters`);

  if (compilationResult.success && compilationResult.output) {
    console.log('\n📤 Generated JavaScript:');
    console.log('```javascript');
    console.log(compilationResult.output);
    console.log('```');
  }

  if (compilationResult.errors.length > 0) {
    console.log('\n❌ Compilation Errors:');
    compilationResult.errors.forEach(error => {
      console.log(`- ${error.category}: ${error.message} at line ${error.line}`);
    });
  }

  console.log('\n✅ Application layer demonstration completed!');
}

// Run the demo if this file is executed directly
if (require.main === module) {
  demonstrateApplicationLayer().catch(console.error);
}

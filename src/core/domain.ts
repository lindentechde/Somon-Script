/**
 * Core Domain Types and Abstractions for Somoni Script Compiler
 *
 * This module defines the fundamental building blocks following Domain-Driven Design
 * and Clean Architecture principles.
 */

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-unused-vars */
/* eslint-disable max-params */
/* eslint-disable complexity */

// ===== VALUE OBJECTS =====

export abstract class ValueObject {
  protected abstract getValueObjectProperties(): unknown[];

  equals(other: ValueObject): boolean {
    if (other.constructor !== this.constructor) {
      return false;
    }

    const thisProps = this.getValueObjectProperties();
    const otherProps = other.getValueObjectProperties();

    if (thisProps.length !== otherProps.length) {
      return false;
    }

    return thisProps.every((prop, index) => prop === otherProps[index]);
  }

  hashCode(): string {
    return JSON.stringify(this.getValueObjectProperties());
  }
}

export class SourceLocation extends ValueObject {
  constructor(
    public readonly line: number,
    public readonly column: number,
    public readonly file?: string,
    public readonly length?: number
  ) {
    super();

    if (line < 1) throw new Error('Line number must be positive');
    if (column < 1) throw new Error('Column number must be positive');
    if (length !== undefined && length < 0) throw new Error('Length must be non-negative');
  }

  protected getValueObjectProperties(): unknown[] {
    return [this.line, this.column, this.file, this.length];
  }

  toString(): string {
    const filePrefix = this.file ? `${this.file}:` : '';
    return `${filePrefix}${this.line}:${this.column}`;
  }

  static unknown(): SourceLocation {
    return new SourceLocation(1, 1, '<unknown>');
  }
}

export class SourceRange extends ValueObject {
  constructor(
    public readonly start: SourceLocation,
    public readonly end: SourceLocation
  ) {
    super();

    if (start.file !== end.file) {
      throw new Error('Source range cannot span multiple files');
    }

    if (start.line > end.line || (start.line === end.line && start.column > end.column)) {
      throw new Error('Start location must come before end location');
    }
  }

  protected getValueObjectProperties(): unknown[] {
    return [this.start, this.end];
  }

  contains(location: SourceLocation): boolean {
    if (location.file !== this.start.file) return false;

    if (location.line < this.start.line || location.line > this.end.line) {
      return false;
    }

    if (location.line === this.start.line && location.column < this.start.column) {
      return false;
    }

    if (location.line === this.end.line && location.column > this.end.column) {
      return false;
    }

    return true;
  }
}

// ===== RESULT PATTERN =====

export abstract class Result<TValue, TError> {
  static success<T, E>(value: T): Result<T, E> {
    return new Success(value);
  }

  static failure<T, E>(error: E): Result<T, E> {
    return new Failure(error);
  }

  static failures<T, E>(errors: E[]): Result<T, E[]> {
    return new Failure(errors);
  }

  abstract isSuccess(): boolean;
  abstract isFailure(): boolean;
  abstract getValue(): TValue;
  abstract getError(): TError;

  map<U>(fn: (value: TValue) => U): Result<U, TError> {
    return this.isSuccess() ? Result.success(fn(this.getValue())) : Result.failure(this.getError());
  }

  mapError<E>(fn: (error: TError) => E): Result<TValue, E> {
    return this.isFailure() ? Result.failure(fn(this.getError())) : Result.success(this.getValue());
  }

  flatMap<U>(fn: (value: TValue) => Result<U, TError>): Result<U, TError> {
    return this.isSuccess() ? fn(this.getValue()) : Result.failure(this.getError());
  }
}

class Success<TValue, TError> extends Result<TValue, TError> {
  constructor(private readonly value: TValue) {
    super();
  }

  isSuccess(): boolean {
    return true;
  }

  isFailure(): boolean {
    return false;
  }

  getValue(): TValue {
    return this.value;
  }

  getError(): TError {
    throw new Error('Cannot get error from success result');
  }
}

class Failure<TValue, TError> extends Result<TValue, TError> {
  constructor(private readonly error: TError) {
    super();
  }

  isSuccess(): boolean {
    return false;
  }

  isFailure(): boolean {
    return true;
  }

  getValue(): TValue {
    throw new Error('Cannot get value from failure result');
  }

  getError(): TError {
    return this.error;
  }
}

// ===== DOMAIN ERRORS =====

export abstract class CompilationError extends Error {
  constructor(
    message: string,
    public readonly location: SourceLocation,
    public readonly code: string,
    public readonly severity: 'error' | 'warning' | 'info' = 'error'
  ) {
    super(message);
    this.name = this.constructor.name;
  }

  abstract getErrorCategory(): string;

  toString(): string {
    return `${this.severity}: ${this.message} (${this.code}) at ${this.location}`;
  }
}

export class LexicalError extends CompilationError {
  constructor(
    message: string,
    location: SourceLocation,
    public readonly character?: string
  ) {
    super(message, location, 'LEX001');
  }

  getErrorCategory(): string {
    return 'Lexical Analysis';
  }
}

export class SyntaxError extends CompilationError {
  constructor(
    message: string,
    location: SourceLocation,
    public readonly expected?: string,
    public readonly actual?: string
  ) {
    super(message, location, 'SYN001');
  }

  getErrorCategory(): string {
    return 'Syntax Analysis';
  }
}

export class SemanticError extends CompilationError {
  constructor(
    message: string,
    location: SourceLocation,
    public readonly relatedLocation?: SourceLocation
  ) {
    super(message, location, 'SEM001');
  }

  getErrorCategory(): string {
    return 'Semantic Analysis';
  }
}

export class GenerationError extends CompilationError {
  constructor(message: string, location: SourceLocation) {
    super(message, location, 'GEN001');
  }

  getErrorCategory(): string {
    return 'Code Generation';
  }
}

// ===== CORE INTERFACES =====

export interface ICharacterScanner {
  readonly position: number;
  readonly line: number;
  readonly column: number;
  readonly isAtEnd: boolean;

  peek(offset?: number): string;
  advance(): string;
  match(char: string): boolean;
  matchSequence(sequence: string): boolean;
  skipWhitespace(): void;
  getCurrentLocation(): SourceLocation;
}

export interface ITokenRecognizer {
  readonly priority: number;
  canRecognize(scanner: ICharacterScanner): boolean;
  recognize(scanner: ICharacterScanner): Token | null;
}

export interface ILexicalAnalyzer {
  tokenize(source: string, file?: string): Result<Token[], LexicalError[]>;
}

export interface ISyntaxAnalyzer {
  parse(tokens: Token[]): Result<Program, SyntaxError[]>;
}

export interface ISemanticAnalyzer {
  analyze(ast: Program): Result<AnalyzedProgram, SemanticError[]>;
}

export interface ICodeGenerator {
  generate(ast: AnalyzedProgram, options?: GenerationOptions): Result<string, GenerationError[]>;
}

// ===== COMPILATION PIPELINE =====

export abstract class CompilationStep<TInput, TOutput, TError extends CompilationError> {
  abstract readonly name: string;

  abstract execute(input: TInput): Promise<Result<TOutput, TError[]>>;

  protected logStep(message: string): void {
    console.log(`[${this.name}] ${message}`);
  }
}

export class CompilationPipeline {
  constructor(
    private readonly steps: CompilationStep<unknown, unknown, CompilationError>[],
    private readonly reporter: IDiagnosticsReporter
  ) {}

  async execute<TInput, TOutput>(input: TInput): Promise<Result<TOutput, CompilationError[]>> {
    let current: unknown = input as unknown;
    const allErrors: CompilationError[] = [];

    for (const step of this.steps) {
      this.reporter.reportInfo(`Executing ${step.name}...`);

      const result = await step.execute(current);

      if (result.isFailure()) {
        const errors = result.getError();
        allErrors.push(...errors);

        errors.forEach(error => this.reporter.reportError(error));

        // Continue with next step if possible, or fail
        if (errors.some(e => e.severity === 'error')) {
          return Result.failures(allErrors);
        }
      } else {
        current = result.getValue();
      }
    }

    return allErrors.length > 0 && allErrors.some(e => e.severity === 'error')
      ? Result.failures(allErrors)
      : Result.success(current as TOutput);
  }
}

// ===== DIAGNOSTICS =====

export enum DiagnosticLevel {
  Info = 'info',
  Warning = 'warning',
  Error = 'error',
}

export class Diagnostic {
  constructor(
    public readonly level: DiagnosticLevel,
    public readonly message: string,
    public readonly location: SourceLocation,
    public readonly code: string,
    public readonly relatedInformation?: RelatedInformation[]
  ) {}
}

export class RelatedInformation {
  constructor(
    public readonly location: SourceLocation,
    public readonly message: string
  ) {}
}

export interface IDiagnosticsReporter {
  reportInfo(message: string, location?: SourceLocation): void;
  reportWarning(message: string, location: SourceLocation, code?: string): void;
  reportError(error: CompilationError): void;
  getSummary(): DiagnosticsSummary;
  clear(): void;
}

export class DiagnosticsSummary {
  constructor(
    public readonly errorCount: number,
    public readonly warningCount: number,
    public readonly infoCount: number,
    public readonly diagnostics: Diagnostic[]
  ) {}

  get hasErrors(): boolean {
    return this.errorCount > 0;
  }

  get hasWarnings(): boolean {
    return this.warningCount > 0;
  }

  get totalCount(): number {
    return this.errorCount + this.warningCount + this.infoCount;
  }
}

// ===== COMPILATION CONTEXT =====

export class CompilationOptions {
  constructor(
    public readonly strict: boolean = false,
    public readonly minify: boolean = false,
    public readonly sourceMap: boolean = false,
    public readonly target: string = 'es2020',
    public readonly outputFile?: string,
    public readonly includePaths: string[] = [],
    public readonly defines: Record<string, string> = {}
  ) {}

  static default(): CompilationOptions {
    return new CompilationOptions();
  }
}

export class CompilationContext {
  constructor(
    public readonly options: CompilationOptions,
    public readonly diagnostics: IDiagnosticsReporter,
    public readonly sourceFile: string,
    public readonly workingDirectory: string
  ) {}
}

// ===== TOKEN AND AST TYPES =====

export interface Token {
  readonly type: TokenType;
  readonly value: string;
  readonly location: SourceLocation;
  readonly trivia?: Trivia[];
}

export interface Trivia {
  readonly type: 'whitespace' | 'comment' | 'newline';
  readonly value: string;
  readonly location: SourceLocation;
}

export abstract class ASTNode {
  constructor(public readonly location: SourceLocation) {}

  abstract readonly type: string;
  abstract accept<T>(visitor: ASTVisitor<T>): T;
}

export interface ASTVisitor<T> {
  visitProgram(node: Program): T;
  visitVariableDeclaration(node: VariableDeclaration): T;
  visitFunctionDeclaration(node: FunctionDeclaration): T;
  visitIdentifier(node: Identifier): T;
  visitLiteral(node: Literal): T;
  // ... other visit methods
}

// Re-export existing types for compatibility
export * from '../types';

// Import necessary types from the existing codebase
import {
  TokenType,
  Program,
  VariableDeclaration,
  FunctionDeclaration,
  Identifier,
  Literal,
} from '../types';

// ===== PLACEHOLDER TYPES =====
// These will be properly defined as we implement the new architecture

export interface AnalyzedProgram {
  readonly ast: Program;
  // Placeholder for future rich type info structure
  readonly typeInformation: unknown;
}

export interface GenerationOptions {
  readonly minify?: boolean;
  readonly sourceMap?: boolean;
  readonly target?: string;
}

export interface ICompilerFactory {
  createLexer(): ILexicalAnalyzer;
  createParser(): ISyntaxAnalyzer;
  createAnalyzer(): ISemanticAnalyzer;
  createGenerator(): ICodeGenerator;
  createReporter(): IDiagnosticsReporter;
}

export interface ICompilerBuilder {
  withLexer(lexer: ILexicalAnalyzer): ICompilerBuilder;
  withParser(parser: ISyntaxAnalyzer): ICompilerBuilder;
  withAnalyzer(analyzer: ISemanticAnalyzer): ICompilerBuilder;
  withGenerator(generator: ICodeGenerator): ICompilerBuilder;
  withOptions(options: CompilationOptions): ICompilerBuilder;
  build(): ICompiler;
}

export interface ICompiler {
  compile(source: string, options?: CompilationOptions): Promise<CompileResult>;
  compileFile(filePath: string, options?: CompilationOptions): Promise<CompileResult>;
}

export class CompileResult {
  constructor(
    public readonly success: boolean,
    public readonly code?: string,
    public readonly sourceMap?: string,
    public readonly diagnostics: DiagnosticsSummary = new DiagnosticsSummary(0, 0, 0, [])
  ) {}

  static success(
    code: string,
    sourceMap?: string,
    diagnostics?: DiagnosticsSummary
  ): CompileResult {
    return new CompileResult(true, code, sourceMap, diagnostics);
  }

  static failure(diagnostics: DiagnosticsSummary): CompileResult {
    return new CompileResult(false, undefined, undefined, diagnostics);
  }
}

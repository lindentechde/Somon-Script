/**
 * Modular Lexer Implementation - Compatible Version
 *
 * This implementation works with the existing Token interface and provides
 * a clean, modular approach to lexical analysis using the Strategy Pattern.
 */

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-unused-vars */

import { TokenType, Token } from '../types';
import { KEYWORDS } from '../keyword-map';

// ===== INTERFACES =====

export interface ITokenRecognizer {
  readonly priority: number;
  canRecognize(input: string, position: number): boolean;
  recognize(
    input: string,
    position: number,
    line: number,
    column: number
  ): RecognitionResult | null;
}

export interface RecognitionResult {
  token: Token;
  consumed: number;
}

export interface ILexer {
  tokenize(source: string): LexerResult;
}

export interface LexerResult {
  tokens: Token[];
  errors: LexicalError[];
}

export class LexicalError extends Error {
  constructor(
    message: string,
    public readonly line: number,
    public readonly column: number,
    public readonly char: string
  ) {
    super(message);
    this.name = 'LexicalError';
  }
}

// ===== BASE RECOGNIZER =====

export abstract class BaseTokenRecognizer implements ITokenRecognizer {
  constructor(public readonly priority: number) {}

  abstract canRecognize(input: string, position: number): boolean;
  abstract recognize(
    input: string,
    position: number,
    line: number,
    column: number
  ): RecognitionResult | null;

  protected createToken(type: TokenType, value: string, line: number, column: number): Token {
    return { type, value, line, column };
  }

  protected peek(input: string, position: number, offset: number = 0): string {
    const pos = position + offset;
    return pos >= input.length ? '\0' : input[pos];
  }

  protected isAtEnd(input: string, position: number): boolean {
    return position >= input.length;
  }
}

// ===== RECOGNIZERS =====

export class KeywordRecognizer extends BaseTokenRecognizer {
  private readonly keywords = KEYWORDS;

  constructor() {
    super(10); // High priority
  }

  canRecognize(input: string, position: number): boolean {
    const char = this.peek(input, position);
    return /[\u0400-\u04FF]/.test(char);
  }

  recognize(
    input: string,
    position: number,
    line: number,
    column: number
  ): RecognitionResult | null {
    let current = position;
    let value = '';

    // Read Cyrillic identifier
    while (
      !this.isAtEnd(input, current) &&
      this.isCyrillicIdentifierChar(this.peek(input, current))
    ) {
      value += input[current];
      current++;
    }

    if (value.length === 0) {
      return null;
    }

    const tokenType = this.keywords.get(value) || TokenType.IDENTIFIER;

    return {
      token: this.createToken(tokenType, value, line, column),
      consumed: current - position,
    };
  }

  private isCyrillicIdentifierChar(char: string): boolean {
    return /[\u0400-\u04FF]/.test(char) || /[0-9_]/.test(char);
  }
}

export class IdentifierRecognizer extends BaseTokenRecognizer {
  constructor() {
    super(5); // Medium priority
  }

  canRecognize(input: string, position: number): boolean {
    const char = this.peek(input, position);
    return /[a-zA-Z_]/.test(char);
  }

  recognize(
    input: string,
    position: number,
    line: number,
    column: number
  ): RecognitionResult | null {
    let current = position;
    let value = '';

    // Read Latin identifier
    while (!this.isAtEnd(input, current) && this.isIdentifierChar(this.peek(input, current))) {
      value += input[current];
      current++;
    }

    if (value.length === 0) {
      return null;
    }

    return {
      token: this.createToken(TokenType.IDENTIFIER, value, line, column),
      consumed: current - position,
    };
  }

  private isIdentifierChar(char: string): boolean {
    return /[a-zA-Z0-9_]/.test(char);
  }
}

export class NumberRecognizer extends BaseTokenRecognizer {
  constructor() {
    super(8); // High priority
  }

  canRecognize(input: string, position: number): boolean {
    const char = this.peek(input, position);
    return /[0-9]/.test(char);
  }

  recognize(
    input: string,
    position: number,
    line: number,
    column: number
  ): RecognitionResult | null {
    let current = position;
    let value = '';

    // Read integer part
    while (!this.isAtEnd(input, current) && /[0-9]/.test(this.peek(input, current))) {
      value += input[current];
      current++;
    }

    // Check for decimal point
    if (this.peek(input, current) === '.' && /[0-9]/.test(this.peek(input, current, 1))) {
      value += input[current]; // add '.'
      current++;

      // Read decimal part
      while (!this.isAtEnd(input, current) && /[0-9]/.test(this.peek(input, current))) {
        value += input[current];
        current++;
      }
    }

    if (value.length === 0) {
      return null;
    }

    return {
      token: this.createToken(TokenType.NUMBER, value, line, column),
      consumed: current - position,
    };
  }
}

export class StringRecognizer extends BaseTokenRecognizer {
  constructor() {
    super(9); // High priority
  }

  canRecognize(input: string, position: number): boolean {
    const char = this.peek(input, position);
    return char === '"' || char === "'";
  }

  recognize(
    input: string,
    position: number,
    line: number,
    column: number
  ): RecognitionResult | null {
    let current = position;
    const quote = input[current];
    current++; // consume opening quote
    let value = '';

    while (!this.isAtEnd(input, current) && this.peek(input, current) !== quote) {
      if (this.peek(input, current) === '\\') {
        current++; // consume backslash
        const escaped = this.handleEscapeSequence(input, current);
        value += escaped.char;
        current += escaped.consumed;
      } else {
        value += input[current];
        current++;
      }
    }

    if (this.isAtEnd(input, current)) {
      return null; // Unterminated string
    }

    current++; // consume closing quote

    return {
      token: this.createToken(TokenType.STRING, value, line, column),
      consumed: current - position,
    };
  }

  private handleEscapeSequence(
    input: string,
    position: number
  ): { char: string; consumed: number } {
    if (this.isAtEnd(input, position)) {
      return { char: '\\', consumed: 0 };
    }

    const char = input[position];
    switch (char) {
      case 'n':
        return { char: '\n', consumed: 1 };
      case 't':
        return { char: '\t', consumed: 1 };
      case 'r':
        return { char: '\r', consumed: 1 };
      case '\\':
        return { char: '\\', consumed: 1 };
      case '"':
        return { char: '"', consumed: 1 };
      case "'":
        return { char: "'", consumed: 1 };
      case 'u': {
        // Unicode escape sequence \uXXXX
        let unicode = '';
        let consumed = 1; // for 'u'
        for (let i = 0; i < 4; i++) {
          if (
            !this.isAtEnd(input, position + consumed) &&
            /[0-9a-fA-F]/.test(input[position + consumed])
          ) {
            unicode += input[position + consumed];
            consumed++;
          } else {
            break;
          }
        }
        if (unicode.length === 4) {
          return { char: String.fromCodePoint(Number.parseInt(unicode, 16)), consumed };
        } else {
          return { char: char, consumed: 1 };
        }
      }
      default:
        return { char: char, consumed: 1 };
    }
  }
}

export class OperatorRecognizer extends BaseTokenRecognizer {
  private readonly operators = new Map<string, TokenType>([
    // Compound assignment operators (check longest first)
    ['**=', TokenType.EXPONENT_ASSIGN],
    ['+=', TokenType.PLUS_ASSIGN],
    ['-=', TokenType.MINUS_ASSIGN],
    ['*=', TokenType.MULTIPLY_ASSIGN],
    ['/=', TokenType.DIVIDE_ASSIGN],
    ['%=', TokenType.MODULO_ASSIGN],
    // Comparison operators
    ['===', TokenType.STRICT_EQUAL],
    ['!==', TokenType.STRICT_NOT_EQUAL],
    ['==', TokenType.EQUAL],
    ['!=', TokenType.NOT_EQUAL],
    ['<=', TokenType.LESS_EQUAL],
    ['>=', TokenType.GREATER_EQUAL],
    // Logical operators
    ['&&', TokenType.AND],
    ['||', TokenType.OR],
    // Increment/Decrement
    ['++', TokenType.INCREMENT],
    ['--', TokenType.DECREMENT],
    // Power operator
    ['**', TokenType.EXPONENT],
    // Arrow function
    ['=>', TokenType.ARROW],
    // Spread operator
    ['...', TokenType.SPREAD],
    // Single character operators
    ['+', TokenType.PLUS],
    ['-', TokenType.MINUS],
    ['*', TokenType.MULTIPLY],
    ['/', TokenType.DIVIDE],
    ['%', TokenType.MODULO],
    ['=', TokenType.ASSIGN],
    ['<', TokenType.LESS_THAN],
    ['>', TokenType.GREATER_THAN],
    ['!', TokenType.NOT],
    ['&', TokenType.BITWISE_AND],
    ['|', TokenType.BITWISE_OR],
    ['^', TokenType.BITWISE_XOR],
    ['~', TokenType.BITWISE_NOT],
    ['?', TokenType.QUESTION],
    [':', TokenType.COLON],
    [';', TokenType.SEMICOLON],
    [',', TokenType.COMMA],
    ['.', TokenType.DOT],
    ['(', TokenType.LEFT_PAREN],
    [')', TokenType.RIGHT_PAREN],
    ['{', TokenType.LEFT_BRACE],
    ['}', TokenType.RIGHT_BRACE],
    ['[', TokenType.LEFT_BRACKET],
    [']', TokenType.RIGHT_BRACKET],
  ]);

  private readonly sortedOperators: string[];

  constructor() {
    super(6); // Medium priority
    // Sort operators by length (longest first) for greedy matching
    this.sortedOperators = Array.from(this.operators.keys()).sort((a, b) => b.length - a.length);
  }

  canRecognize(input: string, position: number): boolean {
    const char = this.peek(input, position);
    // Check if any operator starts with this character
    return this.sortedOperators.some(op => op.startsWith(char));
  }

  recognize(
    input: string,
    position: number,
    line: number,
    column: number
  ): RecognitionResult | null {
    for (const operator of this.sortedOperators) {
      if (this.matchesAt(input, position, operator)) {
        return {
          token: this.createToken(this.operators.get(operator)!, operator, line, column),
          consumed: operator.length,
        };
      }
    }
    return null;
  }

  private matchesAt(input: string, position: number, operator: string): boolean {
    for (let i = 0; i < operator.length; i++) {
      if (this.isAtEnd(input, position + i) || input[position + i] !== operator[i]) {
        return false;
      }
    }
    return true;
  }
}

// ===== MODULAR LEXER =====

export class ModularLexer implements ILexer {
  private readonly recognizers: ITokenRecognizer[];

  constructor(recognizers?: ITokenRecognizer[]) {
    this.recognizers = recognizers || [
      new KeywordRecognizer(),
      new IdentifierRecognizer(),
      new NumberRecognizer(),
      new StringRecognizer(),
      new OperatorRecognizer(),
    ];

    // Sort by priority (highest first)
    this.recognizers.sort((a, b) => b.priority - a.priority);
  }

  tokenize(source: string): LexerResult {
    const tokens: Token[] = [];
    const errors: LexicalError[] = [];

    let position = 0;
    let line = 1;
    let column = 1;

    while (position < source.length) {
      // Skip whitespace
      if (this.isWhitespace(source[position])) {
        if (source[position] === '\n') {
          line++;
          column = 1;
        } else {
          column++;
        }
        position++;
        continue;
      }

      // Try to recognize a token
      const result = this.nextToken(source, position, line, column);

      if (result) {
        tokens.push(result.token);
        position += result.consumed;
        column += result.consumed;
      } else {
        // Unrecognized character
        const char = source[position];
        errors.push(new LexicalError(`Unexpected character: '${char}'`, line, column, char));
        position++;
        column++;
      }
    }

    // Add EOF token
    tokens.push({
      type: TokenType.EOF,
      value: '',
      line,
      column,
    });

    return { tokens, errors };
  }

  private nextToken(
    source: string,
    position: number,
    line: number,
    column: number
  ): RecognitionResult | null {
    for (const recognizer of this.recognizers) {
      if (recognizer.canRecognize(source, position)) {
        const result = recognizer.recognize(source, position, line, column);
        if (result) {
          return result;
        }
      }
    }
    return null;
  }

  private isWhitespace(char: string): boolean {
    return /\s/.test(char);
  }

  // Factory methods
  static withRecognizers(recognizers: ITokenRecognizer[]): ModularLexer {
    return new ModularLexer(recognizers);
  }

  static minimal(): ModularLexer {
    return new ModularLexer([
      new KeywordRecognizer(),
      new IdentifierRecognizer(),
      new NumberRecognizer(),
      new StringRecognizer(),
      new OperatorRecognizer(),
    ]);
  }
}

// ===== DEMO FUNCTION =====

export function demonstrateModularLexer(): void {
  console.log('🔤 Modular Lexer Architecture Demo');
  console.log('=====================================\n');

  const code = `
тағйирёбанда исм = "Ҷаҳон";
функсия салом(номи: сатр): сатр {
    бозгашт "Салом, " + номи + "!";
}

рақам натиҷа = 42;
мантиқӣ дуруст_аст = дуруст;
`;

  const lexer = new ModularLexer();
  const result = lexer.tokenize(code);

  console.log('📝 Source Code:');
  console.log(code);
  console.log('\n🎯 Tokens:');

  result.tokens.forEach((token, index) => {
    if (token.type !== TokenType.EOF) {
      console.log(
        `${index + 1}. ${token.type}: "${token.value}" at line ${token.line}, column ${token.column}`
      );
    }
  });

  if (result.errors.length > 0) {
    console.log('\n❌ Errors:');
    result.errors.forEach(error => {
      console.log(`- ${error.message} at line ${error.line}, column ${error.column}`);
    });
  }

  console.log('\n✅ Lexical analysis completed successfully!');
  console.log(`📊 Generated ${result.tokens.length} tokens with ${result.errors.length} errors.`);
}

// Run the demo if this file is executed directly
if (require.main === module) {
  demonstrateModularLexer();
}

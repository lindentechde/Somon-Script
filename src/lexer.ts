import { Token, TokenType } from './types';
import { KEYWORDS } from './keyword-map';

export class Lexer {
  private readonly input: string;
  private position: number = 0;
  private line: number = 1;
  private column: number = 1;

  private readonly keywords = KEYWORDS;

  constructor(input: string) {
    // Remove BOM if present
    this.input = input.codePointAt(0) === 0xfeff ? input.slice(1) : input;
  }

  tokenize(): Token[] {
    const tokens: Token[] = [];

    while (!this.isAtEnd()) {
      const token = this.nextToken();
      if (token.type !== TokenType.WHITESPACE) {
        tokens.push(token);
      }
    }

    tokens.push(this.createToken(TokenType.EOF, ''));
    return tokens;
  }

  private handlePlusOperator(): Token {
    if (this.peek() === '+') {
      this.advance();
      this.advance();
      return this.createToken(TokenType.INCREMENT, '++', this.line, this.column - 2);
    }
    if (this.peek() === '=') {
      this.advance();
      this.advance();
      return this.createToken(TokenType.PLUS_ASSIGN, '+=', this.line, this.column - 2);
    }
    return this.singleCharToken(TokenType.PLUS);
  }

  private handleMinusOperator(): Token {
    if (this.peek() === '-') {
      this.advance();
      this.advance();
      return this.createToken(TokenType.DECREMENT, '--', this.line, this.column - 2);
    }
    if (this.peek() === '=') {
      this.advance();
      this.advance();
      return this.createToken(TokenType.MINUS_ASSIGN, '-=', this.line, this.column - 2);
    }
    return this.singleCharToken(TokenType.MINUS);
  }

  private handleMultiplyOperator(): Token {
    if (this.peek() === '*') {
      this.advance();
      if (this.peek() === '=') {
        this.advance();
        this.advance();
        return this.createToken(TokenType.EXPONENT_ASSIGN, '**=', this.line, this.column - 3);
      }
      this.advance();
      return this.createToken(TokenType.EXPONENT, '**', this.line, this.column - 2);
    }
    if (this.peek() === '=') {
      this.advance();
      this.advance();
      return this.createToken(TokenType.MULTIPLY_ASSIGN, '*=', this.line, this.column - 2);
    }
    return this.singleCharToken(TokenType.MULTIPLY);
  }

  private handleDivideOperator(): Token {
    if (this.peek() === '=') {
      this.advance();
      this.advance();
      return this.createToken(TokenType.DIVIDE_ASSIGN, '/=', this.line, this.column - 2);
    }
    return this.singleCharToken(TokenType.DIVIDE);
  }

  private handleModuloOperator(): Token {
    if (this.peek() === '=') {
      this.advance();
      this.advance();
      return this.createToken(TokenType.MODULO_ASSIGN, '%=', this.line, this.column - 2);
    }
    return this.singleCharToken(TokenType.MODULO);
  }

  private handleDotOperator(): Token {
    if (this.peekNext() === '.' && this.peekNext(1) === '.') {
      this.advance();
      this.advance();
      this.advance();
      return this.createToken(TokenType.SPREAD, '...');
    }
    return this.singleCharToken(TokenType.DOT);
  }

  private handleEqualOperator(startLine: number, startColumn: number): Token {
    if (this.peek() === '=') {
      this.advance();
      if (this.peek() === '=') {
        this.advance();
        this.advance();
        return this.createToken(TokenType.STRICT_EQUAL, '===', startLine, startColumn);
      }
      this.advance();
      return this.createToken(TokenType.EQUAL, '==', startLine, startColumn);
    }
    if (this.peek() === '>') {
      this.advance();
      this.advance();
      return this.createToken(TokenType.ARROW, '=>', startLine, startColumn);
    }
    return this.singleCharToken(TokenType.ASSIGN);
  }

  private handleNotOperator(startLine: number, startColumn: number): Token {
    if (this.peek() === '=') {
      this.advance();
      if (this.peek() === '=') {
        this.advance();
        this.advance();
        return this.createToken(TokenType.STRICT_NOT_EQUAL, '!==', startLine, startColumn);
      }
      this.advance();
      return this.createToken(TokenType.NOT_EQUAL, '!=', startLine, startColumn);
    }
    return this.singleCharToken(TokenType.NOT);
  }

  private handleLessThanOperator(startLine: number, startColumn: number): Token {
    if (this.peek() === '<') {
      this.advance();
      if (this.peek() === '=') {
        this.advance();
        this.advance();
        return this.createToken(TokenType.LEFT_SHIFT_ASSIGN, '<<=', startLine, startColumn);
      }
      this.advance();
      return this.createToken(TokenType.LEFT_SHIFT, '<<', startLine, startColumn);
    }
    if (this.peek() === '=') {
      this.advance();
      this.advance();
      return this.createToken(TokenType.LESS_EQUAL, '<=', startLine, startColumn);
    }
    return this.singleCharToken(TokenType.LESS_THAN);
  }

  private handleGreaterThanOperator(startLine: number, startColumn: number): Token {
    if (this.peek() === '>') {
      this.advance();
      if (this.peek() === '>') {
        this.advance();
        if (this.peek() === '=') {
          this.advance();
          this.advance();
          return this.createToken(
            TokenType.UNSIGNED_RIGHT_SHIFT_ASSIGN,
            '>>>=',
            startLine,
            startColumn
          );
        }
        this.advance();
        return this.createToken(TokenType.UNSIGNED_RIGHT_SHIFT, '>>>', startLine, startColumn);
      }
      if (this.peek() === '=') {
        this.advance();
        this.advance();
        return this.createToken(TokenType.RIGHT_SHIFT_ASSIGN, '>>=', startLine, startColumn);
      }
      this.advance();
      return this.createToken(TokenType.RIGHT_SHIFT, '>>', startLine, startColumn);
    }
    if (this.peek() === '=') {
      this.advance();
      this.advance();
      return this.createToken(TokenType.GREATER_EQUAL, '>=', startLine, startColumn);
    }
    return this.singleCharToken(TokenType.GREATER_THAN);
  }

  private handleAmpersandOperator(startLine: number, startColumn: number): Token {
    if (this.peek() === '&') {
      this.advance();
      if (this.peek() === '=') {
        this.advance();
        this.advance();
        return this.createToken(TokenType.AND_ASSIGN, '&&=', startLine, startColumn);
      }
      this.advance();
      return this.createToken(TokenType.AND, '&&', startLine, startColumn);
    }
    if (this.peek() === '=') {
      this.advance();
      this.advance();
      return this.createToken(TokenType.BITWISE_AND_ASSIGN, '&=', startLine, startColumn);
    }
    this.advance();
    return this.createToken(TokenType.BITWISE_AND, '&', startLine, startColumn);
  }

  private handlePipeOperator(startLine: number, startColumn: number): Token {
    if (this.peek() === '|') {
      this.advance();
      if (this.peek() === '=') {
        this.advance();
        this.advance();
        return this.createToken(TokenType.OR_ASSIGN, '||=', startLine, startColumn);
      }
      this.advance();
      return this.createToken(TokenType.OR, '||', startLine, startColumn);
    }
    if (this.peek() === '=') {
      this.advance();
      this.advance();
      return this.createToken(TokenType.BITWISE_OR_ASSIGN, '|=', startLine, startColumn);
    }
    this.advance();
    return this.createToken(TokenType.BITWISE_OR, '|', startLine, startColumn);
  }

  private handleCaretOperator(startLine: number, startColumn: number): Token {
    if (this.peek() === '=') {
      this.advance();
      this.advance();
      return this.createToken(TokenType.BITWISE_XOR_ASSIGN, '^=', startLine, startColumn);
    }
    this.advance();
    return this.createToken(TokenType.BITWISE_XOR, '^', startLine, startColumn);
  }

  private handleQuestionOperator(startLine: number, startColumn: number): Token {
    if (this.peek() === '?') {
      this.advance();
      if (this.peek() === '=') {
        this.advance();
        this.advance();
        return this.createToken(TokenType.NULLISH_ASSIGN, '??=', startLine, startColumn);
      }
      this.advance();
      return this.createToken(TokenType.NULLISH_COALESCING, '??', startLine, startColumn);
    }
    if (this.peek() === '.') {
      this.advance();
      this.advance();
      return this.createToken(TokenType.OPTIONAL_CHAINING, '?.', startLine, startColumn);
    }
    this.advance();
    return this.createToken(TokenType.QUESTION, '?', startLine, startColumn);
  }

  private nextToken(): Token {
    this.skipWhitespace();

    if (this.isAtEnd()) {
      return this.createToken(TokenType.EOF, '');
    }

    const char = this.currentChar();
    const startLine = this.line;
    const startColumn = this.column;

    if (char === '/' && this.peek() === '/') {
      this.skipLineComment();
      return this.nextToken();
    }

    const switchResult = this.handleSwitchCharacters(char, startLine, startColumn);
    if (switchResult) return switchResult;

    const operatorResult = this.handleComparisonAndBitwiseOperators(char, startLine, startColumn);
    if (operatorResult) return operatorResult;

    return this.handleLiteralsAndIdentifiers(char, startLine, startColumn);
  }

  private handleSwitchCharacters(
    char: string,
    startLine: number,
    startColumn: number
  ): Token | null {
    switch (char) {
      case '+':
        return this.handlePlusOperator();
      case '-':
        return this.handleMinusOperator();
      case '*':
        return this.handleMultiplyOperator();
      case '/':
        return this.handleDivideOperator();
      case '%':
        return this.handleModuloOperator();
      case '(':
        return this.singleCharToken(TokenType.LEFT_PAREN);
      case ')':
        return this.singleCharToken(TokenType.RIGHT_PAREN);
      case '{':
        return this.singleCharToken(TokenType.LEFT_BRACE);
      case '}':
        return this.singleCharToken(TokenType.RIGHT_BRACE);
      case '[':
        return this.singleCharToken(TokenType.LEFT_BRACKET);
      case ']':
        return this.singleCharToken(TokenType.RIGHT_BRACKET);
      case ';':
        return this.singleCharToken(TokenType.SEMICOLON);
      case ',':
        return this.singleCharToken(TokenType.COMMA);
      case '.':
        return this.handleDotOperator();
      case ':':
        return this.singleCharToken(TokenType.COLON);
      case '\n':
        this.advance();
        this.line++;
        this.column = 1;
        return this.createToken(TokenType.NEWLINE, '\n', startLine, startColumn);
      default:
        return null;
    }
  }

  private handleComparisonAndBitwiseOperators(
    char: string,
    startLine: number,
    startColumn: number
  ): Token | null {
    switch (char) {
      case '=':
        return this.handleEqualOperator(startLine, startColumn);
      case '!':
        return this.handleNotOperator(startLine, startColumn);
      case '<':
        return this.handleLessThanOperator(startLine, startColumn);
      case '>':
        return this.handleGreaterThanOperator(startLine, startColumn);
      case '&':
        return this.handleAmpersandOperator(startLine, startColumn);
      case '|':
        return this.handlePipeOperator(startLine, startColumn);
      case '^':
        return this.handleCaretOperator(startLine, startColumn);
      case '?':
        return this.handleQuestionOperator(startLine, startColumn);
      case '~':
        this.advance();
        return this.createToken(TokenType.BITWISE_NOT, '~', startLine, startColumn);
      default:
        return null;
    }
  }

  private handleLiteralsAndIdentifiers(
    char: string,
    startLine: number,
    startColumn: number
  ): Token {
    if (char === '"' || char === "'") {
      return this.readString(char, startLine, startColumn);
    }

    if (char === '`') {
      return this.readTemplateLiteral(startLine, startColumn);
    }

    if (this.isDigit(char)) {
      return this.readNumber(startLine, startColumn);
    }

    if (this.isAlpha(char) || this.isCyrillic(char)) {
      return this.readIdentifier(startLine, startColumn);
    }

    throw new Error(`Unexpected character '${char}' at line ${this.line}, column ${this.column}`);
  }

  private singleCharToken(type: TokenType): Token {
    const char = this.currentChar();
    const line = this.line;
    const column = this.column;
    this.advance();
    return this.createToken(type, char, line, column);
  }

  private processStringEscapeSequence(): string {
    this.advance(); // Skip backslash
    if (this.isAtEnd()) {
      return '';
    }

    const escaped = this.currentChar();
    this.advance();

    switch (escaped) {
      case 'n':
        return '\n';
      case 't':
        return '\t';
      case 'r':
        return '\r';
      case '\\':
        return '\\';
      case '"':
        return '"';
      case "'":
        return "'";
      default:
        return escaped;
    }
  }

  private processStringCharacter(): string {
    const char = this.currentChar();
    this.advance();

    if (char === '\n') {
      this.line++;
      this.column = 1;
    }

    return char;
  }

  private readString(quote: string, startLine: number, startColumn: number): Token {
    let value = '';
    this.advance(); // Skip opening quote

    while (!this.isAtEnd() && this.currentChar() !== quote) {
      if (this.currentChar() === '\\') {
        value += this.processStringEscapeSequence();
      } else {
        value += this.processStringCharacter();
      }
    }

    if (this.isAtEnd()) {
      throw new Error(`Unterminated string at line ${startLine}, column ${startColumn}`);
    }

    this.advance(); // Skip closing quote
    return this.createToken(TokenType.STRING, value, startLine, startColumn);
  }

  private readTemplateLiteral(startLine: number, startColumn: number): Token {
    let value = '';
    this.advance(); // Skip opening backtick

    while (!this.isAtEnd() && this.currentChar() !== '`') {
      if (this.currentChar() === '\\') {
        value += this.handleEscapeSequence();
      } else if (this.currentChar() === '$' && this.peek() === '{') {
        value += this.handleInterpolation();
      } else {
        value += this.handleRegularCharacter();
      }
    }

    if (this.isAtEnd()) {
      throw new Error(`Unterminated template literal at line ${startLine}, column ${startColumn}`);
    }

    this.advance(); // Skip closing backtick
    return this.createToken(TokenType.TEMPLATE_LITERAL, value, startLine, startColumn);
  }

  private handleEscapeSequence(): string {
    this.advance(); // Skip backslash
    if (this.isAtEnd()) return '\\';

    const escaped = this.currentChar();
    this.advance();

    switch (escaped) {
      case 'n':
        return '\n';
      case 't':
        return '\t';
      case 'r':
        return '\r';
      case '\\':
        return '\\';
      case '`':
        return '`';
      case '$':
        return '$';
      default:
        return escaped;
    }
  }

  private handleInterpolation(): string {
    let result = '${';
    this.advance(); // Skip $
    this.advance(); // Skip {

    let braceCount = 1;
    while (!this.isAtEnd() && braceCount > 0) {
      if (this.currentChar() === '{') {
        braceCount++;
      } else if (this.currentChar() === '}') {
        braceCount--;
      }
      result += this.currentChar();
      this.advance();
    }

    return result;
  }

  private handleRegularCharacter(): string {
    return this.processStringCharacter();
  }

  private readNumber(startLine: number, startColumn: number): Token {
    let value = '';
    let hasDecimal = false;

    while (!this.isAtEnd() && this.isDigit(this.currentChar())) {
      value += this.currentChar();
      this.advance();
    }

    // Handle decimal numbers
    if (!this.isAtEnd() && this.currentChar() === '.' && this.isDigit(this.peek())) {
      hasDecimal = true;
      value += this.currentChar();
      this.advance();

      while (!this.isAtEnd() && this.isDigit(this.currentChar())) {
        value += this.currentChar();
        this.advance();
      }
    }

    // Check for invalid number patterns (multiple decimal points)
    if (!this.isAtEnd() && this.currentChar() === '.' && hasDecimal) {
      throw new Error(
        `Invalid number format at line ${startLine}, column ${startColumn}: multiple decimal points`
      );
    }

    return this.createToken(TokenType.NUMBER, value, startLine, startColumn);
  }

  private readIdentifier(startLine: number, startColumn: number): Token {
    let value = '';

    while (
      !this.isAtEnd() &&
      (this.isAlphaNumeric(this.currentChar()) || this.isCyrillic(this.currentChar()))
    ) {
      value += this.currentChar();
      this.advance();
    }

    const tokenType = this.keywords.get(value.toLowerCase()) || TokenType.IDENTIFIER;
    return this.createToken(tokenType, value, startLine, startColumn);
  }

  private skipWhitespace(): void {
    while (
      !this.isAtEnd() &&
      this.isWhitespace(this.currentChar()) &&
      this.currentChar() !== '\n'
    ) {
      this.advance();
    }
  }

  private skipLineComment(): void {
    // Skip the '//'
    this.advance();
    this.advance();

    // Skip until end of line
    while (!this.isAtEnd() && this.currentChar() !== '\n') {
      this.advance();
    }
  }

  private currentChar(): string {
    return this.input[this.position];
  }

  private peek(): string {
    if (this.position + 1 >= this.input.length) return '\0';
    return this.input[this.position + 1];
  }

  private advance(): void {
    if (!this.isAtEnd()) {
      this.position++;
      this.column++;
    }
  }

  private isAtEnd(): boolean {
    return this.position >= this.input.length;
  }

  private isDigit(char: string): boolean {
    return char >= '0' && char <= '9';
  }

  private isAlpha(char: string): boolean {
    return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') || char === '_';
  }

  private isAlphaNumeric(char: string): boolean {
    return this.isAlpha(char) || this.isDigit(char);
  }

  private isCyrillic(char: string): boolean {
    const code = char.codePointAt(0);
    if (code === undefined) return false;
    return (
      (code >= 0x0400 && code <= 0x04ff) || // Cyrillic
      (code >= 0x0500 && code <= 0x052f)
    ); // Cyrillic Supplement
  }

  private isWhitespace(char: string): boolean {
    return char === ' ' || char === '\t' || char === '\r';
  }

  private peekNext(offset: number = 0): string {
    const pos = this.position + 1 + offset;
    if (pos >= this.input.length) return '\0';
    return this.input[pos];
  }

  private createToken(type: TokenType, value: string, line?: number, column?: number): Token {
    return {
      type,
      value,
      line: line || this.line,
      column: column || this.column,
    };
  }
}

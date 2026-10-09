import { Token, TokenType } from './types';
import { KEYWORDS } from './keyword-map';

export class Lexer {
  private readonly input: string;
  private position: number = 0;
  private line: number = 1;
  private column: number = 1;

  private readonly keywords = KEYWORDS;

  private static readonly SIMPLE_ESCAPES: Readonly<Record<string, string>> = {
    n: '\n',
    t: '\t',
    r: '\r',
    b: '\b',
    f: '\f',
    v: '\v',
    '0': '\0',
  };

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
    // '?.5' is a conditional followed by a number, not optional chaining
    if (this.peek() === '.' && !this.isDigit(this.peekNext(1))) {
      this.advance();
      this.advance();
      return this.createToken(TokenType.OPTIONAL_CHAINING, '?.', startLine, startColumn);
    }
    this.advance();
    return this.createToken(TokenType.QUESTION, '?', startLine, startColumn);
  }

  private nextToken(): Token {
    this.skipWhitespaceAndComments();

    if (this.isAtEnd()) {
      return this.createToken(TokenType.EOF, '');
    }

    const char = this.currentChar();
    const startLine = this.line;
    const startColumn = this.column;

    if (char === '.' && this.isDigit(this.peek())) {
      return this.readNumber(startLine, startColumn);
    }

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
    }

    if (char === '=') return this.handleEqualOperator(startLine, startColumn);
    if (char === '!') return this.handleNotOperator(startLine, startColumn);
    if (char === '<') return this.handleLessThanOperator(startLine, startColumn);
    if (char === '>') return this.handleGreaterThanOperator(startLine, startColumn);
    if (char === '&') return this.handleAmpersandOperator(startLine, startColumn);
    if (char === '|') return this.handlePipeOperator(startLine, startColumn);
    if (char === '^') return this.handleCaretOperator(startLine, startColumn);
    if (char === '?') return this.handleQuestionOperator(startLine, startColumn);

    if (char === '~') {
      this.advance();
      return this.createToken(TokenType.BITWISE_NOT, '~', startLine, startColumn);
    }

    if (char === '"' || char === "'") {
      return this.readString(char, startLine, startColumn);
    }

    if (char === '`') {
      return this.readTemplateLiteral(startLine, startColumn);
    }

    if (this.isDigit(char)) {
      return this.readNumber(startLine, startColumn);
    }

    const codePoint = this.currentCodePoint();
    if (this.isIdentifierStart(codePoint)) {
      return this.readIdentifier(startLine, startColumn);
    }

    throw new Error(
      `Unexpected character '${codePoint}' at line ${this.line}, column ${this.column}`
    );
  }

  private singleCharToken(type: TokenType): Token {
    const char = this.currentChar();
    const line = this.line;
    const column = this.column;
    this.advance();
    return this.createToken(type, char, line, column);
  }

  private processStringEscapeSequence(): string {
    const escapeLine = this.line;
    const escapeColumn = this.column;
    this.advance(); // Skip backslash
    if (this.isAtEnd()) {
      return '';
    }

    const escaped = this.currentChar();
    this.advance();

    switch (escaped) {
      case 'x':
        return this.readHexEscape(2, escapeLine, escapeColumn);
      case 'u':
        return this.readUnicodeEscape(escapeLine, escapeColumn);
      case '\r':
        // Line continuation: a backslash before a line break contributes nothing
        if (this.currentChar() === '\n') this.advance();
        this.startNewLine();
        return '';
      case '\n':
        this.startNewLine();
        return '';
      default:
        // '\\', '\'' and '"' (like any other character) stand for themselves
        return Lexer.SIMPLE_ESCAPES[escaped] ?? escaped;
    }
  }

  private readHexEscape(length: number, line: number, column: number): string {
    const hex = this.input.slice(this.position, this.position + length);
    if (hex.length !== length || !/^[0-9a-fA-F]+$/.test(hex)) {
      throw this.invalidEscapeError(line, column);
    }
    for (let i = 0; i < length; i++) this.advance();
    return String.fromCodePoint(Number.parseInt(hex, 16));
  }

  private readUnicodeEscape(line: number, column: number): string {
    if (this.currentChar() !== '{') {
      return this.readHexEscape(4, line, column);
    }

    const close = this.input.indexOf('}', this.position);
    const hex = close === -1 ? '' : this.input.slice(this.position + 1, close);
    if (!/^[0-9a-fA-F]+$/.test(hex) || Number.parseInt(hex, 16) > 0x10ffff) {
      throw this.invalidEscapeError(line, column);
    }
    while (this.position <= close) this.advance();
    return String.fromCodePoint(Number.parseInt(hex, 16));
  }

  private invalidEscapeError(line: number, column: number): Error {
    return new Error(`Invalid escape sequence at line ${line}, column ${column}`);
  }

  private processStringCharacter(): string {
    const char = this.currentCodePoint();
    const isLineBreak = char === '\n' || this.isLoneCarriageReturn();
    this.advanceCodePoint();

    if (isLineBreak) {
      this.startNewLine();
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

  /**
   * Reads a template literal. The token value is the source text between the
   * backticks exactly as written (escapes and `${…}` included); the parser
   * splits it into quasis and expressions and decodes the escapes.
   */
  private readTemplateLiteral(startLine: number, startColumn: number): Token {
    const value = this.readTemplateBody();

    if (this.isAtEnd()) {
      throw new Error(`Unterminated template literal at line ${startLine}, column ${startColumn}`);
    }

    this.advance(); // Skip closing backtick
    return this.createToken(TokenType.TEMPLATE_LITERAL, value, startLine, startColumn);
  }

  /** Copies template text after the opening backtick up to (not including) the closing one. */
  private readTemplateBody(): string {
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
    return value;
  }

  /** Keeps an escape sequence as written; the parser decodes it. */
  private handleEscapeSequence(): string {
    this.advance(); // Skip backslash
    if (this.isAtEnd()) return '\\';
    return '\\' + this.processStringCharacter();
  }

  /**
   * Copies `${…}` as written. Braces inside string literals and nested
   * template literals do not count towards the closing '}'.
   */
  private handleInterpolation(): string {
    let result = '${';
    this.advance(); // Skip $
    this.advance(); // Skip {

    let braceCount = 1;
    while (!this.isAtEnd()) {
      const char = this.currentChar();
      if (char === '"' || char === "'") {
        result += this.copyQuotedString(char);
        continue;
      }
      if (char === '`') {
        result += '`' + this.readTemplateBody();
        if (!this.isAtEnd()) {
          result += '`';
          this.advance();
        }
        continue;
      }
      if (char === '{') {
        braceCount++;
      } else if (char === '}') {
        braceCount--;
        if (braceCount === 0) {
          this.advance();
          return result + '}';
        }
      }
      result += this.processStringCharacter();
    }

    return result;
  }

  /** Copies a quoted string inside an interpolation, escapes included. */
  private copyQuotedString(quote: string): string {
    let result = quote;
    this.advance(); // Skip opening quote
    while (!this.isAtEnd() && this.currentChar() !== quote) {
      if (this.currentChar() === '\\') {
        result += '\\';
        this.advance();
        if (this.isAtEnd()) break;
      }
      result += this.processStringCharacter();
    }
    if (!this.isAtEnd()) {
      result += quote;
      this.advance();
    }
    return result;
  }

  private handleRegularCharacter(): string {
    return this.processStringCharacter();
  }

  private readNumber(startLine: number, startColumn: number): Token {
    const prefix = this.currentChar() === '0' ? this.peek().toLowerCase() : '';
    const isPrefixed = prefix === 'x' || prefix === 'b' || prefix === 'o';
    let value = isPrefixed
      ? this.readPrefixedNumber(prefix, startLine, startColumn)
      : this.readDecimalNumber(startLine, startColumn);

    if (this.currentChar() === 'n') {
      if (!isPrefixed && /[.eE]/.test(value)) {
        throw this.numberError('BigInt suffix requires an integer', startLine, startColumn);
      }
      value += 'n';
      this.advance();
    }

    if (
      !this.isAtEnd() &&
      (this.isDigit(this.currentChar()) || this.isIdentifierStart(this.currentCodePoint()))
    ) {
      throw this.numberError('identifier directly after number', startLine, startColumn);
    }

    return this.createToken(TokenType.NUMBER, value, startLine, startColumn);
  }

  /** Reads '0x…', '0b…' or '0o…'. */
  private readPrefixedNumber(prefix: string, startLine: number, startColumn: number): string {
    const value = this.currentChar() + this.peek();
    this.advance();
    this.advance();
    const digitPattern = { x: /[0-9a-fA-F]/, b: /[01]/, o: /[0-7]/ }[prefix] as RegExp;
    const digits = this.readDigits(digitPattern, startLine, startColumn);
    if (digits === '') {
      throw this.numberError(`missing digits after 0${prefix} prefix`, startLine, startColumn);
    }
    return value + digits;
  }

  /** Reads '1', '1.5', '.5' and exponent forms such as '1.5e-3'. */
  private readDecimalNumber(startLine: number, startColumn: number): string {
    let value = this.readDigits(/\d/, startLine, startColumn);
    if (value.length > 1 && value.startsWith('0')) {
      throw this.numberError('leading zero is not allowed', startLine, startColumn);
    }

    // Handle decimal numbers; in '1.5.toFixed' the second '.' is member access
    if (this.currentChar() === '.' && this.isDigit(this.peek())) {
      this.advance();
      value += '.' + this.readDigits(/\d/, startLine, startColumn);
    }

    if (this.currentChar() === 'e' || this.currentChar() === 'E') {
      value += this.currentChar();
      this.advance();
      if (this.currentChar() === '+' || this.currentChar() === '-') {
        value += this.currentChar();
        this.advance();
      }
      const exponent = this.readDigits(/\d/, startLine, startColumn);
      if (exponent === '') {
        throw this.numberError('missing exponent digits', startLine, startColumn);
      }
      value += exponent;
    }

    return value;
  }

  /** Reads digits matching `digitPattern`, dropping '_' separators placed between digits. */
  private readDigits(digitPattern: RegExp, startLine: number, startColumn: number): string {
    let digits = '';
    while (!this.isAtEnd()) {
      const char = this.currentChar();
      if (digitPattern.test(char)) {
        digits += char;
      } else if (char === '_') {
        if (digits === '' || !digitPattern.test(this.peek())) {
          throw this.numberError('invalid numeric separator', startLine, startColumn);
        }
      } else {
        break;
      }
      this.advance();
    }
    return digits;
  }

  private numberError(reason: string, line: number, column: number): Error {
    return new Error(`Invalid number format at line ${line}, column ${column}: ${reason}`);
  }

  private readIdentifier(startLine: number, startColumn: number): Token {
    let value = '';

    while (!this.isAtEnd() && this.isIdentifierPart(this.currentCodePoint())) {
      value += this.currentCodePoint();
      this.advanceCodePoint();
    }

    const tokenType = this.keywords.get(value) || TokenType.IDENTIFIER;
    return this.createToken(tokenType, value, startLine, startColumn);
  }

  private skipWhitespace(): void {
    while (
      !this.isAtEnd() &&
      this.isWhitespace(this.currentChar()) &&
      this.currentChar() !== '\n'
    ) {
      const isLineBreak = this.isLoneCarriageReturn();
      this.advance();
      if (isLineBreak) {
        this.startNewLine();
      }
    }
  }

  private skipWhitespaceAndComments(): void {
    this.skipWhitespace();
    while (this.currentChar() === '/' && (this.peek() === '/' || this.peek() === '*')) {
      if (this.peek() === '/') {
        this.skipLineComment();
      } else {
        this.skipBlockComment();
      }
      this.skipWhitespace();
    }
  }

  private skipLineComment(): void {
    // Skip the '//'
    this.advance();
    this.advance();

    // Skip until end of line
    while (!this.isAtEnd() && this.currentChar() !== '\n' && this.currentChar() !== '\r') {
      this.advanceCodePoint();
    }
  }

  private skipBlockComment(): void {
    const startLine = this.line;
    const startColumn = this.column;

    // Skip the '/*'
    this.advance();
    this.advance();

    while (!this.isAtEnd()) {
      if (this.currentChar() === '*' && this.peek() === '/') {
        this.advance();
        this.advance();
        return;
      }
      const isLineBreak = this.currentChar() === '\n' || this.isLoneCarriageReturn();
      this.advanceCodePoint();
      if (isLineBreak) {
        this.startNewLine();
      }
    }

    throw new Error(`Unterminated block comment at line ${startLine}, column ${startColumn}`);
  }

  private startNewLine(): void {
    this.line++;
    this.column = 1;
  }

  /** A '\r' not followed by '\n' is a line break on its own (old Mac line endings). */
  private isLoneCarriageReturn(): boolean {
    return this.currentChar() === '\r' && this.peek() !== '\n';
  }

  private currentChar(): string {
    return this.input[this.position];
  }

  private peek(): string {
    if (this.position + 1 >= this.input.length) return '\0';
    return this.input[this.position + 1];
  }

  /** The full code point at the current position (both halves of a surrogate pair). */
  private currentCodePoint(): string {
    const code = this.input.codePointAt(this.position);
    return code === undefined ? '' : String.fromCodePoint(code);
  }

  /** Advances past one code point, counting it as a single column. */
  private advanceCodePoint(): void {
    const length = this.currentCodePoint().length;
    if (length === 0) return;
    this.position += length;
    this.column++;
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

  private isIdentifierStart(char: string): boolean {
    return /^[\p{ID_Start}$_]$/u.test(char);
  }

  private isIdentifierPart(char: string): boolean {
    return /^[\p{ID_Continue}$\u200C\u200D]$/u.test(char);
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

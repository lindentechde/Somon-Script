import { Token, TokenType } from './types';
import { KEYWORDS } from './keyword-map';

export class Lexer {
  private input: string;
  private position: number = 0;
  private line: number = 1;
  private column: number = 1;

  private readonly keywords = KEYWORDS;

  constructor(input: string) {
    // Remove BOM if present
    this.input = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
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

  // eslint-disable-next-line complexity
  private nextToken(): Token {
    this.skipWhitespace();

    if (this.isAtEnd()) {
      return this.createToken(TokenType.EOF, '');
    }

    const char = this.currentChar();
    const startLine = this.line;
    const startColumn = this.column;

    // Comments
    if (char === '/' && this.peek() === '/') {
      this.skipLineComment();
      return this.nextToken();
    }

    // Single character tokens and multi-character operators
    switch (char) {
      case '+':
        if (this.peek() === '+') {
          this.advance(); // consume first '+'
          this.advance(); // consume second '+'
          return this.createToken(TokenType.INCREMENT, '++', this.line, this.column - 2);
        } else if (this.peek() === '=') {
          this.advance(); // consume '+'
          this.advance(); // consume '='
          return this.createToken(TokenType.PLUS_ASSIGN, '+=', this.line, this.column - 2);
        }
        return this.singleCharToken(TokenType.PLUS);
      case '-':
        if (this.peek() === '-') {
          this.advance(); // consume first '-'
          this.advance(); // consume second '-'
          return this.createToken(TokenType.DECREMENT, '--', this.line, this.column - 2);
        } else if (this.peek() === '=') {
          this.advance(); // consume '-'
          this.advance(); // consume '='
          return this.createToken(TokenType.MINUS_ASSIGN, '-=', this.line, this.column - 2);
        }
        return this.singleCharToken(TokenType.MINUS);
      case '*':
        if (this.peek() === '*') {
          this.advance(); // consume first '*'
          if (this.peek() === '=') {
            this.advance(); // consume second '*'
            this.advance(); // consume '='
            return this.createToken(TokenType.EXPONENT_ASSIGN, '**=', this.line, this.column - 3);
          } else {
            this.advance(); // consume second '*'
            return this.createToken(TokenType.EXPONENT, '**', this.line, this.column - 2);
          }
        } else if (this.peek() === '=') {
          this.advance(); // consume '*'
          this.advance(); // consume '='
          return this.createToken(TokenType.MULTIPLY_ASSIGN, '*=', this.line, this.column - 2);
        }
        return this.singleCharToken(TokenType.MULTIPLY);
      case '/':
        if (this.peek() === '=') {
          this.advance(); // consume '/'
          this.advance(); // consume '='
          return this.createToken(TokenType.DIVIDE_ASSIGN, '/=', this.line, this.column - 2);
        }
        return this.singleCharToken(TokenType.DIVIDE);
      case '%':
        if (this.peek() === '=') {
          this.advance(); // consume '%'
          this.advance(); // consume '='
          return this.createToken(TokenType.MODULO_ASSIGN, '%=', this.line, this.column - 2);
        }
        return this.singleCharToken(TokenType.MODULO);
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
        if (this.peekNext() === '.' && this.peekNext(1) === '.') {
          this.advance(); // consume first '.'
          this.advance(); // consume second '.'
          this.advance(); // consume third '.'
          return this.createToken(TokenType.SPREAD, '...');
        }
        return this.singleCharToken(TokenType.DOT);
      case ':':
        return this.singleCharToken(TokenType.COLON);
      case '?':
        return this.singleCharToken(TokenType.QUESTION);
      case '\n':
        this.advance();
        this.line++;
        this.column = 1;
        return this.createToken(TokenType.NEWLINE, '\n', startLine, startColumn);
    }

    // Multi-character operators
    if (char === '=') {
      if (this.peek() === '=') {
        this.advance();
        if (this.peek() === '=') {
          this.advance();
          this.advance();
          return this.createToken(TokenType.STRICT_EQUAL, '===', startLine, startColumn);
        } else {
          this.advance();
          return this.createToken(TokenType.EQUAL, '==', startLine, startColumn);
        }
      } else if (this.peek() === '>') {
        this.advance();
        this.advance();
        return this.createToken(TokenType.ARROW, '=>', startLine, startColumn);
      }
      return this.singleCharToken(TokenType.ASSIGN);
    }

    if (char === '!') {
      if (this.peek() === '=') {
        this.advance();
        if (this.peek() === '=') {
          this.advance();
          this.advance();
          return this.createToken(TokenType.STRICT_NOT_EQUAL, '!==', startLine, startColumn);
        } else {
          this.advance();
          return this.createToken(TokenType.NOT_EQUAL, '!=', startLine, startColumn);
        }
      }
      return this.singleCharToken(TokenType.NOT);
    }

    if (char === '<') {
      if (this.peek() === '<') {
        this.advance();
        if (this.peek() === '=') {
          this.advance();
          this.advance();
          return this.createToken(TokenType.LEFT_SHIFT_ASSIGN, '<<=', startLine, startColumn);
        } else {
          this.advance();
          return this.createToken(TokenType.LEFT_SHIFT, '<<', startLine, startColumn);
        }
      } else if (this.peek() === '=') {
        this.advance();
        this.advance();
        return this.createToken(TokenType.LESS_EQUAL, '<=', startLine, startColumn);
      }
      return this.singleCharToken(TokenType.LESS_THAN);
    }

    if (char === '>') {
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
          } else {
            this.advance();
            return this.createToken(TokenType.UNSIGNED_RIGHT_SHIFT, '>>>', startLine, startColumn);
          }
        } else if (this.peek() === '=') {
          this.advance();
          this.advance();
          return this.createToken(TokenType.RIGHT_SHIFT_ASSIGN, '>>=', startLine, startColumn);
        } else {
          this.advance();
          return this.createToken(TokenType.RIGHT_SHIFT, '>>', startLine, startColumn);
        }
      } else if (this.peek() === '=') {
        this.advance();
        this.advance();
        return this.createToken(TokenType.GREATER_EQUAL, '>=', startLine, startColumn);
      }
      return this.singleCharToken(TokenType.GREATER_THAN);
    }

    if (char === '&') {
      if (this.peek() === '&') {
        this.advance();
        if (this.peek() === '=') {
          this.advance();
          this.advance();
          return this.createToken(TokenType.AND_ASSIGN, '&&=', startLine, startColumn);
        } else {
          this.advance();
          return this.createToken(TokenType.AND, '&&', startLine, startColumn);
        }
      } else if (this.peek() === '=') {
        this.advance();
        this.advance();
        return this.createToken(TokenType.BITWISE_AND_ASSIGN, '&=', startLine, startColumn);
      } else {
        this.advance();
        return this.createToken(TokenType.BITWISE_AND, '&', startLine, startColumn);
      }
    }

    if (char === '|') {
      if (this.peek() === '|') {
        this.advance();
        if (this.peek() === '=') {
          this.advance();
          this.advance();
          return this.createToken(TokenType.OR_ASSIGN, '||=', startLine, startColumn);
        } else {
          this.advance();
          return this.createToken(TokenType.OR, '||', startLine, startColumn);
        }
      } else if (this.peek() === '=') {
        this.advance();
        this.advance();
        return this.createToken(TokenType.BITWISE_OR_ASSIGN, '|=', startLine, startColumn);
      } else {
        this.advance();
        return this.createToken(TokenType.BITWISE_OR, '|', startLine, startColumn);
      }
    }

    if (char === '^') {
      if (this.peek() === '=') {
        this.advance();
        this.advance();
        return this.createToken(TokenType.BITWISE_XOR_ASSIGN, '^=', startLine, startColumn);
      } else {
        this.advance();
        return this.createToken(TokenType.BITWISE_XOR, '^', startLine, startColumn);
      }
    }

    if (char === '~') {
      this.advance();
      return this.createToken(TokenType.BITWISE_NOT, '~', startLine, startColumn);
    }

    if (char === '?') {
      if (this.peek() === '?') {
        this.advance();
        if (this.peek() === '=') {
          this.advance();
          this.advance();
          return this.createToken(TokenType.NULLISH_ASSIGN, '??=', startLine, startColumn);
        } else {
          this.advance();
          return this.createToken(TokenType.NULLISH_COALESCING, '??', startLine, startColumn);
        }
      } else if (this.peek() === '.') {
        this.advance();
        this.advance();
        return this.createToken(TokenType.OPTIONAL_CHAINING, '?.', startLine, startColumn);
      } else {
        this.advance();
        return this.createToken(TokenType.QUESTION, '?', startLine, startColumn);
      }
    }

    // String literals
    if (char === '"' || char === "'") {
      return this.readString(char, startLine, startColumn);
    }

    // Template literals
    if (char === '`') {
      return this.readTemplateLiteral(startLine, startColumn);
    }

    // Number literals
    if (this.isDigit(char)) {
      return this.readNumber(startLine, startColumn);
    }

    // Identifiers and keywords (Cyrillic support)
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

  private readString(quote: string, startLine: number, startColumn: number): Token {
    let value = '';
    this.advance(); // Skip opening quote

    while (!this.isAtEnd() && this.currentChar() !== quote) {
      if (this.currentChar() === '\\') {
        this.advance();
        if (!this.isAtEnd()) {
          const escaped = this.currentChar();
          switch (escaped) {
            case 'n':
              value += '\n';
              break;
            case 't':
              value += '\t';
              break;
            case 'r':
              value += '\r';
              break;
            case '\\':
              value += '\\';
              break;
            case '"':
              value += '"';
              break;
            case "'":
              value += "'";
              break;
            default:
              value += escaped;
              break;
          }
          this.advance();
        }
      } else {
        if (this.currentChar() === '\n') {
          value += this.currentChar();
          this.advance();
          this.line++;
          this.column = 1;
        } else {
          value += this.currentChar();
          this.advance();
        }
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
    const char = this.currentChar();
    if (char === '\n') {
      this.advance();
      this.line++;
      this.column = 1;
      return char;
    } else {
      this.advance();
      return char;
    }
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
    const code = char.charCodeAt(0);
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

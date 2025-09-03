import { Lexer } from '../src/lexer';
import { TokenType } from '../src/types';

describe('Lexer', () => {
  test('should tokenize simple variable declaration', () => {
    const source = 'тағйирёбанда ном = "Аҳмад";';
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    expect(tokens).toHaveLength(6); // тағйирёбанда, ном, =, "Аҳмад", ;, EOF
    expect(tokens[0].type).toBe(TokenType.ТАҒЙИРЁБАНДА);
    expect(tokens[1].type).toBe(TokenType.IDENTIFIER);
    expect(tokens[1].value).toBe('ном');
    expect(tokens[2].type).toBe(TokenType.ASSIGN);
    expect(tokens[3].type).toBe(TokenType.STRING);
    expect(tokens[3].value).toBe('Аҳмад');
    expect(tokens[4].type).toBe(TokenType.SEMICOLON);
  });

  test('should tokenize numbers', () => {
    const source = '42 3.14';
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    expect(tokens[0].type).toBe(TokenType.NUMBER);
    expect(tokens[0].value).toBe('42');
    expect(tokens[1].type).toBe(TokenType.NUMBER);
    expect(tokens[1].value).toBe('3.14');
  });

  test('should tokenize boolean literals', () => {
    const source = 'дуруст нодуруст';
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    expect(tokens[0].type).toBe(TokenType.ДУРУСТ);
    expect(tokens[1].type).toBe(TokenType.НОДУРУСТ);
  });

  test('should tokenize function declaration', () => {
    const source = 'функсия салом() {}';
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    expect(tokens[0].type).toBe(TokenType.ФУНКСИЯ);
    expect(tokens[1].type).toBe(TokenType.IDENTIFIER);
    expect(tokens[1].value).toBe('салом');
    expect(tokens[2].type).toBe(TokenType.LEFT_PAREN);
    expect(tokens[3].type).toBe(TokenType.RIGHT_PAREN);
    expect(tokens[4].type).toBe(TokenType.LEFT_BRACE);
    expect(tokens[5].type).toBe(TokenType.RIGHT_BRACE);
  });

  test('should tokenize operators', () => {
    const source = '+ - * / == != < > <= >=';
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const expectedTypes = [
      TokenType.PLUS,
      TokenType.MINUS,
      TokenType.MULTIPLY,
      TokenType.DIVIDE,
      TokenType.EQUAL,
      TokenType.NOT_EQUAL,
      TokenType.LESS_THAN,
      TokenType.GREATER_THAN,
      TokenType.LESS_EQUAL,
      TokenType.GREATER_EQUAL
    ];

    expectedTypes.forEach((expectedType, index) => {
      expect(tokens[index].type).toBe(expectedType);
    });
  });

  test('should handle line and column numbers', () => {
    const source = 'тағйирёбанда\nном';
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    expect(tokens[0].line).toBe(1);
    expect(tokens[0].column).toBe(1);
    expect(tokens[1].line).toBe(1); // newline token
    expect(tokens[2].line).toBe(2);
    expect(tokens[2].column).toBe(1);
  });
});
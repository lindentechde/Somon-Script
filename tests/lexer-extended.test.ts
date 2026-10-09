import { Lexer } from '../src/lexer';
import { TokenType } from '../src/types';

function tokenize(source: string) {
  const lexer = new Lexer(source);
  return lexer.tokenize();
}

describe('Lexer Extended Coverage Tests', () => {
  describe('BOM handling', () => {
    test('should handle BOM at start of file', () => {
      const sourceWithBOM = '\uFEFFтағйирёбанда ном = "тест";';
      const tokens = tokenize(sourceWithBOM);

      expect(tokens[0].type).toBe(TokenType.ТАҒЙИРЁБАНДА);
      expect(tokens[1].value).toBe('ном');
    });

    test('should handle file without BOM', () => {
      const sourceWithoutBOM = 'тағйирёбанда ном = "тест";';
      const tokens = tokenize(sourceWithoutBOM);

      expect(tokens[0].type).toBe(TokenType.ТАҒЙИРЁБАНДА);
      expect(tokens[1].value).toBe('ном');
    });
  });

  describe('Comment handling edge cases', () => {
    test('should handle line comment at end of file without newline', () => {
      const source = 'тағйирёбанда х = 5; // коммент';
      const tokens = tokenize(source);

      expect(tokens.length).toBeGreaterThanOrEqual(6); // тағйирёбанда, х, =, 5, ;, EOF (and maybe extras)
      expect(tokens[tokens.length - 1].type).toBe(TokenType.EOF);
    });

    test('should handle multiple line comments', () => {
      const source = `// коммент 1
тағйирёбанда х = 5; // коммент 2
// коммент 3`;
      const tokens = tokenize(source);

      // Should only have the variable declaration tokens
      const nonEofTokens = tokens.filter(
        t => t.type !== TokenType.EOF && t.type !== TokenType.NEWLINE
      );
      expect(nonEofTokens).toHaveLength(5); // тағйирёбанда, х, =, 5, ;
    });

    test('should handle empty line comment', () => {
      const source = 'тағйирёбанда х = 5; //\nфунксия тест() {}';
      const tokens = tokenize(source);

      const keywordTokens = tokens.filter(
        t => t.type === TokenType.ТАҒЙИРЁБАНДА || t.type === TokenType.ФУНКСИЯ
      );
      expect(keywordTokens).toHaveLength(2);
    });
  });

  describe('String literal edge cases', () => {
    test('should handle empty string', () => {
      const source = 'тағйирёбанда х = "";';
      const tokens = tokenize(source);

      const stringToken = tokens.find(t => t.type === TokenType.STRING);
      expect(stringToken?.value).toBe('');
    });

    test('should handle string with escape sequences', () => {
      const source = 'тағйирёбанда х = "сатр\\nнав сатр\\t\\r\\"";';
      const tokens = tokenize(source);

      const stringToken = tokens.find(t => t.type === TokenType.STRING);
      expect(stringToken?.value).toBe('сатр\nнав сатр\t\r"');
    });

    test('should handle string with Unicode characters', () => {
      const source = 'тағйирёбанда х = "тест ☀ 🌙 ⭐";';
      const tokens = tokenize(source);

      const stringToken = tokens.find(t => t.type === TokenType.STRING);
      expect(stringToken?.value).toBe('тест ☀ 🌙 ⭐');
    });

    test('should handle unterminated string', () => {
      const source = 'тағйирёбанда х = "unterminated';

      expect(() => tokenize(source)).toThrow();
    });

    test('should handle string with only quotes', () => {
      const source = 'тағйирёбанда х = "\\"\\"\\"";';
      const tokens = tokenize(source);

      const stringToken = tokens.find(t => t.type === TokenType.STRING);
      expect(stringToken?.value).toBe('"""');
    });
  });

  describe('Number literal edge cases', () => {
    test('should handle integer zero', () => {
      const source = '0';
      const tokens = tokenize(source);

      expect(tokens[0].type).toBe(TokenType.NUMBER);
      expect(tokens[0].value).toBe('0');
    });

    test('should handle decimal with leading zero', () => {
      const source = '0.123';
      const tokens = tokenize(source);

      expect(tokens[0].type).toBe(TokenType.NUMBER);
      expect(tokens[0].value).toBe('0.123');
    });

    test('should handle large numbers', () => {
      const source = '123456789.987654321';
      const tokens = tokenize(source);

      expect(tokens[0].type).toBe(TokenType.NUMBER);
      expect(tokens[0].value).toBe('123456789.987654321');
    });

    test('should handle scientific notation if supported', () => {
      const source = '1e10 2.5e-3';
      const tokens = tokenize(source);

      // This might tokenize as separate tokens depending on implementation
      expect(tokens[0].type).toBe(TokenType.NUMBER);
    });

    test('should handle decimal without leading digit', () => {
      const source = '.123';
      const tokens = tokenize(source);

      expect(tokens[0].type).toBe(TokenType.NUMBER);
      expect(tokens[0].value).toBe('.123');
    });

    test('should handle multiple decimal points as separate tokens', () => {
      // As in JavaScript, '1.2.3' is the number 1.2 followed by the number .3;
      // the parser rejects the sequence
      const tokens = tokenize('1.2.3');

      expect(tokens.slice(0, 2).map(t => [t.type, t.value])).toEqual([
        [TokenType.NUMBER, '1.2'],
        [TokenType.NUMBER, '.3'],
      ]);
    });
  });

  describe('Operator combinations', () => {
    test('should handle increment and decrement operators', () => {
      const source = '++ -- += -= *= /= %= **= <<= >>= &= |= ^=';
      const tokens = tokenize(source);

      const expectedTypes = [
        TokenType.INCREMENT,
        TokenType.DECREMENT,
        TokenType.PLUS_ASSIGN,
        TokenType.MINUS_ASSIGN,
        TokenType.MULTIPLY_ASSIGN,
        TokenType.DIVIDE_ASSIGN,
        TokenType.MODULO_ASSIGN,
        TokenType.EXPONENT_ASSIGN,
        TokenType.LEFT_SHIFT_ASSIGN,
        TokenType.RIGHT_SHIFT_ASSIGN,
        TokenType.BITWISE_AND_ASSIGN,
        TokenType.BITWISE_OR_ASSIGN,
        TokenType.BITWISE_XOR_ASSIGN,
      ];

      expectedTypes.forEach((expectedType, index) => {
        expect(tokens[index].type).toBe(expectedType);
      });
    });

    test('should handle bitwise operators', () => {
      const source = '& | ^ ~ << >> >>> &= |= ^= <<= >>= >>>=';
      const tokens = tokenize(source);

      const bitwiseTokens = tokens.filter(t => t.type !== TokenType.EOF);
      expect(bitwiseTokens.length).toBeGreaterThan(0);

      // Check for bitwise AND
      expect(bitwiseTokens.some(t => t.type === TokenType.BITWISE_AND)).toBe(true);
      // Check for bitwise OR
      expect(bitwiseTokens.some(t => t.type === TokenType.BITWISE_OR)).toBe(true);
    });

    test('should handle exponentiation operator', () => {
      const source = '2 ** 3 **= 4';
      const tokens = tokenize(source);

      expect(tokens[1].type).toBe(TokenType.EXPONENT);
      expect(tokens[3].type).toBe(TokenType.EXPONENT_ASSIGN);
    });

    test('should handle ternary operator components', () => {
      const source = 'а ? б : в';
      const tokens = tokenize(source);

      expect(tokens[1].type).toBe(TokenType.QUESTION);
      expect(tokens[3].type).toBe(TokenType.COLON);
    });

    test('should handle null coalescing if supported', () => {
      const source = 'а ?? б';
      const tokens = tokenize(source);

      // Should be tokenized as a single NULLISH_COALESCING token
      const nullishTokens = tokens.filter(t => t.type === TokenType.NULLISH_COALESCING);
      expect(nullishTokens.length).toBe(1);
      expect(nullishTokens[0].value).toBe('??');
    });
  });

  describe('Identifier edge cases', () => {
    test('should handle identifiers with numbers', () => {
      const source = 'переменная1 функция2тест переменная_123';
      const tokens = tokenize(source);

      expect(tokens[0].type).toBe(TokenType.IDENTIFIER);
      expect(tokens[0].value).toBe('переменная1');
      expect(tokens[1].type).toBe(TokenType.IDENTIFIER);
      expect(tokens[1].value).toBe('функция2тест');
      expect(tokens[2].type).toBe(TokenType.IDENTIFIER);
      expect(tokens[2].value).toBe('переменная_123');
    });

    test('should handle identifiers with underscores', () => {
      const source = '_приватная __внутренняя _';
      const tokens = tokenize(source);

      expect(tokens[0].type).toBe(TokenType.IDENTIFIER);
      expect(tokens[0].value).toBe('_приватная');
      expect(tokens[1].type).toBe(TokenType.IDENTIFIER);
      expect(tokens[1].value).toBe('__внутренняя');
      expect(tokens[2].type).toBe(TokenType.IDENTIFIER);
      expect(tokens[2].value).toBe('_');
    });

    test('should handle very long identifiers', () => {
      const source =
        'очень_длинное_имя_переменной_которое_содержит_много_символов_и_может_вызвать_проблемы';
      const tokens = tokenize(source);

      expect(tokens[0].type).toBe(TokenType.IDENTIFIER);
      expect(tokens[0].value).toBe(source);
    });
  });

  describe('Whitespace and newline handling', () => {
    test('should handle mixed whitespace', () => {
      const source = 'тағйирёбанда\t  \r\n  ном = 5;';
      const tokens = tokenize(source);

      const nonWhitespaceTokens = tokens.filter(
        t => t.type !== TokenType.WHITESPACE && t.type !== TokenType.NEWLINE
      );
      expect(nonWhitespaceTokens).toHaveLength(6); // тағйирёбанда, ном, =, 5, ;, EOF
    });

    test('should handle Windows line endings', () => {
      const source = 'тағйирёбанда х = 5;\r\nфунксия тест() {}';
      const tokens = tokenize(source);

      const keywordTokens = tokens.filter(
        t => t.type === TokenType.ТАҒЙИРЁБАНДА || t.type === TokenType.ФУНКСИЯ
      );
      expect(keywordTokens).toHaveLength(2);
    });

    test('should handle Mac line endings', () => {
      const source = 'тағйирёбанда х = 5;\rфунксия тест() {}';
      const tokens = tokenize(source);

      const keywordTokens = tokens.filter(
        t => t.type === TokenType.ТАҒЙИРЁБАНДА || t.type === TokenType.ФУНКСИЯ
      );
      expect(keywordTokens).toHaveLength(2);
    });

    test('should handle empty lines', () => {
      const source = 'тағйирёбанда х = 5;\n\n\nфунксия тест() {}';
      const tokens = tokenize(source);

      const keywordTokens = tokens.filter(
        t => t.type === TokenType.ТАҒЙИРЁБАНДА || t.type === TokenType.ФУНКСИЯ
      );
      expect(keywordTokens).toHaveLength(2);
    });
  });

  describe('Position tracking', () => {
    test('should track line and column correctly with tabs', () => {
      const source = 'тағйирёбанда\tном\n\tзначение';
      const tokens = tokenize(source);

      expect(tokens[0].line).toBe(1);
      expect(tokens[0].column).toBe(1);

      // Find the identifier on the second line
      const secondLineToken = tokens.find(t => t.line === 2 && t.type === TokenType.IDENTIFIER);
      expect(secondLineToken?.value).toBe('значение');
    });

    test('should handle position tracking with Unicode characters', () => {
      const source = 'тағйирёбанда ном = "тест🌟";';
      const tokens = tokenize(source);

      // Should still track positions correctly despite Unicode
      expect(tokens[0].line).toBe(1);
      expect(tokens[0].column).toBe(1);

      // Check that the emoji is preserved in the string
      const stringToken = tokens.find(t => t.type === TokenType.STRING);
      expect(stringToken?.value).toContain('🌟');
    });
  });

  describe('Keyword variants', () => {
    test('should recognize alternative keyword spellings', () => {
      const source = 'функсия функция'; // Only test the known spelling
      const tokens = tokenize(source);

      expect(tokens[0].type).toBe(TokenType.ФУНКСИЯ);
      expect(tokens[1].type).toBe(TokenType.ФУНКСИЯ);
    });

    test('should handle all boolean literals', () => {
      const source = 'дуруст нодуруст холӣ беқимат';
      const tokens = tokenize(source);

      expect(tokens[0].type).toBe(TokenType.ДУРУСТ);
      expect(tokens[1].type).toBe(TokenType.НОДУРУСТ);
      expect(tokens[2].type).toBe(TokenType.ХОЛӢ);
      expect(tokens[3].type).toBe(TokenType.БЕҚИМАТ);
    });

    test('should handle all type keywords', () => {
      const source = 'сатр рақам мантиқӣ';
      const tokens = tokenize(source);

      expect(tokens[0].type).toBe(TokenType.САТР);
      expect(tokens[1].type).toBe(TokenType.РАҚАМ);
      expect(tokens[2].type).toBe(TokenType.МАНТИҚӢ);
    });
  });

  describe('Complex operator sequences', () => {
    test('should handle complex assignment operators', () => {
      const source = 'а += б -= в *= г /= д %= е **= ж';
      const tokens = tokenize(source);

      const assignmentTokens = tokens.filter(
        t =>
          t.type === TokenType.PLUS_ASSIGN ||
          t.type === TokenType.MINUS_ASSIGN ||
          t.type === TokenType.MULTIPLY_ASSIGN ||
          t.type === TokenType.DIVIDE_ASSIGN ||
          t.type === TokenType.MODULO_ASSIGN ||
          t.type === TokenType.EXPONENT_ASSIGN
      );
      expect(assignmentTokens).toHaveLength(6);
    });

    test('should handle operator precedence tokens', () => {
      const source = '(а + б) * (в - г) / (д % е)';
      const tokens = tokenize(source);

      const parenTokens = tokens.filter(
        t => t.type === TokenType.LEFT_PAREN || t.type === TokenType.RIGHT_PAREN
      );
      expect(parenTokens).toHaveLength(6);
    });
  });

  describe('Method and property access', () => {
    test('should handle object property access', () => {
      const source = 'объект.свойство[индекс].метод()';
      const tokens = tokenize(source);

      const dotTokens = tokens.filter(t => t.type === TokenType.DOT);
      expect(dotTokens).toHaveLength(2);

      const bracketTokens = tokens.filter(
        t => t.type === TokenType.LEFT_BRACKET || t.type === TokenType.RIGHT_BRACKET
      );
      expect(bracketTokens).toHaveLength(2);
    });

    test('should handle method chaining', () => {
      const source = 'объект.метод1().метод2().метод3()';
      const tokens = tokenize(source);

      const dotTokens = tokens.filter(t => t.type === TokenType.DOT);
      expect(dotTokens).toHaveLength(3);
    });
  });

  describe('Array and object literals', () => {
    test('should handle complex array literals', () => {
      const source = '[1, "строка", дуруст, [вложенный, массив], {объект: значение}]';
      const tokens = tokenize(source);

      const bracketTokens = tokens.filter(
        t => t.type === TokenType.LEFT_BRACKET || t.type === TokenType.RIGHT_BRACKET
      );
      expect(bracketTokens).toHaveLength(4);

      const braceTokens = tokens.filter(
        t => t.type === TokenType.LEFT_BRACE || t.type === TokenType.RIGHT_BRACE
      );
      expect(braceTokens).toHaveLength(2);
    });

    test('should handle object destructuring syntax', () => {
      const source = 'тағйирёбанда {а, б: в} = объект;';
      const tokens = tokenize(source);

      const braceTokens = tokens.filter(
        t => t.type === TokenType.LEFT_BRACE || t.type === TokenType.RIGHT_BRACE
      );
      expect(braceTokens).toHaveLength(2);
    });
  });

  describe('Invalid character handling', () => {
    test('should handle unexpected characters gracefully', () => {
      const source = 'тағйирёбанда § ном = #значение;';

      expect(() => tokenize(source)).toThrow();
    });

    test('should handle control characters', () => {
      const source = 'тағйирёбанда\u0001ном = значение;';

      expect(() => tokenize(source)).toThrow();
    });
  });

  describe('End of file handling', () => {
    test('should handle empty file', () => {
      const source = '';
      const tokens = tokenize(source);

      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.EOF);
    });

    test('should handle file with only whitespace', () => {
      const source = '   \t\n\r\n  ';
      const tokens = tokenize(source);

      expect(tokens[tokens.length - 1].type).toBe(TokenType.EOF);
    });

    test('should handle file with only comments', () => {
      const source = '// только комментарий\n// еще один комментарий';
      const tokens = tokenize(source);

      expect(tokens[tokens.length - 1].type).toBe(TokenType.EOF);
    });
  });

  describe('String method tokens', () => {
    test('should tokenize string method identifiers', () => {
      const source = 'сатрМетодҳо дарозииСатр пайвастан ҷойивазкунӣ ҷудокунӣ';
      const tokens = tokenize(source);

      expect(tokens[0].type).toBe(TokenType.САТРМЕТОДҲО);
      expect(tokens[1].type).toBe(TokenType.ДАРОЗИИСАТР);
      expect(tokens[2].type).toBe(TokenType.ПАЙВАСТАН);
      expect(tokens[3].type).toBe(TokenType.ҶОЙИВАЗКУНӢ);
      expect(tokens[4].type).toBe(TokenType.ҶУДОКУНӢ);
    });

    test('should tokenize array method identifiers', () => {
      const source = 'рӯйхат илова баровардан дарозӣ харита филтр кофтан';
      const tokens = tokenize(source);

      expect(tokens[0].type).toBe(TokenType.РӮЙХАТ);
      expect(tokens[1].type).toBe(TokenType.ИЛОВА);
      expect(tokens[2].type).toBe(TokenType.БАРОВАРДАН);
      expect(tokens[3].type).toBe(TokenType.ДАРОЗӢ);
      expect(tokens[4].type).toBe(TokenType.ХАРИТА);
      expect(tokens[5].type).toBe(TokenType.ФИЛТР);
      expect(tokens[6].type).toBe(TokenType.КОФТАН);
    });

    test('should tokenize object method identifiers', () => {
      const source = 'объект калидҳо қиматҳо';
      const tokens = tokenize(source);

      expect(tokens[0].type).toBe(TokenType.ОБЪЕКТ); // 'объект' is a type keyword
      expect(tokens[1].type).toBe(TokenType.КАЛИДҲО);
      expect(tokens[2].type).toBe(TokenType.ҚИМАТҲО);
    });
  });

  describe('Advanced type system tokens', () => {
    test('should tokenize advanced type keywords', () => {
      const source = 'танҳохонӣ беназир калидҳои инфер номфазо';
      const tokens = tokenize(source);

      expect(tokens[0].type).toBe(TokenType.ТАНҲОХОНӢ);
      expect(tokens[1].type).toBe(TokenType.БЕНАЗИР);
      expect(tokens[2].type).toBe(TokenType.КАЛИДҲОИ);
      expect(tokens[3].type).toBe(TokenType.ИНФЕР);
      expect(tokens[4].type).toBe(TokenType.НОМФАЗО);
    });

    test('should tokenize class-related keywords', () => {
      const source =
        'синф мерос татбиқ супер конструктор хосусӣ муҳофизатшуда ҷамъиятӣ статикӣ мавҳум';
      const tokens = tokenize(source);

      expect(tokens[0].type).toBe(TokenType.СИНФ);
      expect(tokens[1].type).toBe(TokenType.МЕРОС);
      expect(tokens[2].type).toBe(TokenType.ТАТБИҚ);
      expect(tokens[3].type).toBe(TokenType.СУПЕР);
      expect(tokens[4].type).toBe(TokenType.КОНСТРУКТОР);
      expect(tokens[5].type).toBe(TokenType.ХОСУСӢ);
      expect(tokens[6].type).toBe(TokenType.МУҲОФИЗАТШУДА);
      expect(tokens[7].type).toBe(TokenType.ҶАМЪИЯТӢ);
      expect(tokens[8].type).toBe(TokenType.СТАТИКӢ);
      expect(tokens[9].type).toBe(TokenType.МАВҲУМ);
    });

    test('should tokenize async keywords', () => {
      const source = 'ҳамзамон интизор ваъда';
      const tokens = tokenize(source);

      expect(tokens[0].type).toBe(TokenType.ҲАМЗАМОН);
      expect(tokens[1].type).toBe(TokenType.ИНТИЗОР);
      expect(tokens[2].type).toBe(TokenType.ВАЪДА);
    });
  });

  describe('Complex scenarios', () => {
    test('should handle complex expressions with mixed operators', () => {
      const source = '(а += б++) !== в && г || д ? е : ж ** з';
      const tokens = tokenize(source);

      // Should tokenize all operators correctly
      const operatorTokens = tokens.filter(t =>
        [
          TokenType.PLUS_ASSIGN,
          TokenType.INCREMENT,
          TokenType.NOT_EQUAL,
          TokenType.AND,
          TokenType.OR,
          TokenType.QUESTION,
          TokenType.COLON,
          TokenType.EXPONENT,
        ].includes(t.type)
      );
      expect(operatorTokens.length).toBeGreaterThanOrEqual(7);
    });

    test('should handle template literal-like constructs', () => {
      // Template literals are now supported
      const source = '`template ${variable} literal`';
      const tokens = tokenize(source);

      expect(tokens).toHaveLength(2); // TEMPLATE_LITERAL + EOF
      expect(tokens[0].type).toBe(TokenType.TEMPLATE_LITERAL);
      expect(tokens[0].value).toBe('template ${variable} literal');
    });

    test('should tokenize a regular expression literal where an operand starts', () => {
      const tokens = tokenize('/pattern/gi');

      expect(tokens[0]).toMatchObject({ type: TokenType.REGEX, value: '/pattern/gi' });
      expect(tokens[1].type).toBe(TokenType.EOF);
    });
  });
});

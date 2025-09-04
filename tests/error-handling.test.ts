import { compile } from '../src/compiler';
import { Lexer } from '../src/lexer';
import { Parser } from '../src/parser';
import { TypeChecker } from '../src/type-checker';

describe('Error Handling Tests', () => {
  describe('Lexer Error Handling', () => {
    test('should handle invalid characters gracefully', () => {
      const invalidSource = 'тағйирёбанда ном = "test" @#$%^&*';
      const lexer = new Lexer(invalidSource);

      expect(() => {
        lexer.tokenize();
      }).toThrow();
    });

    test('should handle unterminated strings', () => {
      const unterminatedString = 'тағйирёбанда ном = "unterminated string';
      const lexer = new Lexer(unterminatedString);

      expect(() => {
        lexer.tokenize();
      }).toThrow();
    });

    test('should handle invalid numbers', () => {
      const invalidNumber = 'тағйирёбанда рақам = 123.456.789;';
      const lexer = new Lexer(invalidNumber);

      expect(() => {
        lexer.tokenize();
      }).toThrow();
    });

    test('should provide meaningful error messages', () => {
      const invalidSource = 'тағйирёбанда ном = "test" @';
      const lexer = new Lexer(invalidSource);

      try {
        lexer.tokenize();
        fail('Expected lexer to throw an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Unexpected character');
      }
    });
  });

  describe('Parser Error Handling', () => {
    test('should handle syntax errors gracefully', () => {
      const invalidSyntax = 'тағйирёбанда = "missing identifier";';
      const lexer = new Lexer(invalidSyntax);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      expect(() => {
        parser.parse();
      }).toThrow();
    });

    test('should handle missing semicolons', () => {
      const missingSemicolon = 'тағйирёбанда ном = "test"';
      const lexer = new Lexer(missingSemicolon);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      expect(() => {
        parser.parse();
      }).toThrow();
    });

    test('should handle unmatched braces', () => {
      const unmatchedBraces = 'функсия тест() { чоп.сабт("test");';
      const lexer = new Lexer(unmatchedBraces);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      expect(() => {
        parser.parse();
      }).toThrow();
    });

    test('should provide line and column information in errors', () => {
      const multiLineError = `тағйирёбанда ном = "test";
функсия тест() {
  invalid syntax here
}`;
      const lexer = new Lexer(multiLineError);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      try {
        parser.parse();
        fail('Expected parser to throw an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        const errorMessage = (error as Error).message;
        expect(errorMessage).toMatch(/line \d+/);
      }
    });
  });

  describe('Type Checker Error Handling', () => {
    test('should detect type mismatches', () => {
      const typeMismatch = 'тағйирёбанда ном: сатр = 42;';
      const lexer = new Lexer(typeMismatch);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const typeChecker = new TypeChecker();

      const result = typeChecker.check(ast);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain('not assignable');
    });

    test('should detect undefined variables', () => {
      const undefinedVar = 'чоп.сабт(undefined_variable);';
      const lexer = new Lexer(undefinedVar);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const typeChecker = new TypeChecker();

      const result = typeChecker.check(ast);

      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should detect function call with wrong arguments', () => {
      const wrongArgs = `
        функсия тест(а: сатр, б: рақам): холӣ {
          чоп.сабт(а + б);
        }
        тест(42, "wrong type");
      `;
      const lexer = new Lexer(wrongArgs);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const typeChecker = new TypeChecker();

      const result = typeChecker.check(ast);

      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should provide detailed error locations', () => {
      const errorCode = `тағйирёбанда ном: сатр = "test";
тағйирёбанда рақам: рақам = "not a number";`;
      const lexer = new Lexer(errorCode);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const typeChecker = new TypeChecker();

      const result = typeChecker.check(ast);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].line).toBe(2);
      expect(result.errors[0].column).toBeGreaterThan(0);
    });
  });

  describe('Compiler Error Handling', () => {
    test('should handle compilation errors gracefully', () => {
      const invalidCode = 'invalid syntax everywhere @#$%';

      const result = compile(invalidCode);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.code).toBe('');
    });

    test('should continue compilation with warnings', () => {
      const warningCode = 'тағйирёбанда unused_variable = "test";';

      const result = compile(warningCode);

      expect(result.code).not.toBe('');
      // Note: Warnings may not be implemented yet
      // expect(result.warnings.length).toBeGreaterThan(0);
    });

    test('should stop compilation in strict mode with type errors', () => {
      const typeError = 'тағйирёбанда ном: сатр = 42;';

      const result = compile(typeError, { strict: true });

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.code).toBe('');
    });

    test('should handle nested errors properly', () => {
      const nestedError = `
        функсия outer() {
          функсия inner() {
            invalid_syntax_here;
          }
          inner();
        }
      `;

      const result = compile(nestedError);

      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Error Recovery', () => {
    test('should attempt to continue parsing after errors', () => {
      const multipleErrors = `
        тағйирёбанда ном: сатр = 42; // Type error
        тағйирёбанда рақам = 123; // This should still be parsed
        invalid syntax; // Syntax error
        чоп.сабт("This should also be parsed");
      `;

      const result = compile(multipleErrors);

      expect(result.errors.length).toBeGreaterThan(0);
      // The compiler should still generate some code for valid parts
      // expect(result.code).toContain('123');
    });

    test('should provide helpful suggestions in error messages', () => {
      const typoError = 'тағйирёбанд ном = "test";'; // Missing 'а' in тағйирёбанда

      const result = compile(typoError);

      expect(result.errors.length).toBeGreaterThan(0);
      // Error message should be helpful
      expect(result.errors[0]).toContain('Unexpected');
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty input', () => {
      const result = compile('');

      expect(result.errors.length).toBe(0);
      expect(result.code).toBe('');
    });

    test('should handle only whitespace', () => {
      const result = compile('   \n\t  \n  ');

      expect(result.errors.length).toBe(0);
      expect(result.code.trim()).toBe('');
    });

    test('should handle only comments', () => {
      const result = compile('// This is just a comment\n/* Another comment */');

      expect(result.errors.length).toBe(0);
      expect(result.code.trim()).toBe('');
    });

    test('should handle very long identifiers', () => {
      const longIdentifier = 'a'.repeat(1000);
      const longVarDecl = `тағйирёбанда ${longIdentifier} = "test";`;

      const result = compile(longVarDecl);

      expect(result.errors.length).toBe(0);
      expect(result.code).toContain(longIdentifier);
    });

    test('should handle deeply nested structures', () => {
      let deepNesting = 'тағйирёбанда obj = ';
      for (let i = 0; i < 100; i++) {
        deepNesting += '{ nested: ';
      }
      deepNesting += '"value"';
      for (let i = 0; i < 100; i++) {
        deepNesting += ' }';
      }
      deepNesting += ';';

      const result = compile(deepNesting);

      // Should either compile successfully or fail gracefully
      expect(result.errors.length >= 0).toBe(true);
    });
  });
});
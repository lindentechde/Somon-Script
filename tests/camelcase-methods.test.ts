import { Lexer } from '../src/lexer';
import { Parser } from '../src/parser';
import { CodeGenerator } from '../src/codegen';

describe('CamelCase method naming conventions', () => {
  function compileCode(source: string): string {
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const codegen = new CodeGenerator();
    return codegen.generate(ast);
  }

  describe('Console methods (camelCase)', () => {
    test('should correctly map console methods with camelCase', () => {
      const testCases = [
        { input: 'чоп.гуруҳОхир();', expected: 'console.groupEnd()' },
        { input: 'чоп.гуруҳПӯшида("test");', expected: 'console.groupCollapsed("test")' },
        { input: 'чоп.вақтСабт("timer");', expected: 'console.timeLog("timer")' },
        { input: 'чоп.вақтОхир("timer");', expected: 'console.timeEnd("timer")' },
        { input: 'чоп.қайдАсл("counter");', expected: 'console.countReset("counter")' },
        { input: 'чоп.xmlФеҳрист(obj);', expected: 'console.dirxml(obj)' },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = compileCode(input);
        expect(result.trim()).toBe(expected + ';');
      });
    });

    test('should NOT translate underscore variants (methods remain as identifiers)', () => {
      const testCases = [
        { input: 'чоп.гуруҳ_охир();', expected: 'console.гуруҳ_охир();' },
        { input: 'чоп.гуруҳ_пӯшида("test");', expected: 'console.гуруҳ_пӯшида("test");' },
        { input: 'чоп.вақт_сабт("timer");', expected: 'console.вақт_сабт("timer");' },
        { input: 'чоп.вақт_охир("timer");', expected: 'console.вақт_охир("timer");' },
        { input: 'чоп.қайд_асл("counter");', expected: 'console.қайд_асл("counter");' },
        { input: 'чоп.xml_феҳрист(obj);', expected: 'console.xml_феҳрист(obj);' },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = compileCode(input);
        // чоп is translated to console, but underscore methods remain unchanged
        expect(result.trim()).toBe(expected);
      });
    });
  });

  describe('String helper methods (camelCase)', () => {
    test('should correctly map string helper as object reference', () => {
      const code = 'тағйирёбанда s = сатрМетодҳо;';
      const result = compileCode(code);
      expect(result).toContain('let s = String;');
    });

    test('should correctly map string length property', () => {
      const code = 'тағйирёбанда len = текст.дарозииСатр;';
      const result = compileCode(code);
      expect(result).toContain('let len = текст.length;');
    });

    test('should NOT translate underscore string variants', () => {
      const testCases = [
        { input: 'тағйирёбанда s = сатр_методҳо;', shouldContain: 'сатр_методҳо' },
        { input: 'тағйирёбанда len = текст.дарозии_сатр;', shouldContain: 'дарозии_сатр' },
      ];

      testCases.forEach(({ input, shouldContain }) => {
        const result = compileCode(input);
        expect(result).toContain(shouldContain);
        expect(result).not.toContain('String');
        expect(result).not.toContain('.length');
      });
    });
  });

  describe('Complex usage scenarios', () => {
    test('should handle mixed camelCase methods in a program', () => {
      const code = `
        функсия тест() {
          чоп.гуруҳ("Тест");
          чоп.сабт("Салом!");
          чоп.вақт("timer");
          чоп.вақтСабт("timer");
          чоп.вақтОхир("timer");
          чоп.гуруҳОхир();
          
          тағйирёбанда текст = "Салом";
          тағйирёбанда дарозӣ = текст.дарозииСатр;
          бозгашт дарозӣ;
        }
      `;

      const result = compileCode(code);
      expect(result).toContain('console.group("Тест")');
      expect(result).toContain('console.log("Салом!")');
      expect(result).toContain('console.time("timer")');
      expect(result).toContain('console.timeLog("timer")');
      expect(result).toContain('console.timeEnd("timer")');
      expect(result).toContain('console.groupEnd()');
      expect(result).toContain('let дарозӣ = текст.length');
    });

    test('should reject underscore methods in a program', () => {
      const code = `
        функсия тест() {
          чоп.гуруҳ_охир();
          тағйирёбанда s = сатр_методҳо;
          тағйирёбанда len = текст.дарозии_сатр;
        }
      `;

      const result = compileCode(code);
      // These should remain unchanged (not translated)
      expect(result).toContain('гуруҳ_охир');
      expect(result).toContain('сатр_методҳо');
      expect(result).toContain('дарозии_сатр');
      // Should not contain translations
      expect(result).not.toContain('console.groupEnd');
      expect(result).not.toContain('String');
      expect(result).not.toContain('.length');
    });
  });

  describe('Lexer tokenization', () => {
    test('should correctly tokenize camelCase keywords as keywords', () => {
      const lexer = new Lexer('сатрМетодҳо дарозииСатр гуруҳОхир вақтСабт қайдАсл xmlФеҳрист');
      const tokens = lexer.tokenize();

      // These are tokenized as keywords with specific token types
      expect(tokens[0].type).toBe('САТРМЕТОДҲО');
      expect(tokens[1].type).toBe('ДАРОЗИИСАТР');
      expect(tokens[2].type).toBe('ГУРУҲОХИР');
      expect(tokens[3].type).toBe('ВАҚТСАБТ');
      expect(tokens[4].type).toBe('ҚАЙДАСЛ');
      expect(tokens[5].type).toBe('XMLФЕҲРИСТ');
    });

    test('should treat underscore variants as regular identifiers', () => {
      const lexer = new Lexer('сатр_методҳо дарозии_сатр гуруҳ_охир');
      const tokens = lexer.tokenize();

      // These should be treated as regular IDENTIFIER tokens, not keywords
      expect(tokens[0].type).toBe('IDENTIFIER');
      expect(tokens[1].type).toBe('IDENTIFIER');
      expect(tokens[2].type).toBe('IDENTIFIER');
    });
  });
});

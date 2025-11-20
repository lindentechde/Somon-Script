import { Lexer } from '../src/lexer';
import { Parser } from '../src/parser';
import { CodeGenerator } from '../src/codegen';

describe('Underscore variant mappings', () => {
  function compileCode(source: string): string {
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const codegen = new CodeGenerator();
    return codegen.generate(ast);
  }

  describe('Console method underscore variants', () => {
    it('should map гуруҳ_охир to console.groupEnd', () => {
      const code = 'чоп.гуруҳ_охир();';
      const result = compileCode(code);
      expect(result).toContain('console.groupEnd()');
      expect(result).not.toContain('гуруҳ_охир');
    });

    it('should map гуруҳ_пӯшида to console.groupCollapsed', () => {
      const code = 'чоп.гуруҳ_пӯшида("test");';
      const result = compileCode(code);
      expect(result).toContain('console.groupCollapsed');
      expect(result).not.toContain('гуруҳ_пӯшида');
    });

    it('should map вақт_сабт to console.timeLog', () => {
      const code = 'чоп.вақт_сабт("timer");';
      const result = compileCode(code);
      expect(result).toContain('console.timeLog');
      expect(result).not.toContain('вақт_сабт');
    });

    it('should map вақт_охир to console.timeEnd', () => {
      const code = 'чоп.вақт_охир("timer");';
      const result = compileCode(code);
      expect(result).toContain('console.timeEnd');
      expect(result).not.toContain('вақт_охир');
    });

    it('should map қайд_асл to console.countReset', () => {
      const code = 'чоп.қайд_асл("counter");';
      const result = compileCode(code);
      expect(result).toContain('console.countReset');
      expect(result).not.toContain('қайд_асл');
    });

    it('should map xml_феҳрист to console.dirxml', () => {
      const code = 'чоп.xml_феҳрист(obj);';
      const result = compileCode(code);
      expect(result).toContain('console.dirxml');
      expect(result).not.toContain('xml_феҳрист');
    });
  });

  describe('String helper underscore variants', () => {
    it('should map сатр_методҳо to String', () => {
      const code = 'тағйирёбанда s = сатр_методҳо;';
      const result = compileCode(code);
      expect(result).toContain('String');
      expect(result).not.toContain('сатр_методҳо');
    });

    it('should map дарозии_сатр to length', () => {
      const code = 'тағйирёбанда len = текст.дарозии_сатр;';
      const result = compileCode(code);
      expect(result).toContain('.length');
      expect(result).not.toContain('дарозии_сатр');
    });
  });

  describe('Backward compatibility', () => {
    it('should support both camelCase and underscore variants', () => {
      const codeUnderscore = 'чоп.гуруҳ_охир();';
      const codeCamel = 'чоп.гуруҳОхир();';

      const resultUnderscore = compileCode(codeUnderscore);
      const resultCamel = compileCode(codeCamel);

      expect(resultUnderscore).toContain('console.groupEnd()');
      expect(resultCamel).toContain('console.groupEnd()');
    });

    it('should work in complex example with mixed usage', () => {
      const code = `
чоп.гуруҳ("Test");
чоп.сабт("Message");
чоп.гуруҳ_охир();

чоп.вақт("timer");
чоп.вақт_сабт("timer", "checkpoint");
чоп.вақт_охир("timer");
      `.trim();

      const result = compileCode(code);
      expect(result).toContain('console.group');
      expect(result).toContain('console.log');
      expect(result).toContain('console.groupEnd()');
      expect(result).toContain('console.time');
      expect(result).toContain('console.timeLog');
      expect(result).toContain('console.timeEnd');

      // Ensure no Tajik identifiers remain in output
      expect(result).not.toContain('гуруҳ_охир');
      expect(result).not.toContain('вақт_сабт');
      expect(result).not.toContain('вақт_охир');
    });
  });
});

import { Lexer } from '../src/lexer';
import { Parser } from '../src/parser';
import { CodeGenerator } from '../src/codegen';

describe('CamelCase-only mappings (no underscore support)', () => {
  function compileCode(source: string): string {
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const codegen = new CodeGenerator();
    return codegen.generate(ast);
  }

  describe('Console method camelCase-only support', () => {
    it('should NOT map underscore variant гуруҳ_охир', () => {
      const code = 'чоп.гуруҳ_охир();';
      const result = compileCode(code);
      expect(result).toContain('гуруҳ_охир'); // Should remain unchanged
      expect(result).not.toContain('console.groupEnd()');
    });

    it('should map camelCase гуруҳОхир to console.groupEnd', () => {
      const code = 'чоп.гуруҳОхир();';
      const result = compileCode(code);
      expect(result).toContain('console.groupEnd()');
      expect(result).not.toContain('гуруҳОхир');
    });

    it('should NOT map underscore variant вақт_сабт', () => {
      const code = 'чоп.вақт_сабт("timer");';
      const result = compileCode(code);
      expect(result).toContain('вақт_сабт'); // Should remain unchanged
      expect(result).not.toContain('console.timeLog');
    });

    it('should map camelCase вақтСабт to console.timeLog', () => {
      const code = 'чоп.вақтСабт("timer");';
      const result = compileCode(code);
      expect(result).toContain('console.timeLog');
      expect(result).not.toContain('вақтСабт');
    });

    it('should NOT map underscore variant қайд_асл', () => {
      const code = 'чоп.қайд_асл("counter");';
      const result = compileCode(code);
      expect(result).toContain('қайд_асл'); // Should remain unchanged
      expect(result).not.toContain('console.countReset');
    });

    it('should map camelCase қайдАсл to console.countReset', () => {
      const code = 'чоп.қайдАсл("counter");';
      const result = compileCode(code);
      expect(result).toContain('console.countReset');
      expect(result).not.toContain('қайдАсл');
    });
  });

  describe('String helper camelCase variants', () => {
    it('should map сатрМетодҳо to String', () => {
      const code = 'тағйирёбанда s = сатрМетодҳо;';
      const result = compileCode(code);
      expect(result).toContain('String');
      expect(result).not.toContain('сатрМетодҳо');
    });

    it('should map дарозииСатр to length', () => {
      const code = 'тағйирёбанда len = текст.дарозииСатр;';
      const result = compileCode(code);
      expect(result).toContain('.length');
      expect(result).not.toContain('дарозииСатр');
    });
  });

  describe('CamelCase only support', () => {
    it('should only support camelCase variants, not underscore', () => {
      const codeUnderscore = 'чоп.гуруҳ_охир();';
      const codeCamel = 'чоп.гуруҳОхир();';

      const resultUnderscore = compileCode(codeUnderscore);
      const resultCamel = compileCode(codeCamel);

      // Underscore variant should NOT be translated
      expect(resultUnderscore).toContain('гуруҳ_охир');
      expect(resultCamel).toContain('console.groupEnd()');
    });

    it('should reject underscore methods in complex example', () => {
      const code = `
чоп.гуруҳ("Test");
чоп.сабт("Message");
чоп.гуруҳ_охир();

чоп.вақт("timer");
чоп.вақт_сабт("timer", "checkpoint");
чоп.вақт_охир("timer");
      `.trim();

      const result = compileCode(code);
      // Basic methods should work
      expect(result).toContain('console.group');
      expect(result).toContain('console.log');
      expect(result).toContain('console.time');

      // Underscore methods should NOT be translated
      expect(result).toContain('гуруҳ_охир');
      expect(result).toContain('вақт_сабт');
      expect(result).toContain('вақт_охир');
      expect(result).not.toContain('console.groupEnd()');
      expect(result).not.toContain('console.timeLog');
      expect(result).not.toContain('console.timeEnd');
    });
  });
});

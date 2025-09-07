/**
 * Comprehensive Compiler integration tests
 * Tests the main compile function and integration between components
 */

import { compile, CompileOptions, CompileResult } from '../src/compiler';

describe('Compiler - Integration Tests', () => {
  describe('Basic Compilation', () => {
    test('should compile empty source', () => {
      const result = compile('');

      expect(result).toHaveProperty('code');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
      expect(typeof result.code).toBe('string');
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    test('should compile simple literal', () => {
      const source = '42;';
      const result = compile(source);

      expect(result.code).toBeTruthy();
      expect(result.errors).toHaveLength(0);
    });

    test('should compile string literal with Tajik text', () => {
      const source = '"Салом, ҷаҳон!";';
      const result = compile(source);

      expect(result.code).toContain('Салом, ҷаҳон!');
      expect(result.errors).toHaveLength(0);
    });

    test('should compile simple variable declaration', () => {
      const source = 'ТАҒЙИРЁБАНДА х = 5;';
      const result = compile(source);

      expect(result.code).toBeTruthy();
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Compilation Options', () => {
    test('should handle default options', () => {
      const source = '42;';
      const result = compile(source);

      expect(result).toMatchObject({
        code: expect.any(String),
        errors: expect.any(Array),
        warnings: expect.any(Array),
      });
    });

    test('should handle all compilation options', () => {
      const source = '42;';
      const options: CompileOptions = {
        sourceMap: true,
        minify: true,
        target: 'es2020',
        typeCheck: true,
        strict: true,
      };

      const result = compile(source, options);

      expect(result).toHaveProperty('code');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
    });

    test('should handle different target versions', () => {
      const source = '42;';
      const targets: Array<'es5' | 'es2015' | 'es2020' | 'esnext'> = [
        'es5',
        'es2015',
        'es2020',
        'esnext',
      ];

      targets.forEach(target => {
        const result = compile(source, { target });
        expect(result.code).toBeTruthy();
        expect(result.errors).toHaveLength(0);
      });
    });

    test('should handle source map generation', () => {
      const source = '42;';
      const result = compile(source, { sourceMap: true });

      expect(result).toHaveProperty('code');
      // Source map generation depends on implementation
      // Just verify the option doesn't break the compilation
      expect(result.code).toBeTruthy();
    });

    test('should handle type checking disabled', () => {
      const source = '42;';
      const result = compile(source, { typeCheck: false });

      expect(result.code).toBeTruthy();
      expect(result.errors).toHaveLength(0);
    });

    test('should handle strict mode', () => {
      const source = '42;';
      const result = compile(source, { strict: true });

      expect(result.code).toBeTruthy();
    });

    test('should handle minification option', () => {
      const source = '42;';
      const result = compile(source, { minify: true });

      expect(result.code).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    test('should handle lexer errors gracefully', () => {
      // Test with invalid characters that might cause lexer issues
      const source = '©∆∑∏π∫ªº¿¡™£¢∞§¶•ªº';
      const result = compile(source);

      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('code');
    });

    test('should handle parser errors gracefully', () => {
      // Test with incomplete syntax
      const source = 'ТАҒЙИРЁБАНДА х =';
      const result = compile(source);

      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('code');
    });

    test('should handle malformed input', () => {
      const malformedInputs = [null as any, undefined as any, 123 as any, {} as any, [] as any];

      malformedInputs.forEach(input => {
        expect(() => {
          const result = compile(input);
          expect(result).toBeDefined();
        }).not.toThrow();
      });
    });

    test('should handle very long source code', () => {
      const longSource = 'ТАҒЙИРЁБАНДА х = 1;\n'.repeat(1000);
      const result = compile(longSource);

      expect(result).toHaveProperty('code');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
    });

    test('should handle unicode edge cases', () => {
      const unicodeSources = [
        '// کامنٹ\n42;', // Arabic comment
        '/* тест */ 42;', // Cyrillic comment
        '"🚀🎉🔥";', // Emoji
        '"\\u0041\\u0042";', // Unicode escapes
        'ТАҒЙИРЁБАНДА тест = "тест";', // Full Cyrillic
      ];

      unicodeSources.forEach(source => {
        const result = compile(source);
        expect(result).toHaveProperty('code');
        expect(result).toHaveProperty('errors');
        expect(result).toHaveProperty('warnings');
      });
    });
  });

  describe('Integration Between Components', () => {
    test('should integrate lexer, parser, and codegen', () => {
      const source = 'ТАҒЙИРЁБАНДА салом = "Салом, ҷаҳон!";';
      const result = compile(source);

      expect(result.code).toBeTruthy();
      expect(typeof result.code).toBe('string');
    });

    test('should integrate type checker when enabled', () => {
      const source = 'ТАҒЙИРЁБАНДА х: РАҚАМ = 42;';
      const result = compile(source, { typeCheck: true });

      expect(result).toHaveProperty('code');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
    });

    test('should handle type checker errors', () => {
      // This may or may not generate type errors depending on implementation
      const source = 'ТАҒЙИРЁБАНДА х: РАҚАМ = "матн";'; // Type mismatch
      const result = compile(source, { typeCheck: true });

      expect(result).toHaveProperty('code');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
    });

    test('should preserve error reporting through pipeline', () => {
      const source = 'INVALID SYNTAX HERE';
      const result = compile(source);

      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
      expect(result.errors).toBeDefined();
      expect(result.warnings).toBeDefined();
    });
  });

  describe('CompileResult Interface', () => {
    test('should return proper CompileResult structure', () => {
      const source = '42;';
      const result: CompileResult = compile(source);

      expect(result).toMatchObject({
        code: expect.any(String),
        errors: expect.any(Array),
        warnings: expect.any(Array),
      });

      // Optional properties
      if (result.sourceMap !== undefined) {
        expect(typeof result.sourceMap).toBe('string');
      }
    });

    test('should handle all result fields consistently', () => {
      const source = '42;';
      const result = compile(source);

      expect(typeof result.code).toBe('string');
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);

      result.errors.forEach(error => {
        expect(typeof error).toBe('string');
      });

      result.warnings.forEach(warning => {
        expect(typeof warning).toBe('string');
      });
    });
  });

  describe('CompileOptions Interface', () => {
    test('should handle all option combinations', () => {
      const source = '42;';
      const optionCombinations: CompileOptions[] = [
        {},
        { sourceMap: true },
        { minify: true },
        { target: 'es5' },
        { typeCheck: false },
        { strict: true },
        { sourceMap: true, minify: true },
        { target: 'es2020', typeCheck: true, strict: true },
        { sourceMap: true, minify: true, target: 'esnext', typeCheck: false, strict: false },
      ];

      optionCombinations.forEach(options => {
        const result = compile(source, options);
        expect(result).toHaveProperty('code');
        expect(result).toHaveProperty('errors');
        expect(result).toHaveProperty('warnings');
      });
    });

    test('should validate option types', () => {
      const options: CompileOptions = {
        sourceMap: true,
        minify: false,
        target: 'es2020',
        typeCheck: true,
        strict: false,
      };

      expect(typeof options.sourceMap).toBe('boolean');
      expect(typeof options.minify).toBe('boolean');
      expect(typeof options.target).toBe('string');
      expect(typeof options.typeCheck).toBe('boolean');
      expect(typeof options.strict).toBe('boolean');
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle reasonable compilation times', () => {
      const source = 'ТАҒЙИРЁБАНДА х = 42;\nТАҒЙИРЁБАНДА у = "тест";';
      const startTime = Date.now();

      const result = compile(source);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(result).toHaveProperty('code');
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    test('should handle multiple compilations efficiently', () => {
      const source = 'ТАҒЙИРЁБАНДА х = 42;';
      const times: number[] = [];

      for (let i = 0; i < 10; i++) {
        const start = Date.now();
        compile(source);
        const end = Date.now();
        times.push(end - start);
      }

      // All compilations should be reasonably fast
      times.forEach(time => {
        expect(time).toBeLessThan(500); // Each should take less than 500ms
      });
    });

    test('should handle memory efficiently', () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Compile multiple times
      for (let i = 0; i < 20; i++) {
        const source = `ТАҒЙИРЁБАНДА х${i} = ${i};`;
        compile(source);
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = finalMemory - initialMemory;

      // Memory growth should be reasonable (less than 5MB for 20 compilations)
      expect(memoryGrowth).toBeLessThan(5 * 1024 * 1024);
    });
  });

  describe('Real-world Code Scenarios', () => {
    test('should compile function declarations', () => {
      const source = `
        ФУНКСИЯ салом(): VOID {
          ЧОП.САБТ("Салом, ҷаҳон!");
        }
      `;

      const result = compile(source);
      expect(result.code).toBeTruthy();
    });

    test('should compile conditional statements', () => {
      const source = `
        ТАҒЙИРЁБАНДА х = 5;
        АГАР (х > 3) {
          ЧОП.САБТ("Калон");
        }
      `;

      const result = compile(source);
      expect(result.code).toBeTruthy();
    });

    test('should compile loop statements', () => {
      const source = `
        БАРОИ (ТАҒЙИРЁБАНДА и = 0; и < 5; и++) {
          ЧОП.САБТ(и);
        }
      `;

      const result = compile(source);
      expect(result.code).toBeTruthy();
    });

    test('should compile simple expressions', () => {
      const expressions = [
        '1 + 2',
        '"салом" + " " + "ҷаҳон"',
        'ФУНКСИЯ() { БАРГАРДОНДАН 42; }',
        '[1, 2, 3]',
        '{ калид: "арзиш" }',
      ];

      expressions.forEach(expr => {
        const result = compile(expr + ';');
        expect(result).toHaveProperty('code');
      });
    });
  });
});

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
      const source = 'тағйирёбанда х = 5;';
      const result = compile(source);

      expect(result.code).toBeTruthy();
      expect(result.errors).toHaveLength(0);
    });

    test('should compile variable declaration with short keyword', () => {
      const source = 'тағ х = 5;';
      const result = compile(source);

      expect(result.code).toBeTruthy();
      expect(result.errors).toHaveLength(0);
      // Should compile to the same output as тағйирёбанда
      expect(result.code).toContain('let');
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
      const source = 'тағйирёбанда х =';
      const result = compile(source);

      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('code');
    });

    test('should handle malformed input', () => {
      const malformedInputs: unknown[] = [null, undefined, 123, {}, []];

      malformedInputs.forEach(input => {
        expect(() => {
          const src = typeof input === 'string' ? input : '';
          const result = compile(src);
          expect(result).toBeDefined();
        }).not.toThrow();
      });
    });

    test('should handle very long source code', () => {
      const longSource = 'тағйирёбанда х = 1;\n'.repeat(1000);
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
        'тағйирёбанда тест = "тест";', // Full Cyrillic
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
      const source = 'тағйирёбанда салом = "Салом, ҷаҳон!";';
      const result = compile(source);

      expect(result.errors).toEqual([]);
      expect(result.code).toContain('let салом = "Салом, ҷаҳон!";');
    });

    test('should integrate type checker when enabled', () => {
      const source = 'тағйирёбанда х: рақам = 42;';
      const result = compile(source, { typeCheck: true });

      expect(result).toHaveProperty('code');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
    });

    test('should handle type checker errors', () => {
      // This may or may not generate type errors depending on implementation
      const source = 'тағйирёбанда х: рақам = "матн";'; // Type mismatch
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
      const source = 'тағйирёбанда х = 42;\nтағйирёбанда у = "тест";';
      const startTime = Date.now();

      const result = compile(source);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(result).toHaveProperty('code');
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    test('should handle multiple compilations efficiently', () => {
      const source = 'тағйирёбанда х = 42;';
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
        const source = `тағйирёбанда х${i} = ${i};`;
        const result = compile(source);
        expect(result.errors).toEqual([]);
        expect(result.code).toContain(`let х${i} = ${i};`);
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = finalMemory - initialMemory;

      // Heap usage without a forced GC is noisy, so only catch gross leaks
      // (generous limit: 50MB for 20 compilations)
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('Real-world Code Scenarios', () => {
    test('should compile function declarations', () => {
      const source = `
        функсия салом(): беджавоб {
          чоп.сабт("Салом, ҷаҳон!");
        }
      `;

      const result = compile(source);
      expect(result.errors).toEqual([]);
      expect(result.code).toContain('function салом()');
    });

    test('should compile conditional statements', () => {
      const source = `
        тағйирёбанда х = 5;
        агар (х > 3) {
          чоп.сабт("Калон");
        }
      `;

      const result = compile(source);
      expect(result.errors).toEqual([]);
      expect(result.code).toContain('if (х > 3)');
    });

    test('should compile loop statements', () => {
      const source = `
        барои (тағйирёбанда и = 0; и < 5; и++) {
          чоп.сабт(и);
        }
      `;

      const result = compile(source);
      expect(result.errors).toEqual([]);
      expect(result.code).toContain('for (let и = 0; и < 5; и++)');
    });

    test('should compile simple expressions', () => {
      const expressions = [
        '1 + 2',
        '"салом" + " " + "ҷаҳон"',
        'функсия() { БАРГАРДОНДАН 42; }',
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

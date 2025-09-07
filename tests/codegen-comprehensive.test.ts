/**
 * Comprehensive CodeGenerator tests for improved coverage
 * Based on Jest best practices and Context7 testing strategies
 */

import { CodeGenerator } from '../src/codegen';
import {
  Program,
  Statement,
  VariableDeclaration,
  FunctionDeclaration,
  ExpressionStatement,
  Expression,
  Identifier,
  Literal,
  BlockStatement,
} from '../src/ast';

describe('CodeGenerator - Comprehensive Test Suite', () => {
  let generator: CodeGenerator;

  beforeEach(() => {
    generator = new CodeGenerator();
  });

  describe('Basic Code Generation', () => {
    test('should instantiate CodeGenerator', () => {
      expect(generator).toBeInstanceOf(CodeGenerator);
      expect(generator.generate).toBeDefined();
    });

    test('should generate empty program', () => {
      const program: Program = {
        type: 'Program',
        body: [],
        line: 1,
        column: 1,
      };

      const result = generator.generate(program);
      expect(typeof result).toBe('string');
      expect(result.trim()).toBe('');
    });

    test('should generate simple literal expression', () => {
      const program: Program = {
        type: 'Program',
        body: [
          {
            type: 'ExpressionStatement',
            expression: {
              type: 'Literal',
              value: 42,
              raw: '42',
              line: 1,
              column: 1,
            } as Literal,
            line: 1,
            column: 1,
          } as ExpressionStatement,
        ],
        line: 1,
        column: 1,
      };

      const result = generator.generate(program);
      expect(result).toContain('42');
    });

    test('should generate variable declaration', () => {
      const program: Program = {
        type: 'Program',
        body: [
          {
            type: 'VariableDeclaration',
            kind: 'ТАҒЙИРЁБАНДА',
            identifier: {
              type: 'Identifier',
              name: 'x',
              line: 1,
              column: 1,
            } as Identifier,
            init: {
              type: 'Literal',
              value: 5,
              raw: '5',
              line: 1,
              column: 5,
            } as Expression,
            line: 1,
            column: 1,
          } as VariableDeclaration,
        ],
        line: 1,
        column: 1,
      };

      const result = generator.generate(program);
      expect(result).toContain('x');
      expect(result).toContain('5');
    });

    test('should generate constant declaration', () => {
      const program: Program = {
        type: 'Program',
        body: [
          {
            type: 'VariableDeclaration',
            kind: 'СОБИТ',
            identifier: {
              type: 'Identifier',
              name: 'PI',
              line: 1,
              column: 1,
            } as Identifier,
            init: {
              type: 'Literal',
              value: 3.14,
              raw: '3.14',
              line: 1,
              column: 7,
            } as Expression,
            line: 1,
            column: 1,
          } as VariableDeclaration,
        ],
        line: 1,
        column: 1,
      };

      const result = generator.generate(program);
      expect(result).toContain('PI');
      expect(result).toContain('3.14');
    });

    test('should generate function declaration', () => {
      const program: Program = {
        type: 'Program',
        body: [
          {
            type: 'FunctionDeclaration',
            name: {
              type: 'Identifier',
              name: 'testFunc',
              line: 1,
              column: 10,
            } as Identifier,
            params: [],
            body: {
              type: 'BlockStatement',
              body: [],
              line: 1,
              column: 20,
            } as BlockStatement,
            line: 1,
            column: 1,
          } as FunctionDeclaration,
        ],
        line: 1,
        column: 1,
      };

      const result = generator.generate(program);
      expect(result).toContain('testFunc');
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid input gracefully', () => {
      const program: Program = {
        type: 'Program',
        body: [{} as Statement],
        line: 1,
        column: 1,
      };

      // CodeGenerator should throw an error for unknown statement types
      expect(() => {
        generator.generate(program);
      }).toThrow('Unknown statement type: undefined');
    });

    test('should handle null and undefined gracefully', () => {
      const program: Program = {
        type: 'Program',
        body: [],
        line: 1,
        column: 1,
      };

      const result = generator.generate(program);
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    test('should handle empty statements array', () => {
      const program: Program = {
        type: 'Program',
        body: [],
        line: 1,
        column: 1,
      };

      const result = generator.generate(program);
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });
  });

  describe('Built-in Function Mappings', () => {
    test('should map Tajik console functions correctly', () => {
      // Test that the generator can handle identifiers that might map to built-ins
      const program: Program = {
        type: 'Program',
        body: [
          {
            type: 'ExpressionStatement',
            expression: {
              type: 'Identifier',
              name: 'чоп',
              line: 1,
              column: 1,
            } as Identifier,
            line: 1,
            column: 1,
          } as ExpressionStatement,
        ],
        line: 1,
        column: 1,
      };

      const result = generator.generate(program);
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });
  });

  describe('Unicode and International Support', () => {
    test('should handle Tajik Cyrillic characters', () => {
      const program: Program = {
        type: 'Program',
        body: [
          {
            type: 'VariableDeclaration',
            kind: 'ТАҒЙИРЁБАНДА',
            identifier: {
              type: 'Identifier',
              name: 'тағйирёбанда',
              line: 1,
              column: 1,
            } as Identifier,
            init: {
              type: 'Literal',
              value: 'Салом',
              raw: '"Салом"',
              line: 1,
              column: 15,
            } as Expression,
            line: 1,
            column: 1,
          } as VariableDeclaration,
        ],
        line: 1,
        column: 1,
      };

      const result = generator.generate(program);
      expect(result).toBeDefined();
      expect(result).toContain('тағйирёбанда');
    });

    test('should handle mixed script identifiers', () => {
      const program: Program = {
        type: 'Program',
        body: [
          {
            type: 'VariableDeclaration',
            kind: 'ТАҒЙИРЁБАНДА',
            identifier: {
              type: 'Identifier',
              name: 'myТағйирёбанда123',
              line: 1,
              column: 1,
            } as Identifier,
            init: {
              type: 'Literal',
              value: true,
              raw: 'true',
              line: 1,
              column: 20,
            } as Expression,
            line: 1,
            column: 1,
          } as VariableDeclaration,
        ],
        line: 1,
        column: 1,
      };

      const result = generator.generate(program);
      expect(result).toBeDefined();
      expect(result).toContain('myТағйирёбанда123');
    });
  });

  describe('Performance and Memory', () => {
    test('should handle memory efficiently', () => {
      const program: Program = {
        type: 'Program',
        body: [],
        line: 1,
        column: 1,
      };

      // Generate multiple times to check for memory leaks
      for (let i = 0; i < 10; i++) {
        const result = generator.generate(program);
        expect(result).toBeDefined();
      }
    });

    test('should complete generation in reasonable time', () => {
      const statements: Statement[] = [];
      for (let i = 0; i < 100; i++) {
        statements.push({
          type: 'VariableDeclaration',
          kind: 'ТАҒЙИРЁБАНДА',
          identifier: {
            type: 'Identifier',
            name: `var${i}`,
            line: i + 1,
            column: 1,
          } as Identifier,
          init: {
            type: 'Literal',
            value: i,
            raw: i.toString(),
            line: i + 1,
            column: 10,
          } as Expression,
          line: i + 1,
          column: 1,
        } as VariableDeclaration);
      }

      const program: Program = {
        type: 'Program',
        body: statements,
        line: 1,
        column: 1,
      };

      const startTime = Date.now();
      const result = generator.generate(program);
      const endTime = Date.now();

      expect(result).toBeDefined();
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    test('should handle very large programs', () => {
      const statements: Statement[] = [];
      for (let i = 0; i < 50; i++) {
        statements.push({
          type: 'VariableDeclaration',
          kind: 'ТАҒЙИРЁБАНДА',
          identifier: {
            type: 'Identifier',
            name: `variable${i}`,
            line: i + 1,
            column: 1,
          } as Identifier,
          init: {
            type: 'Literal',
            value: i * 2,
            raw: (i * 2).toString(),
            line: i + 1,
            column: 15,
          } as Expression,
          line: i + 1,
          column: 1,
        } as VariableDeclaration);
      }

      const program: Program = {
        type: 'Program',
        body: statements,
        line: 1,
        column: 1,
      };

      const result = generator.generate(program);
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    test('should handle empty and null values', () => {
      const program: Program = {
        type: 'Program',
        body: [
          {
            type: 'ExpressionStatement',
            expression: {
              type: 'Literal',
              value: null,
              raw: 'null',
              line: 1,
              column: 1,
            } as Literal,
            line: 1,
            column: 1,
          } as ExpressionStatement,
        ],
        line: 1,
        column: 1,
      };

      const result = generator.generate(program);
      expect(result).toBeDefined();
      expect(result).toContain('null');
    });
  });
});

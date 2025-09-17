/**
 * Comprehensive TypeChecker tests for improved coverage
 * Based on Jest best practices and Context7 testing strategies
 */

import { TypeChecker, TypeCheckErrorCode } from '../src/type-checker';
import {
  Program,
  Statement,
  VariableDeclaration,
  FunctionDeclaration,
  Expression,
  Identifier,
  BlockStatement,
} from '../src/ast';
import { TypeAnnotation, PrimitiveType } from '../src/types';

describe('TypeChecker - Comprehensive Test Suite', () => {
  let checker: TypeChecker;

  beforeEach(() => {
    checker = new TypeChecker();
  });

  describe('Basic Type Checking', () => {
    test('should instantiate TypeChecker', () => {
      expect(checker).toBeInstanceOf(TypeChecker);
      expect(checker.check).toBeDefined();
    });

    test('should check empty program', () => {
      const program: Program = {
        type: 'Program',
        body: [],
        line: 1,
        column: 1,
      };

      const result = checker.check(program);
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    test('should return proper result structure', () => {
      const program: Program = {
        type: 'Program',
        body: [],
        line: 1,
        column: 1,
      };

      const result = checker.check(program);
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
    });

    test('should handle basic variable declaration', () => {
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

      const result = checker.check(program);
      expect(result).toBeDefined();
    });

    test('should handle function declarations', () => {
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

      const result = checker.check(program);
      expect(result).toBeDefined();
    });

    test('should handle malformed input gracefully', () => {
      const program: Program = {
        type: 'Program',
        body: [{} as Statement],
        line: 1,
        column: 1,
      };

      const result = checker.check(program);
      expect(result).toBeDefined();
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    test('should handle performance requirements', () => {
      const statements: Statement[] = [];
      for (let i = 0; i < 50; i++) {
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
      const result = checker.check(program);
      const endTime = Date.now();

      expect(result).toBeDefined();
      expect(endTime - startTime).toBeLessThan(1000);
    });

    test('should handle Unicode characters', () => {
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

      const result = checker.check(program);
      expect(result).toBeDefined();
    });

    test('should include error code and snippet in diagnostics', () => {
      const source = 'тағйирёбанда х: сатр = 5;';
      const program: Program = {
        type: 'Program',
        body: [
          {
            type: 'VariableDeclaration',
            kind: 'ТАҒЙИРЁБАНДА',
            identifier: {
              type: 'Identifier',
              name: 'х',
              line: 1,
              column: 1,
            } as Identifier,
            typeAnnotation: {
              type: 'TypeAnnotation',
              typeAnnotation: {
                type: 'PrimitiveType',
                name: 'сатр',
                line: 1,
                column: 15,
              } as PrimitiveType,
              line: 1,
              column: 12,
            } as TypeAnnotation,
            init: {
              type: 'Literal',
              value: 5,
              raw: '5',
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

      const checkerWithSource = new TypeChecker(source);
      const result = checkerWithSource.check(program);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(TypeCheckErrorCode.TypeMismatch);
      expect(result.errors[0].snippet).toBe(source);
    });
  });
});

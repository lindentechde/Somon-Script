import { TypeChecker, TypeCheckErrorCode } from '../src/type-checker';
import { Parser } from '../src/parser';
import { Lexer } from '../src/lexer';

describe('ClassDeclaration Validation', () => {
  function typeCheck(code: string) {
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const checker = new TypeChecker(code);
    return checker.check(ast);
  }

  describe('Superclass Validation', () => {
    it('should error when superclass does not exist', () => {
      const code = `синф Саг мерос Ҳайвон { конструктор() {} }`;
      const result = typeCheck(code);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(TypeCheckErrorCode.ClassNotFound);
      expect(result.errors[0].message).toContain('Ҳайвон');
      expect(result.errors[0].message).toContain('not found');
    });

    it('should error when trying to extend an interface', () => {
      const code = `
интерфейс IҲайвон {
  ном: сатр;
}
синф Саг мерос IҲайвон {
  конструктор() {}
}
      `;
      const result = typeCheck(code);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(TypeCheckErrorCode.InvalidExtends);
      expect(result.errors[0].message).toContain('interface');
    });

    it('should allow extending a valid class', () => {
      const code = `
синф Ҳайвон {
  конструктор() {}
}
синф Саг мерос Ҳайвон {
  конструктор() {}
}
      `;
      const result = typeCheck(code);

      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Circular Inheritance Detection', () => {
    it('should detect direct circular inheritance', () => {
      const code = `
синф A мерос B {
  конструктор() {}
}
синф B мерос A {
  конструктор() {}
}
      `;
      const result = typeCheck(code);

      // Should detect circular inheritance
      const circularErrors = result.errors.filter(
        e => e.code === TypeCheckErrorCode.CircularInheritance
      );
      expect(circularErrors.length).toBeGreaterThan(0);
      expect(circularErrors[0].message).toContain('Circular inheritance');
    });

    it('should detect indirect circular inheritance', () => {
      const code = `
синф A мерос B {
  конструктор() {}
}
синф B мерос C {
  конструктор() {}
}
синф C мерос A {
  конструктор() {}
}
      `;
      const result = typeCheck(code);

      const circularErrors = result.errors.filter(
        e => e.code === TypeCheckErrorCode.CircularInheritance
      );
      expect(circularErrors.length).toBeGreaterThan(0);
    });
  });

  describe('Property Type Validation', () => {
    it('should error when property initializer type mismatches', () => {
      const code = `
синф Гурба {
  синнусол: рақам = "панҷ";
}
      `;
      const result = typeCheck(code);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(TypeCheckErrorCode.TypeMismatch);
      expect(result.errors[0].message).toContain('синнусол');
    });

    it('should allow correct property types', () => {
      const code = `
синф Одам {
  ном: сатр = "Иван";
  синнусол: рақам = 30;
}
      `;
      const result = typeCheck(code);

      expect(result.errors).toHaveLength(0);
    });

    it('should allow properties without initializers', () => {
      const code = `
синф Одам {
  ном: сатр;
  синнусол: рақам;
}
      `;
      const result = typeCheck(code);

      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Complex Class Scenarios', () => {
    it('should validate inherited properties correctly', () => {
      const code = `
синф Ҳайвон {
  ном: сатр = "бенном";
}
синф Саг мерос Ҳайвон {
  овоз: сатр = "Вав";
  синнусол: рақам = 5;
}
      `;
      const result = typeCheck(code);

      expect(result.errors).toHaveLength(0);
    });

    it('should catch multiple errors in one class', () => {
      const code = `
синф BadClass мерос NonExistent {
  prop1: рақам = "string";
  prop2: сатр = 123;
}
      `;
      const result = typeCheck(code);

      // Should have at least: missing superclass + 2 type mismatches
      expect(result.errors.length).toBeGreaterThanOrEqual(3);

      // Check that we get the superclass error
      const classNotFoundErrors = result.errors.filter(
        e => e.code === TypeCheckErrorCode.ClassNotFound
      );
      expect(classNotFoundErrors.length).toBeGreaterThan(0);

      // Check that we get type mismatch errors
      const typeMismatchErrors = result.errors.filter(
        e => e.code === TypeCheckErrorCode.TypeMismatch
      );
      expect(typeMismatchErrors.length).toBe(2);
    });
  });
});

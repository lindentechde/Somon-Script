import { Lexer } from '../src/lexer';
import { Parser } from '../src/parser';
import { TypeChecker } from '../src/type-checker';

describe('TypeChecker', () => {
  function checkTypes(source: string) {
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const typeChecker = new TypeChecker();
    return typeChecker.check(ast);
  }

  describe('Variable Type Checking', () => {
    test('should validate correct type assignment', () => {
      const source = 'тағйирёбанда ном: сатр = "Аҳмад";';
      const result = checkTypes(source);
      
      expect(result.errors).toHaveLength(0);
    });

    test('should detect type mismatch', () => {
      const source = 'тағйирёбанда ном: сатр = 42;';
      const result = checkTypes(source);
      
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('not assignable');
    });

    test('should handle number types', () => {
      const source = 'тағйирёбанда синну_сол: рақам = 25;';
      const result = checkTypes(source);
      
      expect(result.errors).toHaveLength(0);
    });

    test('should handle boolean types', () => {
      const source = 'тағйирёбанда фаъол: мантиқӣ = дуруст;';
      const result = checkTypes(source);
      
      expect(result.errors).toHaveLength(0);
    });

    test('should infer types without annotations', () => {
      const source = 'тағйирёбанда ном = "Аҳмад";';
      const result = checkTypes(source);
      
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Function Type Checking', () => {
    test('should handle function with typed parameters', () => {
      const source = `
        функсия ҷамъ(а: рақам, б: рақам): рақам {
          бозгашт а + б;
        }
      `;
      const result = checkTypes(source);
      
      expect(result.errors).toHaveLength(0);
    });

    test('should handle function without return type', () => {
      const source = `
        функсия салом(ном: сатр) {
          чоп.сабт("Салом, " + ном);
        }
      `;
      const result = checkTypes(source);
      
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Interface Type Checking', () => {
    test('should parse interface declaration', () => {
      const source = `
        интерфейс Корбар {
          ном: сатр;
          синну_сол: рақам;
          email?: сатр;
        }
      `;
      const result = checkTypes(source);
      
      expect(result.errors).toHaveLength(0);
    });

    test('should handle interface with optional properties', () => {
      const source = `
        интерфейс Маҳсулот {
          ном: сатр;
          нарх: рақам;
          тавсиф?: сатр;
        }
      `;
      const result = checkTypes(source);
      
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Array Type Checking', () => {
    test('should handle array type annotations', () => {
      const source = 'тағйирёбанда рақамҳо: рақам[] = [1, 2, 3];';
      const result = checkTypes(source);
      
      expect(result.errors).toHaveLength(0);
    });

    test('should handle string array', () => {
      const source = 'тағйирёбанда номҳо: сатр[] = ["Аҳмад", "Фотима"];';
      const result = checkTypes(source);
      
      expect(result.errors).toHaveLength(0);
    });
  });

  // Union types are planned for Phase 2
  // describe('Union Type Checking', () => {
  //   test('should handle union types', () => {
  //     const source = 'тағйирёбанда қимат: сатр | рақам = "салом";';
  //     const result = checkTypes(source);
  //     
  //     expect(result.errors).toHaveLength(0);
  //   });

  //   test('should validate union type assignment', () => {
  //     const source = 'тағйирёбанда қимат: сатр | рақам = 42;';
  //     const result = checkTypes(source);
  //     
  //     expect(result.errors).toHaveLength(0);
  //   });
  // });

  describe('Type Alias', () => {
    test('should handle type alias declaration', () => {
      const source = `
        навъ КорбарИД = сатр;
        тағйирёбанда ид: КорбарИД = "user123";
      `;
      const result = checkTypes(source);
      
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Complex Type Scenarios', () => {
    test('should handle interface with function type', () => {
      const source = `
        интерфейс Корбар {
          ном: сатр;
          синну_сол: рақам;
        }
        
        функсия салом_гуфтан(корбар: Корбар): сатр {
          бозгашт "Салом, " + корбар.ном;
        }
      `;
      const result = checkTypes(source);
      
      expect(result.errors).toHaveLength(0);
    });

    test('should handle nested interfaces', () => {
      const source = `
        интерфейс Суроға {
          кӯча: сатр;
          шаҳр: сатр;
        }
        
        интерфейс Корбар {
          ном: сатр;
          суроға: Суроға;
        }
      `;
      const result = checkTypes(source);
      
      expect(result.errors).toHaveLength(0);
    });
  });
});
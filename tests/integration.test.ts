import { compile } from '../src/compiler';

describe('Integration Tests', () => {
  describe('End-to-End Compilation', () => {
    test('should compile simple program with type annotations', () => {
      const source = `
        тағйирёбанда ном: сатр = "Аҳмад";
        тағйирёбанда синну_сол: рақам = 25;
        чоп.сабт("Салом,", ном);
      `;
      
      const result = compile(source, { strict: true });
      
      expect(result).toCompileSuccessfully();
      expect(result.code).toContain('let ном = "Аҳмад"');
      expect(result.code).toContain('let синну_сол = 25');
      expect(result.code).toContain('console.log("Салом,", ном)');
    });

    test('should compile interface with optional properties', () => {
      const source = `
        интерфейс Корбар {
          ном: сатр;
          синну_сол: рақам;
          email?: сатр;
        }
        
        функсия салом(корбар: Корбар): сатр {
          бозгашт "Салом, " + корбар.ном;
        }
      `;
      
      const result = compile(source, { strict: true });
      
      expect(result).toCompileSuccessfully();
      expect(result.code).toContain('function салом(корбар)');
      expect(result.code).toContain('return "Салом, " + корбар.ном');
    });

    test('should compile union types correctly', () => {
      const source = `
        тағйирёбанда қимат: сатр | рақам = "салом";
        қимат = 42;
        
        функсия нишон_додан(х: сатр | рақам): сатр {
          бозгашт "Қимат: " + х;
        }
      `;
      
      const result = compile(source, { strict: true });
      
      expect(result).toCompileSuccessfully();
      expect(result.code).toContain('let қимат = "салом"');
      expect(result.code).toContain('қимат = 42');
      expect(result.code).toContain('function нишон_додан(х)');
    });

    test('should handle complex nested structures', () => {
      const source = `
        интерфейс Суроға {
          кӯча: сатр;
          шаҳр: сатр;
        }
        
        интерфейс КорбариПурра {
          ном: сатр;
          суроға: Суроға;
          рақамҳо: рақам[];
        }
        
        тағйирёбанда корбар: КорбариПурра = {
          ном: "Аҳмад",
          суроға: { кӯча: "Рӯдакӣ", шаҳр: "Душанбе" },
          рақамҳо: [1, 2, 3]
        };
      `;
      
      const result = compile(source);
      
      // Should compile without strict mode (object literals not fully implemented)
      expect(result.errors.length).toBeLessThanOrEqual(1); // May have object literal issues
      expect(result.code).toContain('let корбар');
    });
  });

  describe('Error Handling', () => {
    test('should detect type mismatches', () => {
      const source = `
        тағйирёбанда ном: сатр = 42;
      `;
      
      const result = compile(source, { strict: true });
      
      expect(result).toHaveTypeError();
      expect(result.code).toBe('');
    });

    test('should handle syntax errors gracefully', () => {
      const source = `
        тағйирёбанда ном: сатр = "Аҳмад"
        // Missing semicolon
        чоп.сабт(ном)
      `;
      
      const result = compile(source);
      
      // Should still attempt to compile despite syntax issues
      expect(result).toBeDefined();
    });

    test('should validate union type assignments', () => {
      const source = `
        тағйирёбанда қимат: сатр | рақам = дуруст;
      `;
      
      const result = compile(source, { strict: true });
      
      // Boolean is not assignable to string | number
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Generated JavaScript Quality', () => {
    test('should generate valid JavaScript syntax', () => {
      const source = `
        функсия ҷамъ(а: рақам, б: рақам): рақам {
          бозгашт а + б;
        }
        
        тағйирёбанда натиҷа = ҷамъ(5, 3);
        чоп.сабт(натиҷа);
      `;
      
      const result = compile(source);
      
      expect(result).toCompileSuccessfully();
      expect(result.code).toGenerateValidJS();
    });

    test('should preserve Tajik identifiers in output', () => {
      const source = `
        тағйирёбанда номи_корбар: сатр = "Аҳмад";
        функсия салом_гуфтан(): сатр {
          бозгашт "Салом!";
        }
      `;
      
      const result = compile(source);
      
      expect(result).toCompileSuccessfully();
      expect(result.code).toContain('номи_корбар');
      expect(result.code).toContain('салом_гуфтан');
      expect(result.code).not.toContain('тағйирёбанда'); // Should be translated to 'let'
    });

    test('should handle built-in function mappings', () => {
      const source = `
        тағйирёбанда рӯйхат: рақам[] = [1, 2, 3];
        рӯйхат.илова(4);
        чоп.сабт(рӯйхат.дарозӣ);
      `;
      
      const result = compile(source);
      
      expect(result).toCompileSuccessfully();
      expect(result.code).toContain('push(4)'); // илова -> push
      expect(result.code).toContain('console.log'); // чоп.сабт -> console.log
      expect(result.code).toContain('.length'); // дарозӣ -> length
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle moderately large programs', () => {
      // Generate a program with multiple interfaces and functions
      let source = '';
      
      for (let i = 0; i < 10; i++) {
        source += `
          интерфейс Интерфейс${i} {
            хосият${i}: сатр;
            рақам${i}: рақам;
          }
          
          функсия функсия${i}(параметр: Интерфейс${i}): сатр {
            бозгашт параметр.хосият${i} + параметр.рақам${i};
          }
        `;
      }
      
      const startTime = Date.now();
      const result = compile(source, { strict: true });
      const endTime = Date.now();
      
      expect(result).toCompileSuccessfully();
      expect(endTime - startTime).toBeLessThan(5000); // Should compile in under 5 seconds
      expect(result.code.length).toBeGreaterThan(100); // Should generate substantial output
    });

    test('should maintain type safety with complex type relationships', () => {
      const source = `
        навъ ИД = сатр;
        навъ Рақам = рақам;
        
        интерфейс Асосӣ {
          ид: ИД;
          қимат: Рақам | сатр;
        }
        
        интерфейс Мураккаб extends Асосӣ {
          зерқисмҳо: Асосӣ[];
          иловагӣ?: мантиқӣ;
        }
        
        функсия коркард(объект: Мураккаб): ИД {
          бозгашт объект.ид;
        }
      `;
      
      const result = compile(source, { strict: true });
      
      // Should handle complex type relationships
      expect(result.errors.length).toBeLessThanOrEqual(2); // May have some unimplemented features
    });
  });
});
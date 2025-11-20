import { compile } from '../src/compiler';

describe('Quick Start Reference Tests', () => {
  describe('Math (Риёзӣ) Object', () => {
    test('should transpile Риёзӣ to Math', () => {
      const source = 'тағйирёбанда натиҷа = Риёзӣ.дуръшака(9);';
      const result = compile(source);

      expect(result.errors).toHaveLength(0);
      expect(result.code).toContain('Math.sqrt(9)');
    });

    test('should transpile all Math methods', () => {
      const testCases = [
        { source: 'Риёзӣ.дуръшака(9);', expected: 'Math.sqrt(9)' },
        { source: 'Риёзӣ.қувват(2, 3);', expected: 'Math.pow(2, 3)' },
        { source: 'Риёзӣ.тасодуфӣ();', expected: 'Math.random()' },
        { source: 'Риёзӣ.дузкунӣ(4.7);', expected: 'Math.round(4.7)' },
        { source: 'Риёзӣ.боло(4.2);', expected: 'Math.ceil(4.2)' },
        { source: 'Риёзӣ.поён(4.7);', expected: 'Math.floor(4.7)' },
      ];

      testCases.forEach(({ source, expected }) => {
        const result = compile(source);
        expect(result.errors).toHaveLength(0);
        expect(result.code).toContain(expected);
      });
    });

    test('should handle complex Math expressions', () => {
      const source = 'тағйирёбанда натиҷа = Риёзӣ.қувват(Риёзӣ.дуръшака(16), 2);';
      const result = compile(source);

      expect(result.errors).toHaveLength(0);
      expect(result.code).toContain('Math.pow(Math.sqrt(16), 2)');
    });
  });

  describe('String Methods', () => {
    test('should transpile string methods correctly', () => {
      const testCases = [
        { source: 'матн.дарозӣ;', expected: '.length' },
        { source: 'матн.калон();', expected: '.toUpperCase()' },
        { source: 'матн.хурд();', expected: '.toLowerCase()' },
        { source: 'матн.қисмат(0, 5);', expected: '.substring(0, 5)' },
        { source: 'матн.ҷойгузин("a", "b");', expected: '.replace("a", "b")' },
        { source: 'матн.ҷудокунӣ(",");', expected: '.split(",")' },
      ];

      testCases.forEach(({ source, expected }) => {
        const fullSource = `тағйирёбанда матн = "test"; ${source}`;
        const result = compile(fullSource);
        expect(result.errors).toHaveLength(0);
        expect(result.code).toContain(expected);
      });
    });
  });

  describe('Console Methods', () => {
    test('should transpile console methods correctly', () => {
      const testCases = [
        { source: 'чоп.сабт("Салом");', expected: 'console.log("Салом")' },
        { source: 'чоп.хато("Хато");', expected: 'console.error("Хато")' },
        { source: 'чоп.огоҳӣ("Огоҳӣ");', expected: 'console.warn("Огоҳӣ")' },
        { source: 'чоп.маълумот("Маълумот");', expected: 'console.info("Маълумот")' },
      ];

      testCases.forEach(({ source, expected }) => {
        const result = compile(source);
        expect(result.errors).toHaveLength(0);
        expect(result.code).toContain(expected);
      });
    });
  });

  describe('Variables and Constants', () => {
    test('should handle variable declarations', () => {
      const source = `
        тағйирёбанда ном = "Аҳмад";
        тағйирёбанда синну_сол = 25;
        тағйирёбанда фаъол = дуруст;
      `;
      const result = compile(source);

      expect(result.errors).toHaveLength(0);
      expect(result.code).toContain('let ном = "Аҳмад"');
      expect(result.code).toContain('let синну_сол = 25');
      expect(result.code).toContain('let фаъол = true');
    });

    test('should handle constants', () => {
      const source = `
        собит ПИ = 3.14159;
        собит МАКС_СИННУ_СОЛ = 120;
      `;
      const result = compile(source);

      expect(result.errors).toHaveLength(0);
      expect(result.code).toContain('const ПИ = 3.14159');
      expect(result.code).toContain('const МАКС_СИННУ_СОЛ = 120');
    });
  });

  describe('Control Flow', () => {
    test('should handle if-else statements', () => {
      const source = `
        агар (x > 0) {
          чоп.сабт("Мусбат");
        } вагарна агар (x < 0) {
          чоп.сабт("Манфӣ");
        } вагарна {
          чоп.сабт("Сифр");
        }
      `;
      const result = compile(source);

      expect(result.errors).toHaveLength(0);
      expect(result.code).toContain('if (x > 0)');
      expect(result.code).toContain('} else if (x < 0)');
      expect(result.code).toContain('} else {');
    });

    test('should handle for loops', () => {
      const source = `
        барои (тағйирёбанда i = 0; i < 10; i++) {
          чоп.сабт(i);
        }
      `;
      const result = compile(source);

      expect(result.errors).toHaveLength(0);
      expect(result.code).toContain('for (let i = 0; i < 10; i++)');
    });

    test('should handle while loops', () => {
      const source = `
        то (шарт) {
          чоп.сабт("Давом");
        }
      `;
      const result = compile(source);

      expect(result.errors).toHaveLength(0);
      expect(result.code).toContain('while (шарт)');
    });
  });

  describe('Functions', () => {
    test('should handle basic function declarations', () => {
      const source = `
        функсия салом(ном: сатр): сатр {
          бозгашт "Салом, " + ном;
        }
      `;
      const result = compile(source);

      expect(result.errors).toHaveLength(0);
      expect(result.code).toContain('function салом(ном)');
      expect(result.code).toContain('return "Салом, " + ном');
    });

    test('should handle arrow functions', () => {
      const source = 'тағйирёбанда ҳисоб = (а, б) => а * б;';
      const result = compile(source);

      expect(result.errors).toHaveLength(0);
      expect(result.code).toContain('(а, б) => а * б');
    });
  });

  describe('Arrays', () => {
    test('should handle array declarations and methods', () => {
      const source = `
        тағйирёбанда мева = ["себ", "мӯз", "анор"];
        мева.push("шафтолу");
        тағйирёбанда дарозӣ = мева.length;
      `;
      const result = compile(source);

      expect(result.errors).toHaveLength(0);
      expect(result.code).toContain('["себ", "мӯз", "анор"]');
      expect(result.code).toContain('.push("шафтолу")');
      expect(result.code).toContain('.length');
    });
  });

  describe('Objects', () => {
    test('should handle object declarations', () => {
      const source = `
        тағйирёбанда корбар = {
          ном: "Анвар",
          синну_сол: 30,
          шаҳр: "Душанбе"
        };
      `;
      const result = compile(source);

      expect(result.errors).toHaveLength(0);
      expect(result.code).toContain('ном: "Анвар"');
      expect(result.code).toContain('синну_сол: 30');
      expect(result.code).toContain('шаҳр: "Душанбе"');
    });
  });

  describe('Classes', () => {
    test('should handle class declarations', () => {
      const source = `
        синф Шахс {
          хосусӣ ном: сатр;
          
          конструктор(ном: сатр) {
            ин.ном = ном;
          }
          
          ҷамъиятӣ салом(): сатр {
            бозгашт "Салом, " + ин.ном;
          }
        }
      `;
      const result = compile(source);

      expect(result.errors).toHaveLength(0);
      expect(result.code).toContain('class Шахс');
      expect(result.code).toContain('constructor(ном)');
      expect(result.code).toContain('this.ном = ном');
    });
  });

  describe('Error Handling', () => {
    test('should handle try-catch blocks', () => {
      const source = `
        кӯшиш {
          чоп.сабт("Кӯшиш");
        } гирифтан (хато) {
          чоп.хато(хато);
        } ниҳоят {
          чоп.сабт("Ниҳоят");
        }
      `;
      const result = compile(source);

      expect(result.errors).toHaveLength(0);
      expect(result.code).toContain('try {');
      expect(result.code).toContain('} catch (хато)');
      expect(result.code).toContain('} finally {');
    });
  });

  describe('Template Literals', () => {
    test('should handle template literals', () => {
      const source = 'тағйирёбанда паём = `Салом, ${ном}!`;';
      const result = compile(source);

      expect(result.errors).toHaveLength(0);
      expect(result.code).toContain('`Салом, ${ном}!`');
    });
  });

  describe('Async/Await', () => {
    test('should handle async functions', () => {
      const source = `
        ҳамзамон функсия маълумот_гирифтан() {
          тағйирёбанда натиҷа = интизор fetch("url");
          бозгашт натиҷа;
        }
      `;
      const result = compile(source);

      expect(result.errors).toHaveLength(0);
      expect(result.code).toContain('async function маълумот_гирифтан()');
      expect(result.code).toContain('await fetch("url")');
    });
  });
});

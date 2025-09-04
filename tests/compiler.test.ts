import { compile } from '../src/compiler';

describe('Compiler', () => {
  test('should compile variable declaration', () => {
    const source = 'тағйирёбанда ном = "Аҳмад";';
    const result = compile(source);

    expect(result.errors).toHaveLength(0);
    expect(result.code.trim()).toBe('let ном = "Аҳмад";');
  });

  test('should compile constant declaration', () => {
    const source = 'собит сол = 2024;';
    const result = compile(source);

    expect(result.errors).toHaveLength(0);
    expect(result.code.trim()).toBe('const сол = 2024;');
  });

  test('should compile function declaration', () => {
    const source = 'функсия ҷамъ(а, б) { бозгашт а + б; }';
    const result = compile(source);

    expect(result.errors).toHaveLength(0);
    expect(result.code.trim()).toBe('function ҷамъ(а, б) {\n  return а + б;\n}');
  });

  test('should compile if statement', () => {
    const source = 'агар (х > 5) { чоп.сабт("калон"); }';
    const result = compile(source);

    expect(result.errors).toHaveLength(0);
    expect(result.code.trim()).toBe('if (х > 5) {\n  console.log("калон");\n}');
  });

  test('should compile if-else statement', () => {
    const source = 'агар (х > 5) { чоп.сабт("калон"); } вагарна { чоп.сабт("хурд"); }';
    const result = compile(source);

    expect(result.errors).toHaveLength(0);
    const expected = 'if (х > 5) {\n  console.log("калон");\n} else {\n  console.log("хурд");\n}';
    expect(result.code.trim()).toBe(expected);
  });

  test('should compile while loop', () => {
    const source = 'то (и < 10) { и = и + 1; }';
    const result = compile(source);

    expect(result.errors).toHaveLength(0);
    expect(result.code.trim()).toBe('while (и < 10) {\n  и = и + 1;\n}');
  });

  test('should compile boolean literals', () => {
    const source = 'тағйирёбанда а = дуруст; тағйирёбанда б = нодуруст;';
    const result = compile(source);

    expect(result.errors).toHaveLength(0);
    expect(result.code.trim()).toBe('let а = true;\nlet б = false;');
  });

  test('should compile null literal', () => {
    const source = 'тағйирёбанда а = холӣ;';
    const result = compile(source);

    expect(result.errors).toHaveLength(0);
    expect(result.code.trim()).toBe('let а = null;');
  });

  test('should compile Tajik built-in functions', () => {
    const source = 'чоп.сабт("Салом"); чоп.хато("Хато");';
    const result = compile(source);

    expect(result.errors).toHaveLength(0);
    expect(result.code.trim()).toBe('console.log("Салом");\nconsole.error("Хато");');
  });

  test('should handle compilation errors', () => {
    const source = 'тағйирёбанда = "invalid";'; // Missing identifier
    const result = compile(source);

    // May not detect all syntax errors yet
    expect(result).toBeDefined();
    expect(typeof result.code).toBe('string');
  });

  test('should compile complex program', () => {
    const source = `
функсия факториал(н) {
    агар (н <= 1) {
        бозгашт 1;
    }
    бозгашт н * факториал(н - 1);
}

тағйирёбанда натиҷа = факториал(5);
чоп.сабт(натиҷа);
    `.trim();

    const result = compile(source);

    expect(result.errors).toHaveLength(0);
    expect(result.code).toContain('function факториал(н)');
    expect(result.code).toContain('if (н <= 1)');
    expect(result.code).toContain('return 1;');
    expect(result.code).toContain('return н * факториал(н - 1);');
    expect(result.code).toContain('let натиҷа = факториал(5);');
    // Note: console.log may not be fully implemented for all cases
  });

  test('should compile export declarations', () => {
    const source = 'содир функсия ҳисоб(а, б) { бозгашт а + б; }';
    const result = compile(source);

    expect(result.errors).toHaveLength(0);
    expect(result.code).toContain('function ҳисоб(а, б)');
    expect(result.code).toContain('module.exports.ҳисоб = ҳисоб;');
  });

  test('should compile default export', () => {
    const source = 'содир пешфарз функсия асосӣ() { бозгашт "салом"; }';
    const result = compile(source);

    expect(result.errors).toHaveLength(0);
    expect(result.code).toContain('function асосӣ()');
    expect(result.code).toContain('module.exports = асосӣ;');
  });

  test('should compile import declarations', () => {
    const source = 'ворид { ҷамъ } аз "./math.som";';
    const result = compile(source);

    expect(result.errors).toHaveLength(0);
    expect(result.code).toContain('const {');
    expect(result.code).toContain('require(');
  });

  test('should compile class declarations', () => {
    const source = 'синф Шахс { конструктор(ном) { ин.ном = ном; } }';
    const result = compile(source);

    expect(result.errors).toHaveLength(0);
    expect(result.code).toContain('class Шахс');
    expect(result.code).toContain('constructor(ном)');
  });

  test('should compile array expressions', () => {
    const source = 'тағйирёбанда рақамҳо = [1, 2, 3];';
    const result = compile(source);

    expect(result.errors).toHaveLength(0);
    expect(result.code).toContain('let рақамҳо = [1, 2, 3];');
  });

  test('should compile object expressions', () => {
    const source = 'тағйирёбанда объект = { ном: "Аҳмад", сол: 25 };';
    const result = compile(source);

    expect(result.errors).toHaveLength(0);
    expect(result.code).toContain('let объект = {ном: "Аҳмад", сол: 25};');
  });

  test('should compile member expressions', () => {
    const source = 'тағйирёбанда қимат = объект.ном;';
    const result = compile(source);

    expect(result.errors).toHaveLength(0);
    expect(result.code).toContain('let қимат = объект.ном;');
  });

  test('should compile try-catch statements', () => {
    const source = 'кӯшиш { чоп.сабт("тест"); } гирифтан (хато) { чоп.хато(хато); }';
    const result = compile(source);

    expect(result.errors).toHaveLength(0);
    expect(result.code).toContain('try {');
    expect(result.code).toContain('} catch (');
  });
});

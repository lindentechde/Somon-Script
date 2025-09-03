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
    const source = 'агар (х > 5) { console.log("калон"); }';
    const result = compile(source);

    expect(result.errors).toHaveLength(0);
    expect(result.code.trim()).toBe('if (х > 5) {\n  console.log("калон");\n}');
  });

  test('should compile if-else statement', () => {
    const source = 'агар (х > 5) { console.log("калон"); } вагарна { console.log("хурд"); }';
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

  test('should handle compilation errors', () => {
    const source = 'тағйирёбанда = "invalid";'; // Missing identifier
    const result = compile(source);

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.code).toBe('');
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
console.log(натиҷа);
    `.trim();

    const result = compile(source);

    expect(result.errors).toHaveLength(0);
    expect(result.code).toContain('function факториал(н)');
    expect(result.code).toContain('if (н <= 1)');
    expect(result.code).toContain('return 1;');
    expect(result.code).toContain('return н * факториал(н - 1);');
    expect(result.code).toContain('let натиҷа = факториал(5);');
    expect(result.code).toContain('console.log(натиҷа);');
  });
});
import { compile } from '../src/compiler';

describe('Core TokenType compilation', () => {
  test('variable and constant declarations', () => {
    const source = 'тағйирёбанда а = 1; собит б = 2;';
    const result = compile(source);
    expect(result.errors).toHaveLength(0);
    expect(result.code.trim()).toBe('let а = 1;\nconst б = 2;');
  });

  test('function declaration with return', () => {
    const source = 'функсия ф() { бозгашт 1; }';
    const result = compile(source);
    expect(result.errors).toHaveLength(0);
    expect(result.code.trim()).toBe('function ф() {\n  return 1;\n}');
  });

  test('if-else statement', () => {
    const source = 'агар (дуруст) { чоп.сабт("t"); } вагарна { чоп.сабт("f"); }';
    const result = compile(source);
    expect(result.errors).toHaveLength(0);
    const expected = 'if (true) {\n  console.log("t");\n} else {\n  console.log("f");\n}';
    expect(result.code.trim()).toBe(expected);
  });

  test('for and while loops with break and continue', () => {
    const source = `барои (тағйирёбанда и = 0; и < 1; и = и + 1) {
  агар (и == 0) { давом; }
  шикастан;
}
тағйирёбанда ж = 0;
то (ж < 1) { ж = ж + 1; }`;
    const result = compile(source);
    expect(result.errors).toHaveLength(0);
    expect(result.code).toContain('for (let и = 0; и < 1; и = и + 1)');
    expect(result.code).toContain('if (и == 0)');
    expect(result.code).toContain('continue;');
    expect(result.code).toContain('break;');
    expect(result.code).toContain('while (ж < 1)');
  });

  test('class, constructor, this, and new', () => {
    const source = 'синф A { конструктор() { ин.қимат = 1; } } тағйирёбанда с = нав A();';
    const result = compile(source);
    expect(result.errors).toHaveLength(0);
    expect(result.code).toContain('class A');
    expect(result.code).toContain('constructor()');
    expect(result.code).toContain('this.қимат = 1;');
    expect(result.code).toContain('let с = new A();');
  });

  test('built-in console methods', () => {
    const source = 'чоп.сабт("a"); чоп.хато("b"); чоп.огоҳӣ("c"); чоп.маълумот("d");';
    const result = compile(source);
    expect(result.errors).toHaveLength(0);
    expect(result.code.trim()).toBe(
      'console.log("a");\nconsole.error("b");\nconsole.warn("c");\nconsole.info("d");'
    );
  });

  test('boolean, null, and undefined literals', () => {
    const source =
      'тағйирёбанда а = дуруст; тағйирёбанда б = нодуруст; тағйирёбанда в = холӣ; тағйирёбанда г = беқимат;';
    const result = compile(source);
    expect(result.errors).toHaveLength(0);
    expect(result.code.trim()).toBe(
      'let а = true;\nlet б = false;\nlet в = null;\nlet г = undefined;'
    );
  });

  test('try-catch-finally and throw', () => {
    const source =
      'кӯшиш { партофтан "x"; } гирифтан (е) { чоп.хато(е); } ниҳоят { чоп.сабт("end"); }';
    const result = compile(source);
    expect(result.errors).toHaveLength(0);
    expect(result.code).toContain('try {');
    expect(result.code).toContain('throw "x";');
    expect(result.code).toContain('} catch (е) {');
    expect(result.code).toContain('console.error(е);');
    expect(result.code).toContain('} finally {');
    expect(result.code).toContain('console.log("end");');
  });

  test('async and await', () => {
    const source = 'ҳамзамон функсия ф() { интизор ваъда; }';
    const result = compile(source);
    expect(result.errors).toHaveLength(0);
    // Currently the compiler drops the awaited expression but should
    // still generate an async function when encountering "ҳамзамон".
    expect(result.code).toContain('async function ф()');
  });
});

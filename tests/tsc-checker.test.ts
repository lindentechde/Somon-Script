/**
 * Type checking with the TypeScript compiler (`checker: 'typescript'`):
 * diagnostics at `.som` positions, Tajik type names and three languages,
 * imported `.som` modules, node_modules typings, libs by target, caching and
 * declarations.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import ts from 'typescript';
import { compile, type CompileOptions } from '../src/compiler';
import {
  cachedSourceFileCount,
  checkWithTypeScript,
  clearTypeScriptCaches,
  libFiles,
  translateMessage,
} from '../src/tsc-checker';
import { TAJIK_DIAGNOSTIC_MESSAGES } from '../src/tsc-messages-tj';
import type { Target } from '../src/targets';

jest.setTimeout(60000);

function check(source: string, options: CompileOptions = {}) {
  return compile(source, { checker: 'typescript', ...options });
}

/** `[code, line, column]` of each error. */
function positions(source: string, options: CompileOptions = {}): Array<[string, number, number]> {
  return check(source, options).errors.map(error => {
    const match = /^Type error \[(TS\d+)\] at line (\d+), column (\d+)/.exec(error);
    expect(match).not.toBeNull();
    return [match![1], Number(match![2]), Number(match![3])];
  });
}

describe('TypeScript checker: diagnostics', () => {
  test('a correct program has no errors', () => {
    const result = check(
      'функсия ҷамъ(а: рақам, б: рақам): рақам { бозгашт а + б; }\nчоп.сабт(ҷамъ(1, 2));',
      { strict: true }
    );
    expect(result.errors).toEqual([]);
    expect(result.code).toContain('function ҷамъ(а, б)');
  });

  test('errors are reported in the compiler format with Tajik type names', () => {
    const result = check('тағ х: рақам = "а";');
    expect(result.errors).toEqual([
      "Type error [TS2322] at line 1, column 5: Type 'сатр' is not assignable to type 'рақам'.\n> тағ х: рақам = \"а\";",
    ]);
  });

  test('positions point at the offending .som code', () => {
    const source = [
      'функсия ҷамъ(а: рақам, б: рақам): рақам {',
      '    бозгашт а + б;',
      '}',
      'тағ натиҷа = ҷамъ(1, "ду");',
      'собит о = { ном: "Алӣ" };',
      'чоп.сабт(о.синну);',
      'номаълум(1);',
      'тағ р: рақам[] = [1, 2];',
      'р.илова("се");',
    ].join('\n');
    expect(positions(source)).toEqual([
      ['TS2345', 4, 22],
      ['TS2339', 6, 12],
      ['TS2304', 7, 1],
      ['TS2345', 9, 9],
    ]);
  });

  test('positions inside classes, arrows, templates and types', () => {
    const source = [
      'синф Ҳисоб {',
      '    хосусӣ баланс: рақам = 0;',
      '    гузоштан(маблағ: рақам): беджавоб {',
      '        ин.баланс += маблағ.дарозӣ;',
      '    }',
      '}',
      'тағ ф = (х: сатр): рақам => х;',
      'тағ с = `${нав Ҳисоб().баланс}`;',
      'тағ н: Номаълум = 1;',
    ].join('\n');
    expect(positions(source)).toEqual([
      ['TS2339', 4, 29],
      ['TS2322', 7, 29],
      ['TS2341', 8, 24],
      ['TS2304', 9, 8],
    ]);
  });

  test('strict mode turns on TypeScript strict checks and makes errors fatal', () => {
    const source = 'функсия ф(х) { бозгашт х; }\nтағ н: рақам = холӣ;';
    const loose = check(source);
    expect(loose.errors).toEqual([]);
    expect(loose.code).not.toBe('');
    const strict = check(source, { strict: true });
    expect(strict.code).toBe('');
    expect(strict.errors.map(error => error.slice(0, 44))).toEqual([
      'Type error [TS7006] at line 1, column 11: Pa',
      'Type error [TS2322] at line 2, column 5: Typ',
    ]);
    expect(strict.errors[1]).toContain("Type 'холӣ' is not assignable to type 'рақам'.");
  });

  test('without strict, errors are reported and code is still emitted', () => {
    const result = check('тағ х: рақам = "а";\nчоп.сабт(х);');
    expect(result.errors).toHaveLength(1);
    expect(result.code).toBe('let х = "а";\nconsole.log(х);');
  });

  test('typeCheck false skips the checker', () => {
    expect(check('тағ х: рақам = "а";', { typeCheck: false }).errors).toEqual([]);
  });

  test('the TypeScript checker replaces the SomonScript checker', () => {
    // The SomonScript checker does not know `Object.groupBy`'s result; TypeScript does
    const source = 'собит р: рақам[] = [1, 2];\nсобит н: сатр = р.дар(0);';
    expect(compile(source, { strict: true }).errors).not.toEqual([]);
    expect(positions(source, { strict: true })).toEqual([['TS2322', 2, 7]]);
  });

  test('narrowing, generics, enums, namespaces and abstract classes type-check', () => {
    const source = [
      'шумориш Ранг { Сурх, Сабз }',
      'номфазо Н { содир функсия ду(х: рақам): рақам { бозгашт х * 2; } }',
      'мавҳум синф Шакл { мавҳум масоҳат(): рақам; }',
      'синф Доира мерос Шакл { конструктор(хосусӣ р: рақам) { супер(); } масоҳат(): рақам { бозгашт ин.р; } }',
      'функсия аввал<Т>(р: Т[]): Т | беқимат { бозгашт р[0]; }',
      'тағ х: рақам | холӣ = аввал([1]) ?? холӣ;',
      'агар (х !== холӣ) { чоп.сабт(х.toFixed(1), Ранг.Сабз, Н.ду(х), нав Доира(1).масоҳат()); }',
    ].join('\n');
    expect(check(source, { strict: true }).errors).toEqual([]);
  });

  test('optional parameter properties may be left out', () => {
    // Found by tests/differential.test.ts (migrate/24-parameter-properties.ts)
    const source = [
      'синф Корбар {',
      '    конструктор(хосусӣ рамз?: сатр, ҷамъиятӣ ном: сатр = "") {}',
      '    рамзДорад(): мантиқӣ { бозгашт ин.рамз !== беқимат; }',
      '}',
      'чоп.сабт(нав Корбар().рамзДорад());',
    ].join('\n');
    expect(check(source, { strict: true }).errors).toEqual([]);
  });

  test('instantiating an abstract class is an error', () => {
    expect(positions('мавҳум синф Ш {}\nнав Ш();')).toEqual([['TS2511', 2, 1]]);
  });

  test('top-level интизор and ворид.meta type-check in ES modules', () => {
    const result = check(
      'тағ х: рақам = интизор Ваъда.resolve(1);\nтағ у: сатр = ворид.meta.url;',
      {
        module: 'esm',
        strict: true,
      }
    );
    expect(result.errors).toEqual([]);
  });
});

describe('TypeScript checker: messages', () => {
  test('a Tajik member name is named with its JavaScript name', () => {
    const [error] = check('собит м = нав Map<сатр, рақам>();\nм.дорад("к");').errors;
    expect(error).toContain(
      "Property 'дорад' (includes) does not exist on type 'Map<сатр, рақам>'; use 'дорадКалид' (has) to test membership"
    );
    const [length] = check('тағ н = 5;\nчоп.сабт(н.дарозӣ);').errors;
    expect(length).toContain("Property 'дарозӣ' (length) does not exist on type 'рақам'.");
  });

  test('a JavaScript name the source does not spell in Tajik is left alone', () => {
    const [error] = check('тағ н = 5;\nчоп.сабт(н.length);').errors;
    expect(error).toContain("Property 'length' does not exist on type 'рақам'.");
  });

  test('Russian uses TypeScript’s own translation', () => {
    const result = check('тағ х: рақам = "а";\nсобит м = нав Set<рақам>();\nм.дорад(1);', {
      locale: 'ru',
    });
    expect(result.errors[0]).toContain('Тип "сатр" не может быть назначен для типа "рақам".');
    expect(result.errors[1]).toContain('"дорад" (includes)');
    expect(result.errors[1]).toContain("используйте 'дорадКалид' (has)");
  });

  test('Tajik uses the Tajik table and falls back to English', () => {
    const result = check(
      'тағ х: рақам = "а";\nсобит м = нав Set<рақам>();\nм.дорад(1);\nтағ а = 1, б = "с";\nа = а ** б;',
      { locale: 'tj' }
    );
    expect(result.errors[0]).toContain("Навъи 'сатр' ба навъи 'рақам' мувофиқ нест.");
    expect(result.errors[1]).toContain(
      "Хосияти 'дорад' (includes) дар навъи 'Set<рақам>' вуҷуд надорад; барои санҷиши мавҷудият 'дорадКалид' (has)-ро истифода баред"
    );
    expect(result.errors[2]).toContain('Тарафи рости амали арифметикӣ');
  });

  test('the locale is reset after a check', () => {
    check('тағ х: рақам = "а";', { locale: 'ru' });
    expect(check('тағ х: рақам = "а";').errors[0]).toContain("Type 'сатр' is not assignable");
  });

  test('the Tajik table covers the most common diagnostics', () => {
    expect(Object.keys(TAJIK_DIAGNOSTIC_MESSAGES).length).toBeGreaterThanOrEqual(60);
    const diagnostics = (ts as unknown as { Diagnostics: Record<string, ts.DiagnosticMessage> })
      .Diagnostics;
    const english = new Map(Object.values(diagnostics).map(d => [d.key, d.message]));
    const placeholders = (text: string) => [...new Set(text.match(/\{\d\}/g) ?? [])].sort();
    for (const [key, text] of Object.entries(TAJIK_DIAGNOSTIC_MESSAGES)) {
      // A key TypeScript knows, with the placeholders of its English message
      expect(english.has(key)).toBe(true);
      expect(placeholders(text)).toEqual(placeholders(english.get(key)!));
    }
  });

  test.each([
    [
      "Type 'number[]' is not assignable to type 'Promise<string>'.",
      "Type 'рақам[]' is not assignable to type 'Ваъда<сатр>'.",
    ],
    [
      "Type '\"number\"' is not assignable to type 'boolean'.",
      "Type '\"number\"' is not assignable to type 'мантиқӣ'.",
    ],
    [
      "Argument of type 'undefined' is not assignable to parameter of type 'Partial<И>'.",
      "Argument of type 'беқимат' is not assignable to parameter of type 'қисмӣ<И>'.",
    ],
    [
      'Тип "string | null" не может быть назначен для типа "number".',
      'Тип "сатр | холӣ" не может быть назначен для типа "рақам".',
    ],
    ["Cannot find name 'Foo'.", "Cannot find name 'Foo'."],
  ])('translateMessage(%j)', (message, expected) => {
    expect(translateMessage(message, 'en', '', 1)).toBe(expected);
  });
});

describe('TypeScript checker: modules and typings', () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'somon-tsc-'));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  function write(name: string, text: string): string {
    const file = path.join(dir, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text);
    return file;
  }

  function checkFile(name: string, source: string, options: CompileOptions = {}) {
    return check(source, { filePath: write(name, source), ...options });
  }

  test('types flow across imported .som modules', () => {
    write(
      'math.som',
      'содир функсия ҷамъ(а: рақам, б: рақам): рақам { бозгашт а + б; }\n' +
        'содир интерфейс Нуқта { х: рақам; }\n' +
        'содир пешфарз синф Ҳисоб { қимат = 1; }\n' +
        'содир функсия илова(х: рақам): рақам { бозгашт х; }\n'
    );
    write('lib/index.som', 'содир собит ном: сатр = "lib";\n');
    const ok = checkFile(
      'main.som',
      'ворид Ҳисоб, { ҷамъ, Нуқта, илова } аз "./math";\nворид * чун Л аз "./lib";\n' +
        'собит н: Нуқта = { х: ҷамъ(1, 2) };\nчоп.сабт(н, нав Ҳисоб().қимат, илова(1), Л.ном);',
      { strict: true }
    );
    expect(ok.errors).toEqual([]);

    const bad = checkFile(
      'bad.som',
      'ворид { ҷамъ, тарҳ } аз "./math.som";\nтағ с: сатр = ҷамъ(1, 2);',
      { strict: true }
    );
    const where = (error: string) =>
      /\[(TS\d+)\] at line (\d+), column (\d+)/.exec(error)!.slice(1).join(':');
    expect(bad.errors.map(where)).toEqual(['TS2614:1:15', 'TS2322:2:5']);
  });

  test('an imported module is re-read when it changes', () => {
    write('a.som', 'содир собит х: рақам = 1;\n');
    const source = 'ворид { х } аз "./a";\nтағ у: рақам = х;';
    expect(checkFile('main.som', source).errors).toEqual([]);
    write('a.som', 'содир собит х: сатр = "1";\n');
    expect(checkFile('main.som', source).errors).toHaveLength(1);
  });

  test('a module that does not exist is an error', () => {
    expect(positions('ворид { х } аз "./нест";', { filePath: path.join(dir, 'main.som') })).toEqual(
      [['TS2307', 1, 16]]
    );
  });

  test('node_modules typings: package types, @types and .ts files', () => {
    write(
      'node_modules/hisob/package.json',
      JSON.stringify({ name: 'hisob', version: '1.0.0', types: 'index.d.ts', main: 'index.js' })
    );
    write(
      'node_modules/hisob/index.d.ts',
      'export declare function zarb(a: number, b: number): number;\n'
    );
    write('node_modules/hisob/index.js', 'exports.zarb = (a, b) => a * b;\n');
    write('node_modules/@types/kalima/index.d.ts', 'export declare const kalima: string;\n');
    write('node_modules/kalima/package.json', JSON.stringify({ name: 'kalima', main: 'index.js' }));
    write('node_modules/kalima/index.js', 'exports.kalima = "салом";\n');
    write('helpers.ts', 'export const sum = (a: number, b: number): number => a + b;\n');
    const source =
      'ворид { zarb } аз "hisob";\nворид { kalima } аз "kalima";\nворид { sum } аз "./helpers.js";\n' +
      'тағ а: рақам = zarb(2, 3);\nтағ б: рақам = kalima;\nтағ в: сатр = sum(1, 2);';
    expect(positions(source, { filePath: write('main.som', source), strict: true })).toEqual([
      ['TS2322', 5, 5],
      ['TS2322', 6, 5],
    ]);
  });

  test('several files share one program', () => {
    const results = checkWithTypeScript(
      [
        { fileName: path.join(dir, 'a.som'), source: 'содир собит а: рақам = 1;' },
        { fileName: path.join(dir, 'b.som'), source: 'ворид { а } аз "./a";\nтағ б: сатр = а;' },
      ],
      { strict: true }
    );
    expect(results.map(result => result.errors.length)).toEqual([0, 1]);
    expect(results[1].fileName).toBe(path.join(dir, 'b.som'));
  });
});

describe('TypeScript checker: the TypeScript 5 declaration syntax', () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'somon-tsc-ts5-'));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  function write(name: string, text: string): string {
    const file = path.join(dir, name);
    fs.writeFileSync(file, text);
    return file;
  }

  test('ambient modules declare the modules they name', () => {
    const declared = 'эълон модул "китобхона" {\n    содир функсия ҳисоб(а: рақам): рақам;\n}\n';
    expect(
      positions(`${declared}ворид { ҳисоб } аз "китобхона";\nтағ х: сатр = ҳисоб(1);`)
    ).toEqual([['TS2322', 5, 5]]);
    // Errors in their bodies are reported at their place
    expect(positions('эълон модул "м" {\n    содир функсия ф(а: Нест): рақам;\n}')).toEqual([
      ['TS2304', 2, 24],
    ]);
    // Also those of a module the program imports
    write('types.som', declared);
    const main = 'ворид "./types";\nворид { ҳисоб } аз "китобхона";\nтағ х: сатр = ҳисоб(1);';
    expect(
      check(main, { filePath: write('main.som', main) }).errors.map(error => error.split('\n')[0])
    ).toEqual([
      "Type error [TS2322] at line 3, column 5: Type 'рақам' is not assignable to type 'сатр'.",
    ]);
  });

  test('module names in messages are readable', () => {
    const [error] = check(
      'эълон модул "китоб" { содир собит а: рақам; }\nворид { б } аз "китоб";'
    ).errors;
    expect(error).toContain('"китоб"');
    expect(error).not.toContain('\\u');
  });

  test('`ворид х = require(…)` and `содир = …`', () => {
    write('value.som', 'синф Ҳисобгар { қимат = 42; }\nсодир = Ҳисобгар;\n');
    const main = 'ворид Ҳ = require("./value");\nтағ х: сатр = нав Ҳ().қимат;';
    expect(positions(main, { filePath: write('main.som', main), strict: true })).toEqual([
      ['TS2322', 2, 5],
    ]);
    const node = 'ворид fs = require("fs");\nтағ х: рақам = fs.existsSync("а");';
    // node_modules typings, from the current directory's packages
    expect(positions(node)).toEqual([['TS2322', 2, 5]]);
  });

  test('overloads, override, abstract members, `ин` parameters and accessors', () => {
    expect(
      positions(
        [
          'функсия ф(х: рақам): рақам;',
          'функсия ф(х: сатр): сатр;',
          'функсия ф(х: ҳар): ҳар { бозгашт х; }',
          'тағ а: сатр = ф(1);',
          'синф А { м(): рақам { бозгашт 1; } }',
          'синф Б мерос А { бознавис н(): рақам { бозгашт 2; } }',
          'мавҳум синф Ш { мавҳум масоҳат(): рақам; }',
          'синф Д мерос Ш {}',
          'функсия г(ин: А, х: рақам): рақам { бозгашт ин.м() + х; }',
          'г(1);',
          'синф К { дастрасӣ қ = 1; }',
          'тағ қ: сатр = нав К().қ;',
        ].join('\n'),
        { strict: true }
      )
    ).toEqual([
      ['TS2322', 4, 5],
      ['TS4113', 6, 27],
      // TypeScript 6 names the member that is missing (TS2515); 5 said "all abstract members" (TS18052)
      ['TS2515', 8, 6],
      ['TS2684', 10, 1],
      ['TS2322', 12, 5],
    ]);
  });

  test('parameter decorators need experimentalDecorators, as in TypeScript', () => {
    const source =
      'функсия д(ҳадаф: объект, ном: сатр | беқимат, ҷой: рақам): беджавоб {}\n' +
      'синф К { м(@д х: рақам): беджавоб {} }';
    expect(check(source, { experimentalDecorators: true }).errors).toEqual([]);
    const standard =
      'функсия д(қимат: ҳар, контекст: ClassMethodDecoratorContext): беджавоб {}\n' +
      'синф К { @д м(): беджавоб {} }';
    expect(check(standard, { strict: true }).errors).toEqual([]);
  });

  test('`истифода` checks Symbol.dispose', () => {
    expect(
      positions(
        'функсия ф(о: { а: рақам }) {\n    истифода р = { [Symbol.dispose]() {} };\n    истифода н = о;\n}',
        { strict: true }
      )
    ).toEqual([['TS2850', 3, 18]]);
  });
});

describe('TypeScript checker: libs and targets', () => {
  test('the default lib is the target’s, with esnext.disposable for `истифода`', () => {
    const dom = ['lib.dom.d.ts', 'lib.dom.iterable.d.ts', 'lib.dom.asynciterable.d.ts'];
    expect(libFiles(undefined, undefined)).toEqual([
      'lib.es2022.d.ts',
      ...dom,
      'lib.esnext.disposable.d.ts',
    ]);
    expect(libFiles('esnext', undefined)).toEqual(['lib.esnext.d.ts', ...dom]);
    expect(libFiles('es5', undefined)).toEqual(['lib.es5.d.ts', 'lib.dom.d.ts']);
    // An unknown target is the default one
    expect(libFiles('es2099' as Target, undefined)).toEqual(libFiles(undefined, undefined));
    expect(libFiles('es2024', undefined)[0]).toBe('lib.es2024.d.ts');
    expect(libFiles('es2025', undefined)).toEqual([
      'lib.es2025.d.ts',
      ...dom,
      'lib.esnext.disposable.d.ts',
    ]);
    expect(libFiles('es2020', ['ES2022', 'dom.iterable', 'lib.webworker.d.ts'])).toEqual([
      'lib.es2022.d.ts',
      'lib.dom.iterable.d.ts',
      'lib.webworker.d.ts',
    ]);
  });

  test('newer built-ins need a newer target', () => {
    const source = 'собит р = [1, 2];\nчоп.сабт(р.findLast(х => х > 0));';
    expect(positions(source, { target: 'es2020' })).toEqual([['TS2550', 2, 12]]);
    expect(check(source, { target: 'esnext' }).errors).toEqual([]);
  });

  test('lib names choose the declarations', () => {
    const [noDom] = checkWithTypeScript(
      [{ fileName: 'a.som', source: 'чоп.сабт(document.title);' }],
      { lib: ['es2020'] }
    );
    expect(noDom.errors.map(error => error.code)).toEqual(['TS2584']);
    const [withDom] = checkWithTypeScript(
      [{ fileName: 'a.som', source: 'чоп.сабт(document.title);' }],
      { lib: ['es2020', 'dom'] }
    );
    expect(withDom.errors).toEqual([]);
  });

  test('a diagnostic without a .som position is reported at line 1', () => {
    const [result] = checkWithTypeScript([{ fileName: 'a.som', source: 'тағ х = 1;' }], {
      lib: ['es2020', 'нест'],
    });
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toMatchObject({ line: 1, column: 1 });
  });
});

describe('TypeScript checker: caching', () => {
  test('lib and typing files are parsed once and reused', () => {
    clearTypeScriptCaches();
    expect(cachedSourceFileCount()).toBe(0);
    check('тағ х = 1;');
    const cached = cachedSourceFileCount();
    expect(cached).toBeGreaterThan(1);
    const start = Date.now();
    for (let i = 0; i < 5; i++) check(`тағ х${i}: рақам = ${i};`);
    expect(cachedSourceFileCount()).toBe(cached);
    expect(Date.now() - start).toBeLessThan(10000);
  });
});

describe('declarations', () => {
  test('declaration: true returns .d.ts text', () => {
    const result = compile(
      'содир функсия ҷамъ(а: рақам, б: рақам): рақам { бозгашт а + б; }\n' +
        'содир интерфейс Корбар { ном: сатр; синну?: рақам; }\n' +
        'содир синф Ҳисоб { конструктор(хосусӣ танҳохонӣ х: рақам) {} илова(н: рақам): ин { бозгашт ин; } }\n' +
        'содир шумориш Ранг { Сурх }\n' +
        'содир навъ Ид = рақам | сатр;\n' +
        'содир собит рӯз: Ид = 1;',
      { declaration: true }
    );
    expect(result.errors).toEqual([]);
    expect(result.declaration).toBe(
      [
        'export declare function ҷамъ(а: number, б: number): number;',
        'export interface Корбар {',
        '    ном: string;',
        '    синну?: number;',
        '}',
        'export declare class Ҳисоб {',
        '    private readonly х;',
        '    constructor(х: number);',
        '    push(н: number): this;',
        '}',
        'export declare enum Ранг {',
        '    Сурх = 0',
        '}',
        'export type Ид = number | string;',
        'export declare const рӯз: Ид;',
        '',
      ].join('\n')
    );
  });

  test('declarations with each checker and without type checking', () => {
    const source = 'содир собит х = 1;';
    expect(compile(source, { declaration: true, checker: 'typescript' }).declaration).toBe(
      'export declare const х = 1;\n'
    );
    expect(compile(source, { declaration: true, typeCheck: false }).declaration).toBe(
      'export declare const х = 1;\n'
    );
    expect(compile(source).declaration).toBeUndefined();
  });

  test('no declarations when strict type errors stop the compilation', () => {
    const result = compile('содир собит х: рақам = "а";', {
      declaration: true,
      checker: 'typescript',
      strict: true,
    });
    expect(result.code).toBe('');
    expect(result.declaration).toBeUndefined();
  });

  test('declarations import other modules by their emitted names', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'somon-dts-'));
    try {
      fs.writeFileSync(path.join(dir, 'a.som'), 'содир интерфейс Нуқта { х: рақам; }\n');
      const source =
        'ворид { Нуқта } аз "./a";\nсодир функсия нуқта(): Нуқта { бозгашт { х: 1 }; }';
      const result = compile(source, { declaration: true, filePath: path.join(dir, 'main.som') });
      expect(result.declaration).toBe(
        'import { Нуқта } from "./a.js";\nexport declare function нуқта(): Нуқта;\n'
      );
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

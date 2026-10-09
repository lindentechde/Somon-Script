import { compile } from '../src/compiler';

/**
 * End-to-end behaviour: each program is compiled with the default options
 * (type checking on), executed, and its `чоп.сабт` output compared with the
 * values JavaScript would print. Most cases are repros from the project
 * review where the compiler used to emit wrong code without any error.
 */
function run(source: string): string[] {
  const result = compile(source);
  expect(result.errors).toEqual([]);
  const lines: string[] = [];
  const log = (...args: unknown[]) => lines.push(args.map(String).join(' '));
  new Function('console', result.code)({ log });
  return lines;
}

const cases: Array<[string, string, string[]]> = [
  [
    'grouping parentheses survive code generation',
    'тағ а = 1; тағ б = 2; тағ в = 3;\n' +
      'чоп.сабт(а - (б - в), 10 - (3 - 1), -(а + б), !(а == б), (а + б).toFixed(1));',
    ['2 8 -3 true 3.0'],
  ],
  ['double negation is not a decrement', 'тағ н = 5; чоп.сабт(- -н, -(-н), н);', ['5 5 5']],
  ['exponent is right-associative', 'чоп.сабт(2 ** 10, 2 ** 3 ** 2);', ['1024 512']],
  [
    'conditional and nullish operators',
    'тағ а = 3; тағ б = 7; тағ в = холӣ;\nчоп.сабт(а > б ? а : б, в ?? "пешфарз");',
    ['7 пешфарз'],
  ],
  [
    'optional chaining',
    'тағ о = { а: { б: 1 } };\nтағ х = холӣ;\nчоп.сабт(о?.а?.б, х?.б);',
    ['1 undefined'],
  ],
  [
    'spread in arrays, objects and calls',
    'тағ м = [1, 2];\nтағ н = [...м, 3];\nтағ о = { ...{ з: 4 }, и: 5 };\n' +
      'чоп.сабт(н.join(","), о.з + о.и, Math.max(...м));',
    ['1,2,3 9 2'],
  ],
  [
    'default and rest parameters',
    'функсия ф(а = 5, ...б) { бозгашт а + б.length; }\nчоп.сабт(ф(), ф(1, 2, 3));',
    ['5 3'],
  ],
  ['arrow returning an object literal', 'тағ ф = () => ({ x: 1 });\nчоп.сабт(ф().x);', ['1']],
  [
    'shorthand object destructuring',
    'тағ о = { п: 1, р: 2 };\nсобит { п, р } = о;\nчоп.сабт(п + р);',
    ['3'],
  ],
  [
    'template literal escapes and interpolation',
    'тағ х = 1;\nчоп.сабт(`a\\`b`, `\\${х}`, `C:\\\\temp`, `${х > 0 ? "мусбат" : "манфӣ"}`);',
    ['a`b ${х} C:\\temp мусбат'],
  ],
  [
    'call statements are never dropped',
    'функсия ҳисобкунӣ(қиматҳо) { чоп.сабт("ҳисоб", қиматҳо); }\nҳисобкунӣ(1);\n' +
      'функсия ф(x) { чоп.сабт("ф", x); }\nтағ my_val = 2;\nф(my_val);',
    ['ҳисоб 1', 'ф 2'],
  ],
  [
    'user properties named like builtins round-trip',
    'тағ о = { дарозӣ: 5, филтр: "x" };\nчоп.сабт(о.дарозӣ, о.филтр);',
    ['5 x'],
  ],
  [
    'catch without a binding does not shadow an outer error',
    'тағ error = "берун";\nкӯшиш { партофтан нав Хато("x"); } гирифтан { чоп.сабт(error); }',
    ['берун'],
  ],
  [
    'new with a member-expression callee',
    'синф Б { салом() { бозгашт "б"; } }\nтағ о = { Б: Б };\nтағ х = нав о.Б();\nчоп.сабт(х.салом());',
    ['б'],
  ],
  [
    'numeric literal forms',
    'чоп.сабт(0xFF, 1e3, 1_000, .5, 0b101, 0o17, 10n + 5n);',
    ['255 1000 1000 0.5 5 15 15'],
  ],
  [
    'prefixed BigInt literals stay BigInts',
    'тағ в = 0x10n;\nчоп.сабт(в, 0o7n, 0b11n, навъи в, навъи 0b1n, навъи 0o7n, 0xFFn * 2n);',
    ['16 7 3 bigint bigint bigint 510'],
  ],
  [
    'expressions spanning several lines',
    'тағ а = 1 +\n  2;\nчоп.сабт(а, [1, 2, 3]\n  .map(х => х * 2)\n  .join(","));',
    ['3 2,4,6'],
  ],
  ['string escape sequences', 'чоп.сабт("A\\u0041|\\x41|\\u{1F600}".length);', ['7']],
  [
    'ваъда is the Promise constructor',
    'тағ п = нав Ваъда(р => р(1));\nчоп.сабт(п instanceof Promise);',
    ['true'],
  ],
  [
    'subclass instances are accepted where the base class is expected',
    'синф Ҳайвон { ном: сатр = "ҳайвон"; }\nсинф Саг мерос Ҳайвон { }\n' +
      'тағйирёбанда а: Ҳайвон = нав Саг();\nчоп.сабт(а.ном);',
    ['ҳайвон'],
  ],
  [
    'interfaces inherit members from every parent',
    'интерфейс Асос { ид: рақам; }\nинтерфейс Ном { ном: сатр; }\n' +
      'интерфейс Кӯдак мерос Асос, Ном { синну: рақам; }\n' +
      'функсия гир(б: Асос): рақам { бозгашт б.ид; }\n' +
      'тағйирёбанда к: Кӯдак = { ид: 1, ном: "а", синну: 3 };\nчоп.сабт(гир(к), к.ном);',
    ['1 а'],
  ],
  [
    'async class methods',
    'синф Хизмат {\n  ҷамъиятӣ статикӣ ҳамзамон ном(): Promise<сатр> { бозгашт "хизмат"; }\n}\n' +
      'чоп.сабт(навъи Хизмат.ном, Хизмат.ном() instanceof Promise);',
    ['function true'],
  ],
  [
    'function type annotations',
    'тағйирёбанда ҷамъ: (а: рақам, б: рақам) => рақам = (а, б) => а + б;\n' +
      'функсия татбиқ(ф: (х: рақам) => рақам, х: рақам): рақам { бозгашт ф(х); }\n' +
      'чоп.сабт(ҷамъ(1, 2), татбиқ(х => х * 10, 4));',
    ['3 40'],
  ],
  [
    'named tuple members',
    'тағ нуқта: [х: рақам, у: рақам] = [41.2, 69.1];\nчоп.сабт(нуқта[0] + нуқта[1]);',
    ['110.3'],
  ],
  [
    'functions may reference variables declared after them',
    'функсия салом() { чоп.сабт(паём); }\nтағйирёбанда паём = "салом";\nсалом();',
    ['салом'],
  ],
];

describe('compiled programs behave like the source says', () => {
  test.each(cases)('%s', (_name, source, expected) => {
    expect(run(source)).toEqual(expected);
  });
});

describe('invalid programs fail instead of emitting wrong code', () => {
  test.each([
    ['a syntax error', 'чоп.сабт(1 +);'],
    ['a JavaScript reserved word as a name', 'тағ class = 1;'],
    ['an unterminated block comment', 'чоп.сабт(1);\n/* never closed\nчоп.сабт(2);'],
    ['a malformed number', 'тағ а = 10px;'],
    ['an unsupported multi-declarator', 'тағ а = 1, б = 2;'],
  ])('%s', (_name, source) => {
    const result = compile(source);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.code).toBe('');
  });
});

test('a value that does not match a function type is a type error', () => {
  const result = compile('тағйирёбанда ф: (а: рақам) => рақам = 5;');
  expect(result.errors).toEqual([expect.stringContaining('TYPE_NOT_ASSIGNABLE')]);
});

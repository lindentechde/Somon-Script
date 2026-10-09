import { compile, CompileOptions } from '../src/compiler';

/**
 * End-to-end behaviour: each program is compiled with the default options
 * (type checking on), executed, and its `чоп.сабт` output compared with the
 * values JavaScript would print. Most cases are repros from the project
 * review where the compiler used to emit wrong code without any error.
 */
function run(source: string, options: CompileOptions = {}): string[] {
  const result = compile(source, options);
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
    'parentheses end an optional chain',
    'тағ о: ҳар = холӣ;\nтағ п = { а: { б: 2 }, ф: () => 3 };\n' +
      'кӯшиш { чоп.сабт((о?.а).б); } гирифтан (х) { чоп.сабт("а", х instanceof TypeError); }\n' +
      'кӯшиш { чоп.сабт((о?.ф)()); } гирифтан (х) { чоп.сабт("ф", х instanceof TypeError); }\n' +
      'чоп.сабт((п?.а).б, (п?.ф)(), о?.а.б, (о?.а)?.б);',
    ['а true', 'ф true', '2 3 undefined undefined'],
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
    'comments inside a template interpolation',
    "тағ н = 1;\nчоп.сабт(`8:${ н // }\n}`, `${ /* } */ н }`, `${ н /* it's */ }`, `${ `${ н // }\n}` }`);",
    ['8:1 1 1 1'],
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
    'namespace members named like builtins',
    'номфазо Н {\n  содир функсия илова(): рақам { бозгашт 1; }\n  содир собит филтр = 2;\n' +
      '  содир номфазо Д { содир собит х = 3; }\n}\nчоп.сабт(Н.илова(), Н.филтр, Н.Д.х);',
    ['1 2 3'],
  ],
  [
    'statements inside a namespace body',
    'номфазо Н {\n  тағ а = 1;\n  чоп.сабт("дар", а);\n  содир собит б = а + 1;\n}\nчоп.сабт(Н.б);',
    ['дар 1', '2'],
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

/**
 * Destructuring loop heads bind every name of the pattern: the program must
 * compile without "not defined" errors in strict mode too, and run.
 */
describe('destructuring in for-of and for-in heads', () => {
  const loops: Array<[string, string, string[]]> = [
    [
      'entries of an object',
      'собит о = { а: 1, б: 2 };\nбарои (тағ [к, в] аз объект.воридот(о)) { чоп.сабт(к, в); }',
      ['а 1', 'б 2'],
    ],
    [
      'an array of arrays, reassigning a тағйирёбанда binding',
      'барои (тағйирёбанда [н, ном] аз [[1, "як"], [2, "ду"]]) { ном = ном + "!"; чоп.сабт(н, ном); }',
      ['1 як!', '2 ду!'],
    ],
    [
      'a Map',
      'собит м = нав Map([["x", 10], ["y", 20]]);\nбарои (собит [к, в] аз м) { чоп.сабт(к, в * 2); }',
      ['x 20', 'y 40'],
    ],
    [
      'a typed Map',
      'собит м: Map<сатр, рақам> = нав Map([["x", 1]]);\n' +
        'барои (собит [к, в] аз м.entries()) { чоп.сабт(к.toUpperCase(), в + 1); }',
      ['X 2'],
    ],
    [
      'typed tuples',
      'собит ҷуфтҳо: [рақам, сатр][] = [[1, "а"], [2, "б"]];\n' +
        'барои (собит [н, с] аз ҷуфтҳо) { собит х: рақам = н; собит й: сатр = с; чоп.сабт(х + й); }',
      ['1а', '2б'],
    ],
    [
      'an object pattern with a default',
      'барои (собит { ном, син = 0 } аз [{ ном: "Алӣ", син: 30 }, { ном: "Вали" }]) {\n' +
        '  чоп.сабт(ном, син);\n}',
      ['Алӣ 30', 'Вали 0'],
    ],
    [
      'array defaults and holes',
      'барои (собит [к, в = 0] аз [["а"], ["б", 5]]) чоп.сабт(к, в);\n' +
        'барои (собит [, дуюм] аз [[1, 2]]) чоп.сабт(дуюм);',
      ['а 0', 'б 5', '2'],
    ],
    [
      'rest elements',
      'барои (собит [сар, ...боқӣ] аз [[1, 2, 3], [4]]) { чоп.сабт(сар, боқӣ.length); }\n' +
        'барои (собит { а, ...боқӣ } аз [{ а: 1, б: 2, в: 3 }]) {\n' +
        '  чоп.сабт(а, объект.калидҳо(боқӣ).join(","));\n}',
      ['1 2', '4 0', '1 б,в'],
    ],
    [
      'nested patterns',
      'барои (собит [а, [б, { в }]] аз [[1, [2, { в: 3 }]]]) { чоп.сабт(а + б + в); }\n' +
        'барои (собит { а: { б: [в = 9, г] } } аз [{ а: { б: [беқимат, 7] } }]) { чоп.сабт(в, г); }',
      ['6', '9 7'],
    ],
    [
      'for-in with array and object patterns',
      'барои (собит [аввал, ...боқӣ] дар { абв: 1, гд: 2 }) { чоп.сабт(аввал, боқӣ.join("")); }\n' +
        'барои (тағ { length } дар { абв: 1 }) { чоп.сабт(length); }',
      ['а бв', 'г д', '3'],
    ],
    [
      'names of built-ins shadowed by the pattern',
      'барои (собит [объект, сатр] аз [[1, 2]]) { чоп.сабт(объект + сатр); }\n' +
        'чоп.сабт(объект.калидҳо({ к: 1 }).join(""));',
      ['3', 'к'],
    ],
    [
      'a loop body may redeclare a destructured name',
      'барои (собит [к] аз [[1]]) { собит к = 2; чоп.сабт(к); }',
      ['2'],
    ],
  ];

  test.each(loops)('%s', (_name, source, expected) => {
    expect(run(source)).toEqual(expected);
    expect(run(source, { strict: true })).toEqual(expected);
    expect(run(source, { typeCheck: false })).toEqual(expected);
  });
});

/**
 * TypeScript-only expression operators are erased: `х чун Т`, `<Т>х`,
 * `х чун собит`, `х бармесоё Т`, `х!`, definite assignment `х!: Т` and type
 * parameters of arrow functions. The programs must compile without type
 * errors (strict mode included) and run.
 */
describe('TypeScript assertion operators', () => {
  const programs: Array<[string, string, string[]]> = [
    [
      'type assertions with чун, as and <Т>',
      'собит а: ношинос = "салом";\nсобит б: ҳар = 2;\n' +
        'чоп.сабт((а чун сатр).length, (а as сатр).length, (<сатр>а).length);\n' +
        'чоп.сабт(б + 1 чун рақам, (б + 1 чун рақам) * 2, а чун ношинос чун сатр, (5 чун рақам).toFixed(1));',
      ['5 5 5', '3 6 салом 5.0'],
    ],
    [
      'an assertion narrows a caught error',
      'кӯшиш { партофтан нав Хато("бад"); } гирифтан (е) { чоп.сабт((е чун Хато).message); }',
      ['бад'],
    ],
    [
      'non-null assertions in every position',
      'синф Г { қ = 1; н: Г | холӣ = холӣ; р: рақам[] | холӣ = [7]; ф(): Г | холӣ { бозгашт ин; } }\n' +
        'собит г: Г | холӣ = нав Г();\nсобит м = нав Map<сатр, рақам>();\nм.гузоштан("а", 1);\n' +
        'собит а: рақам = м.бозгирифтан("а")!;\n' +
        'чоп.сабт(г!.қ, г!.р![0], г!.ф()!.қ, а + 1, м.бозгирифтан("а")! * 2, (г!), г!.н?.қ);\n' +
        'чоп.сабт(а != 2, а !== 1, !г, !г!);',
      ['1 7 1 2 2 [object Object] undefined', 'true false false false'],
    ],
    [
      'non-null assertions as assignment targets',
      'тағ х: рақам | холӣ = холӣ;\nх! = 5;\nчоп.сабт(х + 1);\n' +
        'тағ у: рақам | беқимат = 3;\nу!++;\nу! += 2;\nчоп.сабт(у);\n' +
        'тағ о: ҳар = { а: 1 };\n(о чун { а: рақам }).а = 4;\nчоп.сабт(о.а);',
      ['6', '6', '4'],
    ],
    [
      'a non-null assertion inside an optional chain keeps the chain',
      'собит о: ҳар = холӣ;\nчоп.сабт(о?.а!.б);\n' +
        'кӯшиш { чоп.сабт((о?.а!).б); } гирифтан (х) { чоп.сабт("хато"); }',
      ['undefined', 'хато'],
    ],
    [
      'as const and satisfies',
      'интерфейс И { а: рақам; б?: сатр; }\n' +
        'собит р = [1, 2] чун собит;\nсобит о = { а: 1 } бармесоё И;\n' +
        'собит т = { н: "а", м: [1, 2] } чун собит;\n' +
        'чоп.сабт(р.length, р[0] + р[1], о.а, т.н, т.м.length, <собит>["к"]);',
      ['2 3 1 а 2 к'],
    ],
    [
      'definite assignment assertions',
      'тағ х!: рақам;\nх = 3;\nтағйирёбанда у!: сатр;\nу = "у";\n' +
        'синф К { ном!: сатр; конструктор() { ин.насб(); } насб(): беджавоб { ин.ном = "к"; } }\n' +
        'чоп.сабт(х, у, нав К().ном);',
      ['3 у к'],
    ],
    [
      'generic arrow functions',
      'собит ҳамон = <Т>(х: Т): Т => х;\nсобит ҷуфт = <Т, К,>(а: Т, б: К): [Т, К] => [а, б];\n' +
        'собит дароз = <Т мерос сатр>(х: Т): рақам => х.length;\n' +
        'собит рӯйхат = <Т>(х: Т) => { бозгашт [х, х]; };\n' +
        'чоп.сабт(ҳамон(3), ҷуфт(1, "а").join("-"), дароз("абв"), рӯйхат(2).length, 1 < 2, 2 > 1);',
      ['3 1-а 3 2 true true'],
    ],
    [
      'the contextual keywords stay ordinary names',
      'тағ бармесоё = 1;\nсобит as = 2;\nсобит satisfies = 3;\n' +
        'бармесоё = бармесоё + as\nчоп.сабт(бармесоё, satisfies, { as }.as);',
      ['3 3 2'],
    ],
  ];

  test.each(programs)('%s', (_name, source, expected) => {
    expect(run(source)).toEqual(expected);
    expect(run(source, { strict: true })).toEqual(expected);
    expect(run(source, { typeCheck: false })).toEqual(expected);
  });

  test('async generic arrow functions', async () => {
    const result = compile(
      'собит ф = ҳамзамон <Т>(х: Т): Ваъда<Т> => х;\nф(4).then(х => чоп.сабт(х));',
      {
        strict: true,
      }
    );
    expect(result.errors).toEqual([]);
    expect(result.code).toContain('const ф = async (х) => х;');
    const lines: string[] = [];
    new Function('console', result.code)({
      log: (...args: unknown[]) => lines.push(args.join(' ')),
    });
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(lines).toEqual(['4']);
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

/**
 * Programs JavaScript rejects with an early error must be compile errors, with
 * or without type checking, instead of output node refuses to load.
 */
describe('JavaScript early errors are compile errors', () => {
  test.each([
    ['a binary expression as assignment target', 'тағ а = 1;\nа + 1 = 2;', /left-hand side/],
    ['a unary expression as compound target', 'тағ а = 1;\n-а *= 3;', /left-hand side/],
    ['a literal as assignment target', '5 = 3;', /left-hand side/],
    ['a call as assignment target', 'функсия ф() {}\nф() = 1;', /left-hand side/],
    ['an optional chain as assignment target', 'тағ о = {};\nо?.а = 1;', /left-hand side/],
    ['a pattern with compound assignment', 'тағ а = 1;\n[а] += 1;', /left-hand side/],
    [
      'an invalid element in a destructuring target',
      'тағ а = 1;\n[а + 1] = [2];',
      /left-hand side/,
    ],
    ['a prefix update of an expression', 'тағ а = 1;\n++(а + 1);', /operand/],
    ['a postfix update of a call', 'функсия ф() {}\nф()++;', /operand/],
    ['a constant without initializer', 'собит а: рақам;', /initializer/],
    ['break outside a loop', 'шикастан;', /break/],
    ['continue outside a loop', 'давом;', /continue/],
    ['continue in a switch outside a loop', 'интихоб (1) { ҳолат 1: давом; }', /continue/],
    ['break in a function inside a loop', 'то (дуруст) { функсия ф() { шикастан; } }', /break/],
    ['let declared twice', 'тағ а = 1;\nтағ а = 2;', /'а' has already been declared/],
    ['function and let', 'функсия а() {}\nтағ а = 1;', /'а' has already been declared/],
    ['class declared twice', 'синф Б {}\nсинф Б {}', /'Б' has already been declared/],
    ['function declared twice', 'функсия а() {}\nфунксия а() {}', /'а' has already been declared/],
    [
      'a body-level let named like a parameter',
      'функсия ф(п: рақам) { тағ п = 2; }',
      /'п' has already been declared/,
    ],
    [
      'a let named like the catch parameter',
      'кӯшиш { } гирифтан (х) { тағ х = 1; }',
      /'х' has already been declared/,
    ],
    [
      'one switch body is one scope',
      'интихоб (1) { ҳолат 1: тағ х = 1; шикастан; ҳолат 2: тағ х = 2; шикастан; }',
      /'х' has already been declared/,
    ],
    ['break in a namespace inside a loop', 'то (дуруст) { номфазо Н { шикастан; } }', /break/],
    [
      'a namespace member named like the namespace',
      'номфазо Н { тағ Н = 1; }',
      /'Н' has already been declared/,
    ],
    ['an import and a let', 'ворид { а } аз "./м";\nтағ а = 1;', /'а' has already been declared/],
    ['a name bound twice in a pattern', 'собит [а, а] = [1, 2];', /'а' has already been declared/],
    [
      'a name bound twice in a for-of pattern',
      'барои (собит [а, { б: а }] аз []) {}',
      /'а' has already been declared/,
    ],
    [
      'a name bound twice in a for-in pattern',
      'барои (тағ { а, ...а } дар {}) {}',
      /'а' has already been declared/,
    ],
    [
      'a name bound twice in a for-loop pattern',
      'барои (тағ [а, а] = [1, 2]; а < 2; а++) {}',
      /'а' has already been declared/,
    ],
    ['an asserted optional chain as target', 'тағ о = {};\nо?.а! = 1;', /left-hand side/],
    ['a satisfies expression as target', 'тағ а = 1;\n(а бармесоё рақам) = 2;', /left-hand side/],
    ['an asserted binary expression as target', 'тағ а = 1;\n(а + 1)! = 2;', /left-hand side/],
    ['a postfix update of an asserted call', 'функсия ф() {}\nф()!++;', /operand/],
    ['a type assertion before **', 'тағ а = 1;\n<рақам>а ** 2;', /must be parenthesized/],
    ['break to an undefined label', 'то (дуруст) { шикастан берун; }', /Undefined label 'берун'/],
    [
      'continue to a label that is not a loop',
      'то (дуруст) { блок: { давом блок; } }',
      /'блок' does not label a loop/,
    ],
    [
      'a label nested in a label of the same name',
      'л: барои (тағ и = 0; и < 1; и++) { л: то (дуруст) {} }',
      /Label 'л' has already been declared/,
    ],
    ['a labeled declaration', 'л: тағ х = 1;', /declaration cannot be labeled/],
    ['for await outside a ҳамзамон function', 'барои интизор (собит х аз []) {}', /for await/],
  ])('%s', (_name, source, message) => {
    for (const typeCheck of [true, false]) {
      const result = compile(source, { typeCheck });
      expect(result.errors).toEqual(expect.arrayContaining([expect.stringMatching(message)]));
      expect(result.errors.join('\n')).toMatch(/line \d+, column \d+/);
      expect(result.code).toBe('');
    }
  });

  test('legal shadowing, loops and assignment targets still compile', () => {
    const lines = run(
      'тағ а = 1;\n' +
        'агар (дуруст) { тағ а = 2; чоп.сабт(а); }\n' +
        'функсия ф(п: рақам) { агар (дуруст) { тағ п = 3; бозгашт п; } бозгашт п; }\n' +
        'функсия г(п: рақам) { функсия п() { бозгашт 4; } бозгашт п(); }\n' +
        'барои (тағ и = 0; и < 1; и++) { тағ и = 5; чоп.сабт(и); }\n' +
        'интихоб (1) { ҳолат 1: { тағ х = 6; чоп.сабт(х); шикастан; } ҳолат 2: { тағ х = 7; шикастан; } }\n' +
        'кӯшиш { партофтан 1; } гирифтан (х) { агар (дуруст) { тағ х = 8; чоп.сабт(х); } }\n' +
        'то (дуруст) { интихоб (1) { ҳолат 1: шикастан; } агар (дуруст) { шикастан; } давом; }\n' +
        'тағ о = { б: 1, в: [0] };\n' +
        'тағ б = 0; тағ в = 0;\n' +
        '[а, б] = [б, а]; ({ б, в } = о); [о.б, ...о.в] = [9, 10]; (а) = а + 1; о.в[0] += 1; о.б++;\n' +
        'чоп.сабт(ф(1), г(2), а, б, о.б, о.в[0]);'
    );
    expect(lines).toEqual(['2', '5', '6', '8', '3 4 1 1 10 11']);
  });
});

test('a value that does not match a function type is a type error', () => {
  const result = compile('тағйирёбанда ф: (а: рақам) => рақам = 5;');
  expect(result.errors).toEqual([expect.stringContaining('TYPE_NOT_ASSIGNABLE')]);
});

/**
 * do-while, labels, for await, debugger, empty statements, enums and
 * generators: each program runs the same with the default options, in strict
 * mode and without type checking.
 */
describe('statements and generators', () => {
  const programs: Array<[string, string, string[]]> = [
    [
      'do-while runs the body before the test',
      'тағ и = 10;\nкун { и++; } то (и < 3);\nчоп.сабт(и);\n' +
        'тағ ҷ = 0;\nкун { ҷ++; агар (ҷ === 2) давом; агар (ҷ === 4) шикастан; } то (ҷ < 10)\nчоп.сабт(ҷ);',
      ['11', '4'],
    ],
    [
      'labelled break and continue',
      'берун: барои (тағ и = 0; и < 3; и++) {\n' +
        '  барои (тағ ҷ = 0; ҷ < 3; ҷ++) {\n' +
        '    агар (ҷ === 1) давом берун;\n' +
        '    агар (и === 2) шикастан берун;\n' +
        '    чоп.сабт(и, ҷ);\n' +
        '  }\n' +
        '}\n' +
        'блок: { чоп.сабт("пеш"); агар (дуруст) шикастан блок; чоп.сабт("ҳеҷ"); }\n' +
        'тағ н = 0;\nҳалқа: кун { н++; агар (н < 3) давом ҳалқа; } то (нодуруст);\nчоп.сабт(н);',
      ['0 0', '1 0', 'пеш', '1'],
    ],
    [
      'debugger and empty statements',
      ';; тағ х = 0; агар (х); барои (тағ и = 0; и < 3; и++); debugger; { ; }\nчоп.сабт("ok");',
      ['ok'],
    ],
    [
      'numeric, string and computed enum members',
      'шумориш Ранг { Сурх, Сабз = 5, Кабуд }\n' +
        'собит шумориш Ҳаҷм { Хурд = 2, Калон = Хурд * 10, Б = Ҳаҷм.Калон + 1 }\n' +
        'шумориш Самт { Боло = "боло", Поён = "поён" }\n' +
        'собит асос = 40;\nшумориш Ҳисоб { А = асос + 2, Б = А + 1 }\n' +
        'тағ р: Ранг = Ранг.Сурх;\nр = Ранг.Кабуд;\nсобит н: рақам = Ранг.Сабз;\n' +
        'чоп.сабт(Ранг.Сурх, Ранг.Сабз, р, н, Ранг[5]);\n' +
        'чоп.сабт(Ҳаҷм.Калон, Ҳаҷм.Б, Самт.Поён, Самт["боло"], Ҳисоб.А);',
      ['0 5 6 5 Сабз', '20 21 поён undefined 42'],
    ],
    [
      'enum members named like built-in members',
      'шумориш Номҳо { дарозӣ, илова }\nчоп.сабт(Номҳо.дарозӣ, Номҳо.илова, Номҳо[1]);',
      ['0 1 push'],
    ],
    [
      'generators, yield precedence and delegation',
      'функсия* шумор(то_: рақам): Generator<рақам> {\n' +
        '  барои (тағ и = 0; и < то_; и++) { ҳосил и * 2; }\n' +
        '  ҳосил* [10, 11];\n' +
        '}\n' +
        'функсия* ҷамъ() { тағ а = ҳосил; тағ б = ҳосил а + 1; бозгашт а + б; }\n' +
        'собит г = ҷамъ(); г.next(); чоп.сабт(г.next(5).value, г.next(7).value);\n' +
        'чоп.сабт([...шумор(3)].join(","));',
      ['6 12', '0,2,4,10,11'],
    ],
    [
      'generator methods and function expressions',
      'синф Рӯйхат { *қиматҳо() { ҳосил 1; ҳосил 2; } статикӣ *як() { ҳосил "я"; } }\n' +
        'собит о = { *ҳарф() { ҳосил "а"; ҳосил "б"; } };\n' +
        'собит е = функсия* () { ҳосил дуруст; };\n' +
        'чоп.сабт([...нав Рӯйхат().қиматҳо()].join(""), [...Рӯйхат.як()][0], [...о.ҳарф()].join(""), [...е()][0]);',
      ['12 я аб true'],
    ],
    [
      'кун and шумориш are ordinary names outside their statements',
      'тағ кун = 1;\nкун = кун + 1;\nфунксия шумориш(р: рақам[]): рақам { бозгашт р.length; }\n' +
        'собит о = { кун: 3, шумориш: 4 };\nчоп.сабт(кун, шумориш([1, 2, 3]), о.кун + о.шумориш);',
      ['2 3 7'],
    ],
    [
      'ҳосил is an ordinary variable outside generators',
      'тағ ҳосил = 4;\nҳосил += 1;\nсобит ф = (ҳосил: рақам) => ҳосил * 2;\nчоп.сабт(ҳосил, ф(ҳосил));',
      ['5 10'],
    ],
  ];

  test.each(programs)('%s', (_name, source, expected) => {
    expect(run(source)).toEqual(expected);
    expect(run(source, { strict: true })).toEqual(expected);
    expect(run(source, { typeCheck: false })).toEqual(expected);
  });

  test('for await over an async generator', async () => {
    const source =
      'ҳамзамон функсия* ададҳо() { ҳосил 1; ҳосил интизор Ваъда.resolve(2); }\n' +
      'собит манбаъ = { ҳамзамон *[Symbol.asyncIterator]() { ҳосил "x"; } };\n' +
      'ҳамзамон функсия асосӣ() {\n' +
      '  барои интизор (собит х аз ададҳо()) { чоп.сабт(х); }\n' +
      '  барои интизор (собит х аз [Ваъда.resolve(3), 4]) { чоп.сабт(х); }\n' +
      '  барои интизор (собит х аз манбаъ) { чоп.сабт(х); }\n' +
      '}\n' +
      'асосӣ();';
    for (const options of [{}, { strict: true }, { typeCheck: false }]) {
      const lines = run(source, options);
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(lines).toEqual(['1', '2', '3', '4', 'x']);
    }
  });
});

import { compile } from '../src/compiler';

/**
 * Strict mode (`--strict`): null checks with control-flow narrowing, members
 * that don't exist, and built-in methods that may return `беқимат`.
 */

const NODE = `
синф Г {
    қ: рақам;
    навбатӣ: Г | холӣ;
    конструктор(қ: рақам) {
        ин.қ = қ;
        ин.навбатӣ = холӣ;
    }
}
`;

/** First line of each error of a strict compile. */
function strictErrors(source: string): string[] {
  return compile(NODE + source, { strict: true }).errors.map(error => error.split('\n')[0]);
}

function expectError(source: string, pattern: RegExp): void {
  const errors = strictErrors(source);
  expect(errors.some(error => pattern.test(error))).toBe(true);
}

function expectClean(source: string): void {
  expect(strictErrors(source)).toEqual([]);
}

describe('strict null checks', () => {
  describe('report values that may be холӣ or беқимат', () => {
    test.each([
      ['a nullable parameter', 'функсия ф(г: Г | холӣ): рақам { бозгашт г.қ; }'],
      ['a variable set to холӣ', 'тағ г: Г | холӣ = холӣ; чоп.сабт(г.қ);'],
      ['a nullable class field', 'собит г = нав Г(1); чоп.сабт(г.навбатӣ.қ);'],
      [
        'inside an === холӣ branch',
        'функсия ф(г: Г | холӣ) { агар (г === холӣ) { чоп.сабт(г.қ); } }',
      ],
      [
        'after a reassignment in a loop',
        'функсия ф(с: Г | холӣ) { тағ ҷ = с; то (ҷ !== холӣ) { ҷ = ҷ.навбатӣ; чоп.сабт(ҷ.қ); } }',
      ],
      [
        'when only one side of || was checked',
        'функсия ф(г: Г | холӣ, ш: мантиқӣ) { агар (г !== холӣ || ш) { чоп.сабт(г.қ); } }',
      ],
      ['an optional parameter', 'функсия ф(а?: рақам): рақам { бозгашт а * 2; }'],
      ['arithmetic', 'функсия ф(н: рақам | беқимат): рақам { бозгашт н + 1; }'],
      ['a comparison', 'функсия ф(н: рақам | холӣ): мантиқӣ { бозгашт н < 5; }'],
      ['increment', 'функсия ф(н: рақам | холӣ) { н++; }'],
      ['compound assignment', 'функсия ф(н: рақам | холӣ) { н += 1; }'],
      [
        'a reassigned variable inside a callback',
        'функсия ф(г: Г | холӣ) { агар (г !== холӣ) { [1].харита(х => г.қ + х); } г = холӣ; }',
      ],
      [
        'an optional interface property',
        'интерфейс И { г?: Г; } функсия ф(и: И): рақам { бозгашт и.г.қ; }',
      ],
    ])('%s', (_name, source) => {
      expectError(source, /POSSIBLY_NULL/);
    });

    test('the message names the reference and the missing check', () => {
      expect(strictErrors('функсия ф(г: Г | холӣ): рақам { бозгашт г.навбатӣ.қ; }')).toEqual([
        expect.stringMatching(/'г' is possibly 'холӣ'/),
        expect.stringMatching(/'г\.навбатӣ' is possibly 'холӣ'/),
      ]);
    });

    test.each([
      ['assigning холӣ to a non-nullable variable', 'тағ а: рақам = холӣ;'],
      ['assigning беқимат', 'тағ а: сатр = беқимат;'],
      ['passing холӣ as an argument', 'функсия ф(г: Г): рақам { бозгашт г.қ; } ф(холӣ);'],
      ['returning холӣ', 'функсия ф(): Г { бозгашт холӣ; }'],
      ['холӣ for an optional property', 'интерфейс И { а?: рақам; } собит и: И = { а: холӣ };'],
      ['assigning a nullable field', 'собит г = нав Г(1); тағ д: Г = г.навбатӣ;'],
    ])('%s', (_name, source) => {
      expectError(source, /TYPE_NOT_ASSIGNABLE|ARGUMENT_TYPE_MISMATCH/);
    });
  });

  describe('accept values narrowed by a check', () => {
    test.each([
      ['!== холӣ', 'функсия ф(г: Г | холӣ) { агар (г !== холӣ) { чоп.сабт(г.қ); } }'],
      [
        'an early return',
        'функсия ф(г: Г | холӣ): рақам { агар (г === холӣ) { бозгашт 0; } бозгашт г.қ; }',
      ],
      [
        'a negated truthiness check',
        'функсия ф(г: Г | холӣ): рақам { агар (!г) бозгашт 0; бозгашт г.қ; }',
      ],
      ['truthiness', 'функсия ф(г: Г | холӣ) { агар (г) { чоп.сабт(г.қ); } }'],
      [
        'loose == холӣ',
        'функсия ф(г?: Г | холӣ): рақам { агар (г == холӣ) бозгашт 0; бозгашт г.қ; }',
      ],
      ['&&', 'функсия ф(г: Г | холӣ): мантиқӣ { бозгашт г !== холӣ && г.қ > 0; }'],
      ['||', 'функсия ф(г: Г | холӣ): мантиқӣ { бозгашт г === холӣ || г.қ > 0; }'],
      ['?:', 'функсия ф(г: Г | холӣ): рақам { бозгашт г !== холӣ ? г.қ : 0; }'],
      ['?.', 'функсия ф(г: Г | холӣ) { чоп.сабт(г?.қ); }'],
      ['a member path', 'функсия ф(г: Г) { агар (г.навбатӣ !== холӣ) { чоп.сабт(г.навбатӣ.қ); } }'],
      [
        'two checks joined by &&',
        'функсия ф(г: Г | холӣ) { агар (г !== холӣ && г.навбатӣ !== холӣ) { чоп.сабт(г.навбатӣ.қ); } }',
      ],
      [
        'two early exits joined by ||',
        'функсия ф(а: Г | холӣ, б: Г | холӣ): рақам { агар (а === холӣ || б === холӣ) бозгашт 0; бозгашт а.қ + б.қ; }',
      ],
      [
        'a while loop walking a list',
        'функсия ф(с: Г | холӣ): рақам { тағ ҷамъ = 0; тағ ҷ = с; то (ҷ !== холӣ) { ҷамъ += ҷ.қ; ҷ = ҷ.навбатӣ; } бозгашт ҷамъ; }',
      ],
      [
        'a for loop walking a list',
        'функсия ф(с: Г | холӣ) { барои (тағ ҷ: Г | холӣ = с; ҷ !== холӣ; ҷ = ҷ.навбатӣ) { чоп.сабт(ҷ.қ); } }',
      ],
      [
        'давом in a loop',
        'функсия ф(р: (Г | холӣ)[]) { барои (собит г аз р) { агар (г === холӣ) давом; чоп.сабт(г.қ); } }',
      ],
      [
        'шикастан in an endless loop',
        'функсия ф(с: Г) { тағ ҷ: Г | холӣ = с; то (дуруст) { агар (ҷ === холӣ) шикастан; чоп.сабт(ҷ.қ); ҷ = ҷ.навбатӣ; } }',
      ],
      ['an assignment', 'тағ г: Г | холӣ = холӣ; г = нав Г(1); чоп.сабт(г.қ);'],
      ['a declaration', 'тағ г: Г | холӣ = нав Г(1); чоп.сабт(г.қ);'],
      [
        'both branches assigning',
        'функсия ф(ш: мантиқӣ) { тағ г: Г | холӣ = холӣ; агар (ш) { г = нав Г(1); } вагарна { г = нав Г(2); } чоп.сабт(г.қ); }',
      ],
      [
        'try with a catch that returns',
        'функсия ф() { тағ г: Г | холӣ = холӣ; кӯшиш { г = нав Г(1); } гирифтан (е) { бозгашт; } чоп.сабт(г.қ); }',
      ],
      [
        'a never reassigned parameter in a callback',
        'функсия ф(г: Г | холӣ) { агар (г !== холӣ) { [1].харита(х => г.қ + х); } }',
      ],
      [
        'навъи',
        'функсия ф(а: рақам | сатр | холӣ): рақам { агар (навъи а === "number") { бозгашт а + 1; } бозгашт 0; }',
      ],
      ['an optional class field', 'синф К { а?: рақам; конструктор(а?: рақам) { ин.а = а; } }'],
      ['?? on a nullable value', 'функсия ф(н: рақам | холӣ): рақам { бозгашт (н ?? 0) + 1; }'],
      [
        'беқимат for an optional parameter',
        'функсия ф(а?: рақам): рақам { бозгашт а ?? 0; } ф(беқимат);',
      ],
      [
        'беқимат for a defaulted parameter',
        'функсия ф(а: рақам = 1): рақам { бозгашт а; } ф(беқимат);',
      ],
      [
        'беқимат for an optional property',
        'интерфейс И { а?: рақам; } собит и: И = { а: беқимат };',
      ],
      [
        'a member path through ин',
        'синф Р { сар: Г | холӣ = холӣ; ҷамъ(): рақам { агар (ин.сар === холӣ) бозгашт 0; бозгашт ин.сар.қ; } }',
      ],
    ])('%s', (_name, source) => {
      expectClean(source);
    });
  });

  test('is off without --strict', () => {
    const result = compile(
      NODE + 'функсия ф(г: Г | холӣ): рақам { бозгашт г.қ; } тағ а: рақам = холӣ;'
    );
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });
});

describe('non-null and type assertions', () => {
  test.each([
    ['a nullable parameter with !', 'функсия ф(г: Г | холӣ): рақам { бозгашт г!.қ; }'],
    [
      'a nullable field with !',
      'собит г = нав Г(1); чоп.сабт(г.навбатӣ!.қ, г.навбатӣ!.навбатӣ!.қ);',
    ],
    [
      'Map.get with !',
      'собит м = нав Map<сатр, Г>(); собит а: Г = м.бозгирифтан("а")!; чоп.сабт(м.бозгирифтан("б")!.қ);',
    ],
    ['Array.pop with !', 'собит р: рақам[] = [1]; собит а: рақам = р.баровардан()! + 1;'],
    ['an optional parameter with !', 'функсия ф(а?: рақам): рақам { бозгашт а! * 2; }'],
    ['arithmetic assignment through !', 'функсия ф(н: рақам | холӣ) { н! += 1; н!++; }'],
    ['an assignment through ! narrows', 'тағ г: Г | холӣ = холӣ; г! = нав Г(1); чоп.сабт(г.қ);'],
    ['a truthiness check of х!', 'функсия ф(г: Г | холӣ) { агар (г!) { чоп.сабт(г.қ); } }'],
    ['чун to a non-nullable type', 'функсия ф(г: Г | холӣ): рақам { бозгашт (г чун Г).қ; }'],
    ['<Т> to a non-nullable type', 'функсия ф(г: Г | холӣ): рақам { бозгашт (<Г>г).қ; }'],
    [
      'a nullable value asserted for an argument',
      'функсия ф(г: Г): рақам { бозгашт г.қ; } функсия х(г: Г | холӣ): рақам { бозгашт ф(г чун Г); }',
    ],
  ])('%s', (_name, source) => {
    expectClean(source);
  });

  test.each([
    [
      'чун to a nullable type',
      'функсия ф(г: Г): рақам { бозгашт (г чун Г | холӣ).қ; }',
      /POSSIBLY_NULL/,
    ],
    ['холӣ asserted to a number', 'собит а = холӣ чун рақам;', /Conversion of type 'холӣ'/],
    [
      'satisfies with a nullable value',
      'функсия ф(г: Г | холӣ) { собит х = г бармесоё Г; }',
      /does not satisfy the expected type 'Г'/,
    ],
  ])('%s is still reported', (_name, source, pattern) => {
    expectError(source, pattern);
  });
});

describe('built-in methods that may return беқимат', () => {
  test.each([
    ['Map.get', 'собит м = нав Map<сатр, рақам>(); собит а: рақам = м.бозгирифтан("а");'],
    ['Array.pop', 'собит р: рақам[] = [1]; собит а: рақам = р.баровардан();'],
    ['Array.shift', 'собит р: Г[] = []; чоп.сабт(р.ҳазфиАввал().қ);'],
    ['Array.find', 'собит р: Г[] = []; чоп.сабт(р.кофтан(г => г.қ > 0).қ);'],
    ['Array.at', 'собит р: рақам[] = [1]; собит а: рақам = р.дар(-1);'],
    [
      'a Map typed by its annotation',
      'собит м: Map<рақам, Г> = нав Map(); чоп.сабт(м.бозгирифтан(1).қ);',
    ],
  ])('%s', (_name, source) => {
    expectError(source, /TYPE_NOT_ASSIGNABLE|POSSIBLY_NULL/);
  });

  test.each([
    [
      'checked with !== беқимат',
      'собит м = нав Map<сатр, Г>(); собит г = м.бозгирифтан("а"); агар (г !== беқимат) { чоп.сабт(г.қ); }',
    ],
    [
      'with a ?? default',
      'собит м = нав Map<сатр, рақам>(); собит а: рақам = м.бозгирифтан("а") ?? 0;',
    ],
    ['an untyped Map', 'собит м = нав Map(); собит а: рақам = м.бозгирифтан("а");'],
    ['indexing an array', 'собит р: Г[] = [нав Г(1)]; чоп.сабт(р[0].қ);'],
    [
      'Map.size and Map.has',
      'собит м = нав Map<сатр, рақам>(); собит н: рақам = м.ҳаҷм; чоп.сабт(м.дорадКалид("а"));',
    ],
  ])('%s', (_name, source) => {
    expectClean(source);
  });
});

describe('members that do not exist', () => {
  test.each([
    [
      'a Set',
      'собит с = нав Set<рақам>(); с.дорад(1);',
      /'дорад' \(includes\) .*'Set<рақам>'.*дорадКалид/,
    ],
    [
      'a Map',
      'собит м = нав Map<сатр, рақам>(); м.илова(1);',
      /'илова' \(push\) .*'Map<сатр, рақам>'/,
    ],
    [
      'an array',
      'собит р: рақам[] = []; р.бемаъно();',
      /'бемаъно' does not exist on type 'рақам\[\]'/,
    ],
    ['a string', 'тағ с = "а"; с.бемаъно;', /'бемаъно' does not exist on type 'сатр'/],
    [
      'a number',
      'собит н: рақам = 1; н.дарозӣ;',
      /'дарозӣ' \(length\) does not exist on type 'рақам'/,
    ],
    [
      'a class instance',
      'собит г = нав Г(1); г.бемаъно();',
      /'бемаъно' does not exist on type 'Г'/,
    ],
    ['ин in a method', 'синф К { а(): рақам { бозгашт ин.б; } }', /'б' does not exist on type 'К'/],
    ['a static member', 'синф К { статикӣ а = 1; } К.б;', /'б' does not exist on class 'К'/],
    [
      'an interface',
      'интерфейс И { а: рақам; } функсия ф(и: И) { бозгашт и.б; }',
      /'б' does not exist on type 'И'/,
    ],
    ['an object type', 'функсия ф(о: { а: рақам }) { бозгашт о.б; }', /'б' does not exist/],
  ])('%s', (_name, source, message) => {
    expectError(source, message);
  });

  test.each([
    [
      'a Set with its own methods',
      'собит с = нав Set<рақам>(); с.add(1); с.дорадКалид(1); с.ҳаҷм;',
    ],
    ['array aliases', 'собит р: рақам[] = []; р.илова(1); р.харита(х => х); р.дарозӣ;'],
    ['string aliases', 'собит с = "аб"; с.калон(); с.дарозӣ; с.ҷудокунӣ("");'],
    [
      'inherited members',
      'синф А { а(): рақам { бозгашт 1; } } синф Б мерос А { б(): рақам { бозгашт ин.а(); } } нав Б().а();',
    ],
    [
      'members assigned in the constructor',
      'синф К { конструктор() { ин.х = 1; } а(): рақам { бозгашт ин.х; } }',
    ],
    ['a class extending a built-in', 'синф МанХато мерос Хато { } нав МанХато("а").message;'],
    ['statics', 'синф К { статикӣ а = 1; статикӣ б(): рақам { бозгашт 1; } } К.а; К.б(); К.name;'],
    ['an object built from a literal', 'тағ о = { а: 1 }; о.б = 2; чоп.сабт(о.б);'],
    [
      'an interface with an index signature',
      'интерфейс И { [к: сатр]: рақам; } функсия ф(и: И) { бозгашт и.б; }',
    ],
    ['a union where one member has it', 'функсия ф(х: Г | сатр) { чоп.сабт(х.қ); }'],
    ['Object.prototype members', 'собит г = нав Г(1); г.toString(); г.hasOwnProperty("қ");'],
    [
      'a member named after an alias',
      'синф К { илова(х: рақам): рақам { бозгашт х; } } нав К().илова(1);',
    ],
  ])('%s', (_name, source) => {
    expectClean(source);
  });

  test('is a warning without --strict', () => {
    const result = compile('собит с = нав Set<рақам>(); с.дорад(1);');
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([expect.stringMatching(/PROPERTY_NOT_FOUND/)]);
  });
});

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

describe('do-while and labeled statements', () => {
  test.each([
    [
      'a value the body set to холӣ on an earlier iteration',
      'функсия ф(г0: Г) { тағ г: Г | холӣ = г0; тағ и = 0; кун { чоп.сабт(г.қ); г = холӣ; и++; } то (и < 3); }',
    ],
    [
      'a value the body reassigns without a check',
      'функсия ф(сар: Г) { тағ ҷ: Г | холӣ = сар; кун { чоп.сабт(ҷ.қ); ҷ = ҷ.навбатӣ; } то (дуруст); }',
    ],
    [
      'a шикастан before the assignment',
      'функсия ф(ш: мантиқӣ) { тағ г: Г | холӣ = холӣ; кун { агар (ш) шикастан; г = нав Г(1); } то (нодуруст); чоп.сабт(г.қ); }',
    ],
    [
      'a давом before the assignment, at the test',
      'функсия ф(ш: мантиқӣ) { тағ г: Г | холӣ = холӣ; кун { агар (ш) давом; г = нав Г(1); } то (г.қ > 0); }',
    ],
    [
      'after a labeled block left early',
      'функсия ф(г: Г | холӣ) { л: { агар (г === холӣ) шикастан л; чоп.сабт(г.қ); } чоп.сабт(г.қ); }',
    ],
  ])('%s', (_name, source) => {
    expectError(source, /POSSIBLY_NULL/);
  });

  test.each([
    [
      'a list walked by a do-while',
      'функсия ф(сар: Г): рақам { тағ ҷ: Г | холӣ = сар; тағ ҷамъ = 0; кун { ҷамъ += ҷ.қ; ҷ = ҷ.навбатӣ; } то (ҷ !== холӣ); бозгашт ҷамъ; }',
    ],
    [
      'an assignment in the body',
      'тағ г: Г | холӣ = холӣ; кун { г = нав Г(1); } то (нодуруст); чоп.сабт(г.қ);',
    ],
    [
      'the test after the loop',
      'функсия ф(п: () => Г | холӣ) { тағ г: Г | холӣ = холӣ; кун { г = п(); } то (г === холӣ); чоп.сабт(г.қ); }',
    ],
    [
      'a check before the loop',
      'функсия ф(г: Г | холӣ) { агар (г === холӣ) бозгашт; тағ и = 0; кун { и++; чоп.сабт(г.қ); } то (и < 3); чоп.сабт(г.қ); }',
    ],
    [
      'давом of a nested loop',
      'функсия ф(ш: мантиқӣ) { тағ г: Г | холӣ = холӣ; кун { барои (собит х аз [1]) { агар (ш) давом; } г = нав Г(1); } то (г.қ > 0); }',
    ],
    [
      'inside a labeled block',
      'функсия ф(г: Г | холӣ) { л: { агар (г === холӣ) шикастан л; чоп.сабт(г.қ); } }',
    ],
    [
      'a labeled block that always returns',
      'функсия ф(г: Г | холӣ): рақам { агар (г === холӣ) л: { бозгашт 0; } бозгашт г.қ; }',
    ],
    [
      'давом to a labeled loop',
      'функсия ф(р: (Г | холӣ)[]) { берун: барои (собит г аз р) { агар (г === холӣ) давом берун; чоп.сабт(г.қ); } }',
    ],
  ])('%s', (_name, source) => {
    expectClean(source);
  });
});

describe('enums', () => {
  test.each([
    [
      'members as values and the enum as a type',
      'шумориш Р { А, Б = 5 } тағ р: Р = Р.А; р = Р.Б; собит н: рақам = Р.Б; функсия ф(х: Р): рақам { бозгашт х + 1; } ф(Р.А);',
    ],
    [
      'a widened member kept in a variable',
      'шумориш Р { А } тағ р = Р.А; тағ р2: Р = р; шумориш С { А = "а" } тағ с = С.А; тағ с2: С = с; собит з: сатр = С.А;',
    ],
    ['initializers naming earlier members', 'шумориш Р { А = 1, Б = А * 2, В = Р.Б + 1 }'],
    [
      'the enum type used before the enum',
      'интерфейс И { р: Р; } функсия ф(р: Р) {} шумориш Р { А }',
    ],
    ['a const enum in a function', 'функсия ф(): рақам { собит шумориш Д { А = 2 } бозгашт Д.А; }'],
    ['reverse mapping', 'шумориш Р { А } собит н = Р[0];'],
  ])('%s', (_name, source) => {
    expectClean(source);
  });

  test.each([
    ['an unknown member', 'шумориш Р { А } чоп.сабт(Р.Б);', /'Б' does not exist on type 'навъи Р'/],
    ['a number member as a сатр', 'шумориш Р { А } тағ с: сатр = Р.А;', /TYPE_NOT_ASSIGNABLE/],
    [
      'a string member as a рақам',
      'шумориш С { А = "а" } тағ н: рақам = С.А;',
      /TYPE_NOT_ASSIGNABLE/,
    ],
    ['an undefined name in an initializer', 'шумориш Р { А = нест }', /'нест' is not defined/],
  ])('%s', (_name, source, message) => {
    expectError(source, message);
  });

  test('an unknown member is a warning without --strict', () => {
    const result = compile('шумориш Р { А } чоп.сабт(Р.Б);');
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([expect.stringMatching(/PROPERTY_NOT_FOUND/)]);
  });
});

describe('generators and for await', () => {
  test.each([
    [
      'Generator<рақам> with a yield and a бозгашт',
      'функсия* ф(сар: Г | холӣ): Generator<рақам> { тағ ҷ = сар; то (ҷ !== холӣ) { ҳосил ҷ.қ; ҷ = ҷ.навбатӣ; } бозгашт "охир"; }',
    ],
    [
      'Iterable<рақам> iterated by for-of',
      'функсия* ф(): Iterable<рақам> { ҳосил 1; бозгашт; } барои (собит х аз ф()) { чоп.сабт(х); }',
    ],
    [
      'the value of a yield',
      'функсия* ф() { собит а: рақам = ҳосил 1; чоп.сабт(а + 1, ҳосил, ҳосил* [2]); }',
    ],
    [
      'generator methods',
      'синф К { *а(): Generator<сатр> { ҳосил "х"; бозгашт 1; } } собит о = { *б(): Iterable<рақам> { ҳосил 1; } };',
    ],
    [
      'an async generator',
      'ҳамзамон функсия* ф(): AsyncGenerator<рақам> { ҳосил интизор Ваъда.resolve(1); }',
    ],
    [
      'for await elements are awaited',
      'ҳамзамон функсия ф(р: Ваъда<рақам>[]) { барои интизор (собит х аз р) { собит у: рақам = х; } }',
    ],
  ])('%s', (_name, source) => {
    expectClean(source);
  });

  test('for await elements have the awaited type', () => {
    expectError(
      'ҳамзамон функсия ф(р: Ваъда<рақам>[]) { барои интизор (собит х аз р) { собит у: сатр = х; } }',
      /Type 'рақам' is not assignable to type 'сатр'/
    );
  });
});

const PREDICATES = `
функсия сатрАст(х: ношинос): х аст сатр { бозгашт навъи х === "string"; }
функсия тасдиқКун(ш: ҳар): тасдиқ ш { агар (!ш) партофтан нав Хато("х"); }
функсия сатрБошад(х: ношинос): тасдиқ х аст сатр { агар (!сатрАст(х)) партофтан нав Хато("х"); }
`;

describe('type predicates and assertion signatures', () => {
  test.each([
    [
      'in the true branch',
      'функсия ф(а: сатр | холӣ): рақам { агар (сатрАст(а)) { бозгашт а.дарозӣ; } бозгашт 0; }',
    ],
    [
      'after an early return on !',
      'функсия ф(а: сатр | холӣ): рақам { агар (!сатрАст(а)) бозгашт 0; бозгашт а.дарозӣ; }',
    ],
    [
      'on the right of &&',
      'функсия ф(а: сатр | холӣ): мантиқӣ { бозгашт сатрАст(а) && а.дарозӣ > 1; }',
    ],
    [
      'in a conditional expression',
      'функсия ф(а: сатр | холӣ): рақам { бозгашт сатрАст(а) ? а.дарозӣ : 0; }',
    ],
    [
      'in the false branch, without the type',
      'функсия ф(а: сатр | Г | холӣ): рақам { агар (сатрАст(а)) бозгашт 0; агар (а === холӣ) бозгашт 1; бозгашт а.қ; }',
    ],
    [
      'from ношинос',
      'функсия ф(а: ношинос): рақам { агар (сатрАст(а)) бозгашт а.дарозӣ; бозгашт 0; }',
    ],
    [
      'with an arrow predicate',
      'собит гАст = (х: ҳар): х аст Г => х instanceof Г; функсия ф(а: Г | холӣ): рақам { агар (гАст(а)) бозгашт а.қ; бозгашт 0; }',
    ],
    [
      'after an assertion of truthiness',
      'функсия ф(а: Г | холӣ): рақам { тасдиқКун(а); бозгашт а.қ; }',
    ],
    [
      'after an assertion of a condition',
      'функсия ф(а: Г | холӣ): рақам { тасдиқКун(а !== холӣ); бозгашт а.қ; }',
    ],
    [
      'after an assertion of a type',
      'функсия ф(а: ношинос): рақам { сатрБошад(а); бозгашт а.дарозӣ; }',
    ],
    [
      'by a method predicate on ин',
      'синф Ҳ { сагАст(): ин аст С { бозгашт ин instanceof С; } } синф С мерос Ҳ { аккос(): сатр { бозгашт "в"; } }\n' +
        'функсия ф(ҳ: Ҳ): сатр { агар (ҳ.сагАст()) бозгашт ҳ.аккос(); бозгашт ""; }',
    ],
  ])('narrow %s', (_name, source) => {
    expectClean(PREDICATES + source);
  });

  test.each([
    [
      'outside the checked branch',
      'функсия ф(а: сатр | холӣ): рақам { агар (сатрАст(а)) бозгашт 0; бозгашт а.дарозӣ; }',
      /'а' is possibly 'холӣ'/,
    ],
    [
      'before the assertion',
      'функсия ф(а: Г | холӣ): рақам { собит қ = а.қ; тасдиқКун(а); бозгашт қ; }',
      /'а' is possibly 'холӣ'/,
    ],
    [
      'after a reassignment',
      'функсия ф(а: Г | холӣ, б: Г | холӣ): рақам { тасдиқКун(а); а = б; бозгашт а.қ; }',
      /'а' is possibly 'холӣ'/,
    ],
    [
      'a member the narrowed type lacks',
      'функсия ф(а: ношинос): рақам { сатрБошад(а); бозгашт а.нест; }',
      /Property 'нест' does not exist on type 'сатр'/,
    ],
  ])('report a nullable value %s', (_name, source, pattern) => {
    expectError(PREDICATES + source, pattern);
  });

  test('a predicate returns мантиқӣ and must name a parameter', () => {
    expectError(
      'функсия ф(х: ношинос): х аст сатр { бозгашт 1; }',
      /not assignable to return type 'мантиқӣ'/
    );
    expectError(
      'функсия ф(х: ношинос): у аст сатр { бозгашт дуруст; }',
      /UNDEFINED_IDENTIFIER.*Cannot find parameter 'у'/
    );
    expectError('функсия ф(х: ҳар): тасдиқ у { }', /Cannot find parameter 'у'/);
    expectClean(PREDICATES + 'собит б: мантиқӣ = сатрАст(1); собит в: беджавоб = тасдиқКун(1);');
  });
});

describe('readonly arrays, tuples and properties', () => {
  test('reading and passing them is fine', () => {
    expectClean(
      'функсия ҷамъ(р: танҳохонӣ рақам[]): рақам { тағ с = 0; барои (собит х аз р) с += х; бозгашт с + р[0] + р.дарозӣ; }\n' +
        'тағ м: рақам[] = [1]; ҷамъ(м); ҷамъ([1, 2]); собит р: танҳохонӣ рақам[] = м; р.map(х => х); р.slice();\n' +
        'собит т: танҳохонӣ [рақам, сатр] = [1, "а"]; собит с: сатр = т[1];\n' +
        'синф Н { танҳохонӣ х: рақам; конструктор(х: рақам) { ин.х = х; } }'
    );
  });

  test.each([
    [
      'a mutating method',
      'собит р: танҳохонӣ рақам[] = [1]; р.илова(2);',
      /Property 'илова' \(push\) does not exist on type 'танҳохонӣ рақам\[\]'/,
    ],
    [
      'an element assignment',
      'собит р: танҳохонӣ рақам[] = [1]; р[0] = 2;',
      /READONLY_ASSIGNMENT.*'танҳохонӣ рақам\[\]' is read-only/,
    ],
    [
      'a tuple element update',
      'собит т: танҳохонӣ [рақам] = [1]; т[0]++;',
      /READONLY_ASSIGNMENT.*'танҳохонӣ \[рақам\]' is read-only/,
    ],
    [
      'passing it where it could change',
      'собит р: танҳохонӣ рақам[] = [1]; собит м: рақам[] = р;',
      /'танҳохонӣ рақам\[\]' is not assignable to type 'рақам\[\]'/,
    ],
    [
      'assigning a readonly class property',
      'синф Н { танҳохонӣ х = 1; } собит н = нав Н(); н.х = 2;',
      /READONLY_ASSIGNMENT.*Cannot assign to 'х' because it is a read-only property/,
    ],
    [
      'assigning a readonly interface property',
      'интерфейс И { танҳохонӣ а: рақам; } собит и: И = { а: 1 }; и.а = 2;',
      /Cannot assign to 'а'/,
    ],
    [
      'assigning a getter without a setter',
      'синф К { get х(): рақам { бозгашт 1; } } нав К().х = 2;',
      /Cannot assign to 'х' because it is a read-only property/,
    ],
  ])('report %s', (_name, source, pattern) => {
    expectError(source, pattern);
  });

  test('are warnings without --strict', () => {
    const result = compile('собит р: танҳохонӣ рақам[] = [1]; р[0] = 2; р.илова(3);');
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([
      expect.stringMatching(/READONLY_ASSIGNMENT/),
      expect.stringMatching(/PROPERTY_NOT_FOUND/),
    ]);
  });
});

describe('private members, accessors and the ин type', () => {
  test('declared private members and accessors are members of the class', () => {
    expectClean(
      'синф К {\n' +
        '  #х: рақам | холӣ = холӣ;\n' +
        '  статикӣ #с = 1;\n' +
        '  #м(): рақам { бозгашт 1; }\n' +
        '  get у(): рақам { бозгашт ин.#м() + К.#с; }\n' +
        '  set у(қ: рақам) { ин.#х = қ; }\n' +
        '  гир(дигар: К): рақам { агар (ин.#х !== холӣ) бозгашт ин.#х + дигар.у; бозгашт 0; }\n' +
        '}\n' +
        'собит к = нав К(); к.у = 5; собит н: рақам = к.у + к.гир(к);'
    );
  });

  test('an undeclared private member, or one of another class, is an error even without --strict', () => {
    for (const source of [
      'синф К { #х = 1; м(): рақам { бозгашт ин.#у; } }',
      'синф А { #х = 1; } синф Б { #х = 2; м(а: А): рақам { бозгашт а.#х; } }',
    ]) {
      const result = compile(source);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/PROPERTY_NOT_FOUND.*Property '#(у|х)' does not exist/),
        ])
      );
    }
  });

  test('a setter value of the wrong type is reported', () => {
    expectError(
      'синф К { get х(): рақам { бозгашт 1; } set х(қ: рақам) { } } нав К().х = "а";',
      /Type '"а"' is not assignable to type 'рақам'/
    );
    expectError(
      'собит о = { get х(): рақам { бозгашт 1; }, set х(қ: рақам) { } }; о.х = "а";',
      /Type '"а"' is not assignable to type 'рақам'/
    );
  });

  test('a method returning ин returns its receiver', () => {
    expectClean(
      'синф З { н = 0; илова(): ин { бозгашт ин; } } синф Б мерос З { б(): ин { бозгашт ин; } }\n' +
        'собит б: Б = нав Б().илова().б().илова();'
    );
    expectError(
      'синф З { илова(): ин { бозгашт ин; } } нав З().илова().нест();',
      /Property 'нест' does not exist on type 'З'/
    );
  });
});

describe('symbol, tuple, constructor and generic types', () => {
  test('беназир рамз is a рамз', () => {
    expectClean('собит р: беназир рамз = Symbol(); собит с: рамз = р; собит т: рамз | сатр = "а";');
    expectError('собит р: рамз = 1;', /Type '1' is not assignable to type 'рамз'/);
  });

  test('optional and rest tuple elements', () => {
    expectClean(
      'собит т: [рақам, сатр?, ...мантиқӣ[]] = [1]; собит у: [рақам, сатр?] = [1, "а"];\n' +
        'собит в: [рақам, ...мантиқӣ[]] = [1, дуруст, нодуруст]; собит г: [рақам, сатр] = [1, "а"];\n' +
        'собит д: [рақам, сатр?] = г; собит с: сатр | беқимат = у[1];'
    );
    expectError(
      'собит т: [рақам, сатр?] = [1, 2];',
      /'\[1, 2\]' is not assignable to type '\[рақам, сатр\?\]'/
    );
    expectError('собит т: [рақам, сатр?] = [];', /not assignable/);
    expectError('собит т: [рақам, сатр?] = [1, "а", 3];', /not assignable/);
    expectError('собит т: [рақам, ...сатр[]] = [1, "а", 2];', /'\[рақам, ...сатр\[\]\]'/);
    expectError(
      'собит т: [рақам, сатр?] = [1]; собит с: сатр = т[1];',
      /'сатр \| беқимат' is not assignable/
    );
    expectError('собит т: [рақам, сатр?] = [1]; собит у: [рақам, сатр] = т;', /not assignable/);
  });

  test('constructor types accept classes', () => {
    expectClean(
      'синф К { а: рақам; конструктор(а: рақам) { ин.а = а; } }\n' +
        'функсия соз(С: нав (а: рақам) => К): К { бозгашт нав С(1); }\n' +
        'собит к: К = соз(К); собит а: мавҳум нав () => объект = К;'
    );
    expectError(
      'собит С: нав () => объект = 5;',
      /'5' is not assignable to type 'нав \(\) => объект'/
    );
  });

  test('type parameters are unknown inside their declaration, even when a type has their name', () => {
    expectClean(
      'синф Т { т = 1; }\n' +
        'функсия ф<Т мерос { дарозӣ: рақам } = сатр>(х: Т): рақам { бозгашт х.дарозӣ; }\n' +
        'ф("абв"); ф([1]);\n' +
        'синф Қ<Т> { қ: Т; конструктор(қ: Т) { ин.қ = қ; } м<У мерос { а: Т }>(у: У): Т { бозгашт у.а; } }\n' +
        'интерфейс И<Т = рақам> { т: Т; } собит и: И = { т: "а" };'
    );
  });

  test('a tagged template has the return type of its tag', () => {
    expectError(
      'функсия т(қ: ҳар): рақам { бозгашт 1; } собит с: сатр = т`а`;',
      /Type 'рақам' is not assignable to type 'сатр'/
    );
    expectClean('собит с: сатр = сатр.хоми`а${1}`;');
  });
});

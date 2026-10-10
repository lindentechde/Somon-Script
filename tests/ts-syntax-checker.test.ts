import { Lexer } from '../src/lexer';
import { Parser } from '../src/parser';
import { TypeChecker } from '../src/type-checker';

/**
 * The builtin type checker on the TypeScript 5 declaration syntax: ambient
 * declarations give types, `бознавис` must override something, calls are
 * checked against overloads, `ин` parameters type `ин`, merged declarations
 * are one, and type-only imports are not values.
 */

function check(source: string, strict = true): string[] {
  const parser = new Parser(new Lexer(source).tokenize());
  const ast = parser.parse();
  expect(parser.getErrors()).toEqual([]);
  const result = new TypeChecker(source, { strict }).check(ast);
  return [...result.errors, ...result.warnings].map(
    error => `${error.code} ${error.line}:${error.column} ${error.message}`
  );
}

function expectClean(source: string): void {
  expect(check(source)).toEqual([]);
  expect(check(source, false)).toEqual([]);
}

describe('`эълон` declarations give types', () => {
  test('declared variables, functions, classes, enums and namespaces', () => {
    expect(
      check(
        [
          'эълон собит ВЕРСИЯ: сатр;',
          'эълон функсия ҳисоб(х: рақам): рақам;',
          'эълон синф Нуқта { конструктор(х: рақам); х: рақам; дарозӣ(): рақам; статикӣ сифр(): Нуқта; }',
          'эълон шумориш Ранг { Сурх, Сабз }',
          'эълон номфазо Асбоб { функсия ном(): сатр; собит н: рақам; }',
          'тағ а: рақам = ВЕРСИЯ;',
          'тағ б: сатр = ҳисоб(1);',
          'ҳисоб("х");',
          'тағ в: сатр = нав Нуқта(1).х;',
          'тағ г: рақам = Ранг.Сабз;',
          'тағ д: рақам = Асбоб.ном();',
          'Нуқта.сифр();',
          'Нуқта.номаълум();',
        ].join('\n')
      )
    ).toEqual([
      "TYPE_NOT_ASSIGNABLE 6:16 Type 'сатр' is not assignable to type 'рақам'",
      "TYPE_NOT_ASSIGNABLE 7:15 Type 'рақам' is not assignable to type 'сатр'",
      "ARGUMENT_TYPE_MISMATCH 8:7 Argument 1 of 'ҳисоб' expected type 'рақам' but got '\"х\"'",
      "TYPE_NOT_ASSIGNABLE 9:15 Type 'рақам' is not assignable to type 'сатр'",
      "TYPE_NOT_ASSIGNABLE 11:16 Type 'сатр' is not assignable to type 'рақам'",
      "PROPERTY_NOT_FOUND 13:7 Property 'номаълум' does not exist on class 'Нуқта'",
    ]);
  });

  test('`эълон глобалӣ` declares top-level names and extends built-in types', () => {
    expect(
      check(
        [
          'эълон глобалӣ {',
          '    собит МУҲИТ: сатр;',
          '    функсия гузориш(п: сатр): беджавоб;',
          '    интерфейс Array<Т> { охирин(): Т | беқимат; }',
          '    интерфейс String { баланд(): сатр; }',
          '    интерфейс Number { дучанд: рақам; }',
          '    интерфейс Map<К, В> { калидҳоАш(): К[]; }',
          '    интерфейс Корбар { ном: сатр; }',
          '}',
          'гузориш(МУҲИТ);',
          'собит а = [1, 2].охирин();',
          'тағ б: рақам = "а".баланд();',
          'тағ в: рақам = (5).дучанд;',
          'нав Map<сатр, рақам>().калидҳоАш();',
          'собит к: Корбар = { ном: "Алӣ" };',
          '[1].номаълум;',
          'тағ г: Array<рақам> = [1];',
        ].join('\n')
      )
    ).toEqual([
      "TYPE_NOT_ASSIGNABLE 12:16 Type 'сатр' is not assignable to type 'рақам'",
      "PROPERTY_NOT_FOUND 16:5 Property 'номаълум' does not exist on type 'рақам[]'",
    ]);
  });

  test('imports from an `эълон модул "ном"` are typed', () => {
    expect(
      check(
        [
          'эълон модул "китобхона" {',
          '    содир функсия салом(н: сатр): сатр;',
          '    содир пешфарз синф Асбоб { ном: сатр; }',
          '    содир интерфейс Танзимот { ҷиддӣ: мантиқӣ; }',
          '}',
          'ворид Асбоб, { салом, Танзимот, нест } аз "китобхона";',
          'ворид * чун к аз "китобхона";',
          'тағ а: рақам = салом("х");',
          'тағ б: рақам = нав Асбоб().ном;',
          'тағ в: рақам = к.салом("у");',
        ].join('\n')
      )
    ).toEqual([
      "PROPERTY_NOT_FOUND 6:33 Module '\"китобхона\"' has no exported member 'нест'",
      "TYPE_NOT_ASSIGNABLE 8:16 Type 'сатр' is not assignable to type 'рақам'",
      "TYPE_NOT_ASSIGNABLE 9:16 Type 'сатр' is not assignable to type 'рақам'",
      "TYPE_NOT_ASSIGNABLE 10:16 Type 'сатр' is not assignable to type 'рақам'",
    ]);
  });

  test('an ambient module without `содир` exports everything; `содир =` exports one value', () => {
    expect(
      check(
        [
          'эълон модул "а" { функсия ф(): рақам; собит н: сатр; }',
          'эълон модул "б" { функсия асосӣ(х: рақам): рақам; содир = асосӣ; }',
          'эълон модул "в" { собит х: рақам; содир { х }; }',
          'ворид { ф, н } аз "а";',
          'ворид асосӣ аз "б";',
          'ворид б2 = require("б");',
          'ворид { х } аз "в";',
          'ворид пешфарзӣ аз "а";',
          'тағ а: сатр = ф();',
          'асосӣ("х");',
          'тағ б: сатр = б2(1);',
          'тағ в: сатр = х;',
        ].join('\n')
      )
    ).toEqual([
      'PROPERTY_NOT_FOUND 8:7 Module \'"а"\' has no default export',
      "TYPE_NOT_ASSIGNABLE 9:15 Type 'рақам' is not assignable to type 'сатр'",
      "ARGUMENT_TYPE_MISMATCH 10:7 Argument 1 of 'асосӣ' expected type 'рақам' but got '\"х\"'",
      "TYPE_NOT_ASSIGNABLE 11:15 Type 'рақам' is not assignable to type 'сатр'",
      "TYPE_NOT_ASSIGNABLE 12:15 Type 'рақам' is not assignable to type 'сатр'",
    ]);
  });

  test('imports of undeclared modules stay unchecked', () => {
    expectClean('ворид { а } аз "./м";\nворид б = require("./б");\nа.ҳарчӣ(б.х);');
  });
});

describe('type-only imports', () => {
  test('are types, not values', () => {
    expect(
      check(
        'ворид навъ { Т } аз "./м";\nворид { навъ У, х } аз "./м";\nворид навъ Ф = require("./ф");\nтағ а: Т = 1;\nчоп.сабт(х, Т, У, Ф);'
      )
    ).toEqual([
      "TYPE_ONLY_IMPORT_VALUE 5:13 'Т' cannot be used as a value because it was imported using 'ворид навъ'",
      "TYPE_ONLY_IMPORT_VALUE 5:16 'У' cannot be used as a value because it was imported using 'ворид навъ'",
      "TYPE_ONLY_IMPORT_VALUE 5:19 'Ф' cannot be used as a value because it was imported using 'ворид навъ'",
    ]);
  });
});

describe('`бознавис` (override)', () => {
  test('a member the base class has may be overridden', () => {
    expectClean(
      [
        'синф А { х = 1; м(): рақам { бозгашт 1; } get г(): рақам { бозгашт 1; } статикӣ с(): рақам { бозгашт 1; } конструктор() { ин.у = 2; } у: рақам; }',
        'синф Б мерос А { бознавис х = 2; бознавис м(): рақам { бозгашт 2; } бознавис get г(): рақам { бозгашт 2; } статикӣ бознавис с(): рақам { бозгашт 2; } }',
        'синф В мерос Б { бознавис м(): рақам { бозгашт 3; } конструктор(ҷамъиятӣ бознавис у: рақам) { супер(); } }',
        'синф Г мерос Error { бознавис message = "г"; бознавис ҳарчӣ = 1; }',
      ].join('\n')
    );
  });

  test('without a base class or a member to override it is an error', () => {
    expect(
      check(
        [
          'синф А { м(): рақам { бозгашт 1; } статикӣ с(): рақам { бозгашт 1; } }',
          'синф Б мерос А { бознавис н(): рақам { бозгашт 2; } статикӣ бознавис т = 1; статикӣ бознавис м(): беджавоб {} }',
          'синф В { бознавис х = 1; }',
          'собит Г = синф мерос А { бознавис ж = 1; };',
        ].join('\n')
      )
    ).toEqual([
      "INVALID_OVERRIDE 2:27 This member cannot have an 'бознавис' (override) modifier because it is not declared in the base class 'А'",
      "INVALID_OVERRIDE 2:70 This member cannot have an 'бознавис' (override) modifier because it is not declared in the base class 'А'",
      "INVALID_OVERRIDE 2:94 This member cannot have an 'бознавис' (override) modifier because it is not declared in the base class 'А'",
      "INVALID_OVERRIDE 3:19 This member cannot have an 'бознавис' (override) modifier because its containing class 'В' does not extend another class",
      "INVALID_OVERRIDE 4:35 This member cannot have an 'бознавис' (override) modifier because it is not declared in the base class 'А'",
    ]);
  });
});

describe('overloads', () => {
  const OVERLOADS = [
    'функсия ф(х: рақам): рақам;',
    'функсия ф(х: сатр, у?: мантиқӣ): сатр;',
    'функсия ф(х: ҳар, у?: ҳар): ҳар { бозгашт х; }',
  ].join('\n');

  test('a call takes the type of the overload it matches', () => {
    expect(
      check(
        OVERLOADS +
          '\nтағ а: рақам = ф(1);\nтағ б: сатр = ф("а", дуруст);\nтағ в: сатр = ф(1);\nтағ г: рақам = ф("а");'
      )
    ).toEqual([
      "TYPE_NOT_ASSIGNABLE 6:15 Type 'рақам' is not assignable to type 'сатр'",
      "TYPE_NOT_ASSIGNABLE 7:16 Type 'сатр' is not assignable to type 'рақам'",
    ]);
  });

  test('a call matching no overload is an error; the implementation is not callable', () => {
    expect(check(OVERLOADS + '\nф(дуруст);\nф(1, дуруст);\nф();')).toEqual([
      "NO_MATCHING_OVERLOAD 4:1 No overload of 'ф' matches this call. Overloads: (х: рақам) => рақам; (х: сатр, у: мантиқӣ) => сатр",
      "NO_MATCHING_OVERLOAD 5:1 No overload of 'ф' matches this call. Overloads: (х: рақам) => рақам; (х: сатр, у: мантиқӣ) => сатр",
      "NO_MATCHING_OVERLOAD 6:1 No overload of 'ф' matches this call. Overloads: (х: рақам) => рақам; (х: сатр, у: мантиқӣ) => сатр",
    ]);
  });

  test('the implementation checks its own parameters', () => {
    expect(
      check(
        'функсия ф(х: рақам): рақам;\nфунксия ф(х: рақам): рақам { тағ с: сатр = х; бозгашт х; }'
      )
    ).toEqual(["TYPE_NOT_ASSIGNABLE 2:44 Type 'рақам' is not assignable to type 'сатр'"]);
  });

  test('arguments are still checked; unknown and spread arguments fit', () => {
    expect(check(OVERLOADS + '\nф(ном);\nсобит р = [1];\nф(...р);\nф(ф(1));')).toEqual([
      "UNDEFINED_IDENTIFIER 4:3 Variable 'ном' is not defined",
    ]);
  });

  test('methods, also of an `эълон синф`, and interfaces (merged too)', () => {
    expect(
      check(
        [
          'синф К { м(х: рақам): рақам; м(х: сатр): сатр; м(х: ҳар): ҳар { бозгашт х; } }',
          'эълон синф Л { н(х: рақам): рақам; н(х: сатр): сатр; о?(): рақам; }',
          'интерфейс И { п(х: рақам): рақам; }',
          'интерфейс И { п(х: сатр): сатр; }',
          'собит к = нав К(); собит л = нав Л(1); собит и: И = { п: (х: ҳар) => х };',
          'тағ а: сатр = к.м("а");',
          'тағ б: рақам = л.н(1);',
          'тағ в: сатр = и.п("а");',
          'к.м(дуруст);',
          'л.н(дуруст);',
          'и.п(дуруст);',
          'тағ г: рақам | беқимат = л.о?.();',
        ].join('\n')
      )
    ).toEqual([
      "NO_MATCHING_OVERLOAD 9:1 No overload of 'м' matches this call. Overloads: (х: рақам) => рақам; (х: сатр) => сатр",
      "NO_MATCHING_OVERLOAD 10:1 No overload of 'н' matches this call. Overloads: (х: рақам) => рақам; (х: сатр) => сатр",
      "NO_MATCHING_OVERLOAD 11:1 No overload of 'п' matches this call. Overloads: (х: рақам) => рақам; (х: сатр) => сатр",
    ]);
  });

  test('ambient overloads alone make the function', () => {
    expect(
      check(
        'эълон функсия ҷ(х: рақам): рақам;\nэълон функсия ҷ(х: сатр): сатр;\nэълон функсия як(х: рақам): рақам;\nтағ а: сатр = ҷ("а");\nҷ(дуруст);\nяк("б");'
      )
    ).toEqual([
      "NO_MATCHING_OVERLOAD 5:1 No overload of 'ҷ' matches this call. Overloads: (х: рақам) => рақам; (х: сатр) => сатр",
      "ARGUMENT_TYPE_MISMATCH 6:4 Argument 1 of 'як' expected type 'рақам' but got '\"б\"'",
    ]);
  });
});

describe('`ин` parameters', () => {
  test('type `ин` in the body and are not parameters of calls', () => {
    expect(
      check(
        [
          'интерфейс Ҳисоб { баланс: рақам; }',
          'функсия илова(ин: Ҳисоб, маблағ: рақам): рақам { ин.баланс += маблағ; бозгашт ин.номаълум; }',
          'илова(1);',
          'синф К { н = 1; м(ин: Ҳисоб): рақам { бозгашт ин.баланс; } }',
          'собит ф = функсия (ин: Ҳисоб) { тағ с: сатр = ин.баланс; };',
          'собит о = { м(ин: Ҳисоб) { тағ с: сатр = ин.баланс; } };',
        ].join('\n')
      )
    ).toEqual([
      "PROPERTY_NOT_FOUND 2:82 Property 'номаълум' does not exist on type 'Ҳисоб'",
      "TYPE_NOT_ASSIGNABLE 5:47 Type 'рақам' is not assignable to type 'сатр'",
      "TYPE_NOT_ASSIGNABLE 6:42 Type 'рақам' is not assignable to type 'сатр'",
    ]);
  });
});

describe('declaration merging', () => {
  test('interfaces of one name are one interface', () => {
    expect(
      check(
        'интерфейс Корбар { ном: сатр; }\nинтерфейс Корбар { синну: рақам; }\nсобит а: Корбар = { ном: "а", синну: 1 };\nсобит б: Корбар = { ном: "б" };\nсобит в: Корбар = { ном: "в", синну: 2, ортиқа: 3 };'
      )
    ).toEqual([
      "TYPE_NOT_ASSIGNABLE 4:19 Type '{ ном: \"б\" }' is not assignable to type 'Корбар'",
      "TYPE_NOT_ASSIGNABLE 5:41 Object literal may only specify known properties, and 'ортиқа' does not exist in type 'Корбар'",
    ]);
  });

  test('namespaces of one name see each other’s exports', () => {
    expect(
      check(
        'номфазо Н { содир собит а = 1; собит махфӣ = 2; }\nномфазо Н { содир собит б: рақам = а; чоп.сабт(махфӣ); }\nтағ в: сатр = Н.б;\nН.ҳарчӣ;'
      )
    ).toEqual([
      "UNDEFINED_IDENTIFIER 2:48 Variable 'махфӣ' is not defined",
      "TYPE_NOT_ASSIGNABLE 3:15 Type 'рақам' is not assignable to type 'сатр'",
    ]);
  });

  test('a namespace adds to a class, function or enum of its name', () => {
    expect(
      check(
        [
          'синф К { х = 1; }',
          'номфазо К { содир собит сифр = нав К(); }',
          'функсия ф(): рақам { бозгашт 1; }',
          'номфазо ф { содир собит қадам = 2; }',
          'шумориш Э { А }',
          'номфазо Э { содир функсия аз(с: сатр): Э { бозгашт Э.А; } }',
          'тағ а: рақам = нав К().х + К.сифр.х + ф() + ф.қадам;',
          'тағ б: рақам = Э.аз("а");',
          'тағ в: сатр = Э.аз;',
          'нав К().номаълум;',
        ].join('\n')
      )
    ).toEqual([
      "TYPE_NOT_ASSIGNABLE 9:15 Type '(с: сатр) => рақам' is not assignable to type 'сатр'",
      "PROPERTY_NOT_FOUND 10:9 Property 'номаълум' does not exist on type 'К'",
    ]);
  });

  test('enums of one name are one enum', () => {
    expect(
      check('шумориш Э { А }\nшумориш Э { Б = "б" }\nтағ а: Э = Э.Б;\nтағ б: рақам = Э.Б;\nЭ.В;')
    ).toEqual([
      "TYPE_NOT_ASSIGNABLE 4:16 Type 'сатр' is not assignable to type 'рақам'",
      "PROPERTY_NOT_FOUND 5:3 Property 'В' does not exist on type 'навъи Э'",
    ]);
  });
});

describe('class members', () => {
  test('index signatures open instances (or the class) to any key', () => {
    expectClean(
      'синф Луғат { [к: сатр]: рақам; статикӣ [к: сатр]: ҳар; }\nсобит л = нав Луғат();\nл.ҳарчӣ = 1;\nЛуғат.ҳарчӣ;'
    );
    expect(check('синф Л { номҳо: сатр[] = []; }\nнав Л().ҳарчӣ;')).toHaveLength(1);
  });

  test('computed names and `беназир рамз` keys give no false errors', () => {
    expectClean(
      'собит калид: беназир рамз = Symbol("к");\nинтерфейс И { [калид]: рақам; ном: сатр; }\nсинф К { [калид] = 1; [Symbol.iterator]() { бозгашт [][Symbol.iterator](); } }\nсобит и: И = { [калид]: 1, ном: "а" };\nсобит к = нав К();\nчоп.сабт(к[калид], и.ном);'
    );
  });

  test('optional methods may be absent; `эълон` fields have their type', () => {
    expect(
      check(
        'синф К { м?(): рақам; н?(): рақам { бозгашт 1; } эълон х: рақам; }\nсобит к = нав К();\nтағ а: () => рақам = к.м;\nтағ б: рақам | беқимат = к.н?.();\nтағ в: сатр = к.х;'
      )
    ).toEqual([
      "TYPE_NOT_ASSIGNABLE 3:22 Type '() => рақам | беқимат' is not assignable to type '() => рақам'",
      "TYPE_NOT_ASSIGNABLE 5:15 Type 'рақам' is not assignable to type 'сатр'",
    ]);
  });

  test('an abstract class cannot be instantiated', () => {
    expect(
      check(
        'мавҳум синф Ш { мавҳум ном: сатр; мавҳум get тараф(): рақам; }\nсинф М мерос Ш { ном = "м"; get тараф(): рақам { бозгашт 1; } }\nнав М();\nнав Ш();\nсобит С: мавҳум нав () => Ш = М;'
      )
    ).toEqual(["ABSTRACT_INSTANTIATION 4:1 Cannot create an instance of an abstract class 'Ш'"]);
  });

  test('`ин аст Т` narrows a class instance to both; getters returning `ин`', () => {
    expectClean(
      [
        'синф Г {',
        '    қимат: рақам | холӣ = холӣ;',
        '    пур(): ин аст { қимат: рақам } { бозгашт ин.қимат !== холӣ; }',
        '    get худ(): ин { бозгашт ин; }',
        '}',
        'собит г = нав Г();',
        'агар (г.пур()) { тағ а: рақам = г.худ.қимат + г.қимат; }',
      ].join('\n')
    );
  });
});

describe('interface accessors', () => {
  test('a getter alone is read-only', () => {
    expect(
      check(
        'интерфейс Ҳ { get қ(): рақам; set қ(н: рақам); get т(): сатр; }\nсобит ҳ: Ҳ = { қ: 1, т: "а" };\nҳ.қ = 2;\nҳ.т = "б";\nтағ а: сатр = ҳ.қ;'
      )
    ).toEqual([
      "READONLY_ASSIGNMENT 4:1 Cannot assign to 'т' because it is a read-only property",
      "TYPE_NOT_ASSIGNABLE 5:15 Type 'рақам' is not assignable to type 'сатр'",
    ]);
  });
});

describe('decorators, `using` and the rest are checked as expressions', () => {
  test('decorator expressions', () => {
    expect(
      check(
        'функсия д(х: рақам) { бозгашт (а: ҳар, б: ҳар) => {}; }\n@д("а") синф К { @нест м() {} @д(1) х = 1; конструктор(@д(2) а: рақам) {} }'
      )
    ).toEqual([
      "ARGUMENT_TYPE_MISMATCH 2:4 Argument 1 of 'д' expected type 'рақам' but got '\"а\"'",
      "UNDEFINED_IDENTIFIER 2:19 Variable 'нест' is not defined",
    ]);
  });

  test('`истифода` bindings are constants with the initializer type', () => {
    expect(
      check(
        'интерфейс Манбаъ { н: рақам; }\nэълон функсия кушо(): Манбаъ;\nфунксия ф() { истифода м = кушо(); тағ а: сатр = м.н; м = кушо(); }\nсодир = ф;'
      )
    ).toEqual([
      "TYPE_NOT_ASSIGNABLE 3:50 Type 'рақам' is not assignable to type 'сатр'",
      // A new value for the constant, TypeScript's TS2588
      "CONST_ASSIGNMENT 3:55 Cannot assign to 'м' because it is a constant",
    ]);
  });

  test('`ворид х = Н.а` has the type of what it names', () => {
    expect(check('номфазо Н { содир собит а = 1; }\nворид б = Н.а;\nтағ в: сатр = б;')).toEqual([
      "TYPE_NOT_ASSIGNABLE 3:15 Type '1' is not assignable to type 'сатр'",
    ]);
  });
});

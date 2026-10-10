/**
 * The SomonScript type checker on rarer programs: each case checks the
 * errors it reports (as `CODE line:column message`) and, where TypeScript
 * judges the same program, that TypeScript agrees.
 */
import { compile } from '../src/compiler';
import { Lexer } from '../src/lexer';
import { Parser } from '../src/parser';
import { TypeChecker } from '../src/type-checker';

/** The checker's errors and warnings for `source`, strict unless asked otherwise. */
function check(source: string, strict = true): string[] {
  const parser = new Parser(new Lexer(source).tokenize());
  const ast = parser.parse();
  expect(parser.getErrors()).toEqual([]);
  const result = new TypeChecker(source, { strict }).check(ast);
  return [...result.errors, ...result.warnings].map(
    error => `${error.code} ${error.line}:${error.column} ${error.message}`
  );
}

/** TypeScript's errors for `source`, as codes with their line. */
function typeScriptErrors(source: string): string[] {
  return compile(source, { checker: 'typescript', strict: true }).errors.map(error =>
    error.replace(/^Type error \[(\w+)\] at line (\d+), column \d+: .*$/s, '$1 $2')
  );
}

describe('type checker: tuples', () => {
  test('an array is not assignable to a tuple, of whatever elements', () => {
    const source = [
      'тағ а: рақам[] = [1];',
      'тағ б: ҳар[] = [];',
      'тағ т: [рақам] = а;',
      'тағ у: [] = а;',
      'тағ в: [рақам] = б;',
      // Literals, returns, arguments and `чун` give tuples where a tuple is expected
      'тағ к: [рақам, сатр] = [1, "а"];',
      'функсия ф(): [рақам, рақам] { бозгашт [1, 2]; }',
      'функсия г(п: [рақам, сатр]) {}',
      'г([1, "б"]);',
      'тағ ж: [сатр, рақам][] = [["а", 1]];',
      'собит о = { п: [1, 2] чун [рақам, рақам] };',
      'тағ з: [рақам, рақам] = о.п;',
    ].join('\n');
    // They were accepted when every element type fitted every position
    expect(check(source)).toEqual([
      "TYPE_NOT_ASSIGNABLE 3:18 Type 'рақам[]' is not assignable to type '[рақам]'",
      "TYPE_NOT_ASSIGNABLE 4:13 Type 'рақам[]' is not assignable to type '[]'",
      "TYPE_NOT_ASSIGNABLE 5:18 Type 'ҳар[]' is not assignable to type '[рақам]'",
    ]);
    expect(typeScriptErrors(source)).toEqual(['TS2322 3', 'TS2322 4', 'TS2322 5']);
  });
});

describe('type checker: declared modules', () => {
  test('a module exports what it exports from another declared module', () => {
    const source = [
      'эълон модул "н" { содир собит х: рақам; содир интерфейс И { а: рақам; } }',
      'эълон модул "м" { содир * аз "н"; содир * чун Н аз "н"; содир { х чун з } аз "н"; }',
      'ворид { х, з, Н, И } аз "м";',
      'тағ у: сатр = х;',
      'тағ ю: сатр = з;',
      'тағ я: сатр = Н.х;',
      'тағ и: И = { а: 1 };',
      'ворид { в } аз "м";',
    ].join('\n');
    // `х`, `з` and `Н` were "Module '"м"' has no exported member"; imports come first
    expect(check(source)).toEqual([
      `PROPERTY_NOT_FOUND 8:9 Module '"м"' has no exported member 'в'`,
      "TYPE_NOT_ASSIGNABLE 4:15 Type 'рақам' is not assignable to type 'сатр'",
      "TYPE_NOT_ASSIGNABLE 5:15 Type 'рақам' is not assignable to type 'сатр'",
      "TYPE_NOT_ASSIGNABLE 6:15 Type 'рақам' is not assignable to type 'сатр'",
    ]);
    expect(typeScriptErrors(source)).toEqual(['TS2322 4', 'TS2322 5', 'TS2322 6', 'TS2305 8']);
  });

  test('modules that export each other end the search; one not declared here may export anything', () => {
    const cycle = [
      'эълон модул "а" { содир * аз "б"; содир собит я: рақам; }',
      'эълон модул "б" { содир * аз "а"; }',
      'ворид { х, я } аз "б";',
    ].join('\n');
    expect(check(cycle)).toEqual([
      `PROPERTY_NOT_FOUND 3:9 Module '"б"' has no exported member 'х'`,
    ]);
    expect(typeScriptErrors(cycle)).toEqual(['TS2305 3']);
    expect(
      check(
        'эълон модул "м" { содир * аз "берун"; содир { а } аз "берун"; }\nворид { х, а } аз "м";\nворид * чун М аз "м";\nМ.ҳарчӣ;'
      )
    ).toEqual([]);
  });
});

describe('type checker: namespaces', () => {
  test('a destructuring declaration exports each name it binds', () => {
    const source = [
      'номфазо Н { содир собит { а, б: [в] } = { а: 1, б: ["х"] }, [г, ...д] = [дуруст, нодуруст]; }',
      'тағ х: сатр = Н.а;',
      'тағ у: рақам = Н.в;',
      'тағ з: мантиқӣ = Н.г;',
      'тағ и: мантиқӣ[] = Н.д;',
      'номфазо М { содир собит { е } = { е: 1 }; }',
      'номфазо М { содир функсия ф(): сатр { бозгашт е; } }',
    ].join('\n');
    // The names were no members: `Н.а` was of no known type
    expect(check(source)).toEqual([
      "TYPE_NOT_ASSIGNABLE 2:15 Type 'рақам' is not assignable to type 'сатр'",
      "TYPE_NOT_ASSIGNABLE 3:16 Type 'сатр' is not assignable to type 'рақам'",
      "TYPE_NOT_ASSIGNABLE 7:47 Type 'рақам' is not assignable to return type 'сатр'",
    ]);
    expect(typeScriptErrors(source)).toEqual(['TS2322 2', 'TS2322 3', 'TS2322 7']);
  });

  test('an exported import alias is a member', () => {
    const source = [
      'номфазо А { содир собит б: рақам = 1; }',
      'номфазо Н { содир ворид х = А.б; }',
      'номфазо Н { содир функсия ф(): сатр { бозгашт х; } }',
      'тағ с: сатр = Н.х;',
    ].join('\n');
    // `Н.х` had no type, and `х` was not defined in the other block
    expect(check(source)).toEqual([
      "TYPE_NOT_ASSIGNABLE 3:47 Type 'рақам' is not assignable to return type 'сатр'",
      "TYPE_NOT_ASSIGNABLE 4:15 Type 'рақам' is not assignable to type 'сатр'",
    ]);
    expect(typeScriptErrors(source)).toEqual(['TS2322 3', 'TS2322 4']);
    // A declared module exports an alias only when marked so, as TypeScript
    expect(
      check(
        'эълон модул "м" { ворид х = Н.а; содир ворид у = Н.а; номфазо Н { собит а: рақам; } }\nворид { х, у } аз "м";'
      )
    ).toEqual([`PROPERTY_NOT_FOUND 2:9 Module '"м"' has no exported member 'х'`]);
    // Also where every other declaration is exported
    expect(
      check(
        'эълон модул "н" { ворид х = Н.а; номфазо Н { собит а: рақам; } }\nворид { х, Н } аз "н";'
      )
    ).toEqual([`PROPERTY_NOT_FOUND 2:9 Module '"н"' has no exported member 'х'`]);
  });

  test('a pattern with holes, defaults and a rest element exports every name', () => {
    const source = [
      'номфазо Н { содир собит [, а = 1, ...б] = [0, 2, 3], { в, ...г } = { в: "х", д: 1 }; }',
      'тағ х: сатр = Н.а;',
      'тағ у: рақам = Н.в;',
      'тағ з: рақам[] = Н.б;',
    ].join('\n');
    expect(check(source)).toEqual([
      "TYPE_NOT_ASSIGNABLE 2:15 Type 'рақам' is not assignable to type 'сатр'",
      "TYPE_NOT_ASSIGNABLE 3:16 Type 'сатр' is not assignable to type 'рақам'",
    ]);
    expect(typeScriptErrors(source)).toEqual(['TS2322 2', 'TS2322 3']);
  });

  test('a namespace or enum that is the body of a statement is checked too', () => {
    // TypeScript allows namespaces at the top level only (TS1235)
    expect(check('агар (дуруст) номфазо Н { содир собит а: рақам = "х"; }')).toEqual([
      `TYPE_NOT_ASSIGNABLE 1:50 Type '"х"' is not assignable to type 'рақам'`,
    ]);
    // Earlier members are known in later initializers
    expect(check('агар (дуруст) шумориш Р { А = 1, Б = А + 1 }')).toEqual([]);
  });
});

describe('type checker: more of declared modules', () => {
  test('a named import reads a member of the `содир =` object', () => {
    const source =
      'эълон модул "м" { собит а: { б: рақам }; содир = а; }\nворид { б } аз "м";\nтағ х: сатр = б;';
    expect(check(source)).toEqual([
      "TYPE_NOT_ASSIGNABLE 3:15 Type 'рақам' is not assignable to type 'сатр'",
    ]);
    expect(typeScriptErrors(source)).toEqual(['TS2322 3']);
    // Of an object with an index signature, any name: TypeScript is stricter (TS2305)
    expect(
      check('эълон модул "м" { собит а: { [к: сатр]: рақам }; содир = а; }\nворид { в } аз "м";')
    ).toEqual([]);
  });

  test('an export list exports values and types; a forward of a name the module lacks is unknown', () => {
    expect(
      check(
        [
          'эълон модул "м" { интерфейс И { а: рақам; } собит б: рақам; содир { И, б }; }',
          'ворид { И, б } аз "м";',
          'тағ и: И = { а: "х" };',
          'тағ с: сатр = б;',
        ].join('\n')
      )
    ).toEqual([
      `TYPE_NOT_ASSIGNABLE 3:12 Type '{ а: "х" }' is not assignable to type 'И'`,
      "TYPE_NOT_ASSIGNABLE 4:15 Type 'рақам' is not assignable to type 'сатр'",
    ]);
    expect(
      check(
        'эълон модул "н" { содир собит х: рақам; }\nэълон модул "м" { содир { нест чун у } аз "н"; }\nворид { у } аз "м";'
      )
    ).toEqual([]);
  });

  test('`эълон глобалӣ` adds members to `мантиқӣ` values', () => {
    expect(
      check(
        'эълон глобалӣ { интерфейс Boolean { баРақам(): рақам; } }\nтағ б = дуруст;\nтағ с: сатр = б.баРақам();'
      )
    ).toEqual(["TYPE_NOT_ASSIGNABLE 3:15 Type 'рақам' is not assignable to type 'сатр'"]);
  });
});

describe('type checker: interfaces, classes and enums', () => {
  test('overloads of an optional method, and a getter declared after its setter', () => {
    expect(
      check(
        [
          'интерфейс И { м?(): рақам; м?(х: рақам): рақам; set а(в: рақам); get а(): рақам; }',
          'функсия ф(и: И) { тағ н: сатр = и.м; и.а = 2; тағ с: сатр = и.а; }',
        ].join('\n')
      )
    ).toEqual([
      "TYPE_NOT_ASSIGNABLE 2:33 Type '() => рақам | беқимат' is not assignable to type 'сатр'",
      "TYPE_NOT_ASSIGNABLE 2:61 Type 'рақам' is not assignable to type 'сатр'",
    ]);
  });

  test('class members named by string and number literals', () => {
    const source = 'синф К { "а": рақам = 1; 2: сатр = "б"; }\nтағ с: сатр = нав К().а;';
    expect(check(source)).toEqual([
      "TYPE_NOT_ASSIGNABLE 2:15 Type 'рақам' is not assignable to type 'сатр'",
    ]);
    expect(typeScriptErrors(source)).toEqual(['TS2322 2']);
  });

  test('`ин.ном = …` in a nested function or class declares no member of the outer class', () => {
    expect(
      check(
        'синф К { х = 1; м() { функсия ф() { ин.у = 1; } синф Д { м() { ин.з = 2; } } } }\nтағ к = нав К(); к.у; к.з;'
      )
    ).toEqual([
      "PROPERTY_NOT_FOUND 2:20 Property 'у' does not exist on type 'К'",
      "PROPERTY_NOT_FOUND 2:25 Property 'з' does not exist on type 'К'",
    ]);
  });

  test('an enum member from a template is a string, one from a call a number', () => {
    expect(
      check(
        'функсия ф(): рақам { бозгашт 1; }\nшумориш Р { А = `а`, Б = ф() }\nтағ х: рақам = Р.А;\nтағ с: сатр = Р.Б;'
      )
    ).toEqual([
      "TYPE_NOT_ASSIGNABLE 3:16 Type 'сатр' is not assignable to type 'рақам'",
      "TYPE_NOT_ASSIGNABLE 4:15 Type 'рақам' is not assignable to type 'сатр'",
    ]);
  });

  test('a class extends classes only, and not itself', () => {
    expect(
      check(
        'интерфейс И {}\nсинф К мерос И {}\nсобит Л = 1;\nсинф М мерос Л {}\nфунксия ф() {}\nсинф Н мерос ф {}'
      )
    ).toEqual([
      "INVALID_EXTENDS 2:1 Class 'К' can only extend other classes, but 'И' is an interface",
      "INVALID_EXTENDS 4:1 Class 'М' can only extend other classes, but 'Л' is a literal",
      "INVALID_EXTENDS 6:1 Class 'Н' can only extend other classes, but 'ф' is a function",
    ]);
    expect(check('синф А мерос А {}')).toEqual([
      "CIRCULAR_INHERITANCE 1:1 Circular inheritance detected: class 'А' cannot extend itself",
    ]);
    // `А` extends a cycle it is no part of
    expect(check('синф Б мерос В {}\nсинф В мерос Б {}\nсинф А мерос Б {}')).toEqual([
      "CIRCULAR_INHERITANCE 1:1 Circular inheritance detected involving class 'Б'",
      "CIRCULAR_INHERITANCE 2:1 Circular inheritance detected involving class 'В'",
    ]);
  });
});

describe('type checker: rarer tuple types', () => {
  test('a rest element before others, a spread tuple, and holes', () => {
    expect(
      check(
        [
          // Elements after a rest element are not followed: any array
          'тағ т: [...рақам[], сатр] = [1, "а"];',
          'тағ о: [...рақам[], сатр] = 5;',
          'тағ у: [рақам, ...[сатр, сатр]] = [1, "а", "б"];',
          // A hole is `беқимат`
          'тағ к: [рақам, беқимат] = [1, ,];',
        ].join('\n')
      )
    ).toEqual(["TYPE_NOT_ASSIGNABLE 2:29 Type '5' is not assignable to type 'ношинос[]'"]);
  });

  test('tuples with rest and optional elements are assignable to their like', () => {
    expect(
      check(
        [
          'тағ а: [рақам, ...сатр[]] = [1];',
          'тағ б: [рақам, ...сатр[]] = а;',
          'тағ в: [рақам, сатр?] = [1];',
          'тағ г: [рақам, сатр?] = в;',
          'тағ н: абадан = 1;',
        ].join('\n')
      )
    ).toEqual(["TYPE_NOT_ASSIGNABLE 5:17 Type '1' is not assignable to type 'абадан'"]);
  });
});

describe('type checker: `чун собит` and assertions', () => {
  test('literals keep their types; holes, spreads and computed keys make plain types', () => {
    expect(
      check(
        [
          'собит ф = (а: рақам) => а;',
          // A function has every member of an object type it is asserted to
          'собит н = ф чун { name: сатр; length: рақам };',
          'собит а = +1 чун собит;',
          'тағ б: 2 = а;',
          'собит в = [1, , 3] чун собит;',
          'собит г = [...[1]] чун собит;',
          'собит д = { ...{ а: 1 } } чун собит;',
          'собит е = { ["к"]: 1 } чун собит;',
          'собит ж = -1n чун собит;',
        ].join('\n')
      )
    ).toEqual(["TYPE_NOT_ASSIGNABLE 4:12 Type '1' is not assignable to type '2'"]);
  });

  test('an assignment through an assertion only forgets what was known', () => {
    expect(check('тағ х: рақам | сатр = 1;\n(х чун ҳар) = "а";\nтағ у: рақам = х;')).toEqual([]);
  });
});

describe('type checker: calls and `нав`', () => {
  test('argument counts with a rest parameter, an anonymous function, a built-in method type', () => {
    expect(
      check(
        [
          'функсия ф(а: рақам, ...б: рақам[]) {}',
          'ф();',
          'собит г = (а: рақам) => а;',
          'г("х");',
          'тағ х: рақам = "а".at;',
          'тағ м = нав Map();',
          'тағ у: рақам = м.get(1);',
        ].join('\n')
      )
    ).toEqual([
      "ARGUMENT_COUNT_MISMATCH 2:1 Function 'ф' expected at least 1 argument(s) but got 0",
      `ARGUMENT_TYPE_MISMATCH 4:3 Argument 1 of 'anonymous' expected type 'рақам' but got '"х"'`,
      "TYPE_NOT_ASSIGNABLE 5:16 Type '() => сатр | беқимат' is not assignable to type 'рақам'",
    ]);
  });

  test('an overload with a rest parameter, and warnings while overloads are tried', () => {
    const source = [
      'функсия ф(...а: рақам[]): рақам;',
      'функсия ф(а: сатр): сатр;',
      'функсия ф(...а: ҳар[]): ҳар { бозгашт а; }',
      'тағ х: сатр = ф(1, 2);',
    ].join('\n');
    expect(check(source)).toEqual([
      "TYPE_NOT_ASSIGNABLE 4:15 Type 'рақам' is not assignable to type 'сатр'",
    ]);
    expect(typeScriptErrors(source)).toEqual(['TS2322 4']);
    // Not strict: the warning about the argument is reported once, not for each overload
    expect(
      check(
        [
          'функсия ф(а: рақам): рақам;',
          'функсия ф(а: сатр): сатр;',
          'функсия ф(а: ҳар) { бозгашт а; }',
          'собит о: { танҳохонӣ а: рақам } = { а: 1 };',
          'ф(о.а = 2);',
        ].join('\n'),
        false
      )
    ).toEqual(["READONLY_ASSIGNMENT 5:3 Cannot assign to 'а' because it is a read-only property"]);
  });

  test('`нав` of a member with a construct signature', () => {
    expect(
      check(
        'интерфейс Сохтор { нав (): { а: рақам }; }\nфунксия ф(о: { К: Сохтор }) { тағ с: сатр = нав о.К().а; }'
      )
    ).toEqual(["TYPE_NOT_ASSIGNABLE 2:45 Type 'рақам' is not assignable to type 'сатр'"]);
  });
});

describe('type checker: members', () => {
  test('`ин` in a union member, a JavaScript name of an alias member, a static index signature', () => {
    expect(
      check(
        [
          'интерфейс Гиреҳ { баъдӣ: ин | холӣ; қимат: рақам; }',
          'функсия ф(г: Гиреҳ) { тағ с: сатр = г.баъдӣ!.қимат; }',
          'интерфейс И { илова(х: рақам): рақам; }',
          'функсия г(и: И) { тағ с: сатр = и.push(1); }',
          'синф К { статикӣ [к: сатр]: рақам; }',
          'К.ҳарчӣ;',
          'тағ т: [рақам] = [1];',
          'тағ б = т[5];',
        ].join('\n')
      )
    ).toEqual([
      "TYPE_NOT_ASSIGNABLE 2:37 Type 'рақам' is not assignable to type 'сатр'",
      "TYPE_NOT_ASSIGNABLE 4:33 Type 'рақам' is not assignable to type 'сатр'",
    ]);
  });

  test('a widened read-only array or open object keeps what it was', () => {
    expect(
      check(
        [
          'собит р: танҳохонӣ рақам[] = [1];',
          'тағ к = р;',
          'к.илова(2);',
          // A spread makes an object open: other members are not errors (TypeScript: TS2339)
          'тағ а = { х: 1 };',
          'тағ о = { ...а, у: 2 };',
          'тағ б = о;',
          'б.з;',
        ].join('\n')
      )
    ).toEqual([
      "PROPERTY_NOT_FOUND 3:3 Property 'илова' (push) does not exist on type 'танҳохонӣ рақам[]'",
    ]);
  });

  test('a possibly-null member is named in the message: `ин.х`, `о.а.б`', () => {
    expect(
      check(
        [
          'синф К { х: сатр | холӣ = холӣ; м(): рақам { бозгашт ин.х.length; } н(): ин { бозгашт ин; } }',
          'функсия ф(о: { а: { б: сатр | холӣ } | холӣ }) { бозгашт о.а!.б.length; }',
        ].join('\n')
      )
    ).toEqual([
      "POSSIBLY_NULL 1:54 'ин.х' is possibly 'холӣ'",
      "POSSIBLY_NULL 2:58 'о.а.б' is possibly 'холӣ'",
    ]);
  });

  test('a recursive interface is compared once per pair', () => {
    expect(
      check(
        'интерфейс Г { б: Г | холӣ; а: рақам; }\nинтерфейс Ҳ { б: Ҳ | холӣ; а: сатр; }\nфунксия ф(г: Г) { тағ ҳ: Ҳ = г; }'
      )
    ).toEqual(["TYPE_NOT_ASSIGNABLE 3:30 Type 'Г' is not assignable to type 'Ҳ'"]);
    expect(check('тағ м: Map<сатр, рақам> = нав Map();\nтағ с: Set<сатр> = м;')).toEqual([
      "TYPE_NOT_ASSIGNABLE 2:20 Type 'Map<сатр, рақам>' is not assignable to type 'Set<сатр>'",
    ]);
  });
});

describe('type checker: types in messages', () => {
  test('intersections, optional members, `ношинос` and `беджавоб` are written as in the source', () => {
    const source = [
      'тағ х: { а: рақам } & { б?: сатр } = 1;',
      'тағ у: ношинос = 1;',
      'тағ з: рақам = у;',
      'функсия ф(): беджавоб {}',
      'тағ и: рақам = ф();',
    ].join('\n');
    expect(check(source)).toEqual([
      "TYPE_NOT_ASSIGNABLE 1:38 Type '1' is not assignable to type '{ а: рақам } & { б?: сатр }'",
      "TYPE_NOT_ASSIGNABLE 3:16 Type 'ношинос' is not assignable to type 'рақам'",
      "TYPE_NOT_ASSIGNABLE 5:16 Type 'беджавоб' is not assignable to type 'рақам'",
    ]);
    expect(typeScriptErrors(source)).toEqual(['TS2322 1', 'TS2322 3', 'TS2322 5']);
  });
});

describe('type checker: narrowing', () => {
  test('comparisons with `холӣ` on either side', () => {
    expect(
      check(
        'функсия ф(х: холӣ, у: сатр | холӣ) {\n  агар (х !== холӣ) { тағ а: рақам = х; }\n  агар (холӣ !== у) { тағ б: рақам = у.length; }\n}'
      )
    ).toEqual([]);
  });

  test('`навъи х === "…"` keeps the members of that JavaScript type', () => {
    expect(
      check(
        [
          'эълон собит Р: беназир рамз;',
          'синф К { а = 1; }',
          'функсия ф(х: рақам | сатр, з: навъи Р | рақам, ж: объект | сатр, к: (() => рақам) | сатр, л: К | сатр, м: Map<сатр, рақам> | рақам): ҳар {',
          '  агар (навъи х === "boolean") { тағ а: рақам = х; }',
          '  агар (навъи ф(х, з, ж, к, л, м) === "string") {}',
          '  агар (навъи з === "symbol") {}',
          '  агар (навъи ж === "string") { тағ в: рақам = ж; }',
          '  агар (навъи к === "function") { тағ г: сатр = к(); }',
          '  агар (навъи л === "object") {}',
          '  агар (навъи м === "object") { тағ е: рақам = м; }',
          '}',
        ].join('\n')
      )
    ).toEqual([
      "TYPE_NOT_ASSIGNABLE 7:48 Type 'сатр' is not assignable to type 'рақам'",
      "TYPE_NOT_ASSIGNABLE 8:49 Type 'рақам' is not assignable to type 'сатр'",
      "TYPE_NOT_ASSIGNABLE 10:48 Type 'Map<сатр, рақам>' is not assignable to type 'рақам'",
    ]);
  });

  test('`instanceof` narrows by a class only', () => {
    expect(
      check(
        [
          'синф К { а = 1; }',
          'функсия ф(х: К | сатр, о: { К: навъи К }): ҳар {',
          '  агар (ф(х, о) instanceof К) {}',
          '  агар (х instanceof о.К) {}',
          '  агар (х instanceof Date) { тағ а: рақам = х; }',
          '  бозгашт х;',
          '}',
        ].join('\n')
      )
    ).toEqual(["TYPE_NOT_ASSIGNABLE 5:45 Type 'К | сатр' is not assignable to type 'рақам'"]);
  });

  test('type predicates and assertion functions on arguments they cannot narrow', () => {
    expect(
      check(
        [
          'функсия аст(х: ҳар): х аст сатр { бозгашт навъи х === "string"; }',
          'функсия тасдиқКун(ш: ҳар): тасдиқ ш {}',
          'тағ а: ҳар[] = [];',
          'агар (аст(...а)) {}',
          'тасдиқКун(...а);',
          'агар (аст(1 + 2)) {}',
          // A number that is a string: both, as far as the checker knows
          'тағ н: рақам = 1;',
          'агар (аст(н)) { тағ с: сатр = н; }',
        ].join('\n')
      )
    ).toEqual([]);
  });

  test('`кӯшиш` that always returns ends the branch, as the code after it shows', () => {
    const source = [
      'функсия ф(х: сатр | холӣ, у: сатр | холӣ, з: сатр | холӣ): рақам {',
      '  агар (х === холӣ) { кӯшиш { бозгашт 0; } гирифтан { бозгашт 1; } }',
      '  агар (у === холӣ) { кӯшиш {} ниҳоят { бозгашт 0; } }',
      '  агар (з === холӣ) { кӯшиш { бозгашт 0; } ниҳоят {} }',
      '  бозгашт х.length + у.length + з.length;',
      '}',
      'функсия г(х: сатр | холӣ): рақам {',
      '  агар (х === холӣ) { кӯшиш { бозгашт 0; } гирифтан {} }',
      '  бозгашт х.length;',
      '}',
    ].join('\n');
    expect(check(source)).toEqual(["POSSIBLY_NULL 9:11 'х' is possibly 'холӣ'"]);
    expect(typeScriptErrors(source)).toEqual(['TS18047 9']);
  });

  test('closures forget narrowed members; a loop that assigns forgets a narrowed variable', () => {
    expect(
      check(
        [
          'функсия ф(о: { а: сатр | холӣ }, р: сатр[]) {',
          '  агар (о.а !== холӣ) { собит г = () => о.а.length; }',
          '  тағ х: сатр | холӣ = "а";',
          '  агар (х !== холӣ) { барои (х аз р) {} тағ н: рақам = х.length; }',
          '}',
          // A `давом` after a template literal still continues the loop
          'функсия г(х: сатр | холӣ, р: рақам[]) {',
          '  барои (собит и аз р) { агар (х === холӣ) { чоп.сабт(`х`); давом; } тағ н: рақам = х.length; }',
          '}',
        ].join('\n')
      )
    ).toEqual(["POSSIBLY_NULL 2:41 'о.а' is possibly 'холӣ'"]);
  });
});

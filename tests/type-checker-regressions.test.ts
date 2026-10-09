/**
 * Regression tests for type-checker defects found in the project review
 * (false positives that rejected valid programs, unchecked program regions,
 * quadratic scoping) and for the AST contract nodes the checker must accept.
 */

import { TypeChecker } from '../src/type-checker';
import { Lexer } from '../src/lexer';
import { Parser } from '../src/parser';
import { compile } from '../src/compiler';
import { Program, Statement, Expression } from '../src/ast';

function typeCheck(source: string) {
  const parser = new Parser(new Lexer(source).tokenize());
  const program = parser.parse();
  expect(parser.getErrors()).toEqual([]);
  return new TypeChecker(source).check(program);
}

function errorsOf(source: string): string[] {
  return typeCheck(source).errors.map(e => `${e.code}: ${e.message}`);
}

/**
 * Type-checks with `InterfaceDeclaration.extends` filled in by hand: the parser
 * reads the `мерос` clause of an interface but doesn't record it yet.
 */
function codesWithInterfaceExtends(source: string, parents: Record<string, string[]>): string[] {
  const parser = new Parser(new Lexer(source).tokenize());
  const program = parser.parse();
  expect(parser.getErrors()).toEqual([]);
  for (const statement of program.body as Array<Statement & Record<string, any>>) {
    const names = statement.type === 'InterfaceDeclaration' && parents[statement.name.name];
    if (names) {
      statement.extends = names.map(name => ({
        type: 'Identifier',
        name,
        line: statement.line,
        column: statement.column,
      }));
    }
  }
  return new TypeChecker(source).check(program).errors.map(e => `${e.code}: ${e.message}`);
}

function codesOf(source: string): string[] {
  return typeCheck(source).errors.map(e => e.code);
}

/** Compile in strict mode and run the emitted JS, returning console.log output. */
function run(source: string): string[] {
  const result = compile(source, { strict: true });
  expect(result.errors).toEqual([]);
  const logs: string[] = [];
  const fakeConsole = { log: (...args: unknown[]) => logs.push(args.map(String).join(' ')) };
  new Function('console', result.code)(fakeConsole);
  return logs;
}

describe('TypeChecker regressions: assignability', () => {
  test('subclass instance is assignable to its base class', () => {
    expect(
      errorsOf(`
синф Ҳайвон { ном: сатр = "x"; }
синф Саг мерос Ҳайвон { }
тағйирёбанда а: Ҳайвон = нав Саг();
`)
    ).toEqual([]);
  });

  test('multi-level hierarchy is not reported as circular and is assignable', () => {
    expect(
      errorsOf(`
синф А { }
синф Б мерос А { }
синф В мерос Б { }
тағйирёбанда а: А = нав В();
`)
    ).toEqual([]);
  });

  test('base class declared after the subclass is resolved', () => {
    expect(
      errorsOf(`
синф Саг мерос Ҳайвон { }
синф Ҳайвон { }
тағйирёбанда а: Ҳайвон = нав Саг();
`)
    ).toEqual([]);
  });

  test('subclass passed to a parameter typed with an abstract base class', () => {
    expect(
      errorsOf(`
мавҳум синф Шакл { мавҳум масоҳат(): рақам; }
синф Мураббаъ мерос Шакл { масоҳат(): рақам { бозгашт 4; } }
функсия чоп_кун(ш: Шакл): рақам { бозгашт ш.масоҳат(); }
чоп_кун(нав Мураббаъ());
`)
    ).toEqual([]);
  });

  test('unrelated class is still rejected', () => {
    expect(
      codesOf(`
синф А { а: рақам = 1; }
синф Б { б: сатр = "б"; }
тағйирёбанда х: А = нав Б();
`)
    ).toEqual(['TYPE_NOT_ASSIGNABLE']);
  });

  test('true circular inheritance is still reported', () => {
    expect(codesOf('синф А мерос Б { } синф Б мерос А { }')).toContain('CIRCULAR_INHERITANCE');
  });

  test('class instance is assignable to a matching interface', () => {
    expect(
      errorsOf(`
интерфейс Номдор { ном: сатр; }
синф Шахс татбиқ Номдор { ном: сатр = "Али"; }
тағйирёбанда н: Номдор = нав Шахс();
`)
    ).toEqual([]);
  });

  test('inherited class properties count towards interface compatibility', () => {
    expect(
      errorsOf(`
интерфейс Номдор { ном: сатр; синну: рақам; }
синф Асос { ном: сатр = "Али"; }
синф Шахс мерос Асос { синну: рақам = 3; }
тағйирёбанда н: Номдор = нав Шахс();
`)
    ).toEqual([]);
  });

  test('interface inheritance (мерос) includes parent members', () => {
    const source = `
функсия гир(б: Асос): рақам { бозгашт б.ид; }
тағйирёбанда к: Кӯдак = { ид: 1, ном: "а" };
гир(к);
интерфейс Кӯдак мерос Асос { ном: сатр; }
интерфейс Асос { ид: рақам; }
`;
    expect(codesWithInterfaceExtends(source, { Кӯдак: ['Асос'] })).toEqual([]);
  });

  test('derived interface still requires inherited members', () => {
    const source = `
интерфейс Асос { ид: рақам; }
интерфейс Кӯдак мерос Асос { ном: сатр; }
тағйирёбанда к: Кӯдак = { ном: "а" };
`;
    expect(codesWithInterfaceExtends(source, { Кӯдак: ['Асос'] })).toEqual([
      "TYPE_NOT_ASSIGNABLE: Type '{ ном: \"а\" }' is not assignable to type 'Кӯдак'",
    ]);
  });

  test('inherited members are not reported as unknown when мерос is not recorded', () => {
    expect(
      errorsOf(`
интерфейс Асос { ид: рақам; }
интерфейс Кӯдак мерос Асос { ном: сатр; }
тағйирёбанда к: Кӯдак = { ид: 1, ном: "а" };
`)
    ).toEqual([]);
  });

  test('ношинос, объект and ҳар follow top-type rules', () => {
    expect(
      errorsOf(`
тағйирёбанда а: ношинос = 5;
тағйирёбанда б: объект = { x: 1 };
функсия ф(п: ҳар): рақам { тағйирёбанда н: рақам = п; бозгашт н; }
`)
    ).toEqual([]);
    expect(codesOf('тағйирёбанда б: объект = 5;')).toEqual(['TYPE_NOT_ASSIGNABLE']);
  });

  test('exported classes, interfaces and aliases are collected', () => {
    expect(errorsOf('содир синф Асос { } синф Кӯдак мерос Асос { }')).toEqual([]);
    expect(codesOf('содир интерфейс И { ном: сатр; } тағйирёбанда и: И = { ном: 5 };')).toEqual([
      'TYPE_NOT_ASSIGNABLE',
    ]);
    expect(codesOf('содир навъ Н = рақам; тағйирёбанда н: Н = "а";')).toEqual([
      'TYPE_NOT_ASSIGNABLE',
    ]);
  });
});

describe('TypeChecker regressions: scoping', () => {
  test('function body may reference a later top-level variable', () => {
    expect(
      errorsOf('функсия салом() { чоп.сабт(паём); } тағйирёбанда паём = "салом"; салом();')
    ).toEqual([]);
  });

  test('nested function declarations are hoisted', () => {
    expect(errorsOf('функсия берун() { дарун(); функсия дарун() {} }')).toEqual([]);
  });

  test('namespace names are registered', () => {
    expect(
      errorsOf('номфазо Асбоб { содир функсия ф() { бозгашт 1; } } чоп.сабт(Асбоб.ф());')
    ).toEqual([]);
  });

  test('array rest elements are bound', () => {
    expect(errorsOf('тағйирёбанда [х, ...й] = [1, 2, 3]; чоп.сабт(х, й);')).toEqual([]);
  });

  test('destructuring of untyped values binds every name', () => {
    expect(
      errorsOf(`
функсия гир(): ҳар { бозгашт { а: 1 }; }
тағйирёбанда { а: б } = гир();
тағйирёбанда [в, г] = гир();
чоп.сабт(б, в, г);
`)
    ).toEqual([]);
  });

  test('block-scoped variables do not leak', () => {
    expect(
      codesOf(`
агар (дуруст) { тағйирёбанда дарун = 1; }
чоп.сабт(дарун);
`)
    ).toEqual(['UNDEFINED_IDENTIFIER']);
  });

  test('undefined identifiers inside nested bodies are reported', () => {
    expect(
      codesOf(`
функсия ф() {
  агар (дуруст) { бозгашт номаълум + 1; }
  бозгашт 0;
}
`)
    ).toEqual(['UNDEFINED_IDENTIFIER']);
  });

  test('reassigning an unannotated variable with another value of the same kind', () => {
    expect(
      errorsOf(`
тағйирёбанда ҳисоб = 0;
ҳисоб = 5;
тағйирёбанда натиҷа = холӣ;
натиҷа = "тайёр";
тағйирёбанда о = { х: 1 };
о.х = 2;
`)
    ).toEqual([]);
  });

  test('checking is roughly linear in the number of functions', () => {
    const build = (n: number) => {
      const lines: string[] = [];
      for (let i = 0; i < n; i++) {
        lines.push(`тағйирёбанда т${i} = ${i};`);
        lines.push(`функсия ф${i}(а: рақам): рақам { бозгашт а + т${i}; }`);
      }
      return new Parser(new Lexer(lines.join('\n')).tokenize()).parse();
    };
    const time = (n: number) => {
      const program = build(n);
      const start = process.hrtime.bigint();
      const result = new TypeChecker().check(program);
      const ms = Number(process.hrtime.bigint() - start) / 1e6;
      expect(result.errors).toEqual([]);
      return ms;
    };
    time(500); // warm up
    const small = Math.max(time(1000), 1);
    const large = time(8000);
    // Quadratic behaviour made 8x the input ~90x slower; linear is ~8x.
    expect(large / small).toBeLessThan(30);
  });
});

describe('TypeChecker regressions: statement coverage', () => {
  test('object literal is checked against its interface', () => {
    const errors = errorsOf(`
интерфейс Шахс { ном: сатр; сол: рақам; }
тағйирёбанда ш: Шахс = { ном: 5 };
`);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("'Шахс'");
  });

  test('optional interface members may be omitted', () => {
    expect(
      errorsOf(`
интерфейс Шахс { ном: сатр; сол?: рақам; }
тағйирёбанда ш: Шахс = { ном: "Али" };
`)
    ).toEqual([]);
  });

  test('unknown properties in an object literal are rejected', () => {
    const errors = errorsOf(`
интерфейс Шахс { ном: сатр; }
тағйирёбанда ш: Шахс = { ном: "Али", синну: 3 };
`);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('синну');
  });

  test('object literals inside arrays and arguments are checked', () => {
    expect(
      codesOf(`
интерфейс Шахс { ном: сатр; }
тағйирёбанда р: Шахс[] = [{ ном: 1 }];
функсия ф(ш: Шахс) { }
ф({ ном: 2 });
`)
    ).toEqual(['TYPE_NOT_ASSIGNABLE', 'ARGUMENT_TYPE_MISMATCH']);
  });

  test('return statements are checked against the declared return type', () => {
    expect(codesOf('функсия ф(): рақам { бозгашт "матн"; }')).toEqual(['TYPE_NOT_ASSIGNABLE']);
    expect(
      errorsOf(`
функсия ф(х: рақам): рақам {
  агар (х > 0) { бозгашт х * 2; }
  бозгашт 0;
}
`)
    ).toEqual([]);
  });

  test('async function returns are checked against the Promise payload', () => {
    expect(errorsOf('ҳамзамон функсия ф(): Promise<сатр> { бозгашт "а"; }')).toEqual([]);
    expect(codesOf('ҳамзамон функсия ф(): Promise<сатр> { бозгашт 1; }')).toEqual([
      'TYPE_NOT_ASSIGNABLE',
    ]);
  });

  test('assignments are checked', () => {
    expect(codesOf('тағйирёбанда х: рақам = 1; х = "сатр";')).toEqual(['TYPE_NOT_ASSIGNABLE']);
    expect(codesOf('х = "сатр";')).toEqual(['UNDEFINED_IDENTIFIER']);
  });

  test('declarations nested in control flow are checked', () => {
    const source = `
агар (дуруст) { тағйирёбанда й: рақам = "сатр"; } вагарна { тағйирёбанда з: сатр = 1; }
то (нодуруст) { тағйирёбанда а: рақам = "а"; }
барои (тағйирёбанда и = 0; и < 1; и++) { тағйирёбанда б: рақам = "б"; }
кӯшиш { тағйирёбанда в: рақам = "в"; } гирифтан (х) { тағйирёбанда г: рақам = "г"; } ниҳоят { тағйирёбанда д: рақам = "д"; }
интихоб (1) { ҳолат 1: тағйирёбанда е: рақам = "е"; шикастан; }
`;
    expect(codesOf(source)).toEqual(Array(8).fill('TYPE_NOT_ASSIGNABLE'));
  });

  test('class method bodies are checked with ин bound to the class', () => {
    expect(
      codesOf(`
интерфейс Шахс { ном: сатр; }
синф Анбор {
  ном: сатр = "а";
  ҳисоб(): рақам {
    тағйирёбанда з: рақам = "сатр";
    тағйирёбанда р: Шахс[] = [{ ном: 1 }];
    бозгашт ин.ном;
  }
}
`)
    ).toEqual(['TYPE_NOT_ASSIGNABLE', 'TYPE_NOT_ASSIGNABLE', 'TYPE_NOT_ASSIGNABLE']);
  });

  test('constructor assigning parameters to typed properties is accepted', () => {
    expect(
      errorsOf(`
синф Шахс {
  ном: сатр;
  синну: рақам;
  конструктор(ном: сатр, синну: рақам) {
    ин.ном = ном;
    ин.синну = синну;
  }
  гирНом(): сатр { бозгашт ин.ном; }
}
тағйирёбанда ш = нав Шахс("Али", 3);
тағйирёбанда н: сатр = ш.гирНом();
`)
    ).toEqual([]);
  });
});

describe('TypeChecker regressions: diagnostics', () => {
  test('object types, top types and generics print readably', () => {
    const [objectError] = errorsOf('тағйирёбанда а: рақам = { х: 1 };');
    expect(objectError).toContain('{ х: 1 }');
    const [anyError] = errorsOf('тағйирёбанда н: беқимат = 1;');
    expect(anyError).toContain("'беқимат'");
    const [promiseError] = errorsOf(
      'ҳамзамон функсия ф(): Promise<сатр> { бозгашт "а"; } тағйирёбанда н: рақам = ф();'
    );
    expect(promiseError).toContain('Promise<сатр>');
  });

  test('TYPE_NOT_ASSIGNABLE points at the initializer', () => {
    const [error] = typeCheck('тағйирёбанда а: рақам = "x";').errors;
    expect(error.column).toBe(25);
  });

  test('repeated interface declarations merge', () => {
    expect(
      codesOf(`
интерфейс И { а: рақам; }
интерфейс И { б: сатр; }
тағйирёбанда и: И = { а: 1 };
`)
    ).toEqual(['TYPE_NOT_ASSIGNABLE']);
  });

  test('a tuple is not assignable to an arbitrary interface', () => {
    expect(
      codesOf('интерфейс И { ном: сатр; } тағйирёбанда т: [рақам] = [1]; тағйирёбанда и: И = т;')
    ).toEqual(['TYPE_NOT_ASSIGNABLE']);
  });
});

describe('TypeChecker regressions: real programs', () => {
  test('class hierarchy with polymorphic dispatch compiles and runs', () => {
    expect(
      run(`
мавҳум синф Шакл {
  мавҳум масоҳат(): рақам;
  тавсиф(): сатр { бозгашт "масоҳат " + ин.масоҳат(); }
}
синф Мураббаъ мерос Шакл {
  тараф: рақам;
  конструктор(тараф: рақам) { супер(); ин.тараф = тараф; }
  масоҳат(): рақам { бозгашт ин.тараф * ин.тараф; }
}
синф Доира мерос Шакл {
  радиус: рақам;
  конструктор(радиус: рақам) { супер(); ин.радиус = радиус; }
  масоҳат(): рақам { бозгашт 3 * ин.радиус * ин.радиус; }
}
функсия ҷамъ(шаклҳо: Шакл[]): рақам {
  тағйирёбанда натиҷа = 0;
  барои (тағйирёбанда ш аз шаклҳо) { натиҷа += ш.масоҳат(); }
  бозгашт натиҷа;
}
тағйирёбанда шаклҳо: Шакл[] = [нав Мураббаъ(2), нав Доира(1)];
чоп.сабт(ҷамъ(шаклҳо));
чоп.сабт(шаклҳо[0].тавсиф());
`)
    ).toEqual(['7', 'масоҳат 4']);
  });

  test('interfaces with optional members and inheritance compile and run', () => {
    expect(
      run(`
интерфейс Объект { ид: рақам; }
интерфейс Корбар мерос Объект { ном: сатр; почта?: сатр; }
функсия тавсиф(к: Корбар): сатр {
  агар (к.почта) { бозгашт к.ном + " <" + к.почта + ">"; }
  бозгашт к.ном;
}
тағйирёбанда корбарон: Корбар[] = [{ ид: 1, ном: "Али" }, { ид: 2, ном: "Вали", почта: "в@т.тҷ" }];
барои (тағйирёбанда к аз корбарон) { чоп.сабт(к.ид, тавсиф(к)); }
`)
    ).toEqual(['1 Али', '2 Вали <в@т.тҷ>']);
  });

  test('generic interface and generic function compile and run', () => {
    expect(
      run(`
интерфейс Қуттӣ<T> { қимат: T; }
функсия кушо<T>(қ: Қуттӣ<T>): T { бозгашт қ.қимат; }
тағйирёбанда қ: Қуттӣ<рақам> = { қимат: 42 };
чоп.сабт(кушо(қ));
`)
    ).toEqual(['42']);
  });

  test('async functions with Promise return types compile', () => {
    const result = compile(
      `
ҳамзамон функсия гир(): Promise<рақам> { бозгашт 1; }
ҳамзамон функсия асосӣ(): Promise<беджавоб> {
  тағйирёбанда н: рақам = интизор гир();
  чоп.сабт(н);
}
асосӣ();
`,
      { strict: true }
    );
    expect(result.errors).toEqual([]);
  });
});

describe('TypeChecker regressions: false positives found while probing', () => {
  test('array literal in a union element context is typed by the tuple member', () => {
    expect(errorsOf('тағйирёбанда р: (сатр | [сатр, рақам])[] = ["а", ["б", 1]];')).toEqual([]);
  });

  test('union-typed references are accepted where a narrowed member fits', () => {
    expect(
      errorsOf(`
синф Мошин { ном: сатр = "м"; }
функсия ф(х: сатр | рақам, м: Мошин | холӣ): сатр {
  агар (х == "а") { бозгашт х; }
  агар (м != холӣ) { тағйирёбанда н: Мошин = м; }
  бозгашт "р";
}
`)
    ).toEqual([]);
    // Non-reference unions are still checked as a whole
    expect(codesOf('тағйирёбанда р: сатр[] = ["а", 1];')).toEqual(['TYPE_NOT_ASSIGNABLE']);
  });

  test('class methods satisfy interface method signatures', () => {
    expect(
      errorsOf(`
интерфейс Ш { ном: сатр; салом(): сатр; }
синф Ч татбиқ Ш { ном: сатр = "а"; салом(): сатр { бозгашт "с"; } }
тағйирёбанда ш: Ш = нав Ч();
`)
    ).toEqual([]);
  });

  test('interfaces with index signatures accept any keys', () => {
    expect(
      errorsOf(`
интерфейс Луғат { [калид: сатр]: ҳар; }
функсия сохтан(): Луғат { бозгашт {}; }
тағйирёбанда л: Луғат = { ном: "Сомон", фаъол: дуруст };
`)
    ).toEqual([]);
  });

  test('classes may extend imported or builtin bases', () => {
    expect(
      errorsOf(`
ворид { Асос } аз "./асос";
синф А мерос Асос { }
синф МанХато мерос Хато { конструктор(п: сатр) { супер(п); } }
синф ДигарХато мерос Error { }
`)
    ).toEqual([]);
  });

  test('null is accepted for any declared type', () => {
    expect(
      errorsOf(`
синф Гиреҳ { оянда: Гиреҳ = холӣ; }
функсия ёфтан(): Гиреҳ { бозгашт холӣ; }
тағйирёбанда г: Гиреҳ = ёфтан();
г.оянда = холӣ;
`)
    ).toEqual([]);
  });

  test('nested object literals are checked for unknown properties', () => {
    expect(
      codesOf(`
интерфейс Суроға { шаҳр: сатр; }
интерфейс Шахс { ном: сатр; суроға: Суроға; }
тағйирёбанда ш: Шахс = { ном: "а", суроға: { шаҳр: "Хуҷанд", кӯча: "Сомонӣ" } };
`)
    ).toEqual(['TYPE_NOT_ASSIGNABLE']);
  });
});

describe('TypeChecker: type assertions', () => {
  const PRELUDE = `
интерфейс И { а: рақам; б?: сатр; }
синф Ҳайвон { ном: сатр = "ҳ"; }
синф Саг мерос Ҳайвон { аккос(): сатр { бозгашт "вав"; } }
`;
  const errors = (source: string) => errorsOf(PRELUDE + source);

  test('х чун Т has the type Т', () => {
    expect(
      errors('собит а: ношинос = "с"; собит н: рақам = (а чун сатр).length + (<сатр>а).length;')
    ).toEqual([]);
    expect(errors('собит б: сатр = "1" чун ҳар чун рақам;')).toEqual([
      "TYPE_NOT_ASSIGNABLE: Type 'рақам' is not assignable to type 'сатр'",
    ]);
  });

  test.each([
    ['a string to a number', 'собит х = "а" чун рақам;', 'сатр', 'рақам'],
    [
      'unrelated object types',
      'собит х = { а: 1 } чун { б: рақам };',
      '{ а: рақам }',
      '{ б: рақам }',
    ],
    ['unrelated arrays', 'собит х = [1, 2] чун сатр[];', 'рақам[]', 'сатр[]'],
    ['a class to an unrelated class', 'собит х = нав Саг() чун И;', 'Саг', 'И'],
  ])(
    'an assertion between types that do not overlap is an error: %s',
    (_name, source, from, to) => {
      expect(errors(source)).toEqual([
        `TYPE_NOT_ASSIGNABLE: Conversion of type '${from}' to type '${to}' may be a mistake because neither type sufficiently overlaps with the other; assert to 'ношинос' first if this is intended`,
      ]);
    }
  );

  test.each([
    ['through ношинос', 'собит х = "а" чун ношинос чун рақам;'],
    ['through ҳар', 'собит х = "а" чун ҳар чун рақам;'],
    ['a literal to another literal of its type', 'собит х = 1 чун 2;'],
    ['a downcast', 'собит ҳ: Ҳайвон = нав Саг(); собит с = (ҳ чун Саг).аккос();'],
    ['an upcast', 'собит ҳ = нав Саг() чун Ҳайвон;'],
    ['an empty object', 'собит х = {} чун И;'],
    ['extra properties', 'собит х = { а: 1, в: 2 } чун И;'],
    ['a tuple', 'собит х = [1, "а"] чун [рақам, сатр];'],
    ['one member of a union', 'функсия ф(х: рақам | сатр): рақам { бозгашт х чун рақам; }'],
    ['an array to an object with its members', 'собит х = [1] чун { length: рақам };'],
    ['an unresolved type', 'собит х = 1 чун HTMLElement;'],
    ['to never', 'собит х = 1 чун абадан;'],
  ])('an assertion between overlapping types is accepted: %s', (_name, source) => {
    expect(errors(source)).toEqual([]);
  });

  test('чун собит keeps literal types', () => {
    expect(
      errors(`
собит р = [1, 2] чун собит;
собит т: танҳохонӣ [1, 2] = р;
собит о = { н: "а", м: { к: дуруст } } чун собит;
собит н: "а" = о.н;
собит к: дуруст = о.м.к;
тағ с = "а" чун собит;
собит ҷ: "а" = с;
собит у = <собит>[3];
собит д: танҳохонӣ [3] = у;
`)
    ).toEqual([]);
    // As in TypeScript, a `чун собит` array is a readonly tuple
    expect(errors('собит р = [1, 2] чун собит; собит т: [1, 2] = р;')).toEqual([
      "TYPE_NOT_ASSIGNABLE: Type 'танҳохонӣ [1, 2]' is not assignable to type '[1, 2]'",
    ]);
    expect(errors('собит р = [1, 2] чун собит; собит т: [1, 3] = р;')).toEqual([
      "TYPE_NOT_ASSIGNABLE: Type 'танҳохонӣ [1, 2]' is not assignable to type '[1, 3]'",
    ]);
    expect(errors('тағ с = "а" чун собит; с = "б";')).toEqual([
      `TYPE_NOT_ASSIGNABLE: Type '"б"' is not assignable to type '"а"'`,
    ]);
  });

  test('чун собит values can be read like arrays and objects', () => {
    expect(
      errors(`
собит р = [1, 2, 3] чун собит;
тағ ҷамъ: рақам = р.length + р[0];
барои (собит х аз р) { ҷамъ += х; }
собит [а, б] = р;
чоп.сабт(ҷамъ + а + б);
`)
    ).toEqual([]);
  });

  test('a tuple is assignable to an array of its element types', () => {
    expect(
      errors('тағ т: [рақам, сатр] = [1, "а"]; собит м: (рақам | сатр)[] = т; чоп.сабт(м);')
    ).toEqual([]);
    expect(codesOf('тағ т: [рақам, сатр] = [1, "а"]; собит м: рақам[] = т;')).toEqual([
      'TYPE_NOT_ASSIGNABLE',
    ]);
  });

  test.each([
    ['a variable', 'тағ в = 5; собит х = в чун собит;'],
    ['холӣ', 'собит х = холӣ чун собит;'],
    ['a conditional', 'тағ в = 5; собит х = (в > 1 ? "а" : "б") чун собит;'],
  ])('чун собит on %s is an error', (_name, source) => {
    expect(errors(source)).toEqual([
      "TYPE_NOT_ASSIGNABLE: A 'чун собит' assertion can only be applied to string, number, boolean, array or object literals",
    ]);
  });

  test('чун собит on literals, negative numbers, templates and members is accepted', () => {
    expect(
      errors(
        'собит о = { а: 1 }; собит х = [-1 чун собит, `т` чун собит, дуруст чун собит, о.а чун собит];'
      )
    ).toEqual([]);
  });

  test('бармесоё checks the value and keeps its own type', () => {
    expect(
      errors(`
собит о = { а: 1 } бармесоё И;
собит п = { а: 1, б: "б" } бармесоё { а: рақам; б: сатр | рақам };
собит с: сатр = п.б;
собит р = [1, 2] бармесоё рақам[];
собит н: рақам = о.а + р[0];
`)
    ).toEqual([]);
    expect(errors('собит о = { а: "x" } бармесоё И;')).toEqual([
      `TYPE_NOT_ASSIGNABLE: Type '{ а: "x" }' does not satisfy the expected type 'И'`,
    ]);
    expect(errors('собит о = {} бармесоё И;')).toEqual([
      "TYPE_NOT_ASSIGNABLE: Type '{}' does not satisfy the expected type 'И'",
    ]);
    expect(errors('собит о = { а: 1, в: 2 } бармесоё И;')).toEqual([
      "TYPE_NOT_ASSIGNABLE: Object literal may only specify known properties, and 'в' does not exist in type 'И'",
    ]);
  });

  test('generic arrows, definite assignments and the contextual names check cleanly', () => {
    expect(
      errors(`
собит ҳамон = <Т>(х: Т): Т => х;
собит н: рақам = ҳамон(1);
тағ х!: рақам;
х = н;
синф К { ном!: сатр; }
тағ бармесоё = 1;
собит as = бармесоё + 1;
`)
    ).toEqual([]);
  });
});

describe('TypeChecker: AST contract nodes', () => {
  const pos = { line: 1, column: 1 };
  const id = (name: string) => ({ type: 'Identifier', name, ...pos });
  const num = (value: number, raw = String(value)) => ({ type: 'Literal', value, raw, ...pos });
  const str = (value: string) => ({ type: 'Literal', value, raw: JSON.stringify(value), ...pos });
  const typeAnn = (name: string) => ({
    type: 'TypeAnnotation',
    typeAnnotation: { type: 'PrimitiveType', name, ...pos },
    ...pos,
  });
  const varDecl = (name: string, init: Expression, type?: string): Statement =>
    ({
      type: 'VariableDeclaration',
      kind: 'ТАҒЙИРЁБАНДА',
      identifier: id(name),
      init,
      typeAnnotation: type ? typeAnn(type) : undefined,
      ...pos,
    }) as Statement;
  const exprStmt = (expression: Expression): Statement =>
    ({ type: 'ExpressionStatement', expression, ...pos }) as Statement;
  const call = (callee: string, args: Expression[], extra: object = {}) =>
    ({
      type: 'CallExpression',
      callee: id(callee),
      arguments: args,
      ...extra,
      ...pos,
    }) as Expression;
  const program = (body: Statement[]): Program => ({ type: 'Program', body, ...pos });
  const check = (body: Statement[]) =>
    new TypeChecker().check(program(body)).errors.map(e => e.code);
  const param = (name: string, extra: object = {}) => ({
    type: 'Parameter',
    name: id(name),
    typeAnnotation: typeAnn('рақам'),
    ...extra,
    ...pos,
  });
  const funcDecl = (name: string, params: object[]): Statement =>
    ({
      type: 'FunctionDeclaration',
      name: id(name),
      params,
      body: { type: 'BlockStatement', body: [], ...pos },
      ...pos,
    }) as Statement;

  test('ConditionalExpression yields the union of its branches', () => {
    const conditional = {
      type: 'ConditionalExpression',
      test: { type: 'Literal', value: true, raw: 'true', ...pos },
      consequent: num(1),
      alternate: num(2),
      ...pos,
    };
    expect(check([varDecl('а', conditional, 'рақам')])).toEqual([]);
    expect(check([varDecl('а', { ...conditional, alternate: str('x') }, 'рақам')])).toEqual([
      'TYPE_NOT_ASSIGNABLE',
    ]);
  });

  test('SequenceExpression yields its last expression', () => {
    const sequence = { type: 'SequenceExpression', expressions: [str('a'), num(1)], ...pos };
    expect(check([varDecl('а', sequence, 'рақам')])).toEqual([]);
    expect(check([varDecl('а', sequence, 'сатр')])).toEqual(['TYPE_NOT_ASSIGNABLE']);
  });

  test('SpreadElement in arrays, objects and calls', () => {
    const arr = { type: 'ArrayExpression', elements: [num(1), num(2)], ...pos };
    const spreadArr = {
      type: 'ArrayExpression',
      elements: [{ type: 'SpreadElement', argument: id('а'), ...pos }, num(3)],
      ...pos,
    };
    const spreadObj = {
      type: 'ObjectExpression',
      properties: [{ type: 'SpreadElement', argument: id('о'), ...pos }],
      ...pos,
    };
    expect(
      check([
        varDecl('а', arr),
        varDecl('б', spreadArr),
        varDecl('о', { type: 'ObjectExpression', properties: [], ...pos }),
        varDecl('в', spreadObj),
        funcDecl('ф', [param('х'), param('у')]),
        exprStmt(call('ф', [{ type: 'SpreadElement', argument: id('а'), ...pos }])),
      ])
    ).toEqual([]);
    expect(
      check([
        varDecl('б', {
          type: 'ArrayExpression',
          elements: [{ type: 'SpreadElement', argument: id('нест'), ...pos }],
          ...pos,
        }),
      ])
    ).toEqual(['UNDEFINED_IDENTIFIER']);
  });

  test('optional member access and optional calls do not error', () => {
    const optionalMember = {
      type: 'MemberExpression',
      object: id('о'),
      property: id('а'),
      computed: false,
      optional: true,
      ...pos,
    };
    expect(
      check([
        varDecl('о', { type: 'ObjectExpression', properties: [], ...pos }),
        varDecl('х', optionalMember, 'рақам'),
        exprStmt({
          type: 'CallExpression',
          callee: optionalMember,
          arguments: [],
          optional: true,
          ...pos,
        } as Expression),
      ])
    ).toEqual([]);
  });

  test('parameters with defaults, optional flag or rest are not required', () => {
    const body = [
      funcDecl('ф', [param('а'), param('б', { defaultValue: num(1) })]),
      funcDecl('г', [param('а', { rest: true, typeAnnotation: undefined })]),
      exprStmt(call('ф', [num(1)])),
      exprStmt(call('ф', [num(1), num(2)])),
      exprStmt(call('г', [])),
      exprStmt(call('г', [num(1), num(2), num(3), num(4)])),
    ];
    expect(check(body)).toEqual([]);
    expect(check([body[0], exprStmt(call('ф', []))])).toEqual(['ARGUMENT_COUNT_MISMATCH']);
    expect(check([body[0], exprStmt(call('ф', [num(1), num(2), num(3)]))])).toEqual([
      'ARGUMENT_COUNT_MISMATCH',
    ]);
  });

  test('default values are visible to the body and type-checked', () => {
    const fn = (defaultValue: Expression) =>
      ({
        type: 'FunctionDeclaration',
        name: id('ф'),
        params: [param('а', { defaultValue })],
        body: {
          type: 'BlockStatement',
          body: [{ type: 'ReturnStatement', argument: id('а'), ...pos }],
          ...pos,
        },
        ...pos,
      }) as Statement;
    expect(check([fn(num(1))])).toEqual([]);
    expect(check([fn(str('x'))])).toEqual(['TYPE_NOT_ASSIGNABLE']);
  });

  test('destructured parameters bind their names', () => {
    const fn = {
      type: 'FunctionDeclaration',
      name: id('ф'),
      params: [
        {
          type: 'Parameter',
          name: id('__param0'),
          pattern: {
            type: 'ObjectPattern',
            properties: [
              {
                type: 'PropertyPattern',
                key: id('а'),
                value: id('а'),
                computed: false,
                ...pos,
              },
              {
                type: 'PropertyPattern',
                key: id('б'),
                value: { type: 'AssignmentPattern', left: id('в'), right: num(1), ...pos },
                computed: false,
                ...pos,
              },
            ],
            ...pos,
          },
          ...pos,
        },
        {
          type: 'Parameter',
          name: id('__param1'),
          pattern: {
            type: 'ArrayPattern',
            elements: [id('г'), { type: 'SpreadElement', argument: id('д'), ...pos }],
            ...pos,
          },
          ...pos,
        },
      ],
      body: {
        type: 'BlockStatement',
        body: [exprStmt(call('чоп', [id('а'), id('в'), id('г'), id('д')]))],
        ...pos,
      },
      ...pos,
    } as Statement;
    expect(check([fn])).toEqual([]);
  });

  test('numeric literals with raw text are numbers; bigint literals are not', () => {
    expect(check([varDecl('а', num(255, '0xFF'), 'рақам')])).toEqual([]);
    expect(check([varDecl('а', num(255, '0xFF'), 'сатр')])).toEqual(['TYPE_NOT_ASSIGNABLE']);
    expect(check([varDecl('а', num(10, '10n'), 'рақам')])).toEqual([]);
  });

  test('Ваъда<T> is treated exactly like Promise<T>', () => {
    const asyncFn = (typeName: string, returned: Expression) =>
      ({
        type: 'FunctionDeclaration',
        name: id('ф'),
        async: true,
        params: [],
        returnType: {
          type: 'TypeAnnotation',
          typeAnnotation: {
            type: 'GenericType',
            name: id(typeName),
            typeParameters: [{ type: 'PrimitiveType', name: 'сатр', ...pos }],
            ...pos,
          },
          ...pos,
        },
        body: {
          type: 'BlockStatement',
          body: [{ type: 'ReturnStatement', argument: returned, ...pos }],
          ...pos,
        },
        ...pos,
      }) as Statement;
    for (const name of ['Ваъда', 'ваъда', 'Promise']) {
      expect(check([asyncFn(name, str('а'))])).toEqual([]);
      expect(check([asyncFn(name, num(1))])).toEqual(['TYPE_NOT_ASSIGNABLE']);
    }
  });
});

describe('TypeChecker regressions: accessors, private members and type operators', () => {
  // `get х()` used to parse as a field `get` plus a method `х`, so `к.х` had
  // the setter's function type
  test('assigning through a setter is checked against the property type', () => {
    expect(
      errorsOf(
        'синф К { _х = 1; get х(): рақам { бозгашт ин._х; } set х(қ: рақам) { ин._х = қ; } }\n' +
          'собит к = нав К(); к.х = 5; собит н: рақам = к.х;'
      )
    ).toEqual([]);
    expect(
      codesOf('синф К { set х(қ: рақам) { } get х(): рақам { бозгашт 1; } } нав К().х = "а";')
    ).toEqual(['TYPE_NOT_ASSIGNABLE']);
  });

  test('private members need no declaration of their own name as a public member', () => {
    expect(
      errorsOf(
        'синф К { #х = 1; #м(): рақам { бозгашт ин.#х; } статикӣ #с = 2;\n' +
          '  м(): рақам { бозгашт ин.#м() + К.#с; } статикӣ аст(о: ҳар): мантиқӣ { бозгашт #х in о; } }'
      )
    ).toEqual([]);
    expect(errorsOf('синф К { #х = 1; м(): рақам { бозгашт ин.#у; } }')).toEqual([
      "PROPERTY_NOT_FOUND: Property '#у' does not exist on type 'К'",
    ]);
  });

  test('new syntax adds no undefined-identifier errors', () => {
    expect(
      errorsOf(
        'функсия Ф() { бозгашт нав.target; }\n' +
          'функсия т(қ: ҳар): ҳар { бозгашт қ; } т`а${Ф}б`;\n' +
          'функсия ф<Т мерос { а: рақам }>(х: Т): х аст Т { бозгашт дуруст; }\n' +
          'собит р: танҳохонӣ [рақам, сатр?, ...беназир рамз[]] = [1];\n' +
          'собит С: мавҳум нав (а: рақам) => ин = Ф;'
      )
    ).toEqual([]);
  });
});

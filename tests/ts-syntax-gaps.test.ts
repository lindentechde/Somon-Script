import { compile } from '../src/compiler';
import { Lexer } from '../src/lexer';
import { Parser } from '../src/parser';
import { TsEmitter } from '../src/ts-emitter';
import { TypeChecker } from '../src/type-checker';
import type {
  BinaryExpression,
  CallExpression,
  ExpressionStatement,
  InstantiationExpression,
  NewExpression,
  Program,
  Statement,
  TaggedTemplateExpression,
  VariableDeclaration,
} from '../src/types';

/**
 * TypeScript 5 syntax that SomonScript once read differently or not at all:
 * type arguments of every type, instantiation expressions, leading `|`/`&`,
 * keyword member names, the English keywords, call and construct signatures,
 * typed `гирифтан` parameters, anonymous default exports and smaller forms.
 * Every program goes through the parser, the JavaScript and TypeScript
 * output, both type checkers and the formatter (the corpus tests read the
 * programs of this file too).
 */

function parse(source: string): { ast: Program; errors: string[] } {
  const parser = new Parser(new Lexer(source).tokenize());
  const ast = parser.parse();
  return { ast, errors: parser.getErrors() };
}

function parseOk(source: string): Statement[] {
  const { ast, errors } = parse(source);
  expect(errors).toEqual([]);
  return ast.body;
}

function errorsOf(source: string): string[] {
  return parse(source).errors;
}

/** The expression of the statement at `index`. */
function expressionOf(source: string, index = 0): ExpressionStatement['expression'] {
  return (parseOk(source)[index] as ExpressionStatement).expression;
}

/** The TypeScript the TypeScript emitter prints for `source`. */
function typescriptOf(source: string): string {
  const parser = new Parser(new Lexer(source).tokenize());
  const ast = parser.parse();
  expect(parser.getErrors()).toEqual([]);
  const emitter = new TsEmitter();
  const code = emitter.generate(ast);
  expect(emitter.getErrors()).toEqual([]);
  return code;
}

/** Errors of the SomonScript checker, `CODE line:column message`. */
function check(source: string, strict = true): string[] {
  const parser = new Parser(new Lexer(source).tokenize());
  const ast = parser.parse();
  expect(parser.getErrors()).toEqual([]);
  const result = new TypeChecker(source, { strict }).check(ast);
  return result.errors.map(error => `${error.code} ${error.line}:${error.column} ${error.message}`);
}

async function settle(): Promise<void> {
  for (let i = 0; i < 10; i++) {
    await new Promise(resolve => setImmediate(resolve));
  }
}

/** Compiles `source` with and without strict mode, without errors, and runs it. */
async function run(source: string): Promise<string[]> {
  let output: string[] | undefined;
  for (const strict of [false, true]) {
    const result = compile(source, { strict });
    expect(result.errors).toEqual([]);
    const lines: string[] = [];
    const log = (...args: unknown[]): void => {
      lines.push(args.map(String).join(' '));
    };
    new Function('console', 'module', result.code)({ log }, { exports: {} });
    await settle();
    if (output) expect(lines).toEqual(output);
    output = lines;
  }
  return output!;
}

describe('type arguments in expressions, as TypeScript reads them', () => {
  test('every type is a type argument: keywords, literals, operators', async () => {
    expect(
      await run(
        [
          'функсия ҳамон<Т>(х: Т): Т { бозгашт х; }',
          'чоп.сабт(ҳамон<ҳар>(1), ҳамон<рақам>(2), ҳамон<сатр>("с"), ҳамон<мантиқӣ>(дуруст));',
          'чоп.сабт(ҳамон<ношинос>(3), ҳамон<холӣ>(холӣ), ҳамон<беқимат>(беқимат));',
          'чоп.сабт(ҳамон<беджавоб>(беқимат), ҳамон<объект>({}) !== холӣ);',
          'чоп.сабт(навъи ҳамон<калонрақам>(1n), навъи ҳамон<рамз>(Symbol()));',
          'чоп.сабт(ҳамон<any>(4), ҳамон<number>(5), ҳамон<string>("6"), ҳамон<unknown>(7));',
          'чоп.сабт(ҳамон<"а">("а"), ҳамон<1>(1), ҳамон<-1>(-1), ҳамон<дуруст>(дуруст));',
          'чоп.сабт(ҳамон<рақам | сатр>(8), ҳамон<рақам[]>([9]).length);',
          'чоп.сабт(ҳамон<(а: рақам) => рақам>(а => а + 1)(9));',
          'собит о = { калид: 1 };',
          'чоп.сабт(ҳамон<калидҳои навъи о>("калид"), ҳамон<навъи о>(о).калид);',
          'чоп.сабт(ҳамон<[рақам, сатр]>([1, "ду"])[1], ҳамон<танҳохонӣ рақам[]>([3])[0]);',
          'чоп.сабт(ҳамон<`а${сатр}`>("аб"), ҳамон<Map<сатр, Map<сатр, рақам>>>(нав Map()).size);',
          'чоп.сабт(ҳамон<{ а: рақам }>({ а: 10 }).а, ҳамон<сатр мерос рақам ? 1 : 2>(2));',
        ].join('\n')
      )
    ).toEqual([
      '1 2 с true',
      '3 null undefined',
      'undefined true',
      'bigint symbol',
      '4 5 6 7',
      'а 1 -1 true',
      '8 1',
      '10',
      'калид 1',
      'ду 3',
      'аб 0',
      '10 2',
    ]);
  });

  test('on members, call results, elements, optional links and tagged templates', async () => {
    expect(
      await run(
        [
          'функсия ҳамон<Т>(х: Т): Т { бозгашт х; }',
          'собит асбоб = { ҳамон, рӯйхат: <Т,>(х: Т): Т[] => [х] };',
          'чоп.сабт(асбоб.ҳамон<ҳар>(1), асбоб.рӯйхат<сатр>("р")[0], [1, 2].map<ҳар>(х => х * 2).join());',
          'собит сохтан = () => ҳамон;',
          'чоп.сабт(сохтан()<рақам>(2), [ҳамон][0]<рақам>(3), (ҳамон)<рақам>(4));',
          'собит шояд: навъи ҳамон | беқимат = ҳамон;',
          'чоп.сабт(шояд?.<рақам>(5), асбоб?.ҳамон<сатр>("6"));',
          'функсия тег<Т>(матн: TemplateStringsArray, ...қиматҳо: Т[]): сатр {',
          '    бозгашт матн.join("|") + қиматҳо.join(",");',
          '}',
          'чоп.сабт(тег<рақам>`а${7}б`, тег<ҳар>`в`);',
          'синф Қуттӣ<Т> { конструктор(ҷамъиятӣ қимат: Т) {} }',
          'чоп.сабт(нав Қуттӣ<ҳар>(8).қимат, нав Қуттӣ<ношинос>(9).қимат);',
        ].join('\n')
      )
    ).toEqual(['1 р 2,4', '2 3 4', '5 6', 'а|б7 в', '8 9']);
  });

  test('comparisons stay comparisons', async () => {
    expect(
      await run(
        [
          'собит а = 1, б = 2, в = 3;',
          'чоп.сабт(а < б, б > в, а < б > в, а < б > +1, а < б > -1);',
          'чоп.сабт(а < б >= в, а < б == дуруст, а < б && б > в);',
        ].join('\n')
      )
    ).toEqual(['true false false false true', 'false true false']);
    const comparison = expressionOf('а < б > в;') as BinaryExpression;
    expect(comparison).toMatchObject({ type: 'BinaryExpression', operator: '>' });
    expect(comparison.left).toMatchObject({ type: 'BinaryExpression', operator: '<' });
    expect(expressionOf('ф < ҳар > +1;')).toMatchObject({ operator: '>' });
    expect(expressionOf('ф < ҳар > [1];')).toMatchObject({ operator: '>' });
  });

  test('a `(` or template after `>` makes a call, as in TypeScript', () => {
    // `ф(а < б, в > (1))` is the call `ф(а<б, в>(1))` in TypeScript too
    const call = expressionOf('ф(а < б, в > (1));') as CallExpression;
    expect(call.arguments).toHaveLength(1);
    expect(call.arguments[0]).toMatchObject({ type: 'CallExpression', callee: { name: 'а' } });
    expect((call.arguments[0] as CallExpression).typeArguments).toHaveLength(2);
    expect(expressionOf('ф<ҳар>(1);')).toMatchObject({
      type: 'CallExpression',
      typeArguments: [{ type: 'PrimitiveType', name: 'ҳар' }],
    });
    expect((expressionOf('т<рақам>`а`;') as TaggedTemplateExpression).typeArguments).toEqual([
      expect.objectContaining({ name: 'рақам' }),
    ]);
    expect(compile('ф<ҳар>(1);', { typeCheck: false }).code).toBe('ф(1);');
    expect(compile('т<рақам>`а`;', { typeCheck: false }).code).toBe('т`а`;');
  });

  test('`>>` and `>>>` close nested lists, and are restored when they compare', () => {
    expect(compile('ф<А<Б<В>>>(1);', { typeCheck: false }).code).toBe('ф(1);');
    expect(compile('тағ х = а < б >> в;', { typeCheck: false }).code).toBe('let х = а < б >> в;');
    expect(compile('тағ х = а < А<б >>> в;', { typeCheck: false }).code).toBe(
      'let х = а < А < б >>> в;'
    );
  });

  test('`нав` takes type arguments only where TypeScript does', () => {
    expect((expressionOf('нав К<ҳар>;') as NewExpression).typeArguments).toHaveLength(1);
    expect(expressionOf('нав К < 1;')).toMatchObject({
      type: 'BinaryExpression',
      left: { type: 'NewExpression' },
    });
  });

  test('the TypeScript output keeps the type arguments', () => {
    expect(
      typescriptOf('функсия ф<Т>(х: Т): Т { бозгашт х; }\nф<ҳар>(1);\nф?.<рақам>(2);\nф<Т>`а`;')
    ).toContain('f<any>(1);\nf?.<number>(2);\nf<Т>`а`;'.replace(/f/g, 'ф'));
  });

  test('decorator calls keep their type arguments', () => {
    const code = typescriptOf(
      'функсия д<Т>(х: Т) { бозгашт (а: ҳар, б: ҳар) => {}; }\n@д<рақам>(1)\nсинф К {}'
    );
    expect(code).toContain('@д<number>(1)');
  });
});

describe('instantiation expressions', () => {
  test('type arguments without a call fix a generic function or class', async () => {
    expect(
      await run(
        [
          'функсия ҳамон<Т>(х: Т): Т { бозгашт х; }',
          'собит ҳамонРақам = ҳамон<рақам>;',
          'собит ХаритаиРақам = Map<сатр, рақам>;',
          'чоп.сабт(ҳамонРақам(1), нав ХаритаиРақам([["а", 2]]).get("а"));',
          'собит ҳарду = [ҳамон<сатр>, ҳамон<мантиқӣ>];',
          'чоп.сабт(ҳарду.length, навъи (ҳамон<рақам>), ҳамон<рақам> === ҳамон);',
        ].join('\n')
      )
    ).toEqual(['1 2', '2 function true']);
  });

  test('are erased in JavaScript and kept in TypeScript', () => {
    const declaration = parseOk('собит г = ф<рақам>;')[0] as VariableDeclaration;
    expect(declaration.init).toMatchObject({
      type: 'InstantiationExpression',
      expression: { type: 'Identifier', name: 'ф' },
    });
    expect((declaration.init as InstantiationExpression).typeArguments).toHaveLength(1);
    expect(compile('собит г = ф<рақам>;\nсобит м = о.get<рақам>;', { typeCheck: false }).code).toBe(
      'const г = ф;\nconst м = о.get;'
    );
    expect(typescriptOf('собит г = ф<рақам>;\nсобит н = (ф<сатр>).name;')).toBe(
      'const г = ф<number>;\nconst н = (ф<string>).name;'
    );
    expect(typescriptOf('собит г = ф<рақам>\nф();')).toBe('const г = ф<number>;\nф();');
  });

  test('a property access right after one is an error, as in TypeScript', () => {
    expect(errorsOf('собит н = ф<рақам>.name;')).toEqual([
      'An instantiation expression cannot be followed by a property access at line 1, column 19',
    ]);
    expect(errorsOf('собит н = (ф<рақам>).name;')).toEqual([]);
    expect(errorsOf('ф?.<рақам>;')[0]).toContain("Expected '(' after type arguments");
  });

  test('the type checker reads the instantiated value', () => {
    expect(
      check('функсия ф<Т>(х: Т): Т { бозгашт х; }\nсобит г = ф<рақам>;\nсобит н: рақам = г(1);')
    ).toEqual([]);
  });
});

describe('a leading `|` or `&` in a union or intersection type', () => {
  test('on one line and across lines', async () => {
    expect(
      await run(
        [
          'навъ Ранг = | "сурх" | "сабз";',
          'навъ Андоза =',
          '    | "хурд"',
          '    | "калон";',
          'навъ Нуқта = & { х: рақам } & { у: рақам };',
          'навъ Як = | рақам;',
          'тағ р: Ранг = "сабз";',
          'тағ а: Андоза = "калон";',
          'тағ н: Нуқта = { х: 1, у: 2 };',
          'тағ я: Як = 3;',
          'тағ т: Array<| рақам | сатр> = [4, "панҷ"];',
          'функсия ф(х: | рақам | холӣ): рақам { бозгашт х ?? 0; }',
          'чоп.сабт(р, а, н.х + н.у, я, т.join(), ф(холӣ));',
        ].join('\n')
      )
    ).toEqual(['сабз калон 3 3 4,панҷ 0']);
  });

  test('builds the same types as without it', () => {
    const [union, single] = parseOk('навъ А = | "а" | "б";\nнавъ Б = | рақам;') as Array<
      Statement & { typeAnnotation: { typeAnnotation: unknown } }
    >;
    expect(union.typeAnnotation.typeAnnotation).toMatchObject({
      type: 'UnionType',
      types: [{ value: 'а' }, { value: 'б' }],
    });
    expect(single.typeAnnotation.typeAnnotation).toMatchObject({ type: 'PrimitiveType' });
    expect(typescriptOf('навъ А =\n    | "а"\n    | "б";\nнавъ Б = & { а: 1 } & { б: 2 };')).toBe(
      'type А = "а" | "б";\ntype Б = { а: 1 } & { б: 2 };'
    );
    expect(errorsOf('навъ А = | | рақам;')).toHaveLength(1);
  });
});

describe('members named with keywords', () => {
  test('class members, with and without modifiers', async () => {
    expect(
      await run(
        [
          'синф А {',
          '    агар(): рақам { бозгашт 1; }',
          '    бозгашт = 2;',
          '    статикӣ нав(): рақам { бозгашт 3; }',
          '    хосусӣ синф = 4;',
          '    танҳохонӣ функсия = 5;',
          '    get барои(): рақам { бозгашт ин.синф; }',
          '    ҳамзамон интизор(): Ваъда<рақам> { бозгашт 6; }',
          '    *ҳосил(): Generator<рақам> { ҳосил 7; }',
          '    if(): рақам { бозгашт 8; }',
          '    return = 9;',
          '    new(): рақам { бозгашт 10; }',
          '}',
          'собит а = нав А();',
          'чоп.сабт(а.агар(), а.бозгашт, А.нав(), а.функсия, а.барои, [...а.ҳосил()][0]);',
          'чоп.сабт(а.if(), а.return, а.new(), а?.агар(), а?.бозгашт);',
          'а.интизор().then(х => чоп.сабт(х));',
        ].join('\n')
      )
    ).toEqual(['1 2 3 5 4 7', '8 9 10 1 2', '6']);
  });

  test('modifier words name members when no member follows them', async () => {
    expect(
      await run(
        [
          'синф Б {',
          '    статикӣ(): рақам { бозгашт 1; }',
          '    хосусӣ = 2;',
          '    ҷамъиятӣ?: рақам;',
          '    танҳохонӣ: рақам = 3;',
          '    мавҳум = 4;',
          '    ҳамзамон = 5;',
          '    бознавис(): рақам { бозгашт 6; }',
          '    get(): рақам { бозгашт 7; }',
          '    set = 8;',
          '}',
          'собит б = нав Б();',
          'чоп.сабт(б.статикӣ(), б.хосусӣ, б.ҷамъиятӣ, б.танҳохонӣ, б.мавҳум, б.ҳамзамон);',
          'чоп.сабт(б.бознавис(), б.get(), б.set);',
        ].join('\n')
      )
    ).toEqual(['1 2 undefined 3 4 5', '6 7 8']);
    const members = (
      parseOk('синф В { статикӣ\n    х = 1;\n    ҳамзамон\n    у = 2; }')[0] as {
        body: { body: Array<{ static: boolean; key: { name: string } }> };
      }
    ).body.body;
    // As in TypeScript, `статикӣ` may end its line; other modifiers may not
    expect(members.map(member => [member.key.name, member.static])).toEqual([
      ['х', true],
      ['ҳамзамон', false],
      ['у', false],
    ]);
  });

  test('object literals, interfaces, object types, enums and member access', async () => {
    expect(
      await run(
        [
          'интерфейс И {',
          '    агар: рақам;',
          '    бозгашт(): рақам;',
          '    синф?: сатр;',
          '    танҳохонӣ: рақам;',
          '    танҳохонӣ нав: сатр;',
          '    "а-б": рақам;',
          '    1: сатр;',
          '}',
          'собит и: И = {',
          '    агар: 1,',
          '    бозгашт() { бозгашт 2; },',
          '    танҳохонӣ: 3,',
          '    нав: "н",',
          '    "а-б": 4,',
          '    1: "як",',
          '};',
          'собит т: { то: рақам; ҳолат(): сатр } = { то: 5, ҳолат: () => "ҳ" };',
          'шумориш Э { агар, бозгашт }',
          'чоп.сабт(и.агар, и.бозгашт(), и.синф, и.танҳохонӣ, и.нав, и["а-б"], и[1]);',
          'чоп.сабт(т.то, т.ҳолат(), Э.агар, Э.бозгашт, и?.агар);',
        ].join('\n')
      )
    ).toEqual(['1 2 undefined 3 н 4 як', '5 ҳ 0 1 1']);
    expect(typescriptOf('интерфейс И { "а-б": рақам; 1: сатр; агар: мантиқӣ; }')).toBe(
      'interface И {\n  "а-б": number;\n  1: string;\n  агар: boolean;\n}'
    );
  });

  test('errors where TypeScript has them', () => {
    expect(errorsOf('синф А { а = 1 б = 2 }')).toEqual([
      "Unexpected token 'б' at line 1, column 16 (Expected ';' after a class field)",
    ]);
    expect(errorsOf('интерфейс И { дастрасӣ х: рақам; хосусӣ у: рақам; }')).toEqual([
      "'дастрасӣ' modifier can only appear on a property declaration at line 1, column 15",
      "'хосусӣ' modifier cannot appear on a type member at line 1, column 34",
    ]);
    expect(errorsOf('синф А { 1n = 1; }\nтағ о = { 2n: 1 };\nнавъ Т = { 3n: рақам };')).toEqual([
      'A bigint literal cannot be used as a property name at line 1, column 10',
      'A bigint literal cannot be used as a property name at line 2, column 11',
      'A bigint literal cannot be used as a property name at line 3, column 12',
    ]);
  });
});

describe('English keywords', () => {
  test('statements and expressions: else, return, throw, new, function, case, default, of, in', async () => {
    expect(
      await run(
        [
          'function ранг(н: рақам): сатр {',
          '    интихоб (н) {',
          '        case 1: return "як";',
          '        case 2: return "ду";',
          '        default: return "бисёр";',
          '    }',
          '}',
          'собит дубора = function (х: рақам): рақам { return х * 2; };',
          'тағ ҷамъ = 0;',
          'барои (собит х of [1, 2]) ҷамъ += дубора(х);',
          'барои (собит к in { а: 1 }) чоп.сабт(к, "а" in { а: 1 });',
          'агар (ҷамъ > 10) {',
          '    чоп.сабт("калон");',
          '} else агар (ҷамъ === 6) {',
          '    чоп.сабт(ранг(1), ранг(2), ранг(3), ҷамъ);',
          '} else {',
          '    чоп.сабт("хурд");',
          '}',
          'кӯшиш {',
          '    throw new Хато("хато");',
          '} гирифтан (е) {',
          '    чоп.сабт(е instanceof Хато, new Map<сатр, рақам>().size);',
          '}',
          'function* шумораҳо(): Generator<рақам, беджавоб, беқимат> { yield 1; yield* [2, 3]; }',
          'чоп.сабт([...шумораҳо()].join());',
        ].join('\n')
      )
    ).toEqual(['а true', 'як ду бисёр 6', 'true 0', '1,2,3']);
  });

  test('async, await, static, this and the class modifiers', async () => {
    expect(
      await run(
        [
          'интерфейс Номдор { ном(): сатр; }',
          'abstract синф Шакл implements Номдор {',
          '    static шумора = 0;',
          '    static { Шакл.шумора = 1; }',
          '    abstract масоҳат(): рақам;',
          '    ном(): сатр { return "шакл"; }',
          '}',
          'синф Мураббаъ extends Шакл {',
          '    private readonly тараф: рақам;',
          '    конструктор(тараф: рақам, public readonly ранг: сатр) {',
          '        супер();',
          '        this.тараф = тараф;',
          '    }',
          '    protected get дукарата(): рақам { return this.тараф * 2; }',
          '    масоҳат(): рақам { return this.тараф ** 2 + this.дукарата * 0; }',
          '    аст(): this is Мураббаъ { return true; }',
          '    async дер(): Ваъда<рақам> { return this.масоҳат(); }',
          '}',
          'собит м = нав Мураббаъ(3, "сурх");',
          'чоп.сабт(м.масоҳат(), м.ранг, м.ном(), Шакл.шумора, м.аст());',
          'async function ду(): Ваъда<рақам> { return 2; }',
          'собит се = async (): Ваъда<рақам> => (await ду()) + 1;',
          'собит чор: (х: рақам) => Ваъда<рақам> = async х => х + 2;',
          'собит о = { async панҷ(): Ваъда<рақам> { return 5; } };',
          'ду().then(async х => чоп.сабт(х, await се(), await чор(2), await о.панҷ(), await м.дер()));',
        ].join('\n')
      )
    ).toEqual(['9 сурх шакл 1 true', '2 3 4 5 9']);
  });

  test('types: extends, keyof, in, readonly, this predicates and assertions', async () => {
    expect(
      await run(
        [
          'навъ Танҳо<Т> = { readonly [К in keyof Т]: Т[К] };',
          'навъ Сатрӣ<Т> = Т extends сатр ? "ҳа" : "не";',
          'интерфейс Асос { а: рақам; }',
          'интерфейс Зер extends Асос { б: рақам; }',
          'синф Қуттӣ {',
          '    қимат?: рақам;',
          '    тасдиқ(): asserts this is { қимат: рақам } {',
          '        агар (this.қимат === беқимат) throw new Хато("холӣ");',
          '    }',
          '}',
          'собит т: Танҳо<Зер> = { а: 1, б: 2 };',
          'собит с: Сатрӣ<сатр> = "ҳа";',
          'собит қ: Қуттӣ = new Қуттӣ();',
          'қ.қимат = 3;',
          'қ.тасдиқ();',
          'чоп.сабт(т.а + т.б, с, қ.қимат + 1);',
        ].join('\n')
      )
    ).toEqual(['3 ҳа 4']);
  });

  test('async, of, abstract, readonly and keyof are still names; all of them name members', async () => {
    expect(
      await run(
        [
          'собит async = 1, of = 2, abstract = 3, readonly = 4, keyof = 5;',
          'собит илова = (async: рақам) => async + 1;',
          'собит о = { return: 1, new: 2, default: 3, static: 4 };',
          'чоп.сабт(async + of + abstract + readonly + keyof, илова(of));',
          'чоп.сабт(о.return + о.new + о.default + о.static);',
        ].join('\n')
      )
    ).toEqual(['15 3', '10']);
    // `async` before a line break, or with nothing an arrow needs after it, is a name
    expect(expressionOf('async(1);')).toMatchObject({ type: 'CallExpression' });
    expect(parseOk('тағ async = 1;\nasync\nфунксия ф() {}')).toHaveLength(3);
  });

  test('the TypeScript and JavaScript output spell them as TypeScript does', () => {
    const source =
      'abstract синф А { static х = 1; abstract м(): void; }\nfunction ф() { return this; }';
    expect(typescriptOf(source)).toBe(
      'abstract class А {\n  static х = 1;\n  abstract м(): void;\n}\nfunction ф() {\n  return this;\n}'
    );
  });
});

describe('call and construct signatures', () => {
  const declarations = [
    'интерфейс Формат {',
    '    (қимат: рақам): сатр;',
    '    пешванд: сатр;',
    '}',
    'интерфейс Нуқта { х: рақам; }',
    'интерфейс СозандаиНуқта {',
    '    нав (х: рақам): Нуқта;',
    '}',
    'навъ Ҷамъ = { (а: рақам, б: рақам): рақам };',
    'навъ Ҳамон = { <Т>(қимат: Т): Т };',
    'интерфейс Дубора {',
    '    (х: рақам): рақам;',
    '    (х: сатр): сатр;',
    '}',
    'интерфейс ФорматиДароз мерос Формат { дарозӣ: рақам; }',
  ];

  test('make interfaces and object types callable and constructable', async () => {
    expect(
      await run(
        [
          ...declarations,
          'функсия формат(пешванд: сатр): Формат {',
          '    бозгашт Object.assign((қимат: рақам) => `${пешванд}${қимат}`, { пешванд });',
          '}',
          'синф НуқтаиОддӣ татбиқ Нуқта {',
          '    конструктор(ҷамъиятӣ х: рақам) {}',
          '}',
          'функсия соз(созанда: СозандаиНуқта, х: рақам): Нуқта {',
          '    бозгашт нав созанда(х);',
          '}',
          'собит ф = формат("#");',
          'собит ҷамъ: Ҷамъ = (а, б) => а + б;',
          'собит ҳамон: Ҳамон = қимат => қимат;',
          'собит дубора = ((х: ҳар) => х + х) чун Дубора;',
          'собит н: сатр = ф(5);',
          'чоп.сабт(н, ф.пешванд, ҷамъ(2, 3), ҳамон("ҳамон"), ҳамон<рақам>(7), соз(НуқтаиОддӣ, 4).х);',
          'чоп.сабт(дубора(2), дубора("а"));',
        ].join('\n')
      )
    ).toEqual(['#5 # 5 ҳамон 7 4', '4 аа']);
  });

  test('calls are checked against them, and only matching values are accepted', () => {
    const source = (...lines: string[]): string => [...declarations, ...lines].join('\n');
    expect(check(source('собит ҷ: Ҷамъ = (а, б) => а + б;', 'собит н: рақам = ҷ(1, 2);'))).toEqual(
      []
    );
    expect(check(source('собит ҷ: Ҷамъ = (а, б) => а + б;', 'собит с: сатр = ҷ(1, 2);'))).toEqual([
      "TYPE_NOT_ASSIGNABLE 17:17 Type 'рақам' is not assignable to type 'сатр'",
    ]);
    expect(check(source('собит ҷ: Ҷамъ = (а, б) => а + б;', 'ҷ(1);'))[0]).toContain(
      'ARGUMENT_COUNT_MISMATCH'
    );
    expect(check(source('собит д: Дубора = (х: ҳар) => х;', 'д(дуруст);'))[0]).toContain(
      'NO_MATCHING_OVERLOAD'
    );
    // `Формат` also needs `пешванд`; a type without a call signature is not callable
    expect(check(source('собит ф: Формат = (қ: рақам) => "";'))[0]).toContain(
      'TYPE_NOT_ASSIGNABLE'
    );
    expect(check(source('собит ф: Ҷамъ = { х: 1 };'))[0]).toContain('TYPE_NOT_ASSIGNABLE');
    expect(
      check(
        source(
          'синф Н { конструктор(ҷамъиятӣ х: рақам) {} }',
          'собит с: СозандаиНуқта = Н;',
          'собит н: сатр = нав с(1);'
        )
      )
    ).toEqual(["TYPE_NOT_ASSIGNABLE 18:17 Type 'Нуқта' is not assignable to type 'сатр'"]);
    expect(
      check(source('функсия ф(ф: ФорматиДароз): сатр { бозгашт ф(1) + ф.пешванд + ф.дарозӣ; }'))
    ).toEqual([]);
  });

  test('the TypeScript emitter prints them', () => {
    expect(
      typescriptOf(
        'интерфейс И { (х: рақам): сатр; нав (х: сатр): И; <Т>(х: Т, у?: Т): Т; ном: сатр; }\nнавъ Т = { (ин: И): беджавоб };'
      )
    ).toBe(
      'interface И {\n  (х: number): string;\n  new (х: string): И;\n  <Т>(х: Т, у?: Т): Т;\n  ном: string;\n}\ntype Т = { (this: И): void };'
    );
  });

  test('`нав` is a construct signature only before `(` or `<`', () => {
    const [iface] = parseOk('интерфейс И { нав: рақам; нав?(): рақам; нав(): И; }') as Array<{
      body: { properties: Array<{ signature?: string; key: { name: string } }> };
    }>;
    expect(iface.body.properties.map(property => property.signature ?? property.key.name)).toEqual([
      'нав',
      'нав',
      'construct',
    ]);
  });
});

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

import { Lexer } from '../src/lexer';
import { Parser } from '../src/parser';
import { compile } from '../src/compiler';
import {
  ArrayExpression,
  ArrowFunctionExpression,
  AssignmentExpression,
  BinaryExpression,
  CallExpression,
  ClassDeclaration,
  ConditionalExpression,
  ExpressionStatement,
  ForInStatement,
  ForOfStatement,
  ForStatement,
  FunctionDeclaration,
  MemberExpression,
  NewExpression,
  ObjectExpression,
  ObjectPattern,
  Program,
  Property,
  PropertyPattern,
  SequenceExpression,
  Statement,
  TypeAlias,
  UnaryExpression,
  VariableDeclaration,
} from '../src/types';

function parse(source: string): { ast: Program; errors: string[] } {
  const parser = new Parser(new Lexer(source).tokenize());
  const ast = parser.parse();
  return { ast, errors: parser.getErrors() };
}

/** Parses source that must be valid and returns its statements. */
function parseOk(source: string): Statement[] {
  const { ast, errors } = parse(source);
  expect(errors).toEqual([]);
  return ast.body;
}

function expressionOf<T>(source: string): T {
  return (parseOk(source)[0] as ExpressionStatement).expression as T;
}

function initOf<T>(source: string): T {
  return (parseOk(source)[0] as VariableDeclaration).init as T;
}

/** Compiles and runs a program, returning what it printed. */
function run(source: string): string[] {
  const result = compile(source);
  expect(result.errors).toEqual([]);
  const output: string[] = [];
  const fakeConsole = { log: (...args: unknown[]) => output.push(args.map(String).join(' ')) };
  new Function('console', result.code)(fakeConsole);
  return output;
}

describe('Parser: operators', () => {
  test('conditional expression', () => {
    const expr = initOf<ConditionalExpression>('тағ м = а > б ? а : б;');
    expect(expr.type).toBe('ConditionalExpression');
    expect((expr.test as BinaryExpression).operator).toBe('>');
    expect(expr.alternate).toMatchObject({ type: 'Identifier', name: 'б' });
  });

  test('nested conditional is right-associative', () => {
    const expr = expressionOf<ConditionalExpression>('а ? 1 : б ? 2 : 3;');
    expect(expr.alternate.type).toBe('ConditionalExpression');
  });

  test('a parenthesized conditional branch is not an arrow function', () => {
    const expr = expressionOf<ConditionalExpression>('а ? (б) : -1;');
    expect(expr.consequent).toMatchObject({ type: 'Identifier', name: 'б' });
    expect(expr.alternate).toMatchObject({ type: 'UnaryExpression', operator: '-' });
  });

  test('nullish coalescing', () => {
    const expr = expressionOf<BinaryExpression>('а ?? б ?? 5;');
    expect(expr.operator).toBe('??');
    expect((expr.left as BinaryExpression).operator).toBe('??');
  });

  test.each(['а ?? б || в;', 'а || б ?? в;', 'а && б ?? в;', 'а ?? б && в;'])(
    'mixing ?? with && or || without parentheses is an error: %s',
    source => {
      const { errors } = parse(source);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatch(/Cannot mix '\?\?' with '\|\|' or '&&'.*line 1/);
    }
  );

  test('?? with parenthesized logical operands is allowed', () => {
    expect(expressionOf<BinaryExpression>('(а || б) ?? в;').operator).toBe('??');
    expect(expressionOf<BinaryExpression>('а ?? (б && в);').operator).toBe('??');
  });

  test('exponent is right-associative and binds tighter than *', () => {
    const expr = expressionOf<BinaryExpression>('2 * 3 ** 2 ** 2;');
    expect(expr.operator).toBe('*');
    const power = expr.right as BinaryExpression;
    expect(power.operator).toBe('**');
    expect((power.right as BinaryExpression).operator).toBe('**');
  });

  test('unary operand on the left of ** is an error, parenthesized is fine', () => {
    const { errors } = parse('-2 ** 2;');
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/Unary operator before '\*\*' must be parenthesized at line 1/);
    expect(expressionOf<BinaryExpression>('(-2) ** 2;').operator).toBe('**');
    expect(expressionOf<BinaryExpression>('2 ** -2;').right.type).toBe('UnaryExpression');
  });

  test('optional chaining on members, computed members and calls', () => {
    const call = expressionOf<CallExpression>('о?.а?.[к]?.(1);');
    expect(call.optional).toBe(true);
    const computed = call.callee as MemberExpression;
    expect(computed).toMatchObject({ computed: true, optional: true });
    const member = computed.object as MemberExpression;
    expect(member).toMatchObject({ computed: false, optional: true });
    expect(member.property).toMatchObject({ name: 'а' });
  });

  test('plain member access is not optional', () => {
    expect(expressionOf<MemberExpression>('о.а;').optional).toBeUndefined();
  });

  test.each(['??=', '||=', '&&=', '**='])('assignment operator %s', operator => {
    const expr = expressionOf<AssignmentExpression>(`а ${operator} 1;`);
    expect(expr).toMatchObject({ type: 'AssignmentExpression', operator });
  });

  test.each([
    ['+а;', '+'],
    ['навъи а;', 'typeof'],
    ['typeof а;', 'typeof'],
    ['void 0;', 'void'],
    ['delete о.а;', 'delete'],
  ])('unary operator: %s', (source, operator) => {
    expect(expressionOf<UnaryExpression>(source)).toMatchObject({
      type: 'UnaryExpression',
      operator,
    });
  });

  test('typeof compared with a string', () => {
    const expr = expressionOf<BinaryExpression>('навъи а === "сатр";');
    expect(expr.operator).toBe('===');
    expect(expr.left).toMatchObject({ type: 'UnaryExpression', operator: 'typeof' });
  });

  test('in and instanceof', () => {
    expect(expressionOf<BinaryExpression>('"а" дар о;').operator).toBe('in');
    expect(expressionOf<BinaryExpression>('х instanceof Хато;').operator).toBe('instanceof');
  });

  test('prefix increment', () => {
    expect(expressionOf('++а;')).toMatchObject({
      type: 'UpdateExpression',
      operator: '++',
      prefix: true,
    });
  });

  test('comma operator in the for update clause', () => {
    const loop = parseOk('барои (тағ и = 0; и < ҷ; и++, ҷ--) {}')[0] as ForStatement;
    const update = loop.update as SequenceExpression;
    expect(update.type).toBe('SequenceExpression');
    expect(update.expressions).toHaveLength(2);
  });

  test('operators compile and run', () => {
    expect(run('тағ а = 7; тағ б = 3; чоп.сабт(а дар {7: 1}, 2 ** 3 ** 2);')).toEqual(['true 512']);
  });
});

describe('Parser: spread', () => {
  test('spread in arrays, calls and new', () => {
    const array = expressionOf<ArrayExpression>('[...м, 3];');
    expect(array.elements[0]).toMatchObject({
      type: 'SpreadElement',
      argument: { type: 'Identifier', name: 'м' },
    });
    const call = expressionOf<CallExpression>('ф(1, ...м);');
    expect(call.arguments[1].type).toBe('SpreadElement');
    const construct = expressionOf<NewExpression>('нав Б(...м);');
    expect(construct.arguments[0].type).toBe('SpreadElement');
  });

  test('spread of an arbitrary expression', () => {
    const array = expressionOf<ArrayExpression>('[...ф(1), ...о.а];');
    expect(array.elements.map(e => e.type)).toEqual(['SpreadElement', 'SpreadElement']);
  });

  test('spread in object literals', () => {
    const object = initOf<ObjectExpression>('тағ о = { ...а, б: 1 };');
    expect(object.properties[0]).toMatchObject({ type: 'SpreadElement' });
    expect(object.properties[1]).toMatchObject({ type: 'Property', key: { name: 'б' } });
  });

  test('array and call spread compile and run', () => {
    expect(run('тағ м = [1, 2]; тағ н = [...м, 3]; чоп.сабт(...н);')).toEqual(['1 2 3']);
  });
});

describe('Parser: object literals', () => {
  test('shorthand, method, computed, string and keyword keys', () => {
    const object = initOf<ObjectExpression>(
      'тағ о = { а, ф() { бозгашт 1; }, [к]: 2, "x y": 3, агар: 4, 5: 6 };'
    );
    const [shorthand, method, computed, stringKey, keywordKey, numberKey] =
      object.properties as Property[];
    expect(shorthand).toMatchObject({ shorthand: true, value: { type: 'Identifier', name: 'а' } });
    expect(method).toMatchObject({ method: true, value: { type: 'FunctionExpression' } });
    expect(computed).toMatchObject({ computed: true, key: { name: 'к' } });
    expect(stringKey.key).toMatchObject({ type: 'Literal', value: 'x y' });
    expect(keywordKey.key).toMatchObject({ type: 'Identifier', name: 'агар' });
    expect(numberKey.key).toMatchObject({ type: 'Literal', value: 5 });
  });

  test('trailing comma is allowed', () => {
    expect(initOf<ObjectExpression>('тағ о = { а: 1, };').properties).toHaveLength(1);
    expect(initOf<ArrayExpression>('тағ м = [1, 2, ];').elements).toHaveLength(2);
  });

  test('punctuation is not a property name', () => {
    expect(parse('тағ о = { ; };').errors).toHaveLength(1);
  });

  test('shorthand objects never turn into stray statements', () => {
    // Used to make recovery emit a top-level `return 3;`
    const result = compile('тағ а = 1; тағ о = { а, ф() { бозгашт 3; } };');
    expect(result.errors).toEqual([]);
    expect(result.code).not.toMatch(/^return/m);
  });
});

describe('Parser: keywords as property names', () => {
  test.each(['о.агар;', 'о?.агар;', 'о.синф;', 'о.бозгашт;', 'о.нав;'])('%s', source => {
    const member = expressionOf<MemberExpression>(source);
    expect(member.type).toBe('MemberExpression');
    expect(member.property.type).toBe('Identifier');
  });

  test('keyword property compiles and runs', () => {
    expect(run('тағ о = { агар: 1 }; чоп.сабт(о.агар);')).toEqual(['1']);
  });
});

describe('Parser: functions and parameters', () => {
  test('arrow parameters with defaults, rest and destructuring', () => {
    const arrow = expressionOf<ArrowFunctionExpression>('(а = 1, { б }, [в], ...г) => а;');
    const [withDefault, objectParam, arrayParam, rest] = arrow.params;
    expect(withDefault.defaultValue).toMatchObject({ type: 'Literal', value: 1 });
    expect(objectParam.pattern?.type).toBe('ObjectPattern');
    expect(objectParam.name.name).not.toBe(arrayParam.name.name);
    expect(arrayParam.pattern?.type).toBe('ArrayPattern');
    expect(rest).toMatchObject({ rest: true, name: { name: 'г' } });
  });

  test('typed arrow with return type', () => {
    const arrow = expressionOf<ArrowFunctionExpression>('(а: рақам): рақам => а * 2;');
    expect(arrow.returnType).toBeDefined();
    expect(arrow.params[0].typeAnnotation).toBeDefined();
  });

  test('async arrows', () => {
    expect(expressionOf<ArrowFunctionExpression>('ҳамзамон () => 1;')).toMatchObject({
      type: 'ArrowFunctionExpression',
      isAsync: true,
    });
    expect(initOf<ArrowFunctionExpression>('тағ ф = ҳамзамон х => х;').isAsync).toBe(true);
  });

  test('async function expression', () => {
    expect(initOf('тағ ф = ҳамзамон функсия() { бозгашт 1; };')).toMatchObject({
      type: 'FunctionExpression',
      async: true,
    });
  });

  test('function declaration parameters with defaults and rest', () => {
    const func = parseOk('функсия ф(а: рақам = 1, ...б: рақам[]) { бозгашт а; }')[0];
    const params = (func as FunctionDeclaration).params;
    expect(params[0].defaultValue).toBeDefined();
    expect(params[1].rest).toBe(true);
  });

  test('rest parameter must be last', () => {
    expect(parse('функсия ф(...а, б) {}').errors[0]).toMatch(/Rest parameter must be last/);
  });
});

describe('Parser: destructuring patterns', () => {
  test('shorthand property pattern has value equal to its key', () => {
    const pattern = (parseOk('собит { п, р } = о;')[0] as VariableDeclaration)
      .identifier as ObjectPattern;
    for (const property of pattern.properties as PropertyPattern[]) {
      expect(property.value).toMatchObject({ type: 'Identifier', name: property.key.name });
    }
  });

  test('pattern defaults become AssignmentPattern', () => {
    const pattern = (parseOk('тағ { г = 5, д: е = 6 } = о;')[0] as VariableDeclaration)
      .identifier as ObjectPattern;
    const [shorthand, renamed] = pattern.properties as PropertyPattern[];
    expect(shorthand.value).toMatchObject({
      type: 'AssignmentPattern',
      left: { name: 'г' },
      right: { value: 5 },
    });
    expect(renamed.value).toMatchObject({ type: 'AssignmentPattern', left: { name: 'е' } });
  });

  test('array pattern defaults', () => {
    const declaration = parseOk('тағ [а = 1, , ...б] = м;')[0] as VariableDeclaration;
    expect(declaration.identifier).toMatchObject({
      type: 'ArrayPattern',
      elements: [{ type: 'AssignmentPattern' }, null, { type: 'SpreadElement' }],
    });
  });

  test('multiple declarators are a clear error, not silently dropped', () => {
    const { ast, errors } = parse('тағ а = 1, б = 2;');
    expect(ast.body).toHaveLength(0);
    expect(errors).toEqual([
      expect.stringMatching(/Multiple variables in one declaration are not supported at line 1/),
    ]);
  });
});

describe('Parser: destructuring in for-of and for-in heads', () => {
  test('array pattern in a for-of head', () => {
    const [loop] = parseOk('барои (тағ [к, в] аз объект.воридот(о)) {}') as ForOfStatement[];
    expect(loop).toMatchObject({
      type: 'ForOfStatement',
      left: {
        type: 'VariableDeclaration',
        kind: 'ТАҒЙИРЁБАНДА',
        init: undefined,
        identifier: {
          type: 'ArrayPattern',
          elements: [
            { type: 'Identifier', name: 'к' },
            { type: 'Identifier', name: 'в' },
          ],
        },
      },
      right: { type: 'CallExpression' },
      body: { type: 'BlockStatement' },
    });
  });

  test('object pattern in a for-in head', () => {
    const [loop] = parseOk('барои (собит { length } дар о) чоп.сабт(length);') as ForInStatement[];
    expect(loop).toMatchObject({
      type: 'ForInStatement',
      left: {
        kind: 'СОБИТ',
        identifier: {
          type: 'ObjectPattern',
          properties: [{ type: 'PropertyPattern', key: { name: 'length' } }],
        },
      },
      right: { type: 'Identifier', name: 'о' },
      body: { type: 'ExpressionStatement' },
    });
  });

  test('nested patterns, defaults and rest elements', () => {
    const [loop] = parseOk(
      'барои (тағйирёбанда [а = 0, [б, { в: г = 1, ...д }], , ...е] аз м) {}'
    ) as ForOfStatement[];
    const left = loop.left as VariableDeclaration;
    expect(left.kind).toBe('ТАҒЙИРЁБАНДА');
    expect(left.identifier).toMatchObject({
      type: 'ArrayPattern',
      elements: [
        { type: 'AssignmentPattern', left: { name: 'а' }, right: { value: 0 } },
        {
          type: 'ArrayPattern',
          elements: [
            { type: 'Identifier', name: 'б' },
            {
              type: 'ObjectPattern',
              properties: [
                {
                  type: 'PropertyPattern',
                  key: { name: 'в' },
                  value: { type: 'AssignmentPattern', left: { name: 'г' } },
                },
                { type: 'SpreadElement', argument: { name: 'д' } },
              ],
            },
          ],
        },
        null,
        { type: 'SpreadElement', argument: { name: 'е' } },
      ],
    });
  });

  test('defaults may contain brackets, braces and calls', () => {
    const [loop] = parseOk(
      'барои (собит [а = ф([1], { б: 2 }), { в } = {}] аз м) {}'
    ) as ForOfStatement[];
    expect(loop.type).toBe('ForOfStatement');
    expect((loop.left as VariableDeclaration).identifier).toMatchObject({
      type: 'ArrayPattern',
      elements: [
        { type: 'AssignmentPattern', right: { type: 'CallExpression' } },
        { type: 'AssignmentPattern', left: { type: 'ObjectPattern' } },
      ],
    });
  });

  test('a pattern followed by an initializer is still a classic for loop', () => {
    const [loop] = parseOk('барои (тағ [а, б] = [0, 1]; а < 3; а++) {}') as ForStatement[];
    expect(loop).toMatchObject({
      type: 'ForStatement',
      init: { type: 'VariableDeclaration', identifier: { type: 'ArrayPattern' } },
    });
  });

  test('an unclosed pattern is a parse error', () => {
    const { errors } = parse('барои (собит [а аз м) {}');
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('Parser: new expressions', () => {
  test('callee is the full member expression', () => {
    const expr = initOf<NewExpression>('тағ х = нав о.Б(1);');
    expect(expr.type).toBe('NewExpression');
    expect(expr.callee).toMatchObject({
      type: 'MemberExpression',
      object: { name: 'о' },
      property: { name: 'Б' },
    });
    expect(expr.arguments).toHaveLength(1);
  });

  test('call chaining after new', () => {
    const call = expressionOf<CallExpression>('нав Сана().toISOString();');
    expect((call.callee as MemberExpression).object.type).toBe('NewExpression');
  });

  test('new without arguments', () => {
    expect(initOf<NewExpression>('тағ х = нав Б;').arguments).toEqual([]);
  });

  test('new on a member compiles and runs', () => {
    expect(
      run(
        'синф Б { конструктор() { ин.қ = 7; } } тағ о = { Б: Б }; тағ х = нав о.Б(); чоп.сабт(х.қ);'
      )
    ).toEqual(['7']);
  });
});

describe('Parser: line breaks', () => {
  test('expressions may span lines', () => {
    expect(run('тағ а = 1 +\n  2;\nчоп.сабт(а);')).toEqual(['3']);
    expect(run('тағ м = [1, 2, 3]\n  .map(х => х * 2);\nчоп.сабт(м.join(","));')).toEqual([
      '2,4,6',
    ]);
  });

  test("';' may be omitted at a line break, before '}' or at the end", () => {
    expect(run('тағ а = 1\nчоп.сабт(а)\nагар (а) { чоп.сабт(2) }')).toEqual(['1', '2']);
  });

  test("a line break after 'бозгашт' ends the statement, as in JavaScript", () => {
    const func = parseOk('функсия ф() { бозгашт\n 1; }')[0] as FunctionDeclaration;
    expect(func.body.body[0]).toMatchObject({ type: 'ReturnStatement', argument: undefined });
  });

  test("two statements on one line still need ';'", () => {
    expect(parse('тағ а = 1 тағ б = 2;').errors).toHaveLength(1);
  });
});

describe('Parser: error reporting', () => {
  test('one bad token gives one error and later statements still parse', () => {
    const { ast, errors } = parse('тағ а = ;\nтағ б = 2;\nчоп.сабт(б);');
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/line 1, column 9/);
    expect(ast.body).toHaveLength(2);
  });

  test('an error inside a block does not swallow the enclosing block', () => {
    const { ast, errors } = parse('функсия ф() {\n  тағ а = ;\n  бозгашт 1;\n}\nф();');
    expect(errors).toHaveLength(1);
    expect(ast.body).toHaveLength(2);
    expect((ast.body[0] as FunctionDeclaration).body.body).toHaveLength(1);
  });

  test('invalid class members are reported as errors, not printed', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      const { ast, errors } = parse('синф А {\n  1;\n  салом() { бозгашт 1; }\n}');
      expect(errors).toEqual([expect.stringMatching(/Expected class member at line 2, column 3/)]);
      const body = (ast.body[0] as ClassDeclaration).body.body;
      expect(body.map(member => member.key.name)).toEqual(['салом']);
      expect(consoleError).not.toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
    }
  });

  test('class member recovery always terminates', () => {
    const { errors } = parse('синф А { ном ном ном ( ; ) }');
    expect(errors.length).toBeGreaterThan(0);
  });

  test('optional class property', () => {
    const declaration = parseOk('синф Дарахт { рост?: Дарахт; чап?: Дарахт = холӣ; }')[0];
    expect((declaration as ClassDeclaration).body.body.map(m => m.key.name)).toEqual([
      'рост',
      'чап',
    ]);
  });

  test('deep nesting is a positioned parse error, not a crash', () => {
    const depth = 5000;
    const { errors } = parse('агар (х) {'.repeat(depth) + '}'.repeat(depth));
    expect(errors).toEqual([expect.stringMatching(/^Nesting too deep at line 1, column \d+/)]);

    const parens = parse('тағ а = ' + '('.repeat(depth) + '1' + ')'.repeat(depth) + ';');
    expect(parens.errors).toEqual([expect.stringMatching(/^Nesting too deep at line 1/)]);
  });

  test('realistic nesting is accepted', () => {
    const depth = 100;
    expect(parse('агар (х) {'.repeat(depth) + '}'.repeat(depth)).errors).toEqual([]);
    expect(parse('тағ а = ' + '('.repeat(depth) + '1' + ')'.repeat(depth) + ';').errors).toEqual(
      []
    );
  });
});

describe('Parser: type annotations', () => {
  test('Ваъда<T> is accepted as the Promise type', () => {
    const func = parseOk('ҳамзамон функсия ф(): Ваъда<сатр> { бозгашт "а"; }')[0];
    expect((func as FunctionDeclaration).returnType?.typeAnnotation).toMatchObject({
      type: 'GenericType',
      typeParameters: [{ type: 'PrimitiveType', name: 'сатр' }],
    });
  });

  test('Ваъда as a value', () => {
    expect(initOf('тағ в = нав Ваъда(ҳал => ҳал(1));')).toMatchObject({ type: 'NewExpression' });
  });

  test('generic type alias with constrained parameters and a mapped type', () => {
    const alias = parseOk(
      'навъ Гузида<T, К мерос калидҳои T = калидҳои T> = { танҳохонӣ [П дар К]?: T[П]; };'
    )[0] as TypeAlias;
    expect(alias.typeParameters).toHaveLength(2);
    expect(alias.typeParameters?.[1]).toMatchObject({
      constraint: { type: 'KeyofType' },
      default: { type: 'KeyofType' },
    });
    expect(alias.typeAnnotation.typeAnnotation).toMatchObject({
      type: 'MappedType',
      optional: true,
      readonly: true,
      typeParameter: { name: { name: 'П' }, constraint: { type: 'GenericType' } },
      typeAnnotation: { typeAnnotation: { type: 'IndexedAccessType' } },
    });
  });

  test('-? modifier and nested generics closed by >>', () => {
    parseOk('навъ Ҳ<T> = { -танҳохонӣ [П дар калидҳои T]-?: T[П] };');
    parseOk('навъ И<T, К> = Гузида<T, Exclude<калидҳои T, К>>;');
  });

  test('array suffixes and indexed access', () => {
    const alias = parseOk('навъ А = сатр[][] | Б["ном"];')[0] as TypeAlias;
    expect(alias.typeAnnotation.typeAnnotation).toMatchObject({
      type: 'UnionType',
      types: [
        { type: 'ArrayType', elementType: { type: 'ArrayType' } },
        { type: 'IndexedAccessType' },
      ],
    });
  });

  test('object type members may omit the last separator or use commas', () => {
    parseOk('навъ Нуқта = { х: рақам; у: рақам };');
    parseOk('навъ Нуқта = { х: рақам, у: рақам };');
  });
});

import { Lexer } from '../src/lexer';
import { Parser } from '../src/parser';
import { compile } from '../src/compiler';
import {
  ArrayExpression,
  ArrowFunctionExpression,
  AsExpression,
  AssignmentExpression,
  BinaryExpression,
  BlockStatement,
  CallExpression,
  ClassDeclaration,
  ConditionalExpression,
  EnumDeclaration,
  ExpressionStatement,
  ForInStatement,
  ForOfStatement,
  ForStatement,
  FunctionDeclaration,
  FunctionExpression,
  LabeledStatement,
  MemberExpression,
  MethodDefinition,
  NewExpression,
  ObjectExpression,
  ObjectPattern,
  Program,
  Property,
  PropertyDefinition,
  PropertyPattern,
  SequenceExpression,
  Statement,
  TypeAlias,
  TypeAssertion,
  UnaryExpression,
  UpdateExpression,
  VariableDeclaration,
  WhileStatement,
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

describe('Parser: TypeScript assertions', () => {
  test('х чун Т binds like a relational operator', () => {
    const sum = expressionOf<AsExpression>('а + б чун рақам;');
    expect(sum).toMatchObject({
      type: 'AsExpression',
      expression: { type: 'BinaryExpression', operator: '+' },
      typeAnnotation: { type: 'PrimitiveType', name: 'рақам' },
    });
    expect(expressionOf<AsExpression>('а < б чун мантиқӣ;').expression).toMatchObject({
      operator: '<',
    });
    const equality = expressionOf<BinaryExpression>('а == б чун рақам;');
    expect(equality.operator).toBe('==');
    expect(equality.right.type).toBe('AsExpression');
    expect(expressionOf<BinaryExpression>('а чун рақам < б;').left.type).toBe('AsExpression');
  });

  test('chained, parenthesized and English assertions', () => {
    const chain = expressionOf<AsExpression>('х чун ношинос чун Т;');
    expect(chain.typeAnnotation).toMatchObject({ type: 'GenericType', name: { name: 'Т' } });
    expect(chain.expression).toMatchObject({
      type: 'AsExpression',
      expression: { type: 'Identifier', name: 'х' },
      typeAnnotation: { type: 'PrimitiveType', name: 'ношинос' },
    });
    const member = expressionOf<MemberExpression>('(а чун сатр).length;');
    expect(member.object.type).toBe('AsExpression');
    expect(expressionOf('а as сатр | рақам;')).toMatchObject({
      type: 'AsExpression',
      typeAnnotation: { type: 'UnionType' },
    });
  });

  test('чун собит is a const assertion', () => {
    expect(initOf('собит р = [1, 2] чун собит;')).toMatchObject({
      type: 'AsExpression',
      isConst: true,
      expression: { type: 'ArrayExpression' },
    });
    expect(initOf<AsExpression>('собит р = [1] as const;').isConst).toBe(true);
    expect(initOf<TypeAssertion>('собит р = <собит>["а"];')).toMatchObject({
      type: 'TypeAssertion',
      isConst: true,
    });
  });

  test('<Т>х is a type assertion with a unary operand', () => {
    expect(expressionOf('<сатр>а;')).toMatchObject({
      type: 'TypeAssertion',
      typeAnnotation: { type: 'PrimitiveType', name: 'сатр' },
      expression: { type: 'Identifier', name: 'а' },
    });
    const member = expressionOf<MemberExpression>('(<сатр>а).length;');
    expect(member.object.type).toBe('TypeAssertion');
    expect(expressionOf<TypeAssertion>('<Map<сатр, рақам>>м;').typeAnnotation).toMatchObject({
      type: 'GenericType',
    });
    // `(б)` not followed by '=>' is an operand, so this is no arrow function
    const conditional = expressionOf<ConditionalExpression>('а ? <Т>(б) : в;');
    expect(conditional.consequent).toMatchObject({
      type: 'TypeAssertion',
      expression: { type: 'Identifier', name: 'б' },
    });
    expect(expressionOf<BinaryExpression>('а < б;').operator).toBe('<');
  });

  test('a type assertion on the left of ** must be parenthesized', () => {
    const { errors } = parse('<рақам>а ** 2;');
    expect(errors).toEqual([
      expect.stringMatching(/Type assertion before '\*\*' must be parenthesized at line 1/),
    ]);
    expect(expressionOf<BinaryExpression>('(<рақам>а) ** 2;').operator).toBe('**');
  });

  test.each([
    ['<Т>(х: Т): Т => х;', 1, true],
    ['<Т,>(х: Т) => х;', 1, false],
    ['<Т мерос сатр, К = рақам>(х: Т, к: К) => х;', 2, false],
    ['<Т мерос Map<сатр, рақам>>(м: Т) => м;', 1, false],
  ])('generic arrow function: %s', (source, count, hasReturnType) => {
    const arrow = expressionOf<ArrowFunctionExpression>(source);
    expect(arrow.type).toBe('ArrowFunctionExpression');
    expect(arrow.typeParameters).toHaveLength(count);
    expect(arrow.typeParameters![0].name.name).toBe('Т');
    expect(arrow.params[0].name.name).toMatch(/^[хм]$/);
    expect(Boolean(arrow.returnType)).toBe(hasReturnType);
  });

  test('generic arrow details: constraint, async and block body', () => {
    const constrained = initOf<ArrowFunctionExpression>('собит ф = <Т мерос сатр>(х: Т) => х;');
    expect(constrained.typeParameters![0].constraint).toMatchObject({ name: 'сатр' });
    const asyncArrow = initOf<ArrowFunctionExpression>('собит ф = ҳамзамон <Т>(х: Т) => х;');
    expect(asyncArrow).toMatchObject({ isAsync: true, typeParameters: [{ name: { name: 'Т' } }] });
    const body = initOf<ArrowFunctionExpression>('собит ф = <Т>() => { бозгашт 1; };');
    expect(body.body.type).toBe('BlockStatement');
  });

  test.each([
    ['х!;', 'Identifier'],
    ['ф()!;', 'CallExpression'],
    ['м.бозгирифтан("а")!;', 'CallExpression'],
    ['о.а!;', 'MemberExpression'],
  ])('non-null assertion %s', (source, inner) => {
    expect(expressionOf(source)).toMatchObject({
      type: 'NonNullExpression',
      expression: { type: inner },
    });
  });

  test('non-null assertions inside member chains and operators', () => {
    const chain = expressionOf<MemberExpression>('а!.б!.в;');
    expect(chain.object).toMatchObject({
      type: 'NonNullExpression',
      expression: { type: 'MemberExpression', object: { type: 'NonNullExpression' } },
    });
    expect(expressionOf<MemberExpression>('х![0];')).toMatchObject({
      computed: true,
      object: { type: 'NonNullExpression' },
    });
    const call = expressionOf<CallExpression>('ф(х!, у!);');
    expect(call.arguments.map(arg => arg.type)).toEqual(['NonNullExpression', 'NonNullExpression']);
    expect(expressionOf<BinaryExpression>('х! + 1;').left.type).toBe('NonNullExpression');
    const update = expressionOf<UpdateExpression>('х!++;');
    expect(update.argument.type).toBe('NonNullExpression');
  });

  test('!=, !== and prefix ! are unchanged', () => {
    expect(expressionOf<BinaryExpression>('а!=б;').operator).toBe('!=');
    expect(expressionOf<BinaryExpression>('а!==б;').operator).toBe('!==');
    const negated = expressionOf<BinaryExpression>('а! != б;');
    expect(negated).toMatchObject({ operator: '!=', left: { type: 'NonNullExpression' } });
    expect(expressionOf('!а!;')).toMatchObject({
      type: 'UnaryExpression',
      operator: '!',
      argument: { type: 'NonNullExpression' },
    });
  });

  test("a '!' on the next line starts a new statement", () => {
    const statements = parseOk('тағ а = б\n!в;');
    expect(statements).toHaveLength(2);
    expect((statements[0] as VariableDeclaration).init?.type).toBe('Identifier');
    expect((statements[1] as ExpressionStatement).expression.type).toBe('UnaryExpression');
  });

  test('assertions may wrap an assignment target, satisfies may not', () => {
    expect(expressionOf<AssignmentExpression>('х! = 1;').left.type).toBe('NonNullExpression');
    expect(expressionOf<AssignmentExpression>('(х чун ҳар) = 1;').left.type).toBe('AsExpression');
    expect(expressionOf<AssignmentExpression>('х!.а = 1;').left.type).toBe('MemberExpression');
    expect(parse('(х бармесоё рақам) = 1;').errors).toEqual([
      expect.stringMatching(/Invalid left-hand side in assignment at line 1/),
    ]);
  });

  test('х бармесоё Т keeps the expression', () => {
    expect(initOf('собит о = { а: 1 } бармесоё И;')).toMatchObject({
      type: 'SatisfiesExpression',
      expression: { type: 'ObjectExpression' },
      typeAnnotation: { type: 'GenericType', name: { name: 'И' } },
    });
    expect(initOf('собит о = х satisfies И;').type).toBe('SatisfiesExpression');
  });

  test('бармесоё, as and satisfies are still ordinary names', () => {
    const statements = parseOk(
      'тағ бармесоё = 1;\nсобит as = бармесоё + 1;\nтағ satisfies = as\nбармесоё = { as, satisfies };'
    );
    expect(statements).toHaveLength(4);
    expect((statements[2] as VariableDeclaration).init).toMatchObject({ name: 'as' });
    expect((statements[3] as ExpressionStatement).expression).toMatchObject({
      type: 'AssignmentExpression',
      left: { name: 'бармесоё' },
    });
    expect(run('тағ бармесоё = 2; собит as = 3; чоп.сабт(бармесоё * as);')).toEqual(['6']);
  });

  test('definite assignment assertions', () => {
    const declaration = parseOk('тағ х!: рақам;')[0] as VariableDeclaration;
    expect(declaration).toMatchObject({ definite: true, identifier: { name: 'х' } });
    expect(declaration.typeAnnotation).toBeDefined();
    const longForm = parseOk('тағйирёбанда х!: сатр;')[0] as VariableDeclaration;
    expect(longForm.definite).toBe(true);
    const classDecl = parseOk(
      'синф К { х!: рақам; хосусӣ у!: сатр; з = 1; }'
    )[0] as ClassDeclaration;
    expect(classDecl.body.body.map(member => (member as PropertyDefinition).definite)).toEqual([
      true,
      true,
      undefined,
    ]);
  });

  test.each([
    ['тағ х!: рақам = 1;', /initializers cannot also have definite assignment assertions/],
    ['тағ х!;', /definite assignment assertions must also have type annotations/],
    ['синф К { х!: рақам = 1; }', /initializers cannot also have definite/],
    ['синф К { статикӣ х!: рақам; }', /'!' is not permitted in this context/],
    ['барои (тағ и!: рақам; ;) { шикастан; }', /'!' is not permitted in this context/],
  ])('invalid definite assignment assertion: %s', (source, message) => {
    const { errors } = parse(source);
    expect(errors).toEqual([expect.stringMatching(message)]);
    expect(errors[0]).toMatch(/at line 1, column \d+/);
  });

  test('mapped type key remapping with чун', () => {
    const alias = parseOk(
      'навъ Г<Т> = { [К дар калидҳои Т чун `гир_${К & сатр}`]: () => Т[К] };'
    )[0] as TypeAlias;
    expect(alias.typeAnnotation.typeAnnotation).toMatchObject({
      type: 'MappedType',
      typeParameter: { name: { name: 'К' } },
      nameType: { type: 'PrimitiveType', name: 'сатр' },
    });
    const english = parseOk('навъ Г<Т> = { [К дар калидҳои Т as К]: Т[К] };')[0] as TypeAlias;
    expect(english.typeAnnotation.typeAnnotation).toMatchObject({
      nameType: { name: { name: 'К' } },
    });
  });

  test("a type's '[' on the next line starts a new statement", () => {
    expect(parseOk('тағ х = у чун рақам\n[1].length;')).toHaveLength(2);
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

describe('Parser: do-while, labels and other statements', () => {
  test('кун { … } то (…); is a do-while loop', () => {
    const [loop] = parseOk('кун { х++; } то (х < 3);');
    expect(loop).toMatchObject({
      type: 'DoWhileStatement',
      body: { type: 'BlockStatement', body: [{ type: 'ExpressionStatement' }] },
      test: { type: 'BinaryExpression', operator: '<' },
      line: 1,
      column: 1,
    });
    // As in JavaScript, the ';' after the condition may be left out
    expect(parseOk('do { х++; } то (х < 3) чоп.сабт(х);').map(s => s.type)).toEqual([
      'DoWhileStatement',
      'ExpressionStatement',
    ]);
  });

  test('a do-while body without its condition is an error', () => {
    expect(parse('кун { х++; }').errors[0]).toMatch(/Expected 'то' after the body of 'кун'/);
  });

  test('labels and labelled jumps', () => {
    const [labeled] = parseOk(
      'берун: барои (тағ и = 0; и < 3; и++) { шикастан берун; давом берун; шикастан; }'
    );
    expect(labeled).toMatchObject({
      type: 'LabeledStatement',
      label: { type: 'Identifier', name: 'берун' },
      body: { type: 'ForStatement' },
    });
    const body = ((labeled as LabeledStatement).body as ForStatement).body as BlockStatement;
    expect(body.body).toMatchObject([
      { type: 'BreakStatement', label: { name: 'берун' } },
      { type: 'ContinueStatement', label: { name: 'берун' } },
      { type: 'BreakStatement' },
    ]);
    expect(body.body[2]).not.toHaveProperty('label');
  });

  test('a label after a line break is the next statement, as in JavaScript', () => {
    const loop = parseOk('то (дуруст) { шикастан\nх; }')[0] as WhileStatement;
    expect((loop.body as BlockStatement).body.map(s => s.type)).toEqual([
      'BreakStatement',
      'ExpressionStatement',
    ]);
  });

  test('declarations cannot be labeled', () => {
    expect(parse('л: тағ х = 1;').errors).toEqual([
      expect.stringMatching(/A declaration cannot be labeled at line 1, column 4/),
    ]);
    expect(parse('л: функсия ф() {}').errors).toHaveLength(1);
  });

  test('барои интизор is a for await loop', () => {
    const func = parseOk('ҳамзамон функсия ф() { барои интизор (собит х аз р) {} }')[0];
    expect((func as FunctionDeclaration).body.body[0]).toMatchObject({
      type: 'ForOfStatement',
      await: true,
      left: { kind: 'СОБИТ', identifier: { name: 'х' } },
    });
    expect(parse('барои интизор (собит к дар о) {}').errors).toEqual([
      expect.stringMatching(/'барои интизор' needs a for-of loop/),
    ]);
  });

  test('debugger and empty statements', () => {
    expect(parseOk(';; debugger; агар (х); барои (;;);')).toMatchObject([
      { type: 'EmptyStatement', line: 1, column: 1 },
      { type: 'EmptyStatement', line: 1, column: 2 },
      { type: 'DebuggerStatement', line: 1, column: 4 },
      { type: 'IfStatement', consequent: { type: 'EmptyStatement', line: 1, column: 22 } },
      { type: 'ForStatement', body: { type: 'EmptyStatement' } },
    ]);
    expect(parse('содир ;').errors[0]).toMatch(/Expected a declaration after 'содир'/);
  });
});

describe('Parser: enums', () => {
  test('members with and without initializers', () => {
    const [decl] = parseOk('шумориш Ранг { Сурх, Сабз = 5, "номи дароз" = "н", Б = Сабз * 2, }');
    expect(decl).toMatchObject({
      type: 'EnumDeclaration',
      name: { name: 'Ранг' },
      members: [
        { type: 'EnumMember', id: { type: 'Identifier', name: 'Сурх' } },
        { id: { name: 'Сабз' }, initializer: { type: 'Literal', value: 5 } },
        { id: { type: 'Literal', value: 'номи дароз' }, initializer: { value: 'н' } },
        { id: { name: 'Б' }, initializer: { type: 'BinaryExpression' } },
      ],
    });
    expect((decl as EnumDeclaration).members[0].initializer).toBeUndefined();
    expect((decl as EnumDeclaration).const).toBeUndefined();
  });

  test('const, exported and English enums', () => {
    expect(parseOk('собит шумориш Ҳ { А }')[0]).toMatchObject({
      type: 'EnumDeclaration',
      const: true,
    });
    expect(parseOk('enum Ҳ { А }')[0]).toMatchObject({ type: 'EnumDeclaration' });
    expect(parseOk('содир шумориш Ҳ { А }')[0]).toMatchObject({
      type: 'ExportDeclaration',
      declaration: { type: 'EnumDeclaration', name: { name: 'Ҳ' } },
    });
  });

  test('duplicate and numeric member names are errors', () => {
    expect(parse('шумориш Ҳ { А, А }').errors[0]).toMatch(/Duplicate enum member 'А'/);
    expect(parse('шумориш Ҳ { 1 }').errors[0]).toMatch(/Expected enum member name/);
  });
});

describe('Parser: generators', () => {
  test('generator declarations and expressions', () => {
    expect(parseOk('функсия* г() { ҳосил 1; }')[0]).toMatchObject({
      type: 'FunctionDeclaration',
      generator: true,
      body: { body: [{ expression: { type: 'YieldExpression', delegate: false } }] },
    });
    expect(parseOk('ҳамзамон функсия *г() {}')[0]).toMatchObject({ async: true, generator: true });
    expect(initOf('тағ г = функсия* () { ҳосил* [1]; };')).toMatchObject({
      type: 'FunctionExpression',
      generator: true,
      body: { body: [{ expression: { type: 'YieldExpression', delegate: true } }] },
    });
    expect(parseOk('функсия г() {}')[0]).not.toHaveProperty('generator');
  });

  test('generator methods of classes and object literals', () => {
    const methods = (parseOk('синф К { *а() {} статикӣ ҳамзамон *б() {} }')[0] as ClassDeclaration)
      .body.body as MethodDefinition[];
    expect(methods.map(m => [m.static, m.value.async, m.value.generator])).toEqual([
      [false, undefined, true],
      [true, true, true],
    ]);
    const object = initOf<ObjectExpression>(
      'тағ о = { *а() {}, ҳамзамон *б() {}, ҳамзамон в() {}, ҳамзамон: 1 };'
    );
    expect(
      object.properties.map(p => {
        const value = (p as Property).value as FunctionExpression;
        return [(p as Property).method, value.generator, value.async];
      })
    ).toEqual([
      [true, true, undefined],
      [true, true, true],
      [true, undefined, true],
      [undefined, undefined, undefined],
    ]);
  });

  test('yield binds like an assignment and may have no operand', () => {
    const body = (
      parseOk(
        'функсия* г() { ҳосил а + б; тағ х = ҳосил; ф(ҳосил, ҳосил 1); yield в ? 1 : 2; х = (ҳосил) + 1; }'
      )[0] as FunctionDeclaration
    ).body.body;
    expect((body[0] as ExpressionStatement).expression).toMatchObject({
      type: 'YieldExpression',
      argument: { type: 'BinaryExpression', operator: '+' },
    });
    expect((body[1] as VariableDeclaration).init).toMatchObject({
      type: 'YieldExpression',
      delegate: false,
    });
    expect((body[1] as VariableDeclaration).init).not.toHaveProperty('argument');
    expect(((body[2] as ExpressionStatement).expression as CallExpression).arguments).toMatchObject(
      [{ type: 'YieldExpression' }, { type: 'YieldExpression', argument: { value: 1 } }]
    );
    expect((body[3] as ExpressionStatement).expression).toMatchObject({
      type: 'YieldExpression',
      argument: { type: 'ConditionalExpression' },
    });
    expect((body[4] as ExpressionStatement).expression).toMatchObject({
      right: { type: 'BinaryExpression', left: { type: 'YieldExpression' } },
    });
  });

  test('a yield used as an operand must be parenthesized', () => {
    expect(parse('функсия* г() { тағ х = 1 + ҳосил 2; }').errors[0]).toMatch(
      /'ҳосил' used as an operand must be parenthesized/
    );
  });

  test('ҳосил is an ordinary name outside generator bodies', () => {
    const statements = parseOk(
      'тағ ҳосил = 1; ҳосил += 2; функсия ф(ҳосил: рақам) { бозгашт ҳосил; }\n' +
        'функсия* г() { собит ф = () => ҳосил; функсия д() { бозгашт ҳосил; } }'
    );
    expect((statements[1] as ExpressionStatement).expression).toMatchObject({
      type: 'AssignmentExpression',
      left: { type: 'Identifier', name: 'ҳосил' },
    });
    const generatorBody = (statements[3] as FunctionDeclaration).body.body;
    expect((generatorBody[0] as VariableDeclaration).init).toMatchObject({
      type: 'ArrowFunctionExpression',
      body: { type: 'Identifier', name: 'ҳосил' },
    });
    expect((generatorBody[1] as FunctionDeclaration).body.body[0]).toMatchObject({
      type: 'ReturnStatement',
      argument: { type: 'Identifier', name: 'ҳосил' },
    });
  });
});

describe('Parser: the new contextual keywords stay ordinary names elsewhere', () => {
  test('кун, шумориш and ҳосил as variables, functions and properties', () => {
    const statements = parseOk(
      'тағ кун = 1; кун = кун + 1; кун(кун);\n' +
        'функсия шумориш(р: рақам[]): рақам { бозгашт р.length; } шумориш([1]);\n' +
        'тағ ҳосил = { кун: 1, шумориш: 2, ҳосил: 3 }; чоп.сабт(ҳосил.кун);'
    );
    expect(statements.map(s => s.type)).toEqual([
      'VariableDeclaration',
      'ExpressionStatement',
      'ExpressionStatement',
      'FunctionDeclaration',
      'ExpressionStatement',
      'VariableDeclaration',
      'ExpressionStatement',
    ]);
  });
});

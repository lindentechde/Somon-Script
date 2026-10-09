/**
 * Type syntax the parser keeps for the TypeScript emitter (`инфер`,
 * `навъи х`, template literal types, mapped type modifiers, index
 * signatures, type arguments of calls and heritage clauses, `калонрақам`)
 * and the module syntax of ES modules.
 */
import { compile } from '../src/compiler';
import { Lexer } from '../src/lexer';
import { Parser } from '../src/parser';
import type {
  CallExpression,
  ClassDeclaration,
  ExportDeclaration,
  ExpressionStatement,
  ImportDeclaration,
  InterfaceDeclaration,
  Program,
  Statement,
  TypeAlias,
  VariableDeclaration,
} from '../src/types';

function parse(source: string): Statement[] {
  const parser = new Parser(new Lexer(source).tokenize());
  const program: Program = parser.parse();
  expect(parser.getErrors()).toEqual([]);
  return program.body;
}

function aliasType(source: string) {
  return (parse(source)[0] as TypeAlias).typeAnnotation.typeAnnotation;
}

describe('type operators', () => {
  test.each(['инфер', 'infer'])('%s in a conditional type', word => {
    const type = aliasType(`навъ А<Т> = Т мерос Ваъда<${word} У> ? У : Т;`);
    expect(type).toMatchObject({
      type: 'ConditionalType',
      extendsType: {
        type: 'GenericType',
        typeParameters: [{ type: 'InferType', typeParameter: { name: { name: 'У' } } }],
      },
    });
  });

  test.each(['навъи', 'typeof'])('%s of a value, a member and this', word => {
    expect(aliasType(`навъ А = ${word} х;`)).toMatchObject({
      type: 'TypeQuery',
      exprName: { name: 'х' },
    });
    expect(aliasType(`навъ А = ${word} о.а.б;`)).toMatchObject({
      type: 'TypeQuery',
      exprName: { name: 'о.а.б' },
    });
    expect(aliasType(`навъ А = калидҳои ${word} о;`)).toMatchObject({
      type: 'KeyofType',
      operand: { type: 'TypeQuery' },
    });
  });

  test('a type named like an operator is still a type name', () => {
    expect(aliasType('навъ А = infer;')).toMatchObject({
      type: 'GenericType',
      name: { name: 'infer' },
    });
  });

  test('template literal types keep their text and types', () => {
    expect(aliasType('навъ А = `а${рақам}б${сатр | "х"}`;')).toMatchObject({
      type: 'TemplateLiteralType',
      quasis: ['а', 'б', ''],
      types: [{ type: 'PrimitiveType', name: 'рақам' }, { type: 'UnionType' }],
    });
    expect(aliasType('навъ А = `оддӣ`;')).toMatchObject({ quasis: ['оддӣ'], types: [] });
  });

  test('an invalid type inside a template literal type is an error', () => {
    const parser = new Parser(new Lexer('навъ А = `а${ = }`;').tokenize());
    parser.parse();
    expect(parser.getErrors().length).toBeGreaterThan(0);
  });

  test('mapped type modifiers', () => {
    expect(aliasType('навъ М<Т> = { -танҳохонӣ [К дар калидҳои Т]-?: Т[К] };')).toMatchObject({
      readonly: false,
      readonlyModifier: '-',
      optional: false,
      optionalModifier: '-',
    });
    expect(aliasType('навъ М<Т> = { +танҳохонӣ [К дар калидҳои Т]+?: Т[К] };')).toMatchObject({
      readonly: true,
      readonlyModifier: '+',
      optional: true,
      optionalModifier: '+',
    });
    const plain = aliasType('навъ М<Т> = { танҳохонӣ [К дар калидҳои Т]?: Т[К] };');
    expect(plain).toMatchObject({ readonly: true, optional: true });
    expect(plain).not.toHaveProperty('readonlyModifier');
    expect(plain).not.toHaveProperty('optionalModifier');
  });

  test('калонрақам is the bigint type and still a name', () => {
    expect(aliasType('навъ А = калонрақам;')).toMatchObject({
      type: 'PrimitiveType',
      name: 'калонрақам',
    });
    expect(compile('тағ калонрақам = 1; тағ б: калонрақам = 2n;').errors).toEqual([]);
  });
});

describe('interface members', () => {
  function members(source: string) {
    return (parse(source)[0] as InterfaceDeclaration).body.properties;
  }

  test('an index signature keeps its key parameter', () => {
    const [index] = members('интерфейс И { танҳохонӣ [калид: сатр | рақам]: ҳар; }');
    expect(index).toMatchObject({
      key: { name: '__computed__' },
      readonly: true,
      indexSignature: {
        type: 'Parameter',
        name: { name: 'калид' },
        typeAnnotation: { typeAnnotation: { type: 'UnionType' } },
      },
      typeAnnotation: { typeAnnotation: { type: 'PrimitiveType', name: 'ҳар' } },
    });
  });

  test('a computed member name keeps its expression', () => {
    const [computed, method] = members(
      'интерфейс И { [Symbol.iterator]: ҳар; [Symbol.asyncIterator](): ҳар; }'
    );
    expect(computed).toMatchObject({
      computed: true,
      computedKey: { type: 'MemberExpression', property: { name: 'iterator' } },
    });
    expect(computed).not.toHaveProperty('indexSignature');
    expect(method).toMatchObject({
      computed: true,
      method: true,
      computedKey: { type: 'MemberExpression', property: { name: 'asyncIterator' } },
    });
  });
});

describe('type arguments', () => {
  test('of calls', () => {
    const declaration = parse('тағ м = ф<рақам, сатр[]>(1);')[0] as VariableDeclaration;
    expect(declaration.init).toMatchObject({
      type: 'CallExpression',
      typeArguments: [{ type: 'PrimitiveType' }, { type: 'ArrayType' }],
    });
    const comparison = parse('тағ м = а < б;')[0] as VariableDeclaration;
    expect(comparison.init).toMatchObject({ type: 'BinaryExpression', operator: '<' });
  });

  test('of method calls, also closed by >>', () => {
    const declaration = parse(
      'тағ м = р.reduce<Record<сатр, рақам[]>>((а, б) => а, {});'
    )[0] as VariableDeclaration;
    expect(declaration.init).toMatchObject({
      type: 'CallExpression',
      callee: { type: 'MemberExpression' },
      typeArguments: [{ type: 'GenericType', name: { name: 'Record' } }],
    });
    expect(compile('тағ а = [1].map<рақам>(х => х);', { typeCheck: false }).code).toBe(
      'let а = [1].map((х) => х);'
    );
    // `<` that cannot open type arguments followed by `(` compares
    for (const source of [
      'агар (о.д < н) { чоп.сабт(х > (у)); }',
      'тағ а = о.д < н && б > (в);',
      'тағ а = о.д < н; тағ б = в > (г);',
    ]) {
      expect(JSON.stringify(parse(source))).not.toContain('typeArguments');
    }
  });

  test('a call without type arguments has none', () => {
    const statement = parse('ф(1);')[0] as ExpressionStatement;
    expect(statement.expression as CallExpression).not.toHaveProperty('typeArguments');
  });

  test('of the superclass and the implemented interfaces', () => {
    const declaration = parse('синф А мерос Б<рақам> татбиқ В<сатр>, Г {}')[0] as ClassDeclaration;
    expect(declaration).toMatchObject({
      superClass: { name: 'Б' },
      superTypeArguments: [{ type: 'PrimitiveType', name: 'рақам' }],
      implements: [{ name: 'В' }, { name: 'Г' }],
      implementsTypeArguments: [[{ type: 'PrimitiveType', name: 'сатр' }], undefined],
    });
    const plain = parse('синф А мерос Б татбиқ В {}')[0] as ClassDeclaration;
    expect(plain).not.toHaveProperty('superTypeArguments');
    expect(plain).not.toHaveProperty('implementsTypeArguments');
    const expression = parse('тағ К = синф мерос Б<рақам> {};')[0] as VariableDeclaration;
    expect(expression.init).toMatchObject({
      type: 'ClassExpression',
      superTypeArguments: [{ type: 'PrimitiveType' }],
    });
  });
});

describe('ES module syntax', () => {
  test('side-effect import', () => {
    expect(parse('ворид "./м";')[0]).toMatchObject({
      type: 'ImportDeclaration',
      specifiers: [],
      source: { value: './м' },
    });
  });

  test('default and namespace import together', () => {
    const declaration = parse('ворид а, * чун Н аз "./м";')[0] as ImportDeclaration;
    expect(declaration.specifiers.map(specifier => specifier.type)).toEqual([
      'ImportDefaultSpecifier',
      'ImportNamespaceSpecifier',
    ]);
  });

  test('a namespace import needs чун', () => {
    const parser = new Parser(new Lexer('ворид * аз "./м";').tokenize());
    parser.parse();
    expect(parser.getErrors()).toEqual([
      expect.stringMatching(/Expected 'чун' after '\*' in namespace import/),
    ]);
  });

  test('export * as', () => {
    expect(parse('содир * чун Н аз "./м";')[0] as ExportDeclaration).toMatchObject({
      specifiers: [],
      source: { value: './м' },
      namespaceExport: { name: 'Н' },
    });
    expect(parse('содир * аз "./м";')[0]).not.toHaveProperty('namespaceExport');
  });

  test('ворид.meta and dynamic imports start expression statements', () => {
    expect(parse('ворид.meta.url;')[0]).toMatchObject({
      type: 'ExpressionStatement',
      expression: {
        type: 'MemberExpression',
        object: { type: 'MetaProperty', meta: { name: 'import' }, property: { name: 'meta' } },
      },
    });
    expect(parse('ворид("./м");')[0]).toMatchObject({
      type: 'ExpressionStatement',
      expression: { type: 'ImportExpression' },
    });
  });
});

describe('the SomonScript checker accepts the new type syntax', () => {
  test.each([
    'навъ А<Т> = Т мерос Ваъда<инфер У> ? У : Т;\nтағ х: А<Ваъда<рақам>> = 1;',
    'тағ о = { а: 1 };\nтағ к: калидҳои навъи о = "а";',
    'навъ Т = `ид_${рақам}`;\nтағ х: Т = "ид_1";',
    'интерфейс И { [к: сатр]: рақам; }\nтағ и: И = { а: 1 };',
    'функсия ф<Т>(х: Т): Т { бозгашт х; }\nтағ н: рақам = ф<рақам>(1);',
  ])('%s', source => {
    expect(compile(source, { strict: true }).errors).toEqual([]);
  });
});

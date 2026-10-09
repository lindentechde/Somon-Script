/**
 * Emission of hand-built ASTs: precedence-aware parenthesisation and the
 * newer node shapes (conditional, sequence, optional chaining, spread,
 * default/rest/destructured parameters, …). Every case runs the emitted
 * JavaScript and asserts on the value it computes.
 */

import * as vm from 'vm';
import { CodeGenerator } from '../src/codegen';

const pos = { line: 1, column: 1 };
const id = (name: string): any => ({ type: 'Identifier', name, ...pos });
const lit = (value: any, raw?: string): any => ({
  type: 'Literal',
  value,
  raw: raw ?? JSON.stringify(value),
  ...pos,
});
const bin = (operator: string, left: any, right: any): any => ({
  type: 'BinaryExpression',
  operator,
  left,
  right,
  ...pos,
});
const unary = (operator: string, argument: any): any => ({
  type: 'UnaryExpression',
  operator,
  argument,
  ...pos,
});
const update = (operator: string, argument: any, prefix: boolean): any => ({
  type: 'UpdateExpression',
  operator,
  argument,
  prefix,
  ...pos,
});
const assign = (operator: string, left: any, right: any): any => ({
  type: 'AssignmentExpression',
  operator,
  left,
  right,
  ...pos,
});
const cond = (test: any, consequent: any, alternate: any): any => ({
  type: 'ConditionalExpression',
  test,
  consequent,
  alternate,
  ...pos,
});
const seq = (...expressions: any[]): any => ({ type: 'SequenceExpression', expressions, ...pos });
const member = (
  object: any,
  property: any,
  opts: { computed?: boolean; optional?: boolean } = {}
) => ({
  type: 'MemberExpression',
  object,
  property: typeof property === 'string' ? id(property) : property,
  computed: opts.computed ?? false,
  optional: opts.optional,
  ...pos,
});
const call = (callee: any, args: any[] = [], optional?: boolean): any => ({
  type: 'CallExpression',
  callee,
  arguments: args,
  optional,
  ...pos,
});
const newExpr = (callee: any, args: any[] = []): any => ({
  type: 'NewExpression',
  callee,
  arguments: args,
  ...pos,
});
const spread = (argument: any): any => ({ type: 'SpreadElement', argument, ...pos });
const arr = (...elements: any[]): any => ({ type: 'ArrayExpression', elements, ...pos });
const prop = (key: string, value: any, extra: Record<string, unknown> = {}): any => ({
  type: 'Property',
  key: id(key),
  value,
  computed: false,
  shorthand: false,
  ...extra,
  ...pos,
});
const obj = (...properties: any[]): any => ({ type: 'ObjectExpression', properties, ...pos });
const param = (name: string, extra: Record<string, unknown> = {}): any => ({
  type: 'Parameter',
  name: id(name),
  ...extra,
  ...pos,
});
const block = (...body: any[]): any => ({ type: 'BlockStatement', body, ...pos });
const ret = (argument: any): any => ({ type: 'ReturnStatement', argument, ...pos });
const exprStmt = (expression: any): any => ({ type: 'ExpressionStatement', expression, ...pos });
const arrow = (params: any[], body: any, isAsync?: boolean): any => ({
  type: 'ArrowFunctionExpression',
  params,
  body,
  isAsync,
  ...pos,
});
const fnExpr = (params: any[], body: any): any => ({
  type: 'FunctionExpression',
  params,
  body,
  ...pos,
});
const letDecl = (name: string, init: any): any => ({
  type: 'VariableDeclaration',
  kind: 'ТАҒЙИРЁБАНДА',
  identifier: id(name),
  init,
  ...pos,
});
const fnDecl = (name: string, params: any[], body: any): any => ({
  type: 'FunctionDeclaration',
  name: id(name),
  params,
  body,
  ...pos,
});
const objPattern = (...names: string[]): any => ({
  type: 'ObjectPattern',
  properties: names.map(n => ({
    type: 'PropertyPattern',
    key: id(n),
    value: id(n),
    computed: false,
    ...pos,
  })),
  ...pos,
});

function emit(body: any[]): string {
  const generator = new CodeGenerator();
  const code = generator.generate({ type: 'Program', body, ...pos } as any);
  expect(generator.getErrors()).toEqual([]);
  return code;
}

/** Emit `let r = <expr>;` after the setup statements, run it and return `r`. */
function evaluate(expr: any, setup: any[] = []): unknown {
  const code = emit([...setup, letDecl('r', expr)]);
  return vm.runInNewContext(`${code}\nr;`, {});
}

describe('precedence-aware emission', () => {
  const abc = [letDecl('а', lit(1)), letDecl('б', lit(2)), letDecl('в', lit(3))];

  test.each([
    ['а - (б - в)', bin('-', id('а'), bin('-', id('б'), id('в'))), 2],
    ['(а - б) - в', bin('-', bin('-', id('а'), id('б')), id('в')), -4],
    ['а / (б * в)', bin('/', id('а'), bin('*', id('б'), id('в'))), 1 / 6],
    ['(а + б) * в', bin('*', bin('+', id('а'), id('б')), id('в')), 9],
    ['а + б * в', bin('+', id('а'), bin('*', id('б'), id('в'))), 7],
    ['-(а + б)', unary('-', bin('+', id('а'), id('б'))), -3],
    ['!(а == б)', unary('!', bin('==', id('а'), id('б'))), true],
    ['(б ** в) ** б', bin('**', bin('**', id('б'), id('в')), id('б')), 64],
    ['б ** (в ** б)', bin('**', id('б'), bin('**', id('в'), id('б'))), 512],
    ['(-б) ** б', bin('**', unary('-', id('б')), id('б')), 4],
    ['-(б ** б)', unary('-', bin('**', id('б'), id('б'))), -4],
    ['null ?? (0 || 5)', bin('??', lit(null), bin('||', lit(0), lit(5))), 5],
    ['(null ?? 0) || 5', bin('||', bin('??', lit(null), lit(0)), lit(5)), 5],
    ['(0 && 1) ?? 7', bin('??', bin('&&', lit(0), lit(1)), lit(7)), 0],
    ['1 + (а = 5)', bin('+', lit(1), assign('=', id('а'), lit(5))), 6],
    ['(а + б).toFixed(1)', call(member(bin('+', id('а'), id('б')), 'toFixed'), [lit(1)]), '3.0'],
    ['(5).toFixed(1)', call(member(lit(5, '5'), 'toFixed'), [lit(1)]), '5.0'],
    ['1 + (true ? 2 : 3)', bin('+', lit(1), cond(lit(true), lit(2), lit(3))), 3],
    ['(1, 2)', seq(lit(1), lit(2)), 2],
    ['(() => 5)()', call(arrow([], lit(5))), 5],
    ['typeof а', unary('typeof', id('а')), 'number'],
    ['void а', unary('void', id('а')), undefined],
    ['typeof typeof а', unary('typeof', unary('typeof', id('а'))), 'string'],
  ])('%s', (_label, expr, expected) => {
    expect(evaluate(expr, abc)).toEqual(expected);
  });

  test('- -а is negation twice, not a decrement', () => {
    const code = emit([
      letDecl('а', lit(5)),
      letDecl('r', unary('-', unary('-', id('а')))),
      letDecl('q', unary('-', update('--', id('а'), true))),
    ]);
    expect(vm.runInNewContext(`${code}\n[r, q, а]`, {})).toEqual([5, -4, 4]);
  });

  test('conditional nesting and associativity', () => {
    // (true ? false : true) ? 1 : 2  → 2
    expect(evaluate(cond(cond(lit(true), lit(false), lit(true)), lit(1), lit(2)))).toBe(2);
    // false ? 1 : true ? 2 : 3 → 2
    expect(evaluate(cond(lit(false), lit(1), cond(lit(true), lit(2), lit(3))))).toBe(2);
  });

  test('delete removes a property', () => {
    const code = emit([
      letDecl('о', obj(prop('а', lit(1)), prop('б', lit(2)))),
      exprStmt(unary('delete', member(id('о'), 'а'))),
    ]);
    expect(vm.runInNewContext(`${code}\nObject.keys(о).join()`, {})).toBe('б');
  });

  test('sequence in call arguments stays a single argument', () => {
    const f = arrow([param('x', { rest: true })], member(id('x'), 'length'));
    expect(evaluate(call(f, [seq(lit(1), lit(2)), lit(3)]))).toBe(2);
  });

  test('new callee containing a call is parenthesised', () => {
    const setup = [
      letDecl(
        'C',
        fnExpr(
          [],
          block(exprStmt(assign('=', member({ type: 'ThisExpression', ...pos }, 'v'), lit(7))))
        )
      ),
      letDecl('f', arrow([], obj(prop('K', id('C'))))),
    ];
    expect(evaluate(member(newExpr(member(call(id('f')), 'K')), 'v'), setup)).toBe(7);
    expect(evaluate(member(newExpr(member(obj(prop('K', id('C'))), 'K')), 'v'), setup)).toBe(7);
  });

  test('arrow returning an object literal returns the object', () => {
    const code = emit([letDecl('ф', arrow([], obj(prop('x', lit(1)))))]);
    expect(vm.runInNewContext(`${code}\nф().x`, {})).toBe(1);
  });

  test('expression statements starting with an object literal or function are wrapped', () => {
    const code = emit([
      letDecl('r', lit(0)),
      exprStmt(assign('=', id('r'), lit(1))),
      exprStmt(call(member(obj(prop('ф', arrow([], assign('+=', id('r'), lit(10))))), 'ф'))),
      exprStmt(call(fnExpr([], block(exprStmt(assign('+=', id('r'), lit(100))))))),
    ]);
    expect(vm.runInNewContext(`${code}\nr`, {})).toBe(111);
  });
});

describe('new AST node emission', () => {
  test.each([
    ['??=', lit(null), 5, 5],
    ['||=', lit(0), 6, 6],
    ['&&=', lit(1), 7, 7],
    ['**=', lit(2), 3, 8],
  ])('assignment operator %s', (operator, initial, rhs, expected) => {
    const code = emit([letDecl('x', initial), exprStmt(assign(operator, id('x'), lit(rhs)))]);
    expect(vm.runInNewContext(`${code}\nx`, {})).toBe(expected);
  });

  test('optional member and call', () => {
    const setup = [letDecl('о', lit(null)), letDecl('п', obj(prop('а', obj(prop('б', lit(4))))))];
    expect(evaluate(member(member(id('о'), 'а', { optional: true }), 'б'), setup)).toBeUndefined();
    expect(evaluate(member(member(id('п'), 'а', { optional: true }), 'б'), setup)).toBe(4);
    expect(
      evaluate(member(id('о'), lit('а'), { computed: true, optional: true }), setup)
    ).toBeUndefined();
    expect(evaluate(call(id('о'), [], true), setup)).toBeUndefined();
    expect(evaluate(call(member(id('о'), 'ф', { optional: true }), []), setup)).toBeUndefined();
  });

  test('spread in arrays, objects, calls and new', () => {
    const setup = [letDecl('а', arr(lit(1), lit(2))), letDecl('о', obj(prop('x', lit(1))))];
    expect(evaluate(arr(lit(0), spread(id('а')), lit(3)), setup)).toEqual([0, 1, 2, 3]);
    expect(evaluate(obj(spread(id('о')), prop('y', lit(2))), setup)).toEqual({ x: 1, y: 2 });
    expect(evaluate(call(member(id('Math'), 'max'), [spread(id('а')), lit(0)]), setup)).toBe(2);
    expect(evaluate(member(newExpr(id('Array'), [spread(id('а'))]), 'length'), setup)).toBe(2);
  });

  test('object method shorthand', () => {
    const method = fnExpr([param('н')], block(ret(bin('*', id('н'), lit(2)))));
    const code = emit([letDecl('о', obj(prop('ду', method, { method: true })))]);
    expect(code).toContain('ду(н) {');
    expect(vm.runInNewContext(`${code}\nо.ду(4)`, {})).toBe(8);
  });

  test('default, rest and destructured parameters in every function form', () => {
    const params = [
      param('а', { defaultValue: lit(10) }),
      { ...param('_p'), pattern: objPattern('б') },
      param('в', { rest: true }),
    ];
    const body = block(ret(bin('+', bin('+', id('а'), id('б')), member(id('в'), 'length'))));
    const classDecl = {
      type: 'ClassDeclaration',
      name: id('К'),
      body: {
        type: 'ClassBody',
        body: [
          {
            type: 'MethodDefinition',
            key: id('constructor'),
            kind: 'constructor',
            static: false,
            value: fnExpr(
              params,
              block(
                exprStmt(
                  assign(
                    '=',
                    member({ type: 'ThisExpression', ...pos }, 'v'),
                    body.body[0].argument
                  )
                )
              )
            ),
            ...pos,
          },
          {
            type: 'MethodDefinition',
            key: id('м'),
            kind: 'method',
            static: false,
            value: fnExpr(params, body),
            ...pos,
          },
        ],
        ...pos,
      },
      ...pos,
    };
    const code = emit([
      fnDecl('ф', params, body),
      letDecl('ф2', fnExpr(params, body)),
      letDecl('ф3', arrow(params, body)),
      classDecl,
    ]);
    const result = vm.runInNewContext(
      `${code}\nconst a = [undefined, {б: 1}, 0, 0];\n[ф(...a), ф2(...a), ф3(...a), new К(...a).v, new К(...a).м(...a), ф(1, {б: 1})]`,
      {}
    );
    expect(result).toEqual([13, 13, 13, 13, 13, 2]);
  });

  test('async arrow functions keep the async modifier', async () => {
    const code = emit([
      letDecl('ф', arrow([], { type: 'AwaitExpression', argument: lit(3), ...pos }, true)),
    ]);
    await expect(vm.runInNewContext(`${code}\nф()`, {})).resolves.toBe(3);
  });

  test('numeric literals are emitted as written', () => {
    const code = emit([
      letDecl('а', lit(255, '0xFF')),
      letDecl('б', lit(5, '0b101')),
      letDecl('в', lit(1000, '1e3')),
      letDecl('г', lit(0.5, '.5')),
      letDecl('д', lit(10, '10n')),
    ]);
    expect(code).toContain('0xFF');
    expect(code).toContain('10n');
    expect(vm.runInNewContext(`${code}\n[а, б, в, г, typeof д]`, {})).toEqual([
      255,
      5,
      1000,
      0.5,
      'bigint',
    ]);
  });

  test('template quasis are emitted from cooked text with re-escaping', () => {
    const quasi = (cooked: string, raw: string, tail: boolean): any => ({
      type: 'TemplateElement',
      value: { cooked, raw },
      tail,
      ...pos,
    });
    const template = {
      type: 'TemplateLiteral',
      // `raw` is deliberately unusable: codegen must emit from `cooked`
      quasis: [quasi('a ` b ${x} C:\\temp ', 'RAW', false), quasi('!', 'RAW', true)],
      expressions: [lit(1)],
      ...pos,
    };
    expect(evaluate(template)).toBe('a ` b ${x} C:\\temp 1!');
  });

  test('shorthand property pattern without a value is tolerated', () => {
    const pattern = {
      type: 'ObjectPattern',
      properties: [{ type: 'PropertyPattern', key: id('п'), computed: false, ...pos }],
      ...pos,
    };
    const code = emit([
      {
        type: 'VariableDeclaration',
        kind: 'СОБИТ',
        identifier: pattern,
        init: obj(prop('п', lit(9))),
        ...pos,
      },
    ]);
    expect(vm.runInNewContext(`${code}\nп`, {})).toBe(9);
  });

  test('destructuring keys use the same member-name mapping as object keys', () => {
    const code = emit([
      letDecl('филтр', lit(1)),
      letDecl('о', obj(prop('дарозӣ', lit(5)), { ...prop('филтр', id('филтр')), shorthand: true })),
      {
        type: 'VariableDeclaration',
        kind: 'СОБИТ',
        identifier: objPattern('дарозӣ'),
        init: id('о'),
        ...pos,
      },
    ]);
    expect(code).toContain('{length: дарозӣ}');
    expect(vm.runInNewContext(`${code}\n[дарозӣ, о.length, о.filter]`, {})).toEqual([5, 5, 1]);
  });
});

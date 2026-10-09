/**
 * Grammar-based generators for the fuzz tests (tests/fuzz.test.ts): random
 * SomonScript programs built as ASTs (src/ast.ts), a printer that writes them
 * as SomonScript source (optionally with random line breaks, spacing and
 * comments), and a canonical form that SomonScript ASTs and TypeScript ASTs
 * (of the JavaScript and TypeScript the compiler prints) can be compared in.
 *
 * Generated programs are valid and deterministic: they only read variables
 * after their declaration, loops run a bounded number of times, functions
 * only call functions declared before them, and every value they compute is
 * printed with `чоп.сабт`. They may still throw (a call of a number, a member
 * of `холӣ`), the same way on every path.
 */
import * as fc from 'fast-check';
import ts from 'typescript';

import type {
  ArrayExpression,
  ArrowFunctionExpression,
  AssignmentExpression,
  ASTNode,
  BinaryExpression,
  BlockStatement,
  BreakStatement,
  CallExpression,
  ChainExpression,
  ConditionalExpression,
  ContinueStatement,
  Expression,
  ExpressionStatement,
  ForStatement,
  FunctionDeclaration,
  Identifier,
  IfStatement,
  Literal,
  MemberExpression,
  ObjectExpression,
  Parameter,
  Program,
  Property,
  ReturnStatement,
  SequenceExpression,
  SpreadElement,
  Statement,
  SwitchCase,
  SwitchStatement,
  TemplateElement,
  TemplateLiteral,
  ThrowStatement,
  TryStatement,
  UnaryExpression,
  UpdateExpression,
  VariableDeclaration,
  VariableDeclarationList,
  WhileStatement,
} from '../../src/ast';
import { translateMemberName } from '../../src/builtin-names';

// ---------------------------------------------------------------------------
// AST builders

const at = { line: 0, column: 0 };

const identifier = (name: string): Identifier => ({ type: 'Identifier', name, ...at });

const numberLiteral = (value: number): Literal => ({
  type: 'Literal',
  value,
  raw: String(value),
  ...at,
});

const stringLiteral = (value: string): Literal => ({
  type: 'Literal',
  value,
  raw: JSON.stringify(value),
  ...at,
});

const booleanLiteral = (value: boolean): Literal => ({
  type: 'Literal',
  value,
  raw: value ? 'дуруст' : 'нодуруст',
  ...at,
});

const nullLiteral: Literal = { type: 'Literal', value: null, raw: 'холӣ', ...at };

const parameter = (name: string): Parameter => ({
  type: 'Parameter',
  name: identifier(name),
  ...at,
});

const block = (body: Statement[]): BlockStatement => ({ type: 'BlockStatement', body, ...at });

const statement = (expression: Expression): ExpressionStatement => ({
  type: 'ExpressionStatement',
  expression,
  ...at,
});

/** `чоп.сабт(…)` */
const print = (args: Expression[]): ExpressionStatement =>
  statement({
    type: 'CallExpression',
    callee: {
      type: 'MemberExpression',
      object: identifier('чоп'),
      property: identifier('сабт'),
      computed: false,
      ...at,
    } as MemberExpression,
    arguments: args,
    ...at,
  } as CallExpression);

// ---------------------------------------------------------------------------
// Expressions

/** What the code at some point may use. */
export interface Scope {
  /** Names it may read. */
  readable: string[];
  /** Names it may assign (never loop counters, so loops end). */
  assignable: string[];
  /** Functions declared before, with their number of parameters. */
  functions: Array<{ name: string; arity: number }>;
}

/** Variables every program declares first, and the properties of its objects. */
export const VARIABLES = ['х0', 'х1', 'х2', 'х3'];
const PROPERTIES = ['р0', 'р1', 'р2'];

const BINARY_OPERATORS = [
  '+',
  '-',
  '*',
  '/',
  '%',
  '**',
  '==',
  '!=',
  '===',
  '!==',
  '<',
  '>',
  '<=',
  '>=',
  '&',
  '|',
  '^',
  '<<',
  '>>',
  '>>>',
  '&&',
  '||',
  '??',
  'in',
];
const UNARY_OPERATORS = ['-', '+', '!', '~', 'typeof', 'void'];
const ASSIGNMENT_OPERATORS = ['=', '+=', '-=', '*=', '??=', '||=', '&&='];

/** Text with letters of both alphabets, escapes and the characters templates must escape. */
const text = fc
  .array(fc.constantFrom('а', 'б', 'ҷ', 'ӯ', 'z', '1', ' ', '"', "'", '\\', '\n', '`', '$', '{'), {
    maxLength: 6,
  })
  .map(chars => chars.join(''));

const literal: fc.Arbitrary<Expression> = fc.oneof(
  fc
    .oneof(fc.integer({ min: 0, max: 300 }), fc.constantFrom(0.5, 2.25, 1e21, 1e-7))
    .map(numberLiteral),
  text.map(stringLiteral),
  fc.boolean().map(booleanLiteral),
  fc.constant(nullLiteral),
  fc.constant(identifier('беқимат'))
);

/** Expressions over `scope`, nested at most `maxDepth` deep. */
export function expressionArbitrary(scope: Scope, maxDepth = 3): fc.Arbitrary<Expression> {
  const leaves =
    scope.readable.length > 0
      ? fc.oneof(literal, fc.constantFrom(...scope.readable).map(identifier))
      : literal;
  const { expression } = fc.letrec<{ expression: Expression }>(tie => {
    const sub = tie('expression');
    const options: Array<fc.Arbitrary<Expression>> = [
      leaves,
      fc
        .tuple(fc.constantFrom(...BINARY_OPERATORS), sub, sub)
        .map(
          ([operator, left, right]) =>
            ({ type: 'BinaryExpression', operator, left, right, ...at }) as BinaryExpression
        ),
      fc
        .tuple(fc.constantFrom(...UNARY_OPERATORS), sub)
        .map(
          ([operator, argument]) =>
            ({ type: 'UnaryExpression', operator, argument, ...at }) as UnaryExpression
        ),
      fc.tuple(sub, sub, sub).map(
        ([test, consequent, alternate]) =>
          ({
            type: 'ConditionalExpression',
            test,
            consequent,
            alternate,
            ...at,
          }) as ConditionalExpression
      ),
      fc
        .tuple(fc.array(text, { minLength: 1, maxLength: 3 }), fc.array(sub, { maxLength: 2 }))
        .map(([parts, expressions]) => template(parts, expressions)),
      fc
        .array(fc.oneof(sub, sub.map(spread)), { maxLength: 3 })
        .map(elements => ({ type: 'ArrayExpression', elements, ...at }) as ArrayExpression),
      fc
        .array(
          fc.tuple(fc.constantFrom(...PROPERTIES, 'к л', ...scope.readable), sub, fc.boolean()),
          { maxLength: 3 }
        )
        .map(entries => object(entries, scope.readable)),
      fc
        .tuple(sub, fc.oneof(fc.constantFrom(...PROPERTIES), sub), fc.boolean())
        .map(([object, property, optional]) => member(object, property, optional)),
      fc
        .tuple(fc.constantFrom('п9', 'п8'), sub, sub)
        .map(([name, body, argument]) => arrowCall(name, body, argument)),
      fc
        .array(sub, { minLength: 2, maxLength: 3 })
        .map(
          expressions => ({ type: 'SequenceExpression', expressions, ...at }) as SequenceExpression
        ),
    ];
    if (scope.functions.length > 0) {
      options.push(
        fc
          .tuple(fc.constantFrom(...scope.functions), fc.array(sub, { maxLength: 3 }), fc.boolean())
          .map(([fn, args, optional]) => call(identifier(fn.name), args, optional))
      );
    }
    if (scope.assignable.length > 0) {
      const target = fc.constantFrom(...scope.assignable).map(identifier);
      options.push(
        fc.tuple(target, fc.constantFrom(...ASSIGNMENT_OPERATORS), sub).map(
          ([left, operator, right]) =>
            ({
              type: 'AssignmentExpression',
              left,
              operator,
              right,
              ...at,
            }) as AssignmentExpression
        ),
        fc
          .tuple(target, fc.constantFrom('++', '--'), fc.boolean())
          .map(
            ([argument, operator, prefix]) =>
              ({ type: 'UpdateExpression', operator, argument, prefix, ...at }) as UpdateExpression
          )
      );
    }
    return {
      expression: fc.oneof({ maxDepth, depthIdentifier: 'expression' }, ...options),
    };
  });
  return expression;
}

function spread(argument: Expression): Expression {
  return { type: 'SpreadElement', argument, ...at } as SpreadElement;
}

function template(parts: string[], expressions: Expression[]): TemplateLiteral {
  const quasis = Array.from(
    { length: expressions.length + 1 },
    (_, index): TemplateElement => ({
      type: 'TemplateElement',
      value: { raw: templateRaw(parts[index] ?? ''), cooked: parts[index] ?? '' },
      tail: index === expressions.length,
      ...at,
    })
  );
  return { type: 'TemplateLiteral', quasis, expressions, ...at };
}

/** Template text as written: `\`, `` ` `` and `${` escaped, line breaks as `\n`. */
function templateRaw(cooked: string): string {
  return cooked
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${')
    .replace(/\n/g, '\\n');
}

/** `{ р0: …, "к л": …, х0 }`: a key that names a variable may be shorthand. */
function object(
  entries: Array<[string, Expression, boolean]>,
  variables: readonly string[]
): ObjectExpression {
  const keys = new Set<string>();
  const properties: Property[] = [];
  for (const [key, value, shorthand] of entries) {
    if (keys.has(key)) continue;
    keys.add(key);
    const isShorthand = shorthand && variables.includes(key);
    properties.push({
      type: 'Property',
      key: key === 'к л' ? stringLiteral(key) : identifier(key),
      value: isShorthand ? identifier(key) : value,
      computed: false,
      shorthand: isShorthand,
      ...at,
    });
  }
  return { type: 'ObjectExpression', properties, ...at };
}

function member(object: Expression, property: string | Expression, optional: boolean): Expression {
  const computed = typeof property !== 'string';
  return {
    type: 'MemberExpression',
    object,
    property: computed ? property : identifier(property),
    computed,
    ...(optional && { optional: true }),
    ...at,
  } as MemberExpression;
}

function call(callee: Expression, args: Expression[], optional: boolean): CallExpression {
  return {
    type: 'CallExpression',
    callee,
    arguments: args,
    ...(optional && { optional: true }),
    ...at,
  };
}

/** `((п9) => …)(…)`; the body may use `п9`. */
function arrowCall(name: string, body: Expression, argument: Expression): CallExpression {
  const usesParameter: Expression = {
    type: 'BinaryExpression',
    operator: '+',
    left: identifier(name),
    right: body,
    ...at,
  } as BinaryExpression;
  const arrow: ArrowFunctionExpression = {
    type: 'ArrowFunctionExpression',
    params: [parameter(name)],
    body: usesParameter,
    ...at,
  };
  return call(arrow, [argument], false);
}

// ---------------------------------------------------------------------------
// Statements and programs

interface Context {
  scope: Scope;
  depth: number;
  inFunction: boolean;
  /** Innermost loop: `барои` (may `давом`), `то` (may only `шикастан`) or none. */
  loop: 'for' | 'while' | undefined;
  inTry: boolean;
  /** Loop counters in use. */
  counters: number;
}

function statementsArbitrary(context: Context, maxLength = 4): fc.Arbitrary<Statement[]> {
  return fc.array(statementArbitrary(context), { minLength: 1, maxLength });
}

function statementArbitrary(context: Context): fc.Arbitrary<Statement> {
  const expression = expressionArbitrary(context.scope, context.depth > 1 ? 2 : 3);
  const options: Array<fc.Arbitrary<Statement>> = [
    fc.array(expression, { minLength: 1, maxLength: 2 }).map(print),
    expression.map(statement),
  ];
  if (context.depth > 0) {
    const inner = { ...context, depth: context.depth - 1 };
    const body = statementsArbitrary(inner, 3).map(block);
    options.push(
      fc.tuple(expression, body, fc.option(body)).map(
        ([test, consequent, alternate]) =>
          ({
            type: 'IfStatement',
            test,
            consequent,
            ...(alternate && { alternate }),
            ...at,
          }) as IfStatement
      ),
      forLoop(inner),
      whileLoop(inner),
      tryStatement(inner),
      switchStatement(inner, expression)
    );
  }
  if (context.loop) {
    options.push(fc.constant({ type: 'BreakStatement', ...at } as BreakStatement));
  }
  if (context.loop === 'for') {
    options.push(fc.constant({ type: 'ContinueStatement', ...at } as ContinueStatement));
  }
  if (context.inTry) {
    options.push(
      expression.map(argument => ({ type: 'ThrowStatement', argument, ...at }) as ThrowStatement)
    );
  }
  if (context.inFunction) {
    options.push(
      expression.map(argument => ({ type: 'ReturnStatement', argument, ...at }) as ReturnStatement)
    );
  }
  return fc.oneof(...options);
}

const withReadable = (scope: Scope, name: string): Scope => ({
  ...scope,
  readable: [...scope.readable, name],
});

/** `барои (тағ иN = 0; иN < К; иN++) { … }` */
function forLoop(context: Context): fc.Arbitrary<Statement> {
  const counter = `и${context.counters}`;
  const inner: Context = {
    ...context,
    scope: withReadable(context.scope, counter),
    loop: 'for',
    counters: context.counters + 1,
  };
  return fc.tuple(fc.integer({ min: 0, max: 3 }), statementsArbitrary(inner, 3)).map(
    ([count, body]) =>
      ({
        type: 'ForStatement',
        init: declaration('ТАҒЙИРЁБАНДА', counter, numberLiteral(0)),
        test: binary('<', identifier(counter), numberLiteral(count)),
        update: {
          type: 'UpdateExpression',
          operator: '++',
          argument: identifier(counter),
          prefix: false,
          ...at,
        } as UpdateExpression,
        body: block(body),
        ...at,
      }) as ForStatement
  );
}

/** `{ тағ иN = 0; то (иN < К) { …; иN++; } }` */
function whileLoop(context: Context): fc.Arbitrary<Statement> {
  const counter = `и${context.counters}`;
  const inner: Context = {
    ...context,
    scope: withReadable(context.scope, counter),
    loop: 'while',
    counters: context.counters + 1,
  };
  return fc
    .tuple(fc.integer({ min: 0, max: 3 }), statementsArbitrary(inner, 3))
    .map(([count, body]) =>
      block([
        declaration('ТАҒЙИРЁБАНДА', counter, numberLiteral(0)),
        {
          type: 'WhileStatement',
          test: binary('<', identifier(counter), numberLiteral(count)),
          body: block([
            ...body,
            statement({
              type: 'UpdateExpression',
              operator: '++',
              argument: identifier(counter),
              prefix: false,
              ...at,
            } as UpdateExpression),
          ]),
          ...at,
        } as WhileStatement,
      ])
    );
}

/** `кӯшиш { … } гирифтан (хт) { чоп.сабт(`${хт}`); } ниҳоят { … }` */
function tryStatement(context: Context): fc.Arbitrary<Statement> {
  const body = statementsArbitrary({ ...context, inTry: true }, 3);
  const handler = statementsArbitrary({ ...context, scope: withReadable(context.scope, 'хт') }, 2);
  return fc.tuple(body, fc.option(handler), fc.option(statementsArbitrary(context, 2))).map(
    ([tried, caught, finalizer]) =>
      ({
        type: 'TryStatement',
        block: block(tried),
        ...((caught || !finalizer) && {
          handler: {
            type: 'CatchClause',
            param: identifier('хт'),
            body: block([print([template(['хато: ', ''], [identifier('хт')])]), ...(caught ?? [])]),
            ...at,
          },
        }),
        ...(finalizer && { finalizer: block(finalizer) }),
        ...at,
      }) as TryStatement
  );
}

function switchStatement(
  context: Context,
  expression: fc.Arbitrary<Expression>
): fc.Arbitrary<Statement> {
  const caseBody = statementsArbitrary({ ...context, loop: context.loop ?? undefined }, 2);
  return fc
    .tuple(
      expression,
      fc.array(fc.tuple(literal, caseBody, fc.boolean()), { minLength: 1, maxLength: 3 }),
      fc.option(caseBody)
    )
    .map(([discriminant, entries, fallback]) => {
      const cases: SwitchCase[] = entries.map(([test, consequent, breaks]) => ({
        type: 'SwitchCase',
        test,
        consequent: breaks
          ? [...consequent, { type: 'BreakStatement', ...at } as BreakStatement]
          : consequent,
        ...at,
      }));
      if (fallback) cases.push({ type: 'SwitchCase', consequent: fallback, ...at });
      return { type: 'SwitchStatement', discriminant, cases, ...at } as SwitchStatement;
    });
}

function binary(operator: string, left: Expression, right: Expression): BinaryExpression {
  return { type: 'BinaryExpression', operator, left, right, ...at };
}

function declaration(
  kind: VariableDeclaration['kind'],
  name: string,
  init: Expression
): VariableDeclaration {
  return { type: 'VariableDeclaration', kind, identifier: identifier(name), init, ...at };
}

/**
 * Programs: the variables `х0`…`х3` with literal values, up to two
 * functions, then statements that print what they compute.
 */
export function programArbitrary(maxDepth = 2): fc.Arbitrary<Program> {
  const values = fc.array(expressionArbitrary({ readable: [], assignable: [], functions: [] }, 2), {
    minLength: VARIABLES.length,
    maxLength: VARIABLES.length,
  });
  const functionArbitrary = (
    index: number,
    assignable: string[]
  ): fc.Arbitrary<FunctionDeclaration> => {
    const params = index === 0 ? ['п0'] : ['п0', 'п1'];
    const scope: Scope = {
      readable: [...VARIABLES, ...params],
      assignable,
      functions: index === 0 ? [] : [{ name: 'ф0', arity: 1 }],
    };
    const context: Context = {
      scope,
      depth: 1,
      inFunction: true,
      loop: undefined,
      inTry: false,
      counters: 0,
    };
    return fc
      .tuple(statementsArbitrary(context, 3), expressionArbitrary(scope, 2))
      .map(([body, result]) => ({
        type: 'FunctionDeclaration',
        name: identifier(`ф${index}`),
        params: params.map(parameter),
        body: block([
          ...body,
          { type: 'ReturnStatement', argument: result, ...at } as ReturnStatement,
        ]),
        ...at,
      }));
  };
  return fc
    .tuple(values, fc.integer({ min: 0, max: 2 }), fc.boolean())
    .chain(([initial, functionCount, constants]) => {
      // With `constants`, х2 and х3 are `собит` and never assigned
      const assignable = constants ? VARIABLES.slice(0, 2) : VARIABLES;
      const functions = Array.from({ length: functionCount }, (_, index) => ({
        name: `ф${index}`,
        arity: index === 0 ? 1 : 2,
      }));
      const context: Context = {
        scope: { readable: VARIABLES, assignable, functions },
        depth: maxDepth,
        inFunction: false,
        loop: undefined,
        inTry: false,
        counters: 0,
      };
      return fc
        .tuple(
          fc.tuple(...functions.map((_, index) => functionArbitrary(index, assignable))),
          statementsArbitrary(context, 5)
        )
        .map(([declarations, body]): Program => {
          const variables = initial.map((value, index) =>
            declaration(constants && index >= 2 ? 'СОБИТ' : 'ТАҒЙИРЁБАНДА', VARIABLES[index], value)
          );
          return {
            type: 'Program',
            body: [...variables, ...declarations, ...body, print(VARIABLES.map(identifier))],
            ...at,
          };
        });
    });
}

// ---------------------------------------------------------------------------
// Printer: AST → SomonScript

/** Binding strength of binary operators, as in JavaScript. */
const PRECEDENCE: Readonly<Record<string, number>> = {
  '??': 4,
  '||': 5,
  '&&': 6,
  '|': 7,
  '^': 8,
  '&': 9,
  '==': 10,
  '!=': 10,
  '===': 10,
  '!==': 10,
  '<': 11,
  '>': 11,
  '<=': 11,
  '>=': 11,
  in: 11,
  instanceof: 11,
  '<<': 12,
  '>>': 12,
  '>>>': 12,
  '+': 13,
  '-': 13,
  '*': 14,
  '/': 14,
  '%': 14,
  '**': 15,
};

const UNARY = 16;
const POSTFIX = 17;
const CALL = 18;
const PRIMARY = 19;

function precedence(node: Expression): number {
  switch (node.type) {
    case 'SequenceExpression':
      return 1;
    case 'AssignmentExpression':
    case 'ArrowFunctionExpression':
      return 2;
    case 'ConditionalExpression':
      return 3;
    case 'BinaryExpression':
      return PRECEDENCE[(node as BinaryExpression).operator];
    case 'UnaryExpression':
      return UNARY;
    case 'UpdateExpression':
      return (node as UpdateExpression).prefix ? UNARY : POSTFIX;
    case 'CallExpression':
    case 'MemberExpression':
      return CALL;
    default:
      return PRIMARY;
  }
}

const KEYWORD_OPERATORS: Readonly<Record<string, string>> = { typeof: 'навъи', in: 'дар' };

/** A `<` or `<<` comparison, which a later `>` could close as type arguments. */
function opensTypeArguments(node: Expression): boolean {
  return (
    node.type === 'BinaryExpression' && ['<', '<<'].includes((node as BinaryExpression).operator)
  );
}

/** The expression a statement's source starts with (`а` in `а.б()`, `а + б`). */
function leftmost(node: Expression): Expression {
  switch (node.type) {
    case 'MemberExpression':
      return leftmost((node as MemberExpression).object);
    case 'CallExpression':
      return leftmost((node as CallExpression).callee);
    case 'BinaryExpression':
    case 'AssignmentExpression':
      return leftmost((node as BinaryExpression).left);
    case 'ConditionalExpression':
      return leftmost((node as ConditionalExpression).test);
    case 'SequenceExpression':
      return leftmost((node as SequenceExpression).expressions[0]);
    case 'UpdateExpression':
      return (node as UpdateExpression).prefix
        ? node
        : leftmost((node as UpdateExpression).argument);
    default:
      return node;
  }
}

/**
 * Writes an AST as SomonScript. `noise` (numbers, e.g. from fast-check)
 * adds line breaks after commas, operators and `{`, blank lines, double
 * spaces and comments where they cannot change the program; without it the
 * output is in one canonical layout.
 */
export class Printer {
  private index = 0;
  /** Expressions that need parentheses whatever their precedence. */
  private readonly parenthesized = new Set<Expression>();

  constructor(private readonly noise: readonly number[] = []) {}

  /** A choice among `count` (0 without noise). */
  private choose(count: number): number {
    if (this.noise.length === 0) return 0;
    return this.noise[this.index++ % this.noise.length] % count;
  }

  /** What may follow a comma or an operator: a space, a line break or a comment. */
  private gap(indent: string): string {
    return [' ', `\n${indent}    `, '  ', ' /* и */ ', ' ', ' ', ' ', ' '][this.choose(8)];
  }

  program(program: Program): string {
    return `${this.statements(program.body, '')}\n`;
  }

  private statements(body: Statement[], indent: string): string {
    return body
      .map(stmt => {
        const before = ['', '', '', `\n`, `${indent}// изоҳ\n`][this.choose(5)];
        return `${before}${indent}${this.statement(stmt, indent)}`;
      })
      .join('\n');
  }

  private block(node: Statement | undefined, indent: string): string {
    const { body } = node as BlockStatement;
    if (body.length === 0) return '{}';
    return `{\n${this.statements(body, `${indent}    `)}\n${indent}}`;
  }

  private statement(node: Statement, indent: string): string {
    const print = this.statementPrinters[node.type];
    if (!print) throw new Error(`cannot print ${node.type}`);
    return print(node as never, indent);
  }

  // Each statement type, as SomonScript
  private readonly statementPrinters: Readonly<
    Record<string, (node: never, indent: string) => string>
  > = {
    VariableDeclaration: (node: VariableDeclaration, indent) => {
      const kind = node.kind === 'СОБИТ' ? 'собит' : 'тағ';
      const name = (node.identifier as Identifier).name;
      return `${kind} ${name} = ${this.expression(node.init!, 2, indent)};`;
    },
    FunctionDeclaration: (node: FunctionDeclaration, indent) => {
      const params = node.params.map(param => param.name.name).join(', ');
      return `функсия ${node.name.name}(${params}) ${this.block(node.body, indent)}`;
    },
    ExpressionStatement: (node: ExpressionStatement, indent) => {
      // An object literal first would start a block: `({ … }).х;`
      const first = leftmost(node.expression);
      if (first.type === 'ObjectExpression') this.parenthesized.add(first);
      return `${this.expression(node.expression, 1, indent)};`;
    },
    ReturnStatement: (node: ReturnStatement, indent) =>
      `бозгашт ${this.expression(node.argument!, 1, indent)};`,
    ThrowStatement: (node: ThrowStatement, indent) =>
      `партофтан ${this.expression(node.argument, 1, indent)};`,
    BreakStatement: () => 'шикастан;',
    ContinueStatement: () => 'давом;',
    BlockStatement: (node: BlockStatement, indent) => this.block(node, indent),
    IfStatement: (node: IfStatement, indent) => {
      const alternate = node.alternate ? ` вагарна ${this.block(node.alternate, indent)}` : '';
      const test = this.expression(node.test, 1, indent);
      return `агар (${test}) ${this.block(node.consequent, indent)}${alternate}`;
    },
    ForStatement: (node: ForStatement, indent) => {
      const init = this.statement(node.init!, indent).slice(0, -1);
      const test = this.expression(node.test!, 1, indent);
      const update = this.expression(node.update!, 1, indent);
      return `барои (${init}; ${test}; ${update}) ${this.block(node.body, indent)}`;
    },
    WhileStatement: (node: WhileStatement, indent) =>
      `то (${this.expression(node.test, 1, indent)}) ${this.block(node.body, indent)}`,
    TryStatement: (node: TryStatement, indent) => {
      const handler = node.handler
        ? ` гирифтан (${node.handler.param!.name}) ${this.block(node.handler.body, indent)}`
        : '';
      const finalizer = node.finalizer ? ` ниҳоят ${this.block(node.finalizer, indent)}` : '';
      return `кӯшиш ${this.block(node.block, indent)}${handler}${finalizer}`;
    },
    SwitchStatement: (node: SwitchStatement, indent) => {
      const inner = `${indent}    `;
      const cases = node.cases.map(clause => {
        const head = clause.test ? `ҳолат ${this.expression(clause.test, 1, indent)}:` : 'пешфарз:';
        return `${inner}${head}\n${this.statements(clause.consequent, `${inner}    `)}`;
      });
      const discriminant = this.expression(node.discriminant, 1, indent);
      return `интихоб (${discriminant}) {\n${cases.join('\n')}\n${indent}}`;
    },
  };

  /** `node` as source, in parentheses when it binds less tightly than `min`. */
  expression(node: Expression, min: number, indent = ''): string {
    const print = this.expressionPrinters[node.type];
    if (!print) throw new Error(`cannot print ${node.type}`);
    const code = print(node as never, indent);
    return precedence(node) < min || this.parenthesized.has(node) ? `(${code})` : code;
  }

  /**
   * Elements of a list (arguments, array elements, a sequence). A `<`
   * comparison before a later element is parenthesized: unparenthesized,
   * `ф(а < б, в > (г))` is a generic call in SomonScript and TypeScript.
   */
  private list(items: Expression[], indent: string): string {
    return items
      .map((item, index) =>
        index < items.length - 1 && opensTypeArguments(item)
          ? `(${this.expression(item, 1, indent)})`
          : this.expression(item, 2, indent)
      )
      .join(`,${this.gap(indent)}`);
  }

  /** An operand of a binary operator; `??` and `||`/`&&` do not mix without parentheses. */
  private operand(parent: string, child: Expression, min: number, indent: string): string {
    const nullish = ['??', '||', '&&'];
    const operator = child.type === 'BinaryExpression' ? (child as BinaryExpression).operator : '';
    const mixes =
      nullish.includes(operator) &&
      nullish.includes(parent) &&
      (parent === '??') !== (operator === '??');
    return mixes ? `(${this.expression(child, 1, indent)})` : this.expression(child, min, indent);
  }

  private binary(node: BinaryExpression, indent: string): string {
    const { operator, left, right } = node;
    const own = PRECEDENCE[operator];
    const exponent = operator === '**';
    // `(а < б) > (в)`, not the call `а<б>(в)`
    const leftText =
      operator === '>' && opensTypeArguments(left)
        ? `(${this.expression(left, 1, indent)})`
        : this.operand(operator, left, exponent ? POSTFIX : own, indent);
    const rightText = this.operand(operator, right, exponent ? own : own + 1, indent);
    const word = KEYWORD_OPERATORS[operator] ?? operator;
    return `${leftText} ${word}${this.gap(indent)}${rightText}`;
  }

  private unary(node: UnaryExpression, indent: string): string {
    const { operator, argument } = node;
    const operand = this.expression(argument, UNARY, indent);
    const signed = /^[-+]/.test(operand);
    // `навъи` is also a name: `навъи -х` subtracts, `навъи (-х)` is typeof
    if (operator === 'typeof') return `навъи ${signed ? `(${operand})` : operand}`;
    if (operator === 'void') return `void ${operand}`;
    // `- -х`, not the decrement `--х`
    return signed && (operator === '-' || operator === '+')
      ? `${operator} ${operand}`
      : `${operator}${operand}`;
  }

  private object(node: ObjectExpression, indent: string): string {
    const properties = node.properties.map(property => {
      const { key, value, shorthand } = property as Property;
      if (shorthand) return (key as Identifier).name;
      const name =
        key.type === 'Identifier'
          ? (key as Identifier).name
          : JSON.stringify((key as Literal).value);
      return `${name}: ${this.expression(value, 2, indent)}`;
    });
    return properties.length === 0 ? '{}' : `{ ${properties.join(`,${this.gap(indent)}`)} }`;
  }

  private member(node: MemberExpression, indent: string): string {
    const { object, property, computed, optional } = node;
    const isNumber = object.type === 'Literal' && typeof (object as Literal).value === 'number';
    const target = isNumber
      ? `(${this.expression(object, 1, indent)})`
      : this.expression(object, CALL, indent);
    const dot = optional ? '?.' : '';
    return computed
      ? `${target}${dot}[${this.expression(property, 1, indent)}]`
      : `${target}${dot || '.'}${(property as Identifier).name}`;
  }

  // Each expression type, as SomonScript (without parentheses around it)
  private readonly expressionPrinters: Readonly<
    Record<string, (node: never, indent: string) => string>
  > = {
    Identifier: (node: Identifier) => node.name,
    Literal: (node: Literal) => literalText(node),
    TemplateLiteral: (node: TemplateLiteral, indent) => {
      const parts = node.quasis.map((quasi, index) =>
        index < node.expressions.length
          ? `${quasi.value.raw}\${${this.expression(node.expressions[index], 1, indent)}}`
          : quasi.value.raw
      );
      return `\`${parts.join('')}\``;
    },
    BinaryExpression: (node: BinaryExpression, indent) => this.binary(node, indent),
    UnaryExpression: (node: UnaryExpression, indent) => this.unary(node, indent),
    UpdateExpression: (node: UpdateExpression) => {
      const operand = (node.argument as Identifier).name;
      return node.prefix ? `${node.operator}${operand}` : `${operand}${node.operator}`;
    },
    AssignmentExpression: (node: AssignmentExpression, indent) =>
      `${(node.left as Identifier).name} ${node.operator} ${this.expression(node.right, 2, indent)}`,
    ConditionalExpression: (node: ConditionalExpression, indent) =>
      `${this.expression(node.test, 4, indent)} ? ${this.expression(node.consequent, 2, indent)} : ${this.expression(node.alternate, 2, indent)}`,
    SequenceExpression: (node: SequenceExpression, indent) => this.list(node.expressions, indent),
    ArrayExpression: (node: ArrayExpression, indent) => `[${this.list(node.elements, indent)}]`,
    SpreadElement: (node: SpreadElement, indent) =>
      `...${this.expression(node.argument, 2, indent)}`,
    ObjectExpression: (node: ObjectExpression, indent) => this.object(node, indent),
    MemberExpression: (node: MemberExpression, indent) => this.member(node, indent),
    CallExpression: (node: CallExpression, indent) =>
      `${this.expression(node.callee, CALL, indent)}${node.optional ? '?.' : ''}(${this.list(node.arguments, indent)})`,
    ArrowFunctionExpression: (node: ArrowFunctionExpression, indent) => {
      const body = node.body as Expression;
      const text = this.expression(body, 2, indent);
      const params = node.params.map(param => param.name.name).join(', ');
      return `(${params}) => ${body.type === 'ObjectExpression' ? `(${text})` : text}`;
    },
  };
}

function literalText(node: Literal): string {
  if (node.value === null) return 'холӣ';
  if (typeof node.value === 'boolean') return node.value ? 'дуруст' : 'нодуруст';
  if (typeof node.value === 'number') return String(node.value);
  return JSON.stringify(node.value);
}

/** A program as SomonScript source (with random layout when `noise` is given). */
export function printProgram(program: Program, noise: readonly number[] = []): string {
  return new Printer(noise).program(program);
}

/** A generated program and its source; fast-check reports a counterexample as the source. */
export interface GeneratedProgram {
  ast: Program;
  source: string;
}

export function generatedProgram(maxDepth = 2): fc.Arbitrary<GeneratedProgram> {
  return programArbitrary(maxDepth).map(ast => {
    const source = printProgram(ast);
    return Object.assign({ ast, source }, { [fc.toStringMethod]: () => `\n${source}` });
  });
}

// ---------------------------------------------------------------------------
// Canonical forms

/** Names the JavaScript output spells differently. */
const NAMES: Readonly<Record<string, string>> = { чоп: 'console', беқимат: 'undefined' };

const list = (items: string[]): string => items.join(' ');

/** Flattens `а, б, в` into one sequence. */
function sequence(items: string[]): string {
  return `(seq ${list(items.map(item => (item.startsWith('(seq ') ? item.slice(5, -1) : item)))})`;
}

/**
 * The canonical form of a SomonScript AST: an S-expression without
 * positions, parentheses or spelling, with names as the JavaScript output
 * has them (`чоп.сабт` → `console.log`).
 */
export function canonicalSomon(node: unknown): string {
  if (node === null || node === undefined) return '_';
  const typed = node as ASTNode;
  const canonical = SOMON_FORMS[typed.type];
  return canonical ? canonical(typed as never) : `(?${typed.type})`;
}

const c = canonicalSomon;

const kindOf = (kind: unknown): string => (kind === 'СОБИТ' ? 'const' : 'let');

const declarator = (decl: VariableDeclaration): string => `(${c(decl.identifier)} ${c(decl.init)})`;

const paramsOf = (params: Parameter[]): string => list(params.map(param => c(param.name)));

const blockOf = (body: Statement[]): string =>
  `(block ${list(body.filter(stmt => stmt.type !== 'EmptyStatement').map(c))})`;

/** The canonical form of each SomonScript node type. */
const SOMON_FORMS: Readonly<Record<string, (node: never) => string>> = {
  Program: (node: Program) => blockOf(node.body),
  BlockStatement: (node: BlockStatement) => blockOf(node.body),
  VariableDeclaration: (node: VariableDeclaration) => `(${kindOf(node.kind)} ${declarator(node)})`,
  VariableDeclarationList: (node: VariableDeclarationList) =>
    `(${kindOf(node.kind)} ${list(node.declarations.map(declarator))})`,
  FunctionDeclaration: (node: FunctionDeclaration) =>
    `(function ${c(node.name)} (${paramsOf(node.params)}) ${c(node.body)})`,
  // `(о?.а);`: parentheses around a whole statement change nothing
  ExpressionStatement: (node: ExpressionStatement) => {
    const expression = node.expression as ChainExpression;
    return `(expr ${c(expression.type === 'ChainExpression' ? expression.expression : expression)})`;
  },
  ReturnStatement: (node: ReturnStatement) => `(return ${c(node.argument)})`,
  ThrowStatement: (node: ThrowStatement) => `(throw ${c(node.argument)})`,
  BreakStatement: () => '(break)',
  ContinueStatement: () => '(continue)',
  IfStatement: (node: IfStatement) =>
    `(if ${c(node.test)} ${c(node.consequent)} ${c(node.alternate)})`,
  ForStatement: (node: ForStatement) =>
    `(for ${c(node.init)} ${c(node.test)} ${c(node.update)} ${c(node.body)})`,
  WhileStatement: (node: WhileStatement) => `(while ${c(node.test)} ${c(node.body)})`,
  TryStatement: (node: TryStatement) => {
    const caught = node.handler ? `(catch ${c(node.handler.param)} ${c(node.handler.body)})` : '_';
    return `(try ${c(node.block)} ${caught} ${c(node.finalizer)})`;
  },
  SwitchStatement: (node: SwitchStatement) => {
    const cases = node.cases.map(
      clause => `(case ${c(clause.test)} ${list(clause.consequent.map(c))})`
    );
    return `(switch ${c(node.discriminant)} ${list(cases)})`;
  },
  Identifier: (node: Identifier) => NAMES[node.name] ?? node.name,
  Literal: (node: Literal) => canonicalValue(node.value),
  TemplateLiteral: (node: TemplateLiteral) => {
    const parts = node.quasis.flatMap((quasi, index) => [
      JSON.stringify(quasi.value.cooked),
      ...(index < node.expressions.length ? [c(node.expressions[index])] : []),
    ]);
    return `(template ${list(parts)})`;
  },
  BinaryExpression: (node: BinaryExpression) =>
    `(${node.operator} ${c(node.left)} ${c(node.right)})`,
  AssignmentExpression: (node: AssignmentExpression) =>
    `(${node.operator} ${c(node.left)} ${c(node.right)})`,
  UnaryExpression: (node: UnaryExpression) => `(u${node.operator} ${c(node.argument)})`,
  UpdateExpression: (node: UpdateExpression) =>
    `(${node.prefix ? 'pre' : 'post'}${node.operator} ${c(node.argument)})`,
  ConditionalExpression: (node: ConditionalExpression) =>
    `(? ${c(node.test)} ${c(node.consequent)} ${c(node.alternate)})`,
  SequenceExpression: (node: SequenceExpression) => sequence(node.expressions.map(c)),
  CallExpression: (node: CallExpression) =>
    `(call${node.optional ? '?' : ''} ${c(node.callee)} ${list(node.arguments.map(c))})`,
  MemberExpression: (node: MemberExpression) => {
    const optional = node.optional ? '?' : '';
    return node.computed
      ? `(index${optional} ${c(node.object)} ${c(node.property)})`
      : `(get${optional} ${c(node.object)} ${translateMemberName((node.property as Identifier).name)})`;
  },
  ArrayExpression: (node: ArrayExpression) => `(array ${list(node.elements.map(c))})`,
  SpreadElement: (node: SpreadElement) => `(spread ${c(node.argument)})`,
  ObjectExpression: (node: ObjectExpression) => {
    const properties = (node.properties as Property[]).map(property => {
      const key =
        property.key.type === 'Identifier'
          ? translateMemberName((property.key as Identifier).name)
          : String((property.key as Literal).value);
      return `(prop ${JSON.stringify(key)} ${c(property.value)})`;
    });
    return `(object ${list(properties)})`;
  },
  ArrowFunctionExpression: (node: ArrowFunctionExpression) =>
    `(arrow (${paramsOf(node.params)}) ${c(node.body)})`,
};

function canonicalValue(value: string | number | boolean | null | undefined): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'number') return `(num ${value})`;
  if (typeof value === 'string') return JSON.stringify(value);
  return String(value);
}

/**
 * The canonical form of a TypeScript AST, in the terms of
 * {@link canonicalSomon}: the JavaScript and TypeScript the compiler prints
 * must come out as the SomonScript they were printed from.
 */
export function canonicalTypeScript(node: ts.Node | undefined): string {
  if (!node) return '_';
  if (ts.isParenthesizedExpression(node)) return canonicalTypeScript(node.expression);
  for (const [matches, canonical] of TYPESCRIPT_FORMS) {
    if (matches(node)) return canonical(node as never);
  }
  return `(?${ts.SyntaxKind[node.kind]})`;
}

const t = canonicalTypeScript;
const all = (nodes: readonly ts.Node[]): string => list(nodes.map(t));
const question = (token: ts.Node | undefined): string => (token ? '?' : '');

function variableList(node: ts.VariableDeclarationList): string {
  const kind = node.flags & ts.NodeFlags.Const ? 'const' : 'let';
  return `(${kind} ${list(node.declarations.map(d => `(${t(d.name)} ${t(d.initializer)})`))})`;
}

function binaryForm(node: ts.BinaryExpression): string {
  const operator = ts.tokenToString(node.operatorToken.kind)!;
  if (operator === ',') return sequence([t(node.left), t(node.right)]);
  return `(${operator} ${t(node.left)} ${t(node.right)})`;
}

function prefixForm(node: ts.PrefixUnaryExpression): string {
  const operator = ts.tokenToString(node.operator)!;
  return operator === '++' || operator === '--'
    ? `(pre${operator} ${t(node.operand)})`
    : `(u${operator} ${t(node.operand)})`;
}

function templateForm(node: ts.TemplateExpression): string {
  const parts = [
    JSON.stringify(node.head.text),
    ...node.templateSpans.flatMap(span => [t(span.expression), JSON.stringify(span.literal.text)]),
  ];
  return `(template ${list(parts)})`;
}

function objectForm(node: ts.ObjectLiteralExpression): string {
  const properties = node.properties.map(property => {
    if (ts.isShorthandPropertyAssignment(property)) {
      return `(prop ${JSON.stringify(property.name.text)} ${property.name.text})`;
    }
    if (ts.isPropertyAssignment(property)) {
      const name =
        ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)
          ? property.name.text
          : property.name.getText();
      return `(prop ${JSON.stringify(name)} ${t(property.initializer)})`;
    }
    return `(?${ts.SyntaxKind[property.kind]})`;
  });
  return `(object ${list(properties)})`;
}

function tryForm(node: ts.TryStatement): string {
  const clause = node.catchClause;
  const caught = clause ? `(catch ${t(clause.variableDeclaration?.name)} ${t(clause.block)})` : '_';
  return `(try ${t(node.tryBlock)} ${caught} ${t(node.finallyBlock)})`;
}

function switchForm(node: ts.SwitchStatement): string {
  const cases = node.caseBlock.clauses.map(
    clause =>
      `(case ${ts.isCaseClause(clause) ? t(clause.expression) : '_'} ${all(clause.statements)})`
  );
  return `(switch ${t(node.expression)} ${list(cases)})`;
}

const keyword =
  (kind: ts.SyntaxKind) =>
  (node: ts.Node): boolean =>
    node.kind === kind;

/** The canonical form of each TypeScript node kind, by its type guard. */
const TYPESCRIPT_FORMS: ReadonlyArray<[(node: ts.Node) => boolean, (node: never) => string]> = [
  [
    ts.isSourceFile,
    (node: ts.SourceFile) => `(block ${all(node.statements.filter(s => !ts.isEmptyStatement(s)))})`,
  ],
  [
    ts.isBlock,
    (node: ts.Block) => `(block ${all(node.statements.filter(s => !ts.isEmptyStatement(s)))})`,
  ],
  [ts.isVariableStatement, (node: ts.VariableStatement) => variableList(node.declarationList)],
  [ts.isVariableDeclarationList, variableList],
  [
    ts.isFunctionDeclaration,
    (node: ts.FunctionDeclaration) =>
      `(function ${t(node.name)} (${all(node.parameters.map(p => p.name))}) ${t(node.body)})`,
  ],
  [ts.isExpressionStatement, (node: ts.ExpressionStatement) => `(expr ${t(node.expression)})`],
  [ts.isReturnStatement, (node: ts.ReturnStatement) => `(return ${t(node.expression)})`],
  [ts.isThrowStatement, (node: ts.ThrowStatement) => `(throw ${t(node.expression)})`],
  [ts.isBreakStatement, () => '(break)'],
  [ts.isContinueStatement, () => '(continue)'],
  [
    ts.isIfStatement,
    (node: ts.IfStatement) =>
      `(if ${t(node.expression)} ${t(node.thenStatement)} ${t(node.elseStatement)})`,
  ],
  [
    ts.isForStatement,
    (node: ts.ForStatement) =>
      `(for ${t(node.initializer)} ${t(node.condition)} ${t(node.incrementor)} ${t(node.statement)})`,
  ],
  [
    ts.isWhileStatement,
    (node: ts.WhileStatement) => `(while ${t(node.expression)} ${t(node.statement)})`,
  ],
  [ts.isTryStatement, tryForm],
  [ts.isSwitchStatement, switchForm],
  [ts.isIdentifier, (node: ts.Identifier) => node.text],
  [ts.isNumericLiteral, (node: ts.NumericLiteral) => `(num ${Number(node.text)})`],
  [ts.isStringLiteral, (node: ts.StringLiteral) => JSON.stringify(node.text)],
  [keyword(ts.SyntaxKind.TrueKeyword), () => 'true'],
  [keyword(ts.SyntaxKind.FalseKeyword), () => 'false'],
  [keyword(ts.SyntaxKind.NullKeyword), () => 'null'],
  [
    ts.isNoSubstitutionTemplateLiteral,
    (node: ts.NoSubstitutionTemplateLiteral) => `(template ${JSON.stringify(node.text)})`,
  ],
  [ts.isTemplateExpression, templateForm],
  [ts.isBinaryExpression, binaryForm],
  [ts.isPrefixUnaryExpression, prefixForm],
  [
    ts.isPostfixUnaryExpression,
    (node: ts.PostfixUnaryExpression) =>
      `(post${ts.tokenToString(node.operator)!} ${t(node.operand)})`,
  ],
  [ts.isTypeOfExpression, (node: ts.TypeOfExpression) => `(utypeof ${t(node.expression)})`],
  [ts.isVoidExpression, (node: ts.VoidExpression) => `(uvoid ${t(node.expression)})`],
  [
    ts.isConditionalExpression,
    (node: ts.ConditionalExpression) =>
      `(? ${t(node.condition)} ${t(node.whenTrue)} ${t(node.whenFalse)})`,
  ],
  [
    ts.isCallExpression,
    (node: ts.CallExpression) =>
      `(call${question(node.questionDotToken)} ${t(node.expression)} ${all(node.arguments)})`,
  ],
  [
    ts.isPropertyAccessExpression,
    (node: ts.PropertyAccessExpression) =>
      `(get${question(node.questionDotToken)} ${t(node.expression)} ${node.name.text})`,
  ],
  [
    ts.isElementAccessExpression,
    (node: ts.ElementAccessExpression) =>
      `(index${question(node.questionDotToken)} ${t(node.expression)} ${t(node.argumentExpression)})`,
  ],
  [
    ts.isArrayLiteralExpression,
    (node: ts.ArrayLiteralExpression) => `(array ${all(node.elements)})`,
  ],
  [ts.isSpreadElement, (node: ts.SpreadElement) => `(spread ${t(node.expression)})`],
  [ts.isObjectLiteralExpression, objectForm],
  [
    ts.isArrowFunction,
    (node: ts.ArrowFunction) =>
      `(arrow (${all(node.parameters.map(p => p.name))}) ${t(node.body)})`,
  ],
];

/**
 * Whether TypeScript reads type arguments into code that has none: in
 * TypeScript (and in SomonScript once the parser reads call type arguments)
 * `а < б > (в)`, `ф(а < б, в > (г))` and `а << (б > (в))` are generic calls,
 * while JavaScript compares. Generated programs never have type arguments.
 */
export function readsTypeArguments(code: string): boolean {
  const file = ts.createSourceFile('main.ts', code, ts.ScriptTarget.Latest, true);
  let found = false;
  const visit = (node: ts.Node): void => {
    if (
      ((ts.isCallExpression(node) || ts.isNewExpression(node)) && node.typeArguments) ||
      ts.isTaggedTemplateExpression(node) ||
      ts.isExpressionWithTypeArguments(node)
    ) {
      found = true;
    }
    if (!found) ts.forEachChild(node, visit);
  };
  visit(file);
  return found;
}

/** Parses JavaScript or TypeScript into its canonical form. */
export function canonicalCode(code: string, fileName: 'main.js' | 'main.ts'): string {
  const file = ts.createSourceFile(fileName, code, ts.ScriptTarget.Latest, true);
  const diagnostics = (file as unknown as { parseDiagnostics: ts.Diagnostic[] }).parseDiagnostics;
  if (diagnostics.length > 0) {
    return `(syntax-error ${diagnostics.map(d => ts.flattenDiagnosticMessageText(d.messageText, ' ')).join('; ')})`;
  }
  return canonicalTypeScript(file);
}

// ---------------------------------------------------------------------------
// Arbitrary input for the lexer and parser

/** Words and symbols of the language, for token soup. */
const VOCABULARY = [
  'тағ',
  'собит',
  'функсия',
  'агар',
  'вагарна',
  'барои',
  'то',
  'кун',
  'бозгашт',
  'синф',
  'мерос',
  'нав',
  'ин',
  'супер',
  'дуруст',
  'нодуруст',
  'холӣ',
  'беқимат',
  'ворид',
  'содир',
  'аз',
  'дар',
  'чун',
  'пешфарз',
  'интерфейс',
  'навъ',
  'навъи',
  'шумориш',
  'номфазо',
  'эълон',
  'мавҳум',
  'статикӣ',
  'хосусӣ',
  'танҳохонӣ',
  'ҳамзамон',
  'интизор',
  'ҳосил',
  'кӯшиш',
  'гирифтан',
  'ниҳоят',
  'партофтан',
  'интихоб',
  'ҳолат',
  'шикастан',
  'давом',
  'истифода',
  'бознавис',
  'дастрасӣ',
  'рақам',
  'сатр',
  'мантиқӣ',
  'ҳар',
  'х',
  'у',
  'Т',
  'чоп',
  'сабт',
  '#х',
  '@д',
  '0',
  '1.5',
  '0x1F',
  '1_000',
  '10n',
  '"сатр"',
  "'а'",
  '`а${',
  '}`',
  '`',
  '/а+/g',
  '//',
  '/*',
  '*/',
  '\n',
  ' ',
  '(',
  ')',
  '{',
  '}',
  '[',
  ']',
  '<',
  '>',
  '<=',
  '>=',
  '=>',
  '=',
  '==',
  '===',
  '!',
  '!=',
  '?',
  '?.',
  '??',
  '??=',
  ':',
  ';',
  ',',
  '.',
  '...',
  '+',
  '++',
  '-',
  '--',
  '*',
  '**',
  '/',
  '%',
  '&',
  '&&',
  '|',
  '||',
  '^',
  '~',
  '<<',
  '>>',
  '>>>',
  '\\',
  '#!',
];

/** Random sequences of the language's tokens, with or without spaces between them. */
export const tokenSoup: fc.Arbitrary<string> = fc
  .array(fc.tuple(fc.constantFrom(...VOCABULARY), fc.constantFrom('', ' ', '\n')), {
    maxLength: 40,
  })
  .map(tokens => tokens.map(([token, space]) => token + space).join(''));

/** A valid program with a few characters deleted, duplicated or replaced. */
export const brokenProgram: fc.Arbitrary<string> = fc
  .tuple(
    programArbitrary(1),
    fc.array(
      fc.tuple(
        fc.nat(),
        fc.constantFrom('delete', 'duplicate', 'insert'),
        fc.constantFrom(...VOCABULARY)
      ),
      { minLength: 1, maxLength: 4 }
    )
  )
  .map(([program, edits]) => {
    let source = printProgram(program);
    for (const [position, edit, token] of edits) {
      const index = position % (source.length + 1);
      if (edit === 'delete') source = source.slice(0, index) + source.slice(index + 1);
      else if (edit === 'duplicate')
        source = source.slice(0, index) + source.slice(index, index + 3) + source.slice(index);
      else source = source.slice(0, index) + token + source.slice(index);
    }
    return source;
  });

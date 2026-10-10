/**
 * Conditions that their syntax alone decides, which TypeScript reports since
 * 5.6 whatever the types say: the left operand of `??` that is never nullish
 * (TS2869, `0 ?? 4`) or always is (TS2871, `холӣ ?? 1`), and a condition that
 * is always truthy (TS2872, `агар (/а/)`, `агар ([])`) or always falsy
 * (TS2873, `то ("")`). The rules are TypeScript's
 * (`getSyntacticNullishnessSemantics`, `getSyntacticTruthySemantics`).
 */
import type {
  AssignmentExpression,
  BinaryExpression,
  ConditionalExpression,
  Expression,
  Identifier,
  Literal,
  SequenceExpression,
  TemplateLiteral,
  UnaryExpression,
} from './ast';

/** Whether an expression is always, never or only sometimes nullish (or truthy). */
export type Semantics = 'always' | 'never' | 'sometimes';

/** `х чун Т`, `<Т>х`, `х!`, `х бармесоё Т`, `ф<Т>`: TypeScript looks through them. */
const OUTER_EXPRESSIONS: ReadonlySet<string> = new Set([
  'AsExpression',
  'TypeAssertion',
  'NonNullExpression',
  'SatisfiesExpression',
  'InstantiationExpression',
]);

/** Expressions whose value may be nullish or not: what calls, members and `ин` give. */
const SOMETIMES_NULLISH: ReadonlySet<string> = new Set([
  'AwaitExpression',
  'CallExpression',
  'ChainExpression',
  'TaggedTemplateExpression',
  'MemberExpression',
  'MetaProperty',
  'NewExpression',
  'YieldExpression',
  'ThisExpression',
  'ImportExpression',
]);

/** Expressions that are objects, so always truthy. */
const ALWAYS_TRUTHY: ReadonlySet<string> = new Set([
  'ArrayExpression',
  'ArrowFunctionExpression',
  'ClassExpression',
  'FunctionExpression',
  'ObjectExpression',
  'RegExpLiteral',
]);

/** `беқимат` (`undefined`), when it names the global, not a local. */
export type IsUndefined = (_identifier: Identifier) => boolean;

/** The expression inside `х чун Т`, `<Т>х`, `х!`, `х бармесоё Т` and `ф<Т>`. */
export function skipOuterExpressions(expression: Expression): Expression {
  let current = expression;
  while (OUTER_EXPRESSIONS.has(current.type)) {
    current = (current as Expression & { expression: Expression }).expression;
  }
  return current;
}

/** Always if both are, never if both are, sometimes otherwise. */
function either(first: Semantics, second: Semantics): Semantics {
  return first === second ? first : 'sometimes';
}

/** Whether an expression's value is nullish: the left operand of `??`. */
export function nullishSemantics(expression: Expression, isUndefined: IsUndefined): Semantics {
  const node = skipOuterExpressions(expression);
  if (SOMETIMES_NULLISH.has(node.type)) return 'sometimes';
  switch (node.type) {
    case 'Identifier':
      return isUndefined(node as Identifier) ? 'always' : 'sometimes';
    case 'Literal':
      return (node as Literal).value === null ? 'always' : 'never';
    case 'ConditionalExpression': {
      const conditional = node as ConditionalExpression;
      return either(
        nullishSemantics(conditional.consequent, isUndefined),
        nullishSemantics(conditional.alternate, isUndefined)
      );
    }
    case 'SequenceExpression': {
      const { expressions } = node as SequenceExpression;
      return nullishSemantics(expressions[expressions.length - 1], isUndefined);
    }
    case 'BinaryExpression':
    case 'AssignmentExpression':
      return operatorNullishness(node as BinaryExpression | AssignmentExpression, isUndefined);
    default:
      // Literals, objects, functions, templates, other operators
      return 'never';
  }
}

/** `а || б`, `а && б` may be anything; `а ?? б`, `а = б` are what `б` is; other operators never nullish. */
function operatorNullishness(
  node: BinaryExpression | AssignmentExpression,
  isUndefined: IsUndefined
): Semantics {
  switch (node.operator) {
    case '||':
    case '&&':
    case '||=':
    case '&&=':
      return 'sometimes';
    case '??':
    case '=':
    case '??=':
      return nullishSemantics(node.right, isUndefined);
    default:
      return 'never';
  }
}

/** Whether a condition's value is truthy. `0`, `1`, `дуруст` and `нодуруст` may be either. */
export function truthySemantics(expression: Expression, isUndefined: IsUndefined): Semantics {
  const node = skipOuterExpressions(expression);
  if (ALWAYS_TRUTHY.has(node.type)) return 'always';
  switch (node.type) {
    case 'Literal':
      return literalTruthiness(node as Literal);
    case 'TemplateLiteral': {
      const template = node as TemplateLiteral;
      if (template.expressions.length > 0) return 'sometimes';
      return template.quasis[0].value.cooked ? 'always' : 'never';
    }
    case 'UnaryExpression':
      return (node as UnaryExpression).operator === 'void' ? 'never' : 'sometimes';
    case 'ConditionalExpression': {
      const conditional = node as ConditionalExpression;
      return either(
        truthySemantics(conditional.consequent, isUndefined),
        truthySemantics(conditional.alternate, isUndefined)
      );
    }
    case 'Identifier':
      return isUndefined(node as Identifier) ? 'never' : 'sometimes';
    default:
      return 'sometimes';
  }
}

function literalTruthiness(literal: Literal): Semantics {
  const { value, raw } = literal;
  if (value === null) return 'never';
  if (typeof value === 'string') return value ? 'always' : 'never';
  if (typeof value !== 'number') return 'sometimes';
  // `агар (1)`, `то (0)` are allowed; BigInt literals (`10n`) and other numbers are not
  return raw === '0' || raw === '1' ? 'sometimes' : 'always';
}

// AST Node types
import type { TypeAnnotation, TypeNode, TypeParameter } from './type-system';
export interface ASTNode {
  type: string;
  line: number;
  column: number;
}

export interface Program extends ASTNode {
  type: 'Program';
  body: Statement[];
}

export interface Statement extends ASTNode {}

export interface Expression extends ASTNode {}

export interface VariableDeclaration extends Statement {
  type: 'VariableDeclaration';
  kind: 'ТАҒЙИРЁБАНДА' | 'СОБИТ';
  identifier: Identifier | ArrayPattern | ObjectPattern;
  typeAnnotation?: TypeAnnotation;
  init?: Expression;
  /** Definite assignment assertion `тағ х!: рақам;` (erased in the output). */
  definite?: boolean;
}

export interface FunctionDeclaration extends Statement {
  type: 'FunctionDeclaration';
  name: Identifier;
  /** `функсия ф<Т мерос { дарозӣ: рақам } = сатр>(…)` */
  typeParameters?: TypeParameter[];
  params: Parameter[];
  returnType?: TypeAnnotation;
  body: BlockStatement;
  async?: boolean;
  /** Generator function: `функсия* ном() { … }`. */
  generator?: boolean;
}

export interface Parameter extends ASTNode {
  type: 'Parameter';
  name: Identifier;
  typeAnnotation?: TypeAnnotation;
  optional?: boolean;
  /** Default value: `(а = 1) => а`. */
  defaultValue?: Expression;
  /** Rest parameter: `(...а) => а`. */
  rest?: boolean;
  /**
   * Destructuring parameter: `({ а, б }) => а`. When set, it replaces `name`
   * in the emitted parameter list (`name` then holds a synthetic identifier).
   */
  pattern?: ArrayPattern | ObjectPattern;
}

export interface BlockStatement extends Statement {
  type: 'BlockStatement';
  body: Statement[];
}

export interface ReturnStatement extends Statement {
  type: 'ReturnStatement';
  argument?: Expression;
}

export interface IfStatement extends Statement {
  type: 'IfStatement';
  test: Expression;
  consequent: Statement;
  alternate?: Statement;
}

export interface WhileStatement extends Statement {
  type: 'WhileStatement';
  test: Expression;
  body: Statement;
}

/** `кун { … } то (шарт);` — the body runs before the test. */
export interface DoWhileStatement extends Statement {
  type: 'DoWhileStatement';
  body: Statement;
  test: Expression;
}

/** `берун: барои (…) { … }` — a target for `шикастан берун;` / `давом берун;`. */
export interface LabeledStatement extends Statement {
  type: 'LabeledStatement';
  label: Identifier;
  body: Statement;
}

/** A lone `;`. */
export interface EmptyStatement extends Statement {
  type: 'EmptyStatement';
}

/** `debugger;` */
export interface DebuggerStatement extends Statement {
  type: 'DebuggerStatement';
}

/** `шумориш Ранг { Сурх, Сабз = 5 }`; `собит шумориш …` is a const enum. */
export interface EnumDeclaration extends Statement {
  type: 'EnumDeclaration';
  name: Identifier;
  members: EnumMember[];
  const?: boolean;
}

export interface EnumMember extends ASTNode {
  type: 'EnumMember';
  /** `Сурх` or `"номи дароз"` */
  id: Identifier | Literal;
  initializer?: Expression;
}

export interface ForStatement extends Statement {
  type: 'ForStatement';
  init: VariableDeclaration | ExpressionStatement | null;
  test: Expression | null;
  update: Expression | null;
  body: Statement;
}

export interface ForInStatement extends Statement {
  type: 'ForInStatement';
  left: VariableDeclaration | Expression;
  right: Expression;
  body: Statement;
}

export interface ForOfStatement extends Statement {
  type: 'ForOfStatement';
  left: VariableDeclaration | Expression;
  right: Expression;
  body: Statement;
  /** `барои интизор (собит х аз …)`: for await. */
  await?: boolean;
}

export interface ExpressionStatement extends Statement {
  type: 'ExpressionStatement';
  expression: Expression;
}

export interface Identifier extends Expression {
  type: 'Identifier';
  name: string;
}

export interface Literal extends Expression {
  type: 'Literal';
  value: string | number | boolean | null;
  /**
   * Source text. For numeric literals this is the literal as written, minus
   * `_` separators (`0xFF`, `1e3`, `.5`, `10n`), and codegen emits it as is.
   */
  raw: string;
}

export interface TemplateLiteral extends Expression {
  type: 'TemplateLiteral';
  quasis: TemplateElement[];
  expressions: Expression[];
}

export interface TemplateElement extends ASTNode {
  type: 'TemplateElement';
  value: {
    /** Source text between delimiters, escapes kept as written. */
    raw: string;
    /**
     * Text with escape sequences decoded; null in a tagged template whose
     * text has an invalid escape (`сатр.хоми\`\\u\``), as in JavaScript.
     */
    cooked: string | null;
  };
  tail: boolean;
}

export interface BinaryExpression extends Expression {
  type: 'BinaryExpression';
  left: Expression;
  operator: string;
  right: Expression;
}

export interface UnaryExpression extends Expression {
  type: 'UnaryExpression';
  operator: string;
  argument: Expression;
}

export interface UpdateExpression extends Expression {
  type: 'UpdateExpression';
  operator: string;
  argument: Expression;
  prefix: boolean;
}

export interface CallExpression extends Expression {
  type: 'CallExpression';
  callee: Expression;
  /** May contain `SpreadElement` nodes: `ф(...а)`. */
  arguments: Expression[];
  /** Optional call: `ф?.()`. */
  optional?: boolean;
}

/** `test ? consequent : alternate` */
export interface ConditionalExpression extends Expression {
  type: 'ConditionalExpression';
  test: Expression;
  consequent: Expression;
  alternate: Expression;
}

/** Comma operator: `а, б`. */
export interface SequenceExpression extends Expression {
  type: 'SequenceExpression';
  expressions: Expression[];
}

export interface ArrowFunctionExpression extends Expression {
  type: 'ArrowFunctionExpression';
  params: Parameter[];
  body: BlockStatement | Expression;
  isAsync?: boolean;
  returnType?: TypeAnnotation;
  /** Generic arrow function: `<Т>(х: Т) => х` (erased in the output). */
  typeParameters?: TypeParameter[];
}

export interface AssignmentExpression extends Expression {
  type: 'AssignmentExpression';
  left: Expression;
  operator: string;
  right: Expression;
}

export interface ArrayExpression extends Expression {
  type: 'ArrayExpression';
  /** May contain `SpreadElement` nodes: `[...а, 1]`. */
  elements: Expression[];
}

export interface ObjectExpression extends Expression {
  type: 'ObjectExpression';
  properties: (Property | SpreadElement)[];
}

export interface Property extends ASTNode {
  type: 'Property';
  key: Identifier | Literal;
  value: Expression;
  computed: boolean;
  shorthand: boolean;
  /** Method shorthand: `{ ф() { … } }` — `value` is a `FunctionExpression`. */
  method?: boolean;
  /** Accessor: `{ get ном() { … } }`, `{ set ном(қ) { … } }` (also a `method`). */
  kind?: 'get' | 'set';
}

export interface MemberExpression extends Expression {
  type: 'MemberExpression';
  object: Expression;
  property: Expression;
  computed: boolean;
  /** Optional chaining: `о?.а`, `о?.[к]`. */
  optional?: boolean;
}

/**
 * A parenthesised optional chain, `(о?.а)`: the parentheses end the chain, so
 * `(о?.а).б` throws when `о` is nullish while `о?.а.б` does not. Created only
 * when the grouped expression contains an optional link.
 */
export interface ChainExpression extends Expression {
  type: 'ChainExpression';
  expression: Expression;
}

/**
 * Type assertion `х чун Т` (TypeScript `as`) or const assertion `х чун собит`
 * (`as const`). Types are erased: only `expression` is emitted.
 */
export interface AsExpression extends Expression {
  type: 'AsExpression';
  expression: Expression;
  /** The asserted type; absent for `чун собит`. */
  typeAnnotation?: TypeNode;
  /** `чун собит`: literal types are kept and array literals become readonly tuples. */
  isConst?: boolean;
}

/** Angle-bracket type assertion `<Т>х` / `<собит>х`, the prefix form of `AsExpression`. */
export interface TypeAssertion extends Expression {
  type: 'TypeAssertion';
  expression: Expression;
  /** The asserted type; absent for `<собит>`. */
  typeAnnotation?: TypeNode;
  isConst?: boolean;
}

/**
 * `х бармесоё Т` (TypeScript `satisfies`): `х` must be assignable to `Т` but
 * keeps its own type. Only `expression` is emitted.
 */
export interface SatisfiesExpression extends Expression {
  type: 'SatisfiesExpression';
  expression: Expression;
  typeAnnotation: TypeNode;
}

/** Non-null assertion `х!`: the value of `х`, typed without `холӣ`/`беқимат`. */
export interface NonNullExpression extends Expression {
  type: 'NonNullExpression';
  expression: Expression;
}

export interface ImportDeclaration extends Statement {
  type: 'ImportDeclaration';
  specifiers: (ImportSpecifier | ImportDefaultSpecifier | ImportNamespaceSpecifier)[];
  source: Literal;
}

export interface ImportSpecifier extends ASTNode {
  type: 'ImportSpecifier';
  imported: Identifier;
  local: Identifier;
}

export interface ImportDefaultSpecifier extends ASTNode {
  type: 'ImportDefaultSpecifier';
  local: Identifier;
}

export interface ImportNamespaceSpecifier extends ASTNode {
  type: 'ImportNamespaceSpecifier';
  local: Identifier;
}

export interface ExportDeclaration extends Statement {
  type: 'ExportDeclaration';
  declaration?: Statement;
  specifiers?: ExportSpecifier[];
  source?: Literal;
  default?: boolean;
}

export interface ExportSpecifier extends ASTNode {
  type: 'ExportSpecifier';
  exported: Identifier;
  local: Identifier;
}

// Class-related AST nodes will be defined later to avoid duplication

export interface TryStatement extends Statement {
  type: 'TryStatement';
  block: BlockStatement;
  handler?: CatchClause;
  finalizer?: BlockStatement;
}

export interface CatchClause extends ASTNode {
  type: 'CatchClause';
  param?: Identifier;
  body: BlockStatement;
}

export interface ThrowStatement extends Statement {
  type: 'ThrowStatement';
  argument: Expression;
}

export interface AwaitExpression extends Expression {
  type: 'AwaitExpression';
  argument: Expression;
}

/** `ҳосил х` / `ҳосил* итерабел` inside a generator; the argument is optional. */
export interface YieldExpression extends Expression {
  type: 'YieldExpression';
  argument?: Expression;
  delegate: boolean;
}

export interface NewExpression extends Expression {
  type: 'NewExpression';
  callee: Expression;
  arguments: Expression[];
  /** Explicit type arguments: `нав Map<сатр, рақам>()` */
  typeArguments?: TypeNode[];
}

export interface ClassDeclaration extends Statement {
  type: 'ClassDeclaration';
  name: Identifier;
  /** `синф Қуттӣ<Т мерос { а: рақам }>` */
  typeParameters?: TypeParameter[];
  superClass?: Identifier;
  implements?: Identifier[];
  body: ClassBody;
}

export interface ClassBody extends ASTNode {
  type: 'ClassBody';
  body: (MethodDefinition | PropertyDefinition)[];
}

export interface MethodDefinition extends ASTNode {
  type: 'MethodDefinition';
  key: Identifier | PrivateIdentifier;
  value: FunctionExpression;
  kind: 'constructor' | 'method' | 'get' | 'set';
  static: boolean;
  abstract?: boolean;
  accessibility?: 'public' | 'private' | 'protected';
}

export interface PropertyDefinition extends ASTNode {
  type: 'PropertyDefinition';
  key: Identifier | PrivateIdentifier;
  value?: Expression;
  typeAnnotation?: TypeAnnotation;
  /** `ном?: сатр` */
  optional?: boolean;
  /** Definite assignment assertion `ном!: сатр` (erased in the output). */
  definite?: boolean;
  /** `танҳохонӣ ном: сатр` */
  readonly?: boolean;
  static: boolean;
  accessibility?: 'public' | 'private' | 'protected';
}

export interface FunctionExpression extends Expression {
  type: 'FunctionExpression';
  name?: Identifier;
  /** `метод<Т>(х: Т)`, `функсия <Т>(х: Т)` */
  typeParameters?: TypeParameter[];
  params: Parameter[];
  body: BlockStatement;
  async?: boolean;
  /** Generator: `функсия* () { … }`, methods `*ном() { … }`. */
  generator?: boolean;
  returnType?: TypeAnnotation;
}

export interface Super extends Expression {
  type: 'Super';
}

export interface ThisExpression extends Expression {
  type: 'ThisExpression';
}

export interface SwitchStatement extends Statement {
  type: 'SwitchStatement';
  discriminant: Expression;
  cases: SwitchCase[];
}

export interface SwitchCase extends ASTNode {
  type: 'SwitchCase';
  test?: Expression; // null for default case
  consequent: Statement[];
}

export interface BreakStatement extends Statement {
  type: 'BreakStatement';
  label?: Identifier;
}

export interface ContinueStatement extends Statement {
  type: 'ContinueStatement';
  label?: Identifier;
}

// Destructuring and Spread Patterns
export interface ArrayPattern extends ASTNode {
  type: 'ArrayPattern';
  elements: (
    | Identifier
    | ArrayPattern
    | ObjectPattern
    | AssignmentPattern
    | SpreadElement
    | null
  )[];
}

export interface ObjectPattern extends ASTNode {
  type: 'ObjectPattern';
  properties: (PropertyPattern | SpreadElement)[];
}

export interface PropertyPattern extends ASTNode {
  type: 'PropertyPattern';
  key: Identifier | Literal;
  /** For shorthand `{ а }` the parser sets `value` to an Identifier equal to `key`. */
  value: Identifier | ArrayPattern | ObjectPattern | AssignmentPattern;
  computed: boolean;
}

/** Binding with a default value: `{ а = 1 }`, `[а = 1]`. */
export interface AssignmentPattern extends ASTNode {
  type: 'AssignmentPattern';
  left: Identifier | ArrayPattern | ObjectPattern;
  right: Expression;
}

export interface SpreadElement extends ASTNode {
  type: 'SpreadElement';
  argument: Expression;
}

export interface RestElement extends ASTNode {
  type: 'RestElement';
  argument: Identifier;
}

// Dynamic Import Support
export interface ImportExpression extends Expression {
  type: 'ImportExpression';
  source: Expression;
}

/** Meta property: `нав.target` (`new.target`, `meta.name` is 'new'). */
export interface MetaProperty extends Expression {
  type: 'MetaProperty';
  meta: Identifier;
  property: Identifier;
}

/**
 * `#ном`, the name of a private class member (ES2022): a class member key,
 * the property of `ин.#ном`, or the left operand of `#ном in о`. `name`
 * excludes the '#'.
 */
export interface PrivateIdentifier extends Expression {
  type: 'PrivateIdentifier';
  name: string;
}

/** Tagged template: `тег\`а${1}б\``, `сатр.хоми\`…\``. */
export interface TaggedTemplateExpression extends Expression {
  type: 'TaggedTemplateExpression';
  tag: Expression;
  quasi: TemplateLiteral;
}

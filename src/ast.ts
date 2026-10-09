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
  /** `#!/usr/bin/env node` on the first line; emitted as the first line of the output. */
  shebang?: string;
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
  /** `эълон собит х: рақам;`: an ambient declaration, erased in the output. */
  declare?: boolean;
  /**
   * `истифода х = …;` (TypeScript `using`, 'sync') or `интизор истифода х = …;`
   * (`await using`, 'async'): `kind` is then 'СОБИТ'.
   */
  using?: 'sync' | 'async';
}

/** `тағ а = 1, б = 2;`: several declarations of one kind in one statement. */
export interface VariableDeclarationList extends Statement {
  type: 'VariableDeclarationList';
  kind: 'ТАҒЙИРЁБАНДА' | 'СОБИТ';
  declarations: VariableDeclaration[];
  declare?: boolean;
  using?: 'sync' | 'async';
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
  /** A `this` parameter, `функсия ф(ин: Т)`: the type of `ин` in the body (erased). */
  thisType?: TypeAnnotation;
}

/**
 * A function without a body: an overload signature (`функсия ф(х: рақам): рақам;`
 * before the implementation) or an ambient function (`эълон функсия ф(): беджавоб;`).
 * Erased in the output.
 */
export interface FunctionSignature extends Statement {
  type: 'FunctionSignature';
  name: Identifier;
  typeParameters?: TypeParameter[];
  params: Parameter[];
  returnType?: TypeAnnotation;
  thisType?: TypeAnnotation;
  async?: boolean;
  generator?: boolean;
  /** In an ambient context (`эълон функсия`, inside `эълон номфазо` / `эълон модул`). */
  declare?: boolean;
}

/** `@ном`, `@ном(…)`, `@а.б`, `@(ифода)` before a class, class member or parameter. */
export interface Decorator extends ASTNode {
  type: 'Decorator';
  expression: Expression;
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
  /**
   * Parameter property of a constructor, `конструктор(хосусӣ х: рақам)`: the
   * parameter also declares an instance property assigned from it.
   */
  accessibility?: 'public' | 'private' | 'protected';
  /** `танҳохонӣ` parameter property. */
  readonly?: boolean;
  /** `бознавис` parameter property. */
  override?: boolean;
  /** Parameter decorators (`experimentalDecorators` only): `конструктор(@ворид() х: Т)`. */
  decorators?: Decorator[];
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
  /** `эълон шумориш`: erased in the output. */
  declare?: boolean;
}

export interface EnumMember extends ASTNode {
  type: 'EnumMember';
  /** `Сурх` or `"номи дароз"` */
  id: Identifier | Literal;
  initializer?: Expression;
}

export interface ForStatement extends Statement {
  type: 'ForStatement';
  init: VariableDeclaration | VariableDeclarationList | ExpressionStatement | null;
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

/** Regular expression literal `/а+/g`; `pattern` and `flags` are kept as written. */
export interface RegExpLiteral extends Expression {
  type: 'RegExpLiteral';
  pattern: string;
  flags: string;
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
  /** Explicit type arguments: `ф<рақам>(1)` (erased in JavaScript). */
  typeArguments?: TypeNode[];
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
  /** May contain `SpreadElement` nodes, `[...а, 1]`, and holes (null), `[1, , 3]`. */
  elements: Array<Expression | null>;
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

/**
 * Instantiation expression `ф<рақам>` (TypeScript 4.7): a generic function or
 * class with its type arguments fixed, without calling it. Only `expression`
 * is emitted in JavaScript.
 */
export interface InstantiationExpression extends Expression {
  type: 'InstantiationExpression';
  expression: Expression;
  typeArguments: TypeNode[];
}

export interface ImportDeclaration extends Statement {
  type: 'ImportDeclaration';
  /** Empty for a side-effect import: `ворид "./м";`. */
  specifiers: (ImportSpecifier | ImportDefaultSpecifier | ImportNamespaceSpecifier)[];
  source: Literal;
  /** `ворид навъ { Т } аз "./м";`: imports types only, erased in the output. */
  importKind?: 'type';
}

export interface ImportSpecifier extends ASTNode {
  type: 'ImportSpecifier';
  imported: Identifier;
  local: Identifier;
  /** `ворид { навъ Т, х } аз …`: this name is a type, erased in the output. */
  importKind?: 'type';
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
  /** `содир навъ { Т };`, `содир навъ * аз "./м";`: types only, erased in the output. */
  exportKind?: 'type';
  /** `содир * чун Н аз "./м";`: the module's namespace exported as `Н`. */
  namespaceExport?: Identifier;
}

export interface ExportSpecifier extends ASTNode {
  type: 'ExportSpecifier';
  exported: Identifier;
  local: Identifier;
  /** `содир { навъ Т, х };`: this name is a type, erased in the output. */
  exportKind?: 'type';
}

/**
 * `ворид х = require("./м");` (TypeScript CommonJS interop) or the alias
 * `ворид х = Н.а;`.
 */
export interface ImportEqualsDeclaration extends Statement {
  type: 'ImportEqualsDeclaration';
  id: Identifier;
  /** The module of `require("./м")`; absent for an alias. */
  source?: Literal;
  /** The aliased name of `ворид х = Н.а;`. */
  reference?: Expression;
  /** `ворид навъ х = …`: a type only, erased in the output. */
  importKind?: 'type';
}

/** `содир = ифода;` (TypeScript `export =`): the value becomes `module.exports`. */
export interface ExportAssignment extends Statement {
  type: 'ExportAssignment';
  expression: Expression;
}

/**
 * `эълон модул "ном" { … }` (an ambient module) or `эълон глобалӣ { … }`
 * (global declarations): types only, erased in the output.
 */
export interface AmbientModuleDeclaration extends Statement {
  type: 'AmbientModuleDeclaration';
  /** The module name; absent for `эълон глобалӣ`. */
  name?: Literal;
  global?: boolean;
  body: Statement[];
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
  /** The binding: a name or a destructuring pattern, `гирифтан ({ message })`. */
  param?: Identifier | ArrayPattern | ObjectPattern;
  /** `гирифтан (е: ношинос)`: `ношинос` or `ҳар` (unknown / any), as TypeScript allows. */
  typeAnnotation?: TypeAnnotation;
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
  /** The base class: a name or, as in TypeScript, any expression (`мерос Омехта(Асос)`). */
  superClass?: Expression;
  /** Type arguments of the superclass: `мерос Асос<рақам>`. */
  superTypeArguments?: TypeNode[];
  implements?: Identifier[];
  /** Type arguments of each `implements` entry, by index: `татбиқ И<сатр>`. */
  implementsTypeArguments?: (TypeNode[] | undefined)[];
  body: ClassBody;
  /** `@ном синф …` */
  decorators?: Decorator[];
  /** `эълон синф …`: erased in the output. */
  declare?: boolean;
}

/** `синф { … }` / `синф Ном мерос Асос { … }` in expression position. */
export interface ClassExpression extends Expression {
  type: 'ClassExpression';
  name?: Identifier;
  /** `содир пешфарз мавҳум синф { … }`: an abstract class without a name. */
  abstract?: boolean;
  /** `синф<Т> { … }` */
  typeParameters?: TypeParameter[];
  /** The base class: a name or, as in TypeScript, any expression (`мерос Омехта(Асос)`). */
  superClass?: Expression;
  superTypeArguments?: TypeNode[];
  implements?: Identifier[];
  implementsTypeArguments?: (TypeNode[] | undefined)[];
  body: ClassBody;
  decorators?: Decorator[];
}

export interface ClassBody extends ASTNode {
  type: 'ClassBody';
  body: (MethodDefinition | PropertyDefinition | StaticBlock)[];
}

/** Class static initialization block: `статикӣ { … }`. */
export interface StaticBlock extends ASTNode {
  type: 'StaticBlock';
  body: Statement[];
}

export interface MethodDefinition extends ASTNode {
  type: 'MethodDefinition';
  /** An expression for a computed name, `[Symbol.iterator]() { … }` (`computed` is then set). */
  key: Identifier | PrivateIdentifier | Expression;
  value: FunctionExpression;
  kind: 'constructor' | 'method' | 'get' | 'set';
  static: boolean;
  abstract?: boolean;
  accessibility?: 'public' | 'private' | 'protected';
  computed?: boolean;
  decorators?: Decorator[];
  /** `бознавис м() { … }` */
  override?: boolean;
  /** `м?() { … }`, `м?(): Т;` */
  optional?: boolean;
  /**
   * No body: an overload signature (`м(х: рақам): рақам;`) or a member of an
   * `эълон синф`. Erased in the output, like an abstract method.
   */
  signature?: boolean;
}

export interface PropertyDefinition extends ASTNode {
  type: 'PropertyDefinition';
  /** An expression for a computed name, `[калид] = 1;` (`computed` is then set). */
  key: Identifier | PrivateIdentifier | Expression;
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
  computed?: boolean;
  decorators?: Decorator[];
  /** `бознавис ном = …;` */
  override?: boolean;
  /** `эълон ном: Т;`: declares the type of a field without emitting it. */
  declare?: boolean;
  /** `мавҳум ном: Т;`: erased in the output. */
  abstract?: boolean;
  /** `дастрасӣ ном = …;` (TypeScript `accessor`): an auto-accessor field. */
  accessor?: boolean;
  /**
   * An index signature, `[калид: сатр]: рақам;`: the parameter `калид: сатр`
   * (the value type is `typeAnnotation`). Erased in the output.
   */
  indexSignature?: Parameter;
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
  /** A `this` parameter, `м(ин: Т)`: the type of `ин` in the body (erased). */
  thisType?: TypeAnnotation;
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
  /** The name, or an expression when `computed`: `{ [калид]: қимат }`. */
  key: Identifier | Literal | Expression;
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

/**
 * Meta property: `нав.target` (`new.target`, `meta.name` is 'new') or
 * `ворид.meta` (`import.meta`, `meta.name` is 'import').
 */
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
  /** Explicit type arguments: `тег<рақам>\`…\`` (erased in JavaScript). */
  typeArguments?: TypeNode[];
}

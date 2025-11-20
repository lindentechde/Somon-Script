// AST Node types
import type { TypeAnnotation } from './type-system';
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
}

export interface FunctionDeclaration extends Statement {
  type: 'FunctionDeclaration';
  name: Identifier;
  params: Parameter[];
  returnType?: TypeAnnotation;
  body: BlockStatement;
  async?: boolean;
}

export interface Parameter extends ASTNode {
  type: 'Parameter';
  name: Identifier;
  typeAnnotation?: TypeAnnotation;
  optional?: boolean;
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
    raw: string;
    cooked: string;
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
  arguments: Expression[];
}

export interface ArrowFunctionExpression extends Expression {
  type: 'ArrowFunctionExpression';
  params: Parameter[];
  body: BlockStatement | Expression;
  isAsync?: boolean;
  returnType?: TypeAnnotation;
}

export interface AssignmentExpression extends Expression {
  type: 'AssignmentExpression';
  left: Expression;
  operator: string;
  right: Expression;
}

export interface ArrayExpression extends Expression {
  type: 'ArrayExpression';
  elements: Expression[];
}

export interface ObjectExpression extends Expression {
  type: 'ObjectExpression';
  properties: Property[];
}

export interface Property extends ASTNode {
  type: 'Property';
  key: Identifier | Literal;
  value: Expression;
  computed: boolean;
  shorthand: boolean;
}

export interface MemberExpression extends Expression {
  type: 'MemberExpression';
  object: Expression;
  property: Expression;
  computed: boolean;
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

export interface NewExpression extends Expression {
  type: 'NewExpression';
  callee: Expression;
  arguments: Expression[];
}

export interface ClassDeclaration extends Statement {
  type: 'ClassDeclaration';
  name: Identifier;
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
  key: Identifier;
  value: FunctionExpression;
  kind: 'constructor' | 'method' | 'get' | 'set';
  static: boolean;
  abstract?: boolean;
  accessibility?: 'public' | 'private' | 'protected';
}

export interface PropertyDefinition extends ASTNode {
  type: 'PropertyDefinition';
  key: Identifier;
  value?: Expression;
  typeAnnotation?: TypeAnnotation;
  static: boolean;
  accessibility?: 'public' | 'private' | 'protected';
}

export interface FunctionExpression extends Expression {
  type: 'FunctionExpression';
  name?: Identifier;
  params: Parameter[];
  body: BlockStatement;
  async?: boolean;
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
  elements: (Identifier | ArrayPattern | ObjectPattern | SpreadElement | null)[];
}

export interface ObjectPattern extends ASTNode {
  type: 'ObjectPattern';
  properties: (PropertyPattern | SpreadElement)[];
}

export interface PropertyPattern extends ASTNode {
  type: 'PropertyPattern';
  key: Identifier | Literal;
  value: Identifier | ArrayPattern | ObjectPattern;
  computed: boolean;
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

// Meta Property for import.meta
export interface MetaProperty extends Expression {
  type: 'MetaProperty';
  meta: Identifier;
  property: Identifier;
}

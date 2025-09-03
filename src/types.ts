// Token types for lexical analysis
export enum TokenType {
  // Literals
  NUMBER = 'NUMBER',
  STRING = 'STRING',
  BOOLEAN = 'BOOLEAN',
  IDENTIFIER = 'IDENTIFIER',
  
  // Keywords (in Tajik Cyrillic)
  ТАҒЙИРЁБАНДА = 'ТАҒЙИРЁБАНДА', // variable (let/var)
  СОБИТ = 'СОБИТ',               // constant
  ФУНКСИЯ = 'ФУНКСИЯ',           // function
  АГАР = 'АГАР',                 // if
  ВАГАРНА = 'ВАГАРНА',           // else
  БАРОИ = 'БАРОИ',               // for
  ТО = 'ТО',                     // while
  БОЗГАШТ = 'БОЗГАШТ',           // return
  СИНФ = 'СИНФ',                 // class
  НАВ = 'НАВ',                   // new
  ИН = 'ИН',                     // this
  ДУРУСТ = 'ДУРУСТ',             // true
  НОДУРУСТ = 'НОДУРУСТ',         // false
  ХОЛӢ = 'ХОЛӢ',                 // null
  
  // Import/Export keywords
  ВОРИД = 'ВОРИД',               // import
  СОДИР = 'СОДИР',               // export
  АЗ = 'АЗ',                     // from
  ПЕШФАРЗ = 'ПЕШФАРЗ',           // default
  ЧУН = 'ЧУН',                   // as
  
  // Built-in functions and objects
  ЧОП = 'ЧОП',                   // console (print)
  САБТ = 'САБТ',                 // log
  ХАТО = 'ХАТО',                 // error
  ОГОҲӢ = 'ОГОҲӢ',               // warn
  МАЪЛУМОТ = 'МАЪЛУМОТ',         // info
  
  // Array methods
  РӮЙХАТ = 'РӮЙХАТ',             // Array
  ИЛОВА = 'ИЛОВА',               // push
  БАРОВАРДАН = 'БАРОВАРДАН',     // pop
  ДАРОЗӢ = 'ДАРОЗӢ',             // length
  ХАРИТА = 'ХАРИТА',             // map
  ФИЛТР = 'ФИЛТР',               // filter
  КОФТАН = 'КОФТАН',             // find
  
  // String methods
  САТР_ОБЪЕКТ = 'САТР_ОБЪЕКТ',   // String object
  ДАРОЗИИ_САТР = 'ДАРОЗИИ_САТР', // length
  ПАЙВАСТАН = 'ПАЙВАСТАН',       // concat
  ҶОЙИВАЗКУНӢ = 'ҶОЙИВАЗКУНӢ',   // replace
  ҶУДОКУНӢ = 'ҶУДОКУНӢ',         // split
  
  // Object methods
  ОБЪЕКТ = 'ОБЪЕКТ',             // Object
  КАЛИДҲО = 'КАЛИДҲО',           // keys
  ҚИМАТҲО = 'ҚИМАТҲО',           // values
  
  // Math functions
  МАТЕМАТИКА = 'МАТЕМАТИКА',     // Math
  ҶАМЪ = 'ҶАМЪ',                 // add (custom)
  ТАРҲ = 'ТАРҲ',                 // subtract (custom)
  ЗАРБ = 'ЗАРБ',                 // multiply (custom)
  ТАҚСИМ = 'ТАҚСИМ',             // divide (custom)
  
  // Control flow additions
  ШИКАСТАН = 'ШИКАСТАН',         // break
  ДАВОМ = 'ДАВОМ',               // continue
  КӮШИШ = 'КӮШИШ',               // try
  ГИРИФТАН = 'ГИРИФТАН',         // catch
  НИҲОЯТ = 'НИҲОЯТ',             // finally
  ПАРТОФТАН = 'ПАРТОФТАН',       // throw
  
  // Async keywords
  ҲАМЗАМОН = 'ҲАМЗАМОН',         // async
  ИНТИЗОР = 'ИНТИЗОР',           // await
  ВАЪДА = 'ВАЪДА',               // Promise
  
  // Type system keywords
  САТР = 'САТР',                 // string type
  РАҚАМ = 'РАҚАМ',               // number type
  МАНТИҚӢ = 'МАНТИҚӢ',           // boolean type
  ИНТЕРФЕЙС = 'ИНТЕРФЕЙС',       // interface
  НАВЪ = 'НАВЪ',                 // type
  ЯКХЕЛА = 'ЯКХЕЛА',             // generic (same/uniform)
  МЕРОС = 'МЕРОС',               // extends/inherits
  ТАТБИҚ = 'ТАТБИҚ',             // implements
  КОНСТРУКТОР = 'КОНСТРУКТОР',   // constructor
  ХОСУСӢ = 'ХОСУСӢ',             // private
  МУҲОФИЗАТШУДА = 'МУҲОФИЗАТШУДА', // protected
  ҶАМЪИЯТӢ = 'ҶАМЪИЯТӢ',         // public
  СТАТИКӢ = 'СТАТИКӢ',           // static
  МАВҲУМ = 'МАВҲУМ',             // abstract
  НОМФАЗО = 'НОМФАЗО',           // namespace
  
  // Operators
  PLUS = '+',
  MINUS = '-',
  MULTIPLY = '*',
  DIVIDE = '/',
  MODULO = '%',
  ASSIGN = '=',
  EQUAL = '==',
  NOT_EQUAL = '!=',
  LESS_THAN = '<',
  GREATER_THAN = '>',
  LESS_EQUAL = '<=',
  GREATER_EQUAL = '>=',
  AND = '&&',
  OR = '||',
  NOT = '!',
  
  // Punctuation
  SEMICOLON = ';',
  COMMA = ',',
  DOT = '.',
  COLON = ':',
  QUESTION = '?',
  
  // Brackets
  LEFT_PAREN = '(',
  RIGHT_PAREN = ')',
  LEFT_BRACE = '{',
  RIGHT_BRACE = '}',
  LEFT_BRACKET = '[',
  RIGHT_BRACKET = ']',
  
  // Special
  EOF = 'EOF',
  NEWLINE = 'NEWLINE',
  WHITESPACE = 'WHITESPACE'
}

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
}

// AST Node types
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
  identifier: Identifier;
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

export interface CallExpression extends Expression {
  type: 'CallExpression';
  callee: Expression;
  arguments: Expression[];
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

export interface MemberExpression extends Expression {
  type: 'MemberExpression';
  object: Expression;
  property: Expression;
  computed: boolean;
}

export interface ImportDeclaration extends Statement {
  type: 'ImportDeclaration';
  specifiers: (ImportSpecifier | ImportDefaultSpecifier)[];
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

// Type system AST nodes
export interface TypeAnnotation extends ASTNode {
  type: 'TypeAnnotation';
  typeAnnotation: TypeNode;
}

export interface TypeNode extends ASTNode {
  type: string;
}

export interface PrimitiveType extends TypeNode {
  type: 'PrimitiveType';
  name: 'сатр' | 'рақам' | 'мантиқӣ' | 'холӣ';
}

export interface ArrayType extends TypeNode {
  type: 'ArrayType';
  elementType: TypeNode;
}

export interface UnionType extends TypeNode {
  type: 'UnionType';
  types: TypeNode[];
}

export interface GenericType extends TypeNode {
  type: 'GenericType';
  name: Identifier;
  typeParameters?: TypeNode[];
}

export interface InterfaceDeclaration extends Statement {
  type: 'InterfaceDeclaration';
  name: Identifier;
  typeParameters?: TypeParameter[];
  extends?: TypeNode[];
  body: InterfaceBody;
}

export interface InterfaceBody extends ASTNode {
  type: 'InterfaceBody';
  properties: PropertySignature[];
}

export interface PropertySignature extends ASTNode {
  type: 'PropertySignature';
  key: Identifier;
  typeAnnotation: TypeAnnotation;
  optional: boolean;
}

export interface TypeParameter extends ASTNode {
  type: 'TypeParameter';
  name: Identifier;
  constraint?: TypeNode;
  default?: TypeNode;
}

export interface TypeAlias extends Statement {
  type: 'TypeAlias';
  name: Identifier;
  typeParameters?: TypeParameter[];
  typeAnnotation: TypeAnnotation;
}
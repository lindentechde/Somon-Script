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
  САТР = 'САТР',                 // String
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
  init?: Expression;
}

export interface FunctionDeclaration extends Statement {
  type: 'FunctionDeclaration';
  name: Identifier;
  params: Identifier[];
  body: BlockStatement;
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
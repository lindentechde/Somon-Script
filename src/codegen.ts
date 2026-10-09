import {
  Program,
  Statement,
  Expression,
  VariableDeclaration,
  FunctionDeclaration,
  FunctionExpression,
  BlockStatement,
  ReturnStatement,
  IfStatement,
  WhileStatement,
  ForStatement,
  ForInStatement,
  ForOfStatement,
  ExpressionStatement,
  Identifier,
  Literal,
  RegExpLiteral,
  BinaryExpression,
  UnaryExpression,
  UpdateExpression,
  CallExpression,
  ChainExpression,
  ClassExpression,
  ArrowFunctionExpression,
  AssignmentExpression,
  MemberExpression,
  ImportDeclaration,
  ImportSpecifier,
  ImportNamespaceSpecifier,
  ExportDeclaration,
  ArrayExpression,
  ObjectExpression,
  InterfaceDeclaration,
  TypeAlias,
  NamespaceDeclaration,
  Parameter,
  TryStatement,
  ThrowStatement,
  AwaitExpression,
  NewExpression,
  ImportExpression,
  ClassDeclaration,
  MethodDefinition,
  PropertyDefinition,
  StaticBlock,
  SwitchStatement,
  SpreadElement,
  SwitchCase,
  ArrayPattern,
  AssignmentPattern,
  ObjectPattern,
  PropertyPattern,
  TemplateLiteral,
  ConditionalExpression,
  SequenceExpression,
  Property,
  RestElement,
  NonNullExpression,
  DoWhileStatement,
  LabeledStatement,
  BreakStatement,
  ContinueStatement,
  EnumDeclaration,
  YieldExpression,
  MetaProperty,
  PrivateIdentifier,
  TaggedTemplateExpression,
} from './types';
import { BUILTIN_MAPPINGS, MEMBER_ALIASES, translateMemberName } from './builtin-names';

/** Precedence levels of non-binary expressions; binary levels live in `operatorPrecedence`. */
const PREC = {
  SEQUENCE: 1,
  ASSIGNMENT: 2,
  CONDITIONAL: 3,
  UNARY: 16,
  POSTFIX: 17,
  CALL: 19,
  PRIMARY: 20,
} as const;

/** One generated → original position pair recorded by `generateWithMappings`. */
export interface CodeMapping {
  generated: { line: number; column: number };
  original: { line: number; column: number };
}

const POSITION_MARKER = '\0';

type PatternNode =
  | Identifier
  | ArrayPattern
  | ObjectPattern
  | AssignmentPattern
  | SpreadElement
  | RestElement;

/** Words that are not valid JavaScript identifiers (strict mode, CommonJS output). */
const JS_RESERVED_WORDS: ReadonlySet<string> = new Set([
  'await',
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'debugger',
  'default',
  'delete',
  'do',
  'else',
  'enum',
  'export',
  'extends',
  'false',
  'finally',
  'for',
  'function',
  'if',
  'implements',
  'import',
  'in',
  'instanceof',
  'interface',
  'let',
  'new',
  'null',
  'package',
  'private',
  'protected',
  'public',
  'return',
  'static',
  'super',
  'switch',
  'this',
  'throw',
  'true',
  'try',
  'typeof',
  'var',
  'void',
  'while',
  'with',
  'yield',
]);

/** Reserved words that are themselves complete JavaScript expressions. */
const JS_KEYWORD_EXPRESSIONS: ReadonlySet<string> = new Set([
  'null',
  'true',
  'false',
  'this',
  'super',
]);

/** Expressions that only assert a type (`х чун Т`, `<Т>х`, `х бармесоё Т`, `х!`). */
const ASSERTION_TYPES: ReadonlySet<string> = new Set([
  'AsExpression',
  'TypeAssertion',
  'SatisfiesExpression',
  'NonNullExpression',
]);

/** Types are erased: an assertion is emitted as the expression it wraps. */
function skipAssertions(node: Expression): Expression {
  let current = node;
  while (current && ASSERTION_TYPES.has(current.type)) {
    current = (current as NonNullExpression).expression;
  }
  return current;
}

const NODE_PRECEDENCE: Readonly<Record<string, number>> = {
  SequenceExpression: PREC.SEQUENCE,
  AssignmentExpression: PREC.ASSIGNMENT,
  ArrowFunctionExpression: PREC.ASSIGNMENT,
  ConditionalExpression: PREC.CONDITIONAL,
  UnaryExpression: PREC.UNARY,
  AwaitExpression: PREC.UNARY,
  CallExpression: PREC.CALL,
  MemberExpression: PREC.CALL,
  TaggedTemplateExpression: PREC.CALL,
  NewExpression: PREC.CALL,
  ImportExpression: PREC.CALL,
  YieldExpression: PREC.ASSIGNMENT,
};

/** Statements `давом` may continue: the loops. */
const LOOP_TYPES: ReadonlySet<string> = new Set([
  'WhileStatement',
  'DoWhileStatement',
  'ForStatement',
  'ForInStatement',
  'ForOfStatement',
]);

export class CodeGenerator {
  private indentLevel: number = 0;
  private readonly indentSize: number = 2;
  private importCounter: number = 0;
  private readonly errors: string[] = [];
  /** Names declared by the program, innermost scope last (see `withScope`). */
  private readonly scopes: Set<string>[] = [];
  /** Enclosing loops and `интихоб` statements of the current function, for `шикастан`/`давом`. */
  private jumpTargets = { loops: 0, switches: 0 };
  /** Whether statements are prefixed with position markers (`generateWithMappings`). */
  private trackPositions = false;
  /** Labels around the current statement in the current function, innermost last. */
  private labels: Array<{ name: string; isLoop: boolean }> = [];
  /** Whether the current function is `ҳамзамон` (allows `барои интизор`). */
  private inAsyncFunction = false;
  /** While generating an enum member initializer: how to read each earlier member. */
  private enumMembers?: ReadonlyMap<string, string>;
  /** Enclosing non-arrow functions and class bodies, where `нав.target` is allowed. */
  private newTargetScopes = 0;
  /** Private names (`#ном`, without '#') declared by each enclosing class, innermost last. */
  private readonly privateNames: Set<string>[] = [];
  /** Inside a class `статикӣ { … }` block (and not in a function within it). */
  private inStaticBlock = false;

  /**
   * Return diagnostics collected during generation. Codegen follows the same
   * never-throw contract as the rest of the pipeline — unknown AST nodes are
   * recorded here rather than thrown.
   */
  getErrors(): string[] {
    return [...this.errors];
  }

  // Operator precedence table (higher number = higher precedence = evaluated first)
  // Based on JavaScript operator precedence: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Operator_precedence
  private readonly operatorPrecedence: Map<string, number> = new Map([
    // Comma (lowest precedence)
    [',', 1],

    // Assignment operators
    ['=', 2],
    ['+=', 2],
    ['-=', 2],
    ['*=', 2],
    ['/=', 2],
    ['%=', 2],
    ['**=', 2],
    ['<<=', 2],
    ['>>=', 2],
    ['>>>=', 2],
    ['&=', 2],
    ['^=', 2],
    ['|=', 2],
    ['&&=', 2],
    ['||=', 2],
    ['??=', 2],

    // Conditional (ternary)
    ['?', 3],

    // Nullish coalescing
    ['??', 4],

    // Logical OR
    ['||', 5],

    // Logical AND
    ['&&', 6],

    // Bitwise OR
    ['|', 7],

    // Bitwise XOR
    ['^', 8],

    // Bitwise AND
    ['&', 9],

    // Equality operators
    ['==', 10],
    ['!=', 10],
    ['===', 10],
    ['!==', 10],

    // Relational operators
    ['<', 11],
    ['<=', 11],
    ['>', 11],
    ['>=', 11],
    ['in', 11],
    ['instanceof', 11],

    // Bitwise shift
    ['<<', 12],
    ['>>', 12],
    ['>>>', 12],

    // Additive
    ['+', 13],
    ['-', 13],

    // Multiplicative
    ['*', 14],
    ['/', 14],
    ['%', 14],

    // Exponentiation (right-associative, highest precedence for binary operators)
    ['**', 15],
  ]);

  generate(ast: Program): string {
    return this.generateProgram(ast);
  }

  /**
   * Generate code and record, for every emitted statement, where it starts in
   * the output and in the SomonScript source (`line` 1-based, `column`
   * 0-based, as in source maps).
   */
  generateWithMappings(ast: Program): { code: string; mappings: CodeMapping[] } {
    this.trackPositions = true;
    try {
      return CodeGenerator.extractPositionMarkers(this.generateProgram(ast));
    } finally {
      this.trackPositions = false;
    }
  }

  /**
   * Position markers (`\0line,column\0`) are placed in front of statements
   * while generating, since statement text is still re-indented and spliced
   * afterwards. NUL never occurs otherwise: literals escape it.
   */
  private static extractPositionMarkers(marked: string): {
    code: string;
    mappings: CodeMapping[];
  } {
    const parts = marked.split(POSITION_MARKER);
    const mappings: CodeMapping[] = [];
    let code = '';
    let line = 1;
    let column = 0;
    parts.forEach((part, index) => {
      if (index % 2 === 1) {
        const [originalLine, originalColumn] = part.split(',').map(Number);
        mappings.push({
          generated: { line, column },
          original: { line: originalLine, column: originalColumn },
        });
        return;
      }
      code += part;
      const lastNewline = part.lastIndexOf('\n');
      if (lastNewline === -1) {
        column += part.length;
      } else {
        line += part.split('\n').length - 1;
        column = part.length - lastNewline - 1;
      }
    });
    return { code, mappings };
  }

  private generateProgram(node: Program): string {
    this.checkRedeclarations(node.body ?? []);
    const statements = this.withScope(this.declaredNames(node.body ?? []), () =>
      node.body.map(stmt => this.generateStatement(stmt)).filter(stmt => stmt.length > 0)
    );

    return statements.join('\n');
  }

  private generateStatement(node: Statement): string {
    const code = this.generateStatementNode(node);
    if (!this.trackPositions || code.length === 0 || node.type === 'BlockStatement') {
      return code;
    }
    if (typeof node.line !== 'number' || typeof node.column !== 'number') {
      return code;
    }
    const marker = `${POSITION_MARKER}${node.line},${Math.max(node.column - 1, 0)}${POSITION_MARKER}`;
    return code.replace(/^ */, indentation => indentation + marker);
  }

  // eslint-disable-next-line complexity
  private generateStatementNode(node: Statement): string {
    switch (node.type) {
      case 'ImportDeclaration':
        return this.generateImportDeclaration(node as ImportDeclaration);
      case 'ExportDeclaration':
        return this.generateExportDeclaration(node as ExportDeclaration);
      case 'VariableDeclaration':
        return this.generateVariableDeclaration(node as VariableDeclaration);
      case 'FunctionDeclaration':
        return this.generateFunctionDeclaration(node as FunctionDeclaration);
      case 'BlockStatement':
        // A bare block opens on its own line, at the statement's indentation
        return this.indent(this.generateBlockStatement(node as BlockStatement));
      case 'ReturnStatement':
        return this.generateReturnStatement(node as ReturnStatement);
      case 'IfStatement':
        return this.generateIfStatement(node as IfStatement);
      case 'WhileStatement':
        return this.withJumpTarget('loops', () =>
          this.generateWhileStatement(node as WhileStatement)
        );
      case 'DoWhileStatement':
        return this.withJumpTarget('loops', () =>
          this.generateDoWhileStatement(node as DoWhileStatement)
        );
      case 'LabeledStatement':
        return this.generateLabeledStatement(node as LabeledStatement);
      case 'EmptyStatement':
        // Nothing to run; a body that is only `;` becomes `{}`
        return '';
      case 'DebuggerStatement':
        return this.indent('debugger;');
      case 'EnumDeclaration':
        return this.generateEnumDeclaration(node as EnumDeclaration);
      // A loop head binding one name twice (`барои (собит [а, а] аз …)`) is an early error
      case 'ForStatement':
        if ((node as ForStatement).init) {
          this.checkRedeclarations([(node as ForStatement).init as Statement]);
        }
        return this.withScope(this.declaredNames([(node as ForStatement).init as Statement]), () =>
          this.withJumpTarget('loops', () => this.generateForStatement(node as ForStatement))
        );
      case 'ForInStatement':
        this.checkRedeclarations([(node as ForInStatement).left]);
        return this.withScope(this.declaredNames([(node as ForInStatement).left]), () =>
          this.withJumpTarget('loops', () => this.generateForInStatement(node as ForInStatement))
        );
      case 'ForOfStatement':
        if ((node as ForOfStatement).await && !this.inAsyncFunction) {
          this.errors.push(
            `Illegal for await statement at line ${node.line}, column ${node.column}: 'барои интизор' must be inside a 'ҳамзамон' function`
          );
        }
        this.checkRedeclarations([(node as ForOfStatement).left]);
        return this.withScope(this.declaredNames([(node as ForOfStatement).left]), () =>
          this.withJumpTarget('loops', () => this.generateForOfStatement(node as ForOfStatement))
        );
      case 'ExpressionStatement':
        return this.generateExpressionStatement(node as ExpressionStatement);
      case 'TryStatement':
        return this.generateTryStatement(node as TryStatement);
      case 'ThrowStatement':
        return this.generateThrowStatement(node as ThrowStatement);
      case 'InterfaceDeclaration':
        return this.generateInterfaceDeclaration(node as InterfaceDeclaration);
      case 'TypeAlias':
        return this.generateTypeAlias(node as TypeAlias);
      case 'NamespaceDeclaration':
        return this.generateNamespaceDeclaration(node as NamespaceDeclaration);
      case 'ClassDeclaration':
        return this.generateClassDeclaration(node as ClassDeclaration);
      case 'SwitchStatement': {
        // All `ҳолат` arms share one scope
        const consequents = (node as SwitchStatement).cases.flatMap(c => c.consequent);
        this.checkRedeclarations(consequents);
        return this.withScope(this.declaredNames(consequents), () =>
          this.withJumpTarget('switches', () =>
            this.generateSwitchStatement(node as SwitchStatement)
          )
        );
      }
      case 'BreakStatement':
        if ((node as BreakStatement).label) {
          return this.generateLabeledJump(node as BreakStatement, 'break');
        }
        if (this.jumpTargets.loops + this.jumpTargets.switches === 0) {
          this.errors.push(
            `Illegal break statement at line ${node.line}, column ${node.column}: 'шикастан' must be inside a loop or 'интихоб'`
          );
        }
        return this.indent('break;');
      case 'ContinueStatement':
        if ((node as ContinueStatement).label) {
          return this.generateLabeledJump(node as ContinueStatement, 'continue');
        }
        if (this.jumpTargets.loops === 0) {
          this.errors.push(
            `Illegal continue statement at line ${node.line}, column ${node.column}: 'давом' must be inside a loop`
          );
        }
        return this.indent('continue;');
      default: {
        const unknown = node as { type?: string };
        this.errors.push(`Unknown statement type: ${unknown.type ?? 'unknown'}`);
        return '';
      }
    }
  }

  private generateVariableDeclaration(node: VariableDeclaration): string {
    const kind = node.kind === 'СОБИТ' ? 'const' : 'let';
    const pattern = this.generatePattern(node.identifier);
    const init = node.init ? ` = ${this.generateExpression(node.init, PREC.ASSIGNMENT)}` : '';

    return this.indent(`${kind} ${pattern}${init};`);
  }

  private generateFunctionDeclaration(node: FunctionDeclaration): string {
    const async = node.async ? 'async ' : '';
    const star = node.generator ? '*' : '';
    const name = this.generateIdentifier(node.name, true);
    const { params, body } = this.withNewTarget(() =>
      this.generateFunctionParts(node.params, node.body, node.async)
    );

    return this.indent(`${async}function${star} ${name}(${params}) ${body}`);
  }

  /**
   * Parameter list shared by every function form: `а = 1`, `...а` and
   * destructuring patterns. Legacy ASTs may still use bare Identifiers.
   */
  private generateParams(params: Parameter[] | undefined): string {
    return (params ?? [])
      .map(param => {
        if ((param as { type: string }).type === 'Identifier') {
          return this.generateIdentifier(param as unknown as Identifier, true);
        }
        const target = param.pattern
          ? this.generatePattern(param.pattern)
          : this.generateIdentifier(param.name, true);
        const defaultValue = param.defaultValue
          ? ` = ${this.generateExpression(param.defaultValue, PREC.ASSIGNMENT)}`
          : '';
        return `${param.rest ? '...' : ''}${target}${defaultValue}`;
      })
      .join(', ');
  }

  /** Parameter list and body of a function, with the parameters in scope. */
  private generateFunctionParts(
    params: Parameter[] | undefined,
    body: BlockStatement,
    isAsync = false
  ): { params: string; body: string } {
    const paramNames = this.paramNames(params);
    return this.withScope(paramNames, () => ({
      params: this.generateParams(params),
      body: this.withFunctionBoundary(
        () => this.generateBlockStatement(body, [], paramNames),
        Boolean(isAsync)
      ),
    }));
  }

  /**
   * A block as it follows a header on the same line (`if (…) `, `try `, a
   * function signature): it starts with `{` itself, its statements one level
   * deeper than the current indentation and the closing `}` at it.
   *
   * `scopeNames` are bound in the block's scope (a catch parameter); a function
   * body passes its `paramNames` instead, which it may redeclare as functions.
   */
  private generateBlockStatement(
    node: BlockStatement,
    scopeNames: string[] = [],
    paramNames?: string[]
  ): string {
    if (node.body.length === 0) {
      return '{}';
    }

    if (paramNames) {
      this.checkRedeclarations(node.body, paramNames, true);
    } else {
      this.checkRedeclarations(node.body, scopeNames);
    }

    this.indentLevel++;
    const statements = this.withScope([...scopeNames, ...this.declaredNames(node.body)], () =>
      node.body.map(stmt => this.generateStatement(stmt)).filter(stmt => stmt.length > 0)
    );
    this.indentLevel--;

    // A block of empty statements (`{ ; }`) is empty
    if (statements.length === 0) return '{}';
    return `{\n${statements.join('\n')}\n${this.getIndent()}}`;
  }

  private generateReturnStatement(node: ReturnStatement): string {
    if (this.inStaticBlock) {
      this.errors.push(
        `Illegal return statement at line ${node.line}, column ${node.column}: 'бозгашт' cannot be used in a static block`
      );
    }
    const argument = node.argument ? ` ${this.generateExpression(node.argument)}` : '';
    return this.indent(`return${argument};`);
  }

  /**
   * The body of an `if` branch or a loop, emitted after its header: a block
   * as is, a single statement braced and indented one level deeper.
   */
  private generateBody(node: Statement): string {
    if (node.type === 'BlockStatement') {
      return this.generateBlockStatement(node as BlockStatement);
    }
    this.indentLevel++;
    const statement = this.generateStatement(node);
    this.indentLevel--;
    return statement.length > 0 ? `{\n${statement}\n${this.getIndent()}}` : '{}';
  }

  private generateIfStatement(node: IfStatement): string {
    const test = this.generateExpression(node.test);
    let result = this.indent(`if (${test}) `) + this.generateBody(node.consequent);

    if (node.alternate) {
      result += ' else ';
      if (node.alternate.type === 'IfStatement') {
        // `else if` continues this line: drop the nested statement's indentation
        // (but keep its position marker, which follows the indentation)
        result += this.generateStatement(node.alternate).slice(this.getIndent().length);
      } else {
        result += this.generateBody(node.alternate);
      }
    }

    return result;
  }

  private generateWhileStatement(node: WhileStatement): string {
    const test = this.generateExpression(node.test);
    return this.indent(`while (${test}) `) + this.generateBody(node.body);
  }

  private generateDoWhileStatement(node: DoWhileStatement): string {
    const body = this.generateBody(node.body);
    const test = this.generateExpression(node.test);
    return this.indent('do ') + `${body} while (${test});`;
  }

  /**
   * `берун: барои (…) { … }`. As in JavaScript, a label may not repeat one
   * that encloses it, and only labels of loops can be continued.
   */
  private generateLabeledStatement(node: LabeledStatement): string {
    const name = node.label.name;
    if (this.labels.some(label => label.name === name)) {
      this.errors.push(
        `Label '${name}' has already been declared at line ${node.line}, column ${node.column}`
      );
    }
    if (JS_RESERVED_WORDS.has(name)) {
      this.errors.push(
        `'${name}' is a reserved word in JavaScript and cannot be used as a label at line ${node.line}, column ${node.column}`
      );
    }
    let target = node.body;
    while (target?.type === 'LabeledStatement') target = (target as LabeledStatement).body;
    this.labels.push({ name, isLoop: LOOP_TYPES.has(target?.type) });
    try {
      // The body continues the label's line: drop its indentation (but keep
      // its position marker, which follows the indentation)
      const body = this.generateStatement(node.body).slice(this.getIndent().length);
      return this.indent(`${name}: ${body || ';'}`);
    } finally {
      this.labels.pop();
    }
  }

  /** `шикастан берун;` / `давом берун;` */
  private generateLabeledJump(
    node: BreakStatement | ContinueStatement,
    keyword: 'break' | 'continue'
  ): string {
    const name = node.label!.name;
    const label = this.labels.find(candidate => candidate.name === name);
    if (!label) {
      this.errors.push(`Undefined label '${name}' at line ${node.line}, column ${node.column}`);
    } else if (keyword === 'continue' && !label.isLoop) {
      this.errors.push(
        `Illegal continue statement at line ${node.line}, column ${node.column}: '${name}' does not label a loop`
      );
    }
    return this.indent(`${keyword} ${name};`);
  }

  private generateForStatement(node: ForStatement): string {
    const init = node.init ? this.generateStatement(node.init).trim().replace(/;$/, '') : '';
    const test = node.test ? this.generateExpression(node.test) : '';
    const update = node.update ? this.generateExpression(node.update) : '';
    return this.indent(`for (${init}; ${test}; ${update}) `) + this.generateBody(node.body);
  }

  private generateForInStatement(node: ForInStatement): string {
    const left = this.generateStatement(node.left).trim().replace(/;$/, '');
    const right = this.generateExpression(node.right);
    return this.indent(`for (${left} in ${right}) `) + this.generateBody(node.body);
  }

  private generateForOfStatement(node: ForOfStatement): string {
    const left = this.generateStatement(node.left).trim().replace(/;$/, '');
    const right = this.generateExpression(node.right, PREC.ASSIGNMENT);
    const head = node.await ? 'for await' : 'for';
    return this.indent(`${head} (${left} of ${right}) `) + this.generateBody(node.body);
  }

  private generateExpressionStatement(node: ExpressionStatement): string {
    let expr = this.generateExpression(node.expression);
    // A statement starting with these tokens would parse as a block or a declaration
    if (/^(?:\{|function\b|async\s+function\b|class\b|let\s*\[)/.test(expr)) {
      expr = `(${expr})`;
    }
    return this.indent(`${expr};`);
  }

  // eslint-disable-next-line complexity
  /**
   * Generate an expression, wrapping it in parentheses when it binds more
   * loosely than its context requires. `minPrec` is the lowest precedence
   * (see `getPrecedence`) the context accepts without parentheses.
   */
  private generateExpression(expression: Expression, minPrec: number = 0): string {
    // Handle null or undefined node
    if (!expression) {
      return '';
    }

    // Type assertions are erased; what they wrap is parenthesized by its own precedence
    const node = skipAssertions(expression);
    const code = this.generateExpressionNode(node);
    return this.getPrecedence(node, code) < minPrec ? `(${code})` : code;
  }

  /**
   * JavaScript precedence of an expression node: 1 sequence, 2 assignment and
   * arrow, 3 conditional, 4-15 binary operators (`operatorPrecedence`), 16
   * prefix unary/await, 17 postfix update, 19 call/member/new, 20 primary.
   */
  private getPrecedence(node: Expression, code: string): number {
    switch (node.type) {
      case 'BinaryExpression':
        return this.operatorPrecedence.get((node as BinaryExpression).operator) ?? 0;
      case 'UpdateExpression':
        return (node as UpdateExpression).prefix ? PREC.UNARY : PREC.POSTFIX;
      case 'Literal':
        // A negative number is emitted with a leading minus, like a unary expression
        return code.startsWith('-') ? PREC.UNARY : PREC.PRIMARY;
      default:
        return NODE_PRECEDENCE[node.type] ?? PREC.PRIMARY;
    }
  }

  // eslint-disable-next-line complexity
  private generateExpressionNode(node: Expression): string {
    // Use a more direct delegation approach
    const simpleExpressions = [
      'Identifier',
      'Literal',
      'RegExpLiteral',
      'TemplateLiteral',
      'ThisExpression',
      'Super',
      'MetaProperty',
      'PrivateIdentifier',
    ];
    if (simpleExpressions.includes(node.type)) {
      return this.generateSimpleExpression(node);
    }

    const operatorExpressions = [
      'BinaryExpression',
      'UnaryExpression',
      'UpdateExpression',
      'ConditionalExpression',
      'SequenceExpression',
    ];
    if (operatorExpressions.includes(node.type)) {
      return this.generateOperatorExpression(node);
    }

    const callExpressions = [
      'CallExpression',
      'AssignmentExpression',
      'MemberExpression',
      'ChainExpression',
      'TaggedTemplateExpression',
    ];
    if (callExpressions.includes(node.type)) {
      return this.generateCallAssignmentExpression(node);
    }

    const structuralExpressions = ['ArrayExpression', 'ObjectExpression', 'SpreadElement'];
    if (structuralExpressions.includes(node.type)) {
      return this.generateStructuralExpression(node);
    }

    const specialExpressions = [
      'AwaitExpression',
      'NewExpression',
      'ImportExpression',
      'ArrowFunctionExpression',
      'FunctionExpression',
      'YieldExpression',
      'ClassExpression',
    ];
    if (specialExpressions.includes(node.type)) {
      return this.generateSpecialExpression(node);
    }

    return this.handleUnknownExpression(node);
  }

  private generateSimpleExpression(node: Expression): string {
    switch (node.type) {
      case 'Identifier':
        return this.generateIdentifier(node as Identifier);
      case 'Literal':
        return this.generateLiteral(node as Literal);
      case 'RegExpLiteral':
        // Pattern and flags as written; the lexer has validated them
        return `/${(node as RegExpLiteral).pattern}/${(node as RegExpLiteral).flags}`;
      case 'TemplateLiteral':
        return this.generateTemplateLiteral(node as TemplateLiteral);
      case 'ThisExpression':
        return 'this';
      case 'Super':
        return 'super';
      case 'MetaProperty':
        return this.generateNewTarget(node as MetaProperty);
      case 'PrivateIdentifier':
        return this.generatePrivateIdentifier(node as PrivateIdentifier);
      default:
        return this.handleUnknownExpression(node);
    }
  }

  private generateNewTarget(node: MetaProperty): string {
    if (this.newTargetScopes === 0) {
      this.errors.push(
        `new.target expression is not allowed here at line ${node.line}, column ${node.column}: 'нав.target' must be inside a function or class`
      );
    }
    return 'new.target';
  }

  /** `#ном`: it must be declared by an enclosing class, an early error in JavaScript. */
  private generatePrivateIdentifier(node: PrivateIdentifier): string {
    if (!this.privateNames.some(names => names.has(node.name))) {
      this.errors.push(
        `Private field '#${node.name}' must be declared in an enclosing class at line ${node.line}, column ${node.column}`
      );
    }
    return `#${node.name}`;
  }

  /** Run `generate` inside a function or class body, where `нав.target` is allowed. */
  private withNewTarget<T>(generate: () => T): T {
    this.newTargetScopes++;
    try {
      return generate();
    } finally {
      this.newTargetScopes--;
    }
  }

  private generateOperatorExpression(node: Expression): string {
    switch (node.type) {
      case 'BinaryExpression':
        return this.generateBinaryExpression(node as BinaryExpression);
      case 'UnaryExpression':
        return this.generateUnaryExpression(node as UnaryExpression);
      case 'UpdateExpression':
        return this.generateUpdateExpression(node as UpdateExpression);
      case 'ConditionalExpression':
        return this.generateConditionalExpression(node as ConditionalExpression);
      case 'SequenceExpression':
        return (node as SequenceExpression).expressions
          .map(expr => this.generateExpression(expr, PREC.ASSIGNMENT))
          .join(', ');
      default:
        return this.handleUnknownExpression(node);
    }
  }

  private generateCallAssignmentExpression(node: Expression): string {
    switch (node.type) {
      case 'CallExpression':
        return this.generateCallExpression(node as CallExpression);
      case 'AssignmentExpression':
        return this.generateAssignmentExpression(node as AssignmentExpression);
      case 'MemberExpression':
        return this.generateMemberExpression(node as MemberExpression);
      case 'ChainExpression':
        // The parentheses end the optional chain: `(о?.а).б`, `(о?.ф)()`
        return `(${this.generateExpression((node as ChainExpression).expression)})`;
      case 'TaggedTemplateExpression':
        return this.generateTaggedTemplate(node as TaggedTemplateExpression);
      default:
        return this.handleUnknownExpression(node);
    }
  }

  private generateStructuralExpression(node: Expression): string {
    switch (node.type) {
      case 'ArrayExpression':
        return this.generateArrayExpression(node as ArrayExpression);
      case 'ObjectExpression':
        return this.generateObjectExpression(node as ObjectExpression);
      case 'SpreadElement':
        return this.generateSpreadElement(node as SpreadElement);
      default:
        return this.handleUnknownExpression(node);
    }
  }

  private generateSpecialExpression(node: Expression): string {
    switch (node.type) {
      case 'AwaitExpression':
        return this.generateAwaitExpression(node as AwaitExpression);
      case 'NewExpression':
        return this.generateNewExpression(node as NewExpression);
      case 'ImportExpression':
        return this.generateImportExpression(node as ImportExpression);
      case 'ArrowFunctionExpression':
        return this.generateArrowFunctionExpression(node as ArrowFunctionExpression);
      case 'FunctionExpression':
        return this.generateFunctionExpression(node as FunctionExpression);
      case 'YieldExpression':
        return this.generateYieldExpression(node as YieldExpression);
      case 'ClassExpression':
        return this.generateClassExpression(node as ClassExpression);
      default:
        return this.handleUnknownExpression(node);
    }
  }

  private generateFunctionExpression(node: FunctionExpression): string {
    const async = node.async ? 'async ' : '';
    const name = node.name ? ` ${this.generateIdentifier(node.name, true)}` : '';
    // `function* (…)`, `function* ном(…)`
    const head = node.generator ? `function*${name || ' '}` : `function${name}`;
    const { params, body } = this.withNewTarget(() =>
      this.generateFunctionParts(node.params, node.body, node.async)
    );
    return `${async}${head}(${params}) ${body}`;
  }

  private generateYieldExpression(node: YieldExpression): string {
    const keyword = node.delegate ? 'yield*' : 'yield';
    if (!node.argument) return keyword;
    return `${keyword} ${this.generateExpression(node.argument, PREC.ASSIGNMENT)}`;
  }

  private generateArrowFunctionExpression(node: ArrowFunctionExpression): string {
    const async = node.isAsync ? 'async ' : '';

    if (node.body.type === 'BlockStatement') {
      // Block body
      const { params, body } = this.generateFunctionParts(
        node.params,
        node.body as BlockStatement,
        node.isAsync
      );
      return `${async}(${params}) => ${body}`;
    }

    return this.withScope(this.paramNames(node.params), () => {
      const params = this.generateParams(node.params);
      // Expression body; a leading `{` would be parsed as a block
      let body = this.generateExpression(node.body as Expression, PREC.ASSIGNMENT);
      if (body.startsWith('{')) {
        body = `(${body})`;
      }
      return `${async}(${params}) => ${body}`;
    });
  }

  private generateImportExpression(node: ImportExpression): string {
    // Dynamic import: ворид(specifier) -> import(specifier)
    // Handle .som extension conversion for dynamic imports (string specifiers only)
    const source = this.convertSourcePath(this.generateExpression(node.source, PREC.ASSIGNMENT));

    return `import(${source})`;
  }

  private handleUnknownExpression(node: Expression): string {
    const unknown = node as { type?: string };
    this.errors.push(`Unknown expression type: ${unknown.type ?? 'unknown'}`);
    return '';
  }

  private generateImportDeclaration(node: ImportDeclaration): string {
    const specifiers = node.specifiers;
    // Module resolution: convert .som extensions to .js
    const source = this.convertSourcePath(this.generateLiteral(node.source));

    const results: string[] = [];
    const tmpVar = `__somon_import_${this.importCounter++}`;
    results.push(this.indent(`const ${tmpVar} = require(${source});`));

    // Handle default imports
    const defaultImports = specifiers.filter(s => s.type === 'ImportDefaultSpecifier');
    if (defaultImports.length > 0) {
      const localName = this.generateIdentifier(defaultImports[0].local, true);
      results.push(this.indent(`const ${localName} = ${tmpVar}.default ?? ${tmpVar};`));
    }

    const namespaceImport = specifiers.find(s => s.type === 'ImportNamespaceSpecifier') as
      | ImportNamespaceSpecifier
      | undefined;
    if (namespaceImport) {
      results.push(
        this.indent(`const ${this.generateIdentifier(namespaceImport.local, true)} = ${tmpVar};`)
      );
    }

    // Handle named imports
    const namedImports = specifiers.filter(s => s.type === 'ImportSpecifier') as ImportSpecifier[];
    if (namedImports.length > 0) {
      const destructuring = namedImports
        .map(spec => {
          // Exported names are member names: `содир функсия илова` exports `push`
          const imported = translateMemberName(spec.imported.name);
          const local = this.generateIdentifier(spec.local, true);
          return imported === local ? imported : `${imported}: ${local}`;
        })
        .join(', ');
      results.push(this.indent(`const { ${destructuring} } = ${tmpVar};`));
    }

    return results.join('\n');
  }

  private generateExportDeclaration(node: ExportDeclaration): string {
    if (node.declaration) {
      return this.generateExportWithDeclaration(node);
    }

    if (node.specifiers && node.specifiers.length > 0) {
      return this.generateExportWithSpecifiers(node);
    }

    if (node.source) {
      return this.generateWildcardExport(node);
    }

    return '';
  }

  private generateExportWithDeclaration(node: ExportDeclaration): string {
    const declaration = node.declaration!;

    // `содир пешфарз <expression>;`
    if (node.default && declaration.type === 'ExpressionStatement') {
      const value = this.generateExpression(
        (declaration as ExpressionStatement).expression,
        PREC.ASSIGNMENT
      );
      return this.indent(`module.exports.default = ${value};`);
    }

    const code = this.generateStatement(declaration);
    const exportNames = this.extractExportNames(declaration);

    // Type-only declarations don't generate runtime exports
    if (exportNames.length === 0) {
      return code;
    }

    const commonjsExports = node.default
      ? [`module.exports.default = ${exportNames[0]};`]
      : exportNames.map(name => `module.exports.${translateMemberName(name)} = ${name};`);

    return [code.replace(/\n+$/, ''), ...commonjsExports.map(line => this.indent(line))].join('\n');
  }

  private extractExportNames(declaration: Statement): string[] {
    // Interfaces and TypeAlias don't generate runtime code
    if (declaration.type === 'InterfaceDeclaration' || declaration.type === 'TypeAlias') {
      return [];
    }
    const names: string[] = [];
    this.collectDeclaredNames(declaration, names);
    return names;
  }

  private generateExportWithSpecifiers(node: ExportDeclaration): string {
    if (node.source) {
      return this.generateReExportWithSpecifiers(node);
    }
    return this.generateDirectExportSpecifiers(node);
  }

  private generateReExportWithSpecifiers(node: ExportDeclaration): string {
    const source = this.convertSourcePath(this.generateLiteral(node.source!));
    const tmpVar = `__somon_reexport_${this.importCounter++}`;
    const results: string[] = [];

    results.push(this.indent(`const ${tmpVar} = require(${source});`));

    for (const spec of node.specifiers!) {
      const exported = translateMemberName(spec.exported.name);
      const local = translateMemberName(spec.local.name);
      results.push(this.indent(`module.exports.${exported} = ${tmpVar}.${local};`));
    }

    return results.join('\n');
  }

  private generateDirectExportSpecifiers(node: ExportDeclaration): string {
    return node
      .specifiers!.map(spec => {
        const exported = translateMemberName(spec.exported.name);
        const local = this.generateIdentifier(spec.local);
        return this.indent(`module.exports.${exported} = ${local};`);
      })
      .join('\n');
  }

  private generateWildcardExport(node: ExportDeclaration): string {
    const source = this.convertSourcePath(this.generateLiteral(node.source!));
    const tmpVar = `__somon_reexport_${this.importCounter++}`;
    const results: string[] = [];

    results.push(this.indent(`const ${tmpVar} = require(${source});`));
    results.push(this.indent(`Object.keys(${tmpVar}).forEach(key => {`));
    this.indentLevel++;
    results.push(this.indent(`if (key !== 'default') module.exports[key] = ${tmpVar}[key];`));
    this.indentLevel--;
    results.push(this.indent(`});`));

    return results.join('\n');
  }

  /**
   * Rewrite a quoted module specifier for the emitted CommonJS: a trailing
   * `.som` becomes `.js`, and a relative specifier without a JavaScript/JSON
   * extension gets `.js` appended. Anything else is returned unchanged.
   */
  private convertSourcePath(source: string): string {
    const match = /^(["'])(.*)\1$/s.exec(source);
    if (!match) {
      return source;
    }
    const [, quote, specifier] = match;
    if (specifier.endsWith('.som')) {
      return `${quote}${specifier.slice(0, -'.som'.length)}.js${quote}`;
    }
    if (/^\.\.?\//.test(specifier) && !/\.(?:[cm]?js|json)$/.test(specifier)) {
      // For relative imports without extension, add .js
      return `${quote}${specifier}.js${quote}`;
    }
    return source;
  }

  /** `binding`: the identifier declares a name rather than referencing one. */
  private generateIdentifier(node: Identifier, binding: boolean = false): string {
    // In an enum member initializer, earlier members are read by name: `Б = А + ф()`
    const enumMember = binding ? undefined : this.enumMembers?.get(translateMemberName(node.name));
    if (enumMember) {
      return enumMember;
    }

    // Built-in names (`рӯйхат` → `Array`, `чоп` → `console`, …) are mapped only
    // when the program does not declare a binding of that name in scope;
    // otherwise `тағ рӯйхат = []` would shadow the global `Array`.
    const mapped = this.isDeclared(node.name) ? undefined : this.mapBuiltinIdentifier(node.name);
    if (mapped) {
      return mapped;
    }

    // `null`, `true`, `this`, … are fine as values, but never as declared names
    if (JS_RESERVED_WORDS.has(node.name) && (binding || !JS_KEYWORD_EXPRESSIONS.has(node.name))) {
      this.errors.push(
        `'${node.name}' is a reserved word in JavaScript and cannot be used as an identifier at line ${node.line}, column ${node.column}`
      );
    }
    return node.name;
  }

  private mapBuiltinIdentifier(name: string): string | undefined {
    // Map built-in literals
    if (name === 'беқимат') {
      return 'undefined';
    }

    // Handle Хато (capitalized) as Error constructor
    if (name === 'Хато') {
      return 'Error';
    }

    // Map built-in constructors/objects (when used as identifiers)
    const builtinConstructors = [
      'сатр',
      'рӯйхат',
      'объект',
      'математика',
      'Риёзӣ',
      'сатрМетодҳо',
      'ваъда',
      'Ваъда',
    ];
    return builtinConstructors.includes(name) ? BUILTIN_MAPPINGS.get(name) : undefined;
  }

  private isDeclared(name: string): boolean {
    return this.scopes.some(scope => scope.has(name));
  }

  /** Run `generate` with `names` declared in a new innermost scope. */
  private withScope<T>(names: Iterable<string>, generate: () => T): T {
    this.scopes.push(new Set(names));
    try {
      return generate();
    } finally {
      this.scopes.pop();
    }
  }

  /** Run `generate` inside one more loop or `интихоб`. */
  private withJumpTarget<T>(kind: 'loops' | 'switches', generate: () => T): T {
    this.jumpTargets[kind]++;
    try {
      return generate();
    } finally {
      this.jumpTargets[kind]--;
    }
  }

  /**
   * Run `generate` for a function body: loops and labels around the function
   * are not jump targets, and a `бозгашт` returns from the function, not from
   * an enclosing static block. `isAsync`: the function is `ҳамзамон`.
   */
  private withFunctionBoundary<T>(generate: () => T, isAsync = false): T {
    const outer = this.jumpTargets;
    const outerLabels = this.labels;
    const outerAsync = this.inAsyncFunction;
    const outerStaticBlock = this.inStaticBlock;
    this.jumpTargets = { loops: 0, switches: 0 };
    this.labels = [];
    this.inAsyncFunction = isAsync;
    this.inStaticBlock = false;
    try {
      return generate();
    } finally {
      this.jumpTargets = outer;
      this.labels = outerLabels;
      this.inAsyncFunction = outerAsync;
      this.inStaticBlock = outerStaticBlock;
    }
  }

  /**
   * Report a name declared twice in one scope, an early SyntaxError in
   * JavaScript (every SomonScript variable is `let`/`const`). `bound` holds
   * names the scope already binds: parameters (`functionBody`), which a
   * function declaration may reuse, or a catch parameter, which nothing may.
   * Two function declarations of one name are rejected as well: sloppy-mode
   * JavaScript would let the second replace the first, but strict code
   * (ES modules, bundles) rejects it, and it is almost always a mistake.
   */
  private checkRedeclarations(
    statements: Statement[],
    bound: string[] = [],
    functionBody = false
  ): void {
    const declared = new Set<string>();
    for (const stmt of statements) {
      const names: string[] = [];
      this.collectDeclaredNames(stmt, names);
      const declaration =
        stmt.type === 'ExportDeclaration' ? (stmt as ExportDeclaration).declaration : stmt;
      const reusesParam = functionBody && declaration?.type === 'FunctionDeclaration';
      for (const name of names) {
        if (declared.has(name) || (bound.includes(name) && !reusesParam)) {
          this.errors.push(
            `Identifier '${name}' has already been declared at line ${stmt.line}, column ${stmt.column}`
          );
        }
        declared.add(name);
      }
    }
  }

  /** Names bound by the statements of one block (lexical declarations are hoisted to it). */
  private declaredNames(statements: Statement[]): string[] {
    const names: string[] = [];
    for (const stmt of statements) {
      this.collectDeclaredNames(stmt, names);
    }
    return names;
  }

  private collectDeclaredNames(stmt: Statement | null | undefined, names: string[]): void {
    switch (stmt?.type) {
      case 'VariableDeclaration':
        this.collectPatternNames((stmt as VariableDeclaration).identifier, names);
        break;
      case 'FunctionDeclaration':
      case 'ClassDeclaration':
      case 'NamespaceDeclaration':
      case 'EnumDeclaration':
        names.push(
          (stmt as FunctionDeclaration | ClassDeclaration | NamespaceDeclaration | EnumDeclaration)
            .name.name
        );
        break;
      case 'ImportDeclaration':
        names.push(...(stmt as ImportDeclaration).specifiers.map(spec => spec.local.name));
        break;
      case 'ExportDeclaration':
        this.collectDeclaredNames((stmt as ExportDeclaration).declaration, names);
        break;
    }
  }

  private paramNames(params: Parameter[] | undefined): string[] {
    const names: string[] = [];
    for (const param of params ?? []) {
      if ((param as { type: string }).type === 'Identifier') {
        names.push((param as unknown as Identifier).name);
      } else {
        this.collectPatternNames(param.pattern ?? param.name, names);
      }
    }
    return names;
  }

  private collectPatternNames(pattern: PatternNode | null | undefined, names: string[]): void {
    switch (pattern?.type) {
      case 'Identifier':
        names.push(pattern.name);
        break;
      case 'AssignmentPattern':
        this.collectPatternNames(pattern.left, names);
        break;
      case 'SpreadElement':
      case 'RestElement':
        this.collectPatternNames(pattern.argument as PatternNode, names);
        break;
      case 'ArrayPattern':
        pattern.elements.forEach(element => this.collectPatternNames(element, names));
        break;
      case 'ObjectPattern':
        for (const prop of pattern.properties) {
          this.collectPatternNames(
            prop.type === 'PropertyPattern' ? (prop.value ?? (prop.key as Identifier)) : prop,
            names
          );
        }
        break;
    }
  }

  private generateLiteral(node: Literal): string {
    if (typeof node.value === 'string') {
      // Properly escape string literals
      const escaped = node.value
        .replaceAll('\\', '\\\\') // Escape backslashes first
        .replaceAll('"', '\\"') // Escape quotes
        .replaceAll('\n', '\\n') // Escape newlines
        .replaceAll('\t', '\\t') // Escape tabs
        .replaceAll('\r', '\\r') // Escape carriage returns
        .replaceAll('\0', '\\x00'); // Keep NUL out of the output
      return `"${escaped}"`;
    }
    if (node.value === null) {
      return 'null';
    }
    if (typeof node.value === 'number' && CodeGenerator.isNumericLiteralText(node.raw)) {
      // Keep the literal as written: `0xFF`, `1e3`, `.5`, `10n`
      return node.raw;
    }
    return String(node.value);
  }

  private static isNumericLiteralText(raw: unknown): raw is string {
    return (
      typeof raw === 'string' &&
      /^(?:0[xX][0-9a-fA-F]+n?|0[oO][0-7]+n?|0[bB][01]+n?|\d+n|(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)$/.test(
        raw
      )
    );
  }

  private generateTemplateLiteral(node: TemplateLiteral): string {
    let result = '`';

    for (let i = 0; i < node.quasis.length; i++) {
      const quasi = node.quasis[i];

      // Emit the decoded text, re-escaping whatever would end or reinterpret
      // the template: `\`, a backtick, `${`, and CR (which JS normalises to LF).
      const text = quasi.value.cooked ?? quasi.value.raw;
      result += text
        .replace(/\\|`|\$\{/g, match => `\\${match}`)
        .replaceAll('\r', '\\r')
        .replaceAll('\0', '\\x00');

      // Add the expression part if it exists
      if (i < node.expressions.length) {
        result += '${';
        result += this.generateExpression(node.expressions[i]);
        result += '}';
      }
    }

    result += '`';
    return result;
  }

  /**
   * `тег\`…\``: the tag receives the text as written (`String.raw`), so the
   * quasis are emitted raw rather than re-escaped from their cooked value.
   */
  private generateTaggedTemplate(node: TaggedTemplateExpression): string {
    const tag = this.generateExpression(node.tag, PREC.CALL);
    const { quasis, expressions } = node.quasi;
    let template = '';
    quasis.forEach((quasi, i) => {
      // Line terminators are LF in raw text too; NUL is the position marker
      template += quasi.value.raw.replace(/\r\n?/g, '\n').replaceAll('\0', '\\x00');
      if (i < expressions.length) {
        template += `\${${this.generateExpression(expressions[i])}}`;
      }
    });
    return `${tag}\`${template}\``;
  }

  private generateBinaryExpression(node: BinaryExpression): string {
    const precedence = this.operatorPrecedence.get(node.operator) ?? 0;
    // `**` is right-associative, and `-а ** б` is a SyntaxError, so its left
    // operand must bind tighter than a unary expression. Every other binary
    // operator is left-associative: an equal-precedence right operand needs
    // parentheses (`а - (б - в)`).
    const isExponent = node.operator === '**';
    const left = this.generateExpression(node.left, isExponent ? PREC.UNARY + 1 : precedence);
    const right = this.generateExpression(node.right, isExponent ? precedence : precedence + 1);

    return `${this.wrapMixedNullish(node, node.left, left)} ${node.operator} ${this.wrapMixedNullish(node, node.right, right)}`;
  }

  /** `??` cannot be combined with an unparenthesised `&&` or `||` operand. */
  private wrapMixedNullish(parent: BinaryExpression, operand: Expression, code: string): string {
    const child = skipAssertions(operand);
    if (parent.operator !== '??' || child.type !== 'BinaryExpression') {
      return code;
    }
    const operator = (child as BinaryExpression).operator;
    return operator === '&&' || operator === '||' ? `(${code})` : code;
  }

  private generateConditionalExpression(node: ConditionalExpression): string {
    const test = this.generateExpression(node.test, PREC.CONDITIONAL + 1);
    const consequent = this.generateExpression(node.consequent, PREC.ASSIGNMENT);
    const alternate = this.generateExpression(node.alternate, PREC.ASSIGNMENT);
    return `${test} ? ${consequent} : ${alternate}`;
  }

  private generateUnaryExpression(node: UnaryExpression): string {
    const target = node.argument as MemberExpression;
    if (node.operator === 'delete' && target.property?.type === 'PrivateIdentifier') {
      this.errors.push(
        `Private fields can not be deleted at line ${node.line}, column ${node.column}`
      );
    }
    const argument = this.generateExpression(node.argument, PREC.UNARY);
    // Word operators (`typeof`, `void`, `delete`) need a space, and so does
    // `- -а` / `+ +а`, which would otherwise read as `--а` / `++а`.
    const needsSpace =
      /^[a-z]/.test(node.operator) ||
      ((node.operator === '-' || node.operator === '+') && argument.startsWith(node.operator));
    return `${node.operator}${needsSpace ? ' ' : ''}${argument}`;
  }

  private generateUpdateExpression(node: UpdateExpression): string {
    const argument = this.generateExpression(node.argument, PREC.POSTFIX + 1);
    if (node.prefix) {
      return `${node.operator}${argument}`;
    } else {
      return `${argument}${node.operator}`;
    }
  }

  private generateCallExpression(node: CallExpression): string {
    let callee = this.generateExpression(node.callee, PREC.CALL);

    // Special handling for нишондиҳӣ function
    if (callee === 'нишондиҳӣ') {
      callee = 'console.log';
    }

    const args = this.generateArguments(node.arguments);
    return `${callee}${node.optional ? '?.' : ''}(${args})`;
  }

  /** Call/new argument list; elements may be `SpreadElement`s. */
  private generateArguments(args: Expression[] | undefined): string {
    return (args ?? [])
      .map(arg =>
        arg.type === 'SpreadElement'
          ? this.generateSpreadElement(arg as SpreadElement)
          : this.generateExpression(arg, PREC.ASSIGNMENT)
      )
      .join(', ');
  }

  private generateAssignmentExpression(node: AssignmentExpression): string {
    const target = node.left as Expression | ArrayPattern | ObjectPattern;
    const left =
      target.type === 'ArrayPattern' || target.type === 'ObjectPattern'
        ? this.generatePattern(target as ArrayPattern | ObjectPattern)
        : this.generateExpression(node.left);
    const right = this.generateExpression(node.right, PREC.ASSIGNMENT);
    return `${left} ${node.operator} ${right}`;
  }

  /**
   * Try to map object name if it's a built-in object
   */
  private mapBuiltinObject(
    node: MemberExpression,
    object: string
  ): { mapped: string; wasMapped: boolean } {
    const objectNode = skipAssertions(node.object);
    if (objectNode.type !== 'Identifier') {
      return { mapped: object, wasMapped: false };
    }

    const objectName = (objectNode as Identifier).name;
    const builtinObjects = ['чоп', 'математика', 'объект', 'Риёзӣ', 'сатр', 'сатрМетодҳо'];

    if (!builtinObjects.includes(objectName) || this.isDeclared(objectName)) {
      return { mapped: object, wasMapped: false };
    }

    const mappedObject = BUILTIN_MAPPINGS.get(objectName);
    if (mappedObject) {
      return { mapped: mappedObject, wasMapped: true };
    }

    return { mapped: object, wasMapped: false };
  }

  /**
   * Check if object looks like a user class instance
   */

  /**
   * Try to map property name based on context
   */
  private mapPropertyName(node: MemberExpression, property: string, objectMapped: boolean): string {
    if (node.computed || node.property.type !== 'Identifier') {
      return property;
    }

    const propertyName = (node.property as Identifier).name;
    const mappedProperty = BUILTIN_MAPPINGS.get(propertyName);
    if (!mappedProperty) {
      return property;
    }

    // Always map if the property is a recognised Tajik builtin method name.
    // The previous `looksLikeClassInstance` heuristic (lowercase Cyrillic +
    // underscore) created asymmetry with MethodDefinition emission: a class
    // method declared as `илова` emits `push`, but a call on `list_name.илова`
    // would not — runtime "not a function". Consistency beats the heuristic:
    // if the user names a class method after a builtin, both sides rewrite.
    const shouldMap = objectMapped || MEMBER_ALIASES.has(propertyName);
    return shouldMap ? mappedProperty : property;
  }

  private generateMemberExpression(node: MemberExpression): string {
    if (node.object.type === 'Super' && node.property.type === 'PrivateIdentifier') {
      this.errors.push(
        `Unexpected private field '#${(node.property as PrivateIdentifier).name}' after 'супер' at line ${node.property.line}, column ${node.property.column}`
      );
    }
    let object = this.generateExpression(node.object, PREC.CALL);
    // `5.toFixed()` would read the dot as a decimal point
    if (skipAssertions(node.object).type === 'Literal' && /^\d+$/.test(object)) {
      object = `(${object})`;
    }
    // A property name is not a variable reference: emit it verbatim (subject
    // to the member-name mapping below), never as a mapped/checked identifier.
    let property =
      !node.computed && node.property.type === 'Identifier'
        ? (node.property as Identifier).name
        : this.generateExpression(node.property);

    const { mapped: mappedObject, wasMapped: objectMapped } = this.mapBuiltinObject(node, object);
    object = mappedObject;

    property = this.mapPropertyName(node, property, objectMapped);

    // Special case: чоп.хато should become console.error
    if (object === 'console' && property === 'Error') {
      property = 'error';
    }

    if (node.computed) {
      return `${object}${node.optional ? '?.' : ''}[${property}]`;
    }
    return `${object}${node.optional ? '?.' : '.'}${property}`;
  }

  private generateArrayExpression(node: ArrayExpression): string {
    return `[${this.generateArguments(node.elements)}]`;
  }

  private generateObjectExpression(node: ObjectExpression): string {
    const properties = node.properties
      .map(prop => {
        if (prop.type === 'SpreadElement') {
          return this.generateSpreadElement(prop);
        }
        return this.generateProperty(prop);
      })
      .join(', ');

    return `{${properties}}`;
  }

  private generateProperty(prop: Property): string {
    const key = prop.computed
      ? `[${this.generateExpression(prop.key, PREC.ASSIGNMENT)}]`
      : this.generatePropertyKey(prop.key);
    if (prop.method && prop.value.type === 'FunctionExpression') {
      const fn = prop.value as FunctionExpression;
      const asyncPrefix = prop.kind ? `${prop.kind} ` : fn.async ? 'async ' : '';
      const star = fn.generator ? '*' : '';
      const { params, body } = this.withNewTarget(() =>
        this.generateFunctionParts(fn.params, fn.body, fn.async)
      );
      return `${asyncPrefix}${star}${key}(${params}) ${body}`;
    }
    const value = this.generateExpression(prop.value, PREC.ASSIGNMENT);
    return `${key}: ${value}`;
  }

  /**
   * Non-computed key of an object literal, class member or destructuring
   * pattern. Identifier keys go through the same Tajik→JS member-name mapping
   * as `о.ном` accesses (`translateMemberName`), so user objects round-trip.
   */
  private generatePropertyKey(key: Identifier | Literal): string {
    if (key.type === 'Identifier') {
      return translateMemberName((key as Identifier).name);
    }
    return this.generateLiteral(key as Literal);
  }

  private generateTryStatement(node: TryStatement): string {
    let result = this.indent('try ') + this.generateBlockStatement(node.block);

    if (node.handler) {
      const param = node.handler.param;
      // A parameterless catch stays parameterless (ES2019) so it cannot shadow
      // an outer variable such as `error`.
      result += param
        ? ` catch (${this.withScope([param.name], () => this.generateIdentifier(param, true))}) `
        : ' catch ';
      result += this.generateBlockStatement(node.handler.body, param ? [param.name] : []);
    }

    if (node.finalizer) {
      result += ' finally ';
      result += this.generateBlockStatement(node.finalizer);
    }

    return result;
  }

  private generateThrowStatement(node: ThrowStatement): string {
    const argument = this.generateExpression(node.argument);
    return this.indent(`throw ${argument};`);
  }

  private generateAwaitExpression(node: AwaitExpression): string {
    const argument = this.generateExpression(node.argument, PREC.UNARY);
    return `await ${argument}`;
  }

  private generateNewExpression(node: NewExpression): string {
    let callee = this.generateExpression(node.callee, PREC.CALL);
    // `new f().К()` would call `new f()`; a call or optional link anywhere in
    // the callee's member chain needs parentheses: `new (f().К)()`.
    if (this.chainContainsCall(node.callee)) {
      callee = `(${callee})`;
    }
    return `new ${callee}(${this.generateArguments(node.arguments)})`;
  }

  private chainContainsCall(node: Expression): boolean {
    let current = skipAssertions(node);
    while (current.type === 'MemberExpression' || current.type === 'TaggedTemplateExpression') {
      if (current.type === 'TaggedTemplateExpression') {
        current = skipAssertions((current as TaggedTemplateExpression).tag);
        continue;
      }
      const memberExpr = current as MemberExpression;
      if (memberExpr.optional) {
        return true;
      }
      current = skipAssertions(memberExpr.object);
    }
    return current.type === 'CallExpression';
  }

  private generateInterfaceDeclaration(node: InterfaceDeclaration): string {
    // Interfaces are TypeScript-only constructs, so we generate a comment in JavaScript
    // They should NOT generate any executable code at all
    const name = node.name.name;

    return this.indent(`// Interface: ${name}\n`);
  }

  private generateTypeAlias(node: TypeAlias): string {
    // Type aliases are TypeScript-only constructs, so we generate a comment in JavaScript
    const name = node.name.name;
    return this.indent(`// Type alias: ${name}\n`);
  }

  /**
   * `шумориш Ранг { Сурх, Сабз = 5, Ном = "н" }` (also `собит шумориш`) as
   * TypeScript emits an enum:
   *
   *   var Ранг;
   *   (function (Ранг) {
   *     Ранг[Ранг["Сурх"] = 0] = "Сурх";
   *     Ранг[Ранг["Сабз"] = 5] = "Сабз";
   *     Ранг["Ном"] = "н";
   *   })(Ранг || (Ранг = {}));
   *
   * Constant initializers (literals, arithmetic, earlier members) are folded,
   * string members get no reverse mapping, and a member without initializer
   * is the previous numeric member plus one. Member names go through the
   * member-name mapping, like `Ранг.дарозӣ` (→ `Ранг.length`) does.
   */
  private generateEnumDeclaration(node: EnumDeclaration): string {
    const name = this.generateIdentifier(node.name, true);
    // At the top level a `var`, as TypeScript emits it; in a block a `let`,
    // which stays in the block like every SomonScript declaration
    const keyword = this.scopes.length <= 1 ? 'var' : 'let';
    const values = new Map<string, number | string>();
    const earlier = new Map<string, string>();
    let previous: number | string | undefined = -1;

    this.indentLevel++;
    const lines = node.members.map(member => {
      const key =
        member.id.type === 'Identifier'
          ? translateMemberName((member.id as Identifier).name)
          : String((member.id as Literal).value);
      const keyText = this.enumValueText(key);
      let value: number | string | undefined;
      let code: string;
      if (member.initializer) {
        value = this.enumConstant(member.initializer, node.name.name, values);
        code =
          value === undefined
            ? this.withEnumMembers(earlier, () =>
                this.generateExpression(member.initializer!, PREC.ASSIGNMENT)
              )
            : this.enumValueText(value);
      } else if (typeof previous === 'number') {
        value = previous + 1;
        code = this.enumValueText(value);
      } else {
        this.errors.push(
          `Enum member '${key}' must have an initializer at line ${member.line}, column ${member.column}`
        );
        code = 'undefined';
      }
      if (value !== undefined) values.set(key, value);
      earlier.set(
        key,
        /^[\p{L}_$][\p{L}\p{N}\p{M}_$]*$/u.test(key) ? `${name}.${key}` : `${name}[${keyText}]`
      );
      previous = value;
      return typeof value === 'string'
        ? this.indent(`${name}[${keyText}] = ${code};`)
        : this.indent(`${name}[${name}[${keyText}] = ${code}] = ${keyText};`);
    });
    this.indentLevel--;

    const body = lines.length > 0 ? `{\n${lines.join('\n')}\n${this.getIndent()}}` : '{}';
    return [
      this.indent(`${keyword} ${name};`),
      this.indent(`(function (${name}) ${body})(${name} || (${name} = {}));`),
    ].join('\n');
  }

  /** Runs `generate` with earlier enum members readable by name (`Б = А + ф()`). */
  private withEnumMembers<T>(members: Map<string, string>, generate: () => T): T {
    const outer = this.enumMembers;
    this.enumMembers = new Map(members);
    try {
      return generate();
    } finally {
      this.enumMembers = outer;
    }
  }

  private enumValueText(value: number | string): string {
    if (typeof value === 'string') {
      return this.generateLiteral({ type: 'Literal', value, raw: '', line: 0, column: 0 });
    }
    return Object.is(value, -0) ? '-0' : String(value);
  }

  /**
   * Value of a constant enum initializer: number and string literals, `+ - ~`,
   * arithmetic, bitwise and `+` concatenation, and earlier members (`А`,
   * `Ранг.А`). Undefined when the value is only known at run time.
   */
  private enumConstant(
    expr: Expression,
    enumName: string,
    values: Map<string, number | string>
  ): number | string | undefined {
    const operand = (e: Expression) => this.enumConstant(e, enumName, values);
    switch (expr.type) {
      case 'Literal': {
        const { value, raw } = expr as Literal;
        if (typeof value === 'string') return value;
        return typeof value === 'number' && !/n$/.test(raw ?? '') ? value : undefined;
      }
      case 'TemplateLiteral': {
        const template = expr as TemplateLiteral;
        if (template.expressions.length > 0) return undefined;
        return template.quasis.map(quasi => quasi.value.cooked ?? quasi.value.raw).join('');
      }
      case 'Identifier':
        return values.get(translateMemberName((expr as Identifier).name));
      case 'MemberExpression':
        return CodeGenerator.enumMemberConstant(expr as MemberExpression, enumName, values);
      case 'UnaryExpression': {
        const unary = expr as UnaryExpression;
        return CodeGenerator.foldUnary(unary.operator, operand(unary.argument));
      }
      case 'BinaryExpression': {
        const binary = expr as BinaryExpression;
        return CodeGenerator.foldBinary(
          binary.operator,
          operand(binary.left),
          operand(binary.right)
        );
      }
      default:
        return undefined;
    }
  }

  /** `Ранг.А` / `Ранг["А"]` naming an earlier member of the enum `enumName`. */
  private static enumMemberConstant(
    member: MemberExpression,
    enumName: string,
    values: Map<string, number | string>
  ): number | string | undefined {
    if (member.object.type !== 'Identifier' || (member.object as Identifier).name !== enumName) {
      return undefined;
    }
    const property = member.property as Identifier | Literal;
    if (!member.computed && property.type === 'Identifier') {
      return values.get(translateMemberName((property as Identifier).name));
    }
    const literal = property as Literal;
    return property.type === 'Literal' && typeof literal.value === 'string'
      ? values.get(literal.value)
      : undefined;
  }

  private static foldUnary(
    operator: string,
    argument: number | string | undefined
  ): number | undefined {
    if (typeof argument !== 'number') return undefined;
    if (operator === '+') return argument;
    if (operator === '-') return -argument;
    return operator === '~' ? ~argument : undefined;
  }

  private static foldBinary(
    operator: string,
    left: number | string | undefined,
    right: number | string | undefined
  ): number | string | undefined {
    if (left === undefined || right === undefined) return undefined;
    if (operator === '+') {
      return typeof left === 'number' && typeof right === 'number'
        ? left + right
        : `${left}${right}`;
    }
    if (typeof left !== 'number' || typeof right !== 'number') return undefined;
    return CodeGenerator.foldNumeric(operator, left, right);
  }

  private static foldNumeric(operator: string, left: number, right: number): number | undefined {
    switch (operator) {
      case '-':
        return left - right;
      case '*':
        return left * right;
      case '/':
        return left / right;
      case '%':
        return left % right;
      case '**':
        return left ** right;
      case '<<':
        return left << right;
      case '>>':
        return left >> right;
      case '>>>':
        return left >>> right;
      case '&':
        return left & right;
      case '|':
        return left | right;
      case '^':
        return left ^ right;
      default:
        return undefined;
    }
  }

  private generateNamespaceDeclaration(node: NamespaceDeclaration): string {
    // Generate namespace as an IIFE (Immediately Invoked Function Expression)
    const name = this.generateIdentifier(node.name, true);

    // A local binding, so the namespace never leaks into (or, in strict code,
    // fails on) the global scope
    let result = this.indent(`const ${name} = (function() {\n`);
    this.indentLevel++;
    result += this.indent(`const ${name} = {};\n`);

    // Generate namespace body
    const statements = node.body?.statements ?? [];
    // The body shares the IIFE's scope with the `const ${name} = {}` above
    this.checkRedeclarations(statements, [node.name.name]);
    this.scopes.push(new Set(this.declaredNames(statements)));
    this.withFunctionBoundary(() => {
      for (const stmt of statements) {
        const isExported = (stmt as Statement & { exported?: boolean }).exported;

        // Skip interface declarations and type aliases - they don't generate runtime code
        if (stmt.type === 'InterfaceDeclaration' || stmt.type === 'TypeAlias') {
          result += this.generateStatement(stmt);
          continue;
        }

        const code = isExported
          ? this.generateExportedNamespaceMember(stmt, name)
          : this.generateStatement(stmt);
        result += code && !code.endsWith('\n') ? `${code}\n` : code;
      }
    });
    this.scopes.pop();

    result += this.indent(`return ${name};\n`);
    this.indentLevel--;
    result += this.indent('})();\n');
    if (node.exported) {
      result += this.indent(`module.exports.${translateMemberName(name)} = ${name};\n`);
    }

    return result;
  }

  private generateExportedNamespaceMember(stmt: Statement, namespaceName: string): string {
    const memberName = this.getMemberName(stmt);
    if (!memberName) {
      return '';
    }

    if (stmt.type === 'NamespaceDeclaration') {
      return this.generateNestedNamespaceExport(
        stmt as NamespaceDeclaration,
        namespaceName,
        memberName
      );
    }

    // For functions, variables, classes
    const stmtCode = this.generateStatement(stmt);
    let result = stmtCode;
    if (stmtCode.trim() && stmt.type !== 'ExpressionStatement') {
      // Ensure there's a newline before the assignment if stmtCode doesn't end with one
      if (!stmtCode.endsWith('\n')) {
        result += '\n';
      }
      result += this.indent(
        `${namespaceName}.${translateMemberName(memberName)} = ${memberName};\n`
      );
    }
    return result;
  }

  private generateNestedNamespaceExport(
    nestedNs: NamespaceDeclaration,
    parentName: string,
    memberName: string
  ): string {
    // Remove the exported flag for nested generation
    const originalExported = nestedNs.exported;
    nestedNs.exported = false;
    const nestedCode = this.generateStatement(nestedNs).trim();
    nestedNs.exported = originalExported;

    // Generate as a property of parent namespace
    // Remove the initial assignment part from the nested code (e.g., "Дарунӣ = ")
    const assignmentStart = nestedCode.indexOf('= (function()');
    const nestedIIFE =
      assignmentStart !== -1
        ? nestedCode.substring(assignmentStart + 2) // Skip "= "
        : nestedCode;

    return this.indent(`${parentName}.${translateMemberName(memberName)} = ${nestedIIFE}`);
  }

  private getMemberName(stmt: Statement): string | null {
    switch (stmt.type) {
      case 'FunctionDeclaration':
        return (stmt as FunctionDeclaration).name.name;
      case 'VariableDeclaration': {
        const varDecl = stmt as VariableDeclaration;
        if (varDecl.identifier && varDecl.identifier.type === 'Identifier') {
          return varDecl.identifier.name;
        }
        break;
      }
      case 'ClassDeclaration':
        return (stmt as ClassDeclaration).name.name;
      case 'NamespaceDeclaration':
        return (stmt as NamespaceDeclaration).name.name;
      case 'EnumDeclaration':
        return (stmt as EnumDeclaration).name.name;
    }
    return null;
  }

  private generateClassDeclaration(node: ClassDeclaration): string {
    return this.indent(this.generateClass(node));
  }

  /** `синф { … }` as an expression; its own name is in scope in its body only. */
  private generateClassExpression(node: ClassExpression): string {
    return this.withScope(node.name ? [node.name.name] : [], () => this.generateClass(node));
  }

  /** `class Ном extends Асос { … }`, members one level deeper than the current indentation. */
  private generateClass(node: ClassDeclaration | ClassExpression): string {
    const className = node.name ? ` ${this.generateIdentifier(node.name, true)}` : '';
    const extendsClause = node.superClass
      ? ` extends ${this.generateIdentifier(node.superClass)}`
      : '';
    // Note: JavaScript doesn't support abstract classes, so we skip the abstract modifier

    let classBody = '';

    // Generate class members, one level deeper than the class
    if (node.body && node.body.body) {
      this.privateNames.push(this.declaredPrivateNames(node));
      this.indentLevel++;
      const members = node.body.body
        .map(member => {
          switch (member.type) {
            case 'MethodDefinition':
              return this.generateMethodDefinition(member as MethodDefinition);
            case 'PropertyDefinition':
              return this.generatePropertyDefinition(member as PropertyDefinition);
            case 'StaticBlock':
              return this.generateStaticBlock(member as StaticBlock);
            default:
              return '';
          }
        })
        .filter((member: string) => member.length > 0);
      this.indentLevel--;
      this.privateNames.pop();

      if (members.length > 0) {
        classBody = '\n' + members.join('\n') + '\n' + this.getIndent();
      }
    }

    return `class${className}${extendsClause} {${classBody}}`;
  }

  /**
   * `static { … }`: unlike a function body, `бозгашт` is not allowed; like
   * one, loops around the class are not jump targets.
   */
  private generateStaticBlock(node: StaticBlock): string {
    const block: BlockStatement = {
      type: 'BlockStatement',
      body: node.body,
      line: node.line,
      column: node.column,
    };
    // `нав.target` is allowed (and `беқимат`) in a static block
    const body = this.withNewTarget(() =>
      this.withFunctionBoundary(() => {
        this.inStaticBlock = true;
        return this.generateBlockStatement(block);
      })
    );
    return this.indent(`static ${body}`);
  }

  /**
   * Private names a class declares. Declaring one twice is an early error,
   * except for a getter and a setter of the same name.
   */
  private declaredPrivateNames(node: ClassDeclaration | ClassExpression): Set<string> {
    const declared = new Map<string, string>();
    for (const member of node.body.body) {
      if (member.type === 'StaticBlock' || member.key?.type !== 'PrivateIdentifier') continue;
      const name = member.key.name;
      const kind = member.type === 'MethodDefinition' ? member.kind : 'field';
      const previous = declared.get(name);
      const accessorPair =
        (previous === 'get' && kind === 'set') || (previous === 'set' && kind === 'get');
      if (previous !== undefined && !accessorPair) {
        this.errors.push(
          `Identifier '#${name}' has already been declared at line ${member.key.line}, column ${member.key.column}`
        );
      }
      declared.set(name, accessorPair ? 'pair' : kind);
    }
    return new Set(declared.keys());
  }

  /** A class member name: `#ном` as written, other names through the member-name mapping. */
  private generateMemberKey(key: Identifier | PrivateIdentifier): string {
    return key.type === 'PrivateIdentifier'
      ? this.generatePrivateIdentifier(key as PrivateIdentifier)
      : translateMemberName(key.name);
  }

  private generateMethodDefinition(node: MethodDefinition): string {
    // Method names follow the same member-name mapping as `obj.маълумот()`
    // call sites (`translateMemberName`), so declaration and use agree.
    const name = node.kind === 'constructor' ? 'constructor' : this.generateMemberKey(node.key);
    const accessor = node.kind === 'get' || node.kind === 'set' ? `${node.kind} ` : '';
    const methodName = `${accessor}${name}`;
    const isStatic = node.static ? 'static ' : '';
    const isAsync = node.value?.async ? 'async ' : '';
    const star = node.value?.generator ? '*' : '';

    // Skip abstract methods - they don't exist in JavaScript
    if (node.abstract) {
      return '';
    }

    // Handle cases where body might be null or undefined
    if (!node.value || !node.value.body) {
      const params = this.withScope(this.paramNames(node.value?.params), () =>
        this.generateParams(node.value?.params)
      );
      return this.indent(`${isStatic}${isAsync}${star}${methodName}(${params}) {}`);
    }
    const body =
      node.kind === 'constructor' ? this.withParameterProperties(node.value) : node.value.body;
    const { params, body: code } = this.withNewTarget(() =>
      this.generateFunctionParts(node.value.params, body, node.value.async)
    );
    return this.indent(`${isStatic}${isAsync}${star}${methodName}(${params}) ${code}`);
  }

  /**
   * The constructor body with `this.х = х;` for each parameter property
   * (`конструктор(хосусӣ х: рақам)`), placed as TypeScript places them: at
   * the start, or right after the `супер(…)` call among the body's statements.
   */
  private withParameterProperties(constructor: FunctionExpression): BlockStatement {
    const assignments = constructor.params
      .filter(param => param.accessibility || param.readonly)
      .map(param => {
        const { line, column } = param;
        const target: MemberExpression = {
          type: 'MemberExpression',
          object: { type: 'ThisExpression', line, column },
          property: { ...param.name },
          computed: false,
          line,
          column,
        };
        const assignment: AssignmentExpression = {
          type: 'AssignmentExpression',
          left: target,
          operator: '=',
          right: param.name,
          line,
          column,
        };
        return { type: 'ExpressionStatement', expression: assignment, line, column };
      });
    if (assignments.length === 0) return constructor.body;

    const statements = constructor.body.body;
    const superCall = statements.findIndex(statement => {
      const expression = (statement as ExpressionStatement).expression;
      return (
        statement.type === 'ExpressionStatement' &&
        expression.type === 'CallExpression' &&
        (expression as CallExpression).callee.type === 'Super'
      );
    });
    return {
      ...constructor.body,
      body: [
        ...statements.slice(0, superCall + 1),
        ...assignments,
        ...statements.slice(superCall + 1),
      ],
    };
  }

  private generatePropertyDefinition(node: PropertyDefinition): string {
    const propertyName = this.generateMemberKey(node.key);
    const isStatic = node.static ? 'static ' : '';
    // A field initializer may use `нав.target` (it is `беқимат` there)
    const value = node.value;
    const initializer = value
      ? ` = ${this.withNewTarget(() => this.generateExpression(value, PREC.ASSIGNMENT))}`
      : '';

    return this.indent(`${isStatic}${propertyName}${initializer};`);
  }

  private generateSwitchStatement(node: SwitchStatement): string {
    const discriminant = this.generateExpression(node.discriminant);

    // Case labels one level deeper than `switch`, their statements two
    this.indentLevel++;
    const cases = node.cases
      .map((switchCase: SwitchCase) => {
        const label = switchCase.test
          ? `case ${this.generateExpression(switchCase.test)}:`
          : 'default:';
        this.indentLevel++;
        const consequent = switchCase.consequent
          .map(stmt => this.generateStatement(stmt))
          .filter(stmt => stmt.length > 0);
        this.indentLevel--;
        return [this.indent(label), ...consequent].join('\n');
      })
      .join('\n');
    this.indentLevel--;

    return this.indent(`switch (${discriminant}) {\n${cases}\n${this.getIndent()}}`);
  }

  // Pattern generation methods
  private generatePattern(node: PatternNode): string {
    switch (node.type) {
      case 'Identifier':
        return this.generateIdentifier(node, true);
      case 'AssignmentPattern':
        return `${this.generatePattern(node.left)} = ${this.generateExpression(node.right, PREC.ASSIGNMENT)}`;
      case 'ArrayPattern':
        return this.generateArrayPattern(node);
      case 'ObjectPattern':
        return this.generateObjectPattern(node);
      case 'SpreadElement':
      case 'RestElement':
        return `...${this.generatePattern(node.argument as PatternNode)}`;
      default: {
        const unknown = node as { type?: string };
        this.errors.push(`Unknown pattern type: ${unknown.type ?? 'unknown'}`);
        return '';
      }
    }
  }

  private generateArrayPattern(node: ArrayPattern): string {
    const elements = node.elements
      .map(element => {
        return element === null ? '' : this.generatePattern(element);
      })
      .join(', ');

    return `[${elements}]`;
  }

  private generateObjectPattern(node: ObjectPattern): string {
    const properties = node.properties
      .map(prop => {
        return prop.type === 'SpreadElement'
          ? this.generatePattern(prop)
          : this.generatePropertyPattern(prop as PropertyPattern);
      })
      .join(', ');

    return `{${properties}}`;
  }

  private generatePropertyPattern(node: PropertyPattern): string {
    const key = node.computed
      ? `[${this.generateExpression(node.key as Expression, PREC.ASSIGNMENT)}]`
      : this.generatePropertyKey(node.key);
    // Shorthand `{ п }` binds a variable named like the key
    const value = node.value ?? (node.key as Identifier);

    const local = this.generatePattern(value);
    return !node.computed && local === key ? key : `${key}: ${local}`;
  }

  private generateSpreadElement(node: SpreadElement): string {
    const argument = this.generateExpression(node.argument, PREC.ASSIGNMENT);
    return `...${argument}`;
  }

  private indent(text: string): string {
    return this.getIndent() + text;
  }

  private getIndent(): string {
    return ' '.repeat(this.indentLevel * this.indentSize);
  }
}

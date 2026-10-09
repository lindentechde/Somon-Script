import {
  Token,
  TokenType,
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
  ExpressionStatement,
  Identifier,
  Literal,
  BinaryExpression,
  UnaryExpression,
  UpdateExpression,
  CallExpression,
  ChainExpression,
  ConditionalExpression,
  SequenceExpression,
  AssignmentPattern,
  ArrowFunctionExpression,
  AssignmentExpression,
  MemberExpression,
  ImportDeclaration,
  ImportSpecifier,
  ImportDefaultSpecifier,
  ImportNamespaceSpecifier,
  ImportExpression,
  ExportDeclaration,
  ExportSpecifier,
  ArrayExpression,
  TypeAnnotation,
  TypeNode,
  PrimitiveType,
  ArrayType,
  UnionType,
  IntersectionType,
  GenericType,
  TupleType,
  FunctionType,
  InterfaceDeclaration,
  PropertySignature,
  TypeParameter,
  TypeAlias,
  MappedType,
  ObjectType,
  KeyofType,
  IndexedAccessType,
  NamespaceDeclaration,
  Parameter,
  UniqueType,
  LiteralType,
  ConditionalType,
  AwaitExpression,
  NewExpression,
  TryStatement,
  CatchClause,
  ThrowStatement,
  ArrayPattern,
  ObjectPattern,
  PropertyPattern,
  SpreadElement,
  ObjectExpression,
  Property,
  TemplateLiteral,
  TemplateElement,
  // Added explicit imports for nodes previously redeclared locally
  ForStatement,
  ForInStatement,
  ForOfStatement,
  ClassDeclaration,
  ClassBody,
  MethodDefinition,
  PropertyDefinition,
  SwitchStatement,
  SwitchCase,
  BreakStatement,
  ContinueStatement,
  AsExpression,
  TypeAssertion,
  SatisfiesExpression,
  NonNullExpression,
} from './types';
import { Lexer } from './lexer';
import { ImportHandler } from './handlers/import-handler';
import { DeclarationHandler } from './handlers/declaration-handler';
import { LoopHandler } from './handlers/loop-handler';

type AccessibilityModifier = 'public' | 'private' | 'protected' | undefined;

/** Raised when input nests deeper than the parser supports; aborts the parse. */
class NestingError extends Error {}

export class Parser {
  private tokens: Token[];
  private current: number = 0;
  private errors: string[] = [];
  private importHandler: ImportHandler;
  private declarationHandler: DeclarationHandler;
  private loopHandler: LoopHandler;
  // Nodes that were written inside parentheses. The AST has no grouping node,
  // but `??` mixing and `**` operand rules depend on explicit parentheses.
  private readonly parenthesized = new WeakSet<Expression>();
  private depth = 0;
  private patternCounter = 0;

  constructor(tokens: Token[]) {
    // Line breaks are insignificant: statements end with ';', so expressions
    // may span lines freely.
    this.tokens = tokens.filter(token => token.type !== TokenType.NEWLINE);
    this.importHandler = new ImportHandler(this);
    this.declarationHandler = new DeclarationHandler(this);
    this.loopHandler = new LoopHandler(this);
  }

  getErrors(): string[] {
    return this.errors;
  }

  parse(): Program {
    const body: Statement[] = [];
    this.errors = []; // Reset errors

    try {
      while (!this.isAtEnd()) {
        const stmt = this.statement();
        if (stmt) {
          body.push(stmt);
        }
        // Don't advance here - statement() handles its own token consumption
      }
    } catch (error) {
      // Only nesting overflows escape statement(); they abort the whole parse
      this.errors.push(this.nestingErrorMessage(error));
    }

    return {
      type: 'Program',
      body,
      line: 1,
      column: 1,
    };
  }

  private statement(): Statement | null {
    const startIndex = this.current;
    try {
      this.enterNesting();
      const parsers: Array<() => Statement | null> = [
        () => this.importHandler.parseStatement(),
        () => this.declarationHandler.parseStatement(),
        () => this.loopHandler.parseStatement(),
        () => (this.match(TokenType.КӮШИШ) ? this.tryStatement() : null),
        () => (this.match(TokenType.ПАРТОФТАН) ? this.throwStatement() : null),
        () => (this.match(TokenType.АГАР) ? this.ifStatement() : null),
        () => (this.match(TokenType.ИНТИХОБ) ? this.switchStatement() : null),
        () => (this.match(TokenType.ШИКАСТАН) ? this.breakStatement() : null),
        () => (this.match(TokenType.ДАВОМ) ? this.continueStatement() : null),
        () => (this.match(TokenType.БОЗГАШТ) ? this.returnStatement() : null),
        () => (this.match(TokenType.LEFT_BRACE) ? this.blockStatement() : null),
      ];

      for (const parse of parsers) {
        const result = parse();
        if (result) {
          return result;
        }
      }

      return this.expressionStatement();
    } catch (error) {
      if (this.isNestingError(error)) throw error;
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.errors.push(errorMessage);
      this.synchronize(startIndex);
      return null;
    } finally {
      this.depth--;
    }
  }

  private static readonly MAX_NESTING = 500;

  /**
   * Tracks syntactic nesting so that pathological input produces a positioned
   * parse error instead of a stack overflow.
   */
  private enterNesting(): void {
    this.depth++;
    if (this.depth > Parser.MAX_NESTING) {
      const token = this.peek();
      throw new NestingError(
        `Nesting too deep at line ${token.line}, column ${token.column} (more than ${Parser.MAX_NESTING} levels)`
      );
    }
  }

  private isNestingError(error: unknown): boolean {
    return error instanceof NestingError || error instanceof RangeError;
  }

  private nestingErrorMessage(error: unknown): string {
    if (error instanceof NestingError) return error.message;
    if (this.isNestingError(error)) {
      const token = this.peek();
      return `Nesting too deep at line ${token.line}, column ${token.column}`;
    }
    throw error;
  }

  /** `allowDefinite`: false in a `барои (…; …; …)` head, where `х!` is not permitted. */
  public variableDeclaration(allowDefinite = true): VariableDeclaration {
    const kindToken = this.previous();
    const kind = kindToken.type === TokenType.ТАҒЙИРЁБАНДА ? 'ТАҒЙИРЁБАНДА' : 'СОБИТ';

    // Parse pattern (identifier, array destructuring, or object destructuring)
    const identifier = this.parsePattern();

    // Definite assignment assertion: `тағ х!: рақам;`
    const definite =
      identifier.type === 'Identifier' && this.check(TokenType.NOT) && !this.hasLineBreakBefore()
        ? this.advance()
        : undefined;

    // Parse optional type annotation
    let typeAnnotation: TypeAnnotation | undefined;
    if (this.match(TokenType.COLON)) {
      typeAnnotation = this.typeAnnotation();
    }

    let init: Expression | undefined;
    if (this.match(TokenType.ASSIGN)) {
      init = this.assignment();
    } else if (kind === 'СОБИТ') {
      throw new Error(
        `Missing initializer in constant declaration at line ${kindToken.line}, column ${kindToken.column}`
      );
    }
    if (definite) {
      this.checkDefiniteAssignment(definite, Boolean(init), Boolean(typeAnnotation), allowDefinite);
    }

    if (this.check(TokenType.COMMA)) {
      // VariableDeclaration holds a single binding; never drop the others silently
      const token = this.peek();
      throw new Error(
        `Multiple variables in one declaration are not supported at line ${token.line}, column ${token.column}; declare each variable separately`
      );
    }

    this.consumeSemicolon("Expected ';' after variable declaration");

    return {
      type: 'VariableDeclaration',
      kind,
      identifier,
      typeAnnotation,
      init,
      ...(definite && { definite: true }),
      line: kindToken.line,
      column: kindToken.column,
    };
  }

  /**
   * TypeScript's rules for a definite assignment assertion (`х!: Т`): it needs
   * a type annotation and no initializer, and only some declarations allow it.
   */
  private checkDefiniteAssignment(
    bang: Token,
    hasInitializer: boolean,
    hasType: boolean,
    permitted: boolean
  ): void {
    let problem: string | undefined;
    if (hasInitializer) {
      problem = 'Declarations with initializers cannot also have definite assignment assertions';
    } else if (!hasType) {
      problem = 'Declarations with definite assignment assertions must also have type annotations';
    } else if (!permitted) {
      problem = "A definite assignment assertion '!' is not permitted in this context";
    }
    // The declaration itself is well-formed: report and keep parsing
    if (problem) {
      this.errors.push(`${problem} at line ${bang.line}, column ${bang.column}`);
    }
  }

  public functionDeclaration(): FunctionDeclaration {
    const funcToken = this.previous();
    let name: Token;
    if (this.check(TokenType.IDENTIFIER)) {
      name = this.advance();
    } else if (this.matchBuiltinIdentifier()) {
      name = this.previous();
    } else {
      throw new Error(
        `Expected function name at line ${this.peek().line}, column ${this.peek().column}`
      );
    }

    // Skip generic type parameters if present (e.g., <T>, <T, U>)
    this.skipGenericTypeArguments();

    this.consume(TokenType.LEFT_PAREN, "Expected '(' after function name");
    const params = this.parseParameterList("Expected ')' after parameters");

    // Parse optional return type
    let returnType: TypeAnnotation | undefined;
    if (this.match(TokenType.COLON)) {
      returnType = this.typeAnnotation();
    }

    this.consume(TokenType.LEFT_BRACE, "Expected '{' before function body");

    const body = this.blockStatement();

    return {
      type: 'FunctionDeclaration',
      name: {
        type: 'Identifier',
        name: name.value,
        line: name.line,
        column: name.column,
      },
      params,
      returnType,
      body,
      line: funcToken.line,
      column: funcToken.column,
    };
  }

  private blockStatement(): BlockStatement {
    const leftBrace = this.previous();
    const body: Statement[] = [];

    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      const stmt = this.statement();
      if (stmt) {
        body.push(stmt);
      }
    }

    this.consume(TokenType.RIGHT_BRACE, "Expected '}' after block");

    return {
      type: 'BlockStatement',
      body,
      line: leftBrace.line,
      column: leftBrace.column,
    };
  }

  private ifStatement(): IfStatement {
    const ifToken = this.previous();

    this.consume(TokenType.LEFT_PAREN, "Expected '(' after 'агар'");
    const test = this.expression();
    this.consume(TokenType.RIGHT_PAREN, "Expected ')' after if condition");

    const consequent = this.statement()!;
    let alternate: Statement | undefined;

    if (this.match(TokenType.ВАГАРНА, TokenType.ЧУНИН)) {
      alternate = this.statement()!;
    }

    return {
      type: 'IfStatement',
      test,
      consequent,
      alternate,
      line: ifToken.line,
      column: ifToken.column,
    };
  }

  public whileStatement(): WhileStatement {
    const whileToken = this.previous();

    this.consume(TokenType.LEFT_PAREN, "Expected '(' after 'то'");
    const test = this.expression();
    this.consume(TokenType.RIGHT_PAREN, "Expected ')' after while condition");

    const body = this.statement()!;

    return {
      type: 'WhileStatement',
      test,
      body,
      line: whileToken.line,
      column: whileToken.column,
    };
  }

  public forStatement(): ForStatement | ForInStatement | ForOfStatement {
    const forToken = this.previous();
    this.consume(TokenType.LEFT_PAREN, "Expected '(' after 'барои'");

    const savedIndex = this.current;
    const loopType = this.detectForLoopType();

    if (loopType.isForOf || loopType.isForIn) {
      return this.parseForOfOrForInLoop(forToken, loopType.isForOf);
    }

    this.current = savedIndex;
    return this.parseTraditionalForLoop(forToken);
  }

  private detectForLoopType(): { isForOf: boolean; isForIn: boolean } {
    let lookaheadIndex = this.current;
    let isForOf = false;
    let isForIn = false;

    if (
      this.tokens[lookaheadIndex]?.type === TokenType.ТАҒЙИРЁБАНДА ||
      this.tokens[lookaheadIndex]?.type === TokenType.СОБИТ
    ) {
      lookaheadIndex++;
      const nextToken = this.tokens[lookaheadIndex];
      let afterBinding = -1;
      if (this.isTypeKeywordOrIdentifier(nextToken?.type)) {
        afterBinding = lookaheadIndex + 1;
      } else if (this.isPatternStart(nextToken?.type)) {
        // `[к, в]` / `{ а, б }`: skip the whole pattern, defaults included
        const close = this.findMatchingBracket(lookaheadIndex);
        if (close !== -1) afterBinding = close + 1;
      }
      const keyword = afterBinding === -1 ? undefined : this.tokens[afterBinding]?.type;
      isForOf = keyword === TokenType.АЗ;
      isForIn = keyword === TokenType.ДАР;
    }
    return { isForOf, isForIn };
  }

  private isPatternStart(type: TokenType | undefined): boolean {
    return type === TokenType.LEFT_BRACKET || type === TokenType.LEFT_BRACE;
  }

  /** Index of the bracket closing the `(`, `[` or `{` at `openIndex`, or -1. */
  private findMatchingBracket(openIndex: number): number {
    let depth = 0;
    for (let i = openIndex; i < this.tokens.length; i++) {
      switch (this.tokens[i].type) {
        case TokenType.LEFT_PAREN:
        case TokenType.LEFT_BRACKET:
        case TokenType.LEFT_BRACE:
          depth++;
          break;
        case TokenType.RIGHT_PAREN:
        case TokenType.RIGHT_BRACKET:
        case TokenType.RIGHT_BRACE:
          if (--depth === 0) return i;
          break;
      }
    }
    return -1;
  }

  private isTypeKeywordOrIdentifier(type: TokenType | undefined): boolean {
    return (
      type === TokenType.IDENTIFIER ||
      type === TokenType.РАҚАМ ||
      type === TokenType.САТР ||
      type === TokenType.МАНТИҚӢ
    );
  }

  private parseForOfOrForInLoop(
    forToken: Token,
    isForOf: boolean
  ): ForOfStatement | ForInStatement {
    const varToken = this.advance();
    const kind = varToken.type === TokenType.ТАҒЙИРЁБАНДА ? 'ТАҒЙИРЁБАНДА' : 'СОБИТ';

    let id: Identifier | ArrayPattern | ObjectPattern;
    if (this.isPatternStart(this.peek().type)) {
      // Destructuring, as in a declaration: `[к, в = 0]`, `{ а, ...боқӣ }`
      id = this.parsePattern();
    } else {
      const nameToken = this.isTypeKeywordOrIdentifier(this.peek().type)
        ? this.advance()
        : this.consume(TokenType.IDENTIFIER, 'Expected variable name');

      id = {
        type: 'Identifier',
        name: nameToken.value,
        line: nameToken.line,
        column: nameToken.column,
      };
    }

    if (isForOf) {
      this.consume(TokenType.АЗ, "Expected 'аз' in for-of loop");
    } else {
      this.consume(TokenType.ДАР, "Expected 'дар' in for-in loop");
    }

    const right = this.assignment();
    this.consume(TokenType.RIGHT_PAREN, "Expected ')' after for-of/for-in clauses");
    const body = this.statement()!;

    const left: VariableDeclaration = {
      type: 'VariableDeclaration',
      kind,
      identifier: id,
      init: undefined,
      line: id.line,
      column: id.column,
    };

    return {
      type: isForOf ? 'ForOfStatement' : 'ForInStatement',
      left,
      right,
      body,
      line: forToken.line,
      column: forToken.column,
    } as ForOfStatement | ForInStatement;
  }

  private parseTraditionalForLoop(forToken: Token): ForStatement {
    let init: VariableDeclaration | ExpressionStatement | null = null;
    if (this.match(TokenType.ТАҒЙИРЁБАНДА)) {
      init = this.variableDeclaration(false);
    } else if (!this.check(TokenType.SEMICOLON)) {
      init = this.expressionStatement();
    }

    if (init && init.type !== 'VariableDeclaration') {
      // ExpressionStatement already consumed the semicolon
    } else if (!init) {
      this.consume(TokenType.SEMICOLON, "Expected ';' after for loop initializer");
    }

    let test: Expression | null = null;
    if (!this.check(TokenType.SEMICOLON)) {
      test = this.expression();
    }
    this.consume(TokenType.SEMICOLON, "Expected ';' after for loop condition");

    let update: Expression | null = null;
    if (!this.check(TokenType.RIGHT_PAREN)) {
      update = this.expression();
    }
    this.consume(TokenType.RIGHT_PAREN, "Expected ')' after for clauses");

    const body = this.statement()!;

    return {
      type: 'ForStatement',
      init,
      test,
      update,
      body,
      line: forToken.line,
      column: forToken.column,
    };
  }

  private returnStatement(): ReturnStatement {
    const returnToken = this.previous();

    // As in JavaScript, a line break right after 'бозгашт' ends the statement
    let argument: Expression | undefined;
    if (
      !this.check(TokenType.SEMICOLON) &&
      !this.check(TokenType.RIGHT_BRACE) &&
      !this.isAtEnd() &&
      !this.hasLineBreakBefore()
    ) {
      argument = this.expression();
    }

    this.consumeSemicolon("Expected ';' after return value");

    return {
      type: 'ReturnStatement',
      argument,
      line: returnToken.line,
      column: returnToken.column,
    };
  }

  private expressionStatement(): ExpressionStatement {
    const expr = this.expression();
    this.consumeSemicolon("Expected ';' after expression");

    return {
      type: 'ExpressionStatement',
      expression: expr,
      line: expr.line,
      column: expr.column,
    };
  }

  /** Full expression, including the comma operator: `а++, б--`. */
  private expression(): Expression {
    const expr = this.assignment();
    if (!this.check(TokenType.COMMA)) {
      return expr;
    }

    const expressions = [expr];
    while (this.match(TokenType.COMMA)) {
      expressions.push(this.assignment());
    }
    return {
      type: 'SequenceExpression',
      expressions,
      line: expr.line,
      column: expr.column,
    } as SequenceExpression;
  }

  private static readonly ASSIGNMENT_OPERATORS: readonly TokenType[] = [
    TokenType.ASSIGN,
    TokenType.PLUS_ASSIGN,
    TokenType.MINUS_ASSIGN,
    TokenType.MULTIPLY_ASSIGN,
    TokenType.DIVIDE_ASSIGN,
    TokenType.MODULO_ASSIGN,
    TokenType.EXPONENT_ASSIGN,
    TokenType.BITWISE_AND_ASSIGN,
    TokenType.BITWISE_OR_ASSIGN,
    TokenType.BITWISE_XOR_ASSIGN,
    TokenType.LEFT_SHIFT_ASSIGN,
    TokenType.RIGHT_SHIFT_ASSIGN,
    TokenType.UNSIGNED_RIGHT_SHIFT_ASSIGN,
    TokenType.NULLISH_ASSIGN,
    TokenType.OR_ASSIGN,
    TokenType.AND_ASSIGN,
  ];

  private assignment(): Expression {
    try {
      this.enterNesting();

      const arrowFunc = this.tryParseArrowFunction();
      if (arrowFunc) {
        return arrowFunc;
      }

      const expr = this.conditional();

      if (this.match(...Parser.ASSIGNMENT_OPERATORS)) {
        const operator = this.previous();
        if (!this.isAssignmentTarget(expr, operator.type === TokenType.ASSIGN)) {
          throw new Error(
            `Invalid left-hand side in assignment at line ${operator.line}, column ${operator.column}`
          );
        }
        const value = this.assignment();

        return {
          type: 'AssignmentExpression',
          left: expr,
          operator: operator.value,
          right: value,
          line: expr.line,
          column: expr.column,
        } as AssignmentExpression;
      }

      return expr;
    } finally {
      this.depth--;
    }
  }

  /**
   * Whether `expr` may be assigned to: a variable or a (non-optional) member
   * and, for plain `=`, an array/object literal read as a destructuring
   * pattern whose elements are targets themselves.
   */
  private isAssignmentTarget(expr: Expression, allowPattern: boolean): boolean {
    switch (expr.type) {
      case 'Identifier':
        return true;
      case 'MemberExpression':
        return !(expr as MemberExpression).optional;
      case 'NonNullExpression':
      case 'AsExpression':
      case 'TypeAssertion':
        // `х! = 1`, `(х чун ҳар) = 1`: the assertion is erased
        return this.isAssignmentTarget((expr as NonNullExpression).expression, false);
      case 'ArrayPattern':
      case 'ObjectPattern':
        return allowPattern;
      case 'ArrayExpression':
        return (
          allowPattern &&
          !this.parenthesized.has(expr) &&
          (expr as ArrayExpression).elements.every(
            element => !element || this.isPatternElement(element)
          )
        );
      case 'ObjectExpression':
        return (
          allowPattern &&
          !this.parenthesized.has(expr) &&
          (expr as ObjectExpression).properties.every(property =>
            property.type === 'SpreadElement'
              ? this.isPatternElement(property)
              : !property.method && this.isPatternElement(property.value)
          )
        );
      default:
        return false;
    }
  }

  /** An element of a destructuring assignment: a target, `...target` or `target = default`. */
  private isPatternElement(element: Expression): boolean {
    if (element.type === 'SpreadElement') {
      return this.isAssignmentTarget((element as SpreadElement).argument, true);
    }
    if (element.type === 'AssignmentExpression') {
      const assignment = element as AssignmentExpression;
      return assignment.operator === '=' && !this.parenthesized.has(element);
    }
    return this.isAssignmentTarget(element, true);
  }

  private checkUpdateOperand(argument: Expression, operator: Token): void {
    if (!this.isAssignmentTarget(argument, false)) {
      throw new Error(
        `Invalid operand for '${operator.value}' at line ${operator.line}, column ${operator.column}; expected a variable or property`
      );
    }
  }

  /**
   * Parses an arrow function if one starts here: `х => …`, `(а, б = 1, ...в) => …`,
   * `({ а }): рақам => …`, optionally prefixed with `ҳамзамон`. Returns null otherwise.
   */
  private tryParseArrowFunction(): ArrowFunctionExpression | null {
    const startToken = this.peek();
    const offset = this.check(TokenType.ҲАМЗАМОН) ? 1 : 0;
    const head = this.tokens[this.current + offset];
    if (!head) return null;

    let params: Parameter[];
    let returnType: TypeAnnotation | undefined;
    let typeParameters: TypeParameter[] | undefined;

    if (head.type === TokenType.LESS_THAN) {
      const generic = this.tryParseGenericArrowHead(offset);
      if (!generic) return null;
      ({ typeParameters, params, returnType } = generic);
    } else if (
      this.isPlainIdentifierToken(head) &&
      this.tokens[this.current + offset + 1]?.type === TokenType.ARROW
    ) {
      // Single parameter without parentheses
      this.current += offset;
      const identifier = this.createIdentifier(this.advance());
      this.advance(); // consume '=>'
      params = [
        {
          type: 'Parameter',
          name: identifier,
          line: identifier.line,
          column: identifier.column,
        },
      ];
    } else if (head.type === TokenType.LEFT_PAREN) {
      const close = this.findMatchingParen(this.current + offset);
      const after = close >= 0 ? this.tokens[close + 1]?.type : undefined;
      if (after === TokenType.ARROW) {
        this.current += offset + 1; // consume [ҳамзамон] '('
        params = this.parseParameterList("Expected ')' after arrow function parameters");
        this.consume(TokenType.ARROW, "Expected '=>' after arrow function parameters");
      } else if (after === TokenType.COLON) {
        // `(…): Т => …` or a parenthesized conditional branch `а ? (б) : в`
        const head = this.speculate(() => {
          this.current += offset + 1;
          const list = this.parseParameterList("Expected ')' after arrow function parameters");
          this.consume(TokenType.COLON, "Expected ':' before return type");
          const type = this.typeAnnotation();
          this.consume(TokenType.ARROW, "Expected '=>' after return type");
          return { list, type };
        });
        if (!head) return null;
        params = head.list;
        returnType = head.type;
      } else {
        return null;
      }
    } else {
      return null;
    }

    const body = this.parseArrowFunctionBody();

    const arrow = {
      type: 'ArrowFunctionExpression',
      params,
      body,
      returnType,
      line: startToken.line,
      column: startToken.column,
    } as ArrowFunctionExpression;
    if (offset) arrow.isAsync = true;
    if (typeParameters) arrow.typeParameters = typeParameters;
    return arrow;
  }

  /**
   * Head of a generic arrow function, `<Т, К мерос сатр,>(х: Т): К =>`, up to
   * and including '=>'. As in TypeScript (.ts files), a '<' that starts an
   * expression begins one when a name follows and the rest parses as an arrow
   * head; otherwise it is the type assertion `<Т>х` (see `unary`), and
   * nothing is consumed here.
   */
  private tryParseGenericArrowHead(
    offset: number
  ): { typeParameters: TypeParameter[]; params: Parameter[]; returnType?: TypeAnnotation } | null {
    const name = this.tokens[this.current + offset + 1];
    if (!name || !this.isPlainIdentifierToken(name)) return null;
    // Closing '>>' tokens are split while parsing; undo that if this is no arrow
    const tokens = this.tokens.slice();
    const head = this.speculate(() => {
      this.current += offset;
      const typeParameters = this.parseTypeParameters()!;
      this.consume(TokenType.LEFT_PAREN, "Expected '(' after type parameters");
      const params = this.parseParameterList("Expected ')' after arrow function parameters");
      const returnType = this.match(TokenType.COLON) ? this.typeAnnotation() : undefined;
      this.consume(TokenType.ARROW, "Expected '=>' after arrow function parameters");
      return { typeParameters, params, returnType };
    });
    if (!head) this.tokens = tokens;
    return head;
  }

  /** Index of the ')' matching the '(' at `openIndex`, or -1. */
  private findMatchingParen(openIndex: number): number {
    let depth = 0;
    for (let i = openIndex; i < this.tokens.length; i++) {
      const type = this.tokens[i].type;
      if (type === TokenType.LEFT_PAREN) depth++;
      else if (type === TokenType.RIGHT_PAREN && --depth === 0) return i;
    }
    return -1;
  }

  /** Runs `parse`; on failure restores the position and errors and returns null. */
  private speculate<T>(parse: () => T): T | null {
    const savedIndex = this.current;
    const savedErrors = this.errors.length;
    try {
      return parse();
    } catch (error) {
      if (this.isNestingError(error)) throw error;
      this.current = savedIndex;
      this.errors.length = savedErrors;
      return null;
    }
  }

  private parseArrowFunctionBody(): BlockStatement | Expression {
    if (this.match(TokenType.LEFT_BRACE)) {
      return this.blockStatement();
    }
    // Expression body
    return this.assignment();
  }

  private conditional(): Expression {
    const test = this.coalesce();
    if (!this.match(TokenType.QUESTION)) {
      return test;
    }

    const consequent = this.assignment();
    this.consume(TokenType.COLON, "Expected ':' in conditional expression");
    const alternate = this.assignment();

    return {
      type: 'ConditionalExpression',
      test,
      consequent,
      alternate,
      line: test.line,
      column: test.column,
    } as ConditionalExpression;
  }

  /** `а ?? б`; mixing with unparenthesized `&&`/`||` is a syntax error, as in JavaScript. */
  private coalesce(): Expression {
    let expr = this.or();
    if (!this.check(TokenType.NULLISH_COALESCING)) {
      return expr;
    }

    if (this.isUnparenthesizedLogical(expr)) {
      throw new Error(this.nullishMixingMessage());
    }

    while (this.match(TokenType.NULLISH_COALESCING)) {
      const operator = this.previous();
      const right = this.bitwiseOr();
      expr = {
        type: 'BinaryExpression',
        left: expr,
        operator: operator.value,
        right,
        line: expr.line,
        column: expr.column,
      } as BinaryExpression;
    }

    if (this.check(TokenType.OR) || this.check(TokenType.AND)) {
      throw new Error(this.nullishMixingMessage());
    }
    return expr;
  }

  private isUnparenthesizedLogical(expr: Expression): boolean {
    if (expr.type !== 'BinaryExpression' || this.parenthesized.has(expr)) return false;
    const operator = (expr as BinaryExpression).operator;
    return operator === '||' || operator === '&&';
  }

  private nullishMixingMessage(): string {
    const token = this.peek();
    return `Cannot mix '??' with '||' or '&&' without parentheses at line ${token.line}, column ${token.column}`;
  }

  private or(): Expression {
    let expr = this.and();

    while (this.match(TokenType.OR)) {
      const operator = this.previous();
      const right = this.and();
      expr = {
        type: 'BinaryExpression',
        left: expr,
        operator: operator.value,
        right,
        line: expr.line,
        column: expr.column,
      } as BinaryExpression;
    }

    return expr;
  }

  private and(): Expression {
    let expr = this.bitwiseOr();

    while (this.match(TokenType.AND)) {
      const operator = this.previous();
      const right = this.bitwiseOr();
      expr = {
        type: 'BinaryExpression',
        left: expr,
        operator: operator.value,
        right,
        line: expr.line,
        column: expr.column,
      } as BinaryExpression;
    }

    return expr;
  }

  private bitwiseOr(): Expression {
    let expr = this.bitwiseXor();

    while (this.match(TokenType.BITWISE_OR)) {
      const operator = this.previous();
      const right = this.bitwiseXor();
      expr = {
        type: 'BinaryExpression',
        left: expr,
        operator: operator.value,
        right,
        line: expr.line,
        column: expr.column,
      } as BinaryExpression;
    }

    return expr;
  }

  private bitwiseXor(): Expression {
    let expr = this.bitwiseAnd();

    while (this.match(TokenType.BITWISE_XOR)) {
      const operator = this.previous();
      const right = this.bitwiseAnd();
      expr = {
        type: 'BinaryExpression',
        left: expr,
        operator: operator.value,
        right,
        line: expr.line,
        column: expr.column,
      } as BinaryExpression;
    }

    return expr;
  }

  private bitwiseAnd(): Expression {
    let expr = this.equality();

    while (this.match(TokenType.BITWISE_AND)) {
      const operator = this.previous();
      const right = this.equality();
      expr = {
        type: 'BinaryExpression',
        left: expr,
        operator: operator.value,
        right,
        line: expr.line,
        column: expr.column,
      } as BinaryExpression;
    }

    return expr;
  }

  private equality(): Expression {
    let expr = this.comparison();

    while (
      this.match(
        TokenType.EQUAL,
        TokenType.NOT_EQUAL,
        TokenType.STRICT_EQUAL,
        TokenType.STRICT_NOT_EQUAL
      )
    ) {
      const operator = this.previous();
      const right = this.comparison();
      expr = {
        type: 'BinaryExpression',
        left: expr,
        operator: operator.value,
        right,
        line: expr.line,
        column: expr.column,
      } as BinaryExpression;
    }

    return expr;
  }

  private comparison(): Expression {
    let expr = this.shift();

    // eslint-disable-next-line no-constant-condition
    while (true) {
      let operator: string;
      if (
        this.match(
          TokenType.GREATER_THAN,
          TokenType.GREATER_EQUAL,
          TokenType.LESS_THAN,
          TokenType.LESS_EQUAL
        )
      ) {
        operator = this.previous().value;
      } else if (this.check(TokenType.ДАР) || this.checkIdentifierValue('in')) {
        this.advance();
        operator = 'in';
      } else if (this.checkIdentifierValue('instanceof')) {
        this.advance();
        operator = 'instanceof';
      } else if (this.typeOperator()) {
        expr = this.parseTypeOperator(expr);
        continue;
      } else {
        break;
      }

      const right = this.shift();
      expr = {
        type: 'BinaryExpression',
        left: expr,
        operator,
        right,
        line: expr.line,
        column: expr.column,
      } as BinaryExpression;
    }

    return expr;
  }

  /**
   * The type operator at the current token, if any: `чун` / `as` (type
   * assertion) or `бармесоё` / `satisfies`. As in TypeScript they bind like
   * relational operators. `бармесоё`, `as` and `satisfies` are also ordinary
   * names, so they are operators only on the line of their operand.
   */
  private typeOperator(): 'as' | 'satisfies' | undefined {
    if (this.check(TokenType.ЧУН)) return 'as';
    if (this.hasLineBreakBefore()) return undefined;
    if (this.checkIdentifierValue('as')) return 'as';
    if (this.check(TokenType.БАРМЕСОЁ) || this.checkIdentifierValue('satisfies')) {
      return 'satisfies';
    }
    return undefined;
  }

  /** `х чун Т`, `х чун собит` (`as const`) or `х бармесоё Т`; types are erased. */
  private parseTypeOperator(expression: Expression): Expression {
    const operator = this.typeOperator();
    this.advance();
    const position = { line: expression.line, column: expression.column };
    if (operator === 'satisfies') {
      return {
        type: 'SatisfiesExpression',
        expression,
        typeAnnotation: this.parseType(),
        ...position,
      } as SatisfiesExpression;
    }
    if (this.matchConstKeyword()) {
      return { type: 'AsExpression', expression, isConst: true, ...position } as AsExpression;
    }
    return {
      type: 'AsExpression',
      expression,
      typeAnnotation: this.parseType(),
      ...position,
    } as AsExpression;
  }

  /** `собит` (or `const`) in `чун собит` / `<собит>`. */
  private matchConstKeyword(): boolean {
    if (this.check(TokenType.СОБИТ) || this.checkIdentifierValue('const')) {
      this.advance();
      return true;
    }
    return false;
  }

  /**
   * `<Т>х` / `<собит>х`: TypeScript's prefix type assertion. A '<' starting
   * a generic arrow function never gets here (see `tryParseGenericArrowHead`).
   */
  private parseTypeAssertion(): TypeAssertion {
    const open = this.advance();
    const isConst = this.peekNext()?.type === TokenType.GREATER_THAN && this.matchConstKeyword();
    const typeAnnotation = isConst ? undefined : this.parseType();
    this.consumeTypeArgumentsClose("Expected '>' after the type of a type assertion");
    const expression = this.unary();
    return {
      type: 'TypeAssertion',
      expression,
      ...(isConst ? { isConst } : { typeAnnotation }),
      line: open.line,
      column: open.column,
    } as TypeAssertion;
  }

  private shift(): Expression {
    let expr = this.term();

    while (
      this.match(TokenType.LEFT_SHIFT, TokenType.RIGHT_SHIFT, TokenType.UNSIGNED_RIGHT_SHIFT)
    ) {
      const operator = this.previous();
      const right = this.term();
      expr = {
        type: 'BinaryExpression',
        left: expr,
        operator: operator.value,
        right,
        line: expr.line,
        column: expr.column,
      } as BinaryExpression;
    }

    return expr;
  }

  private term(): Expression {
    let expr = this.factor();

    while (this.match(TokenType.MINUS, TokenType.PLUS)) {
      const operator = this.previous();
      const right = this.factor();
      expr = {
        type: 'BinaryExpression',
        left: expr,
        operator: operator.value,
        right,
        line: expr.line,
        column: expr.column,
      } as BinaryExpression;
    }

    return expr;
  }

  private factor(): Expression {
    let expr = this.exponent();

    while (this.match(TokenType.DIVIDE, TokenType.MULTIPLY, TokenType.MODULO)) {
      const operator = this.previous();
      const right = this.exponent();
      expr = {
        type: 'BinaryExpression',
        left: expr,
        operator: operator.value,
        right,
        line: expr.line,
        column: expr.column,
      } as BinaryExpression;
    }

    return expr;
  }

  /** `а ** б`, right-associative. A unary operand on the left needs parentheses, as in JavaScript. */
  private exponent(): Expression {
    try {
      this.enterNesting();
      const left = this.unary();
      if (!this.check(TokenType.EXPONENT)) {
        return left;
      }

      if (
        (left.type === 'UnaryExpression' ||
          left.type === 'AwaitExpression' ||
          left.type === 'TypeAssertion') &&
        !this.parenthesized.has(left)
      ) {
        const token = this.peek();
        const operand = left.type === 'TypeAssertion' ? 'Type assertion' : 'Unary operator';
        throw new Error(
          `${operand} before '**' must be parenthesized at line ${token.line}, column ${token.column}`
        );
      }

      const operator = this.advance();
      const right = this.exponent();
      return {
        type: 'BinaryExpression',
        left,
        operator: operator.value,
        right,
        line: left.line,
        column: left.column,
      } as BinaryExpression;
    } finally {
      this.depth--;
    }
  }

  private unary(): Expression {
    try {
      this.enterNesting();

      if (this.match(TokenType.NOT, TokenType.MINUS, TokenType.PLUS, TokenType.BITWISE_NOT)) {
        const operator = this.previous();
        const right = this.unary();
        return {
          type: 'UnaryExpression',
          operator: operator.value,
          argument: right,
          line: operator.line,
          column: operator.column,
        } as UnaryExpression;
      }

      const keywordOperator = this.unaryKeywordOperator();
      if (keywordOperator) {
        const operatorToken = this.advance();
        const argument = this.unary();
        return {
          type: 'UnaryExpression',
          operator: keywordOperator,
          argument,
          line: operatorToken.line,
          column: operatorToken.column,
        } as UnaryExpression;
      }

      if (this.match(TokenType.INCREMENT, TokenType.DECREMENT)) {
        const operator = this.previous();
        const argument = this.unary();
        this.checkUpdateOperand(argument, operator);
        return {
          type: 'UpdateExpression',
          operator: operator.value,
          argument,
          prefix: true,
          line: operator.line,
          column: operator.column,
        } as UpdateExpression;
      }

      if (this.match(TokenType.ИНТИЗОР)) {
        const awaitToken = this.previous();
        const argument = this.unary();
        return {
          type: 'AwaitExpression',
          argument,
          line: awaitToken.line,
          column: awaitToken.column,
        } as AwaitExpression;
      }

      // A '<' can only start an operand as the type assertion `<Т>х`
      if (this.check(TokenType.LESS_THAN)) {
        return this.parseTypeAssertion();
      }

      return this.call();
    } finally {
      this.depth--;
    }
  }

  /**
   * `навъи` / `typeof`, `void` and `delete` act as unary operators when an
   * operand follows; otherwise they are ordinary identifiers.
   */
  private unaryKeywordOperator(): string | null {
    const token = this.peek();
    let operator: string | null = null;
    if (token.type === TokenType.НАВЪИ) {
      operator = 'typeof';
    } else if (token.type === TokenType.IDENTIFIER && Parser.UNARY_KEYWORDS.has(token.value)) {
      operator = token.value;
    }
    if (!operator) return null;

    const next = this.peekNext();
    if (!next) return null;
    const startsOperand =
      this.isIdentifierNameToken(next) ||
      [
        TokenType.NUMBER,
        TokenType.STRING,
        TokenType.TEMPLATE_LITERAL,
        TokenType.LEFT_PAREN,
        TokenType.LEFT_BRACKET,
        TokenType.NOT,
        TokenType.BITWISE_NOT,
      ].includes(next.type);
    return startsOperand ? operator : null;
  }

  private static readonly UNARY_KEYWORDS: ReadonlySet<string> = new Set([
    'typeof',
    'void',
    'delete',
  ]);

  private checkIdentifierValue(value: string): boolean {
    return this.check(TokenType.IDENTIFIER) && this.peek().value === value;
  }

  private call(): Expression {
    const expr = this.primary();
    return this.applyCallChaining(expr);
  }

  private applyCallChaining(expr: Expression): Expression {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      // Skip generic type parameters only for function calls (e.g., func<Type>(args))
      // Only check when expr is an identifier (potential function name) and next is <
      if (
        expr.type === 'Identifier' &&
        this.check(TokenType.LESS_THAN) &&
        this.isLikelyGenericCall()
      ) {
        this.skipGenericTypeArguments();
      }

      if (this.match(TokenType.LEFT_PAREN)) {
        expr = this.finishCall(expr);
      } else if (this.match(TokenType.DOT)) {
        expr = this.createMemberExpression(
          expr,
          this.parsePropertyName("Expected property name after '.'"),
          false
        );
      } else if (this.match(TokenType.OPTIONAL_CHAINING)) {
        if (this.match(TokenType.LEFT_PAREN)) {
          expr = this.finishCall(expr);
          (expr as CallExpression).optional = true;
        } else if (this.match(TokenType.LEFT_BRACKET)) {
          const property = this.expression();
          this.consume(TokenType.RIGHT_BRACKET, "Expected ']' after computed property");
          expr = this.createMemberExpression(expr, property, true);
          (expr as MemberExpression).optional = true;
        } else {
          expr = this.createMemberExpression(
            expr,
            this.parsePropertyName("Expected property name after '?.'"),
            false
          );
          (expr as MemberExpression).optional = true;
        }
      } else if (this.match(TokenType.LEFT_BRACKET)) {
        // Computed member expression: obj[expr]
        const property = this.expression();
        this.consume(TokenType.RIGHT_BRACKET, "Expected ']' after computed property");
        expr = this.createMemberExpression(expr, property, true);
      } else if (this.checkNonNullAssertion()) {
        expr = this.createNonNullExpression(expr);
      } else if (this.match(TokenType.INCREMENT, TokenType.DECREMENT)) {
        // Postfix increment/decrement
        const operator = this.previous();
        this.checkUpdateOperand(expr, operator);
        expr = {
          type: 'UpdateExpression',
          operator: operator.value,
          argument: expr,
          prefix: false,
          line: expr.line,
          column: expr.column,
        } as UpdateExpression;
      } else {
        break;
      }
    }

    return expr;
  }

  /**
   * A '!' right after an operand, on its line, is the non-null assertion
   * `х!` (as in TypeScript); `!=` and `!==` are separate tokens.
   */
  private checkNonNullAssertion(): boolean {
    return this.check(TokenType.NOT) && !this.hasLineBreakBefore();
  }

  private createNonNullExpression(expression: Expression): NonNullExpression {
    this.advance(); // '!'
    return {
      type: 'NonNullExpression',
      expression,
      line: expression.line,
      column: expression.column,
    } as NonNullExpression;
  }

  private createMemberExpression(
    object: Expression,
    property: Expression,
    computed: boolean
  ): MemberExpression {
    return {
      type: 'MemberExpression',
      object,
      property,
      computed,
      line: object.line,
      column: object.column,
    } as MemberExpression;
  }

  /** Property name after '.' or '?.': any identifier or keyword. */
  private parsePropertyName(message: string): Identifier {
    if (!this.isIdentifierNameToken(this.peek())) {
      throw new Error(this.unexpectedTokenMessage(message));
    }
    return this.createIdentifier(this.advance());
  }

  /** Identifiers and keywords: every token whose text is a word. */
  private isIdentifierNameToken(token: Token): boolean {
    if (token.type === TokenType.IDENTIFIER) return true;
    if (
      token.type === TokenType.STRING ||
      token.type === TokenType.NUMBER ||
      token.type === TokenType.TEMPLATE_LITERAL ||
      token.type === TokenType.EOF
    ) {
      return false;
    }
    return /^[\p{L}_$][\p{L}\p{N}\p{M}_$]*$/u.test(token.value);
  }

  private isLikelyGenericCall(): boolean {
    // Check if the next tokens look like generic type arguments followed by a call
    // e.g., <Type>(, <Type1, Type2>(
    // Look ahead to see if we have the pattern: < type-like-tokens > (
    const savedCurrent = this.current;

    if (!this.match(TokenType.LESS_THAN)) {
      this.current = savedCurrent;
      return false;
    }

    // Check if next token is a type-like token
    const isTypeLike =
      this.check(TokenType.IDENTIFIER) ||
      this.check(TokenType.САТР) ||
      this.check(TokenType.РАҚАМ) ||
      this.check(TokenType.МАНТИҚӢ) ||
      this.check(TokenType.ХОЛӢ) ||
      this.check(TokenType.БЕҚИМАТ);

    if (!isTypeLike) {
      this.current = savedCurrent;
      return false;
    }

    // Skip ahead to find the closing > and check if ( follows
    let depth = 1;
    let foundClosing = false;
    while (depth > 0 && !this.isAtEnd()) {
      this.advance();
      if (this.previous().type === TokenType.LESS_THAN) {
        depth++;
      } else if (this.previous().type === TokenType.GREATER_THAN) {
        depth--;
        if (depth === 0) {
          foundClosing = true;
        }
      }
    }

    // Check if there's a ( after the >
    const hasCallParen = foundClosing && this.check(TokenType.LEFT_PAREN);

    // Reset position
    this.current = savedCurrent;
    return hasCallParen;
  }

  private skipGenericTypeArguments(): void {
    if (!this.match(TokenType.LESS_THAN)) {
      return;
    }

    let depth = 1;
    let tokenCount = 0;
    const maxTokens = 50; // Prevent infinite loops

    while (depth > 0 && !this.isAtEnd() && tokenCount < maxTokens) {
      const currentToken = this.peek();

      // Early exit if we hit tokens that shouldn't be inside generics
      if (
        currentToken.type === TokenType.LEFT_BRACE ||
        currentToken.type === TokenType.ФУНКСИЯ ||
        currentToken.type === TokenType.СИНФ ||
        currentToken.type === TokenType.SEMICOLON ||
        currentToken.type === TokenType.EOF
      ) {
        // We've gone too far or hit EOF, this isn't a valid generic
        // Reset by going back one token if we consumed the initial <
        if (tokenCount === 0) {
          this.current--; // Undo the initial match of <
        }
        return;
      }

      if (currentToken.type === TokenType.LESS_THAN) {
        depth++;
      } else {
        // `>`, and `>>` / `>>>` as in `<А<Б>>`, close one or more levels
        depth -= Parser.CLOSING_ANGLES.get(currentToken.type) ?? 0;
      }

      this.advance();
      tokenCount++;
    }

    // If we hit the token limit, something went wrong
    if (tokenCount >= maxTokens) {
      throw new Error(
        `Unterminated type argument list at line ${this.peek().line}, column ${this.peek().column}`
      );
    }
  }

  private static readonly CLOSING_ANGLES: ReadonlyMap<TokenType, number> = new Map([
    [TokenType.GREATER_THAN, 1],
    [TokenType.RIGHT_SHIFT, 2],
    [TokenType.UNSIGNED_RIGHT_SHIFT, 3],
  ]);

  private finishCall(callee: Expression): CallExpression {
    const args = this.parseArguments();

    return {
      type: 'CallExpression',
      callee,
      arguments: args,
      line: callee.line,
      column: callee.column,
    } as CallExpression;
  }

  /** Arguments after a consumed '(' up to and including ')'; spread allowed. */
  private parseArguments(): Expression[] {
    const args: Expression[] = [];
    while (!this.check(TokenType.RIGHT_PAREN)) {
      args.push(this.spreadOrAssignment());
      if (!this.match(TokenType.COMMA)) break;
    }
    this.consume(TokenType.RIGHT_PAREN, "Expected ')' after arguments");
    return args;
  }

  /** An element of an array literal, object literal or argument list. */
  private spreadOrAssignment(): Expression {
    if (this.match(TokenType.SPREAD)) {
      const spreadToken = this.previous();
      return {
        type: 'SpreadElement',
        argument: this.assignment(),
        line: spreadToken.line,
        column: spreadToken.column,
      } as SpreadElement;
    }
    return this.assignment();
  }

  private createLiteral(value: boolean | null | number | string, token: Token): Literal {
    const raw = typeof value === 'string' ? `"${value}"` : token.value;
    return {
      type: 'Literal',
      value,
      raw,
      line: token.line,
      column: token.column,
    } as Literal;
  }

  /** The NUMBER token holds the literal as written (`0xFF`, `1e3`, `10n`); codegen emits `raw`. */
  private createNumericLiteral(token: Token): Literal {
    const text = token.value.endsWith('n') ? token.value.slice(0, -1) : token.value;
    return {
      type: 'Literal',
      value: Number(text),
      raw: token.value,
      line: token.line,
      column: token.column,
    } as Literal;
  }

  private parseNewExpression(token: Token): NewExpression {
    // The callee is a member chain without calls: `нав а.Б()` constructs `а.Б`
    let callee = this.primary();
    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (this.match(TokenType.DOT)) {
        callee = this.createMemberExpression(
          callee,
          this.parsePropertyName("Expected property name after '.'"),
          false
        );
      } else if (this.match(TokenType.LEFT_BRACKET)) {
        const property = this.expression();
        this.consume(TokenType.RIGHT_BRACKET, "Expected ']' after computed property");
        callee = this.createMemberExpression(callee, property, true);
      } else if (this.checkNonNullAssertion()) {
        // `нав а!.Б()` constructs `а!.Б`
        callee = this.createNonNullExpression(callee);
      } else {
        break;
      }
    }

    const typeArguments = this.parseNewTypeArguments();

    // Arguments are optional: `нав Сана`
    const args = this.match(TokenType.LEFT_PAREN) ? this.parseArguments() : [];
    return {
      type: 'NewExpression',
      callee,
      arguments: args,
      ...(typeArguments && { typeArguments }),
      line: token.line,
      column: token.column,
    } as NewExpression;
  }

  /**
   * Type arguments of `нав Map<сатр, рақам>()`. When the tokens after '<' are
   * not a type argument list, they are skipped the way they were before type
   * arguments were kept.
   */
  private parseNewTypeArguments(): TypeNode[] | undefined {
    if (!this.check(TokenType.LESS_THAN)) return undefined;
    const start = this.current;
    const tokens = [...this.tokens];
    const errorCount = this.errors.length;
    try {
      this.advance();
      const typeArguments: TypeNode[] = [];
      do {
        typeArguments.push(this.parseType());
      } while (this.match(TokenType.COMMA));
      this.consumeTypeArgumentsClose();
      if (this.errors.length === errorCount) return typeArguments;
    } catch {
      // Not a type argument list
    }
    this.tokens = tokens;
    this.current = start;
    this.errors.length = errorCount;
    this.skipGenericTypeArguments();
    return undefined;
  }

  private parseDynamicImport(importToken: Token): ImportExpression {
    this.consume(TokenType.LEFT_PAREN, "Expected '(' after 'ворид'");
    const source = this.assignment();
    this.consume(TokenType.RIGHT_PAREN, "Expected ')' after import specifier");
    return {
      type: 'ImportExpression',
      source,
      line: importToken.line,
      column: importToken.column,
    } as ImportExpression;
  }

  private parseFunctionExpression(funcToken: Token): FunctionExpression {
    this.consume(TokenType.LEFT_PAREN, "Expected '(' after 'функсия'");
    const params = this.parseParameterList("Expected ')' after parameters");
    let returnType: TypeAnnotation | undefined;

    if (this.match(TokenType.COLON)) {
      returnType = this.typeAnnotation();
    }

    this.consume(TokenType.LEFT_BRACE, "Expected '{' before function body");
    const body = this.blockStatement();
    return {
      type: 'FunctionExpression',
      params,
      body,
      returnType,
      line: funcToken.line,
      column: funcToken.column,
    } as FunctionExpression;
  }

  private createIdentifier(token: Token): Identifier {
    return {
      type: 'Identifier',
      name: token.value,
      line: token.line,
      column: token.column,
    } as Identifier;
  }

  private parseLiteralExpression(): Expression | null {
    if (this.match(TokenType.ДУРУСТ)) {
      return this.createLiteral(true, this.previous());
    }
    if (this.match(TokenType.НОДУРУСТ)) {
      return this.createLiteral(false, this.previous());
    }
    if (this.match(TokenType.ХОЛӢ)) {
      return this.createLiteral(null, this.previous());
    }
    if (this.match(TokenType.NUMBER)) {
      return this.createNumericLiteral(this.previous());
    }
    if (this.match(TokenType.STRING)) {
      return this.createLiteral(this.previous().value, this.previous());
    }
    if (this.match(TokenType.TEMPLATE_LITERAL)) {
      return this.parseTemplateLiteral();
    }
    return null;
  }

  private parseThisOrSuperExpression(): Expression | null {
    if (this.match(TokenType.ИН)) {
      const token = this.previous();
      return { type: 'ThisExpression', line: token.line, column: token.column };
    }
    if (this.match(TokenType.СУПЕР)) {
      const token = this.previous();
      return { type: 'Super', line: token.line, column: token.column };
    }
    return null;
  }

  private parseIdentifierExpression(): Expression | null {
    if (this.match(TokenType.IDENTIFIER) || this.matchBuiltinIdentifier()) {
      return this.createIdentifier(this.previous());
    }
    if (this.match(TokenType.НАВЪ, TokenType.МАЪЛУМОТ, TokenType.РӮЙХАТ, TokenType.БЕҚИМАТ)) {
      return this.createIdentifier(this.previous());
    }
    return null;
  }

  private parseGroupingOrCollection(): Expression | null {
    if (this.match(TokenType.LEFT_PAREN)) {
      let expr = this.expression();
      this.consume(TokenType.RIGHT_PAREN, "Expected ')' after expression");
      if (this.containsOptionalLink(expr)) {
        expr = {
          type: 'ChainExpression',
          expression: expr,
          line: expr.line,
          column: expr.column,
        } as ChainExpression;
      }
      this.parenthesized.add(expr);
      return expr;
    }
    if (this.match(TokenType.LEFT_BRACKET)) {
      return this.arrayExpression();
    }
    if (this.match(TokenType.LEFT_BRACE)) {
      return this.objectExpression();
    }
    return null;
  }

  /** Whether the member/call chain of `expr` (assertions included) has a `?.` link. */
  private containsOptionalLink(expr: Expression): boolean {
    let current = expr;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (current.type === 'MemberExpression' || current.type === 'CallExpression') {
        if ((current as MemberExpression | CallExpression).optional) return true;
        current =
          current.type === 'MemberExpression'
            ? (current as MemberExpression).object
            : (current as CallExpression).callee;
      } else if (Parser.ASSERTION_TYPES.has(current.type)) {
        // `(о?.а чун Т).б` and `(о?.а!).б` end the chain like `(о?.а).б`
        current = (current as NonNullExpression).expression;
      } else {
        return false;
      }
    }
  }

  /** Expressions that only assert a type: erased in the output. */
  private static readonly ASSERTION_TYPES: ReadonlySet<string> = new Set([
    'AsExpression',
    'TypeAssertion',
    'SatisfiesExpression',
    'NonNullExpression',
  ]);

  private primary(): Expression {
    const literal = this.parseLiteralExpression();
    if (literal) return literal;

    const thisOrSuper = this.parseThisOrSuperExpression();
    if (thisOrSuper) return thisOrSuper;

    if (this.match(TokenType.НАВ)) {
      return this.parseNewExpression(this.previous());
    }

    if (this.check(TokenType.ВОРИД) && this.peekNext()?.type === TokenType.LEFT_PAREN) {
      return this.parseDynamicImport(this.advance());
    }

    if (this.match(TokenType.ФУНКСИЯ)) {
      return this.parseFunctionExpression(this.previous());
    }

    if (this.check(TokenType.ҲАМЗАМОН) && this.peekNext()?.type === TokenType.ФУНКСИЯ) {
      const asyncToken = this.advance();
      this.advance(); // consume 'функсия'
      const func = this.parseFunctionExpression(asyncToken);
      func.async = true;
      return func;
    }

    const identifier = this.parseIdentifierExpression();
    if (identifier) return identifier;

    const grouping = this.parseGroupingOrCollection();
    if (grouping) return grouping;

    const token = this.peek();
    throw new Error(
      `Unexpected token '${token.value}' at line ${token.line}, column ${token.column}`
    );
  }

  private parseTemplateLiteral(): TemplateLiteral {
    const token = this.previous();
    const quasis: TemplateElement[] = [];
    const expressions: Expression[] = [];

    for (const part of this.splitTemplate(token.value)) {
      if (part.type === 'text') {
        quasis.push({
          type: 'TemplateElement',
          value: { raw: part.value, cooked: this.cookTemplateText(part.value, token) },
          tail: false,
          line: token.line,
          column: token.column,
        });
      } else {
        const { line, column } = this.templateOffsetPosition(token, part.offset);
        expressions.push(this.parseInterpolation(part.value, line, column));
      }
    }

    quasis[quasis.length - 1].tail = true;

    return {
      type: 'TemplateLiteral',
      quasis,
      expressions,
      line: token.line,
      column: token.column,
    };
  }

  /**
   * Splits raw template text into alternating text / `${…}` parts, always
   * starting and ending with text. `\${` is text; braces inside strings and
   * nested templates do not end an interpolation.
   */
  private splitTemplate(
    raw: string
  ): Array<{ type: 'text' | 'expression'; value: string; offset: number }> {
    const parts: Array<{ type: 'text' | 'expression'; value: string; offset: number }> = [];
    let textStart = 0;
    let i = 0;
    while (i < raw.length) {
      if (raw[i] === '\\') {
        i += 2;
      } else if (raw[i] === '$' && raw[i + 1] === '{') {
        parts.push({ type: 'text', value: raw.slice(textStart, i), offset: textStart });
        const end = this.findInterpolationEnd(raw, i + 2);
        parts.push({ type: 'expression', value: raw.slice(i + 2, end), offset: i + 2 });
        i = end + 1;
        textStart = i;
      } else {
        i++;
      }
    }
    parts.push({ type: 'text', value: raw.slice(textStart), offset: textStart });
    return parts;
  }

  /**
   * Index of the '}' that closes an interpolation whose body starts at `start`;
   * braces in strings, nested templates and comments do not count.
   */
  private findInterpolationEnd(raw: string, start: number): number {
    let depth = 1;
    let i = start;
    while (i < raw.length) {
      const char = raw[i];
      if (char === '/' && raw[i + 1] === '/') {
        const newline = raw.indexOf('\n', i);
        i = newline === -1 ? raw.length : newline;
      } else if (char === '/' && raw[i + 1] === '*') {
        const close = raw.indexOf('*/', i + 2);
        i = close === -1 ? raw.length : close + 2;
      } else if (char === '"' || char === "'") {
        i = this.skipQuoted(raw, i + 1, char);
      } else if (char === '`') {
        i = this.skipNestedTemplate(raw, i + 1);
      } else if (char === '{') {
        depth++;
        i++;
      } else if (char === '}') {
        if (--depth === 0) return i;
        i++;
      } else {
        i++;
      }
    }
    return raw.length;
  }

  /** Index just past the closing `quote` of a string starting at `i`. */
  private skipQuoted(raw: string, i: number, quote: string): number {
    while (i < raw.length && raw[i] !== quote) {
      i += raw[i] === '\\' ? 2 : 1;
    }
    return i + 1;
  }

  /** Index just past the closing backtick of a nested template starting at `i`. */
  private skipNestedTemplate(raw: string, i: number): number {
    while (i < raw.length && raw[i] !== '`') {
      if (raw[i] === '\\') {
        i += 2;
      } else if (raw[i] === '$' && raw[i + 1] === '{') {
        i = this.findInterpolationEnd(raw, i + 2) + 1;
      } else {
        i++;
      }
    }
    return i + 1;
  }

  /** Source position of `offset` within the raw text of a template token. */
  private templateOffsetPosition(token: Token, offset: number): { line: number; column: number } {
    const before = token.value.slice(0, offset);
    const lastBreak = before.lastIndexOf('\n');
    const breaks = before.split('\n').length - 1;
    return breaks === 0
      ? { line: token.line, column: token.column + 1 + offset }
      : { line: token.line + breaks, column: offset - lastBreak };
  }

  /** Decodes the escape sequences of raw template text. */
  private cookTemplateText(raw: string, token: Token): string {
    const simple: Record<string, string> = {
      n: '\n',
      t: '\t',
      r: '\r',
      b: '\b',
      f: '\f',
      v: '\v',
      '0': '\0',
      '\n': '',
    };
    // Line terminators are normalized to '\n', as in JavaScript
    return raw
      .replace(/\r\n?/g, '\n')
      .replace(
        /\\(u\{([0-9a-fA-F]+)\}|u([0-9a-fA-F]{4})|x([0-9a-fA-F]{2})|[\s\S])/g,
        (whole: string, escape: string, braced?: string, unicode?: string, hex?: string) => {
          const code = braced ?? unicode ?? hex;
          if (code !== undefined) {
            const point = Number.parseInt(code, 16);
            if (point > 0x10ffff) {
              throw new Error(
                `Invalid Unicode escape '${whole}' in template literal at line ${token.line}, column ${token.column}`
              );
            }
            return String.fromCodePoint(point);
          }
          if (escape === 'u' || escape === 'x') {
            throw new Error(
              `Invalid escape sequence '${whole}' in template literal at line ${token.line}, column ${token.column}`
            );
          }
          return simple[escape] ?? escape;
        }
      );
  }

  /**
   * Parses the source of one `${…}` with a sub-parser. Tokens are shifted to
   * their real position, the expression must consume all of them, and every
   * error is reported through this parser.
   */
  private parseInterpolation(source: string, line: number, column: number): Expression {
    if (!source.trim()) {
      // `${}` is treated as `undefined`
      return { type: 'Identifier', name: 'undefined', line, column } as Identifier;
    }

    let tokens: Token[];
    try {
      tokens = new Lexer(source).tokenize();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(this.shiftPositions(message, line, column));
    }
    for (const token of tokens) {
      if (token.line === 1) token.column += column - 1;
      token.line += line - 1;
    }

    const subParser = new Parser(tokens);
    subParser.depth = this.depth;
    let expr: Expression;
    try {
      expr = subParser.expression();
      if (!subParser.isAtEnd()) {
        throw new Error(subParser.unexpectedTokenMessage("Expected '}' after template expression"));
      }
    } finally {
      this.errors.push(...subParser.errors);
    }
    return expr;
  }

  /** Rewrites `line L, column C` of a message produced for a sub-source starting at line/column. */
  private shiftPositions(message: string, line: number, column: number): string {
    return message.replace(/line (\d+), column (\d+)/g, (_match, l: string, c: string) => {
      const subLine = Number(l);
      const realColumn = subLine === 1 ? Number(c) + column - 1 : Number(c);
      return `line ${subLine + line - 1}, column ${realColumn}`;
    });
  }

  /** True when the upcoming tokens have exactly these types. */
  public checkSequence(...types: TokenType[]): boolean {
    return types.every((type, offset) => this.tokens[this.current + offset]?.type === type);
  }

  public match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private peek(): Token {
    if (this.current >= this.tokens.length) {
      // Return the last token (should be EOF) if we're past the end
      return this.tokens[this.tokens.length - 1];
    }
    return this.tokens[this.current];
  }

  private peekNext(): Token | undefined {
    if (this.current + 1 >= this.tokens.length) return undefined;
    return this.tokens[this.current + 1];
  }

  private previous(): Token {
    const index = this.current - 1;
    if (index < 0) {
      // Return the first token if we're before the start
      return this.tokens[0];
    }
    if (index >= this.tokens.length) {
      // Return the last token if we're past the end
      return this.tokens[this.tokens.length - 1];
    }
    return this.tokens[index];
  }

  public consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();

    throw new Error(this.unexpectedTokenMessage(message));
  }

  /**
   * Statement terminator. As in JavaScript, ';' may be omitted before '}', at
   * the end of input, or when the next token starts on a new line.
   */
  private consumeSemicolon(message: string): void {
    if (this.match(TokenType.SEMICOLON)) return;
    if (this.check(TokenType.RIGHT_BRACE) || this.isAtEnd() || this.hasLineBreakBefore()) return;
    throw new Error(this.unexpectedTokenMessage(message));
  }

  /** Separator after an interface or object-type member: ';' or ','. */
  private consumeMemberSeparator(message: string): void {
    if (this.match(TokenType.COMMA)) return;
    this.consumeSemicolon(message);
  }

  /** True when the current token starts on a later line than the previous one ended. */
  private hasLineBreakBefore(): boolean {
    if (this.current === 0) return false;
    const previous = this.previous();
    // Template literals are the only tokens whose value keeps their line breaks
    const lastLine =
      previous.type === TokenType.TEMPLATE_LITERAL
        ? previous.line + (previous.value.match(/\n/g)?.length ?? 0)
        : previous.line;
    return this.peek().line > lastLine;
  }

  private unexpectedTokenMessage(message: string): string {
    const token = this.peek();
    const shown = token.type === TokenType.EOF ? 'end of input' : `'${token.value}'`;
    return `Unexpected token ${shown} at line ${token.line}, column ${token.column} (${message})`;
  }

  public importDeclaration(): ImportDeclaration {
    const importToken = this.previous();
    const specifiers: Array<ImportSpecifier | ImportDefaultSpecifier | ImportNamespaceSpecifier> =
      [];

    // Handle default import or named imports
    if (this.check(TokenType.IDENTIFIER)) {
      const local = this.advance();
      specifiers.push({
        type: 'ImportDefaultSpecifier',
        local: {
          type: 'Identifier',
          name: local.value,
          line: local.line,
          column: local.column,
        } as Identifier,
        line: local.line,
        column: local.column,
      } as ImportDefaultSpecifier);

      if (this.match(TokenType.COMMA)) {
        // Handle named imports after default
        this.consume(TokenType.LEFT_BRACE, "Expected '{' after default import");
        this.parseNamedImports(specifiers);
        this.consume(TokenType.RIGHT_BRACE, "Expected '}' after named imports");
      }
    } else if (this.match(TokenType.MULTIPLY)) {
      this.consume(TokenType.ЧУН, "Expected 'чун' after '*' in namespace import");
      let local: Token;
      if (this.check(TokenType.IDENTIFIER)) {
        local = this.advance();
      } else if (this.matchBuiltinIdentifier()) {
        local = this.previous();
      } else {
        const token = this.peek();
        throw new Error(
          `Expected namespace alias after 'чун' at line ${token.line}, column ${token.column}`
        );
      }

      specifiers.push({
        type: 'ImportNamespaceSpecifier',
        local: {
          type: 'Identifier',
          name: local.value,
          line: local.line,
          column: local.column,
        } as Identifier,
        line: local.line,
        column: local.column,
      } as ImportNamespaceSpecifier);
    } else if (this.match(TokenType.LEFT_BRACE)) {
      // Handle only named imports
      this.parseNamedImports(specifiers);
      this.consume(TokenType.RIGHT_BRACE, "Expected '}' after named imports");
    }

    this.consume(TokenType.АЗ, "Expected 'аз' after import specifiers");
    const source = this.consume(TokenType.STRING, 'Expected module path');
    this.consumeSemicolon("Expected ';' after import");

    return {
      type: 'ImportDeclaration',
      specifiers,
      source: {
        type: 'Literal',
        value: source.value,
        raw: `"${source.value}"`,
        line: source.line,
        column: source.column,
      } as Literal,
      line: importToken.line,
      column: importToken.column,
    };
  }

  private parseImportOrExportName(errorMessage: string): Token {
    if (this.check(TokenType.IDENTIFIER)) {
      return this.advance();
    }
    if (this.matchBuiltinIdentifier()) {
      return this.previous();
    }
    throw new Error(`${errorMessage} at line ${this.peek().line}, column ${this.peek().column}`);
  }

  private createImportSpecifier(imported: Token, local: Token): ImportSpecifier {
    return {
      type: 'ImportSpecifier',
      imported: {
        type: 'Identifier',
        name: imported.value,
        line: imported.line,
        column: imported.column,
      } as Identifier,
      local: {
        type: 'Identifier',
        name: local.value,
        line: local.line,
        column: local.column,
      } as Identifier,
      line: imported.line,
      column: imported.column,
    } as ImportSpecifier;
  }

  private parseNamedImports(
    specifiers: Array<ImportSpecifier | ImportDefaultSpecifier | ImportNamespaceSpecifier>
  ): void {
    if (this.check(TokenType.RIGHT_BRACE)) {
      return;
    }

    do {
      const imported = this.parseImportOrExportName('Expected import name');
      let local = imported;

      if (this.match(TokenType.ЧУН)) {
        local = this.parseImportOrExportName("Expected local name after 'чун'");
      }

      specifiers.push(this.createImportSpecifier(imported, local));
    } while (this.match(TokenType.COMMA));
  }

  public exportDeclaration(): ExportDeclaration {
    const exportToken = this.previous();

    // Handle: содир пешфарз <declaration>
    if (this.match(TokenType.ПЕШФАРЗ)) {
      const declaration = this.statement();
      return {
        type: 'ExportDeclaration',
        declaration: declaration!,
        default: true,
        line: exportToken.line,
        column: exportToken.column,
      };
    }

    // Handle: содир { name1, name2 }
    if (this.match(TokenType.LEFT_BRACE)) {
      const specifiers = this.parseExportSpecifiers();
      this.consume(TokenType.RIGHT_BRACE, "Expected '}' after export specifiers");

      // Handle: содир { name1, name2 } аз "module"
      let source: Literal | undefined;
      if (this.match(TokenType.АЗ)) {
        const sourceToken = this.consume(TokenType.STRING, 'Expected module path after аз');
        source = {
          type: 'Literal',
          value: sourceToken.value,
          raw: `"${sourceToken.value}"`,
          line: sourceToken.line,
          column: sourceToken.column,
        };
      }

      this.consumeSemicolon("Expected ';' after export statement");

      return {
        type: 'ExportDeclaration',
        specifiers,
        source,
        default: false,
        line: exportToken.line,
        column: exportToken.column,
      };
    }

    // Handle: содир * аз "module"
    if (this.match(TokenType.MULTIPLY)) {
      this.consume(TokenType.АЗ, "Expected 'аз' after '*'");
      const sourceToken = this.consume(TokenType.STRING, 'Expected module path');
      const source: Literal = {
        type: 'Literal',
        value: sourceToken.value,
        raw: `"${sourceToken.value}"`,
        line: sourceToken.line,
        column: sourceToken.column,
      };

      this.consumeSemicolon("Expected ';' after export statement");

      return {
        type: 'ExportDeclaration',
        specifiers: [],
        source,
        default: false,
        line: exportToken.line,
        column: exportToken.column,
      };
    }

    // Handle: содир <declaration>
    // This includes: функсия, синф, собит, тағйирёбанда, интерфейс, навъ, ҳамзамон функсия

    // Special handling for async functions
    if (this.match(TokenType.ҲАМЗАМОН)) {
      this.consume(TokenType.ФУНКСИЯ, "Expected 'функсия' after 'ҳамзамон'");
      const func = this.functionDeclaration();
      (func as FunctionDeclaration & { async?: boolean }).async = true;
      return {
        type: 'ExportDeclaration',
        declaration: func,
        default: false,
        line: exportToken.line,
        column: exportToken.column,
      };
    }

    const declaration = this.statement();
    return {
      type: 'ExportDeclaration',
      declaration: declaration!,
      default: false,
      line: exportToken.line,
      column: exportToken.column,
    };
  }

  private createExportSpecifier(local: Token, exported: Token): ExportSpecifier {
    return {
      type: 'ExportSpecifier',
      local: {
        type: 'Identifier',
        name: local.value,
        line: local.line,
        column: local.column,
      },
      exported: {
        type: 'Identifier',
        name: exported.value,
        line: exported.line,
        column: exported.column,
      },
      line: local.line,
      column: local.column,
    };
  }

  private parseExportSpecifiers(): ExportSpecifier[] {
    const specifiers: ExportSpecifier[] = [];

    if (this.check(TokenType.RIGHT_BRACE)) {
      return specifiers;
    }

    do {
      const local = this.parseImportOrExportName('Expected export name');
      let exported = local;

      if (this.match(TokenType.ЧУН)) {
        exported = this.parseImportOrExportName("Expected export alias after 'чун'");
      }

      specifiers.push(this.createExportSpecifier(local, exported));
    } while (this.match(TokenType.COMMA));

    return specifiers;
  }

  private static readonly BUILTIN_IDENTIFIER_TYPES: ReadonlySet<TokenType> = new Set([
    TokenType.ВАЪДА, // Promise, as a value: `нав Ваъда(…)`, `Ваъда.all(…)`
    TokenType.ЧОП,
    TokenType.САБТ,
    TokenType.ХАТО,
    TokenType.ОГОҲӢ,
    TokenType.МАЪЛУМОТ,
    TokenType.ИСФТИ,
    TokenType.ТАСДИҚ,
    TokenType.ҚАЙД,
    TokenType.ҚАЙДАСЛ,
    TokenType.ВАҚТ,
    TokenType.ВАҚТСАБТ,
    TokenType.ВАҚТОХИР,
    TokenType.ҶАДВАЛ,
    TokenType.ФЕҲРИСТ,
    TokenType.XMLФЕҲРИСТ,
    TokenType.ПАЙҶО,
    TokenType.ПОЛИЗ,
    TokenType.ГУРУҲ,
    TokenType.ГУРУҲОХИР,
    TokenType.ГУРУҲПӮШИДА,
    TokenType.РӮЙХАТ,
    TokenType.ИЛОВА,
    TokenType.БАРОВАРДАН,
    TokenType.ДАРОЗӢ,
    TokenType.ХАРИТА,
    TokenType.ФИЛТР,
    TokenType.КОФТАН,
    TokenType.ГИРИФТАН, // Allow 'гирифтан' as identifier (common method name)
    // String methods
    TokenType.САТРМЕТОДҲО,
    TokenType.ДАРОЗИИСАТР,
    TokenType.ПАЙВАСТАН,
    TokenType.ҶОЙИВАЗКУНӢ,
    TokenType.ҶУДОКУНӢ,
    TokenType.КАЛИДҲО,
    TokenType.ҚИМАТҲО,
    TokenType.МАТЕМАТИКА,
    TokenType.ҶАМЪ,
    TokenType.ТАРҲ,
    TokenType.ЗАРБ,
    TokenType.ТАҚСИМ,
    TokenType.ҲОЛАТ,

    // Control flow keywords that can be used as property names
    TokenType.ТО,
    TokenType.АЗ,
    TokenType.ДАР,

    // Contextual Keywords: Primitive and special types
    // These can be used as identifiers in value contexts but act as keywords in type contexts
    TokenType.РАҚАМ,
    TokenType.САТР,
    TokenType.МАНТИҚӢ,
    TokenType.ХОЛӢ,
    TokenType.ОБЪЕКТ, // Contextual: can be used as variable name
    TokenType.ҲАР, // Contextual: any type
    TokenType.НОШИНОС, // Contextual: unknown type
    TokenType.АБАДАН, // Contextual: never type
    TokenType.БЕДЖАВОБ, // Contextual: void type

    // Contextual Keywords: Type operators and utilities
    TokenType.НАВЪ, // Contextual: type keyword
    TokenType.КАЛИДҲОИ, // Contextual: keyof operator
    TokenType.НАВЪИ, // Contextual: typeof operator
    TokenType.САБТ_НАВЪ, // Contextual: typeof/type alias
    TokenType.ГИРИФТАН_НАВЪ, // Contextual: ReturnType utility
    TokenType.ҲАЗФ, // Contextual: Omit utility
    TokenType.ХОРИҶ, // Contextual: Exclude utility
    TokenType.ИСТИХРОҶ, // Contextual: Extract utility
    TokenType.БЕНАЛИӢ, // Contextual: Awaited utility
    TokenType.НАВЪИ_БОЗГАШТ, // Contextual: ReturnType
    TokenType.ПАРАМЕТРҲО, // Contextual: Parameters
    TokenType.НАВЪИ_НАМУНА, // Contextual: InstanceType
    TokenType.ПАРАМЕТРҲОИ_КОНСТРУКТОР, // Contextual: ConstructorParameters
    TokenType.НАВЪИ_ПАРАМЕТРИ_ИН, // Contextual: ThisParameterType
    TokenType.ИНТИЗОРШУДА, // Contextual: Awaited type

    // Type declaration keywords (contextual)
    TokenType.ЯКХЕЛА, // Contextual: extends keyword
    TokenType.МЕРОС, // Contextual: inheritance
    TokenType.ТАТБИҚ, // Contextual: implements
    TokenType.СУПЕР, // Contextual: super (can appear in expressions)
    TokenType.КОНСТРУКТОР, // Contextual: constructor
    TokenType.ХОСУСӢ, // Contextual: private
    TokenType.МУҲОФИЗАТШУДА, // Contextual: protected
    TokenType.ҶАМЪИЯТӢ, // Contextual: public
    TokenType.СТАТИКӢ, // Contextual: static
    TokenType.МАВҲУМ, // Contextual: abstract
    TokenType.НОМФАЗО, // Contextual: namespace
    TokenType.ИНФЕР, // Contextual: infer
    TokenType.ХУЛОСА, // Contextual: conclusion/end
    TokenType.ТАНҲОХОНӢ, // Contextual: readonly
    TokenType.БЕНАЗИР, // Contextual: unique
    TokenType.АСТ, // Contextual: is type guard
    TokenType.БАРМЕСОЁ, // Contextual: satisfies operator
    TokenType.ҚИСМӢ, // Contextual: Partial utility
    TokenType.ҲАТМӢ, // Contextual: Required utility
    TokenType.ТАНҲОХОН, // Contextual: Readonly utility
  ]);

  private matchBuiltinIdentifier(): boolean {
    if (this.isBuiltinIdentifierType(this.peek().type)) {
      this.advance();
      return true;
    }
    return false;
  }

  private isBuiltinIdentifierType(type: TokenType): boolean {
    return Parser.BUILTIN_IDENTIFIER_TYPES.has(type);
  }

  /** Tokens usable as a plain identifier (variable or parameter name). */
  private isPlainIdentifierToken(token: Token): boolean {
    return (
      token.type === TokenType.IDENTIFIER ||
      this.isBuiltinIdentifierType(token.type) ||
      token.type === TokenType.НАВЪ ||
      token.type === TokenType.МАЪЛУМОТ ||
      token.type === TokenType.РӮЙХАТ ||
      token.type === TokenType.БЕҚИМАТ
    );
  }

  private arrayExpression(): ArrayExpression {
    const leftBracket = this.previous();
    const elements: Expression[] = [];

    while (!this.check(TokenType.RIGHT_BRACKET)) {
      elements.push(this.spreadOrAssignment());
      if (!this.match(TokenType.COMMA)) break;
    }

    this.consume(TokenType.RIGHT_BRACKET, "Expected ']' after array elements");

    return {
      type: 'ArrayExpression',
      elements,
      line: leftBracket.line,
      column: leftBracket.column,
    } as ArrayExpression;
  }

  private objectExpression(): ObjectExpression {
    const leftBrace = this.previous();
    const properties: (Property | SpreadElement)[] = [];

    while (!this.check(TokenType.RIGHT_BRACE)) {
      if (this.check(TokenType.SPREAD)) {
        properties.push(this.spreadOrAssignment() as SpreadElement);
      } else {
        properties.push(this.parseProperty());
      }
      if (!this.match(TokenType.COMMA)) break;
    }

    this.consume(TokenType.RIGHT_BRACE, "Expected '}' after object properties");

    return {
      type: 'ObjectExpression',
      properties,
      line: leftBrace.line,
      column: leftBrace.column,
    } as ObjectExpression;
  }

  private parseProperty(): Property {
    const startToken = this.peek();
    let key: Identifier | Literal;
    let computed = false;

    if (this.match(TokenType.LEFT_BRACKET)) {
      // Computed property
      key = this.assignment() as Literal;
      this.consume(TokenType.RIGHT_BRACKET, "Expected ']' after computed property name");
      computed = true;
    } else if (this.match(TokenType.STRING)) {
      key = this.createLiteral(this.previous().value, this.previous());
    } else if (this.match(TokenType.NUMBER)) {
      key = this.createNumericLiteral(this.previous());
    } else if (this.isIdentifierNameToken(startToken)) {
      // Keywords can be used as property names
      key = this.createIdentifier(this.advance());
    } else {
      throw new Error(this.unexpectedTokenMessage('Expected property name'));
    }

    const property: Property = {
      type: 'Property',
      key,
      value: key,
      computed,
      shorthand: false,
      line: startToken.line,
      column: startToken.column,
    };

    if (this.match(TokenType.LEFT_PAREN)) {
      // Method shorthand: { ном() { … } }
      const params = this.parseParameterList("Expected ')' after method parameters");
      let returnType: TypeAnnotation | undefined;
      if (this.match(TokenType.COLON)) {
        returnType = this.typeAnnotation();
      }
      this.consume(TokenType.LEFT_BRACE, "Expected '{' before method body");
      const body = this.blockStatement();
      property.value = {
        type: 'FunctionExpression',
        params,
        body,
        returnType,
        line: startToken.line,
        column: startToken.column,
      } as FunctionExpression;
      property.method = true;
      return property;
    }

    if (this.match(TokenType.COLON)) {
      property.value = this.assignment();
      return property;
    }

    // Shorthand: { ном } stands for { ном: ном }
    if (
      !computed &&
      key.type === 'Identifier' &&
      this.isPlainIdentifierToken(startToken) &&
      (this.check(TokenType.COMMA) || this.check(TokenType.RIGHT_BRACE))
    ) {
      property.value = this.createIdentifier(startToken);
      property.shorthand = true;
      return property;
    }

    throw new Error(this.unexpectedTokenMessage("Expected ':' after property key"));
  }

  private tryStatement(): TryStatement {
    const tryToken = this.previous();

    // Consume the opening brace for try block
    this.consume(TokenType.LEFT_BRACE, "Expected '{' after 'кӯшиш'");
    const block = this.blockStatement();

    let handler: CatchClause | undefined = undefined;
    if (this.match(TokenType.ГИРИФТАН)) {
      let param: Identifier | undefined = undefined;
      // The binding is optional, as in `catch { … }` (ES2019).
      if (this.match(TokenType.LEFT_PAREN)) {
        if (this.check(TokenType.IDENTIFIER) || this.matchBuiltinIdentifier()) {
          const paramToken = this.check(TokenType.IDENTIFIER) ? this.advance() : this.previous();
          param = {
            type: 'Identifier',
            name: paramToken.value,
            line: paramToken.line,
            column: paramToken.column,
          };
        }
        this.consume(TokenType.RIGHT_PAREN, "Expected ')' after catch parameter");
      }
      this.consume(TokenType.LEFT_BRACE, "Expected '{' after catch clause");
      const body = this.blockStatement();

      handler = {
        type: 'CatchClause',
        param,
        body,
        line: this.previous().line,
        column: this.previous().column,
      };
    }

    let finalizer: BlockStatement | undefined = undefined;
    if (this.match(TokenType.НИҲОЯТ)) {
      this.consume(TokenType.LEFT_BRACE, "Expected '{' after 'ниҳоят'");
      finalizer = this.blockStatement();
    }

    return {
      type: 'TryStatement',
      block,
      handler,
      finalizer,
      line: tryToken.line,
      column: tryToken.column,
    };
  }

  private throwStatement(): ThrowStatement {
    const throwToken = this.previous();
    const argument = this.expression();
    this.consumeSemicolon("Expected ';' after throw statement");

    return {
      type: 'ThrowStatement',
      argument,
      line: throwToken.line,
      column: throwToken.column,
    };
  }

  /** Parses parameters after a consumed '(' up to and including the closing ')'. */
  private parseParameterList(closeMessage: string): Parameter[] {
    const params: Parameter[] = [];
    while (!this.check(TokenType.RIGHT_PAREN)) {
      const param = this.parseParameter();
      params.push(param);
      if (param.rest && !this.check(TokenType.RIGHT_PAREN)) {
        throw new Error(
          `Rest parameter must be last at line ${this.peek().line}, column ${this.peek().column}`
        );
      }
      if (!this.match(TokenType.COMMA)) break;
    }
    this.consume(TokenType.RIGHT_PAREN, closeMessage);
    return params;
  }

  private parseParameter(): Parameter {
    const rest = this.match(TokenType.SPREAD);
    const startToken = this.peek();

    let name: Identifier;
    let pattern: ArrayPattern | ObjectPattern | undefined;
    if (this.check(TokenType.LEFT_BRACKET) || this.check(TokenType.LEFT_BRACE)) {
      pattern = this.parsePattern() as ArrayPattern | ObjectPattern;
      // Synthetic name; codegen emits `pattern` in its place
      name = {
        type: 'Identifier',
        name: `__param${this.patternCounter++}`,
        line: startToken.line,
        column: startToken.column,
      };
    } else if (
      this.check(TokenType.IDENTIFIER) ||
      this.matchBuiltinIdentifier() ||
      this.match(TokenType.НАВЪ, TokenType.МАЪЛУМОТ, TokenType.РӮЙХАТ, TokenType.БЕҚИМАТ)
    ) {
      // Common Tajik words are allowed as parameter names
      name = this.createIdentifier(
        this.check(TokenType.IDENTIFIER) ? this.advance() : this.previous()
      );
    } else {
      throw new Error(
        `Expected parameter name at line ${startToken.line}, column ${startToken.column}`
      );
    }

    // Parse optional indicator
    const optional = this.match(TokenType.QUESTION);

    // Parse optional type annotation
    let typeAnnotation: TypeAnnotation | undefined;
    if (this.match(TokenType.COLON)) {
      typeAnnotation = this.typeAnnotation();
    }

    let defaultValue: Expression | undefined;
    if (this.match(TokenType.ASSIGN)) {
      if (rest) {
        throw new Error(
          `Rest parameter cannot have a default value at line ${this.previous().line}, column ${this.previous().column}`
        );
      }
      defaultValue = this.assignment();
    }

    const param: Parameter = {
      type: 'Parameter',
      name,
      typeAnnotation,
      optional,
      line: startToken.line,
      column: startToken.column,
    };
    if (defaultValue) param.defaultValue = defaultValue;
    if (rest) param.rest = true;
    if (pattern) param.pattern = pattern;
    return param;
  }

  private typeAnnotation(): TypeAnnotation {
    const typeNode = this.parseType();
    return {
      type: 'TypeAnnotation',
      typeAnnotation: typeNode,
      line: typeNode.line,
      column: typeNode.column,
    };
  }

  private parseType(): TypeNode {
    return this.conditionalType();
  }

  private conditionalType(): TypeNode {
    const type = this.unionType();

    // Handle conditional types: T мерос constraint ? trueType : falseType
    if (this.match(TokenType.МЕРОС)) {
      const constraint = this.unionType();

      if (!this.match(TokenType.QUESTION)) {
        this.errors.push(
          `Expected '?' in conditional type at line ${this.peek().line}, column ${this.peek().column}`
        );
        return type;
      }

      const trueType = this.unionType();

      if (!this.match(TokenType.COLON)) {
        this.errors.push(
          `Expected ':' in conditional type at line ${this.peek().line}, column ${this.peek().column}`
        );
        return type;
      }

      const falseType = this.conditionalType(); // Right-associative for nested conditionals

      return {
        type: 'ConditionalType',
        checkType: type,
        extendsType: constraint,
        trueType,
        falseType,
        line: type.line,
        column: type.column,
      } as ConditionalType;
    }

    return type;
  }

  private unionType(): TypeNode {
    let type = this.intersectionType();

    while (this.match(TokenType.BITWISE_OR)) {
      const types = [type];
      do {
        types.push(this.intersectionType());
      } while (this.match(TokenType.BITWISE_OR));

      type = {
        type: 'UnionType',
        types,
        line: type.line,
        column: type.column,
      } as UnionType;
    }

    return type;
  }

  private intersectionType(): TypeNode {
    let type = this.primaryType();

    while (this.match(TokenType.BITWISE_AND)) {
      const types = [type];
      do {
        types.push(this.primaryType());
      } while (this.match(TokenType.BITWISE_AND));

      type = {
        type: 'IntersectionType',
        types,
        line: type.line,
        column: type.column,
      } as IntersectionType;
    }

    return type;
  }

  private primaryType(): TypeNode {
    let type =
      this.parseParenthesizedOrArrayType() ??
      this.parseUniqueType() ??
      this.parseKeyofType() ??
      this.parseLiteralType() ??
      this.parsePrimitiveType() ??
      this.parseGenericOrIdentifierType() ??
      this.parseTupleType() ??
      this.parseObjectType() ??
      this.errorExpectedType();

    // Postfix forms: array `Т[]` and indexed access `Т[К]`, on the line of `Т`
    while (!this.hasLineBreakBefore() && this.match(TokenType.LEFT_BRACKET)) {
      if (this.match(TokenType.RIGHT_BRACKET)) {
        type = {
          type: 'ArrayType',
          elementType: type,
          line: type.line,
          column: type.column,
        } as ArrayType;
      } else {
        const indexType = this.parseType();
        this.consume(TokenType.RIGHT_BRACKET, "Expected ']' after index type");
        type = {
          type: 'IndexedAccessType',
          objectType: type,
          indexType,
          line: type.line,
          column: type.column,
        } as IndexedAccessType;
      }
    }
    return type;
  }

  /** `калидҳои Т` (keyof) */
  private parseKeyofType(): TypeNode | undefined {
    if (!this.match(TokenType.КАЛИДҲОИ)) return undefined;
    const keyofToken = this.previous();
    return {
      type: 'KeyofType',
      operand: this.primaryType(),
      line: keyofToken.line,
      column: keyofToken.column,
    } as KeyofType;
  }

  private parseParenthesizedOrArrayType(): TypeNode | undefined {
    if (!this.check(TokenType.LEFT_PAREN)) return undefined;
    if (this.isFunctionTypeStart()) return this.parseFunctionType();
    this.advance();
    const type = this.parseType();
    this.consume(TokenType.RIGHT_PAREN, "Expected ')' after type");
    return type;
  }

  /** At `(`: does the matching `)` precede `=>`? Then this is a function type. */
  private isFunctionTypeStart(): boolean {
    let depth = 0;
    for (let i = this.current; i < this.tokens.length; i++) {
      const type = this.tokens[i].type;
      if (type === TokenType.LEFT_PAREN) depth++;
      else if (type === TokenType.RIGHT_PAREN && --depth === 0) {
        return this.tokens[i + 1]?.type === TokenType.ARROW;
      } else if (type === TokenType.EOF) return false;
    }
    return false;
  }

  /** `(а: рақам, ...б: сатр[]) => мантиқӣ` */
  private parseFunctionType(): FunctionType {
    const openParen = this.advance();
    const parameters = this.parseParameterList("Expected ')' after function type parameters");
    this.consume(TokenType.ARROW, "Expected '=>' in function type");
    return {
      type: 'FunctionType',
      parameters,
      returnType: this.parseType(),
      line: openParen.line,
      column: openParen.column,
    };
  }

  private parseUniqueType(): TypeNode | undefined {
    if (!this.match(TokenType.БЕНАЗИР)) return undefined;
    const uniqueToken = this.previous();
    const baseType = this.primaryType();
    const uniqueType: UniqueType = {
      type: 'UniqueType',
      baseType,
      line: uniqueToken.line,
      column: uniqueToken.column,
    };
    return uniqueType;
  }

  private parseLiteralType(): TypeNode | undefined {
    // Parse string literals in types (e.g., "фъало" in union types)
    if (this.check(TokenType.STRING)) {
      const token = this.advance();
      return {
        type: 'LiteralType',
        value: token.value,
        line: token.line,
        column: token.column,
      } as LiteralType;
    }
    // Parse number literals in types (e.g., 1 | 2 in union types)
    if (this.check(TokenType.NUMBER)) {
      const token = this.advance();
      return {
        type: 'LiteralType',
        value: this.createNumericLiteral(token).value as number,
        line: token.line,
        column: token.column,
      } as LiteralType;
    }
    // A template literal type (`${А}-${Б}`) is approximated as a string
    if (this.match(TokenType.TEMPLATE_LITERAL)) {
      const token = this.previous();
      return {
        type: 'PrimitiveType',
        name: 'сатр',
        line: token.line,
        column: token.column,
      } as PrimitiveType;
    }
    // Parse boolean literals in types (e.g., true | false)
    if (this.match(TokenType.ДУРУСТ, TokenType.НОДУРУСТ)) {
      const token = this.previous();
      return {
        type: 'LiteralType',
        value: token.value === 'дуруст',
        line: token.line,
        column: token.column,
      } as LiteralType;
    }
    return undefined;
  }

  private parsePrimitiveType(): TypeNode | undefined {
    if (
      !this.match(
        TokenType.САТР,
        TokenType.РАҚАМ,
        TokenType.МАНТИҚӢ,
        TokenType.ХОЛӢ,
        TokenType.БЕҚИМАТ,
        TokenType.ҲАР,
        TokenType.НОШИНОС,
        TokenType.АБАДАН,
        TokenType.БЕДЖАВОБ,
        TokenType.ОБЪЕКТ
      )
    ) {
      return undefined;
    }
    const token = this.previous();
    const primitiveType: PrimitiveType = {
      type: 'PrimitiveType',
      name: token.value as 'сатр' | 'рақам' | 'мантиқӣ' | 'холӣ' | 'беқимат',
      line: token.line,
      column: token.column,
    };
    return primitiveType;
  }

  private parseGenericOrIdentifierType(): TypeNode | undefined {
    // Allow certain keywords to be used as type names
    if (
      !this.check(TokenType.IDENTIFIER) &&
      !this.matchBuiltinIdentifier() &&
      // `Ваъда<Т>` (a builtin identifier) is the Promise type
      !this.match(TokenType.ФУНКСИЯ)
    ) {
      return undefined;
    }
    const nameToken = this.check(TokenType.IDENTIFIER) ? this.advance() : this.previous();

    // Build the full name, handling qualified types like Foo.Bar
    let fullName = nameToken.value;

    // Handle qualified type names (e.g., Namespace.Type)
    while (this.match(TokenType.DOT)) {
      if (this.check(TokenType.IDENTIFIER)) {
        const nextToken = this.advance();
        fullName += '.' + nextToken.value;
      } else if (this.matchBuiltinIdentifier()) {
        const nextToken = this.previous();
        fullName += '.' + nextToken.value;
      } else {
        // If we can't parse what comes after the dot, treat it as an error
        this.errors.push(`Expected type name after '.' at line ${this.peek().line}`);
        break;
      }
    }

    const name: Identifier = {
      type: 'Identifier',
      name: fullName,
      line: nameToken.line,
      column: nameToken.column,
    };
    let typeParameters: TypeNode[] | undefined;
    if (this.match(TokenType.LESS_THAN)) {
      typeParameters = [];
      do {
        typeParameters.push(this.parseType());
      } while (this.match(TokenType.COMMA));
      this.consumeTypeArgumentsClose();
    }
    const genericType: GenericType = {
      type: 'GenericType',
      name,
      typeParameters,
      line: name.line,
      column: name.column,
    };
    return genericType;
  }

  /** Named tuple members (`[х: рақам, у: рақам]`): the label is documentation only. */
  private skipTupleMemberLabel(): void {
    if (
      this.peekNext()?.type === TokenType.COLON &&
      (this.check(TokenType.IDENTIFIER) || this.isBuiltinIdentifierType(this.peek().type))
    ) {
      this.advance();
      this.advance(); // ':'
    }
  }

  private parseTupleType(): TypeNode | undefined {
    if (!this.match(TokenType.LEFT_BRACKET)) return undefined;
    const types: TypeNode[] = [];
    if (!this.check(TokenType.RIGHT_BRACKET)) {
      do {
        this.skipTupleMemberLabel();
        types.push(this.unionType());
      } while (this.match(TokenType.COMMA));
    }
    this.consume(TokenType.RIGHT_BRACKET, "Expected ']' after tuple types");
    const tupleType: TupleType = {
      type: 'TupleType',
      elementTypes: types,
      line: this.previous().line,
      column: this.previous().column,
    };
    return tupleType;
  }

  private parseObjectType(): TypeNode | undefined {
    if (!this.match(TokenType.LEFT_BRACE)) return undefined;
    const leftBrace = this.previous();
    if (this.isMappedTypeStart()) {
      return this.parseMappedType(leftBrace);
    }

    const properties: PropertySignature[] = [];
    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      properties.push(this.propertySignature());
    }

    this.consume(TokenType.RIGHT_BRACE, "Expected '}' after object type properties");

    return {
      type: 'ObjectType',
      properties,
      line: leftBrace.line,
      column: leftBrace.column,
    } as ObjectType;
  }

  /** After '{': `[танҳохонӣ] [К дар …]` starts a mapped type. */
  private isMappedTypeStart(): boolean {
    let index = this.current;
    if (
      this.tokens[index]?.type === TokenType.PLUS ||
      this.tokens[index]?.type === TokenType.MINUS
    ) {
      index++;
    }
    if (this.tokens[index]?.type === TokenType.ТАНҲОХОНӢ) index++;
    return (
      this.tokens[index]?.type === TokenType.LEFT_BRACKET &&
      this.tokens[index + 1] !== undefined &&
      this.isPlainIdentifierToken(this.tokens[index + 1]) &&
      this.tokens[index + 2]?.type === TokenType.ДАР
    );
  }

  /**
   * `{ [+|-]танҳохонӣ [К дар Т чун Н]+?|-?: Х }` — types are erased, so `+`/`-`
   * only parse.
   */
  private parseMappedType(leftBrace: Token): TypeNode {
    const removesReadonly = this.match(TokenType.MINUS);
    if (!removesReadonly) this.match(TokenType.PLUS);
    const readonly = this.match(TokenType.ТАНҲОХОНӢ) && !removesReadonly;

    this.consume(TokenType.LEFT_BRACKET, "Expected '[' in mapped type");
    const nameToken = this.advance();
    this.consume(TokenType.ДАР, "Expected 'дар' in mapped type");
    const constraint = this.parseType();
    // Key remapping (TypeScript `as`): `[К дар калидҳои Т чун Н]`
    let nameType: TypeNode | undefined;
    if (this.check(TokenType.ЧУН) || this.checkIdentifierValue('as')) {
      this.advance();
      nameType = this.parseType();
    }
    this.consume(TokenType.RIGHT_BRACKET, "Expected ']' in mapped type");

    let optional = false;
    if (this.match(TokenType.MINUS)) {
      this.consume(TokenType.QUESTION, "Expected '?' after '-' in mapped type");
    } else {
      this.match(TokenType.PLUS);
      optional = this.match(TokenType.QUESTION);
    }

    this.consume(TokenType.COLON, "Expected ':' in mapped type");
    const typeAnnotation = this.typeAnnotation();
    this.match(TokenType.SEMICOLON, TokenType.COMMA);
    this.consume(TokenType.RIGHT_BRACE, "Expected '}' after mapped type");

    return {
      type: 'MappedType',
      typeParameter: {
        type: 'TypeParameter',
        name: this.createIdentifier(nameToken),
        constraint,
        line: nameToken.line,
        column: nameToken.column,
      },
      typeAnnotation,
      optional,
      readonly,
      ...(nameType && { nameType }),
      line: leftBrace.line,
      column: leftBrace.column,
    } as MappedType;
  }

  /** Consumes one '>' closing type arguments, splitting a `>>` / `>>>` token if needed. */
  private consumeTypeArgumentsClose(message = "Expected '>' after type parameters"): void {
    const token = this.peek();
    if (token.type === TokenType.RIGHT_SHIFT || token.type === TokenType.UNSIGNED_RIGHT_SHIFT) {
      const rest = token.value.slice(1);
      this.tokens.splice(
        this.current,
        1,
        { ...token, type: TokenType.GREATER_THAN, value: '>' },
        {
          ...token,
          type: rest === '>' ? TokenType.GREATER_THAN : TokenType.RIGHT_SHIFT,
          value: rest,
          column: token.column + 1,
        }
      );
    }
    this.consume(TokenType.GREATER_THAN, message);
  }

  private errorExpectedType(): never {
    throw new Error(`Expected type at line ${this.peek().line}, column ${this.peek().column}`);
  }

  /** `<Т, К мерос калидҳои Т = Т>` */
  private parseTypeParameters(): TypeParameter[] | undefined {
    if (!this.match(TokenType.LESS_THAN)) {
      return undefined;
    }

    const typeParameters: TypeParameter[] = [];
    do {
      // A trailing comma is allowed: `<Т,>(х: Т) => х`
      if (typeParameters.length > 0 && this.check(TokenType.GREATER_THAN)) break;
      const paramName = this.parseImportOrExportName('Expected type parameter name');
      const typeParameter: TypeParameter = {
        type: 'TypeParameter',
        name: this.createIdentifier(paramName),
        line: paramName.line,
        column: paramName.column,
      };
      if (this.match(TokenType.МЕРОС)) {
        typeParameter.constraint = this.parseType();
      }
      if (this.match(TokenType.ASSIGN)) {
        typeParameter.default = this.parseType();
      }
      typeParameters.push(typeParameter);
    } while (this.match(TokenType.COMMA));

    this.consumeTypeArgumentsClose();
    return typeParameters;
  }

  /** `мерос А, Б<Т>` — the parent interfaces, or undefined without a clause. */
  private parseInterfaceExtendsClause(): TypeNode[] | undefined {
    if (!this.match(TokenType.МЕРОС)) {
      return undefined;
    }

    const parents: TypeNode[] = [];
    do {
      const parent = this.parseGenericOrIdentifierType();
      if (!parent) {
        throw new Error(
          `Expected interface name after 'мерос' at line ${this.peek().line}, column ${this.peek().column}`
        );
      }
      parents.push(parent);
    } while (this.match(TokenType.COMMA));
    return parents;
  }

  private parseInterfaceProperties(): PropertySignature[] {
    const properties: PropertySignature[] = [];

    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      properties.push(this.propertySignature());
    }

    return properties;
  }

  public interfaceDeclaration(): InterfaceDeclaration {
    const interfaceToken = this.previous();
    const name = this.parseImportOrExportName('Expected interface name');
    const typeParameters = this.parseTypeParameters();

    const parents = this.parseInterfaceExtendsClause();
    this.consume(TokenType.LEFT_BRACE, "Expected '{' after interface name");

    const properties = this.parseInterfaceProperties();
    this.consume(TokenType.RIGHT_BRACE, "Expected '}' after interface body");

    return {
      type: 'InterfaceDeclaration',
      name: {
        type: 'Identifier',
        name: name.value,
        line: name.line,
        column: name.column,
      },
      typeParameters,
      extends: parents,
      body: {
        type: 'InterfaceBody',
        properties,
        line: interfaceToken.line,
        column: interfaceToken.column,
      },
      line: interfaceToken.line,
      column: interfaceToken.column,
    } as InterfaceDeclaration;
  }

  private parseComputedPropertySignature(readonly: boolean): PropertySignature {
    this.advance(); // consume '['

    // Parse the expression inside brackets (e.g., a variable name)
    // For now, we just skip to the closing bracket since interfaces are type-only
    let bracketCount = 1;
    while (bracketCount > 0 && !this.isAtEnd()) {
      if (this.check(TokenType.LEFT_BRACKET)) {
        bracketCount++;
      } else if (this.check(TokenType.RIGHT_BRACKET)) {
        bracketCount--;
      }
      if (bracketCount > 0) {
        this.advance();
      }
    }

    this.consume(TokenType.RIGHT_BRACKET, "Expected ']' after computed property name");
    this.consume(TokenType.COLON, "Expected ':' after computed property name");
    const typeAnnotation = this.typeAnnotation();
    this.consumeMemberSeparator("Expected ';' after property type");

    // Return a property signature with a computed key marker
    // Since interfaces are compile-time only, we don't need to preserve the exact expression
    return {
      type: 'PropertySignature',
      key: {
        type: 'Identifier',
        name: '__computed__', // Placeholder for computed property
        line: this.peek().line,
        column: this.peek().column,
      },
      typeAnnotation,
      optional: false,
      readonly,
      line: this.peek().line,
      column: this.peek().column,
    };
  }

  private parseMethodSignature(keyName: Token, readonly: boolean): PropertySignature {
    this.advance(); // consume '('

    // Skip parameters for now (just consume until ')')
    let parenCount = 1;
    while (parenCount > 0 && !this.isAtEnd()) {
      if (this.check(TokenType.LEFT_PAREN)) {
        parenCount++;
      } else if (this.check(TokenType.RIGHT_PAREN)) {
        parenCount--;
      }
      this.advance();
    }

    this.consume(TokenType.COLON, "Expected ':' after method parameters");
    const typeAnnotation = this.typeAnnotation();
    this.consumeMemberSeparator("Expected ';' after method signature");

    return {
      type: 'PropertySignature',
      key: {
        type: 'Identifier',
        name: keyName.value,
        line: keyName.line,
        column: keyName.column,
      },
      typeAnnotation,
      optional: false,
      readonly,
      line: keyName.line,
      column: keyName.column,
    };
  }

  private parsePropertyKeyName(): Token {
    if (this.check(TokenType.IDENTIFIER)) {
      return this.advance();
    } else if (this.matchBuiltinIdentifier()) {
      return this.previous();
    } else if (
      this.check(TokenType.САТР) ||
      this.check(TokenType.РАҚАМ) ||
      this.check(TokenType.МАНТИҚӢ) ||
      this.check(TokenType.ХОЛӢ)
    ) {
      // Allow type keywords as property names
      return this.advance();
    } else {
      throw new Error(
        `Expected property name at line ${this.peek().line}, column ${this.peek().column}`
      );
    }
  }

  private propertySignature(): PropertySignature {
    // Parse optional readonly modifier
    const readonly = this.match(TokenType.ТАНҲОХОНӢ);

    // Handle computed property names [expression]: type;
    if (this.check(TokenType.LEFT_BRACKET)) {
      return this.parseComputedPropertySignature(readonly);
    }

    const keyName = this.parsePropertyKeyName();

    // Check if this is a method signature (has parentheses)
    if (this.check(TokenType.LEFT_PAREN)) {
      return this.parseMethodSignature(keyName, readonly);
    }

    // Regular property signature: propName: type;
    const optional = this.match(TokenType.QUESTION);
    this.consume(TokenType.COLON, "Expected ':' after property name");
    const typeAnnotation = this.typeAnnotation();
    this.consumeMemberSeparator("Expected ';' after property type");

    return {
      type: 'PropertySignature',
      key: {
        type: 'Identifier',
        name: keyName.value,
        line: keyName.line,
        column: keyName.column,
      },
      typeAnnotation,
      optional: optional || false,
      readonly,
      line: keyName.line,
      column: keyName.column,
    };
  }

  private parseClassExtendsClause(): Token | undefined {
    if (!this.match(TokenType.МЕРОС)) {
      return undefined;
    }

    const superClassToken = this.parseImportOrExportName("Expected superclass name after 'мерос'");
    this.skipGenericTypeArguments();
    return superClassToken;
  }

  private parseClassImplementsClause(): Token[] {
    if (!this.match(TokenType.ТАТБИҚ)) {
      return [];
    }

    const implementsTokens: Token[] = [];
    do {
      const interfaceToken = this.parseImportOrExportName(
        'Expected interface name in implements clause'
      );
      implementsTokens.push(interfaceToken);
      this.skipGenericTypeArguments();
    } while (this.match(TokenType.COMMA));

    return implementsTokens;
  }

  private consumeClassBody(): ClassBody {
    this.consume(TokenType.LEFT_BRACE, "Expected '{' after class declaration");
    const body = this.classBody();

    if (this.check(TokenType.RIGHT_BRACE)) {
      this.advance();
    } else {
      this.errors.push(`Expected '}' after class body at line ${this.peek().line}`);
    }

    return body;
  }

  public classDeclaration(): ClassDeclaration {
    const classToken = this.previous();
    const nameToken = this.parseImportOrExportName('Expected class name');

    this.skipGenericTypeArguments();

    const superClassToken = this.parseClassExtendsClause();
    const implementsTokens = this.parseClassImplementsClause();
    const body = this.consumeClassBody();

    return {
      type: 'ClassDeclaration',
      name: {
        type: 'Identifier',
        name: nameToken.value,
        line: nameToken.line,
        column: nameToken.column,
      },
      superClass: superClassToken
        ? {
            type: 'Identifier',
            name: superClassToken.value,
            line: superClassToken.line,
            column: superClassToken.column,
          }
        : undefined,
      implements: implementsTokens.map(impl => ({
        type: 'Identifier',
        name: impl.value,
        line: impl.line,
        column: impl.column,
      })),
      body,
      line: classToken.line,
      column: classToken.column,
    };
  }

  private classBody(): ClassBody {
    const members: (MethodDefinition | PropertyDefinition)[] = [];

    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      const memberStart = this.current;
      try {
        const member = this.classMember();
        if (member) {
          members.push(member);
        }
      } catch (error) {
        if (this.isNestingError(error)) throw error;
        this.errors.push(error instanceof Error ? error.message : String(error));
        if (this.recoverFromClassMemberError(memberStart)) {
          break;
        }
      }
    }

    return {
      type: 'ClassBody',
      body: members,
      line: this.peek().line,
      column: this.peek().column,
    };
  }

  private recoverFromClassMemberError(memberStart: number): boolean {
    // Never stop where the failed member started, or the loop would not advance
    if (this.current === memberStart && !this.isAtEnd()) {
      this.advance();
    }
    // Skip the rest of the failed member: up to its ';' or its '{ … }' body
    while (this.shouldContinueErrorRecovery()) {
      if (this.match(TokenType.LEFT_BRACE)) {
        this.skipBalancedBraces();
        break;
      }
      if (this.match(TokenType.SEMICOLON)) break;
      this.advance();
    }
    return this.isAtClassOrNamespaceKeyword();
  }

  /** Skips tokens up to and including the '}' matching an already consumed '{'. */
  private skipBalancedBraces(): void {
    let depth = 1;
    while (depth > 0 && !this.isAtEnd()) {
      if (this.check(TokenType.LEFT_BRACE)) depth++;
      else if (this.check(TokenType.RIGHT_BRACE)) depth--;
      this.advance();
    }
  }

  private shouldContinueErrorRecovery(): boolean {
    return (
      !this.check(TokenType.RIGHT_BRACE) &&
      !this.check(TokenType.ҶАМЪИЯТӢ) &&
      !this.check(TokenType.ХОСУСӢ) &&
      !this.check(TokenType.МУҲОФИЗАТШУДА) &&
      !this.check(TokenType.КОНСТРУКТОР) &&
      !this.check(TokenType.СИНФ) &&
      !this.check(TokenType.МАВҲУМ) &&
      !this.check(TokenType.НОМФАЗО) &&
      !this.isAtEnd()
    );
  }

  private isAtClassOrNamespaceKeyword(): boolean {
    return (
      this.check(TokenType.СИНФ) || this.check(TokenType.МАВҲУМ) || this.check(TokenType.НОМФАЗО)
    );
  }

  private parseAccessibility(): AccessibilityModifier {
    if (!this.match(TokenType.ҶАМЪИЯТӢ, TokenType.ХОСУСӢ, TokenType.МУҲОФИЗАТШУДА)) {
      return undefined;
    }

    const accessToken = this.previous();
    if (accessToken.type === TokenType.ҶАМЪИЯТӢ) return 'public';
    if (accessToken.type === TokenType.ХОСУСӢ) return 'private';
    return 'protected';
  }

  private parseModifiers(): { isStatic: boolean; isAbstract: boolean } {
    let isStatic = false;
    let isAbstract = false;

    if (this.match(TokenType.СТАТИКӢ)) {
      isStatic = true;
    }

    if (this.match(TokenType.МАВҲУМ)) {
      isAbstract = true;
      // Abstract members can have 'функсия' keyword
      this.match(TokenType.ФУНКСИЯ);
    }

    return { isStatic, isAbstract };
  }

  private parseMemberName(): Token {
    // Check for regular method with 'функсия' keyword
    this.match(TokenType.ФУНКСИЯ);

    if (this.check(TokenType.IDENTIFIER)) {
      return this.advance();
    }

    if (this.matchBuiltinIdentifier()) {
      return this.previous();
    }

    throw new Error(
      `Expected class member at line ${this.peek().line}, column ${this.peek().column}`
    );
  }

  private classMember(): MethodDefinition | PropertyDefinition | undefined {
    const accessibility = this.parseAccessibility();
    const { isStatic, isAbstract } = this.parseModifiers();

    // Constructor
    if (this.match(TokenType.КОНСТРУКТОР)) {
      return this.constructorMethod(accessibility, isStatic);
    }

    // `ҳамзамон ном() {…}` — unless `ҳамзамон` is itself the member name
    const isAsync =
      this.check(TokenType.ҲАМЗАМОН) &&
      this.peekNext()?.type !== TokenType.LEFT_PAREN &&
      this.peekNext()?.type !== TokenType.COLON &&
      this.peekNext()?.type !== TokenType.ASSIGN &&
      this.match(TokenType.ҲАМЗАМОН);

    const nameToken = this.parseMemberName();

    if (this.check(TokenType.LEFT_PAREN)) {
      return this.classMethod(nameToken, accessibility, isStatic, isAbstract, isAsync);
    }

    if (isAsync) {
      throw new Error(
        `Expected method after 'ҳамзамон' at line ${nameToken.line}, column ${nameToken.column}`
      );
    }
    return this.classProperty(nameToken, accessibility, isStatic);
  }

  private constructorMethod(accessibility?: string, isStatic?: boolean): MethodDefinition {
    const constructorToken = this.previous();
    const access: AccessibilityModifier =
      accessibility === 'public' || accessibility === 'private' || accessibility === 'protected'
        ? accessibility
        : undefined;

    this.consume(TokenType.LEFT_PAREN, "Expected '(' after constructor");
    const params = this.parseParameterList("Expected ')' after constructor parameters");

    this.consume(TokenType.LEFT_BRACE, "Expected '{' after constructor parameters");
    const body = this.blockStatement();

    return {
      type: 'MethodDefinition',
      key: {
        type: 'Identifier',
        name: 'constructor',
        line: constructorToken.line,
        column: constructorToken.column,
      },
      value: {
        type: 'FunctionExpression',
        params: params,
        body: body,
        line: constructorToken.line,
        column: constructorToken.column,
      },
      kind: 'constructor',
      static: isStatic || false,
      accessibility: access,
      line: constructorToken.line,
      column: constructorToken.column,
    };
  }

  private classMethod(
    nameToken: Token,
    accessibility?: string,
    isStatic?: boolean,
    isAbstract?: boolean,
    isAsync?: boolean
  ): MethodDefinition {
    const accessVar: 'public' | 'private' | 'protected' | undefined =
      accessibility === 'public' || accessibility === 'private' || accessibility === 'protected'
        ? accessibility
        : undefined;

    this.consume(TokenType.LEFT_PAREN, "Expected '(' after method name");
    const params = this.parseParameterList("Expected ')' after method parameters");

    let returnType: TypeAnnotation | undefined;
    if (this.match(TokenType.COLON)) {
      returnType = this.typeAnnotation();
    }

    let body: BlockStatement;
    if (isAbstract) {
      // Abstract methods end with semicolon, no body
      this.consumeSemicolon("Expected ';' after abstract method signature");
      // Create an empty block statement for abstract methods
      body = {
        type: 'BlockStatement',
        body: [],
        line: nameToken.line,
        column: nameToken.column,
      };
    } else {
      // Regular methods have a body
      this.consume(TokenType.LEFT_BRACE, "Expected '{' after method signature");
      body = this.blockStatement();
    }

    return {
      type: 'MethodDefinition',
      key: {
        type: 'Identifier',
        name: nameToken.value,
        line: nameToken.line,
        column: nameToken.column,
      },
      value: {
        type: 'FunctionExpression',
        params: params,
        body: body,
        returnType,
        async: isAsync || undefined,
        line: nameToken.line,
        column: nameToken.column,
      },
      kind: 'method',
      static: isStatic || false,
      abstract: isAbstract || false,
      accessibility: accessVar,
      line: nameToken.line,
      column: nameToken.column,
    };
  }

  private classProperty(
    nameToken: Token,
    accessibility?: string,
    isStatic?: boolean
  ): PropertyDefinition {
    const accessProp: 'public' | 'private' | 'protected' | undefined =
      accessibility === 'public' || accessibility === 'private' || accessibility === 'protected'
        ? accessibility
        : undefined;

    // Optional property marker (`ном?: сатр`): the property may be `беқимат`
    const optional = this.match(TokenType.QUESTION);
    // Definite assignment assertion: `ном!: сатр`
    const definite = !optional && this.checkNonNullAssertion() ? this.advance() : undefined;

    // Optional type annotation
    let typeAnnotation: TypeAnnotation | undefined;
    if (this.match(TokenType.COLON)) {
      typeAnnotation = this.typeAnnotation();
    }

    // Optional initializer
    let value = undefined;
    if (this.match(TokenType.ASSIGN)) {
      value = this.assignment();
    }

    if (definite) {
      this.checkDefiniteAssignment(
        definite,
        value !== undefined,
        typeAnnotation !== undefined,
        !isStatic
      );
    }

    // Optional semicolon after property declaration
    this.match(TokenType.SEMICOLON);

    return {
      type: 'PropertyDefinition',
      key: {
        type: 'Identifier',
        name: nameToken.value,
        line: nameToken.line,
        column: nameToken.column,
      },
      value: value,
      typeAnnotation: typeAnnotation,
      ...(optional && { optional }),
      ...(definite && { definite: true }),
      static: isStatic || false,
      accessibility: accessProp,
      line: nameToken.line,
      column: nameToken.column,
    };
  }

  public typeAlias(): TypeAlias {
    const typeToken = this.previous();

    const name = this.parseImportOrExportName('Expected type alias name');
    const typeParameters = this.parseTypeParameters();

    this.consume(TokenType.ASSIGN, "Expected '=' after type alias name");

    const typeAnnotation = this.typeAnnotation();

    this.consumeSemicolon("Expected ';' after type alias");

    return {
      type: 'TypeAlias',
      name: {
        type: 'Identifier',
        name: name.value,
        line: name.line,
        column: name.column,
      },
      typeParameters,
      typeAnnotation,
      line: typeToken.line,
      column: typeToken.column,
    };
  }

  public namespaceDeclaration(): NamespaceDeclaration {
    const namespaceToken = this.previous();
    const name = this.consume(TokenType.IDENTIFIER, 'Expected namespace name');
    this.consume(TokenType.LEFT_BRACE, "Expected '{' after namespace name");

    const statements: Statement[] = [];

    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      if (this.check(TokenType.RIGHT_BRACE)) {
        break;
      }

      const isExported = this.match(TokenType.СОДИР);
      const stmt = this.parseNamespaceMember(isExported);

      if (stmt) {
        statements.push(stmt);
      }
    }

    this.consume(TokenType.RIGHT_BRACE, "Expected '}' after namespace body");

    return {
      type: 'NamespaceDeclaration',
      name: {
        type: 'Identifier',
        name: name.value,
        line: name.line,
        column: name.column,
      },
      body: {
        type: 'NamespaceBody',
        statements,
        line: namespaceToken.line,
        column: namespaceToken.column,
      },
      line: namespaceToken.line,
      column: namespaceToken.column,
    };
  }

  private parseNamespaceMember(isExported: boolean): Statement | null {
    if (this.match(TokenType.НОМФАЗО)) {
      const nestedNamespace = this.namespaceDeclaration();
      if (isExported) {
        nestedNamespace.exported = true;
      }
      return nestedNamespace;
    }

    const declarationParsers: [TokenType | TokenType[], () => Statement | null][] = [
      [TokenType.ИНТЕРФЕЙС, () => this.interfaceDeclaration()],
      [TokenType.НАВЪ, () => this.typeAlias()],
      [TokenType.СИНФ, () => this.classDeclaration()],
      [TokenType.ФУНКСИЯ, () => this.functionDeclaration()],
      [[TokenType.ТАҒЙИРЁБАНДА, TokenType.СОБИТ], () => this.variableDeclaration()],
    ];

    for (const [tokenType, parser] of declarationParsers) {
      if (Array.isArray(tokenType) ? this.match(...tokenType) : this.match(tokenType)) {
        const stmt = parser();
        if (isExported && stmt) {
          (stmt as Statement & { exported?: boolean }).exported = true;
        }
        return stmt;
      }
    }

    if (isExported) {
      const token = this.peek();
      throw new Error(
        `Expected a declaration after 'содир' at line ${token.line}, column ${token.column}`
      );
    }
    // Any other statement runs inside the namespace's function body
    return this.statement();
  }

  private parseSwitchCaseConsequent(): Statement[] {
    const consequent: Statement[] = [];
    while (
      !this.check(TokenType.ҲОЛАТ) &&
      !this.check(TokenType.ПЕШФАРЗ) &&
      !this.check(TokenType.RIGHT_BRACE) &&
      !this.isAtEnd()
    ) {
      const stmt = this.statement();
      if (stmt) consequent.push(stmt);
    }
    return consequent;
  }

  private parseRegularCase(): SwitchCase {
    const test = this.expression();
    this.consume(TokenType.COLON, "Expected ':' after case value");
    const consequent = this.parseSwitchCaseConsequent();
    return {
      type: 'SwitchCase',
      test,
      consequent,
      line: test.line,
      column: test.column,
    };
  }

  private parseDefaultCase(): SwitchCase {
    this.consume(TokenType.COLON, "Expected ':' after default keyword");
    const startToken = this.previous();
    const consequent = this.parseSwitchCaseConsequent();
    return {
      type: 'SwitchCase',
      test: undefined,
      consequent,
      line: startToken.line,
      column: startToken.column,
    } as SwitchCase;
  }

  private parseSwitchCases(): SwitchCase[] {
    const cases: SwitchCase[] = [];
    let foundDefault = false;

    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      if (this.match(TokenType.ҲОЛАТ)) {
        cases.push(this.parseRegularCase());
        continue;
      }

      if (this.match(TokenType.ПЕШФАРЗ)) {
        if (foundDefault) {
          this.errors.push('Multiple default cases in switch');
        }
        foundDefault = true;
        cases.push(this.parseDefaultCase());
        continue;
      }

      this.errors.push(
        `Unexpected token '${this.peek().value}' in switch at line ${this.peek().line}`
      );
      this.advance();
    }

    return cases;
  }

  private switchStatement(): SwitchStatement {
    const switchToken = this.previous();
    this.consume(TokenType.LEFT_PAREN, "Expected '(' after 'интихоб'");
    const discriminant = this.expression();
    this.consume(TokenType.RIGHT_PAREN, "Expected ')' after switch expression");
    this.consume(TokenType.LEFT_BRACE, "Expected '{' after switch expression");

    const cases = this.parseSwitchCases();

    this.consume(TokenType.RIGHT_BRACE, "Expected '}' after switch cases");

    return {
      type: 'SwitchStatement',
      discriminant,
      cases,
      line: switchToken.line,
      column: switchToken.column,
    } as SwitchStatement;
  }

  private static readonly STATEMENT_KEYWORDS: ReadonlySet<TokenType> = new Set([
    TokenType.ТАҒЙИРЁБАНДА,
    TokenType.СОБИТ,
    TokenType.ФУНКСИЯ,
    TokenType.АГАР,
    TokenType.ТО, // while keyword
    TokenType.БАРОИ,
    TokenType.БОЗГАШТ,
    TokenType.СИНФ,
    TokenType.МАВҲУМ,
    TokenType.ИНТЕРФЕЙС,
    TokenType.НОМФАЗО,
    TokenType.КӮШИШ,
    TokenType.ИНТИХОБ,
    TokenType.ПАРТОФТАН,
    TokenType.ШИКАСТАН,
    TokenType.ДАВОМ,
    TokenType.ВОРИД,
    TokenType.СОДИР,
    TokenType.ҲАМЗАМОН,
  ]);

  /**
   * Error recovery: skip to the end of the failed statement so one bad token
   * yields one error. Braces opened by the statement are skipped as a unit,
   * and a '}' that closes an enclosing block is left for that block.
   */
  private synchronize(startIndex: number): void {
    let depth = this.braceDepthSince(startIndex);
    if (this.current === startIndex && !this.isAtEnd()) {
      // Guarantee progress: the statement could not even start
      if (this.check(TokenType.LEFT_BRACE)) depth++;
      this.advance();
    }

    while (!this.isAtEnd()) {
      if (depth === 0 && this.isAtStatementBoundary()) return;
      if (this.check(TokenType.LEFT_BRACE)) {
        depth++;
      } else if (this.check(TokenType.RIGHT_BRACE)) {
        depth--;
        this.advance();
        if (depth === 0) {
          // The braces may have belonged to an expression: `тағ о = { … };`
          this.match(TokenType.SEMICOLON);
          return;
        }
        continue;
      }
      this.advance();
    }
  }

  /** Number of braces opened (and not yet closed) since `startIndex`. */
  private braceDepthSince(startIndex: number): number {
    let depth = 0;
    for (let i = startIndex; i < this.current; i++) {
      if (this.tokens[i].type === TokenType.LEFT_BRACE) depth++;
      else if (this.tokens[i].type === TokenType.RIGHT_BRACE && depth > 0) depth--;
    }
    return depth;
  }

  private isAtStatementBoundary(): boolean {
    return (
      this.previous().type === TokenType.SEMICOLON ||
      this.check(TokenType.RIGHT_BRACE) ||
      Parser.STATEMENT_KEYWORDS.has(this.peek().type)
    );
  }

  private parsePattern(): Identifier | ArrayPattern | ObjectPattern {
    if (this.match(TokenType.LEFT_BRACKET)) {
      return this.parseArrayPattern();
    }
    if (this.match(TokenType.LEFT_BRACE)) {
      return this.parseObjectPattern();
    }
    return this.parseIdentifierPattern();
  }

  private parseArrayPattern(): ArrayPattern {
    const leftBracket = this.previous();
    const elements: ArrayPattern['elements'] = [];
    while (!this.check(TokenType.RIGHT_BRACKET) && !this.isAtEnd()) {
      if (this.match(TokenType.COMMA)) {
        elements.push(null);
        continue;
      }
      if (this.match(TokenType.SPREAD)) {
        const spreadElem = this.parseSpreadElement();
        elements.push(spreadElem);
      } else {
        elements.push(this.parsePatternWithDefault());
      }
      if (!this.match(TokenType.COMMA)) break;
    }
    this.consume(TokenType.RIGHT_BRACKET, "Expected ']' in array pattern");
    return {
      type: 'ArrayPattern',
      elements,
      line: leftBracket.line,
      column: leftBracket.column,
    } as ArrayPattern;
  }

  private parseObjectPattern(): ObjectPattern {
    const leftBrace = this.previous();
    const properties: (PropertyPattern | SpreadElement)[] = [];
    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      if (this.match(TokenType.SPREAD)) {
        properties.push(this.parseSpreadElement());
      } else {
        properties.push(this.parsePropertyPattern());
      }
      if (!this.match(TokenType.COMMA)) break;
    }
    this.consume(TokenType.RIGHT_BRACE, "Expected '}' in object pattern");
    return {
      type: 'ObjectPattern',
      properties,
      line: leftBrace.line,
      column: leftBrace.column,
    } as ObjectPattern;
  }

  /** `ном`, `ном = 1`, `калид: ном`, `калид: { … } = {}` */
  private parsePropertyPattern(): PropertyPattern {
    const keyToken = this.peek();
    let key: Identifier | Literal;
    if (this.match(TokenType.STRING)) {
      key = this.createLiteral(keyToken.value, keyToken);
    } else if (this.isIdentifierNameToken(keyToken)) {
      key = this.createIdentifier(this.advance());
    } else {
      throw new Error(this.unexpectedTokenMessage('Expected identifier in object pattern'));
    }

    let value: PropertyPattern['value'];
    if (this.match(TokenType.COLON)) {
      value = this.parsePatternWithDefault();
    } else {
      // Shorthand `{ ном }` binds a variable named like the key
      if (key.type !== 'Identifier' || !this.isPlainIdentifierToken(keyToken)) {
        throw new Error(this.unexpectedTokenMessage("Expected ':' after property key in pattern"));
      }
      value = this.withDefault(this.createIdentifier(keyToken));
    }

    return {
      type: 'PropertyPattern',
      key,
      value,
      computed: false,
      line: keyToken.line,
      column: keyToken.column,
    };
  }

  private parsePatternWithDefault(): Identifier | ArrayPattern | ObjectPattern | AssignmentPattern {
    return this.withDefault(this.parsePattern());
  }

  /** Wraps `target` in an AssignmentPattern when a `= default` follows. */
  private withDefault(
    target: Identifier | ArrayPattern | ObjectPattern
  ): Identifier | ArrayPattern | ObjectPattern | AssignmentPattern {
    if (!this.match(TokenType.ASSIGN)) {
      return target;
    }
    return {
      type: 'AssignmentPattern',
      left: target,
      right: this.assignment(),
      line: target.line,
      column: target.column,
    };
  }

  private parseIdentifierPattern(): Identifier {
    // Allow certain keyword tokens to be treated as identifiers in binding patterns
    if (this.check(TokenType.IDENTIFIER)) {
      const identTok = this.advance();
      return {
        type: 'Identifier',
        name: identTok.value,
        line: identTok.line,
        column: identTok.column,
      } as Identifier;
    }
    if (this.matchBuiltinIdentifier()) {
      const token = this.previous();
      return {
        type: 'Identifier',
        name: token.value,
        line: token.line,
        column: token.column,
      } as Identifier;
    }
    const ident = this.consume(TokenType.IDENTIFIER, 'Expected identifier');
    return {
      type: 'Identifier',
      name: ident.value,
      line: ident.line,
      column: ident.column,
    } as Identifier;
  }

  private parseSpreadElement(): SpreadElement {
    const spreadToken = this.previous(); // SPREAD token consumed by caller
    const argument = this.parsePattern();
    return {
      type: 'SpreadElement',
      argument,
      line: spreadToken.line,
      column: spreadToken.column,
    } as SpreadElement;
  }

  private breakStatement(): BreakStatement {
    const token = this.previous();
    this.consumeSemicolon("Expected ';' after 'шикастан'");
    return { type: 'BreakStatement', line: token.line, column: token.column };
  }

  private continueStatement(): ContinueStatement {
    const token = this.previous();
    this.consumeSemicolon("Expected ';' after 'давом'");
    return { type: 'ContinueStatement', line: token.line, column: token.column };
  }
}

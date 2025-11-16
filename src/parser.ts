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
  InterfaceDeclaration,
  PropertySignature,
  TypeParameter,
  TypeAlias,
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
} from './types';
import { Lexer } from './lexer';
import { ImportHandler } from './handlers/import-handler';
import { DeclarationHandler } from './handlers/declaration-handler';
import { LoopHandler } from './handlers/loop-handler';

type AccessibilityModifier = 'public' | 'private' | 'protected' | undefined;

export class Parser {
  private tokens: Token[];
  private current: number = 0;
  private errors: string[] = [];
  private importHandler: ImportHandler;
  private declarationHandler: DeclarationHandler;
  private loopHandler: LoopHandler;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
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

    while (!this.isAtEnd()) {
      const stmt = this.statement();
      if (stmt) {
        body.push(stmt);
      }
      // Don't advance here - statement() handles its own token consumption
    }

    return {
      type: 'Program',
      body,
      line: 1,
      column: 1,
    };
  }

  private statement(): Statement | null {
    try {
      if (this.match(TokenType.NEWLINE)) {
        return null;
      }

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
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.errors.push(errorMessage);
      this.synchronize();
      return null;
    }
  }

  public variableDeclaration(): VariableDeclaration {
    const kindToken = this.previous();
    const kind = kindToken.type === TokenType.ТАҒЙИРЁБАНДА ? 'ТАҒЙИРЁБАНДА' : 'СОБИТ';

    // Parse pattern (identifier, array destructuring, or object destructuring)
    const identifier = this.parsePattern();

    // Parse optional type annotation
    let typeAnnotation: TypeAnnotation | undefined;
    if (this.match(TokenType.COLON)) {
      typeAnnotation = this.typeAnnotation();
    }

    let init: Expression | undefined;
    if (this.match(TokenType.ASSIGN)) {
      init = this.expression();
    }

    this.consume(TokenType.SEMICOLON, "Expected ';' after variable declaration");

    return {
      type: 'VariableDeclaration',
      kind,
      identifier,
      typeAnnotation,
      init,
      line: kindToken.line,
      column: kindToken.column,
    };
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

    // Skip any newlines after opening parenthesis
    while (this.match(TokenType.NEWLINE)) {
      // Skip newlines
    }

    const params: Parameter[] = [];
    if (!this.check(TokenType.RIGHT_PAREN)) {
      do {
        const param = this.parseParameter();
        params.push(param);

        // Skip any newlines after parameter before checking for comma
        while (this.match(TokenType.NEWLINE)) {
          // Skip newlines
        }
      } while (
        this.match(TokenType.COMMA) &&
        (() => {
          // Skip any newlines after comma
          while (this.match(TokenType.NEWLINE)) {
            // Skip newlines
          }
          return true;
        })()
      );
    }

    // Skip any newlines before closing parenthesis
    while (this.match(TokenType.NEWLINE)) {
      // Skip newlines
    }

    this.consume(TokenType.RIGHT_PAREN, "Expected ')' after parameters");

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

    // Skip any newlines after opening brace
    while (this.match(TokenType.NEWLINE)) {
      // Skip newlines
    }

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
      if (this.isTypeKeywordOrIdentifier(nextToken?.type)) {
        lookaheadIndex++;
        if (this.tokens[lookaheadIndex]?.type === TokenType.АЗ) {
          isForOf = true;
        } else if (this.tokens[lookaheadIndex]?.type === TokenType.ДАР) {
          isForIn = true;
        }
      }
    }
    return { isForOf, isForIn };
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

    const nameToken = this.isTypeKeywordOrIdentifier(this.peek().type)
      ? this.advance()
      : this.consume(TokenType.IDENTIFIER, 'Expected variable name');

    const id: Identifier = {
      type: 'Identifier',
      name: nameToken.value,
      line: nameToken.line,
      column: nameToken.column,
    };

    if (isForOf) {
      this.consume(TokenType.АЗ, "Expected 'аз' in for-of loop");
    } else {
      this.consume(TokenType.ДАР, "Expected 'дар' in for-in loop");
    }

    const right = this.expression();
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
      init = this.variableDeclaration();
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

    let argument: Expression | undefined;
    if (!this.check(TokenType.SEMICOLON) && !this.check(TokenType.NEWLINE)) {
      argument = this.expression();
    }

    this.consume(TokenType.SEMICOLON, "Expected ';' after return value");

    return {
      type: 'ReturnStatement',
      argument,
      line: returnToken.line,
      column: returnToken.column,
    };
  }

  private expressionStatement(): ExpressionStatement {
    const expr = this.expression();
    this.consume(TokenType.SEMICOLON, "Expected ';' after expression");

    return {
      type: 'ExpressionStatement',
      expression: expr,
      line: expr.line,
      column: expr.column,
    };
  }

  private expression(): Expression {
    return this.assignment();
  }

  private assignment(): Expression {
    // Try to parse arrow function first
    const arrowFunc = this.tryParseArrowFunction();
    if (arrowFunc) {
      return arrowFunc;
    }

    const expr = this.or();

    if (
      this.match(
        TokenType.ASSIGN,
        TokenType.PLUS_ASSIGN,
        TokenType.MINUS_ASSIGN,
        TokenType.MULTIPLY_ASSIGN,
        TokenType.DIVIDE_ASSIGN,
        TokenType.MODULO_ASSIGN,
        TokenType.BITWISE_AND_ASSIGN,
        TokenType.BITWISE_OR_ASSIGN,
        TokenType.BITWISE_XOR_ASSIGN,
        TokenType.LEFT_SHIFT_ASSIGN,
        TokenType.RIGHT_SHIFT_ASSIGN,
        TokenType.UNSIGNED_RIGHT_SHIFT_ASSIGN
      )
    ) {
      const operator = this.previous();
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

    // Check for arrow function with single parameter (no parentheses)
    if (this.match(TokenType.ARROW)) {
      if (expr.type === 'Identifier') {
        const param: Parameter = {
          type: 'Parameter',
          name: expr as Identifier,
          line: expr.line,
          column: expr.column,
        };

        const body = this.parseArrowFunctionBody();

        return {
          type: 'ArrowFunctionExpression',
          params: [param],
          body,
          line: expr.line,
          column: expr.column,
        } as ArrowFunctionExpression;
      }
    }

    return expr;
  }

  private tryParseArrowFunction(): ArrowFunctionExpression | null {
    // Check if this looks like arrow function parameters
    if (!this.check(TokenType.LEFT_PAREN)) {
      return null;
    }

    // Save position to backtrack if not arrow function
    const savedIndex = this.current;

    // Try to parse as arrow function
    this.advance(); // consume '('

    // Parse parameters
    const params: Parameter[] = [];
    if (!this.check(TokenType.RIGHT_PAREN)) {
      do {
        if (this.check(TokenType.IDENTIFIER)) {
          const token = this.advance();
          const identifier: Identifier = {
            type: 'Identifier',
            name: token.value,
            line: token.line,
            column: token.column,
          };
          params.push({
            type: 'Parameter',
            name: identifier,
            line: token.line,
            column: token.column,
          });
        } else {
          // Not arrow function parameters
          this.current = savedIndex;
          return null;
        }
      } while (this.match(TokenType.COMMA));
    }

    if (!this.match(TokenType.RIGHT_PAREN)) {
      // Not arrow function
      this.current = savedIndex;
      return null;
    }

    // Check for arrow
    if (!this.match(TokenType.ARROW)) {
      // Not arrow function
      this.current = savedIndex;
      return null;
    }

    // Parse body
    const body = this.parseArrowFunctionBody();

    return {
      type: 'ArrowFunctionExpression',
      params,
      body,
      line: this.tokens[savedIndex].line,
      column: this.tokens[savedIndex].column,
    } as ArrowFunctionExpression;
  }

  private parseArrowFunctionBody(): BlockStatement | Expression {
    if (this.match(TokenType.LEFT_BRACE)) {
      // Block body
      const statements: Statement[] = [];

      while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
        const stmt = this.statement();
        if (stmt) {
          statements.push(stmt);
        }
      }

      const braceToken = this.consume(
        TokenType.RIGHT_BRACE,
        "Expected '}' after arrow function body"
      );

      return {
        type: 'BlockStatement',
        body: statements,
        line: braceToken.line,
        column: braceToken.column,
      } as BlockStatement;
    } else {
      // Expression body
      return this.assignment();
    }
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

    while (
      this.match(
        TokenType.GREATER_THAN,
        TokenType.GREATER_EQUAL,
        TokenType.LESS_THAN,
        TokenType.LESS_EQUAL
      )
    ) {
      const operator = this.previous();
      const right = this.shift();
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
    let expr = this.unary();

    while (this.match(TokenType.DIVIDE, TokenType.MULTIPLY, TokenType.MODULO)) {
      const operator = this.previous();
      const right = this.unary();
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

  private unary(): Expression {
    if (this.match(TokenType.NOT, TokenType.MINUS, TokenType.BITWISE_NOT)) {
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

    if (this.match(TokenType.НАВ)) {
      const newToken = this.previous();
      const callee = this.primary();

      // Skip generic type parameters if present (e.g., new Class<T>(args))
      this.skipGenericTypeArguments();

      // Check if there are arguments
      const args: Expression[] = [];
      if (this.match(TokenType.LEFT_PAREN)) {
        if (!this.check(TokenType.RIGHT_PAREN)) {
          do {
            args.push(this.expression());
          } while (this.match(TokenType.COMMA));
        }
        this.consume(TokenType.RIGHT_PAREN, "Expected ')' after arguments");
      }

      const newExpr = {
        type: 'NewExpression',
        callee,
        arguments: args,
        line: newToken.line,
        column: newToken.column,
      } as NewExpression;

      // Apply call chaining to support expressions like: new Date().toISOString()
      return this.applyCallChaining(newExpr);
    }

    return this.call();
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
        let name: Token;
        if (this.check(TokenType.IDENTIFIER)) {
          name = this.advance();
        } else if (this.matchBuiltinIdentifier()) {
          name = this.previous();
        } else {
          throw new Error(
            `Expected property name after '.' at line ${this.peek().line}, column ${this.peek().column}`
          );
        }

        expr = {
          type: 'MemberExpression',
          object: expr,
          property: {
            type: 'Identifier',
            name: name.value,
            line: name.line,
            column: name.column,
          } as Identifier,
          computed: false,
          line: expr.line,
          column: expr.column,
        } as MemberExpression;
      } else if (this.match(TokenType.LEFT_BRACKET)) {
        // Computed member expression: obj[expr]
        const property = this.expression();
        this.consume(TokenType.RIGHT_BRACKET, "Expected ']' after computed property");

        expr = {
          type: 'MemberExpression',
          object: expr,
          property: property,
          computed: true,
          line: expr.line,
          column: expr.column,
        } as MemberExpression;
      } else if (this.match(TokenType.INCREMENT, TokenType.DECREMENT)) {
        // Postfix increment/decrement
        const operator = this.previous();
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
      } else if (currentToken.type === TokenType.GREATER_THAN) {
        depth--;
        if (depth === 0) {
          this.advance(); // Consume the closing >
          break;
        }
      }

      this.advance();
      tokenCount++;
    }

    // If we hit the token limit, something went wrong
    if (tokenCount >= maxTokens) {
      console.error(`Warning: Hit token limit while skipping generics at token ${this.current}`);
    }
  }

  private finishCall(callee: Expression): CallExpression {
    const args: Expression[] = [];

    // Skip any leading newlines after opening paren
    while (this.match(TokenType.NEWLINE)) {
      // consume newlines
    }

    if (!this.check(TokenType.RIGHT_PAREN)) {
      do {
        // Skip newlines before each argument
        while (this.match(TokenType.NEWLINE)) {
          // consume newlines
        }

        args.push(this.expression());

        // Skip newlines after each argument
        while (this.match(TokenType.NEWLINE)) {
          // consume newlines
        }
      } while (this.match(TokenType.COMMA));
    }

    // Skip any trailing newlines before closing paren
    while (this.match(TokenType.NEWLINE)) {
      // consume newlines
    }

    this.consume(TokenType.RIGHT_PAREN, "Expected ')' after arguments");

    return {
      type: 'CallExpression',
      callee,
      arguments: args,
      line: callee.line,
      column: callee.column,
    } as CallExpression;
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

  private parseNewExpression(token: Token): NewExpression {
    const callee = this.primary();
    this.skipGenericTypeArguments();
    this.consume(TokenType.LEFT_PAREN, "Expected '(' after 'нав'");
    const args: Expression[] = [];

    if (!this.check(TokenType.RIGHT_PAREN)) {
      do {
        args.push(this.expression());
      } while (this.match(TokenType.COMMA));
    }

    this.consume(TokenType.RIGHT_PAREN, "Expected ')' after arguments");
    return {
      type: 'NewExpression',
      callee,
      arguments: args,
      line: token.line,
      column: token.column,
    } as NewExpression;
  }

  private parseDynamicImport(importToken: Token): ImportExpression {
    this.consume(TokenType.LEFT_PAREN, "Expected '(' after 'ворид'");
    const source = this.expression();
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
    const params: Parameter[] = [];

    if (!this.check(TokenType.RIGHT_PAREN)) {
      do {
        params.push(this.parseParameter());
      } while (this.match(TokenType.COMMA));
    }

    this.consume(TokenType.RIGHT_PAREN, "Expected ')' after parameters");
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
      const token = this.previous();
      return this.createLiteral(Number.parseFloat(token.value), token);
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
      const expr = this.expression();
      this.consume(TokenType.RIGHT_PAREN, "Expected ')' after expression");
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
    const templateValue = token.value;

    // Parse the template literal content
    const quasis: TemplateElement[] = [];
    const expressions: Expression[] = [];

    // For now, we'll implement a simple version that handles basic interpolation
    // This can be enhanced later for more complex cases
    const parts = this.parseTemplateString(templateValue);

    // Process parts and separate text from expressions
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];

      if (part.type === 'text') {
        quasis.push({
          type: 'TemplateElement',
          value: {
            raw: part.value,
            cooked: part.value,
          },
          tail: false, // Will be updated later
          line: token.line,
          column: token.column,
        });
      } else if (part.type === 'expression') {
        // Parse the expression inside ${}
        const trimmedValue = part.value.trim();

        // Handle empty expressions by using undefined
        if (!trimmedValue) {
          expressions.push({
            type: 'Identifier',
            name: 'undefined',
            line: token.line,
            column: token.column,
          } as Identifier);
        } else {
          const exprParser = new Parser([]);
          const exprTokens = this.tokenizeExpression(part.value);
          exprParser.tokens = exprTokens;
          exprParser.current = 0;

          try {
            const expr = exprParser.expression();
            expressions.push(expr);
          } catch (error) {
            // If parsing fails, treat as identifier
            expressions.push({
              type: 'Identifier',
              name: part.value.trim(),
              line: token.line,
              column: token.column,
            } as Identifier);
          }
        }
      }
    }

    // Ensure we have the right number of quasis (should be expressions.length + 1)
    if (quasis.length === expressions.length) {
      quasis.push({
        type: 'TemplateElement',
        value: {
          raw: '',
          cooked: '',
        },
        tail: true,
        line: token.line,
        column: token.column,
      });
    }

    // Mark the last quasi as tail
    if (quasis.length > 0) {
      quasis[quasis.length - 1].tail = true;
    }

    return {
      type: 'TemplateLiteral',
      quasis,
      expressions,
      line: token.line,
      column: token.column,
    };
  }

  private extractExpression(
    template: string,
    startIndex: number
  ): { expr: string; newIndex: number } {
    let i = startIndex;
    let braceCount = 1;
    let expr = '';

    while (i < template.length && braceCount > 0) {
      if (template[i] === '{') {
        braceCount++;
      } else if (template[i] === '}') {
        braceCount--;
      }

      if (braceCount > 0) {
        expr += template[i];
      }
      i++;
    }

    return { expr, newIndex: i };
  }

  private addTextPart(
    parts: Array<{ type: 'text' | 'expression'; value: string }>,
    current: string
  ): void {
    if (current || parts.length === 0) {
      parts.push({ type: 'text', value: current });
    }
  }

  private parseTemplateString(
    template: string
  ): Array<{ type: 'text' | 'expression'; value: string }> {
    const parts: Array<{ type: 'text' | 'expression'; value: string }> = [];
    let current = '';
    let i = 0;

    while (i < template.length) {
      const isInterpolation = template[i] === '$' && template[i + 1] === '{';

      if (isInterpolation) {
        this.addTextPart(parts, current);
        current = '';

        i += 2; // Skip ${
        const { expr, newIndex } = this.extractExpression(template, i);
        i = newIndex;

        parts.push({ type: 'expression', value: expr });
      } else {
        current += template[i];
        i++;
      }
    }

    this.addTextPart(parts, current);
    return parts;
  }

  private tokenizeExpression(expr: string): Token[] {
    const trimmed = expr.trim();

    if (!trimmed) {
      return [
        {
          type: TokenType.EOF,
          value: '',
          line: 1,
          column: 1,
        },
      ];
    }

    // Use the main lexer to properly tokenize the interpolation content
    // This ensures all language features (keywords, built-ins, etc.) work properly
    const lexer = new Lexer(trimmed);
    return lexer.tokenize();
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

    const token = this.peek();
    const errorMsg = `${message}. Got '${token.value}' at line ${token.line}, column ${token.column}`;
    this.errors.push(errorMsg);

    // Try to recover by returning a dummy token
    return {
      type: type,
      value: '',
      line: token.line,
      column: token.column,
    };
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
    this.consume(TokenType.SEMICOLON, "Expected ';' after import");

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

  private skipNewlines(): void {
    while (this.match(TokenType.NEWLINE)) {
      // consume newlines
    }
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
    this.skipNewlines();

    if (this.check(TokenType.RIGHT_BRACE)) {
      return;
    }

    do {
      this.skipNewlines();
      const imported = this.parseImportOrExportName('Expected import name');
      let local = imported;

      if (this.match(TokenType.ЧУН)) {
        local = this.parseImportOrExportName("Expected local name after 'чун'");
      }

      specifiers.push(this.createImportSpecifier(imported, local));
      this.skipNewlines();
    } while (this.match(TokenType.COMMA));

    this.skipNewlines();
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

      this.consume(TokenType.SEMICOLON, "Expected ';' after export statement");

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

      this.consume(TokenType.SEMICOLON, "Expected ';' after export statement");

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

  private matchBuiltinIdentifier(): boolean {
    const builtinTypes = [
      TokenType.ЧОП,
      TokenType.САБТ,
      TokenType.ХАТО,
      TokenType.ОГОҲӢ,
      TokenType.МАЪЛУМОТ,
      TokenType.РӮЙХАТ,
      TokenType.ИЛОВА,
      TokenType.БАРОВАРДАН,
      TokenType.ДАРОЗӢ,
      TokenType.ХАРИТА,
      TokenType.ФИЛТР,
      TokenType.КОФТАН,
      TokenType.ГИРИФТАН, // Allow 'гирифтан' as identifier (common method name)
      TokenType.САТР_МЕТОДҲО,
      TokenType.ДАРОЗИИ_САТР,
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
    ];

    for (const type of builtinTypes) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private arrayExpression(): ArrayExpression {
    const leftBracket = this.previous();
    const elements: Expression[] = [];

    // Skip any leading newlines
    while (this.match(TokenType.NEWLINE)) {
      // consume newlines
    }

    if (!this.check(TokenType.RIGHT_BRACKET)) {
      do {
        // Skip newlines before each element
        while (this.match(TokenType.NEWLINE)) {
          // consume newlines
        }

        if (this.check(TokenType.SPREAD)) {
          elements.push(this.parseSpreadElement());
        } else {
          elements.push(this.expression());
        }

        // Skip newlines after each element
        while (this.match(TokenType.NEWLINE)) {
          // consume newlines
        }
      } while (this.match(TokenType.COMMA));
    }

    // Skip any trailing newlines
    while (this.match(TokenType.NEWLINE)) {
      // consume newlines
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
    const properties: Property[] = [];

    // Skip any newlines after opening brace
    while (this.match(TokenType.NEWLINE)) {
      // Skip newlines
    }

    if (!this.check(TokenType.RIGHT_BRACE)) {
      do {
        // Skip any newlines before property
        while (this.match(TokenType.NEWLINE)) {
          // Skip newlines
        }

        if (this.check(TokenType.RIGHT_BRACE)) {
          break; // End of object
        }

        const property = this.parseProperty();
        properties.push(property);

        // Skip any newlines after property
        while (this.match(TokenType.NEWLINE)) {
          // Skip newlines
        }
      } while (this.match(TokenType.COMMA));
    }

    // Skip any newlines before closing brace
    while (this.match(TokenType.NEWLINE)) {
      // Skip newlines
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
    let key: Identifier | Literal;
    let computed = false;

    if (this.check(TokenType.LEFT_BRACKET)) {
      // Computed property
      this.advance(); // consume '['
      key = this.expression() as Literal;
      this.consume(TokenType.RIGHT_BRACKET, "Expected ']'");
      computed = true;
    } else {
      // Regular property - can be identifier, contextual keyword, or any keyword
      // In JavaScript/SomonScript, keywords can be used as property names
      let keyToken: Token;
      if (this.check(TokenType.IDENTIFIER)) {
        keyToken = this.advance();
      } else if (this.matchBuiltinIdentifier()) {
        keyToken = this.previous();
      } else if (this.check(TokenType.STRING)) {
        keyToken = this.advance();
      } else {
        // Allow any keyword as a property name
        keyToken = this.advance();
      }

      key = {
        type: 'Identifier',
        name: keyToken.value,
        line: keyToken.line,
        column: keyToken.column,
      };
    }

    this.consume(TokenType.COLON, "Expected ':' after property key");
    const value = this.expression();

    return {
      type: 'Property',
      key,
      value,
      computed,
      shorthand: false,
      line: key.line,
      column: key.column,
    };
  }

  private tryStatement(): TryStatement {
    const tryToken = this.previous();

    // Consume the opening brace for try block
    this.consume(TokenType.LEFT_BRACE, "Expected '{' after 'кӯшиш'");
    const block = this.blockStatement();

    let handler: CatchClause | undefined = undefined;
    if (this.match(TokenType.ГИРИФТАН)) {
      this.consume(TokenType.LEFT_PAREN, "Expected '(' after 'гирифтан'");
      let param: Identifier | undefined = undefined;
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
    this.consume(TokenType.SEMICOLON, "Expected ';' after throw statement");

    return {
      type: 'ThrowStatement',
      argument,
      line: throwToken.line,
      column: throwToken.column,
    };
  }

  private parseParameter(): Parameter {
    let paramName: Token;
    if (this.check(TokenType.IDENTIFIER)) {
      paramName = this.advance();
    } else if (this.matchBuiltinIdentifier()) {
      paramName = this.previous();
    } else if (
      this.match(TokenType.НАВЪ, TokenType.МАЪЛУМОТ, TokenType.РӮЙХАТ, TokenType.БЕҚИМАТ)
    ) {
      // Allow common Tajik words as parameter names
      paramName = this.previous();
    } else {
      throw new Error(
        `Expected parameter name at line ${this.peek().line}, column ${this.peek().column}`
      );
    }

    // Parse optional indicator
    let optional = false;
    if (this.match(TokenType.QUESTION)) {
      optional = true;
    }

    // Parse optional type annotation
    let typeAnnotation: TypeAnnotation | undefined;
    if (this.match(TokenType.COLON)) {
      typeAnnotation = this.typeAnnotation();
    }

    return {
      type: 'Parameter',
      name: {
        type: 'Identifier',
        name: paramName.value,
        line: paramName.line,
        column: paramName.column,
      },
      typeAnnotation,
      optional,
      line: paramName.line,
      column: paramName.column,
    };
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
    return (
      this.parseParenthesizedOrArrayType() ??
      this.parseUniqueType() ??
      this.parseLiteralType() ??
      this.parsePrimitiveType() ??
      this.parseGenericOrIdentifierType() ??
      this.parseTupleType() ??
      this.parseObjectType() ??
      this.errorExpectedType()
    );
  }

  private parseParenthesizedOrArrayType(): TypeNode | undefined {
    if (!this.match(TokenType.LEFT_PAREN)) return undefined;
    const type = this.unionType();
    this.consume(TokenType.RIGHT_PAREN, "Expected ')' after type");
    if (!this.match(TokenType.LEFT_BRACKET)) return type;
    this.consume(TokenType.RIGHT_BRACKET, "Expected ']' after '['");
    return {
      type: 'ArrayType',
      elementType: type,
      line: type.line,
      column: type.column,
    } as ArrayType;
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
    if (!this.match(TokenType.LEFT_BRACKET)) return uniqueType;
    this.consume(TokenType.RIGHT_BRACKET, "Expected ']' after '['");
    return {
      type: 'ArrayType',
      elementType: uniqueType,
      line: uniqueType.line,
      column: uniqueType.column,
    } as ArrayType;
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
        value: Number.parseFloat(token.value),
        line: token.line,
        column: token.column,
      } as LiteralType;
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
    if (!this.match(TokenType.LEFT_BRACKET)) return primitiveType;
    this.consume(TokenType.RIGHT_BRACKET, "Expected ']' after '['");
    return {
      type: 'ArrayType',
      elementType: primitiveType,
      line: primitiveType.line,
      column: primitiveType.column,
    } as ArrayType;
  }

  private parseGenericOrIdentifierType(): TypeNode | undefined {
    // Allow certain keywords to be used as type names
    if (
      !this.check(TokenType.IDENTIFIER) &&
      !this.matchBuiltinIdentifier() &&
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
      this.consume(TokenType.GREATER_THAN, "Expected '>' after type parameters");
    }
    const genericType: GenericType = {
      type: 'GenericType',
      name,
      typeParameters,
      line: name.line,
      column: name.column,
    };
    if (!this.match(TokenType.LEFT_BRACKET)) return genericType;
    this.consume(TokenType.RIGHT_BRACKET, "Expected ']' after '['");
    return {
      type: 'ArrayType',
      elementType: genericType,
      line: genericType.line,
      column: genericType.column,
    } as ArrayType;
  }

  private parseTupleType(): TypeNode | undefined {
    if (!this.match(TokenType.LEFT_BRACKET)) return undefined;
    const types: TypeNode[] = [];
    if (!this.check(TokenType.RIGHT_BRACKET)) {
      do {
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
    if (!this.match(TokenType.LEFT_BRACKET)) return tupleType;
    this.consume(TokenType.RIGHT_BRACKET, "Expected ']' after '['");
    return {
      type: 'ArrayType',
      elementType: tupleType,
      line: tupleType.line,
      column: tupleType.column,
    } as ArrayType;
  }

  private parseObjectType(): TypeNode | undefined {
    if (!this.match(TokenType.LEFT_BRACE)) return undefined;
    const leftBrace = this.previous();
    const properties: PropertySignature[] = [];

    // Skip any newlines after opening brace
    while (this.match(TokenType.NEWLINE)) {
      // Skip newlines
    }

    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      // Skip any newlines before property
      while (this.match(TokenType.NEWLINE)) {
        // Skip newlines
      }

      if (this.check(TokenType.RIGHT_BRACE)) {
        break; // End of object
      }

      const property = this.propertySignature();
      properties.push(property);

      // Skip any newlines after property
      while (this.match(TokenType.NEWLINE)) {
        // Skip newlines
      }
    }

    // Skip any newlines before closing brace
    while (this.match(TokenType.NEWLINE)) {
      // Skip newlines
    }

    this.consume(TokenType.RIGHT_BRACE, "Expected '}' after object type properties");

    const objectType = {
      type: 'ObjectType',
      properties,
      line: leftBrace.line,
      column: leftBrace.column,
    };

    // Check for array suffix
    if (!this.match(TokenType.LEFT_BRACKET)) return objectType;
    this.consume(TokenType.RIGHT_BRACKET, "Expected ']' after '['");
    return {
      type: 'ArrayType',
      elementType: objectType,
      line: objectType.line,
      column: objectType.column,
    } as ArrayType;
  }

  private errorExpectedType(): never {
    throw new Error(`Expected type at line ${this.peek().line}, column ${this.peek().column}`);
  }

  private parseTypeParameters(): TypeParameter[] | undefined {
    if (!this.match(TokenType.LESS_THAN)) {
      return undefined;
    }

    const typeParameters: TypeParameter[] = [];
    do {
      const paramName = this.consume(TokenType.IDENTIFIER, 'Expected type parameter name');
      typeParameters.push({
        type: 'TypeParameter',
        name: {
          type: 'Identifier',
          name: paramName.value,
          line: paramName.line,
          column: paramName.column,
        },
        line: paramName.line,
        column: paramName.column,
      });
    } while (this.match(TokenType.COMMA));

    this.consume(TokenType.GREATER_THAN, "Expected '>' after type parameters");
    return typeParameters;
  }

  private parseInterfaceExtendsClause(): void {
    if (!this.match(TokenType.МЕРОС)) {
      return;
    }

    if (this.check(TokenType.IDENTIFIER)) {
      this.advance();
    } else if (!this.matchBuiltinIdentifier()) {
      throw new Error(
        `Expected interface name after 'мерос' at line ${this.peek().line}, column ${this.peek().column}`
      );
    }
  }

  private parseInterfaceProperties(): PropertySignature[] {
    const properties: PropertySignature[] = [];

    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      if (this.match(TokenType.NEWLINE)) {
        continue;
      }

      properties.push(this.propertySignature());

      while (this.check(TokenType.NEWLINE)) {
        this.advance();
      }
    }

    return properties;
  }

  public interfaceDeclaration(): InterfaceDeclaration {
    const interfaceToken = this.previous();
    const name = this.parseImportOrExportName('Expected interface name');
    const typeParameters = this.parseTypeParameters();

    this.parseInterfaceExtendsClause();
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
    this.consume(TokenType.SEMICOLON, "Expected ';' after property type");

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
    this.consume(TokenType.SEMICOLON, "Expected ';' after method signature");

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
    this.consume(TokenType.SEMICOLON, "Expected ';' after property type");

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
      if (this.match(TokenType.NEWLINE)) {
        continue;
      }

      try {
        const member = this.classMember();
        if (member) {
          members.push(member);
        }
        this.skipNewlines();
      } catch (error) {
        console.error(`Error parsing class member: ${error}`);
        if (this.recoverFromClassMemberError()) {
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

  private recoverFromClassMemberError(): boolean {
    while (this.shouldContinueErrorRecovery()) {
      this.advance();
    }
    return this.isAtClassOrNamespaceKeyword();
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
      !this.check(TokenType.IDENTIFIER) &&
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

    const nameToken = this.parseMemberName();

    if (this.check(TokenType.LEFT_PAREN)) {
      return this.classMethod(nameToken, accessibility, isStatic, isAbstract);
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

    const params: Parameter[] = [];
    if (!this.check(TokenType.RIGHT_PAREN)) {
      do {
        const param = this.parseParameter();
        params.push(param);
      } while (this.match(TokenType.COMMA));
    }

    this.consume(TokenType.RIGHT_PAREN, "Expected ')' after constructor parameters");

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
    isAbstract?: boolean
  ): MethodDefinition {
    const accessVar: 'public' | 'private' | 'protected' | undefined =
      accessibility === 'public' || accessibility === 'private' || accessibility === 'protected'
        ? accessibility
        : undefined;

    this.consume(TokenType.LEFT_PAREN, "Expected '(' after method name");

    const params: Parameter[] = [];
    if (!this.check(TokenType.RIGHT_PAREN)) {
      do {
        const param = this.parseParameter();
        params.push(param);
      } while (this.match(TokenType.COMMA));
    }

    this.consume(TokenType.RIGHT_PAREN, "Expected ')' after method parameters");

    let returnType: TypeAnnotation | undefined;
    if (this.match(TokenType.COLON)) {
      returnType = this.typeAnnotation();
    }

    let body: BlockStatement;
    if (isAbstract) {
      // Abstract methods end with semicolon, no body
      this.consume(TokenType.SEMICOLON, "Expected ';' after abstract method signature");
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

    // Optional type annotation
    let typeAnnotation: TypeAnnotation | undefined;
    if (this.match(TokenType.COLON)) {
      typeAnnotation = this.typeAnnotation();
    }

    // Optional initializer
    let value = undefined;
    if (this.match(TokenType.ASSIGN)) {
      value = this.expression();
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
      static: isStatic || false,
      accessibility: accessProp,
      line: nameToken.line,
      column: nameToken.column,
    };
  }

  public typeAlias(): TypeAlias {
    const typeToken = this.previous();

    const name = this.consume(TokenType.IDENTIFIER, 'Expected type alias name');

    // Skip generic type parameters if present (e.g., <T>, <T, U>)
    this.skipGenericTypeArguments();

    this.consume(TokenType.ASSIGN, "Expected '=' after type alias name");

    const typeAnnotation = this.typeAnnotation();

    this.consume(TokenType.SEMICOLON, "Expected ';' after type alias");

    return {
      type: 'TypeAlias',
      name: {
        type: 'Identifier',
        name: name.value,
        line: name.line,
        column: name.column,
      },
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
      while (this.match(TokenType.NEWLINE)) {
        // Skip newlines
      }

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

    return null;
  }

  private parseSwitchCaseConsequent(): Statement[] {
    const consequent: Statement[] = [];
    while (
      !this.check(TokenType.ҲОЛАТ) &&
      !this.check(TokenType.ПЕШФАРЗ) &&
      !this.check(TokenType.RIGHT_BRACE) &&
      !this.isAtEnd()
    ) {
      if (this.match(TokenType.NEWLINE)) continue;
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
      if (this.match(TokenType.NEWLINE)) continue;

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

  private synchronize(): void {
    // Basic error recovery: advance until a probable statement boundary
    this.advance();
    while (!this.isAtEnd()) {
      if (this.previous().type === TokenType.SEMICOLON) return;
      switch (this.peek().type) {
        case TokenType.ТАҒЙИРЁБАНДА:
        case TokenType.СОБИТ:
        case TokenType.ФУНКСИЯ:
        case TokenType.АГАР:
        case TokenType.ТО: // while keyword
        case TokenType.БОЗГАШТ:
          return;
      }
      this.advance();
    }
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
    const elements: (Identifier | ArrayPattern | ObjectPattern | SpreadElement | null)[] = [];
    while (!this.check(TokenType.RIGHT_BRACKET) && !this.isAtEnd()) {
      if (this.match(TokenType.COMMA)) {
        elements.push(null);
        continue;
      }
      if (this.match(TokenType.SPREAD)) {
        const spreadElem = this.parseSpreadElement();
        elements.push(spreadElem);
      } else {
        elements.push(this.parsePattern());
      }
      if (!this.match(TokenType.COMMA)) break;
    }
    this.consume(TokenType.RIGHT_BRACKET, "Expected ']' in array pattern");
    return {
      type: 'ArrayPattern',
      elements,
      line: this.previous().line,
      column: this.previous().column,
    } as ArrayPattern;
  }

  private parseObjectPattern(): ObjectPattern {
    const properties: (PropertyPattern | SpreadElement)[] = [];
    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      if (this.match(TokenType.SPREAD)) {
        properties.push(this.parseSpreadElement());
      } else {
        const key = this.consume(TokenType.IDENTIFIER, 'Expected identifier in object pattern');
        let value: Identifier | ArrayPattern | ObjectPattern | undefined;
        if (this.match(TokenType.COLON)) {
          value = this.parsePattern();
        }
        properties.push({
          type: 'PropertyPattern',
          key: { type: 'Identifier', name: key.value, line: key.line, column: key.column },
          value,
          line: key.line,
          column: key.column,
        } as PropertyPattern);
      }
      if (!this.match(TokenType.COMMA)) break;
    }
    this.consume(TokenType.RIGHT_BRACE, "Expected '}' in object pattern");
    return {
      type: 'ObjectPattern',
      properties,
      line: this.previous().line,
      column: this.previous().column,
    } as ObjectPattern;
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
    this.consume(TokenType.SEMICOLON, "Expected ';' after 'шикастан'");
    return { type: 'BreakStatement', line: token.line, column: token.column };
  }

  private continueStatement(): ContinueStatement {
    const token = this.previous();
    this.consume(TokenType.SEMICOLON, "Expected ';' after 'давом'");
    return { type: 'ContinueStatement', line: token.line, column: token.column };
  }
}

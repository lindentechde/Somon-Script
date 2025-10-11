import {
  Token,
  TokenType,
  Program,
  Statement,
  Expression,
  VariableDeclaration,
  FunctionDeclaration,
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
  Parameter,
  UniqueType,
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

    if (this.match(TokenType.ВАГАРНА)) {
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

  public forStatement(): ForStatement {
    const forToken = this.previous();

    this.consume(TokenType.LEFT_PAREN, "Expected '(' after 'барои'");

    // Parse init (variable declaration)
    let init: VariableDeclaration | ExpressionStatement | null = null;
    if (this.match(TokenType.ТАҒЙИРЁБАНДА)) {
      init = this.variableDeclaration();
    } else if (!this.check(TokenType.SEMICOLON)) {
      init = this.expressionStatement();
    }

    // Consume semicolon after init (if not already consumed by variable declaration)
    if (init && init.type !== 'VariableDeclaration') {
      // ExpressionStatement already consumed the semicolon
    } else if (!init) {
      this.consume(TokenType.SEMICOLON, "Expected ';' after for loop initializer");
    }

    // Parse test condition
    let test: Expression | null = null;
    if (!this.check(TokenType.SEMICOLON)) {
      test = this.expression();
    }
    this.consume(TokenType.SEMICOLON, "Expected ';' after for loop condition");

    // Parse update expression
    let update: Expression | null = null;
    if (!this.check(TokenType.RIGHT_PAREN)) {
      update = this.expression();
    }
    this.consume(TokenType.RIGHT_PAREN, "Expected ')' after for clauses");

    // Parse body
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

    return expr;
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

      return {
        type: 'NewExpression',
        callee,
        arguments: args,
        line: newToken.line,
        column: newToken.column,
      } as NewExpression;
    }

    return this.call();
  }

  private call(): Expression {
    let expr = this.primary();

    // eslint-disable-next-line no-constant-condition
    while (true) {
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

  private finishCall(callee: Expression): CallExpression {
    const args: Expression[] = [];

    if (!this.check(TokenType.RIGHT_PAREN)) {
      do {
        args.push(this.expression());
      } while (this.match(TokenType.COMMA));
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

  // eslint-disable-next-line complexity
  private primary(): Expression {
    if (this.match(TokenType.ДУРУСТ)) {
      const token = this.previous();
      return {
        type: 'Literal',
        value: true,
        raw: token.value,
        line: token.line,
        column: token.column,
      } as Literal;
    }

    if (this.match(TokenType.НОДУРУСТ)) {
      const token = this.previous();
      return {
        type: 'Literal',
        value: false,
        raw: token.value,
        line: token.line,
        column: token.column,
      } as Literal;
    }

    if (this.match(TokenType.ХОЛӢ)) {
      const token = this.previous();
      return {
        type: 'Literal',
        value: null,
        raw: token.value,
        line: token.line,
        column: token.column,
      } as Literal;
    }

    if (this.match(TokenType.NUMBER)) {
      const token = this.previous();
      return {
        type: 'Literal',
        value: parseFloat(token.value),
        raw: token.value,
        line: token.line,
        column: token.column,
      } as Literal;
    }

    if (this.match(TokenType.STRING)) {
      const token = this.previous();
      return {
        type: 'Literal',
        value: token.value,
        raw: `"${token.value}"`,
        line: token.line,
        column: token.column,
      } as Literal;
    }

    if (this.match(TokenType.TEMPLATE_LITERAL)) {
      return this.parseTemplateLiteral();
    }

    if (this.match(TokenType.ИН)) {
      const token = this.previous();
      return {
        type: 'ThisExpression',
        line: token.line,
        column: token.column,
      };
    }

    if (this.match(TokenType.СУПЕР)) {
      const token = this.previous();
      return {
        type: 'Super',
        line: token.line,
        column: token.column,
      };
    }

    if (this.match(TokenType.НАВ)) {
      const token = this.previous();
      const callee = this.primary();

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
        callee: callee,
        arguments: args,
        line: token.line,
        column: token.column,
      } as NewExpression;
    }

    // Dynamic import: ворид(specifier)
    if (this.check(TokenType.ВОРИД) && this.peekNext()?.type === TokenType.LEFT_PAREN) {
      const importToken = this.advance();
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

    if (this.match(TokenType.IDENTIFIER) || this.matchBuiltinIdentifier()) {
      const token = this.previous();
      return {
        type: 'Identifier',
        name: token.value,
        line: token.line,
        column: token.column,
      } as Identifier;
    }

    // Allow certain keywords to be used as identifiers in expression contexts
    if (
      this.match(
        TokenType.НАВЪ,
        TokenType.МАЪЛУМОТ,
        TokenType.РӮЙХАТ,
        TokenType.ОБЪЕКТ,
        TokenType.БЕҚИМАТ
      )
    ) {
      const token = this.previous();
      return {
        type: 'Identifier',
        name: token.value,
        line: token.line,
        column: token.column,
      } as Identifier;
    }

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

  private parseTemplateString(
    template: string
  ): Array<{ type: 'text' | 'expression'; value: string }> {
    const parts: Array<{ type: 'text' | 'expression'; value: string }> = [];
    let current = '';
    let i = 0;

    while (i < template.length) {
      if (template[i] === '$' && template[i + 1] === '{') {
        // Save current text part (even if empty at the start)
        if (current || parts.length === 0) {
          parts.push({ type: 'text', value: current });
          current = '';
        }

        // Find the matching closing brace
        i += 2; // Skip ${
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

        parts.push({ type: 'expression', value: expr });
      } else {
        current += template[i];
        i++;
      }
    }

    // Add remaining text (even if empty)
    if (current || parts.length === 0) {
      parts.push({ type: 'text', value: current });
    }

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
    return this.tokens[this.current];
  }

  private peekNext(): Token | undefined {
    if (this.current + 1 >= this.tokens.length) return undefined;
    return this.tokens[this.current + 1];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
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

  private parseNamedImports(
    specifiers: Array<ImportSpecifier | ImportDefaultSpecifier | ImportNamespaceSpecifier>
  ): void {
    if (!this.check(TokenType.RIGHT_BRACE)) {
      do {
        let imported: Token;
        if (this.check(TokenType.IDENTIFIER)) {
          imported = this.advance();
        } else if (this.matchBuiltinIdentifier()) {
          imported = this.previous();
        } else {
          throw new Error(
            `Expected import name at line ${this.peek().line}, column ${this.peek().column}`
          );
        }
        let local = imported;

        // Handle 'as' alias (we'll use 'чун' for 'as')
        if (this.match(TokenType.ЧУН)) {
          if (this.check(TokenType.IDENTIFIER)) {
            local = this.advance();
          } else if (this.matchBuiltinIdentifier()) {
            local = this.previous();
          } else {
            throw new Error(
              `Expected local name after 'чун' at line ${this.peek().line}, column ${this.peek().column}`
            );
          }
        }

        specifiers.push({
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
        } as ImportSpecifier);
      } while (this.match(TokenType.COMMA));
    }
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
    // This includes: функсия, синф, собит, тағйирёбанда, интерфейс, навъ
    const declaration = this.statement();
    return {
      type: 'ExportDeclaration',
      declaration: declaration!,
      default: false,
      line: exportToken.line,
      column: exportToken.column,
    };
  }

  private parseExportSpecifiers(): ExportSpecifier[] {
    const specifiers: ExportSpecifier[] = [];

    if (!this.check(TokenType.RIGHT_BRACE)) {
      do {
        let local: Token;
        if (this.check(TokenType.IDENTIFIER)) {
          local = this.advance();
        } else if (this.matchBuiltinIdentifier()) {
          local = this.previous();
        } else {
          throw new Error(
            `Expected export name at line ${this.peek().line}, column ${this.peek().column}`
          );
        }

        let exported = local;

        // Handle 'чун' (as) alias: { localName чун exportedName }
        if (this.match(TokenType.ЧУН)) {
          if (this.check(TokenType.IDENTIFIER)) {
            exported = this.advance();
          } else if (this.matchBuiltinIdentifier()) {
            exported = this.previous();
          } else {
            throw new Error(
              `Expected export alias after 'чун' at line ${this.peek().line}, column ${this.peek().column}`
            );
          }
        }

        specifiers.push({
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
        });
      } while (this.match(TokenType.COMMA));
    }

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
      TokenType.САТР_МЕТОДҲО,
      TokenType.ДАРОЗИИ_САТР,
      TokenType.ПАЙВАСТАН,
      TokenType.ҶОЙИВАЗКУНӢ,
      TokenType.ҶУДОКУНӢ,
      TokenType.ОБЪЕКТ,
      TokenType.КАЛИДҲО,
      TokenType.ҚИМАТҲО,
      TokenType.МАТЕМАТИКА,
      TokenType.ҶАМЪ,
      TokenType.ТАРҲ,
      TokenType.ЗАРБ,
      TokenType.ТАҚСИМ,
      TokenType.ҲОЛАТ, // Allow 'case' keyword as identifier (for property names)
      // Basic type keywords can appear as variable names in examples
      TokenType.РАҚАМ,
      TokenType.САТР,
      TokenType.МАНТИҚӢ,
      TokenType.ХОЛӢ,
      // Note: We don't include control flow keywords here as they have special parsing
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
      // Regular property
      const keyToken = this.advance();
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
      this.match(
        TokenType.НАВЪ,
        TokenType.МАЪЛУМОТ,
        TokenType.РӮЙХАТ,
        TokenType.ОБЪЕКТ,
        TokenType.БЕҚИМАТ
      )
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
    return this.unionType();
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
      this.parsePrimitiveType() ??
      this.parseGenericOrIdentifierType() ??
      this.parseTupleType() ??
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

  private parsePrimitiveType(): TypeNode | undefined {
    if (!this.match(TokenType.САТР, TokenType.РАҚАМ, TokenType.МАНТИҚӢ, TokenType.ХОЛӢ)) {
      return undefined;
    }
    const token = this.previous();
    const primitiveType: PrimitiveType = {
      type: 'PrimitiveType',
      name: token.value as 'сатр' | 'рақам' | 'мантиқӣ' | 'холӣ',
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
    if (!this.check(TokenType.IDENTIFIER) && !this.matchBuiltinIdentifier()) {
      return undefined;
    }
    const nameToken = this.check(TokenType.IDENTIFIER) ? this.advance() : this.previous();
    const name: Identifier = {
      type: 'Identifier',
      name: nameToken.value,
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

  private errorExpectedType(): never {
    throw new Error(`Expected type at line ${this.peek().line}, column ${this.peek().column}`);
  }

  public interfaceDeclaration(): InterfaceDeclaration {
    const interfaceToken = this.previous();

    let name: Token;
    if (this.check(TokenType.IDENTIFIER)) {
      name = this.advance();
    } else if (this.matchBuiltinIdentifier()) {
      name = this.previous();
    } else {
      throw new Error(
        `Expected interface name at line ${this.peek().line}, column ${this.peek().column}`
      );
    }

    // Parse optional type parameters
    let typeParameters: TypeParameter[] | undefined;
    if (this.match(TokenType.LESS_THAN)) {
      typeParameters = [];
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
    }

    // Parse optional extends clause (interface inheritance)
    // Note: extends clause is parsed but not used in JavaScript generation
    if (this.match(TokenType.МЕРОС)) {
      if (this.check(TokenType.IDENTIFIER)) {
        this.advance(); // consume interface name
      } else if (this.matchBuiltinIdentifier()) {
        // already consumed by matchBuiltinIdentifier
      } else {
        throw new Error(
          `Expected interface name after 'мерос' at line ${this.peek().line}, column ${this.peek().column}`
        );
      }
    }

    this.consume(TokenType.LEFT_BRACE, "Expected '{' after interface name");

    const properties: PropertySignature[] = [];
    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      // Skip newlines and whitespace
      if (this.match(TokenType.NEWLINE)) {
        continue;
      }

      const property = this.propertySignature();
      properties.push(property);

      // After parsing a property, ensure we're positioned correctly for the next one
      // Skip any trailing whitespace or newlines
      while (this.check(TokenType.NEWLINE)) {
        this.advance();
      }
    }

    this.consume(TokenType.RIGHT_BRACE, "Expected '}' after interface body");

    const result = {
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

    return result;
  }

  private propertySignature(): PropertySignature {
    // Parse optional readonly modifier
    let readonly = false;
    if (this.match(TokenType.ТАНҲОХОНӢ)) {
      readonly = true;
    }

    let keyName: Token;
    if (this.check(TokenType.IDENTIFIER)) {
      keyName = this.advance();
    } else if (this.matchBuiltinIdentifier()) {
      keyName = this.previous();
    } else if (
      this.check(TokenType.САТР) ||
      this.check(TokenType.РАҚАМ) ||
      this.check(TokenType.МАНТИҚӢ) ||
      this.check(TokenType.ХОЛӢ)
    ) {
      // Allow type keywords as property names
      keyName = this.advance();
    } else {
      throw new Error(
        `Expected property name at line ${this.peek().line}, column ${this.peek().column}`
      );
    }

    // Check if this is a method signature (has parentheses)
    if (this.check(TokenType.LEFT_PAREN)) {
      // Method signature: methodName(params): returnType;
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
    } else {
      // Regular property signature: propName: type;
      // Check for optional property
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
  }

  public classDeclaration(): ClassDeclaration {
    const classToken = this.previous();

    // Class name
    let nameToken: Token;
    if (this.check(TokenType.IDENTIFIER)) {
      nameToken = this.advance();
    } else if (this.matchBuiltinIdentifier()) {
      nameToken = this.previous();
    } else {
      throw new Error(
        `Expected class name at line ${this.peek().line}, column ${this.peek().column}`
      );
    }

    // Optional extends clause
    let superClassToken: Token | undefined = undefined;
    if (this.match(TokenType.МЕРОС)) {
      if (this.check(TokenType.IDENTIFIER)) {
        superClassToken = this.advance();
      } else if (this.matchBuiltinIdentifier()) {
        superClassToken = this.previous();
      } else {
        throw new Error(
          `Expected superclass name after 'мерос' at line ${this.peek().line}, column ${this.peek().column}`
        );
      }
    }

    // Optional implements clause
    const implementsTokens: Token[] = [];
    if (this.match(TokenType.ТАТБИҚ)) {
      do {
        if (this.check(TokenType.IDENTIFIER)) {
          implementsTokens.push(this.advance());
        } else if (this.matchBuiltinIdentifier()) {
          implementsTokens.push(this.previous());
        } else {
          throw new Error(
            `Expected interface name in implements clause at line ${this.peek().line}, column ${this.peek().column}`
          );
        }
      } while (this.match(TokenType.COMMA));
    }

    // Class body
    this.consume(TokenType.LEFT_BRACE, "Expected '{' after class declaration");
    const body = this.classBody();
    this.consume(TokenType.RIGHT_BRACE, "Expected '}' after class body");

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
      body: body,
      line: classToken.line,
      column: classToken.column,
    };
  }

  private classBody(): ClassBody {
    const members: (MethodDefinition | PropertyDefinition)[] = [];

    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      // Skip newlines
      if (this.match(TokenType.NEWLINE)) {
        continue;
      }

      try {
        // Parse class member
        const member = this.classMember();
        if (member) {
          members.push(member);
        }

        // After parsing a member, ensure we're positioned correctly for the next one
        // Skip any trailing whitespace or newlines
        while (this.check(TokenType.NEWLINE)) {
          this.advance();
        }
      } catch (error) {
        // If class member parsing fails, break out of the class context
        // This prevents partial parsing from contaminating the rest of the program
        console.error(`Error parsing class member: ${error}`);
        // Try to recover by advancing to the next potential member or class end
        while (
          !this.check(TokenType.RIGHT_BRACE) &&
          !this.check(TokenType.ҶАМЪИЯТӢ) &&
          !this.check(TokenType.ХОСУСӢ) &&
          !this.check(TokenType.КОНСТРУКТОР) &&
          !this.check(TokenType.IDENTIFIER) &&
          !this.isAtEnd()
        ) {
          this.advance();
        }
        // Don't break - continue trying to parse the rest of the class
        // The break was causing premature exit from class parsing
      }
    }

    return {
      type: 'ClassBody',
      body: members,
      line: this.peek().line,
      column: this.peek().column,
    };
  }

  private classMember(): MethodDefinition | PropertyDefinition | undefined {
    // Check for access modifiers
    let accessibility: 'public' | 'private' | 'protected' | undefined = undefined;
    if (this.match(TokenType.ҶАМЪИЯТӢ, TokenType.ХОСУСӢ, TokenType.МУҲОФИЗАТШУДА)) {
      const accessToken = this.previous();
      accessibility =
        accessToken.type === TokenType.ҶАМЪИЯТӢ
          ? 'public'
          : accessToken.type === TokenType.ХОСУСӢ
            ? 'private'
            : 'protected';
    }

    // Check for static
    let isStatic = false;
    if (this.match(TokenType.СТАТИКӢ)) {
      isStatic = true;
    }

    // Check for abstract
    let isAbstract = false;
    if (this.match(TokenType.МАВҲУМ)) {
      isAbstract = true;
    }

    // Constructor
    if (this.match(TokenType.КОНСТРУКТОР)) {
      return this.constructorMethod(accessibility, isStatic);
    }

    // Method or property
    let nameToken;
    if (this.check(TokenType.IDENTIFIER)) {
      nameToken = this.advance();
    } else if (this.matchBuiltinIdentifier()) {
      nameToken = this.previous();
    } else {
      throw new Error(
        `Expected class member at line ${this.peek().line}, column ${this.peek().column}`
      );
    }

    if (this.check(TokenType.LEFT_PAREN)) {
      // Method
      return this.classMethod(nameToken, accessibility, isStatic, isAbstract);
    } else {
      // Property
      return this.classProperty(nameToken, accessibility, isStatic);
    }
  }

  private constructorMethod(accessibility?: string, isStatic?: boolean): MethodDefinition {
    const constructorToken = this.previous();
    const access: 'public' | 'private' | 'protected' | undefined =
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

    let body = null;
    if (isAbstract) {
      // Abstract methods end with semicolon, no body
      this.consume(TokenType.SEMICOLON, "Expected ';' after abstract method signature");
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
        body: body || this.blockStatement(),
        returnType,
        line: nameToken.line,
        column: nameToken.column,
      },
      kind: 'method',
      static: isStatic || false,
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

  // eslint-disable-next-line complexity
  private switchStatement(): SwitchStatement {
    const switchToken = this.previous();
    this.consume(TokenType.LEFT_PAREN, "Expected '(' after 'интихоб'");
    const discriminant = this.expression();
    this.consume(TokenType.RIGHT_PAREN, "Expected ')' after switch expression");
    this.consume(TokenType.LEFT_BRACE, "Expected '{' after switch expression");

    const cases: SwitchCase[] = [];
    let foundDefault = false;

    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      if (this.match(TokenType.NEWLINE)) continue;

      if (this.match(TokenType.ҲОЛАТ)) {
        // case
        const test = this.expression();
        this.consume(TokenType.COLON, "Expected ':' after case value");
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
        cases.push({ type: 'SwitchCase', test, consequent, line: test.line, column: test.column });
        continue;
      }

      if (this.match(TokenType.ПЕШФАРЗ)) {
        // default
        if (foundDefault) {
          this.errors.push('Multiple default cases in switch');
        }
        foundDefault = true;
        this.consume(TokenType.COLON, "Expected ':' after default keyword");
        const startToken = this.previous();
        const consequent: Statement[] = [];
        while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
          if (this.check(TokenType.ҲОЛАТ) || this.check(TokenType.ПЕШФАРЗ)) break;
          if (this.match(TokenType.NEWLINE)) continue;
          const stmt = this.statement();
          if (stmt) consequent.push(stmt);
        }
        cases.push({
          type: 'SwitchCase',
          test: undefined, // default case
          consequent,
          line: startToken.line,
          column: startToken.column,
        } as SwitchCase);
        continue;
      }

      // Unrecognized token inside switch; attempt recovery
      this.errors.push(
        `Unexpected token '${this.peek().value}' in switch at line ${this.peek().line}`
      );
      this.advance();
    }

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
    // 'объект' is a keyword mapped to TokenType.ОБЪЕКТ but test suite expects it
    // can be used as a normal variable name. Extendable list if more appear.
    if (this.check(TokenType.IDENTIFIER) || this.check(TokenType.ОБЪЕКТ)) {
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

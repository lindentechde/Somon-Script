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
  CallExpression,
  AssignmentExpression,
  MemberExpression,
  ImportDeclaration,
  ImportSpecifier,
  ImportDefaultSpecifier,
  ExportDeclaration,

  ArrayExpression,
  TypeAnnotation,
  TypeNode,
  PrimitiveType,
  ArrayType,
  UnionType,
  GenericType,
  TupleType,
  InterfaceDeclaration,
  InterfaceBody, // eslint-disable-line no-unused-vars
  PropertySignature,
  TypeParameter,
  TypeAlias,
  Parameter,
  AwaitExpression,
  NewExpression,
  TryStatement,
  CatchClause,
  ThrowStatement,
  ClassDeclaration,
  ArrayPattern,
  ObjectPattern,
  PropertyPattern,
  SpreadElement,

  ObjectExpression,
  Property
} from './types';

export class Parser {
  private tokens: Token[];
  private current: number = 0;
  private errors: string[] = [];

  constructor(tokens: Token[]) {
    this.tokens = tokens;
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
      column: 1
    };
  }

  // eslint-disable-next-line complexity
  private statement(): Statement | null {
    try {
      // Skip newlines
      if (this.match(TokenType.NEWLINE)) {
        return null;
      }

      if (this.match(TokenType.ВОРИД)) {
        return this.importDeclaration();
      }
      
      if (this.match(TokenType.СОДИР)) {
        return this.exportDeclaration();
      }
      
      if (this.match(TokenType.ИНТЕРФЕЙС)) {
        return this.interfaceDeclaration();
      }
      
      if (this.match(TokenType.НАВЪ)) {
        return this.typeAlias();
      }
      
      if (this.match(TokenType.МАВҲУМ)) {
        // Handle abstract class
        this.consume(TokenType.СИНФ, "Expected 'синф' after 'мавҳум'");
        const classDecl = this.classDeclaration();
        // Mark as abstract
        (classDecl as ClassDeclaration & { abstract?: boolean }).abstract = true;
        return classDecl;
      }
      
      if (this.match(TokenType.СИНФ)) {
        return this.classDeclaration();
      }
      
      if (this.match(TokenType.ТАҒЙИРЁБАНДА, TokenType.СОБИТ)) {
        return this.variableDeclaration();
      }
      
      if (this.match(TokenType.ҲАМЗАМОН)) {
        // Handle async function
        this.consume(TokenType.ФУНКСИЯ, "Expected 'функсия' after 'ҳамзамон'");
        const func = this.functionDeclaration();
        // Mark as async (we'll handle this in codegen)
        (func as FunctionDeclaration & { async?: boolean }).async = true;
        return func;
      }
      
      if (this.match(TokenType.ФУНКСИЯ)) {
        return this.functionDeclaration();
      }
      
      if (this.match(TokenType.КӮШИШ)) {
        return this.tryStatement();
      }
      
      if (this.match(TokenType.ПАРТОФТАН)) {
        return this.throwStatement();
      }
      
      if (this.match(TokenType.АГАР)) {
        return this.ifStatement();
      }
      
      if (this.match(TokenType.ТО)) {
        return this.whileStatement();
      }
      
      if (this.match(TokenType.ИНТИХОБ)) {
        return this.switchStatement();
      }
      
      if (this.match(TokenType.ШИКАСТАН)) {
        return this.breakStatement();
      }
      
      if (this.match(TokenType.ДАВОМ)) {
        return this.continueStatement();
      }
      
      if (this.match(TokenType.БОЗГАШТ)) {
        return this.returnStatement();
      }
      
      if (this.match(TokenType.LEFT_BRACE)) {
        return this.blockStatement();
      }
      
      return this.expressionStatement();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.errors.push(errorMessage);
      this.synchronize();
      return null; // Continue parsing after error
    }
  }

  private variableDeclaration(): VariableDeclaration {
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
      column: kindToken.column
    };
  }

  private functionDeclaration(): FunctionDeclaration {
    const funcToken = this.previous();
    let name: Token;
    if (this.check(TokenType.IDENTIFIER)) {
      name = this.advance();
    } else if (this.matchBuiltinIdentifier()) {
      name = this.previous();
    } else {
      throw new Error(`Expected function name at line ${this.peek().line}, column ${this.peek().column}`);
    }
    
    this.consume(TokenType.LEFT_PAREN, "Expected '(' after function name");
    
    const params: Parameter[] = [];
    if (!this.check(TokenType.RIGHT_PAREN)) {
      do {
        const param = this.parseParameter();
        params.push(param);
      } while (this.match(TokenType.COMMA));
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
        column: name.column
      },
      params,
      returnType,
      body,
      line: funcToken.line,
      column: funcToken.column
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
      column: leftBrace.column
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
      column: ifToken.column
    };
  }

  private whileStatement(): WhileStatement {
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
      column: whileToken.column
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
      column: returnToken.column
    };
  }

  private expressionStatement(): ExpressionStatement {
    const expr = this.expression();
    this.consume(TokenType.SEMICOLON, "Expected ';' after expression");
    
    return {
      type: 'ExpressionStatement',
      expression: expr,
      line: expr.line,
      column: expr.column
    };
  }

  private expression(): Expression {
    return this.assignment();
  }

  private assignment(): Expression {
    const expr = this.or();
    
    if (this.match(TokenType.ASSIGN)) {
      const operator = this.previous();
      const value = this.assignment();
      
      return {
        type: 'AssignmentExpression',
        left: expr,
        operator: operator.value,
        right: value,
        line: expr.line,
        column: expr.column
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
        column: expr.column
      } as BinaryExpression;
    }
    
    return expr;
  }

  private and(): Expression {
    let expr = this.equality();
    
    while (this.match(TokenType.AND)) {
      const operator = this.previous();
      const right = this.equality();
      expr = {
        type: 'BinaryExpression',
        left: expr,
        operator: operator.value,
        right,
        line: expr.line,
        column: expr.column
      } as BinaryExpression;
    }
    
    return expr;
  }

  private equality(): Expression {
    let expr = this.comparison();
    
    while (this.match(TokenType.EQUAL, TokenType.NOT_EQUAL)) {
      const operator = this.previous();
      const right = this.comparison();
      expr = {
        type: 'BinaryExpression',
        left: expr,
        operator: operator.value,
        right,
        line: expr.line,
        column: expr.column
      } as BinaryExpression;
    }
    
    return expr;
  }

  private comparison(): Expression {
    let expr = this.term();
    
    while (this.match(TokenType.GREATER_THAN, TokenType.GREATER_EQUAL, TokenType.LESS_THAN, TokenType.LESS_EQUAL)) {
      const operator = this.previous();
      const right = this.term();
      expr = {
        type: 'BinaryExpression',
        left: expr,
        operator: operator.value,
        right,
        line: expr.line,
        column: expr.column
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
        column: expr.column
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
        column: expr.column
      } as BinaryExpression;
    }
    
    return expr;
  }

  private unary(): Expression {
    if (this.match(TokenType.NOT, TokenType.MINUS)) {
      const operator = this.previous();
      const right = this.unary();
      return {
        type: 'UnaryExpression',
        operator: operator.value,
        argument: right,
        line: operator.line,
        column: operator.column
      } as UnaryExpression;
    }
    
    if (this.match(TokenType.ИНТИЗОР)) {
      const awaitToken = this.previous();
      const argument = this.unary();
      return {
        type: 'AwaitExpression',
        argument,
        line: awaitToken.line,
        column: awaitToken.column
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
        column: newToken.column
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
          throw new Error(`Expected property name after '.' at line ${this.peek().line}, column ${this.peek().column}`);
        }
        
        expr = {
          type: 'MemberExpression',
          object: expr,
          property: {
            type: 'Identifier',
            name: name.value,
            line: name.line,
            column: name.column
          } as Identifier,
          computed: false,
          line: expr.line,
          column: expr.column
        } as MemberExpression;
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
      column: callee.column
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
        column: token.column
      } as Literal;
    }
    
    if (this.match(TokenType.НОДУРУСТ)) {
      const token = this.previous();
      return {
        type: 'Literal',
        value: false,
        raw: token.value,
        line: token.line,
        column: token.column
      } as Literal;
    }
    
    if (this.match(TokenType.ХОЛӢ)) {
      const token = this.previous();
      return {
        type: 'Literal',
        value: null,
        raw: token.value,
        line: token.line,
        column: token.column
      } as Literal;
    }
    
    if (this.match(TokenType.NUMBER)) {
      const token = this.previous();
      return {
        type: 'Literal',
        value: parseFloat(token.value),
        raw: token.value,
        line: token.line,
        column: token.column
      } as Literal;
    }
    
    if (this.match(TokenType.STRING)) {
      const token = this.previous();
      return {
        type: 'Literal',
        value: token.value,
        raw: `"${token.value}"`,
        line: token.line,
        column: token.column
      } as Literal;
    }
    
    if (this.match(TokenType.ИН)) {
      const token = this.previous();
      return {
        type: 'ThisExpression',
        line: token.line,
        column: token.column
      };
    }
    
    if (this.match(TokenType.СУПЕР)) {
      const token = this.previous();
      return {
        type: 'Super',
        line: token.line,
        column: token.column
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
        column: token.column
      } as NewExpression;
    }
    
    if (this.match(TokenType.IDENTIFIER) || this.matchBuiltinIdentifier()) {
      const token = this.previous();
      return {
        type: 'Identifier',
        name: token.value,
        line: token.line,
        column: token.column
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
    throw new Error(`Unexpected token '${token.value}' at line ${token.line}, column ${token.column}`);
  }

  private match(...types: TokenType[]): boolean {
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

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();
    
    const token = this.peek();
    const errorMsg = `${message}. Got '${token.value}' at line ${token.line}, column ${token.column}`;
    this.errors.push(errorMsg);
    
    // Try to recover by returning a dummy token
    return {
      type: type,
      value: '',
      line: token.line,
      column: token.column
    };
  }

  private importDeclaration(): ImportDeclaration {
    const importToken = this.previous();
    const specifiers: (ImportSpecifier | ImportDefaultSpecifier)[] = [];
    
    // Handle default import or named imports
    if (this.check(TokenType.IDENTIFIER)) {
      const local = this.advance();
      specifiers.push({
        type: 'ImportDefaultSpecifier',
        local: {
          type: 'Identifier',
          name: local.value,
          line: local.line,
          column: local.column
        } as Identifier,
        line: local.line,
        column: local.column
      } as ImportDefaultSpecifier);
      
      if (this.match(TokenType.COMMA)) {
        // Handle named imports after default
        this.consume(TokenType.LEFT_BRACE, "Expected '{' after default import");
        this.parseNamedImports(specifiers);
        this.consume(TokenType.RIGHT_BRACE, "Expected '}' after named imports");
      }
    } else if (this.match(TokenType.LEFT_BRACE)) {
      // Handle only named imports
      this.parseNamedImports(specifiers);
      this.consume(TokenType.RIGHT_BRACE, "Expected '}' after named imports");
    }
    
    this.consume(TokenType.АЗ, "Expected 'аз' after import specifiers");
    const source = this.consume(TokenType.STRING, "Expected module path");
    this.consume(TokenType.SEMICOLON, "Expected ';' after import");
    
    return {
      type: 'ImportDeclaration',
      specifiers: specifiers as ImportSpecifier[],
      source: {
        type: 'Literal',
        value: source.value,
        raw: `"${source.value}"`,
        line: source.line,
        column: source.column
      } as Literal,
      line: importToken.line,
      column: importToken.column
    };
  }

  private parseNamedImports(specifiers: (ImportSpecifier | ImportDefaultSpecifier)[]): void {
    if (!this.check(TokenType.RIGHT_BRACE)) {
      do {
        const imported = this.consume(TokenType.IDENTIFIER, "Expected import name");
        let local = imported;
        
        // Handle 'as' alias (we'll use 'чун' for 'as')
        if (this.match(TokenType.ЧУН)) {
          if (this.check(TokenType.IDENTIFIER)) {
            local = this.advance();
          } else if (this.matchBuiltinIdentifier()) {
            local = this.previous();
          } else {
            throw new Error(`Expected local name after 'чун' at line ${this.peek().line}, column ${this.peek().column}`);
          }
        }
        
        specifiers.push({
          type: 'ImportSpecifier',
          imported: {
            type: 'Identifier',
            name: imported.value,
            line: imported.line,
            column: imported.column
          } as Identifier,
          local: {
            type: 'Identifier',
            name: local.value,
            line: local.line,
            column: local.column
          } as Identifier,
          line: imported.line,
          column: imported.column
        } as ImportSpecifier);
      } while (this.match(TokenType.COMMA));
    }
  }

  private exportDeclaration(): ExportDeclaration {
    const exportToken = this.previous();
    
    if (this.match(TokenType.ПЕШФАРЗ)) {
      // Export default
      const declaration = this.statement();
      return {
        type: 'ExportDeclaration',
        declaration: declaration!,
        default: true,
        line: exportToken.line,
        column: exportToken.column
      };
    } else {
      // Export named
      const declaration = this.statement();
      return {
        type: 'ExportDeclaration',
        declaration: declaration!,
        default: false,
        line: exportToken.line,
        column: exportToken.column
      };
    }
  }

  private matchBuiltinIdentifier(): boolean {
    const builtinTypes = [
      TokenType.ЧОП, TokenType.САБТ, TokenType.ХАТО, TokenType.ОГОҲӢ, TokenType.МАЪЛУМОТ,
      TokenType.РӮЙХАТ, TokenType.ИЛОВА, TokenType.БАРОВАРДАН, TokenType.ДАРОЗӢ,
      TokenType.ХАРИТА, TokenType.ФИЛТР, TokenType.КОФТАН,
      TokenType.САТР_МЕТОДҲО, TokenType.ДАРОЗИИ_САТР, TokenType.ПАЙВАСТАН, TokenType.ҶОЙИВАЗКУНӢ, TokenType.ҶУДОКУНӢ,
      TokenType.ОБЪЕКТ, TokenType.КАЛИДҲО, TokenType.ҚИМАТҲО,
      TokenType.МАТЕМАТИКА, TokenType.ҶАМЪ, TokenType.ТАРҲ, TokenType.ЗАРБ, TokenType.ТАҚСИМ,
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
    
    if (!this.check(TokenType.RIGHT_BRACKET)) {
      do {
        if (this.check(TokenType.SPREAD)) {
          elements.push(this.parseSpreadElement());
        } else {
          elements.push(this.expression());
        }
      } while (this.match(TokenType.COMMA));
    }
    
    this.consume(TokenType.RIGHT_BRACKET, "Expected ']' after array elements");
    
    return {
      type: 'ArrayExpression',
      elements,
      line: leftBracket.line,
      column: leftBracket.column
    } as ArrayExpression;
  }

  private objectExpression(): ObjectExpression {
    const leftBrace = this.previous();
    const properties: Property[] = [];
    
    if (!this.check(TokenType.RIGHT_BRACE)) {
      do {
        const property = this.parseProperty();
        properties.push(property);
      } while (this.match(TokenType.COMMA));
    }
    
    this.consume(TokenType.RIGHT_BRACE, "Expected '}' after object properties");
    
    return {
      type: 'ObjectExpression',
      properties,
      line: leftBrace.line,
      column: leftBrace.column
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
        column: keyToken.column
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
      column: key.column
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
          column: paramToken.column
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
        column: this.previous().column
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
      column: tryToken.column
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
      column: throwToken.column
    };
  }

  private parseParameter(): Parameter {
    let paramName: Token;
    if (this.check(TokenType.IDENTIFIER)) {
      paramName = this.advance();
    } else if (this.matchBuiltinIdentifier()) {
      paramName = this.previous();
    } else {
      throw new Error(`Expected parameter name at line ${this.peek().line}, column ${this.peek().column}`);
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
        column: paramName.column
      },
      typeAnnotation,
      line: paramName.line,
      column: paramName.column
    };
  }

  private typeAnnotation(): TypeAnnotation {
    const typeNode = this.parseType();
    return {
      type: 'TypeAnnotation',
      typeAnnotation: typeNode,
      line: typeNode.line,
      column: typeNode.column
    };
  }

  private parseType(): TypeNode {
    return this.unionType();
  }

  private unionType(): TypeNode {
    let type = this.primaryType();
    
    while (this.match(TokenType.PIPE)) {
      const types = [type];
      do {
        types.push(this.primaryType());
      } while (this.match(TokenType.PIPE));
      
      type = {
        type: 'UnionType',
        types,
        line: type.line,
        column: type.column
      } as UnionType;
    }
    
    return type;
  }

  private primaryType(): TypeNode {
    // Parenthesized types
    if (this.match(TokenType.LEFT_PAREN)) {
      const type = this.unionType();
      this.consume(TokenType.RIGHT_PAREN, "Expected ')' after type");
      
      // Check for array type after parentheses
      if (this.match(TokenType.LEFT_BRACKET)) {
        this.consume(TokenType.RIGHT_BRACKET, "Expected ']' after '['");
        return {
          type: 'ArrayType',
          elementType: type,
          line: type.line,
          column: type.column
        } as ArrayType;
      }
      
      return type;
    }
    
    // Primitive types
    if (this.match(TokenType.САТР, TokenType.РАҚАМ, TokenType.МАНТИҚӢ, TokenType.ХОЛӢ)) {
      const token = this.previous();
      const primitiveType: PrimitiveType = {
        type: 'PrimitiveType',
        name: token.value as 'сатр' | 'рақам' | 'мантиқӣ' | 'холӣ',
        line: token.line,
        column: token.column
      };
      
      // Check for array type
      if (this.match(TokenType.LEFT_BRACKET)) {
        this.consume(TokenType.RIGHT_BRACKET, "Expected ']' after '['");
        return {
          type: 'ArrayType',
          elementType: primitiveType,
          line: primitiveType.line,
          column: primitiveType.column
        } as ArrayType;
      }
      
      return primitiveType;
    }
    
    // Generic or identifier types
    if (this.check(TokenType.IDENTIFIER) || this.matchBuiltinIdentifier()) {
      const nameToken = this.check(TokenType.IDENTIFIER) ? this.advance() : this.previous();
      const name: Identifier = {
        type: 'Identifier',
        name: nameToken.value,
        line: nameToken.line,
        column: nameToken.column
      };
      
      // Check for generic type parameters
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
        column: name.column
      };
      
      // Check for array type
      if (this.match(TokenType.LEFT_BRACKET)) {
        this.consume(TokenType.RIGHT_BRACKET, "Expected ']' after '['");
        return {
          type: 'ArrayType',
          elementType: genericType,
          line: genericType.line,
          column: genericType.column
        } as ArrayType;
      }
      
      return genericType;
    }
    
    // Tuple types [type1, type2, ...]
    if (this.match(TokenType.LEFT_BRACKET)) {
      const types: TypeNode[] = [];
      
      if (!this.check(TokenType.RIGHT_BRACKET)) {
        do {
          types.push(this.unionType());
        } while (this.match(TokenType.COMMA));
      }
      
      this.consume(TokenType.RIGHT_BRACKET, "Expected ']' after tuple types");
      
      return {
        type: 'TupleType',
        elementTypes: types,
        line: this.previous().line,
        column: this.previous().column
      } as TupleType;
    }
    
    throw new Error(`Expected type at line ${this.peek().line}, column ${this.peek().column}`);
  }

  private interfaceDeclaration(): InterfaceDeclaration {
    const interfaceToken = this.previous();
    
    let name: Token;
    if (this.check(TokenType.IDENTIFIER)) {
      name = this.advance();
    } else if (this.matchBuiltinIdentifier()) {
      name = this.previous();
    } else {
      throw new Error(`Expected interface name at line ${this.peek().line}, column ${this.peek().column}`);
    }
    
    // Parse optional type parameters
    let typeParameters: TypeParameter[] | undefined;
    if (this.match(TokenType.LESS_THAN)) {
      typeParameters = [];
      do {
        const paramName = this.consume(TokenType.IDENTIFIER, "Expected type parameter name");
        typeParameters.push({
          type: 'TypeParameter',
          name: {
            type: 'Identifier',
            name: paramName.value,
            line: paramName.line,
            column: paramName.column
          },
          line: paramName.line,
          column: paramName.column
        });
      } while (this.match(TokenType.COMMA));
      this.consume(TokenType.GREATER_THAN, "Expected '>' after type parameters");
    }
    
    this.consume(TokenType.LEFT_BRACE, "Expected '{' after interface name");
    
    const properties: PropertySignature[] = [];
    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      // Skip newlines
      if (this.match(TokenType.NEWLINE)) {
        continue;
      }
      
      const property = this.propertySignature();
      properties.push(property);
    }
    
    this.consume(TokenType.RIGHT_BRACE, "Expected '}' after interface body");
    
    return {
      type: 'InterfaceDeclaration',
      name: {
        type: 'Identifier',
        name: name.value,
        line: name.line,
        column: name.column
      },
      typeParameters,
      body: {
        type: 'InterfaceBody',
        properties,
        line: interfaceToken.line,
        column: interfaceToken.column
      },
      line: interfaceToken.line,
      column: interfaceToken.column
    };
  }

  private propertySignature(): PropertySignature {
    let keyName: Token;
    if (this.check(TokenType.IDENTIFIER)) {
      keyName = this.advance();
    } else if (this.matchBuiltinIdentifier()) {
      keyName = this.previous();
    } else {
      throw new Error(`Expected property name at line ${this.peek().line}, column ${this.peek().column}`);
    }
    
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
        column: keyName.column
      },
      typeAnnotation,
      optional: optional || false,
      line: keyName.line,
      column: keyName.column
    };
  }

  private classDeclaration(): any {
    const classToken = this.previous();
    
    // Class name
    let nameToken: any;
    if (this.check(TokenType.IDENTIFIER)) {
      nameToken = this.advance();
    } else if (this.matchBuiltinIdentifier()) {
      nameToken = this.previous();
    } else {
      throw new Error(`Expected class name at line ${this.peek().line}, column ${this.peek().column}`);
    }
    
    // Optional extends clause
    let superClassToken: any = undefined;
    if (this.match(TokenType.МЕРОС)) {
      if (this.check(TokenType.IDENTIFIER)) {
        superClassToken = this.advance();
      } else if (this.matchBuiltinIdentifier()) {
        superClassToken = this.previous();
      } else {
        throw new Error(`Expected superclass name after 'мерос' at line ${this.peek().line}, column ${this.peek().column}`);
      }
    }
    
    // Optional implements clause
    const implementsTokens: any[] = [];
    if (this.match(TokenType.ТАТБИҚ)) {
      do {
        if (this.check(TokenType.IDENTIFIER)) {
          implementsTokens.push(this.advance());
        } else if (this.matchBuiltinIdentifier()) {
          implementsTokens.push(this.previous());
        } else {
          throw new Error(`Expected interface name in implements clause at line ${this.peek().line}, column ${this.peek().column}`);
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
        column: nameToken.column
      },
      superClass: superClassToken ? {
        type: 'Identifier',
        name: superClassToken.value,
        line: superClassToken.line,
        column: superClassToken.column
      } : undefined,
      implements: implementsTokens.map(impl => ({
        type: 'Identifier',
        name: impl.value,
        line: impl.line,
        column: impl.column
      })),
      body: body,
      line: classToken.line,
      column: classToken.column
    };
  }

  private classBody(): any {
    const members: any[] = [];
    
    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      // Skip newlines
      if (this.match(TokenType.NEWLINE)) {
        continue;
      }
      
      // Parse class member
      const member = this.classMember();
      if (member) {
        members.push(member);
      }
    }
    
    return {
      type: 'ClassBody',
      body: members,
      line: this.peek().line,
      column: this.peek().column
    };
  }

  private classMember(): any {
    // Check for access modifiers
    let accessibility: string | undefined = undefined;
    if (this.match(TokenType.ҶАМЪИЯТӢ, TokenType.ХОСУСӢ, TokenType.МУҲОФИЗАТШУДА)) {
      const accessToken = this.previous();
      accessibility = accessToken.type === TokenType.ҶАМЪИЯТӢ ? 'public' :
                     accessToken.type === TokenType.ХОСУСӢ ? 'private' : 'protected';
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
      throw new Error(`Expected class member at line ${this.peek().line}, column ${this.peek().column}`);
    }
    
    if (this.check(TokenType.LEFT_PAREN)) {
      // Method
      return this.classMethod(nameToken, accessibility, isStatic, isAbstract);
    } else {
      // Property
      return this.classProperty(nameToken, accessibility, isStatic);
    }
  }

  private constructorMethod(accessibility?: string, isStatic?: boolean): any {
    const constructorToken = this.previous();
    
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
        column: constructorToken.column
      },
      value: {
        type: 'FunctionExpression',
        params: params,
        body: body,
        line: constructorToken.line,
        column: constructorToken.column
      },
      kind: 'constructor',
      static: isStatic || false,
      accessibility: accessibility,
      line: constructorToken.line,
      column: constructorToken.column
    };
  }

  private classMethod(nameToken: any, accessibility?: string, isStatic?: boolean, isAbstract?: boolean): any {
    this.consume(TokenType.LEFT_PAREN, "Expected '(' after method name");
    
    const params: Parameter[] = [];
    if (!this.check(TokenType.RIGHT_PAREN)) {
      do {
        const param = this.parseParameter();
        params.push(param);
      } while (this.match(TokenType.COMMA));
    }
    
    this.consume(TokenType.RIGHT_PAREN, "Expected ')' after method parameters");
    
    // Optional return type
    let returnType = undefined;
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
        column: nameToken.column
      },
      value: {
        type: 'FunctionExpression',
        params: params,
        body: body,
        returnType: returnType,
        line: nameToken.line,
        column: nameToken.column
      },
      kind: 'method',
      static: isStatic || false,
      accessibility: accessibility,
      abstract: isAbstract || false,
      line: nameToken.line,
      column: nameToken.column
    };
  }

  private classProperty(nameToken: any, accessibility?: string, isStatic?: boolean): any {
    // Optional type annotation
    let typeAnnotation = undefined;
    if (this.match(TokenType.COLON)) {
      typeAnnotation = this.typeAnnotation();
    }
    
    // Optional initializer
    let value = undefined;
    if (this.match(TokenType.ASSIGN)) {
      value = this.expression();
    }
    
    this.consume(TokenType.SEMICOLON, "Expected ';' after property declaration");
    
    return {
      type: 'PropertyDefinition',
      key: {
        type: 'Identifier',
        name: nameToken.value,
        line: nameToken.line,
        column: nameToken.column
      },
      value: value,
      typeAnnotation: typeAnnotation,
      static: isStatic || false,
      accessibility: accessibility,
      line: nameToken.line,
      column: nameToken.column
    };
  }

  private typeAlias(): TypeAlias {
    const typeToken = this.previous();
    
    const name = this.consume(TokenType.IDENTIFIER, "Expected type alias name");
    
    this.consume(TokenType.ASSIGN, "Expected '=' after type alias name");
    
    const typeAnnotation = this.typeAnnotation();
    
    this.consume(TokenType.SEMICOLON, "Expected ';' after type alias");
    
    return {
      type: 'TypeAlias',
      name: {
        type: 'Identifier',
        name: name.value,
        line: name.line,
        column: name.column
      },
      typeAnnotation,
      line: typeToken.line,
      column: typeToken.column
    };
  }

  // eslint-disable-next-line complexity
  private switchStatement(): any {
    const switchToken = this.previous();
    
    this.consume(TokenType.LEFT_PAREN, "Expected '(' after 'интихоб'");
    const discriminant = this.expression();
    this.consume(TokenType.RIGHT_PAREN, "Expected ')' after switch expression");
    
    this.consume(TokenType.LEFT_BRACE, "Expected '{' after switch expression");
    
    const cases: any[] = [];
    
    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      if (this.match(TokenType.NEWLINE)) {
        continue;
      }
      
      if (this.match(TokenType.ҲОЛАТ)) {
        const caseValue = this.expression();
        this.consume(TokenType.COLON, "Expected ':' after case value");
        
        const consequent: any[] = [];
        while (!this.check(TokenType.ҲОЛАТ) && !this.check(TokenType.ПЕШФАРЗ) && 
               !this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
          if (this.match(TokenType.NEWLINE)) {
            continue;
          }
          const stmt = this.statement();
          if (stmt) {
            consequent.push(stmt);
          }
        }
        
        cases.push({
          type: 'SwitchCase',
          test: caseValue,
          consequent: consequent,
          line: this.previous().line,
          column: this.previous().column
        });
      } else if (this.match(TokenType.ПЕШФАРЗ)) {
        this.consume(TokenType.COLON, "Expected ':' after 'пешфарз'");
        
        const consequent: any[] = [];
        while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
          if (this.match(TokenType.NEWLINE)) {
            continue;
          }
          const stmt = this.statement();
          if (stmt) {
            consequent.push(stmt);
          }
        }
        
        cases.push({
          type: 'SwitchCase',
          test: null, // default case
          consequent: consequent,
          line: this.previous().line,
          column: this.previous().column
        });
      } else {
        throw new Error(`Expected 'ҳолат' or 'пешфарз' in switch statement at line ${this.peek().line}`);
      }
    }
    
    this.consume(TokenType.RIGHT_BRACE, "Expected '}' after switch cases");
    
    return {
      type: 'SwitchStatement',
      discriminant: discriminant,
      cases: cases,
      line: switchToken.line,
      column: switchToken.column
    };
  }
  
  private breakStatement(): any {
    const breakToken = this.previous();
    this.consume(TokenType.SEMICOLON, "Expected ';' after 'шикастан'");
    
    return {
      type: 'BreakStatement',
      line: breakToken.line,
      column: breakToken.column
    };
  }
  
  private continueStatement(): any {
    const continueToken = this.previous();
    this.consume(TokenType.SEMICOLON, "Expected ';' after 'давом'");
    
    return {
      type: 'ContinueStatement',
      line: continueToken.line,
      column: continueToken.column
    };
  }

  // Pattern parsing methods
  private parsePattern(): Identifier | ArrayPattern | ObjectPattern {
    if (this.check(TokenType.LEFT_BRACKET)) {
      return this.parseArrayPattern();
    } else if (this.check(TokenType.LEFT_BRACE)) {
      return this.parseObjectPattern();
    } else {
      // Regular identifier
      let name: Token;
      if (this.check(TokenType.IDENTIFIER)) {
        name = this.advance();
      } else if (this.matchBuiltinIdentifier()) {
        name = this.previous();
      } else {
        throw new Error(`Expected identifier at line ${this.peek().line}, column ${this.peek().column}`);
      }
      
      return {
        type: 'Identifier',
        name: name.value,
        line: name.line,
        column: name.column
      };
    }
  }
  
  private parseArrayPattern(): ArrayPattern {
    const leftBracket = this.consume(TokenType.LEFT_BRACKET, "Expected '['");
    const elements: (Identifier | ArrayPattern | ObjectPattern | SpreadElement | null)[] = [];
    
    if (!this.check(TokenType.RIGHT_BRACKET)) {
      do {
        if (this.check(TokenType.COMMA)) {
          // Hole in array pattern
          elements.push(null);
        } else if (this.check(TokenType.SPREAD)) {
          elements.push(this.parseSpreadElement());
        } else {
          elements.push(this.parsePattern());
        }
      } while (this.match(TokenType.COMMA));
    }
    
    this.consume(TokenType.RIGHT_BRACKET, "Expected ']'");
    
    return {
      type: 'ArrayPattern',
      elements,
      line: leftBracket.line,
      column: leftBracket.column
    };
  }
  
  private parseObjectPattern(): ObjectPattern {
    const leftBrace = this.consume(TokenType.LEFT_BRACE, "Expected '{'");
    const properties: (PropertyPattern | SpreadElement)[] = [];
    
    if (!this.check(TokenType.RIGHT_BRACE)) {
      do {
        if (this.check(TokenType.SPREAD)) {
          properties.push(this.parseSpreadElement());
        } else {
          properties.push(this.parsePropertyPattern());
        }
      } while (this.match(TokenType.COMMA));
    }
    
    this.consume(TokenType.RIGHT_BRACE, "Expected '}'");
    
    return {
      type: 'ObjectPattern',
      properties,
      line: leftBrace.line,
      column: leftBrace.column
    };
  }
  
  private parsePropertyPattern(): PropertyPattern {
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
        column: keyToken.column
      };
    }
    
    let value: Identifier | ArrayPattern | ObjectPattern;
    if (this.match(TokenType.COLON)) {
      value = this.parsePattern();
    } else {
      // Shorthand property
      if (key.type !== 'Identifier') {
        throw new Error("Shorthand property must be an identifier");
      }
      value = key as Identifier;
    }
    
    return {
      type: 'PropertyPattern',
      key,
      value,
      computed,
      line: key.line,
      column: key.column
    };
  }
  
  private parseSpreadElement(): SpreadElement {
    const spreadToken = this.consume(TokenType.SPREAD, "Expected '...'");
    const argument = this.expression();
    
    return {
      type: 'SpreadElement',
      argument,
      line: spreadToken.line,
      column: spreadToken.column
    };
  }

  // eslint-disable-next-line complexity
  private synchronize(): void {
    this.advance();
    
    while (!this.isAtEnd()) {
      if (this.previous().type === TokenType.SEMICOLON) return;
      
      switch (this.peek().type) {
        case TokenType.СИНФ:
        case TokenType.ФУНКСИЯ:
        case TokenType.ТАҒЙИРЁБАНДА:
        case TokenType.БАРОИ:
        case TokenType.АГАР:
        case TokenType.ТО:
        case TokenType.БОЗГАШТ:
        case TokenType.ВОРИД:
        case TokenType.СОДИР:
        case TokenType.КӮШИШ:
        case TokenType.ПАРТОФТАН:
        case TokenType.ИНТЕРФЕЙС:
        case TokenType.НАВЪ:
        case TokenType.ИНТИХОБ:
          return;
      }
      
      this.advance();
    }
  }
}
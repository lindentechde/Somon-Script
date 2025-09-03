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
  ExportSpecifier,
  ArrayExpression,
  TypeAnnotation,
  TypeNode,
  PrimitiveType,
  ArrayType,
  UnionType,
  GenericType,
  InterfaceDeclaration,
  InterfaceBody,
  PropertySignature,
  TypeParameter,
  TypeAlias,
  Parameter
} from './types';

export class Parser {
  private tokens: Token[];
  private current: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parse(): Program {
    const body: Statement[] = [];
    
    while (!this.isAtEnd()) {
      const stmt = this.statement();
      if (stmt) {
        body.push(stmt);
      }
    }
    
    return {
      type: 'Program',
      body,
      line: 1,
      column: 1
    };
  }

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
      
      if (this.match(TokenType.ТАҒЙИРЁБАНДА, TokenType.СОБИТ)) {
        return this.variableDeclaration();
      }
      
      if (this.match(TokenType.ҲАМЗАМОН)) {
        // Handle async function
        this.consume(TokenType.ФУНКСИЯ, "Expected 'функсия' after 'ҳамзамон'");
        const func = this.functionDeclaration();
        // Mark as async (we'll handle this in codegen)
        (func as any).async = true;
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
      
      if (this.match(TokenType.БОЗГАШТ)) {
        return this.returnStatement();
      }
      
      if (this.match(TokenType.LEFT_BRACE)) {
        return this.blockStatement();
      }
      
      return this.expressionStatement();
    } catch (error) {
      this.synchronize();
      throw error;
    }
  }

  private variableDeclaration(): VariableDeclaration {
    const kindToken = this.previous();
    const kind = kindToken.type === TokenType.ТАҒЙИРЁБАНДА ? 'ТАҒЙИРЁБАНДА' : 'СОБИТ';
    
    let name: Token;
    if (this.check(TokenType.IDENTIFIER)) {
      name = this.advance();
    } else if (this.matchBuiltinIdentifier()) {
      name = this.previous();
    } else {
      throw new Error(`Expected variable name at line ${this.peek().line}, column ${this.peek().column}`);
    }
    const identifier: Identifier = {
      type: 'Identifier',
      name: name.value,
      line: name.line,
      column: name.column
    };
    
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
      } as any;
    }
    
    if (this.match(TokenType.НАВ)) {
      const newToken = this.previous();
      const callee = this.primary();
      
      // Check if there are arguments
      let args: Expression[] = [];
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
      } as any;
    }
    
    return this.call();
  }

  private call(): Expression {
    let expr = this.primary();
    
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
    throw new Error(`${message}. Got '${token.value}' at line ${token.line}, column ${token.column}`);
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
      TokenType.САТР_ОБЪЕКТ, TokenType.ДАРОЗИИ_САТР, TokenType.ПАЙВАСТАН, TokenType.ҶОЙИВАЗКУНӢ, TokenType.ҶУДОКУНӢ,
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
        elements.push(this.expression());
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

  private tryStatement(): any {
    const tryToken = this.previous();
    
    // Consume the opening brace for try block
    this.consume(TokenType.LEFT_BRACE, "Expected '{' after 'кӯшиш'");
    const block = this.blockStatement();
    
    let handler: any = undefined;
    if (this.match(TokenType.ГИРИФТАН)) {
      this.consume(TokenType.LEFT_PAREN, "Expected '(' after 'гирифтан'");
      let param: any = undefined;
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
    
    let finalizer: any = undefined;
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

  private throwStatement(): any {
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
    
    while (this.match(TokenType.OR)) {
      const types = [type];
      do {
        types.push(this.primaryType());
      } while (this.match(TokenType.OR));
      
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
    // Primitive types
    if (this.match(TokenType.САТР, TokenType.РАҚАМ, TokenType.МАНТИҚӢ)) {
      const token = this.previous();
      const primitiveType: PrimitiveType = {
        type: 'PrimitiveType',
        name: token.value as 'сатр' | 'рақам' | 'мантиқӣ',
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
          return;
      }
      
      this.advance();
    }
  }
}
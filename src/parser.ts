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
  ArrayExpression
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
      
      if (this.match(TokenType.ТАҒЙИРЁБАНДА, TokenType.СОБИТ)) {
        return this.variableDeclaration();
      }
      
      if (this.match(TokenType.ФУНКСИЯ)) {
        return this.functionDeclaration();
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
    
    let init: Expression | undefined;
    if (this.match(TokenType.ASSIGN)) {
      init = this.expression();
    }
    
    this.consume(TokenType.SEMICOLON, "Expected ';' after variable declaration");
    
    return {
      type: 'VariableDeclaration',
      kind,
      identifier,
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
    
    const params: Identifier[] = [];
    if (!this.check(TokenType.RIGHT_PAREN)) {
      do {
        const param = this.consume(TokenType.IDENTIFIER, "Expected parameter name");
        params.push({
          type: 'Identifier',
          name: param.value,
          line: param.line,
          column: param.column
        });
      } while (this.match(TokenType.COMMA));
    }
    
    this.consume(TokenType.RIGHT_PAREN, "Expected ')' after parameters");
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
          local = this.consume(TokenType.IDENTIFIER, "Expected local name after 'чун'");
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
      TokenType.САТР, TokenType.ДАРОЗИИ_САТР, TokenType.ПАЙВАСТАН, TokenType.ҶОЙИВАЗКУНӢ, TokenType.ҶУДОКУНӢ,
      TokenType.ОБЪЕКТ, TokenType.КАЛИДҲО, TokenType.ҚИМАТҲО,
      TokenType.МАТЕМАТИКА, TokenType.ҶАМЪ, TokenType.ТАРҲ, TokenType.ЗАРБ, TokenType.ТАҚСИМ
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
          return;
      }
      
      this.advance();
    }
  }
}
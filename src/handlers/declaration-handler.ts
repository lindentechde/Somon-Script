import type { Parser } from '../parser';
import { TokenType, Statement, ClassDeclaration, FunctionDeclaration } from '../types';

export class DeclarationHandler {
  private readonly parser: Parser;

  constructor(parser: Parser) {
    this.parser = parser;
  }

  parseStatement(): Statement | null {
    if (this.parser.match(TokenType.ИНТЕРФЕЙС)) {
      return this.parser.interfaceDeclaration();
    }

    if (this.parser.match(TokenType.НАВЪ)) {
      return this.parser.typeAlias();
    }

    if (this.parser.match(TokenType.МАВҲУМ)) {
      this.parser.consume(TokenType.СИНФ, "Expected 'синф' after 'мавҳум'");
      const classDecl = this.parser.classDeclaration();
      (classDecl as ClassDeclaration & { abstract?: boolean }).abstract = true;
      return classDecl;
    }

    if (this.parser.match(TokenType.СИНФ)) {
      return this.parser.classDeclaration();
    }

    if (this.parser.match(TokenType.ТАҒЙИРЁБАНДА, TokenType.СОБИТ)) {
      return this.parser.variableDeclaration();
    }

    if (this.parser.match(TokenType.ҲАМЗАМОН)) {
      this.parser.consume(TokenType.ФУНКСИЯ, "Expected 'функсия' after 'ҳамзамон'");
      const func = this.parser.functionDeclaration();
      (func as FunctionDeclaration & { async?: boolean }).async = true;
      return func;
    }

    if (this.parser.match(TokenType.ФУНКСИЯ)) {
      return this.parser.functionDeclaration();
    }

    return null;
  }
}

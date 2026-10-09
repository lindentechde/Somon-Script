import type { Parser } from '../parser';
import { TokenType, Statement, ClassDeclaration } from '../types';

export class DeclarationHandler {
  private readonly parser: Parser;

  constructor(parser: Parser) {
    this.parser = parser;
  }

  parseStatement(): Statement | null {
    if (this.parser.match(TokenType.НОМФАЗО)) {
      return this.parser.namespaceDeclaration();
    }

    if (this.parser.match(TokenType.ИНТЕРФЕЙС)) {
      return this.parser.interfaceDeclaration();
    }

    if (this.parser.match(TokenType.НАВЪ)) {
      return this.parser.typeAlias();
    }

    // `мавҳум синф`; `мавҳум` (or `abstract`) alone is a name
    if (this.parser.checkSequence(TokenType.МАВҲУМ, TokenType.СИНФ)) {
      this.parser.match(TokenType.МАВҲУМ);
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

    // `ҳамзамон () => …` is an expression; only `ҳамзамон функсия` declares
    if (this.parser.isAsyncFunctionStart()) {
      // 'ҳамзамон', or the word 'async'
      if (!this.parser.match(TokenType.ҲАМЗАМОН)) this.parser.match(TokenType.IDENTIFIER);
      this.parser.consume(TokenType.ФУНКСИЯ, "Expected 'функсия' after 'ҳамзамон'");
      const func = this.parser.functionDeclaration();
      func.async = true;
      return func;
    }

    if (this.parser.match(TokenType.ФУНКСИЯ)) {
      return this.parser.functionDeclaration();
    }

    return null;
  }
}

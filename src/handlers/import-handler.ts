import type { Parser } from '../parser';
import { TokenType, Statement } from '../types';

export class ImportHandler {
  private readonly parser: Parser;

  constructor(parser: Parser) {
    this.parser = parser;
  }

  parseStatement(): Statement | null {
    if (this.parser.match(TokenType.ВОРИД)) {
      return this.parser.importDeclaration();
    }
    if (this.parser.match(TokenType.СОДИР)) {
      return this.parser.exportDeclaration();
    }
    return null;
  }
}

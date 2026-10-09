import type { Parser } from '../parser';
import { TokenType, Statement } from '../types';

export class ImportHandler {
  private readonly parser: Parser;

  constructor(parser: Parser) {
    this.parser = parser;
  }

  parseStatement(): Statement | null {
    // `ворид(…)` (dynamic import) and `ворид.meta` start expression statements
    if (
      this.parser.checkSequence(TokenType.ВОРИД, TokenType.LEFT_PAREN) ||
      this.parser.checkSequence(TokenType.ВОРИД, TokenType.DOT)
    ) {
      return null;
    }
    if (this.parser.match(TokenType.ВОРИД)) {
      return this.parser.importDeclaration();
    }
    if (this.parser.match(TokenType.СОДИР)) {
      return this.parser.exportDeclaration();
    }
    return null;
  }
}

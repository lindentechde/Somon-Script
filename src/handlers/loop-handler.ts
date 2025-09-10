import type { Parser } from '../parser';
import { TokenType, Statement } from '../types';

export class LoopHandler {
  private parser: Parser;

  constructor(parser: Parser) {
    this.parser = parser;
  }

  parse(): Statement | null {
    if (this.parser.match(TokenType.ТО)) {
      return this.parser.whileStatement();
    }
    if (this.parser.match(TokenType.БАРОИ)) {
      return this.parser.forStatement();
    }
    return null;
  }
}

import { Lexer } from '../lexer';
import { TokenType, type Token } from '../tokens';
import type { TextDocument } from './text-document';

/** A lexer token with its offsets in the document text. */
export interface LocatedToken {
  type: TokenType;
  value: string;
  start: number;
  end: number;
  /** For `(` `[` `{`: index of the matching closing bracket; for closers, of the opener. */
  match?: number;
}

const OPENERS: ReadonlySet<TokenType> = new Set([
  TokenType.LEFT_PAREN,
  TokenType.LEFT_BRACKET,
  TokenType.LEFT_BRACE,
]);
const CLOSERS: ReadonlySet<TokenType> = new Set([
  TokenType.RIGHT_PAREN,
  TokenType.RIGHT_BRACKET,
  TokenType.RIGHT_BRACE,
]);

export interface TokenizeResult {
  tokens: LocatedToken[];
  /** The lexer's tokens, for the parser. */
  raw: Token[];
  /** The lexer's error, when the text could not be tokenized. */
  error?: Error;
}

/** Tokenizes a document and locates each token (line breaks and EOF dropped). */
export function tokenizeDocument(document: TextDocument): TokenizeResult {
  let raw: Token[];
  try {
    raw = new Lexer(document.text).tokenize();
  } catch (error) {
    return {
      tokens: [],
      raw: [],
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
  const tokens: LocatedToken[] = [];
  for (const token of raw) {
    if (token.type === TokenType.NEWLINE || token.type === TokenType.EOF) continue;
    const start = document.offsetFromCompiler(token.line, token.column);
    tokens.push({
      type: token.type,
      value: token.value,
      start,
      end: tokenEnd(document.text, token, start),
    });
  }
  matchBrackets(tokens);
  return { tokens, raw };
}

/** Offset just past a token's source text. */
function tokenEnd(text: string, token: Token, start: number): number {
  if (token.type === TokenType.STRING) return quotedEnd(text, start);
  if (token.type === TokenType.TEMPLATE_LITERAL) return start + token.value.length + 2;
  if (text.startsWith(token.value, start)) return start + token.value.length;
  if (token.type === TokenType.NUMBER) {
    // Numeric separators are dropped from the value: `1_000`
    const match = /^[\w.]+/u.exec(text.slice(start));
    return start + (match ? match[0].length : token.value.length);
  }
  return start + token.value.length;
}

/** End of the quoted string starting at `start` (escapes skipped). */
function quotedEnd(text: string, start: number): number {
  const quote = text[start];
  let i = start + 1;
  while (i < text.length && text[i] !== quote) i += text[i] === '\\' ? 2 : 1;
  return Math.min(i + 1, text.length);
}

function matchBrackets(tokens: LocatedToken[]): void {
  const stack: number[] = [];
  tokens.forEach((token, index) => {
    if (OPENERS.has(token.type)) {
      stack.push(index);
    } else if (CLOSERS.has(token.type) && stack.length > 0) {
      const open = stack.pop()!;
      tokens[open].match = index;
      token.match = open;
    }
  });
}

/** Index of the token starting at `offset`, or -1. */
export function tokenIndexAt(tokens: readonly LocatedToken[], offset: number): number {
  const index = firstTokenFrom(tokens, offset);
  return index < tokens.length && tokens[index].start === offset ? index : -1;
}

/** Index of the token covering `offset` (start ≤ offset ≤ end), or -1. */
export function tokenIndexCovering(tokens: readonly LocatedToken[], offset: number): number {
  const index = firstTokenFrom(tokens, offset + 1) - 1;
  return index >= 0 && tokens[index].end >= offset ? index : -1;
}

/** First index whose token starts at or after `offset` (`tokens.length` when none does). */
export function firstTokenFrom(tokens: readonly LocatedToken[], offset: number): number {
  let low = 0;
  let high = tokens.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (tokens[middle].start < offset) low = middle + 1;
    else high = middle;
  }
  return low;
}

/**
 * End offset of the statement or expression starting at token `index`: up to
 * a `;` or `,` at its own bracket depth (included for `;`), or the closing
 * bracket of an enclosing group (excluded).
 */
export function extentEnd(tokens: readonly LocatedToken[], index: number): number {
  let i = index;
  while (i < tokens.length) {
    const token = tokens[i];
    if (OPENERS.has(token.type)) {
      if (token.match === undefined) return tokens[tokens.length - 1].end;
      i = token.match + 1;
      continue;
    }
    if (CLOSERS.has(token.type) || token.type === TokenType.COMMA) {
      return i > index ? tokens[i - 1].end : token.start;
    }
    if (token.type === TokenType.SEMICOLON) return token.end;
    i++;
  }
  return tokens.length > 0 ? tokens[tokens.length - 1].end : 0;
}

/** End offset of the first `{ … }` group at or after token `index` (same depth). */
export function braceGroupEnd(tokens: readonly LocatedToken[], index: number): number | undefined {
  let i = index;
  while (i < tokens.length) {
    const token = tokens[i];
    if (token.type === TokenType.LEFT_BRACE) {
      return token.match === undefined ? tokens[tokens.length - 1].end : tokens[token.match].end;
    }
    if (token.type === TokenType.SEMICOLON || CLOSERS.has(token.type)) return undefined;
    const groupEnd =
      token.type === TokenType.LEFT_PAREN || token.type === TokenType.LEFT_BRACKET
        ? token.match
        : undefined;
    i = groupEnd === undefined ? i + 1 : groupEnd + 1;
  }
  return undefined;
}

/** Whether a token is a name or a keyword (the lexer reads some built-in names as keywords). */
export function isWordToken(token: LocatedToken): boolean {
  return (
    token.type !== TokenType.STRING &&
    token.type !== TokenType.TEMPLATE_LITERAL &&
    /^[\p{ID_Start}$_]/u.test(token.value)
  );
}

/** Index of the name or keyword token under the cursor at `offset`, or -1. */
export function wordTokenAt(tokens: readonly LocatedToken[], offset: number): number {
  const index = tokenIndexCovering(tokens, offset);
  if (index === -1) return -1;
  if (isWordToken(tokens[index])) return index;
  // Just after a name (`х|:`): the name the cursor touches
  const previous = tokens[index - 1];
  return previous && previous.end === offset && isWordToken(previous) ? index - 1 : -1;
}

/** Whether the token at `index` follows a `.` or `?.` (a member name). */
export function isMemberName(tokens: readonly LocatedToken[], index: number): boolean {
  const previous = tokens[index - 1];
  return (
    previous !== undefined &&
    (previous.type === TokenType.DOT || previous.type === TokenType.OPTIONAL_CHAINING)
  );
}

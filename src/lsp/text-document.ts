import type { Position, Range } from './protocol';

/**
 * A text document as the editor sees it, with conversions between offsets,
 * LSP positions (zero-based, UTF-16 columns) and the compiler's positions
 * (one-based lines and columns, columns counted in code points, a leading
 * byte order mark not counted).
 */
export class TextDocument {
  private readonly lineStarts: number[];
  /** UTF-16 length of the byte order mark the lexer strips (0 or 1). */
  private readonly bomLength: number;

  readonly uri: string;
  readonly text: string;
  readonly version: number;
  readonly languageId: string;

  constructor(uri: string, text: string, version = 0, languageId = 'somonscript') {
    this.uri = uri;
    this.text = text;
    this.version = version;
    this.languageId = languageId;
    this.lineStarts = computeLineStarts(text);
    this.bomLength = text.startsWith('\uFEFF') ? 1 : 0;
  }

  get lineCount(): number {
    return this.lineStarts.length;
  }

  /** The text of a zero-based line without its line break. */
  lineText(line: number): string {
    if (line < 0 || line >= this.lineStarts.length) return '';
    const start = this.lineStarts[line];
    const end = line + 1 < this.lineStarts.length ? this.lineStarts[line + 1] : this.text.length;
    return this.text.slice(start, end).replace(/\r?\n$|\r$/, '');
  }

  offsetAt(position: Position): number {
    if (position.line < 0) return 0;
    if (position.line >= this.lineStarts.length) return this.text.length;
    const start = this.lineStarts[position.line];
    const lineLength = this.lineText(position.line).length;
    return start + Math.max(0, Math.min(position.character, lineLength));
  }

  positionAt(offset: number): Position {
    const clamped = Math.max(0, Math.min(offset, this.text.length));
    let low = 0;
    let high = this.lineStarts.length - 1;
    while (low < high) {
      const middle = Math.ceil((low + high) / 2);
      if (this.lineStarts[middle] <= clamped) low = middle;
      else high = middle - 1;
    }
    return { line: low, character: clamped - this.lineStarts[low] };
  }

  /** LSP position of a compiler position (one-based line, column in code points). */
  positionFromCompiler(line: number, column: number): Position {
    const zeroLine = Math.max(0, Math.min(line - 1, this.lineStarts.length - 1));
    const text = this.lineText(zeroLine);
    let character = zeroLine === 0 ? this.bomLength : 0;
    for (let remaining = Math.max(0, column - 1); remaining > 0 && character < text.length; ) {
      const code = text.codePointAt(character) ?? 0;
      character += code > 0xffff ? 2 : 1;
      remaining--;
    }
    return { line: zeroLine, character };
  }

  offsetFromCompiler(line: number, column: number): number {
    return this.offsetAt(this.positionFromCompiler(line, column));
  }

  rangeFromOffsets(start: number, end: number): Range {
    return { start: this.positionAt(start), end: this.positionAt(end) };
  }
}

/** Offsets where each line starts; a line ends at `\n`, `\r\n` or a lone `\r`. */
function computeLineStarts(text: string): number[] {
  const starts = [0];
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '\r') {
      if (text[i + 1] === '\n') i++;
      starts.push(i + 1);
    } else if (char === '\n') {
      starts.push(i + 1);
    }
  }
  return starts;
}

/** Whether a character continues a SomonScript identifier. */
export function isIdentifierChar(char: string | undefined): boolean {
  return char !== undefined && /[\p{ID_Continue}$‌‍]/u.test(char);
}

/** Offsets [start, end) of the identifier or keyword around `offset`, if any. */
export function wordRangeAt(text: string, offset: number): [number, number] | undefined {
  let start = offset;
  while (start > 0 && isIdentifierChar(text[start - 1])) start--;
  let end = offset;
  while (end < text.length && isIdentifierChar(text[end])) end++;
  if (start === end) return undefined;
  return [start, end];
}

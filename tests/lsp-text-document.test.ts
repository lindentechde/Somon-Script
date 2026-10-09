import { TextDocument, isIdentifierChar, wordRangeAt } from '../src/lsp/text-document';

describe('LSP text documents', () => {
  test('lines end at LF, CRLF and a lone CR', () => {
    const document = new TextDocument('file:///а.som', 'а\nб\r\nв\rг');
    expect(document.lineCount).toBe(4);
    expect([0, 1, 2, 3].map(line => document.lineText(line))).toEqual(['а', 'б', 'в', 'г']);
    expect(document.lineText(-1)).toBe('');
    expect(document.lineText(9)).toBe('');
  });

  test('converts between offsets and positions', () => {
    const text = 'тағ х = 1;\r\nчоп.сабт(х);\n';
    const document = new TextDocument('file:///а.som', text, 3, 'somonscript');
    expect(document.version).toBe(3);
    expect(document.languageId).toBe('somonscript');
    const offset = text.indexOf('сабт');
    expect(document.positionAt(offset)).toEqual({ line: 1, character: 4 });
    expect(document.offsetAt({ line: 1, character: 4 })).toBe(offset);
    // Out-of-range positions are clamped
    expect(document.offsetAt({ line: 0, character: 99 })).toBe('тағ х = 1;'.length);
    expect(document.offsetAt({ line: -1, character: 0 })).toBe(0);
    expect(document.offsetAt({ line: 50, character: 0 })).toBe(text.length);
    expect(document.positionAt(-5)).toEqual({ line: 0, character: 0 });
    expect(document.positionAt(text.length + 5)).toEqual({ line: 2, character: 0 });
    expect(document.rangeFromOffsets(0, 3)).toEqual({
      start: { line: 0, character: 0 },
      end: { line: 0, character: 3 },
    });
  });

  test('compiler columns count code points; LSP columns count UTF-16 units', () => {
    // '😀' is one code point but two UTF-16 code units
    const document = new TextDocument('file:///а.som', 'тағ а = "😀"; тағ б = 1;');
    const compilerColumnOfB = 'тағ а = "😀"; тағ '.length; // code points before 'б', minus one
    expect(document.positionFromCompiler(1, compilerColumnOfB)).toEqual({
      line: 0,
      character: 'тағ а = "😀"; тағ '.length,
    });
    expect(document.positionFromCompiler(1, 1)).toEqual({ line: 0, character: 0 });
    // Positions beyond the text are clamped to its lines
    expect(document.positionFromCompiler(9, 1)).toEqual({ line: 0, character: 0 });
  });

  test('a byte order mark is not counted in compiler columns', () => {
    const document = new TextDocument('file:///а.som', '﻿тағ х = 1;\nх;');
    expect(document.offsetFromCompiler(1, 5)).toBe(5); // 'х' after the BOM
    expect(document.offsetFromCompiler(2, 1)).toBe('﻿тағ х = 1;\n'.length);
  });

  test('finds the word around an offset', () => {
    const text = 'чоп.сабт(ном_1);';
    expect(wordRangeAt(text, 0)).toEqual([0, 3]);
    expect(wordRangeAt(text, 6)).toEqual([4, 8]);
    expect(wordRangeAt(text, 11)).toEqual([9, 14]);
    expect(wordRangeAt(text, text.length)).toBeUndefined();
    expect(isIdentifierChar('ҳ')).toBe(true);
    expect(isIdentifierChar('$')).toBe(true);
    expect(isIdentifierChar('.')).toBe(false);
    expect(isIdentifierChar(undefined)).toBe(false);
  });
});

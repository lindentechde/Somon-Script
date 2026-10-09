import { Lexer } from '../src/lexer';
import { Parser } from '../src/parser';
import { TokenType } from '../src/tokens';

/** Tools that reproduce the source (the formatter) read comments and offsets from the lexer. */
describe('Lexer comment mode', () => {
  test('keeps comments as tokens with source offsets', () => {
    const source = 'тағ а = 1; // як\n/* ду */ а';
    const tokens = new Lexer(source, { comments: true }).tokenize();
    const comments = tokens.filter(token => token.type === TokenType.COMMENT);
    expect(comments.map(token => token.value)).toEqual(['// як', '/* ду */']);
    expect(source.slice(comments[1].start, comments[1].end)).toBe('/* ду */');
    expect(comments[1]).toMatchObject({ line: 2, column: 1 });
  });

  test('gives every token its source text through the offsets', () => {
    const source = 'собит с = "а\\"б" + `х${1}` + 1_000 + /р+/g.source;';
    const tokens = new Lexer(source, { comments: true }).tokenize();
    const texts = tokens
      .filter(token => token.type !== TokenType.EOF)
      .map(token => source.slice(token.start, token.end));
    expect(texts).toEqual([
      'собит',
      'с',
      '=',
      '"а\\"б"',
      '+',
      '`х${1}`',
      '+',
      '1_000',
      '+',
      '/р+/g',
      '.',
      'source',
      ';',
    ]);
  });

  test('comments do not change how a "/" is read', () => {
    const source = 'тағ а = 4 /* шарҳ */ / 2 / 1;\nа = /* х */ /б/g;';
    const withComments = new Lexer(source, { comments: true })
      .tokenize()
      .filter(token => token.type !== TokenType.COMMENT)
      .map(({ type, value, line, column }) => ({ type, value, line, column }));
    expect(withComments).toEqual(new Lexer(source).tokenize());
  });

  test('the default mode neither emits comments nor offsets', () => {
    const tokens = new Lexer('а // шарҳ\n/* б */').tokenize();
    expect(tokens.some(token => token.type === TokenType.COMMENT)).toBe(false);
    expect(tokens[0]).toEqual({ type: TokenType.IDENTIFIER, value: 'а', line: 1, column: 1 });
  });

  test('reports unterminated block comments in comment mode too', () => {
    expect(() => new Lexer('а /* ', { comments: true }).tokenize()).toThrow(
      'Unterminated block comment'
    );
  });
});

describe('Parser.omittedSemicolons', () => {
  function omitted(source: string): string[] {
    const parser = new Parser(new Lexer(source).tokenize());
    parser.parse();
    expect(parser.getErrors()).toEqual([]);
    return parser.omittedSemicolons.map(
      entry => `${entry.before.value || 'EOF'}${entry.member ? ' (member)' : ''}`
    );
  }

  test('records statements, members, class fields and do-while without ";"', () => {
    expect(omitted('тағ а = 1\nа++')).toEqual(['а', 'EOF']);
    expect(omitted('интерфейс И { а: рақам\nб: сатр }')).toEqual(['б (member)', '} (member)']);
    expect(omitted('синф К { х = 1\nм() {} }')).toEqual(['м']);
    expect(omitted('кун { } то (дуруст)\nа()')).toEqual(['а', 'EOF']);
    expect(omitted('ф(1);')).toEqual([]);
  });

  test('a failed speculative parse leaves no entries behind', () => {
    expect(omitted('тағ а = б ? (в) : { г: 1 };')).toEqual([]);
  });
});

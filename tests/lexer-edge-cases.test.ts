/**
 * The lexer at the end of the input and inside template interpolations,
 * which it copies as text and scans for strings, comments and regular
 * expressions.
 */
import { compile } from '../src/compiler';
import { Lexer } from '../src/lexer';
import { TokenType } from '../src/types';

function lex(source: string): Array<[TokenType, string]> {
  return new Lexer(source)
    .tokenize()
    .filter(token => token.type !== TokenType.EOF)
    .map(token => [token.type, token.value]);
}

function lexError(source: string): string {
  try {
    new Lexer(source).tokenize();
  } catch (error) {
    return (error as Error).message;
  }
  throw new Error(`no error for ${source}`);
}

/** Compiles and runs a program; returns what it logged, one string per call. */
function run(source: string): string[] {
  const result = compile(source);
  expect(result.errors).toEqual([]);
  const lines: string[] = [];
  const log = (...args: unknown[]) => lines.push(args.map(String).join(' '));
  new Function('console', result.code)({ log });
  return lines;
}

describe('Lexer: input that ends too early', () => {
  test.each([
    ['a string ending with a backslash', 'тағ с = "а\\', 'Unterminated string at line 1, column 9'],
    [
      'a template ending with a backslash',
      'тағ с = `а\\',
      'Unterminated template literal at line 1, column 9',
    ],
    [
      'an interpolation that is not closed',
      'тағ с = `${а',
      'Unterminated template literal at line 1, column 9',
    ],
    [
      'a string in an interpolation ending with a backslash',
      'тағ с = `${"а\\',
      'Unterminated template literal at line 1, column 9',
    ],
    ['a `#` that names nothing', 'тағ х = 1; #', "Unexpected character '#' at line 1, column 12"],
  ])('%s', (_name, source, message) => {
    expect(lexError(source)).toBe(message);
  });

  test('a `.` or `?.` at the very end is a token', () => {
    expect(lex('х.')).toEqual([
      [TokenType.IDENTIFIER, 'х'],
      [TokenType.DOT, '.'],
    ]);
    expect(lex('х?.')).toEqual([
      [TokenType.IDENTIFIER, 'х'],
      [TokenType.OPTIONAL_CHAINING, '?.'],
    ]);
    expect(compile('х.').errors).toEqual([
      "Parse error: Unexpected token end of input at line 1, column 3 (Expected property name after '.')",
    ]);
  });
});

describe('Lexer: template interpolations', () => {
  test('escaped quotes in a string inside an interpolation', () => {
    const source = 'чоп.сабт(`${"а\\"б" + \'в\\\'г\'}`);';
    expect(lex(source)[4]).toEqual([TokenType.TEMPLATE_LITERAL, '${"а\\"б" + \'в\\\'г\'}']);
    expect(run(source)).toEqual(['а"бв\'г']);
  });

  test('a `/` that starts an interpolation is a regular expression', () => {
    expect(run('чоп.сабт(`${/а+}/.test("ааа")}`);')).toEqual(['false']);
    expect(run('чоп.сабт(`${ /а+/.test("ааа")}`);')).toEqual(['true']);
  });

  test('a regular expression ending in `*` is no block comment', () => {
    // `/а*/` ends with `*/`, but there is no `/*` before it: the next `/` divides
    expect(run('чоп.сабт(`${/а*/ / 1}`);')).toEqual(['NaN']);
  });

  test('a `}` in a line comment of an interpolation has no `{`', () => {
    expect(run('чоп.сабт(`${8 // }\n / 2}`);')).toEqual(['4']);
  });

  test('an object literal after an operator divides', () => {
    expect(run('чоп.сабт(`${1 + {} / 2}`);')).toEqual(['NaN']);
  });

  test('after `++` or `--` a `/` divides; after another `+` it starts a regular expression', () => {
    expect(run('тағ х = 4;\nчоп.сабт(`${х++ / 2} ${х-- / 1} ${"а" + /б}/.source}`);')).toEqual([
      '2 5 аб}',
    ]);
  });
});

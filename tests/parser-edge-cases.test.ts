/**
 * The parser on rarer input: invalid type parameter lists, destructuring
 * assignments, for-in/of heads, ambient declarations, import and export
 * lists, class members and object patterns that do not parse, and nesting
 * deep enough to exhaust the stack. Each case checks the syntax tree, the
 * error and its position, or the program's output.
 */
import { compile } from '../src/compiler';
import { Lexer } from '../src/lexer';
import { Parser } from '../src/parser';

/** The parser's errors for `source`. */
function errorsOf(source: string): string[] {
  const parser = new Parser(new Lexer(source).tokenize());
  parser.parse();
  return parser.getErrors();
}

/** Compiles and runs a program; returns what it logged. */
function run(source: string): string[] {
  const result = compile(source, { typeCheck: false });
  expect(result.errors).toEqual([]);
  const lines: string[] = [];
  new Function('console', result.code)({
    log: (...args: unknown[]) => lines.push(args.map(String).join(' ')),
  });
  return lines;
}

describe('parser: type parameter lists', () => {
  test('a list that does not parse is an error, not left out', () => {
    expect(errorsOf('функсия ф<1>() { бозгашт 2; }')).toEqual([
      'Expected type parameter name at line 1, column 11',
    ]);
    // TypeScript's TS1098: a type parameter list cannot be empty
    expect(errorsOf('функсия ф<>() {}')).toEqual([
      'Expected type parameter name at line 1, column 11',
    ]);
    expect(errorsOf('синф К { м<1>() {} }')).toEqual([
      'Expected type parameter name at line 1, column 12',
    ]);
    // Heritage type arguments too
    expect(errorsOf('синф А<Т> {}\nсинф Б мерос А<1 2> {}')).toEqual([
      "Unexpected token '2' at line 2, column 18 (Expected '>' after type parameters)",
    ]);
    // A trailing comma is allowed, and literal types are type arguments
    expect(errorsOf('функсия ф<Т,>() {}')).toEqual([]);
    expect(run('синф А<Т> { х = 1; }\nсинф Б мерос А<1> {}\nчоп.сабт(нав Б().х);')).toEqual(['1']);
  });
});

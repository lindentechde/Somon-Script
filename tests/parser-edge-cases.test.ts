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

describe('parser: the end of the input where an operand belongs', () => {
  test('is named as such, not as an empty token', () => {
    expect(errorsOf('тағ х =')).toEqual(['Unexpected token end of input at line 1, column 8']);
    // Also at the end of a template interpolation, on its own line
    expect(errorsOf('тағ с = `а${\n  1 +\n}`;')).toEqual([
      'Unexpected token end of input at line 3, column 1',
    ]);
  });
});

describe('parser: overloads of class methods', () => {
  test('computed, string, number and private names match their implementation', () => {
    expect(
      run(
        [
          'собит к = "а";',
          'синф К {',
          '  [к](): беджавоб;',
          '  [к](х?: ҳар) { чоп.сабт("к", х); }',
          '  "с"(): беджавоб;',
          '  "с"() { чоп.сабт("с"); }',
          '  1(): беджавоб;',
          '  1() { чоп.сабт("1"); }',
          '  #м(): беджавоб;',
          '  #м() { чоп.сабт("#м"); }',
          '  м() { ин.#м(); }',
          '}',
          'собит о = нав К();',
          'о[к](); о.с(); о[1](); о.м();',
        ].join('\n')
      )
    ).toEqual(['к undefined', 'с', '1', '#м']);
  });

  test('an overload whose implementation has another name is an error', () => {
    // TypeScript's TS2389: "Function implementation name must be '[к]'"
    expect(errorsOf('собит к = "а";\nсинф Л { [к](): беджавоб; [к + 1]() {} }')).toEqual([
      'Function implementation is missing or not immediately following the declaration at line 2, column 10',
    ]);
  });
});

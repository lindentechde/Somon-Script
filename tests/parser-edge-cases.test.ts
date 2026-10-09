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

describe('parser: `танҳохонӣ` types', () => {
  test('only an array or tuple type may be read-only, as in TypeScript', () => {
    // TypeScript's TS1354; `танҳохонӣ сатр` was accepted and meant `сатр`
    for (const type of ['сатр', 'Array<сатр>', 'Т']) {
      expect(errorsOf(`навъ Т = рақам[];\nтағ х: танҳохонӣ ${type};`)).toEqual([
        "'танҳохонӣ' type modifier is only permitted on array and tuple types at line 2, column 8",
      ]);
    }
    for (const type of ['сатр[]', '(сатр | рақам)[]', '[сатр, рақам]', 'рақам[][]']) {
      expect(errorsOf(`тағ х: танҳохонӣ ${type};`)).toEqual([]);
    }
    // A property named `танҳохонӣ`, and a read-only property, are no such types
    expect(errorsOf('навъ Т = { танҳохонӣ а: рақам; танҳохонӣ: сатр };')).toEqual([]);
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

describe('parser: an optional chain in a new expression', () => {
  test('after the constructor is an error, after its arguments it is not', () => {
    // JavaScript's SyntaxError, TypeScript's TS1209; it constructed `о` and failed at run time
    expect(errorsOf('собит о = { К: синф {} };\nтағ а = нав о?.К();')).toEqual([
      'Invalid optional chain from new expression at line 2, column 14',
    ]);
    expect(errorsOf('тағ а = нав о.б?.в;')).toEqual([
      'Invalid optional chain from new expression at line 1, column 16',
    ]);
    expect(errorsOf('тағ а = нав К?.();')).toEqual([
      'Invalid optional chain from new expression at line 1, column 14',
    ]);
    expect(errorsOf('тағ а = нав К<рақам>?.б();')).toEqual([
      'Invalid optional chain from new expression at line 1, column 21',
    ]);
    // An optional chain in parentheses is the constructor
    expect(
      run(
        'синф К { а = 1; }\nсобит о: { К?: нав () => К } = { К };\nчоп.сабт(нав К()?.а, нав (о?.К)!().а, нав (о?.К чун ҳар)().а);'
      )
    ).toEqual(['1 1 1']);
  });
});

describe('parser: shorthand defaults in destructuring assignments', () => {
  test('`{ а = 1 }` is a default in an assignment or for-of target', () => {
    // They were "Expected ':' after property key"
    const source = [
      'тағ а: рақам, б: рақам, в: рақам, г: сатр;',
      '({ а = 1, б } = { б: 2 });',
      '[{ в = 3 }, ...[{ а = 4 }]] = [{}, {}];',
      'чоп.сабт(а, б, в);',
      '({ к: { б = 5 } } = { к: {} });',
      'барои ({ г = "х" } аз [{}, { г: "у" }]) чоп.сабт(г, б);',
    ].join('\n');
    expect(run(source)).toEqual(['4 2 3', 'х 5', 'у 5']);
    for (const options of [{ strict: true }, { checker: 'typescript' as const, strict: true }]) {
      expect(compile(source, options).errors).toEqual([]);
    }
  });

  test('anywhere else it is an error, as in JavaScript and TypeScript', () => {
    const invalid = (at: string) =>
      `Invalid shorthand property initializer at ${at}: '=' may follow a property name only in a destructuring assignment`;
    expect(errorsOf('тағ а;\n({ а = 1 });')).toEqual([invalid('line 2, column 6')]);
    // The default of a target is an expression
    expect(errorsOf('тағ а;\n[а = { б = 1 }] = [];')).toEqual([invalid('line 2, column 10')]);
    expect(errorsOf('тағ ф = () => ({ а = 1 });')).toEqual([invalid('line 1, column 20')]);
    expect(errorsOf('тағ с = `${ ({ а = 1 }) }`;')).toEqual([invalid('line 1, column 18')]);
    expect(errorsOf('тағ а;\nбарои (({ а = 1 }); ; ) {}')).toEqual([invalid('line 2, column 13')]);
    // One statement's target does not take another's
    expect(errorsOf('тағ а;\n({ а = 1 } = {}); ({ а = 2 });')).toEqual([
      invalid('line 2, column 24'),
    ]);
    // A statement that does not parse has one error
    expect(errorsOf('тағ а;\n({ а = 1 } + );')).toEqual([
      "Unexpected token ')' at line 2, column 14",
    ]);
  });
});

describe('parser: named function expressions', () => {
  const source = [
    'собит факт = функсия ф(н: рақам): рақам {',
    '  бозгашт н <= 1 ? 1 : н * ф(н - 1);',
    '};',
    'собит ҳисоб = функсия* г() { ҳосил 1; ҳосил 2; };',
    'собит кор = ҳамзамон функсия к() { бозгашт 3; };',
    // The name is in an outer scope of the body: a body may declare it again
    'собит б = функсия ф() { тағ ф = 4; бозгашт ф; };',
    'чоп.сабт(факт(5), [...ҳисоб()].length, б(), навъи кор());',
  ].join('\n');

  test('name the function in its body', () => {
    // It was "Expected '(' after 'функсия'"
    expect(errorsOf(source)).toEqual([]);
    expect(run(source)).toEqual(['120 2 4 object']);
    for (const options of [{ strict: true }, { checker: 'typescript' as const, strict: true }]) {
      expect(compile(source, options).errors).toEqual([]);
    }
    // In the body the name hides a built-in of that name; outside it does not
    expect(
      run(
        'собит ф = функсия математика() { бозгашт навъи математика; };\nчоп.сабт(ф(), навъи математика.PI);'
      )
    ).toEqual(['function number']);
  });

  test('only in its body', () => {
    const outside = 'собит а = функсия ф() { бозгашт 1; };\nчоп.сабт(ф);';
    expect(compile(outside).errors).toEqual([
      "Type error [UNDEFINED_IDENTIFIER] at line 2, column 10: Variable 'ф' is not defined\n> чоп.сабт(ф);",
    ]);
    expect(compile(outside, { checker: 'typescript' }).errors).toEqual([
      "Type error [TS2304] at line 2, column 10: Cannot find name 'ф'.\n> чоп.сабт(ф);",
    ]);
  });
});

describe('parser: default imports', () => {
  test('bind any name a variable may have, built-in member aliases too', () => {
    for (const name of ['маълумот', 'рӯйхат', 'навъ', 'беқимат']) {
      const parser = new Parser(new Lexer(`ворид ${name}, { а } аз "./м";`).tokenize());
      const [declaration] = parser.parse().body as any[];
      expect(parser.getErrors()).toEqual([]);
      expect(declaration.specifiers.map((s: any) => [s.type, s.local.name])).toEqual([
        ['ImportDefaultSpecifier', name],
        ['ImportSpecifier', 'а'],
      ]);
    }
    expect(
      compile('ворид маълумот аз "./д";\nчоп.сабт(маълумот);', { typeCheck: false }).code
    ).toContain('const маълумот = __somon_import_0.default ?? __somon_import_0;');
  });
});

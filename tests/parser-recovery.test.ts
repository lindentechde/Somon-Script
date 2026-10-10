/**
 * The parser's errors and their positions on input that does not parse, its
 * recovery after them, nesting deep enough to exhaust the stack, rarer valid
 * programs (run), and template tokens from producers other than the lexer.
 */
import type { ExpressionStatement, Identifier, TemplateLiteral } from '../src/ast';
import { compile } from '../src/compiler';
import { Lexer } from '../src/lexer';
import { Parser } from '../src/parser';
import { TokenType } from '../src/types';

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
  const module = { exports: {} };
  new Function('console', 'require', 'module', 'exports', result.code)(
    { log: (...args: unknown[]) => lines.push(args.map(String).join(' ')) },
    require,
    module,
    module.exports
  );
  return lines;
}

const CATCH_TYPE =
  "Catch clause variable type annotation must be 'ҳар' or 'ношинос' if specified at line 1, column 23";

describe('parser: errors and their positions', () => {
  test.each([
    // Ambient initializers: only literal ones (a template without interpolations is one)
    [
      'эълон собит т = `${1}`;',
      ['Initializers are not allowed in ambient contexts at line 1, column 17'],
    ],
    // `истифода` binds names, not patterns, in every declarator
    [
      'истифода а = х, [б] = у;',
      ["'истифода' declarations may not have binding patterns at line 1, column 17"],
    ],
    ['барои (ф() дар о) {}', ['Invalid left-hand side in a for-in loop at line 1, column 8']],
    ['барои (ф() аз о) {}', ['Invalid left-hand side in a for-of loop at line 1, column 8']],
    [
      'барои (собит 5; ;) {}',
      [
        "Unexpected token '5' at line 1, column 14 (Expected identifier)",
        "Unexpected token ')' at line 1, column 18",
      ],
    ],
    [
      'барои (собит [а, б',
      ["Unexpected token end of input at line 1, column 19 (Expected ']' in array pattern)"],
    ],
    [
      'барои (истифода 5 аз х) {}',
      ["Unexpected token '5' at line 1, column 17 (Expected variable name)"],
    ],
    ['тағ а; [(а = 1)] = [];', ['Invalid left-hand side in assignment at line 1, column 18']],
    ['тағ а; [а += 1] = [];', ['Invalid left-hand side in assignment at line 1, column 17']],
    // Before `<` or `>` a `<…>` is no type argument list: it compares
    ['тағ х = а<б><в>;', ["Unexpected token ';' at line 1, column 16"]],
    ['тағ х = а<б> > в;', ["Unexpected token '>' at line 1, column 14"]],
    [
      'тағ х = ворид;',
      [
        "Unexpected token 'ворид' at line 1, column 9",
        "Unexpected token ';' at line 1, column 14 (Expected 'аз' after import specifiers)",
      ],
    ],
    [
      'тағ с = `\\u{110000}`;',
      ["Invalid Unicode escape '\\u{110000}' in template literal at line 1, column 9"],
    ],
    // The lexer of an interpolation reports at the position in the file
    [
      'тағ с = `${1__0}`;',
      ['Invalid number format at line 1, column 12: invalid numeric separator'],
    ],
    ['ворид * чун 5 аз "./м";', ["Expected namespace alias after 'чун' at line 1, column 13"]],
    [
      'ворид { 5 } аз "./м";',
      [
        'Expected import name at line 1, column 9',
        "Unexpected token './м' at line 1, column 16 (Expected ';' after expression)",
      ],
    ],
    [
      'тағ о = { *м: 1 };',
      ["Unexpected token ':' at line 1, column 13 (Expected '(' after method name)"],
    ],
    [
      'тағ о = { "а" };',
      ["Unexpected token '}' at line 1, column 15 (Expected ':' after property key)"],
    ],
    // TypeScript's TS1196, for a generic and for an array type
    ['кӯшиш {} гирифтан (е: Ваъда<рақам>) {}', [CATCH_TYPE]],
    ['кӯшиш {} гирифтан (е: рақам[]) {}', [CATCH_TYPE]],
    [
      'функсия ф(...а = []) {}',
      ['Rest parameter cannot have a default value at line 1, column 16'],
    ],
    ['навъ Т<У> = У мерос сатр;', ["Expected '?' in conditional type at line 1, column 25"]],
    ['навъ Т<У> = У мерос сатр ? 1;', ["Expected ':' in conditional type at line 1, column 29"]],
    [
      'тағ х: (рақам',
      ["Unexpected token end of input at line 1, column 14 (Expected ')' after type)"],
    ],
    [
      'тағ ф: <Т> Т;',
      ["Unexpected token 'Т' at line 1, column 12 (Expected '(' after type parameters)"],
    ],
    // Type arguments whose qualified name is cut short: `навъи ф` goes without them
    [
      'навъ Т = навъи ф<А.>;',
      ["Unexpected token '<' at line 1, column 17 (Expected ';' after type alias)"],
    ],
    ['интерфейс И мерос {}', ["Expected interface name after 'мерос' at line 1, column 19"]],
    ['интерфейс И { =: рақам; }', ['Expected property name at line 1, column 15']],
    [
      'синф К мерос {}',
      ["Unexpected token '{' at line 1, column 14 (Expected superclass name after 'мерос')"],
    ],
    ['синф К { ҳамзамон х = 1; }', ["Expected method after 'ҳамзамон' at line 1, column 19"]],
    ['синф К { *х = 1; }', ["Expected method after '*' at line 1, column 11"]],
    [
      'синф К { эълон м() {} }',
      ["'эълон' modifier can only appear on a property declaration at line 1, column 16"],
    ],
    ['номфазо Н { содир 5; }', ["Expected a declaration after 'содир' at line 1, column 19"]],
    [
      'собит { + } = о;',
      [
        "Unexpected token '+' at line 1, column 9 (Expected identifier in object pattern)",
        "Unexpected token '=' at line 1, column 13",
      ],
    ],
    [
      'собит { 5 } = о;',
      [
        "Unexpected token '}' at line 1, column 11 (Expected ':' after property key in pattern)",
        "Unexpected token '=' at line 1, column 13",
      ],
    ],
    // A keyword names a property, never a variable: it needs `калид: ном`
    [
      'собит { агар } = о;',
      [
        "Unexpected token '}' at line 1, column 14 (Expected ':' after property key in pattern)",
        "Unexpected token '=' at line 1, column 16",
      ],
    ],
    ['собит [+] = х;', ["Unexpected token '+' at line 1, column 8 (Expected identifier)"]],
    // Recovery skips nested braces and goes on after them: one error
    [
      'х = 5 5 { { 1 } }\nтағ у = 1;',
      ["Unexpected token '5' at line 1, column 7 (Expected ';' after expression)"],
    ],
    [
      'синф К { 5 { { } } х = 1; }',
      ["Unexpected token '{' at line 1, column 12 (Expected ';' after a class field)"],
    ],
    // A broken member before another class: the class ends there
    [
      'синф К { х: = 1\nсинф Д {}',
      ['Expected type at line 1, column 13', "Expected '}' after class body at line 2, column 1"],
    ],
  ])('%s', (source, errors) => {
    expect(errorsOf(source)).toEqual(errors);
  });

  test('nesting that exhausts the stack inside a type is a nesting error', () => {
    const errors = errorsOf(`тағ х: ${'('.repeat(8000)}рақам${')'.repeat(8000)};`);
    expect(errors).toEqual([expect.stringMatching(/^Nesting too deep at line 1, column \d+$/)]);
  });

  test('a lexer error on a later line of an interpolation is placed in the file', () => {
    expect(errorsOf('тағ с = `${\n 1__0}`;')).toEqual([
      'Invalid number format at line 2, column 2: invalid numeric separator',
    ]);
  });

  test('nesting too deep while a head is tried ends the parse', () => {
    const deep = `${'['.repeat(600)}${']'.repeat(600)}`;
    for (const source of [`тағ ф = (а = ${deep}) => а;`, `барои (${deep} аз х) {}`]) {
      expect(errorsOf(source)).toEqual([
        expect.stringMatching(/^Nesting too deep at line 1, column \d+ \(more than 500 levels\)$/),
      ]);
    }
  });

  test('nesting too deep inside a class member ends the parse', () => {
    const errors = errorsOf(`синф К { м() { бозгашт ${'['.repeat(600)}${']'.repeat(600)}; } }`);
    expect(errors).toEqual([
      expect.stringMatching(/^Nesting too deep at line 1, column \d+ \(more than 500 levels\)$/),
    ]);
  });
});

describe('parser: rarer valid programs', () => {
  test.each([
    [
      'generator overload signatures',
      'функсия* г(): Iterator<рақам>;\nфунксия* г() { ҳосил 1; ҳосил 2; }\nчоп.сабт([...г()].join());',
      ['1,2'],
    ],
    [
      'a decorator with type arguments before a line break',
      'функсия д(...а: ҳар[]) { бозгашт (К: ҳар) => К; }\n@д<рақам>\nсинф К {}\nчоп.сабт(навъи К);',
      ['function'],
    ],
    ['a variable named `эълон`', 'тағ эълон = 1;\nэълон = 2;\nчоп.сабт(эълон);', ['2']],
    [
      '`нав` with a computed member and a non-null assertion',
      'собит о = { К: синф { х = 1; } };\nчоп.сабт(нав о["К"]().х, нав о!.К().х);',
      ['1 1'],
    ],
    [
      'destructuring assignments with rest and defaults',
      'тағ о; тағ а; тағ б;\n({ а, ...о } = { а: 1, в: 2 });\n[б = 5] = [];\nчоп.сабт(а, о.в, б);',
      ['1 2 5'],
    ],
    [
      'an ambient template literal and a dotted ambient namespace',
      'эълон собит с = `матн`;\nэълон номфазо А.Б { тағ х: рақам; }\nчоп.сабт(1);',
      ['1'],
    ],
    [
      'empty import and export lists, trailing commas',
      'ворид {} аз "fs";\nворид { readFileSync, } аз "fs";\nсобит а = 1;\nсодир {};\nсодир { а, };\nчоп.сабт(навъи readFileSync);',
      ['function'],
    ],
    [
      'a built-in name as a namespace import',
      'ворид * чун рӯйхат аз "fs";\nчоп.сабт(навъи рӯйхат.readFileSync);',
      ['function'],
    ],
    [
      'object patterns: string keys and built-in names',
      'собит { "а-б": х } = { "а-б": 1 };\nсобит [Риёзӣ] = [{ max: () => 7 }];\nчоп.сабт(х);',
      ['1'],
    ],
    [
      'a call signature without a return type, `extends` in type parameters',
      'интерфейс И { (х: рақам); }\nфунксия ф<Т extends сатр>(х: Т): Т { бозгашт х; }\nчоп.сабт(ф("а"));',
      ['а'],
    ],
  ])('%s', (_name, source, output) => {
    expect(run(source)).toEqual(output);
  });
});

describe('parser: template tokens from other producers', () => {
  /** A program of one template literal token with this raw text. */
  const template = (raw: string) => {
    const parser = new Parser([
      { type: TokenType.TEMPLATE_LITERAL, value: raw, line: 1, column: 1 },
      { type: TokenType.EOF, value: '', line: 1, column: raw.length + 3 },
    ]);
    const program = parser.parse();
    const statement = program.body[0] as ExpressionStatement;
    return { errors: parser.getErrors(), template: statement.expression as TemplateLiteral };
  };

  test('an interpolation, line comment or block comment that is not closed ends the text', () => {
    // The lexer reports such templates; another producer may hand them over
    const open = template('а${б');
    expect(open.errors).toEqual([]);
    expect(open.template.expressions.map(e => (e as Identifier).name)).toEqual(['б']);
    expect(template('а${б // шарҳ').template.expressions).toHaveLength(1);
    // The comment is then the interpolation's, whose lexer finds it open
    const parser = new Parser([
      { type: TokenType.TEMPLATE_LITERAL, value: 'а${б /* шарҳ', line: 1, column: 1 },
      { type: TokenType.EOF, value: '', line: 1, column: 15 },
    ]);
    parser.parse();
    expect(parser.getErrors()).toEqual(['Unterminated block comment at line 1, column 7']);
  });
});

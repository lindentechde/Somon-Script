import { Lexer } from '../src/lexer';
import { TokenType } from '../src/types';
import { compile } from '../src/compiler';

function tokenize(source: string) {
  return new Lexer(source).tokenize();
}

function significant(source: string) {
  return tokenize(source).filter(t => t.type !== TokenType.EOF);
}

function runLogs(source: string): unknown[][] {
  const result = compile(source);
  expect(result.errors).toEqual([]);
  const logs: unknown[][] = [];
  const fakeConsole = { log: (...args: unknown[]) => logs.push(args) };
  new Function('console', result.code)(fakeConsole);
  return logs;
}

describe('Lexer: numeric literals', () => {
  test.each([
    ['0xFF', '0xFF'],
    ['0Xff', '0Xff'],
    ['0b101', '0b101'],
    ['0B1', '0B1'],
    ['0o17', '0o17'],
    ['0O7', '0O7'],
    ['1e3', '1e3'],
    ['1E+3', '1E+3'],
    ['1.5e-3', '1.5e-3'],
    ['.5', '.5'],
    ['.5e2', '.5e2'],
    ['1_000_000', '1000000'],
    ['0xFF_FF', '0xFFFF'],
    ['1_0.0_1e1_0', '10.01e10'],
    ['10n', '10n'],
    ['0n', '0n'],
    ['0xFFn', '0xFFn'],
    ['1_000n', '1000n'],
    ['0', '0'],
    ['0.5', '0.5'],
  ])('%s is a single NUMBER token with value %s', (source, value) => {
    const tokens = significant(source);
    expect(tokens).toHaveLength(1);
    expect(tokens[0]).toMatchObject({ type: TokenType.NUMBER, value, line: 1, column: 1 });
  });

  test('a dot followed by a non-digit after a decimal is member access', () => {
    const tokens = significant('1.5.toFixed(1)');
    expect(tokens.map(t => [t.type, t.value])).toEqual([
      [TokenType.NUMBER, '1.5'],
      [TokenType.DOT, '.'],
      [TokenType.IDENTIFIER, 'toFixed'],
      [TokenType.LEFT_PAREN, '('],
      [TokenType.NUMBER, '1'],
      [TokenType.RIGHT_PAREN, ')'],
    ]);
  });

  test('leading-dot number after an operator and inside calls', () => {
    const tokens = significant('х = .5 + f(.25)');
    expect(tokens.filter(t => t.type === TokenType.NUMBER).map(t => t.value)).toEqual([
      '.5',
      '.25',
    ]);
  });

  test('spread is still recognised before a digit-free operand', () => {
    expect(significant('...а').map(t => t.type)).toEqual([TokenType.SPREAD, TokenType.IDENTIFIER]);
  });

  test('"?." followed by a digit is a conditional with a leading-dot number', () => {
    expect(significant('а?.5:1').map(t => [t.type, t.value])).toEqual([
      [TokenType.IDENTIFIER, 'а'],
      [TokenType.QUESTION, '?'],
      [TokenType.NUMBER, '.5'],
      [TokenType.COLON, ':'],
      [TokenType.NUMBER, '1'],
    ]);
    expect(significant('а?.б')[1].type).toBe(TokenType.OPTIONAL_CHAINING);
  });

  test.each([
    ['1__0', 'numeric separator'],
    ['1_', 'numeric separator'],
    ['0x_1', 'numeric separator'],
    ['1_.5', 'numeric separator'],
    ['1e', 'exponent'],
    ['1e+', 'exponent'],
    ['0x', 'missing digits'],
    ['0b2', 'missing digits'],
    ['1.5n', 'BigInt'],
    ['1e3n', 'BigInt'],
    ['07', 'leading zero'],
    ['10px', 'identifier directly after number'],
    ['3in', 'identifier directly after number'],
    ['0xFG', 'identifier directly after number'],
  ])('%s is rejected (%s)', (source, reason) => {
    expect(() => tokenize(source)).toThrow(/at line 1, column 1/);
    expect(() => tokenize(source)).toThrow(new RegExp(reason, 'i'));
  });

  test('decimal numbers compile and run', () => {
    expect(runLogs('чоп.сабт(.5 + 1.25, 1.5.toFixed(1), 2.5e1);')).toEqual([[1.75, '1.5', 25]]);
  });
});

describe('Lexer: exact-case keyword lookup', () => {
  test('capitalised words are identifiers, not keywords', () => {
    for (const word of ['Синф', 'Агар', 'Рақам', 'ТАҒЙИРЁБАНДА', 'Бозгашт']) {
      expect(significant(word)[0]).toMatchObject({ type: TokenType.IDENTIFIER, value: word });
    }
  });

  test('lowercase keywords are still keywords', () => {
    expect(significant('синф агар рақам')[0].type).toBe(TokenType.СИНФ);
    expect(significant('агар')[0].type).toBe(TokenType.АГАР);
    expect(significant('рақам')[0].type).toBe(TokenType.РАҚАМ);
  });

  test('camelCase keyword entries are reachable', () => {
    expect(significant('қайдАсл')[0].type).toBe(TokenType.ҚАЙДАСЛ);
    expect(significant('вақтСабт')[0].type).toBe(TokenType.ВАҚТСАБТ);
    expect(significant('xmlФеҳрист')[0].type).toBe(TokenType.XMLФЕҲРИСТ);
    expect(significant('гуруҳПӯшида')[0].type).toBe(TokenType.ГУРУҲПӮШИДА);
    expect(significant('сатрМетодҳо')[0].type).toBe(TokenType.САТРМЕТОДҲО);
    expect(significant('дарозииСатр')[0].type).toBe(TokenType.ДАРОЗИИСАТР);
  });

  test('a capitalised keyword spelling can name a class', () => {
    expect(
      runLogs('синф Агар { салом() { бозгашт 7; } }\nтағ а = нав Агар();\nчоп.сабт(а.салом());')
    ).toEqual([[7]]);
  });
});

describe('Lexer: string escapes', () => {
  test.each([
    ['"\\u0041"', 'A'],
    ['"\\u{41}"', 'A'],
    ['"\\u{1F600}"', '\u{1F600}'],
    ['"\\u0434"', 'д'],
    ['"\\x41"', 'A'],
    ['"\\0"', '\0'],
    ['"\\b\\f\\v"', '\b\f\v'],
    ["'\\''", "'"],
    ['"\\q"', 'q'],
    ['"a\\\nb"', 'ab'],
    ['"a\\\r\nb"', 'ab'],
  ])('%j decodes to %j', (source, value) => {
    const tokens = significant(source);
    expect(tokens).toHaveLength(1);
    expect(tokens[0]).toMatchObject({ type: TokenType.STRING, value });
  });

  test('line continuation inside a string advances the line counter', () => {
    const tokens = significant('"a\\\nb" х');
    expect(tokens[1]).toMatchObject({ value: 'х', line: 2, column: 4 });
  });

  test.each(['"\\u00G1"', '"\\u{}"', '"\\u{110000}"', '"\\u{41"', '"\\x4"', '"\\xZZ"'])(
    '%j is an invalid escape',
    source => {
      expect(() => tokenize(source)).toThrow(/Invalid escape sequence at line 1, column 2/);
    }
  );

  test('decoded escapes survive compilation', () => {
    expect(runLogs('чоп.сабт("A\\u0041|\\x41|\\u{1F600}|\\0|".length, "\\x41\\u0042");')).toEqual([
      ['AA|A|\u{1F600}|\0|'.length, 'AB'],
    ]);
  });
});

describe('Lexer: comments', () => {
  test('unterminated block comment is an error with its start position', () => {
    expect(() => tokenize('чоп.сабт(1);\n  /* never closed\nчоп.сабт(2);')).toThrow(
      'Unterminated block comment at line 2, column 3'
    );
  });

  test('many consecutive comments do not overflow the stack', () => {
    const tokens = significant('/**/'.repeat(20000) + 'а' + '//x\n'.repeat(20000));
    expect(tokens[0]).toMatchObject({ type: TokenType.IDENTIFIER, value: 'а' });
  });
});

describe('Lexer: line breaks', () => {
  test('a lone carriage return starts a new line', () => {
    const tokens = significant('а\rб\r\rв');
    expect(tokens.map(t => [t.value, t.line, t.column])).toEqual([
      ['а', 1, 1],
      ['б', 2, 1],
      ['в', 4, 1],
    ]);
  });

  test('CRLF still counts as one line break', () => {
    const tokens = tokenize('а\r\nб').filter(t => t.type === TokenType.IDENTIFIER);
    expect(tokens[1]).toMatchObject({ value: 'б', line: 2, column: 1 });
  });

  test('a line comment ends at a lone carriage return', () => {
    const tokens = significant('// comment\rб');
    expect(tokens[0]).toMatchObject({ value: 'б', line: 2, column: 1 });
  });

  test('lone carriage returns inside block comments and strings are counted', () => {
    expect(significant('/* a\rb */ в')[0]).toMatchObject({ value: 'в', line: 2 });
    expect(significant('"a\rb" в')[1]).toMatchObject({ value: 'в', line: 2 });
  });

  test('errors after lone-CR line breaks report the right line', () => {
    expect(() => tokenize('тағ а = 1;\rтағ б = 2;\r@')).toThrow(/line 3, column 1/);
  });
});

describe('Lexer: identifiers', () => {
  test('$ is allowed at the start and inside identifiers', () => {
    expect(significant('$ $а а$б _$').map(t => [t.type, t.value])).toEqual([
      [TokenType.IDENTIFIER, '$'],
      [TokenType.IDENTIFIER, '$а'],
      [TokenType.IDENTIFIER, 'а$б'],
      [TokenType.IDENTIFIER, '_$'],
    ]);
  });

  test('non-BMP identifier characters are read as whole code points', () => {
    const tokens = significant('𝑥 а𝑦б =');
    expect(tokens.map(t => [t.type, t.value, t.column])).toEqual([
      [TokenType.IDENTIFIER, '𝑥', 1],
      [TokenType.IDENTIFIER, 'а𝑦б', 3],
      [TokenType.ASSIGN, '=', 7],
    ]);
  });

  test('non-identifier non-BMP characters are reported whole', () => {
    expect(() => tokenize('а 😀')).toThrow("Unexpected character '😀' at line 1, column 3");
  });

  test('Cyrillic non-letters are rejected', () => {
    expect(() => tokenize('а҂')).toThrow("Unexpected character '҂'");
    expect(() => tokenize('҈а')).toThrow('Unexpected character');
    expect(() => tokenize('а҉')).toThrow('Unexpected character');
  });

  test('Cyrillic combining marks are allowed inside identifiers', () => {
    expect(significant('а҃б')[0]).toMatchObject({
      type: TokenType.IDENTIFIER,
      value: 'а҃б',
    });
  });

  test('identifiers with $ and non-BMP letters compile and run', () => {
    expect(runLogs('тағ $нарх = 3; тағ 𝑥 = 4; чоп.сабт($нарх * 𝑥);')).toEqual([[12]]);
  });
});

describe('Lexer: regular expression literals', () => {
  /** Token types of `source`, regular expressions as their text. */
  function shapes(source: string): string[] {
    return significant(source).map(t => (t.type === TokenType.REGEX ? t.value : t.type));
  }

  test.each([
    '/а+/g',
    '/[0-9]+/u',
    '/[/]/',
    '/\\//',
    '/[\\]/]/',
    '/(?<сол>\\d{4})/dgimsy',
    '/[\\p{L}--[а]]/v',
    '/=/',
  ])('%s is one token', source => {
    expect(significant(source)).toEqual([
      { type: TokenType.REGEX, value: source, line: 1, column: 1 },
    ]);
  });

  test.each([
    'х = /а/;',
    'ф(/а/, /б/);',
    '[/а/];',
    'о = { к: /а/ };',
    'х ? /а/ : /б/;',
    '!/а/.test(с);',
    'а && /а/ || /б/ ?? /в/;',
    'х => /а/;',
    'бозгашт /а/;',
    'партофтан /а/;',
    'навъи /а/;',
    'typeof /а/;',
    'void /а/;',
    'вагарна /а/;',
    '{ } /а/;',
    'агар (х) /а/;',
    'то (х) /а/;',
    '"а" дар /а/;',
    'ҳолат /а/:',
    '; /а/;',
  ])('a regex where an operand starts: %s', source => {
    expect(shapes(source)).toContain('/а/');
  });

  test.each([
    ['а / б / в', 'IDENTIFIER / IDENTIFIER / IDENTIFIER'],
    ['(а) / 2', '( IDENTIFIER ) / NUMBER'],
    ['х[0] / 2', 'IDENTIFIER [ NUMBER ] / NUMBER'],
    ['а /= 2', 'IDENTIFIER /= NUMBER'],
    ['а++ / 2 / в', 'IDENTIFIER ++ / NUMBER / IDENTIFIER'],
    ['а-- / 2 / в', 'IDENTIFIER -- / NUMBER / IDENTIFIER'],
    ['"а" / 2 / в', 'STRING / NUMBER / IDENTIFIER'],
    ['ф() / 2 / в', 'IDENTIFIER ( ) / NUMBER / IDENTIFIER'],
    ['ин / 2 / в', 'ИН / NUMBER / IDENTIFIER'],
    ['о.бозгашт / 2 / в', 'IDENTIFIER . БОЗГАШТ / NUMBER / IDENTIFIER'],
    ['дар / 2 / в', 'ДАР / NUMBER / IDENTIFIER'],
    // `ҳолат` starts a switch case only at the start of a statement
    ['х = ҳолат / 2 / в', 'IDENTIFIER = ҲОЛАТ / NUMBER / IDENTIFIER'],
    ['х = { а: 1 } / 2 / в', 'IDENTIFIER = { IDENTIFIER : NUMBER } / NUMBER / IDENTIFIER'],
  ])('a division after an operand: %s', (source, expected) => {
    expect(shapes(source).join(' ')).toBe(expected);
  });

  test.each([
    ['х! / 2 / в', 'IDENTIFIER ! / NUMBER / IDENTIFIER'],
    ['ф()! / 2 / в', 'IDENTIFIER ( ) ! / NUMBER / IDENTIFIER'],
    ['а[0]! /= 2 / в', 'IDENTIFIER [ NUMBER ] ! /= NUMBER / IDENTIFIER'],
    ['х!! / 2 / в', 'IDENTIFIER ! ! / NUMBER / IDENTIFIER'],
    ['"а"! / 2 / в', 'STRING ! / NUMBER / IDENTIFIER'],
  ])('a division after a postfix non-null `!`: %s', (source, expected) => {
    expect(shapes(source).join(' ')).toBe(expected);
  });

  test.each([
    ['!/а/.test("а")', '! /а/ . IDENTIFIER ( STRING )'],
    ['х = !/а/.test(с)', 'IDENTIFIER = ! /а/ . IDENTIFIER ( IDENTIFIER )'],
    ['ф(!!/а/)', 'IDENTIFIER ( ! ! /а/ )'],
    ['х\n!/а/.test(с)', 'IDENTIFIER NEWLINE ! /а/ . IDENTIFIER ( IDENTIFIER )'],
  ])('a regex after a prefix `!`: %s', (source, expected) => {
    expect(shapes(source).join(' ')).toBe(expected);
  });

  test.each([
    'функсия* г() { ҳосил /а/; }',
    'тағ г = функсия* () { yield /а/; };',
    'ҳамзамон функсия* г() { ҳосил /а/; }',
    'тағ о = { *г() { ҳосил /а/; } };',
    'тағ о = { ҳамзамон *г() { ҳосил /а/; } };',
    'синф К { статикӣ *г() { агар (х) { ҳосил /а/; } } }',
  ])('ҳосил yields a regex in a generator: %s', source => {
    expect(shapes(source)).toContain('/а/');
  });

  test.each([
    ['ҳосил / 2 / в', 'IDENTIFIER / NUMBER / IDENTIFIER'],
    [
      'функсия* г() { } ҳосил / 2 / в',
      'ФУНКСИЯ * IDENTIFIER ( ) { } IDENTIFIER / NUMBER / IDENTIFIER',
    ],
    [
      'функсия г() { ҳосил / 2 / в }',
      'ФУНКСИЯ IDENTIFIER ( ) { IDENTIFIER / NUMBER / IDENTIFIER }',
    ],
    ['а * б / 2 / в', 'IDENTIFIER * IDENTIFIER / NUMBER / IDENTIFIER'],
  ])('ҳосил is a name outside generators: %s', (source, expected) => {
    expect(shapes(source).join(' ')).toBe(expected);
  });

  test('a division continues an expression across a line break', () => {
    expect(shapes('а\n/ б /\nв').join(' ')).toBe(
      'IDENTIFIER NEWLINE / IDENTIFIER / NEWLINE IDENTIFIER'
    );
  });

  test('comments are never regular expressions', () => {
    expect(shapes('// а / б\n/* в / г */ х').join(' ')).toBe('NEWLINE IDENTIFIER');
  });

  test('a template interpolation tells a postfix `!` from a prefix one', () => {
    const source = '`${х! / 2}${!/}/.test(с)}${а[0]!! / в}`';
    expect(significant(source)).toEqual([
      expect.objectContaining({ type: TokenType.TEMPLATE_LITERAL, value: source.slice(1, -1) }),
    ]);
  });

  test('a regex in a template interpolation may contain braces and quotes', () => {
    expect(significant('`${с.replace(/}"/g, "")} ${а / б}`')).toEqual([
      expect.objectContaining({
        type: TokenType.TEMPLATE_LITERAL,
        value: '${с.replace(/}"/g, "")} ${а / б}',
      }),
    ]);
  });

  test.each([
    ['/а/gg', "Invalid regular expression flags 'gg' at line 1, column 5"],
    ['/а/x', "Invalid regular expression flags 'x' at line 1, column 5"],
    ['/а/uv', "Invalid regular expression flags 'uv' at line 1, column 5"],
    ['/а(/', 'Invalid regular expression: /а(/: Unterminated group at line 1, column 5'],
  ])('%s is an early error', (regex, message) => {
    expect(() => tokenize(`х = ${regex};`)).toThrow(message);
    expect(compile(`тағ х = ${regex};`).errors).toEqual([expect.stringContaining('column 9')]);
  });

  test('a regex not closed on its line is left to the parser to report', () => {
    expect(shapes('х = /а\n/;').join(' ')).toBe('IDENTIFIER = / IDENTIFIER NEWLINE / ;');
    expect(compile('тағ х = /а\n/;').errors).toEqual([
      'Parse error: Unterminated regular expression at line 1, column 9',
    ]);
  });

  test('regexes compile and run in every expression position', () => {
    expect(
      runLogs(
        'собит с = "а-б-в";\n' +
          'чоп.сабт(/а+/g.test("бааа"), с.replace(/-/g, "+"), с.ҷойгузин(/-/g, ""), /[/]/.test("/"));\n' +
          'функсия ф(х: сатр): мантиқӣ { бозгашт /^\\d+$/.test(х); }\n' +
          'чоп.сабт(ф("12"), ф("1а"), `${"а}б".replace(/}/g, "")}`, [/а/][0].source);'
      )
    ).toEqual([
      [true, 'а+б+в', 'абв', true],
      [true, false, 'аб', 'а'],
    ]);
  });
});

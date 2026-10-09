import {
  DEFAULT_INDENT,
  FormatError,
  checkSameProgram,
  format,
  isFormatted,
} from '../src/tools/format';

/** Formats and checks that formatting the result again changes nothing. */
function fmt(source: string, indent?: number): string {
  const once = format(source, indent === undefined ? {} : { indent });
  expect(format(once, indent === undefined ? {} : { indent })).toBe(once);
  return once;
}

describe('format: spacing', () => {
  test.each([
    ['binary operators and commas', 'тағ а=1+2*3,б=[1,2];', 'тағ а = 1 + 2 * 3, б = [1, 2];\n'],
    ['keywords before parentheses', 'агар(а){б()}', 'агар (а) { б(); }\n'],
    ['calls and indexes attach', 'ф (а) [0] . б ( )', 'ф(а)[0].б();\n'],
    [
      'unary and update operators',
      'тағ а = - б + ! в - -г; а ++; -- а;',
      'тағ а = -б + !в - -г; а++; --а;\n',
    ],
    ['ternary and type colons', 'тағ а:рақам=б?1:2;', 'тағ а: рақам = б ? 1 : 2;\n'],
    [
      'object literals and empty blocks',
      'тағ о={а:1,...б};функсия ф(){ }',
      'тағ о = { а: 1, ...б }; функсия ф() {}\n',
    ],
    ['arrows and spread', 'собит ф=(...а)=>а.дарозӣ', 'собит ф = (...а) => а.дарозӣ;\n'],
    ['optional chaining and non-null', 'а ?. б ! . в ?.( 1 )', 'а?.б!.в?.(1);\n'],
    [
      'generic types and calls',
      'собит м:Map<сатр,рақам[]> =нав Map<сатр,рақам[]>();ф<рақам>(1);',
      'собит м: Map<сатр, рақам[]> = нав Map<сатр, рақам[]>(); ф<рақам>(1);\n',
    ],
    ['comparisons stay comparisons', 'агар(а<б&&в>г){}', 'агар (а < б && в > г) {}\n'],
    [
      'nested type arguments',
      'тағ а:Map<сатр,Map<сатр,рақам>>;',
      'тағ а: Map<сатр, Map<сатр, рақам>>;\n',
    ],
    [
      'generic arrows and assertions',
      'собит ф=<Т,>(х:Т):Т=>х;собит б=<сатр>в;',
      'собит ф = <Т,>(х: Т): Т => х; собит б = <сатр>в;\n',
    ],
    [
      'optional members and parameters',
      'интерфейс И{а?:рақам;м?():сатр}функсия ф(б?:рақам){}',
      'интерфейс И { а?: рақам; м?(): сатр } функсия ф(б?: рақам) {}\n',
    ],
    [
      'mapped type modifiers',
      'навъ Т={-танҳохонӣ[К дар калидҳои У]-?:У[К]};',
      'навъ Т = { -танҳохонӣ [К дар калидҳои У]-?: У[К] };\n',
    ],
    [
      'generators',
      'функсия*г(){ҳосил*[1];}синф К{*м(){}}',
      'функсия* г() { ҳосил* [1]; } синф К { *м() {} }\n',
    ],
    ['import star and dynamic keywords', 'ворид*чун м аз "./м";', 'ворид * чун м аз "./м";\n'],
    [
      'for heads',
      'барои(;;){}барои(тағ и=0;;и++){}барои(;и<1;){}',
      'барои (;;) {} барои (тағ и = 0; ; и++) {} барои (; и < 1; ) {}\n',
    ],
    [
      'tagged templates and regexes',
      'тег `а${1}`;тағ р=/а/g.test("а")/2;',
      'тег`а${1}`; тағ р = /а/g.test("а") / 2;\n',
    ],
    [
      'typeof and asserts',
      'функсия ф(х:ношинос):тасдиқ х аст сатр{}',
      'функсия ф(х: ношинос): тасдиқ х аст сатр {}\n',
    ],
    [
      'labels and jumps',
      'берун:барои(;;){шикастан берун}',
      'берун: барои (;;) { шикастан берун; }\n',
    ],
    [
      'private names',
      'синф К{#х=1;м(){бозгашт #х дар ин}}',
      'синф К { #х = 1; м() { бозгашт #х дар ин; } }\n',
    ],
    [
      'as and satisfies',
      'собит а=[1]чун собит;собит б={}бармесоё И;',
      'собит а = [1] чун собит; собит б = {} бармесоё И;\n',
    ],
    [
      'type arguments that start with инфер, навъи or a template type, and of method calls',
      'навъ Т<У> =У мерос Array<инфер В>?В:абадан;навъ Қ=Map<навъи а,`к_${сатр}`>;тағ р=[1].map<рақам>(х=>х);',
      'навъ Т<У> = У мерос Array<инфер В> ? В : абадан; навъ Қ = Map<навъи а, `к_${сатр}`>; тағ р = [1].map<рақам>(х => х);\n',
    ],
    [
      'keeps tokens apart',
      'а - -б; а + +б; а / /б/.source.length;',
      'а - -б; а + +б; а / /б/.source.length;\n',
    ],
  ])('%s', (_name, source, expected) => {
    expect(fmt(source)).toBe(expected);
  });
});

describe('format: lines and indentation', () => {
  test('indents blocks by four spaces and puts `{` on the line of its statement', () => {
    const source = 'функсия ф(а)\n{\nагар (а)\n{\nбозгашт 1\n}\nвагарна\n{\nбозгашт 2\n}\n}';
    expect(fmt(source)).toBe(
      'функсия ф(а) {\n    агар (а) {\n        бозгашт 1;\n    } вагарна {\n        бозгашт 2;\n    }\n}\n'
    );
  });

  test('joins гирифтан, ниҳоят and the `то` of a do-while to the closing brace', () => {
    expect(fmt('кӯшиш {\nа()\n}\nгирифтан (е) {\n}\nниҳоят {\n}')).toBe(
      'кӯшиш {\n    а();\n} гирифтан (е) {\n} ниҳоят {\n}\n'
    );
    expect(fmt('кун {\nи++\n}\nто (и < 3)')).toBe('кун {\n    и++;\n} то (и < 3);\n');
    // a while loop after a block is a statement of its own
    expect(fmt('{\nа();\n}\nто (б) {}')).toBe('{\n    а();\n}\nто (б) {}\n');
  });

  test('never joins across a line comment or after a restricted keyword', () => {
    expect(fmt('агар (а) // шарҳ\n{\n}')).toBe('агар (а) // шарҳ\n{\n}\n');
    expect(fmt('агар (а) {\n} // шарҳ\nвагарна {\n}')).toBe(
      'агар (а) {\n} // шарҳ\nвагарна {\n}\n'
    );
  });

  test('indents switch cases and their bodies', () => {
    const source =
      'интихоб (х) {\nҳолат 1:\nа();\nшикастан;\n// дигар\nҳолат 2:\nҳолат 3: {\nб();\n}\nпешфарз:\nв();\n}';
    expect(fmt(source)).toBe(
      'интихоб (х) {\n    ҳолат 1:\n        а();\n        шикастан;\n    // дигар\n    ҳолат 2:\n    ҳолат 3: {\n        б();\n    }\n    пешфарз:\n        в();\n}\n'
    );
  });

  test('continuation lines get one more level', () => {
    expect(fmt('собит х =\n1 +\n2;')).toBe('собит х =\n    1 +\n    2;\n');
    expect(fmt('рақамҳо\n.филтр(х => х > 1)\n.харита(х => х)')).toBe(
      'рақамҳо\n    .филтр(х => х > 1)\n    .харита(х => х);\n'
    );
    expect(fmt('собит х = шарт\n? { а: 1 }\n: { а: 2 };')).toBe(
      'собит х = шарт\n    ? { а: 1 }\n    : { а: 2 };\n'
    );
  });

  test('bodies without braces nest by their heads', () => {
    expect(fmt('агар (а)\nагар (б)\nв();\nг();')).toBe(
      'агар (а)\n    агар (б)\n        в();\nг();\n'
    );
    expect(fmt('собит ф = (х) =>\nх * 2;')).toBe('собит ф = (х) =>\n    х * 2;\n');
  });

  test('the first line inside brackets is indented by the bracket alone', () => {
    expect(fmt('ф(х =>\nх * 2\n);')).toBe('ф(х =>\n    х * 2\n);\n');
    expect(fmt('ф(() => {\nа();\n}, 1);')).toBe('ф(() => {\n    а();\n}, 1);\n');
    expect(fmt('тағ а = [\n1,\n[\n2,\n],\n];')).toBe(
      'тағ а = [\n    1,\n    [\n        2,\n    ],\n];\n'
    );
  });

  test('statements after a block or an object literal', () => {
    expect(fmt('шумориш Р {\nА,\nБ\n}\nчоп.сабт(Р.А)')).toBe(
      'шумориш Р {\n    А,\n    Б\n}\nчоп.сабт(Р.А);\n'
    );
    expect(fmt('синф А {\nстатикӣ х = 1\nget у() { бозгашт 1 }\n}')).toBe(
      'синф А {\n    статикӣ х = 1;\n    get у() { бозгашт 1; }\n}\n'
    );
  });

  test('keeps at most one blank line and none at the edges of blocks', () => {
    expect(fmt('\n\n\nтағ а = 1;\n\n\n\nтағ б = 2;\n\n\n')).toBe('тағ а = 1;\n\nтағ б = 2;\n');
    expect(fmt('функсия ф() {\n\n  а();\n\n}')).toBe('функсия ф() {\n    а();\n}\n');
  });

  test('uses the configured indentation width', () => {
    expect(fmt('агар (а) {\nб();\n}', 2)).toBe('агар (а) {\n  б();\n}\n');
    expect(DEFAULT_INDENT).toBe(4);
    expect(() => format('а;', { indent: 0 })).toThrow(RangeError);
    expect(() => format('а;', { indent: 2.5 })).toThrow(RangeError);
  });

  test('adds `;` after statements, but not after the last member of a one-line object type', () => {
    expect(fmt('тағ а = 1\nчоп.сабт(а)')).toBe('тағ а = 1;\nчоп.сабт(а);\n');
    expect(fmt('навъ Т = { а: рақам }')).toBe('навъ Т = { а: рақам };\n');
    expect(fmt('интерфейс И {\nа: рақам\nб(): сатр\n}')).toBe(
      'интерфейс И {\n    а: рақам;\n    б(): сатр;\n}\n'
    );
    expect(fmt('бозгашт\n')).toBe('бозгашт;\n');
  });

  test('empty input and comment-only input', () => {
    expect(fmt('')).toBe('');
    expect(fmt('  \n\n')).toBe('');
    expect(fmt('// танҳо шарҳ')).toBe('// танҳо шарҳ\n');
  });
});

describe('format: comments', () => {
  test('keeps line, block and inline comments where they are', () => {
    const source = 'ф(/* а */ 1 /* б */);\nа /* в */ + б;\nсобит в = 1 /* г */;';
    expect(fmt(source)).toBe(`${source}\n`);
  });

  test('re-indents JSDoc comments and moves other block comments with their first line', () => {
    const source =
      '/**\n   * Doc\n   */\nфунксия ф() {\n        /* block\n           inner */\n  бозгашт 1 // trailing\n}';
    expect(fmt(source)).toBe(
      '/**\n * Doc\n */\nфунксия ф() {\n    /* block\n       inner */\n    бозгашт 1; // trailing\n}\n'
    );
  });

  test('aligns trailing comments of consecutive lines when the source aligned them', () => {
    expect(fmt('тағ а = 1;   // як\nтағ бб = 22; // ду\n')).toBe(
      'тағ а = 1;   // як\nтағ бб = 22; // ду\n'
    );
    expect(fmt('тағ а = 1; // як\nтағ бб = 22; // ду\n')).toBe(
      'тағ а = 1; // як\nтағ бб = 22; // ду\n'
    );
    // A blank line ends the group
    expect(fmt('а;     // як\n\nбб; // ду\n')).toBe('а; // як\n\nбб; // ду\n');
  });

  test('puts a `;` before a trailing comment', () => {
    expect(fmt('а = 1 // шарҳ\nб = 2')).toBe('а = 1; // шарҳ\nб = 2;\n');
  });
});

describe('format: source details', () => {
  test('keeps a byte order mark and a #! line', () => {
    expect(fmt('\uFEFFтағ а = 1')).toBe('\uFEFFтағ а = 1;\n');
    expect(fmt('#!/usr/bin/env somon\nтағ а = 1')).toBe('#!/usr/bin/env somon\nтағ а = 1;\n');
    expect(format('#!/usr/bin/env somon')).toBe('#!/usr/bin/env somon\n');
  });

  test('turns tabs into spaces, but leaves strings and templates alone', () => {
    expect(fmt('агар (а) {\n\tб();\n}\n')).toBe('агар (а) {\n    б();\n}\n');
    const multiline = 'тағ с = `сатр\n  дуюм ${а +\n б} сеюм`;\nтағ т = "а\\\nб";\n';
    expect(fmt(multiline)).toBe(multiline);
  });

  test('keeps the line ending of the first line break', () => {
    expect(fmt('агар (а) {\r\n\tб()\r\n}')).toBe('агар (а) {\r\n    б();\r\n}\r\n');
    // A stray LF or a template literal's line break in a CRLF file becomes CRLF too
    const crlf = 'тағ т = 1;\r\nтағ с = `а\nб`;\nтағ у = 2;';
    expect(fmt(crlf)).toBe('тағ т = 1;\r\nтағ с = `а\r\nб`;\r\nтағ у = 2;\r\n');
    expect(fmt('тағ а = 1;\nтағ б = 2;\r\n')).toBe('тағ а = 1;\nтағ б = 2;\n');
    expect(fmt('#!/usr/bin/env somon\r\nтағ а = 1')).toBe('#!/usr/bin/env somon\r\nтағ а = 1;\r\n');
    expect(isFormatted('тағ а = 1;\r\nтағ б = 2;\r\n')).toBe(true);
  });

  test('isFormatted', () => {
    expect(isFormatted('тағ а = 1;\n')).toBe(true);
    expect(isFormatted('тағ а=1;')).toBe(false);
  });
});

describe('format: safety', () => {
  test('refuses programs that do not parse', () => {
    expect(() => format('тағ = ;')).toThrow(FormatError);
    try {
      format('агар (');
    } catch (error) {
      expect(error).toBeInstanceOf(FormatError);
      expect((error as FormatError).kind).toBe('syntax');
      expect((error as FormatError).details.length).toBeGreaterThan(0);
    }
    expect(() => format('тағ с = "кушода')).toThrow('Unterminated string');
  });

  test('checkSameProgram compares programs and comments', () => {
    expect(() => checkSameProgram('а + б;', 'а +\n    б;')).not.toThrow();
    expect(() => checkSameProgram('а + б;', 'а - б;')).toThrow(FormatError);
    expect(() => checkSameProgram('а; // х', 'а;')).toThrow('comments');
    try {
      checkSameProgram('а;', 'а +;');
    } catch (error) {
      expect((error as FormatError).kind).toBe('unsafe');
    }
  });

  test('line breaks that the parser depends on stay', () => {
    // `бозгашт` + newline returns nothing; the `{` must not move up
    expect(fmt('функсия ф() {\nбозгашт\n{ а: 1 }\n}')).toBe(
      'функсия ф() {\n    бозгашт;\n    { а: 1; }\n}\n'
    );
    // `рақам` + newline + `[]` is not an array type
    const source = 'тағ к = х => х\n[1, 2].forEach(к)';
    expect(fmt(source)).toBe('тағ к = х => х\n    [1, 2].forEach(к);\n');
  });
});

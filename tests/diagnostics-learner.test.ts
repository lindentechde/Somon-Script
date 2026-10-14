import { compile } from '../src/compiler';
import type { Diagnostic } from '../src/diagnostics';

/**
 * The mistakes beginners make, compiled with `language`: each is found, named
 * by a code, explained in Tajik (and Russian, English) with the line of code,
 * a caret and, where the compiler can tell, a hint. The Tajik output of these
 * programs contains no Latin letter.
 */
interface Mistake {
  name: string;
  source: string;
  code: string;
  /** Text the Tajik message contains. */
  message: string;
  /** Text the Tajik hint contains. */
  hint?: string;
  line: number;
  column?: number;
  severity?: Diagnostic['severity'];
}

const MISTAKES: Mistake[] = [
  {
    name: 'a missing closing brace',
    source: 'тағ а = 1;\nагар (а > 0) {\n  чоп(а);\n',
    code: 'PARSE_MISSING_CLOSE',
    message: 'Қавси пӯшандаи `}` намерасад. Қавси `{` дар сатри 2 кушода шудааст.',
    line: 3,
    column: 10,
  },
  {
    name: 'a missing closing parenthesis',
    source: 'чоп("салом";\n',
    code: 'PARSE_MISSING_CLOSE',
    message: 'Қавси пӯшандаи `)` намерасад. Қавси `(` дар ҳамин сатр кушода шудааст.',
    line: 1,
    column: 12,
  },
  {
    name: '; between arguments instead of ,',
    source: 'чоп(1; 2);\n',
    code: 'PARSE_MISSING_CLOSE',
    message: 'Қавси пӯшандаи `)` намерасад.',
    hint: 'Аргументҳоро бо вергул ҷудо кунед',
    line: 1,
    column: 6,
  },
  {
    name: ', between the parts of барои',
    source: 'барои (тағ и = 0, и < 3, и++) {\n  чоп(и);\n}\n',
    code: 'PARSE_EXPECTED_SEMICOLON',
    message: 'Дар ин ҷо `<` интизор набуд',
    hint: 'Қисмҳои `барои`-ро бо `;` ҷудо кунед',
    line: 1,
  },
  {
    name: 'a misspelt агар',
    source: 'тағ х = 5;\nагр (х > 1) {\n  чоп(х);\n}\n',
    code: 'PARSE_EXPECTED_SEMICOLON',
    message: 'Дар ин ҷо `{` интизор набуд: шояд пеш аз он `;` намерасад.',
    hint: 'Шояд `агар`-ро дар назар доштед?',
    line: 2,
  },
  {
    name: 'a misspelt тағ',
    source: 'тағь х = 5;\n',
    code: 'PARSE_EXPECTED_SEMICOLON',
    message: 'Дар ин ҷо `х` интизор набуд',
    hint: 'Шояд `тағ`-ро дар назар доштед?',
    line: 1,
  },
  {
    name: 'a misspelt вагарна',
    source: 'тағ х = 5;\nагар (х > 1) {\n  чоп(х);\n} вагарн {\n  чоп(0);\n}\n',
    code: 'PARSE_EXPECTED_SEMICOLON',
    message: '`{` интизор набуд',
    hint: 'Шояд `вагарна`-ро дар назар доштед?',
    line: 4,
  },
  {
    name: 'a misspelt variable',
    source: 'тағ ном = "Алӣ";\nчоп(нм);\n',
    code: 'UNDEFINED_IDENTIFIER',
    message: 'Номи `нм` эълон нашудааст.',
    hint: 'Шояд `ном`-ро дар назар доштед?',
    line: 2,
    column: 5,
  },
  {
    name: 'a variable used without being declared',
    source: 'ҳисоб = 5;\n',
    code: 'UNDEFINED_IDENTIFIER',
    message: 'Номи `ҳисоб` эълон нашудааст.',
    hint: 'Пеш аз истифода онро бо `тағ` ё `собит` эълон кунед.',
    line: 1,
  },
  {
    name: 'a new value for a собит',
    source: 'собит х = 1;\nх = 2;\n',
    code: 'CONST_ASSIGNMENT',
    message: 'Ба `х` қимати нав додан мумкин нест, зеро он бо `собит` эълон шудааст.',
    hint: 'бо `тағ` эълон кунед',
    line: 2,
    column: 1,
  },
  {
    name: '++ on a собит',
    source: 'собит х = 1;\nх++;\n',
    code: 'CONST_ASSIGNMENT',
    message: 'Ба `х` қимати нав додан мумкин нест',
    line: 2,
  },
  {
    name: 'too few arguments',
    source: 'функсия ҷамъ(а: рақам, б: рақам): рақам {\n  бозгашт а + б;\n}\nчоп(ҷамъ(1));\n',
    code: 'ARGUMENT_COUNT_MISMATCH',
    message: 'Функсия `ҷамъ` 2 аргумент мегирад, вале 1 аргумент дода шуд.',
    line: 4,
  },
  {
    name: 'агар without parentheses',
    source: 'тағ х = 5;\nагар х > 1 {\n  чоп(х);\n}\n',
    code: 'PARSE_CONDITION_PARENS',
    message: 'Пас аз `агар` қавси `(` лозим аст. Масалан: `агар (х > 0) { … }`',
    line: 2,
  },
  {
    name: 'то without parentheses',
    source: 'тағ х = 5;\nто х > 1 {\n  х--;\n}\n',
    code: 'PARSE_CONDITION_PARENS',
    message: 'Пас аз `то` қавси `(` лозим аст.',
    line: 2,
  },
  {
    name: '= instead of == in a condition',
    source: 'тағ х = 5;\nагар (х = 1) {\n  чоп(х);\n}\n',
    code: 'ASSIGNMENT_IN_CONDITION',
    message: 'Дар шарт `=` қимат медиҳад. Барои муқоисаи қиматҳо `===` ё `==` нависед.',
    line: 2,
    column: 7,
    severity: 'warning',
  },
  {
    name: 'a string without its closing quote',
    source: 'чоп("салом);\n',
    code: 'LEX_UNTERMINATED_STRING',
    message: 'Нохунаки пӯшандаи `"` намерасад',
    line: 1,
    column: 5,
  },
  {
    name: 'a word where a number belongs',
    source: 'тағ х: рақам = "панҷ";\n',
    code: 'TYPE_NOT_ASSIGNABLE',
    message: 'Қимати `"панҷ"` ба навъи `рақам` мувофиқ нест.',
    line: 1,
    column: 16,
  },
  {
    name: 'a number in quotes',
    source: 'тағ х: рақам = "5";\n',
    code: 'TYPE_NOT_ASSIGNABLE',
    message: 'Қимати `"5"` ба навъи `рақам` мувофиқ нест.',
    hint: 'Рақамро бе нохунак нависед: `5`.',
    line: 1,
  },
  {
    name: 'a misspelt console method',
    source: 'чоп.сабтт("салом");\n',
    code: 'PROPERTY_NOT_FOUND',
    message: '`чоп` хосияти `сабтт` надорад.',
    hint: 'Шояд `сабт`-ро дар назар доштед?',
    line: 1,
    column: 5,
  },
  {
    name: 'a misspelt member of an array',
    source: 'тағ р = [1, 2];\nчоп(р.дарози);\n',
    code: 'PROPERTY_NOT_FOUND',
    message: 'Дар навъи `рақам[]` хосияти `дарози` нест.',
    hint: 'Шояд `дарозӣ`-ро дар назар доштед?',
    line: 2,
    severity: 'warning',
  },
  {
    name: 'тағ for a name declared before',
    source: 'тағ х = 1;\nтағ х = 2;\n',
    code: 'CODEGEN_REDECLARED',
    message: 'Номи `х` аллакай эълон шудааст.',
    hint: '`х = …` нависед',
    line: 2,
    column: 5,
  },
  {
    name: 'a missing value after =',
    source: 'тағ х = ;\n',
    code: 'PARSE_EXPECTED_EXPRESSION',
    message: 'Дар ин ҷо қимат ё ифода лозим аст, вале `;` навишта шудааст.',
    line: 1,
    column: 9,
  },
  {
    name: 'a function without parentheses',
    source: 'функсия салом {\n  чоп("салом");\n}\n',
    code: 'PARSE_EXPECTED_OPEN',
    message: 'Дар ин ҷо қавси `(` лозим аст.',
    line: 1,
  },
  {
    name: 'a closing brace too many',
    source: 'тағ а = 1;\n}\n',
    code: 'PARSE_UNMATCHED_CLOSE',
    message: 'Қавси `}` зиёдатӣ аст',
    line: 2,
    column: 1,
  },
  {
    name: 'a missing closing bracket',
    source: 'тағ р = [1, 2;\n',
    code: 'PARSE_MISSING_CLOSE',
    message: 'Қавси пӯшандаи `]` намерасад.',
    line: 1,
  },
  {
    name: 'шикастан outside a loop',
    source: 'шикастан;\n',
    code: 'CODEGEN_OUTSIDE_LOOP',
    message: '`шикастан`-ро танҳо дар дохили давра ё `интихоб` навиштан мумкин аст.',
    line: 1,
  },
  {
    name: 'a function that returns the wrong type',
    source: 'функсия ф(): рақам {\n  бозгашт "а";\n}\n',
    code: 'TYPE_NOT_ASSIGNABLE',
    message: 'Функсия бояд қимати навъи `рақам` баргардонад, вале `"а"` бармегардонад.',
    line: 2,
  },
  {
    name: 'an argument of the wrong type',
    source: 'функсия ф(а: рақам) {}\nф("а");\n',
    code: 'ARGUMENT_TYPE_MISMATCH',
    message: 'Аргументи 1-уми функсия `ф` бояд навъи `рақам` дошта бошад',
    line: 2,
  },
  {
    name: 'two statements on one line without ;',
    source: 'тағ а = 1 тағ б = 2;\n',
    code: 'PARSE_EXPECTED_SEMICOLON',
    message: 'Дар ин ҷо `тағ` интизор набуд',
    line: 1,
    column: 11,
  },
  {
    name: 'calling математика',
    source: 'чоп(математика(1));\n',
    code: 'NOT_CALLABLE',
    message: '`математика` функсия нест',
    line: 1,
  },
  {
    name: 'a comment that is not closed',
    source: 'чоп(1);\n/* шарҳ\n',
    code: 'LEX_UNTERMINATED_COMMENT',
    message: 'Шарҳи `/*` бо `*/` баста нашудааст.',
    line: 2,
  },
];

function first(source: string, language: 'en' | 'ru' | 'tj'): Diagnostic {
  const diagnostics = compile(source, { language }).diagnostics ?? [];
  expect(diagnostics.length).toBeGreaterThan(0);
  return diagnostics[0];
}

describe('learner diagnostics of typical mistakes', () => {
  test('there are at least 15 of them', () => {
    expect(MISTAKES.length).toBeGreaterThanOrEqual(15);
  });

  describe.each(MISTAKES.map(mistake => [mistake.name, mistake] as const))(
    '%s',
    (_name, mistake) => {
      test('is found and explained in Tajik', () => {
        const diagnostic = first(mistake.source, 'tj');
        expect(diagnostic.code).toBe(mistake.code);
        expect(diagnostic.severity).toBe(mistake.severity ?? 'error');
        expect(diagnostic.message).toContain(mistake.message);
        expect(diagnostic.line).toBe(mistake.line);
        if (mistake.column !== undefined) expect(diagnostic.column).toBe(mistake.column);
        if (mistake.hint) expect(diagnostic.hint).toContain(mistake.hint);
      });

      test('has the same code in Russian and English, in other words', () => {
        const tj = first(mistake.source, 'tj');
        const ru = first(mistake.source, 'ru');
        const en = first(mistake.source, 'en');
        expect([ru.code, en.code]).toEqual([tj.code, tj.code]);
        expect(new Set([tj.message, ru.message, en.message]).size).toBe(3);
        expect(ru.message.replace(/`[^`]*`/g, '')).not.toMatch(/[A-Za-z]/);
      });

      test('prints no Latin letter in Tajik', () => {
        const result = compile(mistake.source, { language: 'tj' });
        const output = [...result.errors, ...result.warnings].join('\n');
        expect(output).not.toBe('');
        expect(output).not.toMatch(/[A-Za-z]/);
      });
    }
  );

  test('a message shows the line of code with a caret under the place', () => {
    const [error] = compile('тағ а = 1;\nагар (а > 0) {\n  чоп(а);\n', { language: 'tj' }).errors;
    expect(error).toBe(
      [
        'Хато дар сатри 3:',
        '  Қавси пӯшандаи `}` намерасад. Қавси `{` дар сатри 2 кушода шудааст.',
        '    2 | агар (а > 0) {',
        '      |              ^',
        '    3 |   чоп(а);',
        '      |          ^',
      ].join('\n')
    );
  });

  test('the caret covers the whole name', () => {
    const [error] = compile('тағ ном = 1;\nчоп(номи_дигар);\n', { language: 'tj' }).errors;
    expect(error.split('\n').slice(2, 4)).toEqual([
      '    2 | чоп(номи_дигар);',
      '      |     ^^^^^^^^^^',
    ]);
  });

  test('a mistake repeated on the same line is reported once', () => {
    expect(compile('чоп(1; 2);\n', { language: 'tj' }).errors).toHaveLength(1);
    expect(compile('чоп(1; 2);\n').errors).toHaveLength(2);
  });

  test('English keywords get the SomonScript word as a hint', () => {
    const diagnostic = first('тағ х = 1;\nif (х > 0) {\n  чоп(х);\n}\n', 'tj');
    expect(diagnostic.hint).toBe('Ба ҷои `if` `агар` нависед.');
    expect(first('print("салом");\n', 'ru').hint).toBe('Вместо `print` пишите `чоп`.');
  });

  test('a name the program declares is not taken for a misspelt keyword', () => {
    // `тар` is one edit from `тағ`, but the program declares it
    const diagnostic = first('тағ тар = 1;\nтар = 2 тар = 3;\n', 'tj');
    expect(diagnostic.code).toBe('PARSE_EXPECTED_SEMICOLON');
    expect(diagnostic.hint).toBeUndefined();
  });

  test('without a language the messages are the compiler English ones, as before', () => {
    const result = compile('тағ а = 1;\nагар (а > 0) {\n  чоп(а);\n');
    expect(result.errors).toEqual([
      "Parse error: Unexpected token end of input at line 4, column 1 (Expected '}' after block)",
    ]);
    expect(result.diagnostics).toBeUndefined();
    expect(compile('собит х = 1;\nх = 2;\n').errors).toEqual([
      "Type error [CONST_ASSIGNMENT] at line 2, column 1: Cannot assign to 'х' because it is a constant\n> х = 2;",
    ]);
  });

  test('errors come before warnings', () => {
    const result = compile('тағ х = 5;\nагар (х = 1) {}\nчоп(нест);\n', { language: 'tj' });
    expect(result.diagnostics!.map(d => d.severity)).toEqual(['error', 'warning']);
  });

  test('language implies the locale of the TypeScript checker', () => {
    const result = compile('тағ х: рақам = "а";\n', { language: 'tj', checker: 'typescript' });
    expect(result.diagnostics![0]).toMatchObject({ code: 'TS2322', line: 1, column: 5 });
    expect(result.diagnostics![0].message).toContain('мувофиқ нест');
  });
});

/**
 * The TypeScript checker on the repository's programs: every LeetCode
 * solution and every example type-checks cleanly in strict mode, so do the
 * programs of tests/operators.test.ts and the correct TypeScript 5 syntax
 * programs of tests/ts-syntax-*.test.ts (where TypeScript's rules are not
 * stricter), programs the SomonScript checker rejects are rejected too, and
 * wrong programs get TypeScript's errors at the right `.som` positions.
 */
import { compile, type CompileOptions } from '../src/compiler';
import {
  type CorpusProgram,
  examplePrograms,
  operatorPrograms,
  tsSyntaxPrograms,
} from './helpers/corpus';

jest.setTimeout(120000);

const programs = examplePrograms();

/** Errors of `source` as `[code, line, column]`. */
function errorsOf(source: string, filePath?: string): Array<[string, number, number]> {
  const result = compile(source, { checker: 'typescript', strict: true, filePath });
  return result.errors.map(error => {
    const match = /^Type error \[(TS\d+)\] at line (\d+), column (\d+)/.exec(error);
    if (!match) throw new Error(`Not a type error: ${error}`);
    return [match[1], Number(match[2]), Number(match[3])];
  });
}

describe('strict TypeScript checking of the repository', () => {
  test('there are 100 LeetCode solutions and the examples', () => {
    expect(programs.filter(program => program.kind === 'leetcode')).toHaveLength(100);
    expect(programs.filter(program => program.kind !== 'leetcode').length).toBeGreaterThan(70);
  });

  test.each(programs.map(program => [program.name, program] as const))(
    '%s type-checks',
    (_name, program) => {
      const result = compile(program.source, {
        checker: 'typescript',
        strict: true,
        filePath: program.file,
      });
      expect(result.errors).toEqual([]);
      expect(result.code).not.toBe('');
    }
  );
});

/** TypeScript error codes of a program, in strict mode unless `strict` is false. */
function codesOf(program: CorpusProgram, options: CompileOptions = {}): string[] {
  const result = compile(program.source, {
    checker: 'typescript',
    strict: true,
    experimentalDecorators: program.experimentalDecorators,
    ...options,
  });
  return result.errors.map(error => /^Type error \[(TS\d+)\]/.exec(error)?.[1] ?? error);
}

/**
 * Correct programs that TypeScript rejects by design, found by a word of
 * their source, with the errors it reports.
 */
const STRICTER_IN_TYPESCRIPT: ReadonlyArray<[string, string[], string]> = [
  ['1 == "1"', ['TS2367', 'TS2367', 'TS2367'], 'comparisons of types without overlap'],
  ['(1, 2, 3)', ['TS2695'], 'the left side of a comma operator has no effect'],
  ['тасдиқиПур', ['TS2775'], 'an assertion call needs an explicitly typed target'],
  ['бознавис ҳарчӣ', ['TS4113'], "'override' of a member Error does not have"],
  ['а < б > в, а < б > +1', ['TS2365', 'TS2365', 'TS2365', 'TS2365'], 'a comparison compared'],
];

/** Programs that import modules of their own, which exist only in their tests. */
const importsOwnModules = (program: CorpusProgram): boolean =>
  /аз "\.\.?\/|require\("\.\.?\//.test(program.source);

/** The TypeScript 5 syntax programs the compiler accepts (some tests expect errors). */
const tsSyntax = tsSyntaxPrograms().filter(
  program =>
    !importsOwnModules(program) &&
    compile(program.source, {
      typeCheck: false,
      experimentalDecorators: program.experimentalDecorators,
    }).errors.length === 0
);

describe('the operator and TypeScript 5 syntax programs', () => {
  const correct = [
    ...operatorPrograms().filter(program => !importsOwnModules(program)),
    ...tsSyntax.filter(program => program.helper === 'run' || program.helper === 'expectClean'),
  ];

  test('there are enough of them', () => {
    expect(correct.length).toBeGreaterThan(130);
    expect(tsSyntax.filter(program => program.helper === 'check').length).toBeGreaterThan(15);
  });

  test.each(correct.map(program => [program.name, program] as const))(
    '%s type-checks',
    (_name, program) => {
      const stricter = STRICTER_IN_TYPESCRIPT.find(([word]) => program.source.includes(word));
      expect(codesOf(program)).toEqual(stricter?.[1] ?? []);
      expect(codesOf(program, { strict: false })).toEqual(stricter?.[1] ?? []);
    }
  );

  test('every exception is used', () => {
    for (const [word] of STRICTER_IN_TYPESCRIPT) {
      expect(correct.some(program => program.source.includes(word))).toBe(true);
    }
  });

  // `check` programs of tests/ts-syntax-checker.test.ts have type errors
  test.each(
    tsSyntax
      .filter(
        program =>
          program.helper === 'check' &&
          compile(program.source, { strict: true }).errors.some(error =>
            error.startsWith('Type error')
          )
      )
      .map(program => [program.name, program] as const)
  )('%s is rejected by TypeScript too', (_name, program) => {
    expect(codesOf(program).length).toBeGreaterThan(0);
  });
});

describe('wrong programs get the expected errors', () => {
  test.each<[string, string, Array<[string, number, number]>]>([
    ['assignment', 'тағ х: рақам = "а";', [['TS2322', 1, 5]]],
    ['argument', 'функсия ф(а: рақам): рақам { бозгашт а; }\nф("ду");', [['TS2345', 2, 3]]],
    ['argument count', 'функсия ф(а: рақам) {}\nф(1, 2);', [['TS2554', 2, 6]]],
    ['unknown name', 'тағ а = 1;\nчоп.сабт(б);', [['TS2304', 2, 10]]],
    ['unknown member', 'собит о = { а: 1 };\nчоп.сабт(о.б);', [['TS2339', 2, 12]]],
    [
      'Tajik member on a Map',
      'собит м = нав Map<сатр, рақам>();\nагар (м.дорад("а")) {}',
      [['TS2339', 2, 9]],
    ],
    [
      'possibly null',
      'функсия ф(с: сатр | холӣ): рақам {\n    бозгашт с.дарозӣ;\n}',
      [['TS18047', 2, 13]],
    ],
    [
      'missing return',
      'функсия ф(х: рақам): сатр {\n    агар (х > 0) { бозгашт "+"; }\n}',
      [['TS2366', 1, 22]],
    ],
    ['implicit any', 'функсия ф(х) { бозгашт х; }', [['TS7006', 1, 11]]],
    ['private member', 'синф К { хосусӣ х = 1; }\nчоп.сабт(нав К().х);', [['TS2341', 2, 18]]],
    ['abstract class', 'мавҳум синф Ш {}\nтағ ш = нав Ш();', [['TS2511', 2, 9]]],
    [
      'missing property',
      'интерфейс Корбар { ном: сатр; синну: рақам; }\nтағ к: Корбар = { ном: "Алӣ" };',
      [['TS2741', 2, 5]],
    ],
    [
      'excess property',
      'интерфейс Нуқта { х: рақам; }\nтағ н: Нуқта = { х: 1, у: 2 };',
      [['TS2353', 2, 24]],
    ],
    ['readonly property', 'синф К { танҳохонӣ х = 1; }\nнав К().х = 2;', [['TS2540', 2, 9]]],
    ['constant', 'собит х = 1;\nх = 2;', [['TS2588', 2, 1]]],
    [
      'constraint',
      'функсия ф<Т мерос сатр>(х: Т): Т { бозгашт х; }\nф<рақам>(1);',
      [['TS2344', 2, 3]],
    ],
    ['property initialization', 'синф К {\n    ном: сатр;\n}', [['TS2564', 2, 5]]],
    ['await outside async', 'функсия ф() {\n    интизор Ваъда.resolve(1);\n}', [['TS1308', 2, 5]]],
    ['enum', 'шумориш Ранг { Сурх, Сабз }\nтағ р: Ранг = "Сурх";', [['TS2322', 2, 5]]],
    ['tuple', 'тағ н: [рақам, сатр] = [1, 2];', [['TS2322', 1, 28]]],
    [
      'catch variable is unknown',
      'кӯшиш {} гирифтан (хато) {\n    чоп.сабт(хато.message);\n}',
      [['TS18046', 2, 14]],
    ],
  ])('%s', (_name, source, expected) => {
    expect(errorsOf(source)).toEqual(expected);
  });
});

/**
 * The TypeScript checker on the repository's programs: every LeetCode
 * solution and every example type-checks cleanly in strict mode, and wrong
 * programs get TypeScript's errors at the right `.som` positions.
 */
import { compile } from '../src/compiler';
import { examplePrograms } from './helpers/corpus';

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

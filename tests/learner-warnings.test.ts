import * as fs from 'fs';
import * as path from 'path';
import * as vm from 'vm';

import { compile as compileInBrowser } from '../src/browser';
import { compile } from '../src/compiler';
import { isLearningMode, loadConfig } from '../src/config';
import { runProgram, type RunEvent } from '../src/playground/run';
import { canonicalTmpDir } from './helpers/paths';
import { runInProcess } from './helpers/cli-in-process';

/** The warnings of the learning mode (src/learner/warnings.ts). */
const learner = (source: string, options = {}) =>
  (compile(source, { learningMode: true, language: 'tj', ...options }).diagnostics ?? [])
    .filter(d => d.code.startsWith('LEARNER_'))
    .map(d => [d.code, d.line]);

describe('warnings of the learning mode', () => {
  test('arithmetic with a string', () => {
    expect(learner('чоп("5" * 2);\nчоп(хондан() - 1);\nчоп(2 ** "3");')).toEqual([
      ['LEARNER_STRING_ARITHMETIC', 1],
      ['LEARNER_STRING_ARITHMETIC', 2],
      ['LEARNER_STRING_ARITHMETIC', 3],
    ]);
    expect(learner('чоп(6 * 2, 7 % 2);')).toEqual([]);
  });

  test('a line read with хондан() added to a number', () => {
    expect(learner('тағ а = хондан();\nчоп(а + 1);\nчоп(2 + хондан());')).toEqual([
      ['LEARNER_STRING_PLUS_NUMBER', 2],
      ['LEARNER_STRING_PLUS_NUMBER', 3],
    ]);
    // Joining text with a number on purpose, or two lines, is no mistake
    const joined =
      'тағ н = хонданиРақам();\nтағ хат = "";\nхат += н;\nчоп("Ҷавоб: " + н, н + " × 2", хат);\n' +
      'чоп(хондан() + хондан());';
    expect(learner(joined)).toEqual([]);
    // A program with its own хондан
    expect(learner('функсия хондан(): рақам {\n  бозгашт 1;\n}\nчоп(хондан() + 1);')).toEqual([]);
  });

  test('=== and !== between a string and a number', () => {
    const source =
      'тағ х = хонданиРақам();\nчоп(х === "5", "а" !== 1, х === 5, х == "5", [1] === "1", дуруст === 1);';
    expect(learner(source)).toEqual([
      ['LEARNER_COMPARE_TYPES', 2],
      ['LEARNER_COMPARE_TYPES', 2],
    ]);
    expect(compile(source, { learningMode: true, language: 'tj' }).warnings[0]).toContain(
      '`рақам` бо `сатр` муқоиса мешавад'
    );
  });

  test('variables that are never used', () => {
    const source = [
      'тағ а = 1;',
      'собит _б = 2;',
      'тағ в = 3;',
      'тағ { г } = { г: 4 };',
      'содир собит д = 5;',
      'эълон тағ е: рақам;',
      'тағ о = { в: 1 };',
      'чоп(о.в, о[в]);',
      'функсия ф(параметр: рақам) {}',
      'ф(1);',
    ].join('\n');
    expect(learner(source)).toEqual([['LEARNER_UNUSED_VARIABLE', 1]]);
    expect(learner('содир тағ а = 1, б = 2;')).toEqual([]);
    expect(learner('тағ а = 1;\nсодир { а };')).toEqual([]);
    expect(learner('номфазо Н {\n  содир собит П = 3;\n}\nчоп(Н.П);')).toEqual([]);
  });

  test('own properties named like built-in members', () => {
    const source = [
      'тағ о = { дарозӣ: 5, ном: "А", ["вақт"]: 1, баСатр() { бозгашт "о"; } };',
      'синф К {',
      '  хато = 1;',
      '  илова(х: рақам): рақам { бозгашт х; }',
      '}',
      'чоп(о, нав К());',
    ].join('\n');
    expect(learner(source)).toEqual([
      ['LEARNER_BUILTIN_MEMBER_NAME', 1],
      ['LEARNER_BUILTIN_MEMBER_NAME', 3],
    ]);
    expect(compile(source, { learningMode: true, language: 'ru' }).warnings[0]).toContain(
      'в JavaScript это свойство называется `length`'
    );
  });

  test('come with the checker warnings, in the order of the lines, also with --strict', () => {
    const result = compile('тағ а = 1;\nтағ б: рақам = "х";\nчоп(б, "1" * 1);', {
      learningMode: true,
      strict: true,
    });
    expect(result.errors).toHaveLength(1);
    expect(result.warnings.map(w => w.split(' ')[2])).toEqual([
      '[LEARNER_UNUSED_VARIABLE]',
      '[LEARNER_STRING_ARITHMETIC]',
    ]);
    expect(compile('тағ а = 1;').warnings).toEqual([]);
  });

  test('the compiler for browsers and the playground have them too', async () => {
    expect(compileInBrowser('тағ а = 1;', { learningMode: true }).warnings[0]).toContain(
      'The variable `а` is declared but never used.'
    );
    const events: RunEvent[] = [];
    await new Promise<void>(resolve => {
      runProgram(
        { source: 'тағ а = 1;\nчоп(2);', input: '', language: 'tj', learningMode: true },
        {
          post: event => {
            events.push(event);
            if (event.type === 'done') resolve();
          },
          scope: vm.createContext({}) as Record<string, unknown>,
          timers: { setTimeout, clearTimeout, setInterval, clearInterval } as never,
          script: code => ({ file: 'б.js', run: () => vm.runInNewContext(code, {}) }),
        }
      );
    });
    expect(events[0]).toMatchObject({
      type: 'compiled',
      diagnostics: [{ severity: 'warning', line: 1 }],
    });
  });
});

describe('"режим": "таълимӣ" in somon.config.json', () => {
  let dir: string;

  beforeEach(() => {
    dir = canonicalTmpDir('somon-learning-mode-');
    fs.writeFileSync(path.join(dir, 'барнома.som'), 'тағ а = 1;\nчоп(2);\n');
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const configure = (config: object) =>
    fs.writeFileSync(path.join(dir, 'somon.config.json'), JSON.stringify(config));

  test('turns the learning mode on; "оддӣ" and no mode leave it off', () => {
    configure({ режим: 'таълимӣ' });
    expect(isLearningMode(loadConfig(dir))).toBe(true);
    configure({ режим: 'оддӣ' });
    expect(isLearningMode(loadConfig(dir))).toBe(false);
    configure({});
    expect(isLearningMode(loadConfig(dir))).toBe(false);
    configure({ режим: 'бозӣ' });
    expect(() => loadConfig(dir)).toThrow('Invalid configuration');
  });

  test('somon compile and somon run warn in the learning mode', async () => {
    configure({ режим: 'таълимӣ' });
    const compiled = await runInProcess(['compile', 'барнома.som'], { cwd: dir, lang: 'tj' });
    expect(compiled.exitCode).toBe(0);
    expect(compiled.stderr).toContain('Тағйирёбандаи `а` эълон шудааст, вале истифода намешавад.');
    const ran = await runInProcess(['run', 'барнома.som'], { cwd: dir, lang: 'tj' });
    expect(ran.stderr).toContain('Огоҳӣ дар барнома.som, сатри 1: Тағйирёбандаи `а`');
    configure({});
    const ordinary = await runInProcess(['compile', 'барнома.som'], { cwd: dir, lang: 'tj' });
    expect(ordinary.stderr).not.toContain('Тағйирёбандаи');
  }, 60000);
});

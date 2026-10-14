import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

import { buildCliOnce, canonicalTmpDir } from './helpers/paths';

/**
 * Errors of running programs with `somon --lang tj run`: what happened in
 * Tajik, the line of the .som file and its code with a caret; no stack of
 * Node.js, no generated JavaScript; the exit code stays non-zero.
 */
interface Failure {
  source: string;
  message: string;
  line: number;
  /** The caret line under the code. */
  caret?: string;
  hint?: string;
}

const FAILURES: Record<string, Failure> = {
  'reading a member of беқимат': {
    source: 'тағ р = [1, 2, 3];\nтағ х = р[10].дарозӣ;\n',
    message: 'Хосияти `дарозӣ`-ро хондан мумкин нест: қимат `беқимат` аст.',
    line: 2,
    caret: '      |               ^^^^^^',
    hint: 'индексҳо аз 0 то `дарозӣ - 1` мебошанд',
  },
  'reading a member of холӣ': {
    source: 'тағ о: ҳар = холӣ;\nчоп(о.ном);\n',
    message: 'Хосияти `ном`-ро хондан мумкин нест: қимат `холӣ` аст.',
    line: 2,
  },
  'a name that is not defined': {
    source: 'чоп(window.андоза);\n',
    message: 'Номи `window` муайян нашудааст.',
    line: 1,
  },
  'a name used before it is declared': {
    source: 'чоп(х);\nтағ х = 1;\n',
    message: '`х` пеш аз эълон шуданаш истифода шудааст.',
    line: 1,
  },
  'calling what is no function': {
    source: 'тағ о = {};\nо.ф();\n',
    message: '`о.ф` функсия нест ва онро даъват кардан мумкин нест.',
    line: 2,
    caret: '      |   ^',
  },
  'endless recursion': {
    source: 'функсия ф(н: рақам): рақам {\n  бозгашт ф(н + 1);\n}\nчоп(ф(1));\n',
    message: 'Шояд функсия худашро беохир даъват мекунад?',
    line: 2,
    caret: '      |           ^',
    hint: 'шарти қатъ лозим дорад',
  },
  'a list of invalid length': {
    source: 'тағ н = -1;\nтағ р = нав рӯйхат(н);\n',
    message: 'Дарозии рӯйхат нодуруст аст',
    line: 2,
  },
  'an error the program throws': {
    source:
      'функсия тақсим(а: рақам, б: рақам): рақам {\n' +
      '  агар (б === 0) партофтан нав Хато("Ба сифр тақсим кардан мумкин нест");\n' +
      '  бозгашт а / б;\n}\nчоп(тақсим(1, 0));\n',
    message: 'Барнома хато партофт: Ба сифр тақсим кардан мумкин нест',
    line: 2,
  },
  'an error in a ҳамзамон function': {
    source: 'ҳамзамон функсия ф() {\n  тағ р: ҳар = беқимат;\n  бозгашт р.дарозӣ;\n}\nф();\n',
    message: 'Хосияти `дарозӣ`-ро хондан мумкин нест',
    line: 3,
  },
};

describe('run-time errors for learners', () => {
  let cliPath: string;
  let dir: string;

  beforeAll(() => {
    cliPath = buildCliOnce();
  });

  beforeEach(() => {
    dir = canonicalTmpDir('somon-runtime-cli-');
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const run = (source: string, args: string[] = [], lang = 'tj') => {
    fs.writeFileSync(path.join(dir, 'барнома.som'), source);
    return spawnSync(process.execPath, [cliPath, '--lang', lang, 'run', 'барнома.som', ...args], {
      cwd: dir,
      encoding: 'utf-8',
    });
  };

  test.each(Object.entries(FAILURES))('%s', (_name, failure) => {
    const result = run(failure.source);
    expect(result.status).toBe(1);
    // A compiler warning may come first, on its own line
    const lines = result.stderr.split('\n').filter(line => !line.startsWith('Огоҳӣ'));
    expect(lines[0]).toBe(`Хатои иҷро дар барнома.som, сатри ${failure.line}:`);
    expect(lines[1]).toContain(failure.message);
    const code = failure.source.split('\n')[failure.line - 1];
    expect(result.stderr).toContain(`    ${failure.line} | ${code}`);
    if (failure.caret) expect(result.stderr).toContain(`${failure.caret}\n`);
    if (failure.hint) expect(result.stderr).toContain(failure.hint);
    for (const internal of ['node:internal', '.js:', 'TypeError', 'ReferenceError', 'RangeError']) {
      expect(result.stderr).not.toContain(internal);
    }
  });

  test('ES module programs report the same way', () => {
    fs.writeFileSync(path.join(dir, 'а.som'), 'тағ о: ҳар = холӣ;\nчоп(о.ном);\n');
    const result = spawnSync(
      process.execPath,
      [cliPath, '--lang', 'tj', 'run', '--module', 'esm', 'а.som'],
      { cwd: dir, encoding: 'utf-8' }
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Хатои иҷро дар а.som, сатри 2:');
    expect(result.stderr).not.toContain('.js:');
  });

  test('a file in another directory is named relative to the current one', () => {
    fs.mkdirSync(path.join(dir, 'дарс'));
    fs.writeFileSync(path.join(dir, 'дарс', 'б.som'), 'тағ о = {};\nо.ф();\n');
    const result = spawnSync(
      process.execPath,
      [cliPath, '--lang', 'ru', 'run', path.join('дарс', 'б.som')],
      { cwd: dir, encoding: 'utf-8' }
    );
    expect(result.stderr.split('\n')[0]).toBe(
      `Ошибка выполнения в ${path.join('дарс', 'б.som')}, строка 2:`
    );
  });

  test('--стек and --stack show the full stack after the message', () => {
    for (const flag of ['--стек', '--stack']) {
      const result = run('тағ о = {};\nо.ф();\n', [flag]);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('`о.ф` функсия нест');
      expect(result.stderr).toContain('TypeError: о.ф is not a function');
      expect(result.stderr).toMatch(/барнома\.som:2:\d+/);
    }
  });

  test('output before the error is printed, and the program arguments still work', () => {
    const result = run('чоп("пеш");\nтағ о: ҳар = холӣ;\nчоп(о.х);\n');
    expect(result.stdout).toBe('пеш\n');
    expect(result.status).toBe(1);
  });

  test('in English the error of Node.js is shown as before', () => {
    const result = run('тағ о = {};\nо.ф();\n', [], 'en');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('TypeError: о.ф is not a function');
  });

  test('a program that ends normally is not affected', () => {
    expect(run('чоп(1);\n')).toMatchObject({ status: 0, stdout: '1\n', stderr: '' });
  });
});

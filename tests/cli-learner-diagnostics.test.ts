import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

import * as cliProgram from '../src/cli/program';
import { i18n } from '../src/cli/i18n';
import { BundleError, ModuleSystem } from '../src/module-system/module-system';
import { buildCliOnce, canonicalTmpDir } from './helpers/paths';

/**
 * `somon run` and `somon compile` with a Tajik or Russian language: the
 * errors of the compiler as learners read them, with no English word.
 */
const PROGRAMS: Record<string, string> = {
  'қавс.som': 'тағ а = 1;\nагар (а > 0) {\n  чоп(а);\n',
  'ном.som': 'тағ ном = "Алӣ";\nчоп(нм);\n',
  'собит.som': 'собит х = 1;\nх = 2;\n',
  'навъ.som': 'тағ х: рақам = "панҷ";\n',
  'калима.som': 'тағ х = 5;\nагр (х > 1) {\n  чоп(х);\n}\n',
  'модул.som': 'ворид { а } аз "./нест";\nчоп(а);\n',
};

describe('learner diagnostics in the CLI', () => {
  let cliPath: string;
  let dir: string;

  beforeAll(() => {
    cliPath = buildCliOnce();
  });

  beforeEach(() => {
    dir = canonicalTmpDir('somon-learner-cli-');
    for (const [name, source] of Object.entries(PROGRAMS)) {
      fs.writeFileSync(path.join(dir, name), source);
    }
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const cli = (args: string[], env: Record<string, string> = {}) =>
    spawnSync(process.execPath, [cliPath, ...args], {
      cwd: dir,
      encoding: 'utf-8',
      env: { ...process.env, SOMON_LANG: '', LC_ALL: '', LC_MESSAGES: '', LANG: '', ...env },
    });

  test.each(Object.keys(PROGRAMS))('run %s: Tajik only, the exit code is 1', name => {
    const result = cli(['--lang', 'tj', 'run', name]);
    expect(result.status).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr.startsWith(`Хато дар ${name}, сатри `)).toBe(true);
    expect(result.stderr.endsWith('Барнома компайл нашуд: 1 хато.\n')).toBe(true);
    // No Latin letter but in the file's name
    expect(result.stderr.split(name).join('')).not.toMatch(/[A-Za-z]/);
  });

  test('the missing brace, as the learner sees it', () => {
    expect(cli(['--lang', 'tj', 'run', 'қавс.som']).stderr).toBe(
      [
        'Хато дар қавс.som, сатри 3:',
        '  Қавси пӯшандаи `}` намерасад. Қавси `{` дар сатри 2 кушода шудааст.',
        '    2 | агар (а > 0) {',
        '      |              ^',
        '    3 |   чоп(а);',
        '      |          ^',
        'Барнома компайл нашуд: 1 хато.',
        '',
      ].join('\n')
    );
  });

  test('the language comes from SOMON_LANG and LANG too', () => {
    expect(cli(['run', 'ном.som'], { SOMON_LANG: 'tj' }).stderr).toContain(
      'Номи `нм` эълон нашудааст.'
    );
    expect(cli(['run', 'ном.som'], { LANG: 'ru_RU.UTF-8' }).stderr).toContain(
      'Имя `нм` не объявлено.'
    );
  });

  test('compile and bundle report the same way', () => {
    const compiled = cli(['--lang', 'tj', 'compile', 'собит.som']);
    expect(compiled.status).toBe(1);
    expect(compiled.stderr).toContain(
      'Хато дар собит.som, сатри 2:\n  Ба `х` қимати нав додан мумкин нест'
    );
    expect(compiled.stderr).toContain('Барнома компайл нашуд: 1 хато.');
    const bundled = cli(['--lang', 'ru', 'bundle', 'навъ.som']);
    expect(bundled.status).toBe(1);
    expect(bundled.stderr).toContain('Ошибка в навъ.som, строка 1:');
    expect(bundled.stderr).toContain('Программа не скомпилирована: 1 ошибка.');
  });

  test('ES module programs report the same way', () => {
    const result = cli(['--lang', 'tj', 'run', '--module', 'esm', 'навъ.som']);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Қимати `"панҷ"` ба навъи `рақам` мувофиқ нест.');
  });

  test('in English the messages stay as they were', () => {
    const result = cli(['run', 'қавс.som']);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Bundle process failed with 1 error(s):');
    expect(result.stderr).toContain("(Expected '}' after block)");
  });
});

describe('learner diagnostics of a failure without a diagnostic', () => {
  let dir: string;
  let cwd: string;

  beforeEach(() => {
    dir = canonicalTmpDir('somon-learner-in-process-');
    cwd = process.cwd();
    process.chdir(dir);
    process.exitCode = undefined;
  });

  afterEach(() => {
    process.chdir(cwd);
    fs.rmSync(dir, { recursive: true, force: true });
    i18n.setLanguage('en');
    process.exitCode = undefined;
    jest.restoreAllMocks();
  });

  test('its message is shown as it is, under the file and line', async () => {
    fs.writeFileSync(path.join(dir, 'а.som'), 'чоп(1);\n');
    const failure = new BundleError(
      'Bundle process failed',
      [
        {
          message: 'Unexpected error: boom',
          filePath: path.join(dir, 'а.som'),
          line: 1,
          column: 1,
        },
        { message: 'нест', filePath: path.join(dir, 'нест.som') },
      ],
      []
    );
    jest.spyOn(ModuleSystem.prototype, 'bundle').mockRejectedValue(failure);
    const errors: string[] = [];
    jest.spyOn(console, 'error').mockImplementation((...args) => {
      errors.push(args.join(' '));
    });
    i18n.setLanguage('tj');
    const program = cliProgram.createProgram();
    program.exitOverride();
    await program.parseAsync(['run', 'а.som'], { from: 'user' });
    expect(errors).toEqual([
      'Хато дар а.som, сатри 1:\n  Unexpected error: boom\n    1 | чоп(1);\n      | ^',
      'Хато дар нест.som:\n  нест',
      'Барнома компайл нашуд: 2 хато.',
    ]);
    expect(process.exitCode).toBe(1);
  });

  test('a configuration that does not load is reported by the command', async () => {
    fs.writeFileSync(path.join(dir, 'а.som'), 'чоп(1);\n');
    fs.writeFileSync(path.join(dir, 'somon.config.json'), '{ "compilerOptions": { "strict": 1 } }');
    const errors: string[] = [];
    jest.spyOn(console, 'error').mockImplementation((...args) => {
      errors.push(args.join(' '));
    });
    i18n.setLanguage('tj');
    const program = cliProgram.createProgram();
    program.exitOverride();
    await program.parseAsync(['run', 'а.som'], { from: 'user' });
    expect(errors[0]).toBe(i18n.t().common.configError);
    expect(process.exitCode).toBe(1);
  });
});

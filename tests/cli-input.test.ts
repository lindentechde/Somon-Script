import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

import { buildCliOnce, canonicalTmpDir } from './helpers/paths';

/**
 * `somon run` of programs that read input with `хондан()` and
 * `хонданиРақам()`: from a pipe and from a file redirected to standard input
 * (`somon run sum.som < sum.txt`), and the errors at the end of the input or
 * where a number is missing.
 */
describe('somon run with input', () => {
  const examples = path.join(__dirname, '..', 'examples', 'input');
  let cliPath: string;
  let dir: string;

  beforeAll(() => {
    cliPath = buildCliOnce();
  });

  beforeEach(() => {
    dir = canonicalTmpDir('somon-input-cli-');
    fs.copyFileSync(path.join(examples, 'sum.som'), path.join(dir, 'sum.som'));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const run = (input: string, args: string[] = []) =>
    spawnSync(process.execPath, [cliPath, ...args, 'run', 'sum.som'], {
      cwd: dir,
      encoding: 'utf-8',
      input,
    });

  test('the example sums two numbers from a pipe', () => {
    const result = run('2\n3\n');
    expect(result.stderr).toBe('');
    expect(result.stdout).toBe('Рақами якум: Рақами дуюм: Ҷамъ: 5\n');
    expect(result.status).toBe(0);
  });

  test('the example sums two numbers from a file redirected to its input', () => {
    const input = fs.openSync(path.join(examples, 'sum.txt'), 'r');
    try {
      const result = spawnSync(process.execPath, [cliPath, 'run', 'sum.som'], {
        cwd: dir,
        encoding: 'utf-8',
        stdio: [input, 'pipe', 'pipe'],
      });
      expect(result.stdout).toBe('Рақами якум: Рақами дуюм: Ҷамъ: 5\n');
      expect(result.status).toBe(0);
    } finally {
      fs.closeSync(input);
    }
  });

  test('Windows line breaks, a decimal comma and a last line without a line break', () => {
    expect(run('2,5\r\n0.5').stdout).toBe('Рақами якум: Рақами дуюм: Ҷамъ: 3\n');
  });

  test('a line that is no number: the line of the program, a caret and a hint', () => {
    const result = run('2\nсе\n', ['--lang', 'tj']);
    expect(result.status).toBe(1);
    expect(result.stdout).toBe('Рақами якум: Рақами дуюм: ');
    expect(result.stderr).toBe(
      [
        'Хатои иҷро дар sum.som, сатри 9:',
        '  `се` рақам нест: `хонданиРақам()` рақам интизор буд.',
        '    9 | тағ б = хонданиРақам("Рақами дуюм: ");',
        '      |         ^^^^^^^^^^^^',
        '  Маслиҳат: Дар ин сатри вуруд рақам нависед, масалан `42` ё `2,5`.',
        '',
      ].join('\n')
    );
  });

  test('the end of the input', () => {
    const result = run('2\n', ['--lang', 'tj']);
    expect(result.status).toBe(1);
    expect(result.stderr.split('\n').slice(0, 2)).toEqual([
      'Хатои иҷро дар sum.som, сатри 9:',
      '  Вуруд тамом шуд: `хонданиРақам()` боз як сатр интизор буд.',
    ]);
    expect(result.stderr).toContain('Ба барнома ҳамон қадар сатри вуруд диҳед');
    for (const internal of ['node:internal', '.js:', 'InputError']) {
      expect(result.stderr).not.toContain(internal);
    }
  });

  test('in Russian', () => {
    const result = run('', ['--lang', 'ru']);
    expect(result.stderr.split('\n').slice(0, 2)).toEqual([
      'Ошибка выполнения в sum.som, строка 8:',
      '  Ввод закончился: `хонданиРақам()` ждала ещё одну строку.',
    ]);
  });

  test('ES module programs and modules that read input in turn', () => {
    fs.writeFileSync(
      path.join(dir, 'ном.som'),
      'содир функсия ном(): сатр {\n  бозгашт хондан();\n}\n'
    );
    fs.writeFileSync(
      path.join(dir, 'асосӣ.som'),
      'ворид { ном } аз "./ном";\nтағ а = ном();\nтағ б = хондан();\nчоп(а + " ва " + б);\n'
    );
    for (const args of [[], ['--module', 'esm']]) {
      const result = spawnSync(process.execPath, [cliPath, 'run', ...args, 'асосӣ.som'], {
        cwd: dir,
        encoding: 'utf-8',
        input: 'Алӣ\nВалӣ\n',
      });
      expect(result.stderr).toBe('');
      expect(result.stdout).toBe('Алӣ ва Валӣ\n');
    }
  });
});

/**
 * src/cli/tool-commands.ts through the program, in-process: `fmt`, `migrate`
 * and `repl` with their options, messages in every language and exit codes.
 */
import * as fs from 'fs';
import * as path from 'path';
import { PassThrough } from 'stream';

import en from '../src/cli/i18n/translations/en';
import ru from '../src/cli/i18n/translations/ru';
import tj from '../src/cli/i18n/translations/tj';
import { runInProcess, writeFiles } from './helpers/cli-in-process';
import { canonicalTmpDir } from './helpers/paths';

jest.setTimeout(30000);

const translations = { en, ru, tj } as const;
const packageVersion = (
  JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')) as {
    version: string;
  }
).version;

const UNFORMATTED = 'тағ а=1\nагар(а){\nчоп.сабт(а)\n}\n';
const FORMATTED = 'тағ а = 1;\nагар (а) {\n    чоп.сабт(а);\n}\n';

let dir: string;
let written: string[];
let write: jest.SpyInstance;

beforeEach(() => {
  dir = canonicalTmpDir('somon-cli-tools-cov-');
  written = [];
  write = jest.spyOn(process.stdout, 'write').mockImplementation(((
    chunk: string,
    encoding?: unknown,
    callback?: () => void
  ) => {
    written.push(String(chunk));
    (typeof encoding === 'function' ? (encoding as () => void) : callback)?.();
    return true;
  }) as never);
});

afterEach(() => {
  write.mockRestore();
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('fmt', () => {
  test.each(['en', 'ru', 'tj'] as const)('--check, then --write, in %s', async lang => {
    const messages = translations[lang].commands.fmt.messages;
    writeFiles(dir, { 'a.som': UNFORMATTED, 'b.som': FORMATTED });
    const check = await runInProcess(['fmt', '--check', 'a.som', 'b.som'], { cwd: dir, lang });
    expect(check).toEqual({
      stdout: messages.wouldReformat('a.som'),
      stderr: messages.checkFailed(1),
      exitCode: 1,
    });
    expect(fs.readFileSync(path.join(dir, 'a.som'), 'utf8')).toBe(UNFORMATTED);

    const name = translations[lang].commands.fmt.name;
    const fix = await runInProcess([name, '.', '--write'], { cwd: dir, lang });
    expect(fix.stdout.split('\n')).toEqual([messages.formatted('a.som'), messages.summary(1, 2)]);
    expect(fix.exitCode).toBe(0);
    expect(fs.readFileSync(path.join(dir, 'a.som'), 'utf8')).toBe(FORMATTED);

    const passed = await runInProcess(['fmt', '--check', '.'], { cwd: dir, lang });
    expect(passed).toEqual({ stdout: messages.checkPassed(2), stderr: '', exitCode: 0 });
  });

  test('--stdout prints the code, reports go to stderr, and --check still fails', async () => {
    writeFiles(dir, { 'a.som': UNFORMATTED });
    const result = await runInProcess(['fmt', 'a.som', '--stdout', '--check', '--indent', '2'], {
      cwd: dir,
    });
    expect(written.join('')).toBe('тағ а = 1;\nагар (а) {\n  чоп.сабт(а);\n}\n');
    expect(result.stdout).toBe('');
    expect(result.stderr.split('\n')).toEqual([
      'Not formatted: a.som',
      '1 file(s) are not formatted',
    ]);
    expect(result.exitCode).toBe(1);

    written.length = 0;
    const plain = await runInProcess(['fmt', 'a.som', '--stdout'], { cwd: dir });
    expect(written.join('')).toBe(FORMATTED);
    expect(plain).toEqual({ stdout: '', stderr: '', exitCode: 0 });
    expect(fs.readFileSync(path.join(dir, 'a.som'), 'utf8')).toBe(UNFORMATTED);
  });

  test.each(['0', '17', '2.5', 'two', ''])('--indent %j is rejected', async indent => {
    writeFiles(dir, { 'a.som': UNFORMATTED });
    const result = await runInProcess(['fmt', 'a.som', '--indent', indent], { cwd: dir });
    expect(result).toEqual({
      stdout: '',
      stderr: en.commands.fmt.messages.invalidIndent(indent),
      exitCode: 1,
    });
  });

  test('fmt.indent of the nearest configuration, read once per directory', async () => {
    writeFiles(dir, {
      'somon.config.json': JSON.stringify({ fmt: { indent: 2 } }),
      'a.som': UNFORMATTED,
      'b.som': UNFORMATTED,
      'sub/somon.config.json': JSON.stringify({ fmt: { indent: 8 } }),
      'sub/c.som': UNFORMATTED,
      // Skipped: hidden directories, node_modules, dist and coverage
      '.hidden/d.som': UNFORMATTED,
      'dist/e.som': UNFORMATTED,
      'coverage/f.som': UNFORMATTED,
      'node_modules/g.som': UNFORMATTED,
      'notes.md': UNFORMATTED,
    });
    const result = await runInProcess(['fmt', '.', 'a.som'], { cwd: dir });
    expect(result.stdout.split('\n')).toEqual([
      'Formatted a.som',
      'Formatted b.som',
      `Formatted ${path.join('sub', 'c.som')}`,
      '3 of 3 file(s) changed',
    ]);
    expect(fs.readFileSync(path.join(dir, 'b.som'), 'utf8')).toContain('\n  чоп.сабт(а);');
    expect(fs.readFileSync(path.join(dir, 'sub', 'c.som'), 'utf8')).toContain(
      '\n        чоп.сабт(а);'
    );
    for (const skipped of ['.hidden/d.som', 'dist/e.som', 'coverage/f.som', 'node_modules/g.som']) {
      expect(fs.readFileSync(path.join(dir, skipped), 'utf8')).toBe(UNFORMATTED);
    }
  });

  test('missing paths, no files, syntax errors and an invalid configuration', async () => {
    const missing = await runInProcess(['fmt', 'нест'], { cwd: dir, lang: 'ru' });
    expect(missing).toEqual({
      stdout: '',
      stderr: ru.commands.fmt.messages.pathNotFound('нест'),
      exitCode: 1,
    });

    writeFiles(dir, { 'notes.txt': '' });
    const none = await runInProcess(['fmt', '.'], { cwd: dir, lang: 'tj' });
    expect(none.stderr).toBe(tj.commands.fmt.messages.noFiles);
    expect(none.exitCode).toBe(1);

    writeFiles(dir, { 'bad.som': 'тағ = ;\n', 'good.som': UNFORMATTED });
    const bad = await runInProcess(['fmt', 'bad.som', 'good.som'], { cwd: dir });
    expect(bad.exitCode).toBe(1);
    expect(bad.stderr).toMatch(/^Cannot format bad\.som: /);
    // The other files are still formatted
    expect(bad.stdout.split('\n')).toEqual(['Formatted good.som', '1 of 2 file(s) changed']);

    writeFiles(dir, { 'somon.config.json': JSON.stringify({ fmt: { indent: 'wide' } }) });
    const invalid = await runInProcess(['fmt', 'good.som'], { cwd: dir });
    expect(invalid.stderr.split('\n')).toEqual([
      'Configuration error:',
      `  Invalid configuration in ${path.join(dir, 'somon.config.json')}`,
      '  fmt.indent: must be an integer from 1 to 16',
    ]);
    expect(invalid.exitCode).toBe(1);
    // --indent does not need the configuration
    expect((await runInProcess(['fmt', 'good.som', '--indent', '4'], { cwd: dir })).exitCode).toBe(
      0
    );
  });

  test('a file that cannot be read is reported', async () => {
    writeFiles(dir, { 'a.som': UNFORMATTED });
    const read = jest
      .spyOn(require('fs') as typeof fs, 'readFileSync')
      .mockImplementationOnce(() => {
        throw 'EACCES';
      });
    try {
      const result = await runInProcess(['fmt', 'a.som', '--indent', '4'], { cwd: dir });
      expect(result.stderr).toBe('Cannot format a.som: EACCES');
    } finally {
      read.mockRestore();
    }
  });
});

describe('migrate', () => {
  test.each(['en', 'ru', 'tj'] as const)('a file, with warnings, in %s', async lang => {
    const messages = translations[lang].commands.migrate.messages;
    writeFiles(dir, { 'app.ts': 'var x: number = 1;\nconsole.log(x);\n' });
    const name = translations[lang].commands.migrate.name;
    const result = await runInProcess([name, 'app.ts'], { cwd: dir, lang });
    expect(result.stdout.split('\n')).toEqual([
      messages.migrated('app.ts', 'app.som'),
      messages.summary(1, 1),
    ]);
    // The warnings themselves come from the migration tool, in English
    expect(result.stderr).toBe(
      `app.ts:1:1: ${messages.warning} 'var' became 'тағ' (let): check code that relies on function scope`
    );
    expect(result.exitCode).toBe(0);
    expect(fs.readFileSync(path.join(dir, 'app.som'), 'utf8')).toBe(
      'тағ x: рақам = 1;\nчоп.сабт(x);\n'
    );
  });

  test('-o, --stdout and directories', async () => {
    writeFiles(dir, {
      'src/main.ts': 'export const a = 1;\n',
      'src/lib/util.ts': 'export function f(): void {}\n',
      'src/types.d.ts': 'declare const z: number;\n',
      'src/node_modules/x.ts': 'export const x = 1;\n',
    });
    const tree = await runInProcess(['migrate', 'src', '-o', 'som'], { cwd: dir });
    expect(tree.stdout.split('\n')).toEqual([
      `Migrated '${path.join('src', 'lib', 'util.ts')}' to '${path.join('som', 'lib', 'util.som')}'`,
      `Migrated '${path.join('src', 'main.ts')}' to '${path.join('som', 'main.som')}'`,
      '2 file(s) migrated, 0 warning(s)',
    ]);
    expect(fs.existsSync(path.join(dir, 'som', 'types.som'))).toBe(false);

    const inPlace = await runInProcess(['migrate', 'src'], { cwd: dir });
    expect(inPlace.exitCode).toBe(0);
    expect(fs.readFileSync(path.join(dir, 'src', 'main.som'), 'utf8')).toBe('содир собит a = 1;\n');

    const stdout = await runInProcess(['migrate', 'src', '--stdout'], { cwd: dir });
    expect(written.join('')).toBe(
      `// ${path.join('src', 'lib', 'util.som')}\nсодир функсия f(): беджавоб {}\n` +
        `// ${path.join('src', 'main.som')}\nсодир собит a = 1;\n`
    );
    // The summary goes to stderr when the code goes to stdout
    expect(stdout).toEqual({ stdout: '', stderr: '2 file(s) migrated, 0 warning(s)', exitCode: 0 });

    written.length = 0;
    await runInProcess(['migrate', path.join('src', 'main.ts'), '--stdout'], { cwd: dir });
    expect(written.join('')).toBe('содир собит a = 1;\n');

    const single = await runInProcess(['migrate', path.join('src', 'main.ts'), '-o', 'one.som'], {
      cwd: dir,
    });
    expect(single.stdout.split('\n')[0]).toBe(
      `Migrated '${path.join('src', 'main.ts')}' to 'one.som'`
    );
  });

  test('errors: missing input, no files, a syntax error, the input as output', async () => {
    const missing = await runInProcess(['migrate', 'нест.ts'], { cwd: dir });
    expect(missing).toEqual({
      stdout: '',
      stderr: "Error: 'нест.ts' does not exist",
      exitCode: 1,
    });

    fs.mkdirSync(path.join(dir, 'empty'));
    const none = await runInProcess(['migrate', 'empty'], { cwd: dir });
    expect(none.stderr).toBe("No TypeScript files found in 'empty'");
    expect(none.exitCode).toBe(1);

    writeFiles(dir, { 'bad.ts': 'function (', 'good.ts': 'let a = 1;\n' });
    const bad = await runInProcess(['migrate', 'bad.ts'], { cwd: dir });
    expect(bad.stderr).toMatch(/^Cannot migrate bad\.ts: /);
    expect(bad.stdout).toBe('0 file(s) migrated, 0 warning(s)');
    expect(bad.exitCode).toBe(1);

    const same = await runInProcess(['migrate', 'good.ts', '-o', 'good.ts'], { cwd: dir });
    expect(same.stderr).toBe(en.common.outputEqualsInput('good.ts'));
    expect(same.exitCode).toBe(1);
    expect(fs.readFileSync(path.join(dir, 'good.ts'), 'utf8')).toBe('let a = 1;\n');
  });

  test('a warning without a position names only the file; any failure is reported', async () => {
    const tools = require('../src/tools/migrate') as typeof import('../src/tools/migrate');
    const migrateFile = jest
      .spyOn(tools, 'migrateFile')
      .mockReturnValueOnce({ code: '', warnings: [{ line: 0, column: 0, message: 'whole file' }] })
      .mockImplementationOnce(() => {
        throw 'out of memory';
      });
    try {
      writeFiles(dir, { 'a.ts': '' });
      const result = await runInProcess(['migrate', 'a.ts', '--stdout'], { cwd: dir });
      expect(result.stderr.split('\n')[0]).toBe('a.ts: warning: whole file');
      const failed = await runInProcess(['migrate', 'a.ts'], { cwd: dir });
      expect(failed.stderr).toBe('Cannot migrate a.ts: out of memory');
      expect(failed.exitCode).toBe(1);
    } finally {
      migrateFile.mockRestore();
    }
  });
});

describe('repl', () => {
  const stdinDescriptor = Object.getOwnPropertyDescriptor(process, 'stdin')!;
  let exit: jest.SpyInstance;
  let previousHistory: string | undefined;

  beforeEach(() => {
    previousHistory = process.env.SOMON_REPL_HISTORY;
    process.env.SOMON_REPL_HISTORY = '';
  });

  afterEach(() => {
    Object.defineProperty(process, 'stdin', stdinDescriptor);
    exit?.mockRestore();
    if (previousHistory === undefined) delete process.env.SOMON_REPL_HISTORY;
    else process.env.SOMON_REPL_HISTORY = previousHistory;
  });

  /** Runs `somon repl` on `input` until the CLI exits; the exit code it exits with. */
  async function session(input: string, lang: 'en' | 'ru' | 'tj'): Promise<number | undefined> {
    const stdin = new PassThrough();
    Object.defineProperty(process, 'stdin', { configurable: true, get: () => stdin });
    const exited = new Promise<number | undefined>(resolve => {
      exit = jest.spyOn(process, 'exit').mockImplementation(((code?: number) => {
        // process.exit() without a code exits with process.exitCode
        resolve(code ?? Number(process.exitCode ?? 0));
      }) as never);
    });
    const name = translations[lang].commands.repl.name;
    const finished = runInProcess([lang === 'en' ? 'repl' : name], { lang });
    stdin.end(input);
    await finished;
    return exited;
  }

  test.each(['en', 'ru', 'tj'] as const)(
    'runs a session from standard input with the %s messages',
    async lang => {
      const messages = translations[lang].commands.repl.messages;
      process.exitCode = 0;
      const code = await session('тағ х = 20 + 1;\nх * 2\n.js\n.ёрӣ\n.пок\n.js\n.exit\n', lang);
      expect(code).toBe(0);
      const output = written.join('');
      expect(output).toContain(messages.banner(packageVersion));
      expect(output).toContain('42');
      expect(output).toContain(messages.help);
      expect(output).toContain(messages.cleared);
      expect(output).toContain(messages.noCompiledCode);
    }
  );

  test('errors in the session are printed with the localized prefix', async () => {
    await session('номаълум()\n', 'tj');
    expect(written.join('')).toContain(tj.commands.repl.messages.error);
  });

  test('the CLI exits with the exit code the session set', async () => {
    try {
      expect(await session('process.exitCode = 3;\n.баромад\n', 'en')).toBe(3);
    } finally {
      process.exitCode = 0;
    }
  });
});

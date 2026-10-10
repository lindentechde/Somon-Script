import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { createProgram } from '../src/cli/program';
import { ConfigError, loadConfig } from '../src/config';
import { runFmt, runMigrate } from '../src/cli/tool-commands';
import { canonicalTmpDir } from './helpers/paths';

const CLI = path.join(__dirname, '..', 'dist', 'cli.js');

/** Spawns the built CLI. */
function cli(args: string[], options: { cwd?: string; input?: string } = {}) {
  const result = spawnSync(process.execPath, [CLI, ...args], {
    encoding: 'utf8',
    cwd: options.cwd,
    input: options.input,
    env: { ...process.env, SOMON_LANG: 'en', SOMON_REPL_HISTORY: '' },
    timeout: 30000,
  });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

const UNFORMATTED = 'тағ а=1\nагар(а){\nчоп.сабт(а)\n}\n';
const FORMATTED = 'тағ а = 1;\nагар (а) {\n    чоп.сабт(а);\n}\n';

describe('somon fmt / migrate (in-process)', () => {
  let dir: string;
  let log: jest.SpyInstance;
  let error: jest.SpyInstance;
  let write: jest.SpyInstance;

  beforeEach(() => {
    dir = canonicalTmpDir('somon-tools-');
    log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    write = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    process.exitCode = 0;
  });

  afterEach(() => {
    log.mockRestore();
    error.mockRestore();
    write.mockRestore();
    fs.rmSync(dir, { recursive: true, force: true });
    process.exitCode = 0;
  });

  const printed = (spy: jest.SpyInstance): string =>
    spy.mock.calls.map(call => call.join(' ')).join('\n');

  test('fmt writes files in directories and reports a summary', async () => {
    fs.mkdirSync(path.join(dir, 'sub'));
    fs.mkdirSync(path.join(dir, 'node_modules'));
    fs.writeFileSync(path.join(dir, 'a.som'), UNFORMATTED);
    fs.writeFileSync(path.join(dir, 'sub', 'b.som'), FORMATTED);
    fs.writeFileSync(path.join(dir, 'node_modules', 'c.som'), UNFORMATTED);
    fs.writeFileSync(path.join(dir, 'notes.txt'), UNFORMATTED);
    await runFmt([dir], {});
    expect(fs.readFileSync(path.join(dir, 'a.som'), 'utf8')).toBe(FORMATTED);
    expect(fs.readFileSync(path.join(dir, 'node_modules', 'c.som'), 'utf8')).toBe(UNFORMATTED);
    expect(printed(log)).toContain('1 of 2 file(s) changed');
    expect(process.exitCode).toBe(0);
  });

  test('fmt --check reports and fails without writing', async () => {
    const file = path.join(dir, 'a.som');
    fs.writeFileSync(file, UNFORMATTED);
    await runFmt([file], { check: true });
    expect(fs.readFileSync(file, 'utf8')).toBe(UNFORMATTED);
    expect(printed(log)).toContain(`Not formatted: ${file}`);
    expect(printed(error)).toContain('1 file(s) are not formatted');
    expect(process.exitCode).toBe(1);

    process.exitCode = 0;
    fs.writeFileSync(file, FORMATTED);
    await runFmt([file], { check: true });
    expect(printed(log)).toContain('All 1 file(s) are formatted');
    expect(process.exitCode).toBe(0);
  });

  test('fmt --stdout prints the code and reports to stderr', async () => {
    const file = path.join(dir, 'a.som');
    fs.writeFileSync(file, UNFORMATTED);
    await runFmt([file], { stdout: true, indent: '2' });
    expect(write).toHaveBeenCalledWith('тағ а = 1;\nагар (а) {\n  чоп.сабт(а);\n}\n');
    expect(fs.readFileSync(file, 'utf8')).toBe(UNFORMATTED);
  });

  test('fmt reads fmt.indent from somon.config.json', async () => {
    fs.writeFileSync(path.join(dir, 'somon.config.json'), JSON.stringify({ fmt: { indent: 2 } }));
    const file = path.join(dir, 'a.som');
    fs.writeFileSync(file, UNFORMATTED);
    await runFmt([file], { write: true });
    expect(fs.readFileSync(file, 'utf8')).toBe('тағ а = 1;\nагар (а) {\n  чоп.сабт(а);\n}\n');
  });

  test('fmt reports invalid configuration, indentation, paths and syntax errors', async () => {
    const file = path.join(dir, 'a.som');
    fs.writeFileSync(file, 'тағ = ;');
    await runFmt([file], {});
    expect(printed(error)).toContain(`Cannot format ${file}:`);
    expect(process.exitCode).toBe(1);

    await runFmt([file], { indent: '0' });
    expect(printed(error)).toContain("--indent must be an integer from 1 to 16, got '0'");

    await runFmt([path.join(dir, 'missing.som')], {});
    expect(printed(error)).toContain('does not exist');

    fs.mkdirSync(path.join(dir, 'empty'));
    await runFmt([path.join(dir, 'empty')], {});
    expect(printed(error)).toContain('No .som files found');

    fs.writeFileSync(path.join(dir, 'somon.config.json'), JSON.stringify({ fmt: { indent: 99 } }));
    fs.writeFileSync(file, FORMATTED);
    await runFmt([file], {});
    expect(printed(error)).toContain('fmt.indent: must be an integer from 1 to 16');
  });

  test('migrate converts a file next to it, to -o, or to stdout', async () => {
    const file = path.join(dir, 'app.ts');
    fs.writeFileSync(file, 'var x: number = 1;\nconsole.log(x);\n');
    await runMigrate(file, {});
    expect(fs.readFileSync(path.join(dir, 'app.som'), 'utf8')).toBe(
      'тағ x: рақам = 1;\nчоп.сабт(x);\n'
    );
    expect(printed(error)).toContain(`${file}:1:1: warning: 'var' became 'тағ'`);
    expect(printed(log)).toContain('1 file(s) migrated, 1 warning(s)');

    await runMigrate(file, { output: path.join(dir, 'out', 'renamed.som') });
    expect(fs.existsSync(path.join(dir, 'out', 'renamed.som'))).toBe(true);

    await runMigrate(file, { stdout: true });
    expect(write).toHaveBeenCalledWith('тағ x: рақам = 1;\nчоп.сабт(x);\n');
  });

  test('migrate converts directories, mirroring them under -o', async () => {
    fs.mkdirSync(path.join(dir, 'src', 'lib'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'src', 'main.ts'), 'export const a = 1;\n');
    fs.writeFileSync(path.join(dir, 'src', 'lib', 'util.ts'), 'export function f() {}\n');
    fs.writeFileSync(path.join(dir, 'src', 'types.d.ts'), 'declare const z: number;\n');
    await runMigrate(path.join(dir, 'src'), { output: path.join(dir, 'som') });
    expect(fs.readFileSync(path.join(dir, 'som', 'main.som'), 'utf8')).toBe('содир собит a = 1;\n');
    expect(fs.existsSync(path.join(dir, 'som', 'lib', 'util.som'))).toBe(true);
    expect(fs.existsSync(path.join(dir, 'som', 'types.som'))).toBe(false);

    await runMigrate(path.join(dir, 'src'), { stdout: true });
    expect(printed(write)).toContain('// ');
    expect(printed(write)).toContain('содир функсия f() {}');
  });

  test('migrate reports syntax errors, missing input and refuses to overwrite it', async () => {
    const file = path.join(dir, 'bad.ts');
    fs.writeFileSync(file, 'function (');
    await runMigrate(file, {});
    expect(printed(error)).toContain(`Cannot migrate ${file}:`);
    expect(process.exitCode).toBe(1);

    await runMigrate(path.join(dir, 'nope.ts'), {});
    expect(printed(error)).toContain('does not exist');

    fs.mkdirSync(path.join(dir, 'none'));
    await runMigrate(path.join(dir, 'none'), {});
    expect(printed(error)).toContain('No TypeScript files found');

    const good = path.join(dir, 'good.ts');
    fs.writeFileSync(good, 'let a = 1;\n');
    await runMigrate(good, { output: good });
    expect(printed(error)).toContain('is the same as the input file');
    expect(fs.readFileSync(good, 'utf8')).toBe('let a = 1;\n');
  });

  test('somon.config.json validates the fmt section', () => {
    const configure = (config: unknown): void =>
      fs.writeFileSync(path.join(dir, 'somon.config.json'), JSON.stringify(config));
    configure({ fmt: { indent: 2 } });
    expect(loadConfig(dir).fmt).toEqual({ indent: 2 });
    const details = (config: unknown): string[] => {
      configure(config);
      try {
        loadConfig(dir);
      } catch (e) {
        expect(e).toBeInstanceOf(ConfigError);
        return (e as ConfigError).details.map(detail => `${detail.path}: ${detail.message}`);
      }
      return [];
    };
    expect(details({ fmt: { indent: 0 } })).toEqual([
      'fmt.indent: must be an integer from 1 to 16',
    ]);
    expect(details({ fmt: { indent: 1.5, tabs: true } })).toHaveLength(2);
    expect(details({ fmt: 4 })).toEqual(['fmt: must be an object']);
  });

  test('the commands are registered with localized aliases', () => {
    const names = createProgram().commands.map(command => command.name());
    expect(names).toEqual(expect.arrayContaining(['fmt', 'repl', 'migrate']));
  });
});

describe('somon fmt / migrate (CLI)', () => {
  let dir: string;
  beforeEach(() => {
    dir = canonicalTmpDir('somon-tools-cli-');
  });
  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('fmt --check fails on unformatted files and passes after fmt --write', () => {
    const file = path.join(dir, 'main.som');
    fs.writeFileSync(file, UNFORMATTED);

    const check = cli(['fmt', '--check', dir]);
    expect(check.status).toBe(1);
    expect(check.stdout).toContain('Not formatted');
    expect(fs.readFileSync(file, 'utf8')).toBe(UNFORMATTED);

    const written = cli(['fmt', '--write', file]);
    expect(written.status).toBe(0);
    expect(fs.readFileSync(file, 'utf8')).toBe(FORMATTED);

    const again = cli(['fmt', '--check', dir]);
    expect(again.status).toBe(0);
    expect(again.stdout).toContain('All 1 file(s) are formatted');
  });

  test('fmt --stdout and --indent; the formatted program still runs', () => {
    const file = path.join(dir, 'main.som');
    fs.writeFileSync(file, UNFORMATTED);
    const printed = cli(['fmt', '--stdout', '--indent', '2', file]);
    expect(printed.status).toBe(0);
    expect(printed.stdout).toBe('тағ а = 1;\nагар (а) {\n  чоп.сабт(а);\n}\n');
    cli(['fmt', file]);
    expect(cli(['run', file]).stdout.trim()).toBe('1');
  });

  test('fmt refuses a file that does not parse and leaves it alone', () => {
    const file = path.join(dir, 'broken.som');
    fs.writeFileSync(file, 'агар (');
    const result = cli(['fmt', file]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Cannot format');
    expect(fs.readFileSync(file, 'utf8')).toBe('агар (');
  });

  test('fmt in Tajik', () => {
    fs.writeFileSync(path.join(dir, 'a.som'), UNFORMATTED);
    const result = cli(['--lang', 'tj', 'формат', '--check', dir]);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('Формат нашудааст');
  });

  test('migrate converts TypeScript that then runs with somon run', () => {
    const file = path.join(dir, 'hello.ts');
    fs.writeFileSync(
      file,
      [
        '// Greets everybody',
        'const names: string[] = ["Ali", "Vali"];',
        'for (const name of names) {',
        '  console.log(`Hello, ${name.toUpperCase()}!`);',
        '}',
        '',
      ].join('\n')
    );
    const result = cli(['migrate', file]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('hello.som');
    const som = fs.readFileSync(path.join(dir, 'hello.som'), 'utf8');
    expect(som).toContain('// Greets everybody');
    expect(som).toContain('барои (собит name аз names) {');
    expect(cli(['run', path.join(dir, 'hello.som')]).stdout).toBe('Hello, ALI!\nHello, VALI!\n');
  });

  test('migrate --stdout and warnings on stderr', () => {
    const file = path.join(dir, 'old.ts');
    fs.writeFileSync(file, 'var x: number = 1;\n');
    const result = cli(['migrate', file, '--stdout']);
    expect(result.status).toBe(0);
    expect(result.stdout).toBe('тағ x: рақам = 1;\n');
    expect(result.stderr).toContain("old.ts:1:1: warning: 'var' became 'тағ'");
  });
});

describe('somon repl (CLI)', () => {
  test('runs a session from standard input', () => {
    const result = spawnSync(process.execPath, [CLI, 'repl'], {
      input: [
        'тағ х = 2',
        'функсия ф(а: рақам) {',
        '  бозгашт а * х;',
        '}',
        'ф(21)',
        'интизор Ваъда.resolve("ҳамзамон")',
        'чоп.сабт("салом")',
        '.баромад',
        '',
      ].join('\n'),
      encoding: 'utf8',
      env: { ...process.env, SOMON_REPL_HISTORY: '', SOMON_LANG: 'en' },
      timeout: 20000,
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('SomonScript');
    expect(result.stdout).toContain('42');
    expect(result.stdout).toContain("'ҳамзамон'");
    expect(result.stdout).toContain('салом');
  });

  test('speaks Tajik with --lang tj', () => {
    const result = spawnSync(process.execPath, [CLI, '--lang', 'tj', 'интерактив'], {
      input: 'номаълум\n',
      encoding: 'utf8',
      env: { ...process.env, SOMON_REPL_HISTORY: '' },
      timeout: 20000,
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('СомонСкрипт');
    expect(result.stdout).toContain('Хато: ReferenceError');
  });
});

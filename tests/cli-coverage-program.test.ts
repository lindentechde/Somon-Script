/**
 * Every command and option of src/cli/program.ts, run in-process so coverage
 * sees it: compile (with watch mode against a controlled chokidar), run,
 * bundle, check, init, module-info and resolve, their error paths, messages
 * and exit codes, configuration precedence and the localized aliases.
 */
jest.mock('chokidar', () => {
  const watch = jest.fn();
  return { __esModule: true, default: { watch }, watch };
});

import chokidar from 'chokidar';
import { spawnSync } from 'child_process';
import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as vm from 'vm';

import { i18n, type Language } from '../src/cli/i18n';
import en from '../src/cli/i18n/translations/en';
import ru from '../src/cli/i18n/translations/ru';
import tj from '../src/cli/i18n/translations/tj';
import { cliRuntime, compileFile, createProgram, type ExecutionResult } from '../src/cli/program';
import { runInProcess, slash, writeFiles } from './helpers/cli-in-process';
import { canonicalTmpDir } from './helpers/paths';

jest.setTimeout(30000);

const translations = { en, ru, tj } as const;
const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')
) as { name: string; version: string };

const OK = 'тағ х: рақам = 1;\nчоп.сабт(х);\n';
const TYPE_ERROR = 'тағ х: рақам = "сатр";\n';
const PARSE_ERROR = 'тағ = ;\n';
const WARNING = 'синф А { }\nтағ а = нав А();\nчоп.сабт(а.х);\n';
const LIBRARY = 'содир функсия ҷамъ(а: рақам, б: рақам): рақам { бозгашт а + б; }\n';
const MAIN = 'ворид { ҷамъ } аз "./lib";\nчоп.сабт(ҷамъ(40, 2));\n';

let dir: string;

beforeEach(() => {
  dir = canonicalTmpDir('somon-cli-cov-');
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

/**
 * `Error: <code>…`. Errors of Node's own modules come from another realm than
 * the test's, so under Jest `instanceof Error` fails for them and the CLI
 * prints the error itself (`Error: Error: EISDIR…`) instead of its message.
 */
const NODE_ERROR = (code: string): RegExp => new RegExp(`^Error: (Error: )?${code}`);

const read = (name: string): string => fs.readFileSync(path.join(dir, name), 'utf8');
const exists = (name: string): boolean => fs.existsSync(path.join(dir, name));

/** Runs a JavaScript file with Node and returns what it printed. */
function node(file: string, args: string[] = []): { stdout: string; stderr: string } {
  const result = spawnSync(process.execPath, [...args, file], { encoding: 'utf8' });
  return { stdout: result.stdout, stderr: result.stderr };
}

function config(value: unknown, where = dir): void {
  fs.writeFileSync(path.join(where, 'somon.config.json'), JSON.stringify(value));
}

describe('compile', () => {
  test('writes <input>.js next to the input and reports it', async () => {
    writeFiles(dir, { 'a.som': OK });
    const result = await runInProcess(['compile', 'a.som'], { cwd: dir });
    expect(result).toEqual({ stdout: "Compiled 'a.som' to 'a.js'", stderr: '', exitCode: 0 });
    expect(node(path.join(dir, 'a.js')).stdout).toBe('1\n');
  });

  test('-o, --out-dir and the config output and outDir, in that order of precedence', async () => {
    writeFiles(dir, { 'src/a.som': OK });
    config({ compilerOptions: { output: 'from-config/out.js', outDir: 'config-dir' } });

    await runInProcess(['compile', 'src/a.som', '-o', 'cli.js', '--out-dir', 'x'], { cwd: dir });
    expect(exists('cli.js')).toBe(true);

    const outDir = await runInProcess(['compile', 'src/a.som', '--out-dir', 'cli-dir'], {
      cwd: dir,
    });
    expect(slash(outDir.stdout)).toBe(`Compiled 'src/a.som' to '${slash(dir)}/cli-dir/a.js'`);

    await runInProcess(['compile', 'src/a.som'], { cwd: dir });
    expect(exists('from-config/out.js')).toBe(true);

    config({ compilerOptions: { outDir: 'config-dir' } });
    await runInProcess(['compile', 'src/a.som'], { cwd: dir });
    expect(exists('config-dir/a.js')).toBe(true);
    expect(exists('src/a.js')).toBe(false);
  });

  test('an input without the .som extension gets .js appended', async () => {
    writeFiles(dir, { 'script.txt': OK });
    const result = await runInProcess(['compile', 'script.txt'], { cwd: dir });
    expect(result.exitCode).toBe(0);
    expect(exists('script.txt.js')).toBe(true);
    expect(read('script.txt')).toBe(OK);
  });

  test('refuses to overwrite its input', async () => {
    writeFiles(dir, { 'a.som': OK });
    const result = await runInProcess(['compile', 'a.som', '-o', 'a.som'], { cwd: dir });
    expect(result).toEqual({
      stdout: '',
      stderr: en.common.outputEqualsInput('a.som'),
      exitCode: 1,
    });
    expect(read('a.som')).toBe(OK);
  });

  test('--source-map writes a map that names the input relative to the output', async () => {
    writeFiles(dir, { 'src/a.som': OK });
    const result = await runInProcess(['compile', 'src/a.som', '-o', 'out/a.js', '--source-map'], {
      cwd: dir,
    });
    expect(result.stdout.split('\n')).toEqual([
      "Compiled 'src/a.som' to 'out/a.js'",
      "Generated source map: 'out/a.js.map'",
    ]);
    const map = JSON.parse(read('out/a.js.map'));
    expect(map.file).toBe('a.js');
    expect(map.sources).toEqual(['../src/a.som']);
    expect(read('out/a.js').endsWith('\n//# sourceMappingURL=a.js.map')).toBe(true);
  });

  test('--no-source-map and --no-minify override the configuration', async () => {
    writeFiles(dir, { 'a.som': 'функсия ҷамъ(а: рақам, б: рақам): рақам { бозгашт а + б; }\n' });
    config({ compilerOptions: { sourceMap: true, minify: true } });

    await runInProcess(['compile', 'a.som'], { cwd: dir });
    expect(exists('a.js.map')).toBe(true);
    expect(read('a.js')).not.toContain('\n  ');
    fs.rmSync(path.join(dir, 'a.js.map'));

    await runInProcess(['compile', 'a.som', '--no-source-map', '--no-minify'], { cwd: dir });
    expect(exists('a.js.map')).toBe(false);
    expect(read('a.js')).toContain('\n  return а + б;');
  });

  test('--declaration writes the declarations next to the output', async () => {
    writeFiles(dir, { 'lib.som': LIBRARY });
    const result = await runInProcess(['compile', 'lib.som', '--declaration'], { cwd: dir });
    expect(result.stdout.split('\n')).toEqual([
      "Compiled 'lib.som' to 'lib.js'",
      "Generated declarations: 'lib.d.ts'",
    ]);
    expect(read('lib.d.ts')).toBe('export declare function ҷамъ(а: number, б: number): number;\n');

    config({ compilerOptions: { declaration: true } });
    await runInProcess(['compile', 'lib.som', '-o', 'out/lib'], { cwd: dir });
    expect(read('out/lib.d.ts')).toContain('ҷамъ');
  });

  test('type errors fail the compile with exit code 1 and write nothing', async () => {
    writeFiles(dir, { 'a.som': TYPE_ERROR });
    const result = await runInProcess(['compile', 'a.som'], { cwd: dir });
    expect(result.exitCode).toBe(1);
    expect(result.stderr.split('\n')[0]).toBe('Compilation errors:');
    expect(result.stderr).toContain(
      "  Type error [TYPE_NOT_ASSIGNABLE] at line 1, column 16: Type '\"сатр\"' is not assignable to type 'рақам'"
    );
    expect(exists('a.js')).toBe(false);
  });

  test('--no-type-check and compilerOptions.noTypeCheck skip type checking', async () => {
    writeFiles(dir, { 'a.som': TYPE_ERROR });
    expect(
      (await runInProcess(['compile', 'a.som', '--no-type-check'], { cwd: dir })).exitCode
    ).toBe(0);
    fs.rmSync(path.join(dir, 'a.js'));
    config({ compilerOptions: { noTypeCheck: true } });
    expect((await runInProcess(['compile', 'a.som'], { cwd: dir })).exitCode).toBe(0);
    expect(exists('a.js')).toBe(true);
  });

  test('warnings are printed and the compile succeeds', async () => {
    writeFiles(dir, { 'a.som': WARNING });
    const result = await runInProcess(['compile', 'a.som'], { cwd: dir });
    expect(result.exitCode).toBe(0);
    expect(result.stderr.split('\n')[0]).toBe('Warnings:');
    expect(result.stderr).toContain("Property 'х' does not exist on type 'А'");
    // --strict makes the warning an error
    const strict = await runInProcess(['compile', 'a.som', '--strict', '-o', 's.js'], { cwd: dir });
    expect(strict.exitCode).toBe(1);
    expect(exists('s.js')).toBe(false);
  });

  test('--target, --lib, class fields and the config target', async () => {
    writeFiles(dir, { 'a.som': 'синф А { х = 1; }\nтағ а = () => нав А().х;\nчоп.сабт(а());\n' });
    config({ compilerOptions: { target: 'es5' } });
    await runInProcess(['compile', 'a.som', '-o', 'es5.js'], { cwd: dir });
    expect(read('es5.js')).not.toContain('=>');
    expect(node(path.join(dir, 'es5.js')).stdout).toBe('1\n');

    await runInProcess(
      [
        'compile',
        'a.som',
        '-o',
        'es2015.js',
        '--target',
        'es2015',
        '--lib',
        'es2015,dom',
        '--no-use-define-for-class-fields',
      ],
      { cwd: dir }
    );
    expect(read('es2015.js')).toContain('=>');
    expect(read('es2015.js')).toContain('this.х = 1');

    await runInProcess(
      [
        'compile',
        'a.som',
        '-o',
        'define.js',
        '--target',
        'es2022',
        '--use-define-for-class-fields',
      ],
      { cwd: dir }
    );
    expect(read('define.js')).toMatch(/^\s+х = 1;$/m);
  });

  test('--module esm, --checker typescript and --experimental-decorators reach the compiler', async () => {
    writeFiles(dir, {
      'lib.som': LIBRARY,
      'b.som': 'тағ н: рақам = "н";\n',
      'dec.som':
        'функсия лог(ҳадаф: ҳар, калид: ҳар, ҷой: рақам): беқимат {}\n' +
        'синф А { м(@лог х: рақам): беқимат {} }\n',
    });
    await runInProcess(['compile', 'lib.som', '--module', 'esm'], { cwd: dir });
    expect(read('lib.js')).toContain('export function ҷамъ');

    const checked = await runInProcess(['compile', 'b.som', '--checker', 'typescript'], {
      cwd: dir,
    });
    expect(checked.exitCode).toBe(1);
    expect(checked.stderr).toContain('[TS2322] at line 1, column 5');

    expect((await runInProcess(['compile', 'dec.som'], { cwd: dir })).exitCode).toBe(1);
    const legacy = await runInProcess(['compile', 'dec.som', '--experimental-decorators'], {
      cwd: dir,
    });
    expect(legacy.exitCode).toBe(0);
    expect(read('dec.js')).toContain('__decorate');
  });

  test('a missing input, a directory input and an unwritable output', async () => {
    const missing = await runInProcess(['compile', 'missing.som'], { cwd: dir });
    expect(missing).toEqual({
      stdout: '',
      stderr: "Error: File 'missing.som' not found",
      exitCode: 1,
    });

    fs.mkdirSync(path.join(dir, 'folder.som'));
    const directory = await runInProcess(['compile', 'folder.som', '-o', 'f.js'], { cwd: dir });
    expect(directory.exitCode).toBe(1);
    expect(directory.stderr).toMatch(NODE_ERROR('EISDIR'));

    writeFiles(dir, { 'a.som': OK });
    const unwritable = await runInProcess(['compile', 'a.som', '-o', 'a.som/out.js'], {
      cwd: dir,
    });
    expect(unwritable.exitCode).toBe(1);
    expect(unwritable.stderr).toMatch(NODE_ERROR('(EEXIST|ENOTDIR)'));
  });

  test('a file that cannot be read is reported with the reason', async () => {
    writeFiles(dir, { 'a.som': OK });
    // Root may read any file, so the failure is simulated.
    const read = jest
      .spyOn(require('fs') as typeof fs, 'readFileSync')
      .mockImplementationOnce(() => {
        throw new Error("EACCES: permission denied, open 'a.som'");
      });
    try {
      const result = await runInProcess(['compile', 'a.som'], { cwd: dir });
      expect(result).toEqual({
        stdout: '',
        stderr: "Error: EACCES: permission denied, open 'a.som'",
        exitCode: 1,
      });
    } finally {
      read.mockRestore();
    }
  });

  test('an invalid configuration is reported with its details', async () => {
    writeFiles(dir, { 'a.som': OK });
    config({ compilerOptions: { target: 'es3', bogus: 1 } });
    const result = await runInProcess(['compile', 'a.som'], { cwd: dir });
    expect(result.exitCode).toBe(1);
    expect(result.stderr.split('\n')).toEqual([
      'Configuration error:',
      `  Invalid configuration in ${path.join(dir, 'somon.config.json')}`,
      expect.stringMatching(/^ {2}compilerOptions\.target: must be one of: es5, /),
      expect.stringMatching(/^ {2}compilerOptions\.bogus: unknown compiler option\. /),
    ]);
    expect(exists('a.js')).toBe(false);
  });

  test('a configuration that is not JSON is reported without details', async () => {
    writeFiles(dir, { 'a.som': OK, 'somon.config.json': '{ nope' });
    const result = await runInProcess(['compile', 'a.som'], { cwd: dir });
    expect(result.exitCode).toBe(1);
    const lines = result.stderr.split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe('Configuration error:');
    expect(lines[1]).toContain('Failed to parse config file');
  });

  test('--watch in the test environment only announces the watch, even after a failure', async () => {
    writeFiles(dir, { 'a.som': TYPE_ERROR });
    const result = await runInProcess(['compile', 'a.som', '--watch'], { cwd: dir });
    expect(result.stdout).toBe("Watching 'a.som' for changes...");
    expect(result.exitCode).toBe(1);
    expect(jest.mocked(chokidar.watch)).not.toHaveBeenCalled();
  });

  test('--production is accepted with a deprecation warning', async () => {
    writeFiles(dir, { 'a.som': OK });
    const result = await runInProcess(['compile', 'a.som', '--production'], { cwd: dir });
    expect(result.stderr).toBe(en.common.productionDeprecated);
    expect(result.exitCode).toBe(0);
  });

  test('compileFile returns the result of a compile', () => {
    writeFiles(dir, { 'a.som': OK });
    const result = compileFile(path.join(dir, 'a.som'), { target: 'es5' });
    expect(result.errors).toEqual([]);
    expect(result.code).toContain('var х = 1;');
  });
});

/** A chokidar watcher whose events the test emits. */
class FakeWatcher extends EventEmitter {
  close = jest.fn(() => Promise.resolve());
}

describe('compile --watch', () => {
  let watcher: FakeWatcher;
  let signals: Array<[string, (signal: string) => void]>;
  let exit: jest.SpyInstance;
  let out: string[];
  let err: string[];
  let spies: jest.SpyInstance[];
  const previousEnv = process.env.NODE_ENV;
  const previousCwd = process.cwd();

  beforeEach(() => {
    watcher = new FakeWatcher();
    jest
      .mocked(chokidar.watch)
      .mockReset()
      .mockReturnValue(watcher as never);
    signals = [];
    out = [];
    err = [];
    const record =
      (into: string[]) =>
      (...parts: unknown[]) =>
        void into.push(parts.map(String).join(' '));
    spies = [
      jest.spyOn(console, 'log').mockImplementation(record(out)),
      jest.spyOn(console, 'error').mockImplementation(record(err)),
      jest.spyOn(console, 'warn').mockImplementation(record(err)),
      jest.spyOn(process, 'once').mockImplementation(((event: string, listener: () => void) => {
        signals.push([event, listener]);
        return process;
      }) as never),
    ];
    exit = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    process.env.NODE_ENV = 'development';
    process.chdir(dir);
    i18n.setLanguage('en');
  });

  afterEach(() => {
    spies.forEach(spy => spy.mockRestore());
    exit.mockRestore();
    process.env.NODE_ENV = previousEnv;
    process.chdir(previousCwd);
    process.exitCode = 0;
  });

  const watch = (args: string[] = []): void => {
    createProgram().parse(['compile', 'a.som', '--watch', ...args], { from: 'user' });
  };
  const settle = (): Promise<void> => new Promise(resolve => setImmediate(resolve));

  test('watches the input and the config file, recompiling on every change', () => {
    writeFiles(dir, { 'a.som': OK });
    config({ compilerOptions: {} });
    watch();
    expect(jest.mocked(chokidar.watch)).toHaveBeenCalledWith(
      [path.join(dir, 'a.som'), path.join(dir, 'somon.config.json')],
      expect.objectContaining({ persistent: true, ignoreInitial: true })
    );
    expect(out).toEqual(["Compiled 'a.som' to 'a.js'", "Watching 'a.som' for changes..."]);

    out.length = 0;
    fs.writeFileSync(path.join(dir, 'a.som'), 'чоп.сабт(2);\n');
    watcher.emit('change', path.join(dir, 'a.som'));
    expect(out).toEqual(["Recompiling 'a.som'...", "Compiled 'a.som' to 'a.js'"]);
    expect(node(path.join(dir, 'a.js')).stdout).toBe('2\n');

    out.length = 0;
    watcher.emit('unlink', path.join(dir, 'a.som'));
    expect(err).toEqual(["Source file 'a.som' was removed. Waiting for it to reappear..."]);
    watcher.emit('add', path.join(dir, 'a.som'));
    expect(out).toEqual(["Recompiling 'a.som'...", "Compiled 'a.som' to 'a.js'"]);

    out.length = 0;
    config({ compilerOptions: { target: 'es5' } });
    watcher.emit('change', 'somon.config.json');
    expect(out[0]).toBe("Configuration change detected in 'somon.config.json'. Recompiling...");

    err.length = 0;
    watcher.emit('unlink', path.join(dir, 'somon.config.json'));
    expect(err).toEqual([
      "Configuration file 'somon.config.json' was removed. Using previous options.",
    ]);

    err.length = 0;
    watcher.emit('error', new Error('too many files'));
    watcher.emit('error', 'EMFILE');
    expect(err).toEqual(['Watch error: too many files', 'Watch error: EMFILE']);
  });

  test('watches the config file the input would use when there is none', () => {
    writeFiles(dir, { 'a.som': OK });
    watch();
    expect(jest.mocked(chokidar.watch).mock.calls[0][0]).toEqual([
      path.join(dir, 'a.som'),
      path.join(dir, 'somon.config.json'),
    ]);
  });

  test('compileOnSave in the configuration starts the watch', () => {
    writeFiles(dir, { 'a.som': OK });
    config({ compilerOptions: { compileOnSave: true } });
    createProgram().parse(['compile', 'a.som'], { from: 'user' });
    expect(jest.mocked(chokidar.watch)).toHaveBeenCalledTimes(1);
  });

  test('a failed recompile sets exit code 1, a later success clears it', () => {
    writeFiles(dir, { 'a.som': OK });
    watch();
    expect(process.exitCode).toBe(0);

    fs.writeFileSync(path.join(dir, 'a.som'), PARSE_ERROR);
    watcher.emit('change', path.join(dir, 'a.som'));
    expect(process.exitCode).toBe(1);
    expect(err[0]).toBe('Compilation errors:');

    fs.writeFileSync(path.join(dir, 'a.som'), OK);
    watcher.emit('change', path.join(dir, 'a.som'));
    expect(process.exitCode).toBe(0);
  });

  test('a configuration that becomes invalid is reported and the output is kept', () => {
    writeFiles(dir, { 'a.som': OK });
    config({ compilerOptions: {} });
    watch();
    const before = read('a.js');

    config({ compilerOptions: { minify: 'yes' } });
    fs.writeFileSync(path.join(dir, 'a.som'), 'чоп.сабт(3);\n');
    watcher.emit('change', path.join(dir, 'somon.config.json'));
    expect(err).toEqual([
      'Configuration error:',
      `  Invalid configuration in ${path.join(dir, 'somon.config.json')}`,
      '  compilerOptions.minify: must be a boolean',
    ]);
    expect(process.exitCode).toBe(1);
    expect(read('a.js')).toBe(before);
  });

  test('an invalid configuration at the start ends the command before watching', () => {
    writeFiles(dir, { 'a.som': OK });
    config({ compilerOptions: { watch: 'always' } });
    watch();
    expect(jest.mocked(chokidar.watch)).not.toHaveBeenCalled();
    expect(err[0]).toBe('Configuration error:');
    expect(process.exitCode).toBe(1);
  });

  test('a termination signal closes the watcher once and exits with the last result', async () => {
    writeFiles(dir, { 'a.som': OK });
    watch();
    expect(signals.map(([signal]) => signal)).toEqual(['SIGINT', 'SIGTERM', 'SIGHUP']);
    const shutdown = signals[0][1];

    process.exitCode = 1;
    shutdown('SIGINT');
    shutdown('SIGTERM');
    await settle();
    expect(out).toContain('\nReceived SIGINT, stopping watcher...');
    expect(out.filter(line => line.includes('stopping watcher'))).toHaveLength(1);
    expect(watcher.close).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledWith(1);
  });

  test('a watcher that cannot be closed is reported, and the CLI still exits', async () => {
    writeFiles(dir, { 'a.som': OK });
    watch();
    watcher.close.mockRejectedValueOnce(new Error('busy'));
    process.exitCode = undefined;
    signals[1][1]('SIGTERM');
    await settle();
    expect(err).toContain('Failed to close watcher: busy');
    expect(exit).toHaveBeenCalledWith(0);
  });

  test('a non-Error close failure is printed as it is', async () => {
    writeFiles(dir, { 'a.som': OK });
    watch();
    watcher.close.mockRejectedValueOnce('locked');
    signals[2][1]('SIGHUP');
    await settle();
    expect(err).toContain('Failed to close watcher: locked');
    expect(exit).toHaveBeenCalledTimes(1);
  });
});

interface RunRecord {
  file: string;
  argv: string[];
  options: { cwd?: string; enableSourceMaps?: boolean };
  stdout: string;
  stderr: string;
  files: Record<string, string>;
}

describe('run', () => {
  let runs: RunRecord[];
  let execute: jest.SpyInstance;

  /** Lists the files of the run's temporary directory (relative path → text). */
  function snapshot(root: string): Record<string, string> {
    const files: Record<string, string> = {};
    const walk = (current: string): void => {
      for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        const full = path.join(current, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.isFile())
          files[slash(path.relative(root, full))] = fs.readFileSync(full, 'utf8');
        else files[slash(path.relative(root, full))] = '<link>';
      }
    };
    walk(root);
    return files;
  }

  /** The temporary directory `run` created for the program. */
  function workspace(file: string): string {
    let current = path.dirname(file);
    while (!path.basename(current).startsWith('somon-run-')) current = path.dirname(current);
    return current;
  }

  beforeEach(() => {
    runs = [];
    // The compiled program really runs, with its output captured.
    execute = jest
      .spyOn(cliRuntime, 'executeCompiledFile')
      .mockImplementation(async (file, argv = [], options = {}) => {
        const flags = options.enableSourceMaps ? ['--enable-source-maps'] : [];
        const child = spawnSync(process.execPath, [...flags, file, ...argv], {
          cwd: options.cwd,
          encoding: 'utf8',
        });
        runs.push({
          file,
          argv,
          options,
          stdout: child.stdout,
          stderr: child.stderr,
          files: snapshot(workspace(file)),
        });
        return { status: child.status, signal: child.signal } as ExecutionResult;
      });
  });

  afterEach(() => {
    execute.mockRestore();
  });

  test('bundles the program into a temporary directory and runs it there', async () => {
    writeFiles(dir, { 'lib.som': LIBRARY, 'main.som': MAIN });
    const result = await runInProcess(['run', 'main.som', 'а', '--', '--б'], { cwd: dir });
    expect(result).toEqual({ stdout: '', stderr: '', exitCode: 0 });
    expect(runs).toHaveLength(1);
    const [run] = runs;
    expect(run.stdout).toBe('42\n');
    expect(run.argv).toEqual(['а', '--б']);
    expect(run.options).toEqual({ cwd: dir, enableSourceMaps: false });
    expect(path.basename(run.file)).toBe('main.js');
    expect(Object.keys(run.files)).toEqual(['main.js']);
    // The temporary directory is removed afterwards.
    expect(fs.existsSync(path.dirname(run.file))).toBe(false);
  });

  // Bug in src/module-system: an entry named `.som` (or one that does not end in
  // .som, such as `prog.txt`) is "missing from bundle results", so it cannot run.
  test.failing('a file named only by its extension runs as somon-script.js', async () => {
    writeFiles(dir, { '.som': OK });
    await runInProcess(['run', '.som'], { cwd: dir });
    expect(path.basename(runs[0].file)).toBe('somon-script.js');
    expect(runs[0].stdout).toBe('1\n');
  });

  test('the exit code of the program is the exit code of the CLI', async () => {
    writeFiles(dir, { 'main.som': 'process.exit(3);\n' });
    expect((await runInProcess(['run', 'main.som'], { cwd: dir })).exitCode).toBe(3);
  });

  test('--source-map maps the bundle to the .som files with file URLs', async () => {
    writeFiles(dir, {
      'lib.som': LIBRARY,
      'main.som': 'ворид { ҷамъ } аз "./lib";\nпартофтан нав Хато("бад " + ҷамъ(1, 2));\n',
    });
    await runInProcess(['run', 'main.som', '--source-map'], { cwd: dir });
    const [run] = runs;
    expect(run.options.enableSourceMaps).toBe(true);
    const map = JSON.parse(run.files['main.js.map']);
    expect(map.sources.map((source: string) => fileURLToPath(source)).sort()).toEqual(
      [path.join(dir, 'lib.som'), path.join(dir, 'main.som')].sort()
    );
    expect(run.files['main.js']).toMatch(/\n\/\/# sourceMappingURL=main\.js\.map$/);
    expect(run.stderr).toContain('бад 3');
    expect(run.stderr).toContain(`${path.join(dir, 'main.som')}:2`);
  });

  test('bundle.sourceMaps and bundle.minify of the configuration apply', async () => {
    writeFiles(dir, {
      'main.som': 'функсия салом(ном: сатр): сатр { бозгашт ном; }\nчоп.сабт(салом("а"));\n',
    });
    config({ bundle: { sourceMaps: true, minify: true } });
    await runInProcess(['run', 'main.som'], { cwd: dir });
    expect(runs[0].options.enableSourceMaps).toBe(true);
    expect(runs[0].files['main.js'].split('\n').length).toBeLessThanOrEqual(3);
    expect(runs[0].stdout).toBe('а\n');
  });

  test('flags reach the module system: --target, --strict, --no-type-check, --experimental-decorators', async () => {
    writeFiles(dir, {
      'main.som': 'тағ ф = (х: рақам) => х * 2;\nчоп.сабт(ф(21));\n',
      'typed.som': WARNING,
      'dec.som':
        'функсия лог(ҳадаф: ҳар, калид: ҳар, ҷой: рақам): беқимат {}\n' +
        'синф А { м(@лог х: рақам): беқимат {} }\nчоп.сабт("ок");\n',
    });
    await runInProcess(['run', 'main.som', '--target', 'es5', '--checker', 'somon'], { cwd: dir });
    expect(runs[0].files['main.js']).not.toContain('=>');
    expect(runs[0].stdout).toBe('42\n');

    const strict = await runInProcess(['run', 'typed.som', '--strict'], { cwd: dir });
    expect(strict.exitCode).toBe(1);
    expect(strict.stderr).toContain("Property 'х' does not exist on type 'А'");
    expect(runs).toHaveLength(1);

    const decorators = await runInProcess(['run', 'dec.som'], { cwd: dir });
    expect(decorators.exitCode).toBe(1);
    await runInProcess(['run', 'dec.som', '--experimental-decorators'], { cwd: dir });
    expect(runs[1].stdout).toBe('ок\n');

    writeFiles(dir, { 'bad.som': 'тағ х: рақам = "н";\nчоп.сабт(х);\n' });
    await runInProcess(['run', 'bad.som', '--no-type-check', '--minify', '--lib', 'es2022'], {
      cwd: dir,
    });
    expect(runs[2].stdout).toBe('н\n');
  });

  test('compilerOptions, then moduleSystem.compilation, then the command line', async () => {
    writeFiles(dir, { 'main.som': 'тағ ф = () => 1;\nчоп.сабт(ф());\n' });
    config({
      compilerOptions: {
        target: 'es5',
        locale: 'en',
        outDir: 'dist',
        useDefineForClassFields: true,
      },
      moduleSystem: { compilation: { target: 'es2015' } },
    });
    await runInProcess(['run', 'main.som'], { cwd: dir });
    expect(runs[0].files['main.js']).toContain('=>');

    config({ compilerOptions: { target: 'es2022' }, moduleSystem: { compilation: {} } });
    await runInProcess(['run', 'main.som', '--target', 'es5'], { cwd: dir });
    expect(runs[1].files['main.js']).not.toContain('=>');
  });

  test('--module esm writes every module with its layout, next to package.json', async () => {
    writeFiles(dir, {
      'shared/lib.som': LIBRARY,
      'app/main.som':
        'ворид { ҷамъ } аз "../shared/lib";\nворид { zarb } аз "hisob";\n' +
        'собит х = интизор Ваъда.resolve(40);\nчоп.сабт(ҷамъ(х, 2), zarb(2, 5));\n',
      'node_modules/hisob/package.json': JSON.stringify({ name: 'hisob', main: 'index.js' }),
      'node_modules/hisob/index.js': 'exports.zarb = (а, б) => а * б;\n',
    });
    const result = await runInProcess(['run', 'app/main.som', '--module', 'esm', '--source-map'], {
      cwd: dir,
    });
    expect(result.exitCode).toBe(0);
    const [run] = runs;
    expect(run.stdout).toBe('42 10\n');
    expect(slash(path.relative(path.dirname(path.dirname(run.file)), run.file))).toBe(
      'app/main.js'
    );
    expect(run.files).toEqual({
      'package.json': '{ "type": "module" }\n',
      'app/main.js': expect.stringMatching(/\n\/\/# sourceMappingURL=main\.js\.map$/),
      'app/main.js.map': expect.any(String),
      'shared/lib.js': expect.stringContaining('export function ҷамъ'),
      'shared/lib.js.map': expect.any(String),
      node_modules: '<link>',
    });
    expect(fs.existsSync(workspace(run.file))).toBe(false);
  });

  test('--module esm without node_modules or source maps', async () => {
    writeFiles(dir, { 'lib.som': LIBRARY, 'main.som': MAIN });
    config({ compilerOptions: { module: 'esm' } });
    await runInProcess(['run', 'main.som'], { cwd: dir });
    const [run] = runs;
    expect(run.stdout).toBe('42\n');
    expect(run.options).toEqual({ cwd: dir, enableSourceMaps: false });
    expect(Object.keys(run.files).sort()).toEqual(['lib.js', 'main.js', 'package.json']);
  });

  test('--module esm reports compile errors with their files and positions', async () => {
    writeFiles(dir, {
      'main.som': 'ворид { х } аз "./нест";\n',
      'typed.som': TYPE_ERROR,
    });
    const missingImport = await runInProcess(['run', 'main.som', '--module', 'esm'], { cwd: dir });
    expect(missingImport.exitCode).toBe(1);
    expect(missingImport.stderr).toContain('Error: Compilation failed with 1 error(s):\n\n');
    expect(missingImport.stderr).toContain(
      `  1. ${path.join(dir, 'main.som')}:1:1\n     Cannot import`
    );

    const typeError = await runInProcess(['run', 'typed.som', '--module', 'esm'], { cwd: dir });
    expect(typeError.stderr).toContain(`  1. ${path.join(dir, 'typed.som')}:1\n     Type error`);

    const missingEntry = await runInProcess(['run', 'gone.som', '--module', 'esm'], { cwd: dir });
    expect(missingEntry.stderr).toContain(`  1. ${path.join(dir, 'gone.som')}\n     `);
    expect(missingEntry.stderr).toContain('ENOENT');
    expect(runs).toHaveLength(0);
  });

  test('a program that cannot be started or is killed fails the CLI', async () => {
    writeFiles(dir, { 'main.som': OK });
    execute.mockResolvedValueOnce({ status: null, signal: null, error: new Error('spawn EACCES') });
    const failed = await runInProcess(['run', 'main.som'], { cwd: dir });
    expect(failed).toEqual({
      stdout: '',
      stderr: 'Failed to execute Node: spawn EACCES',
      exitCode: 1,
    });

    execute.mockResolvedValueOnce({ status: null, signal: 'SIGKILL' });
    const killed = await runInProcess(['run', 'main.som'], { cwd: dir });
    expect(killed).toEqual({
      stdout: '',
      stderr: 'Process terminated with signal SIGKILL',
      exitCode: 1,
    });

    // Neither a status nor a signal: the exit code is left alone.
    execute.mockResolvedValueOnce({ status: null, signal: null });
    expect((await runInProcess(['run', 'main.som'], { cwd: dir })).exitCode).toBe(0);
  });

  test('a temporary directory that cannot be removed is a warning', async () => {
    writeFiles(dir, { 'main.som': OK });
    const realRm = fs.rmSync;
    // The module object itself: the namespace import's bindings cannot be redefined.
    const rm = jest.spyOn(require('fs') as typeof fs, 'rmSync').mockImplementation(((
      target: fs.PathLike,
      options
    ) => {
      if (String(target).includes('somon-run-')) throw new Error('EBUSY');
      return realRm(target, options);
    }) as typeof fs.rmSync);
    try {
      const result = await runInProcess(['run', 'main.som'], { cwd: dir });
      expect(result.stderr).toBe('Warning: unable to clean temporary files: EBUSY');
      expect(result.exitCode).toBe(0);
      rm.mockImplementation((() => {
        throw 'locked';
      }) as never);
      const plain = await runInProcess(['run', 'main.som'], { cwd: dir });
      expect(plain.stderr).toBe('Warning: unable to clean temporary files: locked');
    } finally {
      rm.mockRestore();
      for (const run of runs) realRm(path.dirname(run.file), { recursive: true, force: true });
    }
  });

  test('errors of the program and of the configuration fail the CLI before running', async () => {
    writeFiles(dir, { 'main.som': 'ворид { х } аз "./нест";\n' });
    const missing = await runInProcess(['run', 'main.som'], { cwd: dir });
    expect(missing.exitCode).toBe(1);
    expect(missing.stderr).toMatch(/^Error: Bundle process failed with 1 error\(s\)/);

    config({ moduleSystem: { loading: { encoding: 7 } } });
    const invalid = await runInProcess(['run', 'main.som'], { cwd: dir });
    expect(invalid.stderr.split('\n')).toEqual([
      'Configuration error:',
      `  Invalid configuration in ${path.join(dir, 'somon.config.json')}`,
      '  moduleSystem.loading.encoding: must be a string',
    ]);
    expect(runs).toHaveLength(0);
  });
});

describe('bundle', () => {
  beforeEach(() => {
    writeFiles(dir, { 'lib.som': LIBRARY, 'main.som': MAIN });
  });

  test('writes <input>.bundle.js and reports the modules it bundled', async () => {
    const result = await runInProcess(['bundle', 'main.som'], { cwd: dir });
    expect(result).toEqual({
      stdout: [
        '📦 Bundling main.som...',
        `✅ Bundle created: main.bundle.js`,
        '📊 Bundled 2 modules',
      ].join('\n'),
      stderr: '',
      exitCode: 0,
    });
    expect(node(path.join(dir, 'main.bundle.js')).stdout).toBe('42\n');
  });

  test('-o with --source-map, --inline-sources and --minify', async () => {
    const result = await runInProcess(
      ['bundle', 'main.som', '-o', 'out/app.js', '--source-map', '--inline-sources', '--minify'],
      { cwd: dir }
    );
    const output = path.join(dir, 'out', 'app.js');
    expect(result.stdout.split('\n')).toEqual([
      '📦 Bundling main.som...',
      `🗺️ Source map created: ${output}.map`,
      `✅ Bundle created: ${output}`,
      '📊 Bundled 2 modules',
    ]);
    const map = JSON.parse(read('out/app.js.map'));
    expect(map.sources.sort()).toEqual(['../lib.som', '../main.som']);
    expect(map.sourcesContent).toContain(LIBRARY);
    expect(read('out/app.js')).toMatch(/\n\/\/# sourceMappingURL=app\.js\.map$/);
    expect(node(output).stdout).toBe('42\n');
  });

  test('--format esm and iife with --global-name, --externals', async () => {
    writeFiles(dir, {
      'kitob.som':
        'ворид * чун путь аз "path";\nсодир функсия ном(): сатр { бозгашт путь.basename("/а/б.som"); }\n',
    });
    const esm = await runInProcess(
      ['bundle', 'kitob.som', '-f', 'esm', '-o', 'kitob.mjs', '--externals', 'path,fs'],
      { cwd: dir }
    );
    expect(esm.exitCode).toBe(0);
    writeFiles(dir, { 'use.mjs': 'import { ном } from "./kitob.mjs";\nconsole.log(ном());\n' });
    expect(node(path.join(dir, 'use.mjs')).stdout).toBe('б.som\n');

    await runInProcess(
      ['bundle', 'lib.som', '--format', 'iife', '--global-name', 'app.Ҳисоб', '-o', 'lib.iife.js'],
      { cwd: dir }
    );
    const context: Record<string, any> = {};
    vm.runInNewContext(read('lib.iife.js'), context);
    expect(context.app.Ҳисоб.ҷамъ(2, 3)).toBe(5);
  });

  test('the bundle section of the configuration, overridden by the command line', async () => {
    writeFiles(dir, { 'sub/x.som': 'чоп.сабт(1);\n' });
    config({
      bundle: {
        output: 'build/lib.js',
        format: 'iife',
        globalName: 'Ҳисоб',
        minify: true,
        sourceMaps: true,
        inlineSources: true,
        externals: ['fs'],
      },
    });
    await runInProcess(['bundle', 'lib.som'], { cwd: dir });
    const context: Record<string, any> = {};
    vm.runInNewContext(read('build/lib.js'), context);
    expect(context.Ҳисоб.ҷамъ(1, 1)).toBe(2);
    expect(JSON.parse(read('build/lib.js.map')).sourcesContent).toEqual([LIBRARY]);

    // The config file's directory anchors bundle.output, whatever the current directory
    await runInProcess(['bundle', 'x.som', '-f', 'commonjs', '--no-source-map'], {
      cwd: path.join(dir, 'sub'),
    });
    expect(exists('build/lib.js.map')).toBe(true);
    expect(node(path.join(dir, 'build', 'lib.js')).stdout).toBe('1\n');
  });

  test('moduleSystem.resolution and .loading of the configuration apply', async () => {
    writeFiles(dir, {
      'src/main.som': 'ворид { ҷамъ } аз "@lib/lib";\nчоп.сабт(ҷамъ(1, 2));\n',
    });
    config({
      moduleSystem: {
        resolution: { baseUrl: '.', paths: { '@lib/*': ['./*'] } },
        loading: { encoding: 'utf8', circularDependencyStrategy: 'warn' },
      },
    });
    const result = await runInProcess(['bundle', 'src/main.som', '-o', 'out.js'], { cwd: dir });
    expect(result.exitCode).toBe(0);
    expect(node(path.join(dir, 'out.js')).stdout).toBe('3\n');
  });

  // Bug in src/module-system: with `loading.cache: false` the entry module is
  // missing from the compilation result, so `bundle` and `run` fail with "Entry
  // module … missing from bundle results" (and `run --module esm` runs nothing).
  test.failing('moduleSystem.loading.cache false still bundles the program', async () => {
    config({ moduleSystem: { loading: { cache: false } } });
    const result = await runInProcess(['bundle', 'main.som'], { cwd: dir });
    expect(result.stderr).toBe('');
    expect(node(path.join(dir, 'main.bundle.js')).stdout).toBe('42\n');
  });

  test('compiler options of the configuration and the command line', async () => {
    writeFiles(dir, { 'arrow.som': 'тағ ф = () => 1;\nчоп.сабт(ф());\n' });
    config({ compilerOptions: { target: 'es5' } });
    await runInProcess(['bundle', 'arrow.som', '-o', 'es5.js'], { cwd: dir });
    expect(read('es5.js')).not.toContain('=>');
    await runInProcess(['bundle', 'arrow.som', '-o', 'next.js', '--target', 'esnext'], {
      cwd: dir,
    });
    expect(read('next.js')).toContain('=>');

    writeFiles(dir, { 'fields.som': 'синф А { х = 1; }\nчоп.сабт(нав А().х);\n' });
    const fields = (flag: string): Promise<unknown> =>
      runInProcess(
        ['bundle', 'fields.som', '-o', `${flag}.js`, '--target', 'es2020', `--${flag}`],
        {
          cwd: dir,
        }
      );
    await fields('use-define-for-class-fields');
    await fields('no-use-define-for-class-fields');
    expect(read('use-define-for-class-fields.js')).toContain('Object.defineProperty');
    expect(read('no-use-define-for-class-fields.js')).not.toContain('Object.defineProperty');
    expect(node(path.join(dir, 'use-define-for-class-fields.js')).stdout).toBe('1\n');
  });

  test('refuses to overwrite its input, and reports errors', async () => {
    const same = await runInProcess(['bundle', 'main.som', '-o', 'main.som'], { cwd: dir });
    expect(same).toEqual({
      stdout: '',
      stderr: en.common.outputEqualsInput(path.join(dir, 'main.som')),
      exitCode: 1,
    });

    writeFiles(dir, { 'broken.som': 'ворид { х } аз "./нест";\n' });
    const broken = await runInProcess(['bundle', 'broken.som'], { cwd: dir });
    expect(broken.exitCode).toBe(1);
    expect(broken.stderr).toMatch(/^Bundle error: Bundle process failed with 1 error\(s\)/);
    expect(exists('broken.bundle.js')).toBe(false);

    config({ bundle: { format: 'umd' } });
    const invalid = await runInProcess(['bundle', 'main.som'], { cwd: dir });
    expect(invalid.stderr).toContain('  bundle.format: must be one of: commonjs, esm, iife');
  });

  test('--format, --global-name and --lib are validated by the command line', async () => {
    const format = await runInProcess(['bundle', 'main.som', '-f', 'umd'], { cwd: dir });
    expect(format.exitCode).toBe(1);
    expect(format.stderr).toContain('Allowed choices are commonjs, esm, iife');

    const name = await runInProcess(['bundle', 'main.som', '--global-name', 'a-b'], { cwd: dir });
    expect(name.exitCode).toBe(1);
    expect(name.stderr).toContain(
      'must be an identifier or a dotted path of identifiers, e.g. "MyLib" or "app.lib"'
    );

    const lib = await runInProcess(['bundle', 'main.som', '--lib', 'es2022,браузер'], {
      cwd: dir,
    });
    expect(lib.exitCode).toBe(1);
    expect(lib.stderr).toContain("unknown lib 'браузер'");
    const empty = await runInProcess(['bundle', 'main.som', '--lib', ','], { cwd: dir });
    expect(empty.exitCode).toBe(1);
    expect(exists('main.bundle.js')).toBe(false);
  });
});

describe('check', () => {
  test('a program without errors, with either checker', async () => {
    writeFiles(dir, { 'lib.som': LIBRARY, 'main.som': MAIN });
    const typescript = await runInProcess(['check', 'main.som', 'lib.som'], { cwd: dir });
    expect(typescript).toEqual({
      stdout: '✅ No type errors in 2 file(s)',
      stderr: '',
      exitCode: 0,
    });
    const somon = await runInProcess(['check', 'main.som', '--checker', 'somon'], { cwd: dir });
    expect(somon.stdout).toBe('✅ No type errors in 1 file(s)');
    expect(exists('main.js')).toBe(false);
  });

  test('errors are listed per file, indented, with a summary and exit code 1', async () => {
    writeFiles(dir, { 'a.som': TYPE_ERROR, 'b.som': OK, 'c.som': PARSE_ERROR });
    const result = await runInProcess(['check', 'a.som', 'b.som', 'c.som', 'd.som'], {
      cwd: dir,
    });
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr.split('\n')).toEqual([
      'a.som:',
      "  Type error [TS2322] at line 1, column 5: Type 'сатр' is not assignable to type 'рақам'.",
      '  > тағ х: рақам = "сатр";',
      'c.som:',
      "  Unexpected token '=' at line 1, column 5 (Expected identifier)",
      'd.som:',
      "  Error: File 'd.som' not found",
      '❌ Found 3 type error(s) in 3 file(s)',
    ]);

    const somon = await runInProcess(['check', 'a.som', '--checker', 'somon'], { cwd: dir });
    expect(somon.stderr).toContain('[TYPE_NOT_ASSIGNABLE]');
    expect(somon.stderr).toContain('❌ Found 1 type error(s) in 1 file(s)');
  });

  test('the configuration chooses the checker and options; the command line wins', async () => {
    writeFiles(dir, {
      'n.som': 'функсия ф(х: рақам | холӣ): рақам { бозгашт х + 1; }\nчоп.сабт(ф(1));\n',
      'big.som': 'тағ а = 1n;\nчоп.сабт(а);\n',
      'dec.som':
        'функсия лог(ҳадаф: ҳар, калид: ҳар, ҷой: рақам): беқимат {}\n' +
        'синф А { м(@лог х: рақам): беқимат {} }\n',
    });
    expect((await runInProcess(['check', 'n.som'], { cwd: dir })).exitCode).toBe(0);
    expect((await runInProcess(['check', 'n.som', '--strict'], { cwd: dir })).exitCode).toBe(1);
    config({ compilerOptions: { strict: true, checker: 'somon', useDefineForClassFields: false } });
    const somonStrict = await runInProcess(['check', 'n.som'], { cwd: dir });
    expect(somonStrict.exitCode).toBe(1);
    expect(somonStrict.stderr).not.toContain('[TS');
    const typescript = await runInProcess(['check', 'n.som', '--checker', 'typescript'], {
      cwd: dir,
    });
    expect(typescript.stderr).toContain('[TS');

    config({ compilerOptions: { target: 'es2015', lib: ['es2015'] } });
    expect((await runInProcess(['check', 'big.som'], { cwd: dir })).exitCode).toBe(1);
    const esnext = await runInProcess(
      ['check', 'big.som', '--target', 'esnext', '--lib', 'esnext,dom'],
      {
        cwd: dir,
      }
    );
    expect(esnext.exitCode).toBe(0);

    expect((await runInProcess(['check', 'dec.som'], { cwd: dir })).exitCode).toBe(1);
    config({ compilerOptions: { experimentalDecorators: true } });
    expect((await runInProcess(['check', 'dec.som'], { cwd: dir })).exitCode).toBe(0);
    config({ compilerOptions: {} });
    expect(
      (await runInProcess(['check', 'dec.som', '--experimental-decorators'], { cwd: dir })).exitCode
    ).toBe(0);
  });

  test('diagnostics follow --lang, unless compilerOptions.locale says otherwise', async () => {
    writeFiles(dir, { 'b.som': 'тағ н: рақам = "н";\n' });
    const tajik = await runInProcess(['check', 'b.som'], { cwd: dir, lang: 'tj' });
    expect(tajik.stderr).toContain("Навъи 'сатр' ба навъи 'рақам' мувофиқ нест.");
    expect(tajik.stderr).toContain(tj.commands.check.messages.errorsFound(1, 1));

    config({ compilerOptions: { locale: 'ru' } });
    const russian = await runInProcess(['check', 'b.som'], { cwd: dir, lang: 'en' });
    expect(russian.stderr).toMatch(/Тип "сатр" не может быть назначен для типа "рақам"/);
    expect(russian.stderr).toContain(en.commands.check.messages.errorsFound(1, 1));
  });

  test('an invalid configuration is a configuration error', async () => {
    writeFiles(dir, { 'a.som': OK });
    config({ compilerOptions: { checker: 'flow' } });
    const result = await runInProcess(['check', 'a.som'], { cwd: dir });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('  compilerOptions.checker: must be one of: somon, typescript');
  });
});

describe('init', () => {
  test('creates a project that compiles and runs', async () => {
    const result = await runInProcess(['init', 'app'], { cwd: dir });
    expect(result.exitCode).toBe(0);
    expect(result.stdout.split('\n')).toEqual([
      "✅ Created SomonScript project 'app'",
      '',
      'Next steps:',
      '  cd app',
      '  npm install',
      '  npm run dev',
    ]);
    expect(JSON.parse(read('app/package.json'))).toEqual({
      name: 'app',
      version: '0.1.0',
      description: 'A SomonScript project',
      main: 'dist/main.js',
      scripts: {
        build: 'somon compile src/main.som -o dist/main.js',
        dev: 'somon run src/main.som',
      },
      devDependencies: { [packageJson.name]: `^${packageJson.version}` },
    });
    expect(JSON.parse(read('app/somon.config.json'))).toEqual({
      compilerOptions: {
        target: 'es2022',
        sourceMap: false,
        minify: false,
        noTypeCheck: false,
        strict: false,
        outDir: 'dist',
        watch: false,
        compileOnSave: false,
      },
    });
    expect(fs.readdirSync(path.join(dir, 'app', 'dist'))).toEqual([]);

    const compiled = await runInProcess(['compile', 'src/main.som'], {
      cwd: path.join(dir, 'app'),
    });
    expect(compiled.exitCode).toBe(0);
    expect(node(path.join(dir, 'app', 'dist', 'main.js')).stdout).toBe('Салом, ҷаҳон!\n');
  });

  test('the default name, an existing directory and an impossible one', async () => {
    expect((await runInProcess(['init'], { cwd: dir })).exitCode).toBe(0);
    expect(exists('somon-project/src/main.som')).toBe(true);

    const again = await runInProcess(['init'], { cwd: dir });
    expect(again).toEqual({
      stdout: '',
      stderr: "Error: Directory 'somon-project' already exists",
      exitCode: 1,
    });

    writeFiles(dir, { file: '' });
    const impossible = await runInProcess(['init', 'file/sub'], { cwd: dir });
    expect(impossible.exitCode).toBe(1);
    expect(impossible.stderr).toMatch(NODE_ERROR('(ENOTDIR|EEXIST)'));
  });
});

describe('module-info', () => {
  beforeEach(() => {
    writeFiles(dir, {
      'lib.som': LIBRARY,
      'main.som': MAIN,
      'a.som': 'ворид { б } аз "./b";\nсодир собит а = 1;\nчоп.сабт(б);\n',
      'b.som': 'ворид { а } аз "./a";\nсодир собит б = 2;\nчоп.сабт(а);\n',
    });
  });

  test('--stats, --graph and --circular', async () => {
    const result = await runInProcess(
      ['module-info', 'main.som', '--stats', '--graph', '--circular'],
      {
        cwd: dir,
      }
    );
    expect(result.exitCode).toBe(0);
    expect(result.stdout.split('\n')).toEqual([
      '🔍 Analyzing main.som...',
      '',
      '📊 Module Statistics:',
      '  Total modules: 2',
      '  Total dependencies: 1',
      '  Average dependencies per module: 0.50',
      '  Maximum dependency depth: 1',
      '  Circular dependencies: 0',
      '',
      '🕸️  Dependency Graph:',
      '  main.som:',
      `    └── ${path.join(dir, 'lib.som')}`,
      '  lib.som:',
      '',
      '✅ No circular dependencies found',
    ]);
  });

  test('reports circular dependencies', async () => {
    const result = await runInProcess(['info', 'a.som', '--circular'], { cwd: dir });
    const lines = result.stdout.split('\n');
    expect(lines.slice(0, 3)).toEqual(['🔍 Analyzing a.som...', '', '❌ Issues found:']);
    expect(lines[3]).toMatch(
      /^ {2}• Circular dependencies found: .*a\.som -> .*b\.som -> .*a\.som$/
    );
  });

  test('a missing entry and an invalid configuration', async () => {
    const missing = await runInProcess(['module-info', 'gone.som'], { cwd: dir });
    expect(missing.exitCode).toBe(1);
    expect(missing.stderr).toMatch(/^Analysis error: /);

    config({ moduleSystem: { resolution: { extensions: '.som' } } });
    const invalid = await runInProcess(['module-info', 'main.som'], { cwd: dir });
    expect(invalid.stderr).toContain('  moduleSystem.resolution.extensions: must be string[]');
  });
});

describe('resolve', () => {
  beforeEach(() => {
    writeFiles(dir, {
      'lib.som': LIBRARY,
      'src/main.som': MAIN,
      'node_modules/hisob/package.json': JSON.stringify({ name: 'hisob', main: 'index.js' }),
      'node_modules/hisob/index.js': 'exports.х = 1;\n',
    });
  });

  test('a relative specifier, from the current directory', async () => {
    const result = await runInProcess(['resolve', './lib'], { cwd: dir });
    expect(result.stdout.split('\n')).toEqual([
      "🎯 Resolved './lib':",
      `  Path: ${path.join(dir, 'lib.som')}`,
      '  Extension: .som',
      '  External: No',
    ]);
  });

  test('a package, from a file', async () => {
    const result = await runInProcess(['resolve', 'hisob', '--from', 'src/main.som'], { cwd: dir });
    expect(result.stdout.split('\n')).toEqual([
      "🎯 Resolved 'hisob':",
      `  Path: ${path.join(dir, 'node_modules', 'hisob', 'index.js')}`,
      '  Extension: .js',
      '  External: Yes',
      '  Package: hisob',
    ]);
  });

  test('a specifier that does not resolve', async () => {
    const result = await runInProcess(['resolve', './нест', '-f', 'src/main.som'], { cwd: dir });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toMatch(/^Resolve error: Cannot resolve module/);
  });
});

describe('program', () => {
  test('--version prints the package version', async () => {
    const result = await runInProcess(['--version']);
    expect(result).toEqual({ stdout: packageJson.version, stderr: '', exitCode: 0 });
    expect((await runInProcess(['-V'])).stdout).toBe(packageJson.version);
  });

  test('unknown commands and missing arguments are usage errors', async () => {
    const unknown = await runInProcess(['frobnicate']);
    expect(unknown.exitCode).toBe(1);
    expect(unknown.stderr).toContain("unknown command 'frobnicate'");
    const missing = await runInProcess(['compile']);
    expect(missing.exitCode).toBe(1);
    expect(missing.stderr).toContain("missing required argument 'input'");
  });

  test('--lang only accepts the supported languages', async () => {
    writeFiles(dir, { 'a.som': OK });
    expect((await runInProcess(['--lang', 'ru', 'compile', 'a.som'], { cwd: dir })).exitCode).toBe(
      0
    );
    const unsupported = await runInProcess(['--lang', 'de', 'compile', 'a.som'], { cwd: dir });
    expect(unsupported.exitCode).toBe(1);
    expect(unsupported.stderr).toContain('Allowed choices are en, tj, ru');
  });

  const COMMANDS: Array<[string, keyof typeof en.commands, string | undefined]> = [
    ['compile', 'compile', 'c'],
    ['run', 'run', 'r'],
    ['init', 'init', undefined],
    ['bundle', 'bundle', 'b'],
    ['check', 'check', undefined],
    ['module-info', 'moduleInfo', 'info'],
    ['resolve', 'resolve', undefined],
    ['fmt', 'fmt', undefined],
    ['repl', 'repl', undefined],
    ['migrate', 'migrate', undefined],
    ['lsp', 'lsp', undefined],
  ];

  test.each(['en', 'ru', 'tj'] as const)(
    'in %s every command has its English name and alias, and the localized ones',
    lang => {
      i18n.setLanguage(lang);
      try {
        const program = createProgram();
        expect(program.commands.map(command => command.name())).toEqual(
          COMMANDS.map(([name]) => name)
        );
        for (const [name, key, englishAlias] of COMMANDS) {
          const command = program.commands.find(candidate => candidate.name() === name)!;
          const tr = translations[lang].commands[key] as {
            name: string;
            alias?: string;
            description: string;
          };
          const expected = [tr.name, englishAlias, tr.alias].filter(
            (alias, index, all): alias is string =>
              !!alias && alias !== name && all.indexOf(alias) === index
          );
          expect(command.aliases()).toEqual(expected);
          expect(command.description()).toBe(tr.description);
        }
      } finally {
        i18n.setLanguage('en');
      }
    }
  );

  test.each(['en', 'ru', 'tj'] as const)(
    'help in %s lists the commands and options',
    async lang => {
      // Commander wraps long descriptions
      const text = async (args: string[]): Promise<string> =>
        (await runInProcess(args, { lang })).stdout.replace(/\s+/g, ' ');
      expect((await runInProcess(['--help'], { lang })).exitCode).toBe(0);
      const help = { stdout: await text(['--help']) };
      const tr = translations[lang];
      expect(help.stdout).toContain(tr.commands.somon.description);
      expect(help.stdout).toContain(tr.common.languageOption);
      expect(help.stdout).toContain(tr.common.version);
      expect(help.stdout).toContain(
        `compile|${tr.commands.compile.name === 'compile' ? 'c' : tr.commands.compile.name}`
      );

      const compileHelp = { stdout: await text(['help', 'compile']) };
      expect(compileHelp.stdout).toContain(tr.commands.compile.options.declaration);
      expect(compileHelp.stdout).toContain(tr.commands.compile.options.noUseDefineForClassFields);
      expect(compileHelp.stdout).not.toContain('--production');
      const bundleHelp = { stdout: await text(['bundle', '--help']) };
      expect(bundleHelp.stdout).toContain(tr.commands.bundle.options.globalName);
      expect(bundleHelp.stdout).not.toContain('--module');
    }
  );

  test.each(['ru', 'tj'] as const)('commands run under their %s names and aliases', async lang => {
    writeFiles(dir, { 'a.som': OK });
    const tr = translations[lang].commands;
    const byName = await runInProcess([tr.compile.name, 'a.som', '-o', 'n.js'], { cwd: dir, lang });
    expect(byName.stdout).toBe(tr.compile.messages.compiled('a.som', 'n.js'));
    const byAlias = await runInProcess([tr.compile.alias, 'a.som', '-o', 'm.js'], {
      cwd: dir,
      lang,
    });
    expect(byAlias.exitCode).toBe(0);
    const english = await runInProcess(['check', 'a.som', '--checker', 'somon'], {
      cwd: dir,
      lang,
    });
    expect(english.stdout).toBe(tr.check.messages.noErrors(1));
    const missing = await runInProcess([tr.compile.name, 'нест.som'], { cwd: dir, lang });
    expect(missing.stderr).toBe(tr.compile.messages.fileNotFound('нест.som'));
  });
});

describe('the same errors in every language', () => {
  test.each(['en', 'ru', 'tj'] as Language[])('%s', async lang => {
    const tr = translations[lang];
    writeFiles(dir, { 'a.som': TYPE_ERROR, 'ok.som': OK, 'w.som': WARNING });
    const failed = await runInProcess(['compile', 'a.som'], { cwd: dir, lang });
    expect(failed.stderr.split('\n')[0]).toBe(tr.commands.compile.messages.compilationErrors);
    const warned = await runInProcess(['compile', 'w.som'], { cwd: dir, lang });
    expect(warned.stderr.split('\n')[0]).toBe(tr.commands.compile.messages.warnings);
    const same = await runInProcess(['compile', 'ok.som', '-o', 'ok.som'], { cwd: dir, lang });
    expect(same.stderr).toBe(tr.common.outputEqualsInput('ok.som'));
    const exists = await runInProcess(['init', 'ok.som'], { cwd: dir, lang });
    expect(exists.stderr).toBe(tr.commands.init.messages.directoryExists('ok.som'));
    config({ compilerOptions: { strict: 1 } });
    const invalid = await runInProcess(['compile', 'ok.som'], { cwd: dir, lang });
    expect(invalid.stderr.split('\n')[0]).toBe(tr.common.configError);
  });
});

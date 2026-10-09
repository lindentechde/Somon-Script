import { spawn, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { buildCliOnce, canonicalTmpDir } from './helpers/paths';

/**
 * Spawn-based tests for `somon run`: argument forwarding, dependency resolution
 * from a temporary bundle, source maps, signal forwarding and cleanup.
 */
describe('CLI run (spawned)', () => {
  let cliPath: string;
  let tempDir: string;
  // Private temp directory for the CLI, so parallel suites cannot interfere.
  let cliTmpDir: string;

  const cliEnv = () => ({ ...process.env, TMPDIR: cliTmpDir, TMP: cliTmpDir, TEMP: cliTmpDir });

  const run = (args: string[]) =>
    spawnSync(process.execPath, [cliPath, 'run', ...args], {
      cwd: tempDir,
      encoding: 'utf-8',
      env: cliEnv(),
    });

  const runTempDirs = (): string[] => fs.readdirSync(cliTmpDir);

  beforeAll(() => {
    cliPath = buildCliOnce();
  });

  beforeEach(() => {
    tempDir = canonicalTmpDir('somon-cli-run-');
    cliTmpDir = canonicalTmpDir('somon-cli-run-tmp-');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    fs.rmSync(cliTmpDir, { recursive: true, force: true });
  });

  test('forwards only the program arguments, including those after --', () => {
    fs.writeFileSync(
      path.join(tempDir, 'args.som'),
      'чоп.сабт(JSON.stringify(process.argv.slice(2)));'
    );

    expect(run(['args.som', '--minify', 'a', 'b']).stdout.trim()).toBe('["a","b"]');
    expect(run(['args.som', '--', '--foo', '-x']).stdout.trim()).toBe('["--foo","-x"]');
    expect(run(['args.som']).stdout.trim()).toBe('[]');
  });

  test('resolves relative imports and node_modules packages next to the source', () => {
    const pkgDir = path.join(tempDir, 'node_modules', 'somon-test-pkg');
    fs.mkdirSync(pkgDir, { recursive: true });
    fs.writeFileSync(
      path.join(pkgDir, 'package.json'),
      JSON.stringify({ name: 'somon-test-pkg', main: 'index.js' })
    );
    fs.writeFileSync(path.join(pkgDir, 'index.js'), 'exports.greet = n => "салом, " + n;');
    fs.mkdirSync(path.join(tempDir, 'lib'));
    fs.writeFileSync(
      path.join(tempDir, 'lib', 'math.som'),
      'содир функсия ду(х: рақам): рақам { бозгашт х * 2; }'
    );
    fs.writeFileSync(
      path.join(tempDir, 'main.som'),
      [
        'ворид { ду } аз "./lib/math";',
        'ворид { greet } аз "somon-test-pkg";',
        'чоп.сабт(ду(21));',
        'чоп.сабт(greet("ҷаҳон"));',
      ].join('\n')
    );

    const result = run(['main.som']);

    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
    expect(result.stdout.split('\n')).toEqual(['42', 'салом, ҷаҳон', '']);
    // Nothing is written next to the source.
    expect(fs.readdirSync(tempDir).sort()).toEqual(['lib', 'main.som', 'node_modules']);
  });

  test('works when the source directory is read-only', () => {
    if (process.platform === 'win32' || process.getuid?.() === 0) {
      // chmod does not restrict root or Windows users.
      return;
    }
    const srcDir = path.join(tempDir, 'ro');
    fs.mkdirSync(srcDir);
    fs.writeFileSync(path.join(srcDir, 'hello.som'), 'чоп.сабт("салом");');
    fs.chmodSync(srcDir, 0o555);
    try {
      const result = run([path.join('ro', 'hello.som')]);
      expect(result.status).toBe(0);
      expect(result.stdout.trim()).toBe('салом');
    } finally {
      fs.chmodSync(srcDir, 0o755);
    }
  });

  test('propagates the program exit code', () => {
    fs.writeFileSync(path.join(tempDir, 'exit.som'), 'process.exit(7);');
    expect(run(['exit.som']).status).toBe(7);
  });

  test('--source-map maps stack traces back to the .som file', () => {
    fs.writeFileSync(
      path.join(tempDir, 'thr.som'),
      'функсия ф(): холӣ {\n  партофтан нав Error("бад");\n}\nф();\n'
    );

    const withMap = run(['thr.som', '--source-map']);
    expect(withMap.status).not.toBe(0);
    expect(withMap.stderr).toContain(`${path.join(tempDir, 'thr.som')}:2:`);

    const withoutMap = run(['thr.som']);
    expect(withoutMap.stderr).not.toContain('thr.som:2:');
  });

  test('cleans up its temporary directory', () => {
    fs.writeFileSync(path.join(tempDir, 'hello.som'), 'чоп.сабт("салом");');
    expect(run(['hello.som']).status).toBe(0);
    expect(runTempDirs()).toEqual([]);
  });

  test('forwards SIGTERM to the program and cleans up', async () => {
    if (process.platform === 'win32') {
      // POSIX signals cannot be delivered to a specific process on Windows.
      return;
    }
    const pidFile = path.join(tempDir, 'child.pid');
    fs.writeFileSync(
      path.join(tempDir, 'long.som'),
      [
        `require("fs").writeFileSync(${JSON.stringify(pidFile)}, String(process.pid));`,
        'setInterval(() => {}, 1000);',
      ].join('\n')
    );

    const parent = spawn(process.execPath, [cliPath, 'run', 'long.som', '--no-type-check'], {
      cwd: tempDir,
      stdio: 'ignore',
      env: cliEnv(),
    });
    const exited = new Promise<number | null>(resolve => parent.on('exit', code => resolve(code)));

    const deadline = Date.now() + 15000;
    while (!fs.existsSync(pidFile) || fs.readFileSync(pidFile, 'utf-8') === '') {
      if (Date.now() > deadline) throw new Error('program did not start');
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    const childPid = Number(fs.readFileSync(pidFile, 'utf-8'));

    parent.kill('SIGTERM');
    const code = await exited;

    expect(code).not.toBe(0);
    // The child received the signal and is gone.
    let childAlive = true;
    for (let i = 0; i < 40 && childAlive; i++) {
      try {
        process.kill(childPid, 0);
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch {
        childAlive = false;
      }
    }
    if (childAlive) process.kill(childPid, 'SIGKILL');
    expect(childAlive).toBe(false);
    expect(runTempDirs()).toEqual([]);
  }, 30000);
});

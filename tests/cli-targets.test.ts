import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as vm from 'vm';

import { createProgram } from '../src/cli/program';
import { analyzeSyntax, targetAtLeast, type Target } from '../src/targets';
import { buildCliOnce, canonicalTmpDir, getCliPath } from './helpers/paths';

/**
 * `--target`, `--lib`, `--use-define-for-class-fields` and the bundle formats
 * (`--format esm|iife`, `--global-name`) through the built CLI.
 */
describe('CLI targets and bundle formats (spawned)', () => {
  let tempDir: string;

  const PROGRAM = [
    'синф Ҳисоб {',
    '    #баланс = 0;',
    '    статикӣ шумора = 0;',
    '    илова(маблағ: рақам): рақам { ин.#баланс += маблағ; бозгашт ин.#баланс; }',
    '}',
    'функсия* рақамҳо() { ҳосил 1; ҳосил 2; }',
    'ҳамзамон функсия асосӣ(): Ваъда<холӣ> {',
    '    собит ҳ = нав Ҳисоб();',
    '    ҳ.илова(5);',
    '    чоп.сабт(ҳ.илова(interop()), [...рақамҳо()].join(","), 2 ** 3, интизор Ваъда.resolve("ok"));',
    '}',
    'функсия interop(): рақам { бозгашт 10; }',
    'асосӣ();',
  ].join('\n');

  const cli = (args: string[]) =>
    spawnSync(process.execPath, [getCliPath(), ...args], { cwd: tempDir, encoding: 'utf-8' });

  const node = (file: string) =>
    spawnSync(process.execPath, [file], { cwd: tempDir, encoding: 'utf-8' });

  beforeAll(() => {
    buildCliOnce();
  });

  beforeEach(() => {
    tempDir = canonicalTmpDir('somon-cli-targets-');
    fs.writeFileSync(path.join(tempDir, 'app.som'), PROGRAM);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test.each<Target>(['es5', 'es2015', 'es2017', 'es2020', 'es2022', 'esnext'])(
    'compile --target %s writes code that uses only that syntax and runs the same',
    target => {
      const output = path.join(tempDir, `app.${target}.js`);
      const result = cli(['compile', 'app.som', '--target', target, '-o', output]);
      expect(result.stderr).toBe('');
      expect(result.status).toBe(0);
      const code = fs.readFileSync(output, 'utf8');
      expect(targetAtLeast(target, analyzeSyntax(code, 'esnext').required)).toBe(true);
      expect(node(output).stdout).toBe('15 1,2 8 ok\n');
    }
  );

  test('compile reports what the target cannot express', () => {
    fs.writeFileSync(path.join(tempDir, 'big.som'), 'тағ а = 1;\nчоп.сабт(10n * 2n);\n');
    const result = cli(['compile', 'big.som', '--target', 'es2019']);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      'Target error at line 2, column 1: BigInt literals are only available when targeting es2020 or later (target is es2019).'
    );
    expect(fs.existsSync(path.join(tempDir, 'big.js'))).toBe(false);
    expect(cli(['compile', 'big.som', '--target', 'es2020']).status).toBe(0);
  });

  test('--target only accepts the known targets', () => {
    const result = cli(['compile', 'app.som', '--target', 'es2030']);
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/argument 'es2030' is invalid. Allowed choices are es5, es2015/);
  });

  test('--lib accepts TypeScript lib names and rejects others', () => {
    expect(cli(['compile', 'app.som', '--lib', 'ES2022, dom']).status).toBe(0);
    const result = cli(['compile', 'app.som', '--lib', 'es2022,хато']);
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/option '--lib <libs>' argument 'es2022,хато' is invalid/);
    expect(result.stderr).toContain("unknown lib 'хато'");
    expect(cli(['compile', 'app.som', '--lib', ',']).status).toBe(1);
  });

  test('--use-define-for-class-fields and --no-use-define-for-class-fields', () => {
    const define = path.join(tempDir, 'define.js');
    const assign = path.join(tempDir, 'assign.js');
    cli([
      'compile',
      'app.som',
      '--target',
      'es2020',
      '--use-define-for-class-fields',
      '-o',
      define,
    ]);
    cli([
      'compile',
      'app.som',
      '--target',
      'es2022',
      '--no-use-define-for-class-fields',
      '-o',
      assign,
    ]);
    expect(fs.readFileSync(define, 'utf8')).toContain('Object.defineProperty(Ҳисоб, "шумора"');
    expect(fs.readFileSync(assign, 'utf8')).toContain('static { this.шумора = 0; }');
  });

  test('somon.config.json sets target, lib and useDefineForClassFields', () => {
    fs.writeFileSync(
      path.join(tempDir, 'somon.config.json'),
      JSON.stringify({
        compilerOptions: { target: 'es5', lib: ['es2015', 'dom'], useDefineForClassFields: true },
      })
    );
    const result = cli(['compile', 'app.som']);
    expect(result.status).toBe(0);
    const code = fs.readFileSync(path.join(tempDir, 'app.js'), 'utf8');
    expect(analyzeSyntax(code, 'esnext').required).toBe('es5');
    expect(code).toContain('Object.defineProperty(Ҳисоб, "шумора"');

    fs.writeFileSync(
      path.join(tempDir, 'somon.config.json'),
      JSON.stringify({ compilerOptions: { lib: ['es2099'] } })
    );
    const invalid = cli(['compile', 'app.som']);
    expect(invalid.status).toBe(1);
    expect(invalid.stderr).toContain("compilerOptions.lib: unknown lib 'es2099'");
  });

  test('run --target es5 runs the lowered program', () => {
    const result = cli(['run', 'app.som', '--target', 'es5']);
    expect(result.stderr).toBe('');
    expect(result.stdout).toBe('15 1,2 8 ok\n');
  });

  describe('bundle', () => {
    beforeEach(() => {
      fs.writeFileSync(
        path.join(tempDir, 'kitob.som'),
        [
          'содир функсия салом(ном: сатр): сатр { бозгашт `Салом, ${ном}!`; }',
          'содир пешфарз синф Ҳисобкунак { #н = 1; ҷамъ(а: рақам, б: рақам): рақам { бозгашт а + б + ин.#н - 1; } }',
        ].join('\n')
      );
    });

    test('--format esm writes an ES module that a dynamic import loads', () => {
      const output = path.join(tempDir, 'kitob.mjs');
      const result = cli(['bundle', 'kitob.som', '--format', 'esm', '-o', output]);
      expect(result.status).toBe(0);
      fs.writeFileSync(
        path.join(tempDir, 'runner.mjs'),
        [
          'const китоб = await import("./kitob.mjs");',
          'console.log(китоб.салом("ҷаҳон"), new китоб.default().ҷамъ(1, 2));',
          'console.log(Object.keys(китоб).sort().join(","));',
        ].join('\n')
      );
      const run = node(path.join(tempDir, 'runner.mjs'));
      expect(run.stderr).toBe('');
      expect(run.stdout).toBe('Салом, ҷаҳон! 3\ndefault,салом\n');
    });

    test('--format iife --global-name runs in a browser-like context', () => {
      const output = path.join(tempDir, 'kitob.js');
      const result = cli([
        'bundle',
        'kitob.som',
        '--format',
        'iife',
        '--global-name',
        'Китоб',
        '--target',
        'es5',
        '-o',
        output,
      ]);
      expect(result.status).toBe(0);
      const code = fs.readFileSync(output, 'utf8');
      // A window without require, module or exports
      const window: Record<string, any> = {};
      window.window = window;
      vm.runInNewContext(code, window);
      expect(window.Китоб.салом('ҷаҳон')).toBe('Салом, ҷаҳон!');
      expect(new window.Китоб.default().ҷамъ(2, 2)).toBe(4);
      expect(analyzeSyntax(code, 'esnext').required).toBe('es5');
    });

    test('bundle.format and bundle.globalName come from somon.config.json', () => {
      fs.writeFileSync(
        path.join(tempDir, 'somon.config.json'),
        JSON.stringify({ bundle: { format: 'iife', globalName: 'app.kitob' } })
      );
      expect(cli(['bundle', 'kitob.som']).status).toBe(0);
      const context: Record<string, any> = {};
      vm.runInNewContext(fs.readFileSync(path.join(tempDir, 'kitob.bundle.js'), 'utf8'), context);
      expect(context.app.kitob.салом('а')).toBe('Салом, а!');
    });

    test('--format and --global-name are validated', () => {
      const format = cli(['bundle', 'kitob.som', '--format', 'umd']);
      expect(format.status).toBe(1);
      expect(format.stderr).toMatch(/Allowed choices are commonjs, esm, iife/);
      const name = cli(['bundle', 'kitob.som', '--format', 'iife', '--global-name', 'a-b']);
      expect(name.status).toBe(1);
      expect(name.stderr).toMatch(/--global-name <name>' argument 'a-b' is invalid/);
    });

    test('--format commonjs stays the default', () => {
      expect(cli(['bundle', 'kitob.som', '-o', 'kitob.cjs']).status).toBe(0);
      fs.writeFileSync(
        path.join(tempDir, 'use.cjs'),
        'const к = require("./kitob.cjs"); console.log(к.салом("б"));'
      );
      expect(node(path.join(tempDir, 'use.cjs')).stdout).toBe('Салом, б!\n');
    });
  });
});

/** The same options parsed in-process, where coverage sees them. */
describe('CLI targets and bundle formats (in-process)', () => {
  let tempDir: string;
  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  let exitCode: typeof process.exitCode;

  beforeEach(() => {
    tempDir = canonicalTmpDir('somon-cli-targets-in-');
    exitCode = process.exitCode;
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    fs.writeFileSync(
      path.join(tempDir, 'app.som'),
      'содир синф К { статикӣ а = 1; }\nсодир собит б = К.а ?? 2;\n'
    );
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
    process.exitCode = exitCode;
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  /** A program whose errors throw instead of exiting the test process. */
  function program() {
    const created = createProgram();
    for (const command of [created, ...created.commands]) {
      command.exitOverride();
      command.configureOutput({ writeErr: () => {}, writeOut: () => {} });
    }
    return created;
  }

  test('compile passes --target, --lib and --use-define-for-class-fields', async () => {
    const output = path.join(tempDir, 'app.js');
    await program().parseAsync(
      [
        'compile',
        path.join(tempDir, 'app.som'),
        '--target',
        'es5',
        '--lib',
        'ES2015,dom',
        '--use-define-for-class-fields',
        '-o',
        output,
      ],
      { from: 'user' }
    );
    const code = fs.readFileSync(output, 'utf8');
    expect(code).toContain('Object.defineProperty(К, "а"');
    expect(analyzeSyntax(code, 'esnext').required).toBe('es5');
  });

  test('--lib and --global-name reject invalid values', async () => {
    const file = path.join(tempDir, 'app.som');
    await expect(
      program().parseAsync(['compile', file, '--lib', 'es2022,хато'], { from: 'user' })
    ).rejects.toThrow(/unknown lib 'хато'/);
    await expect(
      program().parseAsync(['compile', file, '--lib', ' , '], { from: 'user' })
    ).rejects.toThrow(/unknown lib ''/);
    await expect(
      program().parseAsync(['bundle', file, '--format', 'iife', '--global-name', '1a'], {
        from: 'user',
      })
    ).rejects.toThrow(/must be an identifier/);
  });

  test('bundle --format iife --global-name with the config target', async () => {
    fs.writeFileSync(
      path.join(tempDir, 'somon.config.json'),
      JSON.stringify({ compilerOptions: { target: 'es2015', lib: ['es2015'] } })
    );
    const output = path.join(tempDir, 'app.iife.js');
    await program().parseAsync(
      [
        'bundle',
        path.join(tempDir, 'app.som'),
        '--format',
        'iife',
        '--global-name',
        'Барнома',
        '--no-use-define-for-class-fields',
        '-o',
        output,
      ],
      { from: 'user' }
    );
    const code = fs.readFileSync(output, 'utf8');
    const context: Record<string, any> = {};
    vm.runInNewContext(code, context);
    expect(context.Барнома.б).toBe(1);
    expect(targetAtLeast('es2015', analyzeSyntax(code, 'esnext').required)).toBe(true);
  });

  test('bundle reads bundle.format and bundle.globalName from the configuration', async () => {
    fs.writeFileSync(
      path.join(tempDir, 'somon.config.json'),
      JSON.stringify({ bundle: { format: 'esm' } })
    );
    const output = path.join(tempDir, 'app.mjs');
    await program().parseAsync(['bundle', path.join(tempDir, 'app.som'), '-o', output], {
      from: 'user',
    });
    expect(fs.readFileSync(output, 'utf8')).toMatch(/export \{ __somonExport0 as К, /);
  });
});

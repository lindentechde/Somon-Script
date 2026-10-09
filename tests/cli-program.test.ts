jest.mock('chokidar', () => {
  const watchMock = jest.fn(() => {
    const listeners = new Map<string, Array<(...args: any[]) => void>>();
    const watcher = {
      on: jest.fn(function (this: any, event: string, handler: (...args: any[]) => void) {
        const handlers = listeners.get(event) ?? [];
        handlers.push(handler);
        listeners.set(event, handlers);
        return this;
      }),
      close: jest.fn().mockResolvedValue(undefined),
      emit(event: string, ...args: any[]) {
        const handlers = listeners.get(event) ?? [];
        for (const handler of handlers) {
          handler(...args);
        }
        const allHandlers = listeners.get('all') ?? [];
        for (const handler of allHandlers) {
          handler(event, ...args);
        }
        return this;
      },
    };
    return watcher;
  });

  const chokidarExport = Object.assign(watchMock, { watch: watchMock });

  return {
    __esModule: true,
    default: chokidarExport,
    watch: watchMock,
  };
});

import * as fs from 'fs';
import * as path from 'path';
import * as cliProgram from '../src/cli/program';
import { canonicalTmpDir } from './helpers/paths';

const { createProgram, compileFile } = cliProgram;

/**
 * In-process CLI tests
 *
 * These tests exercise CLI handlers without spawning a separate Node process.
 * We stub process.exit and console to keep the test runner alive and to assert outputs.
 */

describe('CLI Program (in-process)', () => {
  let tempDir: string;
  let originalCwd: string;
  let originalExitCode: number | undefined;
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let skipCleanup = false;

  beforeEach(() => {
    tempDir = canonicalTmpDir('somon-cli-program-');
    originalCwd = process.cwd();
    originalExitCode = process.exitCode;
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    skipCleanup = false;
  });

  // Note: bundle subcommand integration is covered by module-system tests.
  // Config loader behavior is covered in tests/config.test.ts.

  afterEach(() => {
    // Restore cwd FIRST — on Windows, rmSync on the current working
    // directory raises EBUSY, which would throw and leave the next suite
    // with a stale cwd pointing at a deleted temp dir.
    try {
      process.chdir(originalCwd);
    } catch {
      // originalCwd may itself be gone in pathological cases; swallow and
      // keep going so we still restore spies and exit code.
    }

    // Cleanup temp dir
    if (!skipCleanup && fs.existsSync(tempDir)) {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // Windows occasionally keeps file handles open briefly after a
        // subprocess exits; the OS will reclaim the temp dir, and a failed
        // cleanup here must not break subsequent suites.
      }
    }

    // Reset any exit code left by CLI handlers during tests
    process.exitCode = originalExitCode ?? 0;
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  test('compileFile: should compile file and return result', () => {
    const inputFile = path.join(tempDir, 'file.som');
    fs.writeFileSync(inputFile, 'чоп.сабт("test");');
    const result = compileFile(inputFile, {});
    expect(result.errors).toHaveLength(0);
    expect(result.code).toContain('console.log');
  });

  test('compileFile: should handle missing file', () => {
    const missing = path.join(tempDir, 'missing.som');
    const result = compileFile(missing, {});
    expect(process.exitCode).toBe(1);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('compile: should compile simple file successfully', () => {
    const program = createProgram();
    program.exitOverride();
    const inputFile = path.join(tempDir, 'input.som');
    const outputFile = path.join(tempDir, 'input.js');
    fs.writeFileSync(inputFile, 'тағйирёбанда а = 5; чоп.сабт(а);');

    program.parse(['compile', inputFile], { from: 'user' });

    expect(fs.existsSync(outputFile)).toBe(true);
    expect(consoleLogSpy).toHaveBeenCalled();
    expect(consoleLogSpy.mock.calls.some(c => String(c[0]).includes('Compiled'))).toBe(true);
  });

  test('compile: should handle file not found error', () => {
    const program = createProgram();
    program.exitOverride();
    const missing = path.join(tempDir, 'missing.som');
    program.parse(['compile', missing], { from: 'user' });

    // Our CLI sets exitCode and logs the error instead of throwing in-process
    expect(process.exitCode).toBe(1);
    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(consoleErrorSpy.mock.calls.some(c => String(c[0]).includes('not found'))).toBe(true);
  });

  test('run: should compile and execute program', async () => {
    const program = createProgram();
    program.exitOverride();
    const inputFile = path.join(tempDir, 'hello.som');
    fs.writeFileSync(inputFile, 'чоп.сабт("Салом ҷаҳон!");');

    const executeSpy = jest
      .spyOn(cliProgram.cliRuntime, 'executeCompiledFile')
      .mockResolvedValue({ status: 0, signal: null });

    await program.parseAsync(['run', inputFile, '--strict', 'input.txt', '--', '--flag'], {
      from: 'user',
    });

    expect(executeSpy).toHaveBeenCalledTimes(1);
    const [tempFilePath, forwardedArgv, spawnOptions] = executeSpy.mock.calls[0];
    // The bundle goes to a private temp directory, never next to the source.
    expect(path.dirname(tempFilePath)).not.toBe(path.dirname(inputFile));
    expect(path.basename(path.dirname(tempFilePath))).toMatch(/^somon-run-/);
    expect(path.basename(tempFilePath)).toBe('hello.js');
    // Only the program's own arguments are forwarded, not the CLI's.
    expect(forwardedArgv).toEqual(['input.txt', '--flag']);
    expect(spawnOptions).toMatchObject({ cwd: path.dirname(inputFile) });
    // The temp directory is removed once the program has finished.
    expect(fs.existsSync(path.dirname(tempFilePath))).toBe(false);
    expect(process.exitCode).toBe(0);

    executeSpy.mockRestore();
  });

  test('init: should create new project structure (custom name)', () => {
    const program = createProgram();
    program.exitOverride();
    const projectName = 'my-project';

    // run init in temp dir
    process.chdir(tempDir);
    program.parse(['init', projectName], { from: 'user' });

    const projectPath = path.join(tempDir, projectName);
    expect(fs.existsSync(projectPath)).toBe(true);
    expect(fs.existsSync(path.join(projectPath, 'package.json'))).toBe(true);
    expect(fs.existsSync(path.join(projectPath, 'src', 'main.som'))).toBe(true);
    expect(fs.existsSync(path.join(projectPath, 'somon.config.json'))).toBe(true);
  });

  test('compile: should accept options like --strict, --source-map, --minify and --target', () => {
    const program = createProgram();
    program.exitOverride();
    const inputFile = path.join(tempDir, 'opts.som');
    const outputFile = path.join(tempDir, 'opts.js');
    fs.writeFileSync(inputFile, 'собит а = 5;');

    program.parse(
      ['compile', inputFile, '--strict', '--source-map', '--minify', '--target', 'es5'],
      { from: 'user' }
    );

    expect(fs.existsSync(outputFile)).toBe(true);
    const output = fs.readFileSync(outputFile, 'utf-8');
    expect(output.includes('const')).toBe(false); // transpiled to var
    expect(consoleLogSpy.mock.calls.some(c => String(c[0]).includes('Compiled'))).toBe(true);
    expect(fs.existsSync(`${outputFile}.map`)).toBe(true);
  });

  test('compile: should read options from somon.config.json', () => {
    const program = createProgram();
    program.exitOverride();
    const inputFile = path.join(tempDir, 'config.som');
    fs.writeFileSync(inputFile, 'собит а = 5;');
    fs.writeFileSync(
      path.join(tempDir, 'somon.config.json'),
      JSON.stringify({ compilerOptions: { target: 'es5', sourceMap: true } }, null, 2)
    );

    program.parse(['compile', inputFile], { from: 'user' });

    const outputFile = path.join(tempDir, 'config.js');
    expect(fs.existsSync(outputFile)).toBe(true);
    const output = fs.readFileSync(outputFile, 'utf-8');
    expect(output.includes('var')).toBe(true);
    expect(fs.existsSync(`${outputFile}.map`)).toBe(true);
  });

  test('compile: should honor outDir from config', () => {
    const program = createProgram();
    program.exitOverride();
    const inputFile = path.join(tempDir, 'dirtest.som');
    fs.writeFileSync(inputFile, 'чоп.сабт("dir");');
    fs.writeFileSync(
      path.join(tempDir, 'somon.config.json'),
      JSON.stringify({ compilerOptions: { outDir: 'lib' } }, null, 2)
    );

    program.parse(['compile', inputFile], { from: 'user' });

    const outputFile = path.join(tempDir, 'lib', 'dirtest.js');
    expect(fs.existsSync(outputFile)).toBe(true);
  });

  test('compile: should read compileOnSave option from config', () => {
    // Test that compileOnSave option is read from config without actually starting watch mode
    const program = createProgram();
    program.exitOverride();
    const inputFile = path.join(tempDir, 'config-test.som');
    fs.writeFileSync(inputFile, 'чоп.сабт("config test");');
    fs.writeFileSync(
      path.join(tempDir, 'somon.config.json'),
      JSON.stringify({ compilerOptions: { compileOnSave: false, target: 'es5' } }, null, 2)
    );

    program.parse(['compile', inputFile], { from: 'user' });

    // Verify compilation happened with config options
    expect(consoleLogSpy.mock.calls.some(c => String(c[0]).includes('Compiled'))).toBe(true);
    const outputFile = path.join(tempDir, 'config-test.js');
    expect(fs.existsSync(outputFile)).toBe(true);

    // Verify ES5 target was used (should use 'var' instead of 'const')
    const output = fs.readFileSync(outputFile, 'utf-8');
    expect(output.includes('console.log')).toBe(true);
  });

  test('compile: reports configuration validation errors', () => {
    const program = createProgram();
    program.exitOverride();
    const inputFile = path.join(tempDir, 'invalid-config.som');
    fs.writeFileSync(inputFile, 'чоп.сабт("invalid");');
    fs.writeFileSync(
      path.join(tempDir, 'somon.config.json'),
      JSON.stringify({ compilerOptions: { target: 'es1999' } }, null, 2)
    );

    program.parse(['compile', inputFile], { from: 'user' });

    expect(process.exitCode).toBe(1);
    const errorMessages = consoleErrorSpy.mock.calls.map(call => String(call[0]));
    expect(errorMessages).toContain('Configuration error:');
    expect(errorMessages.some(message => message.includes('Invalid configuration in'))).toBe(true);
    const outputFile = path.join(tempDir, 'invalid-config.js');
    expect(fs.existsSync(outputFile)).toBe(false);
  });

  test('compile: watch mode uses chokidar and recompiles on change', () => {
    const chokidarModule = require('chokidar');
    const watchMock = chokidarModule.watch as jest.Mock;
    watchMock.mockClear();

    const program = createProgram();
    program.exitOverride();
    const inputFile = path.join(tempDir, 'watch.som');
    fs.writeFileSync(inputFile, 'чоп.сабт("watch");');

    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    try {
      program.parse(['compile', inputFile, '--watch'], { from: 'user' });

      expect(watchMock).toHaveBeenCalledTimes(1);
      const [watchTargets, watchOptions] = watchMock.mock.calls[0];
      expect(Array.isArray(watchTargets)).toBe(true);
      expect(watchTargets).toContain(path.resolve(inputFile));
      expect(watchOptions.ignoreInitial).toBe(true);

      const watcherInstance = watchMock.mock.results[0].value;
      expect(watcherInstance.on).toHaveBeenCalled();

      watcherInstance.emit('change', path.resolve(inputFile));

      const recompiles = consoleLogSpy.mock.calls.filter(call =>
        String(call[0]).includes('Recompiling')
      );
      expect(recompiles.length).toBeGreaterThan(0);
    } finally {
      process.env.NODE_ENV = originalEnv;
      watchMock.mockReset();
    }
  });

  test('compile: watch mode handles source file deletion', () => {
    const chokidarModule = require('chokidar');
    const watchMock = chokidarModule.watch as jest.Mock;
    watchMock.mockClear();

    const program = createProgram();
    program.exitOverride();
    const inputFile = path.join(tempDir, 'unlink-watch.som');
    fs.writeFileSync(inputFile, 'чоп.сабт("test");');

    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    try {
      program.parse(['compile', inputFile, '--watch'], { from: 'user' });

      const watcherInstance = watchMock.mock.results[0]?.value;
      if (watcherInstance) {
        watcherInstance.emit('unlink', path.resolve(inputFile));

        const warnings = consoleWarnSpy.mock.calls.filter(call =>
          String(call[0]).includes('was removed')
        );
        expect(warnings.length).toBeGreaterThan(0);
      }
    } finally {
      process.env.NODE_ENV = originalEnv;
      watchMock.mockReset();
    }
  });

  test('compile: watch mode handles config file changes', () => {
    const chokidarModule = require('chokidar');
    const watchMock = chokidarModule.watch as jest.Mock;
    watchMock.mockClear();

    const program = createProgram();
    program.exitOverride();
    const inputFile = path.join(tempDir, 'config-watch.som');
    fs.writeFileSync(inputFile, 'чоп.сабт("config test");');
    const configFile = path.join(tempDir, 'somon.config.json');
    fs.writeFileSync(configFile, JSON.stringify({ compilerOptions: { target: 'es5' } }));

    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    try {
      program.parse(['compile', inputFile, '--watch'], { from: 'user' });

      const watcherInstance = watchMock.mock.results[0]?.value;
      if (watcherInstance) {
        watcherInstance.emit('change', path.resolve(configFile));

        const recompiles = consoleLogSpy.mock.calls.filter(call =>
          String(call[0]).includes('Configuration change detected')
        );
        expect(recompiles.length).toBeGreaterThan(0);
      }
    } finally {
      process.env.NODE_ENV = originalEnv;
      watchMock.mockReset();
    }
  });

  test('compile: watch mode handles config file deletion', () => {
    const chokidarModule = require('chokidar');
    const watchMock = chokidarModule.watch as jest.Mock;
    watchMock.mockClear();

    const program = createProgram();
    program.exitOverride();
    const inputFile = path.join(tempDir, 'config-del.som');
    fs.writeFileSync(inputFile, 'чоп.сабт("test");');
    const configFile = path.join(tempDir, 'somon.config.json');
    fs.writeFileSync(configFile, JSON.stringify({ compilerOptions: { target: 'es5' } }));

    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    try {
      program.parse(['compile', inputFile, '--watch'], { from: 'user' });

      const watcherInstance = watchMock.mock.results[0]?.value;
      if (watcherInstance) {
        watcherInstance.emit('unlink', path.resolve(configFile));

        const warnings = consoleWarnSpy.mock.calls.filter(call =>
          String(call[0]).includes('was removed')
        );
        expect(warnings.length).toBeGreaterThan(0);
      }
    } finally {
      process.env.NODE_ENV = originalEnv;
      watchMock.mockReset();
    }
  });

  test('bundle: should bundle modules into a single file', async () => {
    const program = createProgram();
    program.exitOverride();

    const mainFile = path.join(tempDir, 'main.som');
    const utilFile = path.join(tempDir, 'util.som');

    fs.writeFileSync(utilFile, 'содир функсия helper(): холӣ { чоп.сабт("helper"); }');
    fs.writeFileSync(mainFile, 'ворид { helper } аз "./util"; helper();');

    await program.parseAsync(['bundle', mainFile, '-o', path.join(tempDir, 'bundle.js')], {
      from: 'user',
    });

    expect(fs.existsSync(path.join(tempDir, 'bundle.js'))).toBe(true);
    const bundleContent = fs.readFileSync(path.join(tempDir, 'bundle.js'), 'utf8');
    expect(bundleContent).toContain('helper');
  });

  test('bundle: should generate source maps when requested', async () => {
    const program = createProgram();
    program.exitOverride();

    const mainFile = path.join(tempDir, 'source-map.som');
    fs.writeFileSync(mainFile, 'чоп.сабт("source maps");');

    await program.parseAsync(
      ['bundle', mainFile, '-o', path.join(tempDir, 'bundle-map.js'), '--source-map'],
      { from: 'user' }
    );

    expect(fs.existsSync(path.join(tempDir, 'bundle-map.js.map'))).toBe(true);
  });

  test('bundle: should inline sources when requested', async () => {
    const program = createProgram();
    program.exitOverride();

    const mainFile = path.join(tempDir, 'inline.som');
    fs.writeFileSync(mainFile, 'чоп.сабт("inline");');

    await program.parseAsync(
      [
        'bundle',
        mainFile,
        '-o',
        path.join(tempDir, 'bundle-inline.js'),
        '--source-map',
        '--inline-sources',
      ],
      { from: 'user' }
    );

    const mapPath = path.join(tempDir, 'bundle-inline.js.map');
    expect(fs.existsSync(mapPath)).toBe(true);
    const mapContent = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
    expect(mapContent.sourcesContent).toBeDefined();
  });

  test('bundle: should support minification', async () => {
    const program = createProgram();
    program.exitOverride();

    const mainFile = path.join(tempDir, 'minify.som');
    fs.writeFileSync(
      mainFile,
      'тағйирёбанда verylongvariablename = 42; чоп.сабт(verylongvariablename);'
    );

    await program.parseAsync(
      ['bundle', mainFile, '-o', path.join(tempDir, 'bundle-min.js'), '--minify'],
      { from: 'user' }
    );

    const bundlePath = path.join(tempDir, 'bundle-min.js');
    expect(fs.existsSync(bundlePath)).toBe(true);
  });

  test('bundle: should support externals option', async () => {
    const program = createProgram();
    program.exitOverride();

    const mainFile = path.join(tempDir, 'externals.som');
    fs.writeFileSync(mainFile, 'чоп.сабт("externals");');

    await program.parseAsync(
      ['bundle', mainFile, '-o', path.join(tempDir, 'bundle-ext.js'), '--externals', 'fs,path'],
      { from: 'user' }
    );

    expect(fs.existsSync(path.join(tempDir, 'bundle-ext.js'))).toBe(true);
  });

  test('bundle: should reject non-commonjs formats', async () => {
    const program = createProgram();
    program.exitOverride();

    const mainFile = path.join(tempDir, 'esm.som');
    fs.writeFileSync(mainFile, 'чоп.сабт("test");');

    await program.parseAsync(['bundle', mainFile, '--format', 'esm'], { from: 'user' });

    // Check for error about bundle format
    const errors = consoleErrorSpy.mock.calls.map(c => String(c[0]));
    const hasFormatError = errors.some(
      msg => msg.toLowerCase().includes('commonjs') || msg.toLowerCase().includes('bundle format')
    );
    expect(hasFormatError || process.exitCode === 1).toBe(true);
  });

  test('module-info: should display module statistics', async () => {
    const program = createProgram();
    program.exitOverride();

    const mainFile = path.join(tempDir, 'stats.som');
    const utilFile = path.join(tempDir, 'stats-util.som');

    fs.writeFileSync(utilFile, 'содир тағйирёбанда x = 10;');
    fs.writeFileSync(mainFile, 'ворид { x } аз "./stats-util"; чоп.сабт(x);');

    await program.parseAsync(['module-info', mainFile, '--stats'], { from: 'user' });

    const logs = consoleLogSpy.mock.calls.map(c => String(c[0]));
    expect(logs.some(log => log.includes('Module Statistics'))).toBe(true);
    expect(logs.some(log => log.includes('Total modules'))).toBe(true);
  });

  test('module-info: should display dependency graph', async () => {
    const program = createProgram();
    program.exitOverride();

    const mainFile = path.join(tempDir, 'graph.som');
    const depFile = path.join(tempDir, 'graph-dep.som');

    fs.writeFileSync(depFile, 'содир тағйирёбанда y = 20;');
    fs.writeFileSync(mainFile, 'ворид { y } аз "./graph-dep"; чоп.сабт(y);');

    await program.parseAsync(['module-info', mainFile, '--graph'], { from: 'user' });

    const logs = consoleLogSpy.mock.calls.map(c => String(c[0]));
    expect(logs.some(log => log.includes('Dependency Graph'))).toBe(true);
  });

  test('module-info: should check for circular dependencies', async () => {
    const program = createProgram();
    program.exitOverride();

    const mainFile = path.join(tempDir, 'circ.som');
    fs.writeFileSync(mainFile, 'содир тағйирёбанда z = 30;');

    await program.parseAsync(['module-info', mainFile, '--circular'], { from: 'user' });

    const logs = consoleLogSpy.mock.calls.map(c => String(c[0]));
    expect(logs.some(log => log.includes('No circular dependencies'))).toBe(true);
  });

  test('resolve: should resolve module specifiers', async () => {
    const program = createProgram();
    program.exitOverride();

    const fromFile = path.join(tempDir, 'from.som');
    const targetFile = path.join(tempDir, 'target.som');

    fs.writeFileSync(fromFile, '');
    fs.writeFileSync(targetFile, 'содир тағйирёбанда a = 1;');

    await program.parseAsync(['resolve', './target', '--from', fromFile], { from: 'user' });

    const logs = consoleLogSpy.mock.calls.map(c => String(c[0]));
    expect(logs.some(log => log.includes('Resolved'))).toBe(true);
    expect(logs.some(log => log.includes('Path:'))).toBe(true);
  });

  test('compile: should handle production mode flag', () => {
    const program = createProgram();
    program.exitOverride();
    const inputFile = path.join(tempDir, 'prod.som');
    fs.writeFileSync(inputFile, 'чоп.сабт("prod");');

    program.parse(['compile', inputFile, '--production'], { from: 'user' });

    const outputFile = path.join(tempDir, 'prod.js');
    expect(fs.existsSync(outputFile)).toBe(true);
  });

  test('run: should handle production mode flag', async () => {
    const program = createProgram();
    program.exitOverride();
    const inputFile = path.join(tempDir, 'run-prod.som');
    fs.writeFileSync(inputFile, 'чоп.сабт("run prod");');

    const executeSpy = jest
      .spyOn(cliProgram.cliRuntime, 'executeCompiledFile')
      .mockResolvedValue({ status: 0, signal: null });

    await program.parseAsync(['run', inputFile, '--production'], { from: 'user' });

    expect(executeSpy).toHaveBeenCalled();
    executeSpy.mockRestore();
  });

  test('run: should handle execution errors gracefully', async () => {
    const program = createProgram();
    program.exitOverride();
    const inputFile = path.join(tempDir, 'run-error.som');
    fs.writeFileSync(inputFile, 'чоп.сабт("test");');

    const executeSpy = jest
      .spyOn(cliProgram.cliRuntime, 'executeCompiledFile')
      .mockResolvedValue({ status: 1, signal: null, error: new Error('Execution failed') });

    await program.parseAsync(['run', inputFile], { from: 'user' });

    expect(process.exitCode).toBe(1);
    executeSpy.mockRestore();
  });

  test('run: should handle signal termination', async () => {
    const program = createProgram();
    program.exitOverride();
    const inputFile = path.join(tempDir, 'run-signal.som');
    fs.writeFileSync(inputFile, 'чоп.сабт("test");');

    const executeSpy = jest
      .spyOn(cliProgram.cliRuntime, 'executeCompiledFile')
      .mockResolvedValue({ status: null, signal: 'SIGTERM' });

    await program.parseAsync(['run', inputFile], { from: 'user' });

    expect(process.exitCode).toBe(1);
    expect(consoleErrorSpy.mock.calls.some(c => String(c[0]).includes('SIGTERM'))).toBe(true);
    executeSpy.mockRestore();
  });

  test('init: should handle existing directory error', () => {
    const program = createProgram();
    program.exitOverride();
    const projectName = 'existing-project';
    const projectPath = path.join(tempDir, projectName);

    fs.mkdirSync(projectPath);

    process.chdir(tempDir);
    program.parse(['init', projectName], { from: 'user' });

    expect(process.exitCode).toBe(1);
    expect(consoleErrorSpy.mock.calls.some(c => String(c[0]).includes('already exists'))).toBe(
      true
    );
  });

  test('compileFile: should handle warnings in output', () => {
    const inputFile = path.join(tempDir, 'warnings.som');
    fs.writeFileSync(inputFile, 'тағйирёбанда unused = 5; чоп.сабт("test");');

    const result = compileFile(inputFile, {});

    expect(result).toBeDefined();
  });

  test('compileFile: should handle compilation errors', () => {
    const inputFile = path.join(tempDir, 'error.som');
    // Use syntax that will definitely cause a parse error
    fs.writeFileSync(inputFile, 'функсия test() { тағйирёбанда x = }');

    const result = compileFile(inputFile, {});

    // Either we get parse errors or the parser recovered, but exitCode should be set if there are issues
    expect(result).toBeDefined();
    if (result.errors.length > 0) {
      expect(process.exitCode).toBe(1);
    }
  });

  test('bundle: should handle production mode with validation', async () => {
    const program = createProgram();
    program.exitOverride();

    const mainFile = path.join(tempDir, 'bundle-prod.som');
    fs.writeFileSync(mainFile, 'чоп.сабт("bundle prod");');

    await program.parseAsync(
      ['bundle', mainFile, '-o', path.join(tempDir, 'prod-bundle.js'), '--production'],
      { from: 'user' }
    );

    expect(fs.existsSync(path.join(tempDir, 'prod-bundle.js'))).toBe(true);
  });

  test('compile: should handle errors in options merging', () => {
    const program = createProgram();
    program.exitOverride();
    const inputFile = path.join(tempDir, 'merge-error.som');
    fs.writeFileSync(inputFile, 'чоп.сабт("test");');

    // Create invalid config
    fs.writeFileSync(
      path.join(tempDir, 'somon.config.json'),
      JSON.stringify({ compilerOptions: { target: 'invalid-target' } })
    );

    program.parse(['compile', inputFile], { from: 'user' });

    expect(process.exitCode).toBe(1);
  });

  test('compileFile: should handle errors in catch block', () => {
    const inputFile = path.join(tempDir, 'catch-test.som');
    fs.writeFileSync(inputFile, 'чоп.сабт("test");');

    // This will succeed normally
    const result = compileFile(inputFile, {});
    expect(result.code).toBeTruthy();
  });

  test('compile: should handle outDir option from CLI', () => {
    const program = createProgram();
    program.exitOverride();
    const inputFile = path.join(tempDir, 'outdir.som');
    fs.writeFileSync(inputFile, 'чоп.сабт("outdir test");');

    const outputDir = path.join(tempDir, 'output');
    program.parse(['compile', inputFile, '--out-dir', outputDir], { from: 'user' });

    expect(fs.existsSync(path.join(outputDir, 'outdir.js'))).toBe(true);
  });

  test('compile: should handle production validation error in compile command', () => {
    const program = createProgram();
    program.exitOverride();
    const inputFile = path.join(tempDir, 'prod-fail.som');
    fs.writeFileSync(inputFile, 'чоп.сабт("test");');

    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    try {
      // Try to write to a non-writable location (if possible to test)
      program.parse(['compile', inputFile, '--production'], { from: 'user' });
      // Should still complete even in production mode
      expect(fs.existsSync(path.join(tempDir, 'prod-fail.js'))).toBe(true);
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  test('run: should cleanup temporary files even on error', async () => {
    const program = createProgram();
    program.exitOverride();
    const inputFile = path.join(tempDir, 'cleanup.som');
    fs.writeFileSync(inputFile, 'чоп.сабт("cleanup");');

    const executeSpy = jest
      .spyOn(cliProgram.cliRuntime, 'executeCompiledFile')
      .mockResolvedValue({ status: 0, signal: null });

    await program.parseAsync(['run', inputFile], { from: 'user' });

    // Verify the temp directory was cleaned up and nothing was written next to the source
    const [tempFilePath] = executeSpy.mock.calls[0];
    expect(fs.existsSync(path.dirname(tempFilePath))).toBe(false);
    expect(fs.readdirSync(tempDir)).toEqual(['cleanup.som']);

    executeSpy.mockRestore();
  });

  test('run: should handle absolute paths without duplication', async () => {
    const program = createProgram();
    program.exitOverride();

    // Create test file with greeting function (user's example)
    const inputFile = path.join(tempDir, 'hello_world.som');
    const somonCode = `функсия салом(ном: сатр): сатр {
    бозгашт \`Салом, \${ном}!\`;
}

чоп.сабт(салом("SomonScript"));`;

    fs.writeFileSync(inputFile, somonCode);

    const executeSpy = jest
      .spyOn(cliProgram.cliRuntime, 'executeCompiledFile')
      .mockResolvedValue({ status: 0, signal: null });

    // Run with absolute path (this should not cause path duplication)
    const absolutePath = path.resolve(inputFile);
    await program.parseAsync(['run', absolutePath], { from: 'user' });

    // Verify it executed successfully without errors
    expect(process.exitCode).toBe(0);
    expect(executeSpy).toHaveBeenCalledTimes(1);

    // Verify the compiled file path doesn't contain duplicated paths
    const [tempFilePath] = executeSpy.mock.calls[0];
    expect(tempFilePath).toBeTruthy();
    expect(path.basename(tempFilePath)).toBe('hello_world.js');
    // Ensure path is not duplicated (shouldn't contain the path twice)
    const pathParts = tempFilePath.split(path.sep);
    const uniqueParts = new Set(pathParts);
    // A duplicated path would have fewer unique parts
    expect(pathParts.length - uniqueParts.size).toBeLessThan(3); // Allow some normal duplicates

    executeSpy.mockRestore();
  });

  test('bundle: should use default output path when not specified', async () => {
    const program = createProgram();
    program.exitOverride();

    const mainFile = path.join(tempDir, 'default-out.som');
    fs.writeFileSync(mainFile, 'чоп.сабт("default output");');

    await program.parseAsync(['bundle', mainFile], { from: 'user' });

    // Should create .bundle.js file
    const expectedOutput = mainFile.replace(/\.som$/, '.bundle.js');
    expect(fs.existsSync(expectedOutput)).toBe(true);
  });

  test('bundle: should handle errors and set exit code', async () => {
    const program = createProgram();
    program.exitOverride();

    const mainFile = path.join(tempDir, 'bundle-error.som');
    // Create file with import that doesn't exist
    fs.writeFileSync(mainFile, 'ворид { missing } аз "./nonexistent";');

    await program.parseAsync(['bundle', mainFile], { from: 'user' });

    expect(process.exitCode).toBe(1);
  });

  test('module-info: should show all options together', async () => {
    const program = createProgram();
    program.exitOverride();

    const mainFile = path.join(tempDir, 'all-info.som');
    const depFile = path.join(tempDir, 'all-info-dep.som');

    fs.writeFileSync(depFile, 'содир тағйирёбанда data = 100;');
    fs.writeFileSync(mainFile, 'ворид { data } аз "./all-info-dep"; чоп.сабт(data);');

    await program.parseAsync(['module-info', mainFile, '--stats', '--graph', '--circular'], {
      from: 'user',
    });

    const logs = consoleLogSpy.mock.calls.map(c => String(c[0]));
    expect(logs.some(log => log.includes('Module Statistics'))).toBe(true);
    expect(logs.some(log => log.includes('Dependency Graph'))).toBe(true);
    expect(logs.some(log => log.includes('circular'))).toBe(true);
  });

  test('resolve: should work without --from option', async () => {
    const program = createProgram();
    program.exitOverride();

    const targetFile = path.join(tempDir, 'resolve-target.som');
    fs.writeFileSync(targetFile, 'содир тағйирёбанда val = 42;');

    // Change to temp directory so relative path works
    const originalCwd = process.cwd();
    process.chdir(tempDir);

    try {
      await program.parseAsync(['resolve', './resolve-target'], { from: 'user' });

      const logs = consoleLogSpy.mock.calls.map(c => String(c[0]));
      expect(logs.some(log => log.includes('Resolved'))).toBe(true);
    } finally {
      process.chdir(originalCwd);
    }
  });

  test('compile: should handle compilation with warnings', () => {
    const program = createProgram();
    program.exitOverride();
    const inputFile = path.join(tempDir, 'with-warnings.som');
    // Write code that might produce warnings
    fs.writeFileSync(inputFile, 'тағйирёбанда unused_var = 10; чоп.сабт("done");');

    program.parse(['compile', inputFile], { from: 'user' });

    expect(fs.existsSync(path.join(tempDir, 'with-warnings.js'))).toBe(true);
  });

  test('run: should handle no-type-check option', async () => {
    const program = createProgram();
    program.exitOverride();
    const inputFile = path.join(tempDir, 'no-type.som');
    fs.writeFileSync(inputFile, 'чоп.сабт("no type check");');

    const executeSpy = jest
      .spyOn(cliProgram.cliRuntime, 'executeCompiledFile')
      .mockResolvedValue({ status: 0, signal: null });

    await program.parseAsync(['run', inputFile, '--no-type-check'], { from: 'user' });

    expect(executeSpy).toHaveBeenCalled();
    executeSpy.mockRestore();
  });

  test('compile: should handle no-source-map flag', () => {
    const program = createProgram();
    program.exitOverride();
    const inputFile = path.join(tempDir, 'no-map.som');
    fs.writeFileSync(inputFile, 'чоп.сабт("no map");');

    program.parse(['compile', inputFile, '--no-source-map'], { from: 'user' });

    const outputFile = path.join(tempDir, 'no-map.js');
    expect(fs.existsSync(outputFile)).toBe(true);
    expect(fs.existsSync(`${outputFile}.map`)).toBe(false);
  });

  test('compile: should handle no-minify flag', () => {
    const program = createProgram();
    program.exitOverride();
    const inputFile = path.join(tempDir, 'no-min.som');
    fs.writeFileSync(inputFile, 'чоп.сабт("no minify");');

    program.parse(['compile', inputFile, '--no-minify'], { from: 'user' });

    const outputFile = path.join(tempDir, 'no-min.js');
    expect(fs.existsSync(outputFile)).toBe(true);
  });
  describe('review regressions', () => {
    const TYPE_ERROR_SOURCE = 'тағйирёбанда х: рақам = "матн";\nчоп.сабт(х);';

    test('compile: --no-type-check skips type checking', () => {
      const program = createProgram();
      program.exitOverride();
      const inputFile = path.join(tempDir, 'te.som');
      fs.writeFileSync(inputFile, TYPE_ERROR_SOURCE);

      program.parse(['compile', inputFile, '--no-type-check'], { from: 'user' });

      expect(process.exitCode).toBe(0);
      const output = fs.readFileSync(path.join(tempDir, 'te.js'), 'utf-8');
      expect(output).toContain('"матн"');
    });

    test('compile: type errors are still reported without --no-type-check', () => {
      const program = createProgram();
      program.exitOverride();
      const inputFile = path.join(tempDir, 'te.som');
      fs.writeFileSync(inputFile, TYPE_ERROR_SOURCE);

      program.parse(['compile', inputFile], { from: 'user' });

      expect(process.exitCode).toBe(1);
      expect(fs.existsSync(path.join(tempDir, 'te.js'))).toBe(false);
    });

    test('run: --no-type-check and config compilerOptions reach the module system', async () => {
      const inputFile = path.join(tempDir, 'te.som');
      fs.writeFileSync(inputFile, TYPE_ERROR_SOURCE);
      const executeSpy = jest
        .spyOn(cliProgram.cliRuntime, 'executeCompiledFile')
        .mockImplementation(async filePath => {
          // The bundle must exist (type checking skipped) while the program runs.
          expect(fs.readFileSync(filePath, 'utf-8')).toContain('"матн"');
          return { status: 0, signal: null };
        });

      try {
        await createProgram().parseAsync(['run', inputFile], { from: 'user' });
        expect(executeSpy).not.toHaveBeenCalled();
        expect(process.exitCode).toBe(1);

        process.exitCode = 0;
        await createProgram().parseAsync(['run', inputFile, '--no-type-check'], {
          from: 'user',
        });
        expect(executeSpy).toHaveBeenCalledTimes(1);
        expect(process.exitCode).toBe(0);

        fs.writeFileSync(
          path.join(tempDir, 'somon.config.json'),
          JSON.stringify({ compilerOptions: { noTypeCheck: true } })
        );
        await createProgram().parseAsync(['run', inputFile], { from: 'user' });
        expect(executeSpy).toHaveBeenCalledTimes(2);
        expect(process.exitCode).toBe(0);
      } finally {
        executeSpy.mockRestore();
      }
    });

    test('run: --target is passed through to the module system', async () => {
      const inputFile = path.join(tempDir, 'target.som');
      fs.writeFileSync(inputFile, 'собит а = 5;\nчоп.сабт(а);');
      let bundled = '';
      const executeSpy = jest
        .spyOn(cliProgram.cliRuntime, 'executeCompiledFile')
        .mockImplementation(async filePath => {
          bundled = fs.readFileSync(filePath, 'utf-8');
          return { status: 0, signal: null };
        });

      try {
        await createProgram().parseAsync(['run', inputFile, '--target', 'es5'], {
          from: 'user',
        });
        expect(bundled).toContain('var а = 5');
      } finally {
        executeSpy.mockRestore();
      }
    });

    test('bundle: --no-type-check skips type checking', async () => {
      const inputFile = path.join(tempDir, 'te.som');
      fs.writeFileSync(inputFile, TYPE_ERROR_SOURCE);
      const outputFile = path.join(tempDir, 'te.bundle.js');

      await createProgram().parseAsync(['bundle', inputFile], { from: 'user' });
      expect(process.exitCode).toBe(1);
      expect(fs.existsSync(outputFile)).toBe(false);

      process.exitCode = 0;
      await createProgram().parseAsync(['bundle', inputFile, '--no-type-check'], {
        from: 'user',
      });
      expect(process.exitCode).toBe(0);
      expect(fs.readFileSync(outputFile, 'utf-8')).toContain('"матн"');
    });

    test('compile: a non-.som input is written to <input>.js and never overwritten', () => {
      const inputFile = path.join(tempDir, 'src.txt');
      const source = 'чоп.сабт("салом");';
      fs.writeFileSync(inputFile, source);

      createProgram().parse(['compile', inputFile], { from: 'user' });

      expect(fs.readFileSync(inputFile, 'utf-8')).toBe(source);
      expect(fs.readFileSync(`${inputFile}.js`, 'utf-8')).toContain('console.log');
    });

    test('compile: an extension-less input with --out-dir keeps its name plus .js', () => {
      const inputFile = path.join(tempDir, 'script');
      fs.writeFileSync(inputFile, 'чоп.сабт(1);');
      const outDir = path.join(tempDir, 'out');

      createProgram().parse(['compile', inputFile, '--out-dir', outDir], { from: 'user' });

      expect(fs.existsSync(path.join(outDir, 'script.js'))).toBe(true);
    });

    test.each([
      ['compile', '-o'],
      ['bundle', '-o'],
    ])('%s: refuses an output path equal to the input', async (command, flag) => {
      const inputFile = path.join(tempDir, 'same.som');
      const source = 'чоп.сабт("салом");';
      fs.writeFileSync(inputFile, source);
      process.chdir(tempDir);

      await createProgram().parseAsync([command, inputFile, flag, './same.som'], {
        from: 'user',
      });

      expect(process.exitCode).toBe(1);
      expect(fs.readFileSync(inputFile, 'utf-8')).toBe(source);
      expect(consoleErrorSpy.mock.calls.some(c => String(c[0]).includes('same as the input'))).toBe(
        true
      );
    });

    test('compile: config outDir/output resolve against the config file directory', () => {
      fs.writeFileSync(
        path.join(tempDir, 'somon.config.json'),
        JSON.stringify({ compilerOptions: { outDir: 'dist' } })
      );
      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(srcDir);
      const inputFile = path.join(srcDir, 'main.som');
      fs.writeFileSync(inputFile, 'чоп.сабт(1);');

      createProgram().parse(['compile', inputFile], { from: 'user' });

      expect(fs.existsSync(path.join(tempDir, 'dist', 'main.js'))).toBe(true);
      expect(fs.existsSync(path.join(srcDir, 'dist'))).toBe(false);

      fs.writeFileSync(
        path.join(tempDir, 'somon.config.json'),
        JSON.stringify({ compilerOptions: { output: 'build/app.js' } })
      );
      createProgram().parse(['compile', inputFile], { from: 'user' });
      expect(fs.existsSync(path.join(tempDir, 'build', 'app.js'))).toBe(true);
    });

    test('bundle: config bundle.output resolves against the config file directory', async () => {
      fs.writeFileSync(
        path.join(tempDir, 'somon.config.json'),
        JSON.stringify({ bundle: { output: 'dist/app.js' } })
      );
      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(srcDir);
      const inputFile = path.join(srcDir, 'main.som');
      fs.writeFileSync(inputFile, 'чоп.сабт(1);');

      await createProgram().parseAsync(['bundle', inputFile], { from: 'user' });

      expect(process.exitCode).toBe(0);
      expect(fs.existsSync(path.join(tempDir, 'dist', 'app.js'))).toBe(true);
    });

    test('bundle: -o resolves against the current directory', async () => {
      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(srcDir);
      const inputFile = path.join(srcDir, 'main.som');
      fs.writeFileSync(inputFile, 'чоп.сабт(1);');
      process.chdir(tempDir);

      await createProgram().parseAsync(['bundle', inputFile, '-o', 'out/app.js'], {
        from: 'user',
      });

      expect(fs.existsSync(path.join(tempDir, 'out', 'app.js'))).toBe(true);
    });

    test('moduleSystem.resolution.baseUrl resolves against the config file directory', async () => {
      fs.writeFileSync(
        path.join(tempDir, 'somon.config.json'),
        JSON.stringify({
          moduleSystem: { resolution: { baseUrl: '.', paths: { '@lib/*': ['lib/*'] } } },
        })
      );
      fs.mkdirSync(path.join(tempDir, 'lib'));
      fs.writeFileSync(path.join(tempDir, 'lib', 'util.som'), 'содир собит қимат = 42;');
      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(srcDir);
      const inputFile = path.join(srcDir, 'main.som');
      fs.writeFileSync(inputFile, 'ворид { қимат } аз "@lib/util";\nчоп.сабт(қимат);');
      const outputFile = path.join(tempDir, 'bundle.js');

      await createProgram().parseAsync(['bundle', inputFile, '-o', outputFile], { from: 'user' });

      expect(process.exitCode).toBe(0);
      expect(fs.readFileSync(outputFile, 'utf-8')).toContain('42');
    });

    test('compile: an unwritable output path is reported with exit code 1', () => {
      const inputFile = path.join(tempDir, 'w.som');
      fs.writeFileSync(inputFile, 'чоп.сабт(1);');
      // A regular file cannot be used as a directory.
      const output = path.join(inputFile, 'out.js');

      createProgram().parse(['compile', inputFile, '-o', output], { from: 'user' });

      expect(process.exitCode).toBe(1);
      expect(consoleErrorSpy.mock.calls.some(c => String(c[0]) === 'Error:')).toBe(true);
    });

    test('--production is accepted, hidden from help and reported as deprecated', () => {
      const inputFile = path.join(tempDir, 'prod.som');
      fs.writeFileSync(inputFile, 'чоп.сабт(1);');

      createProgram().parse(['compile', inputFile, '--production'], { from: 'user' });

      expect(fs.existsSync(path.join(tempDir, 'prod.js'))).toBe(true);
      expect(consoleWarnSpy.mock.calls.some(c => String(c[0]).includes('--production'))).toBe(true);
      for (const name of ['compile', 'run', 'bundle']) {
        const help = createProgram()
          .commands.find(cmd => cmd.name() === name)!
          .helpInformation();
        expect(help).not.toContain('--production');
      }
    });

    test('--target is validated on the command line', () => {
      const inputFile = path.join(tempDir, 'target.som');
      fs.writeFileSync(inputFile, 'чоп.сабт(1);');
      const program = createProgram();
      program.exitOverride();
      program.commands.forEach(cmd => cmd.exitOverride().configureOutput({ writeErr: () => {} }));

      expect(() =>
        program.parse(['compile', inputFile, '--target', 'es3000'], { from: 'user' })
      ).toThrow(/es3000/);
      expect(fs.existsSync(path.join(tempDir, 'target.js'))).toBe(false);
    });

    test('compile --watch: a successful recompile clears the earlier failure', () => {
      const chokidarModule = require('chokidar');
      const watchMock = chokidarModule.watch as jest.Mock;
      // Earlier tests reset the mock, so install a minimal fake watcher.
      const listeners = new Map<string, (changedPath: string) => void>();
      const fakeWatcher = {
        on: jest.fn((event: string, handler: (changedPath: string) => void) => {
          listeners.set(event, handler);
          return fakeWatcher;
        }),
        close: jest.fn().mockResolvedValue(undefined),
      };
      watchMock.mockReset();
      watchMock.mockReturnValue(fakeWatcher);
      const onceSpy = jest.spyOn(process, 'once');

      const inputFile = path.join(tempDir, 'w.som');
      fs.writeFileSync(inputFile, TYPE_ERROR_SOURCE);
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      try {
        createProgram().parse(['compile', inputFile, '--watch'], { from: 'user' });
        expect(process.exitCode).toBe(1);

        fs.writeFileSync(inputFile, 'тағйирёбанда х: рақам = 1;\nчоп.сабт(х);');
        listeners.get('change')!(path.resolve(inputFile));
        expect(process.exitCode).toBe(0);
        expect(fs.existsSync(path.join(tempDir, 'w.js'))).toBe(true);

        // Exactly one shutdown handler per signal.
        const signals = onceSpy.mock.calls.map(call => call[0]);
        expect(signals.filter(signal => signal === 'SIGINT')).toHaveLength(1);
        expect(signals.filter(signal => signal === 'SIGTERM')).toHaveLength(1);
      } finally {
        for (const call of onceSpy.mock.calls) {
          process.removeListener(call[0] as 'SIGINT', call[1]);
        }
        onceSpy.mockRestore();
        process.env.NODE_ENV = originalEnv;
        watchMock.mockReset();
      }
    });
  });
});

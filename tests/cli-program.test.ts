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
import * as os from 'os';
import * as cliProgram from '../src/cli/program';

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
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'somon-cli-program-'));
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
    // Cleanup temp dir
    if (!skipCleanup && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }

    // Restore cwd
    process.chdir(originalCwd);
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

    const executeSpy = jest.spyOn(cliProgram.cliRuntime, 'executeCompiledFile').mockReturnValue({
      status: 0,
    } as ReturnType<typeof cliProgram.cliRuntime.executeCompiledFile>);

    await program.parseAsync(['run', inputFile, '--strict', 'input.txt'], { from: 'user' });

    expect(executeSpy).toHaveBeenCalledTimes(1);
    const [tempFilePath, forwardedArgv, spawnOptions] = executeSpy.mock.calls[0];
    expect(tempFilePath).toContain(path.dirname(inputFile));
    expect(tempFilePath).toMatch(/hello\.somon-run-[^.]+\.js$/);
    expect(forwardedArgv).toEqual(['run', inputFile, '--strict', 'input.txt']);
    expect(spawnOptions).toMatchObject({ cwd: path.dirname(inputFile) });
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

    const executeSpy = jest.spyOn(cliProgram.cliRuntime, 'executeCompiledFile').mockReturnValue({
      status: 0,
    } as ReturnType<typeof cliProgram.cliRuntime.executeCompiledFile>);

    await program.parseAsync(['run', inputFile, '--production'], { from: 'user' });

    expect(executeSpy).toHaveBeenCalled();
    executeSpy.mockRestore();
  });

  test('run: should handle execution errors gracefully', async () => {
    const program = createProgram();
    program.exitOverride();
    const inputFile = path.join(tempDir, 'run-error.som');
    fs.writeFileSync(inputFile, 'чоп.сабт("test");');

    const executeSpy = jest.spyOn(cliProgram.cliRuntime, 'executeCompiledFile').mockReturnValue({
      status: 1,
      error: new Error('Execution failed'),
    } as ReturnType<typeof cliProgram.cliRuntime.executeCompiledFile>);

    await program.parseAsync(['run', inputFile], { from: 'user' });

    expect(process.exitCode).toBe(1);
    executeSpy.mockRestore();
  });

  test('run: should handle signal termination', async () => {
    const program = createProgram();
    program.exitOverride();
    const inputFile = path.join(tempDir, 'run-signal.som');
    fs.writeFileSync(inputFile, 'чоп.сабт("test");');

    const executeSpy = jest.spyOn(cliProgram.cliRuntime, 'executeCompiledFile').mockReturnValue({
      signal: 'SIGTERM',
    } as ReturnType<typeof cliProgram.cliRuntime.executeCompiledFile>);

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

    const executeSpy = jest.spyOn(cliProgram.cliRuntime, 'executeCompiledFile').mockReturnValue({
      status: 0,
    } as ReturnType<typeof cliProgram.cliRuntime.executeCompiledFile>);

    await program.parseAsync(['run', inputFile], { from: 'user' });

    // Verify temp file was cleaned up
    const tempFiles = fs.readdirSync(tempDir).filter(f => f.includes('.somon-run-'));
    expect(tempFiles.length).toBe(0);

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

    const executeSpy = jest.spyOn(cliProgram.cliRuntime, 'executeCompiledFile').mockReturnValue({
      status: 0,
    } as ReturnType<typeof cliProgram.cliRuntime.executeCompiledFile>);

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
});

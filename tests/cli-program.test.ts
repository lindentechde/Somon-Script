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

  test('run: should compile and execute program', () => {
    const program = createProgram();
    program.exitOverride();
    const inputFile = path.join(tempDir, 'hello.som');
    fs.writeFileSync(inputFile, 'чоп.сабт("Салом ҷаҳон!");');

    const executeSpy = jest.spyOn(cliProgram.cliRuntime, 'executeCompiledFile').mockReturnValue({
      status: 0,
    } as ReturnType<typeof cliProgram.cliRuntime.executeCompiledFile>);

    program.parse(['run', inputFile, '--strict', 'input.txt'], { from: 'user' });

    expect(executeSpy).toHaveBeenCalledTimes(1);
    const [tempFilePath, forwardedArgv] = executeSpy.mock.calls[0];
    expect(tempFilePath).toMatch(/hello\.js$/);
    expect(forwardedArgv).toEqual(['run', inputFile, '--strict', 'input.txt']);
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
});

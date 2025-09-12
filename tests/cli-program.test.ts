import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { createProgram } from '../src/cli/program';

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

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'somon-cli-program-'));
    originalCwd = process.cwd();
    originalExitCode = process.exitCode;
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    // Cleanup temp dir
    if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });

    // Restore cwd
    process.chdir(originalCwd);
    // Reset any exit code left by CLI handlers during tests
    process.exitCode = originalExitCode ?? 0;
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
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

    program.parse(['run', inputFile], { from: 'user' });

    expect(consoleLogSpy).toHaveBeenCalled();
    expect(consoleLogSpy.mock.calls.some(c => String(c[0]).includes('Салом ҷаҳон'))).toBe(true);
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
});

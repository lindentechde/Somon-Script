import * as fs from 'fs';
import * as path from 'path';

import * as cliProgram from '../src/cli/program';
import { i18n } from '../src/cli/i18n';
import { buildCliOnce, canonicalTmpDir } from './helpers/paths';

/**
 * `somon run` in process: warnings are one line each, and the program starts
 * with the learner's run time (src/runtime/node-prelude.ts) loaded.
 */
describe('somon run warnings and run time', () => {
  let dir: string;
  let cwd: string;
  let warn: jest.SpyInstance;
  let execute: jest.SpyInstance;

  beforeAll(() => {
    // The run time is loaded from dist/
    buildCliOnce();
  });

  beforeEach(() => {
    dir = canonicalTmpDir('somon-run-warnings-');
    cwd = process.cwd();
    process.chdir(dir);
    i18n.setLanguage('en');
    warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    execute = jest
      .spyOn(cliProgram.cliRuntime, 'executeCompiledFile')
      .mockResolvedValue({ status: 0, signal: null });
    process.exitCode = undefined;
  });

  afterEach(() => {
    warn.mockRestore();
    execute.mockRestore();
    process.chdir(cwd);
    fs.rmSync(dir, { recursive: true, force: true });
    process.exitCode = undefined;
  });

  const run = async (args: string[]): Promise<void> => {
    const program = cliProgram.createProgram();
    program.exitOverride();
    await program.parseAsync(['run', ...args], { from: 'user' });
  };

  test('the run time exists and is loaded before the program', async () => {
    fs.writeFileSync(path.join(dir, 'а.som'), 'чоп(1);\n');
    await run(['а.som']);
    expect(fs.existsSync(cliProgram.runtimePreludePath())).toBe(true);
    expect(execute).toHaveBeenCalledWith(
      expect.any(String),
      [],
      expect.objectContaining({ preload: [cliProgram.runtimePreludePath()] })
    );
    expect(warn).not.toHaveBeenCalled();
  });

  test('a type warning names the file relative to the current directory', async () => {
    fs.mkdirSync(path.join(dir, 'лоиҳа'));
    fs.writeFileSync(path.join(dir, 'лоиҳа', 'б.som'), 'тағ н = 1;\nчоп(н.нест);\n');
    await run([path.join(dir, 'лоиҳа', 'б.som')]);
    expect(warn.mock.calls).toEqual([
      [
        `Warning: ${path.join('лоиҳа', 'б.som')}:2:7: Property 'нест' does not exist on type 'рақам'`,
      ],
    ]);
  });

  test('a warning about the whole build has no file', async () => {
    fs.writeFileSync(
      path.join(dir, 'u.som'),
      'ворид { в } аз "./v";\nсодир собит у = 1;\nчоп(в);\n'
    );
    fs.writeFileSync(path.join(dir, 'v.som'), 'ворид { у } аз "./u";\nсодир собит в = 2;\n');
    await run(['u.som']);
    expect(warn.mock.calls).toEqual([
      [expect.stringMatching(/^Warning: Circular dependencies detected: .*u\.som -> /)],
    ]);
  });

  test('in Tajik a warning reads as the learner diagnostics do, also without a file', async () => {
    i18n.setLanguage('tj');
    fs.writeFileSync(path.join(dir, 'а.som'), 'тағ н = 1;\nчоп(н.нест);\n');
    await run(['а.som']);
    fs.writeFileSync(
      path.join(dir, 'u.som'),
      'ворид { в } аз "./v";\nсодир собит у = 1;\nчоп(в);\n'
    );
    fs.writeFileSync(path.join(dir, 'v.som'), 'ворид { у } аз "./u";\nсодир собит в = 2;\n');
    await run(['u.som']);
    expect(warn.mock.calls).toEqual([
      ['Огоҳӣ дар а.som, сатри 2: Дар навъи `рақам` хосияти `нест` нест.'],
      [
        expect.stringMatching(
          /^Огоҳӣ: Модулҳо якдигарро даврвор ворид мекунанд: `u\.som → v\.som → u\.som`\.$/
        ),
      ],
    ]);
  });

  test('ES module programs report their warnings and load the run time too', async () => {
    fs.writeFileSync(path.join(dir, 'в.som'), 'тағ н = 1;\nчоп(н.нест);\n');
    await run(['--module', 'esm', 'в.som']);
    expect(warn.mock.calls).toEqual([
      ["Warning: в.som:2:7: Property 'нест' does not exist on type 'рақам'"],
    ]);
    expect(execute).toHaveBeenCalledWith(
      expect.any(String),
      [],
      expect.objectContaining({ preload: [cliProgram.runtimePreludePath()] })
    );
  });
});

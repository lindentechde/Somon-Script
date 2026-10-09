/**
 * Regression tests for bugs fixed in the CLI (src/cli) and its configuration
 * (src/config.ts).
 */
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

import { runInProcess, writeFiles } from './helpers/cli-in-process';
import { canonicalTmpDir } from './helpers/paths';

jest.setTimeout(30000);

let dir: string;

beforeEach(() => {
  dir = canonicalTmpDir('somon-cli-regressions-');
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

const LIBRARY = 'содир функсия ҷамъ(а: рақам, б: рақам): рақам { бозгашт а + б; }\n';

describe('compile --declaration names the file TypeScript looks for', () => {
  // `-o lib.mjs` wrote lib.d.ts, which TypeScript never reads for lib.mjs.
  test.each([
    ['lib.mjs', 'lib.d.mts', 'esm'],
    ['lib.cjs', 'lib.d.cts', 'commonjs'],
    ['lib.js', 'lib.d.ts', 'commonjs'],
    ['out/lib.MJS', 'out/lib.d.mts', 'esm'],
    ['out/lib', 'out/lib.d.ts', 'commonjs'],
  ])('-o %s → %s', async (output, declaration, module) => {
    writeFiles(dir, { 'lib.som': LIBRARY });
    const result = await runInProcess(
      ['compile', 'lib.som', '-o', output, '--declaration', '--module', module],
      { cwd: dir }
    );
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(`Generated declarations: '${declaration}'`);
    expect(fs.readFileSync(path.join(dir, declaration), 'utf8')).toBe(
      'export declare function ҷамъ(а: number, б: number): number;\n'
    );
  });

  test('a TypeScript ES module importing lib.mjs gets its types', async () => {
    writeFiles(dir, {
      'lib.som': LIBRARY,
      'main.mts': 'import { ҷамъ } from "./lib.mjs";\nconst сатр: string = ҷамъ(1, 2);\n',
    });
    const args = ['compile', 'lib.som', '-o', 'lib.mjs', '--declaration', '--module', 'esm'];
    await runInProcess(args, { cwd: dir });
    const program = ts.createProgram([path.join(dir, 'main.mts')], {
      module: ts.ModuleKind.NodeNext,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
      strict: true,
      noEmit: true,
      types: [],
    });
    const messages = ts
      .getPreEmitDiagnostics(program)
      .map(diagnostic => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
    // The declarations are found: the only error is the deliberate one.
    expect(messages).toEqual(["Type 'number' is not assignable to type 'string'."]);
  });
});

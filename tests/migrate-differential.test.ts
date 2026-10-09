import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';
import * as vm from 'vm';
import ts from 'typescript';
import { compile } from '../src/compiler';
import { migrate } from '../src/tools/migrate';

/**
 * Differential test of `somon migrate`: every TypeScript program in
 * tests/fixtures/migrate is run twice — transpiled by TypeScript
 * (`ts.transpileModule`), and migrated to SomonScript and compiled by
 * SomonScript — and both runs must print the same output.
 *
 * The corpus covers every construct of the language (NN-*.ts) and LeetCode
 * solutions written in TypeScript (lc-*.ts).
 */
const CORPUS = path.join(__dirname, 'fixtures', 'migrate');
const programs = fs
  .readdirSync(CORPUS)
  .filter(name => name.endsWith('.ts'))
  .sort();

/**
 * Programs that use constructs SomonScript drops with a warning. Once the
 * compiler supports a construct, the tool writes it in Tajik and the count
 * goes down; it never goes up.
 */
const EXPECTED_WARNINGS: Readonly<Record<string, number>> = {
  '01-variables.ts': 1, // var → тағ
  '15-recursion.ts': 1, // reduce<unknown[]>(…): type arguments left out
  '48-class-expressions.ts': 1, // this parameter
  '49-overloads.ts': 5, // overload signatures
  '50-declare-override.ts': 5, // declare, override, this parameter
  '51-accessor-index.ts': 3, // class index signature, accessor
  '52-import-require.ts': 3, // import = require / alias
  '56-sorting.ts': 1, // reduce<Record<…>>(…): type arguments left out
};

/** Runs CommonJS code in a fresh context and returns what it printed. */
async function run(code: string): Promise<string> {
  const lines: string[] = [];
  const log = (...args: unknown[]): void => {
    lines.push(util.formatWithOptions({ depth: 4 }, ...args));
  };
  const prefixed =
    (prefix: string) =>
    (...args: unknown[]): void =>
      log(prefix, ...args);
  const module = { exports: {} };
  const context = vm.createContext({
    console: {
      log,
      info: log,
      debug: log,
      table: log,
      error: prefixed('[error]'),
      warn: prefixed('[warn]'),
    },
    module,
    exports: module.exports,
    require,
    setTimeout,
    clearTimeout,
    setImmediate,
    queueMicrotask,
  });
  try {
    vm.runInContext(code, context, { timeout: 5000 });
  } catch (error) {
    lines.push(`THROWN ${(error as Error).message}`);
  }
  // Let promise chains and async functions finish printing
  for (let i = 0; i < 20; i++) await new Promise(resolve => setImmediate(resolve));
  await new Promise(resolve => setTimeout(resolve, 10));
  for (let i = 0; i < 20; i++) await new Promise(resolve => setImmediate(resolve));
  return lines.join('\n');
}

describe('migrate: TypeScript and the migrated SomonScript print the same', () => {
  test('the corpus covers the language and LeetCode solutions', () => {
    expect(programs.length).toBeGreaterThanOrEqual(75);
    expect(programs.filter(name => name.startsWith('lc-')).length).toBeGreaterThanOrEqual(15);
    expect(programs.filter(name => /^\d\d-/.test(name)).length).toBeGreaterThanOrEqual(60);
  });

  test.each(programs)(
    '%s',
    async name => {
      const source = fs.readFileSync(path.join(CORPUS, name), 'utf8');
      const transpiled = ts.transpileModule(source, {
        compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
      }).outputText;
      const expected = await run(transpiled);

      const migrated = migrate(source, { fileName: name });
      expect(migrated.warnings.length).toBeLessThanOrEqual(EXPECTED_WARNINGS[name] ?? 0);
      const compiled = compile(migrated.code);
      expect(compiled.errors.filter(error => !error.startsWith('Type error'))).toEqual([]);

      expect(await run(compiled.code)).toBe(expected);
      expect(expected).not.toContain('THROWN');
    },
    30000
  );
});

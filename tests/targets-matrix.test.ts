import * as fs from 'fs';
import * as path from 'path';
import ts from 'typescript';
import * as util from 'util';
import * as vm from 'vm';

import { compile } from '../src/compiler';
import { DEFAULT_TARGET, TARGETS, targetAtLeast, type Target } from '../src/targets';

/**
 * Execution matrix: every runnable program — the top-level examples, the
 * LeetCode solutions and the programs of tests/operators.test.ts — compiled
 * for every target and run with the current Node in a fresh vm context. Its
 * output must equal the es2020 output, or the compiler must refuse the target
 * with a target error that names a newer one (BigInt literals below es2020).
 *
 * By default the operator programs and the examples run on every target and
 * each LeetCode solution on es5 and one more target (they rotate), which keeps
 * the suite fast; SOMON_FULL_MATRIX=1 runs every program on every target.
 */
const FULL_MATRIX = process.env.SOMON_FULL_MATRIX === '1';
const ROOT = path.join(__dirname, '..');

interface Program {
  name: string;
  source: string;
  targets: readonly Target[];
}

/** The programs of tests/operators.test.ts: rows of [name, source, expected output]. */
function operatorPrograms(): Array<{ name: string; source: string }> {
  const file = path.join(__dirname, 'operators.test.ts');
  const sourceFile = ts.createSourceFile(
    file,
    fs.readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest
  );
  const text = (node: ts.Expression): string | undefined => {
    if (ts.isStringLiteralLike(node)) return node.text;
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
      const left = text(node.left);
      const right = text(node.right);
      return left !== undefined && right !== undefined ? left + right : undefined;
    }
    return undefined;
  };
  const rows: Array<{ name: string; source: string }> = [];
  const visit = (node: ts.Node): void => {
    if (ts.isArrayLiteralExpression(node) && node.elements.length === 3) {
      const [name, source, expected] = node.elements.map(text);
      if (name !== undefined && source !== undefined && expected !== undefined) {
        rows.push({ name: `operators: ${name}`, source });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return rows;
}

function somFiles(dir: string): string[] {
  return fs
    .readdirSync(dir)
    .filter(file => file.endsWith('.som'))
    .sort();
}

/** Top-level examples that run on their own: not the ones that import other modules. */
function examplePrograms(): Array<{ name: string; source: string }> {
  const dir = path.join(ROOT, 'examples');
  return somFiles(dir)
    .map(file => ({
      name: `examples/${file}`,
      source: fs.readFileSync(path.join(dir, file), 'utf8'),
    }))
    .filter(({ source }) => !/^\s*(?:ворид|содир)\s/m.test(source));
}

function leetcodePrograms(): Array<{ name: string; source: string }> {
  const dir = path.join(ROOT, 'examples', 'leetcode');
  return somFiles(dir).map(file => ({
    name: `leetcode/${file}`,
    source: fs.readFileSync(path.join(dir, file), 'utf8'),
  }));
}

const OTHER_TARGETS = TARGETS.filter(target => target !== DEFAULT_TARGET);

const programs: Program[] = [
  ...operatorPrograms().map(program => ({ ...program, targets: OTHER_TARGETS })),
  ...examplePrograms().map(program => ({ ...program, targets: OTHER_TARGETS })),
  ...leetcodePrograms().map((program, index) => ({
    ...program,
    targets: FULL_MATRIX
      ? OTHER_TARGETS
      : [...new Set<Target>(['es5', OTHER_TARGETS[index % OTHER_TARGETS.length]])],
  })),
];

/**
 * Deterministic globals: a seeded `Math.random` and a `Date` whose "now" is a
 * fixed time plus the virtual clock of the timers below; `Symbol.dispose` and
 * `Symbol.asyncDispose`, which vm contexts lack.
 */
const PRELUDE = `(function (global, clock) {
  var seed = 20251009;
  global.Math.random = function () {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  var RealDate = global.Date;
  var start = 1700000000000;
  function FixedDate() {
    if (!(this instanceof FixedDate)) return new RealDate(start + clock()).toString();
    if (arguments.length === 0) return new RealDate(start + clock());
    var args = [null].concat(Array.prototype.slice.call(arguments));
    return new (Function.prototype.bind.apply(RealDate, args))();
  }
  FixedDate.prototype = RealDate.prototype;
  FixedDate.now = function () { return start + clock(); };
  FixedDate.UTC = RealDate.UTC;
  FixedDate.parse = RealDate.parse;
  global.Date = FixedDate;
  // Node.js defines these for \`истифода\` in its main realm only
  if (!global.Symbol.dispose) global.Symbol.dispose = global.Symbol('Symbol.dispose');
  if (!global.Symbol.asyncDispose) {
    global.Symbol.asyncDispose = global.Symbol('Symbol.asyncDispose');
  }
})(this, __clock);`;

interface Timer {
  id: number;
  at: number;
  repeat?: number;
  callback: (...args: unknown[]) => void;
  args: unknown[];
}

/** Timers on a virtual clock: they fire in order of time without waiting. */
class VirtualTimers {
  now = 0;
  private nextId = 1;
  private readonly queue: Timer[] = [];

  readonly setTimeout = (callback: () => void, delay = 0, ...args: unknown[]): number =>
    this.add(callback, delay, args);

  readonly setInterval = (callback: () => void, delay = 0, ...args: unknown[]): number =>
    this.add(callback, delay, args, Math.max(1, Number(delay) || 0));

  readonly clear = (id: number): void => {
    const index = this.queue.findIndex(timer => timer.id === id);
    if (index !== -1) this.queue.splice(index, 1);
  };

  private add(
    callback: (...args: unknown[]) => void,
    delay: number,
    args: unknown[],
    repeat?: number
  ): number {
    const id = this.nextId++;
    this.queue.push({ id, at: this.now + Math.max(0, Number(delay) || 0), repeat, callback, args });
    return id;
  }

  /** Run microtasks and timers until nothing is left (or a runaway interval stops). */
  async drain(onError: (error: unknown) => void): Promise<void> {
    for (let step = 0; step < 2000; step++) {
      await new Promise(resolve => setImmediate(resolve));
      if (this.queue.length === 0) return;
      this.queue.sort((a, b) => a.at - b.at || a.id - b.id);
      const timer = this.queue.shift()!;
      this.now = timer.at;
      if (timer.repeat !== undefined) this.queue.push({ ...timer, at: timer.at + timer.repeat });
      try {
        timer.callback(...timer.args);
      } catch (error) {
        onError(error);
      }
    }
  }
}

function describeError(error: unknown): string {
  return error instanceof Object && 'message' in error
    ? `Uncaught ${(error as Error).name}: ${(error as Error).message}`
    : `Uncaught ${String(error)}`;
}

const CONSOLE_METHODS = [
  'log',
  'info',
  'debug',
  'warn',
  'error',
  'trace',
  'dir',
  'dirxml',
  'table',
  'group',
  'groupCollapsed',
  'groupEnd',
  'time',
  'timeEnd',
  'timeLog',
  'count',
  'countReset',
  'clear',
];

/** Run compiled code and return what it printed (stack frames left out). */
async function execute(code: string): Promise<string> {
  const output: string[] = [];
  const print = (...args: unknown[]): void => {
    output.push(util.format(...args));
  };
  // Every console method prints its arguments (`assert` passes silently)
  const console: Record<string, unknown> = Object.fromEntries(
    CONSOLE_METHODS.map(name => [name, print])
  );
  console.assert = () => {};
  const timers = new VirtualTimers();
  const context = vm.createContext({
    console,
    setTimeout: timers.setTimeout,
    setInterval: timers.setInterval,
    clearTimeout: timers.clear,
    clearInterval: timers.clear,
    queueMicrotask,
    __clock: () => timers.now,
  });
  vm.runInContext(PRELUDE, context);
  try {
    vm.runInContext(code, context, { timeout: 10000 });
  } catch (error) {
    output.push(describeError(error));
  }
  await timers.drain(error => output.push(describeError(error)));
  return output
    .join('\n')
    .split('\n')
    .filter(line => !/^\s+at /.test(line))
    .join('\n');
}

const TARGET_ERROR =
  /^Target error at line \d+, column \d+: .+ only available when targeting (\S+) or later \(target is (\S+)\)\.\n> /;

describe(`execution matrix (${FULL_MATRIX ? 'full' : 'sampled; SOMON_FULL_MATRIX=1 runs all'})`, () => {
  const refused: string[] = [];

  test('collects every runnable program', () => {
    expect(
      programs.filter(program => program.name.startsWith('operators:')).length
    ).toBeGreaterThan(90);
    expect(programs.filter(program => program.name.startsWith('examples/')).length).toBeGreaterThan(
      55
    );
    expect(programs.filter(program => program.name.startsWith('leetcode/')).length).toBe(100);
  });

  test.each(programs.map(program => [program.name, program] as const))(
    '%s',
    async (_name, program) => {
      const baseline = compile(program.source, { typeCheck: false });
      expect(baseline.errors).toEqual([]);
      const expected = await execute(baseline.code);
      expect(expected).not.toMatch(/^Uncaught /m);

      const problems: string[] = [];
      let required: Target = 'es5';
      for (const target of program.targets) {
        const result = compile(program.source, { typeCheck: false, target });
        if (result.errors.length > 0) {
          // Only syntax the target cannot express may be refused, with a newer target named
          for (const error of result.errors) {
            const match = TARGET_ERROR.exec(error);
            if (!match || match[2] !== target || targetAtLeast(target, match[1] as Target)) {
              problems.push(`${target}: unexpected error ${error}`);
            } else if (!targetAtLeast(required, match[1] as Target)) {
              required = match[1] as Target;
            }
          }
          refused.push(`${program.name} on ${target}`);
          continue;
        }
        const actual = await execute(result.code);
        if (actual !== expected) {
          problems.push(
            `${target}: output differs\n--- es2020\n${expected}\n--- ${target}\n${actual}`
          );
        }
      }
      // A target that refuses is older than every target that runs the program
      for (const target of program.targets) {
        const ranOrRefused = refused.includes(`${program.name} on ${target}`);
        if (targetAtLeast(target, required) === ranOrRefused) {
          problems.push(
            `${target}: ${ranOrRefused ? 'refused' : 'ran'} although ${required} is needed`
          );
        }
      }
      expect(problems).toEqual([]);
    },
    30000
  );

  test('programs with syntax older targets lack are refused, not miscompiled', () => {
    expect(refused).toEqual(
      expect.arrayContaining(
        ['es5', 'es2015', 'es2016', 'es2017', 'es2018', 'es2019'].map(
          target => `operators: BigInt operators on ${target}`
        )
      )
    );
  });
});

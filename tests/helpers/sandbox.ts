/**
 * Runs compiled programs in a fresh `vm` context and returns what they
 * printed, deterministically: `Math.random` is seeded, `Date` and
 * `performance.now` read a virtual clock, and timers fire in order of time
 * without waiting. Programs may consist of several modules (CommonJS or ES
 * modules) that import each other by relative path.
 *
 * Used by the differential and fuzz tests, which compare the output of the
 * same program compiled in different ways: everything a program prints, and
 * every error it throws, ends up in the returned text.
 *
 * ES modules need `vm.SourceTextModule`, which Node.js only offers with
 * `--experimental-vm-modules` (the differential test's worker processes have
 * it; see {@link esmSupported}).
 */
import { isBuiltin } from 'module';
import * as util from 'util';
import * as vm from 'vm';

export type ModuleFormat = 'commonjs' | 'esm';

export interface SandboxOptions {
  format: ModuleFormat;
  /** Milliseconds the synchronous part of the program may take (default 10 s). */
  timeout?: number;
}

/** The program's modules by name (`main`, `math`, … without extension) and the entry's name. */
export interface SandboxProgram {
  modules: ReadonlyMap<string, string>;
  entry: string;
}

/** Whether ES modules can run here (`node --experimental-vm-modules`). */
export function esmSupported(): boolean {
  return typeof (vm as unknown as { SourceTextModule?: unknown }).SourceTextModule === 'function';
}

/**
 * The module a relative specifier names: `./math.js`, `./math.som`,
 * `../dir/math` → `math`. Programs keep their modules in one directory.
 */
export function moduleName(specifier: string): string {
  const base = specifier.split(/[\\/]/).pop() ?? specifier;
  return base.replace(/\.(?:[cm]?js|som|[cm]?ts)$/, '');
}

function isRelative(specifier: string): boolean {
  return specifier.startsWith('./') || specifier.startsWith('../');
}

/**
 * Seeded `Math.random`, a `Date` whose "now" is a fixed time plus the
 * virtual clock, and `Symbol.dispose`/`Symbol.asyncDispose`, which vm
 * contexts of Node.js 20–22 lack.
 */
const PRELUDE = `(function (global, clock) {
  var seed = 20261009;
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
  Object.defineProperty(FixedDate, 'name', { value: 'Date' });
  FixedDate.now = function () { return start + clock(); };
  FixedDate.UTC = RealDate.UTC;
  FixedDate.parse = RealDate.parse;
  global.Date = FixedDate;
  if (!global.Symbol.dispose) {
    Object.defineProperty(global.Symbol, 'dispose', { value: global.Symbol.for('Symbol.dispose') });
  }
  if (!global.Symbol.asyncDispose) {
    Object.defineProperty(global.Symbol, 'asyncDispose', {
      value: global.Symbol.for('Symbol.asyncDispose'),
    });
  }
})(this, __somonClock);`;

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

  readonly setImmediate = (callback: () => void, ...args: unknown[]): number =>
    this.add(callback, 0, args);

  readonly clear = (id: unknown): void => {
    const index = this.queue.findIndex(timer => timer.id === id);
    if (index !== -1) this.queue.splice(index, 1);
  };

  private add(
    callback: (...args: unknown[]) => void,
    delay: unknown,
    args: unknown[],
    repeat?: number
  ): number {
    const id = this.nextId++;
    const at = this.now + Math.max(0, Number(delay) || 0);
    this.queue.push({ id, at, repeat, callback, args });
    return id;
  }

  /** Run microtasks and timers until nothing is left (or a runaway interval stops). */
  async drain(onError: (error: unknown) => void): Promise<void> {
    for (let step = 0; step < 2000; step++) {
      await settle();
      if (this.queue.length === 0) return;
      this.queue.sort((a, b) => a.at - b.at || a.id - b.id);
      const timer = this.queue.shift()!;
      this.now = timer.at;
      if (timer.repeat !== undefined) this.queue.push({ ...timer, at: timer.at + timer.repeat });
      try {
        if (typeof timer.callback === 'function') timer.callback(...timer.args);
      } catch (error) {
        onError(error);
      }
    }
  }
}

/** Lets pending promise reactions run (they share the host's microtask queue). */
async function settle(): Promise<void> {
  for (let i = 0; i < 3; i++) await new Promise(resolve => setImmediate(resolve));
}

/** `Uncaught TypeError: x is not a function`, as Node.js reports an uncaught error. */
export function describeError(error: unknown): string {
  if (error !== null && typeof error === 'object' && 'message' in error) {
    const { name, message } = error as { name?: unknown; message?: unknown };
    return `Uncaught ${String(name)}: ${String(message)}`;
  }
  return `Uncaught ${util.inspect(error)}`;
}

/** Thrown by `process.exit()` to stop the program. */
class ExitSignal {
  constructor(readonly code: number) {}
}

/**
 * Each console method prints its arguments as Node.js formats them; what the
 * methods add (counters, assertions) follows Node.js.
 */
function makeConsole(print: (line: string) => void): Record<string, unknown> {
  const format = (...args: unknown[]): string => util.formatWithOptions({ depth: 4 }, ...args);
  const log = (...args: unknown[]): void => print(format(...args));
  const counts = new Map<string, number>();
  const methods = [
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
  ];
  const console: Record<string, unknown> = Object.fromEntries(methods.map(name => [name, log]));
  for (const name of ['groupEnd', 'time', 'timeEnd', 'timeLog', 'clear', 'profile']) {
    console[name] = (): void => {};
  }
  console.assert = (condition: unknown, ...args: unknown[]): void => {
    if (!condition) print(format('Assertion failed', ...args));
  };
  console.count = (label: unknown = 'default'): void => {
    const key = String(label);
    const count = (counts.get(key) ?? 0) + 1;
    counts.set(key, count);
    print(`${key}: ${count}`);
  };
  console.countReset = (label: unknown = 'default'): void => {
    counts.delete(String(label));
  };
  return console;
}

interface Run {
  context: vm.Context;
  output: string[];
  timers: VirtualTimers;
}

function createRun(): Run {
  const output: string[] = [];
  const print = (line: string): void => {
    output.push(line);
  };
  const timers = new VirtualTimers();
  const process = {
    argv: ['node', 'main.js'],
    env: {},
    platform: 'linux',
    version: 'v22.0.0',
    versions: { node: '22.0.0' },
    exitCode: undefined,
    exit: (code = 0): never => {
      throw new ExitSignal(Number(code));
    },
    cwd: (): string => '/',
    nextTick: (callback: (...args: unknown[]) => void, ...args: unknown[]): void =>
      queueMicrotask(() => callback(...args)),
    hrtime: Object.assign((): [number, number] => [timers.now, 0], {
      bigint: (): bigint => BigInt(timers.now) * 1000000n,
    }),
    memoryUsage: (): Record<string, number> => ({ rss: 0, heapTotal: 0, heapUsed: 0 }),
    uptime: (): number => timers.now / 1000,
    stdout: { write: (text: unknown): boolean => (print(String(text).replace(/\n$/, '')), true) },
    stderr: { write: (text: unknown): boolean => (print(String(text).replace(/\n$/, '')), true) },
    on: (): void => {},
  };
  const context = vm.createContext({
    console: makeConsole(print),
    process,
    setTimeout: timers.setTimeout,
    setInterval: timers.setInterval,
    setImmediate: timers.setImmediate,
    clearTimeout: timers.clear,
    clearInterval: timers.clear,
    clearImmediate: timers.clear,
    queueMicrotask,
    structuredClone,
    URL,
    URLSearchParams,
    TextEncoder,
    TextDecoder,
    atob,
    btoa,
    performance: { now: (): number => timers.now },
    __somonClock: () => timers.now,
  });
  vm.runInContext(PRELUDE, context);
  return { context, output, timers };
}

/**
 * The output of a run: printed lines and errors, without stack frames, with
 * LF line breaks (Git checks sources out with CRLF on Windows).
 */
function finish(run: Run): string {
  return run.output
    .join('\n')
    .split(/\r?\n/)
    .filter(line => !/^\s+at /.test(line))
    .join('\n');
}

function report(run: Run, error: unknown): void {
  if (error instanceof ExitSignal) {
    if (error.code !== 0) run.output.push(`exit ${error.code}`);
    return;
  }
  run.output.push(describeError(error));
}

/**
 * Errors that keep code from loading at all, such as syntax the runtime does
 * not know: `SyntaxError (load): …` rather than `Uncaught …`.
 */
export const LOAD_ERROR = 'SyntaxError (load): ';

/** Runs `program` and returns everything it printed, with uncaught errors. */
export async function runProgram(
  program: SandboxProgram,
  options: SandboxOptions
): Promise<string> {
  const run = createRun();
  const timeout = options.timeout ?? 10000;
  const listener = (reason: unknown): void => {
    run.output.push(`Unhandled rejection: ${describeError(reason).slice('Uncaught '.length)}`);
  };
  process.on('unhandledRejection', listener);
  try {
    if (options.format === 'esm') {
      await runEsm(program, run, timeout);
    } else {
      runCommonJs(program, run, timeout);
    }
    await run.timers.drain(error => report(run, error));
    await settle();
  } finally {
    process.off('unhandledRejection', listener);
  }
  return finish(run);
}

/**
 * An ES module whose exports are the properties of a CommonJS module's
 * `module.exports` (and `default`, the object itself), as Node.js imports
 * CommonJS modules and built-in modules.
 */
async function moduleOfExports(value: unknown, identifier: string, run: Run): Promise<vm.Module> {
  const object = (value ?? {}) as Record<string, unknown>;
  const names =
    typeof value === 'object' || typeof value === 'function'
      ? Object.keys(object).filter(name => name !== 'default')
      : [];
  const module = new vm.SyntheticModule(
    [...names, 'default'],
    function () {
      for (const name of names) this.setExport(name, object[name]);
      this.setExport('default', value);
    },
    { context: run.context, identifier }
  );
  await module.link(() => {
    throw new Error('a synthetic module has no imports');
  });
  await module.evaluate();
  return module;
}

function runCommonJs(program: SandboxProgram, run: Run, timeout: number): void {
  type Wrapper = (
    exports: unknown,
    require: (specifier: string) => unknown,
    module: { exports: unknown },
    __filename: string,
    __dirname: string
  ) => void;
  const cache = new Map<string, { exports: unknown }>();
  const load = (name: string): unknown => {
    const cached = cache.get(name);
    if (cached) return cached.exports;
    const wrapper = wrappers.get(name);
    if (!wrapper) throw new Error(`Cannot find module './${name}.js'`);
    const module = { exports: {} as unknown };
    cache.set(name, module);
    wrapper.call(module.exports, module.exports, requireFrom, module, `/${name}.js`, '/');
    return module.exports;
  };
  const requireFrom = (specifier: string): unknown => {
    if (isRelative(specifier)) return load(moduleName(specifier));
    if (isBuiltin(specifier)) return require(specifier) as unknown;
    throw new Error(`Cannot find module '${specifier}'`);
  };
  // `import()` of a CommonJS module gives its exports as an ES module (vm modules only)
  const dynamicImport = esmSupported()
    ? {
        importModuleDynamically: (specifier: string): Promise<vm.Module> =>
          moduleOfExports(requireFrom(specifier), specifier, run),
      }
    : {};

  // Compile every module first: syntax errors are load errors, not uncaught errors
  const wrappers = new Map<string, Wrapper>();
  try {
    for (const [name, code] of program.modules) {
      // Node.js skips a `#!` line, which is not valid inside the wrapper function
      const body = code.replace(/^#!.*/, '');
      const wrapper = vm.runInContext(
        `(function (exports, require, module, __filename, __dirname) {${body}\n})`,
        run.context,
        { filename: `${name}.js`, ...dynamicImport }
      ) as Wrapper;
      wrappers.set(name, wrapper);
    }
  } catch (error) {
    run.output.push(`${LOAD_ERROR}${(error as Error).message}`);
    return;
  }
  run.context.__somonMain = (): unknown => load(program.entry);
  try {
    vm.runInContext('__somonMain()', run.context, { timeout });
  } catch (error) {
    report(run, error);
  }
}

async function runEsm(program: SandboxProgram, run: Run, timeout: number): Promise<void> {
  if (!esmSupported()) throw new Error('ES modules need node --experimental-vm-modules');
  const modules = new Map<string, vm.SourceTextModule>();
  const builtins = new Map<string, Promise<vm.Module>>();
  const moduleFor = (name: string): vm.SourceTextModule => {
    let module = modules.get(name);
    if (!module) {
      const code = program.modules.get(name);
      if (code === undefined) throw new Error(`Cannot find module './${name}.js'`);
      module = new vm.SourceTextModule(code, {
        context: run.context,
        identifier: `${name}.js`,
        importModuleDynamically,
      });
      modules.set(name, module);
    }
    return module;
  };
  const builtin = (specifier: string): Promise<vm.Module> => {
    let module = builtins.get(specifier);
    if (!module) {
      module = moduleOfExports(require(specifier), specifier, run);
      builtins.set(specifier, module);
    }
    return module;
  };
  const linker = (specifier: string): vm.Module | Promise<vm.Module> => {
    if (isRelative(specifier)) return moduleFor(moduleName(specifier));
    if (isBuiltin(specifier)) return builtin(specifier);
    throw new Error(`Cannot find module '${specifier}'`);
  };
  async function importModuleDynamically(specifier: string): Promise<vm.Module> {
    const module = await linker(specifier);
    if (module.status === 'unlinked') await module.link(linker);
    if (module.status === 'linked') await module.evaluate();
    return module;
  }

  let entry: vm.SourceTextModule;
  try {
    // Parse every module first: syntax errors are load errors, not uncaught errors
    for (const name of program.modules.keys()) moduleFor(name);
    entry = moduleFor(program.entry);
  } catch (error) {
    run.output.push(`${LOAD_ERROR}${(error as Error).message}`);
    return;
  }
  try {
    await entry.link(linker);
  } catch (error) {
    report(run, error);
    return;
  }
  try {
    await entry.evaluate({ timeout });
  } catch (error) {
    report(run, error);
  }
}

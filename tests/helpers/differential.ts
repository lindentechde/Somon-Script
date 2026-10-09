/**
 * Differential testing of SomonScript against TypeScript.
 *
 * Every program of the corpus (the runnable `.som` programs of the
 * repository, the programs of tests/operators.test.ts and of the
 * tests/ts-syntax-*.test.ts files, and the TypeScript programs of
 * tests/fixtures/migrate) is compiled and run three ways:
 *
 * - **A**: SomonScript → `compile()` → JavaScript;
 * - **B**: SomonScript → the TypeScript emitter → TypeScript →
 *   `ts.transpileModule` with the same target and module format;
 * - **C** (migrate fixtures only): the original TypeScript →
 *   `ts.transpileModule`; A and B then start from the program `somon
 *   migrate` made of it.
 *
 * Each run happens in a fresh sandbox (tests/helpers/sandbox.ts), for each
 * cell of targets × module formats, and A, B and C must print the same and
 * throw the same. The type-check verdicts of the SomonScript checker and the
 * TypeScript checker on each program are collected too.
 *
 * The work runs in child processes (`DifferentialPool`), which load the
 * TypeScript sources through tests/helpers/ts-require.js: the jest process
 * runs one test file at a time, the workers use every core, and ES modules
 * need `--experimental-vm-modules`.
 */
import { fork, type ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import ts from 'typescript';

import { compile, type CompileOptions } from '../../src/compiler';
import { Lexer } from '../../src/lexer';
import { Parser } from '../../src/parser';
import { scriptTargetFor, type Target } from '../../src/targets';
import { TsEmitter } from '../../src/ts-emitter';
import { migrate } from '../../src/tools/migrate';
import {
  ROOT,
  examplePrograms,
  operatorPrograms,
  tsSyntaxPrograms,
  type CorpusProgram,
} from './corpus';
import { LOAD_ERROR, moduleName, runProgram, type ModuleFormat } from './sandbox';

// ---------------------------------------------------------------------------
// Cells: targets × module formats

/** The targets the differential test runs on. */
export const DIFF_TARGETS: readonly Target[] = [
  'es5',
  'es2015',
  'es2017',
  'es2020',
  'es2022',
  'esnext',
];

export const FORMATS: readonly ModuleFormat[] = ['commonjs', 'esm'];

export interface Cell {
  target: Target;
  format: ModuleFormat;
}

export function cellName(cell: Cell): string {
  return `${cell.target}/${cell.format === 'commonjs' ? 'cjs' : 'esm'}`;
}

/** Every program runs here: the default target, CommonJS. */
export const REFERENCE_CELL: Cell = { target: 'es2022', format: 'commonjs' };

export const ALL_CELLS: readonly Cell[] = DIFF_TARGETS.flatMap(target =>
  FORMATS.map(format => ({ target, format }))
);

/**
 * The cells of the `index`-th program: every cell with `full`, otherwise the
 * reference cell and one more that rotates through the others, so that each
 * cell sees a share of the corpus in every run.
 */
export function cellsFor(index: number, full: boolean): Cell[] {
  if (full) return [...ALL_CELLS];
  const others = ALL_CELLS.filter(cell => cellName(cell) !== cellName(REFERENCE_CELL));
  return [REFERENCE_CELL, others[index % others.length]];
}

// ---------------------------------------------------------------------------
// Corpus

export interface DiffProgram {
  /** Display name: the path relative to the repository, or the test it comes from. */
  name: string;
  kind: CorpusProgram['kind'] | 'migrate';
  /** The SomonScript program (absent for migrate fixtures, which are TypeScript). */
  source?: string;
  /** A migrate fixture's TypeScript program. */
  typescript?: string;
  /** Absolute path of a program that is a file (the TypeScript checker resolves its imports). */
  file?: string;
  /** Modules of the program's directory that it imports: name (without extension) → source. */
  modules?: Record<string, string>;
  experimentalDecorators?: boolean;
  /** ts-syntax programs: the helper its test passes it to (`run`, `check`, `parse`, …). */
  helper?: string;
}

const MIGRATE_FIXTURES = path.join(ROOT, 'tests', 'fixtures', 'migrate');

/** Relative imports of a SomonScript program: `аз "./м"`, `ворид("./м")`, `require("./м")`. */
function relativeImports(source: string): string[] {
  const code = source.replace(/\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gm, '');
  const found = code.matchAll(
    /(?<![\p{L}\p{N}_$])(?:аз|ворид\s*\(|require\s*\()\s*["'](\.\.?\/[^"']+)["']/gu
  );
  return [...found].map(match => match[1]);
}

/** The modules next to `file` that it imports, directly or through each other. */
function importedModules(file: string, source: string): Record<string, string> {
  const dir = path.dirname(file);
  const modules: Record<string, string> = {};
  const queue = relativeImports(source);
  while (queue.length > 0) {
    const specifier = queue.shift()!;
    const name = moduleName(specifier);
    const sibling = path.join(dir, `${name}.som`);
    if (name in modules || !fs.existsSync(sibling)) continue;
    modules[name] = fs.readFileSync(sibling, 'utf8');
    queue.push(...relativeImports(modules[name]));
  }
  return modules;
}

/**
 * A name for a ts-syntax program that survives edits elsewhere in its test
 * file: the file and the program's first line (`ts-syntax-parser.test.ts ›
 * синф К { … }`), numbered when two programs of a file start alike.
 */
function stableName(program: CorpusProgram, taken: Set<string>): string {
  const file = program.name.slice(0, program.name.lastIndexOf(':'));
  const firstLine = program.source.trim().split(/\r?\n/)[0].trim();
  const excerpt = firstLine.length > 60 ? `${firstLine.slice(0, 60)}…` : firstLine;
  let name = `${file} › ${excerpt}`;
  for (let count = 2; taken.has(name); count++) name = `${file} › ${excerpt} (${count})`;
  taken.add(name);
  return name;
}

/** The corpus: every runnable `.som` program, the operator and ts-syntax programs, the migrate fixtures. */
export function differentialCorpus(): DiffProgram[] {
  const files: DiffProgram[] = examplePrograms().map(program => ({
    name: program.name,
    kind: program.kind,
    source: program.source,
    file: program.file,
    modules: importedModules(program.file!, program.source),
  }));
  const operators: DiffProgram[] = operatorPrograms().map(({ name, source, kind }) => ({
    name,
    source,
    kind,
  }));
  const taken = new Set<string>();
  const tsSyntax: DiffProgram[] = tsSyntaxPrograms().map(program => ({
    name: stableName(program, taken),
    kind: program.kind,
    source: program.source,
    helper: program.helper,
    experimentalDecorators: program.experimentalDecorators,
  }));
  const fixtures: DiffProgram[] = fs
    .readdirSync(MIGRATE_FIXTURES)
    .filter(name => name.endsWith('.ts'))
    .sort()
    .map(name => ({
      name: `migrate/${name}`,
      kind: 'migrate',
      typescript: fs.readFileSync(path.join(MIGRATE_FIXTURES, name), 'utf8'),
    }));
  return [...files, ...operators, ...tsSyntax, ...fixtures];
}

/** Programs that import modules of their own, which exist only inside their tests. */
export function importsMissingModules(program: DiffProgram): boolean {
  const source = program.source ?? program.typescript ?? '';
  const imports = program.typescript
    ? [...source.matchAll(/(?:from|require\()\s*["'](\.\.?\/[^"']+)["']/g)].map(m => m[1])
    : relativeImports(source);
  return imports.some(specifier => !(moduleName(specifier) in (program.modules ?? {})));
}

// ---------------------------------------------------------------------------
// The three paths

export type PathName = 'A' | 'B' | 'C';

export interface PathResult {
  /** `ran`, or `refused` (a target error), `failed` (another compile error), `skipped`. */
  status: 'ran' | 'refused' | 'failed' | 'skipped';
  /** What the program printed (`ran`), or why it did not run. */
  output: string;
}

export interface CellResult {
  cell: string;
  paths: Partial<Record<PathName, PathResult>>;
}

type Mode = 'default' | 'strict';

/** Error codes of each checker on a program, in default and strict mode. */
export interface Verdicts {
  somon: Record<Mode, string[]>;
  typescript: Record<Mode, string[]>;
}

export interface DiffResult {
  name: string;
  /** The SomonScript program (for migrate fixtures, the migrated one). */
  source?: string;
  /** `true`, or why the program cannot run (it does not compile). */
  runnable: true | string;
  /** Per module format: `true`, or why the program cannot be that kind of module. */
  formats: Record<ModuleFormat, true | string>;
  cells: CellResult[];
  verdicts?: Verdicts;
  /** An exception of the harness itself. */
  error?: string;
}

export interface DiffJob {
  program: DiffProgram;
  cells: Cell[];
  /** Also collect the type-check verdicts. */
  verdicts: boolean;
}

const TARGET_ERROR = /^Target error at line \d+, column \d+: /;

/** A program's modules: the entry `main` (or its file name) and the modules it imports. */
function entryName(program: DiffProgram): string {
  return program.file ? path.basename(program.file, '.som') : 'main';
}

/** `compile()` every module; the code, or the errors. */
function pathA(
  modules: Map<string, string>,
  cell: Cell,
  experimentalDecorators: boolean | undefined
): Map<string, string> | PathResult {
  const output = new Map<string, string>();
  for (const [name, source] of modules) {
    const result = compile(source, {
      typeCheck: false,
      target: cell.target,
      module: cell.format,
      experimentalDecorators,
    });
    if (result.errors.length > 0) {
      const refused = result.errors.every(error => TARGET_ERROR.test(error));
      return { status: refused ? 'refused' : 'failed', output: result.errors.join('\n') };
    }
    output.set(name, result.code);
  }
  return output;
}

/** TypeScript's options for B and C: the cell's target and module format. */
export function transpileOptions(
  cell: Cell,
  experimentalDecorators: boolean | undefined
): ts.CompilerOptions {
  return {
    target: scriptTargetFor(cell.target),
    module: cell.format === 'esm' ? ts.ModuleKind.ESNext : ts.ModuleKind.CommonJS,
    // What the TypeScript checker asks for on es5 when a program iterates a Map or a string
    downlevelIteration: true,
    esModuleInterop: true,
    experimentalDecorators,
    newLine: ts.NewLineKind.LineFeed,
  };
}

/** `ts.transpileModule`, with its syntax errors. */
export function transpile(
  code: string,
  options: ts.CompilerOptions,
  fileName = 'main.ts'
): { code: string; errors: string[] } {
  const result = ts.transpileModule(code, {
    fileName,
    reportDiagnostics: true,
    compilerOptions: options,
  });
  const errors = (result.diagnostics ?? []).map(diagnostic =>
    ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ')
  );
  return { code: result.outputText, errors };
}

/** The TypeScript emitter's output for a SomonScript program. */
export function emitTypeScript(
  source: string,
  experimentalDecorators?: boolean
): { code: string; errors: string[] } {
  const parser = new Parser(new Lexer(source).tokenize());
  const ast = parser.parse();
  if (parser.getErrors().length > 0) return { code: '', errors: parser.getErrors() };
  const emitter = new TsEmitter({ experimentalDecorators });
  const code = emitter.generate(ast);
  return { code, errors: emitter.getErrors() };
}

/** SomonScript → TypeScript emitter → `ts.transpileModule`, every module. */
function pathB(
  modules: Map<string, string>,
  cell: Cell,
  experimentalDecorators: boolean | undefined
): Map<string, string> | PathResult {
  const output = new Map<string, string>();
  for (const [name, source] of modules) {
    const emitted = emitTypeScript(source, experimentalDecorators);
    const transpiled =
      emitted.errors.length > 0
        ? emitted
        : transpile(emitted.code, transpileOptions(cell, experimentalDecorators), `${name}.ts`);
    if (transpiled.errors.length > 0) {
      return { status: 'failed', output: transpiled.errors.join('\n') };
    }
    output.set(name, transpiled.code);
  }
  return output;
}

/** Constructs that only CommonJS has. */
const COMMONJS_ONLY =
  /\brequire\s*\(|\bmodule\.exports\b|\bexports\.|\b__dirname\b|\b__filename\b|^\s*(?:содир|export)\s*=/m;

/** Why the program cannot be a module of `format`, or `true`. */
function formatSupport(
  modules: Map<string, string>,
  format: ModuleFormat,
  typescript: string | undefined,
  experimentalDecorators: boolean | undefined
): true | string {
  for (const source of [...modules.values(), ...(typescript ? [typescript] : [])]) {
    if (format === 'esm' && COMMONJS_ONLY.test(source)) {
      return 'uses CommonJS (require, module.exports, export =)';
    }
  }
  const compiled = pathA(modules, { target: 'esnext', format }, experimentalDecorators);
  if (compiled instanceof Map) return true;
  return compiled.output.split('\n')[0];
}

async function runPath(
  compiled: Map<string, string> | PathResult,
  entry: string,
  format: ModuleFormat
): Promise<PathResult> {
  if (!(compiled instanceof Map)) return compiled;
  const output = await runProgram({ modules: compiled, entry }, { format });
  return { status: 'ran', output };
}

/**
 * Runs TypeScript's output for the cell. For esnext TypeScript keeps syntax
 * that no runtime runs yet (decorators, `accessor`, `using` on older Node.js);
 * the compiler lowers such code as for the newest edition (see
 * `loweringCompilerOptions`), and so does this when the output does not load.
 */
async function runTypeScript(
  build: (target: Target) => Map<string, string> | PathResult,
  cell: Cell,
  entry: string
): Promise<PathResult> {
  const result = await runPath(build(cell.target), entry, cell.format);
  if (cell.target !== 'esnext' || !result.output.startsWith(LOAD_ERROR)) return result;
  return runPath(build('es2024'), entry, cell.format);
}

const SKIPPED: PathResult = { status: 'skipped', output: '' };

/**
 * Codes of a program's errors: type errors (`TS2322`, `TYPE_NOT_ASSIGNABLE`)
 * and `CODEGEN` for the checks the code generator makes (TypeScript makes
 * some of them in its checker, such as TS2432 for enums).
 */
function errorCodes(source: string, options: CompileOptions): string[] {
  const result = compile(source, { ...options });
  return result.errors.flatMap(error => {
    if (error.startsWith('Code generation error')) return ['CODEGEN'];
    return /^Type error \[([^\]]+)\]/.exec(error)?.[1] ?? [];
  });
}

/** The verdicts of both checkers on a program, in default and strict mode. */
export function checkerVerdicts(
  source: string,
  options: { file?: string; experimentalDecorators?: boolean } = {}
): Verdicts {
  const base = { experimentalDecorators: options.experimentalDecorators };
  const typescript = { ...base, checker: 'typescript' as const, filePath: options.file };
  return {
    somon: {
      default: errorCodes(source, base),
      strict: errorCodes(source, { ...base, strict: true }),
    },
    typescript: {
      default: errorCodes(source, typescript),
      strict: errorCodes(source, { ...typescript, strict: true }),
    },
  };
}

/** Runs a program through every path in every cell of the job (in a worker). */
export async function processJob(job: DiffJob): Promise<DiffResult> {
  const { program } = job;
  const result: DiffResult = {
    name: program.name,
    runnable: true,
    formats: { commonjs: true, esm: true },
    cells: [],
  };
  try {
    let source = program.source;
    if (program.typescript !== undefined) {
      source = migrate(program.typescript, { fileName: program.name }).code;
    }
    result.source = source;
    const modules = new Map([
      [entryName(program), source!],
      ...Object.entries(program.modules ?? {}),
    ]);
    const { experimentalDecorators } = program;
    for (const format of FORMATS) {
      result.formats[format] = formatSupport(
        modules,
        format,
        program.typescript,
        experimentalDecorators
      );
    }
    if (result.formats.commonjs !== true && result.formats.esm !== true) {
      result.runnable = result.formats.commonjs;
    }
    if (result.runnable === true) {
      for (const cell of job.cells) {
        result.cells.push(await runCell(program, modules, cell, result.formats[cell.format]));
      }
    }
    const parses = new Parser(new Lexer(source!).tokenize());
    parses.parse();
    if (job.verdicts && parses.getErrors().length === 0) {
      result.verdicts = checkerVerdicts(source!, {
        file: program.file,
        experimentalDecorators,
      });
    }
  } catch (error) {
    result.error = error instanceof Error ? (error.stack ?? error.message) : String(error);
  }
  return result;
}

async function runCell(
  program: DiffProgram,
  modules: Map<string, string>,
  cell: Cell,
  support: true | string
): Promise<CellResult> {
  const name = cellName(cell);
  if (support !== true) {
    const skipped = { status: 'skipped' as const, output: support };
    return { cell: name, paths: { A: skipped, B: skipped } };
  }
  const entry = entryName(program);
  const { experimentalDecorators } = program;
  const a = await runPath(pathA(modules, cell, experimentalDecorators), entry, cell.format);
  const paths: CellResult['paths'] = { A: a };
  if (a.status !== 'ran') {
    paths.B = SKIPPED;
    return { cell: name, paths };
  }
  paths.B = await runTypeScript(
    target => pathB(modules, { ...cell, target }, experimentalDecorators),
    cell,
    entry
  );
  const { typescript } = program;
  if (typescript !== undefined) {
    paths.C = await runTypeScript(
      target => {
        const transpiled = transpile(typescript, transpileOptions({ ...cell, target }, false));
        return transpiled.errors.length > 0
          ? { status: 'failed', output: transpiled.errors.join('\n') }
          : new Map([[entry, transpiled.code]]);
      },
      cell,
      entry
    );
  }
  return { cell: name, paths };
}

// ---------------------------------------------------------------------------
// Comparison

/**
 * What differs between the paths of a result, as `cell: X ≠ Y` lines, and
 * what failed to compile. Empty when every path printed the same in every
 * cell.
 */
export function pathDifferences(result: DiffResult): string[] {
  const problems: string[] = [];
  if (result.error) return [`harness error: ${result.error}`];
  for (const { cell, paths } of result.cells) {
    for (const [name, outcome] of Object.entries(paths)) {
      if (outcome.status === 'failed') problems.push(`${cell}: ${name} failed: ${outcome.output}`);
    }
    const ran = (Object.entries(paths) as Array<[PathName, PathResult]>).filter(
      ([, outcome]) => outcome.status === 'ran'
    );
    for (const [name, outcome] of ran.slice(1)) {
      const [firstName, first] = ran[0];
      if (outcome.output !== first.output) {
        problems.push(
          `${cell}: ${firstName} ≠ ${name}\n--- ${firstName}\n${first.output}\n--- ${name}\n${outcome.output}`
        );
      }
    }
  }
  return problems;
}

/**
 * Cells whose output differs from the reference cell's (es2022, CommonJS)
 * although the paths agree within each cell: behaviour that depends on the
 * target or the module format in TypeScript too.
 */
export function cellDifferences(result: DiffResult): string[] {
  const reference = result.cells.find(cell => cell.cell === cellName(REFERENCE_CELL));
  const expected = reference?.paths.A;
  if (!expected || expected.status !== 'ran') return [];
  return result.cells
    .filter(({ paths }) => paths.A?.status === 'ran' && paths.A.output !== expected.output)
    .map(({ cell }) => cell);
}

/** `somon-only` (only SomonScript reports errors), `typescript-only`, or undefined (they agree). */
export type Disagreement = 'somon-only' | 'typescript-only';

export function verdictDisagreements(verdicts: Verdicts): Partial<Record<Mode, Disagreement>> {
  const found: Partial<Record<Mode, Disagreement>> = {};
  for (const mode of ['default', 'strict'] as const) {
    const somon = verdicts.somon[mode].length > 0;
    const typescript = verdicts.typescript[mode].length > 0;
    if (somon && !typescript) found[mode] = 'somon-only';
    if (typescript && !somon) found[mode] = 'typescript-only';
  }
  return found;
}

// ---------------------------------------------------------------------------
// Worker pool

interface WorkerReply {
  id: number;
  result: DiffResult;
}

/** Workers in the pool: SOMON_DIFF_WORKERS, or the number of cores (at most 4). */
export function poolSize(): number {
  const configured = Number(process.env.SOMON_DIFF_WORKERS);
  if (Number.isInteger(configured) && configured > 0) return configured;
  const cores = typeof os.availableParallelism === 'function' ? os.availableParallelism() : 4;
  return Math.max(1, Math.min(4, cores));
}

/** Node.js flags of the workers: ES modules in vm, and no TypeScript stripping of our `.ts`. */
function workerFlags(): string[] {
  const flags = ['--experimental-vm-modules', '--no-warnings'];
  if (process.allowedNodeEnvironmentFlags.has('--experimental-strip-types')) {
    flags.push('--no-experimental-strip-types');
  }
  return flags;
}

/**
 * Child processes that run {@link processJob}; `run` hands out the jobs and
 * returns every result, also when a worker dies (the job then has an `error`).
 */
export class DifferentialPool {
  private readonly workers: ChildProcess[] = [];

  constructor(private readonly size = poolSize()) {}

  async run(jobs: DiffJob[], timeoutPerJob = 300000): Promise<Map<string, DiffResult>> {
    const results = new Map<string, DiffResult>();
    const queue = jobs.map((job, id) => ({ job, id }));
    const runner = async (): Promise<void> => {
      let worker = this.spawn();
      for (let next = queue.shift(); next; next = queue.shift()) {
        const { job, id } = next;
        try {
          results.set(job.program.name, await this.send(worker, id, job, timeoutPerJob));
        } catch (error) {
          results.set(job.program.name, {
            name: job.program.name,
            runnable: true,
            formats: { commonjs: true, esm: true },
            cells: [],
            error: `worker failed: ${(error as Error).message}`,
          });
          worker.kill();
          worker = this.spawn();
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(this.size, jobs.length) }, runner));
    return results;
  }

  close(): void {
    for (const worker of this.workers.splice(0)) worker.kill();
  }

  private spawn(): ChildProcess {
    const worker = fork(path.join(__dirname, 'differential-worker.js'), [], {
      execPath: process.execPath,
      execArgv: workerFlags(),
      stdio: ['ignore', 'ignore', 'pipe', 'ipc'],
    });
    let stderr = '';
    worker.stderr?.on('data', chunk => {
      stderr = (stderr + String(chunk)).slice(-4000);
    });
    (worker as ChildProcess & { lastError?: () => string }).lastError = () => stderr;
    this.workers.push(worker);
    return worker;
  }

  private send(
    worker: ChildProcess,
    id: number,
    job: DiffJob,
    timeout: number
  ): Promise<DiffResult> {
    return new Promise((resolve, reject) => {
      const lastError = (): string =>
        (worker as ChildProcess & { lastError?: () => string }).lastError?.() ?? '';
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error(`timed out after ${timeout} ms`));
      }, timeout);
      const onMessage = (reply: WorkerReply): void => {
        if (reply.id !== id) return;
        cleanup();
        resolve(reply.result);
      };
      const onExit = (code: number | null): void => {
        cleanup();
        reject(new Error(`exited with ${code}: ${lastError()}`));
      };
      const cleanup = (): void => {
        clearTimeout(timer);
        worker.off('message', onMessage);
        worker.off('exit', onExit);
      };
      worker.on('message', onMessage);
      worker.on('exit', onExit);
      worker.send({ id, job });
    });
  }
}

/** The worker's side: answer each job with its result. */
export function serveWorker(): void {
  process.on('message', (message: { id: number; job: DiffJob }) => {
    void processJob(message.job).then(result => {
      process.send?.({ id: message.id, result } satisfies WorkerReply);
    });
  });
}

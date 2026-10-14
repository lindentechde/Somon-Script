/**
 * For pages that show the lessons and the playground with the learn kit
 * (dist/learn, built by scripts/build-learn.js): running a program in the
 * kit's Web Worker (dist/learn/worker.js) with a time limit, and checking a
 * program on the tests of a task, as the playground of this repository does
 * (playground/src/app.js).
 *
 * This module bundles nothing: the page makes the workers, from the URL where
 * it serves worker.js. The worker is a classic one (`new Worker(url)`, not
 * `{ type: 'module' }`): it runs the program with `importScripts`. One worker
 * runs one program; it is ended afterwards.
 */
import type { RunEvent, RunRequest } from '../playground/run';

export type { RunEvent, RunRequest, ShownProblem } from '../playground/run';
export type { TraceKind, TraceStep, TraceVariable } from '../runtime/trace';
export {
  ANIMATIONS,
  animationProblem,
  type AnimationName,
  type AnimationSpec,
  type StepAnimation,
} from './animations';

/** The version of the worker's events this client reads (`PROTOCOL` of src/playground/run.ts). */
export const PROTOCOL = 2;

/** The part of a Web Worker the client uses. */
export interface WorkerLike {
  postMessage(_request: RunRequest): void;
  terminate(): void;
  onmessage: ((_event: { data: RunEvent }) => void) | null;
  onerror: ((_event: { message?: string; preventDefault?(): void }) => void) | null;
}

export interface RunOptions {
  /** How long the program may run, in milliseconds, from when it has compiled (default 5000). */
  timeLimit?: number;
  /** Each event of the worker, as it comes. */
  onEvent?(_event: RunEvent): void;
}

/** How a run ended. */
export type RunOutcome =
  | 'done'
  | 'notCompiled'
  | 'runtimeError'
  /** It ran longer than the time limit and was stopped. */
  | 'timeout'
  /** The page stopped it (`stop()`). */
  | 'stopped'
  /** The worker could not start or failed. */
  | 'crashed';

export interface RunResult {
  outcome: RunOutcome;
  /** Every event of the worker, in order. */
  events: RunEvent[];
  /** What the program printed, its lines joined. */
  output: string;
  /** The steps, when the request asked for `trace`. */
  trace?: Extract<RunEvent, { type: 'trace' }>;
  /** The worker's own error, for `crashed`. */
  error?: string;
}

export interface Run {
  result: Promise<RunResult>;
  /** Ends the program now; its result is `stopped`. */
  stop(): void;
}

/** Runs a program in a new worker; the worker is ended when the program ends. */
export function runInWorker(
  createWorker: () => WorkerLike,
  request: RunRequest,
  options: RunOptions = {}
): Run {
  const events: RunEvent[] = [];
  // Set by the promise's executor, which runs at once
  let finish!: (_outcome: RunOutcome, _error?: string) => void;
  const result = new Promise<RunResult>(resolve => {
    let worker: WorkerLike | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let ended = false;
    finish = (outcome, error) => {
      if (ended) return;
      ended = true;
      if (timer !== undefined) clearTimeout(timer);
      worker?.terminate();
      const output = events.flatMap(event => (event.type === 'output' ? [event.text] : []));
      const trace = events.find(event => event.type === 'trace') as RunResult['trace'];
      resolve({
        outcome,
        events,
        output: output.join('\n'),
        ...(trace && { trace }),
        ...(error !== undefined && { error }),
      });
    };
    try {
      worker = createWorker();
    } catch (error) {
      finish('crashed', String((error as Error)?.message ?? error));
      return;
    }
    worker.onmessage = ({ data: event }) => {
      if (ended) return;
      events.push(event);
      options.onEvent?.(event);
      if (event.type === 'compiled') {
        timer = setTimeout(() => finish('timeout'), options.timeLimit ?? 5000);
      } else if (event.type === 'notCompiled') {
        finish('notCompiled');
      } else if (event.type === 'done') {
        finish(events.some(seen => seen.type === 'runtimeError') ? 'runtimeError' : 'done');
      }
    };
    worker.onerror = event => {
      event.preventDefault?.();
      finish('crashed', event.message ?? 'The worker failed');
    };
    worker.postMessage(request);
  });
  return { result, stop: () => finish('stopped') };
}

/** What a program printed, as it is compared: no spaces at line ends, no empty lines at the end. */
export function normalize(printed: string): string {
  return printed
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(line => line.replace(/\s+$/, ''))
    .join('\n')
    .replace(/\n+$/, '');
}

/** A test of a task: its input and what the program must print (tasks.json). */
export interface TaskTest {
  i: string;
  o: string;
}

/** How a program did on one test. */
export interface TestResult {
  passed: boolean;
  /** The input, what was expected and what the program printed. */
  input: string;
  expected: string;
  printed: string;
  outcome: RunOutcome;
  /** The runtime error, as the worker formatted it, and its line. */
  error?: { text: string; line?: number };
}

export interface CheckResult {
  /** All tests passed. */
  passed: boolean;
  /** The program did not compile: the event with its diagnostics; no test ran. */
  notCompiled?: Extract<RunEvent, { type: 'notCompiled' }>;
  tests: TestResult[];
}

export interface CheckOptions extends RunOptions {
  /** After each test, for a page that reports them one by one. */
  onTest?(_result: TestResult, _index: number): void;
  /** Whether to go on: false stops before the next test. */
  shouldContinue?(): boolean;
}

/**
 * Runs the program on each test in turn, each in a new worker, and compares
 * what it prints with what the test expects. It stops at a compile error.
 */
export async function checkTask(
  createWorker: () => WorkerLike,
  request: Omit<RunRequest, 'input' | 'trace'>,
  tests: readonly TaskTest[],
  options: CheckOptions = {}
): Promise<CheckResult> {
  const results: TestResult[] = [];
  for (const [index, test] of tests.entries()) {
    if (options.shouldContinue && !options.shouldContinue()) break;
    const run = await runInWorker(createWorker, { ...request, input: test.i }, options).result;
    const notCompiled = run.events.find(event => event.type === 'notCompiled');
    if (notCompiled) {
      return { passed: false, notCompiled: notCompiled as CheckResult['notCompiled'], tests: [] };
    }
    const error = run.events.find(event => event.type === 'runtimeError') as
      | Extract<RunEvent, { type: 'runtimeError' }>
      | undefined;
    const result: TestResult = {
      passed: run.outcome === 'done' && normalize(run.output) === normalize(test.o),
      input: test.i,
      expected: test.o,
      printed: run.output,
      outcome: run.outcome,
      ...(error && { error: { text: error.text, line: error.line } }),
    };
    results.push(result);
    options.onTest?.(result, index);
  }
  return {
    passed: results.length === tests.length && results.every(result => result.passed),
    tests: results,
  };
}

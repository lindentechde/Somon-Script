/**
 * The Web Worker of the playground (scripts/build-playground.js bundles it
 * into the page): runs one program the page sends (src/playground/run.ts) and
 * posts back what happens. The program is a script from a Blob URL, run with
 * `importScripts`, so that its stack frames give its lines in every browser.
 * The page ends the worker when the program is done or runs too long.
 */
import { runProgram, type RunEvent, type RunningProgram, type RunRequest } from './run';

/** The parts of a worker's global scope used here. */
interface WorkerScope {
  postMessage(_message: RunEvent): void;
  importScripts(..._urls: string[]): void;
  addEventListener(
    _type: 'error' | 'unhandledrejection',
    _listener: (_event: {
      preventDefault(): void;
      reason?: unknown;
      error?: unknown;
      message?: string;
    }) => void
  ): void;
  onmessage: ((_event: { data: RunRequest }) => void) | null;
  setTimeout(_callback: () => void, _ms?: number): unknown;
  clearTimeout(_id: unknown): void;
  setInterval(_callback: () => void, _ms?: number): unknown;
  clearInterval(_id: unknown): void;
}

// The bundle defines `global` as the global object
const scope = global as unknown as WorkerScope;
// Taken before the program runs: it may declare names of its own
const post = scope.postMessage.bind(scope);
const timers = {
  setTimeout: scope.setTimeout.bind(scope),
  clearTimeout: scope.clearTimeout.bind(scope),
  setInterval: scope.setInterval.bind(scope),
  clearInterval: scope.clearInterval.bind(scope),
};
const importScripts = scope.importScripts.bind(scope);
let program: RunningProgram | undefined;

scope.addEventListener('unhandledrejection', event => {
  event.preventDefault();
  program?.fail(event.reason);
});
scope.addEventListener('error', event => {
  event.preventDefault();
  program?.fail(event.error ?? event.message);
});

scope.onmessage = event => {
  // One program per worker
  scope.onmessage = null;
  program = runProgram(event.data, {
    post,
    timers,
    scope: scope as unknown as Record<string, unknown>,
    script: code => {
      const file = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
      return { file, run: () => importScripts(file) };
    },
  });
};

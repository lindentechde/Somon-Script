/**
 * The console a program run in the playground prints with (`чоп`, `чоп.сабт`,
 * `чоп.хато`, …): values with SomonScript's names (src/runtime/format.ts), as
 * `somon run` prints them, sent to the page line by line.
 */
import { formatArgs, formatValue } from '../runtime/format';

/** Where printed text goes: the stream of `чоп.сабт` (log), `чоп.огоҳӣ` (warn) or `чоп.хато` (error). */
export type Print = (_stream: 'log' | 'warn' | 'error', _text: string) => void;

/** What `чоп.тасдиқ(шарт, …)` prints when the condition is false. */
const ASSERTION_FAILED = 'Тасдиқ нашуд';

export function createPlaygroundConsole(print: Print, now: () => number = Date.now) {
  let indent = '';
  const counts = new Map<string, number>();
  const timers = new Map<string, number>();
  const write = (stream: 'log' | 'warn' | 'error', args: unknown[]) => {
    const text = formatArgs(args);
    print(stream, indent === '' ? text : text.replace(/^/gm, indent));
  };
  const log = (...args: unknown[]) => write('log', args);
  const warn = (...args: unknown[]) => write('warn', args);
  const error = (...args: unknown[]) => write('error', args);
  const elapsed = (label: string) => `${label}: ${now() - (timers.get(label) ?? now())}ms`;

  return {
    log,
    info: log,
    debug: log,
    trace: log,
    warn,
    error,
    dir: (value: unknown) => write('log', [formatValue(value)]),
    table: (value: unknown) => write('log', [value]),
    assert(condition?: unknown, ...args: unknown[]) {
      if (condition) return;
      if (typeof args[0] === 'string') warn(`${ASSERTION_FAILED}: ${args[0]}`, ...args.slice(1));
      else warn(args.length > 0 ? `${ASSERTION_FAILED}:` : ASSERTION_FAILED, ...args);
    },
    group(...labels: unknown[]) {
      if (labels.length > 0) log(...labels);
      indent += '  ';
    },
    groupCollapsed(...labels: unknown[]) {
      this.group(...labels);
    },
    groupEnd() {
      indent = indent.slice(2);
    },
    count(label = 'default') {
      const count = (counts.get(label) ?? 0) + 1;
      counts.set(label, count);
      log(`${label}: ${count}`);
    },
    countReset(label = 'default') {
      counts.delete(label);
    },
    time(label = 'default') {
      timers.set(label, now());
    },
    timeLog(label = 'default', ...args: unknown[]) {
      log(elapsed(label), ...args);
    },
    timeEnd(label = 'default') {
      log(elapsed(label));
      timers.delete(label);
    },
    clear() {
      // The page keeps what was printed
    },
  };
}

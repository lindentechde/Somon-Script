/**
 * The run time `somon run` gives a program (src/runtime/node-prelude.ts loads
 * it before the program): the console prints values with SomonScript's names
 * (src/runtime/format.ts).
 */
import { inspect } from 'node:util';

import { formatArgs, type FormatOptions } from './format';

/** Console methods that print their arguments as `чоп.сабт` does. */
const PRINTING_METHODS = ['log', 'info', 'debug', 'warn', 'error'] as const;

/** What `чоп.тасдиқ(шарт, …)` prints when the condition is false ("Assertion failed"). */
const ASSERTION_FAILED = 'Тасдиқ нашуд';

const FORMAT_OPTIONS: FormatOptions = {
  // Typed arrays, Promise, …: as Node.js prints them
  fallback: value => inspect(value, { depth: 2 }),
};

type PrintingConsole = Pick<typeof console, (typeof PRINTING_METHODS)[number] | 'assert'>;

/**
 * Makes `target`'s printing methods format their arguments with SomonScript's
 * names. Each still prints through the original method, as one string, so
 * `чоп.гуруҳ` indentation and the output streams stay as they were.
 */
export function installTajikConsole(target: PrintingConsole = console): void {
  for (const method of PRINTING_METHODS) {
    const original = target[method].bind(target);
    target[method] = (...args: unknown[]): void => original(formatArgs(args, FORMAT_OPTIONS));
  }
  // As Node.js does, a failed assertion is a warning (on stderr)
  target.assert = (condition?: unknown, ...args: unknown[]): void => {
    if (condition) return;
    if (args.length === 0) {
      target.warn(ASSERTION_FAILED);
    } else if (typeof args[0] === 'string') {
      target.warn(`${ASSERTION_FAILED}: ${args[0]}`, ...args.slice(1));
    } else {
      target.warn(`${ASSERTION_FAILED}:`, ...args);
    }
  };
}

/**
 * `хондан()` and `хонданиРақам()`: a line, or a number, the learner types or
 * the input of the program holds (`somon run барнома.som < вуруд.txt`, the
 * playground's input field). They are synchronous, so that a learner reads
 * input as they print output, without `ҳамзамон`/`интизор`.
 *
 * - A line is returned without its line break (`\n` or `\r\n`).
 * - A number may be written with a decimal point or comma (`2.5`, `2,5`).
 *   What is no number is asked again when a person types the input, and is
 *   an error when the input comes from a file or the playground: it cannot be
 *   corrected there.
 * - At the end of the input both end the program with an error ("Вуруд тамом
 *   шуд"): there is no line to return.
 *
 * Where the input comes from is the host's business (src/runtime/node-input.ts
 * for Node.js); no Node.js API is used here.
 */
import { message, renderMessage } from '../diagnostics/catalog';
import type { DiagnosticLanguage } from '../diagnostics/types';

/**
 * The global the run time puts the input functions in; programs that read
 * input take them from it (see `INPUT_PROLOGUE` in src/codegen.ts).
 */
export const INPUT_GLOBAL = '__somonInput';

/** Where input comes from and prompts go. */
export interface InputHost {
  /** The next piece of the input, or null at its end. */
  read(): string | null;
  /** Prints a prompt, without a line break. */
  write(_text: string): void;
  /** A person types the input: a wrong number is asked again. */
  interactive: boolean;
}

/** The functions a program reads input with. */
export interface InputFunctions {
  хондан(_prompt?: unknown): string;
  хонданиРақам(_prompt?: unknown): number;
}

/**
 * The input ended, or a number was expected and something else came; its
 * message is English, src/runtime/errors.ts explains it in the learner's language.
 */
export class InputError extends Error {
  readonly kind: 'ended' | 'notNumber';
  /** The function that read: `хондан` or `хонданиРақам`. */
  readonly functionName: string;
  /** What came instead of a number. */
  readonly text: string;

  constructor(kind: 'ended' | 'notNumber', functionName: string, text = '') {
    super(
      kind === 'ended'
        ? `The input ended: ${functionName}() expected another line`
        : `'${text}' is not a number: ${functionName}() expected one`
    );
    this.name = 'InputError';
    this.kind = kind;
    this.functionName = functionName;
    this.text = text;
  }
}

/** A number as a learner may write it: `42`, `-3`, `2.5`, `2,5`. */
export function parseNumber(text: string): number | undefined {
  const trimmed = text.trim();
  if (!/^[-+]?(\d+([.,]\d*)?|[.,]\d+)(e[-+]?\d+)?$/i.test(trimmed)) return undefined;
  return Number(trimmed.replace(',', '.'));
}

/** `хондан` and `хонданиРақам` reading from `host`. */
export function createInput(host: InputHost, language: DiagnosticLanguage): InputFunctions {
  let buffered = '';
  let ended = false;

  const readLine = (functionName: string, prompt: unknown): string => {
    if (prompt !== undefined) host.write(String(prompt));
    for (;;) {
      const newline = buffered.indexOf('\n');
      if (newline !== -1) {
        const line = buffered.slice(0, newline);
        buffered = buffered.slice(newline + 1);
        return line.endsWith('\r') ? line.slice(0, -1) : line;
      }
      if (ended) {
        if (buffered === '') throw new InputError('ended', functionName);
        // The last line, without a line break after it
        const line = buffered;
        buffered = '';
        return line;
      }
      const piece = host.read();
      if (piece === null) ended = true;
      else buffered += piece;
    }
  };

  return {
    хондан: (prompt?: unknown): string => readLine('хондан', prompt),
    хонданиРақам: (prompt?: unknown): number => {
      for (;;) {
        const text = readLine('хонданиРақам', prompt);
        const value = parseNumber(text);
        if (value !== undefined) return value;
        if (!host.interactive) throw new InputError('notNumber', 'хонданиРақам', text.trim());
        host.write(
          `${renderMessage(message('INPUT_ASK_AGAIN', { text: text.trim() }), language)}\n`
        );
      }
    },
  };
}

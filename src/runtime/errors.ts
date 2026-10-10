/**
 * What an error of a running program is about, in SomonScript's words: the
 * JavaScript engine's message ("Cannot read properties of undefined
 * (reading 'length')") read into a message of the diagnostics catalog, with
 * JavaScript's names given back their Tajik ones (`length` → `дарозӣ`,
 * `console` → `чоп`). The place in the `.som` file comes from the stack of
 * the error (`locateError`), which Node.js maps through the source map.
 *
 * No Node.js API is used: the playground explains errors with it too.
 */
import { BUILTIN_MAPPINGS, MEMBER_ALIASES } from '../builtin-names';
import { message } from '../diagnostics/catalog';
import type { DiagnosticMessage } from '../diagnostics/types';
import { formatValue } from './format';

/** An error explained: its message and, where it helps, a hint. */
export interface ExplainedError {
  message: DiagnosticMessage;
  hint?: DiagnosticMessage;
}

/** JavaScript names of built-ins and the Tajik names a program writes for them. */
const TAJIK_NAMES: ReadonlyMap<string, string> = (() => {
  const names = new Map<string, string>([
    ['console', 'чоп'],
    ['Math', 'математика'],
    ['Object', 'объект'],
    ['Array', 'рӯйхат'],
    ['String', 'сатр'],
    ['Promise', 'Ваъда'],
    ['Error', 'Хато'],
  ]);
  for (const [tajik, js] of BUILTIN_MAPPINGS) {
    if (MEMBER_ALIASES.has(tajik) && !names.has(js)) names.set(js, tajik);
  }
  return names;
})();

/** `console.log` → `чоп.сабт`, `р.length` → `р.дарозӣ`; other names stay. */
export function tajikNames(text: string): string {
  return text.replace(/[\p{L}_$][\p{L}\p{N}_$]*/gu, name => TAJIK_NAMES.get(name) ?? name);
}

/** `undefined` → `беқимат`, `null` → `холӣ`. */
function valueName(value: string): string {
  return value === 'null' ? 'холӣ' : 'беқимат';
}

/** Messages of the engine (V8, and the wording of other engines where it differs). */
const PATTERNS: ReadonlyArray<{
  test: RegExp;
  explain: (_match: RegExpExecArray) => ExplainedError;
}> = [
  {
    // V8: Cannot read properties of undefined (reading 'length'); Firefox: x is undefined
    test: /^Cannot read propert(?:y|ies) of (undefined|null)(?: \(reading '(.*)'\))?/,
    explain: match => ({
      message: message('RUNTIME_READ_OF_NOTHING', {
        property: tajikNames(match[2] ?? '?'),
        value: valueName(match[1]),
      }),
      hint: message('CHECK_VALUE', { value: valueName(match[1]) }),
    }),
  },
  {
    test: /^Cannot set propert(?:y|ies) of (undefined|null)(?: \(setting '(.*)'\))?/,
    explain: match => ({
      message: message('RUNTIME_WRITE_TO_NOTHING', {
        property: tajikNames(match[2] ?? '?'),
        value: valueName(match[1]),
      }),
      hint: message('CHECK_VALUE', { value: valueName(match[1]) }),
    }),
  },
  {
    test: /^(.+) is not defined$/,
    explain: match => ({ message: message('RUNTIME_NOT_DEFINED', { name: tajikNames(match[1]) }) }),
  },
  {
    test: /^Cannot access '(.+)' before initialization$/,
    explain: match => ({
      message: message('RUNTIME_BEFORE_DECLARATION', { name: tajikNames(match[1]) }),
      hint: message('DECLARE_BEFORE_USE'),
    }),
  },
  {
    test: /^(.+) is not a function$/,
    explain: match => ({
      message: message('RUNTIME_NOT_A_FUNCTION', { name: tajikNames(match[1]) }),
    }),
  },
  {
    test: /^(.+) is not a constructor$/,
    explain: match => ({
      message: message('RUNTIME_NOT_A_CONSTRUCTOR', { name: tajikNames(match[1]) }),
    }),
  },
  {
    test: /^(.+) is not iterable$/,
    explain: match => ({
      message: message('RUNTIME_NOT_ITERABLE', { name: tajikNames(match[1]) }),
    }),
  },
  {
    test: /^Maximum call stack size exceeded$|^too much recursion$/,
    explain: () => ({
      message: message('RUNTIME_STACK_OVERFLOW'),
      hint: message('STOP_CONDITION'),
    }),
  },
  {
    test: /^Invalid array length$/,
    explain: () => ({ message: message('RUNTIME_INVALID_ARRAY_LENGTH') }),
  },
  {
    test: /^Assignment to constant variable\.?$/,
    explain: () => ({ message: message('RUNTIME_CONST_ASSIGNMENT') }),
  },
];

/** Errors of the engine; anything else a program throws is its own. */
const ENGINE_ERRORS: ReadonlySet<string> = new Set([
  'TypeError',
  'ReferenceError',
  'RangeError',
  'SyntaxError',
  'InternalError',
]);

/**
 * What `thrown` is about. The engine's errors are explained; what the program
 * throws itself (`партофтан нав Хато("…")`, or any value) keeps its message.
 */
export function explainError(thrown: unknown): ExplainedError {
  if (!(thrown instanceof Error) && !isErrorLike(thrown)) {
    return { message: message('RUNTIME_THROWN', { message: formatValue(thrown) }) };
  }
  const { name, message: text } = thrown as Error;
  if (ENGINE_ERRORS.has(name)) {
    for (const pattern of PATTERNS) {
      const match = pattern.test.exec(text);
      if (match) return pattern.explain(match);
    }
    return {
      message: message('RUNTIME_ERROR', { name, message: text }),
      hint: message('SHOW_STACK'),
    };
  }
  // Node.js's own errors (`ENOENT: no such file …`) carry a code; the program's do not
  if (typeof (thrown as { code?: unknown }).code === 'string') {
    return {
      message: message('RUNTIME_ERROR', { name, message: text }),
      hint: message('SHOW_STACK'),
    };
  }
  return { message: message('RUNTIME_THROWN', { message: text }) };
}

/** An error of another realm (a worker, a vm context): its own Error class. */
function isErrorLike(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Error).name === 'string' &&
    typeof (value as Error).message === 'string' &&
    typeof (value as Error).stack === 'string'
  );
}

/** A place in a `.som` file named by a stack. */
export interface ErrorLocation {
  /** As the stack names it: a path or a `file://` URL. */
  file: string;
  line: number;
  column: number;
  /** The function the stack names there, if any: `ф` of `at ф (…)`. */
  functionName?: string;
}

/**
 * The first place a stack names (`at ф (/дар/барнома.som:2:15)`) in a `.som`
 * file, or in the file `file` when given (the playground's program).
 */
export function locateError(stack: string, file?: string): ErrorLocation | undefined {
  for (const line of stack.split('\n')) {
    const frame = /^\s*at (?:(.*?) \()?(.+?):(\d+):(\d+)\)?$/.exec(line);
    if (frame && (frame[2].endsWith('.som') || frame[2] === file)) {
      const location: ErrorLocation = {
        file: frame[2],
        line: Number(frame[3]),
        column: Number(frame[4]),
      };
      // `Object.барнома.som` is a module of the bundle, not a function
      const functionName = frame[1]?.endsWith('.som') ? undefined : frame[1]?.split('.').pop();
      if (functionName && /^[\p{L}_$][\p{L}\p{N}_$]*$/u.test(functionName)) {
        location.functionName = functionName;
      }
      return location;
    }
  }
  return undefined;
}

/**
 * The column of the name an explained error is about on its line of code, at
 * or after `column` (source maps name the statement): `дарозӣ` of
 * `р[10].дарозӣ`, the callee of a call, the function of endless recursion.
 * `column` when the line does not have it.
 */
export function columnOfName(
  code: string,
  column: number,
  explained: ExplainedError,
  functionName?: string
): number {
  const params = explained.message.params;
  // Endless recursion: the call of the function the stack names
  const called = explained.message.id === 'RUNTIME_STACK_OVERFLOW' ? functionName : undefined;
  const name = String(params.property ?? params.name ?? called ?? '');
  // `чоп.сабтт` is not a function: its last part is on the line
  const last = name.split('.').pop()!;
  if (last === '' || last === '?') return column;
  const index = code.indexOf(last, column - 1);
  return index === -1 ? column : index + 1;
}

/** Whether a line of code reads an element by index just before `column`: `р[10].дарозӣ`. */
export function readsByIndex(code: string, column: number): boolean {
  return /\]\s*\.?\s*$/.test(code.slice(0, Math.max(column - 1, 0)));
}

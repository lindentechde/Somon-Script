/**
 * The steps of a program compiled with `trace: true` (src/trace-generator.ts),
 * for the playground and the lessons to replay: before each statement and at
 * each test of a condition or loop, the line about to run, the variables the
 * program sees there with their values, the call depth and how much it has
 * printed so far.
 *
 * The program calls the tracer by the global `__somonTrace` (`TRACE_GLOBAL`):
 * `names(table)` once, then `step(line, names, getters)`, and `enter(name)` /
 * `exit()` around the calls of its functions. Each getter reads one variable;
 * one that throws is a variable whose declaration has not run yet, which is
 * left out. Values are kept as text, as the program would print them inside
 * an array (src/runtime/format.ts), with the items of arrays and the fields of
 * objects for the animations.
 *
 * Tracing stops after `maxSteps` steps or `maxBytes` of text: the program goes
 * on untraced, and the steps so far are what the page replays (`full`).
 */
import { inspect } from './format';

/** The global the traced program calls. */
export const TRACE_GLOBAL = '__somonTrace';

/** What a value is, for how a page draws it. */
export type TraceKind =
  | 'number'
  | 'string'
  | 'boolean'
  | 'null'
  | 'undefined'
  | 'array'
  | 'object'
  | 'other';

/** A variable at one step. */
export interface TraceVariable {
  /** Its name in the source. */
  n: string;
  t: TraceKind;
  /** The value as text: strings in quotes, `дуруст`, `[ 1, 2 ]`, … */
  s: string;
  /** Of an array: its first items, as text. */
  a?: string[];
  /** Of a plain object: its first fields and their values, as text. */
  k?: Array<[string, string]>;
  /** Declared outside the function the step is in (1); absent for its own variables. */
  g?: 1;
}

/** One step of the program. */
export interface TraceStep {
  /** The source line about to run; 0 when the top level of the program has run to its end. */
  l: number;
  /** How many calls of the program's functions are running. */
  d: number;
  /** The name of the function the step is in ('' for one without a name); absent at the top level. */
  f?: string;
  /** The variables the program sees, outer ones first. */
  v: TraceVariable[];
  /** How many times the program had printed before this step (its `output` events). */
  o: number;
  /** The program stopped with an error here (1); the page shows the error it was told. */
  e?: 1;
}

export interface TraceOptions {
  /** Steps recorded at most (default 2000). */
  maxSteps?: number;
  /** Characters of values recorded at most (default 500 000). */
  maxBytes?: number;
  /** How many times the program has printed so far. */
  printed(): number;
  /** Called once when the limit is reached and recording stops. */
  full?(): void;
}

/** Longest text of a value; longer ones end with '…'. */
const MAX_TEXT = 80;
/** Longest text of an item of an array or a field of an object. */
const MAX_ITEM_TEXT = 40;
const MAX_ITEMS = 20;
const MAX_FIELDS = 12;

/**
 * A table entry of the program (`names`): how many of the names are declared
 * outside the current function, then the names, in the order of the getters.
 */
type NameEntry = [number, ...string[]];

export class Tracer {
  /** Whether steps are still recorded: the program checks it before each call. */
  on = true;
  readonly steps: TraceStep[] = [];
  /** Recording stopped at a limit. */
  truncated = false;
  private table: NameEntry[] = [];
  private readonly frames: string[] = [];
  private bytes = 0;
  private readonly maxSteps: number;
  private readonly maxBytes: number;
  private readonly options: TraceOptions;

  constructor(options: TraceOptions) {
    this.options = options;
    this.maxSteps = options.maxSteps ?? 2000;
    this.maxBytes = options.maxBytes ?? 500_000;
  }

  /** The names of the getters of each step (`step(line, index, …)` indexes this table). */
  names(table: NameEntry[]): void {
    this.table = table;
  }

  step(line: number, names: number, getters: Array<() => unknown>): void {
    if (!this.on) return;
    const [outer, ...entry] = this.table[names];
    const variables: TraceVariable[] = [];
    getters.forEach((getter, index) => {
      let value: unknown;
      try {
        value = getter();
      } catch {
        // Declared further down: not a variable yet
        return;
      }
      // Functions and classes are what the program does, not what it holds
      if (typeof value === 'function') return;
      const variable = describe(entry[index], value);
      if (index < outer) variable.g = 1;
      this.bytes += size(variable);
      variables.push(variable);
    });
    const step: TraceStep = {
      l: line,
      d: this.frames.length,
      v: variables,
      o: this.options.printed(),
    };
    if (this.frames.length > 0) step.f = this.frames[this.frames.length - 1];
    this.steps.push(step);
    if (this.steps.length >= this.maxSteps || this.bytes >= this.maxBytes) this.stop();
  }

  /** A call of the program's function `name` begins. */
  enter(name: string): void {
    this.frames.push(name);
  }

  /** The call that began last ends, by returning or throwing. */
  exit(): void {
    this.frames.pop();
  }

  /**
   * The program stopped with an error at `line` (when it is known): the last
   * step again, marked, with what it had printed by then.
   */
  error(line?: number): void {
    const last = this.steps[this.steps.length - 1];
    if (!last || this.truncated) return;
    this.steps.push({ ...last, l: line ?? last.l, o: this.options.printed(), e: 1 });
  }

  private stop(): void {
    this.on = false;
    this.truncated = true;
    this.options.full?.();
  }
}

function describe(name: string, value: unknown): TraceVariable {
  const variable: TraceVariable = { n: name, t: kindOf(value), s: text(value, 2, MAX_TEXT) };
  if (Array.isArray(value)) {
    variable.a = value.slice(0, MAX_ITEMS).map(item => text(item, 1, MAX_ITEM_TEXT));
  } else if (variable.t === 'object' && isPlainObject(value)) {
    variable.k = fields(value as object);
  }
  return variable;
}

function kindOf(value: unknown): TraceKind {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  switch (typeof value) {
    case 'number':
    case 'string':
    case 'boolean':
    case 'undefined':
      return typeof value as TraceKind;
    case 'object':
      return 'object';
    default:
      return 'other';
  }
}

function isPlainObject(value: unknown): boolean {
  const prototype = Object.getPrototypeOf(value) as unknown;
  return prototype === Object.prototype || prototype === null;
}

/** The first own fields of an object; a field with a getter is not read. */
function fields(value: object): Array<[string, string]> {
  return Object.keys(value)
    .slice(0, MAX_FIELDS)
    .map(key => {
      const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
      const shown = 'value' in descriptor ? text(descriptor.value, 1, MAX_ITEM_TEXT) : '…';
      return [key, shown];
    });
}

/** A value as one line of at most `max` characters. */
function text(value: unknown, depth: number, max: number): string {
  const line = inspect(value, { depth }).replace(/\s*\n\s*/g, ' ');
  return line.length > max ? `${line.slice(0, max - 1)}…` : line;
}

function size(variable: TraceVariable): number {
  let total = variable.n.length + variable.s.length;
  variable.a?.forEach(item => (total += item.length));
  variable.k?.forEach(([key, value]) => (total += key.length + value.length));
  return total;
}

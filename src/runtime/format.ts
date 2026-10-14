/**
 * How `чоп(…)` and `чоп.сабт(…)` print values when a program runs with
 * `somon run` or in the playground: with SomonScript's own names, so the
 * learner who writes `дуруст` reads `дуруст`, not `true`.
 *
 *   дуруст, нодуруст, холӣ, беқимат   (true, false, null, undefined)
 *   ғайрирақам, беохир, -беохир        (NaN, Infinity, -Infinity)
 *
 * Strings print as they are at the top level and in double quotes inside
 * arrays and objects; arrays, objects, Map and Set look much as Node.js prints
 * them. Format strings (`чоп.сабт("%s: %d", а, б)`) work as in Node.js.
 *
 * No Node.js API is used: the browser bundle includes this module. Values the
 * formatter does not know (typed arrays, Promise, …) go to `fallback`.
 */

/** SomonScript names of JavaScript's special values (docs/glossary.tj.md). */
export const VALUE_NAMES = {
  true: 'дуруст',
  false: 'нодуруст',
  null: 'холӣ',
  undefined: 'беқимат',
  NaN: 'ғайрирақам',
  Infinity: 'беохир',
} as const;

/** Words the formatter prints around values. */
const WORDS = {
  function: 'функсия',
  class: 'синф',
  circular: 'даврӣ',
  array: 'рӯйхат',
  object: 'объект',
  emptyItems: (count: number) => `<${count} ҷои холӣ>`,
  moreItems: (count: number) => `... боз ${count} унсур`,
  getter: 'ҳисобшаванда',
};

export interface FormatOptions {
  /** How deep nested arrays and objects are shown (default 6). */
  depth?: number;
  /** Prints values the formatter does not know; `Object.prototype.toString` by default. */
  fallback?: (_value: unknown) => string;
}

/** The line a console call prints for its arguments. */
export function formatArgs(args: readonly unknown[], options: FormatOptions = {}): string {
  if (typeof args[0] === 'string' && args.length > 1 && args[0].includes('%')) {
    return formatWithSpecifiers(args[0], args.slice(1), options);
  }
  return args.map(arg => formatValue(arg, options)).join(' ');
}

/** One value as `чоп.сабт` prints it on its own: a string as it is. */
export function formatValue(value: unknown, options: FormatOptions = {}): string {
  return typeof value === 'string' ? value : inspect(value, options);
}

/** A value as it appears inside an array or object: a string in quotes. */
export function inspect(value: unknown, options: FormatOptions = {}): string {
  const context: Context = {
    depth: options.depth ?? 6,
    fallback: options.fallback ?? defaultFallback,
    seen: [],
  };
  return inspectAt(value, context, 0);
}

interface Context {
  depth: number;
  fallback: (_value: unknown) => string;
  /** Objects being printed, outermost first: one of them again is a cycle. */
  seen: object[];
}

/** Longest line printed on one line; longer ones are broken up as Node.js does. */
const BREAK_LENGTH = 72;
/** Array elements shown before `... боз N унсур`. */
const MAX_ARRAY_ITEMS = 100;

function inspectAt(value: unknown, context: Context, level: number): string {
  if (value === null || (typeof value !== 'object' && typeof value !== 'function')) {
    return primitive(value);
  }
  if (typeof value === 'function') return functionName(value);
  if (context.seen.includes(value)) return `[${WORDS.circular}]`;
  const special = specialObject(value, context);
  if (special !== undefined) return special;
  if (level > context.depth) return Array.isArray(value) ? `[${WORDS.array}]` : `[${WORDS.object}]`;

  context.seen.push(value);
  try {
    return container(value, context, level);
  } finally {
    context.seen.pop();
  }
}

function primitive(value: unknown): string {
  switch (typeof value) {
    case 'string':
      return quote(value);
    case 'number':
      return formatNumber(value);
    case 'bigint':
      return `${value}n`;
    case 'boolean':
      return value ? VALUE_NAMES.true : VALUE_NAMES.false;
    case 'undefined':
      return VALUE_NAMES.undefined;
    case 'symbol':
      return value.toString();
    default:
      return VALUE_NAMES.null;
  }
}

/** `NaN` → `ғайрирақам`, `-Infinity` → `-беохир`, `-0` → `-0`, others as JavaScript prints them. */
export function formatNumber(value: number): string {
  if (Number.isNaN(value)) return VALUE_NAMES.NaN;
  if (value === Infinity) return VALUE_NAMES.Infinity;
  if (value === -Infinity) return `-${VALUE_NAMES.Infinity}`;
  if (Object.is(value, -0)) return '-0';
  return String(value);
}

/** A string in double quotes, as SomonScript programs write them. */
function quote(text: string): string {
  return JSON.stringify(text);
}

function functionName(fn: unknown): string {
  const callable = fn as { name?: unknown };
  const name = typeof callable.name === 'string' ? callable.name : '';
  const isClass = /^class[\s{]/.test(Function.prototype.toString.call(fn));
  const word = isClass ? WORDS.class : WORDS.function;
  return name ? `[${word} ${name}]` : `[${word}]`;
}

/** Dates, errors and regular expressions print as one piece; undefined for other objects. */
function specialObject(value: object, context: Context): string | undefined {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? String(value) : value.toISOString();
  }
  if (value instanceof RegExp) return String(value);
  if (value instanceof Error) {
    // `Error` is spelt `Хато` in SomonScript; the stack is noise for a learner
    const name = value.name === 'Error' ? 'Хато' : value.name;
    return value.message ? `${name}: ${value.message}` : name;
  }
  if (isBoxedPrimitive(value)) return primitive(value.valueOf());
  if (!isPlainContainer(value)) return context.fallback(value);
  return undefined;
}

function isBoxedPrimitive(value: object): value is { valueOf(): unknown } {
  return value instanceof Number || value instanceof String || value instanceof Boolean;
}

/** Arrays, Map, Set and objects whose own properties are what they hold. */
function isPlainContainer(value: object): boolean {
  if (Array.isArray(value) || value instanceof Map || value instanceof Set) return true;
  if (ArrayBuffer.isView(value) || value instanceof Promise) return false;
  if (value instanceof WeakMap || value instanceof WeakSet) return false;
  return true;
}

function container(value: object, context: Context, level: number): string {
  const inner = (item: unknown): string => inspectAt(item, context, level + 1);
  if (Array.isArray(value)) return wrap('[', arrayItems(value, inner), ']', level);
  if (value instanceof Map) {
    const entries = [...value].map(([key, item]) => `${inner(key)} => ${inner(item)}`);
    return `Map(${value.size}) ${wrap('{', entries, '}', level)}`;
  }
  if (value instanceof Set) {
    return `Set(${value.size}) ${wrap('{', [...value].map(inner), '}', level)}`;
  }
  const items = objectItems(value, inner);
  const prefix = constructorPrefix(value);
  if (items.length === 0) return `${prefix}{}`;
  return `${prefix}${wrap('{', items, '}', level)}`;
}

/** Elements, with runs of holes as `<2 ҷои холӣ>` and at most 100 shown. */
function arrayItems(array: readonly unknown[], inner: (_item: unknown) => string): string[] {
  const items: string[] = [];
  let holes = 0;
  const shown = Math.min(array.length, MAX_ARRAY_ITEMS);
  for (let index = 0; index < shown; index++) {
    if (!(index in array)) {
      holes++;
      continue;
    }
    if (holes > 0) items.push(WORDS.emptyItems(holes));
    holes = 0;
    items.push(inner(array[index]));
  }
  if (holes > 0) items.push(WORDS.emptyItems(holes));
  if (array.length > shown) items.push(WORDS.moreItems(array.length - shown));
  return items;
}

/** `ном: "Алӣ"` for every own enumerable property, symbols included. */
function objectItems(value: object, inner: (_item: unknown) => string): string[] {
  const items: string[] = [];
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor?.enumerable) continue;
    const name = typeof key === 'symbol' ? `[${key.toString()}]` : propertyName(key);
    const shown = 'value' in descriptor ? inner(descriptor.value) : `[${WORDS.getter}]`;
    items.push(`${name}: ${shown}`);
  }
  return items;
}

/** Identifiers (Cyrillic ones included) as they are, other keys in quotes. */
function propertyName(key: string): string {
  return /^[\p{ID_Start}$_][\p{ID_Continue}$‌‍]*$/u.test(key) ? key : quote(key);
}

/** `Корбар ` for instances of a class; nothing for plain objects. */
function constructorPrefix(value: object): string {
  const prototype = Object.getPrototypeOf(value) as { constructor?: { name?: unknown } } | null;
  if (prototype === null || prototype === Object.prototype) return '';
  const name = prototype.constructor?.name;
  return typeof name === 'string' && name !== '' && name !== 'Object' ? `${name} ` : '';
}

/**
 * `{ а: 1, б: 2 }` on one line when it is short and nothing in it spans
 * lines; otherwise one item per line, or, for short items, as many per line
 * as fit.
 */
function wrap(open: string, items: string[], close: string, level: number): string {
  if (items.length === 0) return `${open}${close}`;
  const oneLine = `${open} ${items.join(', ')} ${close}`;
  const multiLine = items.some(item => item.includes('\n'));
  if (!multiLine && oneLine.length + level * 2 <= BREAK_LENGTH) return oneLine;

  // Nested containers are indented by the container around them
  const indent = '  ';
  const lines = !multiLine && items.every(item => item.length <= 16) ? fill(items, level) : items;
  const body = lines.map(line => `${indent}${line.replace(/\n/g, `\n${indent}`)}`).join(',\n');
  return `${open}\n${body}\n${close}`;
}

/** Short items several to a line, each line (indented for `level`) at most `BREAK_LENGTH` long. */
function fill(items: string[], level: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const item of items) {
    const next = line === '' ? item : `${line}, ${item}`;
    if (line !== '' && (level + 1) * 2 + next.length + 1 > BREAK_LENGTH) {
      lines.push(line);
      line = item;
    } else {
      line = next;
    }
  }
  lines.push(line);
  return lines;
}

/**
 * `%s`, `%d`, `%i`, `%f`, `%j`, `%o`, `%O`, `%c` and `%%` as Node.js's
 * `util.format` reads them; arguments left over are appended.
 */
function formatWithSpecifiers(
  format: string,
  args: readonly unknown[],
  options: FormatOptions
): string {
  let next = 0;
  const text = format.replace(/%([sdifjoOc%])/g, (match, letter: string) => {
    if (letter === '%') return '%';
    if (next >= args.length) return match;
    return specifier(letter, args[next++], options);
  });
  const rest = args.slice(next).map(arg => formatValue(arg, options));
  return [text, ...rest].join(' ');
}

function specifier(letter: string, arg: unknown, options: FormatOptions): string {
  switch (letter) {
    case 's':
      return formatValue(arg, options);
    case 'd':
    case 'i': {
      if (typeof arg === 'bigint') return `${arg}n`;
      if (typeof arg === 'symbol') return VALUE_NAMES.NaN;
      const number = Number(arg);
      return formatNumber(letter === 'i' ? Math.trunc(number) : number);
    }
    case 'f':
      return typeof arg === 'symbol'
        ? VALUE_NAMES.NaN
        : formatNumber(Number.parseFloat(String(arg)));
    case 'j':
      return json(arg);
    case 'c':
      return '';
    default:
      return inspect(arg, options);
  }
}

function json(value: unknown): string {
  try {
    return String(JSON.stringify(value));
  } catch {
    return `[${WORDS.circular}]`;
  }
}

function defaultFallback(value: unknown): string {
  return Object.prototype.toString.call(value);
}

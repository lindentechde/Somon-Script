/**
 * The explanatory animations a step of a lesson can name, with a comment in
 * its Markdown (docs/tutorial):
 *
 *   <!-- anim: variable-box {"focus": ["хол"]} -->
 *
 * The page that shows the lessons draws each one; most draw the trace of the
 * step's example (src/runtime/trace.ts), and their parameters only choose what
 * to show. scripts/build-learn.js checks each comment against this table.
 */

/** The type of a parameter; with `?` it may be left out. */
export type ParamType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'string[]'
  | 'number[]'
  | 'string?'
  | 'number?'
  | 'boolean?'
  | 'string[]?'
  | 'number[]?';

export interface AnimationSpec {
  /** What it shows, for the authors of lessons. */
  description: string;
  /** Its parameters and their types. */
  params: Readonly<Record<string, ParamType>>;
  /** It draws the trace of the step's example, which the step must then have. */
  trace: boolean;
}

export const ANIMATIONS = {
  'output-stream': {
    description: 'Each `чоп` adds a line to the screen, from the top down.',
    params: {},
    trace: true,
  },
  'error-catch': {
    description: 'Where an error is found: before the program runs, or while it runs.',
    params: {},
    trace: false,
  },
  'variable-box': {
    description: 'A variable as a box with a name: a value goes in, a new one replaces it.',
    params: { focus: 'string[]?' },
    trace: true,
  },
  'expression-eval': {
    description: 'An expression worked out one operation at a time: `2 + 3 * 4` → `2 + 12` → `14`.',
    params: { steps: 'string[]' },
    trace: false,
  },
  'input-queue': {
    description: 'The lines of the input wait in a queue; each `хондан()` takes the first.',
    params: {},
    trace: true,
  },
  remainder: {
    description: '`а % б`: `а` things put in groups of `б`; what is left over.',
    params: { a: 'number', b: 'number' },
    trace: false,
  },
  'compare-scale': {
    description: 'Two values on a scale; the comparison gives `дуруст` or `нодуруст`.',
    params: {},
    trace: true,
  },
  'if-branch': {
    description: 'The road forks at `агар`: the test decides which way the program goes.',
    params: {},
    trace: true,
  },
  'if-chain': {
    description:
      'The tests of `агар … вагарна агар … вагарна` checked from the top until one holds.',
    params: {},
    trace: true,
  },
  'logic-gates': {
    description: '`&&`, `||` and `!` on `дуруст` and `нодуруст`.',
    params: {},
    trace: false,
  },
  'loop-counter': {
    description: 'A loop goes round: its counter grows, its body runs again, a total adds up.',
    params: { counter: 'string?', total: 'string?' },
    trace: true,
  },
  'while-loop': {
    description: '`то`: the test is a gate checked before each round; `шикастан` is a door out.',
    params: {},
    trace: true,
  },
  'nested-grid': {
    description: 'A loop inside a loop fills a grid, row by row.',
    params: { rows: 'string?', cols: 'string?' },
    trace: true,
  },
  'function-machine': {
    description: 'A function as a machine: values go in, a result comes out.',
    params: { name: 'string?' },
    trace: true,
  },
  'function-call': {
    description: 'A call goes into the function and its `бозгашт` value comes back, call by call.',
    params: {},
    trace: true,
  },
  'array-cells': {
    description: 'A list as a row of numbered cells.',
    params: { array: 'string?' },
    trace: true,
  },
  'array-ops': {
    description: 'Searching, sorting, `харита` and `филтр` on a row of cells.',
    params: { array: 'string?' },
    trace: true,
  },
  'string-cells': {
    description: 'A string as a row of letters with their indexes.',
    params: { string: 'string?' },
    trace: true,
  },
  'object-card': {
    description: 'An object as a card of fields and their values.',
    params: { object: 'string?' },
    trace: true,
  },
} as const satisfies Readonly<Record<string, AnimationSpec>>;

export type AnimationName = keyof typeof ANIMATIONS;

/** An animation a step names. */
export interface StepAnimation {
  name: AnimationName;
  params: Record<string, unknown>;
}

function hasType(value: unknown, type: string): boolean {
  if (type.endsWith('[]')) {
    const item = type.slice(0, -2);
    return Array.isArray(value) && value.every(element => typeof element === item);
  }
  return typeof value === type;
}

/** What is wrong with an animation a step names, or undefined. */
export function animationProblem(
  name: string,
  params: Record<string, unknown>
): string | undefined {
  if (!Object.prototype.hasOwnProperty.call(ANIMATIONS, name)) {
    return `unknown animation '${name}' (src/learn/animations.ts)`;
  }
  const spec: AnimationSpec = ANIMATIONS[name as AnimationName];
  for (const key of Object.keys(params)) {
    if (!(key in spec.params)) return `animation '${name}' has no parameter '${key}'`;
  }
  for (const [key, declared] of Object.entries(spec.params)) {
    const optional = declared.endsWith('?');
    const type = optional ? declared.slice(0, -1) : declared;
    if (!(key in params)) {
      if (optional) continue;
      return `animation '${name}' needs the parameter '${key}'`;
    }
    if (!hasType(params[key], type)) return `parameter '${key}' of '${name}' must be ${type}`;
  }
  return undefined;
}

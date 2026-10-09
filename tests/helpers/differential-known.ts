/**
 * Every known difference between SomonScript and TypeScript that the
 * differential test (tests/differential.test.ts) finds, with the reason it is
 * accepted. The test fails on a difference that is not listed here, and on an
 * entry that no longer differs, so this list stays exact: fix a difference or
 * explain it here.
 */
import type { Disagreement } from './differential';

/** Why a difference is accepted. */
export interface Known {
  reason: string;
}

/**
 * Programs whose paths (A: `compile()`, B: the TypeScript emitter and
 * `ts.transpileModule`, C: the original TypeScript) print differently in the
 * listed cells: `target/format`, where `*` stands for every target or every
 * format (`es5/*`), and `*` alone for every cell.
 */
export const KNOWN_PATH_DIFFERENCES: Readonly<Record<string, Known & { cells: string[] }>> = {
  'ts-syntax-codegen.test.ts:43': {
    cells: ['*'],
    reason:
      'imports a module that does not exist, with bindings it never uses. SomonScript keeps ' +
      'the import, so the module still runs (as with verbatimModuleSyntax); ' +
      "ts.transpileModule's default drops an import whose bindings are unused",
  },
  'ts-syntax-codegen.test.ts:216': {
    cells: ['*/cjs'],
    reason:
      '`ворид м = require("./м")` of a missing module, never used: SomonScript requires it, ' +
      'TypeScript drops unused import-equals declarations',
  },
  'ts-syntax-parser.test.ts:528': {
    cells: ['*/cjs'],
    reason:
      'the unused alias `ворид ф = Н.Д.ф` names an undeclared namespace (TS2503): SomonScript ' +
      'evaluates the alias, TypeScript drops unused aliases',
  },
  'ts-syntax-parser.test.ts:494': {
    cells: ['*/cjs'],
    reason:
      '`содир { навъ Т, х }` exports the undeclared `х` (TS2304): SomonScript reads it, ' +
      'TypeScript drops an export it cannot resolve to a value',
  },
  'ts-syntax-codegen.test.ts:356': {
    cells: ['es2015/esm', 'es2017/esm', 'es2020/esm', 'es2022/esm', 'esnext/esm'],
    reason: 'BUG: the second declaration of a merged exported namespace is `export (function …)`',
  },
  'migrate/38-errors.ts': {
    cells: ['es5/cjs', 'es5/esm'],
    reason:
      'subclasses of built-ins (`class ValidationError extends Error`): on es5 SomonScript ' +
      "restores their prototype, so `instanceof` works as on every other target; TypeScript's " +
      'es5 output breaks it',
  },
};

/**
 * Programs whose output depends on the target or the module format, alike in
 * every path: the cells whose output differs from the reference cell
 * (es2022, CommonJS).
 */
export const KNOWN_CELL_DIFFERENCES: Readonly<Record<string, Known & { cells: string[] }>> = {
  'ts-syntax-checker.test.ts:269': {
    cells: ['*/esm'],
    reason:
      'calls a function that uses `ин` without a receiver: `undefined` in an ES module (strict), ' +
      'the global object in a CommonJS script',
  },
  'ts-syntax-parser.test.ts:494': {
    cells: ['*/esm'],
    reason: 'exporting an undeclared name is a link error in an ES module',
  },
  'migrate/44-object-literals.ts': {
    cells: ['es5/cjs', 'es5/esm'],
    reason:
      "TypeScript's es5 lowering of an object literal with computed keys defines its " +
      'accessors as non-enumerable, so `Object.keys` leaves them out',
  },
  'migrate/48-class-expressions.ts': {
    cells: ['es5/cjs', 'es5/esm'],
    reason: "TypeScript's es5 lowering names an anonymous class expression (`class_2`)",
  },
};

/**
 * Programs on which the SomonScript checker and the TypeScript checker
 * disagree, in default and/or strict mode: `somon-only` when only SomonScript
 * reports errors, `typescript-only` when only TypeScript does.
 */
export const KNOWN_VERDICT_DISAGREEMENTS: Readonly<
  Record<string, Known & { default?: Disagreement; strict?: Disagreement }>
> = {
  // TypeScript is stricter by design
  'operators: equality == != === !==': {
    default: 'typescript-only',
    strict: 'typescript-only',
    reason: 'TS2367: TypeScript rejects comparing types without overlap (`1 == "1"`)',
  },
  'migrate/03-comparison-logic.ts': {
    default: 'typescript-only',
    strict: 'typescript-only',
    reason: 'TS2367: TypeScript rejects comparing types without overlap',
  },
  'operators: comma': {
    default: 'typescript-only',
    strict: 'typescript-only',
    reason: 'TS2695: TypeScript rejects a comma operator whose left side has no side effects',
  },
  'ts-syntax-behaviour.test.ts:451': {
    default: 'typescript-only',
    strict: 'typescript-only',
    reason: 'TS2775: TypeScript needs an explicit type on the target of an assertion call',
  },
  'ts-syntax-parser.test.ts:561': {
    default: 'typescript-only',
    strict: 'typescript-only',
    reason: 'TS2637: TypeScript allows `in`/`out` only on type aliases of object types',
  },
  'ts-syntax-parser.test.ts:762': {
    default: 'typescript-only',
    strict: 'typescript-only',
    reason: "TS2413: TypeScript checks a number index signature against the string one's type",
  },
  'ts-syntax-parser.test.ts:555': {
    default: 'typescript-only',
    strict: 'typescript-only',
    reason:
      'TS2309: TypeScript allows no other exports, even type exports, next to `содир =`; ' +
      'SomonScript only rejects value exports there',
  },
  'ts-syntax-parser.test.ts:828': {
    default: 'typescript-only',
    strict: 'typescript-only',
    reason:
      'TS2300: an interface property and method of the same name; the SomonScript checker ' +
      'does not look for duplicate interface members',
  },
  'ts-syntax-parser.test.ts:202': {
    strict: 'typescript-only',
    reason:
      'TS2564 (strictPropertyInitialization): the SomonScript checker does not require ' +
      'typed class fields to be initialized',
  },
  'migrate/06-optional-chaining.ts': {
    strict: 'typescript-only',
    reason:
      'TS2339: TypeScript narrows `собит х: Т[] | беқимат = беқимат` to `беқимат` from its ' +
      'initializer, so `х?.дарозӣ` reads a member of `never`',
  },
  'migrate/16-generators.ts': {
    default: 'typescript-only',
    strict: 'typescript-only',
    reason:
      'TS2766/TS2345: the SomonScript checker does not type the values generators delegate ' +
      'to and receive, nor the elements of iterables',
  },
  'migrate/26-type-aliases.ts': {
    default: 'typescript-only',
    reason:
      'TS2339: without strictNullChecks TypeScript does not narrow a union by a boolean ' +
      'literal discriminant (`ok: дуруст`)',
  },
  'migrate/32-array-methods.ts': {
    default: 'typescript-only',
    strict: 'typescript-only',
    reason:
      "TS2550/TS2339: findLast, toSorted and with are not in the default target's lib " +
      "(es2022); the SomonScript checker knows every method of the engine's arrays",
  },
  'ts-syntax-checker.test.ts:158': {
    default: 'typescript-only',
    strict: 'typescript-only',
    reason:
      'TS4113: `бознавис` on a member that `Error` does not have; the SomonScript checker ' +
      'does not know the members of built-in base classes',
  },
  // The SomonScript checker reports this as a warning without --strict
  'ts-syntax-checker.test.ts:347': {
    default: 'typescript-only',
    reason:
      'an unknown member is a warning without --strict and an error with it ' +
      '(PROPERTY_NOT_FOUND); TypeScript always reports TS2339',
  },
  // The SomonScript checker does not resolve type names
  'ts-syntax-codegen.test.ts:50': {
    default: 'typescript-only',
    strict: 'typescript-only',
    reason:
      'TS2304: `содир { навъ Т }` exports a type that does not exist; the SomonScript ' +
      'checker does not resolve type names',
  },
  'ts-syntax-parser.test.ts:718': {
    default: 'typescript-only',
    strict: 'typescript-only',
    reason: 'TS2304: the type of an `ин` parameter does not exist (type names are not resolved)',
  },
  'ts-syntax-parser.test.ts:736': {
    default: 'typescript-only',
    strict: 'typescript-only',
    reason: 'TS2304: the type of an `ин` parameter does not exist (type names are not resolved)',
  },
  'ts-syntax-parser.test.ts:839': {
    default: 'typescript-only',
    strict: 'typescript-only',
    reason:
      'TS1169/TS2304: a computed interface member names an undeclared value; the SomonScript ' +
      'checker does not check the names of interface members',
  },
  // Call type arguments: the parser work on `ф<Т>(…)` will let migrate keep them
  'migrate/15-recursion.ts': {
    default: 'typescript-only',
    strict: 'typescript-only',
    reason:
      'migrate leaves out the type arguments of `reduce<unknown[]>(…)` (with a warning) until ' +
      'the parser reads call type arguments; without them TypeScript infers too narrow a type',
  },
  'migrate/56-sorting.ts': {
    strict: 'typescript-only',
    reason:
      'migrate leaves out the type arguments of `reduce<Record<…>>(…)` (with a warning) until ' +
      'the parser reads call type arguments',
  },
};

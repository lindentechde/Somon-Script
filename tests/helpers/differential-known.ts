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
  'ts-syntax-codegen.test.ts › ворид Д, { навъ Т, х, навъ У чун Ф, у } аз "./м";': {
    cells: ['*'],
    reason:
      'imports a module that does not exist, with bindings it never uses. SomonScript keeps ' +
      'the import, so the module still runs (as with verbatimModuleSyntax); ' +
      "ts.transpileModule's default drops an import whose bindings are unused",
  },
  'ts-syntax-codegen.test.ts › ворид путь = require("path");': {
    cells: ['*/cjs'],
    reason:
      '`ворид м = require("./м")` of a missing module, never used: SomonScript requires it, ' +
      'TypeScript drops unused import-equals declarations',
  },
  'ts-syntax-parser.test.ts › ворид путь = require("path");': {
    cells: ['*/cjs'],
    reason:
      'the unused alias `ворид ф = Н.Д.ф` names an undeclared namespace (TS2503): SomonScript ' +
      'evaluates the alias, TypeScript drops unused aliases',
  },
  'ts-syntax-parser.test.ts › содир навъ { Т };': {
    cells: ['*/cjs'],
    reason:
      '`содир { навъ Т, х }` exports the undeclared `х` (TS2304): SomonScript reads it, ' +
      'TypeScript drops an export it cannot resolve to a value',
  },
  'ts-syntax-checker.test.ts › интерфейс Ҳисоб { баланс: рақам; }': {
    cells: ['*/cjs'],
    reason:
      'calls a function that uses `ин` without a receiver. TypeScript 6 emits every file as ' +
      'strict mode code (`alwaysStrict` can no longer be turned off), so `ин` is `undefined` ' +
      'in its CommonJS output; SomonScript’s CommonJS output of a script (no imports or ' +
      'exports) is sloppy mode code, as JavaScript and TypeScript 5 have it: the global object',
  },
  'ts-syntax-newer.test.ts › ворид.мавқуф("path");': {
    cells: ['*/cjs'],
    reason:
      'TypeScript leaves `import.defer(…)` as it is in CommonJS output (its checker reports ' +
      'TS18060 there), which no runtime runs; SomonScript loads the module with `require` ' +
      'when the namespace is first read',
  },
  'migrate/38-errors.ts': {
    cells: ['es5/cjs', 'es5/esm'],
    reason:
      'subclasses of built-ins (`class ValidationError extends Error`): on es5 SomonScript ' +
      "restores their prototype, so `instanceof` works as on every other target; TypeScript's " +
      'es5 output breaks it',
  },
};

/** Why ES module output with `import defer` (only the esnext target has it) does not load. */
const DEFERRED_IMPORT_IN_ESM =
  'ES module output keeps `import defer` and `import.defer(…)`, as TypeScript does, and no ' +
  'JavaScript runtime runs them yet (Node.js 20 to 24 reject the syntax): the program does ' +
  'not load, in either path';

/**
 * Programs whose output depends on the target or the module format, alike in
 * every path: the cells whose output differs from the reference cell
 * (es2022, CommonJS).
 */
export const KNOWN_CELL_DIFFERENCES: Readonly<Record<string, Known & { cells: string[] }>> = {
  'ts-syntax-checker.test.ts › интерфейс Ҳисоб { баланс: рақам; }': {
    cells: ['*/esm'],
    reason:
      'calls a function that uses `ин` without a receiver: `undefined` in an ES module (strict), ' +
      'the global object in a CommonJS script',
  },
  'ts-syntax-parser.test.ts › содир навъ { Т };': {
    cells: ['*/esm'],
    reason: 'exporting an undeclared name is a link error in an ES module',
  },
  'ts-syntax-newer.test.ts › ворид мавқуф * чун роҳ аз "path";': {
    cells: ['esnext/esm'],
    reason: DEFERRED_IMPORT_IN_ESM,
  },
  'ts-syntax-newer.test.ts › ворид мавқуф * чун роҳ аз "path"; (2)': {
    cells: ['esnext/esm'],
    reason: DEFERRED_IMPORT_IN_ESM,
  },
  'ts-syntax-newer.test.ts › ворид.мавқуф("path");': {
    cells: ['esnext/esm'],
    reason: DEFERRED_IMPORT_IN_ESM,
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
  'ts-syntax-behaviour.test.ts › синф Гиреҳ {': {
    default: 'typescript-only',
    strict: 'typescript-only',
    reason: 'TS2775: TypeScript needs an explicit type on the target of an assertion call',
  },
  'ts-syntax-parser.test.ts › функсия ф<собит Т мерос рақам[]>(х: Т): Т { бозгашт х; }': {
    default: 'typescript-only',
    strict: 'typescript-only',
    reason: 'TS2637: TypeScript allows `in`/`out` only on type aliases of object types',
  },
  'ts-syntax-parser.test.ts › синф Л { [калид: сатр]: рақам; статикӣ [к: сатр]: ҳар; танҳо…': {
    default: 'typescript-only',
    strict: 'typescript-only',
    reason: "TS2413: TypeScript checks a number index signature against the string one's type",
  },
  'ts-syntax-parser.test.ts › содир = 1;': {
    default: 'typescript-only',
    strict: 'typescript-only',
    reason:
      'TS2309: TypeScript allows no other exports, even type exports, next to `содир =`; ' +
      'SomonScript only rejects value exports there',
  },
  'ts-syntax-parser.test.ts › интерфейс И { get: рақам; set(х: рақам): беджавоб; get?(): с…': {
    default: 'typescript-only',
    strict: 'typescript-only',
    reason:
      'TS2300: an interface property and method of the same name; the SomonScript checker ' +
      'does not look for duplicate interface members',
  },
  'ts-syntax-gaps.test.ts › интерфейс И { нав: рақам; нав?(): рақам; нав(): И; }': {
    default: 'typescript-only',
    strict: 'typescript-only',
    reason:
      'TS2300: an interface property and method of the same name (`нав`); the SomonScript ' +
      'checker does not look for duplicate interface members',
  },
  'ts-syntax-gaps.test.ts › собит а = 1, б = 2, в = 3;': {
    default: 'typescript-only',
    strict: 'typescript-only',
    reason:
      'TS2365: TypeScript does not compare a boolean with a number (`а < б > в`), which ' +
      'JavaScript and SomonScript do',
  },
  'migrate/70-type-argument-lookahead.ts': {
    default: 'typescript-only',
    strict: 'typescript-only',
    reason:
      'TS2365/TS2558, as on the original: TypeScript does not compare a boolean with a number ' +
      '(`a < b > c`), and `f(g<number, string>(5))` passes type arguments to a function ' +
      'without type parameters',
  },
  'ts-syntax-gaps.test.ts › синф В { статикӣ': {
    strict: 'typescript-only',
    reason:
      'TS7008 (noImplicitAny): fields named `статикӣ` and `ҳамзамон` have neither a type nor ' +
      'an initializer; the SomonScript checker does not require one',
  },
  'ts-syntax-parser.test.ts › синф К { дастрасӣ() {} }': {
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
  'ts-syntax-checker.test.ts › синф А { х = 1; м(): рақам { бозгашт 1; } get г(): рақам { б…': {
    default: 'typescript-only',
    strict: 'typescript-only',
    reason:
      'TS4113: `бознавис` on a member that `Error` does not have; the SomonScript checker ' +
      'does not know the members of built-in base classes',
  },
  // The SomonScript checker reports this as a warning without --strict
  'ts-syntax-checker.test.ts › синф Л { номҳо: сатр[] = []; }': {
    default: 'typescript-only',
    reason:
      'an unknown member is a warning without --strict and an error with it ' +
      '(PROPERTY_NOT_FOUND); TypeScript always reports TS2339',
  },
  // The SomonScript checker does not resolve type names
  'ts-syntax-codegen.test.ts › тағ х = 1;': {
    default: 'typescript-only',
    strict: 'typescript-only',
    reason:
      'TS2304: `содир { навъ Т }` exports a type that does not exist; the SomonScript ' +
      'checker does not resolve type names',
  },
  'ts-syntax-parser.test.ts › функсия ф(ин: Нуқта, х: рақам) {}': {
    default: 'typescript-only',
    strict: 'typescript-only',
    reason: 'TS2304: the type of an `ин` parameter does not exist (type names are not resolved)',
  },
  'ts-syntax-parser.test.ts › собит о = { м(ин: Т, х: рақам) {} };': {
    default: 'typescript-only',
    strict: 'typescript-only',
    reason: 'TS2304: the type of an `ин` parameter does not exist (type names are not resolved)',
  },
  'ts-syntax-parser.test.ts › интерфейс И { [калид]: рақам; [Symbol.iterator](): Iterator<…': {
    default: 'typescript-only',
    strict: 'typescript-only',
    reason:
      'TS1169/TS2304: a computed interface member names an undeclared value; the SomonScript ' +
      'checker does not check the names of interface members',
  },
};

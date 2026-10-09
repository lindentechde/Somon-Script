# Verification

**How the test suite shows that SomonScript behaves exactly like TypeScript, on
every JavaScript target and runtime**

SomonScript is TypeScript with Tajik keywords, so TypeScript is its reference:
the same program, written in either language, must print the same, throw the
same and be rejected by the type checker for the same reasons. Several layers of
tests check this, from single components to whole programs on other runtimes.

---

## Layers

| Layer                     | Where                                                                 | What it shows                                                                                |
| ------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Unit and behaviour tests  | `tests/*.test.ts`                                                     | each component on its own; programs compile and print what they should                       |
| Corpus tests              | `tests/leetcode.test.ts`, `examples.test.ts`, `docs-snippets.test.ts` | the 100 LeetCode solutions pass their tests; every example and doc snippet compiles          |
| Targets matrix            | `tests/targets-matrix.test.ts`                                        | every program prints the same on every target, es5 … esnext                                  |
| TypeScript emitter corpus | `tests/ts-emitter-corpus.test.ts`, `tests/tsc-corpus.test.ts`         | the TypeScript the compiler prints is valid, runs alike and type-checks                      |
| Differential test         | `tests/differential.test.ts`                                          | SomonScript and TypeScript run alike and reach the same type-check verdicts                  |
| Fuzzing                   | `tests/fuzz.test.ts`                                                  | random input never crashes the compiler; random programs survive every round trip            |
| Other runtimes            | `scripts/run-runtimes.js`                                             | the compiled programs print the same on Bun and Deno as on Node.js                           |
| Nightly                   | `.github/workflows/nightly-verification.yml`                          | the full cross-product of the sampled tests above, with many more fuzz runs and a fresh seed |

---

## The Differential Test

`tests/differential.test.ts` takes one corpus: every runnable `.som` program of
the repository (the examples, the LeetCode solutions, the module demos), every
program of `tests/operators.test.ts` and of the `tests/ts-syntax-*.test.ts`
files, and the TypeScript programs of `tests/fixtures/migrate`. Each program is
compiled and run three ways:

| Path | From                    | Through                                           |
| ---- | ----------------------- | ------------------------------------------------- |
| A    | the SomonScript program | `compile()`                                       |
| B    | the SomonScript program | the TypeScript emitter, then `ts.transpileModule` |
| C    | the original TypeScript | `ts.transpileModule` (migrate fixtures only)      |

For a migrate fixture, A and B start from the SomonScript that `somon migrate`
makes of it. Every path runs in a fresh `vm` context with a seeded
`Math.random`, a virtual clock and timers, multi-file programs and dynamic
`ворид()`, for the targets es5, es2015, es2017, es2020, es2022 and esnext, as
CommonJS and (where the program can be one) as an ES module. In each of these
cells A, B and C must print the same and throw the same errors.

The test also type-checks every program with the SomonScript checker and with
the TypeScript checker (`checker: 'typescript'`), in default and strict mode,
and compares the verdicts: does the checker report errors or not.

Every difference it has found is listed, with its reason, in
`tests/helpers/differential-known.ts`: what TypeScript rejects by design
(comparisons without overlap, an unused comma operand), what the SomonScript
checker does not check yet (type names, `strictPropertyInitialization`),
target-dependent output of TypeScript itself (es5 accessors, names of anonymous
classes), and deliberate differences (SomonScript keeps imports whose bindings
are unused, and fixes `instanceof` for subclasses of `Error` on es5). The test
fails on a difference that is not listed, and on a listed one that no longer
occurs.

By default each program runs on es2022/CommonJS and on one other cell (they
rotate through the corpus), which takes about half a minute; the work runs in
child processes, one per core. `SOMON_FULL_MATRIX=1` runs every cell.

```bash
npx jest tests/differential.test.ts
SOMON_FULL_MATRIX=1 npx jest tests/differential.test.ts
```

---

## Fuzzing

`tests/fuzz.test.ts` uses [fast-check](https://fast-check.dev) with
grammar-based generators (`tests/helpers/fuzz.ts`). They build SomonScript
programs as ASTs: variables, functions, `агар`, bounded `барои` and `то` loops,
`кӯшиш`/`гирифтан`/`ниҳоят`, `интихоб`, and expressions with every operator,
templates, arrays, objects, optional chains and arrow functions. A printer
writes them as SomonScript, with random line breaks, spaces and comments where
they cannot change the program. The properties:

- the lexer and the parser raise only positioned errors of their own, on any
  input: random text, token soup, programs with typos, deep nesting; and
  `compile()` and `format()` only report diagnostics;
- a printed program parses back to its AST; the JavaScript of the code generator
  and the TypeScript of the TypeScript emitter have the same AST;
- `format()` keeps the AST and is idempotent;
- compile → run prints what TypeScript emitter → `ts.transpileModule` → run
  prints, on a random target;
- `migrate(TypeScript emitter(program))` gives back the program.

The seed is fixed, so every run checks the same programs. Programs that
TypeScript cannot express the same way (`а << (б > (в))` reads as a call with
type arguments) or that TypeScript 5.4 itself crashes on while it lowers them
(the compile error then starts with
`TypeScript 5.4.5 crashed while lowering the code`) are skipped, not failed.

### Reproducing a failure

A failing property reports its counterexample, as SomonScript source, with the
seed and the path that lead to it:

```
Property failed after 1 tests
{ seed: 20261009, path: "3:0:0:1:0:4", endOnFailure: true }
Counterexample: [
тағ х0 = ``;
…
```

Replay exactly that counterexample with the seed and path, and `-t` for the
property:

```bash
SOMON_FUZZ_SEED=20261009 SOMON_FUZZ_PATH="3:0:0:1:0:4" \
  npx jest tests/fuzz.test.ts -t "parse back"
```

To search further, raise the number of runs or change the seed:

```bash
SOMON_FUZZ_RUNS=5000 SOMON_FUZZ_SEED=12345 npx jest tests/fuzz.test.ts
```

---

## Other Runtimes

`scripts/run-runtimes.js` compiles the examples and the LeetCode solutions and
runs each on another runtime and on Node.js, with the same seeded `Math.random`,
fixed clock and a console that formats values the same way on every runtime.
They must print the same, and every LeetCode solution must pass its tests. Bun
runs CommonJS and ES modules, Deno ES modules.

```bash
npm run build
node scripts/run-runtimes.js --runtime bun
node scripts/run-runtimes.js --runtime deno --format esm leetcode/0001
```

The runtime's command is `bun` or `deno` from `PATH`, or the `BUN` / `DENO`
environment variable. The pull request workflow runs it on both.

---

## Environment Variables

| Variable             | Used by                           | Effect                                                      |
| -------------------- | --------------------------------- | ----------------------------------------------------------- |
| `SOMON_FULL_MATRIX`  | targets matrix, differential test | `1`: every program on every target and module format        |
| `SOMON_DIFF_WORKERS` | differential test                 | number of worker processes (default: cores, at most 4)      |
| `SOMON_FUZZ_RUNS`    | fuzz tests                        | runs per property (default 100)                             |
| `SOMON_FUZZ_SEED`    | fuzz tests                        | the seed (default 20261009)                                 |
| `SOMON_FUZZ_PATH`    | fuzz tests                        | replay one counterexample (with the seed it was found with) |
| `BUN`, `DENO`        | `scripts/run-runtimes.js`         | the runtime's command                                       |

The nightly workflow sets `SOMON_FULL_MATRIX=1`, `SOMON_FUZZ_RUNS=2000` and a
new `SOMON_FUZZ_SEED` (the run id) each night; it can also be started by hand
with other values.

---

## When a Test Finds a Difference

1. Reduce it to a small program and decide whose bug it is: the parser, the code
   generator, the TypeScript emitter, a checker, `migrate` or the formatter.
2. Fix it there, with a regression test next to that component's tests.
3. If it is not a bug (TypeScript is stricter by design, or SomonScript differs
   on purpose), list it in `tests/helpers/differential-known.ts` with the
   reason. The list must stay exact: remove an entry once the difference is
   gone.

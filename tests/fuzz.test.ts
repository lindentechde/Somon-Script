/**
 * Property-based tests (fast-check) of the whole compiler: random input for
 * the lexer and parser, and random valid programs (tests/helpers/fuzz.ts) for
 * the round trips between SomonScript, JavaScript and TypeScript.
 *
 * Runs are reproducible: the seed is fixed (SOMON_FUZZ_SEED overrides it) and
 * SOMON_FUZZ_RUNS sets the number of runs per property. A failure reports
 * the counterexample (as SomonScript source), its seed and its path; rerun it
 * with SOMON_FUZZ_SEED=<seed> SOMON_FUZZ_PATH=<path> npx jest tests/fuzz.test.ts
 * -t '<property>'. See llm-guide/19-verification.md.
 */
import * as fc from 'fast-check';

import { CodeGenerator } from '../src/codegen';
import { compile } from '../src/compiler';
import { Lexer } from '../src/lexer';
import { Parser } from '../src/parser';
import { TsEmitter } from '../src/ts-emitter';
import { format, FormatError } from '../src/tools/format';
import { migrate } from '../src/tools/migrate';
import { DIFF_TARGETS, emitTypeScript, transpile, transpileOptions } from './helpers/differential';
import {
  brokenProgram,
  canonicalCode,
  canonicalSomon,
  generatedProgram,
  printProgram,
  readsTypeArguments,
  tokenSoup,
} from './helpers/fuzz';
import { runProgram } from './helpers/sandbox';

const RUNS = Number(process.env.SOMON_FUZZ_RUNS) || 100;
const SEED = process.env.SOMON_FUZZ_SEED ? Number(process.env.SOMON_FUZZ_SEED) : 20261009;
const PATH = process.env.SOMON_FUZZ_PATH;

/** The run parameters of every property: fixed seed, SOMON_FUZZ_* overrides. */
function parameters<T>(runs = RUNS): fc.Parameters<T> {
  return { seed: SEED, numRuns: runs, ...(PATH && { path: PATH, endOnFailure: true }) };
}

jest.setTimeout(Math.max(60000, RUNS * 2000));

/** Messages of JavaScript's own errors: a crash of the compiler, not a diagnostic. */
const INTERNAL_ERROR =
  /Cannot read propert|Cannot set propert|is not a function|is not iterable|Cannot destructure|Maximum call stack|Invalid array length|Debug Failure/;

/** A diagnostic must say where: `… at line 3, column 7`. */
function expectPositioned(message: string): void {
  expect(message).toMatch(/line \d+, column \d+/);
  expect(message).not.toMatch(INTERNAL_ERROR);
}

/** The canonical form of a SomonScript program, or its parse errors. */
function parsed(source: string): string {
  const parser = new Parser(new Lexer(source).tokenize());
  const ast = parser.parse();
  const errors = parser.getErrors();
  return errors.length > 0 ? `(errors ${errors.join('; ')})` : canonicalSomon(ast);
}

function parse(source: string) {
  const parser = new Parser(new Lexer(source).tokenize());
  const ast = parser.parse();
  expect(parser.getErrors()).toEqual([]);
  return ast;
}

/** Any input: random text, tokens of the language, valid programs with typos, deep nesting. */
const anyInput = fc.oneof(
  fc.string({ unit: 'binary', maxLength: 80 }),
  fc.string({ unit: 'grapheme', maxLength: 80 }),
  tokenSoup,
  brokenProgram,
  fc
    .tuple(fc.constantFrom('(', '[', '{', 'агар (х) ', '-', '!', 'функсия ф() {'), fc.nat(700))
    .map(([open, depth]) => `тағ х = ${open.repeat(depth)}1;`)
);

describe('the lexer and the parser on any input', () => {
  test('raise only positioned errors of their own', () => {
    fc.assert(
      fc.property(anyInput, input => {
        let tokens;
        try {
          tokens = new Lexer(input).tokenize();
        } catch (error) {
          // The lexer throws a plain Error with a position
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).constructor).toBe(Error);
          expectPositioned((error as Error).message);
          return;
        }
        // The parser never throws: it collects its errors
        const parser = new Parser(tokens);
        parser.parse();
        parser.getErrors().forEach(expectPositioned);
      }),
      parameters()
    );
  });

  test('compile() and format() fail only with their own diagnostics', () => {
    fc.assert(
      fc.property(
        anyInput,
        fc.constantFrom(...DIFF_TARGETS),
        fc.boolean(),
        (input, target, strict) => {
          const result = compile(input, { target, strict });
          result.errors.forEach(expectPositioned);
          try {
            format(input);
          } catch (error) {
            expect(error).toBeInstanceOf(FormatError);
          }
        }
      ),
      parameters(Math.ceil(RUNS / 2))
    );
  });
});

describe('generated programs', () => {
  test('parse back to the generated syntax tree', () => {
    fc.assert(
      fc.property(generatedProgram(), ({ ast, source }) => {
        expect(parsed(source)).toBe(canonicalSomon(ast));
      }),
      parameters()
    );
  });

  test('the code generator prints JavaScript with the same syntax tree', () => {
    fc.assert(
      fc.property(generatedProgram(), ({ ast, source }) => {
        const javascript = new CodeGenerator().generate(parse(source));
        expect(canonicalCode(javascript, 'main.js')).toBe(canonicalSomon(ast));
      }),
      parameters()
    );
  });

  test('the TypeScript emitter prints TypeScript with the same syntax tree', () => {
    fc.assert(
      fc.property(generatedProgram(), ({ ast, source }) => {
        const typescript = new TsEmitter().generate(parse(source));
        // `а << (б > (в))` is a generic call in TypeScript, which has no other spelling for it
        fc.pre(!readsTypeArguments(typescript));
        expect(canonicalCode(typescript, 'main.ts')).toBe(canonicalSomon(ast));
      }),
      parameters()
    );
  });

  test('format() keeps the syntax tree and is idempotent', () => {
    // Random line breaks, spaces and comments where they cannot change the program
    const noisy = fc
      .tuple(generatedProgram(), fc.array(fc.nat(), { minLength: 1, maxLength: 40 }))
      .map(([program, noise]) => ({ ...program, source: printProgram(program.ast, noise) }));
    fc.assert(
      fc.property(noisy, ({ ast, source }) => {
        expect(parsed(source)).toBe(canonicalSomon(ast));
        const formatted = format(source);
        expect(parsed(formatted)).toBe(canonicalSomon(ast));
        expect(format(formatted)).toBe(formatted);
      }),
      parameters()
    );
  });

  test('compile → run prints what TypeScript emitter → transpileModule → run prints', async () => {
    await fc.assert(
      fc.asyncProperty(
        generatedProgram(),
        fc.constantFrom(...DIFF_TARGETS),
        async ({ source }, target) => {
          const compiled = compile(source, { typeCheck: false, target });
          expect(compiled.errors).toEqual([]);
          const emitted = emitTypeScript(source);
          expect(emitted.errors).toEqual([]);
          fc.pre(!readsTypeArguments(emitted.code));
          const transpiled = transpile(
            emitted.code,
            transpileOptions({ target, format: 'commonjs' })
          );
          expect(transpiled.errors).toEqual([]);
          const run = (code: string): Promise<string> =>
            runProgram(
              { modules: new Map([['main', code]]), entry: 'main' },
              { format: 'commonjs' }
            );
          expect(await run(compiled.code)).toBe(await run(transpiled.code));
        }
      ),
      parameters()
    );
  });

  test('migrate(TypeScript emitter(program)) gives back the program', () => {
    fc.assert(
      fc.property(generatedProgram(), ({ ast, source }) => {
        const typescript = new TsEmitter().generate(parse(source));
        fc.pre(!readsTypeArguments(typescript));
        const migrated = migrate(typescript);
        expect(migrated.warnings).toEqual([]);
        expect(parsed(migrated.code)).toBe(canonicalSomon(ast));
      }),
      parameters(Math.ceil(RUNS / 2))
    );
  });
});

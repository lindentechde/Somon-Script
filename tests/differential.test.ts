/**
 * SomonScript behaves exactly like TypeScript: every program of the corpus
 * (the runnable `.som` programs of the repository, the operator and
 * TypeScript 5 syntax programs of the tests, and the TypeScript programs of
 * tests/fixtures/migrate) runs the same when compiled by SomonScript (A),
 * printed as TypeScript and transpiled by TypeScript (B), and, for the
 * TypeScript programs, transpiled from the original (C); and the SomonScript
 * checker reaches the same verdict as the TypeScript checker. See
 * tests/helpers/differential.ts for the details.
 *
 * Targets es5, es2015, es2017, es2020, es2022 and esnext × CommonJS and ES
 * modules. By default each program runs on es2022/CommonJS and on one other
 * cell (they rotate); SOMON_FULL_MATRIX=1 runs every program in every cell.
 * Known differences are listed, with their reasons, in
 * tests/helpers/differential-known.ts.
 */
import {
  ALL_CELLS,
  DifferentialPool,
  cellDifferences,
  cellName,
  cellsFor,
  differentialCorpus,
  importsMissingModules,
  pathDifferences,
  verdictDisagreements,
  type DiffResult,
} from './helpers/differential';
import {
  KNOWN_CELL_DIFFERENCES,
  KNOWN_PATH_DIFFERENCES,
  KNOWN_VERDICT_DISAGREEMENTS,
} from './helpers/differential-known';

const FULL_MATRIX = process.env.SOMON_FULL_MATRIX === '1';

const programs = differentialCorpus();
const pool = new DifferentialPool();
let results = new Map<string, DiffResult>();

beforeAll(
  async () => {
    const jobs = programs.map((program, index) => ({
      program,
      cells: cellsFor(index, FULL_MATRIX),
      verdicts: true,
    }));
    results = await pool.run(jobs);
  },
  FULL_MATRIX ? 3600000 : 900000
);

afterAll(() => pool.close());

/** Whether `cell` (`es5/cjs`) is one of `patterns` (`es5/cjs`, `*\/cjs`, `*`). */
function matches(patterns: readonly string[], cell: string): boolean {
  const [target, format] = cell.split('/');
  return patterns.some(pattern => {
    if (pattern === '*') return true;
    const [patternTarget, patternFormat] = pattern.split('/');
    return (
      (patternTarget === '*' || patternTarget === target) &&
      (patternFormat === '*' || patternFormat === format)
    );
  });
}

/** The cell a problem of `pathDifferences` is about (`es5/cjs: A ≠ B …`). */
const cellOf = (problem: string): string => problem.slice(0, problem.indexOf(':'));

function resultOf(name: string): DiffResult {
  const result = results.get(name);
  if (!result) throw new Error(`no result for ${name}`);
  return result;
}

describe(`A (compile), B (TypeScript emitter) and C (TypeScript) run alike (${
  FULL_MATRIX ? 'every cell' : 'sampled cells; SOMON_FULL_MATRIX=1 runs every cell'
})`, () => {
  test('the corpus has every program', () => {
    const count = (kind: string): number =>
      programs.filter(program => program.kind === kind).length;
    expect(count('leetcode')).toBe(100);
    expect(count('example') + count('module')).toBeGreaterThan(75);
    expect(count('operator')).toBeGreaterThan(100);
    expect(count('ts-syntax')).toBeGreaterThan(130);
    expect(count('migrate')).toBeGreaterThanOrEqual(87);
    expect(ALL_CELLS.map(cellName)).toHaveLength(12);
  });

  test.each(programs.map(program => [program.name]))('%s', name => {
    const result = resultOf(name);
    expect(result.error).toBeUndefined();
    const knownPaths = KNOWN_PATH_DIFFERENCES[name]?.cells ?? [];
    expect(
      pathDifferences(result).filter(problem => !matches(knownPaths, cellOf(problem)))
    ).toEqual([]);
    const knownCells = KNOWN_CELL_DIFFERENCES[name]?.cells ?? [];
    expect(cellDifferences(result).filter(cell => !matches(knownCells, cell))).toEqual([]);
  });

  test('only syntax tests that expect errors do not compile', () => {
    const failing = programs.filter(program => resultOf(program.name).runnable !== true);
    expect(
      failing.filter(program => program.kind !== 'ts-syntax' || program.helper === 'run')
    ).toEqual([]);
  });

  test('every known difference still occurs', () => {
    const stale: string[] = [];
    const check = (
      known: Readonly<Record<string, { cells: string[] }>>,
      found: (result: DiffResult) => string[]
    ): void => {
      for (const [name, { cells }] of Object.entries(known)) {
        const result = resultOf(name);
        const ran = result.cells.map(cell => cell.cell).filter(cell => matches(cells, cell));
        // Sampled runs may not have run the listed cells
        if (ran.length === 0) continue;
        if (!found(result).some(cell => matches(cells, cell))) stale.push(name);
      }
    };
    check(KNOWN_PATH_DIFFERENCES, result => pathDifferences(result).map(cellOf));
    check(KNOWN_CELL_DIFFERENCES, cellDifferences);
    expect(stale).toEqual([]);
  });
});

describe('the SomonScript checker reaches the verdicts of the TypeScript checker', () => {
  // Their modules exist only in their tests: TypeScript reports TS2307 for them
  const checked = programs.filter(program => !importsMissingModules(program));

  test('the known disagreements are about programs of the corpus', () => {
    const names = new Set(checked.map(program => program.name));
    expect(Object.keys(KNOWN_VERDICT_DISAGREEMENTS).filter(name => !names.has(name))).toEqual([]);
  });

  test.each(checked.map(program => [program.name]))('%s', name => {
    const { verdicts } = resultOf(name);
    // Syntax tests that do not parse have no verdict
    if (!verdicts) return;
    const known = KNOWN_VERDICT_DISAGREEMENTS[name];
    const expected = {
      ...(known?.default && { default: known.default }),
      ...(known?.strict && { strict: known.strict }),
    };
    // The error codes are part of the comparison only to show them when it fails
    expect({ disagreement: verdictDisagreements(verdicts), verdicts }).toEqual({
      disagreement: expected,
      verdicts,
    });
  });
});

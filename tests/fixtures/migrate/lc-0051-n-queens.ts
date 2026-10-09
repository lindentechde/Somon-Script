// LeetCode 51. N-Queens: backtracking with column and diagonal sets.
function solveNQueens(n: number): string[][] {
  const solutions: string[][] = [];
  const queens: number[] = [];
  const columns = new Set<number>();
  const diagonals = new Set<number>();
  const antiDiagonals = new Set<number>();

  function place(row: number): void {
    if (row === n) {
      solutions.push(queens.map(col => '.'.repeat(col) + 'Q' + '.'.repeat(n - col - 1)));
      return;
    }
    for (let col = 0; col < n; col++) {
      if (columns.has(col) || diagonals.has(row - col) || antiDiagonals.has(row + col)) continue;
      queens.push(col);
      columns.add(col);
      diagonals.add(row - col);
      antiDiagonals.add(row + col);
      place(row + 1);
      queens.pop();
      columns.delete(col);
      diagonals.delete(row - col);
      antiDiagonals.delete(row + col);
    }
  }

  place(0);
  return solutions;
}

let failures = 0;
function check(name: string, actual: unknown, expected: unknown): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    console.log('✓ ' + name);
  } else {
    console.log(`✗ ${name}: expected ${e}, got ${a}`);
    failures++;
  }
}

check('n=4', solveNQueens(4), [
  ['.Q..', '...Q', 'Q...', '..Q.'],
  ['..Q.', 'Q...', '...Q', '.Q..'],
]);
check('n=1', solveNQueens(1), [['Q']]);
check('count n=8', solveNQueens(8).length, 92);
console.log(failures === 0 ? 'all passed' : `${failures} failed`);

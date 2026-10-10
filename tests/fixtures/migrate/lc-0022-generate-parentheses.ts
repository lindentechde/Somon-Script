// LeetCode 22. Generate Parentheses: backtracking.
function generateParenthesis(n: number): string[] {
  const result: string[] = [];
  const build = (current: string, open: number, close: number): void => {
    if (current.length === 2 * n) {
      result.push(current);
      return;
    }
    if (open < n) build(current + '(', open + 1, close);
    if (close < open) build(current + ')', open, close + 1);
  };
  build('', 0, 0);
  return result;
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

check('n=1', generateParenthesis(1), ['()']);
check('n=3', generateParenthesis(3), ['((()))', '(()())', '(())()', '()(())', '()()()']);
check('count n=5', generateParenthesis(5).length, 42);
console.log(failures === 0 ? 'all passed' : `${failures} failed`);

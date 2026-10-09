// LeetCode 20. Valid Parentheses: a stack of expected closers.
const PAIRS: Record<string, string> = { ')': '(', ']': '[', '}': '{' };

function isValid(s: string): boolean {
  const stack: string[] = [];
  for (const ch of s) {
    if (ch in PAIRS) {
      if (stack.pop() !== PAIRS[ch]) return false;
    } else {
      stack.push(ch);
    }
  }
  return stack.length === 0;
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

check('()', isValid('()'), true);
check('()[]{}', isValid('()[]{}'), true);
check('(]', isValid('(]'), false);
check('([)]', isValid('([)]'), false);
check('{[]}', isValid('{[]}'), true);
check('open', isValid('(('), false);
console.log(failures === 0 ? 'all passed' : `${failures} failed`);

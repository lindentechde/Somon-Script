// LeetCode 5. Longest Palindromic Substring: expand around every center.
function longestPalindrome(s: string): string {
  let bestStart = 0;
  let bestLength = 0;
  const expand = (left: number, right: number): void => {
    while (left >= 0 && right < s.length && s[left] === s[right]) {
      left--;
      right++;
    }
    const length = right - left - 1;
    if (length > bestLength) {
      bestLength = length;
      bestStart = left + 1;
    }
  };
  for (let center = 0; center < s.length; center++) {
    expand(center, center);
    expand(center, center + 1);
  }
  return s.slice(bestStart, bestStart + bestLength);
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

check('babad', longestPalindrome('babad'), 'bab');
check('cbbd', longestPalindrome('cbbd'), 'bb');
check('single', longestPalindrome('a'), 'a');
check('whole', longestPalindrome('racecar'), 'racecar');
console.log(failures === 0 ? 'all passed' : `${failures} failed`);

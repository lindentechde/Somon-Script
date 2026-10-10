// LeetCode 3. Longest Substring Without Repeating Characters: sliding window.
function lengthOfLongestSubstring(s: string): number {
  const lastIndex = new Map<string, number>();
  let start = 0;
  let best = 0;
  for (let end = 0; end < s.length; end++) {
    const ch = s[end];
    const previous = lastIndex.get(ch);
    if (previous !== undefined && previous >= start) start = previous + 1;
    lastIndex.set(ch, end);
    best = Math.max(best, end - start + 1);
  }
  return best;
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

check('abcabcbb', lengthOfLongestSubstring('abcabcbb'), 3);
check('bbbbb', lengthOfLongestSubstring('bbbbb'), 1);
check('pwwkew', lengthOfLongestSubstring('pwwkew'), 3);
check('empty', lengthOfLongestSubstring(''), 0);
check('dvdf', lengthOfLongestSubstring('dvdf'), 3);
console.log(failures === 0 ? 'all passed' : `${failures} failed`);

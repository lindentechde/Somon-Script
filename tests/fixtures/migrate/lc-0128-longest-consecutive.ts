// LeetCode 128. Longest Consecutive Sequence: start counting only at sequence starts.
function longestConsecutive(nums: number[]): number {
  const values = new Set(nums);
  let best = 0;
  for (const value of values) {
    if (values.has(value - 1)) continue;
    let length = 1;
    while (values.has(value + length)) length++;
    best = Math.max(best, length);
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

check('example 1', longestConsecutive([100, 4, 200, 1, 3, 2]), 4);
check('example 2', longestConsecutive([0, 3, 7, 2, 5, 8, 4, 6, 0, 1]), 9);
check('empty', longestConsecutive([]), 0);
check('duplicates', longestConsecutive([1, 2, 0, 1]), 3);
console.log(failures === 0 ? 'all passed' : `${failures} failed`);

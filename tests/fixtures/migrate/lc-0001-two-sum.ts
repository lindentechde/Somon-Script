// LeetCode 1. Two Sum: a hash map of values seen so far.
function twoSum(nums: number[], target: number): number[] {
  const seen = new Map<number, number>();
  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i];
    const j = seen.get(need);
    if (j !== undefined) return [j, i];
    seen.set(nums[i], i);
  }
  return [];
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

check('example 1', twoSum([2, 7, 11, 15], 9), [0, 1]);
check('example 2', twoSum([3, 2, 4], 6), [1, 2]);
check('example 3', twoSum([3, 3], 6), [0, 1]);
check('negatives', twoSum([-1, -2, -3, -4, -5], -8), [2, 4]);
check('no answer', twoSum([1, 2], 7), []);
console.log(failures === 0 ? 'all passed' : `${failures} failed`);

// LeetCode 15. 3Sum: sort, then two pointers for each first element.
function threeSum(nums: number[]): number[][] {
  const sorted = [...nums].sort((a, b) => a - b);
  const result: number[][] = [];
  for (let i = 0; i < sorted.length - 2; i++) {
    if (i > 0 && sorted[i] === sorted[i - 1]) continue;
    let lo = i + 1;
    let hi = sorted.length - 1;
    while (lo < hi) {
      const sum = sorted[i] + sorted[lo] + sorted[hi];
      if (sum === 0) {
        result.push([sorted[i], sorted[lo], sorted[hi]]);
        while (lo < hi && sorted[lo] === sorted[lo + 1]) lo++;
        while (lo < hi && sorted[hi] === sorted[hi - 1]) hi--;
        lo++;
        hi--;
      } else if (sum < 0) {
        lo++;
      } else {
        hi--;
      }
    }
  }
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

check('example', threeSum([-1, 0, 1, 2, -1, -4]), [
  [-1, -1, 2],
  [-1, 0, 1],
]);
check('none', threeSum([0, 1, 1]), []);
check('zeros', threeSum([0, 0, 0, 0]), [[0, 0, 0]]);
console.log(failures === 0 ? 'all passed' : `${failures} failed`);

// LeetCode 11. Container With Most Water: two pointers.
function maxArea(height: number[]): number {
  let left = 0;
  let right = height.length - 1;
  let best = 0;
  while (left < right) {
    const area = Math.min(height[left], height[right]) * (right - left);
    best = Math.max(best, area);
    if (height[left] < height[right]) left++;
    else right--;
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

check('example', maxArea([1, 8, 6, 2, 5, 4, 8, 3, 7]), 49);
check('two', maxArea([1, 1]), 1);
check('decreasing', maxArea([5, 4, 3, 2, 1]), 6);
console.log(failures === 0 ? 'all passed' : `${failures} failed`);

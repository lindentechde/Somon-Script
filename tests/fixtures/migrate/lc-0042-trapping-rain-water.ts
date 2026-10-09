// LeetCode 42. Trapping Rain Water: two pointers with running maxima.
function trap(height: number[]): number {
  let left = 0;
  let right = height.length - 1;
  let leftMax = 0;
  let rightMax = 0;
  let water = 0;
  while (left < right) {
    if (height[left] < height[right]) {
      leftMax = Math.max(leftMax, height[left]);
      water += leftMax - height[left];
      left++;
    } else {
      rightMax = Math.max(rightMax, height[right]);
      water += rightMax - height[right];
      right--;
    }
  }
  return water;
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

check('example 1', trap([0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]), 6);
check('example 2', trap([4, 2, 0, 3, 2, 5]), 9);
check('flat', trap([1, 1, 1]), 0);
check('empty', trap([]), 0);
console.log(failures === 0 ? 'all passed' : `${failures} failed`);

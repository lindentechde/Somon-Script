// LeetCode 4. Median of Two Sorted Arrays: binary search on the partition.
function findMedianSortedArrays(a: number[], b: number[]): number {
  if (a.length > b.length) return findMedianSortedArrays(b, a);
  const m = a.length;
  const n = b.length;
  let low = 0;
  let high = m;
  while (low <= high) {
    const i = (low + high) >> 1;
    const j = ((m + n + 1) >> 1) - i;
    const aLeft = i === 0 ? -Infinity : a[i - 1];
    const aRight = i === m ? Infinity : a[i];
    const bLeft = j === 0 ? -Infinity : b[j - 1];
    const bRight = j === n ? Infinity : b[j];
    if (aLeft <= bRight && bLeft <= aRight) {
      const leftMax = Math.max(aLeft, bLeft);
      if ((m + n) % 2 === 1) return leftMax;
      return (leftMax + Math.min(aRight, bRight)) / 2;
    }
    if (aLeft > bRight) high = i - 1;
    else low = i + 1;
  }
  throw new Error('arrays are not sorted');
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

check('odd', findMedianSortedArrays([1, 3], [2]), 2);
check('even', findMedianSortedArrays([1, 2], [3, 4]), 2.5);
check('empty first', findMedianSortedArrays([], [1]), 1);
check('interleaved', findMedianSortedArrays([1, 3, 5, 7], [2, 4, 6]), 4);
console.log(failures === 0 ? 'all passed' : `${failures} failed`);

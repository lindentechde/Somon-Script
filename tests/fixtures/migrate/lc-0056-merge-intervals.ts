// LeetCode 56. Merge Intervals: sort by start, then extend or append.
type Interval = [number, number];

function merge(intervals: Interval[]): Interval[] {
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
  const result: Interval[] = [];
  for (const [start, end] of sorted) {
    const last = result[result.length - 1];
    if (last && start <= last[1]) last[1] = Math.max(last[1], end);
    else result.push([start, end]);
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

check(
  'example 1',
  merge([
    [1, 3],
    [2, 6],
    [8, 10],
    [15, 18],
  ]),
  [
    [1, 6],
    [8, 10],
    [15, 18],
  ]
);
check(
  'touching',
  merge([
    [1, 4],
    [4, 5],
  ]),
  [[1, 5]]
);
check(
  'unsorted',
  merge([
    [4, 7],
    [1, 4],
  ]),
  [[1, 7]]
);
check(
  'nested',
  merge([
    [1, 10],
    [2, 3],
  ]),
  [[1, 10]]
);
console.log(failures === 0 ? 'all passed' : `${failures} failed`);

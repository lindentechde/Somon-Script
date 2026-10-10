// Array methods
const nums = [5, 3, 8, 1, 9, 2];
console.log(nums.length, nums.at(-1), nums.indexOf(8), nums.includes(4));
console.log(
  nums.filter(n => n % 2 === 1),
  nums.map(n => n * 10)
);
console.log(
  nums.reduce((a, b) => a + b, 0),
  nums.reduceRight((a, b) => a + '-' + b, '')
);
console.log(
  nums.find(n => n > 5),
  nums.findIndex(n => n > 5),
  nums.findLast(n => n < 5)
);
console.log(
  nums.some(n => n > 8),
  nums.every(n => n > 0)
);
console.log(
  [...nums].sort((a, b) => a - b),
  [...nums].reverse()
);
console.log(nums.slice(1, 3), nums.join('|'), nums.concat([7]));
console.log(
  [
    [1, 2],
    [3, [4]],
  ].flat(),
  [1, 2].flatMap(n => [n, n])
);
console.log(
  Array.from({ length: 3 }, (_, i) => i * i),
  Array.of(7, 8),
  Array.isArray(nums)
);

const copy = nums.slice();
copy.push(10);
copy.unshift(0);
const last = copy.pop();
const firstValue = copy.shift();
const removed = copy.splice(1, 2, 99);
console.log(copy, last, firstValue, removed);
console.log(new Array(3).fill(0), [3, 1, 2].toSorted(), [1, 2, 3].with(0, 9));
nums.forEach((n, i) => {
  if (i < 2) console.log('item', i, n);
});
for (const [i, v] of ['x', 'y'].entries()) console.log(i, v);
console.log([...['x', 'y'].keys()], [...['x', 'y'].values()], nums.lastIndexOf(1));

// Destructuring
const [first, second = 'default', ...rest] = ['a', undefined, 'c', 'd'];
console.log(first, second, rest);

const {
  name,
  age = 30,
  address: { city } = { city: 'none' },
} = {
  name: 'Ali',
  address: { city: 'Dushanbe' },
};
console.log(name, age, city);

const { a, ...others } = { a: 1, b: 2, c: 3 };
console.log(a, others);

let x = 1;
let y = 2;
[x, y] = [y, x];
console.log(x, y);

function area({ w, h = 2 }: { w: number; h?: number }): number {
  return w * h;
}
const swap = ([p, q]: [number, number]): [number, number] => [q, p];
console.log(area({ w: 3 }), area({ w: 3, h: 3 }), swap([1, 2]));

for (const {
  id,
  tags: [tag],
} of [{ id: 1, tags: ['x', 'y'] }])
  console.log(id, tag);

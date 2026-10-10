// Function declarations, defaults, rest and arrows
function add(a: number, b: number = 10): number {
  return a + b;
}
function sum(...values: number[]): number {
  return values.reduce((total, v) => total + v, 0);
}
const square = (x: number): number => x * x;
const greet = (name = 'friend') => `hi ${name}`;
const noop = () => {};

console.log(add(1), add(1, 2), sum(1, 2, 3, 4), square(7));
console.log(greet(), greet('Ali'), noop());

function apply<T, R>(value: T, fn: (v: T) => R): R {
  return fn(value);
}
console.log(
  apply(5, square),
  apply('ab', s => s.length)
);

const anonymous = function (n: number) {
  return n + 1;
};
console.log(anonymous(1));

// Explicit type arguments of function and method calls
function identity<T>(value: T): T {
  return value;
}
function pairOf<A, B>(a: A, b: B): [A, B] {
  return [a, b];
}

const numbers = [3, 1, 2];
console.log(identity<number>(1), identity<string>('a'), pairOf<number, string>(1, 'b'));
console.log(
  numbers.map<string>(n => `#${n}`),
  numbers.reduce<number>((sum, n) => sum + n, 0)
);

const lookup = new Map<string, number[]>([['a', [1]]]);
console.log(lookup.get('a'), Array.from<number>(new Set<number>([1, 1, 2])));
Promise.resolve<number>(5).then(value => console.log('resolved', value));

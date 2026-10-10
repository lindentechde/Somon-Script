// Symbols and iterables without computed class members
const sym = Symbol('id');
const tagged: Record<symbol | string, unknown> = { name: 'x' };
tagged[sym] = 7;
console.log(tagged[sym], sym.toString(), sym.description);

function iterableRange(from: number, to: number): Iterable<number> {
  return {
    [Symbol.iterator]: function* () {
      for (let i = from; i <= to; i++) yield i;
    },
  };
}
console.log([...iterableRange(1, 4)], Array.from(iterableRange(2, 3)));

const it = [10, 20][Symbol.iterator]();
console.log(it.next(), it.next(), it.next());
const entries = new Map([['a', 1]]).entries();
console.log(entries.next().value);

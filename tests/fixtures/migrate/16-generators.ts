// Generators
function* range(start: number, end: number, step = 1): Generator<number> {
  for (let i = start; i < end; i += step) {
    yield i;
  }
}
function* concat<T>(...parts: Iterable<T>[]): Generator<T> {
  for (const part of parts) {
    yield* part;
  }
}

console.log([...range(0, 5)]);
console.log([...concat([1, 2], range(3, 6, 2), 'ab')]);

const gen = range(10, 13);
console.log(gen.next().value, gen.next().value, gen.next().done, gen.next().done);

const tree = {
  value: 1,
  children: [
    { value: 2, children: [] },
    { value: 3, children: [{ value: 4, children: [] }] },
  ],
};
type Tree = { value: number; children: Tree[] };
function* walk(node: Tree): Generator<number> {
  yield node.value;
  for (const child of node.children) yield* walk(child);
}
console.log([...walk(tree)].join('-'));

// readonly arrays, tuples and properties
const numbers: readonly number[] = [3, 1, 2];
const pair: readonly [string, number] = ['a', 1];
const list: ReadonlyArray<string> = ['x', 'y'];

interface Config {
  readonly name: string;
  readonly tags: readonly string[];
}
const cfg: Config = { name: 'app', tags: ['a', 'b'] };

console.log([...numbers].sort(), numbers.length, pair[0], pair[1], list.join(''));
console.log(
  cfg.name,
  cfg.tags.includes('b'),
  numbers.map(n => n * 2)
);

type Tuple = [first: string, second?: number, ...rest: boolean[]];
const t1: Tuple = ['only'];
const t2: Tuple = ['all', 2, true, false];
console.log(t1.length, t2.length, t2.slice(2));

// Type predicates and assertion functions
interface Cat {
  kind: 'cat';
  meow(): string;
}
interface Fish {
  kind: 'fish';
  swim(): string;
}
type Pet = Cat | Fish;

function isCat(pet: Pet): pet is Cat {
  return pet.kind === 'cat';
}
function assertString(value: unknown, name: string): asserts value is string {
  if (typeof value !== 'string') throw new TypeError(`${name} must be a string`);
}
function assertDefined<T>(value: T | undefined): asserts value {
  if (value === undefined) throw new Error('undefined');
}

const pets: Pet[] = [
  { kind: 'cat', meow: () => 'meow' },
  { kind: 'fish', swim: () => 'blub' },
];
for (const pet of pets) {
  console.log(isCat(pet) ? pet.meow() : pet.swim());
}

const input: unknown = 'text';
assertString(input, 'input');
console.log(input.toUpperCase());
try {
  assertString(5, 'five');
} catch (e) {
  console.log((e as Error).message);
}
const maybe: number | undefined = [1].find(n => n === 1);
assertDefined(maybe);
console.log(maybe + 1);

// Spread in arrays, objects and calls
const base = [1, 2, 3];
const more = [0, ...base, 4];
console.log(more, Math.max(...more), [...'hey']);

const defaults = { color: 'red', size: 1 };
const custom = { ...defaults, size: 2, extra: true };
console.log(custom);

function join(sep: string, ...parts: string[]): string {
  return parts.join(sep);
}
const words = ['a', 'b', 'c'];
console.log(join('-', ...words), join('+'));

const merged = [...new Set([...base, ...more])].sort((p, q) => q - p);
console.log(merged);

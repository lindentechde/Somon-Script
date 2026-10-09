// JSON
const data = { name: 'Ali', tags: ['a', 'b'], nested: { ok: true, n: null } };
const text = JSON.stringify(data);
console.log(text);
console.log(JSON.stringify(data, null, 2));
const parsed = JSON.parse(text) as typeof data;
console.log(parsed.tags[1], parsed.nested.ok);
console.log(JSON.stringify({ a: undefined, b: () => 1, c: [undefined] }));
console.log(
  JSON.parse('[1, 2, 3]', (key, value) => (typeof value === 'number' ? value * 2 : value))
);

// Object literals: shorthand, methods, accessors, computed keys
const key = 'dynamic';
const prefix = 'item';
let hidden = 1;
const x = 10;

const obj = {
  x,
  [key]: true,
  [`${prefix}_1`]: 'first',
  greet(name: string): string {
    return `hi ${name}`;
  },
  get hidden(): number {
    return hidden * 2;
  },
  set hidden(value: number) {
    hidden = value;
  },
  nested: { deep: { value: 'v' } },
  'quoted-key': 1,
  42: 'answer',
};

obj.hidden = 5;
console.log(obj.x, obj.dynamic, obj.item_1, obj.greet('Ali'), obj.hidden);
console.log(obj.nested.deep.value, obj['quoted-key'], obj[42], Object.keys(obj).length);

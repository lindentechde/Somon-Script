// Names that are keywords in other places
const type = 'kind';
const of = [1, 2];
const set = new Set<number>();
const get = (key: string) => key.toUpperCase();
let async = 1;
const from = 'source';
const is = (value: unknown) => value === 1;
const as = 'alias';
const declare = true;
const module_ = 'm';
const namespace = { readonly: true, keyof: 'k' };

set.add(of[0]);
async += 1;
console.log(type, of, set.size, get('x'), async, from, is(1), as, declare, module_);
console.log(namespace.readonly, namespace.keyof);
const obj = { type: 't', default: 'd', new: 'n', class: 'c', function: 'f', delete: 'x' };
console.log(obj.type, obj.default, obj.new, obj.class, obj.function, obj.delete);

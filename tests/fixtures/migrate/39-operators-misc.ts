// typeof, instanceof, in, delete, void, comma
const values: unknown[] = [1, 'a', true, null, undefined, {}, [], () => 1, 10n, Symbol('s')];
console.log(values.map(v => typeof v).join(','));

const obj: { a?: number; b: number } = { a: 1, b: 2 };
console.log('a' in obj, 'z' in obj);
delete obj.a;
console.log('a' in obj, JSON.stringify(obj));
console.log(void 0, [] instanceof Array, new Date(0) instanceof Object);

let i = 0;
const r = (i++, i++, i);
console.log(r, i);
console.log(typeof undefined === 'undefined', typeof null);

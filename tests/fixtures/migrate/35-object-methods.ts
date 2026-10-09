// Object static methods
const obj = { b: 2, a: 1 };
console.log(Object.keys(obj), Object.values(obj), Object.entries(obj));
console.log(Object.assign({}, obj, { c: 3 }), Object.fromEntries([['x', 1]]));
const frozen = Object.freeze({ v: 1 });
console.log(Object.isFrozen(frozen), Object.isFrozen(obj), Object.is(NaN, NaN), Object.is(0, -0));
console.log(Object.hasOwn(obj, 'a'), Object.getOwnPropertyNames(obj).sort());
const proto = { hello: () => 'hi' };
const child = Object.create(proto);
console.log(child.hello(), Object.getPrototypeOf(child) === proto);
Object.defineProperty(child, 'hidden', { value: 42, enumerable: false });
console.log(child.hidden, Object.keys(child).length);
const sealed = Object.seal({ s: 1 });
console.log(Object.isSealed(sealed), Object.isExtensible(sealed));

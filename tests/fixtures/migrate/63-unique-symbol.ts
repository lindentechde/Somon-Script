// unique symbol and symbol-keyed objects
const KEY: unique symbol = Symbol('key');
const holder = { [KEY]: 'secret', visible: 'yes' };
console.log(holder[KEY], Object.keys(holder), Object.getOwnPropertySymbols(holder).length);
const registry = new Map<symbol, string>([[KEY, 'registered']]);
console.log(registry.get(KEY), Symbol.for('app') === Symbol.for('app'));

// Map and Set
const ages = new Map<string, number>([['ali', 30]]);
ages.set('vali', 25).set('sami', 41);
console.log(ages.size, ages.get('vali'), ages.has('nobody'), ages.get('nobody'));
ages.delete('ali');
console.log([...ages.keys()], [...ages.values()], [...ages.entries()]);
ages.forEach((age, name) => console.log(name, age));

const seen = new Set<number>([1, 2, 2, 3]);
seen.add(4);
seen.delete(1);
console.log(seen.size, seen.has(2), [...seen]);
const wm = new WeakMap<object, string>();
const key = {};
wm.set(key, 'value');
console.log(wm.get(key), wm.has({}));
ages.clear();
console.log(ages.size);

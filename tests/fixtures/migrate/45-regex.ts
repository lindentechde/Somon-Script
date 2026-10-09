// Regular expressions
const email = /^[\w.]+@[\w]+\.[a-z]{2,}$/i;
console.log(email.test('a.b@site.org'), email.test('nope'));

const date = /(\d{4})-(\d{2})-(\d{2})/;
const match = '2024-05-17'.match(date);
console.log(match?.[1], match?.[2], match?.[3]);

const named = /(?<year>\d{4})/u.exec('in 1999');
console.log(named?.groups?.year);

console.log('a1b22c333'.replace(/\d+/g, n => `[${n.length}]`));
console.log('one two  three'.split(/\s+/));
const re = new RegExp('o', 'g');
console.log('foo boo'.match(re)?.length, re.flags, re.source);
const ratio = 10 / 2 / 5;
console.log(ratio);

// Comparison and logical operators
const n = 5;
const s = '5';
console.log(n == (s as unknown as number), n === Number(s), n != 6, n !== 5);
console.log(n < 10, n > 10, n <= 5, n >= 6);
console.log(true && false, true || false, !true, !!n);

const pick = (v: number) => (v > 3 ? 'big' : v > 1 ? 'medium' : 'small');
console.log(pick(5), pick(2), pick(0));
console.log(null ?? 'fallback', 0 ?? 'zero', '' || 'empty', 0 && 'never');

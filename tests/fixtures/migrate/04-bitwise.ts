// Bitwise operators and shifts
const a = 12;
const b = 10;
console.log(a & b, a | b, a ^ b, ~a);
console.log(a << 2, a >> 2, -a >>> 28);

let flags = 0;
flags |= 1;
flags |= 4;
flags &= ~1;
flags ^= 2;
flags <<= 1;
flags >>= 1;
flags >>>= 0;
console.log(flags, (flags & 4) !== 0);

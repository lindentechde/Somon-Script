// let, const and var declarations
let count: number = 1;
const label: string = 'items';
var legacy = 'var';
let a = 1,
  b = 2;
count += a + b;
console.log(count, label, legacy);

let notAssigned: number | undefined;
console.log(notAssigned === undefined, typeof notAssigned);

const big = 1_000_000;
console.log(big, 0xff, 0b101, 0o17, 1e3, 0.5);

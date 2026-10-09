// Classic for loops, labels, break and continue
let total = 0;
for (let i = 0; i < 10; i++) {
  if (i % 2 === 0) continue;
  if (i > 7) break;
  total += i;
}
console.log(total);

outer: for (let i = 0; i < 3; i++) {
  for (let j = 0; j < 3; j++) {
    if (j === 1) continue outer;
    if (i === 2) break outer;
    console.log(i, j);
  }
}

for (let i = 0, j = 10; i < j; i += 3, j -= 3) {
  console.log('pair', i, j);
}

let k = 0;
for (;;) {
  if (++k > 2) break;
}
console.log(k);

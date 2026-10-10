// Labeled blocks, nested loops and blocks
block: {
  console.log('inside block');
  if (Math.min(1, 2) === 1) break block;
  console.log('never printed');
}

let found = '';
search: for (const row of [
  [1, 2],
  [3, 4],
  [5, 6],
]) {
  for (const cell of row) {
    if (cell === 4) {
      found = `found ${cell}`;
      break search;
    }
  }
}
console.log(found);

{
  const scoped = 'block scope';
  console.log(scoped);
}
let counter = 0;
while (true) {
  if (++counter === 3) break;
}
console.log(counter);

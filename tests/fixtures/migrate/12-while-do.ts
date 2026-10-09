// while and do...while
let i = 0;
while (i < 3) {
  console.log('while', i);
  i++;
}

let j = 0;
do {
  j += 2;
} while (j < 5);
console.log('do', j);

let k = 0;
do k++;
while (k < 4);
console.log('do without block', k);

let n = 27;
let steps = 0;
while (n !== 1) {
  n = n % 2 === 0 ? n / 2 : 3 * n + 1;
  steps++;
}
console.log('collatz', steps);

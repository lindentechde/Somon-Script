// if / else if / else
function classify(n: number): string {
  if (n < 0) {
    return 'negative';
  } else if (n === 0) {
    return 'zero';
  } else if (n < 10) {
    return 'small';
  } else {
    return 'large';
  }
}

for (const n of [-5, 0, 7, 42]) {
  console.log(n, classify(n));
}

let message = '';
if (message) message = 'set';
else message = 'empty';
console.log(message);

// for...of and for...in
const fruits = ['apple', 'pear', 'plum'];
for (const fruit of fruits) {
  console.log(fruit.toUpperCase());
}
for (const [index, fruit] of fruits.entries()) {
  console.log(index, fruit);
}

const scores: Record<string, number> = { ali: 3, vali: 5 };
for (const key in scores) {
  console.log(key, scores[key]);
}
for (const [key, value] of Object.entries(scores)) {
  console.log(`${key}=${value}`);
}
for (const ch of 'hey') console.log(ch);

// Template literals and tagged templates
const name = 'World';
const n = 3;
console.log(`Hello, ${name}!`);
console.log(`${n} + ${n} = ${n + n}`);
console.log(`multi
line`);

function tag(strings: TemplateStringsArray, ...values: unknown[]): string {
  return strings.raw.join('|') + ' / ' + values.join(',');
}
console.log(tag`a${1}b${'two'}c`);
console.log(String.raw`\n${n}`);
console.log(`nested ${`inner ${name.toUpperCase()}`}`);

// String methods
const text = '  Hello, World  ';
const s = text.trim();
console.log(
  s.length,
  s.toUpperCase(),
  s.toLowerCase(),
  text.trimStart().length,
  text.trimEnd().length
);
console.log(s.split(', '), s.replace('World', 'There'), 'a-b-c'.replaceAll('-', '+'));
console.log(
  s.startsWith('Hell'),
  s.endsWith('!'),
  s.includes('lo'),
  s.indexOf('o'),
  s.lastIndexOf('o')
);
console.log(s.slice(0, 5), s.substring(7), s.charAt(1), s.charCodeAt(0), s.at(-1));
console.log('7'.padStart(3, '0'), '7'.padEnd(3, '.'), 'ab'.repeat(3), 'a'.concat('b', 'c'));
console.log('b'.localeCompare('a'), 'Ā'.codePointAt(0), String.fromCharCode(72, 105));
console.log(
  'x1y2'.match(/\d/g),
  [...'a1b2'.matchAll(/\d/g)].map(m => m[0]),
  'abc'.search(/c/)
);
console.log('café'.normalize('NFD').length, String(123), (12.345).toFixed(1));

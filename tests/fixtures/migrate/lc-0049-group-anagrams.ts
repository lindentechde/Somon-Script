// LeetCode 49. Group Anagrams: the sorted letters are the key.
function groupAnagrams(words: string[]): string[][] {
  const groups = new Map<string, string[]>();
  for (const word of words) {
    const key = word.split('').sort().join('');
    const group = groups.get(key);
    if (group) group.push(word);
    else groups.set(key, [word]);
  }
  return [...groups.values()];
}

function normalize(groups: string[][]): string[][] {
  return groups.map(g => [...g].sort()).sort((a, b) => a[0].localeCompare(b[0]));
}

let failures = 0;
function check(name: string, actual: unknown, expected: unknown): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    console.log('✓ ' + name);
  } else {
    console.log(`✗ ${name}: expected ${e}, got ${a}`);
    failures++;
  }
}

check('example', normalize(groupAnagrams(['eat', 'tea', 'tan', 'ate', 'nat', 'bat'])), [
  ['ate', 'eat', 'tea'],
  ['bat'],
  ['nat', 'tan'],
]);
check('empty string', groupAnagrams(['']), [['']]);
check('single', groupAnagrams(['a']), [['a']]);
console.log(failures === 0 ? 'all passed' : `${failures} failed`);

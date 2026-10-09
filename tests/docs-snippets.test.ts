import * as fs from 'fs';
import * as path from 'path';
import { compile } from '../src/compiler';

/**
 * Every ```som block in the user-facing documentation must compile. Type
 * checking is off because many snippets reference names defined elsewhere
 * in the surrounding prose; syntax and code generation errors still fail.
 */
const ROOT = path.join(__dirname, '..');

function markdownFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return markdownFiles(full);
    return entry.name.endsWith('.md') ? [full] : [];
  });
}

/** Fenced blocks tagged `som`; a fence closes only at a fence of the same length. */
function somBlocks(file: string): Array<{ line: number; code: string }> {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  const blocks: Array<{ line: number; code: string }> = [];
  for (let i = 0; i < lines.length; i++) {
    const open = /^\s*(`{3,})(som|somon|somonscript)\s*$/.exec(lines[i]);
    if (!open) continue;
    const close = new RegExp(`^\\s*${open[1]}\\s*$`);
    const body: string[] = [];
    let j = i + 1;
    while (j < lines.length && !close.test(lines[j])) body.push(lines[j++]);
    blocks.push({ line: i + 1, code: body.join('\n') });
    i = j;
  }
  return blocks;
}

const files = [
  ...fs.readdirSync(ROOT).filter(name => /^(README.*|DEPLOYMENT|CONTRIBUTING)\.md$/.test(name)),
  ...['llm-guide', 'docs', 'examples'].flatMap(dir =>
    markdownFiles(path.join(ROOT, dir)).map(file => path.relative(ROOT, file))
  ),
];

const snippets = files.flatMap(file =>
  somBlocks(path.join(ROOT, file)).map(block => [`${file}:${block.line}`, block.code] as const)
);

describe('documentation snippets', () => {
  test('the docs contain SomonScript snippets', () => {
    expect(snippets.length).toBeGreaterThan(100);
  });

  test.each(snippets)('%s compiles', (_location, code) => {
    expect(compile(code, { typeCheck: false }).errors).toEqual([]);
  });
});

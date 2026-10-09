import * as fs from 'fs';
import * as path from 'path';
import ts from 'typescript';
import { compile } from '../src/compiler';
import { Lexer } from '../src/lexer';
import { Parser } from '../src/parser';
import { format } from '../src/tools/format';

/**
 * The formatter on every SomonScript program in the repository: the .som
 * files (examples/, examples/leetcode/, …), the ```som blocks of the
 * documentation, the programs of tests/operators.test.ts and the valid
 * programs of tests/ts-syntax-*.test.ts. Formatting must succeed, be
 * idempotent and compile to the same JavaScript.
 */
const ROOT = path.join(__dirname, '..');
const SKIPPED = new Set(['node_modules', 'dist', 'coverage']);

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    // Hidden directories hold no sources of this repository, only tool state such as
    // .git or other checkouts of it (.claude/worktrees), which would count twice
    if (SKIPPED.has(entry.name) || (entry.isDirectory() && entry.name.startsWith('.'))) return [];
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const files = walk(ROOT);

const somFiles = files
  .filter(file => file.endsWith('.som'))
  .map(file => [path.relative(ROOT, file), fs.readFileSync(file, 'utf8')] as const);

/** ```som blocks of the files that tests/docs-snippets.test.ts checks. */
const docFiles = files.filter(file => {
  const relative = path.relative(ROOT, file);
  return (
    /^(README.*|DEPLOYMENT|CONTRIBUTING)\.md$/.test(relative) ||
    (/^(llm-guide|docs|examples)[\\/]/.test(relative) && relative.endsWith('.md'))
  );
});

const snippets = docFiles.flatMap(file => {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  const blocks: Array<readonly [string, string]> = [];
  for (let i = 0; i < lines.length; i++) {
    const open = /^\s*(`{3,})(som|somon|somonscript)\s*$/.exec(lines[i]);
    if (!open) continue;
    const close = new RegExp(`^\\s*${open[1]}\\s*$`);
    const body: string[] = [];
    let j = i + 1;
    while (j < lines.length && !close.test(lines[j])) body.push(lines[j++]);
    blocks.push([`${path.relative(ROOT, file)}:${i + 1}`, body.join('\n')]);
    i = j;
  }
  return blocks;
});

/** The SomonScript programs in the `test.each` tables of tests/operators.test.ts. */
function operatorPrograms(): Array<readonly [string, string]> {
  const file = path.join(__dirname, 'operators.test.ts');
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest);
  const programs: Array<readonly [string, string]> = [];
  const visit = (node: ts.Node): void => {
    if (ts.isArrayLiteralExpression(node) && node.elements.length === 3) {
      const [name, program] = node.elements;
      if (ts.isStringLiteralLike(name) && ts.isStringLiteralLike(program)) {
        programs.push([`operators: ${name.text}`, program.text]);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return programs;
}

/** Helpers of tests/ts-syntax-*.test.ts whose first argument is a SomonScript program. */
const PROGRAM_HELPERS = new Set([
  'run',
  'check',
  'expectClean',
  'generator',
  'generate',
  'compiled',
  'compile',
  'parse',
  'parseOk',
  'errorsOf',
  'classOf',
]);

/** A string literal, or `['…', '…'].join('\n')`. */
function programText(node: ts.Expression | undefined): string | undefined {
  if (!node) return undefined;
  if (ts.isStringLiteralLike(node)) return node.text;
  if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression)) {
    return undefined;
  }
  const lines = node.expression.expression;
  const separator = node.arguments[0];
  if (node.expression.name.text !== 'join' || !ts.isArrayLiteralExpression(lines)) return undefined;
  if (!separator || !ts.isStringLiteralLike(separator)) return undefined;
  if (!lines.elements.every(ts.isStringLiteralLike)) return undefined;
  return lines.elements.map(line => (line as ts.StringLiteralLike).text).join(separator.text);
}

function parses(source: string): boolean {
  try {
    const parser = new Parser(new Lexer(source).tokenize());
    parser.parse();
    return parser.getErrors().length === 0;
  } catch {
    return false;
  }
}

/** The valid programs of the TypeScript 5 syntax tests (decorators, эълон, истифода, …). */
function syntaxTestPrograms(): Array<readonly [string, string]> {
  const programs: Array<readonly [string, string]> = [];
  for (const name of fs
    .readdirSync(__dirname)
    .filter(file => /^ts-syntax-.*\.test\.ts$/.test(file))) {
    const file = path.join(__dirname, name);
    const source = ts.createSourceFile(
      file,
      fs.readFileSync(file, 'utf8'),
      ts.ScriptTarget.Latest,
      true
    );
    const visit = (node: ts.Node): void => {
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        PROGRAM_HELPERS.has(node.expression.text)
      ) {
        const program = programText(node.arguments[0]);
        const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
        if (program !== undefined && parses(program)) programs.push([`${name}:${line}`, program]);
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return programs;
}

const programs = [...somFiles, ...snippets, ...operatorPrograms(), ...syntaxTestPrograms()];

describe('formatter on every SomonScript program in the repository', () => {
  test('finds the programs', () => {
    expect(somFiles.length).toBeGreaterThan(150);
    expect(somFiles.filter(([name]) => name.includes('leetcode')).length).toBeGreaterThanOrEqual(
      100
    );
    expect(snippets.length).toBeGreaterThan(100);
    expect(operatorPrograms().length).toBeGreaterThan(80);
    expect(syntaxTestPrograms().length).toBeGreaterThan(100);
    expect(snippets.filter(([name]) => name.includes('16-targets')).length).toBeGreaterThan(0);
  });

  test.each(programs)('%s', (_name, source) => {
    const formatted = format(source);
    expect(format(formatted)).toBe(formatted);
    expect(compile(formatted, { typeCheck: false }).code).toBe(
      compile(source, { typeCheck: false }).code
    );
  });

  test('the LeetCode examples are already in the canonical style', () => {
    const changed = somFiles
      .filter(([name]) => name.includes('leetcode'))
      .filter(([, source]) => format(source) !== source)
      .map(([name]) => name);
    expect(changed).toEqual([]);
  });
});

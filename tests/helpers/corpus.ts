/**
 * The SomonScript programs of the repository, for tests that run over all of
 * them: the examples (with the LeetCode solutions and the module demos), the
 * programs of tests/operators.test.ts and the ```som snippets of the docs.
 */
import * as fs from 'fs';
import * as path from 'path';
import ts from 'typescript';

export const ROOT = path.join(__dirname, '..', '..');

export interface CorpusProgram {
  /** Display name: the path relative to the repository, or a test name. */
  name: string;
  source: string;
  /** Absolute path for programs that are files. */
  file?: string;
  kind: 'example' | 'leetcode' | 'module' | 'operator' | 'doc';
}

function somFiles(dir: string): string[] {
  return fs
    .readdirSync(dir)
    .filter(file => file.endsWith('.som'))
    .sort()
    .map(file => path.join(dir, file));
}

function fileProgram(file: string, kind: CorpusProgram['kind']): CorpusProgram {
  return {
    name: path.relative(ROOT, file).split(path.sep).join('/'),
    file,
    source: fs.readFileSync(file, 'utf8'),
    kind,
  };
}

/** Directories of examples whose files import each other. */
export const MODULE_DIRS = ['examples/37-module-imports-demo', 'examples/modules'];

export function examplePrograms(): CorpusProgram[] {
  return [
    ...somFiles(path.join(ROOT, 'examples')).map(file => fileProgram(file, 'example')),
    ...somFiles(path.join(ROOT, 'examples', 'leetcode')).map(file => fileProgram(file, 'leetcode')),
    ...MODULE_DIRS.flatMap(dir =>
      somFiles(path.join(ROOT, dir)).map(file => fileProgram(file, 'module'))
    ),
  ];
}

/** The `[name, source, expected output]` programs of tests/operators.test.ts. */
export function operatorPrograms(): CorpusProgram[] {
  const file = path.join(ROOT, 'tests', 'operators.test.ts');
  const sourceFile = ts.createSourceFile(
    file,
    fs.readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest
  );
  const programs: CorpusProgram[] = [];
  const visit = (node: ts.Node): void => {
    if (
      ts.isArrayLiteralExpression(node) &&
      node.elements.length === 3 &&
      node.elements.every(ts.isStringLiteralLike)
    ) {
      const [name, source] = node.elements as unknown as ts.StringLiteralLike[];
      programs.push({ name: `operators: ${name.text}`, source: source.text, kind: 'operator' });
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return programs;
}

function markdownFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return markdownFiles(full);
    return entry.name.endsWith('.md') ? [full] : [];
  });
}

/** Every ```som block of the documentation (as tests/docs-snippets.test.ts finds them). */
export function docPrograms(): CorpusProgram[] {
  const files = [
    ...fs
      .readdirSync(ROOT)
      .filter(name => /^(README.*|DEPLOYMENT|CONTRIBUTING)\.md$/.test(name))
      .map(name => path.join(ROOT, name)),
    ...['llm-guide', 'docs', 'examples'].flatMap(dir => markdownFiles(path.join(ROOT, dir))),
  ];
  return files.flatMap(file => {
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    const programs: CorpusProgram[] = [];
    for (let i = 0; i < lines.length; i++) {
      const open = /^\s*(`{3,})(som|somon|somonscript)\s*$/.exec(lines[i]);
      if (!open) continue;
      const close = new RegExp(`^\\s*${open[1]}\\s*$`);
      const body: string[] = [];
      let j = i + 1;
      while (j < lines.length && !close.test(lines[j])) body.push(lines[j++]);
      programs.push({
        name: `${path.relative(ROOT, file)}:${i + 1}`,
        source: body.join('\n'),
        kind: 'doc',
      });
      i = j;
    }
    return programs;
  });
}

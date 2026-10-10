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
  kind: 'example' | 'leetcode' | 'module' | 'operator' | 'doc' | 'ts-syntax';
  /** ts-syntax: the helper the test passes the program to (`run`, `check`, `expectClean`, …). */
  helper?: string;
  /** ts-syntax: the program needs TypeScript's legacy decorators. */
  experimentalDecorators?: boolean;
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

/** Helpers of tests/ts-syntax-*.test.ts whose first argument is a program. */
const TS_SYNTAX_HELPERS = new Set([
  'run',
  'compiled',
  'generate',
  'generator',
  'check',
  'expectClean',
  'parse',
  'parseOk',
  'errorsOf',
  'classOf',
]);

/** A string literal, or string literals `[…].join('\n')`: the program text. */
function programText(node: ts.Expression): string | undefined {
  if (ts.isStringLiteralLike(node)) return node.text;
  if (
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression) &&
    node.expression.name.text === 'join' &&
    ts.isArrayLiteralExpression(node.expression.expression) &&
    node.expression.expression.elements.every(ts.isStringLiteralLike) &&
    node.arguments.length === 1 &&
    ts.isStringLiteralLike(node.arguments[0])
  ) {
    const lines = node.expression.expression.elements as unknown as ts.StringLiteralLike[];
    return lines.map(line => line.text).join(node.arguments[0].text);
  }
  return undefined;
}

/** `{ experimentalDecorators: true }` or `generator(…, true)`. */
function usesLegacyDecorators(call: ts.CallExpression): boolean {
  const options = call.arguments[1];
  if (!options) return false;
  if (options.kind === ts.SyntaxKind.TrueKeyword) return true;
  return (
    ts.isObjectLiteralExpression(options) &&
    options.properties.some(
      property =>
        ts.isPropertyAssignment(property) &&
        property.name.getText() === 'experimentalDecorators' &&
        property.initializer.kind === ts.SyntaxKind.TrueKeyword
    )
  );
}

/**
 * The programs of tests/ts-syntax-*.test.ts (the TypeScript 5 declaration
 * syntax): the first argument of the tests' helpers, once each. `helper`
 * says what the test expects of it: `run` and `expectClean` programs are
 * correct, `check` ones may have type errors, `parse`/`errorsOf` ones may
 * not even parse.
 */
export function tsSyntaxPrograms(): CorpusProgram[] {
  const files = fs
    .readdirSync(path.join(ROOT, 'tests'))
    .filter(name => /^ts-syntax-.*\.test\.ts$/.test(name))
    .sort();
  const programs = new Map<string, CorpusProgram>();
  for (const name of files) {
    const file = path.join(ROOT, 'tests', name);
    const sourceFile = ts.createSourceFile(
      file,
      fs.readFileSync(file, 'utf8'),
      ts.ScriptTarget.Latest,
      true
    );
    const visit = (node: ts.Node): void => {
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        TS_SYNTAX_HELPERS.has(node.expression.text) &&
        node.arguments.length > 0
      ) {
        const source = programText(node.arguments[0]);
        if (source !== undefined && !programs.has(source)) {
          const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
          programs.set(source, {
            name: `${name}:${line + 1}`,
            source,
            kind: 'ts-syntax',
            helper: node.expression.text,
            experimentalDecorators: usesLegacyDecorators(node),
          });
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }
  return [...programs.values()];
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

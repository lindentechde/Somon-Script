/**
 * The TypeScript emitter over every program of the repository (examples,
 * LeetCode solutions, operators, documentation snippets and the TypeScript 5
 * syntax programs of tests/ts-syntax-*.test.ts): the emitted TypeScript has
 * no syntax errors, and, transpiled by TypeScript, it runs exactly like the
 * JavaScript the compiler emits.
 */
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import ts from 'typescript';
import { compile } from '../src/compiler';
import { Lexer } from '../src/lexer';
import { Parser } from '../src/parser';
import { TsEmitter } from '../src/ts-emitter';
import {
  CorpusProgram,
  MODULE_DIRS,
  ROOT,
  docPrograms,
  examplePrograms,
  operatorPrograms,
  tsSyntaxPrograms,
} from './helpers/corpus';

jest.setTimeout(300000);

function emitTypeScript(source: string, experimentalDecorators = false): string | undefined {
  const parser = new Parser(new Lexer(source).tokenize());
  const ast = parser.parse();
  if (parser.getErrors().length > 0) return undefined;
  const emitter = new TsEmitter({ experimentalDecorators });
  const code = emitter.generate(ast);
  expect(emitter.getErrors()).toEqual([]);
  return code;
}

function syntaxErrors(code: string, experimentalDecorators = false): string[] {
  const { diagnostics } = ts.transpileModule(code, {
    reportDiagnostics: true,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.Preserve,
      experimentalDecorators,
    },
  });
  return (diagnostics ?? []).map(diagnostic => {
    const { line, character } = diagnostic.file!.getLineAndCharacterOfPosition(diagnostic.start!);
    return `${line + 1}:${character + 1} ${ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ')}`;
  });
}

/** TypeScript → CommonJS JavaScript, with class fields as the compiler emits them. */
function transpile(code: string, experimentalDecorators = false): string {
  return ts
    .transpileModule(code, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.CommonJS,
        useDefineForClassFields: true,
        esModuleInterop: true,
        experimentalDecorators,
      },
    })
    .outputText.replace(/^"use strict";\n/, '');
}

const examples = examplePrograms();
/** The TypeScript 5 syntax programs the compiler accepts (some tests expect errors). */
const tsSyntax = tsSyntaxPrograms().filter(
  program =>
    compile(program.source, {
      typeCheck: false,
      experimentalDecorators: program.experimentalDecorators,
    }).errors.length === 0
);
const allPrograms: CorpusProgram[] = [
  ...examples,
  ...operatorPrograms(),
  ...docPrograms(),
  ...tsSyntax,
];

describe('emitted TypeScript has no syntax errors', () => {
  test('the corpus is complete', () => {
    expect(examples.filter(program => program.kind === 'leetcode')).toHaveLength(100);
    expect(tsSyntax.length).toBeGreaterThan(100);
    expect(allPrograms.length).toBeGreaterThan(600);
  });

  test.each(allPrograms.map(program => [program.name, program] as const))(
    '%s',
    (_name, program) => {
      const code = emitTypeScript(program.source, program.experimentalDecorators);
      // Documentation snippets may be fragments that do not parse on their own
      if (code === undefined) {
        expect(program.kind).toBe('doc');
        return;
      }
      expect(syntaxErrors(code, program.experimentalDecorators)).toEqual([]);
    }
  );
});

/** Makes runs comparable: seeded Math.random, a fixed clock, and timers that print 0ms. */
const PRELOAD = `
let seed = 42;
Math.random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const RealDate = Date;
const NOW = RealDate.UTC(2024, 0, 1, 12, 0, 0);
globalThis.Date = class extends RealDate {
  constructor(...args) { super(...(args.length > 0 ? args : [NOW])); }
  static now() { return NOW; }
};
performance.now = () => 0;
for (const name of ['time', 'timeEnd', 'timeLog']) {
  console[name] = (label = 'default', ...rest) => console.log(label + ': 0ms', ...rest);
}
`;

interface Run {
  name: string;
  dir: string;
  file: string;
}

function runNode(run: Run, preload: string): Promise<string> {
  return new Promise(resolve => {
    const child = spawn(process.execPath, ['-r', preload, run.file], {
      cwd: run.dir,
      env: { ...process.env, NODE_OPTIONS: '' },
    });
    // The two streams are compared separately: their interleaving is not deterministic
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', chunk => (stdout += chunk));
    child.stderr.on('data', chunk => (stderr += chunk));
    const timer = setTimeout(() => child.kill(), 30000);
    child.on('close', status => {
      clearTimeout(timer);
      resolve(`${stdout}\n--- stderr\n${stderr}\nexit ${status}`);
    });
  });
}

/** Output without what differs between the two builds: paths, stacks, import helper names. */
function normalize(output: string): string {
  return (
    output
      .split('\n')
      .filter(line => !/^\s+at /.test(line))
      .join('\n')
      // The run's own directory, with either separator (Windows prints `C:\…\js\main.js`)
      .replace(/(?:[A-Za-z]:)?[\\/][^\s'"]*[\\/](js|ts)[\\/]/g, '<dir>/')
      .replace(/[\p{L}\p{N}_$]+_js_\d+\.(?:default\.)?/gu, '')
      .replace(/requireStack: \[[^\]]*\]/g, 'requireStack: []')
  );
}

/**
 * Writes `programs` compiled to JavaScript into `<dir>/js` and their
 * TypeScript, transpiled, into `<dir>/ts` (as `name.js`, so imports resolve).
 */
function writeBoth(programs: CorpusProgram[], dir: string): void {
  fs.mkdirSync(path.join(dir, 'js'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'ts'), { recursive: true });
  for (const program of programs) {
    const name = `${path.basename(program.file ?? program.name, '.som')}.js`;
    const { experimentalDecorators } = program;
    const javascript = compile(program.source, { typeCheck: false, experimentalDecorators });
    expect(javascript.errors).toEqual([]);
    fs.writeFileSync(path.join(dir, 'js', name), javascript.code);
    const typescript = emitTypeScript(program.source, experimentalDecorators)!;
    fs.writeFileSync(path.join(dir, 'ts', name), transpile(typescript, experimentalDecorators));
  }
}

describe('transpiled TypeScript runs like the JavaScript output', () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'somon-ts-corpus-'));
  const preload = path.join(workspace, 'preload.js');
  const runs: Array<{ name: string; js: Run; ts: Run }> = [];

  beforeAll(() => {
    fs.writeFileSync(preload, PRELOAD);
    const groups: Array<[string, CorpusProgram[]]> = [
      ['examples', examples.filter(program => program.kind === 'example')],
      ['leetcode', examples.filter(program => program.kind === 'leetcode')],
      ...MODULE_DIRS.map(
        dir =>
          [dir, examples.filter(program => program.file?.startsWith(path.join(ROOT, dir)))] as [
            string,
            CorpusProgram[],
          ]
      ),
    ];
    groups.forEach(([group, programs], index) => {
      const dir = path.join(workspace, String(index));
      writeBoth(programs, dir);
      const entries = MODULE_DIRS.includes(group)
        ? programs.filter(program => path.basename(program.file!) === 'main.som')
        : programs;
      for (const program of entries) {
        const file = `${path.basename(program.file!, '.som')}.js`;
        runs.push({
          name: program.name,
          js: { name: program.name, dir: path.join(dir, 'js'), file },
          ts: { name: program.name, dir: path.join(dir, 'ts'), file },
        });
      }
    });
    // Programs that print, without modules of their own to import
    const printing = tsSyntax.filter(
      program => program.helper === 'run' && !/аз "\.\.?\//.test(program.source)
    );
    [...operatorPrograms(), ...printing].forEach((program, index) => {
      const dir = path.join(workspace, `operator-${index}`);
      writeBoth([{ ...program, name: 'main' }], dir);
      runs.push({
        name: program.name,
        js: { name: program.name, dir: path.join(dir, 'js'), file: 'main.js' },
        ts: { name: program.name, dir: path.join(dir, 'ts'), file: 'main.js' },
      });
    });
  });

  afterAll(() => {
    fs.rmSync(workspace, { recursive: true, force: true });
  });

  test('every program prints the same output', async () => {
    expect(runs.length).toBeGreaterThan(250);
    const differences: string[] = [];
    const queue = [...runs];
    const worker = async (): Promise<void> => {
      for (let run = queue.shift(); run; run = queue.shift()) {
        const [javascript, typescript] = await Promise.all([
          runNode(run.js, preload),
          runNode(run.ts, preload),
        ]);
        if (normalize(javascript) !== normalize(typescript)) {
          differences.push(`${run.name}\n--- js\n${javascript}\n--- ts\n${typescript}`);
        }
      }
    };
    await Promise.all(Array.from({ length: Math.max(2, os.cpus().length) }, worker));
    expect(differences).toEqual([]);
  });
});

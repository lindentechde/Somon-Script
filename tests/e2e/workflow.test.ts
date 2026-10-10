/**
 * End to end: a project's life with the built CLI (`node dist/cli.js`), each
 * step checking the files written, the output, the exit code and, where code
 * is produced, running it: init → compile → run → bundle (commonjs, esm
 * imported by Node, iife in a vm) → check (both checkers) → fmt → migrate a
 * TypeScript project → one language server session.
 */
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as vm from 'vm';

import { buildCliOnce, canonicalTmpDir } from '../helpers/paths';
import { node, somon } from '../helpers/cli-process';

jest.setTimeout(120000);

const MATH = [
  'содир функсия ҷамъ(а: рақам, б: рақам): рақам {',
  '    бозгашт а + б;',
  '}',
  '',
  'содир пешфарз синф Ҳисобкунак {',
  '    хосусӣ натиҷа: рақам = 0;',
  '    ҷамъкун(х: рақам): Ҳисобкунак {',
  '        ин.натиҷа = ҷамъ(ин.натиҷа, х);',
  '        бозгашт ин;',
  '    }',
  '    қимат(): рақам {',
  '        бозгашт ин.натиҷа;',
  '    }',
  '}',
  '',
].join('\n');

const MAIN = [
  'ворид Ҳисобкунак, { ҷамъ } аз "./math";',
  '',
  'функсия салом(ном: сатр): сатр {',
  '    бозгашт `Салом, ${ном}!`;',
  '}',
  '',
  'чоп.сабт(салом("ҷаҳон"));',
  'чоп.сабт(ҷамъ(40, 2), нав Ҳисобкунак().ҷамъкун(1).ҷамъкун(2).қимат());',
  '',
].join('\n');

const EXPECTED = 'Салом, ҷаҳон!\n42 3\n';

let root: string;
let app: string;

beforeAll(() => {
  buildCliOnce();
  root = canonicalTmpDir('somon-e2e-workflow-');
  app = path.join(root, 'app');
});

afterAll(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

const file = (name: string): string => path.join(app, name);
const read = (name: string): string => fs.readFileSync(file(name), 'utf8');

describe('a SomonScript project from init to bundle', () => {
  test('init creates a project whose main file compiles and runs', async () => {
    const init = await somon(['init', 'app'], { cwd: root });
    expect(init.stderr).toBe('');
    expect(init.status).toBe(0);
    expect(init.stdout).toBe(
      "✅ Created SomonScript project 'app'\n\nNext steps:\n  cd app\n  npm install\n  npm run dev\n"
    );
    expect(JSON.parse(read('package.json')).scripts.build).toBe(
      'somon compile src/main.som -o dist/main.js'
    );
    expect(JSON.parse(read('somon.config.json')).compilerOptions.outDir).toBe('dist');

    // The build script of the project
    const build = await somon(['compile', 'src/main.som', '-o', 'dist/main.js'], { cwd: app });
    expect(build).toMatchObject({ status: 0, stderr: '' });
    expect((await node([file('dist/main.js')])).stdout).toBe('Салом, ҷаҳон!\n');
    // The dev script
    expect((await somon(['run', 'src/main.som'], { cwd: app })).stdout).toBe('Салом, ҷаҳон!\n');

    const again = await somon(['init', 'app'], { cwd: root });
    expect(again).toMatchObject({ status: 1, stderr: "Error: Directory 'app' already exists\n" });
  });

  test('compile writes each module to outDir; the modules run with Node', async () => {
    fs.writeFileSync(file('src/math.som'), MATH);
    fs.writeFileSync(file('src/main.som'), MAIN);
    const [math, main] = await Promise.all(
      ['math', 'main'].map(name => somon(['compile', `src/${name}.som`], { cwd: app }))
    );
    expect(math.stdout).toBe(`Compiled 'src/math.som' to '${file('dist/math.js')}'\n`);
    expect(main.status).toBe(0);
    const run = await node([file('dist/main.js')]);
    expect(run.stderr).toBe('');
    expect(run.stdout).toBe(EXPECTED);
  });

  test('run compiles the program with its imports and runs it', async () => {
    const run = await somon(['run', 'src/main.som'], { cwd: app });
    expect(run).toEqual({ status: 0, signal: null, stdout: EXPECTED, stderr: '' });
    // The temporary files are gone, nothing is written next to the sources
    expect(fs.readdirSync(file('src')).sort()).toEqual(['main.som', 'math.som']);
  });

  test('bundle: commonjs runs, esm is imported by Node, iife runs in a vm', async () => {
    const [commonjs, esm, iife] = await Promise.all([
      somon(['bundle', 'src/main.som', '-o', 'out/app.cjs'], { cwd: app }),
      somon(['bundle', 'src/math.som', '-f', 'esm', '-o', 'out/math.mjs'], { cwd: app }),
      somon(
        [
          'bundle',
          'src/math.som',
          '--format',
          'iife',
          '--global-name',
          'Риёзиёт',
          '--target',
          'es5',
        ],
        { cwd: app }
      ),
    ]);
    expect(commonjs.stdout).toBe(
      [
        '📦 Bundling src/main.som...',
        `✅ Bundle created: ${file('out/app.cjs')}`,
        '📊 Bundled 2 modules',
        '',
      ].join('\n')
    );
    expect((await node([file('out/app.cjs')])).stdout).toBe(EXPECTED);

    expect(esm.status).toBe(0);
    fs.writeFileSync(
      file('out/use.mjs'),
      'import Ҳисоб, { ҷамъ } from "./math.mjs";\n' +
        'console.log(ҷамъ(1, 2), new Ҳисоб().ҷамъкун(5).қимат());\n'
    );
    expect(await node([file('out/use.mjs')])).toMatchObject({ stdout: '3 5\n', stderr: '' });

    expect(iife.status).toBe(0);
    const code = read('src/math.bundle.js');
    expect(code).not.toMatch(/=>|\bclass\s+[\p{L}_$]|\b(const|let)\s/u);
    const window: Record<string, any> = {};
    vm.runInNewContext(code, window);
    expect(window.Риёзиёт.ҷамъ(20, 22)).toBe(42);
    expect(new window.Риёзиёт.default().ҷамъкун(4).қимат()).toBe(4);
  });

  test('check: both checkers accept the project and reject type errors', async () => {
    fs.mkdirSync(file('checks'));
    // Only the TypeScript checker sees the types of imports
    fs.writeFileSync(
      file('checks/import.som'),
      'ворид { ҷамъ } аз "../src/math";\nтағ с: сатр = ҷамъ(1, 2);\n'
    );
    fs.writeFileSync(file('checks/local.som'), 'тағ н: рақам = "н";\n');
    const [typescript, somonChecker, tsErrors, somonErrors] = await Promise.all([
      somon(['check', 'src/main.som', 'src/math.som'], { cwd: app }),
      somon(['check', 'src/main.som', 'src/math.som', '--checker', 'somon'], { cwd: app }),
      somon(['check', 'checks/import.som', 'checks/local.som'], { cwd: app }),
      somon(['check', 'checks/local.som', '--checker', 'somon'], { cwd: app }),
    ]);
    expect(typescript).toMatchObject({ status: 0, stdout: '✅ No type errors in 2 file(s)\n' });
    expect(somonChecker).toMatchObject({ status: 0, stdout: '✅ No type errors in 2 file(s)\n' });
    expect(tsErrors.status).toBe(1);
    expect(tsErrors.stderr).toBe(
      'checks/import.som:\n' +
        "  Type error [TS2322] at line 2, column 5: Type 'рақам' is not assignable to type 'сатр'.\n" +
        '  > тағ с: сатр = ҷамъ(1, 2);\n' +
        'checks/local.som:\n' +
        "  Type error [TS2322] at line 1, column 5: Type 'сатр' is not assignable to type 'рақам'.\n" +
        '  > тағ н: рақам = "н";\n' +
        '❌ Found 2 type error(s) in 2 file(s)\n'
    );
    expect(somonErrors.status).toBe(1);
    expect(somonErrors.stderr).toBe(
      'checks/local.som:\n' +
        `  Type error [TYPE_NOT_ASSIGNABLE] at line 1, column 16: Type '"н"' is not assignable to type 'рақам'\n` +
        '  > тағ н: рақам = "н";\n' +
        '❌ Found 1 type error(s) in 1 file(s)\n'
    );
  });

  test('fmt --check finds the unformatted file, fmt --write fixes it', async () => {
    fs.writeFileSync(
      file('src/ugly.som'),
      'функсия ду(х:рақам):рақам{бозгашт х*2}\nчоп.сабт(ду(21))\n'
    );
    const check = await somon(['fmt', '--check', 'src'], { cwd: app });
    expect(check).toMatchObject({
      status: 1,
      stdout: `Not formatted: ${path.join('src', 'ugly.som')}\n`,
      stderr: '1 file(s) are not formatted\n',
    });
    const write = await somon(['fmt', '--write', 'src'], { cwd: app });
    expect(write.stdout).toBe(
      `Formatted ${path.join('src', 'ugly.som')}\n1 of 3 file(s) changed\n`
    );
    expect(read('src/ugly.som')).toBe(
      'функсия ду(х: рақам): рақам { бозгашт х * 2; }\nчоп.сабт(ду(21));\n'
    );
    expect(await somon(['fmt', '--check', 'src'], { cwd: app })).toMatchObject({
      status: 0,
      stdout: 'All 3 file(s) are formatted\n',
    });
    // Formatting keeps the meaning
    expect((await somon(['run', 'src/ugly.som'], { cwd: app })).stdout).toBe('42\n');
    expect((await somon(['run', 'src/main.som'], { cwd: app })).stdout).toBe(EXPECTED);
  });

  test('migrate converts a small TypeScript project that then runs', async () => {
    fs.mkdirSync(file('ts'));
    fs.writeFileSync(
      file('ts/util.ts'),
      [
        'export interface Point {',
        '  x: number;',
        '  y: number;',
        '}',
        '',
        'export function distance(a: Point, b: Point): number {',
        '  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);',
        '}',
        '',
        'export class Counter {',
        '  private count = 0;',
        '  increment(): number {',
        '    return ++this.count;',
        '  }',
        '}',
        '',
      ].join('\n')
    );
    fs.writeFileSync(
      file('ts/main.ts'),
      "import { distance, Counter } from './util';\n\nconst counter = new Counter();\n" +
        'counter.increment();\nconsole.log(distance({ x: 0, y: 0 }, { x: 3, y: 4 }), counter.increment());\n'
    );
    const migrate = await somon(['migrate', 'ts', '-o', 'som'], { cwd: app });
    expect(migrate.stdout).toBe(
      `Migrated '${path.join('ts', 'main.ts')}' to '${path.join('som', 'main.som')}'\n` +
        `Migrated '${path.join('ts', 'util.ts')}' to '${path.join('som', 'util.som')}'\n` +
        '2 file(s) migrated, 0 warning(s)\n'
    );
    expect(read('som/util.som')).toContain('содир функсия distance(a: Point, b: Point): рақам {');
    const [run, check] = await Promise.all([
      somon(['run', 'som/main.som'], { cwd: app }),
      somon(['check', 'som/main.som', 'som/util.som', '--strict'], { cwd: app }),
    ]);
    expect(run).toMatchObject({ status: 0, stdout: '5 2\n', stderr: '' });
    expect(check).toMatchObject({ status: 0, stdout: '✅ No type errors in 2 file(s)\n' });
  });

  test('lsp answers initialize and shuts down on request', async () => {
    const child = spawn(process.execPath, [buildCliOnce(), 'lsp', '--stdio'], {
      cwd: app,
      stdio: 'pipe',
    });
    let received = Buffer.alloc(0);
    const messages: any[] = [];
    const waiting: Array<() => void> = [];
    child.stdout.on('data', (chunk: Buffer) => {
      received = Buffer.concat([received, chunk]);
      for (;;) {
        const header = received.indexOf('\r\n\r\n');
        if (header < 0) break;
        const length = Number(
          /Content-Length: (\d+)/i.exec(received.subarray(0, header).toString())![1]
        );
        if (received.length < header + 4 + length) break;
        messages.push(
          JSON.parse(received.subarray(header + 4, header + 4 + length).toString('utf8'))
        );
        received = received.subarray(header + 4 + length);
        waiting.splice(0).forEach(wake => wake());
      }
    });
    const send = (message: object): void => {
      const body = Buffer.from(JSON.stringify({ jsonrpc: '2.0', ...message }), 'utf8');
      child.stdin.write(`Content-Length: ${body.length}\r\n\r\n`);
      child.stdin.write(body);
    };
    const response = async (id: number): Promise<any> => {
      for (;;) {
        const found = messages.find(message => message.id === id);
        if (found) return found;
        await new Promise<void>(resolve => waiting.push(resolve));
      }
    };
    const exited = new Promise<number | null>(resolve => child.on('exit', code => resolve(code)));

    send({
      id: 1,
      method: 'initialize',
      params: { processId: process.pid, rootUri: null, capabilities: {} },
    });
    const initialized = await response(1);
    expect(initialized.result.serverInfo.name).toBe('somon-lsp');
    expect(initialized.result.capabilities).toMatchObject({ hoverProvider: true });
    send({ method: 'initialized', params: {} });
    send({ id: 2, method: 'shutdown' });
    expect(await response(2)).toEqual({ jsonrpc: '2.0', id: 2, result: null });
    send({ method: 'exit' });
    expect(await exited).toBe(0);
  });
});

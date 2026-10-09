import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as vm from 'vm';

import { ModuleSystem, type BundleOptions, type CompilationResult } from '../../src/module-system';
import { compile } from '../../src/compiler';
import { createTempProject, type TempProject } from '../helpers/module-project';

/**
 * End-to-end: real multi-module projects, bundled in every format and run with
 * Node.js (commonjs, esm) or in a vm context (iife), compared with running the
 * modules compiled one by one, as plain files next to each other.
 */

interface RunResult {
  stdout: string;
  stderr: string;
  status: number | null;
}

function runNode(file: string, cwd: string): RunResult {
  const child = spawnSync(process.execPath, [file], { cwd, encoding: 'utf8' });
  return {
    stdout: child.stdout.replace(/\r\n/g, '\n').trim(),
    stderr: child.stderr,
    status: child.status,
  };
}

/** Write each compiled module where Node finds it: `x.som` → `x.js`, other files as they are. */
function writeUnbundled(result: CompilationResult, root: string, outDir: string): void {
  for (const [id, compiled] of result.modules) {
    const relative = path.relative(root, id);
    const target = path.join(outDir, relative.replace(/\.som$/, '.js'));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, id.endsWith('.som') ? compiled.code : fs.readFileSync(id));
  }
  if (fs.existsSync(path.join(root, 'node_modules'))) {
    fs.cpSync(path.join(root, 'node_modules'), path.join(outDir, 'node_modules'), {
      recursive: true,
    });
  }
}

/** The line a runner prints about the entry's exports, the same for every format. */
const SHOW_EXPORTS =
  "console.log('exports', JSON.stringify(Object.keys(m).filter(k => k !== '__esModule').sort()), " +
  "m.ҷамъ, typeof m.default === 'function' ? m.default() : m.default);";

function iifeRun(code: string): { lines: string[]; context: Record<string, any> } {
  const lines: string[] = [];
  const context = vm.createContext({
    console: { log: (...args: unknown[]) => lines.push(args.map(String).join(' ')) },
  });
  vm.runInContext(code, context);
  return { lines, context: context as Record<string, any> };
}

// ---------------------------------------------------------------------------
// A project that runs anywhere: diamond, cycles, JSON, local JavaScript,
// re-exports, `содир * чун`, type-only imports.
// ---------------------------------------------------------------------------

const PORTABLE_PROJECT: Record<string, string> = {
  'src/shared.som': [
    'чоп.сабт("бор: shared");',
    'тағ шумор = 0;',
    'содир функсия афзун(): рақам {',
    '    шумор++;',
    '    бозгашт шумор;',
    '}',
  ].join('\n'),
  'src/left.som': [
    'ворид { афзун } аз "./shared";',
    'чоп.сабт("бор: left");',
    'содир собит Ч = афзун();',
  ].join('\n'),
  'src/right.som': [
    'ворид { афзун } аз "./shared";',
    'чоп.сабт("бор: right");',
    'содир собит Р = афзун() * 10;',
  ].join('\n'),
  // Mutual recursion through namespace imports, and a named import taken
  // while the other module is still loading
  'src/even.som': [
    'ворид * чун Т аз "./odd";',
    'чоп.сабт("бор: even");',
    'содир функсия ҷуфт(н: рақам): мантиқӣ {',
    '    бозгашт н === 0 ? дуруст : Т.тоқ(н - 1);',
    '}',
  ].join('\n'),
  'src/odd.som': [
    'ворид * чун Ҷ аз "./even";',
    'ворид { ҷуфт } аз "./even";',
    'чоп.сабт("бор: odd");',
    'содир собит ҷуфтДарБор = навъи ҷуфт;',
    'содир функсия тоқ(н: рақам): мантиқӣ {',
    '    бозгашт н === 0 ? нодуруст : Ҷ.ҷуфт(н - 1);',
    '}',
  ].join('\n'),
  'src/types.som': 'содир интерфейс Нуқта {\n    х: рақам;\n    у: рақам;\n}\n',
  'src/lib/util.js': [
    "const cfg = require('./config.json');",
    "// require('./missing') in a comment is not a dependency",
    'exports.дучанд = function (х) {',
    '  return х * cfg.зариб;',
    '};',
  ].join('\n'),
  'src/lib/config.json': '{ "зариб": 2 }\n',
  'src/lib/index.som': [
    'содир * аз "./../left";',
    'содир * чун Рост аз "../right";',
    'содир { дучанд чун ду } аз "./util";',
  ].join('\n'),
  'src/data.json': '{ "ном": "лоиҳа", "рақамҳо": [1, 2, 3] }\n',
  'src/main.som': [
    'ворид навъ { Нуқта } аз "./types";',
    'ворид { Ч, Рост, ду } аз "./lib/index";',
    'ворид { ҷуфт } аз "./even";',
    'ворид { тоқ, ҷуфтДарБор } аз "./odd";',
    'ворид дода аз "./data.json";',
    'собит н: Нуқта = { х: 1, у: 2 };',
    'чоп.сабт("натиҷа", Ч, Рост.Р, ду(21), ҷуфт(10), тоқ(7), ҷуфтДарБор, дода.ном, дода.рақамҳо.дарозӣ, н.х + н.у);',
    'содир собит ҷамъ = Ч + Рост.Р;',
    'содир пешфарз функсия салом(): сатр {',
    '    бозгашт "салом " + дода.ном;',
    '}',
  ].join('\n'),
};

/** What the portable project prints, whichever way it runs. */
const PORTABLE_OUTPUT = [
  'бор: shared',
  'бор: left',
  'бор: right',
  'бор: odd',
  'бор: even',
  // the named import `ҷуфт` was read while even.som was still loading
  'натиҷа 1 20 42 true true undefined лоиҳа 3 3',
];

describe('e2e: a portable multi-module project', () => {
  let project: TempProject;
  let system: ModuleSystem;
  const entry = () => project.file('src/main.som');

  beforeAll(() => {
    project = createTempProject('somon-e2e-modules-');
    project.write(PORTABLE_PROJECT);
  });

  afterAll(async () => {
    await system?.shutdown();
    project.remove();
  });

  let warn: jest.SpyInstance;

  beforeEach(() => {
    system = new ModuleSystem({ resolution: { baseUrl: project.file('src') } });
    warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warn.mockRestore();
  });

  async function bundleTo(file: string, options: Partial<BundleOptions>): Promise<string> {
    const output = project.file(file);
    const bundle = await system.bundle({ entryPoint: entry(), outputPath: output, ...options });
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, bundle.code);
    return bundle.code;
  }

  test('compiled module by module, it prints the documented output', async () => {
    const result = await system.compile(entry());
    expect(result.errors).toEqual([]);
    // One warning for the even/odd cycle; the type-only import loads nothing
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toMatch(/^Circular dependencies detected: .*even\.som/);
    const files = [...result.modules.keys()].map(id => path.relative(project.root, id));
    expect(files.map(file => file.split(path.sep).join('/')).sort()).toEqual([
      'src/data.json',
      'src/even.som',
      'src/left.som',
      'src/lib/config.json',
      'src/lib/index.som',
      'src/lib/util.js',
      'src/main.som',
      'src/odd.som',
      'src/right.som',
      'src/shared.som',
    ]);

    const outDir = project.file('out/unbundled');
    writeUnbundled(result, project.file('src'), outDir);
    fs.writeFileSync(
      project.file('out/run-unbundled.cjs'),
      `const m = require('./unbundled/main.js');\n${SHOW_EXPORTS}\n`
    );
    const run = runNode(project.file('out/run-unbundled.cjs'), project.root);
    // Node warns about the named import read during the cycle; the bundles do not
    const stderr = run.stderr
      .split(/\r?\n/)
      .filter(line => line && !/non-existent property 'ҷуфт'|--trace-warnings/.test(line));
    expect(stderr).toEqual([]);
    expect(run.status).toBe(0);
    expect(run.stdout.split('\n')).toEqual([
      ...PORTABLE_OUTPUT,
      'exports ["default","ҷамъ"] 21 салом лоиҳа',
    ]);
  });

  test('the commonjs bundle behaves like the separate modules', async () => {
    await bundleTo('out/cjs/bundle.cjs', { format: 'commonjs' });
    // bundle() reports the cycle on the console, since it returns no warnings
    expect(warn).toHaveBeenCalledWith(
      '[module-system]',
      'Bundle compilation succeeded with warnings',
      expect.objectContaining({ warningCount: 1 })
    );
    fs.writeFileSync(
      project.file('out/cjs/run.cjs'),
      `const m = require('./bundle.cjs');\n${SHOW_EXPORTS}\n`
    );
    const run = runNode(project.file('out/cjs/run.cjs'), project.root);
    expect(run.stderr).toBe('');
    expect(run.stdout.split('\n')).toEqual([
      ...PORTABLE_OUTPUT,
      'exports ["default","ҷамъ"] 21 салом лоиҳа',
    ]);
  });

  test('the esm bundle exports the entry’s exports', async () => {
    const code = await bundleTo('out/esm/bundle.mjs', { format: 'esm' });
    expect(code).not.toMatch(/^import /m);
    fs.writeFileSync(
      project.file('out/esm/run.mjs'),
      `import * as m from './bundle.mjs';\n${SHOW_EXPORTS}\n`
    );
    const run = runNode(project.file('out/esm/run.mjs'), project.root);
    expect(run.stderr).toBe('');
    expect(run.stdout.split('\n')).toEqual([
      ...PORTABLE_OUTPUT,
      'exports ["default","ҷамъ"] 21 салом лоиҳа',
    ]);
  });

  test('the iife bundle runs without require or module and sets its global', async () => {
    const code = await bundleTo('out/iife/bundle.js', {
      format: 'iife',
      globalName: 'Лоиҳа.Асосӣ',
    });
    expect(code).not.toMatch(/\brequire\("\.|module\.exports = entryModule/);
    const { lines, context } = iifeRun(code);
    expect(lines).toEqual(PORTABLE_OUTPUT);
    const exported = context.Лоиҳа.Асосӣ;
    expect(exported.ҷамъ).toBe(21);
    expect(exported.default()).toBe('салом лоиҳа');
  });

  test('a lowered, minified bundle with source maps behaves the same', async () => {
    const es5 = new ModuleSystem({
      resolution: { baseUrl: project.file('src') },
      compilation: { target: 'es5' },
    });
    const output = project.file('out/es5/bundle.js');
    const bundle = await es5.bundle({
      entryPoint: entry(),
      outputPath: output,
      format: 'iife',
      globalName: 'Лоиҳа',
      minify: true,
      sourceMaps: true,
    });
    // es5 has no `const`, arrow functions or template literals
    expect(bundle.code).not.toMatch(/\bconst\s|=>|`/);
    expect(iifeRun(bundle.code).lines).toEqual(PORTABLE_OUTPUT);
    const map = JSON.parse(bundle.map!);
    expect(map.sources).toEqual(
      expect.arrayContaining(['../../src/main.som', '../../src/even.som'])
    );
    await es5.shutdown();
  });

  test('a real watcher reports an edit, and the next bundle has it', async () => {
    await system.compile(entry());
    const changes: string[] = [];
    let changed: () => void = () => undefined;
    const seen = new Promise<void>(resolve => (changed = resolve));
    const watcher = system.watch(entry(), {
      onChange: event => {
        changes.push(`${event.type} ${path.relative(project.root, event.filePath)}`);
        changed();
      },
      // Polling sees the edit on every file system; no wait for the write to settle
      chokidarOptions: { usePolling: true, interval: 25, awaitWriteFinish: false },
    });
    await new Promise<void>(resolve => watcher.once('ready', () => resolve()));
    const leftFile = project.file('src/left.som');
    const original = fs.readFileSync(leftFile, 'utf8');
    try {
      fs.writeFileSync(leftFile, original.replace('бор: left', 'бор: LEFT!'));
      await seen;
      expect(changes[0]).toBe(`change ${path.join('src', 'left.som')}`);
      const code = await bundleTo('out/watched/bundle.cjs', { format: 'commonjs' });
      expect(code).toContain('бор: LEFT!');
    } finally {
      fs.writeFileSync(leftFile, original);
      await system.shutdown();
    }
  });
});

// ---------------------------------------------------------------------------
// A Node.js project: packages from node_modules (CommonJS, conditional and
// ES module only exports, scoped), Node.js modules and a shebang.
// ---------------------------------------------------------------------------

const NODE_MODULES: Record<string, string> = {
  'node_modules/cjs-pkg/package.json': '{ "name": "cjs-pkg", "main": "lib/main.js" }',
  'node_modules/cjs-pkg/lib/main.js':
    "exports.ном = 'cjs-pkg';\nexports.ҷамъ = function (а, б) { return а + б; };\n",
  'node_modules/@scope/conditional/package.json': JSON.stringify({
    name: '@scope/conditional',
    exports: {
      '.': { import: './esm.mjs', require: './cjs.cjs' },
      './feature/*': './features/*.js',
    },
  }),
  'node_modules/@scope/conditional/esm.mjs': "export const тараф = 'шартӣ';\n",
  'node_modules/@scope/conditional/cjs.cjs': "exports.тараф = 'шартӣ';\n",
  'node_modules/@scope/conditional/features/x.js': "exports.хусусият = 'x';\n",
  'node_modules/esm-only/package.json': JSON.stringify({
    name: 'esm-only',
    type: 'module',
    exports: { import: './index.js' },
  }),
  'node_modules/esm-only/index.js':
    "export const ном = 'esm-only';\nexport default function салом() { return 'салом аз esm'; }\n",
};

describe('e2e: a project with packages and Node.js modules', () => {
  let project: TempProject;
  let system: ModuleSystem;

  beforeAll(() => {
    project = createTempProject('somon-e2e-packages-');
    project.write({
      ...NODE_MODULES,
      'src/helper.js': [
        "const path = require('path');",
        "const pkg = require('cjs-pkg');",
        "exports.номи = path.basename('/а/б.txt') + ':' + pkg.ном;",
      ].join('\n'),
      'src/common.som': [
        'ворид { ном, ҷамъ } аз "cjs-pkg";',
        'ворид { тараф } аз "@scope/conditional";',
        'ворид { хусусият } аз "@scope/conditional/feature/x";',
        'ворид { join } аз "node:path";',
        'ворид * чун ос аз "os";',
        'ворид { номи } аз "./helper";',
        'чоп.сабт("бор: common");',
        'содир функсия хулоса(): сатр {',
        '    бозгашт [ном, ҷамъ(2, 3), тараф, хусусият, join("а", "б").дарозӣ, навъи ос.platform, номи].join(" ");',
        '}',
      ].join('\n'),
      'src/main.som': [
        '#!/usr/bin/env node',
        'ворид { хулоса } аз "./common";',
        'чоп.сабт(хулоса());',
        'содир собит ҷамъ = 3;',
        'содир пешфарз функсия салом(): сатр { бозгашт "салом"; }',
      ].join('\n'),
      'src/esm-main.som': [
        'ворид салом, { ном } аз "esm-only";',
        'ворид { тараф } аз "@scope/conditional";',
        'ворид { join } аз "node:path";',
        'чоп.сабт(ном, салом(), тараф, join("а", "б").дарозӣ);',
        'содир собит ҷамъ = 4;',
      ].join('\n'),
    });
  });

  afterAll(async () => {
    await system?.shutdown();
    project.remove();
  });

  beforeEach(() => {
    system = new ModuleSystem({ resolution: { baseUrl: project.file('src') } });
  });

  const OUTPUT = ['бор: common', 'cjs-pkg 5 шартӣ x 3 function б.txt:cjs-pkg'];
  const EXPORTS = 'exports ["default","ҷамъ"] 3 салом';

  test('compiled module by module and as commonjs and esm bundles, it prints the same', async () => {
    const result = await system.compile(project.file('src/main.som'));
    expect(result.errors).toEqual([]);
    // Packages and Node.js modules are not compiled
    expect([...result.modules.keys()].map(id => path.basename(id)).sort()).toEqual([
      'common.som',
      'helper.js',
      'main.som',
    ]);
    writeUnbundled(result, project.file('src'), project.file('out/unbundled'));
    fs.writeFileSync(
      project.file('out/run-unbundled.cjs'),
      `const m = require('./unbundled/main.js');\n${SHOW_EXPORTS}\n`
    );
    const unbundled = runNode(project.file('out/run-unbundled.cjs'), project.root);
    expect(unbundled.stderr).toBe('');
    expect(unbundled.stdout.split('\n')).toEqual([...OUTPUT, EXPORTS]);

    // The bundles stay next to the project, where Node finds its node_modules
    const commonjs = await system.bundle({
      entryPoint: project.file('src/main.som'),
      format: 'commonjs',
    });
    // The entry's shebang starts the bundle, which then runs as a program
    expect(commonjs.code.split('\n')[0]).toBe('#!/usr/bin/env node');
    expect(commonjs.code).not.toContain(project.root);
    fs.mkdirSync(project.file('dist'), { recursive: true });
    fs.writeFileSync(project.file('dist/main.cjs'), commonjs.code);
    expect(runNode(project.file('dist/main.cjs'), project.root)).toEqual({
      stdout: OUTPUT.join('\n'),
      stderr: '',
      status: 0,
    });
    fs.writeFileSync(
      project.file('dist/run.cjs'),
      `const m = require('./main.cjs');\n${SHOW_EXPORTS}\n`
    );
    expect(runNode(project.file('dist/run.cjs'), project.root).stdout.split('\n')).toEqual([
      ...OUTPUT,
      EXPORTS,
    ]);

    const esm = await system.bundle({ entryPoint: project.file('src/main.som'), format: 'esm' });
    for (const imported of ['cjs-pkg', '@scope/conditional', 'node:path', 'os', 'path']) {
      expect(esm.code).toContain(`from ${JSON.stringify(imported)};`);
    }
    fs.writeFileSync(project.file('dist/main.mjs'), esm.code);
    fs.writeFileSync(
      project.file('dist/run.mjs'),
      `import * as m from './main.mjs';\n${SHOW_EXPORTS}\n`
    );
    const esmRun = runNode(project.file('dist/run.mjs'), project.root);
    expect(esmRun.stderr).toBe('');
    expect(esmRun.stdout.split('\n')).toEqual([...OUTPUT, EXPORTS]);
  });

  test('an iife bundle refuses the modules it would have to load at run time', async () => {
    await expect(
      system.bundle({ entryPoint: project.file('src/main.som'), format: 'iife' })
    ).rejects.toThrow(
      "An iife bundle runs without a module loader, but it needs 'path', 'cjs-pkg', '@scope/conditional', '@scope/conditional/feature/x', 'node:path', 'os'."
    );
  });

  test('ES module packages: the esm bundle and ES module output agree', async () => {
    // Compiled to ES modules and run as files, as `somon run --module esm` does
    const result = await system.compile(project.file('src/esm-main.som'), undefined, {
      module: 'esm',
    });
    expect(result.errors).toEqual([]);
    const outDir = project.file('out/esm-files');
    writeUnbundled(result, project.file('src'), outDir);
    fs.writeFileSync(path.join(outDir, 'package.json'), '{ "type": "module" }\n');
    const files = runNode(path.join(outDir, 'esm-main.js'), project.root);
    expect(files).toEqual({ stdout: 'esm-only салом аз esm шартӣ 3', stderr: '', status: 0 });

    const esm = await system.bundle({
      entryPoint: project.file('src/esm-main.som'),
      format: 'esm',
    });
    fs.mkdirSync(project.file('dist'), { recursive: true });
    fs.writeFileSync(project.file('dist/esm-main.mjs'), esm.code);
    fs.writeFileSync(
      project.file('dist/run-esm-main.mjs'),
      "import { ҷамъ } from './esm-main.mjs';\nconsole.log('ҷамъ', ҷамъ);\n"
    );
    expect(runNode(project.file('dist/run-esm-main.mjs'), project.root)).toEqual({
      stdout: 'esm-only салом аз esm шартӣ 3\nҷамъ 4',
      stderr: '',
      status: 0,
    });
  });
});

// ---------------------------------------------------------------------------
// Bugs found here in files outside the module system, reported to their owners
// ---------------------------------------------------------------------------

describe('reported: outside the module system', () => {
  let project: TempProject;

  beforeEach(() => {
    project = createTempProject('somon-e2e-reported-');
  });

  afterEach(() => project.remove());

  // src/codegen.ts: `ворид … аз "./lib"` of a directory (lib/index.som) compiles to
  // `require("./lib/index.js")`, which Node finds; it was `./lib.js`. Bundles work too.
  test('compiled module by module, an import of a directory runs', async () => {
    project.write({
      'lib/index.som': 'содир собит И = 1;\n',
      'main.som': 'ворид { И } аз "./lib";\nчоп.сабт(И);\n',
    });
    const system = new ModuleSystem({ resolution: { baseUrl: project.root } });
    const result = await system.compile(project.file('main.som'));
    expect(result.errors).toEqual([]);
    writeUnbundled(result, project.root, project.file('out'));
    expect(runNode(project.file('out/main.js'), project.root).stdout).toBe('1');
  });

  // src/parser.ts: a default import named like a member alias of a built-in
  // (`маълумот`, console.info) was a parse error; `ворид * чун маълумот` always worked.
  test('a default import may be named маълумот', () => {
    const source = 'ворид маълумот аз "./д";\nчоп.сабт(маълумот);';
    expect(compile(source, { typeCheck: false }).errors).toEqual([]);
  });

  // docs/module-system.md imports ModuleSystem, ModuleResolver, … from the package
  test('the package exports the module system', () => {
    const api = require('../../src/index') as Record<string, unknown>;
    const names = ['ModuleSystem', 'ModuleResolver', 'ModuleLoader', 'ModuleRegistry'];
    expect(names.filter(name => api[name] === undefined)).toEqual([]);
  });
});

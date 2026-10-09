import * as fs from 'fs';
import * as path from 'path';
import ts from 'typescript';
import * as vm from 'vm';

import { compile, execute, version, type ConsoleLike, type TypeScriptApi } from '../src/browser';
import { buildCliOnce, canonicalTmpDir } from './helpers/paths';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { buildBrowserBundle, collectModules, findRequires } = require('../scripts/build-browser.js');

const typescript = ts as unknown as TypeScriptApi;

/** A console that records what a program prints. */
function recorder() {
  const lines: string[] = [];
  const write =
    (prefix: string) =>
    (...args: unknown[]) =>
      lines.push(
        prefix + args.map(arg => (typeof arg === 'string' ? arg : JSON.stringify(arg))).join(' ')
      );
  const consoleLike: ConsoleLike = {
    log: write(''),
    info: write(''),
    debug: write(''),
    warn: write('warn: '),
    error: write('error: '),
  };
  return { lines, consoleLike };
}

/** Compiles and runs a program; returns what it printed. */
function run(source: string, options = {}): string[] {
  const result = compile(source, options);
  expect(result.errors).toEqual([]);
  const { lines, consoleLike } = recorder();
  execute(result.code, consoleLike);
  return lines;
}

describe('browser compiler entry', () => {
  test('compiles and runs programs', () => {
    expect(run('чоп.сабт("Салом, ҷаҳон!");')).toEqual(['Салом, ҷаҳон!']);
    expect(
      run(
        [
          'функсия факториал(н: рақам): рақам { бозгашт н <= 1 ? 1 : н * факториал(н - 1); }',
          'собит рақамҳо = [1, 2, 3].харита(н => факториал(н + 2));',
          'чоп.сабт(рақамҳо.пайвастКардан(", "));',
          'синф Ҳисоб { #баланс = 0; илова(м: рақам): ин { ин.#баланс += м; бозгашт ин; } get баланс() { бозгашт ин.#баланс; } }',
          'чоп.хато(нав Ҳисоб().илова(5).илова(2).баланс);',
          'чоп.огоҳӣ(нав Map([["а", 1]]).бозгирифтан("а"));',
        ].join('\n')
      )
    ).toEqual(['6, 24, 120', 'error: 7', 'warn: 1']);
  });

  test('a program runs as a CommonJS module; other modules cannot be loaded', () => {
    const { consoleLike } = recorder();
    const exported = compile('содир функсия ду(): рақам { бозгашт 2; }');
    const module = execute(exported.code, consoleLike) as { ду: () => number };
    expect(module.ду()).toBe(2);
    const imports = compile('ворид { а } аз "./дигар";\nчоп.сабт(а);', { typeCheck: false });
    expect(() => execute(imports.code, consoleLike)).toThrow(
      "Cannot load the module './дигар.js': modules are not available in the browser"
    );
  });

  test('reports lexer, parser, type and code generation errors like the Node compiler', () => {
    expect(compile('тағ а = "бе охир;').errors).toEqual([
      'Unterminated string at line 1, column 9',
    ]);
    const parse = compile('тағ = 1;');
    expect(parse.code).toBe('');
    expect(parse.errors[0]).toMatch(/^Parse error: /);

    const typed = compile('тағ ном: сатр = 1;');
    expect(typed.errors[0]).toMatch(/^Type error \[TYPE_NOT_ASSIGNABLE\] at line 1, column 17/);
    expect(typed.code).toContain('let ном = 1;'); // emitted anyway without `strict`
    expect(compile('тағ ном: сатр = 1;', { strict: true }).code).toBe('');
    expect(compile('тағ ном: сатр = 1;', { typeCheck: false }).errors).toEqual([]);

    const warned = compile('интерфейс К { а: рақам; }\nфунксия ф(к: К) { бозгашт к.б; }');
    expect(warned.warnings[0]).toMatch(/^Type warning \[PROPERTY_NOT_FOUND\]/);

    const codegen = compile('барои (;;) { шикастан берун; }', { typeCheck: false });
    expect(codegen.errors[0]).toMatch(/^Code generation error: Undefined label 'берун'/);
  });

  test('es2022 (the default) and newer targets need no TypeScript', () => {
    for (const target of [undefined, 'es2022', 'es2023', 'es2024', 'esnext', 'ESNext']) {
      const result = compile('тағ а = 2 ** 3;', { target });
      expect([target, result.errors, result.needsTypeScript]).toEqual([target, [], undefined]);
      expect(result.code).toBe('let а = 2 ** 3;');
    }
    // Older targets may need lowering
    expect(compile('тағ а = 1;', { target: 'es2021' }).needsTypeScript).toBe(true);
  });

  test('lowering asks for TypeScript when none is loaded', () => {
    const decorated = compile('функсия ф(а: ҳар, б: ҳар) {}\n@ф синф К {}');
    expect(decorated.needsTypeScript).toBe(true);
    expect(decorated.code).toBe('');
    expect(decorated.errors).toEqual([expect.stringContaining('load TypeScript')]);
    const old = compile('тағ а = 1;', { target: 'es5' });
    expect(old.needsTypeScript).toBe(true);
    expect(old.errors[0]).toContain("'es5' target");
  });

  test('lowers with the TypeScript it is given, or the global one', () => {
    const es5 = compile('собит а = [1, 2].харита(н => н ** 2);\nчоп.сабт(а);', {
      target: 'es5',
      typescript,
    });
    expect(es5.errors).toEqual([]);
    expect(es5.code).toContain('var а');
    expect(es5.code).toContain('Math.pow');

    const decorators = [
      'функсия сабтКун(метод: ҳар, контекст: ҳар) {',
      '  бозгашт функсия (ин: ҳар, ...а: ҳар[]) { чоп.сабт("даъват", контекст.name); бозгашт метод.call(ин, ...а); };',
      '}',
      'синф К { @сабтКун м(): рақам { бозгашт 1; } }',
      'чоп.сабт(нав К().м());',
    ].join('\n');
    (global as { ts?: unknown }).ts = ts;
    try {
      expect(run(decorators)).toEqual(['даъват м', '1']);
      expect(run(decorators, { target: 'esnext' })).toEqual(['даъват м', '1']);
    } finally {
      delete (global as { ts?: unknown }).ts;
    }

    const legacy = compile(
      'функсия тазриқ(х: ҳар, к: ҳар, ҷ: рақам) {}\nсинф Х { конструктор(@тазриқ а: рақам) {} }',
      { experimentalDecorators: true, typescript }
    );
    expect(legacy.errors).toEqual([]);
    expect(legacy.code).toContain('__param');

    expect(compile('тағ а = 1;', { target: 'es1999', typescript }).errors).toEqual([
      "Unknown target 'es1999'. Targets: es5, es2015, es2016, es2017, es2018, es2019, es2020, es2021, es2022, es2023, es2024, esnext",
    ]);

    // Class fields keep their [[Define]] semantics only from es2022
    const fields = compile('синф К { а = 1; }', { target: 'es2020', typescript });
    expect(fields.code).toContain('this.а = 1');
    // es2024 is newer than this TypeScript knows: lowered as for the newest it knows
    const newest = compile('функсия ф(а: ҳар, б: ҳар) {}\n@ф синф К {}', {
      target: 'es2024',
      typescript,
    });
    expect(newest.errors).toEqual([]);
    expect(newest.code).toContain('__esDecorate');
  });

  test('lowered code keeps its mode, although TypeScript 6 makes every script strict', () => {
    const script = 'функсия ф() { бозгашт ин; }\nчоп.сабт(навъи ф());';
    for (const target of ['es5', 'es2019']) {
      const lowered = compile(script, { target, typescript });
      expect(lowered.errors).toEqual([]);
      expect(lowered.code).not.toContain('use strict');
      expect(run(script, { target, typescript })).toEqual(['object']);
    }
    // A module is strict mode code: its directive stays
    const module = compile('содир собит а = 1;', { target: 'es5', typescript });
    expect(module.code.startsWith('"use strict";\n')).toBe(true);
  });

  test('the version is filled in by the bundle', () => {
    expect(version).toBe('__SOMON_VERSION__');
  });
});

/** Node.js globals that code (not strings or property names) refers to. */
function nodeGlobalsUsed(code: string): string[] {
  const forbidden = new Set(['process', 'Buffer', '__dirname', '__filename', 'setImmediate']);
  const used = new Set<string>();
  const file = ts.createSourceFile('bundle.js', code, ts.ScriptTarget.Latest, true);
  const visit = (node: ts.Node): void => {
    const parent = node.parent;
    const isPropertyName =
      (ts.isPropertyAccessExpression(parent) && parent.name === node) ||
      (ts.isPropertyAssignment(parent) && parent.name === node);
    if (ts.isIdentifier(node) && forbidden.has(node.text) && !isPropertyName) used.add(node.text);
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(file, visit);
  return [...used];
}

describe('browser bundle (scripts/build-browser.js)', () => {
  let bundle: { code: string; modules: string[]; version: string };

  beforeAll(() => {
    buildCliOnce();
    bundle = buildBrowserBundle();
  });

  test('contains the compiler modules and no Node.js built-ins or packages', () => {
    expect(bundle.modules).toEqual(
      expect.arrayContaining([
        'browser.js',
        'lexer.js',
        'parser.js',
        'type-checker.js',
        'codegen.js',
      ])
    );
    expect(bundle.modules).not.toContain('compiler.js');
    expect(bundle.modules).not.toContain('config.js');
    // Every require in the bundle names one of its own modules
    const specifiers: string[] = findRequires(bundle.code, 'bundle.js');
    expect(specifiers.length).toBeGreaterThan(10);
    for (const specifier of specifiers) expect(specifier).toMatch(/^\.\.?\//);
    const builtins =
      /require\(["'](?:node:|fs|path|os|url|util|child_process|crypto|stream|buffer|module|vm|typescript|@babel|source-map|commander|chokidar)/;
    expect(bundle.code).not.toMatch(builtins);
    // …and no code reads Node.js globals (names in strings do not count)
    expect(nodeGlobalsUsed(bundle.code)).toEqual([]);
    expect(nodeGlobalsUsed('const a = { process: 1 }.process + "__dirname";')).toEqual([]);
    expect(nodeGlobalsUsed('process.env.X; Buffer.from("")')).toEqual(['process', 'Buffer']);
  });

  test('runs in a context without Node.js: compiles and executes a program', () => {
    const printed: string[] = [];
    const context = vm.createContext({
      console: { log: (...args: unknown[]) => printed.push(args.join(' ')) },
    });
    vm.runInContext(bundle.code, context);
    const somon = context.SomonScript;
    expect(somon.version).toBe(bundle.version);
    const result = somon.compile(
      'тағ рӯйхат_ = [1, 2, 3];\nчоп.сабт(рӯйхат_.дарозӣ, рӯйхат_.филтр(н => н > 1).пайвастКардан("+"));'
    );
    expect(result.errors).toEqual([]);
    somon.execute(result.code, context.console);
    expect(printed).toEqual(['3 2+3']);
    // The type checker works on the browser's global object
    expect(somon.compile('чоп.сабт(номаълум);').errors[0]).toContain(
      "Variable 'номаълум' is not defined"
    );
  });

  test('loads as a CommonJS module too', () => {
    const dir = canonicalTmpDir('somon-bundle-');
    try {
      const file = path.join(dir, 'somonscript.js');
      fs.writeFileSync(file, bundle.code);
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const somon = require(file);
      expect(somon.compile('тағ а = 1;').code).toBe('let а = 1;');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test('the playground examples compile and run', async () => {
    const html = fs.readFileSync(
      path.join(__dirname, '..', 'docs', 'playground', 'index.html'),
      'utf8'
    );
    const json = /<script type="application\/json" id="examples">([\s\S]*?)<\/script>/.exec(
      html
    )![1];
    const examples: Array<{ name: Record<string, string>; code: string; expectErrors?: boolean }> =
      JSON.parse(json);
    expect(examples.length).toBeGreaterThanOrEqual(8);
    for (const example of examples) {
      expect(Object.keys(example.name).sort()).toEqual(['en', 'ru', 'tj']);
      const result = compile(example.code);
      expect([example.name.en, result.errors.length > 0]).toEqual([
        example.name.en,
        Boolean(example.expectErrors),
      ]);
      const { lines, consoleLike } = recorder();
      expect(() => execute(result.code, consoleLike)).not.toThrow();
      await new Promise(resolve => setTimeout(resolve, example.code.includes('интизор') ? 250 : 0));
      expect([example.name.en, lines.length > 0]).toEqual([example.name.en, true]);
    }
  });

  test('the build fails on modules a browser cannot load', () => {
    const dist = canonicalTmpDir('somon-dist-');
    try {
      fs.writeFileSync(
        path.join(dist, 'entry.js'),
        'const a = require("./a");\n// require("fs") in a comment\n'
      );
      fs.writeFileSync(
        path.join(dist, 'a.js'),
        'exports.x = "require(\\"path\\")"; const fs = require("fs");'
      );
      expect(() => collectModules(dist, 'entry.js')).toThrow(
        "a.js requires 'fs': the browser bundle may only contain the compiler's own modules"
      );
      fs.writeFileSync(path.join(dist, 'a.js'), 'require("./missing");');
      expect(() => collectModules(dist, 'entry.js')).toThrow(
        "requires './missing', which is not in"
      );
      fs.writeFileSync(path.join(dist, 'a.js'), 'exports.x = 1;');
      expect([...collectModules(dist, 'entry.js').keys()].sort()).toEqual(['a.js', 'entry.js']);
      expect(() => buildBrowserBundle({ distDir: dist, entry: 'нест.js' })).toThrow(
        "run 'npm run build' first"
      );
    } finally {
      fs.rmSync(dist, { recursive: true, force: true });
    }
    expect(() => findRequires('import("./x")', 'x.js')).toThrow('dynamic import()');
    expect(() => findRequires('require(name)', 'x.js')).toThrow('computed module name');
  });
});

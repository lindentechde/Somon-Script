/**
 * End to end with the built CLI: multi-file projects (CommonJS, ES modules
 * under `"type": "module"`, bundles), declaration files that TypeScript
 * reads, source maps that lead back to the .som lines, and one program
 * compiled for every target from es5 to esnext and run.
 */
import * as fs from 'fs';
import { SourceMap } from 'module';
import * as path from 'path';
import * as ts from 'typescript';

import { TARGETS, type Target } from '../../src/targets';
import { buildCliOnce, canonicalTmpDir } from '../helpers/paths';
import { node, somon } from '../helpers/cli-process';

jest.setTimeout(120000);

let dir: string;

beforeAll(() => {
  buildCliOnce();
});

beforeEach(() => {
  dir = canonicalTmpDir('somon-e2e-projects-');
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

function write(files: Record<string, string>): void {
  for (const [name, text] of Object.entries(files)) {
    const file = path.join(dir, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text);
  }
}

const read = (name: string): string => fs.readFileSync(path.join(dir, name), 'utf8');

describe('a multi-file project', () => {
  const PROJECT = {
    'shared/format.som':
      'содир функсия сатрӣ(ном: сатр, сол: рақам): сатр {\n    бозгашт `${ном} (${сол})`;\n}\n',
    'src/models/user.som': [
      'ворид { сатрӣ } аз "../../shared/format";',
      '',
      'содир пешфарз синф Корбар {',
      '    конструктор(хосусӣ ном: сатр, хосусӣ сол: рақам) {}',
      '    тавсиф(): сатр {',
      '        бозгашт сатрӣ(ин.ном, ин.сол);',
      '    }',
      '}',
      '',
      'содир собит НАВЪ = "корбар";',
      '',
    ].join('\n'),
    'src/main.som': [
      'ворид Корбар, { НАВЪ чун навъ } аз "./models/user";',
      'ворид * чун формат аз "../shared/format";',
      '',
      'собит корбарон = [нав Корбар("Аҳмад", 1990), нав Корбар("Зарина", 2001)];',
      'барои (собит корбар аз корбарон) {',
      '    чоп.сабт(корбар.тавсиф());',
      '}',
      'чоп.сабт(навъ, формат.сатрӣ("ҳама", корбарон.length));',
      '',
    ].join('\n'),
  };
  const OUTPUT = 'Аҳмад (1990)\nЗарина (2001)\nкорбар ҳама (2)\n';

  test('runs as CommonJS and as ES modules, and bundles', async () => {
    write(PROJECT);
    const [commonjs, esm, bundle, info] = await Promise.all([
      somon(['run', 'src/main.som'], { cwd: dir }),
      somon(['run', 'src/main.som', '--module', 'esm'], { cwd: dir }),
      somon(['bundle', 'src/main.som', '-o', 'out/app.js', '--minify'], { cwd: dir }),
      somon(['module-info', 'src/main.som', '--stats', '--circular'], { cwd: dir }),
    ]);
    expect(commonjs).toMatchObject({ status: 0, stdout: OUTPUT, stderr: '' });
    expect(esm).toMatchObject({ status: 0, stdout: OUTPUT, stderr: '' });
    expect(bundle.stdout).toContain('📊 Bundled 3 modules');
    expect((await node([path.join(dir, 'out', 'app.js')])).stdout).toBe(OUTPUT);
    expect(info.stdout).toContain('  Total modules: 3\n');
    expect(info.stdout).toContain('✅ No circular dependencies found');
  });

  test('compiled module by module to ES modules, it runs under "type": "module"', async () => {
    write(PROJECT);
    const modules = Object.keys(PROJECT);
    const results = await Promise.all(
      modules.map(module =>
        somon(
          [
            'compile',
            module,
            '--module',
            'esm',
            '-o',
            path.join('dist', module.replace(/\.som$/, '.js')),
          ],
          { cwd: dir }
        )
      )
    );
    expect(results.map(result => result.status)).toEqual([0, 0, 0]);
    expect(read('dist/src/main.js')).toContain('from "./models/user.js"');
    expect(read('dist/src/models/user.js')).toMatch(/^export default class Корбар/m);

    // Without "type": "module" Node does not load them as ES modules
    write({ 'dist/package.json': JSON.stringify({ type: 'module' }) });
    const run = await node([path.join(dir, 'dist', 'src', 'main.js')]);
    expect(run).toMatchObject({ status: 0, stdout: OUTPUT, stderr: '' });
  });

  test('ES modules keep top-level await and import.meta', async () => {
    write({
      'package.json': JSON.stringify({ type: 'module' }),
      'main.som':
        'собит қимат = интизор Ваъда.resolve(41);\nчоп.сабт(қимат + 1, ворид.meta.url.endsWith("main.js"));\n',
    });
    const compiled = await somon(['compile', 'main.som', '--module', 'esm'], { cwd: dir });
    expect(compiled.status).toBe(0);
    expect(await node([path.join(dir, 'main.js')])).toMatchObject({ stdout: '42 true\n' });
    // CommonJS output cannot express them
    const commonjs = await somon(['compile', 'main.som', '-o', 'cjs.js'], { cwd: dir });
    expect(commonjs.status).toBe(1);
    expect(commonjs.stderr).toContain("Top-level 'интизор' (await) is only allowed in ES modules");
  });
});

describe('declarations', () => {
  const LIBRARY = [
    'содир интерфейс Нуқта {',
    '    х: рақам;',
    '    у: рақам;',
    '}',
    'содир функсия масофа(а: Нуқта, б: Нуқта): рақам {',
    '    бозгашт Риёзӣ.дуръшака((а.х - б.х) ** 2 + (а.у - б.у) ** 2);',
    '}',
    'содир синф Ҳисобкунак {',
    '    хосусӣ ҷамъ = 0;',
    '    ҷамъкун(х: рақам): ин {',
    '        ин.ҷамъ += х;',
    '        бозгашт ин;',
    '    }',
    '}',
    '',
  ].join('\n');

  /**
   * Type-checks `files` as consumers of the compiled library, as Node.js
   * resolves them: a .ts file without "type": "module" is CommonJS, .mts an
   * ES module. The errors as `file: message`.
   */
  function typeErrors(files: string[]): string[] {
    const program = ts.createProgram(
      files.map(file => path.join(dir, file)),
      {
        module: ts.ModuleKind.NodeNext,
        moduleResolution: ts.ModuleResolutionKind.NodeNext,
        lib: ['lib.es2020.d.ts'],
        strict: true,
        noEmit: true,
        types: [],
      }
    );
    return ts
      .getPreEmitDiagnostics(program)
      .map(
        diagnostic =>
          `${path.basename(diagnostic.file!.fileName)}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`
      );
  }

  test('TypeScript reads the declarations of CommonJS and ES module output', async () => {
    write({ 'lib.som': LIBRARY });
    const [commonjs, esm] = await Promise.all([
      somon(['compile', 'lib.som', '--declaration'], { cwd: dir }),
      somon(['compile', 'lib.som', '--declaration', '--module', 'esm', '-o', 'esm/lib.mjs'], {
        cwd: dir,
      }),
    ]);
    expect(commonjs.stdout).toBe(
      "Compiled 'lib.som' to 'lib.js'\nGenerated declarations: 'lib.d.ts'\n"
    );
    expect(esm.stdout).toBe(
      "Compiled 'lib.som' to 'esm/lib.mjs'\nGenerated declarations: 'esm/lib.d.mts'\n"
    );
    expect(read('lib.d.ts')).toContain(
      'export declare function масофа(а: Нуқта, б: Нуқта): number;'
    );

    const use = [
      'const точка: Нуқта = { х: 3, у: 4 };',
      'const d: number = масофа(точка, { х: 0, у: 0 });',
      'new Ҳисобкунак().ҷамъкун(1).ҷамъкун(2);',
      'const wrong: string = масофа(точка, точка);',
      '',
    ].join('\n');
    write({
      'use.ts': `import { масофа, Ҳисобкунак, type Нуқта } from './lib';\n${use}`,
      'use.mts': `import { масофа, Ҳисобкунак, type Нуқта } from './esm/lib.mjs';\n${use}`,
    });
    // The declarations are found: the only errors are the deliberate ones
    expect(typeErrors(['use.ts', 'use.mts']).sort()).toEqual([
      "use.mts: Type 'number' is not assignable to type 'string'.",
      "use.ts: Type 'number' is not assignable to type 'string'.",
    ]);
    // The JavaScript behind them runs
    write({
      'run.cjs':
        'const { масофа } = require("./lib.js");\nconsole.log(масофа({ х: 3, у: 4 }, { х: 0, у: 0 }));\n',
    });
    expect((await node([path.join(dir, 'run.cjs')])).stdout).toBe('5\n');
  });
});

describe('source maps lead back to the .som lines', () => {
  const LIB =
    'содир функсия санҷ(х: рақам): рақам {\n    агар (х < 0) {\n        партофтан нав Хато("манфӣ: " + х);\n    }\n    бозгашт х;\n}\n';
  const MAIN = 'ворид { санҷ } аз "./lib";\n\nчоп.сабт(санҷ(1));\nчоп.сабт(санҷ(-2));\n';

  test('compile --source-map: the map and the stack trace name main.som', async () => {
    write({ 'src/main.som': 'чоп.сабт("аввал");\n\nпартофтан нав Хато("дар сатри 3");\n' });
    const compiled = await somon(
      ['compile', 'src/main.som', '--source-map', '-o', 'dist/main.js'],
      {
        cwd: dir,
      }
    );
    expect(compiled.stdout).toBe(
      "Compiled 'src/main.som' to 'dist/main.js'\nGenerated source map: 'dist/main.js.map'\n"
    );
    const payload = JSON.parse(read('dist/main.js.map'));
    expect(payload).toMatchObject({ version: 3, file: 'main.js', sources: ['../src/main.som'] });
    // The throw statement of the output maps to line 3 of the source
    const code = read('dist/main.js').split('\n');
    const throwLine = code.findIndex(line => line.includes('throw new Error'));
    const entry = new SourceMap(payload).findEntry(throwLine, code[throwLine].indexOf('throw'));
    expect(entry).toMatchObject({ originalSource: '../src/main.som', originalLine: 2 });

    const run = await node(['--enable-source-maps', path.join(dir, 'dist', 'main.js')]);
    expect(run.stdout).toBe('аввал\n');
    expect(run.stderr).toContain('Error: дар сатри 3');
    expect(run.stderr).toMatch(/[\\/]src[\\/]main\.som:3:/);
  });

  test('bundle --source-map maps each module to its own file', async () => {
    write({ 'lib.som': LIB, 'main.som': MAIN });
    const bundled = await somon(['bundle', 'main.som', '--source-map', '-o', 'out/app.js'], {
      cwd: dir,
    });
    expect(bundled.stdout).toContain(
      `🗺️ Source map created: ${path.join(dir, 'out', 'app.js.map')}`
    );
    expect(JSON.parse(read('out/app.js.map')).sources.sort()).toEqual([
      '../lib.som',
      '../main.som',
    ]);
    const run = await node(['--enable-source-maps', path.join(dir, 'out', 'app.js')]);
    expect(run.stdout).toBe('1\n');
    expect(run.stderr).toContain('Error: манфӣ: -2');
    expect(run.stderr).toMatch(/[\\/]lib\.som:3:/);
    expect(run.stderr).toMatch(/[\\/]main\.som:4:/);
  });

  test.each([[[]], [['--module', 'esm']]])(
    'run --source-map %j reports the .som lines',
    async flags => {
      write({ 'lib.som': LIB, 'main.som': MAIN });
      const run = await somon(['run', 'main.som', '--source-map', ...flags], { cwd: dir });
      expect(run.status).toBe(1);
      expect(run.stdout).toBe('1\n');
      expect(run.stderr).toMatch(/[\\/]lib\.som:3:/);
      // Without source maps the trace names the compiled file
      const plain = await somon(['run', 'main.som', ...flags], { cwd: dir });
      expect(plain.stderr).not.toContain('lib.som:3');
    }
  );
});

describe('one program for every target', () => {
  const PROGRAM = [
    'синф Нуқта {',
    '    х: рақам;',
    '    у: рақам;',
    '    конструктор(х: рақам, у: рақам) {',
    '        ин.х = х;',
    '        ин.у = у;',
    '    }',
    '    масофа(): рақам {',
    '        бозгашт Риёзӣ.дуръшака(ин.х ** 2 + ин.у ** 2);',
    '    }',
    '}',
    '',
    'собит нуқтаҳо = [нав Нуқта(3, 4), нав Нуқта(6, 8)];',
    'собит масофаҳо = нуқтаҳо.map(н => н.масофа());',
    'собит [аввал, ...боқӣ] = масофаҳо;',
    'собит объект = { аввал, ...{ ном: "нуқтаҳо" } };',
    'тағ ҷамъ = 0;',
    'барои (собит м аз масофаҳо) {',
    '    ҷамъ += м;',
    '}',
    'тағ гурӯҳ: сатр | холӣ = холӣ;',
    'гурӯҳ ??= объект?.ном ?? "нест";',
    '',
    'ҳамзамон функсия интизорӣ(): Ваъда<рақам> {',
    '    бозгашт интизор Ваъда.resolve(ҷамъ);',
    '}',
    '',
    'функсия* генератор(): Generator<рақам> {',
    '    ҳосил 1;',
    '    ҳосил 2;',
    '}',
    '',
    'интизорӣ().then(натиҷа => {',
    '    чоп.сабт(`${аввал} ${боқӣ} ${гурӯҳ} ${натиҷа} ${[...генератор()].join(",")}`);',
    '});',
    '',
  ].join('\n');

  /** Syntax of the output and the first target that keeps it. */
  const SYNTAX: Array<[string, RegExp, Target]> = [
    ['class', /\bclass\s+Нуқта/, 'es2015'],
    ['arrow function', /=>/, 'es2015'],
    ['generator', /function\*/, 'es2015'],
    ['exponent', /\*\* 2\b/, 'es2016'],
    ['async function', /\basync\s+function/, 'es2017'],
    ['object spread', /\.\.\.\{/, 'es2018'],
    ['optional chaining', /\?\./, 'es2020'],
    ['logical assignment', /\?\?=/, 'es2021'],
    ['class field', /^\s+х;$/m, 'es2022'],
  ];

  test('every target runs it with the same output, lowering what it lacks', async () => {
    write({ 'program.som': PROGRAM });
    const compiled = await Promise.all(
      TARGETS.map(target =>
        somon(['compile', 'program.som', '--target', target, '-o', `out/${target}.js`], {
          cwd: dir,
        })
      )
    );
    expect(compiled.map(result => result.stderr)).toEqual(TARGETS.map(() => ''));
    const runs = await Promise.all(
      TARGETS.map(target => node([path.join(dir, 'out', `${target}.js`)]))
    );
    expect(runs.map(run => run.stdout)).toEqual(TARGETS.map(() => '5 10 нуқтаҳо 15 1,2\n'));

    for (const target of TARGETS) {
      const code = read(`out/${target}.js`);
      const kept = SYNTAX.filter(([, pattern]) => pattern.test(code)).map(([name]) => name);
      const expected = SYNTAX.filter(
        ([, , since]) => TARGETS.indexOf(target) >= TARGETS.indexOf(since)
      ).map(([name]) => name);
      expect({ target, kept }).toEqual({ target, kept: expected });
    }
    expect(read('out/es5.js')).not.toMatch(/\b(const|let)\s/);
  });

  test('syntax a target cannot express is a compile error', async () => {
    write({ 'big.som': 'тағ а = 2n ** 64n;\nчоп.сабт(а);\n' });
    const [es2019, es2020] = await Promise.all([
      somon(['compile', 'big.som', '--target', 'es2019', '-o', 'es2019.js'], { cwd: dir }),
      somon(['compile', 'big.som', '--target', 'es2020', '-o', 'es2020.js'], { cwd: dir }),
    ]);
    expect(es2019.status).toBe(1);
    expect(es2019.stderr).toContain(
      'BigInt literals are only available when targeting es2020 or later (target is es2019)'
    );
    expect(fs.existsSync(path.join(dir, 'es2019.js'))).toBe(false);
    expect((await node([path.join(dir, 'es2020.js')])).stdout).toBe('18446744073709551616n\n');
    expect(es2020.status).toBe(0);
  });
});

import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as vm from 'vm';

import { ModuleLoader, ModuleRegistry, ModuleResolver, ModuleSystem } from '../src/module-system';
import { isSystemPath } from '../src/module-system/module-resolver';
import { compile as compileSource } from '../src/compiler';
import { canonicalTmpDir } from './helpers/paths';
import type { ModuleSystemOptions } from '../src/module-system';

// Regression tests for the module system, run against real multi-file projects.
// Project roots deliberately contain spaces, quotes and Cyrillic, and every bundle
// is executed with node so the assertions check real program output.

describe('module system regressions', () => {
  let root: string;
  const systems: ModuleSystem[] = [];

  beforeEach(() => {
    // Canonical so paths compare equal to require.resolve (macOS /private/var,
    // Windows 8.3 names); Windows does not allow `"` in file names.
    const parent = canonicalTmpDir('somon-modreg-');
    root = path.join(parent, process.platform === 'win32' ? `лоиҳа 'q dir` : `лоиҳа 'q" dir`);
    fs.mkdirSync(root);
  });

  afterEach(async () => {
    await Promise.all(systems.map(ms => ms.shutdown()));
    systems.length = 0;
    jest.restoreAllMocks();
    fs.rmSync(path.dirname(root), { recursive: true, force: true });
  });

  function write(files: Record<string, string>): void {
    for (const [rel, content] of Object.entries(files)) {
      const file = path.join(root, rel);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, content);
    }
  }

  function createSystem(options: Partial<ModuleSystemOptions> = {}): ModuleSystem {
    const ms = new ModuleSystem({
      ...options,
      resolution: { baseUrl: root, ...options.resolution },
    });
    systems.push(ms);
    return ms;
  }

  async function bundleAndRun(
    entry: string,
    options: { ms?: ModuleSystem; outFile?: string } = {}
  ): Promise<string> {
    const ms = options.ms ?? createSystem();
    const bundle = await ms.bundle({ entryPoint: path.join(root, entry) });
    const outFile = options.outFile ?? path.join(path.dirname(root), 'out', 'bundle.js');
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(outFile, bundle.code);
    return execFileSync(process.execPath, [outFile], { encoding: 'utf8' }).trim();
  }

  describe('bundle literal escaping', () => {
    test("file names with quotes produce a valid bundle and can't inject code", async () => {
      const evil = "x': (console.log('INJECTED'),0), 'y";
      write({
        "a'b.som": 'содир собит А = 1;\n',
        [`${evil}.som`]: 'содир собит Б = 2;\n',
        'main.som': `ворид { А } аз "./a'b";\nворид { Б } аз "./${evil}";\nчоп.сабт(А + Б);\n`,
      });

      const output = await bundleAndRun('main.som');
      expect(output).toBe('3');
    });

    test('entry file name with quotes is emitted as an escaped literal', async () => {
      // Windows does not allow `"` in file names
      const entry = process.platform === 'win32' ? `main'x.som` : `main'"x.som`;
      write({ [entry]: 'чоп.сабт("ok");\n' });
      expect(await bundleAndRun(entry)).toBe('ok');
    });
  });

  describe('requires in strings and comments', () => {
    beforeEach(() => {
      write({
        'a.som': 'содир собит А = 1;\n',
        'helper.js': [
          "// require('./missing') is in a comment, and so is /* require('./a') */",
          'const text = "require(\'./a\')";',
          "exports.ёрдам = () => text + ' ' + require('./a.som').А;",
        ].join('\n'),
        'main.som': [
          'ворид { А } аз "./a";',
          'ворид { ёрдам } аз "./helper";',
          'чоп.сабт("use require(x) or require(\'./a\') here", А, ёрдам());',
        ].join('\n'),
      });
    });

    const OUTPUT = "use require(x) or require('./a') here 1 require('./a') 1";

    test('are no requires: the commonjs bundle keeps them as they are', async () => {
      const ms = createSystem();
      const bundle = await ms.bundle({ entryPoint: path.join(root, 'main.som') });
      expect(bundle.code).toContain("// require('./missing') is in a comment");
      expect(await bundleAndRun('main.som', { ms })).toBe(OUTPUT);
    });

    test('are no imports of esm bundles, and iife bundles do not need them', async () => {
      const ms = createSystem();
      const esm = await ms.bundle({ entryPoint: path.join(root, 'main.som'), format: 'esm' });
      expect(esm.code).not.toMatch(/^import /m);
      fs.writeFileSync(path.join(root, 'bundle.mjs'), esm.code);
      const output = execFileSync(process.execPath, [path.join(root, 'bundle.mjs')], {
        encoding: 'utf8',
      });
      expect(output.trim()).toBe(OUTPUT);

      const iife = await ms.bundle({ entryPoint: path.join(root, 'main.som'), format: 'iife' });
      const lines: string[] = [];
      vm.runInNewContext(iife.code, {
        console: { log: (...a: unknown[]) => lines.push(a.join(' ')) },
      });
      expect(lines).toEqual([OUTPUT]);
    });
  });

  describe('imports of directories and of files found by their extension', () => {
    test('are bundled: index files, .json and .js', async () => {
      write({
        'lib/index.som': 'содир собит И = 1;\n',
        'nested/deep/index.js': 'exports.Ч = 2;\n',
        'data.json': '{ "Д": 3 }\n',
        'util.js': 'exports.У = 4;\n',
        'main.som': [
          'ворид { И } аз "./lib";',
          'ворид { Ч } аз "./nested/deep";',
          'ворид { Д } аз "./data";',
          'ворид { У } аз "./util";',
          'чоп.сабт(И, Ч, Д, У);',
        ].join('\n'),
      });
      const ms = createSystem();
      const bundle = await ms.bundle({ entryPoint: path.join(root, 'main.som') });
      // Every import is a module of the bundle, none is left to the run time
      expect(bundle.code).not.toMatch(/require\("\.\//);
      expect(await bundleAndRun('main.som', { ms })).toBe('1 2 3 4');
    });
  });

  describe('deep relative imports', () => {
    test.each([2, 3, 4, 5])('import climbing %i directories works at runtime', async depth => {
      const dirs = Array.from({ length: depth }, (_, i) => `d${i}`);
      const entry = path.join('пап ка', ...dirs, 'main.som');
      write({
        'пап ка/shared/s.som': 'содир собит Ч = 40;\n',
        [entry]: `ворид { Ч } аз "${'../'.repeat(depth)}shared/s";\nчоп.сабт(Ч + ${depth});\n`,
      });

      expect(await bundleAndRun(entry)).toBe(String(40 + depth));
    });
  });

  describe('local .js and .json dependencies', () => {
    test('are bundled so the bundle runs from another directory', async () => {
      write({
        'src/util.js': 'exports.twice = function (n) { return n * 2; };\n',
        'src/helper.js':
          "const util = require('./util');\nconst cfg = require('./config.json');\n" +
          'module.exports.ёрдам = function () { return util.twice(cfg.base); };\n',
        'src/config.json': '{ "base": 20 }\n',
        'src/data.json': '{ "ном": "маълумот", "list": [1, 2] }\n',
        'src/main.som':
          'ворид { ёрдам } аз "./helper";\nворид д аз "./data.json";\n' +
          'чоп.сабт(ёрдам() + " " + д.ном + " " + д.list.length);\n',
      });

      expect(await bundleAndRun('src/main.som')).toBe('40 маълумот 2');
    });

    test('invalid JSON dependency is reported against the JSON file', async () => {
      write({
        'bad.json': '{ broken',
        'main.som': 'ворид д аз "./bad.json";\nчоп.сабт(д);\n',
      });

      const result = await createSystem().compile(path.join(root, 'main.som'));
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].filePath).toBe(path.join(root, 'bad.json'));
    });
  });

  describe('circular dependencies', () => {
    const cycle = {
      'a.som': 'ворид * чун Б аз "./b";\nсодир функсия ф(): сатр { бозгашт "A" + Б.г(); }\n',
      'b.som':
        'ворид * чун А аз "./a";\nсодир функсия г(): сатр { бозгашт "B"; }\n' +
        'содир функсия ҳ(): сатр { бозгашт А.ф(); }\n',
      'main.som': 'ворид { ф } аз "./a";\nворид { ҳ } аз "./b";\nчоп.сабт(ф() + ҳ());\n',
    };

    test("'warn' (default) compiles with a single warning and the bundle runs", async () => {
      write(cycle);
      const ms = createSystem();
      const result = await ms.compile(path.join(root, 'main.som'));

      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toMatch(/Circular dependenc/);
      expect(await bundleAndRun('main.som', { ms })).toBe('ABAB');
    });

    test("'ignore' compiles without warnings and the bundle runs", async () => {
      write(cycle);
      const ms = createSystem({ loading: { circularDependencyStrategy: 'ignore' } });
      const result = await ms.compile(path.join(root, 'main.som'));

      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
      expect(await bundleAndRun('main.som', { ms })).toBe('ABAB');
    });

    test("'error' fails, also when the modules are already cached", async () => {
      write(cycle);
      const ms = createSystem({ loading: { circularDependencyStrategy: 'error' } });

      for (let attempt = 0; attempt < 2; attempt++) {
        const result = await ms.compile(path.join(root, 'main.som'));
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].message).toMatch(/Circular dependency/);
      }
      await expect(ms.bundle({ entryPoint: path.join(root, 'main.som') })).rejects.toThrow(
        /Circular dependency/
      );
    });
  });

  describe('cache invalidation', () => {
    test('a later compile on the same ModuleSystem sees edited dependencies', async () => {
      write({
        'dep.som': 'содир собит Қ = 1;\n',
        'main.som': 'ворид { Қ } аз "./dep";\nчоп.сабт(Қ);\n',
      });
      const ms = createSystem();
      const entry = path.join(root, 'main.som');

      expect(await bundleAndRun('main.som', { ms })).toBe('1');

      // Different size, so the stat check alone must catch it
      fs.writeFileSync(path.join(root, 'dep.som'), 'содир собит Қ = 22;\n');
      const result = await ms.compile(entry);
      expect(result.errors).toHaveLength(0);
      expect(await bundleAndRun('main.som', { ms })).toBe('22');
    });

    test('invalidate() evicts a module and its transitive dependents', async () => {
      write({
        'leaf.som': 'содир собит Л = 1;\n',
        'mid.som': 'ворид { Л } аз "./leaf";\nсодир собит М = Л;\n',
        'main.som': 'ворид { М } аз "./mid";\nчоп.сабт(М);\n',
        'other.som': 'содир собит О = 0;\n',
      });
      const ms = createSystem();
      await ms.compile(path.join(root, 'main.som'));
      await ms.compile(path.join(root, 'other.som'));

      // Same size and same mtime: only explicit invalidation can notice this edit
      const leaf = path.join(root, 'leaf.som');
      const stat = fs.statSync(leaf);
      fs.writeFileSync(leaf, 'содир собит Л = 7;\n');
      fs.utimesSync(leaf, stat.atime, stat.mtime);

      const evicted = ms.invalidate(leaf);
      expect(evicted.sort()).toEqual(
        [leaf, path.join(root, 'mid.som'), path.join(root, 'main.som')].sort()
      );
      expect(ms.getModule(path.join(root, 'other.som'))).toBeDefined();
      expect(await bundleAndRun('main.som', { ms })).toBe('7');
    });
  });

  describe('loading.cache: false', () => {
    test('compiles and bundles, reading every file again in each build', async () => {
      write({
        'shared.som': 'содир собит Ш = 1;\n',
        'a.som': 'ворид { Ш } аз "./shared";\nсодир собит А = Ш;\n',
        'b.som': 'ворид { Ш } аз "./shared";\nсодир собит Б = Ш;\n',
        'main.som': 'ворид { А } аз "./a";\nворид { Б } аз "./b";\nчоп.сабт(А + Б);\n',
      });
      const ms = createSystem({ loading: { cache: false } });
      const entry = path.join(root, 'main.som');
      const result = await ms.compile(entry);
      expect(result.errors).toEqual([]);
      expect(result.modules.size).toBe(4);
      expect(await bundleAndRun('main.som', { ms })).toBe('2');

      // Same size and mtime: only a build that reads the file again sees the edit
      const shared = path.join(root, 'shared.som');
      const stat = fs.statSync(shared);
      fs.writeFileSync(shared, 'содир собит Ш = 4;\n');
      fs.utimesSync(shared, stat.atime, stat.mtime);
      expect(await bundleAndRun('main.som', { ms })).toBe('8');
    });

    test('a load reads a module shared by two importers once', () => {
      write({
        'shared.som': 'содир собит Ш = 1;\n',
        'a.som': 'ворид { Ш } аз "./shared";\n',
        'main.som': 'ворид { Ш } аз "./shared";\nворид "./a";\n',
      });
      const loader = new ModuleLoader(new ModuleResolver({ baseUrl: root }), { cache: false });
      const first = loader.loadSync('./main', root);
      const shared = loader.getModule(path.join(root, 'shared.som'));
      expect(shared?.isLoaded).toBe(true);
      expect(loader.getModule(path.join(root, 'a.som'))?.resolvedDependencies).toEqual([
        shared!.id,
      ]);
      // The next load starts again
      expect(loader.loadSync('./main', root)).not.toBe(first);
      expect(loader.getModule(path.join(root, 'shared.som'))).not.toBe(shared);
    });
  });

  describe('cache limits', () => {
    test('a build larger than maxCacheSize keeps every module it needs', async () => {
      write({
        'm1.som': 'содир собит A1 = 1;\n',
        'm2.som': 'содир собит A2 = 2;\n',
        'm3.som': 'содир собит A3 = 3;\n',
        'm4.som': 'содир собит A4 = 4;\n',
        'big.som':
          'ворид { A1 } аз "./m1";\nворид { A2 } аз "./m2";\nворид { A3 } аз "./m3";\n' +
          'ворид { A4 } аз "./m4";\nчоп.сабт(A1 + A2 + A3 + A4);\n',
        'small.som': 'чоп.сабт("small");\n',
      });
      const ms = createSystem({ loading: { maxCacheSize: 2 } });

      expect(await bundleAndRun('big.som', { ms })).toBe('10');
      expect(await bundleAndRun('small.som', { ms })).toBe('small');
      expect(await bundleAndRun('big.som', { ms })).toBe('10');
    });
  });

  describe('error attribution', () => {
    test('a parse error in a dependency is reported once, against the dependency', async () => {
      write({
        'bad.som': 'собит а = 1;\n\n\n\nфунксия (\n',
        'usebad.som': 'ворид { а } аз "./bad";\nчоп.сабт(а);\n',
      });
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await createSystem().compile(path.join(root, 'usebad.som'));

      expect(result.errors).toHaveLength(1);
      const [error] = result.errors;
      expect(error.filePath).toBe(path.join(root, 'bad.som'));
      expect(error.line).toBe(5);
      expect(error.importer).toBe(path.join(root, 'usebad.som'));
      expect(error.specifier).toBe('./bad');
      expect(error.message).not.toMatch(/Failed to load entry point/);
      expect(errorSpy).not.toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalled();
    });

    test('an unresolvable import is reported against the importing file and line', async () => {
      write({
        'sub/inner.som': '// comment\nворид { х } аз "./nope";\nсодир собит И = х;\n',
        'deep.som': 'ворид { И } аз "./sub/inner";\nчоп.сабт(И);\n',
      });

      const result = await createSystem().compile(path.join(root, 'deep.som'));

      expect(result.errors).toHaveLength(1);
      const [error] = result.errors;
      expect(error.filePath).toBe(path.join(root, 'sub', 'inner.som'));
      expect(error.line).toBe(2);
      expect(error.specifier).toBe('./nope');
      expect(error.message).toContain("'./nope'");
      expect(error.message).toContain(path.join(root, 'sub', 'inner.som'));
    });

    test('compiler errors keep the line and the column of their message', async () => {
      write({
        'dep.som': 'содир собит Д: рақам = 1;\n\nтағ х: рақам = "сатр";\n',
        'main.som': 'ворид { Д } аз "./dep";\nчоп.сабт(Д);\n',
      });
      const ms = createSystem({ compilation: { strict: true } });
      const result = await ms.compile(path.join(root, 'main.som'));
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatchObject({
        filePath: path.join(root, 'dep.som'),
        line: 3,
        column: 16,
      });
      expect(result.errors[0].message).toMatch(/^Type error \[\w+\] at line 3, column 16: /);
      await expect(ms.bundle({ entryPoint: path.join(root, 'main.som') })).rejects.toThrow(
        `${path.join(root, 'dep.som')}:3:16\n`
      );
    });

    test('suggestions match the messages of the compiler', async () => {
      write({
        'unclosed.som': 'функсия ф() {\n',
        'twice.som': 'тағ х = 1;\nтағ х = 2;\n',
        'types.som': 'тағ х: рақам = "сатр";\n',
      });
      const ms = createSystem({ compilation: { strict: true } });
      const suggestion = async (file: string) =>
        (await ms.compile(path.join(root, file))).errors.map(error => error.suggestion);
      expect(await suggestion('unclosed.som')).toEqual([
        'You may have unclosed brackets, parentheses, or string literals',
      ]);
      expect(await suggestion('twice.som')).toEqual([
        'A variable with this name already exists in this scope. Use a different name or remove the duplicate declaration',
      ]);
      expect(await suggestion('types.som')).toEqual([
        'Check that the types of your variables and function parameters are compatible',
      ]);
    });

    test('bundle() throws one message naming the failing file', async () => {
      write({ 'bad.som': 'функсия (\n', 'main.som': 'ворид { а } аз "./bad";\n' });
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await expect(
        createSystem().bundle({ entryPoint: path.join(root, 'main.som') })
      ).rejects.toThrow(path.join(root, 'bad.som'));
      expect(errorSpy).not.toHaveBeenCalled();
    });

    test('rejected specifiers are errors, not silently skipped', async () => {
      write({ 'main.som': 'ворид { а } аз "..\\\\x";\nчоп.сабт(а);\n' });

      const result = await createSystem().compile(path.join(root, 'main.som'));
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toMatch(/backslash/i);
      expect(result.errors[0].filePath).toBe(path.join(root, 'main.som'));
    });
  });

  describe('resolver containment policy', () => {
    test('bare specifiers containing ".." are rejected', () => {
      write({ 'main.som': '' });
      const resolver = new ModuleResolver({ baseUrl: root });
      expect(() =>
        resolver.resolve('x/../../../../../../etc/passwd', path.join(root, 'main.som'))
      ).toThrow(/'\.\.'/);
    });

    test('baseUrl check is separator-aware', () => {
      const resolver = new ModuleResolver({ baseUrl: '/srv/proj' });
      // '/srv/proj-evil/x' is not inside '/srv/proj', so it is project-relative
      expect(() => resolver.resolve('/srv/proj-evil/x', '/srv/proj/main.som')).toThrow(
        path.join('/srv/proj', 'srv', 'proj-evil', 'x')
      );
    });

    test('project-absolute imports cannot escape baseUrl through a symlink', () => {
      write({ 'main.som': '', '../outside/o.som': 'содир собит О = 1;\n' });
      fs.symlinkSync(path.join(path.dirname(root), 'outside'), path.join(root, 'lib'));
      const resolver = new ModuleResolver({ baseUrl: root });
      expect(() => resolver.resolve('/lib/o', path.join(root, 'main.som'))).toThrow(
        /outside baseUrl/
      );
    });

    test('system paths: Unix system directories, Windows drives and UNC shares', () => {
      // Paths as path.normalize leaves them on each OS
      for (const systemPath of [
        '/home/u/x.som',
        '/Users/u/x',
        '/tmp/x',
        'C:\\Users\\u\\x.som',
        'c:/x',
        '\\\\server\\share\\lib\\x.som',
        '\\\\?\\C:\\x',
      ]) {
        expect([systemPath, isSystemPath(systemPath)]).toEqual([systemPath, true]);
      }
      for (const projectPath of [
        '/lib/utils',
        '/homeless/x',
        '\\lib\\utils',
        'C:x',
        '\\\\server',
      ]) {
        expect([projectPath, isSystemPath(projectPath)]).toEqual([projectPath, false]);
      }
    });

    test('relative imports outside baseUrl stay allowed', () => {
      write({ 'main.som': '', '../sibling/s.som': '' });
      const resolver = new ModuleResolver({ baseUrl: root });
      expect(resolver.resolve('../sibling/s', path.join(root, 'main.som')).resolvedPath).toBe(
        path.join(path.dirname(root), 'sibling', 's.som')
      );
    });
  });

  describe('absolute import paths', () => {
    const slash = (file: string) => file.split(path.sep).join('/');

    test('are resolved like relative ones: extensions and index files', async () => {
      write({
        'lib/util.som': 'содир собит У = 2;\n',
        'lib/dir/index.som': 'содир собит И = 3;\n',
        'data.json': '{ "Д": 4 }\n',
      });
      write({
        'main.som': [
          // The project directory has quotes in its name
          `ворид { У } аз ${JSON.stringify(slash(path.join(root, 'lib', 'util')))};`,
          `ворид { И } аз ${JSON.stringify(slash(path.join(root, 'lib', 'dir')))};`,
          `ворид { Д } аз ${JSON.stringify(slash(path.join(root, 'data')))};`,
          'чоп.сабт(У + И + Д);',
        ].join('\n'),
      });
      const ms = createSystem();
      const result = await ms.compile(path.join(root, 'main.som'));
      expect(result.errors).toEqual([]);
      expect(ms.resolve(path.join(root, 'lib', 'dir'), root)).toBe(
        path.join(root, 'lib', 'dir', 'index.som')
      );
      expect(await bundleAndRun('main.som', { ms })).toBe('9');
    });

    test('that name no file are an error of the resolver', () => {
      write({ 'main.som': '' });
      const resolver = new ModuleResolver({ baseUrl: root });
      const missing = path.join(root, 'missing');
      expect(() => resolver.resolve(missing, path.join(root, 'main.som'))).toThrow(
        `Cannot resolve module: ${missing}`
      );
    });
  });

  describe('allowJs and resolveJsonModule', () => {
    beforeEach(() => {
      write({
        'util.js': 'exports.У = 1;\n',
        'jsdir/index.js': 'exports.И = 2;\n',
        'data.json': '{ "Д": 3 }\n',
        'node_modules/pkg/package.json': '{ "main": "main.js" }',
        'node_modules/pkg/main.js': 'exports.П = 4;\n',
        'node_modules/pkg/data.json': '{}',
        'main.som': '',
      });
    });

    test('false keeps the project’s JavaScript or JSON files from being imported', () => {
      const from = path.join(root, 'main.som');
      const noJs = new ModuleResolver({ baseUrl: root, allowJs: false });
      expect(() => noJs.resolve('./util', from)).toThrow(
        `Cannot resolve module: ${path.join(root, 'util')}`
      );
      expect(() => noJs.resolve('./util.js', from)).toThrow(/Cannot resolve module/);
      expect(() => noJs.resolve('./jsdir', from)).toThrow(/Cannot resolve module/);
      expect(noJs.resolve('./data.json', from).extension).toBe('.json');
      // Packages are not the project's code
      expect(noJs.resolve('pkg', from).resolvedPath).toBe(
        path.join(root, 'node_modules', 'pkg', 'main.js')
      );

      const noJson = new ModuleResolver({ baseUrl: root, resolveJsonModule: false });
      expect(() => noJson.resolve('./data.json', from)).toThrow(/Cannot resolve module/);
      expect(() => noJson.resolve('./data', from)).toThrow(/Cannot resolve module/);
      expect(noJson.resolve('./util', from).extension).toBe('.js');
      expect(noJson.resolve('pkg/data.json', from).extension).toBe('.json');
    });

    test('a ModuleSystem with allowJs false reports the import of a .js file', async () => {
      write({ 'main.som': 'ворид { У } аз "./util";\nчоп.сабт(У);\n' });
      const result = await createSystem({ resolution: { baseUrl: root, allowJs: false } }).compile(
        path.join(root, 'main.som')
      );
      expect(result.errors.map(error => error.specifier)).toEqual(['./util']);
    });
  });

  describe('paths patterns', () => {
    test('"lib/*" maps "lib/x" only, not other names that start with "lib"', () => {
      write({
        'src/lib/x.som': '',
        'src/lib/rary.som': '',
        'src/lib/index.som': '',
        'node_modules/library/index.js': '',
        'main.som': '',
      });
      const resolver = new ModuleResolver({ baseUrl: root, paths: { 'lib/*': ['src/lib/*'] } });
      const resolve = (spec: string) =>
        resolver.resolve(spec, path.join(root, 'main.som')).resolvedPath;
      expect(resolve('lib/x')).toBe(path.join(root, 'src', 'lib', 'x.som'));
      expect(resolve('library')).toBe(path.join(root, 'node_modules', 'library', 'index.js'));
      expect(() => resolve('lib')).toThrow('Module not found: lib');
    });
  });

  describe('package.json exports', () => {
    beforeEach(() => {
      write({
        'node_modules/pkge/package.json': '{ "name": "pkge", "exports": "./dist/m.js" }',
        'node_modules/pkge/dist/m.js': 'exports.value = 42;\n',
        'node_modules/pkgx/package.json': JSON.stringify({
          name: 'pkgx',
          main: './index.js',
          exports: {
            '.': { import: './lib/entry.mjs', require: './lib/entry.js' },
            './sub': { default: './lib/sub.js' },
            './feature/*': './lib/features/*.js',
          },
        }),
        'node_modules/pkgx/index.js': 'exports.value = "main";\n',
        'node_modules/pkgx/lib/entry.js': 'exports.value = "exports";\n',
        'node_modules/pkgx/lib/sub.js': 'exports.value = "sub";\n',
        'node_modules/pkgx/lib/features/f.js': 'exports.value = "feature";\n',
        'main.som': '',
      });
    });

    test('resolves like node', () => {
      const resolver = new ModuleResolver({ baseUrl: root });
      const from = path.join(root, 'main.som');
      const resolve = (spec: string) => resolver.resolve(spec, from).resolvedPath;

      for (const spec of ['pkge', 'pkgx', 'pkgx/sub', 'pkgx/feature/f']) {
        expect(resolve(spec)).toBe(require.resolve(spec, { paths: [root] }));
      }
      expect(() => resolve('pkgx/lib/sub.js')).toThrow(/not exported/);
    });

    test('packageName is the name of the package, also for subpaths', () => {
      write({
        'node_modules/@scope/kit/package.json': '{ "name": "@scope/kit" }',
        'node_modules/@scope/kit/tools/x.js': '',
        'node_modules/plain/package.json': '{ "name": "plain" }',
        'node_modules/plain/lib/y.js': '',
      });
      const resolver = new ModuleResolver({ baseUrl: root });
      const from = path.join(root, 'main.som');
      expect(resolver.resolve('pkgx/feature/f', from).packageName).toBe('pkgx');
      expect(resolver.resolve('pkgx', from).packageName).toBe('pkgx');
      expect(resolver.resolve('@scope/kit/tools/x', from).packageName).toBe('@scope/kit');
      expect(resolver.resolve('plain/lib/y', from).packageName).toBe('plain');
    });

    test('a broken package.json is named in the error', () => {
      write({
        'node_modules/broken/package.json': '{ "name": "broken", }',
        'node_modules/listed/package.json': '["not", "an", "object"]',
        'lib/package.json': '{ "main": ',
        'odd/package.json': '{ "main": 5 }',
        'odd/index.som': '',
      });
      const resolver = new ModuleResolver({ baseUrl: root });
      const from = path.join(root, 'main.som');
      const brokenJson = path.join(root, 'node_modules', 'broken', 'package.json');
      expect(() => resolver.resolve('broken', from)).toThrow(
        `Invalid package.json ${brokenJson}: `
      );
      expect(() => resolver.resolve('listed/x', from)).toThrow(
        `Invalid package.json ${path.join(root, 'node_modules', 'listed', 'package.json')}: it must contain a JSON object`
      );
      expect(() => resolver.resolve('./lib', from)).toThrow(
        `Invalid package.json ${path.join(root, 'lib', 'package.json')}: `
      );
      // Like Node, a "main" that is not a string is ignored
      expect(resolver.resolve('./odd', from).resolvedPath).toBe(
        path.join(root, 'odd', 'index.som')
      );
    });

    test('a relative fromFile still searches node_modules', () => {
      const resolver = new ModuleResolver({ baseUrl: root });
      const relativeFrom = path.relative(process.cwd(), path.join(root, 'main.som'));
      expect(resolver.resolve('pkgx', relativeFrom).resolvedPath).toBe(
        path.join(root, 'node_modules', 'pkgx', 'lib', 'entry.js')
      );
    });

    test('bundle running next to the project uses the exported entry', async () => {
      write({
        'main.som':
          'ворид { value } аз "pkge";\nворид * чун X аз "pkgx";\nчоп.сабт(value, X.value);\n',
      });
      const output = await bundleAndRun('main.som', { outFile: path.join(root, 'out.js') });
      expect(output).toBe('42 exports');
    });
  });

  describe('loading.externals', () => {
    test('apply to compile() and bundle() calls that name no externals of their own', async () => {
      write({ 'main.som': 'ворид * чун Л аз "not-installed";\nчоп.сабт(навъи Л);\n' });
      const ms = createSystem({ loading: { externals: ['not-installed'] } });
      const entry = path.join(root, 'main.som');
      const result = await ms.compile(entry);
      expect(result.errors).toEqual([]);
      expect(result.dependencies).toEqual(['external:not-installed', entry]);
      const bundle = await ms.bundle({ entryPoint: entry });
      expect(bundle.code).toContain('require("not-installed")');

      // A build's own externals replace them while it runs
      const fresh = createSystem({ loading: { externals: ['not-installed'] } });
      const own = await fresh.compile(entry, ['other']);
      expect(own.errors.map(error => error.specifier)).toEqual(['not-installed']);
      expect((await fresh.compile(entry)).errors).toEqual([]);
    });

    test('a later build with other externals loads the modules whose imports changed', async () => {
      write({
        'util.som': 'содир собит У = 1;\n',
        'main.som': 'ворид { У } аз "./util";\nчоп.сабт(У);\n',
      });
      const ms = createSystem();
      const entry = path.join(root, 'main.som');
      const files = async (externals?: string[]) =>
        [...(await ms.compile(entry, externals)).modules.keys()].map(id => path.basename(id));

      expect(await files(['./util'])).toEqual(['main.som']);
      expect(await files()).toEqual(['util.som', 'main.som']);
      expect(await files(['./util'])).toEqual(['main.som']);
      expect(await bundleAndRun('main.som', { ms })).toBe('1');
    });
  });

  describe('Node.js built-in modules', () => {
    const files = {
      'util.js': "const os = require('os');\nexports.eol = JSON.stringify(os.EOL);\n",
      'main.som': [
        'ворид * чун фс аз "fs";',
        'ворид { join } аз "node:path";',
        'ворид * чун ваъдаҳо аз "fs/promises";',
        'ворид { eol } аз "./util";',
        'чоп.сабт(навъи фс.existsSync, join("а", "б"), навъи ваъдаҳо.readFile, eol.length > 2);',
      ].join('\n'),
    };

    test('stay host requires: compile, validate and run without externals', async () => {
      write(files);
      const ms = createSystem();
      const result = await ms.compile(path.join(root, 'main.som'));
      expect(result.errors).toEqual([]);
      expect([...result.modules.keys()].map(id => path.basename(id)).sort()).toEqual([
        'main.som',
        'util.js',
      ]);
      expect(ms.validate()).toEqual({ isValid: true, errors: [] });

      expect(await bundleAndRun('main.som', { ms })).toBe(
        `function ${path.join('а', 'б')} function true`
      );
    });

    test('an esm bundle imports them and an iife bundle refuses them', async () => {
      write(files);
      const ms = createSystem();
      const esm = await ms.bundle({ entryPoint: path.join(root, 'main.som'), format: 'esm' });
      expect(esm.code).toMatch(/^import \* as __somonImport\d from "fs";$/m);
      expect(esm.code).toMatch(/^import \* as __somonImport\d from "node:path";$/m);
      expect(esm.code).toMatch(/^import \* as __somonImport\d from "os";$/m);
      await expect(
        ms.bundle({ entryPoint: path.join(root, 'main.som'), format: 'iife' })
      ).rejects.toThrow(/needs 'os', 'fs', 'node:path', 'fs\/promises'\./);
    });
  });

  describe('packages with ES module entries only', () => {
    beforeEach(() => {
      write({
        'node_modules/esm-only/package.json': JSON.stringify({
          name: 'esm-only',
          type: 'module',
          exports: { import: './index.js' },
        }),
        'node_modules/esm-only/index.js':
          'export const ном = "esm-only";\nexport default function салом() { return "салом"; }\n',
        'node_modules/dual/package.json': JSON.stringify({
          name: 'dual',
          exports: {
            '.': { import: './i.mjs', require: './r.cjs' },
            './esm/*': { import: './esm/*.mjs' },
          },
        }),
        'node_modules/dual/i.mjs': 'export const вариант = "esm";\n',
        'node_modules/dual/r.cjs': 'exports.вариант = "cjs";\n',
        'node_modules/dual/esm/x.mjs': 'export const х = 1;\n',
        'main.som':
          'ворид салом, { ном } аз "esm-only";\nворид { вариант } аз "dual";\n' +
          'чоп.сабт(ном, салом(), вариант);\n',
      });
    });

    test('resolve to their "import" entry when nothing is exported for require', () => {
      const resolver = new ModuleResolver({ baseUrl: root });
      const resolve = (spec: string) =>
        resolver.resolve(spec, path.join(root, 'main.som')).resolvedPath;
      expect(resolve('esm-only')).toBe(path.join(root, 'node_modules', 'esm-only', 'index.js'));
      expect(resolve('dual')).toBe(path.join(root, 'node_modules', 'dual', 'r.cjs'));
      expect(resolve('dual/esm/x')).toBe(path.join(root, 'node_modules', 'dual', 'esm', 'x.mjs'));
    });

    test('an esm bundle imports them', async () => {
      const ms = createSystem();
      const bundle = await ms.bundle({ entryPoint: path.join(root, 'main.som'), format: 'esm' });
      fs.writeFileSync(path.join(root, 'bundle.mjs'), bundle.code);
      const output = execFileSync(process.execPath, [path.join(root, 'bundle.mjs')], {
        encoding: 'utf8',
      });
      expect(output.trim()).toBe('esm-only салом esm');
    });
  });

  describe('registry graph', () => {
    test('stores resolved module ids only', async () => {
      write({
        'b.som': 'содир собит Б = 1;\n',
        'a.som': 'ворид { Б } аз "./b";\nсодир собит А = Б;\n',
        'main.som': 'ворид { А } аз "./a";\nворид { Б } аз "./b";\nчоп.сабт(А + Б);\n',
      });
      const ms = createSystem();
      await ms.loadModule('./main', root);

      const ids = ['main.som', 'a.som', 'b.som'].map(f => path.join(root, f));
      const graph = ms.getDependencyGraph();
      expect([...graph.keys()].sort()).toEqual([...ids].sort());
      expect(graph.get(ids[0])).toEqual([ids[1], ids[2]]);
      expect(graph.get(ids[1])).toEqual([ids[2]]);
      expect(ms.getStatistics().totalModules).toBe(3);
      expect(ms.getStatistics().totalDependencies).toBe(3);
    });

    test('the metadata of a module lists the modules that import it', async () => {
      write({
        'b.som': 'содир собит Б = 1;\n',
        'a.som': 'ворид { Б } аз "./b";\nсодир собит А = Б;\n',
        'main.som': 'ворид { А } аз "./a";\nворид { Б } аз "./b";\nчоп.сабт(А + Б);\n',
      });
      const ms = createSystem();
      await ms.loadModule('./main', root);
      const [main, a, b] = ['main.som', 'a.som', 'b.som'].map(file => path.join(root, file));
      expect(ms.getModule(b)?.dependents.sort()).toEqual([a, main].sort());
      expect(ms.getModule(main)?.dependents).toEqual([]);
      const all = Object.fromEntries(ms.getAllModules().map(meta => [meta.id, meta.dependents]));
      expect(all[a]).toEqual([main]);
    });
  });

  describe('entry points', () => {
    beforeEach(() => {
      write({
        'src/util.som': 'содир собит У = 7;\n',
        'src/main.som': 'ворид { У } аз "./util";\nчоп.сабт(У);\n',
        'scripts/build.som': 'ворид { У } аз "../src/util";\nчоп.сабт(У * 2);\n',
      });
    });

    test('a relative entry path is relative to the current directory', async () => {
      const ms = createSystem();
      const cwd = process.cwd();
      process.chdir(root);
      let result: Awaited<ReturnType<ModuleSystem['compile']>>;
      try {
        result = await ms.compile(path.join('src', 'main.som'));
      } finally {
        process.chdir(cwd);
      }
      expect(result.errors).toEqual([]);
      expect(result.entryPoint).toBe(path.join(root, 'src', 'main.som'));
    });

    test('an entry outside baseUrl is a file, not a project-relative import', async () => {
      const ms = createSystem({ resolution: { baseUrl: path.join(root, 'src') } });
      const result = await ms.compile(path.join(root, 'scripts', 'build.som'));
      expect(result.errors).toEqual([]);
      expect([...result.modules.keys()]).toEqual([
        path.join(root, 'src', 'util.som'),
        path.join(root, 'scripts', 'build.som'),
      ]);
    });

    test('an entry is a SomonScript program whatever its name', async () => {
      write({
        'prog.txt': 'ворид { У } аз "./src/util";\nчоп.сабт("txt", У);\n',
        'scripts/.som': 'ворид { У } аз "../src/util";\nчоп.сабт("dotfile", У);\n',
      });
      const ms = createSystem();
      expect(await bundleAndRun('prog.txt', { ms })).toBe('txt 7');
      expect(await bundleAndRun(path.join('scripts', '.som'), { ms })).toBe('dotfile 7');
      const esm = await ms.bundle({ entryPoint: path.join(root, 'prog.txt'), format: 'esm' });
      // A SomonScript entry without a default export has none
      expect(esm.code).toMatch(/export \{ {2}\};\n$/);
    });

    test('an import of a file named only .som is SomonScript; other files are not compiled', async () => {
      write({
        'lib/.som': 'содир собит Н = 3;\n',
        'notes.txt': 'module.exports = "notes";\n',
        'main.som': 'ворид { Н } аз "./lib/.som";\nворид "./notes.txt";\nчоп.сабт(Н);\n',
      });
      const ms = createSystem();
      const result = await ms.compile(path.join(root, 'main.som'));
      expect(result.errors).toEqual([]);
      expect([...result.modules.keys()].map(id => path.relative(root, id))).toEqual([
        path.join('lib', '.som'),
        'main.som',
      ]);
      // The program that a file was the entry of, and then an import: read again for each
      write({ 'other.som': 'ворид "./prog.txt";\n', 'prog.txt': 'чоп.сабт(1);\n' });
      expect((await ms.compile(path.join(root, 'prog.txt'))).modules.size).toBe(1);
      expect([...(await ms.compile(path.join(root, 'other.som'))).modules.keys()]).toEqual([
        path.join(root, 'other.som'),
      ]);
      expect((await ms.compile(path.join(root, 'prog.txt'))).modules.size).toBe(1);
    });
  });

  describe('minified bundles', () => {
    test("ignore the Babel configuration of the project they're built in", async () => {
      write({
        'babel.config.json': '{ "presets": ["somon-test-preset-that-does-not-exist"] }\n',
        '.babelrc': '{ "presets": ["somon-test-preset-that-does-not-exist"] }\n',
        'main.som':
          'функсия салом(ном: сатр): сатр { бозгашт "салом " + ном; }\nчоп.сабт(салом("ҷаҳон"));\n',
      });
      const ms = createSystem();
      const cwd = process.cwd();
      process.chdir(root);
      try {
        const bundle = await ms.bundle({ entryPoint: path.join(root, 'main.som'), minify: true });
        fs.writeFileSync(path.join(root, 'out.js'), bundle.code);
      } finally {
        process.chdir(cwd);
      }
      const output = execFileSync(process.execPath, [path.join(root, 'out.js')], {
        encoding: 'utf8',
      });
      expect(output.trim()).toBe('салом ҷаҳон');
    });
  });

  describe('minified single files (src/compiler.ts, reported: not part of the module system)', () => {
    // compile()'s minifyCode() calls Babel without `configFile: false, babelrc: false`,
    // so `somon compile --minify` applies the babel.config.json of the current directory.
    test.failing('compile({ minify: true }) ignores the Babel configuration', () => {
      write({ 'babel.config.json': '{ "presets": ["somon-test-preset-that-does-not-exist"] }\n' });
      const cwd = process.cwd();
      process.chdir(root);
      try {
        expect(compileSource('чоп.сабт(1 + 2);', { minify: true }).code).toContain('console.log');
      } finally {
        process.chdir(cwd);
      }
    });
  });

  describe('dependency levels', () => {
    test('a module shared by several paths counts with its own depth', async () => {
      // main → c → d and main → b → c: the longest chain is main, b, c, d
      write({
        'd.som': 'содир собит Д = 1;\n',
        'c.som': 'ворид { Д } аз "./d";\nсодир собит В = Д;\n',
        'b.som': 'ворид { В } аз "./c";\nсодир собит Б = В;\n',
        'main.som': 'ворид { В } аз "./c";\nворид { Б } аз "./b";\nчоп.сабт(В + Б);\n',
      });
      const ms = createSystem();
      await ms.loadModule('./main', root);

      expect(ms.getStatistics().maxDependencyDepth).toBe(3);
    });

    test('levels of the dependency tree', () => {
      const id = (name: string) => path.join(root, `${name}.som`);
      const registry = new ModuleRegistry();
      for (const [name, deps] of [
        ['main', ['c', 'b']],
        ['c', ['d']],
        ['d', []],
        ['b', ['c']],
      ] as const) {
        registry.register({
          id: id(name),
          resolvedPath: id(name),
          source: '',
          ast: { type: 'Program', body: [], line: 1, column: 1 },
          dependencies: deps.map(dep => `./${dep}`),
          resolvedDependencies: deps.map(id),
          exports: { named: {} },
          isLoaded: true,
          isLoading: false,
          lastAccessed: 0,
        });
      }
      const levelOf = (name: string) => registry.getDependencyGraph().get(id(name))?.level;
      expect(['main', 'b', 'c', 'd'].map(levelOf)).toEqual([3, 2, 1, 0]);
      expect(registry.getDependencyTree(id('main'))).toMatchObject({
        level: 3,
        dependencies: [
          { id: id('c'), level: 1 },
          { id: id('b'), level: 2 },
        ],
      });
    });
  });

  describe('ModuleLoader', () => {
    test('records resolved dependency ids next to the raw specifiers', () => {
      write({ 'u.som': 'содир собит У = 1;\n', 'm.som': 'ворид { У } аз "./u";\n' });
      const loader = new ModuleLoader(new ModuleResolver({ baseUrl: root }));
      const module = loader.loadSync('./m', root);
      expect(module.dependencies).toEqual(['./u']);
      expect(module.resolvedDependencies).toEqual([path.join(root, 'u.som')]);
    });
  });
});

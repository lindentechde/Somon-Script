import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

import { ModuleLoader, ModuleResolver, ModuleSystem } from '../src/module-system';
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

    test('relative imports outside baseUrl stay allowed', () => {
      write({ 'main.som': '', '../sibling/s.som': '' });
      const resolver = new ModuleResolver({ baseUrl: root });
      expect(resolver.resolve('../sibling/s', path.join(root, 'main.som')).resolvedPath).toBe(
        path.join(path.dirname(root), 'sibling', 's.som')
      );
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

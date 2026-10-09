import * as fs from 'fs';
import * as path from 'path';

import { ModuleLoadError, ModuleLoader, ModuleResolver } from '../src/module-system';
import type { LoadedModule, ModuleLoadOptions } from '../src/module-system';
import { languageOf, locationOf } from '../src/module-system/module-loader';
import { createTempProject, type TempProject } from './helpers/module-project';

/**
 * ModuleLoader: dependencies of SomonScript, JavaScript and JSON modules, the
 * cache and its freshness and limits, cycles, externals and the errors it throws.
 */

describe('ModuleLoader', () => {
  let project: TempProject;

  beforeEach(() => {
    project = createTempProject('somon-loader-');
  });

  afterEach(() => {
    jest.restoreAllMocks();
    project.remove();
  });

  const createLoader = (options: ModuleLoadOptions = {}, resolverOptions = {}) =>
    new ModuleLoader(new ModuleResolver({ baseUrl: project.root, ...resolverOptions }), options);
  const id = (file: string) => project.file(file);

  /** The error a load throws. */
  function loadError(loader: ModuleLoader, specifier: string): ModuleLoadError {
    try {
      loader.loadSync(specifier, project.root);
    } catch (error) {
      expect(error).toBeInstanceOf(ModuleLoadError);
      return error as ModuleLoadError;
    }
    throw new Error(`loading ${specifier} did not fail`);
  }

  describe('options', () => {
    test('defaults', () => {
      const loader = createLoader();
      expect(loader.getCircularDependencyStrategy()).toBe('warn');
      expect(loader.getCacheStats()).toEqual({
        size: 0,
        memoryUsage: 0,
        maxSize: 1000,
        maxMemory: 512 * 1024 * 1024,
      });
      expect(loader.getExternals()).toEqual([]);
    });

    test('custom limits, strategy, encoding and externals', () => {
      project.write({ 'latin.som': 'тағ а = 1;\n' });
      const loader = createLoader({
        maxCacheSize: 5,
        maxCacheMemory: 4096,
        circularDependencyStrategy: 'ignore',
        encoding: 'latin1',
        externals: [' lodash ', '', '  '],
      });
      expect(loader.getCacheStats()).toMatchObject({ maxSize: 5, maxMemory: 4096 });
      expect(loader.getCircularDependencyStrategy()).toBe('ignore');
      expect(loader.getExternals()).toEqual(['lodash']);
      // Read as latin1, the UTF-8 bytes of 'т' are two characters (and no valid program)
      expect(loadError(loader, './latin').message).toMatch(/^Parse error\(s\) in /);
      expect(loader.getModule(id('latin.som'))?.source).toBe(
        Buffer.from('тағ а = 1;\n').toString('latin1')
      );
    });

    test('options may be left out', () => {
      const loader = new ModuleLoader(new ModuleResolver({ baseUrl: project.root }));
      expect(loader.getCircularDependencyStrategy()).toBe('warn');
    });

    test('cache: false reads every file again in each load, once per load', () => {
      project.write({
        'shared.som': '',
        'a.som': 'ворид "./shared";\n',
        'main.som': 'ворид "./shared";\nворид "./a";\n',
      });
      const loader = createLoader({ cache: false });
      const first = loader.loadSync('./main', project.root);
      const shared = loader.getModule(id('shared.som'))!;
      expect(loader.getModule(id('a.som'))?.resolvedDependencies).toEqual([shared.id]);
      const second = loader.loadSync('./main', project.root);
      expect(second).not.toBe(first);
      expect(loader.getModule(id('shared.som'))).not.toBe(shared);
      expect(loader.getAllModules()).toHaveLength(3);
    });

    test('setExternals replaces the externals', () => {
      const loader = createLoader({ externals: ['a'] });
      loader.setExternals(['b', ' c ']);
      expect(loader.getExternals()).toEqual(['b', 'c']);
      loader.setExternals();
      expect(loader.getExternals()).toEqual([]);
    });
  });

  describe('dependencies of SomonScript modules', () => {
    test('imports, re-exports and import-equals; type-only imports load nothing', async () => {
      project.write({
        'a.som': 'содир собит А = 1;\n',
        'b.som': 'содир собит Б = 2;\n',
        'c.som': 'содир собит В = 3;\n',
        'd.som': 'содир собит Г = 4;\n',
        'e.som': 'содир собит Д = 5;\n',
        'f.som': 'содир собит Е = 6;\n',
        'side.som': 'чоп.сабт("side");\n',
        'types.som': 'содир интерфейс Т { х: рақам; }\n',
        'main.som': [
          'ворид { А } аз "./a";',
          'ворид навъ { Т } аз "./types";',
          'ворид { навъ Т чун Т2 } аз "./types";',
          'ворид { навъ Т чун Т3, Б } аз "./b";',
          'ворид "./side";',
          'ворид Н = require("./c");',
          'содир { Г } аз "./d";',
          'содир * аз "./e";',
          'содир * чун Ф аз "./f";',
          'содир навъ { Т } аз "./types";',
          'тағ х = 1;',
          'содир { х };',
          'тағ динамикӣ = ворид("./dynamic");',
          '  ',
        ].join('\n'),
      });
      const loader = createLoader();
      const main = await loader.load('./main', project.root);
      expect(main.dependencies).toEqual(['./a', './b', './side', './c', './d', './e', './f']);
      expect(main.resolvedDependencies).toEqual(
        ['a', 'b', 'side', 'c', 'd', 'e', 'f'].map(name => id(`${name}.som`))
      );
      expect(loader.getModule(id('types.som'))).toBeUndefined();
      expect(main).toMatchObject({
        id: id('main.som'),
        resolvedPath: id('main.som'),
        isExternalLibrary: false,
        isLoaded: true,
        isLoading: false,
        size: fs.statSync(id('main.som')).size,
      });
      expect(main.ast.body.length).toBeGreaterThan(0);
      // load() and loadSync() share the cache
      expect(loader.loadSync('./main', project.root)).toBe(main);
    });

    test('specifiers are trimmed; empty, too long and backslashed ones are errors', () => {
      project.write({
        'a.som': '',
        'trim.som': 'ворид "  ./a  ";\n',
        'empty.som': 'тағ х = 1;\nворид { а } аз "   ";\n',
        'long.som': `ворид { а } аз "./${'д'.repeat(500)}";\n`,
        'back.som': 'ворид { а } аз "..\\\\a";\n',
      });
      const loader = createLoader();
      expect(loader.loadSync('./trim', project.root).dependencies).toEqual(['./a']);

      const empty = loadError(loader, './empty');
      expect(empty.message).toBe(
        `Invalid import specifier in ${id('empty.som')}: the module specifier must be a non-empty string`
      );
      expect(empty).toMatchObject({ filePath: id('empty.som'), specifier: '   ', line: 2 });
      expect(empty.column).toEqual(expect.any(Number));

      const long = loadError(loader, './long');
      expect(long.message).toBe(
        `Invalid import specifier in ${id('long.som')}: './${'д'.repeat(38)}…' is longer than 500 characters`
      );
      expect(loadError(loader, './back').message).toBe(
        `Invalid import specifier in ${id('back.som')}: '..\\a' contains a backslash; use '/' as the path separator`
      );
    });

    test('parse errors name the file and the position', () => {
      project.write({
        'syntax.som': 'тағ х = ;\n',
        'lexer.som': 'тағ х = "сатр;\n',
      });
      const loader = createLoader();
      const syntax = loadError(loader, './syntax');
      expect(syntax.message).toMatch(
        new RegExp(
          `^Parse error\\(s\\) in .*syntax\\.som: Unexpected token ';' at line 1, column 9`
        )
      );
      expect(syntax).toMatchObject({ filePath: id('syntax.som'), line: 1, column: 9 });
      expect(syntax.importer).toBeUndefined();

      // The lexer throws for what it cannot read
      const lexer = loadError(loader, './lexer');
      expect(lexer.message).toBe(
        `Parse error(s) in ${id('lexer.som')}: Unterminated string at line 1, column 9`
      );
      expect(lexer).toMatchObject({ line: 1, column: 9 });
      expect((lexer as { cause?: unknown }).cause).toBeInstanceOf(Error);
      // The module stays in the cache with its error
      expect(loader.getModule(id('lexer.som'))).toMatchObject({
        isLoaded: false,
        isLoading: false,
        error: lexer,
      });
    });
  });

  describe('JSON and JavaScript modules', () => {
    test('JSON is validated and has no dependencies', () => {
      project.write({ 'ok.json': '{ "а": 1 }', 'bad.json': '{ "а": ' });
      const loader = createLoader();
      expect(loader.loadSync('./ok.json', project.root)).toMatchObject({
        dependencies: [],
        source: '{ "а": 1 }',
      });
      const bad = loadError(loader, './bad.json');
      expect(bad.message).toMatch(new RegExp(`^Invalid JSON in .*bad\\.json: `));
      expect(bad.filePath).toBe(id('bad.json'));
      expect((bad as { cause?: unknown }).cause).toBeInstanceOf(SyntaxError);
    });

    test('local JavaScript depends on its constant relative requires that resolve', () => {
      project.write({
        'dep.js': '',
        'tmpl.js': '',
        'extra.js': '',
        'lib.js': [
          "const dep = require('./dep');",
          'const tmpl = require(`./tmpl`);',
          "const extra = require('./extra', 'ignored');",
          "// require('./in-comment')",
          'const text = "require(\'./in-string\')";',
          "const pkg = require('fs');",
          "const name = './computed'; const computed = require(name);",
          "try { require('./optional-missing'); } catch (e) {}",
          "obj.require('./member');",
          'const t = require(`./${name}`);',
          'const nothing = () => require();',
          // An invalid escape: Babel recovers, the module name is unknown
          'const odd = () => require(`./\\x`);',
        ].join('\n'),
      });
      const lib = createLoader().loadSync('./lib.js', project.root);
      expect(lib.dependencies).toEqual(['./dep', './tmpl', './extra']);
      expect(lib.resolvedDependencies).toEqual([id('dep.js'), id('tmpl.js'), id('extra.js')]);
      expect(lib.ast.body).toEqual([]);
    });

    test('JavaScript Babel cannot parse falls back to a text scan', () => {
      project.write({
        'a.js': '',
        'b.js': '',
        'broken.js': "const a = require('./a');\n  let = = require(\"./b\");\nrequire('./gone');\n",
      });
      const loader = createLoader();
      const broken = loader.loadSync('./broken.js', project.root);
      expect(broken.dependencies).toEqual(['./a', './b']);
      expect(broken.resolvedDependencies).toEqual([id('a.js'), id('b.js')]);
    });

    test('positions of JavaScript requires: from the syntax tree and from the text scan', () => {
      project.write({
        'parsed.js': "\n  const a = require('./missing-a');\n",
        'unparsed.js': "\n  let = = require('./missing-b');\n",
      });
      // An external keeps the unresolvable requires, so that their positions show
      const loader = createLoader({ externals: ['./missing-a', './missing-b'] });
      const parsed = loader.loadSync('./parsed.js', project.root);
      const unparsed = loader.loadSync('./unparsed.js', project.root);
      expect(parsed.resolvedDependencies).toEqual(['external:./missing-a']);
      expect(unparsed.resolvedDependencies).toEqual(['external:./missing-b']);
    });

    test('JavaScript of packages and imported files of other types are not scanned', () => {
      project.write({
        'node_modules/pkg/index.js': "require('./not-there');\n",
        'notes.txt': "require('./not-there')",
        'main.som': 'ворид "./notes";\n',
      });
      const loader = createLoader({}, { extensions: ['.som', '.js', '.txt'] });
      expect(loader.loadSync('pkg', project.root)).toMatchObject({
        dependencies: [],
        isExternalLibrary: true,
        language: 'javascript',
      });
      loader.loadSync('./main', project.root);
      expect(loader.getModule(id('notes.txt'))).toMatchObject({
        dependencies: [],
        language: 'other',
      });
    });

    test('the entry of a load is SomonScript whatever its name', () => {
      project.write({ 'prog.txt': 'ворид "./dep";\n', 'dep.som': '', 'lib/.som': '' });
      const loader = createLoader();
      expect(loader.loadSync('./prog.txt', project.root)).toMatchObject({
        language: 'somonscript',
        dependencies: ['./dep'],
      });
      expect(loader.loadSync('./lib/.som', project.root).language).toBe('somonscript');
      expect(languageOf('/p/x.json', true)).toBe('json');
      expect(languageOf('/p/x.js', true)).toBe('javascript');
      expect(languageOf('/p/x.mjs', false)).toBe('other');
    });
  });

  describe('externals', () => {
    test('match with and without .js/.som, and are cached modules without a file', () => {
      project.write({
        'main.som': [
          'ворид * чун Л аз "lodash";',
          'ворид { а } аз "./ext";',
          'ворид { б } аз "./other.js";',
          'ворид { в } аз "./third.som";',
          'ворид * чун фс аз "node:fs";',
        ].join('\n'),
        'second.som': 'ворид * чун Л аз "lodash";\n',
      });
      const loader = createLoader({ externals: ['lodash', './ext.js', './other.som', './third'] });
      const main = loader.loadSync('./main', project.root);
      expect(main.resolvedDependencies).toEqual([
        'external:lodash',
        'external:./ext.js',
        'external:./other.som',
        'external:./third',
        'external:node:fs',
      ]);
      const lodash = loader.getModule('external:lodash')!;
      expect(lodash).toMatchObject({
        resolvedPath: 'lodash',
        source: '',
        dependencies: [],
        isLoaded: true,
      });
      const accessed = lodash.lastAccessed;
      const second = loader.loadSync('./second', project.root);
      expect(second.resolvedDependencies).toEqual(['external:lodash']);
      expect(loader.getModule('external:lodash')).toBe(lodash);
      expect(lodash.lastAccessed).toBeGreaterThanOrEqual(accessed);
    });

    test('an external relative require of local JavaScript stays a dependency', () => {
      project.write({ 'lib.js': "require('./generated');\n" });
      const loader = createLoader({ externals: ['./generated'] });
      expect(loader.loadSync('./lib.js', project.root).dependencies).toEqual(['./generated']);
    });
  });

  describe('cache', () => {
    test('a fresh module is loaded once; a changed one, and what imports it, again', () => {
      project.write({
        'leaf.som': 'содир собит Л = 1;\n',
        'other.som': 'содир собит Д = 2;\n',
        'main.som': 'ворид { Л } аз "./leaf";\nворид { Д } аз "./other";\n',
      });
      const loader = createLoader();
      const main = loader.loadSync('./main', project.root);
      const other = loader.getModule(id('other.som'));
      expect(loader.loadSync('./main', project.root)).toBe(main);

      fs.writeFileSync(id('leaf.som'), 'содир собит Л = 100;\n');
      const reloaded = loader.loadSync('./main', project.root);
      expect(reloaded).not.toBe(main);
      expect(loader.getModule(id('leaf.som'))?.source).toBe('содир собит Л = 100;\n');
      // Unchanged modules stay
      expect(loader.getModule(id('other.som'))).toBe(other);
    });

    test('a module whose dependency left the cache or the disk is loaded again', () => {
      project.write({
        'leaf.som': 'содир собит Л = 1;\n',
        'main.som': 'ворид { Л } аз "./leaf";\n',
      });
      const loader = createLoader();
      const main = loader.loadSync('./main', project.root);
      // Out of the cache (evicted by a limit, say): the importer is not fresh
      loader.invalidate(id('leaf.som'));
      expect(loader.isLoaded(id('main.som'))).toBe(false);
      const again = loader.loadSync('./main', project.root);
      expect(again).not.toBe(main);

      // Deleted: the importer is loaded again, and its import fails
      fs.rmSync(id('leaf.som'));
      const error = loadError(loader, './main');
      expect(error.message).toBe(
        `Cannot import './leaf' in ${id('main.som')}: Cannot resolve module: ${id('leaf')}`
      );
      expect(error).toMatchObject({
        filePath: id('main.som'),
        importer: id('main.som'),
        specifier: './leaf',
        line: 1,
        column: 1,
      });
    });

    test('a module that failed is loaded again once it is fixed', () => {
      project.write({ 'main.som': 'тағ х = ;\n' });
      const loader = createLoader();
      loadError(loader, './main');
      fs.writeFileSync(id('main.som'), 'тағ х = 1;\n');
      expect(loader.loadSync('./main', project.root).isLoaded).toBe(true);
    });

    test('memory use is counted and cleared', () => {
      project.write({ 'main.som': 'тағ х = 1;\n' });
      const loader = createLoader();
      loader.loadSync('./main', project.root);
      const stats = loader.getCacheStats();
      expect(stats.size).toBe(1);
      expect(stats.memoryUsage).toBeGreaterThan(200);
      loader.clearCache();
      expect(loader.getCacheStats()).toMatchObject({ size: 0, memoryUsage: 0 });
      expect(loader.getAllModules()).toEqual([]);
    });

    test('maxCacheSize evicts the least recently used modules of earlier loads', () => {
      project.write({ 'a.som': '', 'b.som': '', 'c.som': '' });
      const loader = createLoader({ maxCacheSize: 2 });
      loader.loadSync('./a', project.root);
      loader.loadSync('./b', project.root);
      loader.loadSync('./c', project.root);
      expect(loader.getAllModules().map(module => path.basename(module.id))).toEqual([
        'b.som',
        'c.som',
      ]);
    });

    test('maxCacheMemory evicts down to 80% of the limit, never the current build', () => {
      project.write({
        'big.som': `тағ х = "${'а'.repeat(2000)}";\n`,
        'small1.som': 'тағ а = 1;\n',
        'small2.som': 'тағ б = 2;\n',
      });
      // The sizes the loader counts
      const measure = createLoader();
      const sizeOf = (file: string) => {
        measure.clearCache();
        measure.loadSync(file, project.root);
        return measure.getCacheStats().memoryUsage;
      };
      const big = sizeOf('./big');
      const small = sizeOf('./small1');

      // Over the limit with all three; after dropping 'big' far below 80% of it
      const loader = createLoader({ maxCacheMemory: big + small });
      loader.loadSync('./big', project.root);
      loader.loadSync('./small1', project.root);
      expect(loader.getCacheStats().size).toBe(2);
      loader.loadSync('./small2', project.root);
      expect(loader.getAllModules().map(module => path.basename(module.id))).toEqual([
        'small1.som',
        'small2.som',
      ]);

      // A build larger than the limit keeps all it needs
      const tiny = createLoader({ maxCacheMemory: 1 });
      tiny.loadSync('./small1', project.root);
      tiny.loadSync('./big', project.root);
      expect(tiny.getAllModules().map(module => path.basename(module.id))).toEqual(['big.som']);
    });

    test('invalidate evicts a module and every module that imports it', () => {
      project.write({
        'leaf.som': '',
        'left.som': 'ворид "./leaf";\n',
        'right.som': 'ворид "./leaf";\n',
        'top.som': 'ворид "./left";\nворид "./right";\n',
        'alone.som': '',
      });
      const loader = createLoader();
      loader.loadSync('./top', project.root);
      loader.loadSync('./alone', project.root);
      const before = loader.getCacheStats().memoryUsage;
      expect(loader.invalidate(id('leaf.som')).map(file => path.basename(file))).toEqual([
        'leaf.som',
        'left.som',
        'right.som',
        'top.som',
      ]);
      expect(loader.getAllModules().map(module => path.basename(module.id))).toEqual(['alone.som']);
      expect(loader.getCacheStats().memoryUsage).toBeLessThan(before);
      expect(loader.invalidate(id('nothing.som'))).toEqual([]);
    });

    test('invalidate passes over external modules, which import nothing', () => {
      project.write({ 'main.som': 'ворид * чун фс аз "fs";\nворид "./dep";\n', 'dep.som': '' });
      const loader = createLoader();
      loader.loadSync('./main', project.root);
      expect(loader.isLoaded('external:fs')).toBe(true);
      expect(loader.invalidate(id('dep.som'))).toEqual([id('dep.som'), id('main.som')]);
      expect(loader.getAllModules().map(module => module.id)).toEqual(['external:fs']);
    });

    test('invalidating a module that failed to load evicts it without counting memory', () => {
      project.write({ 'broken.som': 'тағ = ;\n' });
      const loader = createLoader();
      loadError(loader, './broken');
      expect(loader.getCacheStats()).toEqual(expect.objectContaining({ size: 1, memoryUsage: 0 }));
      expect(loader.invalidate(id('broken.som'))).toEqual([id('broken.som')]);
      expect(loader.getCacheStats()).toEqual(expect.objectContaining({ size: 0, memoryUsage: 0 }));
    });
  });

  describe('circular dependencies', () => {
    const cycle = {
      'a.som': 'ворид * чун Б аз "./b";\nсодир собит А = 1;\n',
      'b.som': 'ворид * чун А аз "./a";\nсодир собит Б = 2;\n',
    };

    test("'warn' (default) records the chain and returns the module being loaded", () => {
      project.write(cycle);
      const loader = createLoader();
      const a = loader.loadSync('./a', project.root);
      const b = loader.getModule(id('b.som'))!;
      expect(b.resolvedDependencies).toEqual([a.id]);
      const warnings = loader.getWarnings();
      expect(warnings).toEqual([
        `Circular dependency detected: ${a.id} (chain: ${a.id} -> ${b.id} -> ${a.id})`,
      ]);
      warnings.push('changed');
      expect(loader.getWarnings()).toHaveLength(1);
      loader.clearWarnings();
      expect(loader.getWarnings()).toEqual([]);
      // Both are fresh: loading again follows the cycle without loading anything
      expect(loader.loadSync('./b', project.root)).toBe(b);
    });

    test("'ignore' records nothing", () => {
      project.write(cycle);
      const loader = createLoader({ circularDependencyStrategy: 'ignore' });
      loader.loadSync('./a', project.root);
      expect(loader.getWarnings()).toEqual([]);
    });

    test("'error' fails with the import that closes the cycle", () => {
      project.write(cycle);
      const error = loadError(createLoader({ circularDependencyStrategy: 'error' }), './a');
      expect(error.message).toBe(
        `Cannot import './a' in ${id('b.som')}: Circular dependency detected: ${id('a.som')} ` +
          `(chain: ${id('a.som')} -> ${id('b.som')} -> ${id('a.som')})`
      );
      expect(error).toMatchObject({
        filePath: id('b.som'),
        importer: id('b.som'),
        specifier: './a',
      });
    });

    test('a loaded module whose dependency is still loading counts as fresh', () => {
      // a → b → a, and a → c → b: c meets b loaded, b's dependency a still loading
      project.write({
        'a.som': 'ворид "./b";\nворид "./c";\n',
        'b.som': 'ворид "./a";\n',
        'c.som': 'ворид "./b";\n',
      });
      const loader = createLoader();
      loader.loadSync('./a', project.root);
      expect(loader.getModule(id('c.som'))?.resolvedDependencies).toEqual([id('b.som')]);
      expect(loader.getWarnings()).toHaveLength(1);
    });
  });

  describe('errors', () => {
    test('an error in a dependency names the dependency and the import', () => {
      project.write({
        'deep.som': 'тағ х = ;\n',
        'mid.som': 'ворид "./deep";\n',
        'top.som': 'ворид "./mid";\n',
      });
      const error = loadError(createLoader(), './top');
      expect(error.message).toMatch(
        new RegExp(`Unexpected token ';'.* \\(imported as '\\./deep' from .*mid\\.som\\)$`)
      );
      // The closest importer, not the top one
      expect(error).toMatchObject({
        filePath: id('deep.som'),
        importer: id('mid.som'),
        specifier: './deep',
        line: 1,
        column: 9,
      });
    });

    test('a file that cannot be read is an error of that file', () => {
      project.write({ 'locked.som': 'тағ х = 1;\n' });
      const readFileSync = fs.readFileSync;
      jest.spyOn(require('fs') as typeof fs, 'readFileSync').mockImplementation(((
        file: fs.PathOrFileDescriptor,
        ...rest: unknown[]
      ) => {
        if (file === id('locked.som')) {
          throw Object.assign(new Error(`EACCES: permission denied, open '${file}'`), {
            code: 'EACCES',
          });
        }
        return (readFileSync as (...args: unknown[]) => unknown)(file, ...rest);
      }) as typeof fs.readFileSync);
      const error = loadError(createLoader(), './locked');
      expect(error.message).toBe(`EACCES: permission denied, open '${id('locked.som')}'`);
      expect(error.filePath).toBe(id('locked.som'));
      expect((error as { cause?: { code?: string } }).cause?.code).toBe('EACCES');
    });

    test('an entry that does not resolve is the resolver’s error', () => {
      expect(() => createLoader().loadSync('./nothing', project.root)).toThrow(
        `Cannot resolve module: ${id('nothing')}`
      );
    });
  });

  describe('queries', () => {
    test('modules, the raw graph, closures and isLoaded', () => {
      project.write({
        'a.som': 'ворид "./b";\n',
        'b.som': 'ворид "./a";\nворид "./c";\n',
        'c.som': '',
      });
      const loader = createLoader({ circularDependencyStrategy: 'ignore' });
      loader.loadSync('./a', project.root);
      expect(loader.getAllModules().map((module: LoadedModule) => module.id)).toEqual(
        ['a', 'b', 'c'].map(name => id(`${name}.som`))
      );
      expect(Object.fromEntries(loader.getDependencyGraph())).toEqual({
        [id('a.som')]: ['./b'],
        [id('b.som')]: ['./a', './c'],
        [id('c.som')]: [],
      });
      expect([...loader.collectDependencyClosure(id('a.som'))].sort()).toEqual(
        ['a', 'b', 'c'].map(name => id(`${name}.som`))
      );
      expect([...loader.collectDependencyClosure(id('c.som'))]).toEqual([id('c.som')]);
      expect([...loader.collectDependencyClosure('unknown')]).toEqual(['unknown']);
      expect(loader.isLoaded(id('c.som'))).toBe(true);
      expect(loader.isLoaded(id('unknown.som'))).toBe(false);
    });
  });

  describe('ModuleLoadError and locationOf', () => {
    test('ModuleLoadError carries the file, the import and the position', () => {
      const cause = new Error('inner');
      const error = new ModuleLoadError('message', {
        filePath: '/f.som',
        importer: '/i.som',
        specifier: './f',
        line: 2,
        column: 3,
        cause,
      });
      expect(error).toBeInstanceOf(Error);
      expect(error).toMatchObject({
        name: 'ModuleLoadError',
        message: 'message',
        filePath: '/f.som',
        importer: '/i.som',
        specifier: './f',
        line: 2,
        column: 3,
      });
      expect((error as { cause?: unknown }).cause).toBe(cause);
      expect('cause' in new ModuleLoadError('m', { filePath: '/f.som' })).toBe(false);
    });

    test('locationOf reads "line L, column C" from compiler messages', () => {
      expect(locationOf('Parse error: x at line 3, column 7: y')).toEqual({ line: 3, column: 7 });
      expect(locationOf('Error at LINE 12')).toEqual({ line: 12, column: undefined });
      expect(locationOf('Failed: 42 things')).toEqual({});
    });
  });
});

import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { SourceMapConsumer, type RawSourceMap } from 'source-map';

import { ModuleSystem } from '../src/module-system';
import type { ModuleSystemOptions } from '../src/module-system';
import { createTempProject, type TempProject } from './helpers/module-project';

// The compiler module as CommonJS exports, so that compile() can be watched
// eslint-disable-next-line @typescript-eslint/no-var-requires
const compilerModule = require('../src/compiler') as typeof import('../src/compiler');

/**
 * ModuleSystem: configuration validation, the compiler options of a build,
 * compile()/bundle() results and errors, loading, the module graph API and
 * validate(). Watching is in module-system-watch.test.ts.
 */

describe('ModuleSystem', () => {
  let project: TempProject;
  const systems: ModuleSystem[] = [];

  beforeEach(() => {
    project = createTempProject('somon-ms-api-');
  });

  afterEach(async () => {
    await Promise.all(systems.map(system => system.shutdown()));
    systems.length = 0;
    jest.restoreAllMocks();
    project.remove();
  });

  function createSystem(options: ModuleSystemOptions = {}): ModuleSystem {
    const system = new ModuleSystem({
      ...options,
      resolution: { baseUrl: project.root, ...options.resolution },
    });
    systems.push(system);
    return system;
  }

  const file = (name: string) => project.file(name);

  describe('configuration', () => {
    const invalid = (options: unknown) => () => new ModuleSystem(options as ModuleSystemOptions);

    test('a baseUrl is required', () => {
      expect(() => new ModuleSystem()).toThrow(/requires explicit baseUrl/);
    });

    test('every problem is listed, numbered', () => {
      expect(
        invalid({
          resolution: { baseUrl: 5, allowJs: 'yes', resolveJsonModule: 1 },
          loading: { circularDependencyStrategy: 'panic' },
        })
      ).toThrow(
        'ModuleSystem configuration validation failed:\n' +
          '  1. resolution.baseUrl must be a string\n' +
          '  2. resolution.allowJs must be a boolean\n' +
          '  3. resolution.resolveJsonModule must be a boolean\n' +
          '  4. loading.circularDependencyStrategy must be one of: error, warn, ignore, got: panic'
      );
    });

    test.each([
      [{ paths: 'x' }, 'resolution.paths must be an object mapping strings to string arrays'],
      [{ paths: null }, 'resolution.paths must be an object mapping strings to string arrays'],
      [{ paths: { a: 'b' } }, "resolution.paths['a'] must be an array of strings"],
      [{ paths: { a: [1] } }, "resolution.paths['a'] must contain only strings"],
      [{ extensions: '.som' }, 'resolution.extensions must be an array of strings'],
      [{ extensions: [1] }, 'resolution.extensions must contain only strings'],
      [{ extensions: [] }, 'resolution.extensions must not be empty'],
      [
        { extensions: ['som', '.js', 'x'] },
        'resolution.extensions must start with a dot, invalid: som, x',
      ],
      [{ moduleDirectories: 'nm' }, 'resolution.moduleDirectories must be an array of strings'],
      [{ moduleDirectories: [false] }, 'resolution.moduleDirectories must contain only strings'],
      [{ moduleDirectories: [] }, 'resolution.moduleDirectories must not be empty'],
    ])('resolution %j', (resolution, message) => {
      expect(invalid({ resolution: { baseUrl: project.root, ...resolution } })).toThrow(
        `  1. ${message}`
      );
    });

    test.each([
      [{ circularDependencyStrategy: 'loud' }, 'loading.circularDependencyStrategy must be one of'],
      [{ maxCacheSize: 0 }, 'loading.maxCacheSize must be a positive integer, got: 0'],
      [{ maxCacheSize: 1.5 }, 'loading.maxCacheSize must be a positive integer, got: 1.5'],
      [
        { maxCacheMemory: 1023 },
        'loading.maxCacheMemory must be at least 1KB (1024 bytes), got: 1023',
      ],
      [{ maxCacheMemory: 2048.5 }, 'loading.maxCacheMemory must be at least 1KB'],
      [{ encoding: 'utf-9' }, 'loading.encoding must be a valid encoding, got: utf-9'],
    ])('loading %j', (loading, message) => {
      expect(invalid({ resolution: { baseUrl: project.root }, loading })).toThrow(message);
    });

    test.each([
      [{ target: 'es3' }, 'compilation.target must be one of: es5'],
      [{ lib: 'es2020' }, 'compilation.lib must be an array of TypeScript lib names'],
      [{ lib: ['es1999'] }, "compilation.lib unknown lib 'es1999'"],
      [{ useDefineForClassFields: 'no' }, 'compilation.useDefineForClassFields must be a boolean'],
      [{ sourceMap: 'yes' }, 'compilation.sourceMap must be a boolean'],
      [{ minify: 1 }, 'compilation.minify must be a boolean'],
      [{ noTypeCheck: 'x' }, 'compilation.noTypeCheck must be a boolean'],
      [{ strict: 0 }, 'compilation.strict must be a boolean'],
      [{ watch: 'x' }, 'compilation.watch must be a boolean'],
      [{ compileOnSave: 'x' }, 'compilation.compileOnSave must be a boolean'],
      [{ experimentalDecorators: 'x' }, 'compilation.experimentalDecorators must be a boolean'],
      [{ declaration: 'x' }, 'compilation.declaration must be a boolean'],
      [{ output: 5 }, 'compilation.output must be a string'],
      [{ outDir: [] }, 'compilation.outDir must be a string'],
    ])('compilation %j', (compilation, message) => {
      expect(invalid({ resolution: { baseUrl: project.root }, compilation })).toThrow(message);
    });

    test('valid options of every kind are accepted', () => {
      expect(
        () =>
          new ModuleSystem({
            resolution: {
              baseUrl: project.root,
              paths: { '@/*': ['src/*'] },
              extensions: ['.som'],
              moduleDirectories: ['node_modules'],
              allowJs: true,
              resolveJsonModule: false,
            },
            loading: {
              circularDependencyStrategy: 'error',
              maxCacheSize: 10,
              maxCacheMemory: 1024,
              encoding: 'utf8',
              cache: true,
            },
            compilation: {
              target: 'es2015',
              lib: ['es2020', 'dom'],
              useDefineForClassFields: true,
              sourceMap: true,
              output: 'out.js',
              outDir: 'dist',
            },
          })
      ).not.toThrow();
    });
  });

  describe('compiler options of a build', () => {
    beforeEach(() => {
      project.write({ 'main.som': 'тағ х: рақам = 1;\nчоп.сабт(х);\n' });
    });

    test('every option reaches the compiler, with the file path of the module', async () => {
      const compile = jest.spyOn(compilerModule, 'compile');
      const system = createSystem({
        compilation: {
          target: 'es2015',
          sourceMap: true,
          minify: true,
          noTypeCheck: true,
          strict: true,
          experimentalDecorators: true,
          lib: ['es2020'],
          useDefineForClassFields: false,
          module: 'esm',
          checker: 'somon',
          locale: 'ru',
          // Options of the CLI that a module's compilation does not use
          declaration: true,
          watch: false,
        },
      });
      expect((await system.compile(file('main.som'))).errors).toEqual([]);
      expect(compile).toHaveBeenCalledWith(expect.any(String), {
        target: 'es2015',
        sourceMap: true,
        minify: true,
        typeCheck: false,
        strict: true,
        experimentalDecorators: true,
        lib: ['es2020'],
        useDefineForClassFields: false,
        module: 'esm',
        checker: 'somon',
        locale: 'ru',
        filePath: file('main.som'),
      });
    });

    test('without options the compiler gets only the file path', async () => {
      const compile = jest.spyOn(compilerModule, 'compile');
      await createSystem().compile(file('main.som'));
      expect(compile).toHaveBeenCalledWith(expect.any(String), { filePath: file('main.som') });
    });

    test('compile() overrides and bundle() settings take precedence', async () => {
      const compile = jest.spyOn(compilerModule, 'compile');
      const system = createSystem({ compilation: { target: 'es5', minify: true, module: 'esm' } });
      await system.compile(file('main.som'), undefined, { target: 'es2020' });
      expect(compile).toHaveBeenLastCalledWith(expect.any(String), {
        target: 'es2020',
        minify: true,
        module: 'esm',
        filePath: file('main.som'),
      });
      // A bundle compiles CommonJS modules without lowering or minifying them
      await system.bundle({ entryPoint: file('main.som'), format: 'commonjs', sourceMaps: false });
      expect(compile).toHaveBeenLastCalledWith(expect.any(String), {
        target: 'es5',
        minify: false,
        downlevel: false,
        module: 'commonjs',
        sourceMap: false,
        filePath: file('main.som'),
      });
    });

    test('the options change the output: target, module, type checking and strictness', async () => {
      project.write({ 'typed.som': 'тағ х: рақам = "сатр";\nсодир собит у = () => х;\n' });
      const output = async (compilation: ModuleSystemOptions['compilation']) => {
        const result = await createSystem({ compilation }).compile(file('typed.som'));
        return { code: result.modules.get(file('typed.som'))?.code, errors: result.errors };
      };
      const plain = await output({});
      // Without strict a type error is reported and the code is still emitted
      expect(plain.errors).toHaveLength(1);
      expect(plain.code).toBeUndefined();

      const unchecked = await output({ noTypeCheck: true });
      expect(unchecked.errors).toEqual([]);
      expect(unchecked.code).toContain('() => х');

      const es5 = await output({ noTypeCheck: true, target: 'es5' });
      expect(es5.code).toContain('function () {');
      expect(es5.code).not.toContain('=>');

      const esm = await output({ noTypeCheck: true, module: 'esm' });
      expect(esm.code).toMatch(/^export const у = /m);

      const minified = await output({ noTypeCheck: true, minify: true });
      expect(minified.code!.split('\n').length).toBeLessThan(unchecked.code!.split('\n').length);
    });

    test('the TypeScript checker reports in the language of locale', async () => {
      project.write({ 'typed.som': 'тағ х: рақам = "сатр";\n' });
      const result = await createSystem({
        compilation: { checker: 'typescript', locale: 'ru' },
      }).compile(file('typed.som'));
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toMatch(/TS2322/);
      expect(result.errors[0].message).toMatch(/[а-яА-Я]/);
      expect(result.errors[0]).toMatchObject({ filePath: file('typed.som'), line: 1, column: 5 });
    });
  });

  describe('compile()', () => {
    test('errors of every module, each with its file, position and suggestion', async () => {
      project.write({
        'a.som': 'содир собит А = 1;\nчоп.сабт(нест);\n',
        'b.som': 'тағ х = 1;\nтағ х = 2;\nсодир собит Б = 2;\n',
        'main.som': 'ворид { А } аз "./a";\nворид { Б } аз "./b";\nчоп.сабт(А + Б);\n',
      });
      const result = await createSystem({ compilation: { strict: true } }).compile(
        file('main.som')
      );
      expect(result.errors).toEqual([
        expect.objectContaining({
          filePath: file('a.som'),
          line: 2,
          column: 10,
          message: expect.stringMatching(/Variable 'нест' is not defined/),
          suggestion:
            'Make sure the variable is declared before use. Check for typos in variable names',
        }),
        expect.objectContaining({
          filePath: file('b.som'),
          line: 2,
          column: 1,
          message: expect.stringMatching(/Identifier 'х' has already been declared/),
          suggestion:
            'A variable with this name already exists in this scope. Use a different name or remove the duplicate declaration',
        }),
      ]);
      // Modules that compiled are in the result
      expect([...result.modules.keys()]).toEqual([file('main.som')]);
      expect(result.entryPoint).toBe(file('main.som'));
      expect(result.dependencies).toEqual([file('a.som'), file('b.som'), file('main.som')]);
    });

    test('warnings of the compiler name their module', async () => {
      project.write({ 'main.som': 'тағ р: рақам[] = [1];\nчоп.сабт(р.нестХосият);\n' });
      const result = await createSystem().compile(file('main.som'));
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([expect.stringMatching(/^Warning in .*main\.som: /)]);
    });

    test('an entry that does not load is one error without line', async () => {
      const result = await createSystem().compile(file('missing.som'));
      expect(result).toEqual({
        modules: new Map(),
        entryPoint: '',
        dependencies: [],
        errors: [
          expect.objectContaining({
            filePath: file('missing.som'),
            message: `Failed to load entry point: Cannot resolve module: ${file('missing.som')}`,
            line: undefined,
            suggestion: undefined,
          }),
        ],
        warnings: [],
      });
      project.write({ 'bad.som': 'ворид "./gone";\n' });
      const nested = await createSystem().compile(file('bad.som'));
      expect(nested.errors[0]).toMatchObject({
        filePath: file('bad.som'),
        importer: file('bad.som'),
        specifier: './gone',
        line: 1,
        column: 1,
      });
      expect(nested.errors[0].originalError?.name).toBe('ModuleLoadError');
    });

    test('a crash of the compiler is an error of the module', async () => {
      project.write({ 'main.som': 'чоп.сабт(1);\n' });
      const crash = new Error('the compiler crashed');
      jest.spyOn(compilerModule, 'compile').mockImplementation(() => {
        throw crash;
      });
      const result = await createSystem().compile(file('main.som'));
      expect(result.errors).toEqual([
        expect.objectContaining({
          message: 'Unexpected error: the compiler crashed',
          filePath: file('main.som'),
          originalError: crash,
        }),
      ]);
    });

    test('suggestions for the messages they know', () => {
      const suggest = (message: string) =>
        (
          createSystem() as unknown as { getSuggestionForError(m: string): string | undefined }
        ).getSuggestionForError(message);
      expect(suggest('Unexpected token x')).toMatch(/brackets, parentheses, or semicolons/);
      expect(suggest('Unexpected token end of input')).toMatch(/unclosed brackets/);
      expect(suggest("Type 'сатр' is not assignable")).toMatch(/types of your variables/);
      expect(suggest('Identifier х has already been declared')).toMatch(/already exists/);
      expect(suggest('Unexpected end of input')).toMatch(/unclosed brackets/);
      expect(suggest('Cannot find module x')).toMatch(/module path is correct/);
      expect(suggest('Module not found: x')).toMatch(/module path is correct/);
      expect(suggest('Circular dependency detected')).toMatch(/remove circular dependencies/);
      expect(suggest('Type mismatch in call')).toMatch(/types of your variables/);
      expect(suggest('x is undefined')).toMatch(/declared before use/);
      expect(suggest('Variable redeclared')).toMatch(/already exists in this scope/);
      expect(suggest('Type of x')).toBeUndefined();
      expect(suggest('Something else')).toBeUndefined();
    });

    describe('cycles that the loader does not meet', () => {
      // u → v is loaded; then v is changed to import u and compiled as the entry: the
      // loader takes u from the cache, so only the module graph shows the cycle
      async function closeCycle(system: ModuleSystem) {
        project.write({
          'v.som': 'содир собит В = 1;\n',
          'u.som': 'ворид { В } аз "./v";\nсодир собит У = В;\n',
        });
        await system.compile(file('u.som'));
        project.write({ 'v.som': 'ворид * чун У аз "./u";\nсодир собит В = 1;\n' });
        return system.compile(file('v.som'));
      }

      test("'error' fails the build with the cycle", async () => {
        const result = await closeCycle(
          createSystem({ loading: { circularDependencyStrategy: 'error' } })
        );
        expect(result.modules.size).toBe(0);
        expect(result.dependencies).toEqual([]);
        expect(result.entryPoint).toBe(file('v.som'));
        expect(result.errors).toEqual([
          expect.objectContaining({
            message: `Circular dependency detected: ${file('u.som')} -> ${file('v.som')} -> ${file('u.som')}`,
            filePath: file('u.som'),
            suggestion: 'Refactor your code to remove circular dependencies between modules',
          }),
        ]);
      });

      test("'warn' reports it once", async () => {
        const result = await closeCycle(createSystem());
        expect(result.errors).toEqual([]);
        expect(result.warnings).toEqual([
          `Circular dependencies detected: ${file('u.som')} -> ${file('v.som')} -> ${file('u.som')}`,
        ]);
      });
    });
  });

  describe('loading and the module graph', () => {
    beforeEach(() => {
      project.write({
        'leaf.som': 'содир собит Л = 1;\n',
        'main.som': 'ворид { Л } аз "./leaf";\nчоп.сабт(Л);\n',
      });
    });

    test('loadModule and loadModuleSync register what they load', async () => {
      const system = createSystem();
      const main = system.loadModuleSync('./main', project.root);
      expect(main.id).toBe(file('main.som'));
      expect(system.getModule(file('leaf.som'))?.dependents).toEqual([file('main.som')]);
      expect(system.getAllModules().map(meta => path.basename(meta.id))).toEqual([
        'main.som',
        'leaf.som',
      ]);
      expect(Object.fromEntries(system.getDependencyGraph())).toEqual({
        [file('main.som')]: [file('leaf.som')],
        [file('leaf.som')]: [],
      });
      expect(system.getStatistics()).toMatchObject({ totalModules: 2, maxDependencyDepth: 1 });
      expect(await system.loadModule('./main', project.root)).toBe(main);
      expect(system.resolve('./leaf', file('main.som'))).toBe(file('leaf.som'));
    });

    test('a module that fails to load is registered, so validate() names its problem', async () => {
      project.write({ 'broken.som': 'ворид { А } аз "./missing";\n' });
      const system = createSystem();
      await expect(system.loadModule('./broken', project.root)).rejects.toThrow(
        /Cannot import '\.\/missing'/
      );
      expect(system.getModule(file('broken.som'))?.dependencies).toEqual(['./missing']);
      expect(system.validate()).toEqual({
        isValid: false,
        errors: [
          `Missing dependency './missing' in module '${file('broken.som')}': ` +
            `Error: Cannot resolve module: ${file('missing')}`,
        ],
      });
      // An entry that does not resolve registers nothing
      await expect(system.loadModule('./nothing', project.root)).rejects.toThrow(
        'Cannot resolve module'
      );
      expect(system.getAllModules()).toHaveLength(1);
    });

    test('validate() reports cycles; Node.js modules are no missing dependencies', async () => {
      project.write({
        'a.som': 'ворид * чун Б аз "./b";\nворид * чун фс аз "fs";\n',
        'b.som': 'ворид * чун А аз "./a";\n',
      });
      const system = createSystem();
      expect(system.validate()).toEqual({ isValid: true, errors: [] });
      system.loadModuleSync('./a', project.root);
      expect(system.validate()).toEqual({
        isValid: false,
        errors: [
          `Circular dependencies found: ${file('a.som')} -> ${file('b.som')} -> ${file('a.som')}`,
        ],
      });
    });

    test('clearCache, invalidate and updateOptions', async () => {
      const system = createSystem();
      system.loadModuleSync('./main', project.root);
      expect(system.invalidate(file('leaf.som'))).toEqual([file('leaf.som'), file('main.som')]);
      expect(system.getAllModules()).toEqual([]);

      system.loadModuleSync('./main', project.root);
      system.clearCache();
      expect(system.getAllModules()).toEqual([]);
      expect(system.getStatistics().totalModules).toBe(0);

      project.write({ 'lib/x.som': 'содир собит Х = 1;\n' });
      expect(() => system.resolve('@/x', file('main.som'))).toThrow('Module not found: @/x');
      system.updateOptions({ resolution: { paths: { '@/*': ['lib/*'] } } });
      system.updateOptions({});
      expect(system.resolve('@/x', file('main.som'))).toBe(file('lib/x.som'));
    });
  });

  describe('bundle()', () => {
    const run = (code: string, name = 'bundle.js') => {
      const output = file(`out/${name}`);
      fs.mkdirSync(path.dirname(output), { recursive: true });
      fs.writeFileSync(output, code);
      return execFileSync(process.execPath, [output], { encoding: 'utf8' }).trim();
    };

    test('the error of a failed build lists errors and warnings', async () => {
      project.write({
        'a.som': 'ворид * чун Б аз "./b";\nсодир собит А = 1;\n',
        'b.som': 'ворид * чун А аз "./a";\nтағ х: рақам = "сатр";\n',
      });
      const system = createSystem({ compilation: { strict: true } });
      const error = await system.bundle({ entryPoint: file('a.som') }).then(
        () => undefined,
        (failure: Error) => failure
      );
      expect(error?.message).toMatch(
        new RegExp(
          '^Bundle process failed with 1 error\\(s\\):\\n\\n' +
            `  1\\. .*b\\.som:2:16\\n     Type error \\[TYPE_NOT_ASSIGNABLE\\][^]*` +
            '💡 Suggestion: Check that the types[^]*' +
            '\\n\\nWarnings \\(1\\):\\n  1\\. Circular dependencies detected: '
        )
      );
    });

    test('an entry that is an external is no program to bundle', async () => {
      project.write({ 'main.som': '' });
      await expect(
        createSystem().bundle({ entryPoint: file('main.som'), externals: ['./main.som'] })
      ).rejects.toThrow(
        'Failed to generate bundle: Entry point must be an absolute path for bundling.'
      );
    });

    test('externals: relative, absolute and imported from elsewhere stay requires', async () => {
      project.write({
        'util.som': 'содир собит У = "util";\n',
        'gen.som': 'содир собит Г = "gen";\n',
        'sub/use.som': 'ворид { У } аз "../util";\nсодир собит Ш = У;\n',
        'main.som': [
          'ворид { У } аз "./util";',
          'ворид { Г } аз "./gen";',
          'ворид { Ш } аз "./sub/use";',
          'чоп.сабт(У, Г, Ш);',
        ].join('\n'),
      });
      const system = createSystem();
      const bundle = await system.bundle({
        entryPoint: file('main.som'),
        externals: ['./util', file('gen.som')],
      });
      // Neither is a module of the bundle; their requires are left as they are
      expect(bundle.code).not.toMatch(/"util\.som": function/);
      expect(bundle.code).not.toMatch(/"gen\.som": function/);
      expect(bundle.code).toContain('require("./util.js")');
      expect(bundle.code).toContain('require("../util.js")');
      expect(bundle.code).toContain('require("./gen.js")');
      expect(bundle.code).toMatch(/"sub\/use\.som": function/);
    });

    test('dynamic requires of local JavaScript are left to the run time', async () => {
      project.write({
        'dep.js': 'module.exports = "dep";\n',
        'lib.js': "const name = './dep.js';\nexports.д = require(name);\n",
        'main.som': 'ворид { д } аз "./lib";\nчоп.сабт(д);\n',
      });
      const bundle = await createSystem().bundle({ entryPoint: file('main.som') });
      expect(bundle.code).toContain('exports.д = require(name);');
      // Next to the project the host require finds the file
      fs.writeFileSync(file('bundle.js'), bundle.code);
      expect(execFileSync(process.execPath, [file('bundle.js')], { encoding: 'utf8' }).trim()).toBe(
        'dep'
      );
    });

    test('source maps: file names, empty modules, inlined sources and unmapped segments', async () => {
      project.write({
        'empty.som': '',
        'main.som': 'ворид "./empty";\nчоп.сабт(1);\n',
        'plain.js': 'console.log(2);\n',
      });
      const system = createSystem();
      const bundle = await system.bundle({
        entryPoint: file('main.som'),
        sourceMaps: true,
        inlineSources: true,
      });
      const map = JSON.parse(bundle.map!) as RawSourceMap;
      // Without outputPath: named after the entry, sources relative to its directory
      expect(map.file).toBe('main.bundle.js');
      expect(map.sources).toEqual(['main.som']);
      expect(map.sourcesContent).toEqual(['ворид "./empty";\nчоп.сабт(1);\n']);
      expect(run(bundle.code)).toBe('1');

      const js = await system.bundle({ entryPoint: file('plain.js'), sourceMaps: true });
      expect(JSON.parse(js.map!).file).toBe('plain.js.bundle.js');

      // A map with a segment that maps nothing (as other compilers write them)
      const compile = compilerModule.compile;
      jest.spyOn(compilerModule, 'compile').mockImplementation((source, options) => {
        const result = compile(source, options);
        const parsed = JSON.parse(result.sourceMap!) as RawSourceMap;
        parsed.mappings = `A,${parsed.mappings}`;
        return { ...result, sourceMap: JSON.stringify(parsed) };
      });
      const unmapped = await createSystem().bundle({
        entryPoint: file('main.som'),
        sourceMaps: true,
      });
      await SourceMapConsumer.with(JSON.parse(unmapped.map!), null, consumer => {
        const generated = consumer.generatedPositionFor({
          source: 'main.som',
          line: 2,
          column: 0,
        });
        expect(generated.line).toBeGreaterThan(1);
      });
    });

    test('minify comes from the compilation unless bundle() says otherwise', async () => {
      project.write({
        'main.som':
          'функсия ҷамъ(а: рақам, б: рақам): рақам {\n    бозгашт а + б;\n}\nчоп.сабт(ҷамъ(1, 2));\n',
      });
      const system = createSystem({ compilation: { minify: true } });
      const minified = await system.bundle({ entryPoint: file('main.som') });
      const plain = await system.bundle({ entryPoint: file('main.som'), minify: false });
      expect(minified.code.length).toBeLessThan(plain.code.length);
      expect(run(minified.code)).toBe('3');
      expect(run(plain.code)).toBe('3');
    });

    test('without babel-preset-minify a minified bundle is an error', async () => {
      project.write({ 'main.som': 'чоп.сабт(1);\n' });
      jest.doMock('babel-preset-minify', () => {
        throw new Error('Cannot find module');
      });
      try {
        await expect(
          createSystem().bundle({ entryPoint: file('main.som'), minify: true })
        ).rejects.toThrow(
          "Failed to generate bundle: Minification failed: Minification requires the optional dependency 'babel-preset-minify'. Install it to enable minified bundles."
        );
      } finally {
        jest.dontMock('babel-preset-minify');
      }
    });
  });
});

/**
 * src/config.ts: every validation rule of somon.config.json with its path and
 * message (compilerOptions, moduleSystem.resolution/.loading/.compilation,
 * bundle and fmt), wrong types for each option, and how the file is found
 * and read.
 */
import * as fs from 'fs';
import * as path from 'path';

import { TARGETS } from '../src/targets';
import { ConfigError, loadConfig, loadConfigWithPath } from '../src/config';
import { canonicalTmpDir } from './helpers/paths';

let dir: string;

beforeEach(() => {
  dir = canonicalTmpDir('somon-config-validation-');
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

function write(config: unknown, where = dir): string {
  return writeText(JSON.stringify(config), where);
}

function writeText(text: string, where = dir): string {
  const file = path.join(where, 'somon.config.json');
  fs.mkdirSync(where, { recursive: true });
  fs.writeFileSync(file, text);
  return file;
}

/** The problems reported for `config`, as `path: message`; [] when it is valid. */
function problems(config: unknown): string[] {
  write(config);
  try {
    loadConfig(dir);
    return [];
  } catch (error) {
    expect(error).toBeInstanceOf(ConfigError);
    const configError = error as ConfigError;
    expect(configError.name).toBe('ConfigError');
    expect(configError.message).toBe(
      `Invalid configuration in ${path.join(dir, 'somon.config.json')}`
    );
    return configError.details.map(detail => `${detail.path}: ${detail.message}`);
  }
}

const COMPILER_OPTIONS =
  'output, target, lib, useDefineForClassFields, sourceMap, minify, noTypeCheck, strict, ' +
  'outDir, watch, compileOnSave, experimentalDecorators, module, checker, locale, declaration';
const TARGET_LIST = TARGETS.join(', ');
const LIB_TYPE = 'must be an array of TypeScript lib names, e.g. ["es2022", "dom"]';
const GLOBAL_NAME =
  'must be an identifier or a dotted path of identifiers, e.g. "MyLib" or "app.lib"';

describe('the configuration file', () => {
  test.each([5, 'es5', true, null, []])('%j is not a configuration', config => {
    expect(problems(config)).toEqual(['root: configuration must be an object']);
  });

  test('unknown top-level properties are listed with the known ones', () => {
    expect(problems({ compilerOption: {}, plugins: [] })).toEqual([
      'compilerOption: unknown configuration property. Known properties: compilerOptions, moduleSystem, bundle, fmt, режим',
      'plugins: unknown configuration property. Known properties: compilerOptions, moduleSystem, bundle, fmt, режим',
    ]);
  });

  test('an empty configuration and an empty object for every section are valid', () => {
    expect(problems({})).toEqual([]);
    expect(
      problems({
        compilerOptions: {},
        moduleSystem: { resolution: {}, loading: {}, compilation: {} },
        bundle: {},
        fmt: {},
      })
    ).toEqual([]);
  });

  test('every option with a valid value', () => {
    const config = {
      compilerOptions: {
        output: 'out.js',
        target: 'es2015',
        lib: ['es2015', 'dom'],
        useDefineForClassFields: false,
        sourceMap: true,
        minify: false,
        noTypeCheck: false,
        strict: true,
        outDir: 'dist',
        watch: false,
        compileOnSave: false,
        experimentalDecorators: true,
        module: 'esm',
        checker: 'typescript',
        locale: 'ru',
        declaration: true,
      },
      moduleSystem: {
        resolution: {
          baseUrl: 'src',
          paths: { '@/*': ['./*', './lib/*'], empty: [] },
          extensions: ['.som', '.js'],
          moduleDirectories: ['node_modules', 'vendor'],
          allowJs: true,
          resolveJsonModule: false,
        },
        loading: { encoding: 'utf8', cache: true, circularDependencyStrategy: 'ignore' },
        compilation: { target: 'es5', strict: false },
      },
      bundle: {
        format: 'iife',
        globalName: 'app.Китоб',
        minify: true,
        sourceMaps: true,
        inlineSources: false,
        externals: ['fs', 'path'],
        output: 'build/app.js',
      },
      fmt: { indent: 2 },
    };
    expect(problems(config)).toEqual([]);
    expect(loadConfig(dir)).toEqual(config);
  });

  test('all problems are reported at once, in order', () => {
    expect(
      problems({
        extra: 1,
        compilerOptions: { target: 'es3', minify: 'yes' },
        moduleSystem: { loading: { cache: 'no' } },
        bundle: { output: 1 },
        fmt: { indent: 0 },
      })
    ).toEqual([
      'extra: unknown configuration property. Known properties: compilerOptions, moduleSystem, bundle, fmt, режим',
      `compilerOptions.target: must be one of: ${TARGET_LIST}`,
      'compilerOptions.minify: must be a boolean',
      'moduleSystem.loading.cache: must be a boolean',
      'bundle.output: must be a string',
      'fmt.indent: must be an integer from 1 to 16',
    ]);
  });
});

describe.each([
  ['compilerOptions', (options: unknown) => ({ compilerOptions: options })],
  ['moduleSystem.compilation', (options: unknown) => ({ moduleSystem: { compilation: options } })],
])('%s', (where, wrap) => {
  test.each([5, 'strict', true, null, []])('%j is not an object', value => {
    expect(problems(wrap(value))).toEqual([`${where}: must be an object`]);
  });

  test.each([['es3'], ['ES2015'], [2015], [null], [['es5']]])('target %j', target => {
    expect(problems(wrap({ target }))).toEqual([`${where}.target: must be one of: ${TARGET_LIST}`]);
  });

  test.each(TARGETS.map(target => [target]))('target %s is valid', target => {
    expect(problems(wrap({ target }))).toEqual([]);
  });

  test('lib', () => {
    expect(problems(wrap({ lib: ['ES2022', ' dom '] }))).toEqual([]);
    expect(problems(wrap({ lib: [] }))).toEqual([]);
    expect(problems(wrap({ lib: 'es2022' }))).toEqual([`${where}.lib: ${LIB_TYPE}`]);
    expect(problems(wrap({ lib: ['es2022', 5] }))).toEqual([`${where}.lib: ${LIB_TYPE}`]);
    const [unknown] = problems(wrap({ lib: ['es2022', 'браузер', 'es1999'] }));
    expect(unknown).toMatch(
      new RegExp(
        `^${where.replace('.', '\\.')}\\.lib: unknown lib 'браузер', 'es1999'\\. TypeScript ships es5, `
      )
    );
  });

  test.each([
    ['module', ['commonjs', 'esm'], ['amd', 'ESM', 1]],
    ['checker', ['somon', 'typescript'], ['flow', 'tsc', false]],
    ['locale', ['en', 'ru', 'tj'], ['de', 'tg', ['ru']]],
  ] as const)('%s takes one of %j', (option, valid, invalid) => {
    for (const value of valid) expect(problems(wrap({ [option]: value }))).toEqual([]);
    for (const value of invalid) {
      expect(problems(wrap({ [option]: value }))).toEqual([
        `${where}.${option}: must be one of: ${valid.join(', ')}`,
      ]);
    }
  });

  test.each([
    'useDefineForClassFields',
    'sourceMap',
    'minify',
    'noTypeCheck',
    'strict',
    'watch',
    'compileOnSave',
    'experimentalDecorators',
    'declaration',
  ])('%s must be a boolean', option => {
    expect(problems(wrap({ [option]: true }))).toEqual([]);
    expect(problems(wrap({ [option]: false }))).toEqual([]);
    for (const value of ['true', 1, null, {}]) {
      expect(problems(wrap({ [option]: value }))).toEqual([
        `${where}.${option}: must be a boolean`,
      ]);
    }
  });

  test.each(['output', 'outDir'])('%s must be a string', option => {
    expect(problems(wrap({ [option]: 'dist' }))).toEqual([]);
    for (const value of [1, true, ['dist'], null]) {
      expect(problems(wrap({ [option]: value }))).toEqual([`${where}.${option}: must be a string`]);
    }
  });

  test('unknown options are listed with the known ones', () => {
    expect(problems(wrap({ sourcemap: true, outFile: 'x' }))).toEqual([
      `${where}.sourcemap: unknown compiler option. Known options: ${COMPILER_OPTIONS}`,
      `${where}.outFile: unknown compiler option. Known options: ${COMPILER_OPTIONS}`,
    ]);
  });
});

describe('moduleSystem', () => {
  test.each([5, 'x', null, []])('%j is not an object', value => {
    expect(problems({ moduleSystem: value })).toEqual(['moduleSystem: must be an object']);
  });

  test('unknown properties', () => {
    expect(problems({ moduleSystem: { resolve: {}, cache: true } })).toEqual([
      'moduleSystem.resolve: unknown property',
      'moduleSystem.cache: unknown property',
    ]);
  });

  describe('resolution', () => {
    const resolution = (value: unknown) => problems({ moduleSystem: { resolution: value } });
    const RESOLUTION_KEYS =
      'baseUrl, paths, extensions, moduleDirectories, allowJs, resolveJsonModule';

    test.each([5, 'src', null, []])('%j is not an object', value => {
      expect(resolution(value)).toEqual(['moduleSystem.resolution: must be an object']);
    });

    test('unknown properties are listed with the known ones', () => {
      expect(resolution({ base: '.' })).toEqual([
        `moduleSystem.resolution.base: unknown property. Known properties: ${RESOLUTION_KEYS}`,
      ]);
    });

    test.each([1, true, null, ['src']])('baseUrl %j must be a string', baseUrl => {
      expect(resolution({ baseUrl })).toEqual([
        'moduleSystem.resolution.baseUrl: must be a string',
      ]);
    });

    test.each([5, 'x', null, [['./*']]])('paths %j is not an object', paths => {
      expect(resolution({ paths })).toEqual(['moduleSystem.resolution.paths: must be an object']);
    });

    test.each([{ a: './a' }, { a: ['./a', 1] }, { a: ['./a'], b: null }])(
      'paths %j must map to string arrays',
      paths => {
        expect(resolution({ paths })).toEqual([
          'moduleSystem.resolution.paths: must be Record<string,string[]>',
        ]);
      }
    );

    test.each(['extensions', 'moduleDirectories'])('%s must be a string array', option => {
      expect(resolution({ [option]: [] })).toEqual([]);
      for (const value of ['.som', ['.som', 1], { 0: '.som' }, null]) {
        expect(resolution({ [option]: value })).toEqual([
          `moduleSystem.resolution.${option}: must be string[]`,
        ]);
      }
    });

    test.each(['allowJs', 'resolveJsonModule'])('%s must be a boolean', option => {
      expect(resolution({ [option]: 'yes' })).toEqual([
        `moduleSystem.resolution.${option}: must be a boolean`,
      ]);
    });

    test('every problem of the section is reported', () => {
      expect(
        resolution({
          baseUrl: 1,
          paths: 1,
          extensions: 1,
          moduleDirectories: 1,
          allowJs: 1,
          resolveJsonModule: 1,
        })
      ).toHaveLength(6);
    });
  });

  describe('loading', () => {
    const loading = (value: unknown) => problems({ moduleSystem: { loading: value } });

    test.each([5, 'utf8', null, []])('%j is not an object', value => {
      expect(loading(value)).toEqual(['moduleSystem.loading: must be an object']);
    });

    test('unknown properties are listed with the known ones', () => {
      expect(loading({ timeout: 5 })).toEqual([
        'moduleSystem.loading.timeout: unknown property. Known properties: encoding, cache, circularDependencyStrategy',
      ]);
    });

    test('encoding must be a string, cache a boolean', () => {
      expect(loading({ encoding: 8, cache: 'no' })).toEqual([
        'moduleSystem.loading.encoding: must be a string',
        'moduleSystem.loading.cache: must be a boolean',
      ]);
    });

    test.each(['error', 'warn', 'ignore'])('circularDependencyStrategy %s is valid', strategy => {
      expect(loading({ circularDependencyStrategy: strategy })).toEqual([]);
    });

    test.each(['fail', 'Error', 0, null])('circularDependencyStrategy %j', strategy => {
      expect(loading({ circularDependencyStrategy: strategy })).toEqual([
        'moduleSystem.loading.circularDependencyStrategy: must be one of: error, warn, ignore',
      ]);
    });
  });
});

describe('bundle', () => {
  const bundle = (value: unknown) => problems({ bundle: value });

  test.each([5, 'esm', null, []])('%j is not an object', value => {
    expect(bundle(value)).toEqual(['bundle: must be an object']);
  });

  test('unknown properties are listed with the known ones', () => {
    expect(bundle({ sourceMap: true })).toEqual([
      'bundle.sourceMap: unknown property. Known properties: format, globalName, minify, sourceMaps, inlineSources, externals, output',
    ]);
  });

  test.each(['commonjs', 'esm', 'iife'])('format %s is valid', format => {
    expect(bundle({ format })).toEqual([]);
  });

  test.each(['umd', 'ESM', 1, null])('format %j', format => {
    expect(bundle({ format })).toEqual(['bundle.format: must be one of: commonjs, esm, iife']);
  });

  test.each(['Китоб', 'app.lib', '$_.a1'])('globalName %j is valid', globalName => {
    expect(bundle({ globalName })).toEqual([]);
  });

  test.each(['app-lib', '1app', 'a..b', '', 5, null])('globalName %j', globalName => {
    expect(bundle({ globalName })).toEqual([`bundle.globalName: ${GLOBAL_NAME}`]);
  });

  test.each(['minify', 'sourceMaps', 'inlineSources'])('%s must be a boolean', option => {
    expect(bundle({ [option]: true })).toEqual([]);
    expect(bundle({ [option]: 'true' })).toEqual([`bundle.${option}: must be a boolean`]);
  });

  test.each([1, false, null])('output %j must be a string', output => {
    expect(bundle({ output })).toEqual(['bundle.output: must be a string']);
  });

  test.each(['fs', ['fs', 1], { fs: true }, null])(
    'externals %j must be a string array',
    externals => {
      expect(bundle({ externals })).toEqual(['bundle.externals: must be string[]']);
    }
  );
});

describe('fmt', () => {
  test.each([4, 'tabs', null, []])('%j is not an object', value => {
    expect(problems({ fmt: value })).toEqual(['fmt: must be an object']);
  });

  test('unknown properties are listed with the known ones', () => {
    expect(problems({ fmt: { tabs: true } })).toEqual([
      'fmt.tabs: unknown property. Known properties: indent',
    ]);
  });

  test.each([1, 4, 16])('indent %j is valid', indent => {
    expect(problems({ fmt: { indent } })).toEqual([]);
  });

  test.each([0, 17, -1, 1.5, '4', true, null])('indent %j', indent => {
    expect(problems({ fmt: { indent } })).toEqual(['fmt.indent: must be an integer from 1 to 16']);
  });
});

describe('finding and reading somon.config.json', () => {
  test('the nearest file at or above the start directory wins', () => {
    const outer = write({ fmt: { indent: 2 } });
    const inner = write({ fmt: { indent: 8 } }, path.join(dir, 'a'));
    const deep = path.join(dir, 'a', 'b', 'c');
    fs.mkdirSync(deep, { recursive: true });

    expect(loadConfigWithPath(deep)).toEqual({
      config: { fmt: { indent: 8 } },
      configPath: inner,
      configDir: path.join(dir, 'a'),
    });
    expect(loadConfigWithPath(path.join(dir, 'b'))).toEqual({
      config: { fmt: { indent: 2 } },
      configPath: outer,
      configDir: dir,
    });
    expect(loadConfig(deep)).toEqual({ fmt: { indent: 8 } });
  });

  test('a start path that is a file, or does not exist, is searched from upward', () => {
    write({ fmt: { indent: 3 } });
    fs.writeFileSync(path.join(dir, 'main.som'), '');
    expect(loadConfig(path.join(dir, 'main.som'))).toEqual({ fmt: { indent: 3 } });
    expect(loadConfig(path.join(dir, 'missing', 'deeper'))).toEqual({ fmt: { indent: 3 } });
  });

  test('a relative start path is resolved against the current directory', () => {
    write({ fmt: { indent: 5 } });
    const previous = process.cwd();
    process.chdir(dir);
    try {
      expect(loadConfigWithPath('.').configDir).toBe(dir);
    } finally {
      process.chdir(previous);
    }
  });

  test('without a file the configuration is empty', () => {
    const found = loadConfigWithPath(dir);
    // Only a stray somon.config.json above the temporary directory would be found
    if (found.configPath === undefined) {
      expect(found).toEqual({ config: {} });
    } else {
      expect(path.relative(found.configDir!, dir).startsWith('..')).toBe(false);
    }
  });

  test('a file that is not JSON', () => {
    const file = writeText('{ "fmt": { indent: 2 } }');
    expect.assertions(3);
    try {
      loadConfig(dir);
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigError);
      expect((error as ConfigError).message).toMatch(
        new RegExp(`^Failed to parse config file ${file.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')}: `)
      );
      expect((error as ConfigError).details).toEqual([]);
    }
  });

  test('a file that cannot be read', () => {
    // A directory of that name exists, so it is found but cannot be read
    fs.mkdirSync(path.join(dir, 'somon.config.json'));
    expect(() => loadConfig(dir)).toThrow(ConfigError);
    expect(() => loadConfig(dir)).toThrow(
      new RegExp(`^Failed to read config file .*somon\\.config\\.json: .*EISDIR`)
    );
  });

  test('the reason a file cannot be read is its error message', () => {
    write({});
    const read = jest
      .spyOn(require('fs') as typeof fs, 'readFileSync')
      .mockImplementationOnce(() => {
        throw new Error('EACCES: permission denied');
      });
    try {
      expect(() => loadConfig(dir)).toThrow(
        `Failed to read config file ${path.join(dir, 'somon.config.json')}: EACCES: permission denied`
      );
    } finally {
      read.mockRestore();
    }
  });

  test('ConfigError keeps its details', () => {
    expect(new ConfigError('x').details).toEqual([]);
    const details = [{ path: 'a', message: 'b' }];
    const error = new ConfigError('message', details);
    expect(error).toBeInstanceOf(Error);
    expect(error.details).toBe(details);
    expect(error.message).toBe('message');
  });
});

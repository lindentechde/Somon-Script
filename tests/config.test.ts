import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ConfigError, loadConfig, loadConfigWithPath } from '../src/config';

describe('somon.config.json loader/validation', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'somon-config-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      /* ignore cleanup errors */
    }
  });

  test('throws when config file cannot be parsed', () => {
    fs.writeFileSync(path.join(tempDir, 'somon.config.json'), '{ invalid json');
    expect(() => loadConfig(tempDir)).toThrow(ConfigError);

    try {
      loadConfig(tempDir);
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigError);
      if (error instanceof ConfigError) {
        expect(error.message).toContain('Failed to parse config file');
        expect(error.details).toHaveLength(0);
      }
    }
  });

  test('rejects unknown top-level properties', () => {
    fs.writeFileSync(
      path.join(tempDir, 'somon.config.json'),
      JSON.stringify({ unknown: true }, null, 2)
    );
    expect(() => loadConfig(tempDir)).toThrow(ConfigError);

    try {
      loadConfig(tempDir);
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigError);
      if (error instanceof ConfigError) {
        expect(error.details.some(detail => detail.path === 'unknown')).toBe(true);
      }
    }
  });

  test('accepts moduleSystem and bundle sections', () => {
    fs.writeFileSync(
      path.join(tempDir, 'somon.config.json'),
      JSON.stringify(
        {
          moduleSystem: {
            resolution: { baseUrl: '.', extensions: ['.som'] },
            loading: { cache: true, circularDependencyStrategy: 'warn' },
            compilation: { target: 'es2015' },
          },
          bundle: {
            format: 'commonjs',
            minify: true,
            sourceMaps: false,
            inlineSources: true,
            externals: ['fs'],
          },
        },
        null,
        2
      )
    );

    const cfg = loadConfig(tempDir);
    expect(cfg.moduleSystem?.resolution?.baseUrl).toBe('.');
    expect(cfg.moduleSystem?.loading?.cache).toBe(true);
    expect(cfg.moduleSystem?.compilation?.target).toBe('es2015');
    expect(cfg.bundle?.format).toBe('commonjs');
    expect(cfg.bundle?.externals).toEqual(['fs']);
    expect(cfg.bundle?.inlineSources).toBe(true);
  });

  test('rejects unsupported bundle format', () => {
    fs.writeFileSync(
      path.join(tempDir, 'somon.config.json'),
      JSON.stringify({ bundle: { format: 'esm' } }, null, 2)
    );

    expect(() => loadConfig(tempDir)).toThrow(ConfigError);

    try {
      loadConfig(tempDir);
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigError);
      if (error instanceof ConfigError) {
        expect(error.details.some(detail => detail.path === 'bundle.format')).toBe(true);
        expect(error.details.some(detail => /commonjs/.test(detail.message))).toBe(true);
      }
    }
  });

  test('rejects non-boolean bundle.inlineSources', () => {
    fs.writeFileSync(
      path.join(tempDir, 'somon.config.json'),
      JSON.stringify({ bundle: { inlineSources: 'yes please' } }, null, 2)
    );

    expect(() => loadConfig(tempDir)).toThrow(ConfigError);

    try {
      loadConfig(tempDir);
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigError);
      if (error instanceof ConfigError) {
        expect(error.details.some(detail => detail.path === 'bundle.inlineSources')).toBe(true);
      }
    }
  });
  test('reports the directory the config file was found in', () => {
    fs.writeFileSync(
      path.join(tempDir, 'somon.config.json'),
      JSON.stringify({ compilerOptions: { outDir: 'dist' } })
    );
    const nested = path.join(tempDir, 'src', 'deep');
    fs.mkdirSync(nested, { recursive: true });

    const found = loadConfigWithPath(nested);
    expect(found.configDir).toBe(path.resolve(tempDir));
    expect(found.configPath).toBe(path.join(path.resolve(tempDir), 'somon.config.json'));
    expect(found.config.compilerOptions?.outDir).toBe('dist');
    expect(loadConfig(nested)).toEqual(found.config);
  });

  test('reports no config directory when no config file exists', () => {
    const found = loadConfigWithPath(tempDir);
    // A config file may exist in an ancestor of the temp dir only on odd machines.
    if (found.configPath === undefined) {
      expect(found.configDir).toBeUndefined();
      expect(found.config).toEqual({});
    }
  });

  test.each([
    ['bundle', { bundle: { sourceMap: true } }, 'bundle.sourceMap'],
    [
      'moduleSystem.resolution',
      { moduleSystem: { resolution: { bogus: 1 } } },
      'moduleSystem.resolution.bogus',
    ],
    ['moduleSystem.loading', { moduleSystem: { loading: { foo: 1 } } }, 'moduleSystem.loading.foo'],
  ])('rejects unknown keys in %s', (_section, config, expectedPath) => {
    fs.writeFileSync(path.join(tempDir, 'somon.config.json'), JSON.stringify(config));
    expect.assertions(2);
    try {
      loadConfig(tempDir);
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigError);
      expect((error as ConfigError).details.map(detail => detail.path)).toContain(expectedPath);
    }
  });
});

describe('somon.config.json: targets, lib and bundle formats', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'somon-config-targets-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  function problems(config: unknown): Array<{ path: string; message: string }> {
    fs.writeFileSync(path.join(tempDir, 'somon.config.json'), JSON.stringify(config));
    try {
      loadConfig(tempDir);
      return [];
    } catch (error) {
      return (error as ConfigError).details;
    }
  }

  test.each(['es5', 'es2016', 'es2021', 'es2023', 'es2024', 'esnext'])(
    'accepts target %s',
    target => {
      expect(problems({ compilerOptions: { target } })).toEqual([]);
    }
  );

  test('lists every target when one is unknown', () => {
    expect(problems({ compilerOptions: { target: 'es2030' } })).toEqual([
      {
        path: 'compilerOptions.target',
        message:
          'must be one of: es5, es2015, es2016, es2017, es2018, es2019, es2020, es2021, es2022, es2023, es2024, esnext',
      },
    ]);
  });

  test('validates lib against the libs TypeScript ships', () => {
    expect(problems({ compilerOptions: { lib: ['ES2022', 'dom', 'es2015.promise'] } })).toEqual([]);
    const [unknown] = problems({ compilerOptions: { lib: ['es2022', 'браузер'] } });
    expect(unknown.path).toBe('compilerOptions.lib');
    expect(unknown.message).toMatch(/^unknown lib 'браузер'\. TypeScript ships es5, /);
    expect(problems({ moduleSystem: { compilation: { lib: 'dom' } } })).toEqual([
      {
        path: 'moduleSystem.compilation.lib',
        message: 'must be an array of TypeScript lib names, e.g. ["es2022", "dom"]',
      },
    ]);
  });

  test('useDefineForClassFields must be a boolean', () => {
    expect(problems({ compilerOptions: { useDefineForClassFields: false } })).toEqual([]);
    expect(problems({ compilerOptions: { useDefineForClassFields: 'no' } })).toEqual([
      { path: 'compilerOptions.useDefineForClassFields', message: 'must be a boolean' },
    ]);
  });
});

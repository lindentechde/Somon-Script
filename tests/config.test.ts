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

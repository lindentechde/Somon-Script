import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ConfigError, loadConfig } from '../src/config';

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
          bundle: { format: 'commonjs', minify: true, sourceMaps: false, externals: ['fs'] },
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
});

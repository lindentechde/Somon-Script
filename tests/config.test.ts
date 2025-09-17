import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { loadConfig } from '../src/config';

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

  test('returns empty config on invalid content', () => {
    fs.writeFileSync(path.join(tempDir, 'somon.config.json'), '{ invalid json');
    const cfg = loadConfig(tempDir);
    expect(cfg).toEqual({});
  });

  test('rejects unknown top-level properties', () => {
    fs.writeFileSync(
      path.join(tempDir, 'somon.config.json'),
      JSON.stringify({ unknown: true }, null, 2)
    );
    const cfg = loadConfig(tempDir);
    expect(cfg).toEqual({});
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
});

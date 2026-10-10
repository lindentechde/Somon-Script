/**
 * somon.config.json keys of the TypeScript backend: module, checker, locale
 * and declaration (also in moduleSystem.compilation).
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ConfigError, loadConfig } from '../src/config';

describe('TypeScript backend config keys', () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'somon-config-ts-'));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  function load(config: unknown) {
    fs.writeFileSync(path.join(dir, 'somon.config.json'), JSON.stringify(config));
    return loadConfig(dir);
  }

  function details(config: unknown): string[] {
    try {
      load(config);
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigError);
      return (error as ConfigError).details.map(detail => `${detail.path}: ${detail.message}`);
    }
    throw new Error('expected a ConfigError');
  }

  test('valid values', () => {
    const compilerOptions = {
      module: 'esm',
      checker: 'typescript',
      locale: 'tj',
      declaration: true,
    };
    expect(load({ compilerOptions, moduleSystem: { compilation: compilerOptions } })).toEqual({
      compilerOptions,
      moduleSystem: { compilation: compilerOptions },
    });
  });

  test('invalid values', () => {
    expect(
      details({
        compilerOptions: { module: 'amd', checker: 'flow', locale: 'de', declaration: 'yes' },
      })
    ).toEqual([
      'compilerOptions.module: must be one of: commonjs, esm',
      'compilerOptions.checker: must be one of: somon, typescript',
      'compilerOptions.locale: must be one of: en, ru, tj',
      'compilerOptions.declaration: must be a boolean',
    ]);
    expect(details({ moduleSystem: { compilation: { module: 1 } } })).toEqual([
      'moduleSystem.compilation.module: must be one of: commonjs, esm',
    ]);
  });
});

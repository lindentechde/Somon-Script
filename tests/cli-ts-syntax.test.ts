import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigError, loadConfig } from '../src/config';
import { ModuleSystem } from '../src/module-system';
import { buildCliOnce, canonicalTmpDir } from './helpers/paths';

/**
 * The TypeScript 5 declaration syntax through the CLI and the module system:
 * `--experimental-decorators` (and `experimentalDecorators` in
 * somon.config.json), `истифода` in a real Node.js process, shebangs in
 * compiled files and bundles, and type-only imports in bundles.
 */
describe('CLI: TypeScript declaration syntax', () => {
  let cliPath: string;
  let tempDir: string;

  const somon = (args: string[]) =>
    spawnSync(process.execPath, [cliPath, ...args], { cwd: tempDir, encoding: 'utf-8' });
  const node = (file: string) =>
    spawnSync(process.execPath, [file], { cwd: tempDir, encoding: 'utf-8' });
  const write = (name: string, source: string): string => {
    const file = path.join(tempDir, name);
    fs.writeFileSync(file, source);
    return file;
  };

  const PARAMETER_DECORATORS = [
    'функсия тазриқ(_: ҳар, __: ҳар, ҷой: рақам) { чоп.сабт("параметр", ҷой); }',
    'синф Хизмат { конструктор(@тазриқ ном: сатр) { чоп.сабт(ном); } }',
    'нав Хизмат("хизмат");',
  ].join('\n');

  beforeAll(() => {
    cliPath = buildCliOnce();
  });

  beforeEach(() => {
    tempDir = canonicalTmpDir('somon-ts-syntax-');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('--experimental-decorators allows parameter decorators', () => {
    write('хизмат.som', PARAMETER_DECORATORS);
    const without = somon(['compile', 'хизмат.som']);
    expect(without.status).toBe(1);
    expect(without.stderr).toContain(
      "parameter decorators need the 'experimentalDecorators' option"
    );

    const compiled = somon(['compile', 'хизмат.som', '--experimental-decorators']);
    expect(compiled.status).toBe(0);
    expect(fs.readFileSync(path.join(tempDir, 'хизмат.js'), 'utf-8')).toContain('__param(0,');
    expect(node('хизмат.js').stdout).toBe('параметр 0\nхизмат\n');

    const run = somon(['run', 'хизмат.som', '--experimental-decorators']);
    expect(run.status).toBe(0);
    expect(run.stdout).toBe('параметр 0\nхизмат\n');
  });

  test('experimentalDecorators in somon.config.json', () => {
    write(
      'somon.config.json',
      JSON.stringify({ compilerOptions: { experimentalDecorators: true } })
    );
    write('хизмат.som', PARAMETER_DECORATORS);
    expect(somon(['compile', 'хизмат.som']).status).toBe(0);
    const run = somon(['run', 'хизмат.som']);
    expect(run.stdout).toBe('параметр 0\nхизмат\n');
  });

  test('the option is validated and documented', () => {
    write('somon.config.json', JSON.stringify({ compilerOptions: { experimentalDecorators: 1 } }));
    expect(() => loadConfig(tempDir)).toThrow(ConfigError);
    try {
      loadConfig(tempDir);
    } catch (error) {
      expect((error as ConfigError).details).toEqual([
        { path: 'compilerOptions.experimentalDecorators', message: 'must be a boolean' },
      ]);
    }
    write(
      'somon.config.json',
      JSON.stringify({ compilerOptions: { experimentalDecorators: true } })
    );
    expect(loadConfig(tempDir).compilerOptions?.experimentalDecorators).toBe(true);
    expect(somon(['compile', '--help']).stdout).toContain('--experimental-decorators');
  });

  test('`истифода` runs in Node.js without a polyfill', () => {
    write(
      'манбаъ.som',
      [
        'функсия манбаъ(ном: сатр) {',
        '    бозгашт { ном, [Symbol.dispose]() { чоп.сабт("бастан", ном); } };',
        '}',
        'ҳамзамон функсия кор() {',
        '    истифода а = манбаъ("а");',
        '    интизор истифода б = { ҳамзамон [Symbol.asyncDispose]() { чоп.сабт("бастан б"); } };',
        '    чоп.сабт("кор", а.ном);',
        '}',
        'кор();',
      ].join('\n')
    );
    const run = somon(['run', 'манбаъ.som', '--strict']);
    expect(run.stderr).toBe('');
    expect(run.stdout).toBe('кор а\nбастан б\nбастан а\n');
  });

  test('a shebang stays the first line of the compiled file', () => {
    write('асбоб.som', '#!/usr/bin/env node\nчоп.сабт("салом");\n');
    expect(somon(['compile', 'асбоб.som', '--source-map']).status).toBe(0);
    const code = fs.readFileSync(path.join(tempDir, 'асбоб.js'), 'utf-8');
    expect(code.split('\n')[0]).toBe('#!/usr/bin/env node');
    expect(node('асбоб.js').stdout).toBe('салом\n');
    const map = JSON.parse(fs.readFileSync(path.join(tempDir, 'асбоб.js.map'), 'utf-8'));
    expect(map.mappings).toBe(';AACA');
  });

  test('a bundle starts with its entry’s shebang and leaves type-only imports out', () => {
    write(
      'асосӣ.som',
      '#!/usr/bin/env node\nворид { ҷамъ } аз "./ҳисоб";\nворид навъ { Нуқта } аз "./навъҳо";\nсобит н: Нуқта = { х: 1 };\nчоп.сабт(ҷамъ(н.х, 2));\n'
    );
    write(
      'ҳисоб.som',
      '#!/usr/bin/env node\nсодир функсия ҷамъ(а: рақам, б: рақам): рақам { бозгашт а + б; }\n'
    );
    write('навъҳо.som', 'содир интерфейс Нуқта { х: рақам; }\nчоп.сабт("навъҳо");\n');
    const bundle = somon(['bundle', 'асосӣ.som', '-o', 'бастаи.js', '--source-map']);
    expect(bundle.status).toBe(0);
    const code = fs.readFileSync(path.join(tempDir, 'бастаи.js'), 'utf-8');
    expect(code.split('\n')[0]).toBe('#!/usr/bin/env node');
    expect(code.match(/#!/g)).toHaveLength(1);
    expect(code).not.toContain('навъҳо');
    expect(node('бастаи.js').stdout).toBe('3\n');

    const minified = somon(['bundle', 'асосӣ.som', '-o', 'хурд.js', '--minify']);
    expect(minified.status).toBe(0);
    expect(node('хурд.js').stdout).toBe('3\n');
  });

  test('the module system does not load type-only dependencies', async () => {
    const entry = write(
      'асосӣ.som',
      'ворид навъ { А } аз "./а";\nворид { навъ Б } аз "./б";\nсодир навъ { В } аз "./в";\nворид г = require("./г");\nчоп.сабт(г.х);\n'
    );
    write('г.som', 'содир собит х = 1;\n');
    const system = new ModuleSystem({ resolution: { baseUrl: tempDir } });
    const result = await system.compile(entry);
    expect(result.errors).toEqual([]);
    expect([...result.modules.keys()].map(file => path.basename(file)).sort()).toEqual([
      'асосӣ.som',
      'г.som',
    ]);
  });
});

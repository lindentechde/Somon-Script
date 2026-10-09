import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { buildCliOnce, canonicalTmpDir, runCli } from './helpers/paths';

/**
 * Source maps written by `compile` and `bundle` into another directory must lead
 * Node (`--enable-source-maps`) back to the original `.som` lines.
 */
describe('CLI source maps (spawned)', () => {
  let tempDir: string;

  const throwingModule = 'содир функсия партоб(): холӣ {\n  партофтан нав Error("бум");\n}\n';

  const runWithSourceMaps = (file: string) =>
    spawnSync(process.execPath, ['--enable-source-maps', file], {
      cwd: tempDir,
      encoding: 'utf-8',
    });

  beforeAll(() => {
    buildCliOnce();
  });

  beforeEach(() => {
    tempDir = canonicalTmpDir('somon-cli-maps-');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('compile --source-map links the output to a map that names the .som file', () => {
    const input = path.join(tempDir, 'src', 'e.som');
    fs.mkdirSync(path.dirname(input));
    fs.writeFileSync(input, `${throwingModule}партоб();\n`);
    const output = path.join(tempDir, 'out', 'e.js');

    runCli(['compile', input, '-o', output, '--source-map'], { cwd: tempDir });

    expect(fs.readFileSync(output, 'utf8')).toMatch(/\n\/\/# sourceMappingURL=e\.js\.map$/);
    const map = JSON.parse(fs.readFileSync(`${output}.map`, 'utf8'));
    expect(map.sources).toEqual(['../src/e.som']);
    expect(map.file).toBe('e.js');

    const result = runWithSourceMaps(output);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(`${input}:2:`);
  });

  test('bundle -o into another directory maps sources relative to the map file', () => {
    fs.mkdirSync(path.join(tempDir, 'lib'));
    fs.writeFileSync(path.join(tempDir, 'lib', 'm.som'), throwingModule);
    const entry = path.join(tempDir, 'thr.som');
    fs.writeFileSync(entry, 'ворид { партоб } аз "./lib/m";\nчоп.сабт("пеш");\nпартоб();\n');
    const output = path.join(tempDir, 'out', 'b.js');

    runCli(['bundle', entry, '-o', output, '--source-map'], { cwd: tempDir });

    const map = JSON.parse(fs.readFileSync(`${output}.map`, 'utf8'));
    expect(map.sources.sort()).toEqual(['../lib/m.som', '../thr.som']);
    expect(JSON.stringify(map)).not.toContain(tempDir);

    const result = runWithSourceMaps(output);
    expect(result.stdout.trim()).toBe('пеш');
    expect(result.stderr).toContain(`${path.join(tempDir, 'lib', 'm.som')}:2:`);
  });
});

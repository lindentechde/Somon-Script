import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vm from 'vm';

import { ModuleSystem } from '../src/module-system';

/**
 * Exported names are member names of the module object, so they follow the
 * same Tajik→JS member-name mapping as `о.илова` (`илова` → `push`). Export,
 * named import, re-export and namespace access must all agree on it.
 */
describe('member-name aliasing across module boundaries', () => {
  let tempDir: string;
  const moduleSystems: ModuleSystem[] = [];

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'somon-aliasing-'));
  });

  afterEach(async () => {
    await Promise.all(moduleSystems.map(ms => ms.shutdown()));
    moduleSystems.length = 0;
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  async function runProject(files: Record<string, string>): Promise<string[]> {
    for (const [name, source] of Object.entries(files)) {
      fs.writeFileSync(path.join(tempDir, name), source);
    }
    const moduleSystem = new ModuleSystem({ resolution: { baseUrl: tempDir } });
    moduleSystems.push(moduleSystem);
    const bundle = await moduleSystem.bundle({
      entryPoint: path.join(tempDir, 'main.som'),
      format: 'commonjs',
    });
    const logs: string[] = [];
    const log = (...args: unknown[]) => logs.push(args.map(String).join(' '));
    vm.runInContext(bundle.code, vm.createContext({ console: { log } }));
    return logs;
  }

  const lib =
    'содир функсия илова(а: рақам, б: рақам): рақам { бозгашт а + б; }\n' +
    'содир собит дарозӣ: рақам = 5;\n' +
    'функсия филтр(): сатр { бозгашт "ф"; }\n' +
    'содир { филтр };\n';

  test('named imports of aliased names', async () => {
    const main =
      'ворид { илова, дарозӣ, филтр } аз "./lib";\n' + 'чоп.сабт(илова(1, 2), дарозӣ, филтр());\n';
    expect(await runProject({ 'lib.som': lib, 'main.som': main })).toEqual(['3 5 ф']);
  });

  test('namespace imports of aliased names', async () => {
    const main = 'ворид * чун Л аз "./lib";\nчоп.сабт(Л.илова(1, 2), Л.дарозӣ, Л.филтр());\n';
    expect(await runProject({ 'lib.som': lib, 'main.som': main })).toEqual(['3 5 ф']);
  });

  test('renamed imports and re-exports of aliased names', async () => {
    const mid = 'содир { илова чун дарозӣ, филтр } аз "./lib";\n';
    const main =
      'ворид { дарозӣ чун ҷамъ, филтр } аз "./mid";\n' +
      'ворид * чун М аз "./mid";\n' +
      'чоп.сабт(ҷамъ(2, 3), филтр(), М.дарозӣ(1, 1));\n';
    expect(await runProject({ 'lib.som': lib, 'mid.som': mid, 'main.som': main })).toEqual([
      '5 ф 2',
    ]);
  });

  test('destructuring a namespace import', async () => {
    const main = 'ворид * чун Л аз "./lib";\nсобит { илова } = Л;\nчоп.сабт(илова(4, 5));\n';
    expect(await runProject({ 'lib.som': lib, 'main.som': main })).toEqual(['9']);
  });
});

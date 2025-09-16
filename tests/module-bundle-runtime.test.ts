import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vm from 'vm';
import { createRequire } from 'module';

import { ModuleSystem } from '../src/module-system';

describe('ModuleSystem Bundle Runtime', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'somon-bundle-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      /* ignore cleanup errors */
    }
  });

  test('commonjs bundle executes with rewritten requires', async () => {
    const utilsFile = path.join(tempDir, 'utils.som');
    const mainFile = path.join(tempDir, 'main.som');

    fs.writeFileSync(utilsFile, 'содир функсия greet(): сатр { бозгашт "OK"; }');
    fs.writeFileSync(mainFile, 'ворид { greet } аз "./utils";\nчоп.сабт(greet());\n');

    const moduleSystem = new ModuleSystem({
      resolution: { baseUrl: tempDir },
    });

    const bundle = await moduleSystem.bundle({ entryPoint: mainFile, format: 'commonjs' });

    const logs: string[] = [];
    const context = vm.createContext({ console: { log: (msg: string) => logs.push(String(msg)) } });
    vm.runInContext(bundle, context);

    expect(logs).toContain('OK');
  });

  test('bundle respects externals and falls back to host require', async () => {
    const mainFile = path.join(tempDir, 'main.som');

    fs.writeFileSync(
      mainFile,
      'ворид * чун Fs аз "fs";\nагар (Fs.existsSync(".")) { чоп.сабт("exists"); } вагарна { чоп.сабт("missing"); }\n'
    );

    const moduleSystem = new ModuleSystem({
      resolution: { baseUrl: tempDir },
    });

    const bundle = await moduleSystem.bundle({
      entryPoint: mainFile,
      format: 'commonjs',
      externals: ['fs'],
    });

    expect(bundle).toContain('require("fs")');

    const logs: string[] = [];
    const nodeRequire = createRequire(__filename);
    const context = vm.createContext({
      console: { log: (msg: unknown) => logs.push(String(msg)) },
      require: nodeRequire,
      module: { exports: {}, require: nodeRequire },
    });

    vm.runInContext(bundle, context);

    expect(logs).toContain('exists');
  });
});

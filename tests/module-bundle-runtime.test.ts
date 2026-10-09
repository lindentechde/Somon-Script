import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vm from 'vm';
import { createRequire } from 'module';

import { ModuleSystem } from '../src/module-system';

describe('ModuleSystem Bundle Runtime', () => {
  let tempDir: string;
  const moduleSystems: ModuleSystem[] = [];

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'somon-bundle-'));
  });

  afterEach(async () => {
    // Shutdown all ModuleSystem instances
    await Promise.all(moduleSystems.map(ms => ms.shutdown()));
    moduleSystems.length = 0;

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
    moduleSystems.push(moduleSystem);

    const bundle = await moduleSystem.bundle({ entryPoint: mainFile, format: 'commonjs' });

    const logs: string[] = [];
    const context = vm.createContext({ console: { log: (msg: string) => logs.push(String(msg)) } });
    vm.runInContext(bundle.code, context);

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
    moduleSystems.push(moduleSystem);

    const bundle = await moduleSystem.bundle({
      entryPoint: mainFile,
      format: 'commonjs',
      externals: ['fs'],
    });

    expect(bundle.code).toContain('require("fs")');

    const logs: string[] = [];
    const nodeRequire = createRequire(__filename);
    const context = vm.createContext({
      console: { log: (msg: unknown) => logs.push(String(msg)) },
      require: nodeRequire,
      module: { exports: {}, require: nodeRequire },
    });

    vm.runInContext(bundle.code, context);

    expect(logs).toContain('exists');
  });

  test('modulePaths runs every module from its original location', async () => {
    fs.mkdirSync(path.join(tempDir, 'lib'));
    fs.writeFileSync(path.join(tempDir, 'lib', 'data.txt'), 'data');
    fs.writeFileSync(
      path.join(tempDir, 'lib', 'read.js'),
      "exports.read = () => require('fs').readFileSync(__dirname + '/data.txt', 'utf8');\n" +
        "exports.file = __filename;\nexports.resolved = require.resolve('./data.txt');\n"
    );
    const mainFile = path.join(tempDir, 'main.som');
    fs.writeFileSync(
      mainFile,
      'ворид { read, file, resolved } аз "./lib/read";\nчоп.сабт(read(), file, resolved);\n'
    );

    const moduleSystem = new ModuleSystem({ resolution: { baseUrl: tempDir } });
    moduleSystems.push(moduleSystem);

    const relocatable = await moduleSystem.bundle({ entryPoint: mainFile });
    expect(relocatable.code).not.toContain(tempDir);

    const bundle = await moduleSystem.bundle({ entryPoint: mainFile, modulePaths: true });
    const logs: string[] = [];
    const elsewhere = createRequire(path.join(os.tmpdir(), 'elsewhere.js'));
    const context = vm.createContext({
      console: { log: (...args: unknown[]) => logs.push(args.join(' ')) },
      require: elsewhere,
      module: { exports: {}, require: elsewhere },
    });
    vm.runInContext(bundle.code, context);

    const libFile = path.join(tempDir, 'lib', 'read.js');
    expect(logs).toEqual([`data ${libFile} ${path.join(tempDir, 'lib', 'data.txt')}`]);
  });
});

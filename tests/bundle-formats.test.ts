import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { SourceMapConsumer, type RawSourceMap } from 'source-map';
import * as vm from 'vm';

import { ModuleSystem } from '../src/module-system';
import {
  bundleWrapper,
  collectExportNames,
  externalRequireCode,
  shiftSourceMap,
} from '../src/module-system/bundle-formats';
import { analyzeSyntax, type Target } from '../src/targets';
import { canonicalTmpDir } from './helpers/paths';

/**
 * Bundle formats: commonjs (module.exports), esm (export, imports what is not
 * bundled) and iife (a browser script that stores the exports in a global),
 * each lowered once for the compilation target.
 */

describe('bundle-formats helpers', () => {
  test('collectExportNames follows star re-exports into the bundle', () => {
    const modules = new Map([
      [
        'main.som',
        'module.exports.а = а;\nmodule.exports.default = б;\n' +
          'const __somon_reexport_0 = require("lib.som");\n' +
          'Object.keys(__somon_reexport_0).forEach(key => {\n' +
          "  if (key !== 'default') module.exports[key] = __somon_reexport_0[key];\n});\n" +
          'const __somon_reexport_1 = require("fs");\nObject.keys(__somon_reexport_1).forEach(k => {});',
      ],
      ['lib.som', 'module.exports.в = в; module.exports.default = 1; exports.г = 2;'],
      ['cycle.som', 'module.exports.д = 1;'],
    ]);
    expect(collectExportNames('main.som', modules)).toEqual(['а', 'default', 'в', 'г']);
    expect(collectExportNames('missing.som', modules)).toEqual([]);
    // `x.exports.y`, comparisons and `_exports` are no exports
    expect(
      collectExportNames(
        'x',
        new Map([['x', 'о.exports.а = 1; if (exports.б == 1) {} _exports.в = 2;']])
      )
    ).toEqual([]);
  });

  test('collectExportNames survives re-export cycles', () => {
    const star = (key: string) =>
      `const __somon_reexport_0 = require("${key}");\nObject.keys(__somon_reexport_0).forEach(k => {});`;
    const modules = new Map([
      ['a.som', `module.exports.а = 1;\n${star('b.som')}`],
      ['b.som', `module.exports.б = 1;\n${star('a.som')}`],
    ]);
    expect(collectExportNames('a.som', modules)).toEqual(['а', 'б']);
  });

  test('externalRequireCode per format', () => {
    expect(externalRequireCode('iife', [])).toBe('  var __externalRequire = null;\n');
    expect(externalRequireCode('commonjs', [])).toContain('module.require.bind(module)');
    const esm = externalRequireCode('esm', ['fs', 'node:path']);
    expect(esm).toContain('"fs": __somonImport0');
    expect(esm).toContain('"node:path": __somonImport1');
    expect(externalRequireCode('esm', [])).toContain('var __imports = {};');
  });

  test('bundleWrapper per format', () => {
    const commonjs = bundleWrapper({ format: 'commonjs', imports: [], exportNames: [] });
    expect(commonjs.prefix).toBe('(function() {\n');
    expect(commonjs.suffix).toContain('module.exports = entryModule;');

    const iife = bundleWrapper({ format: 'iife', globalName: 'а.б', imports: [], exportNames: [] });
    expect(iife.suffix).toContain('__root["а"] = __root["а"] || {};');
    expect(iife.suffix).toContain('__root["а"]["б"] = entryModule;');
    expect(bundleWrapper({ format: 'iife', imports: [], exportNames: [] }).suffix).toBe('})();\n');

    const esm = bundleWrapper({
      format: 'esm',
      imports: ['fs'],
      exportNames: ['ном', 'default', 'delete'],
    });
    expect(esm.prefix).toBe(
      'import * as __somonImport0 from "fs";\nvar __somonBundle = (function() {\n'
    );
    expect(esm.suffix).toContain(
      'export { __somonExport0 as ном, __somonExport1 as default, __somonExport2 as delete };'
    );
    const cjsEntry = bundleWrapper({
      format: 'esm',
      imports: [],
      exportNames: [],
      defaultIsExportsObject: true,
    });
    expect(cjsEntry.suffix).toContain('export { __somonBundle as default };');
    expect(bundleWrapper({ format: 'esm', imports: [], exportNames: [] }).suffix).toContain(
      'export {  };'
    );
  });

  test('shiftSourceMap moves the mappings down', () => {
    const map = { version: 3, sources: [], names: [], mappings: 'AAAA' } as unknown as RawSourceMap;
    expect(shiftSourceMap(map, 2).mappings).toBe(';;AAAA');
  });
});

describe('bundle formats', () => {
  let dir: string;

  beforeEach(() => {
    dir = canonicalTmpDir('somon-bundle-formats-');
    fs.writeFileSync(
      path.join(dir, 'math.som'),
      [
        'содир функсия ҷамъ(а: рақам, б: рақам): рақам { бозгашт а + б; }',
        'содир синф Нуқта {',
        '    #х = 1;',
        '    статикӣ шумора = 0;',
        '    статикӣ { Нуқта.шумора = 2; }',
        '    гир(): рақам { бозгашт ин.#х + Нуқта.шумора; }',
        '}',
      ].join('\n')
    );
    fs.writeFileSync(
      path.join(dir, 'other.som'),
      'содир синф Ҳисоб { #қ = 5; қимат(): рақам { бозгашт ин.#қ ?? 0; } }'
    );
    fs.writeFileSync(path.join(dir, 'reexp.som'), 'содир * аз "./math";');
    fs.writeFileSync(
      path.join(dir, 'helper.js'),
      'exports.дубора = function (х) { return х * 2; };'
    );
    fs.writeFileSync(
      path.join(dir, 'main.som'),
      [
        'ворид { ҷамъ, Нуқта } аз "./reexp";',
        'ворид { Ҳисоб } аз "./other";',
        'ворид { дубора } аз "./helper";',
        'чоп.сабт("маркер", ҷамъ(1, 2), нав Нуқта().гир(), нав Ҳисоб().қимат(), дубора(4));',
        'содир собит натиҷа = ҷамъ(2, 3);',
        'содир пешфарз функсия салом(): сатр { бозгашт "салом"; }',
        'содир * аз "./reexp";',
      ].join('\n')
    );
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const EXPECTED_LOG = 'маркер 3 3 5 8';

  async function bundle(
    format: 'commonjs' | 'esm' | 'iife',
    options: {
      target?: Target;
      globalName?: string;
      sourceMaps?: boolean;
      externals?: string[];
    } = {}
  ) {
    const system = new ModuleSystem({
      resolution: { baseUrl: dir },
      compilation: { target: options.target },
    });
    return system.bundle({
      entryPoint: path.join(dir, 'main.som'),
      outputPath: path.join(dir, `out.${format === 'esm' ? 'mjs' : 'js'}`),
      format,
      globalName: options.globalName,
      sourceMaps: options.sourceMaps,
      externals: options.externals,
    });
  }

  function runScript(code: string, globals: Record<string, unknown> = {}) {
    const lines: string[] = [];
    const context = vm.createContext({
      console: { log: (...args: unknown[]) => lines.push(args.map(String).join(' ')) },
      ...globals,
    });
    vm.runInContext(code, context);
    return { lines, context: context as Record<string, any> };
  }

  /** Import the ES module bundle with a dynamic import in a separate Node process. */
  function importEsm(code: string): { stdout: string; exports: Record<string, unknown> } {
    const bundleFile = path.join(dir, 'bundle.mjs');
    const runner = path.join(dir, 'runner.mjs');
    fs.writeFileSync(bundleFile, code);
    fs.writeFileSync(
      runner,
      [
        'const ns = await import("./bundle.mjs");',
        'const shown = {};',
        'for (const [key, value] of Object.entries(ns)) {',
        "  shown[key] = typeof value === 'function' ? `function ${value.name}` : value;",
        '}',
        'shown.callDefault = ns.default();',
        'shown.callҷамъ = ns.ҷамъ(4, 5);',
        'console.log(JSON.stringify(shown));',
      ].join('\n')
    );
    const child = spawnSync(process.execPath, [runner], { encoding: 'utf8', cwd: dir });
    expect(child.stderr).toBe('');
    const lines = child.stdout.trim().split('\n');
    return { stdout: lines.slice(0, -1).join('\n'), exports: JSON.parse(lines[lines.length - 1]) };
  }

  test('commonjs exports through module.exports', async () => {
    const { code } = await bundle('commonjs');
    const module = { exports: {} as Record<string, unknown> };
    const { lines } = runScript(code, { module, exports: module.exports });
    expect(lines).toEqual([EXPECTED_LOG]);
    expect(Object.keys(module.exports).sort()).toEqual(
      ['default', 'натиҷа', 'ҷамъ', 'Нуқта'].sort()
    );
  });

  test('esm exports the entry’s exports and imports what is not bundled', async () => {
    fs.appendFileSync(
      path.join(dir, 'main.som'),
      '\nворид * чун роҳ аз "path";\nсодир собит файл = роҳ.basename("/а/б.txt");\n'
    );
    const { code } = await bundle('esm', { externals: ['path'] });
    expect(code.startsWith('import * as __somonImport0 from "path";\n')).toBe(true);
    expect(code).not.toMatch(/\bmodule\.exports = entryModule/);
    const { stdout, exports } = importEsm(code);
    expect(stdout).toBe(EXPECTED_LOG);
    expect(exports).toEqual({
      default: 'function салом',
      натиҷа: 5,
      файл: 'б.txt',
      ҷамъ: 'function ҷамъ',
      Нуқта: 'function Нуқта',
      callDefault: 'салом',
      callҷамъ: 9,
    });
  });

  test('a project compiled to ES modules gets an esm bundle of CommonJS modules', async () => {
    const system = new ModuleSystem({
      resolution: { baseUrl: dir },
      compilation: { module: 'esm' },
    });
    const { code } = await system.bundle({ entryPoint: path.join(dir, 'main.som') });
    expect(code).not.toMatch(/\bmodule\.exports = entryModule/);
    const { stdout, exports } = importEsm(code);
    expect(stdout).toBe(EXPECTED_LOG);
    expect(exports).toMatchObject({ натиҷа: 5, callҷамъ: 9 });
  });

  test('iife stores the exports in a global and needs no require or module', async () => {
    const { code } = await bundle('iife', { globalName: 'Мо.китоб' });
    const { lines, context } = runScript(code);
    expect(lines).toEqual([EXPECTED_LOG]);
    expect(context.Мо.китоб.натиҷа).toBe(5);
    expect(context.Мо.китоб.default()).toBe('салом');
    expect(context.Мо.китоб.ҷамъ(1, 1)).toBe(2);
  });

  test('the entry’s shebang starts commonjs and esm bundles, not browser scripts', async () => {
    const main = path.join(dir, 'main.som');
    fs.writeFileSync(main, `#!/usr/bin/env node\n${fs.readFileSync(main, 'utf8')}`);
    fs.writeFileSync(
      path.join(dir, 'math.som'),
      `#!/usr/bin/env node\n${fs.readFileSync(path.join(dir, 'math.som'), 'utf8')}`
    );
    for (const target of ['es5', 'es2022'] as const) {
      const commonjs = (await bundle('commonjs', { target, sourceMaps: true })).code;
      expect(commonjs.split('\n')[0]).toBe('#!/usr/bin/env node');
      expect(commonjs.match(/#!/g)).toHaveLength(1);
      const esm = (await bundle('esm', { target })).code;
      expect(esm.split('\n')[0]).toBe('#!/usr/bin/env node');
      expect(importEsm(esm).stdout).toBe(EXPECTED_LOG);
      const iife = (await bundle('iife', { target })).code;
      expect(iife).not.toContain('#!');
      expect(runScript(iife).lines).toEqual([EXPECTED_LOG]);
    }
  });

  test.each([false, true])(
    'decorators are lowered in the bundle for every target (experimentalDecorators: %s)',
    async experimentalDecorators => {
      fs.writeFileSync(
        path.join(dir, 'main.som'),
        [
          'функсия қайд(...а: ҳар[]): ҳар { чоп.сабт("қайд"); }',
          '@қайд синф К { дастрасӣ х = 1; }',
          'чоп.сабт(нав К().х);',
        ].join('\n')
      );
      for (const target of ['es5', 'es2022', 'esnext'] as const) {
        const system = new ModuleSystem({
          resolution: { baseUrl: dir },
          compilation: { target, experimentalDecorators },
        });
        const { code } = await system.bundle({
          entryPoint: path.join(dir, 'main.som'),
          format: 'iife',
        });
        expect(code).toContain(experimentalDecorators ? '__decorate' : '__esDecorate');
        expect(code).not.toMatch(/^\s*@қайд/m);
        expect(runScript(code).lines).toEqual(['қайд', '1']);
      }
    }
  );

  test('iife without a global name only runs', async () => {
    const { code } = await bundle('iife');
    const { lines, context } = runScript(code);
    expect(lines).toEqual([EXPECTED_LOG]);
    expect(Object.keys(context)).toEqual(['console']);
  });

  test('iife refuses modules it would have to load at run time', async () => {
    fs.appendFileSync(path.join(dir, 'main.som'), '\nворид * чун роҳ аз "path";\n');
    await expect(bundle('iife', { externals: ['path'] })).rejects.toThrow(
      /An iife bundle runs without a module loader, but it needs 'path'/
    );
  });

  test.each(['commonjs', 'iife', 'esm'] as const)(
    '%s bundles are lowered once for es5',
    async format => {
      const { code } = await bundle(format, { target: 'es5', globalName: 'Китоб' });
      // One copy of each helper although two modules use private fields
      expect(code.match(/var __classPrivateFieldGet = /g)).toHaveLength(1);
      // Only the module syntax of an ES module bundle is newer than es5
      const script = code.replace(/^(?:import|export) .*$/gm, '');
      expect(analyzeSyntax(script, 'esnext').required).toBe('es5');
      if (format === 'esm') {
        expect(importEsm(code).stdout).toBe(EXPECTED_LOG);
      } else {
        const module = { exports: {} };
        expect(runScript(code, format === 'commonjs' ? { module } : {}).lines).toEqual([
          EXPECTED_LOG,
        ]);
      }
    }
  );

  test('es2022 bundles keep class fields and private members', async () => {
    const { code } = await bundle('commonjs', { target: 'es2022' });
    expect(code).toContain('#х = 1;');
    expect(code).not.toContain('__classPrivateFieldGet');
  });

  test('source maps of a lowered bundle point at the SomonScript files', async () => {
    const { code, map } = await bundle('iife', { target: 'es5', sourceMaps: true });
    expect(map).toBeDefined();
    const parsed = JSON.parse(map!) as RawSourceMap;
    expect(parsed.sources).toEqual(expect.arrayContaining(['main.som', 'math.som']));
    const lines = code.split('\n');
    const line = lines.findIndex(text => text.includes('"маркер"')) + 1;
    const column = lines[line - 1].indexOf('console');
    await SourceMapConsumer.with(parsed, null, consumer => {
      const original = consumer.originalPositionFor({ line, column });
      expect(original.source).toBe('main.som');
      expect(original.line).toBe(4);
    });
  });

  test('local JavaScript the target cannot run fails the bundle', async () => {
    fs.writeFileSync(
      path.join(dir, 'helper.js'),
      'exports.дубора = function (х) {\n  return х * 2n;\n};'
    );
    await expect(bundle('commonjs', { target: 'es2015' })).rejects.toThrow(
      /The bundle cannot run on es2015:\n {2}helper\.js:2:14: BigInt literals are only available/
    );
  });

  test('module errors name the file', async () => {
    fs.writeFileSync(path.join(dir, 'other.som'), 'содир собит Ҳисоб = 10n;');
    await expect(bundle('commonjs', { target: 'es2017' })).rejects.toThrow(
      /other\.som:1[\s\S]*BigInt literals are only available when targeting es2020/
    );
  });

  test('rejects unknown formats, invalid global names and module paths outside commonjs', async () => {
    const system = new ModuleSystem({ resolution: { baseUrl: dir } });
    const entryPoint = path.join(dir, 'main.som');
    await expect(system.bundle({ entryPoint, format: 'umd' as never })).rejects.toThrow(
      "Unsupported bundle format 'umd'. Supported formats: commonjs, esm, iife."
    );
    await expect(system.bundle({ entryPoint, format: 'iife', globalName: '1x' })).rejects.toThrow(
      /Invalid bundle globalName/
    );
    await expect(system.bundle({ entryPoint, format: 'esm', modulePaths: true })).rejects.toThrow(
      "Module paths need the commonjs bundle format, not 'esm'."
    );
  });

  test('the module system validates lib and useDefineForClassFields', () => {
    const resolution = { baseUrl: dir };
    expect(
      () => new ModuleSystem({ resolution, compilation: { lib: ['es2022', 'хато'] } })
    ).toThrow(/compilation\.lib unknown lib 'хато'/);
    expect(
      () =>
        new ModuleSystem({ resolution, compilation: { useDefineForClassFields: 'yes' as never } })
    ).toThrow(/compilation\.useDefineForClassFields must be a boolean/);
    expect(
      () => new ModuleSystem({ resolution, compilation: { target: 'es2016', lib: ['dom'] } })
    ).not.toThrow();
  });

  test('lib and useDefineForClassFields reach the bundle', async () => {
    const system = new ModuleSystem({
      resolution: { baseUrl: dir },
      compilation: { target: 'es2020', lib: ['es2020', 'dom'], useDefineForClassFields: true },
    });
    const { code } = await system.bundle({ entryPoint: path.join(dir, 'math.som') });
    expect(code).toContain('Object.defineProperty(Нуқта, "шумора"');
  });

  test('ModuleSystem.compile lowers every module on its own', async () => {
    const system = new ModuleSystem({
      resolution: { baseUrl: dir },
      compilation: { target: 'es5' },
    });
    const result = await system.compile(path.join(dir, 'main.som'));
    expect(result.errors).toEqual([]);
    const math = result.modules.get(path.join(dir, 'math.som'));
    expect(math?.code).toContain('var Нуқта = /** @class */');
  });
});

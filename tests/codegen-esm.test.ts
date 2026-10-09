/**
 * ES module output (`module: 'esm'`): `import`/`export` instead of
 * `require`/`module.exports`, top-level `интизор` and `ворид.meta`.
 */
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vm from 'vm';
import { compile } from '../src/compiler';

function esm(source: string): string {
  const result = compile(source, { module: 'esm', typeCheck: false });
  expect(result.errors).toEqual([]);
  return result.code;
}

function commonjs(source: string): string {
  const result = compile(source, { typeCheck: false });
  expect(result.errors).toEqual([]);
  return result.code;
}

describe('ES module imports', () => {
  test.each([
    ['ворид { а } аз "./м"; а();', 'import { а } from "./м.js";'],
    ['ворид { а чун б } аз "./м.som"; б();', 'import { а as б } from "./м.js";'],
    ['ворид { илова } аз "./м"; илова();', 'import { push as илова } from "./м.js";'],
    ['ворид пешфарз_ аз "./м"; пешфарз_();', 'import пешфарз_ from "./м.js";'],
    ['ворид * чун Н аз "./м"; Н.а();', 'import * as Н from "./м.js";'],
    ['ворид а, { б } аз "./м"; а(б);', 'import а, { б } from "./м.js";'],
    ['ворид а, * чун Н аз "./м"; а(Н);', 'import а, * as Н from "./м.js";'],
    ['ворид "./м";', 'import "./м.js";'],
    ['ворид fs аз "fs"; fs.readFileSync;', 'import fs from "fs";'],
    ['ворид { а } аз "./данные.json"; а;', 'import { а } from "./данные.json";'],
  ])('%s', (source, expected) => {
    expect(esm(source).split('\n')[0]).toBe(expected);
  });

  test('bindings used only as types are dropped; the module still runs', () => {
    expect(esm('ворид { И, а } аз "./м";\nтағ х: И = а;')).toBe(
      'import { а } from "./м.js";\nlet х = а;'
    );
    expect(esm('ворид { И } аз "./м";\nтағ х: И;')).toBe('import "./м.js";\nlet х;');
    expect(esm('ворид { И } аз "./м";\nсинф К татбиқ И {}')).toBe('import "./м.js";\nclass К {}');
    expect(esm('ворид { х } аз "./м";\nтағ у: навъи х = х;')).toBe(
      'import { х } from "./м.js";\nlet у = х;'
    );
  });

  test('dynamic import', () => {
    expect(esm('тағ м = ворид("./м");')).toBe('let м = import("./м.js");');
    expect(esm('ворид("./м").then(м => м);')).toBe('import("./м.js").then((м) => м);');
  });
});

describe('ES module exports', () => {
  test.each([
    ['содир функсия ф() {}', 'export function ф() {}'],
    ['содир ҳамзамон функсия ф() {}', 'export async function ф() {}'],
    ['содир тағ а = 1, б = 2;', 'export let а = 1, б = 2;'],
    ['содир собит { а, б } = { а: 1, б: 2 };', 'export const {а, б} = {а: 1, б: 2};'],
    ['содир синф К {}', 'export class К {}'],
    ['содир пешфарз функсия ф() {}', 'export default function ф() {}'],
    ['содир пешфарз синф К {}', 'export default class К {}'],
    ['содир пешфарз 40 + 2;', 'export default 40 + 2;'],
    ['содир пешфарз (1, 2);', 'export default (1, 2);'],
    ['содир пешфарз тағ з = 1;', 'let з = 1;\nexport { з as default };'],
    ['содир функсия илова() {}', 'function илова() {}\nexport { илова as push };'],
    ['содир тағ дар = 1, х = 2;', 'let дар = 1, х = 2;\nexport { дар as at, х };'],
    ['тағ а = 1;\nсодир { а, а чун дарозӣ };', 'let а = 1;\nexport { а, а as length };'],
    ['содир { а чун б, илова } аз "./м";', 'export { а as б, push } from "./м.js";'],
    ['содир * аз "./м";', 'export * from "./м.js";'],
    ['содир * чун Н аз "./м";', 'export * as Н from "./м.js";'],
    ['содир * чун сабт аз "./м";', 'export * as log from "./м.js";'],
  ])('%s', (source, expected) => {
    expect(esm(source)).toBe(expected);
  });

  test('enums and namespaces', () => {
    expect(esm('содир шумориш Р { А }')).toBe(
      'export var Р;\n(function (Р) {\n  Р[Р["А"] = 0] = "А";\n})(Р || (Р = {}));'
    );
    expect(esm('содир номфазо Н { содир тағ х = 1; }')).toMatch(
      /^export const Н = \(function\(\) \{/
    );
  });

  test('types have no runtime export', () => {
    expect(esm('содир интерфейс И { а: рақам; }')).toBe('// Interface: И\n');
    expect(esm('интерфейс И {}\nнавъ Т = рақам;\nтағ х = 1;\nсодир { И, Т, х };')).toBe(
      '// Interface: И\n\n// Type alias: Т\n\nlet х = 1;\nexport { х };'
    );
    expect(esm('интерфейс И {}\nсодир { И };')).toBe('// Interface: И\n');
  });
});

describe('module-only syntax', () => {
  test('top-level интизор and барои интизор in ES modules', () => {
    expect(esm('тағ х = интизор Promise.resolve(1);')).toBe('let х = await Promise.resolve(1);');
    expect(esm('барои интизор (собит х аз [1]) { чоп.сабт(х); }')).toBe(
      'for await (const х of [1]) {\n  console.log(х);\n}'
    );
  });

  test('top-level интизор is an error in CommonJS output', () => {
    const result = compile('тағ х = интизор Promise.resolve(1);', { typeCheck: false });
    expect(result.code).toBe('');
    expect(result.errors).toEqual([
      expect.stringMatching(
        /Top-level 'интизор' \(await\) is only allowed in ES modules at line 1, column 9/
      ),
    ]);
    // A host that runs the code in an async function (the REPL) allows it
    const hosted = compile('тағ х = интизор Promise.resolve(1);', {
      typeCheck: false,
      topLevelAwait: true,
    });
    expect(hosted.errors).toEqual([]);
    expect(hosted.code).toBe('let х = await Promise.resolve(1);');
  });

  test('интизор inside functions is fine in CommonJS output', () => {
    expect(commonjs('ҳамзамон функсия ф() { интизор 1; }\nтағ г = ҳамзамон () => интизор 2;')).toBe(
      'async function ф() {\n  await 1;\n}\nlet г = async () => await 2;'
    );
  });

  test('ворид.meta (import.meta)', () => {
    expect(esm('тағ у = ворид.meta.url;')).toBe('let у = import.meta.url;');
    expect(esm('ворид.meta;')).toBe('import.meta;');
    const result = compile('тағ у = ворид.meta.url;', { typeCheck: false });
    expect(result.errors).toEqual([
      expect.stringMatching(/'ворид\.meta' \(import\.meta\) is only allowed in ES modules/),
    ]);
  });

  test('only ворид.meta is a meta property of ворид', () => {
    const result = compile('тағ у = ворид.url;', { typeCheck: false });
    expect(result.errors).toEqual([
      expect.stringMatching(/The only valid meta property for 'ворид' is 'ворид\.meta'/),
    ]);
  });
});

describe('CommonJS output of the new module syntax', () => {
  test('side-effect import', () => {
    expect(commonjs('ворид "./м";')).toBe('"use strict";\nrequire("./м.js");');
  });

  test('a module is strict mode code, as in TypeScript and ES modules', () => {
    // Found by tests/differential.test.ts: `ин` in a plain call was the global object
    const source = 'содир собит а = 1;\nфунксия ф() { бозгашт ин; }\nчоп.сабт(навъи ф());';
    const lines: unknown[] = [];
    vm.runInNewContext(commonjs(source), {
      module: { exports: {} },
      console: { log: (value: unknown) => lines.push(value) },
    });
    expect(lines).toEqual(['undefined']);
    // A script stays a script
    expect(commonjs('чоп.сабт(1);')).toBe('console.log(1);');
    expect(commonjs('#!/usr/bin/env node\nсодир собит а = 1;')).toMatch(
      /^#!\/usr\/bin\/env node\n"use strict";\n/
    );
  });

  test('export * as', () => {
    const code = commonjs('содир * чун Н аз "./м";');
    expect(code).toBe(
      '"use strict";\nconst __somon_reexport_0 = require("./м.js");\nmodule.exports.Н = __somon_reexport_0;'
    );
    const module = { exports: {} as Record<string, unknown> };
    vm.runInNewContext(code, { module, require: () => ({ а: 1 }) });
    expect(module.exports.Н).toEqual({ а: 1 });
  });

  test('default and namespace import together', () => {
    expect(commonjs('ворид а, * чун Н аз "./м";')).toBe(
      '"use strict";\nconst __somon_import_0 = require("./м.js");\nconst а = __somon_import_0.default ?? __somon_import_0;\nconst Н = __somon_import_0;'
    );
  });
});

describe('compile options', () => {
  test('ES modules survive older targets and minification', () => {
    const source = 'ворид { а } аз "./lib";\nсодир собит б = а ?? 1;';
    const es5 = compile(source, { module: 'esm', target: 'es5', typeCheck: false });
    expect(es5.code).toMatch(/import \{ а \} from "\.\/lib\.js";/);
    expect(es5.code).toMatch(/export var б/);
    const minified = compile(source, { module: 'esm', minify: true, typeCheck: false });
    expect(minified.errors).toEqual([]);
    expect(minified.code).toMatch(/^import\{а\}from"\.\/lib\.js";export const б=/);
  });
});

describe('TypeScript module forms in ES module output', () => {
  test('type-only imports and exports are left out', () => {
    expect(
      esm(
        [
          'ворид навъ { Т } аз "./т";',
          'ворид навъ Д аз "./д";',
          'ворид { навъ У, у } аз "./у";',
          'ворид { навъ В } аз "./в";',
          'ворид навъ Ф = require("./ф");',
          'содир навъ { Т };',
          'содир { навъ У, у };',
          'содир { Д };',
          'содир навъ { Е } аз "./е";',
          'содир { навъ Ж, ж } аз "./ж";',
          'содир навъ * аз "./з";',
          'у();',
        ].join('\n')
      )
    ).toBe(
      ['import { у } from "./у.js";', 'export { у };', 'export { ж } from "./ж.js";', 'у();'].join(
        '\n'
      )
    );
  });

  test('`ворид х = require(…)` imports the default export, `содир =` exports it', () => {
    expect(esm('ворид fs = require("fs");\nfs.readFileSync;')).toBe(
      'import fs from "fs";\nfs.readFileSync;'
    );
    expect(esm('ворид * чун Н аз "./н";\nворид Ҷ = Н.Ҷ;')).toBe(
      'import * as Н from "./н.js";\nconst Ҷ = Н.Ҷ;'
    );
    expect(esm('синф К {}\nсодир = К;')).toBe('class К {}\nexport default К;');
    expect(commonjs('синф К {}\nсодир = К;')).toBe(
      '"use strict";\nclass К {}\nmodule.exports = К;'
    );
  });

  test('`интизор истифода` at the top level of an ES module', () => {
    const result = compile('интизор истифода р = ф();', { module: 'esm', typeCheck: false });
    expect(result.errors).toEqual([]);
    expect(result.code).toContain('await result_1;');
    expect(compile('интизор истифода р = ф();', { typeCheck: false }).errors.join('\n')).toMatch(
      /'интизор истифода' is only allowed inside a 'ҳамзамон' function/
    );
  });
});

describe('ES module programs run in Node', () => {
  test('imports, exports, re-exports, dynamic import, top-level await and import.meta', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'somon-esm-'));
    try {
      const files: Record<string, string> = {
        'math.som':
          'содир функсия ҷамъ(а: рақам, б: рақам): рақам { бозгашт а + б; }\n' +
          'содир функсия илова(р: рақам[], х: рақам): рақам { бозгашт р.илова(х); }\n' +
          'содир пешфарз синф Ҳисоб { қимат = 7; }\n' +
          'содир собит ПИ = 3;\n' +
          'содир интерфейс Нуқта { х: рақам; }\n',
        'reexport.som':
          'содир { ҷамъ чун сум, ПИ } аз "./math";\nсодир * чун Ҳама аз "./math";\n' +
          'содир навъ { Нуқта } аз "./math";\nсодир { навъ Нуқта чун Н2 } аз "./math";\n',
        'value.som': 'синф Ҳисобгар { қимат = 42; }\nсодир = Ҳисобгар;\n',
        'side.som': 'чоп.сабт("таъсир");\n',
        'main.som':
          'ворид "./side";\n' +
          'ворид Ҳисоб, { ҷамъ, илова, Нуқта } аз "./math";\n' +
          'ворид * чун М аз "./math.som";\n' +
          'ворид { сум, Ҳама, навъ Н2 } аз "./reexport";\n' +
          'ворид навъ { Нуқта чун Н3 } аз "./reexport";\n' +
          'ворид Ҳисобгар = require("./value");\n' +
          'собит н2: Н2 | Н3 = { х: 2 };\n' +
          'собит н: Нуқта = { х: 1 };\n' +
          'собит динамикӣ = интизор ворид("./math");\n' +
          'чоп.сабт(ҷамъ(1, 2), илова([1], 2), нав Ҳисоб().қимат, М.ПИ, сум(2, 3), Ҳама.ПИ, н.х);\n' +
          'чоп.сабт(динамикӣ.ҷамъ(4, 5), ворид.meta.url.endsWith("main.mjs"));\n' +
          'чоп.сабт(нав Ҳисобгар().қимат, н2.х);\n',
      };
      for (const [name, source] of Object.entries(files)) {
        const result = compile(source, { module: 'esm', strict: true });
        expect(result.errors).toEqual([]);
        // `.mjs` files are ES modules; imports name `.js`, so rewrite them
        const code = result.code.replace(/\.js"/g, '.mjs"');
        fs.writeFileSync(path.join(dir, name.replace(/\.som$/, '.mjs')), code);
      }
      const run = spawnSync(process.execPath, [path.join(dir, 'main.mjs')], { encoding: 'utf8' });
      expect(run.stderr).toBe('');
      expect(run.stdout).toBe('таъсир\n3 2 7 3 5 3 1\n9 true\n42 2\n');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

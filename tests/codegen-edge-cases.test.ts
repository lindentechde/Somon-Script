/**
 * The code generator on rarer programs, compiled and run: each case checks
 * the program's output, the generated JavaScript or the error it reports.
 */
import * as fs from 'fs';
import * as path from 'path';

import { compile, type CompileOptions } from '../src/compiler';
import { canonicalTmpDir } from './helpers/paths';

/** Compiles and runs a program; returns what it logged. */
function run(source: string, options: CompileOptions = {}): string[] {
  const result = compile(source, { typeCheck: false, ...options });
  expect(result.errors).toEqual([]);
  const lines: string[] = [];
  new Function('console', 'require', 'module', 'exports', result.code)(
    { log: (...args: unknown[]) => lines.push(args.map(String).join(' ')) },
    require,
    { exports: {} },
    {}
  );
  return lines;
}

const errorsOf = (source: string, options: CompileOptions = {}) =>
  compile(source, { typeCheck: false, ...options }).errors;

describe('codegen: private methods', () => {
  test('overload signatures of a private method declare nothing', () => {
    const source =
      'синф К {\n  #м(х: рақам): сатр;\n  #м(х: ҳар) { бозгашт "м" + х; }\n  гир() { бозгашт ин.#м(1); }\n}\nчоп.сабт(нав К().гир());';
    expect(run(source)).toEqual(['м1']);
    // TypeScript agrees
    expect(compile(source, { checker: 'typescript', strict: true }).errors).toEqual([]);
    // Two implementations are still an error
    expect(errorsOf('синф К { #м() {} #м() {} }')).toEqual([
      "Code generation error: Identifier '#м' has already been declared at line 1, column 18",
    ]);
  });
});

describe('codegen: imports of directories', () => {
  let dir: string;
  beforeEach(() => {
    dir = canonicalTmpDir('somon-codegen-dirs-');
    fs.mkdirSync(path.join(dir, 'lib'));
    fs.writeFileSync(path.join(dir, 'lib', 'index.som'), 'содир собит И = 1;\n');
    fs.writeFileSync(path.join(dir, 'util.som'), 'содир собит У = 2;\n');
  });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  const source =
    'ворид { И } аз "./lib";\nворид { У } аз "./util";\nворид { Й } аз "./lib/";\nчоп.сабт(И, У, Й);\n';
  const imports = (options: CompileOptions) =>
    compile(source, { typeCheck: false, ...options })
      .code.split('\n')
      .filter(line => line.includes('./'));

  test('with the file it compiles, `./lib` of lib/index.som is `./lib/index.js`', () => {
    const filePath = path.join(dir, 'main.som');
    expect(imports({ filePath })).toEqual([
      'const __somon_import_0 = require("./lib/index.js");',
      'const __somon_import_1 = require("./util.js");',
      'const __somon_import_2 = require("./lib/index.js");',
    ]);
    expect(imports({ filePath, module: 'esm' })).toEqual([
      'import { И } from "./lib/index.js";',
      'import { У } from "./util.js";',
      'import { Й } from "./lib/index.js";',
    ]);
  });

  test('without it, a relative import without an extension gets `.js`; `./м/` is a directory', () => {
    expect(imports({})).toEqual([
      'const __somon_import_0 = require("./lib.js");',
      'const __somon_import_1 = require("./util.js");',
      'const __somon_import_2 = require("./lib/index.js");',
    ]);
  });
});

describe('codegen: exported namespace members', () => {
  test('a destructuring declaration exports each name it binds', () => {
    const source = [
      'номфазо Н {',
      '  содир собит { а, б: [в, ...г] } = { а: 1, б: [2, 3] }, д = 4;',
      '  содир собит [е = 5] = [];',
      '}',
      'номфазо М { содир собит { ж } = { ж: 6 }; }',
      'номфазо М { содир функсия ф() { бозгашт ж; } }',
      'чоп.сабт(Н.а, Н.в, Н.г, Н.д, Н.е, М.ф());',
    ].join('\n');
    expect(run(source)).toEqual(['1 2 3 4 5 6']);
    expect(run(source, { module: 'esm' })).toEqual(['1 2 3 4 5 6']);
    // TypeScript agrees
    expect(compile(source, { checker: 'typescript', strict: true }).errors).toEqual([]);
  });
});

/**
 * The code generator on rarer programs, compiled and run: each case checks
 * the program's output, the generated JavaScript or the error it reports.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

import { compile, type CompileOptions } from '../src/compiler';
import { Lexer } from '../src/lexer';
import { Parser } from '../src/parser';
import { TsEmitter } from '../src/ts-emitter';
import { canonicalTmpDir } from './helpers/paths';

/** Runs JavaScript; returns what it logged. */
function runCode(code: string): string[] {
  const lines: string[] = [];
  new Function('console', 'require', 'module', 'exports', code)(
    { log: (...args: unknown[]) => lines.push(args.map(String).join(' ')) },
    require,
    { exports: {} },
    {}
  );
  return lines;
}

/** Compiles and runs a program; returns what it logged. */
function run(source: string, options: CompileOptions = {}): string[] {
  const result = compile(source, { typeCheck: false, ...options });
  expect(result.errors).toEqual([]);
  return runCode(result.code);
}

/** What a program logs compiled by TypeScript: the TypeScript emitter's output, transpiled. */
function runWithTypeScript(source: string): string[] {
  const typescript = new TsEmitter().emit(new Parser(new Lexer(source).tokenize()).parse()).code;
  const options = { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS };
  return runCode(ts.transpileModule(typescript, { compilerOptions: options }).outputText);
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

  test('an exported nested namespace is also a local name of its namespace', () => {
    const source = [
      'номфазо Н {',
      '  содир номфазо Д { содир собит а = 1; }',
      '  содир номфазо М { содир собит б = 2; }',
      '  содир номфазо М { содир собит в = б + 1; }',
      '  содир функсия ф(): рақам { бозгашт Д.а + М.в; }',
      '}',
      'номфазо А.Б.В { содир собит г = 4; }',
      'чоп.сабт(Н.ф(), Н.Д.а, Н.М.б, А.Б.В.г);',
    ].join('\n');
    // `Д` was only `Н.Д`: "Д is not defined"
    expect(run(source)).toEqual(['4 1 2 4']);
    expect(compile(source, { checker: 'typescript', strict: true }).errors).toEqual([]);
    // Ambient members exist elsewhere: no code, nothing assigned
    expect(
      run('номфазо Н { содир эълон собит х: рақам; содир собит у = 1; }\nчоп.сабт(Object.keys(Н));')
    ).toEqual(['у']);
  });
});

describe('codegen: enum members', () => {
  test('constant initializers are folded as TypeScript folds them, others run', () => {
    const source = [
      'собит Б = { А: 3 };',
      'шумориш Р {',
      // Arithmetic and bitwise operators, `+ - ~`, earlier members by name
      '  А = 10 - 3, В = 9 / 2, Г = 9 % 4, Д = 2 ** 3, Ё = 1 << 3, Ж = -16 >> 2,',
      '  З = -1 >>> 28, И = 6 & 3, Й = 6 | 3, К = 6 ^ 3, Л = +А, М = ~А, Я = -0,',
      // Strings, and earlier members as `Р.А`, `Р["А"]`, `Р[`А`]`
      '  Н = `матн`, О = Р.А + 1, П = Р["А"] * 2, С = Р[`А`] * 3, Ф = `${Н}-${А}-${Р.В}`,',
      '  Қ = Р[`Ф`] + "!",',
      // Not constant: computed when the enum is created
      '  Т = !А ? 1 : 2, У = "а" - 1, Х = Б.А, Ч = Р[100], Ш = -Н, Щ = !А, Ы = 1 && 2,',
      '  Ю = дуруст, Ә = 10n, Ғ = `${Б.А}`, Ҳ = Р[`${Н}`]',
      '}',
      'чоп.сабт(JSON.stringify(Р, (к, қ) => (навъи қ === "bigint" ? `${қ}n` : қ)));',
    ].join('\n');
    const output = run(source);
    expect(output).toEqual(runWithTypeScript(source));
    const enumObject = JSON.parse(output[0]);
    expect(enumObject).toMatchObject({ А: 7, '7': 'Л', Я: 0, С: 21, Ф: 'матн-7-4.5', Т: 2 });
    // A string member has no reverse mapping, also when a template with
    // constant substitutions makes it (`Ф`), or a member read as `Р[`Ф`]`
    expect(enumObject['матн-7-4.5']).toBeUndefined();
    expect(enumObject['матн-7-4.5!']).toBeUndefined();
  });
});

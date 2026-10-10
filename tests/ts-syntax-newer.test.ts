/**
 * Syntax that TypeScript added from 5.5 to 6.0, in SomonScript: deferred
 * imports (`ворид мавқуф * чун Н аз "м"` and `ворид.мавқуф("м")`, TypeScript
 * 5.9 `import defer`). The programs given to `run`, `check` and `errorsOf`
 * are part of the corpus of the differential test (tests/helpers/corpus.ts).
 */
import * as fs from 'fs';
import * as path from 'path';

import { compile, type CompileOptions } from '../src/compiler';
import { Lexer } from '../src/lexer';
import { Parser } from '../src/parser';
import { TsEmitter } from '../src/ts-emitter';
import { format } from '../src/tools/format';
import { migrate } from '../src/tools/migrate';
import type { ImportDeclaration, ImportExpression, ExpressionStatement } from '../src/types';
import { canonicalTmpDir } from './helpers/paths';

jest.setTimeout(60000);

/** Runs CommonJS code; `require` loads `modules` (SomonScript, compiled) or Node.js built-ins. */
function execute(code: string, modules: Record<string, string> = {}): string[] {
  const lines: string[] = [];
  const log = (...args: unknown[]): void => {
    lines.push(args.map(String).join(' '));
  };
  const cache = new Map<string, unknown>();
  const load = (specifier: string): unknown => {
    const name = specifier.replace(/^\.\//, '').replace(/\.js$/, '');
    if (!(name in modules)) return require(specifier) as unknown;
    if (!cache.has(name)) {
      const compiled = compile(modules[name], { typeCheck: false });
      expect(compiled.errors).toEqual([]);
      const module = { exports: {} as unknown };
      cache.set(name, module);
      new Function('console', 'require', 'module', 'exports', compiled.code)(
        { log },
        load,
        module,
        module.exports
      );
    }
    return (cache.get(name) as { exports: unknown }).exports;
  };
  const module = { exports: {} };
  new Function('console', 'require', 'module', 'exports', code)({ log }, load, module, {});
  return lines;
}

/**
 * Compiles a program (default and strict mode) and runs it with `modules`; returns what
 * it printed. Not a corpus helper: its programs import modules that exist only here.
 */
function runWithModules(source: string, modules: Record<string, string>): string[] {
  let output: string[] | undefined;
  for (const strict of [false, true]) {
    const result = compile(source, { strict });
    expect(result.errors).toEqual([]);
    const lines = execute(result.code, modules);
    if (output) expect(lines).toEqual(output);
    output = lines;
  }
  return output!;
}

/** A program of the corpus: it imports only Node.js built-ins. */
function run(source: string): string[] {
  return runWithModules(source, {});
}

/** Waits until the promises a program started have settled. */
async function settle(): Promise<void> {
  for (let i = 0; i < 10; i++) await new Promise(resolve => setImmediate(resolve));
}

/** Not a corpus helper (see `run`). */
function syntaxTree(source: string) {
  const parser = new Parser(new Lexer(source).tokenize());
  const ast = parser.parse();
  return { ast, errors: parser.getErrors() };
}

function parse(source: string) {
  return syntaxTree(source);
}

function errorsOf(source: string, options: CompileOptions = {}): string[] {
  return compile(source, { typeCheck: false, ...options }).errors;
}

/** Errors of both type checkers, strict. */
function check(source: string, filePath?: string): string[] {
  return [
    ...compile(source, { strict: true }).errors,
    ...compile(source, { checker: 'typescript', strict: true, filePath }).errors,
  ];
}

/** The module of the deferred-import tests: it says when it runs. */
const MODULE = [
  'чоп.сабт("м иҷро шуд");',
  'содир собит х = 42;',
  'содир функсия then() { бозгашт "then"; }',
].join('\n');

describe('ворид мавқуф (import defer)', () => {
  test('parses a deferred namespace import, in Tajik and in English', () => {
    for (const word of ['мавқуф', 'defer']) {
      const { ast, errors } = parse(`ворид ${word} * чун Н аз "./м";`);
      expect(errors).toEqual([]);
      const declaration = ast.body[0] as ImportDeclaration;
      expect(declaration.phase).toBe('defer');
      expect(declaration.specifiers).toMatchObject([
        { type: 'ImportNamespaceSpecifier', local: { name: 'Н' } },
      ]);
    }
    const dynamic = parse('ворид.мавқуф("path");').ast.body[0] as ExpressionStatement;
    expect(dynamic.expression).toMatchObject({ type: 'ImportExpression', phase: 'defer' });
    const plain = parse('ворид("./м");').ast.body[0] as ExpressionStatement;
    expect((plain.expression as ImportExpression).phase).toBeUndefined();
  });

  test('`мавқуф` stays a name elsewhere', () => {
    const { ast, errors } = parse(
      'ворид мавқуф аз "./м";\nворид defer, { а } аз "./м";\nтағ ф = мавқуф + defer;'
    );
    expect(errors).toEqual([]);
    expect(ast.body.slice(0, 2)).toMatchObject([
      { specifiers: [{ type: 'ImportDefaultSpecifier', local: { name: 'мавқуф' } }] },
      { specifiers: [{ type: 'ImportDefaultSpecifier', local: { name: 'defer' } }, {}] },
    ]);
    expect((ast.body[0] as ImportDeclaration).phase).toBeUndefined();
  });

  test('only the namespace can be deferred, as in TypeScript (TS18058, TS18059)', () => {
    expect(errorsOf('ворид мавқуф { а, б } аз "./м";')).toEqual([
      "Parse error: Named imports are not allowed in a deferred import; import the namespace: 'ворид мавқуф * чун Н аз …' at line 1, column 16",
    ]);
    expect(errorsOf('ворид мавқуф а аз "./м";')).toEqual([
      "Parse error: Default imports are not allowed in a deferred import; import the namespace: 'ворид мавқуф * чун Н аз …' at line 1, column 14",
    ]);
    expect(errorsOf('ворид.мавқуф;')).toEqual([
      expect.stringContaining("Expected '(' after 'ворид.мавқуф'"),
    ]);
    expect(errorsOf('ворид.дигар;')).toEqual([
      expect.stringContaining("The only valid meta properties for 'ворид' are"),
    ]);
  });

  test('the module runs when a member of the namespace is first read', () => {
    const source = [
      'ворид мавқуф * чун М аз "./м";',
      'чоп.сабт("пеш");',
      'функсия гир(): рақам {',
      '    бозгашт М.х;',
      '}',
      'чоп.сабт("баъд");',
      'чоп.сабт(гир(), гир());',
    ].join('\n');
    expect(runWithModules(source, { м: MODULE })).toEqual(['пеш', 'баъд', 'м иҷро шуд', '42 42']);
    // `дар`, `Object.keys` and other reads of the namespace run it too
    const imported = 'ворид мавқуф * чун М аз "./м";\n';
    expect(runWithModules(`${imported}чоп.сабт("х" дар М);`, { м: MODULE })).toEqual([
      'м иҷро шуд',
      'true',
    ]);
    expect(runWithModules(`${imported}чоп.сабт(объект.калидҳо(М).join());`, { м: MODULE })).toEqual(
      ['м иҷро шуд', 'х']
    );
    // A namespace that is never read never runs its module
    expect(runWithModules(`${imported}чоп.сабт(навъи М);`, { м: MODULE })).toEqual(['object']);
  });

  test('`then` and symbols do not run the module; its members are read-only', () => {
    const result = compile('ворид мавқуф * чун М аз "./м";\nсодир { М };', { typeCheck: false });
    const module = { exports: {} as { М: Record<string | symbol, unknown> } };
    const lines: string[] = [];
    const load = (): unknown => {
      lines.push('loaded');
      return { х: 1, then: 'then' };
    };
    new Function('require', 'module', result.code)(load, module);
    const namespace = module.exports.М;
    expect([namespace.then, namespace[Symbol.toStringTag], 'then' in namespace]).toEqual([
      undefined,
      undefined,
      false,
    ]);
    expect(Object.getOwnPropertyDescriptor(namespace, 'then')).toBeUndefined();
    expect(lines).toEqual([]);
    expect(Object.getOwnPropertyDescriptor(namespace, 'х')).toMatchObject({
      value: 1,
      configurable: true,
    });
    expect(Object.getOwnPropertyDescriptor(namespace, 'нест')).toBeUndefined();
    expect(Reflect.set(namespace, 'х', 2)).toBe(false);
    expect(Reflect.defineProperty(namespace, 'у', { value: 1 })).toBe(false);
    expect(Reflect.deleteProperty(namespace, 'х')).toBe(false);
    expect(namespace.х).toBe(1);
    expect(lines).toEqual(['loaded']);
  });

  test('ворид.мавқуф(…) is a promise of the namespace; the module runs when it is read', async () => {
    const source = [
      'собит ваъда = ворид.мавқуф("./м");',
      'чоп.сабт("пеш");',
      'ваъда.then(М => {',
      '    чоп.сабт("омад");',
      '    чоп.сабт(М.х);',
      '});',
    ].join('\n');
    const result = compile(source, { typeCheck: false });
    expect(result.errors).toEqual([]);
    const lines = execute(result.code, { м: MODULE });
    await settle();
    expect(lines).toEqual(['пеш', 'омад', 'м иҷро шуд', '42']);
    // A computed specifier is read once, when the call runs
    const computed = compile('тағ ном = "./м";\nсобит в = ворид.мавқуф(ном);\nном = "./н";', {
      typeCheck: false,
    });
    const later = execute(`${computed.code}\nmodule.exports.в = в;`, { м: MODULE });
    expect(later).toEqual([]);
  });

  test('a program that imports a built-in deferred', () => {
    expect(
      run(
        'ворид мавқуф * чун роҳ аз "path";\nчоп.сабт(роҳ.extname("асосӣ.som"), роҳ.basename("/а/б"));'
      )
    ).toEqual(['.som б']);
  });

  test('CommonJS output defers the require on every target, with one helper per module', () => {
    const source =
      'ворид мавқуф * чун М аз "./м";\nворид мавқуф * чун Н аз "./н";\nчоп.сабт(М, Н);';
    const { code } = compile(source, { typeCheck: false });
    expect(code.match(/function __somonDefer/g)).toHaveLength(1);
    expect(code).toContain('const М = __somonDefer(() => require("./м.js"));');
    expect(code.startsWith('"use strict";\nfunction __somonDefer(load) {')).toBe(true);
    // The helper is ES5: es5 output only lowers the program's own code
    const es5 = compile(source, { typeCheck: false, target: 'es5' });
    expect(es5.errors).toEqual([]);
    expect(es5.code).toContain('var М = __somonDefer(function () { return require("./м.js"); });');
    // A program without deferred imports has no helper
    expect(compile('ворид * чун М аз "./м";', { typeCheck: false }).code).not.toContain('Defer');
  });

  test('ES module output keeps `import defer`, which no runtime runs yet: esnext only', () => {
    const source =
      'ворид мавқуф * чун М аз "./м";\nсобит в = ворид.мавқуф("./м");\nчоп.сабт(М.х, в);';
    const esnext = compile(source, { typeCheck: false, module: 'esm', target: 'esnext' });
    expect(esnext.errors).toEqual([]);
    expect(esnext.code).toContain('import defer * as М from "./м.js";');
    expect(esnext.code).toContain('const в = import.defer("./м.js");');
    expect(errorsOf(source, { module: 'esm' })).toEqual([
      'Target error at line 1, column 1: Deferred imports are only available when targeting esnext or later (target is es2022).\n> ворид мавқуф * чун М аз "./м";',
      'Target error at line 2, column 1: Deferred imports are only available when targeting esnext or later (target is es2022).\n> собит в = ворид.мавқуф("./м");',
    ]);
    // A namespace used only as a type: the module is never run, so nothing is imported
    const typeOnly = compile('ворид мавқуф * чун М аз "./м";\nтағ х: навъи М.х;', {
      typeCheck: false,
      module: 'esm',
    });
    expect(typeOnly.code).not.toContain('import');
  });

  test('the TypeScript emitter writes `import defer`, which the TypeScript checker types', () => {
    const typescript = new TsEmitter().generate(
      syntaxTree('ворид мавқуф * чун М аз "./м";\nчоп.сабт(ворид.мавқуф("./м"));').ast
    );
    expect(typescript).toBe(
      'import defer * as М from "./м.js";\nconsole.log(import.defer("./м.js"));'
    );
    const dir = canonicalTmpDir('somon-defer-');
    try {
      fs.writeFileSync(path.join(dir, 'м.som'), 'содир собит х: рақам = 1;\n');
      const source = 'ворид мавқуф * чун М аз "./м";\nтағ с: сатр = М.х;\nтағ р: рақам = М.х;';
      const errors = check(source, path.join(dir, 'main.som'));
      expect(errors).toEqual([
        expect.stringMatching(/^Type error \[TS2322\] at line 2, column 5: Type 'рақам'/),
      ]);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test('both checkers accept a deferred import of a built-in', () => {
    expect(check('ворид мавқуф * чун роҳ аз "path";\nтағ н: сатр = роҳ.sep;')).toEqual([]);
  });

  test('the formatter keeps it; migrate writes it from TypeScript', () => {
    const source = 'ворид   мавқуф  *  чун М аз "./м";\nсобит в = ворид . мавқуф ( "./м" );\n';
    expect(format(source)).toBe('ворид мавқуф * чун М аз "./м";\nсобит в = ворид.мавқуф("./м");\n');
    const migrated = migrate(
      'import defer * as ns from "./m";\nconst p = import.defer("./m");\nconsole.log(ns.x, p);\n'
    );
    expect(migrated.warnings).toEqual([]);
    expect(migrated.code).toBe(
      'ворид мавқуф * чун ns аз "./m";\nсобит p = ворид.мавқуф("./m");\nчоп.сабт(ns.x, p);\n'
    );
  });
});

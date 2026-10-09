import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { BUILTIN_MAPPINGS, translateMemberName } from '../src/builtin-names';
import { compile } from '../src/compiler';
import {
  MigrateError,
  isTypeScriptSource,
  migrate,
  migrateFile,
  setFeatureSupport,
  somFileName,
  supports,
} from '../src/tools/migrate';
import {
  GLOBAL_TYPE_NAMES,
  GLOBAL_VALUE_NAMES,
  MEMBER_NAMES,
  memberName,
} from '../src/tools/migrate-names';

function code(source: string, options = {}): string {
  return migrate(source, options).code;
}

function messages(source: string): string[] {
  return migrate(source).warnings.map(warning => warning.message);
}

describe('migrate: keywords and types', () => {
  test('statements and declarations', () => {
    const result = code(
      [
        'let a = 1;',
        'const b: number = 2;',
        'function f(x: string): boolean { return x.length > 0; }',
        'if (a) { a++; } else if (b) { a--; } else { a = 0; }',
        'for (let i = 0; i < 2; i++) { continue; }',
        'for (const x of [1]) {}',
        'for (const k in {}) {}',
        'while (false) { break; }',
        'switch (a) { case 1: break; default: }',
        'try { throw new Error("x"); } catch (e) { } finally { }',
        'class A extends Object implements I { constructor() { super(); this.x = null; } x: any; }',
        'interface I {}',
        'type T = number | undefined;',
        'enum E { A }',
        'namespace N { export const v = true; }',
        'async function g(): Promise<void> { await g(); }',
        'function* h() { yield 1; }',
        'const t = typeof a === "number" ? false : true;',
      ].join('\n')
    );
    for (const word of [
      'тағ a = 1;',
      'собит b: рақам = 2;',
      'функсия f(x: сатр): мантиқӣ',
      'бозгашт x.дарозӣ',
      'агар (a)',
      '} вагарна агар (b) {',
      '} вагарна {',
      'барои (тағ i = 0',
      'давом;',
      'барои (собит x аз [1])',
      'барои (собит k дар {})',
      'то (нодуруст)',
      'шикастан;',
      'интихоб (a)',
      'ҳолат 1:',
      'пешфарз:',
      'кӯшиш {',
      'партофтан нав Хато("x")',
      'гирифтан (e)',
      'ниҳоят {',
      'синф A мерос объект татбиқ I',
      'конструктор()',
      'супер();',
      'ин.x = холӣ;',
      'x: ҳар;',
      'интерфейс I {}',
      'навъ T = рақам | беқимат;',
      'шумориш E { A }',
      'номфазо N { содир собит v = дуруст; }',
      'ҳамзамон функсия g(): Ваъда<беджавоб> { интизор g(); }',
      'функсия* h() { ҳосил 1; }',
      'навъи a === "number" ? нодуруст : дуруст',
    ]) {
      expect(result).toContain(word);
    }
  });

  test('type operators, modifiers and special types', () => {
    const result = code(
      [
        'type K = keyof typeof obj;',
        'type R = readonly string[];',
        'type U = unique symbol;',
        'type C<T> = T extends (infer X)[] ? X : never;',
        'type M<T> = { -readonly [P in keyof T as `g${string & P}`]-?: T[P] };',
        'function is(x: unknown): x is string { return true; }',
        'function check(x: unknown): asserts x {}',
        'const obj = { a: 1 } satisfies object;',
        'const c = [1] as const;',
        'abstract class B { protected abstract m(): void; private static s = 1; public p = 2; readonly r = 3; }',
        'let v: void = undefined, o: object = {}, s: symbol = Symbol(), u: unknown;',
      ].join('\n')
    );
    expect(result).toContain('навъ K = калидҳои навъи obj;');
    expect(result).toContain('навъ R = танҳохонӣ сатр[];');
    expect(result).toContain('навъ U = беназир рамз;');
    expect(result).toContain('навъ C<T> = T мерос (инфер X)[] ? X : абадан;');
    expect(result).toContain('-танҳохонӣ [P дар калидҳои T чун `g${сатр & P}`]-?: T[P]');
    expect(result).toContain('x аст сатр');
    expect(result).toContain('тасдиқ x');
    expect(result).toContain('бармесоё объект');
    expect(result).toContain('[1] чун собит');
    expect(result).toContain('мавҳум синф B { муҳофизатшуда мавҳум m(): беджавоб;');
    expect(result).toContain('хосусӣ статикӣ s = 1; ҷамъиятӣ p = 2; танҳохонӣ r = 3;');
    expect(result).toContain(
      'тағ v: беджавоб = беқимат, o: объект = {}, s: рамз = Symbol(), u: ношинос;'
    );
  });

  test('imports, exports and modules', () => {
    const result = code(
      [
        'import def, { a as b } from "./m";',
        'import * as ns from "./n";',
        'export { b as c };',
        'export * from "./o";',
        'export default def;',
        'export function f() {}',
      ].join('\n')
    );
    expect(result).toContain('ворид def, { a чун b } аз "./m";');
    expect(result).toContain('ворид * чун ns аз "./n";');
    expect(result).toContain('содир { b чун c };');
    expect(result).toContain('содир * аз "./o";');
    expect(result).toContain('содир пешфарз def;');
    expect(result).toContain('содир функсия f() {}');
  });

  test('void the operator stays, void the type is беджавоб', () => {
    expect(code('const x: void = void 0;')).toBe('собит x: беджавоб = void 0;\n');
  });

  test('instanceof, in, delete, get and set keep their spelling or become Tajik', () => {
    const result = code(
      'const o = { get a() { return 1; }, set a(v) {} };\ndelete o.a;\n"a" in o;\no instanceof Object;'
    );
    expect(result).toContain('get a()');
    expect(result).toContain('set a(v)');
    expect(result).toContain('delete o.a;');
    expect(result).toContain('"a" дар o;');
    expect(result).toContain('o instanceof объект;');
  });
});

describe('migrate: built-in names', () => {
  test('console, Math, Object, Array, String, Promise and Error', () => {
    const result = code(
      [
        'console.log(Math.max(1, 2), Math.PI);',
        'console.error(Object.keys({}), Array.isArray([]), Array.from("ab"));',
        'console.warn(String(1), String.fromCharCode(65), Promise.resolve(1));',
        'const e: Error = new Error("x");',
        'const p: Promise<Partial<Record<string, number>>> = Promise.resolve({});',
      ].join('\n')
    );
    expect(result).toContain('чоп.сабт(Риёзӣ.ҳаддиАксар(1, 2), Риёзӣ.ПИ);');
    expect(result).toContain(
      'чоп.хато(объект.калидҳо({}), рӯйхат.рӯйхатАст([]), рӯйхат.аз("ab"));'
    );
    expect(result).toContain('чоп.огоҳӣ(сатр(1), сатр.азКодиАломат(65), Ваъда.resolve(1));');
    expect(result).toContain('собит e: Хато = нав Хато("x");');
    expect(result).toContain('Ваъда<қисмӣ<сабт_навъ<сатр, рақам>>>');
  });

  test('members of built-in types are translated, members of the program are not', () => {
    const result = code(
      [
        'class Stack { items: number[] = []; push(x: number) { this.items.push(x); return this.items.length; } }',
        'const s = new Stack();',
        's.push(1);',
        'const word = "abc";',
        'const both: string | string[] = word;',
        'const anything: any = word;',
        'console.log(word.toUpperCase(), both.length, anything.length, new Map().get(1));',
      ].join('\n')
    );
    expect(result).toContain('push(x: рақам) { ин.items.илова(x); бозгашт ин.items.дарозӣ; }');
    expect(result).toContain('s.push(1);');
    expect(result).toContain(
      'word.калон(), both.дарозӣ, anything.length, нав Map().бозгирифтан(1)'
    );
  });

  test('without type information only the global objects are translated', () => {
    const result = code('const xs = [1];\nxs.push(2);\nconsole.log(Math.min(1, 2));', {
      typeInfo: false,
    });
    expect(result).toContain('xs.push(2);');
    expect(result).toContain('чоп.сабт(Риёзӣ.ҳаддиАқал(1, 2));');
    expect(code('const Math = { max: 1 };\nconsole.log(Math.max);', { typeInfo: false })).toContain(
      'чоп.сабт(Math.max);'
    );
  });

  test('globals that the program declares itself are not translated', () => {
    const result = code(
      'const Math = { max: (a: number) => a };\nconst console = { log: (x: unknown) => x };\nconsole.log(Math.max(1));\nfunction f(undefined: number) { return undefined; }'
    );
    expect(result).toContain('console.log(Math.max(1));');
    expect(result).toContain('бозгашт undefined;');
  });

  test('console on its own stays console', () => {
    expect(code('const c = console;\nc.log(1);')).toContain('собит c = console;\nc.сабт(1);');
  });

  test('every Tajik member name compiles back to its JavaScript name', () => {
    for (const [group, names] of Object.entries(MEMBER_NAMES)) {
      for (const [name, alias] of Object.entries(names)) {
        expect(`${group}.${translateMemberName(alias)}`).toBe(`${group}.${name}`);
      }
    }
    expect(memberName('array', 'constructor')).toBeUndefined();
    expect(memberName('math', 'max')).toBe('ҳаддиАксар');
  });

  test('global names map back to the JavaScript globals', () => {
    for (const [name, tajik] of GLOBAL_VALUE_NAMES) {
      const compiled = compile(`тағ х = ${tajik};`, { typeCheck: false }).code;
      expect(compiled).toContain(
        name === 'undefined' ? 'undefined' : (BUILTIN_MAPPINGS.get(tajik) ?? name)
      );
    }
    for (const tajik of GLOBAL_TYPE_NAMES.values()) {
      expect(compile(`тағ х: ${tajik}<ҳар> | рақам = 1;`, { typeCheck: false }).errors).toEqual([]);
    }
  });
});

describe('migrate: names that SomonScript reserves', () => {
  test('identifiers spelled like SomonScript keywords are renamed', () => {
    const result = migrate('const агар = 1;\nconst агар_ = 2;\nconsole.log(агар + агар_);');
    expect(result.code).toBe('собит агар__ = 1;\nсобит агар_ = 2;\nчоп.сабт(агар__ + агар_);\n');
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].message).toContain("renamed to 'агар__'");
  });

  test('imports and exports keep the names other modules see', () => {
    const result = code(
      'import { агар } from "./m";\nconst тағ = агар;\nexport { тағ };\nexport { агар as рӯйхат } from "./n";'
    );
    expect(result).toBe(
      'ворид { агар чун агар_ } аз "./m";\nсобит тағ_ = агар_;\nсодир { тағ_ чун тағ };\nсодир { агар чун рӯйхат } аз "./n";'
    );
  });

  test('member names that are built-in aliases keep their meaning', () => {
    const result = migrate(
      'const o = { дарозӣ: 1 };\nconsole.log(o.дарозӣ, o?.дарозӣ);\nclass K { илова() {} }'
    );
    expect(result.code).toContain('собит o = { "дарозӣ": 1 };');
    expect(result.code).toContain('чоп.сабт(o["дарозӣ"], o?.["дарозӣ"]);');
    expect(result.warnings.map(w => w.message)).toEqual([
      "the member name 'илова' is a SomonScript built-in name and compiles to 'push'",
    ]);
  });
});

/** Every feature probe of migrate.ts. */
const ALL_FEATURES = [
  'declare',
  'declareModule',
  'declareGlobal',
  'override',
  'accessor',
  'using',
  'decorators',
  'importType',
  'typeSpecifier',
  'exportType',
  'overloads',
  'methodOverloads',
  'optionalMethod',
  'thisParam',
  'classIndexSignature',
  'callSignature',
  'constructSignature',
  'accessorSignature',
  'catchType',
  'bigintType',
  'variance',
  'dynamicImport',
  'exportStarAs',
  'computedMember',
  'stringMember',
  'exportDefaultFunction',
  'exportDefaultClass',
  'importMeta',
];

describe('migrate: constructs without a SomonScript form', () => {
  // As if the compiler supported none of them, whatever this version supports
  beforeAll(() => ALL_FEATURES.forEach(feature => setFeatureSupport(feature, false)));
  afterAll(() => ALL_FEATURES.forEach(feature => setFeatureSupport(feature, undefined)));

  test('type-only constructs are left out with a warning', () => {
    const result = migrate(
      [
        'import type { A } from "./a";',
        'import { type B, c } from "./b";',
        'import { type D } from "./d";',
        'export type { A };',
        'export { type B as BB, c };',
        'declare const env: string;',
        'declare global { interface Window {} }',
        'function f(a: string): void;',
        'function f(a: any) {}',
        'class K { m(): void; m() {} constructor(); constructor() {} [k: string]: any; declare d: number; override o() {} }',
        'interface I { (x: number): string; new (x: number): I; get g(): number; set g(v: number); }',
        'function t(this: K, x: number) { return x; }',
        'try {} catch (e: unknown) {}',
        'interface V<in T, out U> {}',
      ].join('\n')
    );
    const text = result.code;
    for (const gone of [
      'import type',
      'type B',
      'type D',
      'declare',
      'override',
      'this:',
      '[k: string]',
      'e: unknown',
      'set g',
      '(x: number): string',
      'in T',
      'out U',
    ]) {
      expect(text).not.toContain(gone);
    }
    expect(text).toContain('ворид { c } аз "./b";');
    expect(text).toContain('содир { c };');
    expect(text).toContain('функсия f(a: ҳар) {}');
    expect(text).toContain('синф K { m() {} конструктор() {} o() {} }');
    expect(text).toContain('интерфейс I { g: рақам; }');
    expect(text).toContain('функсия t(x: рақам)');
    expect(text).toContain('гирифтан (e) {}');
    expect(text).toContain('интерфейс V<T, U> {}');
    expect(result.warnings.length).toBeGreaterThanOrEqual(15);
    expect(result.warnings.every(w => w.line > 0)).toBe(true);
  });

  test('import = and export = become CommonJS', () => {
    const result = migrate('import fs = require("fs");\nexport = fs;');
    expect(result.code).toBe('собит fs = require("fs");\nmodule.exports = fs;\n');
    expect(result.warnings).toHaveLength(2);
    expect(migrate('import type T = require("t");').code).toBe('');
  });

  test('accessor and optional methods lose the modifier', () => {
    const result = migrate('class K { accessor a = 1; m?() { return 1; } }');
    expect(result.code).toBe('синф K { a = 1; m() { бозгашт 1; } }\n');
    expect(result.warnings).toHaveLength(2);
  });

  test('a do-while body becomes a block', () => {
    expect(code('let i = 0;\ndo i++; while (i < 3);')).toBe(
      'тағ i = 0;\nкун { i++; } то (i < 3);\n'
    );
  });

  test('explicit type arguments of calls are kept when SomonScript reads them', () => {
    expect(
      code('declare function f<T>(x: T): T;\nf<Map<string, Map<string, number>>>(new Map());')
    ).toContain('f<Map<сатр, Map<сатр, рақам> > >(нав Map());');
    const dropped = migrate(
      'function f<T>(x: T) { return x; }\nf<{ a: number }>({ a: 1 });\nf<any>(1);\nf<Partial<{}>>({});'
    );
    expect(dropped.code).toContain('f({ a: 1 });\nf(1);\nf({});');
    expect(dropped.warnings).toHaveLength(3);
    expect(code('function f<T>(x: T) { return x; }\nf<string[]>([]);\nf<null>(null);')).toContain(
      'f<сатр[]>([]);\nf<холӣ>(холӣ);'
    );
  });

  test('constructs SomonScript cannot express yet are kept and reported', () => {
    const cases: Array<[string, string]> = [
      ['function d(...a: any[]) {}\n@d class A {}', 'decorators are not supported'],
      ['{ using r = { [Symbol.dispose]() {} }; }', "'using' is not supported"],
      ['const m = import.meta;', "'import.meta' is not supported"],
      ['import("./m");', '\'import("./m")\' is not supported'],
      ['with (Math) {}', "'with' statement is not supported"],
      ['class A { ["k"]() {} }', 'computed class member names'],
      ['class A { "k"() {} }', 'named by a string'],
      ['class A { get ["k"]() { return 1; } }', 'computed class member names'],
      ['class A { ["k"] = 1; }', 'computed class member names'],
      ['export * as ns from "./m";', "'export * as' is not supported"],
      ['export default function () {}', 'anonymous default export'],
      ['export default class {}', 'anonymous default export'],
      ['declare module "m" {}', 'ambient declaration'],
    ];
    for (const [source, message] of cases) {
      const warnings = messages(source);
      expect(warnings.some(warning => warning.includes(message))).toBe(true);
    }
    // When the result does not compile, the last warning says so
    expect(messages('with (Math) {}').pop()).toContain('the result does not compile yet');
  });

  test('a bigint type keeps its English name while калонрақам is not a type', () => {
    expect(code('let b: bigint = 1n;')).toBe('тағ b: bigint = 1n;\n');
  });
});

describe('migrate: newer constructs once SomonScript supports them', () => {
  const features = [
    'override',
    'accessor',
    'declare',
    'overloads',
    'importType',
    'thisParam',
    'variance',
    'bigintType',
    'dynamicImport',
    'importMeta',
    'declareModule',
  ];
  afterEach(() => features.forEach(feature => setFeatureSupport(feature, undefined)));

  test('uses the Tajik keywords', () => {
    features.forEach(feature => setFeatureSupport(feature, true));
    const result = migrate(
      [
        'class A { m() {} }',
        'class B extends A { override m() {} accessor x = 1; }',
        'declare const c: number;',
        'function f(a: string): void;',
        'function f(a: any) {}',
        'import type { T } from "./t";',
        'function g(this: A) {}',
        'interface V<in T, out U> {}',
        'let n: bigint;',
        'import("./m");',
        'const meta = import.meta;',
        'declare module "m" {}',
      ].join('\n'),
      { format: false }
    );
    for (const word of [
      'бознавис m()',
      'дастрасӣ x',
      'эълон собит c',
      'функсия f(a: сатр): беджавоб;',
      'ворид навъ { T }',
      'функсия g(ин: A)',
      'интерфейс V<дар T, берун U>',
      'тағ n: калонрақам',
      'ворид("./m")',
      'ворид.meta',
      'эълон модул "m"',
    ]) {
      expect(result.code).toContain(word);
    }
  });

  test('supports() probes the compiler once', () => {
    expect(supports('no-such-feature')).toBe(false);
    setFeatureSupport('overloads', undefined);
    expect(supports('overloads')).toBe(supports('overloads'));
  });
});

describe('migrate: text, comments and errors', () => {
  test('keeps comments and blank lines, and formats the result', () => {
    const source = [
      '/**',
      ' * Adds two numbers.',
      ' * @param a the first number',
      ' */',
      'function add(a: number, b: number): number {',
      '  // the sum',
      '  return a + b; /* done */',
      '}',
      '',
      '',
      '',
      'console.log(add(1, 2)); // 3',
    ].join('\n');
    expect(code(source)).toBe(
      [
        '/**',
        ' * Adds two numbers.',
        ' * @param a the first number',
        ' */',
        'функсия add(a: рақам, b: рақам): рақам {',
        '    // the sum',
        '    бозгашт a + b; /* done */',
        '}',
        '',
        'чоп.сабт(add(1, 2)); // 3',
        '',
      ].join('\n')
    );
  });

  test('format: false keeps the layout of the TypeScript source', () => {
    expect(code('if (a) {\n  b()\n}', { format: false })).toBe('агар (a) {\n  b()\n}');
    expect(code('if (a) {\n  b()\n}', { indent: 2 })).toBe('агар (a) {\n  b();\n}\n');
  });

  test('syntax errors throw MigrateError with all diagnostics', () => {
    expect(() => migrate('let = ;')).toThrow(MigrateError);
    try {
      migrate('function (');
    } catch (error) {
      expect(error).toBeInstanceOf(MigrateError);
      expect((error as MigrateError).diagnostics.length).toBeGreaterThan(0);
      expect((error as MigrateError).message).toMatch(/at line 1, column \d+/);
    }
    expect(() => migrate('let = ;', { typeInfo: false })).toThrow(MigrateError);
  });

  test('file helpers', () => {
    expect(somFileName('src/a.ts')).toBe('src/a.som');
    expect(somFileName('b.mts')).toBe('b.som');
    expect(isTypeScriptSource('a.ts')).toBe(true);
    expect(isTypeScriptSource('a.d.ts')).toBe(false);
    expect(isTypeScriptSource('a.js')).toBe(false);
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'somon-migrate-'));
    try {
      const file = path.join(dir, 'x.ts');
      fs.writeFileSync(file, 'const x: number = 1;\n');
      expect(migrateFile(file).code).toBe('собит x: рақам = 1;\n');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

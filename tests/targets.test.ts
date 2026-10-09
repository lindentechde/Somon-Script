import { SourceMapConsumer, SourceMapGenerator, type RawSourceMap } from 'source-map';
import ts from 'typescript';
import * as vm from 'vm';

import { compile } from '../src/compiler';
import {
  analyzeSyntax,
  BUNDLE_FORMATS,
  composeSourceMaps,
  DEFAULT_TARGET,
  defaultLib,
  defaultUseDefineForClassFields,
  hasInvalidEscape,
  isBundleFormat,
  isTarget,
  loweringCompilerOptions,
  lowerToTarget,
  needsLowering,
  normalizeLib,
  readLibNames,
  readsAlikeAsTypeScript,
  regExpFeatures,
  scriptTargetFor,
  TARGETS,
  targetAtLeast,
  typeScriptLibNames,
  validateGlobalName,
  validateLib,
  type Target,
} from '../src/targets';

const LINE_SEPARATOR = String.fromCharCode(0x2028);

/** Run JavaScript in a fresh context and collect what it logs. */
function run(code: string): string[] {
  const lines: string[] = [];
  const log = (...args: unknown[]): void => {
    lines.push(args.map(String).join(' '));
  };
  vm.runInNewContext(code, { console: { log } });
  return lines;
}

describe('targets', () => {
  test('lists every ECMAScript edition from es5 to esnext, oldest first', () => {
    expect(TARGETS).toEqual([
      'es5',
      'es2015',
      'es2016',
      'es2017',
      'es2018',
      'es2019',
      'es2020',
      'es2021',
      'es2022',
      'es2023',
      'es2024',
      'esnext',
    ]);
    expect(DEFAULT_TARGET).toBe('es2022');
  });

  test('isTarget and targetAtLeast', () => {
    expect(isTarget('es2017')).toBe(true);
    expect(isTarget('ES2017')).toBe(false);
    expect(isTarget('es3')).toBe(false);
    expect(isTarget(2017)).toBe(false);
    expect(targetAtLeast('es2020', 'es2015')).toBe(true);
    expect(targetAtLeast('es2020', 'es2020')).toBe(true);
    expect(targetAtLeast('es2019', 'es2020')).toBe(false);
    expect(targetAtLeast('esnext', 'es2024')).toBe(true);
  });

  test('useDefineForClassFields defaults to TypeScript’s: on from es2022', () => {
    expect(TARGETS.filter(defaultUseDefineForClassFields)).toEqual([
      'es2022',
      'es2023',
      'es2024',
      'esnext',
    ]);
  });

  test('maps targets to the script targets the installed TypeScript knows', () => {
    expect(scriptTargetFor('es5')).toBe(ts.ScriptTarget.ES5);
    expect(scriptTargetFor('es2015')).toBe(ts.ScriptTarget.ES2015);
    expect(scriptTargetFor('es2022')).toBe(ts.ScriptTarget.ES2022);
    expect(scriptTargetFor('esnext')).toBe(ts.ScriptTarget.ESNext);
    const known = ts.ScriptTarget as unknown as Record<string, number | undefined>;
    // es2023/es2024 use the newest TypeScript target that is not newer
    expect(scriptTargetFor('es2024')).toBe(known.ES2024 ?? known.ES2023 ?? ts.ScriptTarget.ES2022);
    for (const target of TARGETS) {
      expect(typeof scriptTargetFor(target)).toBe('number');
    }
  });

  test('bundle formats and global names', () => {
    expect(BUNDLE_FORMATS).toEqual(['commonjs', 'esm', 'iife']);
    expect(isBundleFormat('iife')).toBe(true);
    expect(isBundleFormat('umd')).toBe(false);
    expect(isBundleFormat(undefined)).toBe(false);
    expect(validateGlobalName('МоКитоб')).toBeUndefined();
    expect(validateGlobalName('app.lib_2.$x')).toBeUndefined();
    expect(validateGlobalName('a..b')).toMatch(/identifier/);
    expect(validateGlobalName('2x')).toMatch(/identifier/);
    expect(validateGlobalName('a-b')).toMatch(/identifier/);
    expect(validateGlobalName(5)).toMatch(/identifier/);
  });
});

describe('lib', () => {
  test('knows the libs the installed TypeScript ships', () => {
    const names = typeScriptLibNames();
    expect(names).toEqual(expect.arrayContaining(['es5', 'es2015', 'es2022', 'esnext', 'dom']));
    expect(names).toContain('es2015.promise');
    expect(typeScriptLibNames()).toBe(names);
  });

  test('reads the list from the --lib diagnostic when ts.libs is missing', () => {
    const withoutLibs = Object.create(ts, { libs: { value: undefined } }) as typeof ts;
    expect(readLibNames(withoutLibs)).toEqual([...typeScriptLibNames()]);
  });

  test('validates names case-insensitively', () => {
    expect(validateLib(['es2022', 'DOM', ' dom.iterable '])).toEqual([]);
    expect(validateLib([])).toEqual([]);
    expect(validateLib(['es2022', 'foo', 'bar'])[0]).toMatch(
      /^unknown lib 'foo', 'bar'\. TypeScript ships es5, .*dom.* and their parts/
    );
    expect(validateLib('es2022')).toEqual([expect.stringMatching(/must be an array/)]);
    expect(validateLib(['es2022', 5])).toEqual([expect.stringMatching(/must be an array/)]);
  });

  test('normalizes names', () => {
    expect(normalizeLib([' ES2022', 'dom', 'DOM', ''])).toEqual(['es2022', 'dom']);
  });

  test('defaults to the target’s ECMAScript lib and the DOM', () => {
    expect(defaultLib('es5')).toEqual(['es5', 'dom']);
    expect(defaultLib('es2015')).toEqual(['es2015', 'dom', 'dom.iterable']);
    expect(defaultLib('es2020')).toEqual(['es2020', 'dom', 'dom.iterable', 'dom.asynciterable']);
    expect(defaultLib('esnext')[0]).toBe('esnext');
    // es2024 uses the newest ECMAScript lib TypeScript ships (es2023 before TypeScript 5.7)
    const es2024 = typeScriptLibNames().includes('es2024') ? 'es2024' : 'es2023';
    expect(defaultLib('es2024')[0]).toBe(es2024);
    for (const target of TARGETS) {
      expect(validateLib(defaultLib(target))).toEqual([]);
    }
  });
});

describe('analyzeSyntax: the newest syntax a program uses', () => {
  test.each<[string, string, Target]>([
    ['nothing new', 'var а = 1; function ф(б) { return а + б; }', 'es5'],
    ['let/const', 'let а = 1;', 'es2015'],
    ['arrow', 'var ф = () => 1;', 'es2015'],
    ['class', 'class К {}', 'es2015'],
    ['template', 'var с = `а${1}`;', 'es2015'],
    ['for-of', 'for (var х of []) {}', 'es2015'],
    ['spread', 'f(...[1]);', 'es2015'],
    ['destructuring declaration', 'var [а] = [1];', 'es2015'],
    ['destructuring assignment', '[а, б] = [б, а];', 'es2015'],
    ['default parameter', 'function ф(а = 1) {}', 'es2015'],
    ['rest parameter', 'function ф(...а) {}', 'es2015'],
    ['generator', 'function* г() { yield 1; }', 'es2015'],
    ['object method', 'var о = { м() {} };', 'es2015'],
    ['shorthand property', 'var о = { а };', 'es2015'],
    ['computed property', 'var о = { ["а"]: 1 };', 'es2015'],
    ['new.target', 'function Ф() { return new.target; }', 'es2015'],
    ['binary literal', 'var а = 0b101;', 'es2015'],
    ['code point escape', 'var а = "\\u{1F600}";', 'es2015'],
    ['exponent', 'var а = 2 ** 3;', 'es2016'],
    ['exponent assignment', 'а **= 2;', 'es2016'],
    ['async function', 'async function ф() {}', 'es2017'],
    ['await', 'async function ф() { await 1; }', 'es2017'],
    ['async generator', 'async function* г() {}', 'es2018'],
    ['for await', 'async function ф() { for await (var х of []) {} }', 'es2018'],
    ['object spread', 'var о = { ...а };', 'es2018'],
    ['object rest', 'var { а, ...б } = о;', 'es2018'],
    ['tagged template with an invalid escape', 'String.raw`\\unicode`;', 'es2018'],
    ['optional catch binding', 'try {} catch {}', 'es2019'],
    ['line separator in a string', `var а = "${LINE_SEPARATOR}";`, 'es2019'],
    ['optional chaining', 'о?.а;', 'es2020'],
    ['optional call', 'ф?.();', 'es2020'],
    ['optional element', 'о?.[0];', 'es2020'],
    ['nullish coalescing', 'а ?? б;', 'es2020'],
    ['logical assignment', 'а ??= 1; б ||= 2; в &&= 3;', 'es2021'],
    ['numeric separator', 'var а = 1_000;', 'es2021'],
    ['class field', 'class К { а = 1; }', 'es2022'],
    ['private field', 'class К { #а; }', 'es2022'],
    ['static block', 'class К { static {} }', 'es2022'],
    ['accessor', 'class К { accessor а = 1; }', 'esnext'],
    ['decorator', '@д class К {}', 'esnext'],
  ])('%s needs %s', (_name, code, required) => {
    expect(analyzeSyntax(code, 'esnext').required).toBe(required);
  });

  test('using declarations need esnext when TypeScript knows them', () => {
    const using = (ts.NodeFlags as unknown as Record<string, number | undefined>).Using;
    const report = analyzeSyntax('{ using а = ф(); }', 'esnext');
    expect(report.required).toBe(using ? 'esnext' : 'es2015');
    expect(report.neverNative).toBe(Boolean(using));
  });

  test('decorators and accessor are syntax no runtime runs yet', () => {
    expect(analyzeSyntax('@д class К {}', 'esnext').neverNative).toBe(true);
    expect(analyzeSyntax('class К { м(@д х) {} }', 'esnext').neverNative).toBe(true);
    expect(analyzeSyntax('class К { accessor а = 1; }', 'esnext').neverNative).toBe(true);
    expect(analyzeSyntax('class К { #а = 1; }', 'esnext').neverNative).toBe(false);
  });

  test('a valid escape in a tagged template is es2015', () => {
    expect(analyzeSyntax('String.raw`\\u0041${1}\\x41`;', 'esnext').required).toBe('es2015');
  });

  test('notes class fields, whose semantics depend on useDefineForClassFields', () => {
    expect(analyzeSyntax('class К { а; }', 'esnext').classFields).toBe(true);
    expect(analyzeSyntax('class К { м() {} }', 'esnext').classFields).toBe(false);
  });
});

describe('analyzeSyntax: what a target cannot express', () => {
  test('BigInt literals below es2020', () => {
    expect(analyzeSyntax('var а = 10n;', 'es2020').diagnostics).toEqual([]);
    expect(analyzeSyntax('var а = 1;\nvar б = 10n;', 'es2019').diagnostics).toEqual([
      {
        message:
          'BigInt literals are only available when targeting es2020 or later (target is es2019).',
        line: 2,
        column: 8,
      },
    ]);
  });

  test.each<[string, Target, string]>([
    ['/а/u', 'es5', "The regular expression flag 'u' is"],
    ['/а/y', 'es5', "The regular expression flag 'y' is"],
    ['/а/s', 'es2017', "The regular expression flag 's' is"],
    ['/а/d', 'es2021', "The regular expression flag 'd' is"],
    ['/[а]/v', 'es2023', "The regular expression flag 'v' is"],
    ['/(?<сол>\\d+)/', 'es2017', 'Named capturing groups are'],
    ['/(?<=а)б/', 'es2017', 'Lookbehind assertions are'],
    ['/(?<!а)б/', 'es2017', 'Lookbehind assertions are'],
    ['/\\p{L}/u', 'es2017', 'Unicode property escapes are'],
    ['/(?i:а)/', 'es2024', 'Regular expression modifiers are'],
  ])('%s with %s', (regExp, target, feature) => {
    const [diagnostic] = analyzeSyntax(`var р = ${regExp};`, target).diagnostics;
    expect(diagnostic.message).toMatch(new RegExp(`^${escapeRegExp(feature)} only available`));
    expect(diagnostic.message).toContain(`(target is ${target})`);
  });

  test('regular expressions the target has are fine', () => {
    expect(analyzeSyntax('var р = /а+(?:б)[(?<]\\(?<x/gim;', 'es5').diagnostics).toEqual([]);
    expect(analyzeSyntax('var р = /\\p{L}/;', 'es5').diagnostics).toEqual([]);
    expect(analyzeSyntax('var р = /(?<н>а)\\k<н>/su;', 'es2018').diagnostics).toEqual([]);
  });

  test('top-level await below es2022', () => {
    expect(analyzeSyntax('await ф();', 'es2021').diagnostics[0].message).toMatch(
      /^Top-level 'await' is only available when targeting es2022/
    );
    expect(analyzeSyntax('for await (const х of а) {}', 'es2017').diagnostics).toHaveLength(1);
    expect(analyzeSyntax('await ф();', 'es2022').diagnostics).toEqual([]);
    expect(analyzeSyntax('async function ф() { await г(); }', 'es5').diagnostics).toEqual([]);
  });

  test('es5 classes cannot extend built-ins that need new', () => {
    const [diagnostic] = analyzeSyntax('class М extends Map {}', 'es5').diagnostics;
    expect(diagnostic.message).toMatch(/^Classes extending the built-in 'Map' are only available/);
    expect(analyzeSyntax('class М extends Map {}', 'es2015').diagnostics).toEqual([]);
    expect(analyzeSyntax('class Х extends Error {}', 'es5').diagnostics).toEqual([]);
    expect(analyzeSyntax('var К = class extends Promise {};', 'es5').diagnostics).toHaveLength(1);
  });
});

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

describe('helpers for template and regular expression syntax', () => {
  test.each([
    ['\\u0041', false],
    ['\\u{1F600}', false],
    ['\\x41', false],
    ['\\0', false],
    ['\\n\\\\u', false],
    ['\\unicode', true],
    ['\\u{zz}', true],
    ['\\xg', true],
    ['\\01', true],
    ['\\1', true],
    ['abc\\', false],
  ])('hasInvalidEscape(%s) is %s', (raw, expected) => {
    expect(hasInvalidEscape(raw)).toBe(expected);
  });

  test('regExpFeatures skips escapes and character classes', () => {
    expect([...regExpFeatures('[(?<]\\(?<а', false).keys()]).toEqual([]);
    expect([...regExpFeatures('(?<а>б)(?<=в)', false).keys()]).toEqual([
      'Named capturing groups are',
      'Lookbehind assertions are',
    ]);
    expect([...regExpFeatures('\\p{L}', true).keys()]).toEqual(['Unicode property escapes are']);
    expect([...regExpFeatures('(?:а)(?=б)(?!в)', false).keys()]).toEqual([]);
    expect([...regExpFeatures('(?-i:а)', false).keys()]).toEqual([
      'Regular expression modifiers are',
    ]);
  });
});

describe('needsLowering', () => {
  const report = (code: string) => analyzeSyntax(code, 'esnext');

  test('when the code is newer than the target', () => {
    expect(needsLowering(report('а ?? б;'), 'es2019')).toBe(true);
    expect(needsLowering(report('а ?? б;'), 'es2020')).toBe(false);
  });

  test('always for es5', () => {
    expect(needsLowering(report('var а = 1;'), 'es5')).toBe(true);
  });

  test('when class fields must be assigned on a target that defines them', () => {
    expect(needsLowering(report('class К { а = 1; }'), 'es2022')).toBe(false);
    expect(needsLowering(report('class К { а = 1; }'), 'es2022', true)).toBe(false);
    expect(needsLowering(report('class К { а = 1; }'), 'es2022', false)).toBe(true);
    expect(needsLowering(report('class К {}'), 'es2022', false)).toBe(false);
  });
});

describe('lowerToTarget', () => {
  test('returns code the target already runs as it is', () => {
    const code = 'const а = 1;\nconsole.log(а ?? 2);\n';
    expect(lowerToTarget(code, { target: 'es2020' })).toEqual({
      code,
      diagnostics: [],
      lowered: false,
    });
  });

  test('downlevel: false only reports', () => {
    const code = 'class К { #а = 1; }';
    expect(lowerToTarget(code, { target: 'es2015', downlevel: false })).toEqual({
      code,
      diagnostics: [],
      lowered: false,
    });
    expect(
      lowerToTarget('var а = 1n;', { target: 'es2015', downlevel: false }).diagnostics
    ).toHaveLength(1);
  });

  test('returns diagnostics and the unchanged code when the target cannot express it', () => {
    const result = lowerToTarget('let а = 1n;', { target: 'es2017' });
    expect(result.code).toBe('let а = 1n;');
    expect(result.lowered).toBe(false);
    expect(result.diagnostics).toHaveLength(1);
  });

  const programs: Array<[string, string, string]> = [
    [
      'generators and spread',
      'function* г() { yield 1; yield* [2, 3]; } console.log([...г()].join(","));',
      '1,2,3',
    ],
    [
      'Map and Set iteration',
      'const м = new Map([["а", 1]]); const с = new Set([1, 2]); for (const [к, қ] of м) console.log(к, қ); console.log([...с].length, [..."аб"].length);',
      'а 1\n2 2',
    ],
    [
      'classes with private members and static blocks',
      'class К { #х = 1; static у = 2; static { К.у++; } #м() { return this.#х; } гир() { return this.#м() + К.у; } static аст(о) { return #х in о; } } console.log(new К().гир(), К.аст(new К()), К.аст({}));',
      '4 true false',
    ],
    [
      'async functions and async iteration',
      'async function* г() { yield 1; yield 2; } (async () => { let с = 0; for await (const х of г()) с += х; console.log(с, (await Promise.resolve(3)) ** 2); })();',
      '',
    ],
    [
      'optional chaining, nullish coalescing and logical assignment',
      'const о = { а: { б: null } }; let в; в ??= о?.а?.б ?? 5; let г = 0; г ||= 7; console.log(в, г, о.х?.у);',
      '5 7 undefined',
    ],
    [
      'object spread and rest, optional catch binding, numeric separators',
      'const { а, ...б } = { а: 1, в: 2, г: 3 }; const о = { ...б, д: 1_000 }; try { throw 1; } catch { console.log(а, Object.keys(о).join(","), о.д); }',
      '1 в,г,д 1000',
    ],
    [
      'for-in with a pattern',
      'for (const [а, б] in { ху: 1 }) console.log(а, б); let в, г; for ([в, г] in { юя: 1 }) console.log(в, г);',
      'х у\nю я',
    ],
    [
      'subclasses of Error and Array',
      'class Х extends Error { constructor(п) { super(п); this.name = "Х"; } тафсил() { return this.name + ":" + this.message; } } class Ю extends Х {} class Р extends Array { охир() { return this[this.length - 1]; } } const ю = new Ю("бад"); const р = new Р(); р.push(1, 2); console.log(ю instanceof Ю, ю instanceof Х, ю instanceof Error, ю.тафсил(), р instanceof Р, р.охир());',
      'true true true Х:бад true 2',
    ],
    ['line separators in strings', `const с = "а${LINE_SEPARATOR}б"; console.log(с.length);`, '3'],
  ];

  test.each(programs)('%s: same output on every target', (_name, code, expected) => {
    const native = run(code).join('\n');
    if (expected) expect(native).toBe(expected);
    for (const target of TARGETS) {
      const result = lowerToTarget(code, { target });
      expect(result.diagnostics).toEqual([]);
      // What comes out uses no syntax newer than the target
      expect(targetAtLeast(target, analyzeSyntax(result.code, 'esnext').required)).toBe(true);
      expect(run(result.code).join('\n')).toBe(native);
    }
  });

  test('async output matches after the promises settle', async () => {
    const code = programs[3][1];
    for (const target of ['es5', 'es2016', 'es2017'] as const) {
      const lines: string[] = [];
      vm.runInNewContext(lowerToTarget(code, { target }).code, {
        console: { log: (...args: unknown[]) => lines.push(args.join(' ')) },
      });
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(lines).toEqual(['3 9']);
    }
  });

  test.each([
    ['decorators', '@д class К {}', /@д/],
    ['accessor', 'class К { accessor а = 1; }', /accessor а/],
  ])('%s are lowered for every target, esnext included', (_name, code, kept) => {
    expect(needsLowering(analyzeSyntax(code, 'esnext'), 'esnext')).toBe(true);
    for (const target of TARGETS) {
      const result = lowerToTarget(code, { target });
      expect(result.lowered).toBe(true);
      expect(result.code).not.toMatch(kept);
      // esnext is lowered as the newest edition: no syntax newer than es2022 remains
      const lowered = analyzeSyntax(result.code, 'esnext');
      expect(lowered.neverNative).toBe(false);
      expect(targetAtLeast(target, lowered.required)).toBe(true);
    }
    expect(loweringCompilerOptions({ target: 'esnext' }, true).target).toBe(
      scriptTargetFor('es2024')
    );
    expect(loweringCompilerOptions({ target: 'esnext' }).target).toBe(ts.ScriptTarget.ESNext);
  });

  test('experimentalDecorators lowers legacy decorators, parameters included', () => {
    const { code } = lowerToTarget('function д() {}\nclass К { м(@д х) {} }', {
      target: 'es2022',
      experimentalDecorators: true,
    });
    expect(code).toContain('__decorate');
    expect(code).toContain('__param(0, д)');
    expect(loweringCompilerOptions({ target: 'es2022' }).experimentalDecorators).toBeUndefined();
  });

  test('inlines helpers instead of importing tslib', () => {
    const { code } = lowerToTarget('async function ф() { await 1; }', { target: 'es5' });
    expect(code).toContain('var __awaiter = (this && this.__awaiter) || function');
    expect(code).not.toMatch(/tslib|require\(/);
  });

  test('keeps module syntax as it is', () => {
    const { code } = lowerToTarget('import { а } from "./а"; export const б = а ?? 1;', {
      target: 'es2019',
    });
    expect(code).toContain('import { а } from "./а";');
    expect(code).toContain('export const б');
  });

  test('reads the code as JavaScript: `a < b > (c)` is no generic call', () => {
    const { code } = lowerToTarget('var д = а < б > (в < г);', { target: 'es5' });
    expect(code).toContain('а < б > (в < г)');
  });

  // Found by tests/fuzz.test.ts: TypeScript 5.4's checker crashed while emitting this JavaScript
  const evolvingArraySwitch =
    'let х = [];\nswitch (х) {\n  case "а":\n    break;\n}\nconsole.log(х);\n';

  test('lowers JavaScript that crashes TypeScript 5.4 as TypeScript, when it reads the same', () => {
    const { code, diagnostics } = lowerToTarget(
      `${evolvingArraySwitch}import { а } from "./а";\nconsole.log(х ?? 1);`,
      { target: 'es2017' }
    );
    expect(diagnostics).toEqual([]);
    expect(code).toContain('х !== null && х !== void 0 ? х : 1');
    // As in JavaScript, an import whose binding is unused stays
    expect(code).toContain('import { а } from "./а";');
    const result = compile('тағ х = [];\nинтихоб (х) { ҳолат "а": шикастан; }\nчоп.сабт(х ?? 1);', {
      target: 'es5',
      typeCheck: false,
    });
    expect(result.errors).toEqual([]);
    expect(run(result.code)).toEqual(['']);
  });

  /** TypeScript 5.6 and later no longer check the file while they transpile it. */
  const typeScriptCrashes = ((): boolean => {
    try {
      ts.transpileModule(evolvingArraySwitch, {
        fileName: 'module.js',
        compilerOptions: { allowJs: true },
      });
      return false;
    } catch {
      return true;
    }
  })();

  (typeScriptCrashes ? test : test.skip)(
    'a crash on code TypeScript reads differently stays an error',
    () => {
      expect(readsAlikeAsTypeScript('а < б > (в);')).toBe(false);
      expect(readsAlikeAsTypeScript(evolvingArraySwitch)).toBe(true);
      expect(() =>
        lowerToTarget(`${evolvingArraySwitch}console.log(х ?? (а < б > (в)));`, {
          target: 'es2017',
        })
      ).toThrow(/^TypeScript \S+ crashed while lowering the code \(Debug Failure/);
      // Found by tests/fuzz.test.ts: TypeScript 5.4's checker overflows its stack on this
      const result = compile('тағ х = {} !== 1;\nагар ([х = холӣ], х) {}', {
        target: 'es5',
        typeCheck: false,
      });
      expect(result.errors).toEqual([
        expect.stringMatching(
          /^TypeScript \S+ crashed while lowering the code \(Maximum call stack size exceeded\); TypeScript 5\.6 and later/
        ),
      ]);
    }
  );

  test('useDefineForClassFields chooses defined or assigned fields', () => {
    const code = 'class К { а = 1; б; }';
    const defined = lowerToTarget(code, { target: 'es2020', useDefineForClassFields: true }).code;
    expect(defined).toContain('Object.defineProperty(this, "а"');
    expect(defined).toContain('Object.defineProperty(this, "б"');
    const assigned = lowerToTarget(code, { target: 'es2020' }).code;
    expect(assigned).toContain('this.а = 1;');
    expect(assigned).not.toContain('б');
    const native = lowerToTarget(code, { target: 'es2022' });
    expect(native.lowered).toBe(false);
    const legacy = lowerToTarget(code, { target: 'esnext', useDefineForClassFields: false });
    expect(legacy.code).toContain('this.а = 1;');
    expect(loweringCompilerOptions({ target: 'es2022' }).useDefineForClassFields).toBe(true);
  });

  test('returns a source map of the lowered code', () => {
    const result = lowerToTarget('const а = 1;\nconst б = а ?? 2;\n', {
      target: 'es2019',
      sourceMap: true,
    });
    expect(result.lowered).toBe(true);
    expect(result.map?.version).toBe(3);
    expect(result.code).not.toContain('sourceMappingURL');
    expect(lowerToTarget('а ?? б;', { target: 'es2019' }).map).toBeUndefined();
  });
});

describe('composeSourceMaps', () => {
  test('maps through both maps, keeping every source and name', async () => {
    // inner: generated lines 1 and 2 come from two sources
    const inner = new SourceMapGenerator({ file: 'bundle.js' });
    inner.setSourceContent('a.som', 'а');
    inner.addMapping({
      generated: { line: 1, column: 0 },
      original: { line: 3, column: 2 },
      source: 'a.som',
      name: 'ном',
    });
    inner.addMapping({
      generated: { line: 2, column: 4 },
      original: { line: 7, column: 0 },
      source: 'b.som',
    });
    // outer: the lowered code moved both lines down by one
    const outer = new SourceMapGenerator({ file: 'out.js' });
    outer.addMapping({
      generated: { line: 2, column: 0 },
      original: { line: 1, column: 5 },
      source: 'bundle.js',
    });
    outer.addMapping({
      generated: { line: 3, column: 2 },
      original: { line: 2, column: 0 },
      source: 'bundle.js',
    });
    const composed = composeSourceMaps(
      outer.toJSON() as unknown as RawSourceMap,
      inner.toJSON() as unknown as RawSourceMap
    );
    expect(composed.sources).toEqual(['a.som', 'b.som']);
    expect(composed.sourcesContent?.[0]).toBe('а');
    await SourceMapConsumer.with(composed, null, consumer => {
      expect(consumer.originalPositionFor({ line: 2, column: 0 })).toMatchObject({
        source: 'a.som',
        line: 3,
        column: 2,
        name: 'ном',
      });
      // Before the first inner mapping of its line: that mapping
      expect(consumer.originalPositionFor({ line: 3, column: 2 })).toMatchObject({
        source: 'b.som',
        line: 7,
      });
    });
  });
});

describe('compile with a target', () => {
  test('rejects an unknown target and invalid libs', () => {
    expect(compile('чоп.сабт(1);', { target: 'es3' as Target }).errors).toEqual([
      expect.stringMatching(/^Unknown target 'es3'\. Expected one of: es5, es2015, .*esnext$/),
    ]);
    expect(compile('чоп.сабт(1);', { lib: ['es2022', 'хато'] }).errors).toEqual([
      expect.stringMatching(/^Invalid lib: unknown lib 'хато'/),
    ]);
    expect(compile('чоп.сабт(1);', { lib: ['ES2022', 'dom'] }).errors).toEqual([]);
  });

  test('reports what the target cannot express at the SomonScript statement', () => {
    const result = compile('тағ а = 1;\nчоп.сабт(2n ** 64n, а);\n', { target: 'es2015' });
    expect(result.code).toBe('');
    expect(result.errors).toEqual([
      'Target error at line 2, column 1: BigInt literals are only available when targeting es2020 or later (target is es2015).\n> чоп.сабт(2n ** 64n, а);',
    ]);
    expect(compile('тағ а = 1;\nчоп.сабт(2n ** 64n, а);\n').errors).toEqual([]);
  });

  test('the default es2022 output is the generated code; older targets lower it', () => {
    const program = 'синф К { #а = 1; б; статикӣ { } }\nтағ в = 1;\nв ??= 2;';
    expect(compile(program).code).toBe(compile(program, { target: 'esnext' }).code);
    expect(compile(program).code).toContain('  #а = 1;\n  б;');
    const lowered = compile(program, { target: 'es2020' }).code;
    expect(lowered).toContain('_К_а.set(this, 1);');
    expect(lowered).not.toContain('б');
    expect(compile('синф К { а = 1; }', { target: 'es2021' }).code).toContain('this.а = 1;');
  });

  test('downlevel: false keeps the syntax but still checks the target', () => {
    expect(compile('синф К { #а = 1; }', { target: 'es5', downlevel: false }).code).toContain(
      '#а = 1;'
    );
    expect(compile('чоп.сабт(1n);', { target: 'es5', downlevel: false }).errors[0]).toMatch(
      /^Target error/
    );
  });

  test('passes useDefineForClassFields through', () => {
    const code = compile('синф К { а = 1; }', {
      target: 'es2020',
      useDefineForClassFields: true,
    }).code;
    expect(code).toContain('Object.defineProperty(this, "а"');
    const assigned = compile('синф К { а = 1; }', { useDefineForClassFields: false }).code;
    expect(assigned).toContain('this.а = 1;');
  });

  test('source maps still point at the SomonScript lines', async () => {
    const source = 'синф К {\n    #а = 1;\n}\nчоп.сабт("маркер", нав К());\n';
    const result = compile(source, { target: 'es5', sourceMap: true });
    expect(result.errors).toEqual([]);
    const lines = result.code.split('\n');
    const line = lines.findIndex(text => text.includes('"маркер"')) + 1;
    await SourceMapConsumer.with(JSON.parse(result.sourceMap!), null, consumer => {
      expect(consumer.originalPositionFor({ line, column: 0 }).line).toBe(4);
    });
  });
});

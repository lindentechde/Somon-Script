/**
 * somon migrate on rarer input: legacy `module` namespaces, `typeof` of
 * globals, labels named like globals, imports that shadow globals, side-effect
 * imports, and type arguments and type-only names for a compiler that cannot
 * read them. Each result is checked by running it where it runs.
 */
import { compile } from '../src/compiler';
import { migrate, MigrateError, setFeatureSupport } from '../src/tools/migrate';

function run(code: string): string[] {
  const result = compile(code);
  expect(result.errors).toEqual([]);
  const lines: string[] = [];
  new Function('console', result.code)({
    log: (...args: unknown[]) => lines.push(args.map(String).join(' ')),
  });
  return lines;
}

describe('migrate: rarer TypeScript', () => {
  test.each([true, false])('with type information: %s', typeInfo => {
    const convert = (source: string) => migrate(source, { typeInfo }).code;
    // `module Н {}` is a namespace
    expect(convert('module N { export const x = 1; }\nconsole.log(N.x);')).toBe(
      'номфазо N { содир собит x = 1; }\nчоп.сабт(N.x);\n'
    );
    // Globals in `typeof` types, also qualified
    expect(convert('type T = typeof Math;\nlet x: typeof Math.PI = 3;')).toBe(
      'навъ T = навъи Риёзӣ;\nтағ x: навъи Риёзӣ.PI = 3;\n'
    );
    // A side-effect import
    expect(convert('import "./side";')).toBe('ворид "./side";\n');
    // A do-while whose body starts with a global: the block opens before it
    const loop = convert('let i = 0;\ndo console.log(i++); while (i < 2);');
    expect(loop).toBe('тағ i = 0;\nкун { чоп.сабт(i++); } то (i < 2);\n');
    expect(run(loop)).toEqual(['0', '1']);
  });

  test('a label named like a global is renamed with its uses; a declared one is not', () => {
    const renamed = migrate('Math: for (;;) { console.log(1); break Math; }').code;
    expect(renamed).toBe('Риёзӣ: барои (;;) { чоп.сабт(1); шикастан Риёзӣ; }\n');
    expect(run(renamed)).toEqual(['1']);
    const declared = migrate(
      'const Math = 2;\nMath: for (;;) { console.log(Math); break Math; }'
    ).code;
    expect(declared).toBe('собит Math = 2;\nMath: барои (;;) { чоп.сабт(Math); шикастан Math; }\n');
  });

  test('without type information, imported names shadow globals', () => {
    const result = migrate(
      'import { Math } from "./m";\nimport * as Object from "./o";\nimport Error from "./e";\nconsole.log(Math.max(1, 2), Object, Error, Array.isArray([]));',
      { typeInfo: false }
    );
    expect(result.code).toBe(
      'ворид { Math } аз "./m";\nворид * чун Object аз "./o";\nворид Error аз "./e";\nчоп.сабт(Math.max(1, 2), Object, Error, рӯйхат.рӯйхатАст([]));\n'
    );
  });

  test('syntax errors without type information', () => {
    expect(() => migrate('let = ;', { typeInfo: false })).toThrow(MigrateError);
    try {
      migrate('let x = ;\nlet = 1;', { typeInfo: false });
    } catch (error) {
      expect((error as MigrateError).message).toBe('Expression expected. at line 1, column 9');
    }
  });
});

describe('migrate: for a compiler without some constructs', () => {
  afterEach(() =>
    ['typeArguments', 'memberTypeArguments', 'typeSpecifier'].forEach(feature =>
      setFeatureSupport(feature, undefined)
    )
  );

  test('type arguments: unions, qualified names and globals are kept; method calls lose theirs', () => {
    setFeatureSupport('typeArguments', false);
    setFeatureSupport('memberTypeArguments', false);
    const result = migrate(
      [
        'declare function f<T>(x: T): T;',
        'declare const o: { m<T>(x: T): T };',
        'declare namespace A { type B = number; }',
        'f<string | number>(1);',
        'f<A.B>(1);',
        'f<Promise<number>>(Promise.resolve(1));',
        'f<Error>(new Error("а"));',
        'f<Record<string, number>>({});',
        'o.m<number>(1);',
      ].join('\n')
    );
    expect(result.code).toContain(
      'f<сатр | рақам>(1);\nf<A.B>(1);\nf<Ваъда<рақам> >(Ваъда.resolve(1));\nf<Хато>(нав Хато("а"));\n'
    );
    // `сабт_навъ` starts no type argument SomonScript reads: left out, as for the method call
    expect(result.code).toContain('f({});\no.m(1);');
    expect(result.warnings.map(warning => warning.message)).toEqual([
      'explicit type arguments of this call were left out (SomonScript cannot read them)',
      'explicit type arguments of this call were left out (SomonScript cannot read them)',
    ]);
  });

  test('an optional call keeps its type arguments', () => {
    setFeatureSupport('typeArguments', false);
    expect(migrate('declare const f: any;\nf?.<number>(1);').code).toBe(
      'эълон собит f: ҳар;\nf?.<рақам>(1);\n'
    );
  });

  test('type-only names in import lists: the last one, or none', () => {
    setFeatureSupport('typeSpecifier', false);
    const last = migrate('import { a, type B } from "./m";\nconsole.log(a);');
    expect(last.code).toBe('ворид { a } аз "./m";\nчоп.сабт(a);\n');
    expect(last.warnings.map(warning => warning.message)).toEqual([
      "the type-only name 'B' was left out",
    ]);
    const none = migrate('import { a } from "./m";\nexport { a };');
    expect(none.code).toBe('ворид { a } аз "./m";\nсодир { a };\n');
    expect(none.warnings).toEqual([]);
  });
});

import * as vm from 'vm';
import { compile, CompileOptions } from '../src/compiler';
import * as path from 'path';

/**
 * Programs using the TypeScript 5 declaration syntax compile, without type
 * errors in default and strict mode, and print what TypeScript's output would.
 */

// Node.js defines `Symbol.dispose` and `Symbol.asyncDispose` (which `истифода`
// needs) in its main realm, but Jest runs tests in a `vm` context without them.
// tests/cli-ts-syntax.test.ts runs `истифода` in a real Node.js process.
const symbols = Symbol as unknown as Record<string, symbol | undefined>;
symbols.dispose ??= Symbol('Symbol.dispose');
symbols.asyncDispose ??= Symbol('Symbol.asyncDispose');

async function settle(): Promise<void> {
  for (let i = 0; i < 10; i++) {
    await new Promise(resolve => setImmediate(resolve));
  }
}

async function run(
  source: string,
  options: CompileOptions = {},
  globals: Record<string, unknown> = {}
): Promise<string[]> {
  let output: string[] | undefined;
  for (const strict of [false, true]) {
    const result = compile(source, { ...options, strict });
    expect(result.errors).toEqual([]);
    const lines: string[] = [];
    const log = (...args: unknown[]): void => {
      lines.push(args.map(String).join(' '));
    };
    const names = ['console', 'module', ...Object.keys(globals)];
    new Function(...names, result.code)({ log }, { exports: {} }, ...Object.values(globals));
    await settle();
    if (output) expect(lines).toEqual(output);
    output = lines;
  }
  return output!;
}

describe('decorators', () => {
  test('standard decorators on a class and its members', async () => {
    expect(
      await run(
        [
          'функсия сабт(қимат: ҳар, контекст: ҳар): беджавоб {',
          '    чоп.сабт(контекст.kind, контекст.name, контекст.static);',
          '}',
          'функсия зарб(н: рақам) {',
          '    бозгашт (қимат: ҳар, контекст: ҳар) => функсия (ин: ҳар, ...а: ҳар[]) {',
          '        бозгашт қимат.call(ин, ...а) * н;',
          '    };',
          '}',
          'функсия дукарата(_: беқимат, контекст: ҳар) {',
          '    бозгашт (қ: рақам) => қ * 2;',
          '}',
          '@сабт',
          'синф Ҳисоб {',
          '    @дукарата х = 21;',
          '    @сабт дастрасӣ у = 2;',
          '    @сабт статикӣ с = 3;',
          '    @сабт get г(): рақам { бозгашт 4; }',
          '    @зарб(10) ҷамъ(а: рақам, б: рақам): рақам { бозгашт а + б; }',
          '    @сабт #махфӣ() {}',
          '}',
          'собит ҳ = нав Ҳисоб();',
          'чоп.сабт(ҳ.х, ҳ.у, Ҳисоб.с, ҳ.г, ҳ.ҷамъ(1, 2));',
        ].join('\n')
      )
    ).toEqual([
      'accessor у false',
      'getter г false',
      'method #махфӣ false',
      'field с true',
      'class Ҳисоб undefined',
      '42 2 3 4 30',
    ]);
  });

  test('a class decorator may replace the class', async () => {
    expect(
      await run(
        [
          'функсия мӯҳр<Т мерос нав (...а: ҳар[]) => объект>(Синф: Т, _: ҳар): Т {',
          '    собит Асос: ҳар = Синф;',
          '    бозгашт синф мерос Асос { мӯҳр = "✓"; } чун ҳар;',
          '}',
          '@мӯҳр синф Ҳуҷҷат { ном = "ҳ"; }',
          'собит ҳ: ҳар = нав Ҳуҷҷат();',
          'чоп.сабт(ҳ.ном, ҳ.мӯҳр);',
        ].join('\n')
      )
    ).toEqual(['ҳ ✓']);
  });

  test('decorators on exported classes and class expressions', async () => {
    expect(
      await run(
        [
          'функсия ном(_: ҳар, к: ҳар) { чоп.сабт(к.name); }',
          '@ном содир синф А {}',
          'содир @ном синф Б {}',
          'собит В = @ном синф {};',
          'собит асбоб = { ном };',
          '@асбоб.ном синф Г {}',
          '@(асбоб["ном"]) синф Д {}',
        ].join('\n')
      )
    ).toEqual(['А', 'Б', 'В', 'Г', 'Д']);
  });

  test('legacy decorators, also on parameters (experimentalDecorators)', async () => {
    expect(
      await run(
        [
          'функсия тазриқ(калид: сатр) {',
          '    бозгашт (_: ҳар, метод: ҳар, ҷой: рақам) => чоп.сабт("параметр", калид, метод, ҷой);',
          '}',
          'функсия ҳисоб(прототип: ҳар, ном: сатр, тавсиф: ҳар) {',
          '    собит асл = тавсиф.value;',
          '    тавсиф.value = функсия (ин: ҳар, ...а: ҳар[]) { бозгашт асл.apply(ин, а) + 1; };',
          '}',
          'функсия синфӣ(Синф: ҳар) { чоп.сабт("синф", Синф.name); }',
          '@синфӣ',
          'синф Хизмат {',
          '    конструктор(@тазриқ("пайваст") хосусӣ пайваст: рақам) {}',
          '    @ҳисоб гир(@тазриқ("калид") к: рақам): рақам { бозгашт ин.пайваст + к; }',
          '}',
          'чоп.сабт(нав Хизмат(1).гир(2));',
        ].join('\n'),
        { experimentalDecorators: true }
      )
    ).toEqual(['параметр калид гир 0', 'параметр пайваст undefined 0', 'синф Хизмат', '4']);
  });

  test.each(['es5', 'es2015', 'esnext'] as const)('with target %s', async target => {
    expect(
      await run(
        'функсия д(_: ҳар, к: ҳар) { чоп.сабт(к.kind); }\n@д синф А { @д м(): рақам { бозгашт 1; } }\nчоп.сабт(нав А().м());',
        { target }
      )
    ).toEqual(['method', 'class', '1']);
  });
});

describe('`дастрасӣ` (accessor)', () => {
  test('auto-accessors read and write like fields', async () => {
    expect(
      await run(
        'синф Ҳисоб { дастрасӣ баланс = 10; статикӣ дастрасӣ шумора = 0; дастрасӣ #махфӣ = 1; махфӣ(): рақам { бозгашт ин.#махфӣ; } }\nсобит ҳ = нав Ҳисоб();\nҳ.баланс += 5;\nҲисоб.шумора++;\nчоп.сабт(ҳ.баланс, Ҳисоб.шумора, ҳ.махфӣ(), Object.keys(ҳ).length);'
      )
    ).toEqual(['15 1 1 0']);
  });
});

describe('`истифода` (using)', () => {
  test('resources are disposed of in reverse order when the block ends', async () => {
    expect(
      await run(
        [
          'функсия манбаъ(ном: сатр) {',
          '    чоп.сабт("кушодан", ном);',
          '    бозгашт { ном, [Symbol.dispose]() { чоп.сабт("бастан", ном); } };',
          '}',
          'функсия кор(): рақам {',
          '    истифода а = манбаъ("а");',
          '    истифода б = манбаъ("б"), в = манбаъ("в");',
          '    {',
          '        истифода г = манбаъ("г");',
          '    }',
          '    бозгашт 1;',
          '}',
          'чоп.сабт(кор());',
          'барои (истифода ҳ аз [манбаъ("1"), манбаъ("2")]) { чоп.сабт("дар", ҳ.ном); }',
          'истифода боло = манбаъ("боло");',
          'чоп.сабт("охир");',
        ].join('\n')
      )
    ).toEqual([
      'кушодан а',
      'кушодан б',
      'кушодан в',
      'кушодан г',
      'бастан г',
      'бастан в',
      'бастан б',
      'бастан а',
      '1',
      'кушодан 1',
      'кушодан 2',
      'дар 1',
      'бастан 1',
      'дар 2',
      'бастан 2',
      'кушодан боло',
      'охир',
      'бастан боло',
    ]);
  });

  test('resources are disposed of when the block throws', async () => {
    expect(
      await run(
        'функсия ф() { истифода м = { [Symbol.dispose]() { чоп.сабт("озод"); } }; партофтан нав Хато("бад"); }\nкӯшиш { ф(); } гирифтан (х) { чоп.сабт((х чун Хато).message); }'
      )
    ).toEqual(['озод', 'бад']);
  });

  test('`интизор истифода` awaits Symbol.asyncDispose', async () => {
    expect(
      await run(
        [
          'функсия пайваст(н: рақам) {',
          '    бозгашт { н, ҳамзамон [Symbol.asyncDispose]() { интизор Ваъда.resolve(); чоп.сабт("пӯшид", н); } };',
          '}',
          'ҳамзамон функсия кор() {',
          '    интизор истифода п = пайваст(1);',
          '    барои интизор (интизор истифода ҳ аз [пайваст(2)]) { чоп.сабт("ҳалқа", ҳ.н); }',
          '    чоп.сабт("кор", п.н);',
          '}',
          'кор().then(() => чоп.сабт("тамом"));',
        ].join('\n')
      )
    ).toEqual(['ҳалқа 2', 'пӯшид 2', 'кор 1', 'пӯшид 1', 'тамом']);
  });
});

describe('`эълон` (declare)', () => {
  test('declared names are those the host provides', async () => {
    expect(
      await run(
        [
          'эълон собит ВЕРСИЯ: сатр;',
          'эълон функсия форматКун(н: рақам): сатр;',
          'эълон синф Ҳисобгар { конструктор(аввал: рақам); зам(н: рақам): ин; қимат: рақам; }',
          'эълон номфазо Асбоб { функсия ном(): сатр; }',
          'эълон глобалӣ { собит МУҲИТ: сатр; }',
          'собит ҳ = нав Ҳисобгар(1).зам(2);',
          'чоп.сабт(ВЕРСИЯ, форматКун(ҳ.қимат), Асбоб.ном(), МУҲИТ);',
        ].join('\n'),
        {},
        {
          ВЕРСИЯ: '1.0',
          форматКун: (н: number) => `#${н}`,
          Ҳисобгар: class {
            қимат: number;
            constructor(аввал: number) {
              this.қимат = аввал;
            }
            зам(н: number) {
              this.қимат += н;
              return this;
            }
          },
          Асбоб: { ном: () => 'асбоб' },
          МУҲИТ: 'санҷиш',
        }
      )
    ).toEqual(['1.0 #3 асбоб санҷиш']);
  });

  test('`эълон модул "ном"` types what a module exports', async () => {
    expect(
      await run(
        'эълон модул "path" { содир функсия basename(п: сатр): сатр; содир собит sep: сатр; }\nворид { basename } аз "path";\nворид путь = require("path");\nчоп.сабт(basename("/а/б.txt"), путь.sep);',
        {},
        { require }
      )
    ).toEqual([`б.txt ${path.sep}`]);
  });

  test('`эълон` fields are not emitted', async () => {
    expect(
      await run(
        'синф Асос { конструктор() { ин.х = 1; } х: рақам; }\nсинф Д мерос Асос { эълон х: рақам; }\nчоп.сабт(нав Д().х);'
      )
    ).toEqual(['1']);
  });
});

describe('`бознавис` (override)', () => {
  test('overriding members behave as without it', async () => {
    expect(
      await run(
        'синф А { ном(): сатр { бозгашт "А"; } статикӣ н = 1; }\nсинф Б мерос А { бознавис ном(): сатр { бозгашт "Б" + супер.ном(); } статикӣ бознавис н = 2; }\nчоп.сабт(нав Б().ном(), Б.н);'
      )
    ).toEqual(['БА 2']);
  });
});

describe('type-only imports, export =, import = require', () => {
  test('a type-only import loads nothing', async () => {
    const loaded: string[] = [];
    expect(
      await run(
        'ворид навъ { Нуқта } аз "./нуқта";\nворид { навъ Ранг, ранг } аз "./ранг";\nсобит н: Нуқта = { х: 1 };\nчоп.сабт(н.х, ранг);',
        {},
        {
          require: (specifier: string) => {
            loaded.push(specifier);
            return { ранг: 'сурх' };
          },
        }
      )
    ).toEqual(['1 сурх']);
    expect(loaded).toEqual(['./ранг.js', './ранг.js']);
  });

  test('`содир = …` replaces the module exports', () => {
    const result = compile('синф Ҳисоб { қимат = 7; }\nсодир = Ҳисоб;');
    expect(result.errors).toEqual([]);
    const module = { exports: {} as unknown };
    new Function('module', result.code)(module);
    expect(new (module.exports as new () => { қимат: number })().қимат).toBe(7);
  });
});

describe('shebang', () => {
  test('a program with a shebang runs', () => {
    const result = compile('#!/usr/bin/env node\nчоп.сабт("салом");', { strict: true });
    expect(result.errors).toEqual([]);
    const lines: string[] = [];
    vm.runInNewContext(result.code, { console: { log: (line: string) => lines.push(line) } });
    expect(lines).toEqual(['салом']);
  });
});

describe('overloads, `ин` parameters and type parameter modifiers', () => {
  test('an overloaded function, method and constructor', async () => {
    expect(
      await run(
        [
          'функсия дубора(х: рақам): рақам;',
          'функсия дубора(х: сатр): сатр;',
          'функсия дубора(х: ҳар): ҳар { бозгашт х + х; }',
          'синф Нуқта {',
          '    х: рақам;',
          '    конструктор(х: рақам);',
          '    конструктор(х: сатр);',
          '    конструктор(х: ҳар) { ин.х = Number(х); }',
          '    илова(н: рақам): Нуқта;',
          '    илова(н: Нуқта): Нуқта;',
          '    илова(н: ҳар): Нуқта { бозгашт нав Нуқта(ин.х + (навъи н === "number" ? н : н.х)); }',
          '}',
          'тағ а: рақам = дубора(2);',
          'тағ б: сатр = дубора("ҳа");',
          'чоп.сабт(а, б, нав Нуқта("1").илова(2).илова(нав Нуқта(3)).х);',
        ].join('\n')
      )
    ).toEqual(['4 ҳаҳа 6']);
  });

  test('`ин` parameters type the receiver', async () => {
    expect(
      await run(
        'интерфейс Ҳисоб { баланс: рақам; }\nфунксия илова(ин: Ҳисоб, маблағ: рақам): рақам { ин.баланс += маблағ; бозгашт ин.баланс; }\nсобит ҳ = { баланс: 1, илова };\nчоп.сабт(ҳ.илова(2), илова.call({ баланс: 10 }, 5));'
      )
    ).toEqual(['3 15']);
  });

  test('const and variance type parameters are erased', async () => {
    expect(
      await run(
        'функсия ҳамон<собит Т>(х: Т): Т { бозгашт х; }\nинтерфейс Истеҳсолгар<берун Т> { гир(): Т; }\nинтерфейс Истеъмолгар<дар Т> { дод(х: Т): беджавоб; }\nсинф Қуттӣ<дар берун Т> { конструктор(ҷамъиятӣ қимат: Т) {} }\nсобит и: Истеҳсолгар<рақам> = { гир: () => 1 };\nчоп.сабт(ҳамон(["а"]).length, и.гир(), нав Қуттӣ(2).қимат);'
      )
    ).toEqual(['1 1 2']);
  });
});

describe('declaration merging', () => {
  test('namespaces, enums, classes and functions with namespaces', async () => {
    expect(
      await run(
        [
          'номфазо Асбоб { содир собит ном = "асбоб"; }',
          'номфазо Асбоб { содир функсия салом(): сатр { бозгашт "салом, " + ном; } }',
          'шумориш Ранг { Сурх, Сабз }',
          'шумориш Ранг { Кабуд = 5 }',
          'номфазо Ранг { содир функсия аст(н: сатр): мантиқӣ { бозгашт н дар Ранг; } }',
          'синф Нуқта { конструктор(ҷамъиятӣ х: рақам) {} }',
          'номфазо Нуқта { содир собит сифр = нав Нуқта(0); }',
          'функсия ҳисоб(): рақам { бозгашт ҳисоб.қадам * 2; }',
          'номфазо ҳисоб { содир тағ қадам = 3; }',
          'чоп.сабт(Асбоб.салом(), Ранг.Сабз, Ранг.Кабуд, Ранг[5], Ранг.аст("Сурх"), Нуқта.сифр.х, ҳисоб());',
        ].join('\n')
      )
    ).toEqual(['салом, асбоб 1 5 Кабуд true 0 6']);
  });

  test('interfaces of one name merge', async () => {
    expect(
      await run(
        'интерфейс Корбар { ном: сатр; }\nинтерфейс Корбар { синну: рақам; }\nсобит к: Корбар = { ном: "Алӣ", синну: 30 };\nчоп.сабт(к.ном, к.синну);'
      )
    ).toEqual(['Алӣ 30']);
  });
});

describe('class and type members', () => {
  test('index signatures, computed names and unique symbol keys', async () => {
    expect(
      await run(
        [
          'собит калид: беназир рамз = Symbol("калид");',
          'интерфейс Нишон { [калид]: рақам; ном: сатр; }',
          'синф Луғат {',
          '    [номи: сатр]: ҳар;',
          '    [калид] = 1;',
          '    статикӣ ["бо фосила"] = 2;',
          '    *[Symbol.iterator]() { ҳосил 3; ҳосил 4; }',
          '}',
          'собит л = нав Луғат();',
          'л["а"] = 5;',
          'собит н: Нишон = { [калид]: 6, ном: "н" };',
          'чоп.сабт(л[калид], Луғат["бо фосила"], [...л].join(","), л.а, н[калид]);',
        ].join('\n')
      )
    ).toEqual(['1 2 3,4 5 6']);
  });

  test('abstract members, optional methods, get/set signatures', async () => {
    expect(
      await run(
        [
          'мавҳум синф Шакл {',
          '    мавҳум ном: сатр;',
          '    мавҳум get масоҳат(): рақам;',
          '    тасвир?(): сатр;',
          '    тавсиф(): сатр { бозгашт `${ин.ном}: ${ин.масоҳат}${ин.тасвир?.() ?? ""}`; }',
          '}',
          'синф Мураббаъ мерос Шакл {',
          '    ном = "мураббаъ";',
          '    конструктор(хосусӣ тараф: рақам) { супер(); }',
          '    get масоҳат(): рақам { бозгашт ин.тараф ** 2; }',
          '}',
          'интерфейс Ҳарорат { get целсий(): рақам; set целсий(қ: рақам); }',
          'собит ҳ: Ҳарорат = { целсий: 20 };',
          'ҳ.целсий = 25;',
          'чоп.сабт(нав Мураббаъ(3).тавсиф(), ҳ.целсий);',
        ].join('\n')
      )
    ).toEqual(['мураббаъ: 9 25']);
  });

  test('`тасдиқ ин`, `ин аст Т` and getters returning `ин`', async () => {
    expect(
      await run(
        [
          'синф Гиреҳ {',
          '    қимат: рақам | холӣ = холӣ;',
          '    пур(): ин аст { қимат: рақам } { бозгашт ин.қимат !== холӣ; }',
          '    тасдиқиПур(): тасдиқ ин аст { қимат: рақам } {',
          '        агар (ин.қимат === холӣ) партофтан нав Хато("холӣ");',
          '    }',
          '    get худ(): ин { бозгашт ин; }',
          '}',
          'собит г = нав Гиреҳ();',
          'г.қимат = 2;',
          'агар (г.пур()) { чоп.сабт(г.худ.худ.қимат + 1); }',
          'г.тасдиқиПур();',
          'чоп.сабт(г.қимат * 2);',
        ].join('\n')
      )
    ).toEqual(['3', '4']);
  });
});

describe('contextual keywords stay usable as names', () => {
  test('in declarations, members, parameters and labels', async () => {
    expect(
      await run(
        [
          'тағ эълон = 1, истифода = 2, модул = 3, глобалӣ = 4, бознавис = 5, дастрасӣ = 6;',
          'синф К { бознавис() { бозгашт 7; } эълон = 8; дастрасӣ: рақам = 9; истифода() { бозгашт 10; } }',
          'функсия ф(истифода: рақам, эълон: рақам): рақам { бозгашт истифода + эълон; }',
          'собит о = { эълон: 1, истифода: 2, бознавис: 3, дастрасӣ: 4, модул: 5, глобалӣ: 6 };',
          'собит к = нав К();',
          'берун: барои (собит х аз [1, 2]) { шикастан берун; }',
          'истифода = ф(истифода, эълон);',
          'чоп.сабт(эълон + истифода + модул + глобалӣ + бознавис + дастрасӣ, к.бознавис(), к.эълон, к.дастрасӣ, к.истифода(), о.модул + о.глобалӣ);',
        ].join('\n')
      )
    ).toEqual(['22 7 8 9 10 11']);
  });

  test('type parameters named `берун` and imports named `type`', async () => {
    expect(
      await run(
        'функсия ф<берун>(х: берун): берун { бозгашт х; }\nинтерфейс И<берун мерос рақам> { а: берун; }\nсобит и: И<рақам> = { а: 2 };\nчоп.сабт(ф(1), и.а);'
      )
    ).toEqual(['1 2']);
  });
});

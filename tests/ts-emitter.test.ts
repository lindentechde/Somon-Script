/**
 * The TypeScript emitter: every construct keeps its types, values and member
 * names match the JavaScript output, and positions map back to the source.
 */
import ts from 'typescript';
import { CodeGenerator } from '../src/codegen';
import { compile } from '../src/compiler';
import { Lexer } from '../src/lexer';
import { Parser } from '../src/parser';
import { originalPosition, TsEmitter, TYPE_NAMES } from '../src/ts-emitter';

function parse(source: string) {
  const parser = new Parser(new Lexer(source).tokenize());
  const ast = parser.parse();
  expect(parser.getErrors()).toEqual([]);
  return ast;
}

/** Emitted TypeScript; it must have no syntax errors. */
function emit(source: string, experimentalDecorators = false): string {
  const emitter = new TsEmitter({ experimentalDecorators });
  const code = emitter.generate(parse(source));
  expect(emitter.getErrors()).toEqual([]);
  const { diagnostics } = ts.transpileModule(code, {
    reportDiagnostics: true,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.Preserve,
      experimentalDecorators,
    },
  });
  expect((diagnostics ?? []).map(d => ts.flattenDiagnosticMessageText(d.messageText, ' '))).toEqual(
    []
  );
  return code;
}

describe('TypeScript emitter: declarations', () => {
  test.each([
    ['тағ х: рақам = 1;', 'let х: number = 1;'],
    ['собит х: сатр = "а";', 'const х: string = "а";'],
    ['тағ х!: мантиқӣ;', 'let х!: boolean;'],
    ['тағ а: рақам = 1, б: сатр = "";', 'let а: number = 1, б: string = "";'],
    ['тағ [а, б]: рақам[] = [1, 2];', 'let [а, б]: number[] = [1, 2];'],
    ['тағ { а }: { а: рақам } = { а: 1 };', 'let {а}: { а: number } = {а: 1};'],
  ])('%s', (source, expected) => {
    expect(emit(source)).toBe(expected);
  });

  test('every built-in type name', () => {
    const names = [
      ['рақам', 'number'],
      ['сатр', 'string'],
      ['мантиқӣ', 'boolean'],
      ['ҳар', 'any'],
      ['ношинос', 'unknown'],
      ['абадан', 'never'],
      ['беджавоб', 'void'],
      ['холӣ', 'null'],
      ['беқимат', 'undefined'],
      ['объект', 'object'],
      ['калонрақам', 'bigint'],
      ['рамз', 'symbol'],
    ];
    for (const [tajik, english] of names) {
      expect(emit(`навъ Т = ${tajik};`)).toBe(`type Т = ${english};`);
    }
  });

  test.each([
    ['Ваъда<рақам>', 'Promise<number>'],
    ['қисмӣ<И>', 'Partial<И>'],
    ['ҳатмӣ<И>', 'Required<И>'],
    ['танҳохон<И>', 'Readonly<И>'],
    ['сабт_навъ<сатр, рақам>', 'Record<string, number>'],
    ['гирифтан_навъ<И, "а">', 'Pick<И, "а">'],
    ['ҳазф<И, "а">', 'Omit<И, "а">'],
    ['хориҷ<сатр | рақам, рақам>', 'Exclude<string | number, number>'],
    ['истихроҷ<сатр | рақам, рақам>', 'Extract<string | number, number>'],
    ['беналиӣ<сатр | холӣ>', 'NonNullable<string | null>'],
    ['навъи_бозгашт<Ф>', 'ReturnType<Ф>'],
    ['параметрҳо<Ф>', 'Parameters<Ф>'],
    ['навъи_намуна<К>', 'InstanceType<К>'],
    ['параметрҳои_конструктор<К>', 'ConstructorParameters<К>'],
    ['навъи_параметри_ин<Ф>', 'ThisParameterType<Ф>'],
    ['интизоршуда<Ваъда<рақам>>', 'Awaited<Promise<number>>'],
    ['рӯйхат<рақам>', 'Array<number>'],
    ['Хато', 'Error'],
    ['функсия', 'Function'],
    ['Map<сатр, рақам[]>', 'Map<string, number[]>'],
    ['Н.Т', 'Н.Т'],
    ['Н.дарозӣ', 'Н.length'],
  ])('type %s', (type, expected) => {
    expect(emit(`навъ Т = ${type};`)).toBe(`type Т = ${expected};`);
  });

  test('every Tajik utility type name has a TypeScript name', () => {
    expect(TYPE_NAMES.get('интизоршуда')).toBe('Awaited');
    expect(TYPE_NAMES.size).toBeGreaterThanOrEqual(30);
  });

  test('a declared type shadows a built-in Tajik name', () => {
    expect(emit('интерфейс Хато { код: рақам; }\nтағ х: Хато;')).toContain('let х: Хато;');
  });

  test.each([
    ['(рақам | сатр)[]', '(number | string)[]'],
    ['(() => беджавоб) | холӣ', '(() => void) | null'],
    ['калидҳои И', 'keyof И'],
    ['(калидҳои И)[]', '(keyof И)[]'],
    ['И["а"]', 'И["а"]'],
    ['И[калидҳои И]', 'И[keyof И]'],
    ['А & (Б | В)', 'А & (Б | В)'],
    ['[рақам, сатр?, ...мантиқӣ[]]', '[number, string?, ...boolean[]]'],
    ['[х: рақам, у?: рақам]', '[х: number, у?: number]'],
    ['танҳохонӣ рақам[]', 'readonly number[]'],
    ['беназир рамз', 'unique symbol'],
    ['"а" | 1 | дуруст | нодуруст', '"а" | 1 | true | false'],
    [
      '(а: рақам, б?: сатр, ...в: рақам[]) => мантиқӣ',
      '(а: number, б?: string, ...в: number[]) => boolean',
    ],
    ['нав (а: рақам) => объект', 'new (а: number) => object'],
    ['мавҳум нав () => объект', 'abstract new () => object'],
    [
      '{ а: рақам; б?: сатр; танҳохонӣ в: мантиқӣ; м(х: рақам): беджавоб }',
      '{ а: number; б?: string; readonly в: boolean; м(х: number): void }',
    ],
    ['{}', '{}'],
    ['{ [к: сатр]: рақам }', '{ [к: string]: number }'],
    ['навъи х', 'typeof х'],
    ['навъи Риёзӣ', 'typeof Math'],
    ['навъи о.дарозӣ', 'typeof о.length'],
    ['калидҳои навъи о', 'keyof typeof о'],
    ['typeof х', 'typeof х'],
    ['`а${рақам}б`', '`а${number}б`'],
  ])('type %s', (type, expected) => {
    expect(emit(`навъ Т = ${type};`)).toBe(`type Т = ${expected};`);
  });

  test('conditional and infer types', () => {
    expect(emit('навъ Т<У> = У мерос Ваъда<инфер В> ? В : У;')).toBe(
      'type Т<У> = У extends Promise<infer В> ? В : У;'
    );
    expect(emit('навъ Т<У> = У мерос (() => инфер Р) ? Р : абадан;')).toBe(
      'type Т<У> = У extends (() => infer Р) ? Р : never;'
    );
    expect(emit('навъ Т<У> = (У мерос сатр ? 1 : 2) мерос 1 ? "а" : "б";')).toBe(
      'type Т<У> = (У extends string ? 1 : 2) extends 1 ? "а" : "б";'
    );
    expect(emit('навъ Т<У> = У мерос [infer А, ...infer Б] ? А : абадан;')).toBe(
      'type Т<У> = У extends [infer А, ...infer Б] ? А : never;'
    );
  });

  test('mapped types with modifiers and key remapping', () => {
    expect(emit('навъ М<Т> = { [К дар калидҳои Т]?: Т[К] };')).toBe(
      'type М<Т> = { [К in keyof Т]?: Т[К] };'
    );
    expect(emit('навъ М<Т> = { -танҳохонӣ [К дар калидҳои Т]-?: Т[К] };')).toBe(
      'type М<Т> = { -readonly [К in keyof Т]-?: Т[К] };'
    );
    expect(emit('навъ М<Т> = { +танҳохонӣ [К дар калидҳои Т]+?: Т[К] };')).toBe(
      'type М<Т> = { +readonly [К in keyof Т]+?: Т[К] };'
    );
    expect(emit('навъ М<Т> = { танҳохонӣ [К дар калидҳои Т]: Т[К] };')).toBe(
      'type М<Т> = { readonly [К in keyof Т]: Т[К] };'
    );
    expect(emit('навъ Г<Т> = { [К дар калидҳои Т чун `гир_${К & сатр}`]: () => Т[К] };')).toBe(
      'type Г<Т> = { [К in keyof Т as `гир_${К & string}`]: () => Т[К] };'
    );
  });

  test('type predicates and assertion signatures', () => {
    expect(emit('функсия ф(х: ношинос): х аст сатр { бозгашт дуруст; }')).toContain(
      'function ф(х: unknown): х is string {'
    );
    expect(emit('функсия ф(х: ношинос): тасдиқ х {}')).toContain(
      'function ф(х: unknown): asserts х {}'
    );
    expect(emit('функсия ф(х: ношинос): тасдиқ х аст рақам {}')).toContain('asserts х is number');
    expect(emit('синф К { аст(): ин аст К { бозгашт дуруст; } }').replace(/\s+/g, ' ')).toContain(
      'is(): this is К {'
    );
  });

  test('interfaces', () => {
    expect(
      emit(
        'интерфейс И<Т мерос объект = {}> мерос А, Б<Т> {\n' +
          '  [калид: сатр]: ҳар;\n' +
          '  танҳохонӣ дарозӣ: рақам;\n' +
          '  ном?: сатр;\n' +
          '  м?<У>(х: У, ...р: рақам[]): беджавоб;\n' +
          '  ф: (а: рақам) => сатр;\n' +
          '  [Symbol.iterator]: ҳар;\n' +
          '}'
      )
    ).toBe(
      'interface И<Т extends object = {}> extends А, Б<Т> {\n' +
        '  [калид: string]: any;\n' +
        '  readonly length: number;\n' +
        '  ном?: string;\n' +
        '  м?<У>(х: У, ...р: number[]): void;\n' +
        '  ф: (а: number) => string;\n' +
        '  [Symbol.iterator]: any;\n' +
        '}'
    );
    expect(emit('интерфейс Холӣ {}')).toBe('interface Холӣ {}');
  });

  test('enums and const enums keep JavaScript member names', () => {
    expect(emit('шумориш Ранг { Сурх, Сабз = 5, "номи дароз" = 7, дарозӣ = 8 }')).toBe(
      'enum Ранг {\n  Сурх,\n  Сабз = 5,\n  "номи дароз" = 7,\n  length = 8,\n}'
    );
    expect(emit('собит шумориш Р { А = 1 << 2, Б = А | 1 }')).toBe(
      'const enum Р {\n  А = 1 << 2,\n  Б = А | 1,\n}'
    );
    expect(emit('шумориш Э {}')).toBe('enum Э {}');
  });

  test('namespaces export their members, under JavaScript names where they differ', () => {
    const code = emit(
      'номфазо Н {\n' +
        '  содир функсия ф(): рақам { бозгашт 1; }\n' +
        '  содир собит сабт = 2;\n' +
        '  содир интерфейс И { а: рақам; }\n' +
        '  содир навъ дар = сатр;\n' +
        '  содир синф хато<Т> { қ?: Т; }\n' +
        '  содир шумориш калон { А }\n' +
        '  содир номфазо Дарунӣ { содир тағ х = 1; }\n' +
        '  функсия ғ() {}\n' +
        '  ғ();\n' +
        '}'
    );
    expect(code).toContain('namespace Н {');
    expect(code).toContain('  export function ф(): number {');
    expect(code).toContain('  const сабт = 2;\n  export const log = сабт;');
    expect(code).toContain('  export interface И {');
    expect(code).toContain('  type дар = string;\n  export type at = дар;');
    expect(code).toContain('  export const error = хато;\n  export type error<Т> = хато<Т>;');
    expect(code).toContain('  export import toUpperCase = калон;');
    expect(code).toContain('  export namespace Дарунӣ {\n    export let х = 1;\n  }');
    expect(code).toContain('  function ғ() {}\n  ғ();');
    expect(emit('номфазо Холӣ {}')).toBe('namespace Холӣ {}');
  });

  test('a namespace declaration that binds a built-in member name and another name', () => {
    // `х` is exported as it is; `илова` also as `push`, the name `Н.илова` is read by
    expect(emit('номфазо Н {\n  содир собит илова = 1, х = 2;\n}')).toBe(
      'namespace Н {\n  export const илова = 1, х = 2;\n  export const push = илова;\n}'
    );
    // The TypeScript checker sees both members
    expect(
      compile('номфазо Н { содир собит илова = 1, х = 2; }\nчоп.сабт(Н.х, Н.илова);', {
        checker: 'typescript',
      }).errors
    ).toEqual([]);
  });

  test('functions keep type parameters, parameter types and return types', () => {
    expect(
      emit(
        'функсия ф<Т мерос { дарозӣ: рақам } = сатр>(а: Т, б?: рақам, ...в: мантиқӣ[]): Т { бозгашт а; }'
      )
    ).toBe(
      'function ф<Т extends { length: number } = string>(а: Т, б?: number, ...в: boolean[]): Т {\n  return а;\n}'
    );
    expect(emit('ҳамзамон функсия* г(): AsyncGenerator<рақам> { ҳосил 1; }')).toBe(
      'async function* г(): AsyncGenerator<number> {\n  yield 1;\n}'
    );
    expect(emit('функсия ф({ а, б }: { а: рақам; б: рақам }, [в]: рақам[] = [1]) {}')).toBe(
      'function ф({а, б}: { а: number; б: number }, [в]: number[] = [1]) {}'
    );
  });

  test('arrow functions and function expressions', () => {
    expect(emit('тағ ф = ҳамзамон <Т>(х: Т): Ваъда<Т> => х;')).toBe(
      'let ф = async <Т>(х: Т): Promise<Т> => х;'
    );
    expect(emit('тағ ф = (х: рақам): рақам => { бозгашт х; };')).toBe(
      'let ф = (х: number): number => {\n  return х;\n};'
    );
    expect(emit('тағ ф = функсия <Т>(х: Т): Т { бозгашт х; };')).toBe(
      'let ф = function<Т>(х: Т): Т {\n  return х;\n};'
    );
    expect(emit('тағ о = { м<Т>(х: Т): Т { бозгашт х; }, get а(): рақам { бозгашт 1; } };')).toBe(
      'let о = {м<Т>(х: Т): Т {\n  return х;\n}, get а(): number {\n  return 1;\n}};'
    );
  });
});

describe('TypeScript emitter: classes', () => {
  test('modifiers, fields, accessors and abstract members', () => {
    const code = emit(
      'мавҳум синф Шакл<Т> мерос Асос<Т> татбиқ И<сатр>, Ҷ {\n' +
        '  хосусӣ танҳохонӣ ном: сатр = "";\n' +
        '  статикӣ шумора?: рақам;\n' +
        '  ҳаҷм!: рақам;\n' +
        '  #пинҳон = 1;\n' +
        '  конструктор() { супер(); }\n' +
        '  мавҳум масоҳат(): рақам;\n' +
        '  ҷамъиятӣ мавҳум get андоза(): рақам;\n' +
        '  ҷамъиятӣ get тул(): рақам { бозгашт 1; }\n' +
        '  set тул(қ: рақам) {}\n' +
        '  хосусӣ ҳамзамон *г<У>(х: У): AsyncGenerator<У> { ҳосил х; }\n' +
        '  статикӣ { Шакл.шумора = 0; }\n' +
        '}'
    );
    expect(code).toBe(
      'abstract class Шакл<Т> extends Асос<Т> implements И<string>, Ҷ {\n' +
        '  private readonly ном: string = "";\n' +
        '  static шумора?: number;\n' +
        '  size!: number;\n' +
        '  #пинҳон = 1;\n' +
        '  constructor() {\n' +
        '    super();\n' +
        '  }\n' +
        '  abstract масоҳат(): number;\n' +
        '  public abstract get андоза(): number;\n' +
        '  public get тул(): number {\n' +
        '    return 1;\n' +
        '  }\n' +
        '  set тул(қ: number) {}\n' +
        '  private async *г<У>(х: У): AsyncGenerator<У> {\n' +
        '    yield х;\n' +
        '  }\n' +
        '  static {\n' +
        '    Шакл.шумора = 0;\n' +
        '  }\n' +
        '}'
    );
  });

  test('typed parameter properties are declared and assigned as in JavaScript', () => {
    expect(
      emit(
        'синф А мерос Б { у = 1; конструктор(хосусӣ танҳохонӣ х: рақам, ҷамъиятӣ з = 2) { супер(); } }'
      )
    ).toBe(
      'class А extends Б {\n' +
        '  private declare readonly х: number;\n' +
        '  у = 1;\n' +
        '  constructor(х: number, public з = 2) {\n' +
        '    super();\n' +
        '    this.х = х;\n' +
        '  }\n' +
        '}'
    );
  });

  test('an optional typed parameter property declares an optional field', () => {
    // Found by tests/differential.test.ts: `secret: string` rejected `this.secret = secret`
    expect(emit('синф А { конструктор(хосусӣ х?: сатр) {} }')).toBe(
      'class А {\n' +
        '  private declare х?: string;\n' +
        '  constructor(х?: string) {\n' +
        '    this.х = х;\n' +
        '  }\n' +
        '}'
    );
  });

  test('class expressions and exported abstract classes', () => {
    expect(emit('тағ К = синф<Т> мерос Б<Т> { х?: Т; };')).toBe(
      'let К = class<Т> extends Б<Т> {\n  х?: Т;\n};'
    );
    expect(emit('содир мавҳум синф А {}')).toBe('export abstract class А {}');
    expect(emit('содир пешфарз мавҳум синф А {}')).toBe('export default abstract class А {}');
  });
});

describe('TypeScript emitter: expressions', () => {
  test.each([
    ['тағ а = х чун ҳар;', 'let а = (х as any);'],
    ['тағ а = (б + в) чун рақам;', 'let а = (б + в as number);'],
    ['тағ а = (б ?? в) чун рақам;', 'let а = ((б ?? в) as number);'],
    ['тағ а = б < в чун мантиқӣ;', 'let а = ((б < в) as boolean);'],
    ['тағ а = <рақам>у;', 'let а = (<number>у);'],
    ['тағ а = <собит>["а"];', 'let а = (<const>["а"]);'],
    ['тағ а = з бармесоё сабт_навъ<сатр, рақам>;', 'let а = (з satisfies Record<string, number>);'],
    ['тағ а = [1, 2] чун собит;', 'let а = ([1, 2] as const);'],
    ['тағ а = е!.ж!;', 'let а = е!.ж!;'],
    ['тағ а = ф!(1);', 'let а = ф!(1);'],
    ['(х чун ҳар).у = 1;', '(х as any).у = 1;'],
    ['тағ а = м<рақам>(1);', 'let а = м<number>(1);'],
    ['тағ а = нав Map<сатр, рақам[]>();', 'let а = new Map<string, number[]>();'],
    ['тағ а = чоп.сабт;', 'let а = console.log;'],
    ['тағ а = о.дарозӣ + рӯйхат.аз([1]).дарозӣ;', 'let а = о.length + Array.from([1]).length;'],
    ['тағ а = беқимат;', 'let а = undefined;'],
    ['тағ а = нав Хато("х");', 'let а = new Error("х");'],
    ['нишондиҳӣ(1);', 'console.log(1);'],
    ['тағ а = ворид.meta.url;', 'let а = import.meta.url;'],
    ['тағ а = интизор ворид("./м");', 'let а = await import("./м.js");'],
  ])('%s', (source, expected) => {
    expect(emit(source)).toBe(expected);
  });

  test('values match the JavaScript output', () => {
    const source =
      'собит р = [3, 1, 2];\nр.илова(4);\nчоп.сабт(р.тартиб().пайвастКардан(", "), Риёзӣ.ҳаддиАксар(...р));';
    expect(emit(source)).toBe(
      'const р = [3, 1, 2];\nр.push(4);\nconsole.log(р.sort().join(", "), Math.max(...р));'
    );
  });

  test('comparisons that TypeScript would read as type arguments are parenthesized', () => {
    // Found by tests/fuzz.test.ts: TypeScript reads `а < б > (в, г)` as the call `а<б>(в, г)`
    expect(emit('(а < б) > (в, г);')).toBe('(а < б) > (в, г);');
    expect(emit('ф((а < б), в > (г));')).toBe('ф((а < б), в > г);');
    expect(emit('[(а << б), в > `т`];')).toBe('[(а << б), в > `т`];');
    expect(emit('тағ х = ((а < б), в > (г));')).toBe('let х = ((а < б), в > г);');
    expect(emit('ф(а, б < в);')).toBe('ф(а, б < в);');
    // JavaScript has no type arguments
    const javascript = new CodeGenerator().generate(parse('ф((а < б), в > (г));'));
    expect(javascript).toBe('ф(а < б, в > г);');
  });
});

describe('TypeScript emitter: modules', () => {
  test('imports keep every binding, with .som resolution', () => {
    expect(emit('ворид а, { б чун в, илова, И } аз "./м";')).toBe(
      'import а, { б as в, push as илова, И } from "./м.js";'
    );
    expect(emit('ворид * чун Н аз "./н.som";')).toBe('import * as Н from "./н.js";');
    expect(emit('ворид а, * чун Н аз "./н";')).toBe('import а, * as Н from "./н.js";');
    expect(emit('ворид "./м";')).toBe('import "./м.js";');
    expect(emit('ворид fs аз "fs";')).toBe('import fs from "fs";');
  });

  test('exports', () => {
    expect(emit('содир функсия ф(): рақам { бозгашт 1; }')).toBe(
      'export function ф(): number {\n  return 1;\n}'
    );
    expect(emit('содир функсия илова() {}')).toBe('function илова() {}\nexport { илова as push };');
    expect(emit('содир интерфейс И {}')).toBe('export interface И {}');
    expect(emit('содир интерфейс сабт {}')).toBe('interface сабт {}\nexport { сабт as log };');
    expect(emit('содир навъ Т = рақам;')).toBe('export type Т = number;');
    expect(emit('содир пешфарз интерфейс И {}')).toBe('export default interface И {}');
    expect(emit('содир пешфарз синф К {}')).toBe('export default class К {}');
    expect(emit('содир пешфарз 5;')).toBe('export default 5;');
    expect(emit('содир шумориш Р { А }')).toBe('export enum Р {\n  А,\n}');
    expect(emit('содир номфазо Н {}')).toBe('export namespace Н {}');
    expect(emit('тағ а = 1;\nинтерфейс И {}\nсодир { а, И, а чун дарозӣ };')).toBe(
      'let а = 1;\ninterface И {}\nexport { а, И, а as length };'
    );
    expect(emit('содир { а чун б } аз "./м";')).toBe('export { а as б } from "./м.js";');
    expect(emit('содир * аз "./м";')).toBe('export * from "./м.js";');
    expect(emit('содир * чун Н аз "./м";')).toBe('export * as Н from "./м.js";');
  });

  test('top-level await is allowed', () => {
    expect(emit('интизор ф();\nбарои интизор (собит х аз у) {}')).toBe(
      'await ф();\nfor await (const х of у) {}'
    );
  });
});

describe('TypeScript emitter: the TypeScript 5 declaration syntax', () => {
  test('ambient declarations: `declare` on the outermost one only', () => {
    expect(
      emit(
        [
          'эълон собит ВЕРСИЯ: сатр;',
          'эълон тағ а: рақам, б: сатр;',
          'эълон функсия логи(паём: сатр): беджавоб;',
          'эълон синф Пайваст {',
          '    конструктор(url: сатр);',
          '    фиристодан(маълумот: сатр): Ваъда<беджавоб>;',
          '    get ҳолат(): рақам;',
          '    х: рақам;',
          '}',
          'эълон собит шумориш Ранг { Сурх, Сабз }',
          'эълон номфазо Танзимот {',
          '    функсия гирифтан(калид: сатр): сатр;',
          '    содир собит ном: сатр;',
          '}',
          'содир эълон функсия ҳисоб(): рақам;',
        ].join('\n')
      )
    ).toBe(
      [
        'declare const ВЕРСИЯ: string;',
        'declare let а: number, б: string;',
        'declare function логи(паём: string): void;',
        'declare class Пайваст {',
        '  constructor(url: string);',
        '  фиристодан(маълумот: string): Promise<void>;',
        '  get ҳолат(): number;',
        '  х: number;',
        '}',
        'declare const enum Ранг {',
        '  Сурх,',
        '  Сабз,',
        '}',
        'declare namespace Танзимот {',
        '  function гирифтан(калид: string): string;',
        '  export const ном: string;',
        '}',
        'export declare function ҳисоб(): number;',
      ].join('\n')
    );
  });

  test('a declared member named like a built-in member is exported as its JavaScript name', () => {
    expect(emit('эълон номфазо Н { содир функсия илова(): беджавоб; }')).toBe(
      'declare namespace Н {\n  function илова(): void;\n  export const push: typeof илова;\n}'
    );
    expect(emit('содир эълон функсия илова(): беджавоб;')).toBe(
      'declare function илова(): void;\nexport { илова as push };'
    );
  });

  test('ambient modules and global declarations', () => {
    const source =
      'эълон модул "китобхона" {\n    содир функсия ҳисоб(а: рақам): рақам;\n    содир = ҳисоб;\n}\n' +
      'эълон глобалӣ {\n    интерфейс Window { барнома?: сатр; }\n}';
    expect(emit(source)).toBe(
      [
        'declare module "китобхона" {',
        '  export function ҳисоб(а: number): number;',
        '  export = ҳисоб;',
        '}',
        'declare global {',
        '  interface Window {',
        '    барнома?: string;',
        '  }',
        '}',
      ].join('\n')
    );
    // `emit` keeps ambient modules apart: in a module file they would augment
    const result = new TsEmitter().emit(parse(source));
    expect(result.code).toBe(
      'declare global {\n  interface Window {\n    барнома?: string;\n  }\n}'
    );
    expect(result.ambient?.code).toBe(
      'declare module "китобхона" {\n  export function ҳисоб(а: number): number;\n  export = ҳисоб;\n}'
    );
    expect(new TsEmitter().emit(parse('тағ а = 1;')).ambient).toBeUndefined();
  });

  test('overload signatures of functions, methods and constructors', () => {
    expect(
      emit(
        [
          'функсия ф(х: рақам): рақам;',
          'функсия ф(х: сатр): сатр;',
          'функсия ф(х: ҳар): ҳар { бозгашт х; }',
          'синф К {',
          '    конструктор(х: рақам);',
          '    конструктор(х?: рақам) {}',
          '    статикӣ м(х: рақам): рақам;',
          '    статикӣ м(х: ҳар): ҳар { бозгашт х; }',
          '}',
          'содир функсия г(х: рақам): рақам;',
          'содир функсия г(х: ҳар) { бозгашт х; }',
          'содир функсия илова(х: рақам): рақам;',
          'содир функсия илова(х: ҳар) { бозгашт х; }',
        ].join('\n')
      )
    ).toBe(
      [
        'function ф(х: number): number;',
        'function ф(х: string): string;',
        'function ф(х: any): any {',
        '  return х;',
        '}',
        'class К {',
        '  constructor(х: number);',
        '  constructor(х?: number) {}',
        '  static м(х: number): number;',
        '  static м(х: any): any {',
        '    return х;',
        '  }',
        '}',
        'export function г(х: number): number;',
        'export function г(х: any) {',
        '  return х;',
        '}',
        'function илова(х: number): number;',
        'function илова(х: any) {',
        '  return х;',
        '}',
        'export { илова as push };',
      ].join('\n')
    );
  });

  test('class members: override, abstract and declared fields, index signatures, accessor', () => {
    expect(
      emit(
        [
          'мавҳум синф Шакл {',
          '    мавҳум масоҳат(): рақам;',
          '    муҳофизатшуда мавҳум танҳохонӣ ном: сатр;',
          '    мавҳум дастрасӣ андоза: рақам;',
          '    ҷамъиятӣ мавҳум get тараф(): рақам;',
          '    [калид: сатр]: ҳар;',
          '    статикӣ танҳохонӣ [н: рақам]: сатр;',
          '    эълон ранг: сатр;',
          '    м?(): беджавоб;',
          '    ["ҳисоб"](): рақам { бозгашт 1; }',
          '    дастрасӣ шумора = 0;',
          '    статикӣ дастрасӣ умумӣ = 1;',
          '}',
          'синф Доира мерос Шакл {',
          '    ҷамъиятӣ статикӣ бознавис танҳохонӣ н = 2;',
          '    ном = "доира";',
          '    андоза = 1;',
          '    конструктор(хосусӣ бознавис радиус: рақам, бознавис танҳохонӣ а = 1) { супер(); }',
          '    бознавис масоҳат(): рақам { бозгашт ин.радиус; }',
          '    get тараф(): рақам { бозгашт 0; }',
          '}',
        ].join('\n')
      )
    ).toBe(
      [
        'abstract class Шакл {',
        '  abstract масоҳат(): number;',
        '  protected abstract readonly ном: string;',
        '  abstract accessor андоза: number;',
        '  public abstract get тараф(): number;',
        '  [калид: string]: any;',
        '  static readonly [н: number]: string;',
        '  declare ранг: string;',
        '  м?(): void;',
        '  ["ҳисоб"](): number {',
        '    return 1;',
        '  }',
        '  accessor шумора = 0;',
        '  static accessor умумӣ = 1;',
        '}',
        'class Доира extends Шакл {',
        '  private declare радиус: number;',
        '  public static override readonly н = 2;',
        '  ном = "доира";',
        '  андоза = 1;',
        '  constructor(радиус: number, override readonly а = 1) {',
        '    super();',
        '    this.радиус = радиус;',
        '  }',
        '  override масоҳат(): number {',
        '    return this.радиус;',
        '  }',
        '  get тараф(): number {',
        '    return 0;',
        '  }',
        '}',
      ].join('\n')
    );
  });

  test('decorators, also on parameters with experimentalDecorators', () => {
    expect(emit('@д синф К { @м(1) х = 1; @(а[0]) статикӣ ф() {} }\nсодир @д синф Л {}')).toBe(
      '@д class К {\n  @м(1) х = 1;\n  @(а[0]) static ф() {}\n}\nexport @д class Л {}'
    );
    expect(emit('синф К { конструктор(@тазриқ("а") х: рақам) {} }', true)).toBe(
      'class К {\n  constructor(@тазриқ("а") х: number) {}\n}'
    );
  });

  test('`this` parameters, const and variance modifiers of type parameters', () => {
    expect(
      emit(
        [
          'функсия ф(ин: Window, к: рақам): рақам { бозгашт к; }',
          'функсия г(ин: Window) {}',
          'эълон функсия д(ин: Window): беджавоб;',
          'тағ е = функсия (ин: ҳар) {};',
          'синф К { м(ин: К, х: рақам) {} }',
          'навъ Ф = (ин: Window, х: рақам) => беджавоб;',
          'интерфейс Қуттӣ<дар берун Т> { м(ин: Қуттӣ<Т>): беджавоб; get қимат(): Т; set қимат(қ: Т); }',
          'функсия аввал<собит Т мерос сатр[]>(р: Т): Т[0] { бозгашт р[0]; }',
        ].join('\n')
      )
    ).toBe(
      [
        'function ф(this: Window, к: number): number {',
        '  return к;',
        '}',
        'function г(this: Window) {}',
        'declare function д(this: Window): void;',
        'let е = function(this: any) {};',
        'class К {',
        '  м(this: К, х: number) {}',
        '}',
        'type Ф = (this: Window, х: number) => void;',
        'interface Қуттӣ<in out Т> {',
        '  м(this: Қуттӣ<Т>): void;',
        '  get қимат(): Т;',
        '  set қимат(value: Т);',
        '}',
        'function аввал<const Т extends string[]>(р: Т): Т[0] {',
        '  return р[0];',
        '}',
      ].join('\n')
    );
  });

  test('`истифода` and `интизор истифода`, also at the top level', () => {
    expect(
      emit(
        'истифода а: Disposable = ф();\nинтизор истифода б = г();\nҳамзамон функсия м() { барои (интизор истифода в аз д) {} }'
      )
    ).toBe(
      'using а: Disposable = ф();\nawait using б = г();\nasync function м() {\n  for (await using в of д) {}\n}'
    );
  });

  test('type-only imports and exports, import = require and export =', () => {
    expect(
      emit(
        [
          'ворид навъ { Т } аз "./т";',
          'ворид навъ Д аз "./д";',
          'ворид { навъ У, у } аз "./у";',
          'ворид навъ * чун Н аз "./н";',
          'ворид fs = require("fs");',
          'ворид навъ роҳ = require("path");',
          'ворид Ҷ = Н.Ҷ;',
          'содир навъ { Т };',
          'содир { навъ У, у };',
          'содир навъ { Д } аз "./д";',
          'содир навъ * аз "./у";',
          'содир навъ * чун Х аз "./х";',
        ].join('\n')
      )
    ).toBe(
      [
        'import type { Т } from "./т.js";',
        'import type Д from "./д.js";',
        'import { type У, у } from "./у.js";',
        'import type * as Н from "./н.js";',
        'import fs = require("fs");',
        'import type роҳ = require("path");',
        'import Ҷ = Н.Ҷ;',
        'export type { Т };',
        'export { type У, у };',
        'export type { Д } from "./д.js";',
        'export type * from "./у.js";',
        'export type * as Х from "./х.js";',
      ].join('\n')
    );
    expect(emit('синф К {}\nсодир = К;')).toBe('class К {}\nexport = К;');
  });

  test('a shebang stays the first line', () => {
    expect(emit('#!/usr/bin/env node\nчоп.сабт(1);')).toBe('#!/usr/bin/env node\nconsole.log(1);');
  });

  test('merged namespaces and enums stay apart: TypeScript merges them', () => {
    expect(
      emit(
        'номфазо Н { содир собит а = 1; }\nномфазо Н { содир собит б = а + 1; }\nшумориш Э { А }\nшумориш Э { Б = 2 }'
      )
    ).toBe(
      [
        'namespace Н {',
        '  export const а = 1;',
        '}',
        'namespace Н {',
        '  export const б = а + 1;',
        '}',
        'enum Э {',
        '  А,',
        '}',
        'enum Э {',
        '  Б = 2,',
        '}',
      ].join('\n')
    );
  });
});

describe('TypeScript emitter: positions', () => {
  function mappingsOf(source: string) {
    return new TsEmitter().emit(parse(source));
  }

  test('generate() and emit() produce the same code', () => {
    const source = 'тағ х: рақам = ф(1) + у.з;\nфунксия ф(а: рақам): сатр { бозгашт "" + а; }';
    expect(mappingsOf(source).code).toBe(new TsEmitter().generate(parse(source)));
  });

  test('statements, expressions, identifiers and types map back to the source', () => {
    const source = 'тағ хато: рақам = 1;\nтағ ном: сатр = хато + чоп.сабт(ном);';
    const { code, mappings } = mappingsOf(source);
    const lines = code.split('\n');
    const at = (line: number, text: string, occurrence = 0) => {
      let column = -1;
      for (let i = 0; i <= occurrence; i++) column = lines[line - 1].indexOf(text, column + 1);
      return originalPosition(mappings, line, column);
    };
    // Declarations, names and types on line 1
    expect(at(1, 'let')).toEqual({ line: 1, column: 0 });
    expect(at(1, 'хато')).toEqual({ line: 1, column: 4 });
    expect(at(1, 'number')).toEqual({ line: 1, column: 10 });
    expect(at(1, '1')).toEqual({ line: 1, column: 18 });
    // Expressions and members on line 2
    expect(at(2, 'string')).toEqual({ line: 2, column: 9 });
    expect(at(2, 'хато')).toEqual({ line: 2, column: 16 });
    expect(at(2, 'console')).toEqual({ line: 2, column: 23 });
    expect(at(2, 'log')).toEqual({ line: 2, column: 27 });
    expect(at(2, 'ном', 1)).toEqual({ line: 2, column: 32 });
  });

  test('a position before any mapping has no original position', () => {
    expect(originalPosition([], 1, 0)).toBeUndefined();
  });
});

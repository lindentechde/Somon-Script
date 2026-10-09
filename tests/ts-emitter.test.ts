/**
 * The TypeScript emitter: every construct keeps its types, values and member
 * names match the JavaScript output, and positions map back to the source.
 */
import ts from 'typescript';
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
function emit(source: string): string {
  const emitter = new TsEmitter();
  const code = emitter.generate(parse(source));
  expect(emitter.getErrors()).toEqual([]);
  const { diagnostics } = ts.transpileModule(code, {
    reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
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
    ['[х: рақам, у?: рақам]', '[number, number?]'],
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

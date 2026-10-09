/*
 * SomonScript migration tool: TypeScript → SomonScript name tables
 * Copyright (c) 2025 LindenTech IT Consulting
 *
 * Licensed under the MIT License. See the LICENSE file for details.
 */

import ts from 'typescript';

/** TypeScript keywords and their SomonScript spelling (llm-guide/02-keywords.md, 03-types.md). */
export const KEYWORD_NAMES: ReadonlyMap<ts.SyntaxKind, string> = new Map([
  [ts.SyntaxKind.LetKeyword, 'тағ'],
  [ts.SyntaxKind.VarKeyword, 'тағ'],
  [ts.SyntaxKind.ConstKeyword, 'собит'],
  [ts.SyntaxKind.FunctionKeyword, 'функсия'],
  [ts.SyntaxKind.ReturnKeyword, 'бозгашт'],
  [ts.SyntaxKind.IfKeyword, 'агар'],
  [ts.SyntaxKind.ElseKeyword, 'вагарна'],
  [ts.SyntaxKind.ForKeyword, 'барои'],
  [ts.SyntaxKind.WhileKeyword, 'то'],
  [ts.SyntaxKind.DoKeyword, 'кун'],
  [ts.SyntaxKind.OfKeyword, 'аз'],
  [ts.SyntaxKind.InKeyword, 'дар'],
  [ts.SyntaxKind.ClassKeyword, 'синф'],
  [ts.SyntaxKind.ExtendsKeyword, 'мерос'],
  [ts.SyntaxKind.ImplementsKeyword, 'татбиқ'],
  [ts.SyntaxKind.NewKeyword, 'нав'],
  [ts.SyntaxKind.ThisKeyword, 'ин'],
  [ts.SyntaxKind.SuperKeyword, 'супер'],
  [ts.SyntaxKind.AsyncKeyword, 'ҳамзамон'],
  [ts.SyntaxKind.AwaitKeyword, 'интизор'],
  [ts.SyntaxKind.TryKeyword, 'кӯшиш'],
  [ts.SyntaxKind.CatchKeyword, 'гирифтан'],
  [ts.SyntaxKind.FinallyKeyword, 'ниҳоят'],
  [ts.SyntaxKind.ThrowKeyword, 'партофтан'],
  [ts.SyntaxKind.SwitchKeyword, 'интихоб'],
  [ts.SyntaxKind.CaseKeyword, 'ҳолат'],
  [ts.SyntaxKind.DefaultKeyword, 'пешфарз'],
  [ts.SyntaxKind.BreakKeyword, 'шикастан'],
  [ts.SyntaxKind.ContinueKeyword, 'давом'],
  [ts.SyntaxKind.ImportKeyword, 'ворид'],
  [ts.SyntaxKind.ExportKeyword, 'содир'],
  [ts.SyntaxKind.AsKeyword, 'чун'],
  [ts.SyntaxKind.FromKeyword, 'аз'],
  [ts.SyntaxKind.TrueKeyword, 'дуруст'],
  [ts.SyntaxKind.FalseKeyword, 'нодуруст'],
  [ts.SyntaxKind.NullKeyword, 'холӣ'],
  [ts.SyntaxKind.TypeOfKeyword, 'навъи'],
  [ts.SyntaxKind.TypeKeyword, 'навъ'],
  [ts.SyntaxKind.InterfaceKeyword, 'интерфейс'],
  [ts.SyntaxKind.EnumKeyword, 'шумориш'],
  [ts.SyntaxKind.NamespaceKeyword, 'номфазо'],
  [ts.SyntaxKind.ModuleKeyword, 'номфазо'],
  [ts.SyntaxKind.KeyOfKeyword, 'калидҳои'],
  [ts.SyntaxKind.ReadonlyKeyword, 'танҳохонӣ'],
  [ts.SyntaxKind.InferKeyword, 'инфер'],
  [ts.SyntaxKind.UniqueKeyword, 'беназир'],
  [ts.SyntaxKind.IsKeyword, 'аст'],
  [ts.SyntaxKind.AssertsKeyword, 'тасдиқ'],
  [ts.SyntaxKind.SatisfiesKeyword, 'бармесоё'],
  [ts.SyntaxKind.YieldKeyword, 'ҳосил'],
  [ts.SyntaxKind.PublicKeyword, 'ҷамъиятӣ'],
  [ts.SyntaxKind.PrivateKeyword, 'хосусӣ'],
  [ts.SyntaxKind.ProtectedKeyword, 'муҳофизатшуда'],
  [ts.SyntaxKind.StaticKeyword, 'статикӣ'],
  [ts.SyntaxKind.AbstractKeyword, 'мавҳум'],
  [ts.SyntaxKind.ConstructorKeyword, 'конструктор'],
  [ts.SyntaxKind.NumberKeyword, 'рақам'],
  [ts.SyntaxKind.StringKeyword, 'сатр'],
  [ts.SyntaxKind.BooleanKeyword, 'мантиқӣ'],
  [ts.SyntaxKind.AnyKeyword, 'ҳар'],
  [ts.SyntaxKind.VoidKeyword, 'беджавоб'],
  [ts.SyntaxKind.UnknownKeyword, 'ношинос'],
  [ts.SyntaxKind.NeverKeyword, 'абадан'],
  [ts.SyntaxKind.ObjectKeyword, 'объект'],
  [ts.SyntaxKind.SymbolKeyword, 'рамз'],
  [ts.SyntaxKind.UndefinedKeyword, 'беқимат'],
]);

/**
 * Keywords of newer syntax, written in Tajik only when this SomonScript
 * version understands them (see the feature probes in migrate.ts).
 */
export const OPTIONAL_KEYWORD_NAMES: ReadonlyMap<ts.SyntaxKind, { name: string; feature: string }> =
  new Map([
    [ts.SyntaxKind.DeclareKeyword, { name: 'эълон', feature: 'declare' }],
    [ts.SyntaxKind.OverrideKeyword, { name: 'бознавис', feature: 'override' }],
    [ts.SyntaxKind.AccessorKeyword, { name: 'дастрасӣ', feature: 'accessor' }],
    [ts.SyntaxKind.UsingKeyword, { name: 'истифода', feature: 'using' }],
    [ts.SyntaxKind.OutKeyword, { name: 'берун', feature: 'variance' }],
    [ts.SyntaxKind.BigIntKeyword, { name: 'калонрақам', feature: 'bigintType' }],
  ]);

/** Global values with a SomonScript name (`Math.PI` → `Риёзӣ.ПИ`). */
export const GLOBAL_VALUE_NAMES: ReadonlyMap<string, string> = new Map([
  ['Math', 'Риёзӣ'],
  ['Object', 'объект'],
  ['Array', 'рӯйхат'],
  ['String', 'сатр'],
  ['Promise', 'Ваъда'],
  ['Error', 'Хато'],
  ['undefined', 'беқимат'],
]);

/** Global types with a SomonScript name (llm-guide/03-types.md and the utility types). */
export const GLOBAL_TYPE_NAMES: ReadonlyMap<string, string> = new Map([
  ['Promise', 'Ваъда'],
  ['Error', 'Хато'],
  ['Partial', 'қисмӣ'],
  ['Required', 'ҳатмӣ'],
  ['Readonly', 'танҳохон'],
  ['Record', 'сабт_навъ'],
  ['Pick', 'гирифтан_навъ'],
  ['Omit', 'ҳазф'],
  ['Exclude', 'хориҷ'],
  ['Extract', 'истихроҷ'],
  ['NonNullable', 'беналиӣ'],
  ['ReturnType', 'навъи_бозгашт'],
  ['Parameters', 'параметрҳо'],
  ['InstanceType', 'навъи_намуна'],
  ['ConstructorParameters', 'параметрҳои_конструктор'],
  ['ThisParameterType', 'навъи_параметри_ин'],
  ['Awaited', 'интизоршуда'],
]);

/** Groups of built-in members; the members of each have their own Tajik names. */
export type MemberGroup =
  | 'console'
  | 'array'
  | 'arrayConstructor'
  | 'string'
  | 'stringConstructor'
  | 'math'
  | 'objectConstructor'
  | 'collection';

/** `console` → `чоп`; the receiver of these members. */
export const CONSOLE_NAME = 'чоп';

/**
 * Tajik names of built-in members by group. Each name is one that the
 * compiler translates back (`translateMemberName`), so the output compiles to
 * the same JavaScript; a test checks this.
 */
export const MEMBER_NAMES: Readonly<Record<MemberGroup, Readonly<Record<string, string>>>> = {
  console: {
    log: 'сабт',
    error: 'хато',
    warn: 'огоҳӣ',
    info: 'маълумот',
    debug: 'исфти',
    table: 'ҷадвал',
    group: 'гуруҳ',
    groupEnd: 'гуруҳОхир',
    groupCollapsed: 'гуруҳПӯшида',
    time: 'вақт',
    timeEnd: 'вақтОхир',
    timeLog: 'вақтСабт',
    count: 'қайд',
    countReset: 'қайдАсл',
    assert: 'тасдиқ',
    clear: 'полиз',
    dir: 'феҳрист',
    dirxml: 'xmlФеҳрист',
    trace: 'пайҷо',
  },
  array: {
    length: 'дарозӣ',
    at: 'дар',
    concat: 'пайвастан',
    copyWithin: 'нусхаДарДохил',
    entries: 'воридот',
    every: 'ҳама',
    fill: 'пурКардан',
    filter: 'филтр',
    find: 'кофтан',
    findIndex: 'индексиЁфтан',
    findLast: 'охиринЁфтан',
    findLastIndex: 'индексиОхиринЁфтан',
    flat: 'ҳамвор',
    flatMap: 'ҳамворХарита',
    forEach: 'бароиҲар',
    includes: 'дорад',
    indexOf: 'индекси',
    join: 'пайвастКардан',
    keys: 'калидҳо',
    lastIndexOf: 'индексиОхирин',
    map: 'харита',
    pop: 'баровардан',
    push: 'илова',
    reduce: 'ҷамъбаст',
    reduceRight: 'ҷамъбастАзРост',
    reverse: 'баргардон',
    shift: 'ҳазфиАввал',
    slice: 'буридан',
    some: 'баъзе',
    sort: 'тартиб',
    splice: 'пайваст',
    toReversed: 'баБаргардон',
    toSorted: 'баТартиб',
    toSpliced: 'баПайваст',
    toString: 'баСатр',
    unshift: 'иловаБаАввал',
    values: 'қиматҳо',
    with: 'бо',
  },
  arrayConstructor: {
    from: 'аз',
    isArray: 'рӯйхатАст',
    of: 'азАргументҳо',
  },
  string: {
    length: 'дарозӣ',
    at: 'дар',
    charAt: 'аломатДар',
    charCodeAt: 'кодиАломатДар',
    codePointAt: 'нуқтаиКодДар',
    concat: 'пайвастан',
    endsWith: 'анҷомБо',
    includes: 'дорад',
    indexOf: 'индекси',
    lastIndexOf: 'индексиОхирин',
    localeCompare: 'муқоисаиМаҳаллӣ',
    match: 'мувофиқат',
    matchAll: 'мувофиқатҲама',
    normalize: 'муқаррарӣ',
    padEnd: 'пурКарданОхир',
    padStart: 'пурКарданАввал',
    repeat: 'такрор',
    replace: 'ҷойивазкунӣ',
    replaceAll: 'ҷойивазкунӣҲама',
    search: 'ҷустуҷӯ',
    slice: 'буридан',
    split: 'ҷудокунӣ',
    startsWith: 'оғозБо',
    substring: 'қисмат',
    toLocaleLowerCase: 'хурдМаҳаллӣ',
    toLocaleUpperCase: 'калонМаҳаллӣ',
    toLowerCase: 'хурд',
    toString: 'баСатр',
    toUpperCase: 'калон',
    trim: 'тозаКардан',
    trimEnd: 'тозаКарданОхир',
    trimStart: 'тозаКарданАввал',
    valueOf: 'қиматиАслӣ',
  },
  stringConstructor: {
    fromCharCode: 'азКодиАломат',
    fromCodePoint: 'азНуқтаиКод',
    raw: 'хоми',
  },
  math: {
    E: 'Е',
    LN10: 'ЛН10',
    LN2: 'ЛН2',
    LOG10E: 'ЛОГ10Е',
    LOG2E: 'ЛОГ2Е',
    PI: 'ПИ',
    SQRT1_2: 'РЕША1_2',
    SQRT2: 'РЕША2',
    abs: 'мутлақ',
    acos: 'арккосинус',
    acosh: 'арккосинусГиперболӣ',
    asin: 'арксинус',
    asinh: 'арксинусГиперболӣ',
    atan: 'арктангенс',
    atan2: 'арктангенс2',
    atanh: 'арктангенсГиперболӣ',
    cbrt: 'решаиКубӣ',
    ceil: 'боло',
    cos: 'косинус',
    cosh: 'косинусГиперболӣ',
    exp: 'экспонента',
    floor: 'поён',
    hypot: 'гипотенуза',
    log: 'логарифм',
    log10: 'логарифм10',
    log1p: 'логарифм1п',
    log2: 'логарифм2',
    max: 'ҳаддиАксар',
    min: 'ҳаддиАқал',
    pow: 'қувват',
    random: 'тасодуфӣ',
    round: 'дузкунӣ',
    sign: 'аломат',
    sin: 'синус',
    sinh: 'синусГиперболӣ',
    sqrt: 'дуръшака',
    tan: 'тангенс',
    tanh: 'тангенсГиперболӣ',
    trunc: 'бириданАдад',
  },
  objectConstructor: {
    assign: 'таъин',
    create: 'сохтан',
    defineProperties: 'муайянХосиятҳо',
    defineProperty: 'муайянХосият',
    entries: 'воридот',
    freeze: 'яхКардан',
    fromEntries: 'азВоридот',
    getOwnPropertyDescriptor: 'тавсифиХосият',
    getOwnPropertyDescriptors: 'тавсифиХосиятҳо',
    getOwnPropertyNames: 'номҳоиХосият',
    getOwnPropertySymbols: 'рамзҳоиХосият',
    getPrototypeOf: 'прототип',
    groupBy: 'гурӯҳбандӣ',
    hasOwn: 'дорадХосият',
    is: 'аст',
    isExtensible: 'васеъшаванда',
    isFrozen: 'яхшуда',
    isSealed: 'мӯҳршуда',
    keys: 'калидҳо',
    preventExtensions: 'манъиВасеъшавӣ',
    seal: 'мӯҳр',
    setPrototypeOf: 'танзимиПрототип',
    values: 'қиматҳо',
  },
  collection: {
    get: 'бозгирифтан',
    set: 'гузоштан',
    has: 'дорадКалид',
    size: 'ҳаҷм',
    delete: 'нобудКардан',
    forEach: 'бароиҲар',
    keys: 'калидҳо',
    values: 'қиматҳо',
    entries: 'воридот',
  },
};

/** Library interfaces whose members belong to a group. */
export const INTERFACE_GROUPS: ReadonlyMap<string, MemberGroup> = new Map([
  ['Console', 'console'],
  ['Array', 'array'],
  ['ReadonlyArray', 'array'],
  ['ArrayConstructor', 'arrayConstructor'],
  ['String', 'string'],
  ['StringConstructor', 'stringConstructor'],
  ['Math', 'math'],
  ['ObjectConstructor', 'objectConstructor'],
  ['Map', 'collection'],
  ['ReadonlyMap', 'collection'],
  ['Set', 'collection'],
  ['ReadonlySet', 'collection'],
]);

/** Global objects whose members belong to a group, for receivers named directly. */
export const GLOBAL_OBJECT_GROUPS: ReadonlyMap<string, MemberGroup> = new Map([
  ['console', 'console'],
  ['Math', 'math'],
  ['Object', 'objectConstructor'],
  ['Array', 'arrayConstructor'],
  ['String', 'stringConstructor'],
]);

/** The Tajik name of member `name` in `group`, if it has one. */
export function memberName(group: MemberGroup, name: string): string | undefined {
  const names = MEMBER_NAMES[group];
  return Object.prototype.hasOwnProperty.call(names, name) ? names[name] : undefined;
}

/**
 * Words a SomonScript program cannot use as its own names: keywords and the
 * names of built-ins that the compiler maps (`рӯйхат` → `Array`). A TypeScript
 * identifier spelled like one of them is renamed.
 */
export const RESERVED_NAMES: ReadonlySet<string> = new Set(
  (
    'тағ тағйирёбанда собит функсия функция агар вагарна чунин барои то бозгашт синф нав ин ' +
    'ворид содир аз дар чун пешфарз шикастан давом интихоб ҳолат кӯшиш гирифтан ниҳоят ' +
    'партофтан ҳамзамон интизор интерфейс навъ мерос татбиқ хосусӣ муҳофизатшуда ҷамъиятӣ ' +
    'статикӣ мавҳум номфазо калидҳои инфер хулоса танҳохонӣ беназир навъи аст бармесоё ' +
    'дуруст нодуруст холӣ беқимат супер конструктор сатр рақам мантиқӣ ҳар ношинос абадан ' +
    'беджавоб объект рамз калонрақам қисмӣ ҳатмӣ танҳохон сабт_навъ гирифтан_навъ ҳазф хориҷ ' +
    'истихроҷ беналиӣ навъи_бозгашт параметрҳо навъи_намуна параметрҳои_конструктор ' +
    'навъи_параметри_ин интизоршуда рӯйхат Риёзӣ математика Ваъда ваъда Хато сатрМетодҳо чоп ' +
    'шумориш эълон кун'
  ).split(' ')
);

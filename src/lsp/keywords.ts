/**
 * What each SomonScript keyword means: its JavaScript/TypeScript equivalent
 * (as in the keyword tables of llm-guide/02-keywords.md and 14-operators.md)
 * and a short description in Tajik. Used by hover and completion; the
 * contextual keywords are listed here because the lexer reads them as names.
 */

import { KEYWORDS } from '../keyword-map';

export type KeywordCategory =
  /** Declarations: `тағ`, `функсия`, `синф`, … */
  | 'declaration'
  /** Statements and control flow: `агар`, `барои`, `бозгашт`, … */
  | 'control'
  /** Operator words: `нав`, `навъи`, `чун`, `дар`, … */
  | 'operator'
  /** Modifiers: `хосусӣ`, `статикӣ`, `ҳамзамон`, … */
  | 'modifier'
  /** Literal values and `ин` / `супер`. */
  | 'literal'
  /** Primitive and special types: `сатр`, `рақам`, `ҳар`, … */
  | 'type'
  /** Utility types: `қисмӣ` (Partial), `сабт_навъ` (Record), … */
  | 'utilityType'
  /** Built-in objects: `чоп`, `рӯйхат`, `Риёзӣ`, … */
  | 'builtin'
  /** Built-in member names the lexer knows: `сабт`, `илова`, `дарозӣ`, … */
  | 'builtinMember';

export interface KeywordInfo {
  /** The JavaScript/TypeScript equivalent. */
  english: string;
  /** Short description in Tajik. */
  doc: string;
  category: KeywordCategory;
  /** A keyword only in some positions; an ordinary name elsewhere. */
  contextual?: boolean;
}

type Entry = [words: string[], english: string, category: KeywordCategory, doc: string];

const ENTRIES: Entry[] = [
  // Declarations
  [
    ['тағйирёбанда', 'тағ'],
    'let',
    'declaration',
    'Тағйирёбандаеро эълон мекунад, ки қиматаш метавонад иваз шавад.',
  ],
  [
    ['собит'],
    'const',
    'declaration',
    'Доимиеро эълон мекунад, ки қиматаш иваз намешавад. `х чун собит` — навъҳои ҳарфӣ.',
  ],
  [
    ['функсия', 'функция'],
    'function',
    'declaration',
    'Функсияро эълон мекунад. `функсия*` — генератор.',
  ],
  [['синф'], 'class', 'declaration', 'Синфро эълон мекунад.'],
  [['интерфейс'], 'interface', 'declaration', 'Шакли объектро тавсиф мекунад.'],
  [
    ['навъ'],
    'type',
    'declaration',
    'Тахаллуси навъ: `навъ Ном = …;`. Дар `ворид навъ { … }` — танҳо навъҳо.',
  ],
  [['номфазо'], 'namespace', 'declaration', 'Фазои ном: номҳоро дар як объект гурӯҳ мекунад.'],
  [
    ['конструктор'],
    'constructor',
    'declaration',
    'Конструктори синф: ҳангоми `нав` даъват мешавад.',
  ],
  [['якхела'], 'generic', 'declaration', 'Навъи умумӣ (generic).'],
  // Control flow
  [['агар'], 'if', 'control', 'Агар шарт дуруст бошад, блокро иҷро мекунад.'],
  [
    ['вагарна'],
    'else',
    'control',
    'Вақте иҷро мешавад, ки шарти `агар` нодуруст аст. `вагарна агар` — `else if`.',
  ],
  [['чунин'], 'else', 'control', 'Шакли дигари `вагарна` (`else`).'],
  [
    ['барои'],
    'for',
    'control',
    'Давра: `барои (оғоз; шарт; қадам)`, `барои (собит х аз рӯйхат)`, `барои (собит к дар объект)`.',
  ],
  [['то'], 'while', 'control', 'То вақте ки шарт дуруст аст, блокро такрор мекунад.'],
  [['бозгашт'], 'return', 'control', 'Аз функсия қиматро бармегардонад.'],
  [['шикастан'], 'break', 'control', 'Давра ё `интихоб`-ро қатъ мекунад.'],
  [['давом'], 'continue', 'control', 'Ба қадами навбатии давра мегузарад.'],
  [['интихоб'], 'switch', 'control', 'Аз рӯи қимат яке аз ҳолатҳоро интихоб мекунад.'],
  [['ҳолат'], 'case', 'control', 'Ҳолати `интихоб`.'],
  [
    ['пешфарз'],
    'default',
    'control',
    'Ҳолати пешфарзи `интихоб`; `содир пешфарз` — содироти пешфарз.',
  ],
  [['кӯшиш'], 'try', 'control', 'Блоке, ки хатоҳояш дар `гирифтан` дастгир мешаванд.'],
  [['гирифтан'], 'catch', 'control', 'Хатои блоки `кӯшиш`-ро дастгир мекунад.'],
  [['ниҳоят'], 'finally', 'control', 'Блоке, ки баъди `кӯшиш` ҳамеша иҷро мешавад.'],
  [['партофтан'], 'throw', 'control', 'Хато мепартояд.'],
  [['ворид'], 'import', 'control', 'Аз модули дигар ворид мекунад: `ворид { ном } аз "./модул";`.'],
  [['содир'], 'export', 'control', 'Аз модул содир мекунад: `содир функсия ном() { … }`.'],
  [
    ['интизор'],
    'await',
    'control',
    'Натиҷаи Ваъдаро интизор мешавад. `барои интизор` — `for await`.',
  ],
  // Operator words
  [
    ['аз'],
    'from / of',
    'operator',
    '`ворид … аз "модул"`; дар давра: `барои (собит х аз рӯйхат)` (`of`).',
  ],
  [['дар'], 'in', 'operator', 'Оё калид дар объект ҳаст; дар давра: `барои (собит к дар объект)`.'],
  [['чун'], 'as', 'operator', 'Тахаллус ё табдили навъ: `ворид * чун М`, `х чун сатр`.'],
  [['нав'], 'new', 'operator', 'Намунаи нави синфро месозад.'],
  [['навъи'], 'typeof', 'operator', 'Навъи қиматро медиҳад: `навъи х === "string"`.'],
  [['калидҳои'], 'keyof', 'operator', 'Калидҳои навъ: `калидҳои Т`.'],
  [['инфер', 'хулоса'], 'infer', 'operator', 'Дар навъи шартӣ навъро хулоса мекунад: `инфер У`.'],
  [['аст'], 'is', 'operator', 'Пешгӯии навъ: `х аст сатр`.'],
  [
    ['бармесоё'],
    'satisfies',
    'operator',
    'Мувофиқати қиматро ба навъ месанҷад, бе он ки навъашро иваз кунад.',
  ],
  [
    ['мерос'],
    'extends',
    'operator',
    'Аз синф ё интерфейси дигар мерос мегирад; дар навъҳо — маҳдудият.',
  ],
  [['татбиқ'], 'implements', 'operator', 'Синф интерфейсро татбиқ мекунад.'],
  [['беназир'], 'unique', 'operator', '`беназир рамз` — рамзи ягона (`unique symbol`).'],
  // Modifiers
  [['ҳамзамон'], 'async', 'modifier', 'Функсияи ҳамзамон (асинхронӣ), ки Ваъда бармегардонад.'],
  [['хосусӣ'], 'private', 'modifier', 'Аъзои хосусӣ: танҳо дар дохили синф дастрас аст.'],
  [
    ['муҳофизатшуда'],
    'protected',
    'modifier',
    'Аъзои муҳофизатшуда: дар синф ва ворисони он дастрас аст.',
  ],
  [['ҷамъиятӣ'], 'public', 'modifier', 'Аъзои ҷамъиятӣ: аз ҳама ҷо дастрас аст.'],
  [['статикӣ'], 'static', 'modifier', 'Аъзои статикӣ ба худи синф тааллуқ дорад, на ба намунаҳо.'],
  [['мавҳум'], 'abstract', 'modifier', 'Синф ё аъзои мавҳум: бояд дар ворис татбиқ шавад.'],
  [['танҳохонӣ'], 'readonly', 'modifier', 'Танҳо барои хондан: баъди оғоз иваз намешавад.'],
  // Literals
  [['дуруст'], 'true', 'literal', 'Қимати мантиқии «дуруст».'],
  [['нодуруст'], 'false', 'literal', 'Қимати мантиқии «нодуруст».'],
  [['холӣ'], 'null', 'literal', 'Қимати холӣ.'],
  [['беқимат'], 'undefined', 'literal', 'Қимати номуайян.'],
  [['ин'], 'this', 'literal', 'Объекти ҷорӣ. Ҳамчун параметри аввал — навъи `ин`.'],
  [['супер'], 'super', 'literal', 'Синфи волид: `супер()`, `супер.усул()`.'],
  // Types
  [['сатр'], 'string', 'type', 'Навъи сатр. Ҳамчун қимат — `String`.'],
  [['рақам'], 'number', 'type', 'Навъи рақам.'],
  [['мантиқӣ'], 'boolean', 'type', 'Навъи мантиқӣ: `дуруст` ё `нодуруст`.'],
  [['калонрақам'], 'bigint', 'type', 'Навъи адади бутуни калон: `10n`.'],
  [['рамз'], 'symbol', 'type', 'Навъи рамз.'],
  [['ҳар'], 'any', 'type', 'Ҳар навъ: санҷиши навъ барои ин қимат хомӯш аст.'],
  [['ношинос'], 'unknown', 'type', 'Навъи ношинос: пеш аз истифода бояд санҷида шавад.'],
  [['абадан'], 'never', 'type', 'Навъе, ки ҳеҷ гоҳ қимат надорад.'],
  [['беджавоб'], 'void', 'type', 'Функсия қимат барнамегардонад.'],
  [
    ['объект'],
    'object / Object',
    'type',
    'Навъи объект; ҳамчун қимат — `Object` (`объект.калидҳо(…)`).',
  ],
  [['ваъда'], 'Promise', 'type', 'Ваъда: натиҷаи амали ҳамзамон.'],
  // Utility types
  [['қисмӣ'], 'Partial', 'utilityType', '`қисмӣ<Т>`: ҳамаи хосиятҳои Т ихтиёрӣ мешаванд.'],
  [['ҳатмӣ'], 'Required', 'utilityType', '`ҳатмӣ<Т>`: ҳамаи хосиятҳои Т ҳатмӣ мешаванд.'],
  [['танҳохон'], 'Readonly', 'utilityType', '`танҳохон<Т>`: ҳамаи хосиятҳо танҳо барои хондан.'],
  [
    ['сабт_навъ'],
    'Record',
    'utilityType',
    '`сабт_навъ<К, В>`: объект бо калидҳои К ва қиматҳои В.',
  ],
  [['гирифтан_навъ'], 'Pick', 'utilityType', '`гирифтан_навъ<Т, К>`: танҳо хосиятҳои К аз Т.'],
  [['ҳазф'], 'Omit', 'utilityType', '`ҳазф<Т, К>`: Т бе хосиятҳои К.'],
  [['хориҷ'], 'Exclude', 'utilityType', '`хориҷ<Т, У>`: аъзоёни Т, ки ба У дохил нестанд.'],
  [['истихроҷ'], 'Extract', 'utilityType', '`истихроҷ<Т, У>`: аъзоёни Т, ки ба У дохиланд.'],
  [['беналиӣ'], 'NonNullable', 'utilityType', '`беналиӣ<Т>`: Т бе `холӣ` ва `беқимат`.'],
  [
    ['навъи_бозгашт'],
    'ReturnType',
    'utilityType',
    '`навъи_бозгашт<Ф>`: навъи қимати бозгаштии функсия.',
  ],
  [['параметрҳо'], 'Parameters', 'utilityType', '`параметрҳо<Ф>`: навъҳои параметрҳои функсия.'],
  [['навъи_намуна'], 'InstanceType', 'utilityType', '`навъи_намуна<К>`: навъи намунаи синф.'],
  [
    ['параметрҳои_конструктор'],
    'ConstructorParameters',
    'utilityType',
    '`параметрҳои_конструктор<К>`: навъҳои параметрҳои конструктор.',
  ],
  [
    ['навъи_параметри_ин'],
    'ThisParameterType',
    'utilityType',
    '`навъи_параметри_ин<Ф>`: навъи параметри `ин`.',
  ],
  [['интизоршуда'], 'Awaited', 'utilityType', '`интизоршуда<Т>`: натиҷаи Ваъда баъди `интизор`.'],
  // Built-in objects
  [['чоп'], 'console', 'builtin', 'Консол: `чоп.сабт(…)`, `чоп.хато(…)`.'],
  [['рӯйхат'], 'Array', 'builtin', 'Рӯйхат (массив): `рӯйхат.аз(…)`, `рӯйхат.рӯйхатАст(…)`.'],
  [['математика'], 'Math', 'builtin', 'Функсияҳои риёзӣ (ҳамчун `Риёзӣ`).'],
  [['сатрМетодҳо', 'сатрметодҳо'], 'String', 'builtin', 'Объекти `String`.'],
  // Built-in member names the lexer reads as keywords
  [['сабт'], 'log', 'builtinMember', '`чоп.сабт(…)` — ба консол менависад.'],
  [['хато'], 'error', 'builtinMember', '`чоп.хато(…)` — хаторо ба консол менависад.'],
  [['огоҳӣ'], 'warn', 'builtinMember', '`чоп.огоҳӣ(…)` — огоҳӣ менависад.'],
  [['маълумот'], 'info', 'builtinMember', '`чоп.маълумот(…)` — маълумот менависад.'],
  [['исфти'], 'debug', 'builtinMember', '`чоп.исфти(…)` — паёми ислоҳи хато.'],
  [
    ['тасдиқ'],
    'assert / asserts',
    'builtinMember',
    '`чоп.тасдиқ(шарт, …)`; дар навъҳо: `тасдиқ х аст Т`.',
  ],
  [['қайд'], 'count', 'builtinMember', '`чоп.қайд(нишона)` — шумораи даъватҳоро менависад.'],
  [
    ['қайдАсл', 'қайдасл'],
    'countReset',
    'builtinMember',
    '`чоп.қайдАсл(нишона)` — ҳисобро аз нав мекунад.',
  ],
  [['вақт'], 'time', 'builtinMember', '`чоп.вақт(нишона)` — вақтсанҷро оғоз мекунад.'],
  [
    ['вақтСабт', 'вақтсабт'],
    'timeLog',
    'builtinMember',
    '`чоп.вақтСабт(нишона)` — вақти гузаштаро менависад.',
  ],
  [
    ['вақтОхир', 'вақтохир'],
    'timeEnd',
    'builtinMember',
    '`чоп.вақтОхир(нишона)` — вақтсанҷро қатъ мекунад.',
  ],
  [['ҷадвал'], 'table', 'builtinMember', '`чоп.ҷадвал(маълумот)` — ҷадвал нишон медиҳад.'],
  [['феҳрист'], 'dir', 'builtinMember', '`чоп.феҳрист(объект)` — хосиятҳои объект.'],
  [['xmlФеҳрист', 'xmlфеҳрист'], 'dirxml', 'builtinMember', '`чоп.xmlФеҳрист(…)`.'],
  [['пайҷо'], 'trace', 'builtinMember', '`чоп.пайҷо()` — пайҷои даъватҳо.'],
  [['полиз'], 'clear', 'builtinMember', '`чоп.полиз()` — консолро тоза мекунад.'],
  [['гуруҳ'], 'group', 'builtinMember', '`чоп.гуруҳ(…)` — гурӯҳи паёмҳоро мекушояд.'],
  [
    ['гуруҳОхир', 'гуруҳохир'],
    'groupEnd',
    'builtinMember',
    '`чоп.гуруҳОхир()` — гурӯҳро мебандад.',
  ],
  [
    ['гуруҳПӯшида', 'гуруҳпӯшида'],
    'groupCollapsed',
    'builtinMember',
    '`чоп.гуруҳПӯшида(…)` — гурӯҳи пӯшида.',
  ],
  [['илова'], 'push', 'builtinMember', '`рӯйхат.илова(х)` — ба охири рӯйхат илова мекунад.'],
  [['баровардан'], 'pop', 'builtinMember', '`рӯйхат.баровардан()` — унсури охиринро мебарорад.'],
  [['дарозӣ'], 'length', 'builtinMember', 'Дарозии рӯйхат ё сатр.'],
  [['харита'], 'map', 'builtinMember', '`рӯйхат.харита(ф)` — рӯйхати нав аз натиҷаҳои ф.'],
  [['филтр'], 'filter', 'builtinMember', '`рӯйхат.филтр(ф)` — унсурҳое, ки ба шарт мувофиқанд.'],
  [['кофтан'], 'find', 'builtinMember', '`рӯйхат.кофтан(ф)` — унсури аввалини мувофиқ.'],
  [['дарозииСатр', 'дарозиисатр'], 'length', 'builtinMember', 'Дарозии сатр.'],
  [
    ['пайвастан'],
    'concat',
    'builtinMember',
    '`а.пайвастан(б)` — рӯйхатҳо ё сатрҳоро пайваст мекунад.',
  ],
  [
    ['ҷойивазкунӣ'],
    'replace',
    'builtinMember',
    '`сатр.ҷойивазкунӣ(а, б)` — қисми сатрро иваз мекунад.',
  ],
  [
    ['ҷудокунӣ'],
    'split',
    'builtinMember',
    '`сатр.ҷудокунӣ(ҷудокунанда)` — сатрро ба рӯйхат ҷудо мекунад.',
  ],
  [['калидҳо'], 'keys', 'builtinMember', '`объект.калидҳо(о)` — калидҳои объект.'],
  [['қиматҳо'], 'values', 'builtinMember', '`объект.қиматҳо(о)` — қиматҳои объект.'],
  [['ҷамъ'], 'add', 'builtinMember', 'Ҷамъ (номи маъмули функсия).'],
  [['тарҳ'], 'subtract', 'builtinMember', 'Тарҳ (номи маъмули функсия).'],
  [['зарб'], 'multiply', 'builtinMember', 'Зарб (номи маъмули функсия).'],
  [['тақсим'], 'divide', 'builtinMember', 'Тақсим (номи маъмули функсия).'],
];

/** Contextual keywords: keywords only in one position, ordinary names elsewhere. */
const CONTEXTUAL_ENTRIES: Entry[] = [
  [['кун'], 'do', 'control', 'Давраи `кун { … } то (шарт);`: бадан ақаллан як бор иҷро мешавад.'],
  [
    ['ҳосил'],
    'yield',
    'control',
    'Дар генератор (`функсия*`) қимат медиҳад; `ҳосил*` — аз ҷараёни дигар.',
  ],
  [['шумориш'], 'enum', 'declaration', 'Шумориш: `шумориш Ранг { Сурх, Сабз }`.'],
  [['эълон'], 'declare', 'modifier', 'Эълони берунӣ: навъро медиҳад, дар JavaScript нест мешавад.'],
  [['модул'], 'module', 'declaration', '`эълон модул "ном" { … }` — навъҳои модули берунӣ.'],
  [['глобалӣ'], 'global', 'declaration', '`эълон глобалӣ { … }` — номҳо ва навъҳои глобалӣ.'],
  [
    ['истифода'],
    'using',
    'declaration',
    'Захирае, ки дар охири блок озод мешавад (`[Symbol.dispose]`).',
  ],
  [
    ['мавқуф'],
    'defer',
    'modifier',
    'Воридоти мавқуф: `ворид мавқуф * чун Н аз "./м";` — модул ҳангоми аввалин хондани узви `Н` иҷро мешавад.',
  ],
  [['бознавис'], 'override', 'modifier', 'Аъзои синфи волидро бознавис мекунад.'],
  [['дастрасӣ'], 'accessor', 'modifier', 'Майдони худкор бо гиранда ва гузоранда.'],
  [['берун'], 'out', 'modifier', 'Тағйирдиҳандаи параметри навъ: `<берун Т>`.'],
];

/** Built-in globals with Tajik names that the lexer reads as names. */
const BUILTIN_GLOBALS: Entry[] = [
  [['Риёзӣ'], 'Math', 'builtin', 'Функсияҳои риёзӣ: `Риёзӣ.дуръшака(х)`, `Риёзӣ.ПИ`.'],
  [['Хато'], 'Error', 'builtin', 'Хато: `партофтан нав Хато("паём")`.'],
  [['Ваъда'], 'Promise', 'builtin', 'Ваъда: натиҷаи амали ҳамзамон.'],
];

function buildTable(): Map<string, KeywordInfo> {
  const table = new Map<string, KeywordInfo>();
  const add = (entries: Entry[], contextual: boolean) => {
    for (const [words, english, category, doc] of entries) {
      for (const word of words) {
        table.set(word, { english, doc, category, ...(contextual && { contextual: true }) });
      }
    }
  };
  add(ENTRIES, false);
  add(CONTEXTUAL_ENTRIES, true);
  add(BUILTIN_GLOBALS, false);
  return table;
}

/** Every keyword, contextual keyword and Tajik built-in global the tooling knows. */
export const KEYWORD_INFO: ReadonlyMap<string, KeywordInfo> = buildTable();

/** The contextual keywords (Tajik spelling). */
export const CONTEXTUAL_KEYWORDS: readonly string[] = CONTEXTUAL_ENTRIES.flatMap(
  ([words]) => words
);

/** English JavaScript/TypeScript keywords SomonScript accepts besides the Tajik ones. */
export const ENGLISH_KEYWORDS: readonly string[] = [
  'typeof',
  'instanceof',
  'in',
  'of',
  'as',
  'void',
  'delete',
  'debugger',
  'yield',
  'do',
  'enum',
  'declare',
  'module',
  'global',
  'using',
  'defer',
  'type',
  'satisfies',
  'is',
  'asserts',
  'extends',
  'override',
  'accessor',
  'get',
  'set',
];

/** Whether a word is a keyword of the language (not a built-in name). */
export function isSyntaxKeyword(word: string): boolean {
  const info = KEYWORD_INFO.get(word);
  return (
    info !== undefined &&
    info.category !== 'builtin' &&
    info.category !== 'builtinMember' &&
    info.category !== 'utilityType'
  );
}

/** Lexer keywords without an entry here (should be none; checked by the tests). */
export function undocumentedKeywords(): string[] {
  return [...KEYWORDS.keys()].filter(word => !KEYWORD_INFO.has(word));
}

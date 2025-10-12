import { TokenType } from './tokens';

export const KEYWORDS: ReadonlyMap<string, TokenType> = new Map<string, TokenType>([
  // Core language keywords
  ['тағйирёбанда', TokenType.ТАҒЙИРЁБАНДА],
  ['собит', TokenType.СОБИТ],
  ['функсия', TokenType.ФУНКСИЯ],
  ['функция', TokenType.ФУНКСИЯ], // Alternative spelling
  ['агар', TokenType.АГАР],
  ['вагарна', TokenType.ВАГАРНА],
  ['барои', TokenType.БАРОИ],
  ['то', TokenType.ТО],
  ['бозгашт', TokenType.БОЗГАШТ],
  ['синф', TokenType.СИНФ],
  ['нав', TokenType.НАВ],
  ['ин', TokenType.ИН],
  ['дуруст', TokenType.ДУРУСТ],
  ['нодуруст', TokenType.НОДУРУСТ],
  ['холӣ', TokenType.ХОЛӢ],
  ['беқимат', TokenType.БЕҚИМАТ],

  // Import/Export
  ['ворид', TokenType.ВОРИД],
  ['содир', TokenType.СОДИР],
  ['аз', TokenType.АЗ],
  ['дар', TokenType.ДАР],
  ['пешфарз', TokenType.ПЕШФАРЗ],
  ['чун', TokenType.ЧУН],

  // Built-in functions
  ['чоп', TokenType.ЧОП],
  ['сабт', TokenType.САБТ],
  ['хато', TokenType.ХАТО],
  ['огоҳӣ', TokenType.ОГОҲӢ],
  ['маълумот', TokenType.МАЪЛУМОТ],

  // Array methods
  ['рӯйхат', TokenType.РӮЙХАТ],
  ['илова', TokenType.ИЛОВА],
  ['баровардан', TokenType.БАРОВАРДАН],
  ['дарозӣ', TokenType.ДАРОЗӢ],
  ['харита', TokenType.ХАРИТА],
  ['филтр', TokenType.ФИЛТР],
  ['кофтан', TokenType.КОФТАН],

  // String methods
  ['сатр_методҳо', TokenType.САТР_МЕТОДҲО],
  ['дарозии_сатр', TokenType.ДАРОЗИИ_САТР],
  ['пайвастан', TokenType.ПАЙВАСТАН],
  ['ҷойивазкунӣ', TokenType.ҶОЙИВАЗКУНӢ],
  ['ҷудокунӣ', TokenType.ҶУДОКУНӢ],

  // Object methods
  ['калидҳо', TokenType.КАЛИДҲО],
  ['қиматҳо', TokenType.ҚИМАТҲО],

  // Math
  ['математика', TokenType.МАТЕМАТИКА],
  ['ҷамъ', TokenType.ҶАМЪ],
  ['тарҳ', TokenType.ТАРҲ],
  ['зарб', TokenType.ЗАРБ],
  ['тақсим', TokenType.ТАҚСИМ],

  // Control flow
  ['шикастан', TokenType.ШИКАСТАН],
  ['давом', TokenType.ДАВОМ],
  ['интихоб', TokenType.ИНТИХОБ],
  ['ҳолат', TokenType.ҲОЛАТ],
  ['кӯшиш', TokenType.КӮШИШ],
  ['гирифтан', TokenType.ГИРИФТАН],
  ['ниҳоят', TokenType.НИҲОЯТ],
  ['партофтан', TokenType.ПАРТОФТАН],

  // Async
  ['ҳамзамон', TokenType.ҲАМЗАМОН],
  ['интизор', TokenType.ИНТИЗОР],
  ['ваъда', TokenType.ВАЪДА],

  // Type system
  ['сатр', TokenType.САТР],
  ['рақам', TokenType.РАҚАМ],
  ['мантиқӣ', TokenType.МАНТИҚӢ],
  ['интерфейс', TokenType.ИНТЕРФЕЙС],
  ['навъ', TokenType.НАВЪ],
  ['якхела', TokenType.ЯКХЕЛА],
  ['мерос', TokenType.МЕРОС],
  ['татбиқ', TokenType.ТАТБИҚ],
  ['супер', TokenType.СУПЕР],
  ['конструктор', TokenType.КОНСТРУКТОР],
  ['хосусӣ', TokenType.ХОСУСӢ],
  ['муҳофизатшуда', TokenType.МУҲОФИЗАТШУДА],
  ['ҷамъиятӣ', TokenType.ҶАМЪИЯТӢ],
  ['статикӣ', TokenType.СТАТИКӢ],
  ['мавҳум', TokenType.МАВҲУМ],
  ['номфазо', TokenType.НОМФАЗО],
  ['калидҳои', TokenType.КАЛИДҲОИ],
  ['инфер', TokenType.ИНФЕР],
  ['танҳохонӣ', TokenType.ТАНҲОХОНӢ],
  ['беназир', TokenType.БЕНАЗИР],
]);

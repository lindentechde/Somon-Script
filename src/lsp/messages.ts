/**
 * Strings the language server shows in the editor (hover labels, diagnostics
 * of its own) in each interface language.
 */

export type Locale = 'en' | 'ru' | 'tj';

export const LOCALES: readonly Locale[] = ['en', 'ru', 'tj'];

export interface LspMessages {
  /** Hover label of each kind of declaration. */
  kinds: Record<
    | 'variable'
    | 'constant'
    | 'function'
    | 'parameter'
    | 'class'
    | 'interface'
    | 'type'
    | 'enum'
    | 'enumMember'
    | 'namespace'
    | 'import'
    | 'method'
    | 'property'
    | 'typeParameter',
    string
  >;
  keyword: string;
  contextualKeyword: string;
  builtin: string;
  english: string;
  configError: (_details: string) => string;
  formatterFailed: (_reason: string) => string;
  internalError: (_reason: string) => string;
}

const en: LspMessages = {
  kinds: {
    variable: 'variable',
    constant: 'constant',
    function: 'function',
    parameter: 'parameter',
    class: 'class',
    interface: 'interface',
    type: 'type alias',
    enum: 'enum',
    enumMember: 'enum member',
    namespace: 'namespace',
    import: 'import',
    method: 'method',
    property: 'property',
    typeParameter: 'type parameter',
  },
  keyword: 'keyword',
  contextualKeyword: 'contextual keyword',
  builtin: 'built-in',
  english: 'JavaScript/TypeScript',
  configError: details => `somon.config.json: ${details}`,
  formatterFailed: reason => `Formatting failed: ${reason}`,
  internalError: reason => `SomonScript language server error: ${reason}`,
};

const ru: LspMessages = {
  kinds: {
    variable: 'переменная',
    constant: 'константа',
    function: 'функция',
    parameter: 'параметр',
    class: 'класс',
    interface: 'интерфейс',
    type: 'псевдоним типа',
    enum: 'перечисление',
    enumMember: 'элемент перечисления',
    namespace: 'пространство имён',
    import: 'импорт',
    method: 'метод',
    property: 'свойство',
    typeParameter: 'параметр типа',
  },
  keyword: 'ключевое слово',
  contextualKeyword: 'контекстное ключевое слово',
  builtin: 'встроенное имя',
  english: 'JavaScript/TypeScript',
  configError: details => `somon.config.json: ${details}`,
  formatterFailed: reason => `Ошибка форматирования: ${reason}`,
  internalError: reason => `Ошибка языкового сервера SomonScript: ${reason}`,
};

const tj: LspMessages = {
  kinds: {
    variable: 'тағйирёбанда',
    constant: 'собит',
    function: 'функсия',
    parameter: 'параметр',
    class: 'синф',
    interface: 'интерфейс',
    type: 'тахаллуси навъ',
    enum: 'шумориш',
    enumMember: 'аъзои шумориш',
    namespace: 'номфазо',
    import: 'воридот',
    method: 'усул',
    property: 'хосият',
    typeParameter: 'параметри навъ',
  },
  keyword: 'калимаи калидӣ',
  contextualKeyword: 'калимаи калидии вобаста ба мавқеъ',
  builtin: 'номи дарунсохт',
  english: 'JavaScript/TypeScript',
  configError: details => `somon.config.json: ${details}`,
  formatterFailed: reason => `Хатои форматкунӣ: ${reason}`,
  internalError: reason => `Хатои сервери забони SomonScript: ${reason}`,
};

const MESSAGES: Record<Locale, LspMessages> = { en, ru, tj };

/** Messages of a locale; anything else (`tg`, `ru-RU`, …) is mapped like the CLI does. */
export function messagesFor(locale: string | undefined): LspMessages {
  return MESSAGES[normalizeLocale(locale)];
}

/** `ru`, `ru-RU` → ru; `tj`, `tg`, `tg-TJ` → tj; anything else → en. */
export function normalizeLocale(locale: string | undefined): Locale {
  const language = (locale ?? '').toLowerCase().split(/[-_.@]/)[0];
  if (language === 'ru') return 'ru';
  if (language === 'tj' || language === 'tg') return 'tj';
  return 'en';
}

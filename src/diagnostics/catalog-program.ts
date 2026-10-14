/**
 * Messages of the stages after parsing (the code generator, the target check,
 * the options) and of the module system, and the hints that follow messages.
 */
import { code, text, type CatalogEntry } from './text';

export const PROGRAM_MESSAGES: Readonly<Record<string, CatalogEntry>> = {
  CODEGEN_REDECLARED: {
    en: p => `${code(p.name)} has already been declared.`,
    ru: p => `Имя ${code(p.name)} уже объявлено.`,
    tj: p => `Номи ${code(p.name)} аллакай эълон шудааст.`,
  },
  CODEGEN_RESERVED_WORD: {
    en: p => `${code(p.name)} is a reserved word of JavaScript and cannot be a name.`,
    ru: p =>
      `${code(p.name)} — зарезервированное слово JavaScript, его нельзя использовать как имя.`,
    tj: p =>
      `${code(p.name)} калимаи махсуси JavaScript аст ва онро ҳамчун ном истифода бурдан мумкин нест.`,
  },
  'CODEGEN_OUTSIDE_LOOP.break': {
    en: () => `${code('шикастан')} can only be used inside a loop or ${code('интихоб')}.`,
    ru: () => `${code('шикастан')} можно писать только внутри цикла или ${code('интихоб')}.`,
    tj: () =>
      `${code('шикастан')}-ро танҳо дар дохили давра ё ${code('интихоб')} навиштан мумкин аст.`,
  },
  'CODEGEN_OUTSIDE_LOOP.continue': {
    en: () => `${code('давом')} can only be used inside a loop.`,
    ru: () => `${code('давом')} можно писать только внутри цикла.`,
    tj: () => `${code('давом')}-ро танҳо дар дохили давра навиштан мумкин аст.`,
  },
  CODEGEN_AWAIT_OUTSIDE_ASYNC: {
    en: () => `${code('интизор')} can only be used inside a ${code('ҳамзамон')} function.`,
    ru: () => `${code('интизор')} можно писать только внутри функции ${code('ҳамзамон')}.`,
    tj: () =>
      `${code('интизор')}-ро танҳо дар дохили функсияи ${code('ҳамзамон')} навиштан мумкин аст.`,
  },
  CODEGEN_INVALID_LABEL: {
    en: p => text(p.detail),
    ru: p => `Метка ${code(p.name)} использована неправильно.`,
    tj: p => `Нишонаи ${code(p.name)} нодуруст истифода шудааст.`,
  },
  CODEGEN_INVALID: {
    en: p => text(p.detail),
    ru: () => 'Эту часть программы нельзя перевести в JavaScript.',
    tj: () => 'Ин қисми барномаро ба JavaScript табдил додан мумкин нест.',
  },
  TARGET_UNSUPPORTED: {
    en: p => text(p.detail),
    ru: () => 'Эта конструкция недоступна в выбранной версии JavaScript.',
    tj: () => 'Ин сохтор дар версияи интихобшудаи JavaScript дастрас нест.',
  },
  BROWSER_NEEDS_TYPESCRIPT: {
    en: p => text(p.detail),
    ru: () =>
      `Эту программу нельзя выполнить в браузере: декораторы, ${code('дастрасӣ')} и ${code('истифода')} здесь не работают. Запустите её через ${code('somon run')}.`,
    tj: () =>
      `Ин барномаро дар браузер иҷро кардан мумкин нест: декораторҳо, ${code('дастрасӣ')} ва ${code('истифода')} дар ин ҷо кор намекунанд. Онро бо ${code('somon run')} иҷро кунед.`,
  },
  OPTION_INVALID: {
    en: p => text(p.detail),
    ru: () => 'Неправильная настройка компилятора.',
    tj: () => 'Танзимоти компилятор нодуруст аст.',
  },
  MODULE_NOT_FOUND: {
    en: p => `Cannot find the module ${code(p.specifier)}.`,
    ru: p => `Модуль ${code(p.specifier)} не найден.`,
    tj: p => `Модули ${code(p.specifier)} ёфт нашуд.`,
  },
  MODULE_FILE_NOT_FOUND: {
    en: p => `Cannot find the file ${code(p.file)}.`,
    ru: p => `Файл ${code(p.file)} не найден.`,
    tj: p => `Файли ${code(p.file)} ёфт нашуд.`,
  },
  CIRCULAR_DEPENDENCY: {
    en: p => `Modules import each other in a circle: ${code(p.cycle)}.`,
    ru: p => `Модули импортируют друг друга по кругу: ${code(p.cycle)}.`,
    tj: p => `Модулҳо якдигарро даврвор ворид мекунанд: ${code(p.cycle)}.`,
  },
  MODULE_ERROR: {
    en: p => text(p.detail),
    ru: () => 'Модуль не удалось загрузить.',
    tj: () => 'Модулро бор кардан нашуд.',
  },
};

/** Advice after a message (`Diagnostic.hint`). */
export const HINTS: Readonly<Record<string, CatalogEntry>> = {
  DID_YOU_MEAN: {
    en: p => `Did you mean ${code(p.name)}?`,
    ru: p => `Может быть, вы имели в виду ${code(p.name)}?`,
    tj: p => `Шояд ${code(p.name)}-ро дар назар доштед?`,
  },
  ENGLISH_KEYWORD: {
    en: p => `Write ${code(p.tajik)} instead of ${code(p.english)}.`,
    ru: p => `Вместо ${code(p.english)} пишите ${code(p.tajik)}.`,
    tj: p => `Ба ҷои ${code(p.english)} ${code(p.tajik)} нависед.`,
  },
  DECLARE_FIRST: {
    en: () => `Declare it with ${code('тағ')} or ${code('собит')} before using it.`,
    ru: () => `Объявите его через ${code('тағ')} или ${code('собит')} до использования.`,
    tj: () => `Пеш аз истифода онро бо ${code('тағ')} ё ${code('собит')} эълон кунед.`,
  },
  ARGUMENT_COMMA: {
    en: () => `Separate arguments with a comma: ${code('чоп(1, 2)')}.`,
    ru: () => `Разделяйте аргументы запятой: ${code('чоп(1, 2)')}.`,
    tj: () => `Аргументҳоро бо вергул ҷудо кунед: ${code('чоп(1, 2)')}.`,
  },
  FOR_SEMICOLONS: {
    en: () =>
      `Separate the parts of ${code('барои')} with ${code(';')}: ${code('барои (тағ и = 0; и < 5; и++)')}.`,
    ru: () =>
      `Части ${code('барои')} разделяются знаком ${code(';')}: ${code('барои (тағ и = 0; и < 5; и++)')}.`,
    tj: () =>
      `Қисмҳои ${code('барои')}-ро бо ${code(';')} ҷудо кунед: ${code('барои (тағ и = 0; и < 5; и++)')}.`,
  },
  USE_TAG: {
    en: () => `If the value must change, declare it with ${code('тағ')}.`,
    ru: () => `Если значение должно меняться, объявите его через ${code('тағ')}.`,
    tj: () => `Агар қимат бояд иваз шавад, онро бо ${code('тағ')} эълон кунед.`,
  },
  NO_REDECLARE: {
    en: p =>
      `To change its value, do not repeat ${code('тағ')}: write ${code(`${text(p.name)} = …`)}.`,
    ru: p =>
      `Чтобы изменить значение, не повторяйте ${code('тағ')}: напишите ${code(`${text(p.name)} = …`)}.`,
    tj: p =>
      `Барои иваз кардани қимат ${code('тағ')}-ро такрор накунед: ${code(`${text(p.name)} = …`)} нависед.`,
  },
  NUMBER_IN_QUOTES: {
    en: p => `Write the number without quotes: ${code(p.value)}.`,
    ru: p => `Пишите число без кавычек: ${code(p.value)}.`,
    tj: p => `Рақамро бе нохунак нависед: ${code(p.value)}.`,
  },
  HAS_FOR_MAP_SET: {
    en: () => `Use ${code('дорадКалид')} to test whether a value is there.`,
    ru: () => `Чтобы проверить, есть ли значение, используйте ${code('дорадКалид')}.`,
    tj: () => `Барои санҷидани он ки қимат ҳаст ё не, ${code('дорадКалид')}-ро истифода баред.`,
  },
  RENAME: {
    en: () => 'Choose another name.',
    ru: () => 'Выберите другое имя.',
    tj: () => 'Номи дигар интихоб кунед.',
  },
  CHECK_PATH: {
    en: () => 'Check the path and the name of the file.',
    ru: () => 'Проверьте путь и имя файла.',
    tj: () => 'Роҳ ва номи файлро санҷед.',
  },
};

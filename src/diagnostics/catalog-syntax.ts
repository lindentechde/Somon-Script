/**
 * Messages for code that cannot be read: the lexer's and the parser's errors,
 * after src/diagnostics/classify.ts has told what they are about. These are
 * written for learners in every language; `compile()` without a language
 * still returns the parser's own English text.
 */
import { code, codes, text, type CatalogEntry } from './text';
import type { DiagnosticParams } from './types';

/** What a parameter `found` shows: the token, or the end of the program. */
function found(p: DiagnosticParams, endOfProgram: string): string {
  return p.found === undefined ? endOfProgram : code(p.found);
}

/** Where the bracket being closed was opened, as the second sentence of a message. */
function opened(p: DiagnosticParams, sameLine: string, onLine: string): string {
  if (p.openLine === undefined) return '';
  return p.openLine === p.line ? ` ${sameLine}` : ` ${onLine.replace('{0}', text(p.openLine))}`;
}

/** Names the parser expects, by kind (`PARSE_EXPECTED_NAME`). */
const NAMES: Readonly<Record<string, { en: string; ru: string; tj: string }>> = {
  variable: { en: 'a variable name', ru: 'имя переменной', tj: 'номи тағйирёбанда' },
  property: { en: 'a property name', ru: 'имя свойства', tj: 'номи хосият' },
  identifier: { en: 'a name', ru: 'имя', tj: 'ном' },
  function: { en: 'a function name', ru: 'имя функции', tj: 'номи функсия' },
  module: {
    en: 'a module path in quotes',
    ru: 'путь к модулю в кавычках',
    tj: 'роҳи модул дар нохунак',
  },
  enumMember: {
    en: 'the name of an enum member',
    ru: 'имя элемента перечисления',
    tj: 'номи узви шумориш',
  },
  namespace: { en: 'a namespace name', ru: 'имя пространства имён', tj: 'номи номфазо' },
  class: { en: 'a class name', ru: 'имя класса', tj: 'номи синф' },
  decorator: { en: 'a decorator name', ru: 'имя декоратора', tj: 'номи декоратор' },
  type: { en: 'a type name', ru: 'имя типа', tj: 'номи навъ' },
  declaration: { en: 'a declaration', ru: 'объявление', tj: 'эълон' },
};

function nameOf(p: DiagnosticParams, language: 'en' | 'ru' | 'tj'): string {
  return (NAMES[text(p.what)] ?? NAMES.identifier)[language];
}

export const SYNTAX_MESSAGES: Readonly<Record<string, CatalogEntry>> = {
  PARSE_MISSING_CLOSE: {
    en: p =>
      `Missing closing ${code(p.close)}.${opened(p, `The ${code(p.open)} was opened on this line.`, `The ${code(p.open)} was opened on line {0}.`)}`,
    ru: p =>
      `Не хватает закрывающей скобки ${code(p.close)}.${opened(p, `Скобка ${code(p.open)} открыта в этой же строке.`, `Скобка ${code(p.open)} открыта в строке {0}.`)}`,
    tj: p =>
      `Қавси пӯшандаи ${code(p.close)} намерасад.${opened(p, `Қавси ${code(p.open)} дар ҳамин сатр кушода шудааст.`, `Қавси ${code(p.open)} дар сатри {0} кушода шудааст.`)}`,
  },
  PARSE_UNMATCHED_CLOSE: {
    en: p => `Unexpected ${code(p.close)}: there is no opening bracket for it.`,
    ru: p => `Лишняя скобка ${code(p.close)}: для неё нет открывающей.`,
    tj: p => `Қавси ${code(p.close)} зиёдатӣ аст: барои он қавси кушода нест.`,
  },
  PARSE_EXPECTED_OPEN: {
    en: p =>
      p.after === undefined
        ? `Expected ${code(p.open)} here.`
        : `Expected ${code(p.open)} after ${code(p.after)}.`,
    ru: p =>
      p.after === undefined
        ? `Здесь нужна скобка ${code(p.open)}.`
        : `После ${code(p.after)} нужна скобка ${code(p.open)}.`,
    tj: p =>
      p.after === undefined
        ? `Дар ин ҷо қавси ${code(p.open)} лозим аст.`
        : `Пас аз ${code(p.after)} қавси ${code(p.open)} лозим аст.`,
  },
  PARSE_CONDITION_PARENS: {
    en: p => `Expected ${code('(')} after ${code(p.keyword)}. For example: ${code(p.example)}`,
    ru: p => `После ${code(p.keyword)} нужна скобка ${code('(')}. Например: ${code(p.example)}`,
    tj: p => `Пас аз ${code(p.keyword)} қавси ${code('(')} лозим аст. Масалан: ${code(p.example)}`,
  },
  PARSE_EXPECTED_SEMICOLON: {
    en: p =>
      p.found === undefined
        ? `Expected ${code(';')} at the end of the program.`
        : `Unexpected ${code(p.found)}: a ${code(';')} may be missing before it.`,
    ru: p =>
      p.found === undefined
        ? `В конце программы не хватает ${code(';')}.`
        : `Здесь не ожидалось ${code(p.found)}: возможно, перед ним не хватает ${code(';')}.`,
    tj: p =>
      p.found === undefined
        ? `Дар охири барнома ${code(';')} намерасад.`
        : `Дар ин ҷо ${code(p.found)} интизор набуд: шояд пеш аз он ${code(';')} намерасад.`,
  },
  PARSE_EXPECTED_TOKEN: {
    en: p =>
      `Expected ${codes(p.expected, 'en')} here, but found ${found(p, 'the end of the program')}.`,
    ru: p =>
      p.found === undefined
        ? `Здесь нужно ${codes(p.expected, 'ru')}, но программа закончилась.`
        : `Здесь нужно ${codes(p.expected, 'ru')}, а написано ${code(p.found)}.`,
    tj: p =>
      p.found === undefined
        ? `Дар ин ҷо ${codes(p.expected, 'tj')} лозим аст, вале барнома тамом шуд.`
        : `Дар ин ҷо ${codes(p.expected, 'tj')} лозим аст, вале ${code(p.found)} навишта шудааст.`,
  },
  PARSE_EXPECTED_NAME: {
    en: p => `Expected ${nameOf(p, 'en')} here, but found ${found(p, 'the end of the program')}.`,
    ru: p =>
      p.found === undefined
        ? `Здесь нужно ${nameOf(p, 'ru')}, но программа закончилась.`
        : `Здесь нужно ${nameOf(p, 'ru')}, а написано ${code(p.found)}.`,
    tj: p =>
      p.found === undefined
        ? `Дар ин ҷо ${nameOf(p, 'tj')} лозим аст, вале барнома тамом шуд.`
        : `Дар ин ҷо ${nameOf(p, 'tj')} лозим аст, вале ${code(p.found)} навишта шудааст.`,
  },
  PARSE_EXPECTED_EXPRESSION: {
    en: p =>
      `Expected a value or an expression here, but found ${found(p, 'the end of the program')}.`,
    ru: p =>
      p.found === undefined
        ? 'Здесь нужно значение или выражение, но программа закончилась.'
        : `Здесь нужно значение или выражение, а написано ${code(p.found)}.`,
    tj: p =>
      p.found === undefined
        ? 'Дар ин ҷо қимат ё ифода лозим аст, вале барнома тамом шуд.'
        : `Дар ин ҷо қимат ё ифода лозим аст, вале ${code(p.found)} навишта шудааст.`,
  },
  PARSE_UNEXPECTED_TOKEN: {
    en: p => `Unexpected ${found(p, 'end of the program')} here.`,
    ru: p => `Здесь не ожидалось ${found(p, 'конца программы')}.`,
    tj: p =>
      p.found === undefined
        ? 'Барнома дар ин ҷо бояд тамом намешуд.'
        : `Дар ин ҷо ${code(p.found)} интизор набуд.`,
  },
  PARSE_DUPLICATE_DEFAULT_CASE: {
    en: () => `A ${code('интихоб')} can have only one ${code('пешфарз')} case.`,
    ru: () => `В ${code('интихоб')} может быть только один ${code('пешфарз')}.`,
    tj: () => `Дар ${code('интихоб')} танҳо як ${code('пешфарз')} буда метавонад.`,
  },
  PARSE_SHORTHAND_INITIALIZER: {
    en: () =>
      `In an object, write ${code(':')} after a property name, not ${code('=')}: ${code('{ ном: қимат }')}.`,
    ru: () =>
      `В объекте после имени свойства пишите ${code(':')}, а не ${code('=')}: ${code('{ ном: қимат }')}.`,
    tj: () =>
      `Дар объект пас аз номи хосият ${code(':')} нависед, на ${code('=')}: ${code('{ ном: қимат }')}.`,
  },
  PARSE_INVALID_MODIFIER: {
    en: p => text(p.detail),
    ru: p => `Слово ${code(p.modifier)} здесь использовать нельзя.`,
    tj: p => `Калимаи ${code(p.modifier)}-ро дар ин ҷо истифода бурдан мумкин нест.`,
  },
  PARSE_INVALID_DECLARATION: {
    en: p => text(p.detail),
    ru: () => 'Такое объявление здесь недопустимо.',
    tj: () => 'Чунин эълон дар ин ҷо нодуруст аст.',
  },
  PARSE_INVALID_TYPE: {
    en: p => text(p.detail),
    ru: () => 'Тип записан неправильно.',
    tj: () => 'Навъ нодуруст навишта шудааст.',
  },
  PARSE_INVALID_IMPORT_EXPORT: {
    en: p => text(p.detail),
    ru: () => `${code('ворид')} или ${code('содир')} записан неправильно.`,
    tj: () => `${code('ворид')} ё ${code('содир')} нодуруст навишта шудааст.`,
  },
  PARSE_INVALID_CLASS_MEMBER: {
    en: p => text(p.detail),
    ru: () => 'Член класса записан неправильно.',
    tj: () => 'Узви синф нодуруст навишта шудааст.',
  },
  PARSE_TOO_DEEP: {
    en: () => 'The program nests too deeply to be read.',
    ru: () => 'Программа слишком глубоко вложена: её нельзя прочитать.',
    tj: () => 'Қисмҳои барнома аз ҳад зиёд дар дохили якдигар ҷойгир шудаанд.',
  },
  PARSE_INVALID_SYNTAX: {
    en: p => text(p.detail),
    ru: () => 'Здесь ошибка в записи программы.',
    tj: () => 'Дар ин ҷо барнома нодуруст навишта шудааст.',
  },
  LEX_UNTERMINATED_STRING: {
    en: p => `Missing closing quote ${code(p.quote)}: the string that starts here is not closed.`,
    ru: p =>
      `Не хватает закрывающей кавычки ${code(p.quote)}: строка, которая начинается здесь, не закрыта.`,
    tj: p =>
      `Нохунаки пӯшандаи ${code(p.quote)} намерасад: матне, ки дар ин ҷо оғоз шуд, баста нашудааст.`,
  },
  LEX_UNTERMINATED_TEMPLATE: {
    en: () => 'The template string that starts here is not closed with a backtick («`»).',
    ru: () => 'Шаблонная строка, которая начинается здесь, не закрыта обратной кавычкой «`».',
    tj: () => 'Қолаби матнӣ, ки дар ин ҷо оғоз шуд, бо нохунаки «`» баста нашудааст.',
  },
  LEX_UNTERMINATED_COMMENT: {
    en: () => `The comment ${code('/*')} is not closed with ${code('*/')}.`,
    ru: () => `Комментарий ${code('/*')} не закрыт символами ${code('*/')}.`,
    tj: () => `Шарҳи ${code('/*')} бо ${code('*/')} баста нашудааст.`,
  },
  LEX_INVALID_NUMBER: {
    en: p => `Invalid number: ${text(p.reason)}.`,
    ru: () => 'Число записано неправильно.',
    tj: () => 'Рақам нодуруст навишта шудааст.',
  },
  LEX_INVALID_ESCAPE: {
    en: () => `Invalid escape sequence after ${code('\\')} in a string.`,
    ru: () => `После ${code('\\')} в строке стоит недопустимый символ.`,
    tj: () => `Пас аз ${code('\\')} дар матн аломати нодуруст омадааст.`,
  },
  LEX_UNEXPECTED_CHARACTER: {
    en: p => `The character ${code(p.character)} cannot be used here.`,
    ru: p => `Символ ${code(p.character)} здесь использовать нельзя.`,
    tj: p => `Аломати ${code(p.character)}-ро дар ин ҷо истифода бурдан мумкин нест.`,
  },
  LEX_INVALID_REGEXP: {
    en: p => `Invalid regular expression: ${text(p.detail)}.`,
    ru: () => 'Регулярное выражение записано неправильно.',
    tj: () => 'Ифодаи муқаррарӣ нодуруст навишта шудааст.',
  },
};

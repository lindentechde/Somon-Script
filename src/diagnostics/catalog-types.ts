/**
 * Messages of the type checker. The English text of each entry is the one the
 * checker has always reported (`compile()` without a language returns it
 * unchanged); the Russian and Tajik ones are written for learners. Types are
 * named as SomonScript writes them (`рақам`, `сатр[]`), members by the name
 * the program uses (`дарозӣ`, not `length`).
 */
import { code, codes, isLiteralType, tajikType, text, type CatalogEntry } from './text';
import type { DiagnosticParams } from './types';

/** `'дарозӣ'` or `'дарозӣ' (length)`: a member and, when it differs, its JavaScript name. */
function shownMember(p: DiagnosticParams): string {
  return p.jsName === undefined || p.jsName === p.name
    ? `'${text(p.name)}'`
    : `'${text(p.name)}' (${text(p.jsName)})`;
}

/** `Қимати "панҷ"` for a literal type, `Навъи сатр` for another type. */
function valueOrType(type: DiagnosticParams[string], words: { value: string; type: string }) {
  return `${isLiteralType(type) ? words.value : words.type} ${code(tajikType(type))}`;
}

/** The number of arguments a function takes: `2`, `1-2`, `at least 1`. */
function expectedCount(p: DiagnosticParams, words: { range: string; atLeast: string }): string {
  if (p.max === undefined) return words.atLeast.replace('{0}', text(p.min));
  if (p.min === p.max) return text(p.min);
  return words.range.replace('{0}', text(p.min)).replace('{1}', text(p.max));
}

/** The function a call names, or nothing for an anonymous one. */
function functionName(p: DiagnosticParams): string {
  return p.function === undefined ? '' : ` ${code(p.function)}`;
}

export const TYPE_MESSAGES: Readonly<Record<string, CatalogEntry>> = {
  TYPE_NOT_ASSIGNABLE: {
    en: p => `Type '${text(p.source)}' is not assignable to type '${text(p.target)}'`,
    ru: p =>
      `${valueOrType(p.source, { value: 'Значение', type: 'Тип' })} не подходит к типу ${code(tajikType(p.target))}.`,
    tj: p =>
      `${valueOrType(p.source, { value: 'Қимати', type: 'Навъи' })} ба навъи ${code(tajikType(p.target))} мувофиқ нест.`,
  },
  'TYPE_NOT_ASSIGNABLE.return': {
    en: p => `Type '${text(p.source)}' is not assignable to return type '${text(p.target)}'`,
    ru: p =>
      `Функция должна возвращать ${code(tajikType(p.target))}, а возвращает ${code(tajikType(p.source))}.`,
    tj: p =>
      `Функсия бояд қимати навъи ${code(tajikType(p.target))} баргардонад, вале ${code(tajikType(p.source))} бармегардонад.`,
  },
  'TYPE_NOT_ASSIGNABLE.property': {
    en: p =>
      `Type '${text(p.source)}' is not assignable to type '${text(p.target)}' for property '${text(p.property)}'`,
    ru: p =>
      `Свойство ${code(p.property)}: ${valueOrType(p.source, { value: 'значение', type: 'тип' })} не подходит к типу ${code(tajikType(p.target))}.`,
    tj: p =>
      `Хосияти ${code(p.property)}: ${valueOrType(p.source, { value: 'қимати', type: 'навъи' })} ба навъи ${code(tajikType(p.target))} мувофиқ нест.`,
  },
  'TYPE_NOT_ASSIGNABLE.excessProperty': {
    en: p =>
      `Object literal may only specify known properties, and '${text(p.property)}' does not exist in type '${text(p.target)}'`,
    ru: p => `В типе ${code(tajikType(p.target))} нет свойства ${code(p.property)}.`,
    tj: p => `Дар навъи ${code(tajikType(p.target))} хосияти ${code(p.property)} нест.`,
  },
  'TYPE_NOT_ASSIGNABLE.conversion': {
    en: p =>
      `Conversion of type '${text(p.source)}' to type '${text(p.target)}' may be a mistake because neither type sufficiently overlaps with the other; assert to 'ношинос' first if this is intended`,
    ru: p =>
      `Преобразование типа ${code(tajikType(p.source))} в ${code(tajikType(p.target))}, вероятно, ошибка: эти типы почти не совместимы. Если это сделано намеренно, сначала приведите значение к ${code('ношинос')}.`,
    tj: p =>
      `Табдили навъи ${code(tajikType(p.source))} ба ${code(tajikType(p.target))} шояд хато бошад: ин навъҳо қариб мувофиқ нестанд. Агар ин қасдан бошад, аввал ба ${code('ношинос')} табдил диҳед.`,
  },
  'TYPE_NOT_ASSIGNABLE.constAssertion': {
    en: () =>
      `A 'чун собит' assertion can only be applied to string, number, boolean, array or object literals`,
    ru: () =>
      `${code('чун собит')} можно применять только к строке, числу, логическому значению, массиву или объекту, записанным прямо в коде.`,
    tj: () =>
      `${code('чун собит')}-ро танҳо ба сатр, рақам, қимати мантиқӣ, рӯйхат ё объекте, ки дар худи код навишта шудааст, истифода бурдан мумкин аст.`,
  },
  'TYPE_NOT_ASSIGNABLE.satisfies': {
    en: p => `Type '${text(p.source)}' does not satisfy the expected type '${text(p.expected)}'`,
    ru: p =>
      `Тип ${code(tajikType(p.source))} не соответствует ожидаемому типу ${code(tajikType(p.expected))}.`,
    tj: p =>
      `Навъи ${code(tajikType(p.source))} ба навъи интизоршудаи ${code(tajikType(p.expected))} мувофиқ нест.`,
  },
  UNDEFINED_IDENTIFIER: {
    en: p => `Variable '${text(p.name)}' is not defined`,
    ru: p => `Имя ${code(p.name)} не объявлено.`,
    tj: p => `Номи ${code(p.name)} эълон нашудааст.`,
  },
  'UNDEFINED_IDENTIFIER.parameter': {
    en: p => `Cannot find parameter '${text(p.name)}'`,
    ru: p => `Параметр ${code(p.name)} не найден.`,
    tj: p => `Параметри ${code(p.name)} ёфт нашуд.`,
  },
  PROPERTY_NOT_FOUND: {
    en: p =>
      `Property ${shownMember(p)} does not exist on type '${text(p.type)}'${p.mapSet ? `; use 'дорадКалид' (has) to test membership` : ''}`,
    ru: p => `В типе ${code(tajikType(p.type))} нет свойства ${code(p.name)}.`,
    tj: p => `Дар навъи ${code(tajikType(p.type))} хосияти ${code(p.name)} нест.`,
  },
  'PROPERTY_NOT_FOUND.static': {
    en: p => `Property ${shownMember(p)} does not exist on class '${text(p.class)}'`,
    ru: p => `В классе ${code(p.class)} нет статического свойства ${code(p.name)}.`,
    tj: p => `Дар синфи ${code(p.class)} хосияти статикии ${code(p.name)} нест.`,
  },
  'PROPERTY_NOT_FOUND.builtinObject': {
    en: p => `Property ${shownMember(p)} does not exist on '${text(p.object)}'`,
    ru: p => `У ${code(p.object)} нет свойства ${code(p.name)}.`,
    tj: p => `${code(p.object)} хосияти ${code(p.name)} надорад.`,
  },
  'PROPERTY_NOT_FOUND.noDefaultExport': {
    en: p => `Module '"${text(p.module)}"' has no default export`,
    ru: p => `У модуля ${code(p.module)} нет экспорта по умолчанию (${code('пешфарз')}).`,
    tj: p => `Модули ${code(p.module)} содироти пешфарз (${code('пешфарз')}) надорад.`,
  },
  'PROPERTY_NOT_FOUND.noExportedMember': {
    en: p => `Module '"${text(p.module)}"' has no exported member '${text(p.name)}'`,
    ru: p => `Модуль ${code(p.module)} не экспортирует ${code(p.name)}.`,
    tj: p => `Модули ${code(p.module)} ${code(p.name)}-ро содир намекунад.`,
  },
  ARGUMENT_COUNT_MISMATCH: {
    en: p =>
      `Function '${text(p.function ?? 'anonymous')}' expected ${expectedCount(p, { range: '{0}-{1}', atLeast: 'at least {0}' })} argument(s) but got ${text(p.got)}`,
    ru: p =>
      `Функция${functionName(p)} принимает аргументов: ${expectedCount(p, { range: 'от {0} до {1}', atLeast: 'не менее {0}' })}, а передано: ${text(p.got)}.`,
    tj: p =>
      `Функсия${functionName(p)} ${expectedCount(p, { range: 'аз {0} то {1}', atLeast: 'ақаллан {0}' })} аргумент мегирад, вале ${text(p.got)} аргумент дода шуд.`,
  },
  ARGUMENT_TYPE_MISMATCH: {
    en: p =>
      `Argument ${text(p.index)} of '${text(p.function ?? 'anonymous')}' expected type '${text(p.expected)}' but got '${text(p.got)}'`,
    ru: p =>
      `Аргумент ${text(p.index)} функции${functionName(p)} должен иметь тип ${code(tajikType(p.expected))}, а передано ${code(tajikType(p.got))}.`,
    tj: p =>
      `Аргументи ${text(p.index)}-уми функсия${functionName(p)} бояд навъи ${code(tajikType(p.expected))} дошта бошад, вале ${code(tajikType(p.got))} дода шуд.`,
  },
  POSSIBLY_NULL: {
    en: p =>
      `${p.reference === undefined ? 'Object' : `'${text(p.reference)}'`} is possibly ${(p.values as readonly string[]).map(value => `'${value}'`).join(' or ')}`,
    ru: p =>
      `${p.reference === undefined ? 'Значение' : code(p.reference)} может быть ${codes(p.values, 'ru')}: сначала проверьте это.`,
    tj: p =>
      `${p.reference === undefined ? 'Қимат' : code(p.reference)} шояд ${codes(p.values, 'tj')} бошад: аввал инро санҷед.`,
  },
  READONLY_ASSIGNMENT: {
    en: p => `Cannot assign to '${text(p.name)}' because it is a read-only property`,
    ru: p => `Свойству ${code(p.name)} нельзя присвоить значение: оно только для чтения.`,
    tj: p => `Ба хосияти ${code(p.name)} қимат додан мумкин нест: он танҳо барои хондан аст.`,
  },
  'READONLY_ASSIGNMENT.element': {
    en: p =>
      `Cannot assign to an element of ${p.reference === undefined ? 'Object' : `'${text(p.reference)}'`}: '${text(p.type)}' is read-only`,
    ru: p =>
      `Элементам ${p.reference === undefined ? 'этого массива' : code(p.reference)} нельзя присваивать значения: тип ${code(tajikType(p.type))} только для чтения.`,
    tj: p =>
      `Ба унсурҳои ${p.reference === undefined ? 'ин рӯйхат' : code(p.reference)} қимат додан мумкин нест: навъи ${code(tajikType(p.type))} танҳо барои хондан аст.`,
  },
  USED_BEFORE_INITIALIZATION: {
    en: p =>
      `Property '${text(p.name)}' is used before its initialization: field initializers run before the constructor assigns parameter properties`,
    ru: p =>
      `Свойство ${code(p.name)} используется до того, как получило значение: начальные значения полей вычисляются раньше конструктора.`,
    tj: p =>
      `Хосияти ${code(p.name)} пеш аз гирифтани қимат истифода шудааст: қиматҳои ибтидоии майдонҳо пеш аз конструктор ҳисоб мешаванд.`,
  },
  NO_MATCHING_OVERLOAD: {
    en: p =>
      `No overload of '${text(p.function ?? 'anonymous')}' matches this call. Overloads: ${text(p.overloads)}`,
    ru: p =>
      `Ни один вариант функции${functionName(p)} не подходит к этому вызову. Варианты: ${tajikType(p.overloads)}`,
    tj: p =>
      `Ҳеҷ як варианти функсия${functionName(p)} ба ин даъват мувофиқ нест. Вариантҳо: ${tajikType(p.overloads)}`,
  },
  'INVALID_OVERRIDE.noBase': {
    en: p =>
      `This member cannot have an 'бознавис' (override) modifier because its containing class '${text(p.class)}' does not extend another class`,
    ru: p =>
      `Здесь нельзя писать ${code('бознавис')}: класс ${code(p.class)} не наследует другой класс.`,
    tj: p =>
      `Дар ин ҷо ${code('бознавис')} навиштан мумкин нест: синфи ${code(p.class)} аз синфи дигар мерос намегирад.`,
  },
  'INVALID_OVERRIDE.notInBase': {
    en: p =>
      `This member cannot have an 'бознавис' (override) modifier because it is not declared in the base class '${text(p.base)}'`,
    ru: p =>
      `Здесь нельзя писать ${code('бознавис')}: в базовом классе ${code(p.base)} нет такого члена.`,
    tj: p =>
      `Дар ин ҷо ${code('бознавис')} навиштан мумкин нест: дар синфи асосии ${code(p.base)} чунин узв нест.`,
  },
  TYPE_ONLY_IMPORT_VALUE: {
    en: p =>
      `'${text(p.name)}' cannot be used as a value because it was imported using 'ворид навъ'`,
    ru: p =>
      `${code(p.name)} импортирован только как тип (${code('ворид навъ')}), его нельзя использовать как значение.`,
    tj: p =>
      `${code(p.name)} танҳо ҳамчун навъ ворид шудааст (${code('ворид навъ')}) ва онро ҳамчун қимат истифода бурдан мумкин нест.`,
  },
  ABSTRACT_INSTANTIATION: {
    en: p => `Cannot create an instance of an abstract class '${text(p.class)}'`,
    ru: p => `Нельзя создать объект абстрактного класса ${code(p.class)}.`,
    tj: p => `Аз синфи мавҳуми ${code(p.class)} объект сохтан мумкин нест.`,
  },
  'CONSTANT_CONDITION.truthy': {
    en: () => 'This kind of expression is always truthy',
    ru: () => 'Такое выражение всегда истинно: условие ничего не проверяет.',
    tj: () => 'Чунин ифода ҳамеша дуруст аст: шарт ҳеҷ чизро намесанҷад.',
  },
  'CONSTANT_CONDITION.falsy': {
    en: () => 'This kind of expression is always falsy',
    ru: () => 'Такое выражение всегда ложно: условие никогда не выполнится.',
    tj: () => 'Чунин ифода ҳамеша нодуруст аст: шарт ҳеҷ гоҳ иҷро намешавад.',
  },
  'CONSTANT_CONDITION.neverNullish': {
    en: () => 'Right operand of ?? is unreachable because the left operand is never nullish',
    ru: () =>
      `Правая часть ${code('??')} никогда не вычисляется: левая часть никогда не бывает ${code('холӣ')} или ${code('беқимат')}.`,
    tj: () =>
      `Тарафи рости ${code('??')} ҳеҷ гоҳ ҳисоб намешавад: тарафи чап ҳеҷ гоҳ ${code('холӣ')} ё ${code('беқимат')} намешавад.`,
  },
  'CONSTANT_CONDITION.alwaysNullish': {
    en: () => 'This expression is always nullish',
    ru: () => `Это выражение всегда ${code('холӣ')} или ${code('беқимат')}.`,
    tj: () => `Ин ифода ҳамеша ${code('холӣ')} ё ${code('беқимат')} аст.`,
  },
  TYPE_NOT_FOUND: {
    en: p => `Cannot find type '${text(p.name)}'`,
    ru: p => `Тип ${code(p.name)} не найден.`,
    tj: p => `Навъи ${code(p.name)} ёфт нашуд.`,
  },
  CLASS_NOT_FOUND: {
    en: p => `Base class '${text(p.name)}' not found`,
    ru: p => `Базовый класс ${code(p.name)} не найден.`,
    tj: p => `Синфи асосии ${code(p.name)} ёфт нашуд.`,
  },
  INVALID_EXTENDS: {
    en: p =>
      `Class '${text(p.class)}' can only extend other classes, but '${text(p.parent)}' is ${p.kind === 'interface' ? 'an interface' : `a ${text(p.kind)}`}`,
    ru: p =>
      `Класс ${code(p.class)} может наследовать только другой класс, а ${code(p.parent)} — ${p.kind === 'interface' ? 'интерфейс' : 'не класс'}.`,
    tj: p =>
      `Синфи ${code(p.class)} танҳо аз синфи дигар мерос гирифта метавонад, вале ${code(p.parent)} ${p.kind === 'interface' ? 'интерфейс' : 'синф нест'}.`,
  },
  CIRCULAR_INHERITANCE: {
    en: p => `Circular inheritance detected involving class '${text(p.class)}'`,
    ru: p => `Классы наследуют друг друга по кругу (в том числе ${code(p.class)}).`,
    tj: p => `Синфҳо даврвор аз ҳамдигар мерос мегиранд (аз ҷумла ${code(p.class)}).`,
  },
  'CIRCULAR_INHERITANCE.self': {
    en: p => `Circular inheritance detected: class '${text(p.class)}' cannot extend itself`,
    ru: p => `Класс ${code(p.class)} не может наследовать сам себя.`,
    tj: p => `Синфи ${code(p.class)} аз худаш мерос гирифта наметавонад.`,
  },
  NOT_CALLABLE: {
    en: p => `'${text(p.name)}' is not a function and cannot be called`,
    ru: p => `${code(p.name)} — не функция, его нельзя вызвать.`,
    tj: p => `${code(p.name)} функсия нест ва онро даъват кардан мумкин нест.`,
  },
  CONST_ASSIGNMENT: {
    en: p => `Cannot assign to '${text(p.name)}' because it is a constant`,
    ru: p =>
      `Нельзя присвоить новое значение ${code(p.name)}: оно объявлено через ${code('собит')}.`,
    tj: p =>
      `Ба ${code(p.name)} қимати нав додан мумкин нест, зеро он бо ${code('собит')} эълон шудааст.`,
  },
  ASSIGNMENT_IN_CONDITION: {
    en: () => `The condition assigns a value with '=': to compare values, write '===' or '=='`,
    ru: () =>
      `В условии ${code('=')} присваивает значение. Чтобы сравнить значения, пишите ${code('===')} или ${code('==')}.`,
    tj: () =>
      `Дар шарт ${code('=')} қимат медиҳад. Барои муқоисаи қиматҳо ${code('===')} ё ${code('==')} нависед.`,
  },
};

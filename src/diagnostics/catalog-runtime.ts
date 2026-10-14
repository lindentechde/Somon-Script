/**
 * Messages for errors of a running program (src/runtime/errors.ts tells what
 * an error is about): reading a member of `беқимат`, a name that is not
 * defined, calling what is no function, endless recursion, … and the errors a
 * program throws itself with `партофтан`.
 */
import { code, text, type CatalogEntry } from './text';

export const RUNTIME_MESSAGES: Readonly<Record<string, CatalogEntry>> = {
  RUNTIME_READ_OF_NOTHING: {
    en: p => `Cannot read the property ${code(p.property)}: the value is ${code(p.value)}.`,
    ru: p => `Нельзя прочитать свойство ${code(p.property)}: значение — ${code(p.value)}.`,
    tj: p => `Хосияти ${code(p.property)}-ро хондан мумкин нест: қимат ${code(p.value)} аст.`,
  },
  RUNTIME_WRITE_TO_NOTHING: {
    en: p => `Cannot set the property ${code(p.property)}: the value is ${code(p.value)}.`,
    ru: p => `Нельзя задать свойство ${code(p.property)}: значение — ${code(p.value)}.`,
    tj: p => `Ба хосияти ${code(p.property)} қимат додан мумкин нест: объект ${code(p.value)} аст.`,
  },
  RUNTIME_NOT_DEFINED: {
    en: p => `${code(p.name)} is not defined.`,
    ru: p => `Имя ${code(p.name)} не определено.`,
    tj: p => `Номи ${code(p.name)} муайян нашудааст.`,
  },
  RUNTIME_BEFORE_DECLARATION: {
    en: p => `${code(p.name)} is used before it is declared.`,
    ru: p => `${code(p.name)} используется раньше, чем объявлено.`,
    tj: p => `${code(p.name)} пеш аз эълон шуданаш истифода шудааст.`,
  },
  RUNTIME_NOT_A_FUNCTION: {
    en: p => `${code(p.name)} is not a function and cannot be called.`,
    ru: p => `${code(p.name)} — не функция, её нельзя вызвать.`,
    tj: p => `${code(p.name)} функсия нест ва онро даъват кардан мумкин нест.`,
  },
  RUNTIME_NOT_A_CONSTRUCTOR: {
    en: p => `${code(p.name)} cannot be used with ${code('нав')}.`,
    ru: p => `${code(p.name)} нельзя использовать с ${code('нав')}.`,
    tj: p => `${code(p.name)}-ро бо ${code('нав')} истифода бурдан мумкин нест.`,
  },
  RUNTIME_NOT_ITERABLE: {
    en: p => `${code(p.name)} is not a list: ${code('барои … аз')} cannot go through it.`,
    ru: p => `${code(p.name)} — не список: ${code('барои … аз')} не может по нему пройти.`,
    tj: p => `${code(p.name)} рӯйхат нест: ${code('барои … аз')} аз он гузашта наметавонад.`,
  },
  RUNTIME_STACK_OVERFLOW: {
    en: () => 'Functions called each other too deeply. Maybe a function calls itself without end?',
    ru: () =>
      'Функции вызвали друг друга слишком глубоко. Может быть, функция вызывает сама себя без конца?',
    tj: () =>
      'Функсияҳо якдигарро аз ҳад зиёд амиқ даъват карданд. Шояд функсия худашро беохир даъват мекунад?',
  },
  RUNTIME_INVALID_ARRAY_LENGTH: {
    en: () => 'Invalid length of a list: it must be a whole number, 0 or more.',
    ru: () => 'Неправильная длина массива: это должно быть целое число, не меньше 0.',
    tj: () => 'Дарозии рӯйхат нодуруст аст: он бояд рақами бутун, аз 0 зиёд ё баробар бошад.',
  },
  RUNTIME_CONST_ASSIGNMENT: {
    en: () => `A ${code('собит')} cannot get a new value.`,
    ru: () => `Значению ${code('собит')} нельзя присвоить новое значение.`,
    tj: () => `Ба ${code('собит')} қимати нав додан мумкин нест.`,
  },
  RUNTIME_INPUT_ENDED: {
    en: p => `The input ended: ${code(`${text(p.name)}()`)} expected another line.`,
    ru: p => `Ввод закончился: ${code(`${text(p.name)}()`)} ждала ещё одну строку.`,
    tj: p => `Вуруд тамом шуд: ${code(`${text(p.name)}()`)} боз як сатр интизор буд.`,
  },
  RUNTIME_INPUT_NOT_A_NUMBER: {
    en: p =>
      `${p.text === '' ? 'An empty line' : code(p.text)} is not a number: ${code(`${text(p.name)}()`)} expected one.`,
    ru: p =>
      `${p.text === '' ? 'Пустая строка' : code(p.text)} — не число: ${code(`${text(p.name)}()`)} ждала число.`,
    tj: p =>
      `${p.text === '' ? 'Сатри холӣ' : code(p.text)} рақам нест: ${code(`${text(p.name)}()`)} рақам интизор буд.`,
  },
  RUNTIME_NO_MODULES: {
    en: p =>
      `The playground cannot import the module ${code(p.name)}: write the whole program in one file.`,
    ru: p =>
      `В песочнице нельзя подключить модуль ${code(p.name)}: напишите всю программу в одном файле.`,
    tj: p =>
      `Дар майдони озмоиш модули ${code(p.name)}-ро ворид кардан мумкин нест: тамоми барномаро дар як файл нависед.`,
  },
  INPUT_ASK_AGAIN: {
    en: p => `${p.text === '' ? 'That' : code(p.text)} is not a number. Type a number again:`,
    ru: p => `${p.text === '' ? 'Это' : code(p.text)} — не число. Введите число ещё раз:`,
    tj: p => `${p.text === '' ? 'Ин' : code(p.text)} рақам нест. Боз як бор рақам нависед:`,
  },
  RUNTIME_THROWN: {
    en: p => `The program threw an error: ${text(p.message)}`,
    ru: p => `Программа выбросила ошибку: ${text(p.message)}`,
    tj: p => `Барнома хато партофт: ${text(p.message)}`,
  },
  RUNTIME_ERROR: {
    en: p => `${text(p.name)}: ${text(p.message)}`,
    ru: p => `Ошибка во время выполнения: ${text(p.name)}: ${text(p.message)}`,
    tj: p => `Ҳангоми иҷро хато рух дод: ${text(p.name)}: ${text(p.message)}`,
  },
};

/** Advice after a run-time error. */
export const RUNTIME_HINTS: Readonly<Record<string, CatalogEntry>> = {
  INDEX_OUT_OF_RANGE: {
    en: () =>
      `Maybe the list has no element at this index: indexes go from 0 to ${code('дарозӣ - 1')}.`,
    ru: () =>
      `Может быть, в массиве нет элемента с таким индексом: индексы идут от 0 до ${code('дарозӣ - 1')}.`,
    tj: () =>
      `Шояд дар рӯйхат унсуре бо ин индекс нест: индексҳо аз 0 то ${code('дарозӣ - 1')} мебошанд.`,
  },
  CHECK_VALUE: {
    en: p => `Check that the value is not ${code(p.value)} before using it.`,
    ru: p => `Перед использованием проверьте, что значение не ${code(p.value)}.`,
    tj: p => `Пеш аз истифода санҷед, ки қимат ${code(p.value)} нест.`,
  },
  STOP_CONDITION: {
    en: () =>
      `A function that calls itself needs a condition that stops it: ${code('агар (н <= 1) бозгашт 1;')}`,
    ru: () =>
      `Функции, которая вызывает сама себя, нужно условие остановки: ${code('агар (н <= 1) бозгашт 1;')}`,
    tj: () =>
      `Функсияе, ки худашро даъват мекунад, шарти қатъ лозим дорад: ${code('агар (н <= 1) бозгашт 1;')}`,
  },
  DECLARE_BEFORE_USE: {
    en: () => 'Move the declaration above the line that uses the name.',
    ru: () => 'Перенесите объявление выше строки, где используется имя.',
    tj: () => 'Эълонро аз сатре, ки номро истифода мебарад, болотар гузоред.',
  },
  INPUT_LINES: {
    en: () => 'Give the program as many lines of input as it reads.',
    ru: () => 'Дайте программе столько строк ввода, сколько она читает.',
    tj: () => 'Ба барнома ҳамон қадар сатри вуруд диҳед, ки он мехонад.',
  },
  INPUT_NUMBER: {
    en: () => `Write a number in this line of the input, such as ${code('42')} or ${code('2,5')}.`,
    ru: () => `Напишите в этой строке ввода число, например ${code('42')} или ${code('2,5')}.`,
    tj: () => `Дар ин сатри вуруд рақам нависед, масалан ${code('42')} ё ${code('2,5')}.`,
  },
  SHOW_STACK: {
    en: () => `${code('somon run --stack')} shows where the error came from in full.`,
    ru: () => `${code('somon run --стек')} покажет полный путь вызовов.`,
    tj: () => `${code('somon run --стек')} пайҷои пурраи даъватҳоро нишон медиҳад.`,
  },
};

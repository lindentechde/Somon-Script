/**
 * Warnings of the learning mode (`"режим": "таълимӣ"` in somon.config.json,
 * the playground's «Реҷаи таълимӣ»; src/learner/warnings.ts): mistakes a
 * beginner makes that are valid JavaScript, and so no error.
 */
import { code, text, type CatalogEntry } from './text';

export const LEARNER_MESSAGES: Readonly<Record<string, CatalogEntry>> = {
  LEARNER_STRING_ARITHMETIC: {
    en: p =>
      `${code(p.operator)} computes with a ${code('сатр')}: it is turned into a number, and the result may be ${code('ғайрирақам')}. Read numbers with ${code('хонданиРақам()')}.`,
    ru: p =>
      `${code(p.operator)} вычисляет со строкой: она превращается в число, и результат может оказаться ${code('ғайрирақам')} («не число»). Числа читайте через ${code('хонданиРақам()')}.`,
    tj: p =>
      `Амали ${code(p.operator)} бо сатр ҳисоб мекунад: сатр ба рақам табдил меёбад ва натиҷа метавонад ${code('ғайрирақам')} шавад. Рақамҳоро бо ${code('хонданиРақам()')} хонед.`,
  },
  LEARNER_STRING_PLUS_NUMBER: {
    en: () =>
      `A line read with ${code('хондан()')} is a ${code('сатр')}: ${code('+')} joins it with the number instead of adding (${code('"2" + 3')} is ${code('"23"')}). Read numbers with ${code('хонданиРақам()')}.`,
    ru: () =>
      `Строка, прочитанная через ${code('хондан()')}, — это ${code('сатр')}: ${code('+')} соединяет её с числом, а не складывает (${code('"2" + 3')} — это ${code('"23"')}). Числа читайте через ${code('хонданиРақам()')}.`,
    tj: () =>
      `Сатре, ки бо ${code('хондан()')} хонда шудааст, ${code('сатр')} аст: ${code('+')} онро бо рақам ҷамъ намекунад, балки мепайвандад (${code('"2" + 3')} — ${code('"23"')}). Рақамҳоро бо ${code('хонданиРақам()')} хонед.`,
  },
  LEARNER_COMPARE_TYPES: {
    en: p =>
      `A ${code(p.left)} is compared with a ${code(p.right)}: values of different types are never equal, ${code(`${text(p.operator)}`)} is always the same.`,
    ru: p =>
      `${code(p.left)} сравнивается с ${code(p.right)}: значения разных типов никогда не равны, и ${code(`${text(p.operator)}`)} всегда даёт одно и то же.`,
    tj: p =>
      `${code(p.left)} бо ${code(p.right)} муқоиса мешавад: қиматҳои навъҳои гуногун ҳеҷ гоҳ баробар нестанд ва ${code(`${text(p.operator)}`)} ҳамеша як натиҷа медиҳад.`,
  },
  LEARNER_UNUSED_VARIABLE: {
    en: p => `The variable ${code(p.name)} is declared but never used.`,
    ru: p => `Переменная ${code(p.name)} объявлена, но не используется.`,
    tj: p => `Тағйирёбандаи ${code(p.name)} эълон шудааст, вале истифода намешавад.`,
  },
  LEARNER_BUILTIN_MEMBER_NAME: {
    en: p =>
      `${code(p.name)} is the name of a built-in member: in JavaScript this property is called ${code(p.js)}, and it is printed so. Choose another name.`,
    ru: p =>
      `${code(p.name)} — имя встроенного члена: в JavaScript это свойство называется ${code(p.js)} и так и выводится. Выберите другое имя.`,
    tj: p =>
      `${code(p.name)} номи узви дарунсохт аст: дар JavaScript ин хосият ${code(p.js)} ном дорад ва ҳангоми чоп ҳамин тавр нишон дода мешавад. Номи дигар интихоб кунед.`,
  },
};

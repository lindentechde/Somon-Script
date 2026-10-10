#!/usr/bin/env node
/**
 * Checks a learner's program against the tests of a task of the tutorial
 * (docs/tutorial/tasks/<id>/tests: N.in is given to the program's input, N.out
 * is what it must print), as scripts/run-leetcode.js runs the LeetCode
 * solutions: each test runs the program with `somon run`. Lines are compared
 * without the spaces at their ends and without empty lines at the end.
 *
 * Usage:
 *   node scripts/check-task.js <task> <program.som> [--lang tj|ru|en]
 *   node scripts/check-task.js --all            # every task with its own solution (hal.som)
 *   node scripts/check-task.js --update <task>  # writes N.out from what hal.som prints for N.in
 *
 * <task> is the id of a task (05-jam) or its directory.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const TASKS = path.join(ROOT, 'docs', 'tutorial', 'tasks');
const CLI = path.join(ROOT, 'dist', 'cli.js');

const WORDS = {
  tj: {
    task: 'Масъала',
    test: 'Санҷиши',
    passed: 'дуруст ✓',
    failed: 'нодуруст ✗',
    input: 'Вуруд:',
    expected: 'Интизор буд:',
    printed: 'Барнома чоп кард:',
    nothing: '(ҳеҷ чиз)',
    errors: 'Хатоҳо:',
    summary: (passed, total) => `Натиҷа: ${passed} аз ${total} санҷиш гузашт.`,
    noTask: id => `Масъалаи ${id} ёфт нашуд.`,
    noProgram: file => `Файли ${file} ёфт нашуд.`,
    usage: 'Истифода: npm run check-task -- <масъала> <барнома.som>',
  },
  ru: {
    task: 'Задача',
    test: 'Тест',
    passed: 'верно ✓',
    failed: 'неверно ✗',
    input: 'Ввод:',
    expected: 'Ожидалось:',
    printed: 'Программа вывела:',
    nothing: '(ничего)',
    errors: 'Ошибки:',
    summary: (passed, total) => `Итог: пройдено ${passed} из ${total}.`,
    noTask: id => `Задача ${id} не найдена.`,
    noProgram: file => `Файл ${file} не найден.`,
    usage: 'Использование: npm run check-task -- <задача> <программа.som>',
  },
  en: {
    task: 'Task',
    test: 'Test',
    passed: 'passed ✓',
    failed: 'failed ✗',
    input: 'Input:',
    expected: 'Expected:',
    printed: 'The program printed:',
    nothing: '(nothing)',
    errors: 'Errors:',
    summary: (passed, total) => `Result: ${passed} of ${total} tests passed.`,
    noTask: id => `Task ${id} was not found.`,
    noProgram: file => `File ${file} was not found.`,
    usage: 'Usage: npm run check-task -- <task> <program.som>',
  },
};

/** What a program printed, as it is compared: no spaces at line ends, no empty lines at the end. */
function normalize(text) {
  return text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(line => line.replace(/\s+$/, ''))
    .join('\n')
    .replace(/\n+$/, '');
}

function taskDirectory(task) {
  const direct = path.resolve(task);
  if (fs.existsSync(path.join(direct, 'tests'))) return direct;
  const byId = path.join(TASKS, task);
  return fs.existsSync(path.join(byId, 'tests')) ? byId : undefined;
}

/** The tests of a task: [{ name, input, expected }], in the order of their numbers. */
function readTests(directory) {
  const testsDir = path.join(directory, 'tests');
  return fs
    .readdirSync(testsDir)
    .filter(file => file.endsWith('.in'))
    .map(file => file.slice(0, -3))
    .sort((a, b) => Number(a) - Number(b) || a.localeCompare(b))
    .map(name => ({
      name,
      input: fs.readFileSync(path.join(testsDir, `${name}.in`), 'utf8'),
      // Missing before `--update` writes it
      expected: fs.existsSync(path.join(testsDir, `${name}.out`))
        ? fs.readFileSync(path.join(testsDir, `${name}.out`), 'utf8')
        : '',
    }));
}

/** Runs a program on the tests of a task. */
function checkProgram(directory, program, language) {
  return readTests(directory).map(test => {
    const result = spawnSync(process.execPath, [CLI, '--lang', language, 'run', program], {
      input: test.input,
      encoding: 'utf8',
      timeout: 10000,
    });
    const printed = result.stdout ?? '';
    const passed = result.status === 0 && normalize(printed) === normalize(test.expected);
    return { ...test, printed, errors: result.stderr ?? '', passed };
  });
}

function indent(text, words) {
  const shown = normalize(text);
  return (shown === '' ? words.nothing : shown).replace(/^/gm, '    ');
}

function report(id, results, words) {
  const lines = [`${words.task} ${id}`];
  for (const result of results) {
    lines.push(`  ${words.test} ${result.name}: ${result.passed ? words.passed : words.failed}`);
    if (result.passed) continue;
    if (result.input !== '') lines.push(`   ${words.input}`, indent(result.input, words));
    lines.push(`   ${words.expected}`, indent(result.expected, words));
    lines.push(`   ${words.printed}`, indent(result.printed, words));
    if (result.errors.trim() !== '') lines.push(`   ${words.errors}`, indent(result.errors, words));
  }
  const passed = results.filter(result => result.passed).length;
  lines.push(words.summary(passed, results.length));
  return lines.join('\n');
}

function main(argv) {
  const languageIndex = argv.indexOf('--lang');
  const language = languageIndex !== -1 ? argv[languageIndex + 1] : 'tj';
  const words = WORDS[language] ?? WORDS.tj;
  const args = argv.filter(
    (arg, index) => !arg.startsWith('--') && (languageIndex === -1 || index !== languageIndex + 1)
  );

  if (argv.includes('--all')) {
    let failed = 0;
    for (const id of fs
      .readdirSync(TASKS)
      .filter(name => taskDirectory(name))
      .sort()) {
      const directory = path.join(TASKS, id);
      const results = checkProgram(directory, path.join(directory, 'hal.som'), language);
      const ok = results.every(result => result.passed);
      if (!ok) failed++;
      console.log(ok ? `✅ ${id}` : `❌ ${report(id, results, words)}`);
    }
    return failed === 0 ? 0 : 1;
  }

  if (argv.includes('--update')) {
    const directory = args[0] && taskDirectory(args[0]);
    if (!directory) {
      console.error(words.noTask(args[0] ?? ''));
      return 2;
    }
    for (const result of checkProgram(directory, path.join(directory, 'hal.som'), language)) {
      fs.writeFileSync(path.join(directory, 'tests', `${result.name}.out`), result.printed);
    }
    console.log(`✅ ${path.basename(directory)}`);
    return 0;
  }

  const [task, program] = args;
  if (!task || !program) {
    console.error(words.usage);
    return 2;
  }
  const directory = taskDirectory(task);
  if (!directory) {
    console.error(words.noTask(task));
    return 2;
  }
  if (!fs.existsSync(program)) {
    console.error(words.noProgram(program));
    return 2;
  }
  const results = checkProgram(directory, program, language);
  console.log(report(path.basename(directory), results, words));
  return results.every(result => result.passed) ? 0 : 1;
}

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}

module.exports = { normalize, readTests };

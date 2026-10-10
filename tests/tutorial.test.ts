import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as vm from 'vm';

import { runProgram, type RunEvent } from '../src/playground/run';
import { buildCliOnce, canonicalTmpDir } from './helpers/paths';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { processTutorial } = require('../scripts/tutorial-links.js');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { normalize, readTests } = require('../scripts/check-task.js');

/**
 * The tutorial for beginners (docs/tutorial): its lessons in Tajik and
 * Russian, their playground links, and the tasks with their tests.
 */
const TUTORIAL = path.join(__dirname, '..', 'docs', 'tutorial');
const TASKS = path.join(TUTORIAL, 'tasks');
const lessons = (language: string) =>
  fs
    .readdirSync(path.join(TUTORIAL, language))
    .filter(file => /^\d\d-.*\.md$/.test(file))
    .sort();
const taskIds = fs
  .readdirSync(TASKS)
  .filter(name => fs.existsSync(path.join(TASKS, name, 'tests')))
  .sort();

/** Runs a program as the playground does, in a vm context; resolves with what happened. */
function run(source: string, input: string): Promise<RunEvent[]> {
  return new Promise(resolve => {
    const events: RunEvent[] = [];
    const context = vm.createContext({});
    runProgram(
      { source, input, language: 'tj' },
      {
        post: event => {
          events.push(event);
          if (event.type === 'done' || event.type === 'notCompiled') resolve(events);
        },
        scope: context as Record<string, unknown>,
        timers: { setTimeout, clearTimeout, setInterval, clearInterval } as never,
        script: code => ({
          file: 'барнома.js',
          run: () => vm.runInContext(code, context, { filename: 'барнома.js' }),
        }),
      }
    );
  });
}

const printed = (events: RunEvent[]) =>
  events.flatMap(event => (event.type === 'output' ? [event.text] : [])).join('\n');

describe('tutorial lessons', () => {
  test('15 to 20 lessons, the same in Tajik and Russian', () => {
    expect(lessons('tj').length).toBeGreaterThanOrEqual(15);
    expect(lessons('tj').length).toBeLessThanOrEqual(20);
    expect(lessons('ru')).toEqual(lessons('tj'));
  });

  test('the playground links are made from the code above them', () => {
    expect(processTutorial({ write: false })).toEqual([]);
  });

  test.each(['tj', 'ru'])('every %s lesson has examples and 3-5 tasks that exist', language => {
    const linked = new Set<string>();
    for (const lesson of lessons(language)) {
      const text = fs.readFileSync(path.join(TUTORIAL, language, lesson), 'utf8');
      const examples = text.match(/\]\(https:\/\/lindentechde\.github\.io\/Somon-Script\/#c=/g);
      expect([lesson, (examples ?? []).length >= 2]).toEqual([lesson, true]);
      const tasks = [...text.matchAll(/\]\(\.\.\/tasks\/([^/]+)\/README\.md\)/g)].map(m => m[1]);
      expect([lesson, tasks.length >= 3 && tasks.length <= 5]).toEqual([lesson, true]);
      for (const task of tasks) {
        expect(taskIds).toContain(task);
        linked.add(task);
      }
    }
    // Every task belongs to a lesson
    expect([...linked].sort()).toEqual(taskIds);
  });

  test('the examples of the lessons run as the lessons say', async () => {
    for (const lesson of lessons('tj')) {
      const text = fs.readFileSync(path.join(TUTORIAL, 'tj', lesson), 'utf8');
      const links = [...text.matchAll(/#c=([\w-]+)(?:&i=([\w-]+))?\)/g)];
      for (const [index, link] of links.entries()) {
        const code = Buffer.from(link[1], 'base64url').toString('utf8');
        const input = link[2] ? Buffer.from(link[2], 'base64url').toString('utf8') : '';
        const events = await run(code, input);
        // Lesson 2 shows a compile error and a run-time error on purpose
        const expected =
          lesson === '02-khato.md' && index < 2 ? ['notCompiled', 'runtimeError'][index] : 'done';
        const outcome = events.find(event =>
          ['notCompiled', 'runtimeError'].includes(event.type)
        )?.type;
        expect([lesson, index, outcome ?? 'done']).toEqual([lesson, index, expected]);
      }
    }
  });
});

describe('tutorial tasks', () => {
  test('each task has its statement, a solution and tests', () => {
    expect(taskIds.length).toBeGreaterThanOrEqual(50);
    for (const id of taskIds) {
      const readme = fs.readFileSync(path.join(TASKS, id, 'README.md'), 'utf8');
      expect(readme).toContain(`## Масъала ${id}:`);
      expect(readme).toContain(`## Задача ${id}:`);
      expect(fs.existsSync(path.join(TASKS, id, 'hal.som'))).toBe(true);
      expect(readTests(path.join(TASKS, id)).length).toBeGreaterThanOrEqual(1);
    }
  });

  test('each solution passes the tests of its task', async () => {
    for (const id of taskIds) {
      const source = fs.readFileSync(path.join(TASKS, id, 'hal.som'), 'utf8');
      for (const test of readTests(path.join(TASKS, id))) {
        const events = await run(source, test.input);
        expect([id, test.name, normalize(printed(events))]).toEqual([
          id,
          test.name,
          normalize(test.expected),
        ]);
      }
    }
  });

  test('outputs are compared without the spaces at line ends and empty lines at the end', () => {
    expect(normalize('а  \r\nб\n\n')).toBe('а\nб');
  });
});

describe('scripts/check-task.js', () => {
  let dir: string;
  const script = path.join(__dirname, '..', 'scripts', 'check-task.js');
  const check = (...args: string[]) =>
    spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', cwd: dir });

  beforeAll(() => {
    buildCliOnce();
    dir = canonicalTmpDir('somon-check-task-');
  });

  afterAll(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('a right program passes every test', () => {
    const result = check('05-jam', path.join(TASKS, '05-jam', 'hal.som'));
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Натиҷа: 3 аз 3 санҷиш гузашт.');
  }, 60000);

  test('a wrong program: what was expected and what it printed, in Tajik or Russian', () => {
    const wrong = path.join(dir, 'барнома.som');
    fs.writeFileSync(wrong, 'тағ а = хондан();\nтағ б = хондан();\nчоп(а + б);\n');
    const result = check('05-jam', wrong);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('Санҷиши 1: нодуруст ✗');
    expect(result.stdout).toContain('   Интизор буд:\n    5\n   Барнома чоп кард:\n    23');
    expect(check('05-jam', wrong, '--lang', 'ru').stdout).toContain('Итог: пройдено 0 из 3.');
  }, 60000);

  test('a task or file that does not exist', () => {
    expect(check('нест', 'барнома.som')).toMatchObject({ status: 2 });
    expect(check('05-jam', 'нест.som').stderr).toContain('Файли нест.som ёфт нашуд.');
    expect(check().stderr).toContain('npm run check-task');
  });

  test('--update writes the expected output from the solution', () => {
    const task = path.join(dir, 'масъала');
    fs.cpSync(path.join(TASKS, '05-jam'), task, { recursive: true });
    fs.rmSync(path.join(task, 'tests', '1.out'));
    expect(check('--update', task).status).toBe(0);
    expect(fs.readFileSync(path.join(task, 'tests', '1.out'), 'utf8')).toBe('5\n');
  }, 60000);
});

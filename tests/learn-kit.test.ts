import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vm from 'vm';

import { compile } from '../src/browser';
import { ANIMATIONS, animationProblem } from '../src/learn/animations';
import * as client from '../src/learn/client';
import {
  checkTask,
  normalize,
  PROTOCOL as CLIENT_PROTOCOL,
  runInWorker,
  type WorkerLike,
} from '../src/learn/client';
import { PROTOCOL, runProgram, type RunEvent, type RunRequest } from '../src/playground/run';
import { buildCliOnce } from './helpers/paths';

/**
 * The learn kit (dist/learn, scripts/build-learn.js): the lessons as steps
 * (scripts/learn-lessons.js), the minified worker, and the client a website
 * runs programs and checks tasks with (src/learn/client.ts).
 */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { buildLearn, MAX_WORKER_GZIP, MAX_LESSONS } = require('../scripts/build-learn.js');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { lessons, parseLesson, mergeSteps } = require('../scripts/learn-lessons.js');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { markdownHtml } = require('../scripts/learn-data.js');

const ROOT = path.join(__dirname, '..');

interface Step {
  id: string;
  kind: string;
  role?: string;
  task?: string;
  anim?: { name: string; params: Record<string, unknown> };
  code?: { tj: string; ru: string };
  input?: string;
  answer?: number[];
  options?: { tj: string[]; ru: string[] };
  solution?: string;
  expect?: string;
}

/** A worker of the kit's worker.js, in a vm context with what a Web Worker has. */
function kitWorker(workerCode: string): WorkerLike {
  const blobs = new Map<string, string>();
  const handlers: Record<string, (_event: unknown) => void> = {};
  const fake: WorkerLike = {
    postMessage: request => context.onmessage({ data: request }),
    terminate: () => undefined,
    onmessage: null,
    onerror: null,
  };
  const context = vm.createContext({
    postMessage: (event: RunEvent) => fake.onmessage?.({ data: event }),
    importScripts: (url: string) => vm.runInContext(blobs.get(url)!, context, { filename: url }),
    addEventListener: (type: string, handler: (_event: unknown) => void) => {
      handlers[type] = handler;
    },
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    Blob: class {
      readonly text: string;
      constructor(parts: string[]) {
        this.text = parts.join('');
      }
    },
    URL: {
      createObjectURL: (blob: { text: string }) => {
        const url = `blob:kit/${blobs.size}`;
        blobs.set(url, blob.text);
        return url;
      },
    },
  });
  vm.runInContext(workerCode, context, { filename: 'worker.js' });
  return fake;
}

/** A worker that runs programs in this process, with the compiler's sources. */
function sourceWorker(): WorkerLike {
  const worker: WorkerLike = {
    postMessage: request => {
      const context = vm.createContext({});
      runProgram(request, {
        post: event => worker.onmessage?.({ data: event }),
        scope: context as Record<string, unknown>,
        timers: { setTimeout, clearTimeout, setInterval, clearInterval } as never,
        script: code => ({
          file: 'барнома.js',
          run: () => vm.runInContext(code, context, { filename: 'барнома.js' }),
        }),
      });
    },
    terminate: () => undefined,
    onmessage: null,
    onerror: null,
  };
  return worker;
}

const request = (source: string, more: Partial<RunRequest> = {}): RunRequest => ({
  source,
  input: '',
  language: 'tj',
  ...more,
});

describe('the learn kit', () => {
  let outDir: string;
  let manifest: Record<string, any>;
  let worker: string;

  beforeAll(async () => {
    buildCliOnce();
    outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'somon-learn-'));
    manifest = (await buildLearn({ outDir })).manifest;
    worker = fs.readFileSync(path.join(outDir, 'worker.js'), 'utf8');
  }, 180000);

  afterAll(() => fs.rmSync(outDir, { recursive: true, force: true }));

  test('its manifest: the version, the shapes, the protocol and the worker it describes', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    expect(manifest).toMatchObject({
      version: pkg.version,
      schema: 1,
      protocol: PROTOCOL,
      lessons: 18,
      tasks: 63,
    });
    expect(CLIENT_PROTOCOL).toBe(PROTOCOL);
    expect(manifest.worker.bytes).toBe(Buffer.byteLength(worker));
    expect(manifest.worker.sha256).toBe(crypto.createHash('sha256').update(worker).digest('hex'));
    expect(JSON.parse(fs.readFileSync(path.join(outDir, 'manifest.json'), 'utf8'))).toEqual(
      manifest
    );
  });

  test('the worker is minified, within its budget, and the same on every build', async () => {
    expect(manifest.worker.gzip).toBeLessThanOrEqual(MAX_WORKER_GZIP);
    expect(worker.startsWith('/*!\n * SomonScript')).toBe(true);
    expect(worker.length).toBeLessThan(600 * 1024);
    const again = fs.mkdtempSync(path.join(os.tmpdir(), 'somon-learn-'));
    try {
      await buildLearn({ outDir: again });
      expect(fs.readFileSync(path.join(again, 'worker.js'), 'utf8')).toBe(worker);
    } finally {
      fs.rmSync(again, { recursive: true, force: true });
    }
  });

  test('the minified worker runs programs: output, errors on their lines, input and steps', async () => {
    const run = (more: Partial<RunRequest>, source: string) =>
      runInWorker(() => kitWorker(worker), request(source, more)).result;
    const printed = await run({ trace: true }, 'тағ х = 2;\nчоп(х * 3, [дуруст, холӣ]);');
    expect(printed.outcome).toBe('done');
    expect(printed.output).toBe('6 [ дуруст, холӣ ]');
    expect(printed.trace!.steps.map(step => step.l)).toEqual([1, 2, 0]);
    const input = await run({ input: '4\n' }, 'чоп(хонданиРақам() + 1);');
    expect(input.output).toBe('5');
    const failed = await run({}, 'тағ а = 1;\nчоп(а.б.в);');
    expect(failed.outcome).toBe('runtimeError');
    expect(failed.events.find(event => event.type === 'runtimeError')).toMatchObject({ line: 2 });
    const wrong = await run({}, 'агр (1) {}');
    expect(wrong.outcome).toBe('notCompiled');
  });

  test('the files of the npm package include the kit', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    expect(pkg.files).toContain('dist');
    expect(pkg.scripts.prepack).toContain('build-learn');
  });

  test('the JSON files: lessons, tasks, examples and words', () => {
    const read = (name: string) => JSON.parse(fs.readFileSync(path.join(outDir, name), 'utf8'));
    expect(fs.statSync(path.join(outDir, 'lessons.json')).size).toBeLessThanOrEqual(MAX_LESSONS);
    expect(read('lessons.json')).toEqual(lessons());
    expect(read('tasks.json')).toHaveLength(63);
    expect(read('examples.json').length).toBeGreaterThanOrEqual(10);
    expect(read('words.json')).toMatchObject({ агар: 'kw', дуруст: 'lit', хондан: 'builtin' });
  });
});

describe('the lessons as steps', () => {
  const all = lessons() as Array<{ id: string; n: number; steps: Step[] }>;

  test('every lesson: an intro, examples, the pitfalls if any, then its tasks', () => {
    expect(all.map(lesson => lesson.n)).toEqual(Array.from({ length: 18 }, (_, i) => i + 1));
    for (const lesson of all) {
      expect([lesson.id, lesson.steps[0].role]).toEqual([lesson.id, 'intro']);
      const kinds = lesson.steps.map(step => step.kind);
      expect([lesson.id, kinds.filter(kind => kind === 'example').length >= 2]).toEqual([
        lesson.id,
        true,
      ]);
      // The tasks come last, as the lesson lists them
      const first = kinds.indexOf('task');
      expect(kinds.slice(first).every(kind => kind === 'task')).toBe(true);
      const ids = lesson.steps.map(step => step.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  test('the examples compile, but those of lesson 2 that show an error', () => {
    for (const lesson of all) {
      for (const step of lesson.steps.filter(each => each.kind === 'example')) {
        for (const language of ['tj', 'ru'] as const) {
          const errors = compile(step.code![language]).errors;
          const expected = lesson.id === '02-khato' && /^02-example-1$/.test(step.id);
          expect([step.id, language, errors.length > 0]).toEqual([step.id, language, expected]);
        }
      }
    }
  });

  test('every animation is known and has an example to draw', () => {
    const anims = all.flatMap(lesson => lesson.steps.filter(step => step.anim));
    expect(anims.length).toBeGreaterThanOrEqual(6);
    for (const step of anims) {
      expect([step.id, animationProblem(step.anim!.name, step.anim!.params)]).toEqual([
        step.id,
        undefined,
      ]);
    }
  });

  test('the answers of the questions are among their options', () => {
    const quizzes = all.flatMap(lesson => lesson.steps.filter(step => step.kind === 'quiz'));
    expect(quizzes.length).toBeGreaterThanOrEqual(3);
    for (const quiz of quizzes) {
      expect(quiz.options!.tj).toHaveLength(quiz.options!.ru.length);
      for (const answer of quiz.answer!) expect(answer).toBeLessThan(quiz.options!.tj.length);
    }
  });

  test('a quiz shows what its code prints', async () => {
    // The question of lesson 10: how many times `чоп` runs
    const quiz = all[9].steps.find(step => step.kind === 'quiz')!;
    const run = await runInWorker(sourceWorker, request((quiz as any).code.tj)).result;
    expect(run.output.split('\n')).toHaveLength(Number(quiz.options!.tj[quiz.answer![0]]));
  });
});

describe('reading a lesson (scripts/learn-lessons.js)', () => {
  const link = (code: string, input = '') =>
    `[▶ Run](https://lindentechde.github.io/Somon-Script/#c=${Buffer.from(code).toString('base64url')}${input ? `&i=${Buffer.from(input).toString('base64url')}` : ''})`;
  const lesson = [
    '# Дарси 4. Санҷиш',
    '',
    '**Дар ин дарс:** ҳама чиз.',
    '',
    '## Мисол бо `вуруд`',
    '',
    'Пеш аз код.',
    '',
    '```som',
    'чоп(хондан());',
    '```',
    '',
    'Вуруд:',
    '',
    '```text',
    'салом',
    '```',
    '',
    link('чоп(хондан());\n', 'салом\n'),
    '',
    '<!-- anim: input-queue -->',
    '',
    '- Баъди код.',
    '',
    '```som',
    'чоп(2);',
    '```',
    '',
    link('чоп(2);\n'),
    '',
    'Охир.',
    '',
    '<!-- step -->',
    '',
    '| а | б |',
    '| - | - |',
    '| 1 | [x](https://x.tj) |',
    '',
    '<!-- quiz',
    'q: Чанд?',
    'code: |',
    '  чоп(1);',
    '',
    '  чоп(2);',
    'options: 1 | *2',
    '-->',
    '',
    '<!-- try',
    'text: Нависед.',
    'starter: |',
    '  чоп();',
    'solution: |',
    '  чоп(1);',
    'expect: |',
    '  1',
    'hint: Маслиҳат.',
    '-->',
    '',
    '## Хатоҳои маъмул',
    '',
    '1. Як',
    '   дароз.',
    '2. Ду',
    '',
    '## Супоришҳо',
    '',
    '1. [Як](../tasks/04-yak/README.md)',
    '',
    '---',
    '',
    '[← Пеш](03.md)',
  ].join('\n');

  test('its steps, in order', () => {
    const parsed = parseLesson(lesson, 'санҷиш.md');
    expect(parsed.n).toBe(4);
    expect(parsed.steps.map((step: Step) => [step.kind, step.role])).toEqual([
      ['text', 'intro'],
      ['example', undefined],
      ['example', undefined],
      ['text', undefined],
      ['quiz', undefined],
      ['try', undefined],
      ['text', 'pitfalls'],
      ['task', undefined],
    ]);
    const [, first, second, table, quiz, exercise, pitfalls, task] = parsed.steps;
    expect(first).toMatchObject({
      title: 'Мисол бо <code>вуруд</code>',
      html: '<p>Пеш аз код.</p>',
      code: 'чоп(хондан());\n',
      input: 'салом\n',
      after: '<ul><li>Баъди код.</li></ul>',
      anim: { name: 'input-queue', params: {} },
    });
    expect(second).toMatchObject({ code: 'чоп(2);\n', input: '', html: '', after: '<p>Охир.</p>' });
    expect(table.html).toBe(
      '<table><thead><tr><th>а</th><th>б</th></tr></thead><tbody><tr><td>1</td><td><a href="https://x.tj">x</a></td></tr></tbody></table>'
    );
    expect(quiz).toMatchObject({
      question: 'Чанд?',
      code: 'чоп(1);\n\nчоп(2);\n',
      options: ['1', '2'],
      answer: [1],
    });
    expect(exercise).toMatchObject({
      text: 'Нависед.',
      starter: 'чоп();\n',
      solution: 'чоп(1);\n',
      input: '',
      expect: '1\n',
      hint: 'Маслиҳат.',
    });
    expect(pitfalls.html).toBe('<ol><li>Як дароз.</li><li>Ду</li></ol>');
    expect(task).toEqual({ kind: 'task', task: '04-yak' });
  });

  test('the two languages become one, with the texts of each', () => {
    const tj = parseLesson(lesson, 'tj');
    const ru = parseLesson(lesson.replace('Пеш аз код.', 'До кода.'), 'ru');
    const steps = mergeSteps('04-sanjish.md', [tj, ru]);
    expect(steps.map((step: Step) => step.id)).toEqual([
      '04-intro',
      '04-example-1',
      '04-example-2',
      '04-text-1',
      '04-quiz-1',
      '04-try-1',
      '04-text-2',
      '04-task-04-yak',
    ]);
    expect(steps[1].html).toEqual({ tj: '<p>Пеш аз код.</p>', ru: '<p>До кода.</p>' });
    expect(steps[1].input).toBe('салом\n');
  });

  test('what does not read: its errors name the place', () => {
    const fails = (text: string) => () => parseLesson(text, 'бад.md');
    expect(fails('# Бе рақам')).toThrow('бад.md: no title');
    expect(fails(`# Дарси 1. А\n\n## Б\n\n${link('чоп(1);\n')}`)).toThrow(
      'a ▶ link without code above it'
    );
    expect(fails('# Дарси 1. А\n\n## Б\n\n<!-- anim -->')).toThrow("cannot read '<!-- anim -->'");
    expect(fails('# Дарси 1. А\n\n## Б\n\n<!-- quiz\nq: ?\noptions: а | б\n-->')).toThrow(
      'no right option'
    );
    expect(fails('# Дарси 1. А\n\n## Б\n\n<!-- quiz\nq: ?\n-->')).toThrow("no 'options:'");
    expect(fails('# Дарси 1. А\n\n## Б\n\n<!-- try\nтекст\n-->')).toThrow("cannot read 'текст'");
    expect(fails('# Дарси 1. А\n\n## Супоришҳо\n\n1. Як')).toThrow('is not a link to a task');
    const twice = '<!-- anim: if-branch -->\n\n<!-- anim: if-chain -->';
    expect(fails(`# Дарси 1. А\n\n## Б\n\nМатн.\n\n${twice}`)).toThrow('two animations');
    expect(
      fails(
        `# Дарси 1. А\n\n## Б\n\n\`\`\`som\nчоп(1);\n\`\`\`\n\n${link('чоп(1);\n')}\n\n${twice}`
      )
    ).toThrow('two animations');
  });

  test('the languages must give the same steps', () => {
    const tj = parseLesson(lesson, 'tj');
    const shorter = parseLesson(
      lesson.replace(/## Хатоҳои маъмул[\s\S]*?## Супоришҳо/, '## Супоришҳо'),
      'ru'
    );
    expect(() => mergeSteps('04.md', [tj, shorter])).toThrow('8 steps in Tajik, 7 in Russian');
    // The link gives the input
    const otherInput = parseLesson(
      lesson.replace(link('чоп(хондан());\n', 'салом\n'), link('чоп(хондан());\n', 'хайр\n')),
      'ru'
    );
    expect(() => mergeSteps('04.md', [tj, otherInput])).toThrow(
      "04.md, step 2 (example): 'input' differs"
    );
  });

  test('task statements keep their Markdown as before', () => {
    expect(markdownHtml('Як **ду** `се`\nчор.\n\n```text\n1\n```')).toBe(
      '<p>Як <strong>ду</strong> <code>се</code> чор.</p><pre>1</pre>'
    );
    expect(markdownHtml('<https://a.tj> [b](c.md) <x>')).toBe(
      '<p><a href="https://a.tj">https://a.tj</a> b &lt;x&gt;</p>'
    );
  });
});

describe('the animations (src/learn/animations.ts)', () => {
  test('what is wrong with the animation a step names', () => {
    expect(animationProblem('variable-box', {})).toBeUndefined();
    expect(animationProblem('variable-box', { focus: ['х'] })).toBeUndefined();
    expect(animationProblem('expression-eval', { steps: ['1 + 1', '2'] })).toBeUndefined();
    expect(animationProblem('remainder', { a: 7, b: 2 })).toBeUndefined();
    expect(animationProblem('рақс', {})).toMatch("unknown animation 'рақс'");
    expect(animationProblem('variable-box', { ранг: 1 })).toMatch("has no parameter 'ранг'");
    expect(animationProblem('expression-eval', {})).toMatch("needs the parameter 'steps'");
    expect(animationProblem('variable-box', { focus: 'х' })).toMatch('must be string[]');
    expect(animationProblem('remainder', { a: '7', b: 2 })).toMatch('must be number');
    expect(animationProblem('toString', {})).toMatch('unknown animation');
    expect(Object.keys(ANIMATIONS).length).toBeGreaterThanOrEqual(18);
    // A page has them from the client too
    expect(client.ANIMATIONS).toBe(ANIMATIONS);
    expect(client.animationProblem).toBe(animationProblem);
  });
});

describe('running programs and checking tasks (src/learn/client.ts)', () => {
  /** A worker that sends the given events, or nothing. */
  function scripted(events: RunEvent[] = []): WorkerLike & { ended: boolean } {
    const worker = {
      ended: false,
      postMessage: () => events.forEach(event => worker.onmessage?.({ data: event })),
      terminate: () => {
        worker.ended = true;
      },
      onmessage: null as WorkerLike['onmessage'],
      onerror: null as WorkerLike['onerror'],
    };
    return worker;
  }

  test('a run: its events as they come, what it printed and how it ended', async () => {
    const seen: string[] = [];
    const run = runInWorker(sourceWorker, request('чоп(1);\nчоп(2);', { trace: true }), {
      onEvent: event => seen.push(event.type),
    });
    const result = await run.result;
    expect(result).toMatchObject({ outcome: 'done', output: '1\n2' });
    expect(result.trace!.steps).toHaveLength(3);
    expect(seen).toEqual(['compiled', 'output', 'output', 'trace', 'done']);
    const failed = await runInWorker(sourceWorker, request('чоп(холӣ.а);')).result;
    expect(failed.outcome).toBe('runtimeError');
    expect(failed).not.toHaveProperty('trace');
  });

  test('a program that runs too long is stopped, and so is one the page stops', async () => {
    const hanging = scripted([{ type: 'compiled', code: '', diagnostics: [] }]);
    const late = await runInWorker(() => hanging, request(''), { timeLimit: 10 }).result;
    expect(late.outcome).toBe('timeout');
    expect(hanging.ended).toBe(true);
    const silent = scripted();
    const run = runInWorker(() => silent, request(''));
    run.stop();
    expect((await run.result).outcome).toBe('stopped');
    // Events after the end are not taken, and it ends once
    silent.onmessage?.({ data: { type: 'done' } });
    run.stop();
    expect(await run.result).toMatchObject({ outcome: 'stopped', events: [] });
  });

  test('a worker that cannot start or fails', async () => {
    const thrown = await runInWorker(() => {
      throw new Error('no workers');
    }, request('')).result;
    expect(thrown).toMatchObject({ outcome: 'crashed', error: 'no workers' });
    const odd = await runInWorker(() => {
      throw 'no Worker';
    }, request('')).result;
    expect(odd).toMatchObject({ outcome: 'crashed', error: 'no Worker' });
    const failing = scripted();
    const run = runInWorker(() => failing, request(''));
    let prevented = false;
    failing.onerror!({ message: 'boom', preventDefault: () => (prevented = true) });
    expect(await run.result).toMatchObject({ outcome: 'crashed', error: 'boom' });
    expect(prevented).toBe(true);
    const quiet = scripted();
    const other = runInWorker(() => quiet, request(''));
    quiet.onerror!({});
    expect(await other.result).toMatchObject({ outcome: 'crashed', error: 'The worker failed' });
  });

  test('what is compared: no spaces at line ends, no empty lines at the end', () => {
    expect(normalize('а  \r\nб\t\n\n\n')).toBe('а\nб');
    expect(normalize('\n\n')).toBe('');
    expect(normalize('  а')).toBe('  а');
    // In linear time: a line of many spaces that does not end with them
    const started = Date.now();
    expect(normalize(`${' '.repeat(400000)}х\n`)).toHaveLength(400001);
    expect(Date.now() - started).toBeLessThan(1000);
  });

  test('checking a task on its tests', async () => {
    const tests = [
      { i: '2\n3\n', o: '5\n' },
      { i: '1\n1\n', o: '2' },
    ];
    const reported: number[] = [];
    const sum = 'чоп(хонданиРақам() + хонданиРақам());';
    const passed = await checkTask(sourceWorker, { source: sum, language: 'tj' }, tests, {
      onTest: (_, index) => reported.push(index),
    });
    expect(passed.passed).toBe(true);
    expect(reported).toEqual([0, 1]);
    expect(passed.tests[0]).toMatchObject({ passed: true, input: '2\n3\n', printed: '5' });

    const wrong = await checkTask(
      sourceWorker,
      { source: 'чоп(хонданиРақам() * хонданиРақам());', language: 'tj' },
      tests
    );
    expect(wrong.passed).toBe(false);
    expect(wrong.tests.map(test => test.passed)).toEqual([false, false]);

    const failing = await checkTask(
      sourceWorker,
      { source: 'чоп(холӣ.а);', language: 'ru' },
      tests
    );
    expect(failing.tests[0]).toMatchObject({ passed: false, outcome: 'runtimeError' });
    expect(failing.tests[0].error!.line).toBe(1);

    const broken = await checkTask(sourceWorker, { source: 'агр', language: 'tj' }, tests);
    expect(broken).toMatchObject({ passed: false, tests: [] });
    expect(broken.notCompiled!.type).toBe('notCompiled');

    let runs = 0;
    const stopped = await checkTask(sourceWorker, { source: sum, language: 'tj' }, tests, {
      shouldContinue: () => runs++ < 1,
    });
    expect(stopped).toMatchObject({ passed: false });
    expect(stopped.tests).toHaveLength(1);
  });
});

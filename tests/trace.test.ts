import * as fs from 'fs';
import * as path from 'path';
import * as vm from 'vm';

import { compile } from '../src/browser';
import { CodeGenerator } from '../src/codegen';
import { runProgram, type RunEvent, type RunRequest } from '../src/playground/run';
import { Tracer, type TraceStep } from '../src/runtime/trace';

/**
 * Programs that record their steps (`compile(…, { trace: true })`,
 * src/trace-generator.ts and src/runtime/trace.ts), run as the playground runs
 * them (src/playground/run.ts), in a vm context.
 */
function run(source: string, request: Partial<RunRequest> = {}): Promise<RunEvent[]> {
  return new Promise(resolve => {
    const events: RunEvent[] = [];
    const context = vm.createContext({});
    runProgram(
      { source, input: '', language: 'tj', trace: true, ...request },
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

function traceOf(events: RunEvent[]) {
  const traces = events.filter(event => event.type === 'trace');
  expect(traces).toHaveLength(1);
  return traces[0] as Extract<RunEvent, { type: 'trace' }>;
}

async function steps(source: string, request: Partial<RunRequest> = {}): Promise<TraceStep[]> {
  return traceOf(await run(source, request)).steps;
}

const lines = (trace: TraceStep[]) => trace.map(step => step.l);
/** The variables of a step as `ном=қимат`. */
const values = (step: TraceStep) => step.v.map(variable => `${variable.n}=${variable.s}`);
const printed = (events: RunEvent[]) =>
  events.flatMap(event => (event.type === 'output' ? [event.text] : []));

describe('tracing the steps of a program', () => {
  test('each statement is a step, with the variables declared so far, then the end', async () => {
    const trace = await steps('тағ ном = "Зарина";\nтағ синну = 13;\nчоп(ном, синну);');
    expect(trace).toEqual([
      { l: 1, d: 0, v: [], o: 0 },
      { l: 2, d: 0, v: [{ n: 'ном', t: 'string', s: '"Зарина"' }], o: 0 },
      {
        l: 3,
        d: 0,
        v: [
          { n: 'ном', t: 'string', s: '"Зарина"' },
          { n: 'синну', t: 'number', s: '13' },
        ],
        o: 0,
      },
      {
        l: 0,
        d: 0,
        v: [
          { n: 'ном', t: 'string', s: '"Зарина"' },
          { n: 'синну', t: 'number', s: '13' },
        ],
        o: 1,
      },
    ]);
  });

  test('the trace comes after what the program prints and before its end', async () => {
    const events = await run('чоп(1);\nчоп(2);');
    expect(events.map(event => event.type)).toEqual([
      'compiled',
      'output',
      'output',
      'trace',
      'done',
    ]);
    expect(traceOf(events)).toMatchObject({ truncated: false });
  });

  test('a `барои` loop: its test is a step each time it is checked', async () => {
    const trace = await steps(
      'тағ ҷамъ = 0;\nбарои (тағ и = 1; и <= 2; и++) {\n  ҷамъ += и;\n}\nчоп(ҷамъ);'
    );
    expect(lines(trace)).toEqual([1, 2, 3, 2, 3, 2, 5, 0]);
    expect(trace.map(values)).toEqual([
      [],
      ['ҷамъ=0', 'и=1'],
      ['ҷамъ=0', 'и=1'],
      ['ҷамъ=1', 'и=2'],
      ['ҷамъ=1', 'и=2'],
      ['ҷамъ=3', 'и=3'],
      // The loop's variable is gone after it
      ['ҷамъ=3'],
      ['ҷамъ=3'],
    ]);
  });

  test('`агар`, `вагарна агар` and `вагарна`: each test checked is a step', async () => {
    const source = [
      'тағ х = 5;',
      'агар (х > 10) {',
      '  чоп("калон");',
      '} вагарна агар (х > 3)',
      '  чоп("миёна");',
      'вагарна {',
      '  чоп("хурд");',
      '}',
    ].join('\n');
    expect(lines(await steps(source))).toEqual([1, 2, 4, 5, 0]);
  });

  test('`то`, `кун … то`, `шикастан` with a label, `давом` and `барои (;;)`', async () => {
    const whileLoop = 'тағ и = 0;\nто (и < 2) {\n  и++;\n}';
    expect(lines(await steps(whileLoop))).toEqual([1, 2, 3, 2, 3, 2, 0]);
    const doWhile = 'тағ и = 0;\nкун {\n  и++;\n} то (и < 2);';
    expect(lines(await steps(doWhile))).toEqual([1, 2, 3, 4, 3, 4, 0]);
    const labeled = [
      'берун: барои (тағ и = 0; и < 3; и++) {',
      '  агар (и == 1) давом;',
      '  агар (и == 2) шикастан берун;',
      '}',
    ].join('\n');
    expect(lines(await steps(labeled))).toEqual([1, 2, 3, 1, 2, 2, 1, 2, 3, 3, 0]);
    const forever = 'тағ и = 0;\nбарои (;;) {\n  агар (++и > 1) шикастан;\n}';
    expect(lines(await steps(forever))).toEqual([1, 2, 3, 3, 3, 0]);
  });

  test('`барои … аз`, `интихоб` and `кӯшиш … гирифтан`', async () => {
    const forOf = 'барои (собит х аз [10, 20]) {\n  чоп(х);\n}';
    const trace = await steps(forOf);
    expect(lines(trace)).toEqual([1, 2, 2, 0]);
    expect(trace.slice(1, 3).map(values)).toEqual([['х=10'], ['х=20']]);
    const switchStatement = [
      'тағ р = 2;',
      'интихоб (р) {',
      '  ҳолат 1:',
      '    чоп("як");',
      '    шикастан;',
      '  ҳолат 2:',
      '    чоп("ду");',
      '    шикастан;',
      '}',
    ].join('\n');
    expect(lines(await steps(switchStatement))).toEqual([1, 2, 7, 8, 0]);
    const tryCatch = 'кӯшиш {\n  партофтан нав Хато("бад");\n} гирифтан (х) {\n  чоп(х.паём);\n}';
    expect(lines(await steps(tryCatch))).toEqual([1, 2, 4, 0]);
  });

  test('calls of functions: the depth, the function and its own variables', async () => {
    const source = [
      'тағ зариб = 2;',
      'функсия ду(х: рақам): рақам {',
      '  бозгашт х * зариб;',
      '}',
      'тағ н = ду(3);',
      'чоп(н);',
    ].join('\n');
    const trace = await steps(source);
    expect(trace.map(step => [step.l, step.d, step.f])).toEqual([
      [1, 0, undefined],
      [5, 0, undefined],
      [3, 1, 'ду'],
      [6, 0, undefined],
      [0, 0, undefined],
    ]);
    // Functions are not variables; `зариб` is declared outside `ду`
    expect(trace[2].v).toEqual([
      { n: 'зариб', t: 'number', s: '2', g: 1 },
      { n: 'х', t: 'number', s: '3' },
    ]);
  });

  test('recursion goes deeper with each call, and a thrown error leaves the call', async () => {
    const source = [
      'функсия ф(н: рақам): рақам {',
      '  агар (н <= 1) бозгашт 1;',
      '  бозгашт н * ф(н - 1);',
      '}',
      'чоп(ф(3));',
      'функсия бад(): холӣ {',
      '  партофтан нав Хато("бад");',
      '}',
      'кӯшиш {',
      '  бад();',
      '} гирифтан (х) {}',
      'чоп("тамом");',
    ].join('\n');
    const trace = await steps(source);
    // In `ф(1)`, `агар` and the `бозгашт` it runs are two steps
    expect(trace.map(step => step.d)).toEqual([0, 1, 1, 2, 2, 3, 3, 0, 0, 1, 0, 0]);
    expect(trace.at(-2)).toMatchObject({ l: 12, d: 0 });
  });

  test('methods, functions without a name and arrow functions with a block', async () => {
    const source = [
      'синф Ҳисоб {',
      '  ҷамъ(а: рақам, б: рақам): рақам {',
      '    бозгашт а + б;',
      '  }',
      '}',
      'тағ о = { нисф(х: рақам): рақам { бозгашт х / 2; } };',
      'тағ се = функсия (): рақам { бозгашт 3; };',
      'тағ чор = (): рақам => { бозгашт 4; };',
      'чоп(нав Ҳисоб().ҷамъ(1, 2), о.нисф(8), се(), чор());',
    ].join('\n');
    const trace = await steps(source);
    expect(trace.filter(step => step.d > 0).map(step => [step.l, step.f])).toEqual([
      [3, 'ҷамъ'],
      [6, 'нисф'],
      [7, ''],
      [8, ''],
    ]);
  });

  test('`ҳамзамон` functions and generators have steps but no depth', async () => {
    const source = [
      'ҳамзамон функсия ф(): Promise<холӣ> {',
      '  интизор 1;',
      '  чоп("ф");',
      '}',
      'функсия* г(): Generator<рақам> {',
      '  ҳосил 1;',
      '}',
      'ф();',
      'барои (собит х аз г()) чоп(х);',
    ].join('\n');
    const events = await run(source);
    expect(printed(events)).toEqual(['1', 'ф']);
    const trace = traceOf(events).steps;
    expect(trace.every(step => step.d === 0)).toBe(true);
    expect(lines(trace)).toContain(3);
    expect(lines(trace)).toContain(6);
  });

  test('what runs nothing has no step', async () => {
    const source = 'интерфейс Н {\n  а: рақам;\n}\nнавъ Р = рақам;\n;\nчоп(1);';
    expect(lines(await steps(source))).toEqual([6, 0]);
  });

  test('an inner variable hides an outer one of its name, from the start of its block', async () => {
    const source = 'тағ х = 1;\n{\n  тағ х = 2;\n  чоп(х);\n}';
    const trace = await steps(source);
    expect(trace.map(values)).toEqual([[], [], ['х=2'], ['х=1']]);
  });

  test('a runtime error: a last step on its line, and the line the program is told', async () => {
    const source = 'тағ а = 1;\nчоп(а);\nчоп(а.б.в);\nчоп("не");';
    const events = await run(source);
    const trace = traceOf(events).steps;
    expect(trace.at(-1)).toMatchObject({ l: 3, e: 1, o: 1 });
    expect(trace.at(-1)!.v).toEqual(trace.at(-2)!.v);
    const error = events.find(event => event.type === 'runtimeError');
    const untraced = (await run(source, { trace: false })).find(
      event => event.type === 'runtimeError'
    );
    expect(error).toEqual(untraced);
    expect(error).toMatchObject({ line: 3 });
    expect(events.map(event => event.type).slice(-3)).toEqual(['trace', 'runtimeError', 'done']);
  });

  test('after the most steps, the trace is sent and the program runs on untraced', async () => {
    const events = await run('тағ и = 0;\nто (и < 1000) {\n  и++;\n}\nчоп(и);', {
      trace: { maxSteps: 10 },
    });
    expect(events.map(event => event.type)).toEqual(['compiled', 'trace', 'output', 'done']);
    expect(traceOf(events)).toMatchObject({ truncated: true });
    expect(traceOf(events).steps).toHaveLength(10);
    expect(printed(events)).toEqual(['1000']);
    // An error after the limit adds no step
    const failing = await run('барои (тағ и = 0; и < 20; и++) {}\nчоп(холӣ.а);', {
      trace: { maxSteps: 5 },
    });
    expect(traceOf(failing).steps).toHaveLength(5);
  });

  test('a program that does not compile sends no trace', async () => {
    const events = await run('тағ = ;');
    expect(events.map(event => event.type)).toEqual(['notCompiled']);
  });

  test('statements keep their mappings: the steps have none of their own', () => {
    const source = 'тағ а = 1;\nагар (а > 0) {\n  чоп(а);\n}';
    const traced = compile(source, { trace: true, mappings: true });
    const plain = compile(source, { mappings: true });
    expect(traced.errors).toEqual([]);
    expect(traced.mappings!.map(mapping => mapping.original)).toEqual(
      plain.mappings!.map(mapping => mapping.original)
    );
    // The plain code generator calls no tracer
    expect(plain.code).not.toContain('__somonTrace');
    expect(new CodeGenerator()).not.toHaveProperty('nameTable');
  });
});

describe('the values a step records (Tracer)', () => {
  function stepOf(value: unknown, options: Partial<ConstructorParameters<typeof Tracer>[0]> = {}) {
    const tracer = new Tracer({ printed: () => 0, ...options });
    tracer.names([[0, 'қ']]);
    tracer.step(1, 0, [() => value]);
    return tracer;
  }
  const variable = (value: unknown) => stepOf(value).steps[0].v[0];

  test('values as the program prints them inside an array', () => {
    expect(variable('матн')).toEqual({ n: 'қ', t: 'string', s: '"матн"' });
    expect(variable(дуруст())).toEqual({ n: 'қ', t: 'boolean', s: 'дуруст' });
    expect(variable(null)).toEqual({ n: 'қ', t: 'null', s: 'холӣ' });
    expect(variable(undefined)).toEqual({ n: 'қ', t: 'undefined', s: 'беқимат' });
    expect(variable(NaN)).toMatchObject({ t: 'number', s: 'ғайрирақам' });
    expect(variable(Symbol('р'))).toMatchObject({ t: 'other' });
  });

  test('the items of arrays and the fields of plain objects, for the animations', () => {
    expect(variable([1, 'а', [2]])).toEqual({
      n: 'қ',
      t: 'array',
      s: '[ 1, "а", [ 2 ] ]',
      a: ['1', '"а"', '[ 2 ]'],
    });
    expect(variable(Array.from({ length: 30 }, (_, i) => i)).a).toHaveLength(20);
    expect(variable({ ном: 'Алӣ', синну: 12 })).toEqual({
      n: 'қ',
      t: 'object',
      s: '{ ном: "Алӣ", синну: 12 }',
      k: [
        ['ном', '"Алӣ"'],
        ['синну', '12'],
      ],
    });
    // A getter is not called
    let called = false;
    const withGetter = Object.create(null, {
      ҳисоб: {
        enumerable: true,
        get: () => {
          called = true;
          return 1;
        },
      },
    });
    expect(variable(withGetter).k).toEqual([['ҳисоб', '…']]);
    expect(called).toBe(false);
    // Instances of classes and other objects: no fields
    expect(variable(new Map([[1, 2]]))).not.toHaveProperty('k');
  });

  test('long values are cut', () => {
    const long = variable('а'.repeat(200));
    expect(long.s).toHaveLength(80);
    expect(long.s.endsWith('…')).toBe(true);
    expect(variable(['б'.repeat(100)]).a![0]).toHaveLength(40);
    // A value printed on several lines is one, its indentation one space
    const [а, б] = ['а'.repeat(20), 'б'.repeat(20)];
    expect(variable([{ ном: а, синну: 1 }, { ном: б }]).s).toBe(
      `[ { ном: "${а}", синну: 1 }, { ном: "${б}" } ]`
    );
    // In linear time: a string of many spaces
    const started = Date.now();
    expect(variable(`${' '.repeat(400000)}х`).s).toHaveLength(80);
    expect(Date.now() - started).toBeLessThan(1000);
  });

  test('functions and variables still in their dead zone are left out', () => {
    const tracer = new Tracer({ printed: () => 3 });
    tracer.names([[1, 'берун', 'ф', 'х']]);
    tracer.step(7, 0, [
      () => 1,
      () => () => 2,
      () => {
        throw new ReferenceError('х');
      },
    ]);
    expect(tracer.steps).toEqual([
      { l: 7, d: 0, v: [{ n: 'берун', t: 'number', s: '1', g: 1 }], o: 3 },
    ]);
  });

  test('recording stops at the most text of values, once', () => {
    let full = 0;
    const tracer = new Tracer({ printed: () => 0, maxBytes: 100, full: () => full++ });
    tracer.names([[0, 'с']]);
    for (let i = 0; i < 5; i++) tracer.step(1, 0, [() => 'с'.repeat(70)]);
    expect(tracer.steps).toHaveLength(2);
    expect(tracer.truncated).toBe(true);
    expect(tracer.on).toBe(false);
    expect(full).toBe(1);
    tracer.error(2);
    expect(tracer.steps).toHaveLength(2);
  });

  test('an error before any step adds none; one on an unknown line stays on the last step', () => {
    const tracer = new Tracer({ printed: () => 0 });
    tracer.error(1);
    expect(tracer.steps).toEqual([]);
    tracer.names([[0]]);
    tracer.step(4, 0, []);
    tracer.error();
    expect(tracer.steps).toEqual([
      { l: 4, d: 0, v: [], o: 0 },
      { l: 4, d: 0, v: [], o: 0, e: 1 },
    ]);
  });

  /** `true`, without a literal TypeScript would narrow. */
  function дуруст(): boolean {
    return [true][0];
  }
});

describe('a traced program prints what it prints untraced', () => {
  const TUTORIAL = path.join(__dirname, '..', 'docs', 'tutorial');
  const TASKS = path.join(TUTORIAL, 'tasks');

  async function same(name: string, source: string, input: string) {
    const outcome = (events: RunEvent[]) =>
      events
        .filter(event => event.type !== 'trace' && event.type !== 'compiled')
        .map(event => JSON.stringify(event));
    const traced = await run(source, { input });
    const untraced = await run(source, { input, trace: false });
    expect([name, outcome(traced)]).toEqual([name, outcome(untraced)]);
  }

  test('the examples of the lessons', async () => {
    const lessons = fs.readdirSync(path.join(TUTORIAL, 'tj')).filter(file => /^\d\d-/.test(file));
    for (const lesson of lessons) {
      const text = fs.readFileSync(path.join(TUTORIAL, 'tj', lesson), 'utf8');
      for (const link of text.matchAll(/#c=([\w-]+)(?:&i=([\w-]+))?\)/g)) {
        const code = Buffer.from(link[1], 'base64url').toString('utf8');
        const input = link[2] ? Buffer.from(link[2], 'base64url').toString('utf8') : '';
        await same(lesson, code, input);
      }
    }
  });

  test('the reference solutions of the tasks', async () => {
    const tasks = fs
      .readdirSync(TASKS)
      .filter(name => fs.existsSync(path.join(TASKS, name, 'hal.som')));
    expect(tasks.length).toBeGreaterThan(50);
    for (const task of tasks) {
      const source = fs.readFileSync(path.join(TASKS, task, 'hal.som'), 'utf8');
      const input = fs.readFileSync(path.join(TASKS, task, 'tests', '1.in'), 'utf8');
      await same(task, source, input);
    }
  });
});

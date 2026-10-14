import ts from 'typescript';
import * as vm from 'vm';

import { createPlaygroundConsole } from '../src/playground/console';
import { OUTPUT_LINES, runProgram, type RunEvent, type RunHost } from '../src/playground/run';

/**
 * Compiling and running programs in the playground (src/playground/run.ts),
 * here in a vm context instead of a Web Worker.
 */
function host(overrides: Partial<RunHost> = {}) {
  const events: RunEvent[] = [];
  const context = vm.createContext({});
  let resolveDone: () => void = () => undefined;
  const done = new Promise<void>(resolve => {
    resolveDone = resolve;
  });
  const runHost: RunHost = {
    post: event => {
      events.push(event);
      if (event.type === 'done') resolveDone();
    },
    scope: context as Record<string, unknown>,
    timers: { setTimeout, clearTimeout, setInterval, clearInterval } as RunHost['timers'],
    script: code => ({
      file: 'барнома.js',
      run: () => vm.runInContext(code, context, { filename: 'барнома.js' }),
    }),
    ...overrides,
  };
  return { events, done, runHost };
}

async function run(source: string, input = '', language: 'tj' | 'ru' | 'en' = 'tj') {
  const { events, done, runHost } = host();
  const program = runProgram({ source, input, language }, runHost);
  await done;
  return { events, program };
}

const printed = (events: RunEvent[]) =>
  events.flatMap(event => (event.type === 'output' ? [event.text] : []));
const runtimeError = (events: RunEvent[]) =>
  events.find(event => event.type === 'runtimeError') as
    | Extract<RunEvent, { type: 'runtimeError' }>
    | undefined;

describe('running programs in the playground', () => {
  test('what a program prints, with SomonScript names, then done', async () => {
    const { events } = await run('чоп("Салом");\nчоп.сабт(1, дуруст, [холӣ]);\nчоп.хато("бад");');
    expect(events[0]).toMatchObject({ type: 'compiled', diagnostics: [] });
    expect(events.slice(1)).toEqual([
      { type: 'output', stream: 'log', text: 'Салом' },
      { type: 'output', stream: 'log', text: '1 дуруст [ холӣ ]' },
      { type: 'output', stream: 'error', text: 'бад' },
      { type: 'done' },
    ]);
  });

  test('input comes from the input field, line by line', async () => {
    const source = 'тағ а = хонданиРақам();\nтағ б = хонданиРақам();\nчоп("Ҷамъ:", а + б);';
    expect(printed((await run(source, '2\n3')).events)).toEqual(['Ҷамъ: 5']);
    const { events } = await run(source, '2\nсе\n');
    expect(runtimeError(events)).toEqual({
      type: 'runtimeError',
      line: 2,
      text: [
        'Хатои иҷро дар сатри 2:',
        '  `се` рақам нест: `хонданиРақам()` рақам интизор буд.',
        '    2 | тағ б = хонданиРақам();',
        '      |         ^^^^^^^^^^^^',
        '  Маслиҳат: Дар ин сатри вуруд рақам нависед, масалан `42` ё `2,5`.',
      ].join('\n'),
    });
    expect(events[events.length - 1]).toEqual({ type: 'done' });
  });

  test('prompts are printed with what comes next, as in a terminal', async () => {
    const source =
      'тағ а = хонданиРақам("Якум: ");\nтағ б = хонданиРақам("Дуюм: ");\nчоп("Ҷамъ:", а + б);';
    expect(printed((await run(source, '2\n3')).events)).toEqual(['Якум: Дуюм: Ҷамъ: 5']);
    const failed = await run(source, '2\n');
    expect(printed(failed.events)).toEqual(['Якум: Дуюм: ']);
    expect(printed((await run('хондан("Ном: ");', 'Алӣ')).events)).toEqual(['Ном: ']);
  });

  test('a program that does not compile is not run', async () => {
    const { events, runHost } = host();
    const program = runProgram(
      { source: 'тағ х = 1;\nагр (х) {}\n', input: '', language: 'tj' },
      runHost
    );
    program.fail(new Error('пас аз хато'));
    expect(events).toEqual([
      {
        type: 'notCompiled',
        diagnostics: [expect.objectContaining({ severity: 'error', line: 2 })],
        summary: 'Барнома компайл нашуд: 1 хато.',
      },
    ]);
    const typed = host();
    runProgram({ source: 'тағ х: рақам = "а";', input: '', language: 'ru' }, typed.runHost);
    expect(typed.events[0]).toMatchObject({
      type: 'notCompiled',
      summary: 'Программа не скомпилирована: 1 ошибка.',
    });
  });

  test('warnings are shown and the program runs', async () => {
    const { events } = await run('тағ х = 5;\nчоп(х.дарозии);');
    expect(events[0]).toMatchObject({
      type: 'compiled',
      diagnostics: [{ severity: 'warning', line: 2, text: expect.stringContaining('Огоҳӣ') }],
    });
    expect(printed(events)).toEqual(['беқимат']);
  });

  test('an empty program runs and ends', async () => {
    expect((await run('')).events).toEqual([
      { type: 'compiled', code: '', diagnostics: [] },
      { type: 'done' },
    ]);
  });

  test('errors of the running program, on the line of the source', async () => {
    const read = runtimeError((await run('тағ р = [1];\n\nчоп(р[5].дарозӣ);')).events)!;
    expect(read.line).toBe(3);
    expect(read.text).toContain('      |          ^^^^^^');
    expect(read.text).toContain('индексҳо аз 0 то');
    // On the first line, after the code the program is wrapped in
    const first = runtimeError((await run('тағ о: ҳар = холӣ; чоп(о.ном);')).events)!;
    expect(first.text.split('\n').slice(2, 4)).toEqual([
      '    1 | тағ о: ҳар = холӣ; чоп(о.ном);',
      '      |                          ^^^',
    ]);
    const recursion = runtimeError(
      (await run('функсия ф(н: рақам): рақам {\n  бозгашт ф(н + 1);\n}\nф(1);')).events
    )!;
    expect(recursion.line).toBe(2);
    expect(recursion.text).toContain('Шояд функсия худашро беохир даъват мекунад?');
  });

  test('what the program throws keeps its message; values have no place', async () => {
    const thrown = runtimeError(
      (await run('чоп(1);\nпартофтан нав Хато("Ба сифр тақсим кардан мумкин нест");')).events
    )!;
    expect(thrown).toMatchObject({ line: 2 });
    expect(thrown.text).toContain('Барнома хато партофт: Ба сифр тақсим кардан мумкин нест');
    const value = runtimeError((await run('партофтан "бад";', '', 'en')).events)!;
    expect(value).toEqual({
      type: 'runtimeError',
      text: 'Runtime error:\n  The program threw an error: бад',
      line: undefined,
    });
  });

  test('errors of code without places: thrown холӣ, other files, lowered code', async () => {
    expect(runtimeError((await run('партофтан холӣ;')).events)).toMatchObject({ line: undefined });

    const fresh = host();
    fresh.runHost.timers = { ...fresh.runHost.timers, setTimeout: () => 0 };
    const running = runProgram({ source: 'чоп(1);', input: '', language: 'tj' }, fresh.runHost);
    running.fail({ name: 'Error', message: 'х', stack: 'Error: х\n    at дигар.js:1:1' });
    expect(runtimeError(fresh.events)).toMatchObject({ line: undefined });

    // A page that loaded TypeScript lowers decorators: the code has other positions
    const scope = global as { ts?: unknown };
    scope.ts = ts;
    try {
      const { events } = await run(
        'функсия ф(а: ҳар, б: ҳар) {}\n@ф синф К {}\nтағ о: ҳар = холӣ;\nчоп(о.х);'
      );
      expect(runtimeError(events)).toMatchObject({ line: undefined });
    } finally {
      delete scope.ts;
    }
  });

  test('a program cannot import modules', async () => {
    const error = runtimeError((await run('ворид { х } аз "./м";\nчоп(х);')).events)!;
    expect(error.text).toContain(
      'Дар майдони озмоиш модули `./м`-ро ворид кардан мумкин нест: тамоми барномаро дар як файл нависед.'
    );
    expect(error.line).toBe(1);
  });

  test('timers run before the program is done; their errors end it', async () => {
    const later = await run(
      'setTimeout(() => чоп("баъд"), 5);\nтағ т = setTimeout(() => чоп("не"), 1);\nclearTimeout(т);\n' +
        'setTimeout("на функсия", 1);\nчоп("пеш");'
    );
    expect(printed(later.events)).toEqual(['пеш', 'баъд']);
    const interval = await run(
      'тағ н = 0;\nтағ т = setInterval(() => {\n  н++;\n  чоп(н);\n  агар (н === 3) clearInterval(т);\n}, 1);'
    );
    expect(printed(interval.events)).toEqual(['1', '2', '3']);
    const failing = await run(
      'setTimeout(() => {\n  тағ о: ҳар = холӣ;\n  чоп(о.х);\n}, 1);\nsetTimeout(() => чоп("не"), 20);'
    );
    expect(runtimeError(failing.events)?.line).toBe(3);
    expect(printed(failing.events)).toEqual([]);
  });

  test('promises settle before the program is done', async () => {
    const { events } = await run(
      'ҳамзамон функсия ф() {\n  интизор нав Ваъда(ҳал => setTimeout(ҳал, 5));\n  чоп("баъд аз интизор");\n}\nф();'
    );
    expect(printed(events)).toEqual(['баъд аз интизор']);
  });

  test('the host reports rejections; a finished program ignores more', async () => {
    const { events, program } = await run('чоп(1);');
    program.fail(new Error('дер'));
    expect(events.filter(event => event.type === 'done')).toHaveLength(1);

    const fresh = host();
    fresh.runHost.timers = { ...fresh.runHost.timers, setTimeout: () => 0 };
    const running = runProgram({ source: 'чоп(1);', input: '', language: 'tj' }, fresh.runHost);
    // A stack that names the program before its first statement
    running.fail({ name: 'Error', message: 'х', stack: 'Error: х\n    at барнома.js:1:1' });
    expect(runtimeError(fresh.events)).toMatchObject({ line: undefined });
  });

  test('a script the host cannot make is an error of the run', () => {
    const { events, runHost } = host({
      script: () => {
        throw Object.assign(new SyntaxError('Unexpected token'), { stack: 'SyntaxError' });
      },
    });
    runProgram({ source: 'чоп(1);', input: '', language: 'tj' }, runHost);
    expect(runtimeError(events)?.text).toContain('Хатои иҷро:');
  });

  test('long output is cut off', async () => {
    const { events } = await run('барои (тағ и = 0; и < 1100; и++) {\n  чоп(и);\n}\nчоп("а\\nб");');
    expect(printed(events)).toHaveLength(OUTPUT_LINES);
    expect(events.filter(event => event.type === 'outputLimit')).toEqual([
      { type: 'outputLimit', lines: OUTPUT_LINES },
    ]);
    const lines = await run(
      `барои (тағ и = 0; и < ${OUTPUT_LINES - 1}; и++) {\n  чоп(и);\n}\nчоп("а\\nб\\nв");`
    );
    expect(printed(lines.events).pop()).toBe('а');
  });
});

describe('the console of the playground', () => {
  test('streams, groups, counts, timers and assertions', () => {
    const lines: string[] = [];
    let time = 100;
    const output = createPlaygroundConsole(
      (stream, text) => lines.push(`${stream}: ${text}`),
      () => time
    );
    output.info('маълумот');
    output.debug(дуруст);
    output.trace('пай');
    output.warn('огоҳӣ');
    output.dir({ а: 1 });
    output.table([1]);
    output.group('Гурӯҳ');
    output.log('дар\nдохил');
    output.groupCollapsed();
    output.log('чуқур');
    output.groupEnd();
    output.groupEnd();
    output.count();
    output.count();
    output.countReset();
    output.count('н');
    output.time();
    time = 112;
    output.timeLog(undefined, 'миёна');
    output.timeEnd();
    output.timeEnd('нест');
    output.assert(дуруст);
    output.assert(нодуруст);
    output.assert(нодуруст, 'паём %d', 5);
    output.assert(нодуруст, { а: 1 });
    output.clear();
    expect(lines).toEqual([
      'log: маълумот',
      'log: дуруст',
      'log: пай',
      'warn: огоҳӣ',
      'log: { а: 1 }',
      'log: [ 1 ]',
      'log: Гурӯҳ',
      'log:   дар\n  дохил',
      'log:     чуқур',
      'log: default: 1',
      'log: default: 2',
      'log: н: 1',
      'log: default: 12ms миёна',
      'log: default: 12ms',
      'log: нест: 0ms',
      'warn: Тасдиқ нашуд',
      'warn: Тасдиқ нашуд: паём 5',
      'warn: Тасдиқ нашуд: { а: 1 }',
    ]);
  });

  test('uses the clock by default', () => {
    const lines: string[] = [];
    const output = createPlaygroundConsole((_stream, text) => lines.push(text));
    output.time('т');
    output.timeEnd('т');
    expect(lines[0]).toMatch(/^т: \d+ms$/);
  });
});

const дуруст = true;
const нодуруст = false;

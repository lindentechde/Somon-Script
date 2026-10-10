import * as fs from 'fs';
import * as path from 'path';
import { pathToFileURL } from 'url';

import {
  columnOfName,
  explainError,
  locateError,
  readsByIndex,
  tajikNames,
} from '../src/runtime/errors';
import {
  installErrorReporter,
  reportError,
  type ReporterProcess,
} from '../src/runtime/node-errors';
import { canonicalTmpDir } from './helpers/paths';

/** Errors of a running program, explained for learners (src/runtime/errors.ts, node-errors.ts). */
describe('explaining errors', () => {
  const engine = (Type: ErrorConstructor, text: string) => explainError(new Type(text));

  test('reading or setting a member of беқимат or холӣ', () => {
    expect(engine(TypeError, "Cannot read properties of undefined (reading 'length')")).toEqual({
      message: { id: 'RUNTIME_READ_OF_NOTHING', params: { property: 'дарозӣ', value: 'беқимат' } },
      hint: { id: 'CHECK_VALUE', params: { value: 'беқимат' } },
    });
    expect(engine(TypeError, 'Cannot read property of null').message.params).toEqual({
      property: '?',
      value: 'холӣ',
    });
    expect(engine(TypeError, "Cannot set properties of null (setting 'ном')").message).toEqual({
      id: 'RUNTIME_WRITE_TO_NOTHING',
      params: { property: 'ном', value: 'холӣ' },
    });
    expect(engine(TypeError, 'Cannot set properties of undefined').message.params.property).toBe(
      '?'
    );
  });

  test('names, calls and other mistakes of the engine', () => {
    expect(engine(ReferenceError, 'хато is not defined').message).toEqual({
      id: 'RUNTIME_NOT_DEFINED',
      params: { name: 'хато' },
    });
    expect(engine(ReferenceError, "Cannot access 'х' before initialization")).toEqual({
      message: { id: 'RUNTIME_BEFORE_DECLARATION', params: { name: 'х' } },
      hint: { id: 'DECLARE_BEFORE_USE', params: {} },
    });
    expect(engine(TypeError, 'console.сабтт is not a function').message).toEqual({
      id: 'RUNTIME_NOT_A_FUNCTION',
      params: { name: 'чоп.сабтт' },
    });
    expect(engine(TypeError, 'Math is not a constructor').message.params).toEqual({
      name: 'математика',
    });
    expect(engine(TypeError, 'х is not iterable').message.id).toBe('RUNTIME_NOT_ITERABLE');
    expect(engine(RangeError, 'Maximum call stack size exceeded')).toEqual({
      message: { id: 'RUNTIME_STACK_OVERFLOW', params: {} },
      hint: { id: 'STOP_CONDITION', params: {} },
    });
    expect(engine(RangeError, 'Invalid array length').message.id).toBe(
      'RUNTIME_INVALID_ARRAY_LENGTH'
    );
    expect(engine(TypeError, 'Assignment to constant variable.').message.id).toBe(
      'RUNTIME_CONST_ASSIGNMENT'
    );
  });

  test('an engine error it has no words for keeps its own', () => {
    expect(engine(SyntaxError, 'Unexpected end of JSON input')).toEqual({
      message: {
        id: 'RUNTIME_ERROR',
        params: { name: 'SyntaxError', message: 'Unexpected end of JSON input' },
      },
      hint: { id: 'SHOW_STACK', params: {} },
    });
    const system = Object.assign(new Error('ENOENT: no such file'), { code: 'ENOENT' });
    expect(explainError(system).message.id).toBe('RUNTIME_ERROR');
  });

  test('what the program throws keeps its message', () => {
    expect(explainError(new Error('Ба сифр тақсим кардан мумкин нест'))).toEqual({
      message: { id: 'RUNTIME_THROWN', params: { message: 'Ба сифр тақсим кардан мумкин нест' } },
    });
    expect(explainError('сатр').message.params.message).toBe('сатр');
    expect(explainError({ а: дуруст }).message.params.message).toBe('{ а: дуруст }');
    // An error of another realm (a worker, a vm context)
    const foreign = { name: 'TypeError', message: 'х is not a function', stack: 'TypeError: …' };
    expect(explainError(foreign).message.id).toBe('RUNTIME_NOT_A_FUNCTION');
  });

  test('JavaScript names become the Tajik names of the program', () => {
    expect(tajikNames('console.log(р.length)')).toBe('чоп.сабт(р.дарозӣ)');
    expect(tajikNames('номи_ман.push')).toBe('номи_ман.илова');
  });
});

describe('finding the place of an error', () => {
  test('the first frame in a .som file, a path or a file URL', () => {
    const stack = [
      "TypeError: Cannot read properties of undefined (reading 'length')",
      '    at node:internal/main:1:1',
      '    at ф (/дар/барнома.som:2:15)',
      '    at Object.<anonymous> (/дар/барнома.som:5:1)',
    ].join('\n');
    expect(locateError(stack)).toEqual({
      file: '/дар/барнома.som',
      line: 2,
      column: 15,
      functionName: 'ф',
    });
    expect(locateError('Error\n    at file:///дар/б.som:3:4')).toEqual({
      file: 'file:///дар/б.som',
      line: 3,
      column: 4,
    });
    expect(locateError('Error\n    at Object.ф.som (/а.som:1:1)')?.functionName).toBeUndefined();
    expect(locateError('Error\n    at Корбар.ном (/а.som:1:1)')?.functionName).toBe('ном');
    expect(locateError('Error\n    at барнома (барнома:7:2)', 'барнома')).toMatchObject({
      line: 7,
    });
    expect(locateError('Error\n    at x (/а.js:1:1)')).toBeUndefined();
  });

  test('the column of the name the error is about', () => {
    const read = explainError(
      new TypeError("Cannot read properties of undefined (reading 'length')")
    );
    expect(columnOfName('тағ х = р[10].дарозӣ;', 1, read)).toBe(15);
    expect(columnOfName('тағ х = 1;', 1, read)).toBe(1);
    const overflow = explainError(new RangeError('Maximum call stack size exceeded'));
    expect(columnOfName('  бозгашт ф(н + 1);', 3, overflow, 'ф')).toBe(11);
    expect(columnOfName('  бозгашт ф(н + 1);', 3, overflow)).toBe(3);
    const nameless = explainError(new TypeError('Cannot read property of null'));
    expect(columnOfName('чоп(х.у);', 1, nameless)).toBe(1);
  });

  test('an element read by index just before the place', () => {
    expect(readsByIndex('тағ х = р[10].дарозӣ;', 15)).toBe(true);
    expect(readsByIndex('тағ х = р.дарозӣ;', 11)).toBe(false);
  });
});

describe('reporting errors in somon run', () => {
  let dir: string;
  let file: string;

  beforeEach(() => {
    dir = canonicalTmpDir('somon-runtime-errors-');
    file = path.join(dir, 'барнома.som');
    fs.writeFileSync(file, 'тағ р = [1, 2, 3];\nтағ х = р[10].дарозӣ;\n');
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const readError = (at: string) =>
    Object.assign(new TypeError("Cannot read properties of undefined (reading 'length')"), {
      stack: `TypeError: Cannot read properties of undefined (reading 'length')\n    at ${at}`,
    });

  test('what happened, the line of the .som file with a caret, and a hint', () => {
    expect(reportError(readError(`${file}:2:1`), { language: 'tj', cwd: dir })).toBe(
      [
        'Хатои иҷро дар барнома.som, сатри 2:',
        '  Хосияти `дарозӣ`-ро хондан мумкин нест: қимат `беқимат` аст.',
        '    2 | тағ х = р[10].дарозӣ;',
        '      |               ^^^^^^',
        '  Маслиҳат: Шояд дар рӯйхат унсуре бо ин индекс нест: индексҳо аз 0 то `дарозӣ - 1` мебошанд.',
        '',
      ].join('\n')
    );
  });

  test('a file URL, the original stack when asked for, and Russian', () => {
    const error = readError(`Object.<anonymous> (${pathToFileURL(file).href}:2:1)`);
    const text = reportError(error, { language: 'ru', cwd: dir, showStack: true });
    expect(text.startsWith('Ошибка выполнения в барнома.som, строка 2:\n')).toBe(true);
    expect(text.endsWith(`${error.stack}\n`)).toBe(true);
  });

  test('without a readable file, or a place, the message alone', () => {
    const gone = reportError(readError(path.join(dir, 'нест.som:4:2')), {
      language: 'tj',
      cwd: dir,
    });
    expect(gone.split('\n').slice(0, 2)).toEqual([
      'Хатои иҷро дар нест.som, сатри 4:',
      '  Хосияти `дарозӣ`-ро хондан мумкин нест: қимат `беқимат` аст.',
    ]);
    expect(reportError('сатр', { language: 'en' })).toBe(
      'Runtime error:\n  The program threw an error: сатр\n'
    );
    const outside = reportError(readError(`${file}:9:1`), { language: 'tj' });
    expect(outside.split('\n')[0]).toBe(
      `Хатои иҷро дар ${path.relative(process.cwd(), file)}, сатри 9:`
    );
  });

  test('installs on the process: errors and rejections end the program with code 1', () => {
    const listeners: Record<string, (error: unknown) => void> = {};
    const written: string[] = [];
    const exit = jest.fn();
    const target: ReporterProcess = {
      on: (event, listener) => {
        listeners[event] = listener;
      },
      exit,
      setSourceMapsEnabled: jest.fn(),
      stderr: {
        write: (text, done) => {
          written.push(text);
          done();
        },
      },
    };
    installErrorReporter({ language: 'tj', cwd: dir }, target);
    expect(target.setSourceMapsEnabled).toHaveBeenCalledWith(true);
    listeners.uncaughtException(readError(`${file}:2:1`));
    listeners.unhandledRejection(new Error('бад'));
    expect(written).toHaveLength(2);
    expect(written[1]).toBe('Хатои иҷро:\n  Барнома хато партофт: бад\n');
    expect(exit.mock.calls).toEqual([[1], [1]]);
  });

  test('installs on the real process by default', () => {
    const on = jest.spyOn(process, 'on').mockReturnValue(process);
    const enable = jest.spyOn(process, 'setSourceMapsEnabled').mockImplementation(() => undefined);
    try {
      installErrorReporter({ language: 'tj' });
      expect(on.mock.calls.map(call => call[0])).toEqual([
        'uncaughtException',
        'unhandledRejection',
      ]);
      expect(enable).toHaveBeenCalledWith(true);
    } finally {
      on.mockRestore();
      enable.mockRestore();
    }
  });
});

const дуруст = true;

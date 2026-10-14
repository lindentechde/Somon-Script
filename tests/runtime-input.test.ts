import * as vm from 'vm';

import { compile } from '../src/compiler';
import { explainError } from '../src/runtime/errors';
import {
  createInput,
  INPUT_GLOBAL,
  InputError,
  parseNumber,
  type InputHost,
} from '../src/runtime/input';
import { nodeInputHost, type InputFileSystem } from '../src/runtime/node-input';

/** A host that gives `pieces` one at a time, as reads of standard input would. */
function fakeHost(pieces: string[], interactive = false) {
  const written: string[] = [];
  const host: InputHost = {
    read: () => (pieces.length > 0 ? pieces.shift()! : null),
    write: text => {
      written.push(text);
    },
    interactive,
  };
  return { host, written };
}

/** `хондан()` and `хонданиРақам()` (src/runtime/input.ts). */
describe('reading input', () => {
  test('lines without their line breaks, in order, across pieces of input', () => {
    const { host } = fakeHost(['Ал', 'ӣ\r\nдуюм\n', '\nохир']);
    const input = createInput(host, 'tj');
    expect(input.хондан()).toBe('Алӣ');
    expect(input.хондан()).toBe('дуюм');
    expect(input.хондан()).toBe('');
    // The last line, without a line break after it
    expect(input.хондан()).toBe('охир');
    expect(() => input.хондан()).toThrow(InputError);
  });

  test('the end of the input is an error of the function that read', () => {
    const input = createInput(fakeHost([]).host, 'tj');
    let error: unknown;
    try {
      input.хонданиРақам();
    } catch (thrown) {
      error = thrown;
    }
    expect(error).toMatchObject({
      name: 'InputError',
      kind: 'ended',
      functionName: 'хонданиРақам',
      message: 'The input ended: хонданиРақам() expected another line',
    });
  });

  test('a prompt is printed before reading, without a line break', () => {
    const { host, written } = fakeHost(['Алӣ\n7\n']);
    const input = createInput(host, 'tj');
    expect(input.хондан('Номи шумо: ')).toBe('Алӣ');
    expect(input.хонданиРақам(42)).toBe(7);
    expect(written).toEqual(['Номи шумо: ', '42']);
  });

  test('numbers with a decimal point or comma, signs and exponents', () => {
    const { host } = fakeHost([' 42 \n-3\n2,5\n0.5\n+7\n.5\n1e3\n']);
    const input = createInput(host, 'tj');
    expect([1, 2, 3, 4, 5, 6, 7].map(() => input.хонданиРақам())).toEqual([
      42, -3, 2.5, 0.5, 7, 0.5, 1000,
    ]);
    for (const text of ['', ' ', 'се', '1.2.3', '1,5,5', '12а', '0x10', 'Infinity', '-']) {
      expect(parseNumber(text)).toBeUndefined();
    }
  });

  test('what is no number is an error when the input comes from a file', () => {
    const input = createInput(fakeHost(['  се \n']).host, 'tj');
    expect(() => input.хонданиРақам()).toThrow(
      expect.objectContaining({
        kind: 'notNumber',
        functionName: 'хонданиРақам',
        text: 'се',
        message: "'се' is not a number: хонданиРақам() expected one",
      })
    );
  });

  test('what is no number is asked again when a person types the input', () => {
    const { host, written } = fakeHost(['се\n', '\n', '3\n'], true);
    const input = createInput(host, 'tj');
    expect(input.хонданиРақам('Рақам: ')).toBe(3);
    expect(written).toEqual([
      'Рақам: ',
      '`се` рақам нест. Боз як бор рақам нависед:\n',
      'Рақам: ',
      'Ин рақам нест. Боз як бор рақам нависед:\n',
      'Рақам: ',
    ]);
    const russian = fakeHost(['х\n', '1\n'], true);
    createInput(russian.host, 'ru').хонданиРақам();
    expect(russian.written).toEqual(['`х` — не число. Введите число ещё раз:\n']);
  });

  test('the errors of input are explained for learners', () => {
    expect(explainError(new InputError('ended', 'хондан'))).toEqual({
      message: { id: 'RUNTIME_INPUT_ENDED', params: { name: 'хондан' } },
      hint: { id: 'INPUT_LINES', params: {} },
    });
    expect(explainError(new InputError('notNumber', 'хонданиРақам', 'се'))).toEqual({
      message: { id: 'RUNTIME_INPUT_NOT_A_NUMBER', params: { name: 'хонданиРақам', text: 'се' } },
      hint: { id: 'INPUT_NUMBER', params: {} },
    });
  });
});

/** Reading standard input in Node.js (src/runtime/node-input.ts). */
describe('the input of Node.js', () => {
  /** A file system whose reads of standard input give `reads` in turn: bytes or an error code. */
  function fakeFiles(reads: Array<number[] | string>) {
    const written: Array<[number, string]> = [];
    const files: InputFileSystem = {
      readSync: (fd, buffer, offset) => {
        expect(fd).toBe(0);
        const next = reads.shift();
        if (next === undefined) return 0;
        if (typeof next === 'string') throw Object.assign(new Error(next), { code: next });
        buffer.set(next, offset);
        return next.length;
      },
      writeSync: (fd, text) => {
        written.push([fd, text]);
        return text.length;
      },
    };
    return { files, written };
  }

  const bytes = (text: string) => [...Buffer.from(text, 'utf-8')];

  test('reads what standard input holds, then its end', () => {
    const { files } = fakeFiles([bytes('2\n'), bytes('3\n')]);
    const host = nodeInputHost(files, false);
    expect([host.read(), host.read(), host.read(), host.read()]).toEqual([
      '2\n',
      '3\n',
      null,
      null,
    ]);
    expect(host.interactive).toBe(false);
  });

  test('a character split between two reads is decoded whole', () => {
    const [first, second] = bytes('ҷ');
    const { files } = fakeFiles([[first], [second, 10]]);
    const host = nodeInputHost(files, true);
    expect(host.read()).toBe('');
    expect(host.read()).toBe('ҷ\n');
    expect(host.interactive).toBe(true);
  });

  test('a character cut off at the end of the input', () => {
    const { files } = fakeFiles([[bytes('ҷ')[0]]]);
    const host = nodeInputHost(files, false);
    expect(host.read()).toBe('');
    expect(host.read()).toBe('�');
    expect(host.read()).toBeNull();
  });

  test('non-blocking standard input is read again; the EOF of Windows ends it', () => {
    const { files } = fakeFiles(['EAGAIN', 'EAGAIN', bytes('1\n'), 'EOF']);
    const host = nodeInputHost(files, false);
    expect(host.read()).toBe('1\n');
    expect(host.read()).toBeNull();
  });

  test('other errors of reading are not hidden', () => {
    const { files } = fakeFiles(['EBADF']);
    expect(() => nodeInputHost(files, false).read()).toThrow('EBADF');
  });

  test('prompts are written to standard output', () => {
    const { files, written } = fakeFiles([]);
    nodeInputHost(files, false).write('Ном: ');
    expect(written).toEqual([[1, 'Ном: ']]);
  });

  test('uses the real standard input by default', () => {
    expect(typeof nodeInputHost().interactive).toBe('boolean');
  });
});

/** Programs that read input: their output, types and declarations. */
describe('programs that read input', () => {
  const PROGRAM = [
    'тағ ном = хондан("Ном: ");',
    'тағ а = хонданиРақам();',
    'тағ б = хонданиРақам();',
    'чоп.сабт(ном, а + б);',
  ].join('\n');

  /** Runs compiled code with the input functions reading `pieces`. */
  function run(code: string, pieces: string[]) {
    const logged: unknown[][] = [];
    const { host } = fakeHost(pieces);
    const context = vm.createContext({
      console: { log: (...args: unknown[]) => logged.push(args) },
      [INPUT_GLOBAL]: createInput(host, 'tj'),
    });
    vm.runInContext(code, context);
    return logged;
  }

  test('take the input functions from the run time', () => {
    const result = compile(PROGRAM);
    expect(result.errors).toEqual([]);
    expect(result.code).toContain('globalThis.__somonInput');
    expect(run(result.code, ['Алӣ\n2\n3\n'])).toEqual([['Алӣ', 5]]);
    expect(compile(PROGRAM, { module: 'esm' }).code).toContain('globalThis.__somonInput');
  });

  test('without the run time, a call says where input can be read', () => {
    const code = compile('тағ х = хондан();').code;
    expect(() => vm.runInNewContext(code, {})).toThrow(
      "хондан() and хонданиРақам() read input when the program runs with 'somon run' or in the playground"
    );
  });

  test('programs that do not read input, or declare the names themselves, are not changed', () => {
    expect(compile('чоп(1);').code).not.toContain('__somonInput');
    const own = compile('функсия хондан(): сатр {\n  бозгашт "х";\n}\nчоп(хондан());');
    expect(own.errors).toEqual([]);
    expect(own.code).not.toContain('__somonInput');
    expect(compile('тағ о = { хондан: 1 };\nчоп(о.хондан);').code).not.toContain('__somonInput');
  });

  test('the type checker knows what they return', () => {
    expect(compile('тағ а: рақам = хонданиРақам("?");\nтағ б: сатр = хондан();').errors).toEqual(
      []
    );
    const wrong = compile('тағ х: рақам = хондан();', { language: 'tj' });
    expect(wrong.diagnostics?.map(d => d.code)).toEqual(['TYPE_NOT_ASSIGNABLE']);
    expect(wrong.errors[0]).toContain('сатр');
  });

  test('a misspelt name of an input function is suggested', () => {
    const typo = compile('тағ а = хонданиРакам();', { language: 'tj' });
    expect(typo.diagnostics?.[0].hint).toBe('Шояд `хонданиРақам`-ро дар назар доштед?');
  });

  test('TypeScript output declares them', () => {
    const result = compile('тағ а: рақам = хонданиРақам();\nтағ б: сатр = хонданиРақам();', {
      checker: 'typescript',
    });
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("Type 'рақам' is not assignable to type 'сатр'");
    expect(result.errors[0]).toContain('line 2');
  });
});

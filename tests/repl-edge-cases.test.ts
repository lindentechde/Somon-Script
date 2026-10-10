/**
 * The REPL on rarer paths: the default prompts, Ctrl+C from the terminal,
 * values that cannot be shown, input that ends while lines wait, and
 * top-level `интизор` with holes in patterns and declarations without a
 * value.
 */
import { PassThrough } from 'stream';

import { DEFAULT_REPL_MESSAGES, Repl } from '../src/tools/repl';

/** Waits until pending stream events and promise jobs have run. */
const settle = () => new Promise(resolve => setTimeout(resolve, 20));

describe('Repl: a terminal session', () => {
  test('default prompts, a value that cannot be shown, Ctrl+C twice', async () => {
    const input = new PassThrough();
    const output = new PassThrough();
    let printed = '';
    output.on('data', chunk => (printed += chunk.toString()));
    // No historyFile: the history is not written anywhere
    const repl = new Repl({ input, output, terminal: true, colors: false });
    const done = repl.start();
    input.write('тағ а = (\r');
    await settle();
    expect(printed).toContain('... ');
    input.write('1 + 2);\r');
    input.write('а\r');
    await settle();
    expect(printed).toContain('3');
    // util.inspect calls the custom inspection, which throws: the session goes on
    input.write(
      'собит бад = { [Symbol.for("nodejs.util.inspect.custom")]() { партофтан нав Хато("нишон намедиҳам"); } };\r'
    );
    input.write('бад\r');
    await settle();
    expect(printed).toContain(`${DEFAULT_REPL_MESSAGES.error} нишон намедиҳам`);
    input.write('а * 2\r');
    await settle();
    expect(printed).toContain('6');
    // Ctrl+C on an empty line: the hint; a second one: the end
    input.write('\x03');
    await settle();
    expect(printed).toContain(DEFAULT_REPL_MESSAGES.exitHint);
    input.write('\x03');
    await done;
    expect(printed).toContain('сомон> ');
  });
});

describe('Repl: input that ends while lines wait', () => {
  test('every queued line still runs', async () => {
    const input = new PassThrough();
    const output = new PassThrough();
    let printed = '';
    output.on('data', chunk => (printed += chunk.toString()));
    const done = new Repl({ input, output, colors: false }).start();
    // The first line waits for a timer: the input has ended before the others run
    input.end(
      'тағ х = интизор нав Ваъда<рақам>(ҳал => setTimeout(() => ҳал(20), 20));\nх + 1\nх + 2\n'
    );
    await done;
    expect(printed).toContain('21');
    expect(printed).toContain('22');
  });
});

describe('Repl: top-level интизор', () => {
  test('holes in array patterns and declarations without a value', async () => {
    const repl = new Repl({ input: new PassThrough(), output: new PassThrough() });
    const first = await repl.evaluate(
      'собит [, дуюм] = интизор Ваъда.resolve([1, 2]);\nтағ холӣ_мон;\nдуюм'
    );
    expect(first).toEqual({ errors: [], hasValue: true, value: 2 });
    // Both names stay declared in the session
    expect(await repl.evaluate('[дуюм, холӣ_мон]')).toEqual({
      errors: [],
      hasValue: true,
      value: [2, undefined],
    });
  });
});

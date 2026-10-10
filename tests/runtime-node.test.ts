import { installTajikConsole } from '../src/runtime/node';

/** The console `somon run` gives programs (src/runtime/node.ts). */
describe('installTajikConsole', () => {
  function fakeConsole() {
    const printed: Array<[string, unknown[]]> = [];
    const record =
      (method: string) =>
      (...args: unknown[]): void => {
        printed.push([method, args]);
      };
    const target = {
      log: record('log'),
      info: record('info'),
      debug: record('debug'),
      warn: record('warn'),
      error: record('error'),
      assert: record('assert'),
    };
    return { target, printed };
  }

  test('printing methods print one string with SomonScript names', () => {
    const { target, printed } = fakeConsole();
    installTajikConsole(target as unknown as typeof console);
    target.log(true, null, [undefined]);
    target.info('%s!', false);
    target.debug(NaN);
    target.warn({ а: 1 });
    target.error(new Error('бад'));
    expect(printed).toEqual([
      ['log', ['дуруст холӣ [ беқимат ]']],
      ['info', ['нодуруст!']],
      ['debug', ['ғайрирақам']],
      ['warn', ['{ а: 1 }']],
      ['error', ['Хато: бад']],
    ]);
  });

  test('values the formatter does not know print as Node.js prints them', () => {
    const { target, printed } = fakeConsole();
    installTajikConsole(target as unknown as typeof console);
    target.log(new Uint8Array([1, 2]));
    expect(printed).toEqual([['log', ['Uint8Array(2) [ 1, 2 ]']]]);
  });

  test('a failed assertion warns in Tajik; a passing one prints nothing', () => {
    const { target, printed } = fakeConsole();
    installTajikConsole(target as unknown as typeof console);
    target.assert(true, 'намешавад');
    target.assert(false);
    target.assert(0, 'паём: %s', дуруст);
    target.assert(null, { а: 1 }, 2);
    expect(printed).toEqual([
      ['warn', ['Тасдиқ нашуд']],
      ['warn', ['Тасдиқ нашуд: паём: дуруст']],
      ['warn', ['Тасдиқ нашуд: { а: 1 } 2']],
    ]);
  });

  test('installs on the global console by default', () => {
    const saved = { ...console };
    const log = jest.fn();
    console.log = log;
    try {
      installTajikConsole();
      console.log(false);
      expect(log).toHaveBeenCalledWith('нодуруст');
    } finally {
      Object.assign(console, saved);
    }
  });
});

const дуруст = true;

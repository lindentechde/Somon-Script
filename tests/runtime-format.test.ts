import { formatArgs, formatNumber, formatValue, inspect } from '../src/runtime/format';

/**
 * How `чоп(…)` / `чоп.сабт(…)` print values in `somon run` and the
 * playground: SomonScript's names for JavaScript's special values.
 */
describe('runtime value formatting', () => {
  test('special values print with their SomonScript names', () => {
    expect(formatArgs([true, false, null, undefined])).toBe('дуруст нодуруст холӣ беқимат');
    expect(formatArgs([NaN, Infinity, -Infinity])).toBe('ғайрирақам беохир -беохир');
  });

  test('numbers, bigints and symbols print as JavaScript writes them', () => {
    expect(formatArgs([42, 3.5, -0, 10n, Symbol('х')])).toBe('42 3.5 -0 10n Symbol(х)');
    expect(formatNumber(1e21)).toBe('1e+21');
  });

  test('a string prints as it is at the top level and in quotes inside containers', () => {
    expect(formatArgs(['Салом', 'ҷаҳон'])).toBe('Салом ҷаҳон');
    expect(formatValue('матн')).toBe('матн');
    expect(inspect('матн')).toBe('"матн"');
    expect(formatArgs([['а', 'б"в\nг']])).toBe('[ "а", "б\\"в\\nг" ]');
  });

  test('arrays and objects show their elements with SomonScript names', () => {
    expect(formatArgs([[1, true, null, undefined]])).toBe('[ 1, дуруст, холӣ, беқимат ]');
    expect(formatArgs([{ ном: 'Нексия', тайёр: false }])).toBe(
      '{ ном: "Нексия", тайёр: нодуруст }'
    );
    expect(formatArgs([[], {}])).toBe('[] {}');
    expect(formatArgs([[[1, [2, [3]]]]])).toBe('[ [ 1, [ 2, [ 3 ] ] ] ]');
  });

  test('keys that are not identifiers are quoted; symbol keys are shown', () => {
    const key = Symbol('калид');
    expect(formatArgs([{ 'a-b': 1, 2: 'ду', $х_1: 3, [key]: 4 }])).toBe(
      '{ "2": "ду", "a-b": 1, $х_1: 3, [Symbol(калид)]: 4 }'
    );
  });

  test('non-enumerable properties are left out and getters are not called', () => {
    const value = Object.defineProperty({ а: 1 }, 'пинҳон', { value: 2, enumerable: false });
    let called = false;
    Object.defineProperty(value, 'ҳисоб', {
      enumerable: true,
      get: () => {
        called = true;
        return 3;
      },
    });
    expect(formatArgs([value])).toBe('{ а: 1, ҳисоб: [ҳисобшаванда] }');
    expect(called).toBe(false);
  });

  test('instances of classes are prefixed with the class name', () => {
    class Корбар {
      ном = 'Алӣ';
    }
    class Холӣ {}
    expect(formatArgs([new Корбар(), new Холӣ()])).toBe('Корбар { ном: "Алӣ" } Холӣ {}');
    expect(formatArgs([Object.create(null)])).toBe('{}');
    const anonymous = new (class {
      а = 1;
    })();
    expect(formatArgs([anonymous])).toBe('{ а: 1 }');
    const withoutName = Object.create({ constructor: { name: 42 } });
    expect(formatArgs([withoutName])).toBe('{}');
  });

  test('holes in arrays and long arrays', () => {
    // eslint-disable-next-line no-sparse-arrays
    expect(formatArgs([[1, , , 4, ,]])).toBe('[ 1, <2 ҷои холӣ>, 4, <1 ҷои холӣ> ]');
    const long = Array.from({ length: 103 }, (_, index) => index);
    const printed = formatArgs([long]);
    expect(printed).toContain('... боз 3 унсур');
    expect(printed).not.toContain('100,');
    expect(printed.split('\n').length).toBeGreaterThan(3);
  });

  test('long containers are broken into lines', () => {
    const words = Array.from({ length: 8 }, (_, index) => `калимаи дарози рақами ${index}`);
    const printed = formatArgs([words]);
    expect(printed).toBe(`[\n${words.map(word => `  "${word}"`).join(',\n')}\n]`);
    const nested = formatArgs([{ рӯйхат: words }]);
    expect(nested.startsWith('{\n  рӯйхат: [\n    "калимаи')).toBe(true);
    expect(nested.endsWith('\n  ]\n}')).toBe(true);
    const numbers = formatArgs([Array.from({ length: 40 }, (_, index) => index)]);
    expect(numbers.split('\n')[1]).toMatch(/^ {2}0, 1, 2, 3/);
  });

  test('functions and classes print as [функсия ном] and [синф Ном]', () => {
    function ҳисоб(): void {}
    class Ҳайвон {}
    expect(formatArgs([ҳисоб, Ҳайвон, () => 1])).toBe('[функсия ҳисоб] [синф Ҳайвон] [функсия]');
    const unnamed = Object.defineProperty(() => 1, 'name', { value: undefined });
    expect(formatArgs([unnamed])).toBe('[функсия]');
  });

  test('Map, Set, dates, regular expressions and boxed primitives', () => {
    expect(formatArgs([new Map([['а', 1]]), new Set([1, true])])).toBe(
      'Map(1) { "а" => 1 } Set(2) { 1, дуруст }'
    );
    expect(formatArgs([new Map(), new Set()])).toBe('Map(0) {} Set(0) {}');
    expect(formatArgs([new Date(0), new Date(Number.NaN)])).toBe(
      '1970-01-01T00:00:00.000Z Invalid Date'
    );
    expect(formatArgs([/а+/g])).toBe('/а+/g');
    // eslint-disable-next-line no-new-wrappers
    expect(formatArgs([new Boolean(false), new Number(5), new String('с')])).toBe('нодуруст 5 "с"');
  });

  test('errors print as their name and message, Error as Хато', () => {
    expect(formatArgs([new Error('Тақсим ба сифр')])).toBe('Хато: Тақсим ба сифр');
    expect(formatArgs([new TypeError('бад')])).toBe('TypeError: бад');
    expect(formatArgs([new Error()])).toBe('Хато');
  });

  test('cycles and deep nesting are cut short', () => {
    const cycle: Record<string, unknown> = { ном: 'а' };
    cycle.худ = cycle;
    expect(formatArgs([cycle])).toBe('{ ном: "а", худ: [даврӣ] }');
    const deep = [[[[[[[[1]]]]]]]];
    expect(formatArgs([deep])).toBe('[ [ [ [ [ [ [ [рӯйхат] ] ] ] ] ] ] ]');
    expect(inspect({ а: { б: 1 } }, { depth: 0 })).toBe('{ а: [объект] }');
  });

  test('values it does not know go to the fallback', () => {
    expect(formatArgs([new Uint8Array(2), Promise.resolve(1)])).toBe(
      '[object Uint8Array] [object Promise]'
    );
    expect(formatArgs([new WeakMap(), new WeakSet()], { fallback: () => '?' })).toBe('? ?');
  });

  test('format strings work as in Node.js', () => {
    expect(formatArgs(['%s аст %d', true, 5])).toBe('дуруст аст 5');
    expect(formatArgs(['%i %f %d %d', 3.7, '2.5', 10n, Symbol('х')])).toBe('3 2.5 10n ғайрирақам');
    expect(formatArgs(['%f', Symbol('х')])).toBe('ғайрирақам');
    expect(formatArgs(['%d', 'а'])).toBe('ғайрирақам');
    expect(formatArgs(['%j %o %O', { а: 1 }, [дуруст()], { б: null }])).toBe(
      '{"а":1} [ дуруст ] { б: холӣ }'
    );
    expect(formatArgs(['%c%s', 'color: red', 'сурх'])).toBe('сурх');
    expect(formatArgs(['100%% %s', 'тайёр'])).toBe('100% тайёр');
    expect(formatArgs(['%s %s', 'як'])).toBe('як %s');
    expect(formatArgs(['%s', 'як', 'ду', false])).toBe('як ду нодуруст');
    const cycle: Record<string, unknown> = {};
    cycle.а = cycle;
    expect(formatArgs(['%j', cycle])).toBe('[даврӣ]');
    expect(formatArgs(['%j', undefined])).toBe('undefined');
  });

  test('a single string is printed as it is, % included', () => {
    expect(formatArgs(['100%'])).toBe('100%');
    expect(formatArgs(['%s'])).toBe('%s');
    expect(formatArgs([])).toBe('');
  });
});

function дуруст(): boolean {
  return true;
}

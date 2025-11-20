import { compile } from '../src/compiler';

describe('Standard Library - Object Tests', () => {
  test('should transpile all object methods correctly', () => {
    const testCases = [
      { source: 'объект.таъин({}, {});', expected: 'Object.assign({}, {})' },
      { source: 'объект.сохтан(беқимат);', expected: 'Object.create(undefined)' },
      { source: 'объект.муайянХосиятҳо({}, {});', expected: 'Object.defineProperties({}, {})' },
      {
        source: 'объект.муайянХосият({}, "prop", {});',
        expected: 'Object.defineProperty({}, "prop", {})',
      },
      { source: 'объект.воридот({});', expected: 'Object.entries({})' },
      { source: 'объект.яхКардан({});', expected: 'Object.freeze({})' },
      { source: 'объект.азВоридот([]);', expected: 'Object.fromEntries([])' },
      {
        source: 'объект.тавсифиХосият({}, "prop");',
        expected: 'Object.getOwnPropertyDescriptor({}, "prop")',
      },
      { source: 'объект.тавсифиХосиятҳо({});', expected: 'Object.getOwnPropertyDescriptors({})' },
      { source: 'объект.номҳоиХосият({});', expected: 'Object.getOwnPropertyNames({})' },
      { source: 'объект.рамзҳоиХосият({});', expected: 'Object.getOwnPropertySymbols({})' },
      { source: 'объект.прототип({});', expected: 'Object.getPrototypeOf({})' },
      { source: 'объект.гурӯҳбандӣ([], x => x);', expected: 'Object.groupBy([], (x) => x)' },
      { source: 'объект.дорадХосият({}, "prop");', expected: 'Object.hasOwn({}, "prop")' },
      { source: 'объект.аст(1, 1);', expected: 'Object.is(1, 1)' },
      { source: 'объект.васеъшаванда({});', expected: 'Object.isExtensible({})' },
      { source: 'объект.яхшуда({});', expected: 'Object.isFrozen({})' },
      { source: 'объект.мӯҳршуда({});', expected: 'Object.isSealed({})' },
      { source: 'объект.калидҳо({});', expected: 'Object.keys({})' },
      { source: 'объект.манъиВасеъшавӣ({});', expected: 'Object.preventExtensions({})' },
      { source: 'объект.мӯҳр({});', expected: 'Object.seal({})' },
      { source: 'объект.танзимиПрототип({}, {});', expected: 'Object.setPrototypeOf({}, {})' },
      { source: 'объект.қиматҳо({});', expected: 'Object.values({})' },
    ];

    testCases.forEach(({ source, expected }) => {
      const result = compile(source);
      expect(result.errors).toHaveLength(0);
      expect(result.code).toContain(expected);
    });
  });
});

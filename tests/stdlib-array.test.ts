import { compile } from '../src/compiler';

describe('Standard Library - Array Tests', () => {
  test('should transpile all array properties and methods correctly', () => {
    const testCases = [
      // Properties
      { source: 'рӯйхат.дарозӣ;', expected: '.length' },

      // Static Methods
      { source: 'рӯйхат.аз("abc");', expected: '.from("abc")' },
      { source: 'рӯйхат.рӯйхатАст([]);', expected: '.isArray([])' },
      { source: 'рӯйхат.азАргументҳо(1, 2);', expected: '.of(1, 2)' },

      // Instance Methods
      { source: 'рӯйхат.дар(0);', expected: '.at(0)' },
      { source: 'рӯйхат.пайвастан([4]);', expected: '.concat([4])' },
      { source: 'рӯйхат.нусхаДарДохил(0, 1);', expected: '.copyWithin(0, 1)' },
      { source: 'рӯйхат.воридот();', expected: '.entries()' },
      { source: 'рӯйхат.ҳама(x => x > 0);', expected: '.every((x) => x > 0)' },
      { source: 'рӯйхат.пурКардан(0);', expected: '.fill(0)' },
      { source: 'рӯйхат.филтр(x => x > 0);', expected: '.filter((x) => x > 0)' },
      { source: 'рӯйхат.кофтан(x => x > 0);', expected: '.find((x) => x > 0)' },
      { source: 'рӯйхат.индексиЁфтан(x => x > 0);', expected: '.findIndex((x) => x > 0)' },
      { source: 'рӯйхат.охиринЁфтан(x => x > 0);', expected: '.findLast((x) => x > 0)' },
      {
        source: 'рӯйхат.индексиОхиринЁфтан(x => x > 0);',
        expected: '.findLastIndex((x) => x > 0)',
      },
      { source: 'рӯйхат.ҳамвор();', expected: '.flat()' },
      { source: 'рӯйхат.ҳамворХарита(x => [x]);', expected: '.flatMap((x) => [x])' },
      { source: 'рӯйхат.бароиҲар(x => x);', expected: '.forEach((x) => x)' },
      { source: 'рӯйхат.дорад(1);', expected: '.includes(1)' },
      { source: 'рӯйхат.индекси(1);', expected: '.indexOf(1)' },
      { source: 'рӯйхат.пайвастКардан(",");', expected: '.join(",")' },
      { source: 'рӯйхат.калидҳо();', expected: '.keys()' },
      { source: 'рӯйхат.индексиОхирин(1);', expected: '.lastIndexOf(1)' },
      { source: 'рӯйхат.харита(x => x * 2);', expected: '.map((x) => x * 2)' },
      { source: 'рӯйхат.баровардан();', expected: '.pop()' },
      { source: 'рӯйхат.илова(4);', expected: '.push(4)' },
      { source: 'рӯйхат.пуш(4);', expected: '.push(4)' },
      { source: 'рӯйхат.ҷамъбаст((a, b) => a + b);', expected: '.reduce((a, b) => a + b)' },
      {
        source: 'рӯйхат.ҷамъбастАзРост((a, b) => a + b);',
        expected: '.reduceRight((a, b) => a + b)',
      },
      { source: 'рӯйхат.баргардон();', expected: '.reverse()' },
      { source: 'рӯйхат.ҳазфиАввал();', expected: '.shift()' },
      { source: 'рӯйхат.буридан(1);', expected: '.slice(1)' },
      { source: 'рӯйхат.баъзе(x => x > 0);', expected: '.some((x) => x > 0)' },
      { source: 'рӯйхат.тартиб();', expected: '.sort()' },
      { source: 'рӯйхат.пайваст(1, 1);', expected: '.splice(1, 1)' },
      { source: 'рӯйхат.баСатриМаҳаллӣ();', expected: '.toLocaleString()' },
      { source: 'рӯйхат.баБаргардон();', expected: '.toReversed()' },
      { source: 'рӯйхат.баТартиб();', expected: '.toSorted()' },
      { source: 'рӯйхат.баПайваст(0, 1);', expected: '.toSpliced(0, 1)' },
      { source: 'рӯйхат.баСатр();', expected: '.toString()' },
      { source: 'рӯйхат.иловаБаАввал(0);', expected: '.unshift(0)' },
      { source: 'рӯйхат.қиматҳо();', expected: '.values()' },
      { source: 'рӯйхат.бо(0, 1);', expected: '.with(0, 1)' },
    ];

    testCases.forEach(({ source, expected }) => {
      const fullSource = `тағ рӯйхат = [1, 2, 3]; ${source}`;
      const result = compile(fullSource);
      expect(result.errors).toHaveLength(0);
      expect(result.code).toContain(expected);
    });
  });
});

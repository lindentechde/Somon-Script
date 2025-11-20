import { compile } from '../src/compiler';

describe('Standard Library - String Tests', () => {
  test('should transpile all string properties and methods correctly', () => {
    const testCases = [
      // Properties
      { source: 'матн.дарозииСатр;', expected: '.length' },

      // String Constructor
      { source: 'сатр(123);', expected: 'String(123)' },

      // Static Methods
      { source: 'сатр.азКодиАломат(65);', expected: 'String.fromCharCode(65)' },
      { source: 'сатр.азНуқтаиКод(65);', expected: 'String.fromCodePoint(65)' },
      { source: 'сатрМетодҳо.азКодиАломат(65);', expected: 'String.fromCharCode(65)' },
      { source: 'сатрМетодҳо.азНуқтаиКод(65);', expected: 'String.fromCodePoint(65)' },

      // Instance Methods
      { source: 'матн.дар(0);', expected: '.at(0)' },
      { source: 'матн.аломатДар(0);', expected: '.charAt(0)' },
      { source: 'матн.кодиАломатДар(0);', expected: '.charCodeAt(0)' },
      { source: 'матн.нуқтаиКодДар(0);', expected: '.codePointAt(0)' },
      { source: 'матн.пайвастан("!");', expected: '.concat("!")' },
      { source: 'матн.анҷомБо("!");', expected: '.endsWith("!")' },
      { source: 'матн.дорад("e");', expected: '.includes("e")' },
      { source: 'матн.индекси("e");', expected: '.indexOf("e")' },
      { source: 'матн.индексиОхирин("e");', expected: '.lastIndexOf("e")' },
      { source: 'матн.муқоисаиМаҳаллӣ("other");', expected: '.localeCompare("other")' },
      { source: 'матн.муқаррарӣ();', expected: '.normalize()' },
      { source: 'матн.пурКарданОхир(10);', expected: '.padEnd(10)' },
      { source: 'матн.пурКарданАввал(10);', expected: '.padStart(10)' },
      { source: 'матн.такрор(2);', expected: '.repeat(2)' },
      { source: 'матн.ҷойивазкунӣ("t", "T");', expected: '.replace("t", "T")' },
      { source: 'матн.ҷойгузин("t", "T");', expected: '.replace("t", "T")' },
      { source: 'матн.ҷойивазкунӣҲама("t", "T");', expected: '.replaceAll("t", "T")' },
      { source: 'матн.буридан(1);', expected: '.slice(1)' },
      { source: 'матн.ҷудокунӣ(",");', expected: '.split(",")' },
      { source: 'матн.оғозБо("t");', expected: '.startsWith("t")' },
      { source: 'матн.қисмат(1);', expected: '.substring(1)' },
      { source: 'матн.хурдМаҳаллӣ();', expected: '.toLocaleLowerCase()' },
      { source: 'матн.калонМаҳаллӣ();', expected: '.toLocaleUpperCase()' },
      { source: 'матн.хурд();', expected: '.toLowerCase()' },
      { source: 'матн.баСатр();', expected: '.toString()' },
      { source: 'матн.калон();', expected: '.toUpperCase()' },
      { source: 'матн.тозаКардан();', expected: '.trim()' },
      { source: 'матн.тозаКарданОхир();', expected: '.trimEnd()' },
      { source: 'матн.тозаКарданАввал();', expected: '.trimStart()' },
      { source: 'матн.қиматиАслӣ();', expected: '.valueOf()' },
    ];

    testCases.forEach(({ source, expected }) => {
      const fullSource = `тағ матн = "test"; ${source}`;
      const result = compile(fullSource);
      expect(result.errors).toHaveLength(0);
      expect(result.code).toContain(expected);
    });
  });
});

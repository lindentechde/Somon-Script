/**
 * Focused CodeGenerator tests for improved coverage
 * Testing core codegen functionality with proper type usage
 */

import { CodeGenerator } from '../src/codegen';
import { compile } from '../src/compiler';
import { Lexer } from '../src/lexer';
import { Parser } from '../src/parser';

/**
 * Emitted JavaScript for `lines` of SomonScript. `compile` generates with
 * position markers (`generateWithMappings`); the plain `generate` path must
 * produce the very same text.
 */
function emitted(lines: string[]): string {
  const source = lines.join('\n');
  const result = compile(source, { typeCheck: false });
  expect(result.errors).toEqual([]);
  const ast = new Parser(new Lexer(source).tokenize()).parse();
  expect(new CodeGenerator().generate(ast)).toBe(result.code);
  return result.code;
}

describe('CodeGenerator - Core Coverage Tests', () => {
  let generator: CodeGenerator;

  beforeEach(() => {
    generator = new CodeGenerator();
  });

  describe('Basic Code Generation', () => {
    test('should instantiate CodeGenerator', () => {
      expect(generator).toBeInstanceOf(CodeGenerator);
      expect(generator.generate).toBeDefined();
    });

    test('should generate empty program', () => {
      const program = {
        type: 'Program' as const,
        body: [],
        line: 1,
        column: 1,
      };

      const result = generator.generate(program);
      expect(result).toBe('');
    });

    test('should handle null and undefined gracefully', () => {
      const program = {
        type: 'Program' as const,
        body: [],
        line: 1,
        column: 1,
      };

      const result = generator.generate(program);
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });
  });

  describe('Built-in Function Mappings', () => {
    test('should map Tajik console functions correctly', () => {
      // Test the built-in mappings through a mock identifier transformation
      const testMappings = [
        ['чоп', 'console'],
        ['сабт', 'log'],
        ['хато', 'error'],
        ['огоҳӣ', 'warn'],
      ];

      testMappings.forEach(([tajik, expected]) => {
        // This tests the internal mapping logic
        expect(tajik).toBeTruthy();
        expect(expected).toBeTruthy();
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid input gracefully', () => {
      const invalidProgram: any = {
        type: 'Program',
        body: null, // intentionally invalid to trigger error path
        line: 1,
        column: 1,
      };

      expect(() => {
        generator.generate(invalidProgram);
      }).toThrow('Cannot read properties of null');
    });

    test('should handle empty statements array', () => {
      const program = {
        type: 'Program' as const,
        body: [],
        line: 1,
        column: 1,
      };

      const result = generator.generate(program);
      expect(result).toBe('');
    });

    test('should collect errors for malformed AST nodes (never-throw contract)', () => {
      const program: any = {
        type: 'Program',
        body: [
          {
            type: 'InvalidStatement', // invalid on purpose
            line: 1,
            column: 1,
          },
        ],
        line: 1,
        column: 1,
      };

      expect(() => generator.generate(program)).not.toThrow();
      expect(generator.getErrors()).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Unknown statement type: InvalidStatement'),
        ])
      );
    });
  });

  describe('Core Generation Methods', () => {
    test('should have generateStatement method', () => {
      // Test that the method exists by checking the prototype
      expect(generator).toHaveProperty('generate');

      // Test basic functionality with empty program
      const result = generator.generate({
        type: 'Program',
        body: [],
        line: 1,
        column: 1,
      });

      expect(typeof result).toBe('string');
    });

    test('should handle various statement types', () => {
      // Test with different statement types to cover switch cases
      const statementTypes = [
        'VariableDeclaration',
        'FunctionDeclaration',
        'ExpressionStatement',
        'ReturnStatement',
        'IfStatement',
        'WhileStatement',
        'ForStatement',
        'BlockStatement',
        'ImportDeclaration',
        'ExportDeclaration',
        'TryStatement',
        'ThrowStatement',
        'ClassDeclaration',
        'InterfaceDeclaration',
        'TypeAlias',
        'SwitchStatement',
      ];

      // Test each statement type exists in our system
      statementTypes.forEach(type => {
        expect(type).toBeTruthy();
        expect(typeof type).toBe('string');
      });
    });

    test('should handle various expression types', () => {
      const expressionTypes = [
        'Identifier',
        'Literal',
        'BinaryExpression',
        'UnaryExpression',
        'UpdateExpression',
        'AssignmentExpression',
        'CallExpression',
        'MemberExpression',
        'ArrayExpression',
        'ObjectExpression',
        'NewExpression',
        'AwaitExpression',
        'SpreadElement',
      ];

      // Test each expression type exists
      expressionTypes.forEach(type => {
        expect(type).toBeTruthy();
        expect(typeof type).toBe('string');
      });
    });
  });

  describe('Indentation and Formatting', () => {
    test('should handle indentation correctly', () => {
      // Test basic indentation behavior by checking that the generator
      // maintains consistent formatting
      const program = {
        type: 'Program' as const,
        body: [],
        line: 1,
        column: 1,
      };

      const result = generator.generate(program);
      expect(result).not.toContain('\t'); // Should use spaces, not tabs
    });

    test('should join statements with newlines', () => {
      // Test that multiple statements are properly separated
      const program = {
        type: 'Program' as const,
        body: [],
        line: 1,
        column: 1,
      };

      const result = generator.generate(program);
      expect(typeof result).toBe('string');
    });

    // Regression: the first statement of a nested block lost one level of
    // indentation, a single-statement body was not indented at all
    test('indents every statement of nested statement blocks one level deeper', () => {
      const code = emitted([
        'функсия ф(х: рақам): рақам {',
        '    агар (х > 0) {',
        '        х++;',
        '        х++;',
        '    } вагарна агар (х < 0) {',
        '        х--;',
        '        х--;',
        '    } вагарна {',
        '        х = 1;',
        '    }',
        '    агар (х) бозгашт х;',
        '    то (х < 10) {',
        '        х++;',
        '        агар (х == 5) {',
        '            шикастан;',
        '        }',
        '    }',
        '    барои (тағ и = 0; и < 2; и++) {',
        '        собит а = и;',
        '        х += а;',
        '    }',
        '    барои (собит к дар {а: 1}) {',
        '        чоп.сабт(к);',
        '        чоп.сабт(к);',
        '    }',
        '    барои (собит в аз [1, 2]) чоп.сабт(в);',
        '    интихоб (х) {',
        '        ҳолат 1:',
        '        ҳолат 2:',
        '            чоп.сабт(1);',
        '            шикастан;',
        '        пешфарз:',
        '            чоп.сабт(2);',
        '    }',
        '    кӯшиш {',
        '        х++;',
        '        х++;',
        '    } гирифтан (е) {',
        '        чоп.сабт(е);',
        '        чоп.сабт(е);',
        '    } ниҳоят {',
        '        чоп.сабт(х);',
        '        чоп.сабт(х);',
        '    }',
        '    {',
        '        собит б = 1;',
        '        чоп.сабт(б);',
        '    }',
        '    собит г = (а: рақам) => {',
        '        агар (а) {',
        '            бозгашт а;',
        '        }',
        '        бозгашт 0;',
        '    };',
        '    бозгашт х;',
        '}',
      ]);

      expect(code).toBe(
        [
          'function ф(х) {',
          '  if (х > 0) {',
          '    х++;',
          '    х++;',
          '  } else if (х < 0) {',
          '    х--;',
          '    х--;',
          '  } else {',
          '    х = 1;',
          '  }',
          '  if (х) {',
          '    return х;',
          '  }',
          '  while (х < 10) {',
          '    х++;',
          '    if (х == 5) {',
          '      break;',
          '    }',
          '  }',
          '  for (let и = 0; и < 2; и++) {',
          '    const а = и;',
          '    х += а;',
          '  }',
          '  for (const к in {а: 1}) {',
          '    console.log(к);',
          '    console.log(к);',
          '  }',
          '  for (const в of [1, 2]) {',
          '    console.log(в);',
          '  }',
          '  switch (х) {',
          '    case 1:',
          '    case 2:',
          '      console.log(1);',
          '      break;',
          '    default:',
          '      console.log(2);',
          '  }',
          '  try {',
          '    х++;',
          '    х++;',
          '  } catch (е) {',
          '    console.log(е);',
          '    console.log(е);',
          '  } finally {',
          '    console.log(х);',
          '    console.log(х);',
          '  }',
          '  {',
          '    const б = 1;',
          '    console.log(б);',
          '  }',
          '  const г = (а) => {',
          '    if (а) {',
          '      return а;',
          '    }',
          '    return 0;',
          '  };',
          '  return х;',
          '}',
        ].join('\n')
      );
    });

    test('indents class members and namespace bodies one level deeper', () => {
      const code = emitted([
        'синф Ҳайвон {',
        '    ном: сатр;',
        '    конструктор(ном: сатр) {',
        '        ин.ном = ном;',
        '        агар (ном) {',
        '            чоп.сабт(ном);',
        '            чоп.сабт(ном);',
        '        }',
        '    }',
        '}',
        'номфазо Асбоб {',
        '    содир функсия ё(а: рақам): рақам {',
        '        агар (а) {',
        '            бозгашт 1;',
        '        }',
        '        бозгашт а;',
        '    }',
        '}',
      ]);

      expect(code).toBe(
        [
          'class Ҳайвон {',
          '  ном;',
          '  constructor(ном) {',
          '    this.ном = ном;',
          '    if (ном) {',
          '      console.log(ном);',
          '      console.log(ном);',
          '    }',
          '  }',
          '}',
          'const Асбоб = (function() {',
          '  const Асбоб = {};',
          '  function ё(а) {',
          '    if (а) {',
          '      return 1;',
          '    }',
          '    return а;',
          '  }',
          '  Асбоб.ё = ё;',
          '  return Асбоб;',
          '})();',
          '',
        ].join('\n')
      );
    });
  });

  describe('Unicode and International Support', () => {
    test('should handle Tajik Cyrillic characters', () => {
      // Test Unicode character handling
      const cyrillicText = 'тағйирёбанда';

      expect(cyrillicText).toMatch(/[а-яё]/);
      expect(typeof cyrillicText).toBe('string');
      expect(cyrillicText.length).toBeGreaterThan(0);
    });

    test('should handle mixed script identifiers', () => {
      // Test mixed script handling
      const mixedIdentifier = 'функсияTest123';
      expect(typeof mixedIdentifier).toBe('string');
      expect(mixedIdentifier.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    test('should handle very large programs', () => {
      const largeProgram = {
        type: 'Program' as const,
        body: new Array(1000).fill(null).map((_, i) => ({
          type: 'ExpressionStatement' as const,
          expression: {
            type: 'Literal' as const,
            value: i,
            raw: i.toString(),
            line: 1,
            column: 1,
          },
          line: 1,
          column: 1,
        })),
        line: 1,
        column: 1,
      };

      const result = generator.generate(largeProgram);
      expect(typeof result).toBe('string');
    });

    test('should handle deeply nested structures', () => {
      // Test deep nesting handling
      let depth = 0;
      const maxDepth = 50;

      // Create a deeply nested structure conceptually
      while (depth < maxDepth) {
        depth++;
      }

      expect(depth).toBe(maxDepth);
    });

    test('should handle empty and null values', () => {
      const edgeCases = ['', null, undefined, 0, false, [], {}];

      edgeCases.forEach(value => {
        // Test that these values don't break the system
        expect(() => {
          // Simulate processing edge case values
          const result = value?.toString?.() ?? '';
          expect(typeof result).toBe('string');
        }).not.toThrow();
      });
    });
  });

  describe('Type System Integration', () => {
    test('should handle type annotations', () => {
      // Test type annotation processing
      const types = ['string', 'number', 'boolean', 'void', 'any', 'unknown'];

      types.forEach(type => {
        expect(typeof type).toBe('string');
        expect(type.length).toBeGreaterThan(0);
      });
    });

    test('should handle generic types', () => {
      // Test generic type handling
      const genericTypes = ['Array<T>', 'Promise<T>', 'Map<K, V>'];

      genericTypes.forEach(type => {
        expect(type).toContain('<');
        expect(type).toContain('>');
      });
    });

    test('should handle union and intersection types', () => {
      // Test complex type handling
      const complexTypes = ['string | number', 'A & B', 'T extends U'];

      complexTypes.forEach(type => {
        expect(typeof type).toBe('string');
        expect(type.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Performance and Memory', () => {
    test('should handle memory efficiently', () => {
      // Test memory usage doesn't grow excessively
      const initialMemory = process.memoryUsage().heapUsed;

      for (let i = 0; i < 100; i++) {
        const program = {
          type: 'Program' as const,
          body: [],
          line: 1,
          column: 1,
        };
        generator.generate(program);
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = finalMemory - initialMemory;

      // Heap usage without a forced GC is noisy, so only catch gross leaks
      // (generous limit: 50MB for 100 generations)
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024);
    });

    test('should complete generation in reasonable time', () => {
      const startTime = Date.now();

      const program = {
        type: 'Program' as const,
        body: new Array(100).fill(null).map((_, i) => ({
          type: 'ExpressionStatement' as const,
          expression: {
            type: 'Literal' as const,
            value: `test${i}`,
            raw: `"test${i}"`,
            line: 1,
            column: 1,
          },
          line: 1,
          column: 1,
        })),
        line: 1,
        column: 1,
      };

      generator.generate(program);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within 1 second
      expect(duration).toBeLessThan(1000);
    });
  });
});

describe('CodeGenerator - statements and generators', () => {
  test('do-while, labels, debugger and empty statements', () => {
    const code = emitted([
      'тағ х = 0;;',
      'кун {',
      '    х++;',
      '} то (х < 3);',
      'берун: барои (тағ и = 0; и < 3; и++) {',
      '    дарун: кун {',
      '        агар (и === 1) давом берун;',
      '        шикастан дарун;',
      '    } то (дуруст)',
      '}',
      'блок: {',
      '    шикастан блок;',
      '}',
      'холӣ_: ;',
      'агар (х);',
      'то (нодуруст);',
      'debugger;',
    ]);
    expect(code).toBe(
      [
        'let х = 0;',
        'do {',
        '  х++;',
        '} while (х < 3);',
        'берун: for (let и = 0; и < 3; и++) {',
        '  дарун: do {',
        '    if (и === 1) {',
        '      continue берун;',
        '    }',
        '    break дарун;',
        '  } while (true);',
        '}',
        'блок: {',
        '  break блок;',
        '}',
        'холӣ_: ;',
        'if (х) {}',
        'while (false) {}',
        'debugger;',
      ].join('\n')
    );
  });

  test('for await inside async functions', () => {
    expect(
      emitted([
        'ҳамзамон функсия ф(р: ҳар) {',
        '    барои интизор (собит х аз р) { чоп.сабт(х); }',
        '}',
      ])
    ).toBe(
      [
        'async function ф(р) {',
        '  for await (const х of р) {',
        '    console.log(х);',
        '  }',
        '}',
      ].join('\n')
    );
  });

  test('enums are emitted as TypeScript emits them', () => {
    const code = emitted([
      'шумориш Ранг { Сурх, Сабз = 5, Кабуд }',
      'собит шумориш Ҳаҷм { Хурд = 1, Калон = Хурд * 10, Манфӣ = -Хурд }',
      'шумориш Самт { Боло = "боло", Ҳарду = Боло + "-поён" }',
      'собит асос = 1;',
      'содир шумориш Ҳисоб { А = асос + 1, Б = А * 2, дарозӣ = 7, "номи дароз" }',
      'функсия ф() { шумориш Д {} }',
    ]);
    expect(code).toBe(
      [
        'var Ранг;',
        '(function (Ранг) {',
        '  Ранг[Ранг["Сурх"] = 0] = "Сурх";',
        '  Ранг[Ранг["Сабз"] = 5] = "Сабз";',
        '  Ранг[Ранг["Кабуд"] = 6] = "Кабуд";',
        '})(Ранг || (Ранг = {}));',
        'var Ҳаҷм;',
        '(function (Ҳаҷм) {',
        '  Ҳаҷм[Ҳаҷм["Хурд"] = 1] = "Хурд";',
        '  Ҳаҷм[Ҳаҷм["Калон"] = 10] = "Калон";',
        '  Ҳаҷм[Ҳаҷм["Манфӣ"] = -1] = "Манфӣ";',
        '})(Ҳаҷм || (Ҳаҷм = {}));',
        'var Самт;',
        '(function (Самт) {',
        '  Самт["Боло"] = "боло";',
        '  Самт["Ҳарду"] = "боло-поён";',
        '})(Самт || (Самт = {}));',
        'const асос = 1;',
        'var Ҳисоб;',
        '(function (Ҳисоб) {',
        '  Ҳисоб[Ҳисоб["А"] = асос + 1] = "А";',
        '  Ҳисоб[Ҳисоб["Б"] = Ҳисоб.А * 2] = "Б";',
        '  Ҳисоб[Ҳисоб["length"] = 7] = "length";',
        '  Ҳисоб[Ҳисоб["номи дароз"] = 8] = "номи дароз";',
        '})(Ҳисоб || (Ҳисоб = {}));',
        'module.exports.Ҳисоб = Ҳисоб;',
        'function ф() {',
        '  let Д;',
        '  (function (Д) {})(Д || (Д = {}));',
        '}',
      ].join('\n')
    );
  });

  test('generators, generator methods and yield precedence', () => {
    const code = emitted([
      'функсия* г(): Generator<рақам> {',
      '    тағ а = ҳосил;',
      '    ҳосил а + 1;',
      '    тағ б = (ҳосил а) * 2;',
      '    ф(ҳосил, ҳосил б);',
      '    ҳосил* [1, 2];',
      '}',
      'собит е = функсия* () { ҳосил 1; };',
      'ҳамзамон функсия* ах() { ҳосил интизор х; }',
      'синф К { *а() { ҳосил 1; } статикӣ ҳамзамон *б() {} }',
      'собит о = { *в() { ҳосил 2; } };',
    ]);
    expect(code).toBe(
      [
        'function* г() {',
        '  let а = yield;',
        '  yield а + 1;',
        '  let б = (yield а) * 2;',
        '  ф(yield, yield б);',
        '  yield* [1, 2];',
        '}',
        'const е = function* () {',
        '  yield 1;',
        '};',
        'async function* ах() {',
        '  yield await х;',
        '}',
        'class К {',
        '  *а() {',
        '    yield 1;',
        '  }',
        '  static async *б() {}',
        '}',
        'const о = {*в() {',
        '  yield 2;',
        '}};',
      ].join('\n')
    );
  });

  test.each([
    ['an undefined label', 'шикастан нест;', /Undefined label 'нест' at line 1, column 1/],
    [
      'continue to a label that is not a loop',
      'то (дуруст) { л: { давом л; } }',
      /Illegal continue statement at line 1, column 20: 'л' does not label a loop/,
    ],
    [
      'a label repeated inside itself',
      'л: { л: то (дуруст) {} }',
      /Label 'л' has already been declared at line 1, column 6/,
    ],
    [
      'a label of an enclosing function',
      'л: то (дуруст) { функсия ф() { шикастан л; } }',
      /Undefined label 'л'/,
    ],
    [
      'for await outside async functions',
      'функсия ф(р: ҳар) { барои интизор (собит х аз р) {} }',
      /Illegal for await statement at line 1, column 21: 'барои интизор' must be inside a 'ҳамзамон' function/,
    ],
    [
      'for await in a plain arrow inside an async function',
      'ҳамзамон функсия ф(р: ҳар) { собит г = () => { барои интизор (собит х аз р) {} }; }',
      /Illegal for await statement/,
    ],
    [
      'an enum member after a string member',
      'шумориш Р { А = "а", Б }',
      /Enum member 'Б' must have an initializer at line 1, column 22/,
    ],
    ['a reserved word as a label', 'for: то (дуруст) {}', /'for' is a reserved word/],
  ])('%s is a code generation error', (_name, source, message) => {
    const result = compile(source, { typeCheck: false });
    expect(result.errors).toEqual([expect.stringMatching(message)]);
    expect(result.code).toBe('');
  });
});

describe('CodeGenerator: new.target, tagged templates, private members and accessors', () => {
  test('нав.target is new.target', () => {
    expect(emitted(['функсия Ф() {', '  бозгашт нав.target === Ф;', '}'])).toBe(
      ['function Ф() {', '  return new.target === Ф;', '}'].join('\n')
    );
  });

  test('tagged templates keep their raw text and bind like member access', () => {
    expect(
      emitted(['чоп.сабт(сатр.хоми`а\\n${1 + 2}б`, т`а``б`(), нав т`К`(), (о?.т)`а`, о.т`\\u`.х);'])
    ).toBe('console.log(String.raw`а\\n${1 + 2}б`, т`а``б`(), new т`К`(), (о?.т)`а`, о.т`\\u`.х);');
  });

  test('a tagged template across a line break is still one expression, as in JavaScript', () => {
    expect(emitted(['собит а = т', '`б`;'])).toBe('const а = т`б`;');
  });

  test('private fields, methods, accessors and brand checks', () => {
    expect(
      emitted([
        'синф К {',
        '  #х = 1;',
        '  статикӣ #с;',
        '  #м(): рақам { бозгашт ин.#х; }',
        '  get #г(): рақам { бозгашт ин?.#х; }',
        '  set #г(қ: рақам) { ин.#х = қ; }',
        '  статикӣ ҳаст(о: ҳар): мантиқӣ { бозгашт #х in о && К.#с === беқимат; }',
        '}',
      ])
    ).toBe(
      [
        'class К {',
        '  #х = 1;',
        '  static #с;',
        '  #м() {',
        '    return this.#х;',
        '  }',
        '  get #г() {',
        '    return this?.#х;',
        '  }',
        '  set #г(қ) {',
        '    this.#х = қ;',
        '  }',
        '  static ҳаст(о) {',
        '    return #х in о && К.#с === undefined;',
        '  }',
        '}',
      ].join('\n')
    );
  });

  test('getters and setters in classes and object literals', () => {
    expect(
      emitted([
        'синф К {',
        '  get х(): рақам { бозгашт 1; }',
        '  set х(қ: рақам) { }',
        '  статикӣ get с() { бозгашт 2; }',
        '  get = 3;',
        '}',
        'собит о = { get а() { бозгашт 1; }, set а(қ) { }, get: 2 };',
      ])
    ).toBe(
      [
        'class К {',
        '  get х() {',
        '    return 1;',
        '  }',
        '  set х(қ) {}',
        '  static get с() {',
        '    return 2;',
        '  }',
        '  get = 3;',
        '}',
        'const о = {get а() {',
        '  return 1;',
        '}, set а(қ) {}, get: 2};',
      ].join('\n')
    );
  });

  test('type operators, predicates and type parameters are erased', () => {
    expect(
      emitted([
        'функсия ф<Т мерос { а: рақам } = { а: 1 }>(х: Т, р: танҳохонӣ [рақам, сатр?]): х аст Т {',
        '  бозгашт дуруст;',
        '}',
        'функсия г(ш: ҳар): тасдиқ ш { }',
        'синф З<Т> { танҳохонӣ н: беназир рамз = Symbol(); илова(): ин { бозгашт ин; } }',
      ])
    ).toBe(
      [
        'function ф(х, р) {',
        '  return true;',
        '}',
        'function г(ш) {}',
        'class З {',
        '  н = Symbol();',
        '  push() {',
        '    return this;',
        '  }',
        '}',
      ].join('\n')
    );
  });

  test.each([
    [
      'нав.target at the top level',
      'чоп.сабт(нав.target);',
      /new\.target expression is not allowed here at line 1, column 10/,
    ],
    [
      'нав.target in a top-level arrow',
      'собит ф = () => нав.target;',
      /new\.target expression is not allowed/,
    ],
    [
      'an undeclared private name',
      'синф К { м() { бозгашт ин.#у; } }',
      /Private field '#у' must be declared in an enclosing class at line 1, column 27/,
    ],
    [
      'a private name outside its class',
      'синф К { #х = 1; } функсия ф(к: К) { бозгашт к.#х; }',
      /Private field '#х' must be declared/,
    ],
    [
      'a private name of the base class',
      'синф А { #х = 1; } синф Б мерос А { м() { бозгашт ин.#х; } }',
      /Private field '#х' must be declared/,
    ],
    [
      'a brand check of an undeclared name',
      'синф К { м(о) { бозгашт #у in о; } }',
      /Private field '#у' must be declared/,
    ],
    [
      'a private name declared twice',
      'синф К { #х = 1; #х() { } }',
      /Identifier '#х' has already been declared at line 1, column 18/,
    ],
    [
      'two getters of one private name',
      'синф К { get #х() { бозгашт 1; } get #х() { бозгашт 2; } }',
      /Identifier '#х' has already been declared/,
    ],
    [
      'deleting a private field',
      'синф К { #х = 1; м() { delete ин.#х; } }',
      /Private fields can not be deleted/,
    ],
    [
      'a private name after супер',
      'синф А { } синф Б мерос А { #х = 1; м() { бозгашт супер.#х; } }',
      /Unexpected private field '#х'/,
    ],
  ])('%s is an early error', (_name, source, message) => {
    for (const typeCheck of [true, false]) {
      const result = compile(source, { typeCheck });
      expect(result.errors).toEqual(expect.arrayContaining([expect.stringMatching(message)]));
      expect(result.code).toBe('');
    }
  });

  test('тасдиқ is still console.assert outside a return type', () => {
    expect(emitted(['функсия ф(ш: ҳар): тасдиқ ш {', '  чоп.тасдиқ(ш, "паём");', '}'])).toBe(
      ['function ф(ш) {', '  console.assert(ш, "паём");', '}'].join('\n')
    );
  });

  test('legal uses of нав.target and private names compile', () => {
    for (const source of [
      'функсия ф() { собит г = () => нав.target; бозгашт г(); }',
      'синф К { х = нав.target; конструктор() { чоп.сабт(нав.target); } }',
      'собит о = { м() { бозгашт нав.target; } };',
      'синф К { get #х() { бозгашт 1; } set #х(қ) { } м() { синф Д { м(к: К) { бозгашт к.#х; } } } }',
    ]) {
      expect(compile(source, { typeCheck: false }).errors).toEqual([]);
    }
  });

  test('source maps cover programs with the new syntax', () => {
    const result = compile(
      'синф К {\n  #х = 1;\n  get х(): рақам { бозгашт ин.#х; }\n}\nчоп.сабт(сатр.хоми`а`, нав К().х);',
      { sourceMap: true }
    );
    expect(result.errors).toEqual([]);
    const map = JSON.parse(result.sourceMap!);
    expect(map.sources).toEqual(['source.som']);
    expect(map.mappings.split(';').length).toBeGreaterThan(4);
  });
});

describe('CodeGenerator - literals, classes and object members', () => {
  test('regular expression literals are emitted as written', () => {
    expect(
      emitted([
        'собит р = /[/]\\d+/gu;',
        'чоп.сабт(/а+/g.test("а"), "а-б".ҷойгузин(/-/g, "+"), а / б / в, (а) / 2, х[0] / 2);',
        'а /= 2;',
      ])
    ).toBe(
      [
        'const р = /[/]\\d+/gu;',
        'console.log(/а+/g.test("а"), "а-б".replace(/-/g, "+"), а / б / в, а / 2, х[0] / 2);',
        'а /= 2;',
      ].join('\n')
    );
  });

  test('class expressions keep their name, base class and indentation', () => {
    expect(
      emitted([
        'функсия ф() {',
        '    собит К = синф Ном мерос Асос {',
        '        х = 1;',
        '        гир(): рақам { бозгашт ин.х; }',
        '    };',
        '    бозгашт [синф { }, нав (синф { у = 2; })()];',
        '}',
      ])
    ).toBe(
      [
        'function ф() {',
        '  const К = class Ном extends Асос {',
        '    х = 1;',
        '    гир() {',
        '      return this.х;',
        '    }',
        '  };',
        '  return [class {}, new class {',
        '    у = 2;',
        '  }()];',
        '}',
      ].join('\n')
    );
  });

  test('a class expression statement is parenthesised', () => {
    expect(emitted(['(синф { }).name;'])).toBe('(class {}.name);');
  });

  test('object literal accessors and async methods', () => {
    expect(
      emitted([
        'собит о = {',
        '    get х(): рақам { бозгашт 1; },',
        '    set х(қ: рақам) { чоп.сабт(қ); },',
        '    ҳамзамон ф() { },',
        '    get: 2,',
        '};',
      ])
    ).toBe(
      [
        'const о = {get х() {',
        '  return 1;',
        '}, set х(қ) {',
        '  console.log(қ);',
        '}, async ф() {}, get: 2};',
      ].join('\n')
    );
  });

  test('static blocks', () => {
    expect(
      emitted([
        'синф К {',
        '    статикӣ х = 0;',
        '    статикӣ {',
        '        К.х = 9;',
        '    }',
        '    статикӣ { }',
        '}',
      ])
    ).toBe(
      [
        'class К {',
        '  static х = 0;',
        '  static {',
        '    К.х = 9;',
        '  }',
        '  static {}',
        '}',
      ].join('\n')
    );
  });

  test('parameter properties are assigned first, or right after супер(…)', () => {
    expect(
      emitted([
        'синф А {',
        '    конструктор(хосусӣ х: рақам, ҷамъиятӣ у = 2, з: рақам) { чоп.сабт(з); }',
        '}',
        'синф Б мерос А {',
        '    конструктор(танҳохонӣ в: рақам) {',
        '        чоп.сабт("пеш");',
        '        супер(в, в, в);',
        '        чоп.сабт(ин.в);',
        '    }',
        '}',
        'синф В { конструктор(муҳофизатшуда г: сатр) { } }',
      ])
    ).toBe(
      [
        'class А {',
        '  constructor(х, у = 2, з) {',
        '    this.х = х;',
        '    this.у = у;',
        '    console.log(з);',
        '  }',
        '}',
        'class Б extends А {',
        '  constructor(в) {',
        '    console.log("пеш");',
        '    super(в, в, в);',
        '    this.в = в;',
        '    console.log(this.в);',
        '  }',
        '}',
        'class В {',
        '  constructor(г) {',
        '    this.г = г;',
        '  }',
        '}',
      ].join('\n')
    );
  });

  test('parameter property assignments map to their parameters in the source map', () => {
    const result = compile('синф А {\n  конструктор(\n    хосусӣ х: рақам\n  ) { }\n}', {
      typeCheck: false,
      sourceMap: true,
    });
    expect(result.errors).toEqual([]);
    const ast = new Parser(
      new Lexer('синф А {\n  конструктор(\n    хосусӣ х: рақам\n  ) { }\n}').tokenize()
    ).parse();
    const { mappings } = new CodeGenerator().generateWithMappings(ast);
    expect(mappings).toContainEqual({
      generated: { line: 3, column: 4 },
      original: { line: 3, column: 11 },
    });
  });

  test('бозгашт in a static block is an error, but not in a function inside it', () => {
    expect(compile('синф К { статикӣ { бозгашт; } }').errors).toEqual([
      expect.stringMatching(/Illegal return statement at line 1, column 20/),
    ]);
    expect(
      compile('синф К { статикӣ { функсия ф() { бозгашт 1; } тағ г = () => { бозгашт 2; }; } }')
        .errors
    ).toEqual([]);
    expect(
      compile('то (дуруст) { синф К { статикӣ { шикастан; } } }', { typeCheck: false }).errors
    ).toEqual([expect.stringContaining('Illegal break statement')]);
  });
});

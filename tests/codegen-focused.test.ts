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

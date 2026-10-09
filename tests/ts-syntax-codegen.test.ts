import { CodeGenerator } from '../src/codegen';
import { compile } from '../src/compiler';
import { Lexer } from '../src/lexer';
import { Parser } from '../src/parser';

/**
 * Code generation for the TypeScript 5 declaration syntax. `generate` shows
 * the code before TypeScript lowers decorators, `accessor` and `using`;
 * `compile` the final output.
 */

function generator(source: string, experimentalDecorators = false) {
  const parser = new Parser(new Lexer(source).tokenize());
  const ast = parser.parse();
  expect(parser.getErrors()).toEqual([]);
  const codegen = new CodeGenerator({ experimentalDecorators });
  const code = codegen.generate(ast);
  return { code, codegen };
}

function generate(source: string): string {
  const { code, codegen } = generator(source);
  expect(codegen.getErrors()).toEqual([]);
  return code;
}

function compiled(source: string, options: Parameters<typeof compile>[1] = {}): string {
  const result = compile(source, options);
  expect(result.errors).toEqual([]);
  return result.code;
}

describe('erased declarations', () => {
  test('type-only imports and exports emit nothing', () => {
    expect(
      generate(
        'ворид навъ { Т } аз "./м";\nворид навъ Д аз "./д";\nворид { навъ У } аз "./у";\nсодир навъ { Т };\nсодир навъ { У } аз "./у";\nсодир навъ * аз "./у";\nворид навъ Ф = require("./ф");'
      )
    ).toBe('');
  });

  test('a mixed import keeps its values', () => {
    expect(generate('ворид Д, { навъ Т, х, навъ У чун Ф, у } аз "./м";')).toBe(
      [
        'const __somon_import_0 = require("./м.js");',
        'const Д = __somon_import_0.default ?? __somon_import_0;',
        'const { х, у } = __somon_import_0;',
      ].join('\n')
    );
    expect(generate('тағ х = 1;\nсодир { навъ Т, х };')).toBe('let х = 1;\nmodule.exports.х = х;');
    expect(generate('содир { навъ Т } аз "./м";')).toBe('');
  });

  test('ambient declarations emit nothing', () => {
    expect(
      generate(
        'эълон собит ВЕРСИЯ: сатр;\nэълон тағ а: рақам, б: рақам;\nэълон функсия ф(): беджавоб;\nэълон синф К { м(): беджавоб; }\nэълон шумориш Э { А }\nэълон собит шумориш С { Б }\nэълон номфазо Н { функсия г(): беджавоб; }\nэълон модул "м" { содир функсия х(): беджавоб; }\nэълон глобалӣ { собит Г: рақам; }\nсодир эълон собит Д: рақам;\nчоп.сабт(ВЕРСИЯ);'
      )
    ).toBe('console.log(ВЕРСИЯ);');
  });

  test('`эълон` inside a namespace adds no member', () => {
    expect(generate('номфазо Н { содир эълон функсия ф(): беджавоб; содир собит а = 1; }')).toBe(
      [
        'const Н = (function() {',
        '  const Н = {};',
        '  const а = 1;',
        '  Н.а = а;',
        '  return Н;',
        '})();',
        '',
      ].join('\n')
    );
  });

  test('overload signatures, `ин` parameters and type parameter modifiers', () => {
    expect(
      generate(
        'функсия ф(х: рақам): рақам;\nфунксия ф<собит Т>(ин: Т, х: ҳар): ҳар { бозгашт х; }\nсинф К<дар берун Т> { м(х: рақам): рақам; м(ин: К<Т>, х: ҳар): ҳар { бозгашт х; } конструктор(); конструктор(а?: рақам) {} }'
      )
    ).toBe(
      [
        'function ф(х) {',
        '  return х;',
        '}',
        'class К {',
        '  м(х) {',
        '    return х;',
        '  }',
        '  constructor(а) {}',
        '}',
      ].join('\n')
    );
  });

  test('class members that only declare types', () => {
    expect(
      generate(
        'мавҳум синф К { [калид: сатр]: ҳар; статикӣ [к: сатр]: ҳар; эълон х: рақам; мавҳум у: рақам; мавҳум get г(): рақам; м?(): рақам; бознавис з = 1; н?() { бозгашт 2; } }'
      )
    ).toBe(['class К {', '  з = 1;', '  н() {', '    return 2;', '  }', '}'].join('\n'));
  });

  test('`бознавис` parameter properties are assigned', () => {
    expect(generate('синф Б мерос А { конструктор(бознавис х: рақам) { супер(); } }')).toBe(
      [
        'class Б extends А {',
        '  constructor(х) {',
        '    super();',
        '    this.х = х;',
        '  }',
        '}',
      ].join('\n')
    );
  });
});

describe('emitted syntax', () => {
  test('a shebang is the first line', () => {
    expect(generate('#!/usr/bin/env node\nчоп.сабт(1);')).toBe(
      '#!/usr/bin/env node\nconsole.log(1);'
    );
  });

  test('computed and literal class member names', () => {
    expect(
      generate(
        'синф К { [Symbol.iterator]() {} статикӣ [калид] = 1; get ["а" + "б"](): рақам { бозгашт 1; } "бо фосила"() {} 42 = 1; }'
      )
    ).toBe(
      [
        'class К {',
        '  [Symbol.iterator]() {}',
        '  static [калид] = 1;',
        '  get ["а" + "б"]() {',
        '    return 1;',
        '  }',
        '  "бо фосила"() {}',
        '  42 = 1;',
        '}',
      ].join('\n')
    );
  });

  test('decorators come before every modifier', () => {
    const { code, codegen } = generator(
      '@д @а.б(1) синф К { @м статикӣ ҳамзамон *г() {} @(р[0]) get х(): рақам { бозгашт 1; } @п дастрасӣ у = 1; @с статикӣ #з = 2; }'
    );
    expect(code).toBe(
      [
        '@д @а.б(1) class К {',
        '  @м static async *г() {}',
        '  @(р[0]) get х() {',
        '    return 1;',
        '  }',
        '  @п accessor у = 1;',
        '  @с static #з = 2;',
        '}',
      ].join('\n')
    );
    expect(codegen.getLoweringNeeds()).toEqual({
      decorators: true,
      parameterDecorators: false,
      autoAccessors: true,
      usingDeclarations: false,
    });
  });

  test('decorated class expressions and exported classes', () => {
    expect(generate('собит К = @д синф {};\n@д содир синф А {}')).toBe(
      ['const К = @д class {};', '@д class А {}', 'module.exports.А = А;'].join('\n')
    );
  });

  test('parameter decorators need experimentalDecorators', () => {
    const source = 'синф К { конструктор(@тазриқ() х: рақам) {} }';
    const legacy = generator(source, true);
    expect(legacy.code).toBe('class К {\n  constructor(@тазриқ() х) {}\n}');
    expect(legacy.codegen.getErrors()).toEqual([]);
    expect(legacy.codegen.getLoweringNeeds().parameterDecorators).toBe(true);
    expect(generator(source).codegen.getErrors()).toEqual([
      "Decorators are not valid here at line 1, column 22: parameter decorators need the 'experimentalDecorators' option",
    ]);
  });

  test('`истифода` and `интизор истифода`', () => {
    const { code, codegen } = generator(
      'функсия ф() { истифода а = м(), б = м(); барои (истифода в аз хҳо) {} }\nҳамзамон функсия г() { интизор истифода д = м(); барои интизор (интизор истифода е аз хҳо) {} }'
    );
    expect(code).toBe(
      [
        'function ф() {',
        '  using а = м(), б = м();',
        '  for (using в of хҳо) {}',
        '}',
        'async function г() {',
        '  await using д = м();',
        '  for await (await using е of хҳо) {}',
        '}',
      ].join('\n')
    );
    expect(codegen.getLoweringNeeds().usingDeclarations).toBe(true);
  });

  test('`интизор истифода` outside a `ҳамзамон` function is an error', () => {
    expect(generator('интизор истифода х = м();').codegen.getErrors()).toEqual([
      "'интизор истифода' is only allowed inside a 'ҳамзамон' function at line 1, column 1",
    ]);
    expect(generator('функсия ф() { интизор истифода х = м(); }').codegen.getErrors()).toHaveLength(
      1
    );
  });

  test('import-equals and export assignment', () => {
    expect(
      generate(
        'ворид путь = require("path");\nворид м = require("./м");\nворид ф = Н.Д.ф;\nсодир = путь;'
      )
    ).toBe(
      [
        'const путь = require("path");',
        'const м = require("./м.js");',
        'const ф = Н.Д.ф;',
        'module.exports = путь;',
      ].join('\n')
    );
  });
});

describe('declaration merging', () => {
  test('a single namespace keeps its form', () => {
    expect(generate('номфазо Н { содир собит а = 1; }')).toBe(
      [
        'const Н = (function() {',
        '  const Н = {};',
        '  const а = 1;',
        '  Н.а = а;',
        '  return Н;',
        '})();',
        '',
      ].join('\n')
    );
  });

  test('namespaces of one name merge as TypeScript emits them', () => {
    expect(
      generate(
        'номфазо Н { содир собит а = 1; собит махфӣ = 2; }\nномфазо Н { содир функсия ф(махфӣ: рақам) { бозгашт а + махфӣ + б; } }\nномфазо Н { содир собит б = а; }'
      )
    ).toBe(
      [
        'var Н;',
        '(function (Н) {',
        '  const а = 1;',
        '  Н.а = а;',
        '  const махфӣ = 2;',
        '})(Н || (Н = {}));',
        '',
        '(function (Н) {',
        '  function ф(махфӣ) {',
        '    return Н.а + махфӣ + Н.б;',
        '  }',
        '  Н.ф = ф;',
        '})(Н || (Н = {}));',
        '',
        '(function (Н) {',
        '  const б = Н.а;',
        '  Н.б = б;',
        '})(Н || (Н = {}));',
        '',
      ].join('\n')
    );
  });

  test('a class, function or enum merges with a later namespace', () => {
    expect(
      generate(
        'синф К {}\nномфазо К { содир собит а = 1; }\nфунксия ф() {}\nномфазо ф { содир собит б = 2; }\nшумориш Э { А }\nномфазо Э { содир собит в = 3; }'
      )
    ).toBe(
      [
        'class К {}',
        '(function (К) {',
        '  const а = 1;',
        '  К.а = а;',
        '})(К || (К = {}));',
        '',
        'function ф() {}',
        '(function (ф) {',
        '  const б = 2;',
        '  ф.б = б;',
        '})(ф || (ф = {}));',
        '',
        'var Э;',
        '(function (Э) {',
        '  Э[Э["А"] = 0] = "А";',
        '})(Э || (Э = {}));',
        '(function (Э) {',
        '  const в = 3;',
        '  Э.в = в;',
        '})(Э || (Э = {}));',
        '',
      ].join('\n')
    );
  });

  test('enums of one name merge and share constant members', () => {
    expect(generate('шумориш Э { А, Б }\nшумориш Э { В = Б + 1, Г = А }')).toBe(
      [
        'var Э;',
        '(function (Э) {',
        '  Э[Э["А"] = 0] = "А";',
        '  Э[Э["Б"] = 1] = "Б";',
        '})(Э || (Э = {}));',
        '(function (Э) {',
        '  Э[Э["В"] = 2] = "В";',
        '  Э[Э["Г"] = 0] = "Г";',
        '})(Э || (Э = {}));',
      ].join('\n')
    );
  });

  test('in a block, merged declarations use `let`', () => {
    expect(generate('{ шумориш Э { А } шумориш Э { Б = 1 } }')).toBe(
      [
        '{',
        '  let Э;',
        '  (function (Э) {',
        '    Э[Э["А"] = 0] = "А";',
        '  })(Э || (Э = {}));',
        '  (function (Э) {',
        '    Э[Э["Б"] = 1] = "Б";',
        '  })(Э || (Э = {}));',
        '}',
      ].join('\n')
    );
  });

  test('an ambient declaration leaves the binding to the next one', () => {
    expect(
      generate('эълон номфазо Н { функсия ф(): рақам; }\nномфазо Н { содир собит а = ф(); }')
    ).toBe(
      [
        'var Н;',
        '(function (Н) {',
        '  const а = Н.ф();',
        '  Н.а = а;',
        '})(Н || (Н = {}));',
        '',
      ].join('\n')
    );
  });

  test('exported merged namespaces are exported once per block', () => {
    expect(
      generate('содир номфазо Н { содир собит а = 1; }\nсодир номфазо Н { содир собит б = 2; }')
    ).toBe(
      [
        'var Н;',
        '(function (Н) {',
        '  const а = 1;',
        '  Н.а = а;',
        '})(Н || (Н = {}));',
        'module.exports.Н = Н;',
        '(function (Н) {',
        '  const б = 2;',
        '  Н.б = б;',
        '})(Н || (Н = {}));',
        'module.exports.Н = Н;',
      ].join('\n')
    );
  });

  test('nested merged namespaces', () => {
    expect(
      generate(
        'номфазо А { содир номфазо Б { содир собит х = 1; } содир номфазо Б { содир собит у = х; } }'
      )
    ).toBe(
      [
        'const А = (function() {',
        '  const А = {};',
        '  let Б;',
        '  (function (Б) {',
        '    const х = 1;',
        '    Б.х = х;',
        '  })(Б || (Б = {}));',
        '  А.Б = Б;',
        '  (function (Б) {',
        '    const у = Б.х;',
        '    Б.у = у;',
        '  })(Б || (Б = {}));',
        '  А.Б = Б;',
        '  return А;',
        '})();',
        '',
      ].join('\n')
    );
  });

  test('declarations that cannot merge are still reported', () => {
    for (const source of [
      'номфазо Н {}\nсинф Н {}',
      'синф К {}\nсинф К {}',
      'шумориш Э { А }\nсинф Э {}',
      'тағ х = 1;\nномфазо х {}',
      'эълон собит х: рақам;\nтағ х = 1;',
    ]) {
      const { codegen } = generator(source);
      expect(codegen.getErrors()).toEqual([
        expect.stringMatching(/has already been declared at line 2, column 1/),
      ]);
    }
  });

  test('only one merged enum may leave out its first initializer', () => {
    expect(generator('шумориш Э { А }\nшумориш Э { Б }').codegen.getErrors()).toEqual([
      'In an enum with multiple declarations, only one declaration can omit an initializer for its first enum element at line 2, column 13',
    ]);
  });
});

describe('the compile pipeline lowers what Node.js does not run', () => {
  test('decorators, `accessor` and `using` are lowered by TypeScript', () => {
    const code = compiled(
      'функсия д(қ: ҳар, к: ҳар) {}\n@д синф К { дастрасӣ х = 1; }\nфунксия ф() { истифода м = { [Symbol.dispose]() {} }; }'
    );
    expect(code).toContain('__esDecorate');
    expect(code).toContain('#х_accessor_storage');
    expect(code).toContain('__addDisposableResource');
    expect(code).not.toMatch(/^\s*@д/m);
    expect(code).not.toMatch(/\busing м\b/);
  });

  test('an auto-accessor alone is lowered too', () => {
    expect(compiled('синф К { дастрасӣ х = 1; }')).toContain('get х()');
  });

  test('without them the output is not transpiled', () => {
    expect(compiled('синф К { х = 1; }')).toBe('class К {\n  х = 1;\n}');
  });

  test('legacy decorators with experimentalDecorators', () => {
    const code = compiled(
      'функсия д(...а: ҳар[]) {}\n@д синф К { конструктор(@д х: рақам) {} @д м() {} }',
      { experimentalDecorators: true }
    );
    expect(code).toContain('__decorate');
    expect(code).toContain('__param(0, д)');
  });

  test('parameter decorators without experimentalDecorators are an error', () => {
    const result = compile('функсия д(...а: ҳар[]) {}\nсинф К { конструктор(@д х: рақам) {} }');
    expect(result.code).toBe('');
    expect(result.errors).toEqual([
      "Code generation error: Decorators are not valid here at line 2, column 22: parameter decorators need the 'experimentalDecorators' option",
    ]);
  });

  test.each(['es5', 'es2015', 'es2020', 'esnext'] as const)('for target %s', target => {
    const code = compiled('функсия д(қ: ҳар, к: ҳар) {}\n@д синф К {}', { target });
    expect(code).not.toMatch(/^@д/m);
  });

  test('the shebang stays first, also when lowered, minified or mapped', () => {
    const source = '#!/usr/bin/env node\nфунксия д(қ: ҳар, к: ҳар) {}\n@д синф К {}';
    expect(compiled(source).split('\n')[0]).toBe('#!/usr/bin/env node');
    expect(compiled('#!/usr/bin/env node\nчоп.сабт(1);', { minify: true }).split('\n')[0]).toBe(
      '#!/usr/bin/env node'
    );
    expect(compiled(source, { target: 'es5' }).split('\n')[0]).toBe('#!/usr/bin/env node');
    const mapped = compile('#!/usr/bin/env node\nчоп.сабт(1);', { sourceMap: true });
    expect(mapped.code).toBe('#!/usr/bin/env node\nconsole.log(1);');
    // `чоп.сабт(1)` (line 2) maps from the output's line 2
    expect(JSON.parse(mapped.sourceMap!).mappings).toBe(';AACA');
  });
});

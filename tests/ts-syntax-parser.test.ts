import { Lexer } from '../src/lexer';
import { Parser } from '../src/parser';
import {
  AmbientModuleDeclaration,
  ArrowFunctionExpression,
  ClassDeclaration,
  ClassExpression,
  EnumDeclaration,
  ExportAssignment,
  ExportDeclaration,
  ForOfStatement,
  FunctionDeclaration,
  FunctionSignature,
  FunctionType,
  ImportDeclaration,
  ImportEqualsDeclaration,
  InterfaceDeclaration,
  MethodDefinition,
  NamespaceDeclaration,
  Program,
  PropertyDefinition,
  Statement,
  TokenType,
  TypeAlias,
  VariableDeclaration,
  VariableDeclarationList,
} from '../src/types';

/**
 * Parsing of the TypeScript 5 declaration syntax: decorators, `эълон`,
 * `бознавис`, `дастрасӣ`, `истифода`, type-only imports, the shebang, type
 * parameter modifiers, overloads, `ин` parameters and class member forms.
 */

function parse(source: string): { ast: Program; errors: string[] } {
  const parser = new Parser(new Lexer(source).tokenize());
  const ast = parser.parse();
  return { ast, errors: parser.getErrors() };
}

function parseOk(source: string): Statement[] {
  const { ast, errors } = parse(source);
  expect(errors).toEqual([]);
  return ast.body;
}

function errorsOf(source: string): string[] {
  return parse(source).errors;
}

function classOf(source: string): ClassDeclaration {
  return parseOk(source)[0] as ClassDeclaration;
}

describe('shebang', () => {
  test('the lexer reads `#!…` on the first line as one token', () => {
    const tokens = new Lexer('#!/usr/bin/env node\nчоп.сабт(1);').tokenize();
    expect(tokens[0]).toMatchObject({
      type: TokenType.SHEBANG,
      value: '#!/usr/bin/env node',
      line: 1,
      column: 1,
    });
    expect(tokens.find(t => t.value === 'чоп')).toMatchObject({ line: 2, column: 1 });
  });

  test('the program keeps it; positions after it are unchanged', () => {
    const { ast, errors } = parse('#!/usr/bin/env -S node --stack-size=100\r\nтағ а = 1;');
    expect(errors).toEqual([]);
    expect(ast.shebang).toBe('#!/usr/bin/env -S node --stack-size=100');
    expect(ast.body[0]).toMatchObject({ type: 'VariableDeclaration', line: 2 });
  });

  test('a regular expression may start the line after it', () => {
    const { ast, errors } = parse('#!/usr/bin/env node\n/а/.test("а");');
    expect(errors).toEqual([]);
    expect(ast.body).toHaveLength(1);
  });

  test('`#!` anywhere else is an error', () => {
    expect(() => new Lexer('тағ а = 1;\n#!/usr/bin/env node').tokenize()).toThrow(
      "Unexpected character '#' at line 2, column 1"
    );
    expect(() => new Lexer(' #!/bin/sh').tokenize()).toThrow(/Unexpected character '#'/);
    expect(parse('чоп.сабт(`${#!}`);').errors).not.toEqual([]);
  });
});

describe('decorators', () => {
  test('on a class, its methods, accessors, fields and auto-accessors', () => {
    const classDecl = classOf(
      '@д\n@а.б(1)\nсинф К {\n  @м м() {}\n  @г get х(): рақам { бозгашт 1; }\n  @п(2) п = 1;\n  @д дастрасӣ д = 2;\n  @с статикӣ с = 3;\n  @х #х() {}\n}'
    );
    expect(classDecl.decorators).toMatchObject([
      { type: 'Decorator', expression: { type: 'Identifier', name: 'д' }, line: 1, column: 1 },
      {
        type: 'Decorator',
        expression: {
          type: 'CallExpression',
          callee: {
            type: 'MemberExpression',
            object: { name: 'а' },
            property: { name: 'б' },
            computed: false,
          },
          arguments: [{ type: 'Literal', value: 1 }],
        },
      },
    ]);
    const members = classDecl.body.body as Array<MethodDefinition | PropertyDefinition>;
    expect(members.map(member => member.decorators?.length)).toEqual([1, 1, 1, 1, 1, 1]);
    expect(members[1]).toMatchObject({ kind: 'get' });
    expect(members[3]).toMatchObject({ type: 'PropertyDefinition', accessor: true });
    expect(members[4]).toMatchObject({ static: true });
    expect(members[5]).toMatchObject({ key: { type: 'PrivateIdentifier', name: 'х' } });
  });

  test('a parenthesized decorator and type arguments', () => {
    const classDecl = classOf('@(д[0]) @ф<рақам>() синф К {}');
    expect(classDecl.decorators![0].expression).toMatchObject({
      type: 'MemberExpression',
      computed: true,
    });
    expect(classDecl.decorators![1].expression).toMatchObject({
      type: 'CallExpression',
      callee: { name: 'ф' },
    });
  });

  test('before or after `содир`, also with `пешфарз` and `мавҳум`', () => {
    const [a, b, c, d] = parseOk(
      '@д содир синф А {}\nсодир @д синф Б {}\nсодир пешфарз @д синф В {}\n@д мавҳум синф Г {}'
    );
    expect((a as ExportDeclaration).declaration).toMatchObject({
      type: 'ClassDeclaration',
      name: { name: 'А' },
      decorators: [{ expression: { name: 'д' } }],
    });
    expect((b as ExportDeclaration).declaration).toMatchObject({ decorators: [{}] });
    expect(c).toMatchObject({ default: true, declaration: { decorators: [{}] } });
    expect(d).toMatchObject({ abstract: true, decorators: [{}] });
  });

  test('on class expressions', () => {
    const declaration = parseOk('собит К = @д синф { @м м() {} };')[0] as VariableDeclaration;
    expect(declaration.init).toMatchObject({
      type: 'ClassExpression',
      decorators: [{ expression: { name: 'д' } }],
    });
    expect((declaration.init as ClassExpression).body.body[0]).toMatchObject({
      decorators: [{}],
    });
  });

  test('on constructor and method parameters', () => {
    const classDecl = classOf('синф К { конструктор(@тазриқ() хосусӣ х: рақам) {} м(@а а, б) {} }');
    const [constructor, method] = classDecl.body.body as MethodDefinition[];
    expect(constructor.value.params[0]).toMatchObject({
      accessibility: 'private',
      decorators: [{ expression: { type: 'CallExpression' } }],
    });
    expect(method.value.params[0].decorators).toHaveLength(1);
    expect(method.value.params[1].decorators).toBeUndefined();
  });

  test.each([
    ['a function', '@д функсия ф() {}', 'line 1, column 1'],
    ['a variable', '@д тағ х = 1;', 'line 1, column 1'],
    ['an `эълон синф`', '@д эълон синф К {}', 'line 1, column 1'],
    ['a constructor', 'синф К { @д конструктор() {} }', 'line 1, column 10'],
    ['an index signature', 'синф К { @д [к: сатр]: ҳар; }', 'line 1, column 10'],
    ['an abstract method', 'мавҳум синф К { @д мавҳум м(): беджавоб; }', 'line 1, column 17'],
    ['an `эълон` field', 'синф К { @д эълон х: рақам; }', 'line 1, column 10'],
    ['a function parameter', 'функсия ф(@д х) {}', 'line 1, column 11'],
    ['an arrow function parameter', 'собит ф = (@д х) => х;', 'line 1, column 12'],
  ])('are not valid on %s', (_name, source, at) => {
    expect(errorsOf(source)).toEqual([`Decorators are not valid here at ${at}`]);
  });

  test('not on an overload signature', () => {
    expect(errorsOf('синф К { @д м(х: рақам): беджавоб; м(х: ҳар) {} }')).toEqual([
      'A decorator can only decorate a method implementation, not an overload at line 1, column 10',
    ]);
  });

  test('`@` must be followed by a name or parentheses', () => {
    expect(errorsOf('@1 синф К {}')[0]).toMatch(/Expected decorator name after '@'/);
  });
});

describe('`дастрасӣ` (accessor) fields', () => {
  test('instance, static and private auto-accessors', () => {
    const members = classOf(
      'синф К { дастрасӣ а = 1; статикӣ дастрасӣ б: рақам; accessor #в = 2; }'
    ).body.body as PropertyDefinition[];
    expect(members.map(m => m.accessor)).toEqual([true, true, true]);
    expect(members[1]).toMatchObject({ static: true, key: { name: 'б' } });
    expect(members[2]).toMatchObject({ key: { type: 'PrivateIdentifier', name: 'в' } });
  });

  test('`дастрасӣ` is a name before `(`, `=`, `:` and `;`', () => {
    const members = classOf('синф К { дастрасӣ() {} }\nсинф Л { дастрасӣ = 1; дастрасӣ2: рақам; }')
      .body.body;
    expect(members[0]).toMatchObject({ type: 'MethodDefinition', key: { name: 'дастрасӣ' } });
  });

  test.each([
    [
      'on a method',
      'синф К { дастрасӣ м() {} }',
      "'дастрасӣ' modifier can only appear on a property declaration at line 1, column 19",
    ],
    [
      'with танҳохонӣ',
      'синф К { дастрасӣ танҳохонӣ х = 1; }',
      "'дастрасӣ' modifier cannot be used with 'танҳохонӣ' modifier at line 1, column 29",
    ],
    [
      'with эълон',
      'синф К { эълон дастрасӣ х: рақам; }',
      "'дастрасӣ' modifier cannot be used with 'эълон' modifier at line 1, column 25",
    ],
    [
      'twice',
      'синф К { дастрасӣ дастрасӣ х = 1; }',
      "'дастрасӣ' modifier already seen at line 1, column 19",
    ],
  ])('is an error %s', (_name, source, message) => {
    expect(errorsOf(source)).toEqual([message]);
  });
});

describe('`бознавис` (override)', () => {
  test('on methods, fields, accessors and static members', () => {
    const members = classOf(
      'синф Б мерос А { бознавис м() {} бознавис х = 1; бознавис get г(): рақам { бозгашт 1; } статикӣ бознавис с() {} ҷамъиятӣ бознавис танҳохонӣ т = 2; override у = 3; }'
    ).body.body as Array<MethodDefinition | PropertyDefinition>;
    expect(members.map(member => member.override)).toEqual([true, true, true, true, true, true]);
    expect(members[3]).toMatchObject({ static: true, key: { name: 'с' } });
    expect(members[4]).toMatchObject({ accessibility: 'public', readonly: true });
  });

  test('on parameter properties', () => {
    const constructor = classOf(
      'синф Б мерос А { конструктор(ҷамъиятӣ бознавис х: рақам) { супер(); } }'
    ).body.body[0] as MethodDefinition;
    expect(constructor.value.params[0]).toMatchObject({ accessibility: 'public', override: true });
  });

  test('is a name where a member name ends', () => {
    const members = classOf('синф К { бознавис() {} бознавис2 = 1; }').body.body;
    expect(members[0]).toMatchObject({ key: { name: 'бознавис' } });
    expect(parseOk('тағ бознавис = 1; функсия ф(бознавис: рақам) {}')).toHaveLength(2);
  });

  test.each([
    [
      'after танҳохонӣ in a parameter property',
      'синф Б { конструктор(бознавис ҷамъиятӣ х) {} }',
      "'ҷамъиятӣ' modifier must precede 'бознавис' modifier at line 1, column 31",
    ],
    [
      'in a function parameter',
      'функсия ф(бознавис х) {}',
      'A parameter property is only allowed in a constructor at line 1, column 11',
    ],
    [
      'before статикӣ',
      'синф Б { бознавис статикӣ м() {} }',
      "'статикӣ' modifier must precede the modifiers before it at line 1, column 19",
    ],
  ])('is an error %s', (_name, source, message) => {
    expect(errorsOf(source)).toEqual([message]);
  });
});

describe('`эълон` (declare)', () => {
  test('variables, functions, classes, enums and namespaces', () => {
    const [constant, variable, fn, cls, en, ns] = parseOk(
      'эълон собит ВЕРСИЯ: сатр;\nэълон тағ ҳисоб: рақам, ном: сатр;\nэълон функсия ф(х: рақам): сатр;\nэълон синф К { конструктор(х: рақам); м(): рақам; х: рақам; статикӣ с(): беджавоб; get г(): рақам; }\nэълон шумориш Э { А, Б }\nэълон номфазо Н { функсия кор(): беджавоб; собит н: рақам; синф Д {} }'
    );
    expect(constant).toMatchObject({ type: 'VariableDeclaration', kind: 'СОБИТ', declare: true });
    expect((constant as VariableDeclaration).init).toBeUndefined();
    expect(variable).toMatchObject({ type: 'VariableDeclarationList', declare: true });
    expect((variable as VariableDeclarationList).declarations.every(d => d.declare)).toBe(true);
    expect(fn).toMatchObject({ type: 'FunctionSignature', declare: true, name: { name: 'ф' } });
    expect(cls).toMatchObject({ type: 'ClassDeclaration', declare: true });
    const members = (cls as ClassDeclaration).body.body as Array<
      MethodDefinition | PropertyDefinition
    >;
    expect(members.map(m => (m as MethodDefinition).signature)).toEqual([
      true,
      true,
      undefined,
      true,
      true,
    ]);
    expect(en).toMatchObject({ type: 'EnumDeclaration', declare: true });
    expect(ns).toMatchObject({ type: 'NamespaceDeclaration', declare: true });
    const nsBody = (ns as NamespaceDeclaration).body.statements;
    expect(nsBody.map(s => s.type)).toEqual([
      'FunctionSignature',
      'VariableDeclaration',
      'ClassDeclaration',
    ]);
    expect(nsBody.every(s => (s as { declare?: boolean }).declare)).toBe(true);
  });

  test('`эълон модул "ном"` and `эълон глобалӣ`', () => {
    const [module, global, legacy] = parseOk(
      'эълон модул "китобхона" {\n  содир функсия салом(н: сатр): сатр;\n  содир пешфарз синф Асос {}\n  содир интерфейс И { а: рақам; }\n}\nэълон глобалӣ { интерфейс Window { х: рақам; } собит ГЛОБАЛ: рақам; }\nэълон модул Кӯҳна { функсия ф(): беджавоб; }'
    );
    expect(module).toMatchObject({
      type: 'AmbientModuleDeclaration',
      name: { type: 'Literal', value: 'китобхона' },
      line: 1,
      column: 1,
    });
    expect((module as AmbientModuleDeclaration).body.map(s => s.type)).toEqual([
      'ExportDeclaration',
      'ExportDeclaration',
      'ExportDeclaration',
    ]);
    expect((module as AmbientModuleDeclaration).body[0]).toMatchObject({
      declaration: { type: 'FunctionSignature', declare: true },
    });
    expect(global).toMatchObject({ type: 'AmbientModuleDeclaration', global: true });
    expect((global as AmbientModuleDeclaration).name).toBeUndefined();
    expect(legacy).toMatchObject({
      type: 'NamespaceDeclaration',
      declare: true,
      name: { name: 'Кӯҳна' },
    });
  });

  test('`содир эълон …`, also in a namespace, and English `declare`', () => {
    const [exported, ns, english] = parseOk(
      'содир эълон функсия ф(): беджавоб;\nномфазо Н { содир эълон собит х: рақам; }\ndeclare собит у: рақам;'
    );
    expect(exported).toMatchObject({ declaration: { type: 'FunctionSignature', declare: true } });
    expect((ns as NamespaceDeclaration).body.statements[0]).toMatchObject({
      type: 'VariableDeclaration',
      declare: true,
      exported: true,
    });
    expect(english).toMatchObject({ declare: true });
  });

  test('fields declared with `эълон` in a class', () => {
    const members = classOf(
      'синф К { эълон х: рақам; ҷамъиятӣ эълон танҳохонӣ у: сатр; эълон() {} }'
    ).body.body as PropertyDefinition[];
    expect(members[0]).toMatchObject({ declare: true, key: { name: 'х' } });
    expect(members[1]).toMatchObject({ declare: true, readonly: true, accessibility: 'public' });
    expect(members[2]).toMatchObject({ type: 'MethodDefinition', key: { name: 'эълон' } });
  });

  test('`эълон` is a name elsewhere', () => {
    const [declaration, call] = parseOk('тағ эълон = 1;\nэълон\nсобит х = 2;');
    expect(declaration).toMatchObject({ identifier: { name: 'эълон' } });
    expect(call).toMatchObject({ type: 'ExpressionStatement' });
    expect(parseOk('тағ модул = 1; тағ глобалӣ = модул; модул = глобалӣ;')).toHaveLength(3);
  });

  test.each([
    [
      'an initializer of a variable',
      'эълон тағ х = 1;',
      'Initializers are not allowed in ambient contexts at line 1, column 15',
    ],
    [
      'a non-literal initializer',
      'эълон собит х = ф();',
      'Initializers are not allowed in ambient contexts at line 1, column 17',
    ],
    [
      'a function body',
      'эълон функсия ф() {}',
      'An implementation cannot be declared in ambient contexts at line 1, column 7',
    ],
    [
      'a method body',
      'эълон синф К { м() {} }',
      'An implementation cannot be declared in ambient contexts at line 1, column 16',
    ],
    [
      'a constructor body',
      'эълон синф К { конструктор() {} }',
      'An implementation cannot be declared in ambient contexts at line 1, column 16',
    ],
    [
      'a field initializer',
      'эълон синф К { х = 1; }',
      'Initializers are not allowed in ambient contexts at line 1, column 16',
    ],
    [
      'an `эълон` field initializer',
      'синф К { эълон х = 1; }',
      'Initializers are not allowed in ambient contexts at line 1, column 16',
    ],
  ])('rejects %s', (_name, source, message) => {
    expect(errorsOf(source)).toEqual([message]);
  });

  test('a literal initializer of an ambient constant is allowed', () => {
    expect(errorsOf('эълон собит х = 1; эълон собит у = -2; эълон собит з = "з";')).toEqual([]);
  });
});

describe('`истифода` (using) declarations', () => {
  test('`истифода` and `интизор истифода`', () => {
    const [using, list, awaitUsing] = parseOk(
      'истифода а = ф();\nистифода б: Т = ф(), в = ф();\nинтизор истифода г = ф();'
    );
    expect(using).toMatchObject({
      type: 'VariableDeclaration',
      kind: 'СОБИТ',
      using: 'sync',
      identifier: { name: 'а' },
    });
    expect(list).toMatchObject({ type: 'VariableDeclarationList', using: 'sync' });
    expect((list as VariableDeclarationList).declarations.map(d => d.using)).toEqual([
      'sync',
      'sync',
    ]);
    expect(awaitUsing).toMatchObject({ using: 'async', identifier: { name: 'г' } });
    expect(parseOk('using х = ф();')[0]).toMatchObject({ using: 'sync' });
  });

  test('in for-of heads', () => {
    const [loop, awaitLoop] = parseOk(
      'барои (истифода х аз хҳо) {}\nбарои интизор (интизор истифода у аз уҳо) {}'
    ) as ForOfStatement[];
    expect(loop.left).toMatchObject({ using: 'sync', identifier: { name: 'х' } });
    expect(awaitLoop).toMatchObject({ await: true, left: { using: 'async' } });
  });

  test('`истифода` is a name elsewhere', () => {
    const statements = parseOk(
      'тағ истифода = 1;\nистифода = 2;\nистифода(3);\nистифода\nх = 4;\nбарои (собит истифода аз []) {}'
    );
    expect(statements.map(s => s.type)).toEqual([
      'VariableDeclaration',
      'ExpressionStatement',
      'ExpressionStatement',
      'ExpressionStatement',
      'ExpressionStatement',
      'ForOfStatement',
    ]);
  });

  test('needs an initializer; `истифода [а] = …` assigns an element', () => {
    expect(errorsOf('истифода х: Т;')[0]).toMatch(/Missing initializer/);
    expect(parseOk('истифода [а] = ф();')[0]).toMatchObject({
      type: 'ExpressionStatement',
      expression: { type: 'AssignmentExpression', left: { type: 'MemberExpression' } },
    });
  });
});

describe('type-only imports and exports', () => {
  test('`ворид навъ` and `навъ` specifiers', () => {
    const [all, mixed, defaultType, english] = parseOk(
      'ворид навъ { Т, У чун Ф } аз "./м";\nворид { навъ Т, х } аз "./м";\nворид навъ Д аз "./д";\nimport_ = 1;'.replace(
        'import_ = 1;',
        'ворид type { Т } аз "./м";'
      )
    ) as ImportDeclaration[];
    expect(all).toMatchObject({ type: 'ImportDeclaration', importKind: 'type' });
    expect(all.specifiers.map(s => s.local.name)).toEqual(['Т', 'Ф']);
    expect(mixed.importKind).toBeUndefined();
    expect(mixed.specifiers).toMatchObject([
      { imported: { name: 'Т' }, importKind: 'type' },
      { imported: { name: 'х' } },
    ]);
    expect(mixed.specifiers[1]).not.toHaveProperty('importKind');
    expect(defaultType).toMatchObject({
      importKind: 'type',
      specifiers: [{ type: 'ImportDefaultSpecifier', local: { name: 'Д' } }],
    });
    expect(english).toMatchObject({ importKind: 'type' });
  });

  test('`type` stays an import name', () => {
    const [defaultImport, named] = parseOk(
      'ворид type аз "./м";\nворид { type, type чун т } аз "./м";'
    ) as ImportDeclaration[];
    expect(defaultImport.importKind).toBeUndefined();
    expect(defaultImport.specifiers[0]).toMatchObject({ local: { name: 'type' } });
    expect(named.specifiers.map(s => s.local.name)).toEqual(['type', 'т']);
  });

  test('`содир навъ`', () => {
    const [local, reexport, star, mixed, alias] = parseOk(
      'содир навъ { Т };\nсодир навъ { У } аз "./м";\nсодир навъ * аз "./м";\nсодир { навъ Т, х };\nсодир навъ Ном = рақам;'
    ) as ExportDeclaration[];
    expect(local).toMatchObject({ exportKind: 'type', specifiers: [{ local: { name: 'Т' } }] });
    expect(reexport).toMatchObject({ exportKind: 'type', source: { value: './м' } });
    expect(star).toMatchObject({ exportKind: 'type', specifiers: [] });
    expect(mixed.exportKind).toBeUndefined();
    expect(mixed.specifiers).toMatchObject([{ exportKind: 'type' }, { local: { name: 'х' } }]);
    expect(alias.declaration).toMatchObject({ type: 'TypeAlias', name: { name: 'Ном' } });
  });

  test.each([
    [
      'a default and named types',
      'ворид навъ Д, { Т } аз "./м";',
      'A type-only import can specify a default import or named bindings, but not both at line 1, column 1',
    ],
    [
      '`навъ` twice',
      'ворид навъ { навъ Т } аз "./м";',
      "The 'навъ' modifier cannot be used on a named import when 'ворид навъ' is used on its import statement at line 1, column 1",
    ],
    [
      '`навъ` twice in an export',
      'содир навъ { навъ Т };',
      "The 'навъ' modifier cannot be used on a named export when 'содир навъ' is used on its export statement at line 1, column 1",
    ],
  ])('rejects %s', (_name, source, message) => {
    expect(errorsOf(source)).toEqual([message]);
  });
});

describe('`ворид х = require(…)` and `содир = х`', () => {
  test('import-equals declarations', () => {
    const [required, alias, typeOnly] = parseOk(
      'ворид путь = require("path");\nворид ф = Н.Д.ф;\nворид навъ Т = require("./т");'
    ) as ImportEqualsDeclaration[];
    expect(required).toMatchObject({
      type: 'ImportEqualsDeclaration',
      id: { name: 'путь' },
      source: { type: 'Literal', value: 'path' },
    });
    expect(required.reference).toBeUndefined();
    expect(alias).toMatchObject({
      reference: { type: 'MemberExpression', object: { type: 'MemberExpression' } },
    });
    expect(typeOnly).toMatchObject({ importKind: 'type', source: { value: './т' } });
  });

  test('export assignment', () => {
    expect(parseOk('собит а = 1;\nсодир = а;')[1]).toMatchObject({
      type: 'ExportAssignment',
      expression: { name: 'а' },
      line: 2,
    } as Partial<ExportAssignment>);
  });

  test('an export assignment must be the only export', () => {
    expect(errorsOf('собит а = 1;\nсодир = а;\nсодир собит б = 2;')).toEqual([
      'An export assignment cannot be used in a module with other exported elements at line 2, column 1',
    ]);
    expect(errorsOf('содир = 1;\nсодир интерфейс И {}\nсодир навъ { И };')).toEqual([]);
  });
});

describe('type parameter modifiers', () => {
  test('`собит`, `дар`, `берун` on functions, classes, interfaces, aliases and methods', () => {
    const [fn, cls, iface, alias] = parseOk(
      'функсия ф<собит Т мерос рақам[]>(х: Т): Т { бозгашт х; }\nсинф К<дар берун Т, собит У> { м<собит В>(в: В): В { бозгашт в; } }\nинтерфейс И<дар Т, берун У> {}\nнавъ Ф<in out Т> = Т;'
    );
    expect((fn as FunctionDeclaration).typeParameters).toMatchObject([
      { name: { name: 'Т' }, const: true, constraint: { type: 'ArrayType' } },
    ]);
    expect((cls as ClassDeclaration).typeParameters).toMatchObject([
      { name: { name: 'Т' }, in: true, out: true },
      { name: { name: 'У' }, const: true },
    ]);
    const method = (cls as ClassDeclaration).body.body[0] as MethodDefinition;
    expect(method.value.typeParameters).toMatchObject([{ const: true }]);
    expect((iface as InterfaceDeclaration).typeParameters).toMatchObject([
      { in: true },
      { out: true },
    ]);
    expect((alias as TypeAlias).typeParameters).toMatchObject([{ in: true, out: true }]);
  });

  test('on generic arrow functions', () => {
    const arrow = (parseOk('собит ф = <собит Т,>(х: Т) => х;')[0] as VariableDeclaration)
      .init as ArrowFunctionExpression;
    expect(arrow).toMatchObject({
      type: 'ArrowFunctionExpression',
      typeParameters: [{ const: true }],
    });
    // `<собит>х` is still a const assertion
    expect((parseOk('собит р = <собит>[1];')[0] as VariableDeclaration).init).toMatchObject({
      type: 'TypeAssertion',
      isConst: true,
    });
  });

  test('`берун` and `дар` are names where a name ends', () => {
    const fn = parseOk('функсия ф<берун, Б = берун>(х: берун): берун { бозгашт х; }')[0];
    expect((fn as FunctionDeclaration).typeParameters!.map(p => p.name.name)).toEqual([
      'берун',
      'Б',
    ]);
    const iface = parseOk('интерфейс И<берун мерос рақам> {}')[0] as InterfaceDeclaration;
    expect(iface.typeParameters).toMatchObject([{ name: { name: 'берун' }, constraint: {} }]);
    expect(iface.typeParameters![0]).not.toHaveProperty('out');
  });

  test.each([
    [
      '`дар` on a function',
      'функсия ф<дар Т>() {}',
      "'дар' modifier can only appear on a type parameter of a class, interface or type alias at line 1, column 11",
    ],
    [
      '`берун` on a method',
      'синф К { м<берун Т>() {} }',
      "'берун' modifier can only appear on a type parameter of a class, interface or type alias at line 1, column 12",
    ],
    [
      '`собит` on an interface',
      'интерфейс И<собит Т> {}',
      "'собит' modifier can only appear on a type parameter of a function, method or class at line 1, column 13",
    ],
    [
      '`собит` on a type alias',
      'навъ Н<собит Т> = Т;',
      "'собит' modifier can only appear on a type parameter of a function, method or class at line 1, column 8",
    ],
  ])('rejects %s', (_name, source, message) => {
    expect(errorsOf(source)).toEqual([message]);
  });
});

describe('overload signatures', () => {
  test('functions: signatures before the implementation', () => {
    const [first, second, implementation] = parseOk(
      'функсия ф(х: рақам): рақам;\nфунксия ф(х: сатр): сатр\nфунксия ф(х: ҳар): ҳар { бозгашт х; }'
    );
    expect(first).toMatchObject({
      type: 'FunctionSignature',
      name: { name: 'ф' },
      params: [{ name: { name: 'х' } }],
      returnType: { typeAnnotation: { type: 'PrimitiveType', name: 'рақам' } },
    });
    expect((first as FunctionSignature).declare).toBeUndefined();
    expect(second).toMatchObject({ type: 'FunctionSignature' });
    expect(implementation).toMatchObject({ type: 'FunctionDeclaration' });
  });

  test('exported, async and generic', () => {
    const statements = parseOk(
      'содир функсия ф<Т>(х: Т): Т;\nсодир функсия ф(х: ҳар) { бозгашт х; }\nҳамзамон функсия г(): Ваъда<рақам>;\nҳамзамон функсия г() { бозгашт 1; }'
    );
    expect(statements[0]).toMatchObject({
      declaration: { type: 'FunctionSignature', typeParameters: [{ name: { name: 'Т' } }] },
    });
    expect(statements[2]).toMatchObject({ type: 'FunctionSignature', async: true });
  });

  test('methods and constructors', () => {
    const members = classOf(
      'синф К { м(х: рақам): рақам; м(х: ҳар): ҳар { бозгашт х; } конструктор(); конструктор(х?: рақам) {} }'
    ).body.body as MethodDefinition[];
    expect(members.map(m => [m.kind, Boolean(m.signature)])).toEqual([
      ['method', true],
      ['method', false],
      ['constructor', true],
      ['constructor', false],
    ]);
  });

  test.each([
    [
      'a lone function signature',
      'функсия ф(х: рақам): рақам;\nчоп.сабт(1);',
      'Function implementation is missing or not immediately following the declaration at line 1, column 1',
    ],
    [
      'an implementation of another name',
      'функсия ф(): беджавоб;\nфунксия г() {}',
      'Function implementation is missing or not immediately following the declaration at line 1, column 1',
    ],
    [
      'a signature in a block',
      'агар (дуруст) { функсия ф(): беджавоб; }',
      'Function implementation is missing or not immediately following the declaration at line 1, column 17',
    ],
    [
      'a method signature',
      'синф К { м(): беджавоб; н() {} }',
      'Function implementation is missing or not immediately following the declaration at line 1, column 10',
    ],
    [
      'a constructor signature',
      'синф К { конструктор(х: рақам); }',
      'Constructor implementation is missing at line 1, column 10',
    ],
    [
      'a parameter property in a signature',
      'синф К { конструктор(хосусӣ х: рақам); конструктор(х: ҳар) {} }',
      'A parameter property is only allowed in a constructor implementation at line 1, column 29',
    ],
  ])('rejects %s', (_name, source, message) => {
    expect(errorsOf(source)).toEqual([message]);
  });

  test('a missing body is still an error where a body must follow', () => {
    expect(errorsOf('функсия ф() бозгашт 1;')[0]).toMatch(/Expected '\{' before function body/);
    expect(errorsOf('синф К { м() бозгашт; }')[0]).toMatch(/Expected '\{' after method signature/);
  });

  test('optional and abstract methods need no implementation', () => {
    expect(errorsOf('синф К { м?(): рақам; }')).toEqual([]);
    expect(errorsOf('мавҳум синф К { мавҳум м(): рақам; мавҳум м(х: рақам): рақам; }')).toEqual([]);
    expect(errorsOf('эълон синф К { м(): рақам; }')).toEqual([]);
  });
});

describe('`ин` parameters', () => {
  test('of functions, methods, function expressions and function types', () => {
    const [fn, cls, alias, constant] = parseOk(
      'функсия ф(ин: Нуқта, х: рақам) {}\nсинф К { м(ин: К) {} }\nнавъ Ф = (ин: Нуқта, х: рақам) => беджавоб;\nсобит г = функсия (ин: ҳар) {};'
    );
    expect(fn).toMatchObject({
      thisType: { typeAnnotation: { type: 'GenericType', name: { name: 'Нуқта' } } },
      params: [{ name: { name: 'х' } }],
    });
    expect((fn as FunctionDeclaration).params).toHaveLength(1);
    const method = (cls as ClassDeclaration).body.body[0] as MethodDefinition;
    expect(method.value.thisType).toBeDefined();
    expect(method.value.params).toEqual([]);
    const fnType = (alias as TypeAlias).typeAnnotation.typeAnnotation as FunctionType;
    expect(fnType).toMatchObject({ thisType: { name: { name: 'Нуқта' } } });
    expect(fnType.parameters).toHaveLength(1);
    expect((constant as VariableDeclaration).init).toMatchObject({ thisType: {}, params: [] });
  });

  test('also in object literal methods', () => {
    const declaration = parseOk('собит о = { м(ин: Т, х: рақам) {} };')[0] as VariableDeclaration;
    expect(declaration.init).toMatchObject({
      properties: [{ method: true, value: { thisType: {}, params: [{ name: { name: 'х' } }] } }],
    });
  });

  test('also in interface method signatures', () => {
    const iface = parseOk(
      'интерфейс И { м(ин: И, х: рақам): беджавоб; }'
    )[0] as InterfaceDeclaration;
    expect(iface.body.properties[0].typeAnnotation.typeAnnotation).toMatchObject({
      thisType: {},
      parameters: [{ name: { name: 'х' } }],
    });
  });

  test('accessors and arrow functions cannot have one', () => {
    expect(errorsOf('синф К { get х(ин: К): рақам { бозгашт 1; } }')).toEqual([
      "'get' and 'set' accessors cannot declare 'ин' parameters at line 1, column 14",
    ]);
    expect(errorsOf('собит ф = (ин: ҳар) => 1;').length).toBeGreaterThan(0);
  });
});

describe('class members', () => {
  test('index signatures', () => {
    const members = classOf(
      'синф Л { [калид: сатр]: рақам; статикӣ [к: сатр]: ҳар; танҳохонӣ [и: рақам]: сатр; }'
    ).body.body as PropertyDefinition[];
    expect(members[0]).toMatchObject({
      type: 'PropertyDefinition',
      indexSignature: {
        name: { name: 'калид' },
        typeAnnotation: { typeAnnotation: { name: 'сатр' } },
      },
      typeAnnotation: { typeAnnotation: { name: 'рақам' } },
      static: false,
    });
    expect(members[1]).toMatchObject({ static: true, indexSignature: {} });
    expect(members[2]).toMatchObject({ readonly: true, indexSignature: {} });
    expect(errorsOf('синф Л { [к: сатр]; }')[0]).toMatch(/An index signature must have a type/);
  });

  test('computed and literal member names', () => {
    const members = classOf(
      'синф К { [Symbol.iterator]() {} статикӣ [калид] = 1; get [ном](): рақам { бозгашт 1; } "бо фосила"() {} 42 = 1; }'
    ).body.body as Array<MethodDefinition | PropertyDefinition>;
    expect(members[0]).toMatchObject({
      type: 'MethodDefinition',
      computed: true,
      key: { type: 'MemberExpression' },
    });
    expect(members[1]).toMatchObject({ computed: true, static: true, key: { name: 'калид' } });
    expect(members[2]).toMatchObject({ kind: 'get', computed: true });
    expect(members[3]).toMatchObject({ key: { type: 'Literal', value: 'бо фосила' } });
    expect(members[4]).toMatchObject({ key: { type: 'Literal', value: 42 } });
  });

  test('optional methods', () => {
    const members = classOf('синф К { м?(): рақам; н?<Т>(х: Т) { бозгашт х; } }').body
      .body as MethodDefinition[];
    expect(members[0]).toMatchObject({ optional: true, signature: true });
    expect(members[1]).toMatchObject({ optional: true, value: { typeParameters: [{}] } });
  });

  test('abstract properties and accessors', () => {
    const members = classOf(
      'мавҳум синф Ш { мавҳум ном: сатр; мавҳум get тараф(): рақам; ҷамъиятӣ мавҳум танҳохонӣ н: рақам; }'
    ).body.body as Array<MethodDefinition | PropertyDefinition>;
    expect(members[0]).toMatchObject({ type: 'PropertyDefinition', abstract: true });
    expect(members[1]).toMatchObject({ kind: 'get', abstract: true });
    expect(members[2]).toMatchObject({ abstract: true, readonly: true, accessibility: 'public' });
    expect(errorsOf('мавҳум синф Ш { мавҳум х = 1; }')).toEqual([
      "Property 'х' cannot have an initializer because it is marked abstract at line 1, column 24",
    ]);
  });
});

describe('interface and object type members', () => {
  test('get and set signatures', () => {
    const iface = parseOk('интерфейс И { get х(): рақам; set х(қ: рақам); get у(): сатр; }')[0];
    expect((iface as InterfaceDeclaration).body.properties).toMatchObject([
      { kind: 'get', key: { name: 'х' }, typeAnnotation: { typeAnnotation: { name: 'рақам' } } },
      { kind: 'set', key: { name: 'х' }, typeAnnotation: { typeAnnotation: { name: 'рақам' } } },
      { kind: 'get', key: { name: 'у' } },
    ]);
    expect(errorsOf('навъ Н = { get х(): рақам; set х(); };')[0]).toMatch(
      /Setter must have exactly one formal parameter/
    );
  });

  test('`get` and `set` stay member names', () => {
    const iface = parseOk('интерфейс И { get: рақам; set(х: рақам): беджавоб; get?(): сатр; }')[0];
    expect(
      (iface as InterfaceDeclaration).body.properties.map(p => [p.key.name, p.method])
    ).toEqual([
      ['get', undefined],
      ['set', true],
      ['get', true],
    ]);
  });

  test('computed names, e.g. a `беназир рамз` key, are not index signatures', () => {
    const iface = parseOk(
      'интерфейс И { [калид]: рақам; [Symbol.iterator](): Iterator<рақам>; [к: сатр]: ҳар; }'
    )[0] as InterfaceDeclaration;
    expect(iface.body.properties.map(p => [p.key.name, Boolean(p.computed)])).toEqual([
      ['__computed_name__', true],
      ['__computed_name__', true],
      ['__computed__', false],
    ]);
    expect(iface.body.properties[1]).toMatchObject({ method: true });
  });
});

describe('namespaces and enums that merge', () => {
  test('parse as separate declarations', () => {
    const statements = parseOk(
      'номфазо Н { содир собит а = 1; }\nномфазо Н { содир собит б = 2; }\nшумориш Э { А }\nшумориш Э { Б = 1 }'
    );
    expect(statements.map(s => s.type)).toEqual([
      'NamespaceDeclaration',
      'NamespaceDeclaration',
      'EnumDeclaration',
      'EnumDeclaration',
    ]);
    expect((statements[3] as EnumDeclaration).declare).toBeUndefined();
  });
});

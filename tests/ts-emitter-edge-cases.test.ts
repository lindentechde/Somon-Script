/**
 * The TypeScript emitter on rarer declarations: ambient classes and modules,
 * exports of built-in member names, `typeof this`, and syntax trees from
 * other producers.
 */
import ts from 'typescript';

import type { ClassDeclaration, Program } from '../src/ast';
import { compile } from '../src/compiler';
import { Lexer } from '../src/lexer';
import { Parser } from '../src/parser';
import { TsEmitter } from '../src/ts-emitter';

function parse(source: string): Program {
  const parser = new Parser(new Lexer(source).tokenize());
  const ast = parser.parse();
  expect(parser.getErrors()).toEqual([]);
  return ast;
}

/** Emitted TypeScript, which must transpile without syntax errors. */
function emit(source: string): string {
  const emitter = new TsEmitter();
  const code = emitter.generate(parse(source));
  expect(emitter.getErrors()).toEqual([]);
  const { diagnostics } = ts.transpileModule(code, {
    reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.Preserve },
  });
  expect(diagnostics ?? []).toEqual([]);
  return code;
}

describe('TypeScript emitter: ambient declarations', () => {
  test('fields of an `эълон синф` are not `declare`d again; static ones stay static', () => {
    expect(emit('эълон синф К { х: рақам; статикӣ у: сатр; }')).toBe(
      'declare class К {\n  х: number;\n  static у: string;\n}'
    );
  });

  test('`эълон` before a field of an `эълон синф` is dropped: TypeScript does not allow it', () => {
    expect(emit('эълон синф К { эълон х: рақам; }')).toBe('declare class К {\n  х: number;\n}');
  });

  test('`declare` fields in a class, also static', () => {
    expect(emit('синф К { статикӣ эълон х: рақам; эълон у: сатр; }')).toBe(
      'class К {\n  static declare х: number;\n  declare у: string;\n}'
    );
  });

  test('ambient modules: empty, and `global` inside one', () => {
    expect(emit('эълон модул "м" {}')).toBe('declare module "м" {}');
    expect(emit('эълон модул "м" { эълон глобалӣ { тағ х: рақам; } }')).toBe(
      'declare module "м" {\n  global {\n    let х: number;\n  }\n}'
    );
  });
});

describe('TypeScript emitter: built-in member names', () => {
  test('an exported declaration of a built-in member name and another name', () => {
    expect(emit('содир эълон собит дарозӣ: рақам, х: рақам;')).toBe(
      'declare const дарозӣ: number, х: number;\nexport { дарозӣ as length, х };'
    );
  });

  test('overloads of a built-in member name are exported under it once', () => {
    expect(
      emit(
        'содир эълон функсия илова(х: рақам): беджавоб;\nсодир эълон функсия илова(х: сатр): беджавоб;'
      )
    ).toBe(
      [
        'declare function илова(х: number): void;',
        'export { илова as push };',
        'declare function илова(х: string): void;',
      ].join('\n')
    );
  });

  test('in a namespace: overload signatures, interfaces', () => {
    expect(
      emit(
        'номфазо Н {\n  содир функсия харита(х: рақам): беджавоб;\n  содир функсия харита(х: ҳар) {}\n  содир интерфейс илова { а: рақам; }\n}'
      )
    ).toBe(
      [
        'namespace Н {',
        '  function харита(х: number): void;',
        '  function харита(х: any) {}',
        '  export const map = харита;',
        '  interface илова {',
        '    а: number;',
        '  }',
        '  export type push = илова;',
        '}',
      ].join('\n')
    );
    // TypeScript reads them as `Н.map` and `Н.push`
    expect(
      compile(
        'номфазо Н { содир функсия харита(х: рақам): рақам { бозгашт х; } содир интерфейс илова { а: рақам; } }\nтағ и: Н.илова = { а: Н.харита(1) };\nчоп.сабт(и.а);',
        { checker: 'typescript', strict: true }
      ).errors
    ).toEqual([]);
  });
});

describe('TypeScript emitter: types', () => {
  test('`навъи ин.х` is `typeof this.х`', () => {
    expect(emit('синф К { х = 1; у: навъи ин.х = 2; }')).toBe(
      'class К {\n  х = 1;\n  у: typeof this.х = 2;\n}'
    );
  });

  test('English type names stay as they are', () => {
    expect(emit('тағ х: number = 1;\nтағ у: string | boolean = "";')).toBe(
      'let х: number = 1;\nlet у: string | boolean = "";'
    );
  });
});

describe('TypeScript emitter: syntax trees from other producers', () => {
  test('a class without an `implements` list', () => {
    const program = parse('синф К {}');
    delete (program.body[0] as ClassDeclaration).implements;
    expect(new TsEmitter().generate(program)).toBe('class К {}');
  });

  test('a type node it does not know is reported and emitted as `any`', () => {
    const program = parse('тағ х: рақам = 1;');
    const annotation = (program.body[0] as any).typeAnnotation.typeAnnotation;
    annotation.type = 'FutureType';
    const emitter = new TsEmitter();
    expect(emitter.generate(program)).toBe('let х: any = 1;');
    expect(emitter.getErrors()).toEqual(['Unknown type node: FutureType']);
  });
});

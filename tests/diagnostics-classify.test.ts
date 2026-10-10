import { compile } from '../src/compiler';
import {
  closestName,
  codegenDiagnostic,
  detailDiagnostic,
  editDistance,
  syntaxDiagnostic,
} from '../src/diagnostics';
import { classifyCodegenError, classifySyntaxError } from '../src/diagnostics/classify';

/**
 * Every kind of lexer, parser and code generator error gets a code of the
 * catalog (src/diagnostics/classify.ts), from programs that produce it.
 */
const PROGRAMS: Array<[source: string, code: string]> = [
  ['тағ х = `матн', 'LEX_UNTERMINATED_TEMPLATE'],
  ['тағ х = 0123;', 'LEX_INVALID_NUMBER'],
  ['тағ х = "\\x";', 'LEX_INVALID_ESCAPE'],
  ['тағ х = # ;', 'LEX_UNEXPECTED_CHARACTER'],
  ['тағ х = /(/;', 'LEX_INVALID_REGEXP'],
  ["тағ х = 'матн;", 'LEX_UNTERMINATED_STRING'],
  ['тағ х = /а', 'PARSE_EXPECTED_EXPRESSION'],
  ['тағ х = @;', 'PARSE_EXPECTED_NAME'],
  ['тағ 5 = 1;', 'PARSE_EXPECTED_NAME'],
  ['чоп(а.);', 'PARSE_EXPECTED_NAME'],
  ['навъ Т = ;', 'PARSE_EXPECTED_NAME'],
  ['синф А { статикӣ статикӣ х = 1; }', 'PARSE_INVALID_MODIFIER'],
  ['синф А { танҳохонӣ м() {} }', 'PARSE_INVALID_MODIFIER'],
  ['синф А { get х(а) { бозгашт 1; } }', 'PARSE_INVALID_CLASS_MEMBER'],
  ['тағ т: [а: рақам, сатр] = [1, "а"];', 'PARSE_INVALID_TYPE'],
  ['ворид навъ А, { Б } аз "./м";', 'PARSE_INVALID_IMPORT_EXPORT'],
  ['эълон тағ х = 1;', 'PARSE_INVALID_DECLARATION'],
  ['@ф тағ х = 1;', 'PARSE_INVALID_DECLARATION'],
  ['интихоб (1) { пешфарз: шикастан; пешфарз: шикастан; }', 'PARSE_DUPLICATE_DEFAULT_CASE'],
  ['тағ о = { а = 1 };', 'PARSE_SHORTHAND_INITIALIZER'],
  ['интихоб (1) { 5 }', 'PARSE_UNEXPECTED_TOKEN'],
  ['тағ х = нав А?.б;', 'PARSE_INVALID_SYNTAX'],
  ['кӯшиш { }', 'PARSE_EXPECTED_TOKEN'],
  ['ворид { а } "./м";', 'PARSE_EXPECTED_TOKEN'],
  ['кӯшиш (1)', 'PARSE_EXPECTED_OPEN'],
  ['синф А { м(): рақам }', 'PARSE_INVALID_DECLARATION'],
  ['кун { } то х;', 'PARSE_CONDITION_PARENS'],
  ['тағ х: Т<рақам = 1;', 'PARSE_MISSING_CLOSE'],
  ['синф А {', 'PARSE_MISSING_CLOSE'],
  [')', 'PARSE_UNMATCHED_CLOSE'],
  ['тағ х = > 1;', 'PARSE_EXPECTED_EXPRESSION'],
  ['давом;', 'CODEGEN_OUTSIDE_LOOP'],
  ['шикастан берун;', 'CODEGEN_INVALID_LABEL'],
  ['берун: { давом берун; }', 'CODEGEN_INVALID_LABEL'],
  ['интизор 1;', 'CODEGEN_AWAIT_OUTSIDE_ASYNC'],
  ['тағ class = 1;', 'CODEGEN_RESERVED_WORD'],
  ['тағ х = 10n;', 'TARGET_UNSUPPORTED'],
];

describe('classification of syntax and code generation errors', () => {
  test.each(PROGRAMS)('%s → %s', (source, code) => {
    const options = code === 'TARGET_UNSUPPORTED' ? { target: 'es2019' as const } : {};
    const result = compile(source, { ...options, language: 'tj' });
    expect(result.diagnostics?.[0]?.code).toBe(code);
    expect(result.errors[0]).toMatch(/^Хато/);
  });

  test('an option the compiler does not know', () => {
    const result = compile('чоп(1);', { target: 'es1' as never, language: 'ru' });
    expect(result.diagnostics).toEqual([
      { code: 'OPTION_INVALID', severity: 'error', message: 'Неправильная настройка компилятора.' },
    ]);
  });

  test('a program nested too deeply', () => {
    const source = `тағ х = ${'['.repeat(600)}${']'.repeat(600)};`;
    expect(compile(source, { language: 'tj' }).diagnostics?.[0].code).toBe('PARSE_TOO_DEEP');
  });

  test('a crash of a stage is reported as it is', () => {
    const diagnostic = detailDiagnostic('CODEGEN_INVALID', 'boom', 'en', { line: 2 });
    expect(diagnostic).toEqual({
      code: 'CODEGEN_INVALID',
      severity: 'error',
      message: 'boom',
      line: 2,
    });
  });

  test('the end of the program moves to the end of its last line', () => {
    const diagnostic = syntaxDiagnostic(
      "Unexpected token end of input at line 9, column 1 (Expected '}' after block)",
      'агар (1) {\n  чоп(1);\n\n\n',
      'en'
    );
    expect(diagnostic).toMatchObject({ line: 2, column: 10, related: { line: 1, column: 10 } });
    // An empty program ends where it starts
    expect(
      syntaxDiagnostic('Unexpected token end of input at line 1, column 1', '', 'en')
    ).toMatchObject({
      code: 'PARSE_EXPECTED_EXPRESSION',
      line: 1,
      column: 1,
    });
  });

  test('a message about a source the lexer cannot read keeps its own position', () => {
    const diagnostic = syntaxDiagnostic(
      "Unexpected token ')' at line 1, column 5 (Expected ';' after expression)",
      '"не баста',
      'tj'
    );
    expect(diagnostic).toMatchObject({ code: 'PARSE_EXPECTED_SEMICOLON', line: 1, column: 5 });
  });

  test('a message of another shape keeps its English text in English', () => {
    expect(classifySyntaxError('Something unusual', '').message).toEqual({
      id: 'PARSE_INVALID_SYNTAX',
      params: { detail: 'Something unusual' },
    });
    expect(
      classifySyntaxError("Unexpected token 'х' at line 1, column 1 (Something else)", 'х').message
        .id
    ).toBe('PARSE_INVALID_SYNTAX');
    expect(
      classifySyntaxError(
        "Unexpected token '}' at line 1, column 9 (An index signature must have a type annotation)",
        'синф А {}'
      ).message.id
    ).toBe('PARSE_INVALID_TYPE');
    expect(
      classifySyntaxError("Expected '}' after class body at line 1, column 9", 'синф А {').message
    ).toMatchObject({ id: 'PARSE_MISSING_CLOSE', params: { close: '}', open: '{' } });
    expect(
      classifySyntaxError("'дастрасӣ' modifier cannot be used with 'эълон' modifier", '').message
    ).toMatchObject({ id: 'PARSE_INVALID_MODIFIER', params: { modifier: 'дастрасӣ' } });
  });

  test('code generator messages of other shapes', () => {
    expect(
      classifyCodegenError('Private fields can not be deleted at line 3, column 1')
    ).toMatchObject({
      message: { id: 'CODEGEN_INVALID', params: { detail: 'Private fields can not be deleted' } },
      line: 3,
      column: 1,
    });
    expect(
      classifyCodegenError("Identifier '#х' has already been declared at line 1, column 1").hint
    ).toBeUndefined();
    // The caret goes under the name when the line has it
    const source = 'тағ х = 1;\n  тағ х = 2;\n';
    expect(
      codegenDiagnostic(
        "Identifier 'х' has already been declared at line 2, column 3",
        source,
        'tj'
      )
    ).toMatchObject({ line: 2, column: 7, length: 1 });
    expect(
      codegenDiagnostic(
        "Identifier 'у' has already been declared at line 2, column 3",
        source,
        'tj'
      )
    ).toMatchObject({ line: 2, column: 3 });
    expect(
      codegenDiagnostic("Identifier 'у' has already been declared", source, 'tj').line
    ).toBeUndefined();
  });
});

describe('names close to what was written', () => {
  test('edits, swaps of neighbours included, ignoring case', () => {
    expect(editDistance('агр', 'агар')).toBe(1);
    expect(editDistance('ваграна', 'вагарна')).toBe(1);
    expect(editDistance('ТАҒ', 'тағ')).toBe(0);
    expect(editDistance('', 'аб')).toBe(2);
  });

  test('the closest name within the edits its length allows', () => {
    expect(closestName('нм', ['ном', 'нав'])).toBe('ном');
    expect(closestName('а', ['б'])).toBeUndefined();
    expect(closestName('функсия', ['функсия'])).toBeUndefined();
    expect(closestName('ҳисобкунак', ['ҳисобкунан', 'ҳисоб'])).toBe('ҳисобкунан');
    expect(closestName('абвгд', ['ежзий'])).toBeUndefined();
  });
});

describe('classification details', () => {
  test('a closing bracket that closes an open one is no stray bracket', () => {
    expect(compile('агар (1) { тағ х = }', { language: 'tj' }).diagnostics?.[0].code).toBe(
      'PARSE_EXPECTED_EXPRESSION'
    );
  });

  test('modifiers are named in the message', () => {
    expect(
      classifySyntaxError("'танҳохонӣ' can only be used on a property at line 1, column 3", '')
        .message
    ).toMatchObject({ id: 'PARSE_INVALID_MODIFIER', params: { modifier: 'танҳохонӣ' } });
  });

  test('an expected token with nothing about where', () => {
    expect(
      classifySyntaxError("Unexpected token ';' at line 1, column 3 (Expected ':')", 'а ;').message
    ).toEqual({ id: 'PARSE_EXPECTED_TOKEN', params: { expected: ':', found: ';' } });
  });
});

describe('a crash of a later stage', () => {
  test('is reported with its own text', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { TypeChecker } = require('../src/type-checker');
    const check = jest.spyOn(TypeChecker.prototype, 'check').mockImplementation(() => {
      throw new Error('boom');
    });
    try {
      const result = compile('чоп(1);', { language: 'tj' });
      expect(result.diagnostics).toEqual([
        { code: 'CODEGEN_INVALID', severity: 'error', message: expect.any(String) },
      ]);
      expect(compile('чоп(1);').errors).toEqual(['boom']);
    } finally {
      check.mockRestore();
    }
  });
});

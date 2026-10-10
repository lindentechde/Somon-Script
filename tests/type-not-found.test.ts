import { compile } from '../src/compiler';
import { declaredTypeNames, isUnknownTypeName } from '../src/type-names';
import { Lexer } from '../src/lexer';
import { Parser } from '../src/parser';

/** Type names that are neither built in nor declared (`TYPE_NOT_FOUND`). */
const unknownTypes = (source: string, options = {}) =>
  (compile(source, { language: 'tj', ...options }).diagnostics ?? [])
    .filter(d => d.code === 'TYPE_NOT_FOUND')
    .map(d => [d.severity, d.line, d.message, d.hint]);

describe('unknown type names', () => {
  test('a misspelt built-in type: a warning with the closest name, an error with --strict', () => {
    expect(unknownTypes('тағ а: мантики = дуруст;')).toEqual([
      ['warning', 1, 'Навъи `мантики` ёфт нашуд.', 'Шояд `мантиқӣ`-ро дар назар доштед?'],
    ]);
    expect(unknownTypes('тағ а: рақамм = 5;', { strict: true })).toEqual([
      ['error', 1, 'Навъи `рақамм` ёфт нашуд.', 'Шояд `рақам`-ро дар назар доштед?'],
    ]);
    expect(compile('тағ а: беҷавоб;').warnings[0]).toContain(
      "Type warning [TYPE_NOT_FOUND] at line 1, column 8: Cannot find type 'беҷавоб'"
    );
    const russian = compile('тағ а: сатрр = "";', { language: 'ru' }).diagnostics![0];
    expect([russian.message, russian.hint]).toEqual([
      'Тип `сатрр` не найден.',
      'Может быть, вы имели в виду `сатр`?',
    ]);
  });

  test('a misspelt name of a declared type, in type arguments and signatures too', () => {
    const source = [
      'интерфейс Корбар {',
      '  ном: сатр;',
      '}',
      'тағ к: Корбарр = { ном: "А" };',
      'тағ м: Map<сатр, Корбарр>;',
      'функсия ф(х: Хонанда): рӯйхат<Корбар> {',
      '  бозгашт [];',
      '}',
    ].join('\n');
    expect(unknownTypes(source).map(([, line, , hint]) => [line, hint])).toEqual([
      [4, 'Шояд `Корбар`-ро дар назар доштед?'],
      [5, 'Шояд `Корбар`-ро дар назар доштед?'],
      [6, undefined],
    ]);
  });

  test('declared, built-in, imported and library types are not reported', () => {
    const source = [
      'ворид { Сабт } аз "./сабт";',
      'ворид * чун Модул аз "./модул";',
      'тағ а: Корбар;',
      'интерфейс Корбар {',
      '  ном: сатр;',
      '}',
      'навъ Ҷуфт<Т> = [Т, Т];',
      'шумориш Ранг { Сурх }',
      'синф Қуттӣ {}',
      'номфазо Н {',
      '  содир интерфейс Т {}',
      '}',
      'функсия ф<Унсур>(х: Унсур, р: рӯйхат<рақам>, қ: Қуттӣ, ранг: Ранг): Ваъда<беджавоб> {',
      '  тағ б: Ҷуфт<Унсур> = [х, х];',
      '  бозгашт нав Ваъда<беджавоб>(ҳал => ҳал());',
      '}',
      'тағ в: Н.Т;',
      'тағ г: Хато | Сабт | Модул.Навъ;',
      'тағ д: қисмӣ<Корбар>;',
      'тағ е: Iterable<рақам>;',
      'тағ ё: HTMLElement;',
      'навъ Калидҳо<О> = { [К дар калидҳои О]: О[К] };',
      'навъ Натиҷа<Ф> = Ф мерос (...а: ҳар[]) => инфер Р ? Р : абадан;',
    ].join('\n');
    expect(unknownTypes(source)).toEqual([]);
  });

  test('a type name is reported once, where it is written', () => {
    expect(unknownTypes('функсия ф(х: мантики): мантики {\n  бозгашт х;\n}').length).toBe(2);
  });

  test('the names a program declares, and the names that are checked', () => {
    const program = new Parser(
      new Lexer('интерфейс И<Т> {}\nворид х = require("м");\nфунксия ф() {}').tokenize()
    ).parse();
    expect([...declaredTypeNames(program)].sort()).toEqual(['И', 'Т', 'ф', 'х']);
    expect(isUnknownTypeName('Корбар', new Set())).toBe(true);
    expect(isUnknownTypeName('Корбар', new Set(['Корбар']))).toBe(false);
    expect(isUnknownTypeName('рақам', new Set())).toBe(false);
    expect(isUnknownTypeName('Date', new Set())).toBe(false);
    expect(isUnknownTypeName('Н.Т', new Set())).toBe(false);
  });
});

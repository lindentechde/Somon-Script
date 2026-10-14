import {
  formatDiagnostic,
  formatDiagnosticLine,
  formatFailure,
  type Diagnostic,
} from '../src/diagnostics';
import { text } from '../src/diagnostics/text';

/** How diagnostics read for learners (src/diagnostics/format.ts). */
describe('formatting diagnostics', () => {
  const missing: Diagnostic = {
    code: 'PARSE_MISSING_CLOSE',
    severity: 'error',
    message: 'Қавси пӯшандаи `}` намерасад.',
    line: 3,
    column: 10,
    related: { line: 2, column: 14 },
    hint: 'Маслиҳат.',
  };
  const source = 'тағ а = 1;\nагар (а > 0) {\n  чоп(а);\n';

  test('a block: where, what, the lines of code with carets, and the hint', () => {
    expect(formatDiagnostic(missing, { language: 'tj', source, file: 'барнома.som' })).toBe(
      [
        'Хато дар барнома.som, сатри 3:',
        '  Қавси пӯшандаи `}` намерасад.',
        '    2 | агар (а > 0) {',
        '      |              ^',
        '    3 |   чоп(а);',
        '      |          ^',
        '  Маслиҳат: Маслиҳат.',
      ].join('\n')
    );
  });

  test('headers in every language, with and without a file or a line', () => {
    const warning: Diagnostic = { code: 'X', severity: 'warning', message: 'm' };
    const lines = (language: 'en' | 'ru' | 'tj') => [
      formatDiagnosticLine({ ...warning, line: 2 }, { language, file: 'а.som' }),
      formatDiagnosticLine({ ...warning, line: 2 }, { language }),
      formatDiagnosticLine(warning, { language, file: 'а.som' }),
      formatDiagnosticLine(warning, { language }),
      formatDiagnosticLine({ ...warning, severity: 'error', file: 'б.som' }, { language }),
    ];
    expect(lines('tj')).toEqual([
      'Огоҳӣ дар а.som, сатри 2: m',
      'Огоҳӣ дар сатри 2: m',
      'Огоҳӣ дар а.som: m',
      'Огоҳӣ: m',
      'Хато дар б.som: m',
    ]);
    expect(lines('ru')).toEqual([
      'Предупреждение в а.som, строка 2: m',
      'Предупреждение в строке 2: m',
      'Предупреждение в а.som: m',
      'Предупреждение: m',
      'Ошибка в б.som: m',
    ]);
    expect(lines('en')).toEqual([
      'Warning in а.som, line 2: m',
      'Warning on line 2: m',
      'Warning in а.som: m',
      'Warning: m',
      'Error in б.som: m',
    ]);
  });

  test('without the source or a line there is no code to show', () => {
    expect(formatDiagnostic({ ...missing, hint: undefined }, { language: 'en' })).toBe(
      'Error on line 3:\n  Қавси пӯшандаи `}` намерасад.'
    );
    expect(
      formatDiagnostic({ code: 'X', severity: 'error', message: 'm' }, { language: 'en', source })
    ).toBe('Error:\n  m');
  });

  test('a related place on the same line, a line past the end, a whole name, tabs', () => {
    const sameLine = formatDiagnostic(
      { ...missing, line: 2, column: 15, related: { line: 2, column: 14 }, hint: undefined },
      { language: 'tj', source }
    );
    expect(sameLine.split('\n').slice(2)).toEqual([
      '    2 | агар (а > 0) {',
      '      |               ^',
    ]);
    const pastEnd = formatDiagnostic(
      { ...missing, line: 40, related: undefined, hint: undefined },
      { language: 'tj', source }
    );
    expect(pastEnd).toBe('Хато дар сатри 40:\n  Қавси пӯшандаи `}` намерасад.');
    const name = formatDiagnostic(
      { code: 'X', severity: 'error', message: 'm', line: 1, column: 5, length: 1 },
      { language: 'en', source: '\tтағ ном = 1;' }
    );
    expect(name.split('\n').slice(2)).toEqual(['    1 | \tтағ ном = 1;', '      | \t   ^']);
    const wide = formatDiagnostic(
      {
        code: 'X',
        severity: 'error',
        message: 'm',
        line: 10,
        column: 1,
        length: 3,
        related: { line: 9, column: 2 },
      },
      { language: 'en', source: 'а\nа\nа\nа\nа\nа\nа\nа\nабв\nабв' }
    );
    expect(wide.split('\n').slice(2)).toEqual([
      '     9 | абв',
      '       |  ^',
      '    10 | абв',
      '       | ^^^',
    ]);
  });

  test('the last line of a failed compilation', () => {
    expect([1, 2, 5].map(n => formatFailure(n, 'tj'))).toEqual([
      'Барнома компайл нашуд: 1 хато.',
      'Барнома компайл нашуд: 2 хато.',
      'Барнома компайл нашуд: 5 хато.',
    ]);
    expect([1, 3, 7].map(n => formatFailure(n, 'ru'))).toEqual([
      'Программа не скомпилирована: 1 ошибка.',
      'Программа не скомпилирована: 3 ошибки.',
      'Программа не скомпилирована: 7 ошибок.',
    ]);
    expect([1, 2].map(n => formatFailure(n, 'en'))).toEqual([
      'The program did not compile: 1 error.',
      'The program did not compile: 2 errors.',
    ]);
  });

  test('parameters as text', () => {
    expect([text(undefined), text(['а', 'б']), text(3)]).toEqual(['', 'а, б', '3']);
  });
});

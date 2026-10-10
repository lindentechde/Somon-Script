/**
 * somon fmt on rarer layouts: comments inside one-line object types, type
 * arguments and comparisons at the end of a file, `вагарна` alone on its
 * line, and `интизор (…)` that is not the head of a loop.
 */
import { format } from '../src/tools/format';

describe('format: rarer layouts', () => {
  test('a comment before the `}` of a one-line object type: no `;` is added', () => {
    const source = 'тағ о: { а: рақам /* шарҳ */ } = { а: 1 };\n';
    expect(format(source)).toBe(source);
  });

  test('a line comment after the last member: the `;` goes before it', () => {
    expect(format('тағ о: {\n    а: рақам // шарҳ\n} = { а: 1 };\n')).toBe(
      'тағ о: {\n    а: рақам; // шарҳ\n} = { а: 1 };\n'
    );
  });

  test('type arguments and a comparison that end the file', () => {
    expect(format('тағ х = ф<рақам>')).toBe('тағ х = ф<рақам>;\n');
    expect(format('тағ в = а < б')).toBe('тағ в = а < б;\n');
  });

  test('a `<` followed by a long expression is a comparison', () => {
    // The search for the closing `>` of type arguments gives up after 100 tokens
    const source = `тағ х = а < о${'.б'.repeat(60)};\n`;
    expect(format(source.replace(' < ', '<'))).toBe(source);
  });

  test('`вагарна` on its own line: the body under it goes one level deeper', () => {
    expect(format('агар (а) б();\nвагарна\nв();\n')).toBe('агар (а) б();\nвагарна\n    в();\n');
  });

  test('`барои await (…)` is a loop head; `бозгашт интизор (…)` is not', () => {
    expect(
      format(
        'ҳамзамон функсия ф(х: ҳар) {\nбарои await (собит у аз [1]) { чоп.сабт(у); }\nбозгашт интизор (х);\n}\n'
      )
    ).toBe(
      'ҳамзамон функсия ф(х: ҳар) {\n    барои await (собит у аз [1]) { чоп.сабт(у); }\n    бозгашт интизор (х);\n}\n'
    );
  });
});

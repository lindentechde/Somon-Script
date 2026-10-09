import { detectEnvLanguage, detectLanguage, type Translations } from '../src/cli/i18n';
import en from '../src/cli/i18n/translations/en';
import ru from '../src/cli/i18n/translations/ru';
import tj from '../src/cli/i18n/translations/tj';

/** Flatten a translation table into `path: kind` entries (functions keep their arity). */
function shape(value: unknown, prefix = ''): string[] {
  if (typeof value === 'function') return [`${prefix}: function/${value.length}`];
  if (typeof value === 'object' && value !== null) {
    return Object.entries(value).flatMap(([key, child]) =>
      shape(child, prefix ? `${prefix}.${key}` : key)
    );
  }
  return [`${prefix}: ${typeof value}`];
}

describe('CLI translations', () => {
  test.each([
    ['ru', ru],
    ['tj', tj],
  ])('%s has exactly the same keys as en', (_lang, translations: Translations) => {
    expect(shape(translations).sort()).toEqual(shape(en).sort());
  });

  test('no translation string is empty', () => {
    for (const translations of [en, ru, tj]) {
      for (const entry of shape(translations)) {
        expect(entry).toMatch(/: (string|function\/\d)$/);
      }
      const strings: string[] = [];
      const collect = (value: unknown): void => {
        if (typeof value === 'string') strings.push(value);
        else if (typeof value === 'object' && value !== null) Object.values(value).forEach(collect);
      };
      collect(translations);
      expect(strings.every(s => s.trim().length > 0)).toBe(true);
    }
  });
});

describe('detectLanguage', () => {
  test.each([
    [['--lang', 'ru', 'compile', 'x.som'], {}, 'ru'],
    [['--lang=tj', 'compile'], {}, 'tj'],
    [['compile', 'x.som', '--lang', 'en'], { LANG: 'ru_RU.UTF-8' }, 'en'],
    [['--lang', 'ru', '--lang=tj'], {}, 'tj'],
    [['run', 'x.som', '--', '--lang', 'ru'], {}, 'en'],
    [['run', 'x.som', '--', '--lang', 'xx'], { LANG: 'tg_TJ' }, 'tj'],
    [['compile'], { LANG: 'ru_RU.UTF-8' }, 'ru'],
  ] as const)('%j with %j → %s', (argv, env, expected) => {
    expect(detectLanguage(argv, env)).toBe(expected);
  });

  test('rejects an unsupported --lang value', () => {
    expect(() => detectLanguage(['--lang', 'xx'], {})).toThrow(/'xx'/);
    expect(() => detectLanguage(['--lang=de'], {})).toThrow(/'de'/);
  });

  test('error message uses the environment language', () => {
    expect(() => detectLanguage(['--lang', 'xx'], { LANG: 'ru_RU.UTF-8' })).toThrow(
      ru.common.invalidLanguage('xx')
    );
  });
});

describe('detectEnvLanguage', () => {
  test.each([
    [{}, 'en'],
    [{ LANG: 'ru_RU.UTF-8' }, 'ru'],
    [{ LANG: 'tg_TJ.UTF-8' }, 'tj'],
    [{ LANG: 'tj' }, 'tj'],
    [{ LANG: 'ru' }, 'ru'],
    [{ LANG: 'RU_ru' }, 'ru'],
    [{ LANG: 'ru@latin' }, 'ru'],
    // Anchored matching: 'ru' or 'tg' elsewhere in the value does not count.
    [{ LANG: 'true' }, 'en'],
    [{ LANG: 'en_US.UTF-8@tgt' }, 'en'],
    [{ LANG: 'C' }, 'en'],
    // POSIX precedence: LC_ALL > LC_MESSAGES > LANG; empty values are ignored.
    [{ LANG: 'en_US', LC_MESSAGES: 'ru_RU' }, 'ru'],
    [{ LANG: 'ru_RU', LC_MESSAGES: 'en_US' }, 'en'],
    [{ LC_MESSAGES: 'en_US', LC_ALL: 'tg_TJ' }, 'tj'],
    [{ LANG: 'ru_RU', LC_ALL: '' }, 'ru'],
    // SOMON_LANG overrides the locale.
    [{ LC_ALL: 'ru_RU', SOMON_LANG: 'en' }, 'en'],
    [{ LANG: 'en_US', SOMON_LANG: 'tj' }, 'tj'],
  ] as const)('%j → %s', (env, expected) => {
    expect(detectEnvLanguage(env)).toBe(expected);
  });
});

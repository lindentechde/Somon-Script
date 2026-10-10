/**
 * The CLI translations, generated from the translation objects so that keys
 * added later are covered too: en, ru and tj have the same key tree, every
 * message is called in every language with arguments it must contain, and
 * Russian and Tajik are actually translated. Also the language selection.
 */
import { detectEnvLanguage, detectLanguage, i18n, LANGUAGES, t } from '../src/cli/i18n';
import type { Language, Translations } from '../src/cli/i18n';
import en from '../src/cli/i18n/translations/en';
import ru from '../src/cli/i18n/translations/ru';
import tj from '../src/cli/i18n/translations/tj';

const translations: Record<Language, Translations> = { en, ru, tj };

type Leaf = string | ((...args: Array<string | number>) => string);

/** Every leaf of a translation table with its dotted key. */
function leaves(value: unknown, prefix = ''): Array<[string, Leaf]> {
  if (typeof value === 'string' || typeof value === 'function') return [[prefix, value as Leaf]];
  return Object.entries(value as object).flatMap(([key, child]) =>
    leaves(child, prefix ? `${prefix}.${key}` : key)
  );
}

const leafAt = (table: Translations, key: string): Leaf =>
  key.split('.').reduce<any>((node, part) => node[part], table);

/** Names of a message function's parameters, from its source. */
function parameterNames(message: (...args: never[]) => string): string[] {
  const match = /^\s*(?:\(([^)]*)\)|([\p{L}_$][\p{L}\p{N}_$]*))\s*=>/u.exec(message.toString());
  if (!match) throw new Error(`cannot read the parameters of ${message.toString()}`);
  const list = match[1] ?? match[2];
  return list
    .split(',')
    .map(name => name.trim().replace(/:.*$/, ''))
    .filter(Boolean);
}

/** Parameters that hold counts; all others are names, paths or values. */
const NUMERIC = new Set(['count', 'files', 'errors', 'changed', 'total', 'warnings']);

/** Distinct arguments: counts as numbers, the rest as Cyrillic paths. */
function sampleArguments(message: (...args: never[]) => string): Array<string | number> {
  return parameterNames(message).map((name, index) =>
    NUMERIC.has(name) ? 1000 + index * 7 : `лоиҳа/файл-${index}.som`
  );
}

/** Leaves that are the same in every language, and why. */
const UNTRANSLATED: Record<string, string> = {
  // Only the file name and a colon
  'commands.check.messages.fileErrors': 'no words',
  // The command is named after the protocol, Language Server Protocol, everywhere
  'commands.lsp.name': 'abbreviation',
};

const english = leaves(en);

describe('translation tables', () => {
  test('LANGUAGES lists exactly the translated languages', () => {
    expect([...LANGUAGES].sort()).toEqual(Object.keys(translations).sort());
  });

  test.each(['ru', 'tj'] as const)('%s has the key tree of en, with the same kinds', lang => {
    const kinds = (table: Translations) =>
      leaves(table).map(([key, leaf]) =>
        typeof leaf === 'function' ? `${key}(${parameterNames(leaf).length})` : key
      );
    expect(kinds(translations[lang])).toEqual(kinds(en));
  });

  test('there are messages to check', () => {
    expect(english.length).toBeGreaterThan(150);
    expect(english.filter(([, leaf]) => typeof leaf === 'function').length).toBeGreaterThan(35);
  });
});

describe.each(LANGUAGES.map(lang => [lang]))('%s', lang => {
  const table = translations[lang];

  test.each(english.filter(([, leaf]) => typeof leaf === 'string').map(([key]) => [key]))(
    '%s is a non-empty string',
    key => {
      const text = leafAt(table, key);
      expect(typeof text).toBe('string');
      expect((text as string).trim()).not.toBe('');
      expect(text).not.toMatch(/\$\{|undefined|\[object /);
    }
  );

  test.each(english.filter(([, leaf]) => typeof leaf === 'function').map(([key]) => [key]))(
    '%s returns a text that contains its arguments',
    key => {
      const message = leafAt(table, key) as (...args: Array<string | number>) => string;
      const args = sampleArguments(message);
      expect(args).toHaveLength(message.length);
      const text = message(...args);
      expect(typeof text).toBe('string');
      expect(text.trim()).not.toBe('');
      for (const arg of args) expect(text).toContain(String(arg));
      expect(text).not.toMatch(/\$\{|undefined|\[object |NaN/);
    }
  );
});

describe.each(['ru', 'tj'] as const)('%s is translated', lang => {
  const table = translations[lang];
  const render = (leaf: Leaf): string =>
    typeof leaf === 'function' ? leaf(...sampleArguments(leaf)) : leaf;

  test.each(english.map(([key]) => [key]))('%s', key => {
    const text = render(leafAt(table, key));
    const original = render(leafAt(en, key));
    if (key in UNTRANSLATED) expect(text).toBe(original);
    else expect(text).not.toBe(original);
  });
});

describe.each(LANGUAGES.map(lang => [lang]))('commands in %s', lang => {
  const commands = translations[lang].commands;

  test('names and aliases do not clash with each other or with English names', () => {
    const englishNames = Object.values(en.commands).flatMap(command =>
      'name' in command ? [command.name] : []
    );
    const owners = new Map<string, string>();
    for (const [key, command] of Object.entries(commands)) {
      if (!('name' in command)) continue;
      const own = [command.name, 'alias' in command ? command.alias : undefined];
      for (const name of own.filter((n): n is string => n !== undefined)) {
        const english = (en.commands as Record<string, { name?: string }>)[key].name;
        if (name !== english) expect(englishNames).not.toContain(name);
        expect(owners.get(name) ?? key).toBe(key);
        owners.set(name, key);
        expect(name).toMatch(/^[\p{Ll}\p{N}-]+$/u);
      }
    }
  });
});

describe('the active language', () => {
  afterEach(() => i18n.setLanguage('en'));

  test.each(LANGUAGES.map(lang => [lang]))('setLanguage(%s) selects its table', lang => {
    i18n.setLanguage(lang);
    expect(i18n.getLanguage()).toBe(lang);
    expect(t()).toBe(translations[lang]);
  });

  test('the initial language comes from the environment', () => {
    jest.isolateModules(() => {
      const previous = process.env.SOMON_LANG;
      process.env.SOMON_LANG = 'tj';
      try {
        const fresh = require('../src/cli/i18n') as typeof import('../src/cli/i18n');
        expect(fresh.i18n.getLanguage()).toBe('tj');
        expect(fresh.t().commands.compile.name).toBe('компайл');
      } finally {
        if (previous === undefined) delete process.env.SOMON_LANG;
        else process.env.SOMON_LANG = previous;
      }
    });
  });
});

describe('language detection', () => {
  test.each([
    // POSIX locale names
    [{ LANG: 'ru_RU.UTF-8' }, 'ru'],
    [{ LANG: 'ru_UA' }, 'ru'],
    [{ LANG: 'tg_TJ.UTF-8' }, 'tj'],
    [{ LANG: 'tg' }, 'tj'],
    [{ LANG: 'TJ' }, 'tj'],
    [{ LANG: 'tg-TJ' }, 'tj'],
    [{ LANG: 'en_US.UTF-8' }, 'en'],
    [{ LANG: 'de_DE.UTF-8' }, 'en'],
    [{ LANG: 'C.UTF-8' }, 'en'],
    [{ LANG: 'POSIX' }, 'en'],
    [{ LANG: 'russian' }, 'en'],
    // LC_ALL overrides LANG and LC_MESSAGES, even with C
    [{ LANG: 'ru_RU.UTF-8', LC_ALL: 'C' }, 'en'],
    [{ LANG: 'en_US.UTF-8', LC_ALL: 'tg_TJ' }, 'tj'],
    [{ LC_MESSAGES: 'ru_RU', LC_ALL: 'en_GB' }, 'en'],
    [{ LANG: 'tg_TJ', LC_MESSAGES: 'ru_RU' }, 'ru'],
    // Empty values are unset
    [{ LANG: 'tg_TJ', LC_ALL: '', LC_MESSAGES: '' }, 'tj'],
    [{ SOMON_LANG: '', LANG: 'ru_RU' }, 'ru'],
    // SOMON_LANG wins over the locale
    [{ SOMON_LANG: 'ru', LC_ALL: 'tg_TJ' }, 'ru'],
    [{ SOMON_LANG: 'en', LANG: 'ru_RU' }, 'en'],
  ] as const)('environment %j → %s', (env, expected) => {
    expect(detectEnvLanguage(env)).toBe(expected);
    expect(detectLanguage([], env)).toBe(expected);
  });

  test.each([
    [['--lang', 'tj'], { LANG: 'ru_RU' }, 'tj'],
    [['compile', 'x.som', '--lang=ru'], { LC_ALL: 'tg_TJ' }, 'ru'],
    [['--lang', 'en', '--lang', 'ru'], {}, 'ru'],
    // A trailing --lang without a value is left to commander
    [['compile', '--lang'], { LANG: 'tg_TJ' }, 'tj'],
    // Arguments after -- belong to the program
    [['run', 'x.som', '--', '--lang=ru'], { LANG: 'tg_TJ' }, 'tj'],
  ] as const)('arguments %j with %j → %s', (argv, env, expected) => {
    expect(detectLanguage(argv, env)).toBe(expected);
  });

  test.each([
    [['--lang', 'de'], {}, en.common.invalidLanguage('de')],
    [['--lang='], { LANG: 'ru_RU' }, ru.common.invalidLanguage('')],
    [['--lang', 'RU'], { LANG: 'tg_TJ' }, tj.common.invalidLanguage('RU')],
  ] as const)('arguments %j are rejected in the language of %j', (argv, env, message) => {
    expect(() => detectLanguage(argv, env)).toThrow(message);
  });
});

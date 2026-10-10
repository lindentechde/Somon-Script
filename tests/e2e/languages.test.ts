/**
 * End to end: the same mistakes made with the built CLI in English, Russian
 * and Tajik, selected with --lang or from the locale. Every message must be
 * the one of the language's translation table, with the same exit codes.
 */
import * as fs from 'fs';
import * as path from 'path';

import type { Language, Translations } from '../../src/cli/i18n';
import en from '../../src/cli/i18n/translations/en';
import ru from '../../src/cli/i18n/translations/ru';
import tj from '../../src/cli/i18n/translations/tj';
import { buildCliOnce, canonicalTmpDir } from '../helpers/paths';
import { somon, type ProcessOptions } from '../helpers/cli-process';

jest.setTimeout(120000);

const translations: Record<Language, Translations> = { en, ru, tj };

/** The TypeScript checker's message for `тағ н: рақам = "н";` in each language. */
const NOT_ASSIGNABLE: Record<Language, string> = {
  en: "Type 'сатр' is not assignable to type 'рақам'.",
  ru: 'Тип "сатр" не может быть назначен для типа "рақам".',
  tj: "Навъи 'сатр' ба навъи 'рақам' мувофиқ нест.",
};

/** A locale that selects the language without --lang. */
const LOCALE: Record<Language, string> = {
  en: 'en_US.UTF-8',
  ru: 'ru_RU.UTF-8',
  tj: 'tg_TJ.UTF-8',
};

let root: string;

beforeAll(() => {
  buildCliOnce();
  root = canonicalTmpDir('somon-e2e-languages-');
});

afterAll(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

describe.each(['en', 'ru', 'tj'] as const)('%s', lang => {
  const tr = translations[lang];
  const messages = tr.commands;
  let dir: string;

  beforeAll(() => {
    dir = path.join(root, lang);
    const files: Record<string, string> = {
      'ok.som': 'чоп.сабт(1);\n',
      'typed.som': 'тағ н: рақам = "н";\n',
      'ugly.som': 'тағ а=1\n',
      'existing/keep.txt': '',
      'config/somon.config.json': JSON.stringify({ compilerOptions: { strict: 'yes' } }),
      'config/a.som': 'чоп.сабт(1);\n',
    };
    for (const [name, text] of Object.entries(files)) {
      fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
      fs.writeFileSync(path.join(dir, name), text);
    }
  });

  /** The CLI in this language: with --lang, or from the locale when `byLocale` is set. */
  const cli = (args: string[], byLocale = false) => {
    const options: ProcessOptions = { cwd: dir };
    if (byLocale) return somon(args, { ...options, env: { LANG: LOCALE[lang] } });
    return somon(['--lang', lang, ...args], options);
  };

  test('reports the same errors in its own words', async () => {
    const [missing, typeError, check, existing, config, fmt, same, localeMissing] =
      await Promise.all([
        cli(['compile', 'missing.som']),
        cli(['compile', 'typed.som']),
        cli(['check', 'typed.som']),
        cli(['init', 'existing']),
        cli(['compile', path.join('config', 'a.som')]),
        cli(['fmt', '--check', 'ugly.som']),
        cli(['compile', 'ok.som', '-o', 'ok.som']),
        cli(['compile', 'missing.som'], true),
      ]);

    expect(missing).toMatchObject({
      status: 1,
      stdout: '',
      stderr: `${messages.compile.messages.fileNotFound('missing.som')}\n`,
    });
    expect(localeMissing).toEqual(missing);

    expect(typeError.status).toBe(1);
    expect(typeError.stderr.split('\n')[0]).toBe(messages.compile.messages.compilationErrors);
    expect(fs.existsSync(path.join(dir, 'typed.js'))).toBe(false);

    expect(check).toMatchObject({
      status: 1,
      stderr:
        `typed.som:\n  Type error [TS2322] at line 1, column 5: ${NOT_ASSIGNABLE[lang]}\n` +
        `  > тағ н: рақам = "н";\n${messages.check.messages.errorsFound(1, 1)}\n`,
    });

    expect(existing).toMatchObject({
      status: 1,
      stderr: `${messages.init.messages.directoryExists('existing')}\n`,
    });

    expect(config.status).toBe(1);
    expect(config.stderr.split('\n')).toEqual([
      tr.common.configError,
      `  Invalid configuration in ${path.join(dir, 'config', 'somon.config.json')}`,
      '  compilerOptions.strict: must be a boolean',
      '',
    ]);

    expect(fmt).toMatchObject({
      status: 1,
      stdout: `${messages.fmt.messages.wouldReformat('ugly.som')}\n`,
      stderr: `${messages.fmt.messages.checkFailed(1)}\n`,
    });

    expect(same).toMatchObject({ status: 1, stderr: `${tr.common.outputEqualsInput('ok.som')}\n` });
  });

  test('succeeds under its own command names and says so in its own words', async () => {
    const compileName = messages.compile.name;
    const [byName, byAlias, check, help, unsupported] = await Promise.all([
      cli([compileName, 'ok.som', '-o', 'by-name.js']),
      cli([messages.compile.alias, 'ok.som', '-o', 'by-alias.js'], true),
      cli([messages.check.name, 'ok.som', '--checker', 'somon']),
      cli(['--help'], true),
      cli(['--lang', 'xx', 'compile', 'ok.som'], true),
    ]);
    expect(byName).toMatchObject({
      status: 0,
      stdout: `${messages.compile.messages.compiled('ok.som', 'by-name.js')}\n`,
    });
    expect(byAlias.stdout).toBe(`${messages.compile.messages.compiled('ok.som', 'by-alias.js')}\n`);
    expect(check).toMatchObject({ status: 0, stdout: `${messages.check.messages.noErrors(1)}\n` });
    const helpText = help.stdout.replace(/\s+/g, ' ');
    expect(helpText).toContain(messages.somon.description);
    expect(helpText).toContain(messages.compile.description);
    // An unsupported --lang is reported in the language of the locale
    expect(unsupported).toMatchObject({
      status: 1,
      stdout: '',
      stderr: `${tr.common.invalidLanguage('xx')}\n`,
    });
  });
});

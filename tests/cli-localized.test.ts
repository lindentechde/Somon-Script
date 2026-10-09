import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { buildCliOnce, canonicalTmpDir } from './helpers/paths';
import en from '../src/cli/i18n/translations/en';
import ru from '../src/cli/i18n/translations/ru';
import tj from '../src/cli/i18n/translations/tj';

/**
 * Spawn-based tests for the localized CLI: every command must work under its
 * English name and under its Russian/Tajik name and alias, whatever the locale.
 */
describe('CLI localization (spawned)', () => {
  let cliPath: string;
  let tempDir: string;

  // Locale variables are cleared so the developer's environment cannot leak in.
  const baseEnv = (): Record<string, string | undefined> => {
    const env = { ...process.env };
    for (const key of ['SOMON_LANG', 'LC_ALL', 'LC_MESSAGES', 'LANG']) {
      delete env[key];
    }
    return env;
  };

  const cli = (args: string[], env: Record<string, string | undefined> = {}) => {
    const result = spawnSync(process.execPath, [cliPath, ...args], {
      cwd: tempDir,
      encoding: 'utf-8',
      env: { ...baseEnv(), ...env },
    });
    return { status: result.status, stdout: result.stdout, stderr: result.stderr };
  };

  beforeAll(() => {
    cliPath = buildCliOnce();
  });

  beforeEach(() => {
    tempDir = canonicalTmpDir('somon-cli-localized-');
    fs.writeFileSync(path.join(tempDir, 'util.som'), 'содир собит қимат = 21;');
    fs.writeFileSync(
      path.join(tempDir, 'main.som'),
      'ворид { қимат } аз "./util";\nчоп.сабт(қимат * 2);\nчоп.сабт(process.argv.slice(2).join(","));'
    );
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  const translations = { en, ru, tj } as const;

  describe.each(['en', 'ru', 'tj'] as const)('--lang %s', lang => {
    const tr = translations[lang].commands;
    const names = (english: string, key: keyof typeof tr): string[] => {
      const entry = tr[key] as { name: string; alias?: string };
      return [...new Set([english, entry.name, entry.alias].filter((n): n is string => !!n))];
    };

    test.each(names('compile', 'compile'))('compile as %s honours its options', name => {
      const out = `out-${Buffer.from(name).toString('hex')}.js`;
      const result = cli(['--lang', lang, name, 'util.som', '-o', out, '--target', 'es5']);
      expect(result.stderr).toBe('');
      expect(result.status).toBe(0);
      expect(fs.readFileSync(path.join(tempDir, out), 'utf-8')).toContain('var қимат = 21');
    });

    test.each(names('run', 'run'))('run as %s executes the program', name => {
      const result = cli(['--lang', lang, name, 'main.som', 'a', '--', '--b']);
      expect(result.stderr).toBe('');
      expect(result.status).toBe(0);
      expect(result.stdout.split('\n')).toEqual(['42', 'a,--b', '']);
    });

    test.each(names('bundle', 'bundle'))('bundle as %s writes the bundle', name => {
      const out = `bundle-${Buffer.from(name).toString('hex')}.js`;
      const result = cli(['--lang', lang, name, 'main.som', '-o', out, '--minify']);
      expect(result.status).toBe(0);
      expect(result.stdout).toContain(tr.bundle.messages.bundleCreated(path.join(tempDir, out)));
      const run = spawnSync(process.execPath, [path.join(tempDir, out)], { encoding: 'utf-8' });
      expect(run.stdout.split('\n')[0]).toBe('42');
    });

    test.each(names('module-info', 'moduleInfo'))('module-info as %s prints statistics', name => {
      const result = cli(['--lang', lang, name, 'main.som', '--stats']);
      expect(result.status).toBe(0);
      expect(result.stdout).toContain(tr.moduleInfo.messages.analyzing('main.som'));
      expect(result.stdout).toContain(`${tr.moduleInfo.messages.totalModules} 2`);
    });

    test.each(names('resolve', 'resolve'))('resolve as %s resolves a specifier', name => {
      const result = cli(['--lang', lang, name, './util', '--from', 'main.som']);
      expect(result.status).toBe(0);
      expect(result.stdout).toContain(tr.resolve.messages.resolved('./util'));
      expect(result.stdout).toContain(path.join(tempDir, 'util.som'));
    });

    test.each(names('init', 'init'))('init as %s creates a project', name => {
      const project = `p-${Buffer.from(name).toString('hex')}`;
      const result = cli(['--lang', lang, name, project]);
      expect(result.status).toBe(0);
      expect(result.stdout).toContain(tr.init.messages.projectCreated(project));
      expect(fs.existsSync(path.join(tempDir, project, 'src', 'main.som'))).toBe(true);
    });

    test('help lists the commands with localized descriptions', () => {
      const result = cli(['--lang', lang, '--help']);
      expect(result.status).toBe(0);
      expect(result.stdout).toContain(tr.compile.description);
      expect(result.stdout).toContain(tr.run.description);
    });
  });

  describe('language selection', () => {
    test('--lang=ru form is honoured', () => {
      const result = cli(['--lang=ru', '--help']);
      expect(result.stdout).toContain(ru.commands.compile.description);
    });

    test.each([
      [{ LANG: 'ru_RU.UTF-8' }, ru],
      [{ LANG: 'tg_TJ.UTF-8' }, tj],
      [{ LANG: 'en_US.UTF-8', LC_ALL: 'ru_RU.UTF-8' }, ru],
      [{ LANG: 'ru_RU.UTF-8', LC_MESSAGES: 'en_US.UTF-8' }, en],
      [{ LANG: 'ru_RU.UTF-8', SOMON_LANG: 'tj' }, tj],
      [{ LANG: 'true_LIES' }, en],
    ])('environment %o selects the expected language', (env, expected) => {
      const result = cli(['--help'], env);
      expect(result.stdout).toContain(expected.commands.compile.description);
    });

    test('English command names work under a Russian or Tajik locale', () => {
      expect(cli(['run', 'main.som'], { LANG: 'ru_RU.UTF-8' }).stdout).toContain('42');
      expect(cli(['compile', 'util.som', '-o', 'x.js'], { LANG: 'tg_TJ.UTF-8' }).status).toBe(0);
    });

    test('an unsupported --lang value is an error', () => {
      const result = cli(['--lang', 'xx', '--help']);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("'xx'");
      expect(cli(['--lang=xx', 'compile', 'util.som']).status).toBe(1);
    });

    test('--lang after -- belongs to the program, not the CLI', () => {
      const result = cli(['run', 'main.som', '--', '--lang', 'xx']);
      expect(result.status).toBe(0);
      expect(result.stdout).toContain('--lang,xx');
    });

    test('messages use the selected language', () => {
      const result = cli(['--lang', 'tj', 'compile', 'missing.som']);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain(tj.commands.compile.messages.fileNotFound('missing.som'));
    });
  });
});

/**
 * End to end: multi-module programs through the built CLI. `somon run` and
 * `somon bundle` of programs that import Node.js modules, packages, local
 * JavaScript, JSON and directories; bundle errors in English, Russian and
 * Tajik; `somon resolve` of a package subpath.
 */
import * as fs from 'fs';
import * as path from 'path';

import type { Language, Translations } from '../../src/cli/i18n';
import en from '../../src/cli/i18n/translations/en';
import ru from '../../src/cli/i18n/translations/ru';
import tj from '../../src/cli/i18n/translations/tj';
import { node, somon } from '../helpers/cli-process';
import { createTempProject, type TempProject } from '../helpers/module-project';

jest.setTimeout(120000);

const translations: Record<Language, Translations> = { en, ru, tj };

let project: TempProject;

beforeAll(() => {
  project = createTempProject('somon-e2e-modules-cli-');
  project.write({
    'node_modules/greeter/package.json': JSON.stringify({
      name: 'greeter',
      exports: { '.': './index.js', './loud': './loud.js' },
    }),
    'node_modules/greeter/index.js': "exports.салом = н => 'салом, ' + н;\n",
    'node_modules/greeter/loud.js': 'exports.баланд = с => с.toUpperCase();\n',
    'src/lib/index.som': 'содир функсия дучанд(х: рақам): рақам { бозгашт х * 2; }\n',
    'src/data.json': '{ "ном": "ҷаҳон" }\n',
    'src/helper.js':
      "const os = require('os');\nexports.сатрҳо = text => text.split(os.EOL).length;\n",
    'src/main.som': [
      'ворид { салом } аз "greeter";',
      'ворид { баланд } аз "greeter/loud";',
      'ворид { join } аз "node:path";',
      'ворид { дучанд } аз "./lib";',
      'ворид { ном } аз "./data";',
      'ворид { сатрҳо } аз "./helper";',
      'чоп.сабт(баланд(салом(ном)), дучанд(21), join("а", "б").дарозӣ, сатрҳо("x"));',
    ].join('\n'),
    'src/broken.som': 'ворид { х } аз "./lib";\nтағ н: рақам = "сатр";\n',
  });
});

afterAll(() => project.remove());

const EXPECTED = 'САЛОМ, ҶАҲОН 42 3 1';

describe('somon run and somon bundle of a program with every kind of import', () => {
  test('run', async () => {
    const result = await somon(['run', 'src/main.som'], { cwd: project.root });
    expect(result.stderr).toBe('');
    expect(result).toMatchObject({ status: 0, stdout: `${EXPECTED}\n` });
  });

  test('bundle: commonjs, minified with a source map, and esm, run from dist/', async () => {
    const [commonjs, esm] = await Promise.all([
      somon(['bundle', 'src/main.som', '-o', 'dist/app.js', '--minify', '--source-map'], {
        cwd: project.root,
      }),
      somon(['bundle', 'src/main.som', '-f', 'esm', '-o', 'dist/app.mjs'], { cwd: project.root }),
    ]);
    for (const result of [commonjs, esm]) {
      expect(result.stderr).toBe('');
      expect(result.status).toBe(0);
      expect(result.stdout).toContain('✅ Bundle created: ');
    }
    const map = JSON.parse(fs.readFileSync(project.file('dist/app.js.map'), 'utf8'));
    expect(map.sources).toEqual(
      expect.arrayContaining(['../src/main.som', '../src/lib/index.som'])
    );

    for (const bundle of ['dist/app.js', 'dist/app.mjs']) {
      const run = await node([project.file(bundle)], { cwd: project.root });
      expect(run).toMatchObject({ status: 0, stdout: `${EXPECTED}\n`, stderr: '' });
    }
    expect(fs.readFileSync(project.file('dist/app.mjs'), 'utf8')).toMatch(
      /^import \* as __somonImport\d from "greeter\/loud";$/m
    );
  });

  test('an iife bundle refuses the modules it would load at run time', async () => {
    const result = await somon(['bundle', 'src/main.som', '-f', 'iife', '-o', 'dist/app.iife.js'], {
      cwd: project.root,
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "An iife bundle runs without a module loader, but it needs 'os', 'greeter', 'greeter/loud', 'node:path'."
    );
    expect(fs.existsSync(project.file('dist/app.iife.js'))).toBe(false);
  });

  test('resolve names the package of a subpath', async () => {
    const result = await somon(['resolve', 'greeter/loud', '--from', 'src/main.som'], {
      cwd: project.root,
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain(
      `  Path: ${path.join(project.root, 'node_modules', 'greeter', 'loud.js')}`
    );
    expect(result.stdout).toContain('  Package: greeter\n');
  });
});

describe.each(['en', 'ru', 'tj'] as const)('bundle errors in %s', lang => {
  const tr = translations[lang];

  test('name each failing file with its position and keep the exit code', async () => {
    const result = await somon(['--lang', lang, 'bundle', 'src/broken.som', '--strict'], {
      cwd: project.root,
    });
    expect(result.status).toBe(1);
    expect(result.stdout).toContain(tr.commands.bundle.messages.bundling('src/broken.som'));
    if (lang === 'en') {
      expect(result.stderr.startsWith(`${tr.commands.bundle.messages.bundleError} `)).toBe(true);
      expect(result.stderr).toContain('Bundle process failed with 1 error(s):');
      expect(result.stderr).toContain(`${project.file('src/broken.som')}:2:16\n`);
      return;
    }
    // Russian and Tajik: the error with its line of code, the file relative to the current directory
    const where = path.join('src', 'broken.som');
    expect(result.stderr).toContain(
      lang === 'tj' ? `Хато дар ${where}, сатри 2:` : `Ошибка в ${where}, строка 2:`
    );
    expect(result.stderr).toContain(
      '    2 | тағ н: рақам = "сатр";\n      |                ^^^^^^'
    );
    expect(result.stderr).not.toContain('Bundle process failed');
  });
});

describe('the CLI around the module system', () => {
  // getStatistics().totalModules also counts the Node.js modules and packages the
  // bundle leaves to the run time (7 here); the CLI reports the bundle's own count.
  test('bundle counts the modules in the bundle', async () => {
    const result = await somon(['bundle', 'src/main.som', '-o', 'dist/count.js'], {
      cwd: project.root,
    });
    // main, lib/index, data.json and helper.js
    expect(result.stdout).toContain('📊 Bundled 4 modules');
  });

  // writeEsmModules() writes an entry `prog.txt` as `prog.txt.js`, which Node.js runs
  // as an ES module.
  test('run --module esm of an entry not named .som', async () => {
    project.write({ 'prog.txt': 'чоп.сабт("txt");\n' });
    const result = await somon(['run', 'prog.txt', '--module', 'esm'], { cwd: project.root });
    expect(result).toMatchObject({ status: 0, stdout: 'txt\n' });
  });
});

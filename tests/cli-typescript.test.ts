/**
 * The CLI's TypeScript backend: `somon check`, `--checker`, `--module esm`
 * (compile and run), `--declaration`, and the matching somon.config.json keys.
 */
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { buildCliOnce, canonicalTmpDir, getCliPath } from './helpers/paths';

jest.setTimeout(60000);

interface CliResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

function cli(args: string[], cwd: string): CliResult {
  const result = spawnSync(process.execPath, [getCliPath(), ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, SOMON_LANG: '', LC_ALL: '', LC_MESSAGES: '', LANG: '' },
  });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

describe('CLI: TypeScript backend', () => {
  let dir: string;

  beforeAll(() => {
    buildCliOnce();
  });

  beforeEach(() => {
    dir = canonicalTmpDir('somon-cli-ts-');
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  function write(name: string, text: string): string {
    const file = path.join(dir, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text);
    return file;
  }

  const MATH =
    'содир функсия ҷамъ(а: рақам, б: рақам): рақам { бозгашт а + б; }\n' +
    'содир пешфарз синф Ҳисоб { қимат: рақам = 7; }\n';

  describe('somon check', () => {
    test('a correct program', () => {
      write('math.som', MATH);
      write('main.som', 'ворид { ҷамъ } аз "./math";\nчоп.сабт(ҷамъ(1, 2));\n');
      const result = cli(['check', 'main.som', 'math.som'], dir);
      expect(result.status).toBe(0);
      expect(result.stdout).toContain('No type errors in 2 file(s)');
    });

    test('errors are listed per file and the exit code is 1', () => {
      write('math.som', MATH);
      write('a.som', 'ворид { ҷамъ } аз "./math";\nтағ с: сатр = ҷамъ(1, 2);\n');
      write('b.som', 'тағ н: рақам = "н";\n');
      const result = cli(['check', 'a.som', 'b.som', 'math.som'], dir);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain(
        "a.som:\n  Type error [TS2322] at line 2, column 5: Type 'рақам' is not assignable to type 'сатр'.\n  > тағ с: сатр = ҷамъ(1, 2);"
      );
      expect(result.stderr).toContain('b.som:\n  Type error [TS2322] at line 1, column 5');
      expect(result.stderr).toContain('Found 2 type error(s) in 2 file(s)');
    });

    test('messages follow --lang', () => {
      write('b.som', 'тағ н: рақам = "н";\n');
      const tajik = cli(['check', 'b.som', '--lang', 'tj'], dir);
      expect(tajik.stderr).toContain("Навъи 'сатр' ба навъи 'рақам' мувофиқ нест.");
      expect(tajik.stderr).toContain('Дар 1 файл 1 хатои навъ ёфт шуд');
      const russian = cli(['check', 'b.som', '--lang', 'ru'], dir);
      expect(russian.stderr).toContain('Тип "сатр" не может быть назначен для типа "рақам".');
      expect(russian.stderr).toContain('Найдено ошибок типов: 1 (файлов: 1)');
    });

    test('--strict turns on strict checks', () => {
      write('f.som', 'функсия ф(х) { бозгашт х; }\n');
      expect(cli(['check', 'f.som'], dir).status).toBe(0);
      const strict = cli(['check', 'f.som', '--strict'], dir);
      expect(strict.status).toBe(1);
      expect(strict.stderr).toContain('[TS7006]');
    });

    test('--checker somon uses the SomonScript checker', () => {
      write('b.som', 'тағ н: рақам = "н";\n');
      const result = cli(['check', 'b.som', '--checker', 'somon'], dir);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('Type error [TYPE_NOT_ASSIGNABLE]');
    });

    test('the config chooses the checker; the command line wins', () => {
      write('somon.config.json', JSON.stringify({ compilerOptions: { checker: 'somon' } }));
      write('b.som', 'тағ н: рақам = "н";\n');
      expect(cli(['check', 'b.som'], dir).stderr).toContain('[TYPE_NOT_ASSIGNABLE]');
      expect(cli(['check', 'b.som', '--checker', 'typescript'], dir).stderr).toContain('[TS2322]');
    });

    test('a missing file and a parse error are errors', () => {
      write('bad.som', 'тағ = ;\n');
      const result = cli(['check', 'missing.som', 'bad.som'], dir);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("Error: File 'missing.som' not found");
      expect(result.stderr).toContain('bad.som:\n  ');
    });

    test('the target selects the lib', () => {
      write('a.som', 'чоп.сабт([1, 2].findLast(х => х > 0));\n');
      expect(cli(['check', 'a.som'], dir).stderr).toContain('[TS2550]');
      expect(cli(['check', 'a.som', '--target', 'esnext'], dir).status).toBe(0);
      expect(cli(['check', 'a.som', '--lib', 'es2023,dom'], dir).status).toBe(0);
      write('somon.config.json', JSON.stringify({ compilerOptions: { lib: ['es2023', 'dom'] } }));
      expect(cli(['check', 'a.som'], dir).status).toBe(0);
    });

    test('parameter decorators need --experimental-decorators', () => {
      write(
        'a.som',
        'функсия д(ҳадаф: объект, ном: сатр | беқимат, ҷой: рақам): беджавоб {}\n' +
          'синф К { м(@д х: рақам): беджавоб {} }\n'
      );
      expect(cli(['check', 'a.som'], dir).stderr).toContain('[TS1206]');
      expect(cli(['check', 'a.som', '--experimental-decorators'], dir).status).toBe(0);
    });
  });

  describe('somon compile', () => {
    test('--declaration writes a .d.ts next to the JavaScript', () => {
      write('math.som', MATH);
      const result = cli(['compile', 'math.som', '--declaration'], dir);
      expect(result.status).toBe(0);
      expect(result.stdout).toContain("Generated declarations: 'math.d.ts'");
      expect(fs.readFileSync(path.join(dir, 'math.d.ts'), 'utf8')).toBe(
        'export declare function ҷамъ(а: number, б: number): number;\n' +
          'export default class Ҳисоб {\n    қимат: number;\n}\n'
      );
      const out = cli(['compile', 'math.som', '--declaration', '-o', 'out/m.js'], dir);
      expect(out.status).toBe(0);
      expect(fs.existsSync(path.join(dir, 'out', 'm.d.ts'))).toBe(true);
    });

    test('the declaration config key', () => {
      write('somon.config.json', JSON.stringify({ compilerOptions: { declaration: true } }));
      write('math.som', MATH);
      expect(cli(['compile', 'math.som'], dir).status).toBe(0);
      expect(fs.existsSync(path.join(dir, 'math.d.ts'))).toBe(true);
    });

    test('--module esm writes an ES module', () => {
      write('main.som', 'ворид { ҷамъ } аз "./math";\nсодир собит х = ҷамъ(1, 2);\n');
      write('math.som', MATH);
      expect(cli(['compile', 'main.som', '--module', 'esm'], dir).status).toBe(0);
      expect(fs.readFileSync(path.join(dir, 'main.js'), 'utf8')).toBe(
        'import { ҷамъ } from "./math.js";\nexport const х = ҷамъ(1, 2);'
      );
    });

    test('--checker typescript reports TypeScript errors', () => {
      write('b.som', 'тағ н: рақам = "н";\n');
      const result = cli(['compile', 'b.som', '--checker', 'typescript', '--lang', 'tj'], dir);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("[TS2322] at line 1, column 5: Навъи 'сатр'");
    });

    test('invalid option values are rejected', () => {
      write('b.som', 'тағ н = 1;\n');
      expect(cli(['compile', 'b.som', '--module', 'amd'], dir).status).not.toBe(0);
      expect(cli(['compile', 'b.som', '--checker', 'flow'], dir).status).not.toBe(0);
      write('somon.config.json', JSON.stringify({ compilerOptions: { module: 'amd' } }));
      const config = cli(['compile', 'b.som'], dir);
      expect(config.status).toBe(1);
      expect(config.stderr).toContain('compilerOptions.module: must be one of: commonjs, esm');
    });

    test('help lists the new options', () => {
      const help = cli(['compile', '--help'], dir).stdout;
      expect(help).toContain('--module <format>');
      expect(help).toContain('--checker <checker>');
      expect(help).toContain('--declaration');
      expect(cli(['--help'], dir).stdout).toMatch(/check\|санҷиш|check \[options\]/);
    });
  });

  describe('somon run', () => {
    test('--module esm runs ES modules with top-level await, import.meta and packages', () => {
      write('math.som', MATH);
      write(
        'node_modules/hisob/package.json',
        JSON.stringify({ name: 'hisob', version: '1.0.0', main: 'index.js' })
      );
      write('node_modules/hisob/index.js', 'exports.zarb = (a, b) => a * b;\n');
      write(
        'lib/util.som',
        'ворид { ҷамъ } аз "../math";\nсодир функсия ду(х: рақам): рақам { бозгашт ҷамъ(х, х); }\n'
      );
      write(
        'main.som',
        'ворид Ҳисоб, { ҷамъ } аз "./math";\nворид { ду } аз "./lib/util";\nворид { zarb } аз "hisob";\n' +
          'собит х = интизор Ваъда.resolve(40);\n' +
          'чоп.сабт(ҷамъ(х, 2), нав Ҳисоб().қимат, ду(3), zarb(2, 5), ворид.meta.url.endsWith("main.js"));\n' +
          'чоп.сабт(процесс_аргументҳо());\nфунксия процесс_аргументҳо(): сатр { бозгашт process.argv.slice(2).join(","); }\n'
      );
      const result = cli(['run', 'main.som', '--module', 'esm', '--', 'а', 'б'], dir);
      expect(result.stderr).toBe('');
      expect(result.stdout).toBe('42 7 6 10 true\nа,б\n');
      expect(result.status).toBe(0);
    });

    test('the module config key and source maps', () => {
      write('somon.config.json', JSON.stringify({ compilerOptions: { module: 'esm' } }));
      write('main.som', 'тағ х = интизор Ваъда.resolve(1);\nпартофтан нав Хато("бад " + х);\n');
      const result = cli(['run', 'main.som', '--source-map'], dir);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('бад 1');
      expect(result.stderr).toMatch(/main\.som:2/);
    });

    test('ES module compile errors are reported', () => {
      write('main.som', 'ворид { х } аз "./нест";\n');
      const result = cli(['run', 'main.som', '--module', 'esm'], dir);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('Compilation failed with 1 error(s)');
    });

    test('top-level await in CommonJS output is an error', () => {
      write('main.som', 'тағ х = интизор Ваъда.resolve(1);\n');
      const result = cli(['run', 'main.som'], dir);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("Top-level 'интизор' (await) is only allowed in ES modules");
    });

    test('--checker typescript checks every module of the program', () => {
      write('math.som', MATH);
      write('main.som', 'ворид { ҷамъ } аз "./math";\nтағ н: рақам = ҷамъ(1, 2);\nчоп.сабт(н);\n');
      const ok = cli(['run', 'main.som', '--checker', 'typescript', '--strict'], dir);
      expect(ok.stdout).toBe('3\n');
      write('main.som', 'ворид { ҷамъ } аз "./math";\nтағ с: сатр = ҷамъ(1, 2);\nчоп.сабт(с);\n');
      // As with the SomonScript checker, `run` stops at type errors
      const wrong = cli(['run', 'main.som', '--checker', 'typescript'], dir);
      expect(wrong.status).toBe(1);
      expect(wrong.stderr).toContain('[TS2322] at line 2, column 5');
      const esm = cli(['run', 'main.som', '--checker', 'typescript', '--module', 'esm'], dir);
      expect(esm.status).toBe(1);
      expect(esm.stderr).toContain('[TS2322] at line 2, column 5');
    });

    test('an esm project bundles to an ES module; its modules stay CommonJS inside', () => {
      write('somon.config.json', JSON.stringify({ compilerOptions: { module: 'esm' } }));
      write('math.som', MATH);
      write('main.som', 'ворид { ҷамъ } аз "./math";\nсодир собит н = ҷамъ(1, 2);\nчоп.сабт(н);\n');
      const result = cli(['bundle', 'main.som', '-o', 'out.mjs'], dir);
      expect(result.status).toBe(0);
      const bundle = fs.readFileSync(path.join(dir, 'out.mjs'), 'utf8');
      // The module table holds CommonJS modules; the bundle exports the entry's exports
      expect(bundle).toContain('module.exports');
      expect(bundle).toMatch(/^export \{/m);
      const run = spawnSync(process.execPath, [path.join(dir, 'out.mjs')], { encoding: 'utf8' });
      expect(run.stdout).toBe('3\n');
      // --format wins over the default
      expect(cli(['bundle', 'main.som', '-o', 'out.js', '-f', 'commonjs'], dir).status).toBe(0);
      expect(fs.readFileSync(path.join(dir, 'out.js'), 'utf8')).not.toMatch(/^export /m);
      // --module is not a bundle option
      expect(cli(['bundle', 'main.som', '--module', 'esm'], dir).status).not.toBe(0);
    });
  });
});

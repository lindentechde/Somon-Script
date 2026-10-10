import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

import { compile } from '../src/compiler';
import { buildCliOnce, canonicalTmpDir } from './helpers/paths';

/**
 * What a learner's first programs need: `чоп(…)` prints, mistakes in built-in
 * names are found before the program runs, `somon run` prints values with
 * SomonScript's names, and warnings are one short line each.
 */
describe('чоп(…) prints', () => {
  test('a call of the built-in чоп is console.log', () => {
    const result = compile('чоп("Салом");\nчоп(дуруст, холӣ);');
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.code).toContain('console.log("Салом");');
    expect(result.code).toContain('console.log(true, null);');
  });

  test('the console methods keep working', () => {
    const result = compile('чоп.сабт(1);\nчоп.хато(2);\nчоп.Хато(3);\nчоп.огоҳӣ(4);');
    expect(result.errors).toEqual([]);
    expect(result.code).toContain('console.log(1);');
    expect(result.code).toContain('console.error(2);');
    expect(result.code).toContain('console.error(3);');
    expect(result.code).toContain('console.warn(4);');
  });

  test('чоп as a value is the console', () => {
    const result = compile('тағ а = чоп;\nа.сабт(1);');
    expect(result.errors).toEqual([]);
    expect(result.code).toContain('let а = console;');
  });

  test('a program that declares its own чоп calls it', () => {
    const result = compile('функсия чоп(х: рақам): рақам { бозгашт х; }\nчоп(1);');
    expect(result.errors).toEqual([]);
    expect(result.code).toContain('чоп(1);');
    expect(result.code).not.toContain('console');
  });
});

describe('mistakes in built-in names are compile errors', () => {
  const errors = (source: string): string[] => compile(source).errors;

  test('a misspelt console method', () => {
    expect(errors('чоп.сабтт("x");')).toEqual([
      "Type error [PROPERTY_NOT_FOUND] at line 1, column 5: Property 'сабтт' does not exist on 'чоп'\n> чоп.сабтт(\"x\");",
    ]);
  });

  test('a Math member that does not exist, shown with its JavaScript name', () => {
    expect(errors('математика.дарозии(1);')).toEqual([
      expect.stringContaining("Property 'дарозии' does not exist on 'математика'"),
    ]);
    expect(errors('Риёзӣ.дарозӣ;')).toEqual([
      expect.stringContaining("Property 'дарозӣ' (length) does not exist on 'Риёзӣ'"),
    ]);
    // Other built-in objects are not checked: `объект.ном` is `Object.ном`, as before
    expect(errors('объект.ном;')).toEqual([]);
  });

  test('members that exist, by their Tajik and JavaScript names', () => {
    expect(
      errors(
        'чоп.сабт(математика.поён(1.5), Риёзӣ.ПИ, математика.floor(2.5), объект.калидҳо({}));\n' +
          'чоп.log(1); чоп.ҷадвал([]); чоп.profile;'
      )
    ).toEqual([]);
  });

  test('calling a built-in object that is not a function', () => {
    expect(errors('математика(1);')).toEqual([
      "Type error [NOT_CALLABLE] at line 1, column 1: 'математика' is not a function and cannot be called\n> математика(1);",
    ]);
    expect(errors('Риёзӣ();')).toEqual([expect.stringContaining('[NOT_CALLABLE]')]);
  });

  test('хато on its own is not a built-in', () => {
    expect(errors('хато("x");')).toEqual([
      expect.stringContaining("[UNDEFINED_IDENTIFIER] at line 1, column 1: Variable 'хато'"),
    ]);
    expect(errors('кӯшиш { } гирифтан (хато) { чоп(хато); }')).toEqual([]);
  });

  test('names a program declares are checked as its own', () => {
    expect(errors('тағ математика = { ҷамъ: (а: рақам) => а };\nматематика.ҷамъ(1);')).toEqual([]);
    expect(errors('функсия Риёзӣ() {}\nРиёзӣ();')).toEqual([]);
  });
});

describe('somon run output', () => {
  let cliPath: string;
  let dir: string;

  beforeAll(() => {
    cliPath = buildCliOnce();
  });

  beforeEach(() => {
    dir = canonicalTmpDir('somon-learner-');
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const run = (source: string, args: string[] = []) => {
    fs.writeFileSync(path.join(dir, 'барнома.som'), source);
    return spawnSync(process.execPath, [cliPath, ...args, 'run', 'барнома.som'], {
      cwd: dir,
      encoding: 'utf-8',
    });
  };

  test('the first program prints its greeting', () => {
    const result = run('чоп("Салом");\n');
    expect(result.stdout).toBe('Салом\n');
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
  });

  test('values print with SomonScript names, also inside arrays and objects', () => {
    const result = run(
      'чоп(дуруст, холӣ);\n' +
        'чоп.сабт(дуруст, 5 > 3, холӣ);\n' +
        'тағ х;\n' +
        'чоп.сабт(х);\n' +
        'чоп([1, нодуруст], { ном: "Алӣ", фаъол: дуруст });\n' +
        'чоп(0 / 0, 1 / 0);\n' +
        'чоп.хато(нодуруст);\n'
    );
    expect(result.stdout).toBe(
      'дуруст холӣ\nдуруст дуруст холӣ\nбеқимат\n[ 1, нодуруст ] { ном: "Алӣ", фаъол: дуруст }\nғайрирақам беохир\n'
    );
    expect(result.stderr).toBe('нодуруст\n');
  });

  test('ES module programs print the same way', () => {
    const result = run('чоп(дуруст);\n', []);
    const esm = spawnSync(process.execPath, [cliPath, 'run', '--module', 'esm', 'барнома.som'], {
      cwd: dir,
      encoding: 'utf-8',
    });
    expect(esm.stdout).toBe(result.stdout);
    expect(esm.stdout).toBe('дуруст\n');
  });

  test('a warning is one short line with the file relative to the current directory', () => {
    const result = run('тағ р = [1, 2, 3];\nчоп(р[0].дарозӣ);\n', ['--lang', 'tj']);
    expect(result.stderr).toBe(
      'Огоҳӣ дар барнома.som, сатри 2: Дар навъи `рақам` хосияти `дарозӣ` нест.\n'
    );
    expect(result.stderr).not.toContain('[module-system]');
    expect(result.stdout).toBe('беқимат\n');
  });

  test('warnings of an ES module program are printed the same way', () => {
    fs.writeFileSync(path.join(dir, 'барнома.som'), 'тағ н = 1;\nчоп(н.дарозӣ);\n');
    const result = spawnSync(
      process.execPath,
      [cliPath, 'run', '--module', 'esm', path.join('.', 'барнома.som')],
      { cwd: dir, encoding: 'utf-8' }
    );
    expect(result.stderr).toBe(
      "Warning: барнома.som:2:7: Property 'дарозӣ' (length) does not exist on type 'рақам'\n"
    );
  });
});

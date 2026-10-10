/**
 * The TypeScript checker's compiler host on unusual input: typings that
 * reference missing files, imported modules that do not lex, a shebang
 * before ambient modules, calls without options or files, a TypeScript
 * without its Russian messages, and messages translated from odd quoting.
 */
import * as fs from 'fs';
import * as path from 'path';
import ts from 'typescript';

import { compile, type CompileOptions } from '../src/compiler';
import {
  canonicalFileName,
  checkWithTypeScript,
  translateMessage,
  withWrittenSpecifiers,
} from '../src/tsc-checker';
import { canonicalTmpDir } from './helpers/paths';

jest.setTimeout(60000);

/** `[code, line, column]` of each error of a TypeScript check. */
function positions(source: string, options: CompileOptions): Array<[string, number, number]> {
  return compile(source, { checker: 'typescript', ...options }).errors.map(error => {
    const match = /^Type error \[(TS\d+)\] at line (\d+), column (\d+)/.exec(error);
    if (!match) throw new Error(`not a type error: ${error}`);
    return [match[1], Number(match[2]), Number(match[3])];
  });
}

describe('TypeScript checker: files that are not there', () => {
  let dir: string;
  beforeEach(() => {
    dir = canonicalTmpDir('somon-tsc-edge-');
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

  test('typings that reference missing files still type what they declare', () => {
    write(
      'node_modules/hisob/package.json',
      JSON.stringify({ name: 'hisob', types: 'index.d.ts' })
    );
    write(
      'node_modules/hisob/index.d.ts',
      [
        // Neither file exists: TypeScript asks the host for them and gets nothing
        '/// <reference path="./nest.d.ts" />',
        '/// <reference path="./nest.som.ts" />',
        'export declare const zarb: number;',
        '',
      ].join('\n')
    );
    const source = 'ворид { zarb } аз "hisob";\nтағ с: сатр = zarb;';
    expect(positions(source, { filePath: write('main.som', source) })).toEqual([['TS2322', 2, 5]]);
  });

  test('`.som` specifiers of files that do not exist', () => {
    const source = 'ворид { х } аз "./нест.som";\nворид { у } аз "./нест.som.js";';
    expect(positions(source, { filePath: write('main.som', source) })).toEqual([
      ['TS2307', 1, 16],
      ['TS2307', 2, 16],
    ]);
  });

  test('an imported module that does not lex is an empty module', () => {
    write('bad.som', 'содир собит х = "бе охир;\n');
    const source = 'ворид { х } аз "./bad";\nчоп.сабт(х);';
    expect(positions(source, { filePath: write('main.som', source) })).toEqual([['TS2305', 1, 9]]);
  });

  test('a shebang before ambient modules: positions stay on their lines', () => {
    const source = [
      '#!/usr/bin/env node',
      'эълон модул "ҳисоб" {',
      '    содир функсия зарб(а: рақам): рақам;',
      '}',
      'ворид { зарб } аз "ҳисоб";',
      'тағ с: сатр = зарб(1);',
      'тағ н: рақам = "нодуруст";',
    ].join('\n');
    expect(positions(source, { filePath: write('main.som', source) })).toEqual([
      ['TS2322', 6, 5],
      ['TS2322', 7, 5],
    ]);
  });

  test('an error inside an ambient module, after a shebang', () => {
    const source = '#!/usr/bin/env node\nэълон модул "м" {\n    тағ х: НестНавъ;\n}\n';
    expect(positions(source, { filePath: write('main.som', source) })).toEqual([['TS2304', 3, 12]]);
  });

  test('every @types package is seen, which TypeScript 6 no longer includes by default', () => {
    write('node_modules/@types/hisob/index.d.ts', 'declare const ҲИСОБ: number;\n');
    write('node_modules/@types/zarb/index.d.ts', 'declare function зарб(а: number): number;\n');
    const source = 'тағ с: сатр = ҲИСОБ;\nтағ р: рақам = зарб(ҲИСОБ);';
    expect(positions(source, { filePath: write('main.som', source) })).toEqual([['TS2322', 1, 5]]);
  });

  test('a side-effect import of a missing module is no type error, as before TypeScript 6', () => {
    write('ҳаст.som', 'чоп.сабт(1);\n');
    const source = 'ворид "./нест";\nворид "./ҳаст";\nтағ х: рақам = 1;';
    expect(positions(source, { filePath: write('main.som', source) })).toEqual([]);
  });

  test('on a file system that ignores case, file names are compared in lower case', () => {
    expect(canonicalFileName('/Лоиҳа/Math.SOM.ts', true)).toBe('/Лоиҳа/Math.SOM.ts');
    expect(canonicalFileName('/Лоиҳа/Math.SOM.ts', false)).toBe('/лоиҳа/math.som.ts');
    // As TypeScript's `toFileNameLowerCase`: `İ`, `ı` and `ß` stay
    expect(canonicalFileName('/İı/ẞß/A', false)).toBe('/İı/ßß/a');
    write('math.som', 'содир функсия зарб(а: рақам): рақам { бозгашт а * 2; }\n');
    const source = 'ворид { зарб, ҷамъ } аз "./math";\nтағ с: сатр = зарб(1);';
    const file = write('main.som', source);
    const errors = (): string[] =>
      compile(source, { checker: 'typescript', filePath: file }).errors.map(
        error => /^Type error \[(TS\d+)\] at line (\d+), column (\d+)/.exec(error)![0]
      );
    const sys = ts.sys as { useCaseSensitiveFileNames: boolean };
    const caseSensitive = sys.useCaseSensitiveFileNames;
    try {
      sys.useCaseSensitiveFileNames = true;
      const sensitive = errors();
      sys.useCaseSensitiveFileNames = false;
      expect(errors()).toEqual(sensitive);
      expect(sensitive).toEqual([
        'Type error [TS2305] at line 1, column 15',
        'Type error [TS2322] at line 2, column 5',
      ]);
    } finally {
      sys.useCaseSensitiveFileNames = caseSensitive;
    }
  });

  test('messages name a module as the program writes it, not as the checked TypeScript', () => {
    write('math.som', 'содир функсия зарб(а: рақам): рақам { бозгашт а * 2; }\n');
    // The second import of `./math` keeps the first spelling
    const source =
      'ворид { ҷамъ } аз "./math";\nворид { х } аз "./нест";\nворид { зарб } аз "./math.som";';
    const file = write('main.som', source);
    // TypeScript 6 names the module of `./math.js` (the emitted spelling) by that specifier
    expect(
      compile(source, { checker: 'typescript', filePath: file }).errors.map(
        error => error.split('\n')[0]
      )
    ).toEqual([
      `Type error [TS2305] at line 1, column 9: Module '"./math"' has no exported member 'ҷамъ'.`,
      `Type error [TS2307] at line 2, column 16: Cannot find module './нест' or its corresponding type declarations.`,
    ]);
    const specifiers = new Map([['./а.js', './а']]);
    expect(withWrittenSpecifiers(`'"./а.js"', "./а.js", './б.js'`, specifiers)).toBe(
      `'"./а"', "./а", './б.js'`
    );
    expect(withWrittenSpecifiers(`'./а.js'`, undefined)).toBe(`'./а.js'`);
  });
});

describe('TypeScript checker: the API without options or files', () => {
  test('default options: not strict, English', () => {
    const [result] = checkWithTypeScript([
      { fileName: 'асосӣ.som', source: 'тағ х: рақам = холӣ;\nтағ у: рақам = "1";' },
    ]);
    // `холӣ` is assignable without strict; the string is not
    expect(result.errors.map(error => [error.code, error.line, error.message])).toEqual([
      ['TS2322', 2, "Type 'сатр' is not assignable to type 'рақам'."],
    ]);
    expect(result.declaration).toBeUndefined();
  });

  test('no files: no results', () => {
    expect(checkWithTypeScript([], { strict: true })).toEqual([]);
  });
});

describe('TypeScript checker: messages', () => {
  test('Russian falls back to English when TypeScript has no Russian messages', () => {
    jest.isolateModules(() => {
      // The module object itself: the namespace import's properties cannot be replaced
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const nodeFs = require('fs') as typeof fs;
      const realRead = nodeFs.readFileSync;
      const read = jest.spyOn(nodeFs, 'readFileSync').mockImplementation(((
        file: fs.PathOrFileDescriptor,
        ...rest: unknown[]
      ) => {
        if (String(file).endsWith(path.join('ru', 'diagnosticMessages.generated.json'))) {
          throw new Error('ENOENT');
        }
        return (realRead as (...args: unknown[]) => unknown)(file, ...rest);
      }) as typeof fs.readFileSync);
      try {
        // A fresh module: its Russian messages are not loaded yet
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const fresh = require('../src/tsc-checker') as typeof import('../src/tsc-checker');
        const [result] = fresh.checkWithTypeScript(
          [{ fileName: 'асосӣ.som', source: 'тағ у: рақам = "1";' }],
          { locale: 'ru' }
        );
        expect(result.errors[0].message).toBe("Type 'сатр' is not assignable to type 'рақам'.");
      } finally {
        read.mockRestore();
      }
    });
  });

  test('member-list messages on a line without words', () => {
    // TS2741 names the members of the line; a line of punctuation has none
    expect(
      translateMessage("Property 'length' is missing in type '{}'.", 'en', '};', 1, 2741)
    ).toBe("Property 'length' is missing in type '{}'.");
    // A line that spells the member with its alias names it both ways
    expect(
      translateMessage("Property 'length' is missing.", 'en', 'тағ о = { дарозӣ };', 1, 2741)
    ).toBe("Property 'дарозӣ' (length) is missing.");
  });

  test('mismatched quotes are left as they are', () => {
    expect(translateMessage("Type «number' and 'string»", 'en', '', 1)).toBe(
      "Type «number' and 'string»"
    );
    expect(translateMessage('Тип «number» и «string»', 'ru', '', 1)).toBe('Тип «рақам» и «сатр»');
  });

  test('a .som module is named as the program imports it, not as its checked file', () => {
    for (const name of ['./math.som.js', './math.som.ts', './math.som']) {
      expect(
        translateMessage(`Module '"${name}"' has no exported member 'ҷамъ'.`, 'en', '', 1, 2305)
      ).toBe(`Module '"./math"' has no exported member 'ҷамъ'.`);
    }
    expect(translateMessage(`File '/x/a.som.ts' is not a module.`, 'en', '', 1)).toBe(
      `File '/x/a' is not a module.`
    );
    // Other names keep their extensions
    expect(translateMessage(`Cannot find module './a.json'.`, 'en', '', 1)).toBe(
      `Cannot find module './a.json'.`
    );
  });
});

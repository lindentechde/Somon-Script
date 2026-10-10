/**
 * compile() on its rarer paths: a stage that fails with something other than
 * an Error, target errors among other statements, source maps of an unnamed
 * file, and the invariants of the built-in member names it translates.
 */
import { BUILTIN_MAPPINGS, MEMBER_ALIASES, translateMemberName } from '../src/builtin-names';
import { compile } from '../src/compiler';
import { Parser } from '../src/parser';

describe('compile: failures inside a stage', () => {
  test('a stage that throws something other than an Error is reported, not thrown', () => {
    const parse = jest.spyOn(Parser.prototype, 'parse').mockImplementation(() => {
      throw 'the parser broke';
    });
    try {
      expect(compile('тағ х = 1;')).toEqual({
        code: '',
        errors: ['the parser broke'],
        warnings: [],
      });
    } finally {
      parse.mockRestore();
    }
  });
});

describe('compile: target errors', () => {
  test('a target error between other statements points at its own statement', () => {
    const result = compile('тағ а = 1;\nтағ б = 10n;\nтағ в = 2;\nчоп.сабт(а, б, в);', {
      target: 'es2019',
    });
    expect(result.code).toBe('');
    expect(result.errors).toEqual([
      expect.stringMatching(/^Target error at line 2, column 1: .*BigInt.*\n> тағ б = 10n;$/),
    ]);
  });
});

describe('compile: source maps', () => {
  test('a source file name without a file part names the output source.js', () => {
    const result = compile('тағ а = 1;', { sourceMap: true, sourceFileName: 'папка/' });
    expect(result.errors).toEqual([]);
    const map = JSON.parse(result.sourceMap!);
    expect(map.file).toBe('source.js');
    expect(map.sources).toEqual(['папка/']);
  });

  test('minified code with a source map of lowered code', () => {
    const result = compile('тағ а = 1;\nчоп.сабт(а ?? 2);', {
      sourceMap: true,
      minify: true,
      target: 'es2019',
    });
    expect(result.errors).toEqual([]);
    expect(result.code).not.toContain('??');
    const map = JSON.parse(result.sourceMap!);
    expect(map.sources).toEqual(['source.som']);
    expect(map.mappings.length).toBeGreaterThan(0);
  });
});

describe('built-in member names', () => {
  test('every member alias has a JavaScript name', () => {
    expect([...MEMBER_ALIASES].filter(alias => !BUILTIN_MAPPINGS.has(alias))).toEqual([]);
  });

  test('translateMemberName: aliases to JavaScript, other names unchanged', () => {
    expect(translateMemberName('дарозӣ')).toBe('length');
    expect(translateMemberName('илова')).toBe('push');
    expect(translateMemberName('номи_ман')).toBe('номи_ман');
    // A Tajik keyword that is not a member alias stays
    expect(translateMemberName('агар')).toBe('агар');
  });
});

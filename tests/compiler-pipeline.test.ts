/**
 * Compiler pipeline contract: how diagnostics from each stage reach the
 * caller and when code is suppressed.
 */

import * as fs from 'fs';
import * as path from 'path';
import { CodeGenerator } from '../src/codegen';
import { compile } from '../src/compiler';

describe('compiler pipeline', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('code generation errors are reported and suppress code', () => {
    jest.spyOn(CodeGenerator.prototype, 'getErrors').mockReturnValue(['Unknown node: Foo']);
    const result = compile('чоп.сабт(1);');
    expect(result.code).toBe('');
    expect(result.errors).toEqual(['Code generation error: Unknown node: Foo']);
  });

  test('JavaScript reserved words used as identifiers are compile errors', () => {
    const result = compile('тағйирёбанда а = 1;\nтағйирёбанда class = 2;\nчоп.сабт(while);', {
      typeCheck: false,
    });
    expect(result.code).toBe('');
    expect(result.errors).toEqual([
      expect.stringMatching(/'class'.*line 2, column \d+/),
      expect.stringMatching(/'while'.*line 3, column \d+/),
    ]);
    // `new` (like `return`, `function`, …) is read as its Tajik keyword
    expect(compile('чоп.сабт(new);', { typeCheck: false }).errors).toEqual([
      expect.stringMatching(/Unexpected token '\)' at line 1/),
    ]);
  });

  test('null/true/false are allowed as values but not as declared names', () => {
    const ok = compile('тағйирёбанда а = null;\nчоп.сабт(а == null, true);', { typeCheck: false });
    expect(ok.errors).toEqual([]);
    expect(ok.code).toContain('а == null');

    const bad = compile('функсия ф(null) {}', { typeCheck: false });
    expect(bad.code).toBe('');
    expect(bad.errors).toEqual([expect.stringMatching(/'null'.*line 1/)]);
  });

  test('reserved words stay allowed as property names', () => {
    const result = compile('тағйирёбанда о = {class: 1, new: 2};\nчоп.сабт(о.class + о.new);', {
      typeCheck: false,
    });
    expect(result.errors).toEqual([]);
    expect(result.code).toContain('о.class + о.new');
  });
});

describe('public API documentation', () => {
  test('the src/index.ts example compiles', () => {
    const indexSource = fs.readFileSync(path.join(__dirname, '../src/index.ts'), 'utf8');
    const example = /compile\("((?:[^"\\]|\\.)*)"\)/.exec(indexSource);
    expect(example).not.toBeNull();
    const result = compile(JSON.parse(`"${example![1]}"`) as string);
    expect(result.errors).toEqual([]);
    expect(result.code).toBe('console.log("Салом, ҷаҳон!");');
  });
});

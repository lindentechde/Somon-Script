/**
 * Compiler pipeline contract: how diagnostics from each stage reach the
 * caller and when code is suppressed.
 */

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
    const result = compile('тағйирёбанда а = 1;\nтағйирёбанда class = 2;\nчоп.сабт(new);', {
      typeCheck: false,
    });
    expect(result.code).toBe('');
    expect(result.errors).toEqual([
      expect.stringMatching(/'class'.*line 2, column \d+/),
      expect.stringMatching(/'new'.*line 3, column \d+/),
    ]);
  });

  test('reserved words stay allowed as property names', () => {
    const result = compile('тағйирёбанда о = {class: 1, new: 2};\nчоп.сабт(о.class + о.new);', {
      typeCheck: false,
    });
    expect(result.errors).toEqual([]);
    expect(result.code).toContain('о.class + о.new');
  });
});

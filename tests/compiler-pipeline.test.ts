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
});

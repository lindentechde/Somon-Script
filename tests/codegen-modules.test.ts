/**
 * CommonJS emission of exports and import specifiers.
 */

import * as vm from 'vm';
import { compile } from '../src/compiler';

function exportsOf(source: string): Record<string, unknown> {
  const result = compile(source, { typeCheck: false });
  expect(result.errors).toEqual([]);
  const module = { exports: {} as Record<string, unknown> };
  vm.runInNewContext(result.code, { module, exports: module.exports });
  return module.exports;
}

function codeOf(source: string): string {
  const result = compile(source, { typeCheck: false });
  expect(result.errors).toEqual([]);
  return result.code;
}

describe('codegen module emission', () => {
  test('default-exported expression', () => {
    expect(exportsOf('содир пешфарз 40 + 2;').default).toBe(42);
  });

  test('exported destructuring declaration exports every bound name', () => {
    const exported = exportsOf('содир собит { а, б } = { а: 1, б: 2 };');
    expect(exported).toEqual({ а: 1, б: 2 });
  });

  test('exported namespace', () => {
    const exported = exportsOf('содир номфазо Б { содир собит x = 1; }');
    expect((exported.Б as { x: number }).x).toBe(1);
  });

  test.each([
    ['./my.something/file', './my.something/file.js'],
    ['./модул.som', './модул.js'],
    ['./a.som.som', './a.som.js'],
    ['./data.json', './data.json'],
    ['lodash', 'lodash'],
  ])('dynamic import of %s', (specifier, expected) => {
    expect(codeOf(`тағйирёбанда м = ворид("${specifier}");`)).toContain(`import("${expected}")`);
  });

  test.each([
    ['./my.something/file', './my.something/file.js'],
    ['./модул.som', './модул.js'],
  ])('static import of %s', (specifier, expected) => {
    expect(codeOf(`ворид { а } аз "${specifier}";`)).toContain(`require("${expected}")`);
  });
});

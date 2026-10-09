/**
 * Behavioural codegen tests: compile SomonScript, run the emitted JavaScript
 * and assert on what it actually prints.
 */

import * as vm from 'vm';
import { compile } from '../src/compiler';

function run(source: string): string[] {
  const result = compile(source, { typeCheck: false });
  expect(result.errors).toEqual([]);
  const output: string[] = [];
  const log = (...args: unknown[]) => output.push(args.map(a => String(a)).join(' '));
  const module = { exports: {} as Record<string, unknown> };
  vm.runInNewContext(result.code, {
    console: { log, error: log, warn: log },
    module,
    exports: module.exports,
  });
  return output;
}

describe('codegen semantics', () => {
  test('keeps call statements with long or underscored names', () => {
    const output = run(`
функсия ҳисобкунӣ(қиматҳоям) { чоп.сабт("ҳисоб", қиматҳоям); }
тағйирёбанда қиматҳоям = 3;
ҳисобкунӣ(қиматҳоям);
функсия f(x) { чоп.сабт("f", x); }
тағйирёбанда my_val = 2;
f(my_val);
`);
    expect(output).toEqual(['ҳисоб 3', 'f 2']);
  });
});

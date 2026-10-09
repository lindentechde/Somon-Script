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

  test('grouping parentheses survive compilation', () => {
    const output = run(`
тағйирёбанда а = 1;
тағйирёбанда б = 2;
тағйирёбанда в = 3;
чоп.сабт(а - (б - в), а / (б * в) === 1 / 6, -(а + б), !(а == б), 10 - (3 - 1));
чоп.сабт((а + б).toFixed(1));
`);
    expect(output).toEqual(['2 true -3 true 8', '3.0']);
  });

  test('user members named like built-ins round-trip', () => {
    const output = run(`
тағйирёбанда о = {дарозӣ: 5, филтр: "x"};
чоп.сабт(о.дарозӣ, о.филтр);
синф Ҷамъкунак {
  илова(х) { бозгашт х + 1; }
}
тағйирёбанда р = нав Ҷамъкунак();
чоп.сабт(р.илова(1));
`);
    expect(output).toEqual(['5 x', '2']);
  });

  test('template literal escapes are preserved', () => {
    const output = run('чоп.сабт(`a \\` b`, `C:\\\\temp`);');
    expect(output).toEqual(['a ` b C:\\temp']);
  });

  test('built-in object names map only when not declared by the program', () => {
    const output = run(`
тағйирёбанда рӯйхат = [1, 2];
функсия ф(сатр) { бозгашт сатр + "!"; }
чоп.сабт(рӯйхат.length, Array.isArray(рӯйхат), ф("а"), сатр(5) === "5");
`);
    expect(output).toEqual(['2 true а! true']);
  });

  test('a catch without a parameter does not shadow an outer `error`', () => {
    const output = run(`
тағйирёбанда error = "outer";
кӯшиш { партофтан нав Хато("x"); } гирифтан { чоп.сабт(error); }
`);
    expect(output).toEqual(['outer']);
  });

  test('a namespace is a local binding, also in strict code', () => {
    const source = `
номфазо Асбоб {
  содир функсия ҷамъ(а, б) { бозгашт а + б; }
}
чоп.сабт(Асбоб.ҷамъ(1, 2));
`;
    const result = compile(source, { typeCheck: false });
    const output: string[] = [];
    vm.runInNewContext(`"use strict";\n${result.code}`, {
      console: { log: (...args: unknown[]) => output.push(args.join(' ')) },
    });
    expect(output).toEqual(['3']);
  });

  test('double negation does not become a decrement', () => {
    const output = run(`
тағйирёбанда а = 5;
тағйирёбанда б = - -а;
тағйирёбанда в = -(-а);
чоп.сабт(б, в, а);
`);
    expect(output).toEqual(['5 5 5']);
  });
});

/**
 * The code generator on rarer programs, compiled and run: each case checks
 * the program's output, the generated JavaScript or the error it reports.
 */
import { compile, type CompileOptions } from '../src/compiler';

/** Compiles and runs a program; returns what it logged. */
function run(source: string, options: CompileOptions = {}): string[] {
  const result = compile(source, { typeCheck: false, ...options });
  expect(result.errors).toEqual([]);
  const lines: string[] = [];
  new Function('console', 'require', 'module', 'exports', result.code)(
    { log: (...args: unknown[]) => lines.push(args.map(String).join(' ')) },
    require,
    { exports: {} },
    {}
  );
  return lines;
}

const errorsOf = (source: string, options: CompileOptions = {}) =>
  compile(source, { typeCheck: false, ...options }).errors;

describe('codegen: private methods', () => {
  test('overload signatures of a private method declare nothing', () => {
    const source =
      'синф К {\n  #м(х: рақам): сатр;\n  #м(х: ҳар) { бозгашт "м" + х; }\n  гир() { бозгашт ин.#м(1); }\n}\nчоп.сабт(нав К().гир());';
    expect(run(source)).toEqual(['м1']);
    // TypeScript agrees
    expect(compile(source, { checker: 'typescript', strict: true }).errors).toEqual([]);
    // Two implementations are still an error
    expect(errorsOf('синф К { #м() {} #м() {} }')).toEqual([
      "Code generation error: Identifier '#м' has already been declared at line 1, column 18",
    ]);
  });
});

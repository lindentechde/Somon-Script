/**
 * The SomonScript type checker on rarer programs: each case checks the
 * errors it reports (as `CODE line:column message`) and, where TypeScript
 * judges the same program, that TypeScript agrees.
 */
import { compile } from '../src/compiler';
import { Lexer } from '../src/lexer';
import { Parser } from '../src/parser';
import { TypeChecker } from '../src/type-checker';

/** The checker's errors and warnings for `source`, strict unless asked otherwise. */
function check(source: string, strict = true): string[] {
  const parser = new Parser(new Lexer(source).tokenize());
  const ast = parser.parse();
  expect(parser.getErrors()).toEqual([]);
  const result = new TypeChecker(source, { strict }).check(ast);
  return [...result.errors, ...result.warnings].map(
    error => `${error.code} ${error.line}:${error.column} ${error.message}`
  );
}

/** TypeScript's errors for `source`, as codes with their line. */
function typeScriptErrors(source: string): string[] {
  return compile(source, { checker: 'typescript', strict: true }).errors.map(error =>
    error.replace(/^Type error \[(\w+)\] at line (\d+), column \d+: .*$/s, '$1 $2')
  );
}

describe('type checker: namespaces', () => {
  test('a destructuring declaration exports each name it binds', () => {
    const source = [
      'номфазо Н { содир собит { а, б: [в] } = { а: 1, б: ["х"] }, [г, ...д] = [дуруст, нодуруст]; }',
      'тағ х: сатр = Н.а;',
      'тағ у: рақам = Н.в;',
      'тағ з: мантиқӣ = Н.г;',
      'тағ и: мантиқӣ[] = Н.д;',
      'номфазо М { содир собит { е } = { е: 1 }; }',
      'номфазо М { содир функсия ф(): сатр { бозгашт е; } }',
    ].join('\n');
    // The names were no members: `Н.а` was of no known type
    expect(check(source)).toEqual([
      "TYPE_NOT_ASSIGNABLE 2:15 Type 'рақам' is not assignable to type 'сатр'",
      "TYPE_NOT_ASSIGNABLE 3:16 Type 'сатр' is not assignable to type 'рақам'",
      "TYPE_NOT_ASSIGNABLE 7:47 Type 'рақам' is not assignable to return type 'сатр'",
    ]);
    expect(typeScriptErrors(source)).toEqual(['TS2322 2', 'TS2322 3', 'TS2322 7']);
  });
});

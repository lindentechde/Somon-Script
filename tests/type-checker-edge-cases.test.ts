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

describe('type checker: declared modules', () => {
  test('a module exports what it exports from another declared module', () => {
    const source = [
      'эълон модул "н" { содир собит х: рақам; содир интерфейс И { а: рақам; } }',
      'эълон модул "м" { содир * аз "н"; содир * чун Н аз "н"; содир { х чун з } аз "н"; }',
      'ворид { х, з, Н, И } аз "м";',
      'тағ у: сатр = х;',
      'тағ ю: сатр = з;',
      'тағ я: сатр = Н.х;',
      'тағ и: И = { а: 1 };',
      'ворид { в } аз "м";',
    ].join('\n');
    // `х`, `з` and `Н` were "Module '"м"' has no exported member"; imports come first
    expect(check(source)).toEqual([
      `PROPERTY_NOT_FOUND 8:9 Module '"м"' has no exported member 'в'`,
      "TYPE_NOT_ASSIGNABLE 4:15 Type 'рақам' is not assignable to type 'сатр'",
      "TYPE_NOT_ASSIGNABLE 5:15 Type 'рақам' is not assignable to type 'сатр'",
      "TYPE_NOT_ASSIGNABLE 6:15 Type 'рақам' is not assignable to type 'сатр'",
    ]);
    expect(typeScriptErrors(source)).toEqual(['TS2322 4', 'TS2322 5', 'TS2322 6', 'TS2305 8']);
  });

  test('modules that export each other end the search; one not declared here may export anything', () => {
    const cycle = [
      'эълон модул "а" { содир * аз "б"; содир собит я: рақам; }',
      'эълон модул "б" { содир * аз "а"; }',
      'ворид { х, я } аз "б";',
    ].join('\n');
    expect(check(cycle)).toEqual([
      `PROPERTY_NOT_FOUND 3:9 Module '"б"' has no exported member 'х'`,
    ]);
    expect(typeScriptErrors(cycle)).toEqual(['TS2305 3']);
    expect(
      check(
        'эълон модул "м" { содир * аз "берун"; содир { а } аз "берун"; }\nворид { х, а } аз "м";\nворид * чун М аз "м";\nМ.ҳарчӣ;'
      )
    ).toEqual([]);
  });
});

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

  test('an exported import alias is a member', () => {
    const source = [
      'номфазо А { содир собит б: рақам = 1; }',
      'номфазо Н { содир ворид х = А.б; }',
      'номфазо Н { содир функсия ф(): сатр { бозгашт х; } }',
      'тағ с: сатр = Н.х;',
    ].join('\n');
    // `Н.х` had no type, and `х` was not defined in the other block
    expect(check(source)).toEqual([
      "TYPE_NOT_ASSIGNABLE 3:47 Type 'рақам' is not assignable to return type 'сатр'",
      "TYPE_NOT_ASSIGNABLE 4:15 Type 'рақам' is not assignable to type 'сатр'",
    ]);
    expect(typeScriptErrors(source)).toEqual(['TS2322 3', 'TS2322 4']);
    // A declared module exports an alias only when marked so, as TypeScript
    expect(
      check(
        'эълон модул "м" { ворид х = Н.а; содир ворид у = Н.а; номфазо Н { собит а: рақам; } }\nворид { х, у } аз "м";'
      )
    ).toEqual([`PROPERTY_NOT_FOUND 2:9 Module '"м"' has no exported member 'х'`]);
  });
});

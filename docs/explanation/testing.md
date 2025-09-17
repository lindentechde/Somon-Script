# SomonScript Testing Guide

This comprehensive guide covers quality assurance methodology and testing
strategies for SomonScript development, from unit testing to integration and
performance testing.

## Table of Contents

1. [Testing Philosophy](#testing-philosophy)
2. [Testing Framework](#testing-framework)
3. [Unit Testing](#unit-testing)
4. [Integration Testing](#integration-testing)
5. [Compiler Testing](#compiler-testing)
6. [Performance Testing](#performance-testing)
7. [Test Organization](#test-organization)
8. [Continuous Integration](#continuous-integration)

## Testing Philosophy

SomonScript follows a comprehensive testing strategy ensuring reliability and
maintainability:

### Core Principles

1. **Test-Driven Development**: Write tests before implementation
2. **Comprehensive Coverage**: Aim for >95% code coverage
3. **Fast Feedback**: Tests should run quickly during development
4. **Isolated Tests**: Each test should be independent
5. **Readable Tests**: Tests serve as living documentation

### Testing Pyramid

```
    ┌─────────────────┐
    │   E2E Tests     │  ← Few, slow, high confidence
    │   (Examples)    │
    ├─────────────────┤
    │ Integration     │  ← Some, medium speed
    │ Tests (CLI)     │
    ├─────────────────┤
    │  Unit Tests     │  ← Many, fast, focused
    │  (Components)   │
    └─────────────────┘
```

## Testing Framework

SomonScript uses Jest as the primary testing framework with custom extensions
for compiler testing.

### Setup

```bash
# Install testing dependencies
npm install --save-dev jest @types/jest ts-jest

# Run tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:examples
```

### Configuration

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts', '!src/**/*.test.ts'],
  coverageThreshold: {
    global: {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95,
    },
  },
};
```

## Unit Testing

Unit tests focus on individual components in isolation.

### Lexer Testing

```typescript
// tests/lexer/lexer.test.ts
import { Lexer, TokenType } from '../../src/lexer/lexer';

describe('Lexer', () => {
  let lexer: Lexer;

  beforeEach(() => {
    lexer = new Lexer();
  });

  describe('Variable Declarations', () => {
    test('should tokenize mutable variable declaration', () => {
      const source = 'тағйирёбанда ном = "Аҳмад";';
      const tokens = lexer.tokenize(source);

      expect(tokens).toEqual([
        {
          type: TokenType.KEYWORD,
          value: 'тағйирёбанда',
          position: { line: 1, column: 1 },
        },
        {
          type: TokenType.IDENTIFIER,
          value: 'ном',
          position: { line: 1, column: 13 },
        },
        {
          type: TokenType.ASSIGN,
          value: '=',
          position: { line: 1, column: 17 },
        },
        {
          type: TokenType.STRING,
          value: '"Аҳмад"',
          position: { line: 1, column: 19 },
        },
        {
          type: TokenType.SEMICOLON,
          value: ';',
          position: { line: 1, column: 26 },
        },
        { type: TokenType.EOF, value: '', position: { line: 1, column: 27 } },
      ]);
    });

    test('should tokenize constant declaration', () => {
      const source = 'собит ПИ = 3.14159;';
      const tokens = lexer.tokenize(source);

      expect(tokens[0]).toMatchObject({
        type: TokenType.KEYWORD,
        value: 'собит',
      });
    });

    test('should handle invalid characters gracefully', () => {
      const source = 'тағйирёбанда ном @ = "test";';

      expect(() => {
        lexer.tokenize(source);
      }).toThrow('Unexpected character "@" at line 1, column 17');
    });
  });

  describe('Numbers', () => {
    test('should tokenize integers', () => {
      const tokens = lexer.tokenize('42');
      expect(tokens[0]).toMatchObject({
        type: TokenType.NUMBER,
        value: '42',
      });
    });

    test('should tokenize floating point numbers', () => {
      const tokens = lexer.tokenize('3.14159');
      expect(tokens[0]).toMatchObject({
        type: TokenType.NUMBER,
        value: '3.14159',
      });
    });

    test('should reject invalid numbers', () => {
      expect(() => {
        lexer.tokenize('3.14.159');
      }).toThrow('Invalid number format');
    });
  });

  describe('String Literals', () => {
    test('should handle basic strings', () => {
      const tokens = lexer.tokenize('"Салом, Ҷаҳон!"');
      expect(tokens[0]).toMatchObject({
        type: TokenType.STRING,
        value: '"Салом, Ҷаҳон!"',
      });
    });

    test('should handle escape sequences', () => {
      const tokens = lexer.tokenize('"Салом\\nҶаҳон"');
      expect(tokens[0]).toMatchObject({
        type: TokenType.STRING,
        value: '"Салом\\nҶаҳон"',
      });
    });

    test('should handle template literals', () => {
      const tokens = lexer.tokenize('`Салом, ${ном}!`');
      expect(tokens[0].type).toBe(TokenType.TEMPLATE_LITERAL);
    });
  });
});
```

### Parser Testing

```typescript
// tests/parser/parser.test.ts
import { Parser } from '../../src/parser/parser';
import { Lexer } from '../../src/lexer/lexer';

describe('Parser', () => {
  function parseExpression(source: string) {
    const lexer = new Lexer();
    const tokens = lexer.tokenize(source);
    const parser = new Parser(tokens);
    return parser.parseExpression();
  }

  describe('Expressions', () => {
    test('should parse binary expressions', () => {
      const ast = parseExpression('2 + 3 * 4');

      expect(ast).toMatchObject({
        type: 'BinaryExpression',
        operator: '+',
        left: { type: 'NumberLiteral', value: '2' },
        right: {
          type: 'BinaryExpression',
          operator: '*',
          left: { type: 'NumberLiteral', value: '3' },
          right: { type: 'NumberLiteral', value: '4' },
        },
      });
    });

    test('should handle operator precedence correctly', () => {
      const ast = parseExpression('2 * 3 + 4');

      expect(ast).toMatchObject({
        type: 'BinaryExpression',
        operator: '+',
        left: {
          type: 'BinaryExpression',
          operator: '*',
          left: { type: 'NumberLiteral', value: '2' },
          right: { type: 'NumberLiteral', value: '3' },
        },
        right: { type: 'NumberLiteral', value: '4' },
      });
    });

    test('should parse function calls', () => {
      const ast = parseExpression('ҷамъ(2, 3)');

      expect(ast).toMatchObject({
        type: 'CallExpression',
        callee: { type: 'Identifier', name: 'ҷамъ' },
        arguments: [
          { type: 'NumberLiteral', value: '2' },
          { type: 'NumberLiteral', value: '3' },
        ],
      });
    });
  });

  describe('Error Recovery', () => {
    test('should recover from missing semicolons', () => {
      const source = `
        тағйирёбанда а = 1
        тағйирёбанда б = 2;
      `;

      const lexer = new Lexer();
      const tokens = lexer.tokenize(source);
      const parser = new Parser(tokens);
      const ast = parser.parseProgram();

      expect(parser.getErrors()).toHaveLength(1);
      expect(ast.statements).toHaveLength(2);
    });

    test('should continue parsing after errors', () => {
      const source = `
        тағйирёбанда а = ;
        тағйирёбанда б = 42;
      `;

      const lexer = new Lexer();
      const tokens = lexer.tokenize(source);
      const parser = new Parser(tokens);
      const ast = parser.parseProgram();

      expect(parser.getErrors().length).toBeGreaterThan(0);
      expect(ast.statements).toHaveLength(2);
    });
  });
});
```

### Type Checker Testing

```typescript
// tests/type-checker/type-checker.test.ts
import { TypeChecker } from '../../src/type-checker/type-checker';
import { Parser } from '../../src/parser/parser';
import { Lexer } from '../../src/lexer/lexer';

describe('TypeChecker', () => {
  function typeCheckSource(source: string) {
    const lexer = new Lexer();
    const tokens = lexer.tokenize(source);
    const parser = new Parser(tokens);
    const ast = parser.parseProgram();
    const typeChecker = new TypeChecker();
    return typeChecker.checkProgram(ast);
  }

  describe('Variable Types', () => {
    test('should infer string type', () => {
      const result = typeCheckSource('тағйирёбанда ном = "Аҳмад";');

      const variable = result.symbolTable.lookup('ном');
      expect(variable?.type).toEqual({ kind: 'primitive', name: 'string' });
    });

    test('should infer number type', () => {
      const result = typeCheckSource('тағйирёбанда синну = 25;');

      const variable = result.symbolTable.lookup('синну');
      expect(variable?.type).toEqual({ kind: 'primitive', name: 'number' });
    });

    test('should respect explicit type annotations', () => {
      const result = typeCheckSource('тағйирёбанда маълумот: сатр = "test";');

      const variable = result.symbolTable.lookup('маълумот');
      expect(variable?.type).toEqual({ kind: 'primitive', name: 'string' });
    });

    test('should catch type mismatches', () => {
      const result = typeCheckSource('тағйирёбанда рақам: рақам = "text";');

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Type mismatch');
    });
  });

  describe('Function Types', () => {
    test('should type check function declarations', () => {
      const source = `
        функсия ҷамъ(а: рақам, б: рақам): рақам {
          бозгашт а + б;
        }
      `;

      const result = typeCheckSource(source);
      const func = result.symbolTable.lookup('ҷамъ');

      expect(func?.type).toMatchObject({
        kind: 'function',
        parameters: [
          { name: 'а', type: { kind: 'primitive', name: 'number' } },
          { name: 'б', type: { kind: 'primitive', name: 'number' } },
        ],
        returnType: { kind: 'primitive', name: 'number' },
      });
    });

    test('should validate function calls', () => {
      const source = `
        функсия ҷамъ(а: рақам, б: рақам): рақам {
          бозгашт а + б;
        }
        
        тағйирёбанда натиҷа = ҷамъ(1, 2);
      `;

      const result = typeCheckSource(source);
      expect(result.errors).toHaveLength(0);

      const variable = result.symbolTable.lookup('натиҷа');
      expect(variable?.type).toEqual({ kind: 'primitive', name: 'number' });
    });

    test('should catch argument count mismatches', () => {
      const source = `
        функсия ҷамъ(а: рақам, б: рақам): рақам {
          бозгашт а + б;
        }
        
        тағйирёбанда натиҷа = ҷамъ(1);
      `;

      const result = typeCheckSource(source);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Expected 2 arguments, got 1');
    });
  });

  describe('Union Types', () => {
    test('should handle union type declarations', () => {
      const source = 'тағйирёбанда маълумот: сатр | рақам = "test";';

      const result = typeCheckSource(source);
      const variable = result.symbolTable.lookup('маълумот');

      expect(variable?.type).toMatchObject({
        kind: 'union',
        types: [
          { kind: 'primitive', name: 'string' },
          { kind: 'primitive', name: 'number' },
        ],
      });
    });

    test('should narrow union types in conditionals', () => {
      const source = `
        тағйирёбанда маълумот: сатр | рақам = "test";
        
        агар typeof маълумот === "сатр" {
          тағйирёбанда дарозӣ = маълумот.length; // Should be valid
        }
      `;

      const result = typeCheckSource(source);
      expect(result.errors).toHaveLength(0);
    });
  });
});
```

## Integration Testing

Integration tests verify that components work together correctly.

### CLI Testing

```typescript
// tests/cli/cli.test.ts
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('CLI Integration', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'somon-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('should compile simple program', () => {
    const sourceFile = path.join(tempDir, 'hello.som');
    const outputFile = path.join(tempDir, 'hello.js');

    fs.writeFileSync(sourceFile, 'чоп.сабт("Салом, Ҷаҳон!");');

    execSync(`somon compile ${sourceFile} --output ${outputFile}`, {
      cwd: process.cwd(),
    });

    expect(fs.existsSync(outputFile)).toBe(true);

    const output = fs.readFileSync(outputFile, 'utf8');
    expect(output).toContain('console.log("Салом, Ҷаҳон!");');
  });

  test('should run program directly', () => {
    const sourceFile = path.join(tempDir, 'hello.som');
    fs.writeFileSync(sourceFile, 'чоп.сабт("Салом, Ҷаҳон!");');

    const output = execSync(`somon run ${sourceFile}`, {
      encoding: 'utf8',
      cwd: process.cwd(),
    });

    expect(output.trim()).toBe('Салом, Ҷаҳон!');
  });

  test('should handle compilation errors gracefully', () => {
    const sourceFile = path.join(tempDir, 'error.som');
    fs.writeFileSync(sourceFile, 'тағйирёбанда а = ;'); // Invalid syntax

    try {
      execSync(`somon compile ${sourceFile}`, {
        cwd: process.cwd(),
        stdio: 'pipe',
      });
      fail('Expected compilation to fail');
    } catch (error: any) {
      expect(error.status).toBe(1);
      expect(error.stderr.toString()).toContain('Syntax error');
    }
  });

  test('should generate source maps', () => {
    const sourceFile = path.join(tempDir, 'program.som');
    const outputFile = path.join(tempDir, 'program.js');
    const mapFile = path.join(tempDir, 'program.js.map');

    fs.writeFileSync(
      sourceFile,
      `
      тағйирёбанда ном = "Аҳмад";
      чоп.сабт("Салом, " + ном);
    `
    );

    execSync(
      `somon compile ${sourceFile} --output ${outputFile} --source-map`,
      {
        cwd: process.cwd(),
      }
    );

    expect(fs.existsSync(mapFile)).toBe(true);

    const sourceMap = JSON.parse(fs.readFileSync(mapFile, 'utf8'));
    expect(sourceMap.version).toBe(3);
    expect(sourceMap.sources).toContain('program.som');
  });
});
```

### Module System Testing

```typescript
// tests/modules/module-system.test.ts
describe('Module System Integration', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'somon-modules-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('should resolve and compile modules', () => {
    // Create math.som
    const mathFile = path.join(tempDir, 'math.som');
    fs.writeFileSync(
      mathFile,
      `
      содор функсия ҷамъ(а: рақам, б: рақам): рақам {
        бозгашт а + б;
      }
      
      содор собит ПИ = 3.14159;
    `
    );

    // Create main.som
    const mainFile = path.join(tempDir, 'main.som');
    fs.writeFileSync(
      mainFile,
      `
      ворид { ҷамъ, ПИ } аз "./math";
      
      тағйирёбанда натиҷа = ҷамъ(2, 3);
      чоп.сабт("Натиҷа: " + натиҷа);
      чоп.сабт("ПИ: " + ПИ);
    `
    );

    const output = execSync(`somon run ${mainFile}`, {
      encoding: 'utf8',
      cwd: tempDir,
    });

    expect(output).toContain('Натиҷа: 5');
    expect(output).toContain('ПИ: 3.14159');
  });

  test('should detect circular dependencies', () => {
    // Create a.som
    const aFile = path.join(tempDir, 'a.som');
    fs.writeFileSync(
      aFile,
      `
      ворид { функсияБ } аз "./b";
      содор функсия функсияА() { функсияБ(); }
    `
    );

    // Create b.som
    const bFile = path.join(tempDir, 'b.som');
    fs.writeFileSync(
      bFile,
      `
      ворид { функсияА } аз "./a";
      содор функсия функсияБ() { функсияА(); }
    `
    );

    try {
      execSync(`somon compile ${aFile}`, {
        cwd: tempDir,
        stdio: 'pipe',
      });
      fail('Expected circular dependency error');
    } catch (error: any) {
      expect(error.stderr.toString()).toContain('Circular dependency detected');
    }
  });

  test('should bundle modules correctly', () => {
    // Create multiple modules and bundle them
    const mathFile = path.join(tempDir, 'math.som');
    fs.writeFileSync(
      mathFile,
      `
      содор функсия ҷамъ(а: рақам, б: рақам): рақам {
        бозгашт а + б;
      }
    `
    );

    const mainFile = path.join(tempDir, 'main.som');
    fs.writeFileSync(
      mainFile,
      `
      ворид { ҷамъ } аз "./math";
      чоп.сабт(ҷамъ(2, 3));
    `
    );

    const bundleFile = path.join(tempDir, 'bundle.js');
    execSync(
      `somon bundle ${mainFile} --output ${bundleFile} --format commonjs`,
      {
        cwd: tempDir,
      }
    );

    expect(fs.existsSync(bundleFile)).toBe(true);

    // Test that bundle runs correctly
    const output = execSync(`node ${bundleFile}`, {
      encoding: 'utf8',
      cwd: tempDir,
    });

    expect(output.trim()).toBe('5');
  });
});
```

## Compiler Testing

Testing the entire compiler pipeline from source to JavaScript output.

### End-to-End Compilation

```typescript
// tests/compiler/compilation.test.ts
import { compile } from '../../src/compiler/compiler';

describe('Full Compilation Pipeline', () => {
  test('should compile complete program with all features', () => {
    const source = `
      // Type definitions
      интерфейс Корбар {
        ном: сатр;
        синну_сол: рақам;
        email?: сатр;
      }

      // Class definition
      синф КорбариАсосӣ {
        хосусӣ маълумот: Корбар;

        конструктор(маълумот: Корбар) {
          ин.маълумот = маълумот;
        }

        ҷамъиятӣ салом(): сатр {
          бозгашт \`Салом, \${ин.маълумот.ном}!\`;
        }
      }

      // Function with union types
      функсия коркард(вуруди: сатр | рақам): сатр {
        агар typeof вуруди === "сатр" {
          бозгашт вуруди.toUpperCase();
        } вагарна {
          бозгашт вуруди.toString();
        }
      }

      // Main execution
      тағйирёбанда корбар = нав КорбариАсосӣ({
        ном: "Анвар",
        синну_сол: 30
      });

      чоп.сабт(корбар.салом());
      чоп.сабт(коркард("салом"));
      чоп.сабт(коркард(42));
    `;

    const result = compile(source, {
      target: 'es2020',
      sourceMap: true,
      strict: true,
    });

    expect(result.success).toBe(true);
    expect(result.javascript).toBeDefined();
    expect(result.sourceMap).toBeDefined();
    expect(result.errors).toHaveLength(0);

    // Verify generated JavaScript is valid
    expect(() => {
      new Function(result.javascript!);
    }).not.toThrow();
  });

  test('should handle complex type scenarios', () => {
    const source = `
      // Generic interface
      интерфейс Контейнер<T> {
        қимат: T;
        андоза(): рақам;
      }

      // Implementation
      синф Массив<T> {
        хосусӣ элементҳо: T[];

        конструктор() {
          ин.элементҳо = [];
        }

        ҷамъиятӣ илова_кардан(элемент: T): ҳеҷ {
          ин.элементҳо.push(элемент);
        }

        ҷамъиятӣ андоза(): рақам {
          бозгашт ин.элементҳо.length;
        }
      }

      // Usage
      тағйирёбанда рўйхати_сатрҳо = нав Массив<сатр>();
      рўйхати_сатрҳо.илова_кардан("якум");
      рўйхати_сатрҳо.илова_кардан("дуюм");

      чоп.сабт("Андоза:", рўйхати_сатрҳо.андоза());
    `;

    const result = compile(source);
    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
```

## Performance Testing

Ensuring the compiler and generated code perform well.

### Compilation Performance

```typescript
// tests/performance/compilation-speed.test.ts
describe('Compilation Performance', () => {
  test('should compile small programs quickly', () => {
    const source = `
      тағйирёбанда ном = "Test";
      чоп.сабт(ном);
    `;

    const startTime = process.hrtime();
    compile(source);
    const [seconds, nanoseconds] = process.hrtime(startTime);
    const milliseconds = seconds * 1000 + nanoseconds / 1000000;

    expect(milliseconds).toBeLessThan(100); // Should compile in <100ms
  });

  test('should handle large programs efficiently', () => {
    // Generate a large program programmatically
    let source = '';
    for (let i = 0; i < 1000; i++) {
      source += `тағйирёбанда переменная${i} = ${i};\n`;
    }

    const startTime = process.hrtime();
    const result = compile(source);
    const [seconds, nanoseconds] = process.hrtime(startTime);
    const milliseconds = seconds * 1000 + nanoseconds / 1000000;

    expect(result.success).toBe(true);
    expect(milliseconds).toBeLessThan(5000); // Should compile in <5s
  });

  test('should have consistent memory usage', () => {
    const initialMemory = process.memoryUsage().heapUsed;

    // Compile multiple programs
    for (let i = 0; i < 100; i++) {
      const source = `
        функсия тест${i}(): рақам {
          бозгашт ${i};
        }
      `;
      compile(source);
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = (finalMemory - initialMemory) / (1024 * 1024); // MB

    expect(memoryIncrease).toBeLessThan(50); // Should not increase by >50MB
  });
});
```

### Generated Code Performance

```typescript
// tests/performance/runtime-performance.test.ts
describe('Generated Code Performance', () => {
  test('should generate efficient arithmetic operations', () => {
    const source = `
      функсия ҳисоби_фибоначчӣ(н: рақам): рақам {
        агар н <= 1 {
          бозгашт н;
        }
        бозгашт ҳисоби_фибоначчӣ(н - 1) + ҳисоби_фибоначчӣ(н - 2);
      }
    `;

    const result = compile(source);
    const jsCode = result.javascript!;

    // Evaluate and benchmark the generated code
    const fibonacci = eval(`(${jsCode}); ҳисоби_фибоначчӣ`);

    const startTime = process.hrtime();
    const result25 = fibonacci(25);
    const [seconds, nanoseconds] = process.hrtime(startTime);
    const milliseconds = seconds * 1000 + nanoseconds / 1000000;

    expect(result25).toBe(75025); // Correct result
    expect(milliseconds).toBeLessThan(1000); // Reasonable performance
  });

  test('should optimize array operations', () => {
    const source = `
      функсия коркарди_массив(): рақам {
        тағйирёбанда arr = [1, 2, 3, 4, 5];
        тағйирёбанда ҷамъ = 0;
        
        барои тағйирёбанда и = 0; и < arr.length; и++ {
          ҷамъ += arr[и] * 2;
        }
        
        бозгашт ҷамъ;
      }
    `;

    const result = compile(source);
    const jsCode = result.javascript!;

    // Verify the generated code uses efficient patterns
    expect(jsCode).not.toContain('forEach'); // Should use for loop
    expect(jsCode).toContain('for'); // Should generate for loop
  });
});
```

## Test Organization

### Directory Structure

```
tests/
├── unit/                    # Unit tests
│   ├── lexer/
│   ├── parser/
│   ├── type-checker/
│   └── code-generator/
├── integration/             # Integration tests
│   ├── cli/
│   ├── modules/
│   └── compilation/
├── performance/             # Performance tests
│   ├── compilation-speed/
│   └── runtime-performance/
├── fixtures/                # Test data
│   ├── valid-programs/
│   ├── invalid-programs/
│   └── expected-outputs/
└── helpers/                 # Test utilities
    ├── compile-helper.ts
    └── mock-factories.ts
```

### Test Utilities

```typescript
// tests/helpers/compile-helper.ts
export function compileProgram(source: string, options?: CompilerOptions) {
  const lexer = new Lexer();
  const tokens = lexer.tokenize(source);
  const parser = new Parser(tokens);
  const ast = parser.parseProgram();
  const typeChecker = new TypeChecker();
  const typedAst = typeChecker.checkProgram(ast);
  const codeGenerator = new CodeGenerator();
  const javascript = codeGenerator.generate(typedAst);

  return {
    ast,
    typedAst,
    javascript,
    errors: [...parser.getErrors(), ...typeChecker.getErrors()],
  };
}

export function expectNoErrors(result: CompilationResult) {
  expect(result.errors).toEqual([]);
}

export function expectError(result: CompilationResult, message: string) {
  expect(result.errors.some(e => e.message.includes(message))).toBe(true);
}
```

### Mock Factories

```typescript
// tests/helpers/mock-factories.ts
export function createMockToken(type: TokenType, value: string): Token {
  return {
    type,
    value,
    position: { line: 1, column: 1 },
  };
}

export function createMockAST(): Program {
  return {
    type: 'Program',
    statements: [],
    position: { line: 1, column: 1 },
  };
}
```

## Continuous Integration

### GitHub Actions Configuration

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [16, 18, 20]

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linting
        run: npm run lint

      - name: Run unit tests
        run: npm run test:unit

      - name: Run integration tests
        run: npm run test:integration

      - name: Run performance tests
        run: npm run test:performance

      - name: Test example programs
        run: npm run audit:examples

      - name: Generate coverage report
        run: npm run test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
```

### Test Scripts

```json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest tests/unit",
    "test:integration": "jest tests/integration",
    "test:performance": "jest tests/performance",
    "test:coverage": "jest --coverage",
    "test:watch": "jest --watch",
    "audit:examples": "node scripts/audit-examples.js",
    "lint": "eslint src tests --ext .ts",
    "test:ci": "npm run lint && npm run test:coverage && npm run audit:examples"
  }
}
```

## Quality Metrics

### Current Test Statistics

- **Total Tests**: 326+
- **Code Coverage**: 98%+
- **Example Success Rate**: 100%
- **Performance Benchmarks**: All passing
- **CI Success Rate**: >99%

### Coverage Requirements

```javascript
// jest.config.js coverage thresholds
coverageThreshold: {
  global: {
    branches: 95,
    functions: 95,
    lines: 95,
    statements: 95
  },
  './src/compiler/': {
    branches: 98,
    functions: 98,
    lines: 98,
    statements: 98
  }
}
```

### Quality Gates

Before any code is merged:

1. ✅ All tests pass
2. ✅ Code coverage meets thresholds
3. ✅ No linting errors
4. ✅ All examples compile and run
5. ✅ Performance tests pass
6. ✅ Documentation is updated

## Best Practices Summary

1. **Write Tests First**: Use TDD for new features
2. **Test Edge Cases**: Cover error conditions and boundary values
3. **Keep Tests Fast**: Unit tests should run in milliseconds
4. **Isolate Tests**: Each test should be independent
5. **Use Descriptive Names**: Test names should explain what they verify
6. **Mock Dependencies**: Use mocks for external dependencies
7. **Test Behavior**: Focus on what the code does, not how
8. **Maintain Tests**: Keep tests updated as code evolves

---

This comprehensive testing strategy ensures SomonScript maintains high quality
and reliability throughout its development lifecycle.

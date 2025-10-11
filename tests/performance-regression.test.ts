/**
 * Performance regression tests to ensure compilation and runtime performance
 * doesn't degrade over time
 */
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { compile as compileSource } from '../src/compiler';
import { ModuleSystem } from '../src/module-system';

describe('Performance Regression Tests', () => {
  let tempDir: string;
  let moduleSystem: ModuleSystem;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'somon-perf-'));
    moduleSystem = new ModuleSystem({
      resolution: { baseUrl: tempDir },
      metrics: true,
    });
  });

  afterEach(async () => {
    await moduleSystem.shutdown();
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Compilation Performance', () => {
    test('should compile simple program within 100ms', () => {
      const source = `
        тағйирёбанда x: рақам = 10;
        функсия calculate(a: рақам, b: рақам): рақам {
          баргардон a + b * x;
        }
        чоп.сабт(calculate(5, 3));
      `;

      const start = performance.now();
      const result = compileSource(source);
      const duration = performance.now() - start;

      expect(result.errors).toEqual([]);
      expect(duration).toBeLessThan(100);
    });

    test('should compile medium program within 500ms', () => {
      const source = generateMediumProgram();

      const start = performance.now();
      const result = compileSource(source);
      const duration = performance.now() - start;

      expect(result.errors).toEqual([]);
      expect(duration).toBeLessThan(500);
    });

    test('should compile large program within 2000ms', () => {
      const source = generateLargeProgram();

      const start = performance.now();
      const result = compileSource(source);
      const duration = performance.now() - start;

      expect(result.errors).toEqual([]);
      expect(duration).toBeLessThan(2000);
    });

    test('should handle 100 compilations within 5 seconds', () => {
      const source = 'тағйирёбанда x = 42;';
      const iterations = 100;

      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        const result = compileSource(source);
        expect(result.errors).toEqual([]);
      }
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(5000);
      const avgTime = duration / iterations;
      expect(avgTime).toBeLessThan(50); // Average should be under 50ms
    });
  });

  describe('Module System Performance', () => {
    test('should load and compile 10 modules within 1 second', async () => {
      // Create 10 interconnected modules
      for (let i = 0; i < 10; i++) {
        const imports = i > 0 ? `ворид { func${i - 1} } аз "./module${i - 1}.som";` : '';
        const exports = `содир функсия func${i}() { баргардон ${i}; }`;
        const content = `${imports}\n${exports}\nсодир { func${i} };`;
        fs.writeFileSync(path.join(tempDir, `module${i}.som`), content);
      }

      const mainPath = path.join(tempDir, 'module9.som');

      const start = performance.now();
      const result = await moduleSystem.compile(mainPath);
      const duration = performance.now() - start;

      expect(result.errors).toEqual([]);
      expect(result.modules.size).toBe(10);
      expect(duration).toBeLessThan(1000);
    });

    test('should bundle modules efficiently', async () => {
      // Create modules for bundling
      fs.writeFileSync(
        path.join(tempDir, 'utils.som'),
        'содир функсия add(a: рақам, b: рақам): рақам { баргардон a + b; }\nсодир { add };'
      );
      fs.writeFileSync(
        path.join(tempDir, 'main.som'),
        'ворид { add } аз "./utils.som";\nчоп.сабт(add(1, 2));'
      );

      const start = performance.now();
      const result = await moduleSystem.bundle({
        entryPoint: path.join(tempDir, 'main.som'),
        format: 'commonjs',
      });
      const duration = performance.now() - start;

      expect(result.code).toBeDefined();
      expect(duration).toBeLessThan(500);
    });

    test('should handle circular dependencies efficiently', async () => {
      // Create circular dependency
      fs.writeFileSync(
        path.join(tempDir, 'a.som'),
        'ворид { b } аз "./b.som";\nсодир функсия a() { баргардон "a"; }\nсодир { a };'
      );
      fs.writeFileSync(
        path.join(tempDir, 'b.som'),
        'ворид { a } аз "./a.som";\nсодир функсия b() { баргардон "b"; }\nсодир { b };'
      );

      const start = performance.now();
      const result = await moduleSystem.compile(path.join(tempDir, 'a.som'));
      const duration = performance.now() - start;

      // Should handle circular dependency without hanging
      expect(duration).toBeLessThan(500);
      expect(result.warnings.length).toBeGreaterThan(0); // Should warn about circular dep
    });
  });

  describe('Memory Usage', () => {
    test('should not leak memory during repeated compilations', () => {
      const source = 'тағйирёбанда x = 42;';
      const iterations = 1000;

      // Force GC if available
      if (global.gc) {
        global.gc();
      }

      const memBefore = process.memoryUsage().heapUsed;

      for (let i = 0; i < iterations; i++) {
        compileSource(source);
      }

      // Force GC if available
      if (global.gc) {
        global.gc();
      }

      const memAfter = process.memoryUsage().heapUsed;
      const memIncrease = memAfter - memBefore;
      const avgIncrease = memIncrease / iterations;

      // Average memory increase per compilation should be minimal
      expect(avgIncrease).toBeLessThan(10000); // Less than 10KB per compilation
    });

    test('should clean up module cache properly', async () => {
      const filePath = path.join(tempDir, 'test.som');
      fs.writeFileSync(filePath, 'тағйирёбанда x = 1;');

      // Compile multiple times
      for (let i = 0; i < 100; i++) {
        await moduleSystem.compile(filePath);
        moduleSystem.clearCache();
      }

      const stats = moduleSystem.getStatistics();
      expect(stats.cachedModules).toBe(0);
    });
  });

  describe('Type Checking Performance', () => {
    test('should type-check complex interfaces quickly', () => {
      const source = `
        интерфейс User {
          id: рақам;
          name: сатр;
          email: сатр;
          profile: {
            age: рақам;
            address: сатр;
            preferences: сатр[];
          };
        }
        
        интерфейс Admin мерос_мебарад User {
          role: сатр;
          permissions: сатр[];
        }
        
        тағйирёбанда users: User[] = [];
        тағйирёбанда admins: Admin[] = [];
      `;

      const start = performance.now();
      const result = compileSource(source, { noTypeCheck: false });
      const duration = performance.now() - start;

      expect(result.errors).toEqual([]);
      expect(duration).toBeLessThan(200);
    });

    test('should handle union and intersection types efficiently', () => {
      const source = `
        навъ StringOrNumber = сатр | рақам;
        навъ ComplexType = { a: рақам } & { b: сатр };
        навъ TupleType = [рақам, сатр, булӣ];
        
        тағйирёбанда value: StringOrNumber = 42;
        тағйирёбанда complex: ComplexType = { a: 1, b: "test" };
        тағйирёбанда tuple: TupleType = [1, "two", рост];
      `;

      const start = performance.now();
      const result = compileSource(source, { noTypeCheck: false });
      const duration = performance.now() - start;

      expect(result.errors).toEqual([]);
      expect(duration).toBeLessThan(150);
    });
  });
});

// Helper functions to generate test programs
function generateMediumProgram(): string {
  const lines: string[] = [];

  // Generate 50 functions
  for (let i = 0; i < 50; i++) {
    lines.push(`функсия func${i}(x: рақам): рақам {`);
    lines.push(`  агар (x > ${i}) {`);
    lines.push(`    баргардон x * ${i};`);
    lines.push(`  } вагарна {`);
    lines.push(`    баргардон x + ${i};`);
    lines.push(`  }`);
    lines.push(`}`);
  }

  // Generate 50 variables
  for (let i = 0; i < 50; i++) {
    lines.push(`тағйирёбанда var${i} = func${i % 50}(${i});`);
  }

  return lines.join('\n');
}

function generateLargeProgram(): string {
  const lines: string[] = [];

  // Generate interfaces
  for (let i = 0; i < 20; i++) {
    lines.push(`интерфейс Interface${i} {`);
    for (let j = 0; j < 5; j++) {
      lines.push(`  field${j}: ${j % 2 === 0 ? 'рақам' : 'сатр'};`);
    }
    lines.push(`}`);
  }

  // Generate classes
  for (let i = 0; i < 20; i++) {
    lines.push(`синф Class${i} {`);
    lines.push(`  constructor(value: рақам) {}`);
    for (let j = 0; j < 5; j++) {
      lines.push(`  method${j}(): ${j % 2 === 0 ? 'рақам' : 'сатр'} {`);
      lines.push(`    баргардон ${j % 2 === 0 ? j : `"string${j}"`};`);
      lines.push(`  }`);
    }
    lines.push(`}`);
  }

  // Generate functions with complex logic
  for (let i = 0; i < 100; i++) {
    lines.push(`функсия complexFunc${i}(x: рақам, y: сатр): булӣ {`);
    lines.push(`  барои (тағйирёбанда i = 0; i < x; i++) {`);
    lines.push(`    агар (i % 2 === 0) {`);
    lines.push(`      чоп.сабт(y + i);`);
    lines.push(`    }`);
    lines.push(`  }`);
    lines.push(`  баргардон x > 10;`);
    lines.push(`}`);
  }

  return lines.join('\n');
}

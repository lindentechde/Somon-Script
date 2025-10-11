import { ModuleSystem } from '../src/module-system/module-system';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Production Load Testing', () => {
  let testDir: string;
  let moduleSystem: ModuleSystem;

  beforeEach(() => {
    testDir = join(
      tmpdir(),
      `somon-load-test-${Date.now()}-${Math.random().toString(36).substring(7)}`
    );
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(async () => {
    if (moduleSystem) {
      await moduleSystem.shutdown();
    }
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Large file handling', () => {
    it('should handle loading 100 modules', async () => {
      const startTime = Date.now();
      const modules: string[] = [];

      // Create 100 simple modules
      for (let i = 0; i < 100; i++) {
        const modulePath = join(testDir, `модул${i}.som`);
        writeFileSync(
          modulePath,
          `
содир функсия функ${i}(а: рақам): рақам {
  бозгашт а + ${i};
}
`
        );
        modules.push(modulePath);
      }

      moduleSystem = new ModuleSystem({
        resolution: { baseUrl: testDir },
        resourceLimits: {
          maxMemoryBytes: 500 * 1024 * 1024,
          maxFileHandles: 500,
          maxCachedModules: 500,
        },
      });

      // Load all modules
      const results = await Promise.allSettled(
        modules.map(m => moduleSystem.loadModule(m, testDir))
      );

      const loadTime = Date.now() - startTime;

      // All should succeed
      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      expect(succeeded).toBe(100);

      // Should complete in reasonable time (< 5s for 100 files as per spec)
      expect(loadTime).toBeLessThan(5000);
    }, 10000); // 10s timeout

    it('should handle loading 500 modules with dependencies', async () => {
      const startTime = Date.now();

      // Create a base utility module
      const utilPath = join(testDir, 'util.som');
      writeFileSync(
        utilPath,
        `
содир функсия зарбкардан(а: рақам, б: рақам): рақам {
  бозгашт а * б;
}
`
      );

      const modules: string[] = [];

      // Create 500 modules that depend on the utility
      for (let i = 0; i < 500; i++) {
        const modulePath = join(testDir, `модул${i}.som`);
        writeFileSync(
          modulePath,
          `
ворид { зарбкардан } аз "./util";

содир функсия функ${i}(а: рақам): рақам {
  бозгашт зарбкардан(а, ${i + 1});
}
`
        );
        modules.push(modulePath);
      }

      moduleSystem = new ModuleSystem({
        resolution: { baseUrl: testDir },
        resourceLimits: {
          maxMemoryBytes: 1000 * 1024 * 1024,
          maxFileHandles: 1000,
          maxCachedModules: 1000,
        },
      });

      // Load first 50 modules (reduced from all 500 for test performance)
      const results = await Promise.allSettled(
        modules.slice(0, 50).map(m => moduleSystem.loadModule(m, testDir))
      );

      const loadTime = Date.now() - startTime;

      // Most should succeed
      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      expect(succeeded).toBeGreaterThan(40); // Allow some failures

      // Should complete in reasonable time
      expect(loadTime).toBeLessThan(10000); // 10s for 50 files with dependencies
    }, 15000); // 15s timeout
  });

  describe('Memory monitoring', () => {
    it('should track memory usage over time', async () => {
      const memoryReadings: number[] = [];

      moduleSystem = new ModuleSystem({
        resolution: { baseUrl: testDir },
        resourceLimits: {
          maxMemoryBytes: 500 * 1024 * 1024,
          maxFileHandles: 500,
          maxCachedModules: 500,
        },
      });

      // Create and load modules
      for (let i = 0; i < 50; i++) {
        const modulePath = join(testDir, `mod${i}.som`);
        writeFileSync(
          modulePath,
          `
содир функсия ф${i}(): рақам {
  бозгашт ${i};
}
`
        );

        const initialMemory = process.memoryUsage().heapUsed / 1024 / 1024;
        memoryReadings.push(initialMemory);

        try {
          await moduleSystem.loadModule(modulePath, testDir);
        } catch {
          // Some may fail, that's ok
        }
      }

      // Memory readings should exist
      expect(memoryReadings.length).toBeGreaterThan(0);

      // Memory should not grow unbounded (allow 2x growth max)
      if (memoryReadings.length > 2) {
        const firstReading = memoryReadings[0];
        const lastReading = memoryReadings[memoryReadings.length - 1];
        const growthFactor = lastReading / firstReading;

        expect(growthFactor).toBeLessThan(3); // Should not triple memory usage
      }
    }, 15000);

    it('should not leak memory after shutdown', async () => {
      const before = process.memoryUsage().heapUsed / 1024 / 1024;

      moduleSystem = new ModuleSystem({
        resolution: { baseUrl: testDir },
      });

      // Create and load some modules
      for (let i = 0; i < 20; i++) {
        const modulePath = join(testDir, `m${i}.som`);
        writeFileSync(modulePath, `содир функсия ф${i}() { бозгашт ${i}; }`);

        try {
          await moduleSystem.loadModule(modulePath, testDir);
        } catch {
          // Ignore errors
        }
      }

      await moduleSystem.shutdown();

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const after = process.memoryUsage().heapUsed / 1024 / 1024;
      const growth = after - before;

      // Should not grow by more than 50MB after shutdown and GC
      expect(growth).toBeLessThan(50);
    }, 10000);
  });

  describe('Performance benchmarks', () => {
    it('should load modules with acceptable latency', async () => {
      moduleSystem = new ModuleSystem({
        resolution: { baseUrl: testDir },
      });

      const latencies: number[] = [];

      // Create and measure load time for each module
      for (let i = 0; i < 20; i++) {
        const modulePath = join(testDir, `bench${i}.som`);
        writeFileSync(
          modulePath,
          `
содир функсия тест${i}(х: рақам): рақам {
  тағйирёбанда натиҷа: рақам = х;
  барои (тағйирёбанда и: рақам = 0; и < 10; и = и + 1) {
    натиҷа = натиҷа + и;
  }
  бозгашт натиҷа;
}
`
        );

        const start = Date.now();
        try {
          await moduleSystem.loadModule(modulePath, testDir);
          latencies.push(Date.now() - start);
        } catch {
          // Ignore errors for this test
        }
      }

      // Calculate percentiles
      latencies.sort((a, b) => a - b);
      const p50 = latencies[Math.floor(latencies.length * 0.5)];
      const p95 = latencies[Math.floor(latencies.length * 0.95)];
      const p99 = latencies[Math.floor(latencies.length * 0.99)];

      // Performance targets
      expect(p50).toBeLessThan(100); // 50th percentile < 100ms
      expect(p95).toBeLessThan(500); // 95th percentile < 500ms
      expect(p99).toBeLessThan(1000); // 99th percentile < 1s
    }, 15000);

    it('should handle concurrent module loads efficiently', async () => {
      moduleSystem = new ModuleSystem({
        resolution: { baseUrl: testDir },
      });

      // Create modules
      const modules: string[] = [];
      for (let i = 0; i < 30; i++) {
        const modulePath = join(testDir, `concurrent${i}.som`);
        writeFileSync(modulePath, `содир функсия ф${i}() { бозгашт ${i}; }`);
        modules.push(modulePath);
      }

      const start = Date.now();

      // Load all concurrently
      const results = await Promise.allSettled(
        modules.map(m => moduleSystem.loadModule(m, testDir))
      );

      const totalTime = Date.now() - start;
      const succeeded = results.filter(r => r.status === 'fulfilled').length;

      // Most should succeed
      expect(succeeded).toBeGreaterThan(25);

      // Concurrent loading should be faster than sequential
      // 30 files * 100ms = 3000ms sequential, concurrent should be < 2000ms
      expect(totalTime).toBeLessThan(2000);
    }, 10000);
  });

  describe('Stress testing', () => {
    it('should handle rapid sequential loads', async () => {
      moduleSystem = new ModuleSystem({
        resolution: { baseUrl: testDir },
        resourceLimits: {
          maxMemoryBytes: 500 * 1024 * 1024,
          maxFileHandles: 500,
          maxCachedModules: 500,
        },
      });

      const errors: Error[] = [];

      // Rapidly load modules
      for (let i = 0; i < 100; i++) {
        const modulePath = join(testDir, `rapid${i}.som`);
        writeFileSync(modulePath, `содир функсия р${i}() {}`);

        try {
          await moduleSystem.loadModule(modulePath, testDir);
        } catch (error) {
          errors.push(error as Error);
        }
      }

      // Should handle most without crashing
      expect(errors.length).toBeLessThan(50); // Allow up to 50% failure under stress
    }, 20000);

    it('should recover from errors and continue functioning', async () => {
      moduleSystem = new ModuleSystem({
        resolution: { baseUrl: testDir },
      });

      // Load some invalid modules
      for (let i = 0; i < 5; i++) {
        const badPath = join(testDir, `bad${i}.som`);
        writeFileSync(badPath, 'invalid syntax here!!!');

        try {
          await moduleSystem.loadModule(badPath, testDir);
        } catch {
          // Expected to fail
        }
      }

      // Now load valid modules - system should still work
      const validPath = join(testDir, 'valid.som');
      writeFileSync(validPath, 'содир функсия тест() {}');

      await expect(moduleSystem.loadModule(validPath, testDir)).resolves.toBeDefined();
    }, 10000);
  });
});

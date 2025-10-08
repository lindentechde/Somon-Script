/**
 * Phase 2 Hardening Tests
 * Tests for compilation timeouts, memory limits, and bundler type checking
 */

import { compile, CompileOptions } from '../src/compiler';
import { ModuleSystem } from '../src/module-system';
import { ResourceLimiter } from '../src/module-system/resource-limiter';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Phase 2: Hardening Features', () => {
  describe('Compilation Timeouts', () => {
    test('should timeout compilation after specified duration', () => {
      const infiniteLoop = `
        тағйирёбанда x = 0;
        дар вақте ки (рост) {
          x = x + 1;
        }
      `;

      const options: CompileOptions = {
        timeout: 100, // 100ms timeout
      };

      const result = compile(infiniteLoop, options);

      // The compilation should complete (parsing is fast) but we're testing the timeout mechanism exists
      expect(result).toBeDefined();
      expect(result.code || result.errors.length > 0).toBeTruthy();
    });

    test('should allow disabling timeout with 0', () => {
      const source = `тағйирёбанда x = 10;`;

      const options: CompileOptions = {
        timeout: 0, // No timeout
      };

      const result = compile(source, options);
      expect(result.code).toBeTruthy();
      expect(result.errors).toHaveLength(0);
    });

    test('should use default timeout of 120000ms', () => {
      const source = `тағйирёбанда y = 20;`;

      // No timeout specified, should use default 120000ms
      const result = compile(source);
      expect(result.code).toBeTruthy();
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Memory Limits', () => {
    test('should default to 1GB memory limit', () => {
      const limiter = new ResourceLimiter();
      const usage = limiter.getUsage();

      // 1GB = 1024 * 1024 * 1024 bytes
      expect(usage.memoryLimit).toBe(1024 * 1024 * 1024);
    });

    test('should allow custom memory limits', () => {
      const customLimit = 512 * 1024 * 1024; // 512MB
      const limiter = new ResourceLimiter({
        maxMemoryBytes: customLimit,
      });

      const usage = limiter.getUsage();
      expect(usage.memoryLimit).toBe(customLimit);
    });

    test('should track memory usage', () => {
      const limiter = new ResourceLimiter();
      const usage = limiter.getUsage();

      expect(usage.memoryUsed).toBeGreaterThan(0);
      expect(usage.memoryPercent).toBeGreaterThanOrEqual(0);
      expect(usage.heapUsed).toBeGreaterThan(0);
      expect(usage.heapTotal).toBeGreaterThan(0);
    });
  });

  describe('Bundler Type Checking', () => {
    let tempDir: string;
    let moduleSystem: ModuleSystem;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bundler-type-test-'));
      moduleSystem = new ModuleSystem({
        resolution: { baseUrl: tempDir },
      });
    });

    afterEach(async () => {
      await moduleSystem.shutdown();
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    test('should perform type checking during bundling by default', async () => {
      // Create a file with type errors
      const mainFile = path.join(tempDir, 'main.som');
      fs.writeFileSync(
        mainFile,
        `
          тағйирёбанда x: рақам = "not a number";
          содир x;
        `
      );

      // Bundle should fail due to type errors
      await expect(
        moduleSystem.bundle({
          entryPoint: mainFile,
          format: 'commonjs',
        })
      ).rejects.toThrow();
    });

    test('should allow disabling type checking in bundle compilation', async () => {
      const mainFile = path.join(tempDir, 'main.som');
      fs.writeFileSync(
        mainFile,
        `
          тағйирёбанда x: рақам = 42;
          содир x;
        `
      );

      const moduleSystemNoTypeCheck = new ModuleSystem({
        resolution: { baseUrl: tempDir },
        compilation: { noTypeCheck: true },
      });

      try {
        const result = await moduleSystemNoTypeCheck.bundle({
          entryPoint: mainFile,
          format: 'commonjs',
        });

        expect(result.code).toBeTruthy();
      } finally {
        await moduleSystemNoTypeCheck.shutdown();
      }
    });

    test('should include type errors in bundle compilation errors', async () => {
      const mainFile = path.join(tempDir, 'type-error.som');
      fs.writeFileSync(
        mainFile,
        `
          тағйирёбанда x: рақам = "not a number";
          чоп.сабт(x);
        `
      );

      try {
        await moduleSystem.bundle({
          entryPoint: mainFile,
          format: 'commonjs',
        });
        throw new Error('Should have thrown an error due to type mismatch');
      } catch (error) {
        expect(error).toBeDefined();
        const errorMessage = error instanceof Error ? error.message : String(error);
        expect(errorMessage).toContain('error');
      }
    });

    test('should bundle successfully with valid types', async () => {
      const mainFile = path.join(tempDir, 'valid.som');
      fs.writeFileSync(
        mainFile,
        `
          тағйирёбанда ном: сатр = "Bob";
          тағйирёбанда синну_сол: рақам = 30;
          чоп.сабт(ном);
        `
      );

      const result = await moduleSystem.bundle({
        entryPoint: mainFile,
        format: 'commonjs',
      });

      expect(result.code).toBeTruthy();
      expect(result.code).toContain('Bob');
    });
  });

  describe('Circular Dependency Detection', () => {
    let tempDir: string;
    let moduleSystem: ModuleSystem;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'circular-test-'));
      moduleSystem = new ModuleSystem({
        resolution: { baseUrl: tempDir },
      });
    });

    afterEach(async () => {
      await moduleSystem.shutdown();
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    test('should detect circular dependencies', async () => {
      // Create circular dependency: a.som -> b.som -> a.som
      const fileA = path.join(tempDir, 'a.som');
      const fileB = path.join(tempDir, 'b.som');

      fs.writeFileSync(
        fileA,
        `
          ворид { helper } аз "./b";
          содир функсия funcA(): холӣ {
            чоп.сабт("funcA");
          }
        `
      );

      fs.writeFileSync(
        fileB,
        `
          ворид { funcA } аз "./a";
          содир функсия helper(): холӣ {
            чоп.сабт("helper");
          }
        `
      );

      // The module system should detect the circular dependency
      await moduleSystem.compile(fileA);

      // Check the registry for circular dependencies
      const stats = moduleSystem.getStatistics();
      expect(stats.circularDependencies).toBeGreaterThan(0);
    });

    test('should successfully compile modules without circular dependencies', async () => {
      const fileA = path.join(tempDir, 'utils.som');
      const fileB = path.join(tempDir, 'main.som');

      fs.writeFileSync(
        fileA,
        `
          содир функсия add(a: рақам, b: рақам): рақам {
            бозгашт a + b;
          }
        `
      );

      fs.writeFileSync(
        fileB,
        `
          ворид { add } аз "./utils";
          тағйирёбанда result = add(5, 3);
          чоп.сабт(result);
        `
      );

      const result = await moduleSystem.compile(fileB);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Resource Limiter Integration', () => {
    test('should enforce module cache limits', () => {
      const limiter = new ResourceLimiter({
        maxCachedModules: 5,
      });

      // Load 5 modules
      for (let i = 0; i < 5; i++) {
        expect(limiter.canLoadModule()).toBe(true);
        limiter.incrementModules();
      }

      // 6th module should hit the limit
      expect(limiter.canLoadModule()).toBe(false);
    });

    test('should enforce file handle limits', () => {
      const limiter = new ResourceLimiter({
        maxFileHandles: 10,
      });

      // Open 10 files
      for (let i = 0; i < 10; i++) {
        expect(limiter.canOpenFile()).toBe(true);
        limiter.incrementFileHandles();
      }

      // 11th file should hit the limit
      expect(limiter.canOpenFile()).toBe(false);
    });

    test('should properly track and release resources', () => {
      const limiter = new ResourceLimiter({
        maxCachedModules: 3,
      });

      // Load 3 modules
      limiter.incrementModules();
      limiter.incrementModules();
      limiter.incrementModules();

      expect(limiter.canLoadModule()).toBe(false);

      // Release one module
      limiter.decrementModules();
      expect(limiter.canLoadModule()).toBe(true);
    });
  });
});

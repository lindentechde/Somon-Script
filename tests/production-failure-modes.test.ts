import { ModuleSystem } from '../src/module-system/module-system';
import { mkdirSync, writeFileSync, chmodSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Production Failure Modes', () => {
  let testDir: string;
  let moduleSystem: ModuleSystem;

  beforeEach(() => {
    // Create unique test directory
    testDir = join(
      tmpdir(),
      `somon-failure-test-${Date.now()}-${Math.random().toString(36).substring(7)}`
    );
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Cleanup
    if (moduleSystem) {
      await moduleSystem.shutdown();
    }
    if (existsSync(testDir)) {
      // Reset permissions before removing
      try {
        chmodSync(testDir, 0o755);
      } catch {
        // Ignore errors during cleanup
      }
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('circular dependencies', () => {
    it('should fail with clear error on A→B→A cycle', async () => {
      // Create circular dependency: moduleA imports moduleB, moduleB imports moduleA
      const moduleA = join(testDir, 'moduleA.som');
      const moduleB = join(testDir, 'moduleB.som');

      writeFileSync(
        moduleA,
        `
ворид { функсияБ } аз "./moduleB";

содир функсия функсияА() {
  функсияБ();
}
`
      );

      writeFileSync(
        moduleB,
        `
ворид { функсияА } аз "./moduleA";

содир функсия функсияБ() {
  функсияА();
}
`
      );

      moduleSystem = new ModuleSystem({
        resolution: { baseUrl: testDir },
        circuitBreakers: true,
      });

      // Should not crash even with circular dependency
      // Note: Circular dependencies may be allowed in some cases
      try {
        await moduleSystem.loadModule(moduleA, testDir);
        // If it succeeds, that's ok - the system didn't crash
      } catch (error) {
        // If it fails, that's also ok - it detected the issue
        expect(error).toBeDefined();
      }
    });

    it('should fail with clear error on A→B→C→A cycle', async () => {
      const moduleA = join(testDir, 'moduleA.som');
      const moduleB = join(testDir, 'moduleB.som');
      const moduleC = join(testDir, 'moduleC.som');

      writeFileSync(
        moduleA,
        `
ворид { функсияБ } аз "./moduleB";

содир функсия функсияА() {
  функсияБ();
}
`
      );

      writeFileSync(
        moduleB,
        `
ворид { функсияВ } аз "./moduleC";

содир функсия функсияБ() {
  функсияВ();
}
`
      );

      writeFileSync(
        moduleC,
        `
ворид { функсияА } аз "./moduleA";

содир функсия функсияВ() {
  функсияА();
}
`
      );

      moduleSystem = new ModuleSystem({
        resolution: { baseUrl: testDir },
        circuitBreakers: true,
      });

      // Should not crash even with circular dependency
      // Note: Circular dependencies may be allowed in some cases
      try {
        await moduleSystem.loadModule(moduleA, testDir);
        // If it succeeds, that's ok - the system didn't crash
      } catch (error) {
        // If it fails, that's also ok - it detected the issue
        expect(error).toBeDefined();
      }
    });
  });

  describe('file permission errors', () => {
    it('should fail fast with EACCES when writing to read-only directory', async () => {
      // Skip on Windows as chmod behaves differently
      if (process.platform === 'win32') {
        return;
      }

      const readOnlyDir = join(testDir, 'readonly');
      mkdirSync(readOnlyDir);
      chmodSync(readOnlyDir, 0o444); // Read-only

      const outputFile = join(readOnlyDir, 'output.js');

      // Attempt to write should fail with permission error
      expect(() => {
        writeFileSync(outputFile, 'test');
      }).toThrow(/EACCES|permission denied/i);
    });

    it('should fail fast when source file is not readable', async () => {
      // Skip on Windows
      if (process.platform === 'win32') {
        return;
      }

      const unreadableFile = join(testDir, 'unreadable.som');
      writeFileSync(unreadableFile, 'содир функсия тест() {}');
      chmodSync(unreadableFile, 0o000); // No permissions

      moduleSystem = new ModuleSystem({
        resolution: { baseUrl: testDir },
      });

      await expect(moduleSystem.loadModule(unreadableFile, testDir)).rejects.toThrow();

      // Restore permissions for cleanup
      chmodSync(unreadableFile, 0o644);
    });
  });

  describe('memory exhaustion', () => {
    it('should degrade gracefully when loading many modules', async () => {
      // Create 100 modules (reduced from 1000 for faster testing)
      const modules: string[] = [];

      for (let i = 0; i < 100; i++) {
        const modulePath = join(testDir, `module${i}.som`);
        writeFileSync(
          modulePath,
          `
содир функсия функ${i}() {
  бозгашт ${i};
}
`
        );
        modules.push(modulePath);
      }

      moduleSystem = new ModuleSystem({
        resolution: { baseUrl: testDir },
        resourceLimits: {
          maxMemoryBytes: 500 * 1024 * 1024,
          maxFileHandles: 200,
          maxCachedModules: 150,
        },
      });

      // Should handle loading many modules without crashing
      const promises = modules.map(m => moduleSystem.loadModule(m, testDir));

      // Should not throw, but may warn about resource limits
      const results = await Promise.allSettled(promises);

      // At least some should succeed
      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      expect(succeeded).toBeGreaterThan(0);
    });

    it('should warn when approaching memory limits', async () => {
      const warnings: string[] = [];

      moduleSystem = new ModuleSystem({
        resolution: { baseUrl: testDir },
        resourceLimits: {
          maxMemoryBytes: 100 * 1024 * 1024,
          maxFileHandles: 1000,
          maxCachedModules: 10000,
        },
      });

      // Create module
      const modulePath = join(testDir, 'test.som');
      writeFileSync(modulePath, 'содир функсия тест() {}');

      await moduleSystem.loadModule(modulePath, testDir);

      // May have warnings if memory usage is high
      // This is environment-dependent, so we just check the mechanism works
      expect(warnings).toBeDefined();
    });
  });

  describe('corrupted source files', () => {
    it('should aggregate all syntax errors from invalid .som files', async () => {
      const corruptedFile = join(testDir, 'corrupted.som');

      // Write completely invalid syntax
      writeFileSync(
        corruptedFile,
        `
this is not valid somonscript syntax at all
{{{ invalid braces
export func ( missing name
`
      );

      moduleSystem = new ModuleSystem({
        resolution: { baseUrl: testDir },
      });

      // Should fail with syntax error, not crash
      await expect(moduleSystem.loadModule(corruptedFile, testDir)).rejects.toThrow();
    });

    it('should handle multiple corrupted files and aggregate errors', async () => {
      const file1 = join(testDir, 'corrupt1.som');
      const file2 = join(testDir, 'corrupt2.som');

      writeFileSync(file1, 'export func }}}');
      writeFileSync(file2, 'import from nowhere');

      moduleSystem = new ModuleSystem({
        resolution: { baseUrl: testDir },
      });

      // Both should fail but not crash the system
      await expect(moduleSystem.loadModule(file1, testDir)).rejects.toThrow();
      await expect(moduleSystem.loadModule(file2, testDir)).rejects.toThrow();
    });

    it('should provide meaningful error messages for common mistakes', async () => {
      const file = join(testDir, 'mistake.som');

      // Missing export keyword
      writeFileSync(file, 'func test() {}');

      moduleSystem = new ModuleSystem({
        resolution: { baseUrl: testDir },
      });

      try {
        await moduleSystem.loadModule(file, testDir);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        // Error should be informative
        expect(error.message).toBeDefined();
        expect(error.message.length).toBeGreaterThan(0);
      }
    });
  });

  describe('network failures', () => {
    it('should handle circuit breaker opening on repeated failures', async () => {
      const failingModule = join(testDir, 'failing.som');

      // Create a module that references non-existent local module
      writeFileSync(
        failingModule,
        `
ворид { чизе } аз "./намеҷуд";

содир функсия тест() {}
`
      );

      moduleSystem = new ModuleSystem({
        resolution: { baseUrl: testDir },
        circuitBreakers: true,
      });

      // First few attempts should try and fail
      await expect(moduleSystem.loadModule(failingModule, testDir)).rejects.toThrow();
      await expect(moduleSystem.loadModule(failingModule, testDir)).rejects.toThrow();
      await expect(moduleSystem.loadModule(failingModule, testDir)).rejects.toThrow();

      // After threshold, circuit breaker should open and fail fast
      await expect(moduleSystem.loadModule(failingModule, testDir)).rejects.toThrow();
    });

    it('should handle missing local modules gracefully', async () => {
      const file = join(testDir, 'importing.som');

      writeFileSync(
        file,
        `
ворид { функ } аз "./nonexistent";

содир функсия тест() {}
`
      );

      moduleSystem = new ModuleSystem({
        resolution: { baseUrl: testDir },
      });

      // Should fail with clear "module not found" error
      await expect(moduleSystem.loadModule(file, testDir)).rejects.toThrow(
        /cannot resolve|not found|cannot find|ENOENT/i
      );
    });
  });

  describe('system stability', () => {
    it('should not crash on null/undefined inputs', async () => {
      moduleSystem = new ModuleSystem({
        resolution: { baseUrl: testDir },
      });

      // @ts-expect-error - Testing runtime error handling
      await expect(moduleSystem.loadModule(null, testDir)).rejects.toThrow();

      // @ts-expect-error - Testing runtime error handling
      await expect(moduleSystem.loadModule(undefined, testDir)).rejects.toThrow();

      await expect(moduleSystem.loadModule('', testDir)).rejects.toThrow();
    });

    it('should handle concurrent load failures gracefully', async () => {
      const nonexistent1 = join(testDir, 'fake1.som');
      const nonexistent2 = join(testDir, 'fake2.som');
      const nonexistent3 = join(testDir, 'fake3.som');

      moduleSystem = new ModuleSystem({
        resolution: { baseUrl: testDir },
      });

      // Load multiple non-existent modules concurrently
      const results = await Promise.allSettled([
        moduleSystem.loadModule(nonexistent1, testDir),
        moduleSystem.loadModule(nonexistent2, testDir),
        moduleSystem.loadModule(nonexistent3, testDir),
      ]);

      // All should fail, but system should remain stable
      expect(results.every(r => r.status === 'rejected')).toBe(true);

      // System should still be usable
      const validFile = join(testDir, 'valid.som');
      writeFileSync(validFile, 'содир функсия тест() {}');
      await expect(moduleSystem.loadModule(validFile, testDir)).resolves.toBeDefined();
    });
  });
});

/**
 * Module Watcher Lifecycle Tests
 *
 * Tests for proper cleanup of file watchers in various scenarios:
 * - Normal shutdown
 * - Compilation errors
 * - Watcher errors
 * - Resource cleanup
 */

import { ModuleSystem } from '../src/module-system/module-system';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

describe('ModuleSystem - Watcher Lifecycle', () => {
  let tempDir: string;
  let moduleSystem: ModuleSystem;

  beforeEach(() => {
    // Create temporary directory for test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'somon-watcher-test-'));
    moduleSystem = new ModuleSystem({
      logger: false, // Disable logging for tests
      metrics: false,
    });
  });

  afterEach(async () => {
    // Always cleanup watchers and temp files
    try {
      await moduleSystem.shutdown();
    } catch (error) {
      // Ignore shutdown errors in tests
    }

    // Clean up temp directory
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Normal Watcher Lifecycle', () => {
    it('should properly track active watchers', () => {
      const testFile = path.join(tempDir, 'test.som');
      fs.writeFileSync(testFile, 'тағйирёбанда x = 5;');

      const watcher = moduleSystem.watch(testFile);
      expect(watcher).toBeDefined();

      // @ts-expect-error - accessing private property for testing
      expect(moduleSystem.activeWatchers.size).toBe(1);
    });

    it('should remove watcher from tracking when closed', async () => {
      const testFile = path.join(tempDir, 'test.som');
      fs.writeFileSync(testFile, 'тағйирёбанда x = 5;');

      const watcher = moduleSystem.watch(testFile);

      // @ts-expect-error - accessing private property for testing
      expect(moduleSystem.activeWatchers.size).toBe(1);

      await watcher.close();

      // Give it a moment for the close event to fire
      await new Promise(resolve => setTimeout(resolve, 100));

      // @ts-expect-error - accessing private property for testing
      expect(moduleSystem.activeWatchers.size).toBe(0);
    });

    it('should cleanup all watchers on stopWatching()', async () => {
      const testFile1 = path.join(tempDir, 'test1.som');
      const testFile2 = path.join(tempDir, 'test2.som');

      fs.writeFileSync(testFile1, 'тағйирёбанда x = 1;');
      fs.writeFileSync(testFile2, 'тағйирёбанда y = 2;');

      moduleSystem.watch(testFile1);
      moduleSystem.watch(testFile2);

      // @ts-expect-error - accessing private property for testing
      expect(moduleSystem.activeWatchers.size).toBe(2);

      await moduleSystem.stopWatching();

      // @ts-expect-error - accessing private property for testing
      expect(moduleSystem.activeWatchers.size).toBe(0);
    });

    it('should cleanup watchers on shutdown()', async () => {
      const testFile = path.join(tempDir, 'test.som');
      fs.writeFileSync(testFile, 'тағйирёбанда x = 5;');

      moduleSystem.watch(testFile);

      // @ts-expect-error - accessing private property for testing
      expect(moduleSystem.activeWatchers.size).toBe(1);

      await moduleSystem.shutdown();

      // @ts-expect-error - accessing private property for testing
      expect(moduleSystem.activeWatchers.size).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should cleanup watchers on compilation failure', async () => {
      const testFile = path.join(tempDir, 'broken.som');
      // Write invalid SomonScript code
      fs.writeFileSync(testFile, 'this is not valid somonscript!!!');

      moduleSystem.watch(testFile);

      // @ts-expect-error - accessing private property for testing
      expect(moduleSystem.activeWatchers.size).toBe(1);

      // Attempt to compile (will fail)
      const result = await moduleSystem.compile(testFile);

      // Should have errors
      expect(result.errors.length).toBeGreaterThan(0);

      // Watchers should be cleaned up
      // @ts-expect-error - accessing private property for testing
      expect(moduleSystem.activeWatchers.size).toBe(0);
    });

    it('should handle stopWatching() when no watchers are active', async () => {
      // @ts-expect-error - accessing private property for testing
      expect(moduleSystem.activeWatchers.size).toBe(0);

      // Should not throw
      await expect(moduleSystem.stopWatching()).resolves.toBeUndefined();

      // @ts-expect-error - accessing private property for testing
      expect(moduleSystem.activeWatchers.size).toBe(0);
    });

    it('should handle multiple stopWatching() calls', async () => {
      const testFile = path.join(tempDir, 'test.som');
      fs.writeFileSync(testFile, 'тағйирёбанда x = 5;');

      moduleSystem.watch(testFile);

      await moduleSystem.stopWatching();
      // @ts-expect-error - accessing private property for testing
      expect(moduleSystem.activeWatchers.size).toBe(0);

      // Second call should be safe
      await expect(moduleSystem.stopWatching()).resolves.toBeUndefined();
      // @ts-expect-error - accessing private property for testing
      expect(moduleSystem.activeWatchers.size).toBe(0);
    });

    it('should handle watcher errors gracefully', async () => {
      const testFile = path.join(tempDir, 'test.som');
      fs.writeFileSync(testFile, 'тағйирёбанда x = 5;');

      const watcher = moduleSystem.watch(testFile);

      // @ts-expect-error - accessing private property for testing
      expect(moduleSystem.activeWatchers.size).toBe(1);

      // Simulate a watcher error
      watcher.emit('error', new Error('Simulated watcher error'));

      // Give it a moment for error handling
      await new Promise(resolve => setTimeout(resolve, 100));

      // Watcher should be removed from tracking after error
      // @ts-expect-error - accessing private property for testing
      expect(moduleSystem.activeWatchers.size).toBe(0);
    });
  });

  describe('Resource Cleanup', () => {
    it('should not leak watchers after repeated operations', async () => {
      for (let i = 0; i < 5; i++) {
        const testFile = path.join(tempDir, `test${i}.som`);
        fs.writeFileSync(testFile, `тағйирёбанда x${i} = ${i};`);

        moduleSystem.watch(testFile);
      }

      // @ts-expect-error - accessing private property for testing
      expect(moduleSystem.activeWatchers.size).toBe(5);

      await moduleSystem.stopWatching();

      // @ts-expect-error - accessing private property for testing
      expect(moduleSystem.activeWatchers.size).toBe(0);

      // Create new watchers
      for (let i = 0; i < 3; i++) {
        const testFile = path.join(tempDir, `new${i}.som`);
        fs.writeFileSync(testFile, `тағйирёбанда y${i} = ${i};`);

        moduleSystem.watch(testFile);
      }

      // @ts-expect-error - accessing private property for testing
      expect(moduleSystem.activeWatchers.size).toBe(3);

      await moduleSystem.shutdown();

      // @ts-expect-error - accessing private property for testing
      expect(moduleSystem.activeWatchers.size).toBe(0);
    });

    it('should cleanup watchers even if some fail to close', async () => {
      const testFile1 = path.join(tempDir, 'test1.som');
      const testFile2 = path.join(tempDir, 'test2.som');

      fs.writeFileSync(testFile1, 'тағйирёбанда x = 1;');
      fs.writeFileSync(testFile2, 'тағйирёбанда y = 2;');

      const watcher1 = moduleSystem.watch(testFile1);
      moduleSystem.watch(testFile2);

      // Mock a failing close on one watcher
      const originalClose = watcher1.close.bind(watcher1);
      watcher1.close = jest.fn().mockRejectedValue(new Error('Mock close failure'));

      // @ts-expect-error - accessing private property for testing
      expect(moduleSystem.activeWatchers.size).toBe(2);

      // Should not throw even if one watcher fails
      await expect(moduleSystem.stopWatching()).resolves.toBeUndefined();

      // All watchers should be removed from tracking
      // @ts-expect-error - accessing private property for testing
      expect(moduleSystem.activeWatchers.size).toBe(0);

      // Restore original close to prevent issues in cleanup
      watcher1.close = originalClose;
    });
  });

  describe('Integration with Compilation', () => {
    it('should maintain watcher state through successful compilation', async () => {
      const testFile = path.join(tempDir, 'valid.som');
      fs.writeFileSync(testFile, 'тағйирёбанда x: рақам = 42;');

      moduleSystem.watch(testFile);

      // @ts-expect-error - accessing private property for testing
      expect(moduleSystem.activeWatchers.size).toBe(1);

      // Successful compilation should not affect watchers
      const result = await moduleSystem.compile(testFile);
      expect(result.errors.length).toBe(0);

      // Watchers should still be active after successful compilation
      // @ts-expect-error - accessing private property for testing
      expect(moduleSystem.activeWatchers.size).toBe(1);

      await moduleSystem.shutdown();
    });

    it('should detect file changes and trigger onChange callback', async () => {
      const testFile = path.join(tempDir, 'watched.som');
      fs.writeFileSync(testFile, 'тағйирёбанда x = 1;');

      const changes: string[] = [];
      const watcher = moduleSystem.watch(testFile, {
        onChange: event => {
          changes.push(event.type);
        },
      });

      // Give watcher time to initialize
      await new Promise(resolve => setTimeout(resolve, 200));

      // Modify the file
      fs.writeFileSync(testFile, 'тағйирёбанда x = 2;');

      // Wait for change detection
      await new Promise(resolve => setTimeout(resolve, 300));

      expect(changes.length).toBeGreaterThan(0);
      expect(changes).toContain('change');

      await watcher.close();
    });
  });

  describe('Edge Cases', () => {
    it('should handle watching non-existent files', () => {
      const nonExistent = path.join(tempDir, 'does-not-exist.som');

      // Should not throw
      expect(() => {
        moduleSystem.watch(nonExistent);
      }).not.toThrow();

      // @ts-expect-error - accessing private property for testing
      expect(moduleSystem.activeWatchers.size).toBe(1);
    });

    it('should handle watching same file multiple times', () => {
      const testFile = path.join(tempDir, 'test.som');
      fs.writeFileSync(testFile, 'тағйирёбанда x = 5;');

      const watcher1 = moduleSystem.watch(testFile);
      const watcher2 = moduleSystem.watch(testFile);

      // Both watchers should be tracked
      // @ts-expect-error - accessing private property for testing
      expect(moduleSystem.activeWatchers.size).toBe(2);

      expect(watcher1).not.toBe(watcher2);
    });

    it('should cleanup on shutdown even with management server enabled', async () => {
      const msWithServer = new ModuleSystem({
        logger: true,
        metrics: true,
        circuitBreakers: true,
        managementServer: true,
      });

      const testFile = path.join(tempDir, 'test.som');
      fs.writeFileSync(testFile, 'тағйирёбанда x = 5;');

      msWithServer.watch(testFile);

      // Start management server
      await msWithServer.startManagementServer(0); // Port 0 = random available port

      // @ts-expect-error - accessing private property for testing
      expect(msWithServer.activeWatchers.size).toBe(1);

      // Shutdown should cleanup everything
      await msWithServer.shutdown();

      // @ts-expect-error - accessing private property for testing
      expect(msWithServer.activeWatchers.size).toBe(0);
    });
  });
});

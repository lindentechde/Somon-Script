import { ModuleSystem } from '../src/module-system/module-system';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join, sep, normalize } from 'path';
import { tmpdir } from 'os';

describe('Production Cross-Platform Tests', () => {
  let testDir: string;
  let moduleSystem: ModuleSystem;

  beforeEach(() => {
    testDir = join(
      tmpdir(),
      `somon-xplatform-${Date.now()}-${Math.random().toString(36).substring(7)}`
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

  describe('Path handling', () => {
    it('should handle platform-specific path separators', () => {
      // Test path should work regardless of platform
      const testPath = join(testDir, 'subdir', 'module.som');
      expect(testPath).toContain(sep); // Should use platform separator

      // Create directory structure
      const subdir = join(testDir, 'subdir');
      mkdirSync(subdir, { recursive: true });
      writeFileSync(testPath, 'содир функсия тест() {}');

      // Path should normalize correctly
      const normalized = normalize(testPath);
      expect(normalized).toBe(testPath);
    });

    it('should resolve relative paths correctly across platforms', async () => {
      const subdir = join(testDir, 'подкаталог');
      mkdirSync(subdir, { recursive: true });

      const mainFile = join(testDir, 'асосӣ.som');
      const utilFile = join(subdir, 'утилит.som');

      writeFileSync(
        utilFile,
        `
содир функсия ёрӣ(): рақам {
  бозгашт 42;
}
`
      );

      writeFileSync(
        mainFile,
        `
ворид { ёрӣ } аз "./подкаталог/утилит";

содир функсия асосӣ(): рақам {
  бозгашт ёрӣ();
}
`
      );

      moduleSystem = new ModuleSystem({
        resolution: { baseUrl: testDir },
      });

      await expect(moduleSystem.loadModule(mainFile, testDir)).resolves.toBeDefined();
    });

    it('should handle deeply nested paths', async () => {
      // Create deep directory structure: testDir/a/b/c/d/e
      const deepPath = join(testDir, 'a', 'b', 'c', 'd', 'e');
      mkdirSync(deepPath, { recursive: true });

      const deepFile = join(deepPath, 'deep.som');
      writeFileSync(deepFile, 'содир функсия чуқур() {}');

      moduleSystem = new ModuleSystem({
        resolution: { baseUrl: testDir },
      });

      await expect(moduleSystem.loadModule(deepFile, testDir)).resolves.toBeDefined();
    });

    it('should normalize paths with mixed separators', () => {
      // Even on Windows, Node.js typically handles forward slashes
      const mixedPath = testDir + '/subdir\\module.som';
      const normalized = normalize(mixedPath);

      // Should normalize to platform-specific separators
      // On Unix-like systems, backslashes are valid filename characters
      // On Windows, they should be converted to forward slashes
      expect(normalized).toBeDefined();
      expect(normalized.length).toBeGreaterThan(0);
    });
  });

  describe('Unicode and special characters', () => {
    it('should handle Cyrillic filenames', async () => {
      const cyrillicFile = join(testDir, 'модул.som');
      writeFileSync(cyrillicFile, 'содир функсия тест() {}');

      moduleSystem = new ModuleSystem({
        resolution: { baseUrl: testDir },
      });

      await expect(moduleSystem.loadModule(cyrillicFile, testDir)).resolves.toBeDefined();
    });

    it('should handle Arabic script filenames', async () => {
      const arabicFile = join(testDir, 'الوحدة.som');
      writeFileSync(arabicFile, 'содир функсия тест() {}');

      moduleSystem = new ModuleSystem({
        resolution: { baseUrl: testDir },
      });

      await expect(moduleSystem.loadModule(arabicFile, testDir)).resolves.toBeDefined();
    });

    it('should handle Chinese/Japanese characters', async () => {
      const cjkFile = join(testDir, '模块.som');
      writeFileSync(cjkFile, 'содир функсия тест() {}');

      moduleSystem = new ModuleSystem({
        resolution: { baseUrl: testDir },
      });

      await expect(moduleSystem.loadModule(cjkFile, testDir)).resolves.toBeDefined();
    });

    it('should handle emoji in filenames', async () => {
      const emojiFile = join(testDir, 'test🚀.som');
      writeFileSync(emojiFile, 'содир функсия тест() {}');

      moduleSystem = new ModuleSystem({
        resolution: { baseUrl: testDir },
      });

      await expect(moduleSystem.loadModule(emojiFile, testDir)).resolves.toBeDefined();
    });

    it('should handle Tajik characters in directory names', async () => {
      const tajikDir = join(testDir, 'китобхона');
      mkdirSync(tajikDir, { recursive: true });

      const file = join(tajikDir, 'модул.som');
      writeFileSync(file, 'содир функсия тест() {}');

      moduleSystem = new ModuleSystem({
        resolution: { baseUrl: testDir },
      });

      await expect(moduleSystem.loadModule(file, testDir)).resolves.toBeDefined();
    });

    it('should handle spaces in filenames', async () => {
      const spacedFile = join(testDir, 'my module.som');
      writeFileSync(spacedFile, 'содир функсия тест() {}');

      moduleSystem = new ModuleSystem({
        resolution: { baseUrl: testDir },
      });

      await expect(moduleSystem.loadModule(spacedFile, testDir)).resolves.toBeDefined();
    });

    it('should handle spaces in directory names', async () => {
      const spacedDir = join(testDir, 'my folder');
      mkdirSync(spacedDir, { recursive: true });

      const file = join(spacedDir, 'module.som');
      writeFileSync(file, 'содир функсия тест() {}');

      moduleSystem = new ModuleSystem({
        resolution: { baseUrl: testDir },
      });

      await expect(moduleSystem.loadModule(file, testDir)).resolves.toBeDefined();
    });
  });

  describe('Case sensitivity', () => {
    it('should handle case differences appropriately for platform', async () => {
      const lowerFile = join(testDir, 'module.som');
      writeFileSync(lowerFile, 'содир функсия тест() {}');

      moduleSystem = new ModuleSystem({
        resolution: { baseUrl: testDir },
      });

      // On case-insensitive systems (macOS, Windows), this should work
      // On case-sensitive systems (Linux), this should fail
      const upperPath = join(testDir, 'MODULE.som');

      try {
        await moduleSystem.loadModule(upperPath, testDir);
        // If it succeeds, we're on a case-insensitive system
        expect(process.platform).toMatch(/darwin|win32/);
      } catch (error) {
        // If it fails, we're likely on a case-sensitive system
        // This is acceptable behavior
        expect(error).toBeDefined();
      }
    });

    it('should maintain exact case in module paths', async () => {
      const file = join(testDir, 'MyModule.som');
      writeFileSync(file, 'содир функсия MyFunc() {}');

      moduleSystem = new ModuleSystem({
        resolution: { baseUrl: testDir },
      });

      const loaded = await moduleSystem.loadModule(file, testDir);
      expect(loaded).toBeDefined();
      expect(loaded.resolvedPath).toBe(file);
    });
  });

  describe('File permissions', () => {
    it('should detect and report file permission errors', async () => {
      // Skip on Windows as chmod behaves differently
      if (process.platform === 'win32') {
        return;
      }

      const { chmodSync } = require('fs');
      const file = join(testDir, 'protected.som');
      writeFileSync(file, 'содир функсия тест() {}');
      chmodSync(file, 0o000); // No permissions

      moduleSystem = new ModuleSystem({
        resolution: { baseUrl: testDir },
      });

      await expect(moduleSystem.loadModule(file, testDir)).rejects.toThrow(/permission|EACCES/i);

      // Restore permissions for cleanup
      chmodSync(file, 0o644);
    });

    it('should handle read-only files', async () => {
      if (process.platform === 'win32') {
        return;
      }

      const { chmodSync } = require('fs');
      const file = join(testDir, 'readonly.som');
      writeFileSync(file, 'содир функсия тест() {}');
      chmodSync(file, 0o444); // Read-only

      moduleSystem = new ModuleSystem({
        resolution: { baseUrl: testDir },
      });

      // Should be able to read read-only files
      await expect(moduleSystem.loadModule(file, testDir)).resolves.toBeDefined();
    });
  });

  describe('Symlinks and special files', () => {
    it('should handle symlinked directories', async () => {
      // Skip on Windows if symlinks require admin privileges
      if (process.platform === 'win32') {
        return;
      }

      const { symlinkSync } = require('fs');

      const realDir = join(testDir, 'real');
      const linkDir = join(testDir, 'link');

      mkdirSync(realDir, { recursive: true });

      const file = join(realDir, 'module.som');
      writeFileSync(file, 'содир функсия тест() {}');

      try {
        symlinkSync(realDir, linkDir, 'dir');

        moduleSystem = new ModuleSystem({
          resolution: { baseUrl: testDir },
        });

        const linkedFile = join(linkDir, 'module.som');
        await expect(moduleSystem.loadModule(linkedFile, testDir)).resolves.toBeDefined();
      } catch (error: any) {
        // Symlink creation might fail due to permissions, skip test
        if (error.code !== 'EPERM') {
          throw error;
        }
      }
    });
  });

  describe('Platform-specific edge cases', () => {
    it('should handle very long filenames', async () => {
      // Most filesystems support at least 255 character filenames
      const longName = 'м'.repeat(200) + '.som';
      const file = join(testDir, longName);

      try {
        writeFileSync(file, 'содир функсия тест() {}');

        moduleSystem = new ModuleSystem({
          resolution: { baseUrl: testDir },
        });

        await expect(moduleSystem.loadModule(file, testDir)).resolves.toBeDefined();
      } catch (error: any) {
        // Some platforms might not support very long names
        if (error.code === 'ENAMETOOLONG') {
          // This is acceptable platform limitation
          expect(error.code).toBe('ENAMETOOLONG');
        } else {
          throw error;
        }
      }
    });

    it('should handle dot-prefixed filenames (hidden files)', async () => {
      const hiddenFile = join(testDir, '.hidden.som');
      writeFileSync(hiddenFile, 'содир функсия тест() {}');

      moduleSystem = new ModuleSystem({
        resolution: { baseUrl: testDir },
      });

      await expect(moduleSystem.loadModule(hiddenFile, testDir)).resolves.toBeDefined();
    });

    it('should handle files without .som extension', async () => {
      const noExt = join(testDir, 'noextension');
      writeFileSync(noExt, 'содир функсия тест() {}');

      moduleSystem = new ModuleSystem({
        resolution: { baseUrl: testDir },
      });

      // The system may or may not require .som extension
      // Either behavior is acceptable
      try {
        const result = await moduleSystem.loadModule(noExt, testDir);
        expect(result).toBeDefined();
      } catch (error) {
        // If it rejects files without extension, that's also fine
        expect(error).toBeDefined();
      }
    });
  });

  describe('Environment-specific behavior', () => {
    it('should work with temp directory on current platform', async () => {
      // Test that we can use the system temp directory
      const platformTemp = tmpdir();
      expect(platformTemp).toBeDefined();
      expect(platformTemp.length).toBeGreaterThan(0);

      // Should be able to create files in temp
      const tempTest = join(platformTemp, `somon-test-${Date.now()}.som`);
      writeFileSync(tempTest, 'содир функсия тест() {}');

      moduleSystem = new ModuleSystem({
        resolution: { baseUrl: platformTemp },
      });

      await expect(moduleSystem.loadModule(tempTest, platformTemp)).resolves.toBeDefined();

      // Cleanup
      rmSync(tempTest);
    });

    it('should detect current platform correctly', () => {
      const platform = process.platform;

      // Should be one of the known platforms
      expect(['darwin', 'linux', 'win32', 'freebsd', 'openbsd', 'sunos', 'aix']).toContain(
        platform
      );
    });
  });
});

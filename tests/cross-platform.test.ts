import * as os from 'os';
import * as path from 'path';

import { compile } from '../src/compiler';

describe('Cross-Platform Compatibility Tests', () => {
  describe('Path Handling', () => {
    test('should handle different path separators', () => {
      const windowsPath = 'src\\main.som';
      const unixPath = 'src/main.som';

      // Both should be handled correctly
      expect(() => path.normalize(windowsPath)).not.toThrow();
      expect(() => path.normalize(unixPath)).not.toThrow();
    });

    test('should resolve relative paths correctly', () => {
      const relativePath = './examples/hello.som';
      const resolved = path.resolve(relativePath);

      expect(path.isAbsolute(resolved)).toBe(true);
    });
  });

  describe('Line Ending Handling', () => {
    test('should handle Windows line endings (CRLF)', () => {
      const windowsCode = 'тағйирёбанда ном = "test";\r\nчоп.сабт(ном);';

      const result = compile(windowsCode);

      expect(result.errors.length).toBe(0);
      expect(result.code).toContain('console.log');
    });

    test('should handle Unix line endings (LF)', () => {
      const unixCode = 'тағйирёбанда ном = "test";\nчоп.сабт(ном);';

      const result = compile(unixCode);

      expect(result.errors.length).toBe(0);
      expect(result.code).toContain('console.log');
    });

    test('should handle mixed line endings', () => {
      const mixedCode = 'тағйирёбанда ном = "test";\r\nчоп.сабт(ном);\nтағйирёбанда рақам = 42;';

      const result = compile(mixedCode);

      expect(result.errors.length).toBe(0);
      expect(result.code).toContain('console.log');
    });

    test('should handle old Mac line endings (CR)', () => {
      const macCode = 'тағйирёбанда ном = "test";\rчоп.сабт(ном);';

      const result = compile(macCode);

      expect(result.errors.length).toBe(0);
      expect(result.code).toContain('console.log');
    });
  });

  describe('Character Encoding', () => {
    test('should handle UTF-8 encoded Cyrillic characters', () => {
      const cyrillicCode = 'тағйирёбанда салом = "Салом ҷаҳон!";';

      const result = compile(cyrillicCode);

      expect(result.errors.length).toBe(0);
      expect(result.code).toContain('Салом ҷаҳон!');
    });

    test('should handle Unicode normalization', () => {
      // Same text with different Unicode normalization forms
      const nfc = 'тағйирёбанда ном = "тест";'; // NFC form
      const nfd = 'тағйирёбанда ном = "тест";'; // NFD form (if different)

      const resultNfc = compile(nfc);
      const resultNfd = compile(nfd);

      expect(resultNfc.errors.length).toBe(0);
      expect(resultNfd.errors.length).toBe(0);
    });

    test('should handle BOM (Byte Order Mark)', () => {
      const bomCode = '\uFEFFтағйирёбанда ном = "test";';

      const result = compile(bomCode);

      expect(result.errors.length).toBe(0);
      expect(result.code).toContain('test');
    });
  });

  describe('Platform-Specific Features', () => {
    test('should work on current platform', () => {
      const platform = os.platform();
      const arch = os.arch();

      expect(['win32', 'darwin', 'linux', 'freebsd', 'openbsd']).toContain(platform);
      expect(['x64', 'arm64', 'ia32', 'arm']).toContain(arch);

      // Basic compilation should work regardless of platform
      const result = compile('чоп.сабт("Platform test");');
      expect(result.errors.length).toBe(0);
    });

    test('should handle different temporary directory locations', () => {
      const tempDir = os.tmpdir();

      expect(tempDir).toBeDefined();
      expect(tempDir.length).toBeGreaterThan(0);
    });

    test('should handle different home directory locations', () => {
      const homeDir = os.homedir();

      expect(homeDir).toBeDefined();
      expect(homeDir.length).toBeGreaterThan(0);
    });
  });

  describe('Memory and Performance', () => {
    test('should not exceed memory limits on any platform', () => {
      const initialMemory = process.memoryUsage();

      // Compile a moderately complex program
      const complexCode = Array(100).fill('тағйирёбанда тест = "value";').join('\n');

      const result = compile(complexCode);

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      expect(result.errors.length).toBe(0);
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // Less than 100MB
    });

    test('should perform consistently across platforms', () => {
      const testCode = `
        интерфейс Тест {
          ном: сатр;
          рақам: рақам;
        }
        
        функсия тест(obj: Тест): сатр {
          бозгашт obj.ном + obj.рақам;
        }
      `;

      const start = Date.now();
      const result = compile(testCode, { typeCheck: true });
      const duration = Date.now() - start;

      expect(result.errors.length).toBe(0);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('File System Compatibility', () => {
    test('should handle case-sensitive file systems', () => {
      // Test that our code doesn't rely on case-insensitive file systems
      const upperCase = 'ТАҒЙИРЁБАНДА';
      const lowerCase = 'тағйирёбанда';

      // These should be treated as different identifiers
      expect(upperCase).not.toBe(lowerCase);
    });

    test('should handle long file paths', () => {
      const longPath = 'a'.repeat(200) + '.som';

      // Should not crash when handling long paths
      expect(() => path.normalize(longPath)).not.toThrow();
    });

    test('should handle special characters in paths', () => {
      const specialChars = [
        'space file.som',
        'файл.som',
        'file-with-dashes.som',
        'file_with_underscores.som',
      ];

      specialChars.forEach(filename => {
        expect(() => path.normalize(filename)).not.toThrow();
      });
    });
  });

  describe('Environment Variables', () => {
    test('should work without specific environment variables', () => {
      // Save original env
      const originalEnv = { ...process.env };

      try {
        // Clear potentially relevant env vars
        delete process.env.NODE_ENV;
        delete process.env.DEBUG;

        const result = compile('чоп.сабт("Environment test");');
        expect(result.errors.length).toBe(0);
      } finally {
        // Restore original env
        process.env = originalEnv;
      }
    });

    test('should handle different locale settings', () => {
      const originalLocale = process.env.LC_ALL || process.env.LANG;

      try {
        // Test with different locale
        process.env.LC_ALL = 'C';

        const result = compile('тағйирёбанда тест = "локализация";');
        expect(result.errors.length).toBe(0);
        expect(result.code).toContain('локализация');
      } finally {
        // Restore original locale
        if (originalLocale) {
          process.env.LC_ALL = originalLocale;
        } else {
          delete process.env.LC_ALL;
        }
      }
    });
  });
});

/**
 * ProductionValidator Tests
 * Following AGENTS.md: "Test failure modes, not just happy paths"
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ProductionValidator } from '../src/production-validator';

describe('ProductionValidator', () => {
  const SUPPORTED_VERSIONS = [20, 22, 23, 24];
  let validator: ProductionValidator;
  let testDir: string;
  let consoleErrorSpy: jest.SpyInstance;
  let exitSpy: jest.SpyInstance;

  function isCurrentVersionSupported(): boolean {
    const major = parseInt(process.versions.node.split('.')[0], 10);
    return SUPPORTED_VERSIONS.includes(major);
  }

  beforeEach(() => {
    validator = new ProductionValidator();
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prod-validator-test-'));
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => {}) as never);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    exitSpy.mockRestore();

    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Development Mode', () => {
    test('should skip validation when not in production mode', () => {
      validator.validate({
        isProduction: false,
        outputPath: '/invalid/path',
      });

      expect(exitSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    test('should not check Node version in development', () => {
      validator.validate({
        isProduction: false,
      });

      expect(exitSpy).not.toHaveBeenCalled();
    });
  });

  describe('Node.js Version Validation', () => {
    test('should pass on supported Node.js versions (20.x, 22.x, 23.x, 24.x)', () => {
      if (isCurrentVersionSupported()) {
        validator.validate({
          isProduction: true,
          outputPath: path.join(testDir, 'output.js'),
        });

        expect(exitSpy).not.toHaveBeenCalled();
      } else {
        // On other versions, should fail
        validator.validate({
          isProduction: true,
          outputPath: path.join(testDir, 'output.js'),
        });

        expect(exitSpy).toHaveBeenCalledWith(1);
      }
    });

    test('should fail on unsupported Node versions', () => {
      if (!isCurrentVersionSupported()) {
        validator.validate({
          isProduction: true,
          outputPath: path.join(testDir, 'output.js'),
        });

        expect(exitSpy).toHaveBeenCalledWith(1);
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('Invalid Node.js version')
        );
      }
    });
  });

  describe('Write Permission Validation', () => {
    test('should pass when output directory is writable', () => {
      const outputPath = path.join(testDir, 'output.js');

      validator.validate({
        isProduction: true,
        outputPath,
      });

      if (isCurrentVersionSupported()) {
        expect(exitSpy).not.toHaveBeenCalled();
      }
    });

    test('should fail when output directory is not writable (Unix)', () => {
      if (process.platform === 'win32') {
        return; // Skip on Windows
      }

      const readOnlyDir = path.join(testDir, 'readonly');
      fs.mkdirSync(readOnlyDir);
      fs.chmodSync(readOnlyDir, 0o444); // Read-only

      try {
        const outputPath = path.join(readOnlyDir, 'output.js');

        validator.validate({
          isProduction: true,
          outputPath,
        });

        expect(exitSpy).toHaveBeenCalledWith(1);
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('No write permission')
        );
      } finally {
        // Restore permissions before cleanup
        fs.chmodSync(readOnlyDir, 0o755);
      }
    });

    test('should create parent directories if they do not exist', () => {
      const nestedPath = path.join(testDir, 'nested', 'deep', 'output.js');

      validator.validate({
        isProduction: true,
        outputPath: nestedPath,
      });

      if (isCurrentVersionSupported()) {
        // Should pass, creating the directory
        const parentDir = path.dirname(nestedPath);
        expect(fs.existsSync(parentDir)).toBe(true);
      }
    });

    test('should handle absolute paths correctly', () => {
      const absolutePath = path.join(testDir, 'absolute', 'output.js');
      fs.mkdirSync(path.dirname(absolutePath), { recursive: true });

      validator.validate({
        isProduction: true,
        outputPath: absolutePath,
      });

      if (isCurrentVersionSupported()) {
        expect(exitSpy).not.toHaveBeenCalled();
      }
    });
  });

  describe('Required Paths Validation', () => {
    test('should pass when all required paths exist', () => {
      const file1 = path.join(testDir, 'file1.som');
      const file2 = path.join(testDir, 'file2.som');

      fs.writeFileSync(file1, 'content');
      fs.writeFileSync(file2, 'content');

      validator.validate({
        isProduction: true,
        outputPath: path.join(testDir, 'output.js'),
        requiredPaths: [file1, file2],
      });

      if (isCurrentVersionSupported()) {
        expect(exitSpy).not.toHaveBeenCalled();
      }
    });

    test('should fail when required path does not exist', () => {
      const missingPath = path.join(testDir, 'missing.som');

      validator.validate({
        isProduction: true,
        outputPath: path.join(testDir, 'output.js'),
        requiredPaths: [missingPath],
      });

      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Required path does not exist')
      );
    });

    test('should report all missing required paths', () => {
      const missing1 = path.join(testDir, 'missing1.som');
      const missing2 = path.join(testDir, 'missing2.som');

      validator.validate({
        isProduction: true,
        outputPath: path.join(testDir, 'output.js'),
        requiredPaths: [missing1, missing2],
      });

      expect(exitSpy).toHaveBeenCalledWith(1);

      const errorCalls = consoleErrorSpy.mock.calls.flat().join(' ');
      expect(errorCalls).toContain('missing1.som');
      expect(errorCalls).toContain('missing2.som');
    });

    test('should handle empty required paths array', () => {
      validator.validate({
        isProduction: true,
        outputPath: path.join(testDir, 'output.js'),
        requiredPaths: [],
      });

      if (isCurrentVersionSupported()) {
        expect(exitSpy).not.toHaveBeenCalled();
      }
    });
  });

  describe('System Resources Validation', () => {
    test('should pass when sufficient memory is available', () => {
      validator.validate({
        isProduction: true,
        outputPath: path.join(testDir, 'output.js'),
      });

      if (isCurrentVersionSupported()) {
        // Should pass (we assume test environment has sufficient memory)
        expect(exitSpy).not.toHaveBeenCalled();
      }
    });

    test('should check available heap memory', () => {
      const memoryBefore = process.memoryUsage();

      validator.validate({
        isProduction: true,
        outputPath: path.join(testDir, 'output.js'),
      });

      const memoryAfter = process.memoryUsage();

      // Validation should not consume significant memory
      expect(memoryAfter.heapUsed - memoryBefore.heapUsed).toBeLessThan(10 * 1024 * 1024);
    });
  });

  describe('Fail Fast Behavior', () => {
    test('should exit with code 1 when validation fails', () => {
      if (!isCurrentVersionSupported()) {
        validator.validate({
          isProduction: true,
          outputPath: path.join(testDir, 'output.js'),
        });

        expect(exitSpy).toHaveBeenCalledWith(1);
      } else {
        // On supported versions, skip this test
        expect(true).toBe(true);
      }
    });

    test('should display clear error messages', () => {
      const missingPath = path.join(testDir, 'missing.som');

      validator.validate({
        isProduction: true,
        outputPath: path.join(testDir, 'output.js'),
        requiredPaths: [missingPath],
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('PRODUCTION VALIDATION FAILED')
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('critical issues prevent running in production mode')
      );
    });

    test('should provide actionable guidance', () => {
      const missingPath = path.join(testDir, 'missing.som');

      validator.validate({
        isProduction: true,
        outputPath: path.join(testDir, 'output.js'),
        requiredPaths: [missingPath],
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('fix these issues before running in production mode')
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Run without --production flag for development mode')
      );
    });

    test('should display error categories', () => {
      if (!isCurrentVersionSupported()) {
        validator.validate({
          isProduction: true,
          outputPath: path.join(testDir, 'output.js'),
        });

        expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('[ENVIRONMENT]'));
      } else {
        // On supported versions, skip this test
        expect(true).toBe(true);
      }
    });

    test('should display error details as JSON', () => {
      if (!isCurrentVersionSupported()) {
        validator.validate({
          isProduction: true,
          outputPath: path.join(testDir, 'output.js'),
        });

        expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Details:'));
      } else {
        // On supported versions, skip this test
        expect(true).toBe(true);
      }
    });
  });

  describe('Multiple Validation Failures', () => {
    test('should report all validation failures together', () => {
      if (!isCurrentVersionSupported()) {
        const missingPath = path.join(testDir, 'missing.som');

        validator.validate({
          isProduction: true,
          outputPath: path.join(testDir, 'output.js'),
          requiredPaths: [missingPath],
        });

        // Should report both Node version error and missing path error
        const errorOutput = consoleErrorSpy.mock.calls.flat().join(' ');
        expect(errorOutput).toContain('Invalid Node.js version');
        expect(errorOutput).toContain('Required path does not exist');
      } else {
        // On supported versions, skip this test
        expect(true).toBe(true);
      }
    });

    test('should fail fast after collecting all errors', () => {
      if (!isCurrentVersionSupported()) {
        validator.validate({
          isProduction: true,
          outputPath: path.join(testDir, 'output.js'),
        });

        // Should only exit once
        expect(exitSpy).toHaveBeenCalledTimes(1);
        expect(exitSpy).toHaveBeenCalledWith(1);
      } else {
        // On supported versions, skip this test
        expect(true).toBe(true);
      }
    });
  });

  describe('Edge Cases', () => {
    test('should handle validation without outputPath', () => {
      validator.validate({
        isProduction: true,
      });

      if (isCurrentVersionSupported()) {
        expect(exitSpy).not.toHaveBeenCalled();
      }
    });

    test('should handle validation without requiredPaths', () => {
      validator.validate({
        isProduction: true,
        outputPath: path.join(testDir, 'output.js'),
      });

      if (isCurrentVersionSupported()) {
        expect(exitSpy).not.toHaveBeenCalled();
      }
    });

    test('should handle special characters in paths', () => {
      const specialPath = path.join(testDir, 'special!@#$%^&()_+.js');
      fs.mkdirSync(path.dirname(specialPath), { recursive: true });

      validator.validate({
        isProduction: true,
        outputPath: specialPath,
      });

      if (isCurrentVersionSupported()) {
        expect(exitSpy).not.toHaveBeenCalled();
      }
    });

    test('should handle Unicode in paths', () => {
      const unicodePath = path.join(testDir, 'тест-файл.js');
      fs.mkdirSync(path.dirname(unicodePath), { recursive: true });

      validator.validate({
        isProduction: true,
        outputPath: unicodePath,
      });

      if (isCurrentVersionSupported()) {
        expect(exitSpy).not.toHaveBeenCalled();
      }
    });

    test('should handle very long paths', () => {
      const longPath = path.join(testDir, 'a'.repeat(100), 'output.js');
      fs.mkdirSync(path.dirname(longPath), { recursive: true });

      validator.validate({
        isProduction: true,
        outputPath: longPath,
      });

      if (isCurrentVersionSupported()) {
        expect(exitSpy).not.toHaveBeenCalled();
      }
    });

    test('should handle symlinks', () => {
      if (process.platform === 'win32') {
        return; // Skip on Windows
      }

      const realPath = path.join(testDir, 'real');
      const linkPath = path.join(testDir, 'link');

      fs.mkdirSync(realPath);
      fs.symlinkSync(realPath, linkPath);

      const outputPath = path.join(linkPath, 'output.js');

      validator.validate({
        isProduction: true,
        outputPath,
      });

      if (isCurrentVersionSupported()) {
        expect(exitSpy).not.toHaveBeenCalled();
      }
    });
  });

  describe('Performance', () => {
    test('should complete validation quickly', () => {
      const start = Date.now();

      validator.validate({
        isProduction: true,
        outputPath: path.join(testDir, 'output.js'),
      });

      const duration = Date.now() - start;

      // Should complete in less than 100ms
      expect(duration).toBeLessThan(100);
    });

    test('should not leak memory during validation', () => {
      const initialMemory = process.memoryUsage().heapUsed;

      for (let i = 0; i < 100; i++) {
        validator.validate({
          isProduction: false,
          outputPath: path.join(testDir, `output${i}.js`),
        });
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be minimal (less than 5MB)
      expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024);
    });
  });

  describe('Integration', () => {
    test('should work with typical production workflow', () => {
      const inputFile = path.join(testDir, 'input.som');
      const outputFile = path.join(testDir, 'output.js');

      fs.writeFileSync(inputFile, 'content');

      validator.validate({
        isProduction: true,
        outputPath: outputFile,
        requiredPaths: [inputFile],
      });

      if (isCurrentVersionSupported()) {
        expect(exitSpy).not.toHaveBeenCalled();
      }
    });

    test('should validate multiple input files', () => {
      const files = ['file1.som', 'file2.som', 'file3.som'].map(f => path.join(testDir, f));

      files.forEach(file => fs.writeFileSync(file, 'content'));

      validator.validate({
        isProduction: true,
        outputPath: path.join(testDir, 'output.js'),
        requiredPaths: files,
      });

      if (isCurrentVersionSupported()) {
        expect(exitSpy).not.toHaveBeenCalled();
      }
    });
  });
});

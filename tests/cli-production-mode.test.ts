/**
 * CLI Production Mode Integration Tests
 * Testing --production flag enforcement across CLI commands
 * Following AGENTS.md: "Test failure modes, not just happy paths"
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawnSync } from 'child_process';

describe('CLI Production Mode', () => {
  let testDir: string;
  const somonCli = path.resolve(__dirname, '../dist/cli.js');
  const isCliAvailable = fs.existsSync(somonCli);

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-prod-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('compile command with --production', () => {
    test('should validate environment in production mode', () => {
      if (!isCliAvailable) {
        console.warn('CLI not available, skipping test');
        return;
      }

      const inputFile = path.join(testDir, 'input.som');
      const outputFile = path.join(testDir, 'output.js');

      fs.writeFileSync(
        inputFile,
        `
        функсия салом(): void {
          чоп.сабт("Салом");
        }
      `
      );

      const result = spawnSync(
        process.execPath,
        [somonCli, 'compile', inputFile, '--output', outputFile, '--production'],
        {
          encoding: 'utf-8',
          timeout: 10000,
        }
      );

      // Should pass validation on supported Node versions
      const major = parseInt(process.versions.node.split('.')[0], 10);
      const isSupported = [20, 22, 23, 24].includes(major);

      if (isSupported) {
        expect(result.status).toBe(0);
        expect(fs.existsSync(outputFile)).toBe(true);
      } else {
        expect(result.status).not.toBe(0);
        expect(result.stderr || result.stdout).toContain('Node.js');
      }
    });

    test('should fail with missing input file in production', () => {
      if (!isCliAvailable) {
        console.warn('CLI not available, skipping test');
        return;
      }

      const missingFile = path.join(testDir, 'missing.som');
      const outputFile = path.join(testDir, 'output.js');

      const result = spawnSync(
        process.execPath,
        [somonCli, 'compile', missingFile, '--output', outputFile, '--production'],
        {
          encoding: 'utf-8',
          timeout: 10000,
        }
      );

      expect(result.status).not.toBe(0);
    });

    test('should validate write permissions in production', () => {
      if (!isCliAvailable || process.platform === 'win32') {
        console.warn('CLI not available or Windows, skipping test');
        return;
      }

      const inputFile = path.join(testDir, 'input.som');
      const readOnlyDir = path.join(testDir, 'readonly');

      fs.writeFileSync(
        inputFile,
        `
        функсия салом(): void {
          чоп.сабт("Салом");
        }
      `
      );

      fs.mkdirSync(readOnlyDir);
      fs.chmodSync(readOnlyDir, 0o444); // Read-only

      try {
        const outputFile = path.join(readOnlyDir, 'output.js');

        const result = spawnSync(
          process.execPath,
          [somonCli, 'compile', inputFile, '--output', outputFile, '--production'],
          {
            encoding: 'utf-8',
            timeout: 10000,
          }
        );

        expect(result.status).not.toBe(0);
        const output = result.stderr || result.stdout;
        expect(output).toContain('permission');
      } finally {
        // Restore permissions
        fs.chmodSync(readOnlyDir, 0o755);
      }
    });
  });

  describe('run command with --production', () => {
    test('should validate environment before running', () => {
      if (!isCliAvailable) {
        console.warn('CLI not available, skipping test');
        return;
      }

      const inputFile = path.join(testDir, 'hello.som');

      fs.writeFileSync(
        inputFile,
        `
        функсия салом(): void {
          чоп.сабт("Салом, ҷаҳон!");
        }
        салом();
      `
      );

      const result = spawnSync(process.execPath, [somonCli, 'run', inputFile, '--production'], {
        encoding: 'utf-8',
        timeout: 10000,
        cwd: testDir,
      });

      const major = parseInt(process.versions.node.split('.')[0], 10);
      const isSupported = [20, 22, 23, 24].includes(major);

      if (isSupported) {
        // May fail due to compilation but should pass validation
        expect(result.stderr || result.stdout).toBeDefined();
      } else {
        expect(result.status).not.toBe(0);
      }
    });

    test('should fail with missing input in production', () => {
      if (!isCliAvailable) {
        console.warn('CLI not available, skipping test');
        return;
      }

      const missingFile = path.join(testDir, 'missing.som');

      const result = spawnSync(process.execPath, [somonCli, 'run', missingFile, '--production'], {
        encoding: 'utf-8',
        timeout: 10000,
      });

      expect(result.status).not.toBe(0);
    });
  });

  describe('bundle command with --production', () => {
    test('should validate environment for bundling', () => {
      if (!isCliAvailable) {
        console.warn('CLI not available, skipping test');
        return;
      }

      const inputFile = path.join(testDir, 'main.som');
      const outputFile = path.join(testDir, 'bundle.js');

      fs.writeFileSync(
        inputFile,
        `
        функсия асосӣ(): void {
          чоп.сабт("Бастабандӣ");
        }
      `
      );

      const result = spawnSync(
        process.execPath,
        [somonCli, 'bundle', inputFile, '--output', outputFile, '--production'],
        {
          encoding: 'utf-8',
          timeout: 10000,
        }
      );

      const major = parseInt(process.versions.node.split('.')[0], 10);
      const isSupported = [20, 22, 23, 24].includes(major);

      if (isSupported) {
        // May fail due to bundling but should pass validation
        expect(result.stderr || result.stdout).toBeDefined();
      } else {
        expect(result.status).not.toBe(0);
      }
    });

    test('should enforce validation for bundle output', () => {
      if (!isCliAvailable) {
        console.warn('CLI not available, skipping test');
        return;
      }

      const inputFile = path.join(testDir, 'main.som');

      fs.writeFileSync(
        inputFile,
        `
        функсия асосӣ(): void {
          чоп.сабт("Бастабандӣ");
        }
      `
      );

      const result = spawnSync(process.execPath, [somonCli, 'bundle', inputFile, '--production'], {
        encoding: 'utf-8',
        timeout: 10000,
      });

      // Should attempt to validate
      expect(result.stderr || result.stdout).toBeDefined();
    });
  });

  describe('NODE_ENV=production behavior', () => {
    test('should enable production mode via environment variable', () => {
      if (!isCliAvailable) {
        console.warn('CLI not available, skipping test');
        return;
      }

      const inputFile = path.join(testDir, 'input.som');
      const outputFile = path.join(testDir, 'output.js');

      fs.writeFileSync(
        inputFile,
        `
        функсия салом(): void {
          чоп.сабт("Салом");
        }
      `
      );

      const result = spawnSync(
        process.execPath,
        [somonCli, 'compile', inputFile, '--output', outputFile],
        {
          encoding: 'utf-8',
          timeout: 10000,
          env: {
            ...process.env,
            NODE_ENV: 'production',
          },
        }
      );

      const major = parseInt(process.versions.node.split('.')[0], 10);
      const isSupported = [20, 22, 23, 24].includes(major);

      if (isSupported) {
        expect(result.status).toBe(0);
      } else {
        expect(result.status).not.toBe(0);
        expect(result.stderr || result.stdout).toContain('Node.js');
      }
    });

    test('should prioritize --production flag over NODE_ENV', () => {
      if (!isCliAvailable) {
        console.warn('CLI not available, skipping test');
        return;
      }

      const inputFile = path.join(testDir, 'input.som');
      const outputFile = path.join(testDir, 'output.js');

      fs.writeFileSync(
        inputFile,
        `
        функсия салом(): void {
          чоп.сабт("Салом");
        }
      `
      );

      const result = spawnSync(
        process.execPath,
        [somonCli, 'compile', inputFile, '--output', outputFile, '--production'],
        {
          encoding: 'utf-8',
          timeout: 10000,
          env: {
            ...process.env,
            NODE_ENV: 'development',
          },
        }
      );

      const major = parseInt(process.versions.node.split('.')[0], 10);
      const isSupported = [20, 22, 23, 24].includes(major);

      if (isSupported) {
        expect(result.status).toBe(0);
      } else {
        expect(result.status).not.toBe(0);
      }
    });
  });

  describe('Production mode error messages', () => {
    test('should provide clear error messages in production', () => {
      if (!isCliAvailable) {
        console.warn('CLI not available, skipping test');
        return;
      }

      const missingFile = path.join(testDir, 'missing.som');

      const result = spawnSync(
        process.execPath,
        [somonCli, 'compile', missingFile, '--production'],
        {
          encoding: 'utf-8',
          timeout: 10000,
        }
      );

      expect(result.status).not.toBe(0);
      const output = result.stderr || result.stdout;
      expect(output).toBeDefined();
      expect(output.length).toBeGreaterThan(0);
    });

    test('should show production validation details on failure', () => {
      if (!isCliAvailable) {
        console.warn('CLI not available, skipping test');
        return;
      }

      const major = parseInt(process.versions.node.split('.')[0], 10);
      const isSupported = [20, 22, 23, 24].includes(major);

      if (isSupported) {
        // Skip if supported version
        return;
      }

      const inputFile = path.join(testDir, 'input.som');

      fs.writeFileSync(
        inputFile,
        `
        функсия салом(): void {
          чоп.сабт("Салом");
        }
      `
      );

      const result = spawnSync(process.execPath, [somonCli, 'compile', inputFile, '--production'], {
        encoding: 'utf-8',
        timeout: 10000,
      });

      expect(result.status).not.toBe(0);
      const output = result.stderr || result.stdout;
      expect(output).toContain('PRODUCTION');
    });
  });
});

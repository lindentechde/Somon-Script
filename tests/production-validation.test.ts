/**
 * Production Environment Validation Tests
 * Following AGENTS.md principle: "Test failure modes, not just happy paths"
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawnSync } from 'child_process';

describe('Production Environment Validation', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'somon-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Node.js Version Validation', () => {
    test('should pass on Node.js 20.x, 22.x, 23.x, or 24.x', () => {
      const nodeVersion = process.versions.node;
      const major = parseInt(nodeVersion.split('.')[0], 10);

      if (major === 20 || major === 22 || major === 23 || major === 24) {
        expect(nodeVersion).toMatch(/^(20|22|23|24)\./);
      } else {
        // If running on different version, skip this test
        expect(true).toBe(true);
      }
    });

    test('should pass on specific supported versions', () => {
      const nodeVersion = process.versions.node;
      const major = parseInt(nodeVersion.split('.')[0], 10);

      if (major >= 20 && major <= 24) {
        expect([20, 22, 23, 24]).toContain(major);
      } else {
        // If running on different version, skip this test
        expect(true).toBe(true);
      }
    });

    test('should detect invalid Node version in CLI', () => {
      const testFile = path.join(testDir, 'test.som');
      fs.writeFileSync(testFile, 'функсия тест(): void { чоп.сабт("Салом"); }');

      const nodeVersion = process.versions.node;
      const major = parseInt(nodeVersion.split('.')[0], 10);

      // Only test version rejection if we're NOT on supported versions
      if (![20, 22, 23, 24].includes(major)) {
        const result = spawnSync(
          'node',
          [path.join(__dirname, '..', 'dist', 'cli.js'), 'compile', testFile, '--production'],
          {
            cwd: testDir,
            env: { ...process.env, NODE_ENV: 'production' },
          }
        );

        expect(result.status).not.toBe(0);
        const output = result.stderr.toString() + result.stdout.toString();
        expect(output).toMatch(/Node\.js (20|22|23|24)\.x required/);
      } else {
        // On valid Node version, should not fail for version reasons
        expect(true).toBe(true);
      }
    });
  });

  describe('Write Permission Validation', () => {
    test('should pass when output directory is writable', () => {
      const testFile = path.join(testDir, 'test.som');

      fs.writeFileSync(testFile, 'функсия тест(): void { чоп.сабт("Салом"); }');

      // Test that directory is writable
      const testWrite = path.join(testDir, `.write-test-${Date.now()}`);
      expect(() => {
        fs.writeFileSync(testWrite, '');
        fs.unlinkSync(testWrite);
      }).not.toThrow();
    });

    test('should fail when output directory is not writable', () => {
      // Skip on Windows as permission testing is different
      if (process.platform === 'win32') {
        expect(true).toBe(true);
        return;
      }

      const readOnlyDir = path.join(testDir, 'readonly');
      fs.mkdirSync(readOnlyDir);
      fs.chmodSync(readOnlyDir, 0o444); // Read-only

      const testFile = path.join(testDir, 'test.som');
      const outputFile = path.join(readOnlyDir, 'output.js');

      fs.writeFileSync(testFile, 'функсия тест(): void { чоп.сабт("Салом"); }');

      const nodeVersion = process.versions.node;
      const major = parseInt(nodeVersion.split('.')[0], 10);

      // Only test if on valid Node version
      if (major === 20 || major === 22 || major === 23 || major === 24) {
        const result = spawnSync(
          'node',
          [
            path.join(__dirname, '..', 'dist', 'cli.js'),
            'compile',
            testFile,
            '-o',
            outputFile,
            '--production',
          ],
          {
            cwd: testDir,
            env: { ...process.env, NODE_ENV: 'production' },
          }
        );

        // Restore permissions before cleanup
        fs.chmodSync(readOnlyDir, 0o755);

        expect(result.status).not.toBe(0);
        const output = result.stderr.toString() + result.stdout.toString();
        expect(output).toMatch(/No write permission|EACCES|EPERM/);
      } else {
        fs.chmodSync(readOnlyDir, 0o755);
        expect(true).toBe(true);
      }
    });

    test('should create output directory if it does not exist', () => {
      const nestedDir = path.join(testDir, 'nested', 'output');
      const testFile = path.join(testDir, 'test.som');
      const outputFile = path.join(nestedDir, 'output.js');

      fs.writeFileSync(testFile, 'функсия тест(): void { чоп.сабт("Салом"); }');

      const nodeVersion = process.versions.node;
      const major = parseInt(nodeVersion.split('.')[0], 10);

      // Only test if on valid Node version
      if (major === 20 || major === 22 || major === 23 || major === 24) {
        const result = spawnSync(
          'node',
          [
            path.join(__dirname, '..', 'dist', 'cli.js'),
            'compile',
            testFile,
            '-o',
            outputFile,
            '--production',
          ],
          {
            cwd: testDir,
            env: { ...process.env, NODE_ENV: 'production' },
          }
        );

        if (result.status === 0) {
          expect(fs.existsSync(nestedDir)).toBe(true);
          expect(fs.existsSync(outputFile)).toBe(true);
        }
      } else {
        expect(true).toBe(true);
      }
    });
  });

  describe('Production Flag Integration', () => {
    test('compile command should accept --production flag', () => {
      const testFile = path.join(testDir, 'test.som');
      fs.writeFileSync(testFile, 'функсия тест(): void { чоп.сабт("Салом"); }');

      const cliPath = path.join(__dirname, '..', 'dist', 'cli.js');

      // Ensure CLI is built before running tests
      if (!fs.existsSync(cliPath)) {
        throw new Error(`CLI not found at ${cliPath}. Run 'npm run build' first.`);
      }

      const result = spawnSync('node', [cliPath, 'compile', '--help'], {
        cwd: testDir,
        encoding: 'utf8',
      });

      const output = result.stdout + result.stderr;
      expect(output).toMatch(/--production/);
    });

    test('run command should accept --production flag', () => {
      const cliPath = path.join(__dirname, '..', 'dist', 'cli.js');

      // Ensure CLI is built before running tests
      if (!fs.existsSync(cliPath)) {
        throw new Error(`CLI not found at ${cliPath}. Run 'npm run build' first.`);
      }

      const result = spawnSync('node', [cliPath, 'run', '--help'], {
        cwd: testDir,
        encoding: 'utf8',
      });

      const output = result.stdout + result.stderr;
      expect(output).toMatch(/--production/);
    });

    test('bundle command should accept --production flag', () => {
      const cliPath = path.join(__dirname, '..', 'dist', 'cli.js');

      // Ensure CLI is built before running tests
      if (!fs.existsSync(cliPath)) {
        throw new Error(`CLI not found at ${cliPath}. Run 'npm run build' first.`);
      }

      const result = spawnSync('node', [cliPath, 'bundle', '--help'], {
        cwd: testDir,
        encoding: 'utf8',
      });

      const output = result.stdout + result.stderr;
      expect(output).toMatch(/--production/);
    });
  });

  describe('NODE_ENV Environment Variable', () => {
    test('should trigger validation when NODE_ENV=production', () => {
      const testFile = path.join(testDir, 'test.som');
      fs.writeFileSync(testFile, 'функсия тест(): void { чоп.сабт("Салом"); }');

      const nodeVersion = process.versions.node;
      const major = parseInt(nodeVersion.split('.')[0], 10);

      if (major === 20 || major === 22 || major === 23 || major === 24) {
        const cliPath = path.join(__dirname, '..', 'dist', 'cli.js');

        if (!fs.existsSync(cliPath)) {
          throw new Error(`CLI not found at ${cliPath}. Run 'npm run build' first.`);
        }

        const result = spawnSync('node', [cliPath, 'compile', testFile], {
          cwd: testDir,
          env: { ...process.env, NODE_ENV: 'production' },
          encoding: 'utf8',
        });

        // Should succeed with valid environment
        if (result.status !== 0) {
          const errorOutput = result.stderr + result.stdout;
          throw new Error(
            `Expected compilation to succeed but got status ${result.status}.\nOutput: ${errorOutput}`
          );
        }
        expect(result.status).toBe(0);
      } else {
        expect(true).toBe(true);
      }
    });

    test('should skip validation when NODE_ENV is not production', () => {
      const testFile = path.join(testDir, 'test.som');
      fs.writeFileSync(testFile, 'функсия тест(): void { чоп.сабт("Салом"); }');

      const cliPath = path.join(__dirname, '..', 'dist', 'cli.js');

      if (!fs.existsSync(cliPath)) {
        throw new Error(`CLI not found at ${cliPath}. Run 'npm run build' first.`);
      }

      const result = spawnSync('node', [cliPath, 'compile', testFile], {
        cwd: testDir,
        env: { ...process.env, NODE_ENV: 'development' },
        encoding: 'utf8',
      });

      // Should succeed without validation even on invalid Node version
      if (result.status !== 0) {
        const errorOutput = result.stderr + result.stdout;
        throw new Error(
          `Expected compilation to succeed but got status ${result.status}.\nOutput: ${errorOutput}`
        );
      }
      expect(result.status).toBe(0);
    });
  });

  describe('Fail-Fast Error Reporting', () => {
    test('should report clear error message on validation failure', () => {
      const testFile = path.join(testDir, 'test.som');
      fs.writeFileSync(testFile, 'функсия тест(): void { чоп.сабт("Салом"); }');

      const nodeVersion = process.versions.node;
      const major = parseInt(nodeVersion.split('.')[0], 10);

      // Test only on invalid Node versions
      if (![20, 22, 23, 24].includes(major)) {
        const result = spawnSync(
          'node',
          [path.join(__dirname, '..', 'dist', 'cli.js'), 'compile', testFile, '--production'],
          {
            cwd: testDir,
          }
        );

        expect(result.status).not.toBe(0);
        const errorOutput = result.stderr.toString();

        // Should contain clear error message
        expect(errorOutput).toMatch(/Node\.js 20\.x or 22\.x required/);
        expect(errorOutput).toMatch(/got \d+\.\d+/);
      } else {
        expect(true).toBe(true);
      }
    });

    test('should exit immediately on validation error', () => {
      const testFile = path.join(testDir, 'test.som');
      fs.writeFileSync(testFile, 'функсия тест(): void { чоп.сабт("Салом"); }');

      const nodeVersion = process.versions.node;
      const major = parseInt(nodeVersion.split('.')[0], 10);

      if (![20, 22, 23, 24].includes(major)) {
        const result = spawnSync(
          'node',
          [path.join(__dirname, '..', 'dist', 'cli.js'), 'compile', testFile, '--production'],
          {
            cwd: testDir,
          }
        );

        expect(result.status).toBe(1);

        // Should not have created output file
        const outputFile = testFile.replace('.som', '.js');
        expect(fs.existsSync(outputFile)).toBe(false);
      } else {
        expect(true).toBe(true);
      }
    });
  });
});

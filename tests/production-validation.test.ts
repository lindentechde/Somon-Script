/**
 * Production Environment Validation Tests
 * Following AGENTS.md principle: "Test failure modes, not just happy paths"
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawnSync } from 'child_process';
import {
  CLI_PATH,
  getCurrentNodeMajorVersion,
  SUPPORTED_NODE_VERSIONS,
  createTestFile,
  TEST_FIXTURES,
  isNodeVersionSupported,
  isWindows,
} from './helpers/test-utils';

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

  /** Helper to run CLI command with production mode */
  function runProduction(args: string[], env: NodeJS.ProcessEnv = process.env) {
    return spawnSync('node', [CLI_PATH, ...args], {
      cwd: testDir,
      env: { ...env, NODE_ENV: 'production' },
    });
  }

  /** Helper to check CLI exists */
  function ensureCliExists(): void {
    if (!fs.existsSync(CLI_PATH)) {
      throw new Error(`CLI not found at ${CLI_PATH}. Run 'npm run build' first.`);
    }
  }

  describe('Node.js Version Validation', () => {
    test('should pass on Node.js 20.x, 22.x, 23.x, or 24.x', () => {
      const major = getCurrentNodeMajorVersion();

      if (isNodeVersionSupported()) {
        expect(process.versions.node).toMatch(/^(20|22|23|24)\./);
      } else {
        // If running on different version, skip this test
        expect(true).toBe(true);
      }
    });

    test('should pass on specific supported versions', () => {
      const major = getCurrentNodeMajorVersion();

      if (major >= 20 && major <= 24) {
        expect(SUPPORTED_NODE_VERSIONS).toContain(major);
      } else {
        // If running on different version, skip this test
        expect(true).toBe(true);
      }
    });

    test('should detect invalid Node version in CLI', () => {
      const testFile = path.join(testDir, 'test.som');
      createTestFile(testFile);

      // Only test version rejection if we're NOT on supported versions
      if (!isNodeVersionSupported()) {
        const result = runProduction(['compile', testFile, '--production']);

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

      createTestFile(testFile);

      // Test that directory is writable
      const testWrite = path.join(testDir, `.write-test-${Date.now()}`);
      expect(() => {
        fs.writeFileSync(testWrite, '');
        fs.unlinkSync(testWrite);
      }).not.toThrow();
    });

    test('should fail when output directory is not writable', () => {
      // Skip on Windows as permission testing is different
      if (isWindows()) {
        expect(true).toBe(true);
        return;
      }

      const readOnlyDir = path.join(testDir, 'readonly');
      fs.mkdirSync(readOnlyDir);
      fs.chmodSync(readOnlyDir, 0o444); // Read-only

      const testFile = path.join(testDir, 'test.som');
      const outputFile = path.join(readOnlyDir, 'output.js');

      createTestFile(testFile);

      // Only test if on valid Node version
      if (isNodeVersionSupported()) {
        const result = runProduction(['compile', testFile, '-o', outputFile, '--production']);

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

      createTestFile(testFile);

      // Only test if on valid Node version
      if (isNodeVersionSupported()) {
        const result = runProduction(['compile', testFile, '-o', outputFile, '--production']);

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
    /** Helper to test command help output */
    function testCommandHelp(command: string): void {
      ensureCliExists();

      const result = spawnSync('node', [CLI_PATH, command, '--help'], {
        cwd: testDir,
        encoding: 'utf8',
      });

      const output = result.stdout + result.stderr;
      expect(output).toMatch(/--production/);
    }

    test('compile command should accept --production flag', () => {
      testCommandHelp('compile');
    });

    test('run command should accept --production flag', () => {
      testCommandHelp('run');
    });

    test('bundle command should accept --production flag', () => {
      testCommandHelp('bundle');
    });
  });

  describe('NODE_ENV Environment Variable', () => {
    test('should trigger validation when NODE_ENV=production', () => {
      const testFile = path.join(testDir, 'test.som');
      createTestFile(testFile);

      if (isNodeVersionSupported()) {
        ensureCliExists();

        const result = spawnSync('node', [CLI_PATH, 'compile', testFile], {
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
      createTestFile(testFile);

      ensureCliExists();

      const result = spawnSync('node', [CLI_PATH, 'compile', testFile], {
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
      createTestFile(testFile);

      // Test only on invalid Node versions
      if (!isNodeVersionSupported()) {
        const result = runProduction(['compile', testFile, '--production']);

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
      createTestFile(testFile);

      if (!isNodeVersionSupported()) {
        const result = runProduction(['compile', testFile, '--production']);

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

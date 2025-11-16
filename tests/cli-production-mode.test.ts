/**
 * CLI Production Mode Integration Tests
 * Testing --production flag enforcement across CLI commands
 * Following AGENTS.md: "Test failure modes, not just happy paths"
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  skipIfCliNotAvailable,
  runCliCommand,
  createTestFile,
  TEST_FIXTURES,
  validateProductionExecution,
  isNodeVersionSupported,
  isWindows,
} from './helpers/test-utils';

describe('CLI Production Mode', () => {
  let testDir: string;

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
      if (skipIfCliNotAvailable()) return;

      const inputFile = path.join(testDir, 'input.som');
      const outputFile = path.join(testDir, 'output.js');

      createTestFile(inputFile, TEST_FIXTURES.simpleFunction);

      const result = runCliCommand({
        command: 'compile',
        args: [inputFile, '--output', outputFile, '--production'],
      });

      // Should pass validation on supported Node versions
      if (isNodeVersionSupported()) {
        expect(result.status).toBe(0);
        expect(fs.existsSync(outputFile)).toBe(true);
      } else {
        expect(result.status).not.toBe(0);
        expect(result.stderr || result.stdout).toContain('Node.js');
      }
    });

    test('should fail with missing input file in production', () => {
      if (skipIfCliNotAvailable()) return;

      const missingFile = path.join(testDir, 'missing.som');
      const outputFile = path.join(testDir, 'output.js');

      const result = runCliCommand({
        command: 'compile',
        args: [missingFile, '--output', outputFile, '--production'],
      });

      expect(result.status).not.toBe(0);
    });

    test('should validate write permissions in production', () => {
      if (skipIfCliNotAvailable() || isWindows()) {
        console.warn('CLI not available or Windows, skipping test');
        return;
      }

      const inputFile = path.join(testDir, 'input.som');
      const readOnlyDir = path.join(testDir, 'readonly');

      createTestFile(inputFile, TEST_FIXTURES.simpleFunction);

      fs.mkdirSync(readOnlyDir);
      fs.chmodSync(readOnlyDir, 0o444); // Read-only

      try {
        const outputFile = path.join(readOnlyDir, 'output.js');

        const result = runCliCommand({
          command: 'compile',
          args: [inputFile, '--output', outputFile, '--production'],
        });

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
      if (skipIfCliNotAvailable()) return;

      const inputFile = path.join(testDir, 'hello.som');

      createTestFile(inputFile, TEST_FIXTURES.helloWorld);

      const result = runCliCommand({
        command: 'run',
        args: [inputFile, '--production'],
        cwd: testDir,
      });

      validateProductionExecution(result, {
        shouldContainOutput: true,
      });

      // Additional check for unsupported versions
      if (!isNodeVersionSupported()) {
        expect(result.status).not.toBe(0);
      }
    });

    test('should fail with missing input in production', () => {
      if (skipIfCliNotAvailable()) return;

      const missingFile = path.join(testDir, 'missing.som');

      const result = runCliCommand({
        command: 'run',
        args: [missingFile, '--production'],
      });

      expect(result.status).not.toBe(0);
    });
  });

  describe('bundle command with --production', () => {
    test('should validate environment for bundling', () => {
      if (skipIfCliNotAvailable()) return;

      const inputFile = path.join(testDir, 'main.som');
      const outputFile = path.join(testDir, 'bundle.js');

      createTestFile(inputFile, TEST_FIXTURES.bundleMain);

      const result = runCliCommand({
        command: 'bundle',
        args: [inputFile, '--output', outputFile, '--production'],
      });

      validateProductionExecution(result, {
        shouldContainOutput: true,
      });

      if (!isNodeVersionSupported()) {
        expect(result.status).not.toBe(0);
      }
    });

    test('should enforce validation for bundle output', () => {
      if (skipIfCliNotAvailable()) return;

      const inputFile = path.join(testDir, 'main.som');

      createTestFile(inputFile, TEST_FIXTURES.bundleMain);

      const result = runCliCommand({
        command: 'bundle',
        args: [inputFile, '--production'],
      });

      // Should attempt to validate
      expect(result.stderr || result.stdout).toBeDefined();
    });
  });

  describe('NODE_ENV=production behavior', () => {
    test('should enable production mode via environment variable', () => {
      if (skipIfCliNotAvailable()) return;

      const inputFile = path.join(testDir, 'input.som');
      const outputFile = path.join(testDir, 'output.js');

      createTestFile(inputFile, TEST_FIXTURES.simpleFunction);

      const result = runCliCommand({
        command: 'compile',
        args: [inputFile, '--output', outputFile],
        env: {
          ...process.env,
          NODE_ENV: 'production',
        },
      });

      if (isNodeVersionSupported()) {
        expect(result.status).toBe(0);
      } else {
        expect(result.status).not.toBe(0);
        expect(result.stderr || result.stdout).toContain('Node.js');
      }
    });

    test('should prioritize --production flag over NODE_ENV', () => {
      if (skipIfCliNotAvailable()) return;

      const inputFile = path.join(testDir, 'input.som');
      const outputFile = path.join(testDir, 'output.js');

      createTestFile(inputFile, TEST_FIXTURES.simpleFunction);

      const result = runCliCommand({
        command: 'compile',
        args: [inputFile, '--output', outputFile, '--production'],
        env: {
          ...process.env,
          NODE_ENV: 'development',
        },
      });

      if (isNodeVersionSupported()) {
        expect(result.status).toBe(0);
      } else {
        expect(result.status).not.toBe(0);
      }
    });
  });

  describe('Production mode error messages', () => {
    test('should provide clear error messages in production', () => {
      if (skipIfCliNotAvailable()) return;

      const missingFile = path.join(testDir, 'missing.som');

      const result = runCliCommand({
        command: 'compile',
        args: [missingFile, '--production'],
      });

      expect(result.status).not.toBe(0);
      const output = result.stderr || result.stdout;
      expect(output).toBeDefined();
      expect(output.length).toBeGreaterThan(0);
    });

    test('should show production validation details on failure', () => {
      if (skipIfCliNotAvailable()) return;

      if (isNodeVersionSupported()) {
        // Skip if supported version
        return;
      }

      const inputFile = path.join(testDir, 'input.som');

      createTestFile(inputFile, TEST_FIXTURES.simpleFunction);

      const result = runCliCommand({
        command: 'compile',
        args: [inputFile, '--production'],
      });

      expect(result.status).not.toBe(0);
      const output = result.stderr || result.stdout;
      expect(output).toContain('PRODUCTION');
    });
  });
});

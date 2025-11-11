/**
 * Shared test utilities to reduce code duplication across test files
 */

import * as fs from 'fs';
import * as path from 'path';
import { SpawnSyncReturns, spawnSync } from 'child_process';

/** Supported Node.js major versions */
export const SUPPORTED_NODE_VERSIONS = [20, 22, 23, 24];

/** Path to the compiled CLI */
export const CLI_PATH = path.resolve(__dirname, '../../dist/cli.js');

/** Check if CLI is available */
export function isCliAvailable(): boolean {
  return fs.existsSync(CLI_PATH);
}

/** Get current Node.js major version */
export function getCurrentNodeMajorVersion(): number {
  return Number.parseInt(process.versions.node.split('.')[0], 10);
}

/** Check if current Node version is supported */
export function isNodeVersionSupported(): boolean {
  return SUPPORTED_NODE_VERSIONS.includes(getCurrentNodeMajorVersion());
}

/** Skip test if CLI is not available */
export function skipIfCliNotAvailable(): boolean {
  if (!isCliAvailable()) {
    console.warn('CLI not available, skipping test');
    return true;
  }
  return false;
}

/** Common test fixtures - Tajik code snippets */
export const TEST_FIXTURES = {
  simpleFunction: `
    функсия салом(): void {
      чоп.сабт("Салом");
    }
  `,
  helloWorld: `
    функсия салом(): void {
      чоп.сабт("Салом, ҷаҳон!");
    }
    салом();
  `,
  bundleMain: `
    функсия асосӣ(): void {
      чоп.сабт("Бастабандӣ");
    }
  `,
  testFunction: 'функсия тест(): void { чоп.сабт("Салом"); }',
};

/** Options for running CLI commands */
export interface CliRunOptions {
  command: string;
  args: string[];
  cwd?: string;
  env?: Record<string, string | undefined>;
  timeout?: number;
  encoding?: 'utf-8' | 'utf8' | 'ascii' | 'buffer';
}

/** Run a CLI command with common defaults */
export function runCliCommand(options: CliRunOptions): SpawnSyncReturns<string> {
  return spawnSync(
    process.execPath,
    [CLI_PATH, options.command, ...options.args],
    {
      encoding: options.encoding || 'utf-8',
      timeout: options.timeout || 10000,
      cwd: options.cwd,
      env: options.env || process.env,
    }
  );
}

/** Create a test .som file with given content */
export function createTestFile(filePath: string, content: string = TEST_FIXTURES.testFunction): void {
  fs.writeFileSync(filePath, content);
}

/** Validate production mode execution based on Node version */
export interface ProductionValidationExpectation {
  shouldSucceed?: boolean; // Explicit success expectation
  shouldContainOutput?: boolean; // Should have output
  outputShouldContain?: string; // Output should contain text
}

export function validateProductionExecution(
  result: SpawnSyncReturns<string>,
  expectations: ProductionValidationExpectation = {}
): void {
  const isSupported = isNodeVersionSupported();

  if (expectations.shouldSucceed !== undefined) {
    if (isSupported && expectations.shouldSucceed) {
      expect(result.status).toBe(0);
    } else if (!isSupported && !expectations.shouldSucceed) {
      expect(result.status).not.toBe(0);
    }
  }

  if (expectations.shouldContainOutput) {
    expect(result.stderr || result.stdout).toBeDefined();
  }

  if (expectations.outputShouldContain) {
    const output = result.stderr || result.stdout;
    expect(output).toContain(expectations.outputShouldContain);
  }
}

/** Check if platform is Windows */
export function isWindows(): boolean {
  return process.platform === 'win32';
}

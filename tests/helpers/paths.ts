import { execFileSync, type ExecFileSyncOptions } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// Canonical path to the built CLI entry point shared by every CLI test.
const CLI_PATH = path.join(__dirname, '..', '..', 'dist', 'cli.js');

/**
 * Allocate a temp directory whose path is canonicalised.
 *
 * On Windows, `os.tmpdir()` may return an 8.3 short-name form such as
 * `C:\Users\RUNNER~1\AppData\Local\Temp`. Downstream code (path.join,
 * path.resolve) typically returns the long form, which then fails
 * `toContain` / `toEqual` assertions in suites that mix the two. Resolving
 * through `realpathSync` forces a single canonical representation. On
 * Linux/macOS the call is an identity operation.
 */
export function canonicalTmpDir(prefix: string): string {
  return fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), prefix)));
}

/**
 * Invoke the compiled CLI with the given argv, without going through a shell.
 *
 * Using `execFileSync` sidesteps Windows cmd.exe quoting of paths with
 * backslashes or spaces — an issue that previously forced these suites to be
 * skipped on win32.
 */
export function runCli(args: string[], opts: ExecFileSyncOptions = {}): string {
  const result = execFileSync(process.execPath, [CLI_PATH, ...args], {
    encoding: 'utf-8',
    ...opts,
  });
  return typeof result === 'string' ? result : result.toString('utf-8');
}

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
let cachedCliPath: string | undefined;

/**
 * Resolve the CLI path, building it only when `dist/cli.js` is missing.
 *
 * The CI pipeline runs `npm run build` as its own step before tests, so the
 * usual path is a pure existence check. When invoked locally without a
 * prior build, it falls back to `npm run build` — always with an explicit
 * `cwd: PROJECT_ROOT` so a leaked `process.chdir(tempDir)` from a prior
 * test can't misdirect npm into a deleted temp directory (the Windows CI
 * regression that blocked the original migration).
 *
 * On Windows `npm` is a `.cmd` shim, so we need `shell: true` there;
 * elsewhere we call the binary directly.
 */
export function buildCliOnce(): string {
  if (cachedCliPath) return cachedCliPath;
  if (!fs.existsSync(CLI_PATH)) {
    execFileSync('npm', ['run', 'build'], {
      stdio: 'pipe',
      shell: process.platform === 'win32',
      cwd: PROJECT_ROOT,
    });
  }
  cachedCliPath = CLI_PATH;
  return cachedCliPath;
}

/** Absolute path to the built CLI (no build is triggered). */
export function getCliPath(): string {
  return CLI_PATH;
}

/**
 * Spawns the built CLI (`node dist/cli.js`) and other Node programs without a
 * shell, asynchronously so that independent runs can go in parallel.
 */
import { spawn } from 'child_process';

import { buildCliOnce } from './paths';

export interface ProcessResult {
  status: number | null;
  signal: string | null;
  stdout: string;
  stderr: string;
}

export interface ProcessOptions {
  cwd?: string;
  /** Variables added to the environment, whose locale variables are cleared. */
  env?: Record<string, string>;
  /** Text written to standard input, which is then closed. */
  input?: string;
}

const LOCALE_VARIABLES = ['SOMON_LANG', 'LC_ALL', 'LC_MESSAGES', 'LANG'];

/** The test's environment without locale settings (English messages) and REPL history. */
function environment(extra: Record<string, string> = {}): Record<string, string | undefined> {
  const env: Record<string, string | undefined> = { ...process.env, SOMON_REPL_HISTORY: '' };
  for (const name of LOCALE_VARIABLES) delete env[name];
  return { ...env, ...extra };
}

/** Runs `node <args>` and collects its output. */
export function node(args: string[], options: ProcessOptions = {}): Promise<ProcessResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: options.cwd,
      env: environment(options.env),
      stdio: 'pipe',
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    child.stdout.on('data', chunk => stdout.push(chunk));
    child.stderr.on('data', chunk => stderr.push(chunk));
    child.on('error', reject);
    child.on('close', (status, signal) =>
      resolve({
        status,
        signal,
        stdout: Buffer.concat(stdout).toString('utf8'),
        stderr: Buffer.concat(stderr).toString('utf8'),
      })
    );
    child.stdin.end(options.input ?? '');
  });
}

/** Runs the built CLI: `node dist/cli.js <args>`. */
export function somon(args: string[], options: ProcessOptions = {}): Promise<ProcessResult> {
  return node([buildCliOnce(), ...args], options);
}

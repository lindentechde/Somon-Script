/**
 * Runs the CLI program in the test process, where coverage sees it: console
 * output and commander's own output (help, version, usage errors) are
 * captured, the exit code is read from `process.exitCode` (or from the
 * commander error that ends parsing), and the language, working directory and
 * exit code are restored afterwards.
 */
import { CommanderError } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { format } from 'util';

import { i18n, type Language } from '../../src/cli/i18n';
import { createProgram } from '../../src/cli/program';

export interface InProcessResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface InProcessOptions {
  lang?: Language;
  cwd?: string;
}

export async function runInProcess(
  args: string[],
  options: InProcessOptions = {}
): Promise<InProcessResult> {
  const out: string[] = [];
  const err: string[] = [];
  const spies = [
    jest.spyOn(console, 'log').mockImplementation((...parts) => void out.push(format(...parts))),
    jest.spyOn(console, 'info').mockImplementation((...parts) => void out.push(format(...parts))),
    jest.spyOn(console, 'error').mockImplementation((...parts) => void err.push(format(...parts))),
    jest.spyOn(console, 'warn').mockImplementation((...parts) => void err.push(format(...parts))),
  ];
  const previousLanguage = i18n.getLanguage();
  const previousCwd = process.cwd();
  process.exitCode = 0;
  try {
    i18n.setLanguage(options.lang ?? 'en');
    if (options.cwd) process.chdir(options.cwd);
    const program = createProgram();
    const output = {
      writeOut: (text: string) => void out.push(text.replace(/\n$/, '')),
      writeErr: (text: string) => void err.push(text.replace(/\n$/, '')),
    };
    for (const command of [program, ...program.commands]) {
      command.exitOverride().configureOutput(output);
    }
    let exitCode: number | undefined;
    try {
      await program.parseAsync(args, { from: 'user' });
    } catch (error) {
      if (!(error instanceof CommanderError)) throw error;
      exitCode = error.exitCode;
    }
    return {
      stdout: out.join('\n'),
      stderr: err.join('\n'),
      exitCode: exitCode ?? Number(process.exitCode ?? 0),
    };
  } finally {
    spies.forEach(spy => spy.mockRestore());
    process.chdir(previousCwd);
    i18n.setLanguage(previousLanguage);
    process.exitCode = 0;
  }
}

/** Writes `files` (relative path → text) under `root`, creating directories. */
export function writeFiles(root: string, files: Record<string, string>): void {
  for (const [name, text] of Object.entries(files)) {
    const file = path.join(root, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text);
  }
}

/** Separators as on POSIX, so assertions hold on Windows too. */
export function slash(text: string): string {
  return text.split(path.sep).join('/');
}

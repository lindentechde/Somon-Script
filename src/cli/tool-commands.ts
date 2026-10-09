/*
 * SomonScript CLI: developer tools (fmt, repl, migrate)
 * Copyright (c) 2025 LindenTech IT Consulting
 *
 * Licensed under the MIT License. See the LICENSE file for details.
 */

import type { Command } from 'commander';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { ConfigError, loadConfigWithPath } from '../config';
import { t } from './i18n';

/** `defineCommand` of program.ts: registers a command with its localized aliases. */
type DefineCommand = (_name: string, _key: 'fmt' | 'repl' | 'migrate', _alias?: string) => Command;

export interface FmtCommandOptions {
  check?: boolean;
  write?: boolean;
  stdout?: boolean;
  indent?: string;
}

export interface MigrateCommandOptions {
  output?: string;
  stdout?: boolean;
}

/** Directories never searched for source files. */
const SKIPPED_DIRECTORIES: ReadonlySet<string> = new Set(['node_modules', 'dist', 'coverage']);

/** Registers `fmt`, `repl` and `migrate`. */
export function registerToolCommands(define: DefineCommand, version: string): void {
  const tr = t().commands;
  define('fmt', 'fmt')
    .usage(tr.fmt.usage)
    .argument('<paths...>', tr.fmt.args.paths)
    .option('--check', tr.fmt.options.check)
    .option('--write', tr.fmt.options.write)
    .option('--stdout', tr.fmt.options.stdout)
    .option('--indent <spaces>', tr.fmt.options.indent)
    .action(async (paths: string[], options: FmtCommandOptions) => runFmt(paths, options));

  define('repl', 'repl').action(async () => runRepl(version));

  define('migrate', 'migrate')
    .usage(tr.migrate.usage)
    .argument('<input>', tr.migrate.args.input)
    .option('-o, --output <path>', tr.migrate.options.output)
    .option('--stdout', tr.migrate.options.stdout)
    .action(async (input: string, options: MigrateCommandOptions) => runMigrate(input, options));
}

function fail(...message: unknown[]): void {
  console.error(...message);
  process.exitCode = 1;
}

function reportConfigError(error: ConfigError): void {
  fail(t().common.configError);
  console.error(`  ${error.message}`);
  for (const detail of error.details) console.error(`  ${detail.path}: ${detail.message}`);
}

/** Files under `paths` accepted by `accept` (directories are searched); undefined when a path is missing. */
function collectFiles(paths: string[], accept: (_file: string) => boolean): string[] | undefined {
  const files: string[] = [];
  for (const input of paths) {
    if (!fs.existsSync(input)) {
      fail(t().commands.fmt.messages.pathNotFound(input));
      return undefined;
    }
    if (fs.statSync(input).isDirectory()) files.push(...walk(input, accept));
    else files.push(input);
  }
  return [...new Set(files)];
}

function walk(directory: string, accept: (_file: string) => boolean): string[] {
  // Searching the directories the user names is the command's purpose (rule S8707
  // is accepted for src/cli, see sonar-project.properties)
  const entries = fs.readdirSync(directory, { withFileTypes: true }); // NOSONAR
  entries.sort((a, b) => a.name.localeCompare(b.name));
  return entries.flatMap(entry => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      const skipped = entry.name.startsWith('.') || SKIPPED_DIRECTORIES.has(entry.name);
      return skipped ? [] : walk(full, accept);
    }
    return entry.isFile() && accept(full) ? [full] : [];
  });
}

// ---------------------------------------------------------------------------
// somon fmt

function parseIndent(value: string): number | undefined {
  const indent = Number(value);
  return /^\d+$/.test(value) && indent >= 1 && indent <= 16 ? indent : undefined;
}

/** Indentation from the nearest somon.config.json (`fmt.indent`), cached per directory. */
function configuredIndent(
  file: string,
  cache: Map<string, number | undefined>
): number | undefined {
  const directory = path.dirname(path.resolve(file));
  if (!cache.has(directory)) {
    cache.set(directory, loadConfigWithPath(directory).config.fmt?.indent);
  }
  return cache.get(directory);
}

export async function runFmt(paths: string[], options: FmtCommandOptions): Promise<void> {
  const messages = t().commands.fmt.messages;
  const indent = options.indent === undefined ? undefined : parseIndent(options.indent);
  if (options.indent !== undefined && indent === undefined) {
    fail(messages.invalidIndent(options.indent));
    return;
  }
  const files = collectFiles(paths, file => file.endsWith('.som'));
  if (!files) return;
  if (files.length === 0) {
    fail(messages.noFiles);
    return;
  }

  const { format } = await import('../tools/format');
  const indents = new Map<string, number | undefined>();
  let changed = 0;
  for (const file of files) {
    const formatter = (source: string): string =>
      format(source, { indent: indent ?? configuredIndent(file, indents) });
    if (formatFile(file, formatter, options)) changed++;
  }
  reportFmt(options, changed, files.length);
}

/** With --stdout the code goes to stdout, so the reports go to stderr. */
function fmtReporter(options: FmtCommandOptions): typeof console.log {
  return options.stdout ? console.error : console.log;
}

/** Formats one file as the options say; true when the file is not formatted. */
function formatFile(
  file: string,
  formatter: (_source: string) => string,
  options: FmtCommandOptions
): boolean {
  const messages = t().commands.fmt.messages;
  let source: string;
  let formatted: string;
  try {
    source = fs.readFileSync(file, 'utf8');
    formatted = formatter(source);
  } catch (error) {
    if (error instanceof ConfigError) reportConfigError(error);
    else fail(messages.failed(file), error instanceof Error ? error.message : error);
    return false;
  }
  if (options.stdout) process.stdout.write(formatted);
  if (formatted === source) return false;
  if (options.check) {
    fmtReporter(options)(messages.wouldReformat(file));
  } else if (!options.stdout) {
    fs.writeFileSync(file, formatted);
    fmtReporter(options)(messages.formatted(file));
  }
  return true;
}

function reportFmt(options: FmtCommandOptions, changed: number, total: number): void {
  const messages = t().commands.fmt.messages;
  const report = fmtReporter(options);
  if (options.check) {
    if (changed > 0) fail(messages.checkFailed(changed));
    else report(messages.checkPassed(total));
  } else if (!options.stdout) {
    report(messages.summary(changed, total));
  }
}

// ---------------------------------------------------------------------------
// somon repl

export async function runRepl(version: string): Promise<void> {
  const { Repl, historyFileFromEnv } = await import('../tools/repl');
  const messages = t().commands.repl.messages;
  const repl = new Repl({
    input: process.stdin,
    output: process.stdout,
    historyFile: historyFileFromEnv(process.env),
    messages: {
      banner: messages.banner(version),
      help: messages.help,
      cleared: messages.cleared,
      noCompiledCode: messages.noCompiledCode,
      exitHint: messages.exitHint,
      error: messages.error,
    },
  });
  await repl.start();
  // Timers started in the session must not keep the CLI alive after `.exit`;
  // process.exit() exits with process.exitCode, 0 when it is not set.
  process.stdout.write('', () => process.exit());
}

// ---------------------------------------------------------------------------
// somon migrate

export async function runMigrate(input: string, options: MigrateCommandOptions): Promise<void> {
  const tools = await import('../tools/migrate');
  const messages = t().commands.migrate.messages;
  if (!fs.existsSync(input)) {
    fail(t().commands.fmt.messages.pathNotFound(input));
    return;
  }
  const isDirectory = fs.statSync(input).isDirectory(); // NOSONAR: the user-named input (S8707)
  const files = isDirectory ? walk(input, tools.isTypeScriptSource) : [input];
  if (files.length === 0) {
    fail(messages.noFiles(input));
    return;
  }

  let warnings = 0;
  let migrated = 0;
  for (const file of files) {
    const target = isDirectory
      ? path.join(options.output ?? input, path.relative(input, tools.somFileName(file)))
      : (options.output ?? tools.somFileName(file));
    const count = migrateOne(file, target, options, files.length > 1, tools);
    if (count !== undefined) {
      warnings += count;
      migrated++;
    }
  }
  const summary = messages.summary(migrated, warnings);
  if (options.stdout) console.error(summary);
  else console.log(summary);
}

/** Migrates one file to `target` (or stdout); the number of warnings, or undefined on failure. */
function migrateOne(
  file: string,
  target: string,
  options: MigrateCommandOptions,
  several: boolean,
  tools: typeof import('../tools/migrate')
): number | undefined {
  const messages = t().commands.migrate.messages;
  if (!options.stdout && path.resolve(target) === path.resolve(file)) {
    fail(t().common.outputEqualsInput(target));
    return undefined;
  }
  try {
    const result = tools.migrateFile(file, { fileName: file });
    for (const warning of result.warnings) {
      const where = warning.line > 0 ? `${file}:${warning.line}:${warning.column}` : file;
      console.error(`${where}: ${messages.warning} ${warning.message}`);
    }
    if (options.stdout) {
      if (several) process.stdout.write(`// ${tools.somFileName(file)}\n`);
      process.stdout.write(result.code);
    } else {
      fs.mkdirSync(path.dirname(path.resolve(target)), { recursive: true });
      fs.writeFileSync(target, result.code);
      console.log(messages.migrated(file, target));
    }
    return result.warnings.length;
  } catch (error) {
    fail(messages.failed(file), error instanceof Error ? error.message : error);
    return undefined;
  }
}

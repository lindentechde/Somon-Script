/**
 * Errors a program started by `somon run` does not catch, as a learner reads
 * them (src/runtime/node-prelude.ts installs this when the CLI's language is
 * Tajik or Russian): what happened, the line of the `.som` file with a caret
 * under the place, and a hint. Neither the stack of Node.js nor the generated
 * JavaScript is shown, unless asked for (`somon run --stack`).
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import { formatDiagnostic } from '../diagnostics/format';
import type { DiagnosticLanguage } from '../diagnostics/types';
import { explainError, locateError } from './errors';
import { runtimeDiagnostic } from './report';

export interface ErrorReporterOptions {
  language: DiagnosticLanguage;
  /** Print the original stack after the message (`somon run --stack`). */
  showStack?: boolean;
  /** Files are shown relative to this directory: the learner's, not the program's. */
  cwd?: string;
}

/** The text that reports `thrown`, ending with a line break. */
export function reportError(thrown: unknown, options: ErrorReporterOptions): string {
  const { language } = options;
  const stack = thrown instanceof Error && typeof thrown.stack === 'string' ? thrown.stack : '';
  const location = locateError(stack);
  const file = location && filePath(location.file);
  const source = file && readSource(file);
  const diagnostic = runtimeDiagnostic(explainError(thrown), language, location, source);
  const shownFile = file && path.relative(options.cwd ?? process.cwd(), file);
  let text = formatDiagnostic(diagnostic, { language, source, file: shownFile, runtime: true });
  if (options.showStack && stack) text += `\n${stack}`;
  return `${text}\n`;
}

/** A path named by a stack: Node.js names the sources of source maps by `file://` URLs. */
function filePath(file: string): string {
  return file.startsWith('file://') ? fileURLToPath(file) : file;
}

function readSource(file: string): string | undefined {
  try {
    // The learner's own program, named by its stack (S8707)
    return fs.readFileSync(file, 'utf8'); // NOSONAR
  } catch {
    return undefined;
  }
}

/** The part of `process` the reporter uses. */
export interface ReporterProcess {
  on(
    _event: 'uncaughtException' | 'unhandledRejection',
    _listener: (_error: unknown) => void
  ): unknown;
  exit(_code: number): void;
  setSourceMapsEnabled(_enabled: boolean): void;
  stderr: { write(_text: string, _done: () => void): unknown };
}

/**
 * Reports errors the program does not catch, and rejected promises nobody
 * handles, then ends it with exit code 1, as Node.js would.
 */
export function installErrorReporter(
  options: ErrorReporterOptions,
  target: ReporterProcess = process
): void {
  // Stacks name the `.som` files (the CLI writes a source map next to the program)
  target.setSourceMapsEnabled(true);
  const report = (thrown: unknown): void => {
    target.stderr.write(reportError(thrown, options), () => target.exit(1));
  };
  target.on('uncaughtException', report);
  target.on('unhandledRejection', report);
}

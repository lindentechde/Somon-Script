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

import { codeOf, message, renderHint, renderMessage } from '../diagnostics/catalog';
import { formatDiagnostic } from '../diagnostics/format';
import { nameLength } from '../diagnostics/text';
import type { Diagnostic, DiagnosticLanguage, DiagnosticMessage } from '../diagnostics/types';
import {
  columnOfName,
  explainError,
  locateError,
  readsByIndex,
  type ErrorLocation,
  type ExplainedError,
} from './errors';

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
  const explained = explainError(thrown);
  const stack = thrown instanceof Error && typeof thrown.stack === 'string' ? thrown.stack : '';
  const location = locateError(stack);
  const file = location && filePath(location.file);
  const source = file && readSource(file);

  const diagnostic: Diagnostic = {
    code: codeOf(explained.message.id),
    severity: 'error',
    message: renderMessage(explained.message, language),
  };
  const hint = location ? place(diagnostic, explained, location, source) : explained.hint;
  if (hint) diagnostic.hint = renderHint(hint, language);

  const shownFile = file && path.relative(options.cwd ?? process.cwd(), file);
  let text = formatDiagnostic(diagnostic, { language, source, file: shownFile, runtime: true });
  if (options.showStack && stack) text += `\n${stack}`;
  return `${text}\n`;
}

/**
 * Puts `diagnostic` at the place of the error in `source`: under the name the
 * error is about, when the line is there. Returns the hint for the place.
 */
function place(
  diagnostic: Diagnostic,
  explained: ExplainedError,
  location: ErrorLocation,
  source: string | undefined
): DiagnosticMessage | undefined {
  const code = source?.split(/\r?\n/)[location.line - 1];
  if (code === undefined) {
    Object.assign(diagnostic, { line: location.line, column: location.column });
    return explained.hint;
  }
  const column = columnOfName(code, location.column, explained, location.functionName);
  Object.assign(diagnostic, {
    line: location.line,
    column,
    length: nameLength(source!, location.line, column),
  });
  if (explained.message.id === 'RUNTIME_READ_OF_NOTHING' && readsByIndex(code, column)) {
    return message('INDEX_OUT_OF_RANGE');
  }
  return explained.hint;
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

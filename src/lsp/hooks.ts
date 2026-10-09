/**
 * Replaceable parts of the language server: the formatter (`somon fmt`'s
 * `format` unless one is injected) and alternative type checkers
 * (`compilerOptions.checker`, e.g. 'typescript'); without one for the
 * configured checker, the compiler runs it.
 */

import { DEFAULT_INDENT, format } from '../tools/format';

/** Options a formatter receives: the editor's request and the project's settings. */
export interface FormatterOptions {
  tabSize: number;
  insertSpaces: boolean;
  /** Spaces per indentation level from somon.config.json (`fmt.indent`), if set there. */
  indent?: number;
  /** Path of the file being formatted, when it has one. */
  fileName?: string;
}

/**
 * Formats SomonScript source and returns the formatted text. Throws when the
 * source cannot be formatted (`FormatError`: a syntax error, or formatting
 * would change what the code means).
 */
export type Formatter = (_source: string, _options: FormatterOptions) => string;

/** A diagnostic from an alternative checker; positions as the compiler counts them. */
export interface CheckerDiagnostic {
  message: string;
  /** One-based line. */
  line: number;
  /** One-based column. */
  column: number;
  severity?: 'error' | 'warning';
  code?: string;
}

export interface CheckerOptions {
  fileName?: string;
  /** The `compilerOptions` of somon.config.json, as found for the file. */
  compilerOptions: Record<string, unknown>;
  locale: string;
}

/** Type-checks a document with another checker (`compilerOptions.checker`). */
export type Checker = (_source: string, _options: CheckerOptions) => CheckerDiagnostic[];

export interface LanguageServerHooks {
  formatter?: Formatter;
  /** Checkers by the name `compilerOptions.checker` gives them. */
  checkers?: Record<string, Checker>;
}

/**
 * `somon fmt`: the project's `fmt.indent`, else the editor's tab size (the
 * formatter indents with 1–16 spaces).
 */
export const defaultFormatter: Formatter = (source, options) =>
  format(source, {
    indent: options.indent ?? clampIndent(options.tabSize),
  });

function clampIndent(tabSize: number): number {
  if (!Number.isInteger(tabSize)) return DEFAULT_INDENT;
  return Math.min(16, Math.max(1, tabSize));
}

const registeredCheckers = new Map<string, Checker>();

/** Makes a checker available under the name `compilerOptions.checker` selects it by. */
export function registerChecker(name: string, checker: Checker | undefined): void {
  if (checker) registeredCheckers.set(name, checker);
  else registeredCheckers.delete(name);
}

/** The formatter to use: an injected one, else `somon fmt`'s. */
export function resolveFormatter(hooks: LanguageServerHooks = {}): Formatter {
  return hooks.formatter ?? defaultFormatter;
}

/** The checker injected or registered under `name`. */
export function resolveChecker(name: string, hooks: LanguageServerHooks = {}): Checker | undefined {
  return hooks.checkers?.[name] ?? registeredCheckers.get(name);
}

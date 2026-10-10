/**
 * Diagnostics as data: a stable code, the message in the requested language,
 * where it is, and a hint. The compiler's English strings (`errors`,
 * `warnings` of `compile()`) stay as they were for callers that ask for no
 * language; `compile(source, { language })` returns these (`diagnostics`).
 */

/** Languages of diagnostics. */
export type DiagnosticLanguage = 'en' | 'ru' | 'tj';

export const DIAGNOSTIC_LANGUAGES: readonly DiagnosticLanguage[] = ['en', 'ru', 'tj'];

/** Values a message is made of: names, types, counts; lists are joined with "or". */
export type DiagnosticParams = Readonly<
  Record<string, string | number | readonly string[] | undefined>
>;

/** A message of the catalog with its values, not yet in any language. */
export interface DiagnosticMessage {
  /** Catalog entry: the diagnostic code, or the code and a variant (`TYPE_NOT_ASSIGNABLE.return`). */
  id: string;
  params: DiagnosticParams;
}

/** A place in the source: 1-based line and column. */
export interface DiagnosticPosition {
  line: number;
  column: number;
}

export interface Diagnostic {
  /** Stable code: `PARSE_MISSING_CLOSE`, `TYPE_NOT_ASSIGNABLE`, `CODEGEN_REDECLARED`, … */
  code: string;
  severity: 'error' | 'warning';
  /** In the language asked for. */
  message: string;
  /** Advice in the same language: `Шояд \`вагарна\`-ро дар назар доштед?` */
  hint?: string;
  /** 1-based; absent for problems of the whole program. */
  line?: number;
  column?: number;
  /** How many characters the caret line marks (at least 1). */
  length?: number;
  /** A second place the message refers to: where a bracket was opened. */
  related?: DiagnosticPosition;
  /** The file, when the diagnostic comes from a build of several files. */
  file?: string;
}

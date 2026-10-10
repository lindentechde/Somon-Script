/**
 * Diagnostics as a learner reads them: where (file and line), what, the line
 * of code with a caret under the place, and a hint.
 *
 *   Хато дар барнома.som, сатри 3:
 *     Қавси пӯшандаи `}` намерасад. Қавси `{` дар сатри 2 кушода шудааст.
 *        2 | агар (а > 0) {
 *          |              ^
 *        3 |   чоп(а);
 *          |          ^
 */
import { russianPlural } from './text';
import type { Diagnostic, DiagnosticLanguage } from './types';

interface Words {
  error: string;
  warning: string;
  /** Header with a file and a line, a line only, a file only, or neither. */
  where: (_severity: string, _file?: string, _line?: number) => string;
  hint: string;
  failed: (_errors: number) => string;
}

const WORDS: Readonly<Record<DiagnosticLanguage, Words>> = {
  en: {
    error: 'Error',
    warning: 'Warning',
    where: (severity, file, line) => {
      if (file !== undefined && line !== undefined) return `${severity} in ${file}, line ${line}`;
      if (line !== undefined) return `${severity} on line ${line}`;
      return file === undefined ? severity : `${severity} in ${file}`;
    },
    hint: 'Hint',
    failed: errors =>
      `The program did not compile: ${errors} ${errors === 1 ? 'error' : 'errors'}.`,
  },
  ru: {
    error: 'Ошибка',
    warning: 'Предупреждение',
    where: (severity, file, line) => {
      if (file !== undefined && line !== undefined) return `${severity} в ${file}, строка ${line}`;
      if (line !== undefined) return `${severity} в строке ${line}`;
      return file === undefined ? severity : `${severity} в ${file}`;
    },
    hint: 'Подсказка',
    failed: errors =>
      `Программа не скомпилирована: ${errors} ${russianPlural(errors, ['ошибка', 'ошибки', 'ошибок'])}.`,
  },
  tj: {
    error: 'Хато',
    warning: 'Огоҳӣ',
    where: (severity, file, line) => {
      if (file !== undefined && line !== undefined) return `${severity} дар ${file}, сатри ${line}`;
      if (line !== undefined) return `${severity} дар сатри ${line}`;
      return file === undefined ? severity : `${severity} дар ${file}`;
    },
    hint: 'Маслиҳат',
    failed: errors => `Барнома компайл нашуд: ${errors} хато.`,
  },
};

export interface FormatOptions {
  language: DiagnosticLanguage;
  /** The program, for the line of code under the message. */
  source?: string;
  /** The file, as the learner knows it (relative to the current directory). */
  file?: string;
}

/** A diagnostic as a block of lines (no line break at the end). */
export function formatDiagnostic(diagnostic: Diagnostic, options: FormatOptions): string {
  const words = WORDS[options.language];
  const lines = [`${header(diagnostic, options)}:`, `  ${diagnostic.message}`];
  lines.push(...snippet(diagnostic, options.source));
  if (diagnostic.hint) lines.push(`  ${words.hint}: ${diagnostic.hint}`);
  return lines.join('\n');
}

/** A diagnostic on one line: `Огоҳӣ дар барнома.som, сатри 2: …`. */
export function formatDiagnosticLine(diagnostic: Diagnostic, options: FormatOptions): string {
  return `${header(diagnostic, options)}: ${diagnostic.message}`;
}

/** The last line of a failed compilation: `Барнома компайл нашуд: 2 хато.` */
export function formatFailure(errors: number, language: DiagnosticLanguage): string {
  return WORDS[language].failed(errors);
}

function header(diagnostic: Diagnostic, options: FormatOptions): string {
  const words = WORDS[options.language];
  const severity = diagnostic.severity === 'error' ? words.error : words.warning;
  return words.where(severity, options.file ?? diagnostic.file, diagnostic.line);
}

/**
 * The line of the diagnostic, and the line of its related place when that is
 * another one, each with a caret line; nothing without the source or a line.
 */
function snippet(diagnostic: Diagnostic, source: string | undefined): string[] {
  if (source === undefined || diagnostic.line === undefined) return [];
  const sourceLines = source.split(/\r?\n/);
  const places = [
    { line: diagnostic.line, column: diagnostic.column ?? 1, length: diagnostic.length },
  ];
  if (diagnostic.related && diagnostic.related.line !== diagnostic.line) {
    places.push({ ...diagnostic.related, length: 1 });
  }
  places.sort((a, b) => a.line - b.line);
  const width = String(places[places.length - 1].line).length;
  const output: string[] = [];
  for (const place of places) {
    const code = sourceLines[place.line - 1];
    if (code === undefined) continue;
    const gutter = String(place.line).padStart(width);
    output.push(`    ${gutter} | ${code}`.trimEnd());
    output.push(`    ${' '.repeat(width)} | ${caret(code, place.column, place.length ?? 1)}`);
  }
  return output;
}

/** Spaces (tabs where the code has them) up to the column, then `^^^`. */
function caret(code: string, column: number, length: number): string {
  const before = code.slice(0, Math.max(column - 1, 0)).replace(/[^\t]/g, ' ');
  const padding = before.padEnd(Math.max(column - 1, 0), ' ');
  return `${padding}${'^'.repeat(Math.max(length, 1))}`;
}

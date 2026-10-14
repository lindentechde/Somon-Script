/**
 * What went wrong in a compilation, as each stage reports it, turned into the
 * diagnostics of the catalog in a learner's language. Shared by the compiler
 * for Node.js (src/compiler.ts) and the one for browsers (src/browser.ts).
 */
import type { TypeCheckError } from '../type-checker';
import { formatDiagnostic } from './format';
import { codegenDiagnostic, detailDiagnostic, syntaxDiagnostic, typeDiagnostic } from './index';
import type { Diagnostic, DiagnosticLanguage } from './types';

/** One problem: the stage's own message, or the checker's error. */
export type Problem =
  | { kind: 'syntax' | 'codegen' | 'option' | 'internal'; text: string }
  | { kind: 'target'; text: string; line: number; column: number }
  | { kind: 'type'; error: TypeCheckError }
  /** A message of the catalog that shows `text` in English. */
  | { kind: 'detail'; id: string; text: string };

/** The problems of a compilation, per entry of its `errors` and `warnings`. */
export class Problems {
  private readonly entries: Problem[] = [];

  add(entry: Problem): void {
    this.entries.push(entry);
  }

  diagnostics(source: string, language: DiagnosticLanguage): Diagnostic[] {
    const all = this.entries.map((entry): Diagnostic => {
      switch (entry.kind) {
        case 'syntax':
          return syntaxDiagnostic(entry.text, source, language);
        case 'codegen':
          return codegenDiagnostic(entry.text, source, language);
        case 'type':
          return typeDiagnostic(entry.error, source, language);
        case 'target':
          return detailDiagnostic('TARGET_UNSUPPORTED', entry.text, language, entry);
        case 'option':
          return detailDiagnostic('OPTION_INVALID', entry.text, language);
        case 'detail':
          return detailDiagnostic(entry.id, entry.text, language);
        default:
          return detailDiagnostic('CODEGEN_INVALID', entry.text, language);
      }
    });
    // After a syntax error the parser goes on from a guess; what it reports next on that
    // line is mostly the same mistake again (`чоп(1; 2)`: a `)` and a `;`)
    const shown = all.filter(
      (d, index) =>
        this.entries[index].kind !== 'syntax' ||
        !all
          .slice(0, index)
          .some((e, before) => this.entries[before].kind === 'syntax' && e.line === d.line)
    );
    return [
      ...shown.filter(d => d.severity === 'error'),
      ...shown.filter(d => d.severity === 'warning'),
    ];
  }
}

/** A result's `errors` and `warnings` in `language`, for learners, and the diagnostics. */
export function localizedMessages(
  diagnostics: Diagnostic[],
  source: string,
  language: DiagnosticLanguage
): { errors: string[]; warnings: string[]; diagnostics: Diagnostic[] } {
  const format = (d: Diagnostic) => formatDiagnostic(d, { language, source });
  return {
    errors: diagnostics.filter(d => d.severity === 'error').map(format),
    warnings: diagnostics.filter(d => d.severity === 'warning').map(format),
    diagnostics,
  };
}

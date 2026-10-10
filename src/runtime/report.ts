/**
 * An error of a running program as a diagnostic for learners: what happened
 * (src/runtime/errors.ts), under which name of which line of the `.som`
 * source, and a hint. Used by `somon run` (src/runtime/node-errors.ts) and by
 * the playground; no Node.js API is used.
 */
import { codeOf, message, renderHint, renderMessage } from '../diagnostics/catalog';
import { nameLength } from '../diagnostics/text';
import type { Diagnostic, DiagnosticLanguage, DiagnosticMessage } from '../diagnostics/types';
import { columnOfName, readsByIndex, type ExplainedError } from './errors';

/** Where in the source an error happened: the place a stack names, mapped to the `.som` file. */
export interface SourcePlace {
  line: number;
  /** From 1. */
  column: number;
  /** The function the stack names there, if any. */
  functionName?: string;
}

/** The diagnostic of an explained error, at `place` in `source` when known. */
export function runtimeDiagnostic(
  explained: ExplainedError,
  language: DiagnosticLanguage,
  place?: SourcePlace,
  source?: string
): Diagnostic {
  const diagnostic: Diagnostic = {
    code: codeOf(explained.message.id),
    severity: 'error',
    message: renderMessage(explained.message, language),
  };
  const hint = place ? placeDiagnostic(diagnostic, explained, place, source) : explained.hint;
  if (hint) diagnostic.hint = renderHint(hint, language);
  return diagnostic;
}

/**
 * Puts `diagnostic` at the place of the error in `source`: under the name the
 * error is about, when the line is there. Returns the hint for the place.
 */
function placeDiagnostic(
  diagnostic: Diagnostic,
  explained: ExplainedError,
  place: SourcePlace,
  source: string | undefined
): DiagnosticMessage | undefined {
  const code = source?.split(/\r?\n/)[place.line - 1];
  if (code === undefined) {
    Object.assign(diagnostic, { line: place.line, column: place.column });
    return explained.hint;
  }
  const column = columnOfName(code, place.column, explained, place.functionName);
  Object.assign(diagnostic, {
    line: place.line,
    column,
    length: nameLength(source!, place.line, column),
  });
  if (explained.message.id === 'RUNTIME_READ_OF_NOTHING' && readsByIndex(code, column)) {
    return message('INDEX_OUT_OF_RANGE');
  }
  return explained.hint;
}

/**
 * Diagnostics in the learner's language: the compiler's errors and warnings
 * as `Diagnostic` objects (code, message, place, hint) and as text.
 */
import { codeOf, message, renderHint, renderMessage } from './catalog';
import { classifyCodegenError, classifySyntaxError, type ClassifiedError } from './classify';
import { ENGLISH_WORDS } from './suggest';
import { text } from './text';
import type { Diagnostic, DiagnosticLanguage, DiagnosticMessage, DiagnosticParams } from './types';
import type { TypeCheckError } from '../type-checker';

export { codeOf, message, renderHint, renderMessage, MESSAGE_IDS, HINT_IDS } from './catalog';
export {
  formatDiagnostic,
  formatDiagnosticLine,
  formatFailure,
  type FormatOptions,
} from './format';
export { closestName, editDistance } from './suggest';
export * from './types';

type Severity = Diagnostic['severity'];

/** A classified error as a diagnostic in `language`. */
export function classifiedDiagnostic(
  classified: ClassifiedError,
  severity: Severity,
  language: DiagnosticLanguage
): Diagnostic {
  return build(classified.message, severity, language, {
    line: classified.line,
    column: classified.column,
    length: classified.length,
    related: classified.related && {
      line: classified.related.line,
      column: classified.related.column,
    },
    hint: classified.hint,
  });
}

/** A lexer or parser error (the parser's English sentence) as a diagnostic. */
export function syntaxDiagnostic(
  raw: string,
  source: string,
  language: DiagnosticLanguage
): Diagnostic {
  return classifiedDiagnostic(classifySyntaxError(raw, source), 'error', language);
}

/** A code generator error as a diagnostic. */
export function codegenDiagnostic(
  raw: string,
  source: string,
  language: DiagnosticLanguage
): Diagnostic {
  const classified = classifyCodegenError(raw);
  // The code generator names the statement; the caret goes under the name it is about
  const name = classified.message.params.name;
  const position = name === undefined ? classified : namePosition(source, classified, text(name));
  return classifiedDiagnostic(
    { ...classified, ...position, length: wordLength(source, position.line, position.column) },
    'error',
    language
  );
}

/** The first `name` on the line of `from`, at or after its column; `from` when there is none. */
function namePosition(
  source: string,
  from: { line?: number; column?: number },
  name: string
): { line?: number; column?: number } {
  if (from.line === undefined) return from;
  // The code generator names the line of a statement of the source
  const line = source.split(/\r?\n/)[from.line - 1];
  const index = line.indexOf(name, from.column! - 1);
  return index === -1 ? from : { line: from.line, column: index + 1 };
}

/** An error whose text stays as it is (an option, the target, a crash), in the catalog's words. */
export function detailDiagnostic(
  id: string,
  detail: string,
  language: DiagnosticLanguage,
  position: { line?: number; column?: number } = {}
): Diagnostic {
  return build(message(id, { detail }), 'error', language, position);
}

/**
 * A type checker error or warning as a diagnostic: the catalog's text for
 * its message, or, for the TypeScript checker's, its own text (already in
 * the requested language).
 */
export function typeDiagnostic(
  error: TypeCheckError,
  source: string,
  language: DiagnosticLanguage
): Diagnostic {
  const position = {
    line: error.line,
    column: error.column,
    length: wordLength(source, error.line, error.column),
  };
  if (!error.messageId) {
    return { code: error.code, severity: error.severity, message: error.message, ...position };
  }
  // The checker gives every message of the catalog its values
  const msg: DiagnosticMessage = { id: error.messageId, params: error.params! };
  return build(msg, error.severity, language, { ...position, hint: typeHint(msg) });
}

function build(
  msg: DiagnosticMessage,
  severity: Severity,
  language: DiagnosticLanguage,
  extra: Omit<Diagnostic, 'code' | 'severity' | 'message' | 'hint'> & { hint?: DiagnosticMessage }
): Diagnostic {
  const { hint, ...place } = extra;
  const diagnostic: Diagnostic = {
    code: codeOf(msg.id),
    severity,
    message: renderMessage(msg, language),
  };
  for (const [key, value] of Object.entries(place)) {
    if (value !== undefined) Object.assign(diagnostic, { [key]: value });
  }
  if (hint) diagnostic.hint = renderHint(hint, language);
  return diagnostic;
}

/** Advice for a type checker message: a name it probably means, or what to do. */
function typeHint(msg: DiagnosticMessage): DiagnosticMessage | undefined {
  const p: DiagnosticParams = msg.params;
  const code = codeOf(msg.id);
  const tajik = msg.id === 'UNDEFINED_IDENTIFIER' ? ENGLISH_WORDS.get(text(p.name)) : undefined;
  if (tajik) return message('ENGLISH_KEYWORD', { english: p.name, tajik });
  if (p.suggestion !== undefined) return message('DID_YOU_MEAN', { name: p.suggestion });
  if (msg.id === 'UNDEFINED_IDENTIFIER') return message('DECLARE_FIRST');
  if (p.mapSet) return message('HAS_FOR_MAP_SET');
  if (code === 'CONST_ASSIGNMENT') return message('USE_TAG');
  const quotedNumber = /^"(-?\d+(?:\.\d+)?)"$/.exec(text(p.source));
  if (msg.id === 'TYPE_NOT_ASSIGNABLE' && quotedNumber && p.target === 'рақам') {
    return message('NUMBER_IN_QUOTES', { value: quotedNumber[1] });
  }
  return undefined;
}

/** How long the name or string at a position is (1 for anything else). */
function wordLength(source: string, line?: number, column?: number): number | undefined {
  if (line === undefined || column === undefined) return undefined;
  const rest = (source.split(/\r?\n/)[line - 1] ?? '').slice(column - 1);
  const word = /^(?:[\p{L}\p{N}_$]+|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/u.exec(rest);
  return word ? [...word[0]].length : 1;
}

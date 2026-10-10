/**
 * The catalog of diagnostics: every message the compiler reports, by id, in
 * English, Russian and Tajik (docs/glossary.tj.md lists the Tajik terms).
 */
import { HINTS, PROGRAM_MESSAGES } from './catalog-program';
import { RUNTIME_HINTS, RUNTIME_MESSAGES } from './catalog-runtime';
import { SYNTAX_MESSAGES } from './catalog-syntax';
import { TYPE_MESSAGES } from './catalog-types';
import type { CatalogEntry } from './text';
import type { DiagnosticLanguage, DiagnosticMessage, DiagnosticParams } from './types';

const MESSAGES: Readonly<Record<string, CatalogEntry>> = {
  ...SYNTAX_MESSAGES,
  ...TYPE_MESSAGES,
  ...PROGRAM_MESSAGES,
  ...RUNTIME_MESSAGES,
};

const ALL_HINTS: Readonly<Record<string, CatalogEntry>> = { ...HINTS, ...RUNTIME_HINTS };

/** Every message id of the catalog (hints apart). */
export const MESSAGE_IDS: readonly string[] = Object.keys(MESSAGES);

/** Every hint id. */
export const HINT_IDS: readonly string[] = Object.keys(ALL_HINTS);

/** The diagnostic code of a message id: `TYPE_NOT_ASSIGNABLE.return` → `TYPE_NOT_ASSIGNABLE`. */
export function codeOf(id: string): string {
  const dot = id.indexOf('.');
  return dot === -1 ? id : id.slice(0, dot);
}

/** A message of the catalog with its values: `message('UNDEFINED_IDENTIFIER', { name })`. */
export function message(id: string, params: DiagnosticParams = {}): DiagnosticMessage {
  return { id, params };
}

/** The text of a message in a language. Throws for an id the catalog does not have. */
export function renderMessage(msg: DiagnosticMessage, language: DiagnosticLanguage): string {
  return entry(MESSAGES, msg.id)[language](msg.params);
}

/** The text of a hint in a language. */
export function renderHint(hint: DiagnosticMessage, language: DiagnosticLanguage): string {
  return entry(ALL_HINTS, hint.id)[language](hint.params);
}

function entry(table: Readonly<Record<string, CatalogEntry>>, id: string): CatalogEntry {
  const found = table[id];
  if (!found) throw new Error(`Unknown diagnostic '${id}'`);
  return found;
}

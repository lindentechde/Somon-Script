/**
 * Small pieces the message templates are made of, in each language.
 */
import type { DiagnosticLanguage, DiagnosticParams } from './types';

/** A message template: the text for the values of one diagnostic. */
export type Template = (_params: DiagnosticParams) => string;

/** The texts of one catalog entry. */
export interface CatalogEntry {
  en: Template;
  ru: Template;
  tj: Template;
}

/** Code in a message: `` `агар` ``. */
export function code(value: unknown): string {
  return `\`${String(value)}\``;
}

const OR: Readonly<Record<DiagnosticLanguage, string>> = { en: 'or', ru: 'или', tj: 'ё' };

/** `` `а` ``, `` `а` ё `б` ``, … for one value or a list of them. */
export function codes(value: DiagnosticParams[string], language: DiagnosticLanguage): string {
  const values = Array.isArray(value) ? (value as readonly string[]) : [String(value)];
  return values.map(code).join(` ${OR[language]} `);
}

/** A parameter as a string ('' when absent). */
export function text(value: DiagnosticParams[string]): string {
  if (value === undefined) return '';
  return Array.isArray(value) ? value.join(', ') : String(value);
}

/**
 * Whether a type, as the checker prints it, is the type of one value: a string
 * or number literal (`"панҷ"`, `5`) or a boolean one.
 */
export function isLiteralType(type: DiagnosticParams[string]): boolean {
  return /^(".*"|-?\d[\d.e+_]*n?|true|false)$/.test(text(type));
}

/**
 * A type as SomonScript writes it: the checker prints boolean literal types as
 * `true`/`false`, the language spells them `дуруст`/`нодуруст` (strings in the
 * type are left alone).
 */
export function tajikType(type: DiagnosticParams[string]): string {
  return text(type).replace(/"(?:[^"\\]|\\.)*"|\b(true|false)\b/g, (match, word?: string) => {
    if (!word) return match;
    return word === 'true' ? 'дуруст' : 'нодуруст';
  });
}

/** Russian noun forms after a number: 1 ошибка, 2 ошибки, 5 ошибок. */
export function russianPlural(count: number, forms: readonly [string, string, string]): string {
  const tens = count % 100;
  const units = count % 10;
  if (tens >= 11 && tens <= 14) return forms[2];
  if (units === 1) return forms[0];
  if (units >= 2 && units <= 4) return forms[1];
  return forms[2];
}

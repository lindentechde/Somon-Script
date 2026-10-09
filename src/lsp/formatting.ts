/** Formatting: `somon fmt` (or an injected formatter) as one edit of the whole document. */

import { FormatError } from '../tools/format';
import type { Formatter, FormatterOptions } from './hooks';
import type { TextEdit } from './protocol';
import type { TextDocument } from './text-document';

/**
 * One edit replacing the whole document, or none when it is already formatted
 * or cannot be formatted (`FormatError`: a syntax error, or formatting would
 * change the program); other errors propagate.
 */
export function formatDocument(
  document: TextDocument,
  formatter: Formatter,
  options: FormatterOptions
): TextEdit[] {
  let formatted: string;
  try {
    formatted = formatter(document.text, options);
  } catch (error) {
    if (error instanceof FormatError) return [];
    throw error;
  }
  if (formatted === document.text) return [];
  return [{ range: document.rangeFromOffsets(0, document.text.length), newText: formatted }];
}

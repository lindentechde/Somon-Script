/** Formatting through the injected formatter (see `hooks.ts`). */

import { formattedText, type Formatter } from './hooks';
import type { FormattingOptions, TextEdit } from './protocol';
import type { TextDocument } from './text-document';

/** One edit replacing the whole document, or none when it is already formatted. */
export function formatDocument(
  document: TextDocument,
  formatter: Formatter,
  options: FormattingOptions,
  fileName?: string
): TextEdit[] {
  const formatted = formattedText(
    formatter(document.text, {
      tabSize: options.tabSize,
      insertSpaces: options.insertSpaces,
      ...(fileName && { fileName }),
    })
  );
  if (formatted === document.text) return [];
  return [{ range: document.rangeFromOffsets(0, document.text.length), newText: formatted }];
}

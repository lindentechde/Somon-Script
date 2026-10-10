import * as fs from 'fs';
import * as path from 'path';

import { codeOf, HINT_IDS, MESSAGE_IDS, renderHint, renderMessage } from '../src/diagnostics';
import { russianPlural, tajikType } from '../src/diagnostics/text';
import { HINT_SAMPLES, SAMPLES } from './helpers/diagnostic-samples';
import { buildCliOnce } from './helpers/paths';

/**
 * The catalog of diagnostics (src/diagnostics): every message and hint in
 * English, Russian and Tajik. The Russian and Tajik texts have no Latin words
 * outside code (`…`), except the name JavaScript.
 */

/** The text outside `code` spans, without the name JavaScript. */
function prose(text: string): string {
  return text.replace(/`[^`]*`/g, '').replace(/JavaScript/g, '');
}

/** Messages whose English text is a detail the compiler gives in English. */
const DETAIL_IN_ENGLISH = new Set(
  Object.entries(SAMPLES)
    .filter(([, samples]) => samples.some(sample => 'detail' in sample))
    .map(([id]) => id)
);

describe('diagnostics catalog', () => {
  test('every message has sample values, and every sample a message', () => {
    expect(Object.keys(SAMPLES).sort()).toEqual([...MESSAGE_IDS].sort());
    expect(Object.keys(HINT_SAMPLES).sort()).toEqual([...HINT_IDS].sort());
  });

  describe.each(Object.entries(SAMPLES))('%s', (id, samples) => {
    test.each(samples.map((params, index) => [index, params] as const))(
      'sample %i in English, Russian and Tajik',
      (_index, params) => {
        const msg = { id, params };
        const en = renderMessage(msg, 'en');
        const ru = renderMessage(msg, 'ru');
        const tj = renderMessage(msg, 'tj');
        for (const text of [en, ru, tj]) {
          expect(text.trim()).not.toBe('');
          expect(text).not.toContain('undefined');
        }
        expect(ru).not.toEqual(tj);
        expect(prose(tj)).not.toMatch(/[A-Za-z]/);
        expect(prose(ru)).not.toMatch(/[A-Za-z]/);
        if (!DETAIL_IN_ENGLISH.has(id)) expect(en).toMatch(/[A-Za-z]/);
      }
    );
  });

  test.each(Object.entries(HINT_SAMPLES))('hint %s in every language', (id, params) => {
    const texts = (['en', 'ru', 'tj'] as const).map(language =>
      renderHint({ id, params }, language)
    );
    expect(new Set(texts).size).toBe(3);
    expect(prose(texts[1])).not.toMatch(/[A-Za-z]/);
    expect(prose(texts[2])).not.toMatch(/[A-Za-z]/);
  });

  test('message ids name their code before a dot', () => {
    expect(codeOf('TYPE_NOT_ASSIGNABLE.return')).toBe('TYPE_NOT_ASSIGNABLE');
    expect(codeOf('PARSE_MISSING_CLOSE')).toBe('PARSE_MISSING_CLOSE');
  });

  test('an unknown id is a programming error', () => {
    expect(() => renderMessage({ id: 'NOPE', params: {} }, 'tj')).toThrow(
      "Unknown diagnostic 'NOPE'"
    );
    expect(() => renderHint({ id: 'NOPE', params: {} }, 'tj')).toThrow("Unknown diagnostic 'NOPE'");
  });

  test('the English texts of the type checker are its messages as they always were', () => {
    expect(
      renderMessage({ id: 'TYPE_NOT_ASSIGNABLE', params: { source: '"а"', target: 'рақам' } }, 'en')
    ).toBe(`Type '"а"' is not assignable to type 'рақам'`);
    expect(renderMessage({ id: 'ARGUMENT_COUNT_MISMATCH', params: { min: 1, got: 0 } }, 'en')).toBe(
      "Function 'anonymous' expected at least 1 argument(s) but got 0"
    );
    expect(
      renderMessage({ id: 'POSSIBLY_NULL', params: { values: ['холӣ', 'беқимат'] } }, 'en')
    ).toBe("Object is possibly 'холӣ' or 'беқимат'");
  });

  test('Tajik and Russian name boolean literal types as SomonScript writes them', () => {
    expect(tajikType('true | "true" | false')).toBe('дуруст | "true" | нодуруст');
    expect(
      renderMessage({ id: 'TYPE_NOT_ASSIGNABLE', params: { source: 'true', target: 'сатр' } }, 'tj')
    ).toBe('Қимати `дуруст` ба навъи `сатр` мувофиқ нест.');
  });

  test('Russian counts take the right noun form', () => {
    expect(
      [1, 2, 5, 11, 21, 22, 25, 112].map(n => russianPlural(n, ['ошибка', 'ошибки', 'ошибок']))
    ).toEqual(['ошибка', 'ошибки', 'ошибок', 'ошибок', 'ошибка', 'ошибки', 'ошибок', 'ошибок']);
  });
});

describe('the glossary', () => {
  test('lists every message of the catalog as it is now', () => {
    buildCliOnce();
    const { messagesSection, normalize } = require('../scripts/glossary-messages.js');
    const glossary = fs.readFileSync(path.join(__dirname, '..', 'docs', 'glossary.tj.md'), 'utf8');
    const start = glossary.indexOf('<!-- messages:start -->');
    const end = glossary.indexOf('<!-- messages:end -->') + '<!-- messages:end -->'.length;
    // Run `node scripts/glossary-messages.js` after changing a message
    expect(normalize(glossary.slice(start, end))).toBe(normalize(messagesSection()));
  });
});

/**
 * "Did you mean …?": the name or keyword closest to what the learner wrote,
 * and the SomonScript word for an English keyword they may know.
 */

/** Keywords a statement starts with, or that learners write on their own. */
export const STATEMENT_KEYWORDS: readonly string[] = [
  'агар',
  'вагарна',
  'барои',
  'тағ',
  'собит',
  'функсия',
  'бозгашт',
  'синф',
  'кӯшиш',
  'гирифтан',
  'ниҳоят',
  'интихоб',
  'ҳолат',
  'пешфарз',
  'шикастан',
  'давом',
  'партофтан',
  'ворид',
  'содир',
  'чоп',
  'дуруст',
  'нодуруст',
  'холӣ',
  'беқимат',
  'ҳамзамон',
  'интизор',
  'интерфейс',
];

/** English (JavaScript) words and the SomonScript words for them. */
export const ENGLISH_WORDS: ReadonlyMap<string, string> = new Map([
  ['if', 'агар'],
  ['else', 'вагарна'],
  ['for', 'барои'],
  ['while', 'то'],
  ['let', 'тағ'],
  ['var', 'тағ'],
  ['const', 'собит'],
  ['function', 'функсия'],
  ['return', 'бозгашт'],
  ['class', 'синф'],
  ['try', 'кӯшиш'],
  ['catch', 'гирифтан'],
  ['finally', 'ниҳоят'],
  ['switch', 'интихоб'],
  ['case', 'ҳолат'],
  ['break', 'шикастан'],
  ['continue', 'давом'],
  ['throw', 'партофтан'],
  ['import', 'ворид'],
  ['export', 'содир'],
  ['print', 'чоп'],
  ['console', 'чоп'],
  ['true', 'дуруст'],
  ['false', 'нодуруст'],
  ['null', 'холӣ'],
  ['undefined', 'беқимат'],
]);

/**
 * Edits (insert, delete, replace, swap two neighbours) that turn `a` into
 * `b`, ignoring case.
 */
export function editDistance(a: string, b: string): number {
  const s = [...a.toLowerCase()];
  const t = [...b.toLowerCase()];
  // d[i][j]: distance of the first i characters of s and the first j of t
  const d: number[][] = Array.from({ length: s.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= t.length; j++) d[0][j] = j;
  for (let i = 1; i <= s.length; i++) {
    for (let j = 1; j <= t.length; j++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && s[i - 1] === t[j - 2] && s[i - 2] === t[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[s.length][t.length];
}

/** How many edits apart two names of (at most) this length may be. */
function allowedEdits(length: number): number {
  if (length <= 2) return 0;
  return length <= 4 ? 1 : 2;
}

/**
 * The candidate closest to `word`, within the edits the longer of the two
 * allows; the first of equally close ones, and none for `word` itself.
 */
export function closestName(word: string, candidates: Iterable<string>): string | undefined {
  let best: string | undefined;
  let bestDistance = Infinity;
  const length = [...word].length;
  for (const candidate of candidates) {
    if (candidate === word) continue;
    const distance = editDistance(word, candidate);
    const allowed = allowedEdits(Math.max(length, [...candidate].length));
    if (distance <= allowed && distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return best;
}

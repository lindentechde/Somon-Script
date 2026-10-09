import { KEYWORDS } from '../src/keyword-map';
import { analyzeDocument, type Analysis } from '../src/lsp/analysis';
import { completion, memberContext } from '../src/lsp/completion';
import { definition, type ResolvedModule } from '../src/lsp/definition';
import { documentSymbols } from '../src/lsp/document-symbols';
import { formatDocument } from '../src/lsp/formatting';
import {
  formattedText,
  registerChecker,
  registerFormatter,
  resolveChecker,
  resolveFormatter,
} from '../src/lsp/hooks';
import { hover } from '../src/lsp/hover';
import {
  CONTEXTUAL_KEYWORDS,
  ENGLISH_KEYWORDS,
  KEYWORD_INFO,
  isSyntaxKeyword,
  undocumentedKeywords,
} from '../src/lsp/keywords';
import { globalObjectMembers, tajikAliases, typeMembers } from '../src/lsp/members';
import { LOCALES, messagesFor, normalizeLocale } from '../src/lsp/messages';
import { CompletionItemKind, SymbolKind } from '../src/lsp/protocol';
import {
  SEMANTIC_TOKEN_MODIFIERS,
  SEMANTIC_TOKEN_TYPES,
  semanticTokens,
} from '../src/lsp/semantic-tokens';
import { TextDocument } from '../src/lsp/text-document';

const en = messagesFor('en');
const tj = messagesFor('tj');

const analyze = (text: string, uri = 'file:///асосӣ.som') =>
  analyzeDocument(new TextDocument(uri, text, 1));

/** Offset of the `n`-th occurrence of `needle`, plus `delta`. */
function at(text: string, needle: string, delta = 0, n = 1): number {
  let index = -1;
  for (let i = 0; i < n; i++) index = text.indexOf(needle, index + 1);
  if (index === -1) throw new Error(`'${needle}' not found`);
  return index + delta;
}

const hoverText = (analysis: Analysis, offset: number, lookup?: (s: string) => Analysis) =>
  hover(analysis, offset, tj, lookup)?.contents.value;

describe('LSP keywords', () => {
  test('every lexer keyword is documented, with its English equivalent', () => {
    expect(undocumentedKeywords()).toEqual([]);
    for (const word of KEYWORDS.keys()) {
      const info = KEYWORD_INFO.get(word)!;
      expect(info.english.length).toBeGreaterThan(0);
      expect(info.doc.length).toBeGreaterThan(5);
    }
  });

  test('contextual keywords are marked and documented', () => {
    expect(CONTEXTUAL_KEYWORDS).toEqual(
      expect.arrayContaining(['кун', 'ҳосил', 'шумориш', 'эълон', 'модул', 'глобалӣ'])
    );
    expect(CONTEXTUAL_KEYWORDS).toEqual(
      expect.arrayContaining(['истифода', 'бознавис', 'дастрасӣ', 'берун'])
    );
    for (const word of CONTEXTUAL_KEYWORDS) {
      expect(KEYWORD_INFO.get(word)?.contextual).toBe(true);
    }
    expect(ENGLISH_KEYWORDS).toEqual(expect.arrayContaining(['typeof', 'satisfies', 'declare']));
  });

  test('tells syntax keywords from built-in names', () => {
    expect(isSyntaxKeyword('агар')).toBe(true);
    expect(isSyntaxKeyword('кун')).toBe(true);
    expect(isSyntaxKeyword('чоп')).toBe(false);
    expect(isSyntaxKeyword('сабт')).toBe(false);
    expect(isSyntaxKeyword('қисмӣ')).toBe(false);
    expect(isSyntaxKeyword('ном')).toBe(false);
  });
});

describe('LSP messages', () => {
  test('every locale has every message', () => {
    for (const locale of LOCALES) {
      const messages = messagesFor(locale);
      expect(Object.keys(messages.kinds)).toHaveLength(14);
      expect(messages.configError('x')).toContain('x');
      expect(messages.formatterFailed('сабаб')).toContain('сабаб');
      expect(messages.internalError('сабаб')).toContain('сабаб');
    }
  });

  test('normalizes locale names like the CLI', () => {
    expect(normalizeLocale('ru-RU')).toBe('ru');
    expect(normalizeLocale('tg_TJ.UTF-8')).toBe('tj');
    expect(normalizeLocale('tj')).toBe('tj');
    expect(normalizeLocale('de')).toBe('en');
    expect(normalizeLocale(undefined)).toBe('en');
    expect(messagesFor('ru').kinds.function).toBe('функция');
  });
});

describe('LSP hover', () => {
  const text = [
    'интерфейс Корбар { ном: сатр; синну: рақам; }',
    'функсия салом(к: Корбар): сатр {',
    '  бозгашт "Салом, " + к.ном;',
    '}',
    'собит рӯйхатҳо = [1, 2, 3];',
    'агар (рӯйхатҳо.дарозӣ > 2) { чоп.сабт(салом({ ном: "Алӣ", синну: 3 })); }',
    'тағ берун = 1;',
    'кун { берун++; } то (берун < 3);',
  ].join('\n');
  const analysis = analyze(text);

  test('shows the type of variables, parameters and functions', () => {
    expect(hoverText(analysis, at(text, 'рӯйхатҳо', 1))).toBe(
      '```som\n(собит) рӯйхатҳо: рақам[]\n```'
    );
    expect(hoverText(analysis, at(text, 'к:'))).toBe('```som\n(параметр) к: Корбар\n```');
    expect(hoverText(analysis, at(text, 'салом(', 0, 1))).toBe(
      '```som\n(функсия) салом: (к: Корбар) => сатр\n```'
    );
    // A use of the name has its own (possibly narrowed) type
    expect(hoverText(analysis, at(text, 'салом({'))).toContain('(к: Корбар) => сатр');
  });

  test('shows declarations of types by their keyword', () => {
    expect(hoverText(analysis, at(text, 'Корбар', 0, 2))).toBe('```som\nинтерфейс Корбар\n```');
  });

  test('shows the type of members', () => {
    expect(hoverText(analysis, at(text, 'к.ном', 2))).toBe('```som\n(хосият) ном: сатр\n```');
  });

  test('explains keywords in Tajik with their English equivalent', () => {
    const value = hoverText(analysis, at(text, 'агар'))!;
    expect(value).toContain('**агар** — калимаи калидӣ');
    expect(value).toContain('`if`');
    expect(value).toContain('Агар шарт дуруст бошад');
    // The labels follow the locale; the docs stay Tajik
    expect(hover(analysis, at(text, 'агар'), en)?.contents.value).toContain('keyword');
    expect(hoverText(analysis, at(text, 'кун'))).toContain('калимаи калидии вобаста ба мавқеъ');
    expect(hoverText(analysis, at(text, 'чоп'))).toContain('`console`');
  });

  test('a contextual keyword used as a name shows the name', () => {
    expect(hoverText(analysis, at(text, 'берун', 0, 2))).toBe(
      '```som\n(тағйирёбанда) берун: рақам\n```'
    );
  });

  test('built-in members show what they stand for', () => {
    expect(hoverText(analysis, at(text, 'сабт'))).toContain('JavaScript/TypeScript: `log`');
    expect(hoverText(analysis, at(text, 'дарозӣ'))).toContain('`length`');
  });

  test('nothing to show off names', () => {
    expect(hover(analysis, at(text, '['), tj)).toBeNull();
    expect(hover(analysis, at(text, '"Салом') + 2, tj)).toBeNull();
  });

  test('without tokens (a lexer error) keywords are still explained', () => {
    const broken = analyze('агар (х) { чоп.сабт("бе охир); }');
    expect(hoverText(broken, 1)).toContain('`if`');
    expect(hover(broken, at(broken.document.text, 'х'), tj)).toBeNull();
  });

  test('imported names show their type in the imported module', () => {
    const main = analyze('ворид { ҷамъ } аз "./м";\nҷамъ(1, 2);');
    const module = analyze('содир функсия ҷамъ(а: рақам, б: рақам): рақам { бозгашт а + б; }');
    const value = hoverText(main, 9, () => module)!;
    expect(value).toContain('(воридот) ҷамъ: (а: рақам, б: рақам) => рақам');
    expect(value).toContain('"./м"');
    expect(hoverText(main, 9)).toBe('```som\n(воридот) ҷамъ\n```\n\n"./м"');
  });
});

describe('LSP completion', () => {
  const labels = (items: { label: string }[]) => items.map(item => item.label);
  const sorted = <T extends { label: string; sortText?: string }>(items: T[]) =>
    [...items].sort((a, b) => (a.sortText ?? a.label).localeCompare(b.sortText ?? b.label));

  test('offers names in scope first, then Tajik keywords, then English ones', () => {
    const text = 'тағ ҳисоб = 1;\nфунксия ф(параметр: рақам) {\n  \n}\n';
    const analysis = analyze(text);
    const items = sorted(completion(analysis, at(text, '  \n', 2), tj));
    const names = labels(items);
    expect(names.slice(0, 3)).toEqual(expect.arrayContaining(['ҳисоб', 'ф', 'параметр']));
    expect(names.indexOf('агар')).toBeLessThan(names.indexOf('typeof'));
    expect(names.indexOf('чоп')).toBeLessThan(names.indexOf('console'));
    expect(names).not.toContain('сабт'); // built-in members only after a `.`
    const keyword = items.find(item => item.label === 'барои')!;
    expect(keyword.kind).toBe(CompletionItemKind.Keyword);
    expect(keyword.detail).toBe('for');
    expect(items.find(item => item.label === 'рақам')?.kind).toBe(CompletionItemKind.Interface);
    expect(items.find(item => item.label === 'параметр')?.detail).toBe('рақам');
    expect(items.find(item => item.label === 'Math')?.kind).toBe(CompletionItemKind.Variable);
    // Outside the function its parameter is not offered
    expect(labels(completion(analysis, 0, tj))).not.toContain('параметр');
  });

  test('members of built-in types: Tajik aliases before the English names', () => {
    // `;` ends the unfinished lines, so they do not swallow the next statement
    const text = 'собит н = [1, 2];\nн.;\nтағ с = "а";\nс.;\n';
    const analysis = analyze(text);
    const arrayItems = sorted(completion(analysis, at(text, 'н.', 2), tj));
    const names = labels(arrayItems);
    expect(names).toEqual(expect.arrayContaining(['илова', 'дарозӣ', 'харита', 'push', 'map']));
    expect(names.indexOf('харита')).toBeLessThan(names.indexOf('map'));
    expect(arrayItems.find(item => item.label === 'илова')?.detail).toBe('push');
    expect(names).not.toContain('__proto__');
    const stringNames = labels(completion(analysis, at(text, 'с.', 2), tj));
    expect(stringNames).toEqual(expect.arrayContaining(['калон', 'toUpperCase', 'дарозӣ']));
    expect(stringNames).not.toContain('илова');
  });

  test('members of global objects, literals and user types', () => {
    const text = [
      'интерфейс Нуқта { х: рақам; ҳаракат(): беджавоб; }',
      'функсия ф(н: Нуқта, м: Map<сатр, рақам> | холӣ) {',
      '  н.;',
      '  м?.;',
      '}',
      'чоп.;',
      'Риёзӣ.;',
      '"матн".;',
      '[1].;',
      '/а/.;',
      'нестшуда.;',
      'а[0].;',
      'ф().;',
      '1..;',
      'н.х.;',
    ].join('\n');
    const analysis = analyze(text);
    const complete = (needle: string) =>
      labels(completion(analysis, at(text, needle, needle.length), tj));
    expect(complete('  н.').slice(0, 2)).toEqual(['х', 'ҳаракат']);
    expect(complete('м?.')).toEqual(expect.arrayContaining(['гузоштан', 'set', 'ҳаҷм']));
    expect(complete('чоп.')).toEqual(expect.arrayContaining(['сабт', 'хато', 'log', 'table']));
    expect(complete('Риёзӣ.')).toEqual(expect.arrayContaining(['ПИ', 'дуръшака', 'sqrt']));
    expect(complete('"матн".')).toContain('калон');
    expect(complete('[1].')).toContain('илова');
    expect(complete('/а/.')).toContain('test');
    expect(complete('нестшуда.')).toEqual([]);
    expect(complete('а[0].')).toEqual([]);
    expect(complete('ф().')).toEqual([]);
    expect(complete('1..')).toContain('агар'); // not a member access
    // Members of members
    expect(analyze('собит о = { а: "с" };\nо.а.\n').diagnostics.length).toBeGreaterThan(0);
    const nested = analyze('собит о = { а: "с" };\nо.а.\n');
    expect(labels(completion(nested, at(nested.document.text, 'о.а.', 4), tj))).toContain('калон');
    const unknownMember = analyze('собит о = { а: "с" };\nо.б.\n');
    expect(completion(unknownMember, at(unknownMember.document.text, 'о.б.', 4), tj)).toEqual([]);
  });

  test('static members of classes, enum members, namespace exports and module exports', () => {
    const text = [
      'синф Ҳисоб { статикӣ шумора = 0; статикӣ нав_() {} баланс = 0; }',
      'шумориш Ранг { Сурх, Сабз }',
      'номфазо Н { содир собит в = 1; собит пинҳон = 2; }',
      'ворид * чун М аз "./м";',
      'ворид * чун Нест аз "./нест";',
      'Ҳисоб.;',
      'Ранг.;',
      'Н.;',
      'М.;',
      'Нест.;',
    ].join('\n');
    const analysis = analyze(text);
    const module = analyze(
      'содир функсия ҷамъ() {}\nсодир пешфарз синф А {}\nфунксия пинҳонӣ() {}'
    );
    const lookup = (specifier: string) => (specifier === './м' ? module : undefined);
    const complete = (needle: string) =>
      labels(completion(analysis, at(text, needle, needle.length), tj, lookup));
    expect(complete('Ҳисоб.')).toEqual(expect.arrayContaining(['шумора', 'нав_', 'name']));
    expect(complete('Ҳисоб.')).not.toContain('баланс');
    expect(complete('Ранг.').slice(0, 2)).toEqual(['Сурх', 'Сабз']);
    expect(complete('Н.')).toEqual(['в']);
    expect(complete('М.')).toEqual(['ҷамъ']);
    expect(complete('Нест.')).toEqual([]);
  });

  test('recognizes what precedes the dot', () => {
    expect(memberContext('а.б.в', 5)).toEqual({ chain: ['а', 'б'], start: 0 });
    expect(memberContext('а?.б?.', 6)).toEqual({ chain: ['а', 'б'], start: 0 });
    expect(memberContext('...а', 4)).toBeUndefined();
    expect(memberContext('х', 1)).toBeUndefined();
    expect(memberContext('"а".', 4)).toEqual({ literal: 'string' });
    expect(memberContext('2.', 2)).toBeUndefined();
    expect(memberContext('ф(]).', 5)).toEqual({ unknown: true });
    expect(memberContext('х .', 3)).toBeUndefined();
    expect(memberContext('.', 1)).toBeUndefined();
  });
});

describe('LSP definition', () => {
  const text = [
    'ворид { ҷамъ, тарҳ чун т } аз "./math";',
    'ворид * чун М аз "./math";',
    'ворид пешфарз_ аз "./math";',
    'интерфейс Нуқта { х: рақам; }',
    'синф Ҳисоб { баланс = 0; статикӣ шумора = 1; }',
    'тағ н: Нуқта = { х: 1 };',
    'собит ҳ = нав Ҳисоб();',
    'ҷамъ(н.х, т(1, 2));',
    'М.ҷамъ(1, 2); М.нест;',
    'ҳ.баланс; Ҳисоб.шумора; номаълум.баланс;',
    'пешфарз_;',
    'ворид { нест } аз "./нест";',
    'нест;',
  ].join('\n');
  const uri = 'file:///асосӣ.som';
  const analysis = analyze(text, uri);
  const math = analyze(
    'содир функсия ҷамъ(а: рақам, б: рақам) { бозгашт а + б; }\nфунксия тарҳ(а: рақам, б: рақам) { бозгашт а - б; }\nсодир { тарҳ };\nсодир пешфарз функсия асосӣ() {}',
    'file:///math.som'
  );
  const loader = (specifier: string): ResolvedModule | undefined =>
    specifier === './math' ? { uri: 'file:///math.som', analysis: math } : undefined;
  const target = (offset: number) =>
    definition(analysis, uri, offset, loader).map(location => {
      const source = location.uri === uri ? analysis : math;
      const { start, end } = location.range;
      return [
        location.uri,
        source.document.text.slice(source.document.offsetAt(start), source.document.offsetAt(end)),
        start.line,
      ];
    });

  test('names resolve to their declaration in the file', () => {
    expect(target(at(text, 'н.х', 0))).toEqual([[uri, 'н', 5]]);
    expect(target(at(text, 'Нуқта', 0, 2))).toEqual([[uri, 'Нуқта', 3]]);
    expect(target(at(text, 'нав Ҳисоб', 4))).toEqual([[uri, 'Ҳисоб', 4]]);
  });

  test('imported names lead into the imported module', () => {
    expect(target(at(text, 'ҷамъ(н'))).toEqual([['file:///math.som', 'ҷамъ', 0]]);
    expect(target(at(text, 'т(1'))).toEqual([['file:///math.som', 'тарҳ', 1]]);
    expect(target(at(text, 'пешфарз_;'))).toEqual([['file:///math.som', 'асосӣ', 3]]);
    expect(target(at(text, 'М.ҷамъ'))).toEqual([['file:///math.som', '', 0]]);
    expect(target(at(text, '"./math"', 2))).toEqual([['file:///math.som', '', 0]]);
    // An unresolved module: the import itself
    expect(target(at(text, '\nнест;', 1))).toEqual([[uri, 'нест', 11]]);
    expect(target(at(text, '"./нест"', 2))).toEqual([]);
  });

  test('members resolve through declarations, types and namespace imports', () => {
    expect(target(at(text, 'н.х', 2))).toEqual([[uri, 'х', 3]]);
    expect(target(at(text, 'ҳ.баланс', 2))).toEqual([[uri, 'баланс', 4]]);
    expect(target(at(text, 'Ҳисоб.шумора', 6))).toEqual([[uri, 'шумора', 4]]);
    expect(target(at(text, 'М.ҷамъ', 2))).toEqual([['file:///math.som', 'ҷамъ', 0]]);
    expect(target(at(text, 'М.нест', 2))).toEqual([]);
    // Unknown receiver: every member with that name
    expect(target(at(text, 'номаълум.баланс', 9))).toEqual([[uri, 'баланс', 4]]);
  });

  test('nothing for keywords, punctuation and unknown names', () => {
    expect(target(at(text, 'ворид'))).toEqual([]);
    expect(target(at(text, '{'))).toEqual([]);
    expect(definition(analysis, uri, at(text, 'номаълум'), loader)).toEqual([]);
  });
});

describe('LSP document symbols', () => {
  test('outline with members, kinds and types', () => {
    const text = [
      'ворид { а } аз "./а";',
      'собит ПИ = 3.14;',
      'функсия ф(х: рақам): рақам { тағ дохилӣ = х; бозгашт дохилӣ; }',
      'синф К { конструктор() {} м() {} п = 1; }',
      'шумориш Р { А }',
    ].join('\n');
    const symbols = documentSymbols(analyze(text));
    expect(symbols.map(symbol => [symbol.name, symbol.kind])).toEqual([
      ['ПИ', SymbolKind.Constant],
      ['ф', SymbolKind.Function],
      ['К', SymbolKind.Class],
      ['Р', SymbolKind.Enum],
    ]);
    // A constant keeps its literal type
    expect(symbols[0].detail).toBe('3.14');
    expect(symbols[1].detail).toBe('(х: рақам) => рақам');
    expect(symbols[1].children).toBeUndefined();
    expect(symbols[2].children!.map(child => [child.name, child.kind])).toEqual([
      ['конструктор', SymbolKind.Constructor],
      ['м', SymbolKind.Method],
      ['п', SymbolKind.Property],
    ]);
    expect(symbols[3].children![0].kind).toBe(SymbolKind.EnumMember);
    expect(symbols[1].range.start).toEqual({ line: 2, character: 0 });
    expect(symbols[1].selectionRange.start).toEqual({ line: 2, character: 8 });
  });
});

describe('LSP semantic tokens', () => {
  /** Decodes the relative encoding into [line, character, text, type, modifiers]. */
  function decode(analysis: Analysis) {
    const { data } = semanticTokens(analysis);
    const result: Array<[string, string, string[]]> = [];
    let line = 0;
    let character = 0;
    for (let i = 0; i < data.length; i += 5) {
      line += data[i];
      character = data[i] === 0 ? character + data[i + 1] : data[i + 1];
      const offset = analysis.document.offsetAt({ line, character });
      const modifiers = SEMANTIC_TOKEN_MODIFIERS.filter((_, bit) => data[i + 4] & (1 << bit));
      result.push([
        analysis.document.text.slice(offset, offset + data[i + 2]),
        SEMANTIC_TOKEN_TYPES[data[i + 3]],
        [...modifiers],
      ]);
    }
    return result;
  }

  test('classifies names by their declarations, keywords and built-ins', () => {
    const text = [
      'ворид * чун М аз "./м";',
      'собит ПИ = 3.14;',
      'функсия ф(х: рақам) {',
      '  чоп.сабт(х, ПИ, М);',
      '}',
      'синф К {}',
      'ҳосил;',
    ].join('\n');
    const tokens = decode(analyze(text));
    expect(tokens).toEqual(
      expect.arrayContaining([
        ['ворид', 'keyword', []],
        ['М', 'namespace', ['declaration']],
        ['ПИ', 'variable', ['declaration', 'readonly']],
        ['ф', 'function', ['declaration']],
        ['х', 'parameter', ['declaration']],
        ['рақам', 'type', ['defaultLibrary']],
        ['чоп', 'variable', ['defaultLibrary']],
        ['сабт', 'method', []],
        ['х', 'parameter', []],
        ['ПИ', 'variable', ['readonly']],
        ['К', 'class', ['declaration']],
        ['ҳосил', 'keyword', []],
      ])
    );
    // Unknown names get no token
    expect(decode(analyze('номаълум;'))).toEqual([]);
    expect(decode(analyze('о.хосият;')).map(token => token[1])).toEqual(['property']);
  });
});

describe('LSP formatting hooks', () => {
  afterEach(() => {
    registerFormatter(undefined);
    registerChecker('test', undefined);
  });

  test('formats through the formatter, as one edit or none', () => {
    const document = new TextDocument('file:///а.som', 'тағ  х=1;\n');
    const options = { tabSize: 2, insertSpaces: true };
    const seen: unknown[] = [];
    const edits = formatDocument(
      document,
      (source, formatOptions) => {
        seen.push(formatOptions);
        return source.replace('  х=1', ' х = 1');
      },
      options,
      '/tmp/а.som'
    );
    expect(seen).toEqual([{ tabSize: 2, insertSpaces: true, fileName: '/tmp/а.som' }]);
    expect(edits).toEqual([
      {
        range: { start: { line: 0, character: 0 }, end: { line: 1, character: 0 } },
        newText: 'тағ х = 1;\n',
      },
    ]);
    expect(formatDocument(document, source => source, options)).toEqual([]);
  });

  test('accepts formatters that return an object', () => {
    expect(formattedText('а')).toBe('а');
    expect(formattedText({ code: 'б' })).toBe('б');
    expect(formattedText({ formatted: 'в' })).toBe('в');
    expect(formattedText({ output: 'г' })).toBe('г');
    expect(() => formattedText({})).toThrow('no text');
  });

  test('finds an injected, registered or discovered formatter', () => {
    const injected = () => 'а';
    const registered = () => 'б';
    expect(resolveFormatter({}, () => undefined)).toBeUndefined();
    expect(resolveFormatter({ formatter: injected })).toBe(injected);
    registerFormatter(registered);
    expect(resolveFormatter({})).toBe(registered);
    registerFormatter(undefined);
    const discovered = () => 'в';
    const loaded: string[] = [];
    const load = (id: string) => {
      loaded.push(id);
      return id === '../format' ? { formatSource: discovered, other: 1 } : undefined;
    };
    expect(resolveFormatter({}, load)).toBe(discovered);
    expect(loaded).toEqual(['../formatter', '../format']);
    expect(resolveFormatter({}, () => ({ notAFormatter: 1 }))).toBeUndefined();
    // No formatter module exists in this version: formatting stays disabled
    expect(resolveFormatter()).toBeUndefined();
  });

  test('checkers are injected or registered by name', () => {
    const checker = () => [];
    expect(resolveChecker('test')).toBeUndefined();
    registerChecker('test', checker);
    expect(resolveChecker('test')).toBe(checker);
    const other = () => [];
    expect(resolveChecker('test', { checkers: { test: other } })).toBe(other);
    registerChecker('test', undefined);
    expect(resolveChecker('test')).toBeUndefined();
  });
});

describe('LSP members', () => {
  test('built-in kinds of types', () => {
    expect(typeMembers({ kind: 'primitive', name: 'number' }).builtin.has('toFixed')).toBe(true);
    expect(typeMembers({ kind: 'literal', value: true }).builtin.has('valueOf')).toBe(true);
    expect(typeMembers({ kind: 'tuple', types: [] }).builtin.has('push')).toBe(true);
    expect(typeMembers({ kind: 'function' }).builtin.has('bind')).toBe(true);
    expect(typeMembers({ kind: 'generic', name: 'Set' }).builtin.has('add')).toBe(true);
    expect(typeMembers({ kind: 'generic', name: 'Ваъда' }).builtin.has('then')).toBe(true);
    expect(typeMembers({ kind: 'primitive', name: 'null' }).builtin.size).toBe(0);
    expect(typeMembers({ kind: 'unknown' }).builtin.size).toBe(0);
  });

  test('declared members, base classes and unions', () => {
    const base = {
      kind: 'class',
      name: 'А',
      properties: new Map([['а', { type: { kind: 'unknown' }, optional: false }]]),
    };
    const derived = {
      kind: 'class',
      name: 'Б',
      baseType: base,
      properties: new Map([['б', { type: { kind: 'unknown' }, optional: false }]]),
    };
    const members = typeMembers({
      kind: 'union',
      types: [derived, { kind: 'primitive', name: 'null' }],
    });
    expect([...members.own.keys()]).toEqual(['б', 'а']);
    expect(members.builtin.has('hasOwnProperty')).toBe(true);
  });

  test('global objects and Tajik aliases', () => {
    expect(globalObjectMembers('номаълум')).toBeUndefined();
    const consoleMembers = globalObjectMembers('чоп')!;
    expect(consoleMembers.builtin.has('log')).toBe(true);
    expect(consoleMembers.builtin.has('Console')).toBe(false);
    expect(tajikAliases(consoleMembers.builtin)).toEqual(
      expect.arrayContaining([
        ['сабт', 'log'],
        ['ҷадвал', 'table'],
      ])
    );
  });
});

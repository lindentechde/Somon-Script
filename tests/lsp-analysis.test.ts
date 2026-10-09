import { analyzeDocument, messageDiagnostic, nameType, rangeAt } from '../src/lsp/analysis';
import { DiagnosticSeverity } from '../src/lsp/protocol';
import { exportedDeclaration, resolveName, scopeAt, visibleDeclarations } from '../src/lsp/symbols';
import { TextDocument } from '../src/lsp/text-document';
import {
  braceGroupEnd,
  extentEnd,
  tokenIndexAt,
  tokenizeDocument,
  wordTokenAt,
} from '../src/lsp/tokens';

const analyze = (text: string, options = {}) =>
  analyzeDocument(new TextDocument('file:///санҷиш.som', text, 1), options);

/** Text a diagnostic's range covers. */
function covered(text: string, range: { start: { line: number; character: number }; end: any }) {
  const document = new TextDocument('file:///x.som', text);
  return text.slice(document.offsetAt(range.start), document.offsetAt(range.end));
}

describe('LSP analysis: diagnostics', () => {
  test('a valid program has no diagnostics', () => {
    const analysis = analyze('тағ х: рақам = 1;\nчоп.сабт(х + 1);\n');
    expect(analysis.diagnostics).toEqual([]);
    expect(analysis.program?.body).toHaveLength(2);
  });

  test('lexer errors underline where the lexer stopped', () => {
    const text = 'тағ х = 1;\nтағ с = "бе охир;\n';
    const analysis = analyze(text);
    expect(analysis.diagnostics).toHaveLength(1);
    const [problem] = analysis.diagnostics;
    expect(problem.message).toBe('Unterminated string');
    expect(problem.severity).toBe(DiagnosticSeverity.Error);
    expect(problem.source).toBe('somon');
    expect(problem.range.start).toEqual({ line: 1, character: 8 });
    // Without tokens there is no syntax tree and no symbols
    expect(analysis.program).toBeUndefined();
    expect(analysis.symbols.all).toEqual([]);
  });

  test('parser errors are placed at the unexpected token, without the position text', () => {
    const text = 'тағ х = ;\nтағ у = 2;\n';
    const analysis = analyze(text);
    expect(analysis.diagnostics).toHaveLength(1);
    const [problem] = analysis.diagnostics;
    expect(problem.message).not.toMatch(/line \d+, column \d+/);
    expect(problem.message).toContain("Unexpected token ';'");
    expect(covered(text, problem.range)).toBe(';');
    // Statements that parsed still have symbols and types
    expect(analysis.symbols.all.map(declaration => declaration.name)).toContain('у');
  });

  test('a parse error at the end of input points at the end', () => {
    const text = 'функсия ф() {';
    const [problem] = analyze(text).diagnostics;
    expect(problem.range.start).toEqual({ line: 0, character: text.length });
  });

  test('type errors cover the offending expression with the checker code', () => {
    const text = 'тағ ном: сатр = 42;\n';
    const [problem] = analyze(text).diagnostics;
    expect(problem.code).toBe('TYPE_NOT_ASSIGNABLE');
    expect(problem.message).toContain('is not assignable');
    expect(covered(text, problem.range)).toBe('42');
  });

  test('type warnings are warnings; strict from the config makes them errors', () => {
    const text = 'интерфейс К { ном: сатр; }\nфунксия ф(к: К) { бозгашт к.синну; }\n';
    const loose = analyze(text).diagnostics;
    expect(loose).toHaveLength(1);
    expect(loose[0].severity).toBe(DiagnosticSeverity.Warning);
    expect(covered(text, loose[0].range)).toBe('синну');

    const strict = analyze(text, { compilerOptions: { strict: true } }).diagnostics;
    expect(strict).toHaveLength(1);
    expect(strict[0].severity).toBe(DiagnosticSeverity.Error);
  });

  test('noTypeCheck drops type diagnostics but keeps hover types', () => {
    const analysis = analyze('тағ ном: сатр = 42;\n', { compilerOptions: { noTypeCheck: true } });
    expect(analysis.diagnostics).toEqual([]);
    expect(analysis.types.size).toBeGreaterThan(0);
  });

  test('code generation errors are reported too', () => {
    const text = 'барои (тағ и = 0; и < 3; и++) { шикастан берун; }\n';
    const [problem] = analyze(text).diagnostics;
    expect(problem.message).toContain("Undefined label 'берун'");
    expect(covered(text, problem.range)).toBe('шикастан');
  });

  test('a configuration error is reported on the first line', () => {
    const analysis = analyze('тағ х = 1;\n', { configError: 'somon.config.json: bad' });
    expect(analysis.diagnostics).toEqual([
      expect.objectContaining({
        message: 'somon.config.json: bad',
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 10 } },
      }),
    ]);
  });

  test('an injected checker replaces the built-in one for compilerOptions.checker', () => {
    const calls: unknown[] = [];
    const analysis = analyze('тағ х = 1;\nх;\n', {
      compilerOptions: { checker: 'typescript', strict: true },
      locale: 'ru',
      fileName: '/tmp/санҷиш.som',
      hooks: {
        checkers: {
          typescript: (source: string, options: unknown) => {
            calls.push(options);
            return [
              { message: 'TS2304', line: 2, column: 1, code: 'TS2304' },
              { message: 'warn', line: 1, column: 5, severity: 'warning' as const },
            ];
          },
        },
      },
    });
    expect(calls).toEqual([
      {
        fileName: '/tmp/санҷиш.som',
        compilerOptions: { checker: 'typescript', strict: true },
        locale: 'ru',
      },
    ]);
    expect(analysis.diagnostics.map(d => [d.message, d.severity, d.range.start.line])).toEqual([
      ['TS2304', DiagnosticSeverity.Error, 1],
      ['warn', DiagnosticSeverity.Warning, 0],
    ]);
  });

  test('a failing injected checker reports nothing instead of crashing', () => {
    const analysis = analyze('тағ х = 1;\n', {
      compilerOptions: { checker: 'broken' },
      hooks: {
        checkers: {
          broken: () => {
            throw new Error('boom');
          },
        },
      },
    });
    expect(analysis.diagnostics).toEqual([]);
  });

  test('without an injected checker the compiler runs the configured one', () => {
    const text = 'тағ ном: сатр = 42;\n';
    const analysis = analyze(text, { compilerOptions: { checker: 'typescript' } });
    expect(analysis.diagnostics.length).toBeGreaterThan(0);
    expect(analysis.diagnostics[0].severity).toBe(DiagnosticSeverity.Error);
    expect(analysis.diagnostics[0].range.start.line).toBe(0);
  });

  test('messages are placed by any position format they carry', () => {
    const text = 'тағ а = 1;\nтағ б = 2;\n';
    const { tokens } = tokenizeDocument(new TextDocument('file:///x.som', text));
    const document = new TextDocument('file:///x.som', text);
    const at = (message: string) => messageDiagnostic(document, tokens, message);
    expect(at('Bad thing at line 2, column 5').range.start).toEqual({ line: 1, character: 4 });
    expect(at('x.som(2,5): error TS1').range.start).toEqual({ line: 1, character: 4 });
    expect(at('x.som:2:5 - error').range.start).toEqual({ line: 1, character: 4 });
    expect(at('Somewhere on line 2, column 1').message).toBe('Somewhere on');
    const unplaced = at('No position here');
    expect(unplaced.message).toBe('No position here');
    expect(unplaced.range.start).toEqual({ line: 0, character: 0 });
    expect(
      messageDiagnostic(document, tokens, 'Hint at line 1, column 1', DiagnosticSeverity.Hint)
        .severity
    ).toBe(DiagnosticSeverity.Hint);
  });

  test('ranges: a token, a word, one character, or empty at line ends', () => {
    const text = 'тағ а = "сатр";\n';
    const document = new TextDocument('file:///x.som', text);
    const { tokens } = tokenizeDocument(document);
    const slice = (offset: number) => covered(text, rangeAt(document, tokens, offset));
    expect(slice(0)).toBe('тағ');
    expect(slice(text.indexOf('"'))).toBe('"сатр"');
    expect(slice(text.indexOf('ат'))).toBe('а'); // inside a token: one character
    expect(slice(text.indexOf('\n'))).toBe('');
    expect(slice(text.length)).toBe('');
    expect(slice(1)).toBe('а');
    // Without tokens, the word at the offset
    expect(covered(text, rangeAt(document, [], 4))).toBe('а');
  });
});

describe('LSP analysis: tokens', () => {
  test('locates strings, templates, numbers with separators and regexes', () => {
    const text = 'тағ а = "а\\"б" + `т ${1}` + 1_000n + /х+/g;';
    const document = new TextDocument('file:///x.som', text);
    const { tokens, error } = tokenizeDocument(document);
    expect(error).toBeUndefined();
    const sources = tokens.map(token => text.slice(token.start, token.end));
    expect(sources).toEqual([
      'тағ',
      'а',
      '=',
      '"а\\"б"',
      '+',
      '`т ${1}`',
      '+',
      '1_000n',
      '+',
      '/х+/g',
      ';',
    ]);
  });

  test('matches brackets and measures statements', () => {
    const text = 'ф(а, [1, 2], { б: 3 }); синф К { м() {} }';
    const { tokens } = tokenizeDocument(new TextDocument('file:///x.som', text));
    const open = tokenIndexAt(tokens, text.indexOf('('));
    expect(tokens[tokens[open].match!].value).toBe(')');
    expect(text.slice(0, extentEnd(tokens, 0))).toBe('ф(а, [1, 2], { б: 3 });');
    // An argument ends at the comma
    expect(text.slice(2, extentEnd(tokens, 2))).toBe('а');
    const classStart = tokenIndexAt(tokens, text.indexOf('синф'));
    expect(text.slice(text.indexOf('синф'), braceGroupEnd(tokens, classStart))).toBe(
      'синф К { м() {} }'
    );
    // No brace before the statement ends
    expect(braceGroupEnd(tokens, 0)).toBeUndefined();
    expect(tokenIndexAt(tokens, 1000)).toBe(-1);
    expect(wordTokenAt(tokens, text.indexOf(', [') + 1)).toBe(-1);
    // Touching the end of a name counts as on the name
    expect(wordTokenAt(tokens, text.indexOf(','))).toBe(2);
  });

  test('statement extents tolerate unbalanced brackets', () => {
    const text = 'ф(а';
    const { tokens } = tokenizeDocument(new TextDocument('file:///x.som', text));
    expect(extentEnd(tokens, 0)).toBe(text.length);
    expect(extentEnd([], 0)).toBe(0);
    const unclosed = tokenizeDocument(new TextDocument('file:///x.som', 'синф К {')).tokens;
    expect(braceGroupEnd(unclosed, 0)).toBe('синф К {'.length);
  });
});

describe('LSP analysis: symbols and scopes', () => {
  const program = [
    'ворид { ҷамъ, тарҳ чун т } аз "./math";',
    'ворид * чун М аз "./м";',
    'ворид пешфарз_ аз "./п";',
    'тағ х: рақам = 1;',
    'собит [а, { б, в: г }, ...д] = [1, { б: 2, в: 3 }];',
    'функсия салом<Т>(ном: сатр, { ҷой } = { ҷой: 1 }): сатр {',
    '  тағ дохилӣ = ном;',
    '  бозгашт дохилӣ;',
    '}',
    'синф Корбар мерос Асос {',
    '  ном: сатр = "";',
    '  статикӣ шумора = 0;',
    '  конструктор(хосусӣ синну: рақам) { супер(); }',
    '  гир(): сатр { бозгашт ин.ном; }',
    '  [Symbol.iterator]() {}',
    '}',
    'интерфейс И { а: рақам; б(): сатр; }',
    'навъ Т = сатр | рақам;',
    'шумориш Ранг { Сурх, Сабз }',
    'номфазо Н { содир собит в = 1; собит пинҳон = 2; }',
    'содир собит ф = (п: рақам) => п * 2;',
    'содир пешфарз синф Асосӣ {}',
    'барои (тағ и = 0; и < 3; и++) { тағ дар_давра = и; }',
    'кӯшиш { } гирифтан (хато) { чоп.сабт(хато); }',
    'собит К2 = синф { м() {} };',
    'функсия ф2(х: рақам): рақам;',
    'функсия ф2(х: ҳар): ҳар { бозгашт х; }',
  ].join('\n');
  const analysis = analyze(program);
  const names = (list: { name: string }[]) => list.map(declaration => declaration.name);
  const find = (name: string) => analysis.symbols.all.find(d => d.name === name)!;

  test('collects top-level declarations with their members', () => {
    const top = analysis.symbols.topLevel;
    expect(names(top)).toEqual([
      'ҷамъ',
      'т',
      'М',
      'пешфарз_',
      'х',
      'а',
      'б',
      'г',
      'д',
      'салом',
      'Корбар',
      'И',
      'Т',
      'Ранг',
      'Н',
      'ф',
      'Асосӣ',
      'К2',
      'ф2',
      'ф2',
    ]);
    const user = top.find(d => d.name === 'Корбар')!;
    expect(user.kind).toBe('class');
    expect(user.children.map(c => [c.name, c.kind, Boolean(c.static)])).toEqual([
      ['ном', 'property', false],
      ['шумора', 'property', true],
      ['конструктор', 'method', false],
      ['синну', 'property', false],
      ['гир', 'method', false],
    ]);
    expect(names(top.find(d => d.name === 'И')!.children)).toEqual(['а', 'б']);
    expect(names(top.find(d => d.name === 'Ранг')!.children)).toEqual(['Сурх', 'Сабз']);
    const namespace = top.find(d => d.name === 'Н')!;
    expect(namespace.children.map(c => [c.name, Boolean(c.exported)])).toEqual([
      ['в', true],
      ['пинҳон', false],
    ]);
  });

  test('records imports, exports and default exports', () => {
    expect(find('т')).toMatchObject({ kind: 'import', importFrom: './math', importedName: 'тарҳ' });
    expect(find('М')).toMatchObject({ importedName: '*' });
    expect(find('пешфарз_')).toMatchObject({ importedName: 'default', importFrom: './п' });
    expect(find('ф')).toMatchObject({ kind: 'constant', exported: true });
    expect(find('Асосӣ')).toMatchObject({ exported: true, defaultExport: true });
    expect(exportedDeclaration(analysis.symbols, 'default')?.name).toBe('Асосӣ');
    expect(exportedDeclaration(analysis.symbols, 'ф')?.name).toBe('ф');
    // Declared without `содир` but exported by name elsewhere
    expect(exportedDeclaration(analysis.symbols, 'х')?.name).toBe('х');
    expect(exportedDeclaration(analysis.symbols, 'нест')).toBeUndefined();
  });

  test('declaration extents span the whole declaration', () => {
    const user = find('Корбар');
    expect(program.slice(user.start, user.end)).toMatch(/^синф Корбар мерос Асос \{[\s\S]*\n\}$/);
    const greet = find('салом');
    expect(program.slice(greet.start, greet.end)).toMatch(
      /^функсия салом[\s\S]*бозгашт дохилӣ;\n\}$/
    );
    expect(program.slice(find('х').start, find('х').end)).toBe('тағ х: рақам = 1;');
  });

  test('function parameters, locals and type parameters live in the function scope', () => {
    const inside = program.indexOf('бозгашт дохилӣ');
    const visible = names(visibleDeclarations(analysis.symbols, inside));
    expect(visible).toEqual(expect.arrayContaining(['дохилӣ', 'ном', 'ҷой', 'Т', 'х', 'салом']));
    expect(names(visibleDeclarations(analysis.symbols, 0))).not.toContain('дохилӣ');
    expect(resolveName(analysis.symbols, 'ном', inside)?.kind).toBe('parameter');
    expect(resolveName(analysis.symbols, 'Т', inside)?.kind).toBe('typeParameter');
  });

  test('loops, catch clauses and arrow functions have scopes', () => {
    const loop = program.indexOf('тағ дар_давра');
    expect(resolveName(analysis.symbols, 'и', loop)?.kind).toBe('variable');
    expect(resolveName(analysis.symbols, 'и', 0)).toBeUndefined();
    const handler = program.indexOf('чоп.сабт(хато)');
    expect(resolveName(analysis.symbols, 'хато', handler)?.kind).toBe('variable');
    const arrow = program.indexOf('п * 2');
    expect(resolveName(analysis.symbols, 'п', arrow)?.kind).toBe('parameter');
    expect(scopeAt(analysis.symbols.root, arrow)).not.toBe(analysis.symbols.root);
  });

  test('a nearer declaration shadows an outer one', () => {
    const analysis = analyze('тағ х = 1;\nфунксия ф() { тағ х = "а"; бозгашт х; }\nх;');
    const inner = analysis.document.text.indexOf('бозгашт х') + 'бозгашт '.length;
    expect(resolveName(analysis.symbols, 'х', inner)?.nameStart).toBe(
      analysis.document.text.indexOf('х = "а"')
    );
    expect(analysis.typeToString(nameType(analysis, 'х', inner)!)).toBe('сатр');
    const outer = analysis.document.text.lastIndexOf('х;');
    expect(analysis.typeToString(nameType(analysis, 'х', outer)!)).toBe('рақам');
    expect(nameType(analysis, 'нест', 0)).toBeUndefined();
  });
});

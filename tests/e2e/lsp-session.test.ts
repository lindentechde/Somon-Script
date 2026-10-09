/**
 * `somon lsp` as an editor drives it: a project with somon.config.json (strict,
 * the TypeScript checker, fmt.indent) and modules that import each other,
 * opened, edited with full-text changes, queried and closed.
 */
import * as fs from 'fs';
import * as path from 'path';
import { pathToFileURL } from 'url';

import { SEMANTIC_TOKEN_MODIFIERS, SEMANTIC_TOKEN_TYPES } from '../../src/lsp/semantic-tokens';
import { canonicalTmpDir } from '../helpers/paths';
import { LspClient, decodeSemanticTokens } from './lsp-client';

jest.setTimeout(60000);

const MATH = [
  'содир функсия ҷамъ(а: рақам, б: рақам): рақам {',
  '    бозгашт а + б;',
  '}',
  'содир собит ПИ = 3.14;',
  '',
].join('\n');

const SHAPES = [
  'содир интерфейс Шакл {',
  '    ном: сатр;',
  '    масоҳат(): рақам;',
  '}',
  'содир синф Доира татбиқ Шакл {',
  '    ном = "доира";',
  '    конструктор(хосусӣ радиус: рақам) {}',
  '    масоҳат(): рақам {',
  '        бозгашт 3 * ин.радиус * ин.радиус;',
  '    }',
  '}',
  '',
].join('\n');

/** main.som, version 1: `ҷамъ` is called with a string. */
const MAIN = [
  'ворид { ҷамъ } аз "./math";',
  'ворид * чун М аз "./math";',
  'ворид { Доира, навъ Шакл } аз "./shapes";',
  'собит д: Шакл = нав Доира(2);',
  'тағ натиҷа: рақам = ҷамъ(1, "2");',
  'собит номҳо = ["як", "ду"];',
  'чоп.сабт(М.ПИ, д.масоҳат(), натиҷа, номҳо);',
  '',
].join('\n');

/** Position of the `occurrence`-th `needle` in `text` (zero-based line and UTF-16 column). */
function positionOf(text: string, needle: string, occurrence = 1, shift = 0) {
  let index = -1;
  for (let i = 0; i < occurrence; i++) {
    index = text.indexOf(needle, index + 1);
    if (index === -1) throw new Error(`${needle} #${occurrence} not in the text`);
  }
  const before = text.slice(0, index + shift);
  const line = before.split('\n').length - 1;
  return { line, character: before.length - before.lastIndexOf('\n') - 1 };
}

describe('somon lsp: an editing session (spawned)', () => {
  let dir: string;
  let client: LspClient | undefined;
  const uriOf = (name: string) => pathToFileURL(path.join(dir, name)).href;

  beforeEach(() => {
    dir = canonicalTmpDir('somon-lsp-session-');
  });
  afterEach(() => {
    client?.kill();
    client = undefined;
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('strict TypeScript checking, editing, navigation across files, formatting', async () => {
    fs.writeFileSync(
      path.join(dir, 'somon.config.json'),
      JSON.stringify({
        compilerOptions: { strict: true, checker: 'typescript' },
        fmt: { indent: 2 },
      })
    );
    fs.writeFileSync(path.join(dir, 'math.som'), MATH);
    fs.writeFileSync(path.join(dir, 'shapes.som'), SHAPES);
    fs.writeFileSync(path.join(dir, 'main.som'), MAIN);
    const main = uriOf('main.som');
    const math = uriOf('math.som');
    const shapes = uriOf('shapes.som');

    client = LspClient.start(['--lang', 'en'], dir);
    const init = await client.initialize(undefined, pathToFileURL(dir).href);
    expect((init.result as any).capabilities.semanticTokensProvider.legend).toEqual({
      tokenTypes: [...SEMANTIC_TOKEN_TYPES],
      tokenModifiers: [...SEMANTIC_TOKEN_MODIFIERS],
    });

    client.open(math, MATH);
    client.open(shapes, SHAPES);
    client.open(main, MAIN);
    expect((await client.diagnostics(math, 1)).diagnostics).toEqual([]);
    expect((await client.diagnostics(shapes, 1)).diagnostics).toEqual([]);

    // TypeScript checks the call against the signature imported from math.som
    const first = await client.diagnostics(main, 1);
    const stringArgument = positionOf(MAIN, '"2"');
    expect(first.diagnostics).toEqual([
      {
        range: {
          start: stringArgument,
          end: { line: stringArgument.line, character: stringArgument.character + 3 },
        },
        severity: 1,
        source: 'somon',
        message: "Argument of type 'сатр' is not assignable to parameter of type 'рақам'.",
        code: 'TS2345',
      },
    ]);

    // Fix it: the diagnostics clear
    const fixed = MAIN.replace('ҷамъ(1, "2")', 'ҷамъ(1, 2)');
    client.change(main, 2, fixed);
    expect((await client.diagnostics(main, 2)).diagnostics).toEqual([]);

    // A syntax error while typing, then a strict null error
    const broken = fixed.replace('собит номҳо', 'собит = номҳо');
    client.change(main, 3, broken);
    const syntax = await client.diagnostics(main, 3);
    expect(syntax.diagnostics).toEqual([
      {
        range: { start: positionOf(broken, '= номҳо'), end: positionOf(broken, '= номҳо', 1, 1) },
        severity: 1,
        source: 'somon',
        message: "Unexpected token '=' (Expected identifier)",
      },
    ]);

    const nullable = `${fixed}тағ ном: сатр = холӣ;\n`;
    client.change(main, 4, nullable);
    const strictError = await client.diagnostics(main, 4);
    expect(strictError.diagnostics.map(d => [d.code, d.message])).toEqual([
      ['TS2322', "Type 'холӣ' is not assignable to type 'сатр'."],
    ]);

    // Hover: an imported function with its signature, a local with its type
    const hoverAt = async (text: string, needle: string, occurrence = 1, shift = 0) =>
      (
        await client!.request('textDocument/hover', {
          textDocument: { uri: main },
          position: positionOf(text, needle, occurrence, shift),
        })
      ).result as any;
    expect((await hoverAt(nullable, 'ҷамъ', 2)).contents.value).toBe(
      '```som\n(import) ҷамъ: (а: рақам, б: рақам) => рақам\n```\n\n"./math"'
    );
    expect((await hoverAt(nullable, 'номҳо', 2)).contents.value).toBe(
      '```som\n(constant) номҳо: сатр[]\n```'
    );
    const keyword = await hoverAt(nullable, 'ворид');
    expect(keyword.contents.value).toMatch(
      /^\*\*ворид\*\* — keyword · JavaScript\/TypeScript: `import`/
    );

    // Completion after `.`: the exports of a namespace import, the members of an array
    const typing = nullable.replace('чоп.сабт(М.ПИ', 'М.\nчоп.сабт(М.ПИ');
    client.change(main, 5, typing);
    await client.diagnostics(main, 5);
    const completionAt = async (position: { line: number; character: number }) =>
      (
        (
          await client!.request('textDocument/completion', {
            textDocument: { uri: main },
            position,
            context: { triggerKind: 2, triggerCharacter: '.' },
          })
        ).result as any
      ).items as Array<{ label: string; kind: number; sortText: string }>;
    const moduleItems = await completionAt(positionOf(typing, 'М.\n', 1, 2));
    expect(moduleItems.map(item => item.label)).toEqual(['ҷамъ', 'ПИ']);

    const arrayTyping = nullable.replace('чоп.сабт(М.ПИ', 'номҳо.\nчоп.сабт(М.ПИ');
    client.change(main, 6, arrayTyping);
    await client.diagnostics(main, 6);
    const arrayItems = await completionAt(positionOf(arrayTyping, 'номҳо.\n', 1, 6));
    const labels = arrayItems.map(item => item.label);
    expect(labels).toEqual(expect.arrayContaining(['илова', 'харита', 'дарозӣ', 'push', 'map']));
    // Tajik names sort before English ones
    const sortText = new Map(arrayItems.map(item => [item.label, item.sortText]));
    expect(sortText.get('харита')! < sortText.get('map')!).toBe(true);

    // Back to the valid program
    client.change(main, 7, fixed);
    expect((await client.diagnostics(main, 7)).diagnostics).toEqual([]);

    // Go to definition: across files, through a namespace import and from a module specifier
    const definitionAt = async (needle: string, occurrence = 1, shift = 0) =>
      (
        await client!.request('textDocument/definition', {
          textDocument: { uri: main },
          position: positionOf(fixed, needle, occurrence, shift),
        })
      ).result;
    const rangeIn = (text: string, needle: string, occurrence = 1) => {
      const start = positionOf(text, needle, occurrence);
      return { start, end: { line: start.line, character: start.character + needle.length } };
    };
    expect(await definitionAt('ҷамъ', 2)).toEqual([{ uri: math, range: rangeIn(MATH, 'ҷамъ') }]);
    expect(await definitionAt('ПИ', 1)).toEqual([{ uri: math, range: rangeIn(MATH, 'ПИ') }]);
    expect(await definitionAt('Доира', 2)).toEqual([
      { uri: shapes, range: rangeIn(SHAPES, 'Доира') },
    ]);
    expect(await definitionAt('"./shapes"', 1, 2)).toEqual([
      { uri: shapes, range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } } },
    ]);
    // A local name stays in the file
    expect(await definitionAt('натиҷа', 2)).toEqual([
      { uri: main, range: rangeIn(fixed, 'натиҷа') },
    ]);

    // Semantic tokens of math.som: the function, its parameters, the constant, types, keywords
    const semantic = await client.request('textDocument/semanticTokens/full', {
      textDocument: { uri: math },
    });
    const decoded = decodeSemanticTokens((semantic.result as any).data);
    const tokenAt = (needle: string, occurrence = 1) => {
      const { line, character } = positionOf(MATH, needle, occurrence);
      const found = decoded.find(([l, c]) => l === line && c === character);
      if (!found) return undefined;
      const modifiers = SEMANTIC_TOKEN_MODIFIERS.filter((_, bit) => found[4] & (1 << bit));
      return { length: found[2], type: SEMANTIC_TOKEN_TYPES[found[3]], modifiers };
    };
    expect(tokenAt('содир')).toEqual({ length: 5, type: 'keyword', modifiers: [] });
    expect(tokenAt('ҷамъ')).toEqual({ length: 4, type: 'function', modifiers: ['declaration'] });
    expect(tokenAt('а:')).toEqual({ length: 1, type: 'parameter', modifiers: ['declaration'] });
    expect(tokenAt('рақам')).toEqual({ length: 5, type: 'type', modifiers: ['defaultLibrary'] });
    expect(tokenAt('а +')).toEqual({ length: 1, type: 'parameter', modifiers: [] });
    expect(tokenAt('ПИ')).toEqual({
      length: 2,
      type: 'variable',
      modifiers: ['declaration', 'readonly'],
    });

    // Formatting follows fmt.indent (2), not the editor's tab size
    const messy = 'функсия ф(){\nбозгашт   1;\n}\n';
    const scratch = uriOf('scratch.som');
    client.open(scratch, messy);
    await client.diagnostics(scratch, 1);
    const formatting = await client.request('textDocument/formatting', {
      textDocument: { uri: scratch },
      options: { tabSize: 8, insertSpaces: true },
    });
    expect(formatting.result).toEqual([
      {
        range: { start: { line: 0, character: 0 }, end: { line: 3, character: 0 } },
        newText: 'функсия ф() {\n  бозгашт 1;\n}\n',
      },
    ]);

    // Closing a document clears its diagnostics
    client.notify('textDocument/didClose', { textDocument: { uri: scratch } });
    const cleared = await client.waitFor(
      m =>
        m.method === 'textDocument/publishDiagnostics' &&
        (m.params as any).uri === scratch &&
        (m.params as any).version === undefined
    );
    expect((cleared.params as any).diagnostics).toEqual([]);

    expect(await client.shutdown()).toBe(0);
    expect(client.stderr).toBe('');
  });

  test('a changed somon.config.json and changed modules update the diagnostics', async () => {
    fs.writeFileSync(path.join(dir, 'somon.config.json'), JSON.stringify({ compilerOptions: {} }));
    fs.writeFileSync(path.join(dir, 'math.som'), MATH);
    const source = 'тағ ном: сатр = холӣ;\nчоп.сабт(ном);\n';
    const main = uriOf('main.som');

    client = LspClient.start(['--lang', 'en'], dir);
    await client.initialize();
    client.open(main, source);
    // Not strict: `холӣ` is assignable to `сатр`
    expect((await client.diagnostics(main, 1)).diagnostics).toEqual([]);

    // The project turns strict on: the editor reports the watched file, the server rechecks
    fs.writeFileSync(
      path.join(dir, 'somon.config.json'),
      JSON.stringify({ compilerOptions: { strict: true } })
    );
    client.notify('workspace/didChangeWatchedFiles', {
      changes: [{ uri: uriOf('somon.config.json'), type: 2 }],
    });
    await client.waitFor(() => client!.published(main).length === 2, 'the recheck');
    const strict = client.published(main)[1];
    expect(strict.version).toBe(1);
    expect(strict.diagnostics.map(d => [d.code, d.range.start])).toEqual([
      ['TYPE_NOT_ASSIGNABLE', { line: 0, character: 16 }],
    ]);

    // A broken configuration is reported on the first line, and checking goes on
    fs.writeFileSync(path.join(dir, 'somon.config.json'), '{ "compilerOptions": { "strict": 1 } }');
    client.notify('workspace/didChangeWatchedFiles', { changes: [] });
    await client.waitFor(() => client!.published(main).length === 3, 'the second recheck');
    const broken = client.published(main)[2];
    expect(broken.diagnostics[0].range).toEqual({
      start: { line: 0, character: 0 },
      end: { line: 0, character: source.indexOf('\n') },
    });
    expect(broken.diagnostics[0].message).toMatch(/^somon\.config\.json: /);
    expect(broken.diagnostics[0].message).toContain('strict');

    // The TypeScript checker reads imported modules from disk: a module that loses an
    // export breaks the files that import it once they are checked again
    fs.writeFileSync(
      path.join(dir, 'somon.config.json'),
      JSON.stringify({ compilerOptions: { checker: 'typescript' } })
    );
    const user = 'ворид { ҷамъ } аз "./math";\nчоп.сабт(ҷамъ(1, 2));\n';
    client.change(main, 2, user);
    expect((await client.diagnostics(main, 2)).diagnostics).toEqual([]);
    fs.writeFileSync(path.join(dir, 'math.som'), MATH.replace('ҷамъ', 'зарб'));
    client.change(main, 3, user);
    const missing = await client.diagnostics(main, 3);
    expect(missing.diagnostics.map(d => [d.code, d.message])).toEqual([
      [
        'TS2305',
        expect.stringMatching(/^Module '"\.\/math(\.js)?"' has no exported member 'ҷамъ'\./),
      ],
    ]);
    expect(missing.diagnostics[0].range.start).toEqual({ line: 0, character: 8 });

    expect(await client.shutdown()).toBe(0);
  });

  test('messages in the locale the client asks for', async () => {
    const uri = uriOf('а.som');
    client = LspClient.start(['--lang', 'en'], dir);
    await client.initialize({ locale: 'tg-TJ' });
    client.open(uri, 'тағ х = 1;\nх;\n');
    await client.diagnostics(uri, 1);
    const hover = async () =>
      (
        (
          await client!.request('textDocument/hover', {
            textDocument: { uri },
            position: { line: 1, character: 0 },
          })
        ).result as any
      ).contents.value as string;
    expect(await hover()).toBe('```som\n(тағйирёбанда) х: рақам\n```');
    client.notify('workspace/didChangeConfiguration', {
      settings: { somonscript: { locale: 'ru' } },
    });
    expect(await hover()).toBe('```som\n(переменная) х: рақам\n```');
    expect(await client.shutdown()).toBe(0);
  });
});

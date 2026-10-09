/**
 * The language server's less travelled paths: names inside template
 * literals, incomplete programs, unusual requests and notifications, module
 * lookups that fail, and the defensive limits of the member tables.
 */
import * as fs from 'fs';
import * as path from 'path';
import { PassThrough } from 'stream';
import { pathToFileURL } from 'url';

import { registerChecker, SomonLanguageServer, startLanguageServer } from '../src/lsp';
import { analyzeDocument, nameType, type Analysis } from '../src/lsp/analysis';
import { completion, memberContext } from '../src/lsp/completion';
import { definition, type ResolvedModule } from '../src/lsp/definition';
import { hover } from '../src/lsp/hover';
import { encodeMessage, MessageReader } from '../src/lsp/jsonrpc';
import { typeMembers } from '../src/lsp/members';
import { messagesFor } from '../src/lsp/messages';
import { DiagnosticSeverity, ErrorCode, type Message } from '../src/lsp/protocol';
import { semanticTokens } from '../src/lsp/semantic-tokens';
import { resolveName } from '../src/lsp/symbols';
import { TextDocument } from '../src/lsp/text-document';
import { braceGroupEnd, extentEnd, tokenizeDocument } from '../src/lsp/tokens';
import { TypeChecker, type Type } from '../src/type-checker';
import { canonicalTmpDir } from './helpers/paths';

const en = messagesFor('en');

const analyze = (text: string, options = {}) =>
  analyzeDocument(new TextDocument('file:///санҷиш.som', text, 1), options);

/** Offset of the `n`-th occurrence of `needle`, plus `delta`. */
function at(text: string, needle: string, delta = 0, n = 1): number {
  let index = -1;
  for (let i = 0; i < n; i++) index = text.indexOf(needle, index + 1);
  if (index === -1) throw new Error(`'${needle}' not found`);
  return index + delta;
}

/** The declarations of an analysis as `name: name text / extent text`. */
function declarations(analysis: Analysis): string[] {
  const { text } = analysis.document;
  return analysis.symbols.all.map(
    d => `${d.name}: ${text.slice(d.nameStart, d.nameEnd)} / ${text.slice(d.start, d.end)}`
  );
}

describe('LSP symbols in unusual places', () => {
  test('names declared inside a template literal are found where they are written', () => {
    // The lexer reads a template literal as one token: no token starts at these names
    const text =
      'чоп.сабт(`${[1].map(х => х * 2)} ${(() => { тағ а = 1; бозгашт а; })()} ${синф {}}`);';
    const analysis = analyze(text);
    expect(analysis.diagnostics).toEqual([]);
    expect(declarations(analysis)).toEqual([
      'х: х / х',
      // A statement inside the template extends to the first token after it
      'а: а / тағ а = 1; бозгашт а; })()} ${синф {}}`',
    ]);
    // Nothing to hover or go to inside the template token
    expect(hover(analysis, at(text, 'х =>'), en)).toBeNull();
    expect(definition(analysis, 'file:///санҷиш.som', at(text, 'а;'), () => undefined)).toEqual([]);
  });

  test('a template literal that ends the document', () => {
    const text = 'тағ с = `${(() => { тағ а = 1; бозгашт а; })()}${синф {}}`';
    const analysis = analyze(text);
    // No token after it: the statement inside it is as long as its keyword
    expect(declarations(analysis)).toEqual(['с: с / ' + text, 'а: а / тағ а']);
  });

  test('destructuring: rest elements, defaults and nested patterns', () => {
    const text = [
      'собит о = { а: 1, б: 2 };',
      'собит { а, ...боқӣ } = о;',
      'собит [в = 1, { г = 2 }] = [];',
      'функсия ф({ д = 1 }, [е] = [], ...ж: рақам[]) { бозгашт д; }',
    ].join('\n');
    const analysis = analyze(text);
    expect(analysis.symbols.all.map(d => [d.name, d.kind])).toEqual([
      ['о', 'constant'],
      ['а', 'constant'],
      ['боқӣ', 'constant'],
      ['в', 'constant'],
      ['г', 'constant'],
      ['ф', 'function'],
      ['д', 'parameter'],
      ['е', 'parameter'],
      ['ж', 'parameter'],
    ]);
    const rest = analysis.symbols.all.find(d => d.name === 'ж')!;
    expect(text.slice(rest.nameStart, rest.nameEnd)).toBe('ж');
  });

  test('abstract methods have no body: their extent is the signature', () => {
    const text = 'мавҳум синф А {\n  мавҳум м(х: рақам): беджавоб;\n  н() {}\n}';
    const [klass] = analyze(text).symbols.topLevel;
    expect(klass.children.map(child => text.slice(child.start, child.end))).toEqual([
      'м(х: рақам): беджавоб;',
      'н() {}',
    ]);
  });

  test('a declaration without a semicolon at the end of the document', () => {
    const text = 'тағ х = [1, 2]';
    expect(declarations(analyze(text))).toEqual(['х: х / тағ х = [1, 2]']);
  });

  test('statement extents and brace groups at the edges of the token list', () => {
    const { tokens } = tokenizeDocument(new TextDocument('file:///т.som', 'ф(а, б); синф К'));
    // An extent that starts at a closing bracket or a comma is empty
    const comma = tokens.findIndex(token => token.value === ',');
    expect(extentEnd(tokens, comma)).toBe(tokens[comma].start);
    const close = tokens.findIndex(token => token.value === ')');
    expect(extentEnd(tokens, close)).toBe(tokens[close].start);
    // No `{` up to the end: no group
    const klass = tokens.findIndex(token => token.value === 'синф');
    expect(braceGroupEnd(tokens, klass)).toBeUndefined();
    expect(extentEnd(tokens, klass)).toBe('ф(а, б); синф К'.length);
  });

  test('numbers with separators at the end of the document', () => {
    const text = 'тағ х = 1_000';
    const { tokens } = tokenizeDocument(new TextDocument('file:///т.som', text));
    expect(tokens.map(token => text.slice(token.start, token.end))).toEqual([
      'тағ',
      'х',
      '=',
      '1_000',
    ]);
  });
});

describe('LSP analysis: defensive paths', () => {
  test('a type checker that fails leaves the other diagnostics', () => {
    const check = jest.spyOn(TypeChecker.prototype, 'check').mockImplementation(() => {
      throw new Error('checker bug');
    });
    try {
      const analysis = analyze('тағ х: рақам = "сатр";\nшикастан нишона;\n');
      // No type error (the checker failed), but the code generator's error is there
      expect(analysis.diagnostics.map(d => d.message)).toEqual([expect.stringContaining('нишона')]);
      expect(analysis.diagnostics[0].range.start.line).toBe(1);
    } finally {
      check.mockRestore();
    }
  });

  test('an unknown checker without a hook: the compiler checks, warnings are warnings', () => {
    // somon.config.json allows only 'somon' and 'typescript'; other names come from the API
    const analysis = analyze('тағ х = [1];\nх.нест;\n', {
      compilerOptions: { checker: 'flow' },
    });
    expect(analysis.diagnostics).toHaveLength(1);
    expect(analysis.diagnostics[0]).toMatchObject({
      severity: DiagnosticSeverity.Warning,
      code: 'PROPERTY_NOT_FOUND',
      range: { start: { line: 1, character: 2 } },
    });
  });

  test("the type of a name whose reference the checker did not record is its declaration's", () => {
    const text = 'тағ х: рақам = 1;\nх;';
    const analysis = analyze(text);
    // Not a reference the checker saw: the declaration's type
    expect(analysis.typeToString(nameType(analysis, 'х', text.length)!)).toBe('рақам');
    expect(nameType(analysis, 'нест', text.length)).toBeUndefined();
  });
});

describe('LSP completion, hover and definition: rarer cases', () => {
  test('memberContext: a `]` without its `[` is an unknown receiver', () => {
    expect(memberContext('а].', 3)).toEqual({ unknown: true });
    expect(memberContext('[1, 2].', 7)).toEqual({ literal: 'array' });
  });

  test('a namespace import without a module lookup has no members', () => {
    const text = 'ворид * чун М аз "./м";\nМ.';
    expect(completion(analyze(text), text.length, en)).toEqual([]);
  });

  test('a named import is completed by the type the checker gives it', () => {
    const text = 'ворид { рӯйхат } аз "./м";\nрӯйхат.';
    // The checker does not know the module: no type, no members
    expect(completion(analyze(text), text.length, en)).toEqual([]);
  });

  test('own members hide built-in members and aliases of the same name', () => {
    const text = [
      'синф К {',
      '  баСатр(): сатр { бозгашт "К"; }',
      '  valueOf(): рақам { бозгашт 1; }',
      '}',
      'собит к = нав К();',
      'к.',
    ].join('\n');
    const items = completion(analyze(text), text.length, en);
    const labels = items.map(item => item.label);
    // Each name once: the class's own method, not the built-in alias or name
    expect(labels.filter(label => label === 'баСатр')).toHaveLength(1);
    expect(labels.filter(label => label === 'valueOf')).toHaveLength(1);
    expect(items.find(item => item.label === 'баСатр')!.sortText).toBe('0баСатр');
    expect(items.find(item => item.label === 'valueOf')!.sortText).toBe('0valueOf');
    // Other built-ins are still offered
    expect(labels).toEqual(expect.arrayContaining(['қиматиАслӣ', 'toString', 'hasOwnProperty']));
  });

  test('hover: a type parameter has no type; a built-in name after `.` is not explained', () => {
    const text = 'функсия ф<Т>(х: Т): Т { бозгашт х; }\nтағ о = ф(1);\nо.чоп;';
    const analysis = analyze(text);
    expect(hover(analysis, at(text, 'Т>'), en)!.contents.value).toBe(
      '```som\n(type parameter) Т\n```'
    );
    // `чоп` is a global, not a member: nothing to say about `о.чоп`
    expect(hover(analysis, at(text, 'чоп;'), en)).toBeNull();
  });

  test('definition: side-effect imports, require, ordinary strings, missing exports', () => {
    const text = [
      'ворид "./м";',
      'ворид х = require("./м");',
      'ворид { нест } аз "./м";',
      'чоп.сабт("./м");',
      'нест;',
    ].join('\n');
    const analysis = analyze(text);
    const module = analyze('содир собит ҳаст = 1;');
    const loader = (specifier: string): ResolvedModule | undefined =>
      specifier === './м' ? { uri: 'file:///м.som', analysis: module } : undefined;
    const go = (offset: number) => definition(analysis, 'file:///санҷиш.som', offset, loader);
    const moduleStart = [
      {
        uri: 'file:///м.som',
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
      },
    ];
    expect(go(at(text, '"./м"', 1))).toEqual(moduleStart);
    expect(go(at(text, '"./м"', 1, 2))).toEqual(moduleStart);
    // A string that is not a module specifier leads nowhere
    expect(go(at(text, '"./м"', 1, 4))).toEqual([]);
    // `нест` is not exported by the module: the import itself
    expect(go(at(text, 'нест;'))).toEqual([
      {
        uri: 'file:///санҷиш.som',
        range: { start: { line: 2, character: 8 }, end: { line: 2, character: 12 } },
      },
    ]);
  });

  test('definition of a member with no receiver before the `.`', () => {
    const text = '.х;';
    expect(definition(analyze(text), 'file:///санҷиш.som', 1, () => undefined)).toEqual([]);
  });

  test('the nearest declaration after the offset when none comes before', () => {
    const text = 'х;\nтағ х = 1;';
    const analysis = analyze(text);
    expect(resolveName(analysis.symbols, 'х', 0)!.nameStart).toBe(at(text, 'х =', 0));
  });

  test('semantic tokens of a namespace import', () => {
    const text = 'ворид * чун М аз "./м";\nМ.а;';
    const { data } = semanticTokens(analyze(text));
    // `М` twice as a namespace (type 0), declared the first time
    const namespaces = [];
    for (let i = 0; i < data.length; i += 5) if (data[i + 3] === 0) namespaces.push(data[i + 4]);
    expect(namespaces).toEqual([1, 0]);
  });
});

describe('LSP member tables', () => {
  test('types without a name have no built-in members', () => {
    expect([...typeMembers({ kind: 'primitive' }).builtin]).toEqual([]);
    expect([...typeMembers({ kind: 'generic' }).builtin]).toEqual([]);
    expect(typeMembers({ kind: 'generic', name: 'Map' }).builtin.has('set')).toBe(true);
  });

  test('a literal that is neither a string, a number nor a boolean has object members', () => {
    const members = typeMembers({ kind: 'literal', value: null });
    expect(members.builtin.has('hasOwnProperty')).toBe(true);
    expect(members.builtin.has('toFixed')).toBe(false);
  });

  test('a type that is its own base terminates', () => {
    const type: Type = {
      kind: 'class',
      name: 'К',
      properties: new Map([
        ['х', { type: { kind: 'primitive', name: 'number' }, optional: false }],
      ]),
    };
    type.baseType = type;
    expect([...typeMembers(type).own.keys()]).toEqual(['х']);
  });
});

/** A server whose outgoing messages are recorded; requests return their response. */
function createServer(options: Partial<ConstructorParameters<typeof SomonLanguageServer>[0]> = {}) {
  const sent: Message[] = [];
  const server = new SomonLanguageServer({
    send: message => sent.push(message as Message),
    ...options,
  });
  let nextId = 1;
  const request = (method: string, params?: unknown): Message => {
    const id = nextId++;
    server.handle({ jsonrpc: '2.0', id, method, params });
    return sent.find(message => message.id === id)!;
  };
  const notify = (method: string, params?: unknown) =>
    server.handle({ jsonrpc: '2.0', method, params });
  const published = (uri: string) =>
    sent
      .filter(m => m.method === 'textDocument/publishDiagnostics')
      .map(m => m.params as { uri: string; diagnostics: any[]; version?: number })
      .filter(p => p.uri === uri);
  request('initialize', {});
  return { sent, request, notify, published };
}

describe('LSP server: rarer requests and notifications', () => {
  let dir: string;
  beforeEach(() => {
    dir = canonicalTmpDir('somon-lsp-edge-');
  });
  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });
  const fileUri = (name: string) => pathToFileURL(path.join(dir, name)).href;

  test('didOpen without text or version, didChange without version or changes', () => {
    const { notify, published, request } = createServer();
    const uri = fileUri('а.som');
    notify('textDocument/didOpen', { textDocument: { uri } });
    expect(published(uri)).toEqual([{ uri, diagnostics: [], version: 0 }]);
    // No changes: nothing happens
    notify('textDocument/didChange', { textDocument: { uri, version: 5 } });
    expect(published(uri)).toHaveLength(1);
    notify('textDocument/didChange', { textDocument: { uri }, contentChanges: [{ text: 'х;' }] });
    expect(published(uri)[1].version).toBe(0);
    expect(published(uri)[1].diagnostics[0].message).toContain('х');
    // A change to a document that was never opened opens it
    const other = fileUri('б.som');
    notify('textDocument/didChange', {
      textDocument: { uri: other, version: 3 },
      contentChanges: [{ text: 'тағ б = 1;' }],
    });
    expect(published(other)).toEqual([{ uri: other, diagnostics: [], version: 3 }]);
    expect(
      (
        request('textDocument/hover', {
          textDocument: { uri: other },
          position: { line: 0, character: 4 },
        }).result as any
      ).contents.value
    ).toBe('```som\n(variable) б: рақам\n```');
  });

  test('a failing exit handler is logged', () => {
    const { notify, sent } = createServer({
      onExit: () => {
        throw 'cannot exit';
      },
    });
    notify('exit');
    expect(sent.find(m => m.method === 'window/logMessage')?.params).toEqual({
      type: 1,
      message: 'SomonScript language server error: cannot exit',
    });
  });

  test('request handlers that throw: InternalError with the reason', () => {
    const { request, notify } = createServer({
      readFile: () => {
        throw 'disk on fire';
      },
    });
    const uri = fileUri('а.som');
    notify('textDocument/didOpen', { textDocument: { uri, text: 'ворид { х } аз "./б";\nх;' } });
    expect(
      request('textDocument/definition', {
        textDocument: { uri },
        position: { line: 1, character: 0 },
      }).error
    ).toEqual({
      code: ErrorCode.InternalError,
      message: 'SomonScript language server error: disk on fire',
    });
    expect(request('textDocument/formatting', null).error).toEqual({
      code: ErrorCode.InternalError,
      message: expect.stringMatching(/^SomonScript language server error: Cannot read properties/),
    });
  });

  test('modules: `.som` specifiers, missing files and paths compared case-insensitively on Windows', () => {
    fs.writeFileSync(path.join(dir, 'мат.som'), 'содир собит ПИ = 3.14;\n');
    const { request, notify } = createServer();
    const uri = fileUri('а.som');
    const text = 'ворид { ПИ } аз "./мат.som";\nворид { Е } аз "./нест";\nПИ; Е;';
    notify('textDocument/didOpen', { textDocument: { uri, text } });
    const go = (character: number) =>
      request('textDocument/definition', {
        textDocument: { uri },
        position: { line: 2, character },
      }).result as Array<{ uri: string }>;
    expect(go(0).map(location => location.uri)).toEqual([fileUri('мат.som')]);
    // No such file: the import in this document
    expect(go(4).map(location => location.uri)).toEqual([uri]);

    // On Windows the open document `МАТ.som` is the file `мат.som`
    const platform = Object.getOwnPropertyDescriptor(process, 'platform')!;
    Object.defineProperty(process, 'platform', { ...platform, value: 'win32' });
    try {
      const upper = fileUri('МАТ.som');
      notify('textDocument/didOpen', {
        textDocument: { uri: upper, text: 'содир собит ПИ = 3.1416;\n' },
      });
      expect(go(0).map(location => location.uri)).toEqual([upper]);
    } finally {
      Object.defineProperty(process, 'platform', platform);
    }
  });

  test('a checker registered through the package entry point checks open documents', () => {
    fs.writeFileSync(
      path.join(dir, 'somon.config.json'),
      JSON.stringify({ compilerOptions: { checker: 'typescript' } })
    );
    registerChecker('typescript', source => [
      { message: `${source.length} characters`, line: 1, column: 1, code: 'LEN' },
    ]);
    try {
      const { notify, published } = createServer();
      const uri = fileUri('а.som');
      notify('textDocument/didOpen', { textDocument: { uri, text: 'тағ х = 1;', version: 1 } });
      expect(published(uri)[0].diagnostics).toEqual([
        {
          range: { start: { line: 0, character: 0 }, end: { line: 0, character: 3 } },
          severity: DiagnosticSeverity.Error,
          source: 'somon',
          message: '10 characters',
          code: 'LEN',
        },
      ]);
    } finally {
      registerChecker('typescript', undefined);
    }
  });
});

describe('startLanguageServer without options', () => {
  test('reads stdin and writes stdout', async () => {
    const stdin = new PassThrough();
    const descriptor = Object.getOwnPropertyDescriptor(process, 'stdin')!;
    Object.defineProperty(process, 'stdin', { configurable: true, get: () => stdin });
    const written: Buffer[] = [];
    const write = jest
      .spyOn(process.stdout, 'write')
      .mockImplementation((chunk: any) => written.push(Buffer.from(chunk)) > 0);
    const exit = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    const { log, info, debug } = console;
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      startLanguageServer();
      stdin.write(encodeMessage({ jsonrpc: '2.0', id: 7, method: 'initialize', params: {} }));
      await new Promise(resolve => setImmediate(resolve));
      const received: Message[] = [];
      new MessageReader(message => received.push(message)).feed(Buffer.concat(written));
      expect(received.map(message => message.id)).toEqual([7]);
      expect((received[0].result as any).serverInfo.name).toBe('somon-lsp');
      stdin.end();
      await new Promise(resolve => setImmediate(resolve));
      expect(exit).toHaveBeenCalledWith(1);
    } finally {
      Object.defineProperty(process, 'stdin', descriptor);
      Object.assign(console, { log, info, debug });
      write.mockRestore();
      exit.mockRestore();
      error.mockRestore();
    }
  });
});

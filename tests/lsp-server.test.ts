import * as fs from 'fs';
import * as path from 'path';
import { PassThrough } from 'stream';
import { pathToFileURL } from 'url';

import {
  MessageReader,
  SomonLanguageServer,
  encodeMessage,
  registerFormatter,
  startLanguageServer,
} from '../src/lsp';
import { ErrorCode, type Message } from '../src/lsp/protocol';
import { uriToPath } from '../src/lsp/server';
import { canonicalTmpDir } from './helpers/paths';

/** A server whose outgoing messages are recorded; requests return their response. */
function createServer(options: Partial<ConstructorParameters<typeof SomonLanguageServer>[0]> = {}) {
  const sent: Message[] = [];
  const exits: number[] = [];
  const server = new SomonLanguageServer({
    send: message => sent.push(message as Message),
    onExit: code => exits.push(code),
    ...options,
  });
  let nextId = 1;
  const request = (method: string, params?: unknown): Message => {
    const id = nextId++;
    server.handle({ jsonrpc: '2.0', id, method, params });
    const response = sent.find(message => message.id === id);
    if (!response) throw new Error(`no response to ${method}`);
    return response;
  };
  const notify = (method: string, params?: unknown) =>
    server.handle({ jsonrpc: '2.0', method, params });
  const diagnostics = (uri: string) =>
    sent
      .filter(m => m.method === 'textDocument/publishDiagnostics')
      .map(m => m.params as { uri: string; diagnostics: any[]; version?: number })
      .filter(p => p.uri === uri);
  return { server, sent, exits, request, notify, diagnostics };
}

describe('LSP server', () => {
  let dir: string;
  beforeEach(() => {
    dir = canonicalTmpDir('somon-lsp-');
  });
  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
    registerFormatter(undefined);
  });

  const fileUri = (name: string) => pathToFileURL(path.join(dir, name)).href;

  test('lifecycle: initialize, capabilities, shutdown, exit', () => {
    const { request, notify, exits } = createServer({ version: '9.9.9' });
    const init = request('initialize', { capabilities: {} });
    const result = init.result as any;
    expect(result.serverInfo).toEqual({ name: 'somon-lsp', version: '9.9.9' });
    expect(result.capabilities).toMatchObject({
      textDocumentSync: { openClose: true, change: 1 },
      hoverProvider: true,
      completionProvider: { triggerCharacters: ['.'] },
      definitionProvider: true,
      documentSymbolProvider: true,
      // No formatter in this version of the compiler
      documentFormattingProvider: false,
      semanticTokensProvider: { full: true },
    });
    notify('initialized', {});
    expect(request('shutdown').result).toBeNull();
    // After shutdown only exit is accepted
    expect(request('textDocument/hover', {}).error?.code).toBe(ErrorCode.InvalidRequest);
    notify('exit');
    expect(exits).toEqual([0]);
  });

  test('exit without shutdown exits with 1; requests before initialize fail', () => {
    const { request, notify, exits, sent } = createServer();
    expect(request('textDocument/hover', {}).error?.code).toBe(ErrorCode.ServerNotInitialized);
    // Notifications before initialize are dropped
    notify('textDocument/didOpen', { textDocument: { uri: 'file:///а.som', text: 'х' } });
    expect(sent.filter(m => m.method)).toEqual([]);
    notify('exit');
    expect(exits).toEqual([1]);
  });

  test('unknown requests fail, unknown notifications and responses are ignored', () => {
    const { request, notify, server, sent } = createServer();
    request('initialize', {});
    expect(request('workspace/nonsense').error).toEqual({
      code: ErrorCode.MethodNotFound,
      message: 'Unknown method: workspace/nonsense',
    });
    const before = sent.length;
    notify('$/cancelRequest', { id: 1 });
    notify('$/setTrace', { value: 'off' });
    server.handle({ jsonrpc: '2.0', id: 99, result: null });
    expect(sent.length).toBe(before);
    server.handleInvalidMessage('Invalid JSON body');
    expect(sent[sent.length - 1]).toEqual({
      jsonrpc: '2.0',
      id: null,
      error: { code: ErrorCode.ParseError, message: 'Invalid JSON body' },
    });
  });

  test('publishes diagnostics on open and change, and clears them on close', () => {
    const { request, notify, diagnostics } = createServer();
    request('initialize', {});
    const uri = fileUri('а.som');
    notify('textDocument/didOpen', {
      textDocument: { uri, languageId: 'somonscript', version: 1, text: 'тағ х: сатр = 1;\n' },
    });
    let published = diagnostics(uri);
    expect(published).toHaveLength(1);
    expect(published[0].version).toBe(1);
    expect(published[0].diagnostics[0].code).toBe('TYPE_NOT_ASSIGNABLE');

    notify('textDocument/didChange', {
      textDocument: { uri, version: 2 },
      contentChanges: [{ text: 'тағ х: сатр = "а";\n' }],
    });
    published = diagnostics(uri);
    expect(published[1]).toEqual({ uri, diagnostics: [], version: 2 });
    // An empty change list changes nothing
    notify('textDocument/didChange', { textDocument: { uri, version: 3 }, contentChanges: [] });
    expect(diagnostics(uri)).toHaveLength(2);

    notify('textDocument/didClose', { textDocument: { uri } });
    expect(diagnostics(uri)[2]).toEqual({ uri, diagnostics: [] });
    expect(
      request('textDocument/hover', { textDocument: { uri }, position: { line: 0, character: 4 } })
        .result
    ).toBeNull();
  });

  test('honours somon.config.json found above the file', () => {
    fs.mkdirSync(path.join(dir, 'src', 'ичро'), { recursive: true });
    const { request, notify, diagnostics } = createServer();
    request('initialize', {});
    const text = 'интерфейс К { ном: сатр; }\nфунксия ф(к: К) { бозгашт к.синну; }\n';
    const uri = fileUri(path.join('src', 'ичро', 'а.som'));
    notify('textDocument/didOpen', { textDocument: { uri, version: 1, text } });
    expect(diagnostics(uri)[0].diagnostics[0].severity).toBe(2);

    fs.writeFileSync(
      path.join(dir, 'somon.config.json'),
      JSON.stringify({ compilerOptions: { strict: true } })
    );
    notify('workspace/didChangeWatchedFiles', { changes: [] });
    expect(diagnostics(uri)[1].diagnostics[0].severity).toBe(1);

    fs.writeFileSync(path.join(dir, 'somon.config.json'), '{ "compilerOptions": { "strict": 1 } }');
    notify('workspace/didChangeWatchedFiles', { changes: [] });
    const configProblem = diagnostics(uri)[2].diagnostics[0];
    expect(configProblem.message).toContain('somon.config.json');
    expect(configProblem.message).toContain('compilerOptions.strict: must be a boolean');

    fs.writeFileSync(path.join(dir, 'somon.config.json'), '{ broken');
    notify('workspace/didChangeWatchedFiles', { changes: [] });
    expect(diagnostics(uri)[3].diagnostics[0].message).toContain('Failed to parse config file');
  });

  test('documents without a file path are analysed without a config', () => {
    const { request, notify, diagnostics } = createServer();
    request('initialize', {});
    notify('textDocument/didOpen', {
      textDocument: { uri: 'untitled:Untitled-1', version: 1, text: 'тағ х = ;' },
    });
    expect(diagnostics('untitled:Untitled-1')[0].diagnostics).toHaveLength(1);
    expect(uriToPath('untitled:Untitled-1')).toBeUndefined();
    expect(uriToPath('file://remote-host/share/а.som')).toBeUndefined();
  });

  test('serves hover, completion, definition, symbols and semantic tokens', () => {
    const { request, notify } = createServer();
    request('initialize', { initializationOptions: { locale: 'ru' } });
    const uri = fileUri('а.som');
    const text = 'функсия ф(х: рақам): рақам { бозгашт х; }\nф(1);\nчоп.\n';
    notify('textDocument/didOpen', { textDocument: { uri, version: 1, text } });
    const position = (line: number, character: number) => ({
      textDocument: { uri },
      position: { line, character },
    });

    const hover = request('textDocument/hover', position(1, 0)).result as any;
    expect(hover.contents.value).toContain('(функция) ф: (х: рақам) => рақам');

    const completion = request('textDocument/completion', position(2, 4)).result as any;
    expect(completion.isIncomplete).toBe(false);
    expect(completion.items.map((item: any) => item.label)).toContain('сабт');

    const definition = request('textDocument/definition', position(1, 0)).result as any;
    expect(definition).toEqual([
      { uri, range: { start: { line: 0, character: 8 }, end: { line: 0, character: 9 } } },
    ]);

    const symbols = request('textDocument/documentSymbol', { textDocument: { uri } }).result as any;
    expect(symbols.map((symbol: any) => symbol.name)).toEqual(['ф']);

    const tokens = request('textDocument/semanticTokens/full', { textDocument: { uri } })
      .result as any;
    expect(tokens.data.length % 5).toBe(0);
    expect(tokens.data.length).toBeGreaterThan(0);

    // Documents the server does not know
    expect(
      request('textDocument/documentSymbol', { textDocument: { uri: 'file:///нест.som' } }).result
    ).toBeNull();
    expect(request('textDocument/documentSymbol', {}).result).toBeNull();
  });

  test('the locale follows initializationOptions and configuration changes', () => {
    const { request, notify } = createServer({ locale: 'tj' });
    request('initialize', {});
    const uri = fileUri('а.som');
    notify('textDocument/didOpen', { textDocument: { uri, version: 1, text: 'тағ х = 1;\nх;\n' } });
    const hoverText = () =>
      (
        request('textDocument/hover', {
          textDocument: { uri },
          position: { line: 1, character: 0 },
        }).result as any
      ).contents.value;
    expect(hoverText()).toContain('(тағйирёбанда)');
    notify('workspace/didChangeConfiguration', { settings: { somonscript: { locale: 'en' } } });
    expect(hoverText()).toContain('(variable)');
    notify('workspace/didChangeConfiguration', { settings: {} });
    expect(hoverText()).toContain('(variable)');
  });

  test('go to definition across relative imports, from disk and from open documents', () => {
    fs.mkdirSync(path.join(dir, 'lib'));
    fs.writeFileSync(
      path.join(dir, 'lib', 'math.som'),
      'содир функсия ҷамъ(а: рақам, б: рақам) { бозгашт а + б; }\n'
    );
    fs.writeFileSync(path.join(dir, 'lib', 'index.som'), 'содир собит номи_китобхона = "lib";\n');
    const { request, notify } = createServer();
    request('initialize', {});
    const uri = fileUri('main.som');
    const text = [
      'ворид { ҷамъ } аз "./lib/math";',
      'ворид { номи_китобхона } аз "./lib";',
      'ворид { тақсим } аз "./open.js";',
      'ворид { х } аз "./lib/math.som";',
      'ворид { нест } аз "китобхона";',
      'ҷамъ(1, 2); номи_китобхона; тақсим; нест;',
    ].join('\n');
    notify('textDocument/didOpen', { textDocument: { uri, version: 1, text } });
    const openUri = fileUri('open.som');
    notify('textDocument/didOpen', {
      textDocument: { uri: openUri, version: 1, text: 'содир функсия тақсим() {}\n' },
    });
    const definitionAt = (needle: string) => {
      const line = 5;
      const character = text.split('\n')[line].indexOf(needle);
      return request('textDocument/definition', {
        textDocument: { uri },
        position: { line, character },
      }).result as any[];
    };
    expect(definitionAt('ҷамъ')).toEqual([
      {
        uri: pathToFileURL(path.join(dir, 'lib', 'math.som')).href,
        range: { start: { line: 0, character: 14 }, end: { line: 0, character: 18 } },
      },
    ]);
    expect(definitionAt('номи_китобхона')[0].uri).toBe(
      pathToFileURL(path.join(dir, 'lib', 'index.som')).href
    );
    expect(definitionAt('тақсим')[0].uri).toBe(openUri);
    // A package import has no file to go to: the import itself
    expect(definitionAt('нест')[0].uri).toBe(uri);

    const hover = request('textDocument/hover', {
      textDocument: { uri },
      position: { line: 5, character: 0 },
    }).result as any;
    expect(hover.contents.value).toContain('(import) ҷамъ: (а: рақам, б: рақам) =>');
  });

  test('formatting uses the injected formatter and reports its failures', () => {
    const { request, notify } = createServer({
      hooks: {
        formatter: source => {
          if (source.includes('ғалат')) throw new Error('синтаксис');
          return source.replace(/ {2,}/g, ' ');
        },
      },
    });
    const init = request('initialize', {}).result as any;
    expect(init.capabilities.documentFormattingProvider).toBe(true);
    const uri = fileUri('а.som');
    notify('textDocument/didOpen', { textDocument: { uri, version: 1, text: 'тағ   х = 1;' } });
    const edits = request('textDocument/formatting', {
      textDocument: { uri },
      options: { tabSize: 4, insertSpaces: true },
    }).result;
    expect(edits).toEqual([
      {
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 12 } },
        newText: 'тағ х = 1;',
      },
    ]);
    notify('textDocument/didChange', {
      textDocument: { uri, version: 2 },
      contentChanges: [{ text: 'ғалат' }],
    });
    const failure = request('textDocument/formatting', { textDocument: { uri } });
    expect(failure.error).toEqual({
      code: ErrorCode.RequestFailed,
      message: 'Formatting failed: синтаксис',
    });
    expect(
      request('textDocument/formatting', { textDocument: { uri: 'file:///нест.som' } }).result
    ).toBeNull();
  });

  test('a registered formatter is picked up at initialize', () => {
    registerFormatter(source => source.trim());
    const { request } = createServer();
    expect((request('initialize', {}).result as any).capabilities.documentFormattingProvider).toBe(
      true
    );
  });

  test('internal errors become error responses and log messages', () => {
    const { request, notify, sent } = createServer({
      hooks: {
        formatter: () => {
          throw 'not an Error';
        },
      },
    });
    request('initialize', {});
    // A malformed notification is logged, not fatal
    notify('textDocument/didOpen', {});
    const log = sent.find(m => m.method === 'window/logMessage');
    expect((log?.params as any).message).toContain('SomonScript language server error');
    const uri = fileUri('а.som');
    notify('textDocument/didOpen', { textDocument: { uri, text: 'х;' } });
    expect(request('textDocument/formatting', { textDocument: { uri } }).error?.message).toBe(
      'Formatting failed: not an Error'
    );
    // A malformed request
    const response = request('textDocument/hover', { textDocument: { uri }, position: null });
    expect(response.error ?? response.result).toBeDefined();
  });
});

describe('LSP over streams', () => {
  test('frames messages both ways and exits on exit or end of input', async () => {
    const input = new PassThrough();
    const output = new PassThrough();
    const exits: number[] = [];
    const received: Message[] = [];
    const reader = new MessageReader(message => received.push(message));
    output.on('data', chunk => reader.feed(chunk));
    startLanguageServer({ input, output, exit: code => exits.push(code), locale: 'en' });

    input.write(encodeMessage({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }));
    input.write('Content-Length: 3\r\n\r\n{x}');
    input.write(encodeMessage({ jsonrpc: '2.0', id: 2, method: 'shutdown' }));
    input.write(encodeMessage({ jsonrpc: '2.0', method: 'exit' }));
    await new Promise(resolve => setImmediate(resolve));
    expect(received.map(message => message.id)).toEqual([1, null, 2]);
    expect(received[1].error?.code).toBe(ErrorCode.ParseError);
    input.end();
    await new Promise(resolve => setImmediate(resolve));
    // Exit is called once: for the exit notification, not again for the end of input
    expect(exits).toEqual([0]);
  });

  test('stdio by default: protects stdout and exits the process', async () => {
    const write = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const exit = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    const log = console.log;
    const info = console.info;
    const debug = console.debug;
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const input = new PassThrough();
    try {
      startLanguageServer({ input });
      console.log('not on stdout');
      expect(error).toHaveBeenCalledWith('not on stdout');
      input.write(encodeMessage({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }));
      await new Promise(resolve => setImmediate(resolve));
      expect(write).toHaveBeenCalled();
      input.write(encodeMessage({ jsonrpc: '2.0', method: 'exit' }));
      await new Promise(resolve => setImmediate(resolve));
      expect(exit).toHaveBeenCalledWith(1);
    } finally {
      console.log = log;
      console.info = info;
      console.debug = debug;
      write.mockRestore();
      exit.mockRestore();
      error.mockRestore();
    }
  });
});

/**
 * `somon lsp` as a process: what it does with messages an editor should not
 * send — broken framing, invalid JSON, unknown methods, requests before
 * `initialize` or after `shutdown` — and how it exits.
 */
import { ErrorCode } from '../../src/lsp/protocol';
import { LspClient } from './lsp-client';

jest.setTimeout(30000);

describe('somon lsp: protocol errors (spawned)', () => {
  let client: LspClient | undefined;

  afterEach(() => {
    client?.kill();
    client = undefined;
  });

  test('requests before initialize fail with ServerNotInitialized; notifications are dropped', async () => {
    client = LspClient.start();
    const hover = await client.request('textDocument/hover', {
      textDocument: { uri: 'file:///а.som' },
      position: { line: 0, character: 0 },
    });
    expect(hover.error).toEqual({
      code: ErrorCode.ServerNotInitialized,
      message: 'The server is not initialized',
    });
    expect(hover.result).toBeUndefined();

    // Not analysed: the server was not initialized when it arrived
    client.open('file:///а.som', 'тағ х = 1;');
    // A string id is as good as a number
    const init = await client.sendRequest(
      { jsonrpc: '2.0', id: 'init-1', method: 'initialize', params: { capabilities: {} } },
      'init-1'
    );
    expect(init.id).toBe('init-1');
    expect((init.result as any).capabilities.definitionProvider).toBe(true);

    const after = await client.request('textDocument/hover', {
      textDocument: { uri: 'file:///а.som' },
      position: { line: 0, character: 4 },
    });
    expect(after.error).toBeUndefined();
    expect(after.result).toBeNull();
    expect(client.received.filter(m => m.method === 'textDocument/publishDiagnostics')).toEqual([]);
    expect(await client.shutdown()).toBe(0);
  });

  test('malformed messages are reported with id null and the server carries on', async () => {
    client = LspClient.start();
    await client.initialize();

    // Invalid JSON in a well-framed message
    const body = '{"jsonrpc": "2.0", "id": 5, "method":';
    client.write(`Content-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`);
    const invalidJson = await client.waitFor(m => m.id === null, 'the parse error');
    expect(invalidJson.error!.code).toBe(ErrorCode.ParseError);
    expect(invalidJson.error!.message).toMatch(/^Invalid JSON body: /);

    // A header without Content-Length: the header block is skipped
    client.write('Content-Type: application/vscode-jsonrpc; charset=utf-8\r\n\r\n');
    const noLength = await client.waitFor(
      m => m.id === null && m.error!.message.startsWith('Missing'),
      'the header error'
    );
    expect(noLength.error).toEqual({
      code: ErrorCode.ParseError,
      message:
        'Missing or invalid Content-Length header: Content-Type: application/vscode-jsonrpc; charset=utf-8',
    });

    // JSON that is not an object
    for (const notAnObject of ['[1, 2]', '42', 'null']) {
      client.write(`Content-Length: ${notAnObject.length}\r\n\r\n${notAnObject}`);
    }
    await client.waitFor(
      () =>
        client!.received.filter(m => m.error?.message === 'A message must be a JSON object')
          .length === 3,
      'three "not an object" errors'
    );

    // An unknown request is answered with MethodNotFound; an unknown notification is ignored
    client.notify('$/somethingNew', { x: 1 });
    client.notify('$/cancelRequest', { id: 99 });
    const unknown = await client.request('textDocument/rename', {
      textDocument: { uri: 'file:///а.som' },
      position: { line: 0, character: 0 },
      newName: 'б',
    });
    expect(unknown.error).toEqual({
      code: ErrorCode.MethodNotFound,
      message: 'Unknown method: textDocument/rename',
    });

    // A response from the client (to a request of the server's) is not a request
    const response = JSON.stringify({ jsonrpc: '2.0', id: 1, result: null });
    client.write(`Content-Length: ${Buffer.byteLength(response)}\r\n\r\n${response}`);

    // Still serving: a document opens and is analysed
    client.open('file:///б.som', 'тағ х: рақам = "сатр";');
    const published = await client.diagnostics('file:///б.som', 1);
    expect(published.diagnostics.map(d => d.code)).toEqual(['TYPE_NOT_ASSIGNABLE']);

    // Nothing was answered for the client's response, the unknown notifications or the
    // well-framed request ids that never arrived (id 5 was in the broken body)
    const errors = client.received.filter(m => m.error);
    expect(errors.map(m => m.error!.code)).toEqual(Array(5).fill(ErrorCode.ParseError));
    expect(await client.shutdown()).toBe(0);
    expect(client.stderr).toBe('');
  });

  test('a message split anywhere, even inside a character, and LF-only headers', async () => {
    client = LspClient.start();
    await client.initialize();
    const text = 'собит салом = "Салом, ҷаҳон!";\n';
    const body = Buffer.from(
      JSON.stringify({
        jsonrpc: '2.0',
        method: 'textDocument/didOpen',
        params: {
          textDocument: { uri: 'file:///салом.som', languageId: 'somonscript', version: 3, text },
        },
      }),
      'utf8'
    );
    const framed = Buffer.concat([Buffer.from(`Content-Length: ${body.length}\r\n\r\n`), body]);
    // One byte at a time: every multi-byte Cyrillic character is split
    for (let i = 0; i < framed.length; i++) client.write(framed.subarray(i, i + 1));
    const published = await client.diagnostics('file:///салом.som', 3);
    expect(published.diagnostics).toEqual([]);

    // A lenient client that ends header lines with LF only
    const hoverBody = JSON.stringify({
      jsonrpc: '2.0',
      id: 'lf',
      method: 'textDocument/hover',
      params: { textDocument: { uri: 'file:///салом.som' }, position: { line: 0, character: 8 } },
    });
    client.write(`Content-Length: ${Buffer.byteLength(hoverBody)}\n\n${hoverBody}`);
    const hover = await client.waitFor(m => m.id === 'lf', 'the hover response');
    expect((hover.result as any).contents.value).toBe(
      '```som\n(constant) салом: "Салом, ҷаҳон!"\n```'
    );
    // Two messages in one chunk
    const first = JSON.stringify({ jsonrpc: '2.0', id: 'a', method: 'shutdown' });
    const second = JSON.stringify({ jsonrpc: '2.0', method: 'exit' });
    client.write(
      `Content-Length: ${first.length}\r\n\r\n${first}Content-Length: ${second.length}\r\n\r\n${second}`
    );
    expect(await client.exited).toBe(0);
  });

  test('malformed params: a request fails with InternalError, a notification logs it', async () => {
    client = LspClient.start(['--lang', 'ru']);
    await client.initialize();
    const formatting = await client.request('textDocument/formatting', null);
    expect(formatting.error!.code).toBe(ErrorCode.InternalError);
    // In the CLI's language
    expect(formatting.error!.message).toMatch(/^Ошибка языкового сервера SomonScript: /);

    client.notify('textDocument/didOpen', { textDocument: null });
    const log = await client.waitFor(m => m.method === 'window/logMessage', 'a log message');
    expect((log.params as any).type).toBe(1);
    expect((log.params as any).message).toMatch(/^Ошибка языкового сервера SomonScript: /);

    // Requests about documents that are not open, or without a document, answer null
    for (const method of [
      'textDocument/hover',
      'textDocument/completion',
      'textDocument/definition',
      'textDocument/documentSymbol',
      'textDocument/semanticTokens/full',
      'textDocument/formatting',
    ]) {
      const response = await client.request(method, { textDocument: { uri: 'file:///нест.som' } });
      expect([method, response.result]).toEqual([method, null]);
      const noDocument = await client.request(method, {});
      expect([method, noDocument.result]).toEqual([method, null]);
    }
    expect(await client.shutdown()).toBe(0);
  });

  test('after shutdown only exit is accepted', async () => {
    client = LspClient.start();
    await client.initialize();
    const shutdown = await client.request('shutdown');
    expect(shutdown).toEqual({ jsonrpc: '2.0', id: 2, result: null });
    const late = await client.request('textDocument/hover', {
      textDocument: { uri: 'file:///а.som' },
      position: { line: 0, character: 0 },
    });
    expect(late.error).toEqual({
      code: ErrorCode.InvalidRequest,
      message: 'The server is shutting down',
    });
    const again = await client.request('initialize', { capabilities: {} });
    expect(again.error!.code).toBe(ErrorCode.InvalidRequest);
    client.notify('exit');
    expect(await client.exited).toBe(0);
  });

  test('exit without shutdown exits with 1, and so does a closed stdin', async () => {
    client = LspClient.start();
    await client.initialize();
    client.notify('exit');
    expect(await client.exited).toBe(1);

    // `exit` is accepted even before initialize
    client = LspClient.start();
    client.notify('exit');
    expect(await client.exited).toBe(1);

    client = LspClient.start(['--stdio', '--clientProcessId=12345']);
    await client.initialize();
    client.child.stdin.end();
    expect(await client.exited).toBe(1);
    expect(client.stderr).toBe('');
  });
});

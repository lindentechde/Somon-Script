import { FramingError, MessageReader, encodeMessage, parseContentLength } from '../src/lsp/jsonrpc';
import type { Message } from '../src/lsp/protocol';

/** A reader that records what it reads. */
function recordingReader() {
  const messages: Message[] = [];
  const errors: FramingError[] = [];
  const reader = new MessageReader(
    message => messages.push(message),
    error => errors.push(error)
  );
  return { reader, messages, errors };
}

const frame = (body: string, header = `Content-Length: ${Buffer.byteLength(body)}\r\n\r\n`) =>
  Buffer.from(header + body, 'utf8');

describe('LSP JSON-RPC framing', () => {
  test('encodes a message with a byte-counted Content-Length and CRLF header', () => {
    const encoded = encodeMessage({ jsonrpc: '2.0', method: 'салом', params: { ном: 'ҷаҳон' } });
    const text = encoded.toString('utf8');
    const body = JSON.stringify({ jsonrpc: '2.0', method: 'салом', params: { ном: 'ҷаҳон' } });
    expect(text).toBe(`Content-Length: ${Buffer.byteLength(body, 'utf8')}\r\n\r\n${body}`);
    // Cyrillic letters take two bytes each: the length counts bytes, not characters
    expect(Buffer.byteLength(body, 'utf8')).toBeGreaterThan(body.length);
  });

  test('reads what it encodes, several messages in one chunk', () => {
    const { reader, messages, errors } = recordingReader();
    reader.feed(
      Buffer.concat([
        encodeMessage({ jsonrpc: '2.0', id: 1, method: 'а' }),
        encodeMessage({ jsonrpc: '2.0', id: 2, method: 'б' }),
      ])
    );
    expect(messages.map(message => message.method)).toEqual(['а', 'б']);
    expect(errors).toEqual([]);
  });

  test('reads a message split byte by byte, even inside a multi-byte character', () => {
    const { reader, messages } = recordingReader();
    const bytes = encodeMessage({ jsonrpc: '2.0', method: 'тағйир', params: { матн: 'ӯҳҷқғ' } });
    for (const byte of bytes) reader.feed(Buffer.from([byte]));
    expect(messages).toEqual([{ jsonrpc: '2.0', method: 'тағйир', params: { матн: 'ӯҳҷқғ' } }]);
  });

  test('accepts string chunks, extra headers and any header case', () => {
    const { reader, messages } = recordingReader();
    const body = '{"jsonrpc":"2.0","method":"x"}';
    reader.feed(
      `content-length: ${body.length}\r\nContent-Type: application/vscode-jsonrpc; charset=utf-8\r\n\r\n${body}`
    );
    expect(messages).toEqual([{ jsonrpc: '2.0', method: 'x' }]);
  });

  test('accepts bare LF header endings from lenient clients', () => {
    const { reader, messages } = recordingReader();
    const body = '{"jsonrpc":"2.0","method":"lf"}';
    reader.feed(frame(body, `Content-Length: ${body.length}\n\n`));
    expect(messages[0].method).toBe('lf');
  });

  test('a body containing blank lines does not end the header early', () => {
    const { reader, messages } = recordingReader();
    // JSON allows raw line breaks between tokens
    const body = '{\n\n"jsonrpc": "2.0",\r\n\r\n"method": "м"\n\n}';
    reader.feed(Buffer.concat([frame(body), frame(body)]));
    expect(messages).toEqual([
      { jsonrpc: '2.0', method: 'м' },
      { jsonrpc: '2.0', method: 'м' },
    ]);
  });

  test('skips a header without Content-Length and keeps reading', () => {
    const { reader, messages, errors } = recordingReader();
    reader.feed('X-Other: 1\r\n\r\n');
    reader.feed(frame('{"jsonrpc":"2.0","method":"after"}'));
    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(FramingError);
    expect(errors[0].message).toContain('Content-Length');
    expect(messages.map(message => message.method)).toEqual(['after']);
  });

  test('reports bodies that are not JSON objects', () => {
    const { reader, messages, errors } = recordingReader();
    reader.feed(frame('{not json'));
    reader.feed(frame('[1, 2]'));
    reader.feed(frame('null'));
    expect(messages).toEqual([]);
    expect(errors.map(error => error.message)).toEqual([
      expect.stringContaining('Invalid JSON body'),
      'A message must be a JSON object',
      'A message must be a JSON object',
    ]);
  });

  test('errors are ignored without a handler', () => {
    const messages: Message[] = [];
    const reader = new MessageReader(message => messages.push(message));
    expect(() => reader.feed(frame('{oops'))).not.toThrow();
    expect(messages).toEqual([]);
  });

  test('parses Content-Length values', () => {
    expect(parseContentLength('Content-Length: 12')).toBe(12);
    expect(parseContentLength('Content-Type: x\r\nCONTENT-LENGTH:7')).toBe(7);
    expect(parseContentLength('Content-Length: -1')).toBeUndefined();
    expect(parseContentLength('Content-Length: abc')).toBeUndefined();
    expect(parseContentLength('nothing here')).toBeUndefined();
  });
});

/**
 * JSON-RPC 2.0 message framing for the Language Server Protocol: every message
 * is a header part (`Content-Length: <bytes>`, optionally `Content-Type`), a
 * blank line, then a UTF-8 JSON body of exactly that many bytes. Header lines
 * end with CRLF on every platform; a reader also accepts bare LF from lenient
 * clients.
 */

import type { Message } from './protocol';

const HEADER_END_CRLF = Buffer.from('\r\n\r\n', 'ascii');
const HEADER_END_LF = Buffer.from('\n\n', 'ascii');

/** Encodes one message with its `Content-Length` header (CRLF line endings). */
export function encodeMessage(message: object): Buffer {
  const body = Buffer.from(JSON.stringify(message), 'utf8');
  const header = Buffer.from(`Content-Length: ${body.length}\r\n\r\n`, 'ascii');
  return Buffer.concat([header, body]);
}

/** A problem with the incoming byte stream; the reader skips the broken part. */
export class FramingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FramingError';
  }
}

/**
 * Turns chunks of the incoming byte stream into messages. Chunks may split a
 * message anywhere (even inside a multi-byte character) or hold several.
 */
export class MessageReader {
  private buffer: Buffer = Buffer.alloc(0);
  /** Body length of the message whose header was read, while its body is incomplete. */
  private pendingLength: number | undefined;

  private readonly onMessage: (_message: Message) => void;
  private readonly onError: (_error: FramingError) => void;

  constructor(
    onMessage: (_message: Message) => void,
    onError: (_error: FramingError) => void = () => undefined
  ) {
    this.onMessage = onMessage;
    this.onError = onError;
  }

  feed(chunk: Buffer | string): void {
    const bytes = typeof chunk === 'string' ? Buffer.from(chunk, 'utf8') : chunk;
    this.buffer = this.buffer.length === 0 ? bytes : Buffer.concat([this.buffer, bytes]);
    while (this.readOne()) {
      // keep reading complete messages
    }
  }

  /** Reads one message from the buffer; false when more input is needed. */
  private readOne(): boolean {
    if (this.pendingLength === undefined) {
      const header = this.readHeader();
      if (header === undefined) return false;
      if (header === null) return true;
      this.pendingLength = header;
    }
    if (this.buffer.length < this.pendingLength) return false;

    const body = this.buffer.subarray(0, this.pendingLength).toString('utf8');
    this.buffer = this.buffer.subarray(this.pendingLength);
    this.pendingLength = undefined;
    this.dispatch(body);
    return true;
  }

  /**
   * Content length of the next header; undefined when the header is not
   * complete yet, null when it was malformed (and has been skipped).
   */
  private readHeader(): number | null | undefined {
    const crlf = this.buffer.indexOf(HEADER_END_CRLF);
    const lf = this.buffer.indexOf(HEADER_END_LF);
    const useLf = lf !== -1 && (crlf === -1 || lf < crlf);
    const end = useLf ? lf : crlf;
    if (end === -1) return undefined;

    const headerText = this.buffer.subarray(0, end).toString('ascii');
    this.buffer = this.buffer.subarray(end + (useLf ? HEADER_END_LF : HEADER_END_CRLF).length);
    const length = parseContentLength(headerText);
    if (length === undefined) {
      this.onError(new FramingError(`Missing or invalid Content-Length header: ${headerText}`));
      return null;
    }
    return length;
  }

  private dispatch(body: string): void {
    let message: unknown;
    try {
      message = JSON.parse(body);
    } catch (error) {
      // JSON.parse throws a SyntaxError
      this.onError(new FramingError(`Invalid JSON body: ${(error as Error).message}`));
      return;
    }
    if (typeof message !== 'object' || message === null || Array.isArray(message)) {
      this.onError(new FramingError('A message must be a JSON object'));
      return;
    }
    this.onMessage(message as Message);
  }
}

/** The `Content-Length` value of a header block (names are case-insensitive). */
export function parseContentLength(headerText: string): number | undefined {
  for (const line of headerText.split(/\r?\n/)) {
    const separator = line.indexOf(':');
    if (separator === -1) continue;
    if (line.slice(0, separator).trim().toLowerCase() !== 'content-length') continue;
    const value = line.slice(separator + 1).trim();
    return /^\d+$/.test(value) ? Number(value) : undefined;
  }
  return undefined;
}

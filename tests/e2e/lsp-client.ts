/**
 * A Language Server Protocol client for the end-to-end tests: it spawns
 * `node dist/cli.js lsp` and talks to it over the child's stdio, the way an
 * editor does.
 */
import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';

import { MessageReader, encodeMessage } from '../../src/lsp/jsonrpc';
import type { Message } from '../../src/lsp/protocol';
import { buildCliOnce } from '../helpers/paths';

/** How long a test waits for one message before failing (TypeScript's first check is slow). */
const WAIT_MS = 20000;

export interface Diagnostic {
  range: { start: { line: number; character: number }; end: { line: number; character: number } };
  severity: number;
  source: string;
  message: string;
  code?: string;
}

export interface PublishedDiagnostics {
  uri: string;
  version?: number;
  diagnostics: Diagnostic[];
}

export class LspClient {
  private nextId = 1;
  private readonly pending = new Map<number | string, (_message: Message) => void>();
  /** Every message the server sent that is not a response to one of our requests. */
  readonly received: Message[] = [];
  private readonly listeners = new Set<() => void>();
  private readonly stderrChunks: string[] = [];
  readonly exited: Promise<number | null>;

  private constructor(readonly child: ChildProcessWithoutNullStreams) {
    const reader = new MessageReader(message => {
      const id = message.id;
      if (id !== undefined && id !== null && message.method === undefined && this.pending.has(id)) {
        this.pending.get(id)!(message);
        this.pending.delete(id);
        return;
      }
      this.received.push(message);
      this.listeners.forEach(listener => listener());
    });
    child.stdout.on('data', chunk => reader.feed(chunk));
    child.stderr.on('data', chunk => this.stderrChunks.push(String(chunk)));
    this.exited = new Promise(resolve => child.on('exit', code => resolve(code)));
  }

  /** Starts `somon lsp` with extra CLI arguments, in `cwd`. */
  static start(args: string[] = [], cwd?: string): LspClient {
    const child = spawn(process.execPath, [buildCliOnce(), 'lsp', ...args], {
      cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NO_COLOR: '1' },
    });
    return new LspClient(child);
  }

  get stderr(): string {
    return this.stderrChunks.join('');
  }

  /** Sends a request and waits for its response. */
  request(method: string, params?: unknown): Promise<Message> {
    const id = this.nextId++;
    return this.sendRequest({ jsonrpc: '2.0', id, method, params }, id);
  }

  /** Sends a request with a chosen id (strings are valid ids too). */
  sendRequest(message: object, id: number | string): Promise<Message> {
    return withTimeout(
      new Promise<Message>(resolve => {
        this.pending.set(id, resolve);
        this.write(encodeMessage(message));
      }),
      `a response to ${JSON.stringify(message).slice(0, 80)}`
    );
  }

  notify(method: string, params?: unknown): void {
    this.write(encodeMessage({ jsonrpc: '2.0', method, params }));
  }

  /** Writes raw bytes to the server's stdin. */
  write(bytes: Buffer | string): void {
    this.child.stdin.write(bytes);
  }

  /** Waits until a message (not a response) matches; checks those already received too. */
  waitFor(predicate: (_message: Message) => boolean, what = 'a message'): Promise<Message> {
    return withTimeout(
      new Promise<Message>(resolve => {
        const check = (): void => {
          const found = this.received.find(predicate);
          if (found) {
            this.listeners.delete(check);
            resolve(found);
          }
        };
        this.listeners.add(check);
        check();
      }),
      what
    );
  }

  /** Waits for the diagnostics of `uri` published for document `version`. */
  async diagnostics(uri: string, version?: number): Promise<PublishedDiagnostics> {
    const message = await this.waitFor(
      m =>
        m.method === 'textDocument/publishDiagnostics' &&
        (m.params as PublishedDiagnostics).uri === uri &&
        (m.params as PublishedDiagnostics).version === version,
      `the diagnostics of ${uri} version ${version}`
    );
    return message.params as PublishedDiagnostics;
  }

  /** All diagnostics published for `uri`, in order. */
  published(uri: string): PublishedDiagnostics[] {
    return this.received
      .filter(m => m.method === 'textDocument/publishDiagnostics')
      .map(m => m.params as PublishedDiagnostics)
      .filter(p => p.uri === uri);
  }

  async initialize(initializationOptions?: object, rootUri?: string): Promise<Message> {
    const response = await this.request('initialize', {
      processId: process.pid,
      rootUri: rootUri ?? null,
      capabilities: { textDocument: { hover: { contentFormat: ['markdown'] } } },
      ...(initializationOptions && { initializationOptions }),
    });
    this.notify('initialized', {});
    return response;
  }

  open(uri: string, text: string, version = 1): void {
    this.notify('textDocument/didOpen', {
      textDocument: { uri, languageId: 'somonscript', version, text },
    });
  }

  /** A full-text change (the server asks for `TextDocumentSyncKind.Full`). */
  change(uri: string, version: number, text: string): void {
    this.notify('textDocument/didChange', {
      textDocument: { uri, version },
      contentChanges: [{ text }],
    });
  }

  /** `shutdown` then `exit`; resolves with the exit code. */
  async shutdown(): Promise<number | null> {
    const response = await this.request('shutdown');
    if (response.error) throw new Error(`shutdown failed: ${JSON.stringify(response.error)}`);
    this.notify('exit');
    return withTimeout(this.exited, 'the server to exit');
  }

  kill(): void {
    if (this.child.exitCode === null) this.child.kill();
  }
}

function withTimeout<T>(promise: Promise<T>, what: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`Timed out waiting for ${what}`)), WAIT_MS);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/** Decodes semantic tokens into `[line, character, length, type, modifiers]` tuples. */
export function decodeSemanticTokens(data: number[]): number[][] {
  const result: number[][] = [];
  let line = 0;
  let character = 0;
  for (let i = 0; i < data.length; i += 5) {
    const [deltaLine, deltaStart, length, type, modifiers] = data.slice(i, i + 5);
    line += deltaLine;
    character = deltaLine === 0 ? character + deltaStart : deltaStart;
    result.push([line, character, length, type, modifiers]);
  }
  return result;
}

import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { pathToFileURL } from 'url';

import { MessageReader, encodeMessage } from '../src/lsp/jsonrpc';
import type { Message } from '../src/lsp/protocol';
import { buildCliOnce, canonicalTmpDir } from './helpers/paths';

/** A client speaking LSP to `somon lsp` over the child's stdio. */
class Client {
  private nextId = 1;
  private readonly waiting = new Map<number, (_message: Message) => void>();
  readonly notifications: Message[] = [];
  private readonly listeners: Array<() => void> = [];

  constructor(private readonly child: ChildProcessWithoutNullStreams) {
    const reader = new MessageReader(message => {
      if (typeof message.id === 'number' && this.waiting.has(message.id)) {
        this.waiting.get(message.id)!(message);
        this.waiting.delete(message.id);
      } else {
        this.notifications.push(message);
        this.listeners.forEach(listener => listener());
      }
    });
    child.stdout.on('data', chunk => reader.feed(chunk));
  }

  request(method: string, params?: unknown): Promise<Message> {
    const id = this.nextId++;
    return new Promise(resolve => {
      this.waiting.set(id, resolve);
      this.child.stdin.write(encodeMessage({ jsonrpc: '2.0', id, method, params }));
    });
  }

  notify(method: string, params?: unknown): void {
    this.child.stdin.write(encodeMessage({ jsonrpc: '2.0', method, params }));
  }

  /** Waits for a notification matching `predicate`. */
  waitFor(predicate: (_message: Message) => boolean): Promise<Message> {
    return new Promise(resolve => {
      const check = () => {
        const found = this.notifications.find(predicate);
        if (found) resolve(found);
      };
      this.listeners.push(check);
      check();
    });
  }
}

describe('somon lsp (spawned)', () => {
  let dir: string;
  let child: ChildProcessWithoutNullStreams | undefined;

  beforeAll(() => {
    buildCliOnce();
  });
  beforeEach(() => {
    dir = canonicalTmpDir('somon-lsp-e2e-');
  });
  afterEach(() => {
    child?.kill();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('a full session: initialize, diagnostics, hover, completion, definition, shutdown', async () => {
    fs.writeFileSync(
      path.join(dir, 'math.som'),
      'содир функсия ҷамъ(а: рақам, б: рақам): рақам {\r\n  бозгашт а + б;\r\n}\r\n'
    );
    fs.writeFileSync(
      path.join(dir, 'somon.config.json'),
      JSON.stringify({ compilerOptions: { strict: true } })
    );
    const mainPath = path.join(dir, 'main.som');
    // Windows line endings: positions must still be right
    const text = [
      'ворид { ҷамъ } аз "./math";',
      'тағ натиҷа: рақам = ҷамъ(1, 2);',
      'собит номҳо = ["а", "б"];',
      'номҳо.;',
      'тағ ғалат: сатр = натиҷа;',
      'агар (натиҷа > 2) { чоп.сабт(натиҷа); }',
      '',
    ].join('\r\n');
    fs.writeFileSync(mainPath, text);
    const uri = pathToFileURL(mainPath).href;

    const cli = buildCliOnce();
    child = spawn(process.execPath, [cli, 'lsp', '--stdio', '--lang', 'tj'], {
      cwd: dir,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const stderr: string[] = [];
    child.stderr.on('data', chunk => stderr.push(String(chunk)));
    const client = new Client(child);

    const init = await client.request('initialize', {
      processId: process.pid,
      rootUri: pathToFileURL(dir).href,
      capabilities: {},
    });
    expect((init.result as any).capabilities.hoverProvider).toBe(true);
    expect((init.result as any).serverInfo.name).toBe('somon-lsp');
    client.notify('initialized', {});

    client.notify('textDocument/didOpen', {
      textDocument: { uri, languageId: 'somonscript', version: 1, text },
    });
    const published = await client.waitFor(
      message => message.method === 'textDocument/publishDiagnostics'
    );
    const params = published.params as any;
    expect(params.uri).toBe(uri);
    // `номҳо.;` is a syntax error at the `;` on line 4
    expect(params.diagnostics).toHaveLength(1);
    expect(params.diagnostics[0].range.start).toEqual({ line: 3, character: 6 });
    expect(params.diagnostics[0].source).toBe('somon');

    // Fix the syntax error: now the (strict) type error shows
    const fixed = text.replace('номҳо.;', 'номҳо;');
    client.notify('textDocument/didChange', {
      textDocument: { uri, version: 2 },
      contentChanges: [{ text: fixed }],
    });
    const second = await client.waitFor(
      message =>
        message.method === 'textDocument/publishDiagnostics' &&
        (message.params as any).version === 2
    );
    const typeError = (second.params as any).diagnostics[0];
    expect(typeError.code).toBe('TYPE_NOT_ASSIGNABLE');
    expect(typeError.severity).toBe(1);
    expect(typeError.range).toEqual({
      start: { line: 4, character: 18 },
      end: { line: 4, character: 24 },
    });

    const hover = await client.request('textDocument/hover', {
      textDocument: { uri },
      position: { line: 1, character: 5 },
    });
    expect((hover.result as any).contents.value).toBe('```som\n(тағйирёбанда) натиҷа: рақам\n```');

    const keywordHover = await client.request('textDocument/hover', {
      textDocument: { uri },
      position: { line: 5, character: 1 },
    });
    expect((keywordHover.result as any).contents.value).toContain('`if`');

    // Completion after `номҳо.` (in the version with the dot)
    client.notify('textDocument/didChange', {
      textDocument: { uri, version: 3 },
      contentChanges: [{ text }],
    });
    const completion = await client.request('textDocument/completion', {
      textDocument: { uri },
      position: { line: 3, character: 6 },
      context: { triggerKind: 2, triggerCharacter: '.' },
    });
    const items = (completion.result as any).items as Array<{ label: string; sortText: string }>;
    const labels = items.map(item => item.label);
    expect(labels).toEqual(expect.arrayContaining(['илова', 'харита', 'push', 'map']));
    const byLabel = new Map(items.map(item => [item.label, item.sortText]));
    expect(byLabel.get('харита')! < byLabel.get('map')!).toBe(true);

    const definition = await client.request('textDocument/definition', {
      textDocument: { uri },
      position: { line: 1, character: 20 },
    });
    expect(definition.result).toEqual([
      {
        uri: pathToFileURL(path.join(dir, 'math.som')).href,
        range: { start: { line: 0, character: 14 }, end: { line: 0, character: 18 } },
      },
    ]);

    const shutdown = await client.request('shutdown');
    expect(shutdown.result).toBeNull();
    const exited = new Promise<number | null>(resolve => child!.on('exit', resolve));
    client.notify('exit');
    expect(await exited).toBe(0);
    expect(stderr.join('')).toBe('');
  }, 30000);

  test('exits with 1 when the client goes away without shutdown', async () => {
    child = spawn(process.execPath, [buildCliOnce(), 'lsp'], { stdio: ['pipe', 'pipe', 'pipe'] });
    const exited = new Promise<number | null>(resolve => child!.on('exit', resolve));
    child.stdin.end();
    expect(await exited).toBe(1);
  }, 30000);
});

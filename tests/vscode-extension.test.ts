import * as fs from 'fs';
import * as path from 'path';
import { canonicalTmpDir } from './helpers/paths';

/**
 * The extension's client (editors/vscode/extension.js) with `vscode` and
 * `vscode-languageclient` replaced by stand-ins: neither is installed here.
 */

const state = {
  language: 'en',
  folders: [] as Array<{ uri: { fsPath: string } }>,
  settings: {} as Record<string, unknown>,
  commands: new Map<string, () => Promise<void>>(),
  configListeners: [] as Array<
    (_event: { affectsConfiguration: (_s: string) => boolean }) => Promise<void>
  >,
  errors: [] as string[],
  clients: [] as any[],
  failStart: false,
};

jest.mock(
  'vscode',
  () => ({
    env: {
      get language() {
        return state.language;
      },
    },
    workspace: {
      get workspaceFolders() {
        return state.folders;
      },
      getConfiguration: () => ({
        get: (key: string, fallback: unknown) =>
          key in state.settings ? state.settings[key] : fallback,
      }),
      createFileSystemWatcher: (glob: string) => ({ glob }),
      onDidChangeConfiguration: (listener: any) => {
        state.configListeners.push(listener);
        return { dispose() {} };
      },
    },
    commands: {
      registerCommand: (name: string, run: () => Promise<void>) => {
        state.commands.set(name, run);
        return { dispose() {} };
      },
      executeCommand: (name: string) => state.commands.get(name)!(),
    },
    window: { showErrorMessage: (message: string) => state.errors.push(message) },
  }),
  { virtual: true }
);

jest.mock(
  'vscode-languageclient/node',
  () => ({
    TransportKind: { stdio: 0, ipc: 1 },
    LanguageClient: class {
      notifications: unknown[] = [];
      started = false;
      stopped = false;
      constructor(
        readonly id: string,
        readonly name: string,
        readonly serverOptions: any,
        readonly clientOptions: any
      ) {
        state.clients.push(this);
      }
      async start() {
        if (state.failStart) throw new Error('spawn somon ENOENT');
        this.started = true;
      }
      async stop() {
        this.stopped = true;
      }
      async sendNotification(method: string, params: unknown) {
        this.notifications.push([method, params]);
      }
      dispose() {}
    },
  }),
  { virtual: true }
);

// eslint-disable-next-line @typescript-eslint/no-var-requires
const extension = require('../editors/vscode/extension.js');

describe('VS Code extension client', () => {
  let dir: string;
  const context = () => ({ subscriptions: [] as unknown[] });

  beforeEach(() => {
    dir = canonicalTmpDir('somon-vscode-');
    Object.assign(state, {
      language: 'en',
      folders: [],
      settings: {},
      commands: new Map(),
      configListeners: [],
      errors: [],
      clients: [],
      failStart: false,
    });
  });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  test('starts the workspace CLI as a Node module with the editor language', async () => {
    const cli = path.join(dir, 'node_modules', '@lindentech', 'somon-script', 'dist', 'cli.js');
    fs.mkdirSync(path.dirname(cli), { recursive: true });
    fs.writeFileSync(cli, '');
    state.folders = [{ uri: { fsPath: path.join(dir, 'нест') } }, { uri: { fsPath: dir } }];
    state.language = 'ru';
    await extension.activate(context());

    const [client] = state.clients;
    expect(client.started).toBe(true);
    expect(client.serverOptions.run).toEqual({ module: cli, args: ['lsp'], transport: 0 });
    expect(client.clientOptions.initializationOptions).toEqual({ locale: 'ru' });
    expect(client.clientOptions.documentSelector[0]).toEqual({
      scheme: 'file',
      language: 'somonscript',
    });
    expect(client.clientOptions.synchronize.fileEvents).toEqual({ glob: '**/somon.config.json' });

    await extension.deactivate();
    expect(client.stopped).toBe(true);
  });

  test('without a workspace CLI it runs `somon` from the PATH (through a shell on Windows)', () => {
    const { run } = extension.serverOptions('');
    expect(run.command).toBe('somon');
    expect(run.args).toEqual(['lsp', '--stdio']);
    expect(run.options.shell).toBe(process.platform === 'win32');
    expect(extension.serverOptions('/opt/somon/bin/somon').run.command).toBe(
      '/opt/somon/bin/somon'
    );
    expect(extension.serverOptions('C:\\somon\\dist\\cli.js').run.module).toBe(
      'C:\\somon\\dist\\cli.js'
    );
  });

  test('maps the editor language to a server locale unless one is configured', () => {
    state.language = 'tg';
    expect(extension.serverLocale('')).toBe('tj');
    state.language = 'ru-ru';
    expect(extension.serverLocale('')).toBe('ru');
    state.language = 'de';
    expect(extension.serverLocale('')).toBe('en');
    expect(extension.serverLocale('tj')).toBe('tj');
  });

  test('restarts on server setting changes and forwards locale changes', async () => {
    await extension.activate(context());
    expect(state.clients).toHaveLength(1);
    const [listener] = state.configListeners;

    await listener({ affectsConfiguration: section => section === 'somonscript.server' });
    expect(state.clients).toHaveLength(2);
    expect(state.clients[0].stopped).toBe(true);

    state.settings = { locale: 'tj' };
    await listener({ affectsConfiguration: section => section === 'somonscript.locale' });
    expect(state.clients[1].notifications).toEqual([
      ['workspace/didChangeConfiguration', { settings: { somonscript: { locale: 'tj' } } }],
    ]);
    await listener({ affectsConfiguration: () => false });
    expect(state.clients).toHaveLength(2);
  });

  test('reports a server that cannot start, and can be disabled', async () => {
    state.failStart = true;
    await extension.activate(context());
    expect(state.errors[0]).toContain('could not start the language server');

    state.settings = { 'server.enable': false };
    await state.commands.get('somonscript.restartServer')!();
    expect(state.clients).toHaveLength(1);
    await extension.deactivate();
  });
});

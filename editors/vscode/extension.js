// SomonScript for VS Code: starts `somon lsp` with vscode-languageclient.
'use strict';

const fs = require('fs');
const path = require('path');
const vscode = require('vscode');

/** @type {import('vscode-languageclient/node').LanguageClient | undefined} */
let client;

/** The CLI bundled with a workspace's `@lindentech/somon-script`, if any. */
function workspaceCli() {
  for (const folder of vscode.workspace.workspaceFolders ?? []) {
    const cli = path.join(
      folder.uri.fsPath,
      'node_modules',
      '@lindentech',
      'somon-script',
      'dist',
      'cli.js'
    );
    if (fs.existsSync(cli)) return cli;
  }
  return undefined;
}

/**
 * How to start the server: a `.js` CLI runs as a Node module (no shell, so
 * Windows needs no `.cmd` shim); anything else is an executable on the PATH.
 */
function serverOptions(configuredPath) {
  const { TransportKind } = require('vscode-languageclient/node');
  const cli = configuredPath || workspaceCli();
  if (cli && /\.[cm]?js$/i.test(cli)) {
    const run = { module: cli, args: ['lsp'], transport: TransportKind.stdio };
    return { run, debug: run };
  }
  const command = cli || 'somon';
  const run = {
    command,
    args: ['lsp', '--stdio'],
    // `somon` from npm is a `.cmd` shim on Windows
    options: { shell: process.platform === 'win32' },
  };
  return { run, debug: run };
}

/** `ru` → ru, `tg`/`tj` → tj, anything else → en, unless a locale is configured. */
function serverLocale(configured) {
  if (configured) return configured;
  const language = vscode.env.language.toLowerCase();
  if (language.startsWith('ru')) return 'ru';
  if (language.startsWith('tg') || language.startsWith('tj')) return 'tj';
  return 'en';
}

async function startClient(context) {
  const config = vscode.workspace.getConfiguration('somonscript');
  if (!config.get('server.enable', true)) return;
  const { LanguageClient } = require('vscode-languageclient/node');
  client = new LanguageClient(
    'somonscript',
    'SomonScript',
    serverOptions(config.get('server.path', '')),
    {
      documentSelector: [
        { scheme: 'file', language: 'somonscript' },
        { scheme: 'untitled', language: 'somonscript' },
      ],
      initializationOptions: { locale: serverLocale(config.get('locale', '')) },
      synchronize: {
        // The server re-reads somon.config.json when it changes
        fileEvents: vscode.workspace.createFileSystemWatcher('**/somon.config.json'),
      },
    }
  );
  context.subscriptions.push(client);
  try {
    await client.start();
  } catch (error) {
    vscode.window.showErrorMessage(
      `SomonScript: could not start the language server (${error.message}). ` +
        'Install @lindentech/somon-script or set "somonscript.server.path".'
    );
  }
}

async function activate(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand('somonscript.restartServer', async () => {
      if (client) {
        await client.stop();
        client = undefined;
      }
      await startClient(context);
    }),
    vscode.workspace.onDidChangeConfiguration(async event => {
      if (event.affectsConfiguration('somonscript.server')) {
        await vscode.commands.executeCommand('somonscript.restartServer');
      } else if (event.affectsConfiguration('somonscript.locale') && client) {
        const locale = serverLocale(
          vscode.workspace.getConfiguration('somonscript').get('locale', '')
        );
        await client.sendNotification('workspace/didChangeConfiguration', {
          settings: { somonscript: { locale } },
        });
      }
    })
  );
  await startClient(context);
}

async function deactivate() {
  if (client) await client.stop();
}

module.exports = { activate, deactivate, serverOptions, serverLocale };

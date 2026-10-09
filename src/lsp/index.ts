/**
 * The SomonScript language server (`somon lsp`): the Language Server Protocol
 * over a pair of byte streams, stdin/stdout by default.
 */

import type { Readable, Writable } from 'node:stream';

import type { LanguageServerHooks } from './hooks';
import { MessageReader, encodeMessage } from './jsonrpc';
import { SomonLanguageServer } from './server';

export { registerChecker, registerFormatter, type LanguageServerHooks } from './hooks';
export { SomonLanguageServer, type LanguageServerOptions } from './server';
export { MessageReader, encodeMessage } from './jsonrpc';

export interface StdioServerOptions {
  locale?: string;
  hooks?: LanguageServerHooks;
  version?: string;
  input?: Readable;
  output?: Writable;
  /** Ends the process; called once, on `exit` or when the input closes. */
  exit?: (_code: number) => void;
}

/** Starts a language server reading `input` (stdin) and writing `output` (stdout). */
export function startLanguageServer(options: StdioServerOptions = {}): SomonLanguageServer {
  const input = options.input ?? process.stdin;
  const output = options.output ?? process.stdout;
  if (output === process.stdout) protectStdout();

  let exited = false;
  const exit = (code: number): void => {
    if (exited) return;
    exited = true;
    (options.exit ?? (exitCode => process.exit(exitCode)))(code);
  };
  const server = new SomonLanguageServer({
    send: message => output.write(encodeMessage(message)),
    locale: options.locale,
    hooks: options.hooks,
    version: options.version,
    onExit: exit,
  });
  const reader = new MessageReader(
    message => server.handle(message),
    error => server.handleInvalidMessage(error.message)
  );
  input.on('data', (chunk: Buffer | string) => reader.feed(chunk));
  // The client is gone: there is nobody left to serve
  input.on('end', () => exit(1));
  return server;
}

/** stdout carries the protocol: anything logged goes to stderr instead. */
function protectStdout(): void {
  const toStderr = (...args: unknown[]): void => console.error(...args);
  console.log = toStderr;
  console.info = toStderr;
  console.debug = toStderr;
}

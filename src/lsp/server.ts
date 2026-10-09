/**
 * The SomonScript language server: dispatches LSP requests and notifications
 * to the feature modules and keeps the open documents (full text sync).
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { ConfigError, loadConfigWithPath, type SomonConfig } from '../config';
import { DEFAULT_INDENT } from '../tools/format';
import {
  analyzeDocument,
  type Analysis,
  type AnalysisOptions,
  type ModuleLookup,
} from './analysis';
import { completion } from './completion';
import { definition, type ResolvedModule } from './definition';
import { documentSymbols } from './document-symbols';
import { formatDocument } from './formatting';
import { resolveFormatter, type Formatter, type LanguageServerHooks } from './hooks';
import { hover } from './hover';
import { messagesFor, normalizeLocale, type Locale, type LspMessages } from './messages';
import {
  ErrorCode,
  type FormattingOptions,
  type Message,
  type Position,
  type ResponseError,
} from './protocol';
import { SEMANTIC_TOKEN_MODIFIERS, SEMANTIC_TOKEN_TYPES, semanticTokens } from './semantic-tokens';
import { TextDocument } from './text-document';

export interface LanguageServerOptions {
  /** Sends a message to the client. */
  send: (_message: object) => void;
  /** Interface language unless the client's `initializationOptions.locale` names one. */
  locale?: string;
  hooks?: LanguageServerHooks;
  /** Called on the `exit` notification: 0 after `shutdown`, 1 otherwise. */
  onExit?: (_code: number) => void;
  /** Reads a file that is not open in the editor (cross-file definitions). */
  readFile?: (_path: string) => string | undefined;
  /** Reported as `serverInfo.version`. */
  version?: string;
}

interface TextDocumentParams {
  textDocument: { uri: string; text?: string; version?: number; languageId?: string };
  position?: Position;
  contentChanges?: Array<{ text: string; range?: unknown }>;
  options?: FormattingOptions;
}

class RequestError extends Error {
  readonly code: number;

  constructor(code: number, message: string) {
    super(message);
    this.code = code;
  }
}

type Handler = (_params: unknown) => unknown;

const defaultReadFile = (file: string): string | undefined => {
  try {
    // An imported module next to an open document, for go to definition
    return fs.readFileSync(file, 'utf8'); // NOSONAR
  } catch {
    return undefined;
  }
};

export class SomonLanguageServer {
  private readonly documents = new Map<string, TextDocument>();
  private readonly analyses = new Map<string, Analysis>();
  private locale: Locale;
  private messages: LspMessages;
  private readonly formatter: Formatter;
  private initialized = false;
  private shuttingDown = false;
  private readonly requests: Record<string, Handler>;
  private readonly notifications: Record<string, Handler>;

  private readonly options: LanguageServerOptions;

  constructor(options: LanguageServerOptions) {
    this.options = options;
    this.locale = normalizeLocale(options.locale);
    this.messages = messagesFor(this.locale);
    this.formatter = resolveFormatter(options.hooks);
    this.requests = {
      initialize: params => this.initialize(params as InitializeParams),
      shutdown: () => {
        this.shuttingDown = true;
        return null;
      },
      'textDocument/hover': params =>
        this.withDocument(params, (analysis, offset) =>
          hover(analysis, offset, this.messages, this.moduleLookup(analysis))
        ),
      'textDocument/completion': params =>
        this.withDocument(params, (analysis, offset) => ({
          isIncomplete: false,
          items: completion(analysis, offset, this.messages, this.moduleLookup(analysis)),
        })),
      'textDocument/definition': params =>
        this.withDocument(params, (analysis, offset) =>
          definition(analysis, analysis.document.uri, offset, specifier =>
            this.loadModule(analysis.document.uri, specifier)
          )
        ),
      'textDocument/documentSymbol': params =>
        this.withDocument(params, analysis => documentSymbols(analysis)),
      'textDocument/semanticTokens/full': params =>
        this.withDocument(params, analysis => semanticTokens(analysis)),
      'textDocument/formatting': params => this.format(params as TextDocumentParams),
    };
    this.notifications = {
      initialized: () => undefined,
      exit: () => this.options.onExit?.(this.shuttingDown ? 0 : 1),
      'textDocument/didOpen': params => this.open(params as TextDocumentParams),
      'textDocument/didChange': params => this.change(params as TextDocumentParams),
      'textDocument/didClose': params => this.close(params as TextDocumentParams),
      'workspace/didChangeConfiguration': params => this.changeConfiguration(params),
      // somon.config.json changed: its options apply to every open document
      'workspace/didChangeWatchedFiles': () => this.refreshAll(),
    };
  }

  /** Handles one message from the client. */
  handle(message: Message): void {
    if (message.method === undefined) return; // a response to a request of ours
    const isRequest = message.id !== undefined && message.id !== null;
    if (!isRequest) {
      this.notify(message.method, message.params);
      return;
    }
    try {
      this.respond(message.id!, this.request(message.method, message.params));
    } catch (error) {
      this.respondError(message.id!, toResponseError(error, this.messages));
    }
  }

  /** Reports a message the client sent that could not be read. */
  handleInvalidMessage(reason: string): void {
    this.options.send({
      jsonrpc: '2.0',
      id: null,
      error: { code: ErrorCode.ParseError, message: reason },
    });
  }

  private request(method: string, params: unknown): unknown {
    if (!this.initialized && method !== 'initialize') {
      throw new RequestError(ErrorCode.ServerNotInitialized, 'The server is not initialized');
    }
    if (this.shuttingDown) {
      throw new RequestError(ErrorCode.InvalidRequest, 'The server is shutting down');
    }
    const handler = this.requests[method];
    if (!handler) throw new RequestError(ErrorCode.MethodNotFound, `Unknown method: ${method}`);
    return handler(params);
  }

  private notify(method: string, params: unknown): void {
    if (method !== 'exit' && !this.initialized) return;
    try {
      this.notifications[method]?.(params);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.options.send({
        jsonrpc: '2.0',
        method: 'window/logMessage',
        params: { type: 1, message: this.messages.internalError(reason) },
      });
    }
  }

  private respond(id: number | string, result: unknown): void {
    this.options.send({ jsonrpc: '2.0', id, result: result ?? null });
  }

  private respondError(id: number | string, error: ResponseError): void {
    this.options.send({ jsonrpc: '2.0', id, error });
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  private initialize(params: InitializeParams): object {
    const locale = params?.initializationOptions?.locale;
    if (typeof locale === 'string') this.setLocale(locale);
    this.initialized = true;
    return {
      capabilities: {
        positionEncoding: 'utf-16',
        textDocumentSync: { openClose: true, change: 1 },
        hoverProvider: true,
        completionProvider: { triggerCharacters: ['.'], resolveProvider: false },
        definitionProvider: true,
        documentSymbolProvider: true,
        documentFormattingProvider: true,
        semanticTokensProvider: {
          legend: {
            tokenTypes: [...SEMANTIC_TOKEN_TYPES],
            tokenModifiers: [...SEMANTIC_TOKEN_MODIFIERS],
          },
          full: true,
        },
      },
      serverInfo: {
        name: 'somon-lsp',
        ...(this.options.version && { version: this.options.version }),
      },
    };
  }

  private setLocale(locale: string): void {
    this.locale = normalizeLocale(locale);
    this.messages = messagesFor(this.locale);
  }

  private changeConfiguration(params: unknown): void {
    const settings = (params as { settings?: { somonscript?: { locale?: unknown } } })?.settings;
    const locale = settings?.somonscript?.locale;
    if (typeof locale === 'string') this.setLocale(locale);
  }

  // ---------------------------------------------------------------------------
  // Documents
  // ---------------------------------------------------------------------------

  private open(params: TextDocumentParams): void {
    const { uri, text = '', version = 0, languageId } = params.textDocument;
    this.update(new TextDocument(uri, text, version, languageId));
  }

  private change(params: TextDocumentParams): void {
    const { uri, version = 0 } = params.textDocument;
    const changes = params.contentChanges ?? [];
    if (changes.length === 0) return;
    // Full sync: the last change holds the whole text
    const text = changes[changes.length - 1].text;
    const previous = this.documents.get(uri);
    this.update(new TextDocument(uri, text, version, previous?.languageId));
  }

  private close(params: TextDocumentParams): void {
    const { uri } = params.textDocument;
    this.documents.delete(uri);
    this.analyses.delete(uri);
    this.publish(uri, []);
  }

  private update(document: TextDocument): void {
    this.documents.set(document.uri, document);
    const analysis = this.analyze(document);
    this.analyses.set(document.uri, analysis);
    this.publish(document.uri, analysis.diagnostics, document.version);
  }

  private refreshAll(): void {
    for (const document of this.documents.values()) this.update(document);
  }

  private publish(uri: string, diagnostics: unknown[], version?: number): void {
    this.options.send({
      jsonrpc: '2.0',
      method: 'textDocument/publishDiagnostics',
      params: { uri, diagnostics, ...(version !== undefined && { version }) },
    });
  }

  /** Analyses a document with the options of the somon.config.json above it. */
  private analyze(document: TextDocument): Analysis {
    const fileName = uriToPath(document.uri);
    const options: AnalysisOptions = {
      locale: this.locale,
      hooks: this.options.hooks,
      ...(fileName && { fileName }),
    };
    const { config, error } = this.configFor(fileName);
    options.compilerOptions = config?.compilerOptions as AnalysisOptions['compilerOptions'];
    if (error) options.configError = this.messages.configError(error);
    return analyzeDocument(document, options);
  }

  /** The somon.config.json above a file, or why it could not be read. */
  private configFor(fileName: string | undefined): { config?: SomonConfig; error?: string } {
    if (!fileName) return {};
    try {
      return { config: loadConfigWithPath(path.dirname(fileName)).config };
    } catch (error) {
      return { error: describeConfigError(error) };
    }
  }

  private withDocument<T>(
    params: unknown,
    run: (_analysis: Analysis, _offset: number) => T
  ): T | null {
    const { textDocument, position } = params as TextDocumentParams;
    const analysis = textDocument && this.analyses.get(textDocument.uri);
    if (!analysis) return null;
    const offset = position ? analysis.document.offsetAt(position) : 0;
    return run(analysis, offset);
  }

  /** `somon fmt` with the project's `fmt.indent`, else the editor's tab size. */
  private format(params: TextDocumentParams): unknown {
    const document = this.documents.get(params.textDocument?.uri);
    if (!document) return null;
    const fileName = uriToPath(document.uri);
    const indent = this.configFor(fileName).config?.fmt?.indent;
    const { tabSize = DEFAULT_INDENT, insertSpaces = true } = params.options ?? {};
    try {
      return formatDocument(document, this.formatter, {
        tabSize,
        insertSpaces,
        ...(indent !== undefined && { indent }),
        ...(fileName && { fileName }),
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new RequestError(ErrorCode.RequestFailed, this.messages.formatterFailed(reason));
    }
  }

  // ---------------------------------------------------------------------------
  // Other files
  // ---------------------------------------------------------------------------

  /** Analyses of the modules the document of `analysis` imports. */
  private moduleLookup(analysis: Analysis): ModuleLookup {
    return specifier => this.loadModule(analysis.document.uri, specifier)?.analysis;
  }

  /** The module a relative specifier imports from the document `fromUri`, analysed. */
  private loadModule(fromUri: string, specifier: string): ResolvedModule | undefined {
    const fromFile = uriToPath(fromUri);
    if (!fromFile || !specifier.startsWith('.')) return undefined;
    for (const candidate of moduleCandidates(path.resolve(path.dirname(fromFile), specifier))) {
      const uri = pathToFileURL(candidate).href;
      const open = this.openDocument(candidate);
      if (open)
        return { uri: open.uri, analysis: this.analyses.get(open.uri) ?? this.analyze(open) };
      const text = (this.options.readFile ?? defaultReadFile)(candidate);
      if (text !== undefined) return { uri, analysis: this.analyze(new TextDocument(uri, text)) };
    }
    return undefined;
  }

  /** The open document of a file, compared by path (URIs differ in escaping and case). */
  private openDocument(file: string): TextDocument | undefined {
    const wanted = normalizePath(file);
    for (const document of this.documents.values()) {
      const documentPath = uriToPath(document.uri);
      if (documentPath && normalizePath(documentPath) === wanted) return document;
    }
    return undefined;
  }
}

interface InitializeParams {
  initializationOptions?: { locale?: unknown };
}

/** Files a relative import may name: `./м` → `м.som` or `м/index.som`; `./м.js` → `м.som`. */
function moduleCandidates(resolved: string): string[] {
  if (/\.som$/i.test(resolved)) return [resolved];
  if (/\.js$/i.test(resolved)) return [resolved.replace(/\.js$/i, '.som')];
  return [`${resolved}.som`, path.join(resolved, 'index.som')];
}

/** File system path of a `file:` URI. */
export function uriToPath(uri: string): string | undefined {
  if (!uri.startsWith('file:')) return undefined;
  try {
    return fileURLToPath(uri);
  } catch {
    return undefined;
  }
}

function normalizePath(file: string): string {
  const resolved = path.resolve(file);
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
}

function describeConfigError(error: unknown): string {
  if (error instanceof ConfigError) {
    return [
      error.message,
      ...error.details.map(detail => `${detail.path}: ${detail.message}`),
    ].join('; ');
  }
  return error instanceof Error ? error.message : String(error);
}

function toResponseError(error: unknown, messages: LspMessages): ResponseError {
  if (error instanceof RequestError) return { code: error.code, message: error.message };
  const reason = error instanceof Error ? error.message : String(error);
  return { code: ErrorCode.InternalError, message: messages.internalError(reason) };
}

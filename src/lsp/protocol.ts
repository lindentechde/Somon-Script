/**
 * The subset of the Language Server Protocol (3.17) that the SomonScript
 * language server speaks. Positions are zero-based; `character` counts UTF-16
 * code units, the protocol's default position encoding.
 */

export interface Position {
  line: number;
  character: number;
}

export interface Range {
  start: Position;
  end: Position;
}

export interface Location {
  uri: string;
  range: Range;
}

export interface TextEdit {
  range: Range;
  newText: string;
}

/* eslint-disable no-unused-vars */
export enum DiagnosticSeverity {
  Error = 1,
  Warning = 2,
  Information = 3,
  Hint = 4,
}

export enum CompletionItemKind {
  Method = 2,
  Function = 3,
  Constructor = 4,
  Field = 5,
  Variable = 6,
  Class = 7,
  Interface = 8,
  Module = 9,
  Property = 10,
  Enum = 13,
  Keyword = 14,
  EnumMember = 20,
  Constant = 21,
  TypeParameter = 25,
}

export enum SymbolKind {
  Module = 2,
  Namespace = 3,
  Class = 5,
  Method = 6,
  Property = 7,
  Constructor = 9,
  Enum = 10,
  Interface = 11,
  Function = 12,
  Variable = 13,
  Constant = 14,
  EnumMember = 22,
  TypeParameter = 26,
}

/** JSON-RPC and LSP error codes. */
export enum ErrorCode {
  ParseError = -32700,
  InvalidRequest = -32600,
  MethodNotFound = -32601,
  InvalidParams = -32602,
  InternalError = -32603,
  ServerNotInitialized = -32002,
  RequestFailed = -32803,
}
/* eslint-enable no-unused-vars */

export interface Diagnostic {
  range: Range;
  severity: DiagnosticSeverity;
  code?: string;
  source: string;
  message: string;
}

export interface CompletionItem {
  label: string;
  kind: CompletionItemKind;
  detail?: string;
  documentation?: MarkupContent;
  sortText?: string;
  filterText?: string;
  insertText?: string;
}

export interface MarkupContent {
  kind: 'markdown' | 'plaintext';
  value: string;
}

export interface Hover {
  contents: MarkupContent;
  range?: Range;
}

export interface DocumentSymbol {
  name: string;
  detail?: string;
  kind: SymbolKind;
  range: Range;
  selectionRange: Range;
  children?: DocumentSymbol[];
}

export interface FormattingOptions {
  tabSize: number;
  insertSpaces: boolean;
  [key: string]: boolean | number | string | undefined;
}

export interface SemanticTokens {
  data: number[];
}

/** A JSON-RPC message as read from the wire, before it is classified. */
export interface Message {
  jsonrpc: '2.0';
  id?: number | string | null;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: ResponseError;
}

export interface ResponseError {
  code: number;
  message: string;
  data?: unknown;
}

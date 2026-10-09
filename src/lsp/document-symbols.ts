/** Document symbols: the outline of a document (declarations and their members). */

import type { Analysis } from './analysis';
import { SymbolKind, type DocumentSymbol } from './protocol';
import type { Declaration, DeclarationKind } from './symbols';

const SYMBOL_KINDS: Record<DeclarationKind, SymbolKind> = {
  variable: SymbolKind.Variable,
  constant: SymbolKind.Constant,
  function: SymbolKind.Function,
  parameter: SymbolKind.Variable,
  class: SymbolKind.Class,
  interface: SymbolKind.Interface,
  type: SymbolKind.Interface,
  enum: SymbolKind.Enum,
  enumMember: SymbolKind.EnumMember,
  namespace: SymbolKind.Namespace,
  import: SymbolKind.Module,
  method: SymbolKind.Method,
  property: SymbolKind.Property,
  typeParameter: SymbolKind.TypeParameter,
};

export function documentSymbols(analysis: Analysis): DocumentSymbol[] {
  return analysis.symbols.topLevel
    .filter(declaration => declaration.kind !== 'import')
    .map(declaration => toSymbol(analysis, declaration));
}

function toSymbol(analysis: Analysis, declaration: Declaration): DocumentSymbol {
  const { document } = analysis;
  const type = analysis.types.get(declaration.nameStart);
  const kind =
    declaration.kind === 'method' && declaration.name === 'конструктор'
      ? SymbolKind.Constructor
      : SYMBOL_KINDS[declaration.kind];
  const symbol: DocumentSymbol = {
    name: declaration.name,
    kind,
    range: document.rangeFromOffsets(declaration.start, declaration.end),
    selectionRange: document.rangeFromOffsets(declaration.nameStart, declaration.nameEnd),
    ...(type && { detail: analysis.typeToString(type) }),
  };
  if (declaration.children.length > 0) {
    symbol.children = declaration.children.map(child => toSymbol(analysis, child));
  }
  return symbol;
}

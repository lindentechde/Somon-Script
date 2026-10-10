/**
 * Semantic tokens: names classified by what they declare (functions, classes,
 * parameters, constants, …), keywords including contextual ones, and built-ins.
 */

import { TokenType } from '../tokens';
import type { Analysis } from './analysis';
import { KEYWORD_INFO } from './keywords';
import type { SemanticTokens } from './protocol';
import { resolveName, type Declaration, type DeclarationKind } from './symbols';
import { isMemberName, isWordToken, type LocatedToken } from './tokens';

export const SEMANTIC_TOKEN_TYPES = [
  'namespace',
  'type',
  'class',
  'enum',
  'interface',
  'typeParameter',
  'parameter',
  'variable',
  'property',
  'enumMember',
  'function',
  'method',
  'keyword',
] as const;

export const SEMANTIC_TOKEN_MODIFIERS = ['declaration', 'readonly', 'defaultLibrary'] as const;

type TokenTypeName = (typeof SEMANTIC_TOKEN_TYPES)[number];

const DECLARATION_TOKEN_TYPES: Record<DeclarationKind, TokenTypeName> = {
  variable: 'variable',
  constant: 'variable',
  function: 'function',
  parameter: 'parameter',
  class: 'class',
  interface: 'interface',
  type: 'type',
  enum: 'enum',
  enumMember: 'enumMember',
  namespace: 'namespace',
  import: 'variable',
  method: 'method',
  property: 'property',
  typeParameter: 'typeParameter',
};

const DECLARATION = 1;
const READONLY = 2;
const DEFAULT_LIBRARY = 4;

interface Classified {
  type: TokenTypeName;
  modifiers: number;
}

export function semanticTokens(analysis: Analysis): SemanticTokens {
  const data: number[] = [];
  let previousLine = 0;
  let previousCharacter = 0;
  analysis.tokens.forEach((token, index) => {
    if (!isWordToken(token)) return;
    const classified = classify(analysis, token, index);
    if (!classified) return;
    const start = analysis.document.positionAt(token.start);
    const lineDelta = start.line - previousLine;
    data.push(
      lineDelta,
      lineDelta === 0 ? start.character - previousCharacter : start.character,
      token.end - token.start,
      SEMANTIC_TOKEN_TYPES.indexOf(classified.type),
      classified.modifiers
    );
    previousLine = start.line;
    previousCharacter = start.character;
  });
  return { data };
}

function classify(analysis: Analysis, token: LocatedToken, index: number): Classified | undefined {
  const tokens = analysis.tokens;
  if (isMemberName(tokens, index)) {
    const call = tokens[index + 1]?.type === TokenType.LEFT_PAREN;
    return { type: call ? 'method' : 'property', modifiers: 0 };
  }
  const declaration = resolveName(analysis.symbols, token.value, token.start);
  if (declaration) return fromDeclaration(declaration, token);
  const info = KEYWORD_INFO.get(token.value);
  if (!info || info.category === 'builtinMember') return undefined;
  if (info.category === 'builtin') return { type: 'variable', modifiers: DEFAULT_LIBRARY };
  if (info.category === 'type' || info.category === 'utilityType') {
    return { type: 'type', modifiers: DEFAULT_LIBRARY };
  }
  return { type: 'keyword', modifiers: 0 };
}

function fromDeclaration(declaration: Declaration, token: LocatedToken): Classified {
  let modifiers = declaration.nameStart === token.start ? DECLARATION : 0;
  // Modifier flags are distinct powers of two: adding one sets its bit
  if (declaration.kind === 'constant') modifiers += READONLY;
  const type =
    declaration.kind === 'import' && declaration.importedName === '*'
      ? 'namespace'
      : DECLARATION_TOKEN_TYPES[declaration.kind];
  return { type, modifiers };
}

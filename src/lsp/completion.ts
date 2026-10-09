/**
 * Completion: keywords, names in scope and built-in globals; after a `.`, the
 * members of the value (built-in members with their Tajik aliases first).
 */

import type { Type } from '../type-checker';
import type { Analysis, ModuleLookup } from './analysis';
import { ENGLISH_KEYWORDS, KEYWORD_INFO, isSyntaxKeyword, type KeywordInfo } from './keywords';
import {
  englishMembers,
  globalObjectMembers,
  memberType,
  tajikAliases,
  typeMembers,
  type MemberSet,
} from './members';
import type { LspMessages } from './messages';
import { CompletionItemKind, type CompletionItem } from './protocol';
import {
  resolveName,
  visibleDeclarations,
  type Declaration,
  type DeclarationKind,
} from './symbols';
import { isIdentifierChar } from './text-document';

const DECLARATION_ITEM_KINDS: Record<DeclarationKind, CompletionItemKind> = {
  variable: CompletionItemKind.Variable,
  constant: CompletionItemKind.Constant,
  function: CompletionItemKind.Function,
  parameter: CompletionItemKind.Variable,
  class: CompletionItemKind.Class,
  interface: CompletionItemKind.Interface,
  type: CompletionItemKind.Interface,
  enum: CompletionItemKind.Enum,
  enumMember: CompletionItemKind.EnumMember,
  namespace: CompletionItemKind.Module,
  import: CompletionItemKind.Variable,
  method: CompletionItemKind.Method,
  property: CompletionItemKind.Property,
  typeParameter: CompletionItemKind.TypeParameter,
};

/** JavaScript globals offered after the Tajik ones. */
const ENGLISH_GLOBALS = [
  'console',
  'Math',
  'Object',
  'Array',
  'String',
  'Number',
  'Boolean',
  'JSON',
  'Map',
  'Set',
  'Promise',
  'Error',
  'RegExp',
  'Symbol',
  'Date',
];

/** Sort groups: names in scope, then Tajik keywords and aliases, then English names. */
const SORT_OWN = '0';
const SORT_TAJIK = '1';
const SORT_ENGLISH = '2';

export function completion(
  analysis: Analysis,
  offset: number,
  messages: LspMessages,
  lookupModule: ModuleLookup = () => undefined
): CompletionItem[] {
  const text = analysis.document.text;
  const context = memberContext(text, offset);
  if (context) {
    const members = receiverMembers(analysis, context, lookupModule);
    return members ? memberItems(members, messages) : [];
  }
  return [...scopeItems(analysis, offset, messages), ...keywordItems()];
}

// -----------------------------------------------------------------------------
// After a `.`
// -----------------------------------------------------------------------------

type Receiver =
  | { literal: 'string' | 'array' | 'regexp' }
  | { chain: string[]; start: number }
  /** A value whose type is not known here: a call result, an element, … */
  | { unknown: true };

/** What precedes the `.` before the member name being typed at `offset`, if anything. */
export function memberContext(text: string, offset: number): Receiver | undefined {
  let start = offset;
  while (start > 0 && isIdentifierChar(text[start - 1])) start--;
  if (text[start - 1] !== '.') return undefined;
  let end = start - 1;
  if (text[end - 1] === '?') end--;
  else if (text[end - 1] === '.') return undefined; // `...х` spreads, `1..` is not a member
  const last = text[end - 1];
  if (last === '"' || last === "'" || last === '`') return { literal: 'string' };
  if (last === '/') return { literal: 'regexp' };
  if (last === ']') return arrayLiteralBefore(text, end - 1) ? { literal: 'array' } : UNKNOWN;
  // After a digit the `.` is a decimal point
  return nameChain(text, end) ?? (last === undefined || /[\d\s]/.test(last) ? undefined : UNKNOWN);
}

const UNKNOWN: Receiver = { unknown: true };

/** Whether the `]` at `close` ends an array literal (not an index `а[0]`). */
function arrayLiteralBefore(text: string, close: number): boolean {
  let depth = 0;
  for (let i = close; i >= 0; i--) {
    if (text[i] === ']') depth++;
    else if (text[i] === '[' && --depth === 0) {
      const before = text.slice(0, i).trimEnd();
      return !/[\p{ID_Continue}$)\]]$/u.test(before);
    }
  }
  return false;
}

/** `а.б.в` ending at `end`, as names, with the offset of the first one. */
function nameChain(text: string, end: number): Receiver | undefined {
  const chain: string[] = [];
  let position = end;
  for (;;) {
    let start = position;
    while (start > 0 && isIdentifierChar(text[start - 1])) start--;
    if (start === position || /\d/.test(text[start])) return undefined;
    chain.unshift(text.slice(start, position));
    if (text[start - 1] !== '.' || text[start - 2] === '.') return { chain, start };
    position = text[start - 2] === '?' ? start - 2 : start - 1;
  }
}

function receiverMembers(
  analysis: Analysis,
  receiver: Receiver,
  lookupModule: ModuleLookup
): MemberSet | undefined {
  if ('unknown' in receiver) return undefined;
  if ('literal' in receiver) {
    const literalTypes: Record<string, Type> = {
      string: { kind: 'primitive', name: 'string' },
      array: { kind: 'array' },
      regexp: { kind: 'generic', name: 'RegExp' },
    };
    return typeMembers(literalTypes[receiver.literal]);
  }
  const [first, ...rest] = receiver.chain;
  let members = firstMembers(analysis, first, receiver.start, lookupModule);
  for (const name of rest) {
    const type = members?.type && memberType(members.type, name);
    members = type ? { set: typeMembers(type), type } : undefined;
  }
  return members?.set;
}

interface ResolvedMembers {
  set: MemberSet;
  type?: Type;
}

/** Members of the first name of a chain: a declaration in scope, else a global object. */
function firstMembers(
  analysis: Analysis,
  name: string,
  offset: number,
  lookupModule: ModuleLookup
): ResolvedMembers | undefined {
  const declaration = resolveName(analysis.symbols, name, offset);
  if (!declaration) {
    const set = globalObjectMembers(name);
    return set && { set };
  }
  const staticMembers = declarationMembers(declaration, lookupModule);
  if (staticMembers) return { set: staticMembers };
  const type = analysis.types.get(offset) ?? analysis.types.get(declaration.nameStart);
  return type ? { set: typeMembers(type), type } : undefined;
}

/** Members of a class, enum or namespace name, or of a namespace import. */
function declarationMembers(
  declaration: Declaration,
  lookupModule: ModuleLookup
): MemberSet | undefined {
  const names = staticNames(declaration, lookupModule);
  if (!names) return undefined;
  const unknown: Type = { kind: 'unknown' };
  return {
    own: new Map(names.map(name => [name, { type: unknown, optional: false }])),
    builtin:
      declaration.kind === 'class' ? typeMembers({ kind: 'function' }).builtin : new Set<string>(),
  };
}

/** Names readable on the declared value itself: static members, enum members, exports. */
function staticNames(declaration: Declaration, lookupModule: ModuleLookup): string[] | undefined {
  switch (declaration.kind) {
    case 'import': {
      if (declaration.importedName !== '*' || !declaration.importFrom) return undefined;
      const module = lookupModule(declaration.importFrom);
      return module?.symbols.topLevel
        .filter(exported => exported.exported && !exported.defaultExport)
        .map(exported => exported.name);
    }
    case 'class':
      return declaration.children.filter(child => child.static).map(child => child.name);
    case 'enum':
      return declaration.children.map(child => child.name);
    case 'namespace':
      return declaration.children.filter(child => child.exported).map(child => child.name);
    default:
      return undefined;
  }
}

function memberItems(members: MemberSet, messages: LspMessages): CompletionItem[] {
  const items: CompletionItem[] = [];
  for (const [name, property] of members.own) {
    const kind =
      property.type.kind === 'function' ? CompletionItemKind.Method : CompletionItemKind.Property;
    items.push({ label: name, kind, sortText: `${SORT_OWN}${name}` });
  }
  const aliased = new Set<string>();
  for (const [tajik, english] of tajikAliases(members.builtin)) {
    if (members.own.has(tajik)) continue;
    aliased.add(english);
    items.push({
      label: tajik,
      kind: CompletionItemKind.Method,
      detail: english,
      documentation: { kind: 'markdown', value: `${messages.english}: \`${english}\`` },
      sortText: `${SORT_TAJIK}${tajik}`,
    });
  }
  for (const english of englishMembers(members.builtin)) {
    if (members.own.has(english)) continue;
    items.push({
      label: english,
      kind: CompletionItemKind.Method,
      sortText: `${SORT_ENGLISH}${english}`,
      ...(aliased.has(english) && { detail: english }),
    });
  }
  return items;
}

// -----------------------------------------------------------------------------
// Elsewhere
// -----------------------------------------------------------------------------

function scopeItems(analysis: Analysis, offset: number, messages: LspMessages): CompletionItem[] {
  return visibleDeclarations(analysis.symbols, offset).map(declaration => {
    const type = analysis.types.get(declaration.nameStart);
    return {
      label: declaration.name,
      kind: DECLARATION_ITEM_KINDS[declaration.kind],
      detail: type ? analysis.typeToString(type) : messages.kinds[declaration.kind],
      sortText: `${SORT_OWN}${declaration.name}`,
    };
  });
}

let keywordItemCache: CompletionItem[] | undefined;

/** Tajik keywords, types and built-ins first, then the English keywords and globals. */
function keywordItems(): CompletionItem[] {
  if (keywordItemCache) return keywordItemCache;
  const items: CompletionItem[] = [];
  for (const [word, info] of KEYWORD_INFO) {
    if (info.category === 'builtinMember') continue;
    items.push({
      label: word,
      kind: keywordKind(word, info),
      detail: info.english,
      documentation: { kind: 'markdown', value: info.doc },
      sortText: `${SORT_TAJIK}${word}`,
    });
  }
  for (const word of [...ENGLISH_KEYWORDS, ...ENGLISH_GLOBALS]) {
    items.push({
      label: word,
      kind: /^[A-Z]|^console$/.test(word)
        ? CompletionItemKind.Variable
        : CompletionItemKind.Keyword,
      sortText: `${SORT_ENGLISH}${word}`,
    });
  }
  keywordItemCache = items;
  return items;
}

function keywordKind(word: string, info: KeywordInfo): CompletionItemKind {
  if (isSyntaxKeyword(word) && info.category !== 'type') return CompletionItemKind.Keyword;
  if (info.category === 'type' || info.category === 'utilityType')
    return CompletionItemKind.Interface;
  return CompletionItemKind.Variable;
}

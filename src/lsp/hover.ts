/**
 * Hover: the type of a name, or what a keyword means (in Tajik, with its
 * JavaScript/TypeScript equivalent).
 */

import { nameType, type Analysis, type ModuleLookup } from './analysis';
import { KEYWORD_INFO, isSyntaxKeyword, type KeywordInfo } from './keywords';
import { globalObjectMembers, memberType, tajikAliases } from './members';
import type { LspMessages } from './messages';
import type { Hover } from './protocol';
import {
  exportedDeclaration,
  resolveName,
  type Declaration,
  type DeclarationKind,
} from './symbols';
import { wordRangeAt } from './text-document';
import { isMemberName, wordTokenAt, type LocatedToken } from './tokens';

/** The keyword that introduces each kind of type-level declaration. */
const DECLARATION_KEYWORDS: Partial<Record<DeclarationKind, string>> = {
  class: 'синф',
  interface: 'интерфейс',
  type: 'навъ',
  enum: 'шумориш',
  namespace: 'номфазо',
};

export function hover(
  analysis: Analysis,
  offset: number,
  messages: LspMessages,
  lookupModule: ModuleLookup = () => undefined
): Hover | null {
  const { document, tokens } = analysis;
  const index = wordTokenAt(tokens, offset);
  if (index === -1) {
    // Without tokens (the lexer failed) keywords are still explained
    const word = tokens.length === 0 ? wordRangeAt(document.text, offset) : undefined;
    const text = word && keywordHover(document.text.slice(word[0], word[1]), messages);
    return text && word ? markdown(text, analysis, word) : null;
  }
  const token = tokens[index];
  const text = isMemberName(tokens, index)
    ? memberHover(analysis, index, messages)
    : nameHover(analysis, token, messages, lookupModule);
  return text ? markdown(text, analysis, [token.start, token.end]) : null;
}

function nameHover(
  analysis: Analysis,
  token: LocatedToken,
  messages: LspMessages,
  lookupModule: ModuleLookup
): string | undefined {
  const declaration = resolveName(analysis.symbols, token.value, token.start);
  if (!declaration) return keywordHover(token.value, messages);
  const keyword = DECLARATION_KEYWORDS[declaration.kind];
  if (keyword) return codeBlock(`${keyword} ${declaration.name}`);
  const label = messages.kinds[declaration.kind];
  const typeText = declaration.importFrom
    ? importedTypeText(declaration, lookupModule)
    : typeTextAt(analysis, declaration, token);
  const from = declaration.importFrom ? `\n\n"${declaration.importFrom}"` : '';
  return codeBlock(`(${label}) ${declaration.name}${typeText}`) + from;
}

function typeTextAt(analysis: Analysis, declaration: Declaration, token: LocatedToken): string {
  const type = analysis.types.get(token.start) ?? analysis.types.get(declaration.nameStart);
  return type ? `: ${analysis.typeToString(type)}` : '';
}

/** The type an imported name has in its module. */
function importedTypeText(declaration: Declaration, lookupModule: ModuleLookup): string {
  const module = lookupModule(declaration.importFrom!);
  const target = module && exportedDeclaration(module.symbols, declaration.importedName!);
  const type = target && module.types.get(target.nameStart);
  return type ? `: ${module.typeToString(type)}` : '';
}

/** Hover on a member name: its type, or the JavaScript name a Tajik built-in alias stands for. */
function memberHover(analysis: Analysis, index: number, messages: LspMessages): string | undefined {
  const { tokens } = analysis;
  const name = tokens[index].value;
  const receiver = tokens[index - 2];
  const receiverType = receiver && nameType(analysis, receiver.value, receiver.start);
  const type = receiverType && memberType(receiverType, name);
  if (type) {
    return codeBlock(`(${messages.kinds.property}) ${name}: ${analysis.typeToString(type)}`);
  }
  const globalMembers = receiver && globalObjectMembers(receiver.value);
  const alias =
    globalMembers && tajikAliases(globalMembers.builtin).find(([tajik]) => tajik === name);
  if (alias) {
    return codeBlock(`${receiver.value}.${name}`) + `\n\n${messages.english}: \`${alias[1]}\``;
  }
  const info = KEYWORD_INFO.get(name);
  // A keyword after a `.` on a line still being written (`о.\nагар …`)
  return info && (info.category === 'builtinMember' || isSyntaxKeyword(name))
    ? keywordDoc(name, info, messages)
    : undefined;
}

function keywordHover(word: string, messages: LspMessages): string | undefined {
  const info = KEYWORD_INFO.get(word);
  return info && keywordDoc(word, info, messages);
}

export function keywordDoc(word: string, info: KeywordInfo, messages: LspMessages): string {
  let label = messages.builtin;
  if (info.contextual) label = messages.contextualKeyword;
  else if (isSyntaxKeyword(word)) label = messages.keyword;
  return `**${word}** — ${label} · ${messages.english}: \`${info.english}\`\n\n${info.doc}`;
}

function codeBlock(code: string): string {
  return '```som\n' + code + '\n```';
}

function markdown(value: string, analysis: Analysis, range: [number, number]): Hover {
  return {
    contents: { kind: 'markdown', value },
    range: analysis.document.rangeFromOffsets(range[0], range[1]),
  };
}

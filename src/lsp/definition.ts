/**
 * Go to definition: names resolve through the scopes of the document;
 * imported names, `М.ном` after `ворид * чун М` and module specifiers lead to
 * the imported file.
 */

import { TokenType } from '../tokens';
import { nameType, type Analysis } from './analysis';
import type { Location, Range } from './protocol';
import { exportedDeclaration, resolveName, type Declaration } from './symbols';
import { isMemberName, tokenIndexCovering, wordTokenAt, type LocatedToken } from './tokens';

/** An analysed module and where it lives. */
export interface ResolvedModule {
  uri: string;
  analysis: Analysis;
}

/** Loads the module a specifier imports from the document being analysed. */
export type ModuleLoader = (_specifier: string) => ResolvedModule | undefined;

export function definition(
  analysis: Analysis,
  uri: string,
  offset: number,
  loadModule: ModuleLoader
): Location[] {
  const { tokens } = analysis;
  const specifier = importSpecifierAt(tokens, offset);
  if (specifier !== undefined) {
    const module = loadModule(specifier);
    return module ? [{ uri: module.uri, range: emptyRange() }] : [];
  }
  const index = wordTokenAt(tokens, offset);
  if (index === -1) return [];
  if (isMemberName(tokens, index)) return memberDefinition(analysis, uri, index, loadModule);

  const token = tokens[index];
  const declaration = resolveName(analysis.symbols, token.value, token.start);
  if (!declaration) return [];
  if (declaration.importFrom) {
    const imported = importedDefinition(declaration, loadModule);
    if (imported.length > 0) return imported;
  }
  return [location(analysis, uri, declaration)];
}

/** The module specifier when `offset` is on the string of an import or export. */
function importSpecifierAt(tokens: readonly LocatedToken[], offset: number): string | undefined {
  const index = tokenIndexCovering(tokens, offset);
  const token = tokens[index];
  if (!token || token.type !== TokenType.STRING) return undefined;
  const previous = tokens[index - 1];
  const fromModule =
    previous?.type === TokenType.АЗ ||
    previous?.type === TokenType.ВОРИД ||
    (previous?.type === TokenType.LEFT_PAREN && tokens[index - 2]?.value === 'require');
  return fromModule ? token.value : undefined;
}

/** Where an imported name is declared in its module. */
function importedDefinition(declaration: Declaration, loadModule: ModuleLoader): Location[] {
  const module = loadModule(declaration.importFrom!);
  if (!module) return [];
  if (declaration.importedName === '*' || declaration.importedName === '=') {
    return [{ uri: module.uri, range: emptyRange() }];
  }
  const target = exportedDeclaration(module.analysis.symbols, declaration.importedName!);
  return target ? [location(module.analysis, module.uri, target)] : [];
}

/** `а.ном`: a member of a class, interface, enum or namespace, or an export of a module. */
function memberDefinition(
  analysis: Analysis,
  uri: string,
  index: number,
  loadModule: ModuleLoader
): Location[] {
  const { tokens } = analysis;
  const name = tokens[index].value;
  const receiver = tokens[index - 2];
  if (!receiver) return [];
  const owner = resolveName(analysis.symbols, receiver.value, receiver.start);
  if (owner?.importedName === '*') {
    const module = loadModule(owner.importFrom!);
    const target = module && exportedDeclaration(module.analysis.symbols, name);
    return module && target ? [location(module.analysis, module.uri, target)] : [];
  }
  const container = owner && memberContainer(analysis, owner, receiver);
  const member = container?.children.find(child => child.name === name);
  if (member) return [location(analysis, uri, member)];
  // Unknown receiver: every member of that name the document declares
  return analysis.symbols.all
    .flatMap(declaration => declaration.children)
    .filter(child => child.name === name)
    .map(child => location(analysis, uri, child));
}

/** The class, interface, enum or namespace whose members `receiver` reads. */
function memberContainer(
  analysis: Analysis,
  owner: Declaration,
  receiver: LocatedToken
): Declaration | undefined {
  if (owner.children.length > 0) return owner;
  // A value whose type is a declared class or interface
  const typeName = nameType(analysis, receiver.value, receiver.start)?.name;
  const declaration = typeName && resolveName(analysis.symbols, typeName, receiver.start);
  return declaration || undefined;
}

function location(analysis: Analysis, uri: string, declaration: Declaration): Location {
  return {
    uri,
    range: analysis.document.rangeFromOffsets(declaration.nameStart, declaration.nameEnd),
  };
}

function emptyRange(): Range {
  return { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } };
}

/**
 * Members of values for completion and hover after a `.`: the members of
 * built-in types (their Tajik aliases first) and of user-defined types.
 */

import { BUILTIN_MAPPINGS, MEMBER_ALIASES } from '../builtin-names';
import { BUILTIN_MEMBERS, type PropertyType, type Type } from '../type-checker';

export type BuiltinKind = keyof typeof BUILTIN_MEMBERS;

/** Static members of built-in global objects, by every name they go by. */
const GLOBAL_OBJECTS: ReadonlyMap<string, object> = new Map<string, object>([
  ['чоп', console],
  ['console', console],
  ['Риёзӣ', Math],
  ['математика', Math],
  ['Math', Math],
  ['объект', Object],
  ['Object', Object],
  ['рӯйхат', Array],
  ['Array', Array],
  ['сатр', String],
  ['сатрМетодҳо', String],
  ['String', String],
  ['Number', Number],
  ['JSON', JSON],
  ['Ваъда', Promise],
  ['ваъда', Promise],
  ['Promise', Promise],
  ['Symbol', Symbol],
  ['Date', Date],
  ['Reflect', Reflect],
]);

const BUILTIN_GENERICS: Readonly<Record<string, BuiltinKind>> = {
  Map: 'Map',
  Set: 'Set',
  Promise: 'Promise',
  Ваъда: 'Promise',
  ваъда: 'Promise',
  RegExp: 'RegExp',
  Array: 'array',
  ReadonlyArray: 'array',
};

const PRIMITIVE_KINDS: Readonly<Record<string, BuiltinKind>> = {
  string: 'string',
  number: 'number',
  boolean: 'boolean',
};

/** What can follow a `.` on a value. */
export interface MemberSet {
  /** User-declared members (interfaces, classes, object literals). */
  own: Map<string, PropertyType>;
  /** Names readable on the built-in prototype or object, in JavaScript spelling. */
  builtin: ReadonlySet<string>;
}

/** Members of a global object such as `чоп` or `Риёзӣ`, if `name` is one. */
export function globalObjectMembers(name: string): MemberSet | undefined {
  const value = GLOBAL_OBJECTS.get(name);
  if (!value) return undefined;
  const names = Object.getOwnPropertyNames(value).filter(
    member => !member.startsWith('_') && member !== 'prototype' && !/^[A-Z][a-z]/.test(member)
  );
  return { own: new Map(), builtin: new Set(names) };
}

/** Members of a value of the given type. */
export function typeMembers(type: Type): MemberSet {
  const own = new Map<string, PropertyType>();
  const kinds = new Set<BuiltinKind>();
  collectMembers(type, own, kinds, 0);
  const builtin = new Set<string>();
  for (const kind of kinds) BUILTIN_MEMBERS[kind].forEach(name => builtin.add(name));
  return { own, builtin };
}

function collectMembers(
  type: Type,
  own: Map<string, PropertyType>,
  kinds: Set<BuiltinKind>,
  depth: number
): void {
  if (depth > 10) return;
  if (type.kind === 'union' || type.kind === 'intersection') {
    // `Т | холӣ` reads as Т after a check; offer the members of every part
    type.types?.forEach(part => collectMembers(part, own, kinds, depth + 1));
    return;
  }
  const builtin = builtinKind(type);
  if (builtin) {
    kinds.add(builtin);
    return;
  }
  type.properties?.forEach((property, name) => {
    if (!own.has(name)) own.set(name, property);
  });
  if (type.baseType) collectMembers(type.baseType, own, kinds, depth + 1);
  if (type.properties || OBJECT_KINDS.has(type.kind)) kinds.add('object');
}

/** Types whose values are plain objects with declared members. */
const OBJECT_KINDS: ReadonlySet<string> = new Set(['class', 'interface', 'object']);

/** The built-in prototype a value of this type has, unless its members are declared. */
function builtinKind(type: Type): BuiltinKind | undefined {
  switch (type.kind) {
    case 'primitive':
      return type.name ? PRIMITIVE_KINDS[type.name] : undefined;
    case 'literal':
      return PRIMITIVE_KINDS[typeof type.value] ?? 'object';
    case 'array':
    case 'tuple':
      return 'array';
    case 'function':
      return 'function';
    case 'generic':
      return type.name ? BUILTIN_GENERICS[type.name] : undefined;
    default:
      return undefined;
  }
}

/** Tajik aliases of built-in member names, with the JavaScript name each stands for. */
export function tajikAliases(
  builtin: ReadonlySet<string>
): Array<[tajik: string, english: string]> {
  const aliases: Array<[string, string]> = [];
  for (const [tajik, english] of BUILTIN_MAPPINGS) {
    if (MEMBER_ALIASES.has(tajik) && builtin.has(english)) aliases.push([tajik, english]);
  }
  return aliases;
}

/** JavaScript names worth offering (no `__proto__`-style internals, no `constructor`). */
export function englishMembers(builtin: ReadonlySet<string>): string[] {
  return [...builtin].filter(name => !name.startsWith('__') && name !== 'constructor').sort();
}

/** The type of a member of a value of type `type`, when the checker knows it. */
export function memberType(type: Type, name: string): Type | undefined {
  const { own } = typeMembers(type);
  return own.get(name)?.type;
}

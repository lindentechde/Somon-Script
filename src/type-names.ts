/**
 * Type names: SomonScript's built-in ones and their TypeScript names, and
 * the names a program declares as types. The type checker reports a type
 * name that is neither (src/type-checker.ts, `TYPE_NOT_FOUND`).
 */
import type { ASTNode, Program } from './ast';
import { BUILTIN_MAPPINGS } from './builtin-names';

/**
 * TypeScript names of SomonScript's built-in type names: primitive types,
 * `Ваъда` and the utility types.
 */
export const TYPE_NAMES: ReadonlyMap<string, string> = new Map([
  ['рақам', 'number'],
  ['сатр', 'string'],
  ['мантиқӣ', 'boolean'],
  ['ҳар', 'any'],
  ['ношинос', 'unknown'],
  ['абадан', 'never'],
  ['беджавоб', 'void'],
  ['холӣ', 'null'],
  ['беқимат', 'undefined'],
  ['объект', 'object'],
  ['калонрақам', 'bigint'],
  ['рамз', 'symbol'],
  ['Ваъда', 'Promise'],
  ['ваъда', 'Promise'],
  ['рӯйхат', 'Array'],
  ['Хато', 'Error'],
  ['функсия', 'Function'],
  ['функция', 'Function'],
  ['қисмӣ', 'Partial'],
  ['ҳатмӣ', 'Required'],
  ['танҳохон', 'Readonly'],
  ['сабт_навъ', 'Record'],
  ['гирифтан_навъ', 'Pick'],
  ['ҳазф', 'Omit'],
  ['хориҷ', 'Exclude'],
  ['истихроҷ', 'Extract'],
  ['беналиӣ', 'NonNullable'],
  ['навъи_бозгашт', 'ReturnType'],
  ['параметрҳо', 'Parameters'],
  ['навъи_намуна', 'InstanceType'],
  ['параметрҳои_конструктор', 'ConstructorParameters'],
  ['навъи_параметри_ин', 'ThisParameterType'],
  ['интизоршуда', 'Awaited'],
]);

/** Declarations whose `name` is a type, or may name one (`навъ`, `синф`, `<Т>`, …). */
const NAMED_DECLARATIONS: ReadonlySet<string> = new Set([
  'InterfaceDeclaration',
  'TypeAlias',
  'ClassDeclaration',
  'EnumDeclaration',
  'NamespaceDeclaration',
  'TypeParameter',
  'FunctionDeclaration',
]);

/** Imports: the name they bind (`ворид { К } аз …`, `ворид * чун Н аз …`, `ворид х = …`). */
const BINDING_FIELDS: Readonly<Record<string, string>> = {
  ImportSpecifier: 'local',
  ImportDefaultSpecifier: 'local',
  ImportNamespaceSpecifier: 'local',
  ImportEqualsDeclaration: 'id',
};

/**
 * Every name a program declares that a type annotation may use, anywhere in
 * it: declarations are found wherever they are, so a type used before or
 * outside the block of its declaration is not mistaken for a missing one.
 */
export function declaredTypeNames(program: Program): Set<string> {
  const names = new Set<string>();
  const visit = (node: ASTNode): void => {
    const field = NAMED_DECLARATIONS.has(node.type) ? 'name' : BINDING_FIELDS[node.type];
    const named = field && (node as unknown as Record<string, { name?: unknown }>)[field];
    if (named && typeof named.name === 'string') names.add(named.name);
    for (const value of Object.values(node)) {
      for (const child of Array.isArray(value) ? value : [value]) {
        if (child && typeof child === 'object' && typeof (child as ASTNode).type === 'string') {
          visit(child as ASTNode);
        }
      }
    }
  };
  visit(program);
  return names;
}

/** SomonScript's type names, and the Tajik names of built-in objects: `рақам`, `рӯйхат`, `Хато`, … */
export const BUILTIN_TYPE_NAMES: ReadonlySet<string> = new Set([
  ...TYPE_NAMES.keys(),
  ...BUILTIN_MAPPINGS.keys(),
]);

/**
 * Whether the type checker should report a type name it cannot resolve. Only
 * names with Cyrillic letters are: names in Latin letters may be any type of
 * JavaScript's, TypeScript's or the browser's libraries, which the checker
 * does not list.
 */
export function isUnknownTypeName(name: string, declared: ReadonlySet<string>): boolean {
  return (
    /[\u0400-\u04FF]/.test(name) &&
    !name.includes('.') &&
    !BUILTIN_TYPE_NAMES.has(name) &&
    !declared.has(name)
  );
}

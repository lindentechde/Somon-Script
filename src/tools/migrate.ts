/*
 * SomonScript migration tool (`somon migrate`)
 * Copyright (c) 2025 LindenTech IT Consulting
 *
 * Licensed under the MIT License. See the LICENSE file for details.
 */

/**
 * Converts TypeScript to SomonScript. The TypeScript parser finds every
 * keyword, type name and built-in; the tool rewrites just those words in the
 * original text, so comments, blank lines and the order of everything stay as
 * they were, and then runs the SomonScript formatter over the result.
 *
 * Built-in members get their Tajik names (`console.log` → `чоп.сабт`,
 * `xs.push` → `xs.илова`) only where the TypeScript checker says the member
 * belongs to a library type and the compiler translates the Tajik name back,
 * so the program compiles to the same JavaScript.
 *
 * What SomonScript cannot express produces a warning, never silently
 * different code: constructs without runtime meaning (overload signatures,
 * `declare`, `override`, type-only imports, …) are left out, others keep their
 * TypeScript spelling, and when the result does not compile the warnings say
 * so. Which constructs are supported is found out by compiling small probes,
 * so the tool follows the compiler as it grows.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import ts from 'typescript';

import { MEMBER_ALIASES, translateMemberName } from '../builtin-names';
import { compile } from '../compiler';
import { KEYWORDS } from '../keyword-map';
import { format } from './format';
import {
  CONSOLE_NAME,
  GLOBAL_OBJECT_GROUPS,
  GLOBAL_TYPE_NAMES,
  GLOBAL_VALUE_NAMES,
  INTERFACE_GROUPS,
  KEYWORD_NAMES,
  OPTIONAL_KEYWORD_NAMES,
  RESERVED_NAMES,
  memberName,
} from './migrate-names';

export interface MigrateOptions {
  /** Name of the TypeScript file, for messages. Defaults to `input.ts`. */
  fileName?: string;
  /** Format the result with the SomonScript formatter (default true). */
  format?: boolean;
  /** Indentation width for the formatter (default 4). */
  indent?: number;
  /**
   * Ask the TypeScript checker which members belong to built-in types, so
   * that `xs.push` becomes `xs.илова` (default true). Without it only members
   * of `console`, `Math`, `Object`, `Array` and `String` are translated.
   */
  typeInfo?: boolean;
}

export interface MigrateWarning {
  /** 1-based position in the TypeScript input. */
  line: number;
  column: number;
  message: string;
}

export interface MigrateResult {
  /** The SomonScript program. */
  code: string;
  warnings: MigrateWarning[];
}

/** Raised for TypeScript input with syntax errors. */
export class MigrateError extends Error {
  /** Every syntax error, with its position. */
  readonly diagnostics: readonly string[];

  constructor(message: string, diagnostics: readonly string[]) {
    super(message);
    this.name = 'MigrateError';
    this.diagnostics = diagnostics;
  }
}

// ---------------------------------------------------------------------------
// Feature probes: which newer constructs this compiler understands

interface Probe {
  source: string;
  /** Texts that must not appear in the output (a keyword was taken as a name). */
  absent?: string[];
}

const FEATURE_PROBES: Readonly<Record<string, Probe>> = {
  declare: { source: 'эълон собит х: рақам;', absent: ['эълон'] },
  declareModule: { source: 'эълон модул "м" { }', absent: ['модул'] },
  declareGlobal: { source: 'эълон глобалӣ { }', absent: ['глобалӣ'] },
  override: {
    source: 'синф А { м() {} }\nсинф Б мерос А { бознавис м() {} }',
    absent: ['бознавис'],
  },
  accessor: { source: 'синф А { дастрасӣ х = 1; }', absent: ['дастрасӣ'] },
  using: { source: '{ истифода х = холӣ; }', absent: ['истифода'] },
  decorators: { source: 'функсия д(...а: ҳар[]): ҳар {}\n@д синф А {}' },
  importType: { source: 'ворид навъ { А } аз "./а";', absent: ['require'] },
  typeSpecifier: { source: 'ворид { навъ А, б } аз "./а";', absent: ['А', 'навъ'] },
  // The output keeps the alias only in a comment: no `exports` may appear
  exportType: { source: 'навъ Т = рақам;\nсодир навъ { Т };', absent: ['exports'] },
  importEquals: { source: 'ворид х = require("м");' },
  importTypeEquals: { source: 'ворид навъ х = require("м");', absent: ['require'] },
  exportEquals: { source: 'содир = 1;' },
  overloads: { source: 'функсия ф(а: сатр): беджавоб;\nфунксия ф(а: ҳар) {}' },
  methodOverloads: { source: 'синф А {\nм(а: сатр): беджавоб;\nм(а: ҳар) {}\n}' },
  optionalMethod: { source: 'синф А { м?() {} }' },
  thisParam: { source: 'функсия ф(ин: ҳар) {}', absent: ['ин'] },
  classIndexSignature: { source: 'синф А { [к: сатр]: ҳар; }' },
  callSignature: { source: 'интерфейс И { (х: рақам): сатр; }' },
  constructSignature: { source: 'интерфейс И { нав (х: рақам): И; }' },
  accessorSignature: { source: 'интерфейс И { get х(): рақам; }' },
  catchType: { source: 'кӯшиш {} гирифтан (е: ношинос) {}' },
  bigintType: { source: 'тағ б: калонрақам = 1n;' },
  variance: { source: 'интерфейс И<дар Т, берун У> {}' },
  dynamicImport: { source: 'ворид("./а");' },
  exportStarAs: { source: 'содир * чун б аз "./а";' },
  computedMember: { source: 'синф А { ["м"]() {} }' },
  stringMember: { source: 'синф А { "м"() {} }' },
  exportDefaultFunction: { source: 'содир пешфарз функсия () {}' },
  exportDefaultClass: { source: 'содир пешфарз синф {}' },
  importMeta: { source: 'тағ м = ворид.meta;' },
  // `о.м<Т>(х)`: older parsers read the type arguments of a method call as `<` and `>`
  memberTypeArguments: { source: 'тағ а = [1].map<рақам>(х => х);', absent: ['<'] },
  // Any type as a type argument: older parsers compared `ф < ҳар > 1`
  typeArguments: { source: 'функсия ф<Т>(х: Т) {}\nф<ҳар>(1);', absent: ['<'] },
};

const featureCache = new Map<string, boolean>();

/**
 * Overrides the result of a feature probe (`undefined` probes again), e.g. to
 * migrate for another compiler version or to test both outcomes.
 */
export function setFeatureSupport(feature: string, supported: boolean | undefined): void {
  if (supported === undefined) featureCache.delete(feature);
  else featureCache.set(feature, supported);
}

/** Whether this SomonScript compiler understands a construct (see `FEATURE_PROBES`). */
export function supports(feature: string): boolean {
  const cached = featureCache.get(feature);
  if (cached !== undefined) return cached;
  const probe = FEATURE_PROBES[feature];
  let supported = false;
  if (probe) {
    const result = compile(probe.source, { typeCheck: false });
    supported =
      result.errors.length === 0 && !(probe.absent ?? []).some(text => result.code.includes(text));
  }
  featureCache.set(feature, supported);
  return supported;
}

// ---------------------------------------------------------------------------
// TypeScript program (for the checker), with the library files parsed once

const COMPILER_OPTIONS: ts.CompilerOptions = {
  target: ts.ScriptTarget.ES2022,
  lib: ['lib.es2023.d.ts'],
  types: [],
  noResolve: true,
  noEmit: true,
  skipLibCheck: true,
  // Every file is a module: its names never merge with the globals of the library
  moduleDetection: ts.ModuleDetectionKind.Force,
};

/** Name of the converted file inside the TypeScript program. */
const PROGRAM_FILE = '/__somon_migrate__/input.ts';

/** `console`, which the ECMAScript library does not declare (the DOM library declares too much). */
const CONSOLE_FILE = '/__somon_migrate__/console.d.ts';
const CONSOLE_DECLARATION = `interface Console {
${[
  'assert(condition?: boolean, ...data: any[]): void;',
  'clear(): void;',
  'count(label?: string): void;',
  'countReset(label?: string): void;',
  'debug(...data: any[]): void;',
  'dir(item?: any, options?: any): void;',
  'dirxml(...data: any[]): void;',
  'error(...data: any[]): void;',
  'group(...data: any[]): void;',
  'groupCollapsed(...data: any[]): void;',
  'groupEnd(): void;',
  'info(...data: any[]): void;',
  'log(...data: any[]): void;',
  'table(tabularData?: any, properties?: string[]): void;',
  'time(label?: string): void;',
  'timeEnd(label?: string): void;',
  'timeLog(label?: string, ...data: any[]): void;',
  'trace(...data: any[]): void;',
  'warn(...data: any[]): void;',
].join('\n')}
}
declare var console: Console;
`;

const libraryFiles = new Map<string, ts.SourceFile>();

function createProgram(source: string): ts.Program {
  const host = ts.createCompilerHost(COMPILER_OPTIONS, true);
  const readLibrary = host.getSourceFile.bind(host);
  host.getSourceFile = (name, languageVersion, onError) => {
    if (name === PROGRAM_FILE) {
      // The options carry `moduleDetection`: the file is a module
      return ts.createSourceFile(name, source, languageVersion, true, ts.ScriptKind.TS);
    }
    let file = libraryFiles.get(name);
    if (!file) {
      file =
        name === CONSOLE_FILE
          ? ts.createSourceFile(name, CONSOLE_DECLARATION, ts.ScriptTarget.Latest, true)
          : readLibrary(name, languageVersion, onError);
      if (file) libraryFiles.set(name, file);
    }
    return file;
  };
  host.fileExists = name =>
    name === PROGRAM_FILE || name === CONSOLE_FILE || ts.sys.fileExists(name);
  host.writeFile = () => undefined;
  return ts.createProgram([PROGRAM_FILE, CONSOLE_FILE], COMPILER_OPTIONS, host);
}

/** Whether a declaration comes from the TypeScript library (or the `console` declaration). */
function isLibraryFile(program: ts.Program, file: ts.SourceFile): boolean {
  return file.fileName === CONSOLE_FILE || program.isSourceFileDefaultLibrary(file);
}

// ---------------------------------------------------------------------------
// Edits on the source text

interface Edit {
  start: number;
  end: number;
  text: string;
}

/**
 * Applies the edits in source order. Insertions come before a replacement at
 * the same position, and an edit inside a range that is replaced as a whole
 * (a removed declaration) is dropped.
 */
function applyEdits(source: string, edits: Edit[]): string {
  const isInsertion = (edit: Edit): number => (edit.start === edit.end ? 0 : 1);
  const sorted = edits
    .map((edit, order) => ({ ...edit, order }))
    .sort(
      (a, b) =>
        a.start - b.start || isInsertion(a) - isInsertion(b) || b.end - a.end || a.order - b.order
    );
  let result = '';
  let position = 0;
  for (const edit of sorted) {
    if (edit.start < position) continue; // inside a range that was already replaced
    result += source.slice(position, edit.start) + edit.text;
    position = edit.end;
  }
  return result + source.slice(position);
}

function hasModifier(node: ts.Node, kind: ts.SyntaxKind): boolean {
  const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
  return modifiers?.some(modifier => modifier.kind === kind) ?? false;
}

function isJSDocNode(node: ts.Node): boolean {
  return node.kind >= ts.SyntaxKind.FirstJSDocNode && node.kind <= ts.SyntaxKind.LastJSDocNode;
}

/** Lexer keywords that are fine as the first token of explicit call type arguments. */
const TYPE_ARGUMENT_STARTS: ReadonlySet<string> = new Set([
  'сатр',
  'рақам',
  'мантиқӣ',
  'холӣ',
  'беқимат',
]);

type Handler = (_converter: Converter, _node: ts.Node) => boolean;

/** Declarations whose name is a member name (`{ а: 1 }`, `м() {}`, `Ранг.Сурх`). */
const MEMBER_DECLARATIONS: ReadonlySet<ts.SyntaxKind> = new Set([
  ts.SyntaxKind.PropertyAssignment,
  ts.SyntaxKind.MethodDeclaration,
  ts.SyntaxKind.PropertyDeclaration,
  ts.SyntaxKind.PropertySignature,
  ts.SyntaxKind.MethodSignature,
  ts.SyntaxKind.GetAccessor,
  ts.SyntaxKind.SetAccessor,
  ts.SyntaxKind.EnumMember,
]);

/** Collects the edits that turn the TypeScript source into SomonScript. */
class Converter {
  readonly edits: Edit[] = [];
  readonly warnings: MigrateWarning[] = [];
  private readonly checker: ts.TypeChecker | undefined;
  private readonly names = new Set<string>();
  private readonly renames = new Map<string, string>();
  private readonly warnedRename = new Set<string>();

  constructor(
    private readonly file: ts.SourceFile,
    private readonly program: ts.Program | undefined
  ) {
    this.checker = program?.getTypeChecker();
    this.collectNames(file);
  }

  run(): void {
    this.visit(this.file);
  }

  // -- helpers ---------------------------------------------------------------

  warn(node: ts.Node, message: string): void {
    const { line, character } = this.file.getLineAndCharacterOfPosition(node.getStart(this.file));
    this.warnings.push({ line: line + 1, column: character + 1, message });
  }

  replace(node: ts.Node, text: string): void {
    this.edits.push({ start: node.getStart(this.file), end: node.getEnd(), text });
  }

  /** Removes a node, or the range from `node` to the start of `until`. */
  remove(node: ts.Node, until?: ts.Node): void {
    const end = until ? until.getStart(this.file) : node.getEnd();
    this.edits.push({ start: node.getStart(this.file), end, text: '' });
  }

  insert(position: number, text: string): void {
    this.edits.push({ start: position, end: position, text });
  }

  child(node: ts.Node, kind: ts.SyntaxKind): ts.Node | undefined {
    return node.getChildren(this.file).find(item => item.kind === kind);
  }

  private collectNames(node: ts.Node): void {
    if (ts.isIdentifier(node)) this.names.add(node.text);
    ts.forEachChild(node, child => this.collectNames(child));
  }

  /** A name for a renamed identifier that the program does not use yet. */
  private renamed(name: string): string {
    let renamed = this.renames.get(name);
    if (renamed) return renamed;
    renamed = `${name}_`;
    while (this.names.has(renamed)) renamed += '_';
    this.names.add(renamed);
    this.renames.set(name, renamed);
    return renamed;
  }

  // -- traversal ---------------------------------------------------------------

  visit(node: ts.Node): void {
    if (isJSDocNode(node)) return;
    const handler = STRUCTURE_HANDLERS.get(node.kind);
    if (handler && handler(this, node)) return;
    if (this.isAmbient(node) && !supports('declare')) {
      this.remove(node);
      this.warn(
        node,
        "an ambient declaration ('declare') has no SomonScript form and was left out"
      );
      return;
    }
    const children = node.getChildren(this.file);
    if (children.length === 0) {
      this.leaf(node);
      return;
    }
    for (const child of children) this.visit(child);
  }

  /** `declare …` statements and class fields: they have no runtime effect. */
  private isAmbient(node: ts.Node): boolean {
    if (!hasModifier(node, ts.SyntaxKind.DeclareKeyword)) return false;
    return ts.isStatement(node) || ts.isPropertyDeclaration(node);
  }

  private leaf(node: ts.Node): void {
    if (node.getWidth(this.file) === 0) return;
    if (ts.isIdentifier(node)) {
      this.identifier(node);
      return;
    }
    const optional = OPTIONAL_KEYWORD_NAMES.get(node.kind);
    if (optional) {
      this.optionalKeyword(node, optional.name, optional.feature);
      return;
    }
    const name = KEYWORD_NAMES.get(node.kind);
    if (name !== undefined) this.keyword(node, name);
  }

  private keyword(node: ts.Node, name: string): void {
    const parent = node.parent;
    if (this.keepsSpelling(node, parent)) return;
    switch (node.kind) {
      case ts.SyntaxKind.VarKeyword:
        this.warn(node, "'var' became 'тағ' (let): check code that relies on function scope");
        break;
      case ts.SyntaxKind.ImportKeyword:
        if (!ts.isImportDeclaration(parent) && !ts.isImportEqualsDeclaration(parent)) {
          return this.importKeyword(node, parent);
        }
        break;
      case ts.SyntaxKind.InKeyword:
        if (
          ts.isTypeParameterDeclaration(parent) &&
          parent.modifiers?.includes(node as ts.Modifier)
        ) {
          return this.optionalKeyword(node, 'дар', 'variance');
        }
        break;
      case ts.SyntaxKind.ModuleKeyword:
        if (ts.isModuleDeclaration(parent) && ts.isStringLiteral(parent.name)) {
          return this.optionalKeyword(node, 'модул', 'declareModule');
        }
        break;
    }
    this.replace(node, name);
  }

  /**
   * Operators that keep their English spelling: `void 0` (`void` the type is
   * `беджавоб`), and `typeof` before a sign, since `навъи` is also a name and
   * `навъи -х` subtracts.
   */
  private keepsSpelling(node: ts.Node, parent: ts.Node): boolean {
    if (node.kind === ts.SyntaxKind.VoidKeyword) return ts.isVoidExpression(parent);
    return (
      node.kind === ts.SyntaxKind.TypeOfKeyword &&
      ts.isTypeOfExpression(parent) &&
      /^[-+]/.test(parent.expression.getText(this.file))
    );
  }

  /** `import(…)` and `import.meta`. */
  private importKeyword(node: ts.Node, parent: ts.Node): void {
    if (ts.isMetaProperty(parent)) {
      if (supports('importMeta')) this.replace(node, 'ворид');
      else this.warn(node, "'import.meta' is not supported by SomonScript");
      return;
    }
    if (ts.isCallExpression(parent) && supports('dynamicImport')) {
      this.replace(node, 'ворид');
      return;
    }
    this.warn(node, `'${parent.getText(this.file).slice(0, 40)}' is not supported by SomonScript`);
  }

  /** Newer keywords: Tajik when supported, otherwise left out or kept with a warning. */
  private optionalKeyword(node: ts.Node, name: string, feature: string): void {
    if (supports(feature)) {
      this.replace(node, name);
      return;
    }
    const word = node.getText(this.file);
    switch (node.kind) {
      case ts.SyntaxKind.BigIntKeyword:
        return; // `bigint` is a valid type name in SomonScript too
      case ts.SyntaxKind.OverrideKeyword:
      case ts.SyntaxKind.OutKeyword:
      case ts.SyntaxKind.InKeyword:
        this.removeWord(node);
        this.warn(node, `'${word}' has no SomonScript form and was left out (no runtime effect)`);
        return;
      case ts.SyntaxKind.AccessorKeyword:
        this.removeWord(node);
        this.warn(node, "'accessor' has no SomonScript form: the auto-accessor became a field");
        return;
      default:
        this.warn(node, `'${word}' is not supported by SomonScript yet and was kept as written`);
    }
  }

  /** Removes a word together with the spaces after it. */
  private removeWord(node: ts.Node): void {
    const text = this.file.text;
    let end = node.getEnd();
    while (end < text.length && (text[end] === ' ' || text[end] === '\t')) end++;
    this.edits.push({ start: node.getStart(this.file), end, text: '' });
  }

  // -- identifiers -------------------------------------------------------------

  private identifier(node: ts.Identifier): void {
    const parent = node.parent;
    if (this.isMemberName(node, parent)) {
      this.memberName(node, parent);
      return;
    }
    if (node.text === 'const' && ts.isTypeReferenceNode(parent)) {
      this.replace(node, 'собит'); // `as const`
      return;
    }
    // `declare global { … }`: TypeScript reads `global` as the module's name. NodeFlags is
    // a bit set, so `&` is meant here (S1529).
    const globalAugmentation = parent.flags & ts.NodeFlags.GlobalAugmentation; // NOSONAR
    if (ts.isModuleDeclaration(parent) && globalAugmentation !== 0) {
      this.optionalKeyword(node, 'глобалӣ', 'declareGlobal');
      return;
    }
    const global = this.globalName(node, parent);
    if (global !== undefined) {
      this.replace(node, global);
      return;
    }
    if (RESERVED_NAMES.has(node.text)) this.rename(node, parent);
  }

  /** Renames a name that SomonScript reserves; imports and exports keep the outside name. */
  private rename(node: ts.Identifier, parent: ts.Node): void {
    const renamed = this.renamed(node.text);
    if (!this.warnedRename.has(node.text)) {
      this.warnedRename.add(node.text);
      this.warn(
        node,
        `'${node.text}' is a SomonScript keyword or built-in; renamed to '${renamed}'`
      );
    }
    if (ts.isImportSpecifier(parent) && !parent.propertyName) {
      this.replace(node, `${node.text} чун ${renamed}`);
    } else if (ts.isExportSpecifier(parent) && !parent.propertyName) {
      this.replace(node, `${renamed} чун ${node.text}`);
    } else {
      this.replace(node, renamed);
    }
  }

  private isMemberName(node: ts.Identifier, parent: ts.Node): boolean {
    if (ts.isPropertyAccessExpression(parent)) return parent.name === node;
    if (ts.isQualifiedName(parent)) return parent.right === node;
    if (ts.isBindingElement(parent)) return parent.propertyName === node;
    // The names other modules see: `ворид { а чун б }` — `а`; `содир { а чун б }` — `б`
    if (ts.isImportSpecifier(parent)) return parent.propertyName === node;
    if (ts.isExportSpecifier(parent)) {
      const reexport = parent.parent.parent.moduleSpecifier !== undefined;
      return reexport || (parent.propertyName !== undefined && parent.name === node);
    }
    return MEMBER_DECLARATIONS.has(parent.kind) && (parent as ts.NamedDeclaration).name === node;
  }

  private memberName(node: ts.Identifier, parent: ts.Node): void {
    if (ts.isPropertyAccessExpression(parent) && parent.name === node) {
      const alias = this.memberAlias(parent);
      if (alias) {
        this.replace(node, alias);
        return;
      }
    }
    if (!MEMBER_ALIASES.has(node.text)) return;
    // `о.дарозӣ` would mean `о.length`: keep the name as a string
    if (ts.isPropertyAccessExpression(parent)) {
      const dot = parent.questionDotToken ?? this.child(parent, ts.SyntaxKind.DotToken);
      if (dot) {
        this.edits.push({
          start: dot.getStart(this.file),
          end: node.getEnd(),
          text: `${parent.questionDotToken ? '?.' : ''}["${node.text}"]`,
        });
        return;
      }
    }
    if (ts.isPropertyAssignment(parent)) {
      this.replace(node, `"${node.text}"`);
      return;
    }
    this.warn(
      node,
      `the member name '${node.text}' is a SomonScript built-in name and compiles to '${translateMemberName(node.text)}'`
    );
  }

  /** The Tajik name of a built-in member, when the compiler translates it back. */
  private memberAlias(access: ts.PropertyAccessExpression): string | undefined {
    const name = access.name.text;
    const receiver = access.expression;
    if (ts.isIdentifier(receiver)) {
      const group = GLOBAL_OBJECT_GROUPS.get(receiver.text);
      if (group && this.isLibrarySymbol(receiver)) return memberName(group, name);
    }
    if (!this.checker) return undefined;
    const declarations = this.checker.getSymbolAtLocation(access.name)?.declarations ?? [];
    const aliases = new Set(declarations.map(declaration => this.libraryMember(declaration, name)));
    return aliases.size === 1 ? [...aliases][0] : undefined;
  }

  private libraryMember(declaration: ts.Declaration, name: string): string | undefined {
    const owner = declaration.parent;
    const fromLibrary = this.program && isLibraryFile(this.program, declaration.getSourceFile());
    if (!fromLibrary || !ts.isInterfaceDeclaration(owner)) return undefined;
    const group = INTERFACE_GROUPS.get(owner.name.text);
    return group ? memberName(group, name) : undefined;
  }

  /** The Tajik name of a global (`Math` → `Риёзӣ`, `Promise<Т>` → `Ваъда<Т>`), if any. */
  private globalName(node: ts.Identifier, parent: ts.Node): string | undefined {
    const text = node.text;
    if (ts.isTypeReferenceNode(parent)) {
      const name = GLOBAL_TYPE_NAMES.get(text);
      return name && this.isLibrarySymbol(node) ? name : undefined;
    }
    if (text === 'console') {
      const receiver = ts.isPropertyAccessExpression(parent) && parent.expression === node;
      return receiver && this.isLibrarySymbol(node) ? CONSOLE_NAME : undefined;
    }
    const name = GLOBAL_VALUE_NAMES.get(text);
    if (!name || this.isTypePosition(parent)) return undefined;
    return this.isLibrarySymbol(node) ? name : undefined;
  }

  private isTypePosition(parent: ts.Node): boolean {
    if (ts.isTypeQueryNode(parent) || ts.isQualifiedName(parent)) return false;
    if (ts.isExpressionWithTypeArguments(parent)) {
      const clause = parent.parent;
      return ts.isHeritageClause(clause) && clause.token === ts.SyntaxKind.ImplementsKeyword;
    }
    return ts.isTypeNode(parent);
  }

  /** Whether a name refers to a global from the TypeScript library (not one the program declares). */
  private isLibrarySymbol(node: ts.Identifier): boolean {
    if (!this.checker || !this.program) return !this.declares(node.text);
    const symbol = this.checker.getSymbolAtLocation(node);
    const declarations = symbol?.declarations ?? [];
    if (!symbol || declarations.length === 0) {
      return node.text === 'undefined' || (!symbol && !this.declares(node.text));
    }
    const program = this.program;
    return declarations.every(declaration => isLibraryFile(program, declaration.getSourceFile()));
  }

  private declaredNames: Set<string> | undefined;

  private declares(name: string): boolean {
    if (!this.declaredNames) {
      const names = new Set<string>();
      const collect = (node: ts.Node): void => {
        const declared = (node as ts.NamedDeclaration).name;
        if (
          ts.isDeclarationStatement(node) ||
          ts.isVariableDeclaration(node) ||
          ts.isParameter(node)
        ) {
          if (declared && ts.isIdentifier(declared)) names.add(declared.text);
        }
        if (ts.isImportSpecifier(node) || ts.isImportClause(node) || ts.isNamespaceImport(node)) {
          if (node.name) names.add(node.name.text);
        }
        ts.forEachChild(node, collect);
      };
      collect(this.file);
      this.declaredNames = names;
    }
    return this.declaredNames.has(name);
  }

  // -- structures --------------------------------------------------------------

  /** `do x++; while (…)`: SomonScript's `кун` needs a block. */
  doStatement(node: ts.DoStatement): boolean {
    if (!ts.isBlock(node.statement)) {
      this.insert(node.statement.getStart(this.file), '{ ');
      this.insert(node.statement.getEnd(), ' }');
    }
    return false;
  }

  /** Overload signatures (declarations without a body) carry types only. */
  signature(node: ts.Node, feature: string, what: string): boolean {
    if (supports(feature)) return false;
    this.remove(node);
    this.warn(node, `${what} has no SomonScript form and was left out (no runtime effect)`);
    return true;
  }

  functionDeclaration(node: ts.FunctionDeclaration): boolean {
    if (node.body || hasModifier(node, ts.SyntaxKind.DeclareKeyword)) {
      return node.body ? this.defaultExportedAnonymous(node, 'exportDefaultFunction') : false;
    }
    return this.signature(node, 'overloads', 'an overload signature');
  }

  /** `export default function () {}` / `export default class {}` without a name. */
  defaultExportedAnonymous(
    node: ts.FunctionDeclaration | ts.ClassDeclaration,
    feature: string
  ): boolean {
    if (node.name || !hasModifier(node, ts.SyntaxKind.DefaultKeyword) || supports(feature))
      return false;
    this.warn(node, 'an anonymous default export is not supported by SomonScript; give it a name');
    return false;
  }

  methodDeclaration(node: ts.MethodDeclaration): boolean {
    if (
      !node.body &&
      !hasModifier(node, ts.SyntaxKind.AbstractKeyword) &&
      ts.isClassLike(node.parent)
    ) {
      return this.signature(node, 'methodOverloads', 'a method overload signature');
    }
    if (node.questionToken && node.body && !supports('optionalMethod')) {
      this.remove(node.questionToken);
      this.warn(
        node,
        "an optional method ('?') is not supported by SomonScript; the '?' was left out"
      );
    }
    this.computedName(node);
    return false;
  }

  /** Members named by an expression or a string, which SomonScript classes do not support. */
  computedName(node: ts.ClassElement): void {
    if (!node.name || !ts.isClassLike(node.parent)) return;
    if (ts.isComputedPropertyName(node.name) && !supports('computedMember')) {
      this.warn(node, 'computed class member names are not supported by SomonScript');
    } else if (ts.isStringLiteral(node.name) && !supports('stringMember')) {
      this.warn(node, 'class members named by a string are not supported by SomonScript');
    }
  }

  /** `get х(): Т` in an interface becomes the property `х: Т`; a setter signature is left out. */
  accessorSignature(node: ts.AccessorDeclaration): boolean {
    if (node.body || supports('accessorSignature')) {
      if (ts.isClassElement(node)) this.computedName(node);
      return false;
    }
    if (ts.isSetAccessorDeclaration(node)) {
      this.remove(node);
      this.warn(node, 'a setter signature has no SomonScript form and was left out');
      return true;
    }
    const keyword = this.child(node, ts.SyntaxKind.GetKeyword);
    const open = this.child(node, ts.SyntaxKind.OpenParenToken);
    const close = this.child(node, ts.SyntaxKind.CloseParenToken);
    if (keyword) this.removeWord(keyword);
    if (open && close) {
      this.edits.push({ start: open.getStart(this.file), end: close.getEnd(), text: '' });
    }
    this.warn(node, 'a getter signature became a property');
    return false;
  }

  /** `f(this: Т, …)`: the `this` parameter only types the receiver. */
  parameter(node: ts.ParameterDeclaration): boolean {
    if (!ts.isIdentifier(node.name) || node.name.text !== 'this') return false;
    if (supports('thisParam')) {
      this.replace(node.name, 'ин');
      return false;
    }
    const parameters = (node.parent as ts.SignatureDeclaration).parameters;
    const next = parameters[parameters.indexOf(node) + 1];
    this.remove(node, next);
    this.warn(node, "the 'this' parameter has no SomonScript form and was left out");
    return true;
  }

  catchClause(node: ts.CatchClause): boolean {
    const declaration = node.variableDeclaration;
    if (declaration?.type && !supports('catchType')) {
      const colon = this.child(declaration, ts.SyntaxKind.ColonToken);
      if (colon)
        this.edits.push({
          start: colon.getStart(this.file),
          end: declaration.type.getEnd(),
          text: '',
        });
    }
    return false;
  }

  importDeclaration(node: ts.ImportDeclaration): boolean {
    const clause = node.importClause;
    if (!clause) return false;
    if (clause.isTypeOnly) {
      if (supports('importType')) return false;
      this.remove(node);
      this.warn(
        node,
        "a type-only import ('import type') has no SomonScript form and was left out"
      );
      return true;
    }
    const named = clause.namedBindings;
    if (!named || !ts.isNamedImports(named) || supports('typeSpecifier')) return false;
    return this.removeTypeSpecifiers(node, named.elements, clause.name === undefined);
  }

  exportDeclaration(node: ts.ExportDeclaration): boolean {
    if (node.isTypeOnly) {
      if (supports('exportType')) return false;
      this.remove(node);
      this.warn(
        node,
        "a type-only export ('export type') has no SomonScript form and was left out"
      );
      return true;
    }
    const clause = node.exportClause;
    if (clause && ts.isNamespaceExport(clause) && !supports('exportStarAs')) {
      this.warn(node, "'export * as' is not supported by SomonScript yet");
    }
    if (!clause || !ts.isNamedExports(clause) || supports('typeSpecifier')) return false;
    return this.removeTypeSpecifiers(node, clause.elements, true);
  }

  /** Leaves out `type` specifiers (`{ type А, б }`), or the whole statement when only they remain. */
  private removeTypeSpecifiers(
    statement: ts.Node,
    elements: ts.NodeArray<ts.ImportSpecifier | ts.ExportSpecifier>,
    nothingElse: boolean
  ): boolean {
    const typeOnly = elements.filter(element => element.isTypeOnly);
    if (typeOnly.length === 0) return false;
    if (typeOnly.length === elements.length && nothingElse) {
      this.remove(statement);
      this.warn(
        statement,
        'type-only imports and exports have no SomonScript form and were left out'
      );
      return true;
    }
    for (const element of typeOnly) {
      const index = elements.indexOf(element);
      const next = elements[index + 1];
      if (next) this.remove(element, next);
      else
        this.edits.push({ start: elements[index - 1].getEnd(), end: element.getEnd(), text: '' });
      this.warn(element, `the type-only name '${element.name.text}' was left out`);
    }
    return false;
  }

  /**
   * `import х = require("м")` → `ворид х = require("м")`; for an older compiler
   * `собит х = require("м")` (CommonJS, like the compiled code).
   */
  importEquals(node: ts.ImportEqualsDeclaration): boolean {
    if (supports(node.isTypeOnly ? 'importTypeEquals' : 'importEquals')) return false;
    if (node.isTypeOnly) {
      this.remove(node);
      this.warn(node, "a type-only 'import =' has no SomonScript form and was left out");
      return true;
    }
    const keyword = this.child(node, ts.SyntaxKind.ImportKeyword);
    if (keyword) this.replace(keyword, 'собит');
    this.warn(node, "'import … = …' became a 'собит' declaration");
    for (const child of node.getChildren(this.file)) {
      if (child !== keyword) this.visit(child);
    }
    return true;
  }

  /** `export = х` → `содир = х`; for an older compiler `module.exports = х`. */
  exportAssignment(node: ts.ExportAssignment): boolean {
    if (!node.isExportEquals || supports('exportEquals')) return false;
    this.edits.push({
      start: node.getStart(this.file),
      end: node.expression.getStart(this.file),
      text: 'module.exports = ',
    });
    this.warn(node, "'export =' became 'module.exports ='");
    this.visit(node.expression);
    return true;
  }

  decorator(node: ts.Decorator): boolean {
    if (!supports('decorators')) this.warn(node, 'decorators are not supported by SomonScript yet');
    return false;
  }

  /** Explicit type arguments of a call that the SomonScript parser could misread as `<` `>`. */
  callExpression(node: ts.CallExpression): boolean {
    const typeArguments = node.typeArguments;
    // A compiler that reads every type argument list needs no rewriting
    if (!typeArguments?.length || supports('typeArguments')) return false;
    const open = this.child(node, ts.SyntaxKind.LessThanToken);
    const close = this.child(node, ts.SyntaxKind.GreaterThanToken);
    if (!open || !close) return false;
    const callee = ts.isIdentifier(node.expression) || supports('memberTypeArguments');
    if (!callee || !this.readableTypeArguments(typeArguments)) {
      this.edits.push({ start: open.getStart(this.file), end: close.getEnd(), text: '' });
      this.warn(
        node,
        'explicit type arguments of this call were left out (SomonScript cannot read them)'
      );
      for (const child of node.getChildren(this.file)) {
        if (child.pos < open.pos || child.pos >= close.end) this.visit(child);
      }
      return true;
    }
    // `ф<А<Б>>(х)`: SomonScript reads `>>` as a shift here
    const text = this.file.text;
    for (let i = open.getStart(this.file); i < close.getEnd() - 1; i++) {
      if (text[i] === '>' && text[i + 1] === '>' && text[i - 1] !== '=') this.insert(i + 1, ' ');
    }
    return false;
  }

  private readableTypeArguments(typeArguments: ts.NodeArray<ts.TypeNode>): boolean {
    const text = typeArguments.map(type => type.getText(this.file)).join(',');
    if (/[{;]/.test(text)) return false;
    let first: ts.Node = typeArguments[0];
    while (
      ts.isArrayTypeNode(first) ||
      ts.isUnionTypeNode(first) ||
      ts.isIntersectionTypeNode(first)
    ) {
      first = ts.isArrayTypeNode(first) ? first.elementType : first.types[0];
    }
    if (ts.isTypeReferenceNode(first)) {
      let name: ts.EntityName = first.typeName;
      while (ts.isQualifiedName(name)) name = name.left;
      const converted = GLOBAL_TYPE_NAMES.get(name.text) ?? name.text;
      return !KEYWORDS.has(converted) || TYPE_ARGUMENT_STARTS.has(converted);
    }
    const kind = ts.isLiteralTypeNode(first) ? first.literal.kind : first.kind;
    const keyword = KEYWORD_NAMES.get(kind);
    return keyword !== undefined && TYPE_ARGUMENT_STARTS.has(keyword);
  }

  warnOnly(node: ts.Node, message: string): boolean {
    this.warn(node, message);
    return false;
  }
}

const STRUCTURE_HANDLERS: ReadonlyMap<ts.SyntaxKind, Handler> = new Map<ts.SyntaxKind, Handler>([
  [ts.SyntaxKind.DoStatement, (c, n) => c.doStatement(n as ts.DoStatement)],
  [ts.SyntaxKind.FunctionDeclaration, (c, n) => c.functionDeclaration(n as ts.FunctionDeclaration)],
  [ts.SyntaxKind.MethodDeclaration, (c, n) => c.methodDeclaration(n as ts.MethodDeclaration)],
  [
    ts.SyntaxKind.Constructor,
    (c, n) =>
      !(n as ts.ConstructorDeclaration).body &&
      c.signature(n, 'methodOverloads', 'a constructor overload signature'),
  ],
  [
    ts.SyntaxKind.ClassDeclaration,
    (c, n) => c.defaultExportedAnonymous(n as ts.ClassDeclaration, 'exportDefaultClass'),
  ],
  [
    ts.SyntaxKind.IndexSignature,
    (c, n) =>
      ts.isClassLike(n.parent) && c.signature(n, 'classIndexSignature', 'a class index signature'),
  ],
  [ts.SyntaxKind.CallSignature, (c, n) => c.signature(n, 'callSignature', 'a call signature')],
  [
    ts.SyntaxKind.ConstructSignature,
    (c, n) => c.signature(n, 'constructSignature', 'a construct signature'),
  ],
  [ts.SyntaxKind.GetAccessor, (c, n) => c.accessorSignature(n as ts.AccessorDeclaration)],
  [ts.SyntaxKind.SetAccessor, (c, n) => c.accessorSignature(n as ts.AccessorDeclaration)],
  [
    ts.SyntaxKind.PropertyDeclaration,
    (c, n) => {
      c.computedName(n as ts.PropertyDeclaration);
      return false;
    },
  ],
  [ts.SyntaxKind.Parameter, (c, n) => c.parameter(n as ts.ParameterDeclaration)],
  [ts.SyntaxKind.CatchClause, (c, n) => c.catchClause(n as ts.CatchClause)],
  [ts.SyntaxKind.ImportDeclaration, (c, n) => c.importDeclaration(n as ts.ImportDeclaration)],
  [ts.SyntaxKind.ExportDeclaration, (c, n) => c.exportDeclaration(n as ts.ExportDeclaration)],
  [
    ts.SyntaxKind.ImportEqualsDeclaration,
    (c, n) => c.importEquals(n as ts.ImportEqualsDeclaration),
  ],
  [ts.SyntaxKind.ExportAssignment, (c, n) => c.exportAssignment(n as ts.ExportAssignment)],
  [ts.SyntaxKind.Decorator, (c, n) => c.decorator(n as ts.Decorator)],
  [ts.SyntaxKind.CallExpression, (c, n) => c.callExpression(n as ts.CallExpression)],
  [
    ts.SyntaxKind.WithStatement,
    (c, n) => c.warnOnly(n, "the 'with' statement is not supported by SomonScript"),
  ],
]);

// ---------------------------------------------------------------------------
// API

/** Converts a TypeScript program to SomonScript. Throws {@link MigrateError} on syntax errors. */
export function migrate(source: string, options: MigrateOptions = {}): MigrateResult {
  const fileName = options.fileName ?? 'input.ts';
  const program = options.typeInfo === false ? undefined : createProgram(source);
  const file =
    program?.getSourceFile(PROGRAM_FILE) ??
    ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const diagnostics = program
    ? program.getSyntacticDiagnostics(file)
    : ((file as unknown as { parseDiagnostics: ts.Diagnostic[] }).parseDiagnostics ?? []);
  if (diagnostics.length > 0) {
    const messages = diagnostics.map(diagnostic => describeDiagnostic(file, diagnostic));
    throw new MigrateError(messages[0], messages);
  }

  const converter = new Converter(file, program);
  converter.run();
  let code = applyEdits(source, converter.edits);
  const warnings = [...converter.warnings].sort((a, b) => a.line - b.line || a.column - b.column);

  const compiled = compile(code, { typeCheck: false });
  if (compiled.errors.length > 0) {
    warnings.push({
      line: 0,
      column: 0,
      message: `the result does not compile yet: ${compiled.errors[0].split('\n')[0]}`,
    });
  } else if (options.format !== false) {
    code = format(code, { indent: options.indent });
  }
  return { code, warnings };
}

function describeDiagnostic(file: ts.SourceFile, diagnostic: ts.Diagnostic): string {
  const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
  if (diagnostic.start === undefined) return message;
  const { line, character } = file.getLineAndCharacterOfPosition(diagnostic.start);
  return `${message} at line ${line + 1}, column ${character + 1}`;
}

/** `file.ts` → `file.som` (also `.mts`, `.cts`). */
export function somFileName(file: string): string {
  return file.replace(/\.[mc]?ts$/i, '') + '.som';
}

/** Whether a path is TypeScript source that `migrate` converts (not a declaration file). */
export function isTypeScriptSource(file: string): boolean {
  return /\.[mc]?ts$/i.test(file) && !/\.d\.[mc]?ts$/i.test(file);
}

/** Converts a TypeScript file; the result is not written. */
export function migrateFile(file: string, options: MigrateOptions = {}): MigrateResult {
  const source = fs.readFileSync(file, 'utf8');
  return migrate(source, { ...options, fileName: options.fileName ?? path.resolve(file) });
}

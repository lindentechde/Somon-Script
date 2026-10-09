/**
 * Declarations of a parsed document and the scopes they are visible in, for
 * go to definition, completion, document symbols and semantic tokens.
 */

import type { ASTNode, Program } from '../ast';
import type { LspMessages } from './messages';
import type { TextDocument } from './text-document';
import {
  braceGroupEnd,
  extentEnd,
  firstTokenFrom,
  tokenIndexAt,
  type LocatedToken,
} from './tokens';

export type DeclarationKind = keyof LspMessages['kinds'];

export interface Declaration {
  name: string;
  kind: DeclarationKind;
  /** Offsets of the name. */
  nameStart: number;
  nameEnd: number;
  /** Offsets of the whole declaration. */
  start: number;
  end: number;
  /** For imports: the module specifier and the imported name (`default`, `*` for a namespace). */
  importFrom?: string;
  importedName?: string;
  /** Declared with `содир` (or inside an exported namespace). */
  exported?: boolean;
  /** `содир пешфарз`. */
  defaultExport?: boolean;
  /** A `статикӣ` class member. */
  static?: boolean;
  /** Members: of classes, interfaces, enums and namespaces. */
  children: Declaration[];
}

export interface Scope {
  start: number;
  end: number;
  declarations: Declaration[];
  children: Scope[];
  parent?: Scope;
}

export interface SymbolIndex {
  /** Top-level declarations with their members, in source order. */
  topLevel: Declaration[];
  /** Every declaration that introduces a name into a scope. */
  all: Declaration[];
  root: Scope;
}

type AnyNode = ASTNode & Record<string, unknown>;

function isNode(value: unknown): value is AnyNode {
  return typeof value === 'object' && value !== null && typeof (value as AnyNode).type === 'string';
}

/** Builds the symbol index of a program. */
export function buildSymbolIndex(
  document: TextDocument,
  tokens: readonly LocatedToken[],
  program: Program
): SymbolIndex {
  return new SymbolCollector(document, tokens).collect(program);
}

class SymbolCollector {
  private readonly all: Declaration[] = [];
  private scope!: Scope;
  /** Members are collected here while a class, interface, enum or namespace is walked. */
  private container: Declaration[] = [];
  private exporting = false;
  private defaultExporting = false;

  private readonly document: TextDocument;
  private readonly tokens: readonly LocatedToken[];

  constructor(document: TextDocument, tokens: readonly LocatedToken[]) {
    this.document = document;
    this.tokens = tokens;
  }

  collect(program: Program): SymbolIndex {
    const root: Scope = {
      start: 0,
      end: this.document.text.length,
      declarations: [],
      children: [],
    };
    this.scope = root;
    const topLevel: Declaration[] = [];
    this.container = topLevel;
    for (const statement of program.body) this.visit(statement as AnyNode);
    return { topLevel, all: this.all, root };
  }

  // ---------------------------------------------------------------------------
  // Positions
  // ---------------------------------------------------------------------------

  private offsetOf(node: ASTNode): number {
    return this.document.offsetFromCompiler(node.line, node.column);
  }

  /** Offsets of a name: its token's source text (`конструктор` for `constructor`). */
  private nameRange(node: ASTNode): [number, number] {
    const start = this.offsetOf(node);
    const index = tokenIndexAt(this.tokens, start);
    if (index !== -1) return [start, this.tokens[index].end];
    const name = String((node as AnyNode).name ?? '');
    return [start, start + name.length];
  }

  /** End of a declaration: its `{ … }` body when it has one, else its statement. */
  private declarationEnd(node: ASTNode, from = node): number {
    const index = this.tokenIndexFrom(this.offsetOf(from));
    if (index === -1) return this.offsetOf(node);
    return braceGroupEnd(this.tokens, index) ?? extentEnd(this.tokens, index);
  }

  /** Index of the first token at or after `offset`, or -1. */
  private tokenIndexFrom(offset: number): number {
    const index = firstTokenFrom(this.tokens, offset);
    return index < this.tokens.length ? index : -1;
  }

  /** End of a `{ … }` block whose `{` is at the node's position. */
  private blockEnd(block: ASTNode): number {
    const index = tokenIndexAt(this.tokens, this.offsetOf(block));
    const token = index === -1 ? undefined : this.tokens[index];
    if (token?.match !== undefined) return this.tokens[token.match].end;
    return index === -1 ? this.offsetOf(block) : extentEnd(this.tokens, index);
  }

  /** End of a statement or expression starting at the node. */
  private nodeEnd(node: ASTNode): number {
    if (node.type === 'BlockStatement') return this.blockEnd(node);
    const index = this.tokenIndexFrom(this.offsetOf(node));
    return index === -1 ? this.offsetOf(node) : extentEnd(this.tokens, index);
  }

  // ---------------------------------------------------------------------------
  // Declarations and scopes
  // ---------------------------------------------------------------------------

  private declare(
    nameNode: ASTNode,
    kind: DeclarationKind,
    extent: [number, number],
    extra: Partial<Declaration> = {}
  ): Declaration {
    const [nameStart, nameEnd] = this.nameRange(nameNode);
    const declaration: Declaration = {
      name: String((nameNode as AnyNode).name),
      kind,
      nameStart,
      nameEnd,
      start: extent[0],
      end: Math.max(extent[1], nameEnd),
      children: [],
      ...(this.exporting && { exported: true }),
      ...(this.defaultExporting && { defaultExport: true }),
      ...extra,
    };
    this.scope.declarations.push(declaration);
    this.all.push(declaration);
    this.container.push(declaration);
    return declaration;
  }

  /** A member: listed in its container, not visible as a name in any scope. */
  private member(
    nameNode: ASTNode,
    kind: DeclarationKind,
    extent: [number, number],
    isStatic = false
  ): void {
    if (nameNode.type !== 'Identifier' && nameNode.type !== 'PrivateIdentifier') return;
    const [nameStart, nameEnd] = this.nameRange(nameNode);
    const name = String((nameNode as AnyNode).name);
    this.container.push({
      name: kind === 'method' && name === 'constructor' ? 'конструктор' : name,
      kind,
      nameStart,
      nameEnd,
      start: extent[0],
      end: Math.max(extent[1], nameEnd),
      children: [],
      ...(isStatic && { static: true }),
    });
  }

  private withScope(start: number, end: number, body: () => void): void {
    const scope: Scope = { start, end, declarations: [], children: [], parent: this.scope };
    this.scope.children.push(scope);
    const saved = this.scope;
    this.scope = scope;
    try {
      body();
    } finally {
      this.scope = saved;
    }
  }

  private withContainer(declaration: Declaration, body: () => void): void {
    const saved = this.container;
    const savedExporting = [this.exporting, this.defaultExporting];
    this.container = declaration.children;
    this.exporting = false;
    this.defaultExporting = false;
    try {
      body();
    } finally {
      this.container = saved;
      [this.exporting, this.defaultExporting] = savedExporting;
    }
  }

  /** Walks statements of a nested body: their declarations are not members of the container. */
  private nested(body: () => void): void {
    this.withContainer({ children: [] } as unknown as Declaration, body);
  }

  // ---------------------------------------------------------------------------
  // Walking
  // ---------------------------------------------------------------------------

  private readonly visitors: Record<string, (_node: AnyNode) => void> = {
    VariableDeclaration: node => this.visitVariable(node),
    VariableDeclarationList: node =>
      (node.declarations as AnyNode[]).forEach(declaration => this.visitVariable(declaration)),
    FunctionDeclaration: node => this.visitFunctionDeclaration(node),
    FunctionSignature: node => {
      if (!this.scope.declarations.some(d => d.name === (node.name as AnyNode).name)) {
        this.declare(node.name as AnyNode, 'function', [this.offsetOf(node), this.nodeEnd(node)]);
      }
    },
    FunctionExpression: node => this.visitFunction(node),
    ArrowFunctionExpression: node => this.visitFunction(node),
    ClassDeclaration: node => this.visitClass(node),
    ClassExpression: node => this.visitClass(node),
    InterfaceDeclaration: node => this.visitInterface(node),
    TypeAlias: node =>
      this.declare(node.name as AnyNode, 'type', [this.offsetOf(node), this.nodeEnd(node)]),
    EnumDeclaration: node => this.visitEnum(node),
    NamespaceDeclaration: node => this.visitNamespace(node),
    ImportDeclaration: node => this.visitImport(node),
    ImportEqualsDeclaration: node =>
      this.declare(node.id as AnyNode, 'import', [this.offsetOf(node), this.nodeEnd(node)], {
        ...(isNode(node.source) && { importFrom: String(node.source.value), importedName: '=' }),
      }),
    ExportDeclaration: node => this.visitExport(node),
    BlockStatement: node =>
      this.withScope(this.offsetOf(node), this.blockEnd(node), () =>
        this.nested(() => this.visitChildren(node))
      ),
    ForStatement: node => this.visitLoop(node),
    ForInStatement: node => this.visitLoop(node),
    ForOfStatement: node => this.visitLoop(node),
    CatchClause: node => this.visitCatch(node),
  };

  private visit(node: AnyNode): void {
    const visitor = this.visitors[node.type];
    if (visitor) visitor(node);
    else this.visitChildren(node);
  }

  private visitChildren(node: AnyNode): void {
    for (const [key, value] of Object.entries(node)) {
      // Type annotations hold no bindings
      if (key === 'typeAnnotation' || key === 'returnType') continue;
      if (Array.isArray(value)) {
        for (const item of value) if (isNode(item)) this.visit(item);
      } else if (isNode(value)) {
        this.visit(value);
      }
    }
  }

  private visitVariable(node: AnyNode): void {
    const kind: DeclarationKind = node.kind === 'СОБИТ' ? 'constant' : 'variable';
    const extent: [number, number] = [this.offsetOf(node), this.nodeEnd(node)];
    this.bindPattern(node.identifier as AnyNode, kind, extent);
    if (isNode(node.init)) this.nested(() => this.visit(node.init as AnyNode));
  }

  /** Declares every name a binding pattern binds. */
  private bindPattern(
    pattern: AnyNode | null,
    kind: DeclarationKind,
    extent: [number, number]
  ): void {
    if (!pattern) return;
    switch (pattern.type) {
      case 'Identifier':
        if (pattern.name) this.declare(pattern, kind, extent);
        break;
      case 'ArrayPattern':
        (pattern.elements as AnyNode[]).forEach(element => this.bindPattern(element, kind, extent));
        break;
      case 'ObjectPattern':
        (pattern.properties as AnyNode[]).forEach(property =>
          this.bindPattern(
            (property.type === 'PropertyPattern' ? property.value : property) as AnyNode,
            kind,
            extent
          )
        );
        break;
      case 'AssignmentPattern':
        this.bindPattern(pattern.left as AnyNode, kind, extent);
        this.nested(() => this.visit(pattern.right as AnyNode));
        break;
      case 'SpreadElement':
      case 'RestElement':
        this.bindPattern(pattern.argument as AnyNode, kind, extent);
        break;
    }
  }

  private visitFunctionDeclaration(node: AnyNode): void {
    const end = this.blockEnd(node.body as AnyNode);
    this.declare(node.name as AnyNode, 'function', [this.offsetOf(node), end]);
    this.visitFunction(node);
  }

  /** Parameters and body of any function, in a scope of their own. */
  private visitFunction(node: AnyNode): void {
    const body = node.body as AnyNode;
    const end = body.type === 'BlockStatement' ? this.blockEnd(body) : this.nodeEnd(body);
    this.withScope(this.offsetOf(node), end, () =>
      this.nested(() => {
        this.declareTypeParameters(node);
        for (const param of (node.params as AnyNode[]) ?? []) {
          const extent: [number, number] = [this.offsetOf(param), this.offsetOf(param)];
          if (isNode(param.pattern)) this.bindPattern(param.pattern, 'parameter', extent);
          else if (isNode(param.name)) this.declare(param.name, 'parameter', extent);
          if (isNode(param.defaultValue)) this.visit(param.defaultValue);
        }
        // The body block shares the parameters' scope
        if (body.type === 'BlockStatement') this.visitChildren(body);
        else this.visit(body);
      })
    );
  }

  private declareTypeParameters(node: AnyNode): void {
    for (const parameter of (node.typeParameters as AnyNode[] | undefined) ?? []) {
      const extent: [number, number] = [this.offsetOf(parameter), this.offsetOf(parameter)];
      if (isNode(parameter.name)) this.declare(parameter.name, 'typeParameter', extent);
    }
  }

  private visitClass(node: AnyNode): void {
    const nameNode = node.name as AnyNode | undefined;
    const end = this.declarationEnd(node, nameNode ?? node);
    const declaration = nameNode
      ? this.declare(nameNode, 'class', [this.offsetOf(node), end])
      : ({ children: [] } as unknown as Declaration);
    this.withScope(this.offsetOf(node), end, () =>
      this.withContainer(declaration, () => {
        this.declareTypeParameters(node);
        for (const member of ((node.body as AnyNode).body as AnyNode[]) ?? []) {
          this.visitClassMember(member);
        }
      })
    );
  }

  private visitClassMember(member: AnyNode): void {
    const extent: [number, number] = [this.offsetOf(member), this.nodeEnd(member)];
    if (member.type === 'MethodDefinition') {
      const value = member.value as AnyNode;
      extent[1] = isNode(value.body) ? this.blockEnd(value.body) : extent[1];
      this.member(member.key as AnyNode, 'method', extent, Boolean(member.static));
      // Parameter properties: `конструктор(хосусӣ х: рақам)`
      for (const param of (value.params as AnyNode[]) ?? []) {
        if (param.accessibility || param.readonly) {
          this.member(param.name as AnyNode, 'property', [
            this.offsetOf(param),
            this.offsetOf(param),
          ]);
        }
      }
      this.nested(() => this.visitFunction(value));
    } else if (member.type === 'PropertyDefinition') {
      this.member(member.key as AnyNode, 'property', extent, Boolean(member.static));
      if (isNode(member.value)) this.nested(() => this.visit(member.value as AnyNode));
    } else {
      this.nested(() => this.visitChildren(member));
    }
  }

  private visitInterface(node: AnyNode): void {
    const end = this.declarationEnd(node, node.name as AnyNode);
    const declaration = this.declare(node.name as AnyNode, 'interface', [this.offsetOf(node), end]);
    this.withContainer(declaration, () => {
      for (const property of ((node.body as AnyNode).properties as AnyNode[]) ?? []) {
        const kind: DeclarationKind = property.method ? 'method' : 'property';
        this.member(property.key as AnyNode, kind, [
          this.offsetOf(property),
          this.nodeEnd(property),
        ]);
      }
    });
  }

  private visitEnum(node: AnyNode): void {
    const end = this.declarationEnd(node, node.name as AnyNode);
    const declaration = this.declare(node.name as AnyNode, 'enum', [this.offsetOf(node), end]);
    this.withContainer(declaration, () => {
      for (const member of (node.members as AnyNode[]) ?? []) {
        const id = member.id as AnyNode;
        this.member(id, 'enumMember', [this.offsetOf(member), this.nameRange(id)[1]]);
      }
    });
  }

  private visitNamespace(node: AnyNode): void {
    const end = this.declarationEnd(node, node.name as AnyNode);
    const declaration = this.declare(node.name as AnyNode, 'namespace', [this.offsetOf(node), end]);
    this.withScope(this.offsetOf(node), end, () =>
      this.withContainer(declaration, () => {
        for (const statement of ((node.body as AnyNode).statements as AnyNode[]) ?? []) {
          // `содир` inside a namespace marks the member itself
          if (statement.exported === true) this.exported(false, () => this.visit(statement));
          else this.visit(statement);
        }
      })
    );
  }

  private visitImport(node: AnyNode): void {
    const from = String((node.source as AnyNode).value);
    const extent: [number, number] = [this.offsetOf(node), this.nodeEnd(node)];
    for (const specifier of (node.specifiers as AnyNode[]) ?? []) {
      let importedName = '*';
      if (specifier.type === 'ImportSpecifier')
        importedName = String((specifier.imported as AnyNode).name);
      else if (specifier.type === 'ImportDefaultSpecifier') importedName = 'default';
      this.declare(specifier.local as AnyNode, 'import', extent, {
        importFrom: from,
        importedName,
      });
    }
  }

  private visitExport(node: AnyNode): void {
    if (!isNode(node.declaration)) {
      this.visitChildren(node);
      return;
    }
    this.exported(Boolean(node.default), () => this.visit(node.declaration as AnyNode));
  }

  /** Walks a declaration that `содир` (or `содир пешфарз`) exports. */
  private exported(isDefault: boolean, body: () => void): void {
    const saved = [this.exporting, this.defaultExporting];
    this.exporting = true;
    this.defaultExporting = isDefault;
    try {
      body();
    } finally {
      [this.exporting, this.defaultExporting] = saved;
    }
  }

  private visitLoop(node: AnyNode): void {
    const body = node.body as AnyNode;
    const end = body.type === 'BlockStatement' ? this.blockEnd(body) : this.nodeEnd(body);
    this.withScope(this.offsetOf(node), end, () => this.nested(() => this.visitChildren(node)));
  }

  /** `гирифтан (х) { … }`: the clause's own position is its end, so the scope starts at `х`. */
  private visitCatch(node: AnyNode): void {
    const body = node.body as AnyNode;
    const param = isNode(node.param) ? node.param : undefined;
    const start = this.offsetOf(param ?? body);
    this.withScope(start, this.blockEnd(body), () =>
      this.nested(() => {
        if (param) this.bindPattern(param, 'variable', [start, start]);
        this.visitChildren(body);
      })
    );
  }
}

/** The innermost scope containing `offset`. */
export function scopeAt(root: Scope, offset: number): Scope {
  let scope = root;
  for (;;) {
    const child = scope.children.find(inner => inner.start <= offset && offset <= inner.end);
    if (!child) return scope;
    scope = child;
  }
}

/**
 * The declaration a name refers to at `offset`: the innermost scope that
 * declares it, preferring the nearest declaration before the offset.
 */
export function resolveName(
  index: SymbolIndex,
  name: string,
  offset: number
): Declaration | undefined {
  for (const scope of scopeChain(index.root, offset)) {
    const candidates = scope.declarations.filter(declaration => declaration.name === name);
    if (candidates.length === 0) continue;
    const before = candidates.filter(declaration => declaration.nameStart <= offset);
    return before.length > 0 ? before[before.length - 1] : candidates[0];
  }
  return undefined;
}

/** The scopes around `offset`, innermost first. */
function scopeChain(root: Scope, offset: number): Scope[] {
  const chain: Scope[] = [];
  for (let scope: Scope | undefined = scopeAt(root, offset); scope; scope = scope.parent) {
    chain.push(scope);
  }
  return chain;
}

/** Every name visible at `offset`, innermost first (shadowed names once). */
export function visibleDeclarations(index: SymbolIndex, offset: number): Declaration[] {
  const seen = new Set<string>();
  const result: Declaration[] = [];
  for (const scope of scopeChain(index.root, offset)) {
    for (const declaration of scope.declarations) {
      if (seen.has(declaration.name)) continue;
      seen.add(declaration.name);
      result.push(declaration);
    }
  }
  return result;
}

/** The top-level declaration a module exports as `name` (`default`: `содир пешфарз`). */
export function exportedDeclaration(index: SymbolIndex, name: string): Declaration | undefined {
  if (name === 'default') return index.topLevel.find(declaration => declaration.defaultExport);
  return (
    index.topLevel.find(declaration => declaration.exported && declaration.name === name) ??
    // `содир { ном };` exports a declaration made without `содир`
    index.topLevel.find(declaration => declaration.name === name)
  );
}

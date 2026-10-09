import {
  Program,
  Statement,
  Expression,
  VariableDeclaration,
  VariableDeclarationList,
  FunctionDeclaration,
  FunctionExpression,
  BlockStatement,
  ReturnStatement,
  IfStatement,
  WhileStatement,
  ForStatement,
  ForInStatement,
  ForOfStatement,
  ExpressionStatement,
  Identifier,
  Literal,
  RegExpLiteral,
  BinaryExpression,
  UnaryExpression,
  UpdateExpression,
  CallExpression,
  ChainExpression,
  ClassExpression,
  ArrowFunctionExpression,
  AssignmentExpression,
  MemberExpression,
  ImportDeclaration,
  ImportSpecifier,
  ImportNamespaceSpecifier,
  ExportDeclaration,
  ArrayExpression,
  ObjectExpression,
  InterfaceDeclaration,
  TypeAlias,
  NamespaceDeclaration,
  Parameter,
  TryStatement,
  ThrowStatement,
  AwaitExpression,
  NewExpression,
  ImportExpression,
  ClassDeclaration,
  MethodDefinition,
  PropertyDefinition,
  StaticBlock,
  SwitchStatement,
  SpreadElement,
  SwitchCase,
  ArrayPattern,
  AssignmentPattern,
  ObjectPattern,
  PropertyPattern,
  TemplateLiteral,
  ConditionalExpression,
  SequenceExpression,
  Property,
  RestElement,
  NonNullExpression,
  DoWhileStatement,
  LabeledStatement,
  BreakStatement,
  ContinueStatement,
  EnumDeclaration,
  YieldExpression,
  MetaProperty,
  PrivateIdentifier,
  TaggedTemplateExpression,
  Decorator,
  ImportEqualsDeclaration,
  ExportAssignment,
  TypeAnnotation,
  TypeNode,
  TypeParameter,
  ASTNode,
} from './types';
import { BUILTIN_MAPPINGS, MEMBER_ALIASES, translateMemberName } from './builtin-names';

/** Options of the code generator. */
export interface CodeGeneratorOptions {
  /**
   * How imports and exports are emitted: CommonJS `require` / `module.exports`
   * (the default) or ES module `import` / `export`.
   */
  module?: 'commonjs' | 'esm';
  /**
   * TypeScript's legacy decorators (`experimentalDecorators`), which may also
   * decorate parameters.
   */
  experimentalDecorators?: boolean;
  /**
   * Allow `интизор` at the top level of CommonJS output too, for hosts that
   * run the code inside an async function (the REPL). ES modules always allow it.
   */
  topLevelAwait?: boolean;
  /**
   * Whether a relative specifier without an extension (`./lib`) names a
   * directory with an `index.som` rather than a file `lib.som`: its import is
   * then emitted as `./lib/index.js`, which Node.js finds for `require` and
   * for ES modules alike. The compiler answers it from the file system when
   * it knows the file it compiles (`filePath`).
   */
  isDirectoryImport?: (_specifier: string) => boolean;
}

/** Precedence levels of non-binary expressions; binary levels live in `operatorPrecedence`. */
export const PREC = {
  SEQUENCE: 1,
  ASSIGNMENT: 2,
  CONDITIONAL: 3,
  /** Relational operators (`<`, `in`, …); TypeScript's `as` and `satisfies` bind like them. */
  RELATIONAL: 11,
  UNARY: 16,
  POSTFIX: 17,
  CALL: 19,
  PRIMARY: 20,
} as const;

/** One generated → original position pair recorded by `generateWithMappings`. */
export interface CodeMapping {
  generated: { line: number; column: number };
  original: { line: number; column: number };
}

/**
 * TypeScript syntax the generated code keeps because no JavaScript runtime
 * runs it yet: the compiler lowers it with `ts.transpileModule`.
 */
export interface LoweringNeeds {
  /** Decorators on classes and class members (`@ном`). */
  decorators: boolean;
  /** Decorators on parameters; TypeScript lowers them only as `experimentalDecorators`. */
  parameterDecorators: boolean;
  /** `accessor` fields (`дастрасӣ`). */
  autoAccessors: boolean;
  /** `using` / `await using` declarations (`истифода`). */
  usingDeclarations: boolean;
}

/**
 * Declarations of one name in one scope that merge, as in TypeScript:
 * namespaces with namespaces, a class, function or enum followed by
 * namespaces, and enums with enums.
 */
interface MergeGroup {
  name: string;
  declarations: Statement[];
  /** Constant values of the members of the group's enums, by member name. */
  enumValues: Map<string, number | string>;
  /** How enum initializers read earlier members of the group (`Ранг.Сурх`). */
  enumMembers: Map<string, string>;
  /** An enum of the group has a first member without an initializer. */
  omittedFirstInitializer?: boolean;
}

const POSITION_MARKER = '\0';

/** Removes position markers (see `generateWithMappings`) from generated text. */
export function stripPositionMarkers(code: string): string {
  return code.includes(POSITION_MARKER) ? code.replace(/\0[^\0]*\0/g, '') : code;
}

/** AST keys that hold types, which are erased from JavaScript. */
const TYPE_KEYS: ReadonlySet<string> = new Set([
  'typeAnnotation',
  'returnType',
  'typeParameters',
  'typeArguments',
  'superTypeArguments',
  'implements',
  'implementsTypeArguments',
]);

type PatternNode =
  | Identifier
  | ArrayPattern
  | ObjectPattern
  | AssignmentPattern
  | SpreadElement
  | RestElement;

/** Words that are not valid JavaScript identifiers (strict mode, CommonJS output). */
const JS_RESERVED_WORDS: ReadonlySet<string> = new Set([
  'await',
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'debugger',
  'default',
  'delete',
  'do',
  'else',
  'enum',
  'export',
  'extends',
  'false',
  'finally',
  'for',
  'function',
  'if',
  'implements',
  'import',
  'in',
  'instanceof',
  'interface',
  'let',
  'new',
  'null',
  'package',
  'private',
  'protected',
  'public',
  'return',
  'static',
  'super',
  'switch',
  'this',
  'throw',
  'true',
  'try',
  'typeof',
  'var',
  'void',
  'while',
  'with',
  'yield',
]);

/** Reserved words that are themselves complete JavaScript expressions. */
const JS_KEYWORD_EXPRESSIONS: ReadonlySet<string> = new Set([
  'null',
  'true',
  'false',
  'this',
  'super',
]);

/**
 * Expressions that only assert a type (`х чун Т`, `<Т>х`, `х бармесоё Т`, `х!`)
 * or fix type arguments (`ф<Т>`).
 */
const ASSERTION_TYPES: ReadonlySet<string> = new Set([
  'AsExpression',
  'TypeAssertion',
  'SatisfiesExpression',
  'NonNullExpression',
  'InstantiationExpression',
]);

/** Declarations without a runtime value: exporting one as default exports no value. */
const TYPE_ONLY_DECLARATIONS: ReadonlySet<string> = new Set([
  'InterfaceDeclaration',
  'TypeAlias',
  'FunctionSignature',
]);

/** Spellings of the default export's name: `содир { х чун пешфарз }`. */
const DEFAULT_NAMES: ReadonlySet<string> = new Set(['default', 'пешфарз']);

/** `code` without the line breaks at its end (a loop, not a backtracking `/\n+$/`). */
function withoutTrailingNewlines(code: string): string {
  let end = code.length;
  while (end > 0 && code[end - 1] === '\n') end--;
  return code.slice(0, end);
}

/** Types are erased: an assertion is emitted as the expression it wraps. */
function skipAssertions(node: Expression): Expression {
  let current = node;
  while (current && ASSERTION_TYPES.has(current.type)) {
    current = (current as NonNullExpression).expression;
  }
  return current;
}

const NODE_PRECEDENCE: Readonly<Record<string, number>> = {
  SequenceExpression: PREC.SEQUENCE,
  AssignmentExpression: PREC.ASSIGNMENT,
  ArrowFunctionExpression: PREC.ASSIGNMENT,
  ConditionalExpression: PREC.CONDITIONAL,
  UnaryExpression: PREC.UNARY,
  AwaitExpression: PREC.UNARY,
  CallExpression: PREC.CALL,
  MemberExpression: PREC.CALL,
  TaggedTemplateExpression: PREC.CALL,
  NewExpression: PREC.CALL,
  ImportExpression: PREC.CALL,
  YieldExpression: PREC.ASSIGNMENT,
};

/** Statements `давом` may continue: the loops. */
const LOOP_TYPES: ReadonlySet<string> = new Set([
  'WhileStatement',
  'DoWhileStatement',
  'ForStatement',
  'ForInStatement',
  'ForOfStatement',
]);

export class CodeGenerator {
  protected indentLevel: number = 0;
  private readonly indentSize: number = 2;
  private importCounter: number = 0;
  protected readonly errors: string[] = [];
  /** Names declared by the program, innermost scope last (see `withScope`). */
  private readonly scopes: Set<string>[] = [];
  /** Enclosing loops and `интихоб` statements of the current function, for `шикастан`/`давом`. */
  private jumpTargets = { loops: 0, switches: 0 };
  /** Whether statements are prefixed with position markers (`generateWithMappings`). */
  protected trackPositions = false;
  /** Module format of imports and exports. */
  protected readonly module: 'commonjs' | 'esm';
  /** Function bodies around the current node; 0 at the top level of the module. */
  private functionDepth = 0;
  /**
   * ES module output: names the program references as values (imports used
   * only as types are dropped, since they have no runtime export) and the
   * top-level names declared only as types (`интерфейс`, `навъ`).
   */
  private valueNames?: ReadonlySet<string>;
  private typeOnlyNames?: ReadonlySet<string>;
  /** ES module output: local names exported so far (an ES module exports a name once). */
  private esmExportedNames = new Set<string>();
  /** Labels around the current statement in the current function, innermost last. */
  private labels: Array<{ name: string; isLoop: boolean }> = [];
  /** Whether the current function is `ҳамзамон` (allows `барои интизор`). */
  private inAsyncFunction = false;
  /** While generating an enum member initializer: how to read each earlier member. */
  private enumMembers?: ReadonlyMap<string, string>;
  /** Enclosing non-arrow functions and class bodies, where `нав.target` is allowed. */
  private newTargetScopes = 0;
  /** Private names (`#ном`, without '#') declared by each enclosing class, innermost last. */
  private readonly privateNames: Set<string>[] = [];
  /** Inside a class `статикӣ { … }` block (and not in a function within it). */
  private inStaticBlock = false;
  /** What `ts.transpileModule` must lower in the generated code (see `getLoweringNeeds`). */
  private lowering: LoweringNeeds = CodeGenerator.noLowering();
  /** Declarations that merge with others of their name (namespaces, enums). */
  private readonly mergeGroups = new WeakMap<Statement, MergeGroup>();
  /**
   * In a block of a merged namespace: names the namespace's other blocks
   * export, read as `Н.ном` (`depth`: the block's scope in `scopes`).
   */
  private namespaceMembers?: { namespace: string; names: Set<string>; depth: number };

  /** Legacy decorators (TypeScript `experimentalDecorators`), which may decorate parameters. */
  private readonly experimentalDecorators: boolean;
  /** See `CodeGeneratorOptions.topLevelAwait`. */
  private readonly topLevelAwait: boolean;
  private readonly isDirectoryImport: ((_specifier: string) => boolean) | undefined;

  constructor(options: CodeGeneratorOptions = {}) {
    this.experimentalDecorators = Boolean(options.experimentalDecorators);
    this.topLevelAwait = Boolean(options.topLevelAwait);
    this.module = options.module ?? 'commonjs';
    this.isDirectoryImport = options.isDirectoryImport;
  }

  private static noLowering(): LoweringNeeds {
    return {
      decorators: false,
      parameterDecorators: false,
      autoAccessors: false,
      usingDeclarations: false,
    };
  }

  /** TypeScript syntax in the code generated last, which the compiler lowers. */
  getLoweringNeeds(): LoweringNeeds {
    return { ...this.lowering };
  }

  /**
   * Return diagnostics collected during generation. Codegen follows the same
   * never-throw contract as the rest of the pipeline — unknown AST nodes are
   * recorded here rather than thrown.
   */
  getErrors(): string[] {
    return [...this.errors];
  }

  // Operator precedence table (higher number = higher precedence = evaluated first)
  // Based on JavaScript operator precedence: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Operator_precedence
  private readonly operatorPrecedence: Map<string, number> = new Map([
    // Comma (lowest precedence)
    [',', 1],

    // Assignment operators
    ['=', 2],
    ['+=', 2],
    ['-=', 2],
    ['*=', 2],
    ['/=', 2],
    ['%=', 2],
    ['**=', 2],
    ['<<=', 2],
    ['>>=', 2],
    ['>>>=', 2],
    ['&=', 2],
    ['^=', 2],
    ['|=', 2],
    ['&&=', 2],
    ['||=', 2],
    ['??=', 2],

    // Conditional (ternary)
    ['?', 3],

    // Nullish coalescing
    ['??', 4],

    // Logical OR
    ['||', 5],

    // Logical AND
    ['&&', 6],

    // Bitwise OR
    ['|', 7],

    // Bitwise XOR
    ['^', 8],

    // Bitwise AND
    ['&', 9],

    // Equality operators
    ['==', 10],
    ['!=', 10],
    ['===', 10],
    ['!==', 10],

    // Relational operators
    ['<', 11],
    ['<=', 11],
    ['>', 11],
    ['>=', 11],
    ['in', 11],
    ['instanceof', 11],

    // Bitwise shift
    ['<<', 12],
    ['>>', 12],
    ['>>>', 12],

    // Additive
    ['+', 13],
    ['-', 13],

    // Multiplicative
    ['*', 14],
    ['/', 14],
    ['%', 14],

    // Exponentiation (right-associative, highest precedence for binary operators)
    ['**', 15],
  ]);

  generate(ast: Program): string {
    return this.generateProgram(ast);
  }

  /**
   * Generate code and record, for every emitted statement, where it starts in
   * the output and in the SomonScript source (`line` 1-based, `column`
   * 0-based, as in source maps).
   */
  generateWithMappings(ast: Program): { code: string; mappings: CodeMapping[] } {
    this.trackPositions = true;
    try {
      return CodeGenerator.extractPositionMarkers(this.generateProgram(ast));
    } finally {
      this.trackPositions = false;
    }
  }

  /**
   * Position markers (`\0line,column\0`) are placed in front of statements
   * while generating, since statement text is still re-indented and spliced
   * afterwards. NUL never occurs otherwise: literals escape it.
   */
  private static extractPositionMarkers(marked: string): {
    code: string;
    mappings: CodeMapping[];
  } {
    const parts = marked.split(POSITION_MARKER);
    const mappings: CodeMapping[] = [];
    let code = '';
    let line = 1;
    let column = 0;
    parts.forEach((part, index) => {
      if (index % 2 === 1) {
        const [originalLine, originalColumn] = part.split(',').map(Number);
        mappings.push({
          generated: { line, column },
          original: { line: originalLine, column: originalColumn },
        });
        return;
      }
      code += part;
      const lastNewline = part.lastIndexOf('\n');
      if (lastNewline === -1) {
        column += part.length;
      } else {
        line += part.split('\n').length - 1;
        column = part.length - lastNewline - 1;
      }
    });
    return { code, mappings };
  }

  private generateProgram(node: Program): string {
    this.lowering = CodeGenerator.noLowering();
    this.esmExportedNames = new Set();
    if (this.module === 'esm' && this.elidesTypes()) {
      this.valueNames = CodeGenerator.collectValueNames(node);
      this.typeOnlyNames = this.collectTypeOnlyNames(node.body ?? []);
    }
    this.checkRedeclarations(node.body ?? []);
    this.checkDefaultExports(node.body ?? []);
    const statements = this.withScope(this.declaredNames(node.body ?? []), () =>
      node.body.map(stmt => this.generateStatement(stmt)).filter(stmt => stmt.length > 0)
    );
    // A module is strict mode code; in CommonJS (as in TypeScript's output) only by the directive
    if (
      this.module === 'commonjs' &&
      statements.length > 0 &&
      CodeGenerator.isModule(node.body ?? [])
    ) {
      statements.unshift('"use strict";');
    }
    // `#!/usr/bin/env node` stays the first line
    if (node.shebang !== undefined) statements.unshift(node.shebang);

    return statements.join('\n');
  }

  /**
   * Whether a program is a module: it imports or exports (also `ворид х =
   * require(…)` and `содир = …`), as TypeScript decides it.
   */
  private static isModule(body: Statement[]): boolean {
    return body.some(
      stmt =>
        stmt.type === 'ImportDeclaration' ||
        stmt.type === 'ExportDeclaration' ||
        stmt.type === 'ExportAssignment' ||
        (stmt.type === 'ImportEqualsDeclaration' &&
          (stmt as ImportEqualsDeclaration).source !== undefined)
    );
  }

  /**
   * Whether ES module output drops what exists only as types: type-only
   * imports and exports (`ворид навъ`, `содир навъ`) and imports used only as
   * types. True for JavaScript, where they would name exports that do not
   * exist at run time; TypeScript output keeps them all.
   */
  protected elidesTypes(): boolean {
    return true;
  }

  /**
   * Names an AST references outside of types: every identifier except those
   * under type keys (annotations, type arguments, `татбиқ`), in interfaces and
   * type aliases, and the names after `.` / object keys. Over-approximates
   * (declared names count too), which only keeps an import that is unused.
   */
  private static collectValueNames(root: ASTNode): Set<string> {
    const names = new Set<string>();
    const visit = (value: unknown, key?: string): void => {
      if (Array.isArray(value)) {
        value.forEach(item => visit(item));
        return;
      }
      if (!value || typeof value !== 'object') return;
      const node = value as ASTNode & Record<string, unknown>;
      if (CodeGenerator.isTypeOnlyNode(node)) return;
      if (node.type === 'Identifier' && key !== 'skip') names.add(String(node.name));
      for (const [childKey, child] of Object.entries(node)) {
        if (TYPE_KEYS.has(childKey) || childKey === 'exported') continue;
        // `о.ном`, `{ ном: … }`: the name is a member name, not a reference
        const isMemberName =
          (childKey === 'property' || childKey === 'key') && node.computed !== true;
        visit(child, isMemberName ? 'skip' : childKey);
      }
    };
    visit(root);
    return names;
  }

  /**
   * Nodes without runtime code, whose names are no value references:
   * interfaces, type aliases, imports, `эълон …` declarations, overload
   * signatures, `эълон модул` and type-only exports (`содир навъ`).
   */
  private static isTypeOnlyNode(node: ASTNode & Record<string, unknown>): boolean {
    switch (node.type) {
      case 'InterfaceDeclaration':
      case 'TypeAlias':
      case 'ImportDeclaration':
      case 'FunctionSignature':
      case 'AmbientModuleDeclaration':
        return true;
      case 'ImportEqualsDeclaration':
        return node.importKind === 'type';
      case 'ExportDeclaration':
      case 'ExportSpecifier':
        return node.exportKind === 'type';
      default:
        return node.declare === true;
    }
  }

  /**
   * Top-level names that are only types: `интерфейс И`, `навъ Т` without a
   * value `И`/`Т`, and type-only imports (`ворид навъ { Т }`, `{ навъ Т }`).
   */
  private collectTypeOnlyNames(statements: Statement[]): Set<string> {
    const types = new Set<string>();
    const values: string[] = [];
    for (const stmt of statements) {
      const declaration =
        stmt.type === 'ExportDeclaration' ? (stmt as ExportDeclaration).declaration : stmt;
      if (declaration?.type === 'InterfaceDeclaration' || declaration?.type === 'TypeAlias') {
        types.add((declaration as InterfaceDeclaration | TypeAlias).name.name);
      } else if (declaration?.type === 'ImportDeclaration') {
        const imports = declaration as ImportDeclaration;
        for (const spec of imports.specifiers) {
          const typeOnly =
            imports.importKind === 'type' || (spec as ImportSpecifier).importKind === 'type';
          if (typeOnly) types.add(spec.local.name);
          else values.push(spec.local.name);
        }
      } else if (
        declaration?.type === 'ImportEqualsDeclaration' &&
        (declaration as ImportEqualsDeclaration).importKind === 'type'
      ) {
        types.add((declaration as ImportEqualsDeclaration).id.name);
      } else {
        this.collectDeclaredNames(declaration, values);
      }
    }
    return new Set([...types].filter(name => !values.includes(name)));
  }

  protected generateStatement(node: Statement): string {
    const code = this.generateStatementNode(node);
    if (!this.trackPositions || code.length === 0 || node.type === 'BlockStatement') {
      return code;
    }
    if (typeof node.line !== 'number' || typeof node.column !== 'number') {
      return code;
    }
    const marker = this.positionMarker(node);
    return code.replace(/^ */, indentation => indentation + marker);
  }

  // eslint-disable-next-line complexity
  protected generateStatementNode(node: Statement): string {
    // `эълон …` declares what exists elsewhere: nothing to emit
    if ((node as { declare?: boolean }).declare) return '';
    switch (node.type) {
      case 'FunctionSignature':
      case 'AmbientModuleDeclaration':
        // Overload signatures and `эълон модул` / `эълон глобалӣ` are types only
        return '';
      case 'ImportEqualsDeclaration':
        return this.generateImportEquals(node as ImportEqualsDeclaration);
      case 'ExportAssignment':
        return this.generateExportAssignment(node as ExportAssignment);
      case 'ImportDeclaration':
        return this.generateImportDeclaration(node as ImportDeclaration);
      case 'ExportDeclaration':
        return this.generateExportDeclaration(node as ExportDeclaration);
      case 'VariableDeclaration':
        return this.generateVariableDeclaration(node as VariableDeclaration);
      case 'VariableDeclarationList':
        return this.generateVariableDeclarationList(node as VariableDeclarationList);
      case 'FunctionDeclaration':
        return this.generateFunctionDeclaration(node as FunctionDeclaration);
      case 'BlockStatement':
        // A bare block opens on its own line, at the statement's indentation
        return this.indent(this.generateBlockStatement(node as BlockStatement));
      case 'ReturnStatement':
        return this.generateReturnStatement(node as ReturnStatement);
      case 'IfStatement':
        return this.generateIfStatement(node as IfStatement);
      case 'WhileStatement':
        return this.withJumpTarget('loops', () =>
          this.generateWhileStatement(node as WhileStatement)
        );
      case 'DoWhileStatement':
        return this.withJumpTarget('loops', () =>
          this.generateDoWhileStatement(node as DoWhileStatement)
        );
      case 'LabeledStatement':
        return this.generateLabeledStatement(node as LabeledStatement);
      case 'EmptyStatement':
        // Nothing to run; a body that is only `;` becomes `{}`
        return '';
      case 'DebuggerStatement':
        return this.indent('debugger;');
      case 'EnumDeclaration':
        return this.generateEnumDeclaration(node as EnumDeclaration);
      // A loop head binding one name twice (`барои (собит [а, а] аз …)`) is an early error
      case 'ForStatement':
        if ((node as ForStatement).init) {
          this.checkRedeclarations([(node as ForStatement).init as Statement]);
        }
        return this.withScope(this.declaredNames([(node as ForStatement).init as Statement]), () =>
          this.withJumpTarget('loops', () => this.generateForStatement(node as ForStatement))
        );
      case 'ForInStatement':
        this.checkRedeclarations([(node as ForInStatement).left]);
        return this.withScope(this.declaredNames([(node as ForInStatement).left]), () =>
          this.withJumpTarget('loops', () => this.generateForInStatement(node as ForInStatement))
        );
      case 'ForOfStatement':
        if (
          (node as ForOfStatement).await &&
          !this.inAsyncFunction &&
          !this.allowsTopLevelAwait()
        ) {
          this.errors.push(
            `Illegal for await statement at line ${node.line}, column ${node.column}: 'барои интизор' must be inside a 'ҳамзамон' function`
          );
        }
        this.checkRedeclarations([(node as ForOfStatement).left]);
        return this.withScope(this.declaredNames([(node as ForOfStatement).left]), () =>
          this.withJumpTarget('loops', () => this.generateForOfStatement(node as ForOfStatement))
        );
      case 'ExpressionStatement':
        return this.generateExpressionStatement(node as ExpressionStatement);
      case 'TryStatement':
        return this.generateTryStatement(node as TryStatement);
      case 'ThrowStatement':
        return this.generateThrowStatement(node as ThrowStatement);
      case 'InterfaceDeclaration':
        return this.generateInterfaceDeclaration(node as InterfaceDeclaration);
      case 'TypeAlias':
        return this.generateTypeAlias(node as TypeAlias);
      case 'NamespaceDeclaration':
        return this.generateNamespaceDeclaration(node as NamespaceDeclaration);
      case 'ClassDeclaration':
        return this.generateClassDeclaration(node as ClassDeclaration);
      case 'SwitchStatement': {
        // All `ҳолат` arms share one scope
        const consequents = (node as SwitchStatement).cases.flatMap(c => c.consequent);
        this.checkRedeclarations(consequents);
        return this.withScope(this.declaredNames(consequents), () =>
          this.withJumpTarget('switches', () =>
            this.generateSwitchStatement(node as SwitchStatement)
          )
        );
      }
      case 'BreakStatement':
        if ((node as BreakStatement).label) {
          return this.generateLabeledJump(node as BreakStatement, 'break');
        }
        if (this.jumpTargets.loops + this.jumpTargets.switches === 0) {
          this.errors.push(
            `Illegal break statement at line ${node.line}, column ${node.column}: 'шикастан' must be inside a loop or 'интихоб'`
          );
        }
        return this.indent('break;');
      case 'ContinueStatement':
        if ((node as ContinueStatement).label) {
          return this.generateLabeledJump(node as ContinueStatement, 'continue');
        }
        if (this.jumpTargets.loops === 0) {
          this.errors.push(
            `Illegal continue statement at line ${node.line}, column ${node.column}: 'давом' must be inside a loop`
          );
        }
        return this.indent('continue;');
      default: {
        const unknown = node as { type?: string };
        this.errors.push(`Unknown statement type: ${unknown.type ?? 'unknown'}`);
        return '';
      }
    }
  }

  /**
   * ES modules allow `интизор` (and `барои интизор`) at their top level,
   * outside functions; CommonJS output only with the `topLevelAwait` option.
   */
  private allowsTopLevelAwait(): boolean {
    return this.functionDepth === 0 && (this.module === 'esm' || this.topLevelAwait);
  }

  private generateVariableDeclaration(node: VariableDeclaration): string {
    const kind = this.declarationKeyword(node);
    return this.indent(`${kind} ${this.generateDeclarator(node)};`);
  }

  /** `тағ а = 1, б = 2;` → `let а = 1, б = 2;` */
  private generateVariableDeclarationList(node: VariableDeclarationList): string {
    const kind = this.declarationKeyword(node);
    const declarators = node.declarations.map(declaration => this.generateDeclarator(declaration));
    return this.indent(`${kind} ${declarators.join(', ')};`);
  }

  /**
   * `let`, `const`, or `using` / `await using` for `истифода` / `интизор истифода`
   * (lowered by TypeScript, since Node.js does not run them yet).
   */
  private declarationKeyword(node: VariableDeclaration | VariableDeclarationList): string {
    if (node.using) {
      this.lowering.usingDeclarations = true;
      // Allowed in a `ҳамзамон` function and at the top level of an ES module
      if (node.using === 'async' && !this.inAsyncFunction && !this.allowsTopLevelAwait()) {
        this.errors.push(
          `'интизор истифода' is only allowed inside a 'ҳамзамон' function at line ${node.line}, column ${node.column}`
        );
      }
      return node.using === 'async' ? 'await using' : 'using';
    }
    return node.kind === 'СОБИТ' ? 'const' : 'let';
  }

  /** The binding and initializer of one declaration: `а = 1`, `[б, в] = р`. */
  private generateDeclarator(node: VariableDeclaration): string {
    const pattern = this.generatePattern(node.identifier);
    const type = `${node.definite ? this.definiteMark() : ''}${this.typeAnnotationText(node.typeAnnotation)}`;
    const init = node.init ? ` = ${this.generateExpression(node.init, PREC.ASSIGNMENT)}` : '';
    return `${pattern}${type}${init}`;
  }

  // ---------------------------------------------------------------------------
  // Type hooks: types are erased from JavaScript; the TypeScript emitter
  // (src/ts-emitter.ts) overrides these to keep them.
  // ---------------------------------------------------------------------------

  /** `: Т` after a binding, parameter or property; '' in JavaScript. */
  protected typeAnnotationText(_annotation: TypeAnnotation | undefined): string {
    return '';
  }

  /** `: Т` after a parameter list; '' in JavaScript. */
  protected returnTypeText(_annotation: TypeAnnotation | undefined): string {
    return '';
  }

  /** `<Т мерос У = В>` after a function, class or method name; '' in JavaScript. */
  protected typeParametersText(_params: TypeParameter[] | undefined): string {
    return '';
  }

  /** `<рақам>` after a callee, constructor or superclass; '' in JavaScript. */
  protected typeArgumentsText(_args: TypeNode[] | undefined): string {
    return '';
  }

  /** The definite assignment assertion `!` of `тағ х!: рақам`; '' in JavaScript. */
  protected definiteMark(): string {
    return '';
  }

  /** The `?` of an optional parameter or property; '' in JavaScript. */
  protected optionalMark(_optional: boolean | undefined): string {
    return '';
  }

  /** `хосусӣ танҳохонӣ ` of a constructor parameter property; '' in JavaScript. */
  protected parameterModifiers(_param: Parameter): string {
    return '';
  }

  /** `мавҳум ` before `class`; '' in JavaScript. */
  protected classModifiers(_node: ClassDeclaration | ClassExpression): string {
    return '';
  }

  /** ` implements И<Т>, Ҷ` after the heritage; '' in JavaScript. */
  protected implementsClause(_node: ClassDeclaration | ClassExpression): string {
    return '';
  }

  /** Modifiers before a class member's name: `static ` in JavaScript. */
  protected memberModifiers(member: MethodDefinition | PropertyDefinition): string {
    return member.static ? 'static ' : '';
  }

  /** Members a class gets besides its own, at the start of its body: none in JavaScript. */
  protected extraClassMembers(_node: ClassDeclaration | ClassExpression): string[] {
    return [];
  }

  /**
   * A method without a body: abstract, an overload signature or a member of
   * an `эълон синф`. Nothing in JavaScript.
   */
  protected generateMethodSignature(_node: MethodDefinition): string {
    return '';
  }

  /** A field that only declares a type: an index signature, `эълон` or `мавҳум`. */
  protected generateFieldSignature(_node: PropertyDefinition): string {
    return '';
  }

  /** The `this` parameter of a function, `this: Т` (`ин: Т`); '' in JavaScript. */
  protected thisParameterText(_thisType: TypeAnnotation | undefined): string {
    return '';
  }

  /**
   * Hook for position tracking: `code` generated for `node`. The TypeScript
   * emitter prefixes a position marker; JavaScript keeps statement markers only.
   */
  protected markPosition(_node: ASTNode | undefined, code: string): string {
    return code;
  }

  /**
   * A type assertion (`х чун Т`, `<Т>х`, `х бармесоё Т`, `х!`). Types are
   * erased, so JavaScript emits the expression it wraps.
   */
  protected generateAssertion(node: Expression, minPrec: number): string {
    return this.generateExpression((node as NonNullExpression).expression, minPrec);
  }

  /** Position marker text for `node` (see `generateWithMappings`). */
  protected positionMarker(node: ASTNode): string {
    return `${POSITION_MARKER}${node.line},${Math.max(node.column - 1, 0)}${POSITION_MARKER}`;
  }

  private generateFunctionDeclaration(node: FunctionDeclaration): string {
    const async = node.async ? 'async ' : '';
    const star = node.generator ? '*' : '';
    const name = this.generateIdentifier(node.name, true);
    const typeParameters = this.typeParametersText(node.typeParameters);
    const { params, body } = this.withNewTarget(() =>
      this.generateFunctionParts(node.params, node.body, node.async, node.thisType)
    );
    const returnType = this.returnTypeText(node.returnType);

    return this.indent(
      `${async}function${star} ${name}${typeParameters}(${params})${returnType} ${body}`
    );
  }

  /**
   * Parameter list shared by every function form: `а = 1`, `...а` and
   * destructuring patterns. Legacy ASTs may still use bare Identifiers.
   */
  protected generateParams(params: Parameter[] | undefined): string {
    return (params ?? [])
      .map(param => {
        if ((param as { type: string }).type === 'Identifier') {
          return this.generateIdentifier(param as unknown as Identifier, true);
        }
        const target = param.pattern
          ? this.generatePattern(param.pattern)
          : this.generateIdentifier(param.name, true);
        const type = `${this.optionalMark(param.optional)}${this.typeAnnotationText(param.typeAnnotation)}`;
        const defaultValue = param.defaultValue
          ? ` = ${this.generateExpression(param.defaultValue, PREC.ASSIGNMENT)}`
          : '';
        // `@ворид() х` (experimentalDecorators): lowered by TypeScript
        if (param.decorators?.length) this.checkParameterDecorators(param);
        const decorators = this.generateDecorators(param.decorators);
        const modifiers = this.parameterModifiers(param);
        return `${decorators}${modifiers}${param.rest ? '...' : ''}${target}${type}${defaultValue}`;
      })
      .join(', ');
  }

  /**
   * Parameter list and body of a function, with the parameters in scope; a
   * `this` parameter (`thisType`) comes first.
   */
  private generateFunctionParts(
    params: Parameter[] | undefined,
    body: BlockStatement,
    isAsync = false,
    thisType?: TypeAnnotation
  ): { params: string; body: string } {
    const paramNames = this.paramNames(params);
    return this.withScope(paramNames, () => ({
      params: this.withThisParameter(thisType, this.generateParams(params)),
      body: this.withFunctionBoundary(
        () => this.generateBlockStatement(body, [], paramNames),
        Boolean(isAsync)
      ),
    }));
  }

  /** `this: Т, а, б`: the parameters after the `this` parameter, if any. */
  protected withThisParameter(thisType: TypeAnnotation | undefined, params: string): string {
    const thisParameter = this.thisParameterText(thisType);
    if (!thisParameter) return params;
    return params ? `${thisParameter}, ${params}` : thisParameter;
  }

  /**
   * A block as it follows a header on the same line (`if (…) `, `try `, a
   * function signature): it starts with `{` itself, its statements one level
   * deeper than the current indentation and the closing `}` at it.
   *
   * `scopeNames` are bound in the block's scope (a catch parameter); a function
   * body passes its `paramNames` instead, which it may redeclare as functions.
   */
  private generateBlockStatement(
    node: BlockStatement,
    scopeNames: string[] = [],
    paramNames?: string[]
  ): string {
    if (node.body.length === 0) {
      return '{}';
    }

    if (paramNames) {
      this.checkRedeclarations(node.body, paramNames, true);
    } else {
      this.checkRedeclarations(node.body, scopeNames);
    }

    this.indentLevel++;
    const statements = this.withScope([...scopeNames, ...this.declaredNames(node.body)], () =>
      node.body.map(stmt => this.generateStatement(stmt)).filter(stmt => stmt.length > 0)
    );
    this.indentLevel--;

    // A block of empty statements (`{ ; }`) is empty
    if (statements.length === 0) return '{}';
    return `{\n${statements.join('\n')}\n${this.getIndent()}}`;
  }

  private generateReturnStatement(node: ReturnStatement): string {
    if (this.inStaticBlock) {
      this.errors.push(
        `Illegal return statement at line ${node.line}, column ${node.column}: 'бозгашт' cannot be used in a static block`
      );
    }
    const argument = node.argument ? ` ${this.generateExpression(node.argument)}` : '';
    return this.indent(`return${argument};`);
  }

  /**
   * The body of an `if` branch or a loop, emitted after its header: a block
   * as is, a single statement braced and indented one level deeper.
   */
  private generateBody(node: Statement): string {
    if (node.type === 'BlockStatement') {
      return this.generateBlockStatement(node as BlockStatement);
    }
    this.indentLevel++;
    const statement = this.generateStatement(node);
    this.indentLevel--;
    return statement.length > 0 ? `{\n${statement}\n${this.getIndent()}}` : '{}';
  }

  private generateIfStatement(node: IfStatement): string {
    const test = this.generateExpression(node.test);
    let result = this.indent(`if (${test}) `) + this.generateBody(node.consequent);

    if (node.alternate) {
      result += ' else ';
      if (node.alternate.type === 'IfStatement') {
        // `else if` continues this line: drop the nested statement's indentation
        // (but keep its position marker, which follows the indentation)
        result += this.generateStatement(node.alternate).slice(this.getIndent().length);
      } else {
        result += this.generateBody(node.alternate);
      }
    }

    return result;
  }

  private generateWhileStatement(node: WhileStatement): string {
    const test = this.generateExpression(node.test);
    return this.indent(`while (${test}) `) + this.generateBody(node.body);
  }

  private generateDoWhileStatement(node: DoWhileStatement): string {
    const body = this.generateBody(node.body);
    const test = this.generateExpression(node.test);
    return this.indent('do ') + `${body} while (${test});`;
  }

  /**
   * `берун: барои (…) { … }`. As in JavaScript, a label may not repeat one
   * that encloses it, and only labels of loops can be continued.
   */
  private generateLabeledStatement(node: LabeledStatement): string {
    const name = node.label.name;
    if (this.labels.some(label => label.name === name)) {
      this.errors.push(
        `Label '${name}' has already been declared at line ${node.line}, column ${node.column}`
      );
    }
    if (JS_RESERVED_WORDS.has(name)) {
      this.errors.push(
        `'${name}' is a reserved word in JavaScript and cannot be used as a label at line ${node.line}, column ${node.column}`
      );
    }
    let target = node.body;
    while (target?.type === 'LabeledStatement') target = (target as LabeledStatement).body;
    this.labels.push({ name, isLoop: LOOP_TYPES.has(target?.type) });
    try {
      // The body continues the label's line: drop its indentation (but keep
      // its position marker, which follows the indentation)
      const body = this.generateStatement(node.body).slice(this.getIndent().length);
      return this.indent(`${name}: ${body || ';'}`);
    } finally {
      this.labels.pop();
    }
  }

  /** `шикастан берун;` / `давом берун;` */
  private generateLabeledJump(
    node: BreakStatement | ContinueStatement,
    keyword: 'break' | 'continue'
  ): string {
    const name = node.label!.name;
    const label = this.labels.find(candidate => candidate.name === name);
    if (!label) {
      this.errors.push(`Undefined label '${name}' at line ${node.line}, column ${node.column}`);
    } else if (keyword === 'continue' && !label.isLoop) {
      this.errors.push(
        `Illegal continue statement at line ${node.line}, column ${node.column}: '${name}' does not label a loop`
      );
    }
    return this.indent(`${keyword} ${name};`);
  }

  private generateForStatement(node: ForStatement): string {
    const init = node.init ? this.generateStatement(node.init).trim().replace(/;$/, '') : '';
    const test = node.test ? this.generateExpression(node.test) : '';
    const update = node.update ? this.generateExpression(node.update) : '';
    return this.indent(`for (${init}; ${test}; ${update}) `) + this.generateBody(node.body);
  }

  /** The left side of a for-in/of head: a declaration, or a target `х`, `о.а`, `[а, б]`. */
  private generateForInOfLeft(left: VariableDeclaration | Expression): string {
    if (left.type === 'VariableDeclaration') {
      return this.generateStatement(left).trim().replace(/;$/, '');
    }
    return this.generateExpression(left, PREC.CALL);
  }

  private generateForInStatement(node: ForInStatement): string {
    const left = this.generateForInOfLeft(node.left);
    const right = this.generateExpression(node.right);
    return this.indent(`for (${left} in ${right}) `) + this.generateBody(node.body);
  }

  private generateForOfStatement(node: ForOfStatement): string {
    const left = this.generateForInOfLeft(node.left);
    const right = this.generateExpression(node.right, PREC.ASSIGNMENT);
    const head = node.await ? 'for await' : 'for';
    return this.indent(`${head} (${left} of ${right}) `) + this.generateBody(node.body);
  }

  private generateExpressionStatement(node: ExpressionStatement): string {
    let expr = this.generateExpression(node.expression);
    // A statement starting with these tokens would parse as a block or a declaration
    if (/^(?:\{|function\b|async\s+function\b|class\b|let\s*\[)/.test(stripPositionMarkers(expr))) {
      expr = `(${expr})`;
    }
    return this.indent(`${expr};`);
  }

  // eslint-disable-next-line complexity
  /**
   * Generate an expression, wrapping it in parentheses when it binds more
   * loosely than its context requires. `minPrec` is the lowest precedence
   * (see `getPrecedence`) the context accepts without parentheses.
   */
  protected generateExpression(expression: Expression, minPrec: number = 0): string {
    // Handle null or undefined node
    if (!expression) {
      return '';
    }

    // Type assertions are erased in JavaScript; what they wrap is
    // parenthesized by its own precedence
    if (ASSERTION_TYPES.has(expression.type)) {
      return this.generateAssertion(expression, minPrec);
    }
    const code = this.generateExpressionNode(expression);
    const wrapped = this.getPrecedence(expression, code) < minPrec ? `(${code})` : code;
    return this.markPosition(expression, wrapped);
  }

  /**
   * JavaScript precedence of an expression node: 1 sequence, 2 assignment and
   * arrow, 3 conditional, 4-15 binary operators (`operatorPrecedence`), 16
   * prefix unary/await, 17 postfix update, 19 call/member/new, 20 primary.
   */
  private getPrecedence(node: Expression, code: string): number {
    switch (node.type) {
      case 'BinaryExpression':
        return this.operatorPrecedence.get((node as BinaryExpression).operator) ?? 0;
      case 'UpdateExpression':
        return (node as UpdateExpression).prefix ? PREC.UNARY : PREC.POSTFIX;
      case 'Literal':
        // A negative number is emitted with a leading minus, like a unary expression
        return code.startsWith('-') ? PREC.UNARY : PREC.PRIMARY;
      default:
        return NODE_PRECEDENCE[node.type] ?? PREC.PRIMARY;
    }
  }

  // eslint-disable-next-line complexity
  private generateExpressionNode(node: Expression): string {
    // Use a more direct delegation approach
    const simpleExpressions = [
      'Identifier',
      'Literal',
      'RegExpLiteral',
      'TemplateLiteral',
      'ThisExpression',
      'Super',
      'MetaProperty',
      'PrivateIdentifier',
    ];
    if (simpleExpressions.includes(node.type)) {
      return this.generateSimpleExpression(node);
    }

    const operatorExpressions = [
      'BinaryExpression',
      'UnaryExpression',
      'UpdateExpression',
      'ConditionalExpression',
      'SequenceExpression',
    ];
    if (operatorExpressions.includes(node.type)) {
      return this.generateOperatorExpression(node);
    }

    const callExpressions = [
      'CallExpression',
      'AssignmentExpression',
      'MemberExpression',
      'ChainExpression',
      'TaggedTemplateExpression',
    ];
    if (callExpressions.includes(node.type)) {
      return this.generateCallAssignmentExpression(node);
    }

    const structuralExpressions = ['ArrayExpression', 'ObjectExpression', 'SpreadElement'];
    if (structuralExpressions.includes(node.type)) {
      return this.generateStructuralExpression(node);
    }

    const specialExpressions = [
      'AwaitExpression',
      'NewExpression',
      'ImportExpression',
      'ArrowFunctionExpression',
      'FunctionExpression',
      'YieldExpression',
      'ClassExpression',
    ];
    if (specialExpressions.includes(node.type)) {
      return this.generateSpecialExpression(node);
    }

    return this.handleUnknownExpression(node);
  }

  private generateSimpleExpression(node: Expression): string {
    switch (node.type) {
      case 'Identifier':
        return this.generateIdentifier(node as Identifier);
      case 'Literal':
        return this.generateLiteral(node as Literal);
      case 'RegExpLiteral':
        // Pattern and flags as written; the lexer has validated them
        return `/${(node as RegExpLiteral).pattern}/${(node as RegExpLiteral).flags}`;
      case 'TemplateLiteral':
        return this.generateTemplateLiteral(node as TemplateLiteral);
      case 'ThisExpression':
        return 'this';
      case 'Super':
        return 'super';
      case 'MetaProperty':
        return this.generateNewTarget(node as MetaProperty);
      case 'PrivateIdentifier':
        return this.generatePrivateIdentifier(node as PrivateIdentifier);
      default:
        return this.handleUnknownExpression(node);
    }
  }

  private generateNewTarget(node: MetaProperty): string {
    if (node.meta?.name === 'import') {
      // `ворид.meta` exists only in ES modules
      if (this.module !== 'esm') {
        this.errors.push(
          `'ворид.meta' (import.meta) is only allowed in ES modules at line ${node.line}, column ${node.column}: compile with module 'esm'`
        );
      }
      return 'import.meta';
    }
    if (this.newTargetScopes === 0) {
      this.errors.push(
        `new.target expression is not allowed here at line ${node.line}, column ${node.column}: 'нав.target' must be inside a function or class`
      );
    }
    return 'new.target';
  }

  /** `#ном`: it must be declared by an enclosing class, an early error in JavaScript. */
  private generatePrivateIdentifier(node: PrivateIdentifier): string {
    if (!this.privateNames.some(names => names.has(node.name))) {
      this.errors.push(
        `Private field '#${node.name}' must be declared in an enclosing class at line ${node.line}, column ${node.column}`
      );
    }
    return `#${node.name}`;
  }

  /** Run `generate` inside a function or class body, where `нав.target` is allowed. */
  private withNewTarget<T>(generate: () => T): T {
    this.newTargetScopes++;
    try {
      return generate();
    } finally {
      this.newTargetScopes--;
    }
  }

  private generateOperatorExpression(node: Expression): string {
    switch (node.type) {
      case 'BinaryExpression':
        return this.generateBinaryExpression(node as BinaryExpression);
      case 'UnaryExpression':
        return this.generateUnaryExpression(node as UnaryExpression);
      case 'UpdateExpression':
        return this.generateUpdateExpression(node as UpdateExpression);
      case 'ConditionalExpression':
        return this.generateConditionalExpression(node as ConditionalExpression);
      case 'SequenceExpression':
        return this.generateArguments((node as SequenceExpression).expressions);
      default:
        return this.handleUnknownExpression(node);
    }
  }

  private generateCallAssignmentExpression(node: Expression): string {
    switch (node.type) {
      case 'CallExpression':
        return this.generateCallExpression(node as CallExpression);
      case 'AssignmentExpression':
        return this.generateAssignmentExpression(node as AssignmentExpression);
      case 'MemberExpression':
        return this.generateMemberExpression(node as MemberExpression);
      case 'ChainExpression':
        // The parentheses end the optional chain: `(о?.а).б`, `(о?.ф)()`
        return `(${this.generateExpression((node as ChainExpression).expression)})`;
      case 'TaggedTemplateExpression':
        return this.generateTaggedTemplate(node as TaggedTemplateExpression);
      default:
        return this.handleUnknownExpression(node);
    }
  }

  private generateStructuralExpression(node: Expression): string {
    switch (node.type) {
      case 'ArrayExpression':
        return this.generateArrayExpression(node as ArrayExpression);
      case 'ObjectExpression':
        return this.generateObjectExpression(node as ObjectExpression);
      case 'SpreadElement':
        return this.generateSpreadElement(node as SpreadElement);
      default:
        return this.handleUnknownExpression(node);
    }
  }

  private generateSpecialExpression(node: Expression): string {
    switch (node.type) {
      case 'AwaitExpression':
        return this.generateAwaitExpression(node as AwaitExpression);
      case 'NewExpression':
        return this.generateNewExpression(node as NewExpression);
      case 'ImportExpression':
        return this.generateImportExpression(node as ImportExpression);
      case 'ArrowFunctionExpression':
        return this.generateArrowFunctionExpression(node as ArrowFunctionExpression);
      case 'FunctionExpression':
        return this.generateFunctionExpression(node as FunctionExpression);
      case 'YieldExpression':
        return this.generateYieldExpression(node as YieldExpression);
      case 'ClassExpression':
        return this.generateClassExpression(node as ClassExpression);
      default:
        return this.handleUnknownExpression(node);
    }
  }

  /** `функсия (…) { … }`; its own name, if any, is in scope in its body only. */
  private generateFunctionExpression(node: FunctionExpression): string {
    return this.withScope(node.name ? [node.name.name] : [], () => {
      const async = node.async ? 'async ' : '';
      const name = node.name ? ` ${this.generateIdentifier(node.name, true)}` : '';
      // `function* (…)`, `function* ном(…)`
      const head = node.generator ? `function*${name || ' '}` : `function${name}`;
      const typeParameters = this.typeParametersText(node.typeParameters);
      const { params, body } = this.withNewTarget(() =>
        this.generateFunctionParts(node.params, node.body, node.async, node.thisType)
      );
      const returnType = this.returnTypeText(node.returnType);
      return `${async}${head}${typeParameters}(${params})${returnType} ${body}`;
    });
  }

  private generateYieldExpression(node: YieldExpression): string {
    const keyword = node.delegate ? 'yield*' : 'yield';
    if (!node.argument) return keyword;
    return `${keyword} ${this.generateExpression(node.argument, PREC.ASSIGNMENT)}`;
  }

  private generateArrowFunctionExpression(node: ArrowFunctionExpression): string {
    const async = node.isAsync ? 'async ' : '';
    const typeParameters = this.typeParametersText(node.typeParameters);
    const returnType = this.returnTypeText(node.returnType);

    if (node.body.type === 'BlockStatement') {
      // Block body
      const { params, body } = this.generateFunctionParts(
        node.params,
        node.body as BlockStatement,
        node.isAsync
      );
      return `${async}${typeParameters}(${params})${returnType} => ${body}`;
    }

    return this.withScope(this.paramNames(node.params), () => {
      const params = this.generateParams(node.params);
      // Expression body; a leading `{` would be parsed as a block
      this.functionDepth++;
      let body: string;
      try {
        body = this.generateExpression(node.body as Expression, PREC.ASSIGNMENT);
      } finally {
        this.functionDepth--;
      }
      if (stripPositionMarkers(body).startsWith('{')) {
        body = `(${body})`;
      }
      return `${async}${typeParameters}(${params})${returnType} => ${body}`;
    });
  }

  private generateImportExpression(node: ImportExpression): string {
    // Dynamic import: ворид(specifier) -> import(specifier)
    // Handle .som extension conversion for dynamic imports (string specifiers only)
    const source = this.convertSourcePath(this.generateExpression(node.source, PREC.ASSIGNMENT));

    return `import(${source})`;
  }

  private handleUnknownExpression(node: Expression): string {
    const unknown = node as { type?: string };
    this.errors.push(`Unknown expression type: ${unknown.type ?? 'unknown'}`);
    return '';
  }

  private generateImportDeclaration(node: ImportDeclaration): string {
    // Module resolution: convert .som extensions to .js
    const source = this.convertSourcePath(this.generateLiteral(node.source));
    if (this.module === 'esm') {
      return this.generateEsmImport(node, this.markPosition(node.source, source));
    }
    // `ворид навъ { … }` and `{ навъ Т }` import types only: no `require` for them
    if (node.importKind === 'type') return '';
    const specifiers = node.specifiers.filter(
      spec => (spec as ImportSpecifier).importKind !== 'type'
    );
    if (specifiers.length === 0 && node.specifiers.length > 0) return '';
    // `ворид "./м";` only runs the module
    if (specifiers.length === 0) {
      return this.indent(`require(${source});`);
    }

    const results: string[] = [];
    const tmpVar = `__somon_import_${this.importCounter++}`;
    results.push(this.indent(`const ${tmpVar} = require(${source});`));

    // Handle default imports
    const defaultImports = specifiers.filter(s => s.type === 'ImportDefaultSpecifier');
    if (defaultImports.length > 0) {
      const localName = this.generateIdentifier(defaultImports[0].local, true);
      results.push(this.indent(`const ${localName} = ${tmpVar}.default ?? ${tmpVar};`));
    }

    const namespaceImport = specifiers.find(s => s.type === 'ImportNamespaceSpecifier') as
      | ImportNamespaceSpecifier
      | undefined;
    if (namespaceImport) {
      results.push(
        this.indent(`const ${this.generateIdentifier(namespaceImport.local, true)} = ${tmpVar};`)
      );
    }

    // Handle named imports
    const namedImports = specifiers.filter(s => s.type === 'ImportSpecifier') as ImportSpecifier[];
    if (namedImports.length > 0) {
      const destructuring = namedImports
        .map(spec => {
          // Exported names are member names: `содир функсия илова` exports `push`
          const imported = translateMemberName(spec.imported.name);
          const local = this.generateIdentifier(spec.local, true);
          return imported === local ? imported : `${imported}: ${local}`;
        })
        .join(', ');
      results.push(this.indent(`const { ${destructuring} } = ${tmpVar};`));
    }

    return results.join('\n');
  }

  /**
   * `ворид х = require("./м");` → `const х = require("./м.js");`, in an ES
   * module `import х from "./м.js";` (a CommonJS module's `module.exports` is
   * its default export); `ворид х = Н.а;` → `const х = Н.а;`.
   */
  protected generateImportEquals(node: ImportEqualsDeclaration): string {
    if (node.importKind === 'type') return '';
    const name = this.generateIdentifier(node.id, true);
    if (!node.source) {
      return this.indent(
        `const ${name} = ${this.generateExpression(node.reference!, PREC.ASSIGNMENT)};`
      );
    }
    const source = this.convertSourcePath(this.generateLiteral(node.source));
    if (this.module === 'esm') {
      return this.indent(`import ${name} from ${this.markPosition(node.source, source)};`);
    }
    return this.indent(`const ${name} = require(${source});`);
  }

  /** `содир = х;` → `module.exports = х;`, in an ES module `export default х;`. */
  protected generateExportAssignment(node: ExportAssignment): string {
    const value = this.generateExpression(node.expression, PREC.ASSIGNMENT);
    return this.indent(
      this.module === 'esm' ? `export default ${value};` : `module.exports = ${value};`
    );
  }

  /**
   * `import а, { б as в } from "./м.js";`, `import * as Н from …`. JavaScript
   * leaves out type-only imports (`ворид навъ`, `{ навъ Т }`) and bindings used
   * only as types (see `valueNames`); the module of the latter still runs, as
   * an `import "./м.js";`. TypeScript keeps them, as `import type`.
   */
  private generateEsmImport(node: ImportDeclaration, source: string): string {
    const keepsTypes = !this.elidesTypes();
    if (node.importKind === 'type' && !keepsTypes) return '';
    const values = node.specifiers.filter(spec => (spec as ImportSpecifier).importKind !== 'type');
    if (!keepsTypes && values.length === 0 && node.specifiers.length > 0) return '';
    const specifiers = keepsTypes
      ? node.specifiers
      : values.filter(spec => !this.valueNames || this.valueNames.has(spec.local.name));
    const clauses: string[] = [];
    const named: string[] = [];
    for (const spec of specifiers) {
      const local = this.generateIdentifier(spec.local, true);
      if (spec.type === 'ImportDefaultSpecifier') {
        clauses.unshift(local);
      } else if (spec.type === 'ImportNamespaceSpecifier') {
        clauses.push(`* as ${local}`);
      } else {
        // Exported names are member names: `содир функсия илова` exports `push`
        const imported = translateMemberName((spec as ImportSpecifier).imported.name);
        const typeOnly = (spec as ImportSpecifier).importKind === 'type' ? 'type ' : '';
        named.push(
          `${typeOnly}${imported === stripPositionMarkers(local) ? local : `${imported} as ${local}`}`
        );
      }
    }
    if (named.length > 0) clauses.push(`{ ${named.join(', ')} }`);
    if (clauses.length === 0) return this.indent(`import ${source};`);
    const typeOnly = node.importKind === 'type' ? 'type ' : '';
    return this.indent(`import ${typeOnly}${clauses.join(', ')} from ${source};`);
  }

  private generateExportDeclaration(node: ExportDeclaration): string {
    if (this.module === 'esm') {
      return this.generateEsmExport(node);
    }
    // `содир навъ { Т };`, `содир навъ * аз …`: types only
    if (node.exportKind === 'type') return '';
    if (node.declaration) {
      return this.generateExportWithDeclaration(node);
    }

    const specifiers = node.specifiers?.filter(spec => spec.exportKind !== 'type');
    if (node.specifiers && node.specifiers.length > 0) {
      if (specifiers!.length === 0) return '';
      return this.generateExportWithSpecifiers({ ...node, specifiers });
    }

    if (node.source) {
      return this.generateWildcardExport(node);
    }

    return '';
  }

  private generateExportWithDeclaration(node: ExportDeclaration): string {
    const declaration = node.declaration!;

    // `содир пешфарз <expression>;`
    if (node.default && declaration.type === 'ExpressionStatement') {
      const value = this.generateExpression(
        (declaration as ExpressionStatement).expression,
        PREC.ASSIGNMENT
      );
      return this.indent(`module.exports.default = ${value};`);
    }

    const code = this.generateStatement(declaration);
    const exportNames = this.extractExportNames(declaration);

    // Type-only declarations don't generate runtime exports
    if (exportNames.length === 0) {
      return code;
    }

    const commonjsExports = node.default
      ? [`module.exports.default = ${exportNames[0]};`]
      : exportNames.map(name => `module.exports.${translateMemberName(name)} = ${name};`);

    return [withoutTrailingNewlines(code), ...commonjsExports.map(line => this.indent(line))].join(
      '\n'
    );
  }

  protected extractExportNames(declaration: Statement): string[] {
    // Interfaces, type aliases and `эълон …` declarations don't generate runtime code
    if (
      declaration.type === 'InterfaceDeclaration' ||
      declaration.type === 'TypeAlias' ||
      (declaration as { declare?: boolean }).declare
    ) {
      return [];
    }
    const names: string[] = [];
    this.collectDeclaredNames(declaration, names);
    return names;
  }

  private generateExportWithSpecifiers(node: ExportDeclaration): string {
    if (node.source) {
      return this.generateReExportWithSpecifiers(node);
    }
    return this.generateDirectExportSpecifiers(node);
  }

  private generateReExportWithSpecifiers(node: ExportDeclaration): string {
    const source = this.convertSourcePath(this.generateLiteral(node.source!));
    const tmpVar = `__somon_reexport_${this.importCounter++}`;
    const results: string[] = [];

    results.push(this.indent(`const ${tmpVar} = require(${source});`));

    for (const spec of node.specifiers!) {
      const exported = translateMemberName(spec.exported.name);
      const local = translateMemberName(spec.local.name);
      results.push(this.indent(`module.exports.${exported} = ${tmpVar}.${local};`));
    }

    return results.join('\n');
  }

  private generateDirectExportSpecifiers(node: ExportDeclaration): string {
    return node
      .specifiers!.map(spec => {
        const exported = translateMemberName(spec.exported.name);
        const local = this.generateIdentifier(spec.local);
        return this.indent(`module.exports.${exported} = ${local};`);
      })
      .join('\n');
  }

  private generateWildcardExport(node: ExportDeclaration): string {
    const source = this.convertSourcePath(this.generateLiteral(node.source!));
    const tmpVar = `__somon_reexport_${this.importCounter++}`;
    const results: string[] = [];

    results.push(this.indent(`const ${tmpVar} = require(${source});`));
    // `содир * чун Н аз "./м";` exports the whole module as one member
    if (node.namespaceExport) {
      const exported = translateMemberName(node.namespaceExport.name);
      results.push(this.indent(`module.exports.${exported} = ${tmpVar};`));
      return results.join('\n');
    }
    results.push(this.indent(`Object.keys(${tmpVar}).forEach(key => {`));
    this.indentLevel++;
    results.push(this.indent(`if (key !== 'default') module.exports[key] = ${tmpVar}[key];`));
    this.indentLevel--;
    results.push(this.indent(`});`));

    return results.join('\n');
  }

  /**
   * ES module exports: `export function ф() {}`, `export { а as push };`,
   * `export default …`, `export { а } from "./м.js";`, `export * as Н from …`.
   * Export names go through the member-name mapping, as in CommonJS output.
   */
  private generateEsmExport(node: ExportDeclaration): string {
    const keepsTypes = !this.elidesTypes();
    // `содир навъ { Т };`, `содир навъ * аз …`: types only, `export type` in TypeScript
    if (node.exportKind === 'type' && !keepsTypes) return '';
    const typeOnly = node.exportKind === 'type' ? 'type ' : '';
    if (node.declaration) {
      return this.generateEsmExportDeclaration(node);
    }
    if (node.source) {
      const source = this.markPosition(
        node.source,
        this.convertSourcePath(this.generateLiteral(node.source))
      );
      if (node.specifiers && node.specifiers.length > 0) {
        const values = node.specifiers.filter(spec => keepsTypes || spec.exportKind !== 'type');
        if (values.length === 0) return '';
        const names = values.map(spec => {
          const local = translateMemberName(spec.local.name);
          const exported = translateMemberName(spec.exported.name);
          const typeName = spec.exportKind === 'type' ? 'type ' : '';
          return `${typeName}${local === exported ? local : `${local} as ${exported}`}`;
        });
        return this.indent(`export ${typeOnly}{ ${names.join(', ')} } from ${source};`);
      }
      const namespace = node.namespaceExport
        ? ` as ${translateMemberName(node.namespaceExport.name)}`
        : '';
      return this.indent(`export ${typeOnly}*${namespace} from ${source};`);
    }
    // Interfaces, type aliases and type-only imports have no runtime binding to export
    const specifiers = (node.specifiers ?? []).filter(
      spec =>
        keepsTypes || (spec.exportKind !== 'type' && !this.typeOnlyNames?.has(spec.local.name))
    );
    if (specifiers.length === 0) return '';
    const names = specifiers.map(spec => {
      if (spec.exported.name === spec.local.name) this.esmExportedNames.add(spec.local.name);
      const local = this.generateIdentifier(spec.local);
      const exported = translateMemberName(spec.exported.name);
      const typeName = spec.exportKind === 'type' ? 'type ' : '';
      return `${typeName}${exported === stripPositionMarkers(local) ? local : `${local} as ${exported}`}`;
    });
    return this.indent(`export ${typeOnly}{ ${names.join(', ')} };`);
  }

  private generateEsmExportDeclaration(node: ExportDeclaration): string {
    const declaration = node.declaration!;
    if (node.default && declaration.type === 'ExpressionStatement') {
      const value = this.generateExpression(
        (declaration as ExpressionStatement).expression,
        PREC.ASSIGNMENT
      );
      return this.indent(`export default ${value};`);
    }

    const code = this.generateStatement(declaration);
    const names = this.extractExportNames(declaration);
    if (names.length === 0) {
      return this.exportTypeDeclaration(code, declaration, Boolean(node.default));
    }
    if (!node.default && CodeGenerator.extendsEarlierDeclaration(code)) {
      return this.exportExistingBindings(code, names);
    }
    names.forEach(name => this.esmExportedNames.add(name));
    if (node.default) {
      if (declaration.type === 'FunctionDeclaration' || declaration.type === 'ClassDeclaration') {
        return CodeGenerator.prefixDeclaration(code, 'export default ');
      }
      return [
        withoutTrailingNewlines(code),
        this.indent(`export { ${names[0]} as default };`),
      ].join('\n');
    }
    // A name that is a built-in member name is exported under its JavaScript name
    if (names.every(name => translateMemberName(name) === name)) {
      return CodeGenerator.prefixDeclaration(code, 'export ');
    }
    const list = names.map(name => {
      const exported = translateMemberName(name);
      return exported === name ? name : `${name} as ${exported}`;
    });
    return [withoutTrailingNewlines(code), this.indent(`export { ${list.join(', ')} };`)].join(
      '\n'
    );
  }

  /**
   * Whether a generated declaration only extends a binding an earlier one
   * created: a later block of a merged `номфазо`/`шумориш` (also merged into
   * a class or function) is just its `(function (Н) { … })(Н || (Н = {}));`.
   */
  private static extendsEarlierDeclaration(code: string): boolean {
    return /^ *(?:\0[^\0]*\0)?\(/.test(code);
  }

  /**
   * `содир` on a declaration that extends an earlier binding: `export` cannot
   * prefix the expression, so the binding is exported by name, once.
   */
  private exportExistingBindings(code: string, names: string[]): string {
    const pending = names.filter(name => !this.esmExportedNames.has(name));
    if (pending.length === 0) return code;
    pending.forEach(name => this.esmExportedNames.add(name));
    const list = pending.map(name => {
      const exported = translateMemberName(name);
      return exported === name ? name : `${name} as ${exported}`;
    });
    return [withoutTrailingNewlines(code), this.indent(`export { ${list.join(', ')} };`)].join(
      '\n'
    );
  }

  /**
   * An exported declaration that only declares types (`интерфейс`, `навъ`):
   * nothing to export in JavaScript, where it is a comment.
   */
  protected exportTypeDeclaration(
    code: string,
    _declaration: Statement,
    _isDefault: boolean
  ): string {
    return code;
  }

  /** Inserts `prefix` (`export `) before a generated statement, after its indentation and marker. */
  protected static prefixDeclaration(code: string, prefix: string): string {
    return code.replace(/^( *(?:\0[^\0]*\0)?)/, start => `${start}${prefix}`);
  }

  /**
   * Rewrite a quoted module specifier for the emitted CommonJS: a trailing
   * `.som` becomes `.js`, and a relative specifier without a JavaScript/JSON
   * extension gets `.js` appended. Anything else is returned unchanged.
   */
  protected convertSourcePath(source: string): string {
    const match = /^(["'])(.*)\1$/s.exec(source);
    if (!match) {
      return source;
    }
    const [, quote, specifier] = match;
    if (specifier.endsWith('.som')) {
      return `${quote}${specifier.slice(0, -'.som'.length)}.js${quote}`;
    }
    if (/^\.\.?\//.test(specifier) && !/\.(?:[cm]?js|json)$/.test(specifier)) {
      // A relative import without an extension: `./м` → `./м.js`, or `./м/index.js` for a directory
      // (`./м/` always names a directory)
      const file =
        specifier.endsWith('/') || this.isDirectoryImport?.(specifier)
          ? `${specifier.replace(/\/$/, '')}/index`
          : specifier;
      return `${quote}${file}.js${quote}`;
    }
    return source;
  }

  /** `binding`: the identifier declares a name rather than referencing one. */
  protected generateIdentifier(node: Identifier, binding: boolean = false): string {
    return this.markPosition(node, this.identifierText(node, binding));
  }

  private identifierText(node: Identifier, binding: boolean): string {
    // In an enum member initializer, earlier members are read by name: `Б = А + ф()`
    const enumMember = binding ? undefined : this.enumMembers?.get(translateMemberName(node.name));
    if (enumMember) {
      return enumMember;
    }
    // In a merged namespace, what its other blocks export: `Н.ном`
    const namespaceMember = binding ? undefined : this.namespaceMemberReference(node.name);
    if (namespaceMember) {
      return namespaceMember;
    }

    // Built-in names (`рӯйхат` → `Array`, `чоп` → `console`, …) are mapped only
    // when the program does not declare a binding of that name in scope;
    // otherwise `тағ рӯйхат = []` would shadow the global `Array`.
    const mapped = this.isDeclared(node.name) ? undefined : this.mapBuiltinIdentifier(node.name);
    if (mapped) {
      return mapped;
    }

    // `null`, `true`, `this`, … are fine as values, but never as declared names
    if (JS_RESERVED_WORDS.has(node.name) && (binding || !JS_KEYWORD_EXPRESSIONS.has(node.name))) {
      this.errors.push(
        `'${node.name}' is a reserved word in JavaScript and cannot be used as an identifier at line ${node.line}, column ${node.column}`
      );
    }
    return node.name;
  }

  protected mapBuiltinIdentifier(name: string): string | undefined {
    // Map built-in literals
    if (name === 'беқимат') {
      return 'undefined';
    }

    // Handle Хато (capitalized) as Error constructor
    if (name === 'Хато') {
      return 'Error';
    }

    // Map built-in constructors/objects (when used as identifiers)
    const builtinConstructors = [
      'сатр',
      'рӯйхат',
      'объект',
      'математика',
      'Риёзӣ',
      'сатрМетодҳо',
      'ваъда',
      'Ваъда',
    ];
    return builtinConstructors.includes(name) ? BUILTIN_MAPPINGS.get(name) : undefined;
  }

  protected isDeclared(name: string): boolean {
    return this.scopes.some(scope => scope.has(name));
  }

  /** Run `generate` with `names` declared in a new innermost scope. */
  protected withScope<T>(names: Iterable<string>, generate: () => T): T {
    this.scopes.push(new Set(names));
    try {
      return generate();
    } finally {
      this.scopes.pop();
    }
  }

  /** Run `generate` inside one more loop or `интихоб`. */
  private withJumpTarget<T>(kind: 'loops' | 'switches', generate: () => T): T {
    this.jumpTargets[kind]++;
    try {
      return generate();
    } finally {
      this.jumpTargets[kind]--;
    }
  }

  /**
   * Run `generate` for a function body: loops and labels around the function
   * are not jump targets, and a `бозгашт` returns from the function, not from
   * an enclosing static block. `isAsync`: the function is `ҳамзамон`.
   */
  protected withFunctionBoundary<T>(generate: () => T, isAsync = false): T {
    const outer = this.jumpTargets;
    const outerLabels = this.labels;
    const outerAsync = this.inAsyncFunction;
    const outerStaticBlock = this.inStaticBlock;
    this.jumpTargets = { loops: 0, switches: 0 };
    this.labels = [];
    this.inAsyncFunction = isAsync;
    this.inStaticBlock = false;
    this.functionDepth++;
    try {
      return generate();
    } finally {
      this.jumpTargets = outer;
      this.labels = outerLabels;
      this.inAsyncFunction = outerAsync;
      this.inStaticBlock = outerStaticBlock;
      this.functionDepth--;
    }
  }

  /**
   * Report a name declared twice in one scope, an early SyntaxError in
   * JavaScript (every SomonScript variable is `let`/`const`). `bound` holds
   * names the scope already binds: parameters (`functionBody`), which a
   * function declaration may reuse, or a catch parameter, which nothing may.
   * Two function declarations of one name are rejected as well: sloppy-mode
   * JavaScript would let the second replace the first, but strict code
   * (ES modules, bundles) rejects it, and it is almost always a mistake.
   */
  /**
   * A module has one default export: two are JavaScript's early error in ES
   * modules and TypeScript's TS2528 ("A module cannot have multiple default
   * exports"). Overload signatures and types (`содир пешфарз интерфейс`) are
   * not values and do not count.
   */
  private checkDefaultExports(body: Statement[]): void {
    let exported = false;
    for (const stmt of body) {
      if (!this.exportsDefaultValue(stmt)) continue;
      if (exported) {
        this.errors.push(
          `A module cannot have multiple default exports at line ${stmt.line}, column ${stmt.column}`
        );
      }
      exported = true;
    }
  }

  private exportsDefaultValue(stmt: Statement): boolean {
    if (stmt.type !== 'ExportDeclaration') return false;
    const node = stmt as ExportDeclaration;
    if (node.exportKind === 'type') return false;
    if (node.default) {
      const declaration = node.declaration as (Statement & { declare?: boolean }) | undefined;
      return !(
        declaration &&
        (TYPE_ONLY_DECLARATIONS.has(declaration.type) || declaration.declare === true)
      );
    }
    return (node.specifiers ?? []).some(
      spec => spec.exportKind !== 'type' && DEFAULT_NAMES.has(spec.exported.name)
    );
  }

  protected checkRedeclarations(
    statements: Statement[],
    bound: string[] = [],
    functionBody = false
  ): void {
    const declared = new Map<string, Statement>();
    const groups = new Map<string, MergeGroup>();
    for (const stmt of statements) {
      const names: string[] = [];
      this.collectDeclaredNames(stmt, names);
      const declaration =
        stmt.type === 'ExportDeclaration' ? (stmt as ExportDeclaration).declaration : stmt;
      const reusesParam = functionBody && declaration?.type === 'FunctionDeclaration';
      for (const name of names) {
        const earlier = declared.get(name);
        if (earlier && declaration && CodeGenerator.mergesWith(earlier, declaration)) {
          this.addToMergeGroup(groups, name, earlier, declaration);
          continue;
        }
        if (earlier || (bound.includes(name) && !reusesParam)) {
          this.errors.push(
            `Identifier '${name}' has already been declared at line ${stmt.line}, column ${stmt.column}`
          );
        }
        declared.set(name, declaration ?? stmt);
      }
    }
  }

  /**
   * TypeScript's declaration merging: a namespace merges with an earlier
   * namespace, class, function or enum of its name, and an enum with an
   * earlier enum or namespace.
   */
  private static mergesWith(earlier: Statement, later: Statement): boolean {
    if (later.type === 'NamespaceDeclaration') {
      return [
        'NamespaceDeclaration',
        'ClassDeclaration',
        'FunctionDeclaration',
        'EnumDeclaration',
      ].includes(earlier.type);
    }
    return (
      later.type === 'EnumDeclaration' &&
      (earlier.type === 'EnumDeclaration' || earlier.type === 'NamespaceDeclaration')
    );
  }

  private addToMergeGroup(
    groups: Map<string, MergeGroup>,
    name: string,
    earlier: Statement,
    later: Statement
  ): void {
    let group = groups.get(name);
    if (!group) {
      group = {
        name,
        declarations: [earlier],
        enumValues: new Map(),
        enumMembers: new Map(),
      };
      groups.set(name, group);
      this.mergeGroups.set(earlier, group);
    }
    group.declarations.push(later);
    this.mergeGroups.set(later, group);
  }

  /** Names bound by the statements of one block (lexical declarations are hoisted to it). */
  protected declaredNames(statements: Statement[]): string[] {
    const names: string[] = [];
    for (const stmt of statements) {
      this.collectDeclaredNames(stmt, names);
    }
    return names;
  }

  protected collectDeclaredNames(stmt: Statement | null | undefined, names: string[]): void {
    switch (stmt?.type) {
      case 'VariableDeclaration':
        this.collectPatternNames((stmt as VariableDeclaration).identifier, names);
        break;
      case 'VariableDeclarationList':
        for (const declaration of (stmt as VariableDeclarationList).declarations) {
          this.collectPatternNames(declaration.identifier, names);
        }
        break;
      case 'FunctionDeclaration':
      case 'ClassDeclaration':
      case 'NamespaceDeclaration':
      case 'EnumDeclaration':
        names.push(
          (stmt as FunctionDeclaration | ClassDeclaration | NamespaceDeclaration | EnumDeclaration)
            .name.name
        );
        break;
      case 'ImportDeclaration':
        names.push(...(stmt as ImportDeclaration).specifiers.map(spec => spec.local.name));
        break;
      case 'ImportEqualsDeclaration':
        names.push((stmt as ImportEqualsDeclaration).id.name);
        break;
      case 'ExportDeclaration':
        this.collectDeclaredNames((stmt as ExportDeclaration).declaration, names);
        break;
    }
  }

  protected paramNames(params: Parameter[] | undefined): string[] {
    const names: string[] = [];
    for (const param of params ?? []) {
      if ((param as { type: string }).type === 'Identifier') {
        names.push((param as unknown as Identifier).name);
      } else {
        this.collectPatternNames(param.pattern ?? param.name, names);
      }
    }
    return names;
  }

  private collectPatternNames(pattern: PatternNode | null | undefined, names: string[]): void {
    switch (pattern?.type) {
      case 'Identifier':
        names.push(pattern.name);
        break;
      case 'AssignmentPattern':
        this.collectPatternNames(pattern.left, names);
        break;
      case 'SpreadElement':
      case 'RestElement':
        this.collectPatternNames(pattern.argument as PatternNode, names);
        break;
      case 'ArrayPattern':
        pattern.elements.forEach(element => this.collectPatternNames(element, names));
        break;
      case 'ObjectPattern':
        for (const prop of pattern.properties) {
          this.collectPatternNames(
            prop.type === 'PropertyPattern' ? (prop.value ?? (prop.key as Identifier)) : prop,
            names
          );
        }
        break;
    }
  }

  protected generateLiteral(node: Literal): string {
    if (typeof node.value === 'string') {
      // Properly escape string literals
      const escaped = node.value
        .replaceAll('\\', '\\\\') // Escape backslashes first
        .replaceAll('"', '\\"') // Escape quotes
        .replaceAll('\n', '\\n') // Escape newlines
        .replaceAll('\t', '\\t') // Escape tabs
        .replaceAll('\r', '\\r') // Escape carriage returns
        .replaceAll('\0', '\\x00'); // Keep NUL out of the output
      return `"${escaped}"`;
    }
    if (node.value === null) {
      return 'null';
    }
    if (typeof node.value === 'number' && CodeGenerator.isNumericLiteralText(node.raw)) {
      // Keep the literal as written: `0xFF`, `1e3`, `.5`, `10n`
      return node.raw;
    }
    return String(node.value);
  }

  private static isNumericLiteralText(raw: unknown): raw is string {
    return (
      typeof raw === 'string' &&
      /^(?:0[xX][0-9a-fA-F]+n?|0[oO][0-7]+n?|0[bB][01]+n?|\d+n|(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)$/.test(
        raw
      )
    );
  }

  private generateTemplateLiteral(node: TemplateLiteral): string {
    let result = '`';

    for (let i = 0; i < node.quasis.length; i++) {
      const quasi = node.quasis[i];

      // Emit the decoded text, re-escaping whatever would end or reinterpret
      // the template: `\`, a backtick, `${`, and CR (which JS normalises to LF).
      const text = quasi.value.cooked ?? quasi.value.raw;
      result += text
        .replace(/\\|`|\$\{/g, match => `\\${match}`)
        .replaceAll('\r', '\\r')
        .replaceAll('\0', '\\x00');

      // Add the expression part if it exists
      if (i < node.expressions.length) {
        result += '${';
        result += this.generateExpression(node.expressions[i]);
        result += '}';
      }
    }

    result += '`';
    return result;
  }

  /**
   * `тег\`…\``: the tag receives the text as written (`String.raw`), so the
   * quasis are emitted raw rather than re-escaped from their cooked value.
   */
  private generateTaggedTemplate(node: TaggedTemplateExpression): string {
    const tag =
      this.generateExpression(node.tag, PREC.CALL) + this.typeArgumentsText(node.typeArguments);
    const { quasis, expressions } = node.quasi;
    let template = '';
    quasis.forEach((quasi, i) => {
      // Line terminators are LF in raw text too; NUL is the position marker
      template += quasi.value.raw.replace(/\r\n?/g, '\n').replaceAll('\0', '\\x00');
      if (i < expressions.length) {
        template += `\${${this.generateExpression(expressions[i])}}`;
      }
    });
    return `${tag}\`${template}\``;
  }

  private generateBinaryExpression(node: BinaryExpression): string {
    const precedence = this.operatorPrecedence.get(node.operator) ?? 0;
    // `**` is right-associative, and `-а ** б` is a SyntaxError, so its left
    // operand must bind tighter than a unary expression. Every other binary
    // operator is left-associative: an equal-precedence right operand needs
    // parentheses (`а - (б - в)`).
    const isExponent = node.operator === '**';
    let left = this.generateExpression(node.left, isExponent ? PREC.UNARY + 1 : precedence);
    const right = this.generateExpression(node.right, isExponent ? precedence : precedence + 1);
    // `(а < б) > (в)`: without the parentheses TypeScript reads a call `а<б>(в)`
    if (node.operator === '>' && this.isTypeArgumentLike(node.left)) left = `(${left})`;

    return `${this.wrapMixedNullish(node, node.left, left)} ${node.operator} ${this.wrapMixedNullish(node, node.right, right)}`;
  }

  /**
   * Whether the output language reads `а < б > (в)` and `ф(а < б, в > (г))`
   * as calls with type arguments, so that comparisons there need
   * parentheses: TypeScript does, JavaScript does not.
   */
  protected readsTypeArguments(): boolean {
    return false;
  }

  /** A `<` or `<<` comparison that could open type arguments in the output. */
  private isTypeArgumentLike(node: Expression): boolean {
    const operator = (skipAssertions(node) as BinaryExpression).operator;
    return (
      this.readsTypeArguments() &&
      skipAssertions(node).type === 'BinaryExpression' &&
      (operator === '<' || operator === '<<')
    );
  }

  /** `??` cannot be combined with an unparenthesised `&&` or `||` operand. */
  private wrapMixedNullish(parent: BinaryExpression, operand: Expression, code: string): string {
    const child = skipAssertions(operand);
    if (parent.operator !== '??' || child.type !== 'BinaryExpression') {
      return code;
    }
    const operator = (child as BinaryExpression).operator;
    return operator === '&&' || operator === '||' ? `(${code})` : code;
  }

  private generateConditionalExpression(node: ConditionalExpression): string {
    const test = this.generateExpression(node.test, PREC.CONDITIONAL + 1);
    const consequent = this.generateExpression(node.consequent, PREC.ASSIGNMENT);
    const alternate = this.generateExpression(node.alternate, PREC.ASSIGNMENT);
    return `${test} ? ${consequent} : ${alternate}`;
  }

  private generateUnaryExpression(node: UnaryExpression): string {
    const target = node.argument as MemberExpression;
    if (node.operator === 'delete' && target.property?.type === 'PrivateIdentifier') {
      this.errors.push(
        `Private fields can not be deleted at line ${node.line}, column ${node.column}`
      );
    }
    const argument = this.generateExpression(node.argument, PREC.UNARY);
    // Word operators (`typeof`, `void`, `delete`) need a space, and so does
    // `- -а` / `+ +а`, which would otherwise read as `--а` / `++а`.
    const needsSpace =
      /^[a-z]/.test(node.operator) ||
      ((node.operator === '-' || node.operator === '+') &&
        stripPositionMarkers(argument).startsWith(node.operator));
    return `${node.operator}${needsSpace ? ' ' : ''}${argument}`;
  }

  private generateUpdateExpression(node: UpdateExpression): string {
    const argument = this.generateExpression(node.argument, PREC.POSTFIX + 1);
    if (node.prefix) {
      return `${node.operator}${argument}`;
    } else {
      return `${argument}${node.operator}`;
    }
  }

  private generateCallExpression(node: CallExpression): string {
    let callee = this.generateExpression(node.callee, PREC.CALL);

    // Special handling for нишондиҳӣ function
    if (stripPositionMarkers(callee) === 'нишондиҳӣ') {
      callee = this.markPosition(node.callee, 'console.log');
    }

    const args = this.generateArguments(node.arguments);
    const typeArguments = this.typeArgumentsText(node.typeArguments);
    return `${callee}${node.optional ? '?.' : ''}${typeArguments}(${args})`;
  }

  /** Call/new argument list; elements may be `SpreadElement`s. */
  private generateArguments(args: Expression[] | undefined): string {
    const list = args ?? [];
    return list
      .map((arg, index) => this.generateListElement(arg, index < list.length - 1))
      .join(', ');
  }

  /**
   * An element of an argument list, array or sequence; `beforeAnother` when
   * more elements follow: `ф((а < б), в > (г))`, not the call `ф(а<б, в>(г))`.
   */
  private generateListElement(element: Expression, beforeAnother: boolean): string {
    if (element.type === 'SpreadElement') {
      return this.generateSpreadElement(element as SpreadElement);
    }
    const code = this.generateExpression(element, PREC.ASSIGNMENT);
    return beforeAnother && this.isTypeArgumentLike(element) ? `(${code})` : code;
  }

  private generateAssignmentExpression(node: AssignmentExpression): string {
    const target = node.left as Expression | ArrayPattern | ObjectPattern;
    const left =
      target.type === 'ArrayPattern' || target.type === 'ObjectPattern'
        ? this.generatePattern(target as ArrayPattern | ObjectPattern)
        : this.generateExpression(node.left);
    const right = this.generateExpression(node.right, PREC.ASSIGNMENT);
    return `${left} ${node.operator} ${right}`;
  }

  /**
   * Try to map object name if it's a built-in object
   */
  private mapBuiltinObject(
    node: MemberExpression,
    object: string
  ): { mapped: string; wasMapped: boolean } {
    const objectNode = skipAssertions(node.object);
    if (objectNode.type !== 'Identifier') {
      return { mapped: object, wasMapped: false };
    }

    const objectName = (objectNode as Identifier).name;
    const builtinObjects = ['чоп', 'математика', 'объект', 'Риёзӣ', 'сатр', 'сатрМетодҳо'];

    if (!builtinObjects.includes(objectName) || this.isDeclared(objectName)) {
      return { mapped: object, wasMapped: false };
    }

    const mappedObject = BUILTIN_MAPPINGS.get(objectName);
    if (mappedObject) {
      return { mapped: mappedObject, wasMapped: true };
    }

    return { mapped: object, wasMapped: false };
  }

  /**
   * Check if object looks like a user class instance
   */

  /**
   * Try to map property name based on context
   */
  private mapPropertyName(node: MemberExpression, property: string, objectMapped: boolean): string {
    if (node.computed || node.property.type !== 'Identifier') {
      return property;
    }

    const propertyName = (node.property as Identifier).name;
    const mappedProperty = BUILTIN_MAPPINGS.get(propertyName);
    if (!mappedProperty) {
      return property;
    }

    // Always map if the property is a recognised Tajik builtin method name.
    // The previous `looksLikeClassInstance` heuristic (lowercase Cyrillic +
    // underscore) created asymmetry with MethodDefinition emission: a class
    // method declared as `илова` emits `push`, but a call on `list_name.илова`
    // would not — runtime "not a function". Consistency beats the heuristic:
    // if the user names a class method after a builtin, both sides rewrite.
    const shouldMap = objectMapped || MEMBER_ALIASES.has(propertyName);
    return shouldMap ? mappedProperty : property;
  }

  private generateMemberExpression(node: MemberExpression): string {
    if (node.object.type === 'Super' && node.property.type === 'PrivateIdentifier') {
      this.errors.push(
        `Unexpected private field '#${(node.property as PrivateIdentifier).name}' after 'супер' at line ${node.property.line}, column ${node.property.column}`
      );
    }
    let object = this.generateExpression(node.object, PREC.CALL);
    // `5.toFixed()` would read the dot as a decimal point
    if (
      skipAssertions(node.object).type === 'Literal' &&
      /^\d+$/.test(stripPositionMarkers(object))
    ) {
      object = `(${object})`;
    }
    // A property name is not a variable reference: emit it verbatim (subject
    // to the member-name mapping below), never as a mapped/checked identifier.
    let property =
      !node.computed && node.property.type === 'Identifier'
        ? (node.property as Identifier).name
        : this.generateExpression(node.property);

    const { mapped: mappedObject, wasMapped: objectMapped } = this.mapBuiltinObject(node, object);
    object = objectMapped ? this.markPosition(node.object, mappedObject) : mappedObject;

    property = this.mapPropertyName(node, property, objectMapped);

    // Special case: чоп.хато should become console.error
    if (stripPositionMarkers(object) === 'console' && property === 'Error') {
      property = 'error';
    }
    if (!node.computed) {
      property = this.markPosition(node.property, property);
    }

    if (node.computed) {
      return `${object}${node.optional ? '?.' : ''}[${property}]`;
    }
    return `${object}${node.optional ? '?.' : '.'}${property}`;
  }

  private generateArrayExpression(node: ArrayExpression): string {
    // Holes stay holes: `[1, , 3]`, and `[1, ,]` keeps its trailing one
    const last = node.elements.length - 1;
    const elements = node.elements.map((element, index) =>
      element ? this.generateListElement(element, index < last) : ''
    );
    const trailingHole = node.elements.length > 0 && !node.elements[node.elements.length - 1];
    return `[${elements.join(', ')}${trailingHole ? ',' : ''}]`;
  }

  private generateObjectExpression(node: ObjectExpression): string {
    const properties = node.properties
      .map(prop => {
        if (prop.type === 'SpreadElement') {
          return this.generateSpreadElement(prop);
        }
        return this.generateProperty(prop);
      })
      .join(', ');

    return `{${properties}}`;
  }

  private generateProperty(prop: Property): string {
    const key = prop.computed
      ? `[${this.generateExpression(prop.key, PREC.ASSIGNMENT)}]`
      : this.generatePropertyKey(prop.key);
    if (prop.method && prop.value.type === 'FunctionExpression') {
      const fn = prop.value as FunctionExpression;
      const asyncPrefix = prop.kind ? `${prop.kind} ` : fn.async ? 'async ' : '';
      const star = fn.generator ? '*' : '';
      const typeParameters = this.typeParametersText(fn.typeParameters);
      const { params, body } = this.withNewTarget(() =>
        this.generateFunctionParts(fn.params, fn.body, fn.async, fn.thisType)
      );
      const returnType = this.returnTypeText(fn.returnType);
      return `${asyncPrefix}${star}${key}${typeParameters}(${params})${returnType} ${body}`;
    }
    const value = this.generateExpression(prop.value, PREC.ASSIGNMENT);
    return `${key}: ${value}`;
  }

  /**
   * Non-computed key of an object literal, class member or destructuring
   * pattern. Identifier keys go through the same Tajik→JS member-name mapping
   * as `о.ном` accesses (`translateMemberName`), so user objects round-trip.
   */
  protected generatePropertyKey(key: Identifier | Literal): string {
    if (key.type === 'Identifier') {
      return this.markPosition(key, translateMemberName((key as Identifier).name));
    }
    return this.markPosition(key, this.generateLiteral(key as Literal));
  }

  private generateTryStatement(node: TryStatement): string {
    let result = this.indent('try ') + this.generateBlockStatement(node.block);

    if (node.handler) {
      const { param, typeAnnotation } = node.handler;
      const names: string[] = [];
      this.collectPatternNames(param, names);
      // A parameterless catch stays parameterless (ES2019) so it cannot shadow
      // an outer variable such as `error`.
      if (param) {
        const binding = this.withScope(names, () =>
          param.type === 'Identifier'
            ? this.generateIdentifier(param, true)
            : this.generatePattern(param)
        );
        result += ` catch (${binding}${this.typeAnnotationText(typeAnnotation)}) `;
      } else {
        result += ' catch ';
      }
      result += this.generateBlockStatement(node.handler.body, names);
    }

    if (node.finalizer) {
      result += ' finally ';
      result += this.generateBlockStatement(node.finalizer);
    }

    return result;
  }

  private generateThrowStatement(node: ThrowStatement): string {
    const argument = this.generateExpression(node.argument);
    return this.indent(`throw ${argument};`);
  }

  private generateAwaitExpression(node: AwaitExpression): string {
    // A CommonJS module is a function body that is not async
    if (this.functionDepth === 0 && !this.allowsTopLevelAwait()) {
      this.errors.push(
        `Top-level 'интизор' (await) is only allowed in ES modules at line ${node.line}, column ${node.column}: compile with module 'esm' or move it into a 'ҳамзамон' function`
      );
    }
    const argument = this.generateExpression(node.argument, PREC.UNARY);
    return `await ${argument}`;
  }

  private generateNewExpression(node: NewExpression): string {
    let callee = this.generateExpression(node.callee, PREC.CALL);
    // `new f().К()` would call `new f()`; a call or optional link anywhere in
    // the callee's member chain needs parentheses: `new (f().К)()`.
    if (this.chainContainsCall(node.callee)) {
      callee = `(${callee})`;
    }
    const typeArguments = this.typeArgumentsText(node.typeArguments);
    return `new ${callee}${typeArguments}(${this.generateArguments(node.arguments)})`;
  }

  private chainContainsCall(node: Expression): boolean {
    let current = skipAssertions(node);
    while (current.type === 'MemberExpression' || current.type === 'TaggedTemplateExpression') {
      if (current.type === 'TaggedTemplateExpression') {
        current = skipAssertions((current as TaggedTemplateExpression).tag);
        continue;
      }
      const memberExpr = current as MemberExpression;
      if (memberExpr.optional) {
        return true;
      }
      current = skipAssertions(memberExpr.object);
    }
    return current.type === 'CallExpression';
  }

  protected generateInterfaceDeclaration(node: InterfaceDeclaration): string {
    // Interfaces are TypeScript-only constructs, so we generate a comment in JavaScript
    // They should NOT generate any executable code at all
    const name = node.name.name;

    return this.indent(`// Interface: ${name}\n`);
  }

  protected generateTypeAlias(node: TypeAlias): string {
    // Type aliases are TypeScript-only constructs, so we generate a comment in JavaScript
    const name = node.name.name;
    return this.indent(`// Type alias: ${name}\n`);
  }

  /**
   * `шумориш Ранг { Сурх, Сабз = 5, Ном = "н" }` (also `собит шумориш`) as
   * TypeScript emits an enum:
   *
   *   var Ранг;
   *   (function (Ранг) {
   *     Ранг[Ранг["Сурх"] = 0] = "Сурх";
   *     Ранг[Ранг["Сабз"] = 5] = "Сабз";
   *     Ранг["Ном"] = "н";
   *   })(Ранг || (Ранг = {}));
   *
   * Constant initializers (literals, arithmetic, earlier members) are folded,
   * string members get no reverse mapping, and a member without initializer
   * is the previous numeric member plus one. Member names go through the
   * member-name mapping, like `Ранг.дарозӣ` (→ `Ранг.length`) does.
   */
  protected generateEnumDeclaration(node: EnumDeclaration): string {
    const name = this.generateIdentifier(node.name, true);
    // At the top level a `var`, as TypeScript emits it; in a block a `let`,
    // which stays in the block like every SomonScript declaration
    const keyword = this.scopes.length <= 1 ? 'var' : 'let';
    // Merged enums (`шумориш Э { А } шумориш Э { Б = 1 }`) share their members
    const group = this.mergeGroups.get(node);
    const values = group?.enumValues ?? new Map<string, number | string>();
    const earlier = group?.enumMembers ?? new Map<string, string>();
    let previous: number | string | undefined = -1;
    const first = node.members[0];
    if (group && first && !first.initializer) {
      if (group.omittedFirstInitializer) {
        this.errors.push(
          `In an enum with multiple declarations, only one declaration can omit an initializer for its first enum element at line ${first.line}, column ${first.column}`
        );
      }
      group.omittedFirstInitializer = true;
    }

    this.indentLevel++;
    const lines = node.members.map(member => {
      const key =
        member.id.type === 'Identifier'
          ? translateMemberName((member.id as Identifier).name)
          : String((member.id as Literal).value);
      const keyText = this.enumValueText(key);
      let value: number | string | undefined;
      let code: string;
      if (member.initializer) {
        value = this.enumConstant(member.initializer, node.name.name, values);
        code =
          value === undefined
            ? this.withEnumMembers(earlier, () =>
                this.generateExpression(member.initializer!, PREC.ASSIGNMENT)
              )
            : this.enumValueText(value);
      } else if (typeof previous === 'number') {
        value = previous + 1;
        code = this.enumValueText(value);
      } else {
        this.errors.push(
          `Enum member '${key}' must have an initializer at line ${member.line}, column ${member.column}`
        );
        code = 'undefined';
      }
      if (value !== undefined) values.set(key, value);
      earlier.set(
        key,
        /^[\p{L}_$][\p{L}\p{N}\p{M}_$]*$/u.test(key) ? `${name}.${key}` : `${name}[${keyText}]`
      );
      previous = value;
      return typeof value === 'string'
        ? this.indent(`${name}[${keyText}] = ${code};`)
        : this.indent(`${name}[${name}[${keyText}] = ${code}] = ${keyText};`);
    });
    this.indentLevel--;

    const body = lines.length > 0 ? `{\n${lines.join('\n')}\n${this.getIndent()}}` : '{}';
    const iife = this.indent(`(function (${name}) ${body})(${name} || (${name} = {}));`);
    if (group && !this.declaresMergedBinding(node, group)) return iife;
    return [this.indent(`${keyword} ${name};`), iife].join('\n');
  }

  /**
   * Whether `node` declares the binding of its merge group: the group's first
   * declaration that emits code (`эълон …` declarations emit none).
   */
  private declaresMergedBinding(node: Statement, group: MergeGroup): boolean {
    return group.declarations.find(d => !(d as { declare?: boolean }).declare) === node;
  }

  /** Runs `generate` with earlier enum members readable by name (`Б = А + ф()`). */
  private withEnumMembers<T>(members: Map<string, string>, generate: () => T): T {
    const outer = this.enumMembers;
    this.enumMembers = new Map(members);
    try {
      return generate();
    } finally {
      this.enumMembers = outer;
    }
  }

  private enumValueText(value: number | string): string {
    if (typeof value === 'string') {
      return this.generateLiteral({ type: 'Literal', value, raw: '', line: 0, column: 0 });
    }
    return Object.is(value, -0) ? '-0' : String(value);
  }

  /**
   * Value of a constant enum initializer: number and string literals, `+ - ~`,
   * arithmetic, bitwise and `+` concatenation, and earlier members (`А`,
   * `Ранг.А`). Undefined when the value is only known at run time.
   */
  private enumConstant(
    expr: Expression,
    enumName: string,
    values: Map<string, number | string>
  ): number | string | undefined {
    const operand = (e: Expression) => this.enumConstant(e, enumName, values);
    switch (expr.type) {
      case 'Literal': {
        const { value, raw } = expr as Literal;
        if (typeof value === 'string') return value;
        return typeof value === 'number' && !/n$/.test(raw) ? value : undefined;
      }
      case 'TemplateLiteral': {
        // `матн ${А}`: a string when every substitution is a constant
        const template = expr as TemplateLiteral;
        let text = template.quasis[0].value.cooked!;
        for (const [index, substitution] of template.expressions.entries()) {
          const value = operand(substitution);
          if (value === undefined) return undefined;
          text += `${value}${template.quasis[index + 1].value.cooked!}`;
        }
        return text;
      }
      case 'Identifier':
        return values.get(translateMemberName((expr as Identifier).name));
      case 'MemberExpression':
        return CodeGenerator.enumMemberConstant(expr as MemberExpression, enumName, values);
      case 'UnaryExpression': {
        const unary = expr as UnaryExpression;
        return CodeGenerator.foldUnary(unary.operator, operand(unary.argument));
      }
      case 'BinaryExpression': {
        const binary = expr as BinaryExpression;
        return CodeGenerator.foldBinary(
          binary.operator,
          operand(binary.left),
          operand(binary.right)
        );
      }
      default:
        return undefined;
    }
  }

  /** `Ранг.А` / `Ранг["А"]` / `Ранг[\`А\`]` naming an earlier member of the enum `enumName`. */
  private static enumMemberConstant(
    member: MemberExpression,
    enumName: string,
    values: Map<string, number | string>
  ): number | string | undefined {
    if (member.object.type !== 'Identifier' || (member.object as Identifier).name !== enumName) {
      return undefined;
    }
    if (!member.computed) {
      return values.get(translateMemberName((member.property as Identifier).name));
    }
    const key = CodeGenerator.stringKey(member.property);
    return key === undefined ? undefined : values.get(key);
  }

  /** The text of a string literal or a template without substitutions, as TypeScript reads keys. */
  private static stringKey(expr: Expression): string | undefined {
    if (expr.type === 'Literal') {
      const { value } = expr as Literal;
      return typeof value === 'string' ? value : undefined;
    }
    const template = expr as TemplateLiteral;
    return expr.type === 'TemplateLiteral' && template.expressions.length === 0
      ? template.quasis[0].value.cooked!
      : undefined;
  }

  private static foldUnary(
    operator: string,
    argument: number | string | undefined
  ): number | undefined {
    if (typeof argument !== 'number') return undefined;
    if (operator === '+') return argument;
    if (operator === '-') return -argument;
    return operator === '~' ? ~argument : undefined;
  }

  private static foldBinary(
    operator: string,
    left: number | string | undefined,
    right: number | string | undefined
  ): number | string | undefined {
    if (left === undefined || right === undefined) return undefined;
    if (operator === '+') {
      return typeof left === 'number' && typeof right === 'number'
        ? left + right
        : `${left}${right}`;
    }
    if (typeof left !== 'number' || typeof right !== 'number') return undefined;
    return CodeGenerator.foldNumeric(operator, left, right);
  }

  private static foldNumeric(operator: string, left: number, right: number): number | undefined {
    switch (operator) {
      case '-':
        return left - right;
      case '*':
        return left * right;
      case '/':
        return left / right;
      case '%':
        return left % right;
      case '**':
        return left ** right;
      case '<<':
        return left << right;
      case '>>':
        return left >> right;
      case '>>>':
        return left >>> right;
      case '&':
        return left & right;
      case '|':
        return left | right;
      case '^':
        return left ^ right;
      default:
        return undefined;
    }
  }

  protected generateNamespaceDeclaration(node: NamespaceDeclaration): string {
    const group = this.mergeGroups.get(node);
    if (group) return this.generateMergedNamespace(node, group);

    // Generate namespace as an IIFE (Immediately Invoked Function Expression)
    const name = this.generateIdentifier(node.name, true);

    // A local binding, so the namespace never leaks into (or, in strict code,
    // fails on) the global scope
    let result = this.indent(`const ${name} = (function() {\n`);
    this.indentLevel++;
    result += this.indent(`const ${name} = {};\n`);

    // Generate namespace body
    const statements = node.body?.statements ?? [];
    // The body shares the IIFE's scope with the `const ${name} = {}` above
    this.checkRedeclarations(statements, [node.name.name]);
    this.scopes.push(new Set(this.declaredNames(statements)));
    result += this.withFunctionBoundary(() => this.generateNamespaceBody(statements, name));
    this.scopes.pop();

    result += this.indent(`return ${name};\n`);
    this.indentLevel--;
    result += this.indent('})();\n');

    return result;
  }

  /** The statements of a namespace block; exported members also become `Н.ном`. */
  private generateNamespaceBody(statements: Statement[], name: string): string {
    let result = '';
    for (const stmt of statements) {
      const isExported = (stmt as Statement & { exported?: boolean }).exported;

      // Skip interface declarations and type aliases - they don't generate runtime code
      if (stmt.type === 'InterfaceDeclaration' || stmt.type === 'TypeAlias') {
        result += this.generateStatement(stmt);
        continue;
      }

      const code = isExported
        ? this.generateExportedNamespaceMember(stmt, name)
        : this.generateStatement(stmt);
      result += code && !code.endsWith('\n') ? `${code}\n` : code;
    }
    return result;
  }

  /**
   * A namespace merged with other declarations of its name (another
   * `номфазо`, a class, function or enum), as TypeScript emits it:
   *
   *   var Н;
   *   (function (Н) {
   *     const а = 1;
   *     Н.а = а;
   *   })(Н || (Н = {}));
   *
   * Members the group's other namespace blocks export are read as `Н.ном`.
   */
  private generateMergedNamespace(node: NamespaceDeclaration, group: MergeGroup): string {
    const name = this.generateIdentifier(node.name, true);
    const keyword = this.scopes.length <= 1 ? 'var' : 'let';
    const statements = node.body?.statements ?? [];
    const own = new Set(this.declaredNames(statements));
    const shared = new Set<string>();
    for (const other of group.declarations) {
      if (other === node || other.type !== 'NamespaceDeclaration') continue;
      for (const member of this.namespaceExports(other as NamespaceDeclaration)) {
        if (!own.has(member)) shared.add(member);
      }
    }

    let result = '';
    if (this.declaresMergedBinding(node, group)) result += this.indent(`${keyword} ${name};\n`);
    result += this.indent(`(function (${name}) {\n`);
    this.indentLevel++;
    this.checkRedeclarations(statements, [node.name.name]);
    this.scopes.push(new Set([node.name.name, ...own]));
    const outerMembers = this.namespaceMembers;
    this.namespaceMembers = { namespace: name, names: shared, depth: this.scopes.length - 1 };
    try {
      result += this.withFunctionBoundary(() => this.generateNamespaceBody(statements, name));
    } finally {
      this.namespaceMembers = outerMembers;
      this.scopes.pop();
      this.indentLevel--;
    }
    return result + this.indent(`})(${name} || (${name} = {}));\n`);
  }

  /** Names a namespace block exports; in an `эълон номфазо` every declaration counts. */
  private namespaceExports(node: NamespaceDeclaration): string[] {
    const statements = node.body?.statements ?? [];
    if (!node.declare) {
      return statements
        .filter(stmt => (stmt as Statement & { exported?: boolean }).exported)
        .flatMap(stmt => this.getMemberNames(stmt));
    }
    return statements.flatMap(stmt =>
      stmt.type === 'FunctionSignature'
        ? [(stmt as FunctionDeclaration).name.name]
        : this.getMemberNames(stmt)
    );
  }

  /** `ном` in a block of a merged namespace that another block exports: `Н.ном`. */
  private namespaceMemberReference(name: string): string | undefined {
    const members = this.namespaceMembers;
    if (!members?.names.has(name)) return undefined;
    if (this.scopes.slice(members.depth).some(scope => scope.has(name))) return undefined;
    return `${members.namespace}.${translateMemberName(name)}`;
  }

  /**
   * An exported member of a namespace: its declaration, a local binding the
   * namespace's other members use (a nested namespace too), then
   * `Н.ном = ном;` for each name it binds.
   */
  private generateExportedNamespaceMember(stmt: Statement, namespaceName: string): string {
    const code = this.generateStatement(stmt);
    // An ambient member (`содир эълон собит х: рақам;`) exists elsewhere
    if (!code.trim()) return code;
    const assignments = this.getMemberNames(stmt).map(name =>
      this.indent(`${namespaceName}.${translateMemberName(name)} = ${name};\n`)
    );
    return `${withoutTrailingNewlines(code)}\n${assignments.join('')}`;
  }

  /**
   * Names an exported namespace member binds: one, each of `содир тағ а = 1,
   * б = 2`, or each name of a pattern (`содир собит { а, б: [в] } = о`).
   */
  private getMemberNames(stmt: Statement): string[] {
    const names: string[] = [];
    this.collectDeclaredNames(stmt, names);
    return names;
  }

  private generateClassDeclaration(node: ClassDeclaration): string {
    return this.indent(this.generateClass(node));
  }

  /** `синф { … }` as an expression; its own name is in scope in its body only. */
  private generateClassExpression(node: ClassExpression): string {
    return this.withScope(node.name ? [node.name.name] : [], () => this.generateClass(node));
  }

  /**
   * Decorators as written, `@ном(1) `, before a class, member or parameter;
   * TypeScript lowers them (see `LoweringNeeds`).
   */
  private generateDecorators(decorators: Decorator[] | undefined): string {
    if (!decorators || decorators.length === 0) return '';
    this.lowering.decorators = true;
    return decorators
      .map(decorator => {
        const expression = this.generateExpression(decorator.expression);
        // `@а.б(1)` as is; anything else (`@(а[0])`) in parentheses
        return CodeGenerator.isDecoratorChain(decorator.expression, true)
          ? `@${expression} `
          : `@(${expression}) `;
      })
      .join('');
  }

  /** `ном`, `а.б`, `а.б(1)`: a decorator JavaScript accepts without parentheses. */
  private static isDecoratorChain(expression: Expression, allowCall: boolean): boolean {
    switch (expression.type) {
      case 'Identifier':
        return true;
      case 'MemberExpression': {
        const member = expression as MemberExpression;
        return (
          !member.computed &&
          !member.optional &&
          CodeGenerator.isDecoratorChain(member.object, false)
        );
      }
      case 'CallExpression': {
        const call = expression as CallExpression;
        return allowCall && !call.optional && CodeGenerator.isDecoratorChain(call.callee, false);
      }
      default:
        return false;
    }
  }

  /** Standard decorators cannot decorate parameters; legacy ones (`experimentalDecorators`) can. */
  private checkParameterDecorators(param: Parameter): void {
    this.lowering.parameterDecorators = true;
    if (this.experimentalDecorators) return;
    const at = param.decorators![0];
    this.errors.push(
      `Decorators are not valid here at line ${at.line}, column ${at.column}: parameter decorators need the 'experimentalDecorators' option`
    );
  }

  /** `class Ном extends Асос { … }`, members one level deeper than the current indentation. */
  private generateClass(node: ClassDeclaration | ClassExpression): string {
    const decorators = this.generateDecorators(node.decorators);
    const className = node.name ? ` ${this.generateIdentifier(node.name, true)}` : '';
    const typeParameters = this.typeParametersText(node.typeParameters);
    const extendsClause = node.superClass
      ? ` extends ${this.generateExpression(node.superClass, PREC.CALL)}${this.typeArgumentsText(node.superTypeArguments)}`
      : '';
    const implementsClause = this.implementsClause(node);
    // JavaScript has no abstract classes: only TypeScript output gets `abstract` (classModifiers)

    let classBody = '';

    // Generate class members, one level deeper than the class
    if (node.body && node.body.body) {
      this.privateNames.push(this.declaredPrivateNames(node));
      this.indentLevel++;
      const members = [
        ...this.extraClassMembers(node),
        ...node.body.body.map(member => {
          switch (member.type) {
            case 'MethodDefinition':
              return this.generateMethodDefinition(member as MethodDefinition);
            case 'PropertyDefinition':
              return this.generatePropertyDefinition(member as PropertyDefinition);
            case 'StaticBlock':
              return this.generateStaticBlock(member as StaticBlock);
            default:
              return '';
          }
        }),
      ].filter((member: string) => member.length > 0);
      this.indentLevel--;
      this.privateNames.pop();

      if (members.length > 0) {
        classBody = '\n' + members.join('\n') + '\n' + this.getIndent();
      }
    }

    return `${decorators}${this.classModifiers(node)}class${className}${typeParameters}${extendsClause}${implementsClause} {${classBody}}`;
  }

  /**
   * `static { … }`: unlike a function body, `бозгашт` is not allowed; like
   * one, loops around the class are not jump targets.
   */
  private generateStaticBlock(node: StaticBlock): string {
    const block: BlockStatement = {
      type: 'BlockStatement',
      body: node.body,
      line: node.line,
      column: node.column,
    };
    // `нав.target` is allowed (and `беқимат`) in a static block
    const body = this.withNewTarget(() =>
      this.withFunctionBoundary(() => {
        this.inStaticBlock = true;
        return this.generateBlockStatement(block);
      })
    );
    return this.indent(`static ${body}`);
  }

  /**
   * Private names a class declares. Declaring one twice is an early error,
   * except for a getter and a setter of the same name; overload signatures
   * (`#м(х: рақам): беджавоб;`) declare nothing.
   */
  private declaredPrivateNames(node: ClassDeclaration | ClassExpression): Set<string> {
    const declared = new Map<string, string>();
    for (const member of node.body.body) {
      if (member.type === 'StaticBlock' || member.key?.type !== 'PrivateIdentifier') continue;
      if (member.type === 'MethodDefinition' && member.signature) continue;
      const name = (member.key as PrivateIdentifier).name;
      const kind = member.type === 'MethodDefinition' ? member.kind : 'field';
      const previous = declared.get(name);
      const accessorPair =
        (previous === 'get' && kind === 'set') || (previous === 'set' && kind === 'get');
      if (previous !== undefined && !accessorPair) {
        this.errors.push(
          `Identifier '#${name}' has already been declared at line ${member.key.line}, column ${member.key.column}`
        );
      }
      declared.set(name, accessorPair ? 'pair' : kind);
    }
    return new Set(declared.keys());
  }

  /**
   * A class member name: `#ном` as written, `[ифода]` for a computed name, a
   * string or number literal as is, other names through the member-name mapping.
   */
  protected generateMemberKey(
    key: Identifier | PrivateIdentifier | Expression,
    computed: boolean = false
  ): string {
    if (computed) return `[${this.generateExpression(key, PREC.ASSIGNMENT)}]`;
    if (key.type === 'Literal') return this.generateLiteral(key as Literal);
    return this.markPosition(
      key,
      key.type === 'PrivateIdentifier'
        ? this.generatePrivateIdentifier(key as PrivateIdentifier)
        : translateMemberName((key as Identifier).name)
    );
  }

  private generateMethodDefinition(node: MethodDefinition): string {
    // Abstract methods and signatures without a body (overloads, members of
    // an `эълон синф`) don't exist in JavaScript
    if (node.abstract || node.signature) return this.generateMethodSignature(node);

    // Method names follow the same member-name mapping as `obj.маълумот()`
    // call sites (`translateMemberName`), so declaration and use agree.
    const name =
      node.kind === 'constructor' ? 'constructor' : this.generateMemberKey(node.key, node.computed);
    const accessor = node.kind === 'get' || node.kind === 'set' ? `${node.kind} ` : '';
    const methodName = `${accessor}${name}${this.optionalMark(node.optional)}`;
    // Decorators come before every modifier: `@д static м() {}`
    const modifiers = `${this.generateDecorators(node.decorators)}${this.memberModifiers(node)}`;
    const isAsync = node.value?.async ? 'async ' : '';
    const star = node.value?.generator ? '*' : '';

    const typeParameters = this.typeParametersText(node.value?.typeParameters);
    const returnType = this.returnTypeText(node.value?.returnType);
    // Handle cases where body might be null or undefined
    if (!node.value || !node.value.body) {
      const params = this.withScope(this.paramNames(node.value?.params), () =>
        this.generateParams(node.value?.params)
      );
      return this.indent(
        `${modifiers}${isAsync}${star}${methodName}${typeParameters}(${params})${returnType} {}`
      );
    }
    const body = node.kind === 'constructor' ? this.constructorBody(node.value) : node.value.body;
    const { params, body: code } = this.withNewTarget(() =>
      this.generateFunctionParts(node.value.params, body, node.value.async, node.value.thisType)
    );
    return this.indent(
      `${modifiers}${isAsync}${star}${methodName}${typeParameters}(${params})${returnType} ${code}`
    );
  }

  /**
   * Body of a constructor. JavaScript has no parameter properties
   * (`конструктор(хосусӣ х: рақам)`), so their assignments are added to it.
   */
  protected constructorBody(constructor: FunctionExpression): BlockStatement {
    return this.withParameterProperties(constructor);
  }

  /**
   * The constructor body with `this.х = х;` for each parameter property
   * (`конструктор(хосусӣ х: рақам)`), placed as TypeScript places them: at
   * the start, or right after the `супер(…)` call among the body's statements.
   */
  protected withParameterProperties(
    constructor: FunctionExpression,
    include: (_param: Parameter) => boolean = () => true
  ): BlockStatement {
    const assignments = constructor.params
      .filter(param => (param.accessibility || param.readonly || param.override) && include(param))
      .map(param => {
        const { line, column } = param;
        const target: MemberExpression = {
          type: 'MemberExpression',
          object: { type: 'ThisExpression', line, column },
          property: { ...param.name },
          computed: false,
          line,
          column,
        };
        const assignment: AssignmentExpression = {
          type: 'AssignmentExpression',
          left: target,
          operator: '=',
          right: param.name,
          line,
          column,
        };
        return { type: 'ExpressionStatement', expression: assignment, line, column };
      });
    if (assignments.length === 0) return constructor.body;

    const statements = constructor.body.body;
    const superCall = statements.findIndex(statement => {
      const expression = (statement as ExpressionStatement).expression;
      return (
        statement.type === 'ExpressionStatement' &&
        expression.type === 'CallExpression' &&
        (expression as CallExpression).callee.type === 'Super'
      );
    });
    return {
      ...constructor.body,
      body: [
        ...statements.slice(0, superCall + 1),
        ...assignments,
        ...statements.slice(superCall + 1),
      ],
    };
  }

  private generatePropertyDefinition(node: PropertyDefinition): string {
    // Index signatures, `эълон` and `мавҳум` fields only declare types
    if (node.indexSignature || node.declare || node.abstract) {
      return this.generateFieldSignature(node);
    }
    const propertyName = this.generateMemberKey(node.key, node.computed);
    const modifiers = this.memberModifiers(node);
    // `дастрасӣ ном = 1;`: an auto-accessor, lowered by TypeScript
    if (node.accessor) this.lowering.autoAccessors = true;
    const accessor = node.accessor ? 'accessor ' : '';
    const type = `${this.optionalMark(node.optional)}${node.definite ? this.definiteMark() : ''}${this.typeAnnotationText(node.typeAnnotation)}`;
    // A field initializer may use `нав.target` (it is `беқимат` there)
    const value = node.value;
    const initializer = value
      ? ` = ${this.withNewTarget(() => this.generateExpression(value, PREC.ASSIGNMENT))}`
      : '';

    const decorators = this.generateDecorators(node.decorators);
    return this.indent(`${decorators}${modifiers}${accessor}${propertyName}${type}${initializer};`);
  }

  private generateSwitchStatement(node: SwitchStatement): string {
    const discriminant = this.generateExpression(node.discriminant);

    // Case labels one level deeper than `switch`, their statements two
    this.indentLevel++;
    const cases = node.cases
      .map((switchCase: SwitchCase) => {
        const label = switchCase.test
          ? `case ${this.generateExpression(switchCase.test)}:`
          : 'default:';
        this.indentLevel++;
        const consequent = switchCase.consequent
          .map(stmt => this.generateStatement(stmt))
          .filter(stmt => stmt.length > 0);
        this.indentLevel--;
        return [this.indent(label), ...consequent].join('\n');
      })
      .join('\n');
    this.indentLevel--;

    return this.indent(`switch (${discriminant}) {\n${cases}\n${this.getIndent()}}`);
  }

  // Pattern generation methods
  private generatePattern(node: PatternNode): string {
    switch (node.type) {
      case 'Identifier':
        return this.generateIdentifier(node, true);
      case 'AssignmentPattern':
        return `${this.generatePattern(node.left)} = ${this.generateExpression(node.right, PREC.ASSIGNMENT)}`;
      case 'ArrayPattern':
        return this.generateArrayPattern(node);
      case 'ObjectPattern':
        return this.generateObjectPattern(node);
      case 'SpreadElement':
      case 'RestElement':
        return `...${this.generatePattern(node.argument as PatternNode)}`;
      default: {
        const unknown = node as { type?: string };
        this.errors.push(`Unknown pattern type: ${unknown.type ?? 'unknown'}`);
        return '';
      }
    }
  }

  private generateArrayPattern(node: ArrayPattern): string {
    const elements = node.elements
      .map(element => {
        return element === null ? '' : this.generatePattern(element);
      })
      .join(', ');

    return `[${elements}]`;
  }

  private generateObjectPattern(node: ObjectPattern): string {
    const properties = node.properties
      .map(prop => {
        return prop.type === 'SpreadElement'
          ? this.generatePattern(prop)
          : this.generatePropertyPattern(prop as PropertyPattern);
      })
      .join(', ');

    return `{${properties}}`;
  }

  private generatePropertyPattern(node: PropertyPattern): string {
    const key = node.computed
      ? `[${this.generateExpression(node.key as Expression, PREC.ASSIGNMENT)}]`
      : this.generatePropertyKey(node.key as Identifier | Literal);
    // Shorthand `{ п }` binds a variable named like the key
    const value = node.value ?? (node.key as Identifier);

    const local = this.generatePattern(value);
    return !node.computed && stripPositionMarkers(local) === stripPositionMarkers(key)
      ? local
      : `${key}: ${local}`;
  }

  private generateSpreadElement(node: SpreadElement): string {
    const argument = this.generateExpression(node.argument, PREC.ASSIGNMENT);
    return `...${argument}`;
  }

  protected indent(text: string): string {
    return this.getIndent() + text;
  }

  protected getIndent(): string {
    return ' '.repeat(this.indentLevel * this.indentSize);
  }
}

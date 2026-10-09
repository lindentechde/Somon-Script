import {
  ArrayExpression,
  ArrayType,
  CallExpression,
  ChainExpression,
  ClassDeclaration,
  ArrayPattern,
  ObjectPattern,
  Expression,
  FunctionDeclaration,
  GenericType,
  Identifier,
  InterfaceDeclaration,
  IntersectionType,
  Literal,
  LiteralType,
  NewExpression,
  ObjectExpression,
  NamespaceDeclaration,
  ObjectType,
  PrimitiveType,
  Program,
  PropertySignature,
  Statement,
  TupleType,
  FunctionType,
  TypeAlias,
  TypeNode,
  UnionType,
  VariableDeclaration,
  TypeAnnotation,
  UniqueType,
} from './types';
import {
  AssignmentExpression,
  AssignmentPattern,
  AwaitExpression,
  BinaryExpression,
  BlockStatement,
  ConditionalExpression,
  ExportDeclaration,
  ExpressionStatement,
  ForInStatement,
  ForOfStatement,
  ForStatement,
  IfStatement,
  ImportDeclaration,
  MemberExpression,
  MethodDefinition,
  Parameter,
  PropertyDefinition,
  RestElement,
  ReturnStatement,
  SequenceExpression,
  SpreadElement,
  SwitchStatement,
  TemplateLiteral,
  ThrowStatement,
  TryStatement,
  UnaryExpression,
  UpdateExpression,
  WhileStatement,
} from './ast';
import { translateMemberName } from './builtin-names';

/**
 * Represents a type checking error or warning
 */
export interface TypeCheckError {
  message: string;
  line: number;
  column: number;
  code: string;
  snippet: string;
  severity: 'error' | 'warning';
}

/**
 * Stable error codes for type checking diagnostics
 */
export const TypeCheckErrorCode = {
  TypeMismatch: 'TYPE_NOT_ASSIGNABLE',
  ClassNotFound: 'CLASS_NOT_FOUND',
  InvalidExtends: 'INVALID_EXTENDS',
  CircularInheritance: 'CIRCULAR_INHERITANCE',
  UndefinedIdentifier: 'UNDEFINED_IDENTIFIER',
  ArgumentCountMismatch: 'ARGUMENT_COUNT_MISMATCH',
  ArgumentTypeMismatch: 'ARGUMENT_TYPE_MISMATCH',
  PropertyNotFound: 'PROPERTY_NOT_FOUND',
  PossiblyNull: 'POSSIBLY_NULL',
} as const;
// eslint-disable-next-line no-redeclare, @typescript-eslint/no-redeclare
export type TypeCheckErrorCode = (typeof TypeCheckErrorCode)[keyof typeof TypeCheckErrorCode];

/**
 * Options of the type checker.
 */
export interface TypeCheckOptions {
  /**
   * TypeScript-style strict checking: `холӣ` and `беқимат` are only
   * assignable to types that include them, a value that may be `холӣ` or
   * `беқимат` cannot be dereferenced or used in arithmetic until a check
   * narrows it, and reading a member a type doesn't have is an error (without
   * `strict` it is a warning).
   */
  strict?: boolean;
}

/**
 * Result of type checking operation
 */
export interface TypeCheckResult {
  errors: TypeCheckError[];
  warnings: TypeCheckError[];
}

/**
 * Represents a type in the SomonScript type system
 */
export interface Type {
  kind: string;
  name?: string;
  value?: string | number | boolean | null; // For literal types
  elementType?: Type;
  types?: Type[];
  properties?: Map<string, PropertyType>;
  returnType?: Type;
  baseType?: Type;
  typeParameters?: Type[]; // For generic types like Map<K,V>, Set<T>
  paramTypes?: Type[]; // Parameter types for function types
  paramNames?: string[]; // Parameter names for function types
  paramOptional?: boolean[]; // Params that may be omitted (`?` suffix or default value)
  hasRestParam?: boolean; // Last parameter is a rest parameter (`...а`)
  indexType?: Type; // Index signature value type (`[калид: сатр]: Т`)
  open?: boolean; // Members may be incomplete; skip excess-property checks
  fromLiteral?: boolean; // Object type inferred from a literal; may gain members later
  staticMembers?: Set<string>; // Static member names of a class
  implicitMembers?: Set<string>; // Undeclared class members assigned through `ин.ном = …`
}

/**
 * Represents a property type with optional flag
 */
export interface PropertyType {
  type: Type;
  optional: boolean;
}

/**
 * Per-function checking context: the expected type of `бозгашт` arguments
 * (already unwrapped from Promise for async functions) and the type of `ин`.
 */
interface FunctionContext {
  returnType?: Type;
  thisType?: Type;
}

type FunctionLike = {
  params: Parameter[];
  body: BlockStatement | Expression;
  returnType?: TypeAnnotation;
  async?: boolean;
  isAsync?: boolean;
};

const UNKNOWN: Type = { kind: 'unknown' };
const NULL_TYPE: Type = { kind: 'primitive', name: 'null' };
const UNDEFINED_TYPE: Type = { kind: 'primitive', name: 'undefined' };
const NUMBER_TYPE: Type = { kind: 'primitive', name: 'number' };
const STRING_TYPE: Type = { kind: 'primitive', name: 'string' };

/** Narrowed types of references (`х`, `ин.сар.пас`) at the current point of the flow. */
type Facts = Map<string, Type>;

/** Every property name readable on values with the given prototype. */
function prototypeMembers(prototype: object): ReadonlySet<string> {
  const names = new Set<string>();
  for (let p: object | null = prototype; p; p = Object.getPrototypeOf(p)) {
    Object.getOwnPropertyNames(p).forEach(name => names.add(name));
  }
  return names;
}

/**
 * Members of built-in types, taken from the running JavaScript engine so the
 * lists match what the compiled program can call.
 */
const BUILTIN_MEMBERS = {
  object: prototypeMembers(Object.prototype),
  array: prototypeMembers(Array.prototype),
  string: prototypeMembers(String.prototype),
  number: prototypeMembers(Number.prototype),
  boolean: prototypeMembers(Boolean.prototype),
  function: prototypeMembers(Function.prototype),
  Map: prototypeMembers(Map.prototype),
  Set: prototypeMembers(Set.prototype),
  Promise: prototypeMembers(Promise.prototype),
} as const;

/** Array methods that return an element or `undefined` when there is none. */
const ARRAY_ELEMENT_OR_UNDEFINED: ReadonlySet<string> = new Set([
  'pop',
  'shift',
  'at',
  'find',
  'findLast',
]);

const RELATIONAL_OPERATORS: ReadonlySet<string> = new Set(['<', '>', '<=', '>=']);

/** Statements an unlabelled `шикастан` leaves. */
const JUMP_TARGETS: ReadonlySet<string> = new Set([
  'WhileStatement',
  'DoWhileStatement',
  'ForStatement',
  'ForInStatement',
  'ForOfStatement',
  'SwitchStatement',
]);

/** Key the parser gives index signatures (`[калид: сатр]: Т`) in interface bodies. */
const INDEX_SIGNATURE_KEY = '__computed__';

/** Spellings of the Promise type; `Ваъда<T>` is the Tajik alias of `Promise<T>`. */
const PROMISE_NAMES: ReadonlySet<string> = new Set(['Promise', 'Ваъда', 'ваъда', 'ВАЪДА']);

const NUMERIC_BINARY_OPERATORS: ReadonlySet<string> = new Set([
  '-',
  '*',
  '/',
  '%',
  '**',
  '<<',
  '>>',
  '>>>',
  '&',
  '|',
  '^',
]);

const BOOLEAN_BINARY_OPERATORS: ReadonlySet<string> = new Set([
  '==',
  '!=',
  '===',
  '!==',
  '<',
  '>',
  '<=',
  '>=',
  'in',
  'instanceof',
]);

/**
 * Type checker for SomonScript AST
 * Provides comprehensive type checking with Tajik Cyrillic type annotations
 */
export class TypeChecker {
  private static readonly BUILTIN_VALUE_NAMES: ReadonlySet<string> = new Set([
    // Tajik builtin globals (also present in codegen's builtinMappings)
    'чоп',
    'математика',
    'Риёзӣ',
    'объект',
    'сатрМетодҳо',
    'хато',
    'Хато',
    'рӯйхат',
    'сатр',
    'ваъда', // Promise
    'Ваъда',
    // Tajik literal keywords that surface as Identifier expressions
    'беқимат', // undefined
    'холӣ', // null (also a primitive type name)
    'дуруст', // true
    'нодуруст', // false
    'ин', // this
    // Latin/JS builtins the generated code or examples reference by name
    'console',
    'Math',
    'Object',
    'Array',
    'Date',
    'JSON',
    'Map',
    'Set',
    'Promise',
    'Error',
    'RegExp',
    'Number',
    'Boolean',
    'String',
    'Symbol',
    'undefined',
    'null',
    'NaN',
    'Infinity',
    'parseInt',
    'parseFloat',
    'isNaN',
    'isFinite',
    'globalThis',
    'this',
    'arguments',
    // Host globals that may be absent from the checker's own globalThis
    'require',
    'module',
    'exports',
    '__dirname',
    '__filename',
    'process',
    'Buffer',
    'window',
    'document',
    'navigator',
    'location',
    'localStorage',
    'sessionStorage',
    'alert',
    'fetch',
  ]);

  private errors: TypeCheckError[] = [];
  private warnings: TypeCheckError[] = [];
  private readonly strict: boolean;
  /** Lexical scope chain; index 0 is the global scope. */
  private scopes: Map<string, Type>[] = [];
  /** Unique id of each scope in `scopes`, so narrowing facts survive shadowing. */
  private scopeIds: number[] = [];
  private nextScopeId = 0;
  /** Reference keys of `собит` bindings; their narrowing carries into closures. */
  private constKeys: Set<string> = new Set();
  /** Names assigned anywhere after their declaration (`х = …`, `х++`, …). */
  private reassignedNames: Set<string> = new Set();
  /** Narrowed types of references at the current point (see `referenceKey`). */
  private narrowed: Facts = new Map();
  /** While positive, diagnostics are dropped (expressions re-inferred for narrowing). */
  private silent = 0;
  private interfaceTable: Map<string, Type> = new Map();
  private typeAliasTable: Map<string, Type> = new Map();
  private functionStack: FunctionContext[] = [];
  /** (source, target) pairs being compared, to stop recursion on recursive types. */
  private assignabilityStack: Array<[Type, Type]> = [];

  private sourceLines: string[] = [];

  private readonly statementHandlers: Record<string, (_statement: Statement) => void> = {
    VariableDeclaration: s => this.checkVariableDeclaration(s as VariableDeclaration),
    FunctionDeclaration: s => this.checkFunctionDeclaration(s as FunctionDeclaration),
    ClassDeclaration: s => this.checkClassDeclaration(s as ClassDeclaration),
    ExpressionStatement: s => this.inferExpressionType((s as ExpressionStatement).expression),
    ExportDeclaration: s => {
      const inner = (s as ExportDeclaration).declaration;
      if (inner) this.checkStatement(inner);
    },
    BlockStatement: s => this.withScope(() => this.checkStatements((s as BlockStatement).body)),
    IfStatement: s => this.checkIfStatement(s as IfStatement),
    WhileStatement: s => this.checkWhileStatement(s as WhileStatement),
    DoWhileStatement: s => this.checkWhileStatement(s as WhileStatement),
    ForStatement: s => this.checkForStatement(s as ForStatement),
    ForInStatement: s => this.checkForInOfStatement(s as ForInStatement, true),
    ForOfStatement: s => this.checkForInOfStatement(s as ForOfStatement, false),
    SwitchStatement: s => this.checkSwitchStatement(s as SwitchStatement),
    TryStatement: s => this.checkTryStatement(s as TryStatement),
    ThrowStatement: s => this.inferExpressionType((s as ThrowStatement).argument),
    ReturnStatement: s => this.checkReturnStatement(s as ReturnStatement),
    NamespaceDeclaration: s =>
      this.withScope(() => this.checkStatements((s as NamespaceDeclaration).body.statements)),
  };

  private readonly expressionHandlers: Record<
    string,
    (_expression: Expression, _targetType?: Type) => Type
  > = {
    Literal: e => this.inferLiteralType(e as Literal),
    Identifier: e => this.inferIdentifierType(e as Identifier),
    ArrayExpression: (e, t) => this.inferArrayExpressionType(e as ArrayExpression, t),
    ObjectExpression: (e, t) => this.inferObjectType(e as ObjectExpression, t),
    CallExpression: e => this.inferCallType(e as CallExpression),
    NewExpression: e => this.inferNewExpressionType(e as NewExpression),
    MemberExpression: e => this.inferMemberType(e as MemberExpression),
    ChainExpression: e => this.inferExpressionType((e as ChainExpression).expression),
    AssignmentExpression: e => this.inferAssignmentType(e as AssignmentExpression),
    BinaryExpression: e => this.inferBinaryType(e as BinaryExpression),
    UnaryExpression: e => this.inferUnaryType(e as UnaryExpression),
    UpdateExpression: e => this.inferNumericOperand((e as UpdateExpression).argument, true),
    TemplateLiteral: e => {
      (e as TemplateLiteral).expressions.forEach(part => this.inferExpressionType(part));
      return { kind: 'primitive', name: 'string' };
    },
    ConditionalExpression: (e, t) => this.inferConditionalType(e as ConditionalExpression, t),
    SequenceExpression: e =>
      (e as SequenceExpression).expressions.reduce<Type>(
        (_, part) => this.inferExpressionType(part),
        UNKNOWN
      ),
    SpreadElement: e => {
      this.inferExpressionType((e as SpreadElement).argument);
      return UNKNOWN;
    },
    AwaitExpression: e =>
      this.unwrapPromise(this.inferExpressionType((e as AwaitExpression).argument)),
    ArrowFunctionExpression: e =>
      this.inferFunctionExpressionType(e as unknown as FunctionLike, true),
    FunctionExpression: e => this.inferFunctionExpressionType(e as unknown as FunctionLike, false),
    ThisExpression: () => this.currentFunction()?.thisType ?? UNKNOWN,
    ImportExpression: e => {
      this.inferExpressionType((e as unknown as { source: Expression }).source);
      return UNKNOWN;
    },
  };

  constructor(source?: string, options: TypeCheckOptions = {}) {
    this.sourceLines = source ? source.split(/\r?\n/) : [];
    this.strict = Boolean(options.strict);
  }

  /**
   * Initialize primitive types in the symbol table
   */
  private initializePrimitiveTypes(): void {
    this.declare('сатр', { kind: 'primitive', name: 'string' });
    this.declare('рақам', { kind: 'primitive', name: 'number' });
    this.declare('мантиқӣ', { kind: 'primitive', name: 'boolean' });
    this.declare('холӣ', { kind: 'primitive', name: 'null' });
  }

  private getSnippet(line: number): string {
    return this.sourceLines[line - 1] ?? '';
  }

  /**
   * Perform type checking on the entire program
   * @param program - The AST program to type check
   * @returns Type checking result with errors and warnings
   */
  public check(program: Program): TypeCheckResult {
    this.errors = [];
    this.warnings = [];
    this.scopes = [new Map()];
    this.scopeIds = [this.nextScopeId++];
    this.constKeys = new Set();
    this.reassignedNames = this.collectReassignedNames(program);
    this.narrowed = new Map();
    this.interfaceTable = new Map();
    this.typeAliasTable = new Map();
    this.functionStack = [];
    this.initializePrimitiveTypes();

    // First pass: collect type definitions and hoist top-level bindings
    this.collectTypeDefinitions(program.body);

    // Second pass: type check statements
    this.checkStatements(program.body);

    return {
      errors: this.errors,
      warnings: this.warnings,
    };
  }

  // ---------------------------------------------------------------------------
  // Scopes
  // ---------------------------------------------------------------------------

  private lookup(name: string): Type | undefined {
    const index = this.scopeIndexOf(name);
    return index === -1 ? undefined : this.scopes[index].get(name);
  }

  /** Index in `scopes` of the innermost scope declaring `name`, or -1. */
  private scopeIndexOf(name: string): number {
    for (let i = this.scopes.length - 1; i >= 0; i--) {
      if (this.scopes[i].has(name)) return i;
    }
    return -1;
  }

  private declare(name: string, type: Type): void {
    this.scopes[this.scopes.length - 1].set(name, type);
    // A (re)declaration starts with the declared type
    this.invalidate(this.bindingKey(this.scopes.length - 1, name));
  }

  private withScope(body: () => void): void {
    this.scopes.push(new Map());
    this.scopeIds.push(this.nextScopeId++);
    try {
      body();
    } finally {
      this.scopes.pop();
      this.scopeIds.pop();
    }
  }

  private currentFunction(): FunctionContext | undefined {
    return this.functionStack[this.functionStack.length - 1];
  }

  // ---------------------------------------------------------------------------
  // Declaration collection and hoisting
  // ---------------------------------------------------------------------------

  private unwrapExport(statement: Statement): Statement {
    if (statement.type === 'ExportDeclaration') {
      return (statement as ExportDeclaration).declaration ?? statement;
    }
    return statement;
  }

  /**
   * Collects the program's interfaces and type aliases. Interfaces and classes
   * are registered as empty shells first so that declaration order doesn't
   * matter for references between them.
   */
  private collectTypeDefinitions(statements: Statement[]): void {
    const declarations = statements.map(s => this.unwrapExport(s));
    const interfaces = declarations.filter(
      (s): s is InterfaceDeclaration => s.type === 'InterfaceDeclaration'
    );
    for (const interfaceDecl of interfaces) {
      if (!this.interfaceTable.has(interfaceDecl.name.name)) {
        this.interfaceTable.set(interfaceDecl.name.name, {
          kind: 'interface',
          name: interfaceDecl.name.name,
          properties: new Map(),
        });
      }
    }
    const classes = this.declareClassShells(declarations);
    for (const statement of declarations) {
      if (statement.type === 'TypeAlias') this.collectTypeAlias(statement as TypeAlias);
    }
    const filled = new Set<InterfaceDeclaration>();
    for (const interfaceDecl of interfaces) {
      this.collectInterface(interfaceDecl, interfaces, filled);
    }
    classes.forEach(classDecl => this.collectClass(classDecl));
  }

  /**
   * Hoists the bindings a statement list declares into the current scope:
   * classes and functions with their full types, variables, namespaces and
   * imports as placeholders that the statement itself refines when checked.
   */
  private hoistDeclarations(statements: Statement[]): void {
    const declarations = statements.map(s => this.unwrapExport(s));
    const classes = declarations.filter(
      (s): s is ClassDeclaration =>
        s.type === 'ClassDeclaration' && !this.isDeclaredHere(s as ClassDeclaration)
    );
    classes.forEach(classDecl => this.declareClassShell(classDecl));
    classes.forEach(classDecl => this.collectClass(classDecl));

    for (const statement of declarations) {
      switch (statement.type) {
        case 'FunctionDeclaration':
          this.hoistFunctionDeclaration(statement as FunctionDeclaration);
          break;
        case 'VariableDeclaration':
          this.hoistVariableDeclaration(statement as VariableDeclaration);
          break;
        case 'NamespaceDeclaration':
          this.declare((statement as NamespaceDeclaration).name.name, UNKNOWN);
          break;
        case 'ImportDeclaration':
          this.collectImport(statement as ImportDeclaration);
          break;
      }
    }
  }

  private isDeclaredHere(classDecl: ClassDeclaration): boolean {
    const existing = this.scopes[this.scopes.length - 1].get(classDecl.name.name);
    return existing?.kind === 'class' && existing.properties !== undefined;
  }

  private declareClassShells(declarations: Statement[]): ClassDeclaration[] {
    const classes = declarations.filter(
      (s): s is ClassDeclaration => s.type === 'ClassDeclaration'
    );
    classes.forEach(classDecl => this.declareClassShell(classDecl));
    return classes;
  }

  private declareClassShell(classDecl: ClassDeclaration): void {
    this.declare(classDecl.name.name, {
      kind: 'class',
      name: classDecl.name.name,
      properties: new Map(),
    });
  }

  private collectImport(importDecl: ImportDeclaration): void {
    // Register imported local names as 'unknown' so references don't trip the
    // undefined-identifier diagnostic. Cross-module type inference isn't wired.
    for (const spec of importDecl.specifiers) {
      this.declare(spec.local.name, UNKNOWN);
    }
  }

  private hoistFunctionDeclaration(funcDecl: FunctionDeclaration): void {
    this.declare(funcDecl.name.name, this.buildFunctionType(funcDecl.name.name, funcDecl));
  }

  private hoistVariableDeclaration(varDecl: VariableDeclaration): void {
    if (varDecl.identifier.type === 'Identifier') {
      const declared = varDecl.typeAnnotation
        ? this.resolveTypeNode(varDecl.typeAnnotation.typeAnnotation)
        : UNKNOWN;
      this.declare(varDecl.identifier.name, declared);
    } else {
      this.bindPatternTypes(varDecl.identifier, UNKNOWN);
    }
  }

  private buildFunctionType(name: string | undefined, fn: Omit<FunctionLike, 'body'>): Type {
    const paramTypes: Type[] = [];
    const paramNames: string[] = [];
    const paramOptional: boolean[] = [];
    for (const param of fn.params) {
      paramTypes.push(this.resolveParameterType(param));
      paramNames.push(param.name?.name ?? '');
      paramOptional.push(Boolean(param.optional) || param.defaultValue !== undefined);
    }
    const returnType: Type = fn.returnType
      ? this.resolveTypeNode(fn.returnType.typeAnnotation)
      : UNKNOWN;
    return {
      kind: 'function',
      name,
      returnType,
      paramTypes,
      paramNames,
      paramOptional,
      hasRestParam: fn.params.length > 0 && Boolean(fn.params[fn.params.length - 1].rest),
    };
  }

  private resolveParameterType(param: Parameter): Type {
    if (param.typeAnnotation) return this.resolveTypeNode(param.typeAnnotation.typeAnnotation);
    return param.rest ? { kind: 'array', elementType: UNKNOWN } : UNKNOWN;
  }

  private collectInterface(
    interfaceDecl: InterfaceDeclaration,
    allDecls: InterfaceDeclaration[],
    filled: Set<InterfaceDeclaration>
  ): void {
    if (filled.has(interfaceDecl)) return;
    filled.add(interfaceDecl);
    const interfaceType = this.interfaceTable.get(interfaceDecl.name.name)!;
    const properties = interfaceType.properties!;

    // Inherited members first, so the interface's own members override them
    for (const parentNode of interfaceDecl.extends ?? []) {
      const parentName = (parentNode as Identifier | GenericType).name;
      const name = typeof parentName === 'string' ? parentName : parentName?.name;
      allDecls
        .filter(d => d.name.name === name)
        .forEach(d => this.collectInterface(d, allDecls, filled));
      const parent = this.resolveTypeNode(parentNode);
      for (const [key, prop] of this.getAllProperties(parent)) {
        if (!properties.has(key)) properties.set(key, prop);
      }
      interfaceType.indexType ??= parent.indexType;
      interfaceType.open ||= parent.open || !['interface', 'object', 'class'].includes(parent.kind);
    }

    this.collectPropertySignatures(interfaceDecl.body.properties, interfaceType);
  }

  private collectPropertySignatures(signatures: PropertySignature[], target: Type): void {
    for (const prop of signatures ?? []) {
      if (!prop.key || !prop.typeAnnotation) continue;
      const type = this.resolveTypeNode(prop.typeAnnotation.typeAnnotation);
      if (prop.key.name === INDEX_SIGNATURE_KEY) {
        target.indexType = type;
      } else {
        target.properties!.set(prop.key.name, { type, optional: prop.optional });
      }
    }
  }

  private collectTypeAlias(typeAlias: TypeAlias): void {
    const aliasType = this.resolveTypeNode(typeAlias.typeAnnotation.typeAnnotation);
    this.typeAliasTable.set(typeAlias.name.name, aliasType);
  }

  /**
   * Fills the class shell registered under the class name with its instance
   * members and links its base class by name.
   */
  private collectClass(classDecl: ClassDeclaration): void {
    const classType = this.lookup(classDecl.name.name)!;
    const properties = classType.properties!;
    classType.staticMembers = new Set();

    for (const member of classDecl.body.body) {
      if (member.static) {
        const key = (member as PropertyDefinition | MethodDefinition).key;
        if (key?.name) classType.staticMembers.add(key.name);
        continue;
      }
      if (member.type === 'PropertyDefinition') {
        const prop = member as PropertyDefinition;
        const propType = prop.typeAnnotation
          ? this.resolveTypeNode(prop.typeAnnotation.typeAnnotation)
          : UNKNOWN;
        properties.set(prop.key.name, { type: propType, optional: Boolean(prop.optional) });
      } else if (member.type === 'MethodDefinition') {
        this.collectMethod(member as MethodDefinition, properties);
      }
    }

    classType.implicitMembers = this.collectImplicitMembers(classDecl);

    if (classDecl.superClass) {
      const parent = this.lookup(classDecl.superClass.name);
      if (parent?.kind === 'class') {
        classType.baseType = parent;
      } else {
        // A built-in or imported base: its members are unknown
        classType.open = true;
      }
    }
  }

  /**
   * Members a class creates by assignment (`ин.ном = ном;`) without declaring
   * them, as JavaScript classes do.
   */
  private collectImplicitMembers(classDecl: ClassDeclaration): Set<string> {
    const names = new Set<string>();
    const visit = (node: unknown): void => {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) {
        node.forEach(visit);
        return;
      }
      const record = node as Record<string, unknown>;
      // Nested functions and classes have their own `ин`
      if (record.type === 'FunctionExpression' || record.type === 'FunctionDeclaration') return;
      if (record.type === 'ClassDeclaration') return;
      if (record.type === 'AssignmentExpression') {
        const left = (record as unknown as AssignmentExpression).left as MemberExpression;
        if (
          left.type === 'MemberExpression' &&
          left.object.type === 'ThisExpression' &&
          !left.computed &&
          left.property.type === 'Identifier'
        ) {
          names.add((left.property as Identifier).name);
        }
      }
      Object.values(record).forEach(value => {
        if (value && typeof value === 'object') visit(value);
      });
    };
    for (const member of classDecl.body.body) {
      if (member.type === 'MethodDefinition') {
        visit((member as MethodDefinition).value.body);
      } else if (member.type === 'PropertyDefinition') {
        visit((member as PropertyDefinition).value);
      }
    }
    return names;
  }

  private collectMethod(method: MethodDefinition, properties: Map<string, PropertyType>): void {
    if (method.kind === 'constructor') return;
    const name = method.key.name;
    const methodType = this.buildFunctionType(name, method.value);
    if (method.kind === 'get') {
      properties.set(name, { type: methodType.returnType ?? UNKNOWN, optional: false });
    } else if (method.kind === 'set') {
      if (!properties.has(name)) {
        properties.set(name, { type: methodType.paramTypes?.[0] ?? UNKNOWN, optional: false });
      }
    } else {
      properties.set(name, { type: methodType, optional: false });
    }
  }

  // ---------------------------------------------------------------------------
  // Statements
  // ---------------------------------------------------------------------------

  private checkStatements(statements: Statement[]): void {
    this.hoistDeclarations(statements);
    for (const statement of statements) {
      this.checkStatement(statement);
    }
  }

  private checkStatement(statement: Statement): void {
    this.statementHandlers[statement.type]?.(statement);
  }

  /** Checks a statement used as a body (`агар (…) х = 1;`) in its own scope. */
  private checkBody(statement: Statement | undefined): void {
    if (!statement) return;
    if (statement.type === 'BlockStatement') {
      this.checkStatement(statement);
    } else {
      this.withScope(() => this.checkStatements([statement]));
    }
  }

  private checkIfStatement(statement: IfStatement): void {
    this.inferExpressionType(statement.test);
    const whenTrue = this.narrowingsFor(statement.test, true);
    const whenFalse = this.narrowingsFor(statement.test, false);
    const before = this.narrowed;

    this.narrowed = new Map(before);
    this.applyFacts(whenTrue);
    this.checkBody(statement.consequent);
    const afterThen = this.narrowed;

    this.narrowed = new Map(before);
    this.applyFacts(whenFalse);
    this.checkBody(statement.alternate);
    const afterElse = this.narrowed;

    // A branch that always leaves (`бозгашт`, `партофтан`, …) doesn't reach the code after the `агар`
    const thenExits = this.alwaysExits(statement.consequent);
    const elseExits = this.alwaysExits(statement.alternate);
    if (thenExits && !elseExits) {
      this.narrowed = afterElse;
    } else if (elseExits && !thenExits) {
      this.narrowed = afterThen;
    } else {
      this.narrowed = this.joinNarrowed(afterThen, afterElse);
    }
  }

  private checkWhileStatement(statement: WhileStatement): void {
    // Assignments in the body may run before the test is evaluated again
    this.invalidateAssignedIn(statement.test, statement.body);
    const entry = new Map(this.narrowed);
    this.inferExpressionType(statement.test);
    this.applyFacts(this.narrowingsFor(statement.test, true));
    this.checkBody(statement.body);
    this.narrowed = entry;
    if (!this.containsLoopExit(statement.body)) {
      this.applyFacts(this.narrowingsFor(statement.test, false));
    }
  }

  private checkForStatement(statement: ForStatement): void {
    this.withScope(() => {
      const init = statement.init as Statement | Expression | null;
      if (init) {
        if (init.type === 'VariableDeclaration' || init.type === 'ExpressionStatement') {
          this.checkStatements([init]);
        } else {
          this.inferExpressionType(init);
        }
      }
      this.invalidateAssignedIn(statement.test, statement.update, statement.body);
      const entry = new Map(this.narrowed);
      if (statement.test) {
        this.inferExpressionType(statement.test);
        this.applyFacts(this.narrowingsFor(statement.test, true));
      }
      this.checkBody(statement.body);
      if (statement.update) this.inferExpressionType(statement.update);
      this.narrowed = entry;
      if (statement.test && !this.containsLoopExit(statement.body)) {
        this.applyFacts(this.narrowingsFor(statement.test, false));
      }
    });
  }

  private checkForInOfStatement(
    statement: ForInStatement | ForOfStatement,
    isForIn: boolean
  ): void {
    this.withScope(() => {
      const iterated = this.inferExpressionType(statement.right);
      this.invalidateAssignedIn(statement.left, statement.body);
      const entry = new Map(this.narrowed);
      const left = statement.left;
      if (left.type === 'VariableDeclaration') {
        const varDecl = left as VariableDeclaration;
        const elementType: Type = isForIn
          ? { kind: 'primitive', name: 'string' }
          : this.iterationElementType(iterated);
        const bound = varDecl.typeAnnotation
          ? this.resolveTypeNode(varDecl.typeAnnotation.typeAnnotation)
          : this.widenType(elementType);
        this.bindPatternTypes(varDecl.identifier, bound);
      } else {
        this.inferExpressionType(left);
      }
      this.checkBody(statement.body);
      this.narrowed = entry;
    });
  }

  private iterationElementType(type: Type): Type {
    if (type.kind === 'array') return type.elementType ?? UNKNOWN;
    if (type.kind === 'tuple' && type.types && type.types.length > 0) {
      return { kind: 'union', types: type.types };
    }
    if (this.isStringType(type)) return { kind: 'primitive', name: 'string' };
    return UNKNOWN;
  }

  private checkSwitchStatement(statement: SwitchStatement): void {
    this.inferExpressionType(statement.discriminant);
    // Cases may fall through, so none of them narrows the code after the switch
    this.invalidateAssignedIn(statement.cases);
    const entry = new Map(this.narrowed);
    // All cases share one block scope
    this.withScope(() => {
      this.hoistDeclarations(statement.cases.flatMap(c => c.consequent));
      for (const switchCase of statement.cases) {
        this.narrowed = new Map(entry);
        if (switchCase.test) this.inferExpressionType(switchCase.test);
        switchCase.consequent.forEach(s => this.checkStatement(s));
      }
    });
    this.narrowed = entry;
  }

  private checkTryStatement(statement: TryStatement): void {
    const entry = new Map(this.narrowed);
    this.checkStatement(statement.block);
    let after = this.narrowed;
    const handler = statement.handler;
    if (handler) {
      // The handler may start anywhere in the block
      this.narrowed = new Map(entry);
      this.invalidateAssignedIn(statement.block);
      const handlerEntry = this.narrowed;
      this.withScope(() => {
        if (handler.param) this.bindPatternTypes(handler.param, UNKNOWN);
        this.checkStatements(handler.body.body);
      });
      if (!this.alwaysExits(handler.body)) {
        after = this.alwaysExits(statement.block)
          ? this.narrowed
          : this.joinNarrowed(after, this.narrowed);
      }
      this.narrowed = handlerEntry;
    }
    if (statement.finalizer) {
      this.narrowed = new Map(entry);
      this.invalidateAssignedIn(statement.block, handler);
      this.checkStatement(statement.finalizer);
      const afterFinally = this.narrowed;
      this.narrowed = after;
      this.invalidateAssignedIn(statement.finalizer);
      this.applyFacts(afterFinally);
      return;
    }
    this.narrowed = after;
  }

  private checkReturnStatement(statement: ReturnStatement): void {
    if (!statement.argument) return;
    const expected = this.currentFunction()?.returnType;
    const actual = this.inferExpressionType(statement.argument, expected);
    if (!expected) return;
    this.checkAssignable(statement.argument, actual, expected, (source, target) =>
      this.addError(
        TypeCheckErrorCode.TypeMismatch,
        `Type '${source}' is not assignable to return type '${target}'`,
        statement.argument!.line ?? statement.line,
        statement.argument!.column ?? statement.column
      )
    );
  }

  private checkVariableDeclaration(varDecl: VariableDeclaration): void {
    let declaredType: Type | undefined;

    // Get declared type if present
    if (varDecl.typeAnnotation) {
      const annotation: TypeAnnotation = varDecl.typeAnnotation;
      declaredType = this.resolveTypeNode(annotation.typeAnnotation);
    }

    // Get inferred type from initializer
    let inferredType: Type | undefined;
    if (varDecl.init) {
      const init = varDecl.init;
      inferredType = this.inferExpressionType(init, declaredType);
      if (declaredType) {
        this.checkAssignable(init, inferredType, declaredType, (source, target) =>
          this.addError(
            TypeCheckErrorCode.TypeMismatch,
            `Type '${source}' is not assignable to type '${target}'`,
            init.line ?? varDecl.line,
            init.column ?? varDecl.column
          )
        );
      }
    }

    // Store variable type in the current scope. Unannotated bindings get the
    // widened type of their initializer (`тағйирёбанда х = 0` is a рақам).
    const finalType =
      declaredType ??
      (inferredType ? this.widenType(inferredType, varDecl.kind === 'СОБИТ') : UNKNOWN);
    this.bindPatternTypes(varDecl.identifier, finalType);

    if (varDecl.identifier.type === 'Identifier') {
      const key = this.referenceKey(varDecl.identifier);
      if (key && varDecl.kind === 'СОБИТ') this.constKeys.add(key);
      // `тағ х: Г | холӣ = нав Г();` starts out as a Г
      const narrowed =
        key && declaredType && inferredType
          ? this.assignmentNarrowing(declaredType, inferredType)
          : undefined;
      if (key && narrowed) this.narrowed.set(key, narrowed);
    }
  }

  private bindPatternTypes(
    pattern:
      | Identifier
      | ArrayPattern
      | ObjectPattern
      | AssignmentPattern
      | SpreadElement
      | RestElement,
    type: Type
  ): void {
    switch (pattern.type) {
      case 'Identifier':
        this.declare((pattern as Identifier).name, type);
        break;
      case 'ArrayPattern':
        this.bindArrayPatternTypes(pattern as ArrayPattern, type);
        break;
      case 'ObjectPattern':
        this.bindObjectPatternTypes(pattern as ObjectPattern, type);
        break;
      case 'AssignmentPattern': {
        const assignment = pattern as AssignmentPattern;
        this.inferExpressionType(assignment.right);
        this.bindPatternTypes(assignment.left, type);
        break;
      }
      case 'SpreadElement':
      case 'RestElement':
        this.bindPatternTypes(
          (pattern as SpreadElement).argument as Identifier | ArrayPattern | ObjectPattern,
          type
        );
        break;
    }
  }

  private bindArrayPatternTypes(pattern: ArrayPattern, type: Type): void {
    const elementType = type.kind === 'array' ? (type.elementType ?? UNKNOWN) : UNKNOWN;
    pattern.elements.forEach((element, index) => {
      if (!element) return;
      if (element.type === 'SpreadElement' || (element.type as string) === 'RestElement') {
        this.bindPatternTypes(element, { kind: 'array', elementType });
      } else if (type.kind === 'tuple') {
        this.bindPatternTypes(element, type.types?.[index] ?? UNKNOWN);
      } else {
        this.bindPatternTypes(element, elementType);
      }
    });
  }

  private bindObjectPatternTypes(pattern: ObjectPattern, type: Type): void {
    const properties = this.getAllProperties(type);
    for (const prop of pattern.properties) {
      if (prop.type !== 'PropertyPattern') {
        this.bindPatternTypes(prop as SpreadElement, UNKNOWN);
        continue;
      }
      const keyName = prop.key.type === 'Identifier' ? prop.key.name : String(prop.key.value);
      const propType = prop.computed ? undefined : properties.get(keyName);
      // Shorthand `{ а }` may arrive without a value from older parsers
      const target = prop.value ?? (prop.key.type === 'Identifier' ? prop.key : undefined);
      if (target) this.bindPatternTypes(target, propType?.type ?? UNKNOWN);
    }
  }

  private checkFunctionDeclaration(funcDecl: FunctionDeclaration): void {
    // Reuse the signature hoisted into this scope
    const hoisted = this.scopes[this.scopes.length - 1].get(funcDecl.name.name);
    const functionType =
      hoisted?.kind === 'function' ? hoisted : this.buildFunctionType(funcDecl.name.name, funcDecl);
    this.checkFunctionBody(funcDecl, functionType, undefined);
  }

  /**
   * Checks parameters (defaults, destructuring) and the body of a function in
   * a new scope, with `бозгашт` checked against the declared return type.
   */
  private checkFunctionBody(
    fn: FunctionLike,
    functionType: Type,
    thisType?: Type,
    closure = false
  ): void {
    const isAsync = Boolean(fn.async ?? fn.isAsync);
    this.functionStack.push({
      returnType: this.expectedReturnType(functionType.returnType, isAsync),
      thisType,
    });
    // The body may run at any later time: a closure only keeps what is known
    // about variables that are never reassigned.
    const outer = this.narrowed;
    this.narrowed = new Map(
      closure ? [...outer].filter(([key]) => this.isNeverReassigned(key)) : []
    );
    this.withScope(() => {
      fn.params.forEach((param, index) =>
        this.bindParameter(param, functionType.paramTypes?.[index] ?? UNKNOWN)
      );
      if (fn.body.type === 'BlockStatement') {
        this.checkStatements((fn.body as BlockStatement).body);
      } else {
        this.checkReturnStatement({
          type: 'ReturnStatement',
          argument: fn.body,
          line: fn.body.line,
          column: fn.body.column,
        } as ReturnStatement);
      }
    });
    this.narrowed = outer;
    this.functionStack.pop();
  }

  private bindParameter(param: Parameter, paramType: Type): void {
    if (param.defaultValue) {
      const defaultValue = param.defaultValue;
      const defaultType = this.inferExpressionType(defaultValue, paramType);
      this.checkAssignable(defaultValue, defaultType, paramType, (source, target) =>
        this.addError(
          TypeCheckErrorCode.TypeMismatch,
          `Type '${source}' is not assignable to type '${target}'`,
          defaultValue.line ?? param.line,
          defaultValue.column ?? param.column
        )
      );
    }
    // `а?: рақам` is `рақам | беқимат` inside the function
    const boundType =
      param.optional && !param.defaultValue ? this.optionalType(paramType) : paramType;
    if (param.pattern) {
      this.bindPatternTypes(param.pattern, boundType);
    } else {
      if (param.name) this.declare(param.name.name, boundType);
    }
  }

  private expectedReturnType(returnType: Type | undefined, isAsync: boolean): Type | undefined {
    let expected = returnType;
    if (expected && isAsync) {
      expected = this.isPromiseType(expected) ? expected.typeParameters?.[0] : undefined;
    }
    if (!expected || expected.kind === 'unknown') return undefined;
    if (expected.kind === 'primitive' && ['void', 'any', 'unknown'].includes(expected.name!)) {
      return undefined;
    }
    return expected;
  }

  private checkClassDeclaration(classDecl: ClassDeclaration): void {
    // Phase 2: Validate class relationships, property types and method bodies
    this.validateSuperClass(classDecl);
    const classType = this.lookup(classDecl.name.name);
    for (const member of classDecl.body.body) {
      const thisType = member.static ? undefined : classType;
      if (member.type === 'PropertyDefinition') {
        this.functionStack.push({ thisType });
        this.validatePropertyDefinition(member as PropertyDefinition);
        this.functionStack.pop();
      } else if (member.type === 'MethodDefinition') {
        const method = member as MethodDefinition;
        const methodType = this.buildFunctionType(method.key.name, method.value);
        this.checkFunctionBody(method.value, methodType, thisType);
      }
    }
  }

  private validateSuperClass(classDecl: ClassDeclaration): void {
    if (!classDecl.superClass) return;

    const parentName = classDecl.superClass.name;
    const parentType = this.lookup(parentName);
    const interfaceType = this.interfaceTable.get(parentName);

    if (interfaceType) {
      this.addError(
        TypeCheckErrorCode.InvalidExtends,
        `Class '${classDecl.name.name}' can only extend other classes, but '${parentName}' is an interface`,
        classDecl.line,
        classDecl.column
      );
      return;
    }

    if (!parentType) {
      if (!this.isBuiltinValueName(parentName)) {
        this.addError(
          TypeCheckErrorCode.ClassNotFound,
          `Base class '${parentName}' not found`,
          classDecl.line,
          classDecl.column
        );
      }
      return;
    }

    // Imported or otherwise untyped bases can't be validated
    if (parentType.kind === 'unknown') return;

    if (parentType.kind !== 'class') {
      this.addInvalidExtendsError(classDecl, parentType);
      return;
    }

    this.checkCircularInheritance(
      classDecl.name.name,
      parentType,
      classDecl.line,
      classDecl.column
    );
  }

  private addInvalidExtendsError(classDecl: ClassDeclaration, parentType: Type): void {
    const kindDescription =
      parentType.kind === 'interface' ? 'an interface' : `a ${parentType.kind}`;
    this.addError(
      TypeCheckErrorCode.InvalidExtends,
      `Class '${classDecl.name.name}' can only extend other classes, but '${classDecl.superClass!.name}' is ${kindDescription}`,
      classDecl.line,
      classDecl.column
    );
  }

  private validatePropertyDefinition(prop: PropertyDefinition): void {
    if (!prop.value) return;
    const value = prop.value;

    const declaredType = prop.typeAnnotation
      ? this.resolveTypeNode(prop.typeAnnotation.typeAnnotation)
      : undefined;
    const inferredType = this.inferExpressionType(value, declaredType);
    if (!declaredType) return;

    this.checkAssignable(value, inferredType, declaredType, (source, target) =>
      this.addError(
        TypeCheckErrorCode.TypeMismatch,
        `Type '${source}' is not assignable to type '${target}' for property '${prop.key.name}'`,
        prop.line,
        prop.column
      )
    );
  }

  /**
   * Check for circular inheritance in class hierarchy by walking the base
   * chain from the parent; reaching the class itself means a cycle.
   */
  private checkCircularInheritance(
    className: string,
    parentType: Type,
    line: number,
    column: number
  ): void {
    const visited = new Set<string>();
    for (let current: Type | undefined = parentType; current; current = current.baseType) {
      if (current.name === className) {
        const message =
          current === parentType
            ? `Circular inheritance detected: class '${className}' cannot extend itself`
            : `Circular inheritance detected involving class '${className}'`;
        this.addError(TypeCheckErrorCode.CircularInheritance, message, line, column);
        return;
      }
      if (visited.has(current.name!)) return;
      visited.add(current.name!);
    }
  }

  // ---------------------------------------------------------------------------
  // Type annotations
  // ---------------------------------------------------------------------------

  private resolveTypeNode(typeNode: TypeNode): Type {
    switch (typeNode.type) {
      case 'PrimitiveType':
        return this.resolvePrimitiveType(typeNode as PrimitiveType);
      case 'ArrayType':
        return this.resolveArrayType(typeNode as ArrayType);
      case 'UnionType':
        return this.resolveUnionType(typeNode as UnionType);
      case 'IntersectionType':
        return this.resolveIntersectionType(typeNode as IntersectionType);
      case 'TupleType':
        return this.resolveTupleType(typeNode as TupleType);
      case 'GenericType':
        return this.resolveGenericType(typeNode as GenericType);
      case 'UniqueType':
        return this.resolveUniqueType(typeNode as UniqueType);
      case 'LiteralType':
        return this.resolveLiteralType(typeNode as LiteralType);
      case 'ObjectType':
        return this.resolveObjectType(typeNode as ObjectType);
      case 'Identifier':
        return this.resolveIdentifierType(typeNode as Identifier);
      case 'FunctionType': {
        const fnType = typeNode as FunctionType;
        return this.buildFunctionType(undefined, {
          params: fnType.parameters,
          returnType: {
            type: 'TypeAnnotation',
            typeAnnotation: fnType.returnType,
            line: 0,
            column: 0,
          },
        });
      }
      default:
        return UNKNOWN;
    }
  }

  private resolvePrimitiveType(primitiveType: PrimitiveType): Type {
    return { kind: 'primitive', name: this.mapTajikToPrimitive(primitiveType.name) };
  }

  private resolveLiteralType(literalType: LiteralType): Type {
    return { kind: 'literal', value: literalType.value };
  }

  private resolveArrayType(arrayType: ArrayType): Type {
    return {
      kind: 'array',
      elementType: this.resolveTypeNode(arrayType.elementType),
    };
  }

  private resolveUnionType(unionType: UnionType): Type {
    return {
      kind: 'union',
      types: unionType.types.map(t => this.resolveTypeNode(t)),
    };
  }

  private resolveIntersectionType(intersectionType: IntersectionType): Type {
    return {
      kind: 'intersection',
      types: intersectionType.types.map(t => this.resolveTypeNode(t)),
    };
  }

  private resolveTupleType(tupleType: TupleType): Type {
    return {
      kind: 'tuple',
      types: tupleType.elementTypes.map(t => this.resolveTypeNode(t)),
    };
  }

  private resolveObjectType(objectType: ObjectType): Type {
    const type: Type = { kind: 'object', properties: new Map() };
    this.collectPropertySignatures(objectType.properties, type);
    return type;
  }

  private resolveGenericType(genericType: GenericType): Type {
    const baseName = genericType.name.name;
    const typeParams = (genericType.typeParameters ?? []).map(tp => this.resolveTypeNode(tp));

    if (PROMISE_NAMES.has(baseName)) {
      return { kind: 'generic', name: 'Promise', typeParameters: typeParams };
    }

    const baseType = this.resolveNamedType(baseName);

    // Add type parameters for generic types
    if (typeParams.length > 0) {
      // For Map and Set, explicitly mark as generic
      if (baseName === 'Map' || baseName === 'Set') {
        return {
          kind: 'generic',
          name: baseName,
          typeParameters: typeParams,
        };
      }

      // For type aliases and other generics, preserve the base type kind and add type parameters
      return {
        ...baseType,
        typeParameters: typeParams,
      };
    }
    return baseType;
  }

  private resolveUniqueType(uniqueType: UniqueType): Type {
    return { kind: 'unique', baseType: this.resolveTypeNode(uniqueType.baseType) };
  }

  private resolveIdentifierType(identifierType: Identifier): Type {
    if (PROMISE_NAMES.has(identifierType.name)) {
      return { kind: 'generic', name: 'Promise', typeParameters: [] };
    }
    return this.resolveNamedType(identifierType.name);
  }

  private resolveNamedType(typeName: string): Type {
    // Check if it's a known interface or type alias
    const interfaceType = this.interfaceTable.get(typeName);
    if (interfaceType) {
      return interfaceType;
    }

    const aliasType = this.typeAliasTable.get(typeName);
    if (aliasType) {
      return aliasType;
    }

    // Check if it's a class type
    const classType = this.lookup(typeName);
    if (classType && classType.kind === 'class') {
      return classType;
    }

    // Unknown type
    return { kind: 'unknown', name: typeName };
  }

  private mapTajikToPrimitive(tajikType: string): string {
    switch (tajikType) {
      case 'сатр':
        return 'string';
      case 'рақам':
        return 'number';
      case 'мантиқӣ':
        return 'boolean';
      case 'холӣ':
        return 'null';
      case 'беқимат':
        return 'undefined';
      case 'ҳар':
        return 'any';
      case 'ношинос':
        return 'unknown';
      case 'абадан':
        return 'never';
      case 'беджавоб':
        return 'void';
      case 'объект':
        return 'object';
      default:
        return 'unknown';
    }
  }

  // ---------------------------------------------------------------------------
  // Expressions
  // ---------------------------------------------------------------------------

  private inferExpressionType(expression: Expression, targetType?: Type): Type {
    const handler = this.expressionHandlers[expression.type];
    return handler ? handler(expression, targetType) : UNKNOWN;
  }

  private inferLiteralType(literal: Literal): Type {
    if (typeof literal.value === 'number' && /n$/.test(literal.raw ?? '')) {
      // BigInt literal (`10n`): not a рақам
      return UNKNOWN;
    }
    if (
      typeof literal.value === 'string' ||
      typeof literal.value === 'number' ||
      typeof literal.value === 'boolean'
    ) {
      // Return as literal type for better type inference
      return { kind: 'literal', value: literal.value };
    } else if (literal.value === null) {
      return { kind: 'primitive', name: 'null' };
    }
    return UNKNOWN;
  }

  private isBuiltinValueName(name: string): boolean {
    return TypeChecker.BUILTIN_VALUE_NAMES.has(name) || name in global;
  }

  private inferIdentifierType(identifier: Identifier): Type {
    const sym = this.lookup(identifier.name);
    if (sym) {
      const key = this.referenceKey(identifier);
      return (key ? this.narrowed.get(key) : undefined) ?? sym;
    }
    if (identifier.name === 'беқимат' || identifier.name === 'undefined') return UNDEFINED_TYPE;
    // Empty names are parser error-recovery placeholders
    if (!identifier.name || this.isBuiltinValueName(identifier.name)) {
      return UNKNOWN;
    }
    this.addError(
      TypeCheckErrorCode.UndefinedIdentifier,
      `Variable '${identifier.name}' is not defined`,
      identifier.line,
      identifier.column
    );
    return UNKNOWN;
  }

  private inferTupleTypeFromTarget(arrayExpr: ArrayExpression, targetTypes: Type[]): Type {
    const inferredTypes: Type[] = [];
    for (let i = 0; i < arrayExpr.elements.length; i++) {
      const element = arrayExpr.elements[i];
      const targetElementType = targetTypes[i] || UNKNOWN;
      const inferredType = this.inferExpressionType(element, targetElementType);
      inferredTypes.push(inferredType);
    }
    return { kind: 'tuple', types: inferredTypes };
  }

  private unifyElementTypes(elementTypes: Type[]): Type {
    const firstType = elementTypes[0];
    const baseType = this.getBaseType(firstType);

    // Check if all elements have the same base type
    const allSameBase = elementTypes.every((t: Type) => {
      const tBase = this.getBaseType(t);
      return this.isExactMatch(tBase, baseType);
    });

    if (allSameBase) {
      return baseType;
    }

    // Mixed types: array of union type
    return { kind: 'union', types: elementTypes };
  }

  private inferArrayExpressionType(arrayExpr: ArrayExpression, contextType?: Type): Type {
    const elements = arrayExpr.elements.filter(Boolean);
    const hasSpread = elements.some(e => e.type === 'SpreadElement');
    const targetType = this.arrayContextType(contextType, elements.length);

    // If target type is a tuple, use bidirectional inference
    if (targetType && targetType.kind === 'tuple' && targetType.types && !hasSpread) {
      return this.inferTupleTypeFromTarget(arrayExpr, targetType.types);
    }

    const elementTarget = targetType?.kind === 'array' ? targetType.elementType : undefined;
    const elementTypes = elements.map(element =>
      element.type === 'SpreadElement'
        ? this.iterationElementType(this.inferExpressionType((element as SpreadElement).argument))
        : this.inferExpressionType(element, elementTarget)
    );

    if (elementTypes.length === 0 || elementTypes.some(t => t.kind === 'unknown')) {
      return { kind: 'array', elementType: UNKNOWN };
    }

    // With a contextual array type, keep each element's own type so that
    // assignability checks every element against the target element type
    if (elementTarget) {
      const elementType = elementTypes.length === 1 ? elementTypes[0] : this.unionOf(elementTypes);
      return { kind: 'array', elementType };
    }

    return { kind: 'array', elementType: this.unifyElementTypes(elementTypes) };
  }

  /**
   * Picks the member of a union target that contextually types an array
   * literal: a tuple of matching length, else an array type.
   */
  private arrayContextType(targetType: Type | undefined, length: number): Type | undefined {
    if (targetType?.kind !== 'union' || !targetType.types) return targetType;
    return (
      targetType.types.find(t => t.kind === 'tuple' && t.types?.length === length) ??
      targetType.types.find(t => t.kind === 'array')
    );
  }

  /**
   * Get the base type of a type, converting literals to their base primitives
   * E.g., { kind: 'literal', value: 5 } -> { kind: 'primitive', name: 'number' }
   */
  private getBaseType(type: Type): Type {
    if (type.kind === 'literal') {
      const baseTypeName =
        typeof type.value === 'string'
          ? 'string'
          : typeof type.value === 'number'
            ? 'number'
            : typeof type.value === 'boolean'
              ? 'boolean'
              : 'null';
      return { kind: 'primitive', name: baseTypeName };
    }
    return type;
  }

  /**
   * Type of a binding without annotation: literals become their primitive
   * (except for `собит` bindings), `холӣ`/`беқимат` become unknown, and
   * object/array members are widened since they stay mutable.
   */
  private widenType(type: Type, keepLiteral = false): Type {
    switch (type.kind) {
      case 'literal':
        return keepLiteral ? type : this.getBaseType(type);
      case 'primitive':
        return type.name === 'null' || type.name === 'undefined' ? UNKNOWN : type;
      case 'array':
        return { kind: 'array', elementType: this.widenType(type.elementType ?? UNKNOWN) };
      case 'union':
        // `Г | холӣ` stays nullable: only a binding of plain `холӣ` is widened
        return {
          kind: 'union',
          types: type.types!.map(t => (this.isNullishType(t) ? t : this.widenType(t))),
        };
      case 'object': {
        const properties = new Map<string, PropertyType>();
        for (const [key, prop] of type.properties ?? []) {
          properties.set(key, { type: this.widenType(prop.type), optional: prop.optional });
        }
        return {
          kind: 'object',
          properties,
          ...(type.open && { open: true }),
          ...(type.fromLiteral && { fromLiteral: true }),
        };
      }
      default:
        return type;
    }
  }

  private inferObjectType(objExpr: ObjectExpression, targetType?: Type): Type {
    const targetProperties = targetType ? this.getAllProperties(targetType) : new Map();
    const properties = new Map<string, PropertyType>();
    // Spread and computed keys contribute members we can't name statically
    let open = false;

    for (const prop of objExpr.properties ?? []) {
      if (prop.type === 'SpreadElement') {
        this.inferExpressionType((prop as SpreadElement).argument);
        open = true;
        continue;
      }
      if (prop.computed) {
        this.inferExpressionType(prop.key);
        open = true;
      }
      const value = prop.value ?? (prop.key.type === 'Identifier' ? prop.key : undefined);
      if (!value) continue;
      const keyName = this.propertyKeyName(prop.key);
      const valueType = this.inferExpressionType(value, targetProperties.get(keyName)?.type);
      if (!prop.computed) {
        properties.set(keyName, { type: valueType, optional: false });
      }
    }

    // Like JavaScript objects, those built from a literal may gain members later
    return open ? UNKNOWN : { kind: 'object', properties, fromLiteral: true };
  }

  private propertyKeyName(key: Identifier | Literal): string {
    return key.type === 'Identifier' ? (key as Identifier).name : String((key as Literal).value);
  }

  private inferFunctionExpressionType(fn: FunctionLike, isArrow: boolean): Type {
    const functionType = this.buildFunctionType(undefined, fn);
    // Arrow functions keep the enclosing `ин`
    const thisType = isArrow ? this.currentFunction()?.thisType : undefined;
    this.checkFunctionBody(fn, functionType, thisType, true);
    return functionType;
  }

  private isOptionalChain(expression: Expression): boolean {
    let current: Expression | undefined = expression;
    while (current && (current.type === 'MemberExpression' || current.type === 'CallExpression')) {
      if ((current as MemberExpression | CallExpression).optional) return true;
      current =
        current.type === 'MemberExpression'
          ? (current as MemberExpression).object
          : (current as CallExpression).callee;
    }
    return false;
  }

  private inferMemberType(member: MemberExpression, ignoreNarrowing = false): Type {
    const rawObjectType = this.inferExpressionType(member.object);
    // `а?.б` is fine when `а` is `холӣ`; `а.б` is not
    const objectType = member.optional
      ? this.removeNullish(rawObjectType)
      : this.checkNotNullish(member.object, rawObjectType);
    const inOptionalChain = this.isOptionalChain(member);
    if (member.computed) {
      const indexType = this.inferExpressionType(member.property);
      if (inOptionalChain) return UNKNOWN;
      return this.indexedAccessType(objectType, indexType);
    }
    if (member.property.type !== 'Identifier') return UNKNOWN;
    const memberType = this.namedMemberType(member, objectType, member.property as Identifier);
    if (inOptionalChain) return UNKNOWN;
    const key = ignoreNarrowing ? undefined : this.referenceKey(member);
    return (key ? this.narrowed.get(key) : undefined) ?? memberType;
  }

  /**
   * Type of `object.name` (`name` as written, possibly a Tajik alias such as
   * `дарозӣ`); reports members the object's type doesn't have.
   */
  private namedMemberType(member: MemberExpression, objectType: Type, property: Identifier): Type {
    const name = property.name;
    const jsName = translateMemberName(name);
    // `Синф.статикӣ`: the class itself, not an instance
    if (
      member.object.type === 'Identifier' &&
      objectType.kind === 'class' &&
      objectType.name === (member.object as Identifier).name
    ) {
      if (!this.hasStaticMember(objectType, name, jsName)) {
        this.reportMissingMember(property, name, jsName, objectType, true);
      }
      return UNKNOWN;
    }

    const members = this.unionMembers(objectType);
    const lookups = members.map(t => this.lookupMember(t, name, jsName));
    // Without discriminant narrowing a member of some union members is accepted
    const missing = lookups.every(l => l.known && !l.exists);
    if (missing && lookups.length > 0) {
      this.reportMissingMember(property, name, jsName, objectType, false);
      return UNKNOWN;
    }
    return lookups.length === 1 ? lookups[0].type : UNKNOWN;
  }

  /**
   * Looks up a member on one (non-union) type. `known` is false when the
   * type's members can't be listed (unresolved types, `ҳар`, open object
   * types, …), so a missing member must not be reported.
   */
  private lookupMember(
    type: Type,
    name: string,
    jsName: string
  ): { known: boolean; exists: boolean; type: Type } {
    const builtin = this.builtinMembersOf(type);
    if (builtin) {
      return {
        known: true,
        exists: builtin.has(jsName),
        type: this.builtinMemberType(type, jsName),
      };
    }
    if (!['class', 'interface', 'object'].includes(type.kind) || !type.properties) {
      return {
        known: false,
        exists: true,
        type: this.getAllProperties(type).get(name)?.type ?? UNKNOWN,
      };
    }
    const prop = this.findProperty(this.getAllProperties(type), name, jsName);
    const exists =
      Boolean(prop) ||
      BUILTIN_MEMBERS.object.has(jsName) ||
      this.hasImplicitMember(type, name, jsName);
    const known = !this.isOpenType(type) && !type.fromLiteral;
    let propType = prop?.type ?? UNKNOWN;
    if (prop?.optional) propType = this.optionalType(propType);
    return { known, exists, type: propType };
  }

  /** Property named `name` or, for built-in aliases, its translation (`дарозӣ` ≡ `length`). */
  private findProperty(
    properties: Map<string, PropertyType>,
    name: string,
    jsName: string
  ): PropertyType | undefined {
    const direct = properties.get(name) ?? properties.get(jsName);
    if (direct) return direct;
    for (const [key, prop] of properties) {
      if (translateMemberName(key) === jsName) return prop;
    }
    return undefined;
  }

  /** Whether an object type may have members the checker doesn't know about. */
  private isOpenType(type: Type): boolean {
    for (let t: Type | undefined = type, depth = 0; t && depth < 100; t = t.baseType, depth++) {
      if (t.open || t.indexType) return true;
    }
    return false;
  }

  private hasImplicitMember(type: Type, name: string, jsName: string): boolean {
    for (let t: Type | undefined = type, depth = 0; t && depth < 100; t = t.baseType, depth++) {
      if (t.implicitMembers?.has(name) || t.implicitMembers?.has(jsName)) return true;
    }
    return false;
  }

  private hasStaticMember(classType: Type, name: string, jsName: string): boolean {
    if (BUILTIN_MEMBERS.function.has(jsName) || this.isOpenType(classType)) return true;
    for (
      let t: Type | undefined = classType, depth = 0;
      t && depth < 100;
      t = t.baseType, depth++
    ) {
      for (const member of t.staticMembers ?? []) {
        if (member === name || translateMemberName(member) === jsName) return true;
      }
    }
    return false;
  }

  /** Member names of a built-in type, or undefined for other types. */
  private builtinMembersOf(type: Type): ReadonlySet<string> | undefined {
    if (type.kind === 'array' || type.kind === 'tuple') return BUILTIN_MEMBERS.array;
    if (this.isStringType(type)) return BUILTIN_MEMBERS.string;
    if (this.isNumericType(type)) return BUILTIN_MEMBERS.number;
    const base = this.getBaseType(type);
    if (base.kind === 'primitive' && base.name === 'boolean') return BUILTIN_MEMBERS.boolean;
    if (
      type.kind === 'generic' &&
      (['Map', 'Set', 'Promise'] as const).includes(type.name as 'Map')
    ) {
      return BUILTIN_MEMBERS[type.name as 'Map' | 'Set' | 'Promise'];
    }
    return undefined;
  }

  /** Types of the built-in members the checker knows more about than "exists". */
  private builtinMemberType(type: Type, jsName: string): Type {
    if (type.kind === 'generic') return this.collectionMemberType(type, jsName);
    const isArray = type.kind === 'array' || type.kind === 'tuple';
    if (jsName === 'length' && (isArray || this.isStringType(type))) return NUMBER_TYPE;
    if (isArray && ARRAY_ELEMENT_OR_UNDEFINED.has(jsName)) {
      return this.methodReturning(this.orUndefined(this.iterationElementType(type)));
    }
    if (this.isStringType(type) && jsName === 'at') {
      return this.methodReturning(this.orUndefined(STRING_TYPE));
    }
    return UNKNOWN;
  }

  /** Members of `Map<К, В>` / `Set<Т>` with known types. */
  private collectionMemberType(type: Type, jsName: string): Type {
    if ((type.name === 'Map' || type.name === 'Set') && jsName === 'size') return NUMBER_TYPE;
    if (type.name === 'Map' && jsName === 'get') {
      return this.methodReturning(this.orUndefined(type.typeParameters?.[1] ?? UNKNOWN));
    }
    return UNKNOWN;
  }

  /** A method whose arguments aren't checked and whose result has type `returnType`. */
  private methodReturning(returnType: Type): Type {
    return returnType.kind === 'unknown' ? UNKNOWN : { kind: 'function', returnType };
  }

  private reportMissingMember(
    property: Identifier,
    name: string,
    jsName: string,
    objectType: Type,
    isStatic: boolean
  ): void {
    const shown = jsName === name ? `'${name}'` : `'${name}' (${jsName})`;
    const owner = isStatic
      ? `class '${objectType.name}'`
      : `type '${this.typeToString(objectType)}'`;
    let message = `Property ${shown} does not exist on ${owner}`;
    const isMapOrSet = this.unionMembers(objectType).some(
      t => t.kind === 'generic' && (t.name === 'Map' || t.name === 'Set')
    );
    if (isMapOrSet && jsName === 'includes') {
      message += `; use 'дорадКалид' (has) to test membership`;
    }
    const report = this.strict ? this.addError.bind(this) : this.addWarning.bind(this);
    report(TypeCheckErrorCode.PropertyNotFound, message, property.line, property.column);
  }

  private indexedAccessType(objectType: Type, indexType: Type): Type {
    if (!this.isNumericType(indexType)) return UNKNOWN;
    if (objectType.kind === 'array') return objectType.elementType ?? UNKNOWN;
    if (objectType.kind === 'tuple' && indexType.kind === 'literal') {
      return objectType.types?.[indexType.value as number] ?? UNKNOWN;
    }
    return UNKNOWN;
  }

  private inferAssignmentType(assignment: AssignmentExpression): Type {
    const left = assignment.left;
    const isPlain = assignment.operator === '=';
    // The target accepts its declared type, not what an earlier check narrowed it to
    const leftType = this.inferAssignmentTargetType(left);
    if (this.isArithmeticAssignment(assignment.operator, leftType)) {
      this.checkNotNullish(left, leftType);
    }
    const rightType = this.inferExpressionType(assignment.right, isPlain ? leftType : undefined);

    if (isPlain && (left.type === 'Identifier' || left.type === 'MemberExpression')) {
      this.checkAssignable(assignment.right, rightType, leftType, (source, target) =>
        this.addError(
          TypeCheckErrorCode.TypeMismatch,
          `Type '${source}' is not assignable to type '${target}'`,
          assignment.right.line ?? assignment.line,
          assignment.right.column ?? assignment.column
        )
      );
    }
    if (isPlain) {
      this.narrowOnAssignment(left, leftType, rightType);
    } else if (assignment.operator === '??=') {
      this.narrowOnAssignment(left, leftType, this.removeNullish(leftType));
    }
    this.forEachNode(left, node => {
      // Destructuring assignment: forget what was known about each target
      if (left.type !== 'Identifier' && left.type !== 'MemberExpression') {
        if (node.type === 'Identifier' || node.type === 'MemberExpression') {
          this.invalidate(this.referenceKey(node as Expression));
        }
      }
    });
    return rightType;
  }

  private inferAssignmentTargetType(target: Expression): Type {
    if (target.type === 'MemberExpression') {
      return this.inferMemberType(target as MemberExpression, true);
    }
    if (target.type === 'Identifier') {
      const declared = this.lookup((target as Identifier).name);
      if (declared) return declared;
    }
    return this.inferExpressionType(target);
  }

  /** `х -= 1`, `х += 1` on a non-string, … — operators that compute with the old value. */
  private isArithmeticAssignment(operator: string, targetType: Type): boolean {
    if (operator === '+=') return !this.isStringType(this.removeNullish(targetType));
    return NUMERIC_BINARY_OPERATORS.has(operator.slice(0, -1)) && operator !== '==';
  }

  private inferBinaryType(binary: BinaryExpression): Type {
    const op = binary.operator;
    let left = this.inferExpressionType(binary.left);
    let right = this.inferRightOperand(binary);

    if (op === '??') {
      if (this.isAnyLike(left) || this.isAnyLike(right)) return UNKNOWN;
      return this.unionOf([this.removeNullish(left), right]);
    }
    if (this.computesWithOperands(op, left, right)) {
      left = this.checkNotNullish(binary.left, left);
      right = this.checkNotNullish(binary.right, right);
    }

    if (BOOLEAN_BINARY_OPERATORS.has(op)) return { kind: 'primitive', name: 'boolean' };
    const bothNumeric = this.isNumericType(left) && this.isNumericType(right);
    if (NUMERIC_BINARY_OPERATORS.has(op)) {
      return bothNumeric ? { kind: 'primitive', name: 'number' } : UNKNOWN;
    }
    if (op === '+') {
      if (this.isStringType(left) || this.isStringType(right)) {
        return { kind: 'primitive', name: 'string' };
      }
      return bothNumeric ? { kind: 'primitive', name: 'number' } : UNKNOWN;
    }
    return UNKNOWN;
  }

  /** `х !== холӣ && х.ном`: the right operand of `&&`/`||` only runs when the left one allows it. */
  private inferRightOperand(binary: BinaryExpression): Type {
    if (binary.operator !== '&&' && binary.operator !== '||') {
      return this.inferExpressionType(binary.right);
    }
    const facts = this.narrowingsFor(binary.left, binary.operator === '&&');
    return this.withFacts(facts, () => this.inferExpressionType(binary.right));
  }

  /** Operators that compute with their operands' values, so `холӣ`/`беқимат` are mistakes. */
  private computesWithOperands(op: string, left: Type, right: Type): boolean {
    if (NUMERIC_BINARY_OPERATORS.has(op) || RELATIONAL_OPERATORS.has(op)) return true;
    return (
      op === '+' &&
      !this.isStringType(this.removeNullish(left)) &&
      !this.isStringType(this.removeNullish(right))
    );
  }

  private inferUnaryType(unary: UnaryExpression): Type {
    const argument = this.inferExpressionType(unary.argument);
    switch (unary.operator) {
      case '!':
      case 'delete':
        return { kind: 'primitive', name: 'boolean' };
      case 'typeof':
        return { kind: 'primitive', name: 'string' };
      case '-':
      case '+':
      case '~': {
        const operand = this.checkNotNullish(unary.argument, argument);
        return this.isNumericType(operand) ? { kind: 'primitive', name: 'number' } : UNKNOWN;
      }
      default:
        return UNKNOWN;
    }
  }

  private inferNumericOperand(argument: Expression, checkNullish = false): Type {
    let type = this.inferExpressionType(argument);
    if (checkNullish) type = this.checkNotNullish(argument, type);
    return this.isNumericType(type) ? { kind: 'primitive', name: 'number' } : UNKNOWN;
  }

  private inferConditionalType(conditional: ConditionalExpression, targetType?: Type): Type {
    this.inferExpressionType(conditional.test);
    const consequent = this.withFacts(this.narrowingsFor(conditional.test, true), () =>
      this.inferExpressionType(conditional.consequent, targetType)
    );
    const alternate = this.withFacts(this.narrowingsFor(conditional.test, false), () =>
      this.inferExpressionType(conditional.alternate, targetType)
    );
    if (consequent.kind === 'unknown' || alternate.kind === 'unknown') return UNKNOWN;
    if (this.isExactMatch(consequent, alternate)) return consequent;
    return { kind: 'union', types: [consequent, alternate] };
  }

  private isNumericType(type: Type): boolean {
    return (
      (type.kind === 'primitive' && type.name === 'number') ||
      (type.kind === 'literal' && typeof type.value === 'number')
    );
  }

  private isStringType(type: Type): boolean {
    return (
      (type.kind === 'primitive' && type.name === 'string') ||
      (type.kind === 'literal' && typeof type.value === 'string')
    );
  }

  private isPromiseType(type: Type): boolean {
    return type.kind === 'generic' && type.name === 'Promise';
  }

  private unwrapPromise(type: Type): Type {
    if (this.isPromiseType(type)) return type.typeParameters?.[0] ?? UNKNOWN;
    return type;
  }

  private inferCallType(callExpr: CallExpression): Type {
    const callee = callExpr.callee;
    // Route identifiers through inferIdentifierType so undefined callees
    // produce a single UndefinedIdentifier diagnostic.
    const functionType = callee ? this.inferExpressionType(callee) : UNKNOWN;
    if (functionType.kind === 'function' && !this.isOptionalChain(callExpr)) {
      this.validateCallArguments(callExpr, functionType);
      return functionType.returnType ?? UNKNOWN;
    }
    // Still evaluate args so nested undefined identifiers are flagged.
    callExpr.arguments.forEach(arg => this.inferExpressionType(arg));
    return UNKNOWN;
  }

  private validateCallArguments(callExpr: CallExpression, functionType: Type): void {
    const paramTypes = functionType.paramTypes;
    if (!paramTypes) {
      // Still walk args so nested undefined identifiers are detected.
      callExpr.arguments.forEach(arg => this.inferExpressionType(arg));
      return;
    }

    const args = callExpr.arguments;
    const spreadIndex = args.findIndex(arg => arg.type === 'SpreadElement');
    const hasRest = Boolean(functionType.hasRestParam);
    const fixedCount = hasRest ? paramTypes.length - 1 : paramTypes.length;
    const optional = functionType.paramOptional ?? paramTypes.map(() => false);
    const requiredCount = optional.slice(0, fixedCount).filter(o => !o).length;

    if (
      spreadIndex === -1 &&
      (args.length < requiredCount || (!hasRest && args.length > fixedCount))
    ) {
      const expectedStr = hasRest
        ? `at least ${requiredCount}`
        : requiredCount === fixedCount
          ? `${fixedCount}`
          : `${requiredCount}-${fixedCount}`;
      this.addError(
        TypeCheckErrorCode.ArgumentCountMismatch,
        `Function '${functionType.name ?? 'anonymous'}' expected ${expectedStr} argument(s) but got ${args.length}`,
        callExpr.line,
        callExpr.column
      );
    }

    const restType = hasRest ? paramTypes[paramTypes.length - 1] : undefined;
    const restElementType = restType?.kind === 'array' ? restType.elementType : undefined;
    args.forEach((argNode, i) => {
      // Positions after a spread argument are unknown
      const declaredType =
        spreadIndex !== -1 && i >= spreadIndex
          ? undefined
          : i < fixedCount
            ? paramTypes[i]
            : restElementType;
      // An optional or defaulted parameter also accepts `беқимат`
      const paramType =
        declaredType && i < fixedCount && optional[i]
          ? this.optionalType(declaredType)
          : declaredType;
      const argType = this.inferExpressionType(argNode, paramType);
      if (!paramType) return;
      this.checkAssignable(argNode, argType, paramType, (source, target) =>
        this.addError(
          TypeCheckErrorCode.ArgumentTypeMismatch,
          `Argument ${i + 1} of '${functionType.name ?? 'anonymous'}' expected type '${target}' but got '${source}'`,
          argNode.line ?? callExpr.line,
          argNode.column ?? callExpr.column
        )
      );
    });
  }

  private inferNewExpressionType(newExpr: NewExpression): Type {
    // Walk args so nested undefined identifiers are flagged
    newExpr.arguments.forEach(arg => this.inferExpressionType(arg));
    if (newExpr.callee && newExpr.callee.type === 'Identifier') {
      const className = (newExpr.callee as Identifier).name;

      // Handle built-in generic types: Map and Set (`нав Map<сатр, рақам>()`)
      const typeArguments = (newExpr.typeArguments ?? []).map(t => this.resolveTypeNode(t));
      const any: Type = { kind: 'primitive', name: 'any' };
      if (className === 'Map') {
        return {
          kind: 'generic',
          name: 'Map',
          typeParameters: typeArguments.length === 2 ? typeArguments : [any, any],
        };
      }
      if (className === 'Set') {
        return {
          kind: 'generic',
          name: 'Set',
          typeParameters: typeArguments.length === 1 ? typeArguments : [any],
        };
      }

      const classType = this.lookup(className);
      if (classType && classType.kind === 'class') {
        // Return the actual class type with all its properties and baseType
        return classType;
      }
    } else if (newExpr.callee) {
      this.inferExpressionType(newExpr.callee);
    }
    return UNKNOWN;
  }

  // ---------------------------------------------------------------------------
  // Narrowing
  //
  // References (`х`, `ин.сар.пас`) get a narrower type than their declared one
  // after checks such as `агар (х !== холӣ)`, early exits (`агар (!х) бозгашт;`)
  // and assignments. Facts are keyed by `referenceKey` and dropped when the
  // reference (or an object on its path) is assigned.
  // ---------------------------------------------------------------------------

  private bindingKey(scopeIndex: number, name: string): string {
    return `${this.scopeIds[scopeIndex]}:${name}`;
  }

  /** Key identifying a narrowable reference: a variable, `ин`, or a member path on them. */
  private referenceKey(expression: Expression): string | undefined {
    switch (expression.type) {
      case 'Identifier': {
        const name = (expression as Identifier).name;
        const index = this.scopeIndexOf(name);
        return index === -1 ? undefined : this.bindingKey(index, name);
      }
      case 'ThisExpression':
        return 'ин';
      case 'MemberExpression': {
        const member = expression as MemberExpression;
        if (member.computed || member.property.type !== 'Identifier') return undefined;
        const objectKey = this.referenceKey(member.object);
        return objectKey && `${objectKey}.${(member.property as Identifier).name}`;
      }
      default:
        return undefined;
    }
  }

  /** Forgets what is known about `key` and every member path below it. */
  private invalidate(key: string | undefined): void {
    if (!key) return;
    for (const narrowedKey of [...this.narrowed.keys()]) {
      if (narrowedKey === key || narrowedKey.startsWith(`${key}.`)) {
        this.narrowed.delete(narrowedKey);
      }
    }
  }

  private applyFacts(facts: Facts): void {
    facts.forEach((type, key) => this.narrowed.set(key, type));
  }

  /** Runs `body` with `facts` added; narrowing changes made by `body` are discarded. */
  private withFacts<T>(facts: Facts, body: () => T): T {
    const saved = this.narrowed;
    this.narrowed = new Map(saved);
    this.applyFacts(facts);
    try {
      return body();
    } finally {
      this.narrowed = saved;
    }
  }

  /** Infers a type without reporting diagnostics (they were reported on the first pass). */
  private quietType(expression: Expression): Type {
    this.silent++;
    try {
      return this.inferExpressionType(expression);
    } finally {
      this.silent--;
    }
  }

  /** What is known when `test` evaluates to `assumeTrue`. */
  private narrowingsFor(test: Expression, assumeTrue: boolean): Facts {
    if (test.type === 'UnaryExpression' && (test as UnaryExpression).operator === '!') {
      return this.narrowingsFor((test as UnaryExpression).argument, !assumeTrue);
    }
    if (test.type === 'BinaryExpression') {
      const binary = test as BinaryExpression;
      switch (binary.operator) {
        case '&&':
          return assumeTrue
            ? this.sequenceFacts(binary.left, true, binary.right, true)
            : this.joinFacts(
                this.narrowingsFor(binary.left, false),
                this.sequenceFacts(binary.left, true, binary.right, false)
              );
        case '||':
          return assumeTrue
            ? this.joinFacts(
                this.narrowingsFor(binary.left, true),
                this.sequenceFacts(binary.left, false, binary.right, true)
              )
            : this.sequenceFacts(binary.left, false, binary.right, false);
        case '===':
        case '!==':
        case '==':
        case '!=':
          return this.equalityFacts(binary, assumeTrue);
        case 'instanceof':
          return assumeTrue ? this.instanceofFacts(binary) : new Map();
        default:
          return new Map();
      }
    }
    return this.truthinessFacts(test, assumeTrue);
  }

  /** Facts of `first` being `firstValue` and then `second` being `secondValue`. */
  private sequenceFacts(
    first: Expression,
    firstValue: boolean,
    second: Expression,
    secondValue: boolean
  ): Facts {
    const firstFacts = this.narrowingsFor(first, firstValue);
    const secondFacts = this.withFacts(firstFacts, () => this.narrowingsFor(second, secondValue));
    return new Map([...firstFacts, ...secondFacts]);
  }

  /** Facts that hold on either of two paths. */
  private joinFacts(a: Facts, b: Facts): Facts {
    const joined: Facts = new Map();
    a.forEach((type, key) => {
      const other = b.get(key);
      if (other) joined.set(key, this.unionOf([type, other]));
    });
    return joined;
  }

  private truthinessFacts(expression: Expression, assumeTrue: boolean): Facts {
    const key = this.referenceKey(expression);
    if (!key || !assumeTrue) return new Map();
    const current = this.quietType(expression);
    if (this.isAnyLike(current) || this.nullishNames(current).length === 0) return new Map();
    return new Map([[key, this.removeNullish(current)]]);
  }

  private equalityFacts(binary: BinaryExpression, assumeTrue: boolean): Facts {
    const equal = (binary.operator === '===' || binary.operator === '==') === assumeTrue;
    const loose = binary.operator === '==' || binary.operator === '!=';
    for (const [typeofSide, literalSide] of [
      [binary.left, binary.right],
      [binary.right, binary.left],
    ]) {
      if (this.isTypeofExpression(typeofSide) && literalSide.type === 'Literal') {
        return this.typeofFacts(typeofSide as UnaryExpression, literalSide as Literal, equal);
      }
    }
    const comparison = this.nullComparison(binary);
    const key = comparison && this.referenceKey(comparison.reference);
    if (!comparison || !key) return new Map();
    const { reference, nullish } = comparison;
    const current = this.quietType(reference);
    if (this.isAnyLike(current)) return new Map();
    const names = loose ? ['null', 'undefined'] : [nullish];
    if (equal) {
      const present = this.nullishNames(current).filter(name => names.includes(name));
      const kept = present.length > 0 ? present : [nullish];
      return new Map([[key, this.unionOf(kept.map(name => this.nullishType(name)))]]);
    }
    const rest = this.unionMembers(current).filter(
      t => !(t.kind === 'primitive' && names.includes(t.name!))
    );
    return new Map([[key, rest.length > 0 ? this.unionOf(rest) : UNKNOWN]]);
  }

  /** The reference compared in `х === холӣ` / `беқимат !== х`, and which value it is compared with. */
  private nullComparison(
    binary: BinaryExpression
  ): { reference: Expression; nullish: 'null' | 'undefined' } | undefined {
    const right = this.nullishLiteral(binary.right);
    if (right) return { reference: binary.left, nullish: right };
    const left = this.nullishLiteral(binary.left);
    return left ? { reference: binary.right, nullish: left } : undefined;
  }

  private isTypeofExpression(expression: Expression): boolean {
    return (
      expression.type === 'UnaryExpression' && (expression as UnaryExpression).operator === 'typeof'
    );
  }

  /** `навъи х === "string"` keeps the union members of that JavaScript type. */
  private typeofFacts(typeofExpr: UnaryExpression, literal: Literal, equal: boolean): Facts {
    const key = this.referenceKey(typeofExpr.argument);
    if (!key || typeof literal.value !== 'string') return new Map();
    const current = this.quietType(typeofExpr.argument);
    if (current.kind !== 'union' || this.isAnyLike(current)) return new Map();
    const members = this.unionMembers(current);
    const kept = members.filter(t => (this.typeofName(t) === literal.value) === equal);
    if (kept.length === 0 || kept.length === members.length) return new Map();
    return new Map([[key, this.unionOf(kept)]]);
  }

  /** The `typeof` result of values of a type, when one is determined. */
  private typeofName(type: Type): string | undefined {
    const base = this.getBaseType(type);
    if (base.kind === 'primitive') {
      if (base.name === 'null') return 'object';
      return ['string', 'number', 'boolean', 'undefined'].includes(base.name!)
        ? base.name
        : undefined;
    }
    if (type.kind === 'function') return 'function';
    return ['object', 'interface', 'array', 'tuple', 'generic'].includes(type.kind)
      ? 'object'
      : undefined;
  }

  private instanceofFacts(binary: BinaryExpression): Facts {
    const key = this.referenceKey(binary.left);
    if (!key || binary.right.type !== 'Identifier') return new Map();
    const classType = this.lookup((binary.right as Identifier).name);
    return classType?.kind === 'class' ? new Map([[key, classType]]) : new Map();
  }

  /** `холӣ` → 'null', `беқимат` → 'undefined', anything else → undefined. */
  private nullishLiteral(expression: Expression): 'null' | 'undefined' | undefined {
    if (expression.type === 'Literal' && (expression as Literal).value === null) return 'null';
    if (expression.type === 'Identifier') {
      const name = (expression as Identifier).name;
      if ((name === 'беқимат' || name === 'undefined') && !this.lookup(name)) return 'undefined';
    }
    return undefined;
  }

  /**
   * Type of a reference right after `= value`: a value that can't be
   * `холӣ`/`беқимат` removes them from the declared type, and `холӣ` itself
   * narrows to `холӣ`. Returns undefined when the declared type applies.
   */
  private assignmentNarrowing(declared: Type, assigned: Type): Type | undefined {
    if (this.isAnyLike(declared) || this.isAnyLike(assigned)) return undefined;
    const declaredNullish = this.nullishNames(declared);
    const assignedNullish = this.nullishNames(assigned);
    if (assignedNullish.length === 0) {
      return declaredNullish.length > 0 ? this.removeNullish(declared) : undefined;
    }
    const onlyNullish = this.unionMembers(assigned).every(t => this.isNullishType(t));
    return onlyNullish ? assigned : undefined;
  }

  private narrowOnAssignment(target: Expression, declared: Type, assigned: Type): void {
    const key = this.referenceKey(target);
    if (!key) return;
    this.invalidate(key);
    const narrowed = this.assignmentNarrowing(declared, assigned);
    if (narrowed) this.narrowed.set(key, narrowed);
  }

  /** Facts after two branches meet: a reference keeps only what both agree on. */
  private joinNarrowed(a: Facts, b: Facts): Facts {
    return this.joinFacts(a, b);
  }

  /** Whether the variable a reference key starts with can't change after being narrowed. */
  private isNeverReassigned(key: string): boolean {
    if (key.includes('.')) return false;
    if (this.constKeys.has(key)) return true;
    return !this.reassignedNames.has(key.slice(key.indexOf(':') + 1));
  }

  private collectReassignedNames(program: Program): Set<string> {
    const names = new Set<string>();
    const addTargets = (target: unknown): void =>
      this.forEachNode(target, node => {
        if (node.type === 'Identifier') names.add((node as Identifier).name);
      });
    this.forEachNode(program, node => {
      if (node.type === 'AssignmentExpression') {
        const left = (node as AssignmentExpression).left;
        if (left.type !== 'MemberExpression') addTargets(left);
      } else if (node.type === 'UpdateExpression') {
        addTargets((node as UpdateExpression).argument);
      } else if (node.type === 'ForInStatement' || node.type === 'ForOfStatement') {
        const left = (node as ForInStatement | ForOfStatement).left;
        if (left.type !== 'VariableDeclaration') addTargets(left);
      }
    });
    return names;
  }

  /** Forgets facts about every reference assigned somewhere inside `nodes` (loop bodies, …). */
  private invalidateAssignedIn(...nodes: Array<object | null | undefined>): void {
    const invalidateTarget = (target: unknown): void => {
      this.forEachNode(target, node => {
        if (node.type === 'Identifier' || node.type === 'MemberExpression') {
          this.invalidate(this.referenceKey(node as Expression));
        }
      });
    };
    for (const root of nodes) {
      this.forEachNode(root, node => {
        if (node.type === 'AssignmentExpression') {
          invalidateTarget((node as AssignmentExpression).left);
        } else if (node.type === 'ForInStatement' || node.type === 'ForOfStatement') {
          const left = (node as ForInStatement | ForOfStatement).left;
          if (left.type !== 'VariableDeclaration') invalidateTarget(left);
        }
      });
    }
  }

  /** Calls `visit` for every AST node below `node` (type annotations excluded). */
  private forEachNode(node: unknown, visit: (_node: { type: string }) => void): void {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach(child => this.forEachNode(child, visit));
      return;
    }
    const record = node as Record<string, unknown>;
    if (typeof record.type === 'string') visit(record as { type: string });
    for (const [key, value] of Object.entries(record)) {
      if (key === 'typeAnnotation' || key === 'returnType' || key === 'typeArguments') continue;
      if (value && typeof value === 'object') this.forEachNode(value, visit);
    }
  }

  /** Whether `body` contains a `шикастан` that can leave the loop owning `body`. */
  private containsLoopExit(body: Statement): boolean {
    const visit = (node: unknown, nested: boolean): boolean => {
      if (!node || typeof node !== 'object') return false;
      if (Array.isArray(node)) return node.some(child => visit(child, nested));
      const record = node as Record<string, unknown>;
      const type = String(record.type ?? '');
      // An unlabelled `шикастан` in a nested loop or `интихоб` only leaves that one
      if (type === 'BreakStatement') return !nested || Boolean(record.label);
      if (/Function|ClassDeclaration/.test(type)) return false;
      const nestsJump = nested || JUMP_TARGETS.has(type);
      return Object.values(record).some(value => visit(value, nestsJump));
    };
    return visit(body, false);
  }

  /** Whether control never continues after `statement` (it returns, throws, breaks or continues). */
  private alwaysExits(statement: Statement | undefined): boolean {
    if (!statement) return false;
    switch (statement.type) {
      case 'ReturnStatement':
      case 'ThrowStatement':
      case 'BreakStatement':
      case 'ContinueStatement':
        return true;
      case 'BlockStatement':
        return (statement as BlockStatement).body.some(s => this.alwaysExits(s));
      case 'IfStatement': {
        const ifStatement = statement as IfStatement;
        return this.alwaysExits(ifStatement.consequent) && this.alwaysExits(ifStatement.alternate);
      }
      case 'TryStatement': {
        const tryStatement = statement as TryStatement;
        if (tryStatement.finalizer && this.alwaysExits(tryStatement.finalizer)) return true;
        return (
          this.alwaysExits(tryStatement.block) &&
          (!tryStatement.handler || this.alwaysExits(tryStatement.handler.body))
        );
      }
      default:
        return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Nullability
  // ---------------------------------------------------------------------------

  /** Members of a union (nested unions flattened); a single type for anything else. */
  private unionMembers(type: Type): Type[] {
    if (type.kind !== 'union' || !type.types) return [type];
    return type.types.flatMap(t => this.unionMembers(t));
  }

  /** Union of `types` without duplicates; a single type stays itself. */
  private unionOf(types: Type[]): Type {
    // Members that print the same are the same type
    const byName = new Map<string, Type>();
    for (const member of types.flatMap(t => this.unionMembers(t))) {
      const name = this.typeToString(member);
      if (!byName.has(name)) byName.set(name, member);
    }
    const members = [...byName.values()];
    return members.length === 1 ? members[0] : { kind: 'union', types: members };
  }

  private isNullishType(type: Type): boolean {
    return type.kind === 'primitive' && (type.name === 'null' || type.name === 'undefined');
  }

  private nullishType(name: string): Type {
    return name === 'null' ? NULL_TYPE : UNDEFINED_TYPE;
  }

  /** Which of 'null' / 'undefined' the values of `type` may be. */
  private nullishNames(type: Type): string[] {
    const names = this.unionMembers(type)
      .filter(t => this.isNullishType(t))
      .map(t => t.name!);
    return [...new Set(names)];
  }

  private removeNullish(type: Type): Type {
    const rest = this.unionMembers(type).filter(t => !this.isNullishType(t));
    if (rest.length === 0) return UNKNOWN;
    return rest.length === 1 ? rest[0] : { kind: 'union', types: rest };
  }

  /** Types that turn checking off: unresolved, `ҳар`, `ношинос`, or unions containing them. */
  private isAnyLike(type: Type): boolean {
    return this.unionMembers(type).some(
      t => t.kind === 'unknown' || (t.kind === 'primitive' && ['any', 'unknown'].includes(t.name!))
    );
  }

  /** `type | беқимат`, or unknown when `type` itself is unknown. */
  private orUndefined(type: Type): Type {
    return this.isAnyLike(type) ? UNKNOWN : this.unionOf([type, UNDEFINED_TYPE]);
  }

  /** Type of an optional slot (`а?: Т`): `Т | беқимат` in strict mode. */
  private optionalType(type: Type): Type {
    return this.strict ? this.orUndefined(type) : type;
  }

  /**
   * In strict mode reports a value that may be `холӣ`/`беқимат` where it is
   * dereferenced or computed with; returns the type without them.
   */
  private checkNotNullish(expression: Expression, type: Type): Type {
    const nullish = this.nullishNames(type);
    if (nullish.length === 0) return type;
    if (this.strict && !this.isAnyLike(type)) {
      const possible = nullish.map(name => `'${this.mapPrimitiveToTajik(name)}'`).join(' or ');
      this.addError(
        TypeCheckErrorCode.PossiblyNull,
        `${this.describeReference(expression)} is possibly ${possible}`,
        expression.line,
        expression.column
      );
    }
    return this.removeNullish(type);
  }

  /** `'х'`, `'ин.сар'` for references, 'Object' for any other expression. */
  private describeReference(expression: Expression): string {
    const path = (e: Expression): string | undefined => {
      if (e.type === 'Identifier') return (e as Identifier).name;
      if (e.type === 'ThisExpression') return 'ин';
      if (e.type === 'MemberExpression' && !(e as MemberExpression).computed) {
        const member = e as MemberExpression;
        const objectPath = path(member.object);
        const property = member.property as Identifier;
        return objectPath && property.name ? `${objectPath}.${property.name}` : undefined;
      }
      return undefined;
    };
    const text = path(expression);
    return text ? `'${text}'` : 'Object';
  }

  // ---------------------------------------------------------------------------
  // Assignability
  // ---------------------------------------------------------------------------

  /**
   * Reports through `report` when `sourceType` (the type of `sourceExpr`) is
   * not assignable to `targetType`; otherwise checks fresh object literals for
   * properties the target doesn't declare.
   */
  private checkAssignable(
    sourceExpr: Expression,
    sourceType: Type,
    targetType: Type,
    report: (_source: string, _target: string) => void
  ): void {
    // Control flow isn't tracked, so a union-typed reference may already be
    // narrowed (`агар (навъи х === "string") бозгашт х;`): accept it when any
    // member fits.
    const narrowable =
      sourceType.kind === 'union' &&
      (sourceExpr.type === 'Identifier' || sourceExpr.type === 'MemberExpression');
    const assignable = narrowable
      ? this.isNarrowableUnionAssignable(sourceType, targetType)
      : this.isAssignable(sourceType, targetType);
    if (!assignable) {
      report(this.typeToString(sourceType), this.typeToString(targetType));
      return;
    }
    this.checkExcessProperties(sourceExpr, targetType);
  }

  /**
   * A union-typed reference fits when one member does. In strict mode
   * `холӣ`/`беқимат` members must fit as well: null checks *are* tracked.
   */
  private isNarrowableUnionAssignable(sourceType: Type, targetType: Type): boolean {
    if (!this.strict) return sourceType.types!.some(t => this.isAssignable(t, targetType));
    const members = this.unionMembers(sourceType);
    const nullish = members.filter(t => this.isNullishType(t));
    const rest = members.filter(t => !this.isNullishType(t));
    return (
      nullish.every(t => this.isAssignable(t, targetType)) &&
      (rest.length === 0 || rest.some(t => this.isAssignable(t, targetType)))
    );
  }

  private checkExcessProperties(expr: Expression, targetType: Type): void {
    if (expr.type === 'ArrayExpression' && targetType.kind === 'array') {
      for (const element of (expr as ArrayExpression).elements) {
        if (element) this.checkExcessProperties(element, targetType.elementType ?? UNKNOWN);
      }
      return;
    }
    if (expr.type !== 'ObjectExpression') return;
    if (targetType.kind !== 'interface' && targetType.kind !== 'object') return;
    // An index signature accepts any key
    if (targetType.indexType || targetType.open) return;
    const objExpr = expr as ObjectExpression;
    if (objExpr.properties.some(p => p.type === 'SpreadElement' || p.computed)) return;
    this.checkObjectLiteralKeys(objExpr, targetType);
  }

  private checkObjectLiteralKeys(objExpr: ObjectExpression, targetType: Type): void {
    const targetProperties = this.getAllProperties(targetType);
    for (const prop of objExpr.properties) {
      if (prop.type === 'SpreadElement') continue;
      const keyName = this.propertyKeyName(prop.key);
      const targetProp = targetProperties.get(keyName);
      if (!targetProp) {
        this.addError(
          TypeCheckErrorCode.TypeMismatch,
          `Object literal may only specify known properties, and '${keyName}' does not exist in type '${this.typeToString(targetType)}'`,
          prop.line ?? objExpr.line,
          prop.column ?? objExpr.column
        );
      } else if (prop.value) {
        this.checkExcessProperties(prop.value, targetProp.type);
      }
    }
  }

  private isLiteralAssignableToPrimitive(source: Type, target: Type): boolean {
    if (source.kind !== 'literal' || target.kind !== 'primitive') {
      return false;
    }
    const baseType =
      typeof source.value === 'string'
        ? 'string'
        : typeof source.value === 'number'
          ? 'number'
          : typeof source.value === 'boolean'
            ? 'boolean'
            : 'null';
    return baseType === target.name;
  }

  private isStandardTypeAssignable(source: Type, target: Type): boolean {
    return (
      this.isArrayAssignable(source, target) ||
      this.isTupleAssignable(source, target) ||
      this.isArrayToTupleAssignable(source, target) ||
      this.isUnionAssignable(source, target) ||
      this.isIntersectionAssignable(source, target)
    );
  }

  private isStructuralTypeAssignable(source: Type, target: Type): boolean {
    return (
      this.isInterfaceAssignable(source, target) ||
      this.isClassAssignable(source, target) ||
      this.isUniqueAssignable(source, target)
    );
  }

  /**
   * Top-type rules: anything goes to `ҳар`/`ношинос`, `ҳар` goes anywhere,
   * and unresolved types are never reported. Without strict mode
   * `холӣ`/`беқимат` are accepted everywhere, like TypeScript without
   * `strictNullChecks`; in strict mode only by types that include them
   * (and `беқимат` by `беджавоб`).
   */
  private isTopTypeAssignable(source: Type, target: Type): boolean {
    if (source === target || source.kind === 'unknown' || target.kind === 'unknown') return true;
    if (target.kind === 'primitive' && (target.name === 'any' || target.name === 'unknown')) {
      return true;
    }
    if (source.kind === 'primitive') {
      if (source.name === 'any') return true;
      if (source.name === 'null' || source.name === 'undefined') {
        if (!this.strict) return true;
        return source.name === 'undefined' && target.kind === 'primitive' && target.name === 'void';
      }
    }
    return false;
  }

  private isObjectTargetAssignable(source: Type, target: Type): boolean {
    if (target.kind !== 'primitive' || target.name !== 'object') return false;
    return ['object', 'interface', 'class', 'array', 'tuple', 'generic', 'function'].includes(
      source.kind
    );
  }

  private isAssignable(source: Type, target: Type): boolean {
    if (this.isTopTypeAssignable(source, target)) {
      return true;
    }

    if (this.isExactMatch(source, target)) {
      return true;
    }

    if (this.isObjectTargetAssignable(source, target)) {
      return true;
    }

    // Function signatures aren't compared (no variance checking)
    if (source.kind === 'function' && target.kind === 'function') {
      return true;
    }

    if (this.isLiteralAssignableToPrimitive(source, target)) {
      return true;
    }

    if (this.isStandardTypeAssignable(source, target)) {
      return true;
    }

    return this.isStructuralTypeAssignable(source, target);
  }

  private isExactMatch(source: Type, target: Type): boolean {
    // Check for literal type match
    if (source.kind === 'literal' && target.kind === 'literal') {
      return source.value === target.value;
    }
    // Check for generic type match (Map<K,V>, Set<T>)
    if (source.kind === 'generic' && target.kind === 'generic') {
      if (source.name !== target.name) {
        return false;
      }
      if (!source.typeParameters || !target.typeParameters) {
        return source.typeParameters === target.typeParameters;
      }
      if (source.typeParameters.length !== target.typeParameters.length) {
        return false;
      }
      // For now, we consider generics with 'any' type parameters compatible
      // Full variance checking can be added later
      return true;
    }
    // Primitives match by name; classes and interfaces by declared name.
    // Structured types (arrays, objects, unions, …) have no name to compare.
    if (!['primitive', 'class', 'interface'].includes(source.kind) || !source.name) {
      return false;
    }
    return source.kind === target.kind && source.name === target.name;
  }

  private isArrayAssignable(source: Type, target: Type): boolean {
    if (source.kind !== 'array' || target.kind !== 'array') {
      return false;
    }
    return source.elementType && target.elementType
      ? this.isAssignable(source.elementType, target.elementType)
      : false;
  }

  private isTupleAssignable(source: Type, target: Type): boolean {
    if (source.kind !== 'tuple' || target.kind !== 'tuple') {
      return false;
    }
    if (!source.types || !target.types || source.types.length !== target.types.length) {
      return false;
    }
    return source.types.every((sourceType, index) =>
      this.isAssignable(sourceType, target.types![index])
    );
  }

  private isArrayToTupleAssignable(source: Type, target: Type): boolean {
    if (source.kind !== 'array' || target.kind !== 'tuple') {
      return false;
    }
    // An array is assignable to a tuple if the array element type
    // is assignable to all tuple element types
    if (!target.types || target.types.length === 0) {
      return true; // Empty tuple accepts any array
    }
    const sourceElementType = source.elementType || UNKNOWN;
    // Check if source element type is compatible with all tuple positions
    return target.types.every(tupleElementType =>
      this.isAssignable(sourceElementType, tupleElementType)
    );
  }

  private isUnionAssignable(source: Type, target: Type): boolean {
    if (source.kind === 'union' && source.types) {
      return source.types.every(t => this.isAssignable(t, target));
    }
    if (target.kind === 'union' && target.types) {
      return target.types.some(t => this.isAssignable(source, t));
    }
    return false;
  }

  private isIntersectionAssignable(source: Type, target: Type): boolean {
    if (target.kind === 'intersection' && target.types) {
      return target.types.every(t => this.isAssignable(source, t));
    }
    if (source.kind === 'intersection' && source.types) {
      return source.types.some(t => this.isAssignable(t, target));
    }
    return false;
  }

  private isInterfaceAssignable(source: Type, target: Type): boolean {
    if (target.kind !== 'interface' && target.kind !== 'object') {
      return false;
    }
    if (['interface', 'object', 'class'].includes(source.kind)) {
      return this.isStructurallyCompatible(source, target);
    }
    return false;
  }

  /**
   * A class accepts its subclasses (base chain followed by name) and, like
   * TypeScript, any object whose members match its own.
   */
  private isClassAssignable(source: Type, target: Type): boolean {
    if (target.kind !== 'class') return false;
    if (source.kind === 'class') {
      const visited = new Set<string>();
      for (let t: Type | undefined = source; t && !visited.has(t.name!); t = t.baseType) {
        if (t.name === target.name) return true;
        visited.add(t.name!);
      }
    }
    if (['interface', 'object', 'class'].includes(source.kind)) {
      return this.isStructurallyCompatible(source, target);
    }
    return false;
  }

  private isUniqueAssignable(source: Type, target: Type): boolean {
    if (source.kind === 'unique' && target.kind === 'unique') {
      return this.isAssignable(source.baseType!, target.baseType!);
    }
    return false;
  }

  /**
   * All members of an object-like type; for classes this includes members
   * inherited along the base chain (own members override inherited ones).
   */
  private getAllProperties(type: Type): Map<string, PropertyType> {
    if (type.kind === 'intersection' && type.types) {
      const merged = new Map<string, PropertyType>();
      type.types.forEach(t => this.getAllProperties(t).forEach((p, k) => merged.set(k, p)));
      return merged;
    }
    if (!['interface', 'object', 'class'].includes(type.kind) || !type.properties) {
      return new Map();
    }
    if (type.kind !== 'class' || !type.baseType) return type.properties;

    const chain: Type[] = [];
    const visited = new Set<string>();
    for (let t: Type | undefined = type; t && !visited.has(t.name!); t = t.baseType) {
      chain.unshift(t);
      visited.add(t.name!);
    }
    const merged = new Map<string, PropertyType>();
    chain.forEach(t => t.properties?.forEach((p, k) => merged.set(k, p)));
    return merged;
  }

  private readonly typePrinters: Record<string, (_type: Type) => string> = {
    primitive: t => this.mapPrimitiveToTajik(t.name ?? 'unknown'),
    array: t => {
      const element = this.typeToString(t.elementType ?? UNKNOWN);
      return ['union', 'intersection', 'function'].includes(t.elementType?.kind ?? '')
        ? `(${element})[]`
        : `${element}[]`;
    },
    union: t => this.typeListToString(t),
    intersection: t => this.typeListToString(t),
    tuple: t => this.typeListToString(t),
    literal: t => (typeof t.value === 'string' ? `"${t.value}"` : String(t.value)),
    unique: t => `беназир ${this.typeToString(t.baseType!)}`,
    object: t => this.objectTypeToString(t),
    generic: t => this.genericTypeToString(t),
    function: t => this.functionTypeToString(t),
    unknown: t => t.name ?? 'ношинос',
  };

  private typeToString(type: Type): string {
    const printer = this.typePrinters[type.kind];
    // Interfaces and classes print by name
    return printer ? printer(type) : (type.name ?? type.kind);
  }

  private genericTypeToString(type: Type): string {
    const params = type.typeParameters ?? [];
    if (params.length === 0) return type.name!;
    return `${type.name}<${this.typeListToString({ kind: 'list', types: params })}>`;
  }

  private typeListToString(type: Type): string {
    const parts = type.types!.map(t => this.typeToString(t));
    switch (type.kind) {
      case 'union':
        return parts.join(' | ');
      case 'intersection':
        return parts.join(' & ');
      case 'tuple':
        return `[${parts.join(', ')}]`;
      default:
        return parts.join(', ');
    }
  }

  private objectTypeToString(type: Type): string {
    const members = [...(type.properties ?? [])].map(
      ([key, prop]) => `${key}${prop.optional ? '?' : ''}: ${this.typeToString(prop.type)}`
    );
    return members.length > 0 ? `{ ${members.join('; ')} }` : '{}';
  }

  private functionTypeToString(type: Type): string {
    const params = (type.paramTypes ?? []).map(
      (p, i) => `${type.paramNames?.[i] ?? `п${i}`}: ${this.typeToString(p)}`
    );
    return `(${params.join(', ')}) => ${this.typeToString(type.returnType ?? UNKNOWN)}`;
  }

  private isStructurallyCompatible(source: Type, target: Type): boolean {
    // Recursive types: assume compatibility for a pair already being compared
    if (this.assignabilityStack.some(([s, t]) => s === source && t === target)) {
      return true;
    }
    const sourceProperties = this.getAllProperties(source);
    const targetProperties = this.getAllProperties(target);

    this.assignabilityStack.push([source, target]);
    try {
      // Check if source has all required properties of target
      for (const [propName, targetProp] of targetProperties) {
        const sourceProp = sourceProperties.get(propName);

        // Required property missing
        if (!sourceProp && !targetProp.optional) {
          return false;
        }

        // Property exists, check type compatibility. The parser records an
        // interface method signature `ном(): сатр` by its return type only, so
        // a method satisfies any member type.
        if (
          sourceProp &&
          sourceProp.type.kind !== 'function' &&
          !this.isAssignable(
            sourceProp.type,
            targetProp.optional ? this.optionalType(targetProp.type) : targetProp.type
          )
        ) {
          return false;
        }
      }
      return true;
    } finally {
      this.assignabilityStack.pop();
    }
  }

  private mapPrimitiveToTajik(primitiveType: string): string {
    switch (primitiveType) {
      case 'string':
        return 'сатр';
      case 'number':
        return 'рақам';
      case 'boolean':
        return 'мантиқӣ';
      case 'null':
        return 'холӣ';
      case 'undefined':
        return 'беқимат';
      case 'any':
        return 'ҳар';
      case 'unknown':
        return 'ношинос';
      case 'never':
        return 'абадан';
      case 'void':
        return 'беджавоб';
      case 'object':
        return 'объект';
      default:
        return primitiveType;
    }
  }

  private addError(code: TypeCheckErrorCode, message: string, line: number, column: number): void {
    if (this.silent > 0) return;
    this.errors.push({
      code,
      message,
      line,
      column,
      snippet: this.getSnippet(line),
      severity: 'error',
    });
  }

  private addWarning(
    code: TypeCheckErrorCode,
    message: string,
    line: number,
    column: number
  ): void {
    if (this.silent > 0) return;
    this.warnings.push({
      code,
      message,
      line,
      column,
      snippet: this.getSnippet(line),
      severity: 'warning',
    });
  }
}

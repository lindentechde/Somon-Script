import {
  ArrayExpression,
  ArrayType,
  CallExpression,
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
} as const;
// eslint-disable-next-line no-redeclare, @typescript-eslint/no-redeclare
export type TypeCheckErrorCode = (typeof TypeCheckErrorCode)[keyof typeof TypeCheckErrorCode];

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
  /** Lexical scope chain; index 0 is the global scope. */
  private scopes: Map<string, Type>[] = [];
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
    AssignmentExpression: e => this.inferAssignmentType(e as AssignmentExpression),
    BinaryExpression: e => this.inferBinaryType(e as BinaryExpression),
    UnaryExpression: e => this.inferUnaryType(e as UnaryExpression),
    UpdateExpression: e => this.inferNumericOperand((e as UpdateExpression).argument),
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

  constructor(source?: string) {
    this.sourceLines = source ? source.split(/\r?\n/) : [];
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
    for (let i = this.scopes.length - 1; i >= 0; i--) {
      const type = this.scopes[i].get(name);
      if (type) return type;
    }
    return undefined;
  }

  private declare(name: string, type: Type): void {
    this.scopes[this.scopes.length - 1].set(name, type);
  }

  private withScope(body: () => void): void {
    this.scopes.push(new Map());
    try {
      body();
    } finally {
      this.scopes.pop();
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
      interfaceType.open ||= parent.open;
    }
    if (!interfaceDecl.extends && this.hasUnparsedExtendsClause(interfaceDecl)) {
      interfaceType.open = true;
    }

    this.collectPropertySignatures(interfaceDecl.body.properties, interfaceType);
  }

  /**
   * Parsers that don't record `InterfaceDeclaration.extends` still leave the
   * `мерос` clause in the header text; the inherited members are then unknown.
   */
  private hasUnparsedExtendsClause(interfaceDecl: InterfaceDeclaration): boolean {
    const header = this.sourceLines.slice(interfaceDecl.line - 1, interfaceDecl.line + 1);
    const text = header.join('\n').slice(Math.max(interfaceDecl.column - 1, 0));
    const brace = text.indexOf('{');
    return /(^|[\s>])мерос\s/.test(brace === -1 ? text : text.slice(0, brace));
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

    for (const member of classDecl.body.body) {
      if (member.static) continue;
      if (member.type === 'PropertyDefinition') {
        const prop = member as PropertyDefinition;
        const propType = prop.typeAnnotation
          ? this.resolveTypeNode(prop.typeAnnotation.typeAnnotation)
          : UNKNOWN;
        properties.set(prop.key.name, { type: propType, optional: false });
      } else if (member.type === 'MethodDefinition') {
        this.collectMethod(member as MethodDefinition, properties);
      }
    }

    if (classDecl.superClass) {
      const parent = this.lookup(classDecl.superClass.name);
      if (parent?.kind === 'class') classType.baseType = parent;
    }
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
    this.checkBody(statement.consequent);
    this.checkBody(statement.alternate);
  }

  private checkWhileStatement(statement: WhileStatement): void {
    this.inferExpressionType(statement.test);
    this.checkBody(statement.body);
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
      if (statement.test) this.inferExpressionType(statement.test);
      if (statement.update) this.inferExpressionType(statement.update);
      this.checkBody(statement.body);
    });
  }

  private checkForInOfStatement(
    statement: ForInStatement | ForOfStatement,
    isForIn: boolean
  ): void {
    this.withScope(() => {
      const iterated = this.inferExpressionType(statement.right);
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
    // All cases share one block scope
    this.withScope(() => {
      this.hoistDeclarations(statement.cases.flatMap(c => c.consequent));
      for (const switchCase of statement.cases) {
        if (switchCase.test) this.inferExpressionType(switchCase.test);
        switchCase.consequent.forEach(s => this.checkStatement(s));
      }
    });
  }

  private checkTryStatement(statement: TryStatement): void {
    this.checkStatement(statement.block);
    const handler = statement.handler;
    if (handler) {
      this.withScope(() => {
        if (handler.param) this.bindPatternTypes(handler.param, UNKNOWN);
        this.checkStatements(handler.body.body);
      });
    }
    if (statement.finalizer) this.checkStatement(statement.finalizer);
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
  private checkFunctionBody(fn: FunctionLike, functionType: Type, thisType?: Type): void {
    const isAsync = Boolean(fn.async ?? fn.isAsync);
    this.functionStack.push({
      returnType: this.expectedReturnType(functionType.returnType, isAsync),
      thisType,
    });
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
    if (param.pattern) {
      this.bindPatternTypes(param.pattern, paramType);
    } else {
      if (param.name) this.declare(param.name.name, paramType);
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
    if (sym) return sym;
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
      const elementType =
        elementTypes.length === 1 ? elementTypes[0] : { kind: 'union', types: elementTypes };
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
        return { kind: 'union', types: type.types!.map(t => this.widenType(t)) };
      case 'object': {
        const properties = new Map<string, PropertyType>();
        for (const [key, prop] of type.properties ?? []) {
          properties.set(key, { type: this.widenType(prop.type), optional: prop.optional });
        }
        return { kind: 'object', properties };
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

    return open ? UNKNOWN : { kind: 'object', properties };
  }

  private propertyKeyName(key: Identifier | Literal): string {
    return key.type === 'Identifier' ? (key as Identifier).name : String((key as Literal).value);
  }

  private inferFunctionExpressionType(fn: FunctionLike, isArrow: boolean): Type {
    const functionType = this.buildFunctionType(undefined, fn);
    // Arrow functions keep the enclosing `ин`
    const thisType = isArrow ? this.currentFunction()?.thisType : undefined;
    this.checkFunctionBody(fn, functionType, thisType);
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

  private inferMemberType(member: MemberExpression): Type {
    const objectType = this.inferExpressionType(member.object);
    if (member.computed) {
      const indexType = this.inferExpressionType(member.property);
      if (this.isOptionalChain(member)) return UNKNOWN;
      return this.indexedAccessType(objectType, indexType);
    }
    if (this.isOptionalChain(member)) return UNKNOWN;
    if (member.property.type !== 'Identifier') return UNKNOWN;
    const name = (member.property as Identifier).name;

    if (name === 'length' && (this.isStringType(objectType) || objectType.kind === 'array')) {
      return { kind: 'primitive', name: 'number' };
    }
    return this.getAllProperties(objectType).get(name)?.type ?? UNKNOWN;
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
    const leftType = this.inferExpressionType(left);
    const isPlain = assignment.operator === '=';
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
    return rightType;
  }

  private inferBinaryType(binary: BinaryExpression): Type {
    const left = this.inferExpressionType(binary.left);
    const right = this.inferExpressionType(binary.right);
    const op = binary.operator;

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
      case '~':
        return this.isNumericType(argument) ? { kind: 'primitive', name: 'number' } : UNKNOWN;
      default:
        return UNKNOWN;
    }
  }

  private inferNumericOperand(argument: Expression): Type {
    const type = this.inferExpressionType(argument);
    return this.isNumericType(type) ? { kind: 'primitive', name: 'number' } : UNKNOWN;
  }

  private inferConditionalType(conditional: ConditionalExpression, targetType?: Type): Type {
    this.inferExpressionType(conditional.test);
    const consequent = this.inferExpressionType(conditional.consequent, targetType);
    const alternate = this.inferExpressionType(conditional.alternate, targetType);
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
      const paramType =
        spreadIndex !== -1 && i >= spreadIndex
          ? undefined
          : i < fixedCount
            ? paramTypes[i]
            : restElementType;
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

      // Handle built-in generic types: Map and Set
      if (className === 'Map') {
        return {
          kind: 'generic',
          name: 'Map',
          typeParameters: [
            { kind: 'primitive', name: 'any' },
            { kind: 'primitive', name: 'any' },
          ],
        };
      }
      if (className === 'Set') {
        return {
          kind: 'generic',
          name: 'Set',
          typeParameters: [{ kind: 'primitive', name: 'any' }],
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
    // narrowed (`агар (навъи х === "сатр") бозгашт х;`): accept it when any
    // member fits.
    const narrowable =
      sourceType.kind === 'union' &&
      (sourceExpr.type === 'Identifier' || sourceExpr.type === 'MemberExpression');
    const assignable = narrowable
      ? sourceType.types!.some(t => this.isAssignable(t, targetType))
      : this.isAssignable(sourceType, targetType);
    if (!assignable) {
      report(this.typeToString(sourceType), this.typeToString(targetType));
      return;
    }
    this.checkExcessProperties(sourceExpr, targetType);
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
   * and unresolved types are never reported. `холӣ`/`беқимат` are accepted
   * everywhere since nullability isn't tracked.
   */
  private isTopTypeAssignable(source: Type, target: Type): boolean {
    if (source === target || source.kind === 'unknown' || target.kind === 'unknown') return true;
    if (target.kind === 'primitive' && (target.name === 'any' || target.name === 'unknown')) {
      return true;
    }
    if (source.kind === 'primitive') {
      return source.name === 'any' || source.name === 'null' || source.name === 'undefined';
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
    array: t => `${this.typeToString(t.elementType ?? UNKNOWN)}[]`,
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
          !this.isAssignable(sourceProp.type, targetProp.type)
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
    this.errors.push({
      code,
      message,
      line,
      column,
      snippet: this.getSnippet(line),
      severity: 'error',
    });
  }
}

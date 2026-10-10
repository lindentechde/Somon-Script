import {
  ArrayExpression,
  ArrayType,
  CallExpression,
  ChainExpression,
  ClassDeclaration,
  ClassExpression,
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
  Property,
  PropertySignature,
  Statement,
  TupleType,
  FunctionType,
  TypeAlias,
  TypeNode,
  UnionType,
  VariableDeclaration,
  VariableDeclarationList,
  TypeAnnotation,
  UniqueType,
  ConstructorType,
  OptionalType,
  ReadonlyType,
  RestType,
  TypeParameter,
  TypePredicate,
} from './types';
import {
  AsExpression,
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
  ImportSpecifier,
  MemberExpression,
  MethodDefinition,
  NonNullExpression,
  Parameter,
  PrivateIdentifier,
  PropertyDefinition,
  RestElement,
  ReturnStatement,
  SatisfiesExpression,
  SequenceExpression,
  SpreadElement,
  StaticBlock,
  SwitchStatement,
  TaggedTemplateExpression,
  TemplateLiteral,
  ThrowStatement,
  TryStatement,
  TypeAssertion,
  UnaryExpression,
  UpdateExpression,
  WhileStatement,
  DoWhileStatement,
  LabeledStatement,
  EnumDeclaration,
  EnumMember,
  YieldExpression,
  Decorator,
  FunctionSignature,
  ImportEqualsDeclaration,
  ExportAssignment,
  AmbientModuleDeclaration,
  InstantiationExpression,
} from './ast';
import {
  builtinObjectHasMember,
  builtinObjectMemberName,
  builtinObjectMemberNames,
  isCheckedBuiltinObject,
  isNotCallableBuiltin,
} from './builtin-globals';
import { BUILTIN_MAPPINGS, MEMBER_ALIASES, translateMemberName } from './builtin-names';
import { message, renderMessage } from './diagnostics/catalog';
import { closestName } from './diagnostics/suggest';
import type { DiagnosticMessage, DiagnosticParams } from './diagnostics/types';
import { nullishSemantics, skipOuterExpressions, truthySemantics } from './syntactic-conditions';

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
  /** The message in the diagnostics catalog (src/diagnostics), for other languages. */
  messageId?: string;
  /** The values of the message. */
  params?: DiagnosticParams;
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
  ReadonlyAssignment: 'READONLY_ASSIGNMENT',
  UsedBeforeInitialization: 'USED_BEFORE_INITIALIZATION',
  NoMatchingOverload: 'NO_MATCHING_OVERLOAD',
  InvalidOverride: 'INVALID_OVERRIDE',
  TypeOnlyImportValue: 'TYPE_ONLY_IMPORT_VALUE',
  AbstractInstantiation: 'ABSTRACT_INSTANTIATION',
  /** A condition or `??` operand its syntax decides (TypeScript 5.6: TS2869, TS2871 to TS2873). */
  ConstantCondition: 'CONSTANT_CONDITION',
  /** A call of a value that is not a function: `математика(1)`. */
  NotCallable: 'NOT_CALLABLE',
  /** A new value for a `собит`: `собит х = 1; х = 2;` (TypeScript's TS2588). */
  ConstAssignment: 'CONST_ASSIGNMENT',
  /** `агар (х = 1)`: a condition that assigns, where a comparison was meant. */
  AssignmentInCondition: 'ASSIGNMENT_IN_CONDITION',
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
  /**
   * Called with each name the checker declares (variables, parameters,
   * functions) or reads, and its type at that point, for editor tooling
   * (hover, completion). Not called while expressions are re-inferred quietly.
   */
  onIdentifierType?: (_identifier: Identifier, _type: Type) => void;
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
  constant?: boolean; // Type of a `чун собит` expression: never widened
  enumType?: Type; // For an enum object: the type its name stands for in annotations
  readonly?: boolean; // `танҳохонӣ Т[]`, `танҳохонӣ [Т, У]`
  minLength?: number; // Tuples: elements before the first optional one (`[рақам, сатр?]` → 1)
  restType?: Type; // Tuples: element type of a trailing rest element (`[рақам, ...сатр[]]`)
  predicate?: PredicateInfo; // Functions returning `х аст Т` or asserting `тасдиқ х [аст Т]`
  callSignatures?: Type[]; // Interfaces and object types with `(х: рақам): сатр;`: how calls are checked
  constructSignatures?: Type[]; // … with `нав (х: рақам): К;`: what `нав` creates
  overloads?: Type[]; // Overload signatures (`функсия ф(х: рақам): рақам;`): what calls are checked against
  typeOnly?: boolean; // A name imported with `ворид навъ`: not usable as a value
  abstract?: boolean; // `мавҳум синф`: `нав` cannot create instances
}

/**
 * A type predicate (`х аст Т`) or assertion signature (`тасдиқ х [аст Т]`):
 * the index of the parameter it is about, or 'this' for `ин аст Т`.
 */
export interface PredicateInfo {
  parameter: number | 'this';
  type?: Type;
  asserts: boolean;
}

/** The exports of an `эълон модул "ном" { … }` declaration. */
interface AmbientModuleExports {
  /** Values by export name (`default` for `содир пешфарз`, `export=` for `содир = …`). */
  values: Map<string, Type>;
  /** Interfaces and type aliases the module exports. */
  types: Set<string>;
  /**
   * What it exports from other modules: `содир { х чун у } аз "н"` (`у` is
   * `х` of "н") and `содир * чун у аз "н"` (`у` is "н" itself, `*`).
   */
  forwarded: Map<string, { source: string; name: string }>;
  /** `содир * аз "н"`: every module whose exports it exports too. */
  forwardedAll: string[];
}

/**
 * Represents a property type with optional flag
 */
export interface PropertyType {
  type: Type;
  optional: boolean;
  readonly?: boolean; // `танҳохонӣ ном: Т`
  writeType?: Type; // A setter's parameter type when it differs from the getter's: what may be assigned
}

/**
 * Per-function checking context: the expected type of `бозгашт` arguments
 * (already unwrapped from Promise for async functions) and the type of `ин`.
 */
interface FunctionContext {
  returnType?: Type;
  thisType?: Type;
}

/** A binding target: a name or a destructuring pattern. */
type Pattern =
  | Identifier
  | ArrayPattern
  | ObjectPattern
  | AssignmentPattern
  | SpreadElement
  | RestElement;

type FunctionLike = {
  /** The name of a function declaration or a named function expression. */
  name?: Identifier;
  typeParameters?: TypeParameter[];
  params: Parameter[];
  body: BlockStatement | Expression;
  returnType?: TypeAnnotation;
  async?: boolean;
  isAsync?: boolean;
  generator?: boolean;
  /** `функсия ф(ин: Т)`: the type of `ин` in the body. */
  thisType?: TypeAnnotation;
};

/**
 * Interfaces that `эълон глобалӣ { интерфейс Array<Т> { … } }` may extend, by
 * the built-in values they describe (see `augmentedMember`).
 */
const AUGMENTABLE_BUILTINS: ReadonlySet<string> = new Set([
  'Array',
  'ReadonlyArray',
  'String',
  'Number',
  'Boolean',
  'Object',
  'Map',
  'Set',
  'Promise',
  'RegExp',
]);

const UNKNOWN: Type = { kind: 'unknown' };
const NULL_TYPE: Type = { kind: 'primitive', name: 'null' };
const UNDEFINED_TYPE: Type = { kind: 'primitive', name: 'undefined' };
const NUMBER_TYPE: Type = { kind: 'primitive', name: 'number' };
const STRING_TYPE: Type = { kind: 'primitive', name: 'string' };

/** `хондан(савол?)` and `хонданиРақам(савол?)`: the input functions of the run time. */
const INPUT_FUNCTION_TYPES: ReadonlyMap<string, Type> = new Map(
  (
    [
      ['хондан', STRING_TYPE],
      ['хонданиРақам', NUMBER_TYPE],
    ] as const
  ).map(([name, returnType]) => [
    name,
    {
      kind: 'function',
      name,
      paramTypes: [{ kind: 'primitive', name: 'any' }],
      paramNames: ['савол'],
      paramOptional: [true],
      returnType,
    },
  ])
);
const BOOLEAN_TYPE: Type = { kind: 'primitive', name: 'boolean' };
const VOID_TYPE: Type = { kind: 'primitive', name: 'void' };
/** `ин` as a type; bound to the receiver's type where a member is used. */
const THIS_TYPE: Type = { kind: 'this' };

/** Array methods a `танҳохонӣ` (readonly) array doesn't have. */
const MUTATING_ARRAY_METHODS: ReadonlySet<string> = new Set([
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse',
  'fill',
  'copyWithin',
]);

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
export const BUILTIN_MEMBERS = {
  object: prototypeMembers(Object.prototype),
  array: prototypeMembers(Array.prototype),
  string: prototypeMembers(String.prototype),
  number: prototypeMembers(Number.prototype),
  boolean: prototypeMembers(Boolean.prototype),
  function: prototypeMembers(Function.prototype),
  Map: prototypeMembers(Map.prototype),
  Set: prototypeMembers(Set.prototype),
  Promise: prototypeMembers(Promise.prototype),
  // An instance, for its own `lastIndex`
  RegExp: prototypeMembers(/(?:)/),
} as const;

/** Type of regular expression literals (`/а+/g`) and `нав RegExp(…)`. */
const REGEXP_TYPE: Type = { kind: 'generic', name: 'RegExp', typeParameters: [] };

/** Array methods that return an element or `undefined` when there is none. */
const ARRAY_ELEMENT_OR_UNDEFINED: ReadonlySet<string> = new Set([
  'pop',
  'shift',
  'at',
  'find',
  'findLast',
]);

const RELATIONAL_OPERATORS: ReadonlySet<string> = new Set(['<', '>', '<=', '>=']);

/** Expressions that only assert a type (`х чун Т`, `<Т>х`, `х бармесоё Т`, `х!`). */
const ASSERTION_TYPES: ReadonlySet<string> = new Set([
  'AsExpression',
  'TypeAssertion',
  'SatisfiesExpression',
  'NonNullExpression',
]);

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
  private readonly onIdentifierType?: (_identifier: Identifier, _type: Type) => void;
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
  /** Type parameter names in scope (`<Т>` of functions, classes, …), innermost last. */
  private typeParameterScopes: Set<string>[] = [];
  /** Classes whose body is being checked, innermost last (the owners of `#ном` names). */
  private classStack: Type[] = [];
  /** Enum declarations already declared (merged enums add to the first one's type). */
  private declaredEnums: WeakSet<EnumDeclaration> = new WeakSet();
  /** Members of the declarations of a (merged) enum checked so far, by its enum object. */
  private checkedEnumMembers: WeakMap<Type, Set<string>> = new WeakMap();
  /** Types `initializePrimitiveTypes` gives the names `сатр`, `рақам`, … as values. */
  private primitiveValues: Set<Type> = new Set();
  /** Callee type of each call when last inferred, for type predicates (`х аст Т`). */
  private calleeTypes = new WeakMap<CallExpression, Type>();
  /**
   * Reference keys of bindings that hold a class made by a class expression
   * (`собит К = синф {…}`): `К.ном` reads a static member, as for `синф К`.
   */
  private classValueKeys: Set<string> = new Set();
  /** (source, target) pairs being compared, to stop recursion on recursive types. */
  private assignabilityStack: Array<[Type, Type]> = [];
  /** `эълон модул "ном" { … }`: what each declared module exports, by name. */
  private ambientModules: Map<string, AmbientModuleExports> = new Map();
  /**
   * Members `эълон глобалӣ { интерфейс Array<Т> { … } }` adds to built-in
   * types, by interface name.
   */
  private builtinAugmentations: Map<string, Map<string, PropertyType>> = new Map();

  private sourceLines: string[] = [];

  private readonly statementHandlers: Record<string, (_statement: Statement) => void> = {
    VariableDeclaration: s => this.checkVariableDeclaration(s as VariableDeclaration),
    VariableDeclarationList: s =>
      (s as VariableDeclarationList).declarations.forEach(d => this.checkVariableDeclaration(d)),
    FunctionDeclaration: s => this.checkFunctionDeclaration(s as FunctionDeclaration),
    ClassDeclaration: s => this.checkClassDeclaration(s as ClassDeclaration),
    ExpressionStatement: s => this.checkExpressionStatement(s as ExpressionStatement),
    ExportDeclaration: s => {
      const inner = (s as ExportDeclaration).declaration;
      if (inner) this.checkStatement(inner);
    },
    BlockStatement: s => this.withScope(() => this.checkStatements((s as BlockStatement).body)),
    IfStatement: s => this.checkIfStatement(s as IfStatement),
    WhileStatement: s => this.checkWhileStatement(s as WhileStatement),
    DoWhileStatement: s => this.checkDoWhileStatement(s as DoWhileStatement),
    LabeledStatement: s => this.checkLabeledStatement(s as LabeledStatement),
    EnumDeclaration: s => this.checkEnumDeclaration(s as EnumDeclaration),
    ForStatement: s => this.checkForStatement(s as ForStatement),
    ForInStatement: s => this.checkForInOfStatement(s as ForInStatement, true),
    ForOfStatement: s => this.checkForInOfStatement(s as ForOfStatement, false),
    SwitchStatement: s => this.checkSwitchStatement(s as SwitchStatement),
    TryStatement: s => this.checkTryStatement(s as TryStatement),
    ThrowStatement: s => this.inferExpressionType((s as ThrowStatement).argument),
    ReturnStatement: s => this.checkReturnStatement(s as ReturnStatement),
    NamespaceDeclaration: s => this.checkNamespace(s as NamespaceDeclaration),
    ExportAssignment: s => this.inferExpressionType((s as ExportAssignment).expression),
    ImportEqualsDeclaration: s => this.checkImportEquals(s as ImportEqualsDeclaration),
  };

  private readonly expressionHandlers: Record<
    string,
    (_expression: Expression, _targetType?: Type) => Type
  > = {
    Literal: e => this.inferLiteralType(e as Literal),
    RegExpLiteral: () => REGEXP_TYPE,
    ClassExpression: e => this.inferClassExpressionType(e as ClassExpression),
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
    UpdateExpression: e => {
      this.checkConstTarget((e as UpdateExpression).argument);
      this.checkReadonlyTarget((e as UpdateExpression).argument);
      return this.inferNumericOperand((e as UpdateExpression).argument);
    },
    TaggedTemplateExpression: e => this.inferTaggedTemplateType(e as TaggedTemplateExpression),
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
    // The value of `ҳосил х` is whatever the caller passes to `next()`
    YieldExpression: e => {
      const argument = (e as YieldExpression).argument;
      if (argument) this.inferExpressionType(argument);
      return UNKNOWN;
    },
    ArrowFunctionExpression: e =>
      this.inferFunctionExpressionType(e as unknown as FunctionLike, true),
    FunctionExpression: e => this.inferFunctionExpressionType(e as unknown as FunctionLike, false),
    ThisExpression: () => this.currentFunction()?.thisType ?? UNKNOWN,
    AsExpression: e => this.inferAssertionType(e as AsExpression),
    TypeAssertion: e => this.inferAssertionType(e as TypeAssertion),
    SatisfiesExpression: e => this.inferSatisfiesType(e as SatisfiesExpression),
    NonNullExpression: e =>
      this.removeNullish(this.inferExpressionType((e as NonNullExpression).expression)),
    // `ф<рақам>`: the generic function (or class) itself, as calls of it are checked
    InstantiationExpression: e =>
      this.inferExpressionType((e as InstantiationExpression).expression),
    ImportExpression: e => {
      this.inferExpressionType((e as unknown as { source: Expression }).source);
      return UNKNOWN;
    },
  };

  /** Declarations that only describe types: their names have no value to check. */
  private static readonly TYPE_DECLARATIONS: ReadonlySet<string> = new Set([
    'InterfaceDeclaration',
    'TypeAlias',
  ]);

  constructor(source?: string, options: TypeCheckOptions = {}) {
    this.sourceLines = source ? source.split(/\r?\n/) : [];
    this.strict = Boolean(options.strict);
    this.onIdentifierType = options.onIdentifierType;
  }

  /** Reports the type of a declared or read name to `onIdentifierType`. */
  private recordIdentifierType(identifier: Identifier, type: Type): void {
    if (this.silent === 0) this.onIdentifierType?.(identifier, type);
  }

  /**
   * Initialize primitive types in the symbol table
   */
  private initializePrimitiveTypes(): void {
    this.primitiveValues = new Set();
    for (const [name, primitive] of [
      ['сатр', 'string'],
      ['рақам', 'number'],
      ['мантиқӣ', 'boolean'],
      ['холӣ', 'null'],
    ]) {
      const type: Type = { kind: 'primitive', name: primitive };
      this.primitiveValues.add(type);
      this.declare(name, type);
    }
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
    this.typeParameterScopes = [];
    this.classStack = [];
    this.calleeTypes = new WeakMap();
    this.classValueKeys = new Set();
    this.ambientModules = new Map();
    this.builtinAugmentations = new Map();
    this.declaredEnums = new WeakSet();
    this.initializePrimitiveTypes();

    // `эълон глобалӣ { … }` declares top-level names; `эълон модул "ном"` modules
    const body = this.expandGlobalDeclarations(program.body);
    this.collectAmbientModules(body);

    // First pass: collect type definitions and hoist top-level bindings
    this.collectTypeDefinitions(body);

    // Second pass: type check statements
    this.checkStatements(body);

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
    // Enum names are types too: `интерфейс И { р: Ранг; }`
    this.declareEnums(declarations);
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
    this.declareEnums(declarations);
    const classes = declarations.filter(
      (s): s is ClassDeclaration =>
        s.type === 'ClassDeclaration' && !this.isDeclaredHere(s as ClassDeclaration)
    );
    classes.forEach(classDecl => this.declareClassShell(classDecl));
    classes.forEach(classDecl => this.collectClass(classDecl));

    // Overload signatures (`функсия ф(х: рақам): рақам;`), by function name
    const signatures = new Map<string, Type[]>();
    for (const statement of declarations) {
      switch (statement.type) {
        case 'FunctionDeclaration':
          this.hoistFunctionDeclaration(statement as FunctionDeclaration);
          break;
        case 'FunctionSignature': {
          const signature = statement as FunctionSignature;
          const list = signatures.get(signature.name.name) ?? [];
          list.push(this.buildFunctionType(signature.name.name, signature));
          signatures.set(signature.name.name, list);
          break;
        }
        case 'VariableDeclaration':
          this.hoistVariableDeclaration(statement as VariableDeclaration);
          break;
        case 'VariableDeclarationList':
          (statement as VariableDeclarationList).declarations.forEach(d =>
            this.hoistVariableDeclaration(d)
          );
          break;
        case 'NamespaceDeclaration':
          this.hoistNamespace(statement as NamespaceDeclaration);
          break;
        case 'ImportDeclaration':
          this.collectImport(statement as ImportDeclaration);
          break;
        case 'ImportEqualsDeclaration':
          this.collectImportEquals(statement as ImportEqualsDeclaration);
          break;
      }
    }
    signatures.forEach((overloads, name) => this.declareOverloads(name, overloads));
  }

  /**
   * Calls of an overloaded function are checked against its overload
   * signatures; the implementation's own signature is not callable. Without
   * an implementation (`эълон функсия`) the signatures alone make the function.
   */
  private declareOverloads(name: string, overloads: Type[]): void {
    const scope = this.scopes[this.scopes.length - 1];
    const implementation = scope.get(name);
    if (implementation?.kind === 'function' && !implementation.overloads) {
      scope.set(name, { ...implementation, overloads });
    } else if (!implementation) {
      this.declare(name, overloads.length > 1 ? { ...overloads[0], overloads } : overloads[0]);
    }
  }

  /**
   * A namespace is an open object of its exported members (see
   * `checkNamespace`); merged with a class, function or enum of its name
   * (declared before it), it adds to that value instead.
   */
  private hoistNamespace(namespace: NamespaceDeclaration): void {
    const name = namespace.name.name;
    let target = this.scopes[this.scopes.length - 1].get(name);
    if (!target) {
      target = { kind: 'object', name, properties: new Map(), open: true };
      this.declare(name, target);
    }
    // Members are known by name before the block is checked (and typed after)
    for (const statement of namespace.body.statements) {
      if (!namespace.declare && !(statement as { exported?: boolean }).exported) continue;
      if (TypeChecker.TYPE_DECLARATIONS.has(statement.type)) continue;
      for (const member of this.declaredNames(statement)) {
        this.addNamespaceMember(target, member, UNKNOWN, false);
      }
    }
  }

  /** A member a namespace adds to its value: a property, or a static member of a class. */
  private addNamespaceMember(target: Type, name: string, type: Type, replace: boolean): void {
    if (target.kind === 'class') {
      target.staticMembers?.add(name);
    } else if (target.kind === 'object' && target.properties) {
      if (replace || !target.properties.has(name)) {
        target.properties.set(name, { type, optional: false });
      }
    }
  }

  /**
   * Checks a namespace block in its own scope, where the members other blocks
   * of the namespace export are known too. What it exports (everything, in an
   * `эълон номфазо`) becomes a member of the namespace's value.
   */
  private checkNamespace(namespace: NamespaceDeclaration): void {
    const target = this.lookup(namespace.name.name);
    this.withScope(() => {
      const statements = namespace.body.statements;
      if (target?.kind === 'object' && !target.enumType) {
        // What the other blocks export; this block's own declarations come next
        const own = new Set(statements.flatMap(statement => this.declaredNames(statement)));
        target.properties?.forEach((member, name) => {
          if (!own.has(name)) this.declare(name, member.type);
        });
      }
      this.checkStatements(statements);
      if (!target) return;
      const scope = this.scopes[this.scopes.length - 1];
      for (const statement of statements) {
        if (!namespace.declare && !(statement as { exported?: boolean }).exported) continue;
        if (TypeChecker.TYPE_DECLARATIONS.has(statement.type)) continue;
        for (const name of this.declaredNames(statement)) {
          this.addNamespaceMember(target, name, scope.get(name) ?? UNKNOWN, true);
        }
      }
    });
  }

  /** `ворид х = Н.а;`: the alias has the type of what it names. */
  private checkImportEquals(declaration: ImportEqualsDeclaration): void {
    if (!declaration.reference || declaration.importKind === 'type') return;
    this.declare(declaration.id.name, this.inferExpressionType(declaration.reference));
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
    // undefined-identifier diagnostic. Cross-module type inference isn't wired,
    // except for modules declared with `эълон модул "ном" { … }`.
    const module = this.ambientModules.get(String(importDecl.source.value));
    for (const spec of importDecl.specifiers) {
      const typeOnly =
        importDecl.importKind === 'type' || (spec as ImportSpecifier).importKind === 'type';
      if (typeOnly) {
        // `ворид навъ { Т }`: a type, not a value
        this.declare(spec.local.name, { kind: 'unknown', name: spec.local.name, typeOnly: true });
      } else {
        const type = module ? this.ambientImportType(module, spec, importDecl) : UNKNOWN;
        this.declare(spec.local.name, type);
      }
    }
  }

  /** The type of what one specifier imports from a declared module. */
  private ambientImportType(
    module: AmbientModuleExports,
    spec: ImportDeclaration['specifiers'][number],
    importDecl: ImportDeclaration
  ): Type {
    const exportAssignment = module.values.get('export=');
    if (spec.type === 'ImportNamespaceSpecifier') {
      return exportAssignment ?? this.ambientModuleObject(module, String(importDecl.source.value));
    }
    const isDefault = spec.type === 'ImportDefaultSpecifier';
    const name = isDefault ? 'default' : (spec as ImportSpecifier).imported.name;
    const type =
      module.values.get(name) ??
      (isDefault ? exportAssignment : undefined) ??
      (exportAssignment ? this.getAllProperties(exportAssignment).get(name)?.type : undefined) ??
      this.forwardedExport(module, name, new Set());
    if (type) return type;
    if (module.types.has(name) || (exportAssignment && this.isOpenType(exportAssignment))) {
      return UNKNOWN;
    }
    const moduleName = String(importDecl.source.value);
    const missing = isDefault
      ? message('PROPERTY_NOT_FOUND.noDefaultExport', { module: moduleName })
      : message('PROPERTY_NOT_FOUND.noExportedMember', { module: moduleName, name });
    this.addError(TypeCheckErrorCode.PropertyNotFound, missing, spec.line, spec.column);
    return UNKNOWN;
  }

  /**
   * The type of `name` when `module` exports it from another module; unknown
   * when that module is not declared here, undefined when no module has it.
   */
  private forwardedExport(
    module: AmbientModuleExports,
    name: string,
    seen: Set<AmbientModuleExports>
  ): Type | undefined {
    if (seen.has(module)) return undefined;
    seen.add(module);
    const forwarded = module.forwarded.get(name);
    if (forwarded) {
      const source = this.ambientModules.get(forwarded.source);
      if (!source) return UNKNOWN;
      if (forwarded.name === '*') return this.ambientModuleObject(source, forwarded.source);
      return this.exportedFrom(source, forwarded.name, seen) ?? UNKNOWN;
    }
    // `содир * аз "н"` leaves out the default export
    if (name === 'default') return undefined;
    for (const sourceName of module.forwardedAll) {
      const source = this.ambientModules.get(sourceName);
      if (!source) return UNKNOWN;
      const type = this.exportedFrom(source, name, seen);
      if (type) return type;
    }
    return undefined;
  }

  /** What `module` exports as `name`: a value's type, unknown for a type, or undefined. */
  private exportedFrom(
    module: AmbientModuleExports,
    name: string,
    seen: Set<AmbientModuleExports>
  ): Type | undefined {
    if (module.types.has(name)) return UNKNOWN;
    return module.values.get(name) ?? this.forwardedExport(module, name, seen);
  }

  /** `ворид * чун м аз "ном"`: an object of the module's exports. */
  private ambientModuleObject(module: AmbientModuleExports, source: string): Type {
    const properties = new Map<string, PropertyType>();
    module.values.forEach((type, name) => properties.set(name, { type, optional: false }));
    // What it exports from other modules is not listed: other members are not errors
    const forwards = module.forwarded.size > 0 || module.forwardedAll.length > 0;
    return { kind: 'object', name: `"${source}"`, properties, ...(forwards && { open: true }) };
  }

  /** `ворид х = require("ном")`, `ворид х = Н.а;` (the alias is typed when checked). */
  private collectImportEquals(declaration: ImportEqualsDeclaration): void {
    const name = declaration.id.name;
    if (declaration.importKind === 'type') {
      this.declare(name, { kind: 'unknown', name, typeOnly: true });
      return;
    }
    const source = declaration.source ? String(declaration.source.value) : '';
    const module = this.ambientModules.get(source);
    const type = module
      ? (module.values.get('export=') ?? this.ambientModuleObject(module, source))
      : UNKNOWN;
    this.declare(name, type);
  }

  /**
   * `эълон глобалӣ { … }` declares names of the global scope: its body is
   * checked as top-level statements. Interfaces of built-in types there
   * (`интерфейс Array<Т> { охирин(): Т; }`) add members to those types.
   */
  private expandGlobalDeclarations(statements: Statement[]): Statement[] {
    return statements.flatMap(statement => {
      const global = statement as AmbientModuleDeclaration;
      if (global.type !== 'AmbientModuleDeclaration' || !global.global) return [statement];
      return global.body.filter(inner => {
        const declaration = this.unwrapExport(inner) as InterfaceDeclaration;
        if (
          declaration.type !== 'InterfaceDeclaration' ||
          !AUGMENTABLE_BUILTINS.has(declaration.name.name)
        ) {
          return true;
        }
        this.collectBuiltinAugmentation(declaration);
        return false;
      });
    });
  }

  private collectBuiltinAugmentation(declaration: InterfaceDeclaration): void {
    const name = declaration.name.name;
    const target: Type = {
      kind: 'interface',
      name,
      properties: this.builtinAugmentations.get(name) ?? new Map(),
    };
    this.withTypeParameters(declaration.typeParameters, () =>
      this.collectPropertySignatures(declaration.body.properties, target)
    );
    this.builtinAugmentations.set(name, target.properties!);
  }

  /** A member that `эълон глобалӣ` adds to a built-in type, by the built-in's kind. */
  private augmentedMember(type: Type, name: string, jsName: string): PropertyType | undefined {
    if (this.builtinAugmentations.size === 0) return undefined;
    const owners = ['Object'];
    if (type.kind === 'array' || type.kind === 'tuple') owners.push('Array', 'ReadonlyArray');
    else if (this.isStringType(type)) owners.push('String');
    else if (this.isNumericType(type)) owners.push('Number');
    else if (type.kind === 'generic' && type.name) owners.push(type.name);
    else if (this.getBaseType(type).name === 'boolean') owners.push('Boolean');
    for (const owner of owners) {
      const members = this.builtinAugmentations.get(owner);
      const member = members && this.findProperty(members, name, jsName);
      if (member) return member;
    }
    return undefined;
  }

  /**
   * Collects what each `эълон модул "ном" { … }` exports: everything it
   * declares, or only what it marks `содир` when it marks anything.
   */
  private collectAmbientModules(statements: Statement[]): void {
    for (const statement of statements) {
      const module = statement as AmbientModuleDeclaration;
      if (module.type !== 'AmbientModuleDeclaration' || !module.name) continue;
      const exports: AmbientModuleExports = {
        values: new Map(),
        types: new Set(),
        forwarded: new Map(),
        forwardedAll: [],
      };
      const explicit = module.body.some(
        inner => inner.type === 'ExportDeclaration' || inner.type === 'ExportAssignment'
      );
      this.withScope(() => {
        this.collectTypeDefinitions(module.body);
        this.hoistDeclarations(module.body);
        const scope = this.scopes[this.scopes.length - 1];
        for (const inner of module.body) {
          this.collectModuleExports(inner, explicit, scope, exports);
        }
      });
      this.ambientModules.set(String(module.name.value), exports);
    }
  }

  private collectModuleExports(
    statement: Statement,
    explicit: boolean,
    scope: Map<string, Type>,
    exports: AmbientModuleExports
  ): void {
    if (statement.type === 'ExportAssignment') {
      exports.values.set('export=', this.quietType((statement as ExportAssignment).expression));
      return;
    }
    const exportDecl = statement as ExportDeclaration;
    if (statement.type === 'ExportDeclaration' && exportDecl.source) {
      this.collectForwardedExports(exportDecl, exports);
      return;
    }
    if (statement.type === 'ExportDeclaration' && !exportDecl.declaration) {
      for (const spec of exportDecl.specifiers!) {
        const type = scope.get(spec.local.name);
        if (type) exports.values.set(spec.exported.name, type);
        else exports.types.add(spec.exported.name);
      }
      return;
    }
    if (explicit && statement.type !== 'ExportDeclaration') return;
    // An import alias is exported only when marked so (TypeScript's TS2459)
    if (statement.type === 'ImportEqualsDeclaration') return;
    const declaration = this.unwrapExport(statement);
    for (const name of this.declaredNames(declaration)) {
      if (TypeChecker.TYPE_DECLARATIONS.has(declaration.type)) {
        exports.types.add(name);
      } else {
        exports.values.set(exportDecl.default ? 'default' : name, scope.get(name) ?? UNKNOWN);
      }
    }
  }

  /** `содир { х } аз "н"`, `содир * аз "н"`, `содир * чун Н аз "н"` in a declared module. */
  private collectForwardedExports(
    exportDecl: ExportDeclaration,
    exports: AmbientModuleExports
  ): void {
    const source = String(exportDecl.source!.value);
    if (exportDecl.namespaceExport) {
      exports.forwarded.set(exportDecl.namespaceExport.name, { source, name: '*' });
    } else if (exportDecl.specifiers!.length === 0) {
      exports.forwardedAll.push(source);
    }
    for (const spec of exportDecl.specifiers!) {
      exports.forwarded.set(spec.exported.name, { source, name: spec.local.name });
    }
  }

  /** Names a declaration binds (or, for interfaces and type aliases, declares as types). */
  private declaredNames(statement: Statement): string[] {
    switch (statement.type) {
      case 'VariableDeclaration':
        return TypeChecker.patternNames((statement as VariableDeclaration).identifier);
      case 'VariableDeclarationList':
        return (statement as VariableDeclarationList).declarations.flatMap(d =>
          this.declaredNames(d)
        );
      case 'FunctionDeclaration':
      case 'FunctionSignature':
      case 'ClassDeclaration':
      case 'EnumDeclaration':
      case 'NamespaceDeclaration':
      case 'InterfaceDeclaration':
      case 'TypeAlias':
        return [(statement as FunctionDeclaration).name.name];
      case 'ImportEqualsDeclaration':
        // `ворид х = Н.а;`
        return [(statement as ImportEqualsDeclaration).id.name];
      default:
        return [];
    }
  }

  /** Names a binding declares: `х`, or each name of a pattern (`{ а, б: [в, ...г] = [] }`). */
  private static patternNames(pattern: Pattern): string[] {
    switch (pattern.type) {
      case 'Identifier':
        return [(pattern as Identifier).name];
      case 'ArrayPattern':
        return (pattern as ArrayPattern).elements.flatMap(element =>
          element ? TypeChecker.patternNames(element as Pattern) : []
        );
      case 'ObjectPattern':
        return (pattern as ObjectPattern).properties.flatMap(property =>
          TypeChecker.patternNames(
            (property.type === 'PropertyPattern' ? property.value : property) as Pattern
          )
        );
      case 'AssignmentPattern':
        return TypeChecker.patternNames((pattern as AssignmentPattern).left);
      default:
        // `...рест`
        return TypeChecker.patternNames((pattern as SpreadElement).argument as Pattern);
    }
  }

  private hoistFunctionDeclaration(funcDecl: FunctionDeclaration): void {
    const type = this.buildFunctionType(funcDecl.name.name, funcDecl);
    this.declare(funcDecl.name.name, type);
    this.recordIdentifierType(funcDecl.name, type);
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
    return this.withTypeParameters(fn.typeParameters, () => {
      const paramTypes: Type[] = [];
      const paramNames: string[] = [];
      const paramOptional: boolean[] = [];
      for (const param of fn.params) {
        paramTypes.push(this.resolveParameterType(param));
        paramNames.push(param.name.name);
        paramOptional.push(Boolean(param.optional) || param.defaultValue !== undefined);
      }
      const returnAnnotation = fn.returnType?.typeAnnotation;
      const returnType: Type = returnAnnotation ? this.resolveTypeNode(returnAnnotation) : UNKNOWN;
      const predicate =
        returnAnnotation?.type === 'TypePredicate'
          ? this.resolvePredicate(returnAnnotation as TypePredicate, fn.params)
          : undefined;
      return {
        kind: 'function',
        name,
        returnType,
        paramTypes,
        paramNames,
        paramOptional,
        hasRestParam: fn.params.length > 0 && Boolean(fn.params[fn.params.length - 1].rest),
        ...(predicate && { predicate }),
      };
    });
  }

  /** What a `х аст Т` / `тасдиқ х` return type says, or undefined when `х` is no parameter. */
  private resolvePredicate(
    predicate: TypePredicate,
    params: Parameter[]
  ): PredicateInfo | undefined {
    const subject = predicate.parameterName;
    const parameter =
      subject.type === 'ThisType'
        ? 'this'
        : params.findIndex(p => !p.pattern && p.name?.name === (subject as Identifier).name);
    if (parameter === -1) return undefined;
    return {
      parameter,
      asserts: predicate.asserts,
      ...(predicate.typeAnnotation && { type: this.resolveTypeNode(predicate.typeAnnotation) }),
    };
  }

  /** Runs `body` with the names of `typeParameters` shadowing other types (they are unknown). */
  private withTypeParameters<T>(typeParameters: TypeParameter[] | undefined, body: () => T): T {
    if (!typeParameters || typeParameters.length === 0) return body();
    this.typeParameterScopes.push(new Set(typeParameters.map(param => param.name.name)));
    try {
      return body();
    } finally {
      this.typeParameterScopes.pop();
    }
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
    this.withTypeParameters(interfaceDecl.typeParameters, () =>
      this.collectInterfaceMembers(interfaceDecl, allDecls, filled)
    );
  }

  private collectInterfaceMembers(
    interfaceDecl: InterfaceDeclaration,
    allDecls: InterfaceDeclaration[],
    filled: Set<InterfaceDeclaration>
  ): void {
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
      interfaceType.callSignatures ??= parent.callSignatures?.slice();
      interfaceType.constructSignatures ??= parent.constructSignatures?.slice();
      interfaceType.open ||= parent.open || !['interface', 'object', 'class'].includes(parent.kind);
    }

    this.collectPropertySignatures(interfaceDecl.body.properties, interfaceType);
  }

  /**
   * A method signature; several of one name (also from merged interfaces) are
   * overloads (`м(х: рақам): рақам; м(х: сатр): сатр;`) calls must match.
   * The type is named for diagnostics: "Function 'ном' expected 2 argument(s)".
   */
  private collectMethodSignature(prop: PropertySignature, type: Type, target: Type): void {
    const name = TypeChecker.signatureName(prop);
    const existing = target.properties!.get(name);
    if (existing?.type.kind !== 'function') {
      target.properties!.set(name, { type, optional: prop.optional });
      return;
    }
    const overloads = existing.type.overloads ?? [existing.type];
    target.properties!.set(name, {
      type: { ...existing.type, overloads: [...overloads, type] },
      optional: prop.optional && existing.optional,
    });
  }

  /** `get ном(): Т;` alone is read-only; with `set ном(…)` it is not. */
  private collectAccessorSignature(
    kind: 'get' | 'set',
    name: string,
    type: Type,
    target: Type
  ): void {
    const existing = target.properties!.get(name);
    const readonly = kind === 'get' && !(existing && !existing.readonly);
    target.properties!.set(name, {
      type: kind === 'set' && existing ? existing.type : type,
      optional: false,
      ...(readonly && { readonly: true }),
    });
  }

  /** The member name of a signature: `ном`, or the text of `"а-б"` and `1`. */
  private static signatureName(prop: PropertySignature): string {
    return prop.key.type === 'Identifier'
      ? (prop.key as Identifier).name
      : String((prop.key as Literal).value);
  }

  private collectPropertySignatures(signatures: PropertySignature[], target: Type): void {
    for (const prop of signatures) {
      // A computed name (`[калид]: Т`) is only known at run time
      if (!prop.key || !prop.typeAnnotation || prop.computed) continue;
      const type = this.withTypeParameters(prop.typeParameters, () =>
        this.resolveTypeNode(prop.typeAnnotation.typeAnnotation)
      );
      if (prop.signature) {
        // `(х: рақам): сатр;`, `нав (х: рақам): К;`: the type is callable or constructable
        const signatures =
          prop.signature === 'call'
            ? (target.callSignatures ??= [])
            : (target.constructSignatures ??= []);
        signatures.push(type);
        continue;
      }
      const name = TypeChecker.signatureName(prop);
      if (name === INDEX_SIGNATURE_KEY) {
        target.indexType = type;
      } else if (prop.method) {
        this.collectMethodSignature(prop, { ...type, name }, target);
      } else if (prop.kind) {
        this.collectAccessorSignature(prop.kind, name, type, target);
      } else {
        target.properties!.set(name, {
          type,
          optional: prop.optional,
          ...(prop.readonly && { readonly: true }),
        });
      }
    }
  }

  private collectTypeAlias(typeAlias: TypeAlias): void {
    const aliasType = this.withTypeParameters(typeAlias.typeParameters, () =>
      this.resolveTypeNode(typeAlias.typeAnnotation.typeAnnotation)
    );
    this.typeAliasTable.set(typeAlias.name.name, aliasType);
  }

  /**
   * Fills the class shell registered under the class name with its instance
   * members and links its base class by name.
   */
  private collectClass(classDecl: ClassDeclaration): void {
    const classType = this.lookup(classDecl.name.name)!;
    classType.staticMembers = new Set();
    if ((classDecl as ClassDeclaration & { abstract?: boolean }).abstract)
      classType.abstract = true;
    this.withTypeParameters(classDecl.typeParameters, () =>
      this.collectClassMembers(classDecl, classType)
    );

    classType.implicitMembers = this.collectImplicitMembers(classDecl);

    if (classDecl.superClass) {
      const parentName = TypeChecker.superClassName(classDecl);
      const parent = parentName === undefined ? undefined : this.lookup(parentName);
      if (parent?.kind === 'class') {
        classType.baseType = parent;
      } else {
        // A built-in or imported base: its members are unknown
        classType.open = true;
      }
    }
  }

  private collectClassMembers(classDecl: ClassDeclaration, classType: Type): void {
    const properties = classType.properties!;
    // Overload signatures of methods (`м(х: рақам): рақам;`), by name
    const overloads = new Map<string, Type[]>();
    for (const member of classDecl.body.body) {
      if (member.type === 'StaticBlock') continue;
      // `[калид]() {…}`: a name only known at run time
      if (member.computed) continue;
      if (member.type === 'PropertyDefinition' && member.indexSignature) {
        this.collectClassIndexSignature(member, classType);
        continue;
      }
      if (member.static) {
        classType.staticMembers!.add(this.memberKeyName(member.key));
        continue;
      }
      if (member.type === 'PropertyDefinition') {
        const prop = member as PropertyDefinition;
        const propType = prop.typeAnnotation
          ? this.resolveTypeNode(prop.typeAnnotation.typeAnnotation)
          : UNKNOWN;
        properties.set(this.memberKeyName(prop.key), {
          type: propType,
          optional: Boolean(prop.optional),
          ...(prop.readonly && { readonly: true }),
        });
      } else if (member.type === 'MethodDefinition' && member.signature) {
        this.collectMethodOverload(member, overloads, properties);
      } else if (member.type === 'MethodDefinition') {
        this.collectMethod(member as MethodDefinition, properties);
      }
    }
    overloads.forEach((list, name) => this.attachMethodOverloads(name, list, properties));
    this.collectParameterProperties(classDecl, properties);
  }

  /** A method signature without a body: an overload, or a member of an `эълон синф`. */
  private collectMethodOverload(
    member: MethodDefinition,
    overloads: Map<string, Type[]>,
    properties: Map<string, PropertyType>
  ): void {
    if (member.kind !== 'method') return;
    const name = this.memberKeyName(member.key);
    const list = overloads.get(name) ?? [];
    list.push(this.buildFunctionType(name, member.value));
    overloads.set(name, list);
    if (member.optional) properties.set(name, { type: list[0], optional: true });
  }

  /**
   * Calls of a method with overloads are checked against them; without an
   * implementation (`эълон синф`, `м?(): Т;`) the signatures are the method.
   */
  private attachMethodOverloads(
    name: string,
    overloads: Type[],
    properties: Map<string, PropertyType>
  ): void {
    const implementation = properties.get(name);
    if (implementation?.type.kind === 'function' && !implementation.optional) {
      properties.set(name, { ...implementation, type: { ...implementation.type, overloads } });
      return;
    }
    const type = overloads.length > 1 ? { ...overloads[0], overloads } : overloads[0];
    properties.set(name, { type, optional: Boolean(implementation?.optional) });
  }

  /** `[калид: сатр]: Т;` in a class: instances (or the class itself) accept any such key. */
  private collectClassIndexSignature(member: PropertyDefinition, classType: Type): void {
    if (member.static) {
      classType.staticMembers!.add(INDEX_SIGNATURE_KEY);
      return;
    }
    classType.indexType = member.typeAnnotation
      ? this.resolveTypeNode(member.typeAnnotation.typeAnnotation)
      : UNKNOWN;
  }

  /** The name a class member is known by: `#ном` for private names, a literal's value. */
  private memberKeyName(key: Identifier | PrivateIdentifier | Expression): string {
    if (key.type === 'PrivateIdentifier') return `#${(key as PrivateIdentifier).name}`;
    if (key.type === 'Literal') return String((key as Literal).value);
    return (key as Identifier).name;
  }

  /** `конструктор(хосусӣ х: рақам)` declares the instance property `х: рақам`. */
  private collectParameterProperties(
    classDecl: ClassDeclaration,
    properties: Map<string, PropertyType>
  ): void {
    for (const param of this.parameterProperties(classDecl)) {
      properties.set(param.name.name, {
        type: this.resolveParameterType(param),
        optional: Boolean(param.optional) && !param.defaultValue,
      });
    }
  }

  /** Constructor parameters with `хосусӣ`/`ҷамъиятӣ`/`муҳофизатшуда`/`танҳохонӣ`. */
  private parameterProperties(classDecl: ClassDeclaration): Parameter[] {
    const constructor = classDecl.body.body.find(
      (member): member is MethodDefinition =>
        member.type === 'MethodDefinition' && member.kind === 'constructor'
    );
    return (constructor?.value.params ?? []).filter(
      param => param.accessibility || param.readonly || param.override
    );
  }

  /**
   * Field initializers run before the constructor body assigns parameter
   * properties, so `у = ин.х;` with `конструктор(хосусӣ х)` reads `беқимат`:
   * TypeScript's "used before its initialization". Functions in an
   * initializer run later and may read them.
   */
  private checkParameterPropertyReads(classDecl: ClassDeclaration): void {
    const names = new Set(this.parameterProperties(classDecl).map(param => param.name.name));
    if (names.size === 0) return;
    const visit = (node: unknown): void => {
      if (!node || typeof node !== 'object') return;
      const record = node as Record<string, unknown>;
      if (TypeChecker.DEFERRED_NODES.has(record.type as string)) return;
      const member = record as unknown as MemberExpression;
      if (
        member.type === 'MemberExpression' &&
        member.object.type === 'ThisExpression' &&
        !member.computed &&
        member.property.type === 'Identifier' &&
        names.has((member.property as Identifier).name)
      ) {
        const name = (member.property as Identifier).name;
        this.addError(
          TypeCheckErrorCode.UsedBeforeInitialization,
          message('USED_BEFORE_INITIALIZATION', { name }),
          member.property.line,
          member.property.column
        );
      }
      Object.values(record).forEach(visit);
    };
    for (const member of classDecl.body.body) {
      if (member.type === 'PropertyDefinition' && !member.static) visit(member.value);
    }
  }

  /** Nodes whose code runs later than the expression containing them, with their own `ин`. */
  private static readonly DEFERRED_NODES: ReadonlySet<string> = new Set([
    'FunctionExpression',
    'ArrowFunctionExpression',
    'ClassExpression',
  ]);

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
      if (record.type === 'ClassDeclaration' || record.type === 'ClassExpression') return;
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
    const name = this.memberKeyName(method.key);
    const methodType = this.buildFunctionType(name, method.value);
    const kind = method.kind === 'method' ? undefined : method.kind;
    const property = this.methodProperty(kind, methodType, properties.get(name));
    // `м?() {…}`: an optional method
    properties.set(name, method.optional ? { ...property, optional: true } : property);
  }

  /**
   * The property a method defines: the method itself, or for an accessor the
   * getter's return type (else the setter's parameter type). A getter
   * without a setter is read-only.
   */
  private methodProperty(
    kind: 'get' | 'set' | undefined,
    methodType: Type,
    existing: PropertyType | undefined
  ): PropertyType {
    if (kind === 'get') {
      const type = methodType.returnType!;
      // A setter came first: it decides what may be assigned
      const writeType = existing && !existing.readonly ? existing.type : undefined;
      return {
        type,
        optional: false,
        ...(!existing && { readonly: true }),
        ...(writeType && { writeType }),
      };
    }
    if (kind === 'set') {
      const writeType = methodType.paramTypes?.[0] ?? UNKNOWN;
      if (!existing) return { type: writeType, optional: false };
      // `get х(): рақам` with `set х(в: рақам | сатр)` (TypeScript 5.1): reads and writes differ
      return { type: existing.type, optional: false, writeType };
    }
    return { type: methodType, optional: false };
  }

  /** Declares each enum of a statement list (once per scope) as a value and a type. */
  private declareEnums(declarations: Statement[]): void {
    for (const statement of declarations) {
      if (statement.type !== 'EnumDeclaration') continue;
      const enumDecl = statement as EnumDeclaration;
      if (this.declaredEnums.has(enumDecl)) continue;
      this.declaredEnums.add(enumDecl);
      const existing = this.scopes[this.scopes.length - 1].get(enumDecl.name.name);
      if (existing?.enumType) {
        // Merged enums (`шумориш Э { А } шумориш Э { Б = 1 }`) are one enum
        const merged = this.buildEnumType(enumDecl, existing.properties);
        existing.enumType = merged.enumType;
      } else {
        this.declare(enumDecl.name.name, this.buildEnumType(enumDecl));
      }
    }
  }

  /**
   * The enum object: its members are `рақам` (or `сатр` for string members),
   * and an unknown member is reported like one of any other object. As a
   * type, the enum's name stands for the union of its members' types.
   */
  private buildEnumType(
    enumDecl: EnumDeclaration,
    properties: Map<string, PropertyType> = new Map()
  ): Type {
    for (const member of enumDecl.members) {
      const isString = this.isStringEnumInitializer(member.initializer, enumDecl, properties);
      properties.set(this.enumMemberName(member), {
        type: isString ? STRING_TYPE : NUMBER_TYPE,
        optional: false,
      });
    }
    const memberTypes = [...properties.values()].map(prop => prop.type);
    const hasString = memberTypes.includes(STRING_TYPE);
    const hasNumber = memberTypes.includes(NUMBER_TYPE) || memberTypes.length === 0;
    const enumType =
      hasString && hasNumber
        ? { kind: 'union', types: [NUMBER_TYPE, STRING_TYPE] }
        : hasString
          ? STRING_TYPE
          : NUMBER_TYPE;
    return { kind: 'object', name: enumDecl.name.name, properties, enumType };
  }

  private enumMemberName(member: EnumMember): string {
    return member.id.type === 'Identifier'
      ? (member.id as Identifier).name
      : String((member.id as Literal).value);
  }

  /** `"х"`, `` `х` ``, a string member or a concatenation with one; other members are numbers. */
  private isStringEnumInitializer(
    initializer: Expression | undefined,
    enumDecl: EnumDeclaration,
    earlier: Map<string, PropertyType>
  ): boolean {
    if (!initializer) return false;
    const isStringMember = (name: string): boolean =>
      this.findProperty(earlier, name, translateMemberName(name))?.type === STRING_TYPE;
    switch (initializer.type) {
      case 'Literal':
        return typeof (initializer as Literal).value === 'string';
      case 'TemplateLiteral':
        return true;
      case 'Identifier':
        return isStringMember((initializer as Identifier).name);
      case 'MemberExpression': {
        const member = initializer as MemberExpression;
        return (
          member.object.type === 'Identifier' &&
          (member.object as Identifier).name === enumDecl.name.name &&
          member.property.type === 'Identifier' &&
          !member.computed &&
          isStringMember((member.property as Identifier).name)
        );
      }
      case 'BinaryExpression': {
        const binary = initializer as BinaryExpression;
        return (
          binary.operator === '+' &&
          (this.isStringEnumInitializer(binary.left, enumDecl, earlier) ||
            this.isStringEnumInitializer(binary.right, enumDecl, earlier))
        );
      }
      default:
        return false;
    }
  }

  /**
   * Checks member initializers; earlier members are in scope by name
   * (`Б = А * 2`), and so are the members of the enum's earlier declarations
   * (`шумориш Э { А } шумориш Э { Б = А + 1 }`).
   */
  private checkEnumDeclaration(enumDecl: EnumDeclaration): void {
    const enumType = this.lookup(enumDecl.name.name);
    const earlier = (enumType && this.checkedEnumMembers.get(enumType)) ?? new Set<string>();
    if (enumType) this.checkedEnumMembers.set(enumType, earlier);
    this.withScope(() => {
      for (const name of earlier) {
        this.declare(name, enumType?.properties?.get(name)?.type ?? NUMBER_TYPE);
      }
      for (const member of enumDecl.members) {
        if (member.initializer) this.inferExpressionType(member.initializer);
        const name = this.enumMemberName(member);
        if (member.id.type === 'Identifier') {
          this.declare(name, enumType?.properties?.get(name)?.type ?? NUMBER_TYPE);
          earlier.add(name);
        }
      }
    });
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

  /** An expression statement; a call to an assertion function (`тасдиқ х`) narrows what follows. */
  private checkExpressionStatement(statement: ExpressionStatement): void {
    const expression = statement.expression;
    this.inferExpressionType(expression);
    if (expression.type === 'CallExpression') {
      this.applyFacts(this.assertionFacts(expression as CallExpression));
    }
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
    this.checkCondition(statement.test);
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
    this.checkCondition(statement.test);
    this.inferExpressionType(statement.test);
    this.applyFacts(this.narrowingsFor(statement.test, true));
    this.checkBody(statement.body);
    this.narrowed = entry;
    if (!this.containsLoopExit(statement.body)) {
      this.applyFacts(this.narrowingsFor(statement.test, false));
    }
  }

  /**
   * `кун { … } то (шарт);`: the body runs before the test. It starts with
   * what holds before the loop or after a true test (found by a quiet first
   * pass); what the body assigns is only known again once it is reassigned or
   * checked.
   */
  private checkDoWhileStatement(statement: DoWhileStatement): void {
    this.checkCondition(statement.test);
    const before = this.narrowed;
    this.narrowed = new Map(before);
    this.invalidateAssignedIn(statement.body, statement.test);
    // Holds anywhere in the loop: nothing the loop assigns
    const loopEntry = this.narrowed;

    this.silent++;
    try {
      this.checkDoWhileIteration(statement, loopEntry, loopEntry);
      this.applyFacts(this.narrowingsFor(statement.test, true));
    } finally {
      this.silent--;
    }
    const bodyEntry = this.joinFacts(before, this.narrowed);

    this.checkDoWhileIteration(statement, bodyEntry, loopEntry);
    if (this.containsLoopExit(statement.body)) {
      // `шикастан` leaves without evaluating the test
      this.narrowed = this.joinFacts(loopEntry, this.narrowed);
    } else {
      this.applyFacts(this.narrowingsFor(statement.test, false));
    }
  }

  /** Checks the body and then the test of a do-while loop, starting from `entry`. */
  private checkDoWhileIteration(statement: DoWhileStatement, entry: Facts, loopEntry: Facts): void {
    this.narrowed = new Map(entry);
    this.checkBody(statement.body);
    // `давом` jumps to the test from anywhere in the body
    if (this.containsLoopContinue(statement.body)) {
      this.narrowed = this.joinFacts(loopEntry, this.narrowed);
    }
    this.inferExpressionType(statement.test);
  }

  /** `берун: …`; `шикастан берун;` may leave the body from anywhere in it. */
  private checkLabeledStatement(statement: LabeledStatement): void {
    const entry = new Map(this.narrowed);
    this.checkStatement(statement.body);
    if (this.breaksTo(statement.label.name, statement.body)) {
      const after = this.narrowed;
      this.narrowed = entry;
      this.invalidateAssignedIn(statement.body);
      this.narrowed = this.joinFacts(this.narrowed, after);
    }
  }

  private checkForStatement(statement: ForStatement): void {
    this.withScope(() => {
      if (statement.init) this.checkStatements([statement.init]);
      this.invalidateAssignedIn(statement.test, statement.update, statement.body);
      const entry = new Map(this.narrowed);
      if (statement.test) {
        this.checkCondition(statement.test);
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
        let elementType: Type = isForIn
          ? { kind: 'primitive', name: 'string' }
          : this.iterationElementType(iterated);
        // `барои интизор` awaits each element
        if ((statement as ForOfStatement).await) {
          elementType = this.unionOf(
            this.unionMembers(elementType).map(type => this.unwrapPromise(type))
          );
        }
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
    if (type.kind === 'array') return type.elementType!;
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
        // `гирифтан (е: ношинос)` / `(е: ҳар)` types the binding; untyped it is not checked
        const type = handler.typeAnnotation
          ? this.resolveTypeNode(handler.typeAnnotation.typeAnnotation)
          : UNKNOWN;
        if (handler.param) this.bindPatternTypes(handler.param, type);
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
        message('TYPE_NOT_ASSIGNABLE.return', { source, target }),
        statement.argument!.line,
        statement.argument!.column
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
      inferredType = this.inferInitializerType(varDecl, init, declaredType);
      if (declaredType) {
        this.checkAssignable(init, inferredType, declaredType, (source, target) =>
          this.addError(
            TypeCheckErrorCode.TypeMismatch,
            message('TYPE_NOT_ASSIGNABLE', { source, target }),
            init.line,
            init.column
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

  /**
   * Type of a variable's initializer. A class expression is named after the
   * variable when it has no name of its own (`собит К = синф {…}`), as in
   * JavaScript, and `К.ном` then reads its static members.
   */
  private inferInitializerType(
    varDecl: VariableDeclaration,
    init: Expression,
    declaredType?: Type
  ): Type {
    if (init.type !== 'ClassExpression' || varDecl.identifier.type !== 'Identifier') {
      return this.inferExpressionType(init, declaredType);
    }
    const name = varDecl.identifier.name;
    this.classValueKeys.add(this.bindingKey(this.scopes.length - 1, name));
    return this.inferClassExpressionType(init as ClassExpression, name);
  }

  private bindPatternTypes(pattern: Pattern, type: Type): void {
    switch (pattern.type) {
      case 'Identifier':
        this.declare((pattern as Identifier).name, type);
        this.recordIdentifierType(pattern as Identifier, type);
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
    const elementType = type.kind === 'array' ? type.elementType! : UNKNOWN;
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
      // `{ [калид]: қимат }`: the property is only known at run time
      if (prop.computed) this.inferExpressionType(prop.key as Expression);
      const keyName =
        prop.key.type === 'Identifier'
          ? (prop.key as Identifier).name
          : String((prop.key as Literal).value);
      const propType = prop.computed ? undefined : properties.get(keyName);
      this.bindPatternTypes(prop.value, propType?.type ?? UNKNOWN);
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
    this.withTypeParameters(fn.typeParameters, () => {
      // `функсия ф(ин: Т)`: `ин` has the declared type in the body
      const declaredThis = fn.thisType
        ? this.resolveTypeNode(fn.thisType.typeAnnotation)
        : thisType;
      this.checkFunctionBodyIn(fn, functionType, declaredThis, closure);
    });
  }

  private checkFunctionBodyIn(
    fn: FunctionLike,
    functionType: Type,
    thisType: Type | undefined,
    closure: boolean
  ): void {
    const isAsync = Boolean(fn.async ?? fn.isAsync);
    this.checkPredicateParameter(fn);
    this.functionStack.push({
      // A generator's declared type (`Generator<рақам>`, `Iterable<рақам>`) describes
      // what it yields, not what `бозгашт` returns; `илова(): ин` returns the
      // receiver: here, the class being checked
      returnType: fn.generator
        ? undefined
        : this.expectedReturnType(this.bindThis(functionType.returnType, thisType), isAsync),
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

  /** `х аст Т` / `тасдиқ х` must name a parameter of the function. */
  private checkPredicateParameter(fn: FunctionLike): void {
    const annotation = fn.returnType?.typeAnnotation;
    if (annotation?.type !== 'TypePredicate') return;
    const subject = (annotation as TypePredicate).parameterName;
    if (subject.type !== 'Identifier') return;
    const name = (subject as Identifier).name;
    if (fn.params.some(param => !param.pattern && param.name?.name === name)) return;
    this.addError(
      TypeCheckErrorCode.UndefinedIdentifier,
      message('UNDEFINED_IDENTIFIER.parameter', { name }),
      subject.line,
      subject.column
    );
  }

  private bindParameter(param: Parameter, paramType: Type): void {
    if (param.defaultValue) {
      const defaultValue = param.defaultValue;
      const defaultType = this.inferExpressionType(defaultValue, paramType);
      this.checkAssignable(defaultValue, defaultType, paramType, (source, target) =>
        this.addError(
          TypeCheckErrorCode.TypeMismatch,
          message('TYPE_NOT_ASSIGNABLE', { source, target }),
          defaultValue.line,
          defaultValue.column
        )
      );
    }
    // `а?: рақам` is `рақам | беқимат` inside the function
    const boundType =
      param.optional && !param.defaultValue ? this.optionalType(paramType) : paramType;
    if (param.pattern) {
      this.bindPatternTypes(param.pattern, boundType);
    } else if (param.name) {
      this.declare(param.name.name, boundType);
      this.recordIdentifierType(param.name, boundType);
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
    this.checkDecorators(classDecl);
    this.checkOverrides(classDecl);
    this.checkParameterPropertyReads(classDecl);
    this.withTypeParameters(classDecl.typeParameters, () => this.checkClassMembers(classDecl));
  }

  /** Decorator expressions (`@ном(…)`) of a class, its members and their parameters. */
  private checkDecorators(classDecl: ClassDeclaration): void {
    const decorators: Decorator[] = [...(classDecl.decorators ?? [])];
    for (const member of classDecl.body.body) {
      if (member.type === 'StaticBlock') continue;
      decorators.push(...(member.decorators ?? []));
      if (member.type === 'MethodDefinition') {
        member.value.params.forEach(param => decorators.push(...(param.decorators ?? [])));
      }
    }
    decorators.forEach(decorator => this.inferExpressionType(decorator.expression));
  }

  /**
   * A `бознавис` (override) member must override something: TypeScript's
   * TS4112 (no base class) and TS4113 (the base class lacks the member).
   */
  private checkOverrides(classDecl: ClassDeclaration): void {
    const overriding = this.overridingMembers(classDecl);
    if (overriding.length === 0) return;
    const baseName = TypeChecker.superClassName(classDecl);
    const base = baseName === undefined ? undefined : this.lookup(baseName);
    for (const member of overriding) {
      const reason = this.invalidOverrideReason(classDecl, base, member);
      if (reason) {
        this.addError(TypeCheckErrorCode.InvalidOverride, reason, member.line, member.column);
      }
    }
  }

  /** Members and parameter properties marked `бознавис`. */
  private overridingMembers(
    classDecl: ClassDeclaration
  ): Array<{ name: string; isStatic: boolean; line: number; column: number }> {
    const overriding: Array<{ name: string; isStatic: boolean; line: number; column: number }> = [];
    for (const member of classDecl.body.body) {
      if (member.type === 'StaticBlock' || !member.override || member.computed) continue;
      const name = this.memberKeyName(member.key);
      overriding.push({ name, isStatic: member.static, line: member.line, column: member.column });
    }
    for (const param of this.parameterProperties(classDecl)) {
      if (param.override) overriding.push({ ...param, name: param.name.name, isStatic: false });
    }
    return overriding;
  }

  /** Why `member` overrides nothing, or undefined when it does (or the base is unknown). */
  private invalidOverrideReason(
    classDecl: ClassDeclaration,
    base: Type | undefined,
    member: { name: string; isStatic: boolean }
  ): DiagnosticMessage | undefined {
    if (!classDecl.superClass) {
      return message('INVALID_OVERRIDE.noBase', { class: classDecl.name.name });
    }
    if (base?.kind !== 'class' || this.isOpenType(base)) return undefined;
    const jsName = translateMemberName(member.name);
    const exists = member.isStatic
      ? this.hasStaticMember(base, member.name, jsName)
      : Boolean(this.findProperty(this.getAllProperties(base), member.name, jsName)) ||
        this.hasImplicitMember(base, member.name, jsName);
    return exists ? undefined : message('INVALID_OVERRIDE.notInBase', { base: base.name });
  }

  private checkClassMembers(classDecl: ClassDeclaration): void {
    const classType = this.lookup(classDecl.name.name);
    if (classType) this.classStack.push(classType);
    try {
      this.checkClassMemberBodies(classDecl, classType);
    } finally {
      if (classType) this.classStack.pop();
    }
  }

  private checkClassMemberBodies(classDecl: ClassDeclaration, classType: Type | undefined): void {
    for (const member of classDecl.body.body) {
      if (member.type === 'StaticBlock') {
        this.checkStaticBlock(member);
        continue;
      }
      const thisType = member.static ? undefined : classType;
      // A computed name (`[Symbol.iterator]()`, `[калид] = 1`) is an expression of the outer scope
      if (member.computed) this.inferExpressionType(member.key as Expression);
      // Signatures without a body (overloads, `эълон синф`) and index signatures
      if (member.type === 'MethodDefinition' && member.signature) continue;
      if (member.type === 'PropertyDefinition' && member.indexSignature) continue;
      if (member.type === 'PropertyDefinition') {
        this.functionStack.push({ thisType });
        this.validatePropertyDefinition(member as PropertyDefinition);
        this.functionStack.pop();
      } else if (member.type === 'MethodDefinition') {
        const method = member as MethodDefinition;
        const methodType = this.buildFunctionType(this.memberKeyName(method.key), method.value);
        this.checkFunctionBody(method.value, methodType, thisType);
      }
    }
  }

  /** `статикӣ { … }` runs once, like a function body without parameters; `ин` is the class. */
  private checkStaticBlock(block: StaticBlock): void {
    const body: BlockStatement = {
      type: 'BlockStatement',
      body: block.body,
      line: block.line,
      column: block.column,
    };
    this.checkFunctionBody(
      { params: [], body },
      { kind: 'function', returnType: UNKNOWN },
      undefined,
      true
    );
  }

  /**
   * A class expression has the class itself as its type, as a declaration
   * does; `bindingName` names a class without a name of its own.
   */
  private inferClassExpressionType(classExpr: ClassExpression, bindingName?: string): Type {
    const name = classExpr.name?.name ?? bindingName ?? '(Anonymous class)';
    const classDecl = {
      ...classExpr,
      type: 'ClassDeclaration',
      name: classExpr.name ?? {
        type: 'Identifier',
        name,
        line: classExpr.line,
        column: classExpr.column,
      },
    } as ClassDeclaration;
    let classType: Type = UNKNOWN;
    // The class's own name is bound inside its body only
    this.withScope(() => {
      this.declareClassShell(classDecl);
      classType = this.lookup(name)!;
      this.classValueKeys.add(this.bindingKey(this.scopes.length - 1, name));
      this.collectClass(classDecl);
      this.checkClassDeclaration(classDecl);
    });
    return classType;
  }

  /** The name of a class's base class, or undefined for none or an expression (`Омехта(А)`). */
  private static superClassName(classDecl: ClassDeclaration | ClassExpression): string | undefined {
    const superClass = classDecl.superClass;
    return superClass?.type === 'Identifier' ? (superClass as Identifier).name : undefined;
  }

  private validateSuperClass(classDecl: ClassDeclaration): void {
    if (!classDecl.superClass) return;

    const parentName = TypeChecker.superClassName(classDecl);
    // `мерос Н.Асос`, `мерос Омехта(Асос)`: the expression is checked, its class is not known
    if (parentName === undefined) {
      this.inferExpressionType(classDecl.superClass);
      return;
    }
    const parentType = this.lookup(parentName);
    const interfaceType = this.interfaceTable.get(parentName);

    if (interfaceType) {
      this.addError(
        TypeCheckErrorCode.InvalidExtends,
        message('INVALID_EXTENDS', {
          class: classDecl.name.name,
          parent: parentName,
          kind: 'interface',
        }),
        classDecl.line,
        classDecl.column
      );
      return;
    }

    if (!parentType) {
      if (!this.isBuiltinValueName(parentName)) {
        this.addError(
          TypeCheckErrorCode.ClassNotFound,
          message('CLASS_NOT_FOUND', { name: parentName }),
          classDecl.line,
          classDecl.column
        );
      }
      return;
    }

    // Imported or otherwise untyped bases can't be validated, nor can a `ҳар`
    // value (a mixin's base: `(Асос: ҳар) => синф мерос Асос { … }`)
    if (
      parentType.kind === 'unknown' ||
      (parentType.kind === 'primitive' && parentType.name === 'any')
    ) {
      return;
    }

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
    this.addError(
      TypeCheckErrorCode.InvalidExtends,
      message('INVALID_EXTENDS', {
        class: classDecl.name.name,
        parent: TypeChecker.superClassName(classDecl),
        kind: parentType.kind,
      }),
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
        message('TYPE_NOT_ASSIGNABLE.property', {
          source,
          target,
          property: this.memberKeyName(prop.key),
        }),
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
        const circular = message(
          current === parentType ? 'CIRCULAR_INHERITANCE.self' : 'CIRCULAR_INHERITANCE',
          { class: className }
        );
        this.addError(TypeCheckErrorCode.CircularInheritance, circular, line, column);
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
        // `<Т>(х: Т) => Т`: `Т` is a type parameter in the signature
        return this.withTypeParameters(fnType.typeParameters, () =>
          this.buildFunctionType(undefined, {
            params: fnType.parameters,
            returnType: {
              type: 'TypeAnnotation',
              typeAnnotation: fnType.returnType,
              line: 0,
              column: 0,
            },
          })
        );
      }
      default:
        return this.resolveTypeOperator(typeNode);
    }
  }

  /** `танҳохонӣ Т[]`, `ин`, `нав () => Т`, and a type predicate as a return type (a мантиқӣ). */
  private resolveTypeOperator(typeNode: TypeNode): Type {
    switch (typeNode.type) {
      case 'ReadonlyType':
        // An array or tuple type (the parser reports any other operand)
        return {
          ...this.resolveTypeNode((typeNode as ReadonlyType).typeAnnotation),
          readonly: true,
        };
      case 'ThisType':
        return THIS_TYPE;
      case 'TypePredicate':
        return (typeNode as TypePredicate).asserts ? VOID_TYPE : BOOLEAN_TYPE;
      case 'ConstructorType': {
        const constructorType = typeNode as ConstructorType;
        return this.withTypeParameters(constructorType.typeParameters, () => ({
          ...this.buildFunctionType(undefined, {
            params: constructorType.parameters,
            returnType: {
              type: 'TypeAnnotation',
              typeAnnotation: constructorType.returnType,
              line: 0,
              column: 0,
            },
          }),
          kind: 'constructor',
        }));
      }
      case 'OptionalType':
      case 'RestType':
        return this.resolveTypeNode((typeNode as OptionalType | RestType).typeAnnotation);
      case 'TemplateLiteralType':
        // `пеш_${К}` is approximated as a string
        return STRING_TYPE;
      default:
        return UNKNOWN;
    }
  }

  private resolvePrimitiveType(primitiveType: PrimitiveType): Type {
    return { kind: 'primitive', name: this.mapTajikToPrimitive(primitiveType.name) };
  }

  private resolveLiteralType(literalType: LiteralType): Type {
    // A bigint literal type (`1n`), like a bigint literal value, is not a рақам
    if (literalType.bigint) return UNKNOWN;
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

  /** `[рақам, сатр?, ...мантиқӣ[]]`: optional elements set `minLength`, a rest element `restType`. */
  private resolveTupleType(tupleType: TupleType): Type {
    const elements = tupleType.elementTypes;
    const restIndex = elements.findIndex(element => element.type === 'RestType');
    if (restIndex !== -1 && restIndex !== elements.length - 1) {
      // `[...Т[], У]`: elements after a rest element are not tracked
      return { kind: 'array', elementType: UNKNOWN };
    }
    const fixed = restIndex === -1 ? elements : elements.slice(0, restIndex);
    const tuple: Type = { kind: 'tuple', types: fixed.map(t => this.resolveTypeNode(t)) };
    const optionalIndex = fixed.findIndex(element => element.type === 'OptionalType');
    if (optionalIndex !== -1) tuple.minLength = optionalIndex;
    if (restIndex !== -1) {
      const rest = this.resolveTypeNode(elements[restIndex]);
      tuple.restType = rest.kind === 'array' ? rest.elementType : UNKNOWN;
    }
    return tuple;
  }

  /** Type a tuple has at `index`: the element (with `беқимат` when optional) or the rest element. */
  private tupleElementAt(tuple: Type, index: number): Type | undefined {
    const types = tuple.types!;
    if (index >= types.length) return tuple.restType;
    const optional = index >= (tuple.minLength ?? types.length);
    return optional ? this.optionalType(types[index]) : types[index];
  }

  /** Whether a tuple type has room for exactly `length` elements. */
  private tupleAccepts(tuple: Type, length: number): boolean {
    const types = tuple.types!;
    return (
      length >= (tuple.minLength ?? types.length) &&
      (tuple.restType !== undefined || length <= types.length)
    );
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
    // A type parameter (`<Т>`) shadows types of the same name
    if (this.typeParameterScopes.some(scope => scope.has(typeName))) {
      return { kind: 'unknown', name: typeName };
    }

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
    // An enum's name is also the type of its members: `тағ р: Ранг = Ранг.Сурх;`
    if (classType?.enumType) {
      return classType.enumType;
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
      case 'рамз':
        return 'symbol';
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
    if (typeof literal.value === 'number' && /n$/.test(literal.raw)) {
      // BigInt literal (`10n`): not a рақам
      return UNKNOWN;
    }
    if (literal.value === null) return { kind: 'primitive', name: 'null' };
    // A literal type, for better type inference
    return { kind: 'literal', value: literal.value };
  }

  /** `чоп`, `математика`, … naming the built-in object, not a binding of that name. */
  private isBuiltinReference(expression: Expression): boolean {
    return (
      expression.type === 'Identifier' &&
      isCheckedBuiltinObject((expression as Identifier).name) &&
      !this.lookup((expression as Identifier).name)
    );
  }

  /** A declared or built-in name close to `name`, for "did you mean". */
  private similarName(name: string): string | undefined {
    const names = new Set<string>();
    this.scopes.forEach(scope => scope.forEach((_type, declared) => names.add(declared)));
    TypeChecker.BUILTIN_VALUE_NAMES.forEach(builtin => names.add(builtin));
    INPUT_FUNCTION_TYPES.forEach((_type, input) => names.add(input));
    return closestName(name, names);
  }

  /** A member of `type` close to `name`: its own members and the Tajik names of built-in ones. */
  private similarMember(name: string, type: Type): string | undefined {
    const candidates = new Set<string>();
    for (const member of this.unionMembers(type)) {
      const builtin = this.builtinMembersOf(member);
      if (builtin) {
        for (const [alias, jsName] of BUILTIN_MAPPINGS) {
          if (MEMBER_ALIASES.has(alias) && builtin.has(jsName)) candidates.add(alias);
        }
      }
      this.getAllProperties(member).forEach((_property, key) => candidates.add(key));
    }
    return closestName(name, candidates);
  }

  private isBuiltinValueName(name: string): boolean {
    return TypeChecker.BUILTIN_VALUE_NAMES.has(name) || name in global;
  }

  private inferIdentifierType(identifier: Identifier): Type {
    const type = this.identifierValueType(identifier);
    this.recordIdentifierType(identifier, type);
    return type;
  }

  private identifierValueType(identifier: Identifier): Type {
    const sym = this.lookup(identifier.name);
    if (sym?.typeOnly) {
      this.addError(
        TypeCheckErrorCode.TypeOnlyImportValue,
        message('TYPE_ONLY_IMPORT_VALUE', { name: identifier.name }),
        identifier.line,
        identifier.column
      );
      return UNKNOWN;
    }
    if (sym) {
      return this.narrowed.get(this.referenceKey(identifier)!) ?? sym;
    }
    if (identifier.name === 'беқимат' || identifier.name === 'undefined') return UNDEFINED_TYPE;
    const input = INPUT_FUNCTION_TYPES.get(identifier.name);
    if (input) return input;
    // Empty names are parser error-recovery placeholders
    if (!identifier.name || this.isBuiltinValueName(identifier.name)) {
      return UNKNOWN;
    }
    this.addError(
      TypeCheckErrorCode.UndefinedIdentifier,
      message('UNDEFINED_IDENTIFIER', {
        name: identifier.name,
        suggestion: this.similarName(identifier.name),
      }),
      identifier.line,
      identifier.column
    );
    return UNKNOWN;
  }

  private inferTupleTypeFromTarget(arrayExpr: ArrayExpression, targetType: Type): Type {
    const inferredTypes: Type[] = [];
    for (let i = 0; i < arrayExpr.elements.length; i++) {
      const element = arrayExpr.elements[i];
      const targetElementType = this.tupleElementAt(targetType, i) ?? UNKNOWN;
      // A hole (`[1, , 3]`) is `беқимат`
      const inferredType = element
        ? this.inferExpressionType(element, targetElementType)
        : UNDEFINED_TYPE;
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
    const elements = arrayExpr.elements.filter((element): element is Expression => !!element);
    const hasSpread = elements.some(e => e.type === 'SpreadElement');
    const targetType = this.arrayContextType(contextType, elements.length);

    // If target type is a tuple, use bidirectional inference
    if (targetType && targetType.kind === 'tuple' && targetType.types && !hasSpread) {
      return this.inferTupleTypeFromTarget(arrayExpr, targetType);
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
      targetType.types.find(t => t.kind === 'tuple' && this.tupleAccepts(t, length)) ??
      targetType.types.find(t => t.kind === 'array')
    );
  }

  /**
   * Get the base type of a type, converting literals to their base primitives
   * E.g., { kind: 'literal', value: 5 } -> { kind: 'primitive', name: 'number' }
   */
  /** `сатр`, `рақам` or `мантиқӣ`: the primitive of a literal type's value. */
  private static literalBaseName(type: Type): string {
    return typeof type.value === 'string'
      ? 'string'
      : typeof type.value === 'number'
        ? 'number'
        : 'boolean';
  }

  private getBaseType(type: Type): Type {
    if (type.kind === 'literal') {
      return { kind: 'primitive', name: TypeChecker.literalBaseName(type) };
    }
    return type;
  }

  /**
   * Type of a binding without annotation: literals become their primitive
   * (except for `собит` bindings), `холӣ`/`беқимат` become unknown, and
   * object/array members are widened since they stay mutable.
   */
  private widenType(type: Type, keepLiteral = false): Type {
    if (type.constant) return type;
    switch (type.kind) {
      case 'literal':
        return keepLiteral ? type : this.getBaseType(type);
      case 'primitive':
        return type.name === 'null' || type.name === 'undefined' ? UNKNOWN : type;
      case 'array':
        return {
          kind: 'array',
          elementType: this.widenType(type.elementType!),
          ...(type.readonly && { readonly: true }),
        };
      case 'union':
        // `Г | холӣ` stays nullable: only a binding of plain `холӣ` is widened
        return this.unionOf(type.types!.map(t => (this.isNullishType(t) ? t : this.widenType(t))));
      case 'object':
        return this.widenObjectType(type);
      default:
        return type;
    }
  }

  /** An object type with its members widened (they stay mutable). */
  private widenObjectType(type: Type): Type {
    const properties = new Map<string, PropertyType>();
    for (const [key, prop] of type.properties!) {
      properties.set(key, { type: this.widenType(prop.type), optional: prop.optional });
    }
    return {
      kind: 'object',
      properties,
      ...(type.open && { open: true }),
      ...(type.fromLiteral && { fromLiteral: true }),
    };
  }

  private inferObjectType(objExpr: ObjectExpression, targetType?: Type): Type {
    const targetProperties = targetType ? this.getAllProperties(targetType) : new Map();
    const properties = new Map<string, PropertyType>();
    // Spread and computed keys contribute members we can't name statically
    let open = false;

    for (const prop of objExpr.properties) {
      if (prop.type === 'SpreadElement') {
        this.inferExpressionType((prop as SpreadElement).argument);
        open = true;
        continue;
      }
      if (prop.computed) {
        this.inferExpressionType(prop.key);
        open = true;
      }
      const value = prop.value;
      const keyName = this.propertyKeyName(prop.key);
      const contextType = prop.kind ? undefined : targetProperties.get(keyName)?.type;
      const valueType = this.inferExpressionType(value, contextType);
      if (!prop.computed) {
        properties.set(keyName, this.methodProperty(prop.kind, valueType, properties.get(keyName)));
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
    // `функсия ном(…) { … }`: the name is bound in the function's body only
    this.withScope(() => {
      if (fn.name) this.declare(fn.name.name, functionType);
      this.checkFunctionBody(fn, functionType, thisType, true);
    });
    return functionType;
  }

  private isOptionalChain(expression: Expression): boolean {
    let current: Expression | undefined = expression;
    while (current) {
      if (current.type === 'NonNullExpression') {
        // `о?.а!.б` is still one chain
        current = (current as NonNullExpression).expression;
        continue;
      }
      if (current.type !== 'MemberExpression' && current.type !== 'CallExpression') break;
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
    const property = this.memberPropertyName(member);
    // `илова(): ин` called on `о` returns the type of `о`
    const memberType = this.bindThis(
      this.namedMemberType(member, objectType, property),
      objectType
    )!;
    if (inOptionalChain) return UNKNOWN;
    const key = ignoreNarrowing ? undefined : this.referenceKey(member);
    return (key ? this.narrowed.get(key) : undefined) ?? memberType;
  }

  /** The property of `о.ном` / `о.#ном` (not computed) as an identifier named like the member (`#ном`). */
  private memberPropertyName(member: MemberExpression): Identifier {
    const property = member.property;
    if (property.type !== 'PrivateIdentifier') return property as Identifier;
    const name = `#${(property as PrivateIdentifier).name}`;
    return { type: 'Identifier', name, line: property.line, column: property.column };
  }

  /** `type` with `ин` (the `this` type) replaced by `receiver`, also in a method's return type. */
  private bindThis(type: Type | undefined, receiver: Type | undefined): Type | undefined {
    if (type?.kind === 'this') return receiver ?? UNKNOWN;
    if (type?.kind === 'function' && type.returnType?.kind === 'this') {
      return { ...type, returnType: receiver ?? UNKNOWN };
    }
    if (type?.kind === 'union' && type.types?.some(t => t.kind === 'this')) {
      return { ...type, types: type.types.map(t => this.bindThis(t, receiver)!) };
    }
    return type;
  }

  /**
   * Type of `object.name` (`name` as written, possibly a Tajik alias such as
   * `дарозӣ`); reports members the object's type doesn't have.
   */
  private namedMemberType(member: MemberExpression, objectType: Type, property: Identifier): Type {
    const name = property.name;
    // `чоп.сабтт`, `математика.решаа`: built-in objects have a fixed set of members
    if (this.isBuiltinReference(member.object)) {
      const objectName = (member.object as Identifier).name;
      if (!builtinObjectHasMember(objectName, name)) {
        this.addError(
          TypeCheckErrorCode.PropertyNotFound,
          message('PROPERTY_NOT_FOUND.builtinObject', {
            name,
            jsName: builtinObjectMemberName(objectName, name),
            object: objectName,
            suggestion: closestName(name, builtinObjectMemberNames(objectName)),
          }),
          property.line,
          property.column
        );
      }
      return UNKNOWN;
    }
    const jsName = translateMemberName(name);
    // `Синф.статикӣ`: the class itself, not an instance
    if (
      member.object.type === 'Identifier' &&
      objectType.kind === 'class' &&
      (objectType.name === (member.object as Identifier).name ||
        this.classValueKeys.has(this.referenceKey(member.object)!))
    ) {
      if (!this.hasStaticMember(objectType, name, jsName)) {
        this.reportMissingMember(property, name, jsName, objectType, true);
      }
      return UNKNOWN;
    }
    // `сатр.хоми`: `сатр` as a value is the String constructor, whose members aren't listed
    if (this.primitiveValues.has(objectType)) return UNKNOWN;
    if (name.startsWith('#') && !this.hasPrivateName(objectType, name)) {
      this.reportMissingMember(property, name, jsName, objectType, false);
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
   * `о.#ном` names the `#ном` of the innermost enclosing class declaring it;
   * only instances of that class (and its subclasses) have it.
   */
  private hasPrivateName(objectType: Type, name: string): boolean {
    const owner = [...this.classStack]
      .reverse()
      .find(c => c.properties?.has(name) || c.staticMembers?.has(name));
    if (!owner) return true;
    return this.unionMembers(objectType).every(type => {
      if (type.kind !== 'class') return true;
      const visited = new Set<Type>();
      for (let t: Type | undefined = type; t && !visited.has(t); t = t.baseType) {
        if (t === owner) return true;
        visited.add(t);
      }
      return false;
    });
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
    // Members `эълон глобалӣ { интерфейс Array<Т> { … } }` adds
    const augmented = this.augmentedMember(type, name, jsName);
    if (builtin) {
      // A `танҳохонӣ` array has no methods that change it
      const removed = type.readonly && MUTATING_ARRAY_METHODS.has(jsName);
      return {
        known: true,
        exists: (builtin.has(jsName) && !removed) || augmented !== undefined,
        type: augmented?.type ?? this.builtinMemberType(type, jsName),
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
      augmented !== undefined ||
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
    // A class is a function: `name`, `call`, … and its own `prototype`
    if (jsName === 'prototype' || BUILTIN_MEMBERS.function.has(jsName)) return true;
    if (this.isOpenType(classType)) return true;
    for (
      let t: Type | undefined = classType, depth = 0;
      t && depth < 100;
      t = t.baseType, depth++
    ) {
      for (const member of t.staticMembers ?? []) {
        // `статикӣ [калид: сатр]: Т;` accepts every name
        if (member === INDEX_SIGNATURE_KEY) return true;
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
      (['Map', 'Set', 'Promise', 'RegExp'] as const).includes(type.name as 'Map')
    ) {
      return BUILTIN_MEMBERS[type.name as 'Map' | 'Set' | 'Promise' | 'RegExp'];
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

  /** Members of `Map<К, В>` / `Set<Т>` / `RegExp` with known types. */
  private collectionMemberType(type: Type, jsName: string): Type {
    if ((type.name === 'Map' || type.name === 'Set') && jsName === 'size') return NUMBER_TYPE;
    if (type.name === 'RegExp') {
      if (jsName === 'test') return this.methodReturning({ kind: 'primitive', name: 'boolean' });
      if (jsName === 'lastIndex') return NUMBER_TYPE;
      if (jsName === 'source' || jsName === 'flags') return STRING_TYPE;
    }
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
    const isMapOrSet = this.unionMembers(objectType).some(
      t => t.kind === 'generic' && (t.name === 'Map' || t.name === 'Set')
    );
    const suggestion = isStatic ? undefined : this.similarMember(name, objectType);
    const missing = isStatic
      ? message('PROPERTY_NOT_FOUND.static', { name, jsName, class: objectType.name })
      : message('PROPERTY_NOT_FOUND', {
          name,
          jsName,
          type: this.typeToString(objectType),
          mapSet: isMapOrSet && jsName === 'includes' ? 'yes' : undefined,
          suggestion,
        });
    // Reading `о.#ном` from an object whose class doesn't declare `#ном` always throws
    const report =
      this.strict || name.startsWith('#') ? this.addError.bind(this) : this.addWarning.bind(this);
    report(TypeCheckErrorCode.PropertyNotFound, missing, property.line, property.column);
  }

  private indexedAccessType(objectType: Type, indexType: Type): Type {
    if (!this.isNumericType(indexType)) return UNKNOWN;
    if (objectType.kind === 'array') return objectType.elementType!;
    if (objectType.kind === 'tuple' && indexType.kind === 'literal') {
      return this.tupleElementAt(objectType, indexType.value as number) ?? UNKNOWN;
    }
    return UNKNOWN;
  }

  private inferAssignmentType(assignment: AssignmentExpression): Type {
    const left = assignment.left;
    // `х! = 1` and `(х чун Т) = 1` assign to `х`
    const reference = this.skipAssertions(left);
    const isReference = reference.type === 'Identifier' || reference.type === 'MemberExpression';
    const isPlain = assignment.operator === '=';
    if (this.checkConstTarget(reference)) {
      return this.inferExpressionType(assignment.right);
    }
    // The target accepts its declared type, not what an earlier check narrowed it to
    const leftType = this.inferAssignmentTargetType(left);
    this.checkReadonlyTarget(left);
    if (this.isArithmeticAssignment(assignment.operator, leftType)) {
      this.checkNotNullish(left, leftType);
    }
    const rightType = this.inferExpressionType(assignment.right, isPlain ? leftType : undefined);

    if (isPlain && isReference) {
      this.checkAssignable(assignment.right, rightType, leftType, (source, target) =>
        this.addError(
          TypeCheckErrorCode.TypeMismatch,
          message('TYPE_NOT_ASSIGNABLE', { source, target }),
          assignment.right.line,
          assignment.right.column
        )
      );
    }
    if (isPlain || assignment.operator === '??=') {
      const assigned = isPlain ? rightType : this.removeNullish(leftType);
      if (reference === left || left.type === 'NonNullExpression') {
        // `х! = 1` narrows `х` like `х = 1` does
        const declared = reference === left ? leftType : this.inferAssignmentTargetType(reference);
        this.narrowOnAssignment(reference, declared, assigned);
      } else {
        // Through `(х чун Т)` the assignment only invalidates what was known about `х`
        this.invalidate(this.referenceKey(reference));
      }
    }
    this.forEachNode(left, node => {
      // Destructuring assignment: forget what was known about each target
      if (!isReference) {
        if (node.type === 'Identifier' || node.type === 'MemberExpression') {
          this.invalidate(this.referenceKey(node as Expression));
        }
      }
    });
    return rightType;
  }

  /** Reports a new value for a `собит` (`х = 2`, `х++`); true when it is one. */
  private checkConstTarget(target: Expression): boolean {
    if (target.type !== 'Identifier') return false;
    const key = this.referenceKey(target);
    if (key === undefined || !this.constKeys.has(key)) return false;
    this.addError(
      TypeCheckErrorCode.ConstAssignment,
      message('CONST_ASSIGNMENT', { name: (target as Identifier).name }),
      target.line,
      target.column
    );
    return true;
  }

  private inferAssignmentTargetType(target: Expression): Type {
    if (target.type === 'NonNullExpression') {
      const inner = (target as NonNullExpression).expression;
      return this.removeNullish(this.inferAssignmentTargetType(inner));
    }
    if (target.type === 'MemberExpression') {
      return (
        this.memberWriteType(target as MemberExpression) ??
        this.inferMemberType(target as MemberExpression, true)
      );
    }
    if (target.type === 'Identifier') {
      const declared = this.lookup((target as Identifier).name);
      if (declared) return declared;
    }
    return this.inferExpressionType(target);
  }

  /** What `о.х = …` may assign when `х` has a setter whose type differs from its getter's. */
  private memberWriteType(member: MemberExpression): Type | undefined {
    if (member.computed || member.property.type !== 'Identifier') return undefined;
    const objectType = this.removeNullish(this.quietType(member.object));
    if (!['class', 'interface', 'object'].includes(objectType.kind)) return undefined;
    const name = (member.property as Identifier).name;
    const property = this.findProperty(
      this.getAllProperties(objectType),
      name,
      translateMemberName(name)
    );
    return property?.writeType;
  }

  /**
   * `р[0] = 1` / `р[0]++` on a `танҳохонӣ` array or tuple, `о.х = 1` on a
   * `танҳохонӣ х` property: an error in strict mode, a warning otherwise.
   */
  private checkReadonlyTarget(target: Expression): void {
    if (target.type !== 'MemberExpression') return;
    const member = target as MemberExpression;
    const objectType = this.removeNullish(this.quietType(member.object));
    const readonly = this.readonlyMemberMessage(member, objectType);
    if (!readonly) return;
    const report = this.strict ? this.addError.bind(this) : this.addWarning.bind(this);
    report(TypeCheckErrorCode.ReadonlyAssignment, readonly, member.line, member.column);
  }

  private readonlyMemberMessage(
    member: MemberExpression,
    objectType: Type
  ): DiagnosticMessage | undefined {
    const list = this.unionMembers(objectType).find(t => t.readonly);
    if (list) {
      return message('READONLY_ASSIGNMENT.element', {
        reference: this.referencePath(member.object),
        type: this.typeToString(list),
      });
    }
    const property = member.computed ? undefined : this.memberPropertyName(member);
    // `ин.ном = …` initialises the property in the constructor; `Синф.ном` is a static
    const isClassItself =
      member.object.type === 'Identifier' &&
      objectType.kind === 'class' &&
      objectType.name === (member.object as Identifier).name;
    if (!property || member.object.type === 'ThisExpression' || isClassItself) return undefined;
    const name = property.name;
    const declared = this.findProperty(
      this.getAllProperties(objectType),
      name,
      translateMemberName(name)
    );
    return declared?.readonly ? message('READONLY_ASSIGNMENT', { name }) : undefined;
  }

  /** `х -= 1`, `х += 1` on a non-string, … — operators that compute with the old value. */
  private isArithmeticAssignment(operator: string, targetType: Type): boolean {
    if (operator === '+=') return !this.isStringType(this.removeNullish(targetType));
    return NUMERIC_BINARY_OPERATORS.has(operator.slice(0, -1)) && operator !== '==';
  }

  private inferBinaryType(binary: BinaryExpression): Type {
    const op = binary.operator;
    this.checkConstantOperand(binary);
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
    if (unary.operator === '!') this.checkConstantCondition(unary.argument);
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
        // `-1` is the literal type `-1`, as in TypeScript
        if (unary.operator === '-' && argument.kind === 'literal') {
          if (typeof argument.value === 'number')
            return { kind: 'literal', value: -argument.value };
        }
        const operand = this.checkNotNullish(unary.argument, argument);
        return this.isNumericType(operand) ? { kind: 'primitive', name: 'number' } : UNKNOWN;
      }
      default:
        return UNKNOWN;
    }
  }

  /** `беқимат` (`undefined`) naming the global value, not a local. */
  private readonly isGlobalUndefined = (identifier: Identifier): boolean =>
    (identifier.name === 'беқимат' || identifier.name === 'undefined') &&
    !this.lookup(identifier.name);

  /** The test of `агар`, `то`, `барои` and `?:`. */
  private checkCondition(test: Expression): void {
    this.checkConstantCondition(test);
    // `агар (х = 1)`: a learner who meant to compare
    const inner = skipOuterExpressions(test);
    if (inner.type === 'AssignmentExpression' && (inner as AssignmentExpression).operator === '=') {
      this.addWarning(
        TypeCheckErrorCode.AssignmentInCondition,
        message('ASSIGNMENT_IN_CONDITION'),
        inner.line,
        inner.column
      );
    }
  }

  /**
   * A condition its syntax decides, as TypeScript reports it since 5.6: always
   * truthy (`агар ([])`, TS2872) or always falsy (`то ("")`, TS2873).
   */
  private checkConstantCondition(test: Expression): void {
    const semantics = truthySemantics(test, this.isGlobalUndefined);
    if (semantics === 'sometimes') return;
    this.reportConstantCondition(
      test,
      semantics === 'always' ? 'CONSTANT_CONDITION.truthy' : 'CONSTANT_CONDITION.falsy'
    );
  }

  /**
   * The left operand of `??` when its syntax decides it, as TypeScript reports it
   * since 5.6: never nullish (`0 ?? 4`, TS2869) or always (`холӣ ?? 1`, TS2871).
   */
  private checkNullishOperand(left: Expression): void {
    const operand = skipOuterExpressions(left);
    const semantics = nullishSemantics(operand, this.isGlobalUndefined);
    if (semantics === 'sometimes') return;
    this.reportConstantCondition(
      operand,
      semantics === 'never' ? 'CONSTANT_CONDITION.neverNullish' : 'CONSTANT_CONDITION.alwaysNullish'
    );
  }

  /** The left operand of `??`, `&&` and `||`, which TypeScript checks by its syntax. */
  private checkConstantOperand(binary: BinaryExpression): void {
    if (binary.operator === '??') {
      this.checkNullishOperand(binary.left);
    } else if (binary.operator === '&&' || binary.operator === '||') {
      this.checkConstantCondition(binary.left);
    }
  }

  /** Reports a constant condition once, also when its expression is inferred again. */
  private reportConstantCondition(node: Expression, id: string): void {
    if (this.silent > 0 || this.constantConditions.has(node)) return;
    this.constantConditions.add(node);
    this.addError(TypeCheckErrorCode.ConstantCondition, message(id), node.line, node.column);
  }

  /** Conditions and `??` operands reported by `reportConstantCondition`. */
  private readonly constantConditions = new WeakSet<Expression>();

  /** The operand of `++`/`--`: a number that is not nullish. */
  private inferNumericOperand(argument: Expression): Type {
    const type = this.checkNotNullish(argument, this.inferExpressionType(argument));
    return this.isNumericType(type) ? { kind: 'primitive', name: 'number' } : UNKNOWN;
  }

  private inferConditionalType(conditional: ConditionalExpression, targetType?: Type): Type {
    this.checkCondition(conditional.test);
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

  // ---------------------------------------------------------------------------
  // Type assertions: `х чун Т`, `<Т>х`, `х чун собит`, `х бармесоё Т`, `х!`
  // ---------------------------------------------------------------------------

  /** The expression an assertion (or several) wraps. */
  private skipAssertions(expression: Expression): Expression {
    let current = expression;
    while (ASSERTION_TYPES.has(current.type)) {
      current = (current as NonNullExpression).expression;
    }
    return current;
  }

  /**
   * `х чун Т` / `<Т>х` has type `Т` (in strict mode `х чун Г` removes
   * `холӣ`). As in TypeScript, it is an error only when neither type is
   * assignable to the other.
   */
  private inferAssertionType(assertion: AsExpression | TypeAssertion): Type {
    if (assertion.isConst || !assertion.typeAnnotation) {
      return this.inferConstAssertionType(assertion);
    }
    const target = this.resolveTypeNode(assertion.typeAnnotation);
    const source = this.inferExpressionType(assertion.expression, target);
    if (!this.isComparable(source, target)) {
      const sourceName = this.typeToString(this.widenLiterals(source));
      this.addError(
        TypeCheckErrorCode.TypeMismatch,
        message('TYPE_NOT_ASSIGNABLE.conversion', {
          source: sourceName,
          target: this.typeToString(target),
        }),
        assertion.line,
        assertion.column
      );
    }
    return target;
  }

  /** `type` with its literal types widened, as an assertion compares its operand (`1` → `рақам`). */
  private widenLiterals(type: Type): Type {
    switch (type.kind) {
      case 'literal':
        return this.getBaseType(type);
      case 'union':
        return this.unionOf(type.types!.map(t => this.widenLiterals(t)));
      case 'tuple':
        return { ...type, types: type.types?.map(t => this.widenLiterals(t)) };
      case 'array':
        return { ...type, elementType: this.widenLiterals(type.elementType!) };
      case 'object': {
        const properties = new Map<string, PropertyType>();
        for (const [key, prop] of type.properties!) {
          properties.set(key, { ...prop, type: this.widenLiterals(prop.type) });
        }
        return { ...type, properties };
      }
      default:
        return type;
    }
  }

  /**
   * TypeScript's comparability of assertions: some member of one type
   * (literal types widened or not) is assignable to some member of the other.
   */
  private isComparable(source: Type, target: Type): boolean {
    if (this.isAnyLike(source) || this.isAnyLike(target)) return true;
    const isNever = (t: Type) => t.kind === 'primitive' && t.name === 'never';
    const sources = [
      ...this.unionMembers(source),
      ...this.unionMembers(this.widenLiterals(source)),
    ];
    const targets = this.unionMembers(target);
    return sources.some(s =>
      targets.some(
        t =>
          isNever(s) ||
          isNever(t) ||
          this.isAssignable(s, t) ||
          this.isAssignable(t, s) ||
          this.hasRequiredMembers(s, t) ||
          this.hasRequiredMembers(t, s)
      )
    );
  }

  /** `[1] чун { length: рақам }`: a built-in value has every required member of an object type. */
  private hasRequiredMembers(builtin: Type, objectType: Type): boolean {
    if (objectType.kind !== 'object' && objectType.kind !== 'interface') return false;
    const members =
      this.builtinMembersOf(builtin) ??
      (builtin.kind === 'function' ? BUILTIN_MEMBERS.function : undefined);
    if (!members) return false;
    return [...this.getAllProperties(objectType)].every(
      ([name, prop]) => prop.optional || members.has(translateMemberName(name))
    );
  }

  /**
   * `х чун собит`: literals keep their literal types, array literals become
   * readonly tuples, and none of them is widened when bound.
   */
  private inferConstAssertionType(assertion: AsExpression | TypeAssertion): Type {
    const expression = assertion.expression;
    if (!this.isConstAssertionOperand(expression)) {
      this.addError(
        TypeCheckErrorCode.TypeMismatch,
        message('TYPE_NOT_ASSIGNABLE.constAssertion'),
        assertion.line,
        assertion.column
      );
      return this.inferExpressionType(expression);
    }
    return this.constType(expression);
  }

  /** Operands TypeScript accepts in `as const` (a member expression may name an enum member). */
  private isConstAssertionOperand(expression: Expression): boolean {
    switch (expression.type) {
      case 'Literal':
        return (expression as Literal).value !== null;
      case 'TemplateLiteral':
      case 'ArrayExpression':
      case 'ObjectExpression':
      case 'MemberExpression':
        return true;
      case 'UnaryExpression': {
        const unary = expression as UnaryExpression;
        return (
          (unary.operator === '-' || unary.operator === '+') &&
          unary.argument.type === 'Literal' &&
          typeof (unary.argument as Literal).value === 'number'
        );
      }
      default:
        return false;
    }
  }

  private constType(expression: Expression): Type {
    switch (expression.type) {
      case 'ArrayExpression': {
        const elements = (expression as ArrayExpression).elements;
        if (elements.some(element => !element || element.type === 'SpreadElement')) {
          return { ...this.inferExpressionType(expression), constant: true };
        }
        return {
          kind: 'tuple',
          types: elements.map(element => this.constType(element!)),
          constant: true,
          readonly: true,
        };
      }
      case 'ObjectExpression': {
        const objExpr = expression as ObjectExpression;
        if (objExpr.properties.some(p => p.type === 'SpreadElement' || p.computed)) {
          return this.inferExpressionType(expression);
        }
        const properties = new Map<string, PropertyType>();
        for (const prop of objExpr.properties as Property[]) {
          const value = prop.value;
          properties.set(this.propertyKeyName(prop.key), {
            type: this.constType(value),
            optional: false,
          });
        }
        return { kind: 'object', properties, fromLiteral: true, constant: true };
      }
      case 'UnaryExpression': {
        const unary = expression as UnaryExpression;
        const value = (unary.argument as Literal).value;
        if (
          unary.argument.type === 'Literal' &&
          typeof value === 'number' &&
          !/n$/.test((unary.argument as Literal).raw)
        ) {
          return {
            kind: 'literal',
            value: unary.operator === '-' ? -value : value,
            constant: true,
          };
        }
        return this.inferExpressionType(expression);
      }
      default: {
        const type = this.inferExpressionType(expression);
        return type.kind === 'literal' ? { ...type, constant: true } : type;
      }
    }
  }

  /**
   * `х бармесоё Т`: `х` must be assignable to `Т` (object literals without
   * unknown keys, as for `тағ х: Т = …`) and keeps its own type.
   */
  private inferSatisfiesType(node: SatisfiesExpression): Type {
    const target = this.resolveTypeNode(node.typeAnnotation);
    const type = this.inferExpressionType(node.expression, target);
    this.checkAssignable(node.expression, type, target, (source, expected) =>
      this.addError(
        TypeCheckErrorCode.TypeMismatch,
        message('TYPE_NOT_ASSIGNABLE.satisfies', { source, expected }),
        node.expression.line,
        node.expression.column
      )
    );
    return type;
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
    if (this.isBuiltinReference(callee) && isNotCallableBuiltin((callee as Identifier).name)) {
      this.addError(
        TypeCheckErrorCode.NotCallable,
        message('NOT_CALLABLE', { name: (callee as Identifier).name }),
        callee.line,
        callee.column
      );
    }
    // Route identifiers through inferIdentifierType so undefined callees
    // produce a single UndefinedIdentifier diagnostic.
    const functionType = this.callableType(this.inferExpressionType(callee));
    this.calleeTypes.set(callExpr, functionType);
    if (functionType.kind === 'function' && !this.isOptionalChain(callExpr)) {
      if (functionType.overloads) return this.inferOverloadedCall(callExpr, functionType);
      this.validateCallArguments(callExpr, functionType);
      return functionType.returnType!;
    }
    // Still evaluate args so nested undefined identifiers are flagged.
    callExpr.arguments.forEach(arg => this.inferExpressionType(arg));
    return UNKNOWN;
  }

  /**
   * The function type a call of a value of `type` is checked against: its
   * call signatures (`интерфейс Ф { (х: рақам): сатр; }`, overloads when
   * there are several) or the type itself.
   */
  private callableType(type: Type): Type {
    const signatures = type.kind === 'function' ? undefined : type.callSignatures;
    if (!signatures || signatures.length === 0) return type;
    return signatures.length === 1 ? signatures[0] : { ...signatures[0], overloads: signatures };
  }

  /** What `нав` of a value of `type` creates, by its construct signature. */
  private constructedType(type: Type | undefined): Type | undefined {
    const signature = type?.constructSignatures?.[0];
    return signature?.returnType;
  }

  /**
   * A call of an overloaded function: the first overload whose parameters fit
   * the arguments (their count and types) decides the result; when none fits,
   * that is TypeScript's "No overload matches this call".
   */
  private inferOverloadedCall(callExpr: CallExpression, functionType: Type): Type {
    const overloads = functionType.overloads!;
    const match = overloads.find(overload => this.overloadAccepts(callExpr, overload));
    if (match) {
      this.validateCallArguments(callExpr, match);
      return match.returnType!;
    }
    callExpr.arguments.forEach(arg => this.inferExpressionType(arg));
    const signatures = overloads.map(overload => this.functionTypeToString(overload)).join('; ');
    this.addError(
      TypeCheckErrorCode.NoMatchingOverload,
      message('NO_MATCHING_OVERLOAD', { function: functionType.name, overloads: signatures }),
      callExpr.line,
      callExpr.column
    );
    return UNKNOWN;
  }

  /** Whether the arguments of `callExpr` fit `overload`, judged without reporting anything. */
  private overloadAccepts(callExpr: CallExpression, overload: Type): boolean {
    const paramTypes = overload.paramTypes!;
    const args = callExpr.arguments;
    const shape = this.parameterShape(overload);
    const spreadIndex = args.findIndex(arg => arg.type === 'SpreadElement');
    if (
      spreadIndex === -1 &&
      (args.length < shape.requiredCount || (!shape.hasRest && args.length > shape.fixedCount))
    ) {
      return false;
    }
    return args.every((arg, i) => {
      if (spreadIndex !== -1 && i >= spreadIndex) return true;
      const declared = i < shape.fixedCount ? paramTypes[i] : shape.restElementType;
      if (!declared) return true;
      const paramType =
        i < shape.fixedCount && shape.optional[i] ? this.optionalType(declared) : declared;
      this.silent++;
      try {
        const argType = this.inferExpressionType(arg, paramType);
        return this.isAssignableFrom(arg, argType, paramType);
      } finally {
        this.silent--;
      }
    });
  }

  /** Parameter counts of a function type: fixed, required, optional ones and the rest element. */
  private parameterShape(functionType: Type): {
    hasRest: boolean;
    fixedCount: number;
    requiredCount: number;
    optional: boolean[];
    restElementType?: Type;
  } {
    const paramTypes = functionType.paramTypes!;
    const hasRest = Boolean(functionType.hasRestParam);
    const fixedCount = hasRest ? paramTypes.length - 1 : paramTypes.length;
    const optional = functionType.paramOptional!;
    const requiredCount = optional.slice(0, fixedCount).filter(o => !o).length;
    const restType = hasRest ? paramTypes[paramTypes.length - 1] : undefined;
    const restElementType = restType?.kind === 'array' ? restType.elementType : undefined;
    return { hasRest, fixedCount, requiredCount, optional, restElementType };
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
    const { hasRest, fixedCount, optional, requiredCount } = this.parameterShape(functionType);

    if (
      spreadIndex === -1 &&
      (args.length < requiredCount || (!hasRest && args.length > fixedCount))
    ) {
      this.addError(
        TypeCheckErrorCode.ArgumentCountMismatch,
        message('ARGUMENT_COUNT_MISMATCH', {
          function: functionType.name,
          min: requiredCount,
          max: hasRest ? undefined : fixedCount,
          got: args.length,
        }),
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
          message('ARGUMENT_TYPE_MISMATCH', {
            index: i + 1,
            function: functionType.name,
            expected: target,
            got: source,
          }),
          argNode.line,
          argNode.column
        )
      );
    });
  }

  /** `тег\`…\``: the tag is called, so the result is what it returns. */
  private inferTaggedTemplateType(tagged: TaggedTemplateExpression): Type {
    const tagType = this.checkNotNullish(tagged.tag, this.inferExpressionType(tagged.tag));
    tagged.quasi.expressions.forEach(part => this.inferExpressionType(part));
    return tagType.kind === 'function' ? tagType.returnType! : UNKNOWN;
  }

  private inferNewExpressionType(newExpr: NewExpression): Type {
    // Walk args so nested undefined identifiers are flagged
    newExpr.arguments.forEach(arg => this.inferExpressionType(arg));
    if (newExpr.callee.type === 'Identifier') {
      const className = (newExpr.callee as Identifier).name;
      const builtin = this.builtinInstanceType(className, newExpr);
      if (builtin) return builtin;

      const classType = this.lookup(className);
      if (classType && classType.kind === 'class') {
        if (classType.abstract) {
          this.addError(
            TypeCheckErrorCode.AbstractInstantiation,
            message('ABSTRACT_INSTANTIATION', { class: className }),
            newExpr.line,
            newExpr.column
          );
        }
        // Return the actual class type with all its properties and baseType
        return classType;
      }
      // A value of a constructor type: `нав (а: рақам) => Т`
      if (classType?.kind === 'constructor') return classType.returnType!;
      // A value of a type with a construct signature: `{ нав (а: рақам): Т }`
      const constructed = this.constructedType(classType);
      if (constructed) return constructed;
    } else {
      // `нав (синф { … })()` constructs an instance of the class
      const calleeType = this.inferExpressionType(newExpr.callee);
      if (calleeType.kind === 'class') return calleeType;
      const constructed = this.constructedType(calleeType);
      if (constructed) return constructed;
    }
    return UNKNOWN;
  }

  /** Instances of built-in classes: `нав Map<сатр, рақам>()`, `нав Set()`, `нав RegExp(…)`. */
  private builtinInstanceType(className: string, newExpr: NewExpression): Type | undefined {
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
    if (className === 'RegExp' && !this.lookup(className)) return REGEXP_TYPE;
    return undefined;
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
      case 'NonNullExpression':
        // `х!` refers to `х`, as in TypeScript
        return this.referenceKey((expression as NonNullExpression).expression);
      case 'MemberExpression': {
        const member = expression as MemberExpression;
        const property = member.computed ? undefined : this.memberPropertyName(member);
        if (!property) return undefined;
        const objectKey = this.referenceKey(member.object);
        return objectKey && `${objectKey}.${property.name}`;
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
    if (test.type === 'NonNullExpression') {
      // `агар (х!)` tests `х` itself
      return this.narrowingsFor((test as NonNullExpression).expression, assumeTrue);
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
    // A call is no reference, but a call of a type predicate narrows its argument
    if (expression.type === 'CallExpression') {
      return this.predicateFacts(expression as CallExpression, assumeTrue);
    }
    const key = this.referenceKey(expression);
    if (!key || !assumeTrue) return new Map();
    const current = this.quietType(expression);
    if (this.isAnyLike(current) || this.nullishNames(current).length === 0) return new Map();
    return new Map([[key, this.removeNullish(current)]]);
  }

  /** `агар (сатрАст(х))` with `сатрАст(х: ношинос): х аст сатр`: `х` is a сатр when it returns true. */
  private predicateFacts(call: CallExpression, assumeTrue: boolean): Facts {
    const predicate = this.calleePredicate(call);
    if (!predicate || predicate.asserts) return new Map();
    return this.predicateSubjectFacts(call, predicate, assumeTrue);
  }

  /** After the statement `тасдиқКун(х);` with `тасдиқКун(ш: ҳар): тасдиқ ш [аст Т]`. */
  private assertionFacts(call: CallExpression): Facts {
    const predicate = this.calleePredicate(call);
    if (!predicate?.asserts) return new Map();
    if (predicate.type) return this.predicateSubjectFacts(call, predicate, true);
    // `тасдиқ ш`: the argument is truthy, so it narrows like a condition
    const subject = this.predicateSubject(call, predicate);
    return subject ? this.narrowingsFor(subject, true) : new Map();
  }

  private calleePredicate(call: CallExpression): PredicateInfo | undefined {
    if (this.isOptionalChain(call)) return undefined;
    const calleeType = this.calleeTypes.get(call) ?? this.quietType(call.callee);
    return calleeType.kind === 'function' ? calleeType.predicate : undefined;
  }

  /** The argument a predicate is about, or the receiver for `ин аст Т`. */
  private predicateSubject(call: CallExpression, predicate: PredicateInfo): Expression | undefined {
    if (predicate.parameter === 'this') {
      const callee = call.callee;
      return callee.type === 'MemberExpression' ? (callee as MemberExpression).object : undefined;
    }
    const argument = call.arguments[predicate.parameter];
    return argument?.type === 'SpreadElement' ? undefined : argument;
  }

  private predicateSubjectFacts(
    call: CallExpression,
    predicate: PredicateInfo,
    assumeTrue: boolean
  ): Facts {
    const subject = this.predicateSubject(call, predicate);
    const key = subject && this.referenceKey(subject);
    if (!subject || !key || !predicate.type) return new Map();
    const current = this.quietType(subject);
    const narrowed = assumeTrue
      ? this.narrowTo(current, predicate.type)
      : this.narrowExcluding(current, predicate.type);
    return narrowed ? new Map([[key, narrowed]]) : new Map();
  }

  /** `current` where a predicate says it is a `target`: the union members that are, else `target`. */
  private narrowTo(current: Type, target: Type): Type {
    if (this.isAnyLike(current)) return target;
    const kept = this.unionMembers(current).filter(t => this.isAssignable(t, target));
    if (kept.length > 0) return this.unionOf(kept);
    // `ин аст { қимат: рақам }` on a class instance: both, as in TypeScript
    if (['class', 'interface', 'object'].includes(current.kind)) {
      return { kind: 'intersection', types: [current, target] };
    }
    return target;
  }

  /** `current` where a predicate says it is no `target`: the other union members. */
  private narrowExcluding(current: Type, target: Type): Type | undefined {
    if (this.isAnyLike(current)) return undefined;
    const members = this.unionMembers(current);
    const rest = members.filter(t => !this.isAssignable(t, target));
    return rest.length > 0 && rest.length < members.length ? this.unionOf(rest) : undefined;
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
    const base = this.getBaseType(type.kind === 'unique' ? type.baseType! : type);
    if (base.kind === 'primitive') {
      if (base.name === 'null') return 'object';
      return ['string', 'number', 'boolean', 'undefined', 'symbol'].includes(base.name!)
        ? base.name
        : undefined;
    }
    if (type.kind === 'function' || type.kind === 'constructor') return 'function';
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
        const left = this.skipAssertions((node as AssignmentExpression).left);
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
      if (['typeAnnotation', 'returnType', 'typeArguments', 'typeParameters'].includes(key)) {
        continue;
      }
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

  /** Whether `body` has a `давом` that may continue the loop owning `body`. */
  private containsLoopContinue(body: Statement): boolean {
    const visit = (node: unknown, nested: boolean): boolean => {
      if (!node || typeof node !== 'object') return false;
      if (Array.isArray(node)) return node.some(child => visit(child, nested));
      const record = node as Record<string, unknown>;
      const type = String(record.type ?? '');
      // An unlabelled `давом` in a nested loop continues that one
      if (type === 'ContinueStatement') return !nested || Boolean(record.label);
      if (/Function|ClassDeclaration/.test(type)) return false;
      const nestsLoop = nested || (JUMP_TARGETS.has(type) && type !== 'SwitchStatement');
      return Object.values(record).some(value => visit(value, nestsLoop));
    };
    return visit(body, false);
  }

  /** Whether `body` has a `шикастан label;`. */
  private breaksTo(label: string, body: Statement): boolean {
    let found = false;
    this.forEachNode(body, node => {
      const jump = node as { type: string; label?: Identifier };
      if (jump.type === 'BreakStatement' && jump.label?.name === label) found = true;
    });
    return found;
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
      case 'LabeledStatement':
        return this.labeledAlwaysExits(statement as LabeledStatement);
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

  /** `л: { … }` exits when its body does, unless a `шикастан л;` continues after it. */
  private labeledAlwaysExits(statement: LabeledStatement): boolean {
    return this.alwaysExits(statement.body) && !this.breaksTo(statement.label.name, statement.body);
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
      this.addError(
        TypeCheckErrorCode.PossiblyNull,
        message('POSSIBLY_NULL', {
          reference: this.referencePath(expression),
          values: nullish.map(name => this.mapPrimitiveToTajik(name)),
        }),
        expression.line,
        expression.column
      );
    }
    return this.removeNullish(type);
  }

  /** `х`, `ин.сар` for references; nothing for any other expression. */
  private referencePath(expression: Expression): string | undefined {
    const path = (e: Expression): string | undefined => {
      if (e.type === 'Identifier') return (e as Identifier).name;
      if (e.type === 'ThisExpression') return 'ин';
      if (e.type === 'NonNullExpression') return path((e as NonNullExpression).expression);
      if (e.type === 'MemberExpression' && !(e as MemberExpression).computed) {
        const member = e as MemberExpression;
        const objectPath = path(member.object);
        const property = this.memberPropertyName(member);
        return objectPath && property.name ? `${objectPath}.${property.name}` : undefined;
      }
      return undefined;
    };
    return path(expression);
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
    if (!this.isAssignableFrom(sourceExpr, sourceType, targetType)) {
      report(this.typeToString(sourceType), this.typeToString(targetType));
      return;
    }
    this.checkExcessProperties(sourceExpr, targetType);
  }

  /** Whether the value of `sourceExpr` (of type `sourceType`) may be assigned to `targetType`. */
  private isAssignableFrom(sourceExpr: Expression, sourceType: Type, targetType: Type): boolean {
    // Control flow isn't tracked, so a union-typed reference may already be
    // narrowed (`агар (навъи х === "string") бозгашт х;`): accept it when any
    // member fits.
    const narrowable =
      sourceType.kind === 'union' &&
      (sourceExpr.type === 'Identifier' || sourceExpr.type === 'MemberExpression');
    return narrowable
      ? this.isNarrowableUnionAssignable(sourceType, targetType)
      : this.isAssignable(sourceType, targetType);
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
        if (element) this.checkExcessProperties(element, targetType.elementType!);
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
    // Literals with a spread are not checked (`checkExcessProperties`)
    for (const prop of objExpr.properties as Property[]) {
      const keyName = this.propertyKeyName(prop.key);
      const targetProp = targetProperties.get(keyName);
      if (!targetProp) {
        this.addError(
          TypeCheckErrorCode.TypeMismatch,
          message('TYPE_NOT_ASSIGNABLE.excessProperty', {
            property: keyName,
            target: this.typeToString(targetType),
          }),
          prop.line,
          prop.column
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
    return TypeChecker.literalBaseName(source) === target.name;
  }

  private isStandardTypeAssignable(source: Type, target: Type): boolean {
    return (
      this.isArrayAssignable(source, target) ||
      this.isTupleAssignable(source, target) ||
      this.isTupleToArrayAssignable(source, target) ||
      this.isUnionAssignable(source, target) ||
      this.isIntersectionAssignable(source, target)
    );
  }

  private isStructuralTypeAssignable(source: Type, target: Type): boolean {
    return (
      this.isInterfaceAssignable(source, target) ||
      this.isClassAssignable(source, target) ||
      this.isUniqueAssignable(source, target) ||
      // A class (or a function) is a value of a constructor type
      (target.kind === 'constructor' &&
        ['class', 'constructor', 'function'].includes(source.kind)) ||
      // A value with call signatures is a function
      (target.kind === 'function' && Boolean(source.callSignatures?.length)) ||
      (target.kind === 'constructor' && Boolean(source.constructSignatures?.length))
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

    // `ин` not bound to a receiver is not checked
    if (source.kind === 'this' || target.kind === 'this') {
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
    // A `танҳохонӣ` array can't be used where it could be changed
    if (source.readonly && !target.readonly) return false;
    return this.isAssignable(source.elementType!, target.elementType!);
  }

  private isTupleAssignable(source: Type, target: Type): boolean {
    if (source.kind !== 'tuple' || target.kind !== 'tuple' || !source.types || !target.types) {
      return false;
    }
    if (source.readonly && !target.readonly) return false;
    // Lengths: `[рақам]` fits `[рақам, сатр?]`, `[рақам, ...сатр[]]` needs a rest element too
    const sourceMin = source.minLength ?? source.types.length;
    if (sourceMin < (target.minLength ?? target.types.length)) return false;
    const fits = source.restType
      ? target.restType !== undefined && this.isAssignable(source.restType, target.restType)
      : target.restType !== undefined || source.types.length <= target.types.length;
    if (!fits) return false;
    return source.types.every((sourceType, index) => {
      const targetType = this.tupleElementAt(target, index);
      const type = index >= sourceMin ? this.optionalType(sourceType) : sourceType;
      return targetType !== undefined && this.isAssignable(type, targetType);
    });
  }

  /** `[1, 2] чун собит` or a `[рақам, сатр]` value where an array is expected. */
  private isTupleToArrayAssignable(source: Type, target: Type): boolean {
    if (source.kind !== 'tuple' || target.kind !== 'array' || !source.types) return false;
    return source.types.every(t => this.isAssignable(t, target.elementType!));
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
    if (this.isSignatureAssignable(source, target)) return true;
    if (['interface', 'object', 'class'].includes(source.kind)) {
      // A type with call signatures needs a callable value
      if (target.callSignatures?.length && !source.callSignatures?.length) return false;
      return this.isStructurallyCompatible(source, target);
    }
    return false;
  }

  /**
   * A function is a value of a type with call signatures, and a class (or a
   * constructor) one of a type with construct signatures, when the type's
   * other members are optional; signatures are not compared, like functions.
   */
  private isSignatureAssignable(source: Type, target: Type): boolean {
    const callable = source.kind === 'function' && Boolean(target.callSignatures?.length);
    const constructable =
      (source.kind === 'class' || source.kind === 'constructor') &&
      Boolean(target.constructSignatures?.length);
    if (constructable) return true;
    if (!callable) return false;
    return [...this.getAllProperties(target).values()].every(property => property.optional);
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

  /** `беназир рамз` is a `рамз`. */
  private isUniqueAssignable(source: Type, target: Type): boolean {
    if (source.kind !== 'unique') return false;
    return this.isAssignable(
      source.baseType!,
      target.kind === 'unique' ? target.baseType! : target
    );
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
    primitive: t => this.mapPrimitiveToTajik(t.name!),
    array: t => {
      const element = this.typeToString(t.elementType!);
      const list = ['union', 'intersection', 'function', 'constructor'].includes(
        t.elementType!.kind
      )
        ? `(${element})[]`
        : `${element}[]`;
      return t.readonly ? `танҳохонӣ ${list}` : list;
    },
    union: t => this.typeListToString(t),
    intersection: t => this.typeListToString(t),
    tuple: t => this.tupleToString(t),
    this: () => 'ин',
    constructor: (t: Type) => `нав ${this.functionTypeToString(t)}`,
    literal: t => (typeof t.value === 'string' ? `"${t.value}"` : String(t.value)),
    unique: t => `беназир ${this.typeToString(t.baseType!)}`,
    object: t => this.objectTypeToString(t),
    generic: t => this.genericTypeToString(t),
    function: t => this.functionTypeToString(t),
    unknown: t => t.name ?? 'ношинос',
  };

  /** The type as SomonScript source writes it: `рақам[]`, `(х: сатр) => мантиқӣ`. */
  public typeToString(type: Type): string {
    const printer = this.typePrinters[type.kind];
    // Interfaces and classes print by name
    return printer ? printer(type) : type.name!;
  }

  /** `[рақам, сатр?, ...мантиқӣ[]]` */
  private tupleToString(type: Type): string {
    const types = type.types!;
    const minLength = type.minLength ?? types.length;
    const parts = types.map((t, i) => `${this.typeToString(t)}${i >= minLength ? '?' : ''}`);
    if (type.restType) {
      parts.push(`...${this.typeToString({ kind: 'array', elementType: type.restType })}`);
    }
    return `${type.readonly ? 'танҳохонӣ ' : ''}[${parts.join(', ')}]`;
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
      default:
        return parts.join(', ');
    }
  }

  private objectTypeToString(type: Type): string {
    // The enum object itself, as TypeScript prints it (`typeof Ранг`)
    if (type.enumType) return `навъи ${type.name}`;
    const members = [...type.properties!].map(
      ([key, prop]) => `${key}${prop.optional ? '?' : ''}: ${this.typeToString(prop.type)}`
    );
    return members.length > 0 ? `{ ${members.join('; ')} }` : '{}';
  }

  private functionTypeToString(type: Type): string {
    const params = (type.paramTypes ?? []).map(
      (p, i) => `${type.paramNames![i]}: ${this.typeToString(p)}`
    );
    return `(${params.join(', ')}) => ${this.typeToString(type.returnType!)}`;
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

        // Property exists, check type compatibility. Method signatures
        // (`ном(): сатр`) have function types; functions are compared
        // without their signatures.
        if (
          sourceProp &&
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
      case 'symbol':
        return 'рамз';
      default:
        return primitiveType;
    }
  }

  private addError(
    code: TypeCheckErrorCode,
    text: DiagnosticMessage,
    line: number,
    column: number
  ): void {
    if (this.silent > 0) return;
    this.errors.push(this.diagnostic(code, text, line, column, 'error'));
  }

  /** A diagnostic with its catalog message, whose id and values give its text in other languages. */
  private diagnostic(
    code: TypeCheckErrorCode,
    text: DiagnosticMessage,
    line: number,
    column: number,
    severity: TypeCheckError['severity']
  ): TypeCheckError {
    return {
      code,
      message: renderMessage(text, 'en'),
      line,
      column,
      snippet: this.getSnippet(line),
      severity,
      messageId: text.id,
      params: text.params,
    };
  }

  private addWarning(
    code: TypeCheckErrorCode,
    text: DiagnosticMessage,
    line: number,
    column: number
  ): void {
    if (this.silent > 0) return;
    this.warnings.push(this.diagnostic(code, text, line, column, 'warning'));
  }
}

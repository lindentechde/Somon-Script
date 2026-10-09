/*
 * JavaScript targets: the ECMAScript version compiled code has to run on.
 *
 * The code generator emits modern JavaScript. `lowerToTarget` finds the syntax
 * that is newer than the target and, only when there is some, rewrites the code
 * with TypeScript's transformers (helpers inlined, iteration protocol honoured).
 * Syntax that no transformer can express on the target — BigInt literals, some
 * regular expression flags and syntax, top-level `await` — is reported instead.
 */
import ts from 'typescript';
import { SourceMapGenerator, type RawSourceMap } from 'source-map';

/** Every supported `target`, oldest first. */
export const TARGETS = [
  'es5',
  'es2015',
  'es2016',
  'es2017',
  'es2018',
  'es2019',
  'es2020',
  'es2021',
  'es2022',
  'es2023',
  'es2024',
  'esnext',
] as const;

export type Target = (typeof TARGETS)[number];

/**
 * ES2022: what every supported Node.js (20+) and current browser runs, and the
 * syntax the code generator emits, so the default output is not rewritten.
 */
export const DEFAULT_TARGET: Target = 'es2022';

/**
 * Bundle formats: a CommonJS module, an ES module that exports the entry's
 * exports, or a script for browsers that stores them in a global.
 */
export const BUNDLE_FORMATS = ['commonjs', 'esm', 'iife'] as const;

export type BundleFormat = (typeof BUNDLE_FORMATS)[number];

export function isBundleFormat(value: unknown): value is BundleFormat {
  return typeof value === 'string' && (BUNDLE_FORMATS as readonly string[]).includes(value);
}

const IDENTIFIER = /^[\p{ID_Start}$_][\p{ID_Continue}$\u200c\u200d]*$/u;

/**
 * Why `name` cannot be an IIFE bundle's global name, if it cannot: it must be
 * an identifier or a dotted path of them (`МоКитобхона`, `app.lib`).
 */
export function validateGlobalName(name: unknown): string | undefined {
  if (typeof name !== 'string' || !name.split('.').every(part => IDENTIFIER.test(part))) {
    return 'must be an identifier or a dotted path of identifiers, e.g. "MyLib" or "app.lib"';
  }
  return undefined;
}

export function isTarget(value: unknown): value is Target {
  return typeof value === 'string' && (TARGETS as readonly string[]).includes(value);
}

/** Whether `target` supports everything `minimum` supports. */
export function targetAtLeast(target: Target, minimum: Target): boolean {
  return TARGETS.indexOf(target) >= TARGETS.indexOf(minimum);
}

/** TypeScript's default for `useDefineForClassFields`: on from es2022. */
export function defaultUseDefineForClassFields(target: Target): boolean {
  return targetAtLeast(target, 'es2022');
}

/**
 * Options that keep TypeScript's deprecated features working without an error.
 * TypeScript 6 deprecates `target: "es5"` and `downlevelIteration` (TypeScript 7
 * removes them): they still work, but report TS5107/TS5101 unless
 * `ignoreDeprecations` is `"6.0"`. Only es5 needs them.
 */
export function deprecationOptions(target: Target): ts.CompilerOptions {
  return target === 'es5' ? { ignoreDeprecations: '6.0' } : {};
}

/**
 * TypeScript's script target for `target`. A target newer than the installed
 * TypeScript knows (es2023/es2024 before TypeScript 5.7) uses the newest older
 * one it knows: nothing between them can be lowered anyway.
 */
export function scriptTargetFor(target: Target): ts.ScriptTarget {
  if (target === 'esnext') return ts.ScriptTarget.ESNext;
  const known = ts.ScriptTarget as unknown as Record<string, number | undefined>;
  for (let index = TARGETS.indexOf(target); index > 0; index--) {
    const value = known[TARGETS[index].toUpperCase()];
    if (typeof value === 'number') return value;
  }
  return ts.ScriptTarget.ES5;
}

// ---------------------------------------------------------------------------
// lib

let cachedLibNames: readonly string[] | undefined;

/** The `lib` names the installed TypeScript ships, e.g. `es2022`, `dom`, `es2015.promise`. */
export function typeScriptLibNames(): readonly string[] {
  cachedLibNames ??= readLibNames(ts);
  return cachedLibNames;
}

/**
 * TypeScript keeps its lib names in `ts.libs`, which is not part of its typed
 * API; the list it prints for an invalid `--lib` is the fallback.
 */
export function readLibNames(typescript: typeof ts): string[] {
  const internal = (typescript as unknown as { libs?: unknown }).libs;
  if (Array.isArray(internal) && internal.length > 0) {
    return internal.filter((name): name is string => typeof name === 'string');
  }
  const { errors } = typescript.parseCommandLine(['--lib', '?']);
  const message = errors
    .map(error => typescript.flattenDiagnosticMessageText(error.messageText, '\n'))
    .join('\n');
  const list = message.slice(message.indexOf(':') + 1);
  return Array.from(list.matchAll(/'([^']+)'/g), match => match[1]);
}

/** Problems with a `lib` value: not a list of strings, or names TypeScript does not ship. */
export function validateLib(value: unknown): string[] {
  if (!Array.isArray(value) || value.some(name => typeof name !== 'string')) {
    return ['must be an array of TypeScript lib names, e.g. ["es2022", "dom"]'];
  }
  const known = new Set(typeScriptLibNames());
  const unknown = (value as string[]).filter(name => !known.has(name.trim().toLowerCase()));
  if (unknown.length === 0) return [];
  const main = [...known].filter(name => !name.includes('.'));
  return [
    `unknown lib ${unknown.map(name => `'${name}'`).join(', ')}. TypeScript ships ${main.join(', ')} and their parts, such as es2015.promise or dom.iterable`,
  ];
}

/** Lib names as TypeScript spells them: trimmed, lower case, without duplicates. */
export function normalizeLib(lib: readonly string[]): string[] {
  return [...new Set(lib.map(name => name.trim().toLowerCase()).filter(name => name.length > 0))];
}

/** The esnext lib parts of TypeScript before 5.7 that hold ES2024 APIs. */
const ES2024_IN_ESNEXT = ['esnext.object', 'esnext.collection', 'esnext.promise'];

/**
 * The libs used for `target` when `lib` is not set, as in TypeScript: the
 * target's ECMAScript lib (the newest one TypeScript ships, at most the
 * target) and the DOM. For es2024 without an es2024 lib (TypeScript 5.4 to
 * 5.6) that is es2023 and the esnext parts with ES2024's APIs.
 */
export function defaultLib(target: Target): string[] {
  const known = new Set(typeScriptLibNames());
  let esLib = 'es5';
  for (let index = TARGETS.indexOf(target); index > 0; index--) {
    if (known.has(TARGETS[index])) {
      esLib = TARGETS[index];
      break;
    }
  }
  const lib = [esLib, 'dom'];
  if (targetAtLeast(target, 'es2015')) lib.push('dom.iterable');
  if (targetAtLeast(target, 'es2018') && known.has('dom.asynciterable')) {
    lib.push('dom.asynciterable');
  }
  // Before TypeScript 5.7 ships an es2024 lib, what ES2024 added is in esnext
  // parts: Object.groupBy, Map.groupBy and Promise.withResolvers
  if (target === 'es2024' && esLib !== 'es2024') {
    lib.push(...ES2024_IN_ESNEXT.filter(name => known.has(name)));
  }
  return lib;
}

// ---------------------------------------------------------------------------
// What the code needs

/** A construct the target cannot express. */
export interface TargetDiagnostic {
  message: string;
  /** 1-based line in the analysed JavaScript. */
  line: number;
  /** 0-based column in the analysed JavaScript. */
  column: number;
}

export interface SyntaxReport {
  /** The oldest target that runs the code as it is. */
  required: Target;
  /** Whether a class declares fields (their semantics follow `useDefineForClassFields`). */
  classFields: boolean;
  /**
   * Whether the code uses syntax no JavaScript runtime runs yet — decorators,
   * `accessor` fields, `using` declarations — which is lowered for every
   * target, `esnext` included.
   */
  neverNative: boolean;
  /** Whether the code starts with a `"use strict"` directive. */
  useStrict: boolean;
  /** What the target cannot express, lowered or not. */
  diagnostics: TargetDiagnostic[];
}

/** Node kinds that need at least this target. */
const KIND_MINIMUM: ReadonlyMap<ts.SyntaxKind, Target> = new Map<ts.SyntaxKind, Target>([
  [ts.SyntaxKind.ArrowFunction, 'es2015'],
  [ts.SyntaxKind.ClassDeclaration, 'es2015'],
  [ts.SyntaxKind.ClassExpression, 'es2015'],
  [ts.SyntaxKind.TemplateExpression, 'es2015'],
  [ts.SyntaxKind.NoSubstitutionTemplateLiteral, 'es2015'],
  [ts.SyntaxKind.TaggedTemplateExpression, 'es2015'],
  [ts.SyntaxKind.ForOfStatement, 'es2015'],
  [ts.SyntaxKind.SpreadElement, 'es2015'],
  [ts.SyntaxKind.ObjectBindingPattern, 'es2015'],
  [ts.SyntaxKind.ArrayBindingPattern, 'es2015'],
  [ts.SyntaxKind.ComputedPropertyName, 'es2015'],
  [ts.SyntaxKind.ShorthandPropertyAssignment, 'es2015'],
  [ts.SyntaxKind.YieldExpression, 'es2015'],
  [ts.SyntaxKind.MetaProperty, 'es2015'],
  [ts.SyntaxKind.AwaitExpression, 'es2017'],
  [ts.SyntaxKind.SpreadAssignment, 'es2018'],
  [ts.SyntaxKind.PropertyDeclaration, 'es2022'],
  [ts.SyntaxKind.PrivateIdentifier, 'es2022'],
  [ts.SyntaxKind.ClassStaticBlockDeclaration, 'es2022'],
]);

const OPERATOR_MINIMUM: ReadonlyMap<ts.SyntaxKind, Target> = new Map<ts.SyntaxKind, Target>([
  [ts.SyntaxKind.AsteriskAsteriskToken, 'es2016'],
  [ts.SyntaxKind.AsteriskAsteriskEqualsToken, 'es2016'],
  [ts.SyntaxKind.QuestionQuestionToken, 'es2020'],
  [ts.SyntaxKind.AmpersandAmpersandEqualsToken, 'es2021'],
  [ts.SyntaxKind.BarBarEqualsToken, 'es2021'],
  [ts.SyntaxKind.QuestionQuestionEqualsToken, 'es2021'],
]);

const REGEXP_FLAG_MINIMUM: Readonly<Record<string, Target>> = {
  u: 'es2015',
  y: 'es2015',
  s: 'es2018',
  d: 'es2022',
  v: 'es2024',
};

/** Built-ins that only work with `new`: an es5 subclass calls its base as a function. */
const NEW_ONLY_BUILTINS: ReadonlySet<string> = new Set([
  'Map',
  'Set',
  'WeakMap',
  'WeakSet',
  'WeakRef',
  'FinalizationRegistry',
  'Promise',
  'Date',
  'Proxy',
  'Boolean',
  'Number',
  'String',
  'Symbol',
  'ArrayBuffer',
  'SharedArrayBuffer',
  'DataView',
  'Int8Array',
  'Uint8Array',
  'Uint8ClampedArray',
  'Int16Array',
  'Uint16Array',
  'Int32Array',
  'Uint32Array',
  'Float32Array',
  'Float64Array',
  'BigInt64Array',
  'BigUint64Array',
]);

/**
 * Built-ins that return a new object when called as a function: an es5
 * subclass gets that object as `this`, which needs the subclass prototype.
 */
const CALLABLE_BUILTINS: ReadonlySet<string> = new Set([
  'Error',
  'EvalError',
  'RangeError',
  'ReferenceError',
  'SyntaxError',
  'TypeError',
  'URIError',
  'AggregateError',
  'Array',
  'RegExp',
  'Function',
]);

/** Name of the built-in a class directly extends, if it extends an identifier. */
function baseClassName(node: ts.ClassLikeDeclaration): string | undefined {
  const heritage = node.heritageClauses?.find(
    clause => clause.token === ts.SyntaxKind.ExtendsKeyword
  );
  const base = heritage?.types[0]?.expression;
  return base && ts.isIdentifier(base) ? base.text : undefined;
}

/**
 * Whether a template literal's raw text has an escape that is only allowed in
 * tagged templates since ES2018 (`\unicode`, `\x`, `\01`, …).
 */
export function hasInvalidEscape(raw: string): boolean {
  for (let index = raw.indexOf('\\'); index !== -1; index = raw.indexOf('\\', index + 2)) {
    const next = raw[index + 1] ?? '';
    const rest = raw.slice(index + 2);
    if (next === 'u' && !/^(?:[\da-fA-F]{4}|\{[\da-fA-F]+\})/.test(rest)) return true;
    if (next === 'x' && !/^[\da-fA-F]{2}/.test(rest)) return true;
    if (next === '0' && /^\d/.test(rest)) return true;
    if (/^[1-9]$/.test(next)) return true;
  }
  return false;
}

/** What a group opening (`(?…`, given the text after `(?`) needs. */
function groupFeature(rest: string): [string, Target] | undefined {
  if (rest.startsWith('<=') || rest.startsWith('<!'))
    return ['Lookbehind assertions are', 'es2018'];
  if (rest.startsWith('<')) return ['Named capturing groups are', 'es2018'];
  if (!rest.startsWith(':') && /^[ims]*(?:-[ims]*)?:/.test(rest)) {
    return ['Regular expression modifiers are', 'esnext'];
  }
  return undefined;
}

/** Regular expression syntax (not flags) newer than ES2015 that a pattern uses. */
export function regExpFeatures(pattern: string, unicode: boolean): Map<string, Target> {
  const features = new Map<string, Target>();
  let inClass = false;
  for (let index = 0; index < pattern.length; index++) {
    const char = pattern[index];
    if (char === '\\') {
      if (unicode && /^[pP]\{/.test(pattern.slice(index + 1, index + 3))) {
        features.set('Unicode property escapes are', 'es2018');
      }
      index++;
    } else if (inClass) {
      inClass = char !== ']';
    } else if (char === '[') {
      inClass = true;
    } else if (char === '(' && pattern[index + 1] === '?') {
      const feature = groupFeature(pattern.slice(index + 2));
      if (feature) features.set(feature[0], feature[1]);
    }
  }
  return features;
}

type NodeCheck = (_node: ts.Node) => void;

/** One walk over the code: the newest syntax it uses and what the target cannot express. */
class SyntaxScanner {
  private required = 0;
  private classFields = false;
  private neverNative = false;
  private readonly diagnostics: TargetDiagnostic[] = [];
  /** Functions (and class bodies) around the current node; 0 at the top level. */
  private functionDepth = 0;
  private readonly checks: ReadonlyMap<ts.SyntaxKind, NodeCheck>;
  private readonly sourceFile: ts.SourceFile;
  private readonly target: Target;

  constructor(sourceFile: ts.SourceFile, target: Target) {
    this.sourceFile = sourceFile;
    this.target = target;
    const kind = ts.SyntaxKind;
    this.checks = new Map<ts.SyntaxKind, NodeCheck>([
      [
        kind.VariableDeclarationList,
        node => this.checkDeclarationList(node as ts.VariableDeclarationList),
      ],
      [kind.BinaryExpression, node => this.checkBinary(node as ts.BinaryExpression)],
      [kind.Parameter, node => this.checkParameter(node as ts.ParameterDeclaration)],
      [kind.FunctionDeclaration, node => this.checkGenerator(node as ts.FunctionDeclaration)],
      [kind.FunctionExpression, node => this.checkGenerator(node as ts.FunctionExpression)],
      [kind.MethodDeclaration, node => this.checkMethod(node as ts.MethodDeclaration)],
      [kind.AwaitExpression, node => this.checkTopLevelAwait(node)],
      [kind.ForOfStatement, node => this.checkForOf(node as ts.ForOfStatement)],
      [kind.BindingElement, node => this.checkBindingElement(node as ts.BindingElement)],
      [kind.CatchClause, node => this.checkCatch(node as ts.CatchClause)],
      [
        kind.PropertyAccessExpression,
        node => this.checkOptionalChain(node as ts.PropertyAccessExpression),
      ],
      [
        kind.ElementAccessExpression,
        node => this.checkOptionalChain(node as ts.ElementAccessExpression),
      ],
      [kind.CallExpression, node => this.checkOptionalChain(node as ts.CallExpression)],
      [kind.BigIntLiteral, node => this.requireNative(node, 'BigInt literals are', 'es2020')],
      [kind.NumericLiteral, node => this.checkNumber(node as ts.NumericLiteral)],
      [kind.StringLiteral, node => this.checkString(node as ts.StringLiteral)],
      [
        kind.TaggedTemplateExpression,
        node => this.checkTaggedTemplate(node as ts.TaggedTemplateExpression),
      ],
      [kind.PropertyDeclaration, () => (this.classFields = true)],
      [
        kind.RegularExpressionLiteral,
        node => this.checkRegExp(node as ts.RegularExpressionLiteral),
      ],
      [kind.ClassDeclaration, node => this.checkClass(node as ts.ClassDeclaration)],
      [kind.ClassExpression, node => this.checkClass(node as ts.ClassExpression)],
      [kind.Decorator, () => this.needLowering()],
    ]);
  }

  scan(): SyntaxReport {
    this.visit(this.sourceFile);
    return {
      required: TARGETS[this.required],
      classFields: this.classFields,
      neverNative: this.neverNative,
      useStrict: this.startsWithUseStrict(),
      diagnostics: this.diagnostics,
    };
  }

  /** Whether a `"use strict"` directive is in the code's directive prologue. */
  private startsWithUseStrict(): boolean {
    for (const statement of this.sourceFile.statements) {
      if (!ts.isExpressionStatement(statement) || !ts.isStringLiteral(statement.expression)) {
        return false;
      }
      // A directive is the literal as written: `"use\x20strict"` is none
      if (statement.expression.getText(this.sourceFile).slice(1, -1) === 'use strict') return true;
    }
    return false;
  }

  private readonly visit = (node: ts.Node): void => {
    const minimum = KIND_MINIMUM.get(node.kind);
    if (minimum) this.need(minimum);
    this.checkModifiers(node);
    this.checks.get(node.kind)?.(node);

    const boundary =
      ts.isFunctionLike(node) ||
      ts.isClassStaticBlockDeclaration(node) ||
      ts.isPropertyDeclaration(node);
    if (boundary) this.functionDepth++;
    ts.forEachChild(node, this.visit);
    if (boundary) this.functionDepth--;
  };

  private need(minimum: Target): void {
    this.required = Math.max(this.required, TARGETS.indexOf(minimum));
  }

  /** Syntax that no JavaScript runtime runs yet: lowered for every target. */
  private needLowering(): void {
    this.neverNative = true;
    this.need('esnext');
  }

  /** Syntax no transformer lowers: an error when the target is older than `minimum`. */
  private requireNative(node: ts.Node, feature: string, minimum: Target): void {
    this.need(minimum);
    if (targetAtLeast(this.target, minimum)) return;
    const start = this.sourceFile.getLineAndCharacterOfPosition(node.getStart(this.sourceFile));
    this.diagnostics.push({
      message: `${feature} only available when targeting ${minimum} or later (target is ${this.target}).`,
      line: start.line + 1,
      column: start.character,
    });
  }

  private checkModifiers(node: ts.Node): void {
    const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
    for (const modifier of modifiers ?? []) {
      if (modifier.kind === ts.SyntaxKind.AsyncKeyword) {
        this.need((node as ts.FunctionLikeDeclaration).asteriskToken ? 'es2018' : 'es2017');
      } else if (modifier.kind === ts.SyntaxKind.AccessorKeyword) {
        this.needLowering();
      }
    }
  }

  private checkDeclarationList(node: ts.VariableDeclarationList): void {
    // `using` and `await using` (TypeScript 5.2; tsc-checker.ts already needs 5.4)
    if ((node.flags & ts.NodeFlags.Using) !== 0) {
      this.needLowering();
    } else if ((node.flags & (ts.NodeFlags.Let | ts.NodeFlags.Const)) !== 0) {
      this.need('es2015');
    }
  }

  private checkBinary(node: ts.BinaryExpression): void {
    const minimum = OPERATOR_MINIMUM.get(node.operatorToken.kind);
    if (minimum) this.need(minimum);
    if (
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      (ts.isArrayLiteralExpression(node.left) || ts.isObjectLiteralExpression(node.left))
    ) {
      this.need('es2015');
    }
  }

  private checkParameter(node: ts.ParameterDeclaration): void {
    if (node.initializer || node.dotDotDotToken) this.need('es2015');
  }

  private checkGenerator(node: ts.FunctionLikeDeclaration): void {
    if (node.asteriskToken) this.need('es2015');
  }

  private checkMethod(node: ts.MethodDeclaration): void {
    this.checkGenerator(node);
    if (ts.isObjectLiteralExpression(node.parent)) this.need('es2015');
  }

  private checkTopLevelAwait(node: ts.Node): void {
    if (this.functionDepth === 0) this.requireNative(node, "Top-level 'await' is", 'es2022');
  }

  private checkForOf(node: ts.ForOfStatement): void {
    if (!node.awaitModifier) return;
    this.need('es2018');
    this.checkTopLevelAwait(node);
  }

  private checkBindingElement(node: ts.BindingElement): void {
    if (node.dotDotDotToken && ts.isObjectBindingPattern(node.parent)) this.need('es2018');
  }

  private checkCatch(node: ts.CatchClause): void {
    if (!node.variableDeclaration) this.need('es2019');
  }

  private checkOptionalChain(
    node: ts.PropertyAccessExpression | ts.ElementAccessExpression | ts.CallExpression
  ): void {
    if (node.questionDotToken) this.need('es2020');
  }

  private checkNumber(node: ts.NumericLiteral): void {
    const text = node.getText(this.sourceFile);
    if (text.includes('_')) this.need('es2021');
    if (/^0[bBoO]/.test(text)) this.need('es2015');
  }

  private checkString(node: ts.StringLiteral): void {
    const raw = node.getText(this.sourceFile);
    // Unescaped line and paragraph separators are only allowed in string literals since ES2019
    if (/[\u2028\u2029]/.test(raw)) this.need('es2019');
    if (raw.includes('\\u{')) this.need('es2015');
  }

  private checkTaggedTemplate(node: ts.TaggedTemplateExpression): void {
    const template = node.template;
    const parts = ts.isNoSubstitutionTemplateLiteral(template)
      ? [template]
      : [template.head, ...template.templateSpans.map(span => span.literal)];
    if (parts.some(part => hasInvalidEscape(part.getText(this.sourceFile)))) this.need('es2018');
  }

  private checkRegExp(node: ts.RegularExpressionLiteral): void {
    const text = node.getText(this.sourceFile);
    const closing = text.lastIndexOf('/');
    const flags = text.slice(closing + 1);
    for (const flag of flags) {
      const minimum = REGEXP_FLAG_MINIMUM[flag];
      if (minimum) this.requireNative(node, `The regular expression flag '${flag}' is`, minimum);
    }
    const features = regExpFeatures(text.slice(1, closing), /[uv]/.test(flags));
    for (const [feature, minimum] of features) {
      this.requireNative(node, feature, minimum);
    }
  }

  private checkClass(node: ts.ClassLikeDeclaration): void {
    const base = baseClassName(node);
    if (this.target === 'es5' && base && NEW_ONLY_BUILTINS.has(base)) {
      this.requireNative(node, `Classes extending the built-in '${base}' are`, 'es2015');
    }
  }
}

/** The newest syntax `code` uses and what `target` cannot express. */
export function analyzeSyntax(code: string, target: Target): SyntaxReport {
  const sourceFile = ts.createSourceFile(
    'module.js',
    code,
    ts.ScriptTarget.ESNext,
    true,
    ts.ScriptKind.JS
  );
  return new SyntaxScanner(sourceFile, target).scan();
}

/**
 * Whether code with this report has to be rewritten for `target`: it uses
 * newer syntax or syntax no runtime runs (decorators, `accessor`, `using`), or
 * class fields with other semantics than the target's own. es5 output is
 * always rewritten.
 */
export function needsLowering(
  report: SyntaxReport,
  target: Target,
  useDefineForClassFields?: boolean
): boolean {
  if (target === 'es5' || report.neverNative || !targetAtLeast(target, report.required)) {
    return true;
  }
  return report.classFields && useDefineForClassFields === false;
}

// ---------------------------------------------------------------------------
// Lowering

const SET_PROTOTYPE_HELPER: ts.UnscopedEmitHelper = {
  name: 'somon:setPrototype',
  scoped: false,
  text: `var __somonSetPrototype = (this && this.__somonSetPrototype) || function (self, newTarget) {
    var prototype = newTarget && newTarget.prototype;
    if (prototype && Object.getPrototypeOf(self) !== prototype) {
        if (Object.setPrototypeOf) Object.setPrototypeOf(self, prototype);
        else self.__proto__ = prototype;
    }
};`,
};

function isSuperCallStatement(statement: ts.Statement): boolean {
  return (
    ts.isExpressionStatement(statement) &&
    ts.isCallExpression(statement.expression) &&
    statement.expression.expression.kind === ts.SyntaxKind.SuperKeyword
  );
}

function hasForInPattern(initializer: ts.ForInitializer): boolean {
  if (ts.isVariableDeclarationList(initializer)) {
    return initializer.declarations.some(declaration => !ts.isIdentifier(declaration.name));
  }
  return ts.isArrayLiteralExpression(initializer) || ts.isObjectLiteralExpression(initializer);
}

/**
 * `for (const [а, б] in о) …` → `for (const _key in о) { const [а, б] = _key; … }`:
 * TypeScript's es5 output for a pattern in a for-in head is invalid.
 */
function splitForInPattern(factory: ts.NodeFactory, node: ts.ForInStatement): ts.ForInStatement {
  const key = factory.createUniqueName('_key');
  const initializer = node.initializer;
  let head: ts.VariableDeclarationList;
  let binding: ts.Statement;
  if (ts.isVariableDeclarationList(initializer)) {
    const blockScoped = initializer.flags & (ts.NodeFlags.Let | ts.NodeFlags.Const);
    head = factory.createVariableDeclarationList(
      [factory.createVariableDeclaration(key)],
      blockScoped
    );
    binding = factory.createVariableStatement(
      undefined,
      factory.createVariableDeclarationList(
        [
          factory.createVariableDeclaration(
            initializer.declarations[0].name,
            undefined,
            undefined,
            key
          ),
        ],
        blockScoped
      )
    );
  } else {
    head = factory.createVariableDeclarationList([factory.createVariableDeclaration(key)]);
    binding = factory.createExpressionStatement(
      factory.createAssignment(
        initializer as ts.ArrayLiteralExpression | ts.ObjectLiteralExpression,
        key
      )
    );
  }
  const body = ts.isBlock(node.statement) ? node.statement.statements : [node.statement];
  return factory.updateForInStatement(
    node,
    head,
    node.expression,
    factory.createBlock([binding, ...body], true)
  );
}

/**
 * An es5 subclass of `Error` or `Array` calls the base as a function, which
 * returns a new object without the subclass prototype (so `instanceof` and the
 * subclass methods fail): restore it after `super(…)`.
 */
function restorePrototype(
  factory: ts.NodeFactory,
  node: ts.ClassDeclaration | ts.ClassExpression
): ts.ClassDeclaration | ts.ClassExpression {
  const fix = (): ts.Statement =>
    factory.createExpressionStatement(
      factory.createCallExpression(factory.createIdentifier('__somonSetPrototype'), undefined, [
        factory.createThis(),
        factory.createMetaProperty(ts.SyntaxKind.NewKeyword, factory.createIdentifier('target')),
      ])
    );
  const constructor = node.members.find(
    (member): member is ts.ConstructorDeclaration =>
      ts.isConstructorDeclaration(member) && member.body !== undefined
  );
  let members: ts.ClassElement[];
  if (constructor?.body) {
    const statements = constructor.body.statements.flatMap(statement =>
      isSuperCallStatement(statement) ? [statement, fix()] : [statement]
    );
    const updated = factory.updateConstructorDeclaration(
      constructor,
      constructor.modifiers,
      constructor.parameters,
      factory.updateBlock(constructor.body, statements)
    );
    members = node.members.map(member => (member === constructor ? updated : member));
  } else {
    const args = factory.createUniqueName('args');
    const superCall = factory.createCallExpression(factory.createSuper(), undefined, [
      factory.createSpreadElement(args),
    ]);
    const created = factory.createConstructorDeclaration(
      undefined,
      [
        factory.createParameterDeclaration(
          undefined,
          factory.createToken(ts.SyntaxKind.DotDotDotToken),
          args
        ),
      ],
      factory.createBlock([factory.createExpressionStatement(superCall), fix()], true)
    );
    members = [created, ...node.members];
  }
  return ts.isClassDeclaration(node)
    ? factory.updateClassDeclaration(
        node,
        node.modifiers,
        node.name,
        node.typeParameters,
        node.heritageClauses,
        members
      )
    : factory.updateClassExpression(
        node,
        node.modifiers,
        node.name,
        node.typeParameters,
        node.heritageClauses,
        members
      );
}

/**
 * TypeScript prints the string literals it creates (`Object.defineProperty(this,
 * "ном", …)`) with `\uXXXX` escapes for every non-ASCII letter: keep the letters.
 */
const readableStrings: ts.TransformerFactory<ts.SourceFile> = context => {
  const visit = (node: ts.Node): ts.Node => {
    if (ts.isStringLiteral(node) && node.pos === -1 && /[^\0-\x7f]/.test(node.text)) {
      // `emitNode` is not in TypeScript's typed API; keep whatever flags it holds
      const flags = (node as { emitNode?: { flags?: number } }).emitNode?.flags ?? 0;
      return ts.setEmitFlags(node, flags | ts.EmitFlags.NoAsciiEscaping);
    }
    return ts.visitEachChild(node, visit, context);
  };
  return sourceFile => ts.visitEachChild(sourceFile, visit, context);
};

/** Fixes run before TypeScript's own transformers, for what they get wrong. */
function targetFixes(target: Target): ts.TransformerFactory<ts.SourceFile> {
  const es5 = target === 'es5';
  const escapeSeparators = !targetAtLeast(target, 'es2019');
  return context => {
    const { factory } = context;
    let usesSetPrototype = false;
    const visit = (node: ts.Node): ts.Node => {
      let current = node;
      if (es5 && ts.isForInStatement(current) && hasForInPattern(current.initializer)) {
        current = splitForInPattern(factory, current);
      } else if (es5 && ts.isClassLike(current)) {
        const base = baseClassName(current);
        if (base && CALLABLE_BUILTINS.has(base)) {
          usesSetPrototype = true;
          current = restorePrototype(factory, current);
        }
      } else if (
        escapeSeparators &&
        ts.isStringLiteral(current) &&
        /[\u2028\u2029]/.test(current.text)
      ) {
        // A new literal is printed with escapes instead of its source text;
        // only the separators need one, the other letters stay readable
        return ts.setEmitFlags(
          factory.createStringLiteral(current.text),
          ts.EmitFlags.NoAsciiEscaping
        );
      }
      return ts.visitEachChild(current, visit, context);
    };
    return sourceFile => {
      usesSetPrototype = false;
      const result = ts.visitEachChild(sourceFile, visit, context);
      return usesSetPrototype ? ts.addEmitHelper(result, SET_PROTOTYPE_HELPER) : result;
    };
  };
}

export interface LowerOptions {
  target: Target;
  /** Class field semantics; TypeScript's default for the target when not set. */
  useDefineForClassFields?: boolean;
  /** Decorators are TypeScript's legacy ones (which may decorate parameters). */
  experimentalDecorators?: boolean;
  /** Return a source map from the lowered code to the input. */
  sourceMap?: boolean;
  /** With `false`, only report what the target cannot express and keep the code as it is. */
  downlevel?: boolean;
}

export interface LowerResult {
  /** The code for the target: the input itself when nothing had to change. */
  code: string;
  /** Lowered code → input, when `sourceMap` was asked for and the code was rewritten. */
  map?: RawSourceMap;
  /** What the target cannot express. The code is returned unchanged when there is any. */
  diagnostics: TargetDiagnostic[];
  /** Whether TypeScript rewrote the code. */
  lowered: boolean;
}

/**
 * The TypeScript options used to lower code for `options.target`. TypeScript
 * keeps decorators, `accessor` and `using` for ESNext, which no runtime runs:
 * `neverNative` code for esnext is lowered as for the newest edition.
 */
export function loweringCompilerOptions(
  options: LowerOptions,
  neverNative = false
): ts.CompilerOptions {
  const target = neverNative && options.target === 'esnext' ? 'es2024' : options.target;
  return {
    target: scriptTargetFor(target),
    // Keep whatever module syntax the code has
    module: ts.ModuleKind.ESNext,
    allowJs: true,
    // Spread, for-of and destructuring follow the iteration protocol on es5 too
    // (`downlevelIteration` only matters there, and TypeScript 6 deprecates it)
    ...(target === 'es5' && { downlevelIteration: true }),
    ...deprecationOptions(target),
    useDefineForClassFields:
      options.useDefineForClassFields ?? defaultUseDefineForClassFields(options.target),
    sourceMap: Boolean(options.sourceMap),
    newLine: ts.NewLineKind.LineFeed,
    ...(options.experimentalDecorators && { experimentalDecorators: true }),
  };
}

/**
 * TypeScript 6 writes every file as strict mode code: it starts a script that has
 * no `"use strict"` with one (`alwaysStrict` is on and can no longer be turned
 * off). Lowering changes syntax, not the mode the code runs in, so code that was
 * not strict mode code loses that line again, and its source map the line's
 * (empty) mappings.
 */
export function keepSloppyMode(output: ts.TranspileOutput): ts.TranspileOutput {
  const added = /^(#![^\n]*\n)?"use strict";\n/.exec(output.outputText);
  if (!added) return output;
  const shebang = added[1] ?? '';
  const result = { ...output, outputText: shebang + output.outputText.slice(added[0].length) };
  if (output.sourceMapText) {
    const map = JSON.parse(output.sourceMapText) as RawSourceMap;
    const lines = map.mappings.split(';');
    // TypeScript maps no position to the directive it added
    lines.splice(shebang ? 1 : 0, 1);
    result.sourceMapText = JSON.stringify({ ...map, mappings: lines.join(';') });
  }
  return result;
}

/**
 * `ts.transpileModule` of JavaScript: a `.js` name, since the input is
 * JavaScript (`a < b > (c)` is no generic call). TypeScript before 5.6
 * type-checks the file while it emits, and its checker crashes on some valid
 * JavaScript ("Debug Failure. Unhandled object type EvolvingArray" for an
 * `интихоб` over a variable that holds `[]`). The code is then transpiled as
 * TypeScript, which has no such arrays, when TypeScript reads it as the same
 * program. When that fails too (the checker of TypeScript 5.4 also overflows
 * its stack on `агар ([х = холӣ], х)` after `тағ х = {} !== 1`), the error
 * says that TypeScript crashed.
 */
function transpileJavaScript(code: string, options: ts.TranspileOptions): ts.TranspileOutput {
  try {
    return ts.transpileModule(code, { ...options, fileName: 'module.js' });
  } catch (error) {
    if (!readsAlikeAsTypeScript(code)) throw typeScriptCrash(error);
    try {
      return ts.transpileModule(code, {
        ...options,
        fileName: 'module.ts',
        // Keep every import, as for JavaScript
        compilerOptions: { ...options.compilerOptions, verbatimModuleSyntax: true },
      });
    } catch {
      throw typeScriptCrash(error);
    }
  }
}

/** Prefix of the error when TypeScript crashes while it lowers the code. */
export const TYPESCRIPT_CRASH = `TypeScript ${ts.version} crashed while lowering the code`;

function typeScriptCrash(error: unknown): Error {
  // TypeScript fails with Errors (a stack overflow is a RangeError)
  return new Error(
    `${TYPESCRIPT_CRASH} (${(error as Error).message}); TypeScript 5.6 and later no longer type-check the code they lower`
  );
}

/** Whether TypeScript parses `code` as TypeScript to the same syntax tree as JavaScript. */
export function readsAlikeAsTypeScript(code: string): boolean {
  const shape = (kind: ts.ScriptKind): string => {
    const nodes: number[] = [];
    const visit = (node: ts.Node): void => {
      nodes.push(node.kind, node.pos, node.end);
      ts.forEachChild(node, visit);
    };
    visit(ts.createSourceFile('module', code, ts.ScriptTarget.Latest, false, kind));
    return nodes.join(',');
  };
  return shape(ts.ScriptKind.JS) === shape(ts.ScriptKind.TS);
}

/**
 * Make JavaScript run on `options.target`: report what the target cannot
 * express, and lower newer syntax with TypeScript. Code that only uses syntax
 * the target has is returned as it is.
 */
export function lowerToTarget(code: string, options: LowerOptions): LowerResult {
  const report = analyzeSyntax(code, options.target);
  if (report.diagnostics.length > 0) {
    return { code, diagnostics: report.diagnostics, lowered: false };
  }
  if (
    options.downlevel === false ||
    !needsLowering(report, options.target, options.useDefineForClassFields)
  ) {
    return { code, diagnostics: [], lowered: false };
  }

  const transpiled = transpileJavaScript(code, {
    compilerOptions: loweringCompilerOptions(options, report.neverNative),
    transformers: { before: [targetFixes(options.target)], after: [readableStrings] },
  });
  const output = report.useStrict ? transpiled : keepSloppyMode(transpiled);
  const map =
    options.sourceMap && output.sourceMapText
      ? (JSON.parse(output.sourceMapText) as RawSourceMap)
      : undefined;
  // TypeScript points at a `module.js.map` file that is never written
  const lowered = output.outputText.replace(/\n?\/\/# sourceMappingURL=\S*\s*$/, '\n');
  return { code: lowered, map, diagnostics: [], lowered: true };
}

// ---------------------------------------------------------------------------
// Source maps

/**
 * Compose `outer` (lowered → generated) with `inner` (generated → sources).
 * Done by hand because `source-map`'s consumer is asynchronous and `compile`
 * is not. Each outer segment takes the nearest inner mapping at or before its
 * position on the same line, since the inner maps are statement-level.
 */
export function composeSourceMaps(outer: RawSourceMap, inner: RawSourceMap): RawSourceMap {
  const innerLines = decodeMappings(inner.mappings);
  const generator = new SourceMapGenerator({ file: inner.file });
  inner.sources.forEach((source, index) => {
    const content = inner.sourcesContent?.[index];
    if (typeof content === 'string') generator.setSourceContent(source, content);
  });

  decodeMappings(outer.mappings).forEach((segments, outerLine) => {
    for (const [column, , line, originalColumn] of segments) {
      if (line === undefined) continue;
      const candidates = innerLines[line] ?? [];
      let match: number[] | undefined;
      for (const candidate of candidates) {
        if (candidate[0] > originalColumn) break;
        match = candidate;
      }
      match ??= candidates[0];
      if (!match || match.length < 4) continue;
      generator.addMapping({
        generated: { line: outerLine + 1, column },
        original: { line: match[2] + 1, column: match[3] },
        source: inner.sources[match[1]],
        name: match.length > 4 ? inner.names[match[4]] : undefined,
      });
    }
  });
  return generator.toJSON();
}

const BASE64_DIGITS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * Decode a source map `mappings` string into absolute segments per generated
 * line: [column, sourceIndex, originalLine (0-based), originalColumn, name].
 */
function decodeMappings(mappings: string): number[][][] {
  const state = [0, 0, 0, 0, 0];
  return mappings.split(';').map(lineText => {
    state[0] = 0;
    return lineText
      .split(',')
      .filter(segment => segment.length > 0)
      .map(segment => decodeVlq(segment).map((delta, index) => (state[index] += delta)));
  });
}

function decodeVlq(segment: string): number[] {
  const values: number[] = [];
  let value = 0;
  let shift = 0;
  for (const char of segment) {
    const digit = BASE64_DIGITS.indexOf(char);
    value += (digit & 31) << shift;
    if (digit & 32) {
      shift += 5;
    } else {
      values.push(value & 1 ? -(value >>> 1) : value >>> 1);
      value = 0;
      shift = 0;
    }
  }
  return values;
}

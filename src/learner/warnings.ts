/**
 * The learning mode (`"режим": "таълимӣ"` in somon.config.json, the
 * playground's «Реҷаи таълимӣ», `compile(…, { learningMode: true })`):
 * warnings about what a beginner writes by mistake but JavaScript runs
 * without an error.
 *
 * - arithmetic with a string: `"5" * 2`, `хондан() - 1`;
 * - a line read with `хондан()` added to a number: `хондан() + 1` is `"21"`;
 * - `===`/`!==` between a string and a number, always the same;
 * - a variable that is declared and never used;
 * - an own property named like a built-in member (`{ дарозӣ: 5 }`), which the
 *   compiler gives its JavaScript name (`length`), as it does for `о.дарозӣ`.
 *
 * The types come from the type checker (`onBinaryTypes`).
 */
import type {
  ASTNode,
  BinaryExpression,
  CallExpression,
  Expression,
  FunctionDeclaration,
  Identifier,
  MemberExpression,
  Program,
  Property,
  PropertyDefinition,
  VariableDeclaration,
} from '../ast';
import { BUILTIN_MAPPINGS, MEMBER_ALIASES } from '../builtin-names';
import { message, renderMessage } from '../diagnostics/catalog';
import type { DiagnosticMessage } from '../diagnostics/types';
import { TypeChecker, type Type, type TypeCheckError, type TypeCheckResult } from '../type-checker';

const ARITHMETIC: ReadonlySet<string> = new Set(['-', '*', '/', '%', '**']);
const STRICT_EQUALITY: ReadonlySet<string> = new Set(['===', '!==']);
/** AST keys that hold types, which do not read variables. */
const TYPE_KEYS: ReadonlySet<string> = new Set([
  'typeAnnotation',
  'returnType',
  'typeParameters',
  'typeArguments',
  'superTypeArguments',
  'implements',
]);
/** SomonScript's names of the primitive types the warnings compare. */
const TYPE_NAMES: Readonly<Record<string, string>> = { string: 'сатр', number: 'рақам' };

/** Type checks `program`, with the warnings of the learning mode among the warnings. */
export function checkForLearners(
  program: Program,
  source: string,
  strict: boolean
): TypeCheckResult {
  const binaries = new Map<BinaryExpression, [Type, Type]>();
  const result = new TypeChecker(source, {
    strict,
    onBinaryTypes: (binary, left, right) => binaries.set(binary, [left, right]),
  }).check(program);
  const warnings = [...result.warnings, ...learnerWarnings(program, source, binaries)];
  warnings.sort((a, b) => a.line - b.line || a.column - b.column);
  return { errors: result.errors, warnings };
}

/** The warnings of the learning mode, given the operand types of the binary expressions. */
export function learnerWarnings(
  program: Program,
  source: string,
  binaries: ReadonlyMap<BinaryExpression, readonly [Type, Type]>
): TypeCheckError[] {
  const lines = source.split(/\r?\n/);
  const facts = collect(program);
  const warnings: TypeCheckError[] = [];
  const warn = (node: ASTNode, msg: DiagnosticMessage): void => {
    warnings.push({
      code: msg.id,
      message: renderMessage(msg, 'en'),
      line: node.line,
      column: node.column,
      snippet: lines[node.line - 1],
      severity: 'warning',
      messageId: msg.id,
      params: msg.params,
    });
  };

  for (const [binary, [left, right]] of binaries) {
    const op = binary.operator;
    const types = [primitive(left), primitive(right)];
    if (ARITHMETIC.has(op) && types.includes('string')) {
      warn(binary, message('LEARNER_STRING_ARITHMETIC', { operator: op }));
    } else if (op === '+') {
      const read = [binary.left, binary.right].findIndex(operand => facts.readsLine(operand));
      if (read !== -1 && types[1 - read] === 'number') {
        warn(read === 0 ? binary.left : binary.right, message('LEARNER_STRING_PLUS_NUMBER'));
      }
    } else if (STRICT_EQUALITY.has(op) && types[0] && types[1] && types[0] !== types[1]) {
      warn(
        binary,
        message('LEARNER_COMPARE_TYPES', {
          left: TYPE_NAMES[types[0]],
          right: TYPE_NAMES[types[1]],
          operator: op,
        })
      );
    }
  }
  for (const declaration of facts.unused()) {
    const id = declaration.identifier as Identifier;
    warn(id, message('LEARNER_UNUSED_VARIABLE', { name: id.name }));
  }
  for (const key of facts.builtinMemberKeys) {
    warn(
      key,
      message('LEARNER_BUILTIN_MEMBER_NAME', {
        name: key.name,
        js: BUILTIN_MAPPINGS.get(key.name)!,
      })
    );
  }
  return warnings;
}

/** `string` or `number` when a type is one of them (or a literal of one). */
function primitive(type: Type): 'string' | 'number' | undefined {
  const name = type.kind === 'literal' ? typeof type.value : type.name;
  if (type.kind !== 'primitive' && type.kind !== 'literal') return undefined;
  return name === 'string' || name === 'number' ? name : undefined;
}

/** What the program declares and reads, found in one walk of its syntax tree. */
function collect(program: Program) {
  const declarations: VariableDeclaration[] = [];
  const reads = new Set<string>();
  /** Variables whose value is a line read with `хондан()`. */
  const lineVariables = new Set<string>();
  const declaredNames = new Set<string>();
  const builtinMemberKeys: Identifier[] = [];
  /** Declarations of `содир тағ …` and `содир собит …`, which other modules use. */
  const exported = new WeakSet<ASTNode>();

  const isReadCall = (node: Expression | undefined): boolean =>
    node?.type === 'CallExpression' &&
    (node as CallExpression).callee.type === 'Identifier' &&
    ((node as CallExpression).callee as Identifier).name === 'хондан';

  const visit = (node: ASTNode, parent?: ASTNode, key?: string): void => {
    noteNode(node, parent, key);
    for (const [childKey, value] of Object.entries(node)) {
      if (TYPE_KEYS.has(childKey)) continue;
      for (const child of Array.isArray(value) ? value : [value]) {
        if (child && typeof child === 'object' && typeof (child as ASTNode).type === 'string') {
          visit(child as ASTNode, node, childKey);
        }
      }
    }
  };

  const noteNode = (node: ASTNode, parent?: ASTNode, key?: string): void => {
    switch (node.type) {
      case 'ExportDeclaration': {
        // Seen before the declarations in it
        const declaration = (node as unknown as { declaration?: ASTNode }).declaration;
        const list = (declaration as { declarations?: ASTNode[] } | undefined)?.declarations;
        for (const exportedNode of list ?? (declaration ? [declaration] : [])) {
          exported.add(exportedNode);
        }
        break;
      }
      case 'VariableDeclaration':
        noteDeclaration(node as VariableDeclaration);
        break;
      case 'FunctionDeclaration':
        declaredNames.add((node as FunctionDeclaration).name.name);
        break;
      case 'Identifier':
        // An identifier is never the root of the tree
        if (isRead(parent!, key!)) reads.add((node as Identifier).name);
        break;
      case 'Property':
        noteKey(node as Property, !(node as Property).computed && !(node as Property).method);
        break;
      case 'PropertyDefinition':
        noteKey(node as PropertyDefinition, !(node as PropertyDefinition).computed);
        break;
    }
  };

  const noteDeclaration = (declaration: VariableDeclaration): void => {
    if (declaration.identifier.type !== 'Identifier') return;
    const name = (declaration.identifier as Identifier).name;
    declaredNames.add(name);
    if (isReadCall(declaration.init)) lineVariables.add(name);
    // `содир` inside a `номфазо` marks the declaration itself
    const inNamespace = (declaration as { exported?: boolean }).exported;
    if (
      !exported.has(declaration) &&
      !inNamespace &&
      !declaration.declare &&
      !name.startsWith('_')
    ) {
      declarations.push(declaration);
    }
  };

  const noteKey = (node: Property | PropertyDefinition, named: boolean): void => {
    const key = node.key as Identifier;
    // Only data: a method of that name (`баСатр()`) is meant to be the built-in one
    const data =
      node.type === 'PropertyDefinition' || (node as Property).value?.type !== 'FunctionExpression';
    if (named && data && key.type === 'Identifier' && MEMBER_ALIASES.has(key.name)) {
      builtinMemberKeys.push(key);
    }
  };

  visit(program);
  // A program that declares its own `хондан` reads no input with it
  const readsInput = !declaredNames.has('хондан');
  return {
    builtinMemberKeys,
    unused: () => declarations.filter(d => !reads.has((d.identifier as Identifier).name)),
    readsLine: (node: Expression): boolean =>
      readsInput &&
      (isReadCall(node) ||
        (node.type === 'Identifier' && lineVariables.has((node as Identifier).name))),
  };
}

/** Whether an identifier at `key` of `parent` reads a variable (not a name being declared, a key or a member). */
function isRead(parent: ASTNode, key: string): boolean {
  switch (parent.type) {
    case 'VariableDeclaration':
      return key !== 'identifier';
    case 'MemberExpression':
      return key !== 'property' || (parent as MemberExpression).computed;
    case 'Property':
      return key !== 'key' || (parent as Property).computed;
    case 'PropertyDefinition':
    case 'MethodDefinition':
      return key !== 'key';
    case 'FunctionDeclaration':
    case 'ClassDeclaration':
      return key !== 'name';
    default:
      return true;
  }
}

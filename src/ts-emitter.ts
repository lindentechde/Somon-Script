/**
 * TypeScript emitter: prints a SomonScript AST as TypeScript source that keeps
 * every type (annotations, generics, interfaces, type aliases, enums,
 * modifiers, assertions, …) and every declaration that exists only for the
 * type checker (`эълон …`, overload signatures, abstract and index members,
 * `эълон модул`), with ES module imports and exports.
 *
 * It is the JavaScript code generator with its type hooks filled in, so values
 * and member names come out exactly as in the JavaScript output (built-in
 * objects, `translateMemberName`). Tajik type names become TypeScript's
 * (`рақам` → `number`, `қисмӣ` → `Partial`, …). `emit` also returns, for
 * fine-grained positions (statements, expressions, identifiers and types),
 * where they come from in the `.som` source, so TypeScript diagnostics can be
 * mapped back.
 */
import { translateMemberName } from './builtin-names';
import { CodeGenerator, originalPosition, PREC, type CodeMapping } from './codegen';
import type {
  AmbientModuleDeclaration,
  ArrayType,
  AsExpression,
  ASTNode,
  ClassDeclaration,
  ClassExpression,
  ConditionalType,
  ConstructorType,
  EnumDeclaration,
  ExportAssignment,
  Expression,
  FunctionExpression,
  FunctionSignature,
  FunctionType,
  GenericType,
  Identifier,
  ImportEqualsDeclaration,
  ImportType,
  InstantiationExpression,
  IndexedAccessType,
  InferType,
  InterfaceDeclaration,
  IntersectionType,
  KeyofType,
  Literal,
  LiteralType,
  MappedType,
  MethodDefinition,
  NamespaceDeclaration,
  NonNullExpression,
  ObjectType,
  OptionalType,
  Parameter,
  PrimitiveType,
  Program,
  PropertyDefinition,
  PropertySignature,
  ReadonlyType,
  RestType,
  SatisfiesExpression,
  Statement,
  TemplateLiteralType,
  TupleType,
  TypeAlias,
  TypeAnnotation,
  TypeAssertion,
  TypeNode,
  TypeParameter,
  TypePredicate,
  TypeQuery,
  UnionType,
  UniqueType,
} from './types';

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

/** Binding strength of type syntax, for parenthesizing nested types. */
const TYPE_PREC = {
  /** Conditional, function and constructor types: they extend to the right. */
  LOWEST: 0,
  UNION: 1,
  INTERSECTION: 2,
  /** `keyof Т`, `readonly Т[]`, `unique symbol`, `infer У`, `typeof х`. */
  OPERATOR: 3,
  /** Primary types and postfix `Т[]`, `Т[К]`. */
  PRIMARY: 4,
} as const;

const TYPE_NODE_PREC: Readonly<Record<string, number>> = {
  ConditionalType: TYPE_PREC.LOWEST,
  FunctionType: TYPE_PREC.LOWEST,
  ConstructorType: TYPE_PREC.LOWEST,
  TypePredicate: TYPE_PREC.LOWEST,
  UnionType: TYPE_PREC.UNION,
  IntersectionType: TYPE_PREC.INTERSECTION,
  KeyofType: TYPE_PREC.OPERATOR,
  ReadonlyType: TYPE_PREC.OPERATOR,
  UniqueType: TYPE_PREC.OPERATOR,
  InferType: TYPE_PREC.OPERATOR,
};

/** TypeScript source and the positions it maps back to in the `.som` input. */
export interface TsEmitResult {
  code: string;
  /** Generated → original positions: lines 1-based, columns 0-based, in output order. */
  mappings: CodeMapping[];
  /**
   * The program's ambient modules (`эълон модул "м" { … }`), apart: a module
   * file can only augment an existing module, so they go in a declaration
   * file of their own (see `emit`).
   */
  ambient?: { code: string; mappings: CodeMapping[] };
  /**
   * Module specifiers as the program writes them (`./м`), by the spelling the
   * TypeScript gives them (`./м.js`), for messages that name a module.
   */
  specifiers?: ReadonlyMap<string, string>;
}

type Declarable = Statement & { declare?: boolean; exported?: boolean };

export class TsEmitter extends CodeGenerator {
  /** Type names the program declares, which shadow the built-in Tajik names. */
  private declaredTypeNames: ReadonlySet<string> = new Set();
  /** Ambient contexts (`declare …`) around the current node; `declare` goes on the outermost. */
  private ambientDepth = 0;
  /** Names already exported under their JavaScript name (`export { илова as push }`). */
  private exportedAliases = new Set<string>();
  /** See `TsEmitResult.specifiers`. */
  private writtenSpecifiers = new Map<string, string>();

  constructor(options: { experimentalDecorators?: boolean } = {}) {
    super({ module: 'esm', experimentalDecorators: options.experimentalDecorators });
  }

  /**
   * TypeScript source of `ast`, with its position mappings. Top-level ambient
   * modules (`эълон модул "м"`) are returned apart, in `ambient`: in the
   * module file they would augment `м` instead of declaring it.
   */
  emit(ast: Program): TsEmitResult {
    const isAmbientModule = (stmt: Statement): boolean =>
      stmt.type === 'AmbientModuleDeclaration' && !(stmt as AmbientModuleDeclaration).global;
    const modules = ast.body.filter(isAmbientModule);
    this.writtenSpecifiers = new Map();
    const result: TsEmitResult = this.emitProgram({
      ...ast,
      body: ast.body.filter(stmt => !isAmbientModule(stmt)),
    });
    if (modules.length > 0) {
      result.ambient = this.emitProgram({ ...ast, body: modules, shebang: undefined });
    }
    result.specifiers = this.writtenSpecifiers;
    return result;
  }

  protected convertSourcePath(source: string): string {
    const converted = super.convertSourcePath(source);
    // Only a quoted specifier is converted; the first spelling that gives a name keeps it
    const name = converted.slice(1, -1);
    if (converted !== source && !this.writtenSpecifiers.has(name)) {
      this.writtenSpecifiers.set(name, source.slice(1, -1));
    }
    return converted;
  }

  generate(ast: Program): string {
    this.reset(ast);
    return super.generate(ast);
  }

  private emitProgram(ast: Program): TsEmitResult {
    this.reset(ast);
    return this.generateWithMappings(ast);
  }

  private reset(ast: Program): void {
    this.declaredTypeNames = TsEmitter.collectTypeNames(ast);
    this.ambientDepth = 0;
    this.exportedAliases = new Set();
  }

  /** Every name declared as a type or type parameter anywhere in the program. */
  private static collectTypeNames(root: ASTNode): Set<string> {
    const names = new Set<string>();
    const declaring = new Set([
      'InterfaceDeclaration',
      'TypeAlias',
      'ClassDeclaration',
      'ClassExpression',
      'EnumDeclaration',
      'NamespaceDeclaration',
      'TypeParameter',
    ]);
    const visit = (value: unknown): void => {
      if (Array.isArray(value)) {
        value.forEach(visit);
        return;
      }
      if (!value || typeof value !== 'object') return;
      const node = value as { type?: string; name?: Identifier };
      if (node.type && declaring.has(node.type) && node.name?.type === 'Identifier') {
        names.add(node.name.name);
      }
      Object.values(value).forEach(visit);
    };
    visit(root);
    return names;
  }

  // ---------------------------------------------------------------------------
  // Hooks of the JavaScript generator
  // ---------------------------------------------------------------------------

  /** For TypeScript, the input functions are declared: the run time provides them. */
  protected inputPrologue(): string {
    return [
      'declare function хондан(савол?: unknown): string;',
      'declare function хонданиРақам(савол?: unknown): number;',
    ].join('\n');
  }

  protected elidesTypes(): boolean {
    return false;
  }

  protected markPosition(node: ASTNode | undefined, code: string): string {
    if (!this.trackPositions || !node || typeof node.line !== 'number' || !node.line) {
      return code;
    }
    return this.positionMarker(node) + code;
  }

  protected typeAnnotationText(annotation: TypeAnnotation | undefined): string {
    return annotation ? `: ${this.typeText(annotation.typeAnnotation)}` : '';
  }

  protected returnTypeText(annotation: TypeAnnotation | undefined): string {
    return this.typeAnnotationText(annotation);
  }

  protected typeParametersText(params: TypeParameter[] | undefined): string {
    if (!params || params.length === 0) return '';
    return `<${params.map(param => this.typeParameterText(param)).join(', ')}>`;
  }

  protected typeArgumentsText(args: TypeNode[] | undefined): string {
    if (!args || args.length === 0) return '';
    return `<${args.map(arg => this.typeText(arg)).join(', ')}>`;
  }

  protected definiteMark(): string {
    return '!';
  }

  protected optionalMark(optional: boolean | undefined): string {
    return optional ? '?' : '';
  }

  /** TypeScript reads `а < б > (в)` as a call with type arguments. */
  protected readsTypeArguments(): boolean {
    return true;
  }

  protected thisParameterText(thisType: TypeAnnotation | undefined): string {
    return thisType ? `this${this.typeAnnotationText(thisType)}` : '';
  }

  /**
   * A parameter property without a type stays a TypeScript parameter
   * property, which infers its type. One with a type is declared as a field
   * (`declare`, see `extraClassMembers`) and assigned in the constructor as
   * in JavaScript, so its property is created in the same order.
   */
  protected parameterModifiers(param: Parameter): string {
    if (param.typeAnnotation) return '';
    const accessibility = param.accessibility ? `${param.accessibility} ` : '';
    const override = param.override ? 'override ' : '';
    return `${accessibility}${override}${param.readonly ? 'readonly ' : ''}`;
  }

  /**
   * `private declare readonly х: рақам;` for each typed parameter property
   * (without `override`, which TypeScript does not allow on a `declare` field);
   * an optional parameter (`х?: рақам`) declares an optional field, whose
   * type includes `undefined` as the parameter property's does.
   */
  protected extraClassMembers(node: ClassDeclaration | ClassExpression): string[] {
    const constructor = node.body.body.find(
      member =>
        member.type === 'MethodDefinition' && member.kind === 'constructor' && !member.signature
    ) as MethodDefinition | undefined;
    return (constructor?.value.params ?? [])
      .filter(
        param => (param.accessibility || param.readonly || param.override) && param.typeAnnotation
      )
      .map(param => {
        const accessibility = param.accessibility ? `${param.accessibility} ` : '';
        const readonly = param.readonly ? 'readonly ' : '';
        const name = this.markPosition(param.name, translateMemberName(param.name.name));
        const optional = param.optional ? '?' : '';
        const type = this.typeAnnotationText(param.typeAnnotation);
        return this.indent(`${accessibility}declare ${readonly}${name}${optional}${type};`);
      });
  }

  protected classModifiers(node: ClassDeclaration | ClassExpression): string {
    return (node as ClassDeclaration & { abstract?: boolean }).abstract ? 'abstract ' : '';
  }

  protected implementsClause(node: ClassDeclaration | ClassExpression): string {
    const interfaces = node.implements ?? [];
    if (interfaces.length === 0) return '';
    const types = interfaces.map(
      (name, index) =>
        this.markPosition(name, this.typeNameText(name.name)) +
        this.typeArgumentsText(node.implementsTypeArguments?.[index])
    );
    return ` implements ${types.join(', ')}`;
  }

  /** `public static override readonly `: TypeScript's order of modifiers. */
  protected memberModifiers(member: MethodDefinition | PropertyDefinition): string {
    const accessibility = member.accessibility ? `${member.accessibility} ` : '';
    const isStatic = member.static ? 'static ' : '';
    const abstract = member.abstract ? 'abstract ' : '';
    const override = member.override ? 'override ' : '';
    const readonly =
      member.type === 'PropertyDefinition' && (member as PropertyDefinition).readonly
        ? 'readonly '
        : '';
    return `${accessibility}${isStatic}${abstract}${override}${readonly}`;
  }

  /**
   * `abstract м(х: рақам): сатр;`, an overload signature `м(х: рақам): сатр;`
   * or a member of an `эълон синф`. Signatures are neither `async` nor
   * generators in TypeScript.
   */
  protected generateMethodSignature(node: MethodDefinition): string {
    const fn = node.value;
    const accessor = node.kind === 'get' || node.kind === 'set' ? `${node.kind} ` : '';
    const name =
      node.kind === 'constructor' ? 'constructor' : this.generateMemberKey(node.key, node.computed);
    const typeParameters = this.typeParametersText(fn.typeParameters);
    const params = this.withScope(this.paramNames(fn.params), () =>
      this.withThisParameter(fn.thisType, this.generateParams(fn.params))
    );
    const returnType = this.returnTypeText(fn.returnType);
    return this.indent(
      `${this.memberModifiers(node)}${accessor}${name}${this.optionalMark(node.optional)}${typeParameters}(${params})${returnType};`
    );
  }

  /** `[калид: сатр]: рақам;`, `declare х: рақам;`, `abstract х: рақам;` */
  protected generateFieldSignature(node: PropertyDefinition): string {
    const type = this.typeAnnotationText(node.typeAnnotation);
    if (node.indexSignature) {
      const param = node.indexSignature;
      const key = this.markPosition(param.name, param.name.name);
      const keyType = this.typeAnnotationText(param.typeAnnotation);
      const isStatic = node.static ? 'static ' : '';
      const readonly = node.readonly ? 'readonly ' : '';
      return this.indent(`${isStatic}${readonly}[${key}${keyType}]${type};`);
    }
    const name = this.generateMemberKey(node.key, node.computed);
    const optional = this.optionalMark(node.optional);
    if (node.abstract) {
      const accessor = node.accessor ? 'accessor ' : '';
      return this.indent(`${this.memberModifiers(node)}${accessor}${name}${optional}${type};`);
    }
    // `declare` is implied (and not allowed) in an `эълон синф`
    const declare = this.ambientDepth === 0 ? 'declare ' : '';
    const accessibility = node.accessibility ? `${node.accessibility} ` : '';
    const isStatic = node.static ? 'static ' : '';
    const readonly = node.readonly ? 'readonly ' : '';
    return this.indent(
      `${accessibility}${isStatic}${declare}${readonly}${name}${optional}${type};`
    );
  }

  /** Typed parameter properties are assigned as in JavaScript; TypeScript assigns the others. */
  protected constructorBody(constructor: FunctionExpression) {
    return this.withParameterProperties(constructor, param => Boolean(param.typeAnnotation));
  }

  protected generateAssertion(node: Expression, minPrec: number): string {
    const inner = (node as NonNullExpression).expression;
    let code: string;
    switch (node.type) {
      case 'NonNullExpression':
        // A postfix operator: binds like a member access, never needs parentheses
        return this.markPosition(node, `${this.generateExpression(inner, PREC.CALL)}!`);
      case 'InstantiationExpression': {
        // `ф<Т>`; parenthesized as an operand of a member access or call (TS1477)
        const typeArguments = this.typeArgumentsText(
          (node as InstantiationExpression).typeArguments
        );
        code = `${this.generateExpression(inner, PREC.CALL)}${typeArguments}`;
        return this.markPosition(node, minPrec >= PREC.CALL ? `(${code})` : code);
      }
      case 'AsExpression': {
        const assertion = node as AsExpression;
        const type = assertion.isConst ? 'const' : this.typeText(assertion.typeAnnotation!);
        code = `${this.generateExpression(inner, PREC.RELATIONAL + 1)} as ${type}`;
        break;
      }
      case 'SatisfiesExpression': {
        const type = this.typeText((node as SatisfiesExpression).typeAnnotation);
        code = `${this.generateExpression(inner, PREC.RELATIONAL + 1)} satisfies ${type}`;
        break;
      }
      default: {
        // `<Т>х`, `<собит>х`
        const assertion = node as TypeAssertion;
        const type = assertion.isConst ? 'const' : this.typeText(assertion.typeAnnotation!);
        code = `<${type}>${this.generateExpression(inner, PREC.UNARY)}`;
      }
    }
    // Always parenthesized: `as` binds like a relational operator
    return this.markPosition(node, `(${code})`);
  }

  /**
   * `export interface …`, `export declare …`, an exported overload signature.
   * A name that is a built-in member name is exported as its JavaScript name;
   * an overload signature then stays unexported, like its implementation.
   */
  protected exportTypeDeclaration(
    code: string,
    declaration: Statement,
    isDefault: boolean
  ): string {
    if (isDefault) return CodeGenerator.prefixDeclaration(code, 'export default ');
    const names = this.declaredNamesOf(declaration);
    if (names.every(name => translateMemberName(name) === name)) {
      return CodeGenerator.prefixDeclaration(code, 'export ');
    }
    const signature = declaration as Declarable;
    if (signature.type === 'FunctionSignature' && !signature.declare) return code;
    const aliases = names
      .filter(name => !this.exportedAliases.has(name))
      .map(name => {
        this.exportedAliases.add(name);
        const exported = translateMemberName(name);
        return exported === name ? name : `${name} as ${exported}`;
      });
    if (aliases.length === 0) return code;
    return `${code}\n${this.indent(`export { ${aliases.join(', ')} };`)}`;
  }

  /** The names a declaration binds, also when it is a type or `эълон …`. */
  private declaredNamesOf(declaration: Statement): string[] {
    switch (declaration.type) {
      case 'InterfaceDeclaration':
      case 'TypeAlias':
      case 'FunctionSignature':
        return [(declaration as InterfaceDeclaration | TypeAlias | FunctionSignature).name.name];
      default: {
        const names: string[] = [];
        this.collectDeclaredNames(declaration, names);
        return names;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Declarations that exist only in TypeScript (or that TypeScript emits itself)
  // ---------------------------------------------------------------------------

  protected generateStatementNode(node: Statement): string {
    switch (node.type) {
      case 'FunctionSignature':
        return this.inAmbientContext(node, () =>
          this.generateFunctionSignature(node as FunctionSignature)
        );
      case 'AmbientModuleDeclaration':
        return this.generateAmbientModule(node as AmbientModuleDeclaration);
      default:
        if (!(node as Declarable).declare) return super.generateStatementNode(node);
        // The JavaScript generator skips `эълон …`: generate the declaration itself
        return this.inAmbientContext(node, () =>
          super.generateStatementNode({ ...node, declare: false } as Statement)
        );
    }
  }

  /**
   * Runs `generate` for `node`, inside an ambient context when it is
   * `эълон …`: `declare` then goes before the outermost declaration only
   * (after its `export`), as TypeScript allows.
   */
  private inAmbientContext(node: Statement, generate: () => string): string {
    if (!(node as Declarable).declare) return generate();
    const outermost = this.ambientDepth === 0;
    this.ambientDepth++;
    try {
      const code = generate();
      return outermost ? code.replace(/^( *(?:\0[^\0]*\0)?(?:export )?)/, '$1declare ') : code;
    } finally {
      this.ambientDepth--;
    }
  }

  /** `function ф<Т>(this: Т, х: number): number;`: an overload signature or `эълон функсия`. */
  private generateFunctionSignature(node: FunctionSignature): string {
    const name = this.generateIdentifier(node.name, true);
    const typeParameters = this.typeParametersText(node.typeParameters);
    const params = this.withScope(this.paramNames(node.params), () =>
      this.withThisParameter(node.thisType, this.generateParams(node.params))
    );
    const returnType = this.returnTypeText(node.returnType);
    return this.indent(`function ${name}${typeParameters}(${params})${returnType};`);
  }

  /** `declare module "м" { … }`, `declare global { … }` */
  private generateAmbientModule(node: AmbientModuleDeclaration): string {
    const head = node.global ? 'global' : `module ${this.generateLiteral(node.name!)}`;
    const declare = this.ambientDepth === 0 ? 'declare ' : '';
    this.ambientDepth++;
    this.indentLevel++;
    let members: string[];
    try {
      members = this.withScope(this.declaredNames(node.body), () =>
        node.body.map(stmt => this.generateStatement(stmt)).filter(code => code.length > 0)
      );
    } finally {
      this.indentLevel--;
      this.ambientDepth--;
    }
    const body = members.length > 0 ? `{\n${members.join('\n')}\n${this.getIndent()}}` : '{}';
    return this.indent(`${declare}${head} ${body}`);
  }

  /** `import х = require("./м.js");`, `import type х = …`, `import х = Н.а;` */
  protected generateImportEquals(node: ImportEqualsDeclaration): string {
    const typeOnly = node.importKind === 'type' ? 'type ' : '';
    const name = this.generateIdentifier(node.id, true);
    const value = node.source
      ? `require(${this.markPosition(node.source, this.convertSourcePath(this.generateLiteral(node.source)))})`
      : this.generateExpression(node.reference!, PREC.ASSIGNMENT);
    return this.indent(`import ${typeOnly}${name} = ${value};`);
  }

  /** `export = х;` */
  protected generateExportAssignment(node: ExportAssignment): string {
    return this.indent(`export = ${this.generateExpression(node.expression, PREC.ASSIGNMENT)};`);
  }

  /** `interface И<Т> extends А, Б<В> { … }` */
  protected generateInterfaceDeclaration(node: InterfaceDeclaration): string {
    const name = this.markPosition(node.name, node.name.name);
    const typeParameters = this.typeParametersText(node.typeParameters);
    const parents = node.extends?.length
      ? ` extends ${node.extends.map(parent => this.typeText(parent)).join(', ')}`
      : '';
    return this.indent(
      `interface ${name}${typeParameters}${parents} ${this.membersBlock(node.body.properties)}`
    );
  }

  /** `type Т<У> = …;` */
  protected generateTypeAlias(node: TypeAlias): string {
    const name = this.markPosition(node.name, node.name.name);
    const typeParameters = this.typeParametersText(node.typeParameters);
    return this.indent(
      `type ${name}${typeParameters} = ${this.typeText(node.typeAnnotation.typeAnnotation)};`
    );
  }

  /** `enum Ранг { Сурх, Сабз = 5 }`, `const enum …`; member names as in JavaScript. */
  protected generateEnumDeclaration(node: EnumDeclaration): string {
    const name = this.generateIdentifier(node.name, true);
    this.indentLevel++;
    const members = node.members.map(member => {
      const key =
        member.id.type === 'Identifier'
          ? this.markPosition(member.id, translateMemberName((member.id as Identifier).name))
          : this.markPosition(member.id, this.generateLiteral(member.id as Literal));
      const initializer = member.initializer
        ? ` = ${this.generateExpression(member.initializer, PREC.ASSIGNMENT)}`
        : '';
      return this.indent(`${key}${initializer},`);
    });
    this.indentLevel--;
    const body = members.length > 0 ? `{\n${members.join('\n')}\n${this.getIndent()}}` : '{}';
    return this.indent(`${node.const ? 'const ' : ''}enum ${name} ${body}`);
  }

  /** `namespace Н { export … }`; TypeScript merges namespaces itself. */
  protected generateNamespaceDeclaration(node: NamespaceDeclaration): string {
    const name = this.generateIdentifier(node.name, true);
    const statements = node.body.statements;
    this.checkRedeclarations(statements);
    this.indentLevel++;
    const aliased = new Set<string>();
    const members = this.withScope(this.declaredNames(statements), () =>
      this.withFunctionBoundary(() =>
        statements
          .map(stmt => this.generateNamespaceMember(stmt, aliased))
          .filter(code => code.length > 0)
      )
    );
    this.indentLevel--;
    const body = members.length > 0 ? `{\n${members.join('\n')}\n${this.getIndent()}}` : '{}';
    const exported = node.exported ? 'export ' : '';
    return this.indent(`${exported}namespace ${name} ${body}`);
  }

  /** A namespace member; `aliased`: names already exported as their JavaScript name. */
  private generateNamespaceMember(stmt: Statement, aliased: Set<string>): string {
    const flagged = stmt as Declarable;
    if (!flagged.exported || stmt.type === 'NamespaceDeclaration') {
      return this.generateStatement(stmt);
    }
    const code = this.generateStatement(stmt);
    const names = this.declaredNamesOf(stmt);
    const translated = names.filter(name => translateMemberName(name) !== name);
    // Names read as written are exported as they are; one declaration may also
    // bind names of built-in members (`содир собит илова = 1, х = 2;`)
    const exported =
      translated.length < names.length ? CodeGenerator.prefixDeclaration(code, 'export ') : code;
    // An overload signature is exported, if at all, with its implementation
    if (translated.length === 0 || (stmt.type === 'FunctionSignature' && !flagged.declare)) {
      return exported;
    }
    // A member named like a built-in member is read as its JavaScript name: `Н.push`
    const aliases = translated
      .filter(name => !aliased.has(name))
      .flatMap(name => {
        aliased.add(name);
        return this.namespaceAliases(stmt, name, translateMemberName(name));
      })
      .map(line => this.indent(line));
    return [exported, ...aliases].join('\n');
  }

  /** Exports of `name` as `alias` from a namespace, with the meanings (value, type) it has. */
  private namespaceAliases(stmt: Statement, name: string, alias: string): string[] {
    const generic = stmt as ClassDeclaration | InterfaceDeclaration | TypeAlias;
    const params = generic.typeParameters ?? [];
    const typeParameters = this.typeParametersText(params);
    const typeArguments =
      params.length > 0 ? `<${params.map(param => param.name.name).join(', ')}>` : '';
    const typeAlias = `export type ${alias}${typeParameters} = ${name}${typeArguments};`;
    // An ambient value has no initializer: its alias only has its type
    const ambient = this.ambientDepth > 0 || Boolean((stmt as Declarable).declare);
    const value = ambient
      ? `export const ${alias}: typeof ${name};`
      : `export const ${alias} = ${name};`;
    switch (stmt.type) {
      case 'EnumDeclaration':
      case 'NamespaceDeclaration':
        return [`export import ${alias} = ${name};`];
      case 'InterfaceDeclaration':
      case 'TypeAlias':
        return [typeAlias];
      case 'ClassDeclaration':
        return [value, typeAlias];
      default:
        return [value];
    }
  }

  // ---------------------------------------------------------------------------
  // Types
  // ---------------------------------------------------------------------------

  /** `собит дар берун Т мерос У = В` → `const in out Т extends U = V` */
  private typeParameterText(param: TypeParameter): string {
    const modifiers = `${param.const ? 'const ' : ''}${param.in ? 'in ' : ''}${param.out ? 'out ' : ''}`;
    const constraint = param.constraint ? ` extends ${this.typeText(param.constraint)}` : '';
    const fallback = param.default ? ` = ${this.typeText(param.default)}` : '';
    return `${modifiers}${this.markPosition(param.name, param.name.name)}${constraint}${fallback}`;
  }

  /** A type reference name: a built-in Tajik name in TypeScript, `Н.Т` qualified. */
  private typeNameText(name: string): string {
    const [first, ...rest] = name.split('.');
    if (rest.length === 0) {
      return this.declaredTypeNames.has(first) ? first : (TYPE_NAMES.get(first) ?? first);
    }
    return [first, ...rest.map(part => translateMemberName(part))].join('.');
  }

  /** TypeScript text of a type; parenthesized when it binds more loosely than `minPrec`. */
  typeText(node: TypeNode, minPrec: number = TYPE_PREC.LOWEST): string {
    const code = this.typeNodeText(node);
    const prec = TYPE_NODE_PREC[node.type] ?? TYPE_PREC.PRIMARY;
    return this.markPosition(node, prec < minPrec ? `(${code})` : code);
  }

  // eslint-disable-next-line complexity
  private typeNodeText(node: TypeNode): string {
    switch (node.type) {
      case 'PrimitiveType':
        // The parser names primitive types with their Tajik keywords, which all have a TypeScript name
        return TYPE_NAMES.get((node as PrimitiveType).name)!;
      case 'LiteralType': {
        const literal = node as LiteralType;
        return `${TsEmitter.literalTypeText(literal.value)}${literal.bigint ? 'n' : ''}`;
      }
      case 'GenericType': {
        const generic = node as GenericType;
        return (
          this.markPosition(generic.name, this.typeNameText(generic.name.name)) +
          this.typeArgumentsText(generic.typeParameters)
        );
      }
      case 'ArrayType':
        return `${this.typeText((node as ArrayType).elementType, TYPE_PREC.PRIMARY)}[]`;
      case 'UnionType':
        return (node as UnionType).types
          .map(type => this.typeText(type, TYPE_PREC.INTERSECTION))
          .join(' | ');
      case 'IntersectionType':
        return (node as IntersectionType).types
          .map(type => this.typeText(type, TYPE_PREC.OPERATOR))
          .join(' & ');
      case 'TupleType':
        return this.tupleTypeText(node as TupleType);
      case 'ImportType':
        return this.importTypeText(node as ImportType);
      case 'OptionalType':
        return `${this.typeText((node as OptionalType).typeAnnotation, TYPE_PREC.PRIMARY)}?`;
      case 'RestType':
        return `...${this.typeText((node as RestType).typeAnnotation, TYPE_PREC.OPERATOR)}`;
      case 'ObjectType':
        return this.objectTypeText((node as ObjectType).properties);
      default:
        return this.typeOperatorText(node);
    }
  }

  // eslint-disable-next-line complexity
  private typeOperatorText(node: TypeNode): string {
    switch (node.type) {
      case 'FunctionType': {
        const fn = node as FunctionType;
        const typeParameters = this.typeParametersText(fn.typeParameters);
        return `${typeParameters}(${this.signatureParams(fn.parameters, fn.thisType)}) => ${this.typeText(fn.returnType)}`;
      }
      case 'ConstructorType': {
        const ctor = node as ConstructorType;
        const prefix = ctor.abstract ? 'abstract new' : 'new';
        const typeParameters = this.typeParametersText(ctor.typeParameters);
        return `${prefix} ${typeParameters}(${this.signatureParams(ctor.parameters)}) => ${this.typeText(ctor.returnType)}`;
      }
      case 'KeyofType':
        return `keyof ${this.typeText((node as KeyofType).operand, TYPE_PREC.OPERATOR)}`;
      case 'ReadonlyType':
        return `readonly ${this.typeText((node as ReadonlyType).typeAnnotation, TYPE_PREC.OPERATOR)}`;
      case 'UniqueType':
        return `unique ${this.typeText((node as UniqueType).baseType, TYPE_PREC.OPERATOR)}`;
      case 'IndexedAccessType': {
        const access = node as IndexedAccessType;
        return `${this.typeText(access.objectType, TYPE_PREC.PRIMARY)}[${this.typeText(access.indexType)}]`;
      }
      case 'ConditionalType': {
        const conditional = node as ConditionalType;
        const check = this.typeText(conditional.checkType, TYPE_PREC.UNION);
        const extendsType = this.typeText(conditional.extendsType, TYPE_PREC.UNION);
        return `${check} extends ${extendsType} ? ${this.typeText(conditional.trueType)} : ${this.typeText(conditional.falseType)}`;
      }
      case 'InferType':
        return `infer ${this.typeParameterText((node as InferType).typeParameter)}`;
      case 'MappedType':
        return this.mappedTypeText(node as MappedType);
      case 'ThisType':
        return 'this';
      case 'TypePredicate':
        return this.predicateText(node as TypePredicate);
      case 'TypeQuery': {
        const query = node as TypeQuery;
        return `typeof ${this.typeQueryName(query.exprName)}${this.typeArgumentsText(query.typeArguments)}`;
      }
      case 'TemplateLiteralType':
        return this.templateTypeText(node as TemplateLiteralType);
      default:
        this.errors.push(`Unknown type node: ${node.type}`);
        return 'any';
    }
  }

  /** `[number, string]`, `[x: number, y?: number, ...rest: string[]]` */
  private tupleTypeText(tuple: TupleType): string {
    const elements = tuple.elementTypes.map((type, index) => {
      const label = tuple.elementNames?.[index];
      if (!label) return this.typeText(type);
      const name = this.markPosition(label, label.name);
      if (type.type === 'RestType') {
        return `...${name}: ${this.typeText((type as RestType).typeAnnotation)}`;
      }
      if (type.type === 'OptionalType') {
        return `${name}?: ${this.typeText((type as OptionalType).typeAnnotation)}`;
      }
      return `${name}: ${this.typeText(type)}`;
    });
    return `[${elements.join(', ')}]`;
  }

  /** `import("./м.js").Т<У>`, `typeof import("./м.js")` */
  private importTypeText(node: ImportType): string {
    const source = this.markPosition(
      node.argument,
      this.convertSourcePath(this.generateLiteral(node.argument))
    );
    const qualifier = node.qualifier ? `.${node.qualifier}` : '';
    const typeOf = node.isTypeOf ? 'typeof ' : '';
    return `${typeOf}import(${source})${qualifier}${this.typeArgumentsText(node.typeArguments)}`;
  }

  private static literalTypeText(value: string | number | boolean): string {
    if (typeof value === 'string') return JSON.stringify(value);
    return String(value);
  }

  /**
   * Parameters of a function or constructor type, after its `this` parameter
   * if any; their names are in scope only there.
   */
  private signatureParams(params: Parameter[], thisType?: TypeNode): string {
    const list = this.withScope(this.paramNames(params), () => this.generateParams(params));
    if (!thisType) return list;
    const thisParameter = `this: ${this.typeText(thisType)}`;
    return list ? `${thisParameter}, ${list}` : thisParameter;
  }

  /** `х аст Т`, `ин аст Т`, `тасдиқ х`, `тасдиқ х аст Т` */
  private predicateText(predicate: TypePredicate): string {
    const subject =
      predicate.parameterName.type === 'ThisType'
        ? 'this'
        : this.markPosition(predicate.parameterName, (predicate.parameterName as Identifier).name);
    const type = predicate.typeAnnotation ? ` is ${this.typeText(predicate.typeAnnotation)}` : '';
    return `${predicate.asserts ? 'asserts ' : ''}${subject}${type}`;
  }

  /** `навъи о.а` → `typeof о.а`, the value named as in expressions (`Риёзӣ` → `Math`). */
  private typeQueryName(name: Identifier): string {
    const [first, ...rest] = name.name.split('.');
    let head = first;
    if (first === 'ин') {
      head = 'this';
    } else if (!this.isDeclared(first)) {
      head = this.mapBuiltinIdentifier(first) ?? first;
    }
    const members = rest.map(part => `.${translateMemberName(part)}`).join('');
    return this.markPosition(name, `${head}${members}`);
  }

  /** `` `пеш_${К}` `` with its text parts kept raw. */
  private templateTypeText(template: TemplateLiteralType): string {
    let text = '`';
    template.quasis.forEach((quasi, index) => {
      text += quasi;
      if (index < template.types.length) {
        text += `\${${this.typeText(template.types[index])}}`;
      }
    });
    return `${text}\``;
  }

  /** `{ readonly [К in keyof Т as Н]?: Т[К] }` with `+`/`-` modifiers. */
  private mappedTypeText(mapped: MappedType): string {
    let readonly = mapped.readonly ? 'readonly ' : '';
    if (mapped.readonlyModifier) readonly = `${mapped.readonlyModifier}readonly `;
    let optional = mapped.optional ? '?' : '';
    if (mapped.optionalModifier) optional = `${mapped.optionalModifier}?`;
    const parameter = mapped.typeParameter;
    // `[К дар …]`: a mapped type's parameter always has its constraint
    const constraint = this.typeText(parameter.constraint!);
    const nameType = mapped.nameType ? ` as ${this.typeText(mapped.nameType)}` : '';
    const key = this.markPosition(parameter.name, parameter.name.name);
    const value = this.typeText(mapped.typeAnnotation.typeAnnotation);
    return `{ ${readonly}[${key} in ${constraint}${nameType}]${optional}: ${value} }`;
  }

  /** An object type on one line: `{ а: рақам; б?: сатр }`. */
  private objectTypeText(properties: PropertySignature[]): string {
    if (properties.length === 0) return '{}';
    return `{ ${properties.map(property => this.signatureText(property)).join('; ')} }`;
  }

  /** Interface members, one per line. */
  private membersBlock(properties: PropertySignature[]): string {
    if (properties.length === 0) return '{}';
    this.indentLevel++;
    const lines = properties.map(property => this.indent(`${this.signatureText(property)};`));
    this.indentLevel--;
    return `{\n${lines.join('\n')}\n${this.getIndent()}}`;
  }

  /** One member of an interface or object type. */
  private signatureText(property: PropertySignature): string {
    const readonly = property.readonly ? 'readonly ' : '';
    const optional = property.optional ? '?' : '';
    const valueType = property.typeAnnotation.typeAnnotation;
    if (property.indexSignature) {
      const keyName = this.markPosition(
        property.indexSignature.name,
        property.indexSignature.name.name
      );
      const keyType = this.typeAnnotationText(property.indexSignature.typeAnnotation);
      return `${readonly}[${keyName}${keyType}]: ${this.typeText(valueType)}`;
    }
    if (property.signature) {
      // `<Т>(х: Т): Т`, `new (х: number): К`
      const fn = valueType as FunctionType | ConstructorType;
      const typeParameters = this.typeParametersText(property.typeParameters);
      const params = this.signatureParams(fn.parameters, (fn as FunctionType).thisType);
      const prefix = property.signature === 'construct' ? 'new ' : '';
      return `${prefix}${typeParameters}(${params}): ${this.typeText(fn.returnType)}`;
    }
    const key = property.computedKey
      ? `[${this.generateExpression(property.computedKey, PREC.ASSIGNMENT)}]`
      : this.generatePropertyKey(property.key);
    // `get ном(): Т;`, `set ном(қимат: Т);` (the parameter's name is not kept)
    if (property.kind === 'get') return `get ${key}(): ${this.typeText(valueType)}`;
    if (property.kind === 'set') return `set ${key}(value: ${this.typeText(valueType)})`;
    if (property.method && valueType.type === 'FunctionType') {
      const fn = valueType as FunctionType;
      const typeParameters = this.typeParametersText(property.typeParameters);
      return `${readonly}${key}${optional}${typeParameters}(${this.signatureParams(fn.parameters, fn.thisType)}): ${this.typeText(fn.returnType)}`;
    }
    return `${readonly}${key}${optional}: ${this.typeText(valueType)}`;
  }
}

/** Where a position of the emitted TypeScript is in the `.som` source. */
export { originalPosition };

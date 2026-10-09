/**
 * TypeScript emitter: prints a SomonScript AST as TypeScript source that keeps
 * every type (annotations, generics, interfaces, type aliases, enums,
 * modifiers, assertions, …), with ES module imports and exports.
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
import { CodeGenerator, PREC, type CodeMapping } from './codegen';
import type {
  ArrayType,
  AsExpression,
  ASTNode,
  ClassDeclaration,
  ClassExpression,
  ConditionalType,
  ConstructorType,
  EnumDeclaration,
  Expression,
  FunctionExpression,
  FunctionType,
  GenericType,
  Identifier,
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
}

export class TsEmitter extends CodeGenerator {
  /** Type names the program declares, which shadow the built-in Tajik names. */
  private declaredTypeNames: ReadonlySet<string> = new Set();

  constructor() {
    super({ module: 'esm' });
  }

  /** TypeScript source of `ast`, with its position mappings. */
  emit(ast: Program): TsEmitResult {
    this.declaredTypeNames = TsEmitter.collectTypeNames(ast);
    return this.generateWithMappings(ast);
  }

  generate(ast: Program): string {
    this.declaredTypeNames = TsEmitter.collectTypeNames(ast);
    return super.generate(ast);
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

  protected elidesTypeOnlyImports(): boolean {
    return false;
  }

  protected markPosition(node: ASTNode | undefined, code: string): string {
    if (!this.trackPositions || !node || typeof node.line !== 'number' || !node.line) {
      return code;
    }
    if (typeof node.column !== 'number') return code;
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

  /**
   * A parameter property without a type stays a TypeScript parameter
   * property, which infers its type. One with a type is declared as a field
   * (`declare`, see `extraClassMembers`) and assigned in the constructor as
   * in JavaScript, so its property is created in the same order.
   */
  protected parameterModifiers(param: Parameter): string {
    if (param.typeAnnotation) return '';
    const accessibility = param.accessibility ? `${param.accessibility} ` : '';
    return `${accessibility}${param.readonly ? 'readonly ' : ''}`;
  }

  /** `private declare readonly х: рақам;` for each typed parameter property. */
  protected extraClassMembers(node: ClassDeclaration | ClassExpression): string[] {
    const constructor = node.body.body.find(
      member => member.type === 'MethodDefinition' && member.kind === 'constructor'
    ) as MethodDefinition | undefined;
    return (constructor?.value.params ?? [])
      .filter(param => (param.accessibility || param.readonly) && param.typeAnnotation)
      .map(param => {
        const accessibility = param.accessibility ? `${param.accessibility} ` : '';
        const readonly = param.readonly ? 'readonly ' : '';
        const name = this.markPosition(param.name, translateMemberName(param.name.name));
        const type = this.typeAnnotationText(param.typeAnnotation);
        return this.indent(`${accessibility}declare ${readonly}${name}${type};`);
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

  protected memberModifiers(member: MethodDefinition | PropertyDefinition): string {
    const accessibility = member.accessibility ? `${member.accessibility} ` : '';
    const isStatic = member.static ? 'static ' : '';
    const readonly =
      member.type === 'PropertyDefinition' && (member as PropertyDefinition).readonly
        ? 'readonly '
        : '';
    return `${accessibility}${isStatic}${readonly}`;
  }

  /** `abstract м(х: рақам): сатр;` */
  protected generateAbstractMethod(node: MethodDefinition): string {
    const fn = node.value as FunctionExpression | undefined;
    const accessor = node.kind === 'get' || node.kind === 'set' ? `${node.kind} ` : '';
    const accessibility = node.accessibility ? `${node.accessibility} ` : '';
    const isAsync = fn?.async ? 'async ' : '';
    const name = this.generateMemberKey(node.key);
    const typeParameters = this.typeParametersText(fn?.typeParameters);
    const params = this.withScope(this.paramNames(fn?.params), () =>
      this.generateParams(fn?.params)
    );
    const returnType = this.returnTypeText(fn?.returnType);
    return this.indent(
      `${accessibility}abstract ${isAsync}${accessor}${name}${typeParameters}(${params})${returnType};`
    );
  }

  /** Typed parameter properties are assigned as in JavaScript; TypeScript assigns the others. */
  protected constructorBody(constructor: FunctionExpression) {
    return this.withParameterProperties(constructor, param => Boolean(param.typeAnnotation));
  }

  protected generateAssertion(node: Expression, _minPrec: number): string {
    const inner = (node as NonNullExpression).expression;
    let code: string;
    switch (node.type) {
      case 'NonNullExpression':
        // A postfix operator: binds like a member access, never needs parentheses
        return this.markPosition(node, `${this.generateExpression(inner, PREC.CALL)}!`);
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

  /** `export interface …`; a name that is a built-in member name is exported as its JavaScript name. */
  protected exportTypeDeclaration(
    code: string,
    declaration: Statement,
    isDefault: boolean
  ): string {
    if (isDefault) return CodeGenerator.prefixDeclaration(code, 'export default ');
    const name = (declaration as InterfaceDeclaration | TypeAlias).name?.name;
    if (!name || translateMemberName(name) === name) {
      return CodeGenerator.prefixDeclaration(code, 'export ');
    }
    return `${code}\n${this.indent(`export { ${name} as ${translateMemberName(name)} };`)}`;
  }

  // ---------------------------------------------------------------------------
  // Declarations that exist only in TypeScript (or that TypeScript emits itself)
  // ---------------------------------------------------------------------------

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

  /** `namespace Н { export … }` */
  protected generateNamespaceDeclaration(node: NamespaceDeclaration): string {
    const name = this.generateIdentifier(node.name, true);
    const statements = node.body?.statements ?? [];
    this.checkRedeclarations(statements);
    this.indentLevel++;
    const members = this.withScope(this.declaredNames(statements), () =>
      this.withFunctionBoundary(() =>
        statements.map(stmt => this.generateNamespaceMember(stmt)).filter(code => code.length > 0)
      )
    );
    this.indentLevel--;
    const body = members.length > 0 ? `{\n${members.join('\n')}\n${this.getIndent()}}` : '{}';
    const exported = node.exported ? 'export ' : '';
    return this.indent(`${exported}namespace ${name} ${body}`);
  }

  private generateNamespaceMember(stmt: Statement): string {
    const flagged = stmt as Statement & { exported?: boolean };
    if (!flagged.exported || stmt.type === 'NamespaceDeclaration') {
      return this.generateStatement(stmt);
    }
    const code = this.generateStatement(stmt);
    const names =
      stmt.type === 'InterfaceDeclaration' || stmt.type === 'TypeAlias'
        ? [(stmt as InterfaceDeclaration | TypeAlias).name.name]
        : this.extractExportNames(stmt);
    if (names.every(name => translateMemberName(name) === name)) {
      return CodeGenerator.prefixDeclaration(code, 'export ');
    }
    // A member named like a built-in member is read as its JavaScript name: `Н.push`
    const aliases = names.flatMap(name =>
      this.namespaceAliases(stmt, name, translateMemberName(name)).map(line => this.indent(line))
    );
    return [code, ...aliases].join('\n');
  }

  /** Exports of `name` as `alias` from a namespace, with the meanings (value, type) it has. */
  private namespaceAliases(stmt: Statement, name: string, alias: string): string[] {
    if (name === alias) return [];
    const generic = stmt as ClassDeclaration | InterfaceDeclaration | TypeAlias;
    const params = generic.typeParameters ?? [];
    const typeParameters = this.typeParametersText(params);
    const typeArguments =
      params.length > 0 ? `<${params.map(param => param.name.name).join(', ')}>` : '';
    const typeAlias = `export type ${alias}${typeParameters} = ${name}${typeArguments};`;
    switch (stmt.type) {
      case 'EnumDeclaration':
      case 'NamespaceDeclaration':
        return [`export import ${alias} = ${name};`];
      case 'InterfaceDeclaration':
      case 'TypeAlias':
        return [typeAlias];
      case 'ClassDeclaration':
        return [`export const ${alias} = ${name};`, typeAlias];
      default:
        return [`export const ${alias} = ${name};`];
    }
  }

  // ---------------------------------------------------------------------------
  // Types
  // ---------------------------------------------------------------------------

  /** `Т мерос У = В` → `Т extends U = V` */
  private typeParameterText(param: TypeParameter): string {
    const constraint = param.constraint ? ` extends ${this.typeText(param.constraint)}` : '';
    const fallback = param.default ? ` = ${this.typeText(param.default)}` : '';
    return `${this.markPosition(param.name, param.name.name)}${constraint}${fallback}`;
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
      case 'PrimitiveType': {
        const name = (node as PrimitiveType).name;
        return TYPE_NAMES.get(name) ?? name;
      }
      case 'LiteralType':
        return TsEmitter.literalTypeText((node as LiteralType).value);
      case 'GenericType': {
        const generic = node as GenericType;
        return (
          this.markPosition(generic.name, this.typeNameText(generic.name.name)) +
          this.typeArgumentsText(generic.typeParameters)
        );
      }
      case 'Identifier':
        return this.typeNameText((node as unknown as Identifier).name);
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
        return `[${(node as TupleType).elementTypes.map(type => this.typeText(type)).join(', ')}]`;
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
        return `(${this.signatureParams(fn.parameters)}) => ${this.typeText(fn.returnType)}`;
      }
      case 'ConstructorType': {
        const ctor = node as ConstructorType;
        const prefix = ctor.abstract ? 'abstract new' : 'new';
        return `${prefix} (${this.signatureParams(ctor.parameters)}) => ${this.typeText(ctor.returnType)}`;
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
      case 'TypeQuery':
        return `typeof ${this.typeQueryName((node as TypeQuery).exprName)}`;
      case 'TemplateLiteralType':
        return this.templateTypeText(node as TemplateLiteralType);
      default:
        this.errors.push(`Unknown type node: ${node.type}`);
        return 'any';
    }
  }

  private static literalTypeText(value: string | number | boolean): string {
    if (typeof value === 'string') return JSON.stringify(value);
    return String(value);
  }

  /** Parameters of a function or constructor type; their names are in scope only there. */
  private signatureParams(params: Parameter[]): string {
    return this.withScope(this.paramNames(params), () => this.generateParams(params));
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
    const constraint = parameter.constraint ? this.typeText(parameter.constraint) : 'any';
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
    const key = property.computedKey
      ? `[${this.generateExpression(property.computedKey, PREC.ASSIGNMENT)}]`
      : this.markPosition(property.key, translateMemberName(property.key.name));
    if (property.method && valueType.type === 'FunctionType') {
      const fn = valueType as FunctionType;
      const typeParameters = this.typeParametersText(property.typeParameters);
      return `${readonly}${key}${optional}${typeParameters}(${this.signatureParams(fn.parameters)}): ${this.typeText(fn.returnType)}`;
    }
    return `${readonly}${key}${optional}: ${this.typeText(valueType)}`;
  }
}

/**
 * The `.som` position (line 1-based, column 0-based) of a position in the
 * emitted TypeScript: that of the nearest mapping at or before it.
 */
export function originalPosition(
  mappings: CodeMapping[],
  line: number,
  column: number
): { line: number; column: number } | undefined {
  let low = 0;
  let high = mappings.length - 1;
  let found = -1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const generated = mappings[middle].generated;
    if (generated.line < line || (generated.line === line && generated.column <= column)) {
      found = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return found === -1 ? undefined : mappings[found].original;
}

import { ASTNode, Expression, Identifier, Parameter, Statement } from './ast';

// Type system AST nodes
export interface TypeAnnotation extends ASTNode {
  type: 'TypeAnnotation';
  typeAnnotation: TypeNode;
}

export interface TypeNode extends ASTNode {
  type: string;
}

export interface PrimitiveType extends TypeNode {
  type: 'PrimitiveType';
  name: 'сатр' | 'рақам' | 'мантиқӣ' | 'холӣ' | 'беқимат' | 'рамз' | 'калонрақам';
}

export interface ArrayType extends TypeNode {
  type: 'ArrayType';
  elementType: TypeNode;
}

/** `(а: рақам, б?: сатр, ...в: рақам[]) => мантиқӣ` */
export interface FunctionType extends TypeNode {
  type: 'FunctionType';
  parameters: Parameter[];
  returnType: TypeNode;
  /** A `this` parameter: `(ин: Т, х: рақам) => беджавоб`. */
  thisType?: TypeNode;
}

export interface UnionType extends TypeNode {
  type: 'UnionType';
  types: TypeNode[];
}

export interface IntersectionType extends TypeNode {
  type: 'IntersectionType';
  types: TypeNode[];
}

export interface GenericType extends TypeNode {
  type: 'GenericType';
  name: Identifier;
  typeParameters?: TypeNode[];
}

export interface InterfaceDeclaration extends Statement {
  type: 'InterfaceDeclaration';
  name: Identifier;
  typeParameters?: TypeParameter[];
  extends?: TypeNode[];
  body: InterfaceBody;
}

export interface InterfaceBody extends ASTNode {
  type: 'InterfaceBody';
  properties: PropertySignature[];
}

export interface PropertySignature extends ASTNode {
  type: 'PropertySignature';
  key: Identifier;
  typeAnnotation: TypeAnnotation;
  optional: boolean;
  readonly?: boolean;
  /** Method signature `ном(…): Т`; `typeAnnotation` holds its function type. */
  method?: boolean;
  /** Type parameters of a generic method signature: `ҳамон<Т>(х: Т): Т`. */
  typeParameters?: TypeParameter[];
  /**
   * Accessor signature `get ном(): Т;` / `set ном(қ: Т);`; `typeAnnotation`
   * holds the property's type.
   */
  kind?: 'get' | 'set';
  /**
   * A computed name, `[калид]: Т;`, known only at run time: `key` is a
   * placeholder and `computedKey` the expression.
   */
  computed?: boolean;
  computedKey?: Expression;
  /**
   * An index signature `[калид: сатр]: Т`: its key parameter (with the key
   * type as its annotation), as in a class's `PropertyDefinition`. `key` is
   * then the placeholder `__computed__`.
   */
  indexSignature?: Parameter;
}

export interface TypeParameter extends ASTNode {
  type: 'TypeParameter';
  name: Identifier;
  constraint?: TypeNode;
  default?: TypeNode;
  /** `<собит Т>`: a const type parameter. */
  const?: boolean;
  /** Variance annotations `<дар Т>`, `<берун Т>`, `<дар берун Т>`. */
  in?: boolean;
  out?: boolean;
}

export interface TypeAlias extends Statement {
  type: 'TypeAlias';
  name: Identifier;
  typeParameters?: TypeParameter[];
  typeAnnotation: TypeAnnotation;
}

export interface NamespaceDeclaration extends Statement {
  type: 'NamespaceDeclaration';
  name: Identifier;
  body: NamespaceBody;
  exported?: boolean;
  /** `эълон номфазо …`: an ambient namespace, erased in the output. */
  declare?: boolean;
}

export interface NamespaceBody extends ASTNode {
  type: 'NamespaceBody';
  statements: Statement[];
}

export interface ConditionalType extends TypeNode {
  type: 'ConditionalType';
  checkType: TypeNode;
  extendsType: TypeNode;
  trueType: TypeNode;
  falseType: TypeNode;
}

export interface MappedType extends TypeNode {
  type: 'MappedType';
  typeParameter: TypeParameter;
  typeAnnotation: TypeAnnotation;
  optional?: boolean;
  readonly?: boolean;
  /** Key remapping clause (TypeScript `as`): the `Н` of `[К дар калидҳои Т чун Н]`. */
  nameType?: TypeNode;
  /** `+танҳохонӣ` / `-танҳохонӣ`: adds or removes `readonly` (`readonly` is set for '+' only). */
  readonlyModifier?: '+' | '-';
  /** `+?` / `-?`: adds or removes optionality (`optional` is set for '+' only). */
  optionalModifier?: '+' | '-';
}

/** `инфер У` (`infer U`): a type variable inferred in the `мерос` clause of a conditional type. */
export interface InferType extends TypeNode {
  type: 'InferType';
  typeParameter: TypeParameter;
}

/** `навъи х`, `навъи о.а` (`typeof x` in a type): the type of a value. */
export interface TypeQuery extends TypeNode {
  type: 'TypeQuery';
  /** The value, a dotted name such as `о.а` kept in one identifier. */
  exprName: Identifier;
}

/** `` `пеш_${К}` `` in a type: `quasis` (raw text) has one element more than `types`. */
export interface TemplateLiteralType extends TypeNode {
  type: 'TemplateLiteralType';
  quasis: string[];
  types: TypeNode[];
}

export interface IndexedAccessType extends TypeNode {
  type: 'IndexedAccessType';
  objectType: TypeNode;
  indexType: TypeNode;
}

export interface KeyofType extends TypeNode {
  type: 'KeyofType';
  operand: TypeNode;
}

export interface UniqueType extends TypeNode {
  type: 'UniqueType';
  baseType: TypeNode;
}

/** `танҳохонӣ рақам[]`, `танҳохонӣ [рақам, сатр]`: a readonly array or tuple type. */
export interface ReadonlyType extends TypeNode {
  type: 'ReadonlyType';
  typeAnnotation: TypeNode;
}

/** An optional tuple element: `сатр?` in `[рақам, сатр?]`. */
export interface OptionalType extends TypeNode {
  type: 'OptionalType';
  typeAnnotation: TypeNode;
}

/** A rest tuple element: `...мантиқӣ[]` in `[рақам, ...мантиқӣ[]]`. */
export interface RestType extends TypeNode {
  type: 'RestType';
  typeAnnotation: TypeNode;
}

/** `ин` as a type: the type of the receiver (`илова(): ин`). */
export interface ThisType extends TypeNode {
  type: 'ThisType';
}

/**
 * A return type that is a type predicate, `х аст сатр` / `ин аст Т`
 * (`x is T`), or an assertion signature, `тасдиқ х` / `тасдиқ х аст Т`
 * (`asserts x`, `asserts x is T`).
 */
export interface TypePredicate extends TypeNode {
  type: 'TypePredicate';
  parameterName: Identifier | ThisType;
  /** Absent for `тасдиқ х`. */
  typeAnnotation?: TypeNode;
  asserts: boolean;
}

/** `нав (а: рақам) => Т`, `мавҳум нав () => Т` */
export interface ConstructorType extends TypeNode {
  type: 'ConstructorType';
  parameters: Parameter[];
  returnType: TypeNode;
  abstract?: boolean;
}

export interface TupleType extends TypeNode {
  type: 'TupleType';
  /** Element types; optional and rest elements are `OptionalType` / `RestType` nodes. */
  elementTypes: TypeNode[];
}

export interface LiteralType extends TypeNode {
  type: 'LiteralType';
  value: string | number | boolean;
}

export interface ObjectType extends TypeNode {
  type: 'ObjectType';
  properties: PropertySignature[];
}

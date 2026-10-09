import { ASTNode, Identifier, Parameter, Statement } from './ast';

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
  name: 'сатр' | 'рақам' | 'мантиқӣ' | 'холӣ' | 'беқимат' | 'рамз';
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
}

export interface TypeParameter extends ASTNode {
  type: 'TypeParameter';
  name: Identifier;
  constraint?: TypeNode;
  default?: TypeNode;
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

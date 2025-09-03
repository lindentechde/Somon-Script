import { ASTNode, Identifier, Statement } from './ast';

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
  name: 'сатр' | 'рақам' | 'мантиқӣ' | 'холӣ';
}

export interface ArrayType extends TypeNode {
  type: 'ArrayType';
  elementType: TypeNode;
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

export interface TupleType extends TypeNode {
  type: 'TupleType';
  elementTypes: TypeNode[];
}

export interface LiteralType extends TypeNode {
  type: 'LiteralType';
  value: string | number | boolean;
}
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
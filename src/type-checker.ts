import {
  ArrayType,
  Expression,
  FunctionDeclaration,
  GenericType,
  Identifier,
  InterfaceDeclaration,
  Literal,
  ObjectExpression,

  PrimitiveType,
  Program,
  Statement,
  TypeAlias,

  TypeNode,
  UnionType,
  VariableDeclaration,
} from './types';

/**
 * Represents a type checking error or warning
 */
export interface TypeCheckError {
  message: string;
  line: number;
  column: number;
  severity: 'error' | 'warning';
}

/**
 * Result of type checking operation
 */
export interface TypeCheckResult {
  errors: TypeCheckError[];
  warnings: TypeCheckError[];
}

/**
 * Represents a type in the Somoni-script type system
 */
export interface Type {
  kind: string;
  name?: string;
  elementType?: Type;
  types?: Type[];
  properties?: Map<string, PropertyType>;
}

/**
 * Represents a property type with optional flag
 */
export interface PropertyType {
  type: Type;
  optional: boolean;
}

/**
 * Type checker for Somoni-script AST
 * Provides comprehensive type checking with Tajik Cyrillic type annotations
 */
export class TypeChecker {
  private errors: TypeCheckError[] = [];
  private warnings: TypeCheckError[] = [];
  private symbolTable: Map<string, Type> = new Map();
  private interfaceTable: Map<string, Type> = new Map();
  private typeAliasTable: Map<string, Type> = new Map();

  constructor() {
    this.initializePrimitiveTypes();
  }

  /**
   * Initialize primitive types in the symbol table
   */
  private initializePrimitiveTypes(): void {
    this.symbolTable.set('сатр', { kind: 'primitive', name: 'string' });
    this.symbolTable.set('рақам', { kind: 'primitive', name: 'number' });
    this.symbolTable.set('мантиқӣ', { kind: 'primitive', name: 'boolean' });
    this.symbolTable.set('холӣ', { kind: 'primitive', name: 'null' });
  }

  /**
   * Perform type checking on the entire program
   * @param program - The AST program to type check
   * @returns Type checking result with errors and warnings
   */
  public check(program: Program): TypeCheckResult {
    this.errors = [];
    this.warnings = [];
    
    // First pass: collect type definitions
    this.collectTypeDefinitions(program);
    
    // Second pass: type check statements
    for (const statement of program.body) {
      this.checkStatement(statement);
    }

    return {
      errors: this.errors,
      warnings: this.warnings
    };
  }

  private collectTypeDefinitions(program: Program): void {
    for (const statement of program.body) {
      if (statement.type === 'InterfaceDeclaration') {
        this.collectInterface(statement as InterfaceDeclaration);
      } else if (statement.type === 'TypeAlias') {
        this.collectTypeAlias(statement as TypeAlias);
      }
    }
  }

  private collectInterface(interfaceDecl: InterfaceDeclaration): void {
    const properties = new Map<string, PropertyType>();
    
    for (const prop of interfaceDecl.body.properties) {
      const propType = this.resolveTypeNode(prop.typeAnnotation.typeAnnotation);
      properties.set(prop.key.name, {
        type: propType,
        optional: prop.optional
      });
    }

    const interfaceType: Type = {
      kind: 'interface',
      name: interfaceDecl.name.name,
      properties
    };

    this.interfaceTable.set(interfaceDecl.name.name, interfaceType);
  }

  private collectTypeAlias(typeAlias: TypeAlias): void {
    const aliasType = this.resolveTypeNode(typeAlias.typeAnnotation.typeAnnotation);
    this.typeAliasTable.set(typeAlias.name.name, aliasType);
  }

  private checkStatement(statement: Statement): void {
    switch (statement.type) {
      case 'VariableDeclaration':
        this.checkVariableDeclaration(statement as VariableDeclaration);
        break;
      case 'FunctionDeclaration':
        this.checkFunctionDeclaration(statement as FunctionDeclaration);
        break;
      // Add more statement types as needed
    }
  }

  private checkVariableDeclaration(varDecl: VariableDeclaration): void {
    let declaredType: Type | undefined;
    
    // Get declared type if present
    if (varDecl.typeAnnotation) {
      declaredType = this.resolveTypeNode(varDecl.typeAnnotation.typeAnnotation);
    }

    // Get inferred type from initializer
    let inferredType: Type | undefined;
    if (varDecl.init) {
      inferredType = this.inferExpressionType(varDecl.init);
    }

    // Type checking
    if (declaredType && inferredType) {
      if (!this.isAssignable(inferredType, declaredType)) {
        this.addError(
          `Type '${this.typeToString(inferredType)}' is not assignable to type '${this.typeToString(declaredType)}'`,
          varDecl.line,
          varDecl.column
        );
      }
    }

    // Store variable type in symbol table
    const finalType = declaredType || inferredType;
    if (finalType && varDecl.identifier.type === 'Identifier') {
      this.symbolTable.set(varDecl.identifier.name, finalType);
    }
    // TODO: Handle destructuring patterns in type checking
  }

  private checkFunctionDeclaration(funcDecl: FunctionDeclaration): void {
    // Create new scope for function parameters
    const savedSymbols = new Map(this.symbolTable);

    // Add parameters to symbol table
    for (const param of funcDecl.params) {
      if (param.typeAnnotation) {
        const paramType = this.resolveTypeNode(param.typeAnnotation.typeAnnotation);
        this.symbolTable.set(param.name.name, paramType);
      }
    }

    // Check function body (simplified - would need full statement checking)
    // For now, just restore symbol table
    this.symbolTable = savedSymbols;

    // Store function type
    const functionType: Type = {
      kind: 'function',
      name: funcDecl.name.name
    };
    this.symbolTable.set(funcDecl.name.name, functionType);
  }

  private resolveTypeNode(typeNode: TypeNode): Type {
    switch (typeNode.type) {
      case 'PrimitiveType':
        const primitiveType = typeNode as PrimitiveType;
        return { kind: 'primitive', name: this.mapTajikToPrimitive(primitiveType.name) };
      
      case 'ArrayType':
        const arrayType = typeNode as ArrayType;
        return {
          kind: 'array',
          elementType: this.resolveTypeNode(arrayType.elementType)
        };
      
      case 'UnionType':
        const unionType = typeNode as UnionType;
        return {
          kind: 'union',
          types: unionType.types.map(t => this.resolveTypeNode(t))
        };
      
      case 'GenericType':
        const genericType = typeNode as GenericType;
        // Check if it's a known interface or type alias
        const interfaceType = this.interfaceTable.get(genericType.name.name);
        if (interfaceType) {
          return interfaceType;
        }
        const aliasType = this.typeAliasTable.get(genericType.name.name);
        if (aliasType) {
          return aliasType;
        }
        // Unknown type
        return { kind: 'unknown', name: genericType.name.name };
      
      case 'Identifier':
        // Handle simple interface/type references
        const identifierType = typeNode as Identifier;
        const interfaceRef = this.interfaceTable.get(identifierType.name);
        if (interfaceRef) {
          return interfaceRef;
        }
        const aliasRef = this.typeAliasTable.get(identifierType.name);
        if (aliasRef) {
          return aliasRef;
        }
        // Unknown type
        return { kind: 'unknown', name: identifierType.name };
      
      default:
        return { kind: 'unknown' };
    }
  }

  private mapTajikToPrimitive(tajikType: string): string {
    switch (tajikType) {
      case 'сатр': return 'string';
      case 'рақам': return 'number';
      case 'мантиқӣ': return 'boolean';
      case 'холӣ': return 'null';
      default: return 'unknown';
    }
  }

  private inferExpressionType(expression: Expression): Type {
    switch (expression.type) {
      case 'Literal':
        const literal = expression as Literal;
        if (typeof literal.value === 'string') {
          return { kind: 'primitive', name: 'string' };
        } else if (typeof literal.value === 'number') {
          return { kind: 'primitive', name: 'number' };
        } else if (typeof literal.value === 'boolean') {
          return { kind: 'primitive', name: 'boolean' };
        } else if (literal.value === null) {
          return { kind: 'primitive', name: 'null' };
        }
        break;
      
      case 'Identifier':
        const identifier = expression as Identifier;
        return this.symbolTable.get(identifier.name) || { kind: 'unknown' };
      
      case 'ArrayExpression':
        // For now, assume array of unknown type
        return { kind: 'array', elementType: { kind: 'unknown' } };
      
      case 'ObjectExpression':
        // Infer object type from properties
        const properties = new Map<string, PropertyType>();
        const objExpr = expression as ObjectExpression;
        
        if (objExpr.properties) {
          for (const prop of objExpr.properties) {
            if (prop.key && prop.value) {
              const keyName = prop.key.type === 'Identifier' 
                ? (prop.key as Identifier).name 
                : String((prop.key as Literal).value);
              const valueType = this.inferExpressionType(prop.value);
              properties.set(keyName, {
                type: valueType,
                optional: false
              });
            }
          }
        }
        
        return {
          kind: 'object',
          properties: properties
        };
      
      // Add more expression types as needed
    }
    
    return { kind: 'unknown' };
  }

  private isAssignable(source: Type, target: Type): boolean {
    // Exact match
    if (source.kind === target.kind && source.name === target.name) {
      return true;
    }

    // Array type checking
    if (source.kind === 'array' && target.kind === 'array') {
      return source.elementType && target.elementType 
        ? this.isAssignable(source.elementType, target.elementType)
        : false;
    }

    // Union type checking
    if (target.kind === 'union' && target.types) {
      return target.types.some(t => this.isAssignable(source, t));
    }

    // Source union type - all members must be assignable to target
    if (source.kind === 'union' && source.types) {
      return source.types.every(t => this.isAssignable(t, target));
    }

    // Intersection type checking
    if (target.kind === 'intersection' && target.types) {
      // Source must be assignable to all types in intersection
      return target.types.every(t => this.isAssignable(source, t));
    }

    if (source.kind === 'intersection' && source.types) {
      // At least one type in intersection must be assignable to target
      return source.types.some(t => this.isAssignable(t, target));
    }

    // Interface structural typing
    if (source.kind === 'interface' && target.kind === 'interface') {
      return this.isStructurallyCompatible(source, target);
    }

    // Object literal to interface assignment
    if (source.kind === 'object' && target.kind === 'interface') {
      return this.isStructurallyCompatible(source, target);
    }

    return false;
  }

  private typeToString(type: Type): string {
    switch (type.kind) {
      case 'primitive':
        return this.mapPrimitiveToTajik(type.name || 'unknown');
      case 'array':
        return `${this.typeToString(type.elementType!)}[]`;
      case 'union':
        return type.types!.map(t => this.typeToString(t)).join(' | ');
      case 'intersection':
        return type.types!.map(t => this.typeToString(t)).join(' & ');
      case 'interface':
        return type.name || 'interface';
      case 'tuple':
        return `[${type.types!.map(t => this.typeToString(t)).join(', ')}]`;
      case 'literal':
        return typeof type.name === 'string' ? `"${type.name}"` : String(type.name);
      default:
        return type.name || 'unknown';
    }
  }

  private isStructurallyCompatible(source: Type, target: Type): boolean {
    if (!source.properties || !target.properties) {
      return false;
    }

    // Check if source has all required properties of target
    for (const [propName, targetProp] of target.properties) {
      const sourceProp = source.properties.get(propName);
      
      // Required property missing
      if (!sourceProp && !targetProp.optional) {
        return false;
      }
      
      // Property exists, check type compatibility
      if (sourceProp && !this.isAssignable(sourceProp.type, targetProp.type)) {
        return false;
      }
    }
    
    return true;
  }

  private mapPrimitiveToTajik(primitiveType: string): string {
    switch (primitiveType) {
      case 'string': return 'сатр';
      case 'number': return 'рақам';
      case 'boolean': return 'мантиқӣ';
      case 'null': return 'холӣ';
      default: return primitiveType;
    }
  }

  private addError(message: string, line: number, column: number): void {
    this.errors.push({
      message,
      line,
      column,
      severity: 'error'
    });
  }

  private addWarning(message: string, line: number, column: number): void {
    this.warnings.push({
      message,
      line,
      column,
      severity: 'warning'
    });
  }
}
/* eslint-disable no-case-declarations */
import {
  ArrayType,
  CallExpression,
  ClassDeclaration,
  ArrayPattern,
  ObjectPattern,
  Expression,
  FunctionDeclaration,
  GenericType,
  Identifier,
  InterfaceDeclaration,
  IntersectionType,
  Literal,
  NewExpression,
  ObjectExpression,
  PrimitiveType,
  Program,
  Statement,
  TupleType,
  TypeAlias,
  TypeNode,
  UnionType,
  VariableDeclaration,
  TypeAnnotation,
  UniqueType,
} from './types';
import { PropertyDefinition, MethodDefinition } from './ast';

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
}

/**
 * Stable error codes for type checking diagnostics
 */
export const TypeCheckErrorCode = {
  TypeMismatch: 'TYPE_NOT_ASSIGNABLE',
  ClassNotFound: 'CLASS_NOT_FOUND',
  InvalidExtends: 'INVALID_EXTENDS',
  CircularInheritance: 'CIRCULAR_INHERITANCE',
} as const;
// eslint-disable-next-line no-redeclare, @typescript-eslint/no-redeclare
export type TypeCheckErrorCode = (typeof TypeCheckErrorCode)[keyof typeof TypeCheckErrorCode];

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
  elementType?: Type;
  types?: Type[];
  properties?: Map<string, PropertyType>;
  returnType?: Type;
  baseType?: Type;
}

/**
 * Represents a property type with optional flag
 */
export interface PropertyType {
  type: Type;
  optional: boolean;
}

/**
 * Type checker for SomonScript AST
 * Provides comprehensive type checking with Tajik Cyrillic type annotations
 */
export class TypeChecker {
  private errors: TypeCheckError[] = [];
  private warnings: TypeCheckError[] = [];
  private symbolTable: Map<string, Type> = new Map();
  private interfaceTable: Map<string, Type> = new Map();
  private typeAliasTable: Map<string, Type> = new Map();

  private sourceLines: string[] = [];

  constructor(source?: string) {
    this.sourceLines = source ? source.split(/\r?\n/) : [];
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

    // First pass: collect type definitions
    this.collectTypeDefinitions(program);

    // Second pass: type check statements
    for (const statement of program.body) {
      this.checkStatement(statement);
    }

    return {
      errors: this.errors,
      warnings: this.warnings,
    };
  }

  /**
   * Get the symbol table for language server completions
   * @returns The symbol table with all defined types
   */
  public getSymbolTable(): Map<string, Type> {
    return this.symbolTable;
  }

  private collectTypeDefinitions(program: Program): void {
    for (const statement of program.body) {
      if (statement.type === 'InterfaceDeclaration') {
        this.collectInterface(statement as InterfaceDeclaration);
      } else if (statement.type === 'TypeAlias') {
        this.collectTypeAlias(statement as TypeAlias);
      } else if (statement.type === 'ClassDeclaration') {
        this.collectClass(statement as ClassDeclaration);
      }
    }
  }

  private collectInterface(interfaceDecl: InterfaceDeclaration): void {
    const properties = new Map<string, PropertyType>();

    for (const prop of interfaceDecl.body.properties) {
      const propType = this.resolveTypeNode(prop.typeAnnotation.typeAnnotation);
      properties.set(prop.key.name, {
        type: propType,
        optional: prop.optional,
      });
    }

    const interfaceType: Type = {
      kind: 'interface',
      name: interfaceDecl.name.name,
      properties,
    };

    this.interfaceTable.set(interfaceDecl.name.name, interfaceType);
  }

  private collectTypeAlias(typeAlias: TypeAlias): void {
    const aliasType = this.resolveTypeNode(typeAlias.typeAnnotation.typeAnnotation);
    this.typeAliasTable.set(typeAlias.name.name, aliasType);
  }

  private collectClass(classDecl: ClassDeclaration): void {
    // Collect class members (properties and methods)
    const properties = new Map<string, PropertyType>();

    for (const member of classDecl.body.body) {
      if (member.type === 'PropertyDefinition') {
        const prop = member as PropertyDefinition;
        const propType = prop.typeAnnotation
          ? this.resolveTypeNode(prop.typeAnnotation.typeAnnotation)
          : { kind: 'unknown' };

        properties.set(prop.key.name, {
          type: propType,
          optional: false,
        });
      } else if (member.type === 'MethodDefinition') {
        const method = member as MethodDefinition;
        if (method.kind === 'constructor') continue; // Skip constructor

        const returnType = method.value.returnType
          ? this.resolveTypeNode(method.value.returnType.typeAnnotation)
          : { kind: 'unknown' };

        // Store method as a function type property
        properties.set(method.key.name, {
          type: {
            kind: 'function',
            name: method.key.name,
            returnType: returnType,
          },
          optional: false,
        });
      }
    }

    // If class extends another class, resolve parent properties
    let baseType: Type | undefined;
    if (classDecl.superClass) {
      const parentName = classDecl.superClass.name;
      baseType = this.symbolTable.get(parentName);
    }

    // Register the class type with its members
    const classType: Type = {
      kind: 'class',
      name: classDecl.name.name,
      properties,
      baseType,
    };
    this.symbolTable.set(classDecl.name.name, classType);
  }

  private checkStatement(statement: Statement): void {
    switch (statement.type) {
      case 'VariableDeclaration':
        this.checkVariableDeclaration(statement as VariableDeclaration);
        break;
      case 'FunctionDeclaration':
        this.checkFunctionDeclaration(statement as FunctionDeclaration);
        break;
      case 'ClassDeclaration':
        this.checkClassDeclaration(statement as ClassDeclaration);
        break;
      // Add more statement types as needed
    }
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
      inferredType = this.inferExpressionType(varDecl.init, declaredType);
    }

    // Type checking
    if (declaredType && inferredType) {
      if (!this.isAssignable(inferredType, declaredType)) {
        this.addError(
          TypeCheckErrorCode.TypeMismatch,
          `Type '${this.typeToString(inferredType)}' is not assignable to type '${this.typeToString(declaredType)}'`,
          varDecl.line,
          varDecl.column
        );
      }
    }

    // Store variable type in symbol table
    const finalType = declaredType || inferredType;
    if (finalType) {
      if (varDecl.identifier.type === 'Identifier') {
        this.symbolTable.set(varDecl.identifier.name, finalType);
      } else {
        this.bindPatternTypes(varDecl.identifier, finalType);
      }
    }
  }

  private bindPatternTypes(pattern: Identifier | ArrayPattern | ObjectPattern, type: Type): void {
    if (pattern.type === 'Identifier') {
      this.symbolTable.set(pattern.name, type);
      return;
    }

    if (pattern.type === 'ArrayPattern' && type.elementType) {
      pattern.elements.forEach(element => {
        if (element) {
          this.bindPatternTypes(
            element as Identifier | ArrayPattern | ObjectPattern,
            type.elementType!
          );
        }
      });
      return;
    }

    if (pattern.type === 'ObjectPattern' && type.properties) {
      for (const prop of pattern.properties) {
        if (prop.type !== 'PropertyPattern') continue;
        const keyName = prop.key.type === 'Identifier' ? prop.key.name : String(prop.key.value);
        const propType = type.properties.get(keyName);
        if (propType) {
          this.bindPatternTypes(
            prop.value as Identifier | ArrayPattern | ObjectPattern,
            propType.type
          );
        }
      }
    }
  }

  private checkFunctionDeclaration(funcDecl: FunctionDeclaration): void {
    // Create new scope for function parameters
    const savedSymbols = new Map(this.symbolTable);

    // Add parameters to symbol table
    for (const param of funcDecl.params) {
      if (param.typeAnnotation) {
        const annotation: TypeAnnotation = param.typeAnnotation;
        const paramType = this.resolveTypeNode(annotation.typeAnnotation);
        this.symbolTable.set(param.name.name, paramType);
      }
    }

    // Check function body (simplified - would need full statement checking)
    // For now, just restore symbol table
    this.symbolTable = savedSymbols;

    // Store function type with return type
    const returnTypeAnnotation: TypeAnnotation | undefined = funcDecl.returnType;
    const returnType = returnTypeAnnotation
      ? this.resolveTypeNode(returnTypeAnnotation.typeAnnotation)
      : { kind: 'unknown' };

    const functionType: Type = {
      kind: 'function',
      name: funcDecl.name.name,
      returnType: returnType,
    };
    this.symbolTable.set(funcDecl.name.name, functionType);
  }

  private checkClassDeclaration(classDecl: ClassDeclaration): void {
    // Phase 2: Validate class relationships and property types

    // 1. Validate superClass exists and is actually a class
    if (classDecl.superClass) {
      const parentType = this.symbolTable.get(classDecl.superClass.name);
      const interfaceType = this.interfaceTable.get(classDecl.superClass.name);

      if (!parentType && !interfaceType) {
        this.addError(
          TypeCheckErrorCode.ClassNotFound,
          `Base class '${classDecl.superClass.name}' not found`,
          classDecl.line,
          classDecl.column
        );
      } else if (interfaceType) {
        // Found in interfaceTable - can't extend interfaces
        this.addError(
          TypeCheckErrorCode.InvalidExtends,
          `Class '${classDecl.name.name}' can only extend other classes, but '${classDecl.superClass.name}' is an interface`,
          classDecl.line,
          classDecl.column
        );
      } else if (parentType && parentType.kind !== 'class') {
        const kindDescription =
          parentType.kind === 'interface' ? 'an interface' : `a ${parentType.kind}`;
        this.addError(
          TypeCheckErrorCode.InvalidExtends,
          `Class '${classDecl.name.name}' can only extend other classes, but '${classDecl.superClass.name}' is ${kindDescription}`,
          classDecl.line,
          classDecl.column
        );
      } else if (parentType) {
        // Check for circular inheritance
        this.checkCircularInheritance(
          classDecl.name.name,
          parentType,
          classDecl.line,
          classDecl.column
        );
      }
    }

    // 2. Validate property initializers match their declared types
    for (const member of classDecl.body.body) {
      if (member.type === 'PropertyDefinition') {
        const prop = member as PropertyDefinition;

        if (prop.typeAnnotation && prop.value) {
          const declaredType = this.resolveTypeNode(prop.typeAnnotation.typeAnnotation);
          const inferredType = this.inferExpressionType(prop.value);

          if (!this.isAssignable(inferredType, declaredType)) {
            this.addError(
              TypeCheckErrorCode.TypeMismatch,
              `Type '${this.typeToString(inferredType)}' is not assignable to type '${this.typeToString(declaredType)}' for property '${prop.key.name}'`,
              prop.line,
              prop.column
            );
          }
        }
      }
    }
  }

  /**
   * Check for circular inheritance in class hierarchy
   * Follows fail-fast principle: errors are reported immediately
   */
  private checkCircularInheritance(
    className: string,
    currentType: Type,
    line: number,
    column: number,
    visited: Set<string> = new Set()
  ): void {
    // Check if we've already visited this class in the inheritance chain
    if (visited.has(className)) {
      this.addError(
        TypeCheckErrorCode.CircularInheritance,
        `Circular inheritance detected involving class '${className}'`,
        line,
        column
      );
      return;
    }

    visited.add(className);

    // Traverse up the inheritance chain
    if (currentType.kind === 'class' && currentType.baseType) {
      // Direct self-inheritance check
      if (currentType.baseType.name === className) {
        this.addError(
          TypeCheckErrorCode.CircularInheritance,
          `Circular inheritance detected: class '${className}' cannot extend itself`,
          line,
          column
        );
        return;
      }

      // Recursive check up the inheritance chain
      this.checkCircularInheritance(className, currentType.baseType, line, column, visited);
    }
  }

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
      case 'Identifier':
        return this.resolveIdentifierType(typeNode as Identifier);
      default:
        return { kind: 'unknown' };
    }
  }

  private resolvePrimitiveType(primitiveType: PrimitiveType): Type {
    return { kind: 'primitive', name: this.mapTajikToPrimitive(primitiveType.name) };
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

  private resolveTupleType(tupleType: TupleType): Type {
    return {
      kind: 'tuple',
      types: tupleType.elementTypes.map(t => this.resolveTypeNode(t)),
    };
  }

  private resolveGenericType(genericType: GenericType): Type {
    return this.resolveNamedType(genericType.name.name);
  }

  private resolveUniqueType(uniqueType: UniqueType): Type {
    return { kind: 'unique', baseType: this.resolveTypeNode(uniqueType.baseType) };
  }

  private resolveIdentifierType(identifierType: Identifier): Type {
    return this.resolveNamedType(identifierType.name);
  }

  private resolveNamedType(typeName: string): Type {
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
    const classType = this.symbolTable.get(typeName);
    if (classType && classType.kind === 'class') {
      return classType;
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
      default:
        return 'unknown';
    }
  }

  private inferExpressionType(expression: Expression, targetType?: Type): Type {
    switch (expression.type) {
      case 'Literal':
        return this.inferLiteralType(expression as Literal);
      case 'Identifier':
        return this.inferIdentifierType(expression as Identifier);
      case 'ArrayExpression':
        return { kind: 'array', elementType: { kind: 'unknown' } };
      case 'ObjectExpression':
        return this.inferObjectType(expression as ObjectExpression, targetType);
      case 'CallExpression':
        return this.inferCallType(expression as CallExpression);
      case 'NewExpression':
        return this.inferNewExpressionType(expression as NewExpression);
      default:
        return { kind: 'unknown' };
    }
  }

  private inferLiteralType(literal: Literal): Type {
    if (typeof literal.value === 'string') {
      return { kind: 'primitive', name: 'string' };
    } else if (typeof literal.value === 'number') {
      return { kind: 'primitive', name: 'number' };
    } else if (typeof literal.value === 'boolean') {
      return { kind: 'primitive', name: 'boolean' };
    } else if (literal.value === null) {
      return { kind: 'primitive', name: 'null' };
    }
    return { kind: 'unknown' };
  }

  private inferIdentifierType(identifier: Identifier): Type {
    return this.symbolTable.get(identifier.name) || { kind: 'unknown' };
  }

  private inferObjectType(objExpr: ObjectExpression, targetType?: Type): Type {
    if (targetType && targetType.kind === 'interface') {
      return targetType;
    }

    if (
      targetType &&
      (targetType.kind === 'intersection' || (targetType.kind === 'unknown' && targetType.name))
    ) {
      return { kind: 'object', properties: this.extractObjectProperties(objExpr) };
    }

    return { kind: 'object', properties: this.extractObjectProperties(objExpr) };
  }

  private extractObjectProperties(objExpr: ObjectExpression): Map<string, PropertyType> {
    const properties = new Map<string, PropertyType>();

    if (objExpr.properties) {
      for (const prop of objExpr.properties) {
        if (prop.key && prop.value) {
          const keyName =
            prop.key.type === 'Identifier'
              ? (prop.key as Identifier).name
              : String((prop.key as Literal).value);
          const valueType = this.inferExpressionType(prop.value);
          properties.set(keyName, {
            type: valueType,
            optional: false,
          });
        }
      }
    }

    return properties;
  }

  private inferCallType(callExpr: CallExpression): Type {
    if (callExpr.callee && callExpr.callee.type === 'Identifier') {
      const functionName = (callExpr.callee as Identifier).name;
      const functionType = this.symbolTable.get(functionName);
      if (functionType && functionType.kind === 'function' && functionType.returnType) {
        return functionType.returnType;
      }
    }
    return { kind: 'unknown' };
  }

  private inferNewExpressionType(newExpr: NewExpression): Type {
    if (newExpr.callee && newExpr.callee.type === 'Identifier') {
      const className = (newExpr.callee as Identifier).name;
      const classType = this.symbolTable.get(className);
      if (classType && classType.kind === 'class') {
        // Return the actual class type with all its properties and baseType
        return classType;
      }
    }
    return { kind: 'unknown' };
  }

  private isAssignable(source: Type, target: Type): boolean {
    if (this.isExactMatch(source, target)) {
      return true;
    }

    if (this.isArrayAssignable(source, target)) {
      return true;
    }

    if (this.isTupleAssignable(source, target)) {
      return true;
    }

    if (this.isArrayToTupleAssignable(source, target)) {
      return true;
    }

    if (this.isUnionAssignable(source, target)) {
      return true;
    }

    if (this.isIntersectionAssignable(source, target)) {
      return true;
    }

    if (this.isInterfaceAssignable(source, target)) {
      return true;
    }

    if (this.isObjectAssignable(source, target)) {
      return true;
    }

    if (this.isClassAssignable(source, target)) {
      return true;
    }

    if (this.isUniqueAssignable(source, target)) {
      return true;
    }

    // Allow assignment to unknown types with names (unresolved type references)
    // This handles complex types that couldn't be resolved like namespaced types and mapped types
    if (target.kind === 'unknown' && target.name) {
      // Allow objects to be assigned to unknown named types
      if (source.kind === 'object' || source.kind === 'interface') {
        return true;
      }
    }

    return false;
  }

  private isExactMatch(source: Type, target: Type): boolean {
    return source.kind === target.kind && source.name === target.name;
  }

  private isArrayAssignable(source: Type, target: Type): boolean {
    if (source.kind !== 'array' || target.kind !== 'array') {
      return false;
    }
    return source.elementType && target.elementType
      ? this.isAssignable(source.elementType, target.elementType)
      : false;
  }

  private isTupleAssignable(source: Type, target: Type): boolean {
    if (source.kind !== 'tuple' || target.kind !== 'tuple') {
      return false;
    }
    if (!source.types || !target.types || source.types.length !== target.types.length) {
      return false;
    }
    return source.types.every((sourceType, index) =>
      this.isAssignable(sourceType, target.types![index])
    );
  }

  private isArrayToTupleAssignable(source: Type, target: Type): boolean {
    return source.kind === 'array' && target.kind === 'tuple';
  }

  private isUnionAssignable(source: Type, target: Type): boolean {
    if (target.kind === 'union' && target.types) {
      return target.types.some(t => this.isAssignable(source, t));
    }
    if (source.kind === 'union' && source.types) {
      return source.types.every(t => this.isAssignable(t, target));
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
    if (target.kind !== 'interface') {
      return false;
    }
    if (source.kind === 'interface' || source.kind === 'object') {
      return this.isStructurallyCompatible(source, target);
    }
    return false;
  }

  private isObjectAssignable(source: Type, target: Type): boolean {
    if (target.kind !== 'object') {
      return false;
    }
    if (source.kind === 'object') {
      return this.isStructurallyCompatible(source, target);
    }
    return false;
  }

  private isClassAssignable(source: Type, target: Type): boolean {
    return source.kind === 'class' && target.kind === 'class' && source.name === target.name;
  }

  private isUniqueAssignable(source: Type, target: Type): boolean {
    if (source.kind === 'unique' && target.kind === 'unique') {
      return this.isAssignable(source.baseType!, target.baseType!);
    }
    if (source.kind === 'unique' || target.kind === 'unique') {
      return false;
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
      case 'class':
        return type.name || 'class';
      case 'unique':
        return `беназир ${this.typeToString(type.baseType!)}`;
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
      case 'string':
        return 'сатр';
      case 'number':
        return 'рақам';
      case 'boolean':
        return 'мантиқӣ';
      case 'null':
        return 'холӣ';
      default:
        return primitiveType;
    }
  }

  private addError(code: TypeCheckErrorCode, message: string, line: number, column: number): void {
    this.errors.push({
      code,
      message,
      line,
      column,
      snippet: this.getSnippet(line),
      severity: 'error',
    });
  }

  private addWarning(
    code: TypeCheckErrorCode,
    message: string,
    line: number,
    column: number
  ): void {
    this.warnings.push({
      code,
      message,
      line,
      column,
      snippet: this.getSnippet(line),
      severity: 'warning',
    });
  }
}

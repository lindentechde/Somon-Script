import {
  Program,
  Statement,
  Expression,
  VariableDeclaration,
  FunctionDeclaration,
  BlockStatement,
  ReturnStatement,
  IfStatement,
  WhileStatement,
  ExpressionStatement,
  Identifier,
  Literal,
  BinaryExpression,
  UnaryExpression,
  CallExpression,
  AssignmentExpression,
  MemberExpression,
  ImportDeclaration,
  ImportSpecifier,
  ExportDeclaration,
  ArrayExpression,
  ObjectExpression,
  InterfaceDeclaration,
  TypeAlias,
  Parameter,
  TryStatement,
  ThrowStatement,
  AwaitExpression,
  NewExpression,
  ClassDeclaration,
  MethodDefinition,
  PropertyDefinition,
  SwitchStatement,
  SpreadElement,
} from './types';
// import { BaseVisitor } from './visitor'; // Simplified for now

export class CodeGenerator {
  private indentLevel: number = 0;
  private readonly indentSize: number = 2;

  // Mapping of Tajik built-in functions to JavaScript equivalents
  private readonly builtinMappings: Map<string, string> = new Map([
    // Console functions
    ['чоп', 'console'],
    ['сабт', 'log'],
    ['хато', 'error'],
    ['огоҳӣ', 'warn'],
    ['маълумот', 'info'],

    // Array methods
    ['рӯйхат', 'Array'],
    ['илова', 'push'],
    ['пуш', 'push'],
    ['баровардан', 'pop'],
    ['дарозӣ', 'length'],
    ['харита', 'map'],
    ['филтр', 'filter'],
    ['кофтан', 'find'],

    // String methods
    ['сатр_методҳо', 'String'],
    ['дарозии_сатр', 'length'],
    ['пайвастан', 'concat'],
    ['ҷойивазкунӣ', 'replace'],
    ['ҷудокунӣ', 'split'],

    // Object methods
    ['объект', 'Object'],
    ['калидҳо', 'keys'],
    ['қиматҳо', 'values'],

    // Math
    ['математика', 'Math'],

    // Control flow
    ['шикастан', 'break'],
    ['давом', 'continue'],
    ['кӯшиш', 'try'],
    ['гирифтан', 'catch'],
    ['ниҳоят', 'finally'],
    ['партофтан', 'throw'],

    // Async
    ['ҳамзамон', 'async'],
    ['интизор', 'await'],
    ['ваъда', 'Promise'],

    // Note: 'хато' is handled specially in generateIdentifier
  ]);

  generate(ast: Program): string {
    return this.generateProgram(ast);
  }

  private generateProgram(node: Program): string {
    const statements = node.body
      .map(stmt => this.generateStatement(stmt))
      .filter(stmt => stmt.length > 0);

    return statements.join('\n');
  }

  // eslint-disable-next-line complexity
  private generateStatement(node: Statement): string {
    switch (node.type) {
      case 'ImportDeclaration':
        return this.generateImportDeclaration(node as ImportDeclaration);
      case 'ExportDeclaration':
        return this.generateExportDeclaration(node as ExportDeclaration);
      case 'VariableDeclaration':
        return this.generateVariableDeclaration(node as VariableDeclaration);
      case 'FunctionDeclaration':
        return this.generateFunctionDeclaration(node as FunctionDeclaration);
      case 'BlockStatement':
        return this.generateBlockStatement(node as BlockStatement);
      case 'ReturnStatement':
        return this.generateReturnStatement(node as ReturnStatement);
      case 'IfStatement':
        return this.generateIfStatement(node as IfStatement);
      case 'WhileStatement':
        return this.generateWhileStatement(node as WhileStatement);
      case 'ExpressionStatement':
        return this.generateExpressionStatement(node as ExpressionStatement);
      case 'TryStatement':
        return this.generateTryStatement(node as TryStatement);
      case 'ThrowStatement':
        return this.generateThrowStatement(node as ThrowStatement);
      case 'InterfaceDeclaration':
        return this.generateInterfaceDeclaration(node as InterfaceDeclaration);
      case 'TypeAlias':
        return this.generateTypeAlias(node as TypeAlias);
      case 'ClassDeclaration':
        return this.generateClassDeclaration(node as ClassDeclaration);
      case 'SwitchStatement':
        return this.generateSwitchStatement(node as SwitchStatement);
      case 'BreakStatement':
        return this.indent('break;');
      case 'ContinueStatement':
        return this.indent('continue;');
      default:
        throw new Error(`Unknown statement type: ${node.type}`);
    }
  }

  private generateVariableDeclaration(node: VariableDeclaration): string {
    const kind = node.kind === 'СОБИТ' ? 'const' : 'let';
    const pattern = this.generatePattern(node.identifier);
    const init = node.init ? ` = ${this.generateExpression(node.init)}` : '';

    return this.indent(`${kind} ${pattern}${init};`);
  }

  private generateFunctionDeclaration(node: FunctionDeclaration): string {
    const async = (node as FunctionDeclaration & { async?: boolean }).async ? 'async ' : '';
    const name = this.generateIdentifier(node.name);

    // Handle new Parameter type or legacy Identifier type
    const params = node.params
      .map(param => {
        if (param.type === 'Parameter') {
          const p = param as Parameter;
          return this.generateIdentifier(p.name);
        } else {
          // Legacy Identifier type
          return this.generateIdentifier((param as Parameter).name);
        }
      })
      .join(', ');

    const body = this.generateBlockStatement(node.body);

    return this.indent(`${async}function ${name}(${params}) ${body}`);
  }

  private generateBlockStatement(node: BlockStatement): string {
    if (node.body.length === 0) {
      return '{}';
    }

    this.indentLevel++;
    const statements = node.body
      .map(stmt => this.generateStatement(stmt))
      .filter(stmt => stmt.length > 0);
    this.indentLevel--;

    return `{\n${statements.join('\n')}\n${this.getIndent()}}`;
  }

  private generateReturnStatement(node: ReturnStatement): string {
    const argument = node.argument ? ` ${this.generateExpression(node.argument)}` : '';
    return this.indent(`return${argument};`);
  }

  private generateIfStatement(node: IfStatement): string {
    const test = this.generateExpression(node.test);
    const consequent = this.generateStatement(node.consequent);

    let result = this.indent(`if (${test}) `);

    if (node.consequent.type === 'BlockStatement') {
      result += consequent.replace(this.getIndent(), '');
    } else {
      result += `{\n${consequent}\n${this.getIndent()}}`;
    }

    if (node.alternate) {
      result += ' else ';
      if (node.alternate.type === 'BlockStatement') {
        result += this.generateStatement(node.alternate).replace(this.getIndent(), '');
      } else if (node.alternate.type === 'IfStatement') {
        result += this.generateStatement(node.alternate).replace(this.getIndent(), '');
      } else {
        result += `{\n${this.generateStatement(node.alternate)}\n${this.getIndent()}}`;
      }
    }

    return result;
  }

  private generateWhileStatement(node: WhileStatement): string {
    const test = this.generateExpression(node.test);
    const body = this.generateStatement(node.body);

    let result = this.indent(`while (${test}) `);

    if (node.body.type === 'BlockStatement') {
      result += body.replace(this.getIndent(), '');
    } else {
      result += `{\n${body}\n${this.getIndent()}}`;
    }

    return result;
  }

  private generateExpressionStatement(node: ExpressionStatement): string {
    return this.indent(`${this.generateExpression(node.expression)};`);
  }

  private generateExpression(node: Expression): string {
    switch (node.type) {
      case 'Identifier':
        return this.generateIdentifier(node as Identifier);
      case 'Literal':
        return this.generateLiteral(node as Literal);
      case 'BinaryExpression':
        return this.generateBinaryExpression(node as BinaryExpression);
      case 'UnaryExpression':
        return this.generateUnaryExpression(node as UnaryExpression);
      case 'CallExpression':
        return this.generateCallExpression(node as CallExpression);
      case 'AssignmentExpression':
        return this.generateAssignmentExpression(node as AssignmentExpression);
      case 'MemberExpression':
        return this.generateMemberExpression(node as MemberExpression);
      case 'ArrayExpression':
        return this.generateArrayExpression(node as ArrayExpression);
      case 'ObjectExpression':
        return this.generateObjectExpression(node as ObjectExpression);
      case 'AwaitExpression':
        return this.generateAwaitExpression(node as AwaitExpression);
      case 'NewExpression':
        return this.generateNewExpression(node as NewExpression);
      case 'ThisExpression':
        return 'this';
      case 'Super':
        return 'super';
      case 'SpreadElement':
        return this.generateSpreadElement(node as SpreadElement);
      default:
        throw new Error(`Unknown expression type: ${node.type}`);
    }
  }

  private generateImportDeclaration(node: ImportDeclaration): string {
    const specifiers = node.specifiers;
    const source = this.generateLiteral(node.source);
    const results: string[] = [];

    // Handle default imports
    const defaultImports = specifiers.filter(s => s.type === 'ImportDefaultSpecifier');
    if (defaultImports.length > 0) {
      const localName = defaultImports[0].local.name;
      results.push(this.indent(`const ${localName} = require(${source});`));
    }

    // Handle named imports
    const namedImports = specifiers.filter(s => s.type === 'ImportSpecifier') as ImportSpecifier[];
    if (namedImports.length > 0) {
      const destructuring = namedImports
        .map(spec => {
          const imported = spec.imported.name;
          const local = spec.local.name;
          return imported === local ? imported : `${imported}: ${local}`;
        })
        .join(', ');
      results.push(this.indent(`const { ${destructuring} } = require(${source});`));
    }

    return results.join('\n');
  }

  private generateExportDeclaration(node: ExportDeclaration): string {
    if (node.declaration) {
      const declaration = this.generateStatement(node.declaration);

      // Extract the name from the declaration for CommonJS export
      let exportName = '';
      if (node.declaration.type === 'FunctionDeclaration') {
        const funcDecl = node.declaration as FunctionDeclaration;
        exportName = funcDecl.name.name;
      } else if (node.declaration.type === 'VariableDeclaration') {
        const varDecl = node.declaration as VariableDeclaration;
        exportName = (varDecl.identifier as Identifier).name;
      } else if (node.declaration.type === 'ClassDeclaration') {
        const classDecl = node.declaration as ClassDeclaration;
        exportName = classDecl.name.name;
      }

      // Generate CommonJS export
      const commonjsExport = node.default
        ? `module.exports = ${exportName};`
        : `module.exports.${exportName} = ${exportName};`;

      return declaration + '\n' + this.indent(commonjsExport);
    }

    return '';
  }

  private generateIdentifier(node: Identifier): string {
    // Only map specific built-in identifiers, not general variable names
    // This prevents variable names like 'рӯйхат' from being mapped to 'Array'

    // Map built-in literals
    if (node.name === 'беқимат') {
      return 'undefined';
    }

    // Special case: don't map 'хато' when it's used as Error constructor
    if (node.name === 'хато') {
      // This is a bit of a hack - we need context to know if it's console.error or Error
      // For now, we'll assume standalone 'хато' means Error, and 'чоп.хато' means console.error
      return 'Error';
    }

    // Don't map variable names that could conflict with JS built-ins
    // Only map in specific contexts (handled in generateMemberExpression)
    return node.name;
  }

  private generateLiteral(node: Literal): string {
    if (typeof node.value === 'string') {
      // Properly escape string literals
      const escaped = node.value
        .replace(/\\/g, '\\\\') // Escape backslashes first
        .replace(/"/g, '\\"') // Escape quotes
        .replace(/\n/g, '\\n') // Escape newlines
        .replace(/\t/g, '\\t') // Escape tabs
        .replace(/\r/g, '\\r'); // Escape carriage returns
      return `"${escaped}"`;
    }
    if (node.value === null) {
      return 'null';
    }
    return String(node.value);
  }

  private generateBinaryExpression(node: BinaryExpression): string {
    const left = this.generateExpression(node.left);
    const right = this.generateExpression(node.right);

    // Handle operator precedence with parentheses when needed
    const needsParens = this.needsParentheses(node);
    const expr = `${left} ${node.operator} ${right}`;

    return needsParens ? `(${expr})` : expr;
  }

  private generateUnaryExpression(node: UnaryExpression): string {
    const argument = this.generateExpression(node.argument);
    return `${node.operator}${argument}`;
  }

  private generateCallExpression(node: CallExpression): string {
    let callee = this.generateExpression(node.callee);

    // Special handling for нишондиҳӣ function
    if (callee === 'нишондиҳӣ') {
      callee = 'console.log';
    }

    const args = node.arguments.map(arg => this.generateExpression(arg)).join(', ');
    return `${callee}(${args})`;
  }

  private generateAssignmentExpression(node: AssignmentExpression): string {
    const left = this.generateExpression(node.left);
    const right = this.generateExpression(node.right);
    return `${left} ${node.operator} ${right}`;
  }

  private generateMemberExpression(node: MemberExpression): string {
    let object = this.generateExpression(node.object);
    let property = this.generateExpression(node.property);

    // Apply built-in mappings for object names only for specific built-ins
    let objectMapped = false;
    if (node.object.type === 'Identifier') {
      const objectName = (node.object as Identifier).name;
      // Only map specific built-in objects, not user variables
      const builtinObjects = ['чоп', 'математика', 'рӯйхат'];
      if (builtinObjects.includes(objectName)) {
        const mappedObject = this.builtinMappings.get(objectName);
        if (mappedObject) {
          object = mappedObject;
          objectMapped = true;
        }
      }
    }

    // Apply built-in mappings for property names if the object was mapped OR for common array/string methods
    if (!node.computed && node.property.type === 'Identifier') {
      const propertyName = (node.property as Identifier).name;
      const mappedProperty = this.builtinMappings.get(propertyName);

      // Always map common array and string methods
      const commonMethods = [
        'пуш',
        'илова',
        'баровардан',
        'дарозӣ',
        'харита',
        'филтр',
        'кофтан',
        'пайвастан',
        'ҷойивазкунӣ',
        'ҷудокунӣ',
      ];

      if (mappedProperty && (objectMapped || commonMethods.includes(propertyName))) {
        property = mappedProperty;
      }
    }

    // Special case: чоп.хато should become console.error
    if (object === 'console' && property === 'Error') {
      property = 'error';
    }

    if (node.computed) {
      return `${object}[${property}]`;
    } else {
      return `${object}.${property}`;
    }
  }

  private generateArrayExpression(node: ArrayExpression): string {
    const elements = node.elements.map(element => this.generateExpression(element));
    return `[${elements.join(', ')}]`;
  }

  private generateObjectExpression(node: any): string {
    const properties = node.properties
      .map((prop: any) => {
        const key = prop.computed
          ? `[${this.generateExpression(prop.key)}]`
          : this.generateExpression(prop.key);
        const value = this.generateExpression(prop.value);
        return `${key}: ${value}`;
      })
      .join(', ');

    return `{${properties}}`;
  }

  private generateTryStatement(node: TryStatement): string {
    let result =
      this.indent('try ') + this.generateBlockStatement(node.block).replace(this.getIndent(), '');

    if (node.handler) {
      result += ' catch ';
      if (node.handler.param) {
        result += `(${this.generateIdentifier(node.handler.param)}) `;
      } else {
        result += '(error) ';
      }
      result += this.generateBlockStatement(node.handler.body).replace(this.getIndent(), '');
    }

    if (node.finalizer) {
      result += ' finally ';
      result += this.generateBlockStatement(node.finalizer).replace(this.getIndent(), '');
    }

    return result;
  }

  private generateThrowStatement(node: ThrowStatement): string {
    const argument = this.generateExpression(node.argument);
    return this.indent(`throw ${argument};`);
  }

  private generateAwaitExpression(node: AwaitExpression): string {
    const argument = this.generateExpression(node.argument);
    return `await ${argument}`;
  }

  private generateNewExpression(node: NewExpression): string {
    const callee = this.generateExpression(node.callee);
    const args = node.arguments
      ? node.arguments.map((arg: Expression) => this.generateExpression(arg)).join(', ')
      : '';
    return `new ${callee}(${args})`;
  }

  private generateInterfaceDeclaration(node: InterfaceDeclaration): string {
    // Interfaces are TypeScript-only constructs, so we generate a comment in JavaScript
    const name = this.generateIdentifier(node.name);

    return this.indent(`// Interface: ${name}`);
  }

  private generateTypeAlias(node: TypeAlias): string {
    // Type aliases are TypeScript-only constructs, so we generate a comment in JavaScript
    const name = this.generateIdentifier(node.name);
    return this.indent(`// Type alias: ${name}`);
  }

  private generateClassDeclaration(node: ClassDeclaration): string {
    const className = this.generateIdentifier(node.name);
    const extendsClause = node.superClass
      ? ` extends ${this.generateIdentifier(node.superClass)}`
      : '';
    const abstractModifier = (node as ClassDeclaration & { abstract?: boolean }).abstract
      ? 'abstract '
      : '';

    let classBody = '';

    // Generate class members
    if (node.body && node.body.body) {
      const members = node.body.body
        .map(member => {
          switch (member.type) {
            case 'MethodDefinition':
              return this.generateMethodDefinition(member as MethodDefinition);
            case 'PropertyDefinition':
              return this.generatePropertyDefinition(member as PropertyDefinition);
            default:
              return '';
          }
        })
        .filter((member: string) => member.length > 0);

      if (members.length > 0) {
        this.indentLevel++;
        classBody = '\n' + members.join('\n') + '\n' + this.getIndent();
        this.indentLevel--;
      }
    }

    return this.indent(`${abstractModifier}class ${className}${extendsClause} {${classBody}}`);
  }

  private generateMethodDefinition(node: MethodDefinition): string {
    const methodName =
      node.kind === 'constructor' ? 'constructor' : this.generateIdentifier(node.key);
    const isStatic = node.static ? 'static ' : '';
    const isAbstract = (node as MethodDefinition & { abstract?: boolean }).abstract
      ? 'abstract '
      : '';

    // Generate parameters
    const params = node.value.params
      ? node.value.params.map(param => this.generateIdentifier(param.name)).join(', ')
      : '';

    // Generate method body or abstract signature
    if ((node as MethodDefinition & { abstract?: boolean }).abstract) {
      // Abstract methods have no body
      return this.indent(`${isAbstract}${isStatic}${methodName}(${params});`);
    } else {
      // Regular methods have a body
      const body = this.generateBlockStatement(node.value.body);
      return this.indent(`${isStatic}${methodName}(${params}) ${body}`);
    }
  }

  private generatePropertyDefinition(node: PropertyDefinition): string {
    const propertyName = this.generateIdentifier(node.key);
    const isStatic = node.static ? 'static ' : '';
    const initializer = node.value ? ` = ${this.generateExpression(node.value)}` : '';

    return this.indent(`${isStatic}${propertyName}${initializer};`);
  }

  private needsParentheses(node: BinaryExpression): boolean {
    // Simple precedence check - in a full implementation, this would be more sophisticated
    // For now, always return false to avoid complexity
    node; // Use the parameter to avoid unused warning

    // For now, we'll be conservative and add parentheses for nested binary expressions
    return node.left.type === 'BinaryExpression' || node.right.type === 'BinaryExpression';
  }

  private generateSwitchStatement(node: any): string {
    const discriminant = this.generateExpression(node.discriminant);

    this.indentLevel++;
    const cases = node.cases
      .map((switchCase: any) => {
        if (switchCase.test === null) {
          // Default case
          const consequent = switchCase.consequent
            .map((stmt: any) => this.generateStatement(stmt))
            .join('\n');
          return this.indent(`default:\n${consequent}`);
        } else {
          // Regular case
          const test = this.generateExpression(switchCase.test);
          const consequent = switchCase.consequent
            .map((stmt: any) => this.generateStatement(stmt))
            .join('\n');
          return this.indent(`case ${test}:\n${consequent}`);
        }
      })
      .join('\n');
    this.indentLevel--;

    return this.indent(`switch (${discriminant}) {\n${cases}\n${this.getIndent()}}`);
  }

  // Pattern generation methods
  private generatePattern(node: any): string {
    switch (node.type) {
      case 'Identifier':
        return this.generateIdentifier(node);
      case 'ArrayPattern':
        return this.generateArrayPattern(node);
      case 'ObjectPattern':
        return this.generateObjectPattern(node);
      default:
        throw new Error(`Unknown pattern type: ${node.type}`);
    }
  }

  private generateArrayPattern(node: any): string {
    const elements = node.elements
      .map((element: any) => {
        if (element === null) {
          return ''; // Hole in array pattern
        } else if (element.type === 'SpreadElement') {
          return this.generateSpreadElement(element);
        } else {
          return this.generatePattern(element);
        }
      })
      .join(', ');

    return `[${elements}]`;
  }

  private generateObjectPattern(node: any): string {
    const properties = node.properties
      .map((prop: any) => {
        if (prop.type === 'SpreadElement') {
          return this.generateSpreadElement(prop);
        } else {
          return this.generatePropertyPattern(prop);
        }
      })
      .join(', ');

    return `{${properties}}`;
  }

  private generatePropertyPattern(node: any): string {
    const key = node.computed
      ? `[${this.generateExpression(node.key)}]`
      : this.generateIdentifier(node.key);

    if (
      node.key.type === 'Identifier' &&
      node.value.type === 'Identifier' &&
      node.key.name === node.value.name
    ) {
      // Shorthand property
      return key;
    } else {
      const value = this.generatePattern(node.value);
      return `${key}: ${value}`;
    }
  }

  private generateSpreadElement(node: any): string {
    const argument = this.generateExpression(node.argument);
    return `...${argument}`;
  }

  private indent(text: string): string {
    return this.getIndent() + text;
  }

  private getIndent(): string {
    return ' '.repeat(this.indentLevel * this.indentSize);
  }
}

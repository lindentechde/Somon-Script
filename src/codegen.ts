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
  MemberExpression
} from './types';

export class CodeGenerator {
  private indentLevel: number = 0;
  private readonly indentSize: number = 2;

  generate(ast: Program): string {
    return this.generateProgram(ast);
  }

  private generateProgram(node: Program): string {
    const statements = node.body
      .map(stmt => this.generateStatement(stmt))
      .filter(stmt => stmt.length > 0);
    
    return statements.join('\n');
  }

  private generateStatement(node: Statement): string {
    switch (node.type) {
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
      default:
        throw new Error(`Unknown statement type: ${node.type}`);
    }
  }

  private generateVariableDeclaration(node: VariableDeclaration): string {
    const kind = node.kind === 'СОБИТ' ? 'const' : 'let';
    const name = this.generateIdentifier(node.identifier);
    const init = node.init ? ` = ${this.generateExpression(node.init)}` : '';
    
    return this.indent(`${kind} ${name}${init};`);
  }

  private generateFunctionDeclaration(node: FunctionDeclaration): string {
    const name = this.generateIdentifier(node.name);
    const params = node.params.map(param => this.generateIdentifier(param)).join(', ');
    const body = this.generateBlockStatement(node.body);
    
    return this.indent(`function ${name}(${params}) ${body}`);
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
      default:
        throw new Error(`Unknown expression type: ${node.type}`);
    }
  }

  private generateIdentifier(node: Identifier): string {
    return node.name;
  }

  private generateLiteral(node: Literal): string {
    if (typeof node.value === 'string') {
      return `"${node.value.replace(/"/g, '\\"')}"`;
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
    const callee = this.generateExpression(node.callee);
    const args = node.arguments.map(arg => this.generateExpression(arg)).join(', ');
    return `${callee}(${args})`;
  }

  private generateAssignmentExpression(node: AssignmentExpression): string {
    const left = this.generateExpression(node.left);
    const right = this.generateExpression(node.right);
    return `${left} ${node.operator} ${right}`;
  }

  private generateMemberExpression(node: MemberExpression): string {
    const object = this.generateExpression(node.object);
    const property = this.generateExpression(node.property);
    
    if (node.computed) {
      return `${object}[${property}]`;
    } else {
      return `${object}.${property}`;
    }
  }

  private needsParentheses(node: BinaryExpression): boolean {
    // Simple precedence check - in a full implementation, this would be more sophisticated
    const precedence: { [key: string]: number } = {
      '||': 1,
      '&&': 2,
      '==': 3, '!=': 3,
      '<': 4, '>': 4, '<=': 4, '>=': 4,
      '+': 5, '-': 5,
      '*': 6, '/': 6, '%': 6
    };

    // For now, we'll be conservative and add parentheses for nested binary expressions
    return node.left.type === 'BinaryExpression' || node.right.type === 'BinaryExpression';
  }

  private indent(text: string): string {
    return this.getIndent() + text;
  }

  private getIndent(): string {
    return ' '.repeat(this.indentLevel * this.indentSize);
  }
}
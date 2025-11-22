import {
  Program,
  Statement,
  Expression,
  VariableDeclaration,
  FunctionDeclaration,
  FunctionExpression,
  BlockStatement,
  ReturnStatement,
  IfStatement,
  WhileStatement,
  ForStatement,
  ForInStatement,
  ForOfStatement,
  ExpressionStatement,
  Identifier,
  Literal,
  BinaryExpression,
  UnaryExpression,
  UpdateExpression,
  CallExpression,
  ArrowFunctionExpression,
  AssignmentExpression,
  MemberExpression,
  ImportDeclaration,
  ImportSpecifier,
  ImportNamespaceSpecifier,
  ExportDeclaration,
  ArrayExpression,
  ObjectExpression,
  InterfaceDeclaration,
  TypeAlias,
  NamespaceDeclaration,
  Parameter,
  TryStatement,
  ThrowStatement,
  AwaitExpression,
  NewExpression,
  ImportExpression,
  ClassDeclaration,
  MethodDefinition,
  PropertyDefinition,
  SwitchStatement,
  SpreadElement,
  Property,
  SwitchCase,
  ArrayPattern,
  ObjectPattern,
  PropertyPattern,
  TemplateLiteral,
} from './types';

export class CodeGenerator {
  private indentLevel: number = 0;
  private readonly indentSize: number = 2;
  private importCounter: number = 0;

  // Mapping of Tajik built-in functions to JavaScript equivalents
  private readonly builtinMappings: Map<string, string> = new Map([
    // Console functions
    ['чоп', 'console'],
    ['сабт', 'log'],
    ['хато', 'error'],
    ['огоҳӣ', 'warn'],
    ['маълумот', 'info'],
    ['исфти', 'debug'],
    ['ҷадвал', 'table'],
    ['гуруҳ', 'group'],
    ['гуруҳОхир', 'groupEnd'],
    ['гуруҳПӯшида', 'groupCollapsed'],
    ['вақт', 'time'],
    ['вақтОхир', 'timeEnd'],
    ['вақтСабт', 'timeLog'],
    ['қайд', 'count'],
    ['қайдАсл', 'countReset'],
    ['тасдиқ', 'assert'],
    ['полиз', 'clear'],
    ['феҳрист', 'dir'],
    ['xmlФеҳрист', 'dirxml'],
    ['пайҷо', 'trace'],

    // Error handling
    ['Хато', 'Error'],

    // Array methods
    ['рӯйхат', 'Array'],
    ['дарозӣ', 'length'],
    ['дар', 'at'],
    ['пайвастан', 'concat'],
    ['нусхаДарДохил', 'copyWithin'],
    ['воридот', 'entries'],
    ['ҳама', 'every'],
    ['пурКардан', 'fill'],
    ['филтр', 'filter'],
    ['кофтан', 'find'],
    ['индексиЁфтан', 'findIndex'],
    ['охиринЁфтан', 'findLast'],
    ['индексиОхиринЁфтан', 'findLastIndex'],
    ['ҳамвор', 'flat'],
    ['ҳамворХарита', 'flatMap'],
    ['бароиҲар', 'forEach'],
    ['аз', 'from'],
    ['дорад', 'includes'],
    ['индекси', 'indexOf'],
    ['рӯйхатАст', 'isArray'],
    ['пайвастКардан', 'join'],
    ['калидҳо', 'keys'],
    ['индексиОхирин', 'lastIndexOf'],
    ['харита', 'map'],
    ['азАргументҳо', 'of'],
    ['баровардан', 'pop'],
    ['илова', 'push'],
    ['пуш', 'push'],
    ['ҷамъбаст', 'reduce'],
    ['ҷамъбастАзРост', 'reduceRight'],
    ['баргардон', 'reverse'],
    ['ҳазфиАввал', 'shift'],
    ['буридан', 'slice'],
    ['баъзе', 'some'],
    ['тартиб', 'sort'],
    ['пайваст', 'splice'],
    ['баСатриМаҳаллӣ', 'toLocaleString'],
    ['баБаргардон', 'toReversed'],
    ['баТартиб', 'toSorted'],
    ['баПайваст', 'toSpliced'],
    ['баСатр', 'toString'],
    ['иловаБаАввал', 'unshift'],
    ['қиматҳо', 'values'],
    ['бо', 'with'],

    // String methods
    ['сатр', 'String'], // String type/constructor
    ['сатрМетодҳо', 'String'], // String methods object
    ['дарозииСатр', 'length'],
    ['дар', 'at'],
    ['аломатДар', 'charAt'],
    ['кодиАломатДар', 'charCodeAt'],
    ['нуқтаиКодДар', 'codePointAt'],
    ['пайвастан', 'concat'],
    ['анҷомБо', 'endsWith'],
    ['азКодиАломат', 'fromCharCode'],
    ['азНуқтаиКод', 'fromCodePoint'],
    ['дорад', 'includes'],
    ['индекси', 'indexOf'],
    ['индексиОхирин', 'lastIndexOf'],
    ['муқоисаиМаҳаллӣ', 'localeCompare'],
    ['мувофиқат', 'match'],
    ['мувофиқатҲама', 'matchAll'],
    ['муқаррарӣ', 'normalize'],
    ['пурКарданОхир', 'padEnd'],
    ['пурКарданАввал', 'padStart'],
    ['хоми', 'raw'],
    ['такрор', 'repeat'],
    ['ҷойивазкунӣ', 'replace'],
    ['ҷойгузин', 'replace'],
    ['ҷойивазкунӣҲама', 'replaceAll'],
    ['ҷустуҷӯ', 'search'],
    ['буридан', 'slice'],
    ['ҷудокунӣ', 'split'],
    ['оғозБо', 'startsWith'],
    ['қисмат', 'substring'],
    ['хурдМаҳаллӣ', 'toLocaleLowerCase'],
    ['калонМаҳаллӣ', 'toLocaleUpperCase'],
    ['хурд', 'toLowerCase'],
    ['баСатр', 'toString'],
    ['калон', 'toUpperCase'],
    ['тозаКардан', 'trim'],
    ['тозаКарданОхир', 'trimEnd'],
    ['тозаКарданАввал', 'trimStart'],
    ['қиматиАслӣ', 'valueOf'],

    // Object methods
    ['объект', 'Object'],
    ['таъин', 'assign'],
    ['сохтан', 'create'],
    ['муайянХосиятҳо', 'defineProperties'],
    ['муайянХосият', 'defineProperty'],
    ['воридот', 'entries'],
    ['яхКардан', 'freeze'],
    ['азВоридот', 'fromEntries'],
    ['тавсифиХосият', 'getOwnPropertyDescriptor'],
    ['тавсифиХосиятҳо', 'getOwnPropertyDescriptors'],
    ['номҳоиХосият', 'getOwnPropertyNames'],
    ['рамзҳоиХосият', 'getOwnPropertySymbols'],
    ['прототип', 'getPrototypeOf'],
    ['гурӯҳбандӣ', 'groupBy'],
    ['дорадХосият', 'hasOwn'],
    ['аст', 'is'],
    ['васеъшаванда', 'isExtensible'],
    ['яхшуда', 'isFrozen'],
    ['мӯҳршуда', 'isSealed'],
    ['калидҳо', 'keys'],
    ['манъиВасеъшавӣ', 'preventExtensions'],
    ['мӯҳр', 'seal'],
    ['танзимиПрототип', 'setPrototypeOf'],
    ['қиматҳо', 'values'],

    // Math
    ['математика', 'Math'],
    ['Риёзӣ', 'Math'],
    ['Е', 'E'],
    ['ЛН10', 'LN10'],
    ['ЛН2', 'LN2'],
    ['ЛОГ10Е', 'LOG10E'],
    ['ЛОГ2Е', 'LOG2E'],
    ['ПИ', 'PI'],
    ['РЕША1_2', 'SQRT1_2'],
    ['РЕША2', 'SQRT2'],
    ['мутлақ', 'abs'],
    ['арккосинус', 'acos'],
    ['арккосинусГиперболӣ', 'acosh'],
    ['арксинус', 'asin'],
    ['арксинусГиперболӣ', 'asinh'],
    ['арктангенс', 'atan'],
    ['арктангенс2', 'atan2'],
    ['арктангенсГиперболӣ', 'atanh'],
    ['решаиКубӣ', 'cbrt'],
    ['боло', 'ceil'],
    ['clz32', 'clz32'],
    ['косинус', 'cos'],
    ['косинусГиперболӣ', 'cosh'],
    ['экспонента', 'exp'],
    ['expm1', 'expm1'],
    ['поён', 'floor'],
    ['fround', 'fround'],
    ['гипотенуза', 'hypot'],
    ['imul', 'imul'],
    ['логарифм', 'log'],
    ['логарифм10', 'log10'],
    ['логарифм1п', 'log1p'],
    ['логарифм2', 'log2'],
    ['ҳаддиАксар', 'max'],
    ['ҳаддиАқал', 'min'],
    ['қувват', 'pow'],
    ['тасодуфӣ', 'random'],
    ['дузкунӣ', 'round'],
    ['аломат', 'sign'],
    ['синус', 'sin'],
    ['синусГиперболӣ', 'sinh'],
    ['дуръшака', 'sqrt'],
    ['тангенс', 'tan'],
    ['тангенсГиперболӣ', 'tanh'],
    ['бириданАдад', 'trunc'],

    // Control flow
    ['шикастан', 'break'],
    ['давом', 'continue'],
    ['кӯшиш', 'try'],

    // Async/Promise
    ['ваъда', 'Promise'],
    ['Ваъда', 'Promise'],
    ['гирифтан', 'catch'],
    ['ниҳоят', 'finally'],
    ['партофтан', 'throw'],

    // Async
    ['ҳамзамон', 'async'],
    ['интизор', 'await'],
    ['ваъда', 'Promise'],

    // Note: 'хато' is handled specially in generateIdentifier
  ]);

  // Operator precedence table (higher number = higher precedence = evaluated first)
  // Based on JavaScript operator precedence: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Operator_precedence
  private readonly operatorPrecedence: Map<string, number> = new Map([
    // Comma (lowest precedence)
    [',', 1],

    // Assignment operators
    ['=', 2],
    ['+=', 2],
    ['-=', 2],
    ['*=', 2],
    ['/=', 2],
    ['%=', 2],
    ['**=', 2],
    ['<<=', 2],
    ['>>=', 2],
    ['>>>=', 2],
    ['&=', 2],
    ['^=', 2],
    ['|=', 2],
    ['&&=', 2],
    ['||=', 2],
    ['??=', 2],

    // Conditional (ternary)
    ['?', 3],

    // Nullish coalescing
    ['??', 4],

    // Logical OR
    ['||', 5],

    // Logical AND
    ['&&', 6],

    // Bitwise OR
    ['|', 7],

    // Bitwise XOR
    ['^', 8],

    // Bitwise AND
    ['&', 9],

    // Equality operators
    ['==', 10],
    ['!=', 10],
    ['===', 10],
    ['!==', 10],

    // Relational operators
    ['<', 11],
    ['<=', 11],
    ['>', 11],
    ['>=', 11],
    ['in', 11],
    ['instanceof', 11],

    // Bitwise shift
    ['<<', 12],
    ['>>', 12],
    ['>>>', 12],

    // Additive
    ['+', 13],
    ['-', 13],

    // Multiplicative
    ['*', 14],
    ['/', 14],
    ['%', 14],

    // Exponentiation (right-associative, highest precedence for binary operators)
    ['**', 15],
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
      case 'ForStatement':
        return this.generateForStatement(node as ForStatement);
      case 'ForInStatement':
        return this.generateForInStatement(node as ForInStatement);
      case 'ForOfStatement':
        return this.generateForOfStatement(node as ForOfStatement);
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
      case 'NamespaceDeclaration':
        return this.generateNamespaceDeclaration(node as NamespaceDeclaration);
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

  private generateForStatement(node: ForStatement): string {
    const init = node.init ? this.generateStatement(node.init).trim().replace(/;$/, '') : '';
    const test = node.test ? this.generateExpression(node.test) : '';
    const update = node.update ? this.generateExpression(node.update) : '';
    const body = this.generateStatement(node.body);

    let result = this.indent(`for (${init}; ${test}; ${update}) `);

    if (node.body.type === 'BlockStatement') {
      result += body.replace(this.getIndent(), '');
    } else {
      result += `{\n${body}\n${this.getIndent()}}`;
    }

    return result;
  }

  private generateForInStatement(node: ForInStatement): string {
    const left = this.generateStatement(node.left).trim().replace(/;$/, '');
    const right = this.generateExpression(node.right);
    const body = this.generateStatement(node.body);

    let result = this.indent(`for (${left} in ${right}) `);

    if (node.body.type === 'BlockStatement') {
      result += body.replace(this.getIndent(), '');
    } else {
      result += `{\n${body}\n${this.getIndent()}}`;
    }

    return result;
  }

  private generateForOfStatement(node: ForOfStatement): string {
    const left = this.generateStatement(node.left).trim().replace(/;$/, '');
    const right = this.generateExpression(node.right);
    const body = this.generateStatement(node.body);

    let result = this.indent(`for (${left} of ${right}) `);

    if (node.body.type === 'BlockStatement') {
      result += body.replace(this.getIndent(), '');
    } else {
      result += `{\n${body}\n${this.getIndent()}}`;
    }

    return result;
  }

  private generateExpressionStatement(node: ExpressionStatement): string {
    const expr = node.expression;

    // Special handling: Skip orphaned method signatures that should not generate executable code
    // This happens when interface method signatures escape the interface context due to parsing issues
    if (expr.type === 'CallExpression') {
      const callExpr = expr as CallExpression;

      // Check if this looks like an orphaned method signature (function call with single parameter
      // that looks like it should be a type parameter)
      if (
        callExpr.callee.type === 'Identifier' &&
        callExpr.arguments.length === 1 &&
        callExpr.arguments[0].type === 'Identifier'
      ) {
        const calleeName = (callExpr.callee as Identifier).name;
        const argName = (callExpr.arguments[0] as Identifier).name;

        // Skip if this looks like a method signature pattern
        // Common patterns: танзим_кардан(нави_қимат), ғайр_танзим(параметр), etc.
        if (
          calleeName.includes('_') ||
          argName.includes('_') ||
          calleeName.length > 8 ||
          argName.length > 8
        ) {
          return ''; // Skip generating this statement
        }
      }
    }

    return this.indent(`${this.generateExpression(node.expression)};`);
  }

  // eslint-disable-next-line complexity
  private generateExpression(node: Expression): string {
    // Handle null or undefined node
    if (!node) {
      return '';
    }

    // Use a more direct delegation approach
    const simpleExpressions = [
      'Identifier',
      'Literal',
      'TemplateLiteral',
      'ThisExpression',
      'Super',
    ];
    if (simpleExpressions.includes(node.type)) {
      return this.generateSimpleExpression(node);
    }

    const operatorExpressions = ['BinaryExpression', 'UnaryExpression', 'UpdateExpression'];
    if (operatorExpressions.includes(node.type)) {
      return this.generateOperatorExpression(node);
    }

    const callExpressions = ['CallExpression', 'AssignmentExpression', 'MemberExpression'];
    if (callExpressions.includes(node.type)) {
      return this.generateCallAssignmentExpression(node);
    }

    const structuralExpressions = ['ArrayExpression', 'ObjectExpression', 'SpreadElement'];
    if (structuralExpressions.includes(node.type)) {
      return this.generateStructuralExpression(node);
    }

    const specialExpressions = [
      'AwaitExpression',
      'NewExpression',
      'ImportExpression',
      'ArrowFunctionExpression',
      'FunctionExpression',
    ];
    if (specialExpressions.includes(node.type)) {
      return this.generateSpecialExpression(node);
    }

    return this.handleUnknownExpression(node);
  }

  private generateSimpleExpression(node: Expression): string {
    switch (node.type) {
      case 'Identifier':
        return this.generateIdentifier(node as Identifier);
      case 'Literal':
        return this.generateLiteral(node as Literal);
      case 'TemplateLiteral':
        return this.generateTemplateLiteral(node as TemplateLiteral);
      case 'ThisExpression':
        return 'this';
      case 'Super':
        return 'super';
      default:
        return this.handleUnknownExpression(node);
    }
  }

  private generateOperatorExpression(node: Expression): string {
    switch (node.type) {
      case 'BinaryExpression':
        return this.generateBinaryExpression(node as BinaryExpression);
      case 'UnaryExpression':
        return this.generateUnaryExpression(node as UnaryExpression);
      case 'UpdateExpression':
        return this.generateUpdateExpression(node as UpdateExpression);
      default:
        return this.handleUnknownExpression(node);
    }
  }

  private generateCallAssignmentExpression(node: Expression): string {
    switch (node.type) {
      case 'CallExpression':
        return this.generateCallExpression(node as CallExpression);
      case 'AssignmentExpression':
        return this.generateAssignmentExpression(node as AssignmentExpression);
      case 'MemberExpression':
        return this.generateMemberExpression(node as MemberExpression);
      default:
        return this.handleUnknownExpression(node);
    }
  }

  private generateStructuralExpression(node: Expression): string {
    switch (node.type) {
      case 'ArrayExpression':
        return this.generateArrayExpression(node as ArrayExpression);
      case 'ObjectExpression':
        return this.generateObjectExpression(node as ObjectExpression);
      case 'SpreadElement':
        return this.generateSpreadElement(node as SpreadElement);
      default:
        return this.handleUnknownExpression(node);
    }
  }

  private generateSpecialExpression(node: Expression): string {
    switch (node.type) {
      case 'AwaitExpression':
        return this.generateAwaitExpression(node as AwaitExpression);
      case 'NewExpression':
        return this.generateNewExpression(node as NewExpression);
      case 'ImportExpression':
        return this.generateImportExpression(node as ImportExpression);
      case 'ArrowFunctionExpression':
        return this.generateArrowFunctionExpression(node as ArrowFunctionExpression);
      case 'FunctionExpression':
        return this.generateFunctionExpression(node as FunctionExpression);
      default:
        return this.handleUnknownExpression(node);
    }
  }

  private generateFunctionExpression(node: FunctionExpression): string {
    // Handle new Parameter type or legacy Identifier type
    const params = node.params
      .map(p => {
        if ('name' in p && typeof p.name === 'object' && 'name' in p.name) {
          return p.name.name;
        } else if ('name' in p && typeof p.name === 'string') {
          return p.name;
        }
        return '';
      })
      .join(', ');

    const body = this.generateBlockStatement(node.body);
    return `function(${params}) ${body}`;
  }

  private generateArrowFunctionExpression(node: ArrowFunctionExpression): string {
    const params = node.params.map(p => p.name.name).join(', ');

    if (node.body.type === 'BlockStatement') {
      // Block body
      const body = this.generateBlockStatement(node.body as BlockStatement);
      return `(${params}) => ${body}`;
    } else {
      // Expression body
      const body = this.generateExpression(node.body as Expression);
      return `(${params}) => ${body}`;
    }
  }

  private generateImportExpression(node: ImportExpression): string {
    // Dynamic import: ворид(specifier) -> import(specifier)
    let source = this.generateExpression(node.source);

    // Handle .som extension conversion for dynamic imports
    if (source.includes('.som')) {
      source = source.replaceAll('.som', '.js');
    } else if (source.match(/^["']\.\.?\/[^"']*["']$/) && !source.includes('.js')) {
      // For relative imports without extension, add .js
      source = source.replace(/["']$/, '.js"').replace(/^'/, '"');
    }

    return `import(${source})`;
  }

  private handleUnknownExpression(node: Expression): string {
    throw new Error(`Unknown expression type: ${node.type}`);
  }

  private generateImportDeclaration(node: ImportDeclaration): string {
    const specifiers = node.specifiers;
    let source = this.generateLiteral(node.source);

    // Module resolution: convert .som extensions to .js
    if (source.includes('.som')) {
      source = source.replaceAll('.som"', '.js"').replaceAll(".som'", ".js'");
    } else if (source.match(/^["']\.\.?\/[^"']*["']$/) && !source.includes('.js')) {
      // For relative imports without extension, add .js
      source = source.replace(/["']$/, '.js"').replace(/^'/, '"');
    }

    const results: string[] = [];
    const tmpVar = `__somon_import_${this.importCounter++}`;
    results.push(this.indent(`const ${tmpVar} = require(${source});`));

    // Handle default imports
    const defaultImports = specifiers.filter(s => s.type === 'ImportDefaultSpecifier');
    if (defaultImports.length > 0) {
      const localName = defaultImports[0].local.name;
      results.push(this.indent(`const ${localName} = ${tmpVar}.default ?? ${tmpVar};`));
    }

    const namespaceImport = specifiers.find(s => s.type === 'ImportNamespaceSpecifier') as
      | ImportNamespaceSpecifier
      | undefined;
    if (namespaceImport) {
      results.push(this.indent(`const ${namespaceImport.local.name} = ${tmpVar};`));
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
      results.push(this.indent(`const { ${destructuring} } = ${tmpVar};`));
    }

    return results.join('\n');
  }

  private generateExportDeclaration(node: ExportDeclaration): string {
    if (node.declaration) {
      return this.generateExportWithDeclaration(node);
    }

    if (node.specifiers && node.specifiers.length > 0) {
      return this.generateExportWithSpecifiers(node);
    }

    if (node.source) {
      return this.generateWildcardExport(node);
    }

    return '';
  }

  private generateExportWithDeclaration(node: ExportDeclaration): string {
    const declaration = this.generateStatement(node.declaration!);
    const exportName = this.extractExportName(node.declaration!);

    // Type-only declarations don't generate runtime exports
    if (!exportName) {
      return declaration;
    }

    const commonjsExport = node.default
      ? `module.exports.default = ${exportName};`
      : `module.exports.${exportName} = ${exportName};`;

    return declaration + '\n' + this.indent(commonjsExport);
  }

  private extractExportName(declaration: Statement): string {
    if (declaration.type === 'FunctionDeclaration') {
      return (declaration as FunctionDeclaration).name.name;
    }
    if (declaration.type === 'VariableDeclaration') {
      return ((declaration as VariableDeclaration).identifier as Identifier).name;
    }
    if (declaration.type === 'ClassDeclaration') {
      return (declaration as ClassDeclaration).name.name;
    }
    // Interfaces and TypeAlias don't generate runtime code
    return '';
  }

  private generateExportWithSpecifiers(node: ExportDeclaration): string {
    if (node.source) {
      return this.generateReExportWithSpecifiers(node);
    }
    return this.generateDirectExportSpecifiers(node);
  }

  private generateReExportWithSpecifiers(node: ExportDeclaration): string {
    const source = this.convertSourcePath(this.generateLiteral(node.source!));
    const tmpVar = `__somon_reexport_${this.importCounter++}`;
    const results: string[] = [];

    results.push(this.indent(`const ${tmpVar} = require(${source});`));

    for (const spec of node.specifiers!) {
      const exported = spec.exported.name;
      const local = spec.local.name;
      results.push(this.indent(`module.exports.${exported} = ${tmpVar}.${local};`));
    }

    return results.join('\n');
  }

  private generateDirectExportSpecifiers(node: ExportDeclaration): string {
    return node
      .specifiers!.map(spec => {
        const exported = spec.exported.name;
        const local = spec.local.name;
        return this.indent(`module.exports.${exported} = ${local};`);
      })
      .join('\n');
  }

  private generateWildcardExport(node: ExportDeclaration): string {
    const source = this.convertSourcePath(this.generateLiteral(node.source!));
    const tmpVar = `__somon_reexport_${this.importCounter++}`;
    const results: string[] = [];

    results.push(this.indent(`const ${tmpVar} = require(${source});`));
    results.push(this.indent(`Object.keys(${tmpVar}).forEach(key => {`));
    this.indentLevel++;
    results.push(this.indent(`if (key !== 'default') module.exports[key] = ${tmpVar}[key];`));
    this.indentLevel--;
    results.push(this.indent(`});`));

    return results.join('\n');
  }

  private convertSourcePath(source: string): string {
    if (source.includes('.som')) {
      return source.replaceAll('.som"', '.js"').replaceAll(".som'", ".js'");
    } else if (source.match(/^["']\.\.?\/[^"']*["']$/) && !source.includes('.js')) {
      // For relative imports without extension, add .js
      return source.replace(/["']$/, '.js"').replace(/^'/, '"');
    }
    return source;
  }

  private generateIdentifier(node: Identifier): string {
    // Only map specific built-in identifiers, not general variable names
    // This prevents variable names like 'рӯйхат' from being mapped to 'Array'

    // Map built-in literals
    if (node.name === 'беқимат') {
      return 'undefined';
    }

    // Handle Хато (capitalized) as Error constructor
    if (node.name === 'Хато') {
      return 'Error';
    }

    // Map built-in constructors/objects (when used as identifiers)
    const builtinConstructors = ['сатр', 'рӯйхат', 'объект', 'математика', 'Риёзӣ', 'сатрМетодҳо'];
    if (builtinConstructors.includes(node.name)) {
      const mapped = this.builtinMappings.get(node.name);
      if (mapped) {
        return mapped;
      }
    }

    // Don't map variable names that could conflict with JS built-ins
    // Only map in specific contexts (handled in generateMemberExpression)
    return node.name;
  }

  private generateLiteral(node: Literal): string {
    if (typeof node.value === 'string') {
      // Properly escape string literals
      const escaped = node.value
        .replaceAll('\\', '\\\\') // Escape backslashes first
        .replaceAll('"', '\\"') // Escape quotes
        .replaceAll('\n', '\\n') // Escape newlines
        .replaceAll('\t', '\\t') // Escape tabs
        .replaceAll('\r', '\\r'); // Escape carriage returns
      return `"${escaped}"`;
    }
    if (node.value === null) {
      return 'null';
    }
    return String(node.value);
  }

  private generateTemplateLiteral(node: TemplateLiteral): string {
    let result = '`';

    for (let i = 0; i < node.quasis.length; i++) {
      const quasi = node.quasis[i];

      // Add the text part
      result += quasi.value.raw;

      // Add the expression part if it exists
      if (i < node.expressions.length) {
        result += '${';
        result += this.generateExpression(node.expressions[i]);
        result += '}';
      }
    }

    result += '`';
    return result;
  }

  private generateBinaryExpression(node: BinaryExpression, parentOperator?: string): string {
    // Generate left and right operands, passing parent operator context for proper precedence
    const left =
      node.left.type === 'BinaryExpression'
        ? this.generateBinaryExpression(node.left as BinaryExpression, node.operator)
        : this.generateExpression(node.left);

    const right =
      node.right.type === 'BinaryExpression'
        ? this.generateBinaryExpression(node.right as BinaryExpression, node.operator)
        : this.generateExpression(node.right);

    const expr = `${left} ${node.operator} ${right}`;

    // Add parentheses if this expression has lower precedence than its parent
    if (parentOperator && this.needsParentheses(node.operator, parentOperator)) {
      return `(${expr})`;
    }

    return expr;
  }

  private generateUnaryExpression(node: UnaryExpression): string {
    const argument = this.generateExpression(node.argument);
    return `${node.operator}${argument}`;
  }

  private generateUpdateExpression(node: UpdateExpression): string {
    const argument = this.generateExpression(node.argument);
    if (node.prefix) {
      return `${node.operator}${argument}`;
    } else {
      return `${argument}${node.operator}`;
    }
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

  /**
   * Try to map object name if it's a built-in object
   */
  private mapBuiltinObject(
    node: MemberExpression,
    object: string
  ): { mapped: string; wasMapped: boolean } {
    if (node.object.type !== 'Identifier') {
      return { mapped: object, wasMapped: false };
    }

    const objectName = (node.object as Identifier).name;
    const builtinObjects = ['чоп', 'математика', 'объект', 'Риёзӣ', 'сатр', 'сатрМетодҳо'];

    if (!builtinObjects.includes(objectName)) {
      return { mapped: object, wasMapped: false };
    }

    const mappedObject = this.builtinMappings.get(objectName);
    if (mappedObject) {
      return { mapped: mappedObject, wasMapped: true };
    }

    return { mapped: object, wasMapped: false };
  }

  /**
   * Check if object looks like a user class instance
   */
  private looksLikeClassInstance(node: MemberExpression): boolean {
    return (
      node.object.type === 'Identifier' &&
      /^[а-яё]/.test((node.object as Identifier).name) &&
      (node.object as Identifier).name.includes('_')
    );
  }

  /**
   * Try to map property name based on context
   */
  private mapPropertyName(node: MemberExpression, property: string, objectMapped: boolean): string {
    if (node.computed || node.property.type !== 'Identifier') {
      return property;
    }

    const propertyName = (node.property as Identifier).name;
    const mappedProperty = this.builtinMappings.get(propertyName);
    if (!mappedProperty) {
      return property;
    }

    const commonMethods = [
      // Console methods (basic and camelCase)
      'сабт',
      'хато',
      'огоҳӣ',
      'маълумот',
      'исфти',
      'тасдиқ',
      'ҷадвал',
      'гуруҳ',
      'гуруҳОхир',
      'гуруҳПӯшида',
      'вақт',
      'вақтОхир',
      'вақтСабт',
      'қайд',
      'қайдАсл',
      'полиз',
      'феҳрист',
      'xmlФеҳрист',
      'пайҷо',
      // Array methods
      'дарозӣ',
      'дар',
      'пайвастан',
      'нусхаДарДохил',
      'воридот',
      'ҳама',
      'пурКардан',
      'филтр',
      'кофтан',
      'индексиЁфтан',
      'охиринЁфтан',
      'индексиОхиринЁфтан',
      'ҳамвор',
      'ҳамворХарита',
      'бароиҲар',
      'аз',
      'дорад',
      'индекси',
      'рӯйхатАст',
      'пайвастКардан',
      'калидҳо',
      'индексиОхирин',
      'харита',
      'азАргументҳо',
      'баровардан',
      'илова',
      'пуш',
      'ҷамъбаст',
      'ҷамъбастАзРост',
      'баргардон',
      'ҳазфиАввал',
      'буридан',
      'баъзе',
      'тартиб',
      'пайваст',
      'баСатриМаҳаллӣ',
      'баБаргардон',
      'баТартиб',
      'баПайваст',
      'баСатр',
      'иловаБаАввал',
      'қиматҳо',
      'бо',
      // String methods
      'дарозииСатр',
      'аломатДар',
      'кодиАломатДар',
      'нуқтаиКодДар',
      'анҷомБо',
      'азКодиАломат',
      'азНуқтаиКод',
      'муқоисаиМаҳаллӣ',
      'мувофиқат',
      'мувофиқатҲама',
      'муқаррарӣ',
      'пурКарданОхир',
      'пурКарданАввал',
      'хоми',
      'такрор',
      'ҷойивазкунӣ',
      'ҷойгузин',
      'ҷойивазкунӣҲама',
      'ҷустуҷӯ',
      'ҷудокунӣ',
      'оғозБо',
      'қисмат',
      'хурдМаҳаллӣ',
      'калонМаҳаллӣ',
      'хурд',
      'калон',
      'тозаКардан',
      'тозаКарданОхир',
      'тозаКарданАввал',
      'қиматиАслӣ',
      // Math methods
      'Е',
      'ЛН10',
      'ЛН2',
      'ЛОГ10Е',
      'ЛОГ2Е',
      'ПИ',
      'РЕША1_2',
      'РЕША2',
      'мутлақ',
      'арккосинус',
      'арккосинусГиперболӣ',
      'арксинус',
      'арксинусГиперболӣ',
      'арктангенс',
      'арктангенс2',
      'арктангенсГиперболӣ',
      'решаиКубӣ',
      'боло',
      'clz32',
      'косинус',
      'косинусГиперболӣ',
      'экспонента',
      'expm1',
      'поён',
      'fround',
      'гипотенуза',
      'imul',
      'логарифм',
      'логарифм10',
      'логарифм1п',
      'логарифм2',
      'ҳаддиАксар',
      'ҳаддиАқал',
      'қувват',
      'тасодуфӣ',
      'дузкунӣ',
      'аломат',
      'синус',
      'синусГиперболӣ',
      'дуръшака',
      'тангенс',
      'тангенсГиперболӣ',
      'бириданАдад',
      // Object methods
      'таъин',
      'сохтан',
      'муайянХосиятҳо',
      'муайянХосият',
      'яхКардан',
      'азВоридот',
      'тавсифиХосият',
      'тавсифиХосиятҳо',
      'номҳоиХосият',
      'рамзҳоиХосият',
      'прототип',
      'гурӯҳбандӣ',
      'дорадХосият',
      'аст',
      'васеъшаванда',
      'яхшуда',
      'мӯҳршуда',
      'манъиВасеъшавӣ',
      'мӯҳр',
      'танзимиПрототип',
    ];

    const shouldMap =
      objectMapped || (!this.looksLikeClassInstance(node) && commonMethods.includes(propertyName));
    return shouldMap ? mappedProperty : property;
  }

  private generateMemberExpression(node: MemberExpression): string {
    let object = this.generateExpression(node.object);
    let property = this.generateExpression(node.property);

    const { mapped: mappedObject, wasMapped: objectMapped } = this.mapBuiltinObject(node, object);
    object = mappedObject;

    property = this.mapPropertyName(node, property, objectMapped);

    // Special case: чоп.хато should become console.error
    if (object === 'console' && property === 'Error') {
      property = 'error';
    }

    return node.computed ? `${object}[${property}]` : `${object}.${property}`;
  }

  private generateArrayExpression(node: ArrayExpression): string {
    const elements = node.elements.map(element => this.generateExpression(element));
    return `[${elements.join(', ')}]`;
  }

  private generateObjectExpression(node: ObjectExpression): string {
    const properties = node.properties
      .map((prop: Property) => {
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
        // Don't map catch parameter names - preserve original
        result += `(${node.handler.param.name}) `;
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
    // They should NOT generate any executable code at all
    const name = this.generateIdentifier(node.name);

    return this.indent(`// Interface: ${name}\n`);
  }

  private generateTypeAlias(node: TypeAlias): string {
    // Type aliases are TypeScript-only constructs, so we generate a comment in JavaScript
    const name = this.generateIdentifier(node.name);
    return this.indent(`// Type alias: ${name}\n`);
  }

  private generateNamespaceDeclaration(node: NamespaceDeclaration): string {
    // Generate namespace as an IIFE (Immediately Invoked Function Expression)
    const name = this.generateIdentifier(node.name);
    const exported = node.exported ? 'exports.' : '';

    let result = this.indent(`${exported}${name} = (function() {\n`);
    this.indentLevel++;
    result += this.indent(`const ${name} = {};\n`);

    // Generate namespace body
    if (node.body && node.body.statements) {
      for (const stmt of node.body.statements) {
        const isExported = (stmt as Statement & { exported?: boolean }).exported;

        // Skip interface declarations and type aliases - they don't generate runtime code
        if (stmt.type === 'InterfaceDeclaration' || stmt.type === 'TypeAlias') {
          result += this.generateStatement(stmt);
          continue;
        }

        result += isExported
          ? this.generateExportedNamespaceMember(stmt, name)
          : this.generateStatement(stmt);
      }
    }

    result += this.indent(`return ${name};\n`);
    this.indentLevel--;
    result += this.indent('})();\n');

    return result;
  }

  private generateExportedNamespaceMember(stmt: Statement, namespaceName: string): string {
    const memberName = this.getMemberName(stmt);
    if (!memberName) {
      return '';
    }

    if (stmt.type === 'NamespaceDeclaration') {
      return this.generateNestedNamespaceExport(
        stmt as NamespaceDeclaration,
        namespaceName,
        memberName
      );
    }

    // For functions, variables, classes
    const stmtCode = this.generateStatement(stmt);
    let result = stmtCode;
    if (stmtCode.trim() && stmt.type !== 'ExpressionStatement') {
      // Ensure there's a newline before the assignment if stmtCode doesn't end with one
      if (!stmtCode.endsWith('\n')) {
        result += '\n';
      }
      result += this.indent(`${namespaceName}.${memberName} = ${memberName};\n`);
    }
    return result;
  }

  private generateNestedNamespaceExport(
    nestedNs: NamespaceDeclaration,
    parentName: string,
    memberName: string
  ): string {
    // Remove the exported flag for nested generation
    const originalExported = nestedNs.exported;
    nestedNs.exported = false;
    const nestedCode = this.generateStatement(nestedNs).trim();
    nestedNs.exported = originalExported;

    // Generate as a property of parent namespace
    // Remove the initial assignment part from the nested code (e.g., "Дарунӣ = ")
    const assignmentStart = nestedCode.indexOf('= (function()');
    const nestedIIFE =
      assignmentStart !== -1
        ? nestedCode.substring(assignmentStart + 2) // Skip "= "
        : nestedCode;

    return this.indent(`${parentName}.${memberName} = ${nestedIIFE}`);
  }

  private getMemberName(stmt: Statement): string | null {
    switch (stmt.type) {
      case 'FunctionDeclaration':
        return (stmt as FunctionDeclaration).name.name;
      case 'VariableDeclaration': {
        const varDecl = stmt as VariableDeclaration;
        if (varDecl.identifier && varDecl.identifier.type === 'Identifier') {
          return varDecl.identifier.name;
        }
        break;
      }
      case 'ClassDeclaration':
        return (stmt as ClassDeclaration).name.name;
      case 'NamespaceDeclaration':
        return (stmt as NamespaceDeclaration).name.name;
    }
    return null;
  }

  private generateClassDeclaration(node: ClassDeclaration): string {
    const className = this.generateIdentifier(node.name);
    const extendsClause = node.superClass
      ? ` extends ${this.generateIdentifier(node.superClass)}`
      : '';
    // Note: JavaScript doesn't support abstract classes, so we skip the abstract modifier

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

    return this.indent(`class ${className}${extendsClause} {${classBody}}`);
  }

  private generateMethodDefinition(node: MethodDefinition): string {
    const methodName =
      node.kind === 'constructor' ? 'constructor' : this.generateIdentifier(node.key);
    const isStatic = node.static ? 'static ' : '';
    // Note: JavaScript doesn't support abstract methods, so we skip them entirely

    // Generate parameters
    const params = node.value.params
      ? node.value.params.map(param => this.generateIdentifier(param.name)).join(', ')
      : '';

    // Skip abstract methods - they don't exist in JavaScript
    if ((node as MethodDefinition & { abstract?: boolean }).abstract) {
      // Abstract methods should not generate any code in JavaScript
      return '';
    } else {
      // Regular methods have a body
      // Handle cases where body might be null or undefined
      if (!node.value || !node.value.body) {
        return this.indent(`${isStatic}${methodName}(${params}) {}`);
      }
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

  private needsParentheses(operator: string, parentOperator: string): boolean {
    // Get precedence values (default to 0 if not found)
    const opPrecedence = this.operatorPrecedence.get(operator) || 0;
    const parentPrecedence = this.operatorPrecedence.get(parentOperator) || 0;

    // Parentheses are needed if:
    // 1. Current operator has lower precedence than parent (evaluated later)
    // 2. Same precedence but parent is not left-associative (for right-associative like **)

    if (opPrecedence < parentPrecedence) {
      return true;
    }

    // Special case: exponentiation is right-associative
    // a ** b ** c means a ** (b ** c), so we need parens for left operand
    // This is handled by parser, so we just need to preserve them
    if (opPrecedence === parentPrecedence && parentOperator === '**') {
      return operator !== '**'; // Add parens if operators differ at same level under **
    }

    return false;
  }

  private generateSwitchStatement(node: SwitchStatement): string {
    const discriminant = this.generateExpression(node.discriminant);

    this.indentLevel++;
    const cases = node.cases
      .map((switchCase: SwitchCase) => {
        if (!switchCase.test) {
          const consequent = switchCase.consequent
            .map(stmt => this.generateStatement(stmt))
            .join('\n');
          return this.indent(`default:\n${consequent}`);
        } else {
          const test = this.generateExpression(switchCase.test);
          const consequent = switchCase.consequent
            .map(stmt => this.generateStatement(stmt))
            .join('\n');
          return this.indent(`case ${test}:\n${consequent}`);
        }
      })
      .join('\n');
    this.indentLevel--;

    return this.indent(`switch (${discriminant}) {\n${cases}\n${this.getIndent()}}`);
  }

  // Pattern generation methods
  private generatePattern(node: Identifier | ArrayPattern | ObjectPattern): string {
    switch (node.type) {
      case 'Identifier':
        return this.generateIdentifier(node);
      case 'ArrayPattern':
        return this.generateArrayPattern(node);
      case 'ObjectPattern':
        return this.generateObjectPattern(node);
      default:
        throw new Error('Unknown pattern type');
    }
  }

  private generateArrayPattern(node: ArrayPattern): string {
    const elements = node.elements
      .map(element => {
        if (element === null) {
          return '';
        } else if (element.type === 'SpreadElement') {
          return this.generateSpreadElement(element);
        } else {
          return this.generatePattern(element);
        }
      })
      .join(', ');

    return `[${elements}]`;
  }

  private generateObjectPattern(node: ObjectPattern): string {
    const properties = node.properties
      .map(prop => {
        if (prop.type === 'SpreadElement') {
          return this.generateSpreadElement(prop);
        } else {
          return this.generatePropertyPattern(prop as PropertyPattern);
        }
      })
      .join(', ');

    return `{${properties}}`;
  }

  private generatePropertyPattern(node: PropertyPattern): string {
    const key = node.computed
      ? `[${this.generateExpression(node.key as Expression)}]`
      : this.generateIdentifier(node.key as Identifier);

    if (
      node.key.type === 'Identifier' &&
      node.value.type === 'Identifier' &&
      node.key.name === node.value.name
    ) {
      return key;
    } else {
      const value = this.generatePattern(node.value);
      return `${key}: ${value}`;
    }
  }

  private generateSpreadElement(node: SpreadElement): string {
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

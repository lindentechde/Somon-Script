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
  SwitchCase,
  ArrayPattern,
  AssignmentPattern,
  ObjectPattern,
  PropertyPattern,
  TemplateLiteral,
  ConditionalExpression,
  SequenceExpression,
  Property,
  RestElement,
} from './types';

/** Precedence levels of non-binary expressions; binary levels live in `operatorPrecedence`. */
const PREC = {
  SEQUENCE: 1,
  ASSIGNMENT: 2,
  CONDITIONAL: 3,
  UNARY: 16,
  POSTFIX: 17,
  CALL: 19,
  PRIMARY: 20,
} as const;

type PatternNode =
  | Identifier
  | ArrayPattern
  | ObjectPattern
  | AssignmentPattern
  | SpreadElement
  | RestElement;

/** Words that are not valid JavaScript identifiers (strict mode, CommonJS output). */
const JS_RESERVED_WORDS: ReadonlySet<string> = new Set([
  'await',
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'debugger',
  'default',
  'delete',
  'do',
  'else',
  'enum',
  'export',
  'extends',
  'false',
  'finally',
  'for',
  'function',
  'if',
  'implements',
  'import',
  'in',
  'instanceof',
  'interface',
  'let',
  'new',
  'null',
  'package',
  'private',
  'protected',
  'public',
  'return',
  'static',
  'super',
  'switch',
  'this',
  'throw',
  'true',
  'try',
  'typeof',
  'var',
  'void',
  'while',
  'with',
  'yield',
]);

const NODE_PRECEDENCE: Readonly<Record<string, number>> = {
  SequenceExpression: PREC.SEQUENCE,
  AssignmentExpression: PREC.ASSIGNMENT,
  ArrowFunctionExpression: PREC.ASSIGNMENT,
  ConditionalExpression: PREC.CONDITIONAL,
  UnaryExpression: PREC.UNARY,
  AwaitExpression: PREC.UNARY,
  CallExpression: PREC.CALL,
  MemberExpression: PREC.CALL,
  NewExpression: PREC.CALL,
  ImportExpression: PREC.CALL,
};

export class CodeGenerator {
  private indentLevel: number = 0;
  private readonly indentSize: number = 2;
  private importCounter: number = 0;
  private readonly errors: string[] = [];
  /** Names declared by the program, innermost scope last (see `withScope`). */
  private readonly scopes: Set<string>[] = [];

  // Static — allocated once for the class, not rebuilt per member expression.
  // O(1) membership test via Set replaces the previous O(n) Array.includes.
  private static readonly COMMON_METHODS: ReadonlySet<string> = new Set([
    // Console methods
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
    // Map / Set methods
    'бозгирифтан',
    'гузоштан',
    'дорадКалид',
    'ҳаҷм',
    'нобудКардан',
  ]);

  /**
   * Return diagnostics collected during generation. Codegen follows the same
   * never-throw contract as the rest of the pipeline — unknown AST nodes are
   * recorded here rather than thrown.
   */
  getErrors(): string[] {
    return [...this.errors];
  }

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

    // Map / Set methods
    ['бозгирифтан', 'get'],
    ['гузоштан', 'set'],
    ['дорадКалид', 'has'],
    ['ҳаҷм', 'size'],
    ['нобудКардан', 'delete'],

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
    const statements = this.withScope(this.declaredNames(node.body ?? []), () =>
      node.body.map(stmt => this.generateStatement(stmt)).filter(stmt => stmt.length > 0)
    );

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
        return this.withScope(this.declaredNames([(node as ForStatement).init as Statement]), () =>
          this.generateForStatement(node as ForStatement)
        );
      case 'ForInStatement':
        return this.withScope(this.declaredNames([(node as ForInStatement).left]), () =>
          this.generateForInStatement(node as ForInStatement)
        );
      case 'ForOfStatement':
        return this.withScope(this.declaredNames([(node as ForOfStatement).left]), () =>
          this.generateForOfStatement(node as ForOfStatement)
        );
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
      case 'SwitchStatement': {
        const cases = (node as SwitchStatement).cases;
        return this.withScope(this.declaredNames(cases.flatMap(c => c.consequent)), () =>
          this.generateSwitchStatement(node as SwitchStatement)
        );
      }
      case 'BreakStatement':
        return this.indent('break;');
      case 'ContinueStatement':
        return this.indent('continue;');
      default: {
        const unknown = node as { type?: string };
        this.errors.push(`Unknown statement type: ${unknown.type ?? 'unknown'}`);
        return '';
      }
    }
  }

  private generateVariableDeclaration(node: VariableDeclaration): string {
    const kind = node.kind === 'СОБИТ' ? 'const' : 'let';
    const pattern = this.generatePattern(node.identifier);
    const init = node.init ? ` = ${this.generateExpression(node.init, PREC.ASSIGNMENT)}` : '';

    return this.indent(`${kind} ${pattern}${init};`);
  }

  private generateFunctionDeclaration(node: FunctionDeclaration): string {
    const async = node.async ? 'async ' : '';
    const name = this.generateIdentifier(node.name);
    const { params, body } = this.generateFunctionParts(node.params, node.body);

    return this.indent(`${async}function ${name}(${params}) ${body}`);
  }

  /**
   * Parameter list shared by every function form: `а = 1`, `...а` and
   * destructuring patterns. Legacy ASTs may still use bare Identifiers.
   */
  private generateParams(params: Parameter[] | undefined): string {
    return (params ?? [])
      .map(param => {
        if ((param as { type: string }).type === 'Identifier') {
          return this.generateIdentifier(param as unknown as Identifier);
        }
        const target = param.pattern
          ? this.generatePattern(param.pattern)
          : this.generateIdentifier(param.name);
        const defaultValue = param.defaultValue
          ? ` = ${this.generateExpression(param.defaultValue, PREC.ASSIGNMENT)}`
          : '';
        return `${param.rest ? '...' : ''}${target}${defaultValue}`;
      })
      .join(', ');
  }

  /** Parameter list and body of a function, with the parameters in scope. */
  private generateFunctionParts(
    params: Parameter[] | undefined,
    body: BlockStatement
  ): { params: string; body: string } {
    return this.withScope(this.paramNames(params), () => ({
      params: this.generateParams(params),
      body: this.generateBlockStatement(body),
    }));
  }

  private generateBlockStatement(node: BlockStatement, scopeNames: string[] = []): string {
    if (node.body.length === 0) {
      return '{}';
    }

    this.indentLevel++;
    const statements = this.withScope([...scopeNames, ...this.declaredNames(node.body)], () =>
      node.body.map(stmt => this.generateStatement(stmt)).filter(stmt => stmt.length > 0)
    );
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
    const right = this.generateExpression(node.right, PREC.ASSIGNMENT);
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
    let expr = this.generateExpression(node.expression);
    // A statement starting with these tokens would parse as a block or a declaration
    if (/^(?:\{|function\b|async\s+function\b|class\b|let\s*\[)/.test(expr)) {
      expr = `(${expr})`;
    }
    return this.indent(`${expr};`);
  }

  // eslint-disable-next-line complexity
  /**
   * Generate an expression, wrapping it in parentheses when it binds more
   * loosely than its context requires. `minPrec` is the lowest precedence
   * (see `getPrecedence`) the context accepts without parentheses.
   */
  private generateExpression(node: Expression, minPrec: number = 0): string {
    // Handle null or undefined node
    if (!node) {
      return '';
    }

    const code = this.generateExpressionNode(node);
    return this.getPrecedence(node, code) < minPrec ? `(${code})` : code;
  }

  /**
   * JavaScript precedence of an expression node: 1 sequence, 2 assignment and
   * arrow, 3 conditional, 4-15 binary operators (`operatorPrecedence`), 16
   * prefix unary/await, 17 postfix update, 19 call/member/new, 20 primary.
   */
  private getPrecedence(node: Expression, code: string): number {
    switch (node.type) {
      case 'BinaryExpression':
        return this.operatorPrecedence.get((node as BinaryExpression).operator) ?? 0;
      case 'UpdateExpression':
        return (node as UpdateExpression).prefix ? PREC.UNARY : PREC.POSTFIX;
      case 'Literal':
        // A negative number is emitted with a leading minus, like a unary expression
        return code.startsWith('-') ? PREC.UNARY : PREC.PRIMARY;
      default:
        return NODE_PRECEDENCE[node.type] ?? PREC.PRIMARY;
    }
  }

  // eslint-disable-next-line complexity
  private generateExpressionNode(node: Expression): string {
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

    const operatorExpressions = [
      'BinaryExpression',
      'UnaryExpression',
      'UpdateExpression',
      'ConditionalExpression',
      'SequenceExpression',
    ];
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
      case 'ConditionalExpression':
        return this.generateConditionalExpression(node as ConditionalExpression);
      case 'SequenceExpression':
        return (node as SequenceExpression).expressions
          .map(expr => this.generateExpression(expr, PREC.ASSIGNMENT))
          .join(', ');
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
    const async = node.async ? 'async ' : '';
    const name = node.name ? ` ${this.generateIdentifier(node.name)}` : '';
    const { params, body } = this.generateFunctionParts(node.params, node.body);
    return `${async}function${name}(${params}) ${body}`;
  }

  private generateArrowFunctionExpression(node: ArrowFunctionExpression): string {
    const async = node.isAsync ? 'async ' : '';

    if (node.body.type === 'BlockStatement') {
      // Block body
      const { params, body } = this.generateFunctionParts(node.params, node.body as BlockStatement);
      return `${async}(${params}) => ${body}`;
    }

    return this.withScope(this.paramNames(node.params), () => {
      const params = this.generateParams(node.params);
      // Expression body; a leading `{` would be parsed as a block
      let body = this.generateExpression(node.body as Expression, PREC.ASSIGNMENT);
      if (body.startsWith('{')) {
        body = `(${body})`;
      }
      return `${async}(${params}) => ${body}`;
    });
  }

  private generateImportExpression(node: ImportExpression): string {
    // Dynamic import: ворид(specifier) -> import(specifier)
    // Handle .som extension conversion for dynamic imports (string specifiers only)
    const source = this.convertSourcePath(this.generateExpression(node.source, PREC.ASSIGNMENT));

    return `import(${source})`;
  }

  private handleUnknownExpression(node: Expression): string {
    const unknown = node as { type?: string };
    this.errors.push(`Unknown expression type: ${unknown.type ?? 'unknown'}`);
    return '';
  }

  private generateImportDeclaration(node: ImportDeclaration): string {
    const specifiers = node.specifiers;
    // Module resolution: convert .som extensions to .js
    const source = this.convertSourcePath(this.generateLiteral(node.source));

    const results: string[] = [];
    const tmpVar = `__somon_import_${this.importCounter++}`;
    results.push(this.indent(`const ${tmpVar} = require(${source});`));

    // Handle default imports
    const defaultImports = specifiers.filter(s => s.type === 'ImportDefaultSpecifier');
    if (defaultImports.length > 0) {
      const localName = this.generateIdentifier(defaultImports[0].local);
      results.push(this.indent(`const ${localName} = ${tmpVar}.default ?? ${tmpVar};`));
    }

    const namespaceImport = specifiers.find(s => s.type === 'ImportNamespaceSpecifier') as
      | ImportNamespaceSpecifier
      | undefined;
    if (namespaceImport) {
      results.push(
        this.indent(`const ${this.generateIdentifier(namespaceImport.local)} = ${tmpVar};`)
      );
    }

    // Handle named imports
    const namedImports = specifiers.filter(s => s.type === 'ImportSpecifier') as ImportSpecifier[];
    if (namedImports.length > 0) {
      const destructuring = namedImports
        .map(spec => {
          const imported = spec.imported.name;
          const local = this.generateIdentifier(spec.local);
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
    const declaration = node.declaration!;

    // `содир пешфарз <expression>;`
    if (node.default && declaration.type === 'ExpressionStatement') {
      const value = this.generateExpression(
        (declaration as ExpressionStatement).expression,
        PREC.ASSIGNMENT
      );
      return this.indent(`module.exports.default = ${value};`);
    }

    const code = this.generateStatement(declaration);
    const exportNames = this.extractExportNames(declaration);

    // Type-only declarations don't generate runtime exports
    if (exportNames.length === 0) {
      return code;
    }

    const commonjsExports = node.default
      ? [`module.exports.default = ${exportNames[0]};`]
      : exportNames.map(name => `module.exports.${name} = ${name};`);

    return [code.replace(/\n+$/, ''), ...commonjsExports.map(line => this.indent(line))].join('\n');
  }

  private extractExportNames(declaration: Statement): string[] {
    // Interfaces and TypeAlias don't generate runtime code
    if (declaration.type === 'InterfaceDeclaration' || declaration.type === 'TypeAlias') {
      return [];
    }
    const names: string[] = [];
    this.collectDeclaredNames(declaration, names);
    return names;
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
        const local = this.generateIdentifier(spec.local);
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

  /**
   * Rewrite a quoted module specifier for the emitted CommonJS: a trailing
   * `.som` becomes `.js`, and a relative specifier without a JavaScript/JSON
   * extension gets `.js` appended. Anything else is returned unchanged.
   */
  private convertSourcePath(source: string): string {
    const match = /^(["'])(.*)\1$/s.exec(source);
    if (!match) {
      return source;
    }
    const [, quote, specifier] = match;
    if (specifier.endsWith('.som')) {
      return `${quote}${specifier.slice(0, -'.som'.length)}.js${quote}`;
    }
    if (/^\.\.?\//.test(specifier) && !/\.(?:[cm]?js|json)$/.test(specifier)) {
      // For relative imports without extension, add .js
      return `${quote}${specifier}.js${quote}`;
    }
    return source;
  }

  private generateIdentifier(node: Identifier): string {
    // Built-in names (`рӯйхат` → `Array`, `чоп` → `console`, …) are mapped only
    // when the program does not declare a binding of that name in scope;
    // otherwise `тағ рӯйхат = []` would shadow the global `Array`.
    const mapped = this.isDeclared(node.name) ? undefined : this.mapBuiltinIdentifier(node.name);
    if (mapped) {
      return mapped;
    }

    if (JS_RESERVED_WORDS.has(node.name)) {
      this.errors.push(
        `'${node.name}' is a reserved word in JavaScript and cannot be used as an identifier at line ${node.line}, column ${node.column}`
      );
    }
    return node.name;
  }

  private mapBuiltinIdentifier(name: string): string | undefined {
    // Map built-in literals
    if (name === 'беқимат') {
      return 'undefined';
    }

    // Handle Хато (capitalized) as Error constructor
    if (name === 'Хато') {
      return 'Error';
    }

    // Map built-in constructors/objects (when used as identifiers)
    const builtinConstructors = ['сатр', 'рӯйхат', 'объект', 'математика', 'Риёзӣ', 'сатрМетодҳо'];
    return builtinConstructors.includes(name) ? this.builtinMappings.get(name) : undefined;
  }

  private isDeclared(name: string): boolean {
    return this.scopes.some(scope => scope.has(name));
  }

  /** Run `generate` with `names` declared in a new innermost scope. */
  private withScope<T>(names: Iterable<string>, generate: () => T): T {
    this.scopes.push(new Set(names));
    try {
      return generate();
    } finally {
      this.scopes.pop();
    }
  }

  /** Names bound by the statements of one block (lexical declarations are hoisted to it). */
  private declaredNames(statements: Statement[]): string[] {
    const names: string[] = [];
    for (const stmt of statements) {
      this.collectDeclaredNames(stmt, names);
    }
    return names;
  }

  private collectDeclaredNames(stmt: Statement | null | undefined, names: string[]): void {
    switch (stmt?.type) {
      case 'VariableDeclaration':
        this.collectPatternNames((stmt as VariableDeclaration).identifier, names);
        break;
      case 'FunctionDeclaration':
      case 'ClassDeclaration':
      case 'NamespaceDeclaration':
        names.push(
          (stmt as FunctionDeclaration | ClassDeclaration | NamespaceDeclaration).name.name
        );
        break;
      case 'ImportDeclaration':
        names.push(...(stmt as ImportDeclaration).specifiers.map(spec => spec.local.name));
        break;
      case 'ExportDeclaration':
        this.collectDeclaredNames((stmt as ExportDeclaration).declaration, names);
        break;
    }
  }

  private paramNames(params: Parameter[] | undefined): string[] {
    const names: string[] = [];
    for (const param of params ?? []) {
      if ((param as { type: string }).type === 'Identifier') {
        names.push((param as unknown as Identifier).name);
      } else {
        this.collectPatternNames(param.pattern ?? param.name, names);
      }
    }
    return names;
  }

  private collectPatternNames(pattern: PatternNode | null | undefined, names: string[]): void {
    switch (pattern?.type) {
      case 'Identifier':
        names.push(pattern.name);
        break;
      case 'AssignmentPattern':
        this.collectPatternNames(pattern.left, names);
        break;
      case 'SpreadElement':
      case 'RestElement':
        this.collectPatternNames(pattern.argument as PatternNode, names);
        break;
      case 'ArrayPattern':
        pattern.elements.forEach(element => this.collectPatternNames(element, names));
        break;
      case 'ObjectPattern':
        for (const prop of pattern.properties) {
          this.collectPatternNames(
            prop.type === 'PropertyPattern' ? (prop.value ?? (prop.key as Identifier)) : prop,
            names
          );
        }
        break;
    }
  }

  private generateLiteral(node: Literal): string {
    if (typeof node.value === 'string') {
      // Properly escape string literals
      const escaped = node.value
        .replaceAll('\\', '\\\\') // Escape backslashes first
        .replaceAll('"', '\\"') // Escape quotes
        .replaceAll('\n', '\\n') // Escape newlines
        .replaceAll('\t', '\\t') // Escape tabs
        .replaceAll('\r', '\\r') // Escape carriage returns
        .replaceAll('\0', '\\x00'); // Keep NUL out of the output
      return `"${escaped}"`;
    }
    if (node.value === null) {
      return 'null';
    }
    if (typeof node.value === 'number' && CodeGenerator.isNumericLiteralText(node.raw)) {
      // Keep the literal as written: `0xFF`, `1e3`, `.5`, `10n`
      return node.raw;
    }
    return String(node.value);
  }

  private static isNumericLiteralText(raw: unknown): raw is string {
    return (
      typeof raw === 'string' &&
      /^(?:0[xX][0-9a-fA-F]+|0[oO][0-7]+|0[bB][01]+|\d+n|(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)$/.test(
        raw
      )
    );
  }

  private generateTemplateLiteral(node: TemplateLiteral): string {
    let result = '`';

    for (let i = 0; i < node.quasis.length; i++) {
      const quasi = node.quasis[i];

      // Emit the decoded text, re-escaping whatever would end or reinterpret
      // the template: `\`, a backtick, `${`, and CR (which JS normalises to LF).
      const text = quasi.value.cooked ?? quasi.value.raw;
      result += text
        .replace(/\\|`|\$\{/g, match => `\\${match}`)
        .replaceAll('\r', '\\r')
        .replaceAll('\0', '\\x00');

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

  private generateBinaryExpression(node: BinaryExpression): string {
    const precedence = this.operatorPrecedence.get(node.operator) ?? 0;
    // `**` is right-associative, and `-а ** б` is a SyntaxError, so its left
    // operand must bind tighter than a unary expression. Every other binary
    // operator is left-associative: an equal-precedence right operand needs
    // parentheses (`а - (б - в)`).
    const isExponent = node.operator === '**';
    const left = this.generateExpression(node.left, isExponent ? PREC.UNARY + 1 : precedence);
    const right = this.generateExpression(node.right, isExponent ? precedence : precedence + 1);

    return `${this.wrapMixedNullish(node, node.left, left)} ${node.operator} ${this.wrapMixedNullish(node, node.right, right)}`;
  }

  /** `??` cannot be combined with an unparenthesised `&&` or `||` operand. */
  private wrapMixedNullish(parent: BinaryExpression, child: Expression, code: string): string {
    if (parent.operator !== '??' || child.type !== 'BinaryExpression') {
      return code;
    }
    const operator = (child as BinaryExpression).operator;
    return operator === '&&' || operator === '||' ? `(${code})` : code;
  }

  private generateConditionalExpression(node: ConditionalExpression): string {
    const test = this.generateExpression(node.test, PREC.CONDITIONAL + 1);
    const consequent = this.generateExpression(node.consequent, PREC.ASSIGNMENT);
    const alternate = this.generateExpression(node.alternate, PREC.ASSIGNMENT);
    return `${test} ? ${consequent} : ${alternate}`;
  }

  private generateUnaryExpression(node: UnaryExpression): string {
    const argument = this.generateExpression(node.argument, PREC.UNARY);
    // Word operators (`typeof`, `void`, `delete`) need a space, and so does
    // `- -а` / `+ +а`, which would otherwise read as `--а` / `++а`.
    const needsSpace =
      /^[a-z]/.test(node.operator) ||
      ((node.operator === '-' || node.operator === '+') && argument.startsWith(node.operator));
    return `${node.operator}${needsSpace ? ' ' : ''}${argument}`;
  }

  private generateUpdateExpression(node: UpdateExpression): string {
    const argument = this.generateExpression(node.argument, PREC.POSTFIX + 1);
    if (node.prefix) {
      return `${node.operator}${argument}`;
    } else {
      return `${argument}${node.operator}`;
    }
  }

  private generateCallExpression(node: CallExpression): string {
    let callee = this.generateExpression(node.callee, PREC.CALL);

    // Special handling for нишондиҳӣ function
    if (callee === 'нишондиҳӣ') {
      callee = 'console.log';
    }

    const args = this.generateArguments(node.arguments);
    return `${callee}${node.optional ? '?.' : ''}(${args})`;
  }

  /** Call/new argument list; elements may be `SpreadElement`s. */
  private generateArguments(args: Expression[] | undefined): string {
    return (args ?? [])
      .map(arg =>
        arg.type === 'SpreadElement'
          ? this.generateSpreadElement(arg as SpreadElement)
          : this.generateExpression(arg, PREC.ASSIGNMENT)
      )
      .join(', ');
  }

  private generateAssignmentExpression(node: AssignmentExpression): string {
    const target = node.left as Expression | ArrayPattern | ObjectPattern;
    const left =
      target.type === 'ArrayPattern' || target.type === 'ObjectPattern'
        ? this.generatePattern(target as ArrayPattern | ObjectPattern)
        : this.generateExpression(node.left);
    const right = this.generateExpression(node.right, PREC.ASSIGNMENT);
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

    if (!builtinObjects.includes(objectName) || this.isDeclared(objectName)) {
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

    // Always map if the property is a recognised Tajik builtin method name.
    // The previous `looksLikeClassInstance` heuristic (lowercase Cyrillic +
    // underscore) created asymmetry with MethodDefinition emission: a class
    // method declared as `илова` emits `push`, but a call on `list_name.илова`
    // would not — runtime "not a function". Consistency beats the heuristic:
    // if the user names a class method after a builtin, both sides rewrite.
    const shouldMap = objectMapped || CodeGenerator.COMMON_METHODS.has(propertyName);
    return shouldMap ? mappedProperty : property;
  }

  private generateMemberExpression(node: MemberExpression): string {
    let object = this.generateExpression(node.object, PREC.CALL);
    // `5.toFixed()` would read the dot as a decimal point
    if (node.object.type === 'Literal' && /^\d+$/.test(object)) {
      object = `(${object})`;
    }
    // A property name is not a variable reference: emit it verbatim (subject
    // to the member-name mapping below), never as a mapped/checked identifier.
    let property =
      !node.computed && node.property.type === 'Identifier'
        ? (node.property as Identifier).name
        : this.generateExpression(node.property);

    const { mapped: mappedObject, wasMapped: objectMapped } = this.mapBuiltinObject(node, object);
    object = mappedObject;

    property = this.mapPropertyName(node, property, objectMapped);

    // Special case: чоп.хато should become console.error
    if (object === 'console' && property === 'Error') {
      property = 'error';
    }

    if (node.computed) {
      return `${object}${node.optional ? '?.' : ''}[${property}]`;
    }
    return `${object}${node.optional ? '?.' : '.'}${property}`;
  }

  private generateArrayExpression(node: ArrayExpression): string {
    return `[${this.generateArguments(node.elements)}]`;
  }

  private generateObjectExpression(node: ObjectExpression): string {
    const properties = node.properties
      .map(prop => {
        if (prop.type === 'SpreadElement') {
          return this.generateSpreadElement(prop);
        }
        return this.generateProperty(prop);
      })
      .join(', ');

    return `{${properties}}`;
  }

  private generateProperty(prop: Property): string {
    const key = prop.computed
      ? `[${this.generateExpression(prop.key, PREC.ASSIGNMENT)}]`
      : this.generatePropertyKey(prop.key);
    if (prop.method && prop.value.type === 'FunctionExpression') {
      const fn = prop.value as FunctionExpression;
      const asyncPrefix = fn.async ? 'async ' : '';
      const { params, body } = this.generateFunctionParts(fn.params, fn.body);
      return `${asyncPrefix}${key}(${params}) ${body}`;
    }
    const value = this.generateExpression(prop.value, PREC.ASSIGNMENT);
    return `${key}: ${value}`;
  }

  /**
   * Non-computed key of an object literal, class member or destructuring
   * pattern. Identifier keys go through the same Tajik→JS member-name mapping
   * as `о.ном` accesses (`mapMemberName`), so user objects round-trip.
   */
  private generatePropertyKey(key: Identifier | Literal): string {
    if (key.type === 'Identifier') {
      return this.mapMemberName((key as Identifier).name);
    }
    return this.generateLiteral(key as Literal);
  }

  /**
   * Built-in method/property names (`дарозӣ` → `length`, `илова` → `push`, …)
   * are rewritten wherever a member name appears — `о.дарозӣ`, `{дарозӣ: 1}`,
   * class members and destructuring keys alike — so a user-defined member with
   * such a name stays consistent between declaration and use.
   */
  private mapMemberName(name: string): string {
    return CodeGenerator.COMMON_METHODS.has(name) ? (this.builtinMappings.get(name) ?? name) : name;
  }

  private generateTryStatement(node: TryStatement): string {
    let result =
      this.indent('try ') + this.generateBlockStatement(node.block).replace(this.getIndent(), '');

    if (node.handler) {
      const param = node.handler.param;
      // A parameterless catch stays parameterless (ES2019) so it cannot shadow
      // an outer variable such as `error`.
      result += param
        ? ` catch (${this.withScope([param.name], () => this.generateIdentifier(param))}) `
        : ' catch ';
      result += this.generateBlockStatement(node.handler.body, param ? [param.name] : []).replace(
        this.getIndent(),
        ''
      );
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
    const argument = this.generateExpression(node.argument, PREC.UNARY);
    return `await ${argument}`;
  }

  private generateNewExpression(node: NewExpression): string {
    let callee = this.generateExpression(node.callee, PREC.CALL);
    // `new f().К()` would call `new f()`; a call or optional link anywhere in
    // the callee's member chain needs parentheses: `new (f().К)()`.
    if (this.chainContainsCall(node.callee)) {
      callee = `(${callee})`;
    }
    return `new ${callee}(${this.generateArguments(node.arguments)})`;
  }

  private chainContainsCall(node: Expression): boolean {
    let current = node;
    while (current.type === 'MemberExpression') {
      const memberExpr = current as MemberExpression;
      if (memberExpr.optional) {
        return true;
      }
      current = memberExpr.object;
    }
    return current.type === 'CallExpression';
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

    // A local binding, so the namespace never leaks into (or, in strict code,
    // fails on) the global scope
    let result = this.indent(`const ${name} = (function() {\n`);
    this.indentLevel++;
    result += this.indent(`const ${name} = {};\n`);

    // Generate namespace body
    const statements = node.body?.statements ?? [];
    this.scopes.push(new Set(this.declaredNames(statements)));
    for (const stmt of statements) {
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
    this.scopes.pop();

    result += this.indent(`return ${name};\n`);
    this.indentLevel--;
    result += this.indent('})();\n');
    if (node.exported) {
      result += this.indent(`module.exports.${name} = ${name};\n`);
    }

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
    // Method names follow the same member-name mapping as `obj.маълумот()`
    // call sites (`mapMemberName`), so declaration and use agree.
    const methodName =
      node.kind === 'constructor' ? 'constructor' : this.mapMemberName(node.key.name);
    const isStatic = node.static ? 'static ' : '';
    const isAsync = node.value?.async ? 'async ' : '';

    // Skip abstract methods - they don't exist in JavaScript
    if (node.abstract) {
      return '';
    }

    // Handle cases where body might be null or undefined
    if (!node.value || !node.value.body) {
      const params = this.withScope(this.paramNames(node.value?.params), () =>
        this.generateParams(node.value?.params)
      );
      return this.indent(`${isStatic}${isAsync}${methodName}(${params}) {}`);
    }
    const { params, body } = this.generateFunctionParts(node.value.params, node.value.body);
    return this.indent(`${isStatic}${isAsync}${methodName}(${params}) ${body}`);
  }

  private generatePropertyDefinition(node: PropertyDefinition): string {
    const propertyName = this.mapMemberName(node.key.name);
    const isStatic = node.static ? 'static ' : '';
    const initializer = node.value
      ? ` = ${this.generateExpression(node.value, PREC.ASSIGNMENT)}`
      : '';

    return this.indent(`${isStatic}${propertyName}${initializer};`);
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
  private generatePattern(
    node: Identifier | ArrayPattern | ObjectPattern | AssignmentPattern
  ): string {
    switch (node.type) {
      case 'Identifier':
        return this.generateIdentifier(node);
      case 'AssignmentPattern':
        return `${this.generatePattern(node.left)} = ${this.generateExpression(node.right, PREC.ASSIGNMENT)}`;
      case 'ArrayPattern':
        return this.generateArrayPattern(node);
      case 'ObjectPattern':
        return this.generateObjectPattern(node);
      default: {
        const unknown = node as { type?: string };
        this.errors.push(`Unknown pattern type: ${unknown.type ?? 'unknown'}`);
        return '';
      }
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
      ? `[${this.generateExpression(node.key as Expression, PREC.ASSIGNMENT)}]`
      : this.generatePropertyKey(node.key);
    // Shorthand `{ п }` binds a variable named like the key
    const value = node.value ?? (node.key as Identifier);

    const local = this.generatePattern(value);
    return !node.computed && local === key ? key : `${key}: ${local}`;
  }

  private generateSpreadElement(node: SpreadElement): string {
    const argument = this.generateExpression(node.argument, PREC.ASSIGNMENT);
    return `...${argument}`;
  }

  private indent(text: string): string {
    return this.getIndent() + text;
  }

  private getIndent(): string {
    return ' '.repeat(this.indentLevel * this.indentSize);
  }
}

import {
  Token,
  TokenType,
  Program,
  Statement,
  Expression,
  VariableDeclaration,
  VariableDeclarationList,
  FunctionDeclaration,
  FunctionExpression,
  BlockStatement,
  ReturnStatement,
  IfStatement,
  WhileStatement,
  ExpressionStatement,
  Identifier,
  Literal,
  RegExpLiteral,
  BinaryExpression,
  UnaryExpression,
  UpdateExpression,
  CallExpression,
  ChainExpression,
  ClassExpression,
  ConditionalExpression,
  SequenceExpression,
  AssignmentPattern,
  ArrowFunctionExpression,
  AssignmentExpression,
  MemberExpression,
  ImportDeclaration,
  ImportSpecifier,
  ImportDefaultSpecifier,
  ImportNamespaceSpecifier,
  ImportExpression,
  ExportDeclaration,
  ExportSpecifier,
  ArrayExpression,
  TypeAnnotation,
  TypeNode,
  PrimitiveType,
  ArrayType,
  UnionType,
  IntersectionType,
  GenericType,
  TupleType,
  FunctionType,
  InterfaceDeclaration,
  PropertySignature,
  TypeParameter,
  TypeAlias,
  MappedType,
  ObjectType,
  KeyofType,
  IndexedAccessType,
  NamespaceDeclaration,
  Parameter,
  UniqueType,
  LiteralType,
  ConditionalType,
  AwaitExpression,
  NewExpression,
  TryStatement,
  CatchClause,
  ThrowStatement,
  ArrayPattern,
  ObjectPattern,
  PropertyPattern,
  SpreadElement,
  ObjectExpression,
  Property,
  TemplateLiteral,
  TemplateElement,
  // Added explicit imports for nodes previously redeclared locally
  ForStatement,
  ForInStatement,
  ForOfStatement,
  ClassDeclaration,
  ClassBody,
  MethodDefinition,
  PropertyDefinition,
  StaticBlock,
  SwitchStatement,
  SwitchCase,
  BreakStatement,
  ContinueStatement,
  AsExpression,
  TypeAssertion,
  SatisfiesExpression,
  NonNullExpression,
  DoWhileStatement,
  LabeledStatement,
  EmptyStatement,
  DebuggerStatement,
  EnumDeclaration,
  EnumMember,
  YieldExpression,
  MetaProperty,
  PrivateIdentifier,
  TaggedTemplateExpression,
  ReadonlyType,
  OptionalType,
  RestType,
  ThisType,
  TypePredicate,
  ConstructorType,
  Decorator,
  FunctionSignature,
  ImportEqualsDeclaration,
  ExportAssignment,
  AmbientModuleDeclaration,
  InferType,
  TypeQuery,
  TemplateLiteralType,
  InstantiationExpression,
} from './types';
import { Lexer, isRegexStartInText, regexLiteralEnd } from './lexer';
import { ImportHandler } from './handlers/import-handler';
import { DeclarationHandler } from './handlers/declaration-handler';
import { LoopHandler } from './handlers/loop-handler';

type AccessibilityModifier = 'public' | 'private' | 'protected' | undefined;

/** Modifiers of a constructor parameter property; only those present are set. */
interface ParameterModifiers {
  accessibility?: 'public' | 'private' | 'protected';
  readonly?: boolean;
  override?: boolean;
}

/** Decorators and modifiers of a class member. */
interface MemberHead {
  decorators: Decorator[];
  accessibility: AccessibilityModifier;
  isStatic: boolean;
  isAbstract: boolean;
  modifiers: {
    override?: boolean;
    declare?: boolean;
    accessor?: boolean;
    abstract?: boolean;
    static?: boolean;
  };
}

/** A class member's name (see `parseClassMemberKey`). */
interface MemberName {
  key: Identifier | PrivateIdentifier | Expression;
  token: Token;
  computed: boolean;
}

/** A class named in a `мерос` / `татбиқ` clause, with its type arguments. */
interface HeritageEntry {
  token: Token;
  typeArguments?: TypeNode[];
}

/** Raised when input nests deeper than the parser supports; aborts the parse. */
class NestingError extends Error {}

/** A statement or member terminator `;` that the source left out (see `consumeSemicolon`). */
export interface OmittedSemicolon {
  /** The token before which the `;` belongs. */
  before: Token;
  /** True for the separator after an interface or object-type member. */
  member: boolean;
}

export class Parser {
  private tokens: Token[];
  private current: number = 0;
  private errors: string[] = [];
  private importHandler: ImportHandler;
  private declarationHandler: DeclarationHandler;
  private loopHandler: LoopHandler;
  // Nodes that were written inside parentheses. The AST has no grouping node,
  // but `??` mixing and `**` operand rules depend on explicit parentheses.
  private readonly parenthesized = new WeakSet<Expression>();
  private depth = 0;
  private patternCounter = 0;
  /** Inside a generator body, where `ҳосил` / `yield` is the yield operator. */
  private inGenerator = false;
  /**
   * In an ambient context (`эълон …`, the body of `эълон номфазо`/`эълон модул`):
   * functions and methods have no bodies and constants no initializers.
   */
  private ambient = false;
  /** Terminators the source left out, in source order (used by the formatter). */
  readonly omittedSemicolons: OmittedSemicolon[] = [];
  /**
   * While `speculate` runs: the `>>` / `>>>` tokens split into `>` tokens
   * (see `consumeTypeArgumentsClose`), so that a failed attempt can undo it.
   */
  private tokenSplits: Array<{ index: number; token: Token }> | undefined;

  constructor(tokens: Token[]) {
    // Line breaks are insignificant: statements end with ';', so expressions
    // may span lines freely.
    this.tokens = tokens
      .filter(token => token.type !== TokenType.NEWLINE)
      .map(token => Parser.withEnglishKeyword(token));
    this.importHandler = new ImportHandler(this);
    this.declarationHandler = new DeclarationHandler(this);
    this.loopHandler = new LoopHandler(this);
  }

  getErrors(): string[] {
    return this.errors;
  }

  /**
   * English keywords the parser reads as their Tajik ones: those the lexer
   * knows (`return`, `else`, `new`, …), the literals and `this`/`super`, and
   * TypeScript's member modifiers and type words. All but `readonly`, `abstract` and `keyof` are reserved
   * words in JavaScript; those three become words that are still names
   * where no modifier or type operator fits. Any of them names a member
   * (`о.return`, `{ new: 1 }`). `async` and `of` are keywords only in their
   * places (see `isAsyncWord`, `isOfWord`); `typeof`, `void`, `delete`,
   * `instanceof`, `do`, `yield`, `as`, `satisfies`, `is`, `asserts`,
   * `infer`, `declare`, `override`, `accessor`, `using`, `enum`, `type`,
   * `const`, `out`, `module` and `global` are read by their spelling.
   */
  private static readonly ENGLISH_KEYWORDS: ReadonlyMap<string, TokenType> = new Map([
    ['return', TokenType.БОЗГАШТ],
    ['throw', TokenType.ПАРТОФТАН],
    ['new', TokenType.НАВ],
    ['function', TokenType.ФУНКСИЯ],
    ['else', TokenType.ВАГАРНА],
    ['case', TokenType.ҲОЛАТ],
    ['default', TokenType.ПЕШФАРЗ],
    ['await', TokenType.ИНТИЗОР],
    ['in', TokenType.ДАР],
    ['this', TokenType.ИН],
    ['super', TokenType.СУПЕР],
    ['true', TokenType.ДУРУСТ],
    ['false', TokenType.НОДУРУСТ],
    ['null', TokenType.ХОЛӢ],
    ['static', TokenType.СТАТИКӢ],
    ['extends', TokenType.МЕРОС],
    ['implements', TokenType.ТАТБИҚ],
    ['public', TokenType.ҶАМЪИЯТӢ],
    ['private', TokenType.ХОСУСӢ],
    ['protected', TokenType.МУҲОФИЗАТШУДА],
    ['abstract', TokenType.МАВҲУМ],
    ['readonly', TokenType.ТАНҲОХОНӢ],
    ['keyof', TokenType.КАЛИДҲОИ],
  ]);

  private static withEnglishKeyword(token: Token): Token {
    if (token.type !== TokenType.IDENTIFIER) return token;
    const type = Parser.ENGLISH_KEYWORDS.get(token.value);
    return type ? { ...token, type } : token;
  }

  /**
   * `ҳамзамон`, or `async` with more on its line (as in TypeScript, a line
   * break after `async` makes it a name), `offset` tokens ahead.
   */
  isAsyncWord(offset = 0): boolean {
    const token = this.tokens[this.current + offset];
    if (token?.type === TokenType.ҲАМЗАМОН) return true;
    const next = this.tokens[this.current + offset + 1];
    return (
      token?.type === TokenType.IDENTIFIER &&
      token.value === 'async' &&
      next !== undefined &&
      next.line === token.line
    );
  }

  /** `ҳамзамон функсия` / `async function` starts here. */
  isAsyncFunctionStart(): boolean {
    return this.isAsyncWord() && this.peekNext()?.type === TokenType.ФУНКСИЯ;
  }

  /** `аз` or `of` between the binding and the iterable of a for-of loop. */
  private isOfWord(token: Token | undefined): boolean {
    return (
      token?.type === TokenType.АЗ || (token?.type === TokenType.IDENTIFIER && token.value === 'of')
    );
  }

  parse(): Program {
    const body: Statement[] = [];
    this.errors = []; // Reset errors
    // `#!/usr/bin/env node` (the lexer only reads it on the first line)
    const shebang = this.match(TokenType.SHEBANG) ? this.previous().value : undefined;

    try {
      while (!this.isAtEnd()) {
        const stmt = this.statement();
        if (stmt) {
          body.push(stmt);
        }
        // Don't advance here - statement() handles its own token consumption
      }
      this.checkOverloads(body);
      this.checkExportAssignment(body);
    } catch (error) {
      // Only nesting overflows escape statement(); they abort the whole parse
      this.errors.push(this.nestingErrorMessage(error));
    }

    return {
      type: 'Program',
      body,
      ...(shebang !== undefined && { shebang }),
      line: 1,
      column: 1,
    };
  }

  private statement(): Statement | null {
    const startIndex = this.current;
    try {
      this.enterNesting();
      const parsers: Array<() => Statement | null> = [
        () => this.typeScriptStatement(),
        () => this.contextualStatement(),
        () => this.importHandler.parseStatement(),
        () => this.declarationHandler.parseStatement(),
        () => this.loopHandler.parseStatement(),
        () => (this.match(TokenType.КӮШИШ) ? this.tryStatement() : null),
        () => (this.match(TokenType.ПАРТОФТАН) ? this.throwStatement() : null),
        () => (this.match(TokenType.АГАР) ? this.ifStatement() : null),
        () => (this.match(TokenType.ИНТИХОБ) ? this.switchStatement() : null),
        () => (this.match(TokenType.ШИКАСТАН) ? this.breakStatement() : null),
        () => (this.match(TokenType.ДАВОМ) ? this.continueStatement() : null),
        () => (this.match(TokenType.БОЗГАШТ) ? this.returnStatement() : null),
        () => (this.match(TokenType.LEFT_BRACE) ? this.blockStatement() : null),
      ];

      for (const parse of parsers) {
        const result = parse();
        if (result) {
          return result;
        }
      }

      return this.expressionStatement();
    } catch (error) {
      if (this.isNestingError(error)) throw error;
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.errors.push(errorMessage);
      this.synchronize(startIndex);
      return null;
    } finally {
      this.depth--;
    }
  }

  private static readonly MAX_NESTING = 500;

  /**
   * Tracks syntactic nesting so that pathological input produces a positioned
   * parse error instead of a stack overflow.
   */
  private enterNesting(): void {
    this.depth++;
    if (this.depth > Parser.MAX_NESTING) {
      const token = this.peek();
      throw new NestingError(
        `Nesting too deep at line ${token.line}, column ${token.column} (more than ${Parser.MAX_NESTING} levels)`
      );
    }
  }

  private isNestingError(error: unknown): boolean {
    return error instanceof NestingError || error instanceof RangeError;
  }

  private nestingErrorMessage(error: unknown): string {
    if (error instanceof NestingError) return error.message;
    if (this.isNestingError(error)) {
      const token = this.peek();
      return `Nesting too deep at line ${token.line}, column ${token.column}`;
    }
    throw error;
  }

  /**
   * `тағ х = 1;` or `тағ а = 1, б = 2;` (a VariableDeclarationList).
   * `allowDefinite`: false in a `барои (…; …; …)` head, where `х!` is not permitted.
   */
  public variableDeclaration(allowDefinite = true): VariableDeclaration | VariableDeclarationList {
    const kindToken = this.previous();
    const kind = kindToken.type === TokenType.ТАҒЙИРЁБАНДА ? 'ТАҒЙИРЁБАНДА' : 'СОБИТ';

    const declarations = [this.variableDeclarator(kind, kindToken, allowDefinite)];
    while (this.match(TokenType.COMMA)) {
      declarations.push(this.variableDeclarator(kind, this.peek(), allowDefinite));
    }

    this.consumeSemicolon("Expected ';' after variable declaration");

    if (this.ambient) declarations.forEach(declaration => (declaration.declare = true));
    if (declarations.length === 1) return declarations[0];
    return {
      type: 'VariableDeclarationList',
      kind,
      declarations,
      ...(this.ambient && { declare: true }),
      line: kindToken.line,
      column: kindToken.column,
    };
  }

  /** One `ном: Т = қимат` of a declaration; `start` is where it begins (its `тағ` for the first). */
  private variableDeclarator(
    kind: VariableDeclaration['kind'],
    start: Token,
    allowDefinite: boolean
  ): VariableDeclaration {
    // Parse pattern (identifier, array destructuring, or object destructuring)
    const identifier = this.parsePattern();

    // Definite assignment assertion: `тағ х!: рақам;`
    const definite =
      identifier.type === 'Identifier' && this.check(TokenType.NOT) && !this.hasLineBreakBefore()
        ? this.advance()
        : undefined;

    // Parse optional type annotation
    let typeAnnotation: TypeAnnotation | undefined;
    if (this.match(TokenType.COLON)) {
      typeAnnotation = this.typeAnnotation();
    }

    let init: Expression | undefined;
    if (this.match(TokenType.ASSIGN)) {
      init = this.assignment();
      if (this.ambient) this.checkAmbientInitializer(kind, init);
    } else if (kind === 'СОБИТ' && !this.ambient) {
      throw new Error(
        `Missing initializer in constant declaration at line ${start.line}, column ${start.column}`
      );
    }
    if (definite) {
      this.checkDefiniteAssignment(definite, Boolean(init), Boolean(typeAnnotation), allowDefinite);
    }

    return {
      type: 'VariableDeclaration',
      kind,
      identifier,
      typeAnnotation,
      init,
      ...(definite && { definite: true }),
      line: start.line,
      column: start.column,
    };
  }

  /**
   * TypeScript's rules for a definite assignment assertion (`х!: Т`): it needs
   * a type annotation and no initializer, and only some declarations allow it.
   */
  private checkDefiniteAssignment(
    bang: Token,
    hasInitializer: boolean,
    hasType: boolean,
    permitted: boolean
  ): void {
    let problem: string | undefined;
    if (hasInitializer) {
      problem = 'Declarations with initializers cannot also have definite assignment assertions';
    } else if (!hasType) {
      problem = 'Declarations with definite assignment assertions must also have type annotations';
    } else if (!permitted) {
      problem = "A definite assignment assertion '!' is not permitted in this context";
    }
    // The declaration itself is well-formed: report and keep parsing
    if (problem) {
      this.errors.push(`${problem} at line ${bang.line}, column ${bang.column}`);
    }
  }

  /**
   * `функсия ном(…) { … }`; without a body (`функсия ном(х: рақам): рақам;`)
   * an overload signature or, in an ambient context, a declared function.
   */
  public functionDeclaration(): FunctionDeclaration | FunctionSignature {
    const funcToken = this.previous();
    const generator = this.match(TokenType.MULTIPLY);
    let name: Token;
    if (this.check(TokenType.IDENTIFIER)) {
      name = this.advance();
    } else if (this.matchBuiltinIdentifier()) {
      name = this.previous();
    } else {
      throw new Error(
        `Expected function name at line ${this.peek().line}, column ${this.peek().column}`
      );
    }

    // Generic type parameters: `<Т>`, `<Т мерос { дарозӣ: рақам } = сатр>`
    const typeParameters = this.parseTypeParametersOrSkip();
    this.checkTypeParameterModifiers(typeParameters, 'function');

    this.consume(TokenType.LEFT_PAREN, "Expected '(' after function name");
    const { params, thisType } = this.withGenerator(false, () =>
      this.parseParametersWithThis("Expected ')' after parameters")
    );

    // Parse optional return type
    let returnType: TypeAnnotation | undefined;
    if (this.match(TokenType.COLON)) {
      returnType = this.returnTypeAnnotation();
    }

    const identifier: Identifier = {
      type: 'Identifier',
      name: name.value,
      line: name.line,
      column: name.column,
    };
    if (this.isSignatureEnd()) {
      this.consumeSemicolon("Expected '{' before function body");
      return {
        type: 'FunctionSignature',
        name: identifier,
        ...(typeParameters && { typeParameters }),
        params,
        ...(returnType && { returnType }),
        ...(thisType && { thisType }),
        ...(generator && { generator }),
        ...(this.ambient && { declare: true }),
        line: funcToken.line,
        column: funcToken.column,
      };
    }

    this.consume(TokenType.LEFT_BRACE, "Expected '{' before function body");
    if (this.ambient) this.reportImplementationInAmbientContext(funcToken);

    const body = this.withGenerator(generator, () => this.blockStatement());

    return {
      type: 'FunctionDeclaration',
      name: identifier,
      ...(typeParameters && { typeParameters }),
      params,
      returnType,
      body,
      ...(generator && { generator }),
      ...(thisType && { thisType }),
      line: funcToken.line,
      column: funcToken.column,
    };
  }

  /**
   * Whether a function or method signature ends here without a body: at ';',
   * '}', the end of input or a line break (anything else must be its body).
   */
  private isSignatureEnd(): boolean {
    return (
      this.check(TokenType.SEMICOLON) ||
      this.check(TokenType.RIGHT_BRACE) ||
      this.isAtEnd() ||
      (this.hasLineBreakBefore() && !this.check(TokenType.LEFT_BRACE))
    );
  }

  /** TypeScript's "An implementation cannot be declared in ambient contexts" (TS1183). */
  private reportImplementationInAmbientContext(at: Token): void {
    this.errors.push(
      `An implementation cannot be declared in ambient contexts at line ${at.line}, column ${at.column}`
    );
  }

  /**
   * Parses a function's parameters or body: `ҳосил` is the yield operator in
   * a generator body and an ordinary name everywhere else.
   */
  private withGenerator<T>(generator: boolean, parse: () => T): T {
    const outer = this.inGenerator;
    this.inGenerator = generator;
    try {
      return parse();
    } finally {
      this.inGenerator = outer;
    }
  }

  /** Words that are the yield operator inside a generator body. */
  private static readonly YIELD_KEYWORDS: ReadonlySet<string> = new Set(['ҳосил', 'yield']);

  private isYieldKeyword(token: Token): boolean {
    return (
      this.inGenerator &&
      token.type === TokenType.IDENTIFIER &&
      Parser.YIELD_KEYWORDS.has(token.value)
    );
  }

  /** Tokens after which `ҳосил` has no operand: `тағ х = ҳосил;`, `ф(ҳосил)`. */
  private static readonly YIELD_TERMINATORS: ReadonlySet<TokenType> = new Set([
    TokenType.RIGHT_PAREN,
    TokenType.RIGHT_BRACKET,
    TokenType.RIGHT_BRACE,
    TokenType.COMMA,
    TokenType.SEMICOLON,
    TokenType.COLON,
    TokenType.EOF,
  ]);

  /** `ҳосил`, `ҳосил х`, `ҳосил* итерабел`; binds as loosely as an assignment. */
  private yieldExpression(): YieldExpression {
    const yieldToken = this.advance();
    let delegate = false;
    let argument: Expression | undefined;
    // As in JavaScript, a line break right after 'ҳосил' ends it
    if (!this.hasLineBreakBefore()) {
      delegate = this.match(TokenType.MULTIPLY);
      if (delegate || !Parser.YIELD_TERMINATORS.has(this.peek().type)) {
        argument = this.assignment();
      }
    }
    return {
      type: 'YieldExpression',
      ...(argument && { argument }),
      delegate,
      line: yieldToken.line,
      column: yieldToken.column,
    } as YieldExpression;
  }

  private blockStatement(): BlockStatement {
    const leftBrace = this.previous();
    const body: Statement[] = [];

    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      const stmt = this.statement();
      if (stmt) {
        body.push(stmt);
      }
    }

    this.consume(TokenType.RIGHT_BRACE, "Expected '}' after block");
    this.checkOverloads(body);

    return {
      type: 'BlockStatement',
      body,
      line: leftBrace.line,
      column: leftBrace.column,
    };
  }

  private ifStatement(): IfStatement {
    const ifToken = this.previous();

    this.consume(TokenType.LEFT_PAREN, "Expected '(' after 'агар'");
    const test = this.expression();
    this.consume(TokenType.RIGHT_PAREN, "Expected ')' after if condition");

    const consequent = this.statement()!;
    let alternate: Statement | undefined;

    if (this.match(TokenType.ВАГАРНА, TokenType.ЧУНИН)) {
      alternate = this.statement()!;
    }

    return {
      type: 'IfStatement',
      test,
      consequent,
      alternate,
      line: ifToken.line,
      column: ifToken.column,
    };
  }

  public whileStatement(): WhileStatement {
    const whileToken = this.previous();

    this.consume(TokenType.LEFT_PAREN, "Expected '(' after 'то'");
    const test = this.expression();
    this.consume(TokenType.RIGHT_PAREN, "Expected ')' after while condition");

    const body = this.statement()!;

    return {
      type: 'WhileStatement',
      test,
      body,
      line: whileToken.line,
      column: whileToken.column,
    };
  }

  /** Words starting a do-while loop when a `{` follows: `кун { … } то (…);`. */
  private static readonly DO_KEYWORDS: ReadonlySet<string> = new Set(['кун', 'do']);

  /** Words starting an enum when a name and `{` follow: `шумориш Ранг { … }`. */
  private static readonly ENUM_KEYWORDS: ReadonlySet<string> = new Set(['шумориш', 'enum']);

  /** Statements that JavaScript does not allow as the body of a label. */
  private static readonly DECLARATION_TYPES: ReadonlySet<string> = new Set([
    'VariableDeclaration',
    'VariableDeclarationList',
    'FunctionDeclaration',
    'ClassDeclaration',
    'InterfaceDeclaration',
    'TypeAlias',
    'NamespaceDeclaration',
    'ImportDeclaration',
    'ExportDeclaration',
    'EnumDeclaration',
  ]);

  /**
   * Statements started by punctuation or by a contextual word: `;`, a label,
   * `кун { … } то (…);`, `debugger;` and enums. `кун` and `шумориш` are
   * keywords only in this position, so they remain usable as names elsewhere.
   */
  private contextualStatement(): Statement | null {
    const token = this.peek();
    const next = this.peekNext();
    if (token.type === TokenType.SEMICOLON) {
      this.advance();
      return { type: 'EmptyStatement', line: token.line, column: token.column } as EmptyStatement;
    }
    if (next?.type === TokenType.COLON && this.isPlainIdentifierToken(token)) {
      return this.labeledStatement();
    }
    if (token.type === TokenType.СОБИТ && this.isEnumStart(1)) {
      this.advance();
      return this.enumDeclaration(token, true);
    }
    if (this.isEnumStart(0)) {
      return this.enumDeclaration(token, false);
    }
    if (token.type !== TokenType.IDENTIFIER) return null;
    if (Parser.DO_KEYWORDS.has(token.value) && next?.type === TokenType.LEFT_BRACE) {
      return this.doWhileStatement();
    }
    if (token.value === 'debugger') {
      this.advance();
      this.consumeSemicolon("Expected ';' after 'debugger'");
      return {
        type: 'DebuggerStatement',
        line: token.line,
        column: token.column,
      } as DebuggerStatement;
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // TypeScript declarations: decorators, `эълон`, `истифода`, overloads
  // ---------------------------------------------------------------------------

  /** `@ном`, `@а.б(1)`, `@(ифода)`: the decorators before a class, member or parameter. */
  private parseDecorators(): Decorator[] {
    const decorators: Decorator[] = [];
    while (this.match(TokenType.AT)) {
      const at = this.previous();
      decorators.push({
        type: 'Decorator',
        expression: this.decoratorExpression(),
        line: at.line,
        column: at.column,
      });
    }
    return decorators;
  }

  /**
   * As in TypeScript: a name with member accesses and at most one call
   * (`@а.б<Т>(1)`), or any expression in parentheses (`@(а[0])`).
   */
  private decoratorExpression(): Expression {
    if (this.match(TokenType.LEFT_PAREN)) {
      const expression = this.expression();
      this.consume(TokenType.RIGHT_PAREN, "Expected ')' after decorator expression");
      this.parenthesized.add(expression);
      return expression;
    }
    let expression = this.parseIdentifierExpression();
    if (!expression) {
      throw new Error(this.unexpectedTokenMessage("Expected decorator name after '@'"));
    }
    while (this.match(TokenType.DOT)) {
      expression = this.createMemberExpression(
        expression,
        this.parsePropertyName("Expected property name after '.'"),
        false
      );
    }
    const typeArguments = this.parseTypeArgumentsInExpression();
    if (this.match(TokenType.LEFT_PAREN)) {
      expression = this.finishCall(expression, typeArguments);
    } else if (typeArguments) {
      expression = this.createInstantiation(expression, typeArguments);
    }
    return expression;
  }

  /**
   * Statements of TypeScript declarations started by `@`, `эълон`,
   * `истифода` or `интизор истифода`; null for any other statement. The
   * words are keywords only here, so they remain usable as names elsewhere.
   */
  private typeScriptStatement(): Statement | null {
    const token = this.peek();
    let statement: Statement | null | undefined;
    if (token.type === TokenType.AT) {
      statement = this.decoratedStatement();
    } else if (this.isAmbientStart()) {
      statement = this.ambientDeclaration();
    } else if (this.isUsingStart(0)) {
      return this.usingDeclaration(false);
    } else if (token.type === TokenType.ИНТИЗОР && this.isUsingStart(1)) {
      return this.usingDeclaration(true);
    } else {
      return null;
    }
    // A statement that failed to parse (its error is recorded) leaves nothing
    return (
      statement ??
      ({ type: 'EmptyStatement', line: token.line, column: token.column } as EmptyStatement)
    );
  }

  /**
   * `@д синф К {}`, also before `мавҳум синф` and `содир [пешфарз]`
   * (`@д содир синф К {}`, like `содир @д синф К {}`).
   */
  private decoratedStatement(): Statement | null {
    const decorators = this.parseDecorators();
    return this.decorate(decorators, this.statement());
  }

  /**
   * Gives `decorators` to the class `statement` declares (also when it
   * exports it, `содир [пешфарз] синф`, or a class expression as the default
   * export); anywhere else they are an error.
   */
  private decorate(decorators: Decorator[], statement: Statement | null): Statement | null {
    let target =
      statement?.type === 'ExportDeclaration'
        ? (statement as ExportDeclaration).declaration
        : statement;
    if (target?.type === 'ExpressionStatement') {
      target = (target as ExpressionStatement).expression;
    }
    const isClass =
      target?.type === 'ClassExpression' ||
      (target?.type === 'ClassDeclaration' && !(target as ClassDeclaration).declare);
    if (!isClass) {
      this.reportInvalidDecorators(decorators);
      return statement;
    }
    const classNode = target as ClassDeclaration | ClassExpression;
    classNode.decorators = [...decorators, ...(classNode.decorators ?? [])];
    return statement;
  }

  /** `модул` / `module` after `эълон`: an ambient module (`эълон модул "ном" {…}`). */
  private static readonly MODULE_KEYWORDS: ReadonlySet<string> = new Set(['модул', 'module']);

  /** `глобалӣ` / `global` after `эълон`: global declarations (`эълон глобалӣ {…}`). */
  private static readonly GLOBAL_KEYWORDS: ReadonlySet<string> = new Set(['глобалӣ', 'global']);

  /** Declarations that may follow `эълон`. */
  private static readonly AMBIENT_DECLARATION_TOKENS: ReadonlySet<TokenType> = new Set([
    TokenType.СОБИТ,
    TokenType.ТАҒЙИРЁБАНДА,
    TokenType.ФУНКСИЯ,
    TokenType.ҲАМЗАМОН,
    TokenType.СИНФ,
    TokenType.МАВҲУМ,
    TokenType.НОМФАЗО,
    TokenType.ИНТЕРФЕЙС,
    TokenType.НАВЪ,
  ]);

  /**
   * `эълон` (or `declare`) followed, on its line, by a declaration: then it
   * starts an ambient declaration. Anywhere else it is an ordinary name.
   */
  private isAmbientStart(): boolean {
    const token = this.peek();
    const next = this.peekNext();
    if (
      token.type !== TokenType.IDENTIFIER ||
      !Parser.DECLARE_KEYWORDS.has(token.value) ||
      !next ||
      next.line !== token.line
    ) {
      return false;
    }
    if (Parser.AMBIENT_DECLARATION_TOKENS.has(next.type)) return true;
    if (next.type !== TokenType.IDENTIFIER) return false;
    const after = this.tokens[this.current + 2];
    if (Parser.MODULE_KEYWORDS.has(next.value)) {
      return after?.type === TokenType.STRING || after?.type === TokenType.IDENTIFIER;
    }
    if (Parser.GLOBAL_KEYWORDS.has(next.value)) return after?.type === TokenType.LEFT_BRACE;
    return this.isEnumStart(1);
  }

  /**
   * `эълон собит х: рақам;`, `эълон функсия ф(): Т;`, `эълон синф К { … }`,
   * `эълон шумориш`, `эълон номфазо`, `эълон модул "ном" { … }`,
   * `эълон глобалӣ { … }`: declarations of things that exist at run time
   * elsewhere. They give the type checker types and are erased in the output.
   */
  private ambientDeclaration(): Statement | null {
    const declareToken = this.advance();
    const outer = this.ambient;
    this.ambient = true;
    try {
      const keyword = this.peek();
      if (keyword.type === TokenType.IDENTIFIER && Parser.MODULE_KEYWORDS.has(keyword.value)) {
        this.advance();
        if (this.check(TokenType.STRING)) {
          return this.ambientModule(declareToken, this.advance());
        }
        // `эълон модул Ном { … }`: the older spelling of `эълон номфазо Ном { … }`
        return this.namespaceDeclaration();
      }
      if (keyword.type === TokenType.IDENTIFIER && Parser.GLOBAL_KEYWORDS.has(keyword.value)) {
        this.advance();
        return this.ambientModule(declareToken, undefined);
      }
      return this.statement();
    } finally {
      this.ambient = outer;
    }
  }

  /** The body of `эълон модул "ном" { … }` or `эълон глобалӣ { … }`. */
  private ambientModule(declareToken: Token, name: Token | undefined): AmbientModuleDeclaration {
    this.consume(TokenType.LEFT_BRACE, "Expected '{' after module name");
    const body: Statement[] = [];
    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      const statement = this.statement();
      if (statement) body.push(statement);
    }
    this.consume(TokenType.RIGHT_BRACE, "Expected '}' after module body");
    return {
      type: 'AmbientModuleDeclaration',
      ...(name ? { name: this.createLiteral(name.value, name) } : { global: true }),
      body,
      line: declareToken.line,
      column: declareToken.column,
    };
  }

  /**
   * Only a `собит` may have an initializer in an ambient context, and only a
   * literal one: TypeScript's TS1039 / TS1254.
   */
  private checkAmbientInitializer(kind: VariableDeclaration['kind'], init: Expression): void {
    let literal: Expression = init;
    if (literal.type === 'UnaryExpression' && (literal as UnaryExpression).operator === '-') {
      literal = (literal as UnaryExpression).argument;
    }
    const isLiteral =
      literal.type === 'Literal' ||
      (literal.type === 'TemplateLiteral' && (literal as TemplateLiteral).expressions.length === 0);
    if (kind === 'СОБИТ' && isLiteral) return;
    this.errors.push(
      `Initializers are not allowed in ambient contexts at line ${init.line}, column ${init.column}`
    );
  }

  /** `истифода` / `using`, the start of a using declaration. */
  private static readonly USING_KEYWORDS: ReadonlySet<string> = new Set(['истифода', 'using']);

  /** `истифода ном =` / `истифода ном:` starts `offset` tokens ahead, on one line. */
  private isUsingStart(offset: number): boolean {
    const keyword = this.tokens[this.current + offset];
    const name = this.tokens[this.current + offset + 1];
    const after = this.tokens[this.current + offset + 2]?.type;
    return (
      keyword?.type === TokenType.IDENTIFIER &&
      Parser.USING_KEYWORDS.has(keyword.value) &&
      name !== undefined &&
      name.line === keyword.line &&
      this.isPlainIdentifierToken(name) &&
      (after === TokenType.ASSIGN || after === TokenType.COLON)
    );
  }

  /**
   * `истифода манбаъ = кушодан();` (TypeScript `using`) and
   * `интизор истифода манбаъ = …;` (`await using`): constants whose value is
   * disposed of (`[Symbol.dispose]()` / `[Symbol.asyncDispose]()`) when the
   * block ends.
   */
  private usingDeclaration(isAwait: boolean): VariableDeclaration | VariableDeclarationList {
    const start = this.advance();
    if (isAwait) this.advance(); // 'истифода'
    const declarations = [this.variableDeclarator('СОБИТ', start, false)];
    while (this.match(TokenType.COMMA)) {
      declarations.push(this.variableDeclarator('СОБИТ', this.peek(), false));
    }
    this.consumeSemicolon("Expected ';' after variable declaration");
    const using = isAwait ? 'async' : 'sync';
    for (const declaration of declarations) {
      declaration.using = using;
      if (declaration.identifier.type !== 'Identifier') {
        this.errors.push(
          `'истифода' declarations may not have binding patterns at line ${declaration.line}, column ${declaration.column}`
        );
      }
    }
    if (declarations.length === 1) return declarations[0];
    return {
      type: 'VariableDeclarationList',
      kind: 'СОБИТ',
      declarations,
      using,
      line: start.line,
      column: start.column,
    };
  }

  /**
   * Each overload signature (`функсия ф(х: рақам): рақам;`) of a statement
   * list must be followed by another one or by the implementation, as in
   * TypeScript.
   */
  private checkOverloads(statements: Statement[]): void {
    statements.forEach((statement, index) => {
      const signature = this.unwrapExported(statement) as FunctionSignature;
      if (signature.type !== 'FunctionSignature' || signature.declare) return;
      const next = statements[index + 1] && this.unwrapExported(statements[index + 1]);
      const continues =
        (next?.type === 'FunctionSignature' || next?.type === 'FunctionDeclaration') &&
        (next as FunctionSignature).name.name === signature.name.name;
      if (!continues) {
        this.errors.push(
          `Function implementation is missing or not immediately following the declaration at line ${signature.line}, column ${signature.column}`
        );
      }
    });
  }

  /** `содир = х;` must be the module's only export (TypeScript's TS2309). */
  private checkExportAssignment(statements: Statement[]): void {
    const assignment = statements.find(statement => statement.type === 'ExportAssignment');
    const otherExport = statements.some(
      statement =>
        statement.type === 'ExportDeclaration' &&
        (statement as ExportDeclaration).exportKind !== 'type' &&
        !['InterfaceDeclaration', 'TypeAlias'].includes(
          (statement as ExportDeclaration).declaration?.type ?? ''
        )
    );
    if (assignment && otherExport) {
      this.errors.push(
        `An export assignment cannot be used in a module with other exported elements at line ${assignment.line}, column ${assignment.column}`
      );
    }
  }

  private unwrapExported(statement: Statement): Statement {
    return statement.type === 'ExportDeclaration'
      ? ((statement as ExportDeclaration).declaration ?? statement)
      : statement;
  }

  private doWhileStatement(): DoWhileStatement {
    const doToken = this.advance();
    this.consume(TokenType.LEFT_BRACE, `Expected '{' after '${doToken.value}'`);
    const body = this.blockStatement();
    this.consume(TokenType.ТО, `Expected 'то' after the body of '${doToken.value}'`);
    this.consume(TokenType.LEFT_PAREN, "Expected '(' after 'то'");
    const test = this.expression();
    this.consume(TokenType.RIGHT_PAREN, "Expected ')' after do-while condition");
    // As in JavaScript, the ';' after the condition may be left out
    if (!this.match(TokenType.SEMICOLON)) this.noteOmittedSemicolon();

    return {
      type: 'DoWhileStatement',
      body,
      test,
      line: doToken.line,
      column: doToken.column,
    };
  }

  private labeledStatement(): LabeledStatement {
    const label = this.createIdentifier(this.advance());
    this.advance(); // ':'
    const body = this.statement()!;
    if (body && Parser.DECLARATION_TYPES.has(body.type)) {
      this.errors.push(
        `A declaration cannot be labeled at line ${body.line}, column ${body.column} (label '${label.name}')`
      );
    }
    return {
      type: 'LabeledStatement',
      label,
      body,
      line: label.line,
      column: label.column,
    };
  }

  /** `шумориш Ном {` (or `enum Ном {`) starts `offset` tokens ahead. */
  private isEnumStart(offset: number): boolean {
    const keyword = this.tokens[this.current + offset];
    const name = this.tokens[this.current + offset + 1];
    return (
      keyword?.type === TokenType.IDENTIFIER &&
      Parser.ENUM_KEYWORDS.has(keyword.value) &&
      name !== undefined &&
      this.isPlainIdentifierToken(name) &&
      this.tokens[this.current + offset + 2]?.type === TokenType.LEFT_BRACE
    );
  }

  /** `шумориш Ранг { Сурх, Сабз = 5, "номи дароз" = "х" }`, at the `шумориш` token. */
  private enumDeclaration(startToken: Token, isConst: boolean): EnumDeclaration {
    this.advance(); // 'шумориш' / 'enum'
    const name = this.createIdentifier(this.advance());
    this.consume(TokenType.LEFT_BRACE, "Expected '{' after enum name");

    const members: EnumMember[] = [];
    const names = new Set<string>();
    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      const member = this.enumMember();
      const memberName =
        member.id.type === 'Identifier' ? (member.id as Identifier).name : String(member.id.value);
      if (names.has(memberName)) {
        throw new Error(
          `Duplicate enum member '${memberName}' at line ${member.line}, column ${member.column}`
        );
      }
      names.add(memberName);
      members.push(member);
      if (!this.match(TokenType.COMMA)) break;
    }
    this.consume(TokenType.RIGHT_BRACE, "Expected '}' after enum members");

    return {
      type: 'EnumDeclaration',
      name,
      members,
      ...(isConst && { const: true }),
      ...(this.ambient && { declare: true }),
      line: startToken.line,
      column: startToken.column,
    };
  }

  private enumMember(): EnumMember {
    const token = this.peek();
    let id: Identifier | Literal;
    if (this.match(TokenType.STRING)) {
      id = this.createLiteral(token.value, token);
    } else if (this.isIdentifierNameToken(token)) {
      id = this.createIdentifier(this.advance());
    } else {
      throw new Error(this.unexpectedTokenMessage('Expected enum member name'));
    }
    const initializer = this.match(TokenType.ASSIGN) ? this.assignment() : undefined;
    return {
      type: 'EnumMember',
      id,
      ...(initializer && { initializer }),
      line: token.line,
      column: token.column,
    };
  }

  public forStatement(): ForStatement | ForInStatement | ForOfStatement {
    const forToken = this.previous();
    // `барои интизор (собит х аз …)`: for await
    const isAwait = this.match(TokenType.ИНТИЗОР);
    this.consume(
      TokenType.LEFT_PAREN,
      isAwait ? "Expected '(' after 'барои интизор'" : "Expected '(' after 'барои'"
    );

    const savedIndex = this.current;
    const loopType = this.detectForLoopType();

    let loop: ForStatement | ForInStatement | ForOfStatement;
    if (loopType.isForOf || loopType.isForIn) {
      loop = this.parseForOfOrForInLoop(forToken, loopType.isForOf);
    } else {
      this.current = savedIndex;
      loop = this.parseTraditionalForLoop(forToken);
    }

    if (isAwait && loop.type === 'ForOfStatement') {
      (loop as ForOfStatement).await = true;
    } else if (isAwait) {
      this.errors.push(
        `'барои интизор' needs a for-of loop ('аз') at line ${forToken.line}, column ${forToken.column}`
      );
    }
    return loop;
  }

  private detectForLoopType(): { isForOf: boolean; isForIn: boolean } {
    let lookaheadIndex = this.current;
    let isForOf = false;
    let isForIn = false;

    // `барои (истифода х аз …)`, `барои интизор (интизор истифода х аз …)`
    const usingOffset = this.check(TokenType.ИНТИЗОР) ? 1 : 0;
    if (
      this.isUsingWord(this.tokens[lookaheadIndex + usingOffset]) &&
      this.isOfWord(this.tokens[lookaheadIndex + usingOffset + 2])
    ) {
      return { isForOf: true, isForIn: false };
    }

    if (
      this.tokens[lookaheadIndex]?.type === TokenType.ТАҒЙИРЁБАНДА ||
      this.tokens[lookaheadIndex]?.type === TokenType.СОБИТ
    ) {
      lookaheadIndex++;
      const nextToken = this.tokens[lookaheadIndex];
      let afterBinding = -1;
      if (this.isTypeKeywordOrIdentifier(nextToken?.type)) {
        afterBinding = lookaheadIndex + 1;
      } else if (this.isPatternStart(nextToken?.type)) {
        // `[к, в]` / `{ а, б }`: skip the whole pattern, defaults included
        const close = this.findMatchingBracket(lookaheadIndex);
        if (close !== -1) afterBinding = close + 1;
      }
      const keyword = afterBinding === -1 ? undefined : this.tokens[afterBinding];
      isForOf = this.isOfWord(keyword);
      isForIn = keyword?.type === TokenType.ДАР;
    }
    return { isForOf, isForIn };
  }

  private isPatternStart(type: TokenType | undefined): boolean {
    return type === TokenType.LEFT_BRACKET || type === TokenType.LEFT_BRACE;
  }

  /** Index of the bracket closing the `(`, `[` or `{` at `openIndex`, or -1. */
  private findMatchingBracket(openIndex: number): number {
    let depth = 0;
    for (let i = openIndex; i < this.tokens.length; i++) {
      switch (this.tokens[i].type) {
        case TokenType.LEFT_PAREN:
        case TokenType.LEFT_BRACKET:
        case TokenType.LEFT_BRACE:
          depth++;
          break;
        case TokenType.RIGHT_PAREN:
        case TokenType.RIGHT_BRACKET:
        case TokenType.RIGHT_BRACE:
          if (--depth === 0) return i;
          break;
      }
    }
    return -1;
  }

  private isTypeKeywordOrIdentifier(type: TokenType | undefined): boolean {
    return (
      type === TokenType.IDENTIFIER ||
      type === TokenType.РАҚАМ ||
      type === TokenType.САТР ||
      type === TokenType.МАНТИҚӢ
    );
  }

  private isUsingWord(token: Token | undefined): boolean {
    return token?.type === TokenType.IDENTIFIER && Parser.USING_KEYWORDS.has(token.value);
  }

  private parseForOfOrForInLoop(
    forToken: Token,
    isForOf: boolean
  ): ForOfStatement | ForInStatement {
    const awaitUsing = this.check(TokenType.ИНТИЗОР);
    if (awaitUsing) this.advance();
    const varToken = this.advance();
    const using = this.isUsingWord(varToken) ? (awaitUsing ? 'async' : 'sync') : undefined;
    const kind = varToken.type === TokenType.ТАҒЙИРЁБАНДА ? 'ТАҒЙИРЁБАНДА' : 'СОБИТ';

    let id: Identifier | ArrayPattern | ObjectPattern;
    if (this.isPatternStart(this.peek().type)) {
      // Destructuring, as in a declaration: `[к, в = 0]`, `{ а, ...боқӣ }`
      id = this.parsePattern();
    } else {
      const nameToken = this.isTypeKeywordOrIdentifier(this.peek().type)
        ? this.advance()
        : this.consume(TokenType.IDENTIFIER, 'Expected variable name');

      id = {
        type: 'Identifier',
        name: nameToken.value,
        line: nameToken.line,
        column: nameToken.column,
      };
    }

    if (isForOf) {
      if (!this.isOfWord(this.peek())) {
        throw new Error(this.unexpectedTokenMessage("Expected 'аз' in for-of loop"));
      }
      this.advance();
    } else {
      this.consume(TokenType.ДАР, "Expected 'дар' in for-in loop");
    }

    const right = this.assignment();
    this.consume(TokenType.RIGHT_PAREN, "Expected ')' after for-of/for-in clauses");
    const body = this.statement()!;

    const left: VariableDeclaration = {
      type: 'VariableDeclaration',
      kind,
      identifier: id,
      init: undefined,
      ...(using && { using }),
      line: id.line,
      column: id.column,
    };

    return {
      type: isForOf ? 'ForOfStatement' : 'ForInStatement',
      left,
      right,
      body,
      line: forToken.line,
      column: forToken.column,
    } as ForOfStatement | ForInStatement;
  }

  private parseTraditionalForLoop(forToken: Token): ForStatement {
    let init: VariableDeclaration | VariableDeclarationList | ExpressionStatement | null = null;
    if (this.match(TokenType.ТАҒЙИРЁБАНДА, TokenType.СОБИТ)) {
      // `барои (тағ и = 0, ҷ = н - 1; …)`
      init = this.variableDeclaration(false);
    } else if (!this.check(TokenType.SEMICOLON)) {
      init = this.expressionStatement();
    }

    if (init && init.type === 'ExpressionStatement') {
      // ExpressionStatement already consumed the semicolon
    } else if (!init) {
      this.consume(TokenType.SEMICOLON, "Expected ';' after for loop initializer");
    }

    let test: Expression | null = null;
    if (!this.check(TokenType.SEMICOLON)) {
      test = this.expression();
    }
    this.consume(TokenType.SEMICOLON, "Expected ';' after for loop condition");

    let update: Expression | null = null;
    if (!this.check(TokenType.RIGHT_PAREN)) {
      update = this.expression();
    }
    this.consume(TokenType.RIGHT_PAREN, "Expected ')' after for clauses");

    const body = this.statement()!;

    return {
      type: 'ForStatement',
      init,
      test,
      update,
      body,
      line: forToken.line,
      column: forToken.column,
    };
  }

  private returnStatement(): ReturnStatement {
    const returnToken = this.previous();

    // As in JavaScript, a line break right after 'бозгашт' ends the statement
    let argument: Expression | undefined;
    if (
      !this.check(TokenType.SEMICOLON) &&
      !this.check(TokenType.RIGHT_BRACE) &&
      !this.isAtEnd() &&
      !this.hasLineBreakBefore()
    ) {
      argument = this.expression();
    }

    this.consumeSemicolon("Expected ';' after return value");

    return {
      type: 'ReturnStatement',
      argument,
      line: returnToken.line,
      column: returnToken.column,
    };
  }

  private expressionStatement(): ExpressionStatement {
    const expr = this.expression();
    this.consumeSemicolon("Expected ';' after expression");

    return {
      type: 'ExpressionStatement',
      expression: expr,
      line: expr.line,
      column: expr.column,
    };
  }

  /** Full expression, including the comma operator: `а++, б--`. */
  private expression(): Expression {
    const expr = this.assignment();
    if (!this.check(TokenType.COMMA)) {
      return expr;
    }

    const expressions = [expr];
    while (this.match(TokenType.COMMA)) {
      expressions.push(this.assignment());
    }
    return {
      type: 'SequenceExpression',
      expressions,
      line: expr.line,
      column: expr.column,
    } as SequenceExpression;
  }

  private static readonly ASSIGNMENT_OPERATORS: readonly TokenType[] = [
    TokenType.ASSIGN,
    TokenType.PLUS_ASSIGN,
    TokenType.MINUS_ASSIGN,
    TokenType.MULTIPLY_ASSIGN,
    TokenType.DIVIDE_ASSIGN,
    TokenType.MODULO_ASSIGN,
    TokenType.EXPONENT_ASSIGN,
    TokenType.BITWISE_AND_ASSIGN,
    TokenType.BITWISE_OR_ASSIGN,
    TokenType.BITWISE_XOR_ASSIGN,
    TokenType.LEFT_SHIFT_ASSIGN,
    TokenType.RIGHT_SHIFT_ASSIGN,
    TokenType.UNSIGNED_RIGHT_SHIFT_ASSIGN,
    TokenType.NULLISH_ASSIGN,
    TokenType.OR_ASSIGN,
    TokenType.AND_ASSIGN,
  ];

  private assignment(): Expression {
    try {
      this.enterNesting();

      if (this.isYieldKeyword(this.peek())) {
        return this.yieldExpression();
      }

      const arrowFunc = this.tryParseArrowFunction();
      if (arrowFunc) {
        return arrowFunc;
      }

      const expr = this.conditional();

      if (this.match(...Parser.ASSIGNMENT_OPERATORS)) {
        const operator = this.previous();
        if (!this.isAssignmentTarget(expr, operator.type === TokenType.ASSIGN)) {
          throw new Error(
            `Invalid left-hand side in assignment at line ${operator.line}, column ${operator.column}`
          );
        }
        const value = this.assignment();

        return {
          type: 'AssignmentExpression',
          left: expr,
          operator: operator.value,
          right: value,
          line: expr.line,
          column: expr.column,
        } as AssignmentExpression;
      }

      return expr;
    } finally {
      this.depth--;
    }
  }

  /**
   * Whether `expr` may be assigned to: a variable or a (non-optional) member
   * and, for plain `=`, an array/object literal read as a destructuring
   * pattern whose elements are targets themselves.
   */
  private isAssignmentTarget(expr: Expression, allowPattern: boolean): boolean {
    switch (expr.type) {
      case 'Identifier':
        return true;
      case 'MemberExpression':
        return !(expr as MemberExpression).optional;
      case 'NonNullExpression':
      case 'AsExpression':
      case 'TypeAssertion':
        // `х! = 1`, `(х чун ҳар) = 1`: the assertion is erased
        return this.isAssignmentTarget((expr as NonNullExpression).expression, false);
      case 'ArrayPattern':
      case 'ObjectPattern':
        return allowPattern;
      case 'ArrayExpression':
        return (
          allowPattern &&
          !this.parenthesized.has(expr) &&
          (expr as ArrayExpression).elements.every(
            element => !element || this.isPatternElement(element)
          )
        );
      case 'ObjectExpression':
        return (
          allowPattern &&
          !this.parenthesized.has(expr) &&
          (expr as ObjectExpression).properties.every(property =>
            property.type === 'SpreadElement'
              ? this.isPatternElement(property)
              : !property.method && this.isPatternElement(property.value)
          )
        );
      default:
        return false;
    }
  }

  /** An element of a destructuring assignment: a target, `...target` or `target = default`. */
  private isPatternElement(element: Expression): boolean {
    if (element.type === 'SpreadElement') {
      return this.isAssignmentTarget((element as SpreadElement).argument, true);
    }
    if (element.type === 'AssignmentExpression') {
      const assignment = element as AssignmentExpression;
      return assignment.operator === '=' && !this.parenthesized.has(element);
    }
    return this.isAssignmentTarget(element, true);
  }

  private checkUpdateOperand(argument: Expression, operator: Token): void {
    if (!this.isAssignmentTarget(argument, false)) {
      throw new Error(
        `Invalid operand for '${operator.value}' at line ${operator.line}, column ${operator.column}; expected a variable or property`
      );
    }
  }

  /**
   * Parses an arrow function if one starts here: `х => …`, `(а, б = 1, ...в) => …`,
   * `({ а }): рақам => …`, optionally prefixed with `ҳамзамон`. Returns null otherwise.
   */
  private tryParseArrowFunction(): ArrowFunctionExpression | null {
    const startToken = this.peek();
    const offset = this.isAsyncArrowStart() ? 1 : 0;
    const head = this.tokens[this.current + offset];
    if (!head) return null;

    let params: Parameter[];
    let returnType: TypeAnnotation | undefined;
    let typeParameters: TypeParameter[] | undefined;

    if (head.type === TokenType.LESS_THAN) {
      const generic = this.tryParseGenericArrowHead(offset);
      if (!generic) return null;
      ({ typeParameters, params, returnType } = generic);
    } else if (
      this.isPlainIdentifierToken(head) &&
      this.tokens[this.current + offset + 1]?.type === TokenType.ARROW
    ) {
      // Single parameter without parentheses
      this.current += offset;
      const identifier = this.createIdentifier(this.advance());
      this.advance(); // consume '=>'
      params = [
        {
          type: 'Parameter',
          name: identifier,
          line: identifier.line,
          column: identifier.column,
        },
      ];
    } else if (head.type === TokenType.LEFT_PAREN) {
      const close = this.findMatchingParen(this.current + offset);
      const after = close >= 0 ? this.tokens[close + 1]?.type : undefined;
      if (after === TokenType.ARROW) {
        this.current += offset + 1; // consume [ҳамзамон] '('
        params = this.withGenerator(false, () =>
          this.parseParameterList("Expected ')' after arrow function parameters")
        );
        this.consume(TokenType.ARROW, "Expected '=>' after arrow function parameters");
      } else if (after === TokenType.COLON) {
        // `(…): Т => …` or a parenthesized conditional branch `а ? (б) : в`
        const head = this.speculate(() => {
          this.current += offset + 1;
          const list = this.withGenerator(false, () =>
            this.parseParameterList("Expected ')' after arrow function parameters")
          );
          this.consume(TokenType.COLON, "Expected ':' before return type");
          const type = this.returnTypeAnnotation();
          this.consume(TokenType.ARROW, "Expected '=>' after return type");
          return { list, type };
        });
        if (!head) return null;
        params = head.list;
        returnType = head.type;
      } else {
        return null;
      }
    } else {
      return null;
    }

    // An arrow function is never a generator, even inside one
    const body = this.withGenerator(false, () => this.parseArrowFunctionBody());

    const arrow = {
      type: 'ArrowFunctionExpression',
      params,
      body,
      returnType,
      line: startToken.line,
      column: startToken.column,
    } as ArrowFunctionExpression;
    if (offset) arrow.isAsync = true;
    if (typeParameters) arrow.typeParameters = typeParameters;
    return arrow;
  }

  /**
   * `ҳамзамон` / `async` before the parameters of an arrow function. `async`
   * alone is a name: `async => 1`, `async(1)` (a call when no `=>` follows).
   */
  private isAsyncArrowStart(): boolean {
    const next = this.peekNext();
    if (!this.isAsyncWord() || !next) return false;
    if (this.check(TokenType.ҲАМЗАМОН)) return true;
    return (
      next.type === TokenType.LEFT_PAREN ||
      next.type === TokenType.LESS_THAN ||
      (this.isPlainIdentifierToken(next) && this.tokens[this.current + 2]?.type === TokenType.ARROW)
    );
  }

  /**
   * Head of a generic arrow function, `<Т, К мерос сатр,>(х: Т): К =>`, up to
   * and including '=>'. As in TypeScript (.ts files), a '<' that starts an
   * expression begins one when a name follows and the rest parses as an arrow
   * head; otherwise it is the type assertion `<Т>х` (see `unary`), and
   * nothing is consumed here.
   */
  private tryParseGenericArrowHead(
    offset: number
  ): { typeParameters: TypeParameter[]; params: Parameter[]; returnType?: TypeAnnotation } | null {
    const name = this.tokens[this.current + offset + 1];
    const afterName = this.tokens[this.current + offset + 2];
    // `<собит Т>(х: Т) => х`: a modifier before the first name
    const modified =
      name !== undefined &&
      this.typeParameterModifier(name) !== undefined &&
      afterName !== undefined &&
      this.startsTypeParameter(afterName);
    if (!name || (!this.isPlainIdentifierToken(name) && !modified)) return null;
    return this.speculate(() => {
      this.current += offset;
      const typeParameters = this.parseTypeParameters()!;
      this.checkTypeParameterModifiers(typeParameters, 'function');
      this.consume(TokenType.LEFT_PAREN, "Expected '(' after type parameters");
      const params = this.parseParameterList("Expected ')' after arrow function parameters");
      const returnType = this.match(TokenType.COLON) ? this.returnTypeAnnotation() : undefined;
      this.consume(TokenType.ARROW, "Expected '=>' after arrow function parameters");
      return { typeParameters, params, returnType };
    });
  }

  /** Index of the ')' matching the '(' at `openIndex`, or -1. */
  private findMatchingParen(openIndex: number): number {
    let depth = 0;
    for (let i = openIndex; i < this.tokens.length; i++) {
      const type = this.tokens[i].type;
      if (type === TokenType.LEFT_PAREN) depth++;
      else if (type === TokenType.RIGHT_PAREN && --depth === 0) return i;
    }
    return -1;
  }

  /**
   * Runs `parse`; when it throws or returns undefined, restores the position,
   * the errors, the omitted semicolons and every `>>` it split (see
   * `consumeTypeArgumentsClose`), and returns null.
   */
  private speculate<T>(parse: () => T | undefined): T | null {
    const savedIndex = this.current;
    const savedErrors = this.errors.length;
    const savedOmitted = this.omittedSemicolons.length;
    const outerSplits = this.tokenSplits;
    const splits: Array<{ index: number; token: Token }> = [];
    this.tokenSplits = splits;
    let result: T | undefined;
    try {
      result = parse();
    } catch (error) {
      if (this.isNestingError(error)) throw error;
      result = undefined;
    } finally {
      this.tokenSplits = outerSplits;
    }
    if (result !== undefined) {
      outerSplits?.push(...splits);
      return result;
    }
    for (const split of splits.reverse()) this.tokens.splice(split.index, 2, split.token);
    this.current = savedIndex;
    this.errors.length = savedErrors;
    this.omittedSemicolons.length = savedOmitted;
    return null;
  }

  /** Like `speculate`, but an error `parse` records also makes it fail. */
  private speculateCleanly<T>(parse: () => T | undefined): T | null {
    return this.speculate(() => {
      const errorCount = this.errors.length;
      const result = parse();
      return this.errors.length === errorCount ? result : undefined;
    });
  }

  private parseArrowFunctionBody(): BlockStatement | Expression {
    if (this.match(TokenType.LEFT_BRACE)) {
      return this.blockStatement();
    }
    // Expression body
    return this.assignment();
  }

  private conditional(): Expression {
    const test = this.coalesce();
    if (!this.match(TokenType.QUESTION)) {
      return test;
    }

    const consequent = this.assignment();
    this.consume(TokenType.COLON, "Expected ':' in conditional expression");
    const alternate = this.assignment();

    return {
      type: 'ConditionalExpression',
      test,
      consequent,
      alternate,
      line: test.line,
      column: test.column,
    } as ConditionalExpression;
  }

  /** `а ?? б`; mixing with unparenthesized `&&`/`||` is a syntax error, as in JavaScript. */
  private coalesce(): Expression {
    let expr = this.or();
    if (!this.check(TokenType.NULLISH_COALESCING)) {
      return expr;
    }

    if (this.isUnparenthesizedLogical(expr)) {
      throw new Error(this.nullishMixingMessage());
    }

    while (this.match(TokenType.NULLISH_COALESCING)) {
      const operator = this.previous();
      const right = this.bitwiseOr();
      expr = {
        type: 'BinaryExpression',
        left: expr,
        operator: operator.value,
        right,
        line: expr.line,
        column: expr.column,
      } as BinaryExpression;
    }

    if (this.check(TokenType.OR) || this.check(TokenType.AND)) {
      throw new Error(this.nullishMixingMessage());
    }
    return expr;
  }

  private isUnparenthesizedLogical(expr: Expression): boolean {
    if (expr.type !== 'BinaryExpression' || this.parenthesized.has(expr)) return false;
    const operator = (expr as BinaryExpression).operator;
    return operator === '||' || operator === '&&';
  }

  private nullishMixingMessage(): string {
    const token = this.peek();
    return `Cannot mix '??' with '||' or '&&' without parentheses at line ${token.line}, column ${token.column}`;
  }

  private or(): Expression {
    let expr = this.and();

    while (this.match(TokenType.OR)) {
      const operator = this.previous();
      const right = this.and();
      expr = {
        type: 'BinaryExpression',
        left: expr,
        operator: operator.value,
        right,
        line: expr.line,
        column: expr.column,
      } as BinaryExpression;
    }

    return expr;
  }

  private and(): Expression {
    let expr = this.bitwiseOr();

    while (this.match(TokenType.AND)) {
      const operator = this.previous();
      const right = this.bitwiseOr();
      expr = {
        type: 'BinaryExpression',
        left: expr,
        operator: operator.value,
        right,
        line: expr.line,
        column: expr.column,
      } as BinaryExpression;
    }

    return expr;
  }

  private bitwiseOr(): Expression {
    let expr = this.bitwiseXor();

    while (this.match(TokenType.BITWISE_OR)) {
      const operator = this.previous();
      const right = this.bitwiseXor();
      expr = {
        type: 'BinaryExpression',
        left: expr,
        operator: operator.value,
        right,
        line: expr.line,
        column: expr.column,
      } as BinaryExpression;
    }

    return expr;
  }

  private bitwiseXor(): Expression {
    let expr = this.bitwiseAnd();

    while (this.match(TokenType.BITWISE_XOR)) {
      const operator = this.previous();
      const right = this.bitwiseAnd();
      expr = {
        type: 'BinaryExpression',
        left: expr,
        operator: operator.value,
        right,
        line: expr.line,
        column: expr.column,
      } as BinaryExpression;
    }

    return expr;
  }

  private bitwiseAnd(): Expression {
    let expr = this.equality();

    while (this.match(TokenType.BITWISE_AND)) {
      const operator = this.previous();
      const right = this.equality();
      expr = {
        type: 'BinaryExpression',
        left: expr,
        operator: operator.value,
        right,
        line: expr.line,
        column: expr.column,
      } as BinaryExpression;
    }

    return expr;
  }

  private equality(): Expression {
    let expr = this.comparison();

    while (
      this.match(
        TokenType.EQUAL,
        TokenType.NOT_EQUAL,
        TokenType.STRICT_EQUAL,
        TokenType.STRICT_NOT_EQUAL
      )
    ) {
      const operator = this.previous();
      const right = this.comparison();
      expr = {
        type: 'BinaryExpression',
        left: expr,
        operator: operator.value,
        right,
        line: expr.line,
        column: expr.column,
      } as BinaryExpression;
    }

    return expr;
  }

  private comparison(): Expression {
    let expr = this.privateNameInOperand() ?? this.shift();

    // eslint-disable-next-line no-constant-condition
    while (true) {
      let operator: string;
      if (
        this.match(
          TokenType.GREATER_THAN,
          TokenType.GREATER_EQUAL,
          TokenType.LESS_THAN,
          TokenType.LESS_EQUAL
        )
      ) {
        operator = this.previous().value;
      } else if (this.check(TokenType.ДАР) || this.checkIdentifierValue('in')) {
        this.advance();
        operator = 'in';
      } else if (this.checkIdentifierValue('instanceof')) {
        this.advance();
        operator = 'instanceof';
      } else if (this.typeOperator()) {
        expr = this.parseTypeOperator(expr);
        continue;
      } else {
        break;
      }

      const right = this.shift();
      expr = {
        type: 'BinaryExpression',
        left: expr,
        operator,
        right,
        line: expr.line,
        column: expr.column,
      } as BinaryExpression;
    }

    return expr;
  }

  /**
   * The type operator at the current token, if any: `чун` / `as` (type
   * assertion) or `бармесоё` / `satisfies`. As in TypeScript they bind like
   * relational operators. `бармесоё`, `as` and `satisfies` are also ordinary
   * names, so they are operators only on the line of their operand.
   */
  private typeOperator(): 'as' | 'satisfies' | undefined {
    if (this.check(TokenType.ЧУН)) return 'as';
    if (this.hasLineBreakBefore()) return undefined;
    if (this.checkIdentifierValue('as')) return 'as';
    if (this.check(TokenType.БАРМЕСОЁ) || this.checkIdentifierValue('satisfies')) {
      return 'satisfies';
    }
    return undefined;
  }

  /** `х чун Т`, `х чун собит` (`as const`) or `х бармесоё Т`; types are erased. */
  private parseTypeOperator(expression: Expression): Expression {
    const operator = this.typeOperator();
    this.advance();
    const position = { line: expression.line, column: expression.column };
    if (operator === 'satisfies') {
      return {
        type: 'SatisfiesExpression',
        expression,
        typeAnnotation: this.parseType(),
        ...position,
      } as SatisfiesExpression;
    }
    if (this.matchConstKeyword()) {
      return { type: 'AsExpression', expression, isConst: true, ...position } as AsExpression;
    }
    return {
      type: 'AsExpression',
      expression,
      typeAnnotation: this.parseType(),
      ...position,
    } as AsExpression;
  }

  /** `собит` (or `const`) in `чун собит` / `<собит>`. */
  private matchConstKeyword(): boolean {
    if (this.check(TokenType.СОБИТ) || this.checkIdentifierValue('const')) {
      this.advance();
      return true;
    }
    return false;
  }

  /**
   * `<Т>х` / `<собит>х`: TypeScript's prefix type assertion. A '<' starting
   * a generic arrow function never gets here (see `tryParseGenericArrowHead`).
   */
  private parseTypeAssertion(): TypeAssertion {
    const open = this.advance();
    const isConst = this.peekNext()?.type === TokenType.GREATER_THAN && this.matchConstKeyword();
    const typeAnnotation = isConst ? undefined : this.parseType();
    this.consumeTypeArgumentsClose("Expected '>' after the type of a type assertion");
    const expression = this.unary();
    return {
      type: 'TypeAssertion',
      expression,
      ...(isConst ? { isConst } : { typeAnnotation }),
      line: open.line,
      column: open.column,
    } as TypeAssertion;
  }

  /** `#ном` directly before `in`/`дар` (the brand check `#ном in о`); anywhere else it is an error. */
  private privateNameInOperand(): PrivateIdentifier | undefined {
    const next = this.peekNext();
    const beforeIn =
      next?.type === TokenType.ДАР || (next?.type === TokenType.IDENTIFIER && next.value === 'in');
    if (!this.check(TokenType.PRIVATE_NAME) || !beforeIn) return undefined;
    return this.createMemberKey(this.advance()) as PrivateIdentifier;
  }

  private shift(): Expression {
    let expr = this.term();

    while (
      this.match(TokenType.LEFT_SHIFT, TokenType.RIGHT_SHIFT, TokenType.UNSIGNED_RIGHT_SHIFT)
    ) {
      const operator = this.previous();
      const right = this.term();
      expr = {
        type: 'BinaryExpression',
        left: expr,
        operator: operator.value,
        right,
        line: expr.line,
        column: expr.column,
      } as BinaryExpression;
    }

    return expr;
  }

  private term(): Expression {
    let expr = this.factor();

    while (this.match(TokenType.MINUS, TokenType.PLUS)) {
      const operator = this.previous();
      const right = this.factor();
      expr = {
        type: 'BinaryExpression',
        left: expr,
        operator: operator.value,
        right,
        line: expr.line,
        column: expr.column,
      } as BinaryExpression;
    }

    return expr;
  }

  private factor(): Expression {
    let expr = this.exponent();

    while (this.match(TokenType.DIVIDE, TokenType.MULTIPLY, TokenType.MODULO)) {
      const operator = this.previous();
      const right = this.exponent();
      expr = {
        type: 'BinaryExpression',
        left: expr,
        operator: operator.value,
        right,
        line: expr.line,
        column: expr.column,
      } as BinaryExpression;
    }

    return expr;
  }

  /** `а ** б`, right-associative. A unary operand on the left needs parentheses, as in JavaScript. */
  private exponent(): Expression {
    try {
      this.enterNesting();
      const left = this.unary();
      if (!this.check(TokenType.EXPONENT)) {
        return left;
      }

      if (
        (left.type === 'UnaryExpression' ||
          left.type === 'AwaitExpression' ||
          left.type === 'TypeAssertion') &&
        !this.parenthesized.has(left)
      ) {
        const token = this.peek();
        const operand = left.type === 'TypeAssertion' ? 'Type assertion' : 'Unary operator';
        throw new Error(
          `${operand} before '**' must be parenthesized at line ${token.line}, column ${token.column}`
        );
      }

      const operator = this.advance();
      const right = this.exponent();
      return {
        type: 'BinaryExpression',
        left,
        operator: operator.value,
        right,
        line: left.line,
        column: left.column,
      } as BinaryExpression;
    } finally {
      this.depth--;
    }
  }

  private unary(): Expression {
    try {
      this.enterNesting();

      if (this.match(TokenType.NOT, TokenType.MINUS, TokenType.PLUS, TokenType.BITWISE_NOT)) {
        const operator = this.previous();
        const right = this.unary();
        return {
          type: 'UnaryExpression',
          operator: operator.value,
          argument: right,
          line: operator.line,
          column: operator.column,
        } as UnaryExpression;
      }

      const keywordOperator = this.unaryKeywordOperator();
      if (keywordOperator) {
        const operatorToken = this.advance();
        const argument = this.unary();
        return {
          type: 'UnaryExpression',
          operator: keywordOperator,
          argument,
          line: operatorToken.line,
          column: operatorToken.column,
        } as UnaryExpression;
      }

      if (this.match(TokenType.INCREMENT, TokenType.DECREMENT)) {
        const operator = this.previous();
        const argument = this.unary();
        this.checkUpdateOperand(argument, operator);
        return {
          type: 'UpdateExpression',
          operator: operator.value,
          argument,
          prefix: true,
          line: operator.line,
          column: operator.column,
        } as UpdateExpression;
      }

      if (this.match(TokenType.ИНТИЗОР)) {
        const awaitToken = this.previous();
        const argument = this.unary();
        return {
          type: 'AwaitExpression',
          argument,
          line: awaitToken.line,
          column: awaitToken.column,
        } as AwaitExpression;
      }

      // A '<' can only start an operand as the type assertion `<Т>х`
      if (this.check(TokenType.LESS_THAN)) {
        return this.parseTypeAssertion();
      }

      return this.call();
    } finally {
      this.depth--;
    }
  }

  /**
   * `навъи` / `typeof`, `void` and `delete` act as unary operators when an
   * operand follows; otherwise they are ordinary identifiers.
   */
  private unaryKeywordOperator(): string | null {
    const token = this.peek();
    let operator: string | null = null;
    if (token.type === TokenType.НАВЪИ) {
      operator = 'typeof';
    } else if (token.type === TokenType.IDENTIFIER && Parser.UNARY_KEYWORDS.has(token.value)) {
      operator = token.value;
    }
    if (!operator) return null;

    const next = this.peekNext();
    if (!next) return null;
    const startsOperand =
      this.isIdentifierNameToken(next) ||
      [
        TokenType.NUMBER,
        TokenType.STRING,
        TokenType.TEMPLATE_LITERAL,
        TokenType.REGEX,
        TokenType.LEFT_PAREN,
        TokenType.LEFT_BRACKET,
        TokenType.NOT,
        TokenType.BITWISE_NOT,
      ].includes(next.type);
    return startsOperand ? operator : null;
  }

  private static readonly UNARY_KEYWORDS: ReadonlySet<string> = new Set([
    'typeof',
    'void',
    'delete',
  ]);

  private checkIdentifierValue(value: string): boolean {
    return this.check(TokenType.IDENTIFIER) && this.peek().value === value;
  }

  private call(): Expression {
    const expr = this.primary();
    return this.applyCallChaining(expr);
  }

  private applyCallChaining(expr: Expression): Expression {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const typeArguments = this.parseTypeArgumentsInExpression();
      if (typeArguments) {
        expr = this.applyTypeArguments(expr, typeArguments);
      } else if (this.match(TokenType.LEFT_PAREN)) {
        expr = this.finishCall(expr);
      } else if (this.match(TokenType.DOT)) {
        this.checkInstantiationAccess(expr);
        expr = this.createMemberExpression(
          expr,
          this.parsePropertyName("Expected property name after '.'"),
          false
        );
      } else if (this.match(TokenType.OPTIONAL_CHAINING)) {
        expr = this.optionalLink(expr);
      } else if (this.match(TokenType.LEFT_BRACKET)) {
        // Computed member expression: obj[expr]
        const property = this.expression();
        this.consume(TokenType.RIGHT_BRACKET, "Expected ']' after computed property");
        expr = this.createMemberExpression(expr, property, true);
      } else if (this.checkNonNullAssertion()) {
        expr = this.createNonNullExpression(expr);
      } else if (this.check(TokenType.TEMPLATE_LITERAL)) {
        expr = this.parseTaggedTemplate(expr);
      } else if (this.match(TokenType.INCREMENT, TokenType.DECREMENT)) {
        // Postfix increment/decrement
        const operator = this.previous();
        this.checkUpdateOperand(expr, operator);
        expr = {
          type: 'UpdateExpression',
          operator: operator.value,
          argument: expr,
          prefix: false,
          line: expr.line,
          column: expr.column,
        } as UpdateExpression;
      } else {
        break;
      }
    }

    return expr;
  }

  /**
   * After `?.`: an optional call `ф?.(…)` (also with type arguments,
   * `ф?.<Т>(…)`), element `о?.[к]` or property `о?.ном`.
   */
  private optionalLink(expr: Expression): Expression {
    const typeArguments = this.parseTypeArgumentsInExpression();
    if (this.match(TokenType.LEFT_PAREN)) {
      const call = this.finishCall(expr, typeArguments);
      call.optional = true;
      return call;
    }
    if (typeArguments) {
      throw new Error(this.unexpectedTokenMessage("Expected '(' after type arguments"));
    }
    let member: MemberExpression;
    if (this.match(TokenType.LEFT_BRACKET)) {
      const property = this.expression();
      this.consume(TokenType.RIGHT_BRACKET, "Expected ']' after computed property");
      member = this.createMemberExpression(expr, property, true);
    } else {
      this.checkInstantiationAccess(expr);
      member = this.createMemberExpression(
        expr,
        this.parsePropertyName("Expected property name after '?.'"),
        false
      );
    }
    member.optional = true;
    return member;
  }

  /**
   * Type arguments after an operand: a call `ф<Т>(…)`, a tagged template
   * `т<Т>\`…\`` or, followed by anything else, an instantiation expression `ф<Т>`.
   */
  private applyTypeArguments(expr: Expression, typeArguments: TypeNode[]): Expression {
    if (this.match(TokenType.LEFT_PAREN)) return this.finishCall(expr, typeArguments);
    if (this.check(TokenType.TEMPLATE_LITERAL)) {
      return this.parseTaggedTemplate(expr, typeArguments);
    }
    return this.createInstantiation(expr, typeArguments);
  }

  private createInstantiation(
    expression: Expression,
    typeArguments: TypeNode[]
  ): InstantiationExpression {
    return {
      type: 'InstantiationExpression',
      expression,
      typeArguments,
      line: expression.line,
      column: expression.column,
    } as InstantiationExpression;
  }

  /** TypeScript's TS1477: `ф<Т>.ном` is an error (`(ф<Т>).ном` is not). */
  private checkInstantiationAccess(expr: Expression): void {
    if (expr.type !== 'InstantiationExpression' || this.parenthesized.has(expr)) return;
    const token = this.previous();
    this.errors.push(
      `An instantiation expression cannot be followed by a property access at line ${token.line}, column ${token.column}`
    );
  }

  /**
   * A '!' right after an operand, on its line, is the non-null assertion
   * `х!` (as in TypeScript); `!=` and `!==` are separate tokens.
   */
  private checkNonNullAssertion(): boolean {
    return this.check(TokenType.NOT) && !this.hasLineBreakBefore();
  }

  private createNonNullExpression(expression: Expression): NonNullExpression {
    this.advance(); // '!'
    return {
      type: 'NonNullExpression',
      expression,
      line: expression.line,
      column: expression.column,
    } as NonNullExpression;
  }

  private createMemberExpression(
    object: Expression,
    property: Expression,
    computed: boolean
  ): MemberExpression {
    return {
      type: 'MemberExpression',
      object,
      property,
      computed,
      line: object.line,
      column: object.column,
    } as MemberExpression;
  }

  /**
   * A template literal right after a member/call expression tags it, as in
   * JavaScript (also across a line break): `тег\`…\``, `о.метод\`…\``.
   */
  private parseTaggedTemplate(
    tag: Expression,
    typeArguments?: TypeNode[]
  ): TaggedTemplateExpression {
    const template = this.peek();
    if (this.containsOptionalLink(tag)) {
      throw new Error(
        `Invalid tagged template on optional chain at line ${template.line}, column ${template.column}`
      );
    }
    this.advance();
    return {
      type: 'TaggedTemplateExpression',
      tag,
      quasi: this.parseTemplateLiteral(true),
      ...(typeArguments && { typeArguments }),
      line: tag.line,
      column: tag.column,
    } as TaggedTemplateExpression;
  }

  /** Property name after '.' or '?.': any identifier or keyword, or a private name (`ин.#х`). */
  private parsePropertyName(message: string): Identifier | PrivateIdentifier {
    if (this.check(TokenType.PRIVATE_NAME)) {
      return this.createMemberKey(this.advance());
    }
    if (!this.isIdentifierNameToken(this.peek())) {
      throw new Error(this.unexpectedTokenMessage(message));
    }
    return this.createIdentifier(this.advance());
  }

  /** Name of a class member: an identifier, or a `PrivateIdentifier` for `#ном`. */
  private createMemberKey(token: Token): Identifier | PrivateIdentifier {
    if (token.type !== TokenType.PRIVATE_NAME) return this.createIdentifier(token);
    return {
      type: 'PrivateIdentifier',
      name: token.value.slice(1),
      line: token.line,
      column: token.column,
    } as PrivateIdentifier;
  }

  /** Identifiers and keywords: every token whose text is a word. */
  private isIdentifierNameToken(token: Token): boolean {
    if (token.type === TokenType.IDENTIFIER) return true;
    if (
      token.type === TokenType.STRING ||
      token.type === TokenType.NUMBER ||
      token.type === TokenType.TEMPLATE_LITERAL ||
      token.type === TokenType.EOF
    ) {
      return false;
    }
    return /^[\p{L}_$][\p{L}\p{N}\p{M}_$]*$/u.test(token.value);
  }

  /**
   * Type arguments in an expression, read as TypeScript reads them
   * (`parseTypeArgumentsInExpression`): a `<…>` whose content parses as types
   * and that is followed by `(`, a template, a line break, a binary operator
   * or a token that cannot start an expression — `ф<рақам>(1)`, `ф<ҳар>`,
   * `нав К<Т>()`. Otherwise nothing is consumed and the `<` compares:
   * `а < б > в`, `а < б > +1`.
   */
  private parseTypeArgumentsInExpression(): TypeNode[] | undefined {
    if (!this.check(TokenType.LESS_THAN)) return undefined;
    const typeArguments = this.speculateCleanly(() => {
      // As in TypeScript, the closing `>` is no part of `>>` or `>=`: `а < А<б >> в` compares
      const list = this.parseTypeArgumentList(false);
      return this.canFollowTypeArguments() ? list : undefined;
    });
    return typeArguments ?? undefined;
  }

  /**
   * `<Т, У>`, at the `<`. A `>>` closing nested lists is split; `splitClose`:
   * the list's own `>` may be split from a `>>` or `>>>` too.
   */
  private parseTypeArgumentList(splitClose = true): TypeNode[] {
    this.advance(); // '<'
    const typeArguments: TypeNode[] = [];
    do {
      typeArguments.push(this.parseType());
    } while (this.match(TokenType.COMMA));
    if (splitClose) this.consumeTypeArgumentsClose();
    else this.consume(TokenType.GREATER_THAN, "Expected '>' after type arguments");
    return typeArguments;
  }

  /** TypeScript's `canFollowTypeArgumentsInExpression`. */
  private canFollowTypeArguments(): boolean {
    const token = this.peek();
    switch (token.type) {
      case TokenType.LEFT_PAREN:
      case TokenType.TEMPLATE_LITERAL:
        return true;
      // `ф<Т><У>` makes no sense, `ф<Т> > х` is ambiguous with `>>`, and `+`/`-` are unary here
      case TokenType.LESS_THAN:
      case TokenType.GREATER_THAN:
      case TokenType.PLUS:
      case TokenType.MINUS:
        return false;
      default:
        return (
          this.hasLineBreakBefore() ||
          this.isBinaryOperatorToken(token) ||
          !this.startsOperand(token)
        );
    }
  }

  /** Binary operators other than `<`, `>`, `+` and `-` (see `canFollowTypeArguments`). */
  private static readonly BINARY_OPERATOR_TOKENS: ReadonlySet<TokenType> = new Set([
    TokenType.NULLISH_COALESCING,
    TokenType.OR,
    TokenType.AND,
    TokenType.BITWISE_OR,
    TokenType.BITWISE_XOR,
    TokenType.BITWISE_AND,
    TokenType.EQUAL,
    TokenType.NOT_EQUAL,
    TokenType.STRICT_EQUAL,
    TokenType.STRICT_NOT_EQUAL,
    TokenType.LESS_EQUAL,
    TokenType.GREATER_EQUAL,
    TokenType.LEFT_SHIFT,
    TokenType.RIGHT_SHIFT,
    TokenType.UNSIGNED_RIGHT_SHIFT,
    TokenType.MULTIPLY,
    TokenType.DIVIDE,
    TokenType.MODULO,
    TokenType.EXPONENT,
    TokenType.ДАР,
    TokenType.ЧУН,
    TokenType.БАРМЕСОЁ,
  ]);

  /** Words that are binary operators: `in`, `instanceof`, `as`, `satisfies`. */
  private static readonly BINARY_OPERATOR_WORDS: ReadonlySet<string> = new Set([
    'in',
    'instanceof',
    'as',
    'satisfies',
  ]);

  private isBinaryOperatorToken(token: Token): boolean {
    return (
      Parser.BINARY_OPERATOR_TOKENS.has(token.type) ||
      (token.type === TokenType.IDENTIFIER && Parser.BINARY_OPERATOR_WORDS.has(token.value))
    );
  }

  /** Punctuation and literals that can start an operand. */
  private static readonly OPERAND_START_TOKENS: ReadonlySet<TokenType> = new Set([
    TokenType.NUMBER,
    TokenType.STRING,
    TokenType.TEMPLATE_LITERAL,
    TokenType.REGEX,
    TokenType.PRIVATE_NAME,
    TokenType.LEFT_PAREN,
    TokenType.LEFT_BRACKET,
    TokenType.LEFT_BRACE,
    TokenType.NOT,
    TokenType.BITWISE_NOT,
    TokenType.INCREMENT,
    TokenType.DECREMENT,
    TokenType.PLUS,
    TokenType.MINUS,
    TokenType.LESS_THAN,
    TokenType.DIVIDE,
    TokenType.DIVIDE_ASSIGN,
    TokenType.AT,
  ]);

  /** Whether `token` can start an operand: a literal, a word or an opening punctuator. */
  private startsOperand(token: Token): boolean {
    return Parser.OPERAND_START_TOKENS.has(token.type) || this.isIdentifierNameToken(token);
  }

  private skipGenericTypeArguments(): void {
    if (!this.match(TokenType.LESS_THAN)) {
      return;
    }

    let depth = 1;
    let tokenCount = 0;
    const maxTokens = 50; // Prevent infinite loops

    while (depth > 0 && !this.isAtEnd() && tokenCount < maxTokens) {
      const currentToken = this.peek();

      // Early exit if we hit tokens that shouldn't be inside generics
      if (
        currentToken.type === TokenType.LEFT_BRACE ||
        currentToken.type === TokenType.ФУНКСИЯ ||
        currentToken.type === TokenType.СИНФ ||
        currentToken.type === TokenType.SEMICOLON ||
        currentToken.type === TokenType.EOF
      ) {
        // We've gone too far or hit EOF, this isn't a valid generic
        // Reset by going back one token if we consumed the initial <
        if (tokenCount === 0) {
          this.current--; // Undo the initial match of <
        }
        return;
      }

      if (currentToken.type === TokenType.LESS_THAN) {
        depth++;
      } else {
        // `>`, and `>>` / `>>>` as in `<А<Б>>`, close one or more levels
        depth -= Parser.CLOSING_ANGLES.get(currentToken.type) ?? 0;
      }

      this.advance();
      tokenCount++;
    }

    // If we hit the token limit, something went wrong
    if (tokenCount >= maxTokens) {
      throw new Error(
        `Unterminated type argument list at line ${this.peek().line}, column ${this.peek().column}`
      );
    }
  }

  private static readonly CLOSING_ANGLES: ReadonlyMap<TokenType, number> = new Map([
    [TokenType.GREATER_THAN, 1],
    [TokenType.RIGHT_SHIFT, 2],
    [TokenType.UNSIGNED_RIGHT_SHIFT, 3],
  ]);

  /** The call of `callee`, after its consumed '('. */
  private finishCall(callee: Expression, typeArguments?: TypeNode[]): CallExpression {
    const args = this.parseArguments();

    return {
      type: 'CallExpression',
      callee,
      arguments: args,
      ...(typeArguments && { typeArguments }),
      line: callee.line,
      column: callee.column,
    } as CallExpression;
  }

  /** Arguments after a consumed '(' up to and including ')'; spread allowed. */
  private parseArguments(): Expression[] {
    const args: Expression[] = [];
    while (!this.check(TokenType.RIGHT_PAREN)) {
      args.push(this.spreadOrAssignment());
      if (!this.match(TokenType.COMMA)) break;
    }
    this.consume(TokenType.RIGHT_PAREN, "Expected ')' after arguments");
    return args;
  }

  /** An element of an array literal, object literal or argument list. */
  private spreadOrAssignment(): Expression {
    if (this.match(TokenType.SPREAD)) {
      const spreadToken = this.previous();
      return {
        type: 'SpreadElement',
        argument: this.assignment(),
        line: spreadToken.line,
        column: spreadToken.column,
      } as SpreadElement;
    }
    return this.assignment();
  }

  private createLiteral(value: boolean | null | number | string, token: Token): Literal {
    const raw = typeof value === 'string' ? `"${value}"` : token.value;
    return {
      type: 'Literal',
      value,
      raw,
      line: token.line,
      column: token.column,
    } as Literal;
  }

  /** The NUMBER token holds the literal as written (`0xFF`, `1e3`, `10n`); codegen emits `raw`. */
  private createNumericLiteral(token: Token): Literal {
    const text = token.value.endsWith('n') ? token.value.slice(0, -1) : token.value;
    return {
      type: 'Literal',
      value: Number(text),
      raw: token.value,
      line: token.line,
      column: token.column,
    } as Literal;
  }

  private parseNewExpression(token: Token): NewExpression {
    // The callee is a member chain without calls: `нав а.Б()` constructs `а.Б`
    let callee = this.primary();
    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (this.match(TokenType.DOT)) {
        callee = this.createMemberExpression(
          callee,
          this.parsePropertyName("Expected property name after '.'"),
          false
        );
      } else if (this.match(TokenType.LEFT_BRACKET)) {
        const property = this.expression();
        this.consume(TokenType.RIGHT_BRACKET, "Expected ']' after computed property");
        callee = this.createMemberExpression(callee, property, true);
      } else if (this.checkNonNullAssertion()) {
        // `нав а!.Б()` constructs `а!.Б`
        callee = this.createNonNullExpression(callee);
      } else if (this.check(TokenType.TEMPLATE_LITERAL)) {
        // `нав К\`…\`()` constructs the result of the tagged template, as in JavaScript
        callee = this.parseTaggedTemplate(callee);
      } else {
        break;
      }
    }

    const typeArguments = this.parseTypeArgumentsInExpression();

    // Arguments are optional: `нав Сана`
    const args = this.match(TokenType.LEFT_PAREN) ? this.parseArguments() : [];
    return {
      type: 'NewExpression',
      callee,
      arguments: args,
      ...(typeArguments && { typeArguments }),
      line: token.line,
      column: token.column,
    } as NewExpression;
  }

  /**
   * Type arguments of a heritage clause (`мерос Асос<рақам>`). When the
   * tokens after '<' are not a type argument list, they are skipped the way
   * they were before type arguments were kept.
   */
  private parseNewTypeArguments(): TypeNode[] | undefined {
    if (!this.check(TokenType.LESS_THAN)) return undefined;
    const typeArguments = this.speculateCleanly(() => this.parseTypeArgumentList());
    if (typeArguments) return typeArguments;
    this.skipGenericTypeArguments();
    return undefined;
  }

  private parseDynamicImport(importToken: Token): ImportExpression {
    this.consume(TokenType.LEFT_PAREN, "Expected '(' after 'ворид'");
    const source = this.assignment();
    this.consume(TokenType.RIGHT_PAREN, "Expected ')' after import specifier");
    return {
      type: 'ImportExpression',
      source,
      line: importToken.line,
      column: importToken.column,
    } as ImportExpression;
  }

  private parseFunctionExpression(funcToken: Token): FunctionExpression {
    const generator = this.match(TokenType.MULTIPLY);
    const typeParameters = this.parseTypeParametersOrSkip();
    this.checkTypeParameterModifiers(typeParameters, 'function');
    this.consume(TokenType.LEFT_PAREN, "Expected '(' after 'функсия'");
    const { params, thisType } = this.withGenerator(false, () =>
      this.parseParametersWithThis("Expected ')' after parameters")
    );
    let returnType: TypeAnnotation | undefined;

    if (this.match(TokenType.COLON)) {
      returnType = this.returnTypeAnnotation();
    }

    this.consume(TokenType.LEFT_BRACE, "Expected '{' before function body");
    const body = this.withGenerator(generator, () => this.blockStatement());
    return {
      type: 'FunctionExpression',
      ...(typeParameters && { typeParameters }),
      params,
      body,
      returnType,
      ...(generator && { generator }),
      ...(thisType && { thisType }),
      line: funcToken.line,
      column: funcToken.column,
    } as FunctionExpression;
  }

  private createIdentifier(token: Token): Identifier {
    return {
      type: 'Identifier',
      name: token.value,
      line: token.line,
      column: token.column,
    } as Identifier;
  }

  private parseLiteralExpression(): Expression | null {
    if (this.match(TokenType.ДУРУСТ)) {
      return this.createLiteral(true, this.previous());
    }
    if (this.match(TokenType.НОДУРУСТ)) {
      return this.createLiteral(false, this.previous());
    }
    if (this.match(TokenType.ХОЛӢ)) {
      return this.createLiteral(null, this.previous());
    }
    if (this.match(TokenType.NUMBER)) {
      return this.createNumericLiteral(this.previous());
    }
    if (this.match(TokenType.STRING)) {
      return this.createLiteral(this.previous().value, this.previous());
    }
    if (this.match(TokenType.TEMPLATE_LITERAL)) {
      return this.parseTemplateLiteral();
    }
    if (this.match(TokenType.REGEX)) {
      return this.createRegExpLiteral(this.previous());
    }
    return null;
  }

  /** The REGEX token holds the literal as written: `/а+/g`. */
  private createRegExpLiteral(token: Token): RegExpLiteral {
    const closing = token.value.lastIndexOf('/');
    return {
      type: 'RegExpLiteral',
      pattern: token.value.slice(1, closing),
      flags: token.value.slice(closing + 1),
      line: token.line,
      column: token.column,
    };
  }

  private parseThisOrSuperExpression(): Expression | null {
    if (this.match(TokenType.ИН)) {
      const token = this.previous();
      return { type: 'ThisExpression', line: token.line, column: token.column };
    }
    if (this.match(TokenType.СУПЕР)) {
      const token = this.previous();
      return { type: 'Super', line: token.line, column: token.column };
    }
    return null;
  }

  private parseIdentifierExpression(): Expression | null {
    if (this.match(TokenType.IDENTIFIER) || this.matchBuiltinIdentifier()) {
      return this.createIdentifier(this.previous());
    }
    if (this.match(TokenType.НАВЪ, TokenType.МАЪЛУМОТ, TokenType.РӮЙХАТ, TokenType.БЕҚИМАТ)) {
      return this.createIdentifier(this.previous());
    }
    return null;
  }

  private parseGroupingOrCollection(): Expression | null {
    if (this.match(TokenType.LEFT_PAREN)) {
      let expr = this.expression();
      this.consume(TokenType.RIGHT_PAREN, "Expected ')' after expression");
      if (this.containsOptionalLink(expr)) {
        expr = {
          type: 'ChainExpression',
          expression: expr,
          line: expr.line,
          column: expr.column,
        } as ChainExpression;
      }
      this.parenthesized.add(expr);
      return expr;
    }
    if (this.match(TokenType.LEFT_BRACKET)) {
      return this.arrayExpression();
    }
    if (this.match(TokenType.LEFT_BRACE)) {
      return this.objectExpression();
    }
    return null;
  }

  /** Whether the member/call chain of `expr` (assertions included) has a `?.` link. */
  private containsOptionalLink(expr: Expression): boolean {
    let current = expr;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (current.type === 'MemberExpression' || current.type === 'CallExpression') {
        if ((current as MemberExpression | CallExpression).optional) return true;
        current =
          current.type === 'MemberExpression'
            ? (current as MemberExpression).object
            : (current as CallExpression).callee;
      } else if (Parser.ASSERTION_TYPES.has(current.type)) {
        // `(о?.а чун Т).б` and `(о?.а!).б` end the chain like `(о?.а).б`
        current = (current as NonNullExpression).expression;
      } else {
        return false;
      }
    }
  }

  /** Expressions that only assert a type (or fix type arguments): erased in the output. */
  private static readonly ASSERTION_TYPES: ReadonlySet<string> = new Set([
    'AsExpression',
    'TypeAssertion',
    'SatisfiesExpression',
    'NonNullExpression',
    'InstantiationExpression',
  ]);

  private primary(): Expression {
    const literal = this.parseLiteralExpression();
    if (literal) return literal;

    const thisOrSuper = this.parseThisOrSuperExpression();
    if (thisOrSuper) return thisOrSuper;

    if (this.check(TokenType.НАВ) && this.peekNext()?.type === TokenType.DOT) {
      return this.parseNewTarget();
    }

    if (this.match(TokenType.НАВ)) {
      return this.parseNewExpression(this.previous());
    }

    const importExpression = this.parseImportExpressionOrMeta();
    if (importExpression) return importExpression;

    if (this.match(TokenType.ФУНКСИЯ)) {
      return this.parseFunctionExpression(this.previous());
    }

    if (this.startsClassExpression()) {
      return this.classExpression();
    }

    if (this.isAsyncFunctionStart()) {
      const asyncToken = this.advance();
      this.advance(); // consume 'функсия'
      const func = this.parseFunctionExpression(asyncToken);
      func.async = true;
      return func;
    }

    if (this.isYieldKeyword(this.peek())) {
      // `а + ҳосил б`: as in JavaScript, a yield operand needs parentheses
      throw new Error(
        this.unexpectedTokenMessage(
          `'${this.peek().value}' used as an operand must be parenthesized`
        )
      );
    }

    const identifier = this.parseIdentifierExpression();
    if (identifier) return identifier;

    const grouping = this.parseGroupingOrCollection();
    if (grouping) return grouping;

    throw this.unexpectedOperandError();
  }

  /** The error for a token that starts no operand. */
  private unexpectedOperandError(): Error {
    const token = this.peek();
    const at = `at line ${token.line}, column ${token.column}`;
    // The lexer reads '/' as a regular expression only when it is closed on its line
    if (token.type === TokenType.DIVIDE || token.type === TokenType.DIVIDE_ASSIGN) {
      return new Error(`Unterminated regular expression ${at}`);
    }
    return new Error(`Unexpected token '${token.value}' ${at}`);
  }

  /** `нав.target` (`new.target`); the only meta property of `нав`. */
  private parseNewTarget(): MetaProperty {
    const newToken = this.advance();
    this.advance(); // '.'
    const property = this.peek();
    if (property.type !== TokenType.IDENTIFIER || property.value !== 'target') {
      throw new Error(
        `The only valid meta property for 'нав' is 'нав.target' at line ${property.line}, column ${property.column}`
      );
    }
    this.advance();
    return {
      type: 'MetaProperty',
      meta: { type: 'Identifier', name: 'new', line: newToken.line, column: newToken.column },
      property: this.createIdentifier(property),
      line: newToken.line,
      column: newToken.column,
    };
  }

  /** `ворид(…)` (dynamic import) or `ворид.meta`; null when `ворид` starts no expression. */
  private parseImportExpressionOrMeta(): Expression | null {
    if (!this.check(TokenType.ВОРИД)) return null;
    const next = this.peekNext()?.type;
    if (next === TokenType.LEFT_PAREN) return this.parseDynamicImport(this.advance());
    return next === TokenType.DOT ? this.parseImportMeta() : null;
  }

  /** `ворид.meta` (`import.meta`); the only meta property of `ворид`. */
  private parseImportMeta(): MetaProperty {
    const importToken = this.advance();
    this.advance(); // '.'
    const property = this.peek();
    if (property.type !== TokenType.IDENTIFIER || property.value !== 'meta') {
      throw new Error(
        `The only valid meta property for 'ворид' is 'ворид.meta' at line ${property.line}, column ${property.column}`
      );
    }
    this.advance();
    return {
      type: 'MetaProperty',
      meta: {
        type: 'Identifier',
        name: 'import',
        line: importToken.line,
        column: importToken.column,
      },
      property: this.createIdentifier(property),
      line: importToken.line,
      column: importToken.column,
    };
  }

  /**
   * The template literal just consumed. In a tagged template (`tagged`) an
   * invalid escape is allowed and leaves the text's `cooked` value null.
   */
  private parseTemplateLiteral(tagged = false): TemplateLiteral {
    const token = this.previous();
    const quasis: TemplateElement[] = [];
    const expressions: Expression[] = [];

    for (const part of this.splitTemplate(token.value)) {
      if (part.type === 'text') {
        quasis.push({
          type: 'TemplateElement',
          value: { raw: part.value, cooked: this.cookTemplatePart(part.value, token, tagged) },
          tail: false,
          line: token.line,
          column: token.column,
        });
      } else {
        const { line, column } = this.templateOffsetPosition(token, part.offset);
        expressions.push(this.parseInterpolation(part.value, line, column));
      }
    }

    quasis[quasis.length - 1].tail = true;

    return {
      type: 'TemplateLiteral',
      quasis,
      expressions,
      line: token.line,
      column: token.column,
    };
  }

  /**
   * Splits raw template text into alternating text / `${…}` parts, always
   * starting and ending with text. `\${` is text; braces inside strings and
   * nested templates do not end an interpolation.
   */
  private splitTemplate(
    raw: string
  ): Array<{ type: 'text' | 'expression'; value: string; offset: number }> {
    const parts: Array<{ type: 'text' | 'expression'; value: string; offset: number }> = [];
    let textStart = 0;
    let i = 0;
    while (i < raw.length) {
      if (raw[i] === '\\') {
        i += 2;
      } else if (raw[i] === '$' && raw[i + 1] === '{') {
        parts.push({ type: 'text', value: raw.slice(textStart, i), offset: textStart });
        const end = this.findInterpolationEnd(raw, i + 2);
        parts.push({ type: 'expression', value: raw.slice(i + 2, end), offset: i + 2 });
        i = end + 1;
        textStart = i;
      } else {
        i++;
      }
    }
    parts.push({ type: 'text', value: raw.slice(textStart), offset: textStart });
    return parts;
  }

  /**
   * Index of the '}' that closes an interpolation whose body starts at `start`;
   * braces in strings, nested templates, regular expressions and comments do not count.
   */
  private findInterpolationEnd(raw: string, start: number): number {
    let depth = 1;
    let i = start;
    while (i < raw.length) {
      const char = raw[i];
      const skipped = char === '/' ? this.skipCommentOrRegex(raw, i, start) : -1;
      if (skipped !== -1) {
        i = skipped;
      } else if (char === '"' || char === "'") {
        i = this.skipQuoted(raw, i + 1, char);
      } else if (char === '`') {
        i = this.skipNestedTemplate(raw, i + 1);
      } else if (char === '{') {
        depth++;
        i++;
      } else if (char === '}') {
        if (--depth === 0) return i;
        i++;
      } else {
        i++;
      }
    }
    return raw.length;
  }

  /**
   * At the '/' at `i` of an interpolation starting at `start`: the index just
   * past a comment or regular expression literal there, or -1 for a division.
   */
  private skipCommentOrRegex(raw: string, i: number, start: number): number {
    if (raw[i + 1] === '/') {
      const newline = raw.indexOf('\n', i);
      return newline === -1 ? raw.length : newline;
    }
    if (raw[i + 1] === '*') {
      const close = raw.indexOf('*/', i + 2);
      return close === -1 ? raw.length : close + 2;
    }
    return isRegexStartInText(raw, i, start) ? regexLiteralEnd(raw, i) : -1;
  }

  /** Index just past the closing `quote` of a string starting at `i`. */
  private skipQuoted(raw: string, i: number, quote: string): number {
    while (i < raw.length && raw[i] !== quote) {
      i += raw[i] === '\\' ? 2 : 1;
    }
    return i + 1;
  }

  /** Index just past the closing backtick of a nested template starting at `i`. */
  private skipNestedTemplate(raw: string, i: number): number {
    while (i < raw.length && raw[i] !== '`') {
      if (raw[i] === '\\') {
        i += 2;
      } else if (raw[i] === '$' && raw[i + 1] === '{') {
        i = this.findInterpolationEnd(raw, i + 2) + 1;
      } else {
        i++;
      }
    }
    return i + 1;
  }

  /** Source position of `offset` within the raw text of a template token. */
  private templateOffsetPosition(token: Token, offset: number): { line: number; column: number } {
    const before = token.value.slice(0, offset);
    const lastBreak = before.lastIndexOf('\n');
    const breaks = before.split('\n').length - 1;
    return breaks === 0
      ? { line: token.line, column: token.column + 1 + offset }
      : { line: token.line + breaks, column: offset - lastBreak };
  }

  private cookTemplatePart(raw: string, token: Token, tagged: boolean): string | null {
    if (!tagged) return this.cookTemplateText(raw, token);
    try {
      return this.cookTemplateText(raw, token);
    } catch {
      return null;
    }
  }

  /** Decodes the escape sequences of raw template text. */
  private cookTemplateText(raw: string, token: Token): string {
    const simple: Record<string, string> = {
      n: '\n',
      t: '\t',
      r: '\r',
      b: '\b',
      f: '\f',
      v: '\v',
      '0': '\0',
      '\n': '',
    };
    // Line terminators are normalized to '\n', as in JavaScript
    return raw
      .replace(/\r\n?/g, '\n')
      .replace(
        /\\(u\{([0-9a-fA-F]+)\}|u([0-9a-fA-F]{4})|x([0-9a-fA-F]{2})|[\s\S])/g,
        (whole: string, escape: string, braced?: string, unicode?: string, hex?: string) => {
          const code = braced ?? unicode ?? hex;
          if (code !== undefined) {
            const point = Number.parseInt(code, 16);
            if (point > 0x10ffff) {
              throw new Error(
                `Invalid Unicode escape '${whole}' in template literal at line ${token.line}, column ${token.column}`
              );
            }
            return String.fromCodePoint(point);
          }
          if (escape === 'u' || escape === 'x') {
            throw new Error(
              `Invalid escape sequence '${whole}' in template literal at line ${token.line}, column ${token.column}`
            );
          }
          return simple[escape] ?? escape;
        }
      );
  }

  /**
   * Parses the source of one `${…}` with a sub-parser. Tokens are shifted to
   * their real position, the expression must consume all of them, and every
   * error is reported through this parser.
   */
  private parseInterpolation(source: string, line: number, column: number): Expression {
    if (!source.trim()) {
      // `${}` is treated as `undefined`
      return { type: 'Identifier', name: 'undefined', line, column } as Identifier;
    }
    return this.parseSubSource(
      source,
      line,
      column,
      sub => sub.expression(),
      "Expected '}' after template expression"
    );
  }

  /**
   * Parses `source`, text of this input starting at `line`/`column`, with a
   * sub-parser: `parse` must consume all of its tokens.
   */
  private parseSubSource<T>(
    source: string,
    line: number,
    column: number,
    parse: (_sub: Parser) => T,
    endMessage: string
  ): T {
    let tokens: Token[];
    try {
      tokens = new Lexer(source).tokenize();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(this.shiftPositions(message, line, column));
    }
    for (const token of tokens) {
      if (token.line === 1) token.column += column - 1;
      token.line += line - 1;
    }

    const subParser = new Parser(tokens);
    subParser.depth = this.depth;
    subParser.inGenerator = this.inGenerator;
    let result: T;
    try {
      result = parse(subParser);
      if (!subParser.isAtEnd()) {
        throw new Error(subParser.unexpectedTokenMessage(endMessage));
      }
    } finally {
      this.errors.push(...subParser.errors);
    }
    return result;
  }

  /** Rewrites `line L, column C` of a message produced for a sub-source starting at line/column. */
  private shiftPositions(message: string, line: number, column: number): string {
    return message.replace(/line (\d+), column (\d+)/g, (_match, l: string, c: string) => {
      const subLine = Number(l);
      const realColumn = subLine === 1 ? Number(c) + column - 1 : Number(c);
      return `line ${subLine + line - 1}, column ${realColumn}`;
    });
  }

  /** True when the upcoming tokens have exactly these types. */
  public checkSequence(...types: TokenType[]): boolean {
    return types.every((type, offset) => this.tokens[this.current + offset]?.type === type);
  }

  public match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private peek(): Token {
    if (this.current >= this.tokens.length) {
      // Return the last token (should be EOF) if we're past the end
      return this.tokens[this.tokens.length - 1];
    }
    return this.tokens[this.current];
  }

  private peekNext(): Token | undefined {
    if (this.current + 1 >= this.tokens.length) return undefined;
    return this.tokens[this.current + 1];
  }

  private previous(): Token {
    const index = this.current - 1;
    if (index < 0) {
      // Return the first token if we're before the start
      return this.tokens[0];
    }
    if (index >= this.tokens.length) {
      // Return the last token if we're past the end
      return this.tokens[this.tokens.length - 1];
    }
    return this.tokens[index];
  }

  public consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();

    throw new Error(this.unexpectedTokenMessage(message));
  }

  /**
   * Statement terminator. As in JavaScript, ';' may be omitted before '}', at
   * the end of input, or when the next token starts on a new line.
   */
  private consumeSemicolon(message: string, member = false): void {
    if (this.match(TokenType.SEMICOLON)) return;
    if (this.check(TokenType.RIGHT_BRACE) || this.isAtEnd() || this.hasLineBreakBefore()) {
      this.noteOmittedSemicolon(member);
      return;
    }
    throw new Error(this.unexpectedTokenMessage(message));
  }

  /** Records that the `;` before the current token was left out. */
  private noteOmittedSemicolon(member = false): void {
    this.omittedSemicolons.push({ before: this.peek(), member });
  }

  /** Separator after an interface or object-type member: ';' or ','. */
  private consumeMemberSeparator(message: string): void {
    if (this.match(TokenType.COMMA)) return;
    this.consumeSemicolon(message, true);
  }

  /** True when the current token starts on a later line than the previous one ended. */
  private hasLineBreakBefore(): boolean {
    if (this.current === 0) return false;
    const previous = this.previous();
    // Template literals are the only tokens whose value keeps their line breaks
    const lastLine =
      previous.type === TokenType.TEMPLATE_LITERAL
        ? previous.line + (previous.value.match(/\n/g)?.length ?? 0)
        : previous.line;
    return this.peek().line > lastLine;
  }

  private unexpectedTokenMessage(message: string): string {
    const token = this.peek();
    const shown = token.type === TokenType.EOF ? 'end of input' : `'${token.value}'`;
    return `Unexpected token ${shown} at line ${token.line}, column ${token.column} (${message})`;
  }

  /** `навъ` / `type` before import or export specifiers: `ворид навъ { Т } аз "./м";`. */
  private isTypeOnlyModifier(): boolean {
    const token = this.peek();
    const next = this.peekNext();
    const isWord =
      token.type === TokenType.НАВЪ ||
      (token.type === TokenType.IDENTIFIER && token.value === 'type');
    if (!isWord || !next) return false;
    if (next.type === TokenType.LEFT_BRACE || next.type === TokenType.MULTIPLY) return true;
    // `ворид навъ Т аз …`, `ворид навъ Т = require(…)`; `ворид type аз …` imports `type`
    const after = this.tokens[this.current + 2]?.type;
    return (
      this.isPlainIdentifierToken(next) &&
      (after === TokenType.АЗ || after === TokenType.COMMA || after === TokenType.ASSIGN)
    );
  }

  /** `навъ` / `type` before one specifier: `{ навъ Т, х }`. */
  private matchSpecifierTypeModifier(): boolean {
    const token = this.peek();
    const next = this.peekNext();
    const isWord =
      token.type === TokenType.НАВЪ ||
      (token.type === TokenType.IDENTIFIER && token.value === 'type');
    if (!isWord || !next) return false;
    if (next.type !== TokenType.IDENTIFIER && !this.isBuiltinIdentifierType(next.type)) {
      return false;
    }
    this.advance();
    return true;
  }

  /**
   * `ворид х = require("./м");` / `ворид х = Н.а;` (TypeScript `import x = …`),
   * at the name.
   */
  private importEqualsDeclaration(importToken: Token, typeOnly: boolean): ImportEqualsDeclaration {
    const id = this.createIdentifier(this.advance());
    this.consume(TokenType.ASSIGN, "Expected '=' after import name");
    const declaration: ImportEqualsDeclaration = {
      type: 'ImportEqualsDeclaration',
      id,
      ...(typeOnly && { importKind: 'type' as const }),
      line: importToken.line,
      column: importToken.column,
    };
    if (this.checkIdentifierValue('require') && this.peekNext()?.type === TokenType.LEFT_PAREN) {
      this.advance(); // 'require'
      this.advance(); // '('
      const source = this.consume(TokenType.STRING, "Expected module path in 'require'");
      this.consume(TokenType.RIGHT_PAREN, "Expected ')' after module path");
      declaration.source = {
        type: 'Literal',
        value: source.value,
        raw: `"${source.value}"`,
        line: source.line,
        column: source.column,
      };
    } else {
      let reference: Expression = this.createIdentifier(
        this.parseImportOrExportName('Expected a name or require("…") after \'=\'')
      );
      while (this.match(TokenType.DOT)) {
        reference = this.createMemberExpression(
          reference,
          this.parsePropertyName("Expected property name after '.'"),
          false
        );
      }
      declaration.reference = reference;
    }
    this.consumeSemicolon("Expected ';' after import");
    return declaration;
  }

  public importDeclaration(): ImportDeclaration | ImportEqualsDeclaration {
    const importToken = this.previous();
    const specifiers: Array<ImportSpecifier | ImportDefaultSpecifier | ImportNamespaceSpecifier> =
      [];
    // `ворид навъ { Т } аз "./м";`: types only
    const typeOnly = this.isTypeOnlyModifier();
    if (typeOnly) this.advance();

    if (this.isPlainIdentifierToken(this.peek()) && this.peekNext()?.type === TokenType.ASSIGN) {
      return this.importEqualsDeclaration(importToken, typeOnly);
    }

    // Side-effect import: `ворид "./м";` runs the module and binds nothing
    if (!typeOnly && this.check(TokenType.STRING)) {
      const source = this.advance();
      this.consumeSemicolon("Expected ';' after import");
      return {
        type: 'ImportDeclaration',
        specifiers,
        source: {
          type: 'Literal',
          value: source.value,
          raw: `"${source.value}"`,
          line: source.line,
          column: source.column,
        } as Literal,
        line: importToken.line,
        column: importToken.column,
      };
    }

    // Handle default import or named imports
    if (this.check(TokenType.IDENTIFIER)) {
      const local = this.advance();
      specifiers.push({
        type: 'ImportDefaultSpecifier',
        local: {
          type: 'Identifier',
          name: local.value,
          line: local.line,
          column: local.column,
        } as Identifier,
        line: local.line,
        column: local.column,
      } as ImportDefaultSpecifier);

      if (this.match(TokenType.COMMA)) {
        if (this.match(TokenType.MULTIPLY)) {
          // `ворид а, * чун Н аз "./м";`
          specifiers.push(this.parseNamespaceImportSpecifier());
        } else {
          // Handle named imports after default
          this.consume(TokenType.LEFT_BRACE, "Expected '{' after default import");
          this.parseNamedImports(specifiers);
          this.consume(TokenType.RIGHT_BRACE, "Expected '}' after named imports");
        }
      }
    } else if (this.match(TokenType.MULTIPLY)) {
      specifiers.push(this.parseNamespaceImportSpecifier());
    } else if (this.match(TokenType.LEFT_BRACE)) {
      // Handle only named imports
      this.parseNamedImports(specifiers);
      this.consume(TokenType.RIGHT_BRACE, "Expected '}' after named imports");
    }

    this.consume(TokenType.АЗ, "Expected 'аз' after import specifiers");
    const source = this.consume(TokenType.STRING, 'Expected module path');
    this.consumeSemicolon("Expected ';' after import");
    if (typeOnly) this.checkTypeOnlyImport(specifiers, importToken);

    return {
      type: 'ImportDeclaration',
      specifiers,
      source: {
        type: 'Literal',
        value: source.value,
        raw: `"${source.value}"`,
        line: source.line,
        column: source.column,
      } as Literal,
      ...(typeOnly && { importKind: 'type' as const }),
      line: importToken.line,
      column: importToken.column,
    };
  }

  /** TypeScript's rules for `ворид навъ`: a default import or named imports, not both. */
  private checkTypeOnlyImport(
    specifiers: Array<ImportSpecifier | ImportDefaultSpecifier | ImportNamespaceSpecifier>,
    importToken: Token
  ): void {
    const at = `at line ${importToken.line}, column ${importToken.column}`;
    const hasDefault = specifiers.some(spec => spec.type === 'ImportDefaultSpecifier');
    if (hasDefault && specifiers.length > 1) {
      this.errors.push(
        `A type-only import can specify a default import or named bindings, but not both ${at}`
      );
    }
    if (specifiers.some(spec => spec.type === 'ImportSpecifier' && spec.importKind)) {
      this.errors.push(
        `The 'навъ' modifier cannot be used on a named import when 'ворид навъ' is used on its import statement ${at}`
      );
    }
  }

  /** `* чун Н` of a namespace import, after the consumed '*'. */
  private parseNamespaceImportSpecifier(): ImportNamespaceSpecifier {
    this.consume(TokenType.ЧУН, "Expected 'чун' after '*' in namespace import");
    let local: Token;
    if (this.check(TokenType.IDENTIFIER)) {
      local = this.advance();
    } else if (this.matchBuiltinIdentifier()) {
      local = this.previous();
    } else {
      const token = this.peek();
      throw new Error(
        `Expected namespace alias after 'чун' at line ${token.line}, column ${token.column}`
      );
    }

    return {
      type: 'ImportNamespaceSpecifier',
      local: {
        type: 'Identifier',
        name: local.value,
        line: local.line,
        column: local.column,
      } as Identifier,
      line: local.line,
      column: local.column,
    } as ImportNamespaceSpecifier;
  }

  private parseImportOrExportName(errorMessage: string): Token {
    if (this.check(TokenType.IDENTIFIER)) {
      return this.advance();
    }
    if (this.matchBuiltinIdentifier()) {
      return this.previous();
    }
    throw new Error(`${errorMessage} at line ${this.peek().line}, column ${this.peek().column}`);
  }

  private createImportSpecifier(imported: Token, local: Token): ImportSpecifier {
    return {
      type: 'ImportSpecifier',
      imported: {
        type: 'Identifier',
        name: imported.value,
        line: imported.line,
        column: imported.column,
      } as Identifier,
      local: {
        type: 'Identifier',
        name: local.value,
        line: local.line,
        column: local.column,
      } as Identifier,
      line: imported.line,
      column: imported.column,
    } as ImportSpecifier;
  }

  private parseNamedImports(
    specifiers: Array<ImportSpecifier | ImportDefaultSpecifier | ImportNamespaceSpecifier>
  ): void {
    if (this.check(TokenType.RIGHT_BRACE)) {
      return;
    }

    do {
      // A trailing comma is allowed: `{ а, б, }`
      if (specifiers.length > 0 && this.check(TokenType.RIGHT_BRACE)) break;
      const typeOnly = this.matchSpecifierTypeModifier();
      const imported = this.parseImportOrExportName('Expected import name');
      let local = imported;

      if (this.match(TokenType.ЧУН)) {
        local = this.parseImportOrExportName("Expected local name after 'чун'");
      }

      const specifier = this.createImportSpecifier(imported, local);
      if (typeOnly) specifier.importKind = 'type';
      specifiers.push(specifier);
    } while (this.match(TokenType.COMMA));
  }

  public exportDeclaration(): ExportDeclaration | ExportAssignment {
    const exportToken = this.previous();

    // `содир = ифода;` (TypeScript `export =`)
    if (this.match(TokenType.ASSIGN)) {
      const expression = this.assignment();
      this.consumeSemicolon("Expected ';' after export assignment");
      return {
        type: 'ExportAssignment',
        expression,
        line: exportToken.line,
        column: exportToken.column,
      };
    }

    // `содир навъ { Т };`, `содир навъ * аз "./м";`: types only
    const typeOnly =
      this.isTypeOnlyModifier() &&
      (this.peekNext()?.type === TokenType.LEFT_BRACE ||
        this.peekNext()?.type === TokenType.MULTIPLY);
    if (typeOnly) this.advance();
    const kind = typeOnly ? { exportKind: 'type' as const } : {};

    // Handle: содир пешфарз <declaration>
    if (this.match(TokenType.ПЕШФАРЗ)) return this.defaultExport(exportToken);

    // Handle: содир { name1, name2 }
    if (this.match(TokenType.LEFT_BRACE)) {
      const specifiers = this.parseExportSpecifiers();
      this.consume(TokenType.RIGHT_BRACE, "Expected '}' after export specifiers");

      // Handle: содир { name1, name2 } аз "module"
      let source: Literal | undefined;
      if (this.match(TokenType.АЗ)) {
        const sourceToken = this.consume(TokenType.STRING, 'Expected module path after аз');
        source = {
          type: 'Literal',
          value: sourceToken.value,
          raw: `"${sourceToken.value}"`,
          line: sourceToken.line,
          column: sourceToken.column,
        };
      }

      this.consumeSemicolon("Expected ';' after export statement");
      if (typeOnly && specifiers.some(specifier => specifier.exportKind)) {
        this.errors.push(
          `The 'навъ' modifier cannot be used on a named export when 'содир навъ' is used on its export statement at line ${exportToken.line}, column ${exportToken.column}`
        );
      }

      return {
        type: 'ExportDeclaration',
        specifiers,
        source,
        default: false,
        ...kind,
        line: exportToken.line,
        column: exportToken.column,
      };
    }

    // Handle: содир * аз "module", содир * чун Н аз "module"
    if (this.match(TokenType.MULTIPLY)) {
      let namespaceExport: Identifier | undefined;
      if (this.match(TokenType.ЧУН)) {
        namespaceExport = this.createIdentifier(
          this.parseImportOrExportName("Expected export name after 'чун'")
        );
      }
      this.consume(TokenType.АЗ, "Expected 'аз' after '*'");
      const sourceToken = this.consume(TokenType.STRING, 'Expected module path');
      const source: Literal = {
        type: 'Literal',
        value: sourceToken.value,
        raw: `"${sourceToken.value}"`,
        line: sourceToken.line,
        column: sourceToken.column,
      };

      this.consumeSemicolon("Expected ';' after export statement");

      return {
        type: 'ExportDeclaration',
        specifiers: [],
        source,
        default: false,
        ...kind,
        ...(namespaceExport && { namespaceExport }),
        line: exportToken.line,
        column: exportToken.column,
      };
    }

    // Handle: содир <declaration>
    // This includes: функсия, синф, собит, тағйирёбанда, интерфейс, навъ, ҳамзамон функсия

    // Special handling for async functions
    if (this.isAsyncWord()) {
      this.advance();
      this.consume(TokenType.ФУНКСИЯ, "Expected 'функсия' after 'ҳамзамон'");
      const func = this.functionDeclaration();
      func.async = true;
      return {
        type: 'ExportDeclaration',
        declaration: func,
        default: false,
        line: exportToken.line,
        column: exportToken.column,
      };
    }

    const declaration = this.exportedStatement();
    return {
      type: 'ExportDeclaration',
      declaration: declaration!,
      default: false,
      line: exportToken.line,
      column: exportToken.column,
    };
  }

  /** `содир пешфарз <declaration or expression>`, after `пешфарз`. */
  private defaultExport(exportToken: Token): ExportDeclaration {
    const declaration = this.anonymousDefaultExport() ?? this.exportedStatement();
    return {
      type: 'ExportDeclaration',
      declaration: declaration!,
      default: true,
      line: exportToken.line,
      column: exportToken.column,
    };
  }

  /**
   * `содир пешфарз функсия () {}`, `… ҳамзамон функсия* () {}`,
   * `… [мавҳум] синф [мерос А] {}`, also decorated: a function or class
   * without a name, as an expression statement (`export default function () {}`
   * in ES modules, `module.exports.default = …` in CommonJS). Null when the
   * declaration has a name.
   */
  private anonymousDefaultExport(): Statement | null {
    if (this.check(TokenType.AT)) {
      const decorators = this.parseDecorators();
      const exported = this.anonymousDefaultExport() ?? this.statement();
      return this.decorate(decorators, exported);
    }
    const start = this.peek();
    let expression: Expression | undefined;
    const asyncOffset = this.isAsyncFunctionStart() ? 1 : 0;
    if (this.check(TokenType.ФУНКСИЯ) || asyncOffset) {
      if (!this.isAnonymousFunctionHead(asyncOffset + 1)) return null;
      this.current += asyncOffset;
      const func = this.parseFunctionExpression(this.advance());
      if (asyncOffset) func.async = true;
      expression = { ...func, line: start.line, column: start.column };
    } else {
      const abstract = this.checkSequence(TokenType.МАВҲУМ, TokenType.СИНФ) ? 1 : 0;
      if (!this.check(abstract ? TokenType.МАВҲУМ : TokenType.СИНФ)) return null;
      if (!Parser.ANONYMOUS_CLASS_FOLLOWERS.has(this.tokens[this.current + abstract + 1]?.type)) {
        return null;
      }
      this.current += abstract;
      const classExpression = this.parseClassExpression(this.advance());
      if (abstract) classExpression.abstract = true;
      expression = { ...classExpression, line: start.line, column: start.column };
    }
    return {
      type: 'ExpressionStatement',
      expression,
      line: start.line,
      column: start.column,
    } as ExpressionStatement;
  }

  /** Tokens after `синф` that start a class without a name. */
  private static readonly ANONYMOUS_CLASS_FOLLOWERS: ReadonlySet<TokenType | undefined> = new Set([
    TokenType.LEFT_BRACE,
    TokenType.МЕРОС,
    TokenType.ТАТБИҚ,
    TokenType.LESS_THAN,
  ]);

  /** `функсия` at `offset` has no name: `(`, `<` or `*` and then `(` / `<` follow. */
  private isAnonymousFunctionHead(offset: number): boolean {
    let next = this.tokens[this.current + offset]?.type;
    if (next === TokenType.MULTIPLY) next = this.tokens[this.current + offset + 1]?.type;
    return next === TokenType.LEFT_PAREN || next === TokenType.LESS_THAN;
  }

  /** The statement after `содир` / `содир пешфарз`; a lone `;` exports nothing. */
  private exportedStatement(): Statement | null {
    if (this.check(TokenType.SEMICOLON)) {
      throw new Error(this.unexpectedTokenMessage("Expected a declaration after 'содир'"));
    }
    return this.statement();
  }

  private createExportSpecifier(local: Token, exported: Token): ExportSpecifier {
    return {
      type: 'ExportSpecifier',
      local: {
        type: 'Identifier',
        name: local.value,
        line: local.line,
        column: local.column,
      },
      exported: {
        type: 'Identifier',
        name: exported.value,
        line: exported.line,
        column: exported.column,
      },
      line: local.line,
      column: local.column,
    };
  }

  private parseExportSpecifiers(): ExportSpecifier[] {
    const specifiers: ExportSpecifier[] = [];

    if (this.check(TokenType.RIGHT_BRACE)) {
      return specifiers;
    }

    do {
      // A trailing comma is allowed: `{ а, б, }`
      if (specifiers.length > 0 && this.check(TokenType.RIGHT_BRACE)) break;
      const typeOnly = this.matchSpecifierTypeModifier();
      const local = this.parseImportOrExportName('Expected export name');
      let exported = local;

      if (this.match(TokenType.ЧУН)) {
        exported = this.parseImportOrExportName("Expected export alias after 'чун'");
      }

      const specifier = this.createExportSpecifier(local, exported);
      if (typeOnly) specifier.exportKind = 'type';
      specifiers.push(specifier);
    } while (this.match(TokenType.COMMA));

    return specifiers;
  }

  private static readonly BUILTIN_IDENTIFIER_TYPES: ReadonlySet<TokenType> = new Set([
    TokenType.ВАЪДА, // Promise, as a value: `нав Ваъда(…)`, `Ваъда.all(…)`
    TokenType.ЧОП,
    TokenType.САБТ,
    TokenType.ХАТО,
    TokenType.ОГОҲӢ,
    TokenType.МАЪЛУМОТ,
    TokenType.ИСФТИ,
    TokenType.ТАСДИҚ,
    TokenType.ҚАЙД,
    TokenType.ҚАЙДАСЛ,
    TokenType.ВАҚТ,
    TokenType.ВАҚТСАБТ,
    TokenType.ВАҚТОХИР,
    TokenType.ҶАДВАЛ,
    TokenType.ФЕҲРИСТ,
    TokenType.XMLФЕҲРИСТ,
    TokenType.ПАЙҶО,
    TokenType.ПОЛИЗ,
    TokenType.ГУРУҲ,
    TokenType.ГУРУҲОХИР,
    TokenType.ГУРУҲПӮШИДА,
    TokenType.РӮЙХАТ,
    TokenType.ИЛОВА,
    TokenType.БАРОВАРДАН,
    TokenType.ДАРОЗӢ,
    TokenType.ХАРИТА,
    TokenType.ФИЛТР,
    TokenType.КОФТАН,
    TokenType.ГИРИФТАН, // Allow 'гирифтан' as identifier (common method name)
    // String methods
    TokenType.САТРМЕТОДҲО,
    TokenType.ДАРОЗИИСАТР,
    TokenType.ПАЙВАСТАН,
    TokenType.ҶОЙИВАЗКУНӢ,
    TokenType.ҶУДОКУНӢ,
    TokenType.КАЛИДҲО,
    TokenType.ҚИМАТҲО,
    TokenType.МАТЕМАТИКА,
    TokenType.ҶАМЪ,
    TokenType.ТАРҲ,
    TokenType.ЗАРБ,
    TokenType.ТАҚСИМ,
    TokenType.ҲОЛАТ,

    // Control flow keywords that can be used as property names
    TokenType.ТО,
    TokenType.АЗ,
    TokenType.ДАР,

    // Contextual Keywords: Primitive and special types
    // These can be used as identifiers in value contexts but act as keywords in type contexts
    TokenType.РАҚАМ,
    TokenType.САТР,
    TokenType.МАНТИҚӢ,
    TokenType.ХОЛӢ,
    TokenType.ОБЪЕКТ, // Contextual: can be used as variable name
    TokenType.ҲАР, // Contextual: any type
    TokenType.НОШИНОС, // Contextual: unknown type
    TokenType.АБАДАН, // Contextual: never type
    TokenType.БЕДЖАВОБ, // Contextual: void type
    TokenType.РАМЗ, // Contextual: symbol type
    TokenType.КАЛОНРАҚАМ, // Contextual: bigint type

    // Contextual Keywords: Type operators and utilities
    TokenType.НАВЪ, // Contextual: type keyword
    TokenType.КАЛИДҲОИ, // Contextual: keyof operator
    TokenType.НАВЪИ, // Contextual: typeof operator
    TokenType.САБТ_НАВЪ, // Contextual: typeof/type alias
    TokenType.ГИРИФТАН_НАВЪ, // Contextual: ReturnType utility
    TokenType.ҲАЗФ, // Contextual: Omit utility
    TokenType.ХОРИҶ, // Contextual: Exclude utility
    TokenType.ИСТИХРОҶ, // Contextual: Extract utility
    TokenType.БЕНАЛИӢ, // Contextual: Awaited utility
    TokenType.НАВЪИ_БОЗГАШТ, // Contextual: ReturnType
    TokenType.ПАРАМЕТРҲО, // Contextual: Parameters
    TokenType.НАВЪИ_НАМУНА, // Contextual: InstanceType
    TokenType.ПАРАМЕТРҲОИ_КОНСТРУКТОР, // Contextual: ConstructorParameters
    TokenType.НАВЪИ_ПАРАМЕТРИ_ИН, // Contextual: ThisParameterType
    TokenType.ИНТИЗОРШУДА, // Contextual: Awaited type

    // Type declaration keywords (contextual)
    TokenType.ЯКХЕЛА, // Contextual: extends keyword
    TokenType.МЕРОС, // Contextual: inheritance
    TokenType.ТАТБИҚ, // Contextual: implements
    TokenType.СУПЕР, // Contextual: super (can appear in expressions)
    TokenType.КОНСТРУКТОР, // Contextual: constructor
    TokenType.ХОСУСӢ, // Contextual: private
    TokenType.МУҲОФИЗАТШУДА, // Contextual: protected
    TokenType.ҶАМЪИЯТӢ, // Contextual: public
    TokenType.СТАТИКӢ, // Contextual: static
    TokenType.МАВҲУМ, // Contextual: abstract
    TokenType.НОМФАЗО, // Contextual: namespace
    TokenType.ИНФЕР, // Contextual: infer
    TokenType.ХУЛОСА, // Contextual: conclusion/end
    TokenType.ТАНҲОХОНӢ, // Contextual: readonly
    TokenType.БЕНАЗИР, // Contextual: unique
    TokenType.АСТ, // Contextual: is type guard
    TokenType.БАРМЕСОЁ, // Contextual: satisfies operator
    TokenType.ҚИСМӢ, // Contextual: Partial utility
    TokenType.ҲАТМӢ, // Contextual: Required utility
    TokenType.ТАНҲОХОН, // Contextual: Readonly utility
  ]);

  private matchBuiltinIdentifier(): boolean {
    if (this.isBuiltinIdentifierType(this.peek().type)) {
      this.advance();
      return true;
    }
    return false;
  }

  private isBuiltinIdentifierType(type: TokenType): boolean {
    return Parser.BUILTIN_IDENTIFIER_TYPES.has(type);
  }

  /** Tokens usable as a plain identifier (variable or parameter name). */
  private isPlainIdentifierToken(token: Token): boolean {
    return (
      token.type === TokenType.IDENTIFIER ||
      this.isBuiltinIdentifierType(token.type) ||
      token.type === TokenType.НАВЪ ||
      token.type === TokenType.МАЪЛУМОТ ||
      token.type === TokenType.РӮЙХАТ ||
      token.type === TokenType.БЕҚИМАТ
    );
  }

  private arrayExpression(): ArrayExpression {
    const leftBracket = this.previous();
    const elements: Expression[] = [];

    while (!this.check(TokenType.RIGHT_BRACKET)) {
      elements.push(this.spreadOrAssignment());
      if (!this.match(TokenType.COMMA)) break;
    }

    this.consume(TokenType.RIGHT_BRACKET, "Expected ']' after array elements");

    return {
      type: 'ArrayExpression',
      elements,
      line: leftBracket.line,
      column: leftBracket.column,
    } as ArrayExpression;
  }

  private objectExpression(): ObjectExpression {
    const leftBrace = this.previous();
    const properties: (Property | SpreadElement)[] = [];

    while (!this.check(TokenType.RIGHT_BRACE)) {
      if (this.check(TokenType.SPREAD)) {
        properties.push(this.spreadOrAssignment() as SpreadElement);
      } else {
        properties.push(this.parseProperty());
      }
      if (!this.match(TokenType.COMMA)) break;
    }

    this.consume(TokenType.RIGHT_BRACE, "Expected '}' after object properties");

    return {
      type: 'ObjectExpression',
      properties,
      line: leftBrace.line,
      column: leftBrace.column,
    } as ObjectExpression;
  }

  /**
   * `ҳамзамон ном() {…}`, `*ном() {…}`, `ҳамзамон *ном() {…}` in an object
   * literal — unless `ҳамзамон` is itself the key.
   */
  private parseObjectMethodModifiers(): { isAsync: boolean; generator: boolean } {
    const isAsync = this.isAsyncWord() && this.modifierApplies() && !!this.advance();
    return { isAsync, generator: this.match(TokenType.MULTIPLY) };
  }

  /** Parameters, return type and body of an object literal method, after its '('. */
  private objectMethod(
    startToken: Token,
    modifiers: { isAsync: boolean; generator: boolean }
  ): FunctionExpression {
    const { params, thisType } = this.withGenerator(false, () =>
      this.parseParametersWithThis("Expected ')' after method parameters")
    );
    let returnType: TypeAnnotation | undefined;
    if (this.match(TokenType.COLON)) {
      returnType = this.returnTypeAnnotation();
    }
    this.consume(TokenType.LEFT_BRACE, "Expected '{' before method body");
    const body = this.withGenerator(modifiers.generator, () => this.blockStatement());
    return {
      type: 'FunctionExpression',
      params,
      body,
      returnType,
      ...(modifiers.isAsync && { async: true }),
      ...(modifiers.generator && { generator: true }),
      ...(thisType && { thisType }),
      line: startToken.line,
      column: startToken.column,
    } as FunctionExpression;
  }

  private parseProperty(): Property {
    const startToken = this.peek();
    // `{ get ном() { … }, set ном(қ) { … } }`
    const accessor = this.parseAccessorKind();
    let key: Identifier | Literal;
    let computed = false;
    const modifiers = this.parseObjectMethodModifiers();

    if (this.match(TokenType.LEFT_BRACKET)) {
      // Computed property
      key = this.assignment() as Literal;
      this.consume(TokenType.RIGHT_BRACKET, "Expected ']' after computed property name");
      computed = true;
    } else if (this.match(TokenType.STRING)) {
      key = this.createLiteral(this.previous().value, this.previous());
    } else if (this.match(TokenType.NUMBER)) {
      this.checkBigIntName(this.previous());
      key = this.createNumericLiteral(this.previous());
    } else if (this.isIdentifierNameToken(this.peek())) {
      // Keywords can be used as property names
      key = this.createIdentifier(this.advance());
    } else {
      throw new Error(this.unexpectedTokenMessage('Expected property name'));
    }

    const property: Property = {
      type: 'Property',
      key,
      value: key,
      computed,
      shorthand: false,
      line: startToken.line,
      column: startToken.column,
    };

    // A generic method's type parameters: `{ ҳамон<Т>(х: Т): Т { … } }`
    const typeParameters = this.parseTypeParametersOrSkip();
    if (this.match(TokenType.LEFT_PAREN)) {
      this.parseMethodShorthand(property, startToken, accessor, modifiers);
      if (typeParameters) (property.value as FunctionExpression).typeParameters = typeParameters;
      return property;
    }

    if (modifiers.isAsync || modifiers.generator) {
      throw new Error(this.unexpectedTokenMessage("Expected '(' after method name"));
    }

    if (this.match(TokenType.COLON)) {
      property.value = this.assignment();
      return property;
    }

    // Shorthand: { ном } stands for { ном: ном }
    if (
      !computed &&
      key.type === 'Identifier' &&
      this.isPlainIdentifierToken(startToken) &&
      (this.check(TokenType.COMMA) || this.check(TokenType.RIGHT_BRACE))
    ) {
      property.value = this.createIdentifier(startToken);
      property.shorthand = true;
      return property;
    }

    throw new Error(this.unexpectedTokenMessage("Expected ':' after property key"));
  }

  /** Method shorthand `{ ном() { … } }` or accessor `{ get ном() { … } }`, after its '('. */
  private parseMethodShorthand(
    property: Property,
    startToken: Token,
    accessor: 'get' | 'set' | undefined,
    modifiers: { isAsync: boolean; generator: boolean }
  ): Property {
    const method = this.objectMethod(startToken, modifiers);
    property.value = method;
    property.method = true;
    if (accessor) {
      property.kind = accessor;
      this.checkAccessorParams(accessor, method, startToken);
    }
    return property;
  }

  private tryStatement(): TryStatement {
    const tryToken = this.previous();

    // Consume the opening brace for try block
    this.consume(TokenType.LEFT_BRACE, "Expected '{' after 'кӯшиш'");
    const block = this.blockStatement();

    let handler: CatchClause | undefined = undefined;
    if (this.match(TokenType.ГИРИФТАН)) {
      let param: CatchClause['param'];
      let typeAnnotation: TypeAnnotation | undefined;
      // The binding is optional, as in `catch { … }` (ES2019).
      if (this.match(TokenType.LEFT_PAREN)) {
        // A name or, as in JavaScript, a pattern: `гирифтан ({ message })`
        param = this.parsePattern();
        if (this.match(TokenType.COLON)) {
          typeAnnotation = this.typeAnnotation();
          this.checkCatchType(typeAnnotation);
        }
        this.consume(TokenType.RIGHT_PAREN, "Expected ')' after catch parameter");
      }
      this.consume(TokenType.LEFT_BRACE, "Expected '{' after catch clause");
      const body = this.blockStatement();

      handler = {
        type: 'CatchClause',
        param,
        ...(typeAnnotation && { typeAnnotation }),
        body,
        line: this.previous().line,
        column: this.previous().column,
      };
    }

    let finalizer: BlockStatement | undefined = undefined;
    if (this.match(TokenType.НИҲОЯТ)) {
      this.consume(TokenType.LEFT_BRACE, "Expected '{' after 'ниҳоят'");
      finalizer = this.blockStatement();
    }

    return {
      type: 'TryStatement',
      block,
      handler,
      finalizer,
      line: tryToken.line,
      column: tryToken.column,
    };
  }

  /** TypeScript's TS1196: a catch binding is typed only `ношинос` or `ҳар` (`unknown`, `any`). */
  private checkCatchType(annotation: TypeAnnotation): void {
    const type = annotation.typeAnnotation;
    const name =
      type.type === 'PrimitiveType'
        ? (type as PrimitiveType).name
        : type.type === 'GenericType' && !(type as GenericType).typeParameters
          ? (type as GenericType).name.name
          : undefined;
    if (name && ['ҳар', 'ношинос', 'any', 'unknown'].includes(name)) return;
    this.errors.push(
      `Catch clause variable type annotation must be 'ҳар' or 'ношинос' if specified at line ${type.line}, column ${type.column}`
    );
  }

  private throwStatement(): ThrowStatement {
    const throwToken = this.previous();
    const argument = this.expression();
    this.consumeSemicolon("Expected ';' after throw statement");

    return {
      type: 'ThrowStatement',
      argument,
      line: throwToken.line,
      column: throwToken.column,
    };
  }

  /**
   * Parses parameters after a consumed '(' up to and including the closing ')'.
   * `allowProperties`: a constructor, whose parameters may be parameter properties.
   */
  /**
   * Parameters of a function or method that may start with a `this`
   * parameter, `(ин: Т, х: рақам)`: its type is returned apart, since it is
   * not a parameter at run time.
   */
  private parseParametersWithThis(
    closeMessage: string,
    allowDecorators = false
  ): { params: Parameter[]; thisType?: TypeAnnotation } {
    let thisType: TypeAnnotation | undefined;
    if (this.checkSequence(TokenType.ИН, TokenType.COLON)) {
      this.advance(); // 'ин'
      this.advance(); // ':'
      thisType = this.typeAnnotation();
      if (!this.check(TokenType.RIGHT_PAREN)) {
        this.consume(TokenType.COMMA, "Expected ',' after the 'ин' parameter");
      }
    }
    const params = this.parseParameterList(closeMessage, false, allowDecorators);
    return { params, ...(thisType && { thisType }) };
  }

  private parseParameterList(
    closeMessage: string,
    allowProperties = false,
    allowDecorators = allowProperties
  ): Parameter[] {
    const params: Parameter[] = [];
    while (!this.check(TokenType.RIGHT_PAREN)) {
      const decorators = this.parseDecorators();
      if (decorators.length > 0 && !allowDecorators) this.reportInvalidDecorators(decorators);
      const param = this.parseParameter(allowProperties);
      if (decorators.length > 0) param.decorators = decorators;
      params.push(param);
      if (param.rest && !this.check(TokenType.RIGHT_PAREN)) {
        throw new Error(
          `Rest parameter must be last at line ${this.peek().line}, column ${this.peek().column}`
        );
      }
      if (!this.match(TokenType.COMMA)) break;
    }
    this.consume(TokenType.RIGHT_PAREN, closeMessage);
    return params;
  }

  private parseParameter(allowProperties = false): Parameter {
    const modifiers = this.parseParameterModifiers(allowProperties);
    const rest = this.match(TokenType.SPREAD);
    const startToken = this.peek();

    let name: Identifier;
    let pattern: ArrayPattern | ObjectPattern | undefined;
    if (this.check(TokenType.LEFT_BRACKET) || this.check(TokenType.LEFT_BRACE)) {
      pattern = this.parsePattern() as ArrayPattern | ObjectPattern;
      // Synthetic name; codegen emits `pattern` in its place
      name = {
        type: 'Identifier',
        name: `__param${this.patternCounter++}`,
        line: startToken.line,
        column: startToken.column,
      };
    } else if (
      this.check(TokenType.IDENTIFIER) ||
      this.matchBuiltinIdentifier() ||
      this.match(TokenType.НАВЪ, TokenType.МАЪЛУМОТ, TokenType.РӮЙХАТ, TokenType.БЕҚИМАТ)
    ) {
      // Common Tajik words are allowed as parameter names
      name = this.createIdentifier(
        this.check(TokenType.IDENTIFIER) ? this.advance() : this.previous()
      );
    } else {
      throw new Error(
        `Expected parameter name at line ${startToken.line}, column ${startToken.column}`
      );
    }

    // Parse optional indicator
    const optional = this.match(TokenType.QUESTION);

    // Parse optional type annotation
    let typeAnnotation: TypeAnnotation | undefined;
    if (this.match(TokenType.COLON)) {
      typeAnnotation = this.typeAnnotation();
    }

    let defaultValue: Expression | undefined;
    if (this.match(TokenType.ASSIGN)) {
      if (rest) {
        throw new Error(
          `Rest parameter cannot have a default value at line ${this.previous().line}, column ${this.previous().column}`
        );
      }
      defaultValue = this.assignment();
    }

    const param: Parameter = {
      type: 'Parameter',
      name,
      typeAnnotation,
      optional,
      line: startToken.line,
      column: startToken.column,
      ...modifiers,
    };
    if (defaultValue) param.defaultValue = defaultValue;
    if (rest) param.rest = true;
    if (pattern) param.pattern = pattern;
    return param;
  }

  private static readonly PARAMETER_MODIFIERS: ReadonlyMap<
    TokenType,
    'public' | 'private' | 'protected' | 'readonly'
  > = new Map([
    [TokenType.ҶАМЪИЯТӢ, 'public'],
    [TokenType.ХОСУСӢ, 'private'],
    [TokenType.МУҲОФИЗАТШУДА, 'protected'],
    [TokenType.ТАНҲОХОНӢ, 'readonly'],
  ]);

  /** A parameter property modifier, `бознавис` / `override` included. */
  private parameterModifier(
    token: Token
  ): 'public' | 'private' | 'protected' | 'readonly' | 'override' | undefined {
    if (token.type === TokenType.IDENTIFIER && Parser.OVERRIDE_KEYWORDS.has(token.value)) {
      return 'override';
    }
    return Parser.PARAMETER_MODIFIERS.get(token.type);
  }

  /**
   * Modifiers of a parameter property: `[ҷамъиятӣ|хосусӣ|муҳофизатшуда] [бознавис] [танҳохонӣ]`.
   * They are modifiers only when a parameter follows (`хосусӣ х`); otherwise
   * (`(хосусӣ: рақам)`) the word is the parameter's name.
   */
  private parseParameterModifiers(allowProperties: boolean): ParameterModifiers {
    const result: ParameterModifiers = {};
    const first = this.peek();
    let modifier = this.parameterModifier(first);
    while (modifier && this.startsParameterAfterModifier(this.peekNext())) {
      const token = this.advance();
      const at = `at line ${token.line}, column ${token.column}`;
      if (!allowProperties) {
        throw new Error(`A parameter property is only allowed in a constructor ${at}`);
      }
      const seen =
        modifier === 'readonly'
          ? result.readonly
          : modifier === 'override'
            ? result.override
            : result.accessibility;
      if (seen) {
        throw new Error(`Duplicate modifier '${token.value}' ${at}`);
      }
      if (modifier === 'readonly') {
        result.readonly = true;
      } else if (result.readonly) {
        throw new Error(`'${token.value}' modifier must precede 'танҳохонӣ' modifier ${at}`);
      } else if (modifier === 'override') {
        result.override = true;
      } else if (result.override) {
        throw new Error(`'${token.value}' modifier must precede 'бознавис' modifier ${at}`);
      } else {
        result.accessibility = modifier;
      }
      modifier = this.parameterModifier(this.peek());
    }
    if (first !== this.peek() && !this.isPlainIdentifierToken(this.peek())) {
      throw new Error(
        `A parameter property cannot be a rest parameter or a destructuring pattern at line ${first.line}, column ${first.column}`
      );
    }
    return result;
  }

  private startsParameterAfterModifier(token: Token | undefined): boolean {
    return (
      token !== undefined &&
      (this.isPlainIdentifierToken(token) ||
        token.type === TokenType.SPREAD ||
        token.type === TokenType.LEFT_BRACKET ||
        token.type === TokenType.LEFT_BRACE)
    );
  }

  private typeAnnotation(): TypeAnnotation {
    const typeNode = this.parseType();
    return {
      type: 'TypeAnnotation',
      typeAnnotation: typeNode,
      line: typeNode.line,
      column: typeNode.column,
    };
  }

  /** A return type annotation: a type, a type predicate or an assertion signature. */
  private returnTypeAnnotation(): TypeAnnotation {
    const typeNode = this.parseReturnType();
    return {
      type: 'TypeAnnotation',
      typeAnnotation: typeNode,
      line: typeNode.line,
      column: typeNode.column,
    };
  }

  private parseReturnType(): TypeNode {
    return this.parseTypePredicate() ?? this.parseType();
  }

  /**
   * `х аст Т` / `ин аст Т` (`x is T`), `тасдиқ х` / `тасдиқ х аст Т`
   * (`asserts x [is T]`). `аст`, `тасдиқ` and their English spellings `is`,
   * `asserts` are keywords only here.
   */
  private parseTypePredicate(): TypePredicate | undefined {
    const start = this.peek();
    const asserts = this.isAssertsModifier();
    const subjectIndex = this.current + (asserts ? 1 : 0);
    const isPredicate =
      this.isPredicateSubject(this.tokens[subjectIndex]) &&
      this.isPredicateKeyword(this.tokens[subjectIndex + 1]);
    if (!asserts && !isPredicate) return undefined;

    if (asserts) this.advance();
    const subject = this.advance();
    const parameterName =
      subject.type === TokenType.ИН
        ? ({ type: 'ThisType', line: subject.line, column: subject.column } as ThisType)
        : this.createIdentifier(subject);
    let typeAnnotation: TypeNode | undefined;
    if (isPredicate) {
      this.advance(); // 'аст'
      typeAnnotation = this.parseType();
    }
    return {
      type: 'TypePredicate',
      parameterName,
      ...(typeAnnotation && { typeAnnotation }),
      asserts,
      line: start.line,
      column: start.column,
    } as TypePredicate;
  }

  /** `тасдиқ`/`asserts` followed, on the same line, by a parameter name or `ин`. */
  private isAssertsModifier(): boolean {
    const token = this.peek();
    const next = this.peekNext();
    const isWord =
      token.type === TokenType.ТАСДИҚ ||
      (token.type === TokenType.IDENTIFIER && token.value === 'asserts');
    if (!isWord || !next || next.line !== token.line) return false;
    // `тасдиқ аст Т` is a predicate on a parameter named `тасдиқ`
    return this.isPredicateSubject(next) && !this.isPredicateKeyword(next);
  }

  private isPredicateSubject(token: Token | undefined): boolean {
    return (
      token !== undefined && (token.type === TokenType.ИН || this.isPlainIdentifierToken(token))
    );
  }

  private isPredicateKeyword(token: Token | undefined): boolean {
    return (
      token?.type === TokenType.АСТ ||
      (token?.type === TokenType.IDENTIFIER && token.value === 'is')
    );
  }

  private parseType(): TypeNode {
    return this.conditionalType();
  }

  private conditionalType(): TypeNode {
    const type = this.unionType();

    // Handle conditional types: T мерос constraint ? trueType : falseType
    if (this.match(TokenType.МЕРОС)) {
      const constraint = this.unionType();

      if (!this.match(TokenType.QUESTION)) {
        this.errors.push(
          `Expected '?' in conditional type at line ${this.peek().line}, column ${this.peek().column}`
        );
        return type;
      }

      const trueType = this.unionType();

      if (!this.match(TokenType.COLON)) {
        this.errors.push(
          `Expected ':' in conditional type at line ${this.peek().line}, column ${this.peek().column}`
        );
        return type;
      }

      const falseType = this.conditionalType(); // Right-associative for nested conditionals

      return {
        type: 'ConditionalType',
        checkType: type,
        extendsType: constraint,
        trueType,
        falseType,
        line: type.line,
        column: type.column,
      } as ConditionalType;
    }

    return type;
  }

  /** `А | Б`; as in TypeScript a `|` may lead: `| "а" | "б"` (handy across lines). */
  private unionType(): TypeNode {
    const leading = this.match(TokenType.BITWISE_OR) ? this.previous() : undefined;
    const type = this.intersectionType();
    if (!this.check(TokenType.BITWISE_OR)) return type;
    const types = [type];
    while (this.match(TokenType.BITWISE_OR)) {
      types.push(this.intersectionType());
    }
    const start = leading ?? type;
    return { type: 'UnionType', types, line: start.line, column: start.column } as UnionType;
  }

  /** `А & Б`; a leading `&` is allowed, as in TypeScript: `& А & Б`. */
  private intersectionType(): TypeNode {
    const leading = this.match(TokenType.BITWISE_AND) ? this.previous() : undefined;
    const type = this.primaryType();
    if (!this.check(TokenType.BITWISE_AND)) return type;
    const types = [type];
    while (this.match(TokenType.BITWISE_AND)) {
      types.push(this.primaryType());
    }
    const start = leading ?? type;
    return {
      type: 'IntersectionType',
      types,
      line: start.line,
      column: start.column,
    } as IntersectionType;
  }

  private primaryType(): TypeNode {
    let type =
      this.parseParenthesizedOrArrayType() ??
      this.parseConstructorType() ??
      this.parseReadonlyType() ??
      this.parseThisType() ??
      this.parseUniqueType() ??
      this.parseKeyofType() ??
      this.parseLiteralType() ??
      this.parsePrimitiveType() ??
      this.parseGenericOrIdentifierType() ??
      this.parseTupleType() ??
      this.parseObjectType() ??
      this.errorExpectedType();

    // Postfix forms: array `Т[]` and indexed access `Т[К]`, on the line of `Т`
    while (!this.hasLineBreakBefore() && this.match(TokenType.LEFT_BRACKET)) {
      if (this.match(TokenType.RIGHT_BRACKET)) {
        type = {
          type: 'ArrayType',
          elementType: type,
          line: type.line,
          column: type.column,
        } as ArrayType;
      } else {
        const indexType = this.parseType();
        this.consume(TokenType.RIGHT_BRACKET, "Expected ']' after index type");
        type = {
          type: 'IndexedAccessType',
          objectType: type,
          indexType,
          line: type.line,
          column: type.column,
        } as IndexedAccessType;
      }
    }
    return type;
  }

  /** `калидҳои Т` (keyof) */
  private parseKeyofType(): TypeNode | undefined {
    if (!this.match(TokenType.КАЛИДҲОИ)) return undefined;
    const keyofToken = this.previous();
    return {
      type: 'KeyofType',
      operand: this.primaryType(),
      line: keyofToken.line,
      column: keyofToken.column,
    } as KeyofType;
  }

  private parseParenthesizedOrArrayType(): TypeNode | undefined {
    if (!this.check(TokenType.LEFT_PAREN)) return undefined;
    if (this.isFunctionTypeStart()) return this.parseFunctionType();
    this.advance();
    const type = this.parseType();
    this.consume(TokenType.RIGHT_PAREN, "Expected ')' after type");
    return type;
  }

  /** At `(`: does the matching `)` precede `=>`? Then this is a function type. */
  private isFunctionTypeStart(): boolean {
    let depth = 0;
    for (let i = this.current; i < this.tokens.length; i++) {
      const type = this.tokens[i].type;
      if (type === TokenType.LEFT_PAREN) depth++;
      else if (type === TokenType.RIGHT_PAREN && --depth === 0) {
        return this.tokens[i + 1]?.type === TokenType.ARROW;
      } else if (type === TokenType.EOF) return false;
    }
    return false;
  }

  /** `(а: рақам, ...б: сатр[]) => мантиқӣ` */
  private parseFunctionType(): FunctionType {
    const openParen = this.advance();
    const { params: parameters, thisType } = this.parseParametersWithThis(
      "Expected ')' after function type parameters"
    );
    this.consume(TokenType.ARROW, "Expected '=>' in function type");
    return {
      type: 'FunctionType',
      parameters,
      returnType: this.parseReturnType(),
      ...(thisType && { thisType: thisType.typeAnnotation }),
      line: openParen.line,
      column: openParen.column,
    };
  }

  /** `нав (а: рақам) => Т`, `мавҳум нав () => Т` */
  private parseConstructorType(): ConstructorType | undefined {
    const isAbstract = this.checkSequence(TokenType.МАВҲУМ, TokenType.НАВ);
    if (!isAbstract && !this.check(TokenType.НАВ)) return undefined;
    const start = this.advance();
    if (isAbstract) this.advance(); // 'нав'
    this.consume(TokenType.LEFT_PAREN, "Expected '(' after 'нав' in constructor type");
    const parameters = this.parseParameterList("Expected ')' after constructor type parameters");
    this.consume(TokenType.ARROW, "Expected '=>' in constructor type");
    return {
      type: 'ConstructorType',
      parameters,
      returnType: this.parseType(),
      ...(isAbstract && { abstract: true }),
      line: start.line,
      column: start.column,
    } as ConstructorType;
  }

  /** `танҳохонӣ рақам[]`, `танҳохонӣ [рақам, сатр]`; a bare `танҳохонӣ` stays a type name. */
  private parseReadonlyType(): ReadonlyType | undefined {
    const next = this.peekNext();
    if (!this.check(TokenType.ТАНҲОХОНӢ) || !next || Parser.TYPE_FOLLOWERS.has(next.type)) {
      return undefined;
    }
    const readonlyToken = this.advance();
    return {
      type: 'ReadonlyType',
      typeAnnotation: this.primaryType(),
      line: readonlyToken.line,
      column: readonlyToken.column,
    };
  }

  /** Tokens that may follow a complete type, so they cannot start the operand of `танҳохонӣ`. */
  private static readonly TYPE_FOLLOWERS: ReadonlySet<TokenType> = new Set([
    TokenType.ASSIGN,
    TokenType.SEMICOLON,
    TokenType.COMMA,
    TokenType.COLON,
    TokenType.QUESTION,
    TokenType.GREATER_THAN,
    TokenType.RIGHT_SHIFT,
    TokenType.UNSIGNED_RIGHT_SHIFT,
    TokenType.RIGHT_PAREN,
    TokenType.RIGHT_BRACKET,
    TokenType.RIGHT_BRACE,
    TokenType.LEFT_BRACE,
    TokenType.BITWISE_OR,
    TokenType.BITWISE_AND,
    TokenType.ARROW,
    TokenType.DOT,
    TokenType.LESS_THAN,
    TokenType.МЕРОС,
    TokenType.EOF,
  ]);

  /** `ин` as a type: `илова(): ин` */
  private parseThisType(): ThisType | undefined {
    if (!this.match(TokenType.ИН)) return undefined;
    const token = this.previous();
    return { type: 'ThisType', line: token.line, column: token.column };
  }

  private parseUniqueType(): TypeNode | undefined {
    if (!this.match(TokenType.БЕНАЗИР)) return undefined;
    const uniqueToken = this.previous();
    const baseType = this.primaryType();
    const uniqueType: UniqueType = {
      type: 'UniqueType',
      baseType,
      line: uniqueToken.line,
      column: uniqueToken.column,
    };
    return uniqueType;
  }

  private parseLiteralType(): TypeNode | undefined {
    // Parse string literals in types (e.g., "фъало" in union types)
    if (this.check(TokenType.STRING)) {
      const token = this.advance();
      return {
        type: 'LiteralType',
        value: token.value,
        line: token.line,
        column: token.column,
      } as LiteralType;
    }
    // Parse number literals in types (e.g., 1 | 2 in union types), also negative ones (`-1`)
    if (this.check(TokenType.NUMBER) || this.checkSequence(TokenType.MINUS, TokenType.NUMBER)) {
      const start = this.peek();
      const negative = this.match(TokenType.MINUS);
      const token = this.advance();
      const literal = this.createNumericLiteral(token);
      return {
        type: 'LiteralType',
        value: negative ? -(literal.value as number) : (literal.value as number),
        ...(literal.raw.endsWith('n') && { bigint: true }),
        line: start.line,
        column: start.column,
      } as LiteralType;
    }
    // A template literal type: `пеш_${К}`
    if (this.match(TokenType.TEMPLATE_LITERAL)) {
      return this.parseTemplateLiteralType(this.previous());
    }
    // Parse boolean literals in types (e.g., true | false)
    if (this.match(TokenType.ДУРУСТ, TokenType.НОДУРУСТ)) {
      const token = this.previous();
      return {
        type: 'LiteralType',
        value: token.type === TokenType.ДУРУСТ,
        line: token.line,
        column: token.column,
      } as LiteralType;
    }
    return undefined;
  }

  /** `` `пеш_${К}-${рақам}` ``: each `${…}` holds a type, parsed by a sub-parser. */
  private parseTemplateLiteralType(token: Token): TemplateLiteralType {
    const quasis: string[] = [];
    const types: TypeNode[] = [];
    for (const part of this.splitTemplate(token.value)) {
      if (part.type === 'text') {
        quasis.push(part.value);
      } else {
        const { line, column } = this.templateOffsetPosition(token, part.offset);
        types.push(
          this.parseSubSource(
            part.value,
            line,
            column,
            sub => sub.parseType(),
            "Expected '}' after template type"
          )
        );
      }
    }
    return { type: 'TemplateLiteralType', quasis, types, line: token.line, column: token.column };
  }

  private parsePrimitiveType(): TypeNode | undefined {
    if (
      !this.match(
        TokenType.САТР,
        TokenType.РАҚАМ,
        TokenType.МАНТИҚӢ,
        TokenType.ХОЛӢ,
        TokenType.БЕҚИМАТ,
        TokenType.ҲАР,
        TokenType.НОШИНОС,
        TokenType.АБАДАН,
        TokenType.БЕДЖАВОБ,
        TokenType.ОБЪЕКТ,
        TokenType.РАМЗ,
        TokenType.КАЛОНРАҚАМ
      )
    ) {
      return undefined;
    }
    const token = this.previous();
    const primitiveType: PrimitiveType = {
      type: 'PrimitiveType',
      // `null` is read as `холӣ`
      name: (token.type === TokenType.ХОЛӢ ? 'холӣ' : token.value) as PrimitiveType['name'],
      line: token.line,
      column: token.column,
    };
    return primitiveType;
  }

  /**
   * `навъи х` / `typeof х` (TypeQuery) and `инфер У` / `infer У` (InferType):
   * the word is a type operator only when a name follows on its line.
   */
  private parseTypeQueryOrInfer(): TypeNode | undefined {
    const token = this.peek();
    const next = this.peekNext();
    if (!next || next.line !== token.line || !this.isTypeNameToken(next)) return undefined;
    const isQuery =
      token.type === TokenType.НАВЪИ ||
      (token.type === TokenType.IDENTIFIER && token.value === 'typeof');
    const isInfer =
      token.type === TokenType.ИНФЕР ||
      (token.type === TokenType.IDENTIFIER && token.value === 'infer');
    if (!isQuery && !isInfer) return undefined;
    this.advance();
    const nameToken = this.advance();
    if (isInfer) {
      return {
        type: 'InferType',
        typeParameter: {
          type: 'TypeParameter',
          name: this.createIdentifier(nameToken),
          line: nameToken.line,
          column: nameToken.column,
        },
        line: token.line,
        column: token.column,
      } as InferType;
    }
    // `навъи о.а.б`: a dotted value name
    let name = nameToken.value;
    while (this.check(TokenType.DOT) && this.peekNext() && this.isTypeNameToken(this.peekNext()!)) {
      this.advance();
      name += `.${this.advance().value}`;
    }
    return {
      type: 'TypeQuery',
      exprName: { type: 'Identifier', name, line: nameToken.line, column: nameToken.column },
      line: token.line,
      column: token.column,
    } as TypeQuery;
  }

  /** A name in a type: an identifier, a contextual keyword, or `ин`. */
  private isTypeNameToken(token: Token): boolean {
    return (
      token.type === TokenType.IDENTIFIER ||
      token.type === TokenType.ИН ||
      this.isBuiltinIdentifierType(token.type)
    );
  }

  private parseGenericOrIdentifierType(): TypeNode | undefined {
    const operator = this.parseTypeQueryOrInfer();
    if (operator) return operator;
    // Allow certain keywords to be used as type names
    if (
      !this.check(TokenType.IDENTIFIER) &&
      !this.matchBuiltinIdentifier() &&
      // `Ваъда<Т>` (a builtin identifier) is the Promise type
      !this.match(TokenType.ФУНКСИЯ)
    ) {
      return undefined;
    }
    const nameToken = this.check(TokenType.IDENTIFIER) ? this.advance() : this.previous();

    // Build the full name, handling qualified types like Foo.Bar
    let fullName = nameToken.value;

    // Handle qualified type names (e.g., Namespace.Type)
    while (this.match(TokenType.DOT)) {
      if (this.check(TokenType.IDENTIFIER)) {
        const nextToken = this.advance();
        fullName += '.' + nextToken.value;
      } else if (this.matchBuiltinIdentifier()) {
        const nextToken = this.previous();
        fullName += '.' + nextToken.value;
      } else {
        // If we can't parse what comes after the dot, treat it as an error
        this.errors.push(`Expected type name after '.' at line ${this.peek().line}`);
        break;
      }
    }

    const name: Identifier = {
      type: 'Identifier',
      name: fullName,
      line: nameToken.line,
      column: nameToken.column,
    };
    let typeParameters: TypeNode[] | undefined;
    if (this.match(TokenType.LESS_THAN)) {
      typeParameters = [];
      do {
        typeParameters.push(this.parseType());
      } while (this.match(TokenType.COMMA));
      this.consumeTypeArgumentsClose();
    }
    const genericType: GenericType = {
      type: 'GenericType',
      name,
      typeParameters,
      line: name.line,
      column: name.column,
    };
    return genericType;
  }

  /**
   * Named tuple members (`[х: рақам, у?: рақам]`): the label is documentation
   * only. Returns true for an optional label (`у?:`).
   */
  private skipTupleMemberLabel(): boolean {
    if (!this.check(TokenType.IDENTIFIER) && !this.isBuiltinIdentifierType(this.peek().type)) {
      return false;
    }
    const optional = this.peekNext()?.type === TokenType.QUESTION;
    if (this.tokens[this.current + (optional ? 2 : 1)]?.type !== TokenType.COLON) return false;
    this.current += optional ? 3 : 2;
    return optional;
  }

  /** A tuple element: `Т`, optional `Т?` / `н?: Т`, or rest `...Т[]` / `...н: Т[]`. */
  private parseTupleElement(): TypeNode {
    const spread = this.match(TokenType.SPREAD) ? this.previous() : undefined;
    const optionalLabel = this.skipTupleMemberLabel();
    const elementType = this.unionType();
    if (spread) {
      return {
        type: 'RestType',
        typeAnnotation: elementType,
        line: spread.line,
        column: spread.column,
      } as RestType;
    }
    if (!optionalLabel && !this.match(TokenType.QUESTION)) return elementType;
    return {
      type: 'OptionalType',
      typeAnnotation: elementType,
      line: elementType.line,
      column: elementType.column,
    } as OptionalType;
  }

  private parseTupleType(): TypeNode | undefined {
    if (!this.match(TokenType.LEFT_BRACKET)) return undefined;
    const types: TypeNode[] = [];
    if (!this.check(TokenType.RIGHT_BRACKET)) {
      do {
        types.push(this.parseTupleElement());
      } while (this.match(TokenType.COMMA));
    }
    this.consume(TokenType.RIGHT_BRACKET, "Expected ']' after tuple types");
    const tupleType: TupleType = {
      type: 'TupleType',
      elementTypes: types,
      line: this.previous().line,
      column: this.previous().column,
    };
    return tupleType;
  }

  private parseObjectType(): TypeNode | undefined {
    if (!this.match(TokenType.LEFT_BRACE)) return undefined;
    const leftBrace = this.previous();
    if (this.isMappedTypeStart()) {
      return this.parseMappedType(leftBrace);
    }

    const properties: PropertySignature[] = [];
    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      properties.push(this.propertySignature());
    }

    this.consume(TokenType.RIGHT_BRACE, "Expected '}' after object type properties");

    return {
      type: 'ObjectType',
      properties,
      line: leftBrace.line,
      column: leftBrace.column,
    } as ObjectType;
  }

  /** After '{': `[танҳохонӣ] [К дар …]` starts a mapped type. */
  private isMappedTypeStart(): boolean {
    let index = this.current;
    if (
      this.tokens[index]?.type === TokenType.PLUS ||
      this.tokens[index]?.type === TokenType.MINUS
    ) {
      index++;
    }
    if (this.tokens[index]?.type === TokenType.ТАНҲОХОНӢ) index++;
    return (
      this.tokens[index]?.type === TokenType.LEFT_BRACKET &&
      this.tokens[index + 1] !== undefined &&
      this.isPlainIdentifierToken(this.tokens[index + 1]) &&
      this.tokens[index + 2]?.type === TokenType.ДАР
    );
  }

  /**
   * `{ [+|-]танҳохонӣ [К дар Т чун Н]+?|-?: Х }` — types are erased, so `+`/`-`
   * only parse.
   */
  private parseMappedType(leftBrace: Token): TypeNode {
    const removesReadonly = this.match(TokenType.MINUS);
    const addsReadonly = !removesReadonly && this.match(TokenType.PLUS);
    const hasReadonly = this.match(TokenType.ТАНҲОХОНӢ);
    const readonly = hasReadonly && !removesReadonly;
    let readonlyModifier: '+' | '-' | undefined;
    if (hasReadonly && (removesReadonly || addsReadonly)) {
      readonlyModifier = removesReadonly ? '-' : '+';
    }

    this.consume(TokenType.LEFT_BRACKET, "Expected '[' in mapped type");
    const nameToken = this.advance();
    this.consume(TokenType.ДАР, "Expected 'дар' in mapped type");
    const constraint = this.parseType();
    // Key remapping (TypeScript `as`): `[К дар калидҳои Т чун Н]`
    let nameType: TypeNode | undefined;
    if (this.check(TokenType.ЧУН) || this.checkIdentifierValue('as')) {
      this.advance();
      nameType = this.parseType();
    }
    this.consume(TokenType.RIGHT_BRACKET, "Expected ']' in mapped type");

    let optional = false;
    let optionalModifier: '+' | '-' | undefined;
    if (this.match(TokenType.MINUS)) {
      this.consume(TokenType.QUESTION, "Expected '?' after '-' in mapped type");
      optionalModifier = '-';
    } else {
      if (this.match(TokenType.PLUS)) optionalModifier = '+';
      optional = this.match(TokenType.QUESTION);
    }

    this.consume(TokenType.COLON, "Expected ':' in mapped type");
    const typeAnnotation = this.typeAnnotation();
    this.match(TokenType.SEMICOLON, TokenType.COMMA);
    this.consume(TokenType.RIGHT_BRACE, "Expected '}' after mapped type");

    return {
      type: 'MappedType',
      typeParameter: {
        type: 'TypeParameter',
        name: this.createIdentifier(nameToken),
        constraint,
        line: nameToken.line,
        column: nameToken.column,
      },
      typeAnnotation,
      optional,
      readonly,
      ...(nameType && { nameType }),
      ...(readonlyModifier && { readonlyModifier }),
      ...(optionalModifier && { optionalModifier }),
      line: leftBrace.line,
      column: leftBrace.column,
    } as MappedType;
  }

  /** Consumes one '>' closing type arguments, splitting a `>>` / `>>>` token if needed. */
  private consumeTypeArgumentsClose(message = "Expected '>' after type parameters"): void {
    const token = this.peek();
    if (token.type === TokenType.RIGHT_SHIFT || token.type === TokenType.UNSIGNED_RIGHT_SHIFT) {
      const rest = token.value.slice(1);
      this.tokenSplits?.push({ index: this.current, token });
      this.tokens.splice(
        this.current,
        1,
        { ...token, type: TokenType.GREATER_THAN, value: '>' },
        {
          ...token,
          type: rest === '>' ? TokenType.GREATER_THAN : TokenType.RIGHT_SHIFT,
          value: rest,
          column: token.column + 1,
        }
      );
    }
    this.consume(TokenType.GREATER_THAN, message);
  }

  private errorExpectedType(): never {
    throw new Error(`Expected type at line ${this.peek().line}, column ${this.peek().column}`);
  }

  /** `<Т, К мерос калидҳои Т = Т>` */
  private parseTypeParameters(): TypeParameter[] | undefined {
    if (!this.match(TokenType.LESS_THAN)) {
      return undefined;
    }

    const typeParameters: TypeParameter[] = [];
    do {
      // A trailing comma is allowed: `<Т,>(х: Т) => х`
      if (typeParameters.length > 0 && this.check(TokenType.GREATER_THAN)) break;
      const start = this.peek();
      const modifiers = this.parseTypeParameterModifiers();
      const paramName = this.parseImportOrExportName('Expected type parameter name');
      const typeParameter: TypeParameter = {
        type: 'TypeParameter',
        name: this.createIdentifier(paramName),
        ...modifiers,
        line: start.line,
        column: start.column,
      };
      // `мерос` or, as in TypeScript, `extends`
      if (this.match(TokenType.МЕРОС) || this.matchIdentifierValue('extends')) {
        typeParameter.constraint = this.parseType();
      }
      if (this.match(TokenType.ASSIGN)) {
        typeParameter.default = this.parseType();
      }
      typeParameters.push(typeParameter);
    } while (this.match(TokenType.COMMA));

    this.consumeTypeArgumentsClose();
    return typeParameters;
  }

  /**
   * `собит` (const), `дар` (in) and `берун` (out) before a type parameter name,
   * as in TypeScript `<const T>`, `<in out T>` (the English words work too).
   * Each is a modifier only when a name follows; `<берун>` names the parameter.
   */
  private parseTypeParameterModifiers(): Pick<TypeParameter, 'const' | 'in' | 'out'> {
    const modifiers: Pick<TypeParameter, 'const' | 'in' | 'out'> = {};
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const token = this.peek();
      const modifier = this.typeParameterModifier(token);
      const next = this.peekNext();
      if (!modifier || !next || !this.startsTypeParameter(next)) return modifiers;
      modifiers[modifier] = true;
      this.advance();
    }
  }

  private typeParameterModifier(token: Token): 'const' | 'in' | 'out' | undefined {
    if (token.type === TokenType.СОБИТ) return 'const';
    if (token.type === TokenType.ДАР) return 'in';
    if (token.type !== TokenType.IDENTIFIER) return undefined;
    return Parser.TYPE_PARAMETER_MODIFIER_WORDS.get(token.value);
  }

  private static readonly TYPE_PARAMETER_MODIFIER_WORDS: ReadonlyMap<
    string,
    'const' | 'in' | 'out'
  > = new Map([
    ['берун', 'out'],
    ['const', 'const'],
    ['in', 'in'],
    ['out', 'out'],
  ]);

  /** A type parameter name, or another modifier, follows a modifier word. */
  private startsTypeParameter(token: Token): boolean {
    if (this.typeParameterModifier(token)) return true;
    if (token.type === TokenType.IDENTIFIER) return token.value !== 'extends';
    // `<берун мерос рақам>`: a parameter named `берун`
    return token.type !== TokenType.МЕРОС && this.isBuiltinIdentifierType(token.type);
  }

  /**
   * TypeScript's rules for type parameter modifiers: `собит` only on functions,
   * methods and classes, `дар`/`берун` only on classes, interfaces and type aliases.
   */
  private checkTypeParameterModifiers(
    typeParameters: TypeParameter[] | undefined,
    owner: 'function' | 'class' | 'interface' | 'alias'
  ): void {
    for (const parameter of typeParameters ?? []) {
      const at = `at line ${parameter.line}, column ${parameter.column}`;
      if (parameter.const && (owner === 'interface' || owner === 'alias')) {
        this.errors.push(
          `'собит' modifier can only appear on a type parameter of a function, method or class ${at}`
        );
      }
      if ((parameter.in || parameter.out) && owner === 'function') {
        const word = parameter.in ? 'дар' : 'берун';
        this.errors.push(
          `'${word}' modifier can only appear on a type parameter of a class, interface or type alias ${at}`
        );
      }
    }
  }

  private matchIdentifierValue(value: string): boolean {
    if (!this.checkIdentifierValue(value)) return false;
    this.advance();
    return true;
  }

  /**
   * Type parameters of a function, class or method. Lists that are not
   * understood are skipped, the way all of them were before they were kept.
   */
  private parseTypeParametersOrSkip(): TypeParameter[] | undefined {
    if (!this.check(TokenType.LESS_THAN)) return undefined;
    const typeParameters = this.speculateCleanly(() => this.parseTypeParameters());
    if (typeParameters) return typeParameters;
    this.skipGenericTypeArguments();
    return undefined;
  }

  /** `мерос А, Б<Т>` — the parent interfaces, or undefined without a clause. */
  private parseInterfaceExtendsClause(): TypeNode[] | undefined {
    if (!this.match(TokenType.МЕРОС)) {
      return undefined;
    }

    const parents: TypeNode[] = [];
    do {
      const parent = this.parseGenericOrIdentifierType();
      if (!parent) {
        throw new Error(
          `Expected interface name after 'мерос' at line ${this.peek().line}, column ${this.peek().column}`
        );
      }
      parents.push(parent);
    } while (this.match(TokenType.COMMA));
    return parents;
  }

  private parseInterfaceProperties(): PropertySignature[] {
    const properties: PropertySignature[] = [];

    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      properties.push(this.propertySignature());
    }

    return properties;
  }

  public interfaceDeclaration(): InterfaceDeclaration {
    const interfaceToken = this.previous();
    const name = this.parseImportOrExportName('Expected interface name');
    const typeParameters = this.parseTypeParameters();
    this.checkTypeParameterModifiers(typeParameters, 'interface');

    const parents = this.parseInterfaceExtendsClause();
    this.consume(TokenType.LEFT_BRACE, "Expected '{' after interface name");

    const properties = this.parseInterfaceProperties();
    this.consume(TokenType.RIGHT_BRACE, "Expected '}' after interface body");

    return {
      type: 'InterfaceDeclaration',
      name: {
        type: 'Identifier',
        name: name.value,
        line: name.line,
        column: name.column,
      },
      typeParameters,
      extends: parents,
      body: {
        type: 'InterfaceBody',
        properties,
        line: interfaceToken.line,
        column: interfaceToken.column,
      },
      line: interfaceToken.line,
      column: interfaceToken.column,
    } as InterfaceDeclaration;
  }

  /**
   * Index signature `[калид: сатр]: Т;`: the key parameter is kept as
   * `indexSignature` (as for a class's index signature); the key is the
   * placeholder `__computed__`.
   */
  private parseComputedPropertySignature(readonly: boolean): PropertySignature {
    const bracket = this.advance(); // consume '['
    const name = this.createIdentifier(this.advance());
    this.consume(TokenType.COLON, "Expected ':' in index signature");
    const keyType = this.typeAnnotation();
    this.consume(TokenType.RIGHT_BRACKET, "Expected ']' after computed property name");
    this.consume(TokenType.COLON, "Expected ':' after computed property name");
    const typeAnnotation = this.typeAnnotation();
    this.consumeMemberSeparator("Expected ';' after property type");

    return {
      type: 'PropertySignature',
      key: {
        type: 'Identifier',
        name: '__computed__', // Placeholder for computed property
        line: bracket.line,
        column: bracket.column,
      },
      typeAnnotation,
      optional: false,
      readonly,
      indexSignature: {
        type: 'Parameter',
        name,
        typeAnnotation: keyType,
        line: name.line,
        column: name.column,
      },
      line: bracket.line,
      column: bracket.column,
    };
  }

  /**
   * Method signature `ном[?][<Т>](параметрҳо)[: Навъ];`, recorded as a member
   * whose type is the function type. A missing return type is `ҳар`, as in
   * TypeScript.
   */
  private parseMethodSignature(
    keyName: Token,
    readonly: boolean,
    optional: boolean
  ): PropertySignature {
    const typeParameters = this.parseTypeParametersOrSkip();
    this.checkTypeParameterModifiers(typeParameters, 'function');
    const openParen = this.consume(TokenType.LEFT_PAREN, "Expected '(' in method signature");
    const { params: parameters, thisType } = this.parseParametersWithThis(
      "Expected ')' after method parameters"
    );

    const returnType: TypeNode = this.match(TokenType.COLON)
      ? this.parseReturnType()
      : ({
          type: 'PrimitiveType',
          name: 'ҳар',
          line: openParen.line,
          column: openParen.column,
        } as TypeNode);
    this.consumeMemberSeparator("Expected ';' after method signature");

    const functionType: FunctionType = {
      type: 'FunctionType',
      parameters,
      returnType,
      ...(thisType && { thisType: thisType.typeAnnotation }),
      line: keyName.line,
      column: keyName.column,
    };
    return {
      type: 'PropertySignature',
      key: this.createSignatureKey(keyName),
      typeAnnotation: {
        type: 'TypeAnnotation',
        typeAnnotation: functionType,
        line: keyName.line,
        column: keyName.column,
      },
      optional,
      readonly,
      method: true,
      ...(typeParameters && { typeParameters }),
      line: keyName.line,
      column: keyName.column,
    };
  }

  /**
   * `[ифода]: Т;` / `[ифода](…): Т;`, a member with a computed name such as a
   * `беназир рамз` (unique symbol) constant. Its name is only known at run
   * time, so it is marked `computed` (the expression is `computedKey`) and
   * the type checker leaves it out.
   */
  private parseComputedNameSignature(readonly: boolean): PropertySignature {
    const open = this.advance(); // '['
    // The name: the type checker leaves the member out, the TypeScript emitter keeps it
    const computedKey = this.assignment();
    this.consume(TokenType.RIGHT_BRACKET, "Expected ']' after computed property name");
    const keyName: Token = { ...open, type: TokenType.IDENTIFIER, value: '__computed_name__' };
    const optional = this.match(TokenType.QUESTION);
    const signature =
      this.check(TokenType.LEFT_PAREN) || this.check(TokenType.LESS_THAN)
        ? this.parseMethodSignature(keyName, readonly, optional)
        : this.finishPropertySignature(keyName, readonly, optional);
    return { ...signature, computed: true, computedKey };
  }

  /**
   * A call signature `<Т>(х: Т): Т;` or construct signature `нав (х: рақам): К;`
   * of an interface or object type, after `нав`: a member named
   * `__call__` / `__new__` whose type is the function or constructor type. A
   * missing return type is `ҳар`, as in TypeScript.
   */
  private parseCallSignature(kind: 'call' | 'construct', start: Token): PropertySignature {
    const typeParameters = this.parseTypeParametersOrSkip();
    this.checkTypeParameterModifiers(typeParameters, 'function');
    const open = this.consume(TokenType.LEFT_PAREN, "Expected '(' in a call signature");
    const { params: parameters, thisType } = this.parseParametersWithThis(
      "Expected ')' after signature parameters"
    );
    const returnType: TypeNode = this.match(TokenType.COLON)
      ? this.parseReturnType()
      : ({ type: 'PrimitiveType', name: 'ҳар', line: open.line, column: open.column } as TypeNode);
    this.consumeMemberSeparator("Expected ';' after a signature");
    const position = { line: start.line, column: start.column };
    const signatureType: FunctionType | ConstructorType =
      kind === 'call'
        ? {
            type: 'FunctionType',
            parameters,
            returnType,
            ...(thisType && { thisType: thisType.typeAnnotation }),
            ...position,
          }
        : { type: 'ConstructorType', parameters, returnType, ...position };
    return {
      type: 'PropertySignature',
      // The placeholder name sits at the `(`: `нав` stays a keyword for the formatter
      key: {
        type: 'Identifier',
        name: kind === 'call' ? '__call__' : '__new__',
        line: open.line,
        column: open.column,
      },
      typeAnnotation: { type: 'TypeAnnotation', typeAnnotation: signatureType, ...position },
      optional: false,
      signature: kind,
      ...(typeParameters && { typeParameters }),
      ...position,
    };
  }

  /** `get ном(): Т;` / `set ном(қ: Т);`: a property, read-only with a getter alone. */
  private parseAccessorSignature(accessor: 'get' | 'set', keyName: Token): PropertySignature {
    this.consume(TokenType.LEFT_PAREN, `Expected '(' after the name of a '${accessor}' accessor`);
    const params = this.parseParameterList("Expected ')' after accessor parameters");
    const returnType = this.match(TokenType.COLON) ? this.typeAnnotation() : undefined;
    this.consumeMemberSeparator("Expected ';' after accessor signature");
    const method = {
      type: 'FunctionExpression',
      params,
      returnType,
      line: keyName.line,
      column: keyName.column,
    } as FunctionExpression;
    this.checkAccessorParams(accessor, method, keyName);
    const typeAnnotation =
      accessor === 'get' ? returnType : (params[0]?.typeAnnotation ?? returnType);
    return {
      type: 'PropertySignature',
      key: this.createSignatureKey(keyName),
      typeAnnotation: typeAnnotation ?? {
        type: 'TypeAnnotation',
        typeAnnotation: {
          type: 'PrimitiveType',
          name: 'ҳар',
          line: keyName.line,
          column: keyName.column,
        } as TypeNode,
        line: keyName.line,
        column: keyName.column,
      },
      optional: false,
      kind: accessor,
      line: keyName.line,
      column: keyName.column,
    };
  }

  /** The name of an interface or object type member: any word, a string or a number. */
  private parsePropertyKeyName(): Token {
    const token = this.peek();
    if (token.type === TokenType.STRING || this.isIdentifierNameToken(token)) {
      return this.advance();
    }
    if (token.type === TokenType.NUMBER) {
      this.checkBigIntName(token);
      return this.advance();
    }
    throw new Error(`Expected property name at line ${token.line}, column ${token.column}`);
  }

  /** `"а-б": Т` and `1: Т` keep their literal names; any other name is an identifier. */
  private createSignatureKey(token: Token): Identifier | Literal {
    if (token.type === TokenType.STRING) return this.createLiteral(token.value, token);
    if (token.type === TokenType.NUMBER) return this.createNumericLiteral(token);
    return this.createIdentifier(token);
  }

  /** TypeScript's TS1539: `1n` is no property name. */
  private checkBigIntName(token: Token): void {
    if (token.type === TokenType.NUMBER && token.value.endsWith('n')) {
      this.errors.push(
        `A bigint literal cannot be used as a property name at line ${token.line}, column ${token.column}`
      );
    }
  }

  /**
   * Modifiers that a member of an interface or object type cannot have
   * (TypeScript's TS1070, and TS1275 for `дастрасӣ`): reported, then skipped.
   */
  private skipTypeMemberModifiers(): void {
    for (;;) {
      const token = this.peek();
      const isModifier =
        Parser.CLASS_ONLY_MODIFIERS.has(token.type) ||
        (token.type === TokenType.IDENTIFIER && this.memberModifier(token) !== undefined);
      if (!isModifier || !this.modifierApplies()) return;
      const at = `at line ${token.line}, column ${token.column}`;
      this.errors.push(
        this.memberModifier(token) === 'accessor'
          ? `'${token.value}' modifier can only appear on a property declaration ${at}`
          : `'${token.value}' modifier cannot appear on a type member ${at}`
      );
      this.advance();
    }
  }

  /** Modifier keywords of class members only. */
  private static readonly CLASS_ONLY_MODIFIERS: ReadonlySet<TokenType> = new Set([
    TokenType.ҶАМЪИЯТӢ,
    TokenType.ХОСУСӢ,
    TokenType.МУҲОФИЗАТШУДА,
    TokenType.СТАТИКӢ,
    TokenType.МАВҲУМ,
    TokenType.ҲАМЗАМОН,
  ]);

  private propertySignature(): PropertySignature {
    this.skipTypeMemberModifiers();
    // `танҳохонӣ ном: Т;` — a member may itself be named `танҳохонӣ`
    const readonly = this.check(TokenType.ТАНҲОХОНӢ) && this.modifierApplies() && !!this.advance();

    // Call and construct signatures: `(х: рақам): сатр;`, `нав (х: рақам): К;`
    if (this.check(TokenType.LEFT_PAREN) || this.check(TokenType.LESS_THAN)) {
      return this.parseCallSignature('call', this.peek());
    }
    const afterNew = this.peekNext()?.type;
    if (
      this.check(TokenType.НАВ) &&
      (afterNew === TokenType.LEFT_PAREN || afterNew === TokenType.LESS_THAN)
    ) {
      return this.parseCallSignature('construct', this.advance());
    }

    // Index signatures `[калид: сатр]: Т;`
    if (this.isIndexSignatureStart()) {
      return this.parseComputedPropertySignature(readonly);
    }
    // Computed names `[калид]: Т;`, `[Symbol.iterator](): Т;`
    if (this.check(TokenType.LEFT_BRACKET)) {
      return this.parseComputedNameSignature(readonly);
    }

    // `get ном(): Т;`, `set ном(қ: Т);`
    const accessor = this.parseAccessorKind();
    if (accessor) {
      return this.parseAccessorSignature(accessor, this.parsePropertyKeyName());
    }

    const keyName = this.parsePropertyKeyName();
    const optional = this.match(TokenType.QUESTION);

    // Method signature: `ном(…): Навъ`, `ном?(…)`, `ном<Т>(…)`
    if (this.check(TokenType.LEFT_PAREN) || this.check(TokenType.LESS_THAN)) {
      return this.parseMethodSignature(keyName, readonly, optional);
    }

    return this.finishPropertySignature(keyName, readonly, optional);
  }

  /** The `: Т;` of a property signature `ном: Т;`. */
  private finishPropertySignature(
    keyName: Token,
    readonly: boolean,
    optional: boolean
  ): PropertySignature {
    // Regular property signature: propName: type;
    this.consume(TokenType.COLON, "Expected ':' after property name");
    const typeAnnotation = this.typeAnnotation();
    this.consumeMemberSeparator("Expected ';' after property type");

    return {
      type: 'PropertySignature',
      key: this.createSignatureKey(keyName),
      typeAnnotation,
      optional: optional || false,
      readonly,
      line: keyName.line,
      column: keyName.column,
    };
  }

  /** `мерос Асос<{ а: рақам }>`: the superclass and its type arguments (erased in JavaScript). */
  private parseClassExtendsClause(): HeritageEntry | undefined {
    if (!this.match(TokenType.МЕРОС)) {
      return undefined;
    }

    const token = this.parseImportOrExportName("Expected superclass name after 'мерос'");
    return { token, typeArguments: this.parseNewTypeArguments() };
  }

  private parseClassImplementsClause(): HeritageEntry[] {
    if (!this.match(TokenType.ТАТБИҚ)) {
      return [];
    }

    const entries: HeritageEntry[] = [];
    do {
      const token = this.parseImportOrExportName('Expected interface name in implements clause');
      entries.push({ token, typeArguments: this.parseNewTypeArguments() });
    } while (this.match(TokenType.COMMA));

    return entries;
  }

  /** The heritage fields of a class node, from its `мерос` / `татбиқ` clauses. */
  private heritageFields(
    superClass: HeritageEntry | undefined,
    implementsEntries: HeritageEntry[]
  ): Pick<
    ClassDeclaration,
    'superClass' | 'superTypeArguments' | 'implements' | 'implementsTypeArguments'
  > {
    const fields: Pick<
      ClassDeclaration,
      'superClass' | 'superTypeArguments' | 'implements' | 'implementsTypeArguments'
    > = {
      superClass: superClass ? this.createIdentifier(superClass.token) : undefined,
      implements: implementsEntries.map(entry => this.createIdentifier(entry.token)),
    };
    if (superClass?.typeArguments) fields.superTypeArguments = superClass.typeArguments;
    if (implementsEntries.some(entry => entry.typeArguments)) {
      fields.implementsTypeArguments = implementsEntries.map(entry => entry.typeArguments);
    }
    return fields;
  }

  private consumeClassBody(): ClassBody {
    this.consume(TokenType.LEFT_BRACE, "Expected '{' after class declaration");
    // Class members are never in a generator body, even inside a generator
    const body = this.withGenerator(false, () => this.classBody());

    if (this.check(TokenType.RIGHT_BRACE)) {
      this.advance();
    } else {
      this.errors.push(`Expected '}' after class body at line ${this.peek().line}`);
    }

    return body;
  }

  public classDeclaration(): ClassDeclaration {
    const classToken = this.previous();
    const nameToken = this.parseImportOrExportName('Expected class name');

    const typeParameters = this.parseTypeParametersOrSkip();
    this.checkTypeParameterModifiers(typeParameters, 'class');

    const superClass = this.parseClassExtendsClause();
    const implementsEntries = this.parseClassImplementsClause();
    const body = this.consumeClassBody();

    return {
      type: 'ClassDeclaration',
      name: {
        type: 'Identifier',
        name: nameToken.value,
        line: nameToken.line,
        column: nameToken.column,
      },
      ...(typeParameters && { typeParameters }),
      ...this.heritageFields(superClass, implementsEntries),
      body,
      ...(this.ambient && { declare: true }),
      line: classToken.line,
      column: classToken.column,
    };
  }

  private startsClassExpression(): boolean {
    return this.check(TokenType.СИНФ) || this.check(TokenType.AT);
  }

  /** `синф { … }` or, decorated, `@д синф { … }` in expression position. */
  private classExpression(): ClassExpression {
    const decorators = this.parseDecorators();
    const classToken = this.consume(TokenType.СИНФ, "Expected 'синф' after decorators");
    const classExpression = this.parseClassExpression(classToken);
    if (decorators.length > 0) classExpression.decorators = decorators;
    return classExpression;
  }

  /**
   * `синф [Ном] [мерос Асос] [татбиқ И] { … }` in expression position; the
   * name is optional (`мерос`/`татбиқ` right after `синф` start the heritage).
   */
  private parseClassExpression(classToken: Token): ClassExpression {
    const nameToken =
      this.check(TokenType.LEFT_BRACE) ||
      this.check(TokenType.МЕРОС) ||
      this.check(TokenType.ТАТБИҚ) ||
      this.check(TokenType.LESS_THAN)
        ? undefined
        : this.parseImportOrExportName("Expected class name or '{'");

    const typeParameters = this.parseTypeParametersOrSkip();
    this.checkTypeParameterModifiers(typeParameters, 'class');

    const superClass = this.parseClassExtendsClause();
    const implementsEntries = this.parseClassImplementsClause();
    const body = this.consumeClassBody();

    const classExpression: ClassExpression = {
      type: 'ClassExpression',
      ...(typeParameters && { typeParameters }),
      ...this.heritageFields(superClass, implementsEntries),
      body,
      line: classToken.line,
      column: classToken.column,
    };
    if (nameToken) classExpression.name = this.createIdentifier(nameToken);
    return classExpression;
  }

  private classBody(): ClassBody {
    const members: (MethodDefinition | PropertyDefinition | StaticBlock)[] = [];

    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      const memberStart = this.current;
      try {
        // `статикӣ { … }`; a member named `статикӣ` is followed by '(', ':', '=', …
        const member = this.checkSequence(TokenType.СТАТИКӢ, TokenType.LEFT_BRACE)
          ? this.staticBlock()
          : this.classMember();
        if (member) {
          members.push(member);
        }
      } catch (error) {
        if (this.isNestingError(error)) throw error;
        this.errors.push(error instanceof Error ? error.message : String(error));
        if (this.recoverFromClassMemberError(memberStart)) {
          break;
        }
      }
    }
    if (!this.ambient) this.checkMethodOverloads(members);

    return {
      type: 'ClassBody',
      body: members,
      line: this.peek().line,
      column: this.peek().column,
    };
  }

  private recoverFromClassMemberError(memberStart: number): boolean {
    // Never stop where the failed member started, or the loop would not advance
    if (this.current === memberStart && !this.isAtEnd()) {
      this.advance();
    }
    // Skip the rest of the failed member: up to its ';' or its '{ … }' body
    while (this.shouldContinueErrorRecovery()) {
      if (this.match(TokenType.LEFT_BRACE)) {
        this.skipBalancedBraces();
        break;
      }
      if (this.match(TokenType.SEMICOLON)) break;
      this.advance();
    }
    return this.isAtClassOrNamespaceKeyword();
  }

  /** Skips tokens up to and including the '}' matching an already consumed '{'. */
  private skipBalancedBraces(): void {
    let depth = 1;
    while (depth > 0 && !this.isAtEnd()) {
      if (this.check(TokenType.LEFT_BRACE)) depth++;
      else if (this.check(TokenType.RIGHT_BRACE)) depth--;
      this.advance();
    }
  }

  private shouldContinueErrorRecovery(): boolean {
    return (
      !this.check(TokenType.RIGHT_BRACE) &&
      !this.check(TokenType.ҶАМЪИЯТӢ) &&
      !this.check(TokenType.ХОСУСӢ) &&
      !this.check(TokenType.МУҲОФИЗАТШУДА) &&
      !this.check(TokenType.КОНСТРУКТОР) &&
      !this.check(TokenType.СИНФ) &&
      !this.check(TokenType.МАВҲУМ) &&
      !this.check(TokenType.НОМФАЗО) &&
      !this.isAtEnd()
    );
  }

  private isAtClassOrNamespaceKeyword(): boolean {
    return (
      this.check(TokenType.СИНФ) || this.check(TokenType.МАВҲУМ) || this.check(TokenType.НОМФАЗО)
    );
  }

  private parseAccessibility(): AccessibilityModifier {
    const isAccessibility =
      this.check(TokenType.ҶАМЪИЯТӢ) ||
      this.check(TokenType.ХОСУСӢ) ||
      this.check(TokenType.МУҲОФИЗАТШУДА);
    if (!isAccessibility || !this.modifierApplies()) return undefined;

    const accessToken = this.advance();
    if (accessToken.type === TokenType.ҶАМЪИЯТӢ) return 'public';
    if (accessToken.type === TokenType.ХОСУСӢ) return 'private';
    return 'protected';
  }

  private parseModifiers(): { isStatic: boolean; isAbstract: boolean } {
    const isStatic = this.check(TokenType.СТАТИКӢ) && this.modifierApplies() && !!this.advance();
    const isAbstract = this.check(TokenType.МАВҲУМ) && this.modifierApplies() && !!this.advance();
    return { isStatic, isAbstract };
  }

  /**
   * Whether the modifier word at `offset` (`статикӣ`, `хосусӣ`, `ҳамзамон`,
   * `бознавис`, …) is a modifier, by TypeScript's rule: the rest of a member
   * follows it — a name, string, number, `#ном`, `[`, `{`, `*` or `...` — on
   * its line (after `статикӣ` also on the next one). Otherwise the word is the
   * member's name: `статикӣ() {}`, `хосусӣ = 1`, `ҳамзамон: рақам`.
   */
  private modifierApplies(offset = 0): boolean {
    const token = this.tokens[this.current + offset];
    const next = this.tokens[this.current + offset + 1];
    if (!token || !next) return false;
    if (next.line !== token.line && token.type !== TokenType.СТАТИКӢ) return false;
    return Parser.MODIFIER_FOLLOWERS.has(next.type) || this.isIdentifierNameToken(next);
  }

  /** Tokens after which a modifier word is a modifier, besides names (see `modifierApplies`). */
  private static readonly MODIFIER_FOLLOWERS: ReadonlySet<TokenType> = new Set([
    TokenType.LEFT_BRACKET,
    TokenType.LEFT_BRACE,
    TokenType.MULTIPLY,
    TokenType.SPREAD,
    TokenType.STRING,
    TokenType.NUMBER,
    TokenType.PRIVATE_NAME,
  ]);

  /**
   * A class member's name: any word, keywords included (`агар() {}`,
   * `бозгашт = 1`, `нав()`), or `#ном`. A `функсия` before a name is skipped.
   */
  private parseMemberName(): Token {
    const next = this.peekNext();
    if (this.check(TokenType.ФУНКСИЯ) && next && this.isIdentifierNameToken(next)) {
      this.advance();
    }

    if (this.check(TokenType.PRIVATE_NAME) || this.isIdentifierNameToken(this.peek())) {
      return this.advance();
    }

    throw new Error(
      `Expected class member at line ${this.peek().line}, column ${this.peek().column}`
    );
  }

  /**
   * A class member's name: `ном`, `#ном`, a string or number literal
   * (`"ном"`, `1`) or a computed name `[ифода]` (`[Symbol.iterator]`).
   * `token` is where the name starts, for messages.
   */
  private parseClassMemberKey(): {
    key: Identifier | PrivateIdentifier | Expression;
    token: Token;
    computed: boolean;
  } {
    if (this.check(TokenType.LEFT_BRACKET)) {
      const open = this.advance();
      const key = this.assignment();
      this.consume(TokenType.RIGHT_BRACKET, "Expected ']' after computed member name");
      return { key, token: open, computed: true };
    }
    if (this.check(TokenType.STRING) || this.check(TokenType.NUMBER)) {
      this.checkBigIntName(this.peek());
      const token = this.advance();
      const key =
        token.type === TokenType.STRING
          ? this.createLiteral(token.value, token)
          : this.createNumericLiteral(token);
      return { key, token, computed: false };
    }
    const token = this.parseMemberName();
    return { key: this.createMemberKey(token), token, computed: false };
  }

  /**
   * `get`/`set` before a member name (`ном`, `#ном`, `"ном"`, `[калид]`) and
   * its '(' make an accessor; anywhere else they are ordinary names.
   */
  private parseAccessorKind(): 'get' | 'set' | undefined {
    const token = this.peek();
    const name = this.peekNext();
    if (token.type !== TokenType.IDENTIFIER || !['get', 'set'].includes(token.value) || !name) {
      return undefined;
    }
    let nameEnd = -1;
    if (name.type === TokenType.LEFT_BRACKET) {
      nameEnd = this.findMatchingBracket(this.current + 1);
    } else if (Parser.ACCESSOR_NAME_TOKENS.has(name.type) || this.isIdentifierNameToken(name)) {
      nameEnd = this.current + 1;
    }
    if (nameEnd === -1 || this.tokens[nameEnd + 1]?.type !== TokenType.LEFT_PAREN) return undefined;
    this.advance();
    return token.value as 'get' | 'set';
  }

  private static readonly ACCESSOR_NAME_TOKENS: ReadonlySet<TokenType> = new Set([
    TokenType.PRIVATE_NAME,
    TokenType.STRING,
    TokenType.NUMBER,
  ]);

  /** Early errors of private names: no accessibility modifier, never `#constructor`. */
  private checkPrivateMemberName(nameToken: Token, accessibility: AccessibilityModifier): void {
    if (nameToken.type !== TokenType.PRIVATE_NAME) return;
    const at = `at line ${nameToken.line}, column ${nameToken.column}`;
    if (nameToken.value === '#constructor') {
      this.errors.push(`Classes may not have a private field named '#constructor' ${at}`);
    }
    if (accessibility) {
      this.errors.push(
        `An accessibility modifier cannot be used with a private identifier '${nameToken.value}' ${at}`
      );
    }
  }

  /** Kind and type parameters of a parsed method. */
  private finishClassMethod(
    method: MethodDefinition,
    accessor: 'get' | 'set' | undefined,
    typeParameters: TypeParameter[] | undefined
  ): MethodDefinition {
    if (typeParameters) method.value.typeParameters = typeParameters;
    if (accessor) {
      method.kind = accessor;
      this.checkAccessorParams(accessor, method.value, method);
    }
    return method;
  }

  /**
   * A getter takes no parameter and a setter exactly one, as JavaScript
   * requires; a setter has no return type, as TypeScript requires.
   */
  private checkAccessorParams(
    accessor: 'get' | 'set',
    method: FunctionExpression,
    at: { line: number; column: number }
  ): void {
    const params = method.params;
    const position = `at line ${at.line}, column ${at.column}`;
    if (method.thisType) {
      this.errors.push(`'get' and 'set' accessors cannot declare 'ин' parameters ${position}`);
    }
    if (accessor === 'get' && params.length > 0) {
      this.errors.push(`Getter must not have any formal parameters ${position}`);
    } else if (accessor === 'set' && (params.length !== 1 || params[0].rest)) {
      this.errors.push(`Setter must have exactly one formal parameter ${position}`);
    } else if (accessor === 'set' && method.returnType) {
      this.errors.push(`A 'set' accessor cannot have a return type annotation ${position}`);
    }
  }

  /** `танҳохонӣ ном: Т` — unless `танҳохонӣ` is itself the member name. */
  private parseReadonlyModifier(): boolean {
    if (!this.check(TokenType.ТАНҲОХОНӢ) || !this.modifierApplies()) return false;
    this.advance();
    return true;
  }

  /** `бознавис` / `override` (override), also on parameter properties. */
  private static readonly OVERRIDE_KEYWORDS: ReadonlySet<string> = new Set([
    'бознавис',
    'override',
  ]);

  /** `дастрасӣ` / `accessor`: an auto-accessor field. */
  private static readonly ACCESSOR_KEYWORDS: ReadonlySet<string> = new Set([
    'дастрасӣ',
    'accessor',
  ]);

  /** `эълон` / `declare`: an ambient declaration or a declared class field. */
  private static readonly DECLARE_KEYWORDS: ReadonlySet<string> = new Set(['эълон', 'declare']);

  /**
   * Contextual member modifiers after the accessibility and `статикӣ`:
   * `бознавис` (override), `эълон` (declare), `дастрасӣ` (accessor) and a
   * later `мавҳум`, in any order. Each is a modifier only when the rest of a
   * member follows on its line; `бознавис() {}` is a method named `бознавис`.
   */
  private parseMemberModifiers(): MemberHead['modifiers'] {
    const modifiers: MemberHead['modifiers'] = {};
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const token = this.peek();
      const modifier = this.memberModifier(token);
      if (!modifier || !this.modifierApplies()) return modifiers;
      const at = `at line ${token.line}, column ${token.column}`;
      if (modifiers[modifier]) {
        this.errors.push(`'${token.value}' modifier already seen ${at}`);
      } else if (modifier === 'static') {
        // `бознавис статикӣ м()`: as in TypeScript, `статикӣ` comes first
        this.errors.push(`'${token.value}' modifier must precede the modifiers before it ${at}`);
      }
      modifiers[modifier] = true;
      this.advance();
    }
  }

  private memberModifier(
    token: Token
  ): 'override' | 'declare' | 'accessor' | 'abstract' | 'static' | undefined {
    if (token.type === TokenType.МАВҲУМ) return 'abstract';
    if (token.type === TokenType.СТАТИКӢ) return 'static';
    if (token.type !== TokenType.IDENTIFIER) return undefined;
    if (Parser.OVERRIDE_KEYWORDS.has(token.value)) return 'override';
    if (Parser.DECLARE_KEYWORDS.has(token.value)) return 'declare';
    if (Parser.ACCESSOR_KEYWORDS.has(token.value)) return 'accessor';
    return undefined;
  }

  /** `[калид: сатр]: Т` (an index signature) starts here. */
  private isIndexSignatureStart(): boolean {
    const name = this.tokens[this.current + 1];
    return (
      this.check(TokenType.LEFT_BRACKET) &&
      name !== undefined &&
      this.isPlainIdentifierToken(name) &&
      this.tokens[this.current + 2]?.type === TokenType.COLON
    );
  }

  /** Decorators and modifiers before a class member. */
  private parseMemberHead(): MemberHead {
    const decorators = this.parseDecorators();
    const accessibility = this.parseAccessibility();
    const { isStatic, isAbstract } = this.parseModifiers();
    const modifiers = this.parseMemberModifiers();
    return {
      decorators,
      accessibility,
      isStatic: isStatic || Boolean(modifiers.static),
      isAbstract: isAbstract || Boolean(modifiers.abstract),
      modifiers,
    };
  }

  private classMember(): MethodDefinition | PropertyDefinition | undefined {
    const head = this.parseMemberHead();

    // Constructor
    if (this.match(TokenType.КОНСТРУКТОР)) {
      this.rejectDecorators(head.decorators);
      return this.constructorMethod(head.accessibility, head.isStatic);
    }

    const isAsync = this.matchAsyncModifier();
    // `*ном() {…}`: a generator method
    const isGenerator = this.match(TokenType.MULTIPLY);

    const isReadonly = !isAsync && this.parseReadonlyModifier();
    // `[калид: сатр]: рақам;`
    if (!isAsync && !isGenerator && this.isIndexSignatureStart()) {
      this.rejectDecorators(head.decorators);
      return this.classIndexSignature(head.isStatic, isReadonly);
    }
    // `get ном() {…}`, `set ном(қимат) {…}`
    const accessor = isAsync ? undefined : this.parseAccessorKind();
    const name = this.parseClassMemberKey();
    this.checkPrivateMemberName(name.token, head.accessibility);
    const optional = this.matchOptionalMethodMarker();
    // A generic method: `метод<Т>(х: Т)`
    const typeParameters = this.parseTypeParametersOrSkip();
    this.checkTypeParameterModifiers(typeParameters, 'function');

    if (accessor || this.check(TokenType.LEFT_PAREN)) {
      return this.methodMember(head, name, {
        isAsync,
        isGenerator,
        isReadonly,
        accessor,
        optional,
        typeParameters,
      });
    }

    if (isAsync || isGenerator) {
      throw new Error(
        `Expected method after '${isGenerator ? '*' : 'ҳамзамон'}' at line ${name.token.line}, column ${name.token.column}`
      );
    }
    return this.propertyMember(head, name, isReadonly);
  }

  /** `ҳамзамон ном() {…}` — unless `ҳамзамон` is itself the member name. */
  private matchAsyncModifier(): boolean {
    if (!this.isAsyncWord() || !this.modifierApplies()) return false;
    this.advance();
    return true;
  }

  /** `м?() {…}`, `м?(): Т;`: the `?` of an optional method. */
  private matchOptionalMethodMarker(): boolean {
    const next = this.peekNext()?.type;
    return (
      this.check(TokenType.QUESTION) &&
      (next === TokenType.LEFT_PAREN || next === TokenType.LESS_THAN) &&
      this.match(TokenType.QUESTION)
    );
  }

  /** A method, accessor or method signature, after its name. */
  private methodMember(
    head: MemberHead,
    name: MemberName,
    flags: {
      isAsync: boolean;
      isGenerator: boolean;
      isReadonly: boolean;
      accessor: 'get' | 'set' | undefined;
      optional: boolean;
      typeParameters: TypeParameter[] | undefined;
    }
  ): MethodDefinition {
    const at = `at line ${name.token.line}, column ${name.token.column}`;
    if (flags.isReadonly) {
      this.errors.push(`'танҳохонӣ' can only be used on a property ${at}`);
    }
    if (head.modifiers.accessor || head.modifiers.declare) {
      const word = head.modifiers.accessor ? 'дастрасӣ' : 'эълон';
      this.errors.push(`'${word}' modifier can only appear on a property declaration ${at}`);
    }
    // `classMethod` parses a generator body for `*ном() {…}`
    const method = this.withGenerator(flags.isGenerator, () =>
      this.classMethod(name, head, flags.isAsync)
    );
    if (flags.optional) method.optional = true;
    if (head.modifiers.override) method.override = true;
    this.finishClassMethod(method, flags.accessor, flags.typeParameters);
    this.attachMemberDecorators(method, head.decorators);
    return method;
  }

  /** A field, after its name: `ном: Т = …;` with its modifiers. */
  private propertyMember(
    head: MemberHead,
    name: MemberName,
    isReadonly: boolean
  ): PropertyDefinition {
    const property = this.classProperty(name, head.accessibility, head.isStatic);
    const flags = {
      readonly: isReadonly,
      override: head.modifiers.override,
      declare: head.modifiers.declare,
      accessor: head.modifiers.accessor,
      abstract: head.isAbstract,
    };
    for (const [flag, value] of Object.entries(flags)) {
      if (value) (property as unknown as Record<string, boolean>)[flag] = true;
    }
    this.checkPropertyModifiers(property, name.token);
    this.attachMemberDecorators(property, head.decorators);
    return property;
  }

  /** Decorators before a member that may not have them (a constructor, an index signature). */
  private rejectDecorators(decorators: Decorator[]): void {
    if (decorators.length > 0) this.reportInvalidDecorators(decorators);
  }

  /** TypeScript's rules for `эълон`, `мавҳум` and `дастрасӣ` fields. */
  private checkPropertyModifiers(property: PropertyDefinition, at: Token): void {
    const position = `at line ${at.line}, column ${at.column}`;
    if ((property.declare || property.abstract || this.ambient) && property.value) {
      const reason = property.abstract
        ? `Property '${at.value}' cannot have an initializer because it is marked abstract`
        : 'Initializers are not allowed in ambient contexts';
      this.errors.push(`${reason} ${position}`);
    }
    if (property.accessor && property.readonly) {
      this.errors.push(`'дастрасӣ' modifier cannot be used with 'танҳохонӣ' modifier ${position}`);
    }
    if (property.accessor && property.declare) {
      this.errors.push(`'дастрасӣ' modifier cannot be used with 'эълон' modifier ${position}`);
    }
  }

  /**
   * Decorators of a class member: methods with bodies, accessors and fields
   * (TypeScript rejects them elsewhere).
   */
  private attachMemberDecorators(
    member: MethodDefinition | PropertyDefinition,
    decorators: Decorator[]
  ): void {
    if (decorators.length === 0) return;
    if (member.type === 'MethodDefinition' && member.signature) {
      const at = decorators[0];
      this.errors.push(
        `A decorator can only decorate a method implementation, not an overload at line ${at.line}, column ${at.column}`
      );
      return;
    }
    const ambientField = member.type === 'PropertyDefinition' && member.declare;
    if (member.abstract || ambientField || this.ambient) {
      this.reportInvalidDecorators(decorators);
      return;
    }
    member.decorators = decorators;
  }

  /** TypeScript's "Decorators are not valid here" (TS1206). */
  private reportInvalidDecorators(decorators: Decorator[]): void {
    const at = decorators[0];
    this.errors.push(`Decorators are not valid here at line ${at.line}, column ${at.column}`);
  }

  /** Class static initialization block: `статикӣ { … }`. */
  private staticBlock(): StaticBlock {
    const staticToken = this.advance();
    this.advance(); // consume '{'
    const block = this.blockStatement();
    return {
      type: 'StaticBlock',
      body: block.body,
      line: staticToken.line,
      column: staticToken.column,
    };
  }

  private constructorMethod(accessibility?: string, isStatic?: boolean): MethodDefinition {
    const constructorToken = this.previous();
    const access: AccessibilityModifier =
      accessibility === 'public' || accessibility === 'private' || accessibility === 'protected'
        ? accessibility
        : undefined;

    this.consume(TokenType.LEFT_PAREN, "Expected '(' after constructor");
    const params = this.parseParameterList("Expected ')' after constructor parameters", true);

    // `конструктор(х: рақам);`: an overload signature, or a declared constructor
    let signature = false;
    let body: BlockStatement;
    if (!this.check(TokenType.LEFT_BRACE) && this.isSignatureEnd()) {
      this.consumeSemicolon("Expected '{' after constructor parameters");
      signature = true;
      body = {
        type: 'BlockStatement',
        body: [],
        line: constructorToken.line,
        column: constructorToken.column,
      };
      const property = params.find(
        param => param.accessibility || param.readonly || param.override
      );
      if (property) {
        this.errors.push(
          `A parameter property is only allowed in a constructor implementation at line ${property.line}, column ${property.column}`
        );
      }
    } else {
      this.consume(TokenType.LEFT_BRACE, "Expected '{' after constructor parameters");
      if (this.ambient) this.reportImplementationInAmbientContext(constructorToken);
      body = this.blockStatement();
    }

    return {
      type: 'MethodDefinition',
      key: {
        type: 'Identifier',
        name: 'constructor',
        line: constructorToken.line,
        column: constructorToken.column,
      },
      value: {
        type: 'FunctionExpression',
        params: params,
        body: body,
        line: constructorToken.line,
        column: constructorToken.column,
      },
      kind: 'constructor',
      static: isStatic || false,
      accessibility: access,
      ...(signature && { signature }),
      line: constructorToken.line,
      column: constructorToken.column,
    };
  }

  private classMethod(name: MemberName, head: MemberHead, isAsync: boolean): MethodDefinition {
    // A generator method (`*ном() {…}`) is parsed in a generator context
    const isGenerator = this.inGenerator;
    const nameToken = name.token;

    this.consume(TokenType.LEFT_PAREN, "Expected '(' after method name");
    const { params, thisType } = this.withGenerator(false, () =>
      this.parseParametersWithThis("Expected ')' after method parameters", true)
    );

    let returnType: TypeAnnotation | undefined;
    if (this.match(TokenType.COLON)) {
      returnType = this.returnTypeAnnotation();
    }

    const { body, signature } = this.parseMethodBody(nameToken, head.isAbstract);

    return {
      type: 'MethodDefinition',
      key: name.key,
      value: {
        type: 'FunctionExpression',
        params: params,
        body: body,
        returnType,
        async: isAsync || undefined,
        ...(isGenerator && { generator: true }),
        ...(thisType && { thisType }),
        line: nameToken.line,
        column: nameToken.column,
      },
      kind: 'method',
      static: head.isStatic,
      abstract: head.isAbstract,
      accessibility: head.accessibility,
      ...(name.computed && { computed: true }),
      ...(signature && { signature }),
      line: nameToken.line,
      column: nameToken.column,
    };
  }

  /**
   * A method's body; none for an abstract method, an overload signature
   * (`м(х: рақам): рақам;`) or a member of an `эълон синф` (`signature`).
   */
  private parseMethodBody(
    nameToken: Token,
    isAbstract: boolean
  ): { body: BlockStatement; signature: boolean } {
    const emptyBody: BlockStatement = {
      type: 'BlockStatement',
      body: [],
      line: nameToken.line,
      column: nameToken.column,
    };
    if (isAbstract) {
      // Abstract methods end with semicolon, no body
      this.consumeSemicolon("Expected ';' after abstract method signature");
      return { body: emptyBody, signature: false };
    }
    if (!this.check(TokenType.LEFT_BRACE) && this.isSignatureEnd()) {
      this.consumeSemicolon("Expected '{' after method signature");
      return { body: emptyBody, signature: true };
    }
    // Regular methods have a body
    this.consume(TokenType.LEFT_BRACE, "Expected '{' after method signature");
    if (this.ambient) this.reportImplementationInAmbientContext(nameToken);
    return { body: this.blockStatement(), signature: false };
  }

  private classProperty(
    name: MemberName,
    accessibility: AccessibilityModifier,
    isStatic: boolean
  ): PropertyDefinition {
    // Optional property marker (`ном?: сатр`): the property may be `беқимат`
    const optional = this.match(TokenType.QUESTION);
    // Definite assignment assertion: `ном!: сатр`
    const definite = !optional && this.checkNonNullAssertion() ? this.advance() : undefined;

    // Optional type annotation
    let typeAnnotation: TypeAnnotation | undefined;
    if (this.match(TokenType.COLON)) {
      typeAnnotation = this.typeAnnotation();
    }

    // Optional initializer
    let value = undefined;
    if (this.match(TokenType.ASSIGN)) {
      value = this.assignment();
    }

    if (definite) {
      this.checkDefiniteAssignment(
        definite,
        value !== undefined,
        typeAnnotation !== undefined,
        !isStatic
      );
    }

    // As in JavaScript, a field ends with ';', '}' or a line break: `а = 1 б = 2` is an error
    this.consumeSemicolon("Expected ';' after a class field");

    return {
      type: 'PropertyDefinition',
      key: name.key,
      value: value,
      typeAnnotation: typeAnnotation,
      ...(optional && { optional }),
      ...(definite && { definite: true }),
      static: isStatic,
      accessibility,
      ...(name.computed && { computed: true }),
      line: name.token.line,
      column: name.token.column,
    };
  }

  /**
   * `[калид: сатр]: рақам;` (also `статикӣ`, `танҳохонӣ`): types only, kept as
   * a property definition with an `indexSignature` and erased in the output.
   */
  private classIndexSignature(isStatic: boolean, isReadonly: boolean): PropertyDefinition {
    const open = this.advance(); // '['
    const name = this.createIdentifier(this.advance());
    this.consume(TokenType.COLON, "Expected ':' in index signature");
    const keyType = this.typeAnnotation();
    this.consume(TokenType.RIGHT_BRACKET, "Expected ']' after index signature parameter");
    this.consume(TokenType.COLON, 'An index signature must have a type annotation');
    const typeAnnotation = this.typeAnnotation();
    this.consumeSemicolon("Expected ';' after index signature");
    return {
      type: 'PropertyDefinition',
      key: { type: 'Identifier', name: '__computed__', line: open.line, column: open.column },
      typeAnnotation,
      static: isStatic,
      ...(isReadonly && { readonly: true }),
      indexSignature: {
        type: 'Parameter',
        name,
        typeAnnotation: keyType,
        line: name.line,
        column: name.column,
      },
      line: open.line,
      column: open.column,
    };
  }

  /** Name of a member for matching overloads: undefined for a computed name. */
  private memberKeyText(member: MethodDefinition): string | undefined {
    if (member.computed) return undefined;
    const key = member.key as Identifier | PrivateIdentifier | Literal;
    if (key.type === 'PrivateIdentifier') return `#${key.name}`;
    return key.type === 'Literal' ? String((key as Literal).value) : (key as Identifier).name;
  }

  /**
   * Each overload signature of a method or constructor (`м(х: рақам): рақам;`)
   * must be followed by another one or the implementation, as in TypeScript.
   */
  private checkMethodOverloads(
    members: Array<MethodDefinition | PropertyDefinition | StaticBlock>
  ): void {
    members.forEach((member, index) => {
      if (member.type !== 'MethodDefinition' || !member.signature || member.optional) return;
      const next = members[index + 1];
      const name = this.memberKeyText(member);
      const continues =
        next?.type === 'MethodDefinition' &&
        next.static === member.static &&
        name !== undefined &&
        this.memberKeyText(next) === name;
      if (continues) return;
      const message =
        member.kind === 'constructor'
          ? 'Constructor implementation is missing'
          : 'Function implementation is missing or not immediately following the declaration';
      this.errors.push(`${message} at line ${member.line}, column ${member.column}`);
    });
  }

  public typeAlias(): TypeAlias {
    const typeToken = this.previous();

    const name = this.parseImportOrExportName('Expected type alias name');
    const typeParameters = this.parseTypeParameters();
    this.checkTypeParameterModifiers(typeParameters, 'alias');

    this.consume(TokenType.ASSIGN, "Expected '=' after type alias name");

    const typeAnnotation = this.typeAnnotation();

    this.consumeSemicolon("Expected ';' after type alias");

    return {
      type: 'TypeAlias',
      name: {
        type: 'Identifier',
        name: name.value,
        line: name.line,
        column: name.column,
      },
      typeParameters,
      typeAnnotation,
      line: typeToken.line,
      column: typeToken.column,
    };
  }

  public namespaceDeclaration(): NamespaceDeclaration {
    const namespaceToken = this.previous();
    const name = this.consume(TokenType.IDENTIFIER, 'Expected namespace name');
    this.consume(TokenType.LEFT_BRACE, "Expected '{' after namespace name");

    const statements: Statement[] = [];

    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      if (this.check(TokenType.RIGHT_BRACE)) {
        break;
      }

      const isExported = this.match(TokenType.СОДИР);
      const stmt = this.parseNamespaceMember(isExported);

      if (stmt) {
        statements.push(stmt);
      }
    }

    this.consume(TokenType.RIGHT_BRACE, "Expected '}' after namespace body");
    if (!this.ambient) this.checkOverloads(statements);

    return {
      type: 'NamespaceDeclaration',
      name: {
        type: 'Identifier',
        name: name.value,
        line: name.line,
        column: name.column,
      },
      body: {
        type: 'NamespaceBody',
        statements,
        line: namespaceToken.line,
        column: namespaceToken.column,
      },
      ...(this.ambient && { declare: true }),
      line: namespaceToken.line,
      column: namespaceToken.column,
    };
  }

  private parseNamespaceMember(isExported: boolean): Statement | null {
    // `содир эълон функсия ф(): Т;`
    if (this.isAmbientStart()) return this.markExported(this.ambientDeclaration(), isExported);
    if (this.match(TokenType.НОМФАЗО)) {
      const nestedNamespace = this.namespaceDeclaration();
      if (isExported) {
        nestedNamespace.exported = true;
      }
      return nestedNamespace;
    }

    if (this.isEnumStart(0) || (this.check(TokenType.СОБИТ) && this.isEnumStart(1))) {
      const enumDecl = this.contextualStatement()!;
      if (isExported) (enumDecl as Statement & { exported?: boolean }).exported = true;
      return enumDecl;
    }

    const declarationParsers: [TokenType | TokenType[], () => Statement | null][] = [
      [TokenType.ИНТЕРФЕЙС, () => this.interfaceDeclaration()],
      [TokenType.НАВЪ, () => this.typeAlias()],
      [TokenType.СИНФ, () => this.classDeclaration()],
      [TokenType.ФУНКСИЯ, () => this.functionDeclaration()],
      [[TokenType.ТАҒЙИРЁБАНДА, TokenType.СОБИТ], () => this.variableDeclaration()],
    ];

    for (const [tokenType, parser] of declarationParsers) {
      if (Array.isArray(tokenType) ? this.match(...tokenType) : this.match(tokenType)) {
        const stmt = parser();
        if (isExported && stmt) {
          (stmt as Statement & { exported?: boolean }).exported = true;
        }
        return stmt;
      }
    }

    if (isExported) {
      const token = this.peek();
      throw new Error(
        `Expected a declaration after 'содир' at line ${token.line}, column ${token.column}`
      );
    }
    // Any other statement runs inside the namespace's function body
    return this.statement();
  }

  private markExported(statement: Statement | null, isExported: boolean): Statement | null {
    if (isExported && statement) (statement as Statement & { exported?: boolean }).exported = true;
    return statement;
  }

  private parseSwitchCaseConsequent(): Statement[] {
    const consequent: Statement[] = [];
    while (
      !this.check(TokenType.ҲОЛАТ) &&
      !this.check(TokenType.ПЕШФАРЗ) &&
      !this.check(TokenType.RIGHT_BRACE) &&
      !this.isAtEnd()
    ) {
      const stmt = this.statement();
      if (stmt) consequent.push(stmt);
    }
    return consequent;
  }

  private parseRegularCase(): SwitchCase {
    const test = this.expression();
    this.consume(TokenType.COLON, "Expected ':' after case value");
    const consequent = this.parseSwitchCaseConsequent();
    return {
      type: 'SwitchCase',
      test,
      consequent,
      line: test.line,
      column: test.column,
    };
  }

  private parseDefaultCase(): SwitchCase {
    this.consume(TokenType.COLON, "Expected ':' after default keyword");
    const startToken = this.previous();
    const consequent = this.parseSwitchCaseConsequent();
    return {
      type: 'SwitchCase',
      test: undefined,
      consequent,
      line: startToken.line,
      column: startToken.column,
    } as SwitchCase;
  }

  private parseSwitchCases(): SwitchCase[] {
    const cases: SwitchCase[] = [];
    let foundDefault = false;

    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      if (this.match(TokenType.ҲОЛАТ)) {
        cases.push(this.parseRegularCase());
        continue;
      }

      if (this.match(TokenType.ПЕШФАРЗ)) {
        if (foundDefault) {
          this.errors.push('Multiple default cases in switch');
        }
        foundDefault = true;
        cases.push(this.parseDefaultCase());
        continue;
      }

      this.errors.push(
        `Unexpected token '${this.peek().value}' in switch at line ${this.peek().line}`
      );
      this.advance();
    }

    return cases;
  }

  private switchStatement(): SwitchStatement {
    const switchToken = this.previous();
    this.consume(TokenType.LEFT_PAREN, "Expected '(' after 'интихоб'");
    const discriminant = this.expression();
    this.consume(TokenType.RIGHT_PAREN, "Expected ')' after switch expression");
    this.consume(TokenType.LEFT_BRACE, "Expected '{' after switch expression");

    const cases = this.parseSwitchCases();

    this.consume(TokenType.RIGHT_BRACE, "Expected '}' after switch cases");

    return {
      type: 'SwitchStatement',
      discriminant,
      cases,
      line: switchToken.line,
      column: switchToken.column,
    } as SwitchStatement;
  }

  private static readonly STATEMENT_KEYWORDS: ReadonlySet<TokenType> = new Set([
    TokenType.ТАҒЙИРЁБАНДА,
    TokenType.СОБИТ,
    TokenType.ФУНКСИЯ,
    TokenType.АГАР,
    TokenType.ТО, // while keyword
    TokenType.БАРОИ,
    TokenType.БОЗГАШТ,
    TokenType.СИНФ,
    TokenType.МАВҲУМ,
    TokenType.ИНТЕРФЕЙС,
    TokenType.НОМФАЗО,
    TokenType.КӮШИШ,
    TokenType.ИНТИХОБ,
    TokenType.ПАРТОФТАН,
    TokenType.ШИКАСТАН,
    TokenType.ДАВОМ,
    TokenType.ВОРИД,
    TokenType.СОДИР,
    TokenType.ҲАМЗАМОН,
  ]);

  /**
   * Error recovery: skip to the end of the failed statement so one bad token
   * yields one error. Braces opened by the statement are skipped as a unit,
   * and a '}' that closes an enclosing block is left for that block.
   */
  private synchronize(startIndex: number): void {
    let depth = this.braceDepthSince(startIndex);
    if (this.current === startIndex && !this.isAtEnd()) {
      // Guarantee progress: the statement could not even start
      if (this.check(TokenType.LEFT_BRACE)) depth++;
      this.advance();
    }

    while (!this.isAtEnd()) {
      if (depth === 0 && this.isAtStatementBoundary()) return;
      if (this.check(TokenType.LEFT_BRACE)) {
        depth++;
      } else if (this.check(TokenType.RIGHT_BRACE)) {
        depth--;
        this.advance();
        if (depth === 0) {
          // The braces may have belonged to an expression: `тағ о = { … };`
          this.match(TokenType.SEMICOLON);
          return;
        }
        continue;
      }
      this.advance();
    }
  }

  /** Number of braces opened (and not yet closed) since `startIndex`. */
  private braceDepthSince(startIndex: number): number {
    let depth = 0;
    for (let i = startIndex; i < this.current; i++) {
      if (this.tokens[i].type === TokenType.LEFT_BRACE) depth++;
      else if (this.tokens[i].type === TokenType.RIGHT_BRACE && depth > 0) depth--;
    }
    return depth;
  }

  private isAtStatementBoundary(): boolean {
    return (
      this.previous().type === TokenType.SEMICOLON ||
      this.check(TokenType.RIGHT_BRACE) ||
      Parser.STATEMENT_KEYWORDS.has(this.peek().type)
    );
  }

  private parsePattern(): Identifier | ArrayPattern | ObjectPattern {
    if (this.match(TokenType.LEFT_BRACKET)) {
      return this.parseArrayPattern();
    }
    if (this.match(TokenType.LEFT_BRACE)) {
      return this.parseObjectPattern();
    }
    return this.parseIdentifierPattern();
  }

  private parseArrayPattern(): ArrayPattern {
    const leftBracket = this.previous();
    const elements: ArrayPattern['elements'] = [];
    while (!this.check(TokenType.RIGHT_BRACKET) && !this.isAtEnd()) {
      if (this.match(TokenType.COMMA)) {
        elements.push(null);
        continue;
      }
      if (this.match(TokenType.SPREAD)) {
        const spreadElem = this.parseSpreadElement();
        elements.push(spreadElem);
      } else {
        elements.push(this.parsePatternWithDefault());
      }
      if (!this.match(TokenType.COMMA)) break;
    }
    this.consume(TokenType.RIGHT_BRACKET, "Expected ']' in array pattern");
    return {
      type: 'ArrayPattern',
      elements,
      line: leftBracket.line,
      column: leftBracket.column,
    } as ArrayPattern;
  }

  private parseObjectPattern(): ObjectPattern {
    const leftBrace = this.previous();
    const properties: (PropertyPattern | SpreadElement)[] = [];
    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      if (this.match(TokenType.SPREAD)) {
        properties.push(this.parseSpreadElement());
      } else {
        properties.push(this.parsePropertyPattern());
      }
      if (!this.match(TokenType.COMMA)) break;
    }
    this.consume(TokenType.RIGHT_BRACE, "Expected '}' in object pattern");
    return {
      type: 'ObjectPattern',
      properties,
      line: leftBrace.line,
      column: leftBrace.column,
    } as ObjectPattern;
  }

  /** `ном`, `ном = 1`, `калид: ном`, `калид: { … } = {}` */
  private parsePropertyPattern(): PropertyPattern {
    const keyToken = this.peek();
    let key: Identifier | Literal;
    if (this.match(TokenType.STRING)) {
      key = this.createLiteral(keyToken.value, keyToken);
    } else if (this.isIdentifierNameToken(keyToken)) {
      key = this.createIdentifier(this.advance());
    } else {
      throw new Error(this.unexpectedTokenMessage('Expected identifier in object pattern'));
    }

    let value: PropertyPattern['value'];
    if (this.match(TokenType.COLON)) {
      value = this.parsePatternWithDefault();
    } else {
      // Shorthand `{ ном }` binds a variable named like the key
      if (key.type !== 'Identifier' || !this.isPlainIdentifierToken(keyToken)) {
        throw new Error(this.unexpectedTokenMessage("Expected ':' after property key in pattern"));
      }
      value = this.withDefault(this.createIdentifier(keyToken));
    }

    return {
      type: 'PropertyPattern',
      key,
      value,
      computed: false,
      line: keyToken.line,
      column: keyToken.column,
    };
  }

  private parsePatternWithDefault(): Identifier | ArrayPattern | ObjectPattern | AssignmentPattern {
    return this.withDefault(this.parsePattern());
  }

  /** Wraps `target` in an AssignmentPattern when a `= default` follows. */
  private withDefault(
    target: Identifier | ArrayPattern | ObjectPattern
  ): Identifier | ArrayPattern | ObjectPattern | AssignmentPattern {
    if (!this.match(TokenType.ASSIGN)) {
      return target;
    }
    return {
      type: 'AssignmentPattern',
      left: target,
      right: this.assignment(),
      line: target.line,
      column: target.column,
    };
  }

  private parseIdentifierPattern(): Identifier {
    // Allow certain keyword tokens to be treated as identifiers in binding patterns
    if (this.check(TokenType.IDENTIFIER)) {
      const identTok = this.advance();
      return {
        type: 'Identifier',
        name: identTok.value,
        line: identTok.line,
        column: identTok.column,
      } as Identifier;
    }
    if (this.matchBuiltinIdentifier()) {
      const token = this.previous();
      return {
        type: 'Identifier',
        name: token.value,
        line: token.line,
        column: token.column,
      } as Identifier;
    }
    const ident = this.consume(TokenType.IDENTIFIER, 'Expected identifier');
    return {
      type: 'Identifier',
      name: ident.value,
      line: ident.line,
      column: ident.column,
    } as Identifier;
  }

  private parseSpreadElement(): SpreadElement {
    const spreadToken = this.previous(); // SPREAD token consumed by caller
    const argument = this.parsePattern();
    return {
      type: 'SpreadElement',
      argument,
      line: spreadToken.line,
      column: spreadToken.column,
    } as SpreadElement;
  }

  private breakStatement(): BreakStatement {
    const token = this.previous();
    const label = this.parseJumpLabel();
    this.consumeSemicolon("Expected ';' after 'шикастан'");
    return {
      type: 'BreakStatement',
      ...(label && { label }),
      line: token.line,
      column: token.column,
    };
  }

  private continueStatement(): ContinueStatement {
    const token = this.previous();
    const label = this.parseJumpLabel();
    this.consumeSemicolon("Expected ';' after 'давом'");
    return {
      type: 'ContinueStatement',
      ...(label && { label }),
      line: token.line,
      column: token.column,
    };
  }

  /** The label of `шикастан берун;`; as in JavaScript it must be on the same line. */
  private parseJumpLabel(): Identifier | undefined {
    if (this.isPlainIdentifierToken(this.peek()) && !this.hasLineBreakBefore()) {
      return this.createIdentifier(this.advance());
    }
    return undefined;
  }
}

/*
 * SomonScript formatter (`somon fmt`)
 * Copyright (c) 2025 LindenTech IT Consulting
 *
 * Licensed under the MIT License. See the LICENSE file for details.
 */

/**
 * Formats SomonScript source in the canonical style of the examples:
 * indentation by nesting (4 spaces by default), `{` on the line of its
 * statement, one space around binary operators and after commas and keywords,
 * `;` after every statement, at most one blank line in a row and a final
 * newline.
 *
 * The formatter works on the token stream and keeps the author's line breaks
 * (like `gofmt`): it re-indents lines and normalizes the spacing inside them,
 * but it never splits or joins lines except to move `{` and
 * `вагарна`/`гирифтан`/`ниҳоят` up to the line before. Every comment is kept.
 * The parser (`Parser.omittedSemicolons`) says where a `;` was left out, and
 * the AST says which words are names and which `<` open type arguments.
 *
 * Safety: the result is parsed again and must give the same AST (positions
 * aside) and the same comments as the input; otherwise {@link format} throws
 * a {@link FormatError} instead of returning code that means something else.
 */

import type { Program } from '../ast';
import { Lexer } from '../lexer';
import { Parser, type OmittedSemicolon } from '../parser';
import { TokenType, type Token } from '../tokens';

/** Options for {@link format}. */
export interface FormatOptions {
  /** Spaces per indentation level (1–16). Defaults to 4. */
  indent?: number;
}

/**
 * Raised when the source cannot be formatted: `syntax` when it does not
 * parse, `unsafe` when the formatted code would not parse to the same program
 * (the formatter refuses rather than change what the code means).
 */
export class FormatError extends Error {
  readonly kind: 'syntax' | 'unsafe';
  readonly details: readonly string[];

  constructor(message: string, kind: 'syntax' | 'unsafe', details: readonly string[] = []) {
    super(message);
    this.name = 'FormatError';
    this.kind = kind;
    this.details = details;
  }
}

/** Default number of spaces per indentation level. */
export const DEFAULT_INDENT = 4;

/** Format SomonScript source; throws {@link FormatError} when that is not possible. */
export function format(source: string, options: FormatOptions = {}): string {
  const indent = options.indent ?? DEFAULT_INDENT;
  if (!Number.isInteger(indent) || indent < 1 || indent > 16) {
    throw new RangeError(`indent must be an integer from 1 to 16, got ${indent}`);
  }
  const { prologue, body } = splitPrologue(source);
  const tokens = lexWithComments(body);
  const parser = parseTokens(tokens.filter(token => token.type !== TokenType.COMMENT));
  const items = buildItems(body, tokens, parser.omittedSemicolons);
  new Classifier(items, indexNodes(parser.ast)).run();
  joinLines(items);
  const formatted = render(new Layout(indent).run(items));
  checkSameProgram(body, formatted);
  return withLineEndings(prologue + formatted, lineEnding(source));
}

/** Whether `source` is already formatted (throws like {@link format}). */
export function isFormatted(source: string, options: FormatOptions = {}): boolean {
  return format(source, options) === source;
}

// ---------------------------------------------------------------------------
// Input

/** A byte order mark and a `#!` line are kept as they are, above the formatted code. */
function splitPrologue(source: string): { prologue: string; body: string } {
  let prologue = '';
  let body = source;
  if (body.startsWith('\uFEFF')) {
    prologue = '\uFEFF';
    body = body.slice(1);
  }
  if (body.startsWith('#!')) {
    const match = /\r\n|\n|\r/.exec(body);
    const end = match ? match.index : body.length;
    prologue += `${body.slice(0, end).trimEnd()}\n`;
    body = match ? body.slice(end + match[0].length) : '';
  }
  return { prologue, body };
}

/**
 * The file's line ending, decided by its first line break (as rustfmt's
 * `Auto`): a file checked out with CRLF, as Git does on Windows, stays CRLF.
 */
function lineEnding(source: string): '\n' | '\r\n' {
  return /\r\n|\n|\r/.exec(source)?.[0] === '\r\n' ? '\r\n' : '\n';
}

/**
 * The formatted code is built with LF; a CRLF file gets CRLF everywhere. That
 * includes line breaks inside template literals, which JavaScript reads as LF
 * either way, so the program does not change.
 */
function withLineEndings(code: string, ending: '\n' | '\r\n'): string {
  return ending === '\n' ? code : code.replace(/\r?\n/g, ending);
}

/** The lexer and the parser (through programShape) report problems with Errors. */
function errorMessage(error: unknown): string {
  return (error as Error).message;
}

function lexWithComments(source: string): Token[] {
  try {
    return new Lexer(source, { comments: true }).tokenize();
  } catch (error) {
    throw new FormatError(errorMessage(error), 'syntax', [errorMessage(error)]);
  }
}

function parseTokens(tokens: Token[]): { ast: Program; omittedSemicolons: OmittedSemicolon[] } {
  const parser = new Parser(tokens);
  const ast = parser.parse();
  const errors = parser.getErrors();
  if (errors.length > 0) throw new FormatError(errors[0], 'syntax', errors);
  return { ast, omittedSemicolons: parser.omittedSemicolons };
}

// ---------------------------------------------------------------------------
// Items: the tokens to print, with what the formatter learns about them

type Kind =
  | 'word'
  | 'literal'
  | 'comment'
  | 'open'
  | 'close'
  | 'comma'
  | 'semicolon'
  | 'dot'
  | 'spread'
  | 'binary'
  | 'prefix'
  | 'postfix'
  | 'typeOpen'
  | 'typeClose'
  | 'colon'
  | 'optional'
  | 'tight'
  | 'starGenerator'
  | 'starMember'
  | 'at';

/** What the brace opens, for indentation and line joins. */
type BraceKind = 'block' | 'switch' | 'do' | 'expression';

interface Item {
  text: string;
  type: TokenType;
  /** Source position (1-based line, code point column) of the token. */
  line: number;
  column: number;
  /** Line breaks between the previous token and this one. */
  nl: number;
  /** Width of the whitespace before the token on its source line. */
  gap: number;
  synthetic?: boolean;
  isComment: boolean;
  isLineComment: boolean;
  kind: Kind;
  /** A word that names something (operand), as opposed to a keyword. */
  name: boolean;
  keyword: boolean;
  operandEnd: boolean;
  /** Opens a bracket frame: `(`, `[`, `{` or a type argument `<`. */
  opens: boolean;
  /** Number of bracket frames this token closes. */
  closes: number;
  /** A `<…>` that starts an operand (type assertion, generic arrow), not type arguments. */
  prefixAngle?: boolean;
  /** For `(`: the keyword of the statement head it belongs to (`агар`, `барои`, …). */
  head?: string;
  /** For `)`: the head keyword of the matching `(`. */
  closesHead?: string;
  braceKind?: BraceKind;
  /** For `}`: what its `{` opened. */
  closesBrace?: BraceKind;
  caseLabel?: boolean;
  caseColon?: boolean;
  /** A statement starts with this token (from the AST). */
  startsStatement?: boolean;
  /** The code token before this one. */
  before?: Item;
}

function countLineBreaks(text: string): number {
  return (text.match(/\r\n|\n|\r/g) ?? []).length;
}

/** Width of the whitespace after the last line break of `gapText`. */
function gapWidth(gapText: string): number {
  const lastBreak = Math.max(gapText.lastIndexOf('\n'), gapText.lastIndexOf('\r'));
  return gapText.length - lastBreak - 1;
}

function newItem(token: Token, text: string, nl: number, gap: number): Item {
  const isComment = token.type === TokenType.COMMENT;
  return {
    text,
    type: token.type,
    line: token.line,
    column: token.column,
    nl,
    gap,
    isComment,
    isLineComment: isComment && text.startsWith('//'),
    kind: isComment ? 'comment' : 'binary',
    name: false,
    keyword: false,
    operandEnd: false,
    opens: false,
    closes: 0,
  };
}

/** The printable tokens with their source text, plus the `;` the source left out. */
function buildItems(source: string, tokens: Token[], omitted: OmittedSemicolon[]): Item[] {
  const positions = new Map(tokens.map((token, index) => [token, index]));
  const insertBefore = new Set<Token>();
  for (const entry of omitted) {
    // `{ а: рақам }`: no `;` after the last member of a one-line object type
    const sameLine = entry.member && entry.before.type === TokenType.RIGHT_BRACE;
    const index = positions.get(entry.before)!;
    if (!sameLine || hasLineBreakBefore(tokens, index)) insertBefore.add(entry.before);
  }

  const items: Item[] = [];
  let previousEnd = 0;
  let lastCode = -1;
  for (const token of tokens) {
    if (token.type === TokenType.NEWLINE) continue;
    if (insertBefore.has(token) && lastCode >= 0) insertSemicolon(items, lastCode);
    if (token.type === TokenType.EOF) break;
    // In comment mode every token has its offsets
    const start = token.start!;
    const gapText = source.slice(previousEnd, start);
    const item = newItem(
      token,
      source.slice(start, token.end),
      countLineBreaks(gapText),
      gapWidth(gapText)
    );
    items.push(item);
    if (!item.isComment) lastCode = items.length - 1;
    previousEnd = token.end!;
  }
  return items;
}

/**
 * Whether a line break separates `tokens[index]` from the code token before
 * it; there is one (the `}` of an object type follows its members).
 */
function hasLineBreakBefore(tokens: Token[], index: number): boolean {
  let i = index - 1;
  while (tokens[i].type === TokenType.COMMENT) i--;
  return tokens[i].type === TokenType.NEWLINE;
}

/** Puts a `;` right after `items[index]` (before any comments that follow it). */
function insertSemicolon(items: Item[], index: number): void {
  const after = items[index];
  const semicolon = newItem(
    { type: TokenType.SEMICOLON, value: ';', line: after.line, column: after.column },
    ';',
    0,
    0
  );
  semicolon.synthetic = true;
  items.splice(index + 1, 0, semicolon);
}

// ---------------------------------------------------------------------------
// The AST tells which words are names and where types and statements start

type NodeIndex = Map<string, Set<string>>;

function positionKey(line: number, column: number): string {
  return `${line}:${column}`;
}

function indexNodes(ast: Program): NodeIndex {
  const index: NodeIndex = new Map();
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!value || typeof value !== 'object') return;
    const node = value as Record<string, unknown>;
    if (typeof node.type === 'string' && typeof node.line === 'number') {
      const key = positionKey(node.line, node.column as number);
      const types = index.get(key) ?? new Set<string>();
      types.add(node.type);
      index.set(key, types);
    }
    for (const [key, child] of Object.entries(node)) {
      if (key !== 'line' && key !== 'column') visit(child);
    }
  };
  visit(ast);
  return index;
}

const NAME_NODES = [
  'Identifier',
  'PrivateIdentifier',
  'ThisExpression',
  'Super',
  'Literal',
  'ThisType',
  'PrimitiveType',
  'GenericType',
  'LiteralType',
  'TypeParameter',
];

const TYPE_NODES = [
  'PrimitiveType',
  'GenericType',
  'ArrayType',
  'UnionType',
  'IntersectionType',
  'FunctionType',
  'ConditionalType',
  'MappedType',
  'IndexedAccessType',
  'KeyofType',
  'UniqueType',
  'ReadonlyType',
  'OptionalType',
  'RestType',
  'ThisType',
  'TypePredicate',
  'ConstructorType',
  'TupleType',
  'LiteralType',
  'ObjectType',
  'TypeParameter',
  'TypeAnnotation',
  'InferType',
  'TypeQuery',
  'TemplateLiteralType',
  'ImportType',
];

const EXPRESSION_BRACE_NODES = ['ObjectExpression', 'ObjectType', 'ObjectPattern', 'MappedType'];

const MEMBER_NODES = ['PropertySignature', 'MethodDefinition', 'PropertyDefinition', 'Property'];

const STATEMENT_NODES = [
  'VariableDeclaration',
  'VariableDeclarationList',
  'FunctionDeclaration',
  'ClassDeclaration',
  'InterfaceDeclaration',
  'TypeAlias',
  'EnumDeclaration',
  'NamespaceDeclaration',
  'ImportDeclaration',
  'ExportDeclaration',
  'ExpressionStatement',
  'IfStatement',
  'ForStatement',
  'ForInStatement',
  'ForOfStatement',
  'WhileStatement',
  'DoWhileStatement',
  'ReturnStatement',
  'ThrowStatement',
  'TryStatement',
  'SwitchStatement',
  'BreakStatement',
  'ContinueStatement',
  'LabeledStatement',
  'BlockStatement',
  'EmptyStatement',
  'DebuggerStatement',
];

/** Statement, operator and modifier words: keywords unless the AST says they name something. */
const KEYWORD_WORDS: ReadonlySet<string> = new Set(
  (
    'тағ тағйирёбанда собит функсия функция агар вагарна чунин барои то бозгашт синф нав ' +
    'ворид содир аз дар чун пешфарз шикастан давом интихоб ҳолат кӯшиш гирифтан ниҳоят ' +
    'партофтан ҳамзамон интизор интерфейс навъ мерос татбиқ хосусӣ муҳофизатшуда ҷамъиятӣ ' +
    'статикӣ мавҳум номфазо калидҳои инфер хулоса танҳохонӣ беназир навъи аст бармесоё кун ' +
    'ҳосил шумориш эълон модул глобалӣ бознавис дастрасӣ истифода тасдиқ берун ' +
    'let const var function if else for while do return class new import export from in of ' +
    'as default break continue switch case try catch finally throw async await interface ' +
    'type extends implements private protected public static abstract namespace module ' +
    'declare keyof infer readonly unique typeof is asserts satisfies yield enum void delete ' +
    'instanceof get set debugger with override accessor using global'
  ).split(' ')
);

/** Keywords whose `(…)` is a statement head; a line after its `)` continues the statement. */
const HEAD_KEYWORDS: ReadonlySet<string> = new Set([
  'агар',
  'if',
  'барои',
  'for',
  'то',
  'while',
  'интихоб',
  'switch',
  'гирифтан',
  'catch',
]);

const SWITCH_KEYWORDS: ReadonlySet<string> = new Set(['интихоб', 'switch']);
const DO_KEYWORDS: ReadonlySet<string> = new Set(['кун', 'do']);
const FUNCTION_KEYWORDS: ReadonlySet<string> = new Set(['функсия', 'функция', 'function']);
const YIELD_KEYWORDS: ReadonlySet<string> = new Set(['ҳосил', 'yield']);
const MODULE_KEYWORDS: ReadonlySet<string> = new Set(['ворид', 'import', 'содир', 'export']);
const CASE_KEYWORDS: ReadonlySet<string> = new Set(['ҳолат', 'case']);
const DEFAULT_KEYWORDS: ReadonlySet<string> = new Set(['пешфарз', 'default']);
/** Words after which a line break ends the statement (`бозгашт` + newline returns nothing). */
const RESTRICTED_KEYWORDS: ReadonlySet<string> = new Set([
  'бозгашт',
  'return',
  'партофтан',
  'throw',
  'ҳосил',
  'yield',
  'шикастан',
  'break',
  'давом',
  'continue',
]);
/** Keywords that continue the statement on the next line (`вагарна` + body). */
const CONTINUING_KEYWORDS: ReadonlySet<string> = new Set(['вагарна', 'чунин', 'else', 'кун', 'do']);
/** Keywords that move up behind a `}` on the line before. */
const AFTER_BRACE_KEYWORDS: ReadonlySet<string> = new Set([
  'вагарна',
  'чунин',
  'else',
  'гирифтан',
  'catch',
  'ниҳоят',
  'finally',
]);
const WHILE_KEYWORDS: ReadonlySet<string> = new Set(['то', 'while']);
/** Keywords written without a space before `(`: `ворид("./м")` is a dynamic import. */
const CALL_LIKE_KEYWORDS: ReadonlySet<string> = new Set(['ворид', 'import']);

const LITERAL_TYPES: ReadonlySet<TokenType> = new Set([
  TokenType.NUMBER,
  TokenType.STRING,
  TokenType.TEMPLATE_LITERAL,
  TokenType.REGEX,
]);

const OPENERS: ReadonlyMap<string, string> = new Map([
  ['(', ')'],
  ['[', ']'],
  ['{', '}'],
]);
const CLOSERS: ReadonlyMap<string, string> = new Map([
  [')', '('],
  [']', '['],
  ['}', '{'],
]);
/** How many type argument lists a `>`, `>>` or `>>>` closes. */
const ANGLE_CLOSERS: ReadonlyMap<string, number> = new Map([
  ['>', 1],
  ['>>', 2],
  ['>>>', 3],
]);

/** Tokens after which a `?` is the optional marker (`а?: Т`, `(а?)`, `[Т?]`), not `? :`. */
const OPTIONAL_FOLLOWERS: ReadonlySet<string> = new Set([':', ')', ',', '=', ']', ';', '}']);

/** Tokens that cannot appear inside type arguments: the `<` before them compares. */
const NOT_IN_TYPE_ARGUMENTS: ReadonlySet<string> = new Set([
  ';',
  '&&',
  '||',
  '??',
  '=',
  '==',
  '===',
  '!=',
  '!==',
  '<=',
  '>=',
  '+',
  '*',
  '/',
  '%',
  '**',
  '!',
  '++',
  '--',
  '+=',
  '-=',
  '*=',
  '/=',
  '<<',
]);

/** Tokens that may follow explicit type arguments the parser skips (`ф<Т>(…)`, `мерос А<Т> {`). */
const AFTER_SKIPPED_TYPE_ARGUMENTS: ReadonlySet<string> = new Set([
  '(',
  '{',
  ',',
  'татбиқ',
  'implements',
]);

const SIMPLE_KINDS: ReadonlyMap<string, Kind> = new Map([
  [',', 'comma'],
  [';', 'semicolon'],
  ['.', 'dot'],
  ['?.', 'dot'],
  ['...', 'spread'],
  ['~', 'prefix'],
  ['@', 'at'],
]);

function isWordText(text: string): boolean {
  return /^[\p{L}\p{Nl}_$#]/u.test(text);
}

interface Frame {
  open: Item;
  /** `<…>` type arguments rather than a bracket. */
  angle: boolean;
  /** Open `?` of conditional expressions waiting for their `:`. */
  ternary: number;
  awaitingCaseColon?: boolean;
}

/**
 * Decides, token by token, what each one is: a name or a keyword, a binary or
 * unary operator, the `<` of type arguments or a comparison, a ternary `:` or
 * a type annotation, and which brackets open and close frames.
 */
class Classifier {
  private readonly code: Item[];
  private readonly stack: Frame[] = [];
  private readonly root: Frame;

  private readonly nodes: NodeIndex;

  constructor(items: Item[], nodes: NodeIndex) {
    this.nodes = nodes;
    this.code = items.filter(item => !item.isComment);
    this.root = { open: items[0], angle: false, ternary: 0 };
  }

  run(): void {
    this.code.forEach((item, index) => {
      item.startsStatement = this.hasNode(item, STATEMENT_NODES);
      item.before = this.code[index - 1];
      this.classify(item, index);
    });
  }

  private hasNode(item: Item | undefined, types: readonly string[]): boolean {
    if (!item || item.synthetic) return false;
    const found = this.nodes.get(positionKey(item.line, item.column));
    return found !== undefined && types.some(type => found.has(type));
  }

  private get frame(): Frame {
    return this.stack[this.stack.length - 1] ?? this.root;
  }

  private classify(item: Item, index: number): void {
    const previous = this.code[index - 1];
    const next = this.code[index + 1];
    if (LITERAL_TYPES.has(item.type)) {
      item.kind = 'literal';
      item.operandEnd = true;
    } else if (isWordText(item.text)) {
      this.classifyWord(item, previous, next);
    } else if (OPENERS.has(item.text)) {
      this.openBracket(item, previous, index);
    } else if (CLOSERS.has(item.text)) {
      this.closeBracket(item);
    } else {
      this.classifyOperator(item, previous, next, index);
    }
  }

  private classifyWord(item: Item, previous: Item | undefined, next: Item | undefined): void {
    item.kind = 'word';
    const afterDot = previous?.kind === 'dot';
    const hasAnyNode = this.nodes.has(positionKey(item.line, item.column));
    item.name =
      afterDot ||
      this.hasNode(item, NAME_NODES) ||
      (!hasAnyNode && !KEYWORD_WORDS.has(item.text)) ||
      item.type === TokenType.PRIVATE_NAME;
    item.keyword = !item.name;
    item.operandEnd = item.name;
    if (item.keyword) this.noteCaseLabel(item, previous, next);
  }

  /** `ҳолат х:` / `пешфарз:` directly inside a `интихоб` body. */
  private noteCaseLabel(item: Item, previous: Item | undefined, next: Item | undefined): void {
    const frame = this.stack[this.stack.length - 1];
    if (!frame || frame.open.braceKind !== 'switch') return;
    const atUnitStart =
      previous !== undefined &&
      (previous.text === '{' ||
        previous.text === ';' ||
        previous.text === '}' ||
        previous.caseColon === true);
    const isLabel =
      CASE_KEYWORDS.has(item.text) || (DEFAULT_KEYWORDS.has(item.text) && next?.text === ':');
    if (atUnitStart && isLabel) {
      item.caseLabel = true;
      frame.awaitingCaseColon = true;
    }
  }

  private openBracket(item: Item, previous: Item | undefined, index: number): void {
    item.kind = 'open';
    item.opens = true;
    if (item.text === '(') item.head = this.headKeyword(previous, index);
    if (item.text === '{') item.braceKind = this.braceKind(item, previous);
    this.stack.push({ open: item, angle: false, ternary: 0 });
  }

  private headKeyword(previous: Item | undefined, index: number): string | undefined {
    if (!previous?.keyword) return undefined;
    if (HEAD_KEYWORDS.has(previous.text)) return previous.text;
    const beforeAwait = this.code[index - 2];
    // `барои интизор (`, `барои await (` (SomonScript has no English `for`)
    const forAwait =
      (previous.text === 'интизор' || previous.text === 'await') &&
      beforeAwait?.keyword === true &&
      beforeAwait.text === 'барои';
    return forAwait ? beforeAwait.text : undefined;
  }

  private braceKind(item: Item, previous: Item | undefined): BraceKind {
    if (previous?.closesHead && SWITCH_KEYWORDS.has(previous.closesHead)) return 'switch';
    if (previous?.keyword && DO_KEYWORDS.has(previous.text)) return 'do';
    return this.hasNode(item, EXPRESSION_BRACE_NODES) ? 'expression' : 'block';
  }

  private closeBracket(item: Item): void {
    item.kind = 'close';
    item.operandEnd = item.text !== '}';
    const opener = CLOSERS.get(item.text);
    let closes = 0;
    while (this.stack.length > 0) {
      const frame = this.stack.pop() as Frame;
      closes++;
      if (!frame.angle && frame.open.text === opener) {
        item.closesHead = frame.open.head;
        item.closesBrace = frame.open.braceKind;
        break;
      }
    }
    item.closes = closes;
  }

  private classifyOperator(
    item: Item,
    previous: Item | undefined,
    next: Item | undefined,
    index: number
  ): void {
    const simple = SIMPLE_KINDS.get(item.text);
    if (simple) {
      item.kind = simple;
      return;
    }
    const handler = OPERATOR_HANDLERS.get(item.text);
    if (handler) {
      handler(this, item, previous, next, index);
      return;
    }
    if (ANGLE_CLOSERS.has(item.text) && this.frame.angle) {
      this.closeAngles(item);
      return;
    }
    item.kind = 'binary';
  }

  angleOrComparison(
    item: Item,
    previous: Item | undefined,
    next: Item | undefined,
    index: number
  ): void {
    const nested = this.frame.angle; // `<` inside type arguments: `ф<Map<К, В>>()`
    // `ф<| "а" | "б">()`: a single type after a leading `|` or `&` starts after it
    const leading = next?.text === '|' || next?.text === '&';
    const first = leading ? this.code[index + 2] : next;
    const typed = this.hasNode(next, TYPE_NODES) || this.hasNode(first, TYPE_NODES);
    if (!nested && !typed && !this.scanSkippedTypeArguments(index)) {
      item.kind = 'binary';
      return;
    }
    item.kind = 'typeOpen';
    item.opens = true;
    item.prefixAngle = !previous?.operandEnd;
    this.stack.push({ open: item, angle: true, ternary: 0 });
  }

  /** Type arguments the parser skips without AST nodes: `ф<рақам>(5)`, `мерос А<Т> {`. */
  private scanSkippedTypeArguments(index: number): boolean {
    let depth = 0;
    let brackets = 0;
    for (let i = index; i < this.code.length && i < index + 100; i++) {
      const text = this.code[i].text;
      const closed = ANGLE_CLOSERS.get(text);
      if (text === '<') depth++;
      else if (closed !== undefined) {
        depth -= closed;
        if (depth <= 0) {
          // A `;` (written or added) or a `}` always follows: `>` never ends the code
          return depth === 0 && AFTER_SKIPPED_TYPE_ARGUMENTS.has(this.code[i + 1].text);
        }
      } else if (NOT_IN_TYPE_ARGUMENTS.has(text)) return false;
      else if (OPENERS.has(text)) brackets++;
      else if (CLOSERS.has(text) && --brackets < 0) return false;
    }
    return false;
  }

  private closeAngles(item: Item): void {
    item.kind = 'typeClose';
    let count = ANGLE_CLOSERS.get(item.text)!;
    let closes = 0;
    let prefix = false;
    while (count > 0 && this.frame.angle && this.stack.length > 0) {
      const frame = this.stack.pop() as Frame;
      prefix = frame.open.prefixAngle === true;
      closes++;
      count--;
    }
    item.closes = closes;
    item.prefixAngle = prefix;
    item.operandEnd = !prefix;
  }

  question(item: Item, previous: Item | undefined, next: Item | undefined): void {
    // A `?` never ends a program that parses
    const following = next!.text;
    const optionalMember =
      (following === '(' || following === '<') && this.hasNode(previous, MEMBER_NODES);
    if (OPTIONAL_FOLLOWERS.has(following) || optionalMember) {
      item.kind = 'optional';
      item.operandEnd = true;
      return;
    }
    item.kind = 'binary';
    this.frame.ternary++;
  }

  colon(item: Item): void {
    const frame = this.frame;
    if (frame.ternary > 0) {
      frame.ternary--;
      item.kind = 'binary';
      return;
    }
    item.kind = 'colon';
    if (frame.awaitingCaseColon) {
      frame.awaitingCaseColon = false;
      item.caseColon = true;
    }
  }
}

type OperatorHandler = (
  _classifier: Classifier,
  _item: Item,
  _previous: Item | undefined,
  _next: Item | undefined,
  _index: number
) => void;

function plusOrMinus(item: Item, previous: Item | undefined, next: Item | undefined): void {
  if (next?.text === '?') {
    item.kind = 'tight'; // mapped type modifiers `-?`, `+?`
  } else {
    item.kind = previous?.operandEnd ? 'binary' : 'prefix';
  }
}

/** `!`, `++`, `--`: postfix right after an operand on the same line, prefix otherwise. */
function postfixOrPrefix(item: Item, previous: Item | undefined): void {
  const postfix = previous?.operandEnd === true && item.nl === 0;
  item.kind = postfix ? 'postfix' : 'prefix';
  item.operandEnd = postfix;
}

function star(item: Item, previous: Item | undefined): void {
  if (previous?.keyword && FUNCTION_KEYWORDS.has(previous.text)) item.kind = 'starGenerator';
  else if (previous?.keyword && YIELD_KEYWORDS.has(previous.text)) item.kind = 'starGenerator';
  else if (previous?.operandEnd) item.kind = 'binary';
  else if (previous?.keyword && MODULE_KEYWORDS.has(previous.text)) item.kind = 'binary';
  else item.kind = 'starMember';
}

const OPERATOR_HANDLERS: ReadonlyMap<string, OperatorHandler> = new Map<string, OperatorHandler>([
  ['+', (_c, item, previous, next) => plusOrMinus(item, previous, next)],
  ['-', (_c, item, previous, next) => plusOrMinus(item, previous, next)],
  ['!', (_c, item, previous) => postfixOrPrefix(item, previous)],
  ['++', (_c, item, previous) => postfixOrPrefix(item, previous)],
  ['--', (_c, item, previous) => postfixOrPrefix(item, previous)],
  ['*', (_c, item, previous) => star(item, previous)],
  [
    '<',
    (classifier, item, previous, next, index) =>
      classifier.angleOrComparison(item, previous, next, index),
  ],
  ['?', (classifier, item, previous, next) => classifier.question(item, previous, next)],
  [':', (classifier, item) => classifier.colon(item)],
]);

// ---------------------------------------------------------------------------
// Line joins: `{` and `вагарна`/`гирифтан`/`ниҳоят` move up to the line before

function joinLines(items: Item[]): void {
  items.forEach((item, index) => {
    const previous = items[index - 1];
    if (item.nl > 0 && previous && !previous.isComment && shouldJoin(item, previous)) item.nl = 0;
  });
}

function shouldJoin(item: Item, previous: Item): boolean {
  if (item.text === '{') return canTakeBrace(previous);
  if (!item.keyword) return false;
  if (AFTER_BRACE_KEYWORDS.has(item.text)) return previous.text === '}';
  return WHILE_KEYWORDS.has(item.text) && previous.closesBrace === 'do';
}

function canTakeBrace(previous: Item): boolean {
  if (previous.opens || [';', '{', '}', ','].includes(previous.text)) return false;
  return !(previous.keyword && RESTRICTED_KEYWORDS.has(previous.text));
}

// ---------------------------------------------------------------------------
// Spacing between two tokens on one line

const NO_SPACE_AFTER: ReadonlySet<Kind> = new Set([
  'dot',
  'spread',
  'prefix',
  'typeOpen',
  'starMember',
  'at',
  'tight',
]);
const NO_SPACE_BEFORE: ReadonlySet<Kind> = new Set([
  'comma',
  'semicolon',
  'dot',
  'postfix',
  'typeClose',
  'colon',
  'optional',
  'starGenerator',
  'tight',
]);

function needsSpace(previous: Item, item: Item): boolean {
  return wouldMerge(previous.text, item.text) || preferredSpace(previous, item);
}

function preferredSpace(previous: Item, item: Item): boolean {
  if (item.isComment) return previous.text !== '(' && previous.text !== '[';
  if (previous.isComment) return ![')', ']', ',', ';', '.', '?.'].includes(item.text);
  if (item.text === '}') return previous.text !== '{';
  if (previous.text === '{') return true;
  if (previous.text === '(' || previous.text === '[') return false;
  if (previous.text === ';') return semicolonSpace(previous, item);
  if (item.text === ')' || item.text === ']') return false;
  if (NO_SPACE_AFTER.has(previous.kind) || NO_SPACE_BEFORE.has(item.kind)) return false;
  return !attaches(previous, item);
}

/** Inside `барои (…)`: `(;;)`, but `(тағ и = 0; ; и++)` and `(; и < н; )`. */
function semicolonSpace(previous: Item, item: Item): boolean {
  if (item.text === ';') return previous.before?.text !== '(';
  if (item.text === ')') return previous.before?.text !== ';';
  return true;
}

/** Calls, indexes, type arguments and tagged templates attach to the operand before them. */
function attaches(previous: Item, item: Item): boolean {
  const attaching =
    item.text === '(' ||
    item.text === '[' ||
    item.kind === 'typeOpen' ||
    item.type === TokenType.TEMPLATE_LITERAL;
  if (attaching && previous.operandEnd) return true;
  if (item.text === '(' && previous.keyword && CALL_LIKE_KEYWORDS.has(previous.text)) return true;
  // `<сатр>а`, `<Т>(х: Т) => х`
  return previous.kind === 'typeClose' && previous.prefixAngle === true;
}

/** Whether printing the two tokens without a space would read as other tokens. */
function wouldMerge(left: string, right: string): boolean {
  const last = left[left.length - 1];
  const first = right[0];
  if (/[\p{ID_Continue}$\u200C\u200D]/u.test(last) && /[\p{ID_Continue}$#]/u.test(first)) {
    return true;
  }
  if ((last === '+' || last === '-') && first === last) return true;
  if (last === '/' && (first === '/' || first === '*')) return true;
  return (last === '<' || last === '>') && (first === last || first === '=');
}

// ---------------------------------------------------------------------------
// Layout: lines and indentation

interface Line {
  indent: number;
  text: string;
  blankBefore: boolean;
  /** A `//` comment at the end of the line, printed after the code. */
  trailing?: string;
  /** The trailing comment was aligned with spaces in the source. */
  trailingAligned?: boolean;
  /** The line starts with a decorator (`@ном`): the next line starts a declaration. */
  decorator?: boolean;
}

interface LayoutFrame {
  closeIndent: number;
  contentIndent: number;
  /** Index of the line the bracket was opened on. */
  line: number;
  switch: boolean;
  caseSeen: boolean;
}

class Layout {
  private readonly lines: Line[] = [];
  private readonly stack: LayoutFrame[] = [];
  private lastCode: Item | undefined;
  /** Index of the line that holds `lastCode`. */
  private lastCodeLine = -1;
  private line: Line | undefined;
  private previous: Item | undefined;

  private readonly indentWidth: number;

  constructor(indentWidth: number) {
    this.indentWidth = indentWidth;
  }

  run(items: Item[]): { lines: Line[]; indentWidth: number } {
    items.forEach((item, index) => {
      if (!this.line || item.nl > 0) this.startLine(item, items, index);
      else this.append(item);
      this.track(item);
      this.previous = item;
      if (!item.isComment) {
        this.lastCode = item;
        this.lastCodeLine = this.lines.length - 1;
      }
    });
    return { lines: this.lines, indentWidth: this.indentWidth };
  }

  private startLine(item: Item, items: Item[], index: number): void {
    const indent = this.indentFor(item, items, index);
    const blankBefore =
      item.nl >= 2 && this.line !== undefined && !this.previous?.opens && item.closes === 0;
    this.line = { indent, text: '', blankBefore, decorator: item.kind === 'at' };
    this.lines.push(this.line);
    this.write(item, indent * this.indentWidth);
  }

  private indentFor(item: Item, items: Item[], index: number): number {
    if (!item.isComment && item.closes > 0) {
      // The frames it closes are still on the stack
      return this.stack[this.stack.length - item.closes].closeIndent;
    }
    const anchor = item.isComment ? nextCode(items, index) : item;
    const frame = this.stack[this.stack.length - 1];
    let indent = frame ? frame.contentIndent : 0;
    if (frame?.switch && frame.caseSeen && !anchor?.caseLabel) indent++;
    // The first line inside a bracket is indented by the bracket alone: `ф(х =>⏎    х * 2)`
    const firstInFrame = frame !== undefined && frame.line === this.lastCodeLine;
    if (!anchor || anchor.closes > 0 || firstInFrame) return indent;
    return this.continuedIndent(anchor, indent);
  }

  /** Indentation of a line at `indent` that may continue the statement before it. */
  private continuedIndent(anchor: Item, indent: number): number {
    // A body without braces goes one level deeper than its head: `агар (а)⏎    б();`
    // (a `{` kept on its own line, behind a comment, stays at the level of the head)
    if (this.endsHead()) {
      return this.lines[this.lastCodeLine].indent + (anchor.text === '{' ? 0 : 1);
    }
    return this.isContinuation(anchor) ? indent + 1 : indent;
  }

  /** The last code token ends a statement head whose body follows on the next line. */
  private endsHead(): boolean {
    const last = this.lastCode;
    if (!last) return false;
    if (last.closesHead || last.text === '=>') return true;
    return last.keyword && CONTINUING_KEYWORDS.has(last.text);
  }

  /** A line that continues the statement of the line before gets one more level. */
  private isContinuation(anchor: Item): boolean {
    const last = this.lastCode;
    if (!last || last.opens || last.caseColon) return false;
    if (last.text === ';' || last.text === ',') return false;
    if (this.lines[this.lastCodeLine].decorator) return false;
    if (last.text === '}') return last.closesBrace === 'expression';
    return !anchor.startsStatement;
  }

  private append(item: Item): void {
    const line = this.line as Line;
    const previous = this.previous as Item;
    if (item.isLineComment) {
      line.trailing = item.text;
      line.trailingAligned = item.gap >= 2;
      return;
    }
    const space = needsSpace(previous, item) ? ' ' : '';
    line.text += space;
    this.write(item, lastLineWidth(line.text) + line.indent * this.indentWidth);
  }

  /** Appends the token; `column` is where it starts in the output line. */
  private write(item: Item, column: number): void {
    const line = this.line as Line;
    const text =
      item.isComment && item.text.startsWith('/*') ? reindentBlock(item, column) : item.text;
    line.text += text;
  }

  private track(item: Item): void {
    if (item.isComment) return;
    for (let i = 0; i < item.closes; i++) this.stack.pop();
    const frame = this.stack[this.stack.length - 1];
    if (item.caseLabel && frame) frame.caseSeen = true;
    if (item.opens) {
      const indent = (this.line as Line).indent;
      this.stack.push({
        closeIndent: indent,
        contentIndent: indent + 1,
        line: this.lines.length - 1,
        switch: item.braceKind === 'switch',
        caseSeen: false,
      });
    }
  }
}

/** The first code token at or after `items[index]`. */
function nextCode(items: Item[], index: number): Item | undefined {
  for (let i = index; i < items.length; i++) {
    if (!items[i].isComment) return items[i];
  }
  return undefined;
}

function codePointLength(text: string): number {
  return Array.from(text).length;
}

function lastLineWidth(text: string): number {
  const lastBreak = Math.max(text.lastIndexOf('\n'), text.lastIndexOf('\r'));
  return codePointLength(text.slice(lastBreak + 1));
}

/**
 * Moves the continuation lines of a block comment with the comment: JSDoc
 * style lines (` * …`) line up under the first `*`, other lines keep their
 * position relative to the comment start.
 */
function reindentBlock(item: Item, column: number): string {
  const lines = item.text.split(/\r\n|\n|\r/);
  if (lines.length === 1) return item.text;
  const rest = lines.slice(1);
  const starred = rest.every(line => line.trim() === '' || line.trimStart().startsWith('*'));
  const shift = column - (item.column - 1);
  const moved = rest.map(line => {
    if (line.trim() === '') return '';
    if (starred) return ' '.repeat(column + 1) + line.trimStart();
    if (shift >= 0) return ' '.repeat(shift) + line;
    const removable = /^[ \t]*/.exec(line)![0].length;
    return line.slice(Math.min(removable, -shift));
  });
  return [lines[0], ...moved].join('\n');
}

// ---------------------------------------------------------------------------
// Output

function render(layout: { lines: Line[]; indentWidth: number }): string {
  const { lines, indentWidth } = layout;
  const widths = lines.map(line => line.indent * indentWidth + lastLineWidth(line.text));
  const pads = trailingCommentPads(lines, widths);
  const output: string[] = [];
  lines.forEach((line, index) => {
    if (line.blankBefore) output.push('');
    // A line starts with a token, so it has text; a trailing comment follows that text
    let text = ' '.repeat(line.indent * indentWidth) + line.text;
    if (line.trailing !== undefined) text += ' '.repeat(pads[index]) + line.trailing;
    output.push(text);
  });
  return output.length === 0 ? '' : `${output.join('\n')}\n`;
}

/**
 * Spaces before each trailing `//` comment: one, except in a run of
 * consecutive lines with trailing comments that the source aligned, where
 * the comments line up one space after the longest line (like `gofmt`).
 */
function trailingCommentPads(lines: Line[], widths: number[]): number[] {
  const pads = lines.map(() => 1);
  let start = 0;
  while (start < lines.length) {
    let end = start;
    while (end < lines.length && hasTrailingAfterCode(lines[end])) {
      end++;
      if (end < lines.length && lines[end].blankBefore) break;
    }
    if (end - start >= 2 && lines.slice(start, end).some(line => line.trailingAligned)) {
      const column = Math.max(...widths.slice(start, end)) + 1;
      for (let i = start; i < end; i++) pads[i] = column - widths[i];
    }
    start = Math.max(end, start + 1);
  }
  return pads;
}

function hasTrailingAfterCode(line: Line): boolean {
  return line.trailing !== undefined;
}

// ---------------------------------------------------------------------------
// Safety

function programShape(source: string): string {
  const parser = new Parser(new Lexer(source).tokenize());
  const ast = parser.parse();
  if (parser.getErrors().length > 0) throw new Error(parser.getErrors()[0]);
  return JSON.stringify(ast, (key, value) =>
    key === 'line' || key === 'column' ? undefined : (value as unknown)
  );
}

/** Comment texts with the indentation of their continuation lines ignored. */
function commentTexts(source: string): string[] {
  return new Lexer(source, { comments: true })
    .tokenize()
    .filter(token => token.type === TokenType.COMMENT)
    .map(token =>
      token.value
        .split(/\r\n|\n|\r/)
        .map(line => line.trim())
        .join('\n')
    );
}

/**
 * Throws a {@link FormatError} (`unsafe`) unless `formatted` parses to the same
 * program as `original` (positions aside) and keeps all of its comments.
 */
export function checkSameProgram(original: string, formatted: string): void {
  let same: boolean;
  try {
    same =
      programShape(original) === programShape(formatted) &&
      JSON.stringify(commentTexts(original)) === JSON.stringify(commentTexts(formatted));
  } catch (error) {
    throw new FormatError(`formatting would change the program: ${errorMessage(error)}`, 'unsafe', [
      errorMessage(error),
    ]);
  }
  if (!same) {
    throw new FormatError(
      'formatting would change the program or its comments; the file was left as it is',
      'unsafe'
    );
  }
}

/**
 * What the lexer's, the parser's and the code generator's errors are about.
 * Those stages report English sentences of a few stable shapes ("Unexpected
 * token ';' at line 1, column 6 (Expected ')' after arguments)"); this module
 * reads them into a catalog message with its values, finds where a missing
 * bracket was opened, and adds a hint ("Did you mean `агар`?"). The sentences
 * themselves stay what `compile()` returns when no language is asked for.
 */
import { message } from './catalog';
import { closestName, ENGLISH_WORDS, STATEMENT_KEYWORDS } from './suggest';
import type { DiagnosticMessage, DiagnosticParams, DiagnosticPosition } from './types';
import { Lexer } from '../lexer';
import { TokenType, type Token } from '../tokens';

/** A classified error: the catalog message and where it is. */
export interface ClassifiedError {
  message: DiagnosticMessage;
  line?: number;
  column?: number;
  length?: number;
  related?: DiagnosticPosition;
  hint?: DiagnosticMessage;
}

const POSITION = /at line (\d+), column (\d+)/;
const UNEXPECTED_TOKEN =
  /^Unexpected token (end of input|'(.*)') at line (\d+), column (\d+)(?: \(([\s\S]*)\))?$/;

/** Each closing bracket and the opening one it closes. */
const CLOSING: Readonly<Record<string, string>> = { '}': '{', ')': '(', ']': '[', '>': '<' };
const OPENING: ReadonlySet<string> = new Set(['{', '(', '[']);
/** Brackets as tokens; `<` and `>` are also comparisons, so type arguments are not matched. */
const BRACKETS: ReadonlySet<TokenType> = new Set([
  TokenType.LEFT_BRACE,
  TokenType.RIGHT_BRACE,
  TokenType.LEFT_PAREN,
  TokenType.RIGHT_PAREN,
  TokenType.LEFT_BRACKET,
  TokenType.RIGHT_BRACKET,
]);

/** Examples of conditions in parentheses, for `агар х > 0 {`. */
const CONDITION_EXAMPLES: Readonly<Record<string, string>> = {
  агар: 'агар (х > 0) { … }',
  то: 'то (х < 10) { … }',
  барои: 'барои (тағ и = 0; и < 5; и++) { … }',
  интихоб: 'интихоб (х) { … }',
};

/** The line and column an error message names. */
function positionOf(raw: string): Partial<DiagnosticPosition> {
  const match = POSITION.exec(raw);
  return match ? { line: Number(match[1]), column: Number(match[2]) } : {};
}

/** The message with its position left out: the detail of a message kept in English. */
function detailOf(raw: string): string {
  return raw.replace(/ at line \d+(?:, column \d+)?/, '');
}

/** Lexer and parser errors. */
export function classifySyntaxError(raw: string, source: string): ClassifiedError {
  const unexpected = UNEXPECTED_TOKEN.exec(raw);
  if (unexpected) {
    const found = unexpected[1] === 'end of input' ? undefined : unexpected[2];
    const position = { line: Number(unexpected[3]), column: Number(unexpected[4]) };
    const context = new SourceContext(source);
    const result =
      unexpected[5] === undefined
        ? classifyBareToken(found, position, context)
        : classifyExpectation(unexpected[5], found, position, context);
    return context.finish(result, found);
  }
  return classifyLexerError(raw, source) ?? classifyStandalone(raw, source);
}

/** Code generator errors: names declared twice, `шикастан` outside a loop, … */
export function classifyCodegenError(raw: string): ClassifiedError {
  const position = positionOf(raw);
  const of = (id: string, params: DiagnosticParams = {}, hint?: DiagnosticMessage) => ({
    message: message(id, params),
    ...position,
    hint,
  });
  const redeclared = /^Identifier '([^']+)' has already been declared/.exec(raw);
  if (redeclared) {
    const name = redeclared[1];
    return of(
      'CODEGEN_REDECLARED',
      { name },
      name.startsWith('#') ? undefined : message('NO_REDECLARE', { name })
    );
  }
  const reserved =
    /^'([^']+)' is a reserved word in JavaScript and cannot be used as an identifier/.exec(raw);
  if (reserved) return of('CODEGEN_RESERVED_WORD', { name: reserved[1] }, message('RENAME'));
  if (raw.startsWith('Illegal break statement')) return of('CODEGEN_OUTSIDE_LOOP.break');
  if (/^Illegal continue statement.*'давом' must be inside a loop/.test(raw)) {
    return of('CODEGEN_OUTSIDE_LOOP.continue');
  }
  if (
    /'барои интизор' must be inside|'интизор истифода' is only allowed|^Top-level 'интизор'/.test(
      raw
    )
  ) {
    return of('CODEGEN_AWAIT_OUTSIDE_ASYNC');
  }
  const label = /[Ll]abel '([^']+)'|^Illegal continue statement.*: '([^']+)' does not label/.exec(
    raw
  );
  if (label)
    return of('CODEGEN_INVALID_LABEL', { name: label[1] ?? label[2], detail: detailOf(raw) });
  return of('CODEGEN_INVALID', { detail: detailOf(raw) });
}

function classifyLexerError(raw: string, source: string): ClassifiedError | undefined {
  const position = positionOf(raw);
  const of = (id: string, params: DiagnosticParams = {}) => ({
    message: message(id, params),
    ...position,
  });
  if (raw.startsWith('Unterminated string')) {
    // The lexer names the position of the opening quote
    const line = source.split(/\r?\n/)[position.line! - 1];
    const quote = line[position.column! - 1] === "'" ? "'" : '"';
    return of('LEX_UNTERMINATED_STRING', { quote });
  }
  if (raw.startsWith('Unterminated template literal')) return of('LEX_UNTERMINATED_TEMPLATE');
  if (raw.startsWith('Unterminated block comment')) return of('LEX_UNTERMINATED_COMMENT');
  const number = /^Invalid number format at line \d+, column \d+: (.*)$/.exec(raw);
  if (number) return of('LEX_INVALID_NUMBER', { reason: number[1] });
  if (raw.startsWith('Invalid escape sequence')) return of('LEX_INVALID_ESCAPE');
  const character = /^Unexpected character '(.*)' at line/.exec(raw);
  if (character) return of('LEX_UNEXPECTED_CHARACTER', { character: character[1] });
  if (raw.startsWith('Unterminated regular expression')) {
    return of('PARSE_EXPECTED_EXPRESSION', { found: '/' });
  }
  if (/^Invalid regular expression/.test(raw))
    return of('LEX_INVALID_REGEXP', { detail: detailOf(raw) });
  return undefined;
}

/** Parser errors that are not about an unexpected token, by what they say. */
const STANDALONE: ReadonlyArray<{ test: RegExp; id: string; modifier?: boolean }> = [
  { test: /^Invalid shorthand property initializer/, id: 'PARSE_SHORTHAND_INITIALIZER' },
  { test: /^Multiple default cases in switch/, id: 'PARSE_DUPLICATE_DEFAULT_CASE' },
  { test: /^Nesting too deep/, id: 'PARSE_TOO_DEEP' },
  {
    test: /^'([^']+)' modifier|^'(танҳохонӣ)' can only be used/,
    id: 'PARSE_INVALID_MODIFIER',
    modifier: true,
  },
  {
    test: /accessor|^Getter |^Setter |private field named|^An accessibility modifier|parameter property|^A decorator can only/,
    id: 'PARSE_INVALID_CLASS_MEMBER',
  },
  {
    test: /conditional type|type modifier|tuple element|^Tuple members|type parameter|^Catch clause variable type|index signature/,
    id: 'PARSE_INVALID_TYPE',
  },
  { test: /import|export|local name/i, id: 'PARSE_INVALID_IMPORT_EXPORT' },
  {
    test: /ambient contexts|binding patterns|^Function implementation is missing|^A declaration cannot be labeled|in enums|property name|^Decorators are not valid/,
    id: 'PARSE_INVALID_DECLARATION',
  },
];

function classifyStandalone(raw: string, source: string): ClassifiedError {
  const position = positionOf(raw);
  // `Expected '}' after class body at line …`: as the same message after an unexpected token
  const expected = /^(Expected [\s\S]*?) at line \d+(?:, column \d+)?$/.exec(raw);
  if (expected && position.line !== undefined) {
    const context = new SourceContext(source);
    const found = context.tokenAt(position as DiagnosticPosition)?.value;
    return context.finish(
      classifyExpectation(expected[1], found, position as DiagnosticPosition, context),
      found
    );
  }
  const switchToken = /^Unexpected token '(.*)' in switch/.exec(raw);
  if (switchToken)
    return { message: message('PARSE_UNEXPECTED_TOKEN', { found: switchToken[1] }), ...position };
  const rule = STANDALONE.find(candidate => candidate.test.test(raw));
  if (rule?.modifier) {
    const match = rule.test.exec(raw)!;
    const modifier = match[1] ?? match[2];
    return { message: message(rule.id, { modifier, detail: detailOf(raw) }), ...position };
  }
  return {
    message: message(rule?.id ?? 'PARSE_INVALID_SYNTAX', { detail: detailOf(raw) }),
    ...position,
  };
}

/** `Unexpected token X at …` with nothing expected: a stray closing bracket, or a missing operand. */
function classifyBareToken(
  found: string | undefined,
  position: DiagnosticPosition,
  context: SourceContext
): ClassifiedError {
  if (
    found !== undefined &&
    found !== '>' &&
    found in CLOSING &&
    !context.openerFor(found, position, true)
  ) {
    return { message: message('PARSE_UNMATCHED_CLOSE', { close: found }), ...position };
  }
  return { message: message('PARSE_EXPECTED_EXPRESSION', { found }), ...position };
}

/** Names the parser expects, by the words of its message. */
const EXPECTED_NAMES: ReadonlyArray<[RegExp, string]> = [
  [/^variable name/, 'variable'],
  [/^property name/, 'property'],
  [/^enum member name/, 'enumMember'],
  [/^namespace name/, 'namespace'],
  [/^(a )?module path/, 'module'],
  [/^superclass name/, 'class'],
  [/^decorator name/, 'decorator'],
  [/^type( name)?$|^type name /, 'type'],
  [/^a declaration/, 'declaration'],
  [/^identifier/, 'identifier'],
];

/** `Expected …` messages: what the parser expected where it found `found`. */
function classifyExpectation(
  inner: string,
  found: string | undefined,
  position: DiagnosticPosition,
  context: SourceContext
): ClassifiedError {
  const token = /^Expected '([^']+)'(?: or '([^']+)')?(?: (?:after|before|in|to) ([\s\S]*))?$/.exec(
    inner
  );
  if (token) {
    const expectation = { expected: token[1], alternative: token[2], context: token[3] ?? '' };
    return classifyExpectedToken(expectation, found, position, context);
  }
  const name = /^Expected ([\s\S]*)$/.exec(inner);
  const what = name ? EXPECTED_NAMES.find(([pattern]) => pattern.test(name[1]))?.[1] : undefined;
  if (what) return { message: message('PARSE_EXPECTED_NAME', { what, found }), ...position };
  const id = /index signature/.test(inner) ? 'PARSE_INVALID_TYPE' : 'PARSE_INVALID_SYNTAX';
  return { message: message(id, { detail: inner }), ...position };
}

/** `Expected 'X' or 'Y' after CONTEXT`, read. */
interface Expectation {
  expected: string;
  alternative?: string;
  /** What the parser was reading: `block`, `'агар'`, … ('' when it did not say). */
  context: string;
}

function classifyExpectedToken(
  { expected, alternative, context: contextText }: Expectation,
  found: string | undefined,
  position: DiagnosticPosition,
  context: SourceContext
): ClassifiedError {
  const at = { ...position };
  if (alternative === undefined && expected in CLOSING) {
    const opener = context.openerFor(expected, position, false);
    const result: ClassifiedError = {
      message: message('PARSE_MISSING_CLOSE', {
        close: expected,
        open: CLOSING[expected],
        found,
        openLine: opener?.line,
      }),
      ...at,
      related: opener,
    };
    if (expected === ')' && found === ';' && context.closesLaterOnLine(position, ')')) {
      result.hint = message('ARGUMENT_COMMA');
    }
    return result;
  }
  const keyword = /^'([^']+)'/.exec(contextText)?.[1];
  if (expected === '(' && keyword !== undefined && keyword in CONDITION_EXAMPLES) {
    return {
      message: message('PARSE_CONDITION_PARENS', { keyword, example: CONDITION_EXAMPLES[keyword] }),
      ...at,
    };
  }
  if (alternative === undefined && OPENING.has(expected)) {
    return { message: message('PARSE_EXPECTED_OPEN', { open: expected, after: keyword }), ...at };
  }
  if (alternative === undefined && expected === ';') {
    const hint = context.insideForHead(position) ? message('FOR_SEMICOLONS') : undefined;
    return { message: message('PARSE_EXPECTED_SEMICOLON', { found }), ...at, hint };
  }
  const expectedTokens = alternative === undefined ? expected : [expected, alternative];
  return { message: message('PARSE_EXPECTED_TOKEN', { expected: expectedTokens, found }), ...at };
}

/** The tokens of the source (as far as the lexer reads it) and questions about them. */
class SourceContext {
  private readonly tokens: Token[];
  private readonly lines: string[];

  constructor(private readonly source: string) {
    this.lines = source.split(/\r?\n/);
    try {
      this.tokens = new Lexer(source).tokenize();
    } catch {
      // The parser ran, so the lexer did too; a source given separately may not lex
      this.tokens = [];
    }
  }

  tokenAt(position: DiagnosticPosition): Token | undefined {
    return this.tokens.find(
      token =>
        token.line === position.line &&
        token.column === position.column &&
        token.type !== TokenType.EOF
    );
  }

  /**
   * The innermost bracket before `position` (or at it, with `including`) that
   * `close` would close and nothing closed yet.
   */
  openerFor(close: string, position: DiagnosticPosition, including: boolean): Token | undefined {
    const open = CLOSING[close];
    const stack: Token[] = [];
    for (const token of this.tokens) {
      const after =
        token.line > position.line ||
        (token.line === position.line && token.column > position.column);
      const at = token.line === position.line && token.column === position.column;
      if (after || (at && !including)) break;
      if (!BRACKETS.has(token.type)) continue;
      if (OPENING.has(token.value)) {
        stack.push(token);
      } else if (stack.length > 0 && stack[stack.length - 1].value === CLOSING[token.value]) {
        if (at) return stack[stack.length - 1];
        stack.pop();
      }
    }
    for (let index = stack.length - 1; index >= 0; index--) {
      if (stack[index].value === open) return stack[index];
    }
    return undefined;
  }

  /** Whether a `close` comes later on the line of `position`: `чоп(1; 2)`. */
  closesLaterOnLine(position: DiagnosticPosition, close: string): boolean {
    return this.tokens.some(
      token =>
        token.line === position.line && token.column > position.column && token.value === close
    );
  }

  /** Whether `position` is inside the parentheses of a `барои (…)`. */
  insideForHead(position: DiagnosticPosition): boolean {
    const opener = this.openerFor(')', position, false);
    if (!opener) return false;
    const index = this.tokens.indexOf(opener);
    return this.tokens[index - 1]?.type === TokenType.БАРОИ;
  }

  /**
   * Completes a classification: a position at the end of the program moves
   * to the end of its last line, the caret covers the token found, and a
   * misspelt keyword or an English one gets a hint.
   */
  finish(result: ClassifiedError, found: string | undefined): ClassifiedError {
    if (found === undefined && result.line !== undefined)
      Object.assign(result, this.endOfProgram());
    else if (found !== undefined) result.length = [...found].length;
    if (
      result.message.params.openLine !== undefined ||
      result.message.id === 'PARSE_MISSING_CLOSE'
    ) {
      result.message = message(result.message.id, { ...result.message.params, line: result.line });
    }
    if (!result.hint && result.line !== undefined) {
      result.hint = this.keywordHint(result.line, result.column!);
    }
    return result;
  }

  /** Just after the last character that is not white space. */
  private endOfProgram(): DiagnosticPosition {
    for (let index = this.lines.length - 1; index >= 0; index--) {
      const trimmed = this.lines[index].trimEnd();
      if (trimmed !== '') return { line: index + 1, column: trimmed.length + 1 };
    }
    return { line: 1, column: 1 };
  }

  /**
   * A word on the line of the error, before it, that is no keyword but close
   * to one (`агр` → `агар`) or an English keyword (`if` → `агар`), unless the
   * program declares that name.
   */
  private keywordHint(line: number, column: number): DiagnosticMessage | undefined {
    const words = this.tokens.filter(
      token =>
        token.type === TokenType.IDENTIFIER &&
        token.line === line &&
        token.column < column &&
        !this.isDeclared(token.value)
    );
    for (const word of words) {
      const tajik = ENGLISH_WORDS.get(word.value);
      if (tajik) return message('ENGLISH_KEYWORD', { english: word.value, tajik });
      const keyword = closestName(word.value, STATEMENT_KEYWORDS);
      if (keyword) return message('DID_YOU_MEAN', { name: keyword });
    }
    return undefined;
  }

  /** Whether the program declares `name` (`тағ ном`, `функсия ном`, a parameter, …). */
  private isDeclared(name: string): boolean {
    return this.tokens.some((token, index) => {
      if (token.value !== name || index === 0) return false;
      const before = this.tokens[index - 1];
      return (
        [TokenType.ТАҒЙИРЁБАНДА, TokenType.СОБИТ, TokenType.ФУНКСИЯ, TokenType.СИНФ].includes(
          before.type
        ) ||
        before.value === '(' ||
        before.value === ','
      );
    });
  }
}

/**
 * The language server over every SomonScript program of the repository
 * (tests/helpers/corpus.ts): the analysis agrees with the compiler about
 * errors, and every feature answers at every name without failing, with
 * ranges inside the document and names where the source has them.
 */
import { compile } from '../src/compiler';
import { analyzeDocument, type Analysis } from '../src/lsp/analysis';
import { completion } from '../src/lsp/completion';
import { definition } from '../src/lsp/definition';
import { documentSymbols } from '../src/lsp/document-symbols';
import { hover } from '../src/lsp/hover';
import { messagesFor } from '../src/lsp/messages';
import {
  DiagnosticSeverity,
  type DocumentSymbol,
  type Position,
  type Range,
} from '../src/lsp/protocol';
import { SEMANTIC_TOKEN_TYPES, semanticTokens } from '../src/lsp/semantic-tokens';
import type { Declaration } from '../src/lsp/symbols';
import { TextDocument } from '../src/lsp/text-document';
import { isWordToken } from '../src/lsp/tokens';
import {
  docPrograms,
  examplePrograms,
  operatorPrograms,
  tsSyntaxPrograms,
  type CorpusProgram,
} from './helpers/corpus';

const messages = messagesFor('en');

const notAfter = (a: Position, b: Position) =>
  a.line < b.line || (a.line === b.line && a.character <= b.character);

/** Problems found in one program, as readable strings. */
type Problems = string[];

function checkRange(document: TextDocument, range: Range, what: string, problems: Problems): void {
  const end = document.positionAt(document.text.length);
  const inside =
    notAfter({ line: 0, character: 0 }, range.start) &&
    notAfter(range.start, range.end) &&
    notAfter(range.end, end);
  if (!inside) problems.push(`${what}: range ${JSON.stringify(range)} is not in the document`);
}

/** Every declaration and member of the index, recursively. */
function allDeclarations(declarations: Declaration[]): Declaration[] {
  return declarations.flatMap(declaration => [
    declaration,
    ...allDeclarations(declaration.children),
  ]);
}

function checkSymbols(analysis: Analysis, problems: Problems): void {
  const { text } = analysis.document;
  const { all, topLevel } = analysis.symbols;
  for (const declaration of allDeclarations([...all, ...topLevel])) {
    const { name, start, nameStart, nameEnd, end } = declaration;
    if (!(start <= nameStart && nameStart < nameEnd && nameEnd <= end && end <= text.length)) {
      problems.push(`${name}: extent ${start}-${end}, name ${nameStart}-${nameEnd}`);
    }
    // The name's range holds the name as written (`constructor` is shown as `конструктор`)
    const written = text.slice(nameStart, nameEnd);
    if (![name, `#${name}`, 'constructor'].includes(written)) {
      problems.push(`${name}: the name's range holds '${written}'`);
    }
  }
  const visit = (symbol: DocumentSymbol): void => {
    checkRange(analysis.document, symbol.range, `symbol ${symbol.name}`, problems);
    if (
      !notAfter(symbol.range.start, symbol.selectionRange.start) ||
      !notAfter(symbol.selectionRange.end, symbol.range.end)
    ) {
      problems.push(`symbol ${symbol.name}: the name is outside the symbol's range`);
    }
    symbol.children?.forEach(visit);
  };
  documentSymbols(analysis).forEach(visit);
}

function checkSemanticTokens(analysis: Analysis, problems: Problems): void {
  const { data } = semanticTokens(analysis);
  let line = 0;
  let character = 0;
  for (let i = 0; i < data.length; i += 5) {
    const [deltaLine, deltaStart, length, type] = data.slice(i, i + 5);
    const ordered = deltaLine > 0 || i === 0 || deltaStart > 0;
    line += deltaLine;
    character = deltaLine === 0 ? character + deltaStart : deltaStart;
    const fits = character + length <= analysis.document.lineText(line).length;
    if (!ordered || length <= 0 || type >= SEMANTIC_TOKEN_TYPES.length || !fits) {
      problems.push(`semantic token ${data.slice(i, i + 5)} at ${line}:${character}`);
    }
  }
}

/** Hover, definition and completion at the start and the end of every name. */
function checkNames(analysis: Analysis, problems: Problems): void {
  const { document } = analysis;
  for (const token of analysis.tokens) {
    if (!isWordToken(token)) continue;
    for (const offset of [token.start, token.end]) {
      const shown = hover(analysis, offset, messages);
      if (shown) checkRange(document, shown.range!, `hover on ${token.value}`, problems);
      for (const location of definition(analysis, document.uri, offset, () => undefined)) {
        checkRange(document, location.range, `definition of ${token.value}`, problems);
      }
    }
    const labels = completion(analysis, token.end, messages).map(
      item => `${item.label}|${item.sortText}`
    );
    if (new Set(labels).size !== labels.length) {
      problems.push(`completion after ${token.value} offers an item twice`);
    }
  }
}

function check(program: CorpusProgram): Problems {
  const problems: Problems = [];
  const document = new TextDocument('file:///corpus/program.som', program.source, 1);
  const options = { experimentalDecorators: program.experimentalDecorators };
  const analysis = analyzeDocument(document, { compilerOptions: options });
  for (const diagnostic of analysis.diagnostics) {
    checkRange(document, diagnostic.range, diagnostic.message, problems);
  }
  // The same errors as the compiler (without lowering, which the server does not do)
  const errors = analysis.diagnostics.filter(d => d.severity === DiagnosticSeverity.Error);
  const compiled = compile(program.source, { ...options, target: 'esnext' });
  if (errors.length !== compiled.errors.length) {
    problems.push(`${errors.length} errors; the compiler finds ${compiled.errors.length}`);
  }
  checkSymbols(analysis, problems);
  checkSemanticTokens(analysis, problems);
  checkNames(analysis, problems);
  return problems.map(problem => `${program.name}: ${problem}`);
}

describe('the language server over the corpus', () => {
  test.each([
    ['examples', examplePrograms],
    ['operators', operatorPrograms],
    ['documentation snippets', docPrograms],
    ['TypeScript syntax tests', tsSyntaxPrograms],
  ] as const)('%s', (_name, programs) => {
    const corpus = programs();
    expect(corpus.length).toBeGreaterThan(20);
    expect(corpus.flatMap(check)).toEqual([]);
  });
});

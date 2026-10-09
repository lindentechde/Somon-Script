/**
 * Analysis of one document: tokens, syntax tree, declarations, the types the
 * type checker inferred for names, and diagnostics with editor ranges.
 */

import type { Program } from '../ast';
import { CodeGenerator } from '../codegen';
import type { CompilerOptions } from '../config';
import { Parser } from '../parser';
import { TypeChecker, type Type, type TypeCheckError } from '../type-checker';
import { resolveChecker, type CheckerDiagnostic, type LanguageServerHooks } from './hooks';
import type { Locale } from './messages';
import { DiagnosticSeverity, type Diagnostic, type Range } from './protocol';
import { buildSymbolIndex, resolveName, type SymbolIndex } from './symbols';
import { wordRangeAt, type TextDocument } from './text-document';
import { tokenIndexCovering, tokenizeDocument, type LocatedToken } from './tokens';

/** `compilerOptions` of somon.config.json, including options this version does not know. */
export type DocumentCompilerOptions = CompilerOptions & Record<string, unknown>;

export interface AnalysisOptions {
  compilerOptions?: DocumentCompilerOptions;
  /** Problem with the configuration file, reported on the first line. */
  configError?: string;
  locale?: Locale;
  hooks?: LanguageServerHooks;
  /** File system path of the document, when it has one. */
  fileName?: string;
}

export interface Analysis {
  document: TextDocument;
  tokens: LocatedToken[];
  program?: Program;
  symbols: SymbolIndex;
  /** Types of names (declarations and references), by the offset where the name starts. */
  types: Map<number, Type>;
  typeToString: (_type: Type) => string;
  diagnostics: Diagnostic[];
}

/** Analyses of the modules a document imports, by specifier (`"./м"`). */
export type ModuleLookup = (_specifier: string) => Analysis | undefined;

/** The type of the name `name` read at `offset`, else of its declaration. */
export function nameType(analysis: Analysis, name: string, offset: number): Type | undefined {
  const type = analysis.types.get(offset);
  if (type) return type;
  const declaration = resolveName(analysis.symbols, name, offset);
  return declaration && analysis.types.get(declaration.nameStart);
}

const SOURCE = 'somon';

/** Where compiler messages give positions: `at line 3, column 5`, `(3,5)`, `:3:5`. */
const POSITION_PATTERNS: readonly RegExp[] = [
  /\s*\bat line (\d+), column (\d+)/,
  /\bline (\d+), column (\d+)/,
  /\((\d+),\s*(\d+)\)/,
  /:(\d+):(\d+)\b/,
];

export function analyzeDocument(document: TextDocument, options: AnalysisOptions = {}): Analysis {
  const diagnostics: Diagnostic[] = [];
  if (options.configError) {
    diagnostics.push(diagnostic(lineRange(document, 0), options.configError));
  }
  const types = new Map<number, Type>();
  const checker = new TypeChecker(document.text, {
    strict: Boolean(options.compilerOptions?.strict),
    onIdentifierType: (identifier, type) =>
      types.set(document.offsetFromCompiler(identifier.line, identifier.column), type),
  });
  const { tokens, raw, error } = tokenizeDocument(document);
  const analysis: Analysis = {
    document,
    tokens,
    symbols: {
      topLevel: [],
      all: [],
      root: { start: 0, end: document.text.length, declarations: [], children: [] },
    },
    types,
    typeToString: type => checker.typeToString(type),
    diagnostics,
  };
  if (error) {
    diagnostics.push(messageDiagnostic(document, tokens, error.message));
    return analysis;
  }

  const parser = new Parser(raw);
  const program = parser.parse();
  const parseErrors = parser.getErrors();
  for (const message of parseErrors) diagnostics.push(messageDiagnostic(document, tokens, message));
  analysis.program = program;
  analysis.symbols = buildSymbolIndex(document, tokens, program);
  // Types for hover and completion even when part of the program did not parse
  const checked = safely(() => checker.check(program));
  if (parseErrors.length > 0) return analysis;

  if (options.compilerOptions?.noTypeCheck !== true) {
    const checkerName = options.compilerOptions?.checker;
    if (typeof checkerName === 'string' && checkerName !== 'somon') {
      diagnostics.push(...externalTypeDiagnostics(document, tokens, checkerName, options));
      return analysis;
    }
    for (const problem of [...(checked?.errors ?? []), ...(checked?.warnings ?? [])]) {
      diagnostics.push(typeDiagnostic(document, tokens, problem));
    }
  }
  diagnostics.push(...codegenDiagnostics(document, tokens, program, options));
  return analysis;
}

function safely<T>(run: () => T): T | undefined {
  try {
    return run();
  } catch {
    return undefined;
  }
}

/** Errors the code generator reports (unknown labels, misplaced decorators, …). */
function codegenDiagnostics(
  document: TextDocument,
  tokens: LocatedToken[],
  program: Program,
  options: AnalysisOptions
): Diagnostic[] {
  const generator = new CodeGenerator({
    experimentalDecorators: Boolean(options.compilerOptions?.experimentalDecorators),
  });
  safely(() => generator.generate(program));
  return generator.getErrors().map(message => messageDiagnostic(document, tokens, message));
}

/** Type diagnostics from the checker `compilerOptions.checker` names. */
function externalTypeDiagnostics(
  document: TextDocument,
  tokens: LocatedToken[],
  checkerName: string,
  options: AnalysisOptions
): Diagnostic[] {
  const checker = resolveChecker(checkerName, options.hooks);
  if (checker) {
    const found =
      safely(() =>
        checker(document.text, {
          fileName: options.fileName,
          compilerOptions: options.compilerOptions ?? {},
          locale: options.locale ?? 'en',
        })
      ) ?? [];
    return found.map(problem => checkerDiagnostic(document, tokens, problem));
  }
  // Without an injected checker, the compiler runs the one the option names
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { compile } = require('../compiler') as typeof import('../compiler');
  const compiled = compile(document.text, {
    ...options.compilerOptions,
    typeCheck: true,
    locale: options.locale,
    sourceFileName: options.fileName,
  } as Parameters<typeof compile>[1]);
  return [
    ...compiled.errors.map(message => messageDiagnostic(document, tokens, message)),
    ...compiled.warnings.map(message =>
      messageDiagnostic(document, tokens, message, DiagnosticSeverity.Warning)
    ),
  ];
}

function checkerDiagnostic(
  document: TextDocument,
  tokens: LocatedToken[],
  problem: CheckerDiagnostic | TypeCheckError
): Diagnostic {
  const offset = document.offsetFromCompiler(problem.line, problem.column);
  return diagnostic(
    rangeAt(document, tokens, offset),
    problem.message,
    problem.severity === 'warning' ? DiagnosticSeverity.Warning : DiagnosticSeverity.Error,
    problem.code
  );
}

const typeDiagnostic = checkerDiagnostic;

/**
 * A diagnostic for a compiler message, placed at the position the message
 * gives (which is removed from its text), else on the first line.
 */
export function messageDiagnostic(
  document: TextDocument,
  tokens: LocatedToken[],
  message: string,
  severity = DiagnosticSeverity.Error
): Diagnostic {
  const position = findPosition(message);
  if (!position) return diagnostic(lineRange(document, 0), message.trim(), severity);
  const offset = document.offsetFromCompiler(position.line, position.column);
  const text = message
    .replace(position.text, '')
    .replace(/^Parse error: /, '')
    .trim();
  return diagnostic(rangeAt(document, tokens, offset), text, severity);
}

function findPosition(message: string): { line: number; column: number; text: string } | undefined {
  for (const pattern of POSITION_PATTERNS) {
    const match = pattern.exec(message);
    if (match) return { line: Number(match[1]), column: Number(match[2]), text: match[0] };
  }
  return undefined;
}

/** What a diagnostic at `offset` underlines: the token or word there, else one character. */
export function rangeAt(document: TextDocument, tokens: LocatedToken[], offset: number): Range {
  const index = tokenIndexCovering(tokens, offset);
  const token = index === -1 ? undefined : tokens[index];
  if (token && token.start === offset && token.end > token.start) {
    return document.rangeFromOffsets(token.start, token.end);
  }
  const word = wordRangeAt(document.text, offset);
  if (word && word[0] === offset) return document.rangeFromOffsets(word[0], word[1]);
  const text = document.text;
  const end = offset >= text.length || /[\r\n]/.test(text[offset]) ? offset : offset + 1;
  return document.rangeFromOffsets(offset, end);
}

function lineRange(document: TextDocument, line: number): Range {
  return {
    start: { line, character: 0 },
    end: { line, character: document.lineText(line).length },
  };
}

function diagnostic(
  range: Range,
  message: string,
  severity = DiagnosticSeverity.Error,
  code?: string
): Diagnostic {
  return { range, severity, source: SOURCE, message, ...(code && { code }) };
}

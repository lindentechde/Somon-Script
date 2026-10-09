/**
 * Type checking with the TypeScript compiler (`checker: 'typescript'`).
 *
 * The program is emitted as TypeScript (src/ts-emitter.ts) and checked by
 * `ts.createProgram` over an in-memory compiler host: the checked `.som`
 * files, every `.som` module they import (emitted on demand and cached), real
 * `.d.ts`/`.ts` files and `@types` from node_modules, and TypeScript's lib
 * files for the target. Diagnostics are mapped back to `.som` lines and
 * columns and reported with Tajik type names (`number` → `рақам`), in
 * English, Russian (TypeScript's own translation) or Tajik.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import ts from 'typescript';

import { MEMBER_ALIASES, translateMemberName } from './builtin-names';
import { Lexer } from './lexer';
import { Parser } from './parser';
import {
  DEFAULT_TARGET,
  defaultLib,
  defaultUseDefineForClassFields,
  isTarget,
  normalizeLib,
  scriptTargetFor,
  targetAtLeast,
  typeScriptLibNames,
  type Target,
} from './targets';
import { originalPosition, TsEmitter, type TsEmitResult } from './ts-emitter';
import type { TypeCheckError } from './type-checker';
import type { Program } from './types';
import { TAJIK_DIAGNOSTIC_MESSAGES } from './tsc-messages-tj';

/** Languages of diagnostics. */
export type DiagnosticLocale = 'en' | 'ru' | 'tj';

export interface TsCheckOptions {
  /** TypeScript's strict mode (`strict: true`); otherwise TypeScript's non-strict defaults. */
  strict?: boolean;
  /** Script target (`es5` … `es2024`, `esnext`); default `es2022`. */
  target?: Target;
  /**
   * TypeScript lib names (`es2022`, `dom`, …); default: the target's
   * (`defaultLib`) and, from es2015, `esnext.disposable` (see `libFiles`).
   */
  lib?: string[];
  /** Language of the messages; default English. */
  locale?: DiagnosticLocale;
  /** Class fields use define semantics; default: TypeScript's default for the target. */
  useDefineForClassFields?: boolean;
  /** TypeScript's legacy decorators, as the compiler lowers them. */
  experimentalDecorators?: boolean;
  /** Also produce `.d.ts` text for each checked file. */
  declaration?: boolean;
  /** Report type errors; false only produces declarations. Default true. */
  typeCheck?: boolean;
}

/** A `.som` file to check: its path (imports resolve from its directory), text and AST. */
export interface TsCheckInput {
  fileName: string;
  source: string;
  ast?: Program;
}

export interface TsCheckFileResult {
  fileName: string;
  errors: TypeCheckError[];
  /** `.d.ts` text when `declaration` is set. */
  declaration?: string;
}

/** A path as TypeScript spells it, with '/' separators (also on Windows). */
function toTsPath(file: string): string {
  return file.split(path.sep).join('/');
}

/** Name TypeScript knows a `.som` file by: the file name plus `.ts`. */
function virtualName(somFile: string): string {
  return `${toTsPath(somFile)}.ts`;
}

/**
 * The declaration file of a `.som` file's ambient modules (`эълон модул "м"`):
 * a script, where they declare modules (in a module they would augment them).
 */
const AMBIENT_SUFFIX = '.ambient.d.ts';

function ambientName(somFile: string): string {
  return `${toTsPath(somFile)}${AMBIENT_SUFFIX}`;
}

function isAmbient(fileName: string): boolean {
  return fileName.endsWith(`.som${AMBIENT_SUFFIX}`);
}

function isVirtual(fileName: string): boolean {
  return fileName.endsWith('.som.ts') || isAmbient(fileName);
}

function somFileOf(fileName: string): string {
  return fileName.slice(0, -(isAmbient(fileName) ? AMBIENT_SUFFIX : '.ts').length);
}

// ---------------------------------------------------------------------------
// Targets and libs
// ---------------------------------------------------------------------------

const TS_LIB_DIR = toTsPath(path.dirname(require.resolve('typescript/lib/lib.d.ts')));

/** `es2022` → `lib.es2022.d.ts`, as tsconfig's `lib` names map to lib files. */
function libFileName(name: string): string {
  const lower = name.toLowerCase();
  if (/^lib\..*\.d\.ts$/.test(lower)) return lower;
  const libMap = (ts as unknown as { libMap?: Map<string, string> }).libMap;
  return libMap?.get(lower) ?? `lib.${lower}.d.ts`;
}

/**
 * Lib files: the given names, or the target's (see `defaultLib`). From es2015
 * (which has symbols) that includes `esnext.disposable`, whose
 * `Symbol.dispose` `истифода` needs: `истифода` is lowered for every target.
 */
export function libFiles(target: Target | undefined, lib: string[] | undefined): string[] {
  if (lib && lib.length > 0) return normalizeLib(lib).map(libFileName);
  const resolved = isTarget(target) ? target : DEFAULT_TARGET;
  const names = defaultLib(resolved);
  const disposable = 'esnext.disposable';
  if (
    targetAtLeast(resolved, 'es2015') &&
    !names.includes('esnext') &&
    typeScriptLibNames().includes(disposable)
  ) {
    names.push(disposable);
  }
  return names.map(libFileName);
}

function compilerOptions(options: TsCheckOptions): ts.CompilerOptions {
  const target = isTarget(options.target) ? options.target : DEFAULT_TARGET;
  return {
    target: scriptTargetFor(target),
    lib: libFiles(target, options.lib),
    // ES modules, and also `import х = require()` / `export =` (`ворид х = require`,
    // `содир =`), as the output has them
    module: ts.ModuleKind.Preserve,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    // Every `.som` file is a module, even without imports or exports
    moduleDetection: ts.ModuleDetectionKind.Force,
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    resolveJsonModule: true,
    allowJs: true,
    checkJs: false,
    // Libraries' typings are not checked; the ambient modules of `.som` files are
    skipLibCheck: false,
    skipDefaultLibCheck: true,
    useDefineForClassFields:
      options.useDefineForClassFields ?? defaultUseDefineForClassFields(target),
    experimentalDecorators: Boolean(options.experimentalDecorators),
    strict: Boolean(options.strict),
    noEmit: !options.declaration,
    declaration: Boolean(options.declaration),
    emitDeclarationOnly: Boolean(options.declaration),
    newLine: ts.NewLineKind.LineFeed,
  };
}

// ---------------------------------------------------------------------------
// Caches shared by every check in the process
// ---------------------------------------------------------------------------

/** Parsed (and, once used, bound) lib and node_modules files, reused across programs. */
const sourceFileCache = new Map<string, { version: string; file: ts.SourceFile }>();
/** TypeScript emitted for `.som` files read from disk, by path. */
const emitCache = new Map<string, { source: string; result: TsEmitResult }>();
const resolutionCaches = new Map<string, ts.ModuleResolutionCache>();

/** Drop every cached file (tests, watch mode). */
export function clearTypeScriptCaches(): void {
  sourceFileCache.clear();
  emitCache.clear();
  resolutionCaches.clear();
}

/** Number of cached source files; for tests of the cache. */
export function cachedSourceFileCount(): number {
  return sourceFileCache.size;
}

function fileVersion(fileName: string): string | undefined {
  if (fileName.startsWith(TS_LIB_DIR)) return 'lib';
  try {
    // The files the checked program uses: its imports, typings and libs (S8707)
    const stat = fs.statSync(fileName); // NOSONAR
    return `${stat.mtimeMs}:${stat.size}`;
  } catch {
    return undefined;
  }
}

function emitSom(fileName: string, source: string, ast?: Program): TsEmitResult {
  const cached = emitCache.get(fileName);
  if (!ast && cached && cached.source === source) return cached.result;
  let program = ast;
  if (!program) {
    try {
      program = new Parser(new Lexer(source).tokenize()).parse();
    } catch {
      program = { type: 'Program', body: [], line: 1, column: 1 };
    }
  }
  const result = withAmbientReference(new TsEmitter().emit(program), fileName);
  emitCache.set(fileName, { source, result });
  return result;
}

/**
 * A module with ambient modules references their declaration file, so they
 * are declared whenever the module is part of the program. The directive
 * goes first (after a shebang, which has no mapping); the mappings move down
 * a line.
 */
function withAmbientReference(result: TsEmitResult, somFile: string): TsEmitResult {
  if (!result.ambient) return result;
  const directive = `/// <reference path="./${path.basename(somFile)}${AMBIENT_SUFFIX}" />`;
  const lines = result.code.split('\n');
  lines.splice(lines[0].startsWith('#!') ? 1 : 0, 0, directive);
  return {
    ...result,
    code: lines.join('\n'),
    mappings: result.mappings.map(mapping => ({
      ...mapping,
      generated: { ...mapping.generated, line: mapping.generated.line + 1 },
    })),
  };
}

// ---------------------------------------------------------------------------
// Compiler host
// ---------------------------------------------------------------------------

interface VirtualFile {
  source: string;
  emitted: TsEmitResult;
}

function createHost(
  options: ts.CompilerOptions,
  currentDirectory: string,
  virtualFiles: Map<string, VirtualFile>,
  outputs: Map<string, string>
): ts.CompilerHost {
  const optionsKey = JSON.stringify([options.target, options.module, options.moduleResolution]);
  let resolutionCache = resolutionCaches.get(optionsKey);
  if (!resolutionCache) {
    resolutionCache = ts.createModuleResolutionCache(currentDirectory, name => name, options);
    resolutionCaches.set(optionsKey, resolutionCache);
  }

  /** The `.som` file behind a virtual name, emitted (and remembered) on first use. */
  const virtualFile = (fileName: string): VirtualFile | undefined => {
    const known = virtualFiles.get(fileName);
    if (known) return known;
    const somFile = somFileOf(fileName);
    let source: string;
    try {
      // A `.som` module the checked program imports (S8707)
      source = fs.readFileSync(somFile, 'utf8'); // NOSONAR
    } catch {
      return undefined;
    }
    const file = { source, emitted: emitSom(somFile, source) };
    virtualFiles.set(fileName, file);
    return file;
  };

  /** TypeScript of a virtual file: a `.som` module or its ambient modules. */
  const virtualCode = (fileName: string): string | undefined => {
    if (!isAmbient(fileName)) return virtualFile(fileName)?.emitted.code;
    return virtualFile(virtualName(somFileOf(fileName)))?.emitted.ambient?.code;
  };

  const fileExists = (fileName: string): boolean =>
    isVirtual(fileName) ? virtualCode(fileName) !== undefined : ts.sys.fileExists(fileName);

  const host: ts.CompilerHost = {
    getSourceFile(fileName, languageVersionOrOptions) {
      if (isVirtual(fileName)) {
        const code = virtualCode(fileName);
        return code === undefined
          ? undefined
          : ts.createSourceFile(fileName, code, languageVersionOrOptions, true);
      }
      const version = fileVersion(fileName);
      if (version === undefined) return undefined;
      const key = `${fileName}|${JSON.stringify(languageVersionOrOptions)}`;
      const cached = sourceFileCache.get(key);
      if (cached && cached.version === version) return cached.file;
      const text = ts.sys.readFile(fileName);
      if (text === undefined) return undefined;
      const file = ts.createSourceFile(fileName, text, languageVersionOrOptions, false);
      sourceFileCache.set(key, { version, file });
      return file;
    },
    getDefaultLibFileName: options => ts.getDefaultLibFilePath(options),
    getDefaultLibLocation: () => TS_LIB_DIR,
    writeFile: (fileName, text) => {
      outputs.set(fileName, text);
    },
    getCurrentDirectory: () => currentDirectory,
    getDirectories: directory => ts.sys.getDirectories(directory),
    directoryExists: directory => ts.sys.directoryExists(directory),
    getCanonicalFileName: fileName => fileName,
    useCaseSensitiveFileNames: () => ts.sys.useCaseSensitiveFileNames,
    // Required by the interface; TypeScript 5 takes the line break from `compilerOptions.newLine`
    getNewLine: /* istanbul ignore next */ () => '\n',
    fileExists,
    // TypeScript reads package.json files with it; source files come from getSourceFile
    readFile: fileName => ts.sys.readFile(fileName),
    realpath: ts.sys.realpath,
    resolveModuleNameLiterals(moduleLiterals, containingFile, redirectedReference, compilerOpts) {
      return moduleLiterals.map(literal => {
        const somModule = resolveSomModule(literal.text, containingFile);
        if (somModule) {
          return {
            resolvedModule: {
              resolvedFileName: virtualName(somModule),
              extension: ts.Extension.Ts,
              isExternalLibraryImport: false,
            },
          };
        }
        return ts.resolveModuleName(
          literal.text,
          containingFile,
          compilerOpts,
          host,
          resolutionCache,
          redirectedReference
        );
      });
    },
  };
  return host;
}

/**
 * The `.som` file a relative specifier names, as the module system resolves
 * it: `./м`, `./м.js` (the emitted spelling) and `./м.som` all name `м.som`,
 * and a directory names its `index.som`.
 */
function resolveSomModule(specifier: string, containingFile: string): string | undefined {
  if (!/^\.\.?(?:\/|$)/.test(specifier)) return undefined;
  const directory = path.dirname(containingFile);
  const base = path.resolve(directory, specifier.replace(/\.(?:js|som)$/, ''));
  const candidates = [`${base}.som`, path.join(base, 'index.som')];
  return candidates.find(candidate => ts.sys.fileExists(candidate));
}

// ---------------------------------------------------------------------------
// Checking
// ---------------------------------------------------------------------------

/**
 * Type-check `.som` files with TypeScript and map the diagnostics of each
 * back to it. The files share one program, so checking several at once is
 * cheaper than one by one.
 */
export function checkWithTypeScript(
  inputs: TsCheckInput[],
  options: TsCheckOptions = {}
): TsCheckFileResult[] {
  const tsOptions = compilerOptions(options);
  const virtualFiles = new Map<string, VirtualFile>();
  const roots: string[] = [];
  for (const input of inputs) {
    const fileName = path.resolve(input.fileName);
    const name = virtualName(fileName);
    virtualFiles.set(name, {
      source: input.source,
      emitted: emitSom(fileName, input.source, input.ast),
    });
    roots.push(name);
  }
  const currentDirectory = path.posix.dirname(roots[0] ?? toTsPath(path.resolve('source.som')));
  const outputs = new Map<string, string>();
  const host = createHost(tsOptions, currentDirectory, virtualFiles, outputs);

  return withLocale(options.locale ?? 'en', () => {
    const program = ts.createProgram({ rootNames: roots, options: tsOptions, host });
    const global =
      options.typeCheck === false
        ? []
        : [...program.getOptionsDiagnostics(), ...program.getGlobalDiagnostics()];
    return roots.map((root, index) => {
      const file = virtualFiles.get(root)!;
      const sourceFile = program.getSourceFile(root)!;
      const diagnostics: ts.Diagnostic[] = [];
      if (options.typeCheck !== false) {
        if (index === 0) diagnostics.push(...global);
        diagnostics.push(
          ...program.getSyntacticDiagnostics(sourceFile),
          ...program.getSemanticDiagnostics(sourceFile)
        );
        const ambient = program.getSourceFile(ambientName(somFileOf(root)));
        if (ambient) {
          diagnostics.push(
            ...program.getSyntacticDiagnostics(ambient),
            ...program.getSemanticDiagnostics(ambient)
          );
        }
      }
      let declaration: string | undefined;
      if (options.declaration) {
        diagnostics.push(...program.getDeclarationDiagnostics(sourceFile));
        program.emit(sourceFile, undefined, undefined, true);
        declaration = outputs.get(`${somFileOf(root)}.d.ts`);
      }
      const errors = diagnostics
        .filter(diagnostic => diagnostic.category === ts.DiagnosticCategory.Error)
        .map(diagnostic => toTypeCheckError(diagnostic, file, options.locale ?? 'en'));
      return {
        fileName: path.resolve(inputs[index].fileName),
        errors: dedupe(errors),
        declaration,
      };
    });
  });
}

function dedupe(errors: TypeCheckError[]): TypeCheckError[] {
  const seen = new Set<string>();
  return errors.filter(error => {
    const key = `${error.code}|${error.line}|${error.column}|${error.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Runs `run` with TypeScript's messages in `locale` (TypeScript keeps them globally). */
function withLocale<T>(locale: DiagnosticLocale, run: () => T): T {
  const setMessages = (
    ts as unknown as { setLocalizedDiagnosticMessages?: (_messages: unknown) => void }
  ).setLocalizedDiagnosticMessages;
  if (locale === 'en' || !setMessages) return run();
  setMessages(localizedMessages(locale));
  try {
    return run();
  } finally {
    setMessages(undefined);
  }
}

let russianMessages: Record<string, string> | undefined;

function localizedMessages(locale: Exclude<DiagnosticLocale, 'en'>): Record<string, string> {
  if (locale === 'tj') return TAJIK_DIAGNOSTIC_MESSAGES;
  if (!russianMessages) {
    try {
      russianMessages = JSON.parse(
        fs.readFileSync(path.join(TS_LIB_DIR, 'ru', 'diagnosticMessages.generated.json'), 'utf8')
      ) as Record<string, string>;
    } catch {
      russianMessages = {};
    }
  }
  return russianMessages;
}

// ---------------------------------------------------------------------------
// Diagnostics → SomonScript errors
// ---------------------------------------------------------------------------

function toTypeCheckError(
  diagnostic: ts.Diagnostic,
  file: VirtualFile,
  locale: DiagnosticLocale
): TypeCheckError {
  let line = 1;
  let column = 1;
  if (diagnostic.file && diagnostic.start !== undefined) {
    const position = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
    // A diagnostic is in the checked file or in the declaration file of its ambient modules
    const mappings = isAmbient(diagnostic.file.fileName)
      ? file.emitted.ambient!.mappings
      : file.emitted.mappings;
    const original = originalPosition(mappings, position.line + 1, position.character);
    if (original) {
      line = original.line;
      column = original.column + 1;
    }
  }
  // Mapped positions are in the source
  const sourceLine = file.source.split('\n')[line - 1];
  const raw = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
  return {
    code: `TS${diagnostic.code}`,
    message: translateMessage(raw, locale, sourceLine, column, diagnostic.code),
    line,
    column,
    snippet: sourceLine,
    severity: 'error',
  };
}

/** TypeScript's names of types → SomonScript's. */
const TAJIK_TYPE_WORDS: ReadonlyMap<string, string> = new Map([
  ['number', 'рақам'],
  ['string', 'сатр'],
  ['boolean', 'мантиқӣ'],
  ['any', 'ҳар'],
  ['unknown', 'ношинос'],
  ['never', 'абадан'],
  ['void', 'беджавоб'],
  ['null', 'холӣ'],
  ['undefined', 'беқимат'],
  ['object', 'объект'],
  ['bigint', 'калонрақам'],
  ['symbol', 'рамз'],
  ['true', 'дуруст'],
  ['false', 'нодуруст'],
  ['keyof', 'калидҳои'],
  ['typeof', 'навъи'],
  ['readonly', 'танҳохонӣ'],
  ['unique', 'беназир'],
  ['infer', 'инфер'],
  ['extends', 'мерос'],
  ['Promise', 'Ваъда'],
  ['Error', 'Хато'],
  ['Function', 'функсия'],
  ['Partial', 'қисмӣ'],
  ['Required', 'ҳатмӣ'],
  ['Readonly', 'танҳохон'],
  ['Record', 'сабт_навъ'],
  ['Pick', 'гирифтан_навъ'],
  ['Omit', 'ҳазф'],
  ['Exclude', 'хориҷ'],
  ['Extract', 'истихроҷ'],
  ['NonNullable', 'беналиӣ'],
  ['ReturnType', 'навъи_бозгашт'],
  ['Parameters', 'параметрҳо'],
  ['InstanceType', 'навъи_намуна'],
  ['ConstructorParameters', 'параметрҳои_конструктор'],
  ['ThisParameterType', 'навъи_параметри_ин'],
  ['Awaited', 'интизоршуда'],
]);

/**
 * Diagnostics about members that are reported at another node (the object
 * literal, the variable): a member alias anywhere on the line is named.
 */
const MEMBER_LIST_CODES: ReadonlySet<number> = new Set([2353, 2420, 2739, 2740, 2741]);

/** Tajik built-in member names by JavaScript name: `includes` → `дорад`. */
const TAJIK_MEMBER_NAMES: ReadonlyMap<string, string[]> = (() => {
  const names = new Map<string, string[]>();
  for (const alias of MEMBER_ALIASES) {
    const jsName = translateMemberName(alias);
    if (jsName === alias) continue;
    names.set(jsName, [...(names.get(jsName) ?? []), alias]);
  }
  return names;
})();

/**
 * A `.som` module is checked as the file `м.som.ts`. Where TypeScript names a module by
 * a specifier it computes instead of the one the import wrote (on macOS it gave
 * `"./м.som.js"` for `аз "./м"`), the name is written as the program writes it.
 */
function withSourceModuleNames(message: string): string {
  return message.replace(/(["'])([^"'\n]*?)\.som(?:\.[jt]s)?\1/g, '$1$2$1');
}

/**
 * Tajik type names inside the quoted parts of a message (`'number'` →
 * `'рақам'`), and, for a member name that the source spells with its Tajik
 * alias, both spellings (`'дорад' (includes)`).
 */
export function translateMessage(
  message: string,
  locale: DiagnosticLocale,
  sourceLine: string,
  column: number,
  code = 0
): string {
  const word = /^[\p{L}\p{N}_$]+/u.exec(sourceLine.slice(Math.max(column - 1, 0)))?.[0];
  const words = MEMBER_LIST_CODES.has(code)
    ? new Set(sourceLine.match(/[\p{L}\p{N}_$]+/gu) ?? [])
    : new Set(word ? [word] : []);
  let aliasNamed: string | undefined;
  // TypeScript escapes non-ASCII characters of string literal types (`"м"`)
  const readable = withSourceModuleNames(message).replace(
    /\\u([0-9A-Fa-f]{4})/g,
    (_escape, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16))
  );
  const translated = readable.replace(
    /(['"«])([^'"«»\n]*)(['"»])/g,
    (whole, open: string, text: string, close: string) => {
      if ((open === '«') !== (close === '»')) return whole;
      const aliases = TAJIK_MEMBER_NAMES.get(text);
      // `о.дорад` read as `includes`: name it as written
      const alias = aliases?.find(name => words.has(name));
      if (alias && !aliasNamed) {
        aliasNamed = text;
        return `${open}${alias}${close} (${text})`;
      }
      return `${open}${translateTypeText(text)}${close}`;
    }
  );
  if (
    aliasNamed === 'includes' &&
    /\b(?:Map|Set|WeakMap|WeakSet|ReadonlyMap|ReadonlySet)\b/.test(message)
  ) {
    const hint =
      locale === 'ru'
        ? "; используйте 'дорадКалид' (has) для проверки наличия"
        : locale === 'tj'
          ? "; барои санҷиши мавҷудият 'дорадКалид' (has)-ро истифода баред"
          : "; use 'дорадКалид' (has) to test membership";
    return translated.replace(/\.?$/, hint);
  }
  return translated;
}

/**
 * `number[] | Promise<string>` → `рақам[] | Ваъда<сатр>`. The quoted text has
 * no `"`, so string literal types (`'"number"'`) never reach here.
 */
function translateTypeText(text: string): string {
  return text.replace(/\b[A-Za-z]+\b/g, name => TAJIK_TYPE_WORDS.get(name) ?? name);
}

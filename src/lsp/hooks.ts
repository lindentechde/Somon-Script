/**
 * Injectable features the language server uses when they are available: a
 * source formatter (`somon fmt`) and alternative type checkers
 * (`compilerOptions.checker`, e.g. 'typescript'). Without them formatting is
 * not offered and the built-in type checker reports type errors.
 */

/** Options a formatter receives, from the editor's formatting request. */
export interface FormatterOptions {
  tabSize: number;
  insertSpaces: boolean;
  /** Path of the file being formatted, when it has one. */
  fileName?: string;
}

/**
 * Formats SomonScript source. May return the formatted text or an object
 * holding it (`code`, `formatted` or `output`); throws when the source cannot
 * be formatted (e.g. a syntax error).
 */
export type Formatter = (
  _source: string,
  _options: FormatterOptions
) => string | { code?: string; formatted?: string; output?: string };

/** A diagnostic from an alternative checker; positions as the compiler counts them. */
export interface CheckerDiagnostic {
  message: string;
  /** One-based line. */
  line: number;
  /** One-based column. */
  column: number;
  severity?: 'error' | 'warning';
  code?: string;
}

export interface CheckerOptions {
  fileName?: string;
  /** The `compilerOptions` of somon.config.json, as found for the file. */
  compilerOptions: Record<string, unknown>;
  locale: string;
}

/** Type-checks a document with another checker (`compilerOptions.checker`). */
export type Checker = (_source: string, _options: CheckerOptions) => CheckerDiagnostic[];

export interface LanguageServerHooks {
  formatter?: Formatter;
  /** Checkers by the name `compilerOptions.checker` gives them. */
  checkers?: Record<string, Checker>;
}

const registered: { formatter?: Formatter; checkers: Map<string, Checker> } = {
  checkers: new Map(),
};

/** Makes a formatter available to every language server started afterwards. */
export function registerFormatter(formatter: Formatter | undefined): void {
  registered.formatter = formatter;
}

/** Makes a checker available under the name `compilerOptions.checker` selects it by. */
export function registerChecker(name: string, checker: Checker | undefined): void {
  if (checker) registered.checkers.set(name, checker);
  else registered.checkers.delete(name);
}

/** Modules and export names where a formatter of the compiler may live. */
const FORMATTER_MODULES = ['../formatter', '../format', '../fmt'];
const FORMATTER_EXPORTS = ['format', 'formatSource', 'formatCode', 'default'];

type ModuleLoader = (_id: string) => unknown;

/** Requires a module relative to this one, or undefined when it does not exist. */
const defaultLoader: ModuleLoader = id => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require(id);
  } catch {
    return undefined;
  }
};

/**
 * The formatter to use: an explicitly injected one, else a registered one,
 * else one exported by the compiler's formatter module if it exists.
 */
export function resolveFormatter(
  hooks: LanguageServerHooks = {},
  load: ModuleLoader = defaultLoader
): Formatter | undefined {
  if (hooks.formatter) return hooks.formatter;
  if (registered.formatter) return registered.formatter;
  for (const id of FORMATTER_MODULES) {
    const exports = load(id) as Record<string, unknown> | undefined;
    if (!exports) continue;
    for (const name of FORMATTER_EXPORTS) {
      if (typeof exports[name] === 'function') return exports[name] as Formatter;
    }
  }
  return undefined;
}

/** The checker registered (or injected) under `name`. */
export function resolveChecker(name: string, hooks: LanguageServerHooks = {}): Checker | undefined {
  return hooks.checkers?.[name] ?? registered.checkers.get(name);
}

/** The formatted text from whatever a formatter returned. */
export function formattedText(result: ReturnType<Formatter>): string {
  if (typeof result === 'string') return result;
  const text = result.code ?? result.formatted ?? result.output;
  if (typeof text !== 'string') throw new Error('the formatter returned no text');
  return text;
}

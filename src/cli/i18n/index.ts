/*
 * SomonScript CLI Internationalization Module
 * Copyright (c) 2025 LindenTech IT Consulting
 *
 * Licensed under the MIT License. See the LICENSE file for details.
 */

export type Language = 'en' | 'tj' | 'ru';

export interface Translations {
  commands: {
    somon: {
      description: string;
    };
    compile: {
      name: string;
      alias: string;
      description: string;
      usage: string;
      args: {
        input: string;
      };
      options: {
        output: string;
        outDir: string;
        target: string;
        lib: string;
        useDefineForClassFields: string;
        noUseDefineForClassFields: string;
        sourceMap: string;
        noSourceMap: string;
        minify: string;
        noMinify: string;
        noTypeCheck: string;
        strict: string;
        experimentalDecorators: string;
        watch: string;
      };
      messages: {
        fileNotFound: (_file: string) => string;
        compilationErrors: string;
        warnings: string;
        compiled: (_input: string, _output: string) => string;
        sourceMapGenerated: (_file: string) => string;
        watching: (_file: string) => string;
        recompiling: (_file: string) => string;
        configChanged: (_file: string) => string;
        sourceRemoved: (_file: string) => string;
        configRemoved: (_file: string) => string;
        stoppingWatcher: (_signal: string) => string;
        watchError: string;
        watchCloseFailed: string;
      };
    };
    run: {
      name: string;
      alias: string;
      description: string;
      usage: string;
      args: {
        input: string;
        args: string;
      };
      messages: {
        failedToExecute: string;
        terminatedWithSignal: (_signal: string) => string;
        cleanupFailed: string;
      };
    };
    init: {
      name: string;
      description: string;
      args: {
        name: string;
      };
      messages: {
        directoryExists: (_name: string) => string;
        projectCreated: (_name: string) => string;
        nextSteps: string;
      };
    };
    bundle: {
      name: string;
      alias: string;
      description: string;
      usage: string;
      args: {
        input: string;
      };
      options: {
        output: string;
        format: string;
        globalName: string;
        inlineSources: string;
        externals: string;
      };
      messages: {
        bundling: (_input: string) => string;
        bundleCreated: (_output: string) => string;
        sourceMapCreated: (_file: string) => string;
        bundledModules: (_count: number) => string;
        bundleError: string;
      };
    };
    moduleInfo: {
      name: string;
      alias: string;
      description: string;
      usage: string;
      args: {
        input: string;
      };
      options: {
        graph: string;
        stats: string;
        circular: string;
      };
      messages: {
        analyzing: (_input: string) => string;
        moduleStatistics: string;
        totalModules: string;
        totalDependencies: string;
        averageDependencies: string;
        maxDepth: string;
        circularDependencies: string;
        dependencyGraph: string;
        noCircularDeps: string;
        issuesFound: string;
        analysisError: string;
      };
    };
    resolve: {
      name: string;
      description: string;
      usage: string;
      args: {
        specifier: string;
      };
      options: {
        from: string;
      };
      messages: {
        resolved: (_specifier: string) => string;
        path: string;
        extension: string;
        external: string;
        package: string;
        yes: string;
        no: string;
        resolveError: string;
      };
    };
    fmt: {
      name: string;
      description: string;
      usage: string;
      args: {
        paths: string;
      };
      options: {
        check: string;
        write: string;
        stdout: string;
        indent: string;
      };
      messages: {
        formatted: (_file: string) => string;
        wouldReformat: (_file: string) => string;
        failed: (_file: string) => string;
        summary: (_changed: number, _total: number) => string;
        checkPassed: (_total: number) => string;
        checkFailed: (_changed: number) => string;
        noFiles: string;
        pathNotFound: (_path: string) => string;
        invalidIndent: (_value: string) => string;
      };
    };
    repl: {
      name: string;
      description: string;
      messages: {
        banner: (_version: string) => string;
        help: string;
        cleared: string;
        noCompiledCode: string;
        exitHint: string;
        error: string;
      };
    };
    migrate: {
      name: string;
      description: string;
      usage: string;
      args: {
        input: string;
      };
      options: {
        output: string;
        stdout: string;
      };
      messages: {
        migrated: (_input: string, _output: string) => string;
        warning: string;
        failed: (_file: string) => string;
        noFiles: (_input: string) => string;
        summary: (_files: number, _warnings: number) => string;
      };
    };
  };
  common: {
    version: string;
    help: string;
    error: string;
    configError: string;
    languageOption: string;
    invalidLanguage: (_value: string) => string;
    outputEqualsInput: (_file: string) => string;
    productionDeprecated: string;
  };
}

type Environment = Readonly<Record<string, string | undefined>>;

export const LANGUAGES: readonly Language[] = ['en', 'tj', 'ru'];

const translations: Record<Language, Translations> = {
  en: require('./translations/en').default,
  tj: require('./translations/tj').default,
  ru: require('./translations/ru').default,
};

function isLanguage(value: string): value is Language {
  return (LANGUAGES as readonly string[]).includes(value);
}

// Matches the language part of a POSIX locale such as 'ru_RU.UTF-8', 'tg_TJ' or 'tj'.
const LOCALE_PATTERN = /^(ru|tg|tj)(?:[_.@-]|$)/i;

function languageFromLocale(locale: string): Language {
  const match = LOCALE_PATTERN.exec(locale);
  if (!match) return 'en';
  return match[1].toLowerCase() === 'ru' ? 'ru' : 'tj';
}

/**
 * Language from the environment: SOMON_LANG, then the POSIX locale variables in
 * their standard precedence (LC_ALL > LC_MESSAGES > LANG). Empty values are ignored.
 */
export function detectEnvLanguage(env: Environment): Language {
  const locale = [env.SOMON_LANG, env.LC_ALL, env.LC_MESSAGES, env.LANG].find(
    value => value !== undefined && value !== ''
  );
  return locale ? languageFromLocale(locale) : 'en';
}

/**
 * Detect the CLI language from the user arguments (`--lang X` or `--lang=X`, the
 * last one before `--` wins) and fall back to the environment.
 * Throws when `--lang` names an unsupported language.
 */
export function detectLanguage(argv: readonly string[], env: Environment): Language {
  let requested: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--') break;
    if (arg === '--lang' && i + 1 < argv.length) {
      requested = argv[++i];
    } else if (arg.startsWith('--lang=')) {
      requested = arg.slice('--lang='.length);
    }
  }

  const envLanguage = detectEnvLanguage(env);
  if (requested === undefined) return envLanguage;
  if (isLanguage(requested)) return requested;
  throw new Error(translations[envLanguage].common.invalidLanguage(requested));
}

class I18n {
  private language: Language = detectEnvLanguage(process.env);

  public setLanguage(lang: Language): void {
    this.language = lang;
  }

  public getLanguage(): Language {
    return this.language;
  }

  public t(): Translations {
    return translations[this.language];
  }

  public get isRTL(): boolean {
    // Tajik and Russian both use left-to-right writing
    return false;
  }
}

// Singleton instance
export const i18n = new I18n();
export const t = () => i18n.t();

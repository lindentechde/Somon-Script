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
        sourceMap: string;
        noSourceMap: string;
        minify: string;
        noMinify: string;
        noTypeCheck: string;
        strict: string;
        watch: string;
        production: string;
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
        watchError: string;
      };
    };
    run: {
      name: string;
      alias: string;
      description: string;
      usage: string;
      args: {
        input: string;
      };
      options: {
        target: string;
        sourceMap: string;
        noSourceMap: string;
        minify: string;
        noMinify: string;
        noTypeCheck: string;
        strict: string;
        production: string;
      };
      messages: {
        failedToExecute: string;
        terminatedWithSignal: (_signal: string) => string;
        productionValidationFailed: string;
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
        minify: string;
        sourceMap: string;
        inlineSources: string;
        externals: string;
        production: string;
      };
      messages: {
        bundling: (_input: string) => string;
        bundleCreated: (_output: string) => string;
        sourceMapCreated: (_file: string) => string;
        bundledModules: (_count: number) => string;
        onlyCommonJsSupported: (_format: string) => string;
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
    serve: {
      name: string;
      description: string;
      options: {
        port: string;
        config: string;
        production: string;
        json: string;
      };
    };
    help: {
      name: string;
      description: string;
    };
  };
  common: {
    version: string;
    help: string;
    displayHelp: string;
    error: string;
    configError: string;
    productionValidationFailed: string;
    languageOption: string;
  };
}

class I18n {
  private language: Language = 'en';
  private readonly translations: Map<Language, Translations> = new Map();

  constructor() {
    this.detectLanguage();
    this.loadTranslations();
  }

  private detectLanguage(): void {
    // Check environment variables
    const envLang =
      process.env.SOMON_LANG || process.env.LANG || process.env.LC_ALL || process.env.LC_MESSAGES;

    if (envLang) {
      if (envLang.includes('tj') || envLang.includes('tg')) {
        this.language = 'tj';
      } else if (envLang.includes('ru')) {
        this.language = 'ru';
      } else {
        this.language = 'en';
      }
    }

    // Check CLI argument for language override
    const langIndex = process.argv.indexOf('--lang');
    if (langIndex !== -1 && process.argv[langIndex + 1]) {
      const lang = process.argv[langIndex + 1];
      if (lang === 'tj' || lang === 'ru' || lang === 'en') {
        this.language = lang as Language;
      }
    }
  }

  private loadTranslations(): void {
    // Lazy load translations based on selected language
    this.translations.set('en', require('./translations/en').default);
    this.translations.set('tj', require('./translations/tj').default);
    this.translations.set('ru', require('./translations/ru').default);
  }

  public setLanguage(lang: Language): void {
    this.language = lang;
  }

  public getLanguage(): Language {
    return this.language;
  }

  public t(): Translations {
    return this.translations.get(this.language) || this.translations.get('en')!;
  }

  public get isRTL(): boolean {
    // Tajik and Russian both use left-to-right writing
    return false;
  }
}

// Singleton instance
export const i18n = new I18n();
export const t = () => i18n.t();

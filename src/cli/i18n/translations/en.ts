import { Translations } from '../index';

const translations: Translations = {
  commands: {
    somon: {
      description: 'SomonScript compiler - Compile Tajik Cyrillic code to JavaScript',
    },
    compile: {
      name: 'compile',
      alias: 'c',
      description: 'Compile SomonScript files to JavaScript',
      usage: '[input] [options]',
      args: {
        input: 'Input .som file',
      },
      options: {
        output: 'Output file (default: input with .som replaced by .js, otherwise <input>.js)',
        outDir: 'Output directory',
        target: 'Compilation target',
        sourceMap: 'Generate source maps',
        noSourceMap: 'Disable source maps',
        minify: 'Minify output',
        noMinify: 'Disable minification',
        noTypeCheck: 'Disable type checking',
        strict: 'Enable strict type checking',
        experimentalDecorators:
          'Use legacy (experimental) decorators, which may decorate parameters',
        watch: 'Recompile on file changes',
      },
      messages: {
        fileNotFound: (file: string) => `Error: File '${file}' not found`,
        compilationErrors: 'Compilation errors:',
        warnings: 'Warnings:',
        compiled: (input: string, output: string) => `Compiled '${input}' to '${output}'`,
        sourceMapGenerated: (file: string) => `Generated source map: '${file}'`,
        watching: (file: string) => `Watching '${file}' for changes...`,
        recompiling: (file: string) => `Recompiling '${file}'...`,
        configChanged: (file: string) =>
          `Configuration change detected in '${file}'. Recompiling...`,
        sourceRemoved: (file: string) =>
          `Source file '${file}' was removed. Waiting for it to reappear...`,
        configRemoved: (file: string) =>
          `Configuration file '${file}' was removed. Using previous options.`,
        stoppingWatcher: (signal: string) => `Received ${signal}, stopping watcher...`,
        watchError: 'Watch error:',
        watchCloseFailed: 'Failed to close watcher:',
      },
    },
    run: {
      name: 'run',
      alias: 'r',
      description: 'Compile and run SomonScript file',
      usage: '<input> [options] [-- args...]',
      args: {
        input: 'Input .som file',
        args: 'Arguments passed to the program (use -- before arguments that start with -)',
      },
      messages: {
        failedToExecute: 'Failed to execute Node:',
        terminatedWithSignal: (signal: string) => `Process terminated with signal ${signal}`,
        cleanupFailed: 'Warning: unable to clean temporary files:',
      },
    },
    init: {
      name: 'init',
      description: 'Initialize a new SomonScript project',
      args: {
        name: 'Project name',
      },
      messages: {
        directoryExists: (name: string) => `Error: Directory '${name}' already exists`,
        projectCreated: (name: string) => `✅ Created SomonScript project '${name}'`,
        nextSteps: 'Next steps:',
      },
    },
    bundle: {
      name: 'bundle',
      alias: 'b',
      description: 'Bundle SomonScript modules into a single file',
      usage: '[input] [options]',
      args: {
        input: 'Entry point file',
      },
      options: {
        output: 'Output file path',
        format: "Bundle format (only 'commonjs' is supported)",
        inlineSources: 'Inline original sources into emitted source maps',
        externals: 'External modules (comma-separated)',
      },
      messages: {
        bundling: (input: string) => `📦 Bundling ${input}...`,
        bundleCreated: (output: string) => `✅ Bundle created: ${output}`,
        sourceMapCreated: (file: string) => `🗺️ Source map created: ${file}`,
        bundledModules: (count: number) => `📊 Bundled ${count} modules`,
        onlyCommonJsSupported: (format: string) =>
          `SomonScript currently supports only the 'commonjs' bundle format. Received '${format}'.`,
        bundleError: 'Bundle error:',
      },
    },
    moduleInfo: {
      name: 'module-info',
      alias: 'info',
      description: 'Show module dependency information',
      usage: '[input] [options]',
      args: {
        input: 'Entry point file',
      },
      options: {
        graph: 'Show dependency graph',
        stats: 'Show module statistics',
        circular: 'Check for circular dependencies',
      },
      messages: {
        analyzing: (input: string) => `🔍 Analyzing ${input}...`,
        moduleStatistics: '📊 Module Statistics:',
        totalModules: 'Total modules:',
        totalDependencies: 'Total dependencies:',
        averageDependencies: 'Average dependencies per module:',
        maxDepth: 'Maximum dependency depth:',
        circularDependencies: 'Circular dependencies:',
        dependencyGraph: '🕸️  Dependency Graph:',
        noCircularDeps: '✅ No circular dependencies found',
        issuesFound: '❌ Issues found:',
        analysisError: 'Analysis error:',
      },
    },
    resolve: {
      name: 'resolve',
      description: 'Resolve a module specifier to its file path',
      usage: '<specifier> [options]',
      args: {
        specifier: 'Module specifier to resolve',
      },
      options: {
        from: 'Resolve from this file (defaults to current directory)',
      },
      messages: {
        resolved: (specifier: string) => `🎯 Resolved '${specifier}':`,
        path: 'Path:',
        extension: 'Extension:',
        external: 'External:',
        package: 'Package:',
        yes: 'Yes',
        no: 'No',
        resolveError: 'Resolve error:',
      },
    },
  },
  common: {
    version: 'output the version number',
    help: 'display help for command',
    error: 'Error:',
    configError: 'Configuration error:',
    languageOption: 'Set interface language (en, tj, ru)',
    invalidLanguage: (value: string) =>
      `Error: unsupported language '${value}'. Supported languages: en, tj, ru`,
    outputEqualsInput: (file: string) =>
      `Error: output path '${file}' is the same as the input file; use -o to choose another path`,
    productionDeprecated: 'Warning: --production is deprecated and has no effect',
  },
};

export default translations;

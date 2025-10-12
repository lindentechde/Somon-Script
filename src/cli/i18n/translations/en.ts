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
        output: 'Output file (default: same name with .js extension)',
        outDir: 'Output directory',
        target: 'Compilation target',
        sourceMap: 'Generate source maps',
        noSourceMap: 'Disable source maps',
        minify: 'Minify output',
        noMinify: 'Disable minification',
        noTypeCheck: 'Disable type checking',
        strict: 'Enable strict type checking',
        watch: 'Recompile on file changes',
        production: 'Enable production mode with strict validation',
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
        watchError: 'Watch error:',
      },
    },
    run: {
      name: 'run',
      alias: 'r',
      description: 'Compile and run SomonScript file',
      usage: '[input] [options]',
      args: {
        input: 'Input .som file',
      },
      options: {
        target: 'Compilation target',
        sourceMap: 'Generate source maps',
        noSourceMap: 'Disable source maps',
        minify: 'Minify output',
        noMinify: 'Disable minification',
        noTypeCheck: 'Disable type checking',
        strict: 'Enable strict type checking',
        production: 'Enable production mode with strict validation',
      },
      messages: {
        failedToExecute: 'Failed to execute Node:',
        terminatedWithSignal: (signal: string) => `Process terminated with signal ${signal}`,
        productionValidationFailed: 'Production validation failed:',
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
        minify: 'Minify the output',
        sourceMap: 'Generate source maps',
        inlineSources: 'Inline original sources into emitted source maps',
        externals: 'External modules (comma-separated)',
        production: 'Enable production mode with strict validation',
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
    serve: {
      name: 'serve',
      description: 'Start the management server for health checks and metrics',
      options: {
        port: 'Port to listen on',
        config: 'Path to configuration file',
        production: 'Enable production mode with all safety features',
        json: 'Use structured JSON logging',
      },
    },
    help: {
      name: 'help',
      description: 'display help for command',
    },
  },
  common: {
    version: 'output the version number',
    help: 'display help for command',
    displayHelp: 'display help for command',
    error: 'Error:',
    configError: 'Configuration error:',
    productionValidationFailed: 'Production validation failed:',
    languageOption: 'Set interface language (en, tj, ru)',
  },
};

export default translations;

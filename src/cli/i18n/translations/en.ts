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
        target: 'Compilation target (default: es2022)',
        lib: 'TypeScript libs available at run time, comma-separated (e.g. es2022,dom)',
        useDefineForClassFields: 'Define class fields (the default from es2022)',
        noUseDefineForClassFields: 'Assign class fields in the constructor',
        sourceMap: 'Generate source maps',
        noSourceMap: 'Disable source maps',
        minify: 'Minify output',
        noMinify: 'Disable minification',
        noTypeCheck: 'Disable type checking',
        strict: 'Enable strict type checking',
        experimentalDecorators:
          'Use legacy (experimental) decorators, which may decorate parameters',
        watch: 'Recompile on file changes',
        module: "Module format of the output: 'commonjs' (default) or 'esm'",
        checker: "Type checker: 'somon' (default) or 'typescript' (the TypeScript compiler)",
        declaration: 'Also write a TypeScript declaration file (.d.ts)',
      },
      messages: {
        fileNotFound: (file: string) => `Error: File '${file}' not found`,
        compilationErrors: 'Compilation errors:',
        warnings: 'Warnings:',
        compiled: (input: string, output: string) => `Compiled '${input}' to '${output}'`,
        sourceMapGenerated: (file: string) => `Generated source map: '${file}'`,
        declarationGenerated: (file: string) => `Generated declarations: '${file}'`,
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
        format:
          'Bundle format: commonjs, esm or iife (default: esm when modules compile to ES modules, else commonjs)',
        globalName: 'Global that receives the exports of an iife bundle',
        inlineSources: 'Inline original sources into emitted source maps',
        externals: 'External modules (comma-separated)',
      },
      messages: {
        bundling: (input: string) => `📦 Bundling ${input}...`,
        bundleCreated: (output: string) => `✅ Bundle created: ${output}`,
        sourceMapCreated: (file: string) => `🗺️ Source map created: ${file}`,
        bundledModules: (count: number) => `📊 Bundled ${count} modules`,
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
    check: {
      name: 'check',
      description: 'Type-check SomonScript files without compiling them',
      usage: '<files...> [options]',
      args: {
        files: 'Input .som files',
      },
      messages: {
        noErrors: (files: number) => `✅ No type errors in ${files} file(s)`,
        errorsFound: (errors: number, files: number) =>
          `❌ Found ${errors} type error(s) in ${files} file(s)`,
        fileErrors: (file: string) => `${file}:`,
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
    fmt: {
      name: 'fmt',
      description: 'Format SomonScript files in the canonical style',
      usage: '[options] <files or directories...>',
      args: {
        paths: '.som files, or directories to search for them',
      },
      options: {
        check: 'Only report files that are not formatted (exit code 1 if any)',
        write: 'Write the formatted code back to the files (the default)',
        stdout: 'Print the formatted code instead of writing it',
        indent: 'Spaces per indentation level (default: fmt.indent from somon.config.json, or 4)',
      },
      messages: {
        formatted: (file: string) => `Formatted ${file}`,
        wouldReformat: (file: string) => `Not formatted: ${file}`,
        failed: (file: string) => `Cannot format ${file}:`,
        summary: (changed: number, total: number) => `${changed} of ${total} file(s) changed`,
        checkPassed: (total: number) => `All ${total} file(s) are formatted`,
        checkFailed: (changed: number) => `${changed} file(s) are not formatted`,
        noFiles: 'No .som files found',
        pathNotFound: (path: string) => `Error: '${path}' does not exist`,
        invalidIndent: (value: string) =>
          `Error: --indent must be an integer from 1 to 16, got '${value}'`,
      },
    },
    repl: {
      name: 'repl',
      description: 'Start an interactive SomonScript session',
      messages: {
        banner: (version: string) =>
          `SomonScript ${version}. Type .help (.ёрӣ) for help, .exit (.баромад) to quit.`,
        help: [
          '.ёрӣ, .help        Show this help',
          '.баромад, .exit    Leave the REPL',
          '.пок, .clear       Forget all declarations and the current input',
          '.js                Show the JavaScript compiled from the last input',
          '',
          'An input continues on the next line while a bracket, block or template is open.',
          'Declarations stay visible in later inputs; интизор works at the top level.',
        ].join('\n'),
        cleared: 'Context cleared.',
        noCompiledCode: 'Nothing has been compiled yet.',
        exitHint: '(To exit, press Ctrl+C again or type .exit)',
        error: 'Error:',
      },
    },
    migrate: {
      name: 'migrate',
      description: 'Convert TypeScript files to SomonScript',
      usage: '[options] <file.ts or directory>',
      args: {
        input: 'A .ts file, or a directory of .ts files',
      },
      options: {
        output: 'Output file, or output directory for a directory input',
        stdout: 'Print the SomonScript code instead of writing files',
      },
      messages: {
        migrated: (input: string, output: string) => `Migrated '${input}' to '${output}'`,
        warning: 'warning:',
        failed: (file: string) => `Cannot migrate ${file}:`,
        noFiles: (input: string) => `No TypeScript files found in '${input}'`,
        summary: (files: number, warnings: number) =>
          `${files} file(s) migrated, ${warnings} warning(s)`,
      },
    },
    lsp: {
      name: 'lsp',
      description: 'Start the SomonScript language server (Language Server Protocol over stdio)',
      options: {
        stdio: 'Communicate over stdin/stdout (the default; accepted for editor clients)',
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

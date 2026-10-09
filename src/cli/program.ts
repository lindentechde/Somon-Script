/*
 * SomonScript CLI
 * Copyright (c) 2025 LindenTech IT Consulting
 *
 * Licensed under the MIT License. See the LICENSE file for details.
 */

import { spawn } from 'node:child_process';
import { Command, InvalidArgumentError, Option } from 'commander';
import chokidar from 'chokidar';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

import { compile, type CompileResult } from '../compiler';
import {
  ConfigError,
  loadConfigWithPath,
  type CompilerOptions,
  type LoadedConfig,
  type SomonConfig,
} from '../config';
import type { ModuleSystem, BundleOptions as ModuleBundleOptions } from '../module-system';
import {
  BUNDLE_FORMATS,
  DEFAULT_TARGET,
  normalizeLib,
  TARGETS,
  validateGlobalName,
  validateLib,
} from '../targets';
import { LANGUAGES, t, type Translations } from './i18n';
import { registerToolCommands } from './tool-commands';
// Read package.json at runtime to avoid import attribute issues
function findPackageJson(): { name: string; version: string } {
  let currentDir = __dirname;
  while (currentDir !== path.dirname(currentDir)) {
    const packagePath = path.join(currentDir, 'package.json');
    if (fs.existsSync(packagePath)) {
      return JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    }
    currentDir = path.dirname(currentDir);
  }
  // Fallback for test environments - use deterministic path resolution
  // Instead of process.cwd(), use relative paths from __dirname
  const fallbackPath = path.resolve(__dirname, '..', '..', 'package.json');
  if (fs.existsSync(fallbackPath)) {
    return JSON.parse(fs.readFileSync(fallbackPath, 'utf8'));
  }
  throw new Error('package.json not found');
}
const pkg = findPackageJson();

/** `--lib es2022,dom` → ['es2022', 'dom'], rejecting names TypeScript does not ship. */
function parseLibList(value: string): string[] {
  const lib = normalizeLib(value.split(','));
  const problems = validateLib(lib.length > 0 ? lib : ['']);
  if (problems.length > 0) throw new InvalidArgumentError(problems.join('; '));
  return lib;
}

function parseGlobalName(value: string): string {
  const problem = validateGlobalName(value);
  if (problem) throw new InvalidArgumentError(problem);
  return value;
}

function logConfigError(error: ConfigError): void {
  console.error(t().common.configError);
  console.error(`  ${error.message}`);
  if (error.details.length > 0) {
    for (const detail of error.details) {
      console.error(`  ${detail.path}: ${detail.message}`);
    }
  }
}

function handleCliFailure(error: unknown, fallbackPrefix: string): void {
  if (error instanceof ConfigError) {
    logConfigError(error);
  } else {
    console.error(fallbackPrefix, error instanceof Error ? error.message : error);
  }

  if (!process.exitCode || process.exitCode === 0) {
    process.exitCode = 1;
  }
}

type BufferEncoding =
  | 'ascii'
  | 'utf8'
  | 'utf-8'
  | 'utf16le'
  | 'ucs2'
  | 'ucs-2'
  | 'base64'
  | 'base64url'
  | 'latin1'
  | 'binary'
  | 'hex';

/** Compiler flags shared by compile, run and bundle (as parsed by commander). */
interface CliCompilerFlags {
  target?: CompilerOptions['target'];
  lib?: string[];
  useDefineForClassFields?: boolean;
  sourceMap?: boolean;
  minify?: boolean;
  /** `--no-type-check` is stored by commander as `typeCheck: false`. */
  typeCheck?: boolean;
  strict?: boolean;
  production?: boolean;
  experimentalDecorators?: boolean;
}

interface BundleOptions extends CliCompilerFlags {
  output?: string;
  format?: ModuleBundleOptions['format'];
  globalName?: string;
  inlineSources?: boolean;
  externals?: string;
}

type RunOptions = CliCompilerFlags;

/** Translate commander's compiler flags into config-style compiler options. */
function cliCompilerOverrides(flags: CliCompilerFlags): CompilerOptions {
  const overrides: CompilerOptions = {};
  if (flags.target !== undefined) overrides.target = flags.target;
  if (flags.lib !== undefined) overrides.lib = flags.lib;
  if (flags.useDefineForClassFields !== undefined) {
    overrides.useDefineForClassFields = flags.useDefineForClassFields;
  }
  if (flags.sourceMap !== undefined) overrides.sourceMap = flags.sourceMap;
  if (flags.minify !== undefined) overrides.minify = flags.minify;
  if (flags.typeCheck === false) overrides.noTypeCheck = true;
  if (flags.strict !== undefined) overrides.strict = flags.strict;
  if (flags.experimentalDecorators !== undefined) {
    overrides.experimentalDecorators = flags.experimentalDecorators;
  }
  return overrides;
}

/**
 * Compiler options for the module system: config compilerOptions, then the more
 * specific moduleSystem.compilation section, then the command-line flags.
 */
function moduleCompilationOptions(config: SomonConfig, flags: CliCompilerFlags): CompilerOptions {
  // Output paths and watch settings in compilerOptions only apply to `compile`.
  const { target, sourceMap, minify, noTypeCheck, strict, experimentalDecorators } =
    config.compilerOptions ?? {};
  const { lib, useDefineForClassFields } = config.compilerOptions ?? {};
  const fromConfig = Object.fromEntries(
    Object.entries({
      target,
      lib,
      useDefineForClassFields,
      sourceMap,
      minify,
      noTypeCheck,
      strict,
      experimentalDecorators,
    }).filter(([, value]) => value !== undefined)
  ) as CompilerOptions;
  return {
    ...fromConfig,
    ...config.moduleSystem?.compilation,
    ...cliCompilerOverrides(flags),
  };
}

/** Resolve a path from the config file relative to the directory of that file. */
function resolveFromConfig(loaded: LoadedConfig, value: string, fallbackDir: string): string {
  return path.resolve(loaded.configDir ?? fallbackDir, value);
}

/** `x.som` → `x<suffix>`, anything else → `x.ext<suffix>` so the input is never overwritten. */
function replaceSomExtension(file: string, suffix: string): string {
  return /\.som$/i.test(file) ? file.replace(/\.som$/i, suffix) : `${file}${suffix}`;
}

/** Report and refuse an output path that would overwrite the input file. */
function isOutputSameAsInput(input: string, output: string): boolean {
  if (path.resolve(output) !== path.resolve(input)) return false;
  console.error(t().common.outputEqualsInput(output));
  process.exitCode = 1;
  return true;
}

async function executeBundleCommand(input: string, options: BundleOptions): Promise<void> {
  try {
    const loaded = loadConfigWithPath(path.dirname(path.resolve(input)));

    const moduleSystem = await createModuleSystem(
      input,
      loaded,
      moduleCompilationOptions(loaded.config, options)
    );

    const bundleOptions = createBundleOptions(input, options, loaded);
    const outputPath = bundleOptions.outputPath ?? replaceSomExtension(input, '.bundle.js');
    if (isOutputSameAsInput(input, outputPath)) return;

    await performBundling(moduleSystem, bundleOptions, input, outputPath);
  } catch (error) {
    handleCliFailure(error, t().commands.bundle.messages.bundleError);
  }
}

async function createModuleSystem(
  input: string,
  loaded: LoadedConfig,
  compilation: CompilerOptions
): Promise<ModuleSystem> {
  const { ModuleSystem } = await import('../module-system');
  const inputDir = path.dirname(path.resolve(input));
  const config = loaded.config;
  const resolution = config.moduleSystem?.resolution;
  return new ModuleSystem({
    resolution: {
      ...resolution,
      baseUrl: resolution?.baseUrl
        ? resolveFromConfig(loaded, resolution.baseUrl, inputDir)
        : inputDir,
    },
    loading: config.moduleSystem?.loading
      ? {
          ...config.moduleSystem.loading,
          encoding: config.moduleSystem.loading.encoding as BufferEncoding | undefined,
        }
      : undefined,
    compilation,
  });
}

function createBundleOptions(
  input: string,
  options: BundleOptions,
  loaded: LoadedConfig
): ModuleBundleOptions {
  const config = loaded.config;

  // -o is relative to the current directory, bundle.output to the config file.
  let outputPath: string | undefined;
  if (options.output) {
    outputPath = path.resolve(options.output);
  } else if (config.bundle?.output) {
    outputPath = resolveFromConfig(loaded, config.bundle.output, path.dirname(path.resolve(input)));
  }

  return {
    entryPoint: path.resolve(input),
    outputPath,
    // --format is checked by commander, bundle.format by the configuration
    format: options.format ?? config.bundle?.format ?? 'commonjs',
    globalName: options.globalName ?? config.bundle?.globalName,
    minify: options.minify ?? config.bundle?.minify,
    sourceMaps: options.sourceMap ?? config.bundle?.sourceMaps,
    inlineSources: options.inlineSources ?? config.bundle?.inlineSources,
    externals: options.externals ? options.externals.split(',') : config.bundle?.externals,
  };
}

async function performBundling(
  moduleSystem: ModuleSystem,
  bundleOptions: ModuleBundleOptions,
  input: string,
  outputPath: string
): Promise<void> {
  const messages = t().commands.bundle.messages;
  console.log(messages.bundling(input));
  const bundle = await moduleSystem.bundle(bundleOptions);

  fs.mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true });

  let outputCode = bundle.code;
  if (bundle.map) {
    const mapPath = `${outputPath}.map`;
    fs.writeFileSync(mapPath, bundle.map, 'utf8');
    outputCode = `${outputCode}\n//# sourceMappingURL=${path.basename(mapPath)}`;
    console.log(messages.sourceMapCreated(mapPath));
  }

  fs.writeFileSync(outputPath, outputCode, 'utf8');

  console.log(messages.bundleCreated(outputPath));

  const stats = moduleSystem.getStatistics();
  console.log(messages.bundledModules(stats.totalModules));
}

export interface CompileOptions extends CompilerOptions {
  noSourceMap?: boolean;
  noMinify?: boolean;
  /** `--no-type-check` is stored by commander as `typeCheck: false`. */
  typeCheck?: boolean;
  production?: boolean;
  /** Name of the input in the source map, relative to the map file. */
  sourceFileName?: string;
}

interface MergedCompileOptions {
  options: CompileOptions;
  outputFile: string;
  configPath?: string;
}

function mergeOptions(input: string, cliOptions: CompileOptions): MergedCompileOptions {
  const inputDir = path.dirname(path.resolve(input));
  const loaded = loadConfigWithPath(inputDir);
  const config = loaded.config.compilerOptions ?? {};
  const merged: CompileOptions = { ...config, ...cliOptions };

  // Handle negation flags - they override positive flags
  if (cliOptions.noSourceMap) {
    merged.sourceMap = false;
  }
  if (cliOptions.noMinify) {
    merged.minify = false;
  }
  if (cliOptions.typeCheck === false) {
    merged.noTypeCheck = true;
  }

  // Set default target if not specified
  if (!merged.target) {
    merged.target = DEFAULT_TARGET;
  }

  // Command-line paths are relative to the current directory, config paths to the config file.
  const outputName = replaceSomExtension(path.basename(input), '.js');
  let outputFile: string;
  if (cliOptions.output) {
    outputFile = cliOptions.output;
  } else if (cliOptions.outDir) {
    outputFile = path.join(path.resolve(cliOptions.outDir), outputName);
  } else if (config.output) {
    outputFile = resolveFromConfig(loaded, config.output, inputDir);
  } else if (config.outDir) {
    outputFile = path.join(resolveFromConfig(loaded, config.outDir, inputDir), outputName);
  } else {
    outputFile = replaceSomExtension(input, '.js');
  }

  return { options: merged, outputFile, configPath: loaded.configPath };
}

export function compileFile(input: string, options: CompileOptions): CompileResult {
  try {
    if (!fs.existsSync(input)) {
      const message = t().commands.compile.messages.fileNotFound(input);
      console.error(message);
      process.exitCode = 1;
      return { code: '', errors: [message], warnings: [] };
    }

    const source = fs.readFileSync(input, 'utf-8');
    const result = compile(source, {
      target: options.target,
      lib: options.lib,
      useDefineForClassFields: options.useDefineForClassFields,
      sourceMap: options.sourceMap,
      sourceFileName: options.sourceFileName,
      minify: options.minify,
      typeCheck: options.typeCheck !== false && !options.noTypeCheck,
      strict: options.strict,
      experimentalDecorators: options.experimentalDecorators,
    });

    if (result.errors.length > 0) {
      console.error(t().commands.compile.messages.compilationErrors);
      for (const error of result.errors) {
        console.error(`  ${error}`);
      }
      process.exitCode = 1;
    }

    if (result.warnings.length > 0) {
      console.warn(t().commands.compile.messages.warnings);
      for (const warning of result.warnings) {
        console.warn(`  ${warning}`);
      }
    }

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(t().common.error, message);
    process.exitCode = 1;
    return { code: '', errors: [message], warnings: [] };
  }
}

interface ExecuteOptions {
  cwd?: string;
  enableSourceMaps?: boolean;
}

export interface ExecutionResult {
  status: number | null;
  signal: string | null;
  error?: Error;
}

type ForwardedSignal = 'SIGINT' | 'SIGTERM' | 'SIGHUP';

const FORWARDED_SIGNALS: readonly ForwardedSignal[] = ['SIGINT', 'SIGTERM', 'SIGHUP'];

export const cliRuntime = {
  /**
   * Run a compiled file in a child Node process. Termination signals received by
   * the CLI are forwarded to the child, and the promise settles when it exits.
   */
  executeCompiledFile(
    filePath: string,
    forwardedArgv: string[] = [],
    options: ExecuteOptions = {}
  ): Promise<ExecutionResult> {
    return new Promise(resolve => {
      const nodeArgs = options.enableSourceMaps ? ['--enable-source-maps'] : [];
      const child = spawn(process.execPath, [...nodeArgs, filePath, ...forwardedArgv], {
        stdio: 'inherit',
        env: process.env,
        cwd: options.cwd,
      });

      const forwardSignal = (signal: ForwardedSignal): void => {
        try {
          child.kill(signal);
        } catch {
          // The child may already be gone, or the platform may not support the signal.
        }
      };
      for (const signal of FORWARDED_SIGNALS) {
        process.on(signal, forwardSignal);
      }

      let settled = false;
      const finish = (result: ExecutionResult): void => {
        if (settled) return;
        settled = true;
        for (const signal of FORWARDED_SIGNALS) {
          process.off(signal, forwardSignal);
        }
        resolve(result);
      };

      child.once('error', error => finish({ status: null, signal: null, error }));
      child.once('exit', (status, signal) => finish({ status, signal }));
    });
  },
};

/**
 * Create a private temporary directory for `run`, removed when `cleanup` is
 * called or, as a fallback, when the CLI process exits.
 */
function createRunWorkspace(input: string): { file: string; cleanup: () => void } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'somon-run-'));
  const baseName = path.basename(input).replace(/\.[^.]+$/, '') || 'somon-script';
  const file = path.join(dir, `${baseName}.js`);

  const cleanup = (): void => {
    process.off('exit', cleanup);
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch (cleanupError) {
      console.warn(
        t().commands.run.messages.cleanupFailed,
        cleanupError instanceof Error ? cleanupError.message : cleanupError
      );
    }
  };
  process.once('exit', cleanup);

  return { file, cleanup };
}

/**
 * Bundle source maps name sources relative to the entry directory; the temporary
 * bundle lives elsewhere, so point them at the original files with file URLs.
 */
function absoluteSourceMap(map: string, entryDir: string): string {
  const parsed = JSON.parse(map) as { sources?: string[] };
  if (Array.isArray(parsed.sources)) {
    parsed.sources = parsed.sources.map(source =>
      /^[a-z][a-z\d+.-]*:\/\//i.test(source)
        ? source
        : pathToFileURL(path.resolve(entryDir, source)).href
    );
  }
  return JSON.stringify(parsed);
}

async function executeRunCommand(
  input: string,
  scriptArgs: string[],
  options: RunOptions
): Promise<void> {
  let cleanup: (() => void) | undefined;
  try {
    const baseDir = path.dirname(path.resolve(input));
    const loaded = loadConfigWithPath(baseDir);
    const config = loaded.config;

    // Create module system and bundle the file with all dependencies
    const moduleSystem = await createModuleSystem(
      input,
      loaded,
      moduleCompilationOptions(config, options)
    );

    const sourceMaps = options.sourceMap ?? config.bundle?.sourceMaps ?? false;
    const bundle = await moduleSystem.bundle({
      entryPoint: path.resolve(input),
      format: 'commonjs',
      minify: options.minify ?? config.bundle?.minify,
      sourceMaps,
      inlineSources: false,
      externals: config.bundle?.externals,
      // The bundle runs from a temporary directory; modules keep their real locations.
      modulePaths: true,
    });

    const workspace = createRunWorkspace(input);
    cleanup = workspace.cleanup;
    const compiledFilePath = workspace.file;

    let code = bundle.code;
    if (sourceMaps && bundle.map) {
      const mapPath = `${compiledFilePath}.map`;
      fs.writeFileSync(mapPath, absoluteSourceMap(bundle.map, baseDir), 'utf8');
      code = `${code}\n//# sourceMappingURL=${path.basename(mapPath)}`;
    }
    fs.writeFileSync(compiledFilePath, code, 'utf8');

    const child = await cliRuntime.executeCompiledFile(compiledFilePath, scriptArgs, {
      cwd: baseDir,
      enableSourceMaps: sourceMaps && !!bundle.map,
    });

    const messages = t().commands.run.messages;
    if (child.error) {
      console.error(messages.failedToExecute, child.error.message ?? child.error);
      process.exitCode = 1;
    } else if (typeof child.status === 'number') {
      process.exitCode = child.status;
    } else if (typeof child.signal === 'string') {
      console.error(messages.terminatedWithSignal(child.signal));
      process.exitCode = 1;
    }
  } catch (error) {
    handleCliFailure(error, t().common.error);
  } finally {
    cleanup?.();
  }
}

/**
 * Display module statistics
 */
function displayModuleStatistics(moduleSystem: ModuleSystem): void {
  const messages = t().commands.moduleInfo.messages;
  const stats = moduleSystem.getStatistics();
  console.log(`\n${messages.moduleStatistics}`);
  console.log(`  ${messages.totalModules} ${stats.totalModules}`);
  console.log(`  ${messages.totalDependencies} ${stats.totalDependencies}`);
  console.log(`  ${messages.averageDependencies} ${stats.averageDependencies.toFixed(2)}`);
  console.log(`  ${messages.maxDepth} ${stats.maxDependencyDepth}`);
  console.log(`  ${messages.circularDependencies} ${stats.circularDependencies}`);
}

/**
 * Display dependency graph
 */
function displayDependencyGraph(moduleSystem: ModuleSystem, baseDir: string): void {
  const graph = moduleSystem.getDependencyGraph();
  console.log(`\n${t().commands.moduleInfo.messages.dependencyGraph}`);
  for (const [moduleId, deps] of graph) {
    const relativePath = path.relative(baseDir, moduleId);
    console.log(`  ${relativePath}:`);
    for (const dep of deps) {
      console.log(`    └── ${dep}`);
    }
  }
}

/**
 * Display circular dependency validation results
 */
function displayCircularDependencies(moduleSystem: ModuleSystem): void {
  const messages = t().commands.moduleInfo.messages;
  const validation = moduleSystem.validate();
  if (validation.isValid) {
    console.log(`\n${messages.noCircularDeps}`);
  } else {
    console.log(`\n${messages.issuesFound}`);
    for (const error of validation.errors) {
      console.log(`  • ${error}`);
    }
  }
}

type CommandKey = Exclude<keyof Translations['commands'], 'somon'>;

/**
 * Register a command under its English name. The English short alias and the
 * name and alias in the current interface language are added as aliases, so the
 * English spelling works in every language.
 */
function defineCommand(
  program: Command,
  name: string,
  key: CommandKey,
  englishAlias?: string
): Command {
  const tr = t().commands[key];
  const command = program.command(name).description(tr.description);
  // The localized name comes first so help lists it next to the English name.
  const aliases = [tr.name, englishAlias, 'alias' in tr ? tr.alias : undefined];
  for (const alias of aliases) {
    if (alias && alias !== name && !command.aliases().includes(alias)) {
      command.alias(alias);
    }
  }
  return command;
}

/** Options shared by every command that compiles SomonScript (compile, run, bundle). */
function addCompilerOptions(command: Command): Command {
  const options = t().commands.compile.options;
  return command
    .addOption(new Option('--target <target>', options.target).choices(TARGETS))
    .addOption(new Option('--lib <libs>', options.lib).argParser(parseLibList))
    .option('--use-define-for-class-fields', options.useDefineForClassFields)
    .option('--no-use-define-for-class-fields', options.noUseDefineForClassFields)
    .option('--source-map', options.sourceMap)
    .option('--no-source-map', options.noSourceMap)
    .option('--minify', options.minify)
    .option('--no-minify', options.noMinify)
    .option('--no-type-check', options.noTypeCheck)
    .option('--strict', options.strict)
    .option('--experimental-decorators', options.experimentalDecorators)
    .addOption(new Option('--production').hideHelp());
}

export function createProgram(): Command {
  const program = new Command();
  const tr = t();

  program
    .name('somon')
    .description(tr.commands.somon.description)
    .version(pkg.version, '-V, --version', tr.common.version)
    // The language itself is detected from argv before the program is built (see cli.ts).
    .addOption(new Option('--lang <language>', tr.common.languageOption).choices(LANGUAGES))
    .helpOption('-h, --help', tr.common.help)
    .addHelpCommand('help [command]', tr.common.help)
    .hook('preAction', (_program, actionCommand) => {
      if (actionCommand.opts().production) {
        console.warn(t().common.productionDeprecated);
      }
    });

  const compileCommand = defineCommand(program, 'compile', 'compile', 'c')
    .usage(tr.commands.compile.usage)
    .argument('<input>', tr.commands.compile.args.input)
    .option('-o, --output <file>', tr.commands.compile.options.output)
    .option('--out-dir <dir>', tr.commands.compile.options.outDir);
  addCompilerOptions(compileCommand)
    .option('-w, --watch', tr.commands.compile.options.watch)
    .action((input: string, options: CompileOptions): void => {
      try {
        let merged: MergedCompileOptions;
        try {
          merged = mergeOptions(input, options);
        } catch (error) {
          handleCliFailure(error, t().common.error);
          return;
        }

        const shouldWatch = !!(merged.options.watch || merged.options.compileOnSave);

        const compileOnce = (): boolean => {
          try {
            merged = mergeOptions(input, options);
          } catch (error) {
            handleCliFailure(error, t().common.error);
            return false;
          }

          const { outputFile } = merged;
          if (isOutputSameAsInput(input, outputFile)) return false;

          const outputDir = path.dirname(path.resolve(outputFile));
          const result = compileFile(input, {
            ...merged.options,
            sourceFileName: path.relative(outputDir, path.resolve(input)).split(path.sep).join('/'),
          });
          if (result.errors.length > 0) return false;

          fs.mkdirSync(outputDir, { recursive: true });
          const sourceMapFile =
            merged.options.sourceMap && result.sourceMap ? `${outputFile}.map` : undefined;
          let code = result.code;
          if (sourceMapFile) {
            const map = JSON.parse(result.sourceMap!) as { file?: string };
            map.file = path.basename(outputFile);
            fs.writeFileSync(sourceMapFile, JSON.stringify(map));
            code = `${code}\n//# sourceMappingURL=${path.basename(sourceMapFile)}`;
          }
          fs.writeFileSync(outputFile, code);
          console.log(t().commands.compile.messages.compiled(input, outputFile));
          if (sourceMapFile) {
            console.log(t().commands.compile.messages.sourceMapGenerated(sourceMapFile));
          }

          // A successful recompile clears the failure of an earlier one.
          process.exitCode = 0;
          return true;
        };

        const initialSuccess = compileOnce();
        if (!initialSuccess && !shouldWatch) {
          return;
        }

        if (shouldWatch && process.env.NODE_ENV !== 'test') {
          watchAndRecompile(input, merged.configPath, compileOnce);
        } else if (shouldWatch) {
          // In test environment, just log the message without actually watching
          console.log(t().commands.compile.messages.watching(input));
        }
      } catch (error) {
        handleCliFailure(error, t().common.error);
        return;
      }
    });

  const runCommand = defineCommand(program, 'run', 'run', 'r')
    .usage(tr.commands.run.usage)
    .argument('<input>', tr.commands.run.args.input)
    .argument('[args...]', tr.commands.run.args.args);
  addCompilerOptions(runCommand).action(
    async (input: string, scriptArgs: string[], options: RunOptions): Promise<void> => {
      await executeRunCommand(input, scriptArgs, options);
    }
  );

  defineCommand(program, 'init', 'init')
    .argument('[name]', tr.commands.init.args.name, 'somon-project')
    .action((name: string): void => {
      try {
        const projectDir = path.resolve(name);
        const messages = t().commands.init.messages;

        if (fs.existsSync(projectDir)) {
          console.error(messages.directoryExists(name));
          process.exitCode = 1;
          return;
        }

        // Create project directory
        fs.mkdirSync(projectDir, { recursive: true });

        // Create package.json
        const packageJson = {
          name,
          version: '0.1.0',
          description: 'A SomonScript project',
          main: 'dist/main.js',
          scripts: {
            build: 'somon compile src/main.som -o dist/main.js',
            dev: 'somon run src/main.som',
          },
          devDependencies: {
            [pkg.name]: `^${pkg.version}`,
          },
        };

        fs.writeFileSync(
          path.join(projectDir, 'package.json'),
          JSON.stringify(packageJson, null, 2)
        );

        // Create src and dist directories
        fs.mkdirSync(path.join(projectDir, 'src'));
        fs.mkdirSync(path.join(projectDir, 'dist'));

        // Create default configuration
        const somonConfig = {
          compilerOptions: {
            target: DEFAULT_TARGET,
            sourceMap: false,
            minify: false,
            noTypeCheck: false,
            strict: false,
            outDir: 'dist',
            watch: false,
            compileOnSave: false,
          },
        };

        fs.writeFileSync(
          path.join(projectDir, 'somon.config.json'),
          JSON.stringify(somonConfig, null, 2)
        );

        // Create main file
        const mainSom = `// SomonScript main file
функсия салом(): void {
    чоп.сабт("Салом, ҷаҳон!");
}

салом();
`;

        fs.writeFileSync(path.join(projectDir, 'src', 'main.som'), mainSom);

        console.log(messages.projectCreated(name));
        console.log(`\n${messages.nextSteps}`);
        console.log(`  cd ${name}`);
        console.log(`  npm install`);
        console.log(`  npm run dev`);
      } catch (error) {
        handleCliFailure(error, t().common.error);
      }
    });

  // Bundle command
  const bundleCommand = defineCommand(program, 'bundle', 'bundle', 'b')
    .usage(tr.commands.bundle.usage)
    .argument('<input>', tr.commands.bundle.args.input)
    .option('-o, --output <file>', tr.commands.bundle.options.output)
    .addOption(
      new Option('-f, --format <format>', tr.commands.bundle.options.format).choices(BUNDLE_FORMATS)
    )
    .addOption(
      new Option('--global-name <name>', tr.commands.bundle.options.globalName).argParser(
        parseGlobalName
      )
    )
    .option('--inline-sources', tr.commands.bundle.options.inlineSources)
    .option('--externals <modules>', tr.commands.bundle.options.externals);
  addCompilerOptions(bundleCommand).action(async (input: string, options: BundleOptions) => {
    await executeBundleCommand(input, options);
  });

  // Module info command
  defineCommand(program, 'module-info', 'moduleInfo', 'info')
    .usage(tr.commands.moduleInfo.usage)
    .argument('<input>', tr.commands.moduleInfo.args.input)
    .option('--graph', tr.commands.moduleInfo.options.graph)
    .option('--stats', tr.commands.moduleInfo.options.stats)
    .option('--circular', tr.commands.moduleInfo.options.circular)
    .action(
      async (input: string, options: { graph?: boolean; stats?: boolean; circular?: boolean }) => {
        try {
          const baseDir = path.dirname(path.resolve(input));
          const loaded = loadConfigWithPath(baseDir);
          const moduleSystem = await createModuleSystem(
            input,
            loaded,
            moduleCompilationOptions(loaded.config, {})
          );

          console.log(t().commands.moduleInfo.messages.analyzing(input));
          const resolvedInput = path.resolve(input);
          await moduleSystem.loadModule(resolvedInput, path.dirname(resolvedInput));

          if (options.stats) {
            displayModuleStatistics(moduleSystem);
          }

          if (options.graph) {
            displayDependencyGraph(moduleSystem, baseDir);
          }

          if (options.circular) {
            displayCircularDependencies(moduleSystem);
          }
        } catch (error) {
          handleCliFailure(error, t().commands.moduleInfo.messages.analysisError);
        }
      }
    );

  // Resolve command
  defineCommand(program, 'resolve', 'resolve')
    .usage(tr.commands.resolve.usage)
    .argument('<specifier>', tr.commands.resolve.args.specifier)
    .option('-f, --from <file>', tr.commands.resolve.options.from)
    .action(async (specifier: string, options: { from?: string }) => {
      const messages = t().commands.resolve.messages;
      try {
        const { ModuleResolver } = await import('../module-system');
        // Use explicit path resolution instead of process.cwd()
        const fromFile = options.from ?? path.resolve('.');
        const resolver = new ModuleResolver({
          baseUrl: path.dirname(path.resolve(fromFile)),
        });
        const resolved = resolver.resolve(specifier, fromFile);

        console.log(messages.resolved(specifier));
        console.log(`  ${messages.path} ${resolved.resolvedPath}`);
        console.log(`  ${messages.extension} ${resolved.extension}`);
        console.log(
          `  ${messages.external} ${resolved.isExternalLibrary ? messages.yes : messages.no}`
        );
        if (resolved.packageName) {
          console.log(`  ${messages.package} ${resolved.packageName}`);
        }
      } catch (error) {
        handleCliFailure(error, messages.resolveError);
      }
    });

  // Developer tools: fmt, repl, migrate
  registerToolCommands((name, key, alias) => defineCommand(program, name, key, alias), pkg.version);

  return program;
}

/**
 * Watch the input and its config file and recompile on change until the CLI
 * receives a termination signal.
 */
function watchAndRecompile(
  input: string,
  configPath: string | undefined,
  compileOnce: () => boolean
): void {
  const messages = t().commands.compile.messages;
  console.log(messages.watching(input));
  const absoluteInput = path.resolve(input);
  const watchTargets = new Set<string>([
    absoluteInput,
    configPath ?? path.resolve(path.dirname(absoluteInput), 'somon.config.json'),
  ]);

  const watcher = chokidar.watch(Array.from(watchTargets), {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 150,
      pollInterval: 20,
    },
  });

  const handleFileEvent = (eventType: 'add' | 'change' | 'unlink', changedPath: string): void => {
    const normalizedPath = path.resolve(changedPath);

    if (normalizedPath === absoluteInput) {
      if (eventType === 'unlink') {
        console.warn(messages.sourceRemoved(input));
        return;
      }
      console.log(messages.recompiling(input));
      compileOnce();
      return;
    }

    if (eventType === 'unlink') {
      console.warn(messages.configRemoved(path.basename(normalizedPath)));
      return;
    }

    console.log(messages.configChanged(path.basename(normalizedPath)));
    compileOnce();
  };

  watcher
    .on('add', (changedPath: string) => handleFileEvent('add', changedPath))
    .on('change', (changedPath: string) => handleFileEvent('change', changedPath))
    .on('unlink', (changedPath: string) => handleFileEvent('unlink', changedPath))
    .on('error', (error: unknown) => {
      console.error(messages.watchError, error instanceof Error ? error.message : String(error));
    });

  // One shutdown path: close the watcher, then exit with the result of the last compile.
  let closing = false;
  const shutdown = (signal: ForwardedSignal): void => {
    if (closing) return;
    closing = true;
    console.log(`\n${messages.stoppingWatcher(signal)}`);
    watcher
      .close()
      .catch((error: unknown) => {
        console.error(
          messages.watchCloseFailed,
          error instanceof Error ? error.message : String(error)
        );
      })
      .finally(() => process.exit(process.exitCode ?? 0));
  };

  for (const signal of FORWARDED_SIGNALS) {
    process.once(signal, shutdown);
  }
}

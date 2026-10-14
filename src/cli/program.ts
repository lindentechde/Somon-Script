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

import { compile, formatTypeError, type CompileResult } from '../compiler';
import {
  ConfigError,
  isLearningMode,
  loadConfigWithPath,
  type CompilerOptions,
  type LoadedConfig,
  type SomonConfig,
} from '../config';
import {
  formatDiagnostic,
  formatDiagnosticLine,
  formatFailure,
  type Diagnostic,
  type DiagnosticLanguage,
} from '../diagnostics';
import type { ModuleSystem, BundleOptions as ModuleBundleOptions } from '../module-system';
import { BundleError } from '../module-system/module-system';
import {
  BUNDLE_FORMATS,
  DEFAULT_TARGET,
  normalizeLib,
  TARGETS,
  validateGlobalName,
  validateLib,
} from '../targets';
import type { CompilationResult, CompilationWarning } from '../module-system/module-system';
import { Lexer } from '../lexer';
import { Parser } from '../parser';
import { checkWithTypeScript, type TsCheckInput } from '../tsc-checker';
import { i18n, LANGUAGES, t, type Translations } from './i18n';
import { registerLspCommand } from './lsp-command';
import { registerToolCommands } from './tool-commands';
// Read package.json at runtime to avoid import attribute issues: the nearest one
// at or above this file (src/cli in a checkout, dist/cli in the package).
function findPackageRoot(): string {
  for (let dir = __dirname; ; dir = path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, 'package.json'))) return dir;
    if (path.dirname(dir) === dir) throw new Error('package.json not found');
  }
}
const packageRoot = findPackageRoot();
const pkg = JSON.parse(fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8')) as {
  name: string;
  version: string;
};

/**
 * The run time `somon run` loads before a program (src/runtime/node-prelude.ts,
 * built into dist/ also when the CLI runs from its TypeScript sources).
 */
export function runtimePreludePath(): string {
  return path.join(packageRoot, 'dist', 'runtime', 'node-prelude.js');
}

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

const MODULE_FORMATS = ['commonjs', 'esm'] as const;
const CHECKERS = ['somon', 'typescript'] as const;

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

  if (!process.exitCode) {
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
  module?: CompilerOptions['module'];
  checker?: CompilerOptions['checker'];
}

interface BundleOptions extends CliCompilerFlags {
  output?: string;
  format?: ModuleBundleOptions['format'];
  globalName?: string;
  inlineSources?: boolean;
  externals?: string;
}

interface RunOptions extends CliCompilerFlags {
  /** `--stack`, or its Tajik and Russian spelling `--стек`. */
  stack?: boolean;
  стек?: boolean;
}

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
  if (flags.module !== undefined) overrides.module = flags.module;
  if (flags.checker !== undefined) overrides.checker = flags.checker;
  return overrides;
}

/** Diagnostics language: the config's `locale`, otherwise the CLI's own language (`--lang`). */
function diagnosticLocale(config?: CompilerOptions): NonNullable<CompilerOptions['locale']> {
  return config?.locale ?? i18n.getLanguage();
}

/**
 * The language of diagnostics written for learners (src/diagnostics): Russian
 * or Tajik; in English the compiler's messages stay as they always were.
 */
function learnerLanguage(config?: CompilerOptions): DiagnosticLanguage | undefined {
  const locale = diagnosticLocale(config);
  return locale === 'en' ? undefined : locale;
}

/** A path as the learner typed it: relative to the current directory. */
function shownPath(file: string): string {
  return path.relative(process.cwd(), file) || file;
}

/** Prints diagnostics of one file as blocks with its code; errors to stderr, warnings too. */
function printDiagnostics(
  diagnostics: readonly Diagnostic[],
  options: { language: DiagnosticLanguage; source?: string; file: string }
): void {
  for (const diagnostic of diagnostics) {
    console.error(formatDiagnostic(diagnostic, options));
  }
}

/**
 * Reports a build that did not compile, for learners: each error with its
 * line of code, then `Барнома компайл нашуд: N хато.` Returns false for
 * other failures, which are reported as before.
 */
function reportBuildFailure(error: unknown, language: DiagnosticLanguage | undefined): boolean {
  if (!(error instanceof BundleError) || language === undefined) return false;
  const sources = new Map<string, string | undefined>();
  const sourceOf = (file: string): string | undefined => {
    if (!sources.has(file)) {
      // The files of the program the learner runs (S8707)
      sources.set(file, fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : undefined); // NOSONAR
    }
    return sources.get(file);
  };
  for (const failure of error.errors) {
    const diagnostic: Diagnostic = failure.diagnostic ?? {
      code: 'MODULE_ERROR',
      severity: 'error',
      message: failure.message,
      line: failure.line,
      column: failure.column,
    };
    const file = failure.filePath;
    console.error(
      formatDiagnostic(diagnostic, { language, source: sourceOf(file), file: shownPath(file) })
    );
  }
  console.error(formatFailure(error.errors.length, language));
  process.exitCode = 1;
  return true;
}

/**
 * Compiler options for the module system: config compilerOptions, then the more
 * specific moduleSystem.compilation section, then the command-line flags.
 */
function moduleCompilationOptions(config: SomonConfig, flags: CliCompilerFlags): CompilerOptions {
  // Output paths and watch settings in compilerOptions only apply to `compile`.
  const { target, sourceMap, minify, noTypeCheck, strict, experimentalDecorators } =
    config.compilerOptions ?? {};
  const { lib, useDefineForClassFields, module, checker } = config.compilerOptions ?? {};
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
      module,
      checker,
    }).filter(([, value]) => value !== undefined)
  ) as CompilerOptions;
  return {
    locale: diagnosticLocale(config.compilerOptions),
    ...(isLearningMode(config) && { learningMode: true }),
    ...fromConfig,
    ...config.moduleSystem?.compilation,
    ...cliCompilerOverrides(flags),
  };
}

/**
 * Resolve a path from the config file relative to the directory of that file
 * (a value of the configuration means there is a config file).
 */
function resolveFromConfig(loaded: LoadedConfig, value: string): string {
  return path.resolve(loaded.configDir!, value);
}

/** `x.som` → `x<suffix>`, anything else → `x.ext<suffix>` so the input is never overwritten. */
function replaceSomExtension(file: string, suffix: string): string {
  return /\.som$/i.test(file) ? file.replace(/\.som$/i, suffix) : `${file}${suffix}`;
}

/**
 * The declaration file TypeScript reads for a JavaScript file: `x.js` → `x.d.ts`,
 * `x.mjs` → `x.d.mts`, `x.cjs` → `x.d.cts`; any other name gets `.d.ts` appended.
 */
function declarationFileFor(output: string): string {
  const extension = /\.([cm]?)js$/i.exec(output);
  if (!extension) return `${output}.d.ts`;
  return `${output.slice(0, extension.index)}.d.${extension[1].toLowerCase()}ts`;
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
    if (!reportBuildFailure(error, learnerLanguage(compilationLocale(input)))) {
      handleCliFailure(error, t().commands.bundle.messages.bundleError);
    }
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
      baseUrl: resolution?.baseUrl ? resolveFromConfig(loaded, resolution.baseUrl) : inputDir,
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
    outputPath = resolveFromConfig(loaded, config.bundle.output);
  }

  return {
    entryPoint: path.resolve(input),
    outputPath,
    // --format is checked by commander, bundle.format by the configuration.
    // Without either the module system chooses: esm when modules compile to
    // ES modules, commonjs otherwise.
    format: options.format ?? config.bundle?.format,
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

  console.log(messages.bundledModules(bundle.moduleCount));
}

export interface CompileOptions extends CompilerOptions {
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
  // `--no-source-map` and `--no-minify` arrive as `sourceMap: false` and
  // `minify: false`, so the command line overrides the configuration.
  const merged: CompileOptions = { ...config, ...cliOptions };

  if (cliOptions.typeCheck === false) {
    merged.noTypeCheck = true;
  }
  if (isLearningMode(loaded.config)) {
    merged.learningMode = true;
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
    outputFile = resolveFromConfig(loaded, config.output);
  } else if (config.outDir) {
    outputFile = path.join(resolveFromConfig(loaded, config.outDir), outputName);
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
      module: options.module,
      checker: options.checker,
      locale: diagnosticLocale(options),
      language: learnerLanguage(options),
      declaration: options.declaration,
      learningMode: options.learningMode,
      filePath: path.resolve(input),
    });

    const language = learnerLanguage(options);
    if (language && result.diagnostics) {
      const where = { language, source, file: shownPath(path.resolve(input)) };
      printDiagnostics(result.diagnostics, where);
      if (result.errors.length > 0) {
        console.error(formatFailure(result.errors.length, language));
        process.exitCode = 1;
      }
      return result;
    }

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
  /** Modules Node.js loads before the program (`--require`). */
  preload?: string[];
  /** Variables added to the program's environment. */
  env?: Record<string, string>;
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
      for (const module of options.preload ?? []) nodeArgs.push('--require', module);
      const child = spawn(process.execPath, [...nodeArgs, filePath, ...forwardedArgv], {
        stdio: 'inherit',
        env: options.env ? { ...process.env, ...options.env } : process.env,
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
function createRunWorkspace(input: string): { dir: string; file: string; cleanup: () => void } {
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

  return { dir, file, cleanup };
}

/**
 * Bundle source maps name sources by their paths relative to the entry
 * directory; the temporary bundle lives elsewhere, so point them at the
 * original files with file URLs.
 */
function absoluteSourceMap(map: string, entryDir: string): string {
  const parsed = JSON.parse(map) as { sources: string[] };
  parsed.sources = parsed.sources.map(source => pathToFileURL(path.resolve(entryDir, source)).href);
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
    const compilation = moduleCompilationOptions(config, options);
    const moduleSystem = await createModuleSystem(input, loaded, compilation);

    const sourceMaps = options.sourceMap ?? config.bundle?.sourceMaps ?? false;
    const language = learnerLanguage(config.compilerOptions);
    const runtime = runtimeOptions(language, options);
    if (compilation.module === 'esm') {
      const workspace = createRunWorkspace(input);
      cleanup = workspace.cleanup;
      const entryFile = await writeEsmModules(moduleSystem, input, workspace.dir, {
        // Errors are explained at their place in the .som files, through source maps
        sourceMaps: sourceMaps || language !== undefined,
        externals: config.bundle?.externals,
        language,
      });
      reportChildResult(
        await cliRuntime.executeCompiledFile(entryFile, scriptArgs, {
          cwd: baseDir,
          enableSourceMaps: sourceMaps,
          ...runtime,
        })
      );
      return;
    }
    const bundle = await moduleSystem.bundle({
      entryPoint: path.resolve(input),
      format: 'commonjs',
      minify: options.minify ?? config.bundle?.minify,
      sourceMaps: sourceMaps || language !== undefined,
      inlineSources: false,
      externals: config.bundle?.externals,
      // The bundle runs from a temporary directory; modules keep their real locations.
      modulePaths: true,
      logWarnings: false,
    });
    reportRunWarnings(bundle.warnings ?? [], language);

    const workspace = createRunWorkspace(input);
    cleanup = workspace.cleanup;
    const compiledFilePath = workspace.file;

    let code = bundle.code;
    if (bundle.map) {
      const mapPath = `${compiledFilePath}.map`;
      fs.writeFileSync(mapPath, absoluteSourceMap(bundle.map, baseDir), 'utf8');
      code = `${code}\n//# sourceMappingURL=${path.basename(mapPath)}`;
    }
    fs.writeFileSync(compiledFilePath, code, 'utf8');

    const child = await cliRuntime.executeCompiledFile(compiledFilePath, scriptArgs, {
      cwd: baseDir,
      enableSourceMaps: sourceMaps && !!bundle.map,
      ...runtime,
    });
    reportChildResult(child);
  } catch (error) {
    if (!reportBuildFailure(error, learnerLanguage(compilationLocale(input)))) {
      handleCliFailure(error, t().common.error);
    }
  } finally {
    cleanup?.();
  }
}

/** The configured `locale` of the program at `input`, if its configuration can be read. */
function compilationLocale(input: string): CompilerOptions | undefined {
  try {
    return loadConfigWithPath(path.dirname(path.resolve(input))).config.compilerOptions;
  } catch {
    // A configuration that does not load is reported by the command itself
    return undefined;
  }
}

/** The compiler's own prefix of a type warning: `Type warning [CODE] at line 3, column 5: `. */
const TYPE_WARNING_PREFIX = /^Type warning \[\w+\] at line (\d+), column (\d+): /;

/**
 * Prints the warnings of compiling a program before it runs, one line each:
 * `Огоҳӣ: барнома.som:3:5: …`, the file relative to the current directory.
 */
function reportRunWarnings(
  warnings: CompilationWarning[],
  language: DiagnosticLanguage | undefined
): void {
  for (const warning of warnings) {
    if (warning.diagnostic && language) {
      const file = warning.filePath === undefined ? undefined : shownPath(warning.filePath);
      console.warn(formatDiagnosticLine(warning.diagnostic, { language, file }));
      continue;
    }
    const position = TYPE_WARNING_PREFIX.exec(warning.message);
    const message = warning.message.replace(TYPE_WARNING_PREFIX, '').split('\n')[0];
    const location = [
      warning.filePath === undefined ? undefined : path.relative(process.cwd(), warning.filePath),
      position?.[1],
      position?.[2],
    ].filter(part => part !== undefined);
    const where = location.length > 0 ? `${location.join(':')}: ` : '';
    console.warn(`${t().commands.run.messages.warning}: ${where}${message}`);
  }
}

/**
 * How the program runs: with the learner's run time loaded, which in Tajik or
 * Russian also explains errors the program does not catch, at their place in
 * the .som file of the learner (`SOMON_RUN_*`, read by src/runtime/node-prelude.ts).
 */
function runtimeOptions(
  language: DiagnosticLanguage | undefined,
  options: RunOptions
): Pick<ExecuteOptions, 'preload' | 'env'> {
  const preload = [runtimePreludePath()];
  if (language === undefined) return { preload };
  const env: Record<string, string> = {
    SOMON_RUN_LANGUAGE: language,
    SOMON_RUN_CWD: process.cwd(),
  };
  if (options.stack || options.стек) env.SOMON_RUN_STACK = '1';
  return { preload, env };
}

/** Sets the CLI's exit code from the program it ran. */
function reportChildResult(child: ExecutionResult): void {
  const messages = t().commands.run.messages;
  if (child.error) {
    console.error(messages.failedToExecute, child.error.message);
    process.exitCode = 1;
  } else if (typeof child.status === 'number') {
    process.exitCode = child.status;
  } else if (typeof child.signal === 'string') {
    console.error(messages.terminatedWithSignal(child.signal));
    process.exitCode = 1;
  }
}

/** The errors of a module system compilation, one per paragraph, with their files. */
function formatCompilationErrors(result: CompilationResult): string {
  const details = result.errors.map((error, index) => {
    const position =
      error.line === undefined
        ? ''
        : `:${error.line}${error.column === undefined ? '' : `:${error.column}`}`;
    return `  ${index + 1}. ${error.filePath}${position}\n     ${error.message}`;
  });
  return `Compilation failed with ${result.errors.length} error(s):\n\n${details.join('\n\n')}`;
}

/**
 * ES module output for `run --module esm`: every module of the program is
 * compiled as an ES module and written to `dir` with its place relative to
 * the others (`м.som` → `м.js`), next to a package.json with "type": "module"
 * and a link to the program's node_modules. Returns the entry file to run.
 */
async function writeEsmModules(
  moduleSystem: ModuleSystem,
  input: string,
  dir: string,
  options: { sourceMaps: boolean; externals?: string[]; language?: DiagnosticLanguage }
): Promise<string> {
  const entry = path.resolve(input);
  const result = await moduleSystem.compile(entry, options.externals, {
    module: 'esm',
    minify: false,
    sourceMap: options.sourceMaps,
  });
  if (result.errors.length > 0) {
    throw new BundleError(formatCompilationErrors(result), result.errors, []);
  }
  reportRunWarnings(result.warningDetails ?? [], options.language);
  const files = [...result.modules.keys()].filter(id => path.isAbsolute(id));
  const root = commonDirectory(
    path.dirname(entry),
    files.map(file => path.dirname(file))
  );
  const modulePath = (file: string): string =>
    path.join(dir, path.relative(root, file).replace(/\.som$/i, '.js'));
  // The entry is compiled as SomonScript whatever its name; Node.js runs an ES module
  // only from a .js or .mjs file, so `prog.txt` is written as `prog.txt.js`
  const outputPath = (file: string): string => {
    const target = modulePath(file);
    return file === result.entryPoint && !/\.m?js$/i.test(target) ? `${target}.js` : target;
  };

  // The program the user runs, written into its temporary directory (S8707)
  fs.writeFileSync(path.join(dir, 'package.json'), '{ "type": "module" }\n');
  const nodeModules = findNodeModules(path.dirname(entry));
  if (nodeModules) {
    fs.symlinkSync(nodeModules, path.join(dir, 'node_modules'), 'junction'); // NOSONAR
  }
  for (const id of files) {
    const compiled = result.modules.get(id)!;
    const target = outputPath(id);
    fs.mkdirSync(path.dirname(target), { recursive: true }); // NOSONAR
    let code = compiled.code;
    if (options.sourceMaps && compiled.map) {
      fs.writeFileSync(`${target}.map`, JSON.stringify(compiled.map)); // NOSONAR
      code = `${code}\n//# sourceMappingURL=${path.basename(target)}.map`;
    }
    fs.writeFileSync(target, code); // NOSONAR
  }
  return outputPath(result.entryPoint);
}

/** The deepest directory containing `first` and every one of `others`. */
function commonDirectory(first: string, others: string[]): string {
  return others.reduce((common, directory) => {
    let candidate = common;
    while (path.relative(candidate, directory).startsWith('..')) {
      candidate = path.dirname(candidate);
    }
    return candidate;
  }, first);
}

/** The nearest node_modules directory at or above `start`. */
function findNodeModules(start: string): string | undefined {
  for (let dir = start; ; dir = path.dirname(dir)) {
    const candidate = path.join(dir, 'node_modules');
    // Above the program the user runs (S8707)
    if (fs.existsSync(candidate)) return candidate; // NOSONAR
    if (path.dirname(dir) === dir) return undefined;
  }
}

interface CheckOptions {
  checker?: CompilerOptions['checker'];
  strict?: boolean;
  target?: CompilerOptions['target'];
  lib?: string[];
  experimentalDecorators?: boolean;
}

/** What `somon check` checks with: its flags over the configuration's compilerOptions. */
type CheckSettings = Required<Pick<CheckOptions, 'checker'>> &
  Omit<CheckOptions, 'checker'> &
  Pick<CompilerOptions, 'useDefineForClassFields'>;

/**
 * `somon check <files…>`: type-check without writing output. Errors are
 * printed per file; the exit code is 1 when there are any.
 */
function executeCheckCommand(files: string[], options: CheckOptions): void {
  try {
    // commander requires at least one file
    const config =
      loadConfigWithPath(path.dirname(path.resolve(files[0]))).config.compilerOptions ?? {};
    const results = checkFiles(
      files,
      {
        checker: options.checker ?? config.checker ?? 'typescript',
        strict: options.strict ?? config.strict,
        target: options.target ?? config.target,
        lib: options.lib ?? config.lib,
        useDefineForClassFields: config.useDefineForClassFields,
        experimentalDecorators: options.experimentalDecorators ?? config.experimentalDecorators,
      },
      diagnosticLocale(config)
    );
    reportCheckResults(results, files.length);
  } catch (error) {
    handleCliFailure(error, t().common.error);
  }
}

/** The errors of each file, formatted; TypeScript checks all files in one program. */
function checkFiles(
  files: string[],
  options: CheckSettings,
  locale: NonNullable<CompilerOptions['locale']>
): Map<string, string[]> {
  const { checker, ...settings } = options;
  const results = new Map<string, string[]>();
  const inputs: TsCheckInput[] = [];
  for (const file of files) {
    // Checking the files the user names is the command's purpose (S8707)
    if (!fs.existsSync(file)) {
      results.set(file, [t().commands.compile.messages.fileNotFound(file)]);
      continue;
    }
    const source = fs.readFileSync(file, 'utf-8'); // NOSONAR
    if (checker === 'somon') {
      results.set(file, compile(source, { ...settings, filePath: path.resolve(file) }).errors);
      continue;
    }
    const parser = new Parser(new Lexer(source).tokenize());
    const ast = parser.parse();
    results.set(file, parser.getErrors());
    if (parser.getErrors().length === 0) inputs.push({ fileName: file, source, ast });
  }
  if (inputs.length > 0) {
    checkWithTypeScript(inputs, { ...settings, locale }).forEach((result, index) => {
      results.set(inputs[index].fileName, result.errors.map(formatTypeError));
    });
  }
  return results;
}

/** Prints the errors per file and a summary; the exit code is 1 when there are errors. */
function reportCheckResults(results: Map<string, string[]>, fileCount: number): void {
  const messages = t().commands.check.messages;
  let errorCount = 0;
  let filesWithErrors = 0;
  for (const [file, errors] of results) {
    if (errors.length === 0) continue;
    errorCount += errors.length;
    filesWithErrors++;
    console.error(messages.fileErrors(file));
    for (const error of errors) {
      console.error(`  ${error.replace(/\n/g, '\n  ')}`);
    }
  }
  if (errorCount > 0) {
    console.error(messages.errorsFound(errorCount, filesWithErrors));
    process.exitCode = 1;
  } else {
    console.log(messages.noErrors(fileCount));
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

/**
 * Options shared by every command that compiles SomonScript (compile, run,
 * bundle); `--module` only where the output is not a bundle.
 */
function addCompilerOptions(command: Command, withModule = true): Command {
  const options = t().commands.compile.options;
  if (withModule) {
    command.addOption(new Option('--module <format>', options.module).choices(MODULE_FORMATS));
  }
  return command
    .addOption(new Option('--checker <checker>', options.checker).choices(CHECKERS))
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
    .option('--declaration', tr.commands.compile.options.declaration)
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
          if (merged.options.declaration && result.declaration !== undefined) {
            const declarationFile = declarationFileFor(outputFile);
            // Next to the output the user names (S8707)
            fs.writeFileSync(declarationFile, result.declaration); // NOSONAR
            console.log(t().commands.compile.messages.declarationGenerated(declarationFile));
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
  addCompilerOptions(runCommand)
    .option('--stack', tr.commands.run.options.stack)
    .addOption(new Option('--стек').hideHelp())
    .action(async (input: string, scriptArgs: string[], options: RunOptions): Promise<void> => {
      await executeRunCommand(input, scriptArgs, options);
    });

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
  addCompilerOptions(bundleCommand, false).action(async (input: string, options: BundleOptions) => {
    await executeBundleCommand(input, options);
  });

  defineCommand(program, 'check', 'check')
    .usage(tr.commands.check.usage)
    .argument('<files...>', tr.commands.check.args.files)
    .addOption(
      new Option('--checker <checker>', tr.commands.compile.options.checker).choices(CHECKERS)
    )
    .addOption(new Option('--target <target>', tr.commands.compile.options.target).choices(TARGETS))
    .addOption(new Option('--lib <libs>', tr.commands.compile.options.lib).argParser(parseLibList))
    .option('--strict', tr.commands.compile.options.strict)
    .option('--experimental-decorators', tr.commands.compile.options.experimentalDecorators)
    .action((files: string[], options: CheckOptions): void => {
      executeCheckCommand(files, options);
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
  // Language server for editors: LSP over stdin/stdout
  registerLspCommand((name, key) => defineCommand(program, name, key), pkg.version);

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

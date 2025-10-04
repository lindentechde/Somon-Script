/*
 * SomonScript CLI
 * Copyright (c) 2025 LindenTech IT Consulting
 *
 * Licensed under the MIT License. See the LICENSE file for details.
 */

import { spawnSync } from 'child_process';
import { Command } from 'commander';
import chokidar from 'chokidar';
import * as fs from 'fs';
import * as path from 'path';
import { createRequire } from 'module';
import type { Module as NodeModuleType } from 'module';

import type { CompileResult } from '../compiler';
import type { SomonConfig } from '../config';
import type { ModuleSystem, BundleOptions as ModuleBundleOptions } from '../module-system';
import { ProductionValidator } from '../production-validator';
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
  // Fallback for test environments
  const fallbackPath = path.resolve(process.cwd(), 'package.json');
  if (fs.existsSync(fallbackPath)) {
    return JSON.parse(fs.readFileSync(fallbackPath, 'utf8'));
  }
  throw new Error('package.json not found');
}
const pkg = findPackageJson();

type CompilerModule = typeof import('../compiler');
type ConfigModule = typeof import('../config');

let tsRuntimeRegistered = false;

const localRequire = createRequire(__filename);
const compiledCompilerModuleId = '../compiler';
const sourceCompilerModuleId = '../../src/compiler.ts';
const compiledConfigModuleId = '../config';
const sourceConfigModuleId = '../../src/config.ts';

const { compile } = loadCompiler();
const { loadConfig, ConfigError } = loadConfigModule();

type ConfigErrorInstance = InstanceType<typeof ConfigError>;

function isConfigError(error: unknown): error is ConfigErrorInstance {
  return error instanceof ConfigError;
}

function logConfigError(error: ConfigErrorInstance): void {
  console.error('Configuration error:');
  console.error(`  ${error.message}`);
  if (error.details.length > 0) {
    for (const detail of error.details) {
      console.error(`  ${detail.path}: ${detail.message}`);
    }
  }
}

function handleCliFailure(error: unknown, fallbackPrefix: string): void {
  if (isConfigError(error)) {
    logConfigError(error);
  } else {
    console.error(fallbackPrefix, error instanceof Error ? error.message : error);
  }

  if (!process.exitCode || process.exitCode === 0) {
    process.exitCode = 1;
  }
}

/**
 * Validate production environment requirements
 * Implements AGENTS.md principle: "Fail fast, fail clearly"
 *
 * @param outputPath - Output path to validate write permissions
 * @param requiredPaths - Optional array of required input paths
 */
function validateProductionEnvironment(outputPath: string, requiredPaths?: string[]): void {
  const validator = new ProductionValidator();
  validator.validate({
    isProduction: true,
    outputPath,
    requiredPaths,
  });
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

interface BundleOptions {
  output?: string;
  format?: string;
  minify?: boolean;
  sourceMap?: boolean;
  externals?: string;
  inlineSources?: boolean;
  production?: boolean;
}

async function executeBundleCommand(input: string, options: BundleOptions): Promise<void> {
  try {
    const baseDir = path.dirname(path.resolve(input));
    const config = loadConfig(baseDir);

    const isProduction = options.production || process.env.NODE_ENV === 'production';

    // Validate production environment if --production flag is set
    if (isProduction) {
      const outputPath = options.output || input.replace(/\.som$/, '.bundle.js');

      try {
        validateProductionEnvironment(outputPath, [input]);
      } catch (error) {
        handleCliFailure(error, 'Production validation failed:');
        throw error; // Re-throw to exit bundle command
      }
    }

    const moduleSystem = await createModuleSystem(baseDir, config, isProduction);

    // Install signal handlers for graceful shutdown in production
    if (isProduction) {
      await installSignalHandlers(moduleSystem);
    }

    const bundleOptions = createBundleOptions(input, options, config, baseDir);

    await performBundling(moduleSystem, bundleOptions, input);
  } catch (error) {
    handleCliFailure(error, 'Bundle error:');
  }
}

async function createModuleSystem(baseDir: string, config: SomonConfig, isProduction = false) {
  const { ModuleSystem } = await import('../module-system');
  return new ModuleSystem({
    resolution: {
      baseUrl: baseDir,
      ...(config.moduleSystem?.resolution || {}),
    },
    loading: config.moduleSystem?.loading
      ? {
          ...config.moduleSystem.loading,
          encoding: config.moduleSystem.loading.encoding as BufferEncoding | undefined,
        }
      : undefined,
    compilation: config.moduleSystem?.compilation,
    // Enforce production features when in production mode
    metrics: isProduction || config.moduleSystem?.metrics,
    circuitBreakers: isProduction || config.moduleSystem?.circuitBreakers,
    logger: isProduction || config.moduleSystem?.logger,
    managementServer: isProduction || config.moduleSystem?.managementServer,
    managementPort: config.moduleSystem?.managementPort,
    // Production resource limits and timeouts
    resourceLimits: isProduction
      ? {
          maxMemoryBytes: config.moduleSystem?.resourceLimits?.maxMemoryBytes,
          maxFileHandles: config.moduleSystem?.resourceLimits?.maxFileHandles ?? 1000,
          maxCachedModules: config.moduleSystem?.resourceLimits?.maxCachedModules ?? 10000,
          checkInterval: config.moduleSystem?.resourceLimits?.checkInterval ?? 5000,
        }
      : config.moduleSystem?.resourceLimits,
    operationTimeout: isProduction
      ? (config.moduleSystem?.operationTimeout ?? 120000)
      : config.moduleSystem?.operationTimeout,
  });
}

/**
 * Install signal handlers for graceful shutdown
 * Ensures proper cleanup on SIGTERM, SIGINT, SIGHUP
 */
async function installSignalHandlers(moduleSystem: ModuleSystem): Promise<void> {
  const { SignalHandler } = await import('../module-system');
  const signalHandler = new SignalHandler({
    shutdownTimeout: 30000,
  });

  // Register module system shutdown
  signalHandler.register(async () => {
    await moduleSystem.shutdown();
  });

  signalHandler.install();
}

function createBundleOptions(
  input: string,
  options: BundleOptions,
  config: SomonConfig,
  _baseDir: string
): ModuleBundleOptions {
  const formatValue = options.format ?? config.bundle?.format ?? 'commonjs';
  const requestedFormat = typeof formatValue === 'string' ? formatValue.toLowerCase() : 'commonjs';

  if (requestedFormat !== 'commonjs') {
    throw new Error(
      `SomonScript currently supports only the 'commonjs' bundle format. Received '${requestedFormat}'.`
    );
  }

  return {
    entryPoint: path.resolve(input),
    outputPath: options.output ?? config.bundle?.output,
    format: 'commonjs',
    minify: options.minify ?? config.bundle?.minify,
    sourceMaps: options.sourceMap ?? config.bundle?.sourceMaps,
    inlineSources: options.inlineSources ?? config.bundle?.inlineSources,
    externals: options.externals ? options.externals.split(',') : config.bundle?.externals,
  };
}

async function performBundling(
  moduleSystem: ModuleSystem,
  bundleOptions: ModuleBundleOptions,
  input: string
): Promise<void> {
  console.log(`📦 Bundling ${input}...`);
  const bundle = await moduleSystem.bundle(bundleOptions);
  const outputPath = getBundleOutputPath(bundleOptions, input);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  let outputCode = bundle.code;
  if (bundle.map) {
    const mapPath = `${outputPath}.map`;
    fs.writeFileSync(mapPath, bundle.map, 'utf8');
    outputCode = `${outputCode}\n//# sourceMappingURL=${path.basename(mapPath)}`;
    console.log(`🗺️ Source map created: ${mapPath}`);
  }

  fs.writeFileSync(outputPath, outputCode, 'utf8');

  console.log(`✅ Bundle created: ${outputPath}`);

  const stats = moduleSystem.getStatistics();
  console.log(`📊 Bundled ${stats.totalModules} modules`);
}

function getBundleOutputPath(bundleOptions: ModuleBundleOptions, input: string): string {
  if (bundleOptions.outputPath) {
    return path.isAbsolute(bundleOptions.outputPath)
      ? bundleOptions.outputPath
      : path.resolve(path.dirname(path.resolve(input)), bundleOptions.outputPath);
  }
  return input.replace(/\.som$/, '.bundle.js');
}

export interface CompileOptions {
  output?: string;
  target?: 'es5' | 'es2015' | 'es2020' | 'esnext';
  sourceMap?: boolean;
  noSourceMap?: boolean;
  minify?: boolean;
  noMinify?: boolean;
  noTypeCheck?: boolean;
  strict?: boolean;
  outDir?: string;
  watch?: boolean;
  compileOnSave?: boolean;
  production?: boolean;
}

function mergeOptions(input: string, options: CompileOptions): CompileOptions {
  const config = loadConfig(path.dirname(path.resolve(input)));
  const merged = { ...(config.compilerOptions ?? {}), ...options };

  // Handle negation flags - they override positive flags
  if (options.noSourceMap) {
    merged.sourceMap = false;
  }
  if (options.noMinify) {
    merged.minify = false;
  }

  // Set default target if not specified
  if (!merged.target) {
    merged.target = 'es2020';
  }

  return merged;
}

export function compileFile(input: string, options: CompileOptions): CompileResult {
  try {
    if (!fs.existsSync(input)) {
      const message = `Error: File '${input}' not found`;
      console.error(message);
      process.exitCode = 1;
      return { code: '', errors: [message], warnings: [] };
    }

    const source = fs.readFileSync(input, 'utf-8');
    const result = compile(source, {
      target: options.target,
      sourceMap: options.sourceMap,
      minify: options.minify,
      typeCheck: !options.noTypeCheck,
      strict: options.strict,
    });

    if (result.errors.length > 0) {
      console.error('Compilation errors:');
      result.errors.forEach(error => console.error(`  ${error}`));
      process.exitCode = 1;
    }

    if (result.warnings.length > 0) {
      console.warn('Warnings:');
      result.warnings.forEach(warning => console.warn(`  ${warning}`));
    }

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error:', message);
    process.exitCode = 1;
    return { code: '', errors: [message], warnings: [] };
  }
}

function resolveForwardedArgv(command: Command, input: string): string[] {
  const parentArgs = command.parent?.args ?? [];
  return parentArgs.length > 0 ? [...parentArgs] : [command.name(), input];
}

function createRunOutputPath(input: string, sourceDir: string): string {
  const baseName = path.basename(input);
  const withoutExtension = baseName.includes('.') ? baseName.replace(/\.[^.]+$/, '') : baseName;
  const safeBase = withoutExtension || 'somon-script';
  const uniqueSuffix = `${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  return path.join(sourceDir, `${safeBase}.somon-run-${uniqueSuffix}.js`);
}

interface ExecuteOptions {
  cwd?: string;
}

export const cliRuntime = {
  executeCompiledFile(
    filePath: string,
    forwardedArgv: string[] = [],
    options: ExecuteOptions = {}
  ): ReturnType<typeof spawnSync> {
    return spawnSync(process.execPath, [filePath, ...forwardedArgv], {
      stdio: 'inherit',
      env: process.env,
      cwd: options.cwd,
    });
  },
};

export function createProgram(): Command {
  const program = new Command();

  program
    .name('somon')
    .description('SomonScript compiler - Compile Tajik Cyrillic code to JavaScript')
    .version(pkg.version);

  program
    .command('compile')
    .alias('c')
    .description('Compile SomonScript files to JavaScript')
    .usage('[input] [options]')
    .argument('<input>', 'Input .som file')
    .option('-o, --output <file>', 'Output file (default: same name with .js extension)')
    .option('--out-dir <dir>', 'Output directory')
    .option('--target <target>', 'Compilation target')
    .option('--source-map', 'Generate source maps')
    .option('--no-source-map', 'Disable source maps')
    .option('--minify', 'Minify output')
    .option('--no-minify', 'Disable minification')
    .option('--no-type-check', 'Disable type checking')
    .option('--strict', 'Enable strict type checking')
    .option('-w, --watch', 'Recompile on file changes')
    .option('--production', 'Enable production mode with strict validation')
    .action((input: string, options: CompileOptions): void => {
      try {
        let merged: CompileOptions;
        try {
          merged = mergeOptions(input, options);
        } catch (error) {
          handleCliFailure(error, 'Error:');
          return;
        }

        // Validate production environment if --production flag is set
        if (merged.production || process.env.NODE_ENV === 'production') {
          const baseDir = path.dirname(path.resolve(input));
          const outputFile =
            merged.output ||
            (merged.outDir
              ? path.join(
                  path.resolve(baseDir, merged.outDir),
                  path.basename(input).replace(/\.som$/, '.js')
                )
              : input.replace(/\.som$/, '.js'));

          try {
            validateProductionEnvironment(outputFile, [input]);
          } catch (error) {
            handleCliFailure(error, 'Production validation failed:');
            return;
          }
        }

        const shouldWatch = !!(merged.watch || merged.compileOnSave);

        const compileOnce = (): boolean => {
          try {
            merged = mergeOptions(input, options);
          } catch (error) {
            handleCliFailure(error, 'Error:');
            return false;
          }

          const result = compileFile(input, merged);
          if (result.errors.length > 0) return false;

          const baseDir = path.dirname(path.resolve(input));
          const outputFile =
            merged.output ||
            (merged.outDir
              ? path.join(
                  path.resolve(baseDir, merged.outDir),
                  path.basename(input).replace(/\.som$/, '.js')
                )
              : input.replace(/\.som$/, '.js'));
          fs.mkdirSync(path.dirname(outputFile), { recursive: true });
          fs.writeFileSync(outputFile, result.code);
          console.log(`Compiled '${input}' to '${outputFile}'`);

          if (merged.sourceMap && result.sourceMap) {
            const sourceMapFile = `${outputFile}.map`;
            fs.writeFileSync(sourceMapFile, result.sourceMap);
            console.log(`Generated source map: '${sourceMapFile}'`);
          }

          return true;
        };

        const initialSuccess = compileOnce();
        if (!initialSuccess && !shouldWatch) {
          return;
        }

        if (shouldWatch && process.env.NODE_ENV !== 'test') {
          console.log(`Watching '${input}' for changes...`);
          const absoluteInput = path.resolve(input);
          const watchTargets = new Set<string>([
            absoluteInput,
            path.resolve(path.dirname(absoluteInput), 'somon.config.json'),
          ]);

          const watcher = chokidar.watch(Array.from(watchTargets), {
            persistent: true,
            ignoreInitial: true,
            awaitWriteFinish: {
              stabilityThreshold: 150,
              pollInterval: 20,
            },
          });

          let watcherClosed = false;

          // Install signal handlers for graceful shutdown in watch mode
          const gracefulShutdown = async (signal: string) => {
            if (!watcherClosed) {
              console.log(`\nReceived ${signal}, stopping watcher...`);
              watcherClosed = true;
              await watcher.close();
              process.exit(0);
            }
          };

          process.on('SIGTERM', () => void gracefulShutdown('SIGTERM'));
          process.on('SIGINT', () => void gracefulShutdown('SIGINT'));
          process.on('SIGHUP', () => void gracefulShutdown('SIGHUP'));

          const handleFileEvent = (
            eventType: 'add' | 'change' | 'unlink',
            changedPath: string
          ): void => {
            const normalizedPath = path.resolve(changedPath);

            if (normalizedPath === absoluteInput) {
              if (eventType === 'unlink') {
                console.warn(`Source file '${input}' was removed. Waiting for it to reappear...`);
                return;
              }
              console.log(`Recompiling '${input}'...`);
              compileOnce();
              return;
            }

            if (eventType === 'unlink') {
              console.warn(
                `Configuration file '${path.basename(normalizedPath)}' was removed. Using previous options.`
              );
              return;
            }

            console.log(
              `Configuration change detected in '${path.basename(normalizedPath)}'. Recompiling '${input}'...`
            );
            compileOnce();
          };

          watcher
            .on('add', (changedPath: string) => handleFileEvent('add', changedPath))
            .on('change', (changedPath: string) => handleFileEvent('change', changedPath))
            .on('unlink', (changedPath: string) => handleFileEvent('unlink', changedPath))
            .on('error', (error: unknown) => {
              console.error('Watch error:', error instanceof Error ? error.message : String(error));
            });

          const cleanupWatcher = (): void => {
            if (watcherClosed) return;
            watcherClosed = true;
            watcher.close().catch((error: unknown) => {
              console.error(
                'Failed to close watcher:',
                error instanceof Error ? error.message : String(error)
              );
            });
          };

          const registerSignalHandler = (signal: 'SIGINT' | 'SIGTERM'): void => {
            process.once(signal, () => {
              cleanupWatcher();
              process.exit(process.exitCode ?? 0);
            });
          };

          registerSignalHandler('SIGINT');
          registerSignalHandler('SIGTERM');
          process.once('exit', cleanupWatcher);
        } else if (shouldWatch) {
          // In test environment, just log the message without actually watching
          console.log(`Watching '${input}' for changes...`);
        }
      } catch (error) {
        handleCliFailure(error, 'Error:');
        return;
      }
    });

  program
    .command('run')
    .alias('r')
    .description('Compile and run SomonScript file')
    .usage('[input] [options]')
    .argument('<input>', 'Input .som file')
    .option('--target <target>', 'Compilation target')
    .option('--source-map', 'Generate source maps')
    .option('--no-source-map', 'Disable source maps')
    .option('--minify', 'Minify output')
    .option('--no-minify', 'Disable minification')
    .option('--no-type-check', 'Disable type checking')
    .option('--strict', 'Enable strict type checking')
    .option('--production', 'Enable production mode with strict validation')
    .action((input: string, options: CompileOptions, command: Command): void => {
      const cleanupTargets: string[] = [];
      try {
        const merged = mergeOptions(input, options);

        // Validate production environment if --production flag is set
        if (merged.production || process.env.NODE_ENV === 'production') {
          const sourceDir = path.dirname(path.resolve(input));
          const compiledFilePath = createRunOutputPath(input, sourceDir);

          try {
            validateProductionEnvironment(compiledFilePath, [input]);
          } catch (error) {
            handleCliFailure(error, 'Production validation failed:');
            return;
          }
        }

        const result = compileFile(input, merged);
        if (result.errors.length > 0) return;

        const sourceDir = path.dirname(path.resolve(input));
        const compiledFilePath = createRunOutputPath(input, sourceDir);
        fs.writeFileSync(compiledFilePath, result.code, 'utf8');
        cleanupTargets.push(compiledFilePath);

        if (merged.sourceMap && result.sourceMap) {
          const mapPath = `${compiledFilePath}.map`;
          fs.writeFileSync(mapPath, result.sourceMap, 'utf8');
          cleanupTargets.push(mapPath);
        }

        const child = cliRuntime.executeCompiledFile(
          compiledFilePath,
          resolveForwardedArgv(command, input),
          { cwd: sourceDir }
        );

        if (child.error) {
          console.error('Failed to execute Node:', child.error.message ?? child.error);
          process.exitCode = 1;
        } else if (typeof child.status === 'number') {
          process.exitCode = child.status;
        } else if (typeof child.signal === 'string') {
          console.error(`Process terminated with signal ${child.signal}`);
          process.exitCode = 1;
        }
      } catch (error) {
        handleCliFailure(error, 'Error:');
        return;
      } finally {
        for (const target of cleanupTargets) {
          try {
            fs.rmSync(target, { force: true });
          } catch (cleanupError) {
            console.warn(
              'Warning: unable to clean temporary files:',
              cleanupError instanceof Error ? cleanupError.message : cleanupError
            );
          }
        }
      }
    });

  program
    .command('init')
    .description('Initialize a new SomonScript project')
    .argument('[name]', 'Project name', 'somon-project')
    .action((name: string): void => {
      try {
        const projectDir = path.resolve(name);

        if (fs.existsSync(projectDir)) {
          console.error(`Error: Directory '${name}' already exists`);
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
            target: 'es2020',
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

        console.log(`✅ Created SomonScript project '${name}'`);
        console.log(`\nNext steps:`);
        console.log(`  cd ${name}`);
        console.log(`  npm install`);
        console.log(`  npm run dev`);
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  // Bundle command
  program
    .command('bundle')
    .alias('b')
    .description('Bundle SomonScript modules into a single file')
    .usage('[input] [options]')
    .argument('<input>', 'Entry point file')
    .option('-o, --output <file>', 'Output file path')
    .option('-f, --format <format>', "Bundle format (only 'commonjs' is supported)", 'commonjs')
    .option('--minify', 'Minify the output')
    .option('--source-map', 'Generate source maps')
    .option('--inline-sources', 'Inline original sources into emitted source maps')
    .option('--externals <modules>', 'External modules (comma-separated)')
    .option('--production', 'Enable production mode with strict validation')
    .action(async (input: string, options: BundleOptions) => {
      await executeBundleCommand(input, options);
    });

  // Module info command
  program
    .command('module-info')
    .alias('info')
    .description('Show module dependency information')
    .usage('[input] [options]')
    .argument('<input>', 'Entry point file')
    .option('--graph', 'Show dependency graph')
    .option('--stats', 'Show module statistics')
    .option('--circular', 'Check for circular dependencies')
    .action(
      async (input: string, options: { graph?: boolean; stats?: boolean; circular?: boolean }) => {
        try {
          const baseDir = path.dirname(path.resolve(input));
          const config = loadConfig(baseDir);
          const moduleSystem = await createModuleSystem(baseDir, config, false);

          console.log(`🔍 Analyzing ${input}...`);
          const resolvedInput = path.resolve(input);
          await moduleSystem.loadModule(resolvedInput, path.dirname(resolvedInput));

          if (options.stats) {
            const stats = moduleSystem.getStatistics();
            console.log('\n📊 Module Statistics:');
            console.log(`  Total modules: ${stats.totalModules}`);
            console.log(`  Total dependencies: ${stats.totalDependencies}`);
            console.log(
              `  Average dependencies per module: ${stats.averageDependencies.toFixed(2)}`
            );
            console.log(`  Maximum dependency depth: ${stats.maxDependencyDepth}`);
            console.log(`  Circular dependencies: ${stats.circularDependencies}`);
          }

          if (options.graph) {
            const graph = moduleSystem.getDependencyGraph();
            console.log('\n🕸️  Dependency Graph:');
            for (const [moduleId, deps] of graph) {
              const relativePath = path.relative(process.cwd(), moduleId);
              console.log(`  ${relativePath}:`);
              for (const dep of deps) {
                console.log(`    └── ${dep}`);
              }
            }
          }

          if (options.circular) {
            const validation = moduleSystem.validate();
            if (validation.isValid) {
              console.log('\n✅ No circular dependencies found');
            } else {
              console.log('\n❌ Issues found:');
              for (const error of validation.errors) {
                console.log(`  • ${error}`);
              }
            }
          }
        } catch (error) {
          console.error('Analysis error:', error instanceof Error ? error.message : error);
          process.exit(1);
        }
      }
    );

  // Resolve command
  program
    .command('resolve')
    .description('Resolve a module specifier to its file path')
    .usage('<specifier> [options]')
    .argument('<specifier>', 'Module specifier to resolve')
    .option('-f, --from <file>', 'Resolve from this file', process.cwd())
    .action(async (specifier: string, options: { from?: string }) => {
      try {
        const { ModuleResolver } = await import('../module-system');
        const fromFile = options.from ?? process.cwd();
        const resolver = new ModuleResolver({
          baseUrl: path.dirname(path.resolve(fromFile)),
        });
        const resolved = resolver.resolve(specifier, fromFile);

        console.log(`🎯 Resolved '${specifier}':`);
        console.log(`  Path: ${resolved.resolvedPath}`);
        console.log(`  Extension: ${resolved.extension}`);
        console.log(`  External: ${resolved.isExternalLibrary ? 'Yes' : 'No'}`);
        if (resolved.packageName) {
          console.log(`  Package: ${resolved.packageName}`);
        }
      } catch (error) {
        console.error('Resolve error:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  return program;
}

function loadCompiler(): CompilerModule {
  try {
    return localRequire(compiledCompilerModuleId) as CompilerModule;
  } catch (error) {
    if (!isModuleNotFound(error)) {
      throw error;
    }
  }

  try {
    return localRequire('../compiler.js') as CompilerModule;
  } catch (error) {
    if (!isModuleNotFound(error)) {
      throw error;
    }
  }

  const ts = loadTypeScript();
  const compilerSourcePath = path.resolve(__dirname, '..', '..', 'src', 'compiler.ts');

  if (!fs.existsSync(compilerSourcePath)) {
    throw new Error("Compiler module not found. Run 'npm run build' before executing the CLI.");
  }

  registerRuntimeTsTranspiler(ts);

  return localRequire(sourceCompilerModuleId) as CompilerModule;
}

function loadConfigModule(): ConfigModule {
  try {
    return localRequire(compiledConfigModuleId) as ConfigModule;
  } catch (error) {
    if (!isModuleNotFound(error)) {
      throw error;
    }
  }

  try {
    return localRequire('../config.js') as ConfigModule;
  } catch (error) {
    if (!isModuleNotFound(error)) {
      throw error;
    }
  }

  const ts = loadTypeScript();
  const configSourcePath = path.resolve(__dirname, '..', '..', 'src', 'config.ts');

  if (!fs.existsSync(configSourcePath)) {
    throw new Error("Config module not found. Run 'npm run build' before executing the CLI.");
  }

  registerRuntimeTsTranspiler(ts);

  return localRequire(sourceConfigModuleId) as ConfigModule;
}

function isModuleNotFound(error: unknown): boolean {
  return error instanceof Error && (error as { code?: unknown }).code === 'MODULE_NOT_FOUND';
}

function loadTypeScript(): typeof import('typescript') {
  try {
    return require('typescript') as typeof import('typescript');
  } catch (error) {
    throw new Error(
      'TypeScript runtime is required to execute the CLI without compiled artifacts. Please install dev dependencies.'
    );
  }
}

function registerRuntimeTsTranspiler(ts: typeof import('typescript')): void {
  if (tsRuntimeRegistered || require.extensions['.ts']) {
    // Either we already registered our hook or another tool (e.g. ts-node) is handling .ts files.
    tsRuntimeRegistered = true;
    return;
  }

  require.extensions['.ts'] = (module: NodeModuleType, filename: string): void => {
    const source = fs.readFileSync(filename, 'utf-8');
    const { outputText } = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
        sourceMap: false,
      },
      fileName: filename,
    });

    (module as NodeModuleType & { _compile(_code: string, _filename: string): void })._compile(
      outputText,
      filename
    );
  };

  tsRuntimeRegistered = true;
}

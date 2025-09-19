import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { createRequire } from 'module';
import type { Module as NodeModuleType } from 'module';

import type { CompileResult } from '../compiler';
import type { SomonConfig } from '../config';
import type { ModuleSystem, BundleOptions as ModuleBundleOptions } from '../module-system';
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
const { loadConfig } = loadConfigModule();

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
  force?: boolean;
}

async function executeBundleCommand(input: string, options: BundleOptions): Promise<void> {
  try {
    const baseDir = path.dirname(path.resolve(input));
    const config = loadConfig(baseDir);
    const moduleSystem = await createModuleSystem(baseDir, config);

    const bundleOptions = createBundleOptions(input, options, config, baseDir);

    if (bundleOptions.format !== 'commonjs' && !bundleOptions.force) {
      console.error('ESM/UMD bundle formats are experimental. Re-run with --force to proceed.');
      process.exitCode = 1;
      return;
    }

    await performBundling(moduleSystem, bundleOptions, input);
  } catch (error) {
    console.error('Bundle error:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

async function createModuleSystem(baseDir: string, config: SomonConfig) {
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
  });
}

function createBundleOptions(
  input: string,
  options: BundleOptions,
  config: SomonConfig,
  _baseDir: string
): ModuleBundleOptions {
  return {
    entryPoint: path.resolve(input),
    outputPath: options.output ?? config.bundle?.output,
    format: (options.format ?? config.bundle?.format ?? 'commonjs') as 'commonjs' | 'esm' | 'umd',
    minify: options.minify ?? config.bundle?.minify,
    sourceMaps: options.sourceMap ?? config.bundle?.sourceMaps,
    externals: options.externals ? options.externals.split(',') : config.bundle?.externals,
    force: options.force ?? config.bundle?.force,
  };
}

async function performBundling(
  moduleSystem: ModuleSystem,
  bundleOptions: ModuleBundleOptions,
  input: string
): Promise<void> {
  console.log(`📦 Bundling ${input}...`);

  if (bundleOptions.format !== 'commonjs') {
    console.warn('Warning: ESM/UMD formats are experimental; prefer commonjs for execution.');
  }

  const bundle = await moduleSystem.bundle(bundleOptions);
  const outputPath = getBundleOutputPath(bundleOptions, input);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, bundle);

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
    .action((input: string, options: CompileOptions): void => {
      try {
        const merged = mergeOptions(input, options);
        const compileOnce = (): void => {
          const result = compileFile(input, merged);
          if (result.errors.length > 0) return;

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
        };

        compileOnce();

        if ((merged.watch || merged.compileOnSave) && process.env.NODE_ENV !== 'test') {
          console.log(`Watching '${input}' for changes...`);
          fs.watch(input, { persistent: true }, () => {
            console.log(`Recompiling '${input}'...`);
            compileOnce();
          });
        } else if (merged.watch || merged.compileOnSave) {
          // In test environment, just log the message without actually watching
          console.log(`Watching '${input}' for changes...`);
        }
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error);
        process.exitCode = 1;
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
    .action((input: string, options: CompileOptions): void => {
      try {
        const merged = mergeOptions(input, options);
        const result = compileFile(input, merged);
        if (result.errors.length > 0) return;

        // eslint-disable-next-line no-eval
        eval(result.code);
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error);
        process.exitCode = 1;
        return;
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
            'somon-script': '^0.2.0',
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
    .option('-f, --format <format>', 'Bundle format (commonjs, esm, umd)', 'commonjs')
    .option('--minify', 'Minify the output')
    .option('--source-map', 'Generate source maps')
    .option('--externals <modules>', 'External modules (comma-separated)')
    .option('--force', 'Allow experimental formats (esm/umd)')
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
          const { ModuleSystem } = await import('../module-system');

          const moduleSystem = new ModuleSystem({
            resolution: {
              baseUrl: path.dirname(path.resolve(input)),
            },
          });

          console.log(`🔍 Analyzing ${input}...`);
          await moduleSystem.loadModule(path.resolve(input), process.cwd());

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

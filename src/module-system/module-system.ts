import chokidar from 'chokidar';
import type { FSWatcher, WatchOptions } from 'chokidar';
import { isBuiltin } from 'node:module';
import * as path from 'node:path';
import { RawSourceMap, SourceMapConsumer, SourceMapGenerator } from 'source-map';
import { ModuleResolver, ModuleResolutionOptions } from './module-resolver';
import {
  locationOf,
  ModuleLoader,
  ModuleLoadOptions,
  LoadedModule,
  ModuleLoadError,
} from './module-loader';
import { ModuleRegistry, ModuleMetadata } from './module-registry';
import { transformSync, type PluginItem } from '@babel/core';
import { CompilerOptions } from '../config';
import { moduleSystemLogger as logger } from './logger';
import {
  bundleWrapper,
  collectExportNames,
  externalRequireCode,
  shiftSourceMap,
} from './bundle-formats';
import { findRequireCalls } from './require-calls';
import { withTimeout } from './async-timeout';
import {
  compile as compileSource,
  type CompileOptions as PipelineCompileOptions,
} from '../compiler';
import {
  BUNDLE_FORMATS,
  composeSourceMaps,
  DEFAULT_TARGET,
  isBundleFormat,
  lowerToTarget,
  TARGETS,
  validateGlobalName,
  validateLib,
  type BundleFormat,
} from '../targets';

/**
 * Compiler options for the modules of one build. `downlevel: false` keeps the
 * modules' syntax: the bundler lowers the whole bundle for the target once.
 */
type ModuleCompilationOptions = CompilerOptions & Pick<PipelineCompileOptions, 'downlevel'>;

export type ModuleWatchEventType = 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir';

export interface ModuleWatchEvent {
  type: ModuleWatchEventType;
  filePath: string;
}

export interface ModuleSystemWatchOptions {
  onChange?: (_event: ModuleWatchEvent) => void;
  includeNodeModules?: boolean;
  additionalPaths?: string[];
  chokidarOptions?: WatchOptions;
}

export interface ModuleSystemOptions {
  resolution?: ModuleResolutionOptions;
  loading?: ModuleLoadOptions;
  compilation?: CompilerOptions;
}

export interface CompiledModule {
  code: string;
  map?: RawSourceMap;
}

export interface CompilationError {
  message: string;
  /** File the error is in */
  filePath: string;
  line?: number;
  column?: number;
  /** For module loading errors: the file whose import led to `filePath`, and the specifier */
  importer?: string;
  specifier?: string;
  suggestion?: string;
  originalError?: Error;
}

export interface CompilationResult {
  modules: Map<string, CompiledModule>;
  entryPoint: string;
  dependencies: string[];
  errors: CompilationError[];
  warnings: string[];
}

export interface BundleOptions {
  entryPoint: string;
  outputPath?: string;
  /**
   * 'commonjs' (default): `module.exports` is the entry's exports. 'esm': an ES
   * module that exports them (`export`), modules not in the bundle are
   * imported; the default when the compilation's `module` is 'esm'. 'iife': a
   * script for browsers without `require` or `module` that stores them in
   * `globalThis[globalName]`.
   */
  format?: BundleFormat;
  /** For 'iife': the global, or dotted path of globals, that receives the entry's exports. */
  globalName?: string;
  minify?: boolean;
  sourceMaps?: boolean;
  externals?: string[];
  inlineSources?: boolean;
  /**
   * Run every module as if from its original file: `__filename`/`__dirname` are the
   * module's absolute path and requires that are not bundled resolve from it. Embeds
   * absolute paths, so the bundle only works on the machine that built it.
   */
  modulePaths?: boolean;
}

export interface BundleOutput {
  code: string;
  map?: string;
}

/** A module of a bundle, its requires pointed at bundle keys. */
interface BundleModule {
  id: string;
  key: string;
  code: string;
  map?: RawSourceMap;
  /** Modules its remaining requires load at run time (not in the bundle). */
  requires: string[];
}

/** Where a module's code is in the bundle body (1-based lines). */
interface BundleModuleLines {
  key: string;
  start: number;
  end: number;
}

type RequireRewriteContext = {
  moduleIdMapping: Map<string, string>;
  externals: Set<string>;
  externalModuleIds: Set<string>;
  entryPoint: string;
};

export class ModuleSystem {
  private readonly resolver: ModuleResolver;
  private readonly loader: ModuleLoader;
  private readonly registry: ModuleRegistry;
  private readonly activeWatchers = new Set<FSWatcher>();
  private readonly defaultCompilation: CompilerOptions;
  private readonly logger = logger;

  constructor(options: ModuleSystemOptions = {}) {
    // Validate configuration upfront before initializing components
    this.validateConfiguration(options);

    this.resolver = new ModuleResolver(options.resolution);
    this.loader = new ModuleLoader(this.resolver, options.loading || {});
    this.registry = new ModuleRegistry();
    this.defaultCompilation = options.compilation ?? {};
  }

  /**
   * Provide helpful suggestions for common compilation errors.
   */
  private getSuggestionForError(errorMessage: string): string | undefined {
    const lowerMessage = errorMessage.toLowerCase();

    // Common syntax errors
    if (lowerMessage.includes('unexpected token')) {
      return 'Check for missing or extra brackets, parentheses, or semicolons';
    }
    if (lowerMessage.includes('unexpected end of input')) {
      return 'You may have unclosed brackets, parentheses, or string literals';
    }

    // Import/module errors
    if (lowerMessage.includes('cannot find module') || lowerMessage.includes('module not found')) {
      return 'Verify the module path is correct and the file exists. Check for typos in the import path';
    }
    if (lowerMessage.includes('circular dependency')) {
      return 'Refactor your code to remove circular dependencies between modules';
    }

    // Type errors
    if (lowerMessage.includes('type') && lowerMessage.includes('mismatch')) {
      return 'Check that the types of your variables and function parameters are compatible';
    }

    // Variable errors
    if (lowerMessage.includes('is not defined') || lowerMessage.includes('undefined')) {
      return 'Make sure the variable is declared before use. Check for typos in variable names';
    }

    // Scope errors
    if (lowerMessage.includes('already declared') || lowerMessage.includes('redeclared')) {
      return 'A variable with this name already exists in this scope. Use a different name or remove the duplicate declaration';
    }

    return undefined;
  }

  /**
   * Create a structured compilation error with context and suggestions.
   */
  private createCompilationError(
    message: string,
    filePath: string,
    originalError?: Error
  ): CompilationError {
    if (originalError instanceof ModuleLoadError) {
      return {
        message,
        filePath: originalError.filePath,
        line: originalError.line,
        column: originalError.column,
        importer: originalError.importer,
        specifier: originalError.specifier,
        suggestion: this.getSuggestionForError(message),
        originalError,
      };
    }

    // Compiler diagnostics are strings; take the line and column from the message
    const { line, column } = locationOf(message);

    return {
      message,
      filePath,
      line,
      column,
      suggestion: this.getSuggestionForError(message),
      originalError,
    };
  }

  /**
   * Validate ModuleSystem configuration options upfront.
   * Fail fast with clear error messages for invalid configurations.
   */
  private validateConfiguration(options: ModuleSystemOptions): void {
    const errors: string[] = [];

    this.validateResolutionOptions(options, errors);
    this.validateLoaderOptions(options, errors);
    this.validateCompilationOptions(options, errors);

    if (errors.length > 0) {
      throw new Error(
        `ModuleSystem configuration validation failed:\n${errors.map((e, i) => `  ${i + 1}. ${e}`).join('\n')}`
      );
    }
  }

  private validateResolutionOptions(options: ModuleSystemOptions, errors: string[]): void {
    if (!options.resolution) return;

    const resolution = options.resolution;

    this.validateResolutionBaseUrl(resolution, errors);
    this.validateResolutionPaths(resolution, errors);
    this.validateResolutionExtensions(resolution, errors);
    this.validateResolutionModuleDirectories(resolution, errors);
    this.validateResolutionBooleanFlags(resolution, errors);
  }

  private validateResolutionBaseUrl(resolution: ModuleResolutionOptions, errors: string[]): void {
    // baseUrl is required for ModuleResolver (enforced in ModuleResolver constructor)
    // We validate it here to provide early feedback
    if (resolution.baseUrl !== undefined && typeof resolution.baseUrl !== 'string') {
      errors.push('resolution.baseUrl must be a string');
    }
  }

  private validateResolutionPaths(resolution: ModuleResolutionOptions, errors: string[]): void {
    if (resolution.paths === undefined) return;

    if (typeof resolution.paths !== 'object' || resolution.paths === null) {
      errors.push('resolution.paths must be an object mapping strings to string arrays');
      return;
    }

    for (const [key, value] of Object.entries(resolution.paths)) {
      if (!Array.isArray(value)) {
        errors.push(`resolution.paths['${key}'] must be an array of strings`);
      } else if (!value.every(v => typeof v === 'string')) {
        errors.push(`resolution.paths['${key}'] must contain only strings`);
      }
    }
  }

  private validateResolutionExtensions(
    resolution: ModuleResolutionOptions,
    errors: string[]
  ): void {
    if (resolution.extensions === undefined) return;

    if (!Array.isArray(resolution.extensions)) {
      errors.push('resolution.extensions must be an array of strings');
      return;
    }

    if (!resolution.extensions.every(ext => typeof ext === 'string')) {
      errors.push('resolution.extensions must contain only strings');
      return;
    }

    if (resolution.extensions.length === 0) {
      errors.push('resolution.extensions must not be empty');
      return;
    }

    // Validate that extensions start with a dot
    const invalidExtensions = resolution.extensions.filter(ext => !ext.startsWith('.'));
    if (invalidExtensions.length > 0) {
      errors.push(
        `resolution.extensions must start with a dot, invalid: ${invalidExtensions.join(', ')}`
      );
    }
  }

  private validateResolutionModuleDirectories(
    resolution: ModuleResolutionOptions,
    errors: string[]
  ): void {
    if (resolution.moduleDirectories === undefined) return;

    if (!Array.isArray(resolution.moduleDirectories)) {
      errors.push('resolution.moduleDirectories must be an array of strings');
      return;
    }

    if (!resolution.moduleDirectories.every(dir => typeof dir === 'string')) {
      errors.push('resolution.moduleDirectories must contain only strings');
      return;
    }

    if (resolution.moduleDirectories.length === 0) {
      errors.push('resolution.moduleDirectories must not be empty');
    }
  }

  private validateResolutionBooleanFlags(
    resolution: ModuleResolutionOptions,
    errors: string[]
  ): void {
    if (resolution.allowJs !== undefined && typeof resolution.allowJs !== 'boolean') {
      errors.push('resolution.allowJs must be a boolean');
    }

    if (
      resolution.resolveJsonModule !== undefined &&
      typeof resolution.resolveJsonModule !== 'boolean'
    ) {
      errors.push('resolution.resolveJsonModule must be a boolean');
    }
  }

  private validateCompilationOptions(options: ModuleSystemOptions, errors: string[]): void {
    if (!options.compilation) return;

    const compilation = options.compilation;

    // Validate target
    if (compilation.target !== undefined) {
      const validTargets: readonly string[] = TARGETS;
      if (!validTargets.includes(compilation.target)) {
        errors.push(
          `compilation.target must be one of: ${validTargets.join(', ')}, got: ${compilation.target}`
        );
      }
    }
    if (compilation.lib !== undefined) {
      errors.push(...validateLib(compilation.lib).map(message => `compilation.lib ${message}`));
    }
    const useDefine = compilation.useDefineForClassFields;
    if (useDefine !== undefined && typeof useDefine !== 'boolean') {
      errors.push('compilation.useDefineForClassFields must be a boolean');
    }

    // Validate boolean options
    const booleanOptions: (keyof CompilerOptions)[] = [
      'sourceMap',
      'minify',
      'noTypeCheck',
      'strict',
      'watch',
      'compileOnSave',
      'experimentalDecorators',
      'declaration',
    ];
    for (const option of booleanOptions) {
      if (compilation[option] !== undefined && typeof compilation[option] !== 'boolean') {
        errors.push(`compilation.${option} must be a boolean`);
      }
    }

    // Validate string options
    if (compilation.output !== undefined && typeof compilation.output !== 'string') {
      errors.push('compilation.output must be a string');
    }

    if (compilation.outDir !== undefined && typeof compilation.outDir !== 'string') {
      errors.push('compilation.outDir must be a string');
    }
  }

  private validateLoaderOptions(options: ModuleSystemOptions, errors: string[]): void {
    if (!options.loading) return;

    const loading = options.loading;

    if (loading.circularDependencyStrategy !== undefined) {
      const validStrategies = ['error', 'warn', 'ignore'];
      if (!validStrategies.includes(loading.circularDependencyStrategy)) {
        errors.push(
          `loading.circularDependencyStrategy must be one of: ${validStrategies.join(', ')}, got: ${loading.circularDependencyStrategy}`
        );
      }
    }

    if (loading.maxCacheSize !== undefined) {
      if (!Number.isInteger(loading.maxCacheSize) || loading.maxCacheSize < 1) {
        errors.push(
          `loading.maxCacheSize must be a positive integer, got: ${loading.maxCacheSize}`
        );
      }
    }

    if (loading.maxCacheMemory !== undefined) {
      if (!Number.isInteger(loading.maxCacheMemory) || loading.maxCacheMemory < 1024) {
        errors.push(
          `loading.maxCacheMemory must be at least 1KB (1024 bytes), got: ${loading.maxCacheMemory}`
        );
      }
    }

    if (loading.encoding !== undefined) {
      const validEncodings = [
        'ascii',
        'utf8',
        'utf-8',
        'utf16le',
        'ucs2',
        'ucs-2',
        'base64',
        'base64url',
        'latin1',
        'binary',
        'hex',
      ];
      if (!validEncodings.includes(loading.encoding)) {
        errors.push(`loading.encoding must be a valid encoding, got: ${loading.encoding}`);
      }
    }
  }

  /**
   * Load a module and all its dependencies
   */
  async loadModule(specifier: string, fromFile: string): Promise<LoadedModule> {
    try {
      const module = await this.loader.load(specifier, fromFile);
      this.registerAllLoadedModules();
      return module;
    } catch (error) {
      // Try to register partial module (if any) to enable validation
      try {
        const resolved = this.resolver.resolve(specifier, fromFile);
        const partial = this.loader.getModule(resolved.resolvedPath);
        if (partial) {
          this.registry.register(partial);
        }
      } catch {
        // ignore
      }
      throw error;
    }
  }

  /**
   * Load module synchronously
   */
  loadModuleSync(specifier: string, fromFile: string): LoadedModule {
    const module = this.loader.loadSync(specifier, fromFile);
    this.registerAllLoadedModules();
    return module;
  }

  private setupExternals(externals: string[] | undefined, previousExternals: string[]): void {
    if (externals !== undefined) {
      this.loader.setExternals(externals);
    } else if (previousExternals.length > 0) {
      this.loader.setExternals();
    }
  }

  /**
   * Report cycles among the modules of the current build according to
   * `circularDependencyStrategy`. Returns false when the build must fail.
   */
  private checkCircularDependencies(
    buildIds: Set<string>,
    warnings: string[],
    errors: CompilationError[]
  ): boolean {
    const strategy = this.loader.getCircularDependencyStrategy();
    if (strategy === 'ignore') {
      return true;
    }

    const cycles = this.registry
      .findCircularDependencies()
      .filter(cycle => cycle.every(id => buildIds.has(id)));
    if (cycles.length === 0) {
      return true;
    }

    const description = cycles.map(cycle => cycle.join(' -> ')).join(', ');
    if (strategy === 'error') {
      errors.push(
        this.createCompilationError(`Circular dependency detected: ${description}`, cycles[0][0])
      );
      return false;
    }
    warnings.push(`Circular dependencies detected: ${description}`);
    return true;
  }

  private compileModulesInOrder(
    compilationOrder: string[],
    compilationConfig: ModuleCompilationOptions,
    modules: Map<string, CompiledModule>,
    errors: CompilationError[],
    warnings: string[]
  ): void {
    for (const moduleId of compilationOrder) {
      const module = this.loader.getModule(moduleId);
      if (!module || moduleId.startsWith('external:') || module.isExternalLibrary) {
        // Packages from module directories stay host requires
        continue;
      }

      const extension = path.extname(module.resolvedPath);
      if (extension === '.js') {
        // Local JavaScript is bundled verbatim; its requires are rewritten when bundling
        modules.set(moduleId, { code: module.source });
        continue;
      }
      if (extension === '.json') {
        modules.set(moduleId, {
          code: `module.exports = ${JSON.stringify(JSON.parse(module.source))};`,
        });
        continue;
      }
      if (extension !== '.som') {
        continue;
      }

      this.compileModule({
        module,
        moduleId,
        compilationConfig,
        modules,
        errors,
        warnings,
      });
    }
  }

  private handleEntryPointLoadError(
    error: unknown,
    entryPoint: string,
    errors: CompilationError[]
  ): void {
    // The loader, the resolver and the registry throw Error objects only. Errors inside
    // the module graph already name the failing file and import.
    const failure = error as Error;
    const message =
      failure instanceof ModuleLoadError
        ? failure.message
        : `Failed to load entry point: ${failure.message}`;
    errors.push(this.createCompilationError(message, entryPoint, failure));
  }

  /**
   * Compile a module and all its dependencies
   */
  async compile(
    entryPoint: string,
    externals?: string[],
    overrideCompilation?: Partial<ModuleCompilationOptions>
  ): Promise<CompilationResult> {
    const errors: CompilationError[] = [];
    const warnings: string[] = [];
    const modules = new Map<string, CompiledModule>();
    const previousExternals = this.loader.getExternals();

    this.setupExternals(externals, previousExternals);

    try {
      // The entry is a file, relative to the current directory: not an import specifier,
      // which could be a package name or a path relative to baseUrl
      const entryFile = path.resolve(entryPoint);
      const entryModule = await this.loader.load(
        `./${path.basename(entryFile)}`,
        path.dirname(entryFile)
      );
      // The loader's cycle warnings depend on load order and cache state; cycles are
      // reported once, from the module graph, by checkCircularDependencies().
      this.loader.clearWarnings();
      this.registerAllLoadedModules();

      const buildIds = this.loader.collectDependencyClosure(entryModule.id);
      const compilationOrder = this.registry
        .getTopologicalSort()
        .filter(moduleId => buildIds.has(moduleId));
      if (!this.checkCircularDependencies(buildIds, warnings, errors)) {
        return { modules, entryPoint: entryModule.id, dependencies: [], errors, warnings };
      }

      const compilationConfig = this.resolveCompilationOptions(overrideCompilation);
      this.compileModulesInOrder(compilationOrder, compilationConfig, modules, errors, warnings);

      return {
        modules,
        entryPoint: entryModule.id,
        dependencies: compilationOrder,
        errors,
        warnings,
      };
    } catch (error) {
      // Watchers stay: a watch loop recompiles once the file is fixed
      this.handleEntryPointLoadError(error, entryPoint, errors);

      return {
        modules,
        entryPoint: '',
        dependencies: [],
        errors,
        warnings,
      };
    } finally {
      this.loader.setExternals(previousExternals);
    }
  }

  /**
   * Bundle modules into a single file
   */
  async bundle(options: BundleOptions): Promise<BundleOutput> {
    // A project that compiles to ES modules gets an ES module bundle by default
    const format =
      options.format ?? (this.resolveCompilationOptions().module === 'esm' ? 'esm' : 'commonjs');
    this.validateBundleOptions(options, format);
    // The whole bundle is minified once at the end, not every module as well
    const minify = options.minify ?? this.resolveCompilationOptions().minify;
    // Modules keep their syntax (checked against the target): the whole bundle is
    // lowered once, so TypeScript's helpers appear once. Every format keeps
    // CommonJS modules in the bundle's module table (an esm bundle exports the
    // entry's exports around it), so they compile to CommonJS whatever the
    // configured `module` is.
    const compilationOverrides: Partial<ModuleCompilationOptions> = {
      minify: false,
      downlevel: false,
      module: 'commonjs',
    };
    if (options.sourceMaps !== undefined) {
      compilationOverrides.sourceMap = options.sourceMaps;
    }

    const compilationResult = await this.compile(
      options.entryPoint,
      options.externals,
      compilationOverrides
    );

    // Fail fast on compilation errors with detailed reporting
    if (compilationResult.errors.length > 0) {
      const errorDetails = compilationResult.errors
        .map((error, index) => {
          // file, file:line or file:line:column (an error with a column has a line)
          const location = [error.filePath, error.line, error.column]
            .filter(part => part !== undefined)
            .join(':');
          let detail = `  ${index + 1}. ${location}\n     ${error.message}`;
          if (error.suggestion) {
            detail += `\n     💡 Suggestion: ${error.suggestion}`;
          }
          return detail;
        })
        .join('\n\n');

      const warningInfo =
        compilationResult.warnings.length > 0
          ? `\n\nWarnings (${compilationResult.warnings.length}):\n${compilationResult.warnings.map((w, i) => `  ${i + 1}. ${w}`).join('\n')}`
          : '';

      const errorMessage = `Bundle process failed with ${compilationResult.errors.length} error(s):\n\n${errorDetails}${warningInfo}`;

      // Stop bundling immediately - no partial bundles on errors
      throw new Error(errorMessage);
    }

    // Log warnings even if compilation succeeded
    if (compilationResult.warnings.length > 0) {
      this.logger.warn('Bundle compilation succeeded with warnings', {
        warningCount: compilationResult.warnings.length,
        warnings: compilationResult.warnings,
      });
    }

    // Generate bundle based on format
    try {
      return await this.generateBundle(compilationResult, { ...options, format, minify });
    } catch (error) {
      // Fail fast on bundle generation errors (all of them Error objects)
      throw new Error(`Failed to generate bundle: ${(error as Error).message}`);
    }
  }

  /** Reject a bundle format, global name or module-path mode that cannot work. */
  private validateBundleOptions(options: BundleOptions, format: unknown): void {
    if (!isBundleFormat(format)) {
      throw new Error(
        `Unsupported bundle format '${String(format)}'. Supported formats: ${BUNDLE_FORMATS.join(', ')}.`
      );
    }
    if (options.globalName !== undefined) {
      const problem = validateGlobalName(options.globalName);
      if (problem) throw new Error(`Invalid bundle globalName: ${problem}`);
    }
    if (options.modulePaths && format !== 'commonjs') {
      throw new Error(`Module paths need the commonjs bundle format, not '${format}'.`);
    }
  }

  /**
   * Resolve a module specifier
   */
  resolve(specifier: string, fromFile: string): string {
    const resolved = this.resolver.resolve(specifier, fromFile);
    return resolved.resolvedPath;
  }

  /**
   * Get module metadata
   */
  getModule(moduleId: string): ModuleMetadata | undefined {
    return this.registry.get(moduleId);
  }

  /**
   * Get all loaded modules
   */
  getAllModules(): ModuleMetadata[] {
    return this.registry.getAll();
  }

  /**
   * Get dependency graph
   */
  getDependencyGraph(): Map<string, string[]> {
    const graph = new Map<string, string[]>();
    const registryGraph = this.registry.getDependencyGraph();

    for (const [moduleId, node] of registryGraph) {
      graph.set(moduleId, node.dependencies);
    }

    return graph;
  }

  /**
   * Get module statistics
   */
  getStatistics() {
    return this.registry.getStatistics();
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.loader.clearCache();
    this.registry.clear();
  }

  /**
   * Drop a changed file and every module that (transitively) imports it from the
   * caches, so the next compile/bundle re-reads them. Returns the evicted module ids.
   */
  invalidate(filePath: string): string[] {
    const evicted = this.loader.invalidate(filePath);
    for (const moduleId of evicted) {
      this.registry.remove(moduleId);
    }
    return evicted;
  }

  /**
   * Update module system options
   */
  updateOptions(options: ModuleSystemOptions): void {
    if (options.resolution) {
      this.resolver.updateOptions(options.resolution);
    }
    // Note: Loader and registry options would need to be updated if they supported it
  }

  /**
   * Gracefully shutdown: stop the watchers of watch().
   */
  async shutdown(): Promise<void> {
    await this.stopWatching();
  }

  watch(entryPoint: string, options: ModuleSystemWatchOptions = {}): FSWatcher {
    const resolvedEntry = path.resolve(entryPoint);
    const watchRoots = new Set<string>();
    // Files and their directories; external modules have no path ('lodash', 'fs')
    const addWatchTarget = (target: string): void => {
      if (path.isAbsolute(target)) {
        watchRoots.add(target);
      }
    };

    addWatchTarget(resolvedEntry);
    addWatchTarget(path.dirname(resolvedEntry));

    for (const moduleMeta of this.registry.getAll()) {
      addWatchTarget(moduleMeta.resolvedPath);
      addWatchTarget(path.dirname(moduleMeta.resolvedPath));
    }

    for (const additional of options.additionalPaths ?? []) {
      addWatchTarget(path.resolve(additional));
    }

    const watchConfig: WatchOptions = {
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 150,
        pollInterval: 20,
      },
      ignored: options.includeNodeModules ? undefined : /node_modules/,
      ...options.chokidarOptions,
    };

    const watcher = chokidar.watch(Array.from(watchRoots), watchConfig);

    // chokidar's 'all' event is one of add, addDir, change, unlink and unlinkDir
    watcher.on('all', (event: ModuleWatchEventType, changedPath: string) => {
      const filePath = path.resolve(changedPath);
      if (event === 'change' || event === 'unlink') {
        this.invalidate(filePath);
      } else {
        // A new file or directory can change how existing specifiers resolve
        this.clearCache();
      }

      options.onChange?.({ type: event, filePath });
    });

    watcher.on('error', (error: Error) => {
      this.logger.error('ModuleSystem watch error', { error: error.message });

      // Close watcher on error - the wrapped close() will handle removal from tracking
      // Handle the promise explicitly to avoid unhandled rejections
      watcher.close().catch((closeError: Error) => {
        this.logger.warn('Failed to close errored watcher', { error: closeError.message });
      });
    });

    // A watcher closed by its owner is no longer one to stop. chokidar's 'close'
    // event is not reliable, so close() itself is wrapped.
    const originalClose = watcher.close.bind(watcher);
    watcher.close = async () => {
      try {
        await originalClose();
      } finally {
        this.activeWatchers.delete(watcher);
      }
    };

    this.activeWatchers.add(watcher);
    return watcher;
  }

  async stopWatching(): Promise<void> {
    if (this.activeWatchers.size === 0) {
      return;
    }

    this.logger.info('Stopping all watchers', { count: this.activeWatchers.size });

    const watchers = Array.from(this.activeWatchers);
    this.activeWatchers.clear();

    // A watcher that fails to close, or takes longer than 5 s, is reported, not awaited
    await Promise.all(
      watchers.map(async watcher => {
        try {
          await withTimeout(watcher.close(), { timeout: 5000, operation: 'close module watcher' });
        } catch (error) {
          this.logger.warn('Failed to close module watcher', { error: (error as Error).message });
        }
      })
    );

    this.logger.info('All watchers stopped');
  }

  private registerAllLoadedModules(): void {
    const loadedModules = this.loader.getAllModules();
    for (const loaded of loadedModules) {
      this.registry.register(loaded);
    }
  }

  private resolveCompilationOptions(
    overrides?: Partial<ModuleCompilationOptions>
  ): ModuleCompilationOptions {
    return { ...this.defaultCompilation, ...overrides };
  }

  private toPipelineOptions(config: ModuleCompilationOptions): PipelineCompileOptions {
    const options: PipelineCompileOptions = {};

    if (config.target) {
      options.target = config.target;
    }
    if (config.sourceMap !== undefined) {
      options.sourceMap = config.sourceMap;
    }
    if (config.minify !== undefined) {
      options.minify = config.minify;
    }
    if (config.noTypeCheck !== undefined) {
      options.typeCheck = !config.noTypeCheck;
    }
    if (config.strict !== undefined) {
      options.strict = config.strict;
    }
    if (config.experimentalDecorators !== undefined) {
      options.experimentalDecorators = config.experimentalDecorators;
    }
    if (config.lib !== undefined) {
      options.lib = config.lib;
    }
    if (config.useDefineForClassFields !== undefined) {
      options.useDefineForClassFields = config.useDefineForClassFields;
    }
    if (config.downlevel !== undefined) {
      options.downlevel = config.downlevel;
    }
    if (config.module !== undefined) {
      options.module = config.module;
    }
    if (config.checker !== undefined) {
      options.checker = config.checker;
    }
    if (config.locale !== undefined) {
      options.locale = config.locale;
    }

    return options;
  }

  private initializeBundleContext(
    result: CompilationResult,
    options: BundleOptions
  ): {
    moduleIdMapping: Map<string, string>;
    externals: Set<string>;
    externalModuleIds: Set<string>;
  } {
    if (!path.isAbsolute(result.entryPoint)) {
      throw new Error('Entry point must be an absolute path for bundling.');
    }

    const entryDir = path.dirname(result.entryPoint);
    const moduleIdMapping = new Map<string, string>();
    const externals = new Set(
      (options.externals ?? []).map(ext => ext.trim()).filter(ext => ext.length > 0)
    );
    const externalModuleIds = new Set<string>();

    // Keys are paths relative to the entry's directory, so the bundle holds no build path
    for (const moduleId of result.modules.keys()) {
      moduleIdMapping.set(moduleId, path.relative(entryDir, moduleId).split(path.sep).join('/'));
    }

    for (const ext of externals) {
      this.markExternalModule(result.entryPoint, ext, externalModuleIds, result.entryPoint);
    }

    return { moduleIdMapping, externals, externalModuleIds };
  }

  private createBundleCodeBuilder(): { code: string; line: number } {
    return { code: '', line: 1 };
  }

  private appendToBuilder(builder: { code: string; line: number }, segment: string): void {
    builder.code += segment;
    const matches = segment.match(/\n/g);
    if (matches) {
      builder.line += matches.length;
    }
  }

  private createSourceMapGenerator(
    options: BundleOptions,
    result: CompilationResult
  ): SourceMapGenerator | null {
    if (!options.sourceMaps) {
      return null;
    }

    return new SourceMapGenerator({
      file: path.basename(options.outputPath ?? this.deriveBundleFilename(result.entryPoint)),
    });
  }

  /** The `modules` table. Returns the lines each module's code occupies in the body. */
  private async buildModuleMapSection(
    bundleBuilder: { code: string; line: number },
    processedModules: BundleModule[],
    externalModuleIds: Set<string>,
    generator: SourceMapGenerator | null,
    options: BundleOptions
  ): Promise<BundleModuleLines[]> {
    this.appendToBuilder(bundleBuilder, "  'use strict';\n\n  var modules = {\n");
    const moduleLines: BundleModuleLines[] = [];

    const inlinedSources = new Set<string>();
    let firstModule = true;

    for (const module of processedModules) {
      if (externalModuleIds.has(module.id)) {
        continue;
      }

      if (!firstModule) {
        this.appendToBuilder(bundleBuilder, ',\n');
      } else {
        firstModule = false;
      }

      const params = options.modulePaths
        ? 'module, exports, require, __filename, __dirname'
        : 'module, exports, require';
      this.appendToBuilder(
        bundleBuilder,
        `  ${JSON.stringify(module.key)}: function(${params}) {\n`
      );
      const moduleStartLine = bundleBuilder.line;
      this.appendToBuilder(bundleBuilder, module.code);
      moduleLines.push({ key: module.key, start: moduleStartLine, end: bundleBuilder.line });

      if (generator && module.map) {
        await this.addModuleSourceMappings(
          generator,
          { key: module.key, map: module.map },
          moduleStartLine,
          inlinedSources,
          options
        );
      }

      this.appendToBuilder(bundleBuilder, '\n  }');
    }

    this.appendToBuilder(bundleBuilder, '\n  };\n\n');
    return moduleLines;
  }

  private async addModuleSourceMappings(
    generator: SourceMapGenerator,
    module: { key: string; map: RawSourceMap },
    moduleStartLine: number,
    inlinedSources: Set<string>,
    options: BundleOptions
  ): Promise<void> {
    const moduleMap = module.map;
    await SourceMapConsumer.with(moduleMap, null, consumer => {
      consumer.eachMapping(mapping => {
        if (mapping.originalLine == null || mapping.originalColumn == null) {
          return;
        }
        generator.addMapping({
          generated: {
            line: moduleStartLine + (mapping.generatedLine - 1),
            column: mapping.generatedColumn,
          },
          original: {
            line: mapping.originalLine,
            column: mapping.originalColumn,
          },
          source: module.key,
          name: mapping.name ?? undefined,
        });
      });

      if (options.inlineSources && !inlinedSources.has(module.key)) {
        const content = moduleMap.sourcesContent?.find(item => typeof item === 'string');
        if (content !== undefined) {
          generator.setSourceContent(module.key, content);
          inlinedSources.add(module.key);
        }
      }
    });
  }

  private addBundleRuntimeCode(
    bundleBuilder: { code: string; line: number },
    entryKey: string,
    modulePaths: Map<string, string> | null,
    options: { format: BundleFormat; imports: readonly string[] }
  ): void {
    this.appendToBuilder(
      bundleBuilder,
      '  var cache = {};\n' +
        externalRequireCode(options.format, options.imports) +
        '  var __hasOwn = Object.prototype.hasOwnProperty;\n\n'
    );

    let moduleCall = '    modules[id](module, module.exports, _require);\n\n';
    if (modulePaths) {
      // Each module gets its own path and a require that resolves what is not bundled
      // from that path, as Node would for the original file.
      this.appendToBuilder(
        bundleBuilder,
        `  var __paths = ${JSON.stringify(Object.fromEntries(modulePaths))};\n` +
          '  var __createRequire = require("module").createRequire;\n' +
          '  var __dirnameOf = require("path").dirname;\n\n' +
          '  function __moduleRequire(filename) {\n' +
          '    var hostRequire = __createRequire(filename);\n' +
          '    function moduleRequire(id) {\n' +
          '      return __hasOwn.call(modules, id) ? _require(id) : hostRequire(id);\n' +
          '    }\n' +
          '    moduleRequire.resolve = hostRequire.resolve;\n' +
          '    moduleRequire.cache = hostRequire.cache;\n' +
          '    moduleRequire.main = hostRequire.main;\n' +
          '    return moduleRequire;\n' +
          '  }\n\n'
      );
      moduleCall =
        '    var filename = __paths[id];\n' +
        '    modules[id](module, module.exports, __moduleRequire(filename), filename, __dirnameOf(filename));\n\n';
    }

    this.appendToBuilder(
      bundleBuilder,
      '  function _require(id) {\n' +
        '    if (__hasOwn.call(cache, id)) return cache[id].exports;\n\n' +
        '    if (!__hasOwn.call(modules, id)) {\n' +
        '      if (__externalRequire) {\n' +
        '        return __externalRequire(id);\n' +
        '      }\n' +
        '      throw new Error("Module \'" + id + "\' not found in bundle and no external require available.");\n' +
        '    }\n\n' +
        '    var module = cache[id] = { exports: {} };\n' +
        moduleCall +
        '    return module.exports;\n' +
        '  }\n\n'
    );

    this.appendToBuilder(
      bundleBuilder,
      `  // Start with entry point and expose its exports\n  var entryModule = _require(${JSON.stringify(entryKey)});\n\n`
    );
  }

  private generateBundleSourceMap(generator: SourceMapGenerator | null): RawSourceMap | undefined {
    return generator?.toJSON();
  }

  private async applyMinification(
    bundleBuilder: { code: string; line: number },
    rawMap: RawSourceMap | undefined,
    options: BundleOptions
  ): Promise<RawSourceMap | undefined> {
    if (!options.minify) {
      return rawMap;
    }

    try {
      const minified = this.minify(bundleBuilder.code, rawMap, Boolean(options.sourceMaps));
      bundleBuilder.code = minified.code;
      return minified.map;
    } catch (error) {
      throw new Error(`Minification failed: ${(error as Error).message}`);
    }
  }

  /**
   * The bundle: a body (the module table and the runtime, which ends with
   * `entryModule`) lowered for the target as a whole, inside the wrapper of the
   * format that hands the entry's exports to the host.
   */
  private async generateBundle(
    result: CompilationResult,
    options: BundleOptions & { format: BundleFormat }
  ): Promise<BundleOutput> {
    const context = this.initializeBundleContext(result, options);
    const processedModules = this.prepareModulesForBundle(
      result,
      context.moduleIdMapping,
      context.externals,
      context.externalModuleIds
    );

    const entryKey = context.moduleIdMapping.get(result.entryPoint);
    if (!entryKey) {
      throw new Error(`Entry module ${result.entryPoint} missing from bundle results.`);
    }
    const bundled = processedModules.filter(module => !context.externalModuleIds.has(module.id));
    const imports = this.collectRuntimeImports(bundled, options.format);

    const body = this.createBundleCodeBuilder();
    const generator = this.createSourceMapGenerator(options, result);
    const moduleLines = await this.buildModuleMapSection(
      body,
      processedModules,
      context.externalModuleIds,
      generator,
      options
    );

    const modulePaths = options.modulePaths
      ? new Map(processedModules.map(module => [module.key, module.id]))
      : null;
    this.addBundleRuntimeCode(body, entryKey, modulePaths, { format: options.format, imports });

    let rawMap = this.lowerBundleBody(body, this.generateBundleSourceMap(generator), moduleLines);

    const wrapper = bundleWrapper({
      format: options.format,
      globalName: options.globalName,
      imports,
      exportNames:
        options.format === 'esm'
          ? collectExportNames(entryKey, new Map(bundled.map(module => [module.key, module.code])))
          : [],
      defaultIsExportsObject: !result.entryPoint.endsWith('.som'),
    });
    const bundleBuilder = this.createBundleCodeBuilder();
    // The entry's `#!/usr/bin/env node` starts a bundle that runs under Node.js
    // (a browser script has none)
    const shebang = ModuleSystem.shebangOf(result.modules.get(result.entryPoint)?.code);
    if (shebang && options.format !== 'iife') this.appendToBuilder(bundleBuilder, `${shebang}\n`);
    this.appendToBuilder(bundleBuilder, wrapper.prefix);
    if (rawMap) rawMap = shiftSourceMap(rawMap, bundleBuilder.line - 1);
    this.appendToBuilder(bundleBuilder, body.code + wrapper.suffix);

    rawMap = await this.applyMinification(bundleBuilder, rawMap, options);
    if (rawMap && options.outputPath) {
      // Sources are keyed relative to the entry; tools resolve them from the map file.
      const entryDir = path.dirname(result.entryPoint);
      const mapDir = path.dirname(path.resolve(options.outputPath));
      rawMap.sources = rawMap.sources.map(source =>
        path.relative(mapDir, path.resolve(entryDir, source)).split(path.sep).join('/')
      );
    }
    return {
      code: bundleBuilder.code,
      map: rawMap && JSON.stringify(rawMap),
    };
  }

  /** The `#!…` line a compiled module starts with, if any. */
  private static shebangOf(code: string | undefined): string | undefined {
    return code?.match(/^#![^\n\r]*/)?.[0];
  }

  /**
   * Lower the bundle body for the compilation target once (modules were only
   * checked against it), so TypeScript's helpers appear once. Local JavaScript
   * bundled as it is gets lowered too; what it uses that the target cannot
   * express fails the bundle.
   */
  private lowerBundleBody(
    body: { code: string; line: number },
    map: RawSourceMap | undefined,
    moduleLines: BundleModuleLines[]
  ): RawSourceMap | undefined {
    const compilation = this.resolveCompilationOptions();
    const target = compilation.target ?? DEFAULT_TARGET;
    const lowered = lowerToTarget(body.code, {
      target,
      useDefineForClassFields: compilation.useDefineForClassFields,
      experimentalDecorators: compilation.experimentalDecorators,
      sourceMap: map !== undefined,
    });
    if (lowered.diagnostics.length > 0) {
      const details = lowered.diagnostics.map(diagnostic => {
        // The runtime around the modules is ES5: what a target cannot run is in a module
        const module = moduleLines.find(
          lines => diagnostic.line >= lines.start && diagnostic.line <= lines.end
        )!;
        const line = diagnostic.line - module.start + 1;
        return `  ${module.key}:${line}:${diagnostic.column + 1}: ${diagnostic.message}`;
      });
      throw new Error(`The bundle cannot run on ${target}:\n${details.join('\n')}`);
    }
    body.code = lowered.code;
    return map && lowered.map ? composeSourceMaps(lowered.map, map) : map;
  }

  /**
   * Modules the bundle loads at run time: requires with a constant module that are
   * not bundle keys. An ES module bundle imports them; a browser bundle has nothing
   * to load them with.
   */
  private collectRuntimeImports(modules: BundleModule[], format: BundleFormat): string[] {
    if (format === 'commonjs') return [];
    const keys = new Set(modules.map(module => module.key));
    const imports = new Set(
      modules.flatMap(module => module.requires).filter(specifier => !keys.has(specifier))
    );
    if (format === 'iife' && imports.size > 0) {
      throw new Error(
        `An iife bundle runs without a module loader, but it needs ${[...imports]
          .map(specifier => `'${specifier}'`)
          .join(', ')}. Bundle those modules or use the commonjs or esm format.`
      );
    }
    return [...imports];
  }

  private buildExternalCandidates(raw: string, entryPoint: string): string[] {
    const candidates = new Set<string>();
    candidates.add(raw);
    if (raw.startsWith('./') || raw.startsWith('../')) {
      const absolute = path.resolve(path.dirname(entryPoint), raw);
      candidates.add(absolute);
    }
    const withoutExt = raw.replace(/\.(js|som)$/i, '');
    if (withoutExt !== raw) {
      candidates.add(withoutExt);
      candidates.add(`${withoutExt}.som`);
      candidates.add(`${withoutExt}.js`);
    }
    if (raw.includes('/')) {
      const segments = raw.split('/');
      for (let i = segments.length; i > 1; i--) {
        candidates.add(segments.slice(0, i).join('/') + '/*');
      }
    }
    const variants = new Set<string>();
    for (const candidate of candidates) {
      variants.add(candidate);
      if (candidate.endsWith('/*')) {
        variants.add(candidate.slice(0, -2));
      }
    }
    if (/^(?:\.|\.\.)\//.test(raw)) {
      variants.add(raw);
      variants.add(`${raw}.som`);
      variants.add(`${raw}.js`);
    } else if (!raw.endsWith('.som') && !raw.endsWith('.js')) {
      variants.add(`${raw}.som`);
      variants.add(`${raw}.js`);
      variants.add(`${raw}/index.som`);
      variants.add(`${raw}/index.js`);
    }
    return Array.from(variants);
  }

  private matchesExternal(raw: string, externals: Set<string>, entryPoint: string): boolean {
    if (externals.size === 0) return false;
    for (const candidate of this.buildExternalCandidates(raw, entryPoint)) {
      if (externals.has(candidate)) {
        return true;
      }
    }
    return false;
  }

  private markExternalModule(
    ownerModuleId: string,
    raw: string,
    externalModuleIds: Set<string>,
    entryPoint: string
  ): void {
    for (const candidate of this.buildExternalCandidates(raw, entryPoint)) {
      try {
        const resolved = this.resolver.resolve(candidate, ownerModuleId);
        externalModuleIds.add(resolved.resolvedPath);
        return;
      } catch {
        // Ignore failures; we only care about candidates that resolve
      }
    }
  }

  private prepareModulesForBundle(
    result: CompilationResult,
    moduleIdMapping: Map<string, string>,
    externals: Set<string>,
    externalModuleIds: Set<string>
  ): BundleModule[] {
    const modules: BundleModule[] = [];
    const context: RequireRewriteContext = {
      moduleIdMapping,
      externals,
      externalModuleIds,
      entryPoint: result.entryPoint,
    };

    for (const [moduleId, moduleData] of result.modules) {
      // A shebang is only valid on the bundle's first line; its line stays, empty
      const code = moduleData.code.replace(/^#![^\n\r]*/, '');
      const rewritten = this.rewriteRequiresForModule(moduleId, code, context);
      const key = moduleIdMapping.get(moduleId);
      if (!key) {
        continue;
      }
      modules.push({ id: moduleId, key, ...rewritten, map: moduleData.map });
    }

    return modules;
  }

  /**
   * Point the requires of a module at the bundle's keys. Calls are found in the
   * module's syntax tree, so requires in comments and strings stay as they are.
   * Returns the code and the modules its other requires load at run time.
   */
  private rewriteRequiresForModule(
    ownerModuleId: string,
    code: string,
    context: RequireRewriteContext
  ): { code: string; requires: string[] } {
    const calls = findRequireCalls(code);
    if (!calls) {
      // Local JavaScript that does not parse is bundled as it is
      return { code, requires: [] };
    }

    // Local JavaScript is bundled verbatim: its dynamic requires are left to the host
    // require instead of failing the bundle.
    const isSomonModule = ownerModuleId.endsWith('.som');
    const dynamic = calls.find(call => call.specifier === undefined);
    if (isSomonModule && dynamic) {
      const kind = dynamic.template ? 'Dynamic template literal require' : 'Dynamic require';
      throw new Error(`${kind} expressions are not supported in ${ownerModuleId}.`);
    }

    let rewritten = code;
    const requires: string[] = [];
    // From the end, so that the offsets of earlier calls stay valid
    for (const call of [...calls].reverse()) {
      if (call.specifier === undefined) continue;
      const key = this.bundleKeyOf(ownerModuleId, call.specifier, context);
      if (key === undefined) {
        requires.unshift(call.specifier);
      } else {
        // A double-quoted literal whatever the characters of the key
        rewritten =
          rewritten.slice(0, call.start) + JSON.stringify(key) + rewritten.slice(call.end);
      }
    }
    return { code: rewritten, requires };
  }

  /**
   * The bundle key of the module that `require(specifier)` loads in `ownerModuleId`,
   * or undefined when it stays a require at run time (externals, packages, Node.js
   * modules, files that are not bundled). Compiled SomonScript requires `./x.js` for
   * an import of `./x`, so when that is no bundled file, `./x.som` and `./x` (a
   * directory, or a file with another extension such as `.json`) are tried.
   */
  private bundleKeyOf(
    ownerModuleId: string,
    specifier: string,
    context: RequireRewriteContext
  ): string | undefined {
    const candidates = [specifier];
    if (/^\.\.?\/.+\.js$/i.test(specifier)) {
      const withoutExtension = specifier.slice(0, -'.js'.length);
      candidates.push(`${withoutExtension}.som`, withoutExtension);
    }
    for (const candidate of candidates) {
      if (this.matchesExternal(candidate, context.externals, context.entryPoint)) {
        this.markExternalModule(
          ownerModuleId,
          candidate,
          context.externalModuleIds,
          context.entryPoint
        );
        return undefined;
      }
      let resolvedPath: string;
      try {
        resolvedPath = this.resolver.resolve(candidate, ownerModuleId).resolvedPath;
      } catch {
        continue;
      }
      const key = context.moduleIdMapping.get(resolvedPath);
      if (key !== undefined && !context.externalModuleIds.has(resolvedPath)) {
        return key;
      }
    }
    return undefined;
  }

  private compileModule(params: {
    module: LoadedModule;
    moduleId: string;
    compilationConfig: ModuleCompilationOptions;
    modules: Map<string, { code: string; map?: RawSourceMap }>;
    errors: CompilationError[];
    warnings: string[];
  }): void {
    const { module, moduleId, compilationConfig, modules, errors, warnings } = params;
    try {
      const compileResult = compileSource(module.source, {
        ...this.toPipelineOptions(compilationConfig),
        // The TypeScript checker resolves the module's imports from its location
        filePath: module.resolvedPath,
      });

      if (compileResult.errors.length > 0) {
        for (const message of compileResult.errors) {
          errors.push(this.createCompilationError(message, module.resolvedPath));
        }
        return;
      }

      const map = this.parseModuleSourceMap(module, compileResult.sourceMap);
      modules.set(moduleId, { code: compileResult.code, map });
      warnings.push(
        ...compileResult.warnings.map(warning => `Warning in ${module.resolvedPath}: ${warning}`)
      );
    } catch (error) {
      // A crash of the compiler (it reports problems in `errors`), always an Error
      const failure = error as Error;
      errors.push(
        this.createCompilationError(
          `Unexpected error: ${failure.message}`,
          module.resolvedPath,
          failure
        )
      );
    }
  }

  /** The compiler's source map of a module (a JSON string), named after its file. */
  private parseModuleSourceMap(
    module: LoadedModule,
    rawMap: string | undefined
  ): RawSourceMap | undefined {
    if (!rawMap) {
      return undefined;
    }

    const parsed = JSON.parse(rawMap) as RawSourceMap;
    parsed.file = module.resolvedPath;
    // A module without statements has no mappings, and no sources
    parsed.sources =
      parsed.sources.length > 0
        ? parsed.sources.map(() => module.resolvedPath)
        : [module.resolvedPath];
    if (!parsed.sourcesContent || parsed.sourcesContent.length === 0) {
      parsed.sourcesContent = [module.source];
    }
    return parsed;
  }

  private deriveBundleFilename(entryPoint: string): string {
    if (entryPoint.toLowerCase().endsWith('.som')) {
      return `${path.basename(entryPoint, '.som')}.bundle.js`;
    }
    return `${path.basename(entryPoint)}.bundle.js`;
  }

  private minify(
    code: string,
    map: RawSourceMap | undefined,
    sourceMaps: boolean
  ): { code: string; map?: RawSourceMap } {
    // Loaded on first use, so that bundles without minification do not load it
    let preset: PluginItem;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      preset = require('babel-preset-minify') as PluginItem;
    } catch {
      throw new Error(
        "Minification requires the optional dependency 'babel-preset-minify'. Install it to enable minified bundles."
      );
    }
    // Without configuration files Babel never ignores the code: there is always a result
    const out = transformSync(code, {
      // The bundle is minified the same way in every project: no babel.config.* or .babelrc
      configFile: false,
      babelrc: false,
      sourceMaps,
      inputSourceMap: map,
      presets: [preset],
      comments: false,
      compact: true,
    })!;

    // With `sourceMaps` (and only then) there is an input map and Babel returns a map
    return { code: out.code!, map: sourceMaps ? (out.map as RawSourceMap) : undefined };
  }

  /**
   * Validate module system integrity
   */
  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for circular dependencies
    const circularDeps = this.registry.findCircularDependencies();
    if (circularDeps.length > 0) {
      errors.push(
        `Circular dependencies found: ${circularDeps.map(cycle => cycle.join(' -> ')).join(', ')}`
      );
    }

    // Check for missing dependencies
    for (const module of this.registry.getAll()) {
      // Node.js modules (`fs`, `node:path`) are provided by the host
      for (const dep of module.dependencies.filter(specifier => !isBuiltin(specifier))) {
        try {
          this.resolver.resolve(dep, module.resolvedPath);
        } catch (error) {
          // Record a validation error with context
          errors.push(`Missing dependency '${dep}' in module '${module.id}': ${error}`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

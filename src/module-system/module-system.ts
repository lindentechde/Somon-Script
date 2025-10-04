import chokidar from 'chokidar';
import type { FSWatcher, WatchOptions } from 'chokidar';
import * as path from 'path';
import { RawSourceMap, SourceMapConsumer, SourceMapGenerator } from 'source-map';
import { ModuleResolver, ModuleResolutionOptions } from './module-resolver';
import { ModuleLoader, ModuleLoadOptions, LoadedModule } from './module-loader';
import { ModuleRegistry, ModuleMetadata } from './module-registry';
import { transformSync, type PluginItem } from '@babel/core';
import { CompilerOptions } from '../config';
import { ModuleSystemMetrics, ModuleSystemStats, SystemHealth } from './metrics';
import { CircuitBreakerManager } from './circuit-breaker';
import { Logger } from './logger';
import { RuntimeConfigManager, ManagementServer } from './runtime-config';
import { version as packageVersion } from '../../package.json';
import { ResourceLimiter, ResourceLimits } from './resource-limiter';
import { withTimeout } from './async-timeout';
import {
  compile as compileSource,
  type CompileOptions as PipelineCompileOptions,
} from '../compiler';

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
  // Production systems
  metrics?: boolean;
  circuitBreakers?: boolean;
  logger?: boolean;
  managementServer?: boolean;
  managementPort?: number;
  resourceLimits?: ResourceLimits;
  operationTimeout?: number; // Default timeout for async operations in ms
}

export interface CompiledModule {
  code: string;
  map?: RawSourceMap;
}

export interface CompilationError {
  message: string;
  filePath: string;
  line?: number;
  column?: number;
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
  format?: 'commonjs';
  minify?: boolean;
  sourceMaps?: boolean;
  externals?: string[];
  inlineSources?: boolean;
}

export interface BundleOutput {
  code: string;
  map?: string;
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

  // Production systems
  private readonly metrics?: ModuleSystemMetrics;
  private readonly circuitBreakers?: CircuitBreakerManager;
  private readonly logger?: Logger;
  private readonly configManager?: RuntimeConfigManager;
  private readonly managementServer?: ManagementServer;
  private readonly resourceLimiter?: ResourceLimiter;
  private readonly operationTimeout: number;

  constructor(options: ModuleSystemOptions = {}) {
    // Validate configuration upfront before initializing components
    this.validateConfiguration(options);

    this.resolver = new ModuleResolver(options.resolution);
    this.operationTimeout = options.operationTimeout ?? 120000; // Default 2 minutes

    // Initialize production systems if requested
    if (options.metrics) {
      this.metrics = new ModuleSystemMetrics();
    }

    if (options.circuitBreakers) {
      this.circuitBreakers = new CircuitBreakerManager();
    }

    if (options.logger) {
      this.logger = new Logger('ModuleSystem');
    }

    if (options.resourceLimits) {
      this.resourceLimiter = new ResourceLimiter(options.resourceLimits);
      this.resourceLimiter.onWarning((usage, limit) => {
        if (this.logger) {
          this.logger.warn('Resource limit warning', { usage, limit });
        } else {
          console.warn(`Resource warning: ${limit} at ${JSON.stringify(usage)}`);
        }
      });
      this.resourceLimiter.start();

      if (this.logger) {
        this.logger.info('Resource limiter started', {
          maxMemoryBytes: options.resourceLimits.maxMemoryBytes,
          maxFileHandles: options.resourceLimits.maxFileHandles,
          maxCachedModules: options.resourceLimits.maxCachedModules,
          checkInterval: options.resourceLimits.checkInterval,
        });
      }
    }

    if (options.managementServer && this.metrics && this.circuitBreakers) {
      this.configManager = new RuntimeConfigManager();
      this.managementServer = new ManagementServer(
        this.metrics,
        this.circuitBreakers,
        this.configManager
      );
      // Async start will be called separately
    }

    // Initialize loader with production systems
    this.loader = new ModuleLoader(
      this.resolver,
      options.loading || {},
      this.metrics,
      this.circuitBreakers
    );

    this.registry = new ModuleRegistry();
    this.defaultCompilation = options.compilation ?? {};

    if (this.logger) {
      this.logger.info('ModuleSystem initialized with production features', {
        metrics: !!this.metrics,
        circuitBreakers: !!this.circuitBreakers,
        managementServer: !!this.managementServer,
        resourceLimiter: !!this.resourceLimiter,
        operationTimeout: this.operationTimeout,
      });
    }
  }

  /**
   * Provide helpful suggestions for common compilation errors.
   */
  private getSuggestionForError(errorMessage: string, _filePath: string): string | undefined {
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
    // Try to extract line and column from error message
    const lineColMatch = message.match(/(?:line|:)\s*(\d+)(?::(\d+))?/i);
    const line = lineColMatch ? parseInt(lineColMatch[1], 10) : undefined;
    const column = lineColMatch && lineColMatch[2] ? parseInt(lineColMatch[2], 10) : undefined;

    return {
      message,
      filePath,
      line,
      column,
      suggestion: this.getSuggestionForError(message, filePath),
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
    this.validateManagementServer(options, errors);
    this.validateManagementPort(options, errors);
    this.validateOperationTimeout(options, errors);
    this.validateResourceLimits(options, errors);

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
      const validTargets = ['es5', 'es2015', 'es2020', 'esnext'];
      if (!validTargets.includes(compilation.target)) {
        errors.push(
          `compilation.target must be one of: ${validTargets.join(', ')}, got: ${compilation.target}`
        );
      }
    }

    // Validate boolean options
    const booleanOptions: (keyof CompilerOptions)[] = [
      'sourceMap',
      'minify',
      'noTypeCheck',
      'strict',
      'watch',
      'compileOnSave',
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

  private validateManagementServer(options: ModuleSystemOptions, errors: string[]): void {
    if (options.managementServer) {
      if (!options.metrics) {
        errors.push('managementServer requires metrics to be enabled. Set options.metrics = true.');
      }
      if (!options.circuitBreakers) {
        errors.push(
          'managementServer requires circuitBreakers to be enabled. Set options.circuitBreakers = true.'
        );
      }
    }
  }

  private validateManagementPort(options: ModuleSystemOptions, errors: string[]): void {
    if (options.managementPort !== undefined) {
      if (
        !Number.isInteger(options.managementPort) ||
        options.managementPort < 1 ||
        options.managementPort > 65535
      ) {
        errors.push(
          `managementPort must be an integer between 1 and 65535, got: ${options.managementPort}`
        );
      }
    }
  }

  private validateOperationTimeout(options: ModuleSystemOptions, errors: string[]): void {
    if (options.operationTimeout !== undefined) {
      if (
        !Number.isInteger(options.operationTimeout) ||
        options.operationTimeout < 1000 ||
        options.operationTimeout > 600000
      ) {
        errors.push(
          `operationTimeout must be between 1000ms (1s) and 600000ms (10min), got: ${options.operationTimeout}ms`
        );
      }
    }
  }

  private validateResourceLimits(options: ModuleSystemOptions, errors: string[]): void {
    if (!options.resourceLimits) return;

    const limits = options.resourceLimits;

    if (limits.maxMemoryBytes !== undefined) {
      if (!Number.isInteger(limits.maxMemoryBytes) || limits.maxMemoryBytes < 1024 * 1024) {
        errors.push(
          `resourceLimits.maxMemoryBytes must be at least 1MB (1048576 bytes), got: ${limits.maxMemoryBytes}`
        );
      }
    }

    if (limits.maxFileHandles !== undefined) {
      if (!Number.isInteger(limits.maxFileHandles) || limits.maxFileHandles < 1) {
        errors.push(
          `resourceLimits.maxFileHandles must be a positive integer, got: ${limits.maxFileHandles}`
        );
      }
    }

    if (limits.maxCachedModules !== undefined) {
      if (!Number.isInteger(limits.maxCachedModules) || limits.maxCachedModules < 1) {
        errors.push(
          `resourceLimits.maxCachedModules must be a positive integer, got: ${limits.maxCachedModules}`
        );
      }
    }

    if (limits.checkInterval !== undefined) {
      if (
        !Number.isInteger(limits.checkInterval) ||
        limits.checkInterval < 100 ||
        limits.checkInterval > 60000
      ) {
        errors.push(
          `resourceLimits.checkInterval must be between 100ms and 60000ms, got: ${limits.checkInterval}ms`
        );
      }
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
    // Check resource limits before loading
    if (this.resourceLimiter && !this.resourceLimiter.canLoadModule()) {
      throw new Error('Module cache limit reached - cannot load more modules');
    }

    try {
      const loadPromise = this.loader.load(specifier, fromFile);

      // Apply timeout protection
      const module = await withTimeout(loadPromise, {
        timeout: this.operationTimeout,
        operation: `loadModule(${specifier})`,
      });

      if (this.resourceLimiter) {
        this.resourceLimiter.incrementModules();
      }

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

  /**
   * Compile a module and all its dependencies
   * The compile method has necessary complexity for comprehensive error handling
   */
  // eslint-disable-next-line complexity, max-depth
  async compile(
    entryPoint: string,
    externals?: string[],
    overrideCompilation?: Partial<CompilerOptions>
  ): Promise<CompilationResult> {
    const errors: CompilationError[] = [];
    const warnings: string[] = [];
    const modules = new Map<string, CompiledModule>();
    const previousExternals = this.loader.getExternals();

    if (externals !== undefined) {
      this.loader.setExternals(externals);
    } else if (previousExternals.length > 0) {
      this.loader.setExternals();
    }

    try {
      // Load entry point and all dependencies
      const entryModule = await this.loader.load(entryPoint, path.dirname(entryPoint));

      // Register all loaded modules
      const allModules = this.loader.getAllModules();
      for (const module of allModules) {
        this.registry.register(module);
      }

      // Get compilation order
      const compilationOrder = this.registry.getTopologicalSort();

      // Check for circular dependencies
      const circularDeps = this.registry.findCircularDependencies();
      if (circularDeps.length > 0) {
        warnings.push(
          `Circular dependencies detected: ${circularDeps.map(cycle => cycle.join(' -> ')).join(', ')}`
        );
      }

      // Compile each module - collect ALL errors before returning
      const compilationConfig = this.resolveCompilationOptions(overrideCompilation);

      for (const moduleId of compilationOrder) {
        const module = this.loader.getModule(moduleId);
        if (module?.resolvedPath.endsWith('.som')) {
          try {
            const compileResult = compileSource(
              module.source,
              this.toPipelineOptions(compilationConfig)
            );

            // Collect all compilation errors with context and suggestions
            if (compileResult.errors.length > 0) {
              for (const errorMsg of compileResult.errors) {
                const error = this.createCompilationError(errorMsg, module.resolvedPath);
                errors.push(error);

                if (this.logger) {
                  this.logger.error('Module compilation error', {
                    file: error.filePath,
                    line: error.line,
                    column: error.column,
                    message: error.message,
                    suggestion: error.suggestion,
                  });
                }
              }
              // Continue to next module - collect all errors
              continue;
            }

            const parsedMap = this.parseModuleSourceMap(module, compileResult.sourceMap, warnings);

            modules.set(moduleId, { code: compileResult.code, map: parsedMap });

            if (compileResult.warnings.length > 0) {
              warnings.push(
                ...compileResult.warnings.map(
                  warning => `Warning in ${module.resolvedPath}: ${warning}`
                )
              );
            }
          } catch (error) {
            // Handle unexpected compilation errors
            const compilationError = this.createCompilationError(
              `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
              module.resolvedPath,
              error instanceof Error ? error : undefined
            );
            errors.push(compilationError);

            if (this.logger) {
              this.logger.error('Unexpected compilation error', {
                file: compilationError.filePath,
                message: compilationError.message,
                suggestion: compilationError.suggestion,
              });
            }
          }
        }
      }

      return {
        modules,
        entryPoint: entryModule.id,
        dependencies: compilationOrder,
        errors,
        warnings,
      };
    } catch (error) {
      // Handle entry point loading errors
      const loadError = this.createCompilationError(
        `Failed to load entry point: ${error instanceof Error ? error.message : String(error)}`,
        entryPoint,
        error instanceof Error ? error : undefined
      );
      errors.push(loadError);

      if (this.logger) {
        this.logger.error('Entry point loading failed', {
          file: loadError.filePath,
          message: loadError.message,
          suggestion: loadError.suggestion,
        });
      }

      // Clean up any active watchers on compilation failure
      if (this.activeWatchers.size > 0) {
        if (this.logger) {
          this.logger.warn('Compilation failed, cleaning up active watchers', {
            watcherCount: this.activeWatchers.size,
          });
        }
        await this.stopWatching();
      }

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
    const format = options.format ?? 'commonjs';
    if (format !== 'commonjs') {
      throw new Error(
        `Only the 'commonjs' bundle format is currently supported. Received '${format}'.`
      );
    }
    const compilationOverrides: Partial<CompilerOptions> = {};
    if (options.minify !== undefined) {
      compilationOverrides.minify = options.minify;
    }
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
          let detail = `  ${index + 1}. ${error.filePath}`;
          if (error.line !== undefined) {
            detail += `:${error.line}`;
            if (error.column !== undefined) {
              detail += `:${error.column}`;
            }
          }
          detail += `\n     ${error.message}`;
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

      if (this.logger) {
        this.logger.error('Bundle compilation failed', {
          entryPoint: options.entryPoint,
          errorCount: compilationResult.errors.length,
          warningCount: compilationResult.warnings.length,
          errors: compilationResult.errors,
        });
      }

      // Stop bundling immediately - no partial bundles on errors
      throw new Error(errorMessage);
    }

    // Log warnings even if compilation succeeded
    if (compilationResult.warnings.length > 0 && this.logger) {
      this.logger.warn('Bundle compilation succeeded with warnings', {
        warningCount: compilationResult.warnings.length,
        warnings: compilationResult.warnings,
      });
    }

    // Generate bundle based on format
    try {
      return await this.generateCommonJSBundle(compilationResult, options);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      if (this.logger) {
        this.logger.error('Bundle generation failed', {
          entryPoint: options.entryPoint,
          format: options.format,
          error: message,
        });
      }

      // Fail fast on bundle generation errors
      throw new Error(`Failed to generate bundle: ${message}`);
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

    // Update resource limiter
    if (this.resourceLimiter) {
      this.resourceLimiter.setModuleCount(0);
    }
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
   * Gracefully shutdown the module system
   * - Stops resource limiter
   * - Stops all file watchers
   * - Stops management server
   * - Clears all caches
   * - Times out after 30 seconds to prevent hanging
   */
  async shutdown(): Promise<void> {
    if (this.logger) {
      this.logger.info('Shutting down ModuleSystem');
    }

    // The shutdown sequence handles multiple systems with error isolation; complexity is necessary for robustness
    // eslint-disable-next-line complexity
    const shutdownPromise = (async () => {
      // Stop resource limiter first
      try {
        if (this.resourceLimiter) {
          this.resourceLimiter.stop();
          if (this.logger) {
            this.logger.info('Resource limiter stopped');
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (this.logger) {
          this.logger.error('Error stopping resource limiter during shutdown', {
            error: message,
          });
        }
      }

      // Stop watchers (most likely to hang)
      try {
        await this.stopWatching();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (this.logger) {
          this.logger.error('Error stopping watchers during shutdown', { error: message });
        }
      }

      // Shutdown circuit breakers (cancel active timers)
      try {
        if (this.circuitBreakers) {
          this.circuitBreakers.shutdown();
          if (this.logger) {
            this.logger.info('Circuit breakers shut down');
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (this.logger) {
          this.logger.error('Error shutting down circuit breakers', { error: message });
        }
      }

      // Stop management server
      try {
        await this.stopManagementServer();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (this.logger) {
          this.logger.error('Error stopping management server during shutdown', {
            error: message,
          });
        }
      }

      // Clear caches (synchronous, should not fail)
      try {
        this.clearCache();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (this.logger) {
          this.logger.error('Error clearing caches during shutdown', { error: message });
        }
      }
    })();

    // Enforce 30-second shutdown timeout with proper cleanup
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<void>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('Shutdown timeout after 30 seconds')), 30000);
    });

    try {
      await Promise.race([shutdownPromise, timeoutPromise]);

      if (this.logger) {
        this.logger.info('ModuleSystem shutdown complete');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (this.logger) {
        this.logger.error('Shutdown failed or timed out', { error: message });
      }
      throw error;
    } finally {
      // Always clear the timeout to prevent resource leaks
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
    }
  }

  watch(entryPoint: string, options: ModuleSystemWatchOptions = {}): FSWatcher {
    const resolvedEntry = path.resolve(entryPoint);
    const watchRoots = new Set<string>();
    const addWatchTarget = (target: string): void => {
      if (target && path.isAbsolute(target)) {
        watchRoots.add(target);
      }
    };

    addWatchTarget(resolvedEntry);
    addWatchTarget(path.dirname(resolvedEntry));

    for (const moduleMeta of this.registry.getAll()) {
      addWatchTarget(moduleMeta.resolvedPath);
      if (path.isAbsolute(moduleMeta.resolvedPath)) {
        addWatchTarget(path.dirname(moduleMeta.resolvedPath));
      }
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

    const supportedEvents: ModuleWatchEventType[] = [
      'add',
      'change',
      'unlink',
      'addDir',
      'unlinkDir',
    ];

    watcher.on('all', (event: string, changedPath: string) => {
      if (!options.onChange) {
        return;
      }

      if (!supportedEvents.includes(event as ModuleWatchEventType)) {
        return;
      }

      options.onChange({
        type: event as ModuleWatchEventType,
        filePath: path.resolve(changedPath),
      });
    });

    watcher.on('error', (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      if (this.logger) {
        this.logger.error('ModuleSystem watch error', { error: message });
      } else {
        console.error('ModuleSystem watch error:', message);
      }

      // Close watcher on error - the wrapped close() will handle removal from tracking
      // Use void to indicate intentional fire-and-forget for error cleanup
      void watcher.close().catch(closeError => {
        const closeMessage = closeError instanceof Error ? closeError.message : String(closeError);
        if (this.logger) {
          this.logger.warn('Failed to close errored watcher', { error: closeMessage });
        }
      });
    });

    // Wrap the close method to ensure removal from tracking after close completes
    // The 'close' event is not reliable in chokidar, so we intercept the call
    // Following chokidar best practices: close() returns a Promise that resolves when fully closed

    // Check if close is a Jest mock to preserve spy functionality in tests
    const isMock =
      typeof (watcher.close as unknown as { mockImplementation?: unknown }).mockImplementation ===
      'function';

    if (isMock) {
      // For Jest mocks, get the original mock's current implementation before wrapping
      const mockFn = watcher.close as unknown as jest.Mock;
      const originalImpl = mockFn.getMockImplementation?.() || (() => Promise.resolve());

      // Preserve Jest spy by using mockImplementation with cleanup logic
      mockFn.mockImplementation(async () => {
        try {
          await originalImpl();
        } finally {
          this.activeWatchers.delete(watcher);
        }
      });
    } else {
      // Production: replace the method directly
      const originalClose = watcher.close.bind(watcher);
      watcher.close = async () => {
        try {
          await originalClose();
        } finally {
          this.activeWatchers.delete(watcher);
        }
      };
    }

    this.activeWatchers.add(watcher);
    return watcher;
  }

  async stopWatching(): Promise<void> {
    if (this.activeWatchers.size === 0) {
      return;
    }

    if (this.logger) {
      this.logger.info('Stopping all watchers', { count: this.activeWatchers.size });
    }

    const watchers = Array.from(this.activeWatchers);
    this.activeWatchers.clear();

    // Create promises with timeout to prevent hanging
    const closePromises = watchers.map(async watcher => {
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Watcher close timeout after 5s')), 5000);
      });

      const closePromise = watcher.close();

      try {
        await Promise.race([closePromise, timeoutPromise]);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (this.logger) {
          this.logger.warn('Failed to close module watcher', { error: message });
        } else {
          console.warn('Failed to close module watcher:', message);
        }
      } finally {
        // Always clear the timeout to prevent resource leaks
        if (timeoutId !== undefined) {
          clearTimeout(timeoutId);
        }
      }
    });

    await Promise.allSettled(closePromises);

    if (this.logger) {
      this.logger.info('All watchers stopped');
    }
  }

  private registerAllLoadedModules(): void {
    const loadedModules = this.loader.getAllModules();
    for (const loaded of loadedModules) {
      this.registry.register(loaded);
    }
  }

  private resolveCompilationOptions(overrides?: Partial<CompilerOptions>): CompilerOptions {
    if (!overrides || Object.keys(overrides).length === 0) {
      return { ...this.defaultCompilation };
    }

    return { ...this.defaultCompilation, ...overrides };
  }

  private toPipelineOptions(config: CompilerOptions): PipelineCompileOptions {
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

    return options;
  }

  // The bundler assembly needs multiple guards and sequencing steps; suppress complexity warnings for maintainability.
  // eslint-disable-next-line complexity
  private async generateCommonJSBundle(
    result: CompilationResult,
    options: BundleOptions
  ): Promise<BundleOutput> {
    const moduleIdMapping = new Map<string, string>();
    const externals = new Set(
      (options.externals ?? []).map(ext => ext.trim()).filter(ext => ext.length > 0)
    );
    const externalModuleIds = new Set<string>();

    if (!path.isAbsolute(result.entryPoint)) {
      throw new Error('Entry point must be an absolute path for bundling.');
    }
    const entryDir = path.dirname(result.entryPoint);
    const normalizeKey = (absolutePath: string): string => {
      const relativePath = path.relative(entryDir, absolutePath);
      const normalized = relativePath.split(path.sep).join('/');
      if (normalized.length === 0) {
        return path.basename(absolutePath);
      }
      return normalized;
    };

    for (const [moduleId] of result.modules) {
      if (!path.isAbsolute(moduleId)) {
        throw new Error(`Module ID should be absolute path, got: ${moduleId}`);
      }
      if (!moduleIdMapping.has(moduleId)) {
        moduleIdMapping.set(moduleId, normalizeKey(moduleId));
      }
    }

    for (const ext of externals) {
      this.markExternalModule(result.entryPoint, ext, externalModuleIds, result.entryPoint);
    }

    const processedModules = this.prepareModulesForBundle(
      result,
      moduleIdMapping,
      externals,
      externalModuleIds
    );

    const entryKey = moduleIdMapping.get(result.entryPoint);
    if (!entryKey) {
      throw new Error(`Entry module ${result.entryPoint} missing from bundle results.`);
    }

    const append = (builder: { code: string; line: number }, segment: string): void => {
      builder.code += segment;
      const matches = segment.match(/\n/g);
      if (matches) {
        builder.line += matches.length;
      }
    };

    const bundleBuilder = { code: '', line: 1 };
    append(bundleBuilder, "(function() {\n  'use strict';\n\n  var modules = {\n");

    const generator = options.sourceMaps
      ? new SourceMapGenerator({
          file: path.basename(options.outputPath ?? this.deriveBundleFilename(result.entryPoint)),
        })
      : null;

    const inlinedSources = new Set<string>();

    let firstModule = true;
    for (const module of processedModules) {
      if (externalModuleIds.has(module.id)) {
        continue;
      }
      if (!firstModule) {
        append(bundleBuilder, ',\n');
      } else {
        firstModule = false;
      }

      append(bundleBuilder, `  '${module.key}': function(module, exports, require) {\n`);
      const moduleStartLine = bundleBuilder.line;

      append(bundleBuilder, module.code);

      if (generator && module.map) {
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

      append(bundleBuilder, '\n  }');
    }

    append(bundleBuilder, '\n  };\n\n');
    append(
      bundleBuilder,
      '  var cache = {};\n' +
        "  var __externalRequire = typeof module !== 'undefined' && module.require\n" +
        '    ? module.require.bind(module)\n' +
        "    : typeof require === 'function'\n" +
        '      ? require\n' +
        '      : null;\n\n'
    );
    append(
      bundleBuilder,
      '  function _require(id) {\n' +
        '    if (cache[id]) return cache[id].exports;\n\n' +
        '    if (!modules[id]) {\n' +
        '      if (__externalRequire) {\n' +
        '        return __externalRequire(id);\n' +
        '      }\n' +
        '      throw new Error("Module \'" + id + "\' not found in bundle and no external require available.");\n' +
        '    }\n\n' +
        '    var module = cache[id] = { exports: {} };\n' +
        '    modules[id](module, module.exports, _require);\n\n' +
        '    return module.exports;\n' +
        '  }\n\n'
    );
    append(
      bundleBuilder,
      `  // Start with entry point and expose its exports\n  var entryModule = _require('${entryKey}');\n\n`
    );
    append(
      bundleBuilder,
      '  // Expose entry point exports as bundle exports (for Node.js)\n' +
        "  if (typeof module !== 'undefined' && module.exports) {\n" +
        '    module.exports = entryModule;\n' +
        '  }\n\n'
    );
    append(
      bundleBuilder,
      '  // Return entry point exports (for other environments)\n' + '  return entryModule;\n})();'
    );

    let rawMap: RawSourceMap | undefined;
    if (generator) {
      try {
        rawMap = JSON.parse(generator.toString()) as RawSourceMap;
        // Validate generated source map before using it
        this.validateSourceMap(rawMap, 'bundle generation');
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        if (this.logger) {
          this.logger.error('Failed to generate bundle source map', {
            entryPoint: result.entryPoint,
            error: message,
          });
        }

        // Fail fast on source map generation errors when source maps are explicitly requested
        throw new Error(`Source map generation failed: ${message}`);
      }
    }

    if (options.minify) {
      try {
        const minified = this.minify(bundleBuilder.code, rawMap, Boolean(options.sourceMaps));
        bundleBuilder.code = minified.code;
        rawMap = minified.map;

        // Validate minified source map if present
        if (rawMap && options.sourceMaps) {
          this.validateSourceMap(rawMap, 'minification');
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        if (this.logger) {
          this.logger.error('Minification failed', {
            entryPoint: result.entryPoint,
            error: message,
          });
        }

        throw new Error(`Minification failed: ${message}`);
      }
    }

    // Final validation and serialization of source map
    let serializedMap: string | undefined;
    if (rawMap) {
      try {
        serializedMap = JSON.stringify(rawMap);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        if (this.logger) {
          this.logger.error('Failed to serialize source map', {
            entryPoint: result.entryPoint,
            error: message,
          });
        }

        throw new Error(`Failed to serialize source map: ${message}`);
      }
    }

    return {
      code: bundleBuilder.code,
      map: serializedMap,
    };
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
  ): Array<{ id: string; key: string; code: string; map?: RawSourceMap }> {
    const modules: Array<{ id: string; key: string; code: string; map?: RawSourceMap }> = [];
    const context: RequireRewriteContext = {
      moduleIdMapping,
      externals,
      externalModuleIds,
      entryPoint: result.entryPoint,
    };

    for (const [moduleId, moduleData] of result.modules) {
      const processedCode = this.rewriteRequiresForModule(moduleId, moduleData.code, context);
      const key = moduleIdMapping.get(moduleId);
      if (!key) {
        continue;
      }
      modules.push({ id: moduleId, key, code: processedCode, map: moduleData.map });
    }

    return modules;
  }

  private rewriteRequiresForModule(
    ownerModuleId: string,
    code: string,
    context: RequireRewriteContext
  ): string {
    if (typeof code !== 'string') {
      throw new Error('Code input must be a string');
    }
    if (code.length > 10 * 1024 * 1024) {
      throw new Error('Code input too large for require rewriting');
    }

    const normalizedOwner = path.isAbsolute(ownerModuleId)
      ? ownerModuleId
      : path.resolve(ownerModuleId);

    const dynamicTemplatePattern = /require\s*\(\s*`[^`]*\$\{[^`]*`\s*\)/;
    if (dynamicTemplatePattern.test(code)) {
      throw new Error(
        `Dynamic template literal require expressions are not supported in ${normalizedOwner}.`
      );
    }

    const dynamicRequirePattern = /require\s*\(\s*(?!['"`])/;
    if (dynamicRequirePattern.test(code)) {
      throw new Error(`Dynamic require expressions are not supported in ${normalizedOwner}.`);
    }

    const singleQuotePattern = /require\s*\(\s*'([^'\n\r]{1,500})'\s*\)/g;
    const doubleQuotePattern = /require\s*\(\s*"([^"\n\r]{1,500})"\s*\)/g;
    const templatePattern = /require\s*\(\s*`([^`\n\r]{1,500})`\s*\)/g;

    const processMatch = (
      match: string,
      spec: string,
      quote: 'single' | 'double' | 'template'
    ): string => {
      if (!spec || spec.length === 0 || spec.length > 500) {
        return match;
      }

      if (spec.includes('..') && spec.split('..').length > 3) {
        return match;
      }

      if (this.matchesExternal(spec, context.externals, context.entryPoint)) {
        this.markExternalModule(ownerModuleId, spec, context.externalModuleIds, context.entryPoint);
        return match;
      }

      const tryResolveToKey = (s: string): { key: string; resolvedPath: string } | null => {
        try {
          const resolved = this.resolver.resolve(s, ownerModuleId);
          const mapped = context.moduleIdMapping.get(resolved.resolvedPath);
          if (!mapped) {
            return null;
          }
          if (context.externalModuleIds.has(resolved.resolvedPath)) {
            return null;
          }
          return { key: mapped, resolvedPath: resolved.resolvedPath };
        } catch {
          return null;
        }
      };

      let resolved = tryResolveToKey(spec);
      if (!resolved && /^(\.\.?\/).+\.js$/i.test(spec)) {
        const fallbackSpec = spec.replace(/\.js$/i, '.som');
        if (this.matchesExternal(fallbackSpec, context.externals, context.entryPoint)) {
          this.markExternalModule(
            ownerModuleId,
            fallbackSpec,
            context.externalModuleIds,
            context.entryPoint
          );
          return match;
        }
        resolved = tryResolveToKey(fallbackSpec);
      }
      if (!resolved) {
        return match;
      }

      const sanitizedKey = resolved.key.replace(/['"`\\]/g, '');
      if (quote === 'double') {
        return `require("${sanitizedKey}")`;
      }
      return `require('${sanitizedKey}')`;
    };

    let result = code.replace(singleQuotePattern, (match, spec) =>
      processMatch(match, spec, 'single')
    );
    result = result.replace(doubleQuotePattern, (match, spec) =>
      processMatch(match, spec, 'double')
    );
    result = result.replace(templatePattern, (match, spec) => {
      if (spec.includes('${')) {
        throw new Error(
          `Dynamic template literal require expressions are not supported in ${normalizedOwner}.`
        );
      }
      return processMatch(match, spec, 'template');
    });

    return result;
  }

  /**
   * Validate source map structure and required fields.
   * Fails fast with clear error messages for invalid maps.
   */
  private validateSourceMap(map: RawSourceMap, context: string): void {
    if (!map.version) {
      throw new Error(`Invalid source map in ${context}: missing 'version' field`);
    }
    if (map.version !== 3) {
      throw new Error(
        `Invalid source map in ${context}: unsupported version ${map.version} (only version 3 is supported)`
      );
    }
    if (!Array.isArray(map.sources)) {
      throw new Error(`Invalid source map in ${context}: 'sources' must be an array`);
    }
    if (typeof map.mappings !== 'string') {
      throw new Error(`Invalid source map in ${context}: 'mappings' must be a string`);
    }
  }

  private parseModuleSourceMap(
    module: LoadedModule,
    rawMap: string | undefined,
    warnings: string[]
  ): RawSourceMap | undefined {
    if (!rawMap) {
      return undefined;
    }

    try {
      const parsed = JSON.parse(rawMap) as RawSourceMap;

      // Validate source map structure before using it
      this.validateSourceMap(parsed, module.resolvedPath);

      parsed.file = module.resolvedPath;
      parsed.sources =
        parsed.sources && parsed.sources.length > 0
          ? parsed.sources.map(() => module.resolvedPath)
          : [module.resolvedPath];
      if (!parsed.sourcesContent || parsed.sourcesContent.length === 0) {
        parsed.sourcesContent = [module.source];
      }
      return parsed;
    } catch (mapError) {
      const message = mapError instanceof Error ? mapError.message : String(mapError);

      if (this.logger) {
        this.logger.error('Source map parsing failed', {
          module: module.resolvedPath,
          error: message,
        });
      }

      // Add to warnings for now - compilation can continue without source maps
      // In strict production mode, this could be upgraded to fail-fast
      warnings.push(`Warning in ${module.resolvedPath}: Failed to parse source map: ${message}`);
      return undefined;
    }
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
    // Lazy-load preset to avoid runtime hard dependency
    let presetModule: unknown = null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      presetModule = require('babel-preset-minify');
    } catch {
      throw new Error(
        "Minification requires the optional dependency 'babel-preset-minify'. Install it to enable minified bundles."
      );
    }
    const presetItems: PluginItem[] = [];
    if (presetModule && (typeof presetModule === 'function' || typeof presetModule === 'object')) {
      presetItems.push(presetModule as PluginItem);
    }
    const out = transformSync(code, {
      sourceMaps,
      inputSourceMap: map ? { ...map, file: map.file ?? '' } : undefined,
      presets: presetItems,
      comments: false,
      compact: true,
    });

    const nextCode = out?.code && out.code.length > 0 ? out.code : code;
    const nextMap = sourceMaps && out?.map ? (out.map as RawSourceMap) : map;

    return { code: nextCode, map: nextMap };
  }

  /**
   * Start management server for production monitoring
   */
  async startManagementServer(port?: number): Promise<number | null> {
    if (!this.managementServer) {
      return null;
    }
    return await this.managementServer.start(port || 8080);
  }

  /**
   * Stop management server
   */
  async stopManagementServer(): Promise<void> {
    if (this.managementServer) {
      await this.managementServer.stop();
    }
  }

  /**
   * Get production metrics
   */
  getMetrics(): ModuleSystemStats | null {
    if (!this.metrics) return null;

    const stats = this.registry.getStatistics();
    const resourceUsage = this.resourceLimiter?.getUsage();

    return this.metrics.getStats(
      stats.totalModules,
      resourceUsage?.memoryUsed ?? 0,
      resourceUsage?.memoryLimit ?? 100 * 1024 * 1024
    );
  }

  /**
   * Get system health status
   */
  async getHealth(): Promise<SystemHealth> {
    if (!this.metrics) {
      const timestamp = Date.now();
      return {
        status: 'healthy',
        uptime: process.uptime(),
        version: packageVersion,
        timestamp,
        checks: [
          {
            name: 'metrics',
            status: 'warn',
            message: 'Metrics collection disabled; reporting runtime defaults only.',
            duration: 0,
            timestamp,
          },
        ],
      };
    }

    const stats = this.registry.getStatistics();
    return await this.metrics.performHealthChecks(
      stats.totalModules,
      100 * 1024 * 1024 // Default 100MB limit
    );
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
      for (const dep of module.dependencies) {
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

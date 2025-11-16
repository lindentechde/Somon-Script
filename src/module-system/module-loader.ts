import * as fs from 'node:fs';
import * as path from 'node:path';
import { ModuleResolver, ResolvedModule } from './module-resolver';
import { Lexer } from '../lexer';
import { Parser } from '../parser';
import { Program, ImportDeclaration } from '../types';
import { ModuleSystemMetrics } from './metrics';
import { CircuitBreakerManager } from './circuit-breaker';
import { moduleLoaderLogger as logger } from './logger';

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

export interface LoadedModule {
  id: string;
  resolvedPath: string;
  source: string;
  ast: Program;
  dependencies: string[];
  exports: ModuleExports;
  isLoaded: boolean;
  isLoading: boolean;
  lastAccessed: number; // Timestamp for LRU eviction
  error?: Error;
}

// Export map for a module. "default" holds default export runtime value; named holds each named export.
export interface ModuleExports {
  default?: unknown;
  named: Record<string, unknown>;
}

export interface ModuleLoadOptions {
  encoding?: BufferEncoding;
  cache?: boolean;
  circularDependencyStrategy?: 'error' | 'warn' | 'ignore';
  externals?: string[];
  maxCacheSize?: number; // Maximum number of cached modules
  maxCacheMemory?: number; // Maximum memory usage in bytes
}

export class ModuleLoader {
  private readonly resolver: ModuleResolver;
  private readonly moduleCache = new Map<string, LoadedModule>();
  private readonly loadingStack = new Set<string>();
  private readonly options: Required<ModuleLoadOptions>;
  private externalSpecifiers: Set<string> = new Set();
  private currentMemoryUsage: number = 0;
  private warnings: string[] = [];

  // Production systems
  private readonly metrics?: ModuleSystemMetrics;
  private readonly circuitBreakers?: CircuitBreakerManager;

  constructor(
    resolver: ModuleResolver,
    options: ModuleLoadOptions = {},
    metrics?: ModuleSystemMetrics,
    circuitBreakers?: CircuitBreakerManager
  ) {
    this.resolver = resolver;
    this.options = {
      encoding: options.encoding || ('utf-8' as BufferEncoding),
      cache: options.cache ?? true,
      circularDependencyStrategy: options.circularDependencyStrategy || 'warn',
      externals: options.externals ?? [],
      maxCacheSize: options.maxCacheSize ?? 1000, // Default 1000 modules
      maxCacheMemory: options.maxCacheMemory ?? 512 * 1024 * 1024, // Default 512MB
    };

    // Initialize production systems only when explicitly provided
    this.metrics = metrics;
    this.circuitBreakers = circuitBreakers;

    this.setExternals(options.externals);
  }

  /**
   * Load a module and all its dependencies
   */
  async load(specifier: string, fromFile: string): Promise<LoadedModule> {
    const executeLoad = async (): Promise<LoadedModule> => {
      this.metrics?.requestCount.increment();

      logger.debug('Loading module', { specifier, fromFile });

      const externalMatch = this.matchExternal(specifier);
      if (externalMatch) {
        return this.loadExternalModuleWithCircuitBreaker(specifier, externalMatch);
      }

      const resolved = this.resolver.resolve(specifier, fromFile);
      const moduleId = this.getModuleId(resolved.resolvedPath);

      // Atomic cache check - single operation to avoid race conditions
      const cached = this.options.cache ? this.moduleCache.get(moduleId) : undefined;
      if (cached?.isLoaded) {
        cached.lastAccessed = Date.now();
        logger.debug('Module loaded from cache', { moduleId });
        return cached;
      }
      if (cached?.isLoading) {
        logger.warn('Circular dependency detected during load', { moduleId });
        return this.handleCircularDependency(moduleId, cached);
      }

      // Check for circular dependency in loading stack
      if (this.loadingStack.has(moduleId)) {
        logger.warn('Circular dependency in loading stack', { moduleId });
        return this.handleCircularDependency(moduleId);
      }

      try {
        const result = await this.loadModule(resolved, moduleId);
        logger.info('Module loaded successfully', {
          moduleId,
          dependencies: result.dependencies.length,
          sourceSize: result.source.length,
        });
        return result;
      } catch (error) {
        this.metrics?.loadErrors.increment();
        logger.error('Module load failed', error as Error, { moduleId, specifier });
        throw error;
      }
    };

    if (this.metrics) {
      return this.metrics.recordAsync(this.metrics.loadLatency, executeLoad);
    }

    return executeLoad();
  }

  /**
   * Load module synchronously
   */
  loadSync(specifier: string, fromFile: string): LoadedModule {
    const externalMatch = this.matchExternal(specifier);
    if (externalMatch) {
      return this.getOrCreateExternalModule(specifier, externalMatch);
    }

    const resolved = this.resolver.resolve(specifier, fromFile);
    const moduleId = this.getModuleId(resolved.resolvedPath);

    // Atomic cache check - single operation to avoid race conditions
    const cached = this.options.cache ? this.moduleCache.get(moduleId) : undefined;
    if (cached?.isLoaded) {
      cached.lastAccessed = Date.now();
      return cached;
    }
    if (cached?.isLoading) {
      return this.handleCircularDependency(moduleId, cached);
    }

    // Check for circular dependency in loading stack
    if (this.loadingStack.has(moduleId)) {
      return this.handleCircularDependency(moduleId);
    }

    return this.loadModuleSync(resolved, moduleId);
  }

  private async loadExternalModuleWithCircuitBreaker(
    specifier: string,
    externalMatch: string
  ): Promise<LoadedModule> {
    if (!this.circuitBreakers) {
      return this.getOrCreateExternalModule(specifier, externalMatch);
    }

    return this.circuitBreakers.executeWithRetry(
      `external:${externalMatch}`,
      async () => {
        return this.getOrCreateExternalModule(specifier, externalMatch);
      },
      { maxRetries: 3, initialDelay: 1000 },
      async () => {
        // Fallback: create a stub external module
        logger.warn('Using fallback for external module', { specifier, externalMatch });
        return this.createStubExternalModule(specifier, externalMatch);
      }
    );
  }

  private createStubExternalModule(specifier: string, canonical: string): LoadedModule {
    const moduleId = this.getExternalModuleId(canonical);

    return {
      id: moduleId,
      resolvedPath: canonical,
      source: '// External module stub',
      ast: { type: 'Program', body: [], line: 1, column: 1 },
      dependencies: [],
      exports: { named: {} },
      isLoaded: true,
      isLoading: false,
      lastAccessed: Date.now(),
      error: new Error(`External module ${specifier} failed to load - using stub`),
    };
  }

  private async loadModule(resolved: ResolvedModule, moduleId: string): Promise<LoadedModule> {
    const isExternal =
      resolved.resolvedPath.startsWith('http') || resolved.resolvedPath.includes('node_modules');

    if (isExternal && this.circuitBreakers) {
      return this.loadExternalModuleWithCircuitBreaker(moduleId, resolved.resolvedPath);
    }

    const startTime = process.hrtime.bigint();

    try {
      const result = this.loadModuleSync(resolved, moduleId);

      if (this.metrics) {
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
        this.metrics.loadLatency.record(duration);
      }

      return result;
    } catch (error) {
      if (this.metrics) {
        this.metrics.loadErrors.increment();
      }

      // Ensure we're throwing an Error object for Promise rejection
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error(String(error));
      }
    }
  }

  private loadModuleSync(resolved: ResolvedModule, moduleId: string): LoadedModule {
    // Synchronous version of loadModule for backward compatibility
    const module: LoadedModule = {
      id: moduleId,
      resolvedPath: resolved.resolvedPath,
      source: '',
      ast: {
        type: 'Program',
        body: [],
        line: 1,
        column: 1,
      } as Program,
      dependencies: [],
      exports: { named: {} },
      isLoaded: false,
      isLoading: true,
      lastAccessed: Date.now(),
    };

    // Add to loading stack first to detect circular dependencies early
    this.loadingStack.add(moduleId);
    let moduleAddedToCache = false;

    try {
      // Add to cache only after loading stack is set
      if (this.options.cache) {
        this.moduleCache.set(moduleId, module);
        moduleAddedToCache = true;
      }

      // Read source file
      module.source = fs.readFileSync(resolved.resolvedPath, {
        encoding: this.options.encoding,
      });

      // Parse only if it's a SomonScript file
      if (resolved.extension === '.som') {
        const lexer = new Lexer(module.source);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        module.ast = parser.parse();

        // If parsing produced errors, surface them as a load error
        const parseErrors = parser.getErrors();
        if (parseErrors.length > 0) {
          throw new Error(`Parse error(s) in ${resolved.resolvedPath}: ${parseErrors[0]}`);
        }

        // Extract dependency specifiers (raw, e.g. "./utils")
        module.dependencies = this.extractDependencies(module.ast);

        // Load dependencies recursively (keep original specifiers in metadata)
        for (const dep of module.dependencies) {
          this.loadSync(dep, resolved.resolvedPath);
        }
      }

      // Mark as loaded successfully
      module.isLoaded = true;
      module.isLoading = false;

      // Update memory usage tracking and enforce cache limits
      if (this.options.cache && moduleAddedToCache) {
        this.currentMemoryUsage += this.estimateModuleSize(module);
        this.enforceCacheLimits();
      }

      return module;
    } catch (error) {
      // Handle loading/parsing errors with proper cleanup
      module.error = error as Error;
      module.isLoading = false;

      // Keep module in cache with error state for validation purposes
      // Don't delete from cache - let the registry validate broken dependencies

      throw error;
    } finally {
      // Always clean up loading stack
      this.loadingStack.delete(moduleId);
    }
  }

  private handleCircularDependency(moduleId: string, module?: LoadedModule): LoadedModule {
    const message = `Circular dependency detected: ${moduleId}`;
    const chain = Array.from(this.loadingStack);

    switch (this.options.circularDependencyStrategy) {
      case 'error':
        throw new Error(message);
      case 'warn': {
        const warningMessage = `${message} (chain: ${chain.join(' -> ')} -> ${moduleId})`;
        this.warnings.push(warningMessage);
        logger.warn('Circular dependency detected', {
          moduleId,
          chain,
          message,
        });
        break;
      }
      case 'ignore':
        break;
    }

    // Return partial module for circular dependencies
    return (
      module || {
        id: moduleId,
        resolvedPath: moduleId,
        source: '',
        ast: { type: 'Program', body: [], line: 1, column: 1 },
        dependencies: [],
        exports: { named: {} },
        isLoaded: false,
        isLoading: true,
        lastAccessed: Date.now(),
      }
    );
  }

  /**
   * Extract raw dependency specifiers from AST (e.g., "./utils", "../math")
   * These need to be resolved to absolute paths before being stored in the dependency graph
   */
  private extractDependencies(ast: Program): string[] {
    const rawSpecifiers: string[] = [];

    // Validate AST input
    if (!ast?.body || !Array.isArray(ast.body)) {
      return rawSpecifiers;
    }

    for (const statement of ast.body) {
      if (statement?.type === 'ImportDeclaration') {
        const importDecl = statement as ImportDeclaration;

        // Validate import declaration structure
        if (!importDecl.source?.value) {
          continue;
        }

        const specifier = importDecl.source.value;

        // Validate specifier is string and reasonable length
        if (typeof specifier !== 'string' || specifier.length === 0 || specifier.length > 500) {
          continue;
        }

        // Basic security validation - prevent obvious path traversal attacks
        const normalizedSpec = specifier.trim();
        if (normalizedSpec.includes('\\') || normalizedSpec.split('..').length > 5) {
          logger.warn('Suspicious import specifier detected and skipped', {
            specifier,
            normalizedSpec,
            hasBackslash: normalizedSpec.includes('\\'),
            dotDotCount: normalizedSpec.split('..').length - 1,
          });
          continue;
        }

        rawSpecifiers.push(normalizedSpec);
      }
    }

    return rawSpecifiers;
  }

  private getModuleId(resolvedPath: string): string {
    return path.resolve(resolvedPath);
  }

  /**
   * Get a loaded module from cache
   */
  getModule(moduleId: string): LoadedModule | undefined {
    return this.moduleCache.get(moduleId);
  }

  /**
   * Check if a module is loaded
   */
  isLoaded(moduleId: string): boolean {
    const module = this.moduleCache.get(moduleId);
    return module?.isLoaded ?? false;
  }

  /**
   * Clear module cache
   */
  clearCache(): void {
    this.moduleCache.clear();
    this.loadingStack.clear();
    this.currentMemoryUsage = 0;
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; memoryUsage: number; maxSize: number; maxMemory: number } {
    return {
      size: this.moduleCache.size,
      memoryUsage: this.currentMemoryUsage,
      maxSize: this.options.maxCacheSize,
      maxMemory: this.options.maxCacheMemory,
    };
  }

  /**
   * Enforce cache limits by evicting least recently used modules
   */
  private enforceCacheLimits(): void {
    if (!this.options.cache) return;

    // Check size limit
    if (this.moduleCache.size > this.options.maxCacheSize) {
      const excess = this.moduleCache.size - this.options.maxCacheSize;
      const keysToEvict = Array.from(this.moduleCache.keys()).slice(0, excess);

      for (const key of keysToEvict) {
        this.evictModule(key);
      }
    }

    // Check memory limit
    if (this.currentMemoryUsage > this.options.maxCacheMemory) {
      // Evict modules until under memory limit (simple LRU approximation)
      const sortedEntries = Array.from(this.moduleCache.entries()).sort(
        (a, b) => a[1].lastAccessed - b[1].lastAccessed
      );

      for (const [key] of sortedEntries) {
        this.evictModule(key);
        if (this.currentMemoryUsage <= this.options.maxCacheMemory * 0.8) {
          break; // Leave some headroom
        }
      }
    }
  }

  /**
   * Evict a specific module from cache
   */
  private evictModule(moduleId: string): void {
    const module = this.moduleCache.get(moduleId);
    if (module) {
      this.currentMemoryUsage -= this.estimateModuleSize(module);
      this.moduleCache.delete(moduleId);
    }
  }

  /**
   * Estimate memory usage of a module
   */
  private estimateModuleSize(module: LoadedModule): number {
    return (
      module.source.length * 2 + // UTF-16 characters
      JSON.stringify(module.ast).length * 2 +
      module.dependencies.length * 50 + // Estimated string overhead
      200 // Object overhead
    );
  }

  /**
   * Get all loaded modules
   */
  getAllModules(): LoadedModule[] {
    return Array.from(this.moduleCache.values());
  }

  /**
   * Get module dependency graph
   */
  getDependencyGraph(): Map<string, string[]> {
    const graph = new Map<string, string[]>();

    for (const [moduleId, module] of this.moduleCache) {
      graph.set(moduleId, module.dependencies);
    }

    return graph;
  }

  /**
   * Note: topological ordering is provided by ModuleRegistry.
   */

  setExternals(externals?: string[]): void {
    this.externalSpecifiers = new Set(
      (externals ?? []).map(ext => ext.trim()).filter(ext => ext.length > 0)
    );
  }

  getExternals(): string[] {
    return Array.from(this.externalSpecifiers);
  }

  private matchExternal(specifier: string): string | null {
    if (this.externalSpecifiers.size === 0) return null;

    const trimmed = specifier.trim();
    const candidates = this.buildExternalCandidates(trimmed);
    for (const candidate of candidates) {
      if (this.externalSpecifiers.has(candidate)) {
        return candidate;
      }
    }
    return null;
  }

  private buildExternalCandidates(specifier: string): string[] {
    const variants = new Set<string>();
    variants.add(specifier);

    if (/\.js$/i.test(specifier)) {
      const withoutExt = specifier.replace(/\.js$/i, '');
      variants.add(withoutExt);
      variants.add(`${withoutExt}.som`);
    } else {
      variants.add(`${specifier}.js`);
    }

    if (/\.som$/i.test(specifier)) {
      const withoutExt = specifier.replace(/\.som$/i, '');
      variants.add(withoutExt);
      variants.add(`${withoutExt}.js`);
    } else {
      variants.add(`${specifier}.som`);
    }

    return Array.from(variants.values());
  }

  private getOrCreateExternalModule(specifier: string, canonical: string): LoadedModule {
    const moduleId = this.getExternalModuleId(canonical);
    if (this.options.cache && this.moduleCache.has(moduleId)) {
      const cached = this.moduleCache.get(moduleId)!;
      cached.lastAccessed = Date.now();
      return cached;
    }

    const module: LoadedModule = {
      id: moduleId,
      resolvedPath: canonical,
      source: '',
      ast: { type: 'Program', body: [], line: 1, column: 1 },
      dependencies: [],
      exports: { named: {} },
      isLoaded: true,
      isLoading: false,
      lastAccessed: Date.now(),
    };

    if (this.options.cache) {
      this.moduleCache.set(moduleId, module);
      this.currentMemoryUsage += this.estimateModuleSize(module);
      this.enforceCacheLimits();
    }

    return module;
  }

  private getExternalModuleId(specifier: string): string {
    return `external:${specifier}`;
  }

  /**
   * Get collected warnings
   */
  getWarnings(): string[] {
    return [...this.warnings];
  }

  /**
   * Clear collected warnings
   */
  clearWarnings(): void {
    this.warnings = [];
  }
}

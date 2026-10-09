import * as fs from 'node:fs';
import { isBuiltin } from 'node:module';
import * as path from 'node:path';
import { ModuleResolver, ResolvedModule } from './module-resolver';
import { findRequireCalls } from './require-calls';
import { Lexer } from '../lexer';
import { Parser } from '../parser';
import {
  Program,
  Statement,
  ImportDeclaration,
  ImportEqualsDeclaration,
  ImportSpecifier,
  ExportDeclaration,
} from '../types';
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
  /** Raw import specifiers as written in the source (e.g. "./utils") */
  dependencies: string[];
  /** Module ids the loader resolved each entry of `dependencies` to (same order) */
  resolvedDependencies?: string[];
  /** True for modules resolved from a module directory such as node_modules */
  isExternalLibrary?: boolean;
  exports: ModuleExports;
  isLoaded: boolean;
  isLoading: boolean;
  lastAccessed: number; // Timestamp for LRU eviction
  /** File stats at load time, used to detect stale cache entries */
  mtimeMs?: number;
  size?: number;
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

/**
 * Error raised while loading a module graph. `filePath` is the file the problem is in
 * (the module that failed to parse, or the importer whose specifier could not be loaded);
 * `importer` and `specifier` describe the import that led to it.
 */
export class ModuleLoadError extends Error {
  readonly filePath: string;
  importer?: string;
  specifier?: string;
  readonly line?: number;
  readonly column?: number;

  constructor(
    message: string,
    details: {
      filePath: string;
      importer?: string;
      specifier?: string;
      line?: number;
      column?: number;
      cause?: unknown;
    }
  ) {
    super(message);
    this.name = 'ModuleLoadError';
    this.filePath = details.filePath;
    this.importer = details.importer;
    this.specifier = details.specifier;
    this.line = details.line;
    this.column = details.column;
    if (details.cause !== undefined) {
      (this as { cause?: unknown }).cause = details.cause;
    }
  }
}

interface DependencyReference {
  specifier: string;
  line?: number;
  column?: number;
  /** A require() in local JavaScript: left to the runtime require when it does not resolve. */
  optional?: boolean;
}

const RELATIVE_SPECIFIER = /^\.{1,2}\//;

const MAX_SPECIFIER_LENGTH = 500;

export class ModuleLoader {
  private readonly resolver: ModuleResolver;
  private readonly moduleCache = new Map<string, LoadedModule>();
  private readonly loadingStack = new Set<string>();
  private readonly options: Required<ModuleLoadOptions>;
  private externalSpecifiers: Set<string> = new Set();
  private currentMemoryUsage: number = 0;
  private warnings: string[] = [];

  constructor(resolver: ModuleResolver, options: ModuleLoadOptions = {}) {
    this.resolver = resolver;
    this.options = {
      encoding: options.encoding || ('utf-8' as BufferEncoding),
      cache: options.cache ?? true,
      circularDependencyStrategy: options.circularDependencyStrategy || 'warn',
      externals: options.externals ?? [],
      maxCacheSize: options.maxCacheSize ?? 1000,
      maxCacheMemory: options.maxCacheMemory ?? 512 * 1024 * 1024,
    };

    this.setExternals(options.externals);
  }

  /**
   * Load a module and all its dependencies
   */
  async load(specifier: string, fromFile: string): Promise<LoadedModule> {
    logger.debug('Loading module', { specifier, fromFile });
    return this.loadSync(specifier, fromFile);
  }

  /**
   * Load module synchronously
   */
  loadSync(specifier: string, fromFile: string): LoadedModule {
    const isTopLevel = this.loadingStack.size === 0;
    const module = this.loadSyncInternal(specifier, fromFile);
    if (isTopLevel) {
      // Enforce limits only between builds, never evicting what this build needs
      this.enforceCacheLimits(this.collectDependencyClosure(module.id));
    }
    return module;
  }

  private loadSyncInternal(specifier: string, fromFile: string): LoadedModule {
    const externalMatch = this.matchExternal(specifier);
    if (externalMatch) {
      return this.getOrCreateExternalModule(specifier, externalMatch);
    }

    const resolved = this.resolver.resolve(specifier, fromFile);
    const moduleId = this.getModuleId(resolved.resolvedPath);

    const cached = this.options.cache ? this.moduleCache.get(moduleId) : undefined;
    if (cached?.isLoaded) {
      if (this.isFresh(cached)) {
        cached.lastAccessed = Date.now();
        return cached;
      }
      this.evictModule(moduleId);
    } else if (cached?.isLoading) {
      return this.handleCircularDependency(moduleId, cached);
    }

    // Check for circular dependency in loading stack
    if (this.loadingStack.has(moduleId)) {
      return this.handleCircularDependency(moduleId);
    }

    return this.loadModuleSync(resolved, moduleId);
  }

  private loadModuleSync(resolved: ResolvedModule, moduleId: string): LoadedModule {
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
      resolvedDependencies: [],
      isExternalLibrary: resolved.isExternalLibrary,
      exports: { named: {} },
      isLoaded: false,
      isLoading: true,
      lastAccessed: Date.now(),
    };

    // Add to loading stack first to detect circular dependencies early
    this.loadingStack.add(moduleId);

    try {
      if (this.options.cache) {
        this.moduleCache.set(moduleId, module);
      }

      const stat = fs.statSync(resolved.resolvedPath);
      module.mtimeMs = stat.mtimeMs;
      module.size = stat.size;
      module.source = fs.readFileSync(resolved.resolvedPath, {
        encoding: this.options.encoding,
      });

      const references = this.readDependencies(module, resolved).filter(
        ref => !ref.optional || this.canResolve(ref.specifier, resolved.resolvedPath)
      );
      module.dependencies = references.map(ref => ref.specifier);

      // Load dependencies recursively, recording the id each specifier resolved to
      for (const ref of references) {
        let dependency: LoadedModule;
        try {
          dependency = this.loadSyncInternal(ref.specifier, resolved.resolvedPath);
        } catch (error) {
          throw this.attributeDependencyError(error, ref, resolved.resolvedPath);
        }
        module.resolvedDependencies!.push(dependency.id);
      }

      module.isLoaded = true;
      module.isLoading = false;

      if (this.options.cache) {
        this.currentMemoryUsage += this.estimateModuleSize(module);
      }

      return module;
    } catch (error) {
      // Keep module in cache with error state so callers can inspect broken dependencies
      module.isLoading = false;
      const loadError =
        error instanceof ModuleLoadError
          ? error
          : new ModuleLoadError(error instanceof Error ? error.message : String(error), {
              filePath: resolved.resolvedPath,
              cause: error,
            });
      module.error = loadError;
      throw loadError;
    } finally {
      this.loadingStack.delete(moduleId);
    }
  }

  /**
   * Parse the module (when it is SomonScript) and return the imports it depends on.
   * Local JavaScript files contribute their static relative `require()` calls so they
   * can be bundled; JSON files are validated here so errors point at the JSON file.
   */
  private readDependencies(module: LoadedModule, resolved: ResolvedModule): DependencyReference[] {
    const filePath = resolved.resolvedPath;

    if (resolved.extension === '.som') {
      let parser: Parser;
      try {
        parser = new Parser(new Lexer(module.source).tokenize());
        module.ast = parser.parse();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new ModuleLoadError(`Parse error(s) in ${filePath}: ${message}`, {
          filePath,
          ...this.extractLocation(message),
          cause: error,
        });
      }

      const parseErrors = parser.getErrors();
      if (parseErrors.length > 0) {
        throw new ModuleLoadError(`Parse error(s) in ${filePath}: ${parseErrors[0]}`, {
          filePath,
          ...this.extractLocation(parseErrors[0]),
        });
      }

      return this.extractDependencies(module.ast, filePath);
    }

    if (resolved.extension === '.json') {
      try {
        JSON.parse(module.source);
      } catch (error) {
        throw new ModuleLoadError(
          `Invalid JSON in ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
          { filePath, cause: error }
        );
      }
      return [];
    }

    if (resolved.extension === '.js' && !resolved.isExternalLibrary) {
      return this.extractJsDependencies(module.source);
    }

    return [];
  }

  private extractLocation(message: string): { line?: number; column?: number } {
    const match = /line (\d+)(?:,\s*column (\d+))?/i.exec(message);
    if (!match) return {};
    return {
      line: Number.parseInt(match[1], 10),
      column: match[2] ? Number.parseInt(match[2], 10) : undefined,
    };
  }

  /**
   * Attribute a failure while loading `ref` from `importer`. Errors that already describe
   * a broken file keep that file and gain the importing context; anything else (resolution
   * failures, circular-dependency errors) is reported against the import in the importer.
   */
  private attributeDependencyError(
    error: unknown,
    ref: DependencyReference,
    importer: string
  ): ModuleLoadError {
    if (error instanceof ModuleLoadError) {
      if (error.importer === undefined) {
        error.importer = importer;
        error.specifier = ref.specifier;
        if (error.filePath !== importer) {
          error.message += ` (imported as '${ref.specifier}' from ${importer})`;
        }
      }
      return error;
    }

    const reason = error instanceof Error ? error.message : String(error);
    return new ModuleLoadError(`Cannot import '${ref.specifier}' in ${importer}: ${reason}`, {
      filePath: importer,
      importer,
      specifier: ref.specifier,
      line: ref.line,
      column: ref.column,
      cause: error,
    });
  }

  private isFresh(module: LoadedModule, seen = new Set<string>()): boolean {
    if (seen.has(module.id) || module.id.startsWith('external:')) return true;
    seen.add(module.id);

    try {
      const stat = fs.statSync(module.resolvedPath);
      if (stat.mtimeMs !== module.mtimeMs || stat.size !== module.size) {
        return false;
      }
    } catch {
      return false;
    }

    for (const depId of module.resolvedDependencies ?? []) {
      const dependency = this.moduleCache.get(depId);
      if (dependency?.isLoading) continue; // part of the cycle being loaded right now
      if (!dependency?.isLoaded || !this.isFresh(dependency, seen)) {
        return false;
      }
    }
    return true;
  }

  private handleCircularDependency(moduleId: string, module?: LoadedModule): LoadedModule {
    const message = `Circular dependency detected: ${moduleId}`;
    const chain = Array.from(this.loadingStack);

    switch (this.options.circularDependencyStrategy) {
      case 'error':
        throw new Error(`${message} (chain: ${chain.join(' -> ')} -> ${moduleId})`);
      case 'warn':
        this.warnings.push(`${message} (chain: ${chain.join(' -> ')} -> ${moduleId})`);
        break;
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
        resolvedDependencies: [],
        exports: { named: {} },
        isLoaded: false,
        isLoading: true,
        lastAccessed: Date.now(),
      }
    );
  }

  /**
   * Extract raw dependency specifiers (e.g. "./utils", "../math") from imports and
   * re-exports, with the location of the declaration for error reporting.
   */
  private extractDependencies(ast: Program, filePath: string): DependencyReference[] {
    const references: DependencyReference[] = [];

    if (!ast?.body || !Array.isArray(ast.body)) {
      return references;
    }

    for (const statement of ast.body) {
      if (
        statement?.type !== 'ImportDeclaration' &&
        statement?.type !== 'ExportDeclaration' &&
        statement?.type !== 'ImportEqualsDeclaration'
      ) {
        continue;
      }
      const source = (statement as ImportDeclaration | ExportDeclaration | ImportEqualsDeclaration)
        .source;
      // `ворид навъ { Т } аз …` and `содир навъ { Т } аз …` load nothing at run time
      if (!source || ModuleLoader.isTypeOnly(statement)) {
        continue;
      }

      const specifier = source.value;
      const location = { line: statement.line, column: statement.column };
      const reject = (reason: string): never => {
        throw new ModuleLoadError(`Invalid import specifier in ${filePath}: ${reason}`, {
          filePath,
          specifier: typeof specifier === 'string' ? specifier : undefined,
          ...location,
        });
      };

      if (typeof specifier !== 'string' || specifier.trim().length === 0) {
        reject('the module specifier must be a non-empty string');
      }
      const normalizedSpec = (specifier as string).trim();
      if (normalizedSpec.length > MAX_SPECIFIER_LENGTH) {
        reject(
          `'${normalizedSpec.slice(0, 40)}…' is longer than ${MAX_SPECIFIER_LENGTH} characters`
        );
      }
      if (normalizedSpec.includes('\\')) {
        reject(`'${normalizedSpec}' contains a backslash; use '/' as the path separator`);
      }

      references.push({ specifier: normalizedSpec, ...location });
    }

    return references;
  }

  /** An import or re-export of types only, which the compiled code does not `require`. */
  private static isTypeOnly(statement: Statement): boolean {
    const declaration = statement as { importKind?: 'type'; exportKind?: 'type' };
    if (declaration.importKind === 'type' || declaration.exportKind === 'type') return true;
    if (statement.type !== 'ImportDeclaration') return false;
    const specifiers = (statement as ImportDeclaration).specifiers;
    return specifiers.length > 0 && specifiers.every(spec => (spec as ImportSpecifier).importKind);
  }

  private canResolve(specifier: string, fromFile: string): boolean {
    if (this.matchExternal(specifier)) return true;
    try {
      this.resolver.resolve(specifier, fromFile);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Static relative `require('./x')` calls in a local JavaScript file. Bare specifiers are
   * left to the host `require` at runtime, and so are relative ones that do not resolve
   * (optional dependencies). Comments and strings are skipped by parsing the file; files
   * Babel cannot parse fall back to a plain text scan.
   */
  private extractJsDependencies(source: string): DependencyReference[] {
    const calls = findRequireCalls(source);
    if (!calls) {
      return this.scanJsRequires(source);
    }
    return calls
      .filter(call => call.specifier !== undefined && RELATIVE_SPECIFIER.test(call.specifier))
      .map(call => ({
        specifier: call.specifier!,
        line: call.line,
        column: call.column,
        optional: true,
      }));
  }

  private scanJsRequires(source: string): DependencyReference[] {
    const references: DependencyReference[] = [];
    const pattern = /(?<![\w$.])require\s*\(\s*(['"])(\.{1,2}\/[^'"\n\r]*)\1\s*\)/g;
    for (const match of source.matchAll(pattern)) {
      const before = source.slice(0, match.index);
      const line = before.split('\n').length;
      const column = match.index! - before.lastIndexOf('\n');
      references.push({ specifier: match[2], line, column, optional: true });
    }
    return references;
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
   * Evict a module and every cached module that depends on it, directly or
   * transitively. Returns the ids that were evicted.
   */
  invalidate(filePath: string): string[] {
    const targetId = this.getModuleId(filePath);
    const dependents = new Map<string, string[]>();
    for (const module of this.moduleCache.values()) {
      for (const depId of module.resolvedDependencies ?? []) {
        const list = dependents.get(depId) ?? [];
        list.push(module.id);
        dependents.set(depId, list);
      }
    }

    const evicted: string[] = [];
    const queue = [targetId];
    const seen = new Set(queue);
    while (queue.length > 0) {
      const id = queue.shift()!;
      if (this.moduleCache.has(id)) {
        this.evictModule(id);
        evicted.push(id);
      }
      for (const dependent of dependents.get(id) ?? []) {
        if (!seen.has(dependent)) {
          seen.add(dependent);
          queue.push(dependent);
        }
      }
    }
    return evicted;
  }

  /**
   * Ids of a module and everything it (transitively) depends on.
   */
  collectDependencyClosure(moduleId: string): Set<string> {
    const closure = new Set<string>();
    const queue = [moduleId];
    while (queue.length > 0) {
      const id = queue.pop()!;
      if (closure.has(id)) continue;
      closure.add(id);
      queue.push(...(this.moduleCache.get(id)?.resolvedDependencies ?? []));
    }
    return closure;
  }

  /**
   * Enforce cache limits by evicting least recently used modules. Modules that are
   * loading or in `protectedIds` (the current build) are never evicted, so the cache
   * may temporarily exceed its limits while a large build is in use.
   */
  private enforceCacheLimits(protectedIds: Set<string> = new Set()): void {
    if (!this.options.cache) return;
    if (
      this.moduleCache.size <= this.options.maxCacheSize &&
      this.currentMemoryUsage <= this.options.maxCacheMemory
    ) {
      return;
    }

    const candidates = Array.from(this.moduleCache.values())
      .filter(module => !protectedIds.has(module.id) && !this.loadingStack.has(module.id))
      .sort((a, b) => a.lastAccessed - b.lastAccessed);

    const memoryTarget = this.options.maxCacheMemory * 0.8; // Leave some headroom
    let memoryExceeded = this.currentMemoryUsage > this.options.maxCacheMemory;
    for (const module of candidates) {
      if (this.moduleCache.size <= this.options.maxCacheSize && !memoryExceeded) {
        break;
      }
      this.evictModule(module.id);
      memoryExceeded = memoryExceeded && this.currentMemoryUsage > memoryTarget;
    }
  }

  /**
   * Evict a specific module from cache
   */
  private evictModule(moduleId: string): void {
    const module = this.moduleCache.get(moduleId);
    if (module) {
      if (module.isLoaded) {
        this.currentMemoryUsage -= this.estimateModuleSize(module);
      }
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
    const trimmed = specifier.trim();
    // Node.js modules (`fs`, `node:path`) always come from the host
    if (isBuiltin(trimmed)) return trimmed;
    if (this.externalSpecifiers.size === 0) return null;

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
    }

    return module;
  }

  private getExternalModuleId(specifier: string): string {
    return `external:${specifier}`;
  }

  getCircularDependencyStrategy(): 'error' | 'warn' | 'ignore' {
    return this.options.circularDependencyStrategy;
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

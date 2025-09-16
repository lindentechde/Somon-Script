import * as fs from 'fs';
import * as path from 'path';
import { ModuleResolver, ResolvedModule } from './module-resolver';
import { Lexer } from '../lexer';
import { Parser } from '../parser';
import { Program, ImportDeclaration } from '../types';

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
}

export class ModuleLoader {
  private readonly resolver: ModuleResolver;
  private readonly moduleCache = new Map<string, LoadedModule>();
  private readonly loadingStack = new Set<string>();
  private readonly options: Required<ModuleLoadOptions>;
  private externalSpecifiers: Set<string> = new Set();

  constructor(resolver: ModuleResolver, options: ModuleLoadOptions = {}) {
    this.resolver = resolver;
    this.options = {
      encoding: options.encoding || ('utf-8' as BufferEncoding),
      cache: options.cache ?? true,
      circularDependencyStrategy: options.circularDependencyStrategy || 'warn',
      externals: options.externals ?? [],
    };
    this.setExternals(options.externals);
  }

  /**
   * Load a module and all its dependencies
   */
  async load(specifier: string, fromFile: string): Promise<LoadedModule> {
    const externalMatch = this.matchExternal(specifier);
    if (externalMatch) {
      return this.getOrCreateExternalModule(specifier, externalMatch);
    }

    const resolved = this.resolver.resolve(specifier, fromFile);
    const moduleId = this.getModuleId(resolved.resolvedPath);

    // Check cache first
    if (this.options.cache && this.moduleCache.has(moduleId)) {
      const cached = this.moduleCache.get(moduleId)!;
      if (cached.isLoaded) {
        return cached;
      }
      if (cached.isLoading) {
        return this.handleCircularDependency(moduleId, cached);
      }
    }

    // Check for circular dependency
    if (this.loadingStack.has(moduleId)) {
      return this.handleCircularDependency(moduleId);
    }

    return this.loadModule(resolved, moduleId);
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

    // Check cache first
    if (this.options.cache && this.moduleCache.has(moduleId)) {
      const cached = this.moduleCache.get(moduleId)!;
      if (cached.isLoaded) {
        return cached;
      }
      if (cached.isLoading) {
        return this.handleCircularDependency(moduleId, cached);
      }
    }

    // Check for circular dependency
    if (this.loadingStack.has(moduleId)) {
      return this.handleCircularDependency(moduleId);
    }

    return this.loadModuleSync(resolved, moduleId);
  }

  private loadModule(resolved: ResolvedModule, moduleId: string): LoadedModule {
    // Create module entry
    const module: LoadedModule = {
      id: moduleId,
      resolvedPath: resolved.resolvedPath,
      source: '',
      ast: { type: 'Program', body: [], line: 1, column: 1 },
      dependencies: [],
      exports: { named: {} },
      isLoaded: false,
      isLoading: true,
    };

    // Add to cache and loading stack
    if (this.options.cache) {
      this.moduleCache.set(moduleId, module);
    }
    this.loadingStack.add(moduleId);

    try {
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

      // Mark as loaded
      module.isLoaded = true;
      module.isLoading = false;
    } catch (error) {
      module.error = error as Error;
      module.isLoading = false;
      throw error;
    } finally {
      this.loadingStack.delete(moduleId);
    }

    return module;
  }

  private loadModuleSync(resolved: ResolvedModule, moduleId: string): LoadedModule {
    return this.loadModule(resolved, moduleId);
  }

  private handleCircularDependency(moduleId: string, module?: LoadedModule): LoadedModule {
    const message = `Circular dependency detected: ${moduleId}`;

    switch (this.options.circularDependencyStrategy) {
      case 'error':
        throw new Error(message);
      case 'warn':
        console.warn(`Warning: ${message}`);
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
        exports: { named: {} },
        isLoaded: false,
        isLoading: true,
      }
    );
  }

  /**
   * Extract raw dependency specifiers from AST (e.g., "./utils", "../math")
   * These need to be resolved to absolute paths before being stored in the dependency graph
   */
  private extractDependencies(ast: Program): string[] {
    const rawSpecifiers: string[] = [];

    for (const statement of ast.body) {
      if (statement.type === 'ImportDeclaration') {
        const importDecl = statement as ImportDeclaration;
        if (importDecl.source?.value && typeof importDecl.source.value === 'string') {
          rawSpecifiers.push(importDecl.source.value);
        }
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
      return this.moduleCache.get(moduleId)!;
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
    };

    if (this.options.cache) {
      this.moduleCache.set(moduleId, module);
    }

    return module;
  }

  private getExternalModuleId(specifier: string): string {
    return `external:${specifier}`;
  }
}

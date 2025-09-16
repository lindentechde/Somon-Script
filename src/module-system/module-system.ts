import * as path from 'path';
import { ModuleResolver, ModuleResolutionOptions } from './module-resolver';
import { ModuleLoader, ModuleLoadOptions, LoadedModule } from './module-loader';
import { ModuleRegistry, ModuleMetadata } from './module-registry';
import { CodeGenerator } from '../codegen';
import { transformSync } from '@babel/core';
import { CompilerOptions } from '../config';

export interface ModuleSystemOptions {
  resolution?: ModuleResolutionOptions;
  loading?: ModuleLoadOptions;
  compilation?: CompilerOptions;
}

export interface CompilationResult {
  modules: Map<string, string>;
  entryPoint: string;
  dependencies: string[];
  errors: Error[];
  warnings: string[];
}

export interface BundleOptions {
  entryPoint: string;
  outputPath?: string;
  format?: 'commonjs' | 'esm' | 'umd';
  minify?: boolean;
  sourceMaps?: boolean;
  externals?: string[];
  // Require explicit confirmation to use experimental formats
  force?: boolean;
}

export class ModuleSystem {
  private resolver: ModuleResolver;
  private loader: ModuleLoader;
  private registry: ModuleRegistry;
  private codeGenerator: CodeGenerator;

  constructor(options: ModuleSystemOptions = {}) {
    this.resolver = new ModuleResolver(options.resolution);
    this.loader = new ModuleLoader(this.resolver, options.loading);
    this.registry = new ModuleRegistry();
    this.codeGenerator = new CodeGenerator();
  }

  /**
   * Load a module and all its dependencies
   */
  async loadModule(specifier: string, fromFile: string): Promise<LoadedModule> {
    try {
      const module = await this.loader.load(specifier, fromFile);
      this.registry.register(module);
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
    this.registry.register(module);
    return module;
  }

  /**
   * Compile a module and all its dependencies
   */
  async compile(entryPoint: string): Promise<CompilationResult> {
    const errors: Error[] = [];
    const warnings: string[] = [];
    const modules = new Map<string, string>();

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

      // Compile each module
      for (const moduleId of compilationOrder) {
        const module = this.loader.getModule(moduleId);
        if (module && module.resolvedPath.endsWith('.som')) {
          try {
            const compiledCode = this.codeGenerator.generate(module.ast);
            modules.set(moduleId, compiledCode);
          } catch (error) {
            errors.push(new Error(`Failed to compile ${moduleId}: ${error}`));
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
      errors.push(error as Error);
      return {
        modules,
        entryPoint: '',
        dependencies: [],
        errors,
        warnings,
      };
    }
  }

  /**
   * Bundle modules into a single file
   */
  async bundle(options: BundleOptions): Promise<string> {
    const format = options.format ?? 'commonjs';
    if (format !== 'commonjs' && !options.force) {
      throw new Error(
        'ESM/UMD bundle formats are experimental. Re-run with force: true (or --force).'
      );
    }
    if (format !== 'commonjs' && options.force) {
      console.warn('Warning: ESM/UMD bundle formats are experimental; prefer commonjs.');
    }
    const compilationResult = await this.compile(options.entryPoint);

    if (compilationResult.errors.length > 0) {
      throw new Error(
        `Compilation failed: ${compilationResult.errors.map(e => e.message).join(', ')}`
      );
    }

    // Generate bundle based on format
    switch (format) {
      case 'commonjs':
        return this.generateCommonJSBundle(compilationResult, options);
      case 'esm':
        return this.generateESMBundle(compilationResult, options);
      case 'umd':
        return this.generateUMDBundle(compilationResult, options);
      default:
        throw new Error(`Unsupported bundle format: ${options.format}`);
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
   * Update module system options
   */
  updateOptions(options: ModuleSystemOptions): void {
    if (options.resolution) {
      this.resolver.updateOptions(options.resolution);
    }
    // Note: Loader and registry options would need to be updated if they supported it
  }

  private generateCommonJSBundle(result: CompilationResult, options: BundleOptions): string {
    const moduleMap: string[] = [];
    const moduleIdMapping = new Map<string, string>();

    // Create module ID mapping: use a stable key relative to cwd
    for (const [moduleId] of result.modules) {
      const key = path.relative(process.cwd(), moduleId);
      moduleIdMapping.set(moduleId, key);
    }

    // Helper to rewrite require calls to mapped IDs
    const rewriteRequires = (ownerModuleId: string, code: string) => {
      const pattern = /require\((['"])([^'"\)]+)\1\)/g; // eslint-disable-line no-useless-escape
      return code.replace(pattern, (_m, _q, spec: string) => {
        const tryResolveToKey = (s: string): string | null => {
          try {
            const resolved = this.resolver.resolve(s, ownerModuleId);
            const mapped = moduleIdMapping.get(resolved.resolvedPath);
            return mapped ?? null;
          } catch {
            return null;
          }
        };

        // 1) Try as-is
        let key = tryResolveToKey(spec);
        // 2) If it looks like a compiled relative import and failed, try .som fallback
        if (!key && /^(\.\.?\/).+\.js$/i.test(spec)) {
          key = tryResolveToKey(spec.replace(/\.js$/i, '.som'));
        }
        return key ? `require("${key}")` : _m;
      });
    };

    // Generate module wrapper for each module
    for (const [moduleId, code] of result.modules) {
      const key = moduleIdMapping.get(moduleId)!;
      const processedCode = rewriteRequires(moduleId, code);
      moduleMap.push(`  '${key}': function(module, exports, require) {\n${processedCode}\n  }`);
    }

    // Generate bundle
    const bundle = `
(function() {
  'use strict';
  
  var modules = {
${moduleMap.join(',\n')}
  };
  
  var cache = {};
  
  function require(id) {
    if (cache[id]) return cache[id].exports;
    
    var module = cache[id] = { exports: {} };
    modules[id](module, module.exports, require);
    
    return module.exports;
  }
  
  // Start with entry point and expose its exports
  var entryModule = require('${path.relative(process.cwd(), result.entryPoint)}');
  
  // Expose entry point exports as bundle exports (for Node.js)
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = entryModule;
  }
  
  // Return entry point exports (for other environments)
  return entryModule;
})();
`;

    return options.minify ? this.minify(bundle) : bundle;
  }

  private generateESMBundle(result: CompilationResult, options: BundleOptions): string {
    const modules: string[] = [];

    for (const [moduleId, code] of result.modules) {
      modules.push(`// Experimental ESM bundle: linking is not resolved`);
      modules.push(`// Module: ${path.relative(process.cwd(), moduleId)}`);
      modules.push(code);
      modules.push('');
    }

    const bundle = modules.join('\n');
    return options.minify ? this.minify(bundle) : bundle;
  }

  private generateUMDBundle(result: CompilationResult, options: BundleOptions): string {
    const commonjsBundle = this.generateCommonJSBundle(result, options);

    const umdWrapper = `
/* Experimental UMD bundle: internal linking is simplified */
(function (root, factory) {
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    // CommonJS
    factory(exports);
  } else if (typeof define === 'function' && define.amd) {
    // AMD
    define(['exports'], factory);
  } else {
    // Browser globals
    factory((root.SomonScript = {}));
  }
}(typeof self !== 'undefined' ? self : this, function (exports) {
${commonjsBundle}
}));
`;

    return options.minify ? this.minify(umdWrapper) : umdWrapper;
  }

  private minify(code: string): string {
    // Lazy-load preset to avoid runtime hard dependency
    let preset: any = null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      preset = require('babel-preset-minify');
    } catch {
      // Fallback: conservative whitespace trim for simple cases
      return code.replace(/\s*=\s*/g, '=').replace(/\s*;\s*/g, ';');
    }
    const out = transformSync(code, {
      sourceMaps: false,
      presets: [preset],
      comments: false,
      compact: true,
    });
    return out?.code && out.code.length > 0 ? out.code : code;
  }

  /**
   * Watch for file changes and reload modules
   */
  watch(): void {
    // This would implement file watching functionality
    // For now, it's a placeholder
    console.log('Module watching not yet implemented');
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
          errors.push(`Missing dependency '${dep}' in module '${module.id}'`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

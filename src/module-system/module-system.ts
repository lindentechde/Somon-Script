import * as path from 'path';
import { ModuleResolver, ModuleResolutionOptions } from './module-resolver';
import { ModuleLoader, ModuleLoadOptions, LoadedModule } from './module-loader';
import { ModuleRegistry, ModuleMetadata } from './module-registry';
import { CodeGenerator } from '../codegen';
import { transformSync, type PluginItem } from '@babel/core';
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
  private readonly resolver: ModuleResolver;
  private readonly loader: ModuleLoader;
  private readonly registry: ModuleRegistry;
  private readonly codeGenerator: CodeGenerator;

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
   */
  async compile(entryPoint: string, externals?: string[]): Promise<CompilationResult> {
    const errors: Error[] = [];
    const warnings: string[] = [];
    const modules = new Map<string, string>();
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

      // Compile each module
      for (const moduleId of compilationOrder) {
        const module = this.loader.getModule(moduleId);
        if (module?.resolvedPath.endsWith('.som')) {
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
    } finally {
      this.loader.setExternals(previousExternals);
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
    const compilationResult = await this.compile(options.entryPoint, options.externals);

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

  private registerAllLoadedModules(): void {
    const loadedModules = this.loader.getAllModules();
    for (const loaded of loadedModules) {
      this.registry.register(loaded);
    }
  }

  private generateCommonJSBundle(result: CompilationResult, options: BundleOptions): string {
    const moduleMap: string[] = [];
    const moduleIdMapping = new Map<string, string>();
    const externals = new Set(
      (options.externals ?? []).map(ext => ext.trim()).filter(ext => ext.length > 0)
    );
    const externalModuleIds = new Set<string>();

    // Create module ID mapping: use a stable key relative to cwd
    for (const [moduleId] of result.modules) {
      const key = path.relative(process.cwd(), moduleId);
      moduleIdMapping.set(moduleId, key);
    }

    const buildExternalCandidates = (raw: string): string[] => {
      const variants = new Set<string>();
      variants.add(raw);
      if (/\.js$/i.test(raw)) {
        const withoutExt = raw.replace(/\.js$/i, '');
        variants.add(withoutExt);
        variants.add(`${withoutExt}.som`);
      } else {
        variants.add(`${raw}.js`);
      }
      if (/\.som$/i.test(raw)) {
        const withoutExt = raw.replace(/\.som$/i, '');
        variants.add(withoutExt);
        variants.add(`${withoutExt}.js`);
      } else {
        variants.add(`${raw}.som`);
      }
      return Array.from(variants);
    };

    const matchesExternal = (raw: string): boolean => {
      if (externals.size === 0) return false;
      for (const candidate of buildExternalCandidates(raw)) {
        if (externals.has(candidate)) {
          return true;
        }
      }
      return false;
    };

    const markExternalModule = (ownerModuleId: string, raw: string): void => {
      for (const candidate of buildExternalCandidates(raw)) {
        try {
          const resolved = this.resolver.resolve(candidate, ownerModuleId);
          externalModuleIds.add(resolved.resolvedPath);
          return;
        } catch {
          // Ignore failures; we only care about candidates that resolve
        }
      }
    };

    // Helper to rewrite require calls to mapped IDs
    const rewriteRequires = (ownerModuleId: string, code: string) => {
      const pattern = /require\((['"])([^'"\)]+)\1\)/g; // eslint-disable-line no-useless-escape
      return code.replace(pattern, (_m, _q, spec: string) => {
        if (matchesExternal(spec)) {
          markExternalModule(ownerModuleId, spec);
          return _m;
        }

        const tryResolveToKey = (s: string): { key: string; resolvedPath: string } | null => {
          try {
            const resolved = this.resolver.resolve(s, ownerModuleId);
            const mapped = moduleIdMapping.get(resolved.resolvedPath);
            if (!mapped) {
              return null;
            }
            if (externalModuleIds.has(resolved.resolvedPath)) {
              return null;
            }
            return { key: mapped, resolvedPath: resolved.resolvedPath };
          } catch {
            return null;
          }
        };

        // 1) Try as-is
        let resolved = tryResolveToKey(spec);
        // 2) If it looks like a compiled relative import and failed, try .som fallback
        if (!resolved && /^(\.\.?\/).+\.js$/i.test(spec)) {
          const fallbackSpec = spec.replace(/\.js$/i, '.som');
          if (matchesExternal(fallbackSpec)) {
            markExternalModule(ownerModuleId, fallbackSpec);
            return _m;
          }
          resolved = tryResolveToKey(fallbackSpec);
        }
        if (!resolved) {
          return _m;
        }
        return `require("${resolved.key}")`;
      });
    };

    // Pre-mark explicitly configured externals relative to the entry point
    for (const ext of externals) {
      markExternalModule(result.entryPoint, ext);
    }

    const processedModules = new Map<string, string>();
    for (const [moduleId, code] of result.modules) {
      const processedCode = rewriteRequires(moduleId, code);
      processedModules.set(moduleId, processedCode);
    }

    for (const [moduleId, processedCode] of processedModules) {
      if (externalModuleIds.has(moduleId)) {
        continue;
      }
      const key = moduleIdMapping.get(moduleId)!;
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
  var __externalRequire = typeof module !== 'undefined' && module.require
    ? module.require.bind(module)
    : typeof require === 'function'
      ? require
      : null;
  
  function _require(id) {
    if (cache[id]) return cache[id].exports;

    if (!modules[id]) {
      if (__externalRequire) {
        return __externalRequire(id);
      }
      throw new Error("Module '" + id + "' not found in bundle and no external require available.");
    }

    var module = cache[id] = { exports: {} };
    modules[id](module, module.exports, _require);

    return module.exports;
  }
  
  // Start with entry point and expose its exports
  var entryModule = _require('${path.relative(process.cwd(), result.entryPoint)}');
  
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
    let presetModule: unknown = null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      presetModule = require('babel-preset-minify');
    } catch {
      // Fallback: conservative whitespace trim for simple cases
      return code.replace(/\s*=\s*/g, '=').replace(/\s*;\s*/g, ';');
    }
    const presetItems: PluginItem[] = [];
    if (presetModule && (typeof presetModule === 'function' || typeof presetModule === 'object')) {
      presetItems.push(presetModule as PluginItem);
    }
    const out = transformSync(code, {
      sourceMaps: false,
      presets: presetItems,
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

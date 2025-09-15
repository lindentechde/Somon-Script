import * as path from 'path';
import { ModuleResolver, ModuleResolutionOptions } from './module-resolver';
import { ModuleLoader, ModuleLoadOptions, LoadedModule } from './module-loader';
import { ModuleRegistry, ModuleMetadata } from './module-registry';
import { CodeGenerator } from '../codegen';
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
    const module = await this.loader.load(specifier, fromFile);
    this.registry.register(module);
    return module;
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
    const compilationResult = await this.compile(options.entryPoint);

    if (compilationResult.errors.length > 0) {
      throw new Error(
        `Compilation failed: ${compilationResult.errors.map(e => e.message).join(', ')}`
      );
    }

    // Generate bundle based on format
    switch (options.format || 'commonjs') {
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

    // Create module ID mapping
    for (const [moduleId] of result.modules) {
      const relativePath = path.relative(process.cwd(), moduleId);
      moduleIdMapping.set(moduleId, relativePath);
    }

    // Generate module wrapper for each module
    for (const [moduleId, code] of result.modules) {
      const relativePath = moduleIdMapping.get(moduleId)!;

      // Replace require statements with correct module IDs
      let processedCode = code;
      for (const [originalId] of moduleIdMapping) {
        // Replace require("./module") with require("module.som")
        const originalRelative = path.relative(path.dirname(moduleId), originalId);
        if (originalRelative && !originalRelative.startsWith('..')) {
          const requirePattern = new RegExp(`require\\(["']\\.\\/[^"']*["']\\)`, 'g');
          processedCode = processedCode.replace(requirePattern, match => {
            // Extract the specifier from the require statement
            const specifierMatch = match.match(/require\(["']([^"']*)["']\)/);
            if (specifierMatch) {
              const specifier = specifierMatch[1];
              // Try to resolve this specifier to find the correct module ID
              try {
                const resolved = this.resolver.resolve(specifier, moduleId);
                const targetMappedId = moduleIdMapping.get(resolved.resolvedPath);
                if (targetMappedId) {
                  return `require("${targetMappedId}")`;
                }
              } catch {
                // If resolution fails, keep original
              }
            }
            return match;
          });
        }
      }

      moduleMap.push(
        `  '${relativePath}': function(module, exports, require) {\n${processedCode}\n  }`
      );
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
  
  // Start with entry point
  require('${path.relative(process.cwd(), result.entryPoint)}');
})();
`;

    return options.minify ? this.minify(bundle) : bundle;
  }

  private generateESMBundle(result: CompilationResult, options: BundleOptions): string {
    const modules: string[] = [];

    for (const [moduleId, code] of result.modules) {
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
    // Simple minification - remove comments and extra whitespace
    return code
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
      .replace(/\/\/.*$/gm, '') // Remove line comments
      .replace(/\s+/g, ' ') // Collapse whitespace
      .replace(/;\s*}/g, '}') // Remove semicolons before closing braces
      .trim();
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

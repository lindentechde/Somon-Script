import * as path from 'node:path';
import { LoadedModule, ModuleExports } from './module-loader';
import { Program, ImportDeclaration } from '../types';

export interface ModuleMetadata {
  id: string;
  resolvedPath: string;
  packageName?: string;
  version?: string;
  dependencies: string[];
  dependents: string[];
  exports: ModuleExports;
  imports: ModuleImports;
  lastModified?: Date;
  size?: number;
}

export interface ModuleImports {
  default?: string[];
  named: Record<string, string[]>;
  namespace?: string[];
}

export interface DependencyNode {
  id: string;
  dependencies: string[];
  dependents: string[];
  level: number;
}

// Public tree node type used by getDependencyTree
export type DependencyTreeNode =
  | { id: string; level?: number; circular?: false; dependencies: DependencyTreeNode[] }
  | { id: string; circular: true };

export class ModuleRegistry {
  private readonly modules = new Map<string, ModuleMetadata>();
  private readonly dependencyGraph = new Map<string, DependencyNode>();

  /**
   * Register a loaded module
   */
  register(module: LoadedModule): void {
    // Validate module ID is absolute path or external module
    if (!path.isAbsolute(module.id) && !module.id.startsWith('external:')) {
      throw new Error(`Module ID must be absolute path or external module, got: ${module.id}`);
    }

    const metadata: ModuleMetadata = {
      id: module.id,
      resolvedPath: module.resolvedPath,
      dependencies: [...module.dependencies],
      dependents: [],
      exports: { ...module.exports },
      imports: this.extractImports(module.ast),
      lastModified: new Date(),
      size: module.source.length,
    };

    this.modules.set(module.id, metadata);
    this.updateDependencyGraph(module.id, module.dependencies);
  }

  /**
   * Get module metadata
   */
  get(moduleId: string): ModuleMetadata | undefined {
    return this.modules.get(moduleId);
  }

  /**
   * Check if module is registered
   */
  has(moduleId: string): boolean {
    return this.modules.has(moduleId);
  }

  /**
   * Get all registered modules
   */
  getAll(): ModuleMetadata[] {
    return Array.from(this.modules.values());
  }

  /**
   * Get module dependencies
   */
  getDependencies(moduleId: string): string[] {
    const meta = this.modules.get(moduleId);
    return meta ? [...meta.dependencies] : [];
  }

  /**
   * Get module dependents (modules that depend on this one)
   */
  getDependents(moduleId: string): string[] {
    const node = this.dependencyGraph.get(moduleId);
    return node ? [...node.dependents] : [];
  }

  /**
   * Get dependency graph
   */
  getDependencyGraph(): Map<string, DependencyNode> {
    return new Map(this.dependencyGraph);
  }

  /**
   * Get topological sort of modules
   */
  getTopologicalSort(): string[] {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const result: string[] = [];

    const visit = (moduleId: string) => {
      if (visited.has(moduleId)) return;
      if (visiting.has(moduleId)) {
        throw new Error(`Circular dependency detected: ${moduleId}`);
      }

      visiting.add(moduleId);
      const deps = this.getResolvedDependencies(moduleId);
      for (const depId of deps) {
        visit(depId);
      }

      visiting.delete(moduleId);
      visited.add(moduleId);
      result.push(moduleId);
    };

    for (const moduleId of this.dependencyGraph.keys()) {
      visit(moduleId);
    }

    return result;
  }

  /**
   * Find circular dependencies
   */
  findCircularDependencies(): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const path: string[] = [];

    const visit = (moduleId: string) => {
      if (visited.has(moduleId)) return;
      if (visiting.has(moduleId)) {
        // Found a cycle
        const cycleStart = path.indexOf(moduleId);
        cycles.push([...path.slice(cycleStart), moduleId]);
        return;
      }

      visiting.add(moduleId);
      path.push(moduleId);

      const deps = this.getResolvedDependencies(moduleId);
      for (const depId of deps) {
        visit(depId);
      }

      path.pop();
      visiting.delete(moduleId);
      visited.add(moduleId);
    };

    for (const moduleId of this.dependencyGraph.keys()) {
      visit(moduleId);
    }

    return cycles;
  }

  /**
   * Get module statistics
   */
  getStatistics(): {
    totalModules: number;
    totalDependencies: number;
    averageDependencies: number;
    maxDependencyDepth: number;
    circularDependencies: number;
  } {
    const totalModules = this.modules.size;
    const allDependencies = Array.from(this.dependencyGraph.values()).map(
      node => node.dependencies.length
    );

    const totalDependencies = allDependencies.reduce((sum, count) => sum + count, 0);
    const averageDependencies = totalModules > 0 ? totalDependencies / totalModules : 0;
    const maxDependencyDepth = Math.max(
      ...Array.from(this.dependencyGraph.values()).map(node => node.level),
      0
    );
    const circularDependencies = this.findCircularDependencies().length;

    return {
      totalModules,
      totalDependencies,
      averageDependencies,
      maxDependencyDepth,
      circularDependencies,
    };
  }

  /**
   * Clear registry
   */
  clear(): void {
    this.modules.clear();
    this.dependencyGraph.clear();
  }

  /**
   * Remove module from registry
   */
  remove(moduleId: string): boolean {
    const removed = this.modules.delete(moduleId);
    this.dependencyGraph.delete(moduleId);

    // Remove from dependents
    for (const node of this.dependencyGraph.values()) {
      const index = node.dependents.indexOf(moduleId);
      if (index !== -1) {
        node.dependents.splice(index, 1);
      }
    }

    return removed;
  }

  private updateDependencyGraph(moduleId: string, dependencies: string[]): void {
    // Resolve raw dependency specifiers to module IDs
    const module = this.modules.get(moduleId);
    const moduleDir = module ? path.dirname(module.resolvedPath) : path.dirname(moduleId);

    const resolvedDeps: string[] = [];
    for (const dep of dependencies) {
      // Try to resolve the raw specifier to a module ID
      const resolvedDepId = this.resolveSpecifierToModuleId(dep, moduleDir);
      if (resolvedDepId) {
        resolvedDeps.push(resolvedDepId);
      } else {
        // Keep raw specifier if we can't resolve it yet
        resolvedDeps.push(dep);
      }
    }

    // Create or update node
    let node = this.dependencyGraph.get(moduleId);
    if (node) {
      // Update existing node
      node.dependencies = resolvedDeps;
    } else {
      // Create new node
      node = {
        id: moduleId,
        dependencies: resolvedDeps,
        dependents: [],
        level: 0,
      };
      this.dependencyGraph.set(moduleId, node);
    }

    // Update dependents for dependencies
    for (const depId of resolvedDeps) {
      // Ensure dependency node exists
      if (!this.dependencyGraph.has(depId)) {
        this.dependencyGraph.set(depId, {
          id: depId,
          dependencies: [],
          dependents: [],
          level: 0,
        });
      }
      const depNode = this.dependencyGraph.get(depId)!;
      if (!depNode.dependents.includes(moduleId)) {
        depNode.dependents.push(moduleId);
      }
    }

    // Calculate levels
    this.calculateLevels();
  }

  private calculateLevels(): void {
    const visited = new Set<string>();

    const calculateLevel = (moduleId: string): number => {
      if (visited.has(moduleId)) return 0;
      visited.add(moduleId);

      const node = this.dependencyGraph.get(moduleId);
      if (!node || node.dependencies.length === 0) {
        node && (node.level = 0);
        return 0;
      }

      // Use resolved adjacency for level calculation
      const resolvedDeps = this.getResolvedDependencies(moduleId);
      const maxDepLevel = resolvedDeps.length
        ? Math.max(...resolvedDeps.map(depId => calculateLevel(depId)))
        : 0;

      node.level = maxDepLevel + 1;
      return node.level;
    };

    for (const moduleId of this.dependencyGraph.keys()) {
      calculateLevel(moduleId);
    }
  }

  private extractImports(ast: Program): ModuleImports {
    const imports: ModuleImports = { named: {} };

    for (const statement of ast.body) {
      if (statement.type === 'ImportDeclaration') {
        const importDecl = statement as ImportDeclaration;
        const source = String(importDecl.source.value);

        this.processImportSpecifiers(importDecl.specifiers || [], source, imports);
      }
    }

    return imports;
  }

  /**
   * Get modules that have no dependencies (entry points)
   */
  getEntryPoints(): string[] {
    return Array.from(this.dependencyGraph.values())
      .filter(node => node.dependencies.length === 0)
      .map(node => node.id);
  }

  /**
   * Get modules that are not depended upon (dead code candidates)
   */
  getDeadCodeCandidates(): string[] {
    return Array.from(this.dependencyGraph.values())
      .filter(node => node.dependents.length === 0)
      .map(node => node.id);
  }

  /**
   * Get dependency tree for a specific module
   */
  getDependencyTree(moduleId: string, visited = new Set<string>()): DependencyTreeNode {
    // Return a structured dependency tree node. Use a discriminated union for circular nodes.
    if (visited.has(moduleId)) {
      return { id: moduleId, circular: true } as const;
    }

    visited.add(moduleId);
    const node = this.dependencyGraph.get(moduleId);

    if (!node) {
      return { id: moduleId, dependencies: [] } as DependencyTreeNode;
    }

    return {
      id: moduleId,
      level: node.level,
      dependencies: node.dependencies.map(dep => this.getDependencyTree(dep, new Set(visited))),
    } as DependencyTreeNode;
  }

  private processImportSpecifiers(
    specifiers: Array<{ type: string; imported?: { name?: string } }>,
    source: string,
    imports: ModuleImports
  ): void {
    for (const specifier of specifiers) {
      if (specifier.type === 'ImportDefaultSpecifier') {
        // Initialize default import list lazily
        imports.default ??= [];
        imports.default.push(source);
      } else if (specifier.type === 'ImportSpecifier') {
        if (!imports.named[source]) imports.named[source] = [];
        imports.named[source].push(specifier.imported?.name || '');
      } else if (specifier.type === 'ImportNamespaceSpecifier') {
        imports.namespace ??= [];
        imports.namespace.push(source);
      }
    }
  }

  // Get resolved dependencies for a given module ID
  private getResolvedDependencies(moduleId: string): string[] {
    const node = this.dependencyGraph.get(moduleId);
    if (!node) return [];

    const module = this.modules.get(moduleId);
    const moduleDir = module ? path.dirname(module.resolvedPath) : path.dirname(moduleId);

    const resolved: string[] = [];
    for (const dep of node.dependencies) {
      // Try to resolve if it's a raw specifier
      if (!path.isAbsolute(dep) && !dep.startsWith('external:')) {
        const resolvedId = this.resolveSpecifierToModuleId(dep, moduleDir);
        if (resolvedId && this.dependencyGraph.has(resolvedId)) {
          resolved.push(resolvedId);
        }
      } else if (this.dependencyGraph.has(dep)) {
        // Already resolved
        resolved.push(dep);
      }
    }

    return resolved;
  }

  // Resolve a raw specifier to a module ID
  private resolveSpecifierToModuleId(specifier: string, fromDir: string): string | null {
    // If it's already an absolute path or external module, return as-is
    if (path.isAbsolute(specifier) || specifier.startsWith('external:')) {
      return specifier;
    }

    // For relative paths, try to find the matching module
    const possiblePaths = [
      path.resolve(fromDir, specifier),
      path.resolve(fromDir, specifier + '.som'),
      path.resolve(fromDir, specifier + '.js'),
      path.resolve(fromDir, specifier, 'index.som'),
      path.resolve(fromDir, specifier, 'index.js'),
    ];

    // Find a registered module that matches one of the possible paths
    for (const mod of this.modules.values()) {
      if (possiblePaths.includes(mod.resolvedPath)) {
        return mod.id;
      }
    }

    return null;
  }
}

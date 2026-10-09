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
    this.updateDependencyGraph(module.id, module.dependencies, module.resolvedDependencies);
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
   * Get topological sort of modules (dependencies first). Back edges of circular
   * dependencies are skipped; use findCircularDependencies() to report cycles.
   */
  getTopologicalSort(): string[] {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const result: string[] = [];

    const visit = (moduleId: string) => {
      if (visited.has(moduleId) || visiting.has(moduleId)) return;

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

  private updateDependencyGraph(
    moduleId: string,
    dependencies: string[],
    resolvedDependencies?: string[]
  ): void {
    // Prefer the ids the loader resolved; fall back to matching registered modules
    // for hand-built LoadedModule objects. Unresolvable specifiers are not added.
    let resolvedDeps: string[];
    if (resolvedDependencies) {
      resolvedDeps = [...resolvedDependencies];
    } else {
      // register() stores the module before its dependencies
      const moduleDir = path.dirname(this.modules.get(moduleId)!.resolvedPath);
      resolvedDeps = [];
      for (const dep of dependencies) {
        const resolvedDepId = this.resolveSpecifierToModuleId(dep, moduleDir);
        if (resolvedDepId) {
          resolvedDeps.push(resolvedDepId);
        }
      }
    }
    resolvedDeps = Array.from(new Set(resolvedDeps));

    // Create or update node
    let node = this.dependencyGraph.get(moduleId);
    if (node) {
      // Update existing node, dropping it from dependencies it no longer has
      for (const oldDep of node.dependencies) {
        const oldNode = this.dependencyGraph.get(oldDep);
        if (oldNode && !resolvedDeps.includes(oldDep)) {
          oldNode.dependents = oldNode.dependents.filter(id => id !== moduleId);
        }
      }
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

  /**
   * A module's level is 0 without dependencies and otherwise one more than the
   * deepest of its dependencies; a dependency back into the path being computed
   * (a cycle) counts as 0.
   */
  private calculateLevels(): void {
    const done = new Set<string>();
    const inProgress = new Set<string>();

    const calculateLevel = (moduleId: string): number => {
      // Called for nodes of the graph only: its keys and their resolved dependencies
      const node = this.dependencyGraph.get(moduleId)!;
      if (done.has(moduleId)) return node.level;
      if (inProgress.has(moduleId)) return 0;
      inProgress.add(moduleId);

      const dependencyLevels = this.getResolvedDependencies(moduleId).map(calculateLevel);
      node.level = node.dependencies.length === 0 ? 0 : Math.max(0, ...dependencyLevels) + 1;

      inProgress.delete(moduleId);
      done.add(moduleId);
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

        this.processImportSpecifiers(importDecl.specifiers, source, imports);
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
    specifiers: ImportDeclaration['specifiers'],
    source: string,
    imports: ModuleImports
  ): void {
    for (const specifier of specifiers) {
      if (specifier.type === 'ImportDefaultSpecifier') {
        (imports.default ??= []).push(source);
      } else if (specifier.type === 'ImportSpecifier') {
        (imports.named[source] ??= []).push(specifier.imported.name);
      } else {
        (imports.namespace ??= []).push(source);
      }
    }
  }

  /**
   * The dependencies of a node of the graph that are still nodes (not removed since).
   * Dependencies are module ids: the loader's resolved ids, or specifiers of a
   * hand-built module matched with the registered modules when it was registered.
   */
  private getResolvedDependencies(moduleId: string): string[] {
    // Called for nodes of the graph only
    return this.dependencyGraph
      .get(moduleId)!
      .dependencies.filter(dep => this.dependencyGraph.has(dep));
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

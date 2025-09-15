import { LoadedModule, ModuleExports } from './module-loader';
import { Program } from '../types';

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

export class ModuleRegistry {
  private modules = new Map<string, ModuleMetadata>();
  private dependencyGraph = new Map<string, DependencyNode>();

  /**
   * Register a loaded module
   */
  register(module: LoadedModule): void {
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
    const node = this.dependencyGraph.get(moduleId);
    return node ? [...node.dependencies] : [];
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
      const node = this.dependencyGraph.get(moduleId);

      if (node) {
        for (const dep of node.dependencies) {
          visit(dep);
        }
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

      const node = this.dependencyGraph.get(moduleId);
      if (node) {
        for (const dep of node.dependencies) {
          visit(dep);
        }
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
    // Create or update node
    let node = this.dependencyGraph.get(moduleId);
    if (node) {
      // Update existing node
      node.dependencies = [...dependencies];
    } else {
      // Create new node
      node = {
        id: moduleId,
        dependencies: [...dependencies],
        dependents: [],
        level: 0,
      };
      this.dependencyGraph.set(moduleId, node);
    }

    // Ensure all dependency nodes exist and update dependents
    for (const dep of dependencies) {
      let depNode = this.dependencyGraph.get(dep);
      if (!depNode) {
        // Create placeholder node for dependency
        depNode = {
          id: dep,
          dependencies: [],
          dependents: [],
          level: 0,
        };
        this.dependencyGraph.set(dep, depNode);
      }

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

      const maxDepLevel = Math.max(...node.dependencies.map(dep => calculateLevel(dep)));

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
        const importDecl = statement as any; // ImportDeclaration
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
  getDependencyTree(moduleId: string, visited = new Set<string>()): any {
    if (visited.has(moduleId)) {
      return { id: moduleId, circular: true };
    }

    visited.add(moduleId);
    const node = this.dependencyGraph.get(moduleId);

    if (!node) {
      return { id: moduleId, dependencies: [] };
    }

    return {
      id: moduleId,
      level: node.level,
      dependencies: node.dependencies.map(dep => this.getDependencyTree(dep, new Set(visited))),
    };
  }

  private processImportSpecifiers(specifiers: any[], source: string, imports: any): void {
    for (const specifier of specifiers) {
      if (specifier.type === 'ImportDefaultSpecifier') {
        if (!imports.default) imports.default = [];
        imports.default.push(source);
      } else if (specifier.type === 'ImportSpecifier') {
        if (!imports.named[source]) imports.named[source] = [];
        imports.named[source].push(specifier.imported?.name || '');
      } else if (specifier.type === 'ImportNamespaceSpecifier') {
        if (!imports.namespace) imports.namespace = [];
        imports.namespace.push(source);
      }
    }
  }
}

import * as path from 'path';

import { Lexer } from '../src/lexer';
import { Parser } from '../src/parser';
import { ModuleRegistry } from '../src/module-system';
import type { LoadedModule } from '../src/module-system';

/**
 * ModuleRegistry: metadata, the dependency graph and its queries (dependents,
 * topological order, cycles, levels, statistics, entry points, trees), removal,
 * and modules built by hand without resolved dependency ids.
 */

const ROOT = path.resolve(path.sep, 'project');
const at = (name: string) => path.join(ROOT, name);

function module(
  id: string,
  options: { deps?: string[]; resolved?: string[] | null; source?: string } = {}
): LoadedModule {
  const source = options.source ?? '';
  const ast = new Parser(new Lexer(source).tokenize()).parse();
  return {
    id,
    resolvedPath: id,
    source,
    ast,
    dependencies: options.deps ?? [],
    resolvedDependencies:
      options.resolved === null ? undefined : (options.resolved ?? options.deps ?? []),
    exports: { named: { х: 1 } },
    isLoaded: true,
    isLoading: false,
    lastAccessed: 0,
  };
}

describe('ModuleRegistry', () => {
  let registry: ModuleRegistry;

  beforeEach(() => {
    registry = new ModuleRegistry();
  });

  /** Register modules given as name → names of their dependencies. */
  function graph(edges: Record<string, string[]>): void {
    for (const [name, deps] of Object.entries(edges)) {
      registry.register(module(at(name), { deps: deps.map(at) }));
    }
  }

  describe('registration and metadata', () => {
    test('ids must be absolute paths or external modules', () => {
      expect(() => registry.register(module('relative.som'))).toThrow(
        'Module ID must be absolute path or external module, got: relative.som'
      );
      registry.register(module('external:lodash'));
      expect(registry.has('external:lodash')).toBe(true);
    });

    test('metadata copies the module and lists its imports by kind', () => {
      const source = [
        'ворид Пешфарз, { а, б чун в } аз "./x";',
        'ворид * чун Н аз "./y";',
        'ворид { г } аз "./x";',
        'ворид Танҳо аз "./z";',
        'ворид "./side";',
      ].join('\n');
      const loaded = module(at('main.som'), { source, deps: ['./x', './y'], resolved: [] });
      registry.register(loaded);
      const meta = registry.get(at('main.som'))!;
      expect(meta).toMatchObject({
        id: at('main.som'),
        resolvedPath: at('main.som'),
        dependencies: ['./x', './y'],
        exports: { named: { х: 1 } },
        size: source.length,
        imports: {
          default: ['./x', './z'],
          named: { './x': ['а', 'б', 'г'] },
          namespace: ['./y'],
        },
      });
      expect(meta.lastModified).toBeInstanceOf(Date);
      // Copies, not the module's arrays and objects
      expect(meta.dependencies).not.toBe(loaded.dependencies);
      expect(meta.exports).not.toBe(loaded.exports);
      expect(registry.get(at('other.som'))).toBeUndefined();
      expect(registry.has(at('other.som'))).toBe(false);
    });

    test('a module without imports has no import lists', () => {
      registry.register(module(at('a.som'), { source: 'тағ х = 1;' }));
      expect(registry.get(at('a.som'))!.imports).toEqual({ named: {} });
    });
  });

  describe('graph queries', () => {
    test('dependencies, dependents and the graph are copies', () => {
      graph({ 'main.som': ['a.som', 'b.som'], 'a.som': ['b.som'], 'b.som': [] });
      const deps = registry.getDependencies(at('main.som'));
      expect(deps).toEqual([at('a.som'), at('b.som')]);
      deps.push('x');
      expect(registry.getDependencies(at('main.som'))).toHaveLength(2);
      expect(registry.getDependencies(at('unknown.som'))).toEqual([]);

      const dependents = registry.getDependents(at('b.som'));
      expect(dependents.sort()).toEqual([at('a.som'), at('main.som')].sort());
      dependents.length = 0;
      expect(registry.getDependents(at('b.som'))).toHaveLength(2);
      // The metadata lists them too, also those registered after the module
      expect(registry.get(at('b.som'))!.dependents.sort()).toEqual(
        [at('a.som'), at('main.som')].sort()
      );
      expect(registry.getDependents(at('unknown.som'))).toEqual([]);

      const copy = registry.getDependencyGraph();
      copy.delete(at('main.som'));
      expect(registry.getDependencyGraph().has(at('main.som'))).toBe(true);
      expect(registry.getAll().map(meta => meta.id)).toEqual(
        ['main.som', 'a.som', 'b.som'].map(at)
      );
    });

    test('a dependency that is not registered is a node of the graph without metadata', () => {
      graph({ 'main.som': ['missing.som'] });
      expect(registry.has(at('missing.som'))).toBe(false);
      expect(registry.getDependencyGraph().get(at('missing.som'))).toEqual({
        id: at('missing.som'),
        dependencies: [],
        dependents: [at('main.som')],
        level: 0,
      });
      expect(registry.getTopologicalSort()).toEqual([at('missing.som'), at('main.som')]);
    });

    test('duplicate dependencies count once', () => {
      registry.register(module(at('a.som'), { deps: [at('b.som'), at('b.som')] }));
      expect(registry.getDependencies(at('a.som'))).toEqual([at('b.som'), at('b.som')]);
      expect(registry.getDependencyGraph().get(at('a.som'))!.dependencies).toEqual([at('b.som')]);
      expect(registry.getDependents(at('b.som'))).toEqual([at('a.som')]);
    });

    test('topological order puts dependencies first and skips the back edges of cycles', () => {
      graph({
        'main.som': ['left.som', 'right.som'],
        'left.som': ['shared.som'],
        'right.som': ['shared.som'],
        'shared.som': [],
      });
      const order = registry.getTopologicalSort();
      expect(order).toEqual(['shared.som', 'left.som', 'right.som', 'main.som'].map(at));

      const cyclic = new ModuleRegistry();
      cyclic.register(module(at('a.som'), { deps: [at('b.som')] }));
      cyclic.register(module(at('b.som'), { deps: [at('a.som')] }));
      expect(cyclic.getTopologicalSort()).toEqual([at('b.som'), at('a.som')]);
    });

    test('cycles: self-imports, two and three modules', () => {
      expect(registry.findCircularDependencies()).toEqual([]);
      graph({
        'self.som': ['self.som'],
        'a.som': ['b.som'],
        'b.som': ['a.som'],
        'x.som': ['y.som'],
        'y.som': ['z.som'],
        'z.som': ['x.som'],
      });
      expect(registry.findCircularDependencies()).toEqual([
        [at('self.som'), at('self.som')],
        [at('a.som'), at('b.som'), at('a.som')],
        [at('x.som'), at('y.som'), at('z.som'), at('x.som')],
      ]);
    });

    test('statistics', () => {
      expect(registry.getStatistics()).toEqual({
        totalModules: 0,
        totalDependencies: 0,
        averageDependencies: 0,
        maxDependencyDepth: 0,
        circularDependencies: 0,
      });
      graph({
        'main.som': ['a.som', 'b.som'],
        'a.som': ['b.som'],
        'b.som': ['c.som'],
        'c.som': ['b.som'],
      });
      expect(registry.getStatistics()).toEqual({
        totalModules: 4,
        totalDependencies: 5,
        averageDependencies: 1.25,
        maxDependencyDepth: 4,
        circularDependencies: 1,
      });
    });

    test('entry points (no dependencies) and dead code candidates (no dependents)', () => {
      graph({ 'main.som': ['a.som'], 'a.som': ['leaf.som'], 'leaf.som': [], 'alone.som': [] });
      expect(registry.getEntryPoints()).toEqual([at('leaf.som'), at('alone.som')]);
      expect(registry.getDeadCodeCandidates()).toEqual([at('main.som'), at('alone.som')]);
    });

    test('dependency trees with levels, cycles and unknown modules', () => {
      graph({ 'main.som': ['a.som', 'leaf.som'], 'a.som': ['main.som', 'leaf.som'] });
      expect(registry.getDependencyTree(at('main.som'))).toEqual({
        id: at('main.som'),
        level: 2,
        dependencies: [
          {
            id: at('a.som'),
            level: 1,
            dependencies: [
              { id: at('main.som'), circular: true },
              { id: at('leaf.som'), level: 0, dependencies: [] },
            ],
          },
          { id: at('leaf.som'), level: 0, dependencies: [] },
        ],
      });
      expect(registry.getDependencyTree(at('unknown.som'))).toEqual({
        id: at('unknown.som'),
        dependencies: [],
      });
    });
  });

  describe('changes', () => {
    test('registering again replaces the dependencies and their dependents', () => {
      graph({ 'main.som': ['a.som', 'b.som'], 'a.som': [], 'b.som': [] });
      graph({ 'main.som': ['b.som', 'c.som'] });
      expect(registry.getDependents(at('a.som'))).toEqual([]);
      expect(registry.getDependents(at('b.som'))).toEqual([at('main.som')]);
      expect(registry.getDependents(at('c.som'))).toEqual([at('main.som')]);
    });

    test('remove drops a module, its node and its place among dependents', () => {
      graph({ 'main.som': ['a.som'], 'a.som': [] });
      expect(registry.remove(at('a.som'))).toBe(true);
      expect(registry.has(at('a.som'))).toBe(false);
      expect(registry.getDependencyGraph().has(at('a.som'))).toBe(false);
      expect(registry.remove(at('a.som'))).toBe(false);
      // The edge to the removed module stays, but leads nowhere
      expect(registry.getDependencies(at('main.som'))).toEqual([at('a.som')]);
      expect(registry.getTopologicalSort()).toEqual([at('main.som')]);
      expect(registry.getDependencyGraph().get(at('main.som'))!.level).toBe(1);

      graph({ 'main.som': ['b.som'], 'a.som': ['main.som'] });
      expect(registry.remove(at('main.som'))).toBe(true);
      expect(registry.getDependents(at('b.som'))).toEqual([]);
      // Registering again after a dependency was removed
      graph({ 'a.som': [] });
      expect(registry.getDependencyGraph().get(at('a.som'))!.dependencies).toEqual([]);
    });

    test('clear empties the registry', () => {
      graph({ 'main.som': ['a.som'] });
      registry.clear();
      expect(registry.getAll()).toEqual([]);
      expect(registry.getDependencyGraph().size).toBe(0);
    });
  });

  describe('modules built by hand, without resolved dependency ids', () => {
    test('relative specifiers are matched with the modules registered before', () => {
      for (const file of ['b.som', 'c.js', 'd/index.som', 'e/index.js', 'f.som']) {
        registry.register(module(at(file)));
      }
      registry.register(
        module(at('main.som'), {
          deps: ['./b', './c', './d', './e', './f.som', './nope', at('abs.som'), 'external:fs'],
          resolved: null,
        })
      );
      expect(registry.getDependencyGraph().get(at('main.som'))!.dependencies).toEqual([
        at('b.som'),
        at('c.js'),
        at('d/index.som'),
        at('e/index.js'),
        at('f.som'),
        at('abs.som'),
        'external:fs',
      ]);
      expect(registry.getDependents(at('c.js'))).toEqual([at('main.som')]);
    });

    test('resolved ids are used as they are, also before their modules are registered', () => {
      registry.register(module(at('main.som'), { deps: ['./late'], resolved: [at('late.som')] }));
      expect(registry.getTopologicalSort()).toEqual([at('late.som'), at('main.som')]);
      registry.register(module(at('late.som')));
      expect(registry.getTopologicalSort()).toEqual([at('late.som'), at('main.som')]);
      expect(registry.getDependencyGraph().get(at('main.som'))!.level).toBe(1);
    });
  });
});

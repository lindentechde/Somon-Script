# Module System

SomonScript includes a production-ready module system with resolution, loading,
registration, validation, and bundling.

## Overview

- Resolver: resolves specifiers to absolute file paths (`.som`, `.js`, `.json`,
  directories with `index.*`, and `node_modules`).
- Loader: reads and parses modules, extracts dependencies, caches modules, and
  handles circular references.
- Registry: stores module metadata and provides a resolved dependency graph,
  topological ordering, statistics, and cycle detection.
- System: high-level API to load/compile/bundle/validate modules.

## Resolver

```ts
import { ModuleResolver } from '@lindentech/somon-script';
const resolver = new ModuleResolver({
  baseUrl: process.cwd(),
  extensions: ['.som', '.js', '.json'],
});
const { resolvedPath, extension } = resolver.resolve(
  './utils',
  '/path/to/main.som'
);
```

Notes:

- `fromFile` may be a file path or a directory path; the resolver infers the
  proper base.
- Supports path mapping (`paths`) and `node_modules` with `package.json#main`.

## Loader

```ts
import { ModuleLoader } from '@lindentech/somon-script';
const loader = new ModuleLoader(resolver, {
  circularDependencyStrategy: 'warn',
});
const mod = loader.loadSync('./main.som', '/project/src');
```

Behavior:

- Parses `.som` files and extracts `ImportDeclaration` dependencies.
- Caches in-memory; re-entrant loads warn/error/ignore on cycles per
  configuration.
- Parser errors throw with context; partially loaded modules are exposed via
  cache.

## Registry

```ts
import { ModuleRegistry } from '@lindentech/somon-script';
const registry = new ModuleRegistry();
registry.register(mod);
const order = registry.getTopologicalSort();
const cycles = registry.findCircularDependencies();
const stats = registry.getStatistics();
```

Behavior:

- Keeps original specifiers in metadata for UX, but resolves to absolute IDs for
  graph traversal.
- Provides dependents, entry points, dead-code candidates, and dependency trees.

## System (High-Level API)

```ts
import { ModuleSystem } from '@lindentech/somon-script';
const ms = new ModuleSystem({ resolution: { baseUrl: '/project/src' } });
await ms.loadModule('./app', '/project/src');
const validation = ms.validate(); // checks cycles and missing deps
const bundle = await ms.bundle({
  entryPoint: '/project/src/main.som',
  format: 'commonjs',
});
```

Compilation:

- `compile(entry)` loads dependencies, registers modules, topologically orders
  them, and codegens to JS per module.

Bundling:

- CommonJS: produces a self-contained module map + simple loader, then executes
  the entry.
- ESM/UMD: experimental (concatenated output, not a full linker); prefer
  `commonjs` for execution.
- Internal require rewrite maps `require("./x")` or compiled `require("./x.js")`
  to the correct module map entry (`.js` is mapped back to `.som` internally
  when needed).

## Dynamic Imports

SomonScript `ворид("./x")` compiles to `import("./x.js")` for runtime. The
bundler targets static imports; dynamic imports remain external to the bundle.

## Externals

Use `externals` in `bundle()` to leave certain specifiers as external requires.

```ts
const bundle = await ms.bundle({
  entryPoint,
  externals: ['fs', 'path'],
  format: 'commonjs',
});
```

## Validation

`validate()` returns `{ isValid, errors }` where errors include cycles and
missing dependencies detected via resolution from each registered module.

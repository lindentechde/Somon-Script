# Module System

SomonScript includes a module system with resolution, loading, registration,
validation and CommonJS bundling.

## Overview

- Resolver: resolves specifiers to absolute file paths (`.som`, `.js`, `.json`,
  directories with `index.*`, and `node_modules`).
- Loader: reads and parses modules, extracts dependencies, caches modules, and
  handles circular references according to `circularDependencyStrategy`.
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
- A relative `fromFile` is resolved against the current working directory.
- Supports path mapping (`paths`) and `node_modules` packages. For packages,
  `package.json#exports` is used when present, like Node's `require()`: a
  string, `"."` and subpath keys (including `"./dir/*"` patterns) and the
  `require`, `node` and `default` conditions. A subpath that is not exported is
  an error. Without `exports`, `main` and then `index.*` are used.

Containment policy:

- Relative imports (`./`, `../`, any depth) and OS-absolute paths (`/home/…`,
  `/tmp/…`, `C:\…`, or anything inside `baseUrl`) are allowed and not confined —
  SomonScript sources are trusted code.
- Project-relative absolute imports (`/lib/utils`) resolve against `baseUrl` and
  must stay inside it; `paths` mappings and a package's `main`/`exports` targets
  must stay inside `baseUrl` / the package directory. These checks follow
  symlinks.
- Bare specifiers (`pkg/sub`) must not contain `..` segments.

## Loader

```ts
import { ModuleLoader } from '@lindentech/somon-script';
const loader = new ModuleLoader(resolver, {
  circularDependencyStrategy: 'warn',
});
const mod = loader.loadSync('./main.som', '/project/src');
```

Behavior:

- Parses `.som` files and extracts dependencies from imports and re-exports.
  Local `.js` files contribute their static relative `require('./x')` calls;
  `.json` files are validated.
- `module.dependencies` holds the specifiers as written,
  `module.resolvedDependencies` the module ids they resolved to.
- Caches in-memory. A cache hit is re-validated against the file's mtime and
  size (and those of its dependencies); `invalidate(path)` evicts a module and
  everything that imports it. `maxCacheSize`/`maxCacheMemory` are enforced
  between loads and never evict a module that the load just completed needs.
- Re-entrant loads warn/error/ignore on cycles per configuration.
- Failures throw a `ModuleLoadError` with `filePath` (the broken file, or the
  importer whose specifier failed), `line`/`column`, `importer` and `specifier`.
  Invalid specifiers (empty, longer than 500 characters, containing a backslash)
  are errors.

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

- Keeps original specifiers in metadata for UX; the graph uses the module ids
  the loader resolved.
- `getTopologicalSort()` orders dependencies first and skips the back edges of
  cycles; `findCircularDependencies()` reports them.
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
- Errors are returned in `errors` (and not logged): each has the `filePath` it
  is in, `line`/`column`, and for loading errors the `importer` and `specifier`.
- Circular dependencies follow `loading.circularDependencyStrategy`: `'warn'`
  (default) compiles and adds one warning, `'ignore'` compiles silently,
  `'error'` fails. Cyclic modules behave like CommonJS cycles at runtime: a
  namespace import (`ворид * чун М аз …`) sees bindings once the other module
  has finished, a named import taken during the cycle may be `undefined`.
- `invalidate(path)` drops a changed file and its dependents from the caches;
  `watch()` does this automatically for every change (new files clear the whole
  cache, since they can change how specifiers resolve).

Bundling:

- CommonJS: produces a self-contained module map + simple loader, then executes
  the entry (currently the only supported bundle target).
- Local `.js` dependencies are included verbatim (their relative requires are
  rewritten too) and `.json` dependencies as `module.exports = <json>`. Packages
  from `node_modules` and `externals` stay `require()` calls resolved by the
  host at runtime, relative to the bundle file.
- Internal require rewrite maps `require("./x")` or compiled `require("./x.js")`
  to the correct module map entry (`.js` is mapped back to `.som` internally
  when needed).
- Source maps emitted from bundles use module IDs relative to the entry
  directory so build paths remain private. Opt in to embedding original
  SomonScript text by setting `inlineSources: true` (or `--inline-sources` in
  the CLI) when generating bundles.

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

## Graceful Shutdown

`shutdown()` stops all watchers created with `watch()`:

```ts
process.on('SIGTERM', async () => {
  await ms.shutdown();
  process.exit(0);
});
```

## Timeout helpers

`withTimeout`, `createTimeoutWrapper` and `allWithTimeout` (exported from the
package) stop _waiting_ for a promise after a deadline and reject with a
`TimeoutError`. They cannot cancel the underlying work: a timed-out operation
keeps running, and synchronous (blocking) work cannot be interrupted at all
because the timer only fires once the event loop is free. `allWithTimeout`
rejects with `AggregateTimeoutError` only when every failure was a timeout;
otherwise it rejects with a standard `AggregateError` holding the original
errors.

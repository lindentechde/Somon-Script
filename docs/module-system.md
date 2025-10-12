# Module System

SomonScript includes a production-ready module system with resolution, loading,
registration, validation, bundling, and comprehensive production features for
enterprise deployments.

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
  the entry (currently the only supported bundle target).
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

## Production Features

The module system includes enterprise-grade production capabilities:

### Circuit Breakers

Automatic fault isolation protects against cascading failures:

```ts
const ms = new ModuleSystem({
  circuitBreakers: true,
  circuitBreakerOptions: {
    failureThreshold: 5,
    recoveryTimeout: 30000,
    halfOpenMaxAttempts: 3,
  },
});
```

### Resource Management

Prevent resource exhaustion with configurable limits:

```ts
const ms = new ModuleSystem({
  resourceLimits: {
    maxMemory: 512, // MB
    maxModules: 1000,
    maxCacheSize: 100, // MB
    compilationTimeout: 5000, // ms
  },
});
```

### Operational Visibility

Built-in management server with health checks and metrics:

```bash
# Start management server
somon serve --port 8080

# Access endpoints
curl http://localhost:8080/health   # Health status
curl http://localhost:8080/metrics  # Prometheus metrics
curl http://localhost:8080/ready    # Readiness probe
curl http://localhost:8080/config   # Runtime configuration
```

### Prometheus Metrics

Export module system metrics in Prometheus format:

- `somon_script_modules_loaded` - Number of loaded modules
- `somon_script_compilation_time_seconds` - Compilation duration
- `somon_script_cache_hits_total` - Cache hit count
- `somon_script_cache_misses_total` - Cache miss count
- `somon_script_errors_total` - Error count by type
- `somon_script_circuit_breaker_state` - Circuit breaker states

### Structured Logging

Production-ready logging with JSON format:

```ts
const ms = new ModuleSystem({
  logger: true,
  logLevel: 'info', // debug, info, warn, error
});
```

### Graceful Shutdown

Proper cleanup and connection draining:

```ts
// Handle shutdown signals
process.on('SIGTERM', async () => {
  await ms.shutdown();
  process.exit(0);
});
```

### Production Mode

Enable all production features with a single flag:

```bash
# CLI production mode
somon compile app.som --production
NODE_ENV=production somon run app.som

# Programmatic API
const ms = new ModuleSystem({
  production: true // Enables metrics, circuit breakers, logging, etc.
});
```

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Project Overview

SomonScript is a production-grade compiler that transpiles Tajik Cyrillic syntax
to JavaScript. It's a feature-complete programming language with a sophisticated
type system, module system, and bundling capabilities.

## Commands

### Build & Development

```bash
npm run build          # TypeScript compilation (required before running)
npm run dev            # Watch mode for development (npm run build:watch)
npm test               # Run full Jest test suite (326+ tests)
npm run lint           # ESLint validation
npm run lint:fix       # Auto-fix linting issues
npm run format         # Format code with Prettier
npm run type-check     # TypeScript type checking without emitting
```

### Testing

```bash
npm test                      # Full test suite via jest-wrapper.sh
npm run test:unit             # Lexer, parser, compiler, type-checker tests
npm run test:integration      # Integration and CLI tests
npm run test:coverage         # Generate coverage report
npm run test:ci               # CI-optimized test run
npm run audit:examples        # Validate all 32+ .som example programs
```

### CLI Usage

```bash
somon compile app.som                    # Compile to JavaScript
somon run app.som                        # Compile and execute
somon bundle src/main.som -o dist/app.js # Bundle modules
somon module-info src/main.som --graph   # Analyze dependencies
```

## Architecture

### Compilation Pipeline (4-Phase Architecture)

The compiler follows a traditional pipeline where each phase depends on the
previous one:

1. **Lexer** (`src/lexer.ts`) → Tokenizes Tajik Cyrillic keywords via
   `src/keyword-map.ts`
2. **Parser** (`src/parser.ts`) → Builds AST from tokens
3. **Type Checker** (`src/type-checker.ts`) → Static analysis with advanced type
   system
4. **Code Generator** (`src/codegen.ts`) → Emits JavaScript with source maps

**Entry Point**: `src/compiler.ts` exports the main `compile()` function that
orchestrates the entire pipeline and is used by both the CLI and programmatic
API.

### Keyword Mapping

`src/keyword-map.ts` contains the Tajik → JavaScript keyword mapping:

- `тағйирёбанда` → `let` (variable)
- `функсия` → `function`
- `агар` → `if`
- `чоп.сабт` → `console.log`
- 90+ total mappings

### Module System (`src/module-system/`)

The module system is a critical component for handling multi-file SomonScript
projects:

- **ModuleResolver** (`module-resolver.ts`) - Resolves specifiers to absolute
  file paths
  - Handles `.som` → `.js` path mapping
  - Supports `node_modules` lookup and `package.json` main field
  - Implements path mapping and extension resolution

- **ModuleLoader** (`module-loader.ts`) - Loads and caches parsed modules
  - Extracts dependencies from AST `ImportDeclaration` nodes
  - Detects circular dependencies (configurable: warn/error/ignore)
  - In-memory module cache for performance

- **ModuleRegistry** (`module-registry.ts`) - Dependency graph management
  - Topological sorting for compilation order
  - Circular dependency detection
  - Provides statistics and dependency trees

- **ModuleSystem** (`module-system.ts`) - High-level API
  - Orchestrates loading, compilation, bundling, and validation
  - Main integration point for CLI bundling commands

**Critical Pattern**: The bundler rewrites `require("./x.js")` back to `.som`
modules internally, enabling seamless interop between compiled output and source
modules.

### Configuration System

**File**: `somon.config.json` (auto-discovered up the directory tree)

```json
{
  "compilerOptions": { "target": "es2020", "sourceMap": true },
  "moduleSystem": {
    "resolution": { "baseUrl": ".", "extensions": [".som", ".js"] },
    "loading": { "circularDependencyStrategy": "warn" }
  },
  "bundle": { "format": "commonjs", "minify": false }
}
```

### CLI Architecture (`src/cli/program.ts`)

- Uses Commander.js for subcommands: `compile`, `run`, `bundle`, `init`
- **Critical**: Runtime TypeScript loading for development via `loadCompiler()`
  function
- Falls back to source files if `dist/` is missing
- Module system integration for bundling with externals support

### Type System Features

The type checker supports advanced TypeScript-level features:

- Union types: `сатр | рақам`
- Intersection types: `Корбар & Админ`
- Tuple types: `[рақам, рақам, сатр]`
- Interface inheritance via `мерос_мебарад`
- Generic type parameters
- Type inference

## Development Patterns

### Error Handling Convention

Compiler functions consistently return:

```typescript
{ code: string, errors: string[], warnings: string[] }
```

- **Never throw during compilation** - collect errors and continue
- Use `CompileResult` interface consistently
- Type checker returns structured diagnostics with line/column info

### Module Resolution Logic

The resolver tries multiple strategies in order:

1. Exact file match with `.som` extension
2. Directory with `index.som`
3. `node_modules` with `package.json` main field
4. **Bundler special case**: Maps `.js` imports back to `.som` sources

### Bundle Output

- **CommonJS** (recommended): Self-contained module map with loader
- Source maps use module IDs relative to entry directory (keeps build paths
  private)
- Use `--inline-sources` to embed original SomonScript text in `.map` file

## Code Quality Standards

- **Complexity limit**: 15 (enforced by ESLint)
- **Coverage thresholds**: 55% branches, 75% functions, 68% lines
- **Test categories**: Unit, integration, performance, cross-platform
- **Conventional Commits**: Required for semantic-release automation (`feat:`,
  `fix:`, `docs:`)
- **Performance**: All examples must compile in <1000ms (enforced in CI)

## Testing

### Test Organization

- **Unit tests**: `tests/` directory, organized by compiler component
- **Integration tests**: Full compilation pipeline testing
- **Example auditing**: `scripts/audit-examples.js` validates real-world usage
- **Custom matchers**: `tests/setup.ts` provides `toCompileSuccessfully()`,
  `toHaveTypeError()`

### Node.js Compatibility

- **Supported versions**: 20.x, 22.x, 23.x, 24.x (defined in `package.json`
  engines)
- **Jest config**: Node 23+ specific settings in `jest.config.js`
- **Cross-platform**: Clean script uses Node.js `fs.rmSync()` instead of shell
  commands

## Common Debugging Commands

```bash
# Module dependency analysis
somon module-info src/main.som --graph --circular

# Compilation benchmarks
npm run benchmark

# Example validation with detailed output
npm run audit:examples

# Run specific test suites
npm run test:unit
npm run test:integration
```

## Important Notes

- The bundler currently only supports CommonJS output format (ESM/UMD are
  experimental)
- Dynamic imports (`ворид("./x")`) remain external to bundles
- Parser errors are collected but don't throw - partially loaded modules are
  exposed via cache
- Module system warns about circular dependencies but continues compilation by
  default

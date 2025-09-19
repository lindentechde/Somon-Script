# SomonScript AI Coding Agent Instructions

## Project Overview

SomonScript is a production-grade compiler that transpiles Tajik Cyrillic syntax
to JavaScript. It's a complete programming language implementation with a
sophisticated module system, type checker, and bundling capabilities.

## Core Architecture (Essential Understanding)

### Compilation Pipeline

The compiler follows a traditional 4-phase architecture:

1. **Lexer** (`src/lexer.ts`) - Tokenizes Tajik Cyrillic keywords via
   `keyword-map.ts`
2. **Parser** (`src/parser.ts`) - Builds AST from tokens
3. **Type Checker** (`src/type-checker.ts`) - Static analysis with advanced type
   system
4. **Code Generator** (`src/codegen.ts`) - Emits JavaScript with source maps

**Key Entry Point**: `src/compiler.ts` exports the main `compile()` function
that orchestrates the entire pipeline.

### Tajik-to-JavaScript Mapping

- `тағйирёбанда` → `let` (variable)
- `функсия` → `function`
- `агар` → `if`
- `чоп.сабт` → `console.log`
- **Complete mapping**: See `src/keyword-map.ts` (90+ Tajik keywords)

### Module System Architecture

**Location**: `src/module-system/`

- **ModuleResolver**: Handles `.som` → `.js` path resolution and `node_modules`
  lookup
- **ModuleLoader**: Caches parsed modules, detects circular dependencies
- **ModuleRegistry**: Dependency graph with topological sorting
- **ModuleSystem**: High-level API for compilation and bundling

**Critical Pattern**: The bundler rewrites `require("./x.js")` back to `.som`
modules internally, enabling seamless interop.

## Development Workflow Essentials

### Build & Test Commands

```bash
npm run build          # TypeScript compilation
npm test              # Full Jest test suite (326+ tests, 98% coverage)
npm run audit:examples # Validates all 32+ .som examples compile correctly
npm run lint          # ESLint with custom rules (complexity < 15)
npm run examples      # Runs and validates example programs
```

### Testing Strategy

- **Unit tests**: `tests/` directory, organized by compiler component
- **Integration tests**: Full compilation pipeline testing
- **Example auditing**: `scripts/audit-examples.js` validates real-world usage
- **Custom matchers**: `tests/setup.ts` has `toCompileSuccessfully()`,
  `toHaveTypeError()`

**Performance requirement**: All examples must compile in <1000ms (enforced in
CI)

### Configuration System

**File**: `somon.config.json` (auto-discovered up directory tree)

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

## Project-Specific Patterns

### Error Handling Convention

- Compiler functions return
  `{ code: string, errors: string[], warnings: string[] }`
- Never throw during compilation - collect errors and continue
- Use `CompileResult` interface consistently

### CLI Architecture

**Location**: `src/cli/program.ts`

- Uses Commander.js with `somon compile|run|bundle|init` subcommands
- **Critical**: Runtime TypeScript loading for development (`loadCompiler()`
  function)
- Module system integration for bundling with externals support

### Cross-Platform Compatibility

- **Node.js versions**: 20.x or 22.x (defined in engines)
- **Clean script**: Uses Node.js `fs.rmSync()` instead of shell commands
- **Jest wrapper**: `jest-wrapper.sh` handles file watching issues

### Code Quality Standards

- **Complexity limit**: 15 (enforced by ESLint)
- **Coverage thresholds**: 55% branches, 75% functions, 68% lines
- **Test categories**: Unit, integration, performance, cross-platform
- **Conventional Commits**: Required for semantic-release automation

## Key Integration Points

### Module Resolution Logic

When resolving imports, the system tries multiple strategies:

1. Exact file match with `.som` extension
2. Directory with `index.som`
3. `node_modules` with `package.json` main field
4. **Bundler special case**: Maps `.js` imports back to `.som` sources

### Type System Features

- Union types: `сатр | рақам`
- Intersection types: `Корбар & Админ`
- Tuple types: `[рақам, рақам, сатр]`
- Interface inheritance with `мерос_мебарад`
- Generic type parameters

### Bundle Output Formats

- **CommonJS** (recommended): Self-contained module map with loader
- **ESM/UMD** (experimental): Concatenated output, prefer CommonJS for execution

## Example Patterns

### Typical Module Structure

```som
// Export functions
содир функсия ҳисоб_кардан(а: рақам, б: рақам): рақам {
    бозгашт а + б;
}

// Import from other modules
ворид { формат } аз "./string-utils";
ворид пешфарз_функсия аз "./main";
```

### Class with Inheritance

```som
синф Ҳайвон {
    хосусӣ ном: сатр;
    ҷамъиятӣ овоз_додан(): сатр { бозгашт "садо"; }
}

синф Саг мерос_мебарад Ҳайвон {
    ҷамъиятӣ овоз_додан(): сатр { бозгашт "вақ-вақ"; }
}
```

## Debug & Troubleshooting

### Common Issues

1. **"Module not found"**: Check file extensions in `somon.config.json`
   resolution
2. **Circular dependencies**: Module system warns but continues compilation
3. **TypeScript loading**: CLI falls back to source files if dist/ missing

### Diagnostic Commands

```bash
# Module dependency analysis
somon module-info src/main.som --graph --circular

# Compilation benchmarks
npm run benchmark

# Example validation with detailed output
npm run audit:examples
```

## When Contributing

1. **Always run the full test suite**:
   `npm run lint && npm test && npm run audit:examples`
2. **Use semantic commits**: `feat:`, `fix:`, `docs:` for automated releases
3. **Maintain example compatibility**: All `.som` files in `examples/` must
   compile
4. **Performance testing**: New features should not regress compilation speed
5. **Cross-platform**: Test on Node.js 20.x and 22.x

This is a sophisticated compiler project with production-grade architecture.
Focus on the module system integration and Tajik keyword mapping when making
changes.

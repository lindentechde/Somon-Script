# CLI Commands

Complete reference for the SomonScript command-line interface.

## Global Command: `somon`

The main entry point for all SomonScript operations.

```bash
somon <command> [options]
```

## Commands

### `compile`

Compile SomonScript files to JavaScript.

```bash
somon compile <input.som> [options]
```

**Arguments:**

- `<input.som>` - The SomonScript file to compile (required)

**Options:**

- `-o, --output <file>` - Output file (default: same name with .js extension)
- `--strict` - Enable strict type checking
- `--target <target>` - Compilation target: `es5`, `es2015`, `es2020`, `esnext`
- `--source-map` - Generate source maps for debugging
- `--minify` - Minify the output JavaScript
- `--no-type-check` - Disable type checking

**Examples:**

```bash
# Basic compilation
somon compile hello.som

# Compile with strict type checking
somon compile app.som --strict

# Custom output file
somon compile src/main.som -o dist/app.js

# Production build with minification
somon compile app.som --minify --target es2020

# Generate source maps for debugging
somon compile app.som --source-map
```

**Status:**

- ✅ Basic compilation (fully functional)
- ✅ Type checking with `--strict` (fully functional)
- ✅ Custom output with `-o` (fully functional)
- ⚠️ Source maps (parsed, implementation planned)
- ⚠️ Minification (parsed, implementation planned)
- ⚠️ Target specification (parsed, implementation planned)

### `run`

Compile and run SomonScript files directly.

```bash
somon run <input.som>
```

**Arguments:**

- `<input.som>` - The SomonScript file to run (required)

**Examples:**

```bash
# Run a SomonScript file
somon run hello.som

# Run with error output
somon run my-app.som 2> errors.log
```

This command:

1. Compiles the `.som` file to JavaScript
2. Executes the resulting JavaScript with Node.js
3. Cleans up temporary files

### `init`

Initialize a new SomonScript project.

```bash
somon init [project-name]
```

**Arguments:**

- `[project-name]` - Name of the project directory (optional, default:
  "somon-project")

**Examples:**

```bash
# Create project with default name
somon init

# Create project with custom name
somon init my-awesome-app

# Create project in current directory
somon init .
```

**Generated Files:**

- `src/main.som` - Main source file with hello world example
- `package.json` - npm package configuration
- `tsconfig.json` - TypeScript configuration for JavaScript output
- `.gitignore` - Git ignore file with common patterns

## Global Options

These options work with any command:

- `--version` - Show version information
- `--help` - Show help information
- `--verbose` - Enable verbose output
- `--quiet` - Suppress non-essential output

**Examples:**

```bash
# Show version
somon --version

# Get help for a specific command
somon compile --help

# Verbose compilation
somon compile app.som --verbose
```

## Exit Codes

The SomonScript CLI uses standard exit codes:

- `0` - Success
- `1` - Compilation error
- `2` - Runtime error
- `3` - Invalid arguments
- `4` - File not found
- `5` - Permission error

## Configuration Files

### Project Configuration

You can create a `somon.config.json` file in your project root:

```json
{
  "compilerOptions": {
    "strict": true,
    "target": "es2020",
    "sourceMap": true,
    "outDir": "dist"
  },
  "include": ["src/**/*.som"],
  "exclude": ["node_modules", "dist"]
}
```

### Global Configuration

Global settings are stored in `~/.somon/config.json`:

```json
{
  "defaultTarget": "es2020",
  "enableSourceMaps": false,
  "verboseOutput": false
}
```

## Environment Variables

- `SOMON_HOME` - Override default configuration directory
- `SOMON_TARGET` - Default compilation target
- `NODE_ENV` - Affects compilation optimizations

## Examples by Use Case

### Development Workflow

```bash
# Initialize project
somon init my-app
cd my-app

# Develop with immediate feedback
somon run src/main.som

# Type check without running
somon compile src/main.som --strict --no-output
```

### Production Build

```bash
# Compile for production
somon compile src/main.som -o dist/app.js --minify --target es2020

# Build entire project
for file in src/*.som; do
  somon compile "$file" -o "dist/$(basename "$file" .som).js" --minify
done
```

### Debugging

```bash
# Compile with source maps
somon compile src/main.som --source-map

# Run with Node.js debugging
somon compile src/main.som && node --inspect dist/main.js
```

## Tips and Best Practices

1. **Use `--strict`** for better type safety during development
2. **Create a build script** in `package.json` for complex compilation
3. **Use `.gitignore`** to exclude compiled files from version control
4. **Set up file watching** with tools like `nodemon` for automatic
   recompilation

## Troubleshooting

### Common Error Messages

**"File not found: example.som"**

- Check that the file path is correct
- Ensure the file has the `.som` extension

**"Compilation failed with type errors"**

- Use `--no-type-check` to disable type checking temporarily
- Fix type errors shown in the output

**"Permission denied"**

- Check file permissions
- Use `sudo` if necessary (not recommended for global installs)

### Getting Help

- Use `somon --help` for general help
- Use `somon <command> --help` for command-specific help
- Check [troubleshooting guide](../how-to/handle-compilation-errors.md)
- [Report issues](https://github.com/Slashmsu/somoni-script/issues)

---

**Need practical examples?** → [How-to Guides](../how-to/)

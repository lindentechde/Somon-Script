# Using SomonScript in Builds and CI

SomonScript is a compiler. It has no server or long-running process to deploy:
you compile `.som` sources to JavaScript (with the `somon` CLI or the library
API) and deploy the generated JavaScript like any other Node.js code.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Project Configuration](#project-configuration)
- [Command-Line Usage](#command-line-usage)
- [Library Usage](#library-usage)
- [Continuous Integration](#continuous-integration)
- [Shipping the Output](#shipping-the-output)

## Prerequisites

- Node.js 20.x, 22.x, 23.x or 24.x
- npm (or another Node.js package manager)

## Installation

As a development dependency of a project (recommended, so CI uses the same
compiler version as you do):

```bash
npm install --save-dev @lindentech/somon-script
npx somon --version
```

Globally:

```bash
npm install -g @lindentech/somon-script
```

From source:

```bash
git clone https://github.com/lindentechde/Somon-Script.git
cd Somon-Script
npm ci
npm run build
npm link
```

## Project Configuration

`somon init my-project` scaffolds a project with a `somon.config.json`. The CLI
looks for this file in the input file's directory and its parents:

```json
{
  "compilerOptions": {
    "target": "es2020",
    "sourceMap": false,
    "minify": false,
    "noTypeCheck": false,
    "strict": true,
    "outDir": "dist"
  },
  "bundle": {
    "format": "commonjs",
    "minify": true,
    "sourceMaps": false
  }
}
```

Command-line flags override values from the config file.

## Command-Line Usage

```bash
# Compile one file (writes app.js next to app.som unless -o/--out-dir is given)
somon compile src/app.som -o dist/app.js

# Fail on type errors instead of emitting code
somon compile src/app.som -o dist/app.js --strict

# Bundle an entry point and its imports into a single CommonJS file
somon bundle src/main.som -o dist/bundle.js --minify

# Compile and execute directly (development use)
somon run src/main.som

# Inspect module dependencies / resolve a specifier
somon module-info src/main.som --graph
somon resolve ./utils --from src/main.som
```

Run `somon <command> --help` for the full option list. The CLI exits with a
non-zero status when compilation fails, so it can gate CI jobs directly.

The `--production` flag is deprecated and has no effect; it is still accepted so
existing scripts keep working.

## Library Usage

```js
const { compile } = require('@lindentech/somon-script');

const result = compile('чоп.сабт("Салом, ҷаҳон!");', {
  target: 'es2020',
  sourceMap: false,
  strict: true,
});

if (result.errors.length > 0) {
  console.error(result.errors.join('\n'));
  process.exit(1);
}
console.log(result.code); // console.log("Салом, ҷаҳон!");
```

`compile()` returns `{ code, sourceMap?, errors, warnings }`. Parse errors
always produce empty `code`; with `strict: true` type errors do too.

## Continuous Integration

Example GitHub Actions job that compiles a SomonScript project with the compiler
pinned in `package.json`:

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20.x'
          cache: 'npm'
      - run: npm ci
      - run: npx somon compile src/main.som -o dist/main.js --strict
      - run: npx somon bundle src/main.som -o dist/bundle.js
      - run: node dist/bundle.js
```

## Shipping the Output

The compiled JavaScript has no runtime dependency on SomonScript. Deploy the
files in `dist/` with whatever you already use for Node.js applications
(container image, systemd service, serverless function, …), for example:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY dist/ ./dist/
USER node
CMD ["node", "dist/bundle.js"]
```

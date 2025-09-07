# Node.js 23.x Compatibility Issues

## Problem

Tests hang when running on Node.js 23.x due to breaking changes in the new
`require(esm)` feature that was enabled by default.

## Root Cause

Node.js 23.x introduced `require(esm)` by default, which causes compatibility
issues with:

- Jest test runner
- ts-jest TypeScript transformer
- Module loading behavior

## Solution

Use the provided compatibility wrapper that automatically detects Node.js
version and applies appropriate flags.

### Files Created:

1. `jest-wrapper.sh` - Shell script that sets NODE_OPTIONS for Node.js 23+
2. `run-tests.js` - Node.js script alternative (if shell scripts not preferred)
3. Updated `package.json` scripts to use the wrapper

### Node.js Flags Applied for 23.x:

- `--no-experimental-require-module` - Disables the problematic require(esm)
  feature
- `--no-experimental-detect-module` - Disables automatic module detection
- `--no-warnings` - Suppresses experimental feature warnings

## Usage

```bash
# Tests will automatically use compatibility flags on Node.js 23+
npm test
npm run test:coverage

# Manual execution with flags (if needed)
NODE_OPTIONS="--no-experimental-require-module --no-experimental-detect-module" npx jest
```

## Verification

The solution works on:

- ✅ Node.js 18.x, 20.x, 21.x, 22.x, 24.x (no flags needed)
- ✅ Node.js 23.x (with compatibility flags)

## Alternative Solutions Attempted

1. ❌ Updating Jest/ts-jest versions - Still incompatible
2. ❌ Babel transpilation - User requested no Babel
3. ❌ Modified Jest configuration - Core issue persists
4. ❌ Direct Node.js flag usage - Environment variable approach needed

## Future

Monitor Jest and ts-jest releases for native Node.js 23.x support to remove the
need for compatibility flags.

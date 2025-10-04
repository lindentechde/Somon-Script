# Fail-Fast Configuration Validation Implementation

**Date:** 2025-10-02  
**Status:** ✅ Complete  
**AGENTS.md Principle:** "Fail fast, fail clearly"

## Summary

Implemented fail-fast configuration validation for production readiness
following AGENTS.md principles. The system now validates environment
requirements upfront and fails immediately with clear error messages.

## Implementation Details

### 1. Core Validation Functions

**Location:** `src/cli/program.ts`

#### `canWrite(outputPath: string): boolean`

- Checks if a directory is writable by creating a test file
- Creates parent directories if they don't exist
- Returns `false` on permission errors instead of throwing

#### `validateProductionEnvironment(outputPath: string): void`

- Validates Node.js version (20.x or 22.x only)
- Validates write permissions for output path
- Throws immediately on any validation failure with clear error messages

### 2. CLI Integration

**Commands Updated:**

- `compile` - Added `--production` flag
- `run` - Added `--production` flag
- `bundle` - Added `--production` flag

**Trigger Conditions:**

- `--production` flag is explicitly set
- `NODE_ENV=production` environment variable

**Behavior:**

```bash
# Validates before compilation
somon compile app.som --production

# Also triggered by environment variable
NODE_ENV=production somon compile app.som

# Works with all output options
somon compile app.som -o dist/app.js --production
somon bundle app.som --production
somon run app.som --production
```

### 3. Error Reporting

Following "fail fast, fail clearly" principle:

```
Production validation failed: Node.js 20.x or 22.x required, got 24.9.0
```

```
Production validation failed: No write permission: /root/output.js
```

- Errors are reported immediately before any processing
- Exit code 1 on validation failure
- Clear, actionable error messages
- No partial execution or silent failures

### 4. Test Coverage

**Location:** `tests/production-validation.test.ts`

**Test Categories:**

1. **Node.js Version Validation**
   - Validates correct versions (20.x, 22.x)
   - Rejects invalid versions with clear errors

2. **Write Permission Validation**
   - Tests writable directories
   - Tests read-only directories
   - Tests directory creation

3. **Production Flag Integration**
   - Verifies `--production` flag in all commands
   - Tests flag appears in help output

4. **NODE_ENV Environment Variable**
   - Validates when `NODE_ENV=production`
   - Skips validation in development mode

5. **Fail-Fast Error Reporting**
   - Validates clear error messages
   - Ensures immediate exit on failure
   - Verifies no partial execution

## Production Readiness Impact

### Before

- ❌ No environment validation
- ❌ Failures could occur deep in compilation
- ❌ Unclear error messages
- ❌ No production mode flag

### After

- ✅ Upfront environment validation
- ✅ Fail-fast before any processing
- ✅ Clear, actionable error messages
- ✅ Explicit `--production` flag
- ✅ `NODE_ENV` support
- ✅ Comprehensive test coverage

## Files Modified

1. **src/cli/program.ts**
   - Added `canWrite()` helper function
   - Added `validateProductionEnvironment()` function
   - Integrated validation into compile, run, and bundle commands
   - Added `--production` flag to all commands

2. **tests/production-validation.test.ts**
   - Created comprehensive test suite
   - 13 tests covering all validation scenarios
   - Tests for Node version, permissions, flags, environment variables

3. **TODO.md**
   - Marked "Add fail-fast configuration validation" as complete
   - Marked "Production mode enforcement" as complete
   - Updated with implementation locations

## Usage Examples

### Valid Production Compilation

```bash
# On Node.js 20 or 22, with valid permissions
somon compile app.som --production
# ✅ Validates environment
# ✅ Compiles successfully
```

### Invalid Node Version

```bash
# On Node.js 18 or 24
somon compile app.som --production
# ❌ Production validation failed: Node.js 20.x or 22.x required, got 24.9.0
# Exit code: 1
```

### Invalid Permissions

```bash
somon compile app.som -o /root/app.js --production
# ❌ Production validation failed: No write permission: /root/app.js
# Exit code: 1
```

### Development Mode (No Validation)

```bash
# Without --production flag, validation is skipped
somon compile app.som
# ✅ Compiles without validation checks
```

## Architecture Consistency

This implementation follows AGENTS.md architectural patterns:

1. **Fail-Fast Validation**
   - ✅ Validates upfront, not during processing
   - ✅ Throws immediately with clear errors
   - ✅ No silent failures or partial execution

2. **Clear Error Messages**
   - ✅ Includes expected vs actual values
   - ✅ Actionable messages
   - ✅ Consistent error format

3. **Production Readiness**
   - ✅ Explicit production mode flag
   - ✅ Environment variable support
   - ✅ Comprehensive validation

4. **Testing**
   - ✅ Tests failure modes, not just happy paths
   - ✅ Cross-platform considerations
   - ✅ Clear test names and assertions

## Next Steps

This completes Phase 1 of production readiness. Remaining critical tasks:

1. **Error Aggregation** - Collect ALL compilation errors before reporting
2. **Health Endpoints** - `/health`, `/ready`, `/metrics` endpoints
3. **Resource Management** - Remove `process.cwd()` dependencies
4. **Graceful Shutdown** - Proper SIGTERM/SIGINT handling

## References

- **AGENTS.md** - Guidelines for production readiness
- **PRODUCTION-READINESS.md** - Production readiness checklist
- **TODO.md** - Remaining implementation tasks

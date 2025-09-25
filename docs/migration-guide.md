# SomonScript Migration Guide

This guide helps you upgrade between SomonScript releases, covering breaking
changes, new features, and best practices for maintaining your codebase.

## Current Version: 0.2.57

## Table of Contents

1. [Versioning Policy](#versioning-policy)
2. [Migration Strategy](#migration-strategy)
3. [Version History](#version-history)
4. [Breaking Changes](#breaking-changes)
5. [Upgrade Tools](#upgrade-tools)
6. [Common Issues](#common-issues)

## Versioning Policy

SomonScript follows [Semantic Versioning (SemVer)](https://semver.org/):

- **Major (X.0.0)**: Breaking changes, architectural updates
- **Minor (0.X.0)**: New features, backward compatible
- **Patch (0.0.X)**: Bug fixes, performance improvements

### Release Channels

- **Stable**: Recommended for production use
- **Beta**: Preview of upcoming features
  (`npm install @lindentech/somon-script@beta`)
- **Alpha**: Early development builds
  (`npm install @lindentech/somon-script@alpha`)

## Migration Strategy

### Before Upgrading

1. **Backup Your Project**

   ```bash
   git commit -am "Backup before SomonScript upgrade"
   ```

2. **Review Release Notes**
   - Check [GitHub Releases](https://github.com/Slashmsu/somoni-script/releases)
   - Read breaking changes section
   - Note new features and deprecations

3. **Test Coverage**
   ```bash
   npm test
   npm run audit:examples
   ```

### Upgrade Process

1. **Update Package**

   ```bash
   # For global installation
   npm install -g @lindentech/somon-script@latest

   # For project installation
   npm update @lindentech/somon-script
   ```

2. **Run Migration Tool**

   ```bash
   somon migrate --from 0.2.50 --to 0.2.57
   ```

3. **Compile and Test**

   ```bash
   somon compile src/main.som
   npm test
   ```

4. **Fix Issues**
   - Address compilation errors
   - Update deprecated syntax
   - Test runtime behavior

## Version History

### v0.2.57 (Current) - September 2024

**New Features:**

- ✨ Enhanced module system with better resolution
- ✨ Improved error messages with suggestions
- ✨ Template literal interpolation support
- ✨ Advanced union and intersection types
- ✨ Tuple types with length inference

**Improvements:**

- 🚀 Faster compilation (20% speed improvement)
- 🚀 Better TypeScript interoperability
- 🚀 Enhanced CLI with new commands
- 🚀 Improved source map generation

**Bug Fixes:**

- 🐛 Fixed nested class inheritance
- 🐛 Resolved generic type inference issues
- 🐛 Fixed async/await compilation edge cases

**Migration Notes:**

- No breaking changes from v0.2.50+
- Deprecated `старый_синтакс` removed (use `нав_синтакс`)

---

### v0.2.50 - August 2024

**Breaking Changes:**

- ⚠️ Changed module resolution algorithm
- ⚠️ Removed legacy `импорт` syntax (use `ворид`)
- ⚠️ Updated function declaration syntax

**Migration Required:**

```som
// OLD (v0.2.40)
импорт { функция } из "./модуль";
функция тест() тип рақам {
  возврат 42;
}

// NEW (v0.2.50+)
ворид { функция } аз "./модуль";
функсия тест(): рақам {
  бозгашт 42;
}
```

**New Features:**

- ✨ Generic types support
- ✨ Interface inheritance
- ✨ Conditional types

---

### v0.2.40 - July 2024

**New Features:**

- ✨ Class inheritance with `мерос_мебарад`
- ✨ Access modifiers (`хосусӣ`, `ҷамъиятӣ`)
- ✨ Constructor functions

**Improvements:**

- 🚀 Better error recovery in parser
- 🚀 Improved type inference

---

### v0.2.30 - June 2024

**Breaking Changes:**

- ⚠️ Variable declaration syntax updated

**Migration Required:**

```som
// OLD (v0.2.20)
вар ном = "Аҳмад";
конст ПИ = 3.14;

// NEW (v0.2.30+)
тағйирёбанда ном = "Аҳмад";
собит ПИ = 3.14;
```

**New Features:**

- ✨ Union types (`сатр | рақам`)
- ✨ Optional properties (`email?: сатр`)
- ✨ Rest parameters

---

### v0.2.20 - May 2024

**New Features:**

- ✨ Interface definitions
- ✨ Type annotations
- ✨ Basic generics

**Initial Features:**

- Basic compilation to JavaScript
- Variable declarations
- Function definitions
- Control flow statements

## Breaking Changes

### v0.2.50 Breaking Changes

#### 1. Module Import Syntax

**Problem:** Legacy `импорт` syntax removed

**Old Code:**

```som
импорт { ҷамъ, тафриқ } из "./math";
импорт стандарт из "./utils";
```

**New Code:**

```som
ворид { ҷамъ, тафриқ } аз "./math";
ворид стандарт аз "./utils";
```

**Migration:**

```bash
# Use migration tool
somon migrate --fix-imports
```

#### 2. Function Return Type Syntax

**Problem:** Return type syntax changed

**Old Code:**

```som
функция ҳисоб() тип рақам {
  возврат 42;
}
```

**New Code:**

```som
функсия ҳисоб(): рақам {
  бозгашт 42;
}
```

**Migration:**

1. Change `тип` to `:`
2. Change `возврат` to `бозгашт`

#### 3. Module Resolution Changes

**Problem:** Module resolution algorithm updated

**Impact:** Some imports may not resolve correctly

**Solution:**

1. Use explicit file extensions: `"./math.som"`
2. Update relative paths
3. Check `node_modules` dependencies

### v0.2.30 Breaking Changes

#### Variable Declaration Syntax

**Problem:** Variable keywords changed for better Tajik localization

**Old Code:**

```som
вар ном = "Аҳмад";
конст МАКС = 100;
лет временная = 42;
```

**New Code:**

```som
тағйирёбанда ном = "Аҳмад";
собит МАКС = 100;
тағйирёбанда временная = 42;
```

**Automated Migration:**

```bash
somon migrate --fix-variables --from 0.2.20 --to 0.2.30
```

## Upgrade Tools

### Migration Command

```bash
# Check what changes are needed
somon migrate --dry-run --from 0.2.50 --to 0.2.57

# Apply automatic fixes
somon migrate --fix-imports --fix-syntax --from 0.2.50 --to 0.2.57

# Interactive migration
somon migrate --interactive --from 0.2.50 --to 0.2.57
```

### Migration Options

- `--dry-run`: Show changes without applying them
- `--fix-imports`: Update import/export syntax
- `--fix-variables`: Update variable declarations
- `--fix-functions`: Update function syntax
- `--fix-syntax`: Fix all syntax changes
- `--interactive`: Prompt for each change
- `--backup`: Create backup files (`.som.bak`)

### Configuration File

Create `somon.migration.json`:

```json
{
  "rules": {
    "fix-imports": true,
    "fix-variables": true,
    "fix-functions": true,
    "preserve-comments": true,
    "backup-files": true
  },
  "exclude": ["node_modules/**", "*.test.som"]
}
```

## Common Issues

### Issue 1: Import Resolution Failures

**Symptoms:**

```
Error: Cannot resolve module "./math" from "src/main.som"
```

**Solutions:**

1. **Add file extension:**

   ```som
   // Instead of
   ворид { ҷамъ } аз "./math";

   // Use
   ворид { ҷамъ } аз "./math.som";
   ```

2. **Check file paths:**

   ```bash
   # Verify file exists
   ls src/math.som
   ```

3. **Update package.json:**
   ```json
   {
     "main": "index.som",
     "som": {
       "moduleResolution": "node"
     }
   }
   ```

### Issue 2: Type Checking Errors

**Symptoms:**

```
Error: Type 'сатр | рақам' is not assignable to type 'сатр'
```

**Solution:**

```som
// Add type guards
функсия коркард(маълумот: сатр | рақам): сатр {
  агар typeof маълумот === "сатр" {
    бозгашт маълумот;
  } вагарна {
    бозгашт маълумот.toString();
  }
}
```

### Issue 3: Compilation Performance

**Symptoms:** Slow compilation times

**Solutions:**

1. **Enable incremental compilation:**

   ```json
   {
     "compilerOptions": {
       "incremental": true,
       "tsBuildInfoFile": ".som-cache"
     }
   }
   ```

2. **Use module caching:**

   ```bash
   somon compile --cache --parallel src/main.som
   ```

3. **Exclude unnecessary files:**
   ```json
   {
     "exclude": ["node_modules", "tests/**/*.som", "docs/**/*.som"]
   }
   ```

### Issue 4: Runtime Errors

**Symptoms:** Code compiles but fails at runtime

**Diagnostic Steps:**

1. **Enable runtime checks:**

   ```bash
   somon compile --runtime-checks src/main.som
   ```

2. **Generate source maps:**

   ```bash
   somon compile --source-map src/main.som
   ```

3. **Use debug mode:**
   ```bash
   somon run --debug src/main.som
   ```

## Migration Checklist

### Pre-Migration

- [ ] Backup project (`git commit -am "Pre-migration backup"`)
- [ ] Run current tests (`npm test`)
- [ ] Note current version (`somon --version`)
- [ ] Review release notes

### During Migration

- [ ] Update SomonScript (`npm install -g @lindentech/somon-script@latest`)
- [ ] Run migration tool (`somon migrate`)
- [ ] Fix compilation errors
- [ ] Update deprecated syntax
- [ ] Test module resolution

### Post-Migration

- [ ] Run tests (`npm test`)
- [ ] Test examples (`npm run audit:examples`)
- [ ] Check performance (`npm run test:performance`)
- [ ] Update CI/CD scripts
- [ ] Update documentation

## Best Practices

### 1. Incremental Upgrades

Don't skip major versions:

```bash
# Good: Step-by-step upgrade
0.2.30 → 0.2.40 → 0.2.50 → 0.2.57

# Risky: Skip versions
0.2.30 → 0.2.57
```

### 2. Test Early and Often

```bash
# Test after each change
somon compile src/main.som && npm test
```

### 3. Use Feature Flags

```som
// Enable new features gradually
собит USE_NEW_SYNTAX = рост;

агар USE_NEW_SYNTAX {
  // New syntax
} вагарна {
  // Legacy fallback
}
```

### 4. Maintain Compatibility

```som
// Support multiple versions
#агар SOMON_VERSION >= "0.2.50"
  ворид { нав_функсия } аз "./utils";
#вагарна
  ворид { кӯҳна_функсия чун нав_функсия } аз "./utils";
#ниҳоят
```

## Getting Help

### Resources

- 📚 [Documentation](../README.md)
- 💬 [GitHub Discussions](https://github.com/Slashmsu/somoni-script/discussions)
- 🐛 [Issue Tracker](https://github.com/Slashmsu/somoni-script/issues)
- 📧 [Migration Support](mailto:migration@somoni-script.org)

### Community Migration Examples

Check the
[migration examples repository](https://github.com/Slashmsu/somoni-script-migration-examples)
for:

- Real-world migration scenarios
- Community-contributed fixes
- Best practice examples

---

_This migration guide is updated with each release. Always refer to the latest
version for accurate information._

# Automated Release Process

This document explains the automated release process for SomonScript using
semantic-release and multi-registry publishing.

## Overview

The project now uses **semantic-release** to automatically:

- Determine the next version number based on commit messages
- Generate release notes and changelog
- Create GitHub releases
- Publish to multiple package registries (NPM, JSR, GitHub Packages)
- Update documentation

## Supported Package Registries

### 1. NPM Registry (Primary)

- **URL**: https://www.npmjs.com/package/somon-script
- **Installation**: `npm install -g somon-script`
- **Automatic**: Published on every release

### 2. JSR (JavaScript Registry)

- **URL**: https://jsr.io/@lindentechde/somon-script
- **Installation**: `npx jsr add @lindentechde/somon-script`
- **Benefits**: TypeScript-first, better for modern JS/TS projects
- **Automatic**: Published on every release

### 3. GitHub Packages

- **URL**: https://github.com/lindentechde/Somon-Script/packages
- **Installation**:
  `npm install @lindentechde/somon-script --registry=https://npm.pkg.github.com`
- **Benefits**: Integrated with GitHub, private registry support
- **Automatic**: Published on every release

## Conventional Commits

All commits must follow the
[Conventional Commits](https://conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Commit Types and Version Impact

| Type       | Description             | Version Bump      | Example                             |
| ---------- | ----------------------- | ----------------- | ----------------------------------- |
| `feat`     | New feature             | **Minor** (0.1.0) | `feat: add union type support`      |
| `fix`      | Bug fix                 | **Patch** (0.0.1) | `fix: resolve parser memory leak`   |
| `perf`     | Performance improvement | **Patch** (0.0.1) | `perf: optimize lexer tokenization` |
| `docs`     | Documentation changes   | **Patch** (0.0.1) | `docs: update API examples`         |
| `style`    | Code style changes      | **Patch** (0.0.1) | `style: fix indentation`            |
| `refactor` | Code refactoring        | **Patch** (0.0.1) | `refactor: extract type checker`    |
| `build`    | Build system changes    | **Patch** (0.0.1) | `build: update TypeScript config`   |
| `test`     | Test changes            | **No release**    | `test: add parser unit tests`       |
| `ci`       | CI/CD changes           | **No release**    | `ci: update GitHub Actions`         |
| `chore`    | Maintenance tasks       | **No release**    | `chore: update dependencies`        |
| `revert`   | Revert previous commit  | **Patch** (0.0.1) | `revert: undo union type changes`   |

### Breaking Changes (Major Version)

To trigger a **major** version bump (1.0.0), include `BREAKING CHANGE:` in the
commit footer:

```bash
feat: redesign type system API

BREAKING CHANGE: The TypeChecker class constructor now requires a config parameter
```

### Examples

```bash
# Minor release (new feature)
git commit -m "feat: add intersection types support"

# Patch release (bug fix)
git commit -m "fix: handle empty string literals correctly"

# Major release (breaking change)
git commit -m "feat: redesign compiler API

BREAKING CHANGE: Compiler.compile() now returns Promise<CompileResult> instead of CompileResult"

# No release (internal change)
git commit -m "test: add comprehensive type system tests"
```

## Release Triggers

### Automatic Releases

Releases are automatically triggered when commits are pushed to:

- **`main` branch**: Production releases (latest)
- **`develop` branch**: Development pre-releases (dev)
- **`beta` branch**: Beta pre-releases (beta)

### Manual Releases

You can manually trigger a release using:

```bash
# Dry run (test without actual release)
npm run release:dry

# Actual release (if you have permissions)
npm run release
```

Or via GitHub Actions workflow dispatch with dry-run option.

## Release Process Flow

1. **Pull Request Validation** (New!)
   - Comprehensive quality checks on every PR
   - Multi-Node.js version testing (18.x-24.x)
   - Smart change detection (only runs relevant checks)
   - Automatic merge blocking if validation fails
   - Success/failure status posted to PR

2. **Validation Phase**
   - Run full test suite across all Node.js versions
   - Validate architecture quality (no 'as any', union types working)
   - Check modular structure
   - Security audit and dependency scanning
   - Performance benchmark validation

3. **Semantic Release Phase**
   - Analyze commits since last release
   - Determine next version number
   - Generate changelog and release notes
   - Update package.json version
   - Create Git tag
   - Publish to NPM
   - Create GitHub release

4. **Multi-Registry Publishing**
   - Publish to JSR with updated version
   - Publish to GitHub Packages
   - Update documentation

5. **Post-Release**
   - Update README with installation instructions
   - Generate API documentation
   - Commit documentation changes

## Branch Strategy

### Main Branch (`main`)

- **Purpose**: Production releases
- **Trigger**: Every push creates a release
- **Version**: Standard semantic versions (1.0.0, 1.1.0, 1.1.1)
- **NPM Tag**: `@latest`

### Develop Branch (`develop`)

- **Purpose**: Development previews
- **Trigger**: Every push creates a pre-release
- **Version**: Pre-release versions (1.1.0-dev.1, 1.1.0-dev.2)
- **NPM Tag**: `@dev`

### Beta Branch (`beta`)

- **Purpose**: Beta testing
- **Trigger**: Every push creates a beta release
- **Version**: Beta versions (1.1.0-beta.1, 1.1.0-beta.2)
- **NPM Tag**: `@beta`

## Installation Commands by Registry

### For End Users

```bash
# NPM (recommended for most users)
npm install -g somon-script

# JSR (recommended for TypeScript projects)
npx jsr add @lindentechde/somon-script

# GitHub Packages (for enterprise/private usage)
npm install @lindentechde/somon-script --registry=https://npm.pkg.github.com
```

### For Developers

```bash
# Install specific version
npm install somon-script@1.2.3

# Install beta version
npm install somon-script@beta

# Install development version
npm install somon-script@dev
```

## Environment Setup Requirements

### For Contributors

No additional setup required - just follow conventional commits!

### For Maintainers

Required secrets in GitHub repository settings:

1. **`NPM_TOKEN`**: NPM automation token for publishing
   - Create at: https://www.npmjs.com/settings/tokens
   - Type: Automation token

2. **`GITHUB_TOKEN`**: Automatically provided by GitHub Actions
   - Permissions: Contents (write), Issues (write), Pull Requests (write)

### For JSR Publishing

- JSR uses GitHub OIDC authentication (automatic)
- Repository must be linked to JSR package at https://jsr.io

## Troubleshooting

### Release Not Triggered

1. Check commit message format (must follow conventional commits)
2. Ensure you're pushing to `main`, `develop`, or `beta` branch
3. Check GitHub Actions logs for validation failures

### Publishing Failures

1. **NPM**: Check `NPM_TOKEN` secret and permissions
2. **JSR**: Ensure repository is linked to JSR package
3. **GitHub Packages**: Check GitHub token permissions

### Version Not Bumped

- Only commits with `feat`, `fix`, `perf`, `docs`, `style`, `refactor`, `build`,
  or `revert` trigger releases
- Commits with `test`, `ci`, or `chore` do not trigger releases

## Migration from Manual Releases

### What Changed

- ❌ No more manual version bumping in `package.json`
- ❌ No more manual tag creation
- ❌ No more manual changelog updates
- ✅ Automatic versioning based on commits
- ✅ Automatic multi-registry publishing
- ✅ Automatic changelog generation

### Best Practices

1. **Write meaningful commit messages** following conventional commits
2. **Use conventional types** appropriate for your changes
3. **Add breaking change notes** when introducing breaking changes
4. **Test thoroughly** before pushing to main
5. **Use branch protection** to ensure PR reviews

## Monitoring Releases

- **GitHub Releases**: https://github.com/lindentechde/Somon-Script/releases
- **NPM Package**: https://www.npmjs.com/package/somon-script
- **JSR Package**: https://jsr.io/@lindentechde/somon-script
- **GitHub Actions**: Repository → Actions tab
- **Changelog**: Auto-generated `CHANGELOG.md` file

## Support

For questions about the release process:

1. Check GitHub Actions logs
2. Review this documentation
3. Create an issue with the `release` label
4. Contact the maintainers

---

_This automated release process ensures consistent, reliable, and multi-platform
distribution of SomonScript across all major JavaScript package registries._

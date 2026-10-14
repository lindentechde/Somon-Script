# Upgrading SomonScript

This page explains how to move a project to a newer SomonScript release. What
changed in each release, including breaking changes, is listed in
[CHANGELOG.md](../CHANGELOG.md); read the entries between your version and the
new one before upgrading.

## Versioning

SomonScript follows [Semantic Versioning](https://semver.org/). Before 1.0.0 a
minor release (0.X.0) may contain breaking changes; they are listed under
"Breaking Changes" in the changelog. Patch releases (0.0.X) fix bugs.

Check the installed version with:

```bash
somon --version
```

## Upgrade steps

1. Commit your work, so you can compare the output before and after.
2. Read the changelog entries for the versions you skip.
3. Update the package:

   ```bash
   # Global installation
   npm install -g @lindentech/somon-script@latest

   # Project installation
   npm install --save-dev @lindentech/somon-script@latest
   ```

4. Compile and run your program and its tests:

   ```bash
   somon compile src/main.som
   npm test
   ```

5. Fix what the compiler reports. Error messages name the line and column of the
   problem; `somon check` type-checks files without writing output.

## Getting help

- [Issues](https://github.com/lindentechde/Somon-Script/issues) — report a
  problem that the changelog does not explain.
- [Releases](https://github.com/lindentechde/Somon-Script/releases) — published
  versions and their notes.

`somon migrate` is a different tool: it converts TypeScript files to SomonScript
(see [llm-guide/17-tools.md](../llm-guide/17-tools.md)).

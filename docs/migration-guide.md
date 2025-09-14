# Migration Guide

Guidelines for upgrading SomonScript projects between releases.

## From 0.2.x to 0.3.0

- Review the [changelog](../CHANGELOG.md) for breaking changes.
- Run `npm run lint` and `npm test` after upgrading to catch deprecated syntax.
- Update custom type definitions to align with the latest type system changes.

## General Tips

- Keep dependencies up to date with `npm update`.
- Use semantic versioning tags (`vX.Y.Z`) when releasing your own packages.
- Check the `examples/` directory for updated patterns and best practices.

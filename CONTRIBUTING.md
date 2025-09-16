# Contributing

Thanks for your interest in improving SomonScript!

## Getting Started

1. Fork and clone the repository.
2. Install dependencies with `npm install`.
3. Create your change.

## Before Commit

- Review the guidelines in [AGENTS.md](AGENTS.md).
- Ensure code is formatted and passes lint: `npm run lint`.
- Run the test suite: `npm test`.
- Audit example programs: `npm run audit:examples`.

## Submitting Changes

1. Commit using Conventional Commits.
2. Push your branch and open a pull request.

We appreciate your contributions!

## Type Safety Policy

- Production source (`src/`) must not use `as any` or explicit `any` types. The
  linter (`@typescript-eslint/no-explicit-any`) enforces this as an error.
- Tests (`tests/`) may use `any` sparingly for:
  - Constructing deliberately malformed AST nodes
  - Simplifying deep union pattern assertions
- Prefer narrow helpers or type guards over `any` where practical.
- If you need an exception in source, refactor with a discriminated union or
  introduce a minimal interface instead.

Run `npm run lint` before committing to catch violations early.

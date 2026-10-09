# Release Process

SomonScript is published to npm and JSR by two GitHub Actions workflows in
`.github/workflows/`. Versions are bumped explicitly; nothing is derived from
commit messages.

## Package Registries

| Registry | Package                      | Install                                   |
| -------- | ---------------------------- | ----------------------------------------- |
| npm      | `@lindentech/somon-script`   | `npm install -g @lindentech/somon-script` |
| JSR      | `@lindentechde/somon-script` | `npx jsr add @lindentechde/somon-script`  |

The npm package contains only `dist/`, the READMEs, `LICENSE` and `CHANGELOG.md`
(see `files` in `package.json`). The JSR package publishes the TypeScript
sources of the library entry point (`src/index.ts`) as configured in `jsr.json`.

## Bumping the Version

```bash
npm run version:patch   # or version:minor / version:major
git push origin main
```

`scripts/increment-version.js` runs `npm version`, syncs the version into
`jsr.json` (via `scripts/sync-jsr-version.js`, which is also the npm `version`
lifecycle script) and commits `package.json`, `package-lock.json` and
`jsr.json`. Add a `CHANGELOG.md` entry for the new version in the same change.

Commit messages must follow
[Conventional Commits](https://conventionalcommits.org/) (enforced by
commitlint), but they do not influence the version number.

## Automated Release (`automated-release.yml`)

Runs on every push to `main` that touches `package.json` or `package-lock.json`
(and on manual dispatch). It:

1. checks whether the version in `package.json` is already on npm, and stops if
   it is;
2. builds, runs `npm run test:ci` and `npm run audit:examples`;
3. publishes to npm (with provenance), then to JSR;
4. creates the `v<version>` tag and a GitHub release whose notes list the
   commits since the previous tag.

Each publish step skips a version that is already published and the tag step
skips an existing tag, so after a partial failure use **Re-run failed jobs**.

## Manual Release (`manual-release.yml`)

Start it from the Actions tab with a `MAJOR.MINOR.PATCH` version and choose
whether to publish to npm/JSR and create a tag. It sets the version, builds and
tests, publishes, then commits the version bump to the branch, tags it and
creates the GitHub release. Every step skips work that already happened, so a
failed run can be started again with the same version.

## Required Secrets

- `NPM_TOKEN`: npm automation token with publish rights for
  `@lindentech/somon-script`.
- `CODECOV_TOKEN`: optional, for coverage upload.
- JSR uses GitHub OIDC; the repository must be linked to the JSR package.

## Monitoring Releases

- GitHub releases: https://github.com/lindentechde/Somon-Script/releases
- npm: https://www.npmjs.com/package/@lindentech/somon-script
- JSR: https://jsr.io/@lindentechde/somon-script

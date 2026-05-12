# Release

This repository follows the canonical npm release runbook:

- [`LoTwT/ai/docs/npm-release-from-zero-to-shipped.md`](https://github.com/LoTwT/ai/blob/main/docs/npm-release-from-zero-to-shipped.md)

Repo-specific implementation lives in:

- `.github/workflows/release.yml` — tag-triggered OIDC publish for
  `@randomplay/core`, `@randomplay/data`, and `@randomplay/cli`
- `bump.config.ts` — version bump, release commit, tag push, and changelog hook
- `cliff.toml` — CHANGELOG and GitHub Release note generation

Repo-specific notes:

- Fairy is a synchronized-version pnpm workspace. The private root and all
  three publishable packages keep the same version.
- CI publishes with `pnpm -r publish --access public --no-git-checks`, so
  pnpm handles topological package order and `workspace:*` replacement.
- Registry smoke installs all three packages, imports `@randomplay/core` and
  `@randomplay/data`, and runs the `fairy` CLI.
- The `npm-publish` environment, Trusted Publisher bindings, and `v*.*.*`
  tag-protection ruleset are repository settings, not source files.

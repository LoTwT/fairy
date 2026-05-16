# Release

This repository follows the canonical npm release runbook:

- [`LoTwT/ai/docs/npm-release-from-zero-to-shipped.md`](https://github.com/LoTwT/ai/blob/main/docs/npm-release-from-zero-to-shipped.md)

Repo-specific implementation lives in:

- `.github/workflows/release.yml` — tag-triggered OIDC publish for
  `@randomplay/core`, `@randomplay/data`, and `@randomplay/cli`
- `bump.config.ts` — version bump, release commit, tag push, and changelog hook
- `cliff.toml` — CHANGELOG and GitHub Release note generation

Release-note drafts:

- [Fairy v0.1.3 — Release Notes](release-notes-v0.1.3.md)
- [Fairy v0.1.2 — Release Notes](release-notes-v0.1.2.md)
- [Fairy v0.1.1 — Release Notes](release-notes-v0.1.1.md)
- [Fairy v0.1.0 — Release Notes](release-notes-v0.1.0.md)

Repo-specific notes:

- Fairy is a synchronized-version pnpm workspace. The private root and all
  three publishable packages keep the same version.
- CI publishes with `pnpm -r publish --access public --no-git-checks`, so
  pnpm handles topological package order and `workspace:*` replacement.
- GitHub Release creation is gated by the publish step, not by registry smoke:
  after publish succeeds, CI generates release notes and creates the GitHub
  Release before running post-publish consumer validation.
- Registry smoke waits for all three packages to appear via `npm view`, then
  installs them in a fresh project, imports `@randomplay/core` and
  `@randomplay/data`, validates the published golden replay report, and runs the
  `fairy` CLI. It retries 20 times with a 60s delay. A smoke failure keeps the
  workflow red, but the publish and GitHub Release may already be complete; use
  the QA release-readiness checklist to distinguish npm propagation lag from a
  real package/install/runtime defect.
- Test timeouts intentionally distinguish unit tests from verifier-heavy suites.
  `@randomplay/core` stays on Vitest's short default timeout. `@randomplay/data`
  and `@randomplay/cli` set a 30s Vitest timeout because their tests shell out to
  `pnpm`, `npm pack`, `tsx`, or the CLI and can vary on cold GitHub runners. This
  is only an interruption buffer; source gates, schema checks, package-size
  limits, and runtime assertions remain strict.
- The `npm-publish` environment, Trusted Publisher bindings, and `v*.*.*`
  tag-protection ruleset are repository settings, not source files.

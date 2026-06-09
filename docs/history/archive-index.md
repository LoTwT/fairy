# Archive index

The clean-slate reset ([../rfcs/0001-clean-slate-reset.md](../rfcs/0001-clean-slate-reset.md))
removes the pre-reset implementation so the new build starts from an empty
skeleton. This document records what existed and how to recover it.

## Recovery

The pre-reset tree is preserved by git and npm. To read or restore it:

- **Git:** tag `v0.1.4` (commit `a48e9c57c`) is the last pre-reset state; tags
  `v0.0.1`–`v0.1.4` cover every release.
- **npm:** all published versions remain installable
  (see [npm-versions.md](npm-versions.md)).

Nothing is copied into this folder. History stays in git; this index just points
to it.

## What the reset removes

The reset clears the old implementation and its old documentation. At the time of
the reset the repository contained, among other things:

- **Code:** `packages/` (`@randomplay/core` / `data` / `cli`), `examples/`,
  `fixtures/`, `scripts/`.
- **Old docs (replaced by this new `docs/` structure):** `docs/getting-started.md`,
  `docs/ai-plugin/`, `docs/product/`, `docs/qa/`, `docs/release/`,
  `docs/data-contract/`, `docs/data-source/`, `docs/architecture/`,
  `docs/glossary/`, `docs/changelog/`.
- **Old build/release config:** `package.json`, `pnpm-workspace.yaml`,
  `tsconfig.base.json`, `bump.config.ts`, `cliff.toml`, `commitlint.config.js`,
  `CHANGELOG.md`, `CONTRIBUTING.md`, and related tooling.

The removal itself is executed as a separate, reviewable PR per the Execution
Plan in RFC 0001. This PR (RFC 0001) only adds the new skeleton and the RFC; it
does not delete code.

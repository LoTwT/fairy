# History (pre-reset record)

This is the read-only record of fairy before the clean-slate reset: what was
published, how to recover it, and what the reset removes. **It is never a source
for new work** (see the clean-slate rule in
[../specs/0001-clean-slate.md](../specs/0001-clean-slate.md)).

**Naming.** "Fairy" is the repository / product name; its packages are published
under the **`@randomplay/*`** npm scope. The scope is kept across the clean-slate
reset so published versions stay continuous and monotonic (below).

## Published npm versions

Three packages were published together as a monorepo, sharing the same version
number and git tag at each release:

- [`@randomplay/core`](https://www.npmjs.com/package/@randomplay/core)
- [`@randomplay/data`](https://www.npmjs.com/package/@randomplay/data)
- [`@randomplay/cli`](https://www.npmjs.com/package/@randomplay/cli)

**Highest published version: `0.1.4`.** Per the npm-monotonicity rule, any future
publish on these package names must be strictly greater than `0.1.4`. Published
versions are immutable and are never deleted, overwritten, or re-published.

| Version | Tag      | Commit      | Published (npm, UTC) | GitHub Release                                               |
| ------- | -------- | ----------- | -------------------- | ------------------------------------------------------------ |
| 0.1.4   | `v0.1.4` | `a48e9c57c` | 2026-05-23           | [v0.1.4](https://github.com/LoTwT/fairy/releases/tag/v0.1.4) |
| 0.1.3   | `v0.1.3` | `31153862c` | 2026-05-16           | [v0.1.3](https://github.com/LoTwT/fairy/releases/tag/v0.1.3) |
| 0.1.2   | `v0.1.2` | `def231009` | 2026-05-16           | [v0.1.2](https://github.com/LoTwT/fairy/releases/tag/v0.1.2) |
| 0.1.1   | `v0.1.1` | `64a5e71d0` | 2026-05-16           | [v0.1.1](https://github.com/LoTwT/fairy/releases/tag/v0.1.1) |
| 0.1.0   | `v0.1.0` | `81ab0925a` | 2026-05-15           | [v0.1.0](https://github.com/LoTwT/fairy/releases/tag/v0.1.0) |
| 0.0.4   | `v0.0.4` | `2d00ab0e6` | 2026-05-14           | [v0.0.4](https://github.com/LoTwT/fairy/releases/tag/v0.0.4) |
| 0.0.3   | `v0.0.3` | `93da3dbbf` | 2026-05-14           | [v0.0.3](https://github.com/LoTwT/fairy/releases/tag/v0.0.3) |
| 0.0.2   | `v0.0.2` | `6f291f439` | 2026-05-13           | [v0.0.2](https://github.com/LoTwT/fairy/releases/tag/v0.0.2) |
| 0.0.1   | `v0.0.1` | `35ee8c718` | 2026-05-10           | [v0.0.1](https://github.com/LoTwT/fairy/releases/tag/v0.0.1) |

Publish dates are from the npm registry (`npm view <pkg> time`) for
`@randomplay/core`; the other two published within the same minute. The GitHub
Release for each tag is the publish evidence.

## Recovery

The pre-reset tree is preserved by git and npm:

- **Git:** tag `v0.1.4` (commit `a48e9c57c`) is the last pre-reset state; tags
  `v0.0.1`–`v0.1.4` cover every release.
- **npm:** all published versions remain installable.

Nothing is copied into this file beyond the records above; the code stays in git.

## What the reset removed

The reset removed the old implementation, old docs, and old tooling so the new
build starts from a clean skeleton. The repository contained, among other things:

- **Code:** `packages/` (`@randomplay/core` / `data` / `cli`), `examples/`,
  `fixtures/`, `scripts/`.
- **Old docs:** `docs/getting-started.md`, `docs/ai-plugin/`, `docs/product/`,
  `docs/qa/`, `docs/release/`, `docs/data-contract/`, `docs/data-source/`,
  `docs/architecture/`, `docs/glossary/`, `docs/changelog/`, `docs/overview/`,
  `docs/reference/`, `docs/ux/`.
- **Old build/release config:** `package.json`, `pnpm-workspace.yaml`,
  `pnpm-lock.yaml`, `tsconfig.base.json`, `bump.config.ts`, `cliff.toml`,
  `commitlint.config.js`, `.npmignore`, `CHANGELOG.md`, `CONTRIBUTING.md`.
- **Old tooling:** `.github/` (old CI workflows), `.claude-plugin/`, `.codex/`.

What remains is the skeleton: `AGENTS.md`, `CLAUDE.md`, `README.md`, `LICENSE`,
`.gitignore`, and `docs/{index.md, specs/, references/}`. Everything removed is
recoverable at tag `v0.1.4` (see Recovery above).

# Spec 0002 — Project initialization

## Scope

This spec defines the planned Fairy project-root initialization: the Node
version baseline, pnpm workspace root, and the minimal repository-quality tooling
needed before any package code exists.

This PR uses a spec-first flow: review this spec before adding execution commits.
Until that review completes, the PR remains docs-only. After approval, the root
configuration can land in the same PR.

It also does **not** define packages, the damage formula, project `tsconfig`
setup, data ingestion, CLI behavior, runtime schemas, tests, bundling, release
workflow, or deploy surface. Those come in later specs and PRs when there is code
that needs them.

## Rationale

Project initialization is only the root tooling needed to start cleanly. Planning
it before executing it keeps the execution changes small and prevents tooling
defaults from becoming hidden decisions.

Keeping initialization separate from packages and the damage model keeps
reviewable concerns small: root package-manager setup is one concern, package
boundaries are another, and formula correctness is a later product/model
concern.

Package implementation stays out of this spec. When a package is needed, create
it in the PR that needs that package, use the `@randomplay` scope, and apply the
monotonic version rule from [0001-clean-slate.md](0001-clean-slate.md): future
publishes must be strictly greater than `0.1.4`.

## Contract

The execution phase that follows this spec review should add only root-level
configuration.

- The repository root package is private.
- The repository root package uses ESM (`type: "module"`).
- The repository is a pnpm workspace using `packages/*`.
- The Node baseline is Node 24. The local version file pins the major line as
  `24`.
- The root package declares `engines.node` as `>=24`.
- The root package declares `packageManager` using Corepack's current pnpm
  release at execution time: run `corepack use pnpm@latest` rather than choosing
  a pinned pnpm version manually.
- The root quality-tooling surface is OXC-based:
  - `oxlint` for linting.
  - `oxfmt` for formatting.
  - `lint-staged` plus `simple-git-hooks` for pre-commit staged-file lint and
    format checks.
- The root package does not define build/test scripts yet; there is no package
  code to build or test.
- No package directories are created in the initialization PR.
- Future package PRs use the `@randomplay` scope.
- Future package PRs preserve these dependency directions:
  - `@randomplay/core` is pure calculation code and does not depend on data or
    CLI packages.
  - `@randomplay/data` is independent data ownership and does not depend on
    core or CLI packages.
  - `@randomplay/cli` may depend on core and data packages.
- No publish, release workflow, npm token, or registry action is part of
  initialization.

## Implementation Notes

Expected execution-phase file shape:

```text
package.json
pnpm-lock.yaml
pnpm-workspace.yaml
.node-version
oxlint.config.ts
oxfmt.config.ts
.gitignore
```

`pnpm-workspace.yaml` may name `packages/*` before the folder exists, so the next
package PR can add `packages/<name>` without reshaping workspace config.

Use TypeScript config files for OXC tools (`oxlint.config.ts` and
`oxfmt.config.ts`) because the Node-based `oxlint` and `oxfmt` packages support
them and Node 24 can execute them. The execution phase must not add a separate TS
loader, build step, or project `tsconfig` just to read these tool configs.

`.gitignore` should cover at least `node_modules/`, `dist/`, `coverage/`,
`.DS_Store`, and `*.log`.

Suggested root scripts for the execution phase:

- `lint` — run `oxlint`.
- `lint:fix` — run `oxlint --fix`.
- `format` — run `oxfmt`.
- `format:check` — run `oxfmt --check`.
- `check` — run lint and format-check.
- `prepare` — install `simple-git-hooks`.

Not planned unless reviewed separately:

- `commitlint` or a commit-message hook.
- `.editorconfig`.
- `.npmrc` with `engine-strict`.

## Acceptance

This spec-only review phase:

- Adds or updates docs and the AGENTS coordination rule only.
- `git diff --check origin/main...HEAD` succeeds.
- Markdown links resolve.

The execution phase:

- `corepack use pnpm@latest` has been run so `packageManager` records the current
  pnpm release.
- `pnpm install --frozen-lockfile` succeeds from a clean checkout under Node 24.
- `pnpm lint` succeeds.
- `pnpm format:check` succeeds.
- `pnpm check` succeeds.
- `oxlint.config.ts` and `oxfmt.config.ts` are read by the actual commands under
  Node 24 without an extra TS loader, build step, or project `tsconfig`.
- `simple-git-hooks` and `lint-staged` are configured for pre-commit staged-file
  lint and format checks.
- `git diff --check origin/main...HEAD` succeeds.
- Markdown links resolve.
- The root package is `private: true`.
- The diff adds only the AGENTS coordination rule, root workspace initialization,
  and this spec/docs; it does not add packages, damage-formula implementation,
  project `tsconfig`, data ingestion, runtime schemas, tests, bundling, release
  workflows, or deploy config.

# Spec 0002 — Project initialization

## Scope

This spec defines the planned Fairy project-root initialization: the Node
version baseline, pnpm workspace root, and the minimal repository-quality tooling
needed before any package code exists.

It does **not** execute the initialization. This PR is spec-only; the root
configuration lands in a later implementation PR after this spec is reviewed.

It also does **not** define packages, the damage formula, TypeScript config, data
ingestion, CLI behavior, runtime schemas, tests, bundling, release workflow, or
deploy surface. Those come in later specs and PRs when there is code that needs
them.

## Rationale

Project initialization is only the root tooling needed to start cleanly. Planning
it before executing it keeps the first implementation PR small and prevents
tooling defaults from becoming hidden decisions.

Keeping initialization separate from packages and the damage model keeps
reviewable concerns small: root package-manager setup is one concern, package
boundaries are another, and formula correctness is a later product/model
concern.

Package implementation stays out of this spec. When a package is needed, create
it in the PR that needs that package, use the `@randomplay` scope, and apply the
monotonic version rule from [0001-clean-slate.md](0001-clean-slate.md): future
publishes must be strictly greater than `0.1.4`.

## Contract

The implementation PR that follows this spec should add only root-level
configuration.

- The repository root package is private.
- The repository is a pnpm workspace using `packages/*`.
- The Node baseline is Node 24. The local version file pins the major line as
  `24`.
- The root package declares `engines.node` as `>=24`.
- The root package declares `packageManager` as `pnpm@11.5.3`.
- The root quality-tooling surface is OXC-based:
  - `oxlint` for linting.
  - `oxfmt` for formatting.
  - `lint-staged` plus `simple-git-hooks` for pre-commit staged-file checks.
- The root package does not define build/test scripts yet; there is no package
  code to build or test.
- No package directories are created in the initialization PR.
- Future package PRs use the `@randomplay` scope.
- No publish, release workflow, npm token, or registry action is part of
  initialization.

## Implementation Notes

Expected execution PR file shape:

```text
package.json
pnpm-lock.yaml
pnpm-workspace.yaml
.node-version
.oxlintrc.json
.oxfmtrc.json
```

`pnpm-workspace.yaml` may name `packages/*` before the folder exists, so the next
package PR can add `packages/<name>` without reshaping workspace config.

Suggested root scripts for the execution PR:

- `lint` — run `oxlint`.
- `lint:fix` — run `oxlint --fix`.
- `format` — run `oxfmt`.
- `format:check` — run `oxfmt --check`.
- `check` — run lint and format-check.
- `prepare` — install `simple-git-hooks`.

## Acceptance

This spec-only PR:

- Adds or updates docs only.
- `git diff --check origin/main...HEAD` succeeds.
- Markdown links resolve.

The later execution PR:

- `corepack pnpm@11.5.3 install --frozen-lockfile` succeeds from a clean
  checkout under Node 24.
- `corepack pnpm@11.5.3 check` succeeds.
- `git diff --check origin/main...HEAD` succeeds.
- Markdown links resolve.
- The root package is `private: true`.
- The diff adds only root workspace initialization and this spec; it does not add
  packages, damage-formula implementation, TypeScript config, data ingestion,
  runtime schemas, tests, bundling, release workflows, or deploy config.

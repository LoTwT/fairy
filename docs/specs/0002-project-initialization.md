# Spec 0002 — Project initialization

## Scope

This spec defines Fairy's post-reset project root: the Node version baseline,
pnpm workspace root, and the minimal package-manager files needed before any
package code exists.

It does **not** define packages, the damage formula, TypeScript config, data
ingestion, CLI behavior, runtime schemas, tests, linting, bundling, release
workflow, or deploy surface. Those come in later specs and PRs when there is code
that needs them.

## Rationale

Project initialization is only the root tooling needed to start cleanly. Keeping
it separate from packages and the damage model keeps reviewable concerns small:
root package-manager setup is one concern, package boundaries are another, and
formula correctness is a later product/model concern.

Package implementation stays out of this spec. When a package is needed, create
it in the PR that needs that package, use the `@randomplay` scope, and apply the
monotonic version rule from [0001-clean-slate.md](0001-clean-slate.md): future
publishes must be strictly greater than `0.1.4`.

## Contract

- The repository root package is private.
- The repository is a pnpm workspace using `packages/*`.
- The Node baseline is Node 24. The local version file pins the major line as
  `24`.
- The package manager baseline is `pnpm@10.11.1`.
- The root package does not define build/check/test scripts yet; there is no code
  to check.
- No package directories are created in the initialization PR.
- Future package PRs use the `@randomplay` scope.
- No publish, release workflow, npm token, or registry action is part of
  initialization.

## Implementation Notes

Expected file shape:

```text
package.json
pnpm-lock.yaml
pnpm-workspace.yaml
.node-version
```

`pnpm-workspace.yaml` may name `packages/*` before the folder exists, so the next
package PR can add `packages/<name>` without reshaping workspace config.

## Acceptance

- `corepack pnpm@10.11.1 install --frozen-lockfile` succeeds from a clean
  checkout under Node 24.
- `git diff --check origin/main...HEAD` succeeds.
- Markdown links resolve.
- The root package is `private: true`.
- The diff adds only root workspace initialization and this spec; it does not add
  packages, damage-formula implementation, TypeScript config, data ingestion,
  runtime schemas, tests, linting, bundling, release workflows, or deploy config.

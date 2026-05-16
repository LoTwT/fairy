# Data Cleaned Staging Refactor Plan

Status: proposed for lo-user review
Owner: TechLead
Scope: repository layout only

## Goal

Remove the duplicated cleaned-data staging path:

- current canonical generator output: `data/cleaned/`
- current package payload mirror: `packages/data/cleaned/`

After the refactor, `packages/data/cleaned/` becomes the only physical cleaned
artifact tree. `data/source/` stays at the repository root as the raw source
archive and audit trace.

## Why

The current mirror model worked while the data pipeline was small. After the
V1.2.x full-data batch, it creates avoidable cost:

- every generated JSON artifact exists twice in git;
- generators and verifiers must keep root and package paths in sync;
- `sync-cleaned` is an extra release-prep step with no user-visible value;
- reviewers must mentally distinguish repo staging from the actual npm payload.

The package already exposes cleaned artifacts from `packages/data/cleaned/`, so
making that tree canonical aligns the repository with the published package.

## Non-Goals

This refactor must not change:

- `@randomplay/data` public exports, including `./cleaned/*`;
- runtime schema, `GameData`, or calculator behavior;
- source policy, Formal-Live Gate, or nanoka-exclusive runtime constraints;
- source archive retention under `data/source/`;
- package payload contents, except that duplicated repo-root staging files are
  removed from the repository;
- package version.

## Proposed Target Layout

```text
data/
  source/                         # raw source archive, kept at repo root
  source-registry.json            # repo-level source registry, kept

packages/data/
  cleaned/                        # canonical generated cleaned artifacts
    audit/
    golden/
    runtime/
  source-registry.json            # package mirror used for npm payload
  scripts/
  src/
```

`data/cleaned/` should be removed after migration. A short tombstone is not
recommended because it would keep the old path alive and weaken the cleanup.

## Path Policy

Use three path categories consistently:

| Category | Policy |
| --- | --- |
| Raw source anchors | Keep `data/source/...`. These remain source provenance, not package payload paths. |
| Published cleaned artifacts | Use `packages/data/cleaned/...` in repo-internal tests and verifiers. |
| Consumer-facing docs | Use package subpaths such as `@randomplay/data/cleaned/runtime/game-data.json`. |

`source.sourceAnchor` values inside runtime data should remain raw-source paths
such as `data/source/raw/nanoka/...`. Audit metadata fields that currently point
to `data/cleaned/audit/...` should move to `packages/data/cleaned/audit/...`
unless lo-user explicitly wants to preserve the old strings as logical labels.

## Implementation Plan

1. Add a small path helper for data scripts.
   - `repoRoot`
   - `packageDir`
   - `sourceRoot = data/source`
   - `cleanedRoot = packages/data/cleaned`
   - `packageSourceRegistry = packages/data/source-registry.json`
   - `repoSourceRegistry = data/source-registry.json`

2. Repoint generators to write directly to `packages/data/cleaned/`.
   - `golden-v1-replay.ts`
   - `nanoka-runtime-game-data.ts`
   - source-migration drift scripts
   - any batch-audit generator still writing root cleaned paths

3. Repoint verifiers and tests to package-cleaned paths.
   - Remove byte-identical mirror assertions.
   - Replace them with single-canonical-artifact assertions.
   - Keep runtime/source/schema checks unchanged.

4. Retire mirror sync behavior.
   - Keep `pnpm --filter @randomplay/data sync-cleaned -- --check` temporarily
     as a compatibility alias that verifies canonical layout.
   - Normal `sync-cleaned` should either become a no-op with a clear message or
     be replaced in package scripts after docs are updated.

5. Remove root cleaned artifacts.
   - Delete `data/cleaned/**`.
   - Update docs that describe root cleaned as staging.
   - Keep `data/source/**` untouched.

6. Strengthen package guards.
   - npm pack must still include `cleaned/runtime/game-data.json`,
     `cleaned/golden/v1-replay-report.json`, audit JSON, `dist`, and
     `source-registry.json`.
   - npm pack must still exclude `data/source/**`, `.xlsx`, `src`, `scripts`,
     tests, and fixtures.
   - Add a layout guard that fails if JSON files reappear under `data/cleaned/`.

## Review Strategy

Recommended sequence:

1. This docs-only plan PR gets lo-user review.
2. One implementation PR performs the path migration.
3. QA reviews the implementation PR as a data-pipeline refactor, not as a data
   content change.

Splitting implementation by script family is possible, but it would require
temporary dual-path compatibility and more churn. A single implementation PR is
preferable once the plan is approved because the change is mechanical and
cross-cutting.

## Acceptance Gates

Implementation is complete only when all of these pass:

- `git diff --check`
- `pnpm check`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @randomplay/data verify:nanoka`
- `pnpm --filter @randomplay/data verify:nanoka-runtime`
- `pnpm --filter @randomplay/data verify:golden-v1`
- `pnpm --filter @randomplay/data verify:source-registry`
- `pnpm --filter @randomplay/data verify:source-migration`
- `pnpm --filter @randomplay/data verify:package-size`
- `pnpm --filter @randomplay/data sync-cleaned -- --check` or its replacement
  layout-check command
- npm pack payload check confirms package contents are unchanged
- layout guard confirms no generated JSON remains under `data/cleaned/`

## Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| Raw source accidentally enters npm payload | Keep package `files` allowlist and governance pack test. |
| Audit metadata points to removed paths | Rewrite audit artifact refs to package-cleaned paths or preserve old strings only as approved logical labels. |
| Large mechanical diff hides behavior changes | Plan review first; implementation PR must be path-only and keep runtime data semantics unchanged. |
| Docs become stale | Update `data/cleaned/README.md`, `packages/data/README.md`, data-source docs, release docs, and architecture index in the implementation PR. |
| Release process loses a guard when `sync-cleaned` is retired | Replace mirror check with canonical layout + pack payload guard before removing the mirror step. |

## Approval Questions

1. Should audit metadata paths move from `data/cleaned/audit/...` to
   `packages/data/cleaned/audit/...`?
   - TechLead recommendation: yes, because the old physical path will be
     removed.
2. Should `sync-cleaned` remain as a compatibility alias for one release cycle?
   - TechLead recommendation: yes, but it should verify layout instead of
     copying files.
3. Should implementation be a single PR after this plan is approved?
   - TechLead recommendation: yes, with QA treating it as a path-only data
     pipeline refactor.

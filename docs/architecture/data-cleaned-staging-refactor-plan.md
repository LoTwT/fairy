# Data Package Ownership Refactor Plan

Status: proposed v2 for lo-user and team review
Owner: TechLead
Scope: repository data layout, source retention policy, and tests

## Goal

Move all repository data ownership under `packages/data/` and remove the root
`data/` tree.

The target is broader than the original cleaned-staging plan:

- move `data/source/` under `packages/data/source/`;
- keep `packages/data/cleaned/` as the only physical cleaned artifact tree;
- move the remaining repo-level source registry ownership under
  `packages/data/`;
- physically remove the legacy Excel source archive;
- delete D-17 Mihoyo and D-12 buhflipexplode raw archives if the implementation
  audit confirms all local tests and verifiers can be migrated away from them;
- remove `sync-cleaned` instead of keeping a compatibility alias.

## Locked Product Decisions

| Item | Decision |
| --- | --- |
| R'.1 | Move all root `data/*` into `packages/data/*`; exact internal package layout is implementation-owned. |
| R'.2 | Physically delete the Excel source archive; tests that used it must migrate to the new post-nanoka data model. |
| R'.3 | Delete D-17 Mihoyo and D-12 buhflipexplode raw archives if the implementation audit confirms they are no longer needed. |
| Q1 | Rewrite audit metadata paths from `data/cleaned/audit/...` to package-owned paths. |
| Q2 | Do not keep `sync-cleaned` as a compatibility alias; remove it and replace it with explicit layout/package guards. |
| Q3 | Use one implementation PR after this plan is approved. |

## Why

After V0.1.1, `@randomplay/data` owns the data pipeline and npm payload. Keeping
data at the repository root now creates unnecessary ambiguity:

- root `data/cleaned/` duplicates package payload files;
- root `data/source/` makes it look like source ownership is outside the data
  package;
- `sync-cleaned` is an extra release step with no user-visible value;
- legacy Excel, Mihoyo D-17, and buhflipexplode D-12 source snapshots are no
  longer runtime sources after the nanoka-exclusive cutover.

Moving ownership into `packages/data/` makes the repository boundary match the
package boundary: data inputs, generated artifacts, source registry, scripts,
tests, and package guards live together.

## Non-Goals

This refactor must not change:

- `@randomplay/data` public exports, including `./cleaned/*`;
- runtime schema, `GameData`, or calculator behavior;
- Formal-Live Gate or the nanoka-exclusive current runtime policy;
- npm package payload contents, except for metadata path strings inside bundled
  JSON where path ownership changes;
- package version in the implementation PR.

After implementation is reviewed and merged, ship a patch release so published
metadata and package guards reflect the new layout.

## Target Layout

The implementation may adjust names, but it should preserve this ownership
shape:

```text
packages/data/
  cleaned/                         # canonical generated cleaned artifacts
    audit/
    golden/
    runtime/
  source/                          # retained source archives owned by data package
    raw/nanoka/...                 # current and historical nanoka snapshots
    raw/mihoyo/...                 # delete if R'.3 audit confirms no ongoing need
    raw/buhflipexplode/...         # delete if R'.3 audit confirms no ongoing need
  source-registry.json             # package-owned source registry and npm payload file
  scripts/
  src/
```

Root `data/` should be removed entirely. The implementation should add a layout
guard that fails if root `data/` or generated JSON under root `data/cleaned/`
reappears.

## Path Policy

Use three path categories consistently:

| Category | Policy |
| --- | --- |
| Raw source anchors | Use `packages/data/source/...`. These remain repository provenance paths, not npm payload paths. |
| Published cleaned artifacts | Use `packages/data/cleaned/...` in repo-internal tests, verifiers, and audit metadata. |
| Consumer-facing docs | Use package subpaths such as `@randomplay/data/cleaned/runtime/game-data.json`. |

Current runtime `source.sourceAnchor` strings that point to nanoka raw snapshots
must move from `data/source/raw/nanoka/...` to
`packages/data/source/raw/nanoka/...`.

Audit metadata strings such as `data/cleaned/audit/...` and
`sha256:see-data/cleaned/...` must be included in the path rewrite audit. Do not
limit the implementation to tests and generator constants.

## Source Deletion Evaluation

The implementation PR must run an explicit dependency audit before deleting any
legacy raw source family.

### Excel

Decision: delete.

Current dependency shape:

- `packages/data/scripts/excel-source.mjs`
- `packages/data/src/excel.test.ts`
- `packages/data/scripts/golden-v1-replay.ts`
- `packages/data/src/golden-v1.test.ts`
- source descriptors and docs that mention `lo-user-excel`
- release workflow entries that run `verify:excel`

Required migration:

- remove `audit:excel` and `verify:excel` from package scripts and release CI;
- stop regenerating V1 golden source candidates from the Excel workbook;
- keep already-published cleaned artifacts and golden replay semantics
  verifiable without the workbook;
- preserve fail-loud runtime rejection for archived source ids such as
  `lo-user-excel`, even if the physical workbook is deleted.

### D-17 Mihoyo

Decision: delete if the implementation audit confirms only legacy verifier and
historical audit tests still depend on it.

Current dependency shape:

- `packages/data/scripts/mihoyo-da-source.mjs`
- `packages/data/src/mihoyo-da.test.ts`
- `packages/data/src/source-conflict-audit.test.ts`
- source descriptors, source registry entries, and docs
- release workflow entries that run `verify:mihoyo-da`

Runtime status:

- not a current runtime source after V0.1.0;
- not included in npm package payload;
- not needed for current nanoka runtime parsing if source-registry and golden
  tests are migrated.

Recommended implementation ruling: delete D-17 raw files and retire
`verify:mihoyo-da` after replacing any still-needed assertions with packaged
audit artifact checks or decision-log checks.

### D-12 buhflipexplode

Decision: delete if the implementation audit confirms only legacy verifier and
historical audit tests still depend on it.

Current dependency shape:

- `packages/data/scripts/buhflipexplode-da-source.mjs`
- `packages/data/src/buhflipexplode.test.ts`
- `packages/data/scripts/mihoyo-da-source.mjs` alignment helper
- `packages/data/scripts/golden-v1-replay.ts`
- source descriptors, source registry entries, and docs
- release workflow entries that run `verify:buhflipexplode-da`

Runtime status:

- not a current runtime source after V0.1.0;
- not included in npm package payload;
- not needed for current nanoka runtime parsing if source-registry and golden
  tests are migrated.

Recommended implementation ruling: delete D-12 raw files and retire
`verify:buhflipexplode-da` after replacing any still-needed assertions with
packaged audit artifact checks or decision-log checks.

## Source Registry and Decision Logs

The implementation PR must update policy records instead of silently deleting
sources.

Required updates:

- move `data/source-registry.json` ownership to `packages/data/source-registry.json`;
- decide whether deleted source ids remain as tombstones in the registry or move
  to a dedicated retired-source list;
- update package and repo docs that currently list Excel, Mihoyo, and
  buhflipexplode source verifiers as active checks;
- add D-05-rev errata: raw source retention policy no longer requires keeping
  the Excel workbook;
- add D-20 errata: archived baseline scope changes after V0.1.1;
- if D-17/D-12 are deleted, add D-17 and D-12 status errata noting that the raw
  archives were removed and can only be recovered from git history.

## Implementation Plan

1. Add a package-local path helper for data scripts.
   - `packageDir`
   - `repoRoot`
   - `sourceRoot = packages/data/source`
   - `cleanedRoot = packages/data/cleaned`
   - `sourceRegistryPath = packages/data/source-registry.json`

2. Move package-owned data into `packages/data/`.
   - `data/source/raw/nanoka/...` -> `packages/data/source/raw/nanoka/...`
   - root source registry ownership -> `packages/data/source-registry.json`
   - root cleaned artifacts removed after generators/verifiers use
     `packages/data/cleaned/`

3. Delete retired source families.
   - delete `data/source/excel/**`;
   - delete D-17/D-12 raw archives if the implementation audit confirms no
     current dependency remains after test migration;
   - remove or rewrite verifier scripts and tests that require deleted raw
     files.

4. Repoint generators to write directly to `packages/data/cleaned/`.
   - `golden-v1-replay.ts`
   - `nanoka-runtime-game-data.ts`
   - source-migration drift scripts
   - any batch-audit generator still writing root cleaned paths

5. Repoint verifiers and tests to package-owned paths.
   - remove byte-identical mirror assertions;
   - replace legacy source-file verifier tests with current packaged artifact,
     nanoka runtime, source-registry, or decision-log checks;
   - keep runtime/source/schema checks strict.

6. Remove `sync-cleaned`.
   - delete the package script;
   - remove release-note and QA references to it;
   - replace it with a layout guard or fold layout checks into governance tests.

7. Strengthen package guards.
   - npm pack must still include `cleaned/runtime/game-data.json`,
     `cleaned/golden/v1-replay-report.json`, audit JSON, `dist`, and
     `source-registry.json`;
   - npm pack must still exclude `packages/data/source/**`, `.xlsx`, `src`,
     `scripts`, tests, and fixtures;
   - layout guard must fail if root `data/` reappears.

## Review Strategy

Recommended sequence:

1. This docs-only plan PR gets lo-user, Product, QA, and TechLead review.
2. One implementation PR performs the migration after plan approval.
3. QA reviews the implementation PR as a data-pipeline layout and source-policy
   refactor.
4. After implementation merge, ship a patch release.
5. After the patch release, start AI plugin / skills planning in-channel.

Splitting implementation by script family is possible, but it would require
temporary dual-path compatibility and more churn. A single implementation PR is
preferable once this plan is approved because the change is mechanical and
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
- replacement layout guard for deleted `sync-cleaned`
- npm pack payload check confirms package contents are unchanged for consumers
- layout guard confirms root `data/` is absent
- no release workflow, docs, package scripts, or PR templates reference deleted
  `sync-cleaned`, `verify:excel`, `verify:mihoyo-da`, or
  `verify:buhflipexplode-da` commands unless the implementation deliberately
  keeps a rewritten replacement command

## Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| Raw source accidentally enters npm payload | Keep package `files` allowlist, pack payload tests, and package-size guard. |
| Deleted source breaks local tests | Migrate tests to nanoka/current cleaned artifacts or decision logs before deletion. |
| Runtime fail-loud checks lose archived ids | Keep archived/deleted source ids in code or a retired-source registry used by runtime validation. |
| Audit metadata points to removed paths | Rewrite `data/cleaned/...`, `data/source/...`, and `sha256:see-data/...` strings as part of the migration. |
| Large mechanical diff hides behavior changes | Plan review first; implementation PR must remain path/policy-only and keep calculator semantics unchanged. |
| Docs become stale | Update package README, data-source docs, release docs, decision logs, architecture docs, and docs index. |
| Release loses a guard when `sync-cleaned` is deleted | Replace mirror check with canonical layout + pack payload guards before removing the command. |

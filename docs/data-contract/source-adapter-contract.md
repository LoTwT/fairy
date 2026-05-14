# Source Adapter Contract

Status: Phase 1 draft
Owner: @TechLead
Related task: task #117

This contract defines the migration boundary for replacing the stopped Excel
source. It extends the existing source metadata contract without changing runtime
cleaned data in Phase 1.

## Pipeline Layers

```text
raw snapshot -> normalized candidate -> cleaned adapter -> golden replay
```

### 1. Raw Snapshot

Raw snapshots are immutable files fetched from a public source and archived with
enough metadata to re-run parsing offline.

Required metadata:

- `sourceId`
- `url`
- `fetchedAt`
- `contentHash`
- `httpStatus`
- `effectiveUrl`
- `parserVersion`
- `server`
- `releaseChannel`
- `sourceVersion`

Rules:

- Phase 1/2 tests must not require live network access once a snapshot exists.
- `server` must be `live` and `releaseChannel` must be `stable` for rows that can
  enter npm payload.
- Beta, CBT, leak, datamine, private API, or unreleased rows must enter a
  `forbiddenRows` report, not cleaned data.

### 2. Normalized Candidate

A normalized candidate is source-derived and schema-shaped, but not trusted as
runtime data.

It must contain:

- `entityType`
- `entityId`
- `sourceRefs[]`
- `fields`
- `missingFields[]`
- `deferredRows[]`
- `i18nCoverage`
- `sourceWarnings[]`

`missingFields` must be machine-readable:

```ts
interface MissingField {
  path: string
  reason:
    | "not-present-in-source"
    | "present-but-rounded"
    | "present-but-unmapped"
    | "blocked-by-release-channel"
    | "blocked-by-license"
    | "requires-manual-ruling"
  sourceId: string
  sourceAnchor?: string
}
```

### 3. Cleaned Adapter

The cleaned adapter can only promote normalized candidates into formal data when:

- source registry validation passes;
- all required fields are present or explicitly deferred by Product/QA ruling;
- source refs point to immutable raw snapshots;
- no promoted row has `redistributionRisk: "forbidden"` or
  `releaseChannel != "stable"`;
- parser output is deterministic and snapshot-tested.

Natural-language text may only be used for wording, i18n, and condition labels.
Numeric multipliers must come from deterministic numeric fields or deterministic
label/value templates. LLM extraction must not generate formal numeric values.

### 4. Golden Replay

Golden replay remains downstream of cleaned data. Source migration must not
rewrite G01-G26 expected values in the same PR as source cutover.

Phase 4 adds new proof anchors:

- G27: one latest released agent from the new source.
- G28: one latest released Bangboo from the new source.

Historical Excel source refs remain release evidence. Parallel new-source refs
can be added only after source stability is proven.

## Source Registry

Add `data/source-registry.json` before any new source can enter npm payload.

Required source-level fields:

```ts
interface SourceRegistryEntry {
  sourceId: string
  kind: "wiki" | "official-api" | "community-tool" | "user-snapshot"
  url: string
  license: string
  tosStatus: "audited-allow" | "audited-deny" | "pending-audit"
  redistributionRisk:
    | "permitted"
    | "accepted-by-owner"
    | "cross-check-only"
    | "forbidden"
  redistributionRiskRef: string
  scope: "numeric-primary" | "da-only" | "cross-check" | "forbidden"
  server: "live" | "beta" | "cbt" | "unknown"
  releaseChannel: "stable" | "beta" | "pre-release" | "unknown"
  version: string
  firstFetchedAt: string
  lastVerifiedAt: string
  contentHash: string
  takedownPath: string
  fallbackPlan: string
}
```

Rules:

- `accepted-by-owner` must cite D-20 in `redistributionRiskRef`.
- `cross-check-only` rows must not ship in npm payload.
- `forbidden` rows must never enter runtime cleaned data.
- Unknown license/TOS status is allowed in Phase 1 audit artifacts only.

## Drift Report

Field-level diff status values:

- `same`
- `changed`
- `missing-in-new`
- `missing-in-excel`
- `semantic-unknown`

Do not collapse entity status when only some fields are covered. For example,
Bangboo skill multiplier can be `same` while anomaly buildup is
`missing-in-new`.

Each diff row must include:

- `entityType`
- `entityId`
- `fieldPath`
- `excelValue`
- `candidateValue`
- `status`
- `sourceId`
- `sourceAnchor`
- `promotable`
- `blockedBy`
- `notes`

`status: "same"` is value parity only. It must not imply that a source row can
enter cleaned data. A candidate with matching values can still be
`promotable: false` when it fails source gates such as beta branch, forbidden
redistribution risk, or missing release-channel evidence.

## CI Gates

Future implementation should add these checks before cutover:

- `verify:source-registry`: validates source registry completeness and release
  channel restrictions.
- `audit:source-migration`: regenerates normalized candidate snapshots and field
  diff report.
- `verify:data-source-migration-fixtures`: validates the QA fixture pack for one
  agent, one Bangboo, one enemy, and one complex skill text.

Release must fail loud when:

- a cleaned row references an unknown `sourceId`;
- a promoted row is from beta/pre-release/datamine source;
- a required field is silently defaulted to `0`, empty string, or stale Excel;
- `missingFields` / `deferredRows` changes without a checked-in diff update.

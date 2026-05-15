# Data Source Ingestion

Status: V0.1.0 nanoka runtime cutover baseline + V1.2.1 Bangboo batch import
Owner: @TechLead
Inputs: CONFIRM-4, CONFIRM-11, D-20, Phase 2 nanoka adapter, Phase 3 drift audit, Phase 4 runtime cutover

This directory records the source-ingestion boundary for `@randomplay/data`.
The current runtime source is approved-live nanoka. Earlier Excel, Mihoyo D-17,
and buhflipexplode D-12 snapshots remain retained audit references only; runtime
cleaned data and package exports fail loud if they reference those archived
source ids. V1.2.1 extends the runtime Bangboo catalog to all 39 approved-live
nanoka 2.8 entries without adding a package version bump.

## Segment 1 Scope

- Define `@randomplay/data` source descriptors for the lo-user Excel workbook,
  Mihoyo ZZZ wiki Critical Assault page, and buhflipexplode Deadly Assault page.
- Provide adapter interfaces for future Excel/crawler readers.
- Validate `SourceDocument` and empty `GameData` metadata against
  `@randomplay/core`.
- Record robots.txt / ToS observations and conservative fetch rules.

## Source Snapshot Scope

- Runtime formal `GameData` is generated from reviewed source documents.
- `data/cleaned/runtime/game-data.json` and the package mirror are the current
  runtime cleaned artifacts.
- `data/cleaned/audit/nanoka-bangboo-batch-audit.json` records the V1.2.1
  per-entry Bangboo panel/skill/element audit.
- Raw source archives are retained for audit and are not distributed in npm
  package payloads.

Formal V0.1.0 data must be generated from reviewed source documents and keep
`sourceId`, `sourceVersion`, `parsedAt` / `fetchedAt`, `parserVersion`, and
anchors. Hand-written values may exist only in QA fixtures, not in published
runtime data.

## Source Registry

| Source ID | Kind | Current status | Formal data ready | Notes |
|---|---|---:|---:|---|
| `nanoka-zzz` | `thirdPartySite` | runtime-primary | yes | Approved-live `2.8` source for V0.1.0 runtime cleaned data and V1.2.1 Bangboo batch import. |
| `lo-user-excel` | `excel` | deprecated runtime archive | audit only | Workbook committed under `data/source/excel/` with hash metadata. |
| `mihoyo-zzz-critical-assault` | `mihoyoWiki` | deprecated runtime archive | audit only | Public API snapshot retained for DA detail text and zh/en source-text alignment. |
| `buhflipexplode-zzz-da` | `thirdPartySite` | deprecated runtime archive | audit only | Live-only source snapshot retained; D-12 forbids copying GPL JS into Fairy runtime. |

Implementation entry: `packages/data/src/sources.ts`.

Source-specific notes:

- [Excel workbook](excel/)
- [buhflipexplode Deadly Assault](buhflipexplode/)
- [Mihoyo Deadly Assault](mihoyo/)
- [Source migration candidates](source-migration-candidates.md)
- [Source decision recommendation](source-decision-recommendation.md)
- [Nanoka coverage matrix](nanoka-coverage-matrix.md)
- [Nanoka DA / Sentinel / patch history feasibility](da-sentinel-patch-nanoka-feasibility.md)
- [Takedown and rollback runbook](takedown-rollback.md)

## Current Runtime Gates

- `pnpm --filter @randomplay/data verify:nanoka`
- `pnpm --filter @randomplay/data verify:nanoka-runtime`
- `pnpm --filter @randomplay/data verify:source-registry`
- `pnpm --filter @randomplay/data verify:source-migration -- --sync-id phase3-sync-002-g27-g28`
- `pnpm --filter @randomplay/data verify:golden-v1`
- data package pack dry-run: runtime/golden/audit artifacts included, raw
  source archives excluded

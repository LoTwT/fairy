# Data Source Ingestion

Status: S5 segment 1 baseline
Owner: @TechLead
Inputs: CONFIRM-4, CONFIRM-11, task #31, TL-4 scraper preparation

This directory records the source-ingestion boundary for `@fairy/data`.
Segment 1 is intentionally a skeleton: it defines source descriptors, adapter
interfaces, metadata rules, and crawler compliance notes before any formal game
data is generated.

## Segment 1 Scope

- Define `@fairy/data` source descriptors for the lo-user Excel workbook,
  Mihoyo ZZZ wiki Critical Assault page, and buhflipexplode Deadly Assault page.
- Provide adapter interfaces for future Excel/crawler readers.
- Validate `SourceDocument` and empty `GameData` metadata against
  `@fairy/core`.
- Record robots.txt / ToS observations and conservative fetch rules.

## Out Of Scope For This PR

- No Excel workbook is committed.
- No formal `GameData` rows are hand-written.
- No production crawler performs network fetching.
- No cleaned agent, skill, W-Engine, Drive Disc, enemy, or rule data is
  published.

Formal V1 data must be generated from reviewed source documents and keep
`sourceId`, `sourceVersion`, `parsedAt` / `fetchedAt`, `parserVersion`, and row
anchors. Hand-written values may exist only in QA fixtures, not in
`@fairy/data` published data.

## Source Registry

| Source ID | Kind | Current status | Formal data ready | Notes |
|---|---|---:|---:|---|
| `lo-user-excel` | `excel` | waiting for upload | no | Workbook path/version/hash to be recorded after lo-user provides the file. |
| `mihoyo-zzz-critical-assault` | `mihoyoWiki` | discovery only | no | Public wiki page reachable; robots.txt not found on 2026-05-05. |
| `buhflipexplode-zzz-da` | `thirdPartySite` | discovery only | no | Public page reachable; data asset endpoints identified; redistribution requires review. |

Implementation entry: `packages/data/src/sources.ts`.

## Next Segment

Once the Excel file is available and Product/human review accepts the source
usage policy, S5 segment 2 should add:

- Excel reader with sheet/column discovery and workbook hash versioning.
- Mihoyo and buhflipexplode fetchers with cached snapshots and conditional
  request support.
- Raw record schemas and transforms into `GameData`.
- Golden-anchor source coverage for the 23 fixture cases.
- Negative validation that formal modifiers and formal rows cannot miss source
  metadata.

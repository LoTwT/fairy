# Data Source Ingestion

Status: S5 segment 2 source baseline
Owner: @TechLead
Inputs: CONFIRM-4, CONFIRM-11, task #31, TL-4 scraper preparation

This directory records the source-ingestion boundary for `@fairy/data`.
Segment 1 defined source descriptors, adapter interfaces, metadata rules, and
crawler compliance notes. Segment 2 starts adding retained source snapshots and
offline verification gates before formal cleaned game data is generated.

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
| `lo-user-excel` | `excel` | source retained | no | Workbook committed under `data/source/excel/` with hash metadata. |
| `mihoyo-zzz-critical-assault` | `mihoyoWiki` | discovery only | no | Public wiki page reachable; robots.txt not found on 2026-05-05. |
| `buhflipexplode-zzz-da` | `thirdPartySite` | source retained / ready for adapter | no | Live-only source snapshot retained; D-12 forbids copying GPL JS into Fairy runtime. |

Implementation entry: `packages/data/src/sources.ts`.

Source-specific notes:

- [buhflipexplode Deadly Assault](buhflipexplode/)

## Next Segment

S5 segment 2 should continue with:

- Excel reader with sheet/column discovery and workbook hash versioning.
- Mihoyo fetcher with cached snapshots and conditional request support.
- buhflipexplode transforms from the retained live-only snapshot into cleaned
  Deadly Assault data and parity fixtures.
- Raw record schemas and transforms into `GameData`.
- Golden-anchor source coverage for the 23 fixture cases.
- Negative validation that formal modifiers and formal rows cannot miss source
  metadata.

# Data Source Ingestion

Status: S5 segment 2 source baseline
Owner: @TechLead
Inputs: CONFIRM-4, CONFIRM-11, task #31, TL-4 scraper preparation

This directory records the source-ingestion boundary for `@randomplay/data`.
Segment 1 defined source descriptors, adapter interfaces, metadata rules, and
crawler compliance notes. Segment 2 starts adding retained source snapshots and
offline verification gates before formal cleaned game data is generated.

## Segment 1 Scope

- Define `@randomplay/data` source descriptors for the lo-user Excel workbook,
  Mihoyo ZZZ wiki Critical Assault page, and buhflipexplode Deadly Assault page.
- Provide adapter interfaces for future Excel/crawler readers.
- Validate `SourceDocument` and empty `GameData` metadata against
  `@randomplay/core`.
- Record robots.txt / ToS observations and conservative fetch rules.

## Source Snapshot Scope

- No formal `GameData` rows are hand-written.
- No cleaned agent, skill, W-Engine, Drive Disc, enemy, or rule data is
  published.

Formal V1 data must be generated from reviewed source documents and keep
`sourceId`, `sourceVersion`, `parsedAt` / `fetchedAt`, `parserVersion`, and row
anchors. Hand-written values may exist only in QA fixtures, not in
`@randomplay/data` published data.

## Source Registry

| Source ID | Kind | Current status | Formal data ready | Notes |
|---|---|---:|---:|---|
| `lo-user-excel` | `excel` | source retained | no | Workbook committed under `data/source/excel/` with hash metadata. |
| `mihoyo-zzz-critical-assault` | `mihoyoWiki` | source retained / ready for adapter | no | Public API snapshot retained for DA detail text and zh/en source-text alignment. |
| `buhflipexplode-zzz-da` | `thirdPartySite` | source retained / ready for adapter | no | Live-only source snapshot retained; D-12 forbids copying GPL JS into Fairy runtime. |

Implementation entry: `packages/data/src/sources.ts`.

Source-specific notes:

- [Excel workbook](excel/)
- [buhflipexplode Deadly Assault](buhflipexplode/)
- [Mihoyo Deadly Assault](mihoyo/)

## Next Segment

S5 segment 2 should continue with:

- Excel reader with sheet/column discovery and workbook hash versioning. Current
  baseline: `data/source/excel/workbook-audit.json`.
- Mihoyo transforms from the retained detail snapshot into Deadly Assault
  i18n/mapping resources and typed-modifier review queues.
- buhflipexplode transforms from the retained live-only snapshot into cleaned
  Deadly Assault data and parity fixtures.
- Raw record schemas and transforms into `GameData`.
- Golden-anchor source coverage for the current 22-anchor executable fixture
  scope.
- Negative validation that formal modifiers and formal rows cannot miss source
  metadata.

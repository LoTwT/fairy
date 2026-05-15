# Source Metadata Contract

Status: V0.1.0 runtime metadata contract
Owner: @TechLead
Related contracts: `docs/data-contract/game-data.md`

`@randomplay/data` publishes cleaned `GameData`, not raw source files. Every cleaned
row must retain enough metadata to reconstruct where it came from and which
parser/version produced it.

## SourceDocument

Each source snapshot is represented as a `SourceDocument`:

```ts
interface SourceDocument {
  id: string
  kind: "excel" | "mihoyoWiki" | "thirdPartySite" | "manualReview"
  url?: string
  fileName?: string
  gameVersion?: string
  sourceVersion: string
  fetchedAt?: string
  parsedAt: string
  parserVersion: string
  licenseNote?: string
}
```

Rules:

- `id` must match a registered source descriptor.
- `sourceVersion` must be stable for the source snapshot. Prefer workbook hash,
  HTTP ETag, HTTP Last-Modified, or payload hash.
- `parsedAt` is required for every source. `fetchedAt` is required for network
  sources once real fetchers exist.
- `parserVersion` must change when parser logic changes in a way that can alter
  cleaned output.
- `licenseNote` records usage constraints; it is not a legal clearance.

## SourceRef

Every formal data row and formal modifier must point back to a `SourceRef`:

```ts
interface SourceRef {
  sourceId: string
  sourceAnchor?: string
  sourceVersion?: string
  dataPath?: string
}
```

Rules:

- `sourceId` must match a `SourceDocument.id`.
- `sourceVersion` should be copied when a row can survive across multiple source
  snapshots.
- `sourceAnchor` should be the closest source-local row/cell/asset path, such as
  `Agents!A42`, `da-versions.json#versionEnemies[0]`, or a wiki page slug.
- `dataPath` should point to the cleaned destination path, such as
  `agents.yixuan.skillIds[0]`.

## Formal Data Boundary

Formal data is any row that ships from `@randomplay/data` as canonical game data:

- agents
- skills and skill segments
- W-Engines
- Drive Discs
- enemies
- Resonium
- modifier templates
- rule tables
- aliases derived from source terms

Formal data must not be typed by hand. A row can enter `@randomplay/data` only after
the parser has linked it to a source document and source anchor. Manual review
may approve or reject source-derived rows, but `manualReview` is not a source for
inventing values.

QA fixtures under `fixtures/golden/` are separate. They may be hand-authored and
reviewed because they are test assertions, not published game data.

## Runtime Implementation

`packages/data` currently exposes:

- source descriptors with fetch/compliance policy;
- helpers for building `SourceDocument` and `SourceRef`;
- nanoka source verification and runtime `GameData` generation scripts;
- package-local cleaned JSON mirrors for npm distribution;
- runtime policy guards that reject archived source ids in runtime cleaned data.

V0.1.0 runtime formal data is generated from approved-live nanoka snapshots.
Archived Excel, Mihoyo D-17, and buhflipexplode D-12 snapshots remain audit
references only.

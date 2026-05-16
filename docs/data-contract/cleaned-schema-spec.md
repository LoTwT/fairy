# Cleaned Schema Spec

Status: S5 design draft
Owner: @TechLead
Reviewers: @lo-user, @Product, @UX, @QA
Related tasks: task #47, task #49
Inputs: D-05-rev, D-11, D-12, D-13, D-14, D-15, D-16,
S5 cleaned schema discussion

This document defines the V1 `@randomplay/data` cleaned-data contract after the
2026-05-05 cleaned schema discussion. It is a docs-only design. It does not
implement #40, #42, or #43.

Product owns the [meeting minutes](../product/meetings/2026-05-05-cleaned-schema-design.md)
and decision log in task #49. This document turns those decisions into technical
contracts for `@randomplay/data`, `@randomplay/core`, and `@randomplay/cli`.

Final Product decision anchors:

- [D-13 V1 scope narrows to Deadly Assault](../product/decisions/index.md#d-13-v1-范围收窄到危局强袭战)
- [D-14 typed modifier cleaned data](../product/decisions/index.md#d-14-cleaned-data-typed-modifier-双层结构)
- [D-15 V1 package exports](../product/decisions/index.md#d-15-v1-package-exports-4-入口)
- [D-16 source priority and unknown policy](../product/decisions/index.md#d-16-source-priority--multi-source-metadata--unknown-policy)

## 1. Scope Decisions

### 1.1 V1 Target

V1 focuses on Hollow Zero Assault / Deadly Assault data.

- `deadly-assault` is an independent cleaned domain.
- Future game modes also start as independent domains. A common event interface
  should be extracted only after a second domain lands.
- Global `cleaned/enemies` is not a V1 release requirement.
- Excel `敌人属性` is retained as a source archive and fallback source. It is not
  fully cleaned in V1 unless a V1 calculation/golden case requires a minimal
  subset.
- V1 golden-data release coverage was narrowed to 19 anchors. V1.x Track B has
  added anchors 13, 18, 19, and 20 as executable replay anchors; V1.1 Bangboo
  B1/B2/B3 add anchors 24, 25, and 26.

V1.x anchor status:

| Anchor | Status |
|---|---|
| 13 special threshold multipliers | Implemented in executable replay using sourced `anomalyThresholdModifiers[]` composition. |
| 18 part-break true damage examples | Implemented in executable replay using Excel non-DA enemy data plus guide §1.1 part-break multiplier table. |
| 19 daze recovery example: 凶心疯汉 | Implemented in executable replay using Excel base recovery rate plus guide §2.3.2 recovery-rate modifier composition. |
| 20 daze recovery example: 装甲哈提 | Implemented in executable replay using Excel base recovery rate plus guide §2.3.2 recovery-rate modifier composition; replay notes the guide's `1/11.58%` denominator typo. |
| 24 Penguinboo numeric Bangboo actor | Implemented in executable replay using Excel Bangboo panel and skill numeric rows; no element or passive/team-buff behavior is inferred. |
| 25 Sharkboo numeric Bangboo actor | Implemented in executable replay using Excel Bangboo panel and skill numeric rows; no element or passive/team-buff behavior is inferred. |
| 26 Plugboo numeric Bangboo actor | Implemented in executable replay using Excel Bangboo panel and skill numeric rows; no element or passive/team-buff behavior is inferred. |

### 1.2 Source Priority

| Source | V1 role |
|---|---|
| buhflipexplode | Primary source for Deadly Assault period, boss-slot, buff, multiplier, and algorithm snapshot data. |
| Mihoyo wiki | Chinese labels, Chinese descriptions, period detail text, and zh/en mapping support for Deadly Assault. |
| Excel | Base game data source and fallback. In V1, it can provide minimal records only when a required calculation path cannot proceed without them. |

Conflicts never resolve by silent overwrite. A conflict becomes an unresolved
issue and must fail loud when it affects calculation, source traceability, or
period/boss matching.

### 1.3 Non-Goals

V1 does not:

- fully clean the Excel enemy table;
- fully support generic enemy presets;
- simulate timelines, rotations, or duration countdowns;
- copy or execute buhflipexplode GPL JavaScript in MIT runtime packages;
- let AI-generated effect interpretations enter cleaned data without human
  acceptance and validation.

## 2. Published Layout

`packages/data/cleaned/` is the package-owned canonical cleaned artifact
directory and the source of the `@randomplay/data` published JSON payload.

```text
packages/data/cleaned/
  index.json
  deadly-assault/
    index.json
    periods.json
    bosses.json
    buffs.json
    unresolved.json
  i18n/
    deadly-assault.zh.json
    deadly-assault.en.json

packages/data/src/i18n/
  deadly-assault.zh.json
  deadly-assault.en.json

packages/data/cleaned/
  ... mirrored release payload ...

packages/data/src/types/
  cleaned-data.ts
  deadly-assault.ts
  i18n.ts
```

### 2.1 Package Exports

V1 must expose four import surfaces:

| Export | Purpose |
|---|---|
| `@randomplay/data/cleaned` | Total cleaned-data entry. |
| `@randomplay/data/cleaned/<domain>` | Domain entry, for example `@randomplay/data/cleaned/deadly-assault`. |
| `@randomplay/data/types` | TypeScript types for cleaned data and source metadata. |
| `@randomplay/data/cleaned/i18n/<domain>` | Game-label i18n resources, for example `deadly-assault`. |

Implementation may expose JSON files directly or TypeScript entrypoints that
load/re-export JSON. The path contract is stable; the exact bundling mechanism
is an implementation detail.

### 2.2 i18n Boundary

Game labels and source descriptions belong to the data package:

- source of truth: `packages/data/src/i18n/<domain>.{zh,en}.json`
- package payload: `packages/data/cleaned/i18n/<domain>.{zh,en}.json`

Runtime error messages stay in the UX catalog:

- `docs/ux/i18n/messages.zh.json`
- `docs/ux/i18n/messages.en.json`

Data i18n files must not reference `ERR-*` keys. If data loading or mapping
fails, the data package emits diagnostics using the runtime catalog.

## 3. Artifact Envelope

Every cleaned artifact uses the same envelope:

```ts
interface CleanedArtifact<TData> {
  kind: "deadlyAssault" | "gameData" | "gameLabelI18n" | "sourceManifest"
  schemaVersion: string
  dataVersion: string
  gameVersion: string
  sourceVersion: string
  generatedAt: string
  parserVersion: string
  sources: SourceDocument[]
  unresolved: UnresolvedIssue[]
  data: TData
}
```

Rules:

- `sources[]` lists every source snapshot used by the artifact.
- `sourceVersion` is stable for the source snapshot, such as a workbook hash,
  ETag, Last-Modified value, or payload hash.
- `parserVersion` changes whenever parser logic can change cleaned output.
- `unresolved[]` is machine-readable. Blocking unresolved issues prevent release
  of a trustworthy V1 cleaned artifact.

## 4. Source Metadata

### 4.1 Entity-Level Source List

Every domain record carries entity-level source refs:

```ts
interface SourceTrackedRecord {
  sources: SourceRef[]
}
```

`sources[]` explains which source documents contributed to the record. It is not
enough for calculation-critical numeric fields.

### 4.2 Field-Level Source Refs

Calculation-critical fields must carry field-level refs:

```ts
interface FieldSourceMap {
  [jsonPointer: string]: SourceRef[]
}
```

Examples:

```json
{
  "/periods/2.7.3/slots/0/hpMultiplier": [
    {
      "sourceId": "buhflipexplode.da.2026-05-05T0445Z",
      "sourceAnchor": "da-versions.live.json#2.7.3.versionHPMult[0]",
      "sourceVersion": "sha256:..."
    }
  ],
  "/buffs/69000000/effects/0/params/value": [
    {
      "sourceId": "buhflipexplode.da.2026-05-05T0445Z",
      "sourceAnchor": "buffs.live.json#69000000[2]"
    }
  ]
}
```

Fields requiring field-level source refs in V1:

- period time range;
- boss slot enemy id;
- HP / daze / anomaly multipliers;
- boss base HP / DEF / daze / anomaly values when used for calculation;
- buff numeric values;
- parsed modifier `params`;
- every `baseEnemyRef` or unresolved mapping assertion;
- zh/en label mapping where Mihoyo and buhflipexplode are joined.

## 5. Deadly Assault Domain

### 5.1 Shape

```ts
interface DeadlyAssaultData {
  periods: Record<string, DeadlyAssaultPeriod>
  bosses: Record<string, DeadlyAssaultBoss>
  buffs: Record<string, DeadlyAssaultBuff>
  algorithm: DeadlyAssaultAlgorithmRef
}
```

The domain is source-centered. It can reference base `GameData` records, but it
does not require global `GameData.enemies` to be complete in V1.

### 5.2 Periods

```ts
interface DeadlyAssaultPeriod extends SourceTrackedRecord {
  id: string
  sourceVersionId: string
  label: LocalizedLabel
  startsAt?: string
  endsAt?: string
  buffIds: string[]
  slots: DeadlyAssaultBossSlot[]
  anomalyMultiplier?: number
  fieldSources: FieldSourceMap
}

interface DeadlyAssaultBossSlot {
  slotIndex: 0 | 1 | 2
  externalBossId: string
  baseEnemyRef?: string
  unresolvedMapping?: UnresolvedMapping
  hpMultiplier: number
  dazeMultiplier: number
  anomalyMultiplier?: number
  sourceRefs: SourceRef[]
}
```

`externalBossId` is the buhflipexplode enemy id. `baseEnemyRef` is optional in
V1. When no safe Excel/global enemy mapping exists, the slot keeps
`externalBossId` and records `unresolvedMapping`.

Unresolved mapping does not block raw/source archive or DA-domain publication by
itself. It becomes blocking when a V1 calculation or golden case needs a global
enemy field that cannot be derived from the DA source.

### 5.3 Bosses

```ts
interface DeadlyAssaultBoss extends SourceTrackedRecord {
  externalBossId: string
  label: LocalizedLabel
  baseEnemyRef?: string
  unresolvedMapping?: UnresolvedMapping
  baseStatsBySide?: {
    hp?: [number, number, number]
    defense?: [number, number, number]
    daze?: [number, number, number]
    anomaly?: number
  }
  elementMultipliers?: number[]
  tags?: string[]
  sourceText?: SourceTextBlock[]
  modifiers?: CleanedModifier[]
  unparsedEffects?: UnparsedEffect[]
  fieldSources: FieldSourceMap
}
```

`elementMultipliers` keeps the source order until the parser can prove the
attribute mapping. The implementation must not guess attribute order.

### 5.4 Buffs

```ts
interface DeadlyAssaultBuff extends SourceTrackedRecord {
  id: string
  label: LocalizedLabel
  iconKey?: string
  sourceText: SourceTextBlock[]
  localizedText?: LocalizedTextBlock[]
  modifiers: CleanedModifier[]
  unparsedEffects: UnparsedEffect[]
  fieldSources: FieldSourceMap
}
```

Buffs can be published with `unparsedEffects[]` only when every unresolved effect
is non-blocking. A buff effect that affects calculation and cannot be parsed
blocks V1 release until a handler/template/manual acceptance exists.

### 5.5 Algorithm Ref

```ts
interface DeadlyAssaultAlgorithmRef {
  snapshotId: string
  algorithmManifestPath: string
  acceptedManifestPath: string
  algorithmChanged: boolean
  sourceRefs: SourceRef[]
}
```

D-12 remains authoritative:

- fetch mode records live source snapshots manually during release;
- verify mode runs offline in CI;
- hash or selected algorithm-section drift fails loud;
- Fairy independently implements equivalent logic and does not copy GPL JS into
  runtime packages.

## 6. Text-To-Modifier Pipeline

### 6.1 Three Layers

Cleaned data preserves three layers:

| Layer | Field | Purpose |
|---|---|---|
| Source text | `sourceText` / `localizedText` | Display, audit, zh/en mapping, and manual review. |
| Calculation | `modifiers[]` / `calculationEffects[]` | Core-consumable typed effects. |
| Risk | `unparsedEffects[]` | Effects that could not be safely represented. |

Core never parses natural-language text. It consumes typed modifiers only.

### 6.2 Source Text

```ts
interface SourceTextBlock {
  id: string
  language: "en" | "zh" | "unknown"
  text: string
  format?: "plain" | "html" | "bbcode"
  sourceRef: SourceRef
  sourceTextHash: string
}

interface LocalizedTextBlock {
  id: string
  language: "zh" | "en"
  text: string
  sourceRef: SourceRef
  sourceTextHash: string
}
```

HTML or BBCode source is allowed in the source layer if it is source-derived.
Renderers must sanitize before display. Calculation never depends on raw markup.

### 6.3 Cleaned Modifiers

```ts
interface CleanedModifier {
  id: string
  label?: LocalizedLabel
  handlerId?: string
  bucket?: MultiplierBucket
  operation: "add" | "multiply" | "override" | "set"
  params: Record<string, unknown>
  appliesTo: TargetSelector
  when?: Condition
  priority?: number
  stackingGroup?: string
  requiresActivation?: boolean
  activeByDefault?: boolean
  sourceRefs: SourceRef[]
  sourceTextHash?: string
  parserVersion: string
  effectTemplateId?: string
  manualAcceptance?: ManualAcceptance
}
```

Rules:

- `bucket` is a controlled enum matching glossary v0.4 / D-11 and the core
  multiplier bucket registry. No free strings.
- `handlerId` must resolve to a registered deterministic handler when present.
- `operation` describes the normalized data effect. Resolver/runtime handlers
  may compile it to existing core contributor operations.
- `requiresActivation: true` means data does not assume the effect is active.
  The user snapshot, CLI, AI adapter, or future UI must explicitly activate it.
- `requiresActivation: true` and `activeByDefault: true` are mutually
  exclusive. The former means explicit user/scenario activation is required.
- Time-window effects such as "within 3 seconds" are V1 `requiresActivation`
  effects. V1 does not simulate duration countdowns.
- `manualAcceptance` is required when a human accepted a parser/AI-suggested
  mapping that was not fully deterministic.

### 6.4 Manual Acceptance

```ts
interface ManualAcceptance {
  acceptedAt: string
  acceptedBy: string
  reason: string
  sourceRefs: SourceRef[]
}
```

Manual acceptance can approve source-derived interpretation. It cannot invent
formal values without a source anchor.

### 6.5 Unparsed Effects

```ts
interface UnparsedEffect {
  id: string
  severity: "blocking" | "nonBlocking"
  reason:
    | "unknownTextPattern"
    | "unknownBucket"
    | "unknownHandler"
    | "ambiguousCondition"
    | "ambiguousTarget"
    | "localeMappingUnresolved"
    | "sourceConflict"
  sourceText: string
  sourceRefs: SourceRef[]
  sourceTextHash: string
  parserVersion: string
}
```

Blocking unparsed effects prevent release when they can affect calculation,
period/boss matching, source traceability, or V1 golden coverage. Non-blocking
issues can ship only when they affect display text or optional metadata, and
they must appear in the artifact manifest.

### 6.6 Parser Rules

The pipeline is deterministic first:

1. Parse fixed table fields.
2. Apply parser/template registry for known source text patterns.
3. Validate bucket, operation, handler, target selector, condition, and source
   refs.
4. Emit `unparsedEffects[]` for anything ambiguous.
5. Allow AI-assisted candidates only as review input. A candidate enters cleaned
   data only after schema validation, golden/parity checks, and
   `manualAcceptance`.

Each parsed modifier records:

- `sourceTextHash`;
- `parserVersion`;
- `effectTemplateId` when a template matched;
- `sourceRefs`;
- `manualAcceptance` when needed.

When source text or parser version changes, the pipeline must fail loud or
re-parse. It must not silently reuse a stale modifier.

## 7. Diagnostics And Unknown Policy

Unknowns are split into two severities:

| Severity | Meaning | Release behavior |
|---|---|---|
| `blocking` | Affects calculation, matching, source traceability, V1 golden coverage, or trusted modifier output. | Blocks cleaned release. |
| `nonBlocking` | Pure display/description gap that does not affect calculation. | May release with warning and manifest entry. |

Diagnostic contract open items for UX catalog:

| Key | Trigger |
|---|---|
| `ERR-DAT-005` | Multi-source conflict or blocking unparsed modifier/effect. |
| `ERR-DAT-006` | Locale mapping unresolved, including Mihoyo/buhflipexplode period or boss mapping failures. |

The schema design PR intentionally records these as catalog follow-up items. UX
will add zh/en messages after the diagnostic placeholders are locked.

## 8. Mihoyo Mapping

The retired Mihoyo source snapshot
`git-history:data/source/raw/mihoyo/zzz-da/2026-05-05T0850Z/` confirmed that
channel `108` and Deadly Assault detail text were available through public JSON
APIs.

V1 implementation rules:

- Fetch channel 13 public list JSON and derive the channel 108 period
  `content_id` values from the list. Do not hard-code detail ids.
- Fetch detail pages with `entry_page?app_sn=zzz_wiki&entry_page_id={id}&lang=zh-cn`.
- Send header `x-rpc-wiki_app: zzz`; without it, the API can return unrelated
  cross-namespace content for the same numeric id.
- Direct HTML fetch is a Nuxt shell and does not contain the required detail
  text. The retired D-17 parser used HTML fragments embedded in JSON component
  data, not the page shell.
- Extract and anchor three selectable buffs, three boss descriptions/attributes,
  and three boss-room field/mechanism text blocks for the latest period and
  retained source history.
- If API shape, component structure, or zh/en mapping drifts, emit unresolved
  mapping. Blocking unresolved issues prevent cleaned release.
- If a future source drift requires browser rendering, pause and ask lo-user
  before adding Playwright/Puppeteer as a production crawler dependency.

Mihoyo data is used for Chinese labels, descriptions, and period/boss/buff
source text. It is not the primary source for numeric DA multipliers unless a
numeric field is explicitly anchored and reviewed.

## 9. Validation Gates

V1 cleaned-data implementation must add tests for these gates:

- package dry-run includes cleaned JSON and i18n payloads;
- package dry-run excludes `packages/data/source`, raw HTML/JS/JSON, GPL
  license copies, `docs/reference`, Excel, and tests;
- full upstream/non-live DA versions remain excluded from release payloads;
- every calculation-critical field has field-level `sourceRefs`;
- every parsed modifier has a known bucket/handler/operation;
- blocking `unparsedEffects[]` count is zero for V1 release payloads;
- zh/en i18n key sets are aligned for published data i18n resources;
- unresolved mapping is machine-readable and fails golden cases when required
  fields are missing;
- Golden true-data replay uses the executable anchor scope. G13, G18, G19, G20,
  and G24-G26 are now executable anchors, and no golden anchors remain deferred.
- `verify:golden-v1` passes as an offline freshness gate for the generated V1
  agent source candidates, manual acceptance records, and replay report; V1
  release requires zero `ERR-DAT-005` diagnostics, no `pendingHarness` anchors,
  and `releaseReady=true`.

## 10. Implementation Impact

### 10.1 task #40 Excel Reader

V1 no longer requires full Excel enemy cleaning. Excel remains archived and can
be used for minimal fallback records only if a V1 DA/golden path needs them.

The eventual Excel reader still needs to parse:

- agents;
- skills and skill segments;
- Bangboos and Bangboo skills for V1.1 Path X numeric actor segments;
- W-Engines;
- Drive Discs;
- typed modifiers from source text/table rows;
- enemies for V1.x generic enemy coverage.

### 10.2 task #42 Mihoyo Crawler

V1 source ingestion retains Mihoyo Deadly Assault detail snapshots and a
Mihoyo/buhflipexplode zh/en source-text alignment artifact. The implementation
must not infer typed modifiers from natural language in the source snapshot PR.

Later cleaned transforms should produce Deadly Assault i18n/mapping resources,
not UX runtime messages. They must write data i18n resources under
`packages/data/src/i18n/` and sync them to `packages/data/cleaned/i18n/`.

### 10.3 task #43 True-Data Replay

V1 release gate used the narrowed 19-anchor golden scope. V1.x Track B adds G13,
G18, G19, and G20 as executable anchors, and V1.1 Bangboo B1/B2/B3 add G24-G26.
No golden anchors remain deferred.

The first replay harness baseline writes:

- `packages/data/cleaned/audit/v1-agent-source-candidates.json`;
- `packages/data/cleaned/audit/nicole.acceptance.json`;
- `packages/data/cleaned/audit/yanagi.acceptance.json`;
- `packages/data/cleaned/golden/v1-replay-report.json`.

`verify:golden-v1` verifies those retained artifacts without requiring the
retired Excel, Mihoyo D-17, or buhflipexplode D-12 raw archives in the current
tree. The current baseline has 28 executable anchors passed, zero blocking
diagnostics, and `releaseReady=true`. G04 reproduces the guide breakpoint scan,
G09 asserts sourced DA daze ratio display flooring, G10 asserts frost/auric
resistance plus anomaly-buildup-resistance lane mapping, G13 asserts sourced
anomaly-threshold rule composition, G18 asserts sourced
part-break true damage, G19 asserts sourced daze recovery-rate composition for
凶心疯汉, G20 asserts sourced daze recovery-rate composition for 装甲哈提 and
records the guide's `1/11.58%` denominator typo, G22/G23 use lo-user manual
acceptance records for Nicole/Yanagi active-state and polarity-disorder template
semantics, G24 asserts Penguinboo Excel numeric attack-segment contribution,
G25 asserts Sharkboo Excel numeric attack-segment contribution, and G26 asserts
Plugboo Excel numeric attack-segment contribution without inferring Bangboo
element or passive/team-buff behavior. The
polarity-disorder template requires an explicit provider agent in `team` and an
explicit supported skill level (`skillLevels[skillLevelKey]` in 1-16) plus
provider `panel.anomalyProficiency`; missing or out-of-range inputs are
validation failures, not silent level-1 or zero-proficiency fallbacks.

## 11. Review Checklist

Reviewers should check:

- Does the DA domain avoid prematurely expanding global `GameData.events`?
- Is buhflipexplode treated as DA overlay, not as global enemy source-of-truth?
- Are Excel enemies clearly V1 fallback / V1.x expansion, not silently dropped?
- Do parsed modifiers preserve source text and source refs?
- Are time-window effects explicit `requiresActivation` effects?
- Can QA test every fail-loud path without reading implementation internals?
- Are package exports and i18n source/payload paths unambiguous?
- Are Product meeting decisions referenced without duplicating meeting minutes?

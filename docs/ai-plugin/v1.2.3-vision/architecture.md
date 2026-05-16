# AI Plugin V1.2.3 Vision Architecture

Status: V1.2.3 plan draft
Owner: TechLead
Reviewers: Product, UX, QA, lo-user
Related docs: `docs/product/decisions/D-22-ai-plugin-v1.2.3-vision.md`,
`docs/ai-plugin/v1.2.3-vision/user-journeys.md`,
`docs/ai-plugin/v1.2.3-vision/prompt-templates.md`,
`docs/ai-plugin/v1.2.3-vision/acceptance.md`

## Goal

Add a screenshot input path to the existing Fairy AI plugin without changing the
trusted calculation boundary:

> AI reads one supported community-tool image, drafts structured build input,
> asks the user to review/edit, then Fairy CLI validates and calculates.

Vision is an input-structuring layer only. It must not calculate damage, invent
scenario fields, bypass `fairy-snapshot` review, or introduce a parallel
snapshot schema.

## Locked Scope

V1.2.3 MVP supports:

- one image per build by default;
- community-tool aggregate screenshots only;
- two supported layouts:
  - `绝区零工坊`;
  - `米游社`;
- zh UI text in the supported examples;
- extraction into a reviewable draft plus draft metadata;
- strict `BattleSnapshot` output only after user review and any missing scenario
  questions are resolved;
- calculation through `fairy calc <snapshot> --view verbose --lang <zh|en>`.

V1.2.3 MVP does not support:

- raw in-game screenshots;
- multi-image batch ingestion;
- OCR-only fallback as a shipped requirement;
- DA / Bangboo / Resonium-only source screens as first-class layouts;
- storing UID, nickname, QR code content, or other account identifiers in
  `BattleSnapshot`;
- schema-native base/bonus stat decomposition;
- AI plugin compare / `fairy-compare`;
- any model-side damage, daze, anomaly, or compare calculation.

## Component Flow

```text
User image
  |
  v
Host AI model vision support
  |
  v
fairy-snapshot image entry
  |
  +--> source detection: zzz-workshop | miyoushe-record | unknown
  |
  +--> source-specific layout extraction
  |
  +--> VisionExtraction JSON
  |
  +--> partial BattleSnapshot draft + draftMetadata.extractionEvidence
  |
  +--> review/edit gate
  |
  +--> existing fairy-snapshot missing-field policy
          (enemy, attack segment, active scenario, low-confidence fields)
  |
  v
confirmed strict BattleSnapshot
  |
  v
fairy-calc -> fairy CLI -> CalcResult
```

The image normally supplies build composition, not a full calculation scenario.
Enemy, attack segment, active buffs, result mode, and other scenario fields still
come from natural language, user answers, existing defaults already allowed by
V1.2.2, or explicit user confirmation. The model must not silently create those
fields just because the build image parsed successfully.

## Skill Boundary

V1.2.3 should extend `fairy-snapshot` with an image input entry. Do not add a
required `fairy-vision`, `fairy-ocr`, or `fairy-compare` skill in the MVP unless
Product reopens scope.

`fairy-snapshot` image entry:

- accepts one supported image plus optional user text;
- detects the source and extracts fields;
- resolves entities through packaged cleaned runtime data and aliases;
- emits a reviewable build draft and `draftMetadata`;
- asks about missing critical fields before handoff;
- hands the confirmed strict snapshot to `fairy-calc`.

`fairy-calc` remains the only calculation step. `fairy-explain` remains a
consumer of CLI-produced `CalcResult`.

## Source Detection

The first extraction step is source classification. Classification is required
because the two supported images use different layout geometry, labels, and
visual hierarchy.

| Source id | User-facing source | Positive signals | Layout notes |
|---|---|---|---|
| `zzz-workshop` | `绝区零工坊` | Header text `绝区零工坊`; mobile portrait; agent card above W-Engine tile; six compact Drive Disc cards; ACE score block. | Right-side panel stat table uses total plus visible base/bonus for some rows. |
| `miyoushe-record` | `米游社` | `米游社` footer / `绝区零战绩` branding; landscape composite; `AGENT INFO` block; two-column panel stat grid; SSS score block. | Panel stat rows are split across two columns; Drive Disc cards expose roll-count badges. |
| `unknown` | unsupported | Anything not confidently matching the two supported sources. | Must fall back to review-heavy generic extraction or NL dialog; must not produce high-confidence snapshot. |

Source detection output belongs in draft metadata, not in strict
`BattleSnapshot`.

## Extraction Outputs

The extraction layer should produce two artifacts before review:

1. `VisionExtraction`: implementation-facing JSON with source, confidence, and
   raw evidence.
2. Partial `BattleSnapshot` draft: strict-schema fields only, suitable for
   later validation after missing scenario fields are resolved.

Recommended extraction metadata shape:

```ts
interface VisionExtraction {
  schemaVersion: "fairy-vision-extraction-v1"
  source: {
    id: "zzz-workshop" | "miyoushe-record" | "unknown"
    confidence: number
    matchedSignals: string[]
  }
  image: {
    inputCount: 1
    uiLanguage: "zh" | "en" | "ja" | "unknown"
    pii: {
      detected: boolean
      retainedInSnapshot: false
      detectedKinds: Array<"uid" | "nickname" | "qrCode" | "other">
    }
  }
  fields: VisionFieldEvidence[]
  warnings: string[]
}

interface VisionFieldEvidence {
  path: string
  label: string
  rawText?: string
  value: unknown
  confidence: number
  sourceRegion?: string
  display?: {
    total?: number
    base?: number
    bonus?: number
    rollCount?: number
  }
}
```

This is not a public runtime schema yet; it is the plan contract for the
implementation PR. The implementation may refine exact names, but the separation
between strict snapshot and extraction evidence is required.

## BattleSnapshot Schema Mapping

Current `BattleSnapshot` does not distinguish base / bonus / total. The
calculation input is `AgentSnapshot.panel`, a flat, already-resolved stat
snapshot consumed by core. UI import modes must resolve to this shape before
calculation.

Mapping rule:

- strict `BattleSnapshot.team[0].panel.<stat>` receives the total / resolved
  value shown by the source image;
- base+bonus display splits stay in `VisionExtraction.fields[].display`;
- Drive Disc main stat, substat, and roll-count evidence stay in draft metadata
  unless current strict schema has a supported field;
- strict `driveDiscs[]` stores slot and set identity only;
- `fieldProvenance` may point to vision extraction paths, but must not contain
  UID, nickname, local file path, or raw image content.

Example provenance entry:

```json
{
  "team[0].panel.attack": {
    "provenance": "panel",
    "source": {
      "sourceId": "ai-plugin-vision",
      "sourceVersion": "v1.2.3",
      "dataPath": "fields.team[0].panel.attack"
    },
    "reason": "extracted from a supported community-tool screenshot"
  }
}
```

### Common Field Mapping

| Source content | Strict snapshot path | Transformation | Evidence-only notes |
|---|---|---|---|
| Agent name | `team[0].agentId` plus `agentSpecialty` / `attribute` | Resolve via packaged runtime aliases. Fill specialty/attribute from runtime data when available. | Raw visible name and confidence remain in extraction evidence. |
| Agent level | `team[0].level` | Parse integer. | — |
| Mindscape / cinema level | `team[0].mindscapeCinema.level` | Parse visible level. | — |
| W-Engine name | `team[0].wEngine.id` | Resolve via runtime aliases. | Raw visible name stays in evidence. |
| W-Engine level | `team[0].wEngine.level` | Parse integer. | — |
| W-Engine refinement / phase | `team[0].wEngine.phase` | Map visible `精炼1星` / R1-style text to phase `1`. | Store raw label in evidence. |
| Drive Disc set per slot | `team[0].driveDiscs[].slot` and `.setId` | Resolve set name through runtime aliases; preserve slot number. | Main/substat details stay in evidence. |
| Panel HP / ATK / DEF / impact | `team[0].panel.maxHp` / `attack` / `defense` / `impact` | Use total displayed value. | Base+bonus split stays in evidence. |
| Crit rate / crit damage / penetration rate / elemental damage bonus | Decimal panel fields | Convert percent text to decimal (`65%` -> `0.65`). | Keep raw percent text. |
| Flat penetration | `team[0].panel.flatPenetration` | Use numeric value. | — |
| Anomaly mastery / proficiency | `team[0].panel.anomalyMastery` / `anomalyProficiency` | Use numeric value. | — |
| Energy recovery / automatic recovery | `team[0].panel.energyRegen` or `energyGenerationRate` | Use existing schema semantics selected by implementation PR; do not add ad hoc keys. | If label ambiguity remains, ask user or keep evidence only. |
| UID / nickname / QR code | none | Must not enter strict snapshot. | Only `pii.detected=true` and PII kind may be recorded; raw values must not persist in public fixtures. |

### Source-Specific Notes

`zzz-workshop`:

- Panel table is a single vertical list.
- Some rows show total with base+bonus split.
- W-Engine tile and six Drive Disc cards are visually separate.
- ACE score and drive rating are source-tool scoring artifacts. They should not
  enter strict `BattleSnapshot`; they may be retained as evidence if useful for
  review, without affecting calculation.

`miyoushe-record`:

- Panel stats are a two-column grid.
- W-Engine appears in the row below agent info.
- Drive Disc cards expose roll-count badges for substats.
- SSS score and effective-substat count are source-tool scoring artifacts. They
  should not enter strict `BattleSnapshot`; they may be retained as evidence.

## Review/Edit And Fallback Rules

After extraction, the user must see a draft summary before calculation. The
summary should identify:

- detected source;
- detected agent, level, mindscape, W-Engine, and Drive Disc sets;
- panel total values used for strict snapshot;
- any low-confidence or missing critical fields;
- PII exclusion statement when UID or nickname was detected;
- scenario fields still needed for calculation.

Proceed to `fairy-calc` only when:

1. the user confirms the extracted build or edits it;
2. critical scenario fields required by `BattleSnapshot` are present;
3. strict snapshot parses through `parseBattleSnapshot` or `fairy calc`
   validation;
4. no low-confidence critical field remains unresolved.

Fallback policy:

- unknown source -> generic extraction with low confidence, then review-heavy
  confirmation or NL dialog;
- supported source but missing critical value -> ask user;
- supported source with ambiguous entity resolution -> show candidates, do not
  auto-pick;
- host model lacks image support -> fail loud and ask for NL build description
  or pasted values;
- CLI validation failure -> use existing `fairy-calc` failure flow.

## Fixture Contract

Implementation fixtures should live under `examples/ai-plugin/vision/`:

```text
examples/ai-plugin/vision/
  inputs/
    workshop-anby-build.redacted.jpg
    miyoushe-anby-build.redacted.jpg
  expected/
    workshop-anby-build.extraction.json
    workshop-anby-build.draft-metadata.json
    workshop-anby-build.snapshot.json
    workshop-anby-build.calc.json
    miyoushe-anby-build.extraction.json
    miyoushe-anby-build.draft-metadata.json
    miyoushe-anby-build.snapshot.json
    miyoushe-anby-build.calc.json
```

Plan PR fixtures may reference private planning samples, but public repository
fixtures must be redacted, synthetic, or explicitly approved. No public fixture
or expected JSON may contain UID, nickname, QR code payload, or account
identifiers.

MVP implementation minimum:

- one positive `zzz-workshop` fixture;
- one positive `miyoushe-record` fixture;
- one unknown-source negative fixture;
- at least one low-confidence or missing-critical fixture;
- at least one end-to-end fixture that confirms a strict snapshot and runs
  `fairy calc --view verbose`.

## Verifier Extensions

Extend `scripts/verify-ai-plugin.mjs` in the implementation PR. The plan target
is deterministic local validation; host-model vision behavior may still need a
manual smoke checklist.

Required verifier checks:

- plugin scope still exposes only Product-approved skills;
- `fairy-snapshot` documents image input and supported source names;
- no `fairy-vision`, `fairy-ocr`, or `fairy-compare` skill appears without a new
  Product decision;
- each expected `*.snapshot.json` parses with `parseBattleSnapshot`;
- strict snapshots do not contain evidence-only keys such as `uid`, `username`,
  `baseAttack`, `bonusAttack`, `rollCount`, `sourceImage`, or `confidence`;
- draft metadata / extraction fixtures include source detection, confidence,
  base+bonus evidence for at least one panel stat, and roll-count evidence for
  at least one Drive Disc substat;
- public expected JSON files do not contain known sample UID strings or PII key
  names;
- `fairy compare` is absent from V1.2.3 vision workflows;
- generated calc fixtures deep-match current CLI output.

Manual host-tool smoke checklist:

- Claude Code can see an attached supported image and reach a reviewable draft;
- Codex can use the same contract where image input is available;
- unsupported image produces a fallback question, not a confident snapshot;
- confirmed snapshot calculation goes through `fairy-calc`.

## Implementation Cut

Recommended PR sequence after this plan PR:

1. Metadata and prompt/docs update: extend `fairy-snapshot` input contract and
   verifier static checks.
2. Fixture scaffolding: add redacted/synthetic image fixtures and expected
   extraction/snapshot metadata.
3. Vision prompt and extraction contract: source detection plus per-source field
   extraction examples.
4. Review/edit and fallback copy: align with UX journey and QA gates.
5. End-to-end smoke: confirmed fixture snapshot -> `fairy calc --view verbose`.

Rollback is simple for V1.2.3 MVP because no public schema or package data model
changes are required. If vision prompts prove unreliable during dogfood, disable
image trigger wording in `fairy-snapshot` and keep the V1.2.2 text-only workflow
unchanged.

## Risks

| Risk | Mitigation |
|---|---|
| Source layout drift | Source-specific fixtures and verifier snapshots; unknown-source fallback stays conservative. |
| Model extracts PII into artifacts | PII exclusion rules, static scans, redacted public fixtures. |
| User assumes image alone is enough to calculate | Review summary must surface missing scenario fields before calc. |
| Base+bonus data pressures schema expansion | Keep split in extraction evidence; strict snapshot remains total-only for MVP. |
| Host tool lacks image input | Fail loud and route to NL `fairy-snapshot`; do not claim vision support on that host. |
| Vision result differs from community-tool score | Community scores are evidence only; Fairy result always comes from CLI. |

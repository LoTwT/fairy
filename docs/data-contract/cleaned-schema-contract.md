# Cleaned Schema Contract

Status: Phase 0 draft
Owner: @TechLead
Reviewers: @Product, @QA
Related: D-20 data-source migration, task #121

This document records the schema contract used for the nanoka migration
inventory. It does not introduce a second schema source. The canonical runtime
schemas remain:

- `packages/core/src/schema/game-data.ts`
- `packages/core/src/schema/battle-snapshot.ts`
- `packages/core/src/schema/common.ts`
- `packages/core/src/schema/modifier.ts`

Any generated or package-level schema artifact must be checked against those
canonical schemas. If this document and the TypeScript schemas disagree, the
TypeScript schemas win.

## Field Classes

Every cleaned field in the inventory must be assigned one class:

| Class | Meaning |
|---|---|
| `required` | Required by the canonical schema or by current calculation behavior. Missing source data must fail loud. |
| `optional` | Optional in schema and safe to omit when no source evidence exists. |
| `derived` | Derived from source-backed fields by a documented transform rule. The transform must be deterministic and testable. |
| `deferred` | In scope for the product area but not promotable yet. It must appear in `missingFields` / `deferredRows`. |
| `implementation-owned` | Owned by fairy formulas, deterministic templates, compatibility aliases, or CI metadata rather than nanoka gameplay rows. |
| `retained-non-nanoka` | Explicitly retained under the existing Mihoyo / buhflipexplode Deadly Assault scope. |

## Compatibility Rules

1. `GameData` remains the cleaned, published payload consumed by
   `@randomplay/core`.
2. Raw nanoka field names must not leak into core calculation behavior.
3. `sourceAliases` are allowed only at ingestion and migration boundaries.
4. A source text field is not a typed modifier. Formal modifiers require
   `handlerId`, `params`, `appliesTo`, optional `when`, and `source`.
5. A field can be promoted only when the inventory row has a source endpoint,
   raw path, sample evidence, and transform rule.
6. Missing source evidence must be represented as structured
   `missingFields` / `deferredRows`; adapters must not silently fall back to
   Excel, default values, or inferred values.
7. `implementation-owned` is not an escape hatch. A rule can use that class only
   when it is truly a fairy formula/runtime contract. If the value is a game data
   row, guide value, or sourced constant, it must be researched against nanoka or
   escalated to lo-user.

## Canonical Top-Level Inventory

| Path | Class | Owner | Notes |
|---|---|---|---|
| `GameData.schemaVersion` | required | implementation-owned | Version of the cleaned schema contract. |
| `GameData.gameVersion` | required | derived | Must match the approved nanoka live version or retained DA source version. |
| `GameData.dataVersion` | required | implementation-owned | Package data build version. |
| `GameData.sourceVersion` | required | derived | Source registry summary version. |
| `GameData.generatedAt` | required | implementation-owned | Build timestamp. |
| `GameData.sources[]` | required | derived | Derived from source registry; each source must include parser and license/risk metadata. |
| `GameData.agents` | required | nanoka-candidate | Character identity, stats, skills, passives, potential, and source aliases. |
| `GameData.skills` | required | nanoka-candidate | Skill segment numbers, tags, attributes, and source refs. |
| `GameData.bangboos` | required | nanoka-candidate | Bangboo identity and panel data. |
| `GameData.bangbooSkills` | required | nanoka-candidate | Bangboo segment numbers and source refs. |
| `GameData.wEngines` | optional | nanoka-candidate | W-Engine stats and passive modifiers. |
| `GameData.driveDiscs` | optional | nanoka-candidate | Drive Disc set modifiers; text alone is not promotable. |
| `GameData.enemies` | required | nanoka-candidate | Enemy variants, stats, resistances, anomaly thresholds, and daze recovery. |
| `GameData.resonium` | deferred | deferred | Lost Void scope is deferred unless Product reopens it. |
| `GameData.modifiers` | required | implementation-owned | Deterministic typed modifier templates with source refs. |
| `GameData.rules` | required | mixed | Each rule must be inventoried separately as `source-backed`, `derived`, or `implementation-owned`; this field is not a blanket exemption from source research. |
| `GameData.aliases` | required | implementation-owned | D-11 naming and source-term compatibility table. |

## Runtime Snapshot Boundary

`BattleSnapshot` remains user/runtime input. The nanoka adapter may populate
defaults used by snapshot builders, but the snapshot schema itself is not raw
source data. Inventory rows that affect snapshots must therefore declare whether
they populate:

- `AgentSnapshot.panel`
- `BangbooSnapshot.panel`
- `EnemySnapshot`
- `AttackSegment`
- `TypedModifier`
- `ManualEvent`
- `fieldProvenance` / `overrides`

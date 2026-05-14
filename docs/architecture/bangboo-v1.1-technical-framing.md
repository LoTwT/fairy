# Bangboo V1.1 Technical Framing

Status: Draft T-001
Owner: @TechLead
Reviewers: @Product, @QA
Inputs: lo-user V1.1 scope decision, Product Phase A framing, Product v2.0,
BattleSnapshot, GameData, handler spec, cleaned schema spec, Excel audit

## 1. Locked Scope

V1.1 implements Bangboo as a static snapshot feature and ships as a V0.0.4
patch.

Locked decisions:

- scope: 1-3 high-confidence Bangboo anchors plus generic schema and handler
  contract;
- handler boundary: static/snapshotable modifiers only. Users, CLI, AI adapters,
  or future UI must provide explicit `active`, `count`, or condition fields in
  the snapshot. Core does not schedule triggered or periodic effects;
- data sources: mixed strategy, consistent with V1: retained Excel source,
  buhflipexplode/Mihoyo source text when available, and manual audit only as
  reviewed evidence;
- golden coverage: 1-3 G24+ anchors using the `feat(golden):` convention;
- release target: V0.0.4.

Anti-goals:

- no timeline, rotation, cooldown, or timer simulator;
- no full Bangboo data scrape as a V1.1 release blocker;
- no natural-language effect parsing inside `@randomplay/core`;
- no invented formal Bangboo values without source anchors.

## 2. Existing Constraints

### 2.1 Snapshot Constraints

Current `BattleSnapshot` has:

- `team`: 1-3 agents;
- `activeActor`: agent-only reference;
- `AgentSnapshot.subordinate`: V1 Bangboo placeholder;
- top-level `modifiers[]`;
- `manualEvents[]`;
- `Condition` field roots: `snapshot.*`, `activeActor.*`, `target.*`,
  `enemy.*`, `segment.*`, and `modifier.*`.

Current V1 docs say `subordinate` is unsupported and reserved for V1.1.

### 2.2 Data Constraints

Current `GameData` has agents, skills, W-Engines, Drive Discs, enemies,
Resonium, generic modifiers, rules, and aliases. It does not yet publish
Bangboo data.

The retained Excel audit already identifies deferred Bangboo sheets:

| Sheet | Range | Cleaned target | Useful fields |
|---|---:|---|---|
| `邦布属性` | `A1:T215` | `bangboo` | id, HP, attack, impact, anomaly mastery, defense, crit, level 60 stats |
| `邦布技能` | `A1:H72` | `bangboo.skills` | skill name, damage multiplier, daze multiplier, anomaly buildup |
| `邦布升级表` | `A1:C61` | reference | level experience table, archive-only for V1.1 |

### 2.3 Engine Constraints

The core engine already supports:

- typed modifiers with deterministic handlers;
- condition DSL activation;
- modifier traces including target and condition result;
- formal data modifiers requiring `source`;
- virtual-agent anomaly contribution rows with
  `excludedReason: "bangboo"`;
- manual events for true-damage-like effects.

The implementation must reuse these primitives instead of introducing a
Bangboo-only effect engine.

## 3. Recommended Snapshot Shape

### 3.1 Canonical Placement

Use a top-level `BattleSnapshot.bangboo?: BangbooSnapshot` as the canonical V1.1
placement.

```ts
interface BattleSnapshot {
  // existing fields omitted
  bangboo?: BangbooSnapshot
}

interface BangbooSnapshot {
  bangbooId: string
  level?: number
  promotionPhase?: number
  panel?: BangbooPanelSnapshot
  skillLevels?: Partial<Record<string, number>>
  activations?: Record<string, boolean | number | string>
  fieldProvenance?: FieldProvenanceMap
  overrides?: FieldOverride[]
}

interface BangbooPanelSnapshot {
  attack?: number
  maxHp?: number
  defense?: number
  impact?: number
  critRate?: number
  critDamage?: number
  anomalyMastery?: number
}
```

Rationale:

- there is one selected Bangboo for the team, not one subordinate per agent;
- top-level placement makes team-wide Bangboo effects easier to reference in
  `Condition` paths as `snapshot.bangboo.*`;
- it avoids binding Bangboo lifecycle to an arbitrary agent slot;
- it leaves `team[].subordinate` as a V1 migration/import alias rather than a
  canonical V1.1 field.

Migration rule:

- `team[].subordinate` remains accepted only as a migration/compatibility input;
- if exactly one subordinate Bangboo is present and `snapshot.bangboo` is absent,
  the resolver may migrate it to `snapshot.bangboo` and trace the alias;
- if both are present and disagree, validation must fail loud.

### 3.2 Bangboo Attack Segments

V1.1 should support explicit Bangboo attack segments, but only when the user or
resolver has already selected the Bangboo action. Core must not decide when a
Bangboo active skill or chain skill occurs.

Recommended actor extension:

```ts
type ActorRef =
  | { kind: "agent"; agentId: string }
  | { kind: "bangboo"; bangbooId?: string }

interface ActiveActorRef {
  agentId: string // legacy V1 shape
}

interface AttackSegment {
  actor?: ActorRef
  actorId?: string // legacy agent-only alias
}
```

Execution rule:

- `actorId` remains the V1 agent-only shortcut;
- Bangboo segments must use `actor: { kind: "bangboo" }` or
  `{ kind: "bangboo", bangbooId }`;
- Bangboo segments read `BangbooPanelSnapshot`, not `AgentPanelSnapshot`;
- if a Bangboo segment contributes anomaly buildup, the virtual-agent rows must
  keep `included: false` and `excludedReason: "bangboo"`;
- Bangboo attacks must not produce corrupted-shield cleanse contribution unless
  a future source explicitly introduces a supported manual event.

This keeps Bangboo damage static and snapshotable while still covering the
Excel `邦布技能` numeric fields.

`activeActor` remains the current agent/team-context anchor in this proposal.
Bangboo damage is selected per segment through `AttackSegment.actor`, so V1.1
does not need to break existing result summaries or team-buff resolution.

### 3.3 Bangboo-Sourced Modifiers

Bangboo passive/support effects should compile to ordinary `TypedModifier`
entries with Bangboo source metadata.

```ts
{
  "id": "bangboo.example.effect",
  "handlerId": "damage-bonus",
  "bucket": "damageBonusZone",
  "params": { "value": 0.12 },
  "appliesTo": { "kind": "team" },
  "when": { "field": "snapshot.bangboo.activations.example", "op": "eq", "value": true },
  "source": {
    "sourceId": "excel",
    "sourceAnchor": "邦布技能!A:H"
  }
}
```

Rules:

- source-derived effects enter `GameData.bangboos[].modifiers[]`;
- the resolver copies active or selectable effects into
  `BattleSnapshot.modifiers[]`;
- `requiresActivation: true` effects must not be active by default;
- `activeByDefault` is allowed only for always-on, source-proven effects;
- condition-gated effects use the existing `Condition` DSL and should prefer
  `snapshot.bangboo.activations.*` paths for user-controlled flags.

## 4. Recommended GameData Shape

Add a `bangboos` table to `GameData`.

```ts
interface GameData {
  // existing fields omitted
  bangboos: Record<string, BangbooData>
}

interface BangbooData {
  id: string
  label: LocalizedLabel
  source: SourceRef
  rarity?: "A" | "S" | string
  baseStatsByLevel?: Record<string, BangbooPanelSnapshot>
  skillIds: string[]
  passiveModifiers?: TypedModifier[]
  sourceAliases?: string[]
  unparsedEffects?: UnparsedEffect[]
}

interface BangbooSkillData {
  id: string
  bangbooId: string
  label: LocalizedLabel
  source: SourceRef
  kind: "active" | "chain" | "passive" | "unknown"
  segments?: BangbooSkillSegmentData[]
  modifiers?: TypedModifier[]
  requiresActivation?: boolean
  unparsedEffects?: UnparsedEffect[]
}

interface BangbooSkillSegmentData {
  id: string
  levelKey?: string
  multiplierByLevel?: Record<string, number>
  dazeMultiplierByLevel?: Record<string, number>
  anomalyBuildup?: number
  hitCount?: number
  defaultTags?: AttackTag[]
  source: SourceRef
}
```

Implementation note: `BangbooSkillData` can either be a new top-level
`bangbooSkills` table or nested under `BangbooData`. A top-level table is more
consistent with existing `skills`, but nesting is easier for a small V1.1
sample. The implementation PR should choose one and keep package exports stable.

Validation rules:

- formal Bangboo modifiers require `source`;
- calculation-critical unparsed effects are blocking for the selected 1-3
  anchors;
- unparsed display text may be non-blocking only if it cannot affect a
  calculation result;
- level-derived stats must retain source paths back to `邦布属性`;
- skill segment multipliers, daze multipliers, and anomaly buildup must retain
  source paths back to `邦布技能`.

## 5. Handler Contract

No Bangboo-specific handler registry should be introduced in V1.1.

Use existing handler categories:

- damage, defense, resistance, vulnerability, daze, anomaly, and special-zone
  modifiers remain ordinary `TypedModifier` handlers;
- Bangboo damage segments use the existing formula pipeline with a Bangboo
  formula actor;
- Bangboo effect activation uses existing `when` condition evaluation;
- trace must include source kind through `source.sourceAnchor` and modifier ids.

Required core changes:

1. add Bangboo snapshot validation;
2. add Bangboo formula-actor resolution for explicit Bangboo attack segments;
3. allow `Condition` paths under `snapshot.bangboo.*`;
4. preserve existing agent-only `activeActor` compatibility;
5. keep Bangboo anomaly contribution exclusion and corrupted-shield exclusions
   testable.

Non-goal: core must not inspect Bangboo natural-language skill text.

## 6. Golden Anchor Plan

V1.1 should add G24-G26 candidates, then trim to 1-3 based on source quality.

| Candidate | Purpose | Source basis | Expected assertion |
|---|---|---|---|
| G24 Bangboo skill segment | Prove Bangboo data + explicit Bangboo actor calculation path | Excel `邦布属性` + `邦布技能` for one named Bangboo | Trace uses Bangboo panel attack, skill multiplier, daze multiplier, and source refs |
| G25 Bangboo anomaly exclusion | Prove guide hard rule that Bangboo buildup does not enter virtual-agent weighting | Guide §3.3.5 plus explicit contributor fixture | Virtual-agent rows keep `excludedReason: "bangboo"` and damage math excludes that row |
| G26 Bangboo activation modifier | Prove static/snapshotable `requiresActivation` effect path | Selected Bangboo source text from Mihoyo/buhflipexplode plus manual acceptance if needed | Modifier applies only when `snapshot.bangboo.activations.*` condition is true and trace records active/inactive state |

Suggested candidate names for lo-user/Product review:

| Candidate | Excel anchors | Why it is useful |
|---|---|---|
| `企鹅布` | `邦布属性` row 42; `邦布技能` rows 2-3 | Simple low-rarity active + chain skill; good first G24 numeric anchor. |
| `鲨牙布` | `邦布属性` row 24; `邦布技能` rows 17-18 | Named S-rank-style row with active + chain values; good alternate dogfood anchor. |
| `插头布` | `邦布属性` row 18; `邦布技能` rows 29-30 | Attribute/anomaly-themed alternate with active + chain values. |
| `共鸣布` | `邦布属性` row 17; `邦布技能` rows 31-32 | Good alternate for a source-heavy or anomaly-themed scenario. |
| `巴特勒` | `邦布属性` row 21; `邦布技能` row 24 | Useful only if a source-text support effect is available and reviewable; not a safe numeric G26 anchor from Excel alone. |

The first three unnamed Bangboo rows in `邦布属性` (`ID` 56001, 55002, 55001)
should not be anchor candidates unless another source resolves their labels.

The selected anchors must be source-first. If a Bangboo effect requires timing,
cooldown, or automatic trigger scheduling, it is not a V1.1 anchor.

## 7. Data Source Plan

1. Reuse retained Excel as the first source for numeric Bangboo stats and skill
   segment values.
2. Use buhflipexplode/Mihoyo only for source text, labels, activation wording,
   and cross-checks where available.
3. Record source anchors in the cleaned artifact and replay report.
4. Treat manually reviewed interpretations as `manualAcceptance`, not as a
   primary source for invented values.
5. Do not block V1.1 on full Bangboo table coverage. Full data expansion should
   be a follow-up batch after the schema/handler contract is proven.

## 8. Implementation Slices

Recommended PR split:

1. Product requirement + this technical framing review.
2. Schema/core foundation:
   - `BattleSnapshot.bangboo`;
   - Bangboo actor resolution for explicit segments;
   - condition path coverage;
   - unit tests for validation and exclusions.
3. Data foundation:
   - `GameData.bangboos` and optional `bangbooSkills`;
   - selected 1-3 cleaned Bangboo rows;
   - source refs and sync-cleaned mirrors.
4. Golden anchors:
   - G24+ replay functions;
   - generated report 23 -> 24-26 passed;
   - docs and source coverage updates.
5. V0.0.4 patch release.

PRs 2 and 3 can be separate only if the core tests use small fixtures and the
data PR later wires real source rows. If source-driven anchors are ready, PRs
2-4 can be combined to reduce fixture churn.

## 9. Acceptance Criteria

T-001 exits when Product and QA agree that the following are testable:

- schema location is canonical and migration behavior is defined;
- core stays static/snapshotable and does not add timers;
- selected Bangboo data has source anchors;
- selected G24+ anchors have observable trace assertions;
- Bangboo anomaly exclusion remains explicit;
- release can remain V0.0.4 patch with no SemVer-breaking public API removal;
- future full Bangboo data coverage can be added without changing the snapshot
  shape again.

## 10. Open Questions

1. Which 1-3 Bangboos should lo-user choose for V1.1 dogfooding anchors?
2. Should V1.1 include explicit Bangboo attack segment calculation in the first
   implementation PR, or ship modifier-only first and add Bangboo damage in a
   second V1.1 PR?
3. Should `BangbooSkillData` be top-level (`bangbooSkills`) or nested under
   `BangbooData`?
4. Which source is authoritative for Bangboo passive/support effect text if
   Excel only provides numeric skill segment rows?
5. Does the CLI need a new helper command for selecting Bangboo effects, or is
   raw snapshot JSON enough for V0.0.4?

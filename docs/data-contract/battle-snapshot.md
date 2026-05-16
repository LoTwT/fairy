# BattleSnapshot

Status: S2 draft
Owner: @TechLead
Reviewers: @Product, @UX, @QA
Inputs: Product v2.0, glossary v0.3.2, naming policy, QA-1 golden field mapping

`BattleSnapshot` is the user-authored static input for one calculation. It
describes a single battle moment: 1-3 agents, one active actor, one enemy state,
one or more attack segments, manual events, and typed modifiers that are already
known to be active or intentionally inactive.

It is not raw source data and it is not a rotation simulation.

## 1. Shape

```ts
interface BattleSnapshot {
  schemaVersion: string
  gameVersion: string
  ruleSetVersion: string
  dataVersion: string
  sourceVersion: string

  originalGameVersion?: string
  originalRuleSetVersion?: string
  originalDataVersion?: string
  originalSourceVersion?: string

  locale?: "zh" | "en"
  context?: BattleContext
  team: [AgentSnapshot] | [AgentSnapshot, AgentSnapshot] | [AgentSnapshot, AgentSnapshot, AgentSnapshot]
  activeActor: ActiveActorRef
  bangboo?: BangbooSnapshot
  attackSegments: AttackSegment[]
  enemy: EnemySnapshot
  modifiers?: TypedModifier[]
  manualEvents?: ManualEvent[]
  options?: CalculationOptions
  fieldProvenance?: FieldProvenanceMap
  overrides?: FieldOverride[]
}
```

### Version Fields

| Field | Meaning |
|---|---|
| `schemaVersion` | Snapshot JSON schema version. |
| `gameVersion` | ZZZ game major/minor version used by the user. |
| `ruleSetVersion` | Formula/rule implementation version. |
| `dataVersion` | Cleaned `@randomplay/data` package version. |
| `sourceVersion` | Source-data snapshot version. |
| `original*` | Preserved values when an imported snapshot is recalculated with newer rules/data. |

`original*` fields are mandatory in results produced by the "recalculate with
current rules" path when any version differs from the imported snapshot.

## 2. Battle Context

```ts
interface BattleContext {
  gameMode?: GameMode
  stageId?: string
  nodeId?: string
  phaseId?: string
  activeRuleIds?: string[]
  resoniumIds?: string[]
}

type GameMode =
  | "generic"
  | "lostVoid"
  | "defenseGameMode"
  | "hollowZeroAssault"
```

`context` is the place for mode-specific rules that affect formulas, for
example Lost Void Resonium, Shiyu Defense node effects, or Critical Assault data
source rules. `defenseGameMode` keeps the current internal ID until official
English is verified.

## 3. Team And Active Actor

```ts
interface ActiveActorRef {
  agentId: string
}

interface AgentSnapshot {
  agentId: string
  level: number
  agentSpecialty: AgentSpecialty
  attribute: Attribute

  skillLevels?: Partial<Record<SkillId, number>>
  mindscapeCinema?: MindscapeCinemaSnapshot
  potentialActivations?: PotentialActivationSnapshot[]
  wEngine?: WEngineSnapshot
  driveDiscs?: DriveDiscSnapshot[]
  panel: AgentPanelSnapshot
  fieldProvenance?: FieldProvenanceMap
  overrides?: FieldOverride[]
  subordinate?: UnsupportedSubordinate
}
```

`team` contains 1-3 agents. `activeActor.agentId` must match exactly one
`team[].agentId`. V1.1 uses top-level `bangboo` as the canonical Bangboo actor
slot. `team[].subordinate` is accepted only as a migration alias; a snapshot may
have at most one subordinate, and `snapshot.bangboo` plus `team[].subordinate`
must fail loud if they disagree.

### Bangboo Actor

```ts
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

V1.1 Path X models Bangboo as an explicit attack-segment actor. It does not
model Bangboo as a passive/team buff source, because the retired Excel-derived
Path X evidence has numeric panel and skill values but no source-backed passive text,
element, or activation wording.

### Equipment Naming Decisions

| Concept | Field | Notes |
|---|---|---|
| 音擎 / W-Engine | `wEngine` | Official stylized term; `weaponEngine` is an alias only. |
| 驱动盘 / Drive Disc | `driveDiscs` | Plural because a snapshot can equip multiple discs. |
| 影画 / Mindscape Cinema | `mindscapeCinema` | Official-first readable field. |

## 4. Agent Panel

`panel` is the already-resolved stat snapshot that core consumes. UI import modes
such as "panel input" or "substat input" must resolve to this shape before core.

```ts
interface AgentPanelSnapshot {
  attack: number
  maxHp: number
  defense?: number
  impact?: number
  critRate?: number
  critDamage?: number
  penetrationRate?: number
  flatPenetration?: number
  anomalyMastery?: number
  anomalyProficiency?: number

  sheerForce?: number
  fireDamageBonus?: number
  iceDamageBonus?: number
  electricDamageBonus?: number
  etherDamageBonus?: number
  physicalDamageBonus?: number
  sheerDamageBonus?: number

  energyRegen?: number
  energyGenerationRate?: number
  maxEnergy?: number
  adrenaline?: number
  automaticAdrenalineAccumulation?: number
  adrenalineGenerationRate?: number
  maxAdrenaline?: number
}
```

Field semantics follow D-11:

- `anomalyMastery` = 异常掌控 / Anomaly Mastery, buildup side.
- `anomalyProficiency` = 异常精通 / Anomaly Proficiency, damage side.
- `sheerForce` = 贯穿力 / Sheer Force.
- `adrenaline*` fields are static resource values only in V1. V1 does not
  simulate an Adrenaline cycle.

## 5. Provenance And Overrides

```ts
type FieldProvenance = "panel" | "stats" | "data" | "userOverride"

interface FieldProvenanceMap {
  [fieldPath: string]: FieldProvenanceEntry
}

interface FieldProvenanceEntry {
  provenance: FieldProvenance
  source?: SourceRef
  overriddenFromData?: unknown
  reason?: string
}

interface FieldOverride {
  path: string
  value: unknown
  overriddenFromData?: unknown
  reason?: string
  source?: SourceRef
}
```

Formal data values use `provenance: "data"`. User edits to data-derived fields
use `provenance: "userOverride"` and must include `overriddenFromData` in
`CalcResult.trace`.

Earlier discussions used the string `user-override`; it is a source alias for
`userOverride`, not a new V1 enum value.

`BattleSnapshot.fieldProvenance` and `BattleSnapshot.overrides` can point to any
snapshot path, including `attackSegments[]`, `manualEvents[]`, `context`, and
resolver-derived fields. The nested maps on `AgentSnapshot` and `EnemySnapshot`
are convenience mirrors for common UI forms; top-level paths are the
authoritative round-trip contract.

## 6. Attack Segments

```ts
interface AttackSegment {
  id: string
  actor?: ActorRef
  actorId?: string
  skillId?: string
  levelKey?: string
  multiplier?: number
  baseDazeMultiplier?: number
  attribute: Attribute
  tags: AttackTag[]
  damageType: DamageType
  hitCount?: number
  distanceDecay?: number
  expectedCrit?: boolean
  anomalyContribution?: AnomalyContributionInput
  source?: SourceRef
}

type ActorRef =
  | { kind: "agent"; agentId: string }
  | { kind: "bangboo"; bangbooId?: string }
```

`attackSegments[]` is a hard contract. Even a one-hit CLI example must use an
array. Core rounds display damage per segment and then sums displayed segment
values; it must never round only the final total.

`actorId` defaults to `activeActor.agentId` and remains an agent-only legacy
shortcut. Agent segments may also use `actor: { kind: "agent", agentId }`.
Bangboo segments must use `actor: { kind: "bangboo" }` or include the selected
`bangbooId`; they read `BattleSnapshot.bangboo.panel` and emit a stable result
`actorId` such as `bangboo:penguinboo`.

### Anomaly Contribution Input

```ts
interface AnomalyContributionInput {
  status: AnomalyStatus
  triggerCountBefore?: number
  buildup?: number
  thresholdOverride?: number
  anomalyThresholdModifiers?: AnomalyThresholdModifier[]
  overflowBuildup?: number
  remainingDurationSeconds?: number
  contributors?: AnomalyContributionActorInput[]
}

interface AnomalyThresholdModifier {
  id: string
  multiplier: number
  source?: SourceRef
}

interface AnomalyContributionActorInput {
  actorId: string
  level?: number
  anomalyMastery?: number
  anomalyProficiency?: number
  buildup: number
  included: boolean
  excludedReason?: "bangboo" | "overflowOnly" | "notInSnapshot" | "manualExclude"
  source?: SourceRef
}
```

This input is optional. If absent, the resolver may derive contribution rows
from `GameData` and battle state. If present, core must preserve contribution,
overflow, and exclusion evidence in `CalcResult.trace` so golden anchors can
assert virtual-agent behavior.

`anomalyContribution.status` is required when `damageType` is `"anomaly"` or
`"disorder"`; core must not infer a default status. `remainingDurationSeconds`
records the remaining duration `T` used by disorder formula traces. If omitted,
core may fall back to the current default duration for that anomaly status.
`anomalyThresholdModifiers[]` records sourced multiplicative threshold rules
such as special-enemy base-threshold increases and Deadly Assault mode
modifiers. `thresholdOverride` remains an explicit escape hatch and should not
be used to satisfy golden anchors that require rule composition evidence.

## 7. Enemy Snapshot

```ts
interface EnemySnapshot {
  enemyId?: string
  level: number
  rank: EnemyRank
  maxHp?: number
  defense?: number
  baseDaze?: number
  dazeCap?: number
  resistance?: Partial<Record<ResistanceAttribute, number>>
  dazeResistance?: number
  dazeRecoveryRate?: number
  dazeRecoveryModifiers?: DazeRecoveryModifier[]
  anomalyBuildupResistance?: Partial<Record<ResistanceAttribute, number>>
  anomalyTriggerCounts?: Partial<Record<AnomalyStatus, number>>
  states?: EnemyState[]
  corruptedShield?: CorruptedShieldState
  fieldProvenance?: FieldProvenanceMap
  overrides?: FieldOverride[]
}

interface DazeRecoveryModifier {
  id: string
  value: number
  source?: SourceRef
}
```

`frost` damage maps to ice resistance and ice damage bonus. `auricInk` maps to
ether resistance and ether damage bonus. Attribute mapping must be traceable.
`dazeRecoveryRate` records the enemy's base recovery speed as a per-second
ratio. `dazeRecoveryModifiers[]` records sourced additive rate modifiers such
as guide §2.3.2's +60% / -9% effects; core traces
`enemy.dazeRecoveryTime = 1 / effectiveDazeRecoveryRate`.
If `dazeRecoveryModifiers[]` is non-empty, `dazeRecoveryRate` is required and
the composed `1 + sum(dazeRecoveryModifiers[].value)` multiplier must stay
positive.

## 8. Typed Modifiers

```ts
interface TypedModifier {
  id: string
  label?: LocalizedLabel
  handlerId: string
  bucket?: MultiplierBucket
  params: Record<string, unknown>
  appliesTo: TargetSelector
  when?: Condition
  priority?: number
  stackingKey?: string
  source?: SourceRef
  active?: boolean
}
```

Formal data modifiers without `source` are data validation errors. User-provided
or temporary modifiers without `source` may calculate, but `CalcResult.warnings`
and modifier trace must mark them as unsourced.

## 9. Manual Events

```ts
type ManualEvent =
  | TrueDamageEvent
  | CorruptedShieldCleanseEvent
  | PartBreakEvent

interface BaseManualEvent {
  id: string
  kind: ManualEventKind
  ruleId?: string
  source?: SourceRef
  fieldProvenance?: FieldProvenanceMap
  overrides?: FieldOverride[]
}

interface TrueDamageEvent extends BaseManualEvent {
  kind: "trueDamage"
  basePath: "enemy.maxHp" | "custom"
  multiplier?: number
  flatValue?: number
  trueDamageRule?: string
}

interface CorruptedShieldCleanseEvent extends BaseManualEvent {
  kind: "corruptedShieldCleanse"
  basePath: "enemy.maxHp"
  multiplier?: number
  trueDamageRule: "default15Percent" | "pre22CorruptionPriest3Percent" | "post22ShieldBoss25Permille" | string
}

interface PartBreakEvent extends BaseManualEvent {
  kind: "partBreak"
  partId: string
  partType?: string
  basePath: "enemy.maxHp" | "part.maxHp" | "custom"
  multiplier?: number
  flatValue?: number
  trueDamageRule?: string
}

type ManualEventKind = "trueDamage" | "corruptedShieldCleanse" | "partBreak"
```

Manual events describe known instant events such as corrupted-shield cleanse or
part-break true damage. They do not simulate shield reduction, part durability,
or timing.

## 10. Options

```ts
interface CalculationOptions {
  resultMode?: "expected" | "crit" | "nonCrit"
  includeTrace?: boolean
  strictDataSource?: boolean
  lang?: "zh" | "en"
}
```

`lang` only selects human-facing messages or explanation templates. It never
changes JSON key names or enum values.

## 11. Enums

```ts
type AgentSpecialty = "attack" | "stun" | "anomaly" | "support" | "defense" | "rupture"
type Attribute = "fire" | "electric" | "ice" | "physical" | "ether" | "frost" | "auricInk"
type ResistanceAttribute = "fire" | "electric" | "ice" | "physical" | "ether"
type DamageType = "regular" | "sheer" | "anomaly" | "disorder" | "trueDamage" | "daze"
type EnemyRank = "normal" | "elite" | "boss" | "special"
type AttackTag =
  | "basic"
  | "dash"
  | "dodgeCounter"
  | "special"
  | "exSpecial"
  | "ultimate"
  | "chain"
  | "assistAssault"
  | "parrySupportTag"
  | "quickAssist"
  | "evadeAssist"
  | "heavyHit"
  | "followUp"
```

The five attack tags whose official English is still pending keep their v0.3.2
public IDs until screenshots or data-source text confirms better names.

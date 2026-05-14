# CalcResult

Status: S2 draft
Owner: @TechLead
Reviewers: @Product, @UX, @QA
Inputs: BattleSnapshot, GameData, handler spec, trace contract

`CalcResult` is the only authoritative output of `@randomplay/core` and
`@randomplay/cli`. Human-readable tables, prompt outputs, and future UI views are
renderers over this JSON.

## 1. Shape

```ts
interface CalcResult {
  schemaVersion: string
  gameVersion: string
  ruleSetVersion: string
  dataVersion: string
  sourceVersion: string

  originalGameVersion?: string
  originalRuleSetVersion?: string
  originalDataVersion?: string
  originalSourceVersion?: string

  snapshotId?: string
  calculationId: string
  locale?: "zh" | "en"

  summary: CalcSummary
  attackSegments: SegmentResult[]
  buckets: BucketResult[]
  modifiers: ModifierResult[]
  events?: ManualEventResult[]
  trace: TraceEvent[]
  warnings: Diagnostic[]
  errors: Diagnostic[]
}
```

`errors[]` means calculation did not produce a trustworthy result. `warnings[]`
means calculation can continue, but consumers must preserve and display the
warning.

## 2. Summary

```ts
interface CalcSummary {
  activeActorId: string
  enemyId?: string
  damageType: DamageType
  lanes: {
    nonCrit?: DamageLane
    crit?: DamageLane
    fixed?: DamageLane
  }
  daze?: {
    value: number
    ratioRaw?: number
    ratioDisplay?: number
  }

  // Deprecated transition fields. Kept in verbose/full results for V1
  // compatibility; default CLI brief output does not expose them.
  rawTotalDamage: number
  displayTotalDamage: number
  expectedDamage?: number
  critDamage?: number
  nonCritDamage?: number
  dazeValue?: number
  anomalyBuildup?: number
  disorderDamage?: number
  trueDamage?: number
}

interface DamageLane {
  rawDamage: number
  displayDamage: number
}
```

`lanes.nonCrit` and `lanes.crit` are the default user-facing damage outcomes
for standard crittable damage (`regular` / `sheer`). They are deterministic
branches, not a crit-rate expectation. `lanes.fixed` is used for deterministic
damage paths such as anomaly/disorder/daze/manual events; when a calculation
mixes crittable and fixed damage, the fixed amount is also included in the
non-crit and crit lane totals.

`daze.value` is the accumulated daze value. When `enemy.dazeCap` is available,
`daze.ratioRaw` is `daze.value / enemy.dazeCap * 100`, and
`daze.ratioDisplay` is the floored in-game percentage display.

`rawTotalDamage`, `displayTotalDamage`, and `expectedDamage` are retained for
V1 transition compatibility and full trace/audit views. New CLI/user-facing
renderers should prefer `lanes` and only request expectation explicitly through
`--result-mode expected`.

## 3. Segment Results

```ts
interface SegmentResult {
  id: string
  actorId: string
  attribute: Attribute
  tags: AttackTag[]
  damageType: DamageType
  rawDamage: number
  segmentDisplayDamage: number
  roundingMode: RoundingMode
  baseDamage?: number
  baseDaze?: number
  expectedDamage?: number
  critDamage?: number
  nonCritDamage?: number
  dazeValue?: number
  dazeRatioRaw?: number
  dazeRatioDisplay?: number
  anomalyBuildup?: number
  traceRefs: string[]
}
```

For V1.1 Bangboo attack segments, `actorId` uses a stable synthetic value such
as `bangboo:penguinboo`. This preserves the V1 result shape while distinguishing
Bangboo actor contribution from team-agent contribution.

Multi-segment display totals are:

```ts
displayTotalDamage = sum(attackSegments.map(segment => segment.segmentDisplayDamage))
```

This is a testable invariant for golden anchor #7.

## 4. Bucket Results

```ts
interface BucketResult {
  bucketId: MultiplierBucket
  label?: LocalizedLabel
  before: number
  after: number
  effectiveMultiplier: number
  contributors: BucketContributor[]
  traceRefs: string[]
}

interface BucketContributor {
  id: string
  source?: SourceRef
  sourceMissing?: boolean
  sourceAnchor?: string
  value: number
  operation: "add" | "multiply" | "replace" | "min" | "max" | "ignore"
  active: boolean
  inactiveReason?: string
  modifierId?: string
  diagnosticRefs?: string[]
}
```

Formula buckets may aggregate specific data fields. For example,
`fireDamageBonus`, `iceDamageBonus`, and `physicalDamageBonus` can all
contribute to `damageBonusZone`; `sheerDamageBonus` contributes to
`sheerDamageBonusZone`.

`source` is optional only for user-authored or temporary contributors. In that
case `sourceMissing` must be true, `diagnosticRefs` must include the warning
diagnostic id, and the same omission must appear in modifier trace. Formal data
contributors require `source`.

## 5. Modifier Results

```ts
interface ModifierResult {
  id: string
  handlerId: string
  active: boolean
  appliesTo: TargetSelector
  bucket?: MultiplierBucket
  source?: SourceRef
  sourceMissing?: boolean
  inactiveReason?: string
  producedContributors?: string[]
  traceRefs: string[]
}
```

All modifiers, including inactive ones, appear in `modifiers[]` when
`includeTrace` is true. Debug prompt templates depend on this for explaining
"why this buff did not apply".

## 6. Manual Event Results

```ts
interface ManualEventResult {
  id: string
  kind: ManualEventKind
  ruleId?: string
  source?: SourceRef
  basePath?: string
  baseValue?: number
  multiplier?: number
  flatValue?: number
  rawDamage: number
  displayDamage: number
  traceRefs: string[]
}
```

Manual event results must expose the event id, selected true-damage rule,
base path/value, multiplier or flat value, and final damage so corrupted-shield
cleanse and part-break golden anchors can be asserted without implementation
internals.

## 7. Diagnostics

```ts
interface Diagnostic {
  key: string
  severity: "info" | "warning" | "error"
  path?: string
  messageParams?: Record<string, unknown>
  source?: SourceRef
}
```

Diagnostics use i18n keys such as `ERR-RNG-001`. Core does not emit localized
message strings. CLI, AI prompt renderers, and future UI select `messages.zh.json`
or `messages.en.json` by `--lang` / `lang`.

## 8. Required Evidence Fields

The result must expose these fields directly or through `traceRefs`:

| Area | Required evidence |
|---|---|
| Defense | `levelBase`, `baseDefense`, `defenseReduction`, `penetrationRate`, `flatPenetration`, `effectiveDefense`, `defenseZone` |
| Crit | `critRate`, `critDamage`, `critZone`, `expectedMultiplier`, non-crit/crit/expected paths |
| Resistance | resistance attribute mapping, weak/resist attributes, `resistanceZone` |
| Vulnerability | `vulnerabilityZone`, `dazeVulnerabilityZone` |
| Daze | `dazeValue`, `dazeRatio`, `dazeCap`, `dazeResistance`, recovery time/rate fields |
| Anomaly | `anomalyMastery`, `anomalyProficiency`, `anomalyBuildup`, `anomalyThreshold`, trigger counts |
| Disorder | formula id, remaining duration, virtual-agent contribution, overflow/exclusion evidence |
| Sheer/Rupture | `agentSpecialty: "rupture"`, `sheerForce`, `sheerDamage`, `sheerDamageBonusZone`, defense skip evidence |
| True damage | manual event id, `enemy.maxHp`, selected `trueDamageRule`, final true damage |
| Provenance | data source, user override, `overriddenFromData`, alias migration evidence |

## 9. Version Mismatch Paths

Imported snapshots can take two paths:

1. Recalculate with current rules/data. The new result uses current version
   fields and preserves imported values in `original*` fields.
2. Keep original result read-only. The result preserves original version fields
   and must not silently rewrite `gameVersion`, `ruleSetVersion`,
   `dataVersion`, or `sourceVersion`.

Both paths must be visible in `warnings[]` and trace metadata.

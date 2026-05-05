# Trace Contract

Status: S2 draft
Owner: @TechLead
Reviewers: @QA, @UX
Inputs: QA-1 golden field mapping, Product v2.0

Trace data explains how a result was produced. It is not a log stream and should
not depend on implementation-private variable names.

## 1. Shape

```ts
interface TraceEvent {
  id: string
  kind: TraceKind
  path: string
  label?: LocalizedLabel
  inputs?: Record<string, unknown>
  formula?: string
  rawValue?: unknown
  displayValue?: unknown
  rounding?: RoundingTrace
  source?: SourceRef
  sourceAlias?: string
  sourceAnchor?: string
  active?: boolean
  inactiveReason?: string
  refs?: string[]
}
```

`path` is a stable JSON-style path into `CalcResult` or into the source field
being explained, for example `attackSegments[0].segmentDisplayDamage` or
`buckets[?bucketId=defenseZone]`.

## 2. Trace Kinds

```ts
type TraceKind =
  | "sourceResolution"
  | "aliasMigration"
  | "provenance"
  | "modifierActivation"
  | "bucketContribution"
  | "formula"
  | "rounding"
  | "version"
  | "warning"
  | "error"
```

## 3. Rounding Trace

```ts
interface RoundingTrace {
  mode: RoundingMode
  input: number
  output: number
  reason: string
}

type RoundingMode =
  | "none"
  | "ceilPerSegment"
  | "floorForFormula"
  | "floorForDisplay"
  | "roundToDisplay"
```

Required V1 rounding evidence:

- segment damage display uses `ceilPerSegment`
- anomaly mastery/proficiency formula flooring uses `floorForFormula` when the
  rule requires it
- daze ratio display exposes raw and displayed values separately

## 4. Provenance Trace

User overrides must be traceable:

```json
{
  "kind": "provenance",
  "path": "team[0].panel.sheerForce",
  "inputs": {
    "provenance": "userOverride",
    "overriddenFromData": 2388,
    "value": 2423,
    "reason": "panel screenshot"
  }
}
```

Formal data-derived values must carry `source`. Missing source in formal data is
an error; missing source in user modifiers is a warning.

## 5. Defense Chain Evidence

Defense trace must expose:

- `levelBase`
- `baseDefense`
- `defenseReduction`
- `penetrationRate`
- `flatPenetration`
- `effectiveDefense`
- `defenseZone`
- corrupted-shield defense modifier when active
- defense skip flag for `damageType: "sheer"`

Sheer damage must still trace that defense was skipped; absence of a defense
trace is not enough.

## 6. Anomaly And Disorder Evidence

Anomaly/disorder trace must expose:

- `anomalyMastery` and its rounding/flooring if used for buildup
- `anomalyProficiency` and the anomaly damage zone
- `anomalyThreshold` lookup by enemy rank and trigger count
- physical threshold multiplier when applicable
- special enemy and mode threshold multipliers as separate contributors
- virtual-agent contribution rows
- overflow buildup
- excluded Bangboo buildup
- disorder formula id and remaining duration
- `disorderDazeLevelZone` when disorder damage uses the daze-level multiplier

## 7. Daze Evidence

Daze trace must expose:

- base daze value
- `impact` and daze multiplier contributors
- `dazeResistance`
- `dazeInflictZone`
- `dazeReceiveZone`
- `dazeRatio` raw/display values
- `dazeRecoveryTime` and recovery-rate contributors
- Resonium source ids for Lost Void examples

## 8. Version Trace

Version mismatch trace must show:

- imported `originalGameVersion`, `originalRuleSetVersion`,
  `originalDataVersion`, `originalSourceVersion`
- current versions used for recalculation
- selected path: `recalculateCurrent` or `keepOriginalReadOnly`

No importer may silently rewrite version fields without a trace event.

## 9. Alias Migration Trace

When imported data uses old or community names, trace must preserve both terms:

```json
{
  "kind": "aliasMigration",
  "path": "team[0].panel.sheerForce",
  "sourceAlias": "breachForce",
  "rawValue": 2423,
  "displayValue": "sheerForce"
}
```

At minimum, golden migration tests should cover a `breach*` alias, an old
anomaly-field alias, and a Resonium alias.

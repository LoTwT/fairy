# Handler Spec

Status: S2 draft
Owner: @TechLead
Reviewers: @Product, @QA, @UX
Inputs: CONFIRM-1, Product v2.0, naming policy, QA-1

Handlers are deterministic functions registered by `@fairy/core`. Typed
modifiers reference handlers by `handlerId` and pass data-only `params`.

No V1 JSON file may contain executable code.

## 1. Handler Contract

```ts
interface ModifierHandler<TParams = Record<string, unknown>> {
  id: string
  bucket?: MultiplierBucket
  apply(ctx: HandlerContext, modifier: TypedModifier<TParams>): HandlerResult
}

interface HandlerContext {
  snapshot: BattleSnapshot
  activeActor: AgentSnapshot
  segment?: AttackSegment
  enemy: EnemySnapshot
  gameData: GameData
  trace: TraceWriter
}

interface HandlerResult {
  contributors?: BucketContributor[]
  events?: TraceEvent[]
  warnings?: Diagnostic[]
}
```

Handlers must be pure for the same `(snapshot, gameData, modifier, segment)`.
They cannot read files, call the network, use time/randomness, mutate global
state, or register new handlers during calculation.

## 2. Typed Modifier

```ts
interface TypedModifier<TParams = Record<string, unknown>> {
  id: string
  label?: LocalizedLabel
  handlerId: string
  bucket?: MultiplierBucket
  params: TParams
  appliesTo: TargetSelector
  when?: Condition
  priority?: number
  stackingKey?: string
  source?: SourceRef
  active?: boolean
}
```

`handlerId` uses kebab-case, for example:

- `damage-bonus`
- `defense-reduction`
- `defense-ignore`
- `resistance-reduction`
- `daze-vulnerability-bonus`
- `sheer-damage-bonus`
- `anomaly-threshold-multiplier`
- `true-damage-event`

The exact registry list is locked with implementation, but IDs must follow this
style and appear in trace.

## 3. Target Selector

```ts
type TargetSelector =
  | { kind: "self" }
  | { kind: "activeActor" }
  | { kind: "agent"; agentId: string }
  | { kind: "team"; includeSelf?: boolean }
  | { kind: "enemy" }
  | { kind: "segment" }
  | { kind: "global" }
```

`appliesTo` says what entity the modifier targets. It does not by itself decide
whether the modifier is active for a given segment; activation conditions belong
in `when`.

## 4. Condition DSL

`when` is a JSON condition tree. It is intentionally small and safe.

```ts
type Condition =
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition }
  | FieldCondition

interface FieldCondition {
  field: ConditionFieldPath
  op: "eq" | "neq" | "in" | "notIn" | "gt" | "gte" | "lt" | "lte" | "exists"
  value?: unknown
}
```

Allowed field roots:

- `snapshot.*`
- `activeActor.*`
- `target.*`
- `enemy.*`
- `segment.*`
- `modifier.*`

No arbitrary expressions, function calls, regular-expression execution, or path
mutation are allowed.

Example:

```json
{
  "all": [
    { "field": "segment.tags", "op": "in", "value": "exSpecial" },
    { "field": "enemy.states", "op": "in", "value": "dazed" }
  ]
}
```

### Condition Semantics

| Form | Meaning |
|---|---|
| `all` | Non-empty list; true only when every child condition is true. |
| `any` | Non-empty list; true when at least one child condition is true. |
| `not` | Boolean negation of exactly one child condition. |
| `exists` | Ignores `value`; true when the field path resolves to a non-null value. |
| `eq` / `neq` | Deep equality / inequality for resolved scalar, array, or object values. |
| `in` | If the resolved field is an array, true when it contains `value`; otherwise true when `value` is an array containing the resolved field. |
| `notIn` | Inverse of `in`, but only when the field exists. |
| `gt` / `gte` / `lt` / `lte` | Numeric comparison only; type mismatch returns false. |

Missing paths return false for every operator except `exists`, which also returns
false. Use `{ "not": { "field": "...", "op": "exists" } }` when "missing" is
the intended condition.

## 5. Buckets

```ts
type MultiplierBucket =
  | "baseDamageZone"
  | "damageBonusZone"
  | "critZone"
  | "defenseZone"
  | "resistanceZone"
  | "vulnerabilityZone"
  | "dazeVulnerabilityZone"
  | "sheerDamageBonusZone"
  | "anomalyProficiencyZone"
  | "damageLevelZone"
  | "anomalyDamageBonusZone"
  | "anomalyCritZone"
  | "dazeValueZone"
  | "dazeResistanceZone"
  | "dazeInflictZone"
  | "dazeReceiveZone"
  | "specialZone"
```

Field-specific bonuses and formula buckets are separate concepts. A
`fireDamageBonus` stat can contribute to `damageBonusZone`; `sheerDamageBonus`
contributes to `sheerDamageBonusZone`.

## 6. Source Rules

| Modifier origin | Missing source behavior |
|---|---|
| Formal `@fairy/data` | Data validation error. Must be fixed before package release. |
| User snapshot / temporary override | Calculation may proceed with warning and trace. |
| Test fixture | Allowed only when the fixture explicitly tests missing-source behavior. |

The result should expose `sourceMissing: true` and a diagnostic key such as
`ERR-SRC-001` for user modifiers without source.

## 7. Ordering And Stacking

Handlers run in deterministic order:

1. source resolution and alias migration
2. modifier activation and target filtering
3. priority sort inside each bucket
4. bucket-specific aggregation
5. formula assembly
6. rounding and display conversion

`priority` is only meaningful within a bucket. `stackingKey` prevents multiple
exclusive contributors from stacking accidentally.

## 8. Trace Requirements

Every handler execution must emit trace evidence for:

- handler id
- modifier id
- target selector
- condition result
- source/sourceAnchor when present
- active/inactive state
- produced contributor ids
- warning/error diagnostics

This makes inactive buffs and source omissions testable without reading
implementation internals.

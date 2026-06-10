# Spec 0003 — Damage calculation (core)

## Scope

This spec defines the core damage calculation in `packages/core`: the
multiplier-zone formulas plus the **data-driven zone pipeline** that runs them.
It is the first product spec after the reset and defines the monorepo package
boundaries.

In scope (v1):

- **PART 01** — regular and sheer (贯穿) damage.
- **PART 03** — attribute-anomaly (属性异常) damage settlement: 3.3 anomaly
  damage and 3.4.1 disorder (紊乱) damage.
- The **zone pipeline**: zones as serializable specs, compiled and reduced into a
  traceable per-zone breakdown, with live add / replace / remove / upsert and
  user-defined custom zones.

Explicitly **out of scope** (later specs / not v1):

- PART 03 **3.2 anomaly buildup / trigger thresholds** (积蓄值/阈值) — these
  decide _when_ an anomaly fires and need accumulation state.
- **Virtual-agent weighting** (3.3.5 虚拟代理人加权生成) — the resolved
  virtual-agent stats are an **input** to anomaly damage; computing them from a
  combat timeline is not in core v1.
- **State overlay / cooldown** of anomalies (覆盖/冷却) and any combat-timeline
  state machine.
- **3.4.2 disorder stagger gain** (紊乱失衡值累积) — a separate later spec.
- **极性紊乱 / 薇薇安异放** character-special BasicZone overrides — the pipeline
  reserves a BasicZone-override extension point, but v1 does not commit their
  formulas.
- The full `data` tables (level base, enemy base def, per-skill buildup, etc.) —
  v1 takes resolved numbers as input.
- PART 02 失衡, PART 04 能量, PART 05 秽息, PART 06 部位破坏, PART 07 打断.

The authoritative reference for the game's formula facts and edge-case numbers is
[../references/zzz-data-introduction.txt](../references/zzz-data-introduction.txt).
This spec is Fairy's implementation contract for the damage model, derived from
those facts.

## Rationale

Core-first. Get the damage engine and its traceable zone breakdown right before
layering buildup/stagger/state. Both regular/sheer (PART 01) and anomaly/disorder
(PART 03) damage are **products of multiplier zones** sharing most of the same
zones — so the engine is one **composable zone pipeline**, and the different
damage kinds are different preset zone sets over a shared zone library.

Making each zone a **serializable `ZoneSpec`** (data, not an opaque function)
keeps the contract cross-boundary: custom zones can arrive from JSON / a UI, the
internal complex zones reuse the same pipeline, clamps are validated uniformly,
and the per-zone breakdown stays inspectable. Small, reviewable increments suit
the human-in-the-loop rebuild. Combat-timeline state (buildup, virtual-agent
weighting, cooldowns) is deliberately pushed out so `core` stays pure and
stateless.

## Contract

### Damage formulas

A hit's damage is the product of its zones. Damage is **ceil-rounded per hit**; a
multi-hit attack **sums the per-hit ceiled values** (never ceil the sum).

```
regular = BasicZone × BoostZone × CritZone × DefenceZone × ResistZone
        × VulnZone × StunVulnZone × SpecialZone

sheer   = BasicZone × BoostZone × CritZone × SheerBoostZone × ResistZone
        × VulnZone × StunVulnZone × SpecialZone

anomaly = BasicZone × BoostZone × AnomalyMasteryZone × DefenceZone × ResistZone
        × VulnZone × StunVulnZone × DamageLevelZone × AnomalyBoostZone
        × AnomalyCritZone
```

- **Sheer** replaces `DefenceZone` with `SheerBoostZone` (it ignores defence).
- **Anomaly** uses `AnomalyCritZone` in place of the normal `CritZone` — anomaly
  damage does **not** take the regular crit zone; changing normal critRate/critDmg
  must not affect anomaly damage. Its `BasicZone` is **always ATK-based** (玄墨
  included — it does not use sheer force), and ATK comes from the resolved
  virtual agent (an input).
- **Disorder (紊乱, 3.4.1)** is settled as an anomaly: it uses the `anomaly` zone
  set, with `BasicZone`'s multiplier replaced by a per-source-anomaly multiplier
  of the remaining duration `T` (see Disorder multipliers below).

### Stat model

```
final   = initial × (1 + finalBonusPct) + finalFixed
initial = base    × (1 + initBonusPct)  + initFixed
```

Applies to 攻击力, 生命值, 防御力, 冲击力, 贯穿力, 异常精通, 异常掌控, energy
regen, and decibel regen. Sheer force (贯穿力) is derived per agent from other
stats (e.g. 仪玄: `攻击力 × 0.3 + 生命值上限 × 0.1`; each break agent has its own
ratios). Initial stats convert to initial sheer force, final to final.

### Zones

Each zone returns a number, clamped to the range shown.

| Zone                          | Formula                                                                                                                       | Range                          |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| BasicZone 基础伤害区          | `Σ(skillMultiplier × stat)` — `stat` is ATK for regular & anomaly, sheer force for sheer                                      | ≥ 0                            |
| BoostZone 增伤区              | `1 + Σboost` (attribute / skill-type / attack-type dmg bonuses; **not** sheer or anomaly boost)                               | [0, 6]                         |
| CritZone 暴击区               | crit: `1 + critDmg`; non-crit: `1`. Expectation: `1 + critRate × critDmg`. Regular/sheer only                                 | [1, 6]                         |
| DefenceZone 防御区            | `attackerLevelBase / (effectiveDef + attackerLevelBase)`                                                                      | (0, 1]                         |
| ResistZone 抗性区             | `1 − resist + resistDown + ignoreResist`                                                                                      | [0, 2]                         |
| VulnZone 减易伤区             | `1 + vulnerability − damageReduction`                                                                                         | [0.2, 2]                       |
| StunVulnZone 失衡易伤区       | staggered: `1 + stunVulnMult`; not: `1 + unstaggeredStunVulnMult`. Not applied to agents/bangboo (no stagger bar)             | staggered [0.2, 5]; not [1, 3] |
| SheerBoostZone 贯穿增伤区     | `1 + sheerBoost` (sheer only)                                                                                                 | [0.2, 9]                       |
| SpecialZone 特殊乘区          | distance decay (mechanism partly unknown; default 1)                                                                          | —                              |
| AnomalyMasteryZone 异常精通区 | `anomalyMastery / 100` (anomaly only)                                                                                         | [0, 10]                        |
| DamageLevelZone 伤害等级区    | `trunc(1 + (level − 1) / 59, 4)` — truncate to 4 decimals, not round (anomaly only)                                           | level 1 → 1, level 60 → 2      |
| AnomalyBoostZone 异常增伤区   | `1 + anomalyDmgBonus` (anomaly only)                                                                                          | [0, 3]                         |
| AnomalyCritZone 异常暴击区    | crit: `1 + anomalyCritDmg`; non-crit: `1`. Expectation: `1 + anomalyCritRate × anomalyCritDmg`. Replaces CritZone for anomaly | [1, 3]                         |

#### Disorder (紊乱) BasicZone multipliers — 3.4.1

For disorder, `BasicZone`'s multiplier is set by the source anomaly and its
remaining duration `T` (seconds). `floor` is truncation; default initial duration
is 10s (烈霜霜寒 is 20s):

```
火 灼烧       : 450% + floor(T / 0.5) × 50%
电 感电       : 450% + floor(T)       × 125%
以太 侵蚀     : 450% + floor(T / 0.5) × 62.5%
冰 霜寒       : 450% + floor(T)       × 7.5%
物理 畏缩     : 450% + floor(T)       × 7.5%
玄墨 侵蚀     : 450% + floor(T / 0.5) × 62.5%
烈霜 霜寒     : 600% + floor(T)       × 75%   (initial duration 20s)
```

### Supporting detail (in `data` / the reference, taken as input by core v1)

- **Effective defence** (vs enemies): `effectiveDef = baseDef × (1 + defBonus −
defDown − ignoreDef) × (1 − penRatio) − penValue`, floored at 0.
- **Attacker level base** (等级基数): per-level table (level 1 = 50 … level 60+ =
  794).
- **Crit** base: agents 5% rate / 50% dmg; enemies 0% / 50%. critRate ∈ [0, 1],
  critDmg ∈ [0, 5].
- **Resist** per attribute: weakness = −0.2, resistant = +0.2 (documented
  exceptions). Frost/Auric-Ink resolve via Ice/Ether.

### Zone pipeline contract

A damage calc is an ordered, named set of zones. Zones are **data** publicly and
**compiled to functions** internally.

- **`ZoneSpec`** (public, JSON-serializable):
  `{ key, label?, order, mode, params, clamp?, tags?, source? }`
  - `key` — unique within a pipeline.
  - `order` — position in the product (stable sort).
  - `mode` — an enum naming the zone kind, e.g. `constant`, `additive-one-plus`,
    `ratio`, `basic-regular`, `basic-anomaly`, `defence`, `damage-level`,
    `anomaly-mastery`, `disorder-multiplier` (extended as needed).
  - `params` — data the mode reads (multipliers, level, anomaly type, T, …).
  - `clamp?` — `[min, max]` enforced after evaluation.
  - `tags?`, `source?` — metadata (e.g. `source: "custom"`).
- **`CompiledZone`** (internal): `{ key, order, clamp?, evaluate(ctx): number }`.
  `compile(spec)` produces it; the function exists only after compilation.
- **Pipeline** = ordered `ZoneSpec[]` with unique keys. `computeDamage(pipeline,
ctx)` compiles each spec, evaluates against `ctx`, clamps, multiplies in
  `order`, and returns `{ total, breakdown }` where `breakdown` maps each zone
  `key` to its clamped value (custom keys included).
- **Presets** are factory functions returning a `ZoneSpec[]`:
  `regularPipeline()`, `sheerPipeline()`, `anomalyPipeline()`,
  `disorderPipeline(anomalyType, T)`.
- **Custom zones** are user-supplied `ZoneSpec`s (e.g. `mode: "constant"` or
  `"ratio"`) added to a pipeline; their key appears in `breakdown`.

#### Pipeline operations (fail-loud, immutable)

All operations return a **new** pipeline and never mutate the input (a preset must
stay unchanged after any op):

- `addZone(pipeline, spec)` — **error** if `spec.key` already exists.
- `replaceZone(pipeline, key, spec)` — **error** if `key` is absent; affects only
  that key.
- `removeZone(pipeline, key)` — **error** if `key` is absent.
- `upsertZone(pipeline, spec)` — create or replace; always allowed.

No silent create-on-replace, no silent ignore of unknown/duplicate keys.

## Implementation Design

`packages/core` is pure and functional: no classes, no shared mutable state,
pipelines and specs are immutable values, every operation returns new data.

```
@randomplay/core   # pure calc: stat resolution, zone compile/evaluate, pipeline, formulas. Stateless, traceable.
@randomplay/data   # game data: tables (level base, enemy base def, resist, per-skill numbers). (later)
@randomplay/cli    # JSON-in / JSON-out over core. (later)
```

Pseudocode interface (signatures only, no implementation):

```ts
// stat resolution
finalStat(base, initBonusPct, initFixed, finalBonusPct, finalFixed): number

// zone compile + evaluate
compile(spec: ZoneSpec): CompiledZone           // mode + params -> evaluate(ctx)
// ctx carries resolved inputs: attacker/virtual-agent stats, enemy stats, buffs,
// crit settings, anomaly type & T, etc. core does not derive these from a timeline.

// pipeline ops (pure, return new pipeline; fail-loud)
addZone(pipeline, spec): ZoneSpec[]
replaceZone(pipeline, key, spec): ZoneSpec[]
removeZone(pipeline, key): ZoneSpec[]
upsertZone(pipeline, spec): ZoneSpec[]

// presets
regularPipeline(): ZoneSpec[]
sheerPipeline(): ZoneSpec[]
anomalyPipeline(): ZoneSpec[]
disorderPipeline(anomalyType, T): ZoneSpec[]

// compute
computeDamage(pipeline: ZoneSpec[], ctx): {
  total: number                      // product of clamped zones, per-hit ceil
  breakdown: Record<string, number>  // key -> clamped zone value (custom keys included)
}
// multi-hit: ceil each hit, then sum (helper sums per-hit ceiled totals).
```

The BasicZone-override extension point (for 极性紊乱 / 异放) is a `mode`/`params`
slot the pipeline can carry, but v1 ships no formula for it.

## Acceptance

PART 01:

- Product matches the formula; **regular vs sheer differ only** by `DefenceZone` ↔
  `SheerBoostZone` (sheer does not also multiply DefenceZone).
- `DefenceZone = 794 / (952.8 + 794) = 0.4545` (level-60 agent vs level-60+ boss,
  no pen/def-down).
- **Per-hit ceil then sum** for multi-hit (a multi-hit golden exists so it can't
  regress to ceil-of-sum).

Zone pipeline / custom zones:

- Every built-in zone clamps at its boundary (Boost, Crit, Defence, Resist, Vuln,
  StunVuln, SheerBoost, AnomalyMastery, DamageLevel, AnomalyBoost, AnomalyCrit).
- `removeZone` result equals the old total divided by that zone's value.
- `replaceZone` affects only its key; the original preset is not mutated.
- A custom zone `custom:test` (≈1.25) multiplies the total by 1.25 and its key is
  kept in `breakdown`.
- `add` on a duplicate key and `replace`/`remove` on an unknown key both
  **fail loud**; `upsert` creates or replaces.

PART 03 anomaly:

- Formula locked: `Basic × Boost × AnomalyMastery × Defence × Resist × Vuln ×
StunVuln × DamageLevel × AnomalyBoost × AnomalyCrit`.
- Anomaly damage ignores the normal `CritZone` (changing normal critRate/critDmg
  does not change it); only `AnomalyCritZone` applies.
- `AnomalyMasteryZone = AM / 100`: `250 → 2.5`, `1200 → clamp 10`.
- `DamageLevelZone = trunc(1 + (level − 1) / 59, 4)`: `level 1 → 1`,
  `level 30 → 1.4915`, `level 60 → 2` (truncation, not rounding).
- Anomaly `BasicZone` is always virtual-agent ATK (玄墨 does not use sheer force).

PART 03 disorder (3.4.1):

- One golden per source anomaly: 灼烧 T=10 → 1450%, 感电 T=10 → 1700%, 以太侵蚀
  T=10 → 1700%, 冰霜寒 T=10 → 525%, 物理畏缩 T=10 → 525%, 玄墨侵蚀 T=10 → 1700%,
  烈霜霜寒 T=20 → 2100%.
- `floor` boundary: 灼烧 T=9.99 → `floor(9.99 / 0.5) = 19` → 1400% (not rounded).

General:

- `core` is pure/stateless and returns a traceable per-zone breakdown; total
  without a breakdown is a fail.
- None of the out-of-scope items (buildup/threshold, virtual-agent weighting,
  state overlay/cooldown, 3.4.2 disorder stagger, full data tables, 极性紊乱/异放
  formulas) are implemented; 极性紊乱/异放 may exist only as a reserved
  extension point with no formula.

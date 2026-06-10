# Spec 0003 — Damage calculation (core)

## Scope

This spec defines the core damage calculation: the multiplier-zone formula and
the stat model, for both regular and sheer (贯穿) damage. It is the first product
spec after the reset and defines the monorepo package boundaries.

It covers PART 01 (伤害乘区) of the data introduction. It does **not** cover
stagger (失衡), attribute anomalies (属性异常), energy, decay (秽息), part-break
(部位破坏), or interrupt (打断) — those come in later specs (0004+).

The authoritative reference for the game's formula facts and edge-case numbers is
[../references/zzz-data-introduction.txt](../references/zzz-data-introduction.txt).
This spec is Fairy's implementation contract for the damage model, derived from
those facts.

## Rationale

Core-first. Get the damage engine and its traceable zone breakdown right before
layering stagger/anomaly/etc. The data introduction is the authoritative
reference for the game's formula; this spec structures those facts into Fairy's
implementable contract. Small,
reviewable increments suit the human-in-the-loop rebuild.

## Contract

### Formula

A hit's damage is the product of multiplier zones:

```
regular = BasicZone × BoostZone × CritZone × DefenceZone × ResistZone
        × VulnZone × StunVulnZone × SpecialZone

sheer   = BasicZone × BoostZone × CritZone × SheerBoostZone × ResistZone
        × VulnZone × StunVulnZone × SpecialZone
```

Sheer damage replaces `DefenceZone` with `SheerBoostZone` (it ignores defence).
Damage is shown ceil-rounded per hit; a multi-hit attack sums the per-hit
ceil-rounded values.

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

| Zone                      | Formula                                                                                                                           | Range                          |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| BasicZone 基础伤害区      | `Σ(skillMultiplier × stat)` — `stat` is ATK for regular, sheer force for sheer                                                    | ≥ 0                            |
| BoostZone 增伤区          | `1 + Σboost` (attribute / skill-type / attack-type dmg bonuses; **not** sheer or anomaly boost)                                   | [0, 6]                         |
| CritZone 暴击区           | crit: `1 + critDmg`; non-crit: `1`. Expectation: `1 + critRate × critDmg`                                                         | [1, 6]                         |
| DefenceZone 防御区        | `attackerLevelBase / (effectiveDef + attackerLevelBase)`                                                                          | (0, 1]                         |
| ResistZone 抗性区         | `1 − resist + resistDown + ignoreResist`                                                                                          | [0, 2]                         |
| VulnZone 减易伤区         | `1 + vulnerability − damageReduction`                                                                                             | [0.2, 2]                       |
| StunVulnZone 失衡易伤区   | staggered: `1 + stunVulnMult`; not: `1 + unstaggeredStunVulnMult`. Not applied to damage dealt to agents/bangboo (no stagger bar) | staggered [0.2, 5]; not [1, 3] |
| SheerBoostZone 贯穿增伤区 | `1 + sheerBoost` (sheer damage only)                                                                                              | [0.2, 9]                       |
| SpecialZone 特殊乘区      | distance decay (mechanism partly unknown; default 1). Affects damage, stagger, and anomaly buildup                                | —                              |

Supporting detail (in the `data` package / the reference):

- **Effective defence** (against enemies): `effectiveDef = baseDef × (1 + defBonus
− defDown − ignoreDef) × (1 − penRatio) − penValue`, floored at 0. Ignore-def
  and def-down add; pen-ratio and def-down multiply.
- **Attacker level base** (等级基数): a per-level table (level 1 = 50 … level 60+
  = 794). Enemy base defence at a level = `level1BaseDef / 50 × levelBase`; capped
  at level 60.
- **Crit** base: agents 5% rate / 50% dmg; enemies 0% / 50%. critRate ∈ [0, 1],
  critDmg ∈ [0, 5].
- **Resist** per attribute: weakness = −0.2, resistant = +0.2 (with documented
  exceptions). Frost/Auric-Ink resolve via Ice/Ether. Damage / stagger / anomaly
  resists are separate properties.

## Implementation Design

### Packages

```
@randomplay/core   # pure calc: stat resolution + zones + the damage formula. Stateless, traceable.
@randomplay/data   # game data: agent / enemy / skill stats, and the tables (level base, enemy base def, attribute weakness/resist).
@randomplay/cli    # JSON-in / JSON-out command line over core.
```

`core` depends on nothing game-specific at runtime; `data` provides the numbers;
`cli` wires input → `core` → JSON output. Pseudocode interface (signatures only,
no implementation):

```ts
// stat resolution
finalStat(base, initBonusPct, initFixed, finalBonusPct, finalFixed): number

// each zone — returns the multiplier, clamped to its range
basicZone(skill, attacker): number
boostZone(buffs): number
critZone(critRate, critDmg): { expect: number; crit: number }
defenceZone(attackerLevelBase, effectiveDef): number
resistZone(resist, resistDown, ignoreResist): number
vulnZone(vulnerability, damageReduction): number
stunVulnZone(staggered, stunVulnMult): number
sheerBoostZone(sheerBoost): number
specialZone(distance): number

// top level
computeDamage(input: DamageInput): DamageResult
// DamageInput: attacker stats, skill (multiplier, attribute, type), enemy stats,
//   buffs, isSheer
// DamageResult: { zones: {...each zone...}, expectDamage, critDamage } — keep the
//   per-zone breakdown so the result is traceable.
```

`computeDamage` resolves stats, computes each zone (clamped), multiplies them per
the regular/sheer formula, and ceil-rounds. It returns the per-zone breakdown, not
just a number.

## Acceptance

- The product matches the formula above: regular vs sheer differ only by
  `DefenceZone` ↔ `SheerBoostZone`; per-hit ceil; multi-hit sums ceiled hits.
- Each zone is clamped to its documented range.
- The stat model (`final`/`initial`/`base`) is applied to the listed stats; sheer
  force is derived per agent.
- A worked example from the reference computes correctly — e.g. a level-60 agent
  vs a level-60+ boss with no pen/def-down: `DefenceZone = 794 / (952.8 + 794) =
0.4545`.
- `core` is pure and stateless and returns a traceable per-zone breakdown; `data`
  holds the game numbers; `cli` is JSON-only.
- No stagger / anomaly / energy / decay / part-break / interrupt logic is included
  (those are later specs).

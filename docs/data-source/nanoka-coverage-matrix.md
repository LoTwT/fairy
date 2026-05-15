# Nanoka Coverage Matrix

Status: Phase 0 draft
Owner: @TechLead
Reviewers: @Product, @QA
Related: D-20 data-source migration, task #121, task #122

This matrix is schema-first. It is derived from the canonical `GameData` and
`BattleSnapshot` schemas, then checked against sampled nanoka detail endpoints.
It replaces the discussion-only A-J checklist as the working baseline for Phase
0/1.

## Status Values

| Status | Meaning |
|---|---|
| `verified-from-nanoka` | Sampled nanoka endpoint and raw path exist. The field is promotable only when `promotable=true`. |
| `needs-tl-research` | Evidence is incomplete, semantic mapping is unresolved, or transform rules are not yet proven. |
| `needs-owner-research` | TL exhausted nanoka research and the item must be escalated to lo-user. No current rows use this status yet. |
| `deferred` | Explicitly out of the current migration scope or retained outside nanoka. |

The machine-readable version is
`data/cleaned/audit/nanoka-coverage-matrix.json`, mirrored to
`packages/data/cleaned/audit/nanoka-coverage-matrix.json`.

## Sampled Nanoka Sources

| Entity | Endpoint | Evidence |
|---|---|---|
| Agent / Yixuan | `https://static.nanoka.cc/zzz/3.0.2+15625449/zh/character/1371.json` | `stats`, `level`, `extra_level`, `skill`, `skill_list`, `passive`, `talent`, `potential`, `potential_detail`. |
| Agent / Nekomata | `https://static.nanoka.cc/zzz/3.0.2+15625449/zh/character/1021.json` | `talent` has six entries, while `potential` / `potential_detail` are empty. Used to avoid treating `extra_level` as Mindscape by default. |
| Agent / Soldier 11 | `https://static.nanoka.cc/zzz/3.0.2+15625449/zh/character/1041.json` | `talent`, `potential`, and `potential_detail` all have six entries. Used to separate Mindscape-like text from potential activation semantics. |
| Bangboo / Plugboo | `https://static.nanoka.cc/zzz/3.0.2+15625449/zh/bangboo/54008.json` | `stats`, `level`, `skill`, `skill_prop`; G26 skill values match shipped Excel/Gachabase samples. |
| Enemy / Dullahan sample | `https://static.nanoka.cc/zzz/3.0.2+15625449/zh/monster/30000.json` | `monster_info.*.stats`, `curves`, `element`, `element_abnormal`. Variant mapping is still unresolved. |
| W-Engine / Yixuan signature sample | `https://static.nanoka.cc/zzz/3.0.2+15625449/zh/weapon/14137.json` | `base_property`, `rand_property`, `level`, `stars`, `talents`; typed passive mapping is still unresolved. |
| Drive Disc / Woodpecker Electro sample | `https://static.nanoka.cc/zzz/3.0.2+15625449/zh/equipment/31000.json` | `desc2` / `desc4` text exists, but typed modifiers are not promotable until deterministic parsing/templates exist. |

## Corrections To The Discussion Checklist

- `extra_level` is not accepted as Mindscape. Mindscape / potential mapping must
  resolve `potential`, `potential_detail`, and any relevant `talent` fields.
- Agent and Bangboo base panel rows were initially held. Task #122 batch 1
  proves the base panel formula; promotion extra stats and final snapshot panel
  composition remain separate rows.
- Drive Disc and W-Engine descriptions are raw text. They are not typed
  modifiers until a deterministic template emits handler/params/target/condition.
- Bangboo `element_type` is not verified in the sampled Plugboo detail row.
- Enemy endpoint availability is not the blocker. The blocker is mapping
  `monster_info.*` variants to cleaned enemy/golden rows.
- `GameData.modifiers`, `GameData.rules`, `GameData.aliases`, and
  `GameData.sources` are top-level schema contract rows and must appear in the
  inventory even when they are not nanoka gameplay rows.
- Deadly Assault remains `retained-non-nanoka` unless lo-user explicitly changes
  the previous Mihoyo + buhflipexplode scope decision.
- `implementation-owned` is assigned per row only after checking whether the
  value is really a fairy formula/runtime rule. Game data or guide-backed
  constants still need nanoka research or lo-user escalation.

## Human-Readable Summary

Machine summary after task #122 batch 1: 41 rows total, 25
`verified-from-nanoka`, 8 `needs-tl-research`, 0 `needs-owner-research`, 8
`deferred`, and 9 `promotableNow`.

| Area | Status | Promote Now | Main Blocker |
|---|---|---:|---|
| Source metadata / registry | needs-tl-research | no | D-20 source registry and stable-version gate still need implementation. |
| Agent identity / labels / enums | verified-from-nanoka | yes | Enum mapping table must be recorded. |
| Agent base panel stats | verified-from-nanoka | yes | Formula proven for `baseStatsByLevel`: `stats[key] + level[promotionPhase][key] + stats[key_growth] * (level - 1) / 10000`. Promotion extra stats remain separate. |
| Agent promotion extra stats | needs-tl-research | no | `extra_level` raw fields exist, but final snapshot composition semantics are not locked. |
| Agent skill numeric params | verified-from-nanoka | yes | Full level derivation needs transform tests, but sampled base/growth paths exist. |
| Agent passive / talent / potential | verified-from-nanoka | no | Raw text/objects exist; typed modifier and potential semantics are unresolved. |
| Rupture and adrenaline candidate fields | verified-from-nanoka | no | Raw fields exist; semantic mapping must be validated. |
| Bangboo skill numeric params | verified-from-nanoka | yes | G26 sampled values are promotable. |
| Bangboo panel stats | verified-from-nanoka | yes | Formula proven for G26 Plugboo: `stats[key] + level[promotionPhase][key] + stats[key_upgrade] * (level - 1) / 10000`. |
| Enemy stats/resistance/thresholds | verified-from-nanoka | no | Raw fields exist; variant mapping and formula mapping are unresolved. |
| W-Engine stats | verified-from-nanoka | no | Detail endpoint exists; ID mapping and stat normalization are unresolved. |
| W-Engine passive | verified-from-nanoka | no | Raw text/objects exist; typed modifier template is unresolved. |
| Drive Disc set effects | verified-from-nanoka | no | Raw text exists; typed modifier template is unresolved. |
| Drive Disc slot/main/sub stats | needs-tl-research | no | Not found in sampled equipment detail endpoint. |
| Resonium / Lost Void | deferred | no | Out of current V1 migration scope. |
| Deadly Assault periods/buffs | deferred | no | Retained Mihoyo + buhflipexplode scope. |
| Formula rule tables | mixed | no | Must be split per rule: defense/rounding may be implementation-owned, while anomaly thresholds, daze recovery, disorder, and attribute mappings need row-level owner/source decisions. |

## Remaining TL Research Rows

Task #122 batch 1 leaves 8 rows in `needs-tl-research`:

- `metadata.sources` — source registry contract and content-hash capture.
- `metadata.sourceRefs` — adapter source-ref emission contract.
- `agents.promotionExtraStats` — `extra_level` final snapshot composition
  semantics.
- `bangboos.element` — Plugboo sampled detail did not verify Bangboo element.
- `enemies.variantMapping` — map `monster_info.*` variants to cleaned enemies
  and golden rows.
- `driveDiscs.slotAndSubstatTables` — sampled equipment detail did not expose
  slot/main/sub-stat tables.
- `rules.disorderFormula` — source or implementation owner still unresolved.
- `rules.disorderDazeLevelZone` — source or implementation owner still
  unresolved.

## Phase 3 Drift Audit Boundary

The Phase 3 parallel period is not runtime multi-source fallback. It is a drift
audit that compares nanoka-generated output against archived Excel/V0.0.4 golden
evidence. Runtime adapters must not silently fall back to archived Excel; any
missing or changed field must be represented in `missingFields` / `deferredRows`
or a drift report requiring a ruling.

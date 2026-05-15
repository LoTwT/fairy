# Nanoka Coverage Matrix

Status: Phase 2 enemy variant mapping gate
Owner: @TechLead
Reviewers: @Product, @QA
Related: D-20 data-source migration, task #121, task #122, task #125, task #127,
task #138, task #140, task #142, task #144, task #146

This matrix is schema-first. It is derived from the canonical `GameData` and
`BattleSnapshot` schemas, then checked against sampled nanoka detail endpoints.
It replaces the discussion-only A-J checklist as the working baseline for Phase
0/1.

## Formal-Live Source Version Policy

R1/R6 now lock nanoka as the source for all source-backed cleaned data,
including Deadly Assault. R4 locks patch history as snapshot-derived numeric
diff data, and removes Lost Void / Resonium from the current product scope.

The release source version is no longer the provisional
`3.0.2+15625449` sample version from PR #52. Cleaned output must resolve through
`manifest.zzz.live`:

- `liveVersionRef`: `manifest.zzz.live`;
- current audited live version: `2.8`;
- current latest/research snapshot: `3.0.2+15625449`;
- `approvedLiveVersions[]`: `["2.8"]`;
- `manifest.zzz.latest` is allowed for research / drift only until lo-user
  explicitly approves it for cleaned output.

## Status Values

| Status | Meaning |
|---|---|
| `verified-from-nanoka` | Sampled nanoka endpoint and raw path exist. The field is promotable only when `promotable=true`. |
| `needs-tl-research` | Evidence is incomplete, semantic mapping is unresolved, or transform rules are not yet proven. |
| `needs-owner-research` | TL exhausted nanoka research and the item must be escalated to lo-user. No current rows use this status yet. |
| `deferred` | Explicitly not promotable in the current implementation step, or implementation-owned rather than a nanoka gameplay row. |

The machine-readable version is
`data/cleaned/audit/nanoka-coverage-matrix.json`, mirrored to
`packages/data/cleaned/audit/nanoka-coverage-matrix.json`.

## Sampled Nanoka Sources

| Entity | Endpoint | Evidence |
|---|---|---|
| Agent / Yixuan research | `https://static.nanoka.cc/zzz/3.0.2+15625449/zh/character/1371.json` | Research-only future sample for `stats`, `level`, `extra_level`, `skill`, `skill_list`, `passive`, `talent`, `potential`, `potential_detail`; not approved for cleaned output. |
| Agent / Nekomata | `https://static.nanoka.cc/zzz/3.0.2+15625449/zh/character/1021.json` | `talent` has six entries, while `potential` / `potential_detail` are empty. Used to avoid treating `extra_level` as Mindscape by default. |
| Agent / Soldier 11 | `https://static.nanoka.cc/zzz/3.0.2+15625449/zh/character/1041.json` | `talent`, `potential`, and `potential_detail` all have six entries. Used to separate Mindscape-like text from potential activation semantics. |
| Live Agent / Nekomata | `https://static.nanoka.cc/zzz/2.8/zh/character/1021.json` | Approved live sample for promotable agent identity, enum, base panel, and skill-number rows; retained under `data/source/raw/nanoka/zzz/2.8/`. |
| Live Agent / Yixuan | `https://static.nanoka.cc/zzz/2.8/zh/character/1371.json` | Approved live sample for Adrenaline (`rp_*`) and Resonance (`fever_recovery`) resource fields; retained under `data/source/raw/nanoka/zzz/2.8/`. |
| Live Bangboo / Plugboo | `https://static.nanoka.cc/zzz/2.8/zh/bangboo/54008.json` | Approved live sample for Bangboo identity, base panel, and skill segment rows; retained under `data/source/raw/nanoka/zzz/2.8/`. |
| Enemy / Dullahan research sample | `https://static.nanoka.cc/zzz/3.0.2+15625449/zh/monster/30000.json` | Research-only `monster_info.*.stats`, `curves`, `element`, `element_abnormal`; not approved for cleaned output. |
| Live enemy variant mapping samples | `https://static.nanoka.cc/zzz/2.8/zh/monster/{id}.json` | Approved live samples for Dullahan `30000`, Greta `30004`, Ruthless Fiend `200141`, Notorious Hati `200014`, Notorious Armored Hati `200034`, Miasma Priest `30033`, and Notorious Pompey `300211`. Task #144 proves `detail.monster_id -> monster_info[monster_id]` for G13/G18/G19/G20 source artifacts. |
| Live W-Engine / Yixuan signature sample | `https://static.nanoka.cc/zzz/2.8/zh/weapon/14137.json` | Approved live sample for W-Engine identity; `base_property`, `rand_property`, `level`, `stars`, and `talents` remain blocked for stat/passive promotion until mapping/templates are proven. |
| Live Drive Disc / Woodpecker Electro sample | `https://static.nanoka.cc/zzz/2.8/zh/equipment/31000.json` | Approved live sample for Drive Disc identity; `desc2` / `desc4` text exists, but typed modifiers are not promotable until deterministic parsing/templates exist. |
| Manifest / live gate | `https://static.nanoka.cc/manifest.json` | `zzz.live = 2.8`, `zzz.latest = 3.0.2+15625449`, `zzz.available[]` supports approved-live version allowlists and snapshot-derived patch diff history. |
| Live Adrenaline / Resonance sample / Yixuan | `https://static.nanoka.cc/zzz/2.8/zh/character/1371.json` | `stats.rp_max = 120`, `stats.rp_recover = 200`, `fever_recovery`, and `rp_recovery` raw paths exist in the configured live version. |
| Live Deadly Assault index | `https://static.nanoka.cc/zzz/2.8/boss.json` | 38 live DA entries; all sampled `zh/boss/{id}.json` details returned 200 in PR #54. |
| Live Deadly Assault period / 69036 | `https://static.nanoka.cc/zzz/2.8/zh/boss/69036.json` | Current live period window, zones, layer/selectable buffs, room monster lists, weakness data, and `boss_adjust`. |

The `3.0.2+15625449` samples are retained as phase-0 research evidence, not as
release-ready source evidence. Phase 2 slice 3 re-sampled existing
`promotable=true` rows to approved live `2.8` samples. Phase 2 slice 4 locks
Adrenaline / Resonance resource naming and unit transforms from live Yixuan
evidence. Future promotions must continue to use approved live sample evidence
or receive explicit owner approval for a newer version.

## Corrections To The Discussion Checklist

- `extra_level` is not accepted as Mindscape. Mindscape / potential mapping must
  resolve `potential`, `potential_detail`, and any relevant `talent` fields.
- Agent and Bangboo base panel rows were initially held. Task #122 batch 1
  proves the base panel formula; promotion extra stats and final snapshot panel
  composition remain separate rows.
- Drive Disc and W-Engine descriptions are raw text. They are not typed
  modifiers until a deterministic template emits handler/params/target/condition.
- Bangboo `element_type` is not verified in the sampled Plugboo detail row.
- Enemy endpoint availability is not the blocker. Task #144 proves live
  `monster_info.*` variant selection for the sampled cleaned/golden rows; enemy
  level formulas, resistance units, anomaly threshold mapping, daze recovery
  semantics, and full enemy-catalog promotion remain separate blockers.
- `GameData.modifiers`, `GameData.rules`, `GameData.aliases`, and
  `GameData.sources` are top-level schema contract rows and must appear in the
  inventory even when they are not nanoka gameplay rows.
- Deadly Assault is now source-backed by nanoka under R1/R6. D-17 Mihoyo and
  D-12 buhflipexplode artifacts remain archived audit baselines / deprecated
  candidates until Phase 4 cutover; they are not a runtime source exception.
- Lost Void / Resonium is removed from the V0.1.0 product scope by R4. It is no
  longer represented as a deferred migration row.
- `implementation-owned` is assigned per row only after checking whether the
  value is really a fairy formula/runtime rule. Game data or guide-backed
  constants still need nanoka research or lo-user escalation.

## Human-Readable Summary

Machine summary after task #146: 45 rows total, 32 `verified-from-nanoka`, 7
`needs-tl-research`, 0 `needs-owner-research`, 6 `deferred`, and 16
`promotableNow`.

| Area | Status | Promote Now | Main Blocker |
|---|---|---:|---|
| Source metadata / registry | needs-tl-research | no | `liveVersionRef`, `approvedLiveVersions[]`, source hashes, and stable-version CI still need implementation. |
| Snapshot-derived patch history | verified-from-nanoka | yes | R4.a snapshot-derived numeric diff tool exists and is gated by `approvedLiveVersions[]`; current artifact has one approved live snapshot (`2.8`) and therefore no compared pairs until another live version is approved. |
| Agent identity / labels / enums | verified-from-nanoka | yes | Current promotable rows point to approved live Nekomata evidence; enum mapping table must be recorded. |
| Agent base panel stats | verified-from-nanoka | yes | Formula proven for `baseStatsByLevel`: `stats[key] + level[promotionPhase][key] + stats[key_growth] * (level - 1) / 10000`, with retained live Nekomata panel tests. Promotion extra stats remain separate. |
| Agent promotion extra stats | needs-tl-research | no | `extra_level` raw fields exist, but final snapshot composition semantics are not locked. |
| Agent skill numeric params | verified-from-nanoka | yes | Current promotable row points to approved live Nekomata evidence; full level derivation needs transform tests, but sampled base/growth paths exist. |
| Agent passive / talent / potential | verified-from-nanoka | no | Raw text/objects exist; typed modifier and potential semantics are unresolved. |
| Adrenaline panel fields | verified-from-nanoka | yes | `rp_max -> maxAdrenaline`; `rp_recover / 100 -> automaticAdrenalineAccumulation`, proven from live Yixuan. |
| Resonance / Adrenaline skill recovery | verified-from-nanoka | yes | `fever_recovery / 1000 -> resonanceRecovery`; `rp_recovery / 10000 -> adrenalineRecovery`, proven from live Yixuan and Nekomata. |
| Bangboo skill numeric params | verified-from-nanoka | yes | G26 sampled values are promotable from approved live Plugboo evidence. |
| Bangboo panel stats | verified-from-nanoka | yes | Formula proven for G26 Plugboo: `stats[key] + level[promotionPhase][key] + stats[key_upgrade] * (level - 1) / 10000`, with retained live Plugboo panel tests. |
| Enemy variant mapping | verified-from-nanoka | yes | Live Dullahan, Greta, Ruthless Fiend, Hati, Miasma Priest, and Pompey samples prove `detail.monster_id -> monster_info[monster_id]` mapping for G13/G18/G19/G20 source artifacts; runtime cutover still waits for Phase 3 drift audit. |
| Enemy stats/resistance/thresholds | verified-from-nanoka | no | Raw fields exist for mapped live variants; level formula, resistance units, anomaly threshold mapping, and daze recovery semantics remain unresolved. |
| W-Engine stats | verified-from-nanoka | no | Detail endpoint exists; ID mapping and stat normalization are unresolved. |
| W-Engine passive | verified-from-nanoka | no | Raw text/objects exist; typed modifier template is unresolved. |
| Drive Disc set effects | verified-from-nanoka | no | Raw text exists; typed modifier template is unresolved. |
| Drive Disc slot/main/sub stats | needs-tl-research | no | Not found in sampled equipment detail endpoint. |
| Resonium / Lost Void | removed | no | Removed from V0.1.0 product scope by R4; no formal data expected. |
| Deadly Assault periods/buffs | verified-from-nanoka | yes | Structured source artifact mapping exists for period, zones, buffs, monsters, weakness, rank goals, and `boss_adjust`; runtime cutover still waits for Phase 3 drift audit. |
| Formula rule tables | mixed | no | Must be split per rule: defense/rounding may be implementation-owned, while anomaly thresholds, daze recovery, disorder, and attribute mappings need row-level owner/source decisions. |

## Remaining TL Research Rows

After task #144, 7 rows remain in `needs-tl-research`:

- `metadata.sources` — source registry contract and content-hash capture.
- `metadata.sourceRefs` — adapter source-ref emission contract.
- `agents.promotionExtraStats` — `extra_level` final snapshot composition
  semantics.
- `bangboos.element` — Plugboo sampled detail did not verify Bangboo element.
- `driveDiscs.slotAndSubstatTables` — sampled equipment detail did not expose
  slot/main/sub-stat tables.
- `rules.disorderFormula` — source or implementation owner still unresolved.
- `rules.disorderDazeLevelZone` — source or implementation owner still
  unresolved.

## Current Scope Rows Added By R1/R4/R6

- `metadata.snapshotDiffHistory` — R4.a snapshot-derived numeric patch history;
  task #146 emits `data/cleaned/audit/nanoka-snapshot-diff-history.json` from
  approved live snapshot hashes and marks official patch-note prose as
  `not-found`.
- `adrenaline.maxAdrenaline` / `adrenaline.automaticAdrenalineAccumulation` /
  `skills.resonanceRecovery` / `skills.adrenalineRecovery` — resource fields
  verified from approved live Yixuan evidence and promoted with deterministic
  unit transforms.
- `deadlyAssault.periodsBossesBuffs` — nanoka live DA structured source artifact
  row; task #142 maps period, zones, buffs, monsters, weakness, rank goals, and
  `boss_adjust` with `runtimeCutoverReady=false` until Phase 3/4.
- `enemies.variantMapping` — nanoka live enemy structured source artifact row;
  task #144 maps sampled `monster_info.*` variants to existing cleaned/golden
  enemy identities with `runtimeCutoverReady=false` until Phase 3/4.

## Removed Product Scope

- `resonium.lostVoid` has been removed from the matrix. `GameData.resonium`
  remains in the current TypeScript schema only as compatibility surface until a
  future breaking schema cleanup; V0.1.0 does not expect formal Resonium data.

## Phase 3 Drift Audit Boundary

The Phase 3 parallel period is not runtime multi-source fallback. It is a drift
audit that compares nanoka-generated output against archived Excel/V0.0.4 golden
evidence plus archived D-17/D-12 Deadly Assault evidence. Runtime adapters must
not silently fall back to archived Excel, Mihoyo, or buhflipexplode; any missing,
future, forbidden, or changed field must be represented in `missingFields` /
`deferredRows` / `forbiddenRows` or a drift report requiring a ruling.

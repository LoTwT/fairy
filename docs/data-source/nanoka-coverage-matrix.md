# Nanoka Coverage Matrix

Status: Phase 4 runtime cutover gate
Owner: @TechLead
Reviewers: @Product, @QA
Related: D-20 data-source migration, task #121, task #122, task #125, task #127,
task #138, task #140, task #142, task #144, task #146, task #148, task #150,
task #152, task #154, task #156, task #158, task #161, task #172

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
| `needs-owner-research` | TL exhausted nanoka research and the item must be escalated to lo-user before promotion or scope removal. |
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
| Live Agent / Nekomata | `https://static.nanoka.cc/zzz/2.8/zh/character/1021.json` | Approved live sample for promotable agent identity, enum, base panel, skill-number, and promotion-extra source artifact rows; retained under `data/source/raw/nanoka/zzz/2.8/`. |
| Live Agent / Yixuan | `https://static.nanoka.cc/zzz/2.8/zh/character/1371.json` | Approved live sample for Adrenaline (`rp_*`) and Resonance (`fever_recovery`) resource fields; retained under `data/source/raw/nanoka/zzz/2.8/`. |
| Live Bangboo / Plugboo | `https://static.nanoka.cc/zzz/2.8/zh/bangboo/54008.json` | Approved live sample for Bangboo identity, base panel, skill segment, and element source artifact rows; retained under `data/source/raw/nanoka/zzz/2.8/`. |
| Enemy / Dullahan research sample | `https://static.nanoka.cc/zzz/3.0.2+15625449/zh/monster/30000.json` | Research-only `monster_info.*.stats`, `curves`, `element`, `element_abnormal`; not approved for cleaned output. |
| Live enemy variant mapping samples | `https://static.nanoka.cc/zzz/2.8/zh/monster/{id}.json` | Approved live samples for Dullahan `30000`, Greta `30004`, Ruthless Fiend `200141`, Notorious Hati `200014`, Notorious Armored Hati `200034`, Miasma Priest `30033`, and Notorious Pompey `300211`. Task #144 proves `detail.monster_id -> monster_info[monster_id]` for G13/G18/G19/G20 source artifacts. |
| Live W-Engine / Yixuan signature sample | `https://static.nanoka.cc/zzz/2.8/zh/weapon/14137.json` | Approved live sample for W-Engine identity; `base_property`, `rand_property`, `level`, `stars`, and `talents` remain blocked for stat/passive promotion until mapping/templates are proven. |
| Live Drive Disc / Woodpecker Electro sample | `https://static.nanoka.cc/zzz/2.8/zh/equipment/31000.json` | Approved live sample for Drive Disc identity; `desc2` / `desc4` text exists, but typed modifiers are not promotable until deterministic parsing/templates exist. Task #154 confirms this detail does not expose slot/main/substat tables. |
| Live Drive Disc / equipment index audit | `https://static.nanoka.cc/zzz/2.8/equipment.json` | Failed-evidence audit only: live equipment index exposes set name/`desc2`/`desc4` text, not slot/main/substat tables. Candidate stat-table endpoints checked in `data/cleaned/audit/nanoka-drive-disc-slot-stat-audit.json` returned 404. Lo-user locks V0.1.0 scope to final user-provided panel + set effects, so slot/main/substat tables are V1.x validation/recommendation scope. |
| Manifest / live gate | `https://static.nanoka.cc/manifest.json` | `zzz.live = 2.8`, `zzz.latest = 3.0.2+15625449`, `zzz.available[]` supports approved-live version allowlists and snapshot-derived patch diff history. |
| Live Adrenaline / Resonance sample / Yixuan | `https://static.nanoka.cc/zzz/2.8/zh/character/1371.json` | `stats.rp_max = 120`, `stats.rp_recover = 200`, `fever_recovery`, and `rp_recovery` raw paths exist in the configured live version. |
| Live Deadly Assault index | `https://static.nanoka.cc/zzz/2.8/boss.json` | 38 live DA entries; all sampled `zh/boss/{id}.json` details returned 200 in PR #54. |
| Live Deadly Assault period / 69036 | `https://static.nanoka.cc/zzz/2.8/zh/boss/69036.json` | Current live period window, zones, layer/selectable buffs, room monster lists, weakness data, and `boss_adjust`. |
| Live rules / formula candidate audit | `https://static.nanoka.cc/zzz/2.8/{formula,rules,disorder,anomaly_disorder,battle_formula,damage_formula,element_abnormal}.json` | Failed-evidence audit only: dedicated live formula/rule/disorder endpoints are absent. Existing entity indexes/details do not expose a global Disorder formula table, so task #156 classifies `rules.disorderFormula` as implementation-owned runtime formula evidence. |
| Live daze-level / level-zone candidate audit | `https://static.nanoka.cc/zzz/2.8/{daze_level,daze_level_zone,disorder_daze_level,disorder_daze,disorder_daze_level_zone,level_zone,level_correction,level_suppression,damage_level,damage_level_zone}.json` | Failed-evidence audit only: dedicated live daze-level / level-zone endpoints are absent. Entity indexes do not expose Disorder daze-level constants, so task #158 classifies `rules.disorderDazeLevelZone` as implementation-owned runtime formula evidence. |

The `3.0.2+15625449` samples are retained as phase-0 research evidence, not as
release-ready source evidence. Phase 2 slice 3 re-sampled existing
`promotable=true` rows to approved live `2.8` samples. Phase 2 slice 4 locks
Adrenaline / Resonance resource naming and unit transforms from live Yixuan
evidence. Future promotions must continue to use approved live sample evidence
or receive explicit owner approval for a newer version.
Phase 2 task #150 promotes promotion extra stats from approved live character
detail `/id` + `extra_level` evidence as a structured source artifact only;
Phase 3 rulings plus Phase 4 cutover clear the runtime gate for nanoka-derived
cleaned data. Final user `AgentSnapshot.panel` values still remain
user-provided unless an explicit cleaned-data loader consumes a row.

## Corrections To The Discussion Checklist

- `extra_level` is not accepted as Mindscape. Mindscape / potential mapping must
  resolve `potential`, `potential_detail`, and any relevant `talent` fields.
- Agent and Bangboo base panel rows were initially held. Task #122 batch 1
  proves the base panel formula; promotion extra stats and final snapshot panel
  composition remain separate rows.
- Drive Disc and W-Engine descriptions are raw text. They are not typed
  modifiers until a deterministic template emits handler/params/target/condition.
- Bangboo `element_type` is not a top-level field in the sampled Plugboo detail
  row. Task #152 derives the Bangboo skill attribute from exact colored damage
  text in approved live skill descriptions instead.
- Enemy endpoint availability is not the blocker. Task #144 proves live
  `monster_info.*` variant selection for the sampled cleaned/golden rows; enemy
  level formulas, resistance units, anomaly threshold mapping, daze recovery
  semantics, and full enemy-catalog promotion remain separate blockers.
- `GameData.modifiers`, `GameData.rules`, `GameData.aliases`, and
  `GameData.sources` are top-level schema contract rows and must appear in the
  inventory even when they are not nanoka gameplay rows.
- Deadly Assault is now source-backed by nanoka under R1/R6. D-17 Mihoyo and
  D-12 buhflipexplode artifacts are archived audit baselines after Phase 4
  cutover; they are not a runtime source exception.
- Lost Void / Resonium is removed from the V0.1.0 product scope by R4. It is no
  longer represented as a deferred migration row.
- `implementation-owned` is assigned per row only after checking whether the
  value is really a fairy formula/runtime rule. Game data or guide-backed
  constants still need nanoka research or lo-user escalation.

## Human-Readable Summary

Machine summary after task #172 / Phase 4 runtime cutover: 45 rows total, 36
`verified-from-nanoka`, 0 `needs-tl-research`, 0 `needs-owner-research`, 9
`deferred`, and 20 `promotableNow`.

| Area | Status | Promote Now | Main Blocker |
|---|---|---:|---|
| Source metadata / registry | verified-from-nanoka | yes | Task #148 gates source registry mirror parity, `liveVersionRef`, `approvedLiveVersions[]`, source hashes, stable-version CI, and SourceRef emission from parsed adapter records. |
| Snapshot-derived patch history | verified-from-nanoka | yes | R4.a snapshot-derived numeric diff tool exists and is gated by `approvedLiveVersions[]`; current artifact has one approved live snapshot (`2.8`) and therefore no compared pairs until another live version is approved. |
| Agent identity / labels / enums | verified-from-nanoka | yes | Current promotable rows point to approved live Nekomata evidence; enum mapping table must be recorded. |
| Agent base panel stats | verified-from-nanoka | yes | Formula proven for `baseStatsByLevel`: `stats[key] + level[promotionPhase][key] + stats[key_growth] * (level - 1) / 10000`, with retained live Nekomata panel tests. Promotion extra stats remain separate. |
| Agent promotion extra stats | verified-from-nanoka | yes | Structured source artifact mapping exists from approved live `extra_level` rows; Phase 3/4 cleared the runtime gate, while final user snapshot panel values remain user-provided unless a loader consumes this row. |
| Agent skill numeric params | verified-from-nanoka | yes | Current promotable row points to approved live Nekomata evidence; full level derivation needs transform tests, but sampled base/growth paths exist. |
| Agent passive / talent / potential | verified-from-nanoka | no | Raw text/objects exist; typed modifier and potential semantics are unresolved. |
| Adrenaline panel fields | verified-from-nanoka | yes | `rp_max -> maxAdrenaline`; `rp_recover / 100 -> automaticAdrenalineAccumulation`, proven from live Yixuan. |
| Resonance / Adrenaline skill recovery | verified-from-nanoka | yes | `fever_recovery / 1000 -> resonanceRecovery`; `rp_recovery / 10000 -> adrenalineRecovery`, proven from live Yixuan and Nekomata. |
| Bangboo skill numeric params | verified-from-nanoka | yes | G26 sampled values are promotable from approved live Plugboo evidence. |
| Bangboo element | verified-from-nanoka | yes | Plugboo active and chain skill descriptions contain exact colored electric damage text; task #152 maps the shared label to canonical `electric` and keeps passive/team modifier parsing deferred. |
| Bangboo panel stats | verified-from-nanoka | yes | Formula proven for G26 Plugboo: `stats[key] + level[promotionPhase][key] + stats[key_upgrade] * (level - 1) / 10000`, with retained live Plugboo panel tests. |
| Enemy variant mapping | verified-from-nanoka | yes | Live Dullahan, Greta, Ruthless Fiend, Hati, Miasma Priest, and Pompey samples prove `detail.monster_id -> monster_info[monster_id]` mapping for G13/G18/G19/G20 source artifacts; Phase 3/4 cleared the runtime gate. |
| Enemy stats/resistance/thresholds | verified-from-nanoka | no | Raw fields exist for mapped live variants; level formula, resistance units, anomaly threshold mapping, and daze recovery semantics remain unresolved. |
| W-Engine stats | verified-from-nanoka | no | Detail endpoint exists; ID mapping and stat normalization are unresolved. |
| W-Engine passive | verified-from-nanoka | no | Raw text/objects exist; typed modifier template is unresolved. |
| Drive Disc set effects | verified-from-nanoka | no | Raw text exists; typed modifier template is unresolved. |
| Drive Disc slot/main/sub stats | deferred / out-of-scope | no | Lo-user locks V0.1.0 to user-provided final Agent panel plus Drive Disc set effects; task #154 still records failed nanoka evidence, but this row is excluded from Phase 3 blocking drift and deferred to V1.x validation/recommendation scope. |
| Resonium / Lost Void | removed | no | Removed from V0.1.0 product scope by R4; no formal data expected. |
| Deadly Assault periods/buffs | verified-from-nanoka | yes | Structured source artifact mapping exists for period, zones, buffs, monsters, weakness, rank goals, and `boss_adjust`; Phase 3/4 cleared the runtime gate. |
| Formula rule tables | mixed | no | Base damage, rounding, Disorder formula, and Disorder daze-level are implementation-owned runtime contracts; anomaly thresholds, daze recovery, and attribute mappings still need row-level source/owner decisions. |

## Remaining TL Research Rows

After task #158, no rows remain in `needs-tl-research`.

## Owner Research / Decision Rows

After the 2026-05-15 owner decision, no rows remain in `needs-owner-research`.

## User-Provided Snapshot Boundary Rows

- `driveDiscs.slotAndSubstatTables` — approved live nanoka equipment detail and
  index expose only Drive Disc set identity/effect text; checked candidate
  stat-table endpoints are absent. Lo-user locks V0.1.0 to user-provided final
  Agent panel plus Drive Disc set effects, so slot/main/substat tables are
  `deferred` / `out-of-scope` for V0.1.0 formal data and excluded from Phase 3
  blocking drift. They may return in V1.x for reverse-engineering, validation,
  or recommendation features.

## Implementation-Owned Rule Rows

- `rules.disorderFormula` — task #156 found no approved live nanoka formula,
  rules, Disorder, anomaly-Disorder, battle-formula, damage-formula, or
  anomaly-status endpoint. Existing nanoka entity indexes/details do not expose
  a global Disorder formula table. The row is therefore `deferred` /
  `implementation-owned`, backed by core trace source anchor `guide-3.4.1` and
  executable golden replay G15 rather than nanoka formal data.
- `rules.disorderDazeLevelZone` — task #158 found no approved live nanoka
  daze-level, level-zone, Disorder-daze-level, level-correction, or damage-level
  endpoint. Existing nanoka entity indexes do not expose Disorder daze-level
  constants. The row is therefore `deferred` / `implementation-owned`, backed by
  core trace source anchor `guide-3.4.2` and executable golden replay G16 rather
  than nanoka formal data.

## Current Scope Rows Added By R1/R4/R6

- `metadata.sources` / `metadata.sourceRefs` — source-registry-backed metadata
  contract rows; task #148 promotes them after executable registry mirror,
  content-hash, live-version, and parsed-record SourceRef emission gates.
- `metadata.snapshotDiffHistory` — R4.a snapshot-derived numeric patch history;
  task #146 emits `data/cleaned/audit/nanoka-snapshot-diff-history.json` from
  approved live snapshot hashes and marks official patch-note prose as
  `not-found`.
- `adrenaline.maxAdrenaline` / `adrenaline.automaticAdrenalineAccumulation` /
  `skills.resonanceRecovery` / `skills.adrenalineRecovery` — resource fields
  verified from approved live Yixuan evidence and promoted with deterministic
  unit transforms.
- `agents.promotionExtraStats` — nanoka live promotion-extra structured source
  artifact row; task #150 binds source `/id` to the requested agent, maps
  approved live `extra_level` stat extras with deterministic units; Phase 3
  rulings plus Phase 4 cutover clear the runtime gate.
- `bangboos.element` — nanoka live Bangboo element source artifact row; task
  #152 binds source `/id` to the requested Bangboo and maps exact colored skill
  damage text to canonical `electric` for Plugboo while keeping passive/team
  modifier parsing deferred.
- `deadlyAssault.periodsBossesBuffs` — nanoka live DA structured source artifact
  row; task #142 maps period, zones, buffs, monsters, weakness, rank goals, and
  `boss_adjust`; Phase 3 rulings plus Phase 4 cutover clear the runtime gate.
- `enemies.variantMapping` — nanoka live enemy structured source artifact row;
  task #144 maps sampled `monster_info.*` variants to existing cleaned/golden
  enemy identities; Phase 3 rulings plus Phase 4 cutover clear the runtime gate.

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

## Phase 4 Runtime Cutover Boundary

Phase 4 does not move raw snapshots. Excel, D-17 Mihoyo, and D-12
buhflipexplode files stay in their existing `data/source/...` locations as
archived audit evidence. Runtime cleaned data now has an explicit nanoka-only
artifact at `data/cleaned/runtime/game-data.json`, mirrored to
`packages/data/cleaned/runtime/game-data.json`, with:

- `runtimeCutoverReady: true`;
- `runtimeSourcePolicy.primarySourceId: "nanoka-zzz"`;
- `runtimeSourcePolicy.archivedSourcesRuntimeAllowed: false`;
- `GameData.sourceVersion: "nanoka-zzz@2.8"`.

`verify:source-registry` and `verify:nanoka-runtime` fail loud if runtime data
or package exports reference archived Excel/D-17/D-12 source IDs.

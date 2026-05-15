# Nanoka DA / Sentinel / Patch History Feasibility

Status: Phase 0 feasibility audit
Owner: @TechLead
Reviewers: @Product, @QA
Related: task #125, D-20 data-source migration, task #121, task #122
Date: 2026-05-15

This audit responds to lo-user's revised R1 / R4 / R6 decision direction:

- Deadly Assault data should also come from nanoka if feasible.
- Resonium / Lost Void is removed from the current product scope, not deferred.
- Sentinel / decibel and patch history move into the current scope.
- If a required item cannot be found in nanoka, TL must record failed evidence
  and escalate to lo-user instead of inventing or selecting another source.

This is a research artifact only. It does not update the coverage matrix,
cleaned schema, adapter code, or runtime data.

## Executive Summary

| Area | Feasibility | Evidence | Remaining Blocker |
|---|---|---|---|
| Deadly Assault periods / bosses / buffs | Feasible from nanoka raw data | `boss.json` plus `zh/boss/{id}.json` expose period windows, 3 zones, layer buffs, selectable buffs, rooms, monster lists, weakness data, and `boss_adjust` | Adapter must map `boss_adjust`, scoring / HP semantics, and formal-live gating. |
| Sentinel / decibel data | Feasible as raw nanoka fields | Live sample `2.8/zh/character/1021.json` exposes `stats.rp_max`, `stats.rp_recover`, and skill-level `fever_recovery` / `rp_recovery`; latest-only `character/1371.json` is research evidence only | Unit and naming mapping must be locked before typed promotion. |
| Patch history | Conditional | `manifest.json` exposes versioned snapshots; the app supports diffing versioned data; sampled Yixuan detail exists across multiple `3.0.2+...` snapshots | No dedicated patch-notes / changelog endpoint was found. Product must decide whether snapshot-derived numeric diff is the required "patch history". |
| Resonium / Lost Void | Removed from scope per lo-user | Not re-audited here | Follow-up matrix/schema update must remove or mark the row as `removed/out-of-product-scope` and handle schema impact. |

## Formal-Live Gate Finding

Nanoka's manifest distinguishes "latest" from "live":

```json
{
  "zzz": {
    "latest": "3.0.2+15625449",
    "live": "2.8",
    "available": ["2.8", "2.8.12", "...", "3.0.2+15625449"]
  }
}
```

Source: `https://static.nanoka.cc/manifest.json`

- Manifest SHA-256: `6213ac3b71f5827e850691c2f8547ec6657b7d8ab7e546c50b80252387e613b8`
- On 2026-05-15, `zzz.live` is `2.8`; `zzz.latest` is
  `3.0.2+15625449`.
- `3.0.2+15625449` contains additional future / test-looking DA period ids
  such as `690391`, `690401`, `690411`, and `690421`.

Recommended gate for source-backed cleaned data:

1. Use `manifest.zzz.live` as the default nanoka source version for release
   artifacts unless lo-user explicitly approves a newer version.
2. For time-windowed DA records, also reject rows whose period has not started
   at the configured live snapshot date.
3. Treat `manifest.zzz.latest` as research / drift-audit input only until it is
   approved as the live version.

This gate is stricter than PR #52's provisional
`sourceVersion=3.0.2+15625449` wording and should be resolved in D-20 v0.4
before implementation.

## Deadly Assault Evidence

Nanoka exposes Deadly Assault through the `boss` dataset.

| Source | URL | Result |
|---|---|---|
| Live period index | `https://static.nanoka.cc/zzz/2.8/boss.json` | 38 entries, all 38 sampled `zh/boss/{id}.json` details returned 200. |
| Latest period index | `https://static.nanoka.cc/zzz/3.0.2+15625449/boss.json` | 50 entries, all 50 sampled `zh/boss/{id}.json` details returned 200. |
| Current live period sample | `https://static.nanoka.cc/zzz/2.8/zh/boss/69036.json` | 200 JSON, current window `2026-05-08 04:00:00` to `2026-05-22 03:59:59`. |

Hashes:

- `2.8/boss.json` SHA-256:
  `3379eba07fe6c77e821dc403fc31a9f304148666ee5f5a51706ac5e203393ec0`
- `2.8/zh/boss/69036.json` SHA-256:
  `8f31e1f15918797e8e28c8a350fba6934077b73a35855778d8c0a660815d276b`
- `3.0.2+15625449/boss.json` SHA-256:
  `06dd643deba5e66fc4570f4dd4fd66a807950578305e90ffc66da315f1e9bd1f`

### Current Live Period Sample

`https://static.nanoka.cc/zzz/2.8/zh/boss/69036.json`

Top-level keys:

```text
id, name, priority, zone, boss_adjust, begin_time, end_time
```

Window:

```text
begin_time = 2026-05-08 04:00:00
end_time   = 2026-05-22 03:59:59
```

Zones:

| Zone | Monster level | Layer buffs | Selectable buffs | Rooms |
|---|---:|---:|---:|---:|
| 焚昼余火·法厄同 | 70 | 3 | 3 | 1 |
| 彷徨猎手 | 70 | 4 | 3 | 1 |
| 「亵渎者」 | 70 | 4 | 3 | 1 |

Important raw paths observed:

| Cleaned need | Nanoka raw path pattern |
|---|---|
| DA period window | `/begin_time`, `/end_time` |
| Stage / zone list | `/zone/{zoneId}` |
| Stage name | `/zone/{zoneId}/name` |
| Monster level | `/zone/{zoneId}/monster_level` |
| Stage fixed buffs | `/zone/{zoneId}/layer_buff/{buffId}/title`, `/desc` |
| Selectable buffs | `/zone/{zoneId}/selectable_buff/{buffId}/title`, `/desc` |
| Room monster list | `/zone/{zoneId}/layer_room/{roomId}/monster_list` |
| Weakness data | `/zone/{zoneId}/layer_room/{roomId}/monster_weakness` |
| Boss adjustment data | `/boss_adjust/{adjustId}` |

Conclusion:

- DA data is present in nanoka. The previous `retained-non-nanoka` row is no
  longer accurate under lo-user's revised R1/R6 decision.
- The implementation risk is not endpoint availability. It is the semantic
  mapping from nanoka `boss_adjust` / room / score data into Fairy's existing
  Deadly Assault cleaned contract.
- A follow-up matrix/schema update should move `deadlyAssault.periodsBossesBuffs` from
  `deferred` / `retained-non-nanoka` to a nanoka source-backed row with status
  at least `verified-from-nanoka`, but not fully promotable until the
  `boss_adjust` and scoring semantics are mapped.

## Adrenaline / Resonance Evidence

Phase 2 follow-up note: the initial audit below used Nekomata as the only live
sample and treated Yixuan as latest-only research evidence. Later live
re-sampling confirmed that
`https://static.nanoka.cc/zzz/2.8/zh/character/1371.json` is available under the
configured live snapshot. That live Yixuan detail is now the approved evidence
for Adrenaline (`rp_*`) unit mapping, while Nekomata remains useful for ordinary
Resonance (`fever_recovery`) recovery.

Locked transform mapping:

| Nanoka raw field | Canonical field | Transform |
|---|---|---:|
| `stats.rp_max` | `maxAdrenaline` | identity |
| `stats.rp_recover` | `automaticAdrenalineAccumulation` | `/ 100` |
| `fever_recovery` | `resonanceRecovery` | `/ 1000` |
| `fever_recovery_growth` | `resonanceRecoveryGrowth` | `/ 1000` |
| `rp_recovery` | `adrenalineRecovery` | `/ 10000` |
| `rp_recovery_growth` | `adrenalineRecoveryGrowth` | `/ 10000` |

The provisional `sentinel.*` wording below is superseded for typed data by the
canonical D-11 names `adrenaline*` and `resonance*`.

Nanoka character details expose raw fields for the current "喧响 / decibel /
sentinel" concern.

Live sample source:

`https://static.nanoka.cc/zzz/2.8/zh/character/1021.json`

SHA-256:

`85186a7568c11ff9f56e2085bf561485f0548ff29fc70e686c8aa3dca2b0f961`

Observed raw paths:

| Raw path | Sample value |
|---|---:|
| `/stats/rp_max` | 0 |
| `/stats/rp_recover` | 0 |
| `/skill/basic/description/2/param/0/param/1021001/fever_recovery` | 47025 |
| `/skill/basic/description/2/param/0/param/1021001/fever_recovery_growth` | 0 |
| `/skill/basic/description/2/param/0/param/1021001/rp_recovery` | 0 |
| `/skill/basic/description/2/param/0/param/1021001/rp_recovery_growth` | 0 |
| `/skill/basic/description/2/param/1/param/1021002/fever_recovery` | 97075 |
| `/skill/basic/description/2/param/1/param/1021002/rp_recovery` | 0 |

Research sample, not release-ready evidence:

- `https://static.nanoka.cc/zzz/3.0.2+15625449/zh/character/1371.json`
  exposes non-zero `/stats/rp_max = 120`, `/stats/rp_recover = 200`, and
  skill-level `fever_recovery` / `rp_recovery` values for Yixuan.
- Because this path uses `manifest.zzz.latest`, it should be treated as
  research evidence only until lo-user approves that version for cleaned output.

Conclusion:

- Raw Sentinel / decibel source fields exist in nanoka character detail data.
- A follow-up matrix/schema update should add current-scope matrix rows for
  these fields.
- The rows should be `verified-from-nanoka` for raw availability but not
  automatically `promotable`, because Fairy still needs a naming / unit
  transform decision: whether cleaned fields use `sentinel`, `decibel`, `rp`,
  `fever`, or another canonical name, and how nanoka integer units normalize.

## Patch History Evidence

No dedicated patch-note or changelog endpoint was found in the sampled nanoka
static API.

Sampled under `https://static.nanoka.cc/zzz/3.0.2+15625449/`:

```text
patch.json:404
patches.json:404
changelog.json:404
change_log.json:404
version.json:404
versions.json:404
update.json:404
updates.json:404
notice.json:404
announcements.json:404
news.json:404
history.json:404
diff.json:404
zh/patch.json:404
zh/changelog.json:404
zh/version.json:404
zh/notice.json:404
zh/news.json:404
```

What does exist:

- `manifest.json` lists available static snapshots.
- The public nanoka app loads
  `https://zzz.nanoka.cc/_app/immutable/chunks/diff.5f24057d.js`, which reads
  `manifest.zzz.available` / `manifest.zzz.latest` and accepts
  `fromVersion` / `toVersion` inputs for endpoint diffing.
- The same entity detail path can exist across multiple snapshots. For example,
  `zh/character/1371.json` was fetchable in the last five sampled
  `3.0.2+...` snapshots:

| Version | Fetch | Sample field |
|---|---|---|
| `3.0.2+15596677` | 200 | `stats.attack = 126` |
| `3.0.2+15597809` | 200 | `stats.attack = 126` |
| `3.0.2+15599986` | 200 | `stats.attack = 126` |
| `3.0.2+15602810` | 200 | `stats.attack = 126` |
| `3.0.2+15625449` | 200 | `stats.attack = 126` |

Conclusion:

- If "patch history" means machine-readable numeric data diffs between
  snapshots, nanoka can support it via `manifest.json` plus versioned endpoint
  diffing.
- If "patch history" means official patch note prose / semantic changelog
  entries, no nanoka endpoint was found in this audit. That interpretation
  should become `needs-owner-research` or be descoped.

## Required Follow-Up Matrix / Schema Changes

The follow-up matrix/schema update task or PR should update the matrix and
contract based on this feasibility audit:

1. Change `deadlyAssault.periodsBossesBuffs` from
   `deferred` / `retained-non-nanoka` to nanoka source-backed.
   - Raw status: `verified-from-nanoka`.
   - Promotable status: false until `boss_adjust` / scoring semantics and
     formal-live gate are implemented.
2. Remove or explicitly mark `resonium.lostVoid` as
   `removed/out-of-product-scope`.
   - This is a product removal, not a technical inability to fetch data.
3. Add Sentinel / decibel rows to current scope.
   - Raw status: `verified-from-nanoka`.
   - Promotable status: false until units and canonical names are locked.
4. Add patch-history rows to current scope with a split meaning:
   - `snapshotDiffHistory`: feasible from nanoka manifest + versioned endpoint
     snapshots.
   - `officialPatchNoteText`: not found; needs owner decision if required.

## Decisions To Surface To Lo-User

| Decision | Recommendation |
|---|---|
| DA from nanoka | Proceed. Nanoka has DA raw data. Keep implementation gated on `boss_adjust` / scoring semantic mapping and live-version filtering. |
| Formal-live version selection | Use `manifest.zzz.live` by default; allow `latest` only after explicit owner approval. |
| Sentinel / decibel scope | Proceed as source-backed raw data; require a transform/naming decision before promotion. |
| Patch history meaning | Prefer "snapshot-derived numeric diff history" for V0.1.0. Do not promise official patch-note prose from nanoka unless lo-user finds a separate endpoint. |
| Resonium | Remove from current product scope and update schema/matrix in the follow-up matrix/schema update. |

# Phase 2 raw inventory sample

> Boundary: these rows are raw observed sample inventory only. They are not a
> canonical glossary, final field map, formula model, fixture set, package API,
> or cleaning result. `candidate_identifier` is draft-only, nullable, and must
> remain the last column.

Evidence details live in
[../raw/phase-2-sample/evidence.md](../raw/phase-2-sample/evidence.md).

## Sample rows

| raw_key                                       | zh          | en                | source       | context                      | version | evidence_ref                                        | stability   | extraction_method           | notes                                                                                                       | candidate_identifier                 |
| --------------------------------------------- | ----------- | ----------------- | ------------ | ---------------------------- | ------- | --------------------------------------------------- | ----------- | --------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `raw-agent-anby-name`                         | 安比        | Anby              | `zzz_nanoka` | `character.json:1011.name`   | `3.0`   | `ev-zzz-nanoka-live-3-0-character-1011-2026-07-04`  | `candidate` | `public_static_path_review` | Observed from Nanoka live-selector path; third-party candidate evidence only, not official proof.           | `agentAnby`                          |
| `raw-wengine-lunar-pleniluna-name`            | 「月相」-望 | [Lunar] Pleniluna | `zzz_nanoka` | `weapon.json:12001.name`     | `3.0`   | `ev-zzz-nanoka-live-3-0-weapon-12001-2026-07-04`    | `candidate` | `public_static_path_review` | Observed from Nanoka live-selector path; third-party candidate evidence only, not official proof.           | `wEngineLunarPleniluna`              |
| `raw-bangboo-penguinboo-name`                 | 企鹅布      | Penguinboo        | `zzz_nanoka` | `bangboo.json:53001.name`    | `3.0`   | `ev-zzz-nanoka-live-3-0-bangboo-53001-2026-07-04`   | `candidate` | `public_static_path_review` | Observed from Nanoka live-selector path; third-party candidate evidence only, not official proof.           | `bangbooPenguinboo`                  |
| `raw-drive-disc-woodpecker-electro-crit-rate` | 暴击率+8%。 | CRIT Rate +8%     | `zzz_nanoka` | `equipment.json:31000.desc2` | `3.0`   | `ev-zzz-nanoka-live-3-0-equipment-31000-2026-07-04` | `candidate` | `public_static_path_review` | Bilingual terminology-style observation from Drive Disc 2-piece text; not a formula field or glossary term. | `driveDiscWoodpeckerElectroTwoPiece` |

## Excluded observations

This sample intentionally excludes rows from `latest`, `new`, future, beta,
test, placeholder, unreleased, or unknown-live-status scopes. It also excludes
Deadly Assault numeric rows from `zzz_buhflipexplode_da`; that source remains
registered only until a later DA-specific source review accepts a numeric sample.

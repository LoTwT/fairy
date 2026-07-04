# Phase 2 raw inventory sample（Phase 2 raw inventory 样例）

> Boundary：这些 rows 只是 raw observed sample inventory。它们不是 canonical
> glossary、final field map、formula model、fixture set、package API 或 cleaning
> result。`candidate_identifier` 是 draft-only、nullable，并且必须保持为最后一列。

Evidence detail 位于
[../raw/phase-2-sample/evidence.md](../raw/phase-2-sample/evidence.md)。

## Sample rows（样例行）

下面的 column headers 是 raw inventory sample review fields，用来验证
`source -> evidence_ref -> raw observation` 链路。它们不是 final field map 或
package data model；后续 Phase 3 / #12 和 Phase 5 / #15 可以重新设计最终字段名和结构。

| raw_key                                       | zh          | en                | source       | context                                  | version | evidence_ref                                        | stability   | extraction_method           | notes                                                                                                       | candidate_identifier                 |
| --------------------------------------------- | ----------- | ----------------- | ------------ | ---------------------------------------- | ------- | --------------------------------------------------- | ----------- | --------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `raw-agent-anby-name`                         | 安比        | Anby              | `zzz_nanoka` | `character.json:1011.zh/en`              | `3.0`   | `ev-zzz-nanoka-live-3-0-character-1011-2026-07-04`  | `candidate` | `public_static_path_review` | Observed from Nanoka live-selector path; third-party candidate evidence only, not official proof.           | `agentAnby`                          |
| `raw-wengine-lunar-pleniluna-name`            | 「月相」-望 | [Lunar] Pleniluna | `zzz_nanoka` | `weapon.json:12001.zh/en`                | `3.0`   | `ev-zzz-nanoka-live-3-0-weapon-12001-2026-07-04`    | `candidate` | `public_static_path_review` | Observed from Nanoka live-selector path; third-party candidate evidence only, not official proof.           | `wEngineLunarPleniluna`              |
| `raw-bangboo-penguinboo-name`                 | 企鹅布      | Penguinboo        | `zzz_nanoka` | `bangboo.json:53001.zh/en`               | `3.0`   | `ev-zzz-nanoka-live-3-0-bangboo-53001-2026-07-04`   | `candidate` | `public_static_path_review` | Observed from Nanoka live-selector path; third-party candidate evidence only, not official proof.           | `bangbooPenguinboo`                  |
| `raw-drive-disc-woodpecker-electro-crit-rate` | 暴击率+8%。 | CRIT Rate +8%     | `zzz_nanoka` | `equipment.json:31000.zh.desc2/en.desc2` | `3.0`   | `ev-zzz-nanoka-live-3-0-equipment-31000-2026-07-04` | `candidate` | `public_static_path_review` | Bilingual terminology-style observation from Drive Disc 2-piece text; not a formula field or glossary term. | `driveDiscWoodpeckerElectroTwoPiece` |

## Excluded observations（排除项）

这个 sample 明确排除来自 `latest`、`new`、future、beta、test、placeholder、
unreleased 或 unknown-live-status scope 的 rows。它也排除来自
`zzz_buhflipexplode_da` 的 Deadly Assault numeric rows；该 source 目前只登记为
candidate，直到后续 DA-specific source review 接受 numeric sample。

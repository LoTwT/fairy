# Phase 2 sample evidence notes（Phase 2 sample 证据记录）

> Boundary：这些内容只是小范围 raw inventory sample 的 minimum evidence
> reference。它们不是 canonical glossary entry、final field map、formula
> model、fixture、raw source dump 或 package implementation。

## Capture context（采集上下文）

- `source_id`: `zzz_nanoka`
- `manifest_url`: <https://static.nanoka.cc/manifest.json>
- `capture_time`: `2026-07-04T00:04:26+08:00`
- `observed_live_selector`: `3.0`
- `observed_latest_selector`: `3.1.3+17077339`
- `method`: `public_static_path_review`
- `snapshot_policy`：这个 sample 不在仓库中保存 raw JSON snapshot。Evidence note 只
  记录 versioned path 和 observed field summary。截图、归档页面、附件或 raw JSON
  snapshot 仍然只作为例外使用。

## Evidence references（证据引用）

| evidence_ref                                        | source_id    | source_url_or_path                                      | capture_time                | version_marker | capture_method              | observation_summary                                                                                                                              | live_or_exclusion_note                                                                                  | repository_artifact              |
| --------------------------------------------------- | ------------ | ------------------------------------------------------- | --------------------------- | -------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `ev-zzz-nanoka-live-3-0-character-1011-2026-07-04`  | `zzz_nanoka` | <https://static.nanoka.cc/zzz/3.0/character.json#1011>  | `2026-07-04T00:04:26+08:00` | `3.0`          | `public_static_path_review` | Observed character entry `1011` with `zh=安比`, `en=Anby`, and `code=Anby`.                                                                      | Included because the path uses accepted candidate live selector `3.0`; still third-party evidence only. | this note only; no JSON snapshot |
| `ev-zzz-nanoka-live-3-0-weapon-12001-2026-07-04`    | `zzz_nanoka` | <https://static.nanoka.cc/zzz/3.0/weapon.json#12001>    | `2026-07-04T00:04:26+08:00` | `3.0`          | `public_static_path_review` | Observed W-Engine entry `12001` with `zh=「月相」-望`, `en=[Lunar] Pleniluna`, and `sub=ATK`.                                                    | Included because the path uses accepted candidate live selector `3.0`; still third-party evidence only. | this note only; no JSON snapshot |
| `ev-zzz-nanoka-live-3-0-bangboo-53001-2026-07-04`   | `zzz_nanoka` | <https://static.nanoka.cc/zzz/3.0/bangboo.json#53001>   | `2026-07-04T00:04:26+08:00` | `3.0`          | `public_static_path_review` | Observed Bangboo entry `53001` with `zh=企鹅布`, `en=Penguinboo`, and `codename=Penguinboo`.                                                     | Included because the path uses accepted candidate live selector `3.0`; still third-party evidence only. | this note only; no JSON snapshot |
| `ev-zzz-nanoka-live-3-0-equipment-31000-2026-07-04` | `zzz_nanoka` | <https://static.nanoka.cc/zzz/3.0/equipment.json#31000> | `2026-07-04T00:04:26+08:00` | `3.0`          | `public_static_path_review` | Observed Drive Disc entry `31000` with `zh.name=啄木鸟电音`, `en.name=Woodpecker Electro`, `zh.desc2=暴击率+8%。`, and `en.desc2=CRIT Rate +8%`. | Included because the path uses accepted candidate live selector `3.0`; still third-party evidence only. | this note only; no JSON snapshot |

## Excluded from this sample（本 sample 排除范围）

- `manifest.zzz.latest = 3.1.3+17077339`、`manifest.zzz.new`，以及任何
  future、beta、test、placeholder、unreleased 或 unknown-live-status scope。
- `zzz_buhflipexplode_da` 的 numeric Deadly Assault rows。这个 source 目前只登记为
  DA-specific candidate；numeric sampling 需要后续 source review。

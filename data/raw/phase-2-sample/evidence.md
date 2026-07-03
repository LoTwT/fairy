# Phase 2 sample evidence notes

> Boundary: these are minimum evidence references for a small raw inventory
> sample. They are not canonical glossary entries, a final field map, a formula
> model, fixtures, raw source dumps, or package implementation.

## Capture context

- `source_id`: `zzz_nanoka`
- `manifest_url`: <https://static.nanoka.cc/manifest.json>
- `capture_time`: `2026-07-04T00:04:26+08:00`
- `observed_live_selector`: `3.0`
- `observed_latest_selector`: `3.1.3+17077339`
- `method`: `public_static_path_review`
- `snapshot_policy`: no raw JSON snapshot is stored in this repository for this
  sample. Evidence notes record the versioned path and observed field summary.
  Screenshots, archived pages, attachments, or raw JSON snapshots remain
  exception-only.

## Evidence references

| evidence_ref                                        | source_id    | source_url_or_path                                      | capture_time                | version_marker | capture_method              | observation_summary                                                                                                                              | live_or_exclusion_note                                                                                  | repository_artifact              |
| --------------------------------------------------- | ------------ | ------------------------------------------------------- | --------------------------- | -------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `ev-zzz-nanoka-live-3-0-character-1011-2026-07-04`  | `zzz_nanoka` | <https://static.nanoka.cc/zzz/3.0/character.json#1011>  | `2026-07-04T00:04:26+08:00` | `3.0`          | `public_static_path_review` | Observed character entry `1011` with `zh=安比`, `en=Anby`, and `code=Anby`.                                                                      | Included because the path uses accepted candidate live selector `3.0`; still third-party evidence only. | this note only; no JSON snapshot |
| `ev-zzz-nanoka-live-3-0-weapon-12001-2026-07-04`    | `zzz_nanoka` | <https://static.nanoka.cc/zzz/3.0/weapon.json#12001>    | `2026-07-04T00:04:26+08:00` | `3.0`          | `public_static_path_review` | Observed W-Engine entry `12001` with `zh=「月相」-望`, `en=[Lunar] Pleniluna`, and `sub=ATK`.                                                    | Included because the path uses accepted candidate live selector `3.0`; still third-party evidence only. | this note only; no JSON snapshot |
| `ev-zzz-nanoka-live-3-0-bangboo-53001-2026-07-04`   | `zzz_nanoka` | <https://static.nanoka.cc/zzz/3.0/bangboo.json#53001>   | `2026-07-04T00:04:26+08:00` | `3.0`          | `public_static_path_review` | Observed Bangboo entry `53001` with `zh=企鹅布`, `en=Penguinboo`, and `codename=Penguinboo`.                                                     | Included because the path uses accepted candidate live selector `3.0`; still third-party evidence only. | this note only; no JSON snapshot |
| `ev-zzz-nanoka-live-3-0-equipment-31000-2026-07-04` | `zzz_nanoka` | <https://static.nanoka.cc/zzz/3.0/equipment.json#31000> | `2026-07-04T00:04:26+08:00` | `3.0`          | `public_static_path_review` | Observed Drive Disc entry `31000` with `zh.name=啄木鸟电音`, `en.name=Woodpecker Electro`, `zh.desc2=暴击率+8%。`, and `en.desc2=CRIT Rate +8%`. | Included because the path uses accepted candidate live selector `3.0`; still third-party evidence only. | this note only; no JSON snapshot |

## Excluded from this sample

- `manifest.zzz.latest = 3.1.3+17077339`, `manifest.zzz.new`, and any future,
  beta, test, placeholder, unreleased, or unknown-live-status scopes.
- `zzz_buhflipexplode_da` numeric Deadly Assault rows. That source is registered
  as a DA-specific candidate only; numeric sampling needs a later source review.

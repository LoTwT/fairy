# Phase 3 field map sample（Phase 3 field map 样例）

> Boundary：这个 artifact 只把 Phase 2 raw inventory sample 映射成第一版
> domain field map sample。它不是 final data model、canonical glossary、formula
> spec、fixture set、package API、package data 或 runtime schema。

Source rows 来自
[Phase 2 raw inventory sample](../raw-inventory/phase-2-sample.md)，evidence detail 见
[Phase 2 sample evidence notes](../raw/phase-2-sample/evidence.md)。每一行都必须保留
`raw_key` / `evidence_ref` / `source_id` / `version` / `context`，否则不能作为 mapped
sample 使用。

## Sample field map rows（样例 field map 行）

| map_key                                            | raw_key                                       | evidence_ref                                        | source_id    | version | context                                  | observed_zh | observed_en       | object_class | use_type                | draft_mapping_label                      | mapping_status | confidence         | rationale                                                                                            | downstream_boundary                                                                                                               |
| -------------------------------------------------- | --------------------------------------------- | --------------------------------------------------- | ------------ | ------- | ---------------------------------------- | ----------- | ----------------- | ------------ | ----------------------- | ---------------------------------------- | -------------- | ------------------ | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `map-agent-anby-name-display`                      | `raw-agent-anby-name`                         | `ev-zzz-nanoka-live-3-0-character-1011-2026-07-04`  | `zzz_nanoka` | `3.0`   | `character.json:1011.zh/en`              | 安比        | Anby              | `agent`      | `identity_display_name` | `draft_agent_name_display_label`         | `mapped_draft` | `sample_candidate` | Phase 2 observed bilingual name text for character entry `1011`.                                     | May inform Phase 4 glossary / display-name review; not a final package field or runtime schema.                                   |
| `map-w-engine-lunar-pleniluna-name-display`        | `raw-wengine-lunar-pleniluna-name`            | `ev-zzz-nanoka-live-3-0-weapon-12001-2026-07-04`    | `zzz_nanoka` | `3.0`   | `weapon.json:12001.zh/en`                | 「月相」-望 | [Lunar] Pleniluna | `w_engine`   | `identity_display_name` | `draft_w_engine_name_display_label`      | `mapped_draft` | `sample_candidate` | Phase 2 observed bilingual name text for W-Engine entry `12001`.                                     | May inform Phase 4 glossary / display-name review; not a final package field or runtime schema.                                   |
| `map-bangboo-penguinboo-name-display`              | `raw-bangboo-penguinboo-name`                 | `ev-zzz-nanoka-live-3-0-bangboo-53001-2026-07-04`   | `zzz_nanoka` | `3.0`   | `bangboo.json:53001.zh/en`               | 企鹅布      | Penguinboo        | `bangboo`    | `identity_display_name` | `draft_bangboo_name_display_label`       | `mapped_draft` | `sample_candidate` | Phase 2 observed bilingual name text for Bangboo entry `53001`.                                      | May inform Phase 4 glossary / display-name review; not a final package field or runtime schema.                                   |
| `map-drive-disc-woodpecker-electro-two-piece-text` | `raw-drive-disc-woodpecker-electro-crit-rate` | `ev-zzz-nanoka-live-3-0-equipment-31000-2026-07-04` | `zzz_nanoka` | `3.0`   | `equipment.json:31000.zh.desc2/en.desc2` | 暴击率+8%。 | CRIT Rate +8%     | `drive_disc` | `mechanic_text`         | `draft_drive_disc_two_piece_effect_text` | `mapped_draft` | `sample_candidate` | Phase 2 observed Drive Disc 2-piece text for equipment entry `31000`; text appears mechanic-related. | Possible formula-relevant text; formula ownership unresolved; not formula input, not formula test expectation, not fixture value. |

## Unresolved queue（unresolved, not accepted model fields）

| unresolved_key                                      | raw_key                                       | evidence_ref                                        | question                                                                                   | blocked_mapping                                          | needed_evidence                                                                                           | allowed_next_action                                                                                               |
| --------------------------------------------------- | --------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `unresolved-drive-disc-two-piece-formula-ownership` | `raw-drive-disc-woodpecker-electro-crit-rate` | `ev-zzz-nanoka-live-3-0-equipment-31000-2026-07-04` | Is `CRIT Rate +8%` a formula input, a display text, a set bonus mechanic, or fixture data? | `formula_input`, formula test expectation, fixture value | Accepted formula source, numeric mechanic evidence, fixture source, or Phase 5 calculation spec decision. | Carry as `mechanic_text` with possible formula relevance only; do not consume as formula input or package schema. |

## Non-goals（非目标）

- 不定义 final domain model。
- 不创建 canonical glossary。
- 不定义 formula、formula input 或 fixture expectation。
- 不创建 package API、package data、runtime schema 或 code。
- 不扩大 Phase 2 raw inventory sample。
- 不把 `draft_mapping_label` 当作 package-facing field path。

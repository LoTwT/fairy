# Terminology glossary seed（术语表 seed）

> Boundary：这个 artifact 是 Phase 4 sample-backed seed glossary。它不是完整 ZZZ
> 术语表、机制百科、formula spec、fixture set、package schema、package API、
> runtime key 或 package data source。`glossary_identifier` 只在 glossary 内部使用，
> 不能当成 package field path。

规则见 [Spec 0005 - Terminology glossary](../specs/0005-terminology-glossary.md)。
每条 accepted seed row 必须通过 `field_map_ref` 回到
[Phase 3 field map sample](../../data/field-map/phase-3-sample.md)，再通过
`raw_key` / `evidence_ref` 回到
[Phase 2 raw inventory sample](../../data/raw-inventory/phase-2-sample.md) 和
[Phase 2 sample evidence notes](../../data/raw/phase-2-sample/evidence.md)。

## Accepted seed glossary（sample-backed, not complete coverage）

| term_id                                      | field_map_ref                               | raw_key                            | evidence_ref                                       | source_id    | version | context                     | object_class | term_type               | zh          | en                | label_source      | glossary_identifier                              | verification_status | alias_of | alias_context | forbidden_when | review_note                                                                                   | downstream_boundary                                                                                             |
| -------------------------------------------- | ------------------------------------------- | ---------------------------------- | -------------------------------------------------- | ------------ | ------- | --------------------------- | ------------ | ----------------------- | ----------- | ----------------- | ----------------- | ------------------------------------------------ | ------------------- | -------- | ------------- | -------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `term-agent-anby-display-name`               | `map-agent-anby-name-display`               | `raw-agent-anby-name`              | `ev-zzz-nanoka-live-3-0-character-1011-2026-07-04` | `zzz_nanoka` | `3.0`   | `character.json:1011.zh/en` | `agent`      | `identity_display_name` | 安比        | Anby              | `observed_source` | `glossary_agent_anby_display_name`               | `accepted_seed`     |          |               |                | Phase 3 maps this source-observed bilingual name as an identity / display-name seed.          | May inform Phase 4 glossary expansion; not a final package field, runtime schema, API key, formula, or fixture. |
| `term-w-engine-lunar-pleniluna-display-name` | `map-w-engine-lunar-pleniluna-name-display` | `raw-wengine-lunar-pleniluna-name` | `ev-zzz-nanoka-live-3-0-weapon-12001-2026-07-04`   | `zzz_nanoka` | `3.0`   | `weapon.json:12001.zh/en`   | `w_engine`   | `identity_display_name` | 「月相」-望 | [Lunar] Pleniluna | `observed_source` | `glossary_w_engine_lunar_pleniluna_display_name` | `accepted_seed`     |          |               |                | Phase 3 maps this source-observed bilingual W-Engine name as an identity / display-name seed. | May inform Phase 4 glossary expansion; not a final package field, runtime schema, API key, formula, or fixture. |
| `term-bangboo-penguinboo-display-name`       | `map-bangboo-penguinboo-name-display`       | `raw-bangboo-penguinboo-name`      | `ev-zzz-nanoka-live-3-0-bangboo-53001-2026-07-04`  | `zzz_nanoka` | `3.0`   | `bangboo.json:53001.zh/en`  | `bangboo`    | `identity_display_name` | 企鹅布      | Penguinboo        | `observed_source` | `glossary_bangboo_penguinboo_display_name`       | `accepted_seed`     |          |               |                | Phase 3 maps this source-observed bilingual Bangboo name as an identity / display-name seed.  | May inform Phase 4 glossary expansion; not a final package field, runtime schema, API key, formula, or fixture. |

## Unresolved naming queue（not accepted glossary entries）

| unresolved_key                                    | field_map_ref                                      | raw_key                                       | evidence_ref                                        | candidate_text_zh | candidate_text_en | candidate_role                         | question                                                                                                               | blocked_term                                                                    | needed_evidence                                                                                           | allowed_next_action                                                                                                                                | verification_status |
| ------------------------------------------------- | -------------------------------------------------- | --------------------------------------------- | --------------------------------------------------- | ----------------- | ----------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| `unresolved-drive-disc-two-piece-mechanic-naming` | `map-drive-disc-woodpecker-electro-two-piece-text` | `raw-drive-disc-woodpecker-electro-crit-rate` | `ev-zzz-nanoka-live-3-0-equipment-31000-2026-07-04` | 暴击率+8%。       | CRIT Rate +8%     | `drive_disc_mechanic_text_observation` | Is this a stat name, set bonus text, formula concept, multiplier / bucket concept, fixture value, or test expectation? | accepted glossary term, `formula_input`, fixture, package field, runtime schema | Accepted formula source, numeric mechanic evidence, fixture source, or Phase 5 calculation spec decision. | Carry as unresolved mechanic naming candidate; do not consume as accepted glossary term, formula input, fixture, package field, or runtime schema. | `unresolved_naming` |

## Alias / deprecated entries（alias / deprecated 条目）

This seed has no accepted alias or deprecated entries.

Future alias / deprecated rows must have `alias_of`, `alias_context`,
`forbidden_when`, independent `evidence_ref`, and a deprecation reason when
applicable. Alias / deprecated rows without those fields stay in unresolved /
needs-evidence state and must not be treated as global replacement rules.

## Non-goals（非目标）

- 不做完整 ZZZ 术语表。
- 不做机制百科。
- 不定义 formula、stat bucket、condition 或 fixture。
- 不定义 package schema、API 或 runtime key。
- 不从旧实现、记忆或常识补齐未覆盖术语。
- 不把 `glossary_identifier` 当成 package field path。

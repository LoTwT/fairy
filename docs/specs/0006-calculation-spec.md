# Spec 0006 - Calculation spec

## Scope

这份 spec 定义 Fairy Phase 5A 如何把 `2.0 formula baseline` 转成可审查的
calculation contract。它规定 formula registry、bucket registry、
`calculation_effect`、mapping examples、fixture expectation seed，以及 Phase 6 之前的
downstream boundary。

Reader path 固定为：

`2.0 guide source / attachment` -> `formula baseline reference` ->
`calculation spec` -> `fixture seed` -> `Phase 6 handoff`

本阶段使用 2.0 攻略作为第一版主公式来源；它不是 3.0 final truth。后续 3.0 差异只能通过
reviewed evidence 和 patch PR 增量进入。

这份 spec **不**定义 package schema、runtime API、TypeScript type、scraping /
cleaning / resolver / calculation runtime，不承诺 Phase 6 代码结构，不建立完整角色 /
装备 / 敌人数据库，也不把 2.0 baseline 说成 3.0 最终事实。

## Rationale

Phase 2 提供 reviewed raw inventory sample，Phase 3 提供 field map sample，Phase 4
提供 terminology glossary seed 和 unresolved naming boundary。Phase 5A 的目标不是扩大
data coverage，也不是实现计算器，而是先把公式来源、bucket 归属、effect mapping 和
fixture expectation 变成可以 review 的 contract。

如果抓取数据直接写成最终乘区，`CRIT Rate +8%` 这类 mechanic text 很容易被误写成
`crit` bucket，而不是上游 `crit_rate` stat modifier。相反，`calculation_effect` 应该先
描述某个 effect 改变哪个 stat、bucket 或 formula input，再由后续 formula resolver 按
accepted formula registry 消费。

## Contract

### Source baseline

Phase 5A 的 source baseline 是：

| Field                  | Value                                                  |
| ---------------------- | ------------------------------------------------------ |
| `source_id`            | `zzz_2_0_guide_nga`                                    |
| `source_url`           | `https://ngabbs.com/read.php?tid=44468012`             |
| `source_attachment_id` | `07e196c7-5b75-4412-b4ad-6e367e5f05e8`                 |
| `document_status`      | `2.0 formula baseline`                                 |
| `version_boundary`     | 2.0 baseline only; later 3.0 differences require a PR. |
| `source_ref_shape`     | `NGA 2.0 guide / Part xx / section / formula_or_table` |

每个 formula、bucket、effect example 和 fixture row 都必须带 source locator。不能只引用
this spec 自身作为公式来源。

### Artifacts

Phase 5A artifacts 是：

| Artifact                                                           | Role                                                                                                                                 |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| [formula-baseline-2-0.md](../references/formula-baseline-2-0.md)   | Source-backed baseline reference：formula registry、bucket registry、defense formula inputs、effect examples、future formula areas。 |
| [phase-5-seed.md](../../data/calculation-fixtures/phase-5-seed.md) | Phase 5 fixture expectation seed / review artifact only；不是 package data source，也不是 runtime fixture database。                 |

### Status enums

`baseline_scope` 只允许：

| baseline_scope               | Meaning                                                                                                                |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `core_formula`               | Phase 5A 核心 formula registry row；必须只配合 `accepted_baseline_shape` 作为 implementation-ready 候选。              |
| `detail_review_formula_area` | 来源中存在并登记在 formula registry，但本 PR 只保留形态，仍需 detail review；不可进入 Phase 6 implementation handoff。 |
| `future_formula_area`        | 来源中存在，但本 PR 不接受为 Phase 5A core formula 或 fixture。                                                        |

`verification_status` 只允许：

| verification_status              | Meaning                                                                                     |
| -------------------------------- | ------------------------------------------------------------------------------------------- |
| `accepted_baseline_shape`        | 2.0 guide 支持公式或字段 shape，可作为 Phase 5A baseline shape；仍不是 3.0 final truth。    |
| `needs_formula_detail_review`    | source 有公式区域，但完整倍率、snapshot、实时结算或特殊规则未在本 PR 完成。                 |
| `future_formula_area`            | 只登记为 future area，不进入 core formula、fixture seed 或 Phase 6 implementation handoff。 |
| `unresolved_detail`              | 细节未解决，不能被 downstream 当作 accepted formula input 使用。                            |
| `needs_observed_effect_evidence` | guide 可说明分类，但缺少 Phase 2/3 observed effect row。                                    |
| `needs_source_confirmation`      | 属于 modeling assumption 或工程期望，需要后续 source / fixture 复核。                       |

`source_relation` 只允许：

| source_relation        | Meaning                                                                          |
| ---------------------- | -------------------------------------------------------------------------------- |
| `quoted_formula`       | expression 或规则形态直接来自 guide formula / table locator。                    |
| `derived_from_formula` | modeling field 从 guide formula 推导，用于保持 formula input / bucket 边界清楚。 |
| `modeling_boundary`    | 工程建模边界或 sample expectation；不能伪装成 source text。                      |

### Formula registry

Formula registry rows 必须包含：

| Field                 | Requirement                                                                                                                               |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `formula_id`          | stable formula id；不是 package API key。                                                                                                 |
| `zh_name`             | readable formula name。                                                                                                                   |
| `baseline_scope`      | `core_formula`、`detail_review_formula_area` 或 `future_formula_area`。                                                                   |
| `verification_status` | 使用本 spec status enum。                                                                                                                 |
| `source_ref`          | `NGA 2.0 guide / Part xx / section / formula_or_table` locator。                                                                          |
| `source_relation`     | `quoted_formula` / `derived_from_formula` / `modeling_boundary`。                                                                         |
| `expression`          | baseline expression 或 `needs_detail_review`。                                                                                            |
| `bucket_sequence`     | formula 消费的 bucket / formula input 顺序。                                                                                              |
| `rounding_or_clamp`   | source-backed rule；如果只是工程假设，必须标 `source_relation=modeling_boundary` 或留待后续确认。                                         |
| `downstream_boundary` | 是否可进入 Phase 6；只有 `baseline_scope=core_formula` + `verification_status=accepted_baseline_shape` 可作为 implementation-ready 候选。 |

Phase 5A core formulas 只接受：

- `regular_damage`
- `penetrating_damage`
- `daze_buildup`
- `anomaly_buildup`

`anomaly_damage`、`disorder_damage`、`disorder_daze` 可以出现在 registry 中，但如果本 PR
不完整解决倍率、虚拟代理人 snapshot、实时结算和属性异常差异，必须标
`baseline_scope=detail_review_formula_area` +
`verification_status=needs_formula_detail_review`，且 downstream 不可
implementation-ready。

Part 04-07 只能放入 `Future formula areas（not accepted Phase 5A formulas）`，不能有
Phase 5A fixture seed。

### Bucket registry

Bucket registry rows 必须包含：

| Field                 | Requirement                                                               |
| --------------------- | ------------------------------------------------------------------------- |
| `bucket_id`           | stable bucket id；不是 package runtime path。                             |
| `formula_ids`         | 消费该 bucket 的 formula id 列表。                                        |
| `source_ref`          | guide locator。                                                           |
| `source_relation`     | 说明这是 quoted formula、derived modeling field，还是 modeling boundary。 |
| `composition_rule`    | additive、multiplicative、expected-value、formula-input 等规则。          |
| `verification_status` | 使用本 spec status enum。                                                 |
| `downstream_boundary` | 后续 effect resolver / fixture / Phase 6 可消费边界。                     |

`defense_reduction`、`defense_ignore`、`penetration_rate`、`penetration_value` 是
`defense` bucket 的 explicit formula inputs，不是 ordinary bucket，也不能归入
`damage_bonus`。

### calculation_effect contract

后续抓取到的数据必须先落为 `calculation_effect`，再由 formula resolver 消费。Required
fields：

| Field                 | Requirement                                                                                        |
| --------------------- | -------------------------------------------------------------------------------------------------- |
| `effect_id`           | effect row stable id。                                                                             |
| `source_id`           | raw source id 或 guide source id。                                                                 |
| `source_ref`          | raw evidence / field map / guide locator。                                                         |
| `field_map_ref`       | Phase 3 `map_key`；没有 observed row 时用 `not_applicable`，不能伪造。                             |
| `raw_key`             | Phase 2 raw key；没有 observed row 时用 `not_applicable`。                                         |
| `evidence_ref`        | Phase 2 evidence ref；没有 observed row 时用 `not_applicable`。                                    |
| `effect_kind`         | `stat_modifier`、`bucket_modifier`、`formula_parameter`、`trigger_condition`、`special_override`。 |
| `target_stat`         | 被修改的 stat；没有时留空或 `not_applicable`。                                                     |
| `target_bucket`       | 被修改的 bucket；没有时留空或 `not_applicable`。                                                   |
| `formula_input`       | explicit formula input，如 `defense_reduction`。                                                   |
| `operation`           | `add_pct`、`add_flat`、`subtract_pct`、`multiply`、`set`、`replace`、`ignore`、`clamp`。           |
| `value`               | numeric value；unknown 时不可默认补值。                                                            |
| `unit`                | `ratio`、`points`、`seconds`、`multiplier`、`level` 等。                                           |
| `condition`           | 属性、伤害类型、状态、技能类型、目标状态、触发条件等。                                             |
| `stacking_rule`       | `same_bucket_additive`、`formula_specific`、`unique`、`unknown` 等。                               |
| `snapshot_timing`     | `realtime`、`hit_snapshot`、`anomaly_virtual_agent`、`not_applicable`、`needs_review`。            |
| `source_relation`     | 使用本 spec source relation enum。                                                                 |
| `verification_status` | 使用本 spec status enum。                                                                          |
| `downstream_boundary` | 说明是否可供 fixture / Phase 6 消费。                                                              |

Mapping examples 必须至少覆盖：

- `CRIT Rate +8%`
- damage bonus
- attribute damage bonus
- defense reduction
- defense ignore
- penetration rate
- penetration value
- damage taken
- stunned damage taken
- penetrating damage bonus

Mapping examples 不能伪造 Phase 2/3 evidence。只有已有 observed effect row 的 example 才能
填 `field_map_ref` / `raw_key` / `evidence_ref`；guide-only explanatory example 必须使用
`field_map_ref=not_applicable` 并标 `needs_observed_effect_evidence`。

### Fixture seed contract

`data/calculation-fixtures/phase-5-seed.md` 是 Phase 5 fixture expectation seed / review
artifact only。它不是 package data source、runtime fixture database、完整角色数据库、完整
装备数据库或敌人数据库。

每条 fixture row 必须包含：

| Field                   | Requirement                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------- |
| `fixture_id`            | stable fixture seed id。                                                                                  |
| `formula_id`            | related formula id。                                                                                      |
| `source_ref`            | guide locator。                                                                                           |
| `source_relation`       | source relation enum。                                                                                    |
| `purpose`               | 只说明 formula structure / bucket separation / source-backed rounding or clamp expectation。              |
| `input_effects`         | synthetic shape 或 existing evidence refs；不能伪装成完整 data source。                                   |
| `expected_intermediate` | source-backed 或 explicitly modeled expected intermediate。                                               |
| `expected_output`       | expected structure；numeric output 只有在 source/fixture 足够时才写。                                     |
| `rounding_or_clamp`     | guide 明说的规则可以 source-backed；否则标 `needs_source_confirmation` 或留空。                           |
| `snapshot_expectation`  | guide 明说的 snapshot rule 可写 source-backed；否则标 `modeling_boundary` / `needs_source_confirmation`。 |
| `verification_status`   | 使用本 spec status enum。                                                                                 |
| `downstream_boundary`   | 说明不可直接作为 Phase 6 runtime fixture DB。                                                             |
| `non_coverage_note`     | 每一行都必须说明不是完整角色 / 驱动盘 / 敌人 / 技能 / 异常 / 装备数据库覆盖。                             |

## Implementation Notes

Phase 5A PR 应保持 documentation / review artifact only：

- 新增这份 spec；
- 新增 `docs/references/formula-baseline-2-0.md`；
- 新增 `data/calculation-fixtures/phase-5-seed.md`；
- 更新 docs routing；
- 不新增 package code；
- 不新增 `src/` calculation runtime；
- 不新增 package schema、runtime API、TypeScript type；
- 不新增 scraper、cleaner、resolver 或 automation；
- 不创建 complete role / equipment / enemy database；
- 不把 future formula areas 作为 accepted core formulas。

## Acceptance

当 PR 提供以下内容时，本 phase sample 通过：

- spec 顶部写明 reader path 和 `2.0 formula baseline` 状态；
- baseline source 带 `source_attachment_id=07e196c7-5b75-4412-b4ad-6e367e5f05e8`；
- formula reference 包含 formula registry、bucket registry、defense explicit inputs、
  mapping examples 和 `Future formula areas（not accepted Phase 5A formulas）`；
- core accepted baseline shape 只包含 `regular_damage`、`penetrating_damage`、
  `daze_buildup`、`anomaly_buildup`；
- `anomaly_damage`、`disorder_damage`、`disorder_daze` 如出现，必须标
  `baseline_scope=detail_review_formula_area` +
  `verification_status=needs_formula_detail_review`，且 downstream 不
  implementation-ready；
- `defense_reduction`、`defense_ignore`、`penetration_rate`、`penetration_value` 是
  `defense` formula inputs，不是 ordinary buckets；
- mapping examples 不伪造 Phase 2/3 evidence；
- fixture seed 每行都有 `non_coverage_note`，并明确不是 package data source /
  runtime fixture database；
- routing updates 能从 `docs/index.md`、`docs/specs/README.md`、
  `docs/references/README.md` 和 `docs/data/README.md` 找到 Phase 5A artifacts；
- PR 没有引入 package schema、runtime API、TypeScript type、scraping / cleaning /
  resolver / calculation runtime、Phase 6 code structure commitment、complete
  database 或 3.0 final-truth claim。

PR verification：

- `pnpm install --frozen-lockfile` 成功。
- `pnpm check` 成功。
- `git diff --check upstream/main...HEAD` 成功。
- tracked Markdown relative links 可解析。
- calculation docs structured smoke 通过：formula rows、bucket rows、effect example
  rows、fixture rows 都有 source/status/downstream boundary fields；只有
  `baseline_scope=core_formula` + `verification_status=accepted_baseline_shape` 的 formula
  rows 可进入 accepted core formula list；fixture rows 都有 `non_coverage_note`；没有 Phase 6
  implementation artifacts。

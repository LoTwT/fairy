# Spec 0004 - Domain field map

## Scope

这份 spec 定义 Fairy Phase 3 如何从 reviewed raw inventory sample 产出第一版
domain field map。它规定 field map artifact 的 traceability、table shape、
object / use classification、draft label 边界、unresolved queue，以及后续
glossary / formula / package work 可以如何消费这些 mapping。

它**不**定义完整 final data model，不创建 canonical glossary，不定义 formulas，不创建
fixtures，不创建 package API，不新增 cleaning script，也不实现 package code。

## Rationale

Phase 2 已经提供了小范围 raw inventory sample 和 minimum evidence reference。Phase 3
的目标不是扩大 collection，而是验证从 raw observation 到 domain use 的 mapping
方法是否可审查、可追溯、可延展。

如果 field map 直接使用 package-like paths 或从字段名推断 mechanic ownership，后续
glossary、formula spec 和 runtime schema 很容易误用 sample draft。Phase 3 因此必须把
raw observation、draft domain mapping、use class、unresolved decision 分层记录，并让每
一条 mapping 回到 Phase 2 的 `raw_key` / `evidence_ref` / `context` / `version`。

## Contract

### Input evidence

Phase 3 sample field map 只能消费已经 reviewed 的 Phase 2 artifacts：

- [Phase 2 raw inventory sample](../../data/raw-inventory/phase-2-sample.md)；
- [Phase 2 sample evidence notes](../../data/raw/phase-2-sample/evidence.md)；
- [source registry draft](../data/source-registry.md)。

每条 field map row 都必须引用 Phase 2 row 的 `raw_key`、`evidence_ref`、`source_id`、
`version` 和 `context`。缺少任一 traceability field 的 observation 不能进入 mapped
sample，只能进入 unresolved queue 或 deferred note。

### Field map artifact

第一版 sample field map 存放在
[`data/field-map/phase-3-sample.md`](../../data/field-map/phase-3-sample.md)。
这个 artifact 只映射 Phase 2 sample rows，不是 final package schema。

Required columns：

| Field                 | Meaning                                                                                                     |
| --------------------- | ----------------------------------------------------------------------------------------------------------- |
| `map_key`             | field map row 内部稳定 key。                                                                                |
| `raw_key`             | Phase 2 raw inventory row key。                                                                             |
| `evidence_ref`        | Phase 2 evidence reference。                                                                                |
| `source_id`           | Phase 2 source id。                                                                                         |
| `version`             | Phase 2 version marker。                                                                                    |
| `context`             | Phase 2 context path 或 equivalent observation context。                                                    |
| `observed_zh`         | source 中实际观察到的中文文本；没有 evidence 时留空，不补译。                                               |
| `observed_en`         | source 中实际观察到的英文文本；没有 evidence 时留空，不补译。                                               |
| `object_class`        | 这条 observation 当前可支持的 object class。                                                                |
| `use_type`            | 这条 observation 当前可支持的 primary use。                                                                 |
| `draft_mapping_label` | conservative draft label，只用于 review mapping shape；不是 final domain path、package API 或 runtime key。 |
| `mapping_status`      | 当前 mapping state。                                                                                        |
| `confidence`          | evidence confidence note；不能绕过 traceability 或 review gate。                                            |
| `rationale`           | 为什么这样分类，必须引用 observed context。                                                                 |
| `downstream_boundary` | 后续 glossary、formula spec 或 package model 消费这条 mapping 前的限制。                                    |

`draft_mapping_label` 必须使用明显的 draft / candidate 语义，避免 `agent.identity.name`
这类 package-like dot path。任何看起来像 final package schema 的 label 都必须改写为更
保守的 wording。

### Object classes

第一版 sample field map 只允许以下 `object_class`：

| object_class | Meaning                              |
| ------------ | ------------------------------------ |
| `agent`      | Agent / playable combat actor sample |
| `w_engine`   | W-Engine sample                      |
| `bangboo`    | Bangboo sample                       |
| `drive_disc` | Drive Disc sample                    |
| `unknown`    | evidence 不足，无法分类              |

新增 `object_class` 需要新的 reviewed evidence 和 spec / artifact update。不能只因为
raw file name、display label 或旧实现存在某个概念，就新增 class。

### Use types

第一版 sample field map 只允许以下 `use_type`：

| use_type                | Meaning                                                                            |
| ----------------------- | ---------------------------------------------------------------------------------- |
| `identity_display_name` | 可作为 identity / display name mapping 的 sample。                                 |
| `mechanic_text`         | 可作为 mechanic text observation 的 sample；不等于 formula field。                 |
| `ui_display_text`       | 只证明 UI / display text 用途。                                                    |
| `glossary_candidate`    | 可供 Phase 4 参考的候选术语 observation；不是 canonical glossary entry。           |
| `formula_candidate`     | 可供 Phase 5 参考的 formula-relevant observation；不是 formula input。             |
| `formula_input`         | future-only enum；本 Phase 3 sample PR 不使用。使用前必须有独立 formula evidence。 |
| `unresolved`            | evidence 不足，不能映射到 accepted use。                                           |

本 sample 中 Drive Disc 2-piece row 的 primary `use_type` 必须是 `mechanic_text`。
Formula relevance 只能写在 `downstream_boundary` 或 unresolved queue，不能让该 row 变成
`formula_input`、formula test expectation 或 fixture value。

### Mapping status and confidence

`mapping_status` 只允许：

| mapping_status | Meaning                                                |
| -------------- | ------------------------------------------------------ |
| `mapped_draft` | 可作为 Phase 3 sample draft mapping。                  |
| `unresolved`   | mapping decision blocked by missing evidence。         |
| `deferred`     | 当前 sample 不覆盖，留给后续 reviewed source / phase。 |

`confidence` 只允许：

| confidence         | Meaning                                                           |
| ------------------ | ----------------------------------------------------------------- |
| `sample_candidate` | 由 Phase 2 sample evidence 支持，但仍是 candidate / draft。       |
| `cross_checked`    | 已由额外 accepted evidence cross-check；本 sample PR 默认不使用。 |
| `insufficient`     | evidence 不足，不能映射为 accepted draft。                        |

`confidence` 是 review note，不是 acceptance override。`confidence=sample_candidate` 或
`confidence=cross_checked` 都不能替代 `raw_key`、`evidence_ref`、`context` 和 reviewer
approval。

### Unresolved queue

同一个 sample artifact 必须包含 `Unresolved queue（unresolved, not accepted model fields）`
section，避免读者把未证明问题误读成 accepted model fields。

Required columns：

| Field                 | Meaning                                     |
| --------------------- | ------------------------------------------- |
| `unresolved_key`      | unresolved item 的稳定 key。                |
| `raw_key`             | related Phase 2 raw inventory row key。     |
| `evidence_ref`        | related Phase 2 evidence reference。        |
| `question`            | 当前不能回答的问题。                        |
| `blocked_mapping`     | 被这个问题阻塞的 mapping / use。            |
| `needed_evidence`     | 需要哪些额外 evidence 才能解除 unresolved。 |
| `allowed_next_action` | 在 unresolved 解除前允许的安全后续动作。    |

Unresolved queue 可以被 Phase 4 / Phase 5 用作 review input，但不能被当作 accepted
glossary、formula input、fixture expectation、package data 或 runtime schema。

### Downstream consumption

Phase 4 glossary 可以参考 `identity_display_name`、`ui_display_text` 和
`glossary_candidate` rows，但必须重新审查 canonical term、aliases 和 naming rules。

Phase 5 formula spec 可以参考 `mechanic_text` 和 `formula_candidate` rows，但必须重新审
查 formula ownership、numeric meaning、fixture source 和 version assumptions。

Package data / package API 不能直接消费 Phase 3 sample field map。Package-facing schema
需要后续 package design / calculation spec 明确接受。

## Implementation Notes

Phase 3 sample PR 应保持 documentation / data artifact only：

- 新增这份 spec；
- 新增 Phase 3 sample field map artifact；
- 更新 documentation routing；
- 不扩大 raw inventory；
- 不创建 final domain schema；
- 不创建 glossary；
- 不创建 formula spec；
- 不创建 fixtures；
- 不创建 package code、cleaning script 或 automation。

## Acceptance

当 PR 提供以下内容时，本 phase sample 通过：

- `docs/specs/0004-domain-field-map.md` 定义 field map scope、traceability、table shape、
  object / use enum、unresolved queue 和 downstream boundary；
- `data/field-map/phase-3-sample.md` 只映射 PR #112 的 4 条 sample rows；
- 每条 mapped row 都保留 `raw_key`、`evidence_ref`、`source_id`、`version` 和
  `context`；
- Drive Disc 2-piece row 只作为 `mechanic_text` sample，formula relevance 留在
  `downstream_boundary` / unresolved queue；
- `Unresolved queue（unresolved, not accepted model fields）` 明确记录 blocked mapping、
  needed evidence 和 allowed next action；
- routing updates 能从 `docs/index.md` 和 `docs/specs/README.md` 找到 Phase 3 spec /
  sample artifact；
- PR 没有引入 full model、glossary、formula、fixtures、package API、package code、
  cleaning script 或 automation。

PR verification：

- `pnpm install --frozen-lockfile` 成功。
- `pnpm check` 成功。
- `git diff --check origin/main...HEAD` 成功。
- tracked Markdown relative links 可解析。

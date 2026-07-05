# Spec 0005 - Terminology glossary

## Scope

这份 spec 定义 Fairy Phase 4 如何建立 terminology glossary contract 和第一版
sample-backed seed glossary。它规定 glossary artifact 的 traceability、table shape、
`verification_status`、alias / deprecated gate、unresolved naming queue，以及后续
formula / package work 可以如何消费这些 terminology rows。

它**不**定义完整 ZZZ 术语表，不创建机制百科，不定义 formula、stat bucket、
condition 或 fixture，不创建 package schema / API / runtime key，也不从旧实现、记忆或
常识补齐未覆盖术语。

## Rationale

Phase 2 已经提供 reviewed raw inventory sample 和 evidence notes。Phase 3 已经把这些
raw observations 映射成 evidence-traced field map rows 和 unresolved queue。Phase 4 的
目标不是扩大 coverage，而是验证 terminology artifact 如何从 Phase 3 mapping 安全地建
立 seed glossary。

如果 glossary row 直接从 raw text 跳到 package-like key，或把 mechanism text 当作
formula / model fact，后续 calculation spec 和 package runtime schema 会继承未经审查的
假设。因此 Phase 4 必须显式区分 source-observed label、glossary-scoped identifier、
accepted seed、unresolved naming，以及 downstream consumption boundary。

## Contract

### Input evidence

Phase 4 seed glossary 只能消费已经 reviewed 的 Phase 2 / Phase 3 artifacts：

- [Phase 2 raw inventory sample](../../data/raw-inventory/phase-2-sample.md)；
- [Phase 2 sample evidence notes](../../data/raw/phase-2-sample/evidence.md)；
- [Phase 3 field map sample](../../data/field-map/phase-3-sample.md)；
- [Spec 0004 - Domain field map](0004-domain-field-map.md)。

每条 accepted glossary row 都必须能通过 `field_map_ref` 回到 Phase 3 `map_key`，再通过
`raw_key` / `evidence_ref` 回到 Phase 2 raw inventory 和 evidence notes。缺少任一
traceability field 的 candidate 不能进入 accepted seed glossary。

### Glossary artifacts

Phase 4 glossary contract 存放在本 spec。第一版 seed glossary 存放在
[`docs/references/glossary.md`](../references/glossary.md)。

当前阶段不创建 `data/glossary/`，不创建 machine-readable artifact，也不定义 package
data source。后续如果需要 machine-readable glossary，必须单独通过 source / storage /
schema review gate。

读者路径固定为：

`docs/index.md` -> `docs/specs/0005-terminology-glossary.md` ->
`docs/references/glossary.md` -> `field_map_ref` -> Phase 3 field map ->
`raw_key` / `evidence_ref` -> Phase 2 raw inventory / evidence。

### Accepted seed glossary table

Seed glossary 主表必须命名为：

`Accepted seed glossary（sample-backed, not complete coverage）`

这个标题必须保留 `sample-backed` 和 `not complete coverage` 语义，避免读者把 seed
glossary 误读成完整术语表。

Required columns：

| Field                 | Meaning                                                                                |
| --------------------- | -------------------------------------------------------------------------------------- |
| `term_id`             | glossary row 内部稳定 id；不是 package field name、runtime key 或 API key。            |
| `field_map_ref`       | Phase 3 field map `map_key`。                                                          |
| `raw_key`             | Phase 2 raw inventory row key。                                                        |
| `evidence_ref`        | Phase 2 evidence reference。                                                           |
| `source_id`           | Phase 2 source id。                                                                    |
| `version`             | Phase 2 version marker。                                                               |
| `context`             | Phase 2 context path 或 equivalent observation context。                               |
| `object_class`        | 来自 Phase 3 field map 的 object class。                                               |
| `term_type`           | 这条 terminology row 当前可支持的 primary terminology use。                            |
| `zh`                  | source-observed 中文文本，或明确标注的 glossary label。                                |
| `en`                  | source-observed 英文文本，或明确标注的 glossary label。                                |
| `label_source`        | `zh` / `en` 的来源类型；用于区分 source-observed text 和 later glossary label。        |
| `glossary_identifier` | glossary-scoped identifier；不是 package schema、runtime field path 或 final API key。 |
| `verification_status` | 当前 verification state；主表只允许 `accepted_seed`。                                  |
| `alias_of`            | alias row 指向的 accepted `term_id`；非 alias row 留空。                               |
| `alias_context`       | alias 只在哪些 object / source / context 下成立；非 alias row 留空。                   |
| `forbidden_when`      | alias 不能使用的条件；非 alias row 留空。                                              |
| `review_note`         | 为什么这条 row 只在 glossary 层成立，以及不代表 formula / package schema 的说明。      |
| `downstream_boundary` | 后续 glossary expansion、formula spec 或 package model 消费这条 row 前的限制。         |

主表只允许 `verification_status=accepted_seed`。其他状态必须放入 unresolved / queue，不允许
被 downstream 当作 accepted glossary term 使用。

### Term types

第一版 seed glossary 只允许以下 `term_type`：

| term_type                   | Meaning                                                                          |
| --------------------------- | -------------------------------------------------------------------------------- |
| `identity_display_name`     | identity / display name seed，必须来自 Phase 3 `identity_display_name` mapping。 |
| `mechanic_naming_candidate` | mechanic text naming question；不能进入 accepted seed 主表。                     |
| `alias`                     | evidence-backed alias；首版 seed 默认不使用。                                    |
| `deprecated_alias`          | evidence-backed deprecated alias；首版 seed 默认不使用。                         |

新增 `term_type` 需要新的 reviewed evidence 和 spec / artifact update。不能只因为旧实现、
记忆、常识或 UI 直觉存在某个概念，就新增 term type。

### Label source

`label_source` 只允许：

| label_source      | Meaning                                                                   |
| ----------------- | ------------------------------------------------------------------------- |
| `observed_source` | `zh` / `en` 直接来自 accepted Phase 2 source observation。                |
| `glossary_label`  | `zh` / `en` 是后续 glossary normalization label，不伪装成 observed text。 |

首版 accepted seed glossary 只允许 `label_source=observed_source`。如果后续要使用
`glossary_label`，必须在 `review_note` 中说明它如何从 accepted evidence 推导，并保留原始
observed text 的引用。

### Verification status

`verification_status` 只允许：

| verification_status     | Meaning                                                                                   |
| ----------------------- | ----------------------------------------------------------------------------------------- |
| `accepted_seed`         | 有 raw evidence 和 field map support，只作为 Phase 4 seed glossary 使用。                 |
| `needs_evidence`        | 可能是术语，但缺少 raw evidence、version / context，或缺少 field map support。            |
| `unresolved_naming`     | 有 observed text，但术语边界、命名归属或 downstream consumption 未定。                    |
| `rejected_out_of_scope` | 属于 formula、机制百科、package schema、future / unreleased source，或不是 Phase 4 范围。 |

只有 `accepted_seed` 可以进入 seed glossary 主表。`needs_evidence`、`unresolved_naming` 和
`rejected_out_of_scope` 必须留在 unresolved / queue 或后续 task，不允许被 downstream 当作
accepted glossary term 使用。

### Alias and deprecated gate

首版 seed glossary 没有 evidence-backed alias / deprecated rows 时，不要创建 accepted
alias rows。Spec 可以定义规则；glossary artifact 可以说明当前 seed 没有 accepted
alias / deprecated entries。

任何 alias / deprecated row 都必须满足：

| Field                | Requirement                                                                  |
| -------------------- | ---------------------------------------------------------------------------- |
| `alias_of`           | 必须指向已有 `verification_status=accepted_seed` 的 `term_id`。              |
| `alias_context`      | 必须说明 alias 只在哪个 object / source / context 下成立，不能默认全局成立。 |
| `forbidden_when`     | 必须说明什么情况下不能把这个 alias 当成同义词。                              |
| `evidence_ref`       | alias / deprecated 的证据必须独立存在，不能只凭常识或 UI 感觉。              |
| `deprecation_reason` | deprecated row 必须说明版本、来源、翻译、旧称或项目内不用的原因。            |

缺少 `alias_context`、`forbidden_when` 或 independent evidence 的 alias，只能是
`needs_evidence` 或 `unresolved_naming`，不能进入 accepted seed。

### Unresolved naming queue

Seed glossary artifact 必须包含：

`Unresolved naming queue（not accepted glossary entries）`

Required columns：

| Field                 | Meaning                                                                   |
| --------------------- | ------------------------------------------------------------------------- |
| `unresolved_key`      | unresolved naming item 的稳定 key。                                       |
| `field_map_ref`       | Phase 3 field map `map_key`。                                             |
| `raw_key`             | Phase 2 raw inventory row key。                                           |
| `evidence_ref`        | Phase 2 evidence reference。                                              |
| `candidate_text_zh`   | source-observed 中文 candidate text。                                     |
| `candidate_text_en`   | source-observed 英文 candidate text。                                     |
| `candidate_role`      | candidate 当前可证明的角色。                                              |
| `question`            | 当前不能回答的问题。                                                      |
| `blocked_term`        | 被这个 unresolved item 阻塞的 term / downstream use。                     |
| `needed_evidence`     | 需要哪些额外 evidence 才能解除 unresolved。                               |
| `allowed_next_action` | 在 unresolved 解除前允许的安全后续动作。                                  |
| `verification_status` | 必须是 `unresolved_naming`、`needs_evidence` 或 `rejected_out_of_scope`。 |

Drive Disc 2-piece text `CRIT Rate +8%` / `暴击率+8%。` 必须进入 unresolved naming
queue，不能进入 accepted seed 主表。当前只能证明它是 Drive Disc mechanic text
observation；不能确定它是 stat name、set bonus text、formula concept、
multiplier / bucket concept、fixture value 或 test expectation。Phase 5 才能判断
stat / value / bucket / condition。

### Downstream consumption

Phase 4 accepted seed glossary 可以作为后续 terminology expansion 的 reference input，
但不能直接成为 package schema、runtime field path 或 final API key。

Phase 5 formula spec 可以参考 unresolved naming queue 中的 mechanic text observation，
但必须重新审查 formula ownership、numeric meaning、stat / value / bucket / condition、
fixture source 和 version assumptions。

Package data / package API / runtime schema 不能直接消费 Phase 4 seed glossary 或
unresolved naming queue。Package-facing schema 需要后续 package design / calculation
spec 明确接受。

## Implementation Notes

Phase 4 sample PR 应保持 documentation / reference artifact only：

- 新增这份 spec；
- 新增或更新 `docs/references/glossary.md`；
- 更新 documentation routing；
- 不新增 `data/glossary/`；
- 不创建 machine-readable artifact；
- 不创建 full glossary coverage；
- 不定义 formula、stat bucket、condition 或 fixture；
- 不创建 package schema、API、runtime key 或 package code；
- 不从旧实现、记忆或常识补齐未覆盖术语。

## Acceptance

当 PR 提供以下内容时，本 phase sample 通过：

- `docs/specs/0005-terminology-glossary.md` 定义 glossary scope、traceability、table
  shape、`verification_status`、alias / deprecated gate、unresolved naming queue 和
  downstream boundary；
- `docs/references/glossary.md` 包含
  `Accepted seed glossary（sample-backed, not complete coverage）` 主表，并且主表只含
  `verification_status=accepted_seed` rows；
- accepted seed 只包含 Phase 3 可支持的 3 条 identity / display name rows；
- Drive Disc 2-piece text 位于
  `Unresolved naming queue（not accepted glossary entries）`，并明确不能被消费为
  accepted glossary term、formula input、fixture、package field 或 runtime schema；
- 首版没有 unsupported alias / deprecated rows；alias / deprecated gate 在 spec 中定义；
- routing updates 能从 `docs/index.md`、`docs/specs/README.md` 和
  `docs/references/README.md` 找到 Phase 4 spec / glossary artifact；
- PR 没有引入 full glossary、mechanism encyclopedia、formula、fixtures、package API、
  package schema、runtime key、package code 或 machine-readable data artifact。

PR verification：

- `pnpm install --frozen-lockfile` 成功。
- `pnpm check` 成功。
- `git diff --check origin/main...HEAD` 成功。
- tracked Markdown relative links 可解析。

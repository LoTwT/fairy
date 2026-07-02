# Spec 0003 - Source data inventory plan

## Scope

这份 spec 定义 Fairy 在创建任何 domain model、glossary、calculation spec 或 package code 之前，如何进行 Phase 1 source data acquisition 和 inventory 计划。它覆盖 source registry requirements、source trust levels、acquisition boundaries、raw snapshot retention、第一版 raw-inventory row shape、sample-slice selection，以及后续 data phases 开始前必须具备的 exit evidence。

它**不**获取 source data，不保存 raw snapshots，不清洗 data，不定义 canonical gameplay fields，不定义 glossary terms，不定义 formulas，不创建 packages，也不新增 scripts。这些都属于后续 phases。

## Rationale

Fairy 是 damage calculator，因此未来的 identifiers、formulas 和 runtime schemas 必须来自可追溯的 game data 以及经过 review 的 source evidence。如果先做 terminology-first 或 implementation-first，会很容易引入猜测出来的边界、过期 aliases，以及看似合理但没有被数据证明的 variable names。

[0001-clean-slate.md](0001-clean-slate.md) 中的 reset contract 也意味着 pre-reset implementation 不能作为 source 使用。项目需要一条可见的 evidence chain：从 raw source 到 cleaned inventory，再到 field maps、glossary、formula specs 和 calculation code。

## Contract

### Phase order

Data 和 calculation 工作按以下顺序推进：

1. Source / data acquisition plan.
2. Raw data inventory + cleaning.
3. Domain data model / field map.
4. Terminology glossary.
5. Calculation spec.
6. Core calculation library.

这份 spec 只管 Phase 1。后续 phase 只有在前一 phase 已有 reviewed pass/defer conclusion 且具备所需 exit evidence 后，才可以 merge。

### Source registry

Phase 2 准备用到的每个 source class 或 concrete source，在使用前都必须有 registry entry。registry entry 包含：

| Field                | Meaning                                                                                               |
| -------------------- | ----------------------------------------------------------------------------------------------------- |
| `source_id`          | source entry 的稳定本地 identifier。                                                                  |
| `source_class`       | source class，例如 `game_client_ui`、`official`、`wiki`、`community`、`derived` 或 `unavailable`。    |
| `trust_level`        | review grade：`primary`、`secondary`、`context` 或 `rejected`。                                       |
| `acquisition_method` | source 将如何取得或捕获。                                                                             |
| `version_marker`     | game version、page revision、snapshot date，或其他稳定 version marker。                               |
| `evidence_format`    | 预期 evidence shape：screenshot、exported file、markdown note、archived page、attachment 或类似形式。 |
| `raw_retention`      | immutable raw artifact 在后续 phase 中保存在哪里、如何保存。                                          |
| `usage_note`         | permission、terms、attribution 和实际使用注意事项。                                                   |
| `known_limits`       | coverage 缺口、ambiguity、language gaps，或 source 不能作为 authoritative 的原因。                    |

Trust levels 保守使用：

- `primary` - direct in-game evidence，或 maintainer-approved official material。
- `secondary` - community 或 wiki material，可用于 cross-checking，但不能单独作为 authoritative。
- `context` - 可解释 term 或 mechanic 的 background material，但不能单独定义 canonical field。
- `rejected` - 已知 unreliable、inaccessible、stale、unversioned，或不适合使用。

pre-reset Fairy implementation 和旧 published package contents 只作为 historical records。它们不能注册为 data sources。

### Acquisition boundaries

Acquisition 必须保持在经过 review、可复现、且 permission-aware 的方法内。

- 不使用 credentials、private APIs、anti-cheat bypasses、traffic interception，或 terms-of-service workarounds。
- 在 maintainer 批准方法及预期输出前，不对 source 做 automated collection。
- Human-provided attachments、manual capture 和 public-source notes 只有在包含 evidence references 与 version markers 时才有效。
- 如果 source inaccessible、ambiguous、unversioned 或 permission-limited，应记录为 unavailable 或 rejected，而不是静默替换成另一个 source。

### Raw artifact retention

Raw artifacts 是 immutable evidence。未来 Phase 2 inventory 可以新增 `data/` 或另一个经过 review 的位置来保存 raw snapshots，但 Phase 1 不创建该目录。

每个 raw artifact 的 retention plan 必须包括：

- 稳定的 `evidence_ref`；
- `source_id`；
- `version_marker`；
- acquisition method；
- raw artifact format；
- 足以发现 accidental replacement 的 location 或 checksum information；
- 当 raw material 不能存入 repository 时，用于 redaction 或 exclusion 的说明。

Cleaned 或 interpreted rows 必须通过 `evidence_ref` 引用 raw artifacts。它们不能覆盖、改写 raw evidence，也不能成为 raw evidence 的唯一副本。

### Raw inventory row shape

第一版 raw inventory table 对每个观察到的 source item、term、field、formula fragment 或 mechanic note 使用一行。它不是 canonical domain model。

Required columns：

| Field               | Meaning                                                                                                                |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `raw_key`           | raw inventory row 内部的稳定 key。                                                                                     |
| `zh`                | 观察到的简体中文文本；不存在时留空。                                                                                   |
| `en`                | 观察到的英文文本；不存在时留空。                                                                                       |
| `source`            | Registry `source_id`。                                                                                                 |
| `context`           | item 出现的位置：UI area、page section、file、mechanic 或类似上下文。                                                  |
| `version`           | 从 source registry 复制或与其兼容的 source version marker。                                                            |
| `evidence_ref`      | retained raw artifact 的 link 或 identifier。                                                                          |
| `stability`         | `confirmed`、`candidate`、`ambiguous`、`deprecated` 或 `unavailable`。                                                 |
| `extraction_method` | `manual_capture`、`manual_transcription`、`attachment_review`、`public_page_review`、`derived_note` 或 `unavailable`。 |
| `notes`             | 简短 provenance、ambiguity、review 或 exclusion notes。                                                                |

Optional column：

| Field                  | Meaning                                                                                              |
| ---------------------- | ---------------------------------------------------------------------------------------------------- |
| `candidate_identifier` | 该 row 建议的 draft English identifier。后续 glossary 或 field-map phases 批准前，它不是 canonical。 |

Raw inventory 必须在每一行保留 provenance columns。缺少 `source`、`context`、`version` 和 `evidence_ref` 的 row，不能用于后续 canonical identifiers 或 formulas。

### Sample slice

第一份 Phase 2 sample slice 应刻意保持小范围、重 evidence。它应包括：

- 一个 Agent 或可比较的 combat actor；
- 一个 W-Engine、Drive Disc 或可比较的 equipment source；
- 一条 basic damage path，并且有足够 source material 可生成未来 fixture；
- 至少一条 bilingual terminology row，其中 `zh` 和 `en` 都被观察到，或缺失的一侧被明确标记；
- 只使用已有 registry entries 和 raw-retention plans 的 sources。

Sample slice 的目的是验证 evidence chain。它不应尝试覆盖完整 game content。

### Hard stops

如果发生以下任何情况，停止并返回 review：

- source 不能追溯到 registry entry；
- source 没有 version marker；
- source trust levels 混用但没有 row-level notes；
- raw artifacts 无法 retained 或 referenced；
- inventory rows 缺少 `evidence_ref`；
- Phase 2+ content 在前置 gates 通过前，开始定义 canonical field boundaries、glossary identifiers、formulas 或 package APIs。

## Implementation Notes

Phase 1 只应以 documentation 实现：

- 这份 spec；
- 将读者路由到这份 spec 的 documentation index updates；
- 不创建 raw artifact directories；
- 不创建 source data files；
- 不创建 cleaning scripts；
- 不创建 packages；
- 不创建 glossary；
- 不创建 calculation library。

Future phases 可以在各自 specs 或 tasks 授权后，新增 concrete registries、raw snapshots、inventory files、cleaning scripts、schema files、fixtures 和 package code。

## Acceptance

当 PR 提供以下内容时，本 phase 通过：

- 这份 spec，以及指向它的 documentation routing；
- required source registry fields 和 trust levels；
- acquisition boundaries 和 hard stops；
- raw artifact retention plan；
- raw inventory row shape，包括 required provenance fields；
- sample-slice selection criteria；
- 明确的 non-goals，阻止 raw data、cleaning、glossary、formula 和 package implementation 进入本 phase。

PR verification：

- `pnpm install --frozen-lockfile` 成功。
- `pnpm check` 成功。
- `git diff --check origin/main...HEAD` 成功。
- tracked Markdown relative links 可解析。

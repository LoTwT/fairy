# 静态构筑解析系统 V52

`V51` 收口后，trigger-matrix row 已具备稳定 `summary`。

但 `StaticBuildSourceUtilityViewEntry` 当前仍只有：

1. `triggerLabel?`
2. `conditionLabel?`
3. `cooldownSeconds?`
4. `diagnosticSummary`
5. `sourceNoteSummary`

也就是说，source-utility-view entry 的触发条件 / 适用条件 / 冷却仍主要停留在自由字段层，缺少和 source-damage-view / trigger-row 对齐的稳定 requirement contract。

`V52` 只解决一件事：

- 为 `source-utility-view entry` 增加稳定 `requirements` 与 `requirementSummary`

## 1. 目标

在不改变现有：

1. `triggerLabel`
2. `conditionLabel`
3. `cooldownSeconds`
4. `diagnosticSummary`
5. `sourceNoteSummary`

的前提下，让上层可以直接从：

1. `StaticBuildSourceUtilityViewEntry.requirements`
2. `StaticBuildSourceUtilityViewEntry.requirementSummary`

读取这条 utility entry 的结构化条件摘要，而不是继续拼接自由文本。

## 2. 范围

1. `V52.1` scope freeze
2. `V52.2` utility requirement contract
3. `V52.3` compact / high-level alignment
4. `V52.4` docs closeout

## 3. 设计边界

本阶段只做：

1. 为 `StaticBuildSourceUtilityViewEntry` 增加 `requirements`
2. 为 `StaticBuildSourceUtilityViewEntry` 增加 `requirementSummary`
3. 让 compact helper 与高层 `resolve-build-source-utility-views` 透传该字段
4. 更新 utility-view tests 与文档

显式不做：

1. 不改变现有 `triggerLabel / conditionLabel / cooldownSeconds`
2. 不改变 utility view 的 `value / unit / resolutionMode / targetScope`
3. 不改变 `diagnosticSummary / sourceNoteSummary`
4. 不引入新的 utility-only panel contract

## 4. 目标 contract

新增到 `StaticBuildSourceUtilityViewEntry`：

1. `requirements: StaticBuildSourceUtilityViewRequirement[]`
2. `requirementSummary: StaticBuildSourceUtilityViewRequirementSummary`

当前 requirement kinds 只覆盖静态可表达的 entry 条件：

1. `trigger`
2. `condition`
3. `cooldown`
4. `panel-value`

其中当前已落地的 utility entries 主要使用：

1. `trigger`
2. `condition`
3. `cooldown`

`panel-value` 只作为后续 utility contract 的保留位。

## 5. 验收标准

1. `utilityViews.entries[i].requirementSummary` 可直接读取
2. compact helper 与高层 `resolve-build-source-utility-views` 保持一致
3. Agent 输出 utility 条目时可以优先使用 `entry.requirementSummary`
4. 上层不需要继续仅靠 `triggerLabel / conditionLabel / cooldownSeconds` 自行拼 requirement 逻辑

## 6. 当前状态

- `V52.1` 已完成：冻结到 source-utility-view requirement contract
- `V52.2` 已完成：`StaticBuildSourceUtilityViewEntry` 现在稳定暴露 `requirements / requirementSummary`
- `V52.3` 已完成：compact helper 与高层 `resolve-build-source-utility-views` 已透传该字段
- `V52.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步

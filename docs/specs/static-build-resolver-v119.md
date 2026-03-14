# 静态构筑解析系统 V119

`source-specific damage views` 目前已经补齐了：

1. `requirementSummary`
2. `diagnosticSummary`
3. `sourceNoteSummary`
4. `assumptionSummary`
5. `caveatSummary`

但如果调用方想直接知道“本次额外结算条目涉及了哪些乘区变化”，仍然只能遍历 `entries[*].build.trace` 自己聚合。

`V119` 只解决一件事：

- 给 `source-specific damage views` 的顶层与 `summary` 补齐稳定 `effectSummary`

## 1. 目标

在不改变现有：

1. `entries[*].summary`
2. `entries[*].build.trace`
3. `summary.groups[*]`

的前提下，让上层稳定依赖：

1. `views.summary.effectSummary`
2. `views.effectSummary`

## 2. 范围

1. `V119.1` scope freeze
2. `V119.2` runtime contract alignment
3. `V119.3` tool assertion / prompt alignment
4. `V119.4` README / roadmap / docs closeout

## 3. 设计边界

本阶段只做：

1. 为 `StaticBuildSourceDamageViewSummary` 新增稳定 `effectSummary`
2. 为 `ResolveStaticBuildSourceDamageViewsResult` 新增兼容字段 `effectSummary`
3. 让 top-level / summary 复用现有 `entry.build.trace` 聚合语义
4. 更新 compact helper、tests、Agent prompt、README、roadmap、索引与架构文档

显式不做：

1. 不改变既有 `summary.groups[*]` 结构
2. 不提前扩到 `groups[*].effectSummary`
3. 不提前扩到 `entries[*].effectSummary`

## 4. 验收标准

1. `views.summary.effectSummary` 稳定可用
2. `views.effectSummary` 与 `views.summary.effectSummary` 保持一致
3. build / agent 测试显式校验 `effectSummary`
4. Agent prompt 与 README 明确：
   - 解释 source-specific damage views 的乘区变化时优先读取 `views.summary.effectSummary`

## 5. 当前状态

- `V119.1` 已完成：冻结到 source-damage-view top-level effect summary alignment
- `V119.2` 已完成：`views.summary.effectSummary` 与顶层兼容字段 `views.effectSummary` 已补齐
- `V119.3` 已完成：高层 source-damage-view tool 断言与 Agent prompt 已对齐 `views.summary.effectSummary`
- `V119.4` 已完成：README、roadmap、索引与架构文档已同步

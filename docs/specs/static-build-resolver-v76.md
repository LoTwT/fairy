# 静态构筑解析系统 V76

## 目标

为 unified `source-entry collection` 增加顶层 `assumptionSummary`。

当前 standalone `source-damage-view`、standalone `source-utility-view` 与 `trigger-entry matrix` 都已经具备顶层 assumptions 摘要，但 mixed `source-entry collection` 仍只有原始 `assumptions` 数组。`V76` 只补齐这一处对称缺口，不改既有 `summary`、`entries[*]` 或 assumptions 数组语义。

## 本阶段完成

1. `ResolveStaticBuildSourceEntriesResult` 新增顶层 `assumptionSummary`
2. compact collection 新增同名字段并直接透传
3. 高层 `resolve-build-source-entries` 断言与 Agent prompt 已对齐 `collection.assumptionSummary`
4. README、总规格、roadmap、索引、架构文档已同步

## 设计边界

1. 不改变 `collection.assumptions` 的原始数组语义
2. 不改变 `collection.summary` 的既有字段
3. 不提前引入 group 级 `assumptionSummary`

## 验收标准

1. 上层可以直接通过 `collection.assumptionSummary.count / hasAssumptions` 判断 mixed collection 的 assumptions 状态
2. compact collection 与底层 result 使用同名字段
3. `resolve-build-source-entries` 高层测试与 Agent prompt 不再依赖 `collection.assumptions.length`

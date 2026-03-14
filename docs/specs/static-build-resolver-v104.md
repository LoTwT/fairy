# 静态构筑解析系统 V104

`V103` 收口后，unified `source-entry collection` 已把 utility entry 的 `summary` 视为正式公共 contract。

但 mixed collection 这条统一入口里，`source-damage-view` entry 虽然从 `V50` 起就稳定暴露 `summary`，当前仍缺：

1. source-entry collection 断言没有把 `entry.summary` 当成 damage entry 的正式消费层
2. Agent prompt 还没明确要求在 mixed collection 路径优先读取 source-damage entry 的 `summary`
3. README 也还没把这层写成 source-entry collection 的公共 contract

`V104` 只解决一件事：

- 在 unified `source-entry collection` 路径，把 `source-damage-view` entry 的 `summary` 对齐成正式公共 contract

## 1. 目标

在不改变现有：

1. `entry.damage`
2. `entry.requirementSummary`
3. `entry.diagnosticSummary`
4. `entry.sourceNoteSummary`
5. `entry.assumptionSummary`
6. `entry.build?`

的前提下，让上层在 mixed `source-entry collection` 路径稳定依赖：

1. `entry.summary.expectedTotal`
2. `entry.summary.critTotal`
3. `entry.summary.nonCritTotal`
4. `entry.summary.isAnomalyLike`
5. `entry.summary.isDisorderLike`

## 2. 范围

1. `V104.1` scope freeze
2. `V104.2` source-entry tool assertion alignment
3. `V104.3` prompt / README alignment
4. `V104.4` docs closeout

## 3. 设计边界

本阶段只做：

1. 让 unified `source-entry collection` 的测试显式断言 damage entry 的 `summary`
2. 更新 Agent prompt，要求在 mixed collection 路径优先读取 source-damage entry 的 `summary`
3. 更新 README / roadmap / index / architecture / 总规格

显式不做：

1. 不新增 source-damage entry 的新字段
2. 不改变 standalone source-damage-view contract
3. 不新增 source-entry collection 的新类型
4. 不改变 `includeDetails` 语义

## 4. 验收标准

1. unified `source-entry collection` 测试显式校验 damage entry 的 `summary`
2. Agent prompt 明确要求 mixed collection 路径优先读取 damage entry 的 `summary`
3. README 把该字段写成 source-entry collection 的正式消费层
4. 不改 runtime shape，只收口公共 contract

## 5. 当前状态

- `V104.1` 已完成：冻结到 source-entry damage-entry summary alignment
- `V104.2` 已完成：高层 source-entry tool 断言已对齐 damage entry 的 `entry.summary`
- `V104.3` 已完成：Agent prompt 与 README 已把 mixed collection 中 damage entry 的 `summary` 视为正式 contract
- `V104.4` 已完成：相关 specs、roadmap、索引与架构文档已同步

# 静态构筑解析系统 V106

`V105` 收口后，unified `source-entry collection` 已把 mixed entry 的 `assumptionSummary` 视为正式公共 contract。

但 mixed collection 这条统一入口里，`entry.caveatSummary` 虽然底层从更早阶段起就稳定暴露，当前仍缺：

1. source-entry collection 断言没有把 `entry.caveatSummary` 当成 mixed entry 的正式消费层
2. Agent prompt 还没明确要求在 mixed collection 路径优先读取 `entry.caveatSummary`
3. README 也还没把这层写成 source-entry collection 的公共 contract

`V106` 只解决一件事：

- 在 unified `source-entry collection` 路径，把 mixed entry 的 `caveatSummary` 对齐成正式公共 contract

## 1. 目标

在不改变现有：

1. `entry.assumptions`
2. `entry.supported`
3. `entry.summary`
4. `entry.assumptionSummary`
5. `entry.diagnosticSummary`
6. `entry.sourceNoteSummary`

的前提下，让上层在 mixed `source-entry collection` 路径稳定依赖：

1. `entry.caveatSummary.assumptionCount`
2. `entry.caveatSummary.unsupportedCount`
3. `entry.caveatSummary.hasAssumptions`
4. `entry.caveatSummary.hasUnsupported`

## 2. 范围

1. `V106.1` scope freeze
2. `V106.2` source-entry tool assertion alignment
3. `V106.3` prompt / README alignment
4. `V106.4` docs closeout

## 3. 设计边界

本阶段只做：

1. 让 unified `source-entry collection` 的测试显式断言 mixed entry 的 `caveatSummary`
2. 更新 Agent prompt，要求在 mixed collection 路径优先读取 `entry.caveatSummary`
3. 更新 README / roadmap / index / architecture / 总规格

显式不做：

1. 不新增 mixed entry 的新字段
2. 不改变 standalone source-damage-view / source-utility-view contract
3. 不新增 source-entry collection 的新类型
4. 不改变 `includeDetails` 语义

## 4. 验收标准

1. unified `source-entry collection` 测试显式校验 mixed entry 的 `caveatSummary`
2. Agent prompt 明确要求 mixed collection 路径优先读取 `entry.caveatSummary`
3. README 把该字段写成 source-entry collection 的正式消费层
4. 不改 runtime shape，只收口公共 contract

## 5. 当前状态

- `V106.1` 已完成：冻结到 source-entry mixed-entry caveatSummary alignment
- `V106.2` 已完成：高层 source-entry tool 断言已对齐 mixed entry 的 `entry.caveatSummary`
- `V106.3` 已完成：Agent prompt 与 README 已把 mixed collection 中 entry 的 `caveatSummary` 视为正式 contract
- `V106.4` 已完成：相关 specs、roadmap、索引与架构文档已同步

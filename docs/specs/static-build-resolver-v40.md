# 静态构筑解析系统 V40

`V39` 收口后，`trigger-entry matrix row` 已经具备稳定来源元数据。

当前剩下的一处高频上层负担，落在 `requirements[]`：

1. `source-damage-view entry` 只有逐条 requirements 数组
2. `trigger-entry matrix row` 也只有逐条 requirements 数组
3. 上层如果只是想知道“有几条前置条件、哪些 kind 未满足”，仍需要自己扫描整组数组

`V40` 只解决一件事：

- 为 `source-damage-view` 与 `trigger-entry matrix row` 增加稳定的 requirement summary

## 1. 目标

为 `requirements[]` 补一层结构化摘要，让上层可以直接判断：

1. 当前条目有多少前置条件
2. 有多少条已满足 / 未满足
3. 哪些 requirement kind 出现过
4. 是否存在未满足条件

## 2. 范围

1. `V40.1` scope freeze
2. `V40.2` source-view requirement-summary contract
3. `V40.3` trigger-row alignment
4. `V40.4` docs closeout

## 3. 设计边界

本阶段只做：

1. 为 `StaticBuildSourceDamageViewEntry` 增加 `requirementSummary`
2. 为 `StaticBuildTriggerMatrixRow` 增加 `requirementSummary`
3. 更新测试与文档

显式不做：

1. 不改变现有 `requirements[]` 原始数组
2. 不新增新的 source-view / trigger coverage
3. 不新增新的 summary 顶层 key
4. 不实现独立 trigger-template catalog

## 4. 目标 contract

新增通用 requirement summary 结构：

1. `count`
2. `satisfiedCount`
3. `unsatisfiedCount`
4. `hasUnsatisfied`
5. `groups[]`
   - `key`
   - `count`
   - `satisfiedCount`
   - `unsatisfiedCount`

`groups[].key` 复用现有 requirement kind，不新增新的 kind 枚举。

## 5. 验收标准

1. source-damage-view entry 可直接读取 requirement summary
2. trigger row 可直接读取 requirement summary
3. 上层不需要再为了统计 requirement kind / satisfied 状态而手工遍历数组
4. 现有 `requirements[]` 与 compact helper contract 保持兼容

## 6. 当前状态

- `V40.1` 已完成：冻结到 requirement-summary contract
- `V40.2` 已完成：source-view entry 已新增稳定 `requirementSummary`
- `V40.3` 已完成：trigger row 与 compact helper 已对齐 `requirementSummary`
- `V40.4` 已完成：README / 总规格 / 路线图 / 索引 / 架构入口已同步收口

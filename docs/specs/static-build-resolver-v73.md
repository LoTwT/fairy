# 静态构筑解析系统 V73

`V72` 收口后，source-damage-view 顶层已经有稳定的 `assumptionSummary`。

但当上层只想先判断“某一条 source-damage-view entry 是否带 assumptions、共有多少条”时，仍要回退到 `entry.assumptions.length` 手工统计。

`V73` 只解决一件事：

- 为 `StaticBuildSourceDamageViewEntry` 与 compact entry 增加局部 `assumptionSummary`

## 当前状态

- `V73.1` 已完成：冻结到 source-damage-view entry assumption summary
- `V73.2` 已完成：`StaticBuildSourceDamageViewEntry` 与 compact entry 已新增局部 `assumptionSummary`
- `V73.3` 已完成：高层 tool 断言与 agent prompt 已对齐 `entry.assumptionSummary`
- `V73.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步

## 设计边界

本阶段只做：

1. 为 `StaticBuildSourceDamageViewEntry` 增加局部 `assumptionSummary`
2. 为 compact source-damage-view entry 透传 `assumptionSummary`
3. 从当前 entry 的 `assumptions` 派生计数与布尔位

显式不做：

1. 不改变 entry 级 `assumptions` 的原始数组语义
2. 不新增 source-utility-view entry 的 `assumptionSummary`
3. 不改变顶层 `summary` 或顶层 `assumptionSummary`

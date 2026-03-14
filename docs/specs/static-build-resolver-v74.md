# 静态构筑解析系统 V74

`V73` 收口后，source-damage-view 已经完成 entry-level `assumptionSummary`，但 source-utility-view 顶层仍只有原始 `assumptions` 数组。

当上层只想先判断“当前整组 utility views 是否带 assumptions、共有多少条”时，仍要自己统计数组长度。

`V74` 只解决一件事：

- 为 `ResolveStaticBuildSourceUtilityViewsResult` 与 compact result 增加顶层 `assumptionSummary`

## 当前状态

- `V74.1` 已完成：冻结到 top-level source-utility-view assumption summary
- `V74.2` 已完成：`ResolveStaticBuildSourceUtilityViewsResult` 与 compact result 已新增 `assumptionSummary`
- `V74.3` 已完成：高层 tool 断言与 agent prompt 已对齐 `views.assumptionSummary`
- `V74.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步

## 设计边界

本阶段只做：

1. 为 `ResolveStaticBuildSourceUtilityViewsResult` 增加顶层 `assumptionSummary`
2. 为 compact source-utility-views result 透传 `assumptionSummary`
3. 从当前顶层 `assumptions` 派生计数与布尔位

显式不做：

1. 不改变顶层 `assumptions` 的原始数组语义
2. 不新增 source-utility-view entry 的 `assumptionSummary`
3. 不改变顶层 `summary`

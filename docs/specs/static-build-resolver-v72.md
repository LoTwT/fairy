# 静态构筑解析系统 V72

`source-damage views` 当前顶层已经有稳定的 `summary`，也保留了原始 `assumptions` 数组。

但如果上层只想先判断“当前整组 source-damage views 是否带 assumptions、共有多少条”，仍要自己统计数组长度。

`V72` 只解决一件事：

- 为 `ResolveStaticBuildSourceDamageViewsResult` 与 compact result 增加顶层 `assumptionSummary`

## 当前状态

- `V72.1` 已完成：冻结到 top-level source-damage-view assumption summary
- `V72.2` 已完成：`ResolveStaticBuildSourceDamageViewsResult` 与 compact result 已新增 `assumptionSummary`
- `V72.3` 已完成：高层 tool 断言与 agent prompt 已对齐 `views.assumptionSummary`
- `V72.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步

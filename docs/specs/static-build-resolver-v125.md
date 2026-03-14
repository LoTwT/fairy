# 静态构筑解析系统 V125

`V124` 收口后，runtime contract 已为 utility entry 补齐稳定 `entry.effectSummary: []`。

但 compact contract 仍不对称：

- `compactStaticBuildSourceEntry()` 已透传 utility entry 的 `effectSummary`
- `StaticBuildCompactSourceUtilityViewEntry` 还没有把它正式声明为公共 contract

这意味着 runtime 行为已经存在，但类型、测试和文档还没有把它固定下来。

`V125` 只解决一件事：

1. 给 compact utility entry 补齐稳定 `entry.effectSummary`

## 阶段范围

1. `V125.1` scope freeze
2. `V125.2` runtime/type contract alignment
3. `V125.3` tool assertion / prompt alignment
4. `V125.4` docs closeout

## 当前状态

- `V125.1` 已完成：冻结到 source-utility-view compact entry effect summary alignment
- `V125.2` 已完成：`StaticBuildCompactSourceUtilityViewEntry` 已补齐稳定 `effectSummary`
- `V125.3` 已完成：高层 source-utility-view prompt / 断言已对齐 `entry.effectSummary`
- `V125.4` 已完成：README、roadmap、索引与架构文档已同步

## 当前边界

本阶段只做：

1. 为 `StaticBuildCompactSourceUtilityViewEntry` 新增稳定 `effectSummary`
2. 固定 compact utility entry 当前返回空数组
3. 明确 utility-only compact consumer 也优先读取 `entry.effectSummary`

显式不做：

1. 不为 standalone utility views 顶层新增 `effectSummary`
2. 不为 utility entry 伪造非空 effect 明细
3. 不改变 source-entry mixed-entry 的既有 `entry.effectSummary` 语义

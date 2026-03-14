# 静态构筑解析系统 V126

## 背景

`V125` 已把 compact utility entry 的 `entry.effectSummary` 固定成公共 contract，但 standalone `resolveStaticBuildSourceUtilityViews()` 仍缺少顶层与 group 级 effect-summary。

当前状态不对称：

- `entry.effectSummary` 已存在，固定返回空数组
- compact utility entry 也已存在 `entry.effectSummary`
- 但 `views.summary.effectSummary`
- `views.effectSummary`
- `views.summary.groups[*].effectSummary`

还没有被正式声明和透传。

## 目标

只补齐 standalone `source-utility-view` 的 effect-summary 对称 contract：

1. `ResolveStaticBuildSourceUtilityViewsResult.effectSummary`
2. `StaticBuildSourceUtilityViewSummary.effectSummary`
3. `StaticBuildSourceUtilityViewGroupSummary.effectSummary`
4. `CompactStaticBuildSourceUtilityViewsResult.effectSummary`

## 当前边界

本阶段只做：

1. 顶层 / summary / group 新增稳定 `effectSummary`
2. 统一固定返回空数组
3. 高层 tool / prompt / README 对齐这些字段

显式不做：

1. 不为 utility-only source views 伪造非空 effect 明细
2. 不改变 entry 级 `effectSummary` 既有语义
3. 不改变 requirement / diagnostics / source notes / assumptions 的既有 contract

## 完成标准

1. `resolveStaticBuildSourceUtilityViews()` 直接返回 `effectSummary`
2. `views.summary.effectSummary === []`
3. `views.summary.groups[*].effectSummary === []`
4. compact 结果也透传 `effectSummary`
5. README、roadmap、索引、架构文档同步

# 静态构筑解析系统 V271

## 目标

为 build-layer 中 requirement 计数补显式 type，并让 requirement summary 与 utility entry summary 统一复用这些 contract，不改变任何运行时行为。

## 范围

1. 新增 `requirementCount / satisfiedRequirementCount / unsatisfiedRequirementCount` 的显式公开标量 type
2. `StaticBuildRequirementSummaryGroup`、`StaticBuildRequirementSummary`、`StaticBuildSourceUtilityViewEntrySummary` 统一复用这些 type
3. `build/index.ts` 正式导出这些新 type

## 非目标

1. 不改变 requirement summary 的字段集合
2. 不处理 view/group/support count contract
3. 不扩展 compact layer 的 requirement count contract

## 结果

- requirement 相关计数不再以裸 `number` 暴露
- requirement summary contract 与前面的 scalar 收口保持一致

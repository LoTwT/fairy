# 静态构筑解析系统 V268

## 目标

为 `StaticBuildResolvedBuckets` 对应的公开标量补显式 type，并让 build-layer 导出统一复用这些 contract，不改变任何运行时行为。

## 范围

1. 新增 `attackPercent / flatAttack / bonusDamageSum / sheerBonusSum / anomalyBonusDamageSum / skillMultiplierFactor` 的显式公开标量 type
2. `StaticBuildResolvedBuckets` 统一复用这些 type，以及已存在的 `crit / penetration / defense / resistance / vulnerability / anomaly` 标量 type
3. `build/index.ts` 正式导出这些新 type

## 非目标

1. 不改变 `StaticBuildResolvedBuckets` 字段集合
2. 不改变 bucket 结算逻辑
3. 不扩展 `resolvedSnapshot` 的 key contract

## 结果

- `StaticBuildResolvedBuckets` 不再以整组裸 `number` 暴露 bucket 标量
- build-layer 对 bucket 标量的公开 contract 与前面的 `finalPanel / enemy / scenario / effect-state` 标量收口保持一致

# 静态构筑解析系统 V350：agent scenario helper text contracts

## 背景

`zzz-agent` 的 catalog helper 已收口，下一条最小缺口落在 [resolve-build-scenario.ts](/Users/caoyujie/codes/zzz-data/packages/zzz-agent/src/mastra/tools/zzz/resolve-build-scenario.ts)。

这一层的 scenario 归一化 helper 仍直接暴露裸文本输入：

1. `normalizeBuildToolAttribute(value: string | undefined)`
2. `resolveBuildToolScenario<T extends { attribute?: string }>()`
3. `resolveBuildToolDisorderScenario<T extends { anomalyType: string; attribute?: string }>()`
4. `resolveBuildToolDamageType(..., damageType: string, ...)`
5. `normalizeAnomalyType(value: string)`

## 目标

`V350` 只解决一件事：

- 给 `zzz-agent` 的 scenario helper 文本 contract 补显式公开 alias，不改变任何归一化逻辑。

## 范围

1. `BuildToolAttributeValue`
2. `BuildToolAnomalyTypeValue`
3. `BuildToolDamageTypeValue`
4. `normalizeBuildToolAttribute()`
5. `resolveBuildToolScenario()`
6. `resolveBuildToolDisorderScenario()`
7. `resolveBuildToolDamageType()`
8. `normalizeAnomalyType()`

## 非目标

1. 不改变 anomaly type alias 列表
2. 不调整 scenario schema
3. 不修改高层 tool 响应结构

## 完成标准

1. 上述 helper 不再以裸 `string` 暴露 scenario 文本 contract
2. 运行时归一化结果不变
3. 全量校验通过

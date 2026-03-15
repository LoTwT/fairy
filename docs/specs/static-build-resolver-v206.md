# 静态构筑解析系统 V206

## 目标

把 `source-entry collection` 高层 tool 中剩余的 coverage-gap 返回 shape 收进共享 helper，避免继续在 tool 文件里散落匿名 `found: false` 对象。

本阶段只处理：

1. utility-only 且未提供音擎时的 coverage-gap
2. anomaly / disorder 路径无额外来源覆盖时的 coverage-gap
3. 已提供音擎但当前构筑仍无额外来源条目时的 coverage-gap

## 变更

1. 在 [resolve-build-shared.ts](/Users/caoyujie/codes/zzz-data/packages/zzz-agent/src/mastra/tools/zzz/resolve-build-shared.ts) 新增：
   - `BuildToolUncoveredSourceEntryUtilityOnlyResponse`
   - `BuildToolUncoveredSourceEntryCoverageResponse`
   - `buildUncoveredSourceEntryUtilityOnlyResponse()`
   - `buildUncoveredSourceEntryCoverageResponse()`
2. [resolve-build-source-entries.ts](/Users/caoyujie/codes/zzz-data/packages/zzz-agent/src/mastra/tools/zzz/resolve-build-source-entries.ts) 改为统一复用这些 helper

## 非目标

1. 不改变 `source-entry collection` 的成功返回 shape
2. 不改变 `supportedSourceViewAgents / supportedUtilityWEngines` 的字段名
3. 不改变 coverage-gap 的判定逻辑
4. 不新增新的 build 计算能力

## 收口标准

1. `source-entry collection` 不再手工拼匿名 coverage-gap 返回
2. utility-only 路径仍返回 `supportedUtilityWEngines`
3. mixed/anomaly 路径仍返回 `supportedSourceViewAgents`
4. 现有高层测试与 build 校验通过

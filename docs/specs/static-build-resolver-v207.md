# 静态构筑解析系统 V207

## 目标

把 `zzz-agent` 高层 build tools 中剩余的成功返回 shape 收进共享 helper，避免继续在各个 tool 文件里散落匿名 `found: true` 对象。

本阶段只处理：

1. `resolve-build-damage`
2. `resolve-build-skill-matrix`
3. `resolve-build-trigger-matrix`
4. `resolve-build-source-damage-views`
5. `resolve-build-source-utility-views`
6. `resolve-build-source-entries`

## 变更

1. 在 [resolve-build-shared.ts](/Users/caoyujie/codes/zzz-data/packages/zzz-agent/src/mastra/tools/zzz/resolve-build-shared.ts) 新增：
   - `BuildToolDamageSuccessResponse`
   - `BuildToolSkillMatrixSuccessResponse`
   - `BuildToolTriggerMatrixSuccessResponse`
   - `BuildToolSourceDamageViewsSuccessResponse`
   - `BuildToolSourceUtilityViewsSuccessResponse`
   - `BuildToolSourceEntryCollectionSuccessResponse`
   - 以及对应的 `build*SuccessResponse()` helper
2. 以上 6 个高层 build tool 改为统一复用这些 helper

## 非目标

1. 不改变各 tool 的成功返回字段名
2. 不改变 runtime 计算逻辑
3. 不改变 `includeDetails` 语义
4. 不新增新的 build 计算能力

## 收口标准

1. 6 个高层 build tool 不再手工拼匿名成功返回
2. `found: true` 下的 `build / matrix / views / collection` 字段名保持不变
3. 现有高层测试与 build 校验通过

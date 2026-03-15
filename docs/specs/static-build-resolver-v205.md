# 静态构筑解析系统 V205

## 目标

统一 `zzz-agent` 高层 build tools 在 unsupported / coverage-gap 场景下的 scope label 与返回语义，减少 message 和字段名的漂移。

本阶段只处理：

1. `resolve-build-source-damage-views`
2. `resolve-build-source-utility-views`
3. `resolve-build-source-entries`

## 变更

1. 在 [resolve-build-shared.ts](/Users/caoyujie/codes/zzz-data/packages/zzz-agent/src/mastra/tools/zzz/resolve-build-shared.ts) 新增显式 `buildToolScopeLabels`
2. `source-damage-view` / `source-utility-view` 的 coverage-gap 返回改为共享 helper 组装
3. 三个高层 tool 的 unsupported `w-engine / drive-disc / coverage-gap` message 统一使用各自 tool scope label
4. `source-entry collection` 保留自身字段名：
   - `supportedSourceViewAgents`
   - `supportedUtilityWEngines`
     不为了复用 helper 而退化成其他 key

## 非目标

1. 不改变底层 `zzz-data` resolver contract
2. 不改变高层 tool 的 `found=true` 成功返回 shape
3. 不改变 `supported*` 列表的候选来源
4. 不引入新的 build 计算逻辑

## 收口标准

1. 三个高层 tool 的 unsupported message 都带正确 scope label
2. `source-entry collection` 在 utility-only 缺少音擎时仍返回 `supportedUtilityWEngines`
3. 现有高层测试与 build 校验通过

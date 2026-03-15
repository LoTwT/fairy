# 静态构筑解析系统 V209

## 目标

把 `zzz-agent` 高层 build tools 中重复的 `driveDiscSets` 解析与 `loadout` 组装收进共享 helper，减少 6 个 tool 的重复分支。

本阶段只处理：

1. `driveDiscSets` 解析
2. `loadout` 组装

## 变更

1. 在 [resolve-build-shared.ts](/Users/caoyujie/codes/zzz-data/packages/zzz-agent/src/mastra/tools/zzz/resolve-build-shared.ts) 新增：
   - `resolveBuildToolDriveDiscSets()`
   - `buildToolLoadoutInput()`
2. 以下高层 build tool 改为统一复用这些 helper：
   - [resolve-build-damage.ts](/Users/caoyujie/codes/zzz-data/packages/zzz-agent/src/mastra/tools/zzz/resolve-build-damage.ts)
   - [resolve-build-skill-matrix.ts](/Users/caoyujie/codes/zzz-data/packages/zzz-agent/src/mastra/tools/zzz/resolve-build-skill-matrix.ts)
   - [resolve-build-trigger-matrix.ts](/Users/caoyujie/codes/zzz-data/packages/zzz-agent/src/mastra/tools/zzz/resolve-build-trigger-matrix.ts)
   - [resolve-build-source-damage-views.ts](/Users/caoyujie/codes/zzz-data/packages/zzz-agent/src/mastra/tools/zzz/resolve-build-source-damage-views.ts)
   - [resolve-build-source-utility-views.ts](/Users/caoyujie/codes/zzz-data/packages/zzz-agent/src/mastra/tools/zzz/resolve-build-source-utility-views.ts)
   - [resolve-build-source-entries.ts](/Users/caoyujie/codes/zzz-data/packages/zzz-agent/src/mastra/tools/zzz/resolve-build-source-entries.ts)

## 非目标

1. 不改变任何 tool 的输入输出 shape
2. 不改变 drive disc unsupported 的 message 或字段名
3. 不改变底层 `zzz-data` runtime
4. 不新增新的 build 计算能力

## 收口标准

1. 6 个高层 build tool 不再手工循环构造 `driveDiscSets`
2. 6 个高层 build tool 不再手工重复拼装 `loadout`
3. 现有高层测试与 build 校验通过

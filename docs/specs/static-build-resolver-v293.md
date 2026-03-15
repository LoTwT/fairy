# 静态构筑解析系统 V293

## 目标

为 source-view / trigger-matrix / skill-matrix metadata 中仍以匿名 `string` 暴露的 `stableKey` 补显式公开 type，不改变任何运行时行为。

## 范围

1. 新增 `stableKey` 的显式公开 type
2. `StaticBuildSourceDamageViewMeta.stableKey`
3. `StaticBuildSourceUtilityViewMeta.stableKey`
4. `StaticBuildTriggerMatrixRowMeta.stableKey`
5. `StaticBuildSkillMatrixRowMeta.stableKey`
6. `build/index.ts` 正式导出这个新 type

## 非目标

1. 不改变 stableKey 的字符串内容或生成逻辑
2. 不处理 `id`
3. 不处理 `actionName / skillName / sourceStatId / sourceStatName`

## 结果

- 各类 metadata 的 stableKey 不再直接以匿名 `string` 暴露
- 相关 metadata 的 `stableKey` 字段拥有稳定可复用的公开类型名

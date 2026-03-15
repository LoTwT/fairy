# 静态构筑解析系统 V341：resolver helper context contracts

## 1. 目标

`V341` 只解决一件事：

- 把 `resolver.ts` 中 effect match/apply helper 仍直接内联的上下文 shape，以及 `parseSkillMultiplier()` 的裸输入输出统一收成显式公开 contract。

## 2. 范围

1. `StaticBuildEffectMatchContext`
2. `StaticBuildEffectApplyContext`
3. `parseSkillMultiplier()`
4. `effectMatches()`
5. `applyEffects()`
6. `build/index.ts` 对应导出

## 3. 非目标

1. 不改变 effect 匹配逻辑
2. 不调整任何条件判定语义
3. 不修改实际伤害结果

## 4. 完成条件

1. `resolver.ts` 不再内联 effect match/apply context shape
2. `parseSkillMultiplier()` 不再直接使用裸 `number | string`
3. 新增 context alias 已对外导出
4. 全量校验通过

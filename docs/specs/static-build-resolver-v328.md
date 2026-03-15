# 静态构筑解析系统 V328：combat tag collection contracts

`V328` 只解决一件事：

- 把 `combatTags` 在 `resolver` 和 `skill-matrix template` 里的 collection shape 统一收成显式公开 contract。

## 范围

1. `StaticBuildCombatTagSet`
2. `resolver.ts` 中 `combatTags` 的 helper context
3. `SkillMatrixTemplate.combatTags`
4. `build/index.ts` 对应 type export

## 非目标

1. 不修改任何 `combatTags` 判定逻辑
2. 不处理其他 `Set<string>` 聚合容器
3. 不调整任何模板里的 tag 值

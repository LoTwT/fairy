# 静态构筑解析系统 V335：assumption and combat-tag set reuse

## 1. 目标

`V335` 只解决一件事：

- 把 `source-entry` 的 assumptions 去重集合，以及 `resolver / skill-matrix` 中 combat-tag 去重集合统一复用既有显式公开 set contract。

## 2. 范围

1. `resolveStaticBuildSourceEntries()`
2. `resolveStaticBuildDamage()`
3. `resolveStaticBuildSkillMatrix()`
4. `StaticBuildAssumptionSet`
5. `StaticBuildCombatTagSet`

## 3. 非目标

1. 不新增任何新的公开 alias
2. 不改变 assumptions 或 combatTags 的输出顺序
3. 不修改任何业务判定逻辑

## 4. 完成标准

1. `source-entry` 顶层 assumptions 去重不再直接使用裸 `Set<string>`
2. `resolver / skill-matrix` 的 combat-tag 去重不再直接使用裸 `Set<string>`
3. lint、test、agent build 全部通过

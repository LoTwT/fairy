# 静态构筑解析系统 V201

## 1. 背景

`V200` 收口后，`build/types.ts` 中仍直接复用 raw `baseDamageStat` 的稳定缺口集中在：

1. `StaticBuildResolvedPanel.baseDamageStat`
2. `StaticBuildResolveSummary.baseDamageStat`
3. `StaticBuildSkillMatrixSummary.baseDamageStat`

`V201` 只解决这一件事。

## 2. 目标

把 `build/types.ts` 公开 contract 中的 `baseDamageStat` 统一改为显式 `StaticBuildBaseDamageStat`。

## 3. 非目标

1. 不改变 `baseDamageStat` 的值域
2. 不改变 compact contract
3. 不改变 runtime 计算逻辑
4. 不改变任何 summary 结构

## 4. 结果

完成后：

1. `build/types.ts` 的 `baseDamageStat` 不再通过字段索引复用 raw panel shape
2. `build` 层和 `compact` 层的 `baseDamageStat` 都有独立、显式的公开类型
3. runtime 输出字段与数值保持不变，只收紧 public contract

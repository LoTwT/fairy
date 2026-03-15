# 静态构筑解析系统 V275

## 目标

为 `skill-matrix summary` 中仍以裸 `number` 暴露的 panel / result 标量补显式 type，并统一复用现有 scalar contract，不改变任何运行时行为。

## 范围

1. `StaticBuildSkillMatrixSummary.baseDamageValue / attack / hp / sheerForce / critRate / critDamage / penetrationRate / penetrationValue` 改为复用现有显式 scalar type
2. 不新增新的运行时字段

## 非目标

1. 不改变 skill-matrix summary 的字段集合
2. 不改变 skill-matrix 的结算逻辑
3. 不处理 `commonBuckets / commonFormulaMultipliers` 这类 map contract

## 结果

- `skill-matrix summary` 里的公开 panel / result 标量不再以裸 `number` 暴露
- 这些字段与 single-build / resolved-panel 既有 scalar contract 保持一致

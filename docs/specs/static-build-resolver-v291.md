# 静态构筑解析系统 V291

## 目标

为 `StaticBuildSkillMatrixRow.group` 公开 contract 中仍以匿名 `string` 暴露的 group key 补显式公开 type，不改变任何运行时行为。

## 范围

1. 新增 `skillMatrixGroupKey` 的显式公开 type
2. `StaticBuildSkillMatrixRow.group`
3. `build/index.ts` 正式导出这个新 type

## 非目标

1. 不改变 group 字符串内容、分组逻辑或排序语义
2. 不处理 `canonicalLabel / stableKey`
3. 不处理 `id`

## 结果

- `StaticBuildSkillMatrixRow.group` 不再直接以匿名 `string` 暴露
- skill-matrix row 的 `group` 字段拥有稳定可复用的公开类型名

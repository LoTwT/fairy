# 静态构筑解析系统 V301

## 目标

为 `skill-matrix group summary` 中仍以匿名 `string` 暴露的 `key` 补显式公开 type，不改变任何运行时行为。

## 范围

1. `StaticBuildSkillMatrixGroupSummary.key`
2. 统一复用既有 `StaticBuildSkillMatrixGroupKey`

## 非目标

1. 不改变 group key 的字符串内容或分组逻辑
2. 不新增新的 group key 类型
3. 不处理 requirement key

## 结果

- `skill-matrix group summary.key` 不再直接以匿名 `string` 暴露
- `row.group` 与 `group summary.key` 使用同一个公开 contract

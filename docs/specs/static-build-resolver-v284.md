# 静态构筑解析系统 V284

## 目标

为 skill-matrix row metadata 中仍以 `string[]` 暴露的 `qualifiers` 补显式公开 type，不改变任何运行时行为。

## 范围

1. 新增 `skillQualifierList` 的显式公开 type
2. `StaticBuildSkillMatrixRowMeta.qualifiers` 统一复用该 type
3. `build/index.ts` 正式导出这个新 type

## 非目标

1. 不改变 qualifiers 的字符串内容、顺序或判定逻辑
2. 不处理 source-note keys
3. 不处理 diagnostic keys

## 结果

- skill qualifier 列表不再直接以匿名 `string[]` 暴露
- `StaticBuildSkillMatrixRowMeta.qualifiers` 拥有稳定可复用的公开类型名

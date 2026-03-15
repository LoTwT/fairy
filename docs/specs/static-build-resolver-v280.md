# 静态构筑解析系统 V280

## 目标

为 build-layer 公开 contract 中仍以 `string[]` 暴露的 `combatTags` 补显式公开 type，不改变任何运行时行为。

## 范围

1. 新增 `combatTagList` 的显式公开 type
2. `scenario input / skill-matrix context / effect condition / skill-matrix row` 等公开 `combatTags` 字段统一复用该 type
3. `build/index.ts` 正式导出这个新 type

## 非目标

1. 不改变 combatTags 的字符串内容、顺序或判定逻辑
2. 不处理 `aliases / qualifiers / keys`
3. 不处理 `assumptions / unsupportedEffects`

## 结果

- 公开的 combatTags 列表不再直接以匿名 `string[]` 暴露
- 输入 contract、effect 条件和 skill-matrix 行语义上的 combatTags 字段拥有稳定可复用的公开类型名

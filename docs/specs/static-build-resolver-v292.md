# 静态构筑解析系统 V292

## 目标

为 source-view / skill-matrix metadata 中仍以匿名 `string` 暴露的 `canonicalLabel` 补显式公开 text type，不改变任何运行时行为。

## 范围

1. 新增 `canonicalLabel` 的显式公开 type
2. `StaticBuildSourceDamageViewMeta.canonicalLabel`
3. `StaticBuildSourceUtilityViewMeta.canonicalLabel`
4. `StaticBuildSkillMatrixRowMeta.canonicalLabel`
5. `build/index.ts` 正式导出这个新 type

## 非目标

1. 不改变 canonicalLabel 的字符串内容或生成逻辑
2. 不处理 `stableKey`
3. 不处理 `actionName / skillName / sourceStatName`

## 结果

- 各类 metadata 的 canonicalLabel 不再直接以匿名 `string` 暴露
- 相关 metadata 的 `canonicalLabel` 字段拥有稳定可复用的公开类型名

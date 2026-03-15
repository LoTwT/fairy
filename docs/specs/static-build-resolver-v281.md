# 静态构筑解析系统 V281

## 目标

为 build catalog 公开 contract 中仍以 `string[]` 暴露的 `aliases` 补显式公开 type，不改变任何运行时行为。

## 范围

1. 新增 `aliasList` 的显式公开 type
2. `StaticBuildCatalogEntry.aliases` 统一复用该 type
3. `build/index.ts` 正式导出这个新 type

## 非目标

1. 不改变 alias 的字符串内容、顺序或匹配逻辑
2. 不处理 `keys / qualifiers`
3. 不处理 `combatTags / assumptions / unsupportedEffects`

## 结果

- build catalog 的 alias 列表不再直接以匿名 `string[]` 暴露
- `StaticBuildCatalogEntry.aliases` 拥有稳定可复用的公开类型名

# 静态构筑解析系统 V300

## 目标

为 catalog / profile 公开 contract 中仍以匿名 `string` 暴露的通用 `name` 补显式公开 type，不改变任何运行时行为。

## 范围

1. 新增 `displayName` 的显式公开 type
2. `StaticBuildCatalogEntry.name`
3. `StaticBuildProfileResult.name`
4. `build/index.ts` 正式导出这个新 type

## 非目标

1. 不改变名称文本内容或匹配逻辑
2. 不处理 `sourceName`
3. 不处理 `actionName / skillName / sourceStatName`

## 结果

- catalog / profile 公开 contract 中的通用 `name` 不再直接以匿名 `string` 暴露
- 这些字段拥有稳定可复用的公开类型名

# 静态构筑解析系统 V295

## 目标

为 loadout / catalog 相关公开 contract 中仍以匿名 `string` 暴露的通用 catalog `id` 补显式公开 type，不改变任何运行时行为。

## 范围

1. 新增 `catalogId` 的显式公开 type
2. `StaticBuildDriveDiscSetInput.id`
3. `StaticBuildLoadoutInput.agentId`
4. `StaticBuildLoadoutInput.wEngineId`
5. `StaticBuildCatalogEntry.id`
6. `build/index.ts` 正式导出这个新 type

## 非目标

1. 不改变 catalog id 的字符串内容或匹配逻辑
2. 不处理 `sourceId`
3. 不处理 entry / row 的 `id`

## 结果

- loadout / catalog 相关 contract 的通用 id 不再直接以匿名 `string` 暴露
- 这些字段拥有稳定可复用的公开类型名

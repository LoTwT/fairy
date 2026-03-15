# 静态构筑解析系统 V297

## 目标

为 trigger-matrix row metadata 中仍以匿名 `string` 暴露的 source-view 引用字段补显式公开 type，不改变任何运行时行为。

## 范围

1. 新增 `sourceViewId` 的显式公开 type
2. `StaticBuildTriggerMatrixRowMeta.sourceStableKey`
3. `StaticBuildTriggerMatrixRowMeta.sourceViewId`
4. `build/index.ts` 正式导出这个新 type

## 非目标

1. 不改变 source-view 引用的字符串内容或匹配逻辑
2. 不处理通用 `sourceId`
3. 不处理 `id`

## 结果

- trigger-matrix row metadata 中对 source-view 的引用不再直接以匿名 `string` 暴露
- source-view link 相关字段拥有稳定可复用的公开类型名

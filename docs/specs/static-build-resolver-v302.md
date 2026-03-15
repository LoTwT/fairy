# 静态构筑解析系统 V302

## 目标

为 trace item 公开 contract 中仍以匿名 `string` 暴露的 `reason` 补显式公开 type，不改变任何运行时行为。

## 范围

1. 新增 `traceReason` 的显式公开 type
2. `StaticBuildTraceItem.reason`
3. `build/index.ts` 正式导出这个新 type

## 非目标

1. 不改变 trace reason 的文本内容或生成逻辑
2. 不处理 `sourceNoteMessage / diagnosticMessage`
3. 不处理 effect-summary 文本

## 结果

- trace item 中的 `reason` 不再直接以匿名 `string` 暴露
- 该字段拥有稳定可复用的公开类型名

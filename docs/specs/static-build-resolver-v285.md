# 静态构筑解析系统 V285

## 目标

为 source-note / diagnostic 公开 contract 中仍以匿名 `string` 暴露的 `message` 补显式公开 text type，不改变任何运行时行为。

## 范围

1. 新增 `sourceNoteMessage` 的显式公开 type
2. 新增 `diagnosticMessage` 的显式公开 type
3. `StaticBuildSourceNoteEntry.message` / `StaticBuildDiagnosticEntry.message` 统一复用这些 type
4. `build/index.ts` 正式导出这两个新 type

## 非目标

1. 不改变 message 的字符串内容或生成逻辑
2. 不处理 labels
3. 不处理 bucket / value / condition 文本

## 结果

- source-note / diagnostic 的 message 文本不再直接以匿名 `string` 暴露
- 相关 entry 的 `message` 字段拥有稳定可复用的公开类型名

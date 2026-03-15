# 静态构筑解析系统 V283

## 目标

为 diagnostic 公开 contract 中仍以 `string[]` 暴露的 `keys` 补显式公开 type，不改变任何运行时行为。

## 范围

1. 新增 `diagnosticKeyList` 的显式公开 type
2. `StaticBuildDiagnosticEntry.keys` 统一复用该 type
3. `build/index.ts` 正式导出这个新 type

## 非目标

1. 不改变 diagnostic keys 的字符串内容、顺序或使用逻辑
2. 不处理 source-note keys
3. 不处理 skill qualifiers

## 结果

- diagnostic 的 key 列表不再直接以匿名 `string[]` 暴露
- `StaticBuildDiagnosticEntry.keys` 拥有稳定可复用的公开类型名

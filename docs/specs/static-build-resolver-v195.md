# 静态构筑解析系统 V195

## 1. 背景

`V194` 收口后，compact detail entry 中仍直接复用 raw `sourceType` 的稳定缺口集中在：

1. `CompactStaticBuildDiagnosticEntry.sourceType`
2. `CompactStaticBuildSourceNoteEntry.sourceType`
3. `CompactStaticBuildTraceItem.sourceType`

`V195` 只解决这一件事。

## 2. 目标

把 compact `diagnostic / source-note / trace` 三类 detail entry 的 `sourceType` 统一改为显式 compact source type。

## 3. 非目标

1. 不改变 `kind / owner / status / guidance / trace status`
2. 不改变 entry 值
3. 不改变 summary 结构
4. 不改变 runtime 生成逻辑

## 4. 结果

完成后：

1. compact detail entry 的 `sourceType` 统一复用 `CompactStaticBuildSourceType`
2. source provenance 在 compact contract 中不再依赖 raw indexed access
3. runtime 输出字段与数值保持不变，只收紧 public contract

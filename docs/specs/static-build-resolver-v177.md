# 静态构筑解析系统 V177

`V177` 继续收口 `compact` contract 中仍直接复用 raw detail item type 的 single-build `trace`。

目标：

1. 把 compact single-build `trace[]`
2. 把 `trace[].modifiers[]`

统一切到显式 compact trace item types。

非目标：

1. 不改变 `trace` 的字段值
2. 不改变 `includeDetails` gating 语义
3. 不改变 row / entry 内 `build` 嵌套结果里仍保持 raw shape 的 contract

结果：

1. compact single-build `trace` 不再直接复用 raw `StaticBuildTraceItem`
2. 当前 compact detail-entry 规范化主线继续推进到 single-build 的 trace 明细层

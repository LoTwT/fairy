# 静态构筑解析系统 V198

## 1. 背景

`V197` 收口后，compact detail entry 中仍有一处直接复用 raw trace enum shape 的稳定缺口：

1. `CompactStaticBuildTraceItem.status`

`V198` 只解决这一件事。

## 2. 目标

把 compact `trace` entry 的 `status` 改为显式 compact type。

## 3. 非目标

1. 不改变 trace item 的运行时值
2. 不改变 `sourceType / bucket / combine`
3. 不改变 trace 生成逻辑
4. 不改变任何 summary 结构

## 4. 结果

完成后：

1. compact `trace.status` 不再通过 indexed access 复用 raw trace contract
2. compact detail entry 的显式 type 主线从 `sourceType` 延伸到 `status`
3. runtime 输出字段与数值保持不变，只收紧 public contract

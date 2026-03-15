# 静态构筑解析系统 V320：source coverage id contracts

`V320` 只解决一件事：

- 把 `definitions.ts` 中 source coverage helper 仍直接暴露的 `sourceId` 输入，统一收成显式公开 id alias。

## 范围

1. `StaticBuildSourceCoverageId`
2. `hasStaticBuildEffectsForSource()`
3. `hasStaticBuildCoverageForSource()`

## 非目标

1. 不修改任何 runtime 逻辑
2. 不处理 source-note lookup 的整体验证输入 contract
3. 不调整 source-note / effect definition 数据

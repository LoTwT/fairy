# 静态构筑解析系统 V329：bucket label map contracts

`V329` 只解决一件事：

- 把 `resolver / source-damage-view / trigger-matrix / skill-matrix` 中固定的 bucket label map 统一收成显式公开 contract。

## 范围

1. `StaticBuildEffectBucketLabelMap`
2. `StaticBuildSourceDamageViewBucketKey`
3. `StaticBuildSourceDamageViewBucketLabelMap`
4. `StaticBuildTriggerMatrixBucketLabelMap`
5. 对应 label map 常量与 `build/index.ts` type export

## 非目标

1. 不修改任何 bucket label 文案
2. 不调整任何 effect summary 聚合逻辑
3. 不处理 reducer 中的 `Set<string>` 聚合容器

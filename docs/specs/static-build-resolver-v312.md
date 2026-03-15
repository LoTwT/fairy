# 静态构筑解析系统 V312

## 目标

`V312` 只解决一件事：

- 为 `trigger-matrix / source-damage-views / source-utility-views / source-entry collection` 的 compact entry/meta/result contract 补显式 `id / label / sourceId / canonicalLabel / stableKey / assumptions`

## 范围

1. `CompactStaticBuildSourceViewId`
2. `CompactStaticBuildSourceDamageViewGroupKey`
3. `CompactStaticBuildSourceUtilityViewGroupKey`
4. `CompactStaticBuildSourceEntryGroupKey`
5. trigger row / meta / result
6. source-damage-view entry / meta / result
7. source-utility-view entry / meta / result
8. source-entry collection / group summary

## 非目标

1. 不处理 `commonBuckets / variableBuckets`
2. 不处理 `triggerLabel / conditionLabel`
3. 不处理 `sourceStatId / sourceStatName / segmentLabel`

## 结果

完成后：

- 上述 compact view/result 不再继续直接暴露这批匿名文本与 assumptions contract
- source-view / trigger-view 之间的 compact 文本层会更对称

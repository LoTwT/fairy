# 静态构筑解析系统 V327：label map contracts

`V327` 只解决一件事：

- 把 `build` 各模块中固定 `Record<..., string>` 的 label map 统一收成显式公开 contract。

## 范围

1. `StaticBuildDiagnosticLabelMap`
2. `StaticBuildSourceNoteStatusLabelMap`
3. `StaticBuildSourceDamageViewGroupLabelMap`
4. `StaticBuildSourceUtilityViewGroupLabelMap`
5. `StaticBuildSourceEntryGroupLabelMap`
6. `StaticBuildTriggerMatrixGroupLabelMap`
7. 对应 label map 常量与 `build/index.ts` type export

## 非目标

1. 不修改任何 label 文案
2. 不处理 bucket label map
3. 不处理 `Set<string>` 形式的内部聚合容器

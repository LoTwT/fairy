# 静态构筑解析系统 V431

## 目标

`V431` 只解决一件事：

- 把 `lookup-bangboo.ts` 与 `lookup-drive-disc.ts` 中列表项和未命中候选项的结果 contract 统一收口为显式 alias / interface。

## 范围

1. `LookupBangbooId / Name / Rarity`
2. `LookupBangbooListItemSummary`
3. `LookupBangbooCandidate`
4. `LookupDriveDiscId / Name`
5. `LookupDriveDiscListItemSummary`
6. `LookupDriveDiscCandidateList`

## 非目标

1. 不改邦布或驱动盘的返回字段集合
2. 不改查询、筛选、模糊匹配或属性计算逻辑
3. 不改 `LookupBangbooTrimmedResult` 与 `LookupDriveDiscTrimmedResult` 的既有字段

## 当前状态

- `V431.1` 已完成：范围冻结到 `lookup-bangboo / lookup-drive-disc` 的匿名列表项/候选项 contract
- `V431.2` 已完成：列表项与候选项结果已统一复用显式 alias / interface

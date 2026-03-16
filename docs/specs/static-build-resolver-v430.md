# 静态构筑解析系统 V430

## 目标

`V430` 只解决一件事：

- 把 `lookup-w-engine.ts` 中列表项与未命中候选项的结果 contract 统一收口为显式 alias / interface。

## 范围

1. `LookupWEngineListItemId / Name / Rarity`
2. `LookupWEngineSpecialtyName`
3. `LookupWEngineExclusiveAgentName`
4. `LookupWEngineListItemSummary`
5. `LookupWEngineCandidate`

## 非目标

1. 不改 `lookup-w-engine` 的返回字段集合
2. 不改音擎筛选、匹配或属性计算逻辑
3. 不改 `activeEffect / trimmedResult` 既有 contract

## 当前状态

- `V430.1` 已完成：范围冻结到 `lookup-w-engine` 的匿名列表项/候选项 contract
- `V430.2` 已完成：列表项与候选项结果已统一复用显式 alias / interface

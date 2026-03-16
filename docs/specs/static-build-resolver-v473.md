# 静态构筑解析系统 V473

## 目标

`V473` 只解决一件事：

- 把 `cleaned/types.ts` 中 encounter 候选名与 `SD/TS node buff` 文本字段统一对齐到上游文本 alias。

## 范围

1. `EncounterCandidate`
2. `SDNodeBuffName`
3. `SDNodeBuffDescription`
4. `TSNodeBuffName`

## 非目标

1. 不改任何 `cleaned` helper 的筛选逻辑或返回值
2. 不改 `VersionPeriodText / VersionPeriodLabel`
3. 不改 `buffNames / buffDescriptions` 的列表结构或单值/多值语义

## 当前状态

- `V473.1` 已完成：范围冻结到 encounter 候选名与 `SD/TS node buff` 文本 contract
- `V473.2` 已完成：相关文本字段已统一复用 `game-modes` 上游 alias

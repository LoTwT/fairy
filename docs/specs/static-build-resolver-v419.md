# 静态构筑解析系统 V419

## 目标

`V419` 只解决一件事：

- 把 `cleaned/types.ts` 中 encounter 与 `DA buff view` 的匿名文本 list contract 统一收口为显式 alias。

## 范围

1. `EncounterCandidateList`
2. `EncounterWeaknessList`
3. `EncounterResistanceList`
4. `DABuffViewNameList`

## 非目标

1. 不改任何 `cleaned` helper 行为
2. 不改 `SD/TS` 视图嵌套 list
3. 不改 `zzz-agent` 或 build resolver contract

## 当前状态

- `V419.1` 已完成：范围冻结到 `cleaned encounter/buff` 文本 list contract
- `V419.2` 已完成：候选名、弱点、抗性与 `DA buff` 名字列表已统一复用显式 alias

# 静态构筑解析系统 V423

## 目标

`V423` 只解决一件事：

- 把 `gachabase/types.ts` 中 `agents.json` 顶层 display-label list contract 统一收口为显式 alias。

## 范围

1. `AgentAttributeLabelList`
2. `AgentAttackTypeLabelList`

## 非目标

1. 不改 `AgentListItem` 字段语义
2. 不改 `agent-details.json` contract
3. 不改任何 build resolver、cleaned helper 或 agent tool 逻辑

## 当前状态

- `V423.1` 已完成：范围冻结到 `AgentListItem` display-label list contract
- `V423.2` 已完成：`attributes` 与 `attackTypes` 已统一复用显式 alias

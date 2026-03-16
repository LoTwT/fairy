# 静态构筑解析系统 V390：gachabase agent skin asset contracts

## 背景

`packages/zzz-data/src/gachabase/types.ts` 的代理人 raw published contract 已经基本显式化，但 `AgentSkin.assets` 仍直接暴露匿名对象。

## 目标

`V390` 只解决一件事：

- 把 `AgentSkin.assets` 统一改成显式 named interface。

## 范围

1. `AgentSkinAssets`
2. `AgentSkin.assets`

## 非目标

1. 不改任何 published JSON shape
2. 不改 agent helper 或上层 resolver 逻辑
3. 不改其他 `gachabase` interface

## 完成标准

1. `gachabase/types.ts` 不再直接暴露匿名 `AgentSkin.assets` contract
2. 现有 `gachabase`、build、agent 测试与构建保持通过
3. roadmap、索引与架构文档同步

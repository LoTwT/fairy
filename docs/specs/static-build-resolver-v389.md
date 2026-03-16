# 静态构筑解析系统 V389：game-modes wave object contracts

## 背景

`packages/zzz-data/src/game-modes.ts` 的 raw published contract 已经基本显式化，但还剩 3 个匿名 wave object：

- `SDSideItem.waves`
- `TSBossSideItem.waves`
- `TSRegularSideItem.waves`

这几处仍直接用 `Array<{ enemies: ...[] }>` 表达。

## 目标

`V389` 只解决一件事：

- 把 `game-modes.ts` 里剩余的 wave object 统一改成显式 named interface。

## 范围

1. `SDWaveItem`
2. `TSBossWaveItem`
3. `TSRegularWaveItem`
4. `SDSideItem.waves`
5. `TSBossSideItem.waves`
6. `TSRegularSideItem.waves`

## 非目标

1. 不改任何 published JSON shape
2. 不改 `cleaned` helper 的消费语义
3. 不改上层 lookup 或 resolver 逻辑

## 完成标准

1. `game-modes.ts` 不再直接暴露匿名 wave object contract
2. 现有 `game-modes`、`cleaned`、agent 测试与构建保持通过
3. roadmap、索引与架构文档同步

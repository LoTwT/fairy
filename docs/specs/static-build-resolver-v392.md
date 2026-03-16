# 静态构筑解析系统 V392：buhflipexplode wave object contracts

## 背景

`packages/zzz-data/src/buhflipexplode/index.ts` 的 raw contract 已经基本显式化，但 `SDSide.waves` 与 `TSSide.waves` 仍直接暴露匿名 wave object。

## 目标

`V392` 只解决一件事：

- 把 `buhflipexplode` 里剩余的 wave object 统一改成显式 named interface。

## 范围

1. `SDWave`
2. `TSWave`
3. `SDSide.waves`
4. `TSSide.waves`

## 非目标

1. 不改任何 raw/published JSON shape
2. 不改 enemy/version 公式 helper
3. 不改版本外层匿名 object contract

## 完成标准

1. `buhflipexplode/index.ts` 不再直接暴露匿名 wave object contract
2. 现有 `buhflipexplode`、build、agent 测试与构建保持通过
3. roadmap、索引与架构文档同步

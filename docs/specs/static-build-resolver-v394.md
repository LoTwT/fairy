# 静态构筑解析系统 V394：buhflipexplode version record key contracts

## 背景

`packages/zzz-data/src/buhflipexplode/index.ts` 的 raw contract 里，`SD/DA/TS` 版本数据仍直接暴露 `Record<string, ...>`。

## 目标

`V394` 只解决一件事：

- 把 `buhflipexplode` 里剩余的版本 record key 统一改成显式 alias。

## 范围

1. `BuhflipVersionRecordKey`
2. `SDVersionsMode.versions`
3. `DAVersionsJson`
4. `TSVersionsMode.versions`

## 非目标

1. 不改任何 raw/published JSON shape
2. 不改版本容器 object contract
3. 不改 enemy DB 或 buff text contract

## 完成标准

1. `buhflipexplode/index.ts` 不再直接暴露 `Record<string, *VersionData>` 版本 key contract
2. 现有 `buhflipexplode`、build、agent 测试与构建保持通过
3. roadmap、索引与架构文档同步

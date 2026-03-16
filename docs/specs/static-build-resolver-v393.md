# 静态构筑解析系统 V393：buhflipexplode version container contracts

## 背景

`packages/zzz-data/src/buhflipexplode/index.ts` 的 raw contract 还剩 4 处匿名版本容器：

- `SDVersionData.versionEnemies`
- `SDVersionsJson` 数组项
- `TSVersionData.versionEnemies`
- `TSVersionsJson` 数组项

## 目标

`V393` 只解决一件事：

- 把 `buhflipexplode` 里剩余的版本容器 object 统一改成显式 named interface。

## 范围

1. `SDVersionEnemies`
2. `SDVersionsMode`
3. `TSVersionEnemies`
4. `TSVersionsMode`
5. `SDVersionData.versionEnemies`
6. `TSVersionData.versionEnemies`
7. `SDVersionsJson`
8. `TSVersionsJson`

## 非目标

1. 不改任何 raw/published JSON shape
2. 不改 enemy/version 公式 helper
3. 不改 DA 的 `Record<string, DAVersionData>` contract

## 完成标准

1. `buhflipexplode/index.ts` 不再直接暴露匿名版本容器 contract
2. 现有 `buhflipexplode`、build、agent 测试与构建保持通过
3. roadmap、索引与架构文档同步

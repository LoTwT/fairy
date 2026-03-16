# 静态构筑解析系统 V360：buhflipexplode helper result contracts

## 背景

在 [buhflipexplode/index.ts](/Users/caoyujie/codes/zzz-data/packages/zzz-data/src/buhflipexplode/index.ts) 里，公开导出的公式 helper 已在 `V354` 收口输入，但返回值仍直接暴露裸 `number`：

1. `calcEnemyDEF()`
2. `calcEnemyDaze()`
3. `calcSDEnemyHP()`
4. `calcTSEnemyHP()`
5. `calcBossHP()`
6. `calcPP20k()`
7. `calcSDEnemyAltHPReduction()`
8. `calcTSEnemyAltHPReduction()`
9. `calcDABossAltHPReduction()`
10. `calcTSBossAltHPReduction()`

## 目标

`V360` 只解决一件事：

- 给 buhflipexplode 公开公式 helper 的结果标量补显式公开 contract，不改变任何公式逻辑。

## 范围

1. `BuhflipEnemyDefense`
2. `BuhflipEnemyDaze`
3. `BuhflipEnemyHP`
4. `BuhflipBossHP`
5. `BuhflipPP20kHP`
6. `BuhflipAltHPReduction`
7. 上述 10 个公式 helper

## 非目标

1. 不改任何 HP / DEF / Daze / altHP 公式
2. 不改 merge/crawl 逻辑
3. 不把 buhflipexplode 加入根包更多导出

## 完成标准

1. buhflipexplode 公开公式 helper 不再暴露裸 `number` 结果 contract
2. 现有 buhflipexplode 测试保持通过
3. 文档同步完成

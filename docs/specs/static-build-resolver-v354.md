# 静态构筑解析系统 V354：buhflipexplode helper input contracts

## 背景

在 build-resolver 主线之外，仍有一组被 merge 脚本直接依赖的公式 helper 暴露在
[buhflipexplode/index.ts](/Users/caoyujie/codes/zzz-data/packages/zzz-data/src/buhflipexplode/index.ts)。

这些 helper 当前仍直接暴露裸 `number / string[] / string` 输入：

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

`V354` 只解决一件事：

- 给 `buhflipexplode` 公开公式 helper 的输入标量和 tag 列表补显式公开 contract，不改变任何公式逻辑。

## 范围

1. `BuhflipNodeLevel`
2. `BuhflipEnemyBaseDefense`
3. `BuhflipEnemyBaseDaze`
4. `BuhflipEnemyBaseHP`
5. `BuhflipEnemyHPMult`
6. `BuhflipBossHPMult`
7. `BuhflipPP60kTotalHP`
8. `BuhflipEnemyTag`
9. `BuhflipEnemyTagList`
10. `BuhflipEnemyId`
11. `BuhflipVersionIndex`
12. 上述 10 个公开 helper 的输入签名

## 非目标

1. 不改变任何 HP / DEF / Daze / altHP 公式
2. 不修改 merge 逻辑
3. 不把 `buhflipexplode` 加入根包公开导出

## 完成标准

1. 上述 helper 不再暴露裸 `number / string[] / string` 输入
2. merge 侧依赖不受影响
3. 回归测试与全量校验通过

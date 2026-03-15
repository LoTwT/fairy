# 静态构筑解析系统 V343：calculator scalar input contracts

## 背景

`V342` 收口后，`build/*` 里的最后一批裸 helper 参数已经基本清完。

下一条最小公开 contract 缺口不再在 `build`，而是落到了 [calculator/factors.ts](/Users/caoyujie/codes/zzz-data/packages/zzz-data/src/calculator/factors.ts) 里仍直接暴露 `number` 输入的独立 scalar helper。

这些 helper 已经对外导出，并且会被上层直接复用：

1. `getAttackerLevelBase()`
2. `calcBonusMultiplier()`
3. `calcSheerBonusMultiplier()`
4. `calcAnomalyProficiencyMultiplier()`
5. `calcDamageLevelMultiplier()`
6. `calcAnomalyBonusMultiplier()`
7. `calcAnomalyCritMultiplier()`

## 目标

`V343` 只解决一件事：

- 把 `calculator/factors.ts` 中独立导出的裸 scalar helper 输入统一收成显式公开 contract，不改变任何公式逻辑。

## 范围

1. 新增 `AttackerLevel`
2. `getAttackerLevelBase()` 改为复用 `AttackerLevel` 与 `DefenseParams["attackerLevelBase"]`
3. `calcBonusMultiplier()` 改为复用 `NormalDamageParams["bonusDamageSum"]`
4. `calcSheerBonusMultiplier()` 改为复用 `SheerDamageParams["sheerBonusSum"]`
5. `calcAnomalyProficiencyMultiplier()` 改为复用 `AnomalyDamageParams["virtualAgentAnomalyProficiency"]`
6. `calcDamageLevelMultiplier()` 改为复用 `AnomalyDamageParams["virtualAgentLevel"]`
7. `calcAnomalyBonusMultiplier()` 改为复用 `AnomalyDamageParams["anomalyBonusDamageSum"]`
8. `calcAnomalyCritMultiplier()` 改为复用 `AnomalyDamageParams["anomalyCritDamage"]`
9. [calculator/index.ts](/Users/caoyujie/codes/zzz-data/packages/zzz-data/src/calculator/index.ts) 同步导出 `AttackerLevel`

## 非目标

1. 不改变任何 multiplier 公式
2. 不调整 `DamageResult` 结构
3. 不修改 `normal / sheer / anomaly / disorder` pipeline
4. 不扩展新的伤害类型或新的 helper 行为

## 完成标准

1. 上述 helper 不再以裸 `number` 暴露输入 contract
2. `AttackerLevel` 已进入公开 calculator type export
3. 运行时结果不变
4. 全量校验通过

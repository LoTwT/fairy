# @randomplay/core

Fairy 的确定性计算核心包。

当前包提供乘区与公式定义基建，以及以下内置乘区：

- 基础伤害区：`baseDamageFactor`
- 增伤区：`damageBonusFactor`
- 暴击区：`criticalFactor`
- 防御区：`defenseFactor`
- 抗性区：`resistanceFactor`
- 减易伤区：`damageTakenFactor`
- 失衡易伤区：`stunDamageFactor`
- 基础失衡区：`baseDazeFactor`
- 失衡值提升区：`dazeDealtFactor`
- 受到失衡值提升区：`dazeTakenFactor`
- 紊乱失衡值提升区：`disorderDazeDealtFactor`
- 紊乱失衡等级区：`disorderDazeLevelFactor`
- 能量回复基础区：`baseEnergyGenerationFactor`
- 能量获得效率区：`energyGenerationRateFactor`
- 闪能累积基础区：`baseAdrenalineGenerationFactor`
- 闪能获得效率区：`adrenalineGenerationRateFactor`
- 基础喧响值回复：`baseDecibelGenerationFactor`
- 喧响获得效率区：`decibelGenerationRateFactor`
- 喧响值伴随获得效率：`accompanyingDecibelGenerationRateFactor`
- 基础秽盾削减值：`baseMiasmicShieldReductionFactor`
- 秽盾削减效率区：`miasmicShieldReductionRateFactor`
- 秽盾被削减效率区：`miasmicShieldReductionTakenRateFactor`
- 贯穿增伤区：`sheerDamageBonusFactor`
- 基础异常积蓄值：`baseAnomalyBuildupFactor`
- 异常掌控区：`anomalyMasteryFactor`
- 异常积蓄效率区：`anomalyBuildupRateFactor`
- 异常精通区：`anomalyProficiencyFactor`
- 异常伤害等级区：`anomalyDamageLevelFactor`
- 异常增伤区：`anomalyDamageBonusFactor`
- 异常暴击区：`anomalyCriticalFactor`

当前内置公式：

- 常规伤害：`regularDamageFormula`
- 贯穿伤害：`sheerDamageFormula`
- 异常伤害：`anomalyDamageFormula`
- 异常积蓄值：`anomalyBuildupFormula`
- 常规失衡值：`regularDazeFormula`
- 紊乱失衡值：`disorderDazeFormula`
- 能量回复值：`energyGenerationFormula`
- 闪能累积值：`adrenalineGenerationFormula`
- 喧响值回复：`decibelGenerationFormula`
- 秽盾削减值：`miasmicShieldReductionFormula`

调用方也可以分别使用 `defineFactor` 和 `defineFormula` 建立自定义乘区与公式。

此外提供 `calculateTotalDisplayedDamage`，用于将各段未显示取整的伤害分别向上取整并汇总为显示总值。
`calculateInitialStat` 和 `calculateFinalStat` 则用于计算遵循通用属性公式的初始属性和最终属性。

公共契约记录在 [Core 计算规范](https://github.com/LoTwT/fairy/blob/main/docs/specs/core/index.md)。

## 使用

### 常规伤害

```ts
import {
  DEFAULT_CRITICAL_FACTOR_INPUT,
  DEFAULT_DAMAGE_TAKEN_FACTOR_INPUT,
  DEFAULT_DEFENSE_FACTOR_INPUT,
  DEFAULT_RESISTANCE_FACTOR_INPUT,
  DEFAULT_STUN_DAMAGE_FACTOR_INPUT,
  regularDamageFormula,
} from "@randomplay/core"

const result = regularDamageFormula.calculate({
  baseDamage: [{ damageMultiplier: 2, finalStat: 100 }],
  damageBonus: [0.2],
  critical: DEFAULT_CRITICAL_FACTOR_INPUT,
  defense: DEFAULT_DEFENSE_FACTOR_INPUT,
  resistance: DEFAULT_RESISTANCE_FACTOR_INPUT,
  damageTaken: DEFAULT_DAMAGE_TAKEN_FACTOR_INPUT,
  stunDamage: DEFAULT_STUN_DAMAGE_FACTOR_INPUT,
})

result.value
// 240
```

### 自定义乘区

```ts
import { defineFactor } from "@randomplay/core"

interface BonusFactorInput {
  readonly damageBonuses: readonly number[]
}

const bonusFactor = defineFactor<BonusFactorInput>({
  factorId: "bonus",
  calculate: (input) =>
    1 + input.damageBonuses.reduce((sum, damageBonus) => sum + damageBonus, 0),
})

bonusFactor.calculate({ damageBonuses: [0.2, 0.3] })
// 1.5
```

## 约束

- 本包只负责确定性的计算领域逻辑。
- 本包不依赖 `@randomplay/data`。
- 调用方负责提供符合公式契约的完整计算输入；本包不假设输入来自任何特定数据源或上游处理流程。

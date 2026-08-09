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

调用方也可以分别使用 `defineFactor` 和 `defineFormula` 建立自定义乘区与公式。

此外提供 `calculateInitialStat` 和 `calculateFinalStat`，用于计算遵循通用属性公式的初始属性和最终
属性。

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

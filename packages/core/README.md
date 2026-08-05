# @randomplay/core

Fairy 的确定性计算核心包。

当前包提供乘区定义基建和以下内置乘区：

- 基础伤害区：`baseDamageFactor`
- 增伤区：`damageBonusFactor`
- 暴击区：`criticalFactor`
- 防御区：`defenseFactor`
- 抗性区：`resistanceFactor`

此外提供 `calculateInitialStat` 和 `calculateFinalStat`，用于计算遵循通用属性公式的初始属性和最终
属性。

公式组合能力尚未实现。公共契约记录在
[Core 计算规范](https://github.com/LoTwT/fairy/blob/main/docs/specs/core/index.md)。

## 使用

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

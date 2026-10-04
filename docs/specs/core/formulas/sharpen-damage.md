# 锐化伤害公式

锐化伤害公式按照固定顺序组合基础伤害区及七个倍率乘区。锋御（`Sharpen` 特性）以最终防御缩放
基础伤害，暴击改按锐暴区结算。规则来源为 ZZZ-HP 增益基线 `fac62407` 的直伤分支（上游
`damageCalc.ts` 的锐化链），固定来源位置与独立数值证据见
[ZZZ-HP 静态增益数据接入修订 9](../../data/zzz-hp-static-effects.md#修订-9锐化与锐暴公式及实体接入)。
游戏中文文本中的“锐化伤害”对应英文文本 `Sharpen DMG`。

## 身份与公开契约

| 项目        | 定义                                       |
| ----------- | ------------------------------------------ |
| 中文名称    | 锐化伤害                                   |
| `formulaId` | `sharpen_damage`                           |
| 身份常量    | `SHARPEN_DAMAGE_FORMULA_ID`                |
| 公开定义    | `sharpenDamageFormula`                     |
| 输入类型    | `SharpenDamageFormulaInput`                |
| 结果类型    | `FormulaResult<SharpenDamageFormulaInput>` |

公开类型形态如下。该代码块描述公开契约，不限定内部实现文件中的声明顺序。

```ts
export interface SharpenDamageFormulaInput {
  readonly baseDamage: BaseDamageFactorInput
  readonly damageBonus: DamageBonusFactorInput
  readonly sharpenDamageBonus: SharpenDamageBonusFactorInput
  readonly sharpCritical: SharpCriticalFactorInput
  readonly defense: DefenseFactorInput
  readonly resistance: ResistanceFactorInput
  readonly damageTaken: DamageTakenFactorInput
  readonly stunDamage: StunDamageFactorInput
}

export declare const SHARPEN_DAMAGE_FORMULA_ID: "sharpen_damage"

export declare const sharpenDamageFormula: Formula<SharpenDamageFormulaInput>
```

`SharpenDamageFormulaInput` 的每个字段都对应一个具体乘区的完整输入。状态信息放在使用该状态的乘区
输入内，例如本次是否按锐暴分支结算由 `sharpCritical.isSharpCritical` 表达，目标是否失衡由
`stunDamage.isTargetStunned` 表达。公式顶层不增加状态、伤害类型或数据来源字段。

## 输入与默认值

八个字段全部必填，也不接受 `undefined`。调用方已经确认某个倍率乘区在本次计算中应产生恒等倍率
`1` 时，必须显式传入该乘区公开的默认输入：

| 字段                 | 对应乘区                                         | 恒等输入                                    |
| -------------------- | ------------------------------------------------ | ------------------------------------------- |
| `baseDamage`         | [基础伤害区](../factors/base-damage.md)          | 无默认值，必须提供本次基础伤害区输入        |
| `damageBonus`        | [增伤区](../factors/damage-bonus.md)             | `DEFAULT_DAMAGE_BONUS_FACTOR_INPUT`         |
| `sharpenDamageBonus` | [锐化增伤区](../factors/sharpen-damage-bonus.md) | `DEFAULT_SHARPEN_DAMAGE_BONUS_FACTOR_INPUT` |
| `sharpCritical`      | [锐暴区](../factors/sharp-critical.md)           | 无默认值，必须提供本次锐暴分支输入          |
| `defense`            | [防御区](../factors/defense.md)                  | `DEFAULT_DEFENSE_FACTOR_INPUT`              |
| `resistance`         | [抗性区](../factors/resistance.md)               | `DEFAULT_RESISTANCE_FACTOR_INPUT`           |
| `damageTaken`        | [减易伤区](../factors/damage-taken.md)           | `DEFAULT_DAMAGE_TAKEN_FACTOR_INPUT`         |
| `stunDamage`         | [失衡易伤区](../factors/stun-damage.md)          | `DEFAULT_STUN_DAMAGE_FACTOR_INPUT`          |

各常量的精确内容与不可变性由表中对应乘区规范维护。它们都是产生恒等倍率 `1` 的计算默认输入，不
表示游戏内默认属性或默认状态。基础伤害区和锐暴区不提供默认常量：基础伤害没有通用默认值，锐暴区
必须显式选择结算分支，本公式也不另行定义默认值。

公式不自动补充、合并或克隆默认输入，也不公开完整的默认 `SharpenDamageFormulaInput`。

## 计算规则

锐化伤害采用以下乘区组合：

```text
锐化伤害
= 基础伤害区
  × 增伤区
  × 锐化增伤区
  × 锐暴区
  × 防御区
  × 抗性区
  × 减易伤区
  × 失衡易伤区
```

具体公式的 `calculate` 必须直接调用八个已定义的 `Factor`，再以同一顺序相乘。约束形态如下：

```ts
const factorResults = {
  baseDamage: baseDamageFactor.calculate(input.baseDamage),
  damageBonus: damageBonusFactor.calculate(input.damageBonus),
  sharpenDamageBonus: sharpenDamageBonusFactor.calculate(
    input.sharpenDamageBonus,
  ),
  sharpCritical: sharpCriticalFactor.calculate(input.sharpCritical),
  defense: defenseFactor.calculate(input.defense),
  resistance: resistanceFactor.calculate(input.resistance),
  damageTaken: damageTakenFactor.calculate(input.damageTaken),
  stunDamage: stunDamageFactor.calculate(input.stunDamage),
} satisfies FormulaFactorResults<SharpenDamageFormulaInput>

const value =
  factorResults.baseDamage *
  factorResults.damageBonus *
  factorResults.sharpenDamageBonus *
  factorResults.sharpCritical *
  factorResults.defense *
  factorResults.resistance *
  factorResults.damageTaken *
  factorResults.stunDamage

return { value, factorResults }
```

一次成功计算必须调用每个乘区一次。即使基础伤害区或其他较早乘区返回 `0`，也不能提前返回；这样
`factorResults` 始终包含全部八项结果。任一乘区抛出错误时，公式立即失败并传播原错误，不返回部分
结果。

乘法使用 JavaScript `number` 的 IEEE 754 语义，按本节列出的乘区顺序依次相乘，不进行代数重排。
该书写顺序是本规范的组合约定，与固定来源源文件的相乘书写顺序不同（固定来源先乘防御与抗性，
再乘独立锐化增伤与锐暴期望）；两者都是纯乘法结合，数值等价，仅在浮点末尾位上可能不同。
`defineFormula` 在公开返回前检查最终 `value` 和全部乘区结果是否有限。

## 与常规伤害和贯穿伤害的关系

锐化伤害与常规伤害共享基础伤害区、增伤区、防御区、抗性区、减易伤区和失衡易伤区，与贯穿伤害
共享增伤区、抗性区、减易伤区和失衡易伤区，但乘区组合有结构性差异：

- 暴击判定改用锐暴区：普通暴击乘区不参与本公式，锐暴期望由调用方按锐暴区规范的非锐暴/锐暴
  分支组合；
- 锐化伤害额外采用锐化增伤区，同时仍保留通用增伤区。固定来源中通用“造成的伤害提升”与
  技能增伤都进入通用增伤区，锐化增伤区独立叠加；
- 贯穿增伤、直伤决算加成（`settlement-multiplier-addition`）、异常精通与异常等级乘区不参与本
  公式；固定来源的锐化链没有这些乘区，防御区仍参与且使用与常规伤害相同的防御公式。

跳过普通暴击乘区与决算项是锐化伤害公式自身的业务规则，不能通过向暴击乘区传入恒等输入来模拟。
调用方也不能向本公式传入普通暴伤并期待其参与结果。

## 返回结果

`sharpenDamageFormula.calculate` 返回 `FormulaResult<SharpenDamageFormulaInput>`：

- `value` 是八个乘区结果相乘得到的未取整锐化伤害；
- `factorResults` 的键与 `SharpenDamageFormulaInput` 完全一致，分别保存八个乘区的最终
  `FactorResult`。

返回结果只提供公式值和乘区结果，不复制输入，也不提供贡献拆分、来源追踪或概率分析。后续分析能力
可以使用 `factorResults`，但不得改变本公式的基础返回类型。

## 适用边界

调用方必须先把最终防御作为 `BaseDamageFactorInputItem.finalStat` 建立 `baseDamage` 输入。本公式不
计算攻击力、生命值等属性向防御的角色专属转换，也不能从数值本身验证调用方传入的是最终防御。

上游通用特殊乘区按[特殊乘区边界](../factors/special.md)不移植，等价于恒等倍率 `1`，`SharpenDamageFormulaInput`
不包含特殊乘区输入或占位字段。

本公式还不负责：

- 从游戏文本、Nanoka 数据、面板数据或效果对象建立各乘区输入；
- 判断代理人是否具有锋御特性，或本次攻击是否属于锐化伤害；
- 判断技能、属性、攻击类型、效果条件和持续时间是否适用；
- 计算锐暴期望或决定一次攻击是否随机触发锐暴；
- 计算伤害显示数值的取整与汇总；该计算由[伤害显示总值帮助函数](../helpers/displayed-damage.md)统一处理；
- 计算常规伤害、贯穿伤害、异常伤害或其他公式。

## 有效性与失败行为

| 失败条件                                              | 行为                                 |
| ----------------------------------------------------- | ------------------------------------ |
| 输入不是非数组对象或为 `null`                         | 抛出 `TypeError`                     |
| 任一必填字段缺失、为 `undefined` 或不符合乘区输入契约 | 传播对应乘区抛出的错误               |
| 任一乘区计算失败                                      | 传播对应乘区抛出的错误               |
| 最终锐化伤害不是有限数值                              | 由 `defineFormula` 抛出 `RangeError` |

多个失败条件同时存在时，不承诺乘区校验错误的优先级。成功返回时，结果对象及其 `factorResults` 按
`defineFormula` 公共契约冻结。

## 代码组织

通用 `Formula` 类型与 `defineFormula` 统一放在 `packages/core/src/formula.ts`。锐化伤害公式的生产代码
放在 `packages/core/src/formulas/sharpen-damage.ts`，只包含身份常量、输入类型和公式定义，不重复实现任何
乘区算法。

`packages/core/src/index.ts` 只负责重新导出公开 API。通用公式基建和锐化伤害公式分别使用独立测试
文件，打包验证必须覆盖新增的公开类型、常量、默认输入和公式定义。

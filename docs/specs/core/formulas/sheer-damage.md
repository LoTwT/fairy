# 贯穿伤害公式

贯穿伤害公式按照固定顺序组合基础伤害区及六个倍率乘区，规则来源为
[原始攻略中的贯穿伤害公式](../../../references/zzz-data-introduction.txt#L46)。游戏中文文本中的“贯穿伤害”
对应英文文本 `Sheer DMG`。

## 身份与公开契约

| 项目        | 定义                                     |
| ----------- | ---------------------------------------- |
| 中文名称    | 贯穿伤害                                 |
| `formulaId` | `sheer_damage`                           |
| 身份常量    | `SHEER_DAMAGE_FORMULA_ID`                |
| 公开定义    | `sheerDamageFormula`                     |
| 输入类型    | `SheerDamageFormulaInput`                |
| 结果类型    | `FormulaResult<SheerDamageFormulaInput>` |

公开类型形态如下。该代码块描述公开契约，不限定内部实现文件中的声明顺序。

```ts
export interface SheerDamageFormulaInput {
  readonly baseDamage: BaseDamageFactorInput
  readonly damageBonus: DamageBonusFactorInput
  readonly critical: CriticalFactorInput
  readonly sheerDamageBonus: SheerDamageBonusFactorInput
  readonly resistance: ResistanceFactorInput
  readonly damageTaken: DamageTakenFactorInput
  readonly stunDamage: StunDamageFactorInput
}

export declare const SHEER_DAMAGE_FORMULA_ID: "sheer_damage"

export declare const sheerDamageFormula: Formula<SheerDamageFormulaInput>
```

`SheerDamageFormulaInput` 的每个字段都对应一个具体乘区的完整输入。状态信息放在使用该状态的乘区
输入内，例如是否暴击由 `critical.isCritical` 表达，目标是否失衡由
`stunDamage.isTargetStunned` 表达。公式顶层不增加状态、伤害类型或数据来源字段。

## 输入与默认值

七个字段全部必填，也不接受 `undefined`。调用方已经确认某个倍率乘区在本次计算中应产生恒等倍率
`1` 时，必须显式传入该乘区公开的默认输入：

| 字段               | 对应乘区                                       | 恒等输入                                  |
| ------------------ | ---------------------------------------------- | ----------------------------------------- |
| `baseDamage`       | [基础伤害区](../factors/base-damage.md)        | 无默认值，必须提供本次基础伤害区输入      |
| `damageBonus`      | [增伤区](../factors/damage-bonus.md)           | `DEFAULT_DAMAGE_BONUS_FACTOR_INPUT`       |
| `critical`         | [暴击区](../factors/critical.md)               | `DEFAULT_CRITICAL_FACTOR_INPUT`           |
| `sheerDamageBonus` | [贯穿增伤区](../factors/sheer-damage-bonus.md) | `DEFAULT_SHEER_DAMAGE_BONUS_FACTOR_INPUT` |
| `resistance`       | [抗性区](../factors/resistance.md)             | `DEFAULT_RESISTANCE_FACTOR_INPUT`         |
| `damageTaken`      | [减易伤区](../factors/damage-taken.md)         | `DEFAULT_DAMAGE_TAKEN_FACTOR_INPUT`       |
| `stunDamage`       | [失衡易伤区](../factors/stun-damage.md)        | `DEFAULT_STUN_DAMAGE_FACTOR_INPUT`        |

各常量的精确内容与不可变性由表中对应乘区规范维护。它们都是产生恒等倍率 `1` 的计算默认输入，不
表示游戏内默认属性或默认状态。基础伤害区不提供默认常量，本公式也不另行定义默认值。

公式不自动补充、合并或克隆默认输入，也不公开完整的默认 `SheerDamageFormulaInput`。

## 计算规则

贯穿伤害采用以下乘区组合：

```text
贯穿伤害
= 基础伤害区
  × 增伤区
  × 暴击区
  × 贯穿增伤区
  × 抗性区
  × 减易伤区
  × 失衡易伤区
```

具体公式的 `calculate` 必须直接调用七个已定义的 `Factor`，再以同一顺序相乘。约束形态如下：

```ts
const factorResults = {
  baseDamage: baseDamageFactor.calculate(input.baseDamage),
  damageBonus: damageBonusFactor.calculate(input.damageBonus),
  critical: criticalFactor.calculate(input.critical),
  sheerDamageBonus: sheerDamageBonusFactor.calculate(input.sheerDamageBonus),
  resistance: resistanceFactor.calculate(input.resistance),
  damageTaken: damageTakenFactor.calculate(input.damageTaken),
  stunDamage: stunDamageFactor.calculate(input.stunDamage),
} satisfies FormulaFactorResults<SheerDamageFormulaInput>

const value =
  factorResults.baseDamage *
  factorResults.damageBonus *
  factorResults.critical *
  factorResults.sheerDamageBonus *
  factorResults.resistance *
  factorResults.damageTaken *
  factorResults.stunDamage

return { value, factorResults }
```

一次成功计算必须调用每个乘区一次。即使基础伤害区或其他较早乘区返回 `0`，也不能提前返回；这样
`factorResults` 始终包含全部七项结果。任一乘区抛出错误时，公式立即失败并传播原错误，不返回部分
结果。

乘法使用 JavaScript `number` 的 IEEE 754 语义，并严格保留攻略中的乘区顺序，不进行代数重排。
`defineFormula` 在公开返回前检查最终 `value` 和全部乘区结果是否有限。

## 与常规伤害的关系

贯穿伤害与常规伤害共享基础伤害区、增伤区、暴击区、抗性区、减易伤区和失衡易伤区，但乘区组合有
两个结构性差异：

- 贯穿伤害不采用防御区，因此 `SheerDamageFormulaInput` 不包含 `defense` 字段，也不会调用
  `defenseFactor`；
- 贯穿伤害额外采用贯穿增伤区，同时仍保留通用增伤区。贯穿增伤区不替代增伤区或防御区。

跳过防御区是贯穿伤害公式自身的业务规则，不能通过向防御区传入恒等输入来模拟。调用方也不能向本
公式传入防御相关数据并期待其参与结果。

## 返回结果

`sheerDamageFormula.calculate` 返回 `FormulaResult<SheerDamageFormulaInput>`：

- `value` 是七个乘区结果相乘得到的未取整贯穿伤害；
- `factorResults` 的键与 `SheerDamageFormulaInput` 完全一致，分别保存七个乘区的最终
  `FactorResult`。

返回结果只提供公式值和乘区结果，不复制输入，也不提供贡献拆分、来源追踪或概率分析。后续分析能力
可以使用 `factorResults`，但不得改变本公式的基础返回类型。

## 适用边界

调用方必须先把最终贯穿力作为 `BaseDamageFactorInputItem.finalStat` 建立 `baseDamage` 输入。本公式不
计算攻击力、生命值等属性向贯穿力的角色专属转换，也不能从数值本身验证调用方传入的是最终贯穿力。

特殊机制是否允许本公式完整计算，统一遵循[特殊乘区规范](../factors/special.md)。
`SheerDamageFormulaInput` 不包含特殊乘区输入或占位字段。

本公式还不负责：

- 从游戏文本、Nanoka 数据、面板数据或效果对象建立各乘区输入；
- 判断代理人是否具有命破特性，或本次攻击是否属于贯穿伤害；
- 判断技能、属性、攻击类型、效果条件和持续时间是否适用；
- 计算暴击期望或决定一次攻击是否随机触发暴击；
- 计算伤害显示数值的取整与汇总；该计算由[伤害显示总值帮助函数](../helpers/displayed-damage.md)统一处理；
- 计算常规伤害、真实伤害、异常伤害或其他公式。

## 有效性与失败行为

| 失败条件                                              | 行为                                 |
| ----------------------------------------------------- | ------------------------------------ |
| 输入不是非数组对象或为 `null`                         | 抛出 `TypeError`                     |
| 任一必填字段缺失、为 `undefined` 或不符合乘区输入契约 | 传播对应乘区抛出的错误               |
| 任一乘区计算失败                                      | 传播对应乘区抛出的错误               |
| 最终贯穿伤害不是有限数值                              | 由 `defineFormula` 抛出 `RangeError` |

多个失败条件同时存在时，不承诺乘区校验错误的优先级。成功返回时，结果对象及其 `factorResults` 按
`defineFormula` 公共契约冻结。

## 代码组织

通用 `Formula` 类型与 `defineFormula` 统一放在 `packages/core/src/formula.ts`。贯穿伤害公式的生产代码
放在 `packages/core/src/formulas/sheer-damage.ts`，只包含身份常量、输入类型和公式定义，不重复实现任何
乘区算法。

`packages/core/src/index.ts` 只负责重新导出公开 API。通用公式基建和贯穿伤害公式分别使用独立测试
文件，打包验证必须覆盖新增的公开类型、常量、默认输入和公式定义。

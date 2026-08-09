# 异常伤害公式

异常伤害公式按照固定顺序组合基础伤害区及九个倍率乘区，规则来源为
[原始攻略中的异常伤害公式](../../../references/zzz-data-introduction.txt#L251)。异常伤害不采用普通暴击区，
而是采用异常暴击区。

## 身份与公开契约

| 项目        | 定义                                       |
| ----------- | ------------------------------------------ |
| 中文名称    | 异常伤害                                   |
| `formulaId` | `anomaly_damage`                           |
| 身份常量    | `ANOMALY_DAMAGE_FORMULA_ID`                |
| 公开定义    | `anomalyDamageFormula`                     |
| 输入类型    | `AnomalyDamageFormulaInput`                |
| 结果类型    | `FormulaResult<AnomalyDamageFormulaInput>` |

公开类型形态如下。该代码块描述公开契约，不限定内部实现文件中的声明顺序。

```ts
export interface AnomalyDamageFormulaInput {
  readonly baseDamage: BaseDamageFactorInput
  readonly damageBonus: DamageBonusFactorInput
  readonly anomalyProficiency: AnomalyProficiencyFactorInput
  readonly defense: DefenseFactorInput
  readonly resistance: ResistanceFactorInput
  readonly damageTaken: DamageTakenFactorInput
  readonly stunDamage: StunDamageFactorInput
  readonly anomalyDamageLevel: AnomalyDamageLevelFactorInput
  readonly anomalyDamageBonus: AnomalyDamageBonusFactorInput
  readonly anomalyCritical: AnomalyCriticalFactorInput
}

export declare const ANOMALY_DAMAGE_FORMULA_ID: "anomaly_damage"

export declare const anomalyDamageFormula: Formula<AnomalyDamageFormulaInput>
```

`AnomalyDamageFormulaInput` 的每个字段都对应一个具体乘区的完整输入。状态信息放在使用该状态的乘区
输入内，例如目标是否失衡由 `stunDamage.isTargetStunned` 表达，本次异常伤害是否暴击由
`anomalyCritical.isAnomalyCritical` 表达。公式顶层不增加异常类型、结算模式、状态或数据来源字段。

## 输入与默认值

十个字段全部必填，也不接受 `undefined`。调用方已经确认某个倍率乘区在本次计算中应产生恒等倍率
`1` 时，必须显式传入该乘区公开的默认输入：

| 字段                 | 对应乘区                                             | 恒等输入                                    |
| -------------------- | ---------------------------------------------------- | ------------------------------------------- |
| `baseDamage`         | [基础伤害区](../factors/base-damage.md)              | 无默认值，必须提供本次基础伤害区输入        |
| `damageBonus`        | [增伤区](../factors/damage-bonus.md)                 | `DEFAULT_DAMAGE_BONUS_FACTOR_INPUT`         |
| `anomalyProficiency` | [异常精通区](../factors/anomaly-proficiency.md)      | `DEFAULT_ANOMALY_PROFICIENCY_FACTOR_INPUT`  |
| `defense`            | [防御区](../factors/defense.md)                      | `DEFAULT_DEFENSE_FACTOR_INPUT`              |
| `resistance`         | [抗性区](../factors/resistance.md)                   | `DEFAULT_RESISTANCE_FACTOR_INPUT`           |
| `damageTaken`        | [减易伤区](../factors/damage-taken.md)               | `DEFAULT_DAMAGE_TAKEN_FACTOR_INPUT`         |
| `stunDamage`         | [失衡易伤区](../factors/stun-damage.md)              | `DEFAULT_STUN_DAMAGE_FACTOR_INPUT`          |
| `anomalyDamageLevel` | [异常伤害等级区](../factors/anomaly-damage-level.md) | `DEFAULT_ANOMALY_DAMAGE_LEVEL_FACTOR_INPUT` |
| `anomalyDamageBonus` | [异常增伤区](../factors/anomaly-damage-bonus.md)     | `DEFAULT_ANOMALY_DAMAGE_BONUS_FACTOR_INPUT` |
| `anomalyCritical`    | [异常暴击区](../factors/anomaly-critical.md)         | `DEFAULT_ANOMALY_CRITICAL_FACTOR_INPUT`     |

各常量的精确内容与不可变性由表中对应乘区规范维护。它们只表示产生恒等倍率 `1` 的计算输入，不表示
游戏内默认属性、默认状态或默认异常效果。尤其是：

- 异常精通区使用 `100` 作为恒等输入，异常伤害等级区使用等级 `1` 作为恒等输入；
- 异常暴击区使用 `isAnomalyCritical: false`，失衡易伤区使用 `isTargetStunned: false`；
- 基础伤害区不提供默认常量，但调用方仍可按基础伤害区规范显式传入空数组并得到 `0`。

本次结算存在实际乘区数据时，不得用恒等输入替代该数据并声称结果完整。

公式不自动补充、合并或克隆默认输入，也不公开完整的默认 `AnomalyDamageFormulaInput`。

## 计算规则

异常伤害采用以下乘区组合：

```text
异常伤害
= 基础伤害区
  × 增伤区
  × 异常精通区
  × 防御区
  × 抗性区
  × 减易伤区
  × 失衡易伤区
  × 异常伤害等级区
  × 异常增伤区
  × 异常暴击区
```

具体公式的 `calculate` 必须直接调用十个已定义的 `Factor`，再以同一顺序相乘。约束形态如下：

```ts
const factorResults = {
  baseDamage: baseDamageFactor.calculate(input.baseDamage),
  damageBonus: damageBonusFactor.calculate(input.damageBonus),
  anomalyProficiency: anomalyProficiencyFactor.calculate(
    input.anomalyProficiency,
  ),
  defense: defenseFactor.calculate(input.defense),
  resistance: resistanceFactor.calculate(input.resistance),
  damageTaken: damageTakenFactor.calculate(input.damageTaken),
  stunDamage: stunDamageFactor.calculate(input.stunDamage),
  anomalyDamageLevel: anomalyDamageLevelFactor.calculate(
    input.anomalyDamageLevel,
  ),
  anomalyDamageBonus: anomalyDamageBonusFactor.calculate(
    input.anomalyDamageBonus,
  ),
  anomalyCritical: anomalyCriticalFactor.calculate(input.anomalyCritical),
} satisfies FormulaFactorResults<AnomalyDamageFormulaInput>

const value =
  factorResults.baseDamage *
  factorResults.damageBonus *
  factorResults.anomalyProficiency *
  factorResults.defense *
  factorResults.resistance *
  factorResults.damageTaken *
  factorResults.stunDamage *
  factorResults.anomalyDamageLevel *
  factorResults.anomalyDamageBonus *
  factorResults.anomalyCritical

return { value, factorResults }
```

一次成功计算必须调用每个乘区一次。即使基础伤害区或其他较早乘区返回 `0`，也不能提前返回；这样
`factorResults` 始终包含全部十项结果。任一乘区抛出错误时，公式立即失败并传播原错误，不返回部分
结果。

乘法使用 JavaScript `number` 的 IEEE 754 语义，并严格保留攻略中的乘区顺序，不进行代数重排。
`defineFormula` 在公开返回前检查最终 `value` 和全部乘区结果是否有限。

## 与常规伤害的关系

异常伤害与常规伤害共享基础伤害区、增伤区、防御区、抗性区、减易伤区和失衡易伤区，但乘区组合有
以下结构性差异：

- 异常伤害不采用普通暴击区，`AnomalyDamageFormulaInput` 不包含 `critical` 字段，也不会调用
  `criticalFactor`；
- 异常暴击区取代普通暴击区，只处理一次已经确定是否异常暴击的结算；
- 异常伤害额外采用异常精通区、异常伤害等级区和异常增伤区；
- 异常伤害仍采用防御区，不采用贯穿增伤区。

调用方不能通过向普通暴击区传入恒等输入来模拟异常伤害，也不能同时向异常伤害计算应用普通暴击区
和异常暴击区。

## 输入准备与结算时点

[原始攻略中的异常伤害计算规则](../../../references/zzz-data-introduction.txt#L267-L272)使用“虚拟代理人”
建立部分乘区输入。虚拟代理人不是一个额外乘区，也不属于 `AnomalyDamageFormulaInput` 的顶层字段。
调用方必须在调用公式前完成以下输入准备：

- `baseDamage` 应按本次异常效果的基础伤害表达式建立；普通异常伤害使用虚拟代理人的加权攻击力与
  对应异常伤害倍率，特殊基础伤害调整仍由调用方在该字段中表达；
- `damageBonus` 应使增伤区结果等于积蓄时对当次攻击所记录的增伤区加权结果，不使用结算时当前
  代理人的通用增伤；
- `anomalyProficiency` 使用虚拟代理人的加权异常精通，`anomalyDamageLevel` 使用虚拟代理人加权后
  向下取整的等级；
- `defense.attackerLevelBase` 应由同一个已取整虚拟代理人等级通过 `calculateDefenseLevelBase` 建立；计算
  `defense.targetEffectiveDefense` 时，应将目标结算时的实时防御状态与虚拟代理人的加权穿透率和
  穿透值一并按防御区规范处理；
- `resistance` 中的目标抗性及目标侧调整、`damageTaken` 和 `stunDamage` 应反映目标结算时的实时
  状态；攻击方无视抗性的适用时点由调用方按已确认的效果规则选择；
- `anomalyDamageBonus` 和 `anomalyCritical` 应反映对应异常效果结算时的实时状态。

这些字段仍须遵循各自 `FactorInput` 的公开契约。上游已经得到某个乘区的最终倍率时，不能把该倍率
直接传入只接收贡献值或其他主公式参数的乘区输入。

本公式不接收异常积蓄记录，也不按积蓄贡献比例执行加权，不过滤邦布造成的积蓄或溢出积蓄，不建立
虚拟代理人，不对加权等级向下取整。公式也不验证不同字段是否来自正确且一致的快照；这些职责属于
独立的输入准备能力。

攻略还会为其他结算记录冲击力和失衡值提升，但二者不是异常伤害公式的乘区，不能因此向
`AnomalyDamageFormulaInput` 增加字段。

## 取整边界

异常伤害相关的三个取整阶段必须保持分离：

- 虚拟代理人的加权等级向下取整发生在建立公式输入之前；
- 异常伤害等级区的四位截断由 `anomalyDamageLevelFactor` 在乘区内部完成；
- 游戏显示的单段伤害向上取整发生在公式计算完成之后，多段伤害应逐段取整后再汇总。

`anomalyDamageFormula.calculate` 不执行显示取整或格式化，返回值始终是未显示取整的 `number`。

## 返回结果

`anomalyDamageFormula.calculate` 返回 `FormulaResult<AnomalyDamageFormulaInput>`：

- `value` 是十个乘区结果相乘得到的未取整异常伤害；
- `factorResults` 的键与 `AnomalyDamageFormulaInput` 完全一致，分别保存十个乘区的最终
  `FactorResult`。

返回结果只提供公式值和乘区结果，不复制输入，也不提供虚拟代理人快照、贡献拆分、来源追踪或概率
分析。后续分析能力可以使用 `factorResults`，但不得改变本公式的基础返回类型。

## 适用边界

攻略确认紊乱仍采用同一套异常伤害乘区；异放和极性紊乱也通过调整基础伤害区进行结算。因此调用方
已经正确建立全部乘区输入时，可以使用同一个 `anomalyDamageFormula`。公式不增加用于区分这些异常
效果的模式字段或异常类型字段，也不负责根据持续时间、异常类型或效果标签计算基础伤害倍率及结算
比例。

特殊机制是否允许本公式完整计算，统一遵循[特殊乘区规范](../factors/special.md)。
`AnomalyDamageFormulaInput` 不包含特殊乘区输入或占位字段。

本公式还不负责：

- 从游戏文本、Nanoka 数据、面板数据或效果对象建立各乘区输入；
- 判断属性、异常类型、效果标签、触发条件和持续时间是否适用；
- 决定一次异常伤害是否随机触发异常暴击，或计算异常暴击期望；
- 计算异常积蓄值、异常触发阈值、紊乱失衡值或其他非伤害结果；
- 将已经作用于异常积蓄及其贡献比例的距离衰减作为额外伤害乘区再次计算；
- 计算常规伤害、贯穿伤害、真实伤害或其他公式。

## 有效性与失败行为

| 失败条件                                              | 行为                                 |
| ----------------------------------------------------- | ------------------------------------ |
| 输入不是非数组对象或为 `null`                         | 抛出 `TypeError`                     |
| 任一必填字段缺失、为 `undefined` 或不符合乘区输入契约 | 传播对应乘区抛出的错误               |
| 任一乘区计算失败                                      | 传播对应乘区抛出的错误               |
| 最终异常伤害不是有限数值                              | 由 `defineFormula` 抛出 `RangeError` |

多个失败条件同时存在时，不承诺乘区校验错误的优先级。成功返回时，结果对象及其 `factorResults` 按
`defineFormula` 公共契约冻结。

## 代码组织

通用 `Formula` 类型与 `defineFormula` 统一放在 `packages/core/src/formula.ts`。异常伤害公式的生产代码
放在 `packages/core/src/formulas/anomaly-damage.ts`，只包含身份常量、输入类型和公式定义，不重复实现
任何乘区算法，也不包含虚拟代理人输入准备逻辑。

`packages/core/src/index.ts` 只负责重新导出公开 API。异常伤害公式使用独立测试文件，打包验证必须覆盖
新增的公开输入类型、身份常量和公式定义。

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
  readonly damageBonus: SettledDamageBonusFactorInput
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
| `damageBonus`        | [已结算增伤区](../factors/settled-damage-bonus.md)   | `DEFAULT_SETTLED_DAMAGE_BONUS_FACTOR_INPUT` |
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
- 已结算增伤区使用最终倍率 `1` 作为恒等输入，但普通异常路径不能用它替代缺失的虚拟代理人快照；
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
  damageBonus: settledDamageBonusFactor.calculate(input.damageBonus),
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

异常伤害与常规伤害共享基础伤害区、防御区、抗性区、减易伤区和失衡易伤区，并在同一个乘区位置采用
增伤区结果，但乘区组合和输入阶段有以下结构性差异：

- 常规伤害从本次攻击的原始增伤贡献计算通用增伤区；异常伤害接收已经按来源规则完成计算的增伤区
  结果，因此改用已结算增伤区。普通异常伤害在这里使用虚拟代理人加权结果，两个乘区不能互换或
  同时使用；
- 异常伤害不采用普通暴击区，`AnomalyDamageFormulaInput` 不包含 `critical` 字段，也不会调用
  `criticalFactor`；
- 异常暴击区取代普通暴击区，只处理一次已经确定是否异常暴击的结算；
- 异常伤害额外采用异常精通区、异常伤害等级区和异常增伤区；
- 异常伤害仍采用防御区，不采用贯穿增伤区。

调用方不能通过向普通暴击区传入恒等输入来模拟异常伤害，也不能同时向异常伤害计算应用普通暴击区
和异常暴击区。

## 输入准备与结算时点

[原始攻略中的异常伤害计算规则](../../../references/zzz-data-introduction.txt#L267-L272)使用“虚拟代理人”
建立普通异常伤害的部分乘区输入。普通紊乱也使用被覆盖原异常状态保存的同一快照。虚拟代理人不是
一个额外乘区，也不属于 `AnomalyDamageFormulaInput` 的顶层字段。这两类路径必须先使用
[虚拟代理人快照帮助函数](../helpers/virtual-agent-snapshot.md)取得快照，再完成以下输入准备：

- `baseDamage` 应按本次异常效果的基础伤害表达式建立；普通异常伤害使用虚拟代理人的加权攻击力与
  对应异常伤害倍率，普通紊乱可以使用本规范的
  [`calculateStandardDisorderDamageMultiplier`](#紊乱标准伤害倍率配套计算) 建立伤害倍率，特殊基础伤害
  调整仍由调用方在该字段中表达；
- `damageBonus` 直接使用快照的 `damageBonusFactorResult`，由已结算增伤区验证并原样返回；不使用
  结算时当前代理人的通用增伤，也不把最终倍率伪装为原始增伤贡献数组；
- `anomalyProficiency` 使用虚拟代理人的加权异常精通，`anomalyDamageLevel` 使用虚拟代理人加权后
  向下取整的等级；
- `defense.attackerLevelBase` 应由同一个已取整虚拟代理人等级通过 `calculateDefenseLevelBase` 建立；计算
  `defense.targetEffectiveDefense` 时，应将目标结算时的实时防御状态与虚拟代理人的加权穿透率和
  穿透值一并按防御区规范处理；
- `resistance` 中的目标抗性及目标侧调整、`damageTaken` 和 `stunDamage` 应反映目标结算时的实时
  状态；攻击方无视抗性的适用时点由调用方按已确认的效果规则选择；
- `anomalyDamageBonus` 和 `anomalyCritical` 应反映对应异常效果结算时的实时状态。

这些字段仍须遵循各自 `FactorInput` 的公开契约。本公式不接收异常积蓄记录，也不按积蓄贡献比例执行
加权，不过滤邦布造成的积蓄或溢出积蓄，不建立虚拟代理人，不对加权等级向下取整。公式也不验证不同
字段是否来自正确且一致的快照；记录筛选、溢出裁剪、加权和取整只由虚拟代理人快照规范维护。

攻略还会为其他结算记录冲击力和失衡值提升，但二者不是异常伤害公式的乘区，不能因此向
`AnomalyDamageFormulaInput` 增加字段。

### `damageBonus` 输入迁移

本规范将 `AnomalyDamageFormulaInput.damageBonus` 从 `DamageBonusFactorInput` 调整为
`SettledDamageBonusFactorInput`。这是对输入计算阶段的修正，不增加新的公式乘区，也不改变字段名、
`factorResults.damageBonus`、公式身份或乘法顺序。

已有调用方不能再把原始增伤贡献数组直接传给异常伤害公式。调用方应在每次有效代理人异常积蓄发生
时，先用 `damageBonusFactor.calculate` 得到该次攻击已经求和并钳制的增伤区结果，把结果写入
`VirtualAgentContributionRecord.damageBonusFactorResult`，再由快照帮助函数完成跨记录加权。旧数组在
新的异常伤害公式入口属于错误输入，不能为了兼容而隐式转换。

常规伤害与贯穿伤害的 `damageBonus` 字段仍使用 `DamageBonusFactorInput`，不受本次调整影响。

### 无积蓄直接异常效果

Nanoka 3.1 中，爱丽丝的 `Polarity Assault` / “极性强击”会无视异常积蓄进度，按原强击的一定比例直接
造成伤害，见本地数据缓存 `packages/data/raw/nanoka/3.1/{en,zh}/character/1401.json:344`，同一规则也在
`:1965` 重复出现。该文本没有说明攻击力、异常精通、等级、增伤区、穿透及后续异常状态快照应使用
爱丽丝实时值、既有快照还是其他输入。

本规范暂不定义这类无积蓄直接异常效果的完整输入准备。调用方不能伪造一条正数积蓄记录建立快照，
也不能只向已结算增伤区传入一个合法标量便声称其他公式输入已经确认。只有效果自身规则已经从可靠
来源明确全部乘区输入时，才能使用本公式组合这些输入；否则该路径必须视为暂不支持。

## 紊乱标准伤害倍率配套计算

[原始攻略中的紊乱伤害倍率规则](../../../references/zzz-data-introduction.txt#L279-L292)根据被覆盖的原异常
状态所属属性和该状态剩余持续时间，计算普通紊乱基础伤害区采用的标准伤害倍率。该计算具有独立、稳定
的输入与算法，因此由公开 helper 统一维护，不建立额外 `Factor` 或 `Formula`。

Nanoka 3.1 游戏文本使用 `Disorder DMG Multiplier` 表示“紊乱效果的伤害倍率”，见
[英文文本](../../../../packages/data/raw/nanoka/3.1/en/character/1411.json#L2153)与
[中文文本](../../../../packages/data/raw/nanoka/3.1/zh/character/1411.json#L2153)。公开函数名将 `DMG`
展开为 `Damage`，`StandardDisorderDamageMultiplier` 则是 core 为区分标准倍率与特殊效果调整建立的范围
标识，不表示游戏文本提供了完整的同名英文词组。

### 公开契约

```ts
export type DisorderSourceAttribute =
  "fire" | "electric" | "ether" | "ice" | "physical" | "auric_ink" | "frost"

export interface CalculateStandardDisorderDamageMultiplierParams {
  readonly originalAnomalyAttribute: DisorderSourceAttribute
  readonly remainingAnomalyDurationInSeconds: number
}

/** 根据原异常属性与剩余持续时间计算普通紊乱的标准伤害倍率。 */
export declare function calculateStandardDisorderDamageMultiplier(
  params: CalculateStandardDisorderDamageMultiplierParams,
): number
```

`DisorderSourceAttribute` 是本 helper 已确认支持的原异常来源属性闭集，不是所有游戏属性的通用枚举。
各公开值对应以下游戏术语：

| 公开值      | 原异常来源属性    | 原异常状态        | 术语说明                                                             |
| ----------- | ----------------- | ----------------- | -------------------------------------------------------------------- |
| `fire`      | Fire / 火属性     | Burn / 灼烧       | 基础属性                                                             |
| `electric`  | Electric / 电属性 | Shock / 感电      | 基础属性                                                             |
| `ether`     | Ether / 以太      | Corruption / 侵蚀 | 基础属性                                                             |
| `ice`       | Ice / 冰属性      | Frostbite / 霜寒  | 基础属性                                                             |
| `physical`  | Physical / 物理   | Flinch / 畏缩     | 基础属性；本规则按持续状态“畏缩”计算，不使用瞬时“强击”作为判别值     |
| `auric_ink` | Auric Ink / 玄墨  | Corruption / 侵蚀 | 特殊属性，游戏文本确认其基于以太结算，但仍保留独立公式分支           |
| `frost`     | Frost / 烈霜      | Frostbite / 霜寒  | 特殊属性，游戏文本确认其基于冰属性结算，但其紊乱倍率公式不同于冰属性 |

`Auric Ink` 和 `Frost` 的游戏中英文对照分别见 Nanoka 3.1 的
[玄墨英文数据](../../../../packages/data/raw/nanoka/3.1/en/character/1371.json#L14-L16)、
[玄墨中文数据](../../../../packages/data/raw/nanoka/3.1/zh/character/1371.json#L14-L16)、
[烈霜英文数据](../../../../packages/data/raw/nanoka/3.1/en/character/1091.json#L14-L16)与
[烈霜中文数据](../../../../packages/data/raw/nanoka/3.1/zh/character/1091.json#L14-L16)。`auric_ink` 使用不含空格
和特殊空白字符的稳定机器值，不直接复制原始数据中的富文本或空白形式。

`originalAnomalyAttribute` 表示被新异常覆盖并据此结算紊乱的原异常来源属性，不是触发紊乱的新异常
属性。不能只传原异常状态名称：以太与玄墨都会产生侵蚀，冰与烈霜都会产生霜寒，但同名状态不一定采用
相同倍率公式。

`remainingAnomalyDurationInSeconds` 表示原异常状态在紊乱结算时剩余的持续时间，单位为秒。调用方应在
原异常状态被覆盖前取得该值，并已经计入实际生效的持续时间延长效果；它不是异常的初始持续时间、已经
经过的时间或紊乱自身持续时间。

### 计算规则

设 `T = remainingAnomalyDurationInSeconds`。百分比常量先转换为小数，按来源属性采用以下规则：

| `originalAnomalyAttribute` | 标准伤害倍率                        |
| -------------------------- | ----------------------------------- |
| `fire`                     | `4.5 + Math.floor(T / 0.5) * 0.5`   |
| `electric`                 | `4.5 + Math.floor(T) * 1.25`        |
| `ether`                    | `4.5 + Math.floor(T / 0.5) * 0.625` |
| `ice`                      | `4.5 + Math.floor(T) * 0.075`       |
| `physical`                 | `4.5 + Math.floor(T) * 0.075`       |
| `auric_ink`                | `4.5 + Math.floor(T / 0.5) * 0.625` |
| `frost`                    | `6 + Math.floor(T) * 0.75`          |

返回值已经是可直接参与基础伤害区计算的小数倍率，例如 `450%` 返回 `4.5`，不额外加上基础值 `1`。函数不
对最终倍率取整、截断或钳制。

计算严格使用 JavaScript `number` 的 IEEE 754 语义和 `Math.floor`。`T / 0.5`、向下取整、乘法和最终
加法保持表中顺序，不引入 epsilon，不把表达式改写为按帧计算，也不根据显示精度修正结果。

攻略给出的普通异常初始持续时间通常为 `10` 秒，烈霜异常为 `20` 秒，但两者都不是 helper 的默认输入
或上限。持续时间可以被效果延长，因此函数接收实际剩余时间，不提供默认参数，也不把输入钳制到初始
持续时间。

按攻略给出的初始持续时间计算时，代表性结果如下：

| 原异常来源属性 | `T` | 标准伤害倍率 |
| -------------- | --- | ------------ |
| 火             | 10  | `14.5`       |
| 电             | 10  | `17`         |
| 以太           | 10  | `17`         |
| 冰             | 10  | `5.25`       |
| 物理           | 10  | `5.25`       |
| 玄墨           | 10  | `17`         |
| 烈霜           | 20  | `21`         |

### 与基础伤害区和异常伤害公式的组合

helper 只返回一个 `damageMultiplier` 数值，不建立或返回 `BaseDamageFactorInputItem`。普通紊乱调用方应将
它与原异常状态虚拟代理人的最终攻击力显式组合，再作为现有异常伤害公式的 `baseDamage` 输入：

```ts
const damageMultiplier = calculateStandardDisorderDamageMultiplier({
  originalAnomalyAttribute: "fire",
  remainingAnomalyDurationInSeconds: 10,
})

const baseDamage: BaseDamageFactorInput = [
  { damageMultiplier, finalStat: virtualAgentSnapshot.finalAttack },
]
```

调用方再将 `baseDamage` 与其他九个必填乘区输入组成完整的 `AnomalyDamageFormulaInput`。
`anomalyDamageFormula.calculate` 不会隐式调用本 helper，也不会从公式输入中读取异常属性或剩余持续
时间。

游戏文本还存在使 `Disorder DMG Multiplier` 提升的效果。本 helper 只计算攻略表中由来源属性与 `T`
决定的标准倍率，不接收、汇总或应用这类特殊调整；调用方只有在已经确认调整的叠加方式与适用范围后，
才能建立最终 `BaseDamageFactorInputItem.damageMultiplier`。特殊紊乱可以在自身规则明确复用普通紊乱标准
倍率时采用本 helper 的结果，但本 helper 不应用极性紊乱等特殊效果的结算比例或额外基础伤害项。

### 适用边界

本 helper 不负责：

- 判断两种属性异常是否会触发紊乱，或处理原异常覆盖、紊乱冷却与状态生命周期；
- 读取异常状态对象、计时器、帧数、Nanoka 数据或效果文本；
- 判断持续时间延长、伤害倍率调整和异常效果标签是否适用于本次结算；
- 建立虚拟代理人、计算最终攻击力或生成完整 `AnomalyDamageFormulaInput`；
- 计算极性紊乱、异放或其他特殊效果的完整基础伤害；
- 计算紊乱失衡值、最终异常伤害或
  [伤害显示总值](../helpers/displayed-damage.md)。

### 有效性与失败行为

| 失败条件                                                   | 行为              |
| ---------------------------------------------------------- | ----------------- |
| 参数不是非数组对象或为 `null`                              | 抛出 `TypeError`  |
| `originalAnomalyAttribute` 不是字符串                      | 抛出 `TypeError`  |
| `originalAnomalyAttribute` 不在七个受支持的公开值中        | 抛出 `RangeError` |
| `remainingAnomalyDurationInSeconds` 不是 `number`          | 抛出 `TypeError`  |
| `remainingAnomalyDurationInSeconds` 不是有限数值或小于 `0` | 抛出 `RangeError` |
| 最终标准伤害倍率不是有限数值                               | 抛出 `RangeError` |

`remainingAnomalyDurationInSeconds: 0` 有效。该值表示原异常在阶梯计算中不再贡献剩余时间项，仍会返回
对应属性公式的常量部分。参数对象不得被修改。

### 待确认：风属性与凛刃异常的反应边界

Nanoka 3.1 已出现 `Wind Anomaly` / “风属性异常状态”，见
[英文数据](../../../../packages/data/raw/nanoka/3.1/en/character/1541.json#L1359)与
[中文数据](../../../../packages/data/raw/nanoka/3.1/zh/character/1541.json#L1359)。另有同路径文本明确写出目标
处于 `Windswept` / “风化”时，被施加其他属性异常会触发 `Vortex` / “乱流”，见
[英文数据](../../../../packages/data/raw/nanoka/3.1/en/monster/40005.json#L1006)与
[中文数据](../../../../packages/data/raw/nanoka/3.1/zh/monster/40005.json#L1006)。当前攻略没有说明风属性异常
是否还参与普通紊乱，也没有提供对应的紊乱伤害倍率公式。

Nanoka 3.1 还确认 `Honed Edge` / “凛刃属性”基于物理属性结算，并触发 `Assault` / “强击”与
`Flinch` / “畏缩”，见[英文数据](../../../../packages/data/raw/nanoka/3.1/en/character/1431.json#L14-L16)与
[中文数据](../../../../packages/data/raw/nanoka/3.1/zh/character/1431.json#L14-L16)。攻略只给出了物理属性造成
的畏缩公式，没有说明凛刃是否直接采用同一紊乱倍率，因此当前不能把凛刃静默映射为 `physical`。

`DisorderSourceAttribute` 因此暂不包含 `wind` 或 `honed_edge`，运行时传入 `"wind"` 或 `"honed_edge"`
必须按不受支持的属性抛出 `RangeError`，不能复用其他属性公式进行推断。最终 review 时需要人工确认风属性
异常与普通紊乱、乱流之间的机制边界，以及凛刃是否采用物理属性的紊乱倍率；只有取得对应普通紊乱适用
证据与倍率公式后，才能扩展公开联合类型和计算分支。

## 取整边界

异常伤害相关的三个取整阶段必须保持分离：

- 虚拟代理人的加权等级由快照帮助函数在建立公式输入之前向下取整；
- 异常伤害等级区的四位截断由 `anomalyDamageLevelFactor` 在乘区内部完成；
- 伤害显示数值的取整与汇总发生在公式计算完成之后，由
  [伤害显示总值帮助函数](../helpers/displayed-damage.md)统一处理。

`anomalyDamageFormula.calculate` 不执行显示取整或格式化，返回值始终是未显示取整的 `number`。显示
数值取整、汇总及其失败行为只由伤害显示总值规范维护。

## 返回结果

`anomalyDamageFormula.calculate` 返回 `FormulaResult<AnomalyDamageFormulaInput>`：

- `value` 是十个乘区结果相乘得到的未取整异常伤害；
- `factorResults` 的键与 `AnomalyDamageFormulaInput` 完全一致，分别保存十个乘区的最终
  `FactorResult`。

返回结果只提供公式值和乘区结果，不复制输入，也不提供虚拟代理人快照、贡献拆分、来源追踪或概率
分析。后续分析能力可以使用 `factorResults`，但不得改变本公式的基础返回类型。

## 适用边界

攻略确认紊乱仍采用同一套异常伤害乘区；异放和极性紊乱也通过调整基础伤害区进行结算。这些路径在
已经正确建立全部乘区输入时，可以使用同一个 `anomalyDamageFormula`。公式不增加用于区分异常效果的
模式字段或异常类型字段，也不在 `calculate` 内根据持续时间、异常类型或效果标签隐式计算基础伤害倍率
及结算比例。普通紊乱的标准伤害倍率可以由本规范的配套 helper 显式计算后传入基础伤害区。无积蓄
直接异常效果遵循本规范的独立边界，不能从上述复用规则推导其输入。

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

通用 `Formula` 类型与 `defineFormula` 统一放在 `packages/core/src/formula.ts`。异常伤害公式及其紊乱标准
伤害倍率配套计算的生产代码放在 `packages/core/src/formulas/anomaly-damage.ts`。该文件可以包含紊乱倍率
helper 的公开类型、公开函数及其私有分支规则，但不重复实现任何乘区算法，也不包含虚拟代理人快照
逻辑。快照 helper 的代码组织由对应规范维护。

`packages/core/src/index.ts` 只负责重新导出公开 API。异常伤害公式及其配套 helper 使用同一个独立测试
文件；测试必须覆盖七个属性分支、阶梯边界、超过初始持续时间的输入、失败行为、与基础伤害区的组合及
输入不可变性。公式测试还必须覆盖已结算增伤区最终倍率、旧贡献数组输入失败以及
`factorResults.damageBonus` 保持原字段键。打包验证必须覆盖公式、乘区与 helper 的公开类型和运行时定义。

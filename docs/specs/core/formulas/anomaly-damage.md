# 异常伤害公式

异常伤害公式按照固定顺序组合基础伤害区及十个倍率乘区，规则来源为
[原始攻略中的异常伤害公式](../../../references/zzz-data-introduction.txt#L251)。异常伤害不采用普通暴击区，
而是采用异常暴击区。Nanoka 3.1 的异化机制还会在原有乘区之后对整个异常伤害采用独立异化区；不适用
异化的路径显式使用恒等倍率 `1`。

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
  readonly refringe: RefringeFactorInput
}

export declare const ANOMALY_DAMAGE_FORMULA_ID: "anomaly_damage"

export declare const anomalyDamageFormula: Formula<AnomalyDamageFormulaInput>
```

`AnomalyDamageFormulaInput` 的每个字段都对应一个具体乘区的完整输入。状态信息放在使用该状态的乘区
输入内，例如目标是否失衡由 `stunDamage.isTargetStunned` 表达，本次异常伤害是否暴击由
`anomalyCritical.isAnomalyCritical` 表达。公式顶层不增加异常类型、结算模式、状态或数据来源字段。

## 输入与默认值

十一个字段全部必填，也不接受 `undefined`。调用方已经确认某个倍率乘区在本次计算中应产生恒等倍率
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
| `refringe`           | [异化区](../factors/refringe.md)                     | `DEFAULT_REFRINGE_FACTOR_INPUT`             |

各常量的精确内容与不可变性由表中对应乘区规范维护。它们只表示产生恒等倍率 `1` 的计算输入，不表示
游戏内默认属性、默认状态或默认异常效果。尤其是：

- 异常精通区使用 `100` 作为恒等输入，异常伤害等级区使用等级 `1` 作为恒等输入；
- 已结算增伤区使用最终倍率 `1` 作为恒等输入，但普通异常路径不能用它替代缺失的虚拟代理人快照；
- 异常暴击区使用 `isAnomalyCritical: false`，失衡易伤区使用 `isTargetStunned: false`；
- 异化区使用最终倍率 `1` 作为恒等输入，但已经触发异化的异常状态必须使用其保存结果；
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
  × 异化区
```

具体公式的 `calculate` 必须直接调用十一个已定义的 `Factor`，再以同一顺序相乘。约束形态如下：

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
  refringe: refringeFactor.calculate(input.refringe),
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
  factorResults.anomalyCritical *
  factorResults.refringe

return { value, factorResults }
```

一次成功计算必须调用每个乘区一次。即使基础伤害区或其他较早乘区返回 `0`，也不能提前返回；这样
`factorResults` 始终包含全部十一项结果。任一乘区抛出错误时，公式立即失败并传播原错误，不返回部分
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
- 被异化的异常伤害在原有乘区之后额外采用保存的异化区；未触发异化时该区为恒等倍率；
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

3.1 的异化区不属于虚拟代理人快照。调用方应在异化触发时根据蕾米埃尔当时的异常精通及适用贡献计算
`refringe`，并把结果与被异化异常状态一同保存；后续普通异常、异放、乱流或紊乱基于该状态结算时复用
同一结果。没有触发异化时显式传入 `DEFAULT_REFRINGE_FACTOR_INPUT`。具体规则由
[异化区规范](../factors/refringe.md)统一维护。

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

### `refringe` 输入迁移

3.1 异化机制加入后，`AnomalyDamageFormulaInput` 新增必填的 `refringe: RefringeFactorInput`。该字段追加在
既有异常暴击区之后，使传入恒等倍率 `1` 的旧结算路径保持原有乘法顺序与 IEEE 754 结果。已有调用方
必须显式传入 `DEFAULT_REFRINGE_FACTOR_INPUT`，或传入与被异化异常状态一同保存的最终异化倍率；公式
不会因为字段缺失而自动补 `1`。

### 无积蓄直接异常效果

Nanoka 3.1 中，爱丽丝的 `Polarity Assault` / “极性强击”会无视异常积蓄进度，按原强击的一定比例直接
造成伤害，见本地数据缓存 `packages/data/raw/nanoka/3.1/{en,zh}/character/1401.json:344`，同一规则也在
`:1965` 重复出现。该文本没有说明攻击力、异常精通、等级、增伤区、穿透及后续异常状态快照应使用
爱丽丝实时值、既有快照还是其他输入。

本规范暂不定义这类无积蓄直接异常效果的完整输入准备。调用方不能伪造一条正数积蓄记录建立快照，
也不能只向已结算增伤区传入一个合法标量便声称其他公式输入已经确认。只有效果自身规则已经从可靠
来源明确全部乘区输入时，才能使用本公式组合这些输入；否则该路径必须视为暂不支持。

## 异放的 3.1 输入边界

`Abloom` / “异放”的术语由[core 术语表](../index.md#异放相关术语)统一维护。攻略 2.x 已确认异放是
一次倍率经过调整的原属性异常伤害，基础伤害区的通用结构为：

```text
异放基础伤害区
= 原异常虚拟代理人攻击力
  × 原异常伤害倍率
  × 效果自身的异放倍率表达式
```

薇薇安的具体表达式还包含“薇薇安异常精通 ÷ 10 × 对应异常结算比例”，见
[攻略 L273-L275](../../../references/zzz-data-introduction.txt#L273-L275)。该角色专属表达式不是所有异放的
全局规则。

Nanoka 3.1 进一步确认异放来源已经出现多种输入形态：

- 柏妮思的 `packages/data/raw/nanoka/3.1/{en,zh}/character/1171.json:1012` 按以太、电、火、物理、冰、风
  六种原异常分别结算原异常伤害的 `480%`、`240%`、`600%`、`40%`、`60%`、`24%`；
- 普罗米娅的同一招式会固定结算对应属性异常伤害，例如
  `packages/data/raw/nanoka/3.1/{en,zh}/character/1541.json:1359` 的连携技为 `100%`，同文件 `:1364` 的
  终结技为 `250%`，核心被动和影画还会提供其他固定倍率；
- 爱芮的 `packages/data/raw/nanoka/3.1/{en,zh}/character/1501.json:2195` 明确允许自身触发的异放按独立
  暴击率和暴击伤害暴击；
- 维琳娜的 `packages/data/raw/nanoka/3.1/{en,zh}/character/1561.json:1872` 明确存在固定 `680%` 倍率的
  风属性异放。

这些例子共同确认异放复用属性异常伤害乘区，但不能支持一个全局 `calculateAbloomDamageMultiplier`
查表：倍率可能按原异常属性、技能、角色面板、核心技、影画、目标失衡状态或其他效果变化。调用方必须
先按具体效果的可靠来源算出最终基础伤害倍率，再与原异常状态保存的输入组合：

```ts
const baseDamage: BaseDamageFactorInput = [
  {
    damageMultiplier: resolvedAbloomDamageMultiplier,
    finalStat: sourceAnomalySnapshot.finalAttack,
  },
]
```

其中：

- `resolvedAbloomDamageMultiplier` 包含原异常伤害倍率及该效果明确给出的结算比例或基础倍率调整；不能只
  因为效果名为异放就套用薇薇安、柏妮思、普罗米娅、爱芮或维琳娜中任一角色的规则；
- `damageBonus`、`anomalyProficiency`、等级和穿透等来源侧历史输入继续来自原异常状态保存的快照；
- 原异常已经异化时，`refringe` 复用该状态单独保存的异化区结果；
- 异放专属增伤与通用异常增伤在 `anomalyDamageBonus` 中按其来源规则建立；异放专属暴击通过
  `anomalyCritical` 表达，不计算暴击期望；异放专属无视防御通过防御区的输入准备表达；
- 目标实时抗性、减易伤、失衡易伤及其他目标侧状态仍在异放结算时建立。

因此异放继续使用 `anomalyDamageFormula`，不建立 `abloomDamageFormula`、异放倍率 Factor 或角色规则
查表。触发条件、技能倍率选择、冷却、资源变化、一次招式触发次数和 3.1 角色专属公式均属于调用方和
版本化数据层。异放与极性强击都可能不增加异常积蓄，但两者的证据边界不同：异放明确引用一个已有的
原异常状态，可以复用该状态保存的快照；极性强击目前没有同等完整的输入继承规则，仍遵循上一节的
暂不支持边界。

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

调用方再将 `baseDamage` 与其他十个必填乘区输入组成完整的 `AnomalyDamageFormulaInput`。
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

### 待确认：普通紊乱的风属性与凛刃边界

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
必须按不受支持的属性抛出 `RangeError`，不能复用其他属性公式进行推断。乱流使用下方独立 helper，不是
风属性普通紊乱的替代分支。只有取得对应普通紊乱适用证据与倍率公式后，才能扩展公开联合类型和计算分支。

## 乱流标准伤害倍率配套计算

Nanoka 3.1 本地中英文缓存 `packages/data/raw/nanoka/3.1/{en,zh}/monster/40005.json:1006` 确认
`Windswept` / “风化”与 `Vortex` / “乱流”的游戏术语及触发关系。同版本本地数据缓存
`packages/data/raw/nanoka/3.1/{en,zh}/shiyu/62051.json:13` 还分别使用 `Vortex DMG` 和“乱流造成的伤害”
表达乱流专属伤害调整。

Nanoka 当前公开数据没有乱流基础倍率的结构化字段。六种标准倍率采用
[HoYoLAB 社区实测文章](https://www.hoyolab.com/article/45484490)中的完整倍率表；该文章明确说明内容来自
3.0 创作体验服。表中固定倍率、持续时间项与标准时长结果，和 ZZZ-HP 固定提交中的
[乱流默认参数](https://github.com/Nie7bai/ZZZ-HP/blob/92e87139fd2cdde8d0a6bf114de6dea832a42fca/zzz-hp/src/utils/calculatorUi.ts#L415-L439)
逐项一致。本文将它们作为 3.1 计算模型的实测依据，不把这些数值描述为 Nanoka 字段或游戏文本直接公开
的公式。后续版本若出现可核验的结构化规则或反例，应先更新本规范及测试向量，再调整实现。

`StandardVortexDamageMultiplier` 是 core 为标准乱流倍率建立的组合标识，不表示游戏文本存在完整同名英文
术语。该计算只派生基础伤害区所需的伤害倍率，不建立额外 `Factor` 或 `Formula`。

### 公开契约

```ts
export type VortexDamageMultiplierProfile =
  "corruption" | "shock" | "burn" | "assault" | "frostbite" | "frost"

export interface CalculateStandardVortexDamageMultiplierParams {
  readonly vortexDamageMultiplierProfile: VortexDamageMultiplierProfile
  readonly sourceAnomalyDurationInSeconds: number
}

/** 根据被乱流消耗的非风异常及其持续时间计算标准乱流伤害倍率。 */
export declare function calculateStandardVortexDamageMultiplier(
  params: CalculateStandardVortexDamageMultiplierParams,
): number
```

`VortexDamageMultiplierProfile` 是乱流倍率表的闭集选择器，不是所有属性、异常状态或特殊属性的通用枚举。
各公开值表示以下已确认的计算分支：

| 公开值       | 倍率表分支        | 说明                                                             |
| ------------ | ----------------- | ---------------------------------------------------------------- |
| `corruption` | Corruption / 侵蚀 | 标准以太异常分支                                                 |
| `shock`      | Shock / 感电      | 标准电属性异常分支                                               |
| `burn`       | Burn / 灼烧       | 标准火属性异常分支                                               |
| `assault`    | Assault / 强击    | 标准物理异常分支                                                 |
| `frostbite`  | Frostbite / 霜寒  | 标准冰属性异常分支，不包含烈霜属性                               |
| `frost`      | Frost / 烈霜      | 烈霜属性专用分支；它虽基于冰属性结算，但乱流倍率不同于普通冰属性 |

`vortexDamageMultiplierProfile` 由调用方根据本次被乱流消耗的非风异常选择。玄墨、凛刃等特殊属性是否映射到
某个标准分支，必须由该特殊属性自身的可靠规则确认，helper 不根据基础属性、异常状态名称或富文本标签自动推断。
风属性不属于这里的被消耗异常，也没有 `wind` 公开值。

`sourceAnomalyDurationInSeconds` 是本次非风异常生效时的完整持续时间，单位为秒，并已包含实际适用的持续
时间延长。风化与非风异常同时存在的顺序、经过时间和计时器不由 helper 推导。标准乱流在非风异常发生时
同步结算，因此这里不是普通紊乱使用的“原异常剩余持续时间”。

### 计算规则

设 `T = sourceAnomalyDurationInSeconds`。百分比常量转换为小数后，严格按实测表中的运算结构计算：

| `vortexDamageMultiplierProfile` | 标准乱流伤害倍率      |
| ------------------------------- | --------------------- |
| `corruption`                    | `6.5 + 0.625 * T * 2` |
| `shock`                         | `6.5 + 1.25 * T`      |
| `burn`                          | `9 + 0.5 * T * 2`     |
| `assault`                       | `8 + 0.075 * T`       |
| `frostbite`                     | `13 + 0.075 * T`      |
| `frost`                         | `0 + 0.75 * T`        |

返回值已经是可直接参与基础伤害区计算的小数倍率，例如 `1900%` 返回 `19`，不额外加上基础值 `1`。函数不
对 `T` 或最终倍率向下取整、截断或钳制，也不把持续伤害分支的 `* 2` 合并进其他常量。

计算使用 JavaScript `number` 的 IEEE 754 语义。乘法与加法保持表中从左到右的顺序，不引入 epsilon，不按
帧换算，也不进行代数重排。标准时长和对应结果如下：

| 倍率表分支 | `T` | 标准乱流伤害倍率 |
| ---------- | --- | ---------------- |
| 侵蚀       | 10  | `19`             |
| 感电       | 10  | `19`             |
| 灼烧       | 10  | `19`             |
| 强击       | 10  | `8.75`           |
| 霜寒       | 10  | `13.75`          |
| 烈霜       | 20  | `15`             |

持续时间不是 helper 的默认输入或上限。比如侵蚀持续时间延长到 `13` 秒时，标准乱流伤害倍率为 `22.75`。

### 与虚拟代理人和异常伤害公式的组合

乱流仍使用现有异常伤害公式，不建立 `vortexDamageFormula`。调用方应先从被乱流消耗的非风异常取得
[虚拟代理人快照](../helpers/virtual-agent-snapshot.md)，再把 helper 结果与该快照的最终攻击力组成基础伤害区：

```ts
const damageMultiplier = calculateStandardVortexDamageMultiplier({
  vortexDamageMultiplierProfile: "corruption",
  sourceAnomalyDurationInSeconds: 10,
})

const baseDamage: BaseDamageFactorInput = [
  { damageMultiplier, finalStat: sourceAnomalySnapshot.finalAttack },
]
```

同一份非风异常快照还提供异常精通、等级、穿透及已经结算的增伤区；如果被消耗异常已经异化，调用方
还须使用该异常状态单独保存的异化区结果。目标防御、抗性、减易伤、失衡易伤和异常专属增伤等结算时
乘区仍按异常伤害规范实时准备。

乱流在效果归属上视为造成风化的角色所造成的伤害，并按被消耗非风异常的属性异常伤害处理。调用方负责
据此判断角色限定效果、乱流专属增伤、属性异常增伤和异常暴击是否适用，再建立 `anomalyDamageBonus` 与
`anomalyCritical`。helper 不接收角色、属性、装备或效果列表，也不替调用方判断这些贡献。

强击与碎冰在触发乱流时还会分别结算自身的瞬时异常伤害。helper 返回的 `8.75` 或 `13.75` 只代表乱流
伤害倍率，不包含强击或碎冰的倍率；需要展示或汇总两次伤害时，调用方应分别建立公式调用，再使用
[伤害显示总值帮助函数](../helpers/displayed-damage.md)处理各段显示值。

### 适用边界

本 helper 不负责：

- 判断风化与另一种属性异常是否触发乱流，或更新、清除、保留任何异常状态；
- 读取异常槽、计时器、角色、装备、Nanoka 数据或效果文本；
- 建立、筛选或保存非风异常的虚拟代理人快照；
- 判断特殊属性采用哪个倍率表分支，或计算普通紊乱、极性紊乱和异放；
- 应用乱流伤害提升、属性异常伤害提升、持续时间延长或异常暴击；
- 计算强击、碎冰、最终异常伤害或伤害显示总值。

### 有效性与失败行为

| 失败条件                                                | 行为              |
| ------------------------------------------------------- | ----------------- |
| 参数不是非数组对象或为 `null`                           | 抛出 `TypeError`  |
| `vortexDamageMultiplierProfile` 不是字符串              | 抛出 `TypeError`  |
| `vortexDamageMultiplierProfile` 不在六个公开值中        | 抛出 `RangeError` |
| `sourceAnomalyDurationInSeconds` 不是 `number`          | 抛出 `TypeError`  |
| `sourceAnomalyDurationInSeconds` 不是有限数值或小于 `0` | 抛出 `RangeError` |
| 最终标准乱流伤害倍率不是有限数值                        | 抛出 `RangeError` |

`sourceAnomalyDurationInSeconds: 0` 有效，返回对应分支的固定倍率。参数对象不得被修改。

### 代码组织

- 类型、参数接口和 helper 与异常伤害公式共同维护在 `packages/core/src/formulas/anomaly-damage.ts`；
- `packages/core/src/index.ts` 从包根导出函数与两个类型；
- `packages/core/test/anomaly-damage.test.ts` 覆盖六个分支、标准时长、零值、持续时间延长、小数秒、运算顺序、
  输入不可变性及全部失败行为；
- `packages/core/test/verify-package.test.ts` 从真实打包产物消费运行时函数与公开类型。

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

- `value` 是十一个乘区结果相乘得到的未取整异常伤害；
- `factorResults` 的键与 `AnomalyDamageFormulaInput` 完全一致，分别保存十一个乘区的最终
  `FactorResult`。

返回结果只提供公式值和乘区结果，不复制输入，也不提供虚拟代理人快照、贡献拆分、来源追踪或概率
分析。后续分析能力可以使用 `factorResults`，但不得改变本公式的基础返回类型。

## 适用边界

攻略确认紊乱仍采用同一套异常伤害乘区；异放和极性紊乱也通过调整基础伤害区进行结算。这些路径在
已经正确建立全部乘区输入时，可以使用同一个 `anomalyDamageFormula`。3.1 中，普通异常、异放、乱流和
紊乱基于已异化异常状态结算时，还必须复用该状态保存的异化区结果。公式不增加用于区分异常效果的
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
`factorResults.damageBonus` 保持原字段键。异化区加入后，测试还必须覆盖恒等输入不改变旧路径结果、
保存倍率作用于完整旧结果、字段缺失失败和 `factorResults.refringe`。打包验证必须覆盖公式、乘区与 helper
的公开类型和运行时定义。

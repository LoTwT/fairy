# 耀变伤害公式

耀变是 Nanoka 3.1 角色文本中由 `Luminize` 对应的特殊属性异常伤害。蕾米埃尔通过队友触发异化时，
根据被异化异常的异常效果强度生成虚曜；特定招式命中后，每枚已保存虚曜各结算一次耀变。游戏文本依据
位于本地数据 `packages/data/raw/nanoka/3.1/{en,zh}/character/1581.json:1952-2036`。

公式的属性保存、乘区适用性和乘算结构由
[3.1 蕾米埃尔机制说明](https://zzz.gachabase.net/guides/1/covenant-of-dayat-remielle-dan-guide)与
[蕾米埃尔详细机制攻略](https://a.4399.cn/gl/53681368_359313.html)交叉确认。一次公式调用只计算一枚
虚曜对应的一次耀变伤害实例，不计算虚曜队列或总耀变伤害。

## 身份与公开契约

| 项目        | 定义                                             |
| ----------- | ------------------------------------------------ |
| 中文名称    | 耀变伤害                                         |
| `formulaId` | `luminize_damage`                                |
| 身份常量    | `LUMINIZE_DAMAGE_FORMULA_ID`                     |
| 公开定义    | `luminizeDamageFormula`                          |
| 输入类型    | `LuminizeDamageFormulaInput`                     |
| 配套函数    | `calculateSpecialVoidflareDamageBonusMultiplier` |
| 结果类型    | `FormulaResult<LuminizeDamageFormulaInput>`      |

```ts
export interface LuminizeDamageFormulaInput {
  readonly baseDamage: BaseDamageFactorInput
  readonly damageBonus: SettledDamageBonusFactorInput
  readonly anomalyProficiency: AnomalyProficiencyFactorInput
  readonly refringe: RefringeFactorInput
  readonly luminizeMultiplier: LuminizeMultiplierFactorInput
  readonly anomalyDamageBonus: AnomalyDamageBonusFactorInput
  readonly defense: DefenseFactorInput
  readonly resistance: ResistanceFactorInput
  readonly damageTaken: DamageTakenFactorInput
  readonly stunDamage: StunDamageFactorInput
  readonly anomalyDamageLevel: AnomalyDamageLevelFactorInput
}

export declare const LUMINIZE_DAMAGE_FORMULA_ID: "luminize_damage"

export declare function calculateSpecialVoidflareDamageBonusMultiplier(
  agentLevel: number,
): number

export declare const luminizeDamageFormula: Formula<LuminizeDamageFormulaInput>
```

每个字段都对应一个现有或新增乘区的完整输入。公式顶层不增加蕾米埃尔、来源代理人、技能、属性、虚曜
类型、虚曜数组、目标或状态标签。

## 输入与恒等值

| 字段                 | 对应乘区                                             | 恒等输入或要求                                 |
| -------------------- | ---------------------------------------------------- | ---------------------------------------------- |
| `baseDamage`         | [基础伤害区](../factors/base-damage.md)              | 无默认；普通虚曜通常传来源最终攻击力与倍率 `1` |
| `damageBonus`        | [已结算增伤区](../factors/settled-damage-bonus.md)   | `DEFAULT_SETTLED_DAMAGE_BONUS_FACTOR_INPUT`    |
| `anomalyProficiency` | [异常精通区](../factors/anomaly-proficiency.md)      | `DEFAULT_ANOMALY_PROFICIENCY_FACTOR_INPUT`     |
| `refringe`           | [异化区](../factors/refringe.md)                     | `DEFAULT_REFRINGE_FACTOR_INPUT`                |
| `luminizeMultiplier` | [耀变倍率区](../factors/luminize-multiplier.md)      | 无默认；必须提供本次招式及蕾米埃尔实时输入     |
| `anomalyDamageBonus` | [异常增伤区](../factors/anomaly-damage-bonus.md)     | `DEFAULT_ANOMALY_DAMAGE_BONUS_FACTOR_INPUT`    |
| `defense`            | [防御区](../factors/defense.md)                      | `DEFAULT_DEFENSE_FACTOR_INPUT`                 |
| `resistance`         | [抗性区](../factors/resistance.md)                   | `DEFAULT_RESISTANCE_FACTOR_INPUT`              |
| `damageTaken`        | [减易伤区](../factors/damage-taken.md)               | `DEFAULT_DAMAGE_TAKEN_FACTOR_INPUT`            |
| `stunDamage`         | [失衡易伤区](../factors/stun-damage.md)              | `DEFAULT_STUN_DAMAGE_FACTOR_INPUT`             |
| `anomalyDamageLevel` | [异常伤害等级区](../factors/anomaly-damage-level.md) | `DEFAULT_ANOMALY_DAMAGE_LEVEL_FACTOR_INPUT`    |

全部字段必填；公式不自动补默认输入。异化区恒等输入 `1` 只适用于来源确认没有异化的路径，不能代替普通
虚曜已经保存但丢失的异化结果。耀变倍率区没有默认输入。

## 计算规则

耀变伤害采用以下顺序：

```text
耀变伤害
= 基础伤害区
  × 已结算增伤区
  × 异常精通区
  × 异化区
  × 耀变倍率区
  × 异常增伤区
  × 防御区
  × 抗性区
  × 减易伤区
  × 失衡易伤区
  × 异常伤害等级区
```

具体公式必须直接调用十一个 `Factor` 各一次，再严格按上述顺序相乘。即使较早结果为 `0`，也不能跳过
后续乘区校验。`factorResults` 必须包含与 `LuminizeDamageFormulaInput` 完全相同的十一个键。

乘法采用 JavaScript `number` 的 IEEE 754 语义，不重排、不取整、不截断。`defineFormula` 在返回前检查
最终值与乘区结果是否有限，并冻结结果及 `factorResults`。

## 普通虚曜输入准备

每枚普通虚曜保存一次被异化异常的独立异常效果强度。调用方在异化触发时应保存：

- 来源异常的最终攻击力、已结算通用增伤区结果、异常精通、穿透率、穿透值与来源代理人等级；
- 本次异化触发时已经计算完成的异化区结果；
- 来源异常的属性，用于耀变结算时选择目标对应属性抗性；
- 其他状态层需要的身份与时序信息，但这些信息不进入公式输入。

这些值不是[虚拟代理人快照](../helpers/virtual-agent-snapshot.md)的别名。普通异常伤害可以由多次有效积蓄
加权建立虚拟代理人；虚曜记录的是该次被异化异常的异常效果强度。调用方负责按照已确认的上游规则取得
正确记录，core 公式不在两种模型之间转换。

结算一枚普通虚曜时：

- `baseDamage` 使用保存的最终攻击力与 `damageMultiplier: 1`；耀变招式倍率由独立的
  `luminizeMultiplier` 提供，不能再次把原异常伤害倍率放入基础伤害区；
- `damageBonus`、`anomalyProficiency`、`refringe` 使用该虚曜保存的历史结果；
- `defense` 使用来源代理人等级与保存的穿透率、穿透值，并结合结算时目标实时防御、减防与无视防御；
- `resistance` 按虚曜保存的来源属性使用目标实时抗性与当前适用的抗性降低、无视抗性；
- `luminizeMultiplier` 使用本次招式倍率及耀变时蕾米埃尔的实时异常精通和核心技换算率；
- `anomalyDamageBonus` 使用耀变结算时实际适用的通用异常增伤与耀变专属增伤；
- `damageTaken`、`stunDamage` 及目标侧乘区使用耀变命中结算时的实时状态；
- `anomalyDamageLevel` 使用来源代理人等级。

耀变只记住来源异常的属性，不继承该异常状态专属的增伤、暴击、无视防御或其他效果。物理虚曜不因此
成为强击，耀变公式也不包含 `anomalyCritical` 字段。调用方不能把强击、侵蚀、风化等专属效果自动放入
耀变输入。

## 特殊虚曜

Nanoka 3.1 影画文本确认入场及影画 6 可以产生特殊虚曜。机制说明进一步确认特殊虚曜使用蕾米埃尔
当前攻击力、穿透率、穿透值、异常精通和异化区结果，但其通用增伤区由代理人等级固定提供，每级
`2.5%`，不采用蕾米埃尔受到的普通增伤效果。

配套 helper 按以下规则计算传给 `damageBonus` 的最终倍率：

```text
特殊虚曜增伤区倍率 = 1 + agentLevel × 0.025
```

`agentLevel` 必须是 `[1, 60]` 内的有限整数。等级 `60` 返回 `2.5`，表示 `150%` 增伤与基础倍率 `1`
组合后的最终已结算增伤区。helper 不读取角色对象，不钳制等级，也不调用 `settledDamageBonusFactor`。

特殊虚曜仍使用同一个 `luminizeDamageFormula`：调用方使用蕾米埃尔当前属性建立来源侧字段，用 helper
结果作为 `damageBonus`。影画 6 的四分之一伤害通过耀变倍率区的乘法调整 `0.25` 表达；影画 4 同时适用
时使用 `1.12`。公式不根据虚曜类型自动增加这些值。

## 多虚曜与状态边界

一枚虚曜对应一次独立公式调用。保存三枚虚曜时，调用方按三份独立记录分别调用公式；不能先平均、相加
或合并来源属性后只调用一次。多次结果的触发顺序与汇总属于状态层和调用方。

公式不负责：

- 施加、消耗或统计流明积蓄点；
- 判断异化是否触发及生成虚曜；
- 保存最新三枚虚曜、替换旧虚曜、清空或消费虚曜；
- 判断某招式是否触发耀变、触发几次或采用哪个技能倍率；
- 解析 Nanoka 技能表达式或角色养成等级；
- 选择来源属性、读取目标或判断专属效果适用性；
- 汇总多枚虚曜、写入生命值或计算伤害显示总值。

## 返回结果与取整

`value` 是一枚虚曜对应的、十一个乘区严格相乘后的未取整耀变伤害；`factorResults` 保存本次调用的
十一个乘区结果。返回值不复制来源记录、技能、属性、虚曜或目标信息。

公式不执行显示取整。调用方确认耀变适用通用伤害显示规则后，可把每次耀变实例的 `value` 分别交给
[伤害显示总值帮助函数](../helpers/displayed-damage.md)，不得先把多枚虚曜结果相加再作为一个伤害段。

## 有效性与失败行为

| 失败条件                                              | 行为                                 |
| ----------------------------------------------------- | ------------------------------------ |
| 输入不是非数组对象或为 `null`                         | 抛出 `TypeError`                     |
| 任一必填字段缺失、为 `undefined` 或不符合乘区输入契约 | 传播对应乘区抛出的错误               |
| 任一乘区计算失败                                      | 传播对应乘区抛出的错误               |
| 最终耀变伤害不是有限数值                              | 由 `defineFormula` 抛出 `RangeError` |

多个失败条件同时存在时，不承诺乘区校验错误优先级。

`calculateSpecialVoidflareDamageBonusMultiplier` 的失败行为：

| 失败条件                   | 行为              |
| -------------------------- | ----------------- |
| `agentLevel` 不是 `number` | 抛出 `TypeError`  |
| 等级不是有限整数           | 抛出 `RangeError` |
| 等级小于 `1` 或大于 `60`   | 抛出 `RangeError` |

## 代码组织

耀变伤害公式与特殊虚曜增伤 helper 的生产代码统一放在
`packages/core/src/formulas/luminize-damage.ts`。公式文件只组合现有 `Factor`，不重复乘区算法，也不实现
虚曜队列、流明积蓄、角色状态或技能数据解析。

公式测试放在 `packages/core/test/luminize-damage.test.ts`，必须覆盖公开身份与类型、完整乘区结果、严格
乘法顺序、普通与特殊虚曜代表值、零值不短路、输入不可变、全部字段失败、最终溢出及特殊虚曜 helper
的等级端点和失败行为。安装包验证必须从包根消费全部新增公开 API。

# 基础伤害区

基础伤害区将本次伤害中各项伤害倍率与其对应属性数值相乘后求和，规则来源为
[原始攻略中的基础伤害区](../../../references/zzz-data-introduction.txt#L48)。

## 身份与公开契约

| 项目       | 定义                    |
| ---------- | ----------------------- |
| 中文名称   | 基础伤害区              |
| `factorId` | `base_damage`           |
| 身份常量   | `BASE_DAMAGE_FACTOR_ID` |
| 公开定义   | `baseDamageFactor`      |
| 输入类型   | `BaseDamageFactorInput` |
| 结果语义   | 未取整的基础伤害值      |

公开类型形态如下。该代码块描述公开契约，不限定内部实现方式。

```ts
export interface BaseDamageFactorInput {
  readonly damageMultiplier: number
  readonly finalStat: number
}

export declare const BASE_DAMAGE_FACTOR_ID: "base_damage"

export declare const baseDamageFactor: Factor<BaseDamageFactorInput>
```

由 `Factor<BaseDamageFactorInput>` 的通用契约可得，`baseDamageFactor.calculate` 接收
`readonly BaseDamageFactorInput[]`，返回 `FactorResult`。

每个 `BaseDamageFactorInput` 表示基础伤害区中的一个独立计算项：

- `damageMultiplier` 是该项已经转换为小数的伤害倍率。游戏数据中的 `120%` 以 `1.2` 传入，不额外
  加上基础值 `1`。
- `finalStat` 是该伤害倍率对应且已经计算完成的最终属性，例如最终攻击力或最终贯穿力。该名称使用
  `Stat`，避免与火、电等伤害属性 `Attribute` 混淆。

两个字段都是可直接参与本次计算的最终数值，不包含数值来源、属性种类或其他结算上下文。

## 配套属性计算

基础伤害区提供两个独立的公开帮助函数，按照攻略中的属性公式依次计算初始属性和最终属性。两个函数
不是 `Factor`，也不建立新的乘区。

两个函数适用于[参考文档中所有遵循该公式的属性](../../../references/zzz-data-introduction.txt#L52)，不限于
基础伤害区直接使用的攻击力和贯穿力。

### 公开契约

```ts
export interface CalculateInitialStatParams {
  readonly baseStat: number
  readonly initialStatPercentageAdjustments: readonly number[]
  readonly initialStatFixedValueAdjustments: readonly number[]
}

export interface CalculateFinalStatParams {
  readonly initialStat: number
  readonly finalStatPercentageAdjustments: readonly number[]
  readonly finalStatFixedValueAdjustments: readonly number[]
}

/** 根据基础属性、初始属性百分比调整和初始属性固定值调整计算初始属性。 */
export declare function calculateInitialStat(
  params: CalculateInitialStatParams,
): number

/** 根据初始属性、最终属性百分比调整和最终属性固定值调整计算最终属性。 */
export declare function calculateFinalStat(
  params: CalculateFinalStatParams,
): number
```

- `baseStat` 是计算初始属性使用的基础属性。
- `initialStat` 是计算最终属性使用的初始属性，可以直接采用 `calculateInitialStat` 的结果。
- 百分比调整使用已经转换为小数的有符号数值。`20%` 加成以 `0.2` 传入，`20%` 降低以 `-0.2`
  传入。
- 固定值调整同样使用有符号数值，增加使用正数，降低使用负数。

调整数组只保存参与计算的数值，不保存来源、属性种类、持续时间或触发条件。调用方负责在调用前确定
实际适用的调整。

### 数组语义

- 空调整数组表示对应调整为 `0`。
- 每个成员独立参与求和，内容相同的成员不会合并或去重。
- 成员按数组顺序求和，顺序不表示业务优先级。
- 两个函数不得修改参数对象或其中的数组。

### 计算规则

```text
初始百分比倍率 = 1 + Σ initialStatPercentageAdjustments
初始属性 = baseStat × 初始百分比倍率 + Σ initialStatFixedValueAdjustments

最终百分比倍率 = 1 + Σ finalStatPercentageAdjustments
最终属性 = initialStat × 最终百分比倍率 + Σ finalStatFixedValueAdjustments
```

每个函数依次执行百分比调整求和、加上常量 `1`、乘以来源属性值、固定值调整求和和最终加法。加法、
乘法和顺序归约属于普通连续算术，不承诺逐步检查中间结果。结果不额外取整或截断，公开返回前必须
检查最终结果是否有限。

`baseStat` 和 `initialStat` 必须是非负数，`0` 有效。调整数组成员允许任意有限有符号数值，
不设置未经来源确认的单项上限。百分比倍率和计算结果也必须是非负数；负数属于无效结果并抛出
`RangeError`，不能静默钳制为 `0`。

### 适用边界

两个函数只接收语义已经确定的数值，不接收 Nanoka 实体、角色面板对象、代理人 ID、装备或效果对象。
数据读取、面板字段解释、属性来源汇总和效果适用性判断属于调用方或数据处理层。

攻击力、生命值等属性向贯穿力的转换属于代理人专属规则。每名命破代理人的转换比例可能不同，两个
通用函数不提供固定比例的贯穿力转换，也不决定贯穿力转换与其他效果的计算顺序。

调用方可以先调用 `calculateInitialStat`，再将其结果传给 `calculateFinalStat`，最后将最终属性作为
`BaseDamageFactorInput.finalStat`。`baseDamageFactor` 本身不隐式调用这两个函数。

### 有效性与失败行为

| 失败条件                             | 行为              |
| ------------------------------------ | ----------------- |
| 参数不是非数组对象或为 `null`        | 抛出 `TypeError`  |
| 百分比或固定值调整字段不是数组       | 抛出 `TypeError`  |
| 属性值或调整数组成员不是 `number`    | 抛出 `TypeError`  |
| 属性值或调整数组成员是非有限数值     | 抛出 `RangeError` |
| `baseStat` 或 `initialStat` 小于 `0` | 抛出 `RangeError` |
| 最终计算结果不是有限数值             | 抛出 `RangeError` |
| 百分比倍率或计算结果小于 `0`         | 抛出 `RangeError` |

## 适用边界

`baseDamageFactor` 只执行“伤害倍率乘以对应属性数值后求和”，不负责建立输入：

- 不在乘区内部计算基础属性、初始属性、最终属性、百分比加成或固定值加成。
- 不计算攻击力、生命值等属性向贯穿力的角色专属转换。
- 不根据代理人、技能、伤害类型、目标或触发条件选择伤害倍率及对应属性数值。
- 不接收 `damageType`、`isPenetrating` 或 `isTrueDamage` 等模式字段。

常规伤害可以将最终攻击力作为 `finalStat`；贯穿伤害可以将最终贯穿力作为 `finalStat`。二者使用同一个
基础伤害区。贯穿伤害跳过防御区并改用贯穿增伤区，属于顶层公式
如何组合乘区的规则。

真实伤害不属于当前基础伤害区规范的适用范围。当前不得通过将目标最大生命值作为
`finalStat` 来表达真实伤害；真实伤害及其基础伤害计算在后续独立设计。

## 数组语义

- 空数组表示没有基础伤害项，结果为 `0`。
- 每个数组成员分别计算一项“伤害倍率 × 对应属性数值”，不同成员可以使用相同或不同的对应属性
  数值。
- 内容相同的成员不会合并或去重，重复成员分别产生贡献。
- 输入按数组顺序计算并累加，顺序不表示业务优先级。
- 计算不得修改输入数组或其中的成员。

## 计算规则

```text
单项基础伤害 = input.damageMultiplier × input.finalStat
基础伤害区结果 = Σ 单项基础伤害
```

每个输入项先独立相乘，再将乘积按数组顺序累加。不能先分别汇总所有伤害倍率和所有属性数值后相乘，
也不能假定所有输入项共享同一个属性数值。

`damageMultiplier` 和 `finalStat` 都是非负数，`0` 是有效值。负数不能表示基础伤害区中的伤害
倍率或对应属性数值，必须作为无效输入处理，不能钳制为 `0`。攻略没有给出二者的有效上限，因此除
有限数值要求外不增加上限。

基础伤害区结果不增加常量、不钳制、不取整或截断。其有效结果是有限非负数。攻略所述伤害显示向上
取整发生在单段伤害完成全部乘区计算之后，不属于基础伤害区。多段伤害的逐段取整与显示汇总也由后续
公式能力负责。

## 有效性与失败行为

| 失败条件                                        | 行为              |
| ----------------------------------------------- | ----------------- |
| 输入项不是非数组对象或为 `null`                 | 抛出 `TypeError`  |
| `damageMultiplier` 或 `finalStat` 不是 `number` | 抛出 `TypeError`  |
| 任一字段是 `NaN`、`Infinity` 或 `-Infinity`     | 抛出 `RangeError` |
| `damageMultiplier` 或 `finalStat` 小于 `0`      | 抛出 `RangeError` |
| 基础伤害区最终结果不是有限数值                  | 抛出 `RangeError` |

每个输入项必须先完成字段校验，再参与计算。乘法和累加属于普通连续算术，不承诺逐步检查中间结果；
公开返回前由 `Factor` 公共契约检查最终结果是否有限。

## 代码组织

基础伤害区的生产代码统一放在 `packages/core/src/factors/base-damage.ts`。该文件包含身份常量、输入类型、
`Factor` 定义及仅供基础伤害区使用的校验和计算逻辑。私有辅助函数不对外导出。

两个属性计算函数及其参数类型统一放在 `packages/core/src/stat.ts`，不得依赖具体乘区或数据包。

`packages/core/src/index.ts` 只负责重新导出公开 API，测试保存在独立测试文件中。基础伤害区与属性计算
分别使用 `packages/core/test/base-damage.test.ts` 和 `packages/core/test/stat.test.ts`。只有某项私有逻辑
出现第二个语义相同的实际使用者时，才提取为公共实现。

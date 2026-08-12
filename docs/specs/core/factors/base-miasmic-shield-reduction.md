# 基础秽盾削减值

基础秽盾削减值是一次代理人攻击削减秽盾时采用的技能或动作基础数值，规则来源为
[原始攻略中的秽盾削减值说明](../../../references/zzz-data-introduction.txt#L373-L384)。攻略没有把它称为
“乘区”，但它是秽盾削减值公式中独立参与乘法的计算项，因此由统一的 `Factor` 模型承载。

公开标识采用[秽盾相关术语](../index.md#秽盾相关术语)中定义的 `BaseMiasmicShieldReduction`。

## 身份与公开契约

| 项目       | 定义                                      |
| ---------- | ----------------------------------------- |
| 中文名称   | 基础秽盾削减值                            |
| `factorId` | `base_miasmic_shield_reduction`           |
| 身份常量   | `BASE_MIASMIC_SHIELD_REDUCTION_FACTOR_ID` |
| 公开定义   | `baseMiasmicShieldReductionFactor`        |
| 输入类型   | `BaseMiasmicShieldReductionFactorInput`   |
| 结果语义   | 本次计算采用的非负基础秽盾削减值          |

公开类型形态如下。该代码块描述公开契约，不限定内部实现方式。

```ts
export type BaseMiasmicShieldReductionFactorInput = number

export declare const BASE_MIASMIC_SHIELD_REDUCTION_FACTOR_ID: "base_miasmic_shield_reduction"

export declare const baseMiasmicShieldReductionFactor: Factor<BaseMiasmicShieldReductionFactorInput>
```

由 `Factor<BaseMiasmicShieldReductionFactorInput>` 的公共契约可得，
`baseMiasmicShieldReductionFactor.calculate` 接收 `BaseMiasmicShieldReductionFactorInput`，返回
`FactorResult`。

`BaseMiasmicShieldReductionFactorInput` 直接表示调用方已经为一次秽盾削减事件选定的基础值，单位与
秽盾条数值一致。主公式只直接使用这一个数值，因此不增加只有同名字段的对象包装，也不使用数组。
攻略中的公式没有对基础秽盾削减值求和；不同攻击或采用不同计算快照的削减事件应分别计算。

## 默认输入

基础秽盾削减值产生的是秽盾削减数值，不是倍率，没有乘法恒等输入，因此不公开
`DEFAULT_BASE_MIASMIC_SHIELD_REDUCTION_FACTOR_INPUT`。调用方必须提供本次计算采用的实际基础值；显式
传入 `0` 时结果为 `0`，这只是合法的零削减值，不是公式组合中的恒等倍率，也不表示邦布攻击的默认
输入。

## 计算规则

```text
基础秽盾削减值结果 = input
```

本计算不增加常量，不执行求和、钳制、取整或截断。输入和结果必须是非负有限数，`0` 有效。攻略没有
给出基础秽盾削减值的有效上限，因此不增加未经来源确认的上限。

## 输入准备

调用方必须在调用前取得一次已经确认语义的基础秽盾削减值：

- 技能或动作的基础值由对应数据或规则查表取得，不能从伤害倍率、失衡倍率、异常积蓄值或其他技能参数
  推导；
- 轻招架、重招架和连续招架的常规数值及角色例外属于版本化动作数据，调用方必须先选择本次事件实际
  采用的最终值；
- 终结技的基础秽盾削减值必须已经包含其适用的基础值补正。本乘区不接收终结技标志，也不自动追加
  攻略举例的 `500`；
- 同一技能是否完整发动、一次动作产生几次独立削减、各攻击段如何归属，以及各事件采用的计算快照，
  均在建立输入前确定。

攻略确认绝大多数代理人技能的基础秽盾削减值彼此独立且一般只能查表，现有来源没有提供可以从更早
参数稳定推导这些数值的通用算法。因此本乘区不公开基础秽盾削减值 helper，也不把招架表、角色例外或
终结技补正固化为 core 计算常量。

## 适用边界

基础秽盾削减值只校验并返回已经准备好的基础数值，不负责：

- 从 Nanoka 实体、游戏文本、代理人、技能或攻击段数据中读取基础值；
- 判断攻击是否命中、目标是否具有秽盾，或本次技能和效果是否能够削减秽盾；
- 根据代理人身份、技能类型、闪避反击、招架支援或终结技自动选择基础值；
- 允许邦布攻击削减秽盾，或把 `0` 解释为邦布攻击的业务默认值；
- 计算秽盾削减效率区、秽盾被削减效率区、秽盾抗性或敌人属性弱点；
- 读取或修改当前秽盾，处理秽盾上限、自然衰减、剩余量钳制、破盾、秽盾净除或秽浊流界状态；
- 保存技能、动作、代理人、敌人或数据来源信息。

## 有效性与失败行为

| 失败条件                                | 行为              |
| --------------------------------------- | ----------------- |
| 输入不是 `number`                       | 抛出 `TypeError`  |
| 输入是 `NaN`、`Infinity` 或 `-Infinity` | 抛出 `RangeError` |
| 输入小于 `0`                            | 抛出 `RangeError` |

## 代码组织

基础秽盾削减值的生产代码统一放在
`packages/core/src/factors/base-miasmic-shield-reduction.ts`。该文件包含身份常量、输入类型、`Factor`
定义及基础秽盾削减值独有的校验和计算逻辑，不包含技能或动作查表、角色判断和秽盾状态逻辑。

`packages/core/src/index.ts` 只负责重新导出公开 API，测试保存在
`packages/core/test/base-miasmic-shield-reduction.test.ts`。

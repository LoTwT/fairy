# 基础喧响值回复

基础喧响值回复是一次喧响值回复计算采用的技能、动作或效果基础数值，规则来源为
[原始攻略中的喧响值回复说明](../../../references/zzz-data-introduction.txt#L339-L355)。攻略没有把它称为
“乘区”，但它是喧响值回复公式中独立参与乘法的计算项，因此由统一的 `Factor` 模型承载。

公开标识采用[喧响相关术语](../index.md#喧响相关术语)中定义的 `BaseDecibelGeneration`。

## 身份与公开契约

| 项目       | 定义                                |
| ---------- | ----------------------------------- |
| 中文名称   | 基础喧响值回复                      |
| `factorId` | `base_decibel_generation`           |
| 身份常量   | `BASE_DECIBEL_GENERATION_FACTOR_ID` |
| 公开定义   | `baseDecibelGenerationFactor`       |
| 输入类型   | `BaseDecibelGenerationFactorInput`  |
| 结果语义   | 本次计算采用的非负基础喧响值回复    |

公开类型形态如下。该代码块描述公开契约，不限定内部实现方式。

```ts
export type BaseDecibelGenerationFactorInput = number

export declare const BASE_DECIBEL_GENERATION_FACTOR_ID: "base_decibel_generation"

export declare const baseDecibelGenerationFactor: Factor<BaseDecibelGenerationFactorInput>
```

由 `Factor<BaseDecibelGenerationFactorInput>` 的公共契约可得，
`baseDecibelGenerationFactor.calculate` 接收 `BaseDecibelGenerationFactorInput`，返回
`FactorResult`。

`BaseDecibelGenerationFactorInput` 直接表示调用方已经为一次回复事件选定的基础喧响值，单位为喧响值
点数。主公式只直接使用这一个数值，因此不增加只有同名字段的对象包装，也不使用数组。攻略中的公式
没有对基础喧响值回复求和；多个技能、动作或效果事件应分别计算。

## 默认输入

基础喧响值回复产生的是喧响值点数，不是倍率，没有乘法恒等输入，因此不公开
`DEFAULT_BASE_DECIBEL_GENERATION_FACTOR_INPUT`。调用方必须提供本次计算采用的实际基础值；显式传入
`0` 时结果为 `0`，这只是合法零回复，不是公式组合中的恒等倍率。

## 计算规则

```text
基础喧响值回复结果 = input
```

本计算不增加常量，不执行求和、钳制、取整或截断。输入和结果必须是非负有限数，`0` 有效。攻略没有
给出基础喧响值回复的有效上限，因此不增加未经来源确认的上限。

## 输入准备

调用方必须在调用前取得一次已经确认语义的基础喧响值回复：

- 技能回复值由对应技能或攻击段数据查表取得，不能从伤害倍率、失衡倍率或其他技能参数推导；
- 破招、连携、极限闪避、支援攻击、部位破坏、失衡和属性异常等特殊动作的基础值由对应动作规则查表；
- 影画、音擎、活动及其他特殊效果直接提供固定喧响值时，调用方先判断效果是否触发，再把已换算为
  喧响值点数的数值传入；
- 同一技能是否完整发动、一次事件触发几次回复、目标类别及事件去重均在建立输入前确定。

攻略列出的技能数值和特殊动作表属于数据事实，不固化为 core 常量。本乘区也不判断该事件是否采用
喧响获得效率，或是否允许其他代理人伴随获得喧响值；这些规则由后续公式的调用方在组合乘区前处理。

## 资源状态边界

1.4 版本后的每名代理人拥有独立喧响槽。基础喧响值回复只计算一次事件在应用后续倍率前的数值，不
接收代理人身份、触发者、接收者、前后台状态、当前喧响值或喧响值上限。

本乘区不负责：

- 把结果写入任一代理人的喧响槽，或处理上限、溢出和消耗；
- 计算喧响等级以及 `1000`、`2000`、`3000` 等状态阈值；
- 执行当前喧响值的显示取整；攻略只确认显示会取整，没有给出本乘区的结算取整规则；
- 判断喧响获得效率、伴随获得效率、特殊效果伴随资格或持续时间；
- 保存技能、动作、效果、代理人或数据来源信息。

## 有效性与失败行为

| 失败条件                                | 行为              |
| --------------------------------------- | ----------------- |
| 输入不是 `number`                       | 抛出 `TypeError`  |
| 输入是 `NaN`、`Infinity` 或 `-Infinity` | 抛出 `RangeError` |
| 输入小于 `0`                            | 抛出 `RangeError` |

## 代码组织

基础喧响值回复的生产代码统一放在
`packages/core/src/factors/base-decibel-generation.ts`。该文件包含身份常量、输入类型、`Factor` 定义及
基础喧响值回复独有的校验和计算逻辑，不包含技能或动作查表、事件判断和资源槽逻辑。

`packages/core/src/index.ts` 只负责重新导出公开 API，测试保存在
`packages/core/test/base-decibel-generation.test.ts`。

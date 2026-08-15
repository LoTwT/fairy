# 基础异常积蓄值

基础异常积蓄值是一次异常积蓄计算采用的技能基础数值，规则来源为
[原始攻略中的异常积蓄值说明](../../../references/zzz-data-introduction.txt#L224-L225)。攻略没有把它称为
“乘区”，但它是异常积蓄值公式中独立参与乘法的计算项，因此由统一的 `Factor` 模型承载。

## 身份与公开契约

| 项目       | 定义                             |
| ---------- | -------------------------------- |
| 中文名称   | 基础异常积蓄值                   |
| `factorId` | `base_anomaly_buildup`           |
| 身份常量   | `BASE_ANOMALY_BUILDUP_FACTOR_ID` |
| 公开定义   | `baseAnomalyBuildupFactor`       |
| 输入类型   | `BaseAnomalyBuildupFactorInput`  |
| 结果语义   | 本次计算采用的非负基础异常积蓄值 |

公开类型形态如下。该代码块描述公开契约，不限定内部实现方式。

```ts
export type BaseAnomalyBuildupFactorInput = number

export declare const BASE_ANOMALY_BUILDUP_FACTOR_ID: "base_anomaly_buildup"

export declare const baseAnomalyBuildupFactor: Factor<BaseAnomalyBuildupFactorInput>
```

由 `Factor<BaseAnomalyBuildupFactorInput>` 的通用契约可得，`baseAnomalyBuildupFactor.calculate` 接收
`BaseAnomalyBuildupFactorInput`，返回 `FactorResult`。

`BaseAnomalyBuildupFactorInput` 直接表示调用方已经选定的基础异常积蓄值。主公式只直接使用这一个
数值，因此不增加只有同名字段的对象包装，也不使用数组。攻略中的公式没有对基础异常积蓄值求和；
多次攻击或使用不同计算快照时，应分别计算。

## 默认输入

基础异常积蓄值没有恒等倍率语义，不公开 `DEFAULT_BASE_ANOMALY_BUILDUP_FACTOR_INPUT`。调用方必须提供
本次计算采用的实际基础异常积蓄值；显式传入 `0` 时结果为 `0`。

## 计算规则

```text
基础异常积蓄值结果 = input
```

本计算不增加常量，不执行求和、钳制、取整或截断。输入和结果必须是非负有限数，`0` 有效。攻略没有
给出基础异常积蓄值的有效上限，因此不增加上限。

## 命名依据

游戏英文文本已经确认 `Anomaly Buildup`，但没有发现“基础异常积蓄值”的完整固定英文术语。
`BaseAnomalyBuildup` 是依据攻略中文语义建立的公开标识。

## 适用边界

基础异常积蓄值通常来自技能数据查表，不能从伤害倍率、失衡倍率、代理人等级或其他属性推导。本乘区
只接收已经确定语义的数值，不负责：

- 读取 Nanoka 实体、代理人、邦布、技能或攻击段数据；
- 根据攻击属性、代理人属性或目标状态判断本次攻击能否造成异常积蓄；
- 选择技能对应的基础异常积蓄值，或汇总多次攻击；
- 计算异常掌控、异常积蓄效率、异常积蓄抗性、距离衰减或异常触发阈值。

攻略确认代理人和邦布技能的异常积蓄值不随等级成长。本乘区不接收等级字段，也不为任何来源增加
等级修正。邦布造成的异常积蓄可以使用本乘区计算；异常触发后哪些积蓄进入
[虚拟代理人快照](../helpers/virtual-agent-snapshot.md)，由快照规范的有效积蓄边界统一维护。

## 有效性与失败行为

| 失败条件                                | 行为              |
| --------------------------------------- | ----------------- |
| 输入不是 `number`                       | 抛出 `TypeError`  |
| 输入是 `NaN`、`Infinity` 或 `-Infinity` | 抛出 `RangeError` |
| 输入小于 `0`                            | 抛出 `RangeError` |

## 代码组织

基础异常积蓄值的生产代码统一放在
`packages/core/src/factors/base-anomaly-buildup.ts`。该文件包含身份常量、输入类型、`Factor` 定义及基础
异常积蓄值独有的校验和计算逻辑。

`packages/core/src/index.ts` 只负责重新导出公开 API，测试保存在
`packages/core/test/base-anomaly-buildup.test.ts`。

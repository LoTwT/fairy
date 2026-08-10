# 能量回复基础区

能量回复基础区计算应用能量获得效率前的能量回复量，规则来源为
[原始攻略中的能量回复公式](../../../references/zzz-data-introduction.txt#L300-L304)：

```text
能量回复基础区
= Σ 基础能量回复值
  + 最终能量自动回复 × 有效回复时间
```

“能量回复基础区”是 core 对原公式括号整体建立的计算名称，不是游戏文本提供的固定乘区术语。公开
标识采用 `BaseEnergyGeneration`，其中 `Energy Generation` 遵循
[能量相关术语](../index.md#能量相关术语)，`Base` 表示尚未应用能量获得效率的公式基础量。

## 身份与公开契约

| 项目       | 定义                               |
| ---------- | ---------------------------------- |
| 中文名称   | 能量回复基础区                     |
| `factorId` | `base_energy_generation`           |
| 身份常量   | `BASE_ENERGY_GENERATION_FACTOR_ID` |
| 公开定义   | `baseEnergyGenerationFactor`       |
| 输入类型   | `BaseEnergyGenerationFactorInput`  |
| 结果语义   | 尚未应用能量获得效率的能量回复值   |

公开类型形态如下。该代码块描述公开契约，不限定内部实现方式。

```ts
export interface BaseEnergyGenerationFactorInput {
  readonly baseEnergyGenerationValues: readonly number[]
  readonly finalEnergyRegen: number
  readonly effectiveEnergyRegenDurationInSeconds: number
}

export declare const BASE_ENERGY_GENERATION_FACTOR_ID: "base_energy_generation"

export declare const baseEnergyGenerationFactor: Factor<BaseEnergyGenerationFactorInput>
```

由 `Factor<BaseEnergyGenerationFactorInput>` 的公共契约可得，`baseEnergyGenerationFactor.calculate`
接收 `BaseEnergyGenerationFactorInput`，返回 `FactorResult`。

## 输入语义

`BaseEnergyGenerationFactorInput` 是一次能量回复基础区计算的完整输入：

- `baseEnergyGenerationValues` 保存原公式中参与求和的各项“基础能量回复值”。每项都是已经查表、
  换算并确认适用本次计算的一次性回复量，单位为能量点数。
- `finalEnergyRegen` 是本次计算采用的最终能量自动回复，单位为能量点数每秒。它必须已经完成基础、
  初始和最终属性计算。
- `effectiveEnergyRegenDurationInSeconds` 是 `finalEnergyRegen` 在本次计算中实际生效的时间，单位为秒。
  它只包含调用方已经确认满足能量自动回复条件的时间，不是任意经过的墙钟时间。

三个字段只保存可直接参与计算的最终数值，不记录技能、效果、角色、接战状态或数据来源。

### 与 `Base Energy Regen` 的区别

Nanoka 3.1 的游戏属性 `Base Energy Regen` 对应“基础能量自动回复”，是计算最终 `Energy Regen` 的
基础属性；`baseEnergyGenerationValues` 对应攻略中攻击或其他一次性机制提供的“基础能量回复值”。
二者量纲和用途不同，不能互相替代：

- `Base Energy Regen` 的单位是每秒回复量，经过属性计算后成为 `finalEnergyRegen`；
- `baseEnergyGenerationValues` 的成员是一次性回复的能量点数，直接参与数组求和。

Nanoka 原始数据中的 `sp_recovery` 等内部字段不属于公开游戏术语。其解释和归一化发生在数据清洗
层，不进入 core 输入命名。

## 配套属性计算

能量自动回复属于[通用属性计算适用范围](base-damage.md#配套属性计算)。调用方可以依次使用
`calculateInitialStat` 和 `calculateFinalStat` 计算最终能量自动回复，再将结果作为
`finalEnergyRegen` 传入。

本乘区不重复实现能量自动回复专用属性 helper，也不隐式调用通用属性 helper。基础属性、初始属性、
最终属性及各项调整的精确算法和失败行为由基础伤害区中的配套属性计算规范统一维护。

## 默认输入

能量回复基础区产生的是能量点数，不是倍率，没有乘法恒等输入，因此不公开
`DEFAULT_BASE_ENERGY_GENERATION_FACTOR_INPUT`。

调用方必须提供完整输入。显式传入空 `baseEnergyGenerationValues`、`finalEnergyRegen: 0` 和
`effectiveEnergyRegenDurationInSeconds: 0` 时结果为 `0`；这只是合法零回复，不是公式组合中的恒等
倍率。

## 数组语义

- 空 `baseEnergyGenerationValues` 表示本次计算没有一次性能量回复，数组求和结果为 `0`。
- 每个成员表示一项独立的一次性回复量；内容相同的成员不会合并或去重。
- 成员按数组顺序求和，顺序不表示业务优先级。
- 计算不得修改输入对象或数组。

## 计算规则

```text
一次性回复量 = Σ baseEnergyGenerationValues
自动回复量 = finalEnergyRegen × effectiveEnergyRegenDurationInSeconds
能量回复基础区结果 = 一次性回复量 + 自动回复量
```

实现必须先按数组顺序求和，再计算自动回复量，最后执行两者的加法。普通加法、乘法和顺序归约不建立
额外的中间校验边界；公开返回前由 `Factor` 公共契约检查最终结果是否有限。

结果不执行钳制、取整、截断或固定小数位格式化。攻略没有提供能量回复的离散帧结算或显示取整规则，
因此使用 JavaScript `number` 的 IEEE 754 语义返回未取整数值。

## 输入值域

- `baseEnergyGenerationValues` 的每个成员必须是非负有限数，`0` 有效。
- `finalEnergyRegen` 必须是非负有限数，`0` 有效。
- `effectiveEnergyRegenDurationInSeconds` 必须是非负有限数，允许小数秒，`0` 有效。
- 攻略没有给出这些输入的有效上限，因此不增加未经来源确认的上限。
- 负数不能表示能量回复或有效时间。能量消耗属于独立资源变化，不能以负回复量传入本乘区。

## 适用边界

调用方必须在调用前完成以下输入准备：

- 从技能表或已确认规则取得攻击及其他一次性回复的基础值；这些值不能从伤害倍率、失衡倍率或其他
  技能参数推导；
- 判断短接战、长接战及其他规则下能量自动回复实际生效的时间；
- 将一次性回复和最终能量自动回复统一换算为契约规定的能量点数及每秒点数。

命中事件去重、与能量获得效率共享结算快照、区间拆分及效率适用性由
[能量回复值公式](../formulas/energy-generation.md#输入准备与结算快照)统一维护，不属于本乘区的直接输入
语义。

本乘区不读取当前能量或能量上限，不限制可写入的实际回复量，也不处理能量溢出、能量消耗、技能
发动条件、资源槽写入、触发冷却或来源分析。

闪能在游戏文本中是独立的 `Adrenaline` 资源。即使其攻略公式与能量回复同构，也不得把闪能数值传入
本乘区；闪能需要独立的公开乘区和公式身份。

## 有效性与失败行为

| 失败条件                                                  | 行为                                |
| --------------------------------------------------------- | ----------------------------------- |
| 输入不是非数组对象或为 `null`                             | 抛出 `TypeError`                    |
| `baseEnergyGenerationValues` 不是数组                     | 抛出 `TypeError`                    |
| 任一数值字段或数组成员不是 `number`                       | 抛出 `TypeError`                    |
| 任一数值字段或数组成员是 `NaN`、`Infinity` 或 `-Infinity` | 抛出 `RangeError`                   |
| 任一数值字段或数组成员小于 `0`                            | 抛出 `RangeError`                   |
| 能量回复基础区最终结果不是有限数值                        | 由 `defineFactor` 抛出 `RangeError` |

## 代码组织

能量回复基础区的生产代码统一放在 `packages/core/src/factors/base-energy-generation.ts`。该文件包含身份
常量、输入类型、`Factor` 定义及本乘区独有的输入校验和计算逻辑，不包含接战状态、查表或资源槽逻辑。

`packages/core/src/index.ts` 只负责重新导出公开 API，测试保存在
`packages/core/test/base-energy-generation.test.ts`。

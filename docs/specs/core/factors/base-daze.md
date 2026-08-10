# 基础失衡区

基础失衡区将本次失衡值计算中的冲击力与对应失衡倍率相乘后求和，规则来源为
[原始攻略中的基础失衡区](../../../references/zzz-data-introduction.txt#L160-L162)。本规范中的 `Impact`、
`Daze` 和 `Daze Multiplier` 遵循[失衡相关术语](../index.md#失衡相关术语)。

## 身份与公开契约

| 项目       | 定义                  |
| ---------- | --------------------- |
| 中文名称   | 基础失衡区            |
| `factorId` | `base_daze`           |
| 身份常量   | `BASE_DAZE_FACTOR_ID` |
| 公开定义   | `baseDazeFactor`      |
| 输入类型   | `BaseDazeFactorInput` |
| 结果语义   | 未取整的基础失衡值    |

公开类型形态如下。该代码块描述公开契约，不限定内部实现方式。

```ts
export interface BaseDazeFactorInputItem {
  readonly finalImpact: number
  readonly dazeMultiplier: number
}

export type BaseDazeFactorInput = readonly BaseDazeFactorInputItem[]

export declare const BASE_DAZE_FACTOR_ID: "base_daze"

export declare const baseDazeFactor: Factor<BaseDazeFactorInput>
```

由 `Factor<BaseDazeFactorInput>` 的通用契约可得，`baseDazeFactor.calculate` 接收
`BaseDazeFactorInput`，返回 `FactorResult`。

`BaseDazeFactorInput` 是一次基础失衡区计算的完整输入，每个 `BaseDazeFactorInputItem` 表示同一次
原子失衡值计算中的一个代数项：

- `finalImpact` 是该项已经完成属性计算、但尚未应用失衡值计算有效范围的最终冲击力。调用方需要从
  基础属性和调整计算最终冲击力时，可以使用
  [基础伤害区规范定义的通用属性 helper](base-damage.md#配套属性计算)。
- `dazeMultiplier` 是该项对应的失衡倍率。游戏文本中的 `120%` 以 `1.2` 传入，不额外加上基础值
  `1`。

两个字段都是已经完成数据解释和适用性判断、可以直接参与计算的数值，不包含来源身份、属性类型、
技能标签或其他结算上下文。

## 默认输入

基础失衡区没有恒等倍率语义，不公开 `DEFAULT_BASE_DAZE_FACTOR_INPUT`。调用方必须提供本次计算的实际
基础失衡输入；显式传入空数组时结果为 `0`。

## 数组语义

“原子失衡值计算”是外部状态层只写入一次失衡值的最小计算事件。该事件内部不会在数组项之间更新
失衡条、转换失衡状态或重新判断触发失衡状态的资格。

- 空数组表示没有基础失衡项，结果为 `0`。
- 每个成员分别计算一项“有效冲击力 × 失衡倍率”，内容相同的成员不会合并或去重。
- 输入项按数组顺序计算并累加，顺序不表示业务优先级。
- 同一次顶层公式调用中的全部输入项必须属于同一次原子失衡值计算，并共享其他乘区快照。数组只用于
  表示该次计算中的多个代数项，不能合并连续攻击段、命中段或其他独立累积事件。
- 不同原子失衡值计算必须分别调用顶层公式。即使后续乘区快照相同，只要两项之间可能改变失衡条、
  失衡状态或触发失衡状态的资格，就不能放入同一个数组。
- 计算不得修改输入数组或其中的成员。

## 计算规则

```text
有效冲击力 = clamp(input.finalImpact, 0, 1000)
单项基础失衡值 = 有效冲击力 × input.dazeMultiplier
基础失衡区结果 = Σ 单项基础失衡值
```

攻略确认失衡值计算采用的冲击力有效范围为 `[0, 1000]`。输入必须先通过类型、有限性和非负校验，
再将大于 `1000` 的冲击力按 `1000` 参与计算。不能让 `NaN`、`Infinity` 或 `-Infinity` 被钳制为有限值。

每个输入项先独立相乘，再把乘积按数组顺序累加。不能先分别汇总冲击力和失衡倍率后相乘。计算结果
不执行取整或截断。

## 输入值域

- `finalImpact` 必须是非负有限数，`0` 有效；不设置输入上限，计算时应用已确认的有效上限 `1000`。
- `dazeMultiplier` 必须是非负有限数，`0` 有效。攻略没有给出失衡倍率上限，因此不增加上限。
- 基础失衡区结果必须是有限非负数。

## 适用边界

基础失衡区只执行基础失衡值的乘算与求和，不负责：

- 从 Nanoka 实体、游戏文本、角色面板、技能或具体机制中读取冲击力和失衡倍率；
- 汇总冲击力的基础值、百分比调整或固定值调整；
- 判断失衡值来源、技能、属性类型、目标或触发条件是否适用；
- 计算失衡抗性、造成或受到的失衡值调整、距离衰减、失衡值上限或失衡比例；
- 向失衡条累积失衡值、处理直接失衡值、判断目标是否进入失衡状态或计算失衡持续时间。

Nanoka 技能参数中的内部字段名不属于本契约。调用方或数据清洗层必须先把原始字段解释为游戏文本
所称的 `Daze Multiplier`，再传入 `dazeMultiplier`。

## 有效性与失败行为

| 失败条件                                        | 行为              |
| ----------------------------------------------- | ----------------- |
| 输入不是数组                                    | 抛出 `TypeError`  |
| 输入项不是非数组对象或为 `null`                 | 抛出 `TypeError`  |
| `finalImpact` 或 `dazeMultiplier` 不是 `number` | 抛出 `TypeError`  |
| 任一字段是 `NaN`、`Infinity` 或 `-Infinity`     | 抛出 `RangeError` |
| `finalImpact` 或 `dazeMultiplier` 小于 `0`      | 抛出 `RangeError` |
| 基础失衡区最终结果不是有限数值                  | 抛出 `RangeError` |

每个输入项必须先完成字段校验，再参与钳制和计算。公开返回前由 `Factor` 公共契约检查最终结果是否有限。

## 代码组织

基础失衡区的生产代码统一放在 `packages/core/src/factors/base-daze.ts`。该文件包含身份常量、输入类型、
`Factor` 定义、冲击力范围常量及基础失衡区独有的校验、钳制、乘算和求和逻辑。范围常量和私有辅助函数
不对外导出。

`packages/core/src/index.ts` 只负责重新导出公开 API，测试保存在
`packages/core/test/base-daze.test.ts`。

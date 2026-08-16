# 异化区

异化区表示 `Refringe` 对一次属性异常伤害整体施加的独立倍率。Nanoka 3.1 本地数据
`packages/data/raw/nanoka/3.1/{en,zh}/character/1581.json:1952` 确认 `Refringe`、`Refringe Coefficient`
分别对应“异化”“异化系数”，并给出异化系数等于蕾米埃尔异常精通的 `0.02%`、三名异常角色时
额外提升 `10%` 的规则。影画 2 在同文件 `:2082` 额外提升异化系数 `20%`。

异化是异常伤害整体的新独立倍率；被异化的异常状态会保存该倍率，之后基于该状态产生的异放、乱流和
紊乱也继续采用同一异化结果。该结算边界及加算关系由
[3.1 蕾米埃尔机制说明](https://zzz.gachabase.net/guides/1/covenant-of-dayat-remielle-dan-guide)和
[蕾米埃尔详细机制攻略](https://a.4399.cn/gl/53681368_359313.html)交叉确认。

## 身份与公开契约

| 项目       | 定义                                |
| ---------- | ----------------------------------- |
| 中文名称   | 异化区                              |
| `factorId` | `refringe`                          |
| 身份常量   | `REFRINGE_FACTOR_ID`                |
| 公开定义   | `refringeFactor`                    |
| 输入类型   | `RefringeFactorInput`               |
| 配套参数   | `CalculateRefringeMultiplierParams` |
| 配套函数   | `calculateRefringeMultiplier`       |
| 结果语义   | `Multiplier`                        |

公开类型形态如下。该代码块描述公开契约，不限定内部实现方式。

```ts
export interface CalculateRefringeMultiplierParams {
  readonly remielleAnomalyProficiency: number
  readonly refringeCoefficientIncreases: readonly number[]
}

export type RefringeFactorInput = number

export declare const REFRINGE_FACTOR_ID: "refringe"

export declare const DEFAULT_REFRINGE_FACTOR_INPUT: RefringeFactorInput

export declare function calculateRefringeMultiplier(
  params: CalculateRefringeMultiplierParams,
): number

export declare const refringeFactor: Factor<RefringeFactorInput>
```

`CalculateRefringeMultiplierParams` 用于在异化触发时计算应保存的最终倍率；`RefringeFactorInput` 则直接
接收已经计算并保存的倍率。分开两个阶段可以防止异常伤害、乱流、异放或紊乱在稍后结算时使用蕾米埃尔
已经变化的实时异常精通重新计算异化。

## 配套计算输入

- `remielleAnomalyProficiency` 是本次异化触发时蕾米埃尔的非负有限异常精通；
- `refringeCoefficientIncreases` 是直接加到异化系数上的非负小数贡献数组，游戏文本中的 `10%` 与
  `20%` 分别以 `0.1` 与 `0.2` 传入；
- 空贡献数组合法，表示本次只有异常精通换算得到的异化系数；
- 数组成员按索引顺序求和，内容相同的成员不合并或去重；稀疏数组空位按 `undefined` 成员处理并失败；
- helper 不接收队伍、影画、角色身份或效果标签，调用方负责只传入本次实际适用的贡献。

异化系数提升不是包含基础倍率 `1` 的最终倍率。调用方不能把 `1.1` 当作 `10%` 贡献传入，也不能把
已经完成异化计算的最终倍率再次放进贡献数组。

## 配套计算规则

```text
异常精通异化系数 = remielleAnomalyProficiency × 0.0002
最终异化系数 = 异常精通异化系数 + Σ refringeCoefficientIncreases
异化区倍率 = 1 + 最终异化系数
```

常量 `0.0002` 精确表示每 `1` 点异常精通提供 `0.02%` 异化系数。比如异常精通为 `400`，三名异常
角色与影画 2 均适用时：

```text
1 + ((400 × 0.0002 + 0.1) + 0.2) = 1.38
```

helper 使用 JavaScript `number` 的 IEEE 754 语义，严格按“异常精通换算、按索引顺序加入贡献、最后加
基础倍率 `1`”的顺序计算，不重排、不取整、不钳制，也不设置异化系数上限。最终结果必须是有限数值。

## 乘区输入与默认输入

`RefringeFactorInput` 直接表示已经计算并保存的最终异化区倍率。输入 `1.38` 时，
`refringeFactor.calculate` 原样返回 `1.38`；本乘区不再次加 `1`，也不重新读取异常精通或贡献数组。

`DEFAULT_REFRINGE_FACTOR_INPUT` 遵循[公共默认输入规则](../index.md#乘区默认输入)，精确值为：

```ts
1
```

数值是不可变原始值，不需要运行时冻结。它只表示本次异常伤害没有适用异化，不能替代已经触发但尚未
建立或丢失的异化快照。

合法乘区输入必须是大于等于 `1` 的有限数。当前来源只确认异化系数的非负提升，没有确认降低或负异化
倍率，因此小于 `1` 的输入必须失败。输入不设置未经来源确认的上限，但最终必须有限。

## 快照与公式边界

异化区不是[虚拟代理人快照](../helpers/virtual-agent-snapshot.md)的加权字段。虚拟代理人保存参与异常积蓄的
代理人历史属性；异化倍率由异化触发时蕾米埃尔的异常精通与适用贡献单独计算。调用方应把两者作为同一
异常状态的不同历史结果一起保存。

[异常伤害公式](../formulas/anomaly-damage.md)使用 `refringe` 字段接收保存结果。普通异常、异放、乱流与
紊乱如果基于同一被异化异常状态结算，应复用该状态保存的相同倍率。没有触发异化时显式传默认输入。

本乘区与 helper 不负责：

- 判断流明积蓄点是否存在、是否消耗或异化是否触发；
- 读取蕾米埃尔面板、队伍角色数量或影画状态；
- 建立、更新、清除异常状态或虚曜；
- 计算异常伤害、异放、乱流、紊乱或耀变的其他乘区；
- 决定一个特殊异常机制是否继承异化。

## 有效性与失败行为

`calculateRefringeMultiplier`：

| 失败条件                                         | 行为              |
| ------------------------------------------------ | ----------------- |
| 参数不是非数组对象或为 `null`                    | 抛出 `TypeError`  |
| `remielleAnomalyProficiency` 不是 `number`       | 抛出 `TypeError`  |
| 异常精通不是有限数或小于 `0`                     | 抛出 `RangeError` |
| `refringeCoefficientIncreases` 不是数组          | 抛出 `TypeError`  |
| 数组成员或稀疏空位不是 `number`                  | 抛出 `TypeError`  |
| 数组成员不是有限数或小于 `0`                     | 抛出 `RangeError` |
| 顺序求和、异常精通换算或最终异化倍率不是有限数值 | 抛出 `RangeError` |

`refringeFactor`：

| 失败条件                                | 行为              |
| --------------------------------------- | ----------------- |
| 输入不是 `number`                       | 抛出 `TypeError`  |
| 输入是 `NaN`、`Infinity` 或 `-Infinity` | 抛出 `RangeError` |
| 输入小于 `1`                            | 抛出 `RangeError` |

helper 和乘区都不得修改或冻结调用方输入。`defineFactor` 按公共契约检查乘区最终结果是否有限。

## 代码组织

异化区生产代码统一放在 `packages/core/src/factors/refringe.ts`。该文件包含身份常量、默认输入、输入类型、
`Factor` 定义、配套 helper、换算常量和本能力独有的校验；私有范围与换算常量不对外导出。

`packages/core/src/index.ts` 只负责重新导出公开 API。测试保存在 `packages/core/test/refringe.test.ts`，必须
覆盖身份、默认输入、代表值、贡献顺序与重复、空数组、稀疏数组、不可变性、全部失败行为和最终溢出。

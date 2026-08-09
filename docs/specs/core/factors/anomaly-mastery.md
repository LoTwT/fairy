# 异常掌控区

异常掌控区将本次异常积蓄计算采用的异常掌控转换为倍率，规则来源为
[原始攻略中的异常掌控区](../../../references/zzz-data-introduction.txt#L226-L227)。Nanoka 3.0 的英文游戏
文本使用 `Anomaly Mastery` 表示“异常掌控”。

## 身份与公开契约

| 项目       | 定义                        |
| ---------- | --------------------------- |
| 中文名称   | 异常掌控区                  |
| `factorId` | `anomaly_mastery`           |
| 身份常量   | `ANOMALY_MASTERY_FACTOR_ID` |
| 公开定义   | `anomalyMasteryFactor`      |
| 输入类型   | `AnomalyMasteryFactorInput` |
| 结果语义   | `Multiplier`                |

公开类型形态如下。该代码块描述公开契约，不限定内部实现方式。

```ts
export type AnomalyMasteryFactorInput = number

export declare const ANOMALY_MASTERY_FACTOR_ID: "anomaly_mastery"

export declare const DEFAULT_ANOMALY_MASTERY_FACTOR_INPUT: AnomalyMasteryFactorInput

export declare const anomalyMasteryFactor: Factor<AnomalyMasteryFactorInput>
```

由 `Factor<AnomalyMasteryFactorInput>` 的通用契约可得，`anomalyMasteryFactor.calculate` 接收
`AnomalyMasteryFactorInput`，返回 `FactorResult`。

`AnomalyMasteryFactorInput` 直接表示本次异常积蓄计算采用的最终异常掌控数值，不是百分比或已经计算
完成的倍率。异常掌控 `100` 以 `100` 传入，并由本乘区转换为倍率 `1`，不能预先除以 `100` 后传入
`1`。

调用方需要从基础属性和调整计算最终异常掌控时，可以使用
[基础伤害区规范定义的通用属性 helper](base-damage.md#配套属性计算)。异常掌控区不重复计算属性，也不读取
角色面板、Nanoka 实体或效果来源。

## 默认输入

`DEFAULT_ANOMALY_MASTERY_FACTOR_INPUT` 遵循[公共默认输入规则](../index.md#乘区默认输入)，精确内容为：

```ts
100
```

数值是不可变原始值，不需要运行时冻结。将其传给 `anomalyMasteryFactor.calculate` 时结果为恒等倍率
`1`。其中 `100` 只表示公式组合中的恒等计算输入，不代表代理人的默认、基础或面板异常掌控。

## 计算规则

```text
取整后异常掌控 = floor(input)
未钳制值 = 取整后异常掌控 / 100
异常掌控区结果 = clamp(未钳制值, 0, 3)
```

向下取整发生在除以 `100` 之前。例如输入 `99.9`、`100.9` 和 `300.9` 时，先分别得到 `99`、`100`
和 `300`，再产生倍率 `0.99`、`1` 和 `3`。大于或等于 `300` 的合法输入按倍率上限 `3` 结算。

本乘区只对本次异常积蓄计算使用的异常掌控执行向下取整，不修改调用方持有的属性值。结果不执行
其他取整或截断。

## 输入值域

- 输入必须是非负有限数，`0` 有效。
- 属性计算和效果调整可能产生小数异常掌控，因此输入不要求是整数。
- 不设置异常掌控属性的输入上限，最终只钳制乘区结果。

## 适用边界

异常掌控区只负责把一次异常积蓄计算采用的最终异常掌控转换为倍率，不负责：

- 汇总异常掌控属性的基础值、百分比调整或固定值调整；
- 根据代理人、邦布、技能、攻击属性或效果条件选择属性快照；
- 计算异常精通、基础异常积蓄值、异常积蓄效率、异常积蓄抗性或异常触发阈值；
- 判断顶层公式是否采用异常掌控区。

异常掌控与异常精通是不同属性。异常掌控用于异常积蓄值计算，不能传入异常精通区代替异常精通；
异常精通也不能传入本乘区代替异常掌控。

## 有效性与失败行为

| 失败条件                                | 行为              |
| --------------------------------------- | ----------------- |
| 输入不是 `number`                       | 抛出 `TypeError`  |
| 输入是 `NaN`、`Infinity` 或 `-Infinity` | 抛出 `RangeError` |
| 输入小于 `0`                            | 抛出 `RangeError` |

`defineFactor` 按公共契约检查异常掌控区最终结果是否有限。具体乘区必须在向下取整和钳制前完成输入校验，
不能让 `NaN`、`Infinity` 或 `-Infinity` 被转换为有限边界值。

## 代码组织

异常掌控区的生产代码统一放在 `packages/core/src/factors/anomaly-mastery.ts`。该文件包含身份常量、默认
输入、输入类型、`Factor` 定义、范围常量及异常掌控区独有的校验、取整、换算和钳制逻辑。范围常量和
私有辅助函数不对外导出。

`packages/core/src/index.ts` 只负责重新导出公开 API，测试保存在
`packages/core/test/anomaly-mastery.test.ts`。

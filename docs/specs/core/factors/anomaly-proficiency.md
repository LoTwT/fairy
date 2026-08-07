# 异常精通区

异常精通区将本次异常伤害结算采用的异常精通转换为伤害倍率，规则来源为
[原始攻略中的异常精通区](../../../references/zzz-data-introduction.txt#L253)。Nanoka 3.0 的中英文游戏文本
使用 `Anomaly Proficiency` 表示“异常精通”。

## 身份与公开契约

| 项目       | 定义                            |
| ---------- | ------------------------------- |
| 中文名称   | 异常精通区                      |
| `factorId` | `anomaly_proficiency`           |
| 身份常量   | `ANOMALY_PROFICIENCY_FACTOR_ID` |
| 公开定义   | `anomalyProficiencyFactor`      |
| 输入类型   | `AnomalyProficiencyFactorInput` |
| 结果语义   | `Multiplier`                    |

公开类型形态如下。该代码块描述公开契约，不限定内部实现方式。

```ts
export type AnomalyProficiencyFactorInput = number

export declare const ANOMALY_PROFICIENCY_FACTOR_ID: "anomaly_proficiency"

export declare const DEFAULT_ANOMALY_PROFICIENCY_FACTOR_INPUT: AnomalyProficiencyFactorInput

export declare const anomalyProficiencyFactor: Factor<AnomalyProficiencyFactorInput>
```

由 `Factor<AnomalyProficiencyFactorInput>` 的通用契约可得，`anomalyProficiencyFactor.calculate` 接收
`AnomalyProficiencyFactorInput`，返回 `FactorResult`。

`AnomalyProficiencyFactorInput` 直接表示本次异常伤害结算采用的最终异常精通数值，不是百分比或已经
计算完成的倍率。主公式只直接使用这一个数值，因此不增加只有同名字段的对象包装。例如异常精通
`100` 以 `100` 传入，并由本乘区转换为倍率 `1`，不能预先除以 `100` 后传入 `1`。

调用方需要从基础属性和调整计算最终异常精通时，可以使用
[基础伤害区规范定义的通用属性 helper](base-damage.md#配套属性计算)。异常精通区不重复计算属性，也不读取
角色面板、Nanoka 实体或效果来源。

## 默认输入

`DEFAULT_ANOMALY_PROFICIENCY_FACTOR_INPUT` 遵循[公共默认输入规则](../index.md#乘区默认输入)，精确内容为：

```ts
100
```

数值是不可变原始值，不需要运行时冻结。将其传给 `anomalyProficiencyFactor.calculate` 时结果为恒等
倍率 `1`。其中 `100` 只表示公式组合中的恒等计算输入，不代表代理人的默认、基础或面板异常精通。

## 计算规则

```text
未钳制值 = anomalyProficiency / 100
异常精通区结果 = clamp(未钳制值, 0, 10)
```

异常精通 `0`、`100` 和 `1000` 分别产生倍率 `0`、`1` 和 `10`；大于 `1000` 的合法输入仍按倍率
上限 `10` 结算。结果不执行取整或截断。

攻略明确区分异常精通区的有效范围与异常精通属性本身的范围。钳制只影响本乘区产生的倍率，不修改
调用方传入的异常精通，也不限制调用方在其他计算中使用同一个原始属性值。

## 输入值域

- 输入必须是非负有限数，`0` 有效。
- 加权计算可能产生小数异常精通，因此本乘区不要求该字段是整数。
- 不设置异常精通属性的输入上限，最终只钳制乘区结果。

## 适用边界

异常精通区只负责把一次结算采用的最终异常精通转换为倍率，不负责：

- 汇总多个代理人的异常积蓄贡献或建立“虚拟代理人”；
- 根据异常类型、效果标签或触发条件选择参与计算的属性；
- 计算异常掌控、异常积蓄值、异常伤害倍率或异常暴击；
- 判断顶层公式是否采用异常精通区。

异常精通与异常掌控是不同属性。异常掌控用于异常积蓄值计算，不能传入本乘区代替异常精通。

## 有效性与失败行为

| 失败条件                                | 行为              |
| --------------------------------------- | ----------------- |
| 输入不是 `number`                       | 抛出 `TypeError`  |
| 输入是 `NaN`、`Infinity` 或 `-Infinity` | 抛出 `RangeError` |
| 输入小于 `0`                            | 抛出 `RangeError` |

`defineFactor` 按公共契约检查异常精通区最终结果是否有限。具体乘区必须在钳制前完成输入校验，不能让
`NaN`、`Infinity` 或 `-Infinity` 被钳制为有限边界值。

## 代码组织

异常精通区的生产代码统一放在 `packages/core/src/factors/anomaly-proficiency.ts`。该文件包含身份常量、
默认输入、输入类型、`Factor` 定义、范围常量及异常精通区独有的校验、换算和钳制逻辑。范围常量和私有
辅助函数不对外导出。

`packages/core/src/index.ts` 只负责重新导出公开 API，测试保存在
`packages/core/test/anomaly-proficiency.test.ts`。

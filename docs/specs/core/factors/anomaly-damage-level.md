# 异常伤害等级区

原始攻略将本乘区称为“伤害等级区”，并明确它是基于代理人等级对异常伤害的补正，规则来源为
[原始攻略中的伤害等级区](../../../references/zzz-data-introduction.txt#L255)。为避免公开 API 被误解为适用于
所有伤害，core 规范使用更完整的“异常伤害等级区”和 `AnomalyDamageLevel` 标识。游戏文本没有为该
攻略乘区提供独立英文名称。

## 身份与公开契约

| 项目       | 定义                             |
| ---------- | -------------------------------- |
| 中文名称   | 异常伤害等级区                   |
| `factorId` | `anomaly_damage_level`           |
| 身份常量   | `ANOMALY_DAMAGE_LEVEL_FACTOR_ID` |
| 公开定义   | `anomalyDamageLevelFactor`       |
| 输入类型   | `AnomalyDamageLevelFactorInput`  |
| 结果语义   | `Multiplier`                     |

公开类型形态如下。该代码块描述公开契约，不限定内部实现方式。

```ts
export type AnomalyDamageLevelFactorInput = number

export declare const ANOMALY_DAMAGE_LEVEL_FACTOR_ID: "anomaly_damage_level"

export declare const DEFAULT_ANOMALY_DAMAGE_LEVEL_FACTOR_INPUT: AnomalyDamageLevelFactorInput

export declare const anomalyDamageLevelFactor: Factor<AnomalyDamageLevelFactorInput>
```

由 `Factor<AnomalyDamageLevelFactorInput>` 的通用契约可得，`anomalyDamageLevelFactor.calculate` 接收
`AnomalyDamageLevelFactorInput`，返回 `FactorResult`。

`AnomalyDamageLevelFactorInput` 直接表示本次异常伤害结算采用的等级。主公式只直接使用这一个数值，
因此不增加只有同名字段的对象包装。虚拟代理人结算应使用
[虚拟代理人快照帮助函数](../helpers/virtual-agent-snapshot.md)已经加权并向下取整的 `level`；其他调用路径
可以提供同样符合本乘区值域的实际等级，输入统一不命名为角色等级。

## 默认输入

`DEFAULT_ANOMALY_DAMAGE_LEVEL_FACTOR_INPUT` 遵循[公共默认输入规则](../index.md#乘区默认输入)，精确值为：

```ts
1
```

数值是不可变原始值，不需要运行时冻结。等级 `1` 产生恒等倍率 `1`，因此可以作为公式组合的默认
输入；它不代表实际代理人或虚拟代理人的默认等级。

## 等级值域

- 输入必须是 `[1, 60]` 范围内的整数，两个端点都有效。Nanoka 3.0 的代理人等级数据确认当前最高等级
  为 `60`；这是当前游戏规则的业务值域，不是从数据缺省值推断的范围。
- 小数等级无效；本乘区不负责把加权等级向下取整。
- 大于 `60` 的等级无效，不继续外推公式，也不静默按 `60` 计算。未来游戏等级上限变化后，必须先
  重新确认伤害等级公式和输入范围，再更新本规范。
- 不复用防御区的等级基数表。伤害等级补正和防御等级基数是两套不同规则。

## 计算规则

原始公式为：

```text
异常伤害等级区 = trunc(1 + (level - 1) / 59, 4)
```

其中 `trunc(..., 4)` 表示截去四位小数之后的部分，不是四舍五入或显示格式化。规范使用以下数学等价
形式完成精确的四位截断：

```text
缩放值 = (level + 58) * 10000 / 59
异常伤害等级区结果 = trunc(缩放值) / 10000
```

实现必须使用 `Math.trunc`，不能使用会四舍五入并返回字符串的 `toFixed(4)`，也不添加
`Number.EPSILON`。合法等级范围内，除法前的整数运算都能由 JavaScript `number` 精确表示。结果仍为
数值，尾随零不属于数值语义。

| 等级 |   结果 |
| ---: | -----: |
|    1 |      1 |
|    2 | 1.0169 |
|   30 | 1.4915 |
|   60 |      2 |

最终结果范围为 `[1, 2]`，截断后不再钳制。

## 适用边界

异常伤害等级区只负责把合法等级转换为异常伤害的等级补正倍率，不负责：

- 根据多次异常积蓄记录及其贡献比例计算加权等级；
- 对虚拟代理人的加权等级执行向下取整；
- 读取代理人对象、代理人 ID、异常积蓄值或 Nanoka 数据；
- 决定哪些记录参与异常伤害结算；
- 计算防御等级基数或其他等级成长规则；
- 决定顶层公式是否采用异常伤害等级区。

调用方使用虚拟代理人时，必须把快照的整数 `level` 传入本乘区。除公式规定的四位截断外，本乘区不
负责伤害显示数值的取整与汇总；该计算由
[伤害显示总值帮助函数](../helpers/displayed-damage.md)统一处理。

## 有效性与失败行为

| 失败条件                                | 行为              |
| --------------------------------------- | ----------------- |
| 输入不是 `number`                       | 抛出 `TypeError`  |
| 输入是 `NaN`、`Infinity` 或 `-Infinity` | 抛出 `RangeError` |
| 输入不是整数                            | 抛出 `RangeError` |
| 输入小于 `1` 或大于 `60`                | 抛出 `RangeError` |

`defineFactor` 按公共契约检查异常伤害等级区最终结果是否有限。合法输入范围内的中间计算不会溢出，
不增加逐步的重复有限性断言。

## 代码组织

异常伤害等级区的生产代码统一放在 `packages/core/src/factors/anomaly-damage-level.ts`。该文件包含身份
常量、默认输入、输入类型、`Factor` 定义、等级与精度常量及异常伤害等级区独有的校验和截断逻辑。
内部常量和私有辅助函数不对外导出。

`packages/core/src/index.ts` 只负责重新导出公开 API，测试保存在
`packages/core/test/anomaly-damage-level.test.ts`。

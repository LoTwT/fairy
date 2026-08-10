# 紊乱失衡等级区

原始攻略将本乘区称为“失衡等级区”，并明确它只对紊乱造成的失衡值进行等级补正，规则来源为
[原始攻略中的紊乱失衡等级区](../../../references/zzz-data-introduction.txt#L293-L297)。为避免公开 API 被
误解为适用于所有失衡值，core 规范使用更完整的“紊乱失衡等级区”和 `DisorderDazeLevel` 标识。

Nanoka 3.1 游戏文本确认“紊乱”使用 `Disorder`，“失衡值”使用 `Daze`；游戏文本没有为攻略中的
“失衡等级区”提供独立英文名称。`DisorderDazeLevel` 是 core 根据适用范围建立的复合标识，不是游戏
官方英文术语。

## 身份与公开契约

| 项目       | 定义                            |
| ---------- | ------------------------------- |
| 中文名称   | 紊乱失衡等级区                  |
| `factorId` | `disorder_daze_level`           |
| 身份常量   | `DISORDER_DAZE_LEVEL_FACTOR_ID` |
| 公开定义   | `disorderDazeLevelFactor`       |
| 输入类型   | `DisorderDazeLevelFactorInput`  |
| 结果语义   | `Multiplier`                    |

公开类型形态如下。该代码块描述公开契约，不限定内部实现方式。

```ts
export type DisorderDazeLevelFactorInput = number

export declare const DISORDER_DAZE_LEVEL_FACTOR_ID: "disorder_daze_level"

export declare const disorderDazeLevelFactor: Factor<DisorderDazeLevelFactorInput>
```

由 `Factor<DisorderDazeLevelFactorInput>` 的公共契约可得，`disorderDazeLevelFactor.calculate` 接收
`DisorderDazeLevelFactorInput`，返回 `FactorResult`。

`DisorderDazeLevelFactorInput` 直接表示本次紊乱失衡值结算采用的虚拟代理人等级。输入已经完成异常
积蓄记录加权和向下取整，因此不增加只有同名字段的对象包装，也不在乘区内再次取整。

## 默认输入

紊乱失衡等级区没有合法的恒等输入，不公开 `DEFAULT_DISORDER_DAZE_LEVEL_FACTOR_INPUT`。合法最低等级
`1` 的结果为 `1.0075`，不能为了得到恒等倍率 `1` 而允许无效等级 `0`。

采用本乘区的公式必须要求调用方提供实际等级输入，不能自动补充默认值。

## 等级值域

- 输入必须是 `[1, 60]` 范围内的整数，两个端点都有效。该范围与当前代理人等级范围一致。
- 小数等级无效；虚拟代理人等级的加权结果必须在调用本乘区前向下取整。
- 大于 `60` 的等级无效，不继续外推公式，也不静默按 `60` 计算。未来游戏等级上限变化后，必须先
  重新确认等级公式和值域，再更新本规范。
- 本乘区不复用异常伤害等级区的四位截断规则，也不复用防御区的等级基数表。

## 计算规则

```text
紊乱失衡等级区结果 = 1 + 0.0075 × level
```

结果不执行取整、截断或钳制。合法等级下的代表值为：

| 等级 |   结果 |
| ---: | -----: |
|    1 | 1.0075 |
|   60 |   1.45 |

最终结果范围为 `[1.0075, 1.45]`。

计算使用 JavaScript `number` 的 IEEE 754 语义。规范不要求将结果格式化为固定小数位，也不添加
`Number.EPSILON`。

## 输入准备

调用方必须基于原异常状态中参与结算的有效代理人异常积蓄，对各条记录的代理人等级执行加权平均，再
对加权结果使用 `Math.floor`。邦布造成的异常积蓄和超过本次异常触发阈值的溢出部分不参与权重。

乘区只接收最终整数等级，不接收异常积蓄记录、权重、原始等级数组或虚拟代理人对象。游戏文本与
Nanoka 数据中也没有“虚拟代理人”实体；它是攻略为描述加权结果建立的计算模型。

## 适用边界

紊乱失衡等级区只负责把合法等级转换为紊乱失衡值的等级补正倍率，不负责：

- 筛选异常积蓄记录或计算有效积蓄贡献；
- 对多条等级记录加权或向下取整；
- 建立或保存虚拟代理人对象；
- 计算异常伤害等级区、防御等级基数或其他等级成长规则；
- 决定某次紊乱或特殊紊乱是否产生失衡值；
- 决定顶层公式是否采用本乘区。

如果全部有效代理人积蓄都被排除，攻略没有提供虚拟代理人等级的回退值。调用方不得使用等级 `1`
替代缺失输入并声称结果完整。

## 有效性与失败行为

| 失败条件                                | 行为              |
| --------------------------------------- | ----------------- |
| 输入不是 `number`                       | 抛出 `TypeError`  |
| 输入是 `NaN`、`Infinity` 或 `-Infinity` | 抛出 `RangeError` |
| 输入不是整数                            | 抛出 `RangeError` |
| 输入小于 `1` 或大于 `60`                | 抛出 `RangeError` |

`defineFactor` 按公共契约检查紊乱失衡等级区最终结果是否有限。合法输入范围内的中间计算不会溢出，
不增加逐步的重复有限性断言。

## 代码组织

紊乱失衡等级区的生产代码统一放在 `packages/core/src/factors/disorder-daze-level.ts`。该文件包含身份
常量、输入类型、`Factor` 定义、等级与倍率常量及本乘区独有的输入校验。内部常量不对外导出。

`packages/core/src/index.ts` 只负责重新导出公开 API，测试保存在
`packages/core/test/disorder-daze-level.test.ts`。

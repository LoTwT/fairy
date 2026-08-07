# 异常暴击区

异常暴击区根据本次异常伤害是否已经确定为暴击，产生异常暴击倍率，规则来源为
[原始攻略中的异常暴击区](../../../references/zzz-data-introduction.txt#L262)。异常暴击区是攻略对异常伤害
暴击机制的统一建模；Nanoka 3.0 游戏文本会在具体异常效果中使用 `CRIT Rate`、`CRIT DMG` 和
“触发暴击”等表达，未提供统一的 `Anomaly Critical` 标签。core 使用 `AnomalyCritical` 作为覆盖该机制
的统一标识。

## 身份与公开契约

| 项目       | 定义                         |
| ---------- | ---------------------------- |
| 中文名称   | 异常暴击区                   |
| `factorId` | `anomaly_critical`           |
| 身份常量   | `ANOMALY_CRITICAL_FACTOR_ID` |
| 公开定义   | `anomalyCriticalFactor`      |
| 输入类型   | `AnomalyCriticalFactorInput` |
| 结果语义   | `Multiplier`                 |

公开类型形态如下。该代码块描述公开契约，不限定内部实现方式。

```ts
export interface AnomalyCriticalFactorInput {
  readonly isAnomalyCritical: boolean
  readonly anomalyCriticalDamageContributions: readonly number[]
}

export declare const ANOMALY_CRITICAL_FACTOR_ID: "anomaly_critical"

export declare const DEFAULT_ANOMALY_CRITICAL_FACTOR_INPUT: AnomalyCriticalFactorInput

export declare const anomalyCriticalFactor: Factor<AnomalyCriticalFactorInput>
```

由 `Factor<AnomalyCriticalFactorInput>` 的通用契约可得，`anomalyCriticalFactor.calculate` 接收
`AnomalyCriticalFactorInput`，返回 `FactorResult`。

`AnomalyCriticalFactorInput` 是一次异常暴击区计算的完整输入：

- `isAnomalyCritical` 表示本次异常伤害是否已经确定为暴击，不表示该异常伤害是否具有暴击能力；
- `anomalyCriticalDamageContributions` 保存本次结算适用的异常暴击伤害贡献。

贡献数组成员是已经转换为小数的有符号数值。游戏文本中的 `50%` 以 `0.5` 传入；提升使用正数，降低
使用负数。成员不表示最终倍率，已经包含基础值 `1` 的异常暴击倍率不能作为贡献传入。

异常暴击没有所有异常效果共享的基础暴击伤害。`isAnomalyCritical` 为 `true` 时，调用方必须将当前
异常效果的基础暴击伤害与其他实际适用贡献一并传入；本乘区不补充角色或异常效果的默认属性。

## 默认输入

`DEFAULT_ANOMALY_CRITICAL_FACTOR_INPUT` 遵循[公共默认输入规则](../index.md#乘区默认输入)，精确内容为：

```ts
{
  isAnomalyCritical: false,
  anomalyCriticalDamageContributions: [],
}
```

外层对象和嵌套空数组都必须冻结。将该常量传给 `anomalyCriticalFactor.calculate` 时结果为恒等倍率
`1`。该常量表示本次异常伤害未发生异常暴击，不代表游戏角色或异常效果的默认属性。

## 适用边界

调用方必须在建立输入前确定当前异常伤害是否具有暴击能力，以及本次结算是否实际暴击：

- `isAnomalyCritical` 为 `true` 时，异常暴击区汇总贡献并计算倍率；
- `isAnomalyCritical` 为 `false` 时，异常暴击区返回恒等倍率 `1`。合法贡献数组不参与求和。

本乘区不接收角色、异常类型、效果标签或来源，不执行随机判定，也不根据具体角色技能验证
`isAnomalyCritical`。虚拟代理人构建和历史属性记录不属于本乘区；攻略说明的异常暴击率与暴击伤害
应由对应异常效果在结算时实时确定。

异常伤害公式使用异常暴击区替代普通暴击区，不能同时采用 `criticalFactor` 和
`anomalyCriticalFactor`。

## 贡献数组语义

- `isAnomalyCritical` 为 `true` 时，空数组表示异常暴击伤害贡献为 `0`，结果为 `1`。
- 每个成员独立参与求和，内容相同的成员不会合并或去重。
- 输入按数组顺序求和，顺序不表示业务优先级。
- 无论是否异常暴击，都必须校验数组及其每个成员；未暴击时不对合法贡献执行求和。
- 计算不得修改输入对象或贡献数组。

## 计算规则

```text
异常暴击区结果 = 1，isAnomalyCritical 为 false 时

异常暴击伤害总和 = Σ anomalyCriticalDamageContributions
有效异常暴击伤害 = clamp(异常暴击伤害总和, 0, 2)
异常暴击区结果 = 1 + 有效异常暴击伤害，isAnomalyCritical 为 true 时
```

异常暴击时必须先检查贡献总和是否有限，再钳制到 `[0, 2]`，最后加上基础值 `1`。因此异常暴击区
最终范围为 `[1, 3]`。未暴击时不计算贡献总和，直接返回 `1`。结果不执行取整或截断。

## 异常暴击期望边界

异常暴击区只计算一次已经确定结果的异常伤害，不计算异常暴击期望，也不接收异常暴击率。

攻略中的 `1 + 异常暴击率 * 异常暴击伤害` 是对多次异常伤害结果进行概率加权的期望计算，不是单次
异常暴击区的归约规则。需要异常暴击期望时必须使用独立的期望计算能力，不得改变
`anomalyCriticalFactor.calculate` 的输入语义或返回类型。

## 有效性与失败行为

| 失败条件                                    | 行为              |
| ------------------------------------------- | ----------------- |
| 输入不是非数组对象或为 `null`               | 抛出 `TypeError`  |
| `isAnomalyCritical` 不是 `boolean`          | 抛出 `TypeError`  |
| 贡献字段不是数组                            | 抛出 `TypeError`  |
| 数组成员不是 `number`                       | 抛出 `TypeError`  |
| 数组成员是 `NaN`、`Infinity` 或 `-Infinity` | 抛出 `RangeError` |
| 异常暴击时钳制前的贡献总和不是有限数值      | 抛出 `RangeError` |

异常暴击时，钳制可能把 `Infinity` 或 `-Infinity` 转换为有限边界值，因此必须先检查贡献总和，再执行
钳制。未异常暴击时不计算总和，但仍须完成输入数组及其成员的类型和有限性校验。

## 代码组织

异常暴击区的生产代码统一放在 `packages/core/src/factors/anomaly-critical.ts`。该文件包含身份常量、默认
输入、输入类型、`Factor` 定义、范围常量及异常暴击区的状态分支、求和和钳制逻辑。范围常量和私有
辅助函数不对外导出。

`packages/core/src/index.ts` 只负责重新导出公开 API，测试保存在
`packages/core/test/anomaly-critical.test.ts`。

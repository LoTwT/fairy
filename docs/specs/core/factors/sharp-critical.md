# 锐暴区

锐暴区是锐化伤害（`Sharpen DMG`）的暴击判定区。锋御克拉蕾的暴击率可以溢出到 200%，固定来源
（ZZZ-HP 增益基线 `fac62407`）对溢出部分按“强制第一层锐暴”结算：未满 100% 的部分按概率加权，
超出 100% 的溢出率把锐暴倍率再乘一次锐暴伤害比例，不解释为保证连续两次锐暴。游戏中文文本中的
“锐化伤害”对应英文文本 `Sharpen DMG`，接入背景见
[ZZZ-HP 静态增益数据接入修订 9](../../data/zzz-hp-static-effects.md#修订-9锐化与锐暴公式及实体接入)。

## 身份与公开契约

| 项目       | 定义                       |
| ---------- | -------------------------- |
| 中文名称   | 锐暴区                     |
| `factorId` | `sharp_critical`           |
| 身份常量   | `SHARP_CRITICAL_FACTOR_ID` |
| 公开定义   | `sharpCriticalFactor`      |
| 输入类型   | `SharpCriticalFactorInput` |
| 结果语义   | `Multiplier`               |

公开类型形态如下。该代码块描述公开契约，不限定内部实现方式。

```ts
export interface SharpCriticalFactorInput {
  readonly isSharpCritical: boolean
  readonly criticalRate: number
  readonly sharpCriticalDamageContributions: readonly number[]
}

export declare const SHARP_CRITICAL_FACTOR_ID: "sharp_critical"

export declare const sharpCriticalFactor: Factor<SharpCriticalFactorInput>
```

由 `Factor<SharpCriticalFactorInput>` 的通用契约可得，`sharpCriticalFactor.calculate` 接收
`SharpCriticalFactorInput`，返回 `FactorResult`。

字段语义如下：

- `isSharpCritical` 选择结算分支。`false` 是非锐暴分支，结果恒为 `1`；`true` 是锐暴分支，按
  下文公式结算。它不表示“本次攻击是否随机触发暴击”，随机触发不在静态计算范围内。
- `criticalRate` 是已经转换为小数的本次锐化暴击率。游戏文本中的 `150%` 以 `1.5` 传入。
- `sharpCriticalDamageContributions` 是本次锐化伤害实际适用的锐暴伤害贡献数组。每个成员是已经
  转换为小数的有符号伤害加成：游戏文本中的锐暴伤害 `50%` 以 `0.5` 传入；代理人基础锐暴伤害
  `150%` 对应 `B = 1.5`，它表示伤害加成而不是最终倍率——此时锐暴倍率为 `1 + B = 2.5`。
  数组成员不表示最终倍率。

调用方负责把代理人基础锐暴伤害（`sharpCriticalDamage` 直伤属性）与本次适用的锐暴伤害增益合并为
贡献数组。角色特性、触发条件、暴击率增益来源是否匹配，不由锐暴区判断。

## 适用边界

锐暴区只用于锐化伤害（`Sharpen DMG`）：

- 常规伤害、贯穿伤害与异常伤害的暴击判定仍由暴击区、异常暴击区等各自乘区处理，不采用本乘区。
- 普通暴伤（`criticalDamage`）不参与 `B`；`B` 只由锐暴伤害贡献组成。固定来源中，音擎与驱动盘的
  普通暴伤不进入锐化链。
- 本乘区不计算期望倍率。期望按固定来源口径由调用方组合：
  `(1 − min(1, r)) × 非锐暴分支 + min(1, r) × 锐暴分支`；`StaticDamageResult.criticalSemantics`
  用具名判别式表达该语义，不重载普通暴击的 `critical` 字段。

顶层公式负责选择乘区组合；本乘区不接收伤害类型字段，也不自行判断当前伤害是否为锐化伤害。

## 数组语义

- 空数组表示没有锐暴伤害贡献，`B` 为 `0`。
- 每个数组成员独立参与求和，内容相同的成员不会合并或去重。
- 输入按数组顺序求和，顺序不表示业务优先级。
- 计算不得修改输入数组。

## 计算规则

```text
B = Σ sharpCriticalDamageContributions
r = clamp(criticalRate, 0, 2)

非锐暴分支（isSharpCritical = false）= 1
锐暴分支（isSharpCritical = true）:
  r ≤ 1 时 = 1 + B
  r > 1 时 = (1 + B) × (1 + B × (r − 1))
```

`B` 不设钳制：固定来源不以普通暴伤的方式钳制锐暴伤害合计，负贡献允许把 `1 + B` 压低。`r` 先钳制
到 `[0, 2]` 再分档；`r > 1` 时的溢出层 `1 + B × (r − 1)` 与基础层 `(1 + B)` 相乘，两层的 `B` 相同。
结果不执行取整或截断。

## 有效性与失败行为

| 失败条件                                           | 行为              |
| -------------------------------------------------- | ----------------- |
| 输入不是非数组对象或为 `null`                      | 抛出 `TypeError`  |
| `isSharpCritical` 不是布尔值                       | 抛出 `TypeError`  |
| `criticalRate` 不是 `number`                       | 抛出 `TypeError`  |
| `criticalRate` 是 `NaN`、`Infinity` 或 `-Infinity` | 抛出 `RangeError` |
| `sharpCriticalDamageContributions` 不是数组        | 抛出 `TypeError`  |
| 贡献数组成员不是 `number`                          | 抛出 `TypeError`  |
| 贡献数组成员是 `NaN`、`Infinity` 或 `-Infinity`    | 抛出 `RangeError` |
| 贡献求和或最终倍率不是有限数值                     | 抛出 `RangeError` |

非锐暴分支不读取 `criticalRate` 与 `sharpCriticalDamageContributions` 的数值语义，但仍执行完整的
类型与有限性校验，不在恒等分支放宽输入契约。

## 代码组织

锐暴区的生产代码统一放在 `packages/core/src/factors/sharp-critical.ts`。该文件包含身份常量、输入
类型、`Factor` 定义、范围常量及锐暴区分档逻辑。范围常量和私有辅助函数不对外导出；本乘区没有
恒等默认输入，不提供默认常量。

`packages/core/src/index.ts` 只负责重新导出公开 API，测试保存在独立测试文件中。

# 抗性区

抗性区根据受击方对应属性的抗性、抗性降低和攻击方无视抗性产生抗性倍率，规则来源为
[原始攻略中的抗性区](../../../references/zzz-data-introduction.txt#L124)。

## 身份与公开契约

| 项目       | 定义                    |
| ---------- | ----------------------- |
| 中文名称   | 抗性区                  |
| `factorId` | `resistance`            |
| 身份常量   | `RESISTANCE_FACTOR_ID`  |
| 公开定义   | `resistanceFactor`      |
| 输入类型   | `ResistanceFactorInput` |
| 结果语义   | `Multiplier`            |

公开类型形态如下。该代码块描述公开契约，不限定内部实现方式。

```ts
export interface ResistanceFactorInput {
  readonly targetResistance: number
  readonly targetResistanceReductions: readonly number[]
  readonly attackerResistanceIgnoreValues: readonly number[]
}

export declare const RESISTANCE_FACTOR_ID: "resistance"

export declare const DEFAULT_RESISTANCE_FACTOR_INPUT: ResistanceFactorInput

export declare const resistanceFactor: Factor<ResistanceFactorInput>
```

由 `Factor<ResistanceFactorInput>` 的通用契约可得，`resistanceFactor.calculate` 接收
`ResistanceFactorInput`，返回 `FactorResult`。

- `targetResistance` 表示本次计算采用的受击方抗性快照。
- `targetResistanceReductions` 保存本次计算适用的受击方抗性降低贡献。
- `attackerResistanceIgnoreValues` 保存本次计算适用的攻击方无视抗性贡献。

输入只保存抗性区主公式直接使用的参数，不保存属性种类或数值来源。

## 适用边界

伤害抗性、失衡抗性和异常积蓄抗性是不同属性，但攻略确认它们采用相同代数规则。因此同一个
`resistanceFactor` 可以被后续公式复用，前提是调用方已经选择该公式对应的抗性数值及调整：

- 伤害公式传入本次伤害属性对应的伤害抗性。
- 失衡值公式传入本次攻击属性对应的失衡抗性。
- 异常积蓄值公式传入本次攻击属性对应的异常积蓄抗性。

抗性区不接收属性枚举，也不负责把烈霜映射至冰或把玄墨映射至以太。属性匹配、弱点判断、抗性效果
适用性和数据字段解释均由调用方完成。

`targetResistance` 是应用本次输入中抗性降低和无视抗性之前的快照。同一项调整不能已经包含在该快照
中后再次放入调整数组。

## 默认输入

`DEFAULT_RESISTANCE_FACTOR_INPUT` 遵循[公共默认输入规则](../index.md#乘区默认输入)，精确内容为：

```ts
{
  targetResistance: 0,
  targetResistanceReductions: [],
  attackerResistanceIgnoreValues: [],
}
```

外层对象和两个嵌套空数组都必须冻结。将该常量传给 `resistanceFactor.calculate` 时结果为恒等倍率
`1`。该常量表示公式组合中的“没有抗性影响”，不代表游戏内目标的默认抗性。

## 数组语义

- `targetResistanceReductions` 和 `attackerResistanceIgnoreValues` 为空数组时，对应总和为 `0`。
- 每个数组成员独立参与求和，内容相同的成员不会合并或去重。
- 成员按各自数组中的顺序求和，顺序不表示业务优先级。
- 计算不得修改输入对象或其中的数组。

## 计算规则

```text
未钳制值
= 1
  - targetResistance
  + Σ targetResistanceReductions
  + Σ attackerResistanceIgnoreValues

抗性区结果 = clamp(未钳制值, 0, 2)
```

钳制可能把 `Infinity` 或 `-Infinity` 转换为有限边界值，因此必须先检查未钳制值是否有限。结果不执行
取整或截断。

攻略列出的常见示例为：

| `targetResistance` | 没有其他输入时的结果 | 常见语义     |
| -----------------: | -------------------: | ------------ |
|             `-0.2` |                `1.2` | 弱点属性抗性 |
|              `0.2` |                `0.8` | 抗性属性     |
|              `0.4` |                `0.6` | 特殊高抗性   |

这些值只是来源已观察到的示例，不能在缺少目标抗性数据时作为数据默认值。公开的
`DEFAULT_RESISTANCE_FACTOR_INPUT` 也只是恒等计算输入，不能用来推断目标实际抗性。

## 输入值域

- `targetResistance` 允许任意有限有符号数值，因为弱点抗性可以小于 `0`。
- `targetResistanceReductions` 和 `attackerResistanceIgnoreValues` 的成员必须是非负有限数，方向由字段
  语义表达。
- 三类数值均使用已经转换为小数的无量纲值；游戏文本中的 `20%` 以 `0.2` 传入。
- 不设置未经来源确认的单项上限，最终统一按抗性区范围钳制。

## 有效性与失败行为

| 失败条件                           | 行为              |
| ---------------------------------- | ----------------- |
| 输入不是非数组对象或为 `null`      | 抛出 `TypeError`  |
| 抗性降低或无视抗性字段不是数组     | 抛出 `TypeError`  |
| 目标抗性或数组成员不是 `number`    | 抛出 `TypeError`  |
| 目标抗性或数组成员不是有限数值     | 抛出 `RangeError` |
| 抗性降低或无视抗性数组成员小于 `0` | 抛出 `RangeError` |
| 钳制前的未钳制值不是有限数值       | 抛出 `RangeError` |

## 代码组织

抗性区的生产代码统一放在 `packages/core/src/factors/resistance.ts`。该文件包含身份常量、默认输入、
输入类型、`Factor` 定义、范围常量及抗性区独有的求和和钳制逻辑。范围常量和私有辅助函数不对外
导出。

`packages/core/src/index.ts` 只负责重新导出公开 API，测试保存在独立测试文件中。

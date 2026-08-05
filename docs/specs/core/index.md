# Core 计算规范

## 术语

| 中文术语 | 英文标识       | 规范定义                                                                       | 类别      |
| -------- | -------------- | ------------------------------------------------------------------------------ | --------- |
| 公式     | `Formula`      | 由有序乘区组成的不可变顶层业务定义，只组合各乘区产生的数值                     | core 模型 |
| 乘区     | `Factor`       | 将一次完整运行时输入计算为一个有限数值的不可变计算定义，是 core 的核心计算单元 | 攻略原词  |
| 倍率     | `Multiplier`   | 用于乘法缩放的无量纲数值；它是数值，不是乘区                                   | core 模型 |
| 乘区输入 | `FactorInput`  | 调用方提供的一次乘区计算所需的完整运行时输入；具体结构由对应乘区自行定义       | core 输入 |
| 乘区结果 | `FactorResult` | 乘区一次计算产生的有限数值                                                     | core 结果 |

### 术语边界

- “公式”只表示常规伤害、贯穿伤害、异常伤害、异常积蓄值等由乘区组成的顶层业务计算。乘区内部的
  `calculate` 不因包含等式而成为独立公式。
- `Factor` 是完整且可复用的计算定义，不保存某次计算使用的 `FactorInput`。
- `FactorInput` 是泛型参数的统一名称，不存在所有乘区共同继承的输入类型。它可以是数值数组、结构化
  对象或其他由具体乘区明确声明的只读类型；公共契约不额外包裹数组。
- `FactorInput` 只包含乘区主公式直接使用的参数。参数自身具有独立、稳定业务语义和计算规则时，可以
  由 core 公开 helper 计算后再传入乘区；原始数据解析和效果适用性判断仍不属于 helper。
- 固定常量、查表规则和派生算法必须由对应乘区或其配套 helper 统一维护，不得要求调用方重复实现。
- `FactorResult` 是供 `Formula` 组合的数值，不包含乘区身份、输入副本、原始值、处理记录或分析结果。
- 来源分析和输入贡献分析属于独立分析能力，不改变 `Factor.calculate` 的基础返回类型。
- “倍率”表示 `Multiplier` 数值；产出倍率的乘区仍使用统一的 `Factor` 模型。
- core 规范标识不得使用 `Zone`、`Bucket`、`Modifier` 或 `Resolver` 表示乘区。

## `Factor` 公共契约

```ts
export type FactorResult = number

export interface FactorParams<FactorInput> {
  factorId: string
  calculate: (input: FactorInput) => FactorResult
}

export interface Factor<FactorInput> {
  readonly factorId: string
  readonly calculate: (input: FactorInput) => FactorResult
}
```

- `FactorParams` 是建立乘区前可编辑且尚未校验的构造参数，字段不使用 `readonly`。
- `Factor` 是经过校验、包装和冻结的独立类型，不是 `FactorParams` 的只读别名。
- `FactorParams` 与 `Factor` 不使用品牌字段。二者的名称表达不同业务语义，但 TypeScript 的结构类型
  系统不保证它们不可相互赋值。
- `FactorInput` 没有默认类型，也没有统一的上界约束。
- `FactorResult` 统一为数值，不增加 `FactorOutput` 泛型。所有 `Factor` 产生单一数值是 `Formula`
  能够一致组合不同乘区的公共契约。
- `calculate` 必须同步、确定性地完成计算，不得修改 `input` 或其嵌套成员。
- 相同 `Factor` 和内容相同的 `input` 必须产生相同结果或抛出相同错误。
- `calculate` 产生的负数、零及具体有效范围由对应乘区定义；公共契约只要求结果是有限数值。

## 运行时校验原则

- 公开 API 必须校验具体规范列出的输入形态和值域。公开 TypeScript 类型不能替代运行时校验。
- 若后续钳制可能把非有限值转换为有限边界值，必须在钳制前检查被钳制值是否有限。
- 返回数值的公开计算 API 必须在返回前检查最终结果是否有限。`Factor.calculate` 的最终结果由
  `defineFactor` 统一检查。
- 加法、乘法和顺序归约等普通连续算术不构成独立的公开校验边界。公共契约不要求或承诺在每个算术
  步骤后检查有限性；中间产生的非有限值在后续明确的校验边界或公开返回前处理。
- 多个失败条件同时存在时，不承诺校验顺序或优先抛出哪个错误，具体规范明确规定顺序的情况除外。
  失败行为表描述每个失败条件单独出现时的行为。
- 可由多个计算模块复用的运行时断言统一放在 `packages/core/src/internal/assert.ts`。该模块只属于包内
  实现，不得从 `packages/core/src/index.ts` 公开导出；具体乘区独有的结构和值域校验仍由对应乘区负责。

## `defineFactor`

`defineFactor` 是建立 `Factor` 的统一入口，只接收 `factorId` 和 `calculate`：

```ts
export function defineFactor<FactorInput>(
  params: FactorParams<FactorInput>,
): Factor<FactorInput>
```

`defineFactor` 在调用时读取 `params` 的字段并建立新的 `Factor`，不得修改或冻结传入的
`FactorParams`。调用方随后修改 `params.factorId` 或替换 `params.calculate`，不得影响已经返回的 `Factor`。

### `factorId`

- `factorId` 必须是稳定的非空字符串，纯空白字符串无效。
- 内置乘区必须为其 `factorId` 提供共享常量；自定义乘区可以直接使用合法字符串。
- `defineFactor` 不维护全局注册表，也不检查不同 `Factor` 之间的身份重复。重复身份应在未来的
  `Formula` 组合边界检查。

### `calculate`

- `calculate` 必须是函数，否则 `defineFactor` 在建立 `Factor` 前抛出 `TypeError`。
- `defineFactor` 不对 `input` 建立统一的运行时形态约束；具体乘区必须按照自身规范校验完整输入。
- `defineFactor` 返回的 `calculate` 将 `input` 原样传给构造参数中的计算函数，然后使用
  `Number.isFinite` 检查结果。
- `NaN`、`Infinity` 和 `-Infinity` 均为无效结果，必须抛出 `RangeError`。
- `defineFactor` 不为 `input` 建立副本，也不在运行时冻结 `input`；只读约束由具体输入类型和乘区实现
  共同保证。
- 传入的计算函数抛出的错误必须原样向调用方传播。

### 不可变性

- `FactorParams` 的字段可以由调用方修改。
- `Factor` 的公开属性在类型层面都是只读的。
- `defineFactor` 必须使用 `Object.freeze` 冻结返回的 `Factor` 对象，使 `factorId` 和 `calculate`
  在运行时也不能被替换。
- 这里只要求浅冻结。`Factor` 仅持有字符串和函数引用；冻结对象无法冻结函数闭包捕获的状态，计算函数
  不依赖可变闭包状态仍由确定性契约和测试保证。

### 失败行为

| 条件                            | 行为                                 |
| ------------------------------- | ------------------------------------ |
| `factorId` 为空或只包含空白字符 | `defineFactor` 抛出 `TypeError`      |
| `calculate` 不是函数            | `defineFactor` 抛出 `TypeError`      |
| `calculate` 返回非有限数值      | `Factor.calculate` 抛出 `RangeError` |
| 具体乘区判定输入无效            | 传播具体乘区抛出的错误               |

## 具体乘区

### 已实现

- [基础伤害区](factors/base-damage.md)
- [增伤区](factors/damage-bonus.md)
- [暴击区](factors/critical.md)
- [防御区](factors/defense.md)

### 已规范，待实现

- [抗性区](factors/resistance.md)
- [减易伤区](factors/damage-taken.md)
- [失衡易伤区](factors/stun-damage.md)
- [贯穿增伤区](factors/sheer-damage-bonus.md)

### 规则边界

- [特殊乘区边界](factors/special.md)

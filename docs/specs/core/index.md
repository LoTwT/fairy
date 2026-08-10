# Core 计算规范

## 术语

| 中文术语 | 英文标识        | 规范定义                                                                       | 类别      |
| -------- | --------------- | ------------------------------------------------------------------------------ | --------- |
| 公式     | `Formula`       | 以确定顺序组合各乘区结果的不可变顶层业务定义                                   | core 模型 |
| 乘区     | `Factor`        | 将一次完整运行时输入计算为一个有限数值的不可变计算定义，是 core 的核心计算单元 | 攻略原词  |
| 倍率     | `Multiplier`    | 用于乘法缩放的无量纲数值；它是数值，不是乘区                                   | core 模型 |
| 公式输入 | `FormulaInput`  | 一次公式计算所需的完整输入；每个字段对应公式采用的一个乘区输入                 | core 输入 |
| 乘区输入 | `FactorInput`   | 调用方提供的一次乘区计算所需的完整运行时输入；具体结构由对应乘区自行定义       | core 输入 |
| 公式结果 | `FormulaResult` | 公式一次计算产生的最终数值及各乘区结果                                         | core 结果 |
| 乘区结果 | `FactorResult`  | 乘区一次计算产生的有限数值                                                     | core 结果 |

### 失衡相关术语

失衡相关中英文术语以 Nanoka 3.1 中同一数据路径的中英文游戏文本为依据。例如雨果的同一段技能文本同时
使用了 `Stun`、`Stunned`、`Stun time`、`Daze` 和 `maximum Daze`，对应中文中的击破特性、失衡状态、
失衡时间、失衡值和失衡值上限。代表性文本见
[英文数据](../../../packages/data/raw/nanoka/3.1/en/character/1291.json#L2067)与
[中文数据](../../../packages/data/raw/nanoka/3.1/zh/character/1291.json#L2067)。

| 中文术语     | 英文标识                 | 规范定义                                                                                                               | 类别     |
| ------------ | ------------------------ | ---------------------------------------------------------------------------------------------------------------------- | -------- |
| 冲击力       | `Impact`                 | 与失衡倍率共同参与基础失衡区计算的属性                                                                                 | 游戏文本 |
| 失衡值       | `Daze`                   | 用于表示失衡量，以及受击方失衡条中的累积量、上限与变化量；可以由攻击或直接机制累积、回复，不表示受击方已经进入失衡状态 | 游戏文本 |
| 失衡倍率     | `Daze Multiplier`        | 与冲击力共同计算基础失衡值的倍率，可以由招式、攻击段或紊乱等失衡值机制提供                                             | 游戏文本 |
| 失衡状态     | `Stunned` / `Stun state` | 受击方满足失衡条件后进入的状态；布尔命名使用 `Stunned` 形态                                                            | 游戏文本 |
| 失衡易伤倍率 | `Stun DMG Multiplier`    | 根据受击方失衡状态参与伤害计算的倍率，不参与失衡值本身的计算                                                           | 游戏文本 |

裸词 `Stun` 在游戏文本中依上下文可以表示击破特性、使目标进入失衡状态的动作、失衡状态本身，或固定
复合术语的一部分，不能单独作为失衡状态或失衡值的 core 标识。`Stun Specialty` 表示代理人的“击破特性”，
当前 core 不对代理人特性建模，因此不把它增加为公开计算术语或公式输入。`Stun DMG Multiplier` 等已经
确认的完整复合术语不受该限制。

特佩什图鉴的[英文文本](../../../packages/data/raw/nanoka/3.1/en/monster/930166.json#L508)使用
`Daze Vulnerability`，同路径[中文文本](../../../packages/data/raw/nanoka/3.1/zh/monster/930166.json#L508)
称为“失衡易伤效果”。结合[攻略对该机制的说明](../../references/zzz-data-introduction.txt#L140)，该处表示
`Stun DMG Multiplier` 提高，不表示 `Daze taken`。这项特殊文本只用于数据解释，不增加为 core 公开标识。

Nanoka 原始数据中的 `stun`、`stun_ratio`、`is_stun`、`stun_damage_taken_ratio` 和 `*_stun_res` 等内部
字段覆盖了多个不同概念，而且在中英文数据中保持相同名称。这些字段只由后续数据清洗层解释，不能作为
core 公开命名的依据，也不能不经语义转换直接作为 core 输入。

### 术语边界

- “公式”只表示常规伤害、贯穿伤害、异常伤害、异常积蓄值等由乘区组成的顶层业务计算。乘区内部的
  `calculate` 不因包含等式而成为独立公式。
- `Formula` 不保存某次计算使用的 `FormulaInput`。具体 `FormulaInput` 的每个顶层字段必须对应一个
  `FactorInput`，公式状态也应放在使用该状态的乘区输入中，不在公式顶层增加与乘区无关的元数据。
- `Factor` 是完整且可复用的计算定义，不保存某次计算使用的 `FactorInput`。
- `FactorInput` 是泛型参数的统一名称，不存在所有乘区共同继承的输入类型。它可以是数值数组、结构化
  对象或其他由具体乘区明确声明的只读类型；公共契约不额外包裹数组。
- `FactorInput` 只包含乘区主公式直接使用的参数。参数自身具有独立、稳定业务语义和计算规则时，可以
  由 core 公开 helper 计算后再传入乘区；原始数据解析和效果适用性判断仍不属于 helper。
- 固定常量、查表规则和派生算法必须由对应乘区或其配套 helper 统一维护，不得要求调用方重复实现。
- `FactorResult` 是供 `Formula` 组合的数值，不包含乘区身份、输入副本、原始值、处理记录或分析结果。
- `FormulaResult` 同时保留最终计算值和每个乘区的 `FactorResult`，但不包含输入副本、贡献明细或来源
  分析。
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

## `Formula` 公共契约

```ts
export type FormulaFactorResults<FormulaInput extends object> = {
  readonly [FactorName in keyof FormulaInput]-?: FactorResult
}

export interface FormulaResult<FormulaInput extends object> {
  readonly value: number
  readonly factorResults: FormulaFactorResults<FormulaInput>
}

export interface FormulaParams<FormulaInput extends object> {
  formulaId: string
  calculate: (input: FormulaInput) => FormulaResult<FormulaInput>
}

export interface Formula<FormulaInput extends object> {
  readonly formulaId: string
  readonly calculate: (input: FormulaInput) => FormulaResult<FormulaInput>
}
```

- `FormulaParams` 是建立公式前可编辑且尚未校验的构造参数，字段不使用 `readonly`。
- `Formula` 是经过校验、包装和冻结的独立类型，不是 `FormulaParams` 的只读别名。
- `FormulaParams` 与 `Formula` 不使用品牌字段。二者的名称表达不同业务语义，但 TypeScript 的结构类型
  系统不保证它们不可相互赋值。
- `FormulaInput` 没有默认类型。每个具体公式必须定义一个对象类型，其每个字段都对应公式采用的一个
  乘区及其完整 `FactorInput`。
- `FormulaFactorResults<FormulaInput>` 的必填键由 `FormulaInput` 的键映射得到，每个值都是对应乘区
  产生的 `FactorResult`。不增加独立的输出泛型。
- `FormulaResult.value` 是尚未执行显示取整、分段汇总或其他后处理的公式最终数值。
- `Formula.calculate` 必须同步、确定性地完成计算，不得修改 `input` 或其嵌套成员。
- 相同 `Formula` 和内容相同的 `input` 必须产生内容相同的结果或抛出相同错误。
- 一次成功的公式计算必须把每个采用的乘区计算一次。不得因为较早的乘区结果为 `0` 而提前返回，
  `factorResults` 必须完整。
- 任一乘区抛出错误时，公式计算立即失败并传播该错误，不返回部分结果。

## 乘区默认输入

具体乘区可以公开一个 `DEFAULT_*_FACTOR_INPUT` 常量，供调用方显式表示该乘区的恒等计算状态。默认
输入遵循以下公共规则：

- 默认输入是 core 为计算组合定义的恒等输入，不代表游戏内角色、敌人、面板或数据源的默认值。
- 默认输入属于具体乘区，不增加到通用 `Factor`、`FactorParams`、`Formula` 或 `FormulaParams` 契约。
- 使用默认输入的具体公式仍须把全部乘区输入字段声明为必填。公式不得在字段缺失或值为 `undefined`
  时自动补充默认输入。
- 对象和数组形式的默认输入必须在运行时冻结；存在嵌套数组时，外层对象和嵌套数组都必须冻结。
- 基础伤害区没有恒等倍率语义，不公开 `DEFAULT_BASE_DAMAGE_FACTOR_INPUT`。调用方必须提供本次计算的
  `BaseDamageFactorInput`；显式空数组仍按照基础伤害区规范产生 `0`。
- 基础异常积蓄值也没有恒等倍率语义，不公开 `DEFAULT_BASE_ANOMALY_BUILDUP_FACTOR_INPUT`。
  调用方必须提供本次计算的 `BaseAnomalyBuildupFactorInput`；显式传入 `0` 时结果为 `0`。
- 基础失衡区没有恒等倍率语义，不公开 `DEFAULT_BASE_DAZE_FACTOR_INPUT`。调用方必须提供本次计算的
  `BaseDazeFactorInput`；显式传入空数组时结果为 `0`。
- 紊乱失衡等级区在合法等级范围内不能产生恒等倍率 `1`，不公开
  `DEFAULT_DISORDER_DAZE_LEVEL_FACTOR_INPUT`。调用方必须提供已经完成加权和向下取整的实际虚拟
  代理人等级。

## 运行时校验原则

- 公开 API 必须校验具体规范列出的输入形态和值域。公开 TypeScript 类型不能替代运行时校验。
- 若后续钳制可能把非有限值转换为有限边界值，必须在钳制前检查被钳制值是否有限。
- 返回数值的公开计算 API 必须在返回前检查最终结果是否有限。`Factor.calculate` 的最终结果由
  `defineFactor` 统一检查，`FormulaResult` 中的数值由 `defineFormula` 统一检查。
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
- `defineFactor` 不维护全局注册表，也不检查不同 `Factor` 之间的身份重复。公式直接引用所需的
  `Factor` 定义，不通过注册表或身份数组查找乘区。

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

## `defineFormula`

`defineFormula` 是建立 `Formula` 的统一入口，只接收 `formulaId` 和 `calculate`：

```ts
export function defineFormula<FormulaInput extends object>(
  params: FormulaParams<FormulaInput>,
): Formula<FormulaInput>
```

`defineFormula` 在调用时读取 `params` 的字段并建立新的 `Formula`，不得修改或冻结传入的
`FormulaParams`。调用方随后修改 `params.formulaId` 或替换 `params.calculate`，不得影响已经返回的
`Formula`。调用方可以直接导出返回的 `Formula` 并调用其 `calculate`，不需要向 core 注册。

### `formulaId`

- `formulaId` 必须是稳定的非空字符串，纯空白字符串无效。
- 内置公式必须为其 `formulaId` 提供共享常量；自定义公式可以直接使用合法字符串。
- `defineFormula` 不维护全局注册表，也不检查不同 `Formula` 之间的身份重复。

### `calculate`

- `calculate` 必须是函数，否则 `defineFormula` 在建立 `Formula` 前抛出 `TypeError`。
- `defineFormula` 不推断乘区、不自动调用乘区、不补充默认输入，也不接收 `factorIds`。具体公式的
  `calculate` 必须直接引用并组合所需的 `Factor`。
- `defineFormula` 不对 `FormulaInput` 建立统一的运行时形态约束。具体公式负责校验顶层输入形态，
  具体乘区负责校验各自的嵌套输入。
- 构造参数中的计算函数必须返回非数组对象，其中 `value` 是有限数值，`factorResults` 是普通记录
  对象，且其中每个自有属性值都是有限数值。
- `factorResults` 的原型必须是当前运行环境的 `Object.prototype` 或 `null`，每个自有属性都必须可枚举。
  类实例、自定义原型对象和包含非枚举自有属性的对象均不是合法的 `factorResults`。该约束确保对象
  展开建立的快照不会静默丢失公开类型声明的乘区结果。
- `defineFormula` 不在运行时比较 `FormulaInput` 和 `factorResults` 的键集合。二者的一致性由
  `FormulaFactorResults` 的静态类型和具体公式测试保证。
- `defineFormula` 必须复制并冻结 `factorResults`，再建立并冻结新的 `FormulaResult`。调用方修改构造
  参数中计算函数返回的原对象，不得影响已返回的结果。新结果只保留 `value` 和复制后的
  `factorResults`。
- `defineFormula` 不为 `input` 建立副本，也不在运行时冻结 `input`。
- 传入的计算函数或其调用的乘区抛出的错误必须原样向调用方传播。

### 不可变性

- `FormulaParams` 的字段可以由调用方修改。
- `Formula` 和 `FormulaResult` 的公开属性在类型层面都是只读的。
- `defineFormula` 必须使用 `Object.freeze` 冻结返回的 `Formula`、每次返回的 `FormulaResult` 及其
  `factorResults`。
- `Formula` 只持有字符串和函数引用，因此只要求浅冻结。冻结对象无法冻结函数闭包捕获的状态，计算
  函数不依赖可变闭包状态仍由确定性契约和测试保证。
- `FormulaResult` 和 `factorResults` 也只要求浅冻结。`factorResults` 的值统一为数值，不存在需要继续
  冻结的嵌套成员。

### 失败行为

| 条件                                           | 行为                                  |
| ---------------------------------------------- | ------------------------------------- |
| `formulaId` 为空或只包含空白字符               | `defineFormula` 抛出 `TypeError`      |
| `calculate` 不是函数                           | `defineFormula` 抛出 `TypeError`      |
| `calculate` 返回值不是非数组对象               | `Formula.calculate` 抛出 `TypeError`  |
| `factorResults` 不是符合上述约束的普通记录对象 | `Formula.calculate` 抛出 `TypeError`  |
| `value` 或任一乘区结果不是 `number`            | `Formula.calculate` 抛出 `TypeError`  |
| `value` 或任一乘区结果不是有限数值             | `Formula.calculate` 抛出 `RangeError` |
| 具体公式或乘区判定输入无效                     | 传播具体计算抛出的错误                |

## 具体乘区

### 已实现

- [基础伤害区](factors/base-damage.md)
- [增伤区](factors/damage-bonus.md)
- [暴击区](factors/critical.md)
- [防御区](factors/defense.md)
- [抗性区](factors/resistance.md)
- [减易伤区](factors/damage-taken.md)
- [失衡易伤区](factors/stun-damage.md)
- [贯穿增伤区](factors/sheer-damage-bonus.md)
- [基础异常积蓄值](factors/base-anomaly-buildup.md)
- [异常掌控区](factors/anomaly-mastery.md)
- [异常积蓄效率区](factors/anomaly-buildup-rate.md)
- [异常精通区](factors/anomaly-proficiency.md)
- [异常伤害等级区](factors/anomaly-damage-level.md)
- [异常增伤区](factors/anomaly-damage-bonus.md)
- [异常暴击区](factors/anomaly-critical.md)
- [基础失衡区](factors/base-daze.md)
- [失衡值提升区](factors/daze-dealt.md)
- [受到失衡值提升区](factors/daze-taken.md)
- [紊乱失衡值提升区](factors/disorder-daze-dealt.md)
- [紊乱失衡等级区](factors/disorder-daze-level.md)

### 规则边界

- [特殊乘区边界](factors/special.md)

## 具体公式

### 已实现

- [常规伤害](formulas/regular-damage.md)
- [贯穿伤害](formulas/sheer-damage.md)
- [异常伤害](formulas/anomaly-damage.md)
- [异常积蓄值](formulas/anomaly-buildup.md)
- [常规失衡值](formulas/regular-daze.md)
- [紊乱失衡值](formulas/disorder-daze.md)

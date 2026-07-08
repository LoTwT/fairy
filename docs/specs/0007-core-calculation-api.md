# Spec 0007 - Core calculation API

## Scope

这份 spec 定义 Fairy Phase 6A 的 core calculation API 草案。它把 Phase 5A
accepted calculation contract 收窄成第一版可实现的 TypeScript API shape，覆盖：

- `regular_damage`
- `sheer_damage`

Phase 6A 的核心链路固定为：

`Bucket[] -> Formula -> calculateFormula(Formula) -> CalculationResult`

`Bucket` 是可组合的公式乘区积木；`Formula` 是由 `formulaId + Bucket[]` 组合出的公式对象；
`calculateFormula` 只消费 `Formula`，并最终只使用每个 bucket 的一个归一化 `value` 参与计算。

这份 spec **不**启动实现，也不定义 package data、resolver、raw text parsing、角色 /
装备 / 敌人数据库、UI、CLI、npm publish、benchmark、decimal dependency 或 runtime schema
dependency。

暂不进入 Phase 6A 的公式：

- `daze_buildup`
- `anomaly_buildup`
- `anomaly_damage`
- `disorder_damage`
- `disorder_daze_buildup`

## Rationale

Phase 5A 已经提供 source-backed formula baseline、bucket registry、fixture expectation seed
和 provenance snapshot。Phase 6A 不应把这些 review artifacts 直接变成大而全的 runtime
系统；第一步应先实现一个小而稳定的 calculation core，让 UI、optimizer 和后续 resolver 都能复用。

设计目标：

- 调用方先组合 buckets，再得到一个 formula；计算入口只接收 formula。
- API 保留 `BucketContribution` 和 `BucketBreakdown`，让 UI / optimizer 能解释来源和默认值。
- 最终公式计算保持简单：每个 bucket 归一化为一个 `ResolvedBucket.value` 后再相乘。
- 错误返回 `{ ok: false }`，不依赖 exception control flow，也避免 `undefined` / `NaN` 静默进入结果。
- 先不引入通用 operation 系统、resolver 或 runtime validation dependency，避免第一版 API 被过早复杂化。

Naming rationale：

- 使用 `Bucket` 作为主类型名，避免把乘区输入模型做得比实际 Phase 6A 范围更重。
- 使用 `calculateFormula` 作为主入口，强调输入已经是一个可计算的 formula。
- `damage_taken` 表示减易伤区，`stun_damage_taken` 表示失衡易伤区；后者对应游戏文本
  `Stun DMG Multiplier`，并保持 target-side taken 语义。
- `sheer_damage` 表示贯穿伤害公式；Phase 6A API 使用这组命名，不改变 Phase 5A source baseline
  的 historical source record。

## Contract

### Source references

Phase 6A API 草案必须能追溯到这些已入库资料：

| Reference                                                                                                                     | Role                                                                                   |
| ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| [Spec 0006 - Calculation spec](0006-calculation-spec.md)                                                                      | Phase 5A calculation contract、formula / bucket registry 和 Phase 6 handoff boundary。 |
| [formula-baseline-2-0.md](../references/formula-baseline-2-0.md)                                                              | 2.0 guide source-backed formula baseline。                                             |
| [zzz-data-introduction-2-0.txt](../references/source-snapshots/zzz-data-introduction-2-0.txt)                                 | 原始攻略 source snapshot；provenance only，不是 runtime input。                        |
| [Zenless Zone Zero Wiki / Damage](https://zenless-zone-zero.fandom.com/wiki/Damage)                                           | 英文命名参考；不改变 Phase 5A accepted formula boundary。                              |
| [Stun DMG Multiplier Increase Skills](https://zenless-zone-zero.fandom.com/wiki/Category:Stun_DMG_Multiplier_Increase_Skills) | `stun_damage_taken` 英文命名参考。                                                     |
| [Enemy DMG Taken Increase Skills](https://zenless-zone-zero.fandom.com/wiki/Category:Enemy_DMG_Taken_Increase_Skills)         | `damage_taken` 英文命名参考。                                                          |

External references 只用于 naming sanity，不作为 package data、runtime input 或新增公式来源。

### Formula IDs

```ts
type FormulaId = "regular_damage" | "sheer_damage"
```

### Bucket IDs

```ts
type BucketId =
  | "base_damage"
  | "damage_bonus"
  | "crit"
  | "defense"
  | "sheer_damage_bonus"
  | "resistance"
  | "damage_taken"
  | "stun_damage_taken"
  | "special"
```

| 中文名称   | bucket id            | 用于                | 说明                                            |
| ---------- | -------------------- | ------------------- | ----------------------------------------------- |
| 基础伤害区 | `base_damage`        | 两者                | 基础值区，不是倍率；缺失时不能默认。            |
| 增伤区     | `damage_bonus`       | 两者                | `1 + sum(contributions)`。                      |
| 暴击区     | `crit`               | 两者                | 非暴击、暴击或期望值由调用方归一化后传入。      |
| 防御区     | `defense`            | 仅 `regular_damage` | 可由 thin helper 从防御参数派生。               |
| 贯穿增伤区 | `sheer_damage_bonus` | 仅 `sheer_damage`   | `1 + sum(contributions)` 或调用方直接传最终值。 |
| 抗性区     | `resistance`         | 两者                | 默认中性值 `1`。                                |
| 减易伤区   | `damage_taken`       | 两者                | 对应 `DMG Taken Multiplier`。                   |
| 失衡易伤区 | `stun_damage_taken`  | 两者                | 对应 `Stun DMG Multiplier`。                    |
| 特殊乘区   | `special`            | 两者                | Phase 6A 可选兜底乘区，默认 `1`。               |

### Formula definitions

```text
regular_damage =
  base_damage
  * damage_bonus
  * crit
  * defense
  * resistance
  * damage_taken
  * stun_damage_taken
  * special
```

```text
sheer_damage =
  base_damage
  * damage_bonus
  * crit
  * sheer_damage_bonus
  * resistance
  * damage_taken
  * stun_damage_taken
  * special
```

`sheer_damage` 不使用 `defense`。如果调用方传入 `defense`，core 应返回 warning 并忽略该 bucket，
不参与计算。

### Input model

调用方可以传最终 bucket 值，也可以传来源贡献项。Phase 6A 严格要求同一个 `Bucket` 中
`value` 和 `contributions` 二选一。

```ts
interface Bucket {
  readonly bucketId: BucketId

  readonly value?: number

  readonly contributions?: readonly BucketContribution[]
}

interface BucketContribution {
  readonly value: number
  readonly source?: string
  readonly note?: string
}
```

规则：

- 只有 `value`：直接使用该值。
- 只有 `contributions`：按 bucket 内置 reducer 合成最终值。
- 两者都没有：按默认值规则处理。
- 两者同时出现：返回 `{ ok: false }`，避免隐式 override。

### Contribution reducers

Phase 6A 不提供通用 operation 框架，不引入 dynamic `replace`、`clamp`、enable/disable 或
resolver rules。只接受 bucket-level 最小 reducer：

| bucket id            | contribution reducer     |
| -------------------- | ------------------------ |
| `base_damage`        | `sum(contributions)`     |
| `damage_bonus`       | `1 + sum(contributions)` |
| `sheer_damage_bonus` | `1 + sum(contributions)` |
| `damage_taken`       | `1 + sum(contributions)` |
| `stun_damage_taken`  | `1 + sum(contributions)` |

这些 bucket 在 Phase 6A 只接受调用方直接传最终 `value`：

- `crit`
- `defense`
- `resistance`
- `special`

### Defaults and errors

缺失 bucket 的处理遵循公式中性值。所有默认值都必须进入 `BucketBreakdown`，并标记
`defaulted: true` 与 `source: 'default'`。

| bucket id            | 缺失时处理                                           |
| -------------------- | ---------------------------------------------------- |
| `base_damage`        | 返回 `{ ok: false }`。没有安全中性值，不默认为 `0`。 |
| `damage_bonus`       | 默认 `1`。                                           |
| `crit`               | 默认 `1`。                                           |
| `defense`            | 默认 `1`。                                           |
| `sheer_damage_bonus` | 默认 `1`。                                           |
| `resistance`         | 默认 `1`。                                           |
| `damage_taken`       | 默认 `1`。                                           |
| `stun_damage_taken`  | 默认 `1`。                                           |
| `special`            | 默认 `1`。                                           |

### Output and trace model

```ts
interface Formula {
  readonly formulaId: FormulaId
  readonly buckets: readonly Bucket[]
  readonly options?: EvaluationOptions
}

interface EvaluationOptions {
  readonly trace?: boolean
}

interface ResolvedBucket {
  readonly bucketId: BucketId
  readonly value: number
}

type BucketBreakdownSource =
  | "input_value"
  | "contributions"
  | "default"
  | "derived"
  | "ignored"

interface BucketBreakdown {
  readonly bucketId: BucketId
  readonly value: number
  readonly source: BucketBreakdownSource
  readonly defaulted?: boolean
  readonly contributions?: readonly BucketContribution[]
  readonly warnings?: readonly CalculationWarning[]
}

interface CalculationWarning {
  readonly code:
    | "missing_required_bucket"
    | "conflicting_bucket_input"
    | "unsupported_formula"
    | "unsupported_bucket"
    | "ignored_bucket"
    | "defaulted_bucket"
  readonly message: string
  readonly bucketId?: BucketId
}

type CalculationResult =
  | {
      readonly ok: true
      readonly formulaId: FormulaId
      readonly value: number
      readonly buckets: readonly BucketBreakdown[]
      readonly warnings: readonly CalculationWarning[]
      readonly trace?: readonly string[]
    }
  | {
      readonly ok: false
      readonly formulaId?: string
      readonly error: CalculationWarning
      readonly warnings: readonly CalculationWarning[]
      readonly buckets?: readonly BucketBreakdown[]
      readonly trace?: readonly string[]
    }
```

`BucketContribution` 只在归一化和解释阶段使用；最终公式计算只使用
`ResolvedBucket.value`。

### Formula spec

```ts
interface FormulaSpec {
  readonly formulaId: FormulaId
  readonly buckets: readonly BucketId[]
  readonly ignoredBuckets?: readonly BucketId[]
}
```

```ts
const regularDamageSpec = {
  formulaId: "regular_damage",
  buckets: [
    "base_damage",
    "damage_bonus",
    "crit",
    "defense",
    "resistance",
    "damage_taken",
    "stun_damage_taken",
    "special",
  ],
} satisfies FormulaSpec

const sheerDamageSpec = {
  formulaId: "sheer_damage",
  buckets: [
    "base_damage",
    "damage_bonus",
    "crit",
    "sheer_damage_bonus",
    "resistance",
    "damage_taken",
    "stun_damage_taken",
    "special",
  ],
  ignoredBuckets: ["defense"],
} satisfies FormulaSpec
```

### Public API draft

```ts
declare function calculateFormula(formula: Formula): CalculationResult

declare function getFormulaSpec(formulaId: FormulaId): FormulaSpec

declare function listBuckets(formulaId: FormulaId): readonly BucketId[]
```

`calculateFormula` 是唯一主计算入口。`resolveBuckets` 可以作为内部 helper；如果后续为了 debug /
tests 暴露，也必须保持与本 spec 相同的归一化边界：

```ts
declare function resolveBuckets(formula: Formula):
  | {
      readonly ok: true
      readonly buckets: readonly ResolvedBucket[]
      readonly breakdown: readonly BucketBreakdown[]
      readonly warnings: readonly CalculationWarning[]
    }
  | {
      readonly ok: false
      readonly error: CalculationWarning
      readonly breakdown: readonly BucketBreakdown[]
      readonly warnings: readonly CalculationWarning[]
    }
```

## Implementation Notes

### User journeys

普通计算器 UI：

1. 用户选择 `regular_damage` 或 `sheer_damage`。
2. UI 将表单值整理成 `Bucket[]`。
3. UI 将 `formulaId + Bucket[]` 组合成 `Formula`。
4. UI 调用 `calculateFormula(formula)`。
5. core 返回最终 `value`、`BucketBreakdown[]`、`warnings` 和可选 `trace`。
6. UI 展示最终伤害，并展开每个 bucket 的来源、默认值和警告。

optimizer / loadout builder：

1. optimizer 根据候选装备、buff、状态构造 `BucketContribution[]`。
2. optimizer 把这些 bucket 组合成 `Formula`，代表一个候选方案。
3. core 把 contributions 合成为 bucket 的最终 `value`。
4. `calculateFormula` 只使用归一化后的 `ResolvedBucket.value`。
5. `BucketBreakdown` 保留 contribution 明细，供 UI 或 optimizer 解释结果。

thin helper 派生 bucket：

1. 调用方已经知道防御降低、无视防御、穿透率、穿透值、等级基数等数字。
2. 调用方调用 `deriveDefenseBucket(...)` 得到一个 `Bucket`。
3. 该 `Bucket` 和其他 buckets 一起组合成 `Formula`。
4. `BucketBreakdown` 标记该 bucket 的 `source: 'derived'`。

debug / review / 错误处理：

1. core 不抛异常。
2. 缺失 required bucket、冲突输入或不支持公式时返回 `{ ok: false }`。
3. 可计算但有默认值或 ignored bucket 时返回 `{ ok: true }` 与 warnings。
4. reviewer 可以通过 `BucketBreakdown` 和 `trace` 检查每个 bucket 的最终值。

### Composable construction layer

Phase 6A 可以提供一层可选 fluent helper。它不引入第二套公式模型；最终只生成标准 `Bucket`
和 `Formula` shape。

```ts
interface BucketBuilder {
  readonly bucketId: BucketId

  value(value: number): Bucket

  fromContributions(contributions: readonly BucketContribution[]): Bucket
}

declare function bucket(bucketId: BucketId): BucketBuilder

interface FormulaBuilder {
  readonly formulaId: FormulaId

  use(bucket: Bucket): FormulaBuilder

  useAll(buckets: readonly Bucket[]): FormulaBuilder

  build(): Formula
}

declare function createFormula(formulaId: FormulaId): FormulaBuilder
```

Object literal 和 fluent helper 都必须产生同一个 `Bucket` shape：

```ts
const byObjectLiteral = {
  bucketId: "damage_bonus",
  contributions: [
    { value: 0.3, source: "skill_buff" },
    { value: 0.15, source: "drive_disc" },
  ],
} satisfies Bucket

const byComposableHelper = bucket("damage_bonus").fromContributions([
  { value: 0.3, source: "skill_buff" },
  { value: 0.15, source: "drive_disc" },
])
```

`Bucket` 继续组合成 `Formula`：

```ts
const formula = createFormula("regular_damage")
  .use(bucket("base_damage").value(1000))
  .use(
    bucket("damage_bonus").fromContributions([
      { value: 0.3, source: "skill_buff" },
      { value: 0.15, source: "drive_disc" },
    ]),
  )
  .use(bucket("crit").value(2))
  .use(bucket("defense").value(0.5))
  .use(bucket("resistance").value(0.9))
  .use(bucket("stun_damage_taken").value(1.5))
  .build()

const result = calculateFormula(formula)
```

Composable helper boundary：

- 不读取角色、装备、敌人或 raw text。
- 不做公式计算。
- 不绕过 `FormulaSpec`；公式需要哪些 buckets 仍由 `FormulaSpec` 校验。
- 只让调用方更自然地把 `Bucket[]` 组合成 `Formula`。

### Defense helper boundary

`calculateFormula` 只消费最终 `defense` bucket value。可以提供一个很薄的 helper，把明确数值参数归一化成
`defense` bucket。

```ts
interface DefenseBucketParams {
  readonly defenseReduction?: number
  readonly defenseIgnore?: number
  readonly penetrationRate?: number
  readonly penetrationValue?: number
  readonly attackerLevelCoefficient: number
  readonly targetDefense?: number
}

declare function deriveDefenseBucket(params: DefenseBucketParams): Bucket
```

这个 helper 只处理调用方已提供的数字参数，不从 raw text、角色、装备或 guide snapshot 中推断规则。

### Example: regular_damage

```ts
const formula = {
  ...createFormula("regular_damage")
    .use(bucket("base_damage").value(1000))
    .use(
      bucket("damage_bonus").fromContributions([
        { value: 0.3, source: "skill_buff" },
        { value: 0.15, source: "drive_disc" },
      ]),
    )
    .use(bucket("crit").value(2))
    .use(bucket("defense").value(0.5))
    .use(bucket("resistance").value(0.9))
    .use(bucket("stun_damage_taken").value(1.5))
    .build(),
  options: { trace: true },
} satisfies Formula

calculateFormula(formula)
```

参与计算的归一化值：

```text
base_damage = 1000
damage_bonus = 1 + 0.3 + 0.15 = 1.45
crit = 2
defense = 0.5
resistance = 0.9
damage_taken = 1 (default)
stun_damage_taken = 1.5
special = 1 (default)
```

输出：

```ts
{
  ok: true,
  formulaId: 'regular_damage',
  value: 1957.5,
  buckets: [
    { bucketId: 'base_damage', value: 1000, source: 'input_value' },
    {
      bucketId: 'damage_bonus',
      value: 1.45,
      source: 'contributions',
      contributions: [
        { value: 0.3, source: 'skill_buff' },
        { value: 0.15, source: 'drive_disc' },
      ],
    },
    { bucketId: 'crit', value: 2, source: 'input_value' },
    { bucketId: 'defense', value: 0.5, source: 'input_value' },
    { bucketId: 'resistance', value: 0.9, source: 'input_value' },
    { bucketId: 'damage_taken', value: 1, source: 'default', defaulted: true },
    { bucketId: 'stun_damage_taken', value: 1.5, source: 'input_value' },
    { bucketId: 'special', value: 1, source: 'default', defaulted: true },
  ],
  warnings: [
    {
      code: 'defaulted_bucket',
      bucketId: 'damage_taken',
      message: 'damage_taken defaulted to neutral value 1.',
    },
    {
      code: 'defaulted_bucket',
      bucketId: 'special',
      message: 'special defaulted to neutral value 1.',
    },
  ],
  trace: [
    'regular_damage = base_damage * damage_bonus * crit * defense * resistance * damage_taken * stun_damage_taken * special',
    'regular_damage = 1000 * 1.45 * 2 * 0.5 * 0.9 * 1 * 1.5 * 1',
  ],
}
```

### Example: sheer_damage

```ts
const formula = {
  ...createFormula("sheer_damage")
    .use(bucket("base_damage").value(1000))
    .use(
      bucket("damage_bonus").fromContributions([
        { value: 0.3, source: "skill_buff" },
        { value: 0.15, source: "drive_disc" },
      ]),
    )
    .use(bucket("crit").value(2))
    .use(bucket("sheer_damage_bonus").value(1.25))
    .use(bucket("resistance").value(0.9))
    .use(bucket("damage_taken").value(1.2))
    .build(),
  options: { trace: true },
} satisfies Formula

calculateFormula(formula)
```

参与计算的归一化值：

```text
base_damage = 1000
damage_bonus = 1 + 0.3 + 0.15 = 1.45
crit = 2
sheer_damage_bonus = 1.25
resistance = 0.9
damage_taken = 1.2
stun_damage_taken = 1 (default)
special = 1 (default)
```

输出：

```ts
{
  ok: true,
  formulaId: 'sheer_damage',
  value: 3915,
  buckets: [
    { bucketId: 'base_damage', value: 1000, source: 'input_value' },
    {
      bucketId: 'damage_bonus',
      value: 1.45,
      source: 'contributions',
      contributions: [
        { value: 0.3, source: 'skill_buff' },
        { value: 0.15, source: 'drive_disc' },
      ],
    },
    { bucketId: 'crit', value: 2, source: 'input_value' },
    { bucketId: 'sheer_damage_bonus', value: 1.25, source: 'input_value' },
    { bucketId: 'resistance', value: 0.9, source: 'input_value' },
    { bucketId: 'damage_taken', value: 1.2, source: 'input_value' },
    { bucketId: 'stun_damage_taken', value: 1, source: 'default', defaulted: true },
    { bucketId: 'special', value: 1, source: 'default', defaulted: true },
  ],
  warnings: [
    {
      code: 'defaulted_bucket',
      bucketId: 'stun_damage_taken',
      message: 'stun_damage_taken defaulted to neutral value 1.',
    },
    {
      code: 'defaulted_bucket',
      bucketId: 'special',
      message: 'special defaulted to neutral value 1.',
    },
  ],
  trace: [
    'sheer_damage = base_damage * damage_bonus * crit * sheer_damage_bonus * resistance * damage_taken * stun_damage_taken * special',
    'sheer_damage = 1000 * 1.45 * 2 * 1.25 * 0.9 * 1.2 * 1 * 1',
  ],
}
```

### Error examples

Missing `base_damage`：

```ts
{
  ok: false,
  formulaId: 'regular_damage',
  error: {
    code: 'missing_required_bucket',
    bucketId: 'base_damage',
    message: 'base_damage is required and has no neutral default.',
  },
  warnings: [],
}
```

Same bucket has both `value` and `contributions`：

```ts
{
  ok: false,
  formulaId: 'regular_damage',
  error: {
    code: 'conflicting_bucket_input',
    bucketId: 'damage_bonus',
    message: 'Bucket cannot contain both value and contributions in Phase 6A.',
  },
  warnings: [],
}
```

## Acceptance

符合这份 spec 的 PR 必须满足：

- 只新增或更新 docs/spec references；没有 `packages/core`、runtime implementation、dependency、
  lockfile、fixture database、resolver、UI 或 CLI 变更。
- API 草案只覆盖 `regular_damage` 和 `sheer_damage`。
- 文档中的 main calculation journey 使用 `Bucket[] -> Formula -> calculateFormula(Formula) -> CalculationResult`。
- `BucketBreakdown` 是 required output concept，并能记录 input value、contributions、defaults、derived
  values、ignored bucket 和 warnings。
- `base_damage` 缺失时返回 `{ ok: false }`；factor buckets 缺失时默认中性值 `1`，且必须进入
  `BucketBreakdown`。
- `sheer_damage` 明确忽略 `defense`，并通过 warning 表达。
- Contribution reducer 只覆盖 Phase 6A 允许的最小 bucket 集；没有通用 operation system。
- 文档中没有遗留的 obsolete API identifiers；旧 source baseline 记录留在 Phase 5A reference，不在本 API spec 中复写。

PR verification：

- `pnpm check` 成功。
- `git diff --check upstream/main...HEAD` 成功。
- tracked Markdown relative links 可解析。
- 新 API spec 的 obsolete identifier grep 无匹配。

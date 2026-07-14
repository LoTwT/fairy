# Spec 0007 - Core calculation API

## Status

Phase 6A API contract 已由 Phase 6B first implementation slice 落入 `packages/core`。当前 public
surface、formula / bucket registry、normalization、warnings、tests 和 package build 均以本 spec 为准；
后续新增 formula family、resolver、package data 或 public API 必须先更新相应 spec boundary。

`@randomplay/core@0.2.0` 是 clean-slate reset 后的第一条 core package line。它不是已发布
`0.1.x` API 的向后兼容 patch：`0.1.x` 只作为历史和迁移边界保留，现有消费者必须迁移到本 spec
定义的 `CalculationInput` / `CalculationResult` surface。本阶段仍不包含 npm publish flow。

## Scope

这份 spec 定义并约束 Fairy Phase 6A 的第一版 core calculation API，以及 Phase 6B
`packages/core` first implementation slice。它把 Phase 5A accepted calculation contract 收窄成
TypeScript API，覆盖：

- `regular_damage`
- `sheer_damage`

Phase 6A 的核心链路固定为：

`CalculationInput -> FormulaSpec / BucketSpec normalization -> CalculationResult`

`CalculationInput` 是调用方提交的一次计算请求；`FormulaSpec` 是 core 内置 registry 管理的固定规则；
`BucketSpec` 是每个 bucket 的内置归一化策略。`Bucket` 本身只是纯输入数据，不持有 reducer 或计算行为。
`calculate` 只接收 `CalculationInput`，并最终只使用每个 bucket 的一个归一化 `ResolvedBucket.value`
参与计算。

Phase 6B first implementation slice 新增 `packages/core` implementation、package build / test 配置、
所需 dev dependencies，并同步 workspace lockfile。它不定义 package data、resolver、raw text parsing、
角色 / 装备 / 敌人数据库、optimizer、custom registry、UI、CLI、npm publish、benchmark、decimal
dependency 或 runtime schema dependency。

暂不进入 Phase 6A 的公式：

- `daze_buildup`
- `anomaly_buildup`
- `anomaly_damage`
- `disorder_damage`
- `disorder_daze`

## Rationale

Phase 5A 已经提供 source-backed formula baseline、bucket registry、fixture expectation seed
和 provenance snapshot。Phase 6A 不应把这些 review artifacts 直接变成大而全的 runtime
系统；第一步应先实现一个小而稳定的 calculation core，让 UI、optimizer 和后续 resolver 都能复用。

设计目标：

- 调用方用 object literal 提交 `CalculationInput`，计算入口只接收这一次请求。
- 固定公式规则由 `FormulaSpec` 表达；调用方不能拼装或注册新的公式规则。
- bucket 内部归一化由 `BucketSpec` 表达；`Bucket` 是纯数据，不包含 reducer / 计算方法。
- API 保留 `BucketContribution` 和 `BucketBreakdown`，让 UI / optimizer 能解释来源和默认值。
- 最终公式计算保持简单：每个 bucket 归一化为一个 `ResolvedBucket.value` 后再相乘。
- 错误返回 `{ ok: false }`，不依赖 exception control flow，也避免 `undefined` / `NaN` 静默进入结果。
- 先不引入通用 operation 系统、resolver 或 runtime validation dependency，避免第一版 API 被过早复杂化。

Naming rationale：

- 使用 `CalculationInput` 作为 public request type，避免把固定规则层暴露成调用方可组合对象。
- 使用 `FormulaSpec` 表示 core 内置固定规则；文档中的“公式”概念都落到这个 spec 层。
- 使用 `Bucket` 作为纯输入数据类型；bucket 的 reducer、default、validation 和 breakdown trace 都属于
  `BucketSpec` / normalization 层。
- 使用 `calculate` 作为唯一主入口，强调调用方传入的是一次计算请求，不是自定义公式对象。
- `damage_taken` 表示减易伤区，`stun_damage_taken` 表示失衡易伤区；后者对应游戏文本
  `Stun DMG Multiplier`，并保持 target-side taken 语义。
- `sheer_damage` 表示贯穿伤害公式；Phase 6A API 使用这组命名，不改变 Phase 5A source baseline
  的 historical source record。

## Contract

### Source references

Phase 6A API contract 与 implementation 必须能追溯到这些已入库资料：

| Reference                                                                                                                     | Role                                                                                              |
| ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| [Spec 0006 - Calculation spec](0006-calculation-spec.md)                                                                      | Phase 5A calculation contract、fixed formula / bucket spec registry 和 Phase 6 handoff boundary。 |
| [formula-baseline-2-0.md](../references/formula-baseline-2-0.md)                                                              | 2.0 guide source-backed formula baseline。                                                        |
| [zzz-data-introduction-2-0.txt](../references/source-snapshots/zzz-data-introduction-2-0.txt)                                 | 原始攻略 source snapshot；provenance only，不是 runtime input。                                   |
| [Zenless Zone Zero Wiki / Damage](https://zenless-zone-zero.fandom.com/wiki/Damage)                                           | 英文命名参考；不改变 Phase 5A accepted formula boundary。                                         |
| [Stun DMG Multiplier Increase Skills](https://zenless-zone-zero.fandom.com/wiki/Category:Stun_DMG_Multiplier_Increase_Skills) | `stun_damage_taken` 英文命名参考。                                                                |
| [Enemy DMG Taken Increase Skills](https://zenless-zone-zero.fandom.com/wiki/Category:Enemy_DMG_Taken_Increase_Skills)         | `damage_taken` 英文命名参考。                                                                     |

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

| 中文名称   | bucket id            | 用于                | 说明                                                           |
| ---------- | -------------------- | ------------------- | -------------------------------------------------------------- |
| 基础伤害区 | `base_damage`        | 两者                | 基础值区，不是倍率；缺失时不能默认。                           |
| 增伤区     | `damage_bonus`       | 两者                | `1 + sum(contributions)`。                                     |
| 暴击区     | `crit`               | 两者                | 非暴击、暴击或期望值由调用方归一化后传入；只接受直接 `value`。 |
| 防御区     | `defense`            | 仅 `regular_damage` | 可由 thin helper 从防御参数派生。                              |
| 贯穿增伤区 | `sheer_damage_bonus` | 仅 `sheer_damage`   | `1 + sum(contributions)` 或调用方直接传最终值。                |
| 抗性区     | `resistance`         | 两者                | 默认中性值 `1`；只接受直接 `value`。                           |
| 减易伤区   | `damage_taken`       | 两者                | 对应 `DMG Taken Multiplier`。                                  |
| 失衡易伤区 | `stun_damage_taken`  | 两者                | 对应 `Stun DMG Multiplier`。                                   |
| 特殊乘区   | `special`            | 两者                | Phase 6A 可选兜底乘区，默认 `1`；只接受直接 `value`。          |

### Built-in FormulaSpec definitions

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

调用方提交 `CalculationInput`。调用方可以传最终 bucket 值，也可以传来源贡献项。Phase 6A
严格要求同一个 `Bucket` 中 `value` 和 `contributions` 二选一。

```ts
interface CalculationInput {
  readonly formulaId: FormulaId
  readonly buckets: readonly Bucket[]
  readonly options?: CalculationOptions
}

interface CalculationOptions {
  readonly trace?: boolean
}

interface Bucket {
  readonly bucketId: BucketId

  readonly value?: number

  readonly contributions?: readonly BucketContribution[]

  readonly provenance?: BucketProvenance
}

interface BucketContribution {
  readonly value: number
  readonly source?: string
  readonly note?: string
}

type BucketProvenance =
  | {
      readonly kind: "manual"
      readonly source?: string
      readonly note?: string
    }
  | {
      readonly kind: "derived"
      readonly source?: string
      readonly note?: string
    }
```

`Bucket` 是纯输入数据。它不提供 reducer、validation、default、breakdown 或 calculation method；
这些行为都由 core 内置 `BucketSpec` 在 normalization 阶段执行。

规则：

- 只有 `value`：直接使用该值。
- 只有 `contributions`：按 bucket 内置 reducer 合成最终值。
- 两者都没有：按默认值规则处理。
- 两者同时出现：返回 `{ ok: false }`，避免隐式 override。
- `value`、`contributions[].value` 和 helper-derived numeric value 都必须是 finite
  number；`NaN`、`Infinity` 和 `-Infinity` 返回 `{ ok: false }`。
- contribution reducer 的归一化结果和最终公式结果也必须是 finite number。Bucket-level overflow
  返回 `{ ok: false }` + `invalid_number` 与对应 `bucketId`；formula-level overflow 或 `NaN`
  返回 `{ ok: false }` + `invalid_number`，但不伪造 `bucketId`。
- `contributions` 存在时不能为空；空数组返回 `{ ok: false }`，不能被 reducer 当作默认值或 `0`
  自行解释。
- 如果 bucket 没有 Phase 6A contribution reducer，调用方不能提供 `contributions`；必须先在外部或 thin
  helper 中归一化成直接 `value`，否则返回 `{ ok: false }` + `unsupported_contributions`。
- `provenance` 只描述 bucket 值来源，不改变计算规则。没有 `provenance` 时，输出可按
  `kind: "manual"` 处理。
- `provenance.kind = "derived"` 的直接 `value` 只有在 `BucketSpec.acceptsDerivedValue = true`
  时才允许；否则返回 `{ ok: false }` + `unsupported_derived_value`。

### Bucket cardinality and formula applicability

`CalculationInput.buckets` 是以 `bucketId` 为 key 的集合语义，不是 ordered override list。

- 同一个 `CalculationInput` 中同一 `bucketId` 最多出现一次。
- 如果重复出现，core 不做 first wins、last wins、merge 或 replace，必须返回 `{ ok: false }` +
  `duplicate_bucket`。
- 多来源相加或解释必须放在同一个 `Bucket` 的 `contributions` 内。
- bucket 顺序不改变计算结果；公式乘法顺序由 `FormulaSpec.buckets` 决定。

Applicability 分两类，由内置 `FormulaSpec` 决定：

- `FormulaSpec.ignoredBuckets` 中明确列出的 bucket 返回 `{ ok: true }` +
  `ignored_bucket` warning，并进入 `BucketBreakdown`；它不进入 `ResolvedBucket[]`，也不参与最终乘法。
  例如 `sheer_damage` 中的 `defense`。
- 不在 `FormulaSpec.buckets` 或 `FormulaSpec.ignoredBuckets` 中的 bucket 返回 `{ ok: false }` +
  `unsupported_bucket`。例如 `regular_damage` 中的 `sheer_damage_bonus`。

即使 bucket 最终被 ignored，只要调用方显式提供了 `value` 或 `contributions`，这些数字仍必须通过
finite-number validation；ignored bucket 不能成为 `NaN` / `Infinity` 的绕行入口。
ignored bucket 的 `BucketBreakdown.value` 只用于解释：如果调用方提供了 `value` 或
`contributions`，先按普通 bucket 规则归一化后写入 breakdown；如果两者都没有，则写入中性值 `1`，
并标记 `defaulted: true`。无论哪种情况，它都不进入 `ResolvedBucket[]`。

### Bucket specs and reducers

Phase 6A 不提供通用 operation 框架，不引入 dynamic `replace`、`clamp`、enable/disable 或
resolver rules。乘区内部“也有计算”的部分由内置 `BucketSpec` / normalization 表达，不是 `Bucket`
实例方法。Phase 6A 只接受 bucket-level 最小 reducer：

| bucket id            | contribution reducer     |
| -------------------- | ------------------------ |
| `base_damage`        | `sum(contributions)`     |
| `damage_bonus`       | `1 + sum(contributions)` |
| `sheer_damage_bonus` | `1 + sum(contributions)` |
| `damage_taken`       | `1 + sum(contributions)` |
| `stun_damage_taken`  | `1 + sum(contributions)` |

`damage_bonus` 和 `sheer_damage_bonus` 的攻略语义是 `1 + sum(contributions)`。`damage_taken`
的攻略语义是 `1 + increase - reduction`；Phase 6A 中调用方需要先把 reduction 归一化成负向
contribution，core reducer 仍只执行 `1 + sum(contributions)`。

这些 bucket 在 Phase 6A 只接受调用方直接传最终 `value`：

- `crit`
- `defense`
- `resistance`
- `special`

如果这些 bucket 显式提供 `contributions`，core 必须返回 `{ ok: false }` +
`unsupported_contributions`，不能尝试用通用 sum、乘法或 implicit reducer 解释。这个规则同样适用于
`ignoredBuckets`：例如 `sheer_damage` 中显式传入 `defense` 且使用 `contributions` 时，不能因为该
bucket 会被 ignored 就跳过 reducer 可用性检查。

`BucketSpec` 是内部固定策略，不是 public extension API：

```ts
type BucketContributionReducer = "sum" | "one_plus_sum"

interface BucketSpec {
  readonly bucketId: BucketId
  readonly acceptsDirectValue: true
  readonly acceptsDerivedValue?: boolean
  readonly contributionReducer?: BucketContributionReducer
  readonly defaultValue?: number
}
```

Phase 6A 的 `BucketSpec` 责任包括：

- direct `value`、`contributions` 和 helper-derived value 的支持矩阵。
- contribution reducer 和 default value；requiredness 由 `FormulaSpec` 独占定义。
- duplicate、empty contributions、unsupported contributions 和 invalid finite number validation。
- `BucketBreakdown.source`、`defaulted`、`provenance`、`warnings` 和 trace 所需的信息。

`defense` 同时支持 direct normalized value 和 helper-derived value；`crit`、`resistance` 和
`special` 在 Phase 6A 只支持 direct normalized value。

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
interface ResolvedBucket {
  readonly bucketId: BucketId
  readonly value: number
}

interface BucketBreakdownBase {
  readonly bucketId: BucketId
  readonly value: number
}

type DefaultedBucketWarning = Extract<
  CalculationWarning,
  { readonly code: "defaulted_bucket" }
>

type IgnoredBucketWarning = Extract<
  CalculationWarning,
  { readonly code: "ignored_bucket" }
>

type IgnoredBucketBreakdown =
  | (BucketBreakdownBase & {
      readonly source: "ignored"
      readonly defaulted: true
      readonly contributions?: never
      readonly provenance?: never
      readonly warnings: readonly [DefaultedBucketWarning, IgnoredBucketWarning]
    })
  | (BucketBreakdownBase & {
      readonly source: "ignored"
      readonly defaulted?: never
      readonly contributions: readonly [
        BucketContribution,
        ...BucketContribution[],
      ]
      readonly provenance?: BucketProvenance
      readonly warnings: readonly [IgnoredBucketWarning]
    })
  | (BucketBreakdownBase & {
      readonly source: "ignored"
      readonly defaulted?: never
      readonly contributions?: never
      readonly provenance?: BucketProvenance
      readonly warnings: readonly [IgnoredBucketWarning]
    })

type BucketBreakdown =
  | (BucketBreakdownBase & {
      readonly source: "input_value"
      readonly defaulted?: never
      readonly contributions?: never
      readonly provenance?: BucketProvenance & { readonly kind: "manual" }
      readonly warnings?: never
    })
  | (BucketBreakdownBase & {
      readonly source: "contributions"
      readonly defaulted?: never
      readonly contributions: readonly [
        BucketContribution,
        ...BucketContribution[],
      ]
      readonly provenance?: BucketProvenance
      readonly warnings?: never
    })
  | (BucketBreakdownBase & {
      readonly source: "default"
      readonly defaulted: true
      readonly contributions?: never
      readonly provenance?: never
      readonly warnings: readonly [DefaultedBucketWarning]
    })
  | (BucketBreakdownBase & {
      readonly source: "derived"
      readonly defaulted?: never
      readonly contributions?: never
      readonly provenance: BucketProvenance & { readonly kind: "derived" }
      readonly warnings?: never
    })
  | IgnoredBucketBreakdown

type BucketBreakdownSource = BucketBreakdown["source"]

type CalculationErrorCode =
  | "missing_required_bucket"
  | "conflicting_bucket_input"
  | "duplicate_bucket"
  | "invalid_number"
  | "empty_contributions"
  | "unsupported_contributions"
  | "unsupported_derived_value"
  | "unsupported_formula"
  | "unsupported_bucket"

type CalculationWarningCode = "ignored_bucket" | "defaulted_bucket"

interface CalculationIssue<Code extends string> {
  readonly code: Code
  readonly message: string
}

type BucketCalculationIssue<Code extends string> = Code extends string
  ? CalculationIssue<Code> & { readonly bucketId: BucketId }
  : never

type CalculationError =
  | CalculationIssue<"unsupported_formula">
  | (CalculationIssue<"invalid_number"> & {
      readonly bucketId?: BucketId
    })
  | BucketCalculationIssue<
      Exclude<CalculationErrorCode, "unsupported_formula" | "invalid_number">
    >

type CalculationWarning = BucketCalculationIssue<CalculationWarningCode>

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
      readonly error: CalculationError
      readonly warnings: readonly CalculationWarning[]
      readonly buckets?: readonly BucketBreakdown[]
      readonly trace?: readonly string[]
    }
```

`BucketContribution` 只在归一化和解释阶段使用；最终公式计算只使用
`ResolvedBucket.value`。

归一化顺序固定为：

1. 读取 `FormulaSpec`；不支持的 `formulaId` 返回 `{ ok: false }` + `unsupported_formula`。
2. 检查 `CalculationInput.buckets` 中是否存在重复 `bucketId`；重复返回 `{ ok: false }` +
   `duplicate_bucket`。
3. 检查每个显式 bucket 是否属于 `FormulaSpec.buckets` 或 `FormulaSpec.ignoredBuckets`；
   不属于两者返回 `{ ok: false }` + `unsupported_bucket`。
4. 对所有显式 bucket 做 input-shape / support validation：同一 bucket 同时包含 `value` 和
   `contributions` 时返回 `{ ok: false }` + `conflicting_bucket_input`；不支持的 derived direct
   value 返回 `{ ok: false }` + `unsupported_derived_value`。
5. 对所有显式 numeric inputs 做 finite-number validation；失败返回 `{ ok: false }` +
   `invalid_number`。
6. 对显式 `contributions` 做 non-empty validation；空数组返回 `{ ok: false }` +
   `empty_contributions`。
7. 对显式 `contributions` 检查 bucket 是否有 Phase 6A reducer；没有 reducer 返回 `{ ok: false }` +
   `unsupported_contributions`。
8. 用 `BucketSpec` 将每个 accepted bucket 归一化成 `ResolvedBucket.value`，并复检 reducer 输出为
   finite number。
9. 将 ignored buckets 写入 `BucketBreakdown` 和 warnings，但不写入 `ResolvedBucket[]`。
10. `FormulaSpec.requiredBuckets` 是 requiredness 的唯一权威；缺失 required bucket 返回
    `{ ok: false }`，缺失 optional factor bucket 应用 `BucketSpec.defaultValue`。
11. `FormulaSpec` 最终只用 `ResolvedBucket.value` 按 `FormulaSpec.buckets` 顺序计算，并复检最终结果为
    finite number。

这些步骤是整个 bucket 集合的全局阶段，不是对单个 bucket 逐一跑完全部步骤。输入 bucket 的排列不能改变
错误优先级；同一阶段多个 bucket 失败时，适用 bucket 按 `FormulaSpec.buckets` /
`FormulaSpec.ignoredBuckets` 的 canonical 顺序选择，其他 bucket 按 `bucketId` lexical order 选择。

### Formula spec

```ts
interface FormulaSpec {
  readonly formulaId: FormulaId
  readonly buckets: readonly BucketId[]
  readonly requiredBuckets: readonly BucketId[]
  readonly optionalBuckets: readonly BucketId[]
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
  requiredBuckets: ["base_damage"],
  optionalBuckets: [
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
  requiredBuckets: ["base_damage"],
  optionalBuckets: [
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

registry 初始化必须验证 `requiredBuckets` / `optionalBuckets` 对 `buckets` 形成无重复、无重叠、无遗漏的
完整 partition，且每个 optional 或 ignored bucket 都有 `BucketSpec.defaultValue`。`BucketSpec` 不重复声明
requiredness。
支持的 `FormulaId` lookup 必须直接使用 formula registry 的 own properties，不维护第二份手写 key list；
lookup 必须先拒绝 non-string runtime input，不能触发 property-key coercion；registry 初始化还必须验证每个
key 与 entry 内的 `formulaId` 一致。

### Public API

```ts
declare function calculate(input: CalculationInput): CalculationResult

declare function getFormulaSpec(formulaId: FormulaId): FormulaSpec

declare function listBuckets(formulaId: FormulaId): readonly BucketId[]
```

`calculate` 是唯一主计算入口。Phase 6A 不提供 calculation input builder，不提供调用方拼装固定规则的 API，
也不提供 default registry 的注册 / 注入 API。未来如果需要 custom formula 或 custom bucket，应设计
scoped extension，而不是污染 default registry。

`resolveBuckets` 可以作为内部 helper；它不是 Phase 6A public API。如果后续为了 debug / tests 暴露，
也必须保持与本 spec 相同的归一化边界：

```ts
declare function resolveBuckets(input: CalculationInput):
  | {
      readonly ok: true
      readonly buckets: readonly ResolvedBucket[]
      readonly breakdown: readonly BucketBreakdown[]
      readonly warnings: readonly CalculationWarning[]
    }
  | {
      readonly ok: false
      readonly error: CalculationError
      readonly breakdown: readonly BucketBreakdown[]
      readonly warnings: readonly CalculationWarning[]
    }
```

## Implementation Notes

### User journeys

普通计算器 UI：

1. 用户选择 `regular_damage` 或 `sheer_damage`。
2. UI 将表单值整理成 `Bucket[]`。
3. UI 用 object literal 组合出 `CalculationInput`。
4. UI 调用 `calculate(input)`。
5. core 返回最终 `value`、`BucketBreakdown[]`、`warnings` 和可选 `trace`。
6. UI 展示最终伤害，并展开每个 bucket 的来源、默认值和警告。

optimizer / loadout builder：

1. optimizer 根据候选装备、buff、状态构造 `BucketContribution[]`。
2. optimizer 把这些 bucket 放入 `CalculationInput`，代表一个候选方案。
3. core 根据 `BucketSpec` 把 contributions 合成为 bucket 的最终 `value`。
4. `calculate` 只使用归一化后的 `ResolvedBucket.value`。
5. `BucketBreakdown` 保留 contribution 明细，供 UI 或 optimizer 解释结果。

thin helper 派生 bucket：

1. 调用方已经知道防御降低、无视防御、穿透率、穿透值、等级基数等数字。
2. 调用方调用 `deriveDefenseBucket(...)` 得到一个带 `provenance.kind = "derived"` 的 `Bucket`。
3. 该 `Bucket` 和其他 buckets 一起放入 `CalculationInput`。
4. `BucketSpec` normalization 透传 provenance，并让 `BucketBreakdown` 标记该 bucket 的
   `source: 'derived'`。

debug / review / 错误处理：

1. core 不抛异常。
2. 缺失 required bucket、冲突输入或不支持公式时返回 `{ ok: false }`。
3. 可计算但有默认值或 ignored bucket 时返回 `{ ok: true }` 与 warnings。
4. reviewer 可以通过 `BucketBreakdown` 和 `trace` 检查每个 bucket 的最终值。

### Bucket construction helper

Phase 6A 可以提供一层可选 bucket helper。它不引入第二套 bucket 模型；最终只生成标准 `Bucket`
shape，并且不负责 formula / calculation input 的构建。

```ts
interface BucketInputHelper {
  readonly bucketId: BucketId

  value(value: number): Bucket

  fromContributions(contributions: readonly BucketContribution[]): Bucket
}

declare function bucket(bucketId: BucketId): BucketInputHelper
```

`BucketInputHelper.fromContributions(...)` 只构造统一 `Bucket` shape；它不保证该 `bucketId` 支持
`contributions`。是否可计算由 normalization 校验决定：只有 contribution reducer table 中列出的
bucket 可以使用 `contributions`，其他 bucket 必须返回 `{ ok: false }` +
`unsupported_contributions`。

Object literal 和 bucket helper 都必须产生同一个 `Bucket` shape：

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

调用方仍直接提交 `CalculationInput`：

```ts
const input = {
  formulaId: "regular_damage",
  buckets: [
    bucket("base_damage").value(1000),
    bucket("damage_bonus").fromContributions([
      { value: 0.3, source: "skill_buff" },
      { value: 0.15, source: "drive_disc" },
    ]),
    bucket("crit").value(2),
    bucket("defense").value(0.5),
    bucket("resistance").value(0.9),
    bucket("stun_damage_taken").value(1.5),
  ],
} satisfies CalculationInput

const result = calculate(input)
```

Bucket helper boundary：

- 不读取角色、装备、敌人或 raw text。
- 不做公式计算。
- 不绕过 `FormulaSpec`；公式需要哪些 buckets 仍由 `FormulaSpec` 校验。
- 不构造 `CalculationInput`；调用方仍使用 object literal 表达一次计算请求。

### Defense helper boundary

`calculate` 只消费最终 `defense` bucket value。可以提供一个很薄的 helper，把明确数值参数归一化成
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
返回的 bucket 必须携带最小 provenance：

```ts
{
  bucketId: "defense",
  value: 0.5,
  provenance: {
    kind: "derived",
    source: "deriveDefenseBucket",
  },
} satisfies Bucket
```

`calculate` 只有在看到 `provenance.kind === "derived"` 时，才能把对应
`BucketBreakdown.source` 标记为 `"derived"`；否则 direct `value` 输入应保持
`source: "input_value"`。

### Example: regular_damage

```ts
const input = {
  formulaId: "regular_damage",
  buckets: [
    { bucketId: "base_damage", value: 1000 },
    {
      bucketId: "damage_bonus",
      contributions: [
        { value: 0.3, source: "skill_buff" },
        { value: 0.15, source: "drive_disc" },
      ],
    },
    { bucketId: "crit", value: 2 },
    { bucketId: "defense", value: 0.5 },
    { bucketId: "resistance", value: 0.9 },
    { bucketId: "stun_damage_taken", value: 1.5 },
  ],
  options: { trace: true },
} satisfies CalculationInput

calculate(input)
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
const input = {
  formulaId: "sheer_damage",
  buckets: [
    { bucketId: "base_damage", value: 1000 },
    {
      bucketId: "damage_bonus",
      contributions: [
        { value: 0.3, source: "skill_buff" },
        { value: 0.15, source: "drive_disc" },
      ],
    },
    { bucketId: "crit", value: 2 },
    { bucketId: "sheer_damage_bonus", value: 1.25 },
    { bucketId: "resistance", value: 0.9 },
    { bucketId: "damage_taken", value: 1.2 },
  ],
  options: { trace: true },
} satisfies CalculationInput

calculate(input)
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

Duplicate bucket：

```ts
{
  ok: false,
  formulaId: 'regular_damage',
  error: {
    code: 'duplicate_bucket',
    bucketId: 'damage_bonus',
    message: 'CalculationInput cannot contain duplicate bucketId damage_bonus.',
  },
  warnings: [],
}
```

Unsupported bucket for formula：

```ts
{
  ok: false,
  formulaId: 'regular_damage',
  error: {
    code: 'unsupported_bucket',
    bucketId: 'sheer_damage_bonus',
    message: 'sheer_damage_bonus is not supported by regular_damage.',
  },
  warnings: [],
}
```

Invalid numeric input：

```ts
{
  ok: false,
  formulaId: 'regular_damage',
  error: {
    code: 'invalid_number',
    bucketId: 'base_damage',
    message: 'Bucket value must be a finite number.',
  },
  warnings: [],
}
```

Empty contributions：

```ts
{
  ok: false,
  formulaId: 'regular_damage',
  error: {
    code: 'empty_contributions',
    bucketId: 'damage_bonus',
    message: 'Bucket contributions cannot be empty.',
  },
  warnings: [],
}
```

Unsupported contributions：

```ts
{
  ok: false,
  formulaId: 'regular_damage',
  error: {
    code: 'unsupported_contributions',
    bucketId: 'crit',
    message: 'crit does not support contributions in Phase 6A; pass a normalized value.',
  },
  warnings: [],
}
```

## Acceptance

符合这份 spec 的 PR 必须满足：

- Phase 6B first implementation slice 新增 `packages/core` implementation、package build / test 配置、
  所需 dev dependencies，并同步 workspace lockfile；不新增 fixture database、package data、resolver、
  optimizer、custom registry、UI、CLI 或 npm publish flow。
- `@randomplay/core` package version 是 `0.2.0`；这是与已发布 `0.1.x` public API 明确不兼容的
  clean-slate migration boundary，不能作为 `^0.1.4` 可自动升级到的 patch 发布。
- API 与 implementation 只覆盖 `regular_damage` 和 `sheer_damage`。
- 文档中的 main calculation journey 使用
  `CalculationInput -> FormulaSpec / BucketSpec normalization -> CalculationResult`。
- Public API 只有 `calculate(input: CalculationInput): CalculationResult` 作为主计算入口；Phase 6A
  不提供 calculation input builder、调用方公式规则构造 API 或 default registry 注册 / 注入 API。
- `BucketBreakdown` 是 required output concept，并能记录 input value、contributions、defaults、derived
  values、ignored bucket 和 warnings。
- `BucketBreakdown` 必须按 `source` 建模为 public discriminated union：`default` 必须带
  `defaulted: true`，`contributions` 必须带至少一项 contribution 明细，`derived` 必须带 derived
  provenance。
- Fatal `CalculationError` codes 与 recoverable `CalculationWarning` codes 必须是互不相交的 public
  discriminated unions；fatal codes 只进入 `CalculationResult.error`，`ignored_bucket` /
  `defaulted_bucket` 只进入 warnings。
- `base_damage` 缺失时返回 `{ ok: false }`；factor buckets 缺失时默认中性值 `1`，且必须进入
  `BucketBreakdown`。
- `FormulaSpec.requiredBuckets` / `optionalBuckets` 是 requiredness 的唯一权威，并在 registry 初始化时
  验证完整 partition 与 optional / ignored defaults；formula-id support 从 registry own properties 派生，
  并验证 registry key 与 entry identity 一致。runtime formula-id lookup 必须先拒绝 non-string input，不能
  依赖或重复触发 property-key coercion。
- `sheer_damage` 明确忽略 `defense`，并通过 warning 表达。
- 同一 formula 中重复 bucket 返回 `{ ok: false }`；不属于 formula 且不在 ignored list 的 bucket
  返回 `{ ok: false }`；ignored bucket 只能通过 warning 和 breakdown 表达。
- 所有 numeric inputs 都必须是 finite number；空 `contributions` 必须返回 `{ ok: false }`。
- 固定 validation priority 必须按整个 bucket 集合分阶段执行；反转同一 bucket 集合的输入顺序不能改变
  error code 或 error bucket。
- `deriveDefenseBucket(...)` 到 `BucketBreakdown.source = 'derived'` 必须有 explicit
  `provenance` 链路。
- Contribution reducer 只覆盖 Phase 6A 允许的最小 bucket 集；没有通用 operation system。
- Package 不发布 `src` 时，declaration output 不能包含指向缺失源码的 declaration map；packed runtime
  `.mjs.map` 必须保留且为每个 source 提供完整 `sourcesContent`。
- 文档中没有遗留的 obsolete API identifiers；旧 source baseline 记录留在 Phase 5A reference，不在本 API spec 中复写。

PR verification：

- `pnpm check` 成功。
- `pnpm --filter @randomplay/core test`、`typecheck` 和 `build` 成功。
- 对真实 `pnpm pack` tarball 的全新 consumer install / import / calculation smoke 成功。
- `git diff --check upstream/main...HEAD` 成功。
- tracked Markdown relative links 可解析。
- 新 API spec 的 obsolete identifier grep 无匹配。

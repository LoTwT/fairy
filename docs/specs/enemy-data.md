# Enemy 数据结构规格（V1）

## 范围

本规格定义 `packages/zzz-data/data/enemy/` 的处理后数据结构。

当前版本只覆盖：

- `Deadly Assault` 中出现过的敌人
- `enemy` 维度的处理后数据

当前版本明确不覆盖：

- `agent`、`w-engine`、`drive-disc` 等其他实体
- 独立的 `encounter/` 目录
- 从原始 source 文本自动抽取自由文本规则
- `Shiyu Defense`、`Threshold Simulation` 的处理后 enemy 数据

## 设计目标

- 处理后 enemy 数据默认直接放在 `data/` 根下，不额外引入 `canonical/`
- 目录只分 `profile` 和 `mechanics`，避免过早拆出 `encounter/`
- 单次读取某个 enemy 时，尽量只需要：
  - 一个 `mechanics/<enemyId>.json`
  - 可选的一个 `profile/<locale>/<enemyId>.json`
- `mechanics` 对计算和机制说明尽量自包含
- `profile` 负责语言相关展示信息，不承载计算数值

## 目录结构

```text
data/
├── source/
└── enemy/
    ├── index.json
    ├── profile/
    │   ├── en/
    │   │   └── <enemyId>.json
    │   └── zh-CN/
    │       └── <enemyId>.json
    └── mechanics/
        └── <enemyId>.json
```

约定：

- `index.json` 是轻量索引，负责检索、跨语言映射和 source trace
- `profile/` 按 locale 拆分
- `mechanics/` 不按 locale 拆分
- 当前范围内，`enemyId` 直接沿用 `buhflipexplode` 的 enemy id

## 共享类型

```ts
// 当前处理后数据支持的 locale。
type Locale = "en" | "zh-CN"

// 当前版本直接沿用 buhflipexplode 的敌人 id。
type EnemyId = string

// 敌人在 DA 页面中使用的 enemy type，下标对应上游 baseHP/baseDaze 数组位置。
type EnemyType = 0 | 1

// 当前规格只覆盖 Deadly Assault。
type EnemyMode = "deadly-assault"

// 仓库内部统一使用的小写英文元素键。
type ElementKey = "ice" | "fire" | "electric" | "ether" | "physical"

// 当前已结构化的免疫类型。
type EnemyImmunity = "anomaly" | "freeze"

// altHp 调整项的稳定枚举键，对应 DA 页面里几类机制性减血。
type AltHpAdjustmentKey = "ucc" | "hunter" | "miasma" | "shutdown" | "convert"

// 指向 mihoyo-wiki 危局强袭战中某个具体 boss 出场记录。
interface MihoyoWikiEnemyAppearanceRef {
  // 危局强袭战期数条目的顶层 id。
  versionId: string

  // 该敌人在该期中的 side。
  side: 1 | 2 | 3
}

type EnemySourceRef =
  // 直接指向 buhflipexplode 的敌人主表记录。
  | { source: "buhflipexplode"; enemyId: string }
  // 预留给 xlsx 的 source trace，当前版本未实际写入。
  | { source: "xlsx"; ids: string[] }
  // 指向 mihoyo-wiki 危局强袭战中的具体 boss 出场记录。
  | { source: "mihoyo-wiki"; appearances: MihoyoWikiEnemyAppearanceRef[] }
```

## `enemy/index.json`

### 目标

- 通过名字或别名快速定位 enemy
- 统一管理中英文映射
- 记录当前条目来自哪些 source
- 标记当前 enemy 涉及哪些 mode

### 类型

```ts
interface EnemyIndexEntry {
  // 处理后 enemy 的主键。
  id: EnemyId

  // 面向 URL / 检索的稳定 slug，默认从英文主名派生。
  slug: string

  // 轻量多语言名称映射，仅用于检索和快速展示。
  names: Partial<Record<Locale, string>>

  // 展示层可复用的图片键，当前来源于 buhflipexplode enemy.image。
  imageKey?: string

  // 当前 enemy 的轻量标签，保留来源数据的原始 tags。
  tags: string[]

  // 当前已经生成了哪些 locale 的 profile 文件。
  locales: Locale[]

  // 当前 enemy 涉及哪些 mode。
  modes: EnemyMode[]

  // 回溯到 source 数据的来源映射。
  sourceRefs: EnemySourceRef[]
}

// 以 enemyId 为键的轻量索引文件。
type EnemyIndexFile = Record<EnemyId, EnemyIndexEntry>
```

### 约定

- `names` 是轻量多语言名称映射，适合检索，不等于完整展示数据
- `locales` 表示当前有哪些 `profile/<locale>/<id>.json`
- `sourceRefs` 用于追溯来源，不作为对外主键

## `enemy/profile/<locale>/<id>.json`

### 目标

- 承载语言相关展示信息
- 给 AI / UI 查看某个 enemy 的完整资料
- 与计算数值解耦

### 类型

```ts
interface EnemyProfileDeadlyAssaultAppearance {
  // 仓库内部版本键，例如 "2.6.3"。
  version: string

  // 页面展示名称，例如 "2.6 Phase 3"。
  versionName: string

  // 页面展示时间范围，暂不做结构化拆分。
  versionTime: string

  // 该敌人在当期 DA 的 side。
  side: 1 | 2 | 3

  // 当期页面的主说明文案。
  description?: string

  // 当期页面的 performance 文案。
  performance?: string

  // 当期页面的附加 misc 文案。
  misc?: string
}

interface EnemyProfileFile {
  // 处理后 enemy 的主键。
  id: EnemyId

  // 当前 profile 文件对应的 locale。
  locale: Locale

  // 当前 locale 下的主显示名称。
  name: string

  // 当前 locale 下的别名列表。
  aliases: string[]

  // 展示层可复用的图片键。
  imageKey?: string

  // 轻量标签，便于 UI / AI 做快速分类。
  tags: string[]

  // 当前 locale 下的简短摘要；不同 locale 不保证同源或互为直译。
  summary?: string

  // 按 mode 收纳的展示型数据，当前只覆盖 Deadly Assault。
  modes?: {
    deadlyAssault?: {
      // 该敌人在 DA 各期中的展示文案记录。
      appearances: EnemyProfileDeadlyAssaultAppearance[]
    }
  }
}
```

### 约定

- `profile` 不承载计算数值
- `modes.deadlyAssault.appearances` 只放当期页面要展示的文案块
- `summary` 只表示当前 locale 下的主摘要，不保证和其他 locale 的 `summary` 一一对应
- 如果某个 locale 当前没有稳定来源，可以暂时缺失该 locale 文件

## `enemy/mechanics/<id>.json`

### 目标

- 承载语言无关的机制和数值
- 对当前 `Deadly Assault` 计算尽量自包含
- 当前先把 `Deadly Assault` 的显示/派生数据内嵌在 `mechanics` 内，不提前拆 `encounter/`

### 类型

```ts
interface EnemyBaseTypeStats {
  // 对应上游 baseHP/baseDaze 的数组下标。
  enemyType: EnemyType

  // 该 enemyType 下的基础 HP。
  baseHp: number

  // 该 enemyType 下的基础失衡上限。
  baseDaze: number
}

interface EnemyMechanicsDeadlyAssaultAppearance {
  // 仓库内部版本键，例如 "2.6.3"。
  version: string

  // 页面展示名称，例如 "2.6 Phase 3"。
  versionName: string

  // 页面展示时间范围，暂不做结构化拆分。
  versionTime: string

  // 该敌人在当期 DA 的 side。
  side: 1 | 2 | 3

  // 当期 DA 实际使用的 enemyType。
  enemyType: EnemyType

  // 页面展示语义的 HP 百分比，例如 260 表示 260%。
  hpMultiplierPercent: number

  // 页面展示语义的 Daze 百分比，例如 100 表示 100%。
  dazeMultiplierPercent: number

  // 页面展示语义的 Anomaly 百分比，例如 110 表示 110%。
  anomalyMultiplierPercent: number

  // 直接按页面公式计算出的名义 HP。
  rawHp: number

  // 扣除机制性减血后的替代 HP，使用页面展示值。
  altHp: number

  // 构成 altHp 的所有减血调整项。
  altHpAdjustments: Array<{
    // 调整项的稳定枚举键。
    key: AltHpAdjustmentKey

    // 页面里显示的触发标签，例如 "IMPAIRED!!"。
    label: string

    // 该调整项在当前页面模型中的总扣减比例。
    rate: number

    // 页面说明中的触发次数信息，不参与当前 altHp 计算。
    triggerCount: number

    // 额外说明，通常用于补充触发部位或特殊条件。
    note?: string
  }>

  // 页面展示用 defense 值。
  defense: number

  // 页面展示的 Max Daze。
  maxDaze: number

  // 页面展示的 Max Anomaly Buildup；当前无法计算时为 null。
  maxAnomalyBuildup: Record<ElementKey, number> | null
}

interface EnemyMechanicsFile {
  // 处理后 enemy 的主键。
  id: EnemyId

  // 敌人本体固有、跨版本稳定的机制和数值。
  base: {
    // 按 enemyType 拆分的基础 HP / Daze。
    typeStats: EnemyBaseTypeStats[]

    // 基础防御值。
    baseDefense: number

    // 失衡期间承伤倍率，使用百分比展示语义，例如 150。
    stunDamageMultiplierPercent: number

    // 失衡持续时间，单位秒。
    stunDurationSeconds: number

    // 基础异常积蓄上限。
    anomalyBaseBuildup: number

    // 计算语义的元素抗性映射。
    resistanceByElement: Record<ElementKey, number>

    // 当前已结构化的免疫列表。
    immunities: EnemyImmunity[]
  }

  // 保留少量来源追溯字段，不作为标准化计算语义。
  trace?: {
    buhflipexplode?: {
      // 保留来源数据的原始 tags。
      tags: string[]

      // 保留来源数据的原始 mods。
      mods: string[]
    }
  }

  // 按 mode 收纳的版本实例数据，当前只覆盖 Deadly Assault。
  modes?: {
    deadlyAssault?: {
      // 该敌人在 DA 历史版本中的数值与页面派生记录。
      history: EnemyMechanicsDeadlyAssaultAppearance[]
    }
  }
}
```

### 约定

- `base` 只放敌人本体固有、跨版本稳定的数值和机制
- `base` 不保留可由其他字段直接推导出的重复字段
- `trace` 只用于来源追溯，不应被当作标准化计算语义
- `modes.deadlyAssault.history` 放 `Deadly Assault` 的版本实例数据和页面派生值
- `stunDamageMultiplierPercent` 使用展示语义，例如 `150`
- `resistanceByElement` 使用计算语义：
  - `0.2` 表示 20% 抗性
  - `-0.2` 表示 20% 弱点
  - `1` 表示 100% 抗性
- `hpMultiplierPercent`、`dazeMultiplierPercent`、`anomalyMultiplierPercent` 使用页面展示语义，例如 `260`、`100`、`110`

## 边界

- 当前不单独创建 `data/encounter/`
- 如果未来 `modes.deadlyAssault.history` 明显膨胀，再考虑把 mode 实例数据抽到独立 `encounter/`
- 即便未来拆出 `encounter/`，本规格中的字段命名应尽量保持不变，避免上层 resolver 反复改口

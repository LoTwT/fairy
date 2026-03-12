# zzz-data

Zenless Zone Zero 数据与伤害计算库。

## 导出内容

包入口 `src/index.ts` 当前导出七类内容：

- `calculator`：伤害计算函数与类型
- `build`：静态构筑解析器、动态 catalog、curated effect definitions 与 hot-pluggable profile
- `cleaned`：不改 raw shape 的稳定 helper / 消费视图
- `gachabase`：代理人 / 音擎 / 邦布属性计算函数与发布数据类型
- `game-modes`：危局强袭战 / 式舆防卫战 / 阈限模拟发布数据类型
- `terms`：canonical 术语类型与 raw label 映射函数
- `text`：rich text 字段的语义类型与清洗 helper

## 术语分层

本仓库区分两层术语：

1. Raw/source-compatible 层
   - 对应 `data/*.json` 的真实字段与 display label
   - 例如 `exclusiveWeapon`、`stunMult`、`玄墨`、`强攻`
2. Canonical 导出层
   - 用于逻辑判断、跨模块复用和上层工具调用
   - 例如 `AgentSpecialty`、`AgentAttribute`、`AttackType`、`BaseResistanceAttribute`

其中 `Auric Ink`、`Honed Edge`、`Frost` 是独立的 canonical 属性名，分别表示特殊以太、特殊物理、特殊冰。它们不是 `Ether`、`Physical`、`Ice` 的别名；只是当前敌人抗性与 `elementMult` 仍分别落在 `ether`、`physical`、`ice` 这三个基础桶里。

如果你要做筛选、映射或伤害计算，不要直接硬编码 JSON 里的字符串，优先使用：

```ts
import {
  getElementMultIndex,
  toAgentAttribute,
  toAgentSpecialty,
  toBaseResistanceAttribute,
} from "zzz-data"
```

另外，`agent-details` / `w-engines` / `drive-discs` 等发布数据中的部分说明字段保留了 source-compatible rich text 标记（如 `<span>`、`<br/>`、`data-icon`）。这些字段在类型上属于 `RichTextString`，如果你需要纯文本，可使用：

```ts
import { stripRichText } from "zzz-data"
```

如果你想在不碰 raw JSON shape 的前提下直接消费敌人倍率或版本信息，优先使用 cleaned helpers：

```ts
import {
  analyzeVersionPeriod,
  buildEnemyDamageContext,
  getLatestDAVersion,
  selectEncounterByEnemyName,
  toSDNodeViews,
} from "zzz-data"
```

如果你已经有主 C 构筑、最终面板和敌人上下文，优先使用 static build resolver：

当前实现范围：

- 单次 resolver：发布数据中的全部强攻 / 命破 / 异常代理人，支持 `normal / sheer / anomaly / disorder`
- 音擎：全部强攻 / 命破 / 异常音擎，按 `w-engines.json` 动态生成，并要求与代理人 specialty 兼容
- 驱动盘：`炎狱重金属`、`雷暴重金属`、`极地重金属`、`啄木鸟电音`、`河豚电音`、`云岿如我`、`自由蓝调`、`混沌重金属`、`混沌爵士`
- effect definitions：仍以 curated 数据为主；未覆盖的代理人 / 音擎 / 驱动盘会在 `assumptions` 中显式提示
- anomaly / disorder 的直接 curated coverage 已覆盖：
  - 代理人：`格莉丝`、`柳`、`简`、`派派`、`柏妮思`、`薇薇安`、`爱丽丝`、`爱芮`
  - 音擎：`壳中之灵`、`十方锻星`、`飞鸟星梦`、`淬锋钳刺`、`时流贤者`、`灼心摇壶`、`霰落星殿`、`触电唇彩`、`雨林饕客`
- `finalPanel.anomalyMastery` 当前可作为显式快照输入，已用于 `爱丽丝` 的“异常掌控 -> 异常精通”换算
- `loadout.agentMindscape` 与 `finalPanel.energyGenerationRate` 当前已作为 progression-aware 快照输入接入首批高价值来源：
  - `柏妮思`：潜能觉醒「沸点派对」的异常掌控 / 伤害提升
  - `奥菲丝&「鬼火」`：核心技「准星聚焦」的额外攻击力，影画 1 的额外伤害提升 / 火抗无视，影画 2 的终结技后攻击力，影画 4 的强化特殊技 / 终结技增伤
- 仍无法直接表达的剩余时间换算与随机增益，继续通过更细的 source-specific `assumptions` 明示
  - disorder 已支持按 `anomalyType` 区分原异常来源，并支持异常精通阈值类条件
- 技能矩阵：当前仅支持 `normal / sheer`，即强攻 / 命破；高频代理人使用 curated 模板，其余强攻 / 命破代理人回退到通用矩阵生成

```ts
import { resolveStaticBuildDamage } from "zzz-data"

const result = resolveStaticBuildDamage({
  mode: "full-buff",
  loadout: {
    agentId: "1371",
    wEngineId: "14137",
    driveDiscSets: [{ id: "33100", pieces: 4 }],
    agentMindscape: 0,
    coreSkillLevel: 7,
    wEngineRefinement: 1,
  },
  panel: {
    attack: 2500,
    critRate: 0.4,
    critDamage: 1.2,
    hp: 18000,
    energyGenerationRate: 1.2,
  },
  scenario: {
    damageType: "sheer",
    skillTag: "enhancedSpecial",
    skillMultiplier: "500%",
    attribute: "玄墨",
    enemy: {
      defenderBaseDefense: 953,
      defenderResistance: 0.2,
      isStunned: true,
    },
  },
})
```

拿到结果后，通常直接消费这些字段：

```ts
result.profile.id
// "yixuan-sheer"

result.resolvedPanel.baseDamageStat
// "sheerForce"

result.resolvedBuckets.bonusDamageSum
// 0.76

result.damage.expected.total
// number
```

如果你要一次性生成代理人的全技能 / 全段伤害矩阵，使用矩阵 builder：

```ts
import { resolveStaticBuildSkillMatrix } from "zzz-data"

const matrix = resolveStaticBuildSkillMatrix({
  mode: "baseline",
  loadout: {
    agentId: "1241",
    wEngineId: "14124",
    driveDiscSets: [{ id: "31000", pieces: 4 }],
    coreSkillLevel: 7,
    wEngineRefinement: 1,
  },
  panel: {
    attack: 3200,
    baseAttack: 1200,
    critRate: 0.55,
    critDamage: 1.4,
  },
  context: {
    combatTags: ["suppressionMode"],
    enemy: {
      defenderBaseDefense: 953,
      defenderResistance: 0.2,
    },
  },
})

matrix.rows[0]
// {
//   label: "普通攻击·一段",
//   metadata: {
//     order: 1,
//     actionName: "普通攻击",
//     skillName: "普通攻击",
//     qualifiers: [],
//     canonicalLabel: "普通攻击·一段",
//     stableKey: "1241::curated::0::一段伤害倍率::1::basic::default::Ether::agent-default",
//     templateSource: "curated",
//     sourceSkillTypeId: 0,
//     sourceStatId: "124110002",
//     sourceStatName: "一段伤害倍率",
//     sourceOccurrence: 1,
//     attributeSource: "agent-default",
//     templateCombatTags: [],
//     entryType: "hit",
//     aggregationType: "per-hit",
//     isAdditionalDamage: false,
//     variantAxis: "segment",
//     segmentLabel: "一段",
//     segmentIndex: 1,
//   },
//   skillMultiplier: "74.1%",
//   build: { damage, resolvedBuckets, trace, ... }
// }
```

常见消费方式是把矩阵映射成展示表：

```ts
const table = matrix.rows.map((row) => ({
  skill: row.label,
  key: `${row.metadata.skillName}:${row.metadata.segmentIndex ?? row.metadata.entryType}`,
  multiplier: row.skillMultiplier,
  expected: row.build.damage.expected.total,
  crit: row.build.damage.crit.total,
}))
```

如果你需要把矩阵行稳定回链到公开 `agent-details.json` 的原始技能条目，优先使用：

- `row.metadata.sourceSkillTypeId`
- `row.metadata.sourceStatId`
- `row.metadata.sourceStatName`
- `row.metadata.sourceOccurrence`
- `row.metadata.canonicalLabel`
- `row.metadata.stableKey`
- `row.metadata.templateSource`
- `row.metadata.attributeSource`
- `row.metadata.templateCombatTags`
- `row.metadata.aggregationType`
- `row.metadata.isAdditionalDamage`
- `row.metadata.variantAxis`

这样可以避免继续从 `label` 反向猜技能来源、模板来源、属性覆盖来源、行内条件，以及“这是单段命中还是整段总伤”这类聚合语义。

如果你在应用层需要先判断当前 resolver 是否支持某个构筑，不要直接 `try/catch` 所有 resolver 错误，先用 catalog helper 探测：

```ts
import {
  getCompatibleStaticBuildWEngines,
  getStaticBuildAgent,
  supportedStaticBuildAgents,
  supportedStaticBuildWEngines,
} from "zzz-data"

const agent = getStaticBuildAgent("1241")
// supported entry or undefined

const supportedAgentNames = supportedStaticBuildAgents.map((item) => item.name)
const supportedWEngines = supportedStaticBuildWEngines.map((item) => item.name)
const compatibleWEngines = getCompatibleStaticBuildWEngines("Attack").map(
  (item) => item.name,
)
```

推荐约定：

- 支持范围内：直接调用 `resolveStaticBuildDamage` 或 `resolveStaticBuildSkillMatrix`
- 支持范围外：先向用户说明当前不支持，再决定是否回退到旧路径估算

## 常用示例

### 术语标准化

```ts
import { toAgentAttribute, toBaseResistanceAttribute } from "zzz-data"

const canonical = toAgentAttribute("玄墨")
// "Auric Ink"

const resistanceBucket = toBaseResistanceAttribute("玄墨")
// "ether"
```

### 清洗富文本字段

```ts
import { stripRichText } from "zzz-data"

const plain = stripRichText(
  'Press <span style="color: #FFFFFF">[Basic Attack]</span><br/>Deal DMG.',
)
// "Press [Basic Attack]\nDeal DMG."
```

### 构建敌人伤害上下文

```ts
import { buildEnemyDamageContext } from "zzz-data"

const context = buildEnemyDamageContext(enemy, "玄墨")
// {
//   resistanceBucket: "ether",
//   elementMultiplier: 0.8,
//   baseDefense: 476,
//   ...
// }
```

### 读取默认版本与时间区间

```ts
import { analyzeVersionPeriod, getLatestDAVersion } from "zzz-data"

const version = getLatestDAVersion(deadlyAssault)
const period = analyzeVersionPeriod(version!.versionTime)
// { raw, startLabel, endLabel, isRange, isOngoing, isPlaceholder }
```

### 读取 SD / TS 的标准化节点视图

```ts
import { toSDNodeViews, toTSNodeViews } from "zzz-data"

const sdNodes = toSDNodeViews(sdVersion)
// [
//   {
//     node: 1,
//     buffNames: ["增益 1"],
//     buffDescriptions: ["说明 1"],
//     sides: [{ side: 1, enemies: [...] }],
//   },
// ]

const tsNodes = toTSNodeViews(tsVersion)
// [
//   {
//     node: 1,
//     buffNames: ["Boss 增益"],
//     sides: [
//       { side: 1, sideRole: "boss", enemies: [...] },
//       { side: 2, sideRole: "regular", enemies: [...] },
//     ],
//   },
// ]
```

### 读取 encounter 级 damage-context

```ts
import { buildTSDamageContext } from "zzz-data"

const context = buildTSDamageContext(tsVersion, "火属性", {
  node: 1,
  side: 2,
  enemyName: "Patrol Jaeger",
})
// {
//   enemyName: "Patrol Jaeger",
//   elementMultiplier: 1,
//   sideElementMultiplier: 1.2,
//   node: 1,
//   side: 2,
//   wave: 1,
//   ...
// }
```

### 读取 `elementMult`

```ts
import { ELEMENT_MULT_ORDER, getElementMultIndex } from "zzz-data"

const index = getElementMultIndex("烈霜")
// 0

const order = ELEMENT_MULT_ORDER
// ["ice", "fire", "electric", "ether", "physical"]
```

### 属性计算

```ts
import { calcAgentStat, calcWEngineBaseATK } from "zzz-data"

const attack = calcAgentStat(104, 14.4, 60, 112, 0)
const weaponAtk = calcWEngineBaseATK(713, 2200, 7800)
```

## 说明

- `data/en/*.json` 与 `data/zh-CN/*.json` 保留原始 display label
- `src/terms.ts` 提供规范导出，不强行改写 raw JSON 字段
- `src/build/` 提供静态构筑解析层；当前同时覆盖单场景 resolver 与技能矩阵 builder，支持对象和 contract 以 `docs/specs/static-build-resolver-v2.md` 为准
- `src/cleaned/` 提供不改 raw shape 的 helper layer，统一解释倍率桶、版本展示文本、默认版本选择，以及 `DA` / `SD` / `TS` 的标准化消费视图
- `selectEncounterByEnemyName()` 在模糊匹配命中多个敌人时不会猜测，会返回候选名列表供上层继续决策
- `buildSDDamageContext()` / `buildTSDamageContext()` 会同时保留 enemy-level `elementMultiplier` 与 side-level `sideElementMultiplier`；如果两者不一致，不在 cleaned layer 擅自合并语义
- `RichTextString` 字段保留源站富文本标记，不保证是纯文本
- `versionTime` 是展示用时间区间字符串，不保证可机器解析
- `EnemyBase.image` 是资源 slug/key，不是完整图片 URL
- `Enemy*.type` 当前只收敛为已观察到的 raw category code（`0 | 1`），不假设其完整业务含义
- `game-modes` 中若看到 `mult` / `altHp` / `hp60k` / `versionAnomMult` 一类字段，它们属于发布 raw shape，语义说明见源码注释与仓库文档 `docs/naming.md`

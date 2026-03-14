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
  - `柏妮思`：潜能觉醒「沸点派对」的异常掌控 / 伤害提升、影画 2 的 `[热意洞穿]` 层数穿透率收益
  - `奥菲丝&「鬼火」`：核心技「准星聚焦」的额外攻击力，影画 1 的额外伤害提升 / 火抗无视，影画 2 的终结技后攻击力，影画 4 的强化特殊技 / 终结技增伤
  - `爱丽丝`：影画 1 的 `[强击]` 后减防，影画 2 的物理来源紊乱增伤，影画 4 的物理异常 / 紊乱无视抗性
  - `爱芮`：影画 1 的 `[异放]` 基础异常暴击、按 `finalPanel.anomalyMastery` 追加异常暴击率，影画 2 的固定无视防御与 `combatTags: ["ariaDreamtime"]` 控制的额外无视防御
  - `V5 dynamicSnapshot`：`柏妮思` 的 `[余烬]` 额外触发次数 / 倍率、`爱芮` 的 `[异放]` 额外倍率 / 失衡额外倍率
  - `V6 stateSnapshot`：`scenario.stateSnapshot` 已进入公开 contract；当前首批已完成：
    - `爱丽丝`：`[极性强击]` 可通过 `scenario.stateSnapshot` 显式提供 source-specific 结算倍率，并接入 anomaly 路径
    - `雅`：`[霜灼·破]` 已支持 state-aware assumptions 与倍率快照记录，但独立烈霜异常槽仍未并入现有 anomaly / disorder 公式
  - `V7 resolvedSnapshot`：`scenario.resolvedSnapshot` 已接入 resolver，并在当前 contract 下完成前四批高价值来源收口；`柏妮思 M6` 的 `25% 火抗无视` 已可通过 `bucketDeltas.ignoreResistance` 显式提供，`格莉丝 M2`、`简`、`派派`、`时流贤者`、`柳 M2`、`薇薇安 M2` 的异常倍率折算可通过 `multiplierFactors.skillMultiplierFactor` 显式提供。当前可显式提供：
    - `bucketDeltas`：最终 bucket 增量
    - `multiplierFactors.skillMultiplierFactor`：最终结算倍率 factor
  - `薇薇安`：影画 1 的预言目标异常 / 紊乱增伤，影画 2 的以太异常 / 紊乱无视抗性
  - `简`：影画 1 的 `[狂热]` 状态异常精通转增伤、核心被动中“每点异常精通 -> 强击异常暴击率”的自动折算，影画 2 的 `[啮咬]` 目标减防与强击异常暴击伤害，影画 4 的 `[强击] / [紊乱]` 后异常伤害提升
  - `格莉丝`：影画 2 的手雷命中后电抗降低
  - `柳`：影画 1 的 `[洞悉]` 异常精通提升，影画 2 的 `[极性紊乱]` 额外突刺倍率提升，影画 4 的 `[识破]` 目标穿透率提升
- 仍无法直接表达的剩余时间换算与随机增益，继续通过更细的 source-specific `assumptions` 明示
  - disorder 已支持按 `anomalyType` 区分原异常来源，并支持异常精通阈值类条件
- 技能矩阵：当前仅支持 `normal / sheer`，即强攻 / 命破；高频代理人使用 curated 模板，其余强攻 / 命破代理人回退到通用矩阵生成
- source-specific damage view：当前已支持：
  - `爱丽丝 [极性强击]`
  - `雅 [霜灼·破]`
  - `柏妮思 [燃点]/[余烬]`
  - `爱芮 [异放]`
  - `薇薇安 [异放]`
  - 这类条目不会再继续并入主 anomaly / disorder 公式，而是通过独立 view 展示
  - 顶层 `views`、`views.summary` 与 `views.summary.groups[*]` 当前已新增稳定 `caveatSummary`，用于汇总 assumptions 与 unsupported entries
- source-specific utility / resource view：当前已支持：
  - `「月相」-朔`
  - `「电磁暴」-叁式`
  - `时光切片`
  - `家政员`
  - `灼心摇壶`
  - 这类条目不会并入主 damage resolver，而是作为独立 utility 条目暴露
  - 顶层 `views`、`views.summary` 与 `views.summary.groups[*]` 当前已新增稳定 `caveatSummary`，用于汇总 assumptions 与 unsupported entries

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

result.summary
// {
//   baseDamageStat: "sheerForce",
//   baseDamageValue: 1800,
//   expectedTotal: 64534.12,
//   critTotal: 76000.32,
//   noCritTotal: 42018.91,
//   formulaMultipliers: {
//     bonusMultiplier: 1.46,
//     critMultiplier: 1.48,
//     resistanceMultiplier: 0.8,
//     vulnerabilityMultiplier: 1,
//     dazeVulnerabilityMultiplier: 1,
//     sheerBonusMultiplier: 1.3,
//     specialMultiplier: 1,
//   },
//   hasDiagnostics: true,
//   hasSourceNotes: false,
//   hasUnsupportedEffects: false,
//   diagnosticGroups: [{ key: "defaulted-input", label: "默认输入", count: 1 }],
//   sourceNoteGroups: [],
// }

result.diagnosticSummary
// {
//   count: 1,
//   hasDiagnostics: true,
//   hasDefaultedInput: true,
//   hasCoverageGap: false,
//   hasUnsupportedEffect: false,
//   hasFallback: false,
//   kindGroups: [{ key: "defaulted-input", label: "默认输入", count: 1 }],
//   ownerGroups: [{ key: "scenario", count: 1 }],
// }

result.sourceNoteSummary
// {
//   count: 0,
//   hasSourceNotes: false,
//   hasMissingInput: false,
//   hasProcessOnly: false,
//   hasResearchOnly: false,
//   statusGroups: [],
//   ownerGroups: [],
// }

result.effectSummary
// [
//   {
//     effectId: "yixuan-core-selected-skill-bonus",
//     sourceName: "仪玄",
//     label: "指定招式伤害提升",
//     bucket: "增伤",
//     value: "+60%",
//   },
// ]

result.assumptionSummary
// {
//   count: 1,
//   hasAssumptions: true,
// }

result.caveatSummary
// {
//   assumptionCount: 1,
//   unsupportedEffectCount: 0,
//   hasAssumptions: true,
//   hasUnsupportedEffects: false,
// }
```

如果你要做单场景结果展示，不要再自己同时从 `resolvedPanel`、`damage.expected.breakdown`、`diagnostics`、`sourceNotes`、`unsupportedEffects` 拼摘要，优先直接使用 `result.summary`。如果你要生成单场景“增益清单”，也优先读取 `result.effectSummary`，不要继续手工遍历 `trace` 重新聚合 bucket 与数值。如果你要先判断当前单场景结果是否带 diagnostics / source notes / assumptions / unsupported caveat，也优先读取 `result.diagnosticSummary`、`result.sourceNoteSummary`、`result.assumptionSummary`、`result.caveatSummary`；如需兼容旧调用方，也可以继续读取 `result.summary.diagnosticGroups`、`result.summary.sourceNoteGroups` 与 `result.summary.hasUnsupportedEffects`。

如果你要把单场景结果传给 agent / UI，而不想默认携带 `trace / damageParams`，优先使用 compact helper：

```ts
import { compactStaticBuildResult, resolveStaticBuildDamage } from "zzz-data"

const result = resolveStaticBuildDamage(/* ... */)
const compact = compactStaticBuildResult(result)

compact.summary
compact.effectSummary
compact.trace
// undefined
```

当前 `compactStaticBuildResult(result, true)` 才会暴露 `trace / damageParams / diagnostics / sourceNotes`。

如果你在应用层或 Agent 层默认不需要完整 `build`、只需要紧凑投影结果，也可以继续使用 source-view compact helper：

```ts
import {
  compactStaticBuildSourceDamageViewsResult,
  resolveStaticBuildSourceDamageViews,
} from "zzz-data"

const views = resolveStaticBuildSourceDamageViews(/* ... */)
const compactViews = compactStaticBuildSourceDamageViewsResult(views)

compactViews.entries[0].diagnosticSummary
compactViews.entries[0].sourceNoteSummary
compactViews.entries[0].diagnostics
// undefined
compactViews.entries[0].sourceNotes
// undefined
```

当前 `compactStaticBuildSourceDamageViewsResult(views, true)` 才会暴露 `entry.diagnostics / entry.sourceNotes / entry.build`。

如果你需要拿到不应并入主 anomaly / disorder 公式的独立额外结算条目，可使用：

```ts
import { resolveStaticBuildSourceDamageViews } from "zzz-data"

const views = resolveStaticBuildSourceDamageViews({
  loadout: {
    agentId: "1401",
    agentLevel: 60,
  },
  panel: {
    attack: 2800,
    critRate: 0.2,
    critDamage: 0.5,
    anomalyProficiency: 200,
    anomalyMastery: 180,
  },
  scenario: {
    damageType: "anomaly",
    skillTag: "enhancedSpecial",
    damageMultiplier: "500%",
    attribute: "物理",
    stateSnapshot: {
      flags: {
        alicePolarityAssaultState: true,
      },
      values: {
        alicePolarityAssaultDamageRatio: 2.5,
      },
    },
    enemy: {
      defenderBaseDefense: 953,
      defenderResistance: 0.2,
    },
  },
})

views.entries[0]
views.entries[0].metadata.stableKey
views.entries[0].summary

views.summary
// {
//   entryCount: 1,
//   standaloneCount: 1,
//   deltaCount: 0,
//   supportedCount: 1,
//   unsupportedCount: 0,
//   requirementSummary: {
//     count: 2,
//     satisfiedCount: 2,
//     unsatisfiedCount: 0,
//     hasUnsatisfied: false,
//     groups: [
//       { key: "state-flag", count: 1, satisfiedCount: 1, unsatisfiedCount: 0 },
//       { key: "state-value", count: 1, satisfiedCount: 1, unsatisfiedCount: 0 },
//     ],
//   },
//   diagnosticSummary: {
//     count: 2,
//     hasDiagnostics: true,
//     hasDefaultedInput: true,
//     kindGroups: [{ key: "defaulted-input", label: "默认输入", count: 2 }],
//     ownerGroups: [{ key: "loadout", count: 1 }, { key: "scenario", count: 1 }],
//   },
//   sourceNoteSummary: {
//     count: 2,
//     hasSourceNotes: true,
//     statusGroups: [{ key: "resolved", label: "已展开", count: 2 }],
//     ownerGroups: [{ key: "finalPanel", count: 1 }, { key: "stateSnapshot", count: 1 }],
//   },
//   groups: [
//     {
//       key: "standalone",
//       label: "独立结算条目",
//       count: 1,
//       supportedCount: 1,
//       unsupportedCount: 0,
//     },
//   ],
// }
```

如果你需要判断当前 source-specific damage views 是 standalone 还是 delta、是否存在 unsupported 条目、如何分组展示，或者当前整组 views / 某一组 views / 某一条 entry 是否带有 requirement / diagnostics / source notes / assumptions，也不要再自己统计 `entries`，直接使用 `views.summary`、`views.summary.assumptionSummary`、`views.assumptionSummary` 与 `entry.assumptionSummary`。

如果你需要先判断本次 source-specific damage views 涉及了哪些乘区变化，也优先读取：

- `views.summary.effectSummary`

如需兼容旧调用方，也可以继续读取：

- `views.effectSummary`

如果你只想先判断整组 source-specific damage views 是否存在 requirements，也优先读取：

- `views.summary.requirementSummary`

如需兼容旧调用方，也可以继续读取：

- `views.requirementSummary`

如果你只想先判断整组 source-specific damage views 是否存在 diagnostics / source notes，也优先读取：

- `views.summary.diagnosticSummary`
- `views.summary.sourceNoteSummary`

如需兼容旧调用方，也可以继续读取：

- `views.diagnosticSummary`
- `views.sourceNoteSummary`

如果你是按组拆“独立结算 / 主结算差值”两个 section，也不要再先过滤 entries 再自己统计组内 assumptions，直接读取：

```ts
views.summary.groups[0].effectSummary
views.summary.groups[0].assumptionSummary
views.summary.assumptionSummary
views.assumptionSummary
```

如果你只想先判断单条 source-specific damage view 涉及了哪些乘区变化，也优先读取：

- `views.entries[0].effectSummary`

如果你只做单条 source-specific damage view 的结果展示，不需要再通过 `includeDetails` 读取 `entry.build.summary`，优先直接使用：

- `views.entries[0].summary`
- `views.entries[0].requirementSummary`
- `views.entries[0].diagnosticSummary`
- `views.entries[0].sourceNoteSummary`

如果你只想知道当前 source-specific view 有多少前置条件、哪些 requirement kind 已满足 / 未满足，也不要再手工遍历 `requirements[]`，直接使用：

```ts
views.entries[0].requirementSummary
// {
//   count: 2,
//   satisfiedCount: 2,
//   unsatisfiedCount: 0,
//   hasUnsatisfied: false,
//   groups: [
//     {
//       key: "state-flag",
//       count: 1,
//       satisfiedCount: 1,
//       unsatisfiedCount: 0,
//     },
//     {
//       key: "state-value",
//       count: 1,
//       satisfiedCount: 1,
//       unsatisfiedCount: 0,
//     },
//   ],
// }
```

如果你只想知道当前 source-specific view 有多少 diagnostics、是否存在默认输入或 coverage-gap，也不要再手工遍历 `diagnostics[]`，直接使用：

```ts
views.entries[0].diagnosticSummary
// {
//   count: 2,
//   hasDiagnostics: true,
//   hasDefaultedInput: true,
//   hasCoverageGap: false,
//   hasUnsupportedEffect: false,
//   hasFallback: false,
//   kindGroups: [{ key: "defaulted-input", label: "默认输入", count: 2 }],
//   ownerGroups: [
//     { key: "loadout", count: 1 },
//     { key: "scenario", count: 1 },
//   ],
// }
```

如果你只想知道当前 source-specific view 有多少 source notes、是否存在 `missing-input / process-only / research-only`，以及主要来自哪些 owner，也不要再手工遍历 `sourceNotes[]`，直接使用：

```ts
views.entries[0].sourceNoteSummary
// {
//   count: 2,
//   hasSourceNotes: true,
//   hasMissingInput: false,
//   hasProcessOnly: false,
//   hasResearchOnly: false,
//   statusGroups: [{ key: "resolved", label: "已展开", count: 2 }],
//   ownerGroups: [
//     { key: "finalPanel", count: 1 },
//     { key: "stateSnapshot", count: 1 },
//   ],
// }
```

同一份 source-specific view contract 也已在 `zzz-agent` 中通过 `resolve-build-source-damage-views` 高层 tool 暴露，适合直接给 Agent 查询独立额外结算条目。

如果你需要把主 anomaly / disorder 结算和独立额外结算并列查看，可使用：

```ts
import { resolveStaticBuildTriggerMatrix } from "zzz-data"

const matrix = resolveStaticBuildTriggerMatrix({
  loadout: {
    agentId: "1401",
    agentLevel: 60,
  },
  panel: {
    attack: 2800,
    critRate: 0.2,
    critDamage: 0.5,
    anomalyProficiency: 200,
    anomalyMastery: 180,
  },
  scenario: {
    damageType: "anomaly",
    skillTag: "enhancedSpecial",
    damageMultiplier: "500%",
    attribute: "物理",
    stateSnapshot: {
      flags: {
        alicePolarityAssaultState: true,
      },
      values: {
        alicePolarityAssaultDamageRatio: 2.5,
      },
    },
    enemy: {
      defenderBaseDefense: 953,
      defenderResistance: 0.2,
    },
  },
})

matrix.rows.map((row) => row.metadata.stableKey)
// ["main-formula:anomaly", "source-view:alice-polarity-assault"]

matrix.rows[0].metadata.templateSource
// "main-formula"

matrix.rows[1].metadata.sourceStableKey
// "source-view:alice-polarity-assault"

matrix.summary
// {
//   rowCount: 2,
//   mainFormulaCount: 1,
//   sourceViewCount: 1,
//   supportedCount: 2,
//   unsupportedCount: 0,
//   hasSourceViews: true,
//   requirementSummary: {
//     count: 2,
//     satisfiedCount: 2,
//     unsatisfiedCount: 0,
//     hasUnsatisfied: false,
//     groups: [
//       {
//         key: "state-flag",
//         count: 1,
//         satisfiedCount: 1,
//         unsatisfiedCount: 0,
//       },
//       {
//         key: "state-value",
//         count: 1,
//         satisfiedCount: 1,
//         unsatisfiedCount: 0,
//       },
//     ],
//   },
//   diagnosticSummary: {
//     count: 4,
//     hasDiagnostics: true,
//     hasDefaultedInput: true,
//     hasCoverageGap: false,
//     hasUnsupportedEffect: false,
//     hasFallback: false,
//     kindGroups: [{ key: "defaulted-input", label: "默认输入", count: 4 }],
//     ownerGroups: [
//       { key: "loadout", count: 2 },
//       { key: "scenario", count: 2 },
//     ],
//   },
//   sourceNoteSummary: {
//     count: 4,
//     hasSourceNotes: true,
//     hasMissingInput: false,
//     hasProcessOnly: false,
//     hasResearchOnly: false,
//     statusGroups: [{ key: "resolved", label: "已展开", count: 4 }],
//     ownerGroups: [
//       { key: "finalPanel", count: 2 },
//       { key: "stateSnapshot", count: 2 },
//     ],
//   },
//   groups: [
//     {
//       key: "main-formula",
//       label: "主公式结算",
//       count: 1,
//       supportedCount: 1,
//       unsupportedCount: 0,
//     },
//     {
//       key: "source-view",
//       label: "额外来源结算",
//       count: 1,
//       supportedCount: 1,
//       unsupportedCount: 0,
//     },
//   ],
// }
```

如果你需要判断当前 trigger-entry matrix 是否存在 source-view 行、如何分组展示、是否只剩主公式，或者当前整组 rows / 某一组 rows 是否带有 requirements / diagnostics / source notes / assumptions / unsupported caveat，不要再自己统计 `rows`，直接使用 `matrix.summary`、`matrix.summary.effectSummary`、`matrix.summary.caveatSummary`、`matrix.caveatSummary`、`matrix.summary.diagnosticSummary`、`matrix.summary.sourceNoteSummary`、`matrix.summary.assumptionSummary`、`matrix.assumptionSummary` 与 `matrix.summary.groups[*].assumptionSummary`；如需兼容旧调用方，也可以继续读取 `matrix.effectSummary`、`matrix.requirementSummary`、`matrix.diagnosticSummary / matrix.sourceNoteSummary`，尤其是 `matrix.summary.requirementSummary`。

如果你需要生成“本次触发结算涉及的乘区变化”或“触发条目增益清单”，也不要再自己遍历 `rows[*].build.trace`，直接读取：

```ts
matrix.summary.effectSummary
matrix.effectSummary
```

如果你是按 `main-formula / source-view` 拆 section，也不要再自己遍历组内 rows 统计 effect / requirement / diagnostics / source notes / caveat，直接读取：

```ts
matrix.summary.groups[0].effectSummary
matrix.summary.groups[0].requirementSummary
matrix.summary.groups[0].caveatSummary
matrix.summary.groups[0].diagnosticSummary
matrix.summary.groups[0].sourceNoteSummary
matrix.summary.caveatSummary
matrix.caveatSummary
matrix.summary.assumptionSummary
matrix.summary.groups[0].assumptionSummary
matrix.assumptionSummary
```

如果你只想知道某一行 trigger row 的前置条件概况，也直接读取：

```ts
matrix.rows[1].requirementSummary
// {
//   count: 2,
//   satisfiedCount: 2,
//   unsatisfiedCount: 0,
//   hasUnsatisfied: false,
//   groups: [
//     {
//       key: "state-flag",
//       count: 1,
//       satisfiedCount: 1,
//       unsatisfiedCount: 0,
//     },
//     {
//       key: "state-value",
//       count: 1,
//       satisfiedCount: 1,
//       unsatisfiedCount: 0,
//     },
//   ],
// }
```

如果你只想知道某一行 trigger row 的 diagnostics 概况，也直接读取：

```ts
matrix.rows[1].diagnosticSummary
// {
//   count: 2,
//   hasDiagnostics: true,
//   hasDefaultedInput: true,
//   hasCoverageGap: false,
//   hasUnsupportedEffect: false,
//   hasFallback: false,
//   kindGroups: [{ key: "defaulted-input", label: "默认输入", count: 2 }],
//   ownerGroups: [
//     { key: "loadout", count: 1 },
//     { key: "scenario", count: 1 },
//   ],
// }
```

如果你只想知道某一行 trigger row 是否带 assumptions / unsupported caveat，也直接读取：

```ts
matrix.rows[1].caveatSummary
matrix.rows[1].assumptionSummary
```

如果你只想知道某一行 trigger row 的 source-note 概况，也直接读取：

```ts
matrix.rows[1].sourceNoteSummary
// {
//   count: 2,
//   hasSourceNotes: true,
//   hasMissingInput: false,
//   hasProcessOnly: false,
//   hasResearchOnly: false,
//   statusGroups: [{ key: "resolved", label: "已展开", count: 2 }],
//   ownerGroups: [
//     { key: "finalPanel", count: 1 },
//     { key: "stateSnapshot", count: 1 },
//   ],
// }
```

如果你只想知道某一行 trigger row 是否带 assumptions、共有多少条，也直接读取：

```ts
matrix.rows[1].assumptionSummary
```

如果你需要拿到不进入主伤害公式的独立回能 / 回能速率条目，可使用：

```ts
import { resolveStaticBuildSourceUtilityViews } from "zzz-data"

const utilityViews = resolveStaticBuildSourceUtilityViews({
  loadout: {
    agentId: "1021",
    wEngineId: "12003",
    wEngineRefinement: 1,
  },
})

utilityViews.entries[0]
utilityViews.entries[0].metadata.stableKey
utilityViews.entries[0].requirementSummary
utilityViews.summary
// {
//   entryCount: 1,
//   triggerCount: 1,
//   rateCount: 0,
//   supportedCount: 1,
//   unsupportedCount: 0,
//   requirementSummary: {
//     count: 2,
//     satisfiedCount: 2,
//     unsatisfiedCount: 0,
//     hasUnsatisfied: false,
//     groups: [
//       { key: "trigger", count: 1, satisfiedCount: 1, unsatisfiedCount: 0 },
//       { key: "cooldown", count: 1, satisfiedCount: 1, unsatisfiedCount: 0 },
//     ],
//   },
//   diagnosticSummary: {
//     count: 0,
//     hasDiagnostics: false,
//     kindGroups: [],
//     ownerGroups: [],
//   },
//   sourceNoteSummary: {
//     count: 0,
//     hasSourceNotes: false,
//     statusGroups: [],
//     ownerGroups: [],
//   },
//   groups: [
//     {
//       key: "trigger",
//       label: "按次触发条目",
//       count: 1,
//       supportedCount: 1,
//       unsupportedCount: 0,
//     },
//   ],
// }
```

如果你需要判断当前 source-specific utility views 是 trigger 还是 rate、是否存在 unsupported 条目、如何分组展示，或者当前整组 utility views / 某一条 entry 是否带有 requirement / diagnostics / source notes / assumptions / caveat，不要再自己统计 `entries`，直接使用 `utilityViews.summary`、`utilityViews.summary.assumptionSummary`、`utilityViews.summary.caveatSummary`、`utilityViews.assumptionSummary`、`utilityViews.caveatSummary`、`entry.assumptionSummary` 与 `entry.caveatSummary`。

如果你只想先判断整组 utility views 是否带 effect summary，也优先读取：

- `utilityViews.summary.effectSummary`

如需兼容旧调用方，也可以继续读取：

- `utilityViews.effectSummary`

当前 top-level effect summary 固定返回空数组，不要自己伪造非空 utility 乘区清单。

如果你只想先判断整组 utility views 是否存在 requirements，也优先读取：

- `utilityViews.summary.requirementSummary`

如需兼容旧调用方，也可以继续读取：

- `utilityViews.requirementSummary`

如果你只想先判断整组 utility views 是否存在 diagnostics / source notes，也优先读取：

- `utilityViews.summary.diagnosticSummary`
- `utilityViews.summary.sourceNoteSummary`

如需兼容旧调用方，也可以继续读取：

- `utilityViews.diagnosticSummary`
- `utilityViews.sourceNoteSummary`

如果你是按组拆“按次触发 / 按速率”两个 section，也不要再先过滤 entries 再自己统计组内 assumptions，直接读取：

```ts
utilityViews.summary.groups[0].effectSummary
utilityViews.summary.groups[0].assumptionSummary
utilityViews.summary.assumptionSummary
utilityViews.summary.caveatSummary
utilityViews.caveatSummary
utilityViews.entries[0].caveatSummary
```

当前 group-level effect summary 同样固定返回空数组；如果你只判断单条 utility entry，仍优先读取：

- `utilityViews.entries[0].effectSummary`

当前 entry-level effect summary 也固定返回空数组，不要在调用方再手工补默认值。

如果你需要稳定读取某条 utility entry 的数值 / 单位 / 目标 / 触发模式摘要，优先使用：

```ts
utilityViews.entries[0].summary
```

如果你需要稳定读取某条 utility entry 的触发条件 / 适用条件 / 冷却摘要，优先使用：

```ts
utilityViews.entries[0].requirements
utilityViews.entries[0].requirementSummary
```

如果你是按组拆“按次触发 / 按速率”两个 section，也不要再先过滤 entries 再自己统计组内 requirement / diagnostics / source notes，直接读取：

```ts
utilityViews.summary.groups[0].requirementSummary
utilityViews.summary.groups[0].diagnosticSummary
utilityViews.summary.groups[0].sourceNoteSummary
```

如果你是按组拆“独立结算 / 增量结算”两个 section，也不要再先过滤 entries 再自己统计组内 requirement / diagnostics / source notes，直接读取：

```ts
views.summary.groups[0].requirementSummary
views.summary.groups[0].diagnosticSummary
views.summary.groups[0].sourceNoteSummary
```

不要只靠 `triggerLabel / conditionLabel / cooldownSeconds` 再自行拼 requirement 逻辑。

如果你只想知道某一条 utility entry 的 diagnostics 概况，也直接读取：

```ts
utilityViews.entries[0].diagnosticSummary
// {
//   count: 0,
//   hasDiagnostics: false,
//   hasDefaultedInput: false,
//   hasCoverageGap: false,
//   hasUnsupportedEffect: false,
//   hasFallback: false,
//   kindGroups: [],
//   ownerGroups: [],
// }
```

如果你只想知道某一条 utility entry 的 source-note 概况，也直接读取：

```ts
utilityViews.entries[0].sourceNoteSummary
// {
//   count: 0,
//   hasSourceNotes: false,
//   hasMissingInput: false,
//   hasProcessOnly: false,
//   hasResearchOnly: false,
//   statusGroups: [],
//   ownerGroups: [],
// }
```

如果你默认不需要 source-view 的完整 `build`、只需要可直接展示的轻量结果，可直接使用：

```ts
import {
  compactStaticBuildSourceDamageViewsResult,
  compactStaticBuildSourceUtilityViewsResult,
} from "zzz-data"

const compactDamageViews = compactStaticBuildSourceDamageViewsResult(views)
const compactUtilityViews =
  compactStaticBuildSourceUtilityViewsResult(utilityViews)
```

其中：

- `compactStaticBuildSourceDamageViewsResult()` 默认不展开 entry-level `build`
- 只有显式传 `includeDetails = true` 时，才会保留完整 `build`
- `compactStaticBuildSourceUtilityViewsResult()` 会统一返回与高层 tool 一致的轻量 utility entry shape
- compact utility entry 也会稳定保留 `entry.effectSummary`；当前固定返回空数组，不要在调用方再手工补默认值

同一份 source-specific utility / resource view contract 也已在 `zzz-agent` 中通过 `resolve-build-source-utility-views` 高层 tool 暴露，适合直接给 Agent 查询独立回能 / 喧响值条目。

如果你需要一次性拿到当前构筑的全部 source-specific 条目，可使用：

```ts
import { resolveStaticBuildSourceEntries } from "zzz-data"

const collection = resolveStaticBuildSourceEntries({
  mode: "full-buff",
  loadout: {
    agentId: "1501",
    wEngineId: "14117",
    agentLevel: 60,
    wEngineRefinement: 1,
  },
  panel: {
    attack: 2950,
    baseAttack: 1200,
    critRate: 0.2,
    critDamage: 0.5,
    anomalyProficiency: 150,
  },
  scenario: {
    damageType: "disorder",
    skillTag: "enhancedSpecial",
    anomalyType: "ether",
    remainingTime: 5,
    attribute: "以太",
    dynamicSnapshot: {
      values: {
        ariaExflowDamageRatio: 0.45,
        ariaStunnedDamageRatio: 0.2,
      },
    },
    enemy: {
      defenderBaseDefense: 953,
      defenderResistance: 0.2,
      isStunned: true,
    },
  },
})

collection.entries.map((entry) => entry.metadata.stableKey)
// [
//   "source-utility:flamemaker-shaker-offfield-energy-regen",
//   "source-view:aria-exflow",
// ]

collection.summary
// {
//   entryCount: 2,
//   sourceDamageViewCount: 1,
//   sourceUtilityViewCount: 1,
//   supportedCount: 2,
//   unsupportedCount: 0,
//   isUtilityOnly: false,
//   diagnosticSummary: {
//     count: 2,
//     hasDiagnostics: true,
//     hasDefaultedInput: true,
//     kindGroups: [{ key: "defaulted-input", label: "默认输入", count: 2 }],
//     ownerGroups: [{ key: "loadout", count: 1 }, { key: "scenario", count: 1 }],
//   },
//   sourceNoteSummary: {
//     count: 2,
//     hasSourceNotes: true,
//     statusGroups: [{ key: "resolved", label: "已展开", count: 2 }],
//     ownerGroups: [{ key: "dynamicSnapshot", count: 2 }],
//   },
//   groups: [
//     { key: "source-damage-view", label: "额外结算条目", count: 1, ... },
//     { key: "source-utility-view", label: "回能 / utility 条目", count: 1, ... },
//   ],
// }
```

`resolveStaticBuildSourceEntries()` 的规则是：

- 不传 `scenario` 时，只返回 utility entries
- `anomaly / disorder` 场景下，可同时返回 source damage view + utility view
- `normal / sheer` 场景下，保持 utility-only，不把它们伪装成 source damage collection
- `collection.summary` 已直接给出 source damage / source utility 计数、supported/unsupported 计数、utility-only 判定、分组摘要，以及聚合后的 `effectSummary / sourceDamageRequirementSummary / sourceUtilityRequirementSummary / caveatSummary / diagnosticSummary / sourceNoteSummary`；上层不需要再自行遍历 mixed entries 统计乘区变化、requirement / caveat / diagnostics / source notes。兼容旧调用方时，也可以继续读取 `collection.effectSummary / collection.sourceDamageRequirementSummary / collection.sourceUtilityRequirementSummary`
- `collection.summary.caveatSummary` 与 `collection.caveatSummary` 已直接给出整组 mixed collection 的 assumptions / unsupported 聚合；如果只想先判断当前 collection 是否带 caveat，不要再手工组合 `collection.assumptions.length` 与 `collection.summary.unsupportedCount`
- `collection.summary.assumptionSummary` 与 `collection.assumptionSummary` 已直接给出整组 mixed collection 的 assumptions 计数；如果只想先判断当前 collection 是否带 assumptions，不要再手工统计 `collection.assumptions.length`
- 如果 `collection.entries[*]` 中当前条目是 source-damage-view entry，也优先读取 `entry.summary` 获取 `expectedTotal / critTotal / nonCritTotal / isAnomalyLike / isDisorderLike`，不要只盯着 `entry.damage`
- 如果 `collection.entries[*]` 中当前条目是 utility entry，也优先读取 `entry.summary` 获取数值 / 单位 / 目标 / 触发模式摘要，不要再散读 `value / unit / targetScope / resolutionMode`
- 如果只想先判断某一条 mixed entry 是否带 unsatisfied requirements，也优先读取 `entry.requirementSummary`，不要再手工遍历 `entry.requirements`
- 如果只想先判断某一条 mixed entry 是否带 diagnostics，也优先读取 `entry.diagnosticSummary`，不要再手工遍历 `entry.diagnostics`
- 如果只想先判断某一条 mixed entry 是否带 source notes，也优先读取 `entry.sourceNoteSummary`，不要再手工遍历 `entry.sourceNotes`
- 如果只想先判断某一条 mixed entry 是否带 assumptions，也优先读取 `entry.assumptionSummary`，不要再手工统计 `entry.assumptions.length`
- 如果只想先判断某一条 mixed entry 是否带 caveat，也优先读取 `entry.caveatSummary`，不要再手工组合 `entry.assumptions.length` 与 `entry.supported`
- 如果只想先判断某一条 mixed entry 是否带 effect summary，也优先读取 `entry.effectSummary`；当前 utility entry 固定返回空数组，不要再按 `entryKind` 手工补默认值
- 如果只想先判断整组 mixed collection 是否存在 diagnostics / source notes，也优先读取 `collection.summary.diagnosticSummary / collection.summary.sourceNoteSummary`；如需兼容旧调用方，也可以继续读取 `collection.diagnosticSummary / collection.sourceNoteSummary`

如果你只想先判断当前额外来源条目整体涉及了哪些乘区变化，也优先读取：

- `collection.summary.effectSummary`

如需兼容旧调用方，也可以继续读取：

- `collection.effectSummary`

如果你需要分别读取 mixed collection 里 source-damage-view / source-utility-view 两类条目的 requirement 分布，也不要自己遍历 `entries[*].requirements`，直接读取：

```ts
collection.summary.sourceDamageRequirementSummary
collection.summary.sourceUtilityRequirementSummary
```

如果你是按组拆“额外结算条目 / 回能条目”两个 section，也不要再先过滤 entries 再自己统计组内 diagnostics / source notes，直接读取：

```ts
collection.summary.groups[0].effectSummary
collection.summary.groups[0].caveatSummary
collection.summary.groups[0].assumptionSummary
collection.summary.assumptionSummary
collection.summary.effectSummary
collection.summary.groups[0].diagnosticSummary
collection.summary.groups[0].sourceNoteSummary
collection.summary.groups[0].sourceDamageRequirementSummary
collection.summary.groups[0].sourceUtilityRequirementSummary
collection.entries[0].summary
collection.entries[0].effectSummary
collection.entries[0].requirementSummary
collection.entries[0].diagnosticSummary
collection.entries[0].sourceNoteSummary
collection.entries[0].assumptionSummary
collection.entries[0].caveatSummary
```

如果你只想先判断某一组 mixed collection 是否带 effect summary，也优先读取：

- `collection.summary.groups[*].effectSummary`

如果你在应用层或 Agent 层默认不需要完整 `build`、只需要紧凑投影结果，可直接使用 `V37` 下沉到 `zzz-data` 的 compact helper：

```ts
import {
  compactStaticBuildSkillMatrixResult,
  compactStaticBuildSourceEntryCollection,
  compactStaticBuildTriggerMatrixResult,
} from "zzz-data"

const compactMatrix = compactStaticBuildSkillMatrixResult(matrix)
const compactTriggerMatrix =
  compactStaticBuildTriggerMatrixResult(triggerMatrix)
const compactEntries = compactStaticBuildSourceEntryCollection(collection)
```

这三个 helper 会保留：

- 顶层 `summary`
- 行级 / 条目级各类 `*Summary`
- `assumptions`
- 轻量 `damage`

其中：

- `compactStaticBuildSkillMatrixResult(matrix)` 默认不带 `row.diagnostics / row.sourceNotes / row.build`
- `compactStaticBuildTriggerMatrixResult(matrix)` 默认不带 `row.diagnostics / row.sourceNotes / row.build`

只有显式传 `includeDetails = true` 时，才会带上对应底层明细结果。

source view 条目现在也会返回结构化 `diagnostics` 与 `sourceNotes`，适合直接区分：

- 哪些默认值被自动补齐
- 哪些 source 仍是 coverage gap / unsupported-effect
- 缺少哪个 snapshot / panel key
- 当前来源是已展开、真动态过程还是 `research-only`

拿到结果后，通常直接消费这些字段：

```ts
result.profile.id
// "yixuan-sheer"

result.resolvedPanel.baseDamageStat
// "sheerForce"

result.resolvedBuckets.bonusDamageSum
// 0.76

result.sourceNotes[0]
// {
//   owner: "dynamicSnapshot",
//   status: "missing-input",
//   guidance: { kind: "provide-input", target: "dynamicSnapshot" },
//   keys: [...],
//   message: "..."
// }

result.diagnostics[0]
// { kind: "defaulted-input", owner: "scenario", keys: [...], message: "..." }

result.damage.expected.total
// number
```

`result.diagnostics` 当前已可直接区分：

- `defaulted-input`
- `coverage-gap`
- `unsupported-effect`

`result.sourceNotes[].guidance` 当前已可直接区分：

- `provide-input`
- `input-applied`
- `keep-process-only`
- `keep-research-only`

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

matrix.summary
// {
//   rowCount: 21,
//   baseDamageStat: "attack",
//   baseDamageValue: 3200,
//   attack: 3200,
//   critRate: 0.7,
//   critDamage: 1.4,
//   penetrationRate: 0,
//   penetrationValue: 0,
//   commonBuckets: {
//     bonusDamageSum: 0.4,
//     critRate: 0.15,
//   },
//   variableBuckets: ["attackPercent", "flatAttack"],
//   commonFormulaMultipliers: {
//     bonusMultiplier: 1.4,
//     critMultiplier: 1.98,
//     defenseMultiplier: 0.4545,
//     resistanceMultiplier: 0.8,
//   },
//   variableFormulaMultipliers: ["baseDamage"],
//   assumptionSummary: {
//     count: 2,
//     hasAssumptions: true,
//   },
// }

matrix.diagnosticSummary
// {
//   count: 42,
//   hasDiagnostics: true,
//   hasDefaultedInput: true,
//   hasCoverageGap: false,
//   hasUnsupportedEffect: false,
//   hasFallback: false,
//   kindGroups: [{ key: "defaulted-input", label: "默认输入", count: 42 }],
//   ownerGroups: [
//     { key: "loadout", count: 21 },
//     { key: "scenario", count: 21 },
//   ],
// }

matrix.sourceNoteSummary
// {
//   count: 0,
//   hasSourceNotes: false,
//   hasMissingInput: false,
//   hasProcessOnly: false,
//   hasResearchOnly: false,
//   statusGroups: [],
//   ownerGroups: [],
// }

matrix.summary.groups[0]
// {
//   key: "普通攻击",
//   label: "普通攻击",
//   count: 12,
//   commonBuckets: {
//     critRate: 0.15,
//   },
//   variableBuckets: ["attackPercent", "flatAttack"],
//   commonFormulaMultipliers: {
//     bonusMultiplier: 1.4,
//     critMultiplier: 1.98,
//     defenseMultiplier: 0.4545,
//     resistanceMultiplier: 0.8,
//   },
//   variableFormulaMultipliers: ["baseDamage"],
//   effectSummary: [
//     {
//       effectId: "zhu-yuan-w-engine-crit-rate",
//       sourceName: "防暴者Ⅵ型",
//       label: "音擎被动：暴击率提升",
//       bucket: "暴击率",
//       value: "+15%",
//       appliedRowCount: 12,
//       totalRowCount: 12,
//       appliesToAllRows: true,
//       condition: "当前矩阵全部生效",
//     },
//   ],
//   assumptionSummary: {
//     count: 24,
//     hasAssumptions: true,
//   },
//   diagnosticSummary: {
//     count: 24,
//     hasDiagnostics: true,
//     hasDefaultedInput: true,
//     hasCoverageGap: false,
//     hasUnsupportedEffect: false,
//     hasFallback: false,
//     kindGroups: [{ key: "defaulted-input", label: "默认输入", count: 24 }],
//     ownerGroups: [
//       { key: "loadout", count: 12 },
//       { key: "scenario", count: 12 },
//     ],
//   },
//   sourceNoteSummary: {
//     count: 0,
//     hasSourceNotes: false,
//     hasMissingInput: false,
//     hasProcessOnly: false,
//     hasResearchOnly: false,
//     statusGroups: [],
//     ownerGroups: [],
//   },
// }

matrix.effectSummary[0]
// {
//   effectId: "zhu-yuan-core-suppression",
//   sourceName: "朱鸢",
//   label: "核心被动：压制模式强化霰弹增伤",
//   bucket: "增伤",
//   value: "+40%",
//   appliedRowCount: 21,
//   totalRowCount: 21,
//   appliesToAllRows: true,
//   condition: "当前矩阵全部生效",
// }

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

matrix.rows[0].summary
// {
//   baseDamageStat: "attack",
//   baseDamageValue: 3200,
//   expectedTotal: 2689.288,
//   critTotal: 3259.488,
//   noCritTotal: 1643.2,
//   formulaMultipliers: {
//     bonusMultiplier: 1.4,
//     critMultiplier: 1.98,
//     defenseMultiplier: 0.4545,
//     resistanceMultiplier: 0.8,
//   },
//   assumptionCount: 2,
//   diagnosticCount: 2,
//   sourceNoteCount: 0,
//   unsupportedEffectCount: 0,
//   hasDiagnostics: true,
//   hasSourceNotes: false,
//   hasUnsupportedEffects: false,
//   hasDefaultedInput: true,
//   hasCoverageGap: false,
//   hasUnsupportedEffect: false,
//   hasFallback: false,
//   hasMissingInputSourceNote: false,
//   hasProcessOnlySourceNote: false,
//   hasResearchOnlySourceNote: false,
// }

matrix.rows[0].diagnosticSummary
// {
//   count: 2,
//   hasDiagnostics: true,
//   hasDefaultedInput: true,
//   hasCoverageGap: false,
//   hasUnsupportedEffect: false,
//   hasFallback: false,
//   kindGroups: [{ key: "defaulted-input", label: "默认输入", count: 2 }],
//   ownerGroups: [
//     { key: "loadout", count: 1 },
//     { key: "scenario", count: 1 },
//   ],
// }

matrix.rows[0].sourceNoteSummary
// {
//   count: 0,
//   hasSourceNotes: false,
//   hasMissingInput: false,
//   hasProcessOnly: false,
//   hasResearchOnly: false,
//   statusGroups: [],
//   ownerGroups: [],
// }

matrix.rows[0].assumptionSummary
// {
//   count: 2,
//   hasAssumptions: true,
// }

matrix.rows[0].requirementSummary
// {
//   count: 0,
//   satisfiedCount: 0,
//   unsatisfiedCount: 0,
//   hasUnsatisfied: false,
//   groups: [],
// }

matrix.rows[0].caveatSummary
// {
//   assumptionCount: 2,
//   unsupportedEffectCount: 0,
//   hasAssumptions: true,
//   hasUnsupportedEffects: false,
// }
```

如果你要生成矩阵顶部“乘区汇总”，不要再自己遍历 `rows` 统计 `commonBuckets / commonFormulaMultipliers`，直接使用 `matrix.summary`。如果你要先判断整张矩阵是否带 requirements，也优先读取 `matrix.summary.requirementSummary`；如需兼容旧调用方，也可以继续读取 `matrix.requirementSummary`；当前 skill matrix 的 top-level requirement summary 固定是空聚合，不要自己伪造技能 requirement。 如果你要先判断整张矩阵是否带 assumptions，也优先读取 `matrix.summary.assumptionSummary`；如需兼容旧调用方，也可以继续读取 `matrix.assumptionSummary`。如果你要先判断整张矩阵是否带 assumptions / unsupported coverage gap，也优先读取 `matrix.summary.caveatSummary`；如需兼容旧调用方，也可以继续读取 `matrix.caveatSummary`。如果你要先判断整张矩阵是否存在 diagnostics / source notes，也优先读取 `matrix.summary.diagnosticSummary / matrix.summary.sourceNoteSummary`；如需兼容旧调用方，也可以继续读取 `matrix.diagnosticSummary / matrix.sourceNoteSummary`。如果你要按 group 拆 section，也优先读取 `matrix.summary.groups[*].requirementSummary / matrix.summary.groups[*].assumptionSummary`；如需兼容旧调用方，也可以继续读取 `matrix.summary.groups[*].assumptions`；group-level requirement summary 当前同样固定是空聚合。如果你要生成“增益清单”，也优先读取 `matrix.summary.effectSummary`；如需兼容旧调用方，也可以继续读取 `matrix.effectSummary`。如果你只关心某一行的 effect 概况，也优先读取 `row.effectSummary`。如果你只关心某一行的 requirements 概况，也优先读取 `row.requirementSummary`；当前 row-level requirement summary 也固定是空聚合，不要继续手工补默认值。如果你只关心某一行的 assumptions 概况，也优先读取 `row.assumptionSummary`；如需兼容旧调用方，也可以继续读取 `row.assumptions`。如果你只关心某一行的公式乘区摘要和 flag/count，也不要再请求 `includeDetails` 去读 `row.build.summary`，直接读取 `row.summary`。默认 compact matrix row 不再携带 `row.diagnostics / row.sourceNotes`；如果你只关心某一行的 diagnostics / source notes / caveats 概况，也不要自己遍历明细数组，直接读取 `row.diagnosticSummary / row.sourceNoteSummary / row.caveatSummary`；只有确实要逐条展开时，再用 `includeDetails = true` 读取 `row.diagnostics / row.sourceNotes / row.build`。

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

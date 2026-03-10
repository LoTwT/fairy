# zzz-data

Zenless Zone Zero 数据与伤害计算库。

## 导出内容

包入口 `src/index.ts` 当前导出六类内容：

- `calculator`：伤害计算函数与类型
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
- `src/cleaned/` 提供不改 raw shape 的 helper layer，统一解释倍率桶、版本展示文本、默认版本选择，以及 `DA` / `SD` / `TS` 的标准化消费视图
- `selectEncounterByEnemyName()` 在模糊匹配命中多个敌人时不会猜测，会返回候选名列表供上层继续决策
- `buildSDDamageContext()` / `buildTSDamageContext()` 会同时保留 enemy-level `elementMultiplier` 与 side-level `sideElementMultiplier`；如果两者不一致，不在 cleaned layer 擅自合并语义
- `RichTextString` 字段保留源站富文本标记，不保证是纯文本
- `versionTime` 是展示用时间区间字符串，不保证可机器解析
- `EnemyBase.image` 是资源 slug/key，不是完整图片 URL
- `Enemy*.type` 当前只收敛为已观察到的 raw category code（`0 | 1`），不假设其完整业务含义
- `game-modes` 中若看到 `mult` / `altHp` / `hp60k` / `versionAnomMult` 一类字段，它们属于发布 raw shape，语义说明见源码注释与仓库文档 `docs/naming.md`

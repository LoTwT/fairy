# 架构说明

## 项目结构

```
packages/zzz-data/
├── source.xlsx              # 数据源（16 个工作表）
├── scripts/generate/         # 生成脚本
│   ├── index.ts             # 主入口（读 xlsx → 写 data/xlsx/*.json）
│   ├── config.ts            # worksheetConfigs 字段映射（source of truth）
│   └── types/               # xlsx 结构的内部类型（由 generate 脚本产出，仅作历史参考，不对外暴露）
├── scripts/crawl/            # 爬虫脚本
│   ├── index.ts             # 爬虫主入口（聚合 tasks，统一执行）
│   ├── shared.ts            # 工具函数（fetchStatic/fetchJson/fetchDynamic/batchProcess/decodeSvelteKitData）
│   ├── gachabase.ts         # gachabase.net 爬取任务（agent 列表 + 详情）
│   └── buhflipexplode.ts    # buhflipexplode.com 爬取任务
├── tests/generate.test.ts   # 结构一致性测试（xlsx ↔ config ↔ JSON）
├── tests/calculator/        # 伤害计算模块测试
│   ├── factors.test.ts      # 共享乘区（防御区、抗性区等）
│   ├── normal.test.ts       # 常规伤害
│   ├── sheer.test.ts        # 贯穿伤害
│   ├── anomaly.test.ts      # 异常伤害
│   └── disorder.test.ts     # 紊乱伤害
├── data/xlsx/*.json         # 生成的 JSON 数据（16 个文件）
├── data/crawl/              # 爬虫输出的 JSON 数据
│   ├── en/                  # 英文数据
│   │   ├── gachabase-agents.json        # agent 基础列表（id/slug/name/rarity/specialty/attributes/attackTypes）
│   │   └── gachabase-agent-details.json # agent 详情（stats/skills/coreSkills/mindscapes/skins/potentialVisions 等）
│   └── zh-CN/               # 中文数据（同上）
├── src/calculator/          # 伤害计算模块（纯函数，可导出）
│   ├── types.ts             # 所有参数/返回类型
│   ├── factors.ts           # 各乘区独立函数（可自由组合）
│   ├── normal.ts            # calcNormalDamage pipeline
│   ├── sheer.ts             # calcSheerDamage pipeline
│   ├── anomaly.ts           # calcAnomalyDamage pipeline
│   ├── disorder.ts          # calcDisorderDamage pipeline
│   └── index.ts             # re-export
└── src/index.ts             # 公开类型入口（手动维护，与数据源无关）
```

## 规格文档（docs/specs/）

- [`damage-calculation.md`](../docs/specs/damage-calculation.md) — 四种伤害类型（常规/贯穿/异常/紊乱）的乘区公式、TypeScript 类型签名与参考数值

## 计算器模块（src/calculator/）

基于 [NGA 伤害计算帖](https://ngabbs.com/read.php?tid=44468012) 实现的纯函数伤害计算库。

**设计原则：Factor Pipeline（可组合）**

各乘区计算函数单独导出（`factors.ts`），标准伤害类型是预组合的 pipeline。当出现特殊机制时可直接组合底层函数，无需修改标准函数签名：

```typescript
// 跳过防御区、追加自定义乘区
const base = calcBaseDamage(params)
const bonus = calcBonusMultiplier(params.bonusDamageSum)
const crit = calcExpectedCritMultiplier(params.crit)
// defense = 跳过
const resistance = calcResistanceMultiplier(params.resistance)
const custom = myCustomMultiplier(params)
const total = base * bonus * crit * resistance * custom
```

**公开 API（src/index.ts 导出）**：

- 类型：`AnomalyType`、`DefenseParams`、`ResistanceParams`、`VulnerabilityParams`、`DazeVulnerabilityParams`、`CritParams`、`NormalDamageParams`、`SheerDamageParams`、`AnomalyDamageParams`、`DisorderDamageParams`、`DamageResult`
- 乘区函数：`calcDefenseMultiplier`、`calcResistanceMultiplier`、`calcVulnerabilityMultiplier`、`calcDazeVulnerabilityMultiplier`、`calcExpectedCritMultiplier`、`calcSheerBonusMultiplier`、`calcAnomalyProficiencyMultiplier`、`calcDamageLevelMultiplier`、`calcDisorderDamageMultiplier` 等
- Pipeline 函数：`calcNormalDamage`、`calcSheerDamage`、`calcAnomalyDamage`、`calcDisorderDamage`（各含 `Crit`/`NoCrit` 变体）

## 生成脚本设计

> **⚠ 冻结状态**：`scripts/generate/` 当前不再修改。xlsx 数据源暂时不可用，脚本与产物保留供参考。`scripts/generate/types/` 中的字段定义、JSDoc 注释、类型结构可作为重建公开类型的参考依据。

- `worksheetConfigs` 数组定义了 16 个工作表的完整字段映射（中文列头 → 英文字段名 + 类型）
- 三阶段执行：读取所有工作表 → 注入派生字段 → 写 JSON 文件
- **derivedFields 机制**：部分表（agent-skill、agent-cinema、agent-skill-desc）只有代理人名称没有 ID，通过 `derivedFields` 从 agent-stat 跨表注入 `agentId`
- **内部类型**：generate 脚本将 xlsx 列结构写入 `scripts/generate/types/`，仅供内部参考，不对外暴露
- **公开类型**：`src/index.ts` 手动维护，与数据源无关，后续随爬虫数据结构确定后重建

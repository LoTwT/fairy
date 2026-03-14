# 架构说明

## 仓库级 AI 协作文件

```
.
├── docs/
│   ├── index.md           # 文档索引
│   └── ai-guide.md        # Codex App 与 Claude Code 共享说明
├── AGENTS.md              # Codex App 入口文件（薄入口，指向 docs/）
├── CLAUDE.md              # Claude Code 入口文件（薄入口，指向 docs/）
├── .agents/skills/        # 仓库共享 skills
└── .claude/               # Claude Code 本地设置
```

约定：

- 项目知识、命令、工作流统一维护在 `docs/`
- `AGENTS.md` 与 `CLAUDE.md` 只保留工具专属入口约定，避免双份维护
- 共享技能优先放在 `.agents/skills/`，由两个工具共同引用
- Claude Code 的权限或本地运行设置放在 `.claude/`

## 项目结构

```
packages/zzz-data/
├── source.xlsx              # 数据源（16 个工作表）
├── scripts/generate/         # 生成脚本
│   ├── index.ts             # 主入口（读 xlsx → 写 data/xlsx/*.json）
│   ├── config.ts            # worksheetConfigs 字段映射（source of truth）
│   └── types/               # xlsx 结构的内部类型（由 generate 脚本产出，仅作历史参考，不对外暴露）
├── scripts/merge/            # 合并脚本
│   ├── index.ts             # 合并主入口（聚合所有 merge 任务）
│   ├── shared.ts            # 工具函数（readRaw/writeOut，RAW_DIR/OUT_DIR 常量）
│   ├── gachabase.ts         # gachabase 合并任务（裁剪纯展示字段，输出 data/{locale}/*.json）
│   └── buhflipexplode.ts    # buhflipexplode 合并任务（内联敌人属性，输出 DA/SD/TS + buffs）
├── scripts/crawl/            # 爬虫脚本
│   ├── index.ts             # 爬虫主入口（聚合 tasks，统一执行）
│   ├── shared.ts            # 工具函数（fetchStatic/fetchJson/fetchDynamic/batchProcess/decodeSvelteKitData）
│   ├── gachabase.ts         # gachabase.net 爬取任务（agent 列表 + 详情）
│   ├── buhflipexplode.ts    # buhflipexplode.com 爬取任务
│   └── mihoyo-wiki.ts       # baike.mihoyo.com 爬取任务（危局强袭战）
├── tests/generate.test.ts   # 结构一致性测试（xlsx ↔ config ↔ JSON）
├── tests/build/
│   ├── resolver.test.ts     # Static Build Resolver 当前单场景测试（normal / sheer / profile / 扩展支持名单）
│   └── matrix.test.ts       # Static Build Resolver 当前技能矩阵测试（全技能 / 全段 / 新代理人模板）
├── tests/cleaned/          # cleaned/helper layer 测试
│   ├── deadly-assault.test.ts # DA buff / enemy helper 测试
│   ├── encounter.test.ts   # encounter 选择与 damage-context 测试
│   ├── enemy.test.ts       # elementMult map / damageContext helper 测试
│   ├── shiyu-defense.test.ts # SD 标准化视图 helper 测试
│   ├── threshold-simulation.test.ts # TS 标准化视图 helper 测试
│   └── versions.test.ts    # versionTime / latest version helper 测试
├── tests/terms.test.ts      # canonical 术语映射与属性桶测试
├── tests/text.test.ts       # rich text 清洗 helper 测试
├── tests/game-modes.test.ts # game-modes raw category code contract 测试
├── tests/gachabase/         # gachabase 属性公式测试
│   ├── agent.test.ts        # Agent 属性公式测试
│   ├── bangboo.test.ts      # Bangboo 属性公式测试
│   └── w-engine.test.ts     # 音擎属性公式测试
├── tests/calculator/        # 伤害计算模块测试
│   ├── factors.test.ts      # 共享乘区（防御区、抗性区等）
│   ├── normal.test.ts       # 常规伤害
│   ├── sheer.test.ts        # 贯穿伤害
│   ├── anomaly.test.ts      # 异常伤害
│   └── disorder.test.ts     # 紊乱伤害
├── data/xlsx/*.json         # 生成的 JSON 数据（16 个文件，仅内部使用，不发布）
├── data/raw/                # 爬虫原始输出（仅内部使用，不发布）
│   ├── en/
│   │   ├── gachabase/           # agents / agent-details / w-engines / w-engine-details / bangboo / drive-discs
│   │   └── buhflipexplode/      # shiyu-defense / deadly-assault / threshold-simulation / enemies / buffs
│   └── zh-CN/
│       ├── gachabase/           # 同 en/gachabase/，中文文本
│       └── mihoyo-wiki/
│           └── deadly-assault.json  # 危局强袭战历史期数（增益/Boss 弱点·抗性·机制·星级目标）
├── data/                    # merge 脚本生成的整合数据（对外发布）
│   ├── en/                      # 英文数据
│   │   ├── agents.json
│   │   ├── agent-details.json
│   │   ├── w-engines.json
│   │   ├── w-engine-details.json
│   │   ├── bangboo.json
│   │   ├── drive-discs.json
│   │   ├── buffs.json               # 增益效果（来源：raw/en/buhflipexplode/）
│   │   ├── deadly-assault.json      # 危局强袭战（双源合并，内联 boss 属性）
│   │   ├── shiyu-defense.json       # 式舆防线（内联敌人属性 + side hp）
│   │   └── threshold-simulation.json # 零号业绩（内联 boss + 普通敌人属性）
│   └── zh-CN/                   # 中文数据（同 en/ 结构，增量含 DA wiki 弱点/抗性/机制）
│       ├── agents.json
│       ├── agent-details.json
│       ├── w-engines.json
│       ├── w-engine-details.json
│       ├── bangboo.json
│       ├── drive-discs.json
│       ├── buffs.json
│       ├── deadly-assault.json
│       ├── shiyu-defense.json
│       └── threshold-simulation.json
├── i18n/                    # 静态映射文件（merge 脚本引用，不发布）
    ├── da-version-period.json   # buhflipexplode versionKey ↔ mihoyo-wiki period 编号
    └── buff-names.zh-CN.json    # EN camelCase key → ZH buff 名称（描述文本匹配生成）
├── src/gachabase/           # gachabase 数据工具
│   ├── agent.ts             # Agent 基础属性计算公式（calcAgentStat）
│   ├── bangboo.ts           # Bangboo 基础属性计算公式（calcBangbooStat）
│   ├── w-engine.ts          # 音擎属性计算公式（calcWEngineBaseATK / calcWEngineSecondaryStat）
│   ├── types.ts             # gachabase 原始/详情数据公开类型
│   └── index.ts             # re-export
├── src/buhflipexplode/      # buhflipexplode 数据工具
│   └── index.ts             # 节点倍率表常量、原始 JSON 类型、纯计算函数
├── src/cleaned/            # cleaned/helper layer（不改 raw shape，只提供稳定消费视图）
│   ├── encounter.ts        # 敌人选择、候选列表、encounter damage-context helper
│   ├── enemy.ts            # elementMult map、按属性取倍率、damageContext helper
│   ├── versions.ts         # versionTime 解析、模式查找、默认版本 helper
│   ├── deadly-assault.ts   # DA buff / enemy 扁平化 helper
│   ├── shiyu-defense.ts    # SD node / side / enemy 标准化视图 helper
│   ├── threshold-simulation.ts # TS boss / regular side 标准化视图 helper
│   ├── types.ts            # cleaned helper 返回类型
│   └── index.ts            # re-export
├── src/build/              # static build resolver（当前静态构筑解析层）
│   ├── catalog.ts          # 动态 build catalog：全部强攻 / 命破 / 异常代理人、全部强攻/命破/异常音擎、curated 驱动盘与 alias
│   ├── definitions.ts      # curated effect definitions + source-specific assumptions（未覆盖项由 resolver 明示）
│   ├── matrix.ts           # 技能矩阵 builder（curated 模板 + 通用矩阵生成；metadata 当前已包含 source/template/attribute/canonical label/stable key/source stat/aggregation/template tags）
│   ├── profiles.ts         # 标准 normal / sheer / anomaly / disorder profile 与仪玄专用 sheer profile
│   ├── resolver.ts         # finalPanel + scenario → damageParams / trace（含 disorder source / anomaly proficiency gating）
│   ├── types.ts            # build layer 输入输出 contract（含 disorderSourceTypes / minimumResolvedAnomalyProficiency）
│   ├── views.ts            # source-specific damage view（独立额外结算条目，不并入主 anomaly/disorder 公式）
│   ├── utility-views.ts    # source-specific utility / resource view（独立回能 / 回能速率 / 喧响值条目，不并入主伤害公式）
│   └── index.ts            # re-export
├── src/game-modes.ts        # 对外发布的游戏模式 JSON 类型（buffs / DA / SD / TS）+ raw category code contract
├── src/terms.ts             # canonical 术语层（raw label → 规范导出映射）
├── src/text.ts              # rich text 字段类型与纯文本清洗 helper
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

packages/zzz-agent/
├── src/mastra/
│ ├── index.ts # Mastra 实例入口
│ ├── agents/zzz-agent.ts # ZZZ Agent prompt / tools / scorers wiring
│ ├── tools/zzz/ # lookup / calcDamage 工具（含 compact 查询与 damageContext；resolveBuildDamage / resolveBuildSourceDamageViews / resolveBuildSourceUtilityViews / resolveBuildSkillMatrix 通过 zzz-data build layer 复用静态构筑解析）
│ └── scorers/zzz-scorer.ts # 评分器实现
├── tests/
│ ├── lookup-game-mode.test.ts # lookupGameMode 默认版本与 damageContext 测试
│ ├── lookup-filters.test.ts # lookupAgent / lookupWEngine 双语筛选与 compact 测试
│ ├── resolve-build-damage.test.ts # 静态构筑高层 resolver tool 测试
│ ├── resolve-build-source-damage-views.test.ts # source-specific damage view tool 测试
│ ├── resolve-build-source-utility-views.test.ts # source-specific utility / resource view tool 测试
│ ├── resolve-build-skill-matrix.test.ts # 静态构筑技能矩阵 tool 测试
│ ├── zzz-agent-prompt.test.ts # prompt 工作流、术语与截图摘要测试
│ ├── zzz-scorer.test.ts # outputFormat / judge model scorer 测试
│ └── shared.ts # 测试共享 JSON 读取辅助
└── .npmrc # Mastra build 阶段继承的 pnpm trust 白名单

约定：

- `zzz-agent` 通过 workspace 依赖导入 `zzz-data` 的正式包导出，不直接使用 `packages/zzz-data/src/*` 相对路径
- `packages/zzz-agent/package.json` 通过单独的 `prepare:zzz-data` 脚本先构建 `zzz-data`，并在 `dev` / `test` / `build` 前显式调用，确保开发态、测试态与 Mastra build 读取的是最新 `zzz-data/dist`
- `packages/zzz-agent/package.json` 的 `start` 仅启动已有 `.mastra/output`，不承担重新构建依赖的职责

## 属性计算模块（src/gachabase/）

基于 gachabase.net 数据验证的纯函数属性计算库。爬虫原始数据位于 `data/raw/en/gachabase/`，对外发布数据位于 `data/en/*.json`。

| 函数                       | 文件                        | 公式                                                                      |
| -------------------------- | --------------------------- | ------------------------------------------------------------------------- |
| `calcAgentStat`            | `src/gachabase/agent.ts`    | `floor(value + growthPerLevel × (L−1)) + promotionBoost + coreSkillBoost` |
| `calcBangbooStat`          | `src/gachabase/bangboo.ts`  | `floor(value + (growthPerLevel ?? 0) × (L−1)) + optimizationBoost`        |
| `calcWEngineBaseATK`       | `src/gachabase/w-engine.ts` | `baseVal + floor((lvGrowth + starGrowth) × baseVal / 10000)`              |
| `calcWEngineSecondaryStat` | `src/gachabase/w-engine.ts` | `value × (1 + starAdvGrowth / 10000)`                                     |

**注意事项：**

- Agent / Bangboo 的晋阶/优化加成均为**累积值**，传入当前段的值即可，勿跨段求和
- W-Engine 二级属性公式的除数**始终为 10000**，与属性类型（AM/AP/CRIT等）无关

## 规格文档（docs/specs/）

- [`damage-calculation.md`](../docs/specs/damage-calculation.md) — 四种伤害类型（常规/贯穿/异常/紊乱）的乘区公式、TypeScript 类型签名与参考数值
- [`static-build-resolver.md`](../docs/specs/static-build-resolver.md) — 静态构筑解析系统设计：effect schema、输入输出 contract、热插拔乘区管线与模块划分
- [`static-build-resolver-roadmap.md`](../docs/specs/static-build-resolver-roadmap.md) — 执行路线与阶段状态：当前主线已推进到 `V126`；已覆盖 source views、trigger matrix、utility views、unified source-entry collection、main resolver summary、core skill matrix summary、core skill matrix effect summary、matrix row damage summary、matrix row compact fields、matrix row explanation fields，以及 matrix / trigger / source-entry / source-view compact helper exports；`V40 requirementSummary`、`V41 diagnosticSummary`、`V42 sourceNoteSummary`、`V43 utility-entry summaries`、`V44 source-entry collection aggregates`、`V45 source-view summary aggregates`、`V46 trigger-matrix summary aggregates`、`V47 skill-matrix summary aggregates`、`V48 skill-matrix row summaries`、`V49 skill-matrix row resolve summaries`、`V50 source-damage-view entry resolve summaries`、`V51 trigger-matrix row resolve summaries`、`V52 source-utility-view entry requirement summaries`、`V53 source-utility-view summary requirement aggregates`、`V54 source-damage-view summary requirement aggregates`、`V55 trigger-matrix summary requirement aggregates`、`V56 source-entry collection requirement aggregates`、`V57 source-entry group summaries`、`V58 source-entry group requirement aggregates`、`V59 source-utility-view group summaries`、`V60 source-damage-view group summaries`、`V61 trigger-matrix group summaries`、`V62 skill-matrix group summaries`、`V63 skill-matrix group effect summaries`、`V64 skill-matrix group formula summaries`、`V65 skill-matrix group caveat summaries`、`V66 skill-matrix top-level unsupported effects`、`V67 skill-matrix top-level caveat summary`、`V68 skill-matrix group caveat summary`、`V69 skill-matrix row caveat summary`、`V70 trigger-matrix top-level assumption summary`、`V71 trigger-matrix row assumption summary`、`V72 source-damage-view top-level assumption summary`、`V73 source-damage-view entry assumption summary`、`V74 source-utility-view top-level assumption summary`、`V75 source-utility-view entry assumption summary`、`V76 source-entry collection assumption summary`、`V77 source-entry group assumption summary`、`V78 source-damage-view group assumption summary`、`V79 source-utility-view group assumption summary`、`V80 trigger-matrix group assumption summary`、`V81 trigger-matrix summary assumption summary`、`V82 source-damage-view summary assumption summary`、`V83 source-utility-view summary assumption summary`、`V84 source-entry collection summary assumption summary`、`V85 skill-matrix summary caveat summary`、`V86 skill-matrix summary diagnostic/source-note summaries`、`V87 skill-matrix summary effect summary`、`V88 skill-matrix top-level assumption summary`、`V89 skill-matrix summary assumption summary`、`V90 skill-matrix group assumption summary`、`V91 skill-matrix row assumption summary`、`V92 source-damage-view caveat summary`、`V93 source-damage-view group caveat summary`、`V94 source-utility-view caveat summary`、`V95 source-utility-view group caveat summary`、`V96 source-entry collection caveat summary`、`V97 source-entry group caveat summary`、`V98 trigger-matrix caveat summary`、`V99 trigger-matrix group caveat summary`、`V100 trigger-matrix row caveat summary`、`V101 source-utility-view entry caveat summary`、`V102 source-utility-view entry summary`、`V103 source-entry utility-entry summary alignment`、`V104 source-entry damage-entry summary alignment`、`V105 source-entry mixed-entry assumption summary alignment`、`V106 source-entry mixed-entry caveat summary alignment`、`V107 source-entry mixed-entry diagnostic summary alignment`、`V108 source-entry mixed-entry source-note summary alignment`、`V109 source-entry mixed-entry requirement summary alignment`、`V110 source-entry top-level diagnostic/source-note summary alignment`、`V111 standalone source-view top-level diagnostic/source-note summary alignment`、`V112 standalone source-view top-level requirement summary alignment`、`V113 trigger-matrix top-level diagnostic/source-note summary alignment`、`V114 trigger-matrix top-level requirement summary alignment`、`V115 source-entry top-level dual requirement summary alignment`、`V116 trigger-matrix top-level effect summary alignment`、`V117 trigger-matrix group effect summary alignment`、`V118 trigger-matrix row effect summary alignment`、`V119 source-damage-view top-level effect summary alignment`、`V120 source-damage-view group effect summary alignment`、`V121 source-damage-view entry effect summary alignment`、`V122 source-entry collection top-level effect summary alignment`、`V123 source-entry collection group effect summary alignment`、`V124 source-entry mixed-entry effect summary alignment`、`V125 source-utility-view compact entry effect summary alignment` 与 `V126 source-utility-view top-level effect summary alignment` 已收口
- [`static-build-resolver-v117.md`](../docs/specs/static-build-resolver-v117.md) — 当前阶段：已收口；`trigger-entry matrix summary.groups[*]` 已新增稳定 `effectSummary`
- [`static-build-resolver-v118.md`](../docs/specs/static-build-resolver-v118.md) — 当前阶段：已收口；`trigger-entry matrix rows[*]` 与 compact row 已新增稳定 `effectSummary`
- [`static-build-resolver-v119.md`](../docs/specs/static-build-resolver-v119.md) — 当前阶段：已收口；`views.summary.effectSummary` 与顶层兼容字段 `views.effectSummary` 已补齐
- [`static-build-resolver-v120.md`](../docs/specs/static-build-resolver-v120.md) — 当前阶段：已收口；`views.summary.groups[*].effectSummary` 已补齐
- [`static-build-resolver-v121.md`](../docs/specs/static-build-resolver-v121.md) — 当前阶段：已收口；`entries[*].effectSummary` 与 compact entry 已补齐
- [`static-build-resolver-v122.md`](../docs/specs/static-build-resolver-v122.md) — 当前阶段：已收口；`collection.summary.effectSummary` 与顶层兼容字段 `collection.effectSummary` 已补齐
- [`static-build-resolver-v123.md`](../docs/specs/static-build-resolver-v123.md) — 当前阶段：已收口；`collection.summary.groups[*].effectSummary` 已补齐
- [`static-build-resolver-v124.md`](../docs/specs/static-build-resolver-v124.md) — 当前阶段：已收口；mixed `collection.entries[*]` 已统一暴露 `entry.effectSummary`，utility entry 当前固定返回空数组
- [`static-build-resolver-v125.md`](../docs/specs/static-build-resolver-v125.md) — 当前阶段：已收口；compact utility entry 已统一暴露 `entry.effectSummary`，当前固定返回空数组
- [`static-build-resolver-v100.md`](../docs/specs/static-build-resolver-v100.md) — 当前阶段：已收口；`trigger-matrix rows[*]` 与 compact row 已新增稳定 `caveatSummary`
- [`static-build-resolver-v99.md`](../docs/specs/static-build-resolver-v99.md) — 当前阶段：已收口；`trigger-matrix summary.groups[*]` 已新增稳定 `caveatSummary`
- [`static-build-resolver-v98.md`](../docs/specs/static-build-resolver-v98.md) — 当前阶段：已收口；`trigger-matrix` 顶层结果与 `summary` 已新增稳定 `caveatSummary`
- [`static-build-resolver-v73.md`](../docs/specs/static-build-resolver-v73.md) — 当前阶段：已收口；`source-damage-view entry` 已新增局部 `assumptionSummary`
- [`static-build-resolver-v74.md`](../docs/specs/static-build-resolver-v74.md) — 当前阶段：已收口；`source-utility-view` 顶层已新增 `assumptionSummary`
- [`static-build-resolver-v75.md`](../docs/specs/static-build-resolver-v75.md) — 当前阶段：已收口；`source-utility-view entry` 已新增局部 `assumptionSummary`
- [`static-build-resolver-v76.md`](../docs/specs/static-build-resolver-v76.md) — 当前阶段：已收口；unified `source-entry collection` 顶层已新增 `assumptionSummary`
- [`static-build-resolver-v77.md`](../docs/specs/static-build-resolver-v77.md) — 当前阶段：已收口；`source-entry collection groups[*]` 已新增局部 `assumptionSummary`
- [`static-build-resolver-v78.md`](../docs/specs/static-build-resolver-v78.md) — 当前阶段：已收口；`source-damage-view groups[*]` 已新增局部 `assumptionSummary`
- [`static-build-resolver-v79.md`](../docs/specs/static-build-resolver-v79.md) — 当前阶段：已收口；`source-utility-view groups[*]` 已新增局部 `assumptionSummary`
- [`static-build-resolver-v54.md`](../docs/specs/static-build-resolver-v54.md) — `V54` source-damage-view summary requirement aggregate
- [`anomaly-disorder-skill-matrix-evaluation.md`](../docs/specs/anomaly-disorder-skill-matrix-evaluation.md) — `8.2` 立项评估：当前结论是不在 `8.3 dynamic value context` 之前实现异常 / 紊乱 matrix
- [`static-build-resolver-v1.md`](../docs/specs/static-build-resolver-v1.md) — 第一版实现范围冻结：支持对象、bucket、profile、输入输出 contract 与验收标准
- [`static-build-resolver-v2.md`](../docs/specs/static-build-resolver-v2.md) — 第二版实现范围：扩展支持名单与技能矩阵模板约定
- [`static-build-resolver-v3.md`](../docs/specs/static-build-resolver-v3.md) — 第三版冻结范围：anomaly / disorder contract、单代理人静态快照约束，以及 V3.3/V3.4 refinement 收口
- [`static-build-resolver-v4.md`](../docs/specs/static-build-resolver-v4.md) — 当前阶段范围：progression-aware resolver 第九批已完成，并在当前 contract 下收口；已接入 `agentMindscape` / `energyGenerationRate` contract 与柏妮思、奥菲丝&「鬼火」、爱丽丝、薇薇安、简、柳、格莉丝、爱芮的高价值 progression-aware 支持
- [`static-build-resolver-v5.md`](../docs/specs/static-build-resolver-v5.md) — 当前阶段范围：`V5` 已在当前 contract 下收口；`柏妮思` / `爱芮` 的 `dynamicSnapshot` 已进入 anomaly/disorder resolver，并已细化 source-specific assumptions
- [`static-build-resolver-v6.md`](../docs/specs/static-build-resolver-v6.md) — 当前阶段范围：已完成 `V6.3` 首批 `爱丽丝` / `雅` source-state snapshot coverage，并同步细化首批 state-aware assumptions
- [`static-build-resolver-v7.md`](../docs/specs/static-build-resolver-v7.md) — 当前阶段范围：`V7.3` 前四批已完成，并在当前 contract 下收口；`柏妮思 M6` 的 `25% 火抗无视` 已接到 `scenario.resolvedSnapshot.bucketDeltas.ignoreResistance`，`格莉丝 M2`、`简`、`派派`、`时流贤者`、`柳 M2`、`薇薇安 M2` 的异常倍率折算已收口到 `scenario.resolvedSnapshot.multiplierFactors.skillMultiplierFactor`
- [`static-build-resolver-v8.md`](../docs/specs/static-build-resolver-v8.md) — 当前阶段范围：已完成 `V8.2` inventory 与 `V8.4` 前四批 source-note 收口，并在当前 contract 下收口；当前结论是不新增 public key
- [`static-build-resolver-v9.md`](../docs/specs/static-build-resolver-v9.md) — 当前阶段范围：`V9.4` docs / tool integration 已完成；`zzz-agent` 已暴露 `resolve-build-source-damage-views` 高层 tool，并与主伤害 / matrix 路径分流
- [`static-build-resolver-v10.md`](../docs/specs/static-build-resolver-v10.md) — 当前阶段范围：已收口；`爱芮 [异放]` 已通过独立 delta view 暴露，`霰落星殿` 与 `混沌重金属 4件` 固定为 research-only
- [`static-build-resolver-v11.md`](../docs/specs/static-build-resolver-v11.md) — 当前阶段范围：已收口；主 resolver 与 source-specific damage view 都已新增结构化 `sourceNotes`
- [`static-build-resolver-v12.md`](../docs/specs/static-build-resolver-v12.md) — 当前阶段范围：已收口；当前 `ResolveStaticBuildResult.diagnostics` 已覆盖 `defaulted-input` / `coverage-gap` / `unsupported-effect`，高层 resolver、source view 条目和 `zzz-agent` prompt 已优先消费该 contract
- [`static-build-resolver-v13.md`](../docs/specs/static-build-resolver-v13.md) — 当前阶段范围：已收口；anomaly / disorder 的 Batch A / Batch B curated coverage 已落地，且未为消除 coverage-gap 新增 public key
- [`static-build-resolver-v14.md`](../docs/specs/static-build-resolver-v14.md) — 当前阶段范围：已收口；`霰落星殿`、`混沌重金属 4件` 继续保持 `research-only`，`轰鸣座驾`、`自由蓝调 4件` 继续保持 source note
- [`static-build-resolver-v15.md`](../docs/specs/static-build-resolver-v15.md) — 当前阶段范围：已在当前 contract 下收口；`sourceNotes.guidance` 已进入公开 contract
- [`static-build-resolver-v16.md`](../docs/specs/static-build-resolver-v16.md) — 当前阶段范围：已收口；通用音擎批次已全部落地
- [`static-build-resolver-v17.md`](../docs/specs/static-build-resolver-v17.md) — 当前阶段范围：已收口；通用驱动盘的高价值可静态表达来源已补齐
- [`static-build-resolver-v18.md`](../docs/specs/static-build-resolver-v18.md) — 当前阶段范围：已收口；最后一批 legacy 强攻签名已按 partial coverage / source note 分层固定
- [`static-build-resolver-v19.md`](../docs/specs/static-build-resolver-v19.md) — 当前阶段范围：已收口；最后两个 utility-only 旧通用音擎已固定为 process-only source note，不新增 public key
- [`static-build-resolver-v20.md`](../docs/specs/static-build-resolver-v20.md) — 当前阶段范围：已完成第一批 source-specific utility / resource view；`zzz-agent` 已暴露独立 utility view tool，不并回主伤害公式
- [`static-build-resolver-v21.md`](../docs/specs/static-build-resolver-v21.md) — 当前实现：已完成 anomaly / disorder trigger-entry matrix；当前覆盖爱丽丝 / 雅 / 柏妮思 / 爱芮 / 薇薇安
- [`static-build-resolver-v22.md`](../docs/specs/static-build-resolver-v22.md) — 当前实现：source damage view / source utility view 已增加稳定 metadata；对齐 `canonicalLabel / stableKey / entryKind`
- [`static-build-resolver-v23.md`](../docs/specs/static-build-resolver-v23.md) — 当前实现：统一 source-entry collection 已完成；支持 utility-only 与 anomaly / disorder mixed collection
- [`static-build-resolver-v24.md`](../docs/specs/static-build-resolver-v24.md) — 当前阶段：已收口；`薇薇安 [异放]` 已进入公式推导型 delta view，并同步接入 trigger matrix 与 source-entry collection
- [`static-build-resolver-v25.md`](../docs/specs/static-build-resolver-v25.md) — 当前阶段：已收口；`时光切片` 已按触发类型拆成 `喧响值 + 能量` 的结构化 utility entries，并把 utility-only 查询与 damage-agent catalog 解耦
- [`static-build-resolver-v26.md`](../docs/specs/static-build-resolver-v26.md) — 当前阶段：已收口；unified source-entry collection 已新增稳定 `summary`，并固定 utility-only / mixed collection 的分组与排序语义
- [`static-build-resolver-v27.md`](../docs/specs/static-build-resolver-v27.md) — 当前阶段：已收口；trigger-entry matrix 已新增稳定 `summary`，并固定 `main-formula / source-view` 的分组与排序语义
- [`static-build-resolver-v28.md`](../docs/specs/static-build-resolver-v28.md) — 当前阶段：已收口；source damage / utility views 已新增稳定 `summary`，并固定 standalone / delta / trigger / rate 的分组与排序语义
- [`static-build-resolver-v29.md`](../docs/specs/static-build-resolver-v29.md) — 当前阶段：已收口；`ResolveStaticBuildResult` 已新增稳定 `summary`，收口单场景结果的公式乘区摘要与 diagnostics / sourceNotes / unsupportedEffects 的统计语义
- [`static-build-resolver-v30.md`](../docs/specs/static-build-resolver-v30.md) — 当前阶段：已收口；`ResolveStaticBuildSkillMatrixResult` 已新增稳定 `summary`，把当前只存在于高层 tool 的矩阵摘要下沉到 `zzz-data`
- [`static-build-resolver-v31.md`](../docs/specs/static-build-resolver-v31.md) — 当前阶段：已收口；`ResolveStaticBuildSkillMatrixResult` 已新增稳定 `effectSummary`，把当前只存在于高层 tool 的增益清单聚合逻辑下沉到 `zzz-data`
- [`static-build-resolver-v32.md`](../docs/specs/static-build-resolver-v32.md) — 当前阶段：已收口；`resolve-build-source-entries` 已直接透传底层 `collection.summary`
- [`static-build-resolver-v33.md`](../docs/specs/static-build-resolver-v33.md) — 当前阶段：已收口；`resolve-build-*` 高层 tool 的 unsupported / support-scope 组装与 catalog helper 已统一到 `resolve-build-shared.ts`
- [`static-build-resolver-v34.md`](../docs/specs/static-build-resolver-v34.md) — 当前阶段：已收口；`ResolveStaticBuildSkillMatrixRow` 已新增稳定 `damageSummary`
- [`static-build-resolver-v35.md`](../docs/specs/static-build-resolver-v35.md) — 当前阶段：已收口；`ResolveStaticBuildSkillMatrixRow` 已新增稳定的 row-level compact fields
- [`static-build-resolver-v36.md`](../docs/specs/static-build-resolver-v36.md) — 当前阶段：已收口；`ResolveStaticBuildSkillMatrixRow` 已新增稳定的 `diagnostics / sourceNotes`
- [`static-build-resolver-v37.md`](../docs/specs/static-build-resolver-v37.md) — 当前阶段：已把高层 `compact` 逻辑下沉为 `zzz-data` 可复用导出，并由高层 tool 直接复用
- [`static-build-resolver-v38.md`](../docs/specs/static-build-resolver-v38.md) — 当前阶段：已把 source-damage-view / source-utility-view 收口为与 `V37` 对称的 compact helper exports，并让高层 tool 对齐 `includeDetails` 语义
- [`static-build-resolver-v39.md`](../docs/specs/static-build-resolver-v39.md) — 当前阶段：已收口；`trigger-entry matrix row` 已新增稳定来源元数据，不再依赖 `label` 或额外反查 `sourceViewId`
- [`static-build-resolver-v40.md`](../docs/specs/static-build-resolver-v40.md) — 当前阶段：已收口；`source-damage-view entry` 与 `trigger-entry matrix row` 已新增稳定 `requirementSummary`
- [`static-build-resolver-v41.md`](../docs/specs/static-build-resolver-v41.md) — 当前阶段：已收口；`source-damage-view entry` 与 `trigger-entry matrix row` 已新增稳定 `diagnosticSummary`
- [`static-build-resolver-v42.md`](../docs/specs/static-build-resolver-v42.md) — 当前阶段：已收口；`source-damage-view entry` 与 `trigger-entry matrix row` 已新增稳定 `sourceNoteSummary`
- [`static-build-resolver-v43.md`](../docs/specs/static-build-resolver-v43.md) — 当前阶段：已收口；`source-utility-view entry` 已新增稳定 `diagnosticSummary / sourceNoteSummary`
- [`static-build-resolver-v44.md`](../docs/specs/static-build-resolver-v44.md) — 当前阶段：已收口；unified source-entry collection 的 `summary` 已新增聚合 `diagnosticSummary / sourceNoteSummary`
- [`static-build-resolver-v45.md`](../docs/specs/static-build-resolver-v45.md) — 当前阶段：已收口；standalone source-damage-view / source-utility-view 的顶层 `summary` 已新增聚合 `diagnosticSummary / sourceNoteSummary`

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

- Agent 属性：`calcAgentStat(value, growthPerLevel, level, promotionBoost, coreSkillBoost)`
- Bangboo 属性：`calcBangbooStat(value, growthPerLevel | null, level, optimizationBoost)`
- 音擎属性：`calcWEngineBaseATK(baseVal, lvBaseStatGrowth, starBaseStatGrowth)`、`calcWEngineSecondaryStat(baseValue, starAdvancedStatGrowth)`
- gachabase 类型：`AgentListItem`、`AgentDetails`、`WEngineListItem`、`WEngineDetails`、`BangbooItem`、`DriveDiscItem` 等
- 游戏模式类型：`BuffsJson`、`DeadlyAssaultJson`、`ShiyuDefenseJson`、`ThresholdSimulationJson`
- static build resolver：`resolveStaticBuildDamage()`、`resolveStaticBuildSkillMatrix()`、`resolveStaticBuildTriggerMatrix()`、`resolveStaticBuildSourceDamageViews()`、`resolveStaticBuildSourceUtilityViews()`、`resolveStaticBuildSourceEntries()`、`supportedStaticBuildAgents`、`supportedStaticBuildMatrixAgents`、`supportedStaticBuildTriggerMatrixAgents`、`supportedStaticBuildWEngines`、`supportedStaticBuildDriveDiscs`、`supportedStaticBuildSourceViewAgents`、`supportedStaticBuildSourceUtilityViewWEngines`、`getStaticBuildAgent()`、`getStaticBuildWEngine()`、`getCompatibleStaticBuildWEngines()`、`getStaticBuildDriveDisc()`、`getStaticBuildEffectsForLoadout()`、`getStaticBuildProfile()`、`staticBuildProfiles`
- static build 类型：`ResolveStaticBuildInput`、`ResolveStaticBuildResult`、`ResolveStaticBuildSkillMatrixInput`、`ResolveStaticBuildSkillMatrixResult`、`ResolveStaticBuildTriggerMatrixInput`、`ResolveStaticBuildTriggerMatrixResult`、`ResolveStaticBuildSourceDamageViewsResult`、`ResolveStaticBuildSourceUtilityViewsInput`、`ResolveStaticBuildSourceUtilityViewsResult`、`ResolveStaticBuildSourceEntriesInput`、`ResolveStaticBuildSourceEntriesResult`、`StaticBuildMode`、`StaticBuildScenarioInput`、`StaticBuildSkillMatrixContextInput`、`StaticBuildSkillMatrixRow`、`StaticBuildSkillMatrixRowMeta`、`StaticBuildSkillMatrixEntryType`、`StaticBuildSkillMatrixAggregationType`、`StaticBuildSkillMatrixVariantAxis`、`StaticBuildSkillMatrixTemplateSource`、`StaticBuildSkillMatrixAttributeSource`、`StaticBuildTargetSize`、`StaticBuildTriggerMatrixRow`、`StaticBuildTriggerMatrixRowMeta`、`StaticBuildTriggerMatrixEntryKind`、`StaticBuildTriggerMatrixTemplateSource`、`StaticBuildResolvedBuckets`、`StaticBuildTraceItem`、`StaticBuildSourceNoteEntry`、`StaticBuildSourceNoteOwner`、`StaticBuildSourceNoteStatus`、`StaticBuildDiagnosticEntry`、`StaticBuildDiagnosticKind`、`StaticBuildDiagnosticOwner`、`StaticBuildSourceDamageViewEntry`、`StaticBuildSourceDamageViewMeta`、`StaticBuildSourceUtilityViewEntry`、`StaticBuildSourceUtilityViewMeta`、`StaticBuildSourceUtilityViewType`、`StaticBuildSourceEntry`

`V4` 首批新增的高价值 progression context：

- `loadout.agentMindscape`
- `finalPanel.energyGenerationRate`
- effect condition `minimumMindscape`

当前已落地的 progression-aware 来源：

- `柏妮思`：潜能觉醒「沸点派对」的异常掌控 / 伤害提升、影画 2 的 `[热意洞穿]` 层数穿透率收益
- `奥菲丝&「鬼火」`：核心技「准星聚焦」的额外攻击力、影画 1 的伤害提升 / 火抗无视、影画 2 的终结技后攻击力、影画 4 的强化特殊技 / 终结技增伤
- `爱丽丝`：影画 1 的 `[强击]` 后减防、影画 2 的物理来源紊乱增伤、影画 4 的物理异常 / 紊乱无视抗性
- `爱芮`：影画 1 的 `[异放]` 基础异常暴击、按 `finalPanel.anomalyMastery` 追加异常暴击率，影画 2 的固定无视防御与 `[妄想时刻]` 额外无视防御
- `薇薇安`：影画 1 的预言目标异常 / 紊乱增伤、影画 2 的以太异常 / 紊乱无视抗性
- `简`：影画 1 的 `[狂热]` 状态异常精通转增伤、核心被动中“每点异常精通 -> 强击异常暴击率”的自动折算，影画 2 的 `[啮咬]` 目标减防、强击异常暴击伤害，影画 4 的 `[强击] / [紊乱]` 后异常伤害提升
- `格莉丝`：影画 2 的手雷命中后电抗降低
- `柳`：影画 1 的 `[洞悉]` 异常精通提升、影画 2 的 `[极性紊乱]` 额外突刺倍率提升、影画 4 的 `[识破]` 目标穿透率提升
- cleaned helper：`toElementMultiplierMap()`、`getEnemyElementMultiplier()`、`buildEnemyDamageContext()`、`selectEncounterByEnemyName()`、`buildEncounterDamageContext()`、`analyzeVersionPeriod()`、`findDAVersion()`、`findSDMode()`、`resolveSDModeName()`、`getDefaultSDMode()`、`selectSDMode()`、`findSDVersion()`、`findTSMode()`、`resolveTSModeName()`、`getDefaultTSMode()`、`selectTSMode()`、`findTSVersion()`、`getLatestDAVersion()`、`getLatestSDVersion()`、`getLatestTSVersion()`、`toDABuffView()`、`getDABuffViews()`、`flattenDAEnemies()`、`selectDAEnemy()`、`buildDADamageContext()`、`findDAVersionsByEnemyName()`、`toSDNodeViews()`、`flattenSDEnemies()`、`selectSDEnemy()`、`buildSDDamageContext()`、`findSDVersionsByEnemyName()`、`toTSNodeViews()`、`flattenTSEnemies()`、`selectTSEnemy()`、`buildTSDamageContext()`、`findTSVersionsByEnemyName()`
- cleaned 类型：`ElementMultiplierMap`、`EnemyDamageContext`、`EncounterSelectionResult`、`EncounterDamageContext`、`VersionPeriodInfo`、`DABuffView`、`DAEnemyView`、`SDNodeView`、`SDSideView`、`TSNodeView`、`TSSideView`、`TSFlattenedEnemyView`
- 文本工具：`RichTextString`、`stripRichText()`
- 游戏模式辅助：`EnemyCategoryCode`、`enemyCategoryCodes`、`isEnemyCategoryCode()`
- 术语导出：`AgentSpecialty`、`AgentAttribute`、`AttackType`、`BaseResistanceAttribute`、`toAgentSpecialty()`、`toAgentAttribute()`、`toBaseResistanceAttribute()`、`getElementMultIndex()`
- 伤害计算类型：`AnomalyType`、`DefenseParams`、`ResistanceParams`、`VulnerabilityParams`、`DazeVulnerabilityParams`、`CritParams`、`NormalDamageParams`、`SheerDamageParams`、`AnomalyDamageParams`、`DisorderDamageParams`、`DamageResult`
- 乘区函数：`calcDefenseMultiplier`、`calcResistanceMultiplier`、`calcVulnerabilityMultiplier`、`calcDazeVulnerabilityMultiplier`、`calcExpectedCritMultiplier`、`calcSheerBonusMultiplier`、`calcAnomalyProficiencyMultiplier`、`calcDamageLevelMultiplier`、`calcDisorderDamageMultiplier` 等
- Pipeline 函数：`calcNormalDamage`、`calcSheerDamage`、`calcAnomalyDamage`、`calcDisorderDamage`（各含 `Crit`/`NoCrit` 变体）

## 生成脚本设计

> **⚠ 冻结状态**：`scripts/generate/` 当前不再修改。xlsx 数据源暂时不可用，脚本与产物保留供参考。`scripts/generate/types/` 中的字段定义、JSDoc 注释、类型结构可作为重建公开类型的参考依据。

- `worksheetConfigs` 数组定义了 16 个工作表的完整字段映射（中文列头 → 英文字段名 + 类型）
- 三阶段执行：读取所有工作表 → 注入派生字段 → 写 JSON 文件
- **derivedFields 机制**：部分表（agent-skill、agent-cinema、agent-skill-desc）只有代理人名称没有 ID，通过 `derivedFields` 从 agent-stat 跨表注入 `agentId`
- **内部类型**：generate 脚本将 xlsx 列结构写入 `scripts/generate/types/`，仅供内部参考，不对外暴露
- **公开类型**：`src/index.ts` 手动维护，与数据源无关，后续随爬虫数据结构确定后重建

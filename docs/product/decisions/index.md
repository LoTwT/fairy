# Decisions Log

> 维护人：@Product
> 用法：每条决策独立编号、可逆性标注、来源可追溯。本文件是项目所有结构性决策的权威记录。
> 详细背景与论证见 [`docs/product/v2.0.md`](../v2.0.md) §6。
> 历史决策快照见 [`docs/product/archive/`](../archive/)。

---

## 总览

| ID | 主题 | 当前状态 | 当前决策 / 答复 | 可逆性 |
|----|------|----------|----------------|--------|
| **D-01** | 部署形态 | ✅ 锁定 | V1 = TypeScript monorepo（packages: data + core + cli）；V1.1 = AI plugin + 截图识别 + 邦布；V2 = Web UI | 中 |
| **D-02** | 多语言 | ✅ 锁定（已修订） | 见 D-02-rev | 高 |
| **D-02-rev** | 多语言（v2.0 修订） | ✅ 锁定 | V1 中英文双语；英文为字段/函数命名权威；中文默认显示；`--lang en|zh`；术语 / 错误 / prompt 资源保留 `zh` / `en` 双轨；JSON schema 字段名 / enum 永远英文 | 高 |
| **D-03** | 内置敌人范围 | ✅ 锁定（v2.0 修订） | DoD = "data 实际范围 = V1 覆盖范围"；缺数据时 fail loud；不预设固定数量 | 中 |
| **D-04** | 分享形式 | ✅ 锁定（v2.0 修订） | V1 仅 JSON 文件导入导出；压缩构筑代码 / URL 编码 → V1.1+；真正短链 → V2 | 高 |
| **D-05** | 开源协议 | ✅ 锁定（已修订） | 见 D-05-rev | 中 |
| **D-05-rev** | 开源协议 / 源数据留档 | ✅ 锁定（2026-05-16 errata） | 代码保持 MIT；当前可用 raw source 归属 `packages/data/source/`；Excel / 米游社 D-17 / buhflipexplode D-12 raw archives 在 V0.1.2 重构中物理删除，仅保留 git-history recovery pointer；npm/package 仅分发清洗后的 JSON + TypeScript 类型；攻略原文入 `docs/reference/` 仅供参考，不作为 formal data | 中 |
| **D-06** | V1 第一目标用户 | ✅ 锁定 | P2 配队与对比（v2.0 后改为 CLI / AI surface 服务此画像） | 中 |
| **D-07** | 数据规则源 | ✅ 锁定 | 攻略 NGA 44468012 快照（rules-v0.1-attached-2026-05-04） + 数据来源（lo-user 提供 Excel + 米游社危局强袭战 + buhflipexplode.org/zzz/da/） | 高 |
| **D-08** | 视觉调性 | ⏳ 推迟 | V1 无 Web UI，调性决策推迟到 V2 阶段 | — |
| **D-09** | 紊乱是否进 V1 | ✅ 锁定 | 紊乱进 V1 计算引擎；V1 不提供专用交互 surface，仅 core / JSON 输出；V2 时再考虑 UI | 高 |
| **D-10** | 数据维护责任 | ✅ 锁定（v2.0 修订） | V1 阶段：lo-user 提供 Excel 主源 + 爬虫每版本手动 release；data 包必须做完整角色/音擎/驱动盘/影画/鸣徽/潜能激化数据 | 中 |
| **D-11** | 命名体系（v2.0 新增） | ✅ 锁定 | 选项 A 全套官方化：公开 schema / core API / data 字段优先使用 ZZZ 官方英文的语义化 camelCase；旧 `breach*` 进 sourceAliases / migration | 中 |
| **D-12** | buhflipexplode 算法处理 | ✅ 锁定 | 选项 B：Fairy 保持 MIT；buhflipexplode GPL JS 仅 raw 留档/参考，不复制进 runtime；Fairy 独立实现等价算法；每次抓取用 hash + 算法快照文档 + parity 对账监控 drift | 高 |
| **D-13** | V1 范围收窄到危局强袭战 | ✅ 锁定（2026-05-05 errata：黄金集 19 anchors；2026-05-14 G13/G18/G19/G20 V1.x done） | V1 = DA 计算器；buhflipexplode = DA overlay 主源；Excel `敌人属性`保留 raw archive 作为 V1.x+ 扩展源；V1 黄金集 19 anchors（G01-G12 + G14-G17 + G21-G23）；V1.x Track B 已补 G13/G18/G19/G20，当前无 deferred golden anchor | 中 |
| **D-14** | cleaned data typed modifier 双层结构 | ✅ 锁定（2026-05-05） | Layer 1 原文层 `sourceText` / `localizedText` + Layer 2 计算层 `modifiers[]` / `calculationEffects[]` + 风险层 `unparsedEffects[]`；bucket 受控 enum 严格匹配 glossary v0.4 D-11；效果 4 级（L1 静态 / L2 静态条件 / L3 动态参数 / L4 时序需 `requiresActivation`）；确定性 pipeline + sourceTextHash + parserVersion + effectTemplateId + 人工 audit gate；AI 候选不能直接入 cleaned | 中 |
| **D-15** | V1 package exports 4 入口 | ✅ 锁定（2026-05-05） | V1 全做：`@randomplay/data/cleaned`（总入口）/ `@randomplay/data/cleaned/<domain>` / `@randomplay/data/types` / `@randomplay/data/cleaned/i18n/<domain>`；data 包 game labels 源码 `packages/data/src/i18n/` → 发布 `packages/data/cleaned/i18n/`；UX ERR-* `docs/ux/i18n/` 完全独立 | 中 |
| **D-16** | Source priority + multi-source + unknown policy | ✅ 锁定（2026-05-05） | Excel base / buhflipexplode DA overlay / 米游社 i18n；冲突 fail loud + manual review；entity-level `sources[]` + 关键数值字段级 `sourceRefs`；unknown 分级 blocking（影响计算）/ non-blocking（纯展示）；新增 ERR-DAT-005（multi-source conflict / 未解析 modifier blocking）+ ERR-DAT-006（locale mapping unresolved / 展示缺失 non-blocking，与 PR #21 cleaned schema spec 锁定一致） | 中 |
| **D-17** | 米游社 V1 抓取范围 + 工具栈 | ✅ 锁定（2026-05-05 升级 + 2026-05-08 audit 决议） | 范围扩展为 DA 详情正文 + 乘区文本 + zh/en alignment；工具：列表 API + entry_page detail JSON + cheerio；2026-05-08 sourceConflict audit accept buhflipexplode（与 nanoka 三方比对 2:1） | 中 |
| **D-18** | V1 dogfooding gate（DD-003） | ✅ 锁定（2026-05-05） + 通过（2026-05-08 4/5） | V1 release gate 第 2 项从"3+ 社区试用"收窄为 lo-user 单人深度 dogfood + QA 回归；known limitations 显式标注未经社区广泛验证 + Day 3 跳过 | 高 |
| **D-19** | V1 CLI 输出改革 | ✅ 锁定（2026-05-06） | `fairy calc` 默认 `--view brief` summary-first；完整 trace 通过 `--view verbose`；默认输出 `summary.lanes.nonCrit` / `summary.lanes.crit`，不使用期望伤害；`--result-mode expected` 保留为可选理论分析；其他二元输入差异通过 `fairy compare` | 中 |
| **D-20** | 数据源迁移（Excel 永久停 → nanoka-exclusive）| ✅ 锁定（2026-05-15）| Path C nanoka-exclusive for ALL source-backed cleaned data（含 DA）；R1/R4/R6 final lock；Formal-Live Gate `manifest.zzz.live`（cleaned output 强制 live，latest 仅 research）；鸣徽 removed；Sentinel + patch history 进 V0.1.0 scope（R4.a snapshot-derived numeric diff）；D-17/D-12 archived audit baseline 不再作 runtime source；V0.1.0 minor bump (schema breaking)；8 QA acceptance gates；45-row canonical-generated coverage matrix；Phase 4 runtime cutover done，release prep in progress。详见 [`D-20-data-source-migration.md`](D-20-data-source-migration.md) | 中 |
| **D-20-R** | Phase 3 drift rulings | ✅ 完成 | G01-G26 first-sync rulings + G27/G28 proof-anchor rulings 记录在 [`data-source-rulings.md`](data-source-rulings.md)；PR #74 后 Phase 3 Gate 8 exit-clean evidence 完成，Phase 4 runtime cutover 由 task #172 承接 | 中 |
| **D-1=D**（S2 节奏） | V1 推进顺序 | ✅ 锁定 | S2 双门槛：schema discovery + 并行 scraper 准备；S6 全量化最后；不允许 data 全量化阻塞 core 启动 | 中 |

---

## CONFIRM-* （v2.0 设计期细化决策）

| ID | 主题 | 当前决策 |
|----|------|----------|
| **CONFIRM-1** | Handler 注入边界 | V1 仅允许"已注册 handler ID + 数据驱动参数注入"；不允许内联 JS；未来 V1.x+ 受信任扩展包显式注册（固定 EffectHandler 接口、纯函数、无 IO/网络/随机/时间依赖、必须输出 trace、带 manifest/version/source；CLI 默认不加载外部扩展） |
| **CONFIRM-2** | CLI 输出形态 | CLI = core 的薄壳，输出仅 JSON；下游消费者（AI plugin / Slock skill / 玩家脚本 / 未来 Web UI）按需自渲染 |
| **CONFIRM-3** | PNG 收益曲线导出 | 推迟到 V1.1+；V1 仅 CSV |
| **CONFIRM-4** | "手写"边界两层 | L1 = `@randomplay/data` 对外发布的"游戏内数值规则数据"（不允许人工手填）；L2 = 开发期内部 fixture（`fixtures/golden/`，仅供 core 单测，允许人工手写并审核） |
| **CONFIRM-5** | data 包 V1 覆盖度 DoD | "黄金集硬要求 + 其余按 data 实际范围"；首批 20+ 黄金锚点涉及的代理人/敌人/装备 data 必须齐全；其余 fail loud |
| **CONFIRM-6** | monorepo 工具 | pnpm workspaces（lo-user 拍板 2026-05-05） |
| **CONFIRM-7** | V1 不做明确清单 | 能量循环 / 闪能循环 / 喧响循环模拟、秽盾完整状态机、打断时序、部位破坏时序、Web UI、OCR/截图识别（→V1.1）、AI plugin（→V1.1） |
| **CONFIRM-8** | CLI 子命令名 | 候选 `calc / compare / scan / explain / migrate`，最终命令名根据 S3 core exports 决定 |
| **CONFIRM-9** | 潜能激化定义 | 代理人加强系统，会带来技能形态、数值变动；具体效果由 data 包提供 |
| **CONFIRM-10** | AI 集成形态 | Claude Code Plugin 结构（V1.1 启动）；多工具适配通过 `.claude-plugin/plugins/<name>/skills` + `.cursor/` + `.codex/` 等配置目录；V1 仓库不预留 AI 工具目录 |
| **CONFIRM-11** | 数据源 | 米游社危局强袭战页（https://baike.mihoyo.com/zzz/wiki/channel/map/13/108）+ buhflipexplode.org/zzz/da/ + lo-user 提供 Excel；仅正式服 |
| **CONFIRM-12** | 数据契约两层职责分离 | `@randomplay/data` = 游戏内确定的数值规则（不允许手写）；用户 `snapshot.json` = 玩家面板快照 + 装备选择 + 增益勾选（必须由用户提供） |
| **CONFIRM-13** | 用户 override data 值 | 允许 + trace `overriddenFromData` 强标（原值/用户值/字段路径/原因/版本）；fieldProvenance 扩展为 `"data" | "user-override" | "panel" | "stats"`；verbose / debug 档默认显示该标记 |

---

## Workflow 决策

| ID | 主题 | 当前决策 |
|----|------|----------|
| **WF-1** | 仓库 PR 工作流 | self-merge 工作流：作者负责 PR；至少 1 个跨角色 review 后 self-merge；触及生产/部署/数据真实运行的 PR 等 lo-user 显式 OK |
| **WF-2** | 合并方式 | Squash and merge；合并后删除开发分支；GitHub 仓库 setting 已配置默认（squash + auto-delete head branches） |
| **WF-3** | PR 模板 | `.github/PULL_REQUEST_TEMPLATE.md` 含 Slock Context 块（Owner / Task / Reviewers / Related decisions / i18n impact）；squash commit message 必须含 task 编号或 PR 编号 |
| **WF-4** | GitHub 凭据 | 当前所有 agents 使用 lo-user 的 `LoTwT` 账号 admin 权限；作者归属通过 PR 描述 / commit message Slock Context 块追溯 |

---

## 决策详情

### D-01 部署形态

**v2.0 锁定状态**：V1 = TypeScript monorepo（packages: data + core + cli）；V1.1 = AI plugin（Claude Code Plugin 结构）+ 截图识别 + 邦布；V2 = Web UI

**v1.0 历史**：曾锁定为"纯前端静态页"。lo-user 在 2026-05-04 提出方向调整，从 Web UI 转为 monorepo CLI + AI plugin，理由是"优先产出面向 AI 使用的 plugin / skills 等能力，所以需要更解耦"。

**可逆性**：中。原 Web UI 设计可在 V2 阶段平移使用。

**来源**：v1.0 §6.2，v2.0 §2.3，lo-user 2026-05-04 方向调整。

### D-02-rev 多语言（v2.0 修订）

**v2.0 锁定状态**：V1 支持中英文双语；英文为字段/函数命名权威；中文默认显示；`--lang en|zh` 切换；术语 / 错误 / prompt 资源保留 `zh` / `en` 双轨形态；JSON schema 字段名 / enum 取值永远英文，与语言无关。`--lang` 仅影响错误消息 / 解释 / AI plugin 输出文本。

**v1.0 历史**：原决策为"V1 仅中文 UI"。lo-user 在 2026-05-04 修订为双语。

**双语范围限制**（lo-user 2026-05-05）：仅覆盖伤害计算器实际使用的术语，不强求长尾。UX 落地为 P0/P1/P2 三档优先级。

**locale code 简洁形式**：使用 `en` / `zh`，不带 region subtag（`zh-CN` / `en-US`）。

### D-05-rev 开源协议 / 源数据留档

**v2.0 修订状态**：代码仓库仍按 MIT。当前仍使用的源格式数据归属
`packages/data/source/`，发布产物只包含清洗后的 JSON 与 TypeScript 类型。
V0.1.2 errata：Excel / 米游社 D-17 / buhflipexplode D-12 raw archives 物理
删除，仅保留 source registry 中的 git-history recovery pointer。

**目录边界**：
- `packages/data/source/`：当前 nanoka raw source 与 source manifest；版本控制保留，不进入 npm/package 发布物
- `docs/reference/`：攻略原文等参考材料；版本控制保留，不进入 npm/package 发布物
- `packages/data/cleaned/`：清洗后的派生 JSON canonical 目录，也是 `@randomplay/data` npm/package 内实际分发的清洗 JSON 来源
- `packages/data/src/types/`：清洗数据与 source manifest 的 TypeScript 类型

**确认来源**：@lo-user 2026-05-05 要求 `data.xlsx` 与 `zzz-data-introduction.txt` 入仓，并要求 raw source format 留档但不分发。

### D-11 命名体系（v2.0 新增）

**v2.0 锁定状态**：选项 A 全套官方化（Product + TechLead + UX 三方一致 + lo-user 2026-05-05 拍板）。

**两层框架**：
- **原则层（已锁）**：公开 schema / core API / data 字段优先使用 ZZZ 官方英文的语义化 camelCase；旧 `breach*` 仅进 sourceAliases / migration，不再作为新字段主名
- **精确字段名（S2 锁）**：S2 第一产出 = `docs/architecture/naming-policy.md` + `docs/data-contract/pending-term-resolution-table.md`

**命名规则**：
- 缩写展开：官方 `PEN Ratio` / `CRIT DMG` / `DEF` / `ATK` / `HP` / `DMG` 等不照搬，公开字段用展开后的可读 camelCase；缩写仅进 `officialEnglishName` + `sourceAliases`
- 非缩写官方词（`Rupture` / `Sheer Force` / `Sheer Damage` / `Adrenaline` / `Anomaly Mastery` / `Anomaly Proficiency` / `Resonium` / `Energy Regen` / `Flinch` 等）→ 直接采用为 camelCase 词根
- 属性增伤数据字段拆 6 个；公式 bucket 不强制拆 6 个

**关键 ZZZ 官方英文映射**（lo-user 2026-05-05 截图证实）：
- 命破特性 = Rupture → `agentSpecialty: "rupture"`
- 贯穿力 = Sheer Force → `sheerForce`
- 贯穿伤害 = Sheer Damage → `sheerDamage`
- 闪能 = Adrenaline → `adrenaline`
- 异常掌控（积蓄）= Anomaly Mastery → `anomalyMastery`
- 异常精通（伤害）= Anomaly Proficiency → `anomalyProficiency`
- 鸣徽 = Resonium → `resonium`
- 鸣徽来源 = 零号空洞 Lost Void → `lostVoid`
- 畏缩 = Flinch → `flinch`

**重要 errata**：v0.1 ~ v0.3 阶段曾用 `anomalyMastery = 异常精通` / `anomalyProficiency = 异常掌控`（候选 X），与 ZZZ 官方反向；2026-05-05 lo-user 截图验证后锁定为候选 Y。

**来源**：v2.0 §6 D-11，三角色独立得到一致方向，lo-user 2026-05-05 拍板。

### D-13 V1 范围收窄到危局强袭战

**锁定状态**：@lo-user 2026-05-05 cleaned schema 讨论会上将 V1 范围明确收窄到危局强袭战（DA）计算器。

**范围**：
- V1 优先 `@randomplay/data/cleaned/deadly-assault`：buhflipexplode = DA boss / multiplier / buff overlay 主源
- `cleaned/enemies` 全局 enemy base 不作为 V1 必交付
- Excel `敌人属性`（412 unique）保留 raw archive，V1.x+ 扩展源
- DA boss 能映射 Excel 时补 `baseEnemyRef`；映射不到（如 Sanguine Sweeper）→ `externalBossId + sourceRefs + unresolvedMapping`
- V1 黄金集 23 锚点收窄到 ~~20 锚点~~ → **19 锚点**（D-13 errata，2026-05-05 17:53 lo-user 拍板）

**2026-05-05 17:53 D-13 errata（lo-user 拍板）**：黄金集 20 → **19 anchors**。
- **V1 19 anchors**：G01-G12 + G14-G17 + G21-G23
- **原 V1.x defer**：G13（data-driven anomaly threshold rule composition）+ G18 部位破坏 + G19 凶心疯汉失衡恢复 + G20 装甲哈提失衡恢复
- **G13 原 defer 理由**：需要 `anomalyThresholdModifiers[]` schema + core 组合逻辑 + source trace + fixture；当时 core 仅有 `thresholdOverride`，保留 V1 会扩大 #43 + 触动 core；defer 可逆，V1.x 与通用/特殊敌人规则一起做更聚焦
- **状态**：✅ V1 release-ready milestone 时 PR #28 已实施 19 anchors（commit `3f5e67a`）
- **原影响 doc**：`docs/qa/golden-source-coverage.md`（当时 matrix 标 G13 deferred） / `docs/product/meetings/2026-05-05-cleaned-schema-design.md` §2.7；2026-05-13 Track B 已更新当前 docs。

**2026-05-14 V1.x Track B update**：
- **G13 implemented**：异常阈值特殊规则已进入 executable replay，使用攻略 §3.2.2 的基础阈值表、特殊敌人 1.1x/1.2x 阈值提升、危局强袭战第16期 1.1x 阈值提升，并通过 `anomalyThresholdModifiers[]` 乘算组合复现 3960 / 4752(物理) / 3630 / 4356(物理)。
- **G18 implemented**：部位破坏典型真实伤害倍率表已进入 executable replay，使用 Excel `敌人属性` 中格莱特 70 级最大生命值 + 攻略 §1.1 工程机械部位破坏 5% 最大生命值真实伤害规则。
- **G19 implemented**：凶心疯汉失衡恢复时间已进入 executable replay，使用 Excel `敌人属性` 中匪祸侵蚀体·凶心疯汉基础失衡恢复速度 7.69%/s + 攻略 §2.3.2 `+60% -9%` 失衡恢复速度组合复现 8.61 秒。
- **G20 implemented**：装甲哈提失衡恢复时间已进入 executable replay，使用 Excel `敌人属性` 中恶名·哈提基础失衡恢复速度 8.33%/s + 攻略 §2.3.2 `+100% -13%` 失衡恢复速度组合复现 6.42 秒；攻略原文 `1/11.58%` 记为分母 typo，因为公式与终值均对应 15.58%/s。
- **Remaining V1.x deferred**：无。

**理由**：
- 与 lo-user "V1 主要支持危局强袭战 + Excel 后备" 框定一致
- V1 推进速度优先；4 方一致推荐 A（黄金集收窄）
- UX 资产损耗极小（仅 starter-scenarios S2 enemy swap）

**来源**：会议纪要 [`docs/product/meetings/2026-05-05-cleaned-schema-design.md`](../meetings/2026-05-05-cleaned-schema-design.md) §2.3 / §2.7；2026-05-05 17:53 thread `#fairy:43-scope` lo-user 同意 G13 defer。

### D-14 cleaned data typed modifier 双层结构

**锁定状态**：@lo-user 2026-05-05 提出新设想，4 方一致接受。

**双层结构**：
- **Layer 1 原文层** `sourceText` / `localizedText`：核心技 / 音擎 / 驱动盘 / Buff 描述原文 + i18n + 人工复核
- **Layer 2 计算层** `modifiers[]` / `calculationEffects[]`：完整 typed modifier（id / handlerId / params / appliesTo / when / bucket / source / priority / stackingGroup / operation），与 PR #5 / #10 一致
- **风险层** `unparsedEffects[]`：不能可靠归类的效果，blocking / non-blocking 分级

**bucket 受控 enum**：严格匹配 glossary v0.4 D-11 锁定 enum（`damageBonusZone` / `sheerDamageBonusZone` / `dazeVulnerabilityZone` / 6 个属性 *DamageBonus 等）；不允许自由字符串

**效果 4 级**：
- L1 静态属性增益 → 直接 typed modifier
- L2 静态条件触发 → typed modifier + Condition DSL when
- L3 动态参数 → handler ID + params
- L4 时序触发（"3 秒内"等）→ V1 必须 `requiresActivation: true` + snapshot 显式 active；data 不假设持续时间

**确定性 pipeline**：
- 固定表格字段自动转换
- 已知文本模式 parser/template registry
- 每条转换记录 `sourceTextHash + parserVersion + effectTemplateId + sourceRefs`，文本/parser 变化 fail loud
- AI 候选不能直接入 cleaned，必须 schema validation + golden/parity test + 人工接受记录

**人工不可消除但可控**：每次新数据 release 才需要 audit unresolved；不修就不发布

**来源**：会议纪要 §2.6

### D-15 V1 package exports 4 入口

**锁定状态**：@lo-user 2026-05-05 拍板"V1 就可以"。

**4 入口 V1 全做**：
- `@randomplay/data/cleaned`（总入口，AI plugin 一次性 import 整个 GameData）
- `@randomplay/data/cleaned/<domain>`（按 entity / domain 细分，如 `deadly-assault`）
- `@randomplay/data/types`（TS 类型独立入口）
- `@randomplay/data/cleaned/i18n/<domain>`（i18n 资源按需加载）

**i18n 路径分离**：
- data 包 game labels 源码 `packages/data/src/i18n/<domain>.{zh,en}.json` → 发布 `packages/data/cleaned/i18n/`
- UX ERR-* runtime catalog `docs/ux/i18n/messages.{zh,en}.json` 完全独立

**来源**：会议纪要 §2.5 / §2.8

### D-16 Source priority + multi-source metadata + unknown policy

**锁定状态**：4 方共识 2026-05-05。

**Source priority**：
- Excel = base entity 主源
- buhflipexplode = DA event/enemy overlay
- 米游社 = 中文 i18n / 描述源
- 冲突时 fail loud + manual review，**不自动覆盖**

**2026-05-08 sourceConflict audit 补充**：PR #24 留存的 3 条米游社 /
buhflipexplode 危局强袭战 buff `sourceConflict` 已做人工 audit。lo-user 决策
`Q1，按 buhflipexplode`；nanoka (`https://zzz.nanoka.cc/boss/`) 仅作为人工查询源，
且 3 条均与 buhflipexplode 一致。因此 cleaned release evidence 记录为
`resolved-prefer-buhflipexplode`，Mihoyo 原值和 source refs 继续保留为审计线索。
详见 `packages/data/cleaned/audit/mihoyo-buhflipexplode.source-conflicts.json`。

**Multi-source metadata**：
- entity-level `sources[]`
- 关键数值字段级 `sourceRefs`（DA boss slot multiplier、buff 数值、effective HP / daze / anomaly 派生字段等必须有）
- 发布前测试断言 required fields 没 sourceRef 失败
- trace 中可解释每个关键字段来自 Excel / buhflipexplode / 米游社

**Unknown policy**：
- **blocking**（影响计算 / 匹配 / source 追溯）：阻断 cleaned 发布；进 unresolved 队列
- **non-blocking**（纯描述缺失等）：随 warning 发布，但 manifest 中可查
- 不补假数据；不静默降级

**新增 ERR keys**（UX 跟随 schema PR 加 catalog）：
- `ERR-DAT-005` blocking：multi-source conflict / 未解析 modifier 影响计算
- `ERR-DAT-006` non-blocking：locale mapping unresolved / 展示缺失（与 PR #21 cleaned schema spec 锁定一致；不再使用 ERR-UI-004 占位）

**来源**：会议纪要 §2.9 / §2.10 / §2.11

### D-19 V1 CLI 输出改革

**锁定状态**：@lo-user 2026-05-06 在 D-19 讨论 thread 中拍板。

**输出视图**：
- `fairy calc` 默认 `--view brief`，只输出 summary-first 结果与 diagnostics
- `--view verbose` 输出完整 `CalcResult`，包含 `attackSegments[]` / `buckets[]` / `modifiers[]` / `trace[]`
- `--view` 合法值固定为 `brief|verbose`，非法值必须 fail loud

**结果语义**：
- 默认 summary 使用 `lanes.nonCrit` / `lanes.crit` 双栏展示，不使用暴击率加权期望值
- `--result-mode expected` 保留为可选理论分析；默认输出不把 expectation 当主结果
- 旧 `rawTotalDamage` / `displayTotalDamage` / `expectedDamage` / `critDamage` / `nonCritDamage` 字段保留过渡，避免一次性破坏现有审计与脚本

**二元场景边界**：
- 只有同一输入下的 RNG 双面性（暴击 / 不暴击）进入 `calc` lanes
- buff active/inactive、敌人状态前后、异常/紊乱触发与否等输入差异使用 `fairy compare`

**来源**：Slock `#fairy:9f8fe6b6` D-19 输出结构讨论；lo-user 2026-05-06 拍板 Q1=`--view brief|verbose`、Q2=summary-first、Q3=保留 expected 可选。

### D-17 米游社 V1 抓取范围 + 工具栈（2026-05-05 升级）

**锁定状态**：@lo-user 2026-05-05 16:46（thread `#fairy:e6993153`）将米游社范围从"i18n 名称源"扩展为"DA 详情正文 + 乘区文本 + zh/en 对照"，作为 V1 必交付。TL 16:52 完成 API discovery 收敛实施方案。

**V1 抓取范围**（每期）：
- **3 个可选 buff**（含乘区文本）
- **3 个 boss 属性 + 描述**
- **3 个 boss 房间场地 buff**（含乘区文本）
- **CN ↔ EN 对照**：与 buhflipexplode 描述对齐，作为 V1 必交付

**工具栈**：
- 列表 API：`https://baike.mihoyo.com/zzz/...` 频道 13 list → 子频道 108 取 35 期 `content_id`
- 详情 API：`https://act-api-takumi-static.mihoyo.com/hoyowiki/zzz/wapi/entry_page?app_sn=zzz_wiki&entry_page_id={content_id}&lang=zh-cn`，请求头 `x-rpc-wiki_app: zzz`
- 富文本解析：`multi_table` / `rich_row_base_info` HTML 用 cheerio 离线解析
- **Playwright 不进生产依赖**（仅手工 sanity 检查时使用）

**Source 角色**（与 D-16 一致）：
- buhflipexplode = DA event/enemy overlay 主源
- 米游社 = 中文 i18n / 描述源 + DA 详情乘区文本 zh/en alignment
- Excel = base entity 主源
- 冲突时 fail loud + manual review

**parity manifest**：抓取产物附 CN/EN parity manifest，alignment 失败 fail loud（ERR-DAT-005 blocking）；V1 不预设 alignment unresolved 的 ERR reason，待真出现再补（保留 ERR-DAT-006 non-blocking 兜底）。

**实施 PR**：#24（commit `4b9ac2a`）— TL 自带 docs 同步（`docs/data-source/mihoyo/*` / `docs/data-contract/cleaned-schema-spec.md` DA domain / `docs/index.md` / `CLAUDE.md` / `robots.txt` / source registry / package README）。

**2026-05-08 sourceConflict audit 决议**（与 D-16 同步）：PR #24 留存的 3 条米游社 vs buhflipexplode 数值冲突（21 澄意 / 8 灼冽 / 1 破招）已人工 audit。lo-user 用 nanoka (`https://zzz.nanoka.cc/boss/`) 作为人工查询源（不接管线），三方比对 nanoka 与 buhflipexplode 一致（2:1 vs Mihoyo），lo-user 决策 `Q1，按 buhflipexplode`。cleaned release evidence 记录为 `resolved-prefer-buhflipexplode`，Mihoyo 原值与 sourceRefs 保留为审计线索。详见 `packages/data/cleaned/audit/mihoyo-buhflipexplode.source-conflicts.json`（PR #33 commit `04e7077`）。

**可逆性**：中（API 形态变更需要重抓 + parity 重核）

**来源**：thread `#fairy:e6993153`（lo-user 16:46 / TL 16:46~16:52 / QA 16:46）+ doc-drift-log DD-001 + PR #24 / #33。

### D-18 V1 dogfooding gate（DD-003）

**锁定状态**：@lo-user 2026-05-05 20:23（thread `#fairy:dogfooding`）将 V1 release gate 第 2 项从 "3+ 社区试用" 收窄为 **lo-user 单人深度 dogfood + QA 回归**。

**Gate 条件**（dogfooding-v1.md §4.1）：
- B-Calc.blocker：0 件未修
- B-Calc.non-blocker：已重新分类
- U-ErrCopy / U-Scenario：可修已修，不修加 known limitation 注解
- D-Data：audit gate 决议落地
- P-Range：全部入 V1.x backlog
- **lo-user 整体打分 ≥ 4/5**（自评）

**已知限制**（V1 release notes 必须标注）：
- V1 仅由 lo-user 单人深度 dogfood 验证 + QA 回归，**未经社区广泛验证**
- dogfooding Day 3 边界探测（`--lang en` / 故意造错 ERR-* 验证）lo-user 决策跳过，V1.x 视真实使用反馈再决定是否回补

**触发 V1.x 扩 dogfood 范围的条件**：
- 真实社区使用反馈出现重复性 B-Calc / U-* 问题
- 计算结果与第三方计算器结构性 drift

**实施结果**：dogfooding 期间 lo-user 整体打分 = **4/5**，通过 gate。详见 `docs/product/dogfooding-report-v1.md`。

**可逆性**：高（V1.x 可扩 dogfood 范围）

**来源**：thread `#fairy:dogfooding` 20:22~20:23 lo-user 自荐试用 + 拍方案 B；doc-drift-log DD-003；dogfooding-report-v1.md。

### D-12 buhflipexplode 算法处理

**锁定状态**：@lo-user 2026-05-05 选择选项 B。Fairy 保持 MIT，不复制 / 改写 buhflipexplode GPL-3.0 JavaScript 到 MIT runtime 包。

**处理边界**：
- raw JSON / JS / HTML 曾作为 D-12 audit baseline 留档；V0.1.2 起 raw archive 从当前树移除，仅通过 git history recovery pointer 保留审计可追溯性；不进入 npm/package 发布物
- README / metadata 需声明数据版权归 miHoYo 或各自权利方；如有侵权联系删除
- buhflipexplode 算法逻辑仅作为参考；Fairy 在 `@randomplay/core` / `@randomplay/data` 中独立实现等价逻辑
- 如未来需要直接运行原 JS，必须另开 GPL adapter/package 决策，不进入默认 MIT runtime

**drift gate**：
- fetch 模式：手动 release 抓 live 站点，生成 raw snapshot + `algorithm-manifest.json`
- verify 模式：CI 离线校验已入仓 snapshot / manifest / hash，一律不依赖实时外网
- 算法快照文档：首次接入或 hash/签名变化时更新
- parity：用 archived raw inputs + 离线 expected outputs 对账；live 网站 smoke 仅作为 release 手动步骤

---

## 文档维护

- 新增决策：在本文件追加；如决策需要详细背景论证，单独开 ADR 文件 `D-XX-题目.md`
- 决策修订：原决策标 `(已修订)` + 新决策加 `-rev` 后缀（如 D-02 → D-02-rev）
- 决策推翻：保留原决策为参考；新决策另起编号
- 与 v2.0 设计文档同步：v2.0 §6 风险 + 决策记录章节是本文件的浓缩版，二者一致性由 Product 维护

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
| **D-05-rev** | 开源协议 / 源数据留档 | ✅ 锁定 | 代码保持 MIT；`data/source/` 与 `docs/reference/` 保留源格式留档并版本控制；npm/package 仅分发清洗后的 JSON + TypeScript 类型；攻略原文入 `docs/reference/` 仅供参考，不作为 formal data | 中 |
| **D-06** | V1 第一目标用户 | ✅ 锁定 | P2 配队与对比（v2.0 后改为 CLI / AI surface 服务此画像） | 中 |
| **D-07** | 数据规则源 | ✅ 锁定 | 攻略 NGA 44468012 快照（rules-v0.1-attached-2026-05-04） + 数据来源（lo-user 提供 Excel + 米游社危局强袭战 + buhflipexplode.org/zzz/da/） | 高 |
| **D-08** | 视觉调性 | ⏳ 推迟 | V1 无 Web UI，调性决策推迟到 V2 阶段 | — |
| **D-09** | 紊乱是否进 V1 | ✅ 锁定 | 紊乱进 V1 计算引擎；V1 不提供专用交互 surface，仅 core / JSON 输出；V2 时再考虑 UI | 高 |
| **D-10** | 数据维护责任 | ✅ 锁定（v2.0 修订） | V1 阶段：lo-user 提供 Excel 主源 + 爬虫每版本手动 release；data 包必须做完整角色/音擎/驱动盘/影画/鸣徽/潜能激化数据 | 中 |
| **D-11** | 命名体系（v2.0 新增） | ✅ 锁定 | 选项 A 全套官方化：公开 schema / core API / data 字段优先使用 ZZZ 官方英文的语义化 camelCase；旧 `breach*` 进 sourceAliases / migration | 中 |
| **D-1=D**（S2 节奏） | V1 推进顺序 | ✅ 锁定 | S2 双门槛：schema discovery + 并行 scraper 准备；S6 全量化最后；不允许 data 全量化阻塞 core 启动 | 中 |

---

## CONFIRM-* （v2.0 设计期细化决策）

| ID | 主题 | 当前决策 |
|----|------|----------|
| **CONFIRM-1** | Handler 注入边界 | V1 仅允许"已注册 handler ID + 数据驱动参数注入"；不允许内联 JS；未来 V1.x+ 受信任扩展包显式注册（固定 EffectHandler 接口、纯函数、无 IO/网络/随机/时间依赖、必须输出 trace、带 manifest/version/source；CLI 默认不加载外部扩展） |
| **CONFIRM-2** | CLI 输出形态 | CLI = core 的薄壳，输出仅 JSON；下游消费者（AI plugin / Slock skill / 玩家脚本 / 未来 Web UI）按需自渲染 |
| **CONFIRM-3** | PNG 收益曲线导出 | 推迟到 V1.1+；V1 仅 CSV |
| **CONFIRM-4** | "手写"边界两层 | L1 = `@fairy/data` 对外发布的"游戏内数值规则数据"（不允许人工手填）；L2 = 开发期内部 fixture（`fixtures/golden/`，仅供 core 单测，允许人工手写并审核） |
| **CONFIRM-5** | data 包 V1 覆盖度 DoD | "黄金集硬要求 + 其余按 data 实际范围"；首批 20+ 黄金锚点涉及的代理人/敌人/装备 data 必须齐全；其余 fail loud |
| **CONFIRM-6** | monorepo 工具 | pnpm workspaces（lo-user 拍板 2026-05-05） |
| **CONFIRM-7** | V1 不做明确清单 | 能量循环 / 闪能循环 / 喧响循环模拟、秽盾完整状态机、打断时序、部位破坏时序、Web UI、OCR/截图识别（→V1.1）、AI plugin（→V1.1） |
| **CONFIRM-8** | CLI 子命令名 | 候选 `calc / compare / scan / explain / migrate`，最终命令名根据 S3 core exports 决定 |
| **CONFIRM-9** | 潜能激化定义 | 代理人加强系统，会带来技能形态、数值变动；具体效果由 data 包提供 |
| **CONFIRM-10** | AI 集成形态 | Claude Code Plugin 结构（V1.1 启动）；多工具适配通过 `.claude-plugin/plugins/<name>/skills` + `.cursor/` + `.codex/` 等配置目录；V1 仓库不预留 AI 工具目录 |
| **CONFIRM-11** | 数据源 | 米游社危局强袭战页（https://baike.mihoyo.com/zzz/wiki/channel/map/13/108）+ buhflipexplode.org/zzz/da/ + lo-user 提供 Excel；仅正式服 |
| **CONFIRM-12** | 数据契约两层职责分离 | `@fairy/data` = 游戏内确定的数值规则（不允许手写）；用户 `snapshot.json` = 玩家面板快照 + 装备选择 + 增益勾选（必须由用户提供） |
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

**v2.0 修订状态**：代码仓库仍按 MIT。源格式数据需要入仓留档以保证数据清洗可审计，但发布产物只包含清洗后的 JSON 与 TypeScript 类型。

**目录边界**：
- `data/source/`：Excel、raw crawler payload、source manifest；版本控制保留，不进入 npm/package 发布物
- `docs/reference/`：攻略原文等参考材料；版本控制保留，不进入 npm/package 发布物
- `data/cleaned/`：清洗后的派生 JSON staging 目录；发布前同步到 `packages/data/cleaned/`
- `packages/data/cleaned/`：`@fairy/data` npm/package 内实际分发的清洗 JSON mirror
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

---

## 文档维护

- 新增决策：在本文件追加；如决策需要详细背景论证，单独开 ADR 文件 `D-XX-题目.md`
- 决策修订：原决策标 `(已修订)` + 新决策加 `-rev` 后缀（如 D-02 → D-02-rev）
- 决策推翻：保留原决策为参考；新决策另起编号
- 与 v2.0 设计文档同步：v2.0 §6 风险 + 决策记录章节是本文件的浓缩版，二者一致性由 Product 维护

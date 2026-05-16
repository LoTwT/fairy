# D-22 AI Plugin V1.2.3 — Vision Recognition (Screenshot → BattleSnapshot Draft)

Status: ✅ Locked (2026-05-17, lo-user `e7c8a696` confirm)
Owner: @Product
Related: D-21 (AI Plugin V1.2.2 — scope + tri-layer i18n), CONFIRM-10
(AI 集成形态), D-19 (CLI 输出改革), D-02-rev (多语言)
Related plan PR: `plan/v1.2.3-vision` (TL-owned)
Related tasks: task #221 (TL), task #222 (UX), task #223 (QA), task #224 (Product)

## 1. 背景

V1.2.2 AI plugin（3 skill：`fairy-snapshot` / `fairy-calc` /
`fairy-explain`）已 source-level 完成在 `main@77c7b55`，per lo-user 选择
holds — 不 dogfood / 不 release。D-21 §3.2 把 **screenshot recognition**
锁定为 V1.2.3 forward-spec（多模态优先 / OCR 备选 / 同 BattleSnapshot
schema / review/edit gate / calc validation / NL fallback）。

2026-05-17 lo-user `e1ad99dc` 触发 V1.2.3 实施讨论，提供 2 张样例截图
（同一 build：零号·安比 Lv60 / 影画 2；UID present but intentionally omitted
from this public decision record）来自不同社区工具
（绝区零工坊 + 米游社）。4 方（Product/TL/UX/QA）就 8 项关键决策达成
align（per `e7c8a696` lo-user 全按推荐）。

## 2. 决策摘要（8 项 lock）

| # | 主题 | 决策 |
|---|------|------|
| Q1 | Source scope | **A — 仅支持社区工具截图**（不支持 in-game 截图；未来 V1.2.x+ 可扩展） |
| Q2 | 支持的社区工具 | **A1.a — 绝区零工坊 + 米游社 2 种 layout**（其他社区工具 → V1.2.x+ patch 扩展） |
| Q3 | PII 处理 | **A2.a — Vision extract 但 BattleSnapshot 不存 PII**（仅保留 agent identity + build composition；UID / 用户名等不写入 strict schema） |
| S1 | Schema 边界 | **Strict BattleSnapshot.panel = flat numeric totals**（per TL `2b9af466` confirm）；截图中的 base/bonus 拆分 → vision draft metadata / extraction evidence，不破现有 calc schema |
| I1 | Input 模式 | **Single-image default**（社区工具已 aggregate 整 build 到 1 张图）；multi-screenshot batch → V1.2.x+ 延后（per UX `417b40f5` finding #1） |
| L1 | Source detect + per-source layout map | Vision prompt 先 detect source (工坊 / 米游社 / unknown) → 走对应 layout map；unknown source fallback 走 generic OCR + ambiguity-heavy ask-user |
| C1 | Confidence model | 社区工具截图 → 几乎全 high confidence（structured text + clean numerical values）；NL 路径 Tier 2 "5★ midpoint default" 不在 vision 路径触发（per UX `417b40f5` finding #3） |
| F1 | NL fallback | Vision 低置信度 / 解析失败 / unknown source → fall through 到 fairy-snapshot NL 对话，复用现有 ask-user 3-tier dialog |

可逆性：中。Q1 / Q2 / Q3 / I1 可在 V1.2.x patch 中扩展；S1 是与 fairy
core 契约边界（不可破，扩展走 schema expansion 单独评审）；C1 / F1 可调
prompt 优化。

## 3. Scope 与 Out-of-Scope（V1.2.3 MVP）

### 3.1 In-Scope

- 单图 vision input（社区工具截图）
- 2 种 source 支持：绝区零工坊（微信公众号 / 小程序）+ 米游社（official BBS）
- Vision 字段 extraction：
  - Agent identity：name / level / mindscape / element
  - Panel 属性：HP / ATK / DEF / 冲击力 / 暴击率 / 暴击伤害 / 异常掌控 /
    异常精通 / 穿透率 / 能量回复 / 穿透值 / 元素伤害加成（如可见）
  - W-Engine：name / level / 精炼 (refinement)
  - Drive Discs (6 slots)：set name + slot index + main stat + substats
    with values + roll counts (如可见)
- Source auto-detect → per-source layout map
- Substat roll-count capture（社区工具显式显示）→ 高精度 vision parse
- BattleSnapshot.panel = total numeric values（per S1）
- Draft metadata 含：base/bonus 拆分证据 / source / confidence per field /
  vision raw output 引用 / unknown fields 标注
- Review/edit gate：用户 confirm 后才走 `fairy calc`（per V1.2.2 contract）
- NL fallback：vision 低置信度 → 触发 fairy-snapshot 3-tier ask-user
- Lang：zh-only MVP（zh UI 工具截图）；en / ja → V1.2.x+ forward-spec

### 3.2 Out-of-Scope（V1.2.3 不做）

- In-game 截图支持（→ V1.2.x+ patch）
- 其他社区工具（除工坊 + 米游社外）支持（→ V1.2.x+ patch）
- Multi-screenshot batch / sequential 输入（→ V1.2.x+ patch）
- OCR fallback 实施（→ V1.2.x patch；现 explicit non-goal）
- En / ja UI 多语言 vision parse（→ V1.2.x+ forward-spec）
- DA 危局强袭战 / 邦布详情 / 鸣徽 截图识别（→ V1.2.x+）
- Vision schema-native base/bonus 字段（仅 draft metadata，不破 strict
  BattleSnapshot；schema expansion 走单独评审）
- AI 直接从图算伤害（破坏 D-21 §6 AI.0 CLI-only 契约 — 严禁）

## 4. CLI-Only 计算契约（继承 D-21 §6 AI.0，不可逆）

V1.2.3 vision 必然保留 D-21 §6 AI.0 不可逆契约：

1. Vision extract 仅产 **reviewable BattleSnapshot draft + draft metadata**
2. 用户 confirm 后才走 `fairy calc <snapshot> --view verbose --lang <lang>`
3. AI **绝对不得** 在 CLI 外算任何 ZZZ 伤害 / 失衡 / 异常 / buff 数值
4. AI 不得在 vision parse 阶段进行任何数值"补全"或"估算"未在图中显示的值
5. fairy-explain 仍仅消费已 confirmed CalcResult，不基于 vision raw 输出
   解释

**Rationale**：vision 提高了输入精度（vs NL），但不改变 fairy 的核心
信任契约。QA G2 / G4 / V-G3 等独立验证 vision 路径不算数。

## 5. Tri-Layer i18n 契约（继承 D-21 §5）

V1.2.3 不破 D-21 §5 tri-layer 设计：

- Layer 1 Canonical (EN)：vision prompt skill name / SKILL.md / fixture file
  name / schema 字段 / acceptance gate 命名（V-G1..V-G5）等 EN canonical
- Layer 2 User-facing (zh/en mirror)：review/edit gate 文案 / vision
  confidence 提示 / unknown field 标注 zh/en 双语
- Layer 3 Data / query (zh / en where source supports)：agent name /
  W-Engine name / Drive Disc set name 等 entity normalization（zh ↔ en
  alias）；社区工具样例当前 zh-only，但 entity normalization layer 仍走
  D-21 §5.3 contract

## 6. Ownership Matrix

| Concern | Owner | 验证人 |
|---|---|---|
| Vision architecture / source detect / per-source layout map | @TechLead | @QA |
| Schema mapping (panel total vs draftMetadata.evidence) | @TechLead | @QA |
| Vision fixture contract + golden screenshot 标注规范 | @TechLead + @Product (sample 来源) | @QA |
| Vision verifier extension (`verify-ai-plugin` G6 类增 V-G1..V-G5) | @TechLead | @QA |
| Vision user journey / review/edit gate flow / per-source UX 差异 | @UX | @QA |
| Vision prompt template / ask-user vision-specific / confidence surface | @UX | @QA |
| Acceptance gates V-G1..V-G5 + G1-G10 vision 扩展 | @QA | @lo-user |
| 8 决策 lock / Scope / CLI-only 契约 / Tri-layer i18n 继承 | @Product | @lo-user |
| Sample screenshot 提供 + 字段标注 baseline | @lo-user → @TechLead + @QA fixture | — |
| V1.2.x patch hand-off (in-game / 多工具 / OCR / multi-image) | @Product → 后续 owner TBD | — |

## 7. Acceptance Gates

V1.2.3 vision-specific acceptance gates 由 QA owned，详见
`docs/ai-plugin/v1.2.3-vision/acceptance.md` canonical taxonomy。

Vision-specific gates V-G1..V-G5 涵盖：

- Source detection & layout routing
- Schema boundary（panel = totals / base+bonus → draftMetadata）
- Review/edit uncertainty & confidence surface
- PII exclusion（vision extract 但不进 strict BattleSnapshot）
- End-to-end CLI calc validation（vision draft → review → fairy calc）

G1-G10 vision 扩展 + G6 compare deferred 状态详见 acceptance.md。具体 gate
命名 / 验证脚本 / fixture coverage 全部以 `acceptance.md` 为 source of
truth；本 D-22 仅承载决策 lock，不重复 gate 命名定义。

## 8. Open Risks 与 follow-up

- **R-V13-1**：社区工具 layout 变更（工坊 / 米游社 改版）→ vision
  source detect 误判 / layout map 失效
  - 缓解：QA V-G1 fixture 周期性 re-run；release notes 标注 "layout 基于
    2026-05-17 截图样例" → 若 source layout 变需要 patch
- **R-V13-2**：Vision API 模型变更（Claude / Codex 模型升级）→ parse 行为
  不稳定
  - 缓解：fixture-based regression；version pin in plugin.json
- **R-V13-3**：用户提供非工坊 / 米游社截图（如其他社区工具 / in-game）→
  unknown source fallback 触发
  - 缓解：F1 NL fallback 兜底；user-journeys.md §G 显式 unknown-source UX
    路径
- **R-V13-4**：PII 隐私 — vision extract UID / 用户名后即使不存 schema，
  仍存在于 vision raw output / debug log
  - 缓解：QA V-G4 fixture 验证 raw output 不持久化；debug log 自动 mask
    PII pattern
- **R-V13-5**：字段精度 — 社区工具显示 vs in-game 实际可能有微小差异（如
  取整 / 不同口径），但 V1.2.3 仅以社区工具为输入源，与 in-game 不直接对账
  - 缓解：release notes 标注 "vision 输入精度基于社区工具数据"；如未来
    in-game 支持时需校准

## 9. 决策时间线

- 2026-05-17 00:16：lo-user `e1ad99dc` 触发"要不要把识图转换到 snapshot
  数据也做了"
- 2026-05-17 00:17~00:20：TL + Product feasibility 分析 + sequence 收敛
- 2026-05-17 00:18：lo-user `d5b6906f` 锁 T1-T5 sequence（patch → vision
  → dogfood）
- 2026-05-17 00:39：T1 V0.1.3 compare CLI patch ship done
- 2026-05-17 01:12：lo-user `c2391a92` 提供 2 张样例截图（工坊 + 米游社）
- 2026-05-17 01:14：UX `417b40f5` surface 5 项 vision findings；TL
  `834e024d` + `2b9af466` confirm schema 边界
- 2026-05-17 01:21：Product `52c69589` 完整描述待确认项
- 2026-05-17 01:24：lo-user `e7c8a696` 全按推荐 lock (Q1=A / Q2=A1.a /
  Q3=A2.a) → T2 plan PR sprint 启动

## 10. 相关文档

- `docs/ai-plugin/v1.2.3-vision/architecture.md`（TL）— Vision integration +
  source detect + schema mapping + fixture contract + verifier extensions
- `docs/ai-plugin/v1.2.3-vision/user-journeys.md`（UX）— Vision user
  journey + review/edit gate + 7 templates §A-§G + 5 findings fold-in
- `docs/ai-plugin/v1.2.3-vision/prompt-templates.md`（UX）— Vision prompt
  templates (canonical EN + user-facing zh/en mirror) + source-specific
  layout map + confidence surface templates
- `docs/ai-plugin/v1.2.3-vision/acceptance.md`（QA）— V-G1..V-G5
  vision-specific gates + G1-G10 vision 扩展 + 5-10 张 fixture acceptance
  strategy
- `docs/product/decisions/D-21-ai-plugin.md` — V1.2.2 baseline（继承 §5
  i18n + §6 CLI-only 契约）

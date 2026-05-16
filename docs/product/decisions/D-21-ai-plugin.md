# D-21 AI Plugin V1.2.2 — Scope + Architecture Principles + i18n Contract

Status: ✅ Locked (2026-05-16, lo-user 4-way go)
Owner: @Product
Related: CONFIRM-10 (AI 集成形态), D-02-rev (多语言), D-15 (data 包 4 入口),
D-19 (CLI 输出改革)
Related plan PR: `plan/v1.2.2-ai-plugin`
Related tasks: task #202 (TL), task #203 (UX), task #204 (QA), task #205 (Product)

## 1. 背景

V1.0 ~ V0.1.2 已交付 monorepo CLI (`@randomplay/cli`) + cleaned data
(`@randomplay/data`) + 计算核心 (`@randomplay/core`)。CONFIRM-10 在 v2.0
设计期约定 V1.1 启动 Claude Code Plugin 形态的 AI 集成，不在 V1
仓库预留 AI 工具目录。

V0.1.2 ship 后，lo-user 在 #fairy 启动 AI plugin V1.2.2 设计讨论，4 方
（Product / TechLead / UX / QA）就 8 项关键决策达成 align。本 ADR 锁定
决策内容、可逆性、责任边界与下游影响。

## 2. 决策摘要（8 项 lock）

| # | 主题 | 决策 |
|---|------|------|
| AI.0 | 核心原则 | "薄 layer"：AI 负责结构化与解释，计算只信 fairy CLI；AI 不算数 |
| AI.1 | 支持的 AI 工具 | V1.2.2 仅 Claude Code Plugin + Codex (`.codex/`)；Cursor 延后 |
| AI.2 | G6 compare gate | 延后到 V1.2.x 后续 patch，与 `fairy compare` 配套到位时再启 |
| AI.3 | 截图识别 | V1.2.3 forward-spec：多模态模型优先，OCR 备选；同一 BattleSnapshot schema + review/edit + calc validation + NL fallback |
| AI.4 | QA 接受门 | G1-G10（G6 defer）；3-tier fixture strategy（critical / optional / unknown） |
| U1 | Primary persona | P1 ZZZ player（非开发者也能用） |
| U2 | Skill 命名 + chaining + discovery | 3 skill：`fairy-snapshot` / `fairy-calc` / `fairy-explain`（详见 §4）；A 模型自主链式 + critical step review/confirm；trigger phrases + `SKILL.md` 自描述 |
| U3 | Tri-layer i18n | Layer 1 Canonical EN / Layer 2 user-facing zh/en mirror / Layer 3 data zh/en where source supports；lang detection (ii) auto-detect + override sticky per session（详见 §5） |

可逆性：中。命名、chaining 模型、lang detect 可在 V1.2.x patch 改；
tri-layer 契约改动须同时改 plugin 仓与 ai-plugin 文档；CLI-only 计算
边界 (AI.0) 不可逆——这是 fairy 的核心信任契约。

## 3. Scope 与 Out-of-Scope（V1.2.2）

### 3.1 In-Scope

- 2 用户入口：
  - 入口 1（主旅程）：NL → snapshot → calc → explain，AI 自主链式
  - 入口 2（standalone explain）：对已有 CalcResult 做解释
- 3 内部 skill：`fairy-snapshot` / `fairy-calc` / `fairy-explain`（详见 §4）
- 工具适配：Claude Code Plugin (`.claude-plugin/plugins/<name>/skills`) +
  Codex (`.codex/`)
- ask-user 3-tier dialog（critical 必问 / optional 默认空 / unknown 标注）
- entity normalization layer（zh ↔ en alias → canonical key）
- CLI 强约束：所有数值计算必须经 `fairy calc`，AI 不得自行求值
- fail-loud：CLI 错误、schema 校验失败、unresolved entity 等必须显式上抛
- tri-layer i18n（详见 §5）

### 3.2 Out-of-Scope（明确不做，避免范围漂移）

- Cursor 适配（→ V1.2.x 后续 patch）
- 截图识别 / OCR / 视觉输入（→ V1.2.3）
- `fairy compare` 集成 + G6 compare gate（→ V1.2.x 后续 patch）
- Meta-skill `/help fairy`（trigger phrases + SKILL.md 自描述已足够）
- AI 直接读 raw source（破坏 fairy CLI 唯一计算源原则）
- AI 自主修改 CalcResult / snapshot 已 confirm 字段（破坏 fail-loud）
- 跨 session 持久 memory（V1.2.2 只做 per-session sticky）

## 4. Skill 设计（U2 final）

### 4.1 命名（canonical EN + zh display）

| Canonical (EN) | Display (zh) | 职责 |
|---|---|---|
| `fairy-snapshot` | 生成快照 | NL → BattleSnapshot.json，含 3-tier ask-user + entity normalization |
| `fairy-calc` | 计算伤害 | 调 `fairy calc` CLI，解析 JSON 输出，fail-loud |
| `fairy-explain` | 解释结果 | 消费已有 CalcResult（trace + summary + warnings + sourceRef + disclaimer），输出自然语言解读 |

**Trace 语义**：作 `fairy-explain` 的 trigger alias
（"explain trace" / "trace breakdown" / "解释 trace"），不丢失精度但
不锁死 skill 名。

**命名 reconcile 记录**：Product 初推 `fairy-snapshot-builder`，UX/TL/QA
3 方收敛 `fairy-snapshot`。Product 接受短命名，理由：parallel pattern
（3 skill 等长）+ trigger phrases 兜底 action 语义 + display label 自带
verb + 能力 evolution 余地 + QA acceptance contract 替代 name 中的
`-builder` 约束。

### 4.2 Skill 边界

| Skill | 不得做 |
|---|---|
| `fairy-snapshot` | 不脑补未提供字段；不做数值计算；不直接读 raw source |
| `fairy-calc` | 不在 CLI 外算任何数；不修改 CalcResult；fail 时不编造 |
| `fairy-explain` | 不调 CLI；只消费 actual JSON；不解释 CalcResult 中不存在的字段 |

### 4.3 Chaining 模型（A）

AI 在同一对话内自主衔接 `fairy-snapshot` → `fairy-calc`（→
`fairy-explain`），无需用户手动二次触发。**critical step**（snapshot
draft 完成时、calc 输出 fail 时）必须给用户 review/confirm 机会。

### 4.4 Discovery

- Trigger phrases 写进 `SKILL.md` metadata（zh + en，含 trace alias）
- SKILL.md 自描述能力 + 输入 / 输出 / 边界 + 触发例子
- V1.2.2 不加单独 meta-skill；`SKILL.md` 自描述 + plugin.json 列表已足够

### 4.5 Skill 内部协作

- `fairy-snapshot` 输出 BattleSnapshot.json → `fairy-calc` 消费
- `fairy-calc` 输出 CalcResult.json → `fairy-explain` 消费（也可
  standalone 由用户提供）
- 每 skill 独立 SKILL.md + 独立 few-shot fixture；canonical EN 一致

## 5. Tri-Layer i18n 契约（U3 final，lo-user 原设计）

### 5.1 Three layers

| Layer | 范围 | 语言策略 |
|---|---|---|
| Layer 1 Canonical | 目录 / skill name / plugin.json / SKILL.md / schema / few-shot / architecture / acceptance | **仅英文** |
| Layer 2 User-facing | ask-user 对话 / AI 回复 / error / disclaimer / onboarding / calc summary | **zh / en 双语 mirror** |
| Layer 3 Data / query | entity alias / NL 输入 / CLI `--lang` flag | **zh / en where source supports** |

### 5.2 Lang detection（(ii) auto-detect + override sticky）

- 默认：检测当前 user message 主导 lang（majority words）
- Override priority：显式命令 > sticky session lang > 默认检测
- Override 模式："switch to english" / "用英文回答" / `/lang en` 等
  pattern，AI 识别后 sticky 当前 session
- Per-session sticky：用户中途切换 lang 才变，避免每轮 flip-flop
- 4 类 edge case cover：
  1. 混合 lang 输入（"算 Yixuan 的 burst damage 多少"）→ majority 决定
  2. Entity name lang ≠ dialog lang（zh 对话提 "Yixuan"）→ dialog
     按主导 lang，entity 走 normalization layer
  3. 用户中途切换 lang → 显式 override 才生效
  4. 显式命令 → 立即 sticky

### 5.3 为什么 tri-layer（不是 full bilingual mirror）

- Layer 1 英文 canonical 让 plugin 维护 / 跨工具协作成本最低（plugin.json
  / SKILL.md 等 spec 文件全行业标准是英文）
- Layer 2 user-facing 双语 mirror 保证 P1 ZZZ player 体验
- Layer 3 data 双向 alias 让用户用 zh 输入也能命中 canonical entity
- 避免 full mirror 的维护成本（doc 双写 + drift 风险）

## 6. CLI-Only 计算契约（AI.0，不可逆）

AI plugin **绝对不得**在 CLI 外做任何 ZZZ 伤害 / 失衡 / 异常 / 紊乱 /
buff 数值计算。所有计算必须：

1. 由 `fairy-snapshot` 生成的 BattleSnapshot.json 作为输入
2. 由 `fairy-calc` 触发 `fairy calc` CLI 子进程执行
3. 输出由 `fairy-calc` 解析为 CalcResult.json
4. 由 `fairy-explain` 消费 CalcResult.json 做自然语言解读

**严禁场景**：
- AI 看到 snapshot 后自行估算或近似
- AI 在 CLI fail 时编造一个"大概数"
- AI 在 explain 中给出 CalcResult 没有的派生数值
- AI 修改 CalcResult 任何字段

**Rationale**：fairy 的核心价值是确定性 + 可审计；让 AI 算数会立刻
破坏这两条。QA G2/G4 必须独立验证这条契约。

## 7. Ownership Matrix

| Concern | Owner | 验证人 |
|---|---|---|
| Plugin 整体架构 / `.claude-plugin/` 结构 / Codex `.codex/` 适配 | @TechLead | @QA |
| Skill 内部协作流 / chaining 实现 | @TechLead | @QA |
| User journey / ask-user 3-tier dialog / 错误 copy / onboarding | @UX | @QA |
| Prompt templates / few-shot fixture / entity normalization 示例 | @UX | @QA |
| QA acceptance G1-G10 / fixture strategy / fresh-install smoke | @QA | @lo-user |
| 8 决策 lock / tri-layer i18n contract / scope 边界 | @Product | @lo-user |
| CLI-only 计算边界 (AI.0) 实现 | @TechLead | @QA（独立 fixture 验证） |
| `fairy calc --lang` forward + entity alias canonical | @TechLead | @QA |
| V1.2.3 截图识别 forward-spec hand-off | @Product → V1.2.3 owner TBD | — |

## 8. Acceptance Gates（G1-G10 with G6 defer，详见 QA `acceptance.md`）

| Gate | 主题 | V1.2.2 状态 |
|---|---|---|
| G1 | Plugin 安装 / discovery / fresh install smoke | required |
| G2 | `fairy-calc` 必须调 CLI（AI 不自算） | required |
| G3 | `fairy-snapshot` NL → BattleSnapshot 正确性 + ask-user dialog | required |
| G4 | CLI fail-loud（错误透传 + 不编造） | required |
| G5 | `fairy-explain` 字段消费正确性（不解释不存在字段） | required |
| G6 | `fairy compare` 集成 + 多 snapshot 对比 | **deferred** |
| G7 | Tri-layer i18n / lang detect / override sticky / 4 edge case | required |
| G8 | Entity normalization（zh ↔ en alias） | required |
| G9 | Chaining 模型 A（critical step review/confirm） | required |
| G10 | Fixture 3-tier 策略覆盖 + release smoke | required |

## 9. Open Risks 与 follow-up

- **R-AI-1**：AI 自主链式 (Chaining A) 在 Codex 与 Claude Code 上行为差异
  → TL 在 `architecture.md` 标注差异 + QA G9 双工具覆盖
- **R-AI-2**：Entity normalization 漏 alias 导致 unresolved → QA G8 配套
  fixture（至少 zh 5 + en 5）+ fail-loud（不静默匹配）
- **R-AI-3**：Tri-layer i18n drift（Layer 2 双语 mirror 长期失同步） →
  UX 在 `prompt-templates.md` 提供 zh/en 同 PR 修改的检查清单 + 后续可
  考虑 lint script
- **R-AI-4**：V1.2.3 截图识别接入后，BattleSnapshot schema 需向前兼容
  → Product 在 V1.2.3 决策时把 schema diff 作为 gate

## 10. 决策时间线

- 2026-05-16 17:30~17:57：4 方讨论 8 项决策 + 命名 reconcile
- 2026-05-16 18:08：lo-user 要求 Product 总结
- 2026-05-16 18:16：lo-user 回 "go" → 启动 4-way plan PR sprint
- 2026-05-16 18:17：4 task 创建 + UX / QA 已 claim 各自 deliverable

## 11. 相关文档

- `docs/ai-plugin/architecture.md`（TL）— 系统架构 + 实现细节
- `docs/ai-plugin/user-journeys.md`（UX）— 用户旅程 + ask-user 3-tier
- `docs/ai-plugin/prompt-templates.md`（UX）— canonical + user-facing
  prompt 模板 + entity normalization fixture
- `docs/ai-plugin/acceptance.md`（QA）— G1-G10 acceptance gate + fixture
  strategy

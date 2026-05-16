# fairy AI plugin · Prompt templates & i18n

- Status: V1.2.2 plan draft (Phase B)
- Owner: @UX
- Drafted: 2026-05-16
- Companion: `docs/ai-plugin/user-journeys.md` (UX) · `docs/ai-plugin/architecture.md` (TL) · `docs/ai-plugin/acceptance.md` (QA) · `docs/product/decisions/D-21-ai-plugin.md` (Product)

## 1. Tri-layer i18n contract (lo-user proposed, 4-way locked)

| Layer | Language | Contents |
|---|---|---|
| Layer 1 — **Canonical** | English only | plugin.json keys, SKILL.md metadata, skill names, schema/API/command field names, trigger phrases, few-shot fixtures, architecture/acceptance docs |
| Layer 2 — **User-facing** | zh / en mirror | ask-user dialog templates, AI response templates, error copy, calc summary, explain output, disclaimer, onboarding copy |
| Layer 3 — **Data/query** | zh/en where source supports | entity alias recognition (zh ↔ en), NL input parsing, CLI `--lang` flag forwarding |

This doc is structured to mirror the contract: §2-§3 are Layer 1 (EN only); §4-§7 are Layer 2 (zh/en mirror); §8 is Layer 3 (normalization fixtures).

---

## 2. Canonical — plugin.json

```jsonc
{
  "name": "fairy",
  "version": "1.2.2",
  "displayName": {
    "en": "fairy — ZZZ damage calculator",
    "zh": "fairy — 绝区零伤害计算器"
  },
  "description": "AI-driven damage calculator for Zenless Zone Zero. Build snapshots from natural language, run fairy CLI, and explain the math.",
  "author": "LoTwT",
  "license": "MIT",
  "homepage": "https://github.com/LoTwT/fairy",
  "minFairyCliVersion": "0.1.2",
  "supportedTools": ["claude-code", "codex"],
  "skills": [
    "fairy-snapshot",
    "fairy-calc",
    "fairy-explain"
  ]
}
```

**Notes**:
- `displayName` is the only field with embedded localization; rendered by tool host based on user lang preference. Everything else is English canonical.
- `minFairyCliVersion` is enforced by skill preflight; mismatch → fail-loud with install hint (see §6).
- `supportedTools` declares V1.2.2 scope; Cursor explicitly not in list.

---

## 3. Canonical — SKILL.md metadata

Each skill ships with a `SKILL.md` file under `.claude-plugin/plugins/fairy/skills/<skill>/`. The skill's spec is English-canonical.

### 3.1 fairy-snapshot

```yaml
---
name: fairy-snapshot
displayName:
  en: Build snapshot
  zh: 生成快照
description: >
  Turn a natural-language build description into a valid fairy BattleSnapshot
  JSON. Asks the user about missing critical fields, defaults optional fields
  with a warning, and validates the result by running `fairy calc --view verbose`
  before returning.
trigger:
  phrases:
    - "build snapshot"
    - "build a snapshot"
    - "make snapshot"
    - "compose snapshot"
    - "组配装"
    - "生成快照"
    - "我想算"
    - "帮我算"
    - "怎么算"
  patterns:
    - input contains agent name + build context (W-Engine / Drive Disc / level)
inputs:
  - userBuildDescription: string (NL, zh or en)
  - partialSnapshot: BattleSnapshot (optional; for V1.2.3 vision fallback)
outputs:
  - snapshot: BattleSnapshot (validated against parseBattleSnapshot)
  - draftMetadata.defaultedFields: string[] (optional defaults/omissions surfaced to the user; not written as ad hoc snapshot fields)
  - draftMetadata.unknownFields: string[] (unknowns surfaced to the user; not written as ad hoc snapshot fields)
calls:
  - "fairy calc <snapshot> --view verbose --lang <lang>" (for validation only; result discarded)
boundary:
  - never invent critical field values
  - never compute damage
  - never read raw source files
---
```

### 3.2 fairy-calc

```yaml
---
name: fairy-calc
displayName:
  en: Calculate damage
  zh: 计算伤害
description: >
  Invoke fairy CLI with a validated BattleSnapshot, parse the CalcResult JSON,
  and produce a brief natural-language summary. Forwards the user's language
  preference to the CLI.
trigger:
  phrases:
    - "calc damage"
    - "calculate damage"
    - "compute damage"
    - "run fairy"
    - "算伤害"
    - "跑一下"
    - "看结果"
  patterns:
    - input contains BattleSnapshot JSON
    - chained downstream of fairy-snapshot
inputs:
  - snapshot: BattleSnapshot
  - view: "brief" | "verbose" (optional; default verbose)
  - lang: "zh" | "en" (optional; default from session)
outputs:
  - calcResult: CalcResult (full CLI JSON)
  - briefSummary: string (1-2 paragraphs NL, in session lang)
calls:
  - "fairy calc <snapshot> --view <view> --lang <lang>"
boundary:
  - never implement calculation logic in AI
  - never modify CalcResult
  - never fabricate output when CLI fails
---
```

### 3.3 fairy-explain

```yaml
---
name: fairy-explain
displayName:
  en: Explain result
  zh: 解释结果
description: >
  Read an existing CalcResult JSON and produce a paragraph-style natural-language
  walkthrough of trace, modifiers, sourceRef, warnings, and disclaimer. Does not
  re-run the calculation.
trigger:
  phrases:
    - "explain"
    - "explain trace"
    - "explain this result"
    - "trace breakdown"
    - "解释结果"
    - "解释 trace"
    - "解读"
    - "分析"
    - "为什么是这个数"
  patterns:
    - input contains CalcResult JSON
inputs:
  - calcResult: CalcResult
  - focus: "trace" | "summary" | "warnings" | "full" (optional; default full)
  - lang: "zh" | "en" (optional; default from session)
outputs:
  - explanation: string (paragraph-style NL, in session lang)
calls: []
boundary:
  - never invoke fairy calc (use fairy-calc skill for that)
  - never fabricate trace / multiplier / sourceRef
  - reference only fields present in the input CalcResult
---
```

---

## 4. User-facing — ask-user dialog templates (zh / en mirror)

Per `user-journeys.md` §3 (3-tier policy). All templates follow the structure: question + context + options (if applicable) + skip clause (if optional).

### 4.1 Tier 1 — Critical (must ask)

**Single critical field**:

```
zh:
  "[问题]
   这是 fairy 计算的关键字段，没有它我没法算。
   [选项 1 / 选项 2 / ... 或自由文本]"

en:
  "[question]
   This is a critical field for fairy — I can't calculate without it.
   [option 1 / option 2 / ... or free text]"
```

**Batch (2-4 critical fields)**:

```
zh:
  "我需要几个关键字段才能算，请回答这几个：
   1. [问题 1]
   2. [问题 2]
   3. [问题 3]
   你可以一起回答，或者一个一个来。"

en:
  "I need a few critical fields before I can calculate. Please answer:
   1. [question 1]
   2. [question 2]
   3. [question 3]
   You can answer in one message or one at a time."
```

**User says "unknown" for critical**:

```
zh:
  "了解。不过 [字段名] 是关键字段，没有它的话结果会有比较大的偏差或者算不出来。
   你确定要继续吗？我会在结果里标个 warning。"

en:
  "Got it. But [field-name] is critical — without it the result may be off
   significantly or fail to calculate. Do you want to proceed anyway?
   I'll flag a warning on the result."
```

### 4.2 Tier 2 — Optional (warn-and-default)

```
zh (silent default, surfaced in summary):
  "（结果摘要里）注意: [字段] 没指定，用了默认值 [默认], 结果可能偏差约 [%]。"

en:
  "(in calc summary) Note: [field] was not specified; defaulted to [default],
   result may be off by ~[%]."
```

If user explicitly says "optional 也不知道":

```
zh:
  "OK, 我用 default 值 [默认值]。如果实际不一样，结果会偏差约 [%]。"

en:
  "OK, I'll use default [default-value]. If the actual is different, expect
   ~[%] deviation."
```

### 4.3 Tier 3 — Unknown marker (proceed with explicit unknown)

```
zh:
  "[字段] 我也没数据。我会在 draft metadata 里把它标成 unknown；
   如果 snapshot schema 仍然校验通过，calc 可以继续跑，但结果里会有 warning。
   可以这样吗？"

en:
  "I don't have data for [field] either. I'll mark it as unknown in draft
   metadata. If the snapshot still validates against the schema, calc can run,
   but the result will carry a warning. OK?"
```

Implementation note: `unknown` is a draft metadata marker unless the current
`BattleSnapshot` schema explicitly supports that value at the target path. Do
not add ad hoc fields or string values that would fail the strict schema.

### 4.4 Ambiguity disambiguation

```
zh:
  "你说的 [entity] 我看到 [N] 个候选：
   1. [候选 1] (额外信息: id / 版本 / rank)
   2. [候选 2] ...
   是哪个？"

en:
  "I see [N] candidates for [entity]:
   1. [candidate 1] (extra info: id / version / rank)
   2. [candidate 2] ...
   Which one?"
```

---

## 5. User-facing — AI response templates

### 5.1 Snapshot review/confirm (between fairy-snapshot and fairy-calc)

```
zh:
  "我帮你组好了 snapshot:
   - 角色: [agent display name] [level] 级
   - W-Engine: [weapon display name]
   - Drive Disc: [4pc set] + [2pc set]
   - 关键属性: [panel summary]
   - 默认/省略的字段: [draftMetadata.defaultedFields list, 如有]
   - 标 unknown 的字段: [draftMetadata.unknownFields list, 如有]

   要继续算吗？或者有要改的地方告诉我。"

en:
  "Here's the snapshot I built:
   - Agent: [agent display name] level [level]
   - W-Engine: [weapon display name]
   - Drive Disc: [4pc set] + [2pc set]
   - Key stats: [panel summary]
   - Defaulted/omitted fields: [draftMetadata.defaultedFields list, if any]
   - Unknown fields: [draftMetadata.unknownFields list, if any]

   Run the calc? Or tell me what to change."
```

### 5.2 Calc summary (after fairy-calc)

```
zh:
  "总伤害: [total]
   主要来源: [top 2-3 lanes with %]
   关键 modifier: [top 2-3 modifiers with source]
   [Warning: ...] (如有)
   [Disclaimer footer]"

en:
  "Total damage: [total]
   Top contributors: [top 2-3 lanes with %]
   Key modifiers: [top 2-3 modifiers with source]
   [Warning: ...] (if any)
   [Disclaimer footer]"
```

### 5.3 Explain output (paragraph-style trace walkthrough)

```
zh:
  "你的 [agent] [attack-context] 伤害 [total] 的计算过程:
   - 基础攻击 [value] (来自 [sourceRef → friendly name])
   - 乘 [step] [multiplier] (来自 [sourceRef → friendly name])
   - ...
   ⇒ [total]
   [Warnings 段, 如有]
   [Disclaimer footer]"

en:
  "The breakdown for your [agent] [attack-context] damage of [total]:
   - Base attack [value] (from [sourceRef → friendly name])
   - Apply [step] [multiplier] (from [sourceRef → friendly name])
   - ...
   ⇒ [total]
   [Warnings section, if any]
   [Disclaimer footer]"
```

---

## 6. User-facing — error copy (zh / en mirror)

### 6.1 CLI not installed

```
zh:
  "你本地还没装 fairy CLI（或者版本比 [minVersion] 老）。
   请运行: pnpm dlx @randomplay/cli@latest
   装好后再 ping 我，我们继续。"

en:
  "fairy CLI is not installed locally (or version is older than [minVersion]).
   Please run: pnpm dlx @randomplay/cli@latest
   Then ping me and we'll continue."
```

### 6.2 Snapshot validation failure

```
zh:
  "snapshot 校验没通过: [translated stderr in user-friendly terms]
   通常的原因是 [common cause]。
   要我帮你修一下吗？需要你告诉我 [field-to-fix]。"

en:
  "Snapshot validation failed: [translated stderr in user-friendly terms]
   The usual cause is [common cause].
   Want me to fix it? I need you to tell me [field-to-fix]."
```

### 6.3 Entity not found

```
zh:
  "我在 fairy 数据里没找到 [entity]。可能是:
   - 名字拼错了（你是不是想说 [closest matches]?）
   - 是新角色 / 武器，nanoka 数据还没更新（live version 是 [version]）
   - 是 leaked / beta 内容，目前 fairy 不支持 (per 数据源策略)

   请告诉我准确的名字。"

en:
  "I couldn't find [entity] in fairy's data. Possible reasons:
   - Misspelling (did you mean [closest matches]?)
   - New agent/weapon not yet in nanoka data (current live version: [version])
   - Leaked/beta content (not supported per data source policy)

   Please give me the exact name."
```

### 6.4 Malformed CalcResult (explain skill)

```
zh:
  "你贴的内容不是有效的 fairy CalcResult JSON。常见原因:
   - 截断了（JSON 不完整）
   - 字段被改了
   - 不是 fairy 输出

   请确认完整粘贴 `fairy calc ... --view verbose` 的完整输出。"

en:
  "The pasted content isn't a valid fairy CalcResult JSON. Common reasons:
   - Truncated (JSON incomplete)
   - Fields modified
   - Not produced by fairy

   Please paste the complete `fairy calc ... --view verbose` output."
```

---

## 7. User-facing — disclaimer & onboarding

### 7.1 Disclaimer footer (every calc summary + every explain output)

```
zh:
  "数据基于 nanoka@[live-version] cleaned snapshot.
   如有版本更新请重新 fetch 数据。
   如有侵权请联系作者删除。"

en:
  "Data is based on nanoka@[live-version] cleaned snapshot.
   Re-fetch the data after game patches.
   For takedown requests please contact the maintainer."
```

Note: surfaced **once per session** for live-data outputs; onboarding always includes it.

### 7.2 Onboarding (first invocation or `/help fairy`)

```
zh:
  "fairy 是 Zenless Zone Zero 的伤害计算器。
   我能帮你做三件事:
   1. 生成快照 — 用自然语言描述你的构筑，我帮你组 snapshot 并算伤害
   2. 计算伤害 — 你给我 snapshot.json, 我帮你跑 fairy CLI
   3. 解释结果 — 你给我 CalcResult JSON, 我帮你看懂每一步

   现在告诉我你想算什么？或者贴一个 CalcResult JSON 给我解释。

   [Disclaimer footer]"

en:
  "fairy is a Zenless Zone Zero damage calculator.
   I can help you with three things:
   1. Build snapshot — describe your build in natural language; I'll build
      the snapshot and run the calc.
   2. Calculate damage — give me a snapshot.json; I'll run fairy CLI.
   3. Explain result — give me a CalcResult JSON; I'll walk you through
      each step.

   What do you want to calculate? Or paste a CalcResult JSON for me to explain.

   [Disclaimer footer]"
```

### 7.3 Lang override acknowledgment

When user explicitly switches lang via override phrase:

```
zh → en switch detected:
  "OK, switching to English from now on."

en → zh switch detected:
  "OK, 接下来用中文回答。"
```

---

## 8. Data/query — entity normalization fixtures

Per `acceptance.md` G1-G3 fixture strategy and `user-journeys.md` §2 entity recognition. Three sub-fixtures: zh → canonical, en → canonical, ambiguous → disambiguate.

### 8.1 zh → canonical (sample, 2-3 each domain)

| zh input | Canonical | Example user phrase |
|---|---|---|
| 仪玄 | `character.id=1371` | "我想算仪玄..." |
| 妮可 | `character.id=1031` (Nicole Demara) | "妮可的伤害..." |
| 啄木鸟电音 | `equipment.setId=31000` | "啄木鸟电音 4 套..." |
| 钢铁躯壳 | `equipment.setId=32004` | "...加钢铁躯壳 2 件套" |
| 企鹅布 | `bangboo.id=54001` | "...邦布带企鹅布" |
| 危局强袭战 | DA scope marker | "危局强袭战本期 boss" |

### 8.2 en → canonical (sample, 2-3 each domain)

| en input | Canonical | Example user phrase |
|---|---|---|
| Yixuan | `character.id=1371` | "I want to calc Yixuan..." |
| Nicole | `character.id=1031` | "Nicole's damage..." |
| Woodpecker Electro | `equipment.setId=31000` | "Woodpecker Electro 4pc" |
| Hormone Punk | `equipment.setId=32004` (Steel Cushion alias check needed) | "...with Hormone Punk 2pc" |
| Penguinboo | `bangboo.id=54001` | "...with Penguinboo" |
| Deadly Assault | DA scope marker | "current DA boss" |

### 8.3 Ambiguity disambiguation fixtures

| User input | Candidates surfaced |
|---|---|
| "Anby" | (1) Anby Demara `character.id=1011` |
| "S11" | (1) Soldier 11 `character.id=1041` |
| "Burnice" / "Burnis" / "本子" | (1) Burnice `character.id=1051` |
| "Drive 4" | clarify: "你是说位置 4 的 Drive Disc 还是 4 件套？" |

### 8.4 Cross-lang ambiguity (entity name lang ≠ dialog lang)

User dialog lang: zh. Entity name in en:
```
zh dialog: "算一下 Yixuan 60 级"
→ entity normalization: Yixuan → 仪玄 (character.id=1371)
→ session lang stays zh
→ AI response in zh: "我帮你查到仪玄 60 级..."
```

User dialog lang: en. Entity name in zh:
```
en dialog: "calculate 仪玄 level 60"
→ entity normalization: 仪玄 → Yixuan (character.id=1371)
→ session lang stays en
→ AI response in en: "Yixuan level 60 build..."
```

---

## 9. Trigger phrase reference (canonical layer extended)

Consolidated trigger phrases per skill (also in §3 SKILL.md). AI agent uses these for skill routing:

### fairy-snapshot triggers

EN: `build snapshot` / `build a snapshot` / `make snapshot` / `compose snapshot` / `prep build` / `set up snapshot`
ZH: `组配装` / `生成快照` / `我想算` / `帮我算` / `怎么算` / `算一下` (+ build description)

### fairy-calc triggers

EN: `calc damage` / `calculate damage` / `compute damage` / `run fairy` / `run calc`
ZH: `算伤害` / `跑一下` / `看结果` / `算一下伤害`

### fairy-explain triggers

EN: `explain` / `explain trace` / `explain this result` / `trace breakdown` / `walk through`
ZH: `解释结果` / `解释 trace` / `解读` / `分析` / `为什么是这个数` / `算法怎么算的`

---

## 10. Lang override patterns (canonical recognition list)

AI agent must recognize all of these phrases as explicit lang override (per `user-journeys.md` §5):

**Zh → En**:
- `用英文回答` / `用 en 回复` / `switch to english` / `respond in english` / `English please` / `/lang en`

**En → Zh**:
- `用中文回答` / `中文回复` / `switch to chinese` / `respond in chinese` / `中文 please` / `/lang zh`

Override is sticky from the same turn's AI response, persists for the rest of session unless overridden again.

---

## 11. Few-shot fixture pointers (canonical EN, for QA G4)

Few-shot prompt fixtures are EN-canonical (per QA `39ce78c9` G4 strategy): same canonical prompt/snapshot/calc baseline; user I/O lang covered by smoke tests in user-facing layer. Concrete fixtures live under `examples/ai-plugin/`:

- `examples/ai-plugin/prompts/build-yixuan-basic.md` — minimal NL build description → snapshot
- `examples/ai-plugin/prompts/build-yixuan-full.md` — full NL build with all critical fields filled
- `examples/ai-plugin/prompts/build-yixuan-ambiguous.md` — NL with ambiguous entity → disambiguation flow
- `examples/ai-plugin/snapshots/yixuan-basic.json` — expected snapshot output
- `examples/ai-plugin/expected/yixuan-basic-calc.json` — expected CalcResult shape (for explain skill fixture input)

QA fixture coverage matrix (per `acceptance.md`):
- Skill spec discovery (G1/G2/G7/G9): EN canonical only.
- Entity normalization (G3): zh → canonical + en → canonical, 2-3 examples each.
- User-facing output (G3/G4/G5/G8/G10): zh + en each 1-2 smoke per skill.

---

## Appendix · Cross-references

- User journey definitions: `docs/ai-plugin/user-journeys.md`
- Architecture: `docs/ai-plugin/architecture.md`
- Acceptance gates: `docs/ai-plugin/acceptance.md`
- Decision lock: `docs/product/decisions/D-21-ai-plugin.md`
- fairy schema definitions: `packages/core/src/schema/battle-snapshot.ts` + `calc-result.ts`
- Disclaimer policy: D-20 §README disclaimer

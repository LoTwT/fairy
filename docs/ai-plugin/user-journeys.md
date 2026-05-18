# fairy AI plugin · User Journeys

- Status: V1.2.3 implementation baseline
- Owner: @UX
- Drafted: 2026-05-16
- Companion: `docs/ai-plugin/prompt-templates.md` (UX) · `docs/ai-plugin/architecture.md` (TL) · `docs/ai-plugin/acceptance.md` (QA) · `docs/product/decisions/D-21-ai-plugin.md` (Product)
- Scope lock per Product D-21 + D-22: tri-layer i18n; 4 approved skills; 3 user entries; Claude Code + Codex only; community-tool screenshot input via `fairy-vision`; in-game/OCR/multi-image deferred.

## How to read this document

This is the **user-journey contract** for the V1.2.3 AI plugin. It defines who uses the plugin, how they reach it, what each skill does for them, and how the plugin handles missing data / errors / language preference. The contract that QA validates is in `acceptance.md`; the implementation contract is in `architecture.md`; the prompt strings are in `prompt-templates.md`.

Reading order:
- @TechLead implementing skills → §2 user flows + §3 ask-user policy + §4 error recovery + §7 V1.2.3 forward-spec
- @QA writing G1-G10 fixtures → §2 + §3 + §5 lang detection edge cases
- @Lo丶 reviewing scope → §1 personas + §6 onboarding/disclaimer

---

## 1. Personas

V1.2.3 primary persona is **P1**; P2 / P3 are secondary and not optimization targets. Persona priority is decision input for every UX choice in this doc.

### P1 — ZZZ player (primary)

- Plays Zenless Zone Zero, builds teams, optimizes Drive Disc + W-Engine combinations.
- **Not** a developer. Has never opened a CLI; "JSON" is a foreign word.
- Reaches the plugin from Claude Code (or future Codex) because a friend / community post recommended it.
- Wants to ask in natural language: "我想看看仪玄带啄木鸟电音 4 套伤害多少", and get a clear numeric answer with an explanation they can show in their guild chat.
- Will abandon the plugin if the first dialog asks for `BattleSnapshot.actor.id` literally.

### P2 — Dev / power user (secondary)

- Comfortable with CLI; uses `fairy calc` directly for fast iteration.
- Reaches the plugin to **explain** a `CalcResult` they already have (peer review, debugging anomaly, posting a writeup).
- Wants the plugin to be a thin shell over the CLI, not get in the way.

### P3 — AI agent (tertiary)

- Another agent in a higher-level workflow (e.g., a build optimizer) needs to invoke fairy.
- Reaches the plugin as a callable contract — needs stable trigger metadata, deterministic JSON I/O, and version-pinned behavior.
- Not a V1.2.3 optimization target; covered as a side-effect of P2 contracts being clean.

---

## 2. User entries & skill flows

V1.2.3 ships **3 user entries** backed by **4 internal skills**. The chaining model is **A — AI-autonomous chain** with explicit review/confirm at critical steps; alternative B (user manually triggers each skill) is not implemented.

### Entry 0 — Screenshot read & calc (P1 primary)

```
User attaches one supported community-tool screenshot (绝区零工坊 or 米游社):
  "帮我读这张图，然后算一下"

AI (host is multimodal-capable):
  invokes fairy-vision
    ↓ source detection (zzz-workshop / miyoushe-record / unknown)
    ↓ per-source field extraction
    ↓ per-field confidence + draftMetadata.evidence
    ↓ raw PII discarded; piiDetection records kind/status only
  ⇒ BattleSnapshot draft + draftMetadata

  AI presents one continuous review/edit gate to the user:
    "我从截图里读到了这些内容，请确认是否正确..."

  User confirms or corrects fields.

  AI continues through fairy-snapshot review/confirm policy, then fairy-calc CLI
  validation/calculation.
```

**Critical UX guarantees**:
- AI never exposes internal handoff phrasing such as "invoking", "transferring
  to", or skill-name routing in user-facing copy.
- AI never calc-runs directly from screenshot extraction. The user sees and can
  correct the draft first.
- Low source confidence, unsupported source, or unavailable image input falls
  back to the `fairy-snapshot` natural-language path.
- Source detection, base/bonus split, roll-counts, confidence, and PII status
  remain in `draftMetadata`; strict `BattleSnapshot` keeps only schema fields.

### Entry 1 — Build & calc (P1 primary)

```
User (NL, zh or en):
  "我想算仪玄 60 级，云岿如我 4 件套 + 折枝剑歌 2 件套，
   敌人是危局强袭战本期 boss，单段普攻一段伤害"

AI (auto-detect lang → zh):
  invokes fairy-snapshot
    ↓ entity normalization (alias → id)
    ↓ field tier check (critical / optional / unknown)
    ↓ ask-user dialog for missing critical
    ↓ produce BattleSnapshot draft
  ⇒ snapshot.json

  ⇒ presents snapshot summary to user: "我帮你组好了 snapshot，仪玄 60 级，
     主词条 ... 副词条 ..., OK 继续算吗？"  ← review/confirm gate

  User: "嗯，算"

  AI invokes fairy-calc
    ↓ preflight CLI version
    ↓ exec `fairy calc <snapshot> --view verbose --lang zh` (validation + calc)
    ↓ parse CalcResult
  ⇒ CalcResult JSON

  ⇒ NL summary:
     "总伤害 14,500
      - 普通攻击一段: 9,200 (64%)
      - 主要增伤来源: 云岿如我 4pc, W-Engine 主动技 +18%
      Warning: Drive Disc 主词条数值缺失，已按 5★ 满级默认填，结果可能偏差 ±2%"
```

**Critical UX guarantees**:
- AI never silently fills in missing critical fields (asks instead).
- AI never produces a calc summary until CLI validation/calculation succeeds (no garbage in, garbage out).
- AI presents snapshot draft to user **before** invoking calc — gives user a chance to spot wrong entity recognition early.
- AI's NL summary references only fields that exist in CalcResult (no fabricated multipliers).

### Entry 2 — Explain existing CalcResult (P2 primary)

```
User (paste JSON or file reference, zh or en):
  "解释一下这个 CalcResult"
  [pastes CalcResult JSON]

AI (auto-detect lang → zh):
  invokes fairy-explain
    ↓ parse CalcResult.trace + summary + warnings + sourceRef
    ↓ walk trace step-by-step
    ↓ resolve sourceRef labels (e.g. "weapon.14008.passive" → 武器名 + 被动名)

  ⇒ paragraph-style explanation:
     "你的仪玄非暴伤害 14,500 的计算过程：
      - 基础攻击 583 (来自角色面板)
      - 乘一段倍率 4.58× (来自仪玄基础攻击技能一段)
      - 乘 W-Engine 增伤 1.18 (来自青溟笼舍被动)
      - 乘 4pc 啄木鸟 1.25 (来自驱动盘套装效果)
      - 乘元素增伤 1.15 (来自 6 号位主词条电属性伤害)
      - 乘防御乘区 0.583 (敌人 70% 防御)
      ⇒ 14,500
      Disclaimer: 数据基于 nanoka@2.8 cleaned snapshot, 如有更新请重新 fetch"
```

**Critical UX guarantees**:
- AI never invokes `fairy calc` from explain skill (would defeat the standalone purpose).
- AI references only fields that exist in the input CalcResult JSON.
- sourceRef labels resolve to user-friendly names; do not display raw `weapon.14008` path-only.

### Skill invocation routing

The user does not pick a skill name. The AI agent routes based on trigger phrases and input shape:

| User input shape | Route |
|---|---|
| One image attachment from supported source | `fairy-vision` → `fairy-snapshot` → `fairy-calc` |
| NL build description (no JSON) | `fairy-snapshot` → auto-chain → `fairy-calc` |
| Pasted snapshot JSON | `fairy-calc` (skip snapshot-builder if input passes parseBattleSnapshot) |
| Pasted CalcResult JSON | `fairy-explain` (standalone) |
| "explain this" / "trace breakdown" + JSON | `fairy-explain` (trace alias) |
| Ambiguous or unsupported image | Ask user which workflow they want, or fall back to `fairy-snapshot` text flow |

Trigger phrases per skill: see `prompt-templates.md` §Trigger phrases.

---

## 3. Ask-user dialog policy (3-tier)

When `fairy-snapshot` is generating a draft from NL, it must classify every required field into one of three tiers and act accordingly. **The AI must not silently fill critical fields with guesses.**

### Tier 1 — Critical (must ask, must answer)

Field types that materially change the calc outcome and have no safe default:

- Agent identity (`actor.id`) — if ambiguous between multiple versions / similarly named characters.
- Agent level — affects base stats; no safe default.
- W-Engine identity (`weapon.id`) — entire skill payload depends on this.
- W-Engine refinement level — large multiplier swing.
- Drive Disc set ids (4pc / 2pc combinations).
- Enemy identity for relevant calc scenarios (DA buff context, level scaling).

**Behavior**: AI must ask the user. If the user says "不知道" / "unknown" / "any" → mark the field as `unknown` in draft metadata and emit a `critical-field-unknown` warning attached to the snapshot draft; do not proceed to calc unless the user explicitly accepts the warning and the resulting `BattleSnapshot` remains schema-valid (no ad hoc `"unknown"` values in strict schema fields).

**Prompt template**: see `prompt-templates.md` §User-facing > ask-user > critical.

### Tier 2 — Optional (warn if unknown, fall back to documented default)

Field types where a documented default exists and the calc output is still meaningful:

- Drive Disc substat individual values (default: 5★ post-roll midpoint).
- Drive Disc refinement (default: max level 15 for 5★).
- Bond level (default: 5 if not specified).
- Specific attack segment chain (default: single basic attack segment 1).

**Behavior**: AI may proceed without asking only when a documented default or omission is valid for the existing schema. The skill must (a) record the assumption in draft metadata / review copy, not as an ad hoc `BattleSnapshot` field, and (b) surface the warning in the calc summary: "用了默认 X, 结果可能偏差 Y%".

**Prompt template**: see `prompt-templates.md` §User-facing > ask-user > optional.

### Tier 3 — Unknown marker (mark + warn, do not block)

Field types where neither user knowledge nor a safe default exists; the calc can still produce a meaningful number with explicit acknowledgment:

- Future expansion fields (V1.x candidates).
- Optional cross-reference data the user does not have (specific enemy weakness modifiers in non-DA contexts).

**Behavior**: draft metadata marks the field as `unknown`; the generated `BattleSnapshot` must still satisfy the strict schema. If the schema cannot represent a valid reduced path, the skill must ask again or fail loud. When calc can proceed, the calc summary mentions the unknown explicitly.

**Prompt template**: see `prompt-templates.md` §User-facing > ask-user > unknown.

### Batch vs sequential asking

UX rule: ask in **one batched message** if there are 2–4 missing critical fields; ask **sequentially** (one at a time) only if a downstream field depends on an upstream choice (e.g., "你的 W-Engine 是哪一把?" determines which refinement options are valid).

Rationale: P1 users get confused by long sequential dialogs; batching with a numbered list is the proven pattern for non-dev users.

---

## 4. Error recovery

### CLI not installed / version mismatch

```
User: "算一下..."
AI routes through fairy-snapshot, asks for review/confirm, then fairy-calc calls
`fairy calc`.
CLI returns: not-found / version-too-old.

AI response (zh):
  "你本地还没装 fairy CLI（或版本太旧）。
   请运行: pnpm dlx @randomplay/cli@latest 来安装最新版。
   装好后再 ping 我，我们继续。"
```

Do not attempt to compute anything without the CLI. Do not partially proceed.

### Snapshot validation failure in fairy-calc (CLI parse error)

```
fairy CLI returns parse error: "actor.weapon.id is required"

AI response (zh):
  "snapshot 校验没通过：缺 W-Engine id。
   之前你说的武器是 X, 我没在 fairy 数据里找到对应。
   请问你的 W-Engine 具体是？以下哪个？
   1. ...
   2. ...
   如果都不是，请告诉我武器全名。"
```

Translate stderr to actionable user prompt; never display raw stderr.

### Entity ambiguity (multiple matches)

```
User: "Anby"
AI response (zh):
  "你说的 Anby 是哪一个？我看到两个候选：
   1. Anby Demara (角色 id 1011, S 级)
   2. 安比 (旧名/别名同 Anby Demara)
   是 1 还是 2?"
```

Surface all candidates with disambiguating attributes (id, rank, version); never auto-pick.

### CalcResult parse failure (explain skill)

```
User: pastes malformed JSON.

AI response (zh):
  "你贴的内容不是有效的 fairy CalcResult JSON。
   常见原因: 截断了 / 字段被修改 / 不是 fairy 输出。
   请确认完整粘贴 `fairy calc ... --view verbose` 的完整 JSON 输出。"
```

Never invent a trace; never explain "what it probably should have been".

---

## 5. Lang detection & override

V1.2.3 uses **(ii) auto-detect from input** as the default, with explicit override patterns sticky per session.

### Detection rules

| Rule | Behavior |
|---|---|
| User first message majority lang | Set session lang to that lang |
| Mixed lang ("算 Yixuan 的 burst damage") | Use majority by token count; ties default to zh |
| Entity name lang ≠ dialog lang | Dialog lang follows user; entity normalization layer handles cross-lang lookup |
| User switches lang mid-session | Sticky to first lang unless explicit override |
| Explicit override ("用英文回答" / "switch to en" / "respond in english" / "/lang en") | Override session lang; sticky from this turn |
| Plugin settings (V1.2.x future) | Always wins; overrides any auto-detect |

### Override phrase patterns (UX-defined, AI must recognize)

Zh → en switch: `用英文回答` / `用 en 回复` / `switch to english` / `respond in english` / `/lang en`

En → zh switch: `用中文回答` / `中文回复` / `switch to chinese` / `respond in chinese` / `/lang zh`

Detection scope: any user message in current session; override takes effect from the same turn's AI response.

### `--lang` flag forwarding

Whenever AI invokes `fairy calc`, the session lang must be forwarded as `--lang zh` or `--lang en`. This ensures CalcResult labels and CLI-level error messages match the user's lang.

---

## 6. Onboarding & disclaimer

### First-run / discovery copy

When the user first invokes any fairy skill (or asks `/help fairy`), AI emits:

```
zh:
  "fairy 是 Zenless Zone Zero 的伤害计算器。
   我能帮你做四件事：
   1. 读绝区零工坊 / 米游社配装截图，先给你确认，再算伤害（识别截图）
   2. 用自然语言描述你的构筑，我帮你组 snapshot 并算伤害（生成快照 + 计算伤害）
   3. 解释 fairy 算出来的结果，让你看懂每一步（解释结果）
   4. 校验你的 snapshot.json 是否符合 fairy schema

   现在发截图、告诉我你想算什么，或者直接贴一个 CalcResult JSON 给我解释。"

en:
  "fairy is a Zenless Zone Zero damage calculator.
   I can help you with four things:
   1. Read a supported community-tool build screenshot, ask you to confirm it, then run the calc.
   2. Describe your build in natural language — I'll build the snapshot and run the calc.
   3. Explain a fairy CalcResult — walk through each multiplier and source.
   4. Validate your snapshot.json against the fairy schema.

   Send a screenshot, describe what you want to calculate, or paste a CalcResult JSON and I'll explain it."
```

### Disclaimer surface (per Q4 + D-20 § README disclaimer policy)

Every calc summary and explain output must include the disclaimer footer:

```
zh:
  "数据基于 nanoka@<live-version> cleaned snapshot.
   如有版本更新请重新 fetch 数据。
   如有侵权请联系作者删除。"

en:
  "Data is based on nanoka@<live-version> cleaned snapshot.
   Re-fetch the data after game patches.
   For takedown requests please contact the maintainer."
```

The `<live-version>` placeholder is resolved at runtime from the `@randomplay/data` package's source-registry; the version string is mirrored in the CalcResult JSON `meta.sourceVersion` field.

Disclaimer is shown **once per session** in the first AI response that uses live data; subsequent responses in the same session don't repeat (avoid spam). Onboarding always includes it.

---

## 7. V1.2.3 screenshot recognition

V1.2.3 ships a multimodal input path for supported community-tool screenshots
through `fairy-vision`. In-game screenshots, OCR fallback, other source tools,
and multi-image flows remain V1.2.x+ candidates.

### V1.2.3 forward-contract

1. **Output shape**: `fairy-vision` must produce a `BattleSnapshot` draft conforming to the same schema as `fairy-snapshot`. No parallel schema is introduced.
2. **Review/edit gate**: the user must be presented with the recognized snapshot draft and given the opportunity to edit before any calc invocation. Vision recognition has non-zero error rate; silent calc on wrong data is the worst UX outcome.
3. **Validation**: after user edits and review/confirm, the snapshot must pass `fairy calc <snapshot> --view verbose --lang <lang>` validation in the `fairy-calc` gate.
4. **Fallback**: if vision recognition confidence is below threshold, the source is unsupported, the host cannot read images, or the user is unhappy with the result, the system must fall back to NL dialog (`fairy-snapshot` standard flow).
5. **Confidence surface**: AI must indicate per-field confidence (e.g., "我从截图认出仪玄 60 级 (高置信度), 但 Drive Disc 副词条数值置信度低，请你 review") and ask user to confirm low-confidence fields.

### V1.2.3 approved skill

`fairy-vision` is the approved screenshot skill. Do not add alternate vision
skill names in this patch.

### V1.2.3 implementation constraints

- `fairy-snapshot` must accept an optional `partial-snapshot` input shape
  alongside NL, so the `fairy-vision` draft can be fed through the same ask-user
  dialog on missing/low-confidence fields.
- Snapshot validation must report actionable field validity where possible, so
  screenshot-extracted fields that fail validation can be corrected by the user.

---

## 8. Acceptance handoff to QA

QA validates the user journey behavior through `acceptance.md` G3 / G4 / G5 / G8 / G10. Key behavioral assertions traceable from this doc:

| UX assertion | QA gate |
|---|---|
| Snapshot draft reaches `fairy calc` validation before any result summary is produced | G3 |
| AI never invents trace / multiplier / sourceRef | G5 |
| Critical-field unknown does not proceed to calc without explicit user acceptance | G3 |
| Lang detection (ii) auto-detect + override sticky | G8 (user-facing behavior) |
| Disclaimer surfaced once per session | G8 |
| Onboarding copy covers 4 skills + how to start | G10 |

QA fixture strategy: per `acceptance.md` 3-tier (skill-spec EN canonical + entity normalization zh/en + user-facing output zh/en smoke).

---

## 9. Open questions & V1.2.x backlog

- **fairy-compare skill** (V1.2.x): deferred per D-21; it should be scoped
  as a separate plugin patch after the CLI compare contract is stable.
- **Plugin marketplace distribution** (V1.2.x+): after skill API stabilizes through V1.2.3 dogfooding.
- **Cursor support** (V1.2.x patch): not in V1.2.3; documented in V1.2.x candidates.
- **Per-user plugin settings (lang preference, default --view)** (V1.2.x): currently relies on session-level lang detect; future settings system can override.
- **User-saved snapshot library** (V1.2.x+): allow user to name and reuse common snapshots; would change `fairy-snapshot` to also support load-by-name.

---

## Appendix A · Cross-references

- Product req lock: `docs/product/decisions/D-21-ai-plugin.md` §8 decision matrix
- Acceptance gates: `docs/ai-plugin/acceptance.md` G1-G10
- Technical structure: `docs/ai-plugin/architecture.md`
- Prompt strings + i18n: `docs/ai-plugin/prompt-templates.md`
- ZZZ player persona reference: D-13 V1 dogfooding notes
- Disclaimer policy: D-20 §README disclaimer

## Appendix B · Glossary

- **BattleSnapshot** — fairy core schema for "everything fairy needs to know to calculate one attack": agent / weapon / discs / enemy / attack segment. Defined in `packages/core/src/schema/battle-snapshot.ts`.
- **CalcResult** — fairy CLI output JSON: `summary`, `trace`, `warnings`, `sourceRef`. Defined in `packages/core/src/schema/calc-result.ts`.
- **Skill** — Claude Code Plugin skill unit; one SKILL.md per skill; addressed by trigger phrases.
- **3-tier field policy** — critical / optional / unknown; see §3.
- **tri-layer i18n** — canonical EN / user-facing zh+en / data-query zh+en; see `prompt-templates.md` §1.

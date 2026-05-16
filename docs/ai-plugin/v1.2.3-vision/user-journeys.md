# fairy AI plugin V1.2.3 · Vision input — User Journeys

- Status: V1.2.3 plan draft (Phase 2a)
- Owner: @UX
- Drafted: 2026-05-17
- Companion: `docs/ai-plugin/v1.2.3-vision/prompt-templates.md` (UX) · `docs/ai-plugin/v1.2.3-vision/architecture.md` (TL) · `docs/ai-plugin/v1.2.3-vision/acceptance.md` (QA) · `docs/product/decisions/D-22-ai-plugin-v1.2.3-vision.md` (Product)
- Scope lock per Product D-22:
  - **Q1 = A**: community-tool screenshots only (in-game raw screenshots → V1.2.x+).
  - **Q2 = A1.a**: 2 supported sources at MVP — 绝区零工坊 (WeChat mini-app) + 米游社 (Mihoyo community).
  - **Q3 = A2.a**: vision pipeline may read PII (UID / username) from image for audit/display, but `BattleSnapshot` never persists PII.

## How to read this document

This document extends `docs/ai-plugin/user-journeys.md` (V1.2.2) with the V1.2.3 vision input path. V1.2.2 NL-input flow remains unchanged; vision is an **additional entry point** that converges back into the same `fairy-snapshot` → `fairy-calc` chain after a vision-specific review/edit gate.

The 7 vision-specific UX sections (§A–§G in the T2 brief) map onto the section numbering used here:

| T2 brief | This doc |
|---|---|
| §A P3 persona vision-input user journey | §1 persona + §2 user flow |
| §B per-field confidence surfacing | §4 confidence model |
| §C single-image source-detect (was multi-screenshot) | §2 (single-image default) + §3 source detection |
| §D partial-extraction ask-user | §5 partial extraction |
| §E visual ambiguity disambiguation | §6 visual ambiguity |
| §F lang-from-image (V1.2.x+ forward-spec) | §9 forward-spec |
| §G NL fallback trigger | §7 NL fallback |

PII handling (Q3 = A2.a) is treated as a cross-cutting concern surfaced in §3 source detection and §4 confidence model rather than its own section, because it touches every step from extraction through review.

Reading order:
- @TechLead implementing vision pipeline → §2 + §3 + §4 + §7 + §8 schema interplay
- @QA writing V-G1..V-G5 fixtures → §3 + §4 + §5 + §6 + §8 PII assertions
- @Lo丶 reviewing scope → §1 persona expansion + §10 acceptance handoff

---

## 1. Persona update — P1 with screenshot input

V1.2.2 listed three personas (P1 ZZZ player / P2 dev / P3 AI agent). V1.2.3 vision is a P1 (primary) extension: the same ZZZ player who already uses NL input now also has a faster path when they have a community-tool screenshot at hand.

### P1 with vision input (V1.2.3 primary)

- Has a 绝区零工坊 (WeChat mini-app) or 米游社 (Mihoyo community) screenshot of their current build — these tools already aggregate the entire build into a single image.
- Drops the screenshot into Claude Code / Codex and says something like "帮我算这个的伤害" or "explain this build".
- Expects the AI to read every field from the screenshot, confirm key items, and proceed to calc — without making them re-type stats they already see in the image.
- Will reject any flow that asks them to provide info already visible in the screenshot ("敌人是哪一个？" is fine; "你的角色是几级？" right after pasting a screenshot that says LV60 in big text is not).

### P2 / P3 unchanged

Dev / agent personas do not gain a new entry through V1.2.3. They can still paste a vision-extracted snapshot through P2 entry, but vision pipeline is optimized for P1.

---

## 2. User flow — Entry 3 (vision input)

V1.2.2 ships two user entries (build & calc / explain). V1.2.3 adds **Entry 3 — Vision build & calc** as a P1 fast path. The chaining model remains Model A (AI-autonomous chain with review/confirm gate); the gate is enriched for vision-specific data.

### Entry 3 — Vision build & calc (P1 primary)

```
User (NL or empty + image attachment):
  [pastes 1 screenshot from 绝区零工坊 or 米游社]
  "帮我算这个的伤害，敌人是本期 DA boss 60 级"

AI (auto-detect lang → zh; auto-detect source from image):
  invokes the fairy-snapshot image entry
    ↓ source detection (工坊 / 米游社 / unknown)
    ↓ layout-specific field extraction (panel total, weapon, drive disc set + main + substats with roll counts)
    ↓ per-field confidence scoring
    ↓ base/bonus split captured in draftMetadata.evidence (TL schema)
    ↓ PII (UID, username) captured in draftMetadata only — never written to BattleSnapshot
    ↓ produce BattleSnapshot draft + draftMetadata
  ⇒ snapshot.json + draftMetadata.json

  ⇒ presents review/edit gate to user:
     "我从这张「绝区零工坊」截图里读到:
       角色: 零号·安比 Lv60 (影画 2)
       武器: 牺牲洁纯 Lv60 R1
       6 件套: 折枝剑歌 2pc (slot 1+6) + 如影相随 4pc (slot 2-5)
       面板: HP 10215, ATK 3523, DEF 826, 暴击率 65%, 暴击伤害 210%, ...
       副词条: 全部读到（含 roll 次数，无需默认填值）

       证据 (audit-only，不进 calc):
         - ATK 3523 = 1642 base + 1881 bonus
         - HP 10215 = 7673 base + 2542 bonus
         - 截图来源: 绝区零工坊 (UID 已识别并隐藏，不入 snapshot)

       还要补一项: 敌人是「本期 DA boss 60 级」我帮你补到 enemy.id。
       直接算吗？要改哪里告诉我。"   ← review/edit gate

  User: "嗯，算"

  AI invokes fairy-snapshot
    ↓ accept partial-snapshot input shape (per V1.2.2 forward-spec hook)
    ↓ enemy.id resolution (DA boss canonical lookup)
    ↓ field tier check on remaining fields
    ↓ no ask-user dialog needed (vision filled all critical fields)
    ↓ produce final BattleSnapshot
  ⇒ snapshot.json

  AI invokes fairy-calc
    ↓ preflight CLI version
    ↓ exec `fairy calc <snapshot> --view verbose --lang zh`
    ↓ parse CalcResult
  ⇒ CalcResult JSON + NL summary
```

### Critical UX guarantees for vision input

- AI never proceeds to calc without showing the review/edit gate, even when all fields parsed with high confidence. Vision is non-zero error; user must visually confirm.
- AI surfaces source detection result explicitly ("我从这张「绝区零工坊」截图里…") so the user knows the layout mapping that was applied.
- AI presents low-confidence fields with a clear marker (per §4), giving the user one place to correct them in review/edit before calc.
- AI never persists UID / username into `BattleSnapshot`; PII appears only in the review/edit display for audit and is dropped at confirm time.
- AI never re-asks for fields already extracted with high confidence (no "你的角色是几级？" after a clear LV60 read).
- AI degrades gracefully to V1.2.2 NL flow if vision recognition cannot proceed (see §7).

---

## 3. Source detection (Q1 = A / Q2 = A1.a)

V1.2.3 MVP supports two community-tool screenshot sources. Vision parsing is gated by source detection — without a confident source identification, AI must surface uncertainty rather than guess at field positions.

### Supported sources

| Source | Layout signature | Branding cues |
|---|---|---|
| **绝区零工坊** (WeChat mini-app) | Vertical phone screenshot; agent portrait roster row at top; stats grid below; ACE scoring text on each Drive Disc; footer mentions 微信公众号「绝区零工坊」 | Footer "关注微信公众号「绝区零工坊」即可查询"; ACE 评级 sigil; phone status bar at top |
| **米游社** (Mihoyo community) | Landscape composite; agent rank/portrait left, stats table right; 6 Drive Disc cards in 2-row grid; "驱动盘有效副属性共中 N 次" framing; SSS/ACE badge | Top-right "ZZ 绝区·零 zen.less zone zero" wordmark; bottom-left 米游社 logo; bottom-right 米游社绝区零战绩 watermark |

### Source-detection prompt strategy

The vision prompt's first job is source identification. Two layered cues:

1. **Branding/watermark cues** — explicit text identifying the source. High-confidence trigger.
2. **Layout signature cues** — aspect ratio + element placement + ACE scoring text patterns. Backup cue when branding is cropped.

### Source = unknown

If neither cue matches, AI surfaces uncertainty and offers a fallback:

```
zh:
  "我没认出这张截图的来源（我目前只能稳定读「绝区零工坊」和「米游社」两种）。
   要不你告诉我是哪个来源？或者改用文字描述你的构筑，我帮你组 snapshot？"

en:
  "I couldn't identify the screenshot source (I can currently read 绝区零工坊 / Mihoyo community panels).
   Could you tell me which source it's from? Or describe your build in text and I'll build the snapshot from there?"
```

AI must not attempt to parse fields from an unidentified source layout — false positives on field positions are worse UX than admitting "I don't know this source".

### Future sources

V1.2.x+ patches may add support for: hoyo-pad in-app screenshots, NGA build cards, 米哈游通行证 web panel, raw in-game screenshots (requires OCR). Each new source is a separate patch with its own layout map fixture; no source goes live until it has a golden screenshot fixture and a V-G1 / V-G2 / V-G3 acceptance pass.

### PII recognition is non-conditional

Both supported sources include PII (UID, username). Source detection therefore implicitly always captures PII into the extraction step. Per Q3 = A2.a, the contract is:

- Vision extractor records PII into `draftMetadata.extractedPII` (audit field, ephemeral).
- Review/edit gate may surface PII once as part of the "extracted from screenshot" display (so the user can confirm "yes that's my account, the build it picked up is mine").
- On user confirm, PII is **dropped** before the final `BattleSnapshot` is constructed. `BattleSnapshot` contains no UID / username field.
- `draftMetadata.extractedPII` is not persisted beyond the session.

---

## 4. Confidence model — per-field surfacing

V1.2.3 forward-spec (V1.2.2 §7) required per-field confidence. Sample-screenshot inspection shows community-tool screenshots are text-rendered (not OCR), which gives vision near-deterministic reads on most fields. The confidence model is therefore source-aware.

### Confidence buckets

| Bucket | Display | Meaning |
|---|---|---|
| **High** | (no marker) | Text-rendered field on a known source; vision reads with high precision. Default for community-tool screenshots. |
| **Medium** | inline tag (中置信) | Field is on a known source but partially occluded / cropped / rendered as image (e.g., element icon). User should glance to confirm. |
| **Low** | bold inline tag (**低置信，请确认**) | Field detection was uncertain (multiple candidates, blurry crop). User must confirm or correct in review/edit. |
| **Missing** | bracketed placeholder `[请补充]` | Field not visible in image. Fall through to V1.2.2 ask-user / NL flow for this field only. |

Confidence is assigned per source × per field. The architecture doc defines the threshold rules per source; this UX doc defines the **display contract**:

- High-confidence fields display naturally, no annotation, no extra noise for the user.
- Medium / low fields display with the tag inline in the review/edit summary so the user can scan once and spot what needs verification.
- Missing fields trigger §5 partial-extraction handling.

### Confidence on community-tool screenshots (Q2 = A1.a)

Empirical from sample screenshots:
- Agent name, level, weapon name, refinement, Drive Disc set names, slot positions, main stats, substat values **including roll counts** → all **high** (text-rendered, unambiguous on either source).
- Element icon, specialty icon, S/A/B rank badge → **medium** (icon-only, requires icon-to-id map; mostly stable but susceptible to render variants).
- Skill levels row (12/12/12/12/12) → **medium** (small font, dense; can mis-read 12 vs 02 vs 07 — 米游社 sample has one "07" in last skill slot worth flagging).
- "Mindscape" (影画) level → **high** (large badge, single digit).

### Substat precision implication

Because substat roll counts are explicit on both sources (e.g., "暴击伤害 +3 19.2%" = 3 rolls totaling 19.2%), vision extraction can populate exact substat values directly. The Tier 2 "5★ midpoint default" fallback used by V1.2.2 NL flow **does not trigger** on the vision path for community-tool screenshots. Calc deviation from this source of uncertainty drops to ~0.

This is a UX win surfaced in the review/edit gate copy: "副词条: 全部读到（含 roll 次数，无需默认填值）" — tells the user that vision is more precise than typing the build manually.

---

## 5. Partial extraction — ask-user template

Even on supported sources, a screenshot may be cropped or partially obscured, leaving some fields unreadable. This is structurally different from V1.2.2 NL "critical field missing" because the user did not say "unknown" — the AI is reporting "I could not read this".

### Partial extraction flow

```
AI: "我从这张「绝区零工坊」截图读到大部分内容，但有 2 个字段没看清:

  ✅ 角色 / 武器 / 6 件套主词条 / 副词条数值 (含 roll 次数)
  ✅ 面板汇总 (HP/ATK/DEF/暴击/...)

  ⚠️ 没读到的字段:
     1. 武器精炼级 (slot 5 区域被对话窗口挡了一部分)
     2. 敌人信息 (截图里没有，要靠你说)

  这两项你帮我补一下:
     1. 武器精炼是 R1 / R2 / R3 / R4 / R5?
     2. 敌人是什么? (DA 本期 boss / 试用挑战 / 其他?)"
```

Key differences from V1.2.2 ask-user critical:
- Phrasing leads with "我没看清" (I couldn't read) rather than "请告诉我" (please tell me). Owns the limitation on AI side, not user side.
- Lists what was successfully read first, builds confidence the partial extraction is still usable.
- Asks only for the genuinely missing fields, not for fields the screenshot did show.
- Uses the V1.2.2 batched-ask pattern when 2–4 fields are missing.

### Partial extraction vs source-unknown

| Situation | Trigger | UX |
|---|---|---|
| Source detected, some fields missing | per-field confidence = missing | §5 partial-extraction ask |
| Source NOT detected | source detection failed | §3 unknown source — offer to switch to NL |
| Source detected, all fields parsed | high confidence across the board | §2 normal review/edit gate |

---

## 6. Visual ambiguity — disambiguation template

Some visual cues from community-tool screenshots are inherently ambiguous (e.g., a numerical value rendered next to a label that was cropped). Vision must surface ambiguity, not guess.

### Common ambiguity patterns

| Pattern | Source | UX |
|---|---|---|
| Number visible, label cropped | either source, edge crop | "我看到一个数字 3523，但 label 被裁了，应该是 ATK 还是 HP 还是别的?" |
| Two characters in roster row, selected portrait unclear | 工坊 (portrait row at top) | "工坊截图顶部有多个角色，主图是哪一位? 1. 零号·安比 2. [其他]" |
| Drive Disc set name unreadable | either source, low-res | "slot 2 的套装名我没看清，是「如影相随」还是别的? 候选: ..." |
| Skill levels last column reads as 07 vs 12 | 米游社 sample shows this exact ambiguity | "核心被动等级我看到的是 07，确认一下? (其他四项都是 12)" |

### Disambiguation dialog rules

- Always list 2–3 candidates with disambiguating attributes (id, rank, name variant).
- Never auto-pick — even when one candidate is much more probable.
- One ambiguity per dialog turn; if multiple ambiguities exist, batch them numerically (matches V1.2.2 batched-ask pattern).

---

## 7. NL fallback (G in T2 brief)

Vision input is a fast path, not the only path. The system must degrade to V1.2.2 NL flow when vision cannot proceed.

### Fallback triggers

| Trigger | UX |
|---|---|
| Source detection failed (no branding + no layout match) | Offer NL fallback (per §3) |
| Critical-field extraction confidence = low across the board (e.g., screenshot is a non-supported tool or game raw) | Offer NL fallback |
| User explicitly says "I'll type it out" / "用文字" / "switch to text" | Switch immediately, drop vision draft |
| Multiple visual ambiguities (>3 in one image) | Offer NL fallback as alternative to lengthy disambiguation |

### Fallback transition copy

```
zh:
  "这张截图我没法可靠读出来。我们换文字来吧 —
   你描述一下角色 + 武器 + Drive Disc + 敌人，我帮你组 snapshot。"

en:
  "I can't reliably read this screenshot. Let's switch to text —
   describe the agent + weapon + Drive Disc + enemy and I'll build the snapshot."
```

After fallback, V1.2.2 `fairy-snapshot` flow runs unchanged. Vision draft state (if any partial extraction happened) is dropped; user starts fresh in NL.

### Don't auto-fallback silently

UX rule: AI must explicitly surface the fallback before invoking NL flow. Silent fallback ("I'll just ask you for everything") is the worst pattern because the user wonders why their screenshot was ignored.

---

## 8. PII handling end-to-end (Q3 = A2.a)

Cross-cutting per Q3 = A2.a. This section consolidates the PII contract for QA's V-G acceptance gates.

### Contract

| Stage | PII state |
|---|---|
| Vision extraction | UID + username read into `draftMetadata.extractedPII` (session-ephemeral) |
| Review/edit gate display | PII shown once in the "extracted from screenshot" panel, marked "audit-only, not stored" |
| User confirm | `draftMetadata.extractedPII` dropped before `BattleSnapshot` construction |
| `BattleSnapshot` schema | Contains no PII field; vision-derived BattleSnapshot is indistinguishable from NL-derived |
| `draftMetadata.evidence` | Base/bonus stat splits retained for audit, but no PII |
| Session end | All PII cleared |
| Persisted artifacts (saved snapshots, shared with others) | Zero PII guaranteed |

### Why this contract

- Allows the user to recognize "yes that's my account" at review time (helps spot wrong screenshot pasted by mistake).
- Prevents PII from leaking into any downstream artifact (saved snapshot, calc result, shared snippet, plugin telemetry, fixture).
- Keeps schema unchanged — vision and NL paths produce identical `BattleSnapshot` shape.

### QA assertion handoff

QA V-G4 (Privacy and PII Exclusion) must include:
1. Vision pipeline reads UID/username from sample fixtures.
2. Review/edit gate display includes PII (marked audit-only).
3. Post-confirm `BattleSnapshot` JSON contains no UID/username.
4. Post-confirm `draftMetadata` may contain `evidence` (base/bonus) but no `extractedPII`.
5. Persisted snapshot.json (if user saves) and shared CalcResult contain no PII.

---

## 9. Lang-from-image — V1.2.x+ forward-spec

V1.2.3 MVP is zh-only because both supported sources (绝区零工坊 + 米游社) are Chinese-only UIs. The lang-from-image detection path described in the T2 brief §G is forward-spec for V1.2.x+ when an en or jp source is added (e.g., HoYoLab international, in-game raw en/jp screenshots).

### V1.2.x+ forward-contract

1. **Detection scope**: image content language is detected by reading any visible UI label text (e.g., panel labels "HP" vs "生命值").
2. **Session lang reconciliation**: when image lang differs from session lang (auto-detected per V1.2.2 rules), session lang wins for the AI dialog; image lang only affects field-name normalization.
3. **Field normalization layer**: vision extractor uses image-internal lang to map field labels to canonical ids; the normalization layer is shared with V1.2.2 entity-alias normalization.
4. **Mixed-lang image**: rare in practice; if encountered, AI surfaces the conflict and lets the user pick the dominant lang for field interpretation.

### Not in V1.2.3 MVP

- No en/jp source added.
- No image-lang detection logic in vision prompt.
- No conflict resolution UX.

When V1.2.x+ adds the first non-zh source, this section converts to a normative spec.

---

## 10. Acceptance handoff to QA

QA validates the user journey through `acceptance.md` V-G1..V-G5 (new V1.2.3 gates) and the G1-G10 vision extensions. Canonical gate taxonomy lives in `acceptance.md` (per QA ownership); this section maps UX assertions to that canonical taxonomy.

| UX assertion | Canonical QA gate |
|---|---|
| Source detection runs first; unknown source → offer NL fallback, do not parse | V-G1 (Source Detection & Layout Routing) |
| Substat values populated from roll counts; Tier 2 midpoint default does not trigger on community-tool path | V-G2 (Extraction Evidence & Schema Boundary) |
| Base/bonus stat splits live in `draftMetadata.evidence`, totals in `BattleSnapshot.team[].panel` | V-G2 |
| Per-field confidence surfaced in review/edit gate; low-confidence visibly marked | V-G3 (Review/Edit & Uncertainty Handling) |
| Partial extraction → ask-user template for only missing fields | V-G3 |
| Visual ambiguity surfaces 2-3 candidates, never auto-picks | V-G3 |
| Fallback to NL flow on source-unknown / low-confidence-everywhere / user-request | V-G3 |
| Review/edit gate gates `fairy-calc` — calc not invoked before user confirmation | V-G3 (review/edit precondition) + V-G5 (calc validation) |
| PII extracted into `draftMetadata.extractedPII` but never persisted to `BattleSnapshot` | V-G4 (Privacy & PII Exclusion) |
| Public fixtures redacted / synthetic — no real PII committed | V-G4 |
| Confirmed vision snapshot runs through `fairy calc <snapshot> --view verbose --lang <lang>` | V-G5 (End-to-End Calc Validation) |
| AI summary uses only CLI-emitted CalcResult fields; no fabrication on vision path | V-G5 |
| Lang-from-image is V1.2.x+ forward-spec only — no MVP regression hook required | (forward-compat, outside MVP V-G scope) |

---

## 11. Open questions & V1.2.x backlog

- **In-game raw screenshots** (V1.2.x+): pure OCR path; needs OCR model + digit/field positional rules. Sample screenshots not yet provided.
- **Additional community tools** (V1.2.x+): hoyo-pad / NGA / 米哈游通行证 web — each needs golden fixture before going live.
- **Multi-screenshot input** (V1.2.x+): for users who only have in-game screenshots and need to paste 6 Drive Disc + 1 agent panel separately. Out of scope for V1.2.3.
- **PII redaction at extraction** (V1.2.x+ if needed): currently PII is captured then dropped; if regulatory or user concern surfaces, V1.2.x+ can switch to masked-extraction.
- **Lang-from-image** (V1.2.x+): see §9.
- **Vision pipeline cost / budget surfacing** (V1.2.x+): vision API calls cost more than NL; expose budget warnings if users batch-screenshot many builds.

---

## Appendix A · Cross-references

- Product req lock: `docs/product/decisions/D-22-ai-plugin-v1.2.3-vision.md` 8 decision lock points
- V1.2.2 user-journeys: `docs/ai-plugin/user-journeys.md` §1-§9 (NL-input flow unchanged)
- V1.2.2 forward-spec hook: `docs/ai-plugin/user-journeys.md` §7
- Vision acceptance gates: `docs/ai-plugin/v1.2.3-vision/acceptance.md` V-G1..V-G5
- Vision technical structure: `docs/ai-plugin/v1.2.3-vision/architecture.md`
- Vision prompt fixtures: `docs/ai-plugin/v1.2.3-vision/prompt-templates.md`

## Appendix B · Glossary additions

- **fairy-snapshot image entry** — V1.2.3 extension to the existing `fairy-snapshot` skill. It reads a supported screenshot and produces a `BattleSnapshot` draft + `draftMetadata`, then uses the same ask-user and `fairy-calc` handoff as the V1.2.2 text flow.
- **draftMetadata.extractedPII** — session-ephemeral audit field carrying UID / username from vision extraction. Dropped at confirm.
- **draftMetadata.evidence** — audit field carrying base/bonus stat split (and other vision-only-visible facts) for user review. Not consumed by calc engine.
- **Source detection** — vision pipeline's first step: identify which community tool produced the screenshot. Gates layout-specific field extraction.

# fairy AI plugin V1.2.3 · Vision — Prompt templates & i18n

- Status: V1.2.3 plan draft (Phase 2a)
- Owner: @UX
- Drafted: 2026-05-17
- Companion: `docs/ai-plugin/v1.2.3-vision/user-journeys.md` (UX) · `docs/ai-plugin/v1.2.3-vision/architecture.md` (TL) · `docs/ai-plugin/v1.2.3-vision/acceptance.md` (QA) · `docs/product/decisions/D-22-ai-plugin-v1.2.3-vision.md` (Product)

## 1. Tri-layer i18n contract (inherited from V1.2.2)

V1.2.3 inherits the V1.2.2 tri-layer i18n contract (`docs/ai-plugin/prompt-templates.md` §1):

| Layer | Lang | V1.2.3 contents |
|---|---|---|
| Layer 1 — Canonical | EN | `fairy-snapshot` image-entry contract, source-detection prompt, per-source field maps, confidence threshold metadata |
| Layer 2 — User-facing | zh + en mirror | Review/edit gate display, partial-extraction asks, visual ambiguity dialogs, NL fallback copy |
| Layer 3 — Data/query | zh only at MVP (per Q1=A / Q2=A1.a) | Field-label normalization tables for 工坊 + 米游社 zh labels → canonical BattleSnapshot field ids |

zh-only Layer 3 at MVP is by design — both supported sources are Chinese-only UIs. V1.2.x+ adds en/jp as supported sources land.

---

## 2. Canonical — fairy-snapshot image entry

V1.2.3 extends the existing `fairy-snapshot` skill with an image input entry. It is invoked by a vision input trigger and then uses the same ask-user dialog and `fairy-calc` handoff as the V1.2.2 text flow.

```yaml
---
name: fairy-snapshot
displayName:
  en: Build snapshot
  zh: 生成快照
description: >
  Read a community-tool ZZZ build screenshot (绝区零工坊 or 米游社) and produce
  a BattleSnapshot draft + draftMetadata. Uses the existing fairy-snapshot
  ask-user policy for any remaining missing fields, then fairy-calc for
  validation/calculation.
imageEntry:
  displayName:
    en: Read screenshot
    zh: 识别截图
trigger:
  phrases:
    - "read this screenshot"
    - "识别截图"
    - "帮我读这张图"
    - "this is my build"
  patterns:
    - input contains an image attachment + (NL ask or empty body)
input:
  image: required (single image; multi-image deferred to V1.2.x+)
  text: optional (additional context, e.g., enemy info not in screenshot)
output:
  battleSnapshot: BattleSnapshot draft (strict schema; no defaultedFields/unknownFields in snapshot)
  draftMetadata:
    extractedPII: session-ephemeral; UID/username; dropped at confirm
    evidence: base/bonus stat split + source detection trace
    sourceDetection: { source: "工坊" | "米游社" | "unknown", confidence: 0..1 }
    perFieldConfidence: map of field path → confidence bucket (high|medium|low|missing)
chains:
  next: fairy-snapshot ask-user policy (for any tier-1 missing fields) → fairy-calc
fallback:
  trigger: source=unknown OR perFieldConfidence majority low OR user-request
  destination: fairy-snapshot NL flow
---
```

---

## 3. Canonical — source detection prompt

This is the prompt that runs first inside the `fairy-snapshot` image entry. It does **only** source identification, not field extraction.

```
You are looking at one screenshot. Your task is to identify which of these two
community-tool sources produced it (or whether it is neither).

Source A — 绝区零工坊 (WeChat mini-app):
  - Vertical / portrait orientation
  - Phone status bar usually visible at top
  - Top row: horizontal scroll of agent portraits (multiple characters)
  - Below: selected agent portrait + stats grid
  - Each Drive Disc card shows: set name + slot number + level + ACE 评分 + 全中/未命中 N 次
  - Footer text: 关注微信公众号「绝区零工坊」即可查询

Source B — 米游社 (Mihoyo community):
  - Landscape composite / wider than tall
  - Top-right wordmark: ZZ 绝区·零 zen.less zone zero
  - Left: agent rank/portrait card with S/A/B rank badge
  - Right: 2-column stats table
  - Middle band: "驱动盘有效副属性共中 N 次" framing + SSS/ACE badge
  - 6 Drive Disc cards in 2-row grid below
  - Bottom-left: 米游社 logo
  - Bottom-right: 米游社绝区零战绩 watermark

Decision:
  - If branding/watermark cue is clearly visible and matches A → source=工坊
  - If branding/watermark cue is clearly visible and matches B → source=米游社
  - If no branding visible, fall back to layout signature (orientation + element placement)
  - If still uncertain after layout check → source=unknown

Output:
  {
    "source": "工坊" | "米游社" | "unknown",
    "confidence": 0.0–1.0,
    "cues": ["branding:工坊-footer", "layout:vertical-roster-row", ...]
  }
```

Source detection MUST run before any field extraction. Field extraction prompt is selected by source result.

---

## 4. Canonical — per-source field map

Field extraction prompts are source-specific. Each map describes where to look in the image and how to translate visible labels to canonical BattleSnapshot field ids.

### 4.1 Source = 绝区零工坊

```
Layout regions (vertical orientation, top → bottom):

  Region 1 — Header bar
    Status bar, "绝区零工坊" title, screen control icons. SKIP.

  Region 2 — Agent roster row (horizontal scroll)
    Multiple agent portraits. Identify the SELECTED one by the highlighted
    border / larger portrait below.
    Output: actor.id (resolved via entity normalization from zh agent name)

  Region 3 — Agent panel
    Large agent portrait + name + level badge (e.g., "LV.60 零号·安比")
    Stats grid:
      生命值 / 攻击力 / 防御力 / 冲击力 / 暴击率 / 暴击伤害 /
      异常掌控 / 异常精通 / 穿透率 / 能量回复
    Each stat shows "total / base + bonus" format.
    Output:
      actor.id, actor.level, actor.mindscape (影画 N badge)
      → BattleSnapshot.team[].panel: stat totals (per TL schema map)
      → draftMetadata.evidence.statSplits: base + bonus map
    Element + specialty icons next to name → medium confidence:
      Output: actor.element, actor.specialty (icon→id map)

  Region 4 — Skill levels strip
    5 icons + small numbers: 普攻 / 闪避 / 支援 / 特殊技 / 连携技
    Output: actor.skillLevels (map)
    Confidence: medium (small font; sanity-check against 12-max)

  Region 5 — Weapon card
    Weapon icon + name + level + "精炼 N 星" text
    Output: weapon.id (zh name → id), weapon.level, weapon.refinement

  Region 6 — Driver score header
    "驱动评分: X.XX ACE / 驱动评级: ACE"
    "有效词条数: N / 驱动评价: 完美毕业 N%"
    SKIP — community-tool metadata, not consumed by BattleSnapshot.

  Region 7 — Drive Disc cards (6 cards in 2-row grid)
    Each card shows:
      Set name [slot number] / Lv.XX / piece score
      Main stat (label + value)
      4 substats (label + roll count "+N" + total value)
    Output for each slot i in 1..6:
      drive[i].setId (zh set name → id)
      drive[i].slot (= i)
      drive[i].level
      drive[i].mainStat: { stat, value }
      drive[i].substats[]: { stat, rollCount, value }
    Substat values are EXACT — no Tier 2 midpoint default.

  Region 8 — Footer
    "关注微信公众号「绝区零工坊」". SKIP.

PII region:
  UID is visible on the agent portrait card ("UID:NNNNNNN"). Username may or
  may not be visible. Extract to draftMetadata.extractedPII; never persist.
```

### 4.2 Source = 米游社

```
Layout regions (landscape composite, top → bottom, left/right):

  Region 1 — Top bar
    Left: username + UID
    Right: ZZ 绝区·零 wordmark
    Output: draftMetadata.extractedPII (username, UID)

  Region 2 — AGENT INFO band (top section)
    Left half: large agent portrait + S/A/B rank badge + mindscape "N" badge +
               agent name + LV.NN
    Right half: 2-column stats table (10 stat rows × 2 columns):
      生命值 / 攻击力 / 防御力 / 冲击力 / 暴击率 / 暴击伤害 /
      异常掌控 / 异常精通 / 穿透率 / 能量自动回复 / 穿透值 / 电属性伤害加成
    Each cell shows "total" with base+bonus annotation in smaller text.
    Output:
      actor.id, actor.level, actor.mindscape, actor.rank
      → panel + draftMetadata.evidence.statSplits

  Region 3 — Skill levels strip (5-6 icons with small numbers)
    Output: actor.skillLevels
    Confidence: medium; sanity-check vs. 12-max; the sample image shows
    one slot rendering as "07" which may indicate a sub-skill (e.g., core
    passive). Resolve via skill icon ↔ name map, not by position alone.

  Region 4 — Weapon strip (below AGENT INFO band)
    Weapon icon + name + LV.NN + visual star count for refinement
    Output: weapon.id, weapon.level, weapon.refinement
    Note: refinement is RENDERED as star icons (count them); on 工坊 it is
    "精炼 N 星" text. Different parse strategy per source.

  Region 5 — Driver score band
    "驱动盘有效副属性共中 N 次" + SSS/ACE badge + 3 bar charts
    (攻击力百分比, 暴击率, 暴击伤害)
    SKIP — community-tool metadata.

  Region 6 — Drive Disc cards (6 cards in 2-row × 3-col grid)
    Each card shows:
      Set name [slot N] / Lv.XX / (未命中 N 次 if applicable)
      Main stat (label + value)
      4 substats (label + optional "+N" roll count + total value)
    Output: same as 工坊 Region 7.
    Substat values are EXACT — no Tier 2 default.
    Note: 米游社 cards display roll-count "+N" with a slightly different
    icon position than 工坊; the parsed value should be identical.

  Region 7 — Footer
    Left: 米游社 logo
    Right: "协助绳匠一同探索新艾利都" + QR + "米游社绝区零战绩" watermark
    SKIP — branding only.
```

### 4.3 Source = unknown

No field-extraction prompt is used. Source-unknown immediately surfaces the unknown-source UX (§3 user-journeys / §6 below).

---

## 5. User-facing — review/edit gate

The review/edit gate is the primary vision-specific UX. Inline confidence markers are rendered per §4 user-journeys.

### 5.1 zh — full extraction with optional supplements

```
我从这张「{source}」截图里读到:

  角色: {agent.name} Lv{level} (影画 {mindscape})
  武器: {weapon.name} Lv{level} R{refinement}
  6 件套: {set-composition-summary}
  主词条: slot 4 {slot4.mainStat} / slot 5 {slot5.mainStat} / slot 6 {slot6.mainStat}
  副词条: 全部读到（含 roll 次数，无需默认填值）
  面板: HP {hp}, ATK {atk}, DEF {def}, 暴击率 {crit}%, 暴击伤害 {critDmg}%, ...

  证据 (audit-only，不进 calc):
    - ATK {atk} = {base} base + {bonus} bonus
    - HP {hp} = {base} base + {bonus} bonus
    - 截图来源: {source}（UID {uid} 已识别，不入 snapshot）

  {if missing fields}
  还要补一项: {missing-field-prompt}
  {else}
  没缺字段。直接算吗? 要改哪里告诉我。
  {/if}
```

### 5.2 en — mirror

```
I read the following from this {source} screenshot:

  Agent: {agent.name} Lv{level} (mindscape {mindscape})
  W-Engine: {weapon.name} Lv{level} R{refinement}
  6-piece: {set-composition-summary}
  Main stats: slot 4 {slot4.mainStat} / slot 5 {slot5.mainStat} / slot 6 {slot6.mainStat}
  Substats: all read (including roll counts; no default values needed)
  Panel: HP {hp}, ATK {atk}, DEF {def}, Crit {crit}%, Crit DMG {critDmg}%, ...

  Evidence (audit-only, not used in calc):
    - ATK {atk} = {base} base + {bonus} bonus
    - HP {hp} = {base} base + {bonus} bonus
    - Source: {source} (UID {uid} recognized, not persisted)

  {if missing fields}
  One more thing: {missing-field-prompt}
  {else}
  Nothing missing. Run calc? Tell me if you need to change anything.
  {/if}
```

### 5.3 Confidence marker rendering

| Bucket | zh render | en render |
|---|---|---|
| High | (no marker) | (no marker) |
| Medium | inline `（中置信）` after the value | inline `(medium confidence)` after the value |
| Low | bold `**{value}（低置信，请确认）**` | bold `**{value} (low confidence, please confirm)**` |
| Missing | placeholder `[请补充]` | placeholder `[please provide]` |

### 5.4 PII display rule

PII appears once in the evidence block, marked explicitly as audit-only. Never repeat PII outside this block. PII never reappears in subsequent AI turns or persisted artifacts.

---

## 6. User-facing — source unknown

### 6.1 zh

```
我没认出这张截图的来源（我目前只能稳定读「绝区零工坊」和「米游社」两种）。
要不你告诉我是哪个来源？或者改用文字描述你的构筑，我帮你组 snapshot？
```

### 6.2 en

```
I couldn't identify the screenshot source (I can currently read 绝区零工坊
and 米游社 panels reliably). Could you tell me which source it's from? Or
describe your build in text and I'll build the snapshot from there?
```

---

## 7. User-facing — partial extraction ask

When source is identified but some fields couldn't be read.

### 7.1 zh — template

```
我从这张「{source}」截图读到大部分内容，但有 {N} 个字段没看清:

  ✅ 读到的: {list of confidently-extracted field categories}

  ⚠️ 没读到的字段:
     1. {field-1} ({reason: e.g., 被对话窗口挡了一部分 / 截图边缘裁掉了 / 数字太小看不清})
     2. {field-2} ({reason})

  这 {N} 项你帮我补一下:
     1. {field-1-question}
     2. {field-2-question}
```

### 7.2 en — mirror

```
I read most of this {source} screenshot, but {N} fields are unclear:

  ✅ Successfully read: {list}

  ⚠️ Couldn't read:
     1. {field-1} ({reason})
     2. {field-2} ({reason})

  Could you fill in these {N} items?
     1. {field-1-question}
     2. {field-2-question}
```

### 7.3 Phrasing rules

- Lead with what WAS read (positive framing — partial vision is still useful).
- Own the limitation on the AI side ("我没看清") not the user side ("你没说").
- Cite a concrete reason for each missing field — helps user understand and fix the screenshot next time.
- Batch ask multiple missing fields in one message (matches V1.2.2 batched-ask).

---

## 8. User-facing — visual ambiguity disambiguation

### 8.1 zh — template (single ambiguity)

```
{field-context}: 我看到 {observation}，{ambiguity-description}。是哪一个？
  1. {candidate-1} ({disambiguating-attribute})
  2. {candidate-2} ({disambiguating-attribute})
  3. {candidate-3 if applicable}
```

### 8.2 zh — template (multiple ambiguities)

```
有 {N} 处我没把握，帮我确认一下:

  1. {field-1-context}: 候选 (a) {opt-a} / (b) {opt-b} — 哪个?
  2. {field-2-context}: 候选 (a) {opt-a} / (b) {opt-b} — 哪个?
  3. {field-N-context}: ...
```

### 8.3 en — mirror

```
zh template above → en mirror with parallel structure.
```

### 8.4 Rules

- Always 2–3 candidates with **disambiguating attributes** (id, rank, variant, score).
- Never auto-pick — even if one candidate has 90% probability.
- Group multiple ambiguities into one batched message (max 4).
- If >4 ambiguities → escalate to §9 NL fallback offer.

---

## 9. User-facing — NL fallback

### 9.1 zh — source-unknown fallback

```
这张截图我没法可靠读出来。我们换文字来吧 —
你描述一下角色 + 武器 + Drive Disc + 敌人，我帮你组 snapshot。
```

### 9.2 zh — too-many-ambiguities fallback

```
这张截图我没把握的地方有点多 ({N} 处)。我建议换文字描述更快 —
你说一下角色 + 武器 + Drive Disc + 敌人，我帮你组 snapshot。
也可以继续走截图路径，但需要逐个确认。你倾向哪一个？
```

### 9.3 en — mirrors above

```
zh templates above → en mirror.
```

### 9.4 Rules

- Always surface the fallback explicitly. Never auto-switch silently.
- When offering a choice, default to the lower-friction path for P1 (text usually faster than 5+ disambiguations).
- After fallback to NL, drop the vision draft entirely; do NOT carry over partial extraction as priming context (avoids user thinking "wait I already said this in the screenshot").

---

## 10. Layer 3 — data/query normalization (zh-only at MVP)

Field-label normalization tables map source-visible zh labels to canonical BattleSnapshot field ids. Both supported sources use identical zh labels for stats / disc sets / agents / weapons, so a single zh table covers both.

### 10.1 Stat labels (panel & substats)

| zh label | canonical id | notes |
|---|---|---|
| 生命值 | hp | total or substat |
| 攻击力 | attack | total or substat |
| 防御力 | defense | total or substat |
| 冲击力 | impact | total |
| 暴击率 | critRate | percent; substat values are % |
| 暴击伤害 | critDmg | percent; substat values are % |
| 异常掌控 | anomalyMastery | flat |
| 异常精通 | anomalyProficiency | flat |
| 穿透率 | pen | percent |
| 穿透值 | penFlat | flat substat or panel field |
| 能量回复 / 能量自动回复 | energyRegen | rate; per-second |
| 电属性伤害加成 | elemDmgElectric | percent; element-specific |
| (any other elem) | elemDmg{ElementName} | percent; element-specific |

### 10.2 Set names (Drive Disc 4pc / 2pc)

Entity normalization layer (per V1.2.2) handles `啄木鸟电音 → 31000`, `钢铁躯壳 → 32004`, `折枝剑歌 → 31002` (illustrative — actual ids resolved against nanoka data registry).

### 10.3 Agent + weapon names

Reuse V1.2.2 entity-alias map (`packages/data/...`). No V1.2.3-specific table.

---

## 11. Few-shot fixtures

Reference: `examples/ai-plugin/v1.2.3-vision/` (TL + UX co-owned in T2; QA validates).

Expected fixture set:

| Fixture | Source | Demonstrates |
|---|---|---|
| `vision-yixuan-工坊.md` | 工坊 | Happy-path 工坊 extraction; high confidence all fields |
| `vision-anbi-米游社.md` | 米游社 | Happy-path 米游社 extraction; "07" skill-slot ambiguity surfaced |
| `vision-partial-工坊.md` | 工坊 | Cropped screenshot; §7 partial-extraction ask triggered |
| `vision-ambiguous-cropped.md` | 工坊 | Multiple visual ambiguities; §8 disambiguation |
| `vision-unknown-source.md` | (unsupported) | §6 source-unknown + NL fallback offer |
| `vision-fallback-low-confidence.md` | 米游社 | Low-confidence majority; §9 NL fallback proposed |

QA acceptance V-G2 / V-G3 / V-G4 / V-G5 reference these fixtures.

---

## 12. Cross-references

- V1.2.2 prompt templates (NL-input): `docs/ai-plugin/prompt-templates.md`
- V1.2.3 user journeys: `docs/ai-plugin/v1.2.3-vision/user-journeys.md`
- V1.2.3 architecture (schema + vision pipeline): `docs/ai-plugin/v1.2.3-vision/architecture.md`
- V1.2.3 acceptance (V-G gates): `docs/ai-plugin/v1.2.3-vision/acceptance.md`
- D-22 product decision: `docs/product/decisions/D-22-ai-plugin-v1.2.3-vision.md`

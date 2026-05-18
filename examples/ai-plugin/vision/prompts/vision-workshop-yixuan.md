# fixture · vision-workshop-yixuan

**Skill**: fairy-vision
**Source**: zzz-workshop (绝区零工坊 WeChat mini-app)
**Scenario**: P1 user pastes a 工坊 build screenshot of 仪玄 Lv60 + 青溟笼舍 R1 + 云霄如我 4pc + 折枝剑歌 2pc; vision pipeline detects source, extracts full build, produces reviewable BattleSnapshot draft + draftMetadata, hands off to fairy-snapshot for review/edit.
**Lang**: zh

This fixture demonstrates the **happy-path 工坊** flow: high-confidence source detection, complete field extraction including substat roll counts, no missing fields, PII (UID) detected and redacted at the draftMetadata level, review/edit gate uses generic source description (no skill-name leakage per K4).

---

## User input

```
User (zh, with image attachment):
  [zzz-workshop-yixuan-build.png]
  帮我算一下这个的伤害，本期 DA boss
```

## Expected fairy-vision behavior

1. **Lang detect**: zh (user message + image internal UI both zh) → session lang = zh.
2. **Multimodal capability check**: host supports image input → proceed.
3. **Source detection** (per `prompt-templates.md` §3):
   - Branding cues found: footer "关注微信公众号「绝区零工坊」即可查询" + phone status bar + vertical portrait orientation + ACE 评级 text
   - Result: `sourceDetection: { sourceId: "zzz-workshop", sourceLabel: "绝区零工坊", confidence: 0.95 }`
4. **Per-source layout map** (per `prompt-templates.md` §4.1 工坊 regions):
   - Region 2 agent roster row: 仪玄 highlighted as selected
   - Region 3 agent panel: identity + level + mindscape + stats + element/specialty icons
   - Region 4 skill levels strip: 12/11/12/12/12 (5 visible categories)
   - Region 5 weapon card: 青溟笼舍 Lv.60 精炼1星
   - Region 6 driver score header: SKIPPED (community-tool metadata)
   - Region 7 Drive Disc cards (slots 1-6)
   - Region 8 footer: SKIPPED (branding)
5. **PII detection** (per V-G4):
   - UID detected in Region 3 agent portrait card area
   - Username: not visible
   - `piiDetection: { kinds: ["uid"], redactionStatus: "redacted" }`
   - Raw UID digits never reach `BattleSnapshot` or persisted `draftMetadata`
6. **Confidence scoring** (per `user-journeys.md` §4):
   - Agent name / level / weapon / Drive Disc set names / slots / main stats / substat values + roll counts: high confidence (text-rendered)
   - Element icon / specialty icon / mindscape badge: medium confidence (icon-based)
   - Skill levels: medium confidence (small font)
   - All critical fields high or medium → no field-tier escalation needed
7. **Substat capture precision**: roll counts visible on every substat → substat values populated exactly (no Tier 2 midpoint default needed); recorded in `draftMetadata.evidence.substatRolls`
8. **Output**: `battleSnapshotDraft` (strict schema, total panel values only) + `draftMetadata` + `nextStep: "Hand off to fairy-snapshot for review/edit and any missing critical fields."`
9. **Chain handoff**: AI host consumes `nextStep`, presents review/edit gate, then user confirm → fairy-snapshot → fairy-calc.

## Expected output

- **BattleSnapshot draft**: see `snapshots/yixuan-workshop.snapshot.json`
- **draftMetadata**: see `expected/yixuan-workshop.draft-metadata.json`

## Review/edit gate copy (zh user-facing)

```
我从这张「绝区零工坊」截图里读到:

  角色: 仪玄 Lv60 (影画 2，玄墨·命破)
  武器: 青溟笼舍 Lv60 R1
  6 件套: 云霄如我 4pc (slot 1+3+4+6) + 折枝剑歌 2pc (slot 2+5)
  主词条: slot 4 暴击伤害 48% / slot 5 以太伤害加成 30% / slot 6 生命值 30%
  副词条: 全部读到（含 roll 次数，无需默认填值）
  面板: HP 18305, ATK 1979, DEF 718, 冲击力 93, 暴击率 55.4%, 暴击伤害 200.4%, 异常掌控 92, 异常精通 117, 贯穿力 2424
  技能等级: 普攻 12 / 闪避 11 / 支援 12 / 特殊技 12 / 连携技 12

  证据 (audit-only，不进 calc):
    - HP 18305 = 8373 base + 9932 bonus
    - ATK 1979 = 1615 base + 364 bonus
    - DEF 718 = 441 base + 277 bonus
    - 截图来源: 绝区零工坊 (UID 已识别并隐藏，不入 snapshot)

  你提到「本期 DA boss」我帮你补到 enemy 字段。
  直接算吗？要改哪里告诉我。
```

## Acceptance assertions (per `docs/ai-plugin/v1.2.3-vision/acceptance.md`)

### V-G1 — Source detection & layout routing

- `sourceDetection.sourceId === "zzz-workshop"` ✓
- Workshop layout map applied (Region 7 Drive Disc cards parsed in 2-row grid order)
- Generic "unknown source" fallback NOT triggered
- Source detection result recorded in `draftMetadata`, not in `BattleSnapshot`

### V-G2 — Extraction evidence & schema boundary

- `BattleSnapshot.team[*].panel` contains total panel values only (no base/bonus split)
- `draftMetadata.evidence.statSplits` records base+bonus pairs (3 stat splits at minimum: HP / ATK / DEF)
- `draftMetadata.evidence.substatRolls` records visible roll counts for at least one Drive Disc substat
- `BattleSnapshot` parses through `parseBattleSnapshot` without ad hoc field keys (no `uid`, `username`, `sourceImage`, `baseAttack`, `bonusAttack` etc.)

### V-G3 — Review/edit & uncertainty handling

- High-confidence fields pre-filled; no critical field tier escalation triggered
- Review/edit gate text contains no skill names (`fairy-vision`, `fairy-snapshot`, `fairy-calc`, `fairy-explain`)
- Review/edit gate text contains no orchestration phrasing (`invoking ...`, `transferring to ...`, `handing off to ...`)
- "5★ midpoint default" copy is absent (substat values captured from roll counts)

### V-G4 — Privacy & PII exclusion

- `BattleSnapshot` contains no `uid` / `username` / other account identifier keys
- `draftMetadata.piiDetection.kinds === ["uid"]` (no raw digits)
- `draftMetadata.piiDetection.redactionStatus === "redacted"`
- Public fixture display copy does not contain the raw UID `11553939`; only "UID 已识别并隐藏" or similar

### V-G5 — End-to-end CLI calc validation

- Confirmed `BattleSnapshot` is structurally valid input for `fairy calc <snapshot> --view verbose --lang zh`
- Calc output (when generated downstream) contains no skill names / orchestration phrasing
- No `fairy compare` invocation appears in this fixture path

### K4 — Chain transition invisibility

- Review/edit gate copy reads as continuous AI conversation; no `fairy-vision` / `fairy-snapshot` / `fairy-calc` skill-name reference visible to user
- "Hand off" appears in `draftMetadata.nextStep` (canonical EN, internal chain) but NOT in user-facing zh copy

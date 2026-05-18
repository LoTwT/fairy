# fixture · vision-miyoushe-yixuan

**Skill**: fairy-vision
**Source**: miyoushe-record (米游社绝区零战绩)
**Scenario**: P1 user pastes a 米游社 build screenshot of 仪玄 Lv60 + 青溟笼舍 R1 + 云岿如我 4pc + 折枝剑歌 2pc (same build as `vision-workshop-yixuan` cross-source pair); vision pipeline detects 米游社 source, applies its layout map, produces a strict BattleSnapshot with the same agent / wEngine / driveDiscs identity. Source-displayed derived stats intentionally differ from the workshop variant: 米游社 surfaces a `corePassive` skill slot that 工坊 omits, and renders `energyRegen` with a different unit convention; `sheerForce` differs by 1 unit from display rounding. `etherDamageBonus` is included in both variants (matching the slot-5 main stat). Differences are documented in `draftMetadata.evidence.crossSourceNotes`.
**Lang**: zh

This fixture pairs with `vision-workshop-yixuan.md` to demonstrate **cross-source identity**: same build screenshot from a different community tool produces a `BattleSnapshot` with the same agentId / wEngine / driveDiscs composition. Source-displayed derived stats differ — 米游社 surfaces a `corePassive` skill slot that 工坊 omits; `energyRegen` is rendered with a different unit convention; `sheerForce` differs by 1 unit from rounding. `etherDamageBonus` is captured in both variants (matching the slot-5 main stat). Each variant captures what its source actually shows; cross-source differences are documented in `draftMetadata.evidence.crossSourceNotes`.

It also exercises the 米游社-specific layout features: SSS+ rating badge, AGENT INFO band, 驱动盘有效副属性共中 framing, 6-card Drive Disc grid, and the skill-strip "07" slot that may render slightly differently (per `user-journeys.md` §6 visual-ambiguity note — verified as a documented stable value in this fixture, no ambiguity escalation needed).

---

## User input

```
User (zh, with image attachment):
  [miyoushe-yixuan-build.png]
  这个仪玄打 DA boss 一段普攻伤害多少
```

## Expected fairy-vision behavior

1. **Lang detect**: zh → session lang = zh.
2. **Multimodal capability check**: host supports image input → proceed.
3. **Source detection** (per `prompt-templates.md` §3):
   - Branding cues found: top-right "ZZ 绝区·零 zen.less zone zero" wordmark + bottom-left 米游社 logo + bottom-right "米游社绝区零战绩" watermark + landscape composite orientation
   - Result: `sourceDetection: { sourceId: "miyoushe-record", sourceLabel: "米游社", confidence: 0.95 }`
4. **Per-source layout map** (per `prompt-templates.md` §4.2 米游社 regions):
   - Region 1 top bar: PII (username + UID) → captured as `piiDetection`
   - Region 2 AGENT INFO band: agent rank/portrait card (S-rank) + mindscape "2" + agent name + LV.60; right-half 2-column stats table (含 以太伤害加成 30.0%)
   - Region 3 skill levels strip: 12/11/12/12/12/07 (6 visible categories; `07` is the core-passive slot, not an ambiguity)
   - Region 4 weapon strip: 青溟笼舍 Lv.60 (1-star icon = R1)
   - Region 5 driver score band: "驱动盘有效副属性共中 40 次" + SS+ badge → SKIPPED (community-tool metadata)
   - Region 6 Drive Disc cards (6 in 2-row × 3-col grid)
   - Region 7 footer: SKIPPED (branding + QR)
5. **PII detection** (per V-G4):
   - UID + username detected in Region 1
   - `piiDetection: { kinds: ["uid", "username"], redactionStatus: "redacted" }`
   - Raw digits / username never reach `BattleSnapshot` or persisted `draftMetadata`
6. **Confidence scoring**:
   - Identical confidence profile to workshop fixture (text-rendered fields high; icon-based medium)
   - 米游社 weapon refinement uses **star icon count** (vs workshop "精炼 N 星" text) → medium confidence (visual count); cross-validated as 1 star = R1
7. **Cross-source rounding tolerance**:
   - 米游社 displays 贯穿力 as `2423`, workshop as `2424` (likely display rounding)
   - Vision parse records exact value from source (`2423`); `draftMetadata.evidence.crossSourceNotes` may flag for downstream comparison if cross-source mode is enabled (out of MVP scope)
8. **Output**: `battleSnapshotDraft` + `draftMetadata` + `nextStep` (same shape as workshop fixture).

## Expected output

- **BattleSnapshot draft**: see `snapshots/yixuan-miyoushe.snapshot.json`
- **draftMetadata**: see `expected/yixuan-miyoushe.draft-metadata.json`

## Review/edit gate copy (zh user-facing)

```
我从这张「米游社」截图里读到:

  角色: 仪玄 Lv60 (影画 2，S 评级)
  武器: 青溟笼舍 Lv60 R1
  6 件套: 云岿如我 4pc (slot 1+3+4+6) + 折枝剑歌 2pc (slot 2+5)
  主词条: slot 4 暴击伤害 48% / slot 5 以太伤害加成 30% / slot 6 生命值 30%
  副词条: 全部读到
  面板: HP 18305, ATK 1979, DEF 718, 冲击力 93, 暴击率 55.4%, 暴击伤害 200.4%, 异常掌控 92, 异常精通 117, 贯穿力 2423, 以太伤害加成 30%
  技能等级: 普攻 12 / 闪避 11 / 支援 12 / 特殊技 12 / 连携技 12 / 核心 07

  证据 (audit-only，不进 calc):
    - HP 18305 = 8373 base + 9932 bonus
    - ATK 1979 = 1615 base + 364 bonus
    - DEF 718 = 441 base + 277 bonus
    - 截图来源: 米游社 (UID + 用户名 已识别并隐藏，不入 snapshot)

  你提到「DA boss」一段普攻 — 帮你补 enemy = 本期 DA boss + 攻击段 = basic attack step 1。
  直接算吗？要改哪里告诉我。
```

## Acceptance assertions (per `docs/ai-plugin/v1.2.3-vision/acceptance.md`)

### V-G1 — Source detection & layout routing

- `sourceDetection.sourceId === "miyoushe-record"` ✓
- 米游社 layout map applied (Region 2 AGENT INFO band, Region 3 skill strip with 6 slots including the 07-slot rendering convention)
- Workshop layout NOT applied to this fixture

### V-G2 — Extraction evidence & schema boundary

- Same as workshop fixture for `BattleSnapshot.panel` strict-totals contract
- `draftMetadata.evidence.statSplits` records 3 minimum stat splits (HP/ATK/DEF)
- `draftMetadata.evidence.substatRollsSample` records visible roll counts
- 以太伤害加成 30% appears in panel (both source variants include this field, matching the slot-5 main stat — verify captured per-source)

### V-G3 — Review/edit & uncertainty handling

- Same as workshop fixture: no skill names / no orchestration phrasing / no midpoint-default copy
- 米游社 "07" skill slot is reported as "核心 07" in user-facing copy (documented stable value, not flagged as ambiguity in this fixture)

### V-G4 — Privacy & PII exclusion

- `piiDetection.kinds === ["uid", "username"]` (both detected from miyoushe Region 1)
- `piiDetection.redactionStatus === "redacted"`
- `BattleSnapshot` contains no PII keys
- Public fixture display copy contains no raw UID / username; only "UID + 用户名 已识别并隐藏"

### V-G5 — End-to-end CLI calc validation

- Confirmed `BattleSnapshot` is valid input for `fairy calc <snapshot> --view verbose --lang zh`
- Cross-source identity check (optional): both fixtures share the same agentId / wEngine / driveDiscs composition; calc on each variant may produce slightly different totals because each captures the source-displayed derived panel (per `crossSourceNotes`), not a unified canonical numeric panel

### K4 — Chain transition invisibility

- Same as workshop fixture: no skill-name leakage / no orchestration phrasing in user-facing copy

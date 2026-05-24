# fixture · vision-miyoushe-dialyn

**Skill**: fairy-vision
**Source**: miyoushe-record (米游社)
**Scenario**: F2 user pastes a 米游社 build screenshot of 琉音 Lv60 + 昨夜来电; vision pipeline detects source, extracts full build, produces reviewable BattleSnapshot draft + draftMetadata, and hands off for review/edit.
**Lang**: zh

This fixture demonstrates an F2 **happy-path 米游社** flow for a non-Yixuan agent. It expands source/layout regression coverage without committing raw image assets. Source image recovered locally for authoring: miyoushe-3-9e1826de.jpg.

---

## User input

```
User (zh, with image attachment):
  [miyoushe-dialyn-build.png]
  帮我算一下这个的伤害，本期 DA boss
```

## Expected fairy-vision behavior

1. **Lang detect**: zh → session lang = zh.
2. **Multimodal capability check**: host supports image input → proceed.
3. **Source detection**:
   - Result: `sourceDetection: { sourceId: "miyoushe-record", sourceLabel: "米游社", confidence: 0.95 }`
   - Source cues recorded in draftMetadata; raw screenshot is not persisted.
4. **Per-source layout map**: parse agent identity, level, mindscape, skill strip, W-Engine, panel totals, and six Drive Disc cards.
5. **PII detection**:
   - UID and username are detected
   - `piiDetection: { kinds: ["uid","username"], redactionStatus: "redacted" }`
   - Raw account values never reach `BattleSnapshot` or committed `draftMetadata`.
6. **Confidence scoring**: critical fields are high or medium confidence; no field-tier escalation needed.
7. **Substat capture precision**: visible substat values and roll markers are recorded in `draftMetadata.evidence.substatRollsSample`.
8. **Output**: `battleSnapshotDraft` (strict schema) + `draftMetadata` + review/edit gate; user confirms before downstream calc.

## Expected output

- **BattleSnapshot draft**: see `snapshots/dialyn-miyoushe.snapshot.json`
- **draftMetadata**: see `expected/dialyn-miyoushe.draft-metadata.json`

## Review/edit gate copy (zh user-facing)

```
我从这张「米游社」截图里读到:

  角色: 琉音 Lv60 (影画 2)
  武器: 昨夜来电 Lv60 R1
  6 件套: 山大王 4pc (slot 1+2+4+5) + 月光骑士颂 2pc (slot 3+6)
  面板: HP 11169, ATK 2379, DEF 825, 冲击力 110, 暴击率 100%, 暴击伤害 107.6%, 异常掌控 94, 异常精通 156
  物理伤害加成 30%
  技能等级: 普攻 12 / 闪避 11 / 支援 12 / 特殊技 12 / 连携技 12

  证据 (audit-only，不进 calc):
    - HP 11169 = 8250 base + 2919 bonus
    - ATK 2379 = 1471 base + 908 bonus
    - DEF 825 = 612 base + 213 bonus
    - 截图来源: 米游社 (UID + 用户名 已识别并隐藏)

  你提到「本期 DA boss」我帮你补到 enemy 字段。
  直接算吗？要改哪里告诉我。
```

## Acceptance assertions

- `sourceDetection.sourceId === "miyoushe-record"` ✓
- Draft parses with `parseBattleSnapshot` after user confirmation.
- Confirmed draft can run through `fairy calc <snapshot> --view verbose --lang zh`.
- `draftMetadata.evidence.substatRollsSample` records visible roll-count evidence.
- Review/edit gate copy contains no skill names or chain handoff wording.
- PII is represented by kind/status only; raw account values are not persisted.

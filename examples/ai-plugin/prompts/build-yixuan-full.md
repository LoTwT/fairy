# fixture · build-yixuan-full

**Skill**: fairy-snapshot
**Scenario**: user provides all critical fields up-front (level, refinement, full Drive Disc spec) → AI proceeds with no ask-user dialog, only review/confirm gate.
**Lang**: zh

This fixture demonstrates the **happy fast path**: AI has zero critical questions, snapshot generation is one-shot. Used by QA G3 to assert AI does NOT add unnecessary friction when input is complete.

---

## User input

```
算仪玄 60 级、武器命破之刃精炼 1、Drive Disc 啄木鸟电音 4 件套（slot 1-4）+ 钢铁躯壳 2 件套（slot 5-6），
slot 4 主词条暴击率，slot 5 主词条攻击力%，slot 6 主词条电属性伤害加成，
面板值按 5★ 满级默认即可。
本期 DA boss，60 级。一段普通攻击伤害。
```

## Expected AI behavior

1. **Lang detect**: zh → session lang = zh.
2. **Entity normalization**: same as build-yixuan-basic (仪玄/命破之刃/啄木鸟电音/钢铁躯壳/危局强袭战 → canonical ids).
3. **Field tier check**:
   - All critical fields **resolved from input**: agent level 60, refinement 1, full Drive Disc setIds + main stats, enemy id resolved.
   - Optional: panel stats explicitly said "5★ 满级默认即可" → user opts into Tier 2 default.
   - No critical missing → **no ask-user dialog needed**.
4. **Snapshot generation**: directly produce strict BattleSnapshot.
5. **draftMetadata**:
   - `defaultedFields`: only panel values (user explicitly opted into default).
   - `unknownFields`: empty.
   - `warnings`: 1 entry "panel-user-opt-into-default: no deviation warning (user accepted explicitly)".
6. **Review/confirm gate** (short, since input was already detailed):
   ```
   AI: "snapshot 已组好:
     - 仪玄 lv60, 命破之刃 R1
     - 啄木鸟电音 4pc (slots 1-4) + 钢铁躯壳 2pc (slots 5-6)
     - 主词条: slot 4 暴击率 / slot 5 攻击力% / slot 6 电属性增伤
     - 面板值: 5★ 满级 midpoint 推导面板默认 (用户已确认)
     - 敌人: 本期 DA boss 60 级
     - 攻击段: 普通攻击一段

     直接算吗?"
   ```
7. **User confirms** → chain to fairy-calc.

## Expected output

Snapshot JSON similar to `snapshots/yixuan-basic.snapshot.json` (same agent + weapon + Drive Disc set composition). Snapshot value is identical at the BattleSnapshot field level because the user-provided panel default is the same as the default chosen in build-yixuan-basic.

draftMetadata differs:
```json
{
  "defaultedFields": [
    {
      "path": "team[0].panel.{attack,critRate,critDamage,etherDamageBonus}",
      "default": "5-star midpoint-derived panel value",
      "rationale": "User explicitly opted into Tier 2 default with phrase '5★ 满级默认即可'.",
      "userExplicitOptIn": true
    }
  ],
  "unknownFields": [],
  "warnings": [
    "panel-user-opt-into-default: user explicitly accepted; no deviation warning needed"
  ],
  "askUserTurns": []
}
```

## Acceptance assertions (QA G3)

- AI must NOT ask any critical-field question when all are resolved from input.
- AI must surface review/confirm gate (no skip to calc without confirm, per architecture).
- AI must record user's explicit opt-in to defaults in `draftMetadata` (vs silent default in build-yixuan-basic).
- Review summary must be concise (no over-explaining what user already said).
- No critical fields silently filled.

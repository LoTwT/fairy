# fixture · build-yixuan-unknown

**Skill**: fairy-snapshot
**Scenario**: user says "不知道" for critical field → AI surfaces consequences, user confirms anyway → snapshot draft proceeds with explicit unknown marker in draft metadata.
**Lang**: zh

This fixture covers the **critical-field unknown** path (per `prompt-templates.md` §4.1 "User says 'unknown' for critical").

---

## User input

```
算一下仪玄带啄木鸟电音 4 套伤害，武器我忘了具体是哪把了。
```

## Expected AI behavior

1. **Lang detect**: zh → session lang = zh.
2. **Entity normalization**:
   - "仪玄" → `character.id=1371` ✓
   - "啄木鸟电音" → `equipment.setId=31000` ✓
   - W-Engine → unknown / not specified
3. **Field tier check**:
   - Critical: agent level (not specified) + W-Engine id (user says "忘了")
   - Critical missing → AI must ask.
4. **Initial ask-user (critical batch)**:
   ```
   AI: "需要 2 个关键字段:
     1. 仪玄是几级?
     2. 武器具体是哪把? 候选:
        - 青溟笼舍 (S 级特征攻击) — Yixuan signature
        - 街头巨星
        - 其他?
     或者你可以告诉我武器是什么类型 (打击 / 异常 / 支援)，我帮你推断常见配的。"
   ```
5. **User reply** (says "unknown" for weapon):
   ```
   "60 级，武器真不知道，你随便挑一个。"
   ```
6. **Critical-unknown surface** (per §4.1 "User says 'unknown' for critical"):
   ```
   AI: "武器是关键字段，没指定的话:
     - 选项 A: 帮你用 Yixuan 推荐武器 青溟笼舍 R1 (signature weapon, 与角色配套设计) — 结果会接近最大伤害预估
     - 选项 B: 选个常见 4★ 武器，结果会显著偏低
     - 选项 C: 跳过武器，snapshot 标 'weapon-unknown' warning，calc 仍能跑但结果可信度低

     你倾向哪种?"
   ```
7. **User reply**:
   ```
   "选 A"
   ```
8. **AI proceeds with recommended weapon**:
   ```
   AI: "OK, 用青溟笼舍 R1 (Yixuan signature) 替代。如果你之后确认武器是别的，把 snapshot.json 改一下重新算就行。"
   ```
9. **Continue 2pc clarification + review/confirm gate** (similar to build-anby-ambiguous flow).
10. **Snapshot generation**: produce strict BattleSnapshot with chosen weapon. **No `"unknown"` value in snapshot JSON** (per TL constraint `4a3b7196`).
11. **draftMetadata** records:
    - `defaultedFields`: includes `team[0].wEngine.id` defaulted to recommended via user-confirmed option A; AI must surface this in review.
    - `warnings`: ["weapon-user-asked-recommend: AI selected Yixuan signature weapon per user option A"]

## Alternative path — user picks option C (skip weapon, mark unknown)

If user said "选 C" instead:

```
AI: "OK, snapshot 里我把武器槽留空 (per fairy schema)，draftMetadata 会标 'critical-field-unknown: team[0].wEngine.id'.
     calc 是否能跑取决于 fairy schema 是否接受缺武器的 snapshot — 我先 review 给你看 schema validation 结果。"
```

If fairy schema requires weapon (critical), snapshot validation fails at fairy-calc preflight step → AI surfaces parseBattleSnapshot error and asks user to provide a weapon (or pick option A retroactively).

**Important**: per TL constraint, `team[0].wEngine.id = "unknown"` (string) is NOT valid; either user picks a real weapon or schema rejects. The "unknown marker" is in `draftMetadata.unknownFields`, not in snapshot JSON.

## Expected output

If option A picked: snapshot JSON similar to `snapshots/yixuan-basic.snapshot.json` with weapon=14137.

draftMetadata:
```json
{
  "defaultedFields": [
    {
      "path": "team[0].wEngine.id",
      "default": "14137 (Qingming Birdcage, Yixuan signature)",
      "rationale": "User chose option A 'AI recommends Yixuan signature weapon' when asked about unknown weapon.",
      "expectedDeviationPct": "low (signature pairing is near-optimal)"
    },
    {
      "path": "team[0].panel.{attack,critRate,critDamage,etherDamageBonus}",
      "default": "5-star midpoint-derived panel",
      "rationale": "Substat values not specified."
    }
  ],
  "unknownFields": [],
  "warnings": [
    "weapon-user-asked-recommend: signature weapon used"
  ]
}
```

## Acceptance assertions (QA G3)

- AI must surface 3 options (A/B/C) when user says "unknown" for critical W-Engine, not silently pick.
- AI must not write `"unknown"` string into strict BattleSnapshot field (TL constraint).
- AI must record the rationale in `draftMetadata.defaultedFields` for traceability.
- If user picks option C (skip), AI must rely on schema validation at fairy-calc preflight to reject, not silently proceed.
- AI must explain that user can re-run with corrected weapon later (UX best practice: surface remediation path).

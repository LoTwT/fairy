# fixture · build-anby-ambiguous

**Skill**: fairy-snapshot
**Scenario**: entity ambiguity → AI disambiguates by surfacing candidates, user picks, then proceeds to ask remaining critical fields.
**Lang**: zh

This fixture covers the **ambiguity** path of the ask-user dialog (per `prompt-templates.md` §4.4) and demonstrates that AI never auto-picks when multiple candidates exist.

---

## User input

```
帮我算 Anby 50 级，5★ S11 工业制式精炼 3，配啄木鸟电音 4 套。
```

## Expected AI behavior

1. **Lang detect**: input majority zh (mixed lang OK; zh dominant by token count) → session lang = zh.
2. **Entity normalization**:
   - "Anby" → ambiguity: in V1.2.2 nanoka data only `character.id=1011` (Anby Demara) matches. Single candidate, but AI surfaces context per `prompt-templates.md` §4.4 to confirm with user (good UX practice for ambiguous-looking inputs).
   - "S11" / "S11 工业制式" → `weapon.id=14041`
   - "啄木鸟电音" → `equipment.setId=31000`
3. **Disambiguation surface** (Anby example):
   ```
   AI: "你说的 Anby 我看到 1 个匹配:
     1. Anby Demara (id 1011, A 级电属性, V1 onward)

     是这位吗?"
   ```
4. **User confirms**:
   ```
   "是 1"
   ```
5. **Field tier check**:
   - Critical resolved: level=50, weapon refinement=3, Drive Disc set covered.
   - Critical missing: **Drive Disc 2pc set** (4pc 已说了，2pc 还没说) — 需问。
   - Optional defaulted: panel values, mindscapeCinema level.
6. **Ask-user dialog** (sequential, since 2pc choice depends on 4pc context):
   ```
   AI: "你说的 4 套是啄木鸟电音; 那剩下 2 个槽位是什么?
     - 啄木鸟电音 6 套（完整套装）?
     - 啄木鸟电音 4 + 其他 2 套? (告诉我另外 2 套是哪个)"
   ```
7. **User reply**:
   ```
   "另外 2 套钢铁躯壳"
   ```
8. **Snapshot generation**: produce `BattleSnapshot` JSON.
9. **Review/confirm gate**:
   ```
   AI: "snapshot 已组好:
     - Anby Demara lv50 (id 1011)
     - S11 工业制式 R3 (id 14041)
     - 啄木鸟电音 4pc + 钢铁躯壳 2pc
     - 默认填: panel values from 5★ midpoint assumptions, mindscapeCinema level 0

     还要补充什么吗? 比如敌人是什么? 算哪一段攻击?"
   ```
   **Note**: AI proactively asks user for context still missing for a useful calc (enemy / attack segment) since this prompt didn't specify. This is per UX guideline: never silently produce snapshot with no attack target.
10. **User reply**:
    ```
    "本期 DA boss, 算一段普攻"
    ```
11. **Final snapshot + confirm** → invoke fairy-calc skill.

## Expected output

Snapshot JSON shape similar to `snapshots/yixuan-basic.snapshot.json` with appropriate field substitutions:
- `team[0].agentId = "1011"` (Anby Demara)
- `team[0].level = 50`
- `team[0].wEngine.id = "14041"` (S11), `refinement = 3`
- Drive Disc setIds: slots 1-4 = `31000` (Woodpecker), slots 5-6 = `32004` (Hormone Punk)
- `attackSegments[0].skill = "basic"`, `step = 1`

## Acceptance assertions (QA G3)

- AI must surface disambiguation candidates even for single-match cases when input is informal (e.g., "Anby" → confirm full name).
- AI must not auto-pick from multiple candidates.
- AI must ask 2pc set when 4pc is specified but 2pc is not (Drive Disc 6-slot completeness gate).
- AI must proactively ask user for missing context (enemy / attack segment) before producing a usable snapshot.
- Field tier policy enforced (critical → ask, optional → default + warning).

# fixture · build-yixuan-basic

**Skill**: fairy-snapshot
**Scenario**: minimal happy path — user provides agent + W-Engine + Drive Disc set names, AI asks 1 critical field (agent level), produces a snapshot.
**Lang**: zh + en mirror

This is the **canonical baseline** fixture per `acceptance.md` G4. Snapshot output is consumed by `calc-yixuan` and `explain-yixuan-trace` fixtures downstream.

---

## Variant A — zh dialog

### User input

```
我想算仪玄带青溟笼舍，啄木鸟电音 4 件套 + 激素朋克 2 件套，
打 60 级危局强袭战 boss，单段普通攻击一段伤害。
```

### Expected AI behavior

1. **Lang detect**: input majority zh → session lang = zh.
2. **Entity normalization**:
   - "仪玄" → `character.id=1371` ✓
   - "青溟笼舍" → `weapon.id=14137` ✓
   - "啄木鸟电音" → `equipment.setId=31000` (Drive Disc set) ✓
   - "激素朋克" → `equipment.setId=31400` (Drive Disc set) ✓
   - "危局强袭战" → DA scope marker, resolves to Greta ✓
3. **Field tier check** (per 3-tier policy):
   - Critical missing: **agent level** (Yixuan 是几级?)
   - Optional with default: panel values (用 5★ 满级 midpoint 推导面板默认)
   - Refinement level: critical → 也需问
4. **Ask-user dialog** (batch, 2-3 critical fields):
   ```
   AI: "我帮你查到了:
     - 角色: 仪玄 (id 1371)
     - W-Engine: 青溟笼舍 (id 14137)
     - Drive Disc: 啄木鸟电音 4套 + 激素朋克 2 套
     - 敌人: 格莱特

     还需要 2 个关键字段:
     1. 仪玄的等级? (例: 60)
     2. 青溟笼舍的精炼? (1-5)

     回答完我就能算了。"
   ```
5. **User reply** (expected):
   ```
   "60 级，精炼 1"
   ```
6. **Snapshot generation**: produce valid `BattleSnapshot` JSON conforming to `parseBattleSnapshot`.
7. **Optional defaulted fields**: surface in `draftMetadata.defaultedFields`:
   - `team[0].panel.{attack,critRate,critDamage,etherDamageBonus}` → defaulted to 5★ midpoint
   - `team[0].mindscapeCinema.level` → defaulted to 0
8. **Review/confirm gate**: AI presents snapshot summary to user before invoking calc.
   ```
   AI: "snapshot 已组好:
     - 仪玄 lv60, 青溟笼舍 R1
     - 啄木鸟电音 4pc + 激素朋克 2pc
     - 敌人: 格莱特
     - 默认填: panel values from 5★ midpoint assumptions, mindscapeCinema level 0

     继续算伤害吗?"
   ```
9. **User confirms** → AI invokes `fairy-calc` skill (chain).

### Expected snapshot output

See `snapshots/yixuan-basic.snapshot.json`.

### Lang policy

All AI dialog turns and snapshot review summary in zh (matching session lang).
Snapshot JSON itself is canonical English schema (per tri-layer i18n Layer 1).

---

## Variant B — en dialog (mirror)

### User input

```
I want to calculate Yixuan with Qingming Birdcage, Woodpecker Electro 4pc + Hormone Punk 2pc,
fighting Greta, single basic attack first hit damage.
```

### Expected AI behavior

Identical entity normalization (Yixuan → 1371, Qingming Birdcage → 14137, Woodpecker Electro → 31000, Hormone Punk → 31400).

Dialog in en:

```
AI: "Got it, found:
  - Agent: Yixuan (id 1371)
  - W-Engine: Qingming Birdcage (id 14137)
  - Drive Discs: Woodpecker Electro 4pc + Hormone Punk 2pc
  - Enemy: Greta

  I still need 2 critical fields:
  1. Yixuan's level? (e.g., 60)
  2. Qingming Birdcage refinement? (1-5)

  Tell me both and I'll run the calc."
```

User reply: `"level 60, R1"`

Review gate:

```
AI: "Snapshot ready:
  - Yixuan lv60, Qingming Birdcage R1
  - Woodpecker Electro 4pc + Hormone Punk 2pc
  - Enemy: Greta
  - Defaulted: panel values from 5★ midpoint assumptions, mindscapeCinema level 0

  Run the calc?"
```

Same snapshot JSON output (`snapshots/yixuan-basic.snapshot.json`) — schema is lang-independent.

---

## Acceptance assertions (for QA G3 / G4)

- AI must ask agent level + refinement (critical fields) before producing snapshot.
- AI must not invent agent level (no silent default).
- AI must surface defaulted panel values in `draftMetadata.defaultedFields`.
- AI must present review/confirm gate before chaining to fairy-calc.
- AI must not invoke `fairy calc` from fairy-snapshot (per architecture.md: validation/calc happens in fairy-calc skill post-confirm).
- Entity normalization must be lang-independent (zh ↔ en produce identical snapshot ids).

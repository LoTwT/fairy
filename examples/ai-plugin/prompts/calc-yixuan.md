# fixture · calc-yixuan

**Skill**: fairy-calc
**Scenario**: invoke fairy CLI on validated BattleSnapshot, parse CalcResult, emit brief NL summary.
**Lang**: zh + en mirror

This fixture demonstrates the fairy-calc skill consuming a pre-validated snapshot (from fairy-snapshot chain or directly user-provided).

---

## Variant A — chained from fairy-snapshot (zh)

### Context

`fairy-snapshot` has just produced `snapshots/yixuan-basic.snapshot.json` and presented review/confirm to user. User confirmed → AI chains to fairy-calc.

### AI behavior

1. **Lang inherited**: zh (from session).
2. **CLI preflight**:
   - Check `fairy` (or `@randomplay/cli`) availability + version ≥ `minFairyCliVersion` (per `plugin.json`).
   - If missing/old → error per `prompt-templates.md` §6.1.
3. **CLI invocation**:
   ```
   fairy calc <snapshots/yixuan-basic.snapshot.json> --view verbose --lang zh
   ```
4. **Parse CalcResult**: load CLI stdout as JSON; validate shape.
5. **Brief NL summary** (1-2 paragraphs):
   ```
   这次仪玄普通攻击一段的期望显示伤害是 7,622。
   - 非暴击: 5,954
   - 暴击: 10,718
   - 关键计算链路: baseDamageZone 10,076 × damageBonusZone 1.3 × critZone 1.28 × defenseZone 0.4545 × resistance/vulnerability/daze/special 乘区 1.0

   本次 CLI 输出没有 warnings/errors。

   数据基于 nanoka@2.8。如有版本更新请重新 fetch。如有侵权请联系作者删除。
   ```

### Expected output

- CalcResult JSON: see `expected/yixuan-basic.calc.json`.
- Brief summary text: above NL summary (in zh).

---

## Variant B — direct snapshot input (en)

### User input

User has snapshot.json from elsewhere (saved from prior session / shared by teammate), wants to run calc:

```
run fairy calc on this snapshot:

[paste snapshots/yixuan-basic.snapshot.json]
```

### AI behavior

1. **Lang detect**: en → session lang = en.
2. **Skip snapshot-builder**: input is valid snapshot JSON (passes parseBattleSnapshot precheck).
3. **CLI preflight + invocation** (same as Variant A, with `--lang en`).
4. **Brief NL summary** in en:
   ```
   Expected displayed damage for Yixuan basic attack hit 1 is 7,622.
   - Non-crit: 5,954
   - Crit: 10,718
   - Key chain: baseDamageZone 10,076 × damageBonusZone 1.3 × critZone 1.28 × defenseZone 0.4545 × resistance/vulnerability/daze/special zones at 1.0

   The CLI output has no warnings/errors for this fixture.

   Data is based on nanoka@2.8. Re-fetch the data after game patches.
   For takedown requests please contact the maintainer.
   ```

---

## Edge case — CLI not installed

### Context

User invokes fairy-calc but `fairy` CLI not available on system.

### AI behavior

Per `prompt-templates.md` §6.1, AI surfaces install instruction and stops:

```
zh:
  "你本地还没装 fairy CLI (或者版本比 0.1.2 老)。
   请运行: pnpm dlx @randomplay/cli@latest
   装好后再 ping 我，我们继续。"

en:
  "fairy CLI is not installed locally (or version is older than 0.1.2).
   Please run: pnpm dlx @randomplay/cli@latest
   Then ping me and we'll continue."
```

AI does **not** attempt to compute anything.

---

## Edge case — CLI returns error

### Context

CLI returns non-zero exit with stderr like:
```
parseBattleSnapshot: required field `team[0].panel.attack` missing
```

### AI behavior

Per `prompt-templates.md` §6.2, AI translates stderr to user-friendly message:

```
zh:
  "snapshot 校验没通过: 缺角色面板攻击力 (team[0].panel.attack 字段必填)。
   通常的原因是 snapshot 里 panel 部分不完整。
   要我帮你修一下吗? 需要你告诉我当前面板攻击力，或让我回到生成快照流程重新补字段。"
```

AI does NOT proceed with partial calc; does NOT fabricate result.

---

## Acceptance assertions (QA G4)

- AI invokes `fairy calc <snapshot> --view verbose --lang <session-lang>` (exact command shape).
- AI uses snapshot path or stdin per fairy CLI contract (TBD in TL impl).
- AI parses CLI stdout as CalcResult JSON.
- AI summary references only fields in actual CalcResult.
- CLI failure → user-friendly error message, no partial output.
- CLI not installed → install instruction surface, no calc attempt.
- Lang flag forwarded correctly (zh → `--lang zh`, en → `--lang en`).
- Disclaimer surfaced once per session (first response with live data).
- Version preflight: `minFairyCliVersion` from `plugin.json` is the gate.

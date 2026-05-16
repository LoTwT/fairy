# fixture · explain-yixuan-trace

**Skill**: fairy-explain
**Scenario**: standalone explain — user pastes a CalcResult JSON, AI walks through every trace step with sourceRef resolution.
**Lang**: zh + en mirror

This fixture demonstrates the **standalone** path of fairy-explain (no chaining from snapshot-builder / calc). The input is `expected/yixuan-basic.calc.json`.

---

## Variant A — zh dialog

### User input

```
帮我解释一下这个伤害怎么算出来的:

[paste of expected/yixuan-basic.calc.json]
```

### Expected AI behavior

1. **Lang detect**: zh → session lang = zh.
2. **Parse CalcResult**: load JSON, walk `trace` array, resolve each `sourceRef`.
3. **sourceRef resolution**:
   - `examples.ai-plugin` + `character.1371.skill.basic` → "V1.2.2 AI plugin example fixture: 仪玄普通攻击一段"
   - `buckets[?bucketId=baseDamageZone]` → "基础伤害区"
   - `buckets[?bucketId=damageBonusZone]` → "伤害加成区"
   - `buckets[?bucketId=critZone]` → "暴击期望区"
   - `buckets[?bucketId=defenseZone]` → "防御区"
   - `attackSegments[0].rawDamage` → "最终原始伤害公式"
   - `attackSegments[0].segmentDisplayDamage` → "逐段向上取整后的显示伤害"
4. **Walk trace step-by-step**: output paragraph-style explanation, each step shows multiplier + sourceRef + cumulative value.
5. **Surface warnings**: if `warnings[]` is non-empty, include every warning key/message near the relevant step. This fixture has no warnings.
6. **Disclaimer footer**: surfaced once (first response).

### Expected output

See `expected/yixuan-basic.explain.zh.md`.

### Skill boundary assertions

- AI does NOT invoke `fairy calc`.
- AI does NOT modify the input CalcResult.
- AI references only fields actually present in input JSON.
- AI does NOT fabricate trace steps not in `CalcResult.trace`.

---

## Variant B — en dialog (mirror)

### User input

```
explain how this damage was calculated:

[paste of expected/yixuan-basic.calc.json]
```

### Expected AI behavior

Identical CalcResult parse + sourceRef resolution; dialog and explanation in en.

### Expected output

See `expected/yixuan-basic.explain.en.md`.

---

## Edge case — malformed CalcResult

### User input

```
解释这个:

{ "summary": { "rawTotalDamage": 7621.12 }, "trace": "incomplete..."
```

### Expected AI behavior

1. AI attempts JSON parse → fails (incomplete JSON).
2. AI surfaces error per `prompt-templates.md` §6.4:
   ```
   AI: "你贴的内容不是有效的 fairy CalcResult JSON。常见原因:
     - 截断了 (JSON 不完整)
     - 字段被改了
     - 不是 fairy 输出

     请确认完整粘贴 `fairy calc ... --view verbose` 的完整输出。"
   ```
3. AI does NOT proceed; does NOT fabricate explanation from partial data.

### Acceptance assertion (QA G5)

- Malformed input → user-friendly error message (not raw parse error).
- No partial explanation produced.

---

## Edge case — CalcResult with warning

### User input

User pastes a CalcResult that contains `warnings[*]` (not the yixuan-basic fixture, which has no warnings).

### Expected AI behavior

- AI surfaces every warning in the explanation, near the relevant trace step where applicable.
- AI does not hide warnings even if user just asked "总伤害多少？" (per CONFIRM-? data integrity policy: warnings always shown).

### Acceptance assertion (QA G5)

- Every `warnings[*].code` and `message` from input must appear in AI output.
- Warnings displayed in user-facing copy (translated if dialog lang differs from source).

---

## Acceptance assertions consolidated (QA G5)

- Skill input contract: `CalcResult` JSON shape (per `packages/core/src/schema/calc-result.ts`).
- AI references only `CalcResult.trace[*]` / `summary.*` / `warnings[*]` / `buckets[*].contributors[*].source` fields.
- No fabrication of multiplier / step / sourceRef.
- sourceRef strings resolved to user-friendly names (per dialog lang).
- Warnings preserved.
- Disclaimer surfaced (first response per session, with `<live-version>` populated from top-level `CalcResult.sourceVersion`).
- No fairy CLI invocation.

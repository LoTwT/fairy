# vision-boundary-low-confidence

**Skill**: fairy-vision
**Source**: zzz-workshop
**Scenario**: supported source is detected, but critical numeric fields are blurry and below confidence floor.
**Lang**: zh

## User input

[zzz-workshop-low-confidence.png] 一张合成/脱敏的绝区零工坊角色面板；来源标识清楚，但关键读数模糊。

## Expected fairy-vision behavior

1. Detect `sourceDetection.sourceId === "zzz-workshop"` with supported-source confidence.
2. Mark critical fields with `perFieldConfidence: "low"`.
3. Set `shouldNotCalc === true` and `fallbackTrigger === "low-confidence"`.
4. Ask the user to confirm the concrete uncertain fields before any calculation.

## Expected output

- draftMetadata: see `expected/vision-boundary-low-confidence.draft-metadata.json`
- No confirmed BattleSnapshot
- No CalcResult

## Review/edit gate copy

```zh
截图来源看起来是绝区零工坊，但攻击力、暴击率和 6 号位主词条读数不够可靠。

请确认这三项后我再继续；在确认前不会计算伤害。
```

## Acceptance assertions

- `shouldNotCalc === true`
- `fallbackTrigger === "low-confidence"`
- The low-confidence fields are explicitly named.
- No strict snapshot or calc baseline is produced.
- User-facing copy does not leak internal orchestration wording.

# vision-boundary-ambiguous-field

**Skill**: fairy-vision
**Source**: miyoushe-record
**Scenario**: supported source is detected, but two fields have multiple plausible readings.
**Lang**: zh

## User input

[miyoushe-ambiguous-field.png] 一张合成/脱敏的米游社面板；角色区域和技能等级区域存在视觉歧义。

## Expected fairy-vision behavior

1. Detect `sourceDetection.sourceId === "miyoushe-record"`.
2. Record ambiguity candidates instead of choosing silently.
3. Set `shouldNotCalc === true` and `fallbackTrigger === "ambiguous-field"`.
4. Ask the user to choose between the concrete candidates.

## Expected output

- draftMetadata: see `expected/vision-boundary-ambiguous-field.draft-metadata.json`
- No confirmed BattleSnapshot
- No CalcResult

## Review/edit gate copy

```zh
我看到两处不确定信息：核心技等级是 07 还是 01，角色是雅还是耀嘉音。

请先确认后我再继续；我不会替你静默选择其中一个。
```

## Acceptance assertions

- `shouldNotCalc === true`
- `fallbackTrigger === "ambiguous-field"`
- Ambiguity candidates are recorded for the uncertain fields.
- No strict snapshot or calc baseline is produced.
- User-facing copy does not leak internal orchestration wording.

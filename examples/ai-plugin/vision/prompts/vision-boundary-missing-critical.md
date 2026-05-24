# vision-boundary-missing-critical

**Skill**: fairy-vision
**Source**: miyoushe-record
**Scenario**: supported source is detected, but the screenshot is cropped and misses required build fields.
**Lang**: zh

## User input

[miyoushe-missing-critical.png] 一张合成/脱敏的米游社面板；顶部和右侧被裁掉。

## Expected fairy-vision behavior

1. Detect `sourceDetection.sourceId === "miyoushe-record"`.
2. Identify missing critical fields rather than filling defaults.
3. Set `shouldNotCalc === true` and `fallbackTrigger === "missing-critical"`.
4. Ask for the exact missing fields.

## Expected output

- draftMetadata: see `expected/vision-boundary-missing-critical.draft-metadata.json`
- No confirmed BattleSnapshot
- No CalcResult

## Review/edit gate copy

```zh
这张米游社截图里，音擎名称、5 号位主词条和 6 号位主词条被裁掉了。

请补充这些字段，或发一张完整面板；在补齐前我不会推断默认值。
```

## Acceptance assertions

- `shouldNotCalc === true`
- `fallbackTrigger === "missing-critical"`
- `nextStep` asks for the exact missing fields.
- No strict snapshot or calc baseline is produced.
- User-facing copy does not leak internal orchestration wording.

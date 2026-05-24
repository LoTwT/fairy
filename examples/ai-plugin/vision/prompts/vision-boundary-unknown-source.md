# vision-boundary-unknown-source

**Skill**: fairy-vision
**Source**: unknown
**Scenario**: unsupported screenshot source; route to manual input instead of guessing.
**Lang**: zh

## User input

[unknown-source-character-card.png] 一张合成的非支持来源角色图；没有绝区零工坊或米游社布局标识。

## Expected fairy-vision behavior

1. Detect `sourceDetection.sourceId === "unknown"` with low confidence.
2. Set `shouldNotCalc === true` and `fallbackTrigger === "unsupported-source"`.
3. Ask the user for manual field entry or a clearer supported character panel screenshot.

## Expected output

- draftMetadata: see `expected/vision-boundary-unknown-source.draft-metadata.json`
- No confirmed BattleSnapshot
- No CalcResult

## Review/edit gate copy

```zh
暂时无法识别这张图来自支持的面板来源。

我不会根据这张图直接计算。请手动录入角色、音擎、驱动盘和敌人信息，或换一张清晰的角色面板截图。
```

## Acceptance assertions

- `shouldNotCalc === true`
- `fallbackTrigger === "unsupported-source"`
- `nextStep` names manual input and a supported screenshot as the safe path.
- No strict snapshot or calc baseline is produced.
- User-facing copy does not leak internal orchestration wording.

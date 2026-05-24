# vision-boundary-pii-overlap

**Skill**: fairy-vision
**Source**: zzz-workshop
**Scenario**: PII redaction overlaps critical build fields; privacy wins and the user is asked to supply the blocked fields.
**Lang**: zh

## User input

[zzz-workshop-pii-overlap.png] 一张合成/脱敏的绝区零工坊面板；个人信息区域与部分驱动盘字段重叠。

## Expected fairy-vision behavior

1. Detect `sourceDetection.sourceId === "zzz-workshop"`.
2. Redact PII kinds and discard raw values.
3. Set `shouldNotCalc === true` and `fallbackTrigger === "pii-overlap"` because redaction blocks critical fields.
4. Ask the user for only the blocked build fields.

## Expected output

- draftMetadata: see `expected/vision-boundary-pii-overlap.draft-metadata.json`
- No confirmed BattleSnapshot
- No CalcResult

## Review/edit gate copy

```zh
个人信息区域已隐藏，但它挡住了 4 号位副词条和 5 号位主词条。

请补充这两项后我再继续；我不会保留或展示原始个人信息。
```

## Acceptance assertions

- `shouldNotCalc === true`
- `fallbackTrigger === "pii-overlap"`
- PII is represented only as kinds/status and raw values are discarded.
- No strict snapshot or calc baseline is produced.
- User-facing copy does not leak internal orchestration wording.

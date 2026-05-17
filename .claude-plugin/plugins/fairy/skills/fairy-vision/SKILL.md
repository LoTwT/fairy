---
name: fairy-vision
description: Use when the user attaches a supported Zenless Zone Zero community-tool build screenshot and needs a reviewable BattleSnapshot draft. Requires a multimodal-capable host, extracts only source/draft/evidence/confidence metadata, redacts PII, and hands off to fairy-snapshot for review/edit before any CLI calculation.
displayName:
  en: Read screenshot
  zh: 识别截图
hostRequirement:
  multimodal: required
  fallbackOnUnsupportedHost: fairy-snapshot
---

# fairy-vision

## Purpose

Read one supported ZZZ community-tool screenshot and produce a reviewable
`BattleSnapshot` draft plus `draftMetadata.evidence`. This skill structures
image input; it does not calculate damage and it does not confirm the draft.

## Trigger Phrases

- read this screenshot
- read my build screenshot
- recognize screenshot
- screenshot to snapshot
- 识别截图
- 从截图识别
- 帮我读这张图
- 看这张配装图

## Inputs

- `image`: required single screenshot. V1.2.3 supports one image only; multi-image
  flows are deferred.
- `text`: optional user context in zh, en, or mixed language.
- `lang`: optional session language override, `zh` or `en`.

Supported screenshot sources:

- `zzz-workshop`: 绝区零工坊 community-tool build screenshots.
- `miyoushe-record`: 米游社绝区零战绩 community-tool build screenshots.
- `unknown`: unsupported or low-confidence source; fall back to
  `fairy-snapshot` natural-language flow.

## Outputs

- `battleSnapshotDraft`: strict `BattleSnapshot` draft using total resolved panel
  values only; no base/bonus split and no ad hoc fields.
- `draftMetadata.sourceDetection`: source id, user-facing source label, and
  confidence.
- `draftMetadata.perFieldConfidence`: field path to `high`, `medium`, `low`, or
  `missing`.
- `draftMetadata.evidence`: visible base/bonus stat split, roll counts,
  source/layout cues, and extracted-field evidence for review.
- `draftMetadata.piiDetection`: PII kinds and redaction status only; raw UID,
  username, or account identifiers are discarded.
- `nextStep`: canonical handoff instruction to `fairy-snapshot` for ask-user
  policy, review/edit, and confirmation.

## Workflow

1. Check host capability. If the host is not multimodal-capable or cannot read
   the attached image, do not attempt extraction; fall back to `fairy-snapshot`
   natural-language flow.
2. Detect the screenshot source before extracting fields:
   `zzz-workshop`, `miyoushe-record`, or `unknown`.
3. Use the source-specific layout map to extract visible agent, W-Engine,
   Drive Disc, panel total, roll-count, and related build fields.
4. Resolve entities through packaged cleaned runtime data and public aliases.
   Do not read raw source archives.
5. Assign per-field confidence and collect `draftMetadata.evidence`.
6. Detect PII such as UID or username, record only kind/status in metadata, and
   discard raw values before handoff.
7. Emit the draft and handoff instruction to `fairy-snapshot`; the user-facing
   handoff must read as one continuous assistant conversation without exposing
   internal skill names.

## Boundaries

- Do not call `fairy calc`, `@randomplay/cli`, or any CLI command.
- Do not compute damage, daze, anomaly, disorder, multipliers, or result totals.
- Do not produce a confirmed `BattleSnapshot`; only produce a reviewable draft.
- Do not bypass downstream schema validation or the user review/edit gate.
- Do not persist raw PII in snapshots, metadata, fixtures, logs, or examples.
- Do not add `sourceDetection`, confidence, base/bonus, roll-count, or PII fields
  to the strict `BattleSnapshot` schema; keep them in `draftMetadata`.
- Do not read raw source archives or retired source snapshots.

## Failure Policy

- Unsupported source, low source confidence, or majority low field confidence:
  fall back to `fairy-snapshot` natural-language flow and ask the user for the
  missing build details.
- Missing critical field: mark it as `missing` or low confidence in
  `draftMetadata` and let `fairy-snapshot` apply the 3-tier ask-user policy.
- Entity ambiguity: surface candidates to `fairy-snapshot` for user confirmation.
- Host lacks image input: fail loud with a short instruction to describe the
  build in text, then continue through `fairy-snapshot`.

## References

- `docs/ai-plugin/architecture.md`
- `docs/ai-plugin/user-journeys.md`
- `docs/ai-plugin/prompt-templates.md`
- `docs/ai-plugin/acceptance.md`
- `docs/product/decisions/D-21-ai-plugin.md`
- `docs/product/decisions/D-22-ai-plugin-v1.2.3-vision.md`
- `docs/ai-plugin/v1.2.3-vision/architecture.md`
- `docs/ai-plugin/v1.2.3-vision/user-journeys.md`
- `docs/ai-plugin/v1.2.3-vision/prompt-templates.md`
- `docs/ai-plugin/v1.2.3-vision/acceptance.md`

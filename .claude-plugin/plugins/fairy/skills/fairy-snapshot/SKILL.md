---
name: fairy-snapshot
description: Use when the user describes a Zenless Zone Zero build in natural language or provides a partial BattleSnapshot and needs a reviewable fairy BattleSnapshot draft. Ask for missing critical fields, keep default and unknown notes in draft metadata, and hand off to fairy-calc only after user review/confirm.
displayName:
  en: Build snapshot
  zh: 生成快照
---

# fairy-snapshot

## Purpose

Turn a user build description into a reviewable `BattleSnapshot` draft for
fairy. This skill structures input; it does not calculate damage.

## Trigger Phrases

- build snapshot
- build a snapshot
- make snapshot
- compose snapshot
- 组配装
- 生成快照
- 我想算
- 帮我算
- 怎么算

## Inputs

- `userBuildDescription`: natural language in zh, en, or mixed language.
- `partialSnapshot`: optional `BattleSnapshot` draft, including V1.2.3
  `fairy-vision` output.
- `lang`: optional session language override, `zh` or `en`.

## Outputs

- `snapshot`: reviewable `BattleSnapshot` draft.
- `draftMetadata.defaultedFields`: optional defaults or omissions surfaced to
  the user; never written as ad hoc `BattleSnapshot` fields.
- `draftMetadata.unknownFields`: unknown fields surfaced to the user; never
  written as ad hoc `BattleSnapshot` fields.
- `questions`: missing critical fields grouped for the ask-user dialog.

## Workflow

1. Detect dialog language using the session rule from
   `docs/ai-plugin/user-journeys.md`.
2. Normalize user-facing entity aliases through packaged cleaned data and
   public aliases. Do not read raw source archives.
3. Classify missing fields with the 3-tier policy:
   critical, optional, unknown.
4. Ask for critical fields before handoff.
5. Present the draft snapshot and draft metadata for user review/confirm.
6. Hand off confirmed snapshots to `fairy-calc` for CLI validation and
   calculation.

## Boundaries

- Do not compute damage, daze, anomaly, disorder, or multipliers.
- Do not call `fairy calc` directly from this skill.
- Do not invent critical values such as agent level, W-Engine, Drive Disc set,
  enemy, or attack segment.
- Do not add fields or string markers that violate the strict
  `BattleSnapshot` schema.
- Do not read raw source archives or retired source snapshots.

## Failure Policy

- If a critical field is missing, ask the user and do not hand off to
  `fairy-calc`.
- If an entity is ambiguous, present candidates with stable IDs and ask the
  user to choose.
- If no schema-valid reduced path exists, fail loud and explain what field is
  needed.

## References

- `docs/ai-plugin/architecture.md`
- `docs/ai-plugin/user-journeys.md`
- `docs/ai-plugin/prompt-templates.md`
- `docs/ai-plugin/acceptance.md`
- `docs/product/decisions/D-21-ai-plugin.md`
- `docs/product/decisions/D-22-ai-plugin-v1.2.3-vision.md`

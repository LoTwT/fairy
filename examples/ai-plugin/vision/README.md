# fairy AI plugin · V1.2.3 vision examples & fixtures

Concrete examples for the V1.2.3 `fairy-vision` skill: vision prompts, expected `BattleSnapshot` drafts, expected `draftMetadata.evidence`, and zh user-facing review/edit gate copy.

These files are dual-purpose:
- **Reference**: agent / human readers see the contract by example, per source.
- **Fixture**: QA V-G1..V-G5 + K4 chain-invisibility scans (per `docs/ai-plugin/v1.2.3-vision/acceptance.md`) consume these as smoke-test golden inputs.

## Structure

```
examples/ai-plugin/vision/
  README.md                           # this file
  prompts/
    vision-workshop-yixuan.md         # fairy-vision: 绝区零工坊 happy-path (zh)
    vision-miyoushe-yixuan.md         # fairy-vision: 米游社 happy-path (zh)
  snapshots/
    yixuan-workshop.snapshot.json     # strict BattleSnapshot draft from workshop screenshot
    yixuan-miyoushe.snapshot.json     # strict BattleSnapshot draft from miyoushe screenshot
  expected/
    yixuan-workshop.draft-metadata.json   # draftMetadata: sourceDetection / piiDetection status / evidence
    yixuan-miyoushe.draft-metadata.json   # draftMetadata for miyoushe variant
```

## Scope (P2 starter — happy-path coverage)

V1.2.3 P2 ships the **happy-path** cross-source pair for 仪玄 to demonstrate:

| Property | Workshop variant | Miyoushe variant |
|---|---|---|
| Source | 绝区零工坊 (WeChat mini-app) | 米游社 (Mihoyo community) |
| Agent | 仪玄 Lv60 (mindscape 2) | 仪玄 Lv60 (mindscape 2) |
| Weapon | 青溟笼舍 R1 | 青溟笼舍 R1 |
| Drive Disc | 云岿如我 4pc + 折枝剑歌 2pc | 云岿如我 4pc + 折枝剑歌 2pc |
| Panel | source-displayed; differences documented | source-displayed; differences documented |

**Cross-source identity contract**: V-G1 source detection routes each screenshot through its source-specific layout map. Both fixtures yield the same canonical **identity + build composition** (agent `1371`, weapon `14137` R1, drive disc setIds `33100` + `32700`, slot layout, mindscape level 2). Source-displayed derived stats intentionally differ: 米游社 surfaces a `corePassive` skill slot that 工坊 does not show; both variants include `panel.etherDamageBonus: 0.3` (matching the slot-5 main stat), but `energyRegen` is rendered with different unit conventions (`1.2` 工坊 vs `2.0` 米游社) and `sheerForce` differs by 1 unit between sources from display rounding. Each variant's strict `BattleSnapshot` captures what the source actually displays, with per-source differences documented in `draftMetadata.evidence.crossSourceNotes`. The vision pipeline is source-agnostic at the **identity** boundary; it does not falsify a single canonical numeric panel.

Future P2.x batches will add:
- Additional agents (耀佳音 / 琉音 / 星见雅) per source — sample images already provided by lo-user
- Partial-extraction fixtures (per `docs/ai-plugin/v1.2.3-vision/user-journeys.md` §5)
- Visual ambiguity fixtures (per §6 — e.g., 米游社 "07" skill slot)
- Source-unknown / NL fallback fixtures (per §3 + §7)
- Low-confidence majority fixtures (per §7)
- PII redaction edge cases (per §8 + V-G4)

## How to read each fixture file

Every `prompts/vision-*.md` follows the same shape:

```
# <fixture name>

**Skill**: fairy-vision
**Source**: zzz-workshop | miyoushe-record
**Scenario**: <one-line scenario summary>
**Lang**: zh

## User input
[image attachment description] + optional NL context

## Expected fairy-vision behavior
1. <ordered steps the skill follows>
2. <source detection + per-source field map application>

## Expected output
- BattleSnapshot draft: see `snapshots/<fixture>.snapshot.json`
- draftMetadata: see `expected/<fixture>.draft-metadata.json`
- Review/edit gate copy (zh): inline below

## Review/edit gate copy
<zh user-facing copy per prompt-templates.md §5>

## Acceptance assertions
QA V-G1 / V-G2 / V-G3 / V-G4 / V-G5 + K4 invisibility — specific per-fixture checks.
```

## PII redaction policy

Per `docs/ai-plugin/v1.2.3-vision/user-journeys.md` §8 + acceptance V-G4, all public fixtures redact PII:

- **UID** in source screenshots: any UID seen during extraction is replaced with `REDACTED_UID` placeholder in fixture display copy and reduced to `piiDetection.kinds: ["uid"]` + `piiDetection.redactionStatus: "redacted"` in `draftMetadata`. Actual digits never reach committed fixture JSON.
- **Username**: similarly redacted. Even when visible in source screenshot, treated as `piiDetection.kinds: ["username"]` only.
- **Screenshot files themselves**: not committed to repo (avoid raw PII in version control). Fixture references screenshot via canonical placeholder filename (e.g., `[zzz-workshop-yixuan-build.png]`); real images stay outside public fixture tree per acceptance V-G4.

## Cross-references

- V1.2.3 skill spec: `.claude-plugin/plugins/fairy/skills/fairy-vision/SKILL.md`
- V1.2.3 user journeys: `docs/ai-plugin/v1.2.3-vision/user-journeys.md`
- V1.2.3 prompt templates (canonical EN spec): `docs/ai-plugin/v1.2.3-vision/prompt-templates.md`
- V1.2.3 acceptance gates: `docs/ai-plugin/v1.2.3-vision/acceptance.md`
- V1.2.2 NL fixtures (for parity reference): `examples/ai-plugin/prompts/build-yixuan-basic.md` etc.
- D-22 product decision: `docs/product/decisions/D-22-ai-plugin-v1.2.3-vision.md`

# fairy AI plugin · Examples & fixtures

Concrete examples for the V1.2.2 AI plugin: golden NL prompts, expected snapshots, expected CalcResult JSON, expected explain outputs, and entity normalization mappings.

These files are dual-purpose:
- **Reference**: agent / human readers see the contract by example.
- **Fixture**: QA G4 / G5 (per `docs/ai-plugin/acceptance.md`) consume the prompts, snapshots, and expected outputs as smoke-test golden inputs.

## Structure

```
examples/ai-plugin/
  README.md                      # this file
  entity-normalization.md        # zh ↔ en ↔ canonical id mapping fixtures
  prompts/                       # golden NL prompts (one scenario per file)
    build-yixuan-basic.md        # fairy-snapshot: minimal happy path (zh + en mirror)
    build-yixuan-full.md         # fairy-snapshot: all critical filled (zh)
    build-anby-ambiguous.md      # fairy-snapshot: entity ambiguity → disambiguation
    build-yixuan-unknown.md      # fairy-snapshot: critical-field unknown handling
    calc-yixuan.md               # fairy-calc: invoke CLI on validated snapshot
    explain-yixuan-trace.md      # fairy-explain: walk a CalcResult standalone
  snapshots/                     # golden BattleSnapshot JSON (post fairy-snapshot output)
    yixuan-basic.snapshot.json
    yixuan-full.snapshot.json
  expected/                      # golden expected outputs from downstream skills
    yixuan-basic.draft-metadata.json
    yixuan-basic.calc.json       # fairy-calc CLI output for yixuan-basic snapshot
    yixuan-basic.explain.zh.md   # fairy-explain output (Chinese)
    yixuan-basic.explain.en.md   # fairy-explain output (English)
```

## How to read each prompt file

Every `prompts/*.md` follows the same shape:

```
# <fixture name>

**Skill**: fairy-snapshot | fairy-calc | fairy-explain
**Scenario**: <one-line scenario summary>
**Lang**: zh | en | mirror

## User input
<NL prompt or JSON paste>

## Expected AI behavior
1. <ordered steps the AI must follow>
2. <ask-user dialog turns, with expected user reply>

## Expected output
<inline output, or pointer to snapshots/ / expected/ file>
```

## How to add a new example

1. Pick a unique fixture name in kebab-case (e.g., `build-burnice-full.md`).
2. Drop the prompt under `prompts/`.
3. If the scenario produces a snapshot or CalcResult, drop the JSON under `snapshots/` or `expected/`.
4. Update `entity-normalization.md` if you introduce new agents / W-Engines / Drive Disc sets.
5. QA G4 / G5 fixture loader picks up the new file automatically (see `acceptance.md` §G4).

## Coverage matrix (V1.2.2 MVP)

| Skill | Scenario | Lang | File |
|---|---|---|---|
| fairy-snapshot | basic happy path | zh + en mirror | `prompts/build-yixuan-basic.md` |
| fairy-snapshot | full critical filled | zh | `prompts/build-yixuan-full.md` |
| fairy-snapshot | entity ambiguity | zh | `prompts/build-anby-ambiguous.md` |
| fairy-snapshot | critical-field unknown | zh | `prompts/build-yixuan-unknown.md` |
| fairy-calc | invoke CLI on validated snapshot | zh + en | `prompts/calc-yixuan.md` |
| fairy-explain | standalone explain | zh + en | `prompts/explain-yixuan-trace.md` |

Per `acceptance.md` G4 fixture strategy, QA may add more EN-canonical scenarios for skill-spec smoke and additional zh/en user-facing smokes. UX-owned MVP set covers the critical paths above.

## Schema notes

- `snapshots/*.snapshot.json` files are strict `BattleSnapshot` JSON and must pass `parseBattleSnapshot`.
- Draft-only reporting such as `defaultedFields`, `unknownFields`, warnings, and ask-user turns lives in `expected/*.draft-metadata.json`, never inside the strict snapshot.
- `expected/yixuan-basic.calc.json` is generated from `fairy calc examples/ai-plugin/snapshots/yixuan-basic.snapshot.json --view verbose --lang zh --pretty` and should be refreshed when the core `CalcResult` schema changes.

## Cross-references

- Prompt templates spec: `docs/ai-plugin/prompt-templates.md`
- User journeys: `docs/ai-plugin/user-journeys.md`
- Acceptance gates: `docs/ai-plugin/acceptance.md`
- Architecture: `docs/ai-plugin/architecture.md`
- Decision lock: `docs/product/decisions/D-21-ai-plugin.md`

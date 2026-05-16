# AI Plugin V1.2.2 Architecture

Status: proposed for V1.2.2 plan review
Owner: TechLead
Reviewers: Product, UX, QA, lo-user
Scope: Claude Code Plugin and Codex compatibility plan for Fairy AI skills

## Goal

Build a thin AI plugin layer that lets a ZZZ player describe a build, produce a
reviewable `BattleSnapshot`, run the trusted Fairy CLI, and explain the trusted
CLI output.

The core rule is:

> AI structures inputs and explains outputs. Fairy CLI performs all
> calculations.

The AI plugin must not reimplement formulas, read raw source snapshots, or treat
model reasoning as calculation evidence.

## Locked Decisions

| Item | Decision |
| --- | --- |
| AI.0 | V1.2.2 is a plan PR followed by an implementation PR; plugin files stay inside this repo. |
| AI.1 | V1.2.2 supports Claude Code Plugin and Codex only; Cursor is deferred. |
| AI.2 | `fairy-compare` is deferred to a follow-up plugin patch; CLI compare may exist independently first. |
| U1 | Primary persona is a ZZZ player using natural language. |
| U2 | MVP has three internal skills and two user-facing entries. |
| U3 | i18n uses a tri-layer contract: English canonical layer, zh/en user-facing layer, and zh/en data/query layer where source data supports it. |
| AI.3 | Screenshot/OCR is deferred to V1.2.3 and must enter through the same snapshot draft contract. |
| AI.4 | V1.2.2 ships MVP only; marketplace/package distribution and extra skills are later patches. |

## Non-Goals

V1.2.2 does not include:

- a standalone npm package for the plugin;
- Cursor implementation beyond documented deferral;
- `fairy-compare` skill behavior or direct `fairy compare` binding in the AI
  plugin;
- screenshot recognition, OCR, or vision model integration;
- a new calculation API, formula implementation, or raw source reader;
- a new `fairy calc --preflight` flag.

Snapshot validation uses the existing CLI path:

```bash
fairy calc <snapshot.json> --view verbose --lang <zh|en>
```

If a schema-only preflight becomes useful, add it as a separate CLI feature
before any skill depends on it.

## Target Layout

```text
.claude-plugin/
  plugins/
    fairy/
      plugin.json
      skills/
        fairy-snapshot/
          SKILL.md
        fairy-calc/
          SKILL.md
        fairy-explain/
          SKILL.md

.codex/
  README.md

docs/
  ai-plugin/
    architecture.md
    user-journeys.md
    prompt-templates.md
    acceptance.md

examples/
  ai-plugin/
    prompts/
    snapshots/
    expected/
```

`.claude-plugin/plugins/fairy/` is the primary implementation target.
`.codex/README.md` documents how Codex should use the same skill contract. It is
not a second full implementation in V1.2.2.

## Component Model

```text
User text / files
      |
      v
Claude Code Plugin / Codex instructions
      |
      +--------------------+
      | skill discovery    |
      | plugin metadata    |
      +--------------------+
      |
      v
Skills
  fairy-snapshot  -> BattleSnapshot draft -> review/confirm handoff
  fairy-calc      -> CLI validation/calculation -> CalcResult JSON + brief summary
  fairy-explain   -> existing CalcResult  -> explanation over actual fields
      |
      v
@randomplay/cli
      |
      v
@randomplay/core + @randomplay/data
```

The plugin may orchestrate skills in one conversation, but each skill keeps a
separate contract so fixtures and QA gates can validate behavior independently.

## Skills

### `fairy-snapshot`

Display labels:

- zh: `生成快照`
- en: `Build Snapshot`

Purpose: convert natural language or a partial snapshot into a reviewable
`BattleSnapshot` draft.

Inputs:

- user build description in zh, en, or mixed language;
- optional partial `BattleSnapshot`;
- optional language override.

Outputs:

- candidate `BattleSnapshot` JSON;
- missing-field questions grouped by the field-tier policy;
- draft metadata for optional defaults/omissions and unknowns;
- review/confirm handoff state for `fairy-calc`.

Rules:

- map user-facing aliases to canonical IDs through packaged cleaned data and
  published aliases, not raw source files;
- ask for critical missing fields before calculation;
- allow optional fields to remain omitted or unknown only when the existing
  strict snapshot schema and calculation path can handle the omission;
- keep default/unknown notes outside `BattleSnapshot` unless the schema already
  defines a supported field for that information;
- do not invent key values such as level, W-Engine, Drive Disc set, enemy, or
  attack segment;
- do not calculate damage.

### `fairy-calc`

Display labels:

- zh: `计算伤害`
- en: `Calculate Damage`

Purpose: run a trusted Fairy calculation for a snapshot and summarize the
trusted result.

Inputs:

- valid `BattleSnapshot` JSON;
- optional `--view` and language preference.

Outputs:

- original `CalcResult` JSON from the CLI;
- short natural-language summary based only on the returned JSON;
- CLI stderr/error explanation when the command fails.

Rules:

- run CLI availability and version preflight before calculation;
- call `fairy calc <snapshot> --view verbose --lang <lang>` for validation and
  calculation;
- forward user language preference to CLI `--lang`;
- never change `CalcResult` values;
- never continue with a fabricated result after CLI failure.

### `fairy-explain`

Display labels:

- zh: `解释结果`
- en: `Explain Result`

Purpose: explain an existing `CalcResult` without rerunning the calculation.

Inputs:

- existing `CalcResult` JSON, pasted by the user or referenced as a file;
- optional question about a specific warning, source, or trace section.

Outputs:

- explanation of summary lanes, warnings, trace entries, modifiers, and
  sourceRefs that actually exist in the JSON;
- data source and disclaimer copy where relevant.

Rules:

- do not run `fairy calc` unless the user explicitly switches to the calc flow
  and provides a snapshot;
- do not infer multipliers or sourceRefs from natural language;
- do not describe trace fields that are absent;
- support trigger aliases such as `trace`, `trace breakdown`, and `解释 trace`,
  while keeping the canonical skill name `fairy-explain`.

## Skill Orchestration

V1.2.2 has two user-facing entries:

| Entry | Internal skills | User-facing behavior |
| --- | --- | --- |
| Build and calculate | `fairy-snapshot` -> `fairy-calc` | User describes a build, AI drafts a snapshot, asks for critical fields, asks for review/confirm, then `fairy-calc` validates with CLI and summarizes the result. |
| Explain existing result | `fairy-explain` | User pastes or references a `CalcResult`; AI explains the trusted output without recalculation. |

The first entry may be autonomous inside one conversation, but the snapshot draft
must be reviewable. Critical uncertainty blocks handoff to `fairy-calc` until
the user answers or explicitly accepts a reduced path that the CLI can validate.

## Language Contract

V1.2.2 uses three language layers.

| Layer | Language | Examples |
| --- | --- | --- |
| Canonical | English only | directory names, skill names, `plugin.json` keys, `SKILL.md` metadata, schema fields, commands, architecture and acceptance docs |
| User-facing | zh/en | ask-user dialog, error recovery, explanations, onboarding, disclaimers |
| Data/query | zh/en where source supports it | aliases, entity normalization, user natural-language input, CLI `--lang` forwarding |

Default language selection:

1. explicit override wins (`use English`, `用英文回答`, `/lang en`, future config);
2. otherwise auto-detect from the user's latest relevant input;
3. for mixed input, prefer the dominant conversation language and default to zh
   if ambiguous;
4. entity language does not determine dialog language. For example, a Chinese
   message mentioning `Yixuan` should still receive Chinese output.

## CLI Binding

Skills call the CLI instead of importing internal modules. The implementation
should prefer the user's installed `fairy` binary when available and compatible.
If no compatible binary is available, the skill must fail loud with installation
guidance such as:

```bash
pnpm dlx @randomplay/cli@latest --help
pnpm dlx @randomplay/cli@latest calc <snapshot.json> --view verbose --lang zh
```

The plugin contract declares a minimum CLI version. V1.2.2 should start at
`@randomplay/cli >= 0.1.2`, because V0.1.2 is the first release after data
ownership cleanup and package payload stabilization.

The implementation must not:

- read `packages/data/source/**`;
- import unpublished package internals;
- rely on workspace-only paths for normal user flows;
- hide CLI version mismatch or schema parse failures.

## Discovery Metadata

`plugin.json` should declare:

- plugin name and version;
- supported tool surfaces (`claude-code`, `codex-docs`);
- minimum Fairy CLI version;
- canonical skills and their display labels;
- documentation entry points.

Each `SKILL.md` should declare:

- canonical English name;
- zh/en display labels;
- short description;
- trigger phrases and aliases;
- accepted inputs;
- outputs;
- failure policy;
- whether the skill may call the CLI.

The implementation PR should include a verifier that checks plugin tree shape,
metadata presence, skill name uniqueness, trigger alias collisions, and doc links.

## Data And Source Boundaries

The plugin can use packaged cleaned data and public package exports for
normalization. It cannot use raw source archives or source-registry internals as
runtime input.

Allowed inputs:

- `@randomplay/data` cleaned runtime data and exported aliases;
- user-authored `BattleSnapshot`;
- CLI-produced `CalcResult`;
- examples under `examples/ai-plugin/`.

Disallowed inputs:

- `packages/data/source/**`;
- hidden source manifests;
- historical retired Excel, Mihoyo, or buhflipexplode raw archives;
- model-generated formula constants.

## Privacy And External Models

V1.2.2 is text-only. The plugin should treat snapshots, user descriptions, and
calculation outputs as user-provided local context. If a host tool sends prompts
to an external model, that is the host tool's normal behavior and should be
documented in user-facing onboarding.

V1.2.2 does not add new network calls beyond package installation commands the
user explicitly runs.

## V1.2.3 Screenshot Forward Contract

Screenshot recognition is deferred. The future V1.2.3 pipeline must still enter
through the same snapshot contract:

```text
screenshot
  -> vision/OCR extraction
  -> BattleSnapshot draft
  -> user review/edit
  -> fairy calc validation
  -> result/explanation
```

The screenshot path must not introduce a parallel snapshot schema. Low
confidence or failed extraction should fall back to the `fairy-snapshot` natural
language dialog.

## Release And Verification Plan

Plan PR deliverables:

- `docs/ai-plugin/architecture.md` owned by TechLead;
- `docs/ai-plugin/user-journeys.md` and
  `docs/ai-plugin/prompt-templates.md` owned by UX;
- `docs/ai-plugin/acceptance.md` owned by QA;
- Product decision log owned by Product.

Implementation PR deliverables:

- Claude Code plugin skeleton;
- Codex usage docs;
- three skills;
- metadata verifier;
- 3-5 prompt/snapshot/expected fixtures;
- smoke tests for discovery, CLI binding, snapshot validation, calc output, and
  explanation output.

Verification should include:

- `git diff --check`;
- `pnpm check`;
- `pnpm build`;
- `pnpm test`;
- plugin metadata verifier;
- fixture smoke for zh and en user-facing output;
- CLI availability/version mismatch negative tests.

# AI Plugin V1.2.3 Architecture

Status: implementation baseline after V1.2.3 vision plan approval
Owner: TechLead
Reviewers: Product, UX, QA, lo-user
Scope: Claude Code Plugin and Codex compatibility plan for Fairy AI skills

## Goal

Build a thin AI plugin layer that lets a ZZZ player read a supported
community-tool screenshot or describe a build, produce a reviewable
`BattleSnapshot`, run the trusted Fairy CLI, and explain the trusted CLI output.

The core rule is:

> AI structures inputs and explains outputs. Fairy CLI performs all
> calculations.

The AI plugin must not reimplement formulas, read raw source snapshots, or treat
model reasoning as calculation evidence.

## Locked Decisions

| Item | Decision |
| --- | --- |
| AI.0 | AI plugin files stay inside this repo; no standalone plugin package is shipped in V1.2.3. |
| AI.1 | V1.2.3 supports Claude Code Plugin and Codex only; Cursor is deferred. |
| AI.2 | `fairy-compare` is deferred to a follow-up plugin patch; CLI compare may exist independently first. |
| U1 | Primary persona is a ZZZ player using natural language. |
| U2 | V1.2.3 has four approved internal skills and three user-facing entries. |
| U3 | i18n uses a tri-layer contract: English canonical layer, zh/en user-facing layer, and zh/en data/query layer where source data supports it. |
| AI.3 | V1.2.3 adds supported community-tool screenshot input through `fairy-vision`; OCR, in-game screenshots, and multi-image flows remain deferred. |
| AI.4 | V1.2.3 ships MVP vision support only; marketplace/package distribution and extra skills are later patches. |
| D22.K1 | `fairy-vision` is a separate approved skill; the approved set is `fairy-vision`, `fairy-snapshot`, `fairy-calc`, `fairy-explain`. |
| D22.K2 | `fairy-vision` emits a draft and evidence only; it does not call the CLI, calculate, bypass schema validation, or persist raw PII. |
| D22.K4 | Cross-skill handoff is invisible to users; user-facing copy must not expose internal skill names or orchestration phrasing. |
| D22.K5 | `fairy-vision` requires a multimodal-capable host and falls back to the natural-language path when image input is unavailable. |

## Non-Goals

V1.2.3 does not include:

- a standalone npm package for the plugin;
- Cursor implementation beyond documented deferral;
- `fairy-compare` skill behavior or direct `fairy compare` binding in the AI
  plugin;
- in-game screenshot recognition, OCR fallback, or multi-image vision flows;
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
        fairy-vision/
          SKILL.md
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
not a second full implementation in V1.2.3.

## Component Model

```text
User text / files / supported screenshot
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
  fairy-vision    -> BattleSnapshot draft + draftMetadata.evidence -> review handoff
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

### `fairy-vision`

Display labels:

- zh: `识别截图`
- en: `Read Screenshot`

Purpose: read one supported community-tool screenshot and produce a reviewable
`BattleSnapshot` draft plus `draftMetadata.evidence`.

Inputs:

- one image attachment from a multimodal-capable host;
- optional user text for context not visible in the screenshot;
- optional language override.

Outputs:

- candidate `BattleSnapshot` draft using total resolved panel values only;
- `draftMetadata.sourceDetection` with `zzz-workshop`, `miyoushe-record`, or
  `unknown`;
- `draftMetadata.perFieldConfidence` and `draftMetadata.evidence`;
- `draftMetadata.piiDetection` with kind/status only, never raw UID or username;
- handoff instruction to `fairy-snapshot` for review/edit and ask-user policy.

Rules:

- declare the multimodal host requirement in skill metadata;
- detect the source before field extraction;
- use source-specific layout maps for 绝区零工坊 and 米游社 screenshots;
- resolve entities through packaged cleaned data and public aliases, not raw
  source files;
- keep source detection, base/bonus split, roll counts, confidence, and PII
  status in `draftMetadata`, not in strict `BattleSnapshot`;
- do not call the CLI, calculate, explain, compare builds, or produce a
  confirmed snapshot;
- if the host cannot read images, source confidence is low, or source is
  unsupported, fall back to `fairy-snapshot` natural-language flow.

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

V1.2.3 has three user-facing entries:

| Entry | Internal skills | User-facing behavior |
| --- | --- | --- |
| Read screenshot, then calculate | `fairy-vision` -> `fairy-snapshot` -> `fairy-calc` | User attaches one supported community-tool screenshot, AI extracts a draft and evidence, asks for review/edit or missing critical fields, then `fairy-calc` validates with CLI and summarizes the result. |
| Build and calculate | `fairy-snapshot` -> `fairy-calc` | User describes a build, AI drafts a snapshot, asks for critical fields, asks for review/confirm, then `fairy-calc` validates with CLI and summarizes the result. |
| Explain existing result | `fairy-explain` | User pastes or references a `CalcResult`; AI explains the trusted output without recalculation. |

The first entry may be autonomous inside one conversation, but the snapshot draft
must be reviewable. Critical uncertainty blocks handoff to `fairy-calc` until
the user answers or explicitly accepts a reduced path that the CLI can validate.

The `fairy-vision` chain is a prompt contract, not a runtime orchestration
layer. The skill emits `{ battleSnapshotDraft, draftMetadata, nextStep }`; the
host then presents the review/edit gate and continues the existing
`fairy-snapshot` -> `fairy-calc` flow. User-facing copy must not say
"invoking", "transferring to", "handing off to", or expose skill names.

## Language Contract

V1.2.3 uses three language layers.

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

The plugin contract declares a minimum CLI version. V1.2.3 keeps
`@randomplay/cli >= 0.1.2` for this skeleton because `fairy-vision` does not add
new CLI behavior; later harness or release-prep patches may raise it if a new
CLI capability becomes required.

The implementation must not:

- read `packages/data/source/**`;
- import unpublished package internals;
- rely on workspace-only paths for normal user flows;
- hide CLI version mismatch or schema parse failures.

## Discovery Metadata

`plugin.json` should declare:

- plugin name and version;
- supported tool surfaces (`claude-code`, `codex`);
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

The plugin should treat screenshots, snapshots, user descriptions, and
calculation outputs as user-provided local context. If a host tool sends prompts
or images to an external model, that is the host tool's normal behavior and
should be documented in user-facing onboarding.

V1.2.3 does not add new network calls beyond package installation commands the
user explicitly runs. `fairy-vision` records PII detection/redaction status only
and discards raw account identifiers before any artifact handoff.

## V1.2.3 Screenshot Contract

Supported community-tool screenshot recognition enters through the same snapshot
draft contract:

```text
screenshot
  -> fairy-vision extraction
  -> BattleSnapshot draft
  -> draftMetadata.evidence
  -> user review/edit
  -> fairy calc validation
  -> result/explanation
```

The screenshot path must not introduce a parallel snapshot schema. Low
confidence, failed extraction, unsupported sources, or unavailable multimodal
host capability fall back to the `fairy-snapshot` natural-language dialog.

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
- four skills;
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

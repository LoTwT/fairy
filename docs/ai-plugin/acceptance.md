# AI Plugin Acceptance Gates

Status: V1.2.2 plan draft
Owner: @QA
Reviewers: @Product, @TechLead, @UX, @lo-user
Related docs: `docs/ai-plugin/architecture.md`, `docs/ai-plugin/user-journeys.md`, `docs/ai-plugin/prompt-templates.md`, Product AI plugin decision log

This document defines the QA acceptance gates for the V1.2.2 Fairy AI plugin MVP.
It is intentionally implementation-facing: the later implementation PR is only
shippable when these gates are executable, documented, and passing.

## Scope

V1.2.2 covers:

- Claude Code plugin as the primary implementation.
- Codex support through repository docs or a thin compatibility shim.
- Three canonical skills:
  - `fairy-snapshot` / display label `生成快照`
  - `fairy-calc` / display label `计算伤害`
  - `fairy-explain` / display label `解释结果`
- Two user entries:
  - user describes a build, the agent chains `fairy-snapshot` then `fairy-calc`;
  - user provides an existing `CalcResult`, the agent invokes `fairy-explain`.
- The tri-layer i18n contract:
  - canonical plugin/spec layer is English only;
  - user-facing copy supports zh/en;
  - data/query normalization supports zh/en where current `@randomplay/data` source data supports it.

Out of scope for V1.2.2:

- `fairy-compare`; the AI plugin compare workflow remains deferred even if the
  CLI `fairy compare` command exists independently.
- Screenshot/OCR/vision ingestion; V1.2.2 may document the V1.2.3 interface only.
- Cursor parity implementation.
- A standalone npm plugin package or marketplace distribution.

## Non-Negotiable QA Principle

The AI plugin may structure input and explain trusted output, but calculation is
owned by Fairy:

> AI structures and explains. `fairy` CLI calculates.

Any path that lets the model invent damage, multipliers, source refs, or trace
steps is a release blocker.

## Fixture Strategy

V1.2.2 uses three fixture layers. Do not mirror every fixture in every language;
instead, test the language boundary at the layer where it matters.

| Fixture layer | Purpose | Language coverage |
|---|---|---|
| Skill/spec/discovery fixtures | Validate plugin metadata, skill names, triggers, docs links, supported tool declarations, and version contracts. | English canonical only. |
| Entity normalization fixtures | Validate user text can map to canonical Fairy IDs and aliases. | At least 2-3 zh-to-canonical and 2-3 en-to-canonical examples. |
| User-facing output fixtures | Validate ask-user dialog, error copy, calc summary, explain output, disclaimer, and lang forwarding. | At least 1-2 zh and 1-2 en smokes. |

Calculation baselines are language-independent and must be asserted against the
CLI JSON, not translated prose.

## Gate Matrix

| Gate | Name | MVP status | Owner evidence |
|---|---|---|---|
| G1 | Skill discovery and metadata | Required | Plugin tree, metadata verifier, discovery smoke |
| G2 | CLI binding and no-model-calculation | Required | CLI preflight, command invocation smoke, forbidden-pattern scan |
| G3 | Snapshot generation and validation | Required | NL-to-`BattleSnapshot` fixtures, ask-user fixtures, calc validation |
| G4 | Calc correctness | Required | Golden prompt -> snapshot -> CLI JSON baseline |
| G5 | Explain correctness | Required | `CalcResult` -> prose fixture, no invented trace/sourceRef |
| G6 | Compare workflow | Deferred | Explicitly documented as out of scope until a follow-up AI plugin compare scope is approved |
| G7 | Version sync | Required | `minFairyCliVersion` and mismatch/fail-loud tests |
| G8 | Privacy and local-data boundary | Required | Docs + scan for network/OCR/source reads outside scope |
| G9 | Distribution smoke | Required | Clean checkout/install discovery + skill smoke |
| G10 | Docs and onboarding | Required | Minimal install/use examples and bilingual user-facing samples |

## G1: Skill Discovery and Metadata

The implementation PR must provide a discoverable Claude Code plugin tree:

```text
.claude-plugin/plugins/fairy/
  plugin.json
  skills/
    fairy-snapshot/SKILL.md
    fairy-calc/SKILL.md
    fairy-explain/SKILL.md
```

Codex support must exist as repository documentation or a thin shim under
`.codex/`. Cursor files must not be required for V1.2.2 acceptance.

Required `plugin.json` evidence:

- stable `name` for the plugin;
- plugin `version`;
- `minFairyCliVersion` with a lower bound no earlier than the release that
  ships this MVP;
- `supportedTools` containing Claude Code and Codex only;
- canonical English metadata;
- docs links to architecture, user journeys, prompt templates, and acceptance.

Required per-skill evidence:

- canonical skill name: `fairy-snapshot`, `fairy-calc`, `fairy-explain`;
- zh display label: `生成快照`, `计算伤害`, `解释结果`;
- English canonical description;
- trigger phrases, including zh/en user phrases;
- inputs and outputs;
- failure policy;
- CLI binding policy where applicable.

Acceptance checks:

- metadata verifier fails if required keys are missing;
- skill names are unique and match directory names;
- trigger phrases do not conflict in a way that routes the same prompt to the
  wrong skill without a deterministic priority;
- all linked docs exist;
- no V1.2.2 requirement references `.cursor/` as mandatory.

## G2: CLI Binding and No-Model-Calculation

The plugin must call Fairy's CLI for calculation. It must not implement formulas
in prompts, scripts, examples, or generated helper code.

Required behavior:

- `fairy-calc` checks for a compatible `fairy` / `@randomplay/cli` before use;
- version mismatch fails loud with an install/upgrade instruction;
- `fairy-calc` invokes `fairy calc <snapshot> --view verbose --lang <lang>`;
- `fairy-snapshot` emits a reviewable draft and draft metadata only; after user
  review/confirm, `fairy-calc` validates/calculates through the same `fairy calc`
  path, because no dedicated `--preflight` flag exists in V1.2.2;
- `fairy-explain` consumes an existing `CalcResult` and does not calculate.

Forbidden behavior:

- prompting the model to compute damage, multiplier math, defense math, anomaly
  math, or crit lanes by itself;
- importing package internals or reading `packages/data/source/**` as a substitute
  for the published CLI/API;
- continuing with a plausible-looking answer after CLI failure;
- inventing a `fairy calc --preflight` command;
- advertising or invoking `fairy compare` through the AI plugin before a
  `fairy-compare` skill is explicitly scoped and shipped.

Acceptance checks:

- smoke test captures the actual CLI command used for `fairy-calc`;
- fixture intentionally breaks CLI availability/version and sees fail-loud copy;
- static scan catches forbidden command names and raw-source access references;
- model output after a CLI failure does not include computed totals.

## G3: Snapshot Generation and Validation

`fairy-snapshot` turns user language into a `BattleSnapshot` draft and validates
it before it can feed `fairy-calc`.

Required fixture coverage:

- at least one zh build prompt;
- at least one en build prompt;
- at least one mixed-language prompt, such as a Chinese sentence containing an
  English entity name;
- at least one ambiguity prompt requiring a user choice;
- at least one missing-critical-field prompt requiring a follow-up question;
- at least one optional/unknown-field prompt that surfaces a warning without
  silently guessing.

The ask-user policy must distinguish:

| Tier | Acceptance behavior |
|---|---|
| Critical | The skill asks the user; without a valid answer, it must not proceed to calc. |
| Optional | The skill may continue only with an explicit warning and documented assumption. |
| Unknown | Unknown values do not enter calc unless schema supports them and the warning is explicit. |

Acceptance checks:

- generated snapshots parse through Fairy validation;
- invalid snapshots fail loud before any result summary is produced;
- generated snapshot fields are inside the existing `BattleSnapshot` schema;
- default/unknown markers are kept in skill draft metadata or review copy unless
  the current schema explicitly supports the target field;
- the plugin does not create a parallel snapshot schema;
- entity normalization uses current `@randomplay/data` aliases or canonical IDs.

## G4: Calc Correctness

`fairy-calc` must preserve CLI calculation as the only numeric truth.

Required fixture coverage:

- 3-5 golden prompt fixtures across the main user journey;
- each fixture includes:
  - input prompt or snapshot;
  - generated snapshot JSON;
  - exact CLI command;
  - `CalcResult` JSON baseline;
  - allowed user-facing summary assertions.

Acceptance checks:

- prompt -> snapshot -> `fairy calc` JSON matches the baseline;
- language differences do not change numeric `CalcResult`;
- warnings from the CLI are not dropped from the user-facing summary;
- output includes enough source/runtime context for the user to understand which
  data version was used.

## G5: Explain Correctness

`fairy-explain` explains existing `CalcResult` JSON. It may include trace,
summary, warnings, source refs, and disclaimers, but every claim must be grounded
in actual input fields.

Required fixture coverage:

- at least one verbose `CalcResult` containing trace steps;
- at least one result containing warnings;
- at least one result containing source refs;
- one zh and one en user-facing explain smoke.

Acceptance checks:

- no explanation references a trace step absent from the input;
- no explanation invents multiplier values, source refs, modifiers, or formula
  steps;
- warning and disclaimer wording is preserved or accurately summarized;
- if the input lacks trace, the skill states that detail is unavailable instead
  of fabricating it;
- `trace` remains a trigger alias, but canonical skill name is `fairy-explain`.

## G6: Compare Workflow (Deferred)

V1.2.2 must explicitly mark compare out of scope.

Acceptance checks:

- no `fairy-compare` skill is shipped;
- docs state the AI plugin compare workflow requires a future Product-approved
  plugin patch even after CLI compare exists;
- metadata verifier fails if a compare skill appears without an explicit Product
  decision and CLI prerequisite.

G6 is not a release blocker for V1.2.2 if it is documented as deferred.

## G7: Version Sync

The plugin must declare and verify its compatible Fairy CLI range.

Acceptance checks:

- `plugin.json` includes `minFairyCliVersion`;
- skill docs state supported `@randomplay/cli` range;
- runtime preflight reports the discovered CLI version;
- too-old or missing CLI fails loud with exact install/upgrade commands;
- V1.2.2 docs do not claim support for unreleased CLI commands.

## G8: Privacy and Local-Data Boundary

V1.2.2 must be local-first and text-only. It must not add OCR, vision, remote
upload, or raw-source processing behavior.

Acceptance checks:

- docs state snapshots/build descriptions are processed in the local AI tool
  context unless the host AI tool itself sends prompts to its provider;
- no implementation reads `packages/data/source/**` or deleted retired raw source
  archives;
- no V1.2.2 flow requires screenshot upload, OCR, or external vision service;
- if future V1.2.3 vision/OCR is described, it must route through review/edit,
  snapshot validation, and calc validation before calculation;
- user-facing disclaimers do not imply official HoYoverse/miHoYo support.

## G9: Distribution Smoke

V1.2.2 ships repo-internal plugin files, not a standalone npm plugin package.

Required smoke:

- clean checkout can find the Claude plugin tree;
- Codex documentation/shim is present and references the same canonical skill
  names;
- metadata verifier passes;
- a scripted fixture can execute the three MVP skill workflows or their closest
  deterministic stand-ins:
  - discovery;
  - snapshot generation fixture;
  - CLI calc fixture;
  - explain fixture.

If the host plugin runtime cannot be fully automated, the implementation PR must
include a deterministic local verifier for plugin metadata and fixture outputs,
plus a manual smoke checklist for host-tool discovery.

## G10: Docs and Onboarding

The plan and implementation must include enough docs for a user to install and
run the MVP without reading source code.

Required docs:

- plugin overview;
- minimum Fairy CLI version;
- install/setup steps for Claude Code;
- Codex usage notes;
- three skill descriptions with canonical names and zh display labels;
- at least one complete zh user journey and one complete en user journey;
- ask-user examples for critical and optional fields;
- error recovery examples for missing CLI, version mismatch, invalid snapshot,
  and unsupported compare request;
- data-source/disclaimer copy in zh/en;
- V1.2.3 screenshot/vision forward-spec marked as future work.

Acceptance checks:

- docs examples reference existing commands only;
- zh/en user-facing copy is present where required;
- no docs ask users to recreate root `data/` or read raw source archives;
- links to architecture, user journeys, prompt templates, and Product decision
  log are valid.

## Implementation PR QA Checklist

The implementation PR is not QA-passable until the following evidence is present:

1. `git diff --check`
2. `pnpm check`
3. `pnpm build`
4. `pnpm test`
5. Plugin metadata verifier
6. Prompt/fixture verifier
7. CLI availability/version failure smoke
8. `fairy-snapshot` fixture smoke
9. `fairy-calc` fixture smoke
10. `fairy-explain` fixture smoke
11. zh/en user-facing output smoke
12. package/release gates already used by Fairy when release prep begins

The exact command names may be finalized by @TechLead in the plan PR, but each
gate above needs an executable command or a documented manual check before
implementation can ship.

## Release-Readiness Addendum

When V1.2.2 ships, release-readiness must verify:

- published package versions remain synchronized;
- CLI version satisfies plugin `minFairyCliVersion`;
- plugin docs in the tag match the released package versions;
- metadata and fixture verifiers pass on the release tag;
- fresh install of `@randomplay/cli` can run the plugin fixture commands;
- no deferred compare or screenshot behavior is advertised as shipped.
